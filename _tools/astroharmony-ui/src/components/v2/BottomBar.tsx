
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  exportProgressionAsMidi,
  exportProgressionAsMidiNative,
  dragProgressionAsMidiNative,
} from '@/lib/midi'
import { inJuce } from '@/jucebridge'

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
  const [flash, setFlash] = useState<'idle' | 'done' | 'empty' | 'cancelled' | 'error' | 'dragging'>('idle')

  // True once mousedown+move passes the threshold, so the subsequent mouseup
  // doesn't also fire React's onClick → onClick would re-export to file.
  const draggedRef = useRef(false)

  function getActiveName(): string {
    return sessions.find(s => s.id === activeSessionId)?.name?.trim() || 'Untitled'
  }

  async function handleExport() {
    if (draggedRef.current) { draggedRef.current = false; return }
    const activeName = getActiveName()

    if (progression.length === 0) {
      setFlash('empty'); setTimeout(() => setFlash('idle'), 1800); return
    }

    if (inJuce()) {
      // Plugin path: native FileChooser writes the .mid where the user picks.
      const res = await exportProgressionAsMidiNative({
        progression, tempo, trackName: activeName,
        filename: slugify(activeName), transpose,
      })
      if (res.success) setFlash('done')
      else if (res.cancelled) setFlash('cancelled')
      else setFlash('error')
    } else {
      // Browser path (component dev outside the plugin): trigger a download.
      const ok = exportProgressionAsMidi({
        progression, tempo, trackName: activeName,
        filename: slugify(activeName), transpose,
      })
      setFlash(ok ? 'done' : 'empty')
    }
    setTimeout(() => setFlash('idle'), 1800)
  }

  // Drag-out: if the user mousedowns and drags past a small threshold, fire
  // an OS-level file drag via the native bridge. The DAW receives a normal
  // file drop and imports the .mid. Click-without-move falls through to
  // React's onClick → save-as-file. Only enabled inside the plugin (browser
  // mode can't initiate a Windows OLE drag).
  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (!inJuce() || progression.length === 0) return
    const startX = e.clientX
    const startY = e.clientY
    let triggered = false
    draggedRef.current = false

    const onMove = (ev: MouseEvent) => {
      if (triggered) return
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return
      triggered = true
      draggedRef.current = true
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const activeName = getActiveName()
      setFlash('dragging')
      void dragProgressionAsMidiNative({
        progression, tempo, trackName: activeName,
        filename: slugify(activeName), transpose,
      }).then(res => {
        setFlash(res.success ? 'done' : 'error')
        setTimeout(() => setFlash('idle'), 1800)
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const transposeLabel = transpose === 0 ? '0' : (transpose > 0 ? `+${transpose}` : `${transpose}`)

  const buttonLabel =
    flash === 'done'      ? '✓ EXPORTED'         :
    flash === 'empty'     ? '⚠ ADD CHORDS FIRST' :
    flash === 'cancelled' ? '— CANCELLED'        :
    flash === 'error'     ? '⚠ EXPORT FAILED'    :
    flash === 'dragging'  ? '⤴ DRAG TO DAW'      :
                            'EXPORT MIDI ⤴'

  const buttonBg =
    flash === 'done'      ? 'var(--cc-resolution)' :
    flash === 'empty'     ? 'var(--cc-warn)'       :
    flash === 'error'     ? 'var(--cc-warn)'       :
    flash === 'cancelled' ? 'var(--cc-bg-elev)'    :
    flash === 'dragging'  ? 'var(--cc-accent)'     :
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
        onMouseDown={handleMouseDown}
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
          cursor: inJuce() && progression.length > 0 ? 'grab' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'background .2s',
          userSelect: 'none',
        }}
        title={progression.length === 0
          ? 'Add at least one chord'
          : 'Click to save .mid file, or drag onto your DAW'}
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
