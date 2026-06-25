
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  DndContext, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useStore } from '@/lib/store'
import { playChord, initAudio, getVoicedNotes } from '@/lib/audio'
import ChordCardV2 from './ChordCardV2'
import type { ChordEntry } from '@/types/music'

const PX_PER_BAR = 140       // visual width per 1 bar
const CARD_GAP = 10
const TRACK_HEIGHT = 110
const BAR_STEP = 0.5
const MIN_BARS = 0.5
const MAX_BARS = 16

export default function ProgressionV2() {
  const {
    progression, selectedIndex, setSelectedIndex, removeChord, currentBeat,
    updateChordBars, reorderChords, setPreviewNotes, setPinnedChordNotes,
    clearProgression,
    sessions, activeSessionId, renameSession,
  } = useStore()

  // Play a chord card on click and pin its notes to the piano view.
  async function playCardAtIndex(i: number) {
    const chord = progression[i]
    if (!chord) return
    await initAudio()
    const bass = chord.bassNote ?? chord.notes[0]
    const inv = chord.inversion ?? 'root'
    const d2 = chord.drop2 ?? false
    const vt = chord.voicingType ?? 'standard'
    const bars = chord.bars ?? 1
    // Sustain proportional to chord length but capped so single clicks
    // don't ring for many seconds on long chords.
    const sustainSec = Math.min(2.4, bars * 1.0)
    const variant = chord.voicingVariant ?? 0
    playChord(chord.notes, sustainSec, inv, bass, d2, vt, variant)

    const voiced = getVoicedNotes(chord.notes, inv, d2, bass, vt, variant)
    const pitchClasses = voiced.map(n => n.replace(/\d+$/, ''))
    setPreviewNotes(pitchClasses, voiced)
    setPinnedChordNotes(pitchClasses, voiced)
    // Clear preview overlay after the sustain finishes
    setTimeout(() => setPreviewNotes(null, null), Math.min(2400, bars * 1000))
  }
  const activeSession = sessions.find(s => s.id === activeSessionId)
  const projectName = activeSession?.name ?? 'Untitled'
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(projectName)
  function commitRename() {
    setEditing(false)
    const trimmed = draftName.trim()
    if (activeSessionId && trimmed && trimmed !== projectName) {
      renameSession(activeSessionId, trimmed)
    }
  }
  const [resizingIdx, setResizingIdx] = useState<number | null>(null)
  const [resizeHover, setResizeHover] = useState<number | null>(null)

  // DnD sensors — small activation distance so click+resize still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderChords(Number(active.id), Number(over.id))
    }
  }

  // ── Layout computation ──────────────────────────────────────
  let runningBar = 1
  const layouts = progression.map((chord, i) => {
    const bars = chord.bars ?? 1
    const startBar = runningBar
    const width = PX_PER_BAR * bars
    runningBar += bars
    return { width, startBar, bars }
  })
  const lastBarStart = runningBar
  const contentWidth =
    layouts.reduce((sum, l) => sum + l.width, 0)
    + CARD_GAP * Math.max(0, progression.length - 1)

  // ── Scroll/scrub state ──────────────────────────────────────
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const scrubBarRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setTrackWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function onScroll() {
    if (trackRef.current) setScrollLeft(trackRef.current.scrollLeft)
  }

  useEffect(() => {
    if (currentBeat < 0 || !trackRef.current) return
    const layout = layouts[currentBeat]
    if (!layout) return
    const startX = layouts.slice(0, currentBeat)
      .reduce((sum, l) => sum + l.width + CARD_GAP, 0)
    const el = trackRef.current
    const visibleStart = el.scrollLeft
    const visibleEnd = visibleStart + el.clientWidth
    if (startX < visibleStart || startX + layout.width > visibleEnd) {
      el.scrollTo({ left: startX - 24, behavior: 'smooth' })
    }
  }, [currentBeat, layouts])

  // ── Scrubber ───────────────────────────────────────────────
  function handleScrub(clientX: number) {
    const bar = scrubBarRef.current
    const el = trackRef.current
    if (!bar || !el) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const maxScroll = Math.max(0, contentWidth - el.clientWidth)
    el.scrollTo({ left: ratio * maxScroll, behavior: 'auto' })
  }
  useEffect(() => {
    if (!scrubbing) return
    const onMove = (e: MouseEvent) => handleScrub(e.clientX)
    const onUp = () => setScrubbing(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [scrubbing])

  // ── Card resize ────────────────────────────────────────────
  function startResize(e: React.MouseEvent, idx: number) {
    e.stopPropagation()
    e.preventDefault()
    setResizingIdx(idx)
    const startX = e.clientX
    const startBars = progression[idx]?.bars ?? 1

    const onMove = (ev: MouseEvent) => {
      const deltaPx = ev.clientX - startX
      const deltaBars = deltaPx / PX_PER_BAR
      const raw = startBars + deltaBars
      const snapped = Math.max(MIN_BARS, Math.min(MAX_BARS, Math.round(raw / BAR_STEP) * BAR_STEP))
      updateChordBars(idx, snapped)
    }
    const onUp = () => {
      setResizingIdx(null)
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'ew-resize'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Quick adjust via wheel on a chord (Shift + scroll = resize)
  function onCardWheel(e: React.WheelEvent, idx: number) {
    if (!e.shiftKey) return
    e.preventDefault()
    e.stopPropagation()
    const current = progression[idx]?.bars ?? 1
    const dir = e.deltaY < 0 ? 1 : -1
    const next = Math.max(MIN_BARS, Math.min(MAX_BARS, current + dir * BAR_STEP))
    updateChordBars(idx, next)
  }

  // ── Playhead (within content) ──────────────────────────────
  const playheadX = currentBeat >= 0 && layouts[currentBeat]
    ? layouts.slice(0, currentBeat).reduce((sum, l) => sum + l.width + CARD_GAP, 0)
      + layouts[currentBeat].width / 2
    : -1

  // ── Scrubber viewport indicators ───────────────────────────
  const viewportRatio = contentWidth > 0 ? Math.min(1, trackWidth / contentWidth) : 1
  const viewportLeftRatio = contentWidth > trackWidth
    ? scrollLeft / (contentWidth - trackWidth)
    : 0

  return (
    <section style={{ padding: '1.25rem 1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.1rem' }}>
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setEditing(false); setDraftName(projectName) }
            }}
            style={{
              background: 'var(--cc-bg-input)',
              border: '1px solid var(--cc-border)',
              color: 'var(--cc-text)',
              fontSize: 18,
              fontFamily: 'var(--font-fraunces)',
              padding: '.25rem .5rem',
              borderRadius: 6,
              outline: 'none',
            }}
          />
        ) : (
          <h2
            onClick={() => { setDraftName(projectName); setEditing(true) }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: 19,
              color: 'var(--cc-text)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {projectName}
          </h2>
        )}
        <button
          onClick={() => { setDraftName(projectName); setEditing(true) }}
          style={{ background: 'none', border: 'none', color: 'var(--cc-text-dim)', cursor: 'pointer', fontSize: 14 }}
          title="Rename project"
          disabled={!activeSessionId}
        >
          ✎
        </button>
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: 'var(--cc-text-mute)',
          letterSpacing: '.1em',
        }}>
          {progression.length > 0
            ? `${lastBarStart - 1} bar${lastBarStart - 1 === 1 ? '' : 's'} total`
            : 'drag right edge of a chord to resize · shift+scroll for fine-tune'}
        </span>
        {progression.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all chords from the progression?')) clearProgression()
            }}
            title="Clear progression"
            style={{
              marginLeft: '.75rem',
              background: 'transparent',
              border: '1px solid var(--cc-border)',
              color: 'var(--cc-text-dim)',
              borderRadius: 6,
              padding: '.3rem .6rem',
              fontSize: 11,
              letterSpacing: '.08em',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: '.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cc-warn, #e687a0)'
              e.currentTarget.style.color = 'var(--cc-warn, #e687a0)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--cc-border)'
              e.currentTarget.style.color = 'var(--cc-text-dim)'
            }}
          >
            🗑 CLEAR
          </button>
        )}
      </div>

      {/* Timeline */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="cc-track-scroll"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 6,
        }}
      >
        <div style={{ width: contentWidth, position: 'relative' }}>
          {/* Bar number ruler — labels at each chord boundary */}
          <div
            style={{
              display: 'flex',
              gap: CARD_GAP,
              marginBottom: '.35rem',
              alignItems: 'flex-end',
            }}
          >
            {layouts.map((l, i) => (
              <div
                key={i}
                style={{
                  width: l.width,
                  color: 'var(--cc-text-mute)',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span>{l.startBar}</span>
                <span style={{ fontSize: 9, color: 'var(--cc-text-mute)', opacity: .6 }}>
                  {l.bars}b
                </span>
              </div>
            ))}
          </div>

          {/* Chord cards (sortable) */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={progression.map((_, i) => i)}
              strategy={horizontalListSortingStrategy}
            >
              <div style={{ display: 'flex', gap: CARD_GAP, minHeight: TRACK_HEIGHT }}>
                {progression.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      minHeight: TRACK_HEIGHT,
                      borderRadius: 12,
                      border: '1px dashed var(--cc-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cc-text-mute)',
                      fontSize: 12,
                      gap: 4,
                      padding: '1rem',
                    }}
                  >
                    <div style={{ fontSize: 16, fontFamily: 'var(--font-fraunces)' }}>
                      Empty progression
                    </div>
                    <div style={{ fontSize: 11 }}>
                      Click chord buttons below to add them here
                    </div>
                  </div>
                ) : (
                  progression.map((chord, i) => {
                    const layout = layouts[i]
                    return (
                      <ChordCardV2
                        key={i}
                        index={i}
                        chord={chord}
                        width={layout.width}
                        bars={layout.bars}
                        isSelected={selectedIndex === i}
                        isPlaying={currentBeat === i}
                        isResizing={resizingIdx === i}
                        resizeHover={resizeHover === i}
                        onSelect={() => {
                        setSelectedIndex(i)
                        void playCardAtIndex(i)
                      }}
                        onRemove={() => { removeChord(i); setSelectedIndex(null) }}
                        onStartResize={(e) => startResize(e, i)}
                        onResizeHover={(entering) => setResizeHover(entering ? i : null)}
                        onWheel={(e) => onCardWheel(e, i)}
                      />
                    )
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>

          {playheadX >= 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: playheadX,
                width: 2,
                background: 'var(--cc-cyan)',
                boxShadow: '0 0 8px var(--cc-cyan)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Scrubber */}
      <div
        ref={scrubBarRef}
        onMouseDown={(e) => { setScrubbing(true); handleScrub(e.clientX) }}
        style={{
          marginTop: '.7rem',
          height: 16,
          borderRadius: 99,
          background: 'rgba(255,255,255,.04)',
          border: '1px solid var(--cc-border-soft)',
          position: 'relative',
          cursor: 'grab',
          userSelect: 'none',
        }}
        title="Drag to scrub the timeline"
      >
        <div
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: `${viewportLeftRatio * (100 - viewportRatio * 100)}%`,
            width: `${viewportRatio * 100}%`,
            minWidth: 30,
            background: 'linear-gradient(90deg, var(--cc-accent-d), var(--cc-accent-l))',
            borderRadius: 99,
            opacity: 0.65,
            transition: scrubbing ? 'none' : 'left .1s',
          }}
        />
        {progression.length > 0 && currentBeat >= 0 && playheadX >= 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${(playheadX / contentWidth) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10,
              borderRadius: 99,
              background: 'var(--cc-cyan)',
              boxShadow: '0 0 8px var(--cc-cyan)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </section>
  )
}
