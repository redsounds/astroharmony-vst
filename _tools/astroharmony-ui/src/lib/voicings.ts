/**
 * Voicings library — every progression-level style.
 *
 * Each style takes a list of chord tones (pitch classes ordered as
 * R, 3, 5, 7, 9, 11, 13 — i.e. how the chord-builder stacks them)
 * and a variant index 0-3, and returns a list of note names with
 * specific octave numbers ready for the sampler.
 */

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', 'E#': 'F', 'B#': 'C',
  // Double-sharps & double-flats. Tonal's `Note.transpose` happily returns
  // these for unusual roots (e.g. B♯°7's bb7 comes back as G##), and they
  // need to flatten to a single-accidental sharp so CHROMATIC.indexOf works
  // and the piano renderer's regex can still parse the result.
  'C##': 'D', 'D##': 'E', 'E##': 'F#', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'C#',
  Dbb: 'C', Ebb: 'D', Fbb: 'D#', Gbb: 'F', Abb: 'G', Bbb: 'A', Cbb: 'A#',
}

function toSharp(n: string): string {
  const ascii = n
    .replace(/𝄪/g, '##').replace(/𝄫/g, 'bb')
    .replace(/♯/g, '#').replace(/♭/g, 'b')
  return FLAT_TO_SHARP[ascii] ?? ascii
}
function pcOf(n: string): number { return CHROMATIC.indexOf(toSharp(n)) }

/** Return note name + octave so its pitch sits at or just above `minMidi`. */
function placeAtOrAbove(note: string, minMidi: number): string {
  const sharp = toSharp(note)
  const pc = CHROMATIC.indexOf(sharp)
  if (pc < 0) return `${sharp}4`
  // Sampler expects note + octave string. MIDI: (oct+1)*12 + pc
  for (let oct = -1; oct <= 9; oct++) {
    const midi = (oct + 1) * 12 + pc
    if (midi >= minMidi) return `${sharp}${oct}`
  }
  return `${sharp}4`
}

/** Quick MIDI value of a note-with-octave string (sharps only). */
function midiOf(noteWithOct: string): number {
  const note = noteWithOct.replace(/-?\d+$/, '')
  const octMatch = noteWithOct.match(/-?\d+$/)
  const oct = octMatch ? parseInt(octMatch[0], 10) : 4
  const pc = pcOf(note)
  return (oct + 1) * 12 + (pc < 0 ? 0 : pc)
}

/** Sort an array of note-with-octave strings ascending by MIDI value. */
function sortByPitch(notes: string[]): string[] {
  return [...notes].sort((a, b) => midiOf(a) - midiOf(b))
}

/** Reference MIDI values for register placement. */
const M = {
  veryLow: 24,   // C1
  low: 36,       // C2
  bass: 41,      // F2 — typical LH bass start
  mid: 60,       // C4
  upMid: 65,     // F4
  high: 72,      // C5
  veryHigh: 79,  // G5
} as const

// ── Voicing functions ──────────────────────────────────────────────

export interface VoicingContext {
  /** Pitch classes of the chord tones in stacked-thirds order. */
  notes: string[]
  /** 0-3 variant index. */
  variant: number
  /** The previous chord's voiced notes (with octaves) — voice-leading uses this. */
  prevVoicing?: string[] | null
}

type VoicingFn = (ctx: VoicingContext) => string[]

// 1. STANDARD — root position close voicing
const standard: VoicingFn = ({ notes, variant }) => {
  // Variants are real inversions: the picked tone(s) are placed
  // above the rest of the chord rather than below.
  const aboveIdx = variant === 1 && notes.length >= 3 ? [0] :
                   variant === 2 && notes.length >= 3 ? [0, 1] :
                   []
  const baseNotes = notes.filter((_, i) => !aboveIdx.includes(i))
  const topNotes  = aboveIdx.map(i => notes[i])

  const out: string[] = []
  let minMidi = M.mid - 5
  for (const n of baseNotes) {
    const placed = placeAtOrAbove(n, minMidi)
    out.push(placed)
    minMidi = midiOf(placed) + 1
  }
  for (const n of topNotes) {
    const placed = placeAtOrAbove(n, minMidi)
    out.push(placed)
    minMidi = midiOf(placed) + 1
  }

  // V3 = drop-2: take 2nd-from-top voice an octave down.
  if (variant === 3 && out.length >= 4) {
    const sorted = sortByPitch(out)
    const idx = sorted.length - 2
    const n = sorted[idx]
    sorted[idx] = `${n.replace(/-?\d+$/, '')}${parseInt(n.match(/-?\d+$/)![0]) - 1}`
    return sortByPitch(sorted)
  }
  return out
}

