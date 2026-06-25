
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useChordPreview } from '@/hooks/useChordPreview'
import { suggestNext, getMood, type MoodSuggestion } from '@/lib/moodEngine'
import { MOOD_COLOR } from './MoodSidebar'

// We always pull every available transition. Mood data tops out around
// ~12-15 candidates per source function, so 60 is plenty of headroom.
const MAX_SUGGESTIONS = 60

export default function SuggestedChords() {
  const {
    root, scaleType, progression,
    activeMood, moodIntensity,
  } = useStore()
  const preview = useChordPreview()

  const moodLabel = useMemo(() => getMood(activeMood)?.label ?? 'Mood', [activeMood])
  const chipColor = MOOD_COLOR[activeMood] ?? 'var(--cc-accent)'

  const suggestions: MoodSuggestion[] = useMemo(() => {
    const mood = getMood(activeMood)
    if (!mood) return []
    return suggestNext({
      mood, root, scaleType, progression,
      intensity: moodIntensity,
      topN: MAX_SUGGESTIONS,
    })
  }, [activeMood, moodIntensity, root, scaleType, progression])

  return (
    <section style={{ padding: '0 1.5rem 1rem' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: '.5rem',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '.18em', color: 'var(--cc-text-mute)',
          fontWeight: 600,
        }}>
          SUGGESTED NEXT CHORDS
        </div>
        <div style={{ fontSize: 10, color: chipColor, letterSpacing: '.1em', fontWeight: 600 }}>
          ◆ {moodLabel.toUpperCase()} · {suggestions.length}
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div style={{
          color: 'var(--cc-text-mute)', fontSize: 11, fontStyle: 'italic',
          padding: '.5rem',
        }}>
          No suggestions for this chord in {moodLabel}. Try changing the mood or the previous chord.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {suggestions.map((sug, i) => {
            const { transition, chord, fromBigram, inMode } = sug
            const borderColor = inMode ? chipColor : `${chipColor}30`
            const titleParts: string[] = []
            if (fromBigram) titleParts.push('Two-chord-context suggestion')
            titleParts.push(inMode ? 'In current mode' : 'Borrowed / out of mode')
            return (
              <div
                key={`${transition.next}-${transition.label}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  background: inMode ? 'var(--cc-bg-panel)' : 'transparent',
                  border: `1px ${inMode ? 'solid' : 'dashed'} ${borderColor}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  minWidth: 130,
                  transition: '.18s',
                  opacity: inMode ? 1 : 0.78,
                }}
                title={titleParts.join(' · ')}
              >
                <button
                  onClick={() => preview(chord, false)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '.5rem .7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    color: 'var(--cc-text)',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: 9, color: chipColor, fontWeight: 600,
                    letterSpacing: '.05em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {fromBigram ? '◆◆' : '◆'} {transition.label}
                  </span>
                  <span style={{
                    fontSize: 15, color: 'var(--cc-text)',
                    fontFamily: 'var(--font-fraunces)', fontWeight: 500,
                  }}>
                    {chord.displayName}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--cc-text-mute)' }}>
                    {transition.next}
                  </span>
                </button>

                <button
                  onClick={() => preview(chord)}
                  title="Add to progression"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderLeft: `1px solid ${chipColor}40`,
                    padding: '0 .6rem',
                    cursor: 'pointer',
                    color: chipColor,
                    fontSize: 16,
                    fontWeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${chipColor}20` }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  +
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
