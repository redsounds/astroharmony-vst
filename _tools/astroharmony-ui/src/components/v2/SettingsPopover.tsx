
import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  /** Page-coordinate top/right of the settings button so the popover anchors to it. */
  anchorRight: number
  anchorTop: number
}

export default function SettingsPopover({ open, onClose, anchorRight, anchorTop }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // Defer so the click that opened us doesn't also close us.
    const id = setTimeout(() => window.addEventListener('mousedown', onDown), 0)
    return () => { clearTimeout(id); window.removeEventListener('mousedown', onDown) }
  }, [open, onClose])

  // Close on Esc.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: anchorTop,
        right: anchorRight,
        width: 360,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        background: 'var(--cc-bg-panel)',
        border: '1px solid var(--cc-border)',
        borderRadius: 10,
        padding: '.95rem 1rem',
        zIndex: 50,
        boxShadow: '0 10px 32px rgba(0,0,0,.45)',
        fontFamily: 'DM Sans, sans-serif',
        color: 'var(--cc-text)',
      }}
    >
      <div style={titleRow}>
        <span style={titleText}>About</span>
        <button onClick={onClose} style={closeBtn} aria-label="Close">×</button>
      </div>

      <div style={appTitle}>AstroHarmony</div>
      <div style={tagline}>Chord-progression composer for film scoring.</div>

      <div style={sectionLabel}>Sample Attributions</div>

      <Credit
        name="Salamander Grand Piano V3"
        author="Alexander Holm"
        license="CC0 / Public Domain"
        notes="Used for Grand Piano. No attribution required, included for completeness."
      />

      <Credit
        name="University of Iowa Electronic Music Studios (MIS)"
        author="University of Iowa"
        license="Public Domain"
        notes="Used for Flute and Trumpet. theremin.music.uiowa.edu"
      />

      <Credit
        name="VSCO 2 Community Edition"
        author="Versilian Studios — Sam Gossner"
        license="CC-BY 4.0"
        notes="Used for Strings. Attribution required. github.com/sgossner/VSCO-2-CE"
      />

      <div style={sectionLabel}>Open-source libraries</div>
      <div style={libBlock}>
        Next.js · React · Tone.js · Tonal.js · Zustand · @dnd-kit · Tailwind CSS
      </div>

      <div style={footer}>
        <span>© 2026 Astrotone Audio</span>
      </div>
    </div>
  )
}

function Credit({ name, author, license, notes }: { name: string; author: string; license: string; notes?: string }) {
  return (
    <div style={creditBlock}>
      <div style={creditName}>{name}</div>
      <div style={creditMeta}>{author} · <span style={{ color: 'var(--cc-accent)', fontWeight: 600 }}>{license}</span></div>
      {notes && <div style={creditNotes}>{notes}</div>}
    </div>
  )
}

const titleRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 4,
}
const titleText: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.22em', fontWeight: 600,
  color: 'var(--cc-text-mute)',
}
const closeBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5,
  background: 'transparent', border: 'none',
  color: 'var(--cc-text-dim)', cursor: 'pointer',
  fontSize: 18, lineHeight: 1, padding: 0,
}
const appTitle: React.CSSProperties = {
  fontFamily: 'var(--font-fraunces)', fontSize: 18, fontWeight: 500,
  letterSpacing: '.04em', marginTop: 2,
}
const tagline: React.CSSProperties = {
  fontSize: 11, color: 'var(--cc-text-dim)', marginTop: 4, marginBottom: 18,
}
const sectionLabel: React.CSSProperties = {
  fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase',
  color: 'var(--cc-text-mute)', fontWeight: 600,
  marginTop: 14, marginBottom: 8,
}
const creditBlock: React.CSSProperties = {
  padding: '.55rem .65rem',
  background: 'var(--cc-bg-elev)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 7,
  marginBottom: 6,
}
const creditName: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--cc-text)',
}
const creditMeta: React.CSSProperties = {
  fontSize: 10.5, color: 'var(--cc-text-dim)', marginTop: 2,
}
const creditNotes: React.CSSProperties = {
  fontSize: 10, color: 'var(--cc-text-mute)', marginTop: 4, lineHeight: 1.4,
}
const libBlock: React.CSSProperties = {
  fontSize: 11, color: 'var(--cc-text-dim)', lineHeight: 1.55,
  padding: '.45rem .65rem',
  background: 'var(--cc-bg-elev)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 7,
}
const footer: React.CSSProperties = {
  marginTop: 16, paddingTop: 10,
  borderTop: '1px solid var(--cc-border-soft)',
  fontSize: 10, color: 'var(--cc-text-mute)',
  display: 'flex', justifyContent: 'space-between',
}
