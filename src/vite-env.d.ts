/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_REDIRECT_URL?: string
  readonly VITE_NATIVE_AUTH_REDIRECT_URL?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@capacitor/contacts' {
  export interface ContactPhoneNumber {
    value?: string
    pref?: boolean
  }
  export interface ContactPayload {
    displayName?: string
    name?: {
      formatted?: string
      givenName?: string
      familyName?: string
    }
    phoneNumbers?: ContactPhoneNumber[]
  }
  export const Contacts: {
    pickContact: () => Promise<ContactPayload>
  }
}
