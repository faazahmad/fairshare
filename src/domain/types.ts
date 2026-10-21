export type ID = string

export interface User {
  id: ID
  name: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  email: string
  initials: string
  color: string
  avatarUrl?: string
  phone?: string
  instagramHandle?: string
  upiId?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  paymentQrData?: string
  defaultCurrency?: string
  language?: string
  onboardingStep?: string
  phoneVerified?: boolean
  emailVerified?: boolean
  termsAccepted?: boolean
  profileReviewed?: boolean
}

export type GroupKind = 'trip' | 'home' | 'couple' | 'other'

export interface Group {
  id: ID
  name: string
  kind: GroupKind
  emoji: string
  memberIds: ID[]
  simplifyDebts: boolean
}

export interface Allocation {
  userId: ID
  amount: number
}

export interface Expense {
  id: ID
  groupId: ID
  description: string
  notes?: string
  category: string
  currency: string
  amount: number
  occurredAt: string
  createdAt: string
  createdBy: ID
  payers: Allocation[]
  shares: Allocation[]
  reminderScheduleDays?: 7 | 10 | 15 | 30
  reminderPayerIds?: ID[]
  reminderChannels?: NotificationChannel[]
}

export interface Payment {
  id: ID
  groupId: ID
  currency: string
  amount: number
  fromUserId: ID
  toUserId: ID
  occurredAt: string
  createdAt: string
  note?: string
}

export interface LedgerState {
  currentUserId: ID
  users: User[]
  groups: Group[]
  expenses: Expense[]
  payments: Payment[]
}

export interface Debt {
  fromUserId: ID
  toUserId: ID
  amount: number
}

export type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares'
export type NotificationChannel = 'whatsapp' | 'instagram'

export type ThemePreference = 'light' | 'dark' | 'system'
export type AccentPreference = 'coral' | 'emerald' | 'violet'
export type DensityPreference = 'comfortable' | 'compact'

export interface AppPreferences {
  theme: ThemePreference
  accent: AccentPreference
  density: DensityPreference
  hideBalances: boolean
  reduceMotion: boolean
}

export interface NotificationPreferences {
  pushEnabled: boolean
  expenseUpdates: boolean
  settlementReminders: boolean
  groupInvites: boolean
  weeklyDigest: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export interface SecurityPreferences {
  loginAlerts: boolean
  confirmSensitiveActions: boolean
}

export interface Contact {
  id: ID
  userId?: ID
  ownerId?: ID
  contactUserId?: ID
  name: string
  msisdn: string
  isRegisteredUser?: boolean
  favorite?: boolean
  addedAt: string
  updatedAt?: string
}

export interface UpcomingBill {
  id: ID
  groupId?: ID
  description: string
  currency: string
  amountMinor: number
  dueDate: string
  recurrence: 'once' | 'weekly' | 'monthly' | 'yearly'
  status: 'pending' | 'paid' | 'overdue'
  assignedUserIds: ID[]
  createdBy?: ID
  createdAt?: string
}

export interface MoneyRequest {
  id: ID
  groupId?: ID
  fromUserId: ID
  toUserId?: ID
  contactId?: ID
  payerName?: string
  payerMsisdn?: string
  expenseId?: ID
  reminderIntervalDays?: 7 | 10 | 15 | 30
  reminderChannels?: NotificationChannel[]
  payerInstagramId?: string
  paymentMode?: 'UPI' | 'BANK' | 'QR'
  paymentInstructions?: string
  paymentQrData?: string
  currency: string
  amountMinor: number
  description: string
  expiresAt: string
  status: 'open' | 'proof_submitted' | 'settled' | 'expired' | 'cancelled'
  settlementTransactionId?: string
  hasSettlementProof?: boolean
  settlementSubmittedAt?: string
  settlementVerifiedAt?: string
  createdAt: string
}

export interface ChatMessage {
  id: ID
  senderId: ID
  recipientId: ID
  content: string
  messageType: 'TEXT' | 'EMOJI' | 'STICKER' | 'VOICE'
  stickerCode?: string
  voiceDurationMs?: number
  hasVoice?: boolean
  createdAt: string
  readAt?: string
}

export interface ChatConversation {
  otherUserId: ID
  otherUserName: string
  otherUserAvatarUrl?: string
  otherUserInitials?: string
  latestMessage: ChatMessage
  unreadCount: number
}

export interface PaymentReminder {
  id: ID
  sourceType: 'expense' | 'request'
  sourceId: ID
  expenseDescription: string
  currency: string
  amountMinor: number
  payerUserId?: ID
  payerName: string
  payerMsisdn: string
  payerInstagramId?: string
  paymentMode?: 'UPI' | 'BANK' | 'QR'
  paymentInstructions?: string
  channels?: NotificationChannel[]
  intervalDays: 7 | 10 | 15 | 30
  status: 'active' | 'paused' | 'settled'
  nextSendAt: string
  lastSentAt?: string
  lastDeliveryStatus?: string
  createdAt: string
  updatedAt: string
}

export type OnboardingStep = 'welcome' | 'profile' | 'contacts' | 'first-group' | 'done'
