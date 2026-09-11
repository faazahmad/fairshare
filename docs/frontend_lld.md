# Fairshare — Frontend Low-Level Design (LLD)

---

## 1. Complete Data Model (`domain/types.ts`)

### 1.1 Existing Types (unchanged)

```typescript
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
  amount: number       // integer minor units (paise/cents)
}

export interface Expense {
  id: ID
  groupId: ID
  description: string
  notes?: string
  category: string
  currency: string
  amount: number        // integer minor units
  occurredAt: string    // YYYY-MM-DD
  createdAt: string     // ISO 8601
  createdBy: ID
  payers: Allocation[]
  shares: Allocation[]
}

export interface Payment {
  id: ID
  groupId: ID
  currency: string
  amount: number        // integer minor units
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
```

### 1.2 Phase 2 Additions

```typescript
// Contact (MSISDN-based)
export interface Contact {
  id: ID
  userId: ID                // owner of the contact
  contactUserId?: ID        // resolved Fairshare user (null if not on platform)
  name: string
  msisdn: string            // E.164 phone number e.g. "+919876543210"
  addedAt: string           // ISO 8601
}

// Upcoming Bill
export interface UpcomingBill {
  id: ID
  groupId?: ID
  description: string
  currency: string
  amountMinor: number
  dueDate: string           // ISO date (YYYY-MM-DD)
  recurrence: 'once' | 'weekly' | 'monthly' | 'yearly'
  assignedUserIds: ID[]
  status: 'pending' | 'paid' | 'overdue'
  createdBy: ID
  createdAt: string
}

// Money Request (with expiration for defaulter tracking)
export interface MoneyRequest {
  id: ID
  groupId?: ID
  fromUserId: ID            // who is requesting money
  toUserId: ID              // who owes
  currency: string
  amountMinor: number
  description: string
  expiresAt: string         // ISO datetime — after this, request is auto-expired
  status: 'open' | 'settled' | 'expired' | 'cancelled'
  createdAt: string
}

// Onboarding Journey
export type OnboardingStep = 'welcome' | 'profile' | 'contacts' | 'first-group' | 'done'

// Auth types update
export interface AuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: 'email' | 'google' | 'apple' | 'github'
  isDemo: boolean
  phone?: string
  onboardingStep?: OnboardingStep
}
```

---

## 2. Financial Math Module (`domain/money.ts`)

### 2.1 Core Functions (existing — preserved exactly)

| Function | Signature | Behavior |
|----------|-----------|----------|
| `parseMoney` | `(value: string) → number \| null` | Parses `"1,234.56"` → `123456` (minor units). Rejects invalid, negative, non-integer results. |
| `formatMoney` | `(amount: number, currency?: string) → string` | Formats `123456` → `"₹1,234.56"` using `Intl.NumberFormat('en-IN')`. |
| `splitEqually` | `(total: number, userIds: ID[]) → Allocation[]` | Equal split with deterministic largest-remainder rounding. |
| `splitByShares` | `(total: number, shares: {userId, shares}[]) → Allocation[]` | Weighted split by share counts. |
| `splitByPercentages` | `(total: number, pcts: {userId, percentage}[]) → Allocation[]` | Weighted split by percentages (must sum to 100). |
| `validateExactSplit` | `(total: number, allocations: Allocation[]) → Allocation[]` | Validates exact amounts sum to total. Throws on mismatch. |
| `assertExpenseInvariant` | `(expense: Expense) → void` | Asserts `sum(payers) === amount && sum(shares) === amount`. |
| `calculateBalances` | `(memberIds, expenses, payments, currency) → Record<ID, number>` | Net balance per member within a group. |
| `simplifyDebts` | `(balances: Record<ID, number>) → Debt[]` | Greedy largest-debtor/creditor matching. Minimizes transaction count. |

### 2.2 Rounding Algorithm Detail

```
allocateByWeights(total=10000, users=[A, B, C], weights=[1, 1, 1])
  → exact shares: [3333.33, 3333.33, 3333.33]
  → floored:      [3333,    3333,    3333]    = 9999
  → remainder:    10000 - 9999 = 1
  → sort by fractional part desc: all equal → use original order
  → distribute 1 unit to first participant
  → result:       [3334,    3333,    3333]    = 10000 ✓
```

This is **identical** to the backend's `SplitCalculator.java` — both sides validate, but the client runs it first for instant UX.

---

## 3. State Hooks — Detailed Contracts

### 3.1 useLedger

