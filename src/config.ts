// -----------------------------------------------------------------------------
// Centralised runtime configuration.
//
// All backend endpoints are driven by the VITE_API_BASE_URL environment
// variable (defined in `.env`). No localhost URLs are hard-coded in source.
// Point it at your deployed backend, e.g. https://api.yourdomain.com/api/v1
// -----------------------------------------------------------------------------

const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

let normalizedApiBaseUrl = envUrl

if (normalizedApiBaseUrl) {
  // Ensure /api/v1 suffix is present and not duplicated
  if (!normalizedApiBaseUrl.endsWith('/api/v1')) {
    normalizedApiBaseUrl = `${normalizedApiBaseUrl}/api/v1`
  }
} else if (import.meta.env.DEV) {
  // Convenient default during local development
  normalizedApiBaseUrl = 'http://localhost:8080/api/v1'
} else {
  console.warn(
    '[config] VITE_API_BASE_URL is not set. Add it to your `.env` or deployment environment (e.g. VITE_API_BASE_URL=https://api.yourdomain.com/api/v1).',
  )
}

/** Base origin + /api/v1 used by all REST calls. */
export const API_BASE_URL = normalizedApiBaseUrl

/** WebSocket base URL derived from the REST base URL (http -> ws, https -> wss). */
export const WS_BASE_URL = normalizedApiBaseUrl
  ? normalizedApiBaseUrl
      .replace(/\/api\/v1$/, '')
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
  : ''