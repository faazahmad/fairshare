import type { ReactNode } from 'react'
import { ArrowRight, CircleDollarSign, HandCoins, Plus, Receipt, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { LedgerState } from '../domain/types'
import { calculateBalances, formatMoney, simplifyDebts } from '../domain/money'
import { findUser, groupBalance } from '../lib/ledger'
import { Avatar } from '../components/Avatar'
import { formatCurrentMonth, formatDateOnly, formatTodayHeading, greetingForTime, localMonthValue } from '../lib/dates'
import { useMinuteClock } from '../hooks/useMinuteClock'

interface HomePageProps {
  state: LedgerState
  onOpenGroup: (groupId: string) => void
  onAddExpense: () => void
  onCreateGroup: () => void
  topbar: ReactNode
}

export function HomePage({ state, onOpenGroup, onAddExpense, onCreateGroup, topbar }: HomePageProps) {
  const currentUser = findUser(state.users, state.currentUserId)
  const balances = state.groups.map((group) => ({ group, balance: groupBalance(state, group) }))
  const totalOwed = balances.reduce((sum, entry) => sum + Math.max(0, entry.balance), 0)
  const totalOwing = balances.reduce((sum, entry) => sum + Math.max(0, -entry.balance), 0)
  const today = useMinuteClock()
  const monthPrefix = localMonthValue(today)
  const currentMonth = formatCurrentMonth(today)
  const monthlySpend = state.expenses.filter((expense) => expense.occurredAt.startsWith(monthPrefix)).reduce((sum, expense) => sum + (expense.shares.find((share) => share.userId === state.currentUserId)?.amount ?? 0), 0)
  const recentExpenses = [...state.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)

  const friendBalances = state.users.filter((user) => user.id !== state.currentUserId).map((user) => ({
    user,
    balance: state.groups.filter((group) => group.memberIds.includes(user.id)).reduce((sum, group) => {
      const balances = calculateBalances(
        group.memberIds,
        state.expenses.filter((expense) => expense.groupId === group.id),
        state.payments.filter((payment) => payment.groupId === group.id),
        'INR',
      )
      const directSettlements = simplifyDebts(balances).reduce((pairSum, debt) => {
        if (debt.fromUserId === user.id && debt.toUserId === state.currentUserId) return pairSum + debt.amount
        if (debt.fromUserId === state.currentUserId && debt.toUserId === user.id) return pairSum - debt.amount
        return pairSum
      }, 0)
      return sum + directSettlements
    }, 0),
  }))

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content">
        <section className="welcome-hero">
          <div><span className="eyebrow">{formatTodayHeading(today)}</span><h1>{greetingForTime(today)}, {currentUser.name.split(' ')[0]}.</h1><p>Here’s where your shared money stands today.</p></div>
          <div className="welcome-actions"><button className="button button--secondary" onClick={onCreateGroup}><Users size={17} /> New group</button><button className="button button--primary" onClick={onAddExpense}><Plus size={18} /> Add expense</button></div>
        </section>

        <section className="home-balance-grid">
          <article className="balance-hero-card"><span className="balance-hero-card__label"><Sparkles size={15} /> Net position</span><strong>{formatMoney(totalOwed - totalOwing, 'INR')}</strong><p>{totalOwed >= totalOwing ? 'Overall, you are owed money' : 'Overall, you owe money'}</p><div><span><small>You are owed</small><b>{formatMoney(totalOwed, 'INR')}</b></span><span><small>You owe</small><b>{formatMoney(totalOwing, 'INR')}</b></span></div></article>
          <article className="metric-tile"><span className="metric-tile__icon mint"><CircleDollarSign size={21} /></span><div><small>Your {currentMonth} spend</small><strong>{formatMoney(monthlySpend, 'INR')}</strong><span><TrendingUp size={13} /> Across {state.groups.length} groups</span></div></article>
          <article className="metric-tile"><span className="metric-tile__icon coral"><Receipt size={21} /></span><div><small>Shared expenses</small><strong>{state.expenses.length}</strong><span>{state.payments.length} payment recorded</span></div></article>
        </section>

        <div className="home-columns">
          <section className="home-section">
            <div className="section-heading"><div><h2>Your groups</h2><p>Balances update instantly when expenses change</p></div><button className="text-button" onClick={onCreateGroup}>Create group <Plus size={14} /></button></div>
            <div className="group-card-grid">
              {balances.map(({ group, balance }) => {
                const spend = state.expenses.filter((expense) => expense.groupId === group.id).reduce((sum, expense) => sum + expense.amount, 0)
                return <button className="group-overview-card" key={group.id} onClick={() => onOpenGroup(group.id)}><span className="group-overview-card__emoji">{group.emoji}</span><span className="group-overview-card__copy"><strong>{group.name}</strong><small>{group.memberIds.length} members · {formatMoney(spend, 'INR')} spent</small></span><span className={balance >= 0 ? 'positive' : 'negative'}><small>{balance >= 0 ? 'you get' : 'you owe'}</small><strong>{formatMoney(Math.abs(balance), 'INR')}</strong></span><ArrowRight size={17} /></button>
              })}
            </div>
          </section>

          <aside className="home-section friend-summary">
            <div className="section-heading"><div><h2>Friends</h2><p>Across all shared groups</p></div></div>
            <div className="friend-balance-list">
              {friendBalances.map(({ user, balance }) => <article key={user.id}><Avatar user={user} /><span><strong>{user.name}</strong><small>{balance >= 0 ? 'owes you' : 'you owe'}</small></span><b className={balance >= 0 ? 'positive' : 'negative'}>{formatMoney(Math.abs(balance), 'INR')}</b></article>)}
            </div>
            <button className="button button--wide button--soft"><HandCoins size={16} /> Review settlements</button>
          </aside>
        </div>

        <section className="home-section recent-strip">
          <div className="section-heading"><div><h2>Recent expenses</h2><p>The latest additions across your groups</p></div></div>
          <div className="recent-expense-grid">{recentExpenses.map((expense) => { const group = state.groups.find((entry) => entry.id === expense.groupId); return <button key={expense.id} onClick={() => onOpenGroup(expense.groupId)}><span>{group?.emoji ?? '🧾'}</span><span><strong>{expense.description}</strong><small>{group?.name} · {formatDateOnly(expense.occurredAt, { day: 'numeric', month: 'short' })}</small></span><b>{formatMoney(expense.amount, expense.currency)}</b></button> })}</div>
        </section>
      </div>
    </main>
  )
}
