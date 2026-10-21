import type { NotificationChannel } from '../domain/types'

export function ChannelLogo({ channel, size = 18 }: { channel: NotificationChannel; size?: number }) {
  return <img
    className={`channel-logo channel-logo--${channel}`}
    src={channel === 'whatsapp' ? '/brand/whatsapp.avif' : '/brand/instagram.png'}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
  />
}
