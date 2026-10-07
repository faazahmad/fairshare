export type ID = string

export interface User {
  id: ID
  name: string
  email: string
  initials: string
  color: string
  avatarUrl?: string
  phone?: string
  instagramHandle?: string
  defaultCurrency?: string
  language?: string
  onboardingStep?: string
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
  addedAt: string
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
  toUserId: ID
  currency: string
  amountMinor: number
  description: string
  expiresAt: string
  status: 'open' | 'settled' | 'expired' | 'cancelled'
  createdAt: string
}

export type OnboardingStep = 'welcome' | 'profile' | 'contacts' | 'first-group' | 'done'
