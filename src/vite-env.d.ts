/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_REDIRECT_URL?: string
  readonly VITE_NATIVE_AUTH_REDIRECT_URL?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
