import { ArrowRight, Plus, Sparkles, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LedgerState } from '../domain/types'
import { formatMoney } from '../domain/money'
import { findUser, groupBalance } from '../lib/ledger'
import { Avatar } from '../components/Avatar'

export function GroupsPage({ state, onCreateGroup, onOpenGroup, topbar }: { state: LedgerState; onCreateGroup: () => void; onOpenGroup: (groupId: string) => void; topbar: ReactNode }) {
  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content">
        <section className="page-hero"><div><span className="page-hero__icon"><Users size={23} /></span><div><span className="eyebrow">Shared spaces</span><h1>Your groups</h1><p>Trips, homes, couples, and everything in between.</p></div></div><button className="button button--primary" onClick={onCreateGroup}><Plus size={18} /> Create group</button></section>
        <section className="groups-gallery">
          {state.groups.map((group) => {
            const balance = groupBalance(state, group)
            const expenses = state.expenses.filter((expense) => expense.groupId === group.id)
            const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
            return <article className="group-gallery-card" key={group.id}><header><span>{group.emoji}</span><button aria-label={`Open ${group.name}`} onClick={() => onOpenGroup(group.id)}><ArrowRight size={18} /></button></header><div><span className="eyebrow">{group.kind} group</span><h2>{group.name}</h2><p>{expenses.length} expenses · {formatMoney(total, 'INR')} total</p></div><div className="group-gallery-card__members"><div className="avatar-stack">{group.memberIds.slice(0, 4).map((id) => <Avatar key={id} user={findUser(state.users, id)} size="small" />)}</div><span>{group.memberIds.length} members</span></div><footer><span><small>Your balance</small><strong className={balance >= 0 ? 'positive' : 'negative'}>{balance === 0 ? 'Settled' : formatMoney(Math.abs(balance), 'INR')}</strong></span><button className="text-button" onClick={() => onOpenGroup(group.id)}>View ledger <ArrowRight size={14} /></button></footer></article>
          })}
          <button className="new-group-card" onClick={onCreateGroup}><span><Plus size={24} /></span><strong>Create another group</strong><small>Invite friends and start sharing</small></button>
        </section>
        <aside className="groups-tip"><Sparkles size={20} /><div><strong>Tip: simplify debts</strong><p>Fairshare can reduce a web of balances into fewer payments without changing what anyone owes.</p></div></aside>
      </div>
    </main>
  )
}
