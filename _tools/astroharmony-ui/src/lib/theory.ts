import { Scale, Note } from 'tonal'
import type { ChordEntry, Extension, ScaleType, ModeDefinition, BaseScale } from '@/types/music'

// ── All 21 Modes ──────────────────────────────────────────────────────────

export const ALL_MODES: ModeDefinition[] = [
  // Ionian family
  { key: 'ionian',       name: 'Ionian (Major)',   tonalName: 'major',              family: 'ionian', modeIndex: 0 },
  { key: 'dorian',       name: 'Dorian',           tonalName: 'dorian',             family: 'ionian', modeIndex: 1 },
  { key: 'phrygian',     name: 'Phrygian',         tonalName: 'phrygian',           family: 'ionian', modeIndex: 2 },
  { key: 'lydian',       name: 'Lydian',           tonalName: 'lydian',             family: 'ionian', modeIndex: 3 },
  { key: 'mixolydian',   name: 'Mixolydian',       tonalName: 'mixolydian',         family: 'ionian', modeIndex: 4 },
  { key: 'aeolian',      name: 'Aeolian (Minor)',  tonalName: 'aeolian',            family: 'ionian', modeIndex: 5 },
  { key: 'locrian',      name: 'Locrian',          tonalName: 'locrian',            family: 'ionian', modeIndex: 6 },
  // Harmonic Minor family
  { key: 'harmonicMinor',  name: 'Harmonic Minor',  tonalName: 'harmonic minor',    family: 'harmonic_minor', modeIndex: 0 },
  { key: 'locrianNat6',    name: 'Locrian #6',      tonalName: 'locrian 6',         family: 'harmonic_minor', modeIndex: 1 },
  { key: 'ionianAug',      name: 'Ionian #5',       tonalName: 'ionian augmented',  family: 'harmonic_minor', modeIndex: 2 },
  { key: 'dorianSharp4',   name: 'Dorian #4',       tonalName: 'dorian #4',         family: 'harmonic_minor', modeIndex: 3 },
  { key: 'phrygianDom',    name: 'Phrygian Major',  tonalName: 'phrygian dominant', family: 'harmonic_minor', modeIndex: 4 },
  { key: 'lydianSharp2',   name: 'Lydian #2',       tonalName: 'lydian #2',         family: 'harmonic_minor', modeIndex: 5 },
  { key: 'alteredDim',     name: 'Altered Dim',     tonalName: 'ultralocrian',      family: 'harmonic_minor', modeIndex: 6 },
  // Melodic Minor family
  { key: 'melodicMinor',     name: 'Melodic Minor',    tonalName: 'melodic minor',    family: 'melodic_minor', modeIndex: 0 },
  { key: 'dorianFlat2',     name: 'Dorian ♭2',        tonalName: 'dorian b2',        family: 'melodic_minor', modeIndex: 1 },
  { key: 'lydianAug',       name: 'Lydian Aug',        tonalName: 'lydian augmented', family: 'melodic_minor', modeIndex: 2 },
  { key: 'lydianDom',       name: 'Lydian Dom',        tonalName: 'lydian dominant',  family: 'melodic_minor', modeIndex: 3 },
  { key: 'mixolydianFlat6', name: 'Mixolydian ♭6',    tonalName: 'mixolydian b6',    family: 'melodic_minor', modeIndex: 4 },
  { key: 'locrianNat2',     name: 'Locrian #2',       tonalName: 'locrian #2',       family: 'melodic_minor', modeIndex: 5 },
  { key: 'superLocrian',    name: 'Super Locrian',     tonalName: 'altered',          family: 'melodic_minor', modeIndex: 6 },
]

export const MODE_MAP: Record<ScaleType, ModeDefinition> =
  Object.fromEntries(ALL_MODES.map(m => [m.key, m])) as Record<ScaleType, ModeDefinition>

// Roman numeral patterns per family (mode 0 = base position)
const ROMAN_PATTERNS: Record<BaseScale, (string | null)[]> = {
  ionian:         ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  harmonic_minor: ['i', 'ii°', 'III+', 'iv', 'V', 'VI', null],
  melodic_minor:  ['i', 'ii', 'III+', 'IV', 'V', 'vi°', null],
}

