
import { useStore } from '@/lib/store'
import { getSusChords, getSusExtRow } from '@/lib/theory'
import { useChordPreview } from '@/hooks/useChordPreview'
import type { ChordEntry } from '@/types/music'
import type { SusExtChord } from '@/lib/theory'

// Match the outlined dusty-teal style from DiatonicChords so sus rows
// stay visually consistent with the rest of the chord picker.
const PILL_TEAL = '#7fa8b8'

const pillWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: '.5rem',
  overflow: 'hidden',
  minHeight: '2.2rem',
  border: `1px solid ${PILL_TEAL}`,
}

const baseBtn: React.CSSProperties = {
  border: 'none',
  padding: '.35rem .15rem',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  color: PILL_TEAL,
  background: 'transparent',
  transition: '.18s',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 0,
}

const addPart = (_bg: string): React.CSSProperties => ({
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
  borderRadius: 0,
})

export default function SusChords() {
  const { root, scaleType, extensions } = useStore()
  const { sus2, sus4 } = getSusChords(root, scaleType)
  const preview = useChordPreview()

  // Extended sus rows based on active extensions
  const has = (e: string) => extensions.includes(e as any)
  const sus2ext7  = has('7')  ? getSusExtRow(root, scaleType, 'sus2', 6, '7')  : null
  const sus4ext7  = has('7')  ? getSusExtRow(root, scaleType, 'sus4', 6, '7')  : null
  const sus4ext9  = has('9')  ? getSusExtRow(root, scaleType, 'sus4', 1, '9')  : null
  const sus2ext11 = has('11') ? getSusExtRow(root, scaleType, 'sus2', 3, '11') : null
  const sus2ext13 = has('13') ? getSusExtRow(root, scaleType, 'sus2', 5, '13') : null
  const sus4ext13 = has('13') ? getSusExtRow(root, scaleType, 'sus4', 5, '13') : null

  const renderBaseRow = (chords: SusExtChord[], label: string) => (
    <div style={{ marginBottom: '.3rem' }}>
      <div style={{ fontSize: '.68rem', color: 'var(--color-muted)', marginBottom: '.2rem', textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.3rem' }}>
        {chords.map((chord, i) => {
          if (chord.badFifth) {
            return <div key={i} style={{ minHeight: '2.2rem', borderRadius: '.5rem', background: 'rgba(0,0,0,.04)', border: '1px dashed var(--color-border)' }} />
          }
          return (
            <div
              key={i}
              style={pillWrap}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <button onClick={() => preview(chord, false)} style={baseBtn}>
                {chord.displayName}
              </button>
              <button onClick={() => preview(chord)} style={addPart('var(--color-cyan)')}>+</button>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderExtRow = (chords: (SusExtChord | null)[], label: string) => (
    <div style={{ marginBottom: '.3rem' }}>
      <div style={{ fontSize: '.68rem', color: 'var(--color-muted)', marginBottom: '.2rem', textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.3rem' }}>
        {chords.map((chord, i) => {
          if (!chord) {
            return (
              <div
                key={i}
                style={{
                  minHeight: '2.2rem',
                  borderRadius: '.5rem',
                  background: 'rgba(0,0,0,.04)',
                  border: '1px dashed var(--color-border)',
                }}
              />
            )
          }
          if (chord.badFifth) {
            return (
              <div
                key={i}
                style={{
                  minHeight: '2.2rem',
                  borderRadius: '.5rem',
                  background: 'rgba(0,0,0,.04)',
                  border: '1px dashed var(--color-border)',
                }}
              />
            )
          }
          return (
            <div
              key={i}
              style={pillWrap}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <button onClick={() => preview(chord, false)} style={baseBtn}>
                {chord.displayName}
              </button>
              <button onClick={() => preview(chord)} style={addPart('var(--color-cyan)')}>+</button>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {renderBaseRow(sus2, 'sus2')}
      {sus2ext7  && renderExtRow(sus2ext7,  'sus2 + 7')}
      {sus2ext11 && renderExtRow(sus2ext11, 'sus2 + 11')}
      {sus2ext13 && renderExtRow(sus2ext13, 'sus2 + 13')}

      {renderBaseRow(sus4, 'sus4')}
      {sus4ext7  && renderExtRow(sus4ext7,  'sus4 + 7')}
      {sus4ext9  && renderExtRow(sus4ext9,  'sus4 + 9')}
      {sus4ext13 && renderExtRow(sus4ext13, 'sus4 + 13')}
    </>
  )
}
