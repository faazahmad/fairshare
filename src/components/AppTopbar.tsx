import { BellRing, ChevronDown, HandCoins, MessageCircle, Search, Settings, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { LedgerState, NotificationPreferences, User } from '../domain/types'
import type { AppView } from './AppNavigation'
import { Avatar } from './Avatar'
import { NotificationPanel } from './NotificationPanel'

interface AppTopbarProps {
  state: LedgerState
  currentUser: User
  currentView: AppView
  query: string
  notificationsOpen: boolean
  notificationCount: number
  notificationPreferences: NotificationPreferences
  onQueryChange: (value: string) => void
  onToggleNotifications: () => void
  onMarkNotificationsRead: () => void
  onOpenHome: () => void
  onOpenPeopleHub: () => void
  onOpenChats: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
}

export function AppTopbar({
  state,
  currentUser,
  currentView,
  query,
  notificationsOpen,
  notificationCount,
  notificationPreferences,
  onQueryChange,
  onToggleNotifications,
  onMarkNotificationsRead,
  onOpenHome,
  onOpenPeopleHub,
  onOpenChats,
  onOpenProfile,
  onOpenSettings,
}: AppTopbarProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const searchable = currentView === 'expenses' || currentView === 'activity'

  function closeOverlays() {
    setAccountOpen(false)
    if (notificationsOpen) onToggleNotifications()
  }

  return (
    <header className="topbar">
      <div className="topbar__leading" aria-label="Quick access">
        <button className={`icon-button topbar-people-button ${currentView === 'people' ? 'is-active' : ''}`} onClick={() => { closeOverlays(); onOpenPeopleHub() }} aria-label="Money requests and contacts" title="Requests and contacts"><HandCoins size={19} /></button>
        <button className={`icon-button topbar-chat-button ${currentView === 'chats' ? 'is-active' : ''}`} onClick={() => { closeOverlays(); onOpenChats() }} aria-label="Open chats" title="Chats"><MessageCircle size={19} /></button>
      </div>

      <button className="topbar__brand" type="button" onClick={onOpenHome} aria-label={currentView === 'chats' ? 'Fairshare chats' : 'Fairshare home'}>
        {currentView === 'chats' ? 'fsChat' : 'fairshare'}
      </button>

      <div className="topbar__actions">
        <label className={`search-box ${searchable ? '' : 'search-box--quiet'}`}>
          <Search size={18} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchable ? `Search ${currentView}` : 'Search Fairshare'} />
        </label>
        <div className="popover-anchor account-anchor">
          <button className={`account-menu-button ${accountOpen || notificationsOpen || currentView === 'profile' || currentView === 'settings' ? 'is-active' : ''}`} onClick={() => { if (notificationsOpen) onToggleNotifications(); setAccountOpen((open) => !open) }} aria-label="User account menu" aria-expanded={accountOpen}>
            <Avatar user={currentUser} size="small" /><span>{currentUser.name.split(' ')[0]}</span><ChevronDown size={14} />
            {notificationCount > 0 && <i className="account-notification-dot" aria-label={`${notificationCount} unread notifications`}>{notificationCount > 99 ? '99+' : notificationCount}</i>}
          </button>
          <NotificationPanel open={notificationsOpen} state={state} preferences={notificationPreferences} unread={notificationCount > 0} onMarkRead={onMarkNotificationsRead} onClose={onToggleNotifications} />
          {accountOpen && <>
            <button className="account-menu-scrim" aria-label="Close account menu" onClick={() => setAccountOpen(false)} />
            <section className="account-menu" role="dialog" aria-label="User account">
              <header><Avatar user={currentUser} size="large" /><div><strong>{currentUser.name}</strong><span>{currentUser.email}</span></div></header>
              <nav>
                <button onClick={() => { setAccountOpen(false); onOpenProfile() }}><UserRound size={17} /><span><strong>Profile</strong><small>Your public profile and details</small></span></button>
                <button onClick={() => { setAccountOpen(false); onToggleNotifications() }}><BellRing size={17} /><span><strong>Notifications</strong><small>Recent activity</small></span>{notificationCount > 0 && <i className="notification-menu-dot" aria-label={`${notificationCount} unread notifications`}>{notificationCount > 99 ? '99+' : notificationCount}</i>}</button>
                <button onClick={() => { setAccountOpen(false); onOpenSettings() }}><Settings size={17} /><span><strong>Settings</strong><small>Appearance, alerts and security</small></span></button>
              </nav>
            </section>
          </>}
        </div>
      </div>
    </header>
  )
}