function getRomans(mode: ModeDefinition): (string | null)[] {
  const pattern = ROMAN_PATTERNS[mode.family]
  const idx = mode.modeIndex
  return pattern.map((_, i) => pattern[(i + idx) % 7])
}

const EXT_TO_SIZE: Record<Extension, number> = {
  triad: 3, '7': 4, '9': 5, '11': 6, '13': 7,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function semitone(note: string): number {
  return ((Note.midi(note + '4') ?? 0) + 1200) % 12
}

function intervalSemitones(from: string, to: string): number {
  return ((semitone(to) - semitone(from)) + 12) % 12
}

function formatNote(n: string): string {
  return n.replace('#', '♯').replace('b', '♭')
}

function extLabel(size: number): string {
  if (size === 4) return '7'
  if (size === 5) return '9'
  if (size === 6) return '11'
  if (size === 7) return '13'
  return ''
}

function buildChordName(notes: string[]): string {
  if (notes.length < 2) return notes[0] ?? ''
  const root = notes[0]
  const rootSemi = semitone(root)
  const intervals = notes.slice(1).map(n => ((semitone(n) - rootSemi) + 12) % 12)
  const R = formatNote(root)

  // Positional intervals (chord stacked in 3rds)
  const i3rd  = intervals[0]
  const i5th  = intervals[1]
  const i7th  = intervals[2]
  const i9th  = intervals[3]
  const i11th = intervals[4]
  const i13th = intervals[5]

  const is_m3 = i3rd === 3
  const is_M3 = i3rd === 4
  const no3rd = !is_m3 && !is_M3

  const is_d5 = i5th === 6
  const is_P5 = i5th === 7
  const is_A5 = i5th === 8

  const is_m7 = i7th === 10
  const is_M7 = i7th === 11
  const is_M6 = i7th === 9 // 6th chord (size 4 with no 7th)

  // ── Sus triads ──────────────────────────────────────────────
  if (no3rd && notes.length === 3) {
    if (i3rd === 2 && (is_P5 || is_d5)) return `${R}sus2`
    if (i3rd === 5 && (is_P5 || is_d5)) return `${R}sus4`
  }

  // ── Triads ──────────────────────────────────────────────────
  if (notes.length === 3) {
    if (is_m3 && is_d5) return `${R}dim`
    if (is_M3 && is_A5) return `${R}+`
    if (is_m3 && is_P5) return `${R}m`
    if (is_M3 && is_P5) return R
    if (is_M3 && is_d5) return `${R}(♭5)`
    if (is_m3 && is_A5) return `${R}m(♯5)`
    return R
  }

  // ── 4-note chords (6th or 7th) ─────────────────────────────
  if (notes.length === 4) {
    if (is_M6 && !is_m7 && !is_M7) {
      return `${R}${is_m3 ? 'm' : ''}6`
    }
    if (is_m3 && is_d5 && is_m7) return `${R}ø7`
    if (is_m3 && is_d5 && !is_m7 && !is_M7) return `${R}°7`
    if (is_M3 && is_A5 && is_M7) return `${R}augΔ7`
    if (is_M3 && is_A5 && is_m7) return `${R}+7`
    if (is_M3 && is_M7) return `${R}Δ7`
    if (is_m3 && is_M7) return `${R}mΔ7`
    if (is_m3 && is_m7) return `${R}m7`
    if (is_M3 && is_m7) return `${R}7`
    return R
  }

  // ── Extended chords (5/9, 6/11, 7/13 notes) ───────────────
  const isHalfDim = is_m3 && is_d5 && is_m7

  // Determine prefix from base quality + 7th
  let prefix = ''
  if (isHalfDim)                            prefix = 'ø'
  else if (is_m3 && is_d5 && is_M7)         prefix = 'mΔ'
  else if (is_M3 && is_A5 && is_M7)         prefix = 'augΔ'
  else if (is_M3 && is_A5 && is_m7)         prefix = 'aug'
  else if (is_m3 && is_M7)                  prefix = 'mΔ'
  else if (is_m3 && is_m7)                  prefix = 'm'
  else if (is_M3 && is_M7)                  prefix = 'Δ'
  else if (is_M3 && is_m7)                  prefix = ''           // dominant
  else if (is_m3 && is_P5)                  prefix = 'm'
  else if (is_M3 && is_P5)                  prefix = ''

  const alts: string[] = []
  // ø prefix already implies ♭5; only show ♭5 when it isn't covered by the symbol
  if (is_m3 && is_d5 && !isHalfDim) alts.push('♭5')

  // Categorise the upper extensions present in the chord
  const ext9Alt = i9th === 1 ? '♭9' : i9th === 3 ? '♯9' : null
  const ext9Natural = i9th === 2
  const ext11Sharp = notes.length >= 6 && i11th === 6 && !is_d5
  const ext11Natural = notes.length >= 6 && i11th === 5
  const ext13Flat = notes.length >= 7 && i13th === 8 && !is_A5
  const ext13Natural = notes.length >= 7 && i13th === 9 && !is_A5

  // Walk from the highest extension down — demote outerNum whenever the
  // would-be outermost tone is altered, and surface the alteration in parens.
  let outerNum = '7'
  if (notes.length === 7) {
    if (ext13Natural) {
      outerNum = '13'
      if (ext9Alt) alts.push(ext9Alt)
      if (ext11Sharp) alts.push('♯11')
    } else {
      if (ext11Natural && ext9Natural) outerNum = '11'
      else if (ext11Sharp && ext9Natural) { outerNum = '9'; alts.push('♯11') }
      else if (ext9Natural) outerNum = '9'
      else {
        outerNum = '7'
        if (ext9Alt) alts.push(ext9Alt)
        if (ext11Sharp) alts.push('♯11')
        else if (ext11Natural) alts.push('11')
      }
      if (ext13Flat) alts.push('♭13')
    }
  } else if (notes.length === 6) {
    if (ext11Natural && ext9Natural) outerNum = '11'
    else if (ext11Sharp && ext9Natural) { outerNum = '9'; alts.push('♯11') }
    else if (ext9Natural) {
      outerNum = '9'
      if (ext11Natural) alts.push('11')
      else if (ext11Sharp) alts.push('♯11')
    } else {
      outerNum = '7'
      if (ext9Alt) alts.push(ext9Alt)
      if (ext11Sharp) alts.push('♯11')
      else if (ext11Natural) alts.push('11')
    }
  } else if (notes.length === 5) {
    if (ext9Natural) outerNum = '9'
    else {
      outerNum = '7'
      if (ext9Alt) alts.push(ext9Alt)
    }
  }

  const altStr = alts.length ? `(${alts.join(',')})` : ''
  return `${R}${prefix}${outerNum}${altStr}`
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getModeDef(type: ScaleType): ModeDefinition {
  return MODE_MAP[type]
}

function hasDoubleAccidental(notes: string[]): boolean {
  return notes.some(n => n.includes('##') || n.includes('bb'))
}

/**
 * Return a root spelling that yields a clean (no ## / bb) scale for the
 * given mode. D♯ Ionian → 'Eb', G♯ Ionian → 'Ab', etc. Used by the mood
 * engine so suggested chords aren't built from double-accidental roots.
 */
export function normaliseRootForScale(root: string, type: ScaleType): string {
  const mode = MODE_MAP[type]
  const scale = Scale.get(`${root} ${mode.tonalName}`)
  if (scale.notes.length && !hasDoubleAccidental(scale.notes)) return root
  const alt = Note.enharmonic(root)
  if (alt && alt !== root) {
    const s2 = Scale.get(`${alt} ${mode.tonalName}`)
    if (s2.notes.length && !hasDoubleAccidental(s2.notes)) return alt
  }
  return root
}

export function getScaleNotes(root: string, type: ScaleType): string[] {
  const mode = MODE_MAP[type]
  const scale = Scale.get(`${root} ${mode.tonalName}`)
  // If the requested root produces a scale with double-sharps / double-flats
  // (e.g. D♯ Ionian → F𝄪, C𝄪), retry with the enharmonic root spelling.
  // The audio engine and SVG keyboard both index pitch classes through a
  // single-accidental CHROMATIC array — double accidentals get dropped and
  // the played chord ends up with only 1-2 notes. Switching to the flat
  // spelling (D♯ → E♭) gives a clean, universally-handled scale.
  if (scale.notes.length && !hasDoubleAccidental(scale.notes)) return scale.notes
  const alt = Note.enharmonic(root)
  if (alt && alt !== root) {
    const s2 = Scale.get(`${alt} ${mode.tonalName}`)
    if (s2.notes.length && !hasDoubleAccidental(s2.notes)) return s2.notes
  }
  return scale.notes
}

export function getScaleDisplayName(root: string, type: ScaleType): string {
  const mode = MODE_MAP[type]
  return `${root} ${mode.name}`
}

export function getDiatonicChords(
  root: string,
  type: ScaleType,
  ext: Extension
): (ChordEntry | null)[] {
  const notes = getScaleNotes(root, type)
  if (!notes.length) return Array(7).fill(null)
  const size = EXT_TO_SIZE[ext]
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)

  return notes.map((_, degree) => {
    // VII empty for HM/MM families
    if (romans[degree] === null) return null

    const chordNotes: string[] = []
    for (let i = 0; i < size; i++) chordNotes.push(notes[(degree + i * 2) % 7])

    // Name the chord from the full diatonic stack BEFORE removing the avoid 4
    // (so a Δ13 chord still reads "Δ13" even after we drop the 11).
    const displayName = buildChordName(chordNotes)

    // Avoid-4: if the chord has a major 3rd and a natural 11 (P4), drop the
    // 11. The ♭9 clash between M3 and P4 ruins every voicing that includes
    // the 11. Keep ♯11 (Lydian colour) and natural 11 on minor chords (where
    // it sits a M9 above the m3 — consonant).
    if (chordNotes.length >= 6) {
      const i3 = intervalSemitones(chordNotes[0], chordNotes[1])
      const i11 = intervalSemitones(chordNotes[0], chordNotes[5])
      if (i3 === 4 && i11 === 5) {
        chordNotes.splice(5, 1)
      }
    }

    return {
      notes: chordNotes,
      displayName,
      roman: romans[degree]!,
      sourceRoot: root,
      sourceScale: type,
    }
  })
}

export function getDiatonic6Chords(
  root: string,
  type: ScaleType
): (ChordEntry | null)[] {
  const notes = getScaleNotes(root, type)
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)

  return notes.map((_, degree) => {
    if (romans[degree] === null) return null
    const chordRoot = notes[degree]
    const third = notes[(degree + 2) % 7]
    const fifth = notes[(degree + 4) % 7]
    const maj6Semi = (semitone(chordRoot) + 9) % 12
    const sixth = notes.find(n => semitone(n) === maj6Semi)
    if (!sixth) return null

    const chordNotes = [chordRoot, third, fifth, sixth]
    const i3 = intervalSemitones(chordRoot, third)
    const i5 = intervalSemitones(chordRoot, fifth)
    const isMajor = i3 === 4
    let fifthSuffix = ''
    if (i5 === 6) fifthSuffix = '(♭5)'
    else if (i5 === 8) fifthSuffix = '(♯5)'
    const displayName = `${formatNote(chordRoot)}${isMajor ? '' : 'm'}${fifthSuffix}6`

    return { notes: chordNotes, displayName, roman: romans[degree]!, sourceRoot: root, sourceScale: type }
  })
}