```typescript
// Storage key: 'fairshare-ledger-v1'
// Initial state: localStorage → parse → LedgerState, fallback → seedState

interface UseLedgerReturn {
  state: LedgerState
  addExpense(expense: Expense): void
  updateExpense(expense: Expense): void
  deleteExpense(expenseId: string): void
  addPayment(payment: Payment): void
  updatePayment(payment: Payment): void
  deletePayment(paymentId: string): void
  addGroup(group: Group): void
  updateCurrentUser(profile: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'phone' | 'instagramHandle' | 'defaultCurrency' | 'language'>>): void
  resetDemo(): void
}
```

**Phase 2 change**: Each mutation will call the corresponding REST endpoint first, then update local state on success. Failed API calls will show an error toast without modifying local state.

### 3.2 usePreferences

```typescript
// Storage key: 'fairshare-preferences-v1'

interface UsePreferencesReturn {
  preferences: AppPreferences
  updatePreferences(updates: Partial<AppPreferences>): void
}
```

**Side effects on every update**:
1. `document.documentElement.dataset.theme = resolved theme ('light' | 'dark')`
2. `document.documentElement.dataset.accent = accent`
3. `document.documentElement.dataset.density = density`
4. `document.documentElement.dataset.hideBalances = hideBalances`
5. `document.documentElement.dataset.reduceMotion = reduceMotion`
6. Updates `<meta name="theme-color">` content
7. Listens to `matchMedia('(prefers-color-scheme: dark)')` when theme is `'system'`

**Phase 2**: Preferences remain client-local (no API sync needed).

### 3.3 useAccountPreferences

```typescript
// Storage key: 'fairshare-account-preferences-v1'

interface UseAccountPreferencesReturn {
  notifications: NotificationPreferences
  security: SecurityPreferences
  updateNotifications(updates: Partial<NotificationPreferences>): void
  updateSecurity(updates: Partial<SecurityPreferences>): void
}
```

**Phase 2**: May sync to backend for server-side notification delivery.

---

## 4. Page Specifications

### 4.1 HomePage

```
┌─────────────────────────────────────────────────┐
│ Topbar (search, notifications, avatar)          │
├─────────────────────────────────────────────────┤
│ Greeting: "Good {morning/afternoon/evening}, {Name}" │
├────────────┬────────────┬───────────────────────┤
│ Net owed   │ Monthly    │ Total shared          │
│ card       │ spend card │ expenses/payments     │
├────────────┴────────────┴───────────────────────┤
│ Your groups                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Group 1 │ │ Group 2 │ │ Group 3 │            │
│ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────┤
│ Friends summary (cross-group net balances)      │
├─────────────────────────────────────────────────┤
│ Recent expenses (last 4)                        │
└─────────────────────────────────────────────────┘
```

**Data sources**: `state.groups`, `state.expenses`, `state.payments`, `state.users`
**Computations**: `groupBalance()`, `calculateBalances()`, `formatMoney()`

