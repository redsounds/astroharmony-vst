
import ScaleExtensionRow from './ScaleExtensionRow'
import DiatonicChords from '@/components/picker/DiatonicChords'
import SusChords from '@/components/picker/SusChords'
/**
 * Dark-themed chord picker section for the redesign.
 * Uses our v2 ScaleExtensionRow (dark) on top + the existing
 * DiatonicChords / SusChords / OtherChordsTabs (already styled with
 * cyan pills that read fine on dark).
 */
export default function DarkChordPicker() {
  return (
    <section
      className="cc-dark-picker"
      style={{
        margin: '0 1.5rem 1rem',
        background: 'var(--cc-bg-panel)',
        borderRadius: 14,
        border: '1px solid var(--cc-border-soft)',
        padding: '1rem 1.2rem',
        color: 'var(--cc-text)',
      }}
    >
      <style>{`
        .cc-dark-picker [style*="color: var(--color-muted)"] { color: var(--cc-text-mute) !important; }
        .cc-dark-picker [style*="color: var(--color-text)"] { color: var(--cc-text) !important; }
        .cc-dark-picker [style*="background: rgba(0,0,0,.04)"] { background: rgba(255,255,255,.03) !important; }
        .cc-dark-picker [style*="border: 1px dashed var(--color-border)"] {
          border-color: var(--cc-border) !important;
        }
        .cc-dark-picker [style*="border-bottom: 1px solid var(--color-border)"] {
          border-color: var(--cc-border-soft) !important;
        }
        .cc-dark-picker [style*="border-top: 1px solid var(--color-border)"] {
          border-color: var(--cc-border-soft) !important;
        }
      `}</style>

      <ScaleExtensionRow />
      <DiatonicChords />
      <SusChords />
    </section>
  )
}
