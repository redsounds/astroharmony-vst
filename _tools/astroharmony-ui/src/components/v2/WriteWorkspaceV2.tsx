
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'

// In the Electron/Next.js source these were `next/dynamic(... { ssr: false })`
// to skip SSR. We bundle for a plugin WebView (no server), so plain imports.
import TopBar from './TopBar'
import MoodSidebar from './MoodSidebar'
import ProgressionV2 from './ProgressionV2'
import SuggestedChords from './SuggestedChords'
import RightPanel from './RightPanel'
import BottomBar from './BottomBar'
import DarkChordPicker from './DarkChordPicker'

const RIGHT_WIDTH_KEY = 'cc_right_width'
const MIN_WIDTH = 290
const MAX_WIDTH = 820
// Initial right-panel width for first-time launches. Wide enough to show the
// piano at a comfortable 3-octave-ish span without dominating the workspace.
const DEFAULT_WIDTH = 580

export default function WriteWorkspaceV2() {
  const [rightWidth, setRightWidth] = useState(DEFAULT_WIDTH)
  const draggingRef = useRef(false)

  // Mark body as dark while this workspace is mounted
  useEffect(() => {
    document.body.classList.add('cc-dark')
    return () => { document.body.classList.remove('cc-dark') }
  }, [])

  // Restore the previous session from localStorage on mount. The store's
  // auto-save subscriber takes care of persisting subsequent changes.
  useEffect(() => {
    useStore.getState().loadProgression()
  }, [])

  // Load saved width
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RIGHT_WIDTH_KEY)
      if (saved) {
        const n = parseInt(saved, 10)
        if (!Number.isNaN(n)) setRightWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n)))
      }
    } catch {}
  }, [])

  // Drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const newWidth = window.innerWidth - e.clientX
      setRightWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)))
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem(RIGHT_WIDTH_KEY, String(rightWidth)) } catch {}
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [rightWidth])

  function startDrag() {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cc-bg-deep)',
        color: 'var(--cc-text)',
        display: 'grid',
        gridTemplateColumns: `230px 1fr 5px ${rightWidth}px`,
        gridTemplateRows: '56px 1fr 48px',
        gridTemplateAreas: `
          "top    top     top     top"
          "left   centre  divider right"
          "bottom bottom  bottom  bottom"
        `,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <TopBar />
      <MoodSidebar />

      <main
        style={{
          gridArea: 'centre',
          overflowY: 'auto',
          background: 'radial-gradient(ellipse at top, rgba(139,125,217,.06), transparent 70%), var(--cc-bg-deep)',
        }}
      >
        <ProgressionV2 />
        <SuggestedChords />
        <DarkChordPicker />
      </main>

      {/* Drag divider */}
      <div
        onMouseDown={startDrag}
        title="Drag to resize panel"
        style={{
          gridArea: 'divider',
          cursor: 'col-resize',
          background: 'var(--cc-border-soft)',
          position: 'relative',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cc-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cc-border-soft)' }}
      >
        {/* Grip indicator */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 3, height: 32,
          background: 'var(--cc-text-mute)',
          borderRadius: 2,
          pointerEvents: 'none',
        }} />
      </div>

      <RightPanel width={rightWidth} />
      <BottomBar />
    </div>
  )
}
