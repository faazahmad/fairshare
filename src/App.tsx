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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [reminderDebt, setReminderDebt] = useState<Debt | null>(null)
  const [smartOpen, setSmartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsUnread, setNotificationsUnread] = useState(true)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile')
  const syncedAuthId = useRef<string | null>(localStorage.getItem(LAST_SYNCED_AUTH_KEY))

  const currentUser = findUser(state.users, state.currentUserId)
  const group = state.groups.find((entry) => entry.id === selectedGroupId) ?? state.groups[0]
  const language = resolveLanguage(currentUser.language)
  const currency = currentUser.defaultCurrency ?? 'INR'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = 'ltr'
    document.documentElement.dataset.locale = localeForLanguage(language)
  }, [language])

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
    setSelectedGroupId(groupId)
    navigate('expenses')
  }

  function openSettings(section: SettingsSection = 'profile') {
    setSettingsSection(section)
    navigate('settings')
  }

  function saveGroup(newGroup: Group) {
    addGroup(newGroup)
    setSelectedGroupId(newGroup.id)
    setCurrentView('expenses')
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
    return <main className="empty-state"><button className="button button--primary" onClick={() => setCreateGroupOpen(true)}>Create your first group</button></main>
  }

  return (
    <div className={`app-shell ${currentView === 'expenses' ? '' : 'app-shell--wide'}`}>
      <AppNavigation state={state} currentView={currentView} selectedGroupId={group.id} onNavigate={navigate} onSelectGroup={openGroup} onCreateGroup={() => setCreateGroupOpen(true)} />

      {currentView === 'home' && <HomePage state={state} onOpenGroup={openGroup} onAddExpense={openAddExpense} onCreateGroup={() => setCreateGroupOpen(true)} topbar={topbar} />}
      {currentView === 'expenses' && <GroupPage state={state} group={group} query={query} onAddExpense={openAddExpense} onSettle={() => openSettle()} onOpenExpense={setSelectedExpense} onOpenPayment={setSelectedPayment} onRemind={openReminder} onOpenSmart={() => setSmartOpen(true)} topbar={topbar} />}
      {currentView === 'activity' && <ActivityPage state={state} query={query} onOpenExpense={setSelectedExpense} onOpenPayment={setSelectedPayment} onOpenNotificationSettings={() => openSettings('notifications')} topbar={topbar} />}
      {currentView === 'groups' && <GroupsPage state={state} onCreateGroup={() => setCreateGroupOpen(true)} onOpenGroup={openGroup} topbar={topbar} />}
      {currentView === 'pay' && <PayLendPage topbar={topbar} />}
      {currentView === 'settings' && <SettingsPage user={currentUser} activeSection={settingsSection} preferences={preferences} notifications={notifications} security={security} authProvider={authUser?.provider ?? 'email'} onSectionChange={setSettingsSection} onSaveProfile={updateCurrentUser} onUpdatePreferences={updatePreferences} onUpdateNotifications={updateNotifications} onUpdateSecurity={updateSecurity} onResetPassword={async () => (await sendPasswordReset(currentUser.email)).message ?? 'Password reset instructions sent.'} onSignOut={() => void signOut()} topbar={topbar} />}

      <MobileNavigation currentView={currentView} language={language} onNavigate={navigate} />

      <ExpenseModal open={expenseOpen} expense={editingExpense} group={group} users={state.users} currentUserId={state.currentUserId} currency={currency} onClose={() => { setExpenseOpen(false); setEditingExpense(null) }} onSave={saveExpense} />
      <SettleModal open={settleOpen} payment={editingPayment} suggestedDebt={suggestedDebt} group={group} users={state.users} currentUserId={state.currentUserId} currency={currency} onClose={() => { setSettleOpen(false); setEditingPayment(null); setSuggestedDebt(null) }} onSave={savePayment} />
      <CreateGroupModal open={createGroupOpen} users={state.users} currentUserId={state.currentUserId} onClose={() => setCreateGroupOpen(false)} onSave={saveGroup} />
      <ExpenseDetailModal expense={selectedExpense} group={selectedExpense ? state.groups.find((entry) => entry.id === selectedExpense.groupId) : undefined} users={state.users} onClose={() => setSelectedExpense(null)} onEdit={editExpense} onDelete={deleteExpense} requireDeleteConfirmation={security.confirmSensitiveActions} />
      <PaymentDetailModal payment={selectedPayment} group={selectedPayment ? state.groups.find((entry) => entry.id === selectedPayment.groupId) : undefined} users={state.users} onClose={() => setSelectedPayment(null)} onEdit={editPayment} onDelete={deletePayment} requireDeleteConfirmation={security.confirmSensitiveActions} />
      <ReminderModal debt={reminderDebt} group={reminderDebt ? group : undefined} currentUser={currentUser} targetUser={reminderDebt ? state.users.find((user) => user.id === reminderDebt.fromUserId) : undefined} onClose={() => setReminderDebt(null)} />
      <SmartAssistantModal open={smartOpen} state={state} group={group} onClose={() => setSmartOpen(false)} onRemind={openReminder} onSettle={(debt) => { setSmartOpen(false); openSettle(debt) }} />
    </div>
  )
}
