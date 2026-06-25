
import { useStore } from '@/lib/store'
import { getDiatonicChords, getDiatonic6Chords } from '@/lib/theory'
import { useChordPreview } from '@/hooks/useChordPreview'
import type { ChordEntry, Extension } from '@/types/music'

const DEGREE_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const EXT_ROW_LABEL: Record<Extension, string> = {
  triad: 'Triads',
  '7': '7th chords',
  '9': '9th chords',
  '11': '11th chords',
  '13': '13th chords',
}

const EXT_ORDER: Extension[] = ['triad', '7', '9', '11', '13']

// Muted-teal outlined pill — matches the cinematic palette used elsewhere
// in the right panel (BASS NOTE pads, Mood cards) instead of shouting in
// saturated cyan.
const PILL_TEAL = '#7fa8b8'

const pillWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: '.5rem',
  overflow: 'hidden',
  minHeight: '2.2rem',
  border: `1px solid ${PILL_TEAL}`,
}

const chordPartStyle = (_bg: string): React.CSSProperties => ({
  flex: 1,
  border: 'none',
  padding: '.35rem .15rem',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
  lineHeight: 1.15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: PILL_TEAL,
  transition: '.18s',
  position: 'relative',
})

const addPartStyle = (_bg: string): React.CSSProperties => ({
  border: 'none',
  borderLeft: `1px solid ${PILL_TEAL}`,
  padding: '0 .45rem',
  background: 'transparent',
  color: PILL_TEAL,
  fontSize: '.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: '.18s',
})

export default function DiatonicChords() {
  const { root, scaleType, extensions } = useStore()
  const preview = useChordPreview()

  // Render in a fixed order so rows don't jump around
  const activeExts = EXT_ORDER.filter(e => extensions.includes(e))
  const show6ths = extensions.includes('7')
  const sixthChords = show6ths ? getDiatonic6Chords(root, scaleType) : null

  function renderChordRow(chords: (ChordEntry | null)[]) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.3rem', marginBottom: '.3rem' }}>
        {chords.map((chord, i) => {
          if (!chord) {
            return <div key={i} style={{ minHeight: '2.2rem', borderRadius: '.5rem', background: 'rgba(0,0,0,.04)', border: '1px dashed var(--color-border)' }} />
          }
          return (
            <div
              key={i}
              style={pillWrap}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <button onClick={() => preview(chord, false)} style={chordPartStyle('var(--color-cyan)')}>
                {chord.displayName}
              </button>
              <button onClick={() => preview(chord)} title="Add to progression" style={addPartStyle('var(--color-cyan)')}>+</button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.3rem', marginBottom: '.2rem' }}>
        {DEGREE_LABELS.map((l) => (
          <div key={l} style={{ textAlign: 'center', fontSize: '.72rem', fontWeight: 600, color: 'var(--color-muted)', padding: '.3rem 0' }}>
            {l}
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '.88rem', fontWeight: 500, textAlign: 'center', margin: '.75rem 0 .4rem', color: 'var(--color-muted)' }}>
        Diatonic Chords
      </div>

      {/* One diatonic row per active extension */}
      {activeExts.map(ext => (
        <div key={ext}>
          {activeExts.length > 1 && (
            <div style={{ fontSize: '.68rem', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '.2rem' }}>
              {EXT_ROW_LABEL[ext]}
            </div>
          )}
          {renderChordRow(getDiatonicChords(root, scaleType, ext))}
        </div>
      ))}

      {/* 6th chord row (paired with 7th) */}
      {sixthChords && (
        <>
          <div style={{ fontSize: '.68rem', color: 'var(--color-muted)', textAlign: 'center', marginBottom: '.2rem' }}>
            6th chords
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.3rem', marginBottom: '.3rem' }}>
            {sixthChords.map((chord, i) => {
              if (!chord) {
                return <div key={i} style={{ minHeight: '2.2rem', borderRadius: '.5rem', background: 'rgba(0,0,0,.04)', border: '1px dashed var(--color-border)' }} />
              }
              return (
                <div key={i} style={pillWrap}>
                  <button onClick={() => preview(chord, false)} style={chordPartStyle('var(--color-cyan)')}>
                    {chord.displayName}
                  </button>
                  <button onClick={() => preview(chord)} title="Add to progression" style={addPartStyle('var(--color-cyan)')}>+</button>
                </div>
              )
            })}
          </div>
        </>
      )}

    </>
  )
}