// ── Sus Chords ────────────────────────────────────────────────────────────

export type SusExtChord = ChordEntry & { isNonStandard: boolean; badFifth: boolean }

export function getSusExtRow(
  root: string,
  type: ScaleType,
  susType: 'sus2' | 'sus4',
  extOffset: number,
  extNum: string
): (SusExtChord | null)[] {
  const notes = getScaleNotes(root, type)
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)

  return notes.map((_, degree) => {
    if (romans[degree] === null) return null
    const chordRoot = notes[degree]
    const fifth = notes[(degree + 4) % 7]
    const mid = susType === 'sus2' ? notes[(degree + 1) % 7] : notes[(degree + 3) % 7]
    const extNote = notes[(degree + extOffset) % 7]

    const expectedMidInt = susType === 'sus2' ? 2 : 5
    const midInt = intervalSemitones(chordRoot, mid)
    const fifthInt = intervalSemitones(chordRoot, fifth)
    const isNonStandard = midInt !== expectedMidInt
    const badFifth = fifthInt !== 7

    const extInterval = intervalSemitones(chordRoot, extNote)

    let qual = ''
    if (extNum === '7') qual = extInterval === 11 ? 'Δ' : '7'

    let extSuffix = ''
    if (extNum === '9')  extSuffix = extInterval === 1 ? '♭9' : '9'
    if (extNum === '11') extSuffix = extInterval === 6 ? '♯11' : '11'
    if (extNum === '13') extSuffix = extInterval === 8 ? '♭13' : '13'

    const R = formatNote(chordRoot)
    const susStr = susType === 'sus2' ? 'sus2' : 'sus4'

    const displayName = extNum === '7'
      ? `${R}${qual}(${susStr})`
      : `${R}(${susStr},${extSuffix})`

    return {
      notes: [chordRoot, mid, fifth, extNote],
      displayName,
      roman: `${romans[degree]}(${susStr})`,
      sourceRoot: root,
      sourceScale: type,
      isNonStandard,
      badFifth,
    }
  })
}

