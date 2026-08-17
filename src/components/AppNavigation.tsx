import { Activity, ChevronDown, CreditCard, Home, Plus, Receipt, Users, WalletCards } from 'lucide-react'
import type { LedgerState } from '../domain/types'
import { formatMoney } from '../domain/money'
import { groupBalance } from '../lib/ledger'
import { Avatar } from './Avatar'
import { resolveLanguage, translate } from '../lib/i18n'

export type AppView = 'home' | 'expenses' | 'activity' | 'groups' | 'pay' | 'settings'

interface AppNavigationProps {
  state: LedgerState
  currentView: AppView
  selectedGroupId: string
  onNavigate: (view: AppView) => void
  onSelectGroup: (groupId: string) => void
  onCreateGroup: () => void
}

export function AppNavigation({ state, currentView, selectedGroupId, onNavigate, onSelectGroup, onCreateGroup }: AppNavigationProps) {
  const currentUser = state.users.find((user) => user.id === state.currentUserId)
  if (!currentUser) return null
  const language = resolveLanguage(currentUser.language)
  const currency = currentUser.defaultCurrency ?? 'INR'
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('home')} aria-label="Fairshare home">
        <span className="brand__mark"><WalletCards size={23} /></span>
        <span>fairshare</span>
      </button>

      <nav className="primary-nav" aria-label="Main navigation">
        <button className={currentView === 'home' ? 'is-active' : ''} onClick={() => onNavigate('home')}><Home size={19} /><span>{t('home')}</span></button>
        <button className={currentView === 'expenses' ? 'is-active' : ''} onClick={() => onNavigate('expenses')}><Receipt size={19} /><span>{t('expenses')}</span></button>
        <button className={currentView === 'activity' ? 'is-active' : ''} onClick={() => onNavigate('activity')}><Activity size={19} /><span>{t('activity')}</span><span className="nav-badge">3</span></button>
        <button className={currentView === 'groups' ? 'is-active' : ''} onClick={() => onNavigate('groups')}><Users size={19} /><span>{t('groups')}</span></button>
        <button className={currentView === 'pay' ? 'is-active' : ''} onClick={() => onNavigate('pay')}><CreditCard size={19} /><span>{t('payAndLend')}</span><span className="soon-badge">Soon</span></button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section__header">
          <span>Your groups</span>
          <button className="tiny-icon-button" onClick={onCreateGroup} aria-label="Create group"><Plus size={16} /></button>
        </div>
        <div className="group-list">
          {state.groups.map((group) => {
            const balance = groupBalance(state, group)
            return (
              <button
                key={group.id}
                className={currentView === 'expenses' && group.id === selectedGroupId ? 'is-active' : ''}
                onClick={() => onSelectGroup(group.id)}
              >
                <span className="group-list__icon">{group.emoji}</span>
                <span className="group-list__copy">
                  <strong>{group.name}</strong>
                  <small className={balance >= 0 ? 'positive' : 'negative'}>
                    {balance === 0 ? 'settled up' : `${balance > 0 ? '+' : '−'}${formatMoney(Math.abs(balance), currency)}`}
                  </small>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sidebar-spacer" />
      <button className={`profile-card ${currentView === 'settings' ? 'is-active' : ''}`} onClick={() => onNavigate('settings')}>
        <Avatar user={currentUser} />
        <span><strong>{currentUser.name}</strong><small>Personal account</small></span>
        <ChevronDown size={16} />
      </button>
    </aside>
  )
}
