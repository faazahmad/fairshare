import type { ChatConversation, ChatMessage, Contact, Expense, Group, MoneyRequest, NotificationChannel, Payment, PaymentReminder, UpcomingBill, User } from '../domain/types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

export const ACCESS_TOKEN_KEY = 'fairshare-access-token'
export const REFRESH_TOKEN_KEY = 'fairshare-refresh-token'

export class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }

  // Handle 401 and refresh token rotation
  if (response.status === 401 && !path.includes('/auth/')) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      const refreshed = await attemptRefreshToken(refreshToken)
      if (refreshed) {
        // Retry original request with new access token
        const newToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          response = await fetch(url, { ...options, headers })
        }
      }
    }
  }

  if (response.status === 204) {
    return null as T
  }

  let body: ApiResponse<T>
  try {
    body = await response.json()
  } catch {
    throw new ApiError(response.status, `HTTP error ${response.status}`)
  }

  if (!response.ok || !body.success) {
    throw new ApiError(response.status, body.message || `Request failed with status ${response.status}`)
  }

  return body.data
}

async function requestBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { headers })
  if (!response.ok) throw new ApiError(response.status, `File could not be loaded (${response.status}).`)
  return response.blob()
}

async function attemptRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (res.ok) {
      const body: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json()
      if (body.success && body.data) {
        localStorage.setItem(ACCESS_TOKEN_KEY, body.data.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, body.data.refreshToken)
        return true
      }
    }
  } catch {
    // refresh failed
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  return false
}

