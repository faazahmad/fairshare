export type SocialProvider = 'google' | 'apple' | 'github'

export interface AuthProfile {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  avatarUrl?: string
  phone?: string
  phoneVerified?: boolean
  emailVerified?: boolean
  termsAccepted?: boolean
  profileReviewed?: boolean
  onboardingStep?: string
  provider: 'email' | SocialProvider
  isDemo: boolean
}

export type OtpPurpose = 'SIGN_IN' | 'SIGN_UP'

export interface OtpDispatch {
  phone: string
  expiresInSeconds: number
  devCode?: string | null
}

export interface PhoneVerificationResult {
  verified: boolean
  registrationRequired: boolean
  phone: string
  verificationToken?: string | null
}

export interface AuthActionResult {
  message?: string
}
