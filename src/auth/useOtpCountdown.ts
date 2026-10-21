import { useEffect, useMemo, useState } from 'react'

export function useOtpCountdown() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    if (expiresAt === null) return
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  return useMemo(() => ({
    remainingSeconds,
    expired: expiresAt !== null && remainingSeconds === 0,
    formatted: `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`,
    start: (seconds: number) => setExpiresAt(Date.now() + Math.max(300, seconds) * 1000),
    clear: () => { setExpiresAt(null); setRemainingSeconds(0) },
  }), [expiresAt, remainingSeconds])
}
