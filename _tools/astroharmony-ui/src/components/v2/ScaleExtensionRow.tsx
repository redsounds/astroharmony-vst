
import { useStore } from '@/lib/store'
import { ALL_MODES } from '@/lib/theory'
import { getMood } from '@/lib/moodEngine'
import { MOOD_COLOR } from './MoodSidebar'
import type { ScaleType, Extension } from '@/types/music'

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_DISPLAY: Record<string, string> = {
  'C#': 'C♯', 'D#': 'D♯', 'F#': 'F♯', 'G#': 'G♯', 'A#': 'A♯',
}
const fmt = (n: string) => NOTE_DISPLAY[n] ?? n

const FAMILY_LABELS = {
  ionian: 'Ionian Family',
  harmonic_minor: 'Harmonic Minor Family',
  melodic_minor: 'Melodic Minor Family',
} as const
const FAMILIES = ['ionian', 'harmonic_minor', 'melodic_minor'] as const

const TABS: { value: Extension; label: string }[] = [
  { value: 'triad', label: 'Triad' },
  { value: '7',     label: '6&7' },
  { value: '9',     label: '9' },
  { value: '11',    label: '11' },
  { value: '13',    label: '13' },
]

const darkSelect: React.CSSProperties = {
  background: 'var(--cc-bg-elev)',
  border: '1px solid var(--cc-border)',
  borderRadius: 8,
  padding: '.5rem .65rem',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--cc-text)',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%239b9ab8' d='M5 6L0 0h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right .65rem center',
  paddingRight: '1.8rem',
  outline: 'none',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--cc-text-mute)',
  marginBottom: '.4rem',
  letterSpacing: '.18em',
}

export default function ScaleExtensionRow() {
  const { root, scaleType, extensions, activeMood, setRoot, setScaleType, toggleExtension } = useStore()
  const mood = getMood(activeMood)
  const preferred = new Set(mood?.preferredModes ?? [])
  const moodColor = MOOD_COLOR[activeMood] ?? 'var(--cc-accent)'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.1rem',
      }}
    >
      {/* SCALE / MODE */}
      <div>
        <div style={sectionLabel}>SCALE / MODE</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            style={{ ...darkSelect, minWidth: 70 }}
          >
            {NOTES.map((n) => <option key={n} value={n}>{fmt(n)}</option>)}
          </select>
          <select
            value={scaleType}
            onChange={(e) => setScaleType(e.target.value as ScaleType)}
            style={{ ...darkSelect, minWidth: 215 }}
          >
            {FAMILIES.map(fam => (
              <optgroup key={fam} label={FAMILY_LABELS[fam]}>
                {ALL_MODES.filter(m => m.family === fam).map(m => {
                  const isPreferred = preferred.has(m.key)
                  return (
                    <option key={m.key} value={m.key}>
                      {isPreferred ? '★ ' : '  '}{m.name}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
        </div>
        {mood && preferred.size > 0 && (
          <div style={{
            fontSize: 10, color: 'var(--cc-text-mute)',
            marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap',
          }}>
            <span>{mood.label} prefers:</span>
            {[...preferred].map(modeKey => {
              const def = ALL_MODES.find(m => m.key === modeKey)
              if (!def) return null
              const isActive = scaleType === modeKey
              return (
                <button
                  key={modeKey}
                  onClick={() => setScaleType(modeKey as ScaleType)}
                  style={{
                    background: isActive ? `${moodColor}30` : 'transparent',
                    border: `1px solid ${isActive ? moodColor : `${moodColor}50`}`,
                    color: isActive ? 'var(--cc-text)' : moodColor,
                    borderRadius: 99,
                    padding: '1px 8px',
                    fontSize: 10,
                    fontFamily: 'DM Sans, sans-serif',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: '.15s',
                  }}
                >
                  {def.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* EXTENSIONS */}
      <div>
        <div style={sectionLabel}>EXTENSIONS</div>
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--cc-border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {TABS.map(({ value, label }, i) => {
            const active = extensions.includes(value)
            return (
              <button
                key={value}
                onClick={() => toggleExtension(value)}
                style={{
                  border: 'none',
                  borderRight: i < TABS.length - 1 ? '1px solid var(--cc-border)' : 'none',
                  padding: '.45rem .85rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '.18s',
                  background: active ? '#5a7d82' : 'var(--cc-bg-elev)',
                  color: active ? '#f5f1e8' : '#7fa8b8',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
