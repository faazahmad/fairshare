import { Check } from 'lucide-react'
import type { NotificationChannel } from '../domain/types'
import { ChannelLogo } from './ChannelLogo'

interface ReminderChannelPickerProps {
  channels: NotificationChannel[]
  onChange: (channels: NotificationChannel[]) => void
}

export function ReminderChannelPicker({ channels, onChange }: ReminderChannelPickerProps) {
  function toggle(channel: NotificationChannel) {
    onChange(channels.includes(channel)
      ? channels.length === 1 ? channels : channels.filter((value) => value !== channel)
      : [...channels, channel])
  }

  return <fieldset className="notification-channel-picker reminder-channel-picker">
    <legend>Reminder delivery</legend>
    <div>
      <button type="button" className={channels.includes('whatsapp') ? 'is-active' : ''} onClick={() => toggle('whatsapp')}>
        <ChannelLogo channel="whatsapp" size={17} /><span><strong>WhatsApp</strong><small>Business message</small></span><i>{channels.includes('whatsapp') && <Check size={13} />}</i>
      </button>
      <button type="button" className={channels.includes('instagram') ? 'is-active' : ''} onClick={() => toggle('instagram')}>
        <ChannelLogo channel="instagram" size={17} /><span><strong>Instagram</strong><small>Connected account</small></span><i>{channels.includes('instagram') && <Check size={13} />}</i>
      </button>
    </div>
    {channels.includes('instagram') && <small className="channel-requirement">Instagram delivery waits until the payer has messaged Fairshare’s connected professional account.</small>}
  </fieldset>
}
