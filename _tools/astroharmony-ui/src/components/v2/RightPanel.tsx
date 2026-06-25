'use client'

import { useStore } from '@/lib/store'
import PianoKeyboard from '@/components/piano/PianoKeyboard'
import { getScaleNotes } from '@/lib/theory'
import { getVoicedNotes } from '@/lib/audio'
import { playChord } from '@/lib/audio'
import { VOICING_STYLES } from '@/lib/voicings'
import type { Inversion, VoicingType } from '@/types/music'

interface Props {
  width: number
}

const VOICING_OPTIONS: { value: VoicingType; label: string }[] = [
  { value: 'standard',     label: 'Standard' },
  { value: 'cinematic',    label: 'Cinematic' },
  { value: 'pianoSpread',  label: 'Piano Spread' },
  { value: 'jazz',         label: 'Jazz Shell' },
  { value: 'neoSoul',      label: 'Neo Soul' },
{ value: 'voiceLeading', label: 'Voice Leading' },
  { value: 'openVoicing',  label: 'Open Voicing' },
  { value: 'quartal',      label: 'Quartal ◇' },
  { value: 'cluster',      label: 'Cluster ✦' },
]

const INVERSION_OPTIONS: { value: Inversion; label: string }[] = [
  { value: 'root', label: 'Root Position' },
  { value: '1st',  label: '1st Inversion' },
  { value: '2nd',  label: '2nd Inversion' },
]

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const DISPLAY: Record<string, string> = {
  'C#': 'C♯', 'D#': 'D♯', 'F#': 'F♯', 'G#': 'G♯', 'A#': 'A♯',
}

// Native piano width is 43 white keys Ã— 14 px = 602 px (C1..C7)
const PIANO_NATIVE_WIDTH = 43 * 14
const PIANO_NATIVE_HEIGHT = 68