// 2. CINEMATIC — modern film-score wide spacing
const cinematic: VoicingFn = ({ notes, variant }) => {
  const root = notes[0]
  const upper = notes.slice(1).filter(Boolean) as string[]
  // Skipping the 5th is only meaningful when there are colour tones above it.
  const richEnoughForSkip = upper.length >= 3
  // The "bass" field is where the CHORD ROOT lands — a separate slash-bass
  // tone is added later by ensureBassLowest one octave below the lowest
  // chord-tone. To leave that octave free, the chord root must stay above
  // M.low (C2); otherwise the slash bass collapses into the chord root and
  // the piano view loses both the pink bass marker AND one chord note.
  const layouts: Array<{ bass: number; upperStart: number; skipFifth?: boolean }> = [
    { bass: M.low,  upperStart: M.upMid },                              // 0 Wide deep   — root C2, voices F4+
    { bass: M.low,  upperStart: M.high, skipFifth: richEnoughForSkip }, // 1 High & airy — root C2, voices C5+
    { bass: M.bass, upperStart: M.mid },                                 // 2 Choir cluster — root F2, voices C4+ (was C1 — collapsed bass)
    { bass: M.low,  upperStart: M.upMid + 5 },                           // 3 Spread to top — root C2, voices ~B4+ (was A#1 — collapsed bass)
  ]
  const layout = layouts[variant % 4]
  const bass = placeAtOrAbove(root, layout.bass)
  let minMidi = layout.upperStart
  const upperNotes: string[] = []
  for (let i = 0; i < upper.length; i++) {
    if (layout.skipFifth && i === 1) continue
    const placed = placeAtOrAbove(upper[i], minMidi)
    upperNotes.push(placed)
    minMidi = midiOf(placed) + 2
  }
  return sortByPitch([bass, ...upperNotes])
}

// 3. PIANO SPREAD — LH root + 5th, RH 3-7-9 cluster
const pianoSpread: VoicingFn = ({ notes, variant }) => {
  const root = notes[0]
  const third = notes[1]
  const fifth = notes[2]
  const seventh = notes[3]
  const ninth = notes[4]
  const eleventh = notes[5]
  const hasUpperTones = !!(seventh || ninth || eleventh)

  const lhMinByVariant = [M.low, M.low, M.bass, M.veryLow]
  const lhMin = lhMinByVariant[variant % 4]
  const rhMinByVariant = [M.mid, M.upMid, M.mid + 2, M.high]
  const rhMin = rhMinByVariant[variant % 4]

  const lh: string[] = [placeAtOrAbove(root, lhMin)]
  // Variant 2 normally drops the 5th from LH; keep it for triads that have no
  // upper extensions, otherwise the chord ends up missing its 5th entirely.
  if (fifth && (variant !== 2 || !hasUpperTones)) {
    lh.push(placeAtOrAbove(fifth, midiOf(lh[0]) + 6))
  }

  const rhCandidates = [third, seventh, ninth, eleventh].filter(Boolean) as string[]
  // For triads (no 7/9/11) the RH would be a single 3rd — pad with the 5th
  // so the chord stays a full triad voiced as LH bass + RH 3+5.
  if (!hasUpperTones && fifth) {
    rhCandidates.push(fifth)
  }
  const rh: string[] = []
  let minMidi = rhMin
  for (const n of rhCandidates) {
    const placed = placeAtOrAbove(n, minMidi)
    rh.push(placed)
    minMidi = midiOf(placed) + 1
  }
  return sortByPitch([...lh, ...rh])
}

