export type StickerCode = 'settled-star' | 'tiny-reminder' | 'money-dance' | 'thank-you'

export function StickerArtwork({ code, size = 72 }: { code: StickerCode; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 96 96', role: 'img' as const, 'aria-hidden': true }
  if (code === 'settled-star') return <svg {...common} className="sticker-artwork" fill="none">
    <defs><linearGradient id="settledFill" x1="16" y1="12" x2="82" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD95A"/><stop offset=".48" stopColor="#FF8A5B"/><stop offset="1" stopColor="#7C5CFC"/></linearGradient><filter id="settledGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path d="m48 7 8.2 25.8L82 41l-25.8 8.2L48 75 39.8 49.2 14 41l25.8-8.2L48 7Z" fill="url(#settledFill)" stroke="#FFF4C9" strokeWidth="3" filter="url(#settledGlow)"/>
    <path d="m35 42 8 8 18-19" stroke="#17120B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m74 15 2.4 7.6L84 25l-7.6 2.4L74 35l-2.4-7.6L64 25l7.6-2.4L74 15Z" fill="#7CF3D4" stroke="#EFFFFA" strokeWidth="2"/>
    <circle cx="22" cy="70" r="6" fill="#FF6B57" stroke="#FFD7D0" strokeWidth="2"/>
  </svg>
  if (code === 'tiny-reminder') return <svg {...common} className="sticker-artwork" fill="none">
    <defs><linearGradient id="clockFill" x1="18" y1="12" x2="78" y2="82" gradientUnits="userSpaceOnUse"><stop stopColor="#79F2C0"/><stop offset="1" stopColor="#25C2FF"/></linearGradient></defs>
    <path d="M30 18 20 29M66 18l10 11" stroke="#EAFEF8" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="48" cy="51" r="31" fill="url(#clockFill)" stroke="#E9FFFA" strokeWidth="4"/>
    <path d="M48 32v21l14 8" stroke="#102A2B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35 82h26" stroke="#EAFEF8" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="72" cy="68" r="13" fill="#FF6B57" stroke="#FFF" strokeWidth="3"/><path d="M72 61v8M72 74v1" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
  if (code === 'money-dance') return <svg {...common} className="sticker-artwork" fill="none">
    <defs><linearGradient id="moneyFill" x1="15" y1="12" x2="81" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#A78BFA"/><stop offset=".5" stopColor="#FF6B8A"/><stop offset="1" stopColor="#FFB347"/></linearGradient></defs>
    <circle cx="49" cy="20" r="10" fill="#FFD3A6" stroke="#FFF2E4" strokeWidth="3"/>
    <path d="M38 34c7-5 18-4 23 2l7 15-11 5-5-10-1 18 14 17-9 8-13-16-9 16-10-7 13-19-3-16-8 10-11-6 13-17Z" fill="url(#moneyFill)" stroke="#FFF" strokeWidth="3" strokeLinejoin="round"/>
    <path d="m16 20 9 2 3 9M80 30l-9 2-3 9" stroke="#7CF3D4" strokeWidth="4" strokeLinecap="round"/>
    <rect x="64" y="8" width="21" height="13" rx="3" fill="#66E2A5" stroke="#EFFFF8" strokeWidth="2" transform="rotate(12 64 8)"/><path d="M73 12c4-1 6 5 1 7" stroke="#145C43" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
  return <svg {...common} className="sticker-artwork" fill="none">
    <defs><linearGradient id="heartFill" x1="18" y1="16" x2="78" y2="82" gradientUnits="userSpaceOnUse"><stop stopColor="#FF8F70"/><stop offset=".5" stopColor="#FF4F87"/><stop offset="1" stopColor="#8B5CF6"/></linearGradient></defs>
    <path d="M48 84S14 64 14 36c0-14 17-22 28-11l6 7 6-7c11-11 28-3 28 11 0 28-34 48-34 48Z" fill="url(#heartFill)" stroke="#FFEAF1" strokeWidth="4"/>
    <path d="M29 49c3-8 10-12 19-12s16 4 19 12" stroke="#FFF" strokeWidth="5" strokeLinecap="round" opacity=".9"/>
    <path d="M37 55c6 5 16 5 22 0" stroke="#29192D" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="34" cy="43" r="3" fill="#29192D"/><circle cx="62" cy="43" r="3" fill="#29192D"/>
    <path d="m72 13 2.2 7L81 22l-6.8 2L72 31l-2.2-7L63 22l6.8-2L72 13Z" fill="#FFD95A" stroke="#FFF6CD" strokeWidth="2"/>
  </svg>
}
