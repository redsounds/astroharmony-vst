
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'

type InstrumentLite = { id: string; label: string; category: string }

// Emoji icon per instrument id. Falls back to category icon.
const ICON: Record<string, string> = {
  piano: '🎹',
  strings: '🎻',
  flute: '🪈',
  trumpet: '🎺',
}
const CATEGORY_ICON: Record<string, string> = {
  keys: '🎹',
  strings: '🎻',
  woodwinds: '🪈',
  brass: '🎺',
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
  const icon = (id: string, cat: string) => ICON[id] ?? CATEGORY_ICON[cat] ?? '🎵'

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
        <span style={{ fontSize: 16, lineHeight: 1 }}>{current ? icon(current.id, current.category) : '🎵'}</span>
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
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon(i.id, i.category)}</span>
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