// 4. JAZZ SHELL — rootless Bill Evans guide-tone voicings
const jazz: VoicingFn = ({ notes, variant }) => {
  // Need at least a 7th
  const third = notes[1]
  const fifth = notes[2]
  const seventh = notes[3]
  const ninth = notes[4]
  if (!seventh) {
    // No 7th — fall back to a Standard close voicing
    return standard({ notes, variant })
  }
  const layouts: string[][] = [
    [third, fifth, seventh],            // V1: 3-5-7 close
    [seventh, third, fifth],            // V2: 7-3-5 (Bill Evans A)
    [third, seventh, ninth ?? fifth],   // V3: 3-7-9
    [seventh, ninth ?? third, third],   // V4: 7-9-3 high
  ]
  const layout = layouts[variant % 4]
  const out: string[] = []
  let minMidi = variant >= 2 ? M.upMid : M.mid
  for (const n of layout) {
    const placed = placeAtOrAbove(n, minMidi)
    out.push(placed)
    minMidi = midiOf(placed) + 1
  }
  return sortByPitch(out)
}

// 5. NEO SOUL — rootless + extensions (Robert Glasper)
const neoSoul: VoicingFn = ({ notes, variant }) => {
  const third = notes[1]
  const fifth = notes[2]
  const seventh = notes[3]
  const ninth = notes[4]
  const eleventh = notes[5]
  const thirteenth = notes[6]

  // Always filter undefined out at construction time.
  const layouts: string[][] = [
    [third, seventh ?? fifth, ninth ?? fifth].filter(Boolean) as string[],
    [seventh ?? fifth, third, ninth ?? fifth, thirteenth ?? eleventh ?? fifth].filter(Boolean) as string[],
    [third, ninth ?? fifth, seventh ?? fifth, thirteenth ?? eleventh ?? fifth].filter(Boolean) as string[],
    [seventh ?? fifth, ninth ?? fifth, third, fifth].filter(Boolean) as string[],
  ]
  // Drop accidental duplicates (e.g. when a triad falls back to 5th in two slots)
  const unique = (xs: string[]) => Array.from(new Set(xs))
  const layout = unique(layouts[variant % 4])

  // For pure triads ensure we still emit the full chord, not just one note.
  if (layout.length < 3 && fifth) {
    if (!layout.includes(notes[0])) layout.unshift(notes[0])
  }

  const out: string[] = []
  // Variant 3 ("7-9-3-5 high") sits a 3rd above the other variants so it
  // reads as the airy/bright option, without jumping a full 5th and
  // floating disconnected from the rest of the Neo Soul style.
  let minMidi = variant === 3 ? M.upMid + 2 : M.upMid - 2
  for (const n of layout) {
    const placed = placeAtOrAbove(n, minMidi)
    out.push(placed)
    minMidi = midiOf(placed) + 2
  }
  // Optional sparse LH root for variants 1 & 2. Sits at M.bass (F2),
  // matching the typical Robert Glasper / D'Angelo left-hand register —
  // any lower (M.low / C2) puts the LH so deep that the slash-bass tone
  // beneath it lands in piano-sub-bass territory and the whole chord
  // feels bottom-heavy compared to Standard / Voice Leading / Open
  // Voicing styles that have no explicit LH.
  if (variant === 1 || variant === 2) {
    out.push(placeAtOrAbove(notes[0], M.bass))
  }
  return sortByPitch(out)
}

// 6. GOSPEL — bass + dense RH cluster
const gospel: VoicingFn = ({ notes, variant }) => {
  const root = notes[0]
  const upper = notes.slice(1).filter(Boolean) as string[]
  const bassConfigs = [
    [M.low],                    // V1: single low bass
    [M.veryLow, M.bass],        // V2: octave bass
    [M.low, M.low + 7],         // V3: root + 5
    [M.veryLow],                // V4: ultra deep
  ]
  const rhStarts = [M.upMid, M.high, M.upMid - 2, M.upMid + 3]

  const bass: string[] = bassConfigs[variant % 4].map(min => placeAtOrAbove(root, min))
  if (variant === 2 && notes[2]) {
    bass[1] = placeAtOrAbove(notes[2], bassConfigs[2][1])
  }

  const rh: string[] = []
  let minMidi = rhStarts[variant % 4]
  for (const n of upper) {
    const placed = placeAtOrAbove(n, minMidi)
    rh.push(placed)
    minMidi = midiOf(placed) + 1  // tight cluster
  }
  return sortByPitch([...bass, ...rh])
}

