
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Note } from 'tonal'
import { MODE_MAP, ALL_MODES, getScaleNotes } from '@/lib/theory'
import type { ChordEntry, ScaleType } from '@/types/music'

const CARD_COLORS = [
  'var(--cc-card-1)', 'var(--cc-card-2)', 'var(--cc-card-3)',
  'var(--cc-card-4)', 'var(--cc-card-5)', 'var(--cc-card-6)',
]

const TRACK_HEIGHT = 110

const NOTE_DISPLAY: Record<string, string> = {
  'C#': 'C♯', 'D#': 'D♯', 'F#': 'F♯', 'G#': 'G♯', 'A#': 'A♯',
  'Db': 'D♭', 'Eb': 'E♭', 'Gb': 'G♭', 'Ab': 'A♭', 'Bb': 'B♭',
}
const fmtNote = (n: string) => NOTE_DISPLAY[n] ?? n

/** Build chord label: "Dm9" or "Dm9/F" when bass differs from root */
function buildDisplay(displayName: string, bassNote: string | undefined, rootNote: string): string {
  if (!bassNote) return displayName
  // Compare pitch classes (so "C#" and "Db" match if user later normalises)
  if (bassNote === rootNote) return displayName
  return `${displayName}/${fmtNote(bassNote)}`
}

// Modes we try, in preference order, when the recorded sourceScale
// doesn't actually contain the chord (i.e. it was added as a borrowed
// chord). Brighter modes first, then minor flavours.
const FALLBACK_MODE_ORDER: ScaleType[] = [
  'ionian', 'mixolydian', 'lydian', 'dorian',
  'aeolian', 'phrygian', 'locrian',
  'harmonicMinor', 'melodicMinor', 'phrygianDom',
]

function chordFitsScale(chord: ChordEntry, root: string, mode: ScaleType): boolean {
  const scaleChromas = new Set(
    getScaleNotes(root, mode).map(n => Note.chroma(n)).filter((c): c is number => c != null),
  )
  for (const n of chord.notes) {
    const c = Note.chroma(n)
    if (c == null || !scaleChromas.has(c)) return false
  }
  return true
}

/**
 * Pick the most useful scale label for this chord.
 *   - If the recorded sourceScale still contains all chord tones, use it.
 *   - Otherwise look for a parallel mode (same sourceRoot) where the
 *     chord IS diatonic — this is what "borrowed" chords are borrowed
 *     from.
 *   - Final fallback: the chord's own root in Ionian / Aeolian.
 */
function resolveEffectiveScale(chord: ChordEntry): { root: string; mode: ScaleType; borrowed: boolean } {
  const recorded = chord.sourceScale as ScaleType
  if (recorded && chordFitsScale(chord, chord.sourceRoot, recorded)) {
    return { root: chord.sourceRoot, mode: recorded, borrowed: false }
  }
  for (const m of FALLBACK_MODE_ORDER) {
    if (m === recorded) continue
    if (chordFitsScale(chord, chord.sourceRoot, m)) {
      return { root: chord.sourceRoot, mode: m, borrowed: true }
    }
  }
  // Last resort: chord's own root + ionian/aeolian based on quality
  const chordRoot = chord.notes[0]
  const third = chord.notes[1]
  let isMinor = false
  if (third) {
    const rc = Note.chroma(chordRoot)
    const tc = Note.chroma(third)
    if (rc != null && tc != null) isMinor = ((tc - rc + 12) % 12) === 3
  }
  return { root: chordRoot, mode: isMinor ? 'aeolian' : 'ionian', borrowed: true }
}

/** Short "C Aeolian" style label of the chord's effective scale. */
function buildScaleLabel(chord: ChordEntry): { text: string; borrowed: boolean } {
  const { root, mode, borrowed } = resolveEffectiveScale(chord)
  const def = MODE_MAP[mode]
  if (!def) return { text: '', borrowed }
  const short = def.name.replace(/\s*\(.*\)$/, '').trim()
  return { text: `${fmtNote(root)} ${short}`, borrowed }
}

