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

  // Show splash screen for exactly 2 seconds or until user interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDismissed(true)
    }, 2000)

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

  // 1. Show the splash screen for the initial 2s
  if (!splashDismissed) {
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

  // 2. If user is authenticated
  if (user) {
    const isFirstTimeUser = !user.onboardingStep || user.onboardingStep !== 'done' || !user.phone
    const needsOnboarding = !onboardingBypassed && isFirstTimeUser
    if (needsOnboarding) {
      return <OnboardingFlow user={user} onComplete={() => setOnboardingBypassed(true)} />
    }
    return <App />
  }

  // 3. If splash dismissed and user is not authenticated, show login
  return <LoginPage />
}
