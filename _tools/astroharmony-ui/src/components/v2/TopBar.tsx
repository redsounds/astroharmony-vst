
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { playProgression, stopPlayback, initAudio } from '@/lib/audio'
import ProjectMenu from './ProjectMenu'
import InstrumentPickerTop from './InstrumentPickerTop'
import SettingsPopover from './SettingsPopover'

export default function TopBar() {
  const {
    isPlaying, tempo, progression, loop,
    setTempo, setPlaying, setCurrentBeat, toggleLoop,
    saveProgression, lastSaved,
    undo, redo,
    playbackVolume, setPlaybackVolume,
  } = useStore()
  const historyIndex = useStore(s => s.historyIndex)
  const historyLen = useStore(s => s.history.length)
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyLen - 1
  const [savedFlash, setSavedFlash] = useState(false)
  // Volume now lives in the store so each session can persist its own
  // playback level alongside chord / tempo / pitch. setPlaybackVolume
  // also forwards to the audio engine so the slider stays live.
  const volume = playbackVolume
  const setVolume = setPlaybackVolume
  const [showBpmEditor, setShowBpmEditor] = useState(false)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const projectBtnRef = useRef<HTMLButtonElement | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null)
  const [settingsAnchor, setSettingsAnchor] = useState<{ right: number; top: number }>({ right: 0, top: 0 })

  useEffect(() => {
    if (!lastSaved) return
    setSavedFlash(true)
    const t = setTimeout(() => setSavedFlash(false), 1500)
    return () => clearTimeout(t)
  }, [lastSaved])

  async function handlePlay() {
    if (isPlaying) {
      stopPlayback(); setPlaying(false); setCurrentBeat(-1)
      return
    }
    if (!progression.length) return
    await initAudio()
    setPlaying(true)
    await playProgression(
      progression, tempo, loop,
      (beat) => setCurrentBeat(beat),
      () => { setPlaying(false); setCurrentBeat(-1) }
    )
  }

  function handleStop() {
    stopPlayback(); setPlaying(false); setCurrentBeat(-1)
  }

  return (
    <header
      style={{
        gridArea: 'top',
        background: 'var(--cc-bg-base)',
        borderBottom: '1px solid var(--cc-border-soft)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.25rem',
        height: 56,
        gap: '.85rem',
      }}
    >
      {/* Left cluster */}
      <button
        ref={projectBtnRef}
        style={pillBtn}
        onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
        onClick={() => {
          if (!showProjectMenu && projectBtnRef.current) {
            const r = projectBtnRef.current.getBoundingClientRect()
            setMenuAnchor({ left: r.left, top: r.bottom + 6 })
          }
          setShowProjectMenu(v => !v)
        }}
      >
        Projects ▾
      </button>
      <ProjectMenu
        open={showProjectMenu}
        onClose={() => setShowProjectMenu(false)}
        anchorLeft={menuAnchor.left}
        anchorTop={menuAnchor.top}
      />

      <button
        onClick={saveProgression}
        title="Save"
        style={{ ...iconBtn, color: savedFlash ? 'var(--cc-cyan)' : 'var(--cc-text-dim)' }}
      >
        {savedFlash ? '✓' : '💾'}
      </button>

      <button
        onClick={() => canUndo && undo()}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={{
          ...iconBtn,
          color: canUndo ? 'var(--cc-text-dim)' : 'var(--cc-text-mute)',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          opacity: canUndo ? 1 : .35,
          fontSize: 18,
        }}
      >
        ↶
      </button>
      <button
        onClick={() => canRedo && redo()}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        style={{
          ...iconBtn,
          color: canRedo ? 'var(--cc-text-dim)' : 'var(--cc-text-mute)',
          cursor: canRedo ? 'pointer' : 'not-allowed',
          opacity: canRedo ? 1 : .35,
          fontSize: 18,
        }}
      >
        ↷
      </button>

      {/* Centre title — lives inside the flex spacer so it stays visible
          (just shifted left, never hidden) when the window is too narrow
          for full centring. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 0,
          padding: '0 .5rem',
          overflow: 'hidden',
        }}
      >
        <div
          className="cc-topbar-title"
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '.95rem',
            letterSpacing: '0.32em',
            color: 'var(--cc-text)',
            fontWeight: 500,
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ASTROHARMONY
        </div>
      </div>

      {/* Instrument */}
      <InstrumentPickerTop />

      {/* Transport */}
      <button onClick={handlePlay} style={transportBtn(isPlaying ? 'var(--cc-accent)' : 'var(--cc-bg-elev)')}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button onClick={handleStop} style={transportBtn('var(--cc-bg-elev)')}>■</button>
      <button
        onClick={toggleLoop}
        title={loop ? 'Loop ON — click to disable' : 'Loop OFF — click to enable'}
        style={{
          ...transportBtn(loop ? 'var(--cc-accent)' : 'var(--cc-bg-elev)'),
          color: loop ? '#fff' : 'var(--cc-text-dim)',
          fontSize: 14,
        }}
      >
        ↻
      </button>

      {/* BPM */}
      <button
        onClick={() => setShowBpmEditor(s => !s)}
        style={{ ...pillBtn, minWidth: 92, position: 'relative' }}
        title="BPM"
      >
        {tempo} BPM ▾
        {showBpmEditor && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: 'var(--cc-bg-panel)',
              border: '1px solid var(--cc-border)',
              borderRadius: 10, padding: '.6rem .8rem',
              display: 'flex', alignItems: 'center', gap: 8, zIndex: 30,
            }}
          >
            <input type="range" min={40} max={220} value={tempo} onChange={(e) => setTempo(+e.target.value)} />
            <span style={{ color: 'var(--cc-text)', fontWeight: 600, minWidth: 32 }}>{tempo}</span>
          </div>
        )}
      </button>

      {/* Volume */}
      <span style={{ color: 'var(--cc-text-dim)' }}>{volume === 0 ? '🔇' : '🔊'}</span>
      <input
        type="range"
        min={0} max={100} value={volume}
        onChange={(e) => setVolume(+e.target.value)}
        style={{ width: 110 }}
        title={`Master volume — ${volume}%`}
      />
      <span style={{
        color: 'var(--cc-text-dim)',
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500,
        minWidth: 30,
        textAlign: 'right',
        userSelect: 'none',
      }}>
        {volume}%
      </span>

      {/* Settings */}
      <button
        ref={settingsBtnRef}
        style={iconBtn}
        title="Settings"
        onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
        onClick={() => {
          if (!showSettings && settingsBtnRef.current) {
            const r = settingsBtnRef.current.getBoundingClientRect()
            setSettingsAnchor({ right: window.innerWidth - r.right, top: r.bottom + 6 })
          }
          setShowSettings(v => !v)
        }}
      >
        ⚙
      </button>
      <SettingsPopover
        open={showSettings}
        onClose={() => setShowSettings(false)}
        anchorRight={settingsAnchor.right}
        anchorTop={settingsAnchor.top}
      />
    </header>
  )
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  background: 'transparent', border: 'none',
  color: 'var(--cc-text-dim)',
  cursor: 'pointer', fontSize: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const pillBtn: React.CSSProperties = {
  height: 34, padding: '0 .85rem', borderRadius: 8,
  background: 'var(--cc-bg-elev)', border: '1px solid var(--cc-border-soft)',
  color: 'var(--cc-text-dim)', cursor: 'pointer',
  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
}

const transportBtn = (bg: string): React.CSSProperties => ({
  width: 38, height: 34, borderRadius: 8,
  background: bg, border: '1px solid var(--cc-border-soft)',
  color: 'var(--cc-text)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13,
})
