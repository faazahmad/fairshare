import {
  ArrowLeft, CheckCheck, CirclePlus, Heart, Image as ImageIcon, Laugh,
  MessageCircle, Mic, MoreHorizontal, Phone, Search, Send, Sparkles, Square, Video,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '../components/Avatar'
import { StickerArtwork, type StickerCode } from '../components/StickerArtwork'
import type { ChatConversation, ChatMessage, Contact, User } from '../domain/types'
import { ACCESS_TOKEN_KEY, api } from '../lib/api'

interface ChatsPageProps {
  currentUser: User
  initialContactUserId?: string | null
  onThreadOpenChange?: (open: boolean) => void
  topbar: ReactNode
}

type DisplayMessage = ChatMessage & { voiceObjectUrl?: string }
type InboxConversation = ChatConversation & { favorite?: boolean; demo?: boolean }

const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_CHAT !== 'false'
const DEMO_USER_ID = 'demo-maya'
const DEMO_MESSAGES: ChatMessage[] = [
  { id: 'demo-1', senderId: DEMO_USER_ID, recipientId: 'me', content: 'Dinner was brilliant. Send me my share whenever you add it ✨', messageType: 'TEXT', createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(), readAt: new Date().toISOString() },
  { id: 'demo-2', senderId: 'me', recipientId: DEMO_USER_ID, content: 'Done — I added the split and the receipt.', messageType: 'TEXT', createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), readAt: new Date().toISOString() },
  { id: 'demo-3', senderId: DEMO_USER_ID, recipientId: 'me', content: 'Perfect, thank you!', messageType: 'TEXT', createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString() },
]

const EMOJI_GROUPS = [
  { name: 'Smileys', icon: '☺️', items: [
    ['😀', 'grinning'], ['😃', 'happy'], ['😄', 'smile'], ['😁', 'beam'], ['😆', 'laugh'], ['😅', 'sweat smile'], ['😂', 'tears joy'], ['🤣', 'rolling laugh'], ['😊', 'blush'], ['😇', 'angel'], ['🙂', 'slight smile'], ['🙃', 'upside down'], ['😉', 'wink'], ['😌', 'relieved'], ['😍', 'heart eyes'], ['🥰', 'hearts'], ['😘', 'kiss'], ['😋', 'yum'], ['😜', 'wink tongue'], ['🤪', 'zany'], ['🤓', 'nerd'], ['😎', 'cool'], ['🥳', 'party'], ['😏', 'smirk'], ['😔', 'sad'], ['😢', 'cry'], ['😭', 'sob'], ['😤', 'triumph'], ['😡', 'angry'], ['🤯', 'mind blown'], ['😱', 'scream'], ['😴', 'sleep'],
  ] },
  { name: 'People', icon: '👋', items: [
    ['👋', 'wave'], ['🤚', 'raised hand'], ['🖐️', 'hand'], ['✋', 'stop'], ['👌', 'okay'], ['🤌', 'pinched'], ['🤞', 'fingers crossed'], ['🫶', 'heart hands'], ['🤟', 'love you'], ['🤘', 'rock'], ['🤙', 'call me'], ['👈', 'left'], ['👉', 'right'], ['👆', 'up'], ['👇', 'down'], ['👍', 'thumbs up'], ['👎', 'thumbs down'], ['✊', 'fist'], ['👏', 'clap'], ['🙌', 'celebrate'], ['👐', 'open hands'], ['🤝', 'handshake'], ['🙏', 'please thanks'], ['💪', 'strong'], ['🫂', 'hug'],
  ] },
  { name: 'Hearts', icon: '❤️', items: [
    ['❤️', 'red heart'], ['🧡', 'orange heart'], ['💛', 'yellow heart'], ['💚', 'green heart'], ['💙', 'blue heart'], ['💜', 'purple heart'], ['🖤', 'black heart'], ['🤍', 'white heart'], ['🤎', 'brown heart'], ['💔', 'broken heart'], ['💕', 'two hearts'], ['💞', 'revolving hearts'], ['💓', 'beating heart'], ['💗', 'growing heart'], ['💖', 'sparkling heart'], ['💘', 'heart arrow'], ['💝', 'heart ribbon'], ['💯', 'hundred'], ['💫', 'dizzy'], ['⭐', 'star'], ['✨', 'sparkles'], ['🔥', 'fire'],
  ] },
  { name: 'Life', icon: '🍕', items: [
    ['🎉', 'party'], ['🎊', 'confetti'], ['🎂', 'cake'], ['🎁', 'gift'], ['🏆', 'trophy'], ['⚽', 'football'], ['🏏', 'cricket'], ['🎮', 'game'], ['🎵', 'music'], ['🎧', 'headphones'], ['📸', 'camera'], ['✈️', 'flight'], ['🏖️', 'beach'], ['🏡', 'home'], ['☕', 'coffee'], ['🍕', 'pizza'], ['🍔', 'burger'], ['🍜', 'noodles'], ['🍿', 'popcorn'], ['🍰', 'dessert'], ['💸', 'money wings'], ['💰', 'money bag'], ['🧾', 'receipt'], ['✅', 'done'],
  ] },
] as const

