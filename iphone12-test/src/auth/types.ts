export type SocialProvider = 'google' | 'apple' | 'github'

export interface AuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: 'email' | SocialProvider
  isDemo: boolean
}

export interface AuthActionResult {
  message?: string
}
