import { Activity, CreditCard, Home, Receipt, Users } from 'lucide-react'
import type { AppView } from './AppNavigation'

interface MobileNavigationProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
}

export function MobileNavigation({ currentView, onNavigate }: MobileNavigationProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button className={currentView === 'home' ? 'is-active' : ''} onClick={() => onNavigate('home')}><Home size={20} /><span>Home</span></button>
      <button className={currentView === 'expenses' ? 'is-active' : ''} onClick={() => onNavigate('expenses')}><Receipt size={20} /><span>Expenses</span></button>
      <button className={`mobile-add ${currentView === 'pay' ? 'is-active' : ''}`} onClick={() => onNavigate('pay')} aria-label="Pay and lend"><CreditCard size={22} /><span>Pay</span></button>
      <button className={currentView === 'groups' ? 'is-active' : ''} onClick={() => onNavigate('groups')}><Users size={20} /><span>Groups</span></button>
      <button className={currentView === 'activity' ? 'is-active' : ''} onClick={() => onNavigate('activity')}><Activity size={20} /><span>Activity</span></button>
    </nav>
  )
}
