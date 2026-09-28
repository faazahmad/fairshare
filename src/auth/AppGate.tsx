import { useEffect, useState } from 'react'
import { WalletCards } from 'lucide-react'
import App from '../App'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { CreateAccountFlow } from './CreateAccountFlow'
import { HomeLoadingPage } from './HomeLoadingPage'
import { isNativeExperience, shouldHoldNativeIntro } from './platform'

export function AppGate() {
  const { user, loading } = useAuth()
  const [nativeExperience] = useState(isNativeExperience)
  const [showNativeIntro, setShowNativeIntro] = useState(nativeExperience)
  const [nativeIntroLeaving, setNativeIntroLeaving] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    if (!nativeExperience || shouldHoldNativeIntro()) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const leaveAfter = reducedMotion ? 260 : 1650
    const finishAfter = reducedMotion ? 320 : 2050
    const leaveTimer = window.setTimeout(() => setNativeIntroLeaving(true), leaveAfter)
    const finishTimer = window.setTimeout(() => setShowNativeIntro(false), finishAfter)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(finishTimer)
    }
  }, [nativeExperience])

  if (showNativeIntro) return <HomeLoadingPage leaving={nativeIntroLeaving} />
  if (loading) {
    return <main className="auth-splash"><span><WalletCards size={27} /></span><strong>fairshare</strong><i /></main>
  }
  if (user) return <App nativeExperience={nativeExperience} />
  if (creatingAccount) {
    return (
      <CreateAccountFlow
        onBack={() => setCreatingAccount(false)}
        onComplete={(message) => {
          setAuthNotice(message ?? 'Your account is ready. Sign in to continue.')
          setCreatingAccount(false)
        }}
      />
    )
  }
  return <LoginPage nativeExperience={nativeExperience} notice={authNotice} onCreateAccount={() => { setAuthNotice(''); setCreatingAccount(true) }} />
}