### 4.2 GroupPage (Expenses view)

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar (search active for this page)                        │
├───────────────────────────────────┬─────────────────────────┤
│ Group header (emoji, name, kind)  │ Settle plan             │
│ [Settle up] [Add expense]         │ (simplified debts)      │
├────────┬────────┬─────────────────┤ [Smart] [Remind]        │
│ Your   │ Total  │ Your %          ├─────────────────────────┤
│ balance│ spend  │ share           │ Members list            │
├────────┴────────┴─────────────────┤ (with individual        │
│ Ledger feed (chronological)       │  balances)              │
│ ┌─ Today ──────────────────────┐  │                         │
│ │ ExpenseRow: Beach villa      │  │                         │
│ │ PaymentRow: UPI transfer     │  │                         │
│ └──────────────────────────────┘  │                         │
│ ┌─ Yesterday ──────────────────┐  │                         │
│ │ ExpenseRow: Seafood dinner   │  │                         │
│ └──────────────────────────────┘  │                         │
└───────────────────────────────────┴─────────────────────────┘
```

**Data sources**: Filtered `state.expenses` and `state.payments` by `groupId`
**Search**: Filters by expense `description` and payment `note`

### 4.3 ActivityPage

- Cross-group chronological feed of all expenses and payments
- Segmented filter: `All` | `Expenses` | `Payments`
- Text search filtering
- Quick link to notification preferences in settings

### 4.4 GroupsPage

- Grid gallery of all groups
- Each card shows: emoji, name, kind badge, member avatars, expense count, total spend, user balance
- "Create another group" card
- Educational tooltip about debt simplification

### 4.5 PayLendPage

- Feature preview/roadmap page (not functional)
- Cards: "Pay directly", "Speak an expense", "One-tap lend", "Scan and split"
- "Join early access" button

### 4.6 SettingsPage (4 tabs)

| Tab | Fields | Actions |
|-----|--------|---------|
| `profile` | Avatar upload (FileReader, max 1.5MB), name, email, phone, Instagram, currency (INR/USD/EUR/GBP), language (en/hi/es) | Save profile |
| `notifications` | Push toggle (browser permission), weekly digest, topic toggles, quiet hours window | Save prefs |
| `appearance` | Theme (light/dark/system), accent (coral/emerald/violet), density (comfortable/compact), privacy mode, reduce motion | Live preview |
| `security` | Password reset request, login alerts toggle, confirm sensitive actions toggle, active session info | Sign out |

### 4.7 Phase 2 New Pages

| Page | Purpose | Key Elements |
|------|---------|-------------|
| `ContactsPage` | Manage phone contacts | MSISDN input with E.164 validation, contact list, resolved user indicator |
| `UpcomingBillsPage` | Track due bills | Bill list with due date countdown, status badges (pending/overdue/paid), recurrence indicator |
| `MoneyRequestsPage` | Request money with expiry | Incoming/outgoing tabs, expiry countdown timer, status badges, settle/cancel actions |
| `OnboardingPage` | First-time user journey | Step wizard: welcome → profile setup → add contacts → create first group → done |

---

## 5. Modal Specifications

### 5.1 ExpenseModal

**Open conditions**: "Add expense" button or "Edit" from ExpenseDetailModal
**Props**: `open`, `expense` (null for create), `group`, `users`, `currentUserId`

**Form fields**:
- Description (required, text)
- Amount (formatted currency input, parsed via `parseMoney()`)
- Category (dropdown: Dining, Stay, Transport, Groceries, Rent, Entertainment, Sports, General)
- Date (date picker, defaults to today)
- Split mode toggle: Equal | Exact | Percent | Shares
- Participant checkboxes (toggle members in/out of split)
- Payer selector (who paid)
- Notes (optional textarea)

**Validation**: `assertExpenseInvariant(expense)` before save
**Save flow**: Calls `onSave(expense)` → parent calls `addExpense` or `updateExpense`

### 5.2 SettleModal

**Form fields**: From user, To user, Amount, Date, Note
**Pre-fill**: If opened from settle plan, pre-fills debtor/creditor/amount from `suggestedDebt`

### 5.3 CreateGroupModal

**Form fields**: Name, Emoji picker (8 options), Kind (trip/home/couple/other), Members (toggle from user list), Simplify debts toggle

---

## 6. Phase 2 — API Client Module (`lib/api.ts`)

### 6.1 Design Principles
- Thin `fetch` wrapper — no Axios or heavy HTTP library
- Reads JWT from `localStorage('fairshare-access-token')`
- Auto-refreshes expired access tokens using refresh token
- No hardcoded fallback data — API errors propagate to UI
- TypeScript generics for response typing

### 6.2 Module Structure

```typescript
// lib/api.ts

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body}`)
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL  // required env var

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let token = localStorage.getItem('fairshare-access-token')

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request(method, path, body)  // retry once
    }
    throw new ApiError(401, 'Session expired')
  }

  if (!res.ok) throw new ApiError(res.status, await res.text())
  if (res.status === 204) return undefined as T
  return res.json()
}

// Public API functions (typed)
export const api = {
  // Auth
  register: (data: RegisterReq) => request<AuthRes>('POST', '/auth/register', data),
  login: (data: LoginReq) => request<AuthRes>('POST', '/auth/login', data),
  refresh: (token: string) => request<AuthRes>('POST', '/auth/refresh', { refreshToken: token }),

  // Users
  getProfile: () => request<UserProfile>('GET', '/users/me'),
  updateProfile: (data: UpdateProfileReq) => request<UserProfile>('PUT', '/users/me'),

  // Groups
  listGroups: () => request<GroupRes[]>('GET', '/groups'),
  createGroup: (data: CreateGroupReq) => request<GroupRes>('POST', '/groups'),
  getGroupBalances: (id: string) => request<BalanceRes>('GET', `/groups/${id}/balances`),

  // Expenses
  listExpenses: (groupId: string) => request<ExpenseRes[]>('GET', `/groups/${groupId}/expenses`),
  createExpense: (groupId: string, data: CreateExpenseReq) =>
    request<ExpenseRes>('POST', `/groups/${groupId}/expenses`, data),
  updateExpense: (id: string, data: UpdateExpenseReq) =>
    request<ExpenseRes>('PUT', `/expenses/${id}`, data),
  deleteExpense: (id: string) => request<void>('DELETE', `/expenses/${id}`),

  // Payments
  recordPayment: (groupId: string, data: RecordPaymentReq) =>
    request<PaymentRes>('POST', `/groups/${groupId}/payments`, data),

  // Bills
  listBills: () => request<BillRes[]>('GET', '/bills'),
  createBill: (data: CreateBillReq) => request<BillRes>('POST', '/bills', data),

  // Money Requests
  listRequests: () => request<MoneyRequestRes[]>('GET', '/requests'),
  createRequest: (data: CreateRequestReq) => request<MoneyRequestRes>('POST', '/requests', data),
  settleRequest: (id: string) => request<void>('PUT', `/requests/${id}/settle`),

  // Contacts
  listContacts: () => request<ContactRes[]>('GET', '/users/me/contacts'),
  addContact: (data: AddContactReq) => request<ContactRes>('POST', '/users/me/contacts', data),

  // Activity
  getGroupActivity: (groupId: string) => request<ActivityRes[]>('GET', `/groups/${groupId}/activity`),
  getAllActivity: () => request<ActivityRes[]>('GET', '/activity'),
}
```

