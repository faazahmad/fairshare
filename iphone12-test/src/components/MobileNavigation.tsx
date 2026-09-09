import { Activity, CreditCard, Home, Receipt, Users } from 'lucide-react'
import type { AppView } from './AppNavigation'
import { translate } from '../lib/i18n'

interface MobileNavigationProps {
  currentView: AppView
  language?: string
  onNavigate: (view: AppView) => void
}

export function MobileNavigation({ currentView, language, onNavigate }: MobileNavigationProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button className={currentView === 'home' ? 'is-active' : ''} onClick={() => onNavigate('home')}><Home size={20} /><span>{t('home')}</span></button>
      <button className={currentView === 'expenses' ? 'is-active' : ''} onClick={() => onNavigate('expenses')}><Receipt size={20} /><span>{t('expenses')}</span></button>
      <button className={`mobile-add ${currentView === 'pay' ? 'is-active' : ''}`} onClick={() => onNavigate('pay')} aria-label={t('payAndLend')}><CreditCard size={22} /><span>{t('pay')}</span></button>
      <button className={currentView === 'groups' ? 'is-active' : ''} onClick={() => onNavigate('groups')}><Users size={20} /><span>{t('groups')}</span></button>
      <button className={currentView === 'activity' ? 'is-active' : ''} onClick={() => onNavigate('activity')}><Activity size={20} /><span>{t('activity')}</span></button>
    </nav>
  )
}
