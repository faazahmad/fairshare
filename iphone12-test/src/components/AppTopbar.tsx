import { Bell, BellRing, ChevronDown, LockKeyhole, Search, Settings, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { LedgerState, NotificationPreferences, User } from '../domain/types'
import type { AppView } from './AppNavigation'
import type { SettingsSection } from '../pages/SettingsPage'
import { Avatar } from './Avatar'
import { NotificationPanel } from './NotificationPanel'

interface AppTopbarProps {
  state: LedgerState
  currentUser: User
  currentView: AppView
  query: string
  notificationsOpen: boolean
  notificationsUnread: boolean
  notificationPreferences: NotificationPreferences
  onQueryChange: (value: string) => void
  onToggleNotifications: () => void
  onMarkNotificationsRead: () => void
  onOpenSettings: (section: SettingsSection) => void
}

export function AppTopbar({ state, currentUser, currentView, query, notificationsOpen, notificationsUnread, notificationPreferences, onQueryChange, onToggleNotifications, onMarkNotificationsRead, onOpenSettings }: AppTopbarProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const searchable = currentView === 'expenses' || currentView === 'activity'

  function openSettings(section: SettingsSection) {
    setAccountOpen(false)
    onOpenSettings(section)
  }

  return (
    <header className="topbar">
      <label className={`search-box ${searchable ? '' : 'search-box--quiet'}`}>
        <Search size={18} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchable ? `Search ${currentView}` : 'Search Fairshare'} />
      </label>
      <div className="topbar__actions">
        <div className="popover-anchor">
          <button className={`icon-button ${notificationsOpen ? 'is-active' : ''}`} onClick={() => { setAccountOpen(false); onToggleNotifications() }} aria-label="Notifications"><Bell size={19} />{notificationsUnread && <span className="notification-dot" />}</button>
          <NotificationPanel open={notificationsOpen} state={state} preferences={notificationPreferences} unread={notificationsUnread} onMarkRead={onMarkNotificationsRead} onClose={onToggleNotifications} />
        </div>
        <div className="popover-anchor account-anchor">
          <button className={`account-menu-button ${accountOpen || currentView === 'settings' ? 'is-active' : ''}`} onClick={() => { if (notificationsOpen) onToggleNotifications(); setAccountOpen((open) => !open) }} aria-label="User account menu" aria-expanded={accountOpen}><Avatar user={currentUser} size="small" /><span>{currentUser.name.split(' ')[0]}</span><ChevronDown size={14} /></button>
          {accountOpen && <><button className="account-menu-scrim" aria-label="Close account menu" onClick={() => setAccountOpen(false)} /><section className="account-menu" role="dialog" aria-label="User account"><header><Avatar user={currentUser} size="large" /><div><strong>{currentUser.name}</strong><span>{currentUser.email}</span></div></header><nav><button onClick={() => openSettings('profile')}><UserRound size={17} /><span><strong>Profile</strong><small>Photo and personal details</small></span></button><button onClick={() => openSettings('notifications')}><BellRing size={17} /><span><strong>Notifications</strong><small>Alerts and quiet hours</small></span></button><button onClick={() => openSettings('appearance')}><Settings size={17} /><span><strong>Appearance</strong><small>Theme and display</small></span></button><button onClick={() => openSettings('security')}><LockKeyhole size={17} /><span><strong>Security</strong><small>Password and device session</small></span></button></nav></section></>}
        </div>
      </div>
    </header>
  )
}
