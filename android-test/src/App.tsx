import { useEffect, useMemo, useRef, useState } from 'react'
import type { Expense, Group } from './domain/types'
import type { Debt, Payment } from './domain/types'
import { useLedger } from './store/useLedger'
import { usePreferences } from './store/usePreferences'
import { useAccountPreferences } from './store/useAccountPreferences'
import { findUser } from './lib/ledger'
import { AppNavigation, type AppView } from './components/AppNavigation'
import { AppTopbar } from './components/AppTopbar'
import { MobileNavigation } from './components/MobileNavigation'
import { ExpenseModal } from './components/ExpenseModal'
import { SettleModal } from './components/SettleModal'
import { CreateGroupModal } from './components/CreateGroupModal'
import { ExpenseDetailModal } from './components/ExpenseDetailModal'
import { PaymentDetailModal } from './components/PaymentDetailModal'
import { ReminderModal } from './components/ReminderModal'
import { PaymentShareModal } from './components/PaymentShareModal'
import { SmartAssistantModal } from './components/SmartAssistantModal'
import { HomePage } from './pages/HomePage'
import { GroupPage } from './pages/GroupPage'
import { ActivityPage } from './pages/ActivityPage'
import { GroupsPage } from './pages/GroupsPage'
import { SettingsPage, type SettingsSection } from './pages/SettingsPage'
import { PayLendPage } from './pages/PayLendPage'
import { useAuth } from './auth/AuthProvider'
import { localeForLanguage, resolveLanguage } from './lib/i18n'

const LAST_SYNCED_AUTH_KEY = 'fairshare-last-synced-auth-id'
const RECENT_GROUPS_KEY = 'fairshare-recent-groups-v1'