const STICKERS = [
  { code: 'settled-star', text: 'All settled!' },
  { code: 'tiny-reminder', text: 'Tiny reminder' },
  { code: 'money-dance', text: 'Money dance' },
  { code: 'thank-you', text: 'Thank you!' },
] satisfies Array<{ code: StickerCode; text: string }>

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FS'
}

function avatarUser(conversation: InboxConversation): User {
  return {
    id: conversation.otherUserId,
    name: conversation.otherUserName,
    email: '',
    initials: conversation.otherUserInitials || initials(conversation.otherUserName),
    color: '#8b5cf6',
    avatarUrl: conversation.otherUserAvatarUrl,
  }
}

function timeLabel(value: string) {
  const date = new Date(value)
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  if (minutes < 2880) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function messagePreview(message: ChatMessage) {
  if (message.messageType === 'VOICE') return 'Voice message'
  if (message.messageType === 'STICKER') return 'Sticker'
  return message.content || 'New message'
}

export function ChatsPage({ currentUser, initialContactUserId, onThreadOpenChange, topbar }: ChatsPageProps) {
  const [conversations, setConversations] = useState<InboxConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'favourites'>('all')
  const [draft, setDraft] = useState('')
  const [tray, setTray] = useState<'emoji' | 'sticker' | null>(null)
  const [emojiQuery, setEmojiQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingMs, setRecordingMs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingStartedRef = useRef(0)
  const messagesRef = useRef<HTMLDivElement>(null)
  const audioUrlsRef = useRef<string[]>([])

  const selected = conversations.find((conversation) => conversation.otherUserId === selectedId) ?? null

  useEffect(() => {
    onThreadOpenChange?.(Boolean(selected))
    return () => onThreadOpenChange?.(false)
  }, [onThreadOpenChange, selected])

  useEffect(() => {
    let active = true
    async function loadInbox() {
      setLoading(true)
      let savedContacts: Contact[] = []
      try { savedContacts = await api.contacts.list() } catch { /* local preview can run without an API session */ }
      if (!active) return
      let remote: ChatConversation[] = []
      if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
        try { remote = await api.chats.conversations() } catch (error) { if (active) setStatus(error instanceof Error ? error.message : 'Chats could not be refreshed.') }
      }
      if (!active) return

      const byUser = new Map(savedContacts.filter((contact) => contact.contactUserId).map((contact) => [contact.contactUserId!, contact]))
      const next: InboxConversation[] = remote.map((conversation) => ({ ...conversation, favorite: byUser.get(conversation.otherUserId)?.favorite }))
      for (const contact of savedContacts.filter((entry) => entry.isRegisteredUser && entry.contactUserId)) {
        if (next.some((entry) => entry.otherUserId === contact.contactUserId)) continue
        next.push({
          otherUserId: contact.contactUserId!,
          otherUserName: contact.name,
          otherUserInitials: initials(contact.name),
          unreadCount: 0,
          favorite: contact.favorite,
          latestMessage: { id: `empty-${contact.id}`, senderId: currentUser.id, recipientId: contact.contactUserId!, content: 'Start a private Fairshare chat', messageType: 'TEXT', createdAt: contact.addedAt },
        })
      }
      if (DEMO_ENABLED) {
        next.unshift({
          otherUserId: DEMO_USER_ID,
          otherUserName: 'Maya Shah',
          otherUserInitials: 'MS',
          unreadCount: 1,
          favorite: true,
          demo: true,
          latestMessage: DEMO_MESSAGES[DEMO_MESSAGES.length - 1]!,
        })
      }
      setConversations(next)
      setLoading(false)
    }
    void loadInbox()
    return () => { active = false }
  }, [currentUser.id])

  useEffect(() => {
    if (initialContactUserId && conversations.some((conversation) => conversation.otherUserId === initialContactUserId)) {
      setSelectedId(initialContactUserId)
    }
  }, [conversations, initialContactUserId])

  useEffect(() => {
    if (!selected) { setMessages([]); return }
    const activeConversation = selected
    let active = true
    async function loadThread() {
      if (activeConversation.demo) {
        setMessages(DEMO_MESSAGES.map((message) => ({ ...message, recipientId: message.recipientId === 'me' ? currentUser.id : message.recipientId, senderId: message.senderId === 'me' ? currentUser.id : message.senderId })))
        return
      }
      try {
        const next = await api.chats.list(activeConversation.otherUserId)
        if (!active) return
        const hydrated = await Promise.all(next.map(async (message): Promise<DisplayMessage> => {
          if (message.messageType !== 'VOICE' || !message.hasVoice) return message
          try {
            const blob = await api.chats.voice(message.id)
            const voiceObjectUrl = URL.createObjectURL(blob)
            audioUrlsRef.current.push(voiceObjectUrl)
            return { ...message, voiceObjectUrl }
          } catch { return message }
        }))
        if (active) {
          setMessages(hydrated)
          await api.chats.markRead(activeConversation.otherUserId)
          setConversations((current) => current.map((conversation) => conversation.otherUserId === activeConversation.otherUserId ? { ...conversation, unreadCount: 0 } : conversation))
        }
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : 'This conversation could not be opened.')
      }
    }
    void loadThread()
    const refresh = activeConversation.demo ? undefined : window.setInterval(() => void loadThread(), 8000)
    return () => {
      active = false
      if (refresh) window.clearInterval(refresh)
    }
  }, [selectedId, selected?.demo, selected?.otherUserId, currentUser.id])

  useEffect(() => {
    const messageList = messagesRef.current
    if (messageList) messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingMs(Date.now() - recordingStartedRef.current), 200)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    const matchesQuery = conversation.otherUserName.toLowerCase().includes(query.trim().toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'unread' ? conversation.unreadCount > 0 : conversation.favorite)
    return matchesQuery && matchesFilter
  }), [conversations, filter, query])

  const visibleEmojiGroups = useMemo(() => {
    const needle = emojiQuery.trim().toLowerCase()
    if (!needle) return EMOJI_GROUPS
    return EMOJI_GROUPS.map((group) => ({ ...group, items: group.items.filter(([, name]) => name.includes(needle)) })).filter((group) => group.items.length > 0)
  }, [emojiQuery])

  function optimisticMessage(message: ChatMessage & { voiceObjectUrl?: string }) {
    setMessages((current) => [...current, message])
    setConversations((current) => current.map((conversation) => conversation.otherUserId === message.recipientId ? { ...conversation, latestMessage: message } : conversation))
  }

  async function send(messageType: ChatMessage['messageType'], content = '', stickerCode?: string) {
    if (!selected || (messageType !== 'STICKER' && !content.trim())) return
    setTray(null)
    setDraft('')
    if (selected.demo) {
      optimisticMessage({ id: crypto.randomUUID(), senderId: currentUser.id, recipientId: selected.otherUserId, content: content.trim(), messageType, stickerCode, createdAt: new Date().toISOString() })
      return
    }
    try {
      const message = await api.chats.send(selected.otherUserId, { content: content.trim(), messageType, stickerCode })
      optimisticMessage(message)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Message not sent.') }
  }

  async function sendVoice(audio: Blob, durationMs: number) {
    if (!selected) return
    const voiceObjectUrl = URL.createObjectURL(audio)
    audioUrlsRef.current.push(voiceObjectUrl)
    if (selected.demo) {
      optimisticMessage({ id: crypto.randomUUID(), senderId: currentUser.id, recipientId: selected.otherUserId, content: '', messageType: 'VOICE', voiceDurationMs: durationMs, hasVoice: true, voiceObjectUrl, createdAt: new Date().toISOString() })
      return
    }
    try {
      const message = await api.chats.sendVoice(selected.otherUserId, audio, durationMs)
      optimisticMessage({ ...message, voiceObjectUrl })
    } catch (error) { URL.revokeObjectURL(voiceObjectUrl); setStatus(error instanceof Error ? error.message : 'Voice message not sent.') }
  }

  async function startRecording() {
    setStatus('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('Voice recording is not supported by this browser. It remains available in the installed app.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      streamRef.current = stream
      recorderRef.current = recorder
      recordingStartedRef.current = Date.now()
      setRecordingMs(0)
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        const duration = Math.max(500, Date.now() - recordingStartedRef.current)
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecording(false)
        if (audio.size) void sendVoice(audio, duration)
      }
      recorder.start()
      setRecording(true)
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 60_000)
    } catch {
      setStatus('Microphone access was not granted. Enable it in the app or browser settings to send a voice message.')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  return (
    <main className={`main-panel page-panel chat-page ${selected ? 'chat-page--thread-open' : ''}`} id="top">
      {topbar}
      <div className="content page-content chat-content">
        <section className={`chat-workspace ${selected ? 'is-thread-open' : ''}`}>
          <aside className="chat-inbox" aria-label="Chats">
            <header className="chat-inbox__header"><div><span className="eyebrow">Private. Simple. Shared.</span><h1>Chats</h1><p>Talk with the people already on Fairshare.</p></div><button className="round-action" type="button" title="Start from a Fairshare contact"><CirclePlus size={22} /></button></header>
            <label className="chat-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" /></label>
            <div className="chat-filter-pills" role="tablist">
              {(['all', 'unread', 'favourites'] as const).map((value) => <button type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)} key={value}>{value[0]!.toUpperCase() + value.slice(1)}</button>)}
            </div>
            <div className="chat-inbox__list">
              {loading && <div className="chat-list-state"><MessageCircle size={22} /><span>Loading conversations…</span></div>}
              {!loading && visibleConversations.map((conversation) => {
                const active = selectedId === conversation.otherUserId
                return <button className={`chat-conversation-row ${active ? 'is-active' : ''}`} type="button" onClick={() => { setSelectedId(conversation.otherUserId); setTray(null); setStatus('') }} key={conversation.otherUserId}>
                  <span className="chat-avatar-wrap"><Avatar user={avatarUser(conversation)} size="large" />{conversation.unreadCount > 0 && <i />}</span>
                  <span className="chat-conversation-row__copy"><strong>{conversation.otherUserName}{conversation.demo && <small>Demo</small>}</strong><span>{messagePreview(conversation.latestMessage)}</span></span>
                  <span className="chat-conversation-row__meta"><time>{timeLabel(conversation.latestMessage.createdAt)}</time>{conversation.unreadCount > 0 ? <b>{conversation.unreadCount}</b> : conversation.favorite ? <Heart size={13} fill="currentColor" /> : null}</span>
                </button>
              })}
              {!loading && visibleConversations.length === 0 && <div className="chat-list-state"><MessageCircle size={24} /><strong>No conversations here</strong><span>Add an app contact or change this filter.</span></div>}
            </div>
          </aside>

          <section className="chat-thread" aria-label={selected ? `Conversation with ${selected.otherUserName}` : 'Select a conversation'}>
            {!selected ? <div className="chat-thread-empty"><span><MessageCircle size={34} /></span><h2>Your conversations, together</h2><p>Select a Fairshare contact to start chatting. Messages stay between the two of you.</p></div> : <>
              <header className="chat-thread__header">
                <button className="chat-thread__back" type="button" onClick={() => setSelectedId(null)} aria-label="Back to chats"><ArrowLeft size={21} /></button>
                <Avatar user={avatarUser(selected)} />
                <div><strong>{selected.otherUserName}</strong><span>{selected.demo ? 'Demo conversation · easy to remove' : 'Fairshare contact'}</span></div>
                <div className="chat-thread__future-actions" aria-label="Calling is planned for a future release"><button type="button" disabled title="Voice calling coming later"><Phone size={19} /></button><button type="button" disabled title="Video calling coming later"><Video size={20} /></button><button type="button" title="Conversation options"><MoreHorizontal size={20} /></button></div>
              </header>
              <div className="chat-thread__messages" ref={messagesRef}>
                <div className="chat-date-chip">Today</div>
                {messages.map((message) => {
                  const mine = message.senderId === currentUser.id
                  const sticker = STICKERS.find((entry) => entry.code === message.stickerCode)
                  return <div className={`chat-message ${mine ? 'is-mine' : ''}`} key={message.id}>
                    {!mine && <Avatar user={avatarUser(selected)} />}
                    <div className={`chat-message__bubble ${message.messageType === 'STICKER' ? 'is-sticker' : ''} ${message.messageType === 'VOICE' ? 'is-voice' : ''}`}>
                      {message.messageType === 'STICKER' && sticker ? <div className="chat-sticker-message"><StickerArtwork code={sticker.code} /><strong>{sticker.text}</strong><span className="chat-message__time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <CheckCheck size={13} />}</span></div>
                        : message.messageType === 'VOICE' ? <div className="voice-message"><button type="button" aria-label="Voice message"><Mic size={17} /></button>{message.voiceObjectUrl ? <audio controls preload="metadata" src={message.voiceObjectUrl} /> : <span>Voice message unavailable</span>}<small>{Math.ceil((message.voiceDurationMs ?? 0) / 1000)}s</small></div>
                          : <p>{message.content}</p>}
                      {message.messageType !== 'STICKER' && <span className="chat-message__time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <CheckCheck size={13} />}</span>}
                    </div>
                  </div>
                })}
              </div>

              {status && <div className="chat-status" role="status">{status}<button type="button" onClick={() => setStatus('')}>×</button></div>}
              {tray === 'emoji' && <EmojiTray query={emojiQuery} onQuery={setEmojiQuery} groups={visibleEmojiGroups} onChoose={(emoji) => setDraft((current) => current + emoji)} />}
              {tray === 'sticker' && <div className="chat-sticker-tray">{STICKERS.map((sticker) => <button type="button" onClick={() => void send('STICKER', sticker.text, sticker.code)} key={sticker.code}><StickerArtwork code={sticker.code} size={54} /><strong>{sticker.text}</strong></button>)}</div>}

              <footer className="chat-composer-bar">
                {recording ? <div className="chat-recording"><span className="chat-recording__pulse" /><div><strong>Recording voice message</strong><small>{Math.floor(recordingMs / 1000)}s / 60s</small></div><button type="button" onClick={stopRecording}><Square size={17} fill="currentColor" /> Send</button></div> : <>
                  <button className="chat-composer-bar__add" type="button" title="Attachments are reserved for a future release"><CirclePlus size={21} /></button>
                  <div className="chat-composer-bar__input">
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send('TEXT', draft) } }} rows={1} placeholder="Message…" />
                    <button type="button" onClick={() => setTray((current) => current === 'emoji' ? null : 'emoji')} aria-label="Choose emoji"><Laugh size={20} /></button>
                    <button type="button" onClick={() => setTray((current) => current === 'sticker' ? null : 'sticker')} aria-label="Choose sticker"><Sparkles size={19} /></button>
                    <button type="button" title="Photo sharing is reserved for a future release"><ImageIcon size={19} /></button>
                  </div>
                  {draft.trim() ? <button className="chat-send-button" type="button" onClick={() => void send('TEXT', draft)} aria-label="Send message"><Send size={19} /></button> : <button className="chat-send-button" type="button" onClick={() => void startRecording()} aria-label="Record voice message"><Mic size={20} /></button>}
                </>}
              </footer>
            </>}
          </section>
        </section>
      </div>
    </main>
  )
}

function EmojiTray({ query, onQuery, groups, onChoose }: { query: string; onQuery: (value: string) => void; groups: ReadonlyArray<{ name: string; icon: string; items: ReadonlyArray<readonly [string, string]> }>; onChoose: (emoji: string) => void }) {
  return <section className="emoji-tray" aria-label="Emoji picker">
    <label><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search emoji" /></label>
    <div className="emoji-tray__scroll">
      {groups.map((group) => <div className="emoji-group" key={group.name}><h3>{group.name}</h3><div>{group.items.map(([emoji, name]) => <button type="button" title={name} onClick={() => onChoose(emoji)} key={`${group.name}-${emoji}`}><span>{emoji}</span></button>)}</div></div>)}
      {groups.length === 0 && <p>No emoji matches that search.</p>}
    </div>
    <nav>{EMOJI_GROUPS.map((group) => <span title={group.name} key={group.name}>{group.icon}</span>)}</nav>
  </section>
}
