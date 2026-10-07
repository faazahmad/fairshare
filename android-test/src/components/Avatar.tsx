import type { User } from '../domain/types'

interface AvatarProps {
  user: User
  size?: 'small' | 'medium' | 'large'
}

export function Avatar({ user, size = 'medium' }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ '--avatar-color': user.color } as React.CSSProperties}
      title={user.name}
      aria-label={user.name}
    >
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.initials}
    </span>
  )
}
