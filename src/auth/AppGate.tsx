import { useState } from 'react'
import { WalletCards } from 'lucide-react'
import App from '../App'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { CreateAccountFlow } from './CreateAccountFlow'

export function AppGate() {
  const { user, loading } = useAuth()
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [authNotice, setAuthNotice] = useState('')

  if (loading) {
    return <main className="auth-splash"><span><WalletCards size={27} /></span><strong>fairshare</strong><i /></main>
  }
  if (user) return <App />
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
  return <LoginPage notice={authNotice} onCreateAccount={() => { setAuthNotice(''); setCreatingAccount(true) }} />
}
