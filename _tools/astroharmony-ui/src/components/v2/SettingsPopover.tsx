
import { useEffect, useRef, useState } from 'react'
import { callNative, inJuce } from '@/jucebridge'

interface Props {
  open: boolean
  onClose: () => void
  /** Page-coordinate top/right of the settings button so the popover anchors to it. */
  anchorRight: number
  anchorTop: number
}

interface BuildInfo {
  version?: string
  buildDate?: string
  juceVersion?: string
  sampleRate?: number
  subPhase?: string
}

export default function SettingsPopover({ open, onClose, anchorRight, anchorTop }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [info, setInfo] = useState<BuildInfo | null>(null)

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

  // Pull live build info from C++ each time we open — sample rate can
  // change when the DAW changes its project sample rate, so reading on
  // every open is cheaper than subscribing to a push event.
  useEffect(() => {
    if (!open || !inJuce()) return
    let cancelled = false
    void callNative<BuildInfo>('getBuildInfo').then(res => {
      if (!cancelled && res && typeof res === 'object') setInfo(res)
    }).catch(() => { /* fall back to "unknown" labels below */ })
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: anchorTop,
        right: anchorRight,
        width: 320,
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

      <div style={sectionLabel}>Version</div>
      <div style={infoBlock}>
        <Row label="Build"  value={info?.version ?? '—'} />
        <Row label="Date"   value={info?.buildDate ?? '—'} />
        <Row label="JUCE"   value={info?.juceVersion ?? '—'} />
        <Row label="Sample rate" value={info?.sampleRate ? `${Math.round(info.sampleRate)} Hz` : '—'} />
      </div>

      <div style={sectionLabel}>Strings samples</div>
      <div style={infoBlock}>
        <div style={creditName}>VSCO 2 Community Edition</div>
        <div style={creditMeta}>
          Sam Gossner · <span style={{ color: 'var(--cc-accent)', fontWeight: 600 }}>CC-BY 4.0</span>
        </div>
        <div style={creditNotes}>github.com/sgossner/VSCO-2-CE</div>
      </div>

      <div style={footer}>
        <span>© 2026 Astrotone Audio</span>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowBlock}>
      <span style={rowLabel}>{label}</span>
      <span style={rowValue}>{value}</span>
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
const infoBlock: React.CSSProperties = {
  padding: '.55rem .65rem',
  background: 'var(--cc-bg-elev)',
  border: '1px solid var(--cc-border-soft)',
  borderRadius: 7,
}
const rowBlock: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  padding: '2px 0',
  fontSize: 11,
}
const rowLabel: React.CSSProperties = {
  color: 'var(--cc-text-mute)',
}
const rowValue: React.CSSProperties = {
  color: 'var(--cc-text)', fontFamily: 'JetBrains Mono, ui-monospace, monospace',
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
const footer: React.CSSProperties = {
  marginTop: 16, paddingTop: 10,
  borderTop: '1px solid var(--cc-border-soft)',
  fontSize: 10, color: 'var(--cc-text-mute)',
  display: 'flex', justifyContent: 'space-between',
}