export function getSusChords(
  root: string,
  type: ScaleType
): { sus2: SusExtChord[]; sus4: SusExtChord[] } {
  const notes = getScaleNotes(root, type)
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)

  const makeSus = (susType: 'sus2' | 'sus4'): SusExtChord[] =>
    notes.map((_, degree) => {
      if (romans[degree] === null) return null as unknown as SusExtChord
      const chordRoot = notes[degree]
      const fifth = notes[(degree + 4) % 7]
      const mid = susType === 'sus2' ? notes[(degree + 1) % 7] : notes[(degree + 3) % 7]

      const expected = susType === 'sus2' ? 2 : 5
      const midInt = intervalSemitones(chordRoot, mid)
      const fifthInt = intervalSemitones(chordRoot, fifth)
      const isNonStandard = midInt !== expected
      const badFifth = fifthInt !== 7

      const displayName = isNonStandard
        ? (midInt === 1 ? `${formatNote(chordRoot)}phry`
          : midInt === 6 ? `${formatNote(chordRoot)}lyd`
          : `${formatNote(chordRoot)}(♭5)`)
        : `${formatNote(chordRoot)}${susType}`

      return {
        notes: [chordRoot, mid, fifth],
        displayName,
        roman: susType,
        sourceRoot: root,
        sourceScale: type,
        isNonStandard,
        badFifth,
      }
    }).filter(Boolean)

  return { sus2: makeSus('sus2'), sus4: makeSus('sus4') }
}

