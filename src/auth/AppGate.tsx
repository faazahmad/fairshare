import { WalletCards } from 'lucide-react'
import App from '../App'
import { useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'

export function AppGate() {
  const { user, loading } = useAuth()
  if (loading) {
    return <main className="auth-splash"><span><WalletCards size={27} /></span><strong>fairshare</strong><i /></main>
  }
  return user ? <App /> : <LoginPage />
}
