
import { useStore } from '@/lib/store'

export interface Mood {
  id: string
  name: string
  hint: string
  icon: string
  color: string
}

// Visual metadata for each mood. The `id`s must stay in sync with
// the keys exposed by `lib/moodEngine/data` so the engine can resolve
// the active mood definition.
export const MOODS: Mood[] = [
  { id: 'epic',      name: 'Epic',      hint: 'Powerful, grand, heroic',     icon: '👑', color: 'var(--cc-accent)' },
  { id: 'dark',      name: 'Dark',      hint: 'Mysterious, ominous',         icon: '◆',  color: '#6b5bd9' },
  { id: 'hopeful',   name: 'Hopeful',   hint: 'Uplifting, inspiring',        icon: '✿',  color: '#5ec577' },
  { id: 'sad',       name: 'Sad',       hint: 'Melancholic, emotional',      icon: '☁',  color: '#4a8dc4' },
  { id: 'tension',   name: 'Tension',   hint: 'Suspenseful, intense',        icon: '〰', color: 'var(--cc-warn)' },
  { id: 'mystery',   name: 'Mystery',   hint: 'Curious, uncertain',          icon: '?',  color: '#9b6dc4' },
  { id: 'fantasy',   name: 'Fantasy',   hint: 'Magical, otherworldly',       icon: '✦',  color: '#c668b8' },
  { id: 'adventure', name: 'Adventure', hint: 'Bold, exciting, dynamic',     icon: '⚐',  color: '#c4914a' },
  { id: 'love',      name: 'Love',      hint: 'Romantic, warm',              icon: '♥',  color: '#e687a0' },
  { id: 'horror',    name: 'Horror',    hint: 'Dark, scary, eerie',          icon: '☠',  color: '#c44a4a' },
]

/** Map mood id -> primary colour used in the chip border in SuggestedChords */
export const MOOD_COLOR: Record<string, string> = Object.fromEntries(
  MOODS.map(m => [m.id, m.color]),
)

export default function MoodSidebar() {
  const { activeMood, setActiveMood } = useStore()
  const active = activeMood

  return (
    <aside
      style={{
        gridArea: 'left',
        background: 'var(--cc-bg-base)',
        borderRight: '1px solid var(--cc-border-soft)',
        padding: '1rem .75rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '.4rem',
      }}
    >
      <div style={sectionLabel}>MOOD</div>

      {MOODS.map(m => {
        const isActive = active === m.id
        return (
          <button
            key={m.id}
            onClick={() => setActiveMood(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              padding: '.55rem .65rem',
              borderRadius: 10,
              background: isActive ? 'rgba(139,125,217,.16)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(139,125,217,.5)' : 'transparent'}`,
              color: 'var(--cc-text)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: '.15s',
              fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--cc-bg-elev)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: isActive ? m.color : 'var(--cc-bg-elev)',
                color: isActive ? '#fff' : m.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}
            >
              {m.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.15 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: 'var(--cc-text-mute)', lineHeight: 1.2 }}>{m.hint}</div>
            </div>
          </button>
        )
      })}

    </aside>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.18em',
  color: 'var(--cc-text-mute)',
  padding: '.3rem .65rem .6rem',
  fontWeight: 600,
}
