import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert, WalletCards } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fairshare could not render the current screen.', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    const isChunkFailure = /dynamically imported module|loading chunk|failed to fetch/i.test(this.state.error.message)

    return (
      <main className="app-error" role="alert">
        <div className="app-error__brand"><WalletCards size={22} /><strong>fairshare</strong></div>
        <section className="app-error__card">
          <span className="app-error__icon"><TriangleAlert size={25} /></span>
          <p className="eyebrow">We hit a loading problem</p>
          <h1>{isChunkFailure ? 'The app update did not finish loading.' : 'Fairshare could not open this screen.'}</h1>
          <p>{isChunkFailure ? 'The development server may have restarted or an older browser tab may be open.' : 'Your account data is safe. Reload the app to retry this screen.'}</p>
          <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
            <RefreshCw size={17} /> Reload Fairshare
          </button>
        </section>
      </main>
    )
  }
}