interface Props {
  index: number
  chord: ChordEntry
  width: number
  bars: number
  isSelected: boolean
  isPlaying: boolean
  isResizing: boolean
  resizeHover: boolean
  onSelect: () => void
  onRemove: () => void
  onStartResize: (e: React.MouseEvent) => void
  onResizeHover: (entering: boolean) => void
  onWheel: (e: React.WheelEvent) => void
}

export default function ChordCardV2(props: Props) {
  const {
    index, chord, width, bars,
    isSelected, isPlaying, isResizing, resizeHover,
    onSelect, onRemove, onStartResize, onResizeHover, onWheel,
  } = props

  const {
    attributes, listeners, setNodeRef, transform, transition,
    isDragging,
  } = useSortable({ id: index })

  const bg = CARD_COLORS[(chord.colorIndex ?? index) % CARD_COLORS.length]

  const style: React.CSSProperties = {
    width,
    flexShrink: 0,
    borderRadius: 12,
    background: bg,
    opacity: isDragging ? 0.4 : (isPlaying ? 1 : 0.92),
    boxShadow: isSelected || isResizing
      ? '0 0 0 2px var(--cc-accent-l), 0 4px 14px rgba(0,0,0,.45)'
      : isPlaying
        ? '0 0 0 2px var(--cc-cyan), 0 4px 14px rgba(0,0,0,.5)'
        : isDragging
          ? '0 8px 24px rgba(0,0,0,.6)'
          : '0 2px 10px rgba(0,0,0,.4)',
    padding: '.85rem .9rem',
    cursor: isDragging ? 'grabbing' : 'grab',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#fff',
    position: 'relative',
    transition: isResizing ? 'none' : transition,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    minHeight: TRACK_HEIGHT,
    touchAction: 'none',
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Ignore click if we just finished dragging
        if (isDragging) return
        onSelect()
      }}
      onWheel={onWheel}
      style={style}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-fraunces)', lineHeight: 1.1 }}>
          {buildDisplay(chord.displayName, chord.bassNote, chord.notes[0])}
        </div>
        {(() => {
          const { text, borrowed } = buildScaleLabel(chord)
          return (
            <div
              style={{
                fontSize: 9,
                color: borrowed ? 'rgba(255,220,140,.85)' : 'rgba(255,255,255,.7)',
                letterSpacing: '.04em',
                marginTop: 2,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontStyle: borrowed ? 'italic' : 'normal',
              }}
              title={borrowed ? 'Borrowed chord — not native to current key' : undefined}
            >
              {borrowed ? '↗ ' : ''}{text}
            </div>
          )
        })()}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: 11, color: 'rgba(255,255,255,.7)',
      }}>
        <span style={{ textTransform: 'lowercase' }}>{chord.roman || '·'}</span>
        <span style={{
          background: 'rgba(0,0,0,.25)',
          borderRadius: 99,
          padding: '1px 7px',
          fontSize: 10,
          fontWeight: 600,
        }}>
          {bars} bar{bars === 1 ? '' : 's'}
        </span>
      </div>

      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,.3)', border: 'none',
            color: 'rgba(255,255,255,.8)',
            width: 22, height: 22, borderRadius: 99,
            cursor: 'pointer', fontSize: 14,
            zIndex: 2,
          }}
          title="Remove"
        >×</button>
      )}

      {/* Resize handle (right edge) — stops dnd activation */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => { e.stopPropagation(); onStartResize(e) }}
        onMouseEnter={() => onResizeHover(true)}
        onMouseLeave={() => onResizeHover(false)}
        title="Drag to resize · shift+scroll for fine-tune"
        style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: 10,
          cursor: 'ew-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 2,
          zIndex: 2,
        }}
      >
        <div style={{
          width: 3,
          height: 30,
          borderRadius: 2,
          background: isResizing || resizeHover
            ? 'rgba(255,255,255,.85)'
            : 'rgba(255,255,255,.25)',
          transition: '.15s',
        }} />
      </div>
    </div>
  )
}