// 7. VOICE LEADING — pick inversion that minimises motion from previous chord
const voiceLeading: VoicingFn = ({ notes, variant, prevVoicing }) => {
  // Generate candidate voicings: root position + every inversion
  const candidates: string[][] = []
  for (let inv = 0; inv < Math.min(notes.length, 4); inv++) {
    const rotated = [...notes.slice(inv), ...notes.slice(0, inv)]
    const placed: string[] = []
    let minMidi = M.mid - 5
    for (const n of rotated) {
      const p = placeAtOrAbove(n, minMidi)
      placed.push(p)
      minMidi = midiOf(p) + 1
    }
    candidates.push(sortByPitch(placed))
  }
  // Also try shifting each candidate up/down an octave
  const allCandidates: string[][] = []
  for (const c of candidates) {
    allCandidates.push(c)
    allCandidates.push(c.map(n => {
      const note = n.replace(/-?\d+$/, '')
      const oct = parseInt(n.match(/-?\d+$/)![0], 10)
      return `${note}${oct + 1}`
    }))
  }

  if (!prevVoicing || prevVoicing.length === 0) {
    return candidates[variant % candidates.length]
  }

  // Compute "motion cost" — sum of absolute MIDI deltas between matched voices
  function cost(voicing: string[]): number {
    const pv = sortByPitch(prevVoicing!).map(midiOf)
    const cv = sortByPitch(voicing).map(midiOf)
    let total = 0
    const len = Math.min(pv.length, cv.length)
    for (let i = 0; i < len; i++) total += Math.abs(pv[i] - cv[i])
    // Penalise voicings with much more or fewer notes
    total += Math.abs(pv.length - cv.length) * 6
    return total
  }
  const ranked = [...allCandidates].sort((a, b) => cost(a) - cost(b))
  // variant picks the n-th best
  return ranked[variant % ranked.length] ?? candidates[0]
}

// 8. OPEN VOICING — spread across two octaves, perfect intervals priority
const openVoicing: VoicingFn = ({ notes, variant }) => {
  const root = notes[0]
  const third = notes[1]
  const fifth = notes[2]
  const seventh = notes[3]
  const ninth = notes[4]

  const orderings: string[][] = [
    [root, fifth, third, seventh, ninth].filter(Boolean) as string[],
    [root, fifth, seventh, third, ninth].filter(Boolean) as string[],
    [root, third, fifth, seventh, ninth].filter(Boolean) as string[],
    [root, seventh, third, fifth, ninth].filter(Boolean) as string[],
  ]
  const startByVariant = [M.bass, M.low, M.bass + 5, M.low + 3]
  const layout = orderings[variant % 4]
  let minMidi = startByVariant[variant % 4]
  const out: string[] = []
  for (const n of layout) {
    const placed = placeAtOrAbove(n, minMidi)
    out.push(placed)
    minMidi = midiOf(placed) + 4   // larger gap = wider voicing
  }
  return sortByPitch(out)
}

// 9. QUARTAL — stacked fourths from root
const quartal: VoicingFn = ({ notes, variant }) => {
  // Sort by fourth proximity from root, then place ascending
  const pcs = notes.map(pcOf)
  const root = pcs[0]
  const used = new Set<number>([0])
  const order: number[] = [0]
  let current = root
  while (used.size < pcs.length) {
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < pcs.length; i++) {
      if (used.has(i)) continue
      const interval = (pcs[i] - current + 12) % 12
      const dist = Math.abs(interval - 5)
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    }
    if (bestIdx === -1) break
    order.push(bestIdx)
    used.add(bestIdx)
    current = pcs[bestIdx]
  }
  const ordered = order.map(i => notes[i])
  const startMidi = [M.mid - 5, M.mid + 2, M.upMid, M.bass + 5][variant % 4]
  let min = startMidi
  const out: string[] = []
  for (const n of ordered) {
    const p = placeAtOrAbove(n, min)
    out.push(p)
    min = midiOf(p) + 4
  }
  return sortByPitch(out)
}