// ── Borrowed Chords ──────────────────────────────────────────────────────

export function getBorrowedChords(root: string, type: ScaleType): ChordEntry[] {
  const mode = MODE_MAP[type]
  // Borrowed from parallel modes in same family
  const parallelTonalNames: Partial<Record<ScaleType, string>> = {
    ionian: 'aeolian', aeolian: 'major',
    dorian: 'major', mixolydian: 'aeolian',
    harmonicMinor: 'major', melodicMinor: 'major',
  }
  const parallelType = parallelTonalNames[type]
  if (!parallelType) return []

  const scaleNotes = Scale.get(`${root} ${parallelType}`).notes
  if (!scaleNotes.length) return []

  return scaleNotes.map((_, degree) => {
    const chordNotes = [
      scaleNotes[degree],
      scaleNotes[(degree + 2) % 7],
      scaleNotes[(degree + 4) % 7],
    ]
    return {
      notes: chordNotes,
      displayName: buildChordName(chordNotes),
      roman: `♭${degree + 1}`,
      sourceRoot: root,
      sourceScale: type,
    }
  })
}

// ── Secondary Dominants ──────────────────────────────────────────────────

export function getSecondaryDominants(root: string, type: ScaleType): ChordEntry[] {
  const notes = getScaleNotes(root, type)
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)
  const results: ChordEntry[] = []

  notes.forEach((targetNote, targetDegree) => {
    if (romans[targetDegree] === null) return
    const domRoot = Note.transpose(targetNote, '-5P')
    if (!domRoot) return
    const domNotes = [
      domRoot,
      Note.transpose(domRoot, '3M'),
      Note.transpose(domRoot, '5P'),
      Note.transpose(domRoot, '7m'),
    ].filter(Boolean) as string[]

    results.push({
      notes: domNotes,
      displayName: `${formatNote(domRoot)}7`,
      roman: `V7/${romans[targetDegree]}`,
      sourceRoot: root,
      sourceScale: type,
    })
  })

  return results
}