---

## 7. Phase 2 — WebSocket Client (`lib/ws.ts`)

```typescript
// STOMP over SockJS for real-time group updates

import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

const WS_URL = import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '/ws')

export function connectWebSocket(
  token: string,
  groupIds: string[],
  onMessage: (groupId: string, event: ActivityEvent) => void
): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => {
      groupIds.forEach(id => {
        client.subscribe(`/topic/group/${id}`, (msg) => {
          onMessage(id, JSON.parse(msg.body))
        })
      })
    },
  })
  client.activate()
  return client
}
```

---

## 8. Phase 2 — Auth Flow Change Detail

### Current: Supabase

```
LoginPage → supabase.auth.signInWithPassword() → Supabase session → AuthProvider.setUser()
LoginPage → supabase.auth.signInWithOAuth('google') → Supabase redirect → callback → AuthProvider.setUser()
```

### Target: Spring Boot JWT

```
LoginPage → fetch POST /api/v1/auth/login → { accessToken, refreshToken, user }
  → localStorage.set('fairshare-access-token', accessToken)
  → localStorage.set('fairshare-refresh-token', refreshToken)
  → AuthProvider.setUser(user)

LoginPage → window.location = /api/v1/auth/oauth/google → Google consent → Spring callback
  → Spring redirects to {FRONTEND_URL}/auth/callback?access_token=...&refresh_token=...
  → Frontend parses URL params, stores tokens, loads profile via GET /users/me
```

### Token Refresh

```
Any API call returns 401
  → api.ts reads refresh token from localStorage
  → POST /api/v1/auth/refresh { refreshToken }
  → Receives new { accessToken, refreshToken }
  → Stores new tokens, retries original request
  → If refresh also fails → clear tokens, redirect to login
```

---

## 9. Environment Variables

### Current `.env.example`
```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:4173/
```

### Phase 2 `.env.example`
```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 10. CSS Architecture (unchanged)

- **File**: `src/styles.css` (88,673 bytes, ~1,113 lines)
- **Approach**: Hand-written CSS with CSS custom properties
- **Theming**: `html[data-theme="dark"]`, `html[data-accent="coral|emerald|violet"]`
- **Layout**: CSS Grid 3-column (sidebar, main, details)
- **Responsive**: Mobile nav at `< 768px`
- **Accessibility**: Focus rings, `.sr-only`, `prefers-reduced-motion`
- **Privacy**: `html[data-hide-balances="true"]` blurs monetary amounts

No changes planned for Phase 1 or Phase 2. New pages will use existing CSS classes and patterns.

---

## 11. Test Coverage

### Existing Tests (preserved)
- `domain/money.test.ts` — split rounding, invariant validation
- `lib/dates.test.ts` — calendar heading formatting
- `lib/smartInsights.test.ts` — insight generation

### Phase 2 Test Additions
- `lib/api.test.ts` — API client error handling, token refresh
- `pages/OnboardingPage.test.tsx` — step progression
- Integration tests via Swagger against running backend