// 10. CLUSTER — tight close-position from root
const cluster: VoicingFn = ({ notes, variant }) => {
  const root = notes[0]
  const rootSemi = pcOf(root)
  const sorted = [...notes].sort((a, b) =>
    ((pcOf(a) - rootSemi + 12) % 12) - ((pcOf(b) - rootSemi + 12) % 12),
  )
  const startMidi = [M.mid, M.upMid, M.mid - 5, M.high][variant % 4]
  let min = startMidi
  const out: string[] = []
  for (const n of sorted) {
    const p = placeAtOrAbove(n, min)
    out.push(p)
    min = midiOf(p) + 1
  }
  return out
}

// 11. QUINTAL — kept for back-compat; same algorithm idea as quartal but 5ths
const quintal: VoicingFn = ({ notes, variant }) => {
  const pcs = notes.map(pcOf)
  const root = pcs[0]
  const used = new Set<number>([0])
  const order: number[] = [0]
  let current = root
  while (used.size < pcs.length) {
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < pcs.length; i++) {
      if (used.has(i)) continue
      const interval = (pcs[i] - current + 12) % 12
      const dist = Math.abs(interval - 7)
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    }
    if (bestIdx === -1) break
    order.push(bestIdx)
    used.add(bestIdx)
    current = pcs[bestIdx]
  }
  const ordered = order.map(i => notes[i])
  const startMidi = [M.mid - 5, M.mid + 2, M.upMid, M.bass + 5][variant % 4]
  let min = startMidi
  const out: string[] = []
  for (const n of ordered) {
    const p = placeAtOrAbove(n, min)
    out.push(p)
    min = midiOf(p) + 5
  }
  return sortByPitch(out)
}

// ── Dispatcher + UI metadata ───────────────────────────────────────

const FNS: Record<string, VoicingFn> = {
  standard, cinematic, pianoSpread, jazz, neoSoul, gospel,
  voiceLeading, openVoicing, quartal, cluster, quintal,
}

export interface VoicingStyleInfo {
  id: string
  label: string
  description: string
  variantLabels: string[]
}

export const VOICING_STYLES: VoicingStyleInfo[] = [
  { id: 'standard',     label: 'Standard',     description: 'Close-position triads with inversion options', variantLabels: ['Root position', '1st inversion', '2nd inversion', 'Drop 2'] },
  { id: 'cinematic',    label: 'Cinematic',    description: 'Modern film-score wide spread (bass + mid-high)', variantLabels: ['Wide deep', 'High & airy', 'Choir cluster', 'Spread to top'] },
  { id: 'pianoSpread',  label: 'Piano Spread', description: 'Classical pianist hands: LH root+5, RH colour tones', variantLabels: ['Standard LH/RH', 'High RH', 'No 5 LH', 'Stretched LH'] },
  { id: 'jazz',         label: 'Jazz Shell',   description: 'Rootless 3-5-7 guide-tone Bill Evans voicings', variantLabels: ['3-5-7 close', '7-3-5 (Evans A)', '3-7-9', '7-9-3 high'] },
  { id: 'neoSoul',      label: 'Neo Soul',     description: 'Rootless 9/11/13 — Robert Glasper colour', variantLabels: ['3-7-9', '7-3-9-13', '3-9-7-13', '7-9-3-5 high'] },
{ id: 'voiceLeading', label: 'Voice Leading',description: 'Inversions chosen to keep voices smooth', variantLabels: ['Smoothest', '2nd smoothest', '3rd', '4th'] },
  { id: 'openVoicing',  label: 'Open Voicing', description: 'Wide intervals, classical orchestral spread', variantLabels: ['Perfect-first', '7-then-3', 'Tertian wide', '7-3-5 spread'] },
  { id: 'quartal',      label: 'Quartal ◇',    description: 'Stacked perfect 4ths (McCoy Tyner)',          variantLabels: ['Mid start', 'High start', 'Low start', 'Cinematic'] },
  { id: 'cluster',      label: 'Cluster ✦',    description: 'Tight close-position, modern dissonance',     variantLabels: ['Mid', 'Upper mid', 'Low', 'High'] },
]

export const VOICING_STYLE_IDS = VOICING_STYLES.map(s => s.id)

export function voicePerStyle(
  notes: string[],
  styleId: string,
  variant = 0,
  prevVoicing: string[] | null = null,
): string[] {
  const fn = FNS[styleId] ?? standard
  return fn({ notes: notes.filter(Boolean), variant: ((variant % 4) + 4) % 4, prevVoicing })
}