export function countNotesOutsideScale(chordNotes: string[], scaleNotes: string[]): number {
  const scaleSemis = new Set(scaleNotes.map(semitone))
  return chordNotes.filter(n => !scaleSemis.has(semitone(n))).length
}

// ── Tonicization ──────────────────────────────────────────────────────────

export type TonicizationVariant = 'V' | 'Vb5' | 'Vaug' | 'ii' | 'iidim' | 'IV' | 'viio'

export function getTonicizationRow(
  root: string,
  type: ScaleType,
  variant: TonicizationVariant
): ChordEntry[] {
  const notes = getScaleNotes(root, type)
  const mode = MODE_MAP[type]
  const romans = getRomans(mode)

  return notes.map((targetNote, degree) => {
    if (romans[degree] === null) return null
    if (romans[degree]!.includes('°')) return null

    let cr: string | undefined
    let ivls: string[]
    let sfx: string
    let rpfx: string

    switch (variant) {
      case 'V':     cr = Note.transpose(targetNote, '5P'); ivls = ['3M','5P']; sfx = '';      rpfx = 'V'; break
      case 'Vb5':   cr = Note.transpose(targetNote, '5P'); ivls = ['3M','5d']; sfx = '(♭5)'; rpfx = 'V(♭5)'; break
      case 'Vaug':  cr = Note.transpose(targetNote, '5P'); ivls = ['3M','5A']; sfx = 'aug';   rpfx = 'V+'; break
      case 'ii':    cr = Note.transpose(targetNote, '2M'); ivls = ['3m','5P']; sfx = 'm';     rpfx = 'ii'; break
      case 'iidim': cr = Note.transpose(targetNote, '2M'); ivls = ['3m','5d']; sfx = 'dim';   rpfx = 'ii°'; break
      case 'IV':    cr = Note.transpose(targetNote, '4P'); ivls = ['3M','5P']; sfx = '';       rpfx = 'IV'; break
      case 'viio':  cr = Note.transpose(targetNote, '-2m');ivls = ['3m','5d']; sfx = 'dim';   rpfx = 'vii°'; break
    }

    if (!cr) return null
    const cn = [cr, ...ivls.map(i => Note.transpose(cr!, i))].filter(Boolean) as string[]

    return {
      notes: cn,
      displayName: `${formatNote(cr)}${sfx}`,
      roman: `${rpfx}/${romans[degree]}`,
      sourceRoot: root,
      sourceScale: type,
    }
  }).filter(Boolean) as ChordEntry[]
}

// ── Chromatic Mediants ────────────────────────────────────────────────────

export function getChromaticMediants(
  root: string,
  type: ScaleType
): { mediant: ChordEntry[], submediant: ChordEntry[] } {
  const notes = getScaleNotes(root, type)
  if (notes.length < 6) return { mediant: [], submediant: [] }
  const med = notes[2]
  const sub = notes[5]
  const medFlat = Note.transpose(med, '-1A')
  const subFlat = Note.transpose(sub, '-1A')

  const mk = (r: string, intervals: string[], suffix: string): ChordEntry => {
    const cn = [r, ...intervals.map(i => Note.transpose(r, i))].filter(Boolean) as string[]
    return {
      notes: cn,
      displayName: `${formatNote(r)}${suffix}`,
      roman: '',
      sourceRoot: root,
      sourceScale: type,
    }
  }

  const mediant: ChordEntry[] = [
    mk(med, ['3M','5P'], ''),
    mk(med, ['2M','5P'], '(sus2)'),
    mk(med, ['4A','5P'], 'lydian'),
  ]
  if (medFlat) {
    mediant.push(
      mk(medFlat, ['3M','5P'], ''),
      mk(medFlat, ['3m','5P'], 'm'),
      mk(medFlat, ['2M','5P'], '(sus2)'),
      mk(medFlat, ['4P','5P'], '(sus4)'),
      mk(medFlat, ['4A','5P'], 'lydian'),
    )
  }

  const submediant: ChordEntry[] = [
    mk(sub, ['3M','5P'], ''),
    mk(sub, ['4A','5P'], 'lydian'),
  ]
  if (subFlat) {
    submediant.push(
      mk(subFlat, ['3M','5P'], ''),
      mk(subFlat, ['3m','5P'], 'm'),
      mk(subFlat, ['2M','5P'], '(sus2)'),
      mk(subFlat, ['4P','5P'], '(sus4)'),
      mk(subFlat, ['4A','5P'], 'lydian'),
    )
  }

  return { mediant, submediant }
}

