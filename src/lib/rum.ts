import { api } from './api'

export function recordRum(eventName: string, path = window.location.pathname, metadata: Record<string, any> = {}) {
  try {
    const start = performance.now()
    void api.admin.recordRum({
      eventName,
      path,
      durationMs: Math.round(performance.now() - start),
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {
      // ignore network errors for telemetry
    })
  } catch {
    // ignore
  }
}