export default function RightPanel({ width }: Props) {
  const {
    voicingType, inversion, drop2,
    setVoicingType, setInversion, toggleDrop2,
    selectedIndex, progression,
    updateChordVoicingType, updateChordInversion, updateChordDrop2,
    updateChordBassNote,
    root, scaleType, currentBeat, isPlaying,
    previewNotes, previewVoicedNotes, pinnedChordNotes, pinnedVoicedNotes,
    pianoView, setPianoView, bassNote,
  } = useStore()

  const selectedChord = selectedIndex !== null ? progression[selectedIndex] : null
  const activeVoicing = selectedChord?.voicingType ?? voicingType
  const activeInv = selectedChord?.inversion ?? inversion
  const activeDrop2 = selectedChord?.drop2 ?? drop2
  const activeBass = selectedChord?.bassNote ?? null
  const chordRoot = selectedChord?.notes[0] ?? null
  const isStandard = activeVoicing === 'standard'

  function handleVoicing(v: VoicingType) {
    if (selectedIndex !== null) {
      updateChordVoicingType(selectedIndex, v)
      if (selectedChord) {
        playChord(selectedChord.notes, '4n', selectedChord.inversion ?? 'root', selectedChord.bassNote ?? null, selectedChord.drop2 ?? false, v, selectedChord.voicingVariant ?? 0)
      }
    } else setVoicingType(v)
  }

  function handleInv(i: Inversion) {
    if (selectedIndex !== null) {
      updateChordInversion(selectedIndex, i)
      if (selectedChord) {
        playChord(selectedChord.notes, '4n', i, selectedChord.bassNote ?? null, selectedChord.drop2 ?? false, activeVoicing, selectedChord.voicingVariant ?? 0)
      }
    } else setInversion(i)
  }

  function handleDrop2() {
    if (selectedIndex !== null) {
      const next = !activeDrop2
      updateChordDrop2(selectedIndex, next)
      if (selectedChord) {
        playChord(selectedChord.notes, '4n', selectedChord.inversion ?? 'root', selectedChord.bassNote ?? null, next, activeVoicing, selectedChord.voicingVariant ?? 0)
      }
    } else toggleDrop2()
  }

  function handleBassClick(note: string) {
    if (selectedIndex === null) return
    const next = activeBass === note ? (chordRoot ?? note) : note
    updateChordBassNote(selectedIndex, next)
    if (selectedChord) {
      playChord(selectedChord.notes, '4n', selectedChord.inversion ?? 'root', next, selectedChord.drop2 ?? false, activeVoicing, selectedChord.voicingVariant ?? 0)
    }
  }

  // Piano data â€” make sure both the highlights AND the voicing dots
  // reflect the chord's selected voicing style + variant.
  const scaleNotes = getScaleNotes(root, scaleType)
  const playingChord = isPlaying && currentBeat >= 0 && progression[currentBeat]
    ? progression[currentBeat] : null
  const chordForPiano = playingChord ?? (pianoView === 'chord' ? selectedChord : null)

  function deriveVoiced(c: typeof selectedChord) {
    if (!c) return null
    return getVoicedNotes(
      c.notes,
      c.inversion ?? 'root',
      c.drop2 ?? false,
      c.bassNote ?? null,
      c.voicingType ?? 'standard',
      c.voicingVariant ?? 0,
    )
  }
  const computedVoiced = deriveVoiced(chordForPiano)
  const isChordMode = !!(playingChord || previewNotes || (pianoView === 'chord' && (computedVoiced || pinnedChordNotes)))

  // previewNotes wins over the selected chord so clicking another chord in
  // the picker actually shows up on the piano. After ~1400 ms the preview
  // clears (useChordPreview timer) and we fall back to the selected chord.
  const pianoNotes = previewNotes
    ?? (computedVoiced ? Array.from(new Set(computedVoiced.map(n => n.replace(/-?\d+$/, '')))) : null)
    ?? (pianoView === 'chord' ? pinnedChordNotes : null)
    ?? scaleNotes
  const pianoBassNote = playingChord
    ? (playingChord.bassNote ?? null)
    : (previewNotes ? bassNote : (selectedChord?.bassNote ?? null))
  const voicedNotes = previewVoicedNotes
    ?? computedVoiced
    ?? (pianoView === 'chord' ? pinnedVoicedNotes : null)
    ?? undefined

  // Compute piano scale from panel width (panel inner width minus padding ~ width - 36)
  const availableWidth = Math.max(180, width - 36)
  const pianoScale = Math.max(0.55, Math.min(2.2, availableWidth / PIANO_NATIVE_WIDTH))

  return (
    <aside
      style={{
        gridArea: 'right',
        background: 'var(--cc-bg-base)',
        borderLeft: '1px solid var(--cc-border-soft)',
        padding: '1rem .9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.85rem',
        overflowY: 'auto',
      }}
    >
      {/* PROGRESSION STYLE (intelligent voicings) */}
      <ProgressionVoicingPicker />

      {/* PER-CHORD VOICING â€” hidden from UI, preserved for future use */}
      {/* <div>
        <div style={label}>PER-CHORD VOICING</div>
        <select value={activeVoicing} onChange={(e) => handleVoicing(e.target.value as VoicingType)} style={dropdown}>
          {VOICING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div> */}

      {/* INVERSION + DROP 2 — hidden from UI; the variant arrows above
          (Root position / 1st inversion / 2nd inversion / Drop 2) already
          give the same control for the Standard style. */}

      {/* PIANO VIEW toggle */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={label}>{isChordMode ? 'CHORD NOTES' : 'SCALE NOTES'}</span>
          <div style={{ display: 'flex', border: '1px solid var(--cc-border)', borderRadius: 6, overflow: 'hidden' }}>
            {(['scale', 'chord'] as const).map(v => (
              <button
                key={v}
                onClick={() => setPianoView(v)}
                style={{
                  border: 'none',
                  padding: '.2rem .5rem',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: pianoView === v ? 'var(--cc-accent)' : 'transparent',
                  color: pianoView === v ? '#fff' : 'var(--cc-text-mute)',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: '.15s',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Piano keyboard wrapper â€” scales with panel width */}
        <div
          style={{
            background: 'var(--cc-bg-panel)',
            border: '1px solid var(--cc-border-soft)',
            borderRadius: 10,
            padding: 10,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div
            style={{
              transform: `scale(${pianoScale})`,
              transformOrigin: 'top left',
              width: PIANO_NATIVE_WIDTH,
              height: PIANO_NATIVE_HEIGHT * pianoScale,
            }}
          >
            <PianoKeyboard
              highlightedNotes={pianoNotes}
              noteMode={isChordMode ? 'chord' : 'scale'}
              bassNote={pianoBassNote}
              voicedNotes={voicedNotes}
            />
          </div>
        </div>
      </div>

      {/* BASS NOTE */}
      <div>
        <div style={label}>BASS NOTE</div>
        {selectedIndex === null ? (
          <div style={{
            fontSize: 11, color: 'var(--cc-text-mute)',
            fontStyle: 'italic', padding: '.4rem 0',
          }}>
            select a chord to edit
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 3 }}>
            {CHROMATIC.map(note => {
              const isActive = activeBass === note
              const isRoot = chordRoot === note
              return (
                <button
                  key={note}
                  onClick={() => handleBassClick(note)}
                  title={isRoot ? 'root note' : undefined}
                  style={{
                    flex: 1,
                    background: isActive ? '#a06b7a' : 'var(--cc-bg-elev)',
                    border: `1px solid ${isActive ? '#8b5868' : isRoot ? 'rgba(196,134,154,.45)' : 'var(--cc-border)'}`,
                    color: isActive ? '#f5f1e8' : isRoot ? '#c4869a' : 'var(--cc-text-dim)',
                    borderRadius: 5,
                    padding: '.35rem 0',
                    fontSize: 10,
                    fontWeight: isActive || isRoot ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: '.15s',
                    minWidth: 0,
                    textAlign: 'center',
                  }}
                >
                  {DISPLAY[note] ?? note}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

const label: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.18em', color: 'var(--cc-text-mute)',
  fontWeight: 600, marginBottom: '.4rem', display: 'inline-block',
}
const dropdown: React.CSSProperties = {
  width: '100%',
  background: 'var(--cc-bg-elev)',
  border: '1px solid var(--cc-border)',
  color: 'var(--cc-text)',
  borderRadius: 8,
  padding: '.55rem .65rem',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  background: active ? 'var(--cc-accent)' : 'var(--cc-bg-elev)',
  border: `1px solid ${active ? 'var(--cc-accent)' : 'var(--cc-border)'}`,
  color: active ? '#fff' : 'var(--cc-text-dim)',
  borderRadius: 8,
  padding: '.45rem .35rem',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: '.15s',
  fontFamily: 'DM Sans, sans-serif',
})

// ── Progression-style picker ───────────────────────────────────────

function ProgressionVoicingPicker() {
  const {
    progressionVoicing, setProgressionVoicing, reshuffleVoicing,
    progression, selectedIndex, cycleChordVariant,
  } = useStore()
  const styleInfo = VOICING_STYLES.find(s => s.id === progressionVoicing)
  const selectedChord = selectedIndex !== null ? progression[selectedIndex] : null
  const currentVariant = (selectedChord?.voicingVariant ?? 0) % 4

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={label}>PROGRESSION STYLE</span>
        {progressionVoicing && (
          <span style={{ fontSize: 9, color: 'var(--cc-accent)', letterSpacing: '.05em' }}>
            ● ACTIVE
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={progressionVoicing ?? ''}
          onChange={(e) => {
            if (e.target.value === '') return
            setProgressionVoicing(e.target.value)
          }}
          style={{ ...dropdown, flex: 1 }}
        >
          <option value="">— Choose style —</option>
          {VOICING_STYLES.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={reshuffleVoicing}
          disabled={!progressionVoicing || progression.length === 0}
          title={progressionVoicing
            ? 'Cycle every chord to its next variant'
            : 'Pick a style first'}
          style={{
            background: progressionVoicing ? 'var(--cc-accent)' : 'var(--cc-bg-elev)',
            border: '1px solid var(--cc-border)',
            color: progressionVoicing ? '#fff' : 'var(--cc-text-mute)',
            borderRadius: 8,
            padding: '0 .7rem',
            fontSize: 14,
            cursor: progressionVoicing && progression.length > 0 ? 'pointer' : 'not-allowed',
            opacity: progressionVoicing && progression.length > 0 ? 1 : 0.5,
            transition: '.15s',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
↻
        </button>
      </div>
      {styleInfo && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--cc-text-mute)', lineHeight: 1.35 }}>
          {styleInfo.description}
          {selectedChord && selectedIndex !== null && (
            <div style={{
              marginTop: 5, color: 'var(--cc-text-dim)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>Selected:</span>
              <button
                onClick={() => cycleChordVariant(selectedIndex, -1)}
                title="Previous variant for this chord"
                style={arrowBtn}
              >‹</button>
              <strong style={{ color: 'var(--cc-text)', minWidth: 90, textAlign: 'center' }}>
                {styleInfo.variantLabels[currentVariant] ?? `Variant ${currentVariant + 1}`}
              </strong>
              <button
                onClick={() => cycleChordVariant(selectedIndex, 1)}
                title="Next variant for this chord"
                style={arrowBtn}
              >›</button>
              <span style={{ opacity: .6 }}>· {currentVariant + 1} / 4</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const arrowBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--cc-border)',
  color: 'var(--cc-text)',
  borderRadius: 5,
  width: 20, height: 20,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
}