// ── Altered Chords ────────────────────────────────────────────────────────

export function getAlteredChords(root: string, type: ScaleType): ChordEntry[] {
  const notes = getScaleNotes(root, type)
  if (!notes.length) return []
  const results: ChordEntry[] = []
  const R = notes[0]

  // Altered dominant on V
  const fifth = notes[4]
  if (fifth) {
    const altNotes = [fifth, Note.transpose(fifth, '3M'), Note.transpose(fifth, '5d'), Note.transpose(fifth, '7m')]
      .filter(Boolean) as string[]
    if (altNotes.length === 4) {
      results.push({
        notes: altNotes,
        displayName: `${formatNote(fifth)}7(♭5)`,
        roman: 'V7(♭5)',
        sourceRoot: root,
        sourceScale: type,
      })
    }
    const altAug = [fifth, Note.transpose(fifth, '3M'), Note.transpose(fifth, '5A'), Note.transpose(fifth, '7m')]
      .filter(Boolean) as string[]
    if (altAug.length === 4) {
      results.push({
        notes: altAug,
        displayName: `${formatNote(fifth)}7(♯5)`,
        roman: 'V7(♯5)',
        sourceRoot: root,
        sourceScale: type,
      })
    }
  }

  // Tritone sub
  const tritoneRoot = Note.transpose(R, '5d')
  if (tritoneRoot) {
    const triNotes = [tritoneRoot, Note.transpose(tritoneRoot, '3M'), Note.transpose(tritoneRoot, '5P'), Note.transpose(tritoneRoot, '7m')]
      .filter(Boolean) as string[]
    if (triNotes.length === 4) {
      results.push({
        notes: triNotes,
        displayName: `${formatNote(tritoneRoot)}7`,
        roman: '♭II7 (tritone sub)',
        sourceRoot: root,
        sourceScale: type,
      })
    }
  }

  // Neapolitan
  const neapRoot = Note.transpose(R, '2m')
  if (neapRoot) {
    const neapNotes = [neapRoot, Note.transpose(neapRoot, '3M'), Note.transpose(neapRoot, '5P')]
      .filter(Boolean) as string[]
    if (neapNotes.length === 3) {
      results.push({
        notes: neapNotes,
        displayName: `${formatNote(neapRoot)}`,
        roman: '♭II (Neapolitan)',
        sourceRoot: root,
        sourceScale: type,
      })
    }
  }

  // Augmented 6th chords (Italian, French, German)
  const flatSixth = Note.transpose(R, '6m')
  if (flatSixth) {
    // Italian
    const it6 = [flatSixth, Note.transpose(flatSixth, '3M'), Note.transpose(flatSixth, '4A')]
      .filter(Boolean) as string[]
    if (it6.length === 3) {
      results.push({ notes: it6, displayName: `It+6`, roman: 'It+6', sourceRoot: root, sourceScale: type })
    }
    // French
    const fr6 = [flatSixth, Note.transpose(flatSixth, '3M'), Note.transpose(flatSixth, '4d'), Note.transpose(flatSixth, '4A')]
      .filter(Boolean) as string[]
    if (fr6.length === 4) {
      results.push({ notes: fr6, displayName: `Fr+6`, roman: 'Fr+6', sourceRoot: root, sourceScale: type })
    }
    // German
    const ger6 = [flatSixth, Note.transpose(flatSixth, '3M'), Note.transpose(flatSixth, '3m').replace(/.$/, ''), Note.transpose(flatSixth, '4A')]
      .filter(Boolean) as string[]
    results.push({ notes: [flatSixth, Note.transpose(flatSixth, '3M')!, Note.transpose(flatSixth, '4P')!, Note.transpose(flatSixth, '4A')!],
      displayName: `Ger+6`, roman: 'Ger+6', sourceRoot: root, sourceScale: type })
  }

  return results
}

// ── Swap: get the scale that starts on a given chord root ─────────────

export function getSwapScale(chordRoot: string, currentType: ScaleType): { root: string; type: ScaleType } {
  const mode = MODE_MAP[currentType]
  // The chord root becomes the new tonic in the same mode family
  return { root: chordRoot, type: currentType }
}
