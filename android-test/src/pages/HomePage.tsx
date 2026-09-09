import type { ReactNode } from 'react'
import { ArrowRight, CircleDollarSign, HandCoins, Plus, Receipt, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { LedgerState } from '../domain/types'
import { calculateBalances, formatMoney, simplifyDebts } from '../domain/money'
import { findUser, groupBalance } from '../lib/ledger'
import { Avatar } from '../components/Avatar'
import { formatCurrentMonth, formatDateOnly, formatTodayHeading, greetingForTime, localMonthValue } from '../lib/dates'
import { useMinuteClock } from '../hooks/useMinuteClock'
import { localeForLanguage, resolveLanguage, translate, type TranslationKey } from '../lib/i18n'

interface HomePageProps {
  state: LedgerState
  onOpenGroup: (groupId: string) => void
  onAddExpense: () => void
  onCreateGroup: () => void
  topbar: ReactNode
}

export function HomePage({ state, onOpenGroup, onAddExpense, onCreateGroup, topbar }: HomePageProps) {
  const currentUser = findUser(state.users, state.currentUserId)
  const language = resolveLanguage(currentUser.language)
  const locale = localeForLanguage(language)
  const currency = currentUser.defaultCurrency ?? 'INR'
  const t = (key: TranslationKey, variables?: Record<string, string | number>) => translate(language, key, variables)
  const balances = state.groups.map((group) => ({ group, balance: groupBalance(state, group) }))
  const totalOwed = balances.reduce((sum, entry) => sum + Math.max(0, entry.balance), 0)
  const totalOwing = balances.reduce((sum, entry) => sum + Math.max(0, -entry.balance), 0)
  const today = useMinuteClock()
  const monthPrefix = localMonthValue(today)
  const currentMonth = formatCurrentMonth(today, locale)
  const monthlySpend = state.expenses
    .filter((expense) => expense.occurredAt.startsWith(monthPrefix))
    .reduce((sum, expense) => sum + (expense.shares.find((share) => share.userId === state.currentUserId)?.amount ?? 0), 0)
  const recentExpenses = [...state.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)

  const friendBalances = state.users.filter((user) => user.id !== state.currentUserId).map((user) => ({
    user,
    balance: state.groups.filter((group) => group.memberIds.includes(user.id)).reduce((sum, group) => {
      const balances = calculateBalances(
        group.memberIds,
        state.expenses.filter((expense) => expense.groupId === group.id),
        state.payments.filter((payment) => payment.groupId === group.id),
        currency,
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
          <div><span className="eyebrow">{formatTodayHeading(today, locale)}</span><h1>{greetingForTime(today, language)}, {currentUser.name.split(' ')[0]}.</h1><p>{t('sharedMoneyToday')}</p></div>
          <div className="welcome-actions"><button className="button button--secondary" onClick={onCreateGroup}><Users size={17} /> {t('newGroup')}</button><button className="button button--primary" onClick={onAddExpense}><Plus size={18} /> {t('addExpense')}</button></div>
        </section>

        <section className="home-balance-grid">
          <article className="balance-hero-card"><span className="balance-hero-card__label"><Sparkles size={15} /> {t('netPosition')}</span><strong>{formatMoney(totalOwed - totalOwing, currency)}</strong><p>{totalOwed >= totalOwing ? t('owedOverall') : t('owingOverall')}</p><div><span><small>{t('youAreOwed')}</small><b>{formatMoney(totalOwed, currency)}</b></span><span><small>{t('youOwe')}</small><b>{formatMoney(totalOwing, currency)}</b></span></div></article>
          <article className="metric-tile metric-tile--mint">
            <header className="metric-tile__header"><span className="metric-tile__icon mint"><CircleDollarSign size={20} /></span><small>{t('monthlySpend', { month: currentMonth })}</small></header>
            <div className="metric-tile__body"><strong>{formatMoney(monthlySpend, currency)}</strong><span><TrendingUp size={13} /> {t('acrossGroups', { count: state.groups.length })}</span></div>
          </article>
          <article className="metric-tile metric-tile--coral">
            <header className="metric-tile__header"><span className="metric-tile__icon coral"><Receipt size={20} /></span><small>{t('sharedExpenses')}</small></header>
            <div className="metric-tile__body"><strong>{state.expenses.length}</strong><span>{t(state.payments.length === 1 ? 'paymentsRecorded' : 'paymentsRecordedPlural', { count: state.payments.length })}</span></div>
          </article>
        </section>

        <div className="home-columns">
          <section className="home-section">
            <div className="section-heading"><div><h2>{t('yourGroups')}</h2><p>{t('balancesUpdate')}</p></div><button className="text-button" onClick={onCreateGroup}>{t('createGroup')} <Plus size={14} /></button></div>
            <div className="group-card-grid">
              {balances.map(({ group, balance }) => {
                const spend = state.expenses.filter((expense) => expense.groupId === group.id).reduce((sum, expense) => sum + expense.amount, 0)
                return <button className="group-overview-card" key={group.id} onClick={() => onOpenGroup(group.id)}><span className="group-overview-card__emoji">{group.emoji}</span><span className="group-overview-card__copy"><strong>{group.name}</strong><small>{group.memberIds.length} members · {formatMoney(spend, currency)} spent</small></span><span className={balance >= 0 ? 'positive' : 'negative'}><small>{balance >= 0 ? 'you get' : 'you owe'}</small><strong>{formatMoney(Math.abs(balance), currency)}</strong></span><ArrowRight size={17} /></button>
              })}
            </div>
          </section>

          <aside className="home-section friend-summary">
            <div className="section-heading"><div><h2>{t('friends')}</h2><p>{t('acrossAllGroups')}</p></div></div>
            <div className="friend-balance-list">
              {friendBalances.map(({ user, balance }) => <article key={user.id}><Avatar user={user} /><span><strong>{user.name}</strong><small>{balance >= 0 ? 'owes you' : 'you owe'}</small></span><b className={balance >= 0 ? 'positive' : 'negative'}>{formatMoney(Math.abs(balance), currency)}</b></article>)}
            </div>
            <button className="button button--wide button--soft"><HandCoins size={16} /> Review settlements</button>
          </aside>
        </div>

        <section className="home-section recent-strip">
          <div className="section-heading"><div><h2>{t('recentExpenses')}</h2><p>{t('latestAdditions')}</p></div></div>
          <div className="recent-expense-grid">{recentExpenses.map((expense) => { const group = state.groups.find((entry) => entry.id === expense.groupId); return <button key={expense.id} onClick={() => onOpenGroup(expense.groupId)}><span>{group?.emoji ?? '🧾'}</span><span><strong>{expense.description}</strong><small>{group?.name} · {formatDateOnly(expense.occurredAt, { day: 'numeric', month: 'short' }, locale)}</small></span><b>{formatMoney(expense.amount, expense.currency)}</b></button> })}</div>
        </section>
      </div>
    </main>
  )
}
