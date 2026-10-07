import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Home, Palmtree, Trash2, Users, X } from 'lucide-react'
import type { Group, GroupKind, User } from '../domain/types'
import { Avatar } from './Avatar'

interface CreateGroupModalProps {
  open: boolean
  group?: Group | null
  users: User[]
  currentUserId: string
  lockedMemberIds?: string[]
  canDelete?: boolean
  onClose: () => void
  onSave: (group: Group) => void
  onDelete?: (groupId: string) => void
}

const kinds: Array<{ value: GroupKind; label: string; emoji: string }> = [
  { value: 'trip', label: 'Trip', emoji: '🌴' },
  { value: 'home', label: 'Home', emoji: '🏡' },
  { value: 'couple', label: 'Couple', emoji: '💛' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

export function CreateGroupModal({
  open,
  group,
  users,
  currentUserId,
  lockedMemberIds = [],
  canDelete = true,
  onClose,
  onSave,
  onDelete,
}: CreateGroupModalProps) {
  const editing = Boolean(group)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<GroupKind>('trip')
  const [emoji, setEmoji] = useState('🌴')
  const [memberIds, setMemberIds] = useState<string[]>([currentUserId])
  const [simplifyDebts, setSimplifyDebts] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setKind(group?.kind ?? 'trip')
    setEmoji(group?.emoji ?? '🌴')
    setMemberIds(group?.memberIds ?? [currentUserId])
    setSimplifyDebts(group?.simplifyDebts ?? true)
    setConfirmDelete(false)
    setError('')
  }, [open, group, currentUserId])

  if (!open) return null

  function chooseKind(value: GroupKind, nextEmoji: string) {
    setKind(value)
    if (!editing || emoji === kinds.find((entry) => entry.value === kind)?.emoji) setEmoji(nextEmoji)
  }

  function toggleMember(userId: string) {
    if (userId === currentUserId) return
    if (memberIds.includes(userId) && lockedMemberIds.includes(userId)) {
      setError('A member with ledger history cannot be removed. Delete or reassign their entries first.')
      return
    }
    setError('')
    setMemberIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId])
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError('Give your group a name.')
    onSave({
      id: group?.id ?? crypto.randomUUID(),
      name: name.trim(),
      kind,
      emoji: emoji.trim() || '✨',
      memberIds,
      simplifyDebts,
    })
    onClose()
  }

  function removeGroup() {
    if (!group || !onDelete) return
    onDelete(group.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal create-group-modal" role="dialog" aria-modal="true" aria-labelledby="create-group-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div><span className="eyebrow">{editing ? 'Group management' : 'Start sharing'}</span><h2 id="create-group-title">{editing ? 'Edit group' : 'Create a group'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="group-name-editor">
            <label><span>Group icon</span><input value={emoji} onChange={(event) => setEmoji(event.target.value.slice(0, 4))} aria-label="Group icon" /></label>
            <label><span>Group name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Manali weekend" autoFocus /></label>
          </div>

          <fieldset className="choice-fieldset">
            <legend>What is this group for?</legend>
            <div className="kind-grid">
              {kinds.map((item) => (
                <button key={item.value} type="button" className={kind === item.value ? 'is-active' : ''} onClick={() => chooseKind(item.value, item.emoji)}>
                  <span>{item.emoji}</span><strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-fieldset">
            <legend>{editing ? 'Manage people' : 'Add people'}</legend>
            <div className="invite-list">
              {users.map((user) => {
                const selected = memberIds.includes(user.id)
                const historyLocked = selected && lockedMemberIds.includes(user.id)
                return (
                  <button key={user.id} type="button" onClick={() => toggleMember(user.id)} className={`${selected ? 'is-selected' : ''} ${historyLocked ? 'is-locked' : ''}`} aria-describedby={historyLocked ? `locked-${user.id}` : undefined}>
                    <Avatar user={user} />
                    <span><strong>{user.name}{user.id === currentUserId ? ' (you)' : ''}</strong><small id={`locked-${user.id}`}>{historyLocked ? 'Has ledger history · cannot be removed' : user.email}</small></span>
                    <span className="check-circle">{selected && <Check size={14} />}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="switch-row">
            <span className="switch-row__icon">{kind === 'home' ? <Home size={18} /> : kind === 'trip' ? <Palmtree size={18} /> : <Users size={18} />}</span>
            <span><strong>Simplify group debts</strong><small>Reduce the number of transfers needed to settle.</small></span>
            <input type="checkbox" checked={simplifyDebts} onChange={(event) => setSimplifyDebts(event.target.checked)} />
          </label>

          {confirmDelete && <div className="delete-confirmation group-delete-confirmation"><AlertTriangle size={18} /><div><strong>Delete “{group?.name}”?</strong><span>Its expenses and recorded payments will also be removed from this device.</span></div><button className="button button--ghost" type="button" onClick={() => setConfirmDelete(false)}>Keep group</button><button className="button button--danger" type="button" onClick={removeGroup}>Delete group</button></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal__footer group-modal-footer">
            {editing && !confirmDelete && <button className="button button--danger-ghost group-delete-button" type="button" disabled={!canDelete} title={canDelete ? 'Delete this group and its ledger' : 'At least one group must remain'} onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete group</button>}
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">{editing ? 'Save changes' : 'Create group'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
