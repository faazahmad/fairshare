import { ArrowRight, BellRing, MessageCircleMore, ReceiptText, Sparkles } from 'lucide-react'

interface WelcomeDialogProps {
  name: string
  onClose: () => void
}

export function WelcomeDialog({ name, onClose }: WelcomeDialogProps) {
  const firstName = name.trim().split(/\s+/)[0] || 'there'
  return (
    <div className="modal-backdrop welcome-dialog-backdrop" role="presentation">
      <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <span className="welcome-dialog__mark"><Sparkles size={25} /></span>
        <p className="eyebrow">Your account is ready</p>
        <h2 id="welcome-title">Welcome to Fairshare, {firstName}.</h2>
        <p className="welcome-dialog__lead">Everything is set. Start with a split, bring in your people, or simply look around.</p>
        <div className="welcome-dialog__features">
          <span><ReceiptText size={18} /><i><strong>Create a split</strong><small>Keep every shared expense clear.</small></i></span>
          <span><MessageCircleMore size={18} /><i><strong>Connect and chat</strong><small>Plan with friends already on Fairshare.</small></i></span>
          <span><BellRing size={18} /><i><strong>Gentle reminders</strong><small>Follow up without the awkwardness.</small></i></span>
        </div>
        <button className="button button--primary welcome-dialog__action" type="button" onClick={onClose}>Start sharing <ArrowRight size={17} /></button>
      </section>
    </div>
  )
}