export default function App() {
  const {
    state,
    addExpense,
    updateExpense,
    deleteExpense,
    addPayment,
    updatePayment,
    deletePayment,
    addGroup,
    updateGroup,
    deleteGroup,
    updateCurrentUser,
  } = useLedger()
  const { preferences, updatePreferences } = usePreferences()
  const { notifications, security, updateNotifications, updateSecurity } = useAccountPreferences()
  const { user: authUser, signOut, sendPasswordReset } = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [selectedGroupId, setSelectedGroupId] = useState(state.groups[0]?.id ?? '')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [settleOpen, setSettleOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [suggestedDebt, setSuggestedDebt] = useState<Debt | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [reminderDebt, setReminderDebt] = useState<Debt | null>(null)
  const [sharingPayment, setSharingPayment] = useState<Payment | null>(null)
  const [smartOpen, setSmartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsUnread, setNotificationsUnread] = useState(true)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile')
  const [recentGroupIds, setRecentGroupIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_GROUPS_KEY) ?? '[]') as string[]
      return [...saved.filter((id) => state.groups.some((group) => group.id === id)), ...state.groups.map((group) => group.id).filter((id) => !saved.includes(id))].slice(0, 12)
    } catch {
      return state.groups.map((group) => group.id).slice(0, 12)
    }
  })
  const syncedAuthId = useRef<string | null>(localStorage.getItem(LAST_SYNCED_AUTH_KEY))

  const currentUser = findUser(state.users, state.currentUserId)
  const group = state.groups.find((entry) => entry.id === selectedGroupId) ?? state.groups[0]
  const language = resolveLanguage(currentUser.language)
  const currency = currentUser.defaultCurrency ?? 'INR'
  const lockedMemberIds = editingGroup ? Array.from(new Set([
    ...state.expenses.filter((entry) => entry.groupId === editingGroup.id).flatMap((entry) => [...entry.payers.map((payer) => payer.userId), ...entry.shares.map((share) => share.userId)]),
    ...state.payments.filter((entry) => entry.groupId === editingGroup.id).flatMap((entry) => [entry.fromUserId, entry.toUserId]),
  ])) : []

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = 'ltr'
    document.documentElement.dataset.locale = localeForLanguage(language)
  }, [language])

  useEffect(() => {
    setRecentGroupIds((current) => {
      const valid = current.filter((id) => state.groups.some((group) => group.id === id))
      const next = [...valid, ...state.groups.map((group) => group.id).filter((id) => !valid.includes(id))].slice(0, 12)
      return next.join('|') === current.join('|') ? current : next
    })
  }, [state.groups])

  useEffect(() => {
    localStorage.setItem(RECENT_GROUPS_KEY, JSON.stringify(recentGroupIds))
  }, [recentGroupIds])

  useEffect(() => {
    if (authUser && syncedAuthId.current !== authUser.id) {
      syncedAuthId.current = authUser.id
      localStorage.setItem(LAST_SYNCED_AUTH_KEY, authUser.id)
      updateCurrentUser({ name: authUser.name, email: authUser.email })
    }
  }, [authUser])

  function navigate(view: AppView) {
    setCurrentView(view)
    setNotificationsOpen(false)
    if (view !== 'expenses' && view !== 'activity') setQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openGroup(groupId: string) {
    setRecentGroupIds((current) => [groupId, ...current.filter((id) => id !== groupId)].slice(0, 12))
    setSelectedGroupId(groupId)
    navigate('expenses')
  }

  function openSettings(section: SettingsSection = 'profile') {
    setSettingsSection(section)
    navigate('settings')
  }

  function openCreateGroup() {
    setEditingGroup(null)
    setCreateGroupOpen(true)
  }

  function openManageGroup(groupId: string) {
    const selected = state.groups.find((entry) => entry.id === groupId)
    if (!selected) return
    setEditingGroup(selected)
    setCreateGroupOpen(true)
  }

  function saveGroup(newGroup: Group) {
    if (state.groups.some((entry) => entry.id === newGroup.id)) updateGroup(newGroup)
    else addGroup(newGroup)
    setEditingGroup(null)
    setSelectedGroupId(newGroup.id)
    setRecentGroupIds((current) => [newGroup.id, ...current.filter((id) => id !== newGroup.id)].slice(0, 12))
    setCurrentView('expenses')
  }

  function removeGroup(groupId: string) {
    const remaining = state.groups.filter((entry) => entry.id !== groupId)
    deleteGroup(groupId)
    setEditingGroup(null)
    setRecentGroupIds((current) => current.filter((id) => id !== groupId))
    setSelectedGroupId(remaining[0]?.id ?? '')
    setCurrentView(remaining.length > 0 ? 'groups' : 'home')
  }

  function openAddExpense() {
    setEditingExpense(null)
    setExpenseOpen(true)
  }

  function editExpense(expense: Expense) {
    setSelectedExpense(null)
    setEditingExpense(expense)
    setExpenseOpen(true)
  }

  function saveExpense(expense: Expense) {
    if (state.expenses.some((entry) => entry.id === expense.id)) updateExpense(expense)
    else addExpense(expense)
    setEditingExpense(null)
  }

  function openSettle(debt: Debt | null = null) {
    setEditingPayment(null)
    setSuggestedDebt(debt)
    setSettleOpen(true)
  }

  function editPayment(payment: Payment) {
    setSelectedPayment(null)
    setSuggestedDebt(null)
    setEditingPayment(payment)
    setSettleOpen(true)
  }

  function savePayment(payment: Payment) {
    if (state.payments.some((entry) => entry.id === payment.id)) updatePayment(payment)
    else addPayment(payment)
    setEditingPayment(null)
    setSuggestedDebt(null)
  }

  function openReminder(debt: Debt) {
    setSmartOpen(false)
    setReminderDebt(debt)
  }

  const topbar = useMemo(() => (
    <AppTopbar
      state={state}
      currentUser={currentUser}
      currentView={currentView}
      query={query}
      notificationsOpen={notificationsOpen}
      notificationsUnread={notificationsUnread}
      notificationPreferences={notifications}
      onQueryChange={setQuery}
      onToggleNotifications={() => setNotificationsOpen((open) => !open)}
      onMarkNotificationsRead={() => setNotificationsUnread(false)}
      onOpenSettings={openSettings}
    />
  ), [state, currentUser, currentView, query, notificationsOpen, notificationsUnread, notifications])

  if (!group) {
    return <><main className="empty-state"><button className="button button--primary" onClick={openCreateGroup}>Create your first group</button></main><CreateGroupModal open={createGroupOpen} users={state.users} currentUserId={state.currentUserId} onClose={() => setCreateGroupOpen(false)} onSave={saveGroup} /></>
  }

  return (
    <div className={`app-shell ${currentView === 'expenses' ? '' : 'app-shell--wide'}`}>
      <AppNavigation state={state} currentView={currentView} selectedGroupId={group.id} recentGroupIds={recentGroupIds} onNavigate={navigate} onSelectGroup={openGroup} onCreateGroup={openCreateGroup} />

      {currentView === 'home' && <HomePage state={state} onOpenGroup={openGroup} onAddExpense={openAddExpense} onCreateGroup={openCreateGroup} topbar={topbar} />}
      {currentView === 'expenses' && <GroupPage state={state} group={group} query={query} onAddExpense={openAddExpense} onSettle={() => openSettle()} onManageGroup={() => openManageGroup(group.id)} onOpenExpense={setSelectedExpense} onOpenPayment={setSelectedPayment} onRemind={openReminder} onOpenSmart={() => setSmartOpen(true)} topbar={topbar} />}
      {currentView === 'activity' && <ActivityPage state={state} query={query} onOpenExpense={setSelectedExpense} onOpenPayment={setSelectedPayment} onOpenNotificationSettings={() => openSettings('notifications')} topbar={topbar} />}
      {currentView === 'groups' && <GroupsPage state={state} onCreateGroup={openCreateGroup} onOpenGroup={openGroup} onManageGroup={openManageGroup} topbar={topbar} />}
      {currentView === 'pay' && <PayLendPage state={state} topbar={topbar} />}
      {currentView === 'settings' && <SettingsPage user={currentUser} activeSection={settingsSection} preferences={preferences} notifications={notifications} security={security} authProvider={authUser?.provider ?? 'email'} onSectionChange={setSettingsSection} onSaveProfile={updateCurrentUser} onUpdatePreferences={updatePreferences} onUpdateNotifications={updateNotifications} onUpdateSecurity={updateSecurity} onResetPassword={async () => (await sendPasswordReset(currentUser.email)).message ?? 'Password reset instructions sent.'} onSignOut={() => void signOut()} topbar={topbar} />}

      <MobileNavigation currentView={currentView} language={language} onNavigate={navigate} />

      <ExpenseModal open={expenseOpen} expense={editingExpense} group={group} users={state.users} currentUserId={state.currentUserId} currency={currency} onClose={() => { setExpenseOpen(false); setEditingExpense(null) }} onSave={saveExpense} />
      <SettleModal open={settleOpen} payment={editingPayment} suggestedDebt={suggestedDebt} group={group} users={state.users} currentUserId={state.currentUserId} currency={currency} onClose={() => { setSettleOpen(false); setEditingPayment(null); setSuggestedDebt(null) }} onSave={savePayment} />
      <CreateGroupModal open={createGroupOpen} group={editingGroup} users={state.users} currentUserId={state.currentUserId} lockedMemberIds={lockedMemberIds} onClose={() => { setCreateGroupOpen(false); setEditingGroup(null) }} onSave={saveGroup} onDelete={removeGroup} />
      <ExpenseDetailModal expense={selectedExpense} group={selectedExpense ? state.groups.find((entry) => entry.id === selectedExpense.groupId) : undefined} users={state.users} onClose={() => setSelectedExpense(null)} onEdit={editExpense} onDelete={deleteExpense} requireDeleteConfirmation={security.confirmSensitiveActions} />
      <PaymentDetailModal payment={selectedPayment} group={selectedPayment ? state.groups.find((entry) => entry.id === selectedPayment.groupId) : undefined} users={state.users} onClose={() => setSelectedPayment(null)} onEdit={editPayment} onShare={(payment) => { setSelectedPayment(null); setSharingPayment(payment) }} onDelete={deletePayment} requireDeleteConfirmation={security.confirmSensitiveActions} />
      <ReminderModal debt={reminderDebt} group={reminderDebt ? group : undefined} currentUser={currentUser} targetUser={reminderDebt ? state.users.find((user) => user.id === reminderDebt.fromUserId) : undefined} onClose={() => setReminderDebt(null)} />
      <PaymentShareModal payment={sharingPayment} group={sharingPayment ? state.groups.find((entry) => entry.id === sharingPayment.groupId) : undefined} currentUser={currentUser} targetUser={sharingPayment ? state.users.find((user) => user.id === (sharingPayment.fromUserId === state.currentUserId ? sharingPayment.toUserId : sharingPayment.fromUserId)) : undefined} onClose={() => setSharingPayment(null)} />
      <SmartAssistantModal open={smartOpen} state={state} group={group} onClose={() => setSmartOpen(false)} onRemind={openReminder} onSettle={(debt) => { setSmartOpen(false); openSettle(debt) }} />
    </div>
  )
}
