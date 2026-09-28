import { ArrowDownLeft, ArrowUpRight, Sparkles, WalletCards } from 'lucide-react'

interface HomeLoadingPageProps {
  leaving?: boolean
}

export function HomeLoadingPage({ leaving = false }: HomeLoadingPageProps) {
  return (
    <main className={`home-loading-page${leaving ? ' is-leaving' : ''}`} aria-label="Fairshare is loading">
      <div className="hlp-atmosphere" aria-hidden="true">
        <i className="hlp-orbit hlp-orbit--one" />
        <i className="hlp-orbit hlp-orbit--two" />
        <i className="hlp-glow" />
        <span className="hlp-star hlp-star--one" />
        <span className="hlp-star hlp-star--two" />
        <span className="hlp-star hlp-star--three" />
      </div>

      <header className="hlp-brand">
        <span><WalletCards size={23} /></span>
        <strong>fairshare</strong>
      </header>

      <section className="hlp-message">
        <span className="hlp-kicker"><Sparkles size={13} /> Shared money, in sync</span>
        <h1>Good moments.<br />Clear balances.</h1>
        <p>Trips, dinners, rent and everything shared—flowing into one calm place.</p>
      </section>

      <section className="hlp-balance" aria-label="Fairshare balance preview">
        <header>
          <div className="hlp-avatars" aria-hidden="true"><i>RK</i><i>MS</i><i>+</i></div>
          <div><small>Weekend away</small><strong>Everyone is in sync</strong></div>
          <span>Live</span>
        </header>
        <div className="hlp-balance__amount">
          <small>Your shared balance</small>
          <strong>₹0</strong>
          <span>all clear</span>
        </div>
        <div className="hlp-flow" aria-hidden="true">
          <span><ArrowUpRight size={13} /> lent</span>
          <i><b /></i>
          <span><ArrowDownLeft size={13} /> split</span>
        </div>
      </section>

      <footer className="hlp-footer" role="status" aria-live="polite">
        <div><i /></div>
        <span>Preparing your shared space</span>
      </footer>
    </main>
  )
}

