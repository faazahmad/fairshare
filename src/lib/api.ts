import type { Contact, Expense, Group, MoneyRequest, Payment, UpcomingBill, User } from '../domain/types'

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
    'Content-Type': 'application/json',
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
    register: (payload: { name: string; email: string; password: string; phone?: string; defaultCurrency?: string }) =>
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

    sendOtp: (phone: string) =>
      request<{ phone: string; message: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    verifyOtp: (phone: string, code: string) =>
      request<{ phone: string; verified: boolean }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
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
  },

  groups: {
    list: () => request<Group[]>('/groups'),
    create: (group: { name: string; kind?: string; emoji?: string; simplifyDebts?: boolean; memberIds?: string[] }) =>
      request<Group>('/groups', {
        method: 'POST',
        body: JSON.stringify(group),
      }),
    get: (id: string) => request<Group>(`/groups/${id}`),
    addMember: (groupId: string, member: { userId?: string; msisdn?: string }) =>
      request<Group>(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(member),
      }),
    getBalances: (groupId: string, currency?: string) =>
      request<{
        groupId: string
        currency: string
        rawBalances: Record<string, number>
        simplifiedDebts: Array<{ fromUserId: string; toUserId: string; amountMinor: number }>
      }>(`/groups/${groupId}/balances${currency ? `?currency=${currency}` : ''}`),
    getMembers: (groupId: string) => request<User[]>(`/groups/${groupId}/members`),
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
    cancel: (id: string) =>
      request<MoneyRequest>(`/requests/${id}/cancel`, {
        method: 'PUT',
      }),
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
