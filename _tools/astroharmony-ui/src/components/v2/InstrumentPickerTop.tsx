
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'

type InstrumentLite = { id: string; label: string; category: string }

// Inline SVG icons — Unicode emoji used to work but the flute glyph 🪈 was
// added in Unicode 14 (Sep 2021), so older Windows 10 builds without the
// updated Segoe UI Emoji font render it as a tofu box. SVG sidesteps the
// font dependency entirely.
function InstrumentIcon({ id, category, size = 22 }: { id: string; category: string; size?: number }) {
  const key = id in INSTRUMENT_SVG ? id : CATEGORY_TO_INSTRUMENT[category] ?? 'piano'
  const path = INSTRUMENT_SVG[key]
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

const CATEGORY_TO_INSTRUMENT: Record<string, string> = {
  keys: 'piano',
  strings: 'strings',
  woodwinds: 'flute',
  brass: 'trumpet',
}

// Minimal line-art glyphs — recognisable at 16-24 px, render identically on
// every platform.
const INSTRUMENT_SVG: Record<string, React.ReactNode> = {
  // Piano — keybed with three black keys.
  piano: (
    <>
      <rect x="3" y="7" width="18" height="11" rx="1" />
      <line x1="8" y1="7" x2="8" y2="18" />
      <line x1="13" y1="7" x2="13" y2="18" />
      <line x1="18" y1="7" x2="18" y2="18" />
      <rect x="6" y="7" width="2.5" height="6" fill="currentColor" stroke="none" />
      <rect x="11" y="7" width="2.5" height="6" fill="currentColor" stroke="none" />
      <rect x="16" y="7" width="2.5" height="6" fill="currentColor" stroke="none" />
    </>
  ),
  // Violin — pear body + neck + scroll.
  strings: (
    <>
      <path d="M9 14c0 2.5 1.5 4 3 4s3-1.5 3-4-1.5-4-3-4-3 1.5-3 4z" />
      <line x1="12" y1="10" x2="12" y2="4" />
      <line x1="10.5" y1="10" x2="10.5" y2="5" />
      <line x1="13.5" y1="10" x2="13.5" y2="5" />
      <path d="M10.5 4.5c0-.6.7-1 1.5-1s1.5.4 1.5 1" />
    </>
  ),
  // Flute — long tube with finger holes.
  flute: (
    <>
      <line x1="3.5" y1="14" x2="20.5" y2="10" />
      <circle cx="7" cy="13" r=".9" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12.3" r=".9" fill="currentColor" stroke="none" />
      <circle cx="13" cy="11.6" r=".9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10.9" r=".9" fill="currentColor" stroke="none" />
      <path d="M3.5 14l-.7-.7v1.4z" fill="currentColor" stroke="none" />
    </>
  ),
  // Trumpet — bell + valve cluster + mouthpiece.
  trumpet: (
    <>
      <path d="M2 12h11l5-3v6l-5-3" />
      <rect x="7" y="9" width="1.4" height="6" />
      <rect x="9.5" y="9" width="1.4" height="6" />
      <rect x="12" y="9" width="1.4" height="6" />
      <circle cx="2" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
}

const CATEGORY_LABEL: Record<string, string> = {
  keys: 'Keys',
  strings: 'Strings',
  woodwinds: 'Woodwinds',
  brass: 'Brass',
}

export default function InstrumentPickerTop() {
  const activeInstrument = useStore(s => s.activeInstrument)
  const setActiveInstrument = useStore(s => s.setActiveInstrument)
  const [instruments, setInstruments] = useState<InstrumentLite[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    import('@/lib/instruments').then(m => {
      if (active) setInstruments(m.INSTRUMENTS.map(i => ({ id: i.id, label: i.label, category: i.category })))
    })
    return () => { active = false }
  }, [])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const current = instruments.find(i => i.id === activeInstrument)

  // Group by category for the popover.
  const byCategory: Record<string, InstrumentLite[]> = {}
  for (const i of instruments) (byCategory[i.category] ??= []).push(i)
  const order = ['keys', 'strings', 'woodwinds', 'brass']

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Choose instrument"
        style={pillBtn}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1, color: 'var(--cc-text-dim)' }}>
          {current
            ? <InstrumentIcon id={current.id} category={current.category} size={16} />
            : <InstrumentIcon id="piano" category="keys" size={16} />}
        </span>
        <span>{current?.label ?? 'Instrument'}</span>
        <span style={{ opacity: .55 }}>▾</span>
      </button>

      {open && (
        <div style={popover} onClick={(e) => e.stopPropagation()}>
          {order.flatMap(cat => {
            const items = byCategory[cat]
            if (!items?.length) return []
            return [
              <div key={cat + '-h'} style={catHeader}>{CATEGORY_LABEL[cat] ?? cat}</div>,
              <div key={cat + '-row'} style={iconRow}>
                {items.map(i => {
                  const isActive = i.id === activeInstrument
                  return (
                    <button
                      key={i.id}
                      onClick={() => { setActiveInstrument(i.id); setOpen(false) }}
                      style={{
                        ...iconTile,
                        background: isActive ? 'var(--cc-accent)' : 'var(--cc-bg-elev)',
                        color: isActive ? '#fff' : 'var(--cc-text)',
                        borderColor: isActive ? 'var(--cc-accent)' : 'var(--cc-border-soft)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
                        <InstrumentIcon id={i.id} category={i.category} size={22} />
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{i.label}</span>
                    </button>
                  )
                })}
              </div>,
            ]
          })}
        </div>
      )}
    </div>
  )
}

const pillBtn: React.CSSProperties = {
  height: 34, padding: '0 .7rem 0 .55rem', borderRadius: 8,
  background: 'var(--cc-bg-elev)', border: '1px solid var(--cc-border-soft)',
  color: 'var(--cc-text)', cursor: 'pointer',
  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  display: 'flex', alignItems: 'center', gap: 8,
  minWidth: 0,
}

const popover: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 6px)', left: 0,
  background: 'var(--cc-bg-panel)',
  border: '1px solid var(--cc-border)',
  borderRadius: 10, padding: '.65rem .7rem',
  display: 'flex', flexDirection: 'column', gap: 6,
  minWidth: 280, zIndex: 40,
  boxShadow: '0 8px 24px rgba(0,0,0,.35)',
}

const catHeader: React.CSSProperties = {
  fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
  color: 'var(--cc-text-mute)', fontWeight: 600,
  marginTop: 2,
}

const iconRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
  gap: 6,
}

const iconTile: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 4, padding: '.55rem .3rem', borderRadius: 8,
  border: '1px solid var(--cc-border-soft)', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  transition: '.12s',
}