export const api = {
  auth: {
    providers: () => request<{ phone: boolean; google: boolean; apple: boolean }>('/auth/providers'),

    sendOtp: (phone: string, purpose: 'SIGN_IN' | 'SIGN_UP') =>
      request<{ phone: string; expiresInSeconds: number; devCode?: string | null }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, purpose }),
      }),

    verifyOtp: (phone: string, code: string, purpose: 'SIGN_IN' | 'SIGN_UP') =>
      request<{
        verified: boolean
        registrationRequired: boolean
        phone: string
        verificationToken?: string | null
        auth?: { accessToken: string; refreshToken: string; user: User } | null
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, purpose }),
      }),

    register: (payload: {
      firstName: string
      lastName: string
      email: string
      dateOfBirth: string
      password: string
      phone: string
      phoneVerificationToken: string
      defaultCurrency?: string
    }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    logout: (refreshToken: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

  },

  users: {
    getProfile: () => request<User>('/users/me'),
    updateProfile: (profile: Partial<User>) =>
      request<User>('/users/me', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
    updateOnboarding: (step: string) =>
      request<User>('/users/me/onboarding', {
        method: 'PUT',
        body: JSON.stringify({ step }),
      }),
    completeOnboarding: (profile: {
      firstName: string
      lastName: string
      email: string
      dateOfBirth: string
      phone?: string
      acceptedTerms: boolean
    }) => request<User>('/users/me/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
    resendEmailVerification: () => request<void>('/users/me/email/verification', { method: 'POST' }),
  },

  contacts: {
    list: () => request<Contact[]>('/users/me/contacts'),
    add: (contact: { name: string; msisdn: string }) =>
      request<Contact>('/users/me/contacts', {
        method: 'POST',
        body: JSON.stringify(contact),
      }),
    delete: (id: string) =>
      request<void>(`/users/me/contacts/${id}`, {
        method: 'DELETE',
      }),
    update: (id: string, updates: { name?: string; favorite?: boolean }) =>
      request<Contact>(`/users/me/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
  },

  chats: {
    conversations: () => request<ChatConversation[]>('/chats'),
    list: (otherUserId: string) => request<ChatMessage[]>(`/chats/${otherUserId}/messages`),
    send: (otherUserId: string, message: { content?: string; messageType?: ChatMessage['messageType']; stickerCode?: string }) =>
      request<ChatMessage>(`/chats/${otherUserId}/messages`, { method: 'POST', body: JSON.stringify(message) }),
    markRead: (otherUserId: string) => request<void>(`/chats/${otherUserId}/read`, { method: 'PUT' }),
    sendVoice: async (otherUserId: string, audio: Blob, durationMs: number) => {
      const body = new FormData()
      body.append('audio', audio, `voice-${Date.now()}.webm`)
      body.append('durationMs', String(durationMs))
      return request<ChatMessage>(`/chats/${otherUserId}/voice`, { method: 'POST', body, headers: {} })
    },
    voice: (messageId: string) => requestBlob(`/chats/messages/${messageId}/voice`),
  },

  groups: {
    list: () => request<Group[]>('/groups'),
    create: (group: { name: string; kind?: string; emoji?: string; simplifyDebts?: boolean; memberIds?: string[] }) =>
      request<Group>('/groups', {
        method: 'POST',
        body: JSON.stringify(group),
      }),
    get: (id: string) => request<Group>(`/groups/${id}`),
    getMembers: (groupId: string) => request<User[]>(`/groups/${groupId}/members`),
    addMember: (groupId: string, member: { userId?: string; msisdn?: string }) =>
      request<Group>(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(member),
      }),
    removeMember: (groupId: string, userId: string) =>
      request<void>(`/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      }),
    getBalances: (groupId: string, currency?: string) =>
      request<{
        groupId: string
        currency: string
        rawBalances: Record<string, number>
        simplifiedDebts: Array<{ fromUserId: string; toUserId: string; amountMinor: number }>
      }>(`/groups/${groupId}/balances${currency ? `?currency=${currency}` : ''}`),
  },

  expenses: {
    listGroup: (groupId: string) => request<Expense[]>(`/groups/${groupId}/expenses`),
    listAllUser: () => request<Expense[]>('/users/me/expenses'),
    create: (groupId: string, expense: Partial<Expense> & { idempotencyKey?: string }) =>
      request<Expense>(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expense),
      }),
    update: (id: string, expense: Partial<Expense>) =>
      request<Expense>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(expense),
      }),
    delete: (id: string) =>
      request<void>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
  },

  payments: {
    listGroup: (groupId: string) => request<Payment[]>(`/groups/${groupId}/payments`),
    record: (groupId: string, payment: Partial<Payment>) =>
      request<Payment>(`/groups/${groupId}/payments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      }),
    delete: (id: string) =>
      request<void>(`/payments/${id}`, {
        method: 'DELETE',
      }),
  },

  bills: {
    list: () => request<UpcomingBill[]>('/bills'),
    create: (bill: Partial<UpcomingBill>) =>
      request<UpcomingBill>('/bills', {
        method: 'POST',
        body: JSON.stringify(bill),
      }),
    markPaid: (id: string) =>
      request<UpcomingBill>(`/bills/${id}/pay`, {
        method: 'PUT',
      }),
    delete: (id: string) =>
      request<void>(`/bills/${id}`, {
        method: 'DELETE',
      }),
  },

  requests: {
    list: () => request<MoneyRequest[]>('/requests'),
    create: (req: Partial<MoneyRequest>) =>
      request<MoneyRequest>('/requests', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    settle: (id: string) =>
      request<MoneyRequest>(`/requests/${id}/settle`, {
        method: 'PUT',
      }),
    submitProof: (id: string, transactionId: string, proof: File) => {
      const body = new FormData()
      body.append('transactionId', transactionId)
      body.append('proof', proof, proof.name)
      return request<MoneyRequest>(`/requests/${id}/settlement-proof`, { method: 'POST', body, headers: {} })
    },
    proof: (id: string) => requestBlob(`/requests/${id}/settlement-proof`),
    verify: (id: string) => request<MoneyRequest>(`/requests/${id}/verify-settlement`, { method: 'PUT' }),
    cancel: (id: string) =>
      request<MoneyRequest>(`/requests/${id}/cancel`, {
        method: 'PUT',
      }),
  },

  reminders: {
    list: (sourceType?: string, sourceId?: string) => {
      const params = new URLSearchParams()
      if (sourceType) params.set('sourceType', sourceType)
      if (sourceId) params.set('sourceId', sourceId)
      return request<PaymentReminder[]>(`/reminders${params.size ? `?${params}` : ''}`)
    },
    create: (reminder: {
      sourceType: 'expense' | 'request'
      sourceId: string
      expenseDescription: string
      currency: string
      amountMinor: number
      payerUserId?: string
      payerName?: string
      payerMsisdn?: string
      payerInstagramId?: string
      channels?: NotificationChannel[]
      intervalDays: 7 | 10 | 15 | 30
    }) => request<PaymentReminder>('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
    settle: (id: string) => request<PaymentReminder>(`/reminders/${id}/settle`, { method: 'PUT' }),
    pause: (id: string) => request<PaymentReminder>(`/reminders/${id}/pause`, { method: 'PUT' }),
    sendNow: (id: string) => request<PaymentReminder>(`/reminders/${id}/send-now`, { method: 'POST' }),
  },

  admin: {
    getStats: () => request<any>('/admin/stats'),
    recordRum: (metric: { eventName: string; path?: string; durationMs?: number; metadata?: Record<string, any> }) =>
      request<void>('/admin/rum', {
        method: 'POST',
        body: JSON.stringify(metric),
      }),
  },
}
