
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { exportProgressionAsMidi } from '@/lib/midi'

function slugify(name: string): string {
  // Conservative slug: keep letters/digits/spaces/dashes, collapse spaces to '-',
  // lowercase. Falls back to a default if nothing usable is left.
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return cleaned || 'astroharmony-progression'
}

export default function BottomBar() {
  const { progression, tempo, sessions, activeSessionId, transpose, setTranspose } = useStore()
  const [flash, setFlash] = useState<'idle' | 'done' | 'empty'>('idle')

  function handleExport() {
    const activeName = sessions.find(s => s.id === activeSessionId)?.name?.trim() || 'Untitled'
    const ok = exportProgressionAsMidi({
      progression, tempo,
      trackName: activeName,
      filename: slugify(activeName),
      transpose,
    })
    setFlash(ok ? 'done' : 'empty')
    setTimeout(() => setFlash('idle'), 1800)
  }

  const transposeLabel = transpose === 0 ? '0' : (transpose > 0 ? `+${transpose}` : `${transpose}`)

  const buttonLabel =
    flash === 'done'  ? '✓ EXPORTED'        :
    flash === 'empty' ? '⚠ ADD CHORDS FIRST' :
                        'EXPORT MIDI ⤴'

  const buttonBg =
    flash === 'done'  ? 'var(--cc-resolution)' :
    flash === 'empty' ? 'var(--cc-warn)'       :
                        'var(--cc-accent)'

  return (
    <footer
      style={{
        gridArea: 'bottom',
        background: 'var(--cc-bg-base)',
        borderTop: '1px solid var(--cc-border-soft)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        height: 48,
        gap: '.85rem',
      }}
    >
      <div style={{ flex: 1 }} />

      {/* Playback / export pitch shift — doesn't touch the music theory
          engine, only what the speakers hear and the .mid file carries. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 .7rem',
          height: 32, borderRadius: 8,
          background: 'var(--cc-bg-elev)',
          border: '1px solid var(--cc-border-soft)',
        }}
        title="Playback pitch shift — affects sound + MIDI export only, chord data stays unchanged"
      >
        <span style={{
          fontSize: 10, letterSpacing: '.18em', fontWeight: 600,
          color: 'var(--cc-text-mute)', fontFamily: 'DM Sans, sans-serif',
        }}>
          PITCH
        </span>
        <button
          onClick={() => setTranspose(transpose - 1)}
          disabled={transpose <= -12}
          style={pitchStepBtn(transpose <= -12)}
          aria-label="Pitch down"
        >−</button>
        <input
          type="range"
          min={-12} max={12} step={1} value={transpose}
          onChange={(e) => setTranspose(+e.target.value)}
          onDoubleClick={() => setTranspose(0)}
          style={{ width: 110 }}
        />
        <button
          onClick={() => setTranspose(transpose + 1)}
          disabled={transpose >= 12}
          style={pitchStepBtn(transpose >= 12)}
          aria-label="Pitch up"
        >+</button>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: transpose === 0 ? 'var(--cc-text-mute)' : 'var(--cc-text)',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          minWidth: 26, textAlign: 'right',
        }}>
          {transposeLabel}
        </span>
      </div>

      <button
        onClick={handleExport}
        disabled={flash !== 'idle' && flash !== 'empty'}
        style={{
          background: buttonBg,
          border: 'none',
          color: '#fff',
          borderRadius: 8,
          padding: '.5rem 1.1rem',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '.05em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'background .2s',
        }}
        title={progression.length === 0 ? 'Add at least one chord' : 'Download progression as MIDI'}
      >
        {buttonLabel}
      </button>
    </footer>
  )
}

const pitchStepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 20, height: 20, borderRadius: 4,
  background: 'transparent',
  border: '1px solid var(--cc-border)',
  color: disabled ? 'var(--cc-text-mute)' : 'var(--cc-text-dim)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13, lineHeight: 1, padding: 0,
  fontFamily: 'DM Sans, sans-serif',
  opacity: disabled ? 0.4 : 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
