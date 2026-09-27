import { useEffect, useState } from 'react'
import { WalletCards } from 'lucide-react'
import App from '../App'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { OnboardingFlow } from './OnboardingFlow'

export function AppGate() {
  const { user, loading } = useAuth()
  const [onboardingBypassed, setOnboardingBypassed] = useState(false)
  const [splashDismissed, setSplashDismissed] = useState(false)

  // Redirect to authentication page on first touch or after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDismissed(true)
    }, 3000)

    const handleTouchOrClick = () => {
      setSplashDismissed(true)
    }

    window.addEventListener('click', handleTouchOrClick, { once: true })
    window.addEventListener('touchstart', handleTouchOrClick, { once: true })
    window.addEventListener('pointerdown', handleTouchOrClick, { once: true })
    window.addEventListener('keydown', handleTouchOrClick, { once: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handleTouchOrClick)
      window.removeEventListener('touchstart', handleTouchOrClick)
      window.removeEventListener('pointerdown', handleTouchOrClick)
      window.removeEventListener('keydown', handleTouchOrClick)
    }
  }, [])

  // If user is already authenticated (e.g. from Google OAuth callback)
  if (user) {
    const isFirstTimeUser = !user.onboardingStep || user.onboardingStep !== 'done' || !user.phone
    const needsOnboarding = !onboardingBypassed && isFirstTimeUser
    if (needsOnboarding) {
      return <OnboardingFlow user={user} onComplete={() => setOnboardingBypassed(true)} />
    }
    return <App />
  }

  // If not yet dismissed (less than 3 seconds and no user touch) or still initializing initial auth
  if (loading || !splashDismissed) {
    return (
      <main
        className="auth-splash"
        onClick={() => setSplashDismissed(true)}
        onTouchStart={() => setSplashDismissed(true)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Tap to continue"
      >
        <span><WalletCards size={27} /></span>
        <strong>fairshare</strong>
        <i />
      </main>
    )
  }

  // Render authentication page
  return <LoginPage />
}
