/**
 * Resolve — Roman-numeral function -> ChordEntry in the current key.
 *
 * Convention (consistent regardless of mode):
 *   Uppercase Roman = MAJOR triad      Lowercase = MINOR
 *   ° = DIMINISHED                     + = AUGMENTED
 *   ♭ prefix lowers the root one semitone
 *
 * Extensions are built explicitly per-label (see buildChordNotes), so a
 * V7 always gets m7, V Δ7 always gets M7, Vsus4 stays a 3-note sus chord,
 * vii°7 gets the bb7, etc. — no reliance on whichever scale happens to
 * be active.
 */

import { Note } from 'tonal'
import type { ChordEntry, ScaleType } from '@/types/music'
import type { DiatonicFunction } from './types'

// ── Types ──────────────────────────────────────────────────────────

type Quality = 'M' | 'm' | 'd' | 'A' | 'sus2' | 'sus4'

interface FnSpec {
  semitones: number
  quality: Quality
  roman: string
}

// ── Function table ────────────────────────────────────────────────

const FN: Record<DiatonicFunction, FnSpec> = {
  I:    { semitones: 0,  quality: 'M', roman: 'I'   },
  i:    { semitones: 0,  quality: 'm', roman: 'i'   },
  'I+': { semitones: 0,  quality: 'A', roman: 'I+'  },
  'i°': { semitones: 0,  quality: 'd', roman: 'i°'  },

  ii:    { semitones: 2, quality: 'm', roman: 'ii'   },
  II:    { semitones: 2, quality: 'M', roman: 'II'   },
  'ii°': { semitones: 2, quality: 'd', roman: 'ii°' },
  '♭II': { semitones: 1, quality: 'M', roman: '♭II' },

  iii:   { semitones: 4, quality: 'm', roman: 'iii' },
  III:   { semitones: 4, quality: 'M', roman: 'III' },
  '♭III':{ semitones: 3, quality: 'M', roman: '♭III' },

  IV:    { semitones: 5, quality: 'M', roman: 'IV'  },
  iv:    { semitones: 5, quality: 'm', roman: 'iv'  },

  V:     { semitones: 7, quality: 'M', roman: 'V'   },
  v:     { semitones: 7, quality: 'm', roman: 'v'   },
  '♭V':  { semitones: 6, quality: 'M', roman: '♭V'  },
  Vsus4: { semitones: 7, quality: 'sus4', roman: 'Vsus4' },

  vi:    { semitones: 9, quality: 'm', roman: 'vi'  },
  VI:    { semitones: 9, quality: 'M', roman: 'VI'  },
  '♭VI': { semitones: 8, quality: 'M', roman: '♭VI' },

  'vii°':{ semitones: 11, quality: 'd', roman: 'vii°' },
  VII:   { semitones: 11, quality: 'M', roman: 'VII'  },
  '♭VII':{ semitones: 10, quality: 'M', roman: '♭VII' },

  'V/V':   { semitones: 0, quality: 'M', roman: 'V/V'   },
  'V/vi':  { semitones: 0, quality: 'M', roman: 'V/vi'  },
  'V/IV':  { semitones: 0, quality: 'M', roman: 'V/IV'  },
  'V/ii':  { semitones: 0, quality: 'M', roman: 'V/ii'  },
  'V/iii': { semitones: 0, quality: 'M', roman: 'V/iii' },
}

const SECONDARY_TARGET: Partial<Record<DiatonicFunction, DiatonicFunction>> = {
  'V/V': 'V', 'V/vi': 'vi', 'V/IV': 'IV', 'V/ii': 'ii', 'V/iii': 'iii',
}

const SEMI_TO_INTERVAL: Record<number, string> = {
  0: '1P', 1: '2m', 2: '2M', 3: '3m', 4: '3M', 5: '4P',
  6: '5d', 7: '5P', 8: '6m', 9: '6M', 10: '7m', 11: '7M',
}

// ── Helpers ────────────────────────────────────────────────────────

function noteAtSemitonesAbove(root: string, semis: number): string | null {
  const iv = SEMI_TO_INTERVAL[((semis % 12) + 12) % 12]
  if (!iv) return null
  const n = Note.transpose(root, iv)
  return n || null
}

function buildTriad(root: string, q: Quality): string[] | null {
  const transpose = (i: string) => Note.transpose(root, i) || null
  switch (q) {
    case 'M':    return triadFrom(root, transpose('3M'), transpose('5P'))
    case 'm':    return triadFrom(root, transpose('3m'), transpose('5P'))
    case 'd':    return triadFrom(root, transpose('3m'), transpose('5d'))
    case 'A':    return triadFrom(root, transpose('3M'), transpose('5A'))
    case 'sus2': return triadFrom(root, transpose('2M'), transpose('5P'))
    case 'sus4': return triadFrom(root, transpose('4P'), transpose('5P'))
  }
}

function triadFrom(root: string, third: string | null, fifth: string | null): string[] | null {
  if (!third || !fifth) return null
  return [root, third, fifth]
}

// Normalise extension labels: lower-case and replace ♭/♯ with b/#
function normaliseExts(extensions: string[] | undefined): Set<string> {
  return new Set(
    (extensions ?? []).map(e =>
      e.toLowerCase().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/Δ/g, 'maj').trim()
    )
  )
}

/**
 * Build the full chord (triad + any extension tones) from a clean
 * specification. Each tone is computed with an explicit interval so the
 * result never accidentally picks up scale-borrowed notes.
 */
function buildChordNotes(
  chordRoot: string,
  quality: Quality,
  extensions: string[] | undefined,
): string[] | null {
  const exts = normaliseExts(extensions)
  const transpose = (i: string): string | null => Note.transpose(chordRoot, i) || null

  // Sus extensions take over the triad shape
  const isSus2 = exts.has('sus2')
  const isSus4 = exts.has('sus4')
  const base: string[] | null = isSus2
    ? buildTriad(chordRoot, 'sus2')
    : isSus4
      ? buildTriad(chordRoot, 'sus4')
      : buildTriad(chordRoot, quality)
  if (!base) return null

  // ── Extension categorisation ───────────────────────────────────
  const hasAddNine    = exts.has('add9')
  const hasNatNine    = exts.has('9') || exts.has('maj9') || exts.has('m9')
  const hasAltNine    = exts.has('b9') || exts.has('#9')
  const hasNatEleven  = exts.has('11') || exts.has('m11') || exts.has('maj11')
  const hasSharpEleven= exts.has('#11')
  const hasNatThirteen= exts.has('13') || exts.has('m13') || exts.has('maj13')
  const hasFlatThirteen = exts.has('b13')
  const hasAnyThirteen  = hasNatThirteen || hasFlatThirteen

  const explicitMaj7 = exts.has('maj7') || exts.has('maj9') || exts.has('maj11') || exts.has('maj13')
  const explicitDim7 = exts.has('dim7') || exts.has('°7')
  const explicitHalfDim = exts.has('ø7') || exts.has('o7')
  const explicit7 = exts.has('7') || exts.has('m7')

  // Seventh: include unless only a triad/add9/sus/#11 was asked for.
  // (#11 alone is the Lydian "Δ7♯11" — pulls in maj7 automatically.)
  const wantsSeventh =
    explicit7 || explicitMaj7 || explicitDim7 || explicitHalfDim ||
    hasNatNine || hasAltNine || hasNatEleven || hasAnyThirteen ||
    hasSharpEleven

  let seventh: string | null = null
  if (wantsSeventh) {
    if (explicitMaj7) {
      seventh = transpose('7M')
    } else if (explicitDim7) {
      seventh = transpose('6M')   // bb7 = enharmonic M6
    } else if (hasSharpEleven && !explicit7 && quality === 'M') {
      // Plain "#11" on a major triad implies Δ7♯11 (Lydian).
      seventh = transpose('7M')
    } else if (quality === 'd' && (explicit7 || hasNatNine || hasAltNine || hasNatEleven)) {
      // Plain "7" on a diminished triad = half-diminished (m7)
      seventh = transpose('7m')
    } else {
      // Default 7 covers V7 dominant and minor m7 alike
      seventh = transpose('7m')
    }
  }

  // ── 9th ────────────────────────────────────────────────────────
  let ninth: string | null = null
  if (exts.has('b9')) {
    ninth = transpose('9m')
  } else if (exts.has('#9')) {
    ninth = transpose('9A')
  } else if (hasAddNine || hasNatNine || hasNatEleven || hasAnyThirteen) {
    ninth = transpose('9M')
  }
  // Note: #11 alone does NOT pull in a natural 9 (Lydian Δ7♯11 is 5 notes).

  // ── 11th ───────────────────────────────────────────────────────
  let eleventh: string | null = null
  if (hasSharpEleven) {
    eleventh = transpose('11A')
  } else if (hasNatEleven || hasAnyThirteen) {
    eleventh = transpose('11P')
  }

  // ── 13th ───────────────────────────────────────────────────────
  let thirteenth: string | null = null
  if (hasFlatThirteen) {
    thirteenth = transpose('13m')
  } else if (hasNatThirteen) {
    thirteenth = transpose('13M')
  }

  const notes: string[] = [...base]
  if (seventh)    notes.push(seventh)
  if (ninth)      notes.push(ninth)
  if (eleventh)   notes.push(eleventh)
  if (thirteenth) notes.push(thirteenth)
  return notes
}

/**
 * Generate a display name that matches the chord we actually built.
 * Mirrors the extension logic in buildChordNotes so labels and notes
 * never drift apart.
 */
function buildDisplayName(
  chordRoot: string,
  quality: Quality,
  extensions: string[] | undefined,
): string {
  const r = chordRoot.replace('#', '♯').replace('b', '♭')
  const exts = normaliseExts(extensions)

  // Sus chords skip quality letter
  if (exts.has('sus2')) return `${r}sus2`
  if (exts.has('sus4')) {
    if (exts.has('7') || exts.has('maj7')) return exts.has('maj7') ? `${r}Δ7sus4` : `${r}7sus4`
    return `${r}sus4`
  }

  // Diminished family
  if (quality === 'd') {
    if (exts.has('dim7') || exts.has('°7')) return `${r}°7`
    if (exts.has('ø7') || exts.has('o7') || exts.has('7') || exts.has('m7') ||
        exts.has('9') || exts.has('m9') || exts.has('11')) {
      return `${r}ø7`
    }
    return `${r}dim`
  }

  if (quality === 'A') return `${r}+`

  const prefix = quality === 'm' ? 'm' : ''

  // Categorise extensions (matches buildChordNotes)
  const hasAddNine    = exts.has('add9')
  const hasNatNine    = exts.has('9') || exts.has('maj9') || exts.has('m9')
  const hasAltNine    = exts.has('b9') || exts.has('#9')
  const hasNatEleven  = exts.has('11') || exts.has('m11') || exts.has('maj11')
  const hasSharpEleven= exts.has('#11')
  const hasNatThirteen= exts.has('13') || exts.has('m13') || exts.has('maj13')
  const hasFlatThirteen = exts.has('b13')
  const hasAnyThirteen  = hasNatThirteen || hasFlatThirteen

  const explicitMaj7 = exts.has('maj7') || exts.has('maj9') || exts.has('maj11') || exts.has('maj13')
  const explicit7    = exts.has('7') || exts.has('m7')

  // Pick outer extension number using only NATURAL extensions; altered
  // notes (♭9, ♯9, ♯11, ♭13) go into the alt suffix.
  let outer = ''
  const seventhStyle = explicitMaj7 ? 'Δ' : ''
  const seventhDigit = explicitMaj7 ? 'Δ' : '7'   // unused; kept clear

  if (hasNatThirteen) {
    outer = explicitMaj7 ? 'Δ13' : '13'
  } else if (hasNatEleven) {
    outer = explicitMaj7 ? 'Δ11' : '11'
  } else if (hasNatNine) {
    outer = explicitMaj7 ? 'Δ9' : '9'
  } else if (hasAddNine && explicitMaj7) {
    // maj7 + add9 = Δ9
    outer = 'Δ9'
  } else if (hasAddNine && explicit7) {
    // 7 + add9 = 9 (dominant-style)
    outer = '9'
  } else if (hasAddNine) {
    outer = 'add9'
  } else if (explicitMaj7) {
    outer = 'Δ7'
  } else if (explicit7) {
    outer = '7'
  } else if (hasSharpEleven && quality === 'M') {
    // Lone #11 on major implies Lydian Δ7♯11 → outer is Δ7
    outer = 'Δ7'
  }

  // Alterations
  const alts: string[] = []
  if (exts.has('b9')) alts.push('♭9')
  if (exts.has('#9')) alts.push('♯9')
  if (hasSharpEleven) alts.push('♯11')
  if (hasFlatThirteen && !hasNatThirteen) alts.push('♭13')
  if (exts.has('b5')) alts.push('♭5')

  // For pure altered-only chords on minor 7 (no natural 9/11/13), keep
  // "m7" not "m" + outer collapse.
  const altSuffix = alts.length ? `(${alts.join(',')})` : ''
  return `${r}${prefix}${outer}${altSuffix}`
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Build a chord from an absolute root + quality (used by chord-relative
 * transforms like P/L/R and chromatic mediants).
 */
export function buildAbsoluteChord(
  root: string,
  quality: 'M' | 'm' | 'd' | 'A',
  scaleType: ScaleType,
  extensions?: string[],
  roman?: string,
): ChordEntry | null {
  const notes = buildChordNotes(root, quality, extensions)
  if (!notes || notes.length < 3) return null
  return {
    notes,
    displayName: buildDisplayName(root, quality, extensions),
    roman: roman ?? '',
    sourceRoot: root,
    sourceScale: scaleType,
  }
}

export function resolveFunction(
  fn: DiatonicFunction,
  root: string,
  scaleType: ScaleType,
  extensions?: string[],
): ChordEntry | null {
  // Secondary dominant — V7 of the target degree
  if (fn in SECONDARY_TARGET) {
    const targetFn = SECONDARY_TARGET[fn]!
    const target = resolveFunction(targetFn, root, scaleType)
    if (!target) return null
    const targetRoot = target.notes[0]
    const domRoot = Note.transpose(targetRoot, '-5P')
    if (!domRoot) return null
    const notes = [
      domRoot,
      Note.transpose(domRoot, '3M'),
      Note.transpose(domRoot, '5P'),
      Note.transpose(domRoot, '7m'),
    ].filter(Boolean) as string[]
    if (notes.length < 4) return null
    return {
      notes,
      displayName: `${domRoot.replace('#', '♯').replace('b', '♭')}7`,
      roman: FN[fn].roman,
      sourceRoot: root,
      sourceScale: scaleType,
    }
  }

  const spec = FN[fn]
  if (!spec) return null

  const chordRoot = noteAtSemitonesAbove(root, spec.semitones)
  if (!chordRoot) return null

  const notes = buildChordNotes(chordRoot, spec.quality, extensions)
  if (!notes || notes.length < 3) return null

  return {
    notes,
    displayName: buildDisplayName(chordRoot, spec.quality, extensions),
    roman: spec.roman,
    sourceRoot: root,
    sourceScale: scaleType,
  }
}

/**
 * Identify the Roman-numeral function a chord plays in the current key.
 * Based on (interval-from-tonic, chord quality) so the result is
 * consistent across modes.
 */
export function analyseChordFunction(
  chord: ChordEntry,
  root: string,
  _scaleType: ScaleType,
): DiatonicFunction | null {
  const chordRoot = chord.notes[0]
  if (!chordRoot) return null

  const rc = Note.chroma(root)
  const cc = Note.chroma(chordRoot)
  if (rc == null || cc == null) return null
  const semis = ((cc - rc) + 12) % 12

  let q: Quality | 'unknown' = 'unknown'
  if (chord.notes.length >= 3) {
    const c1 = Note.chroma(chord.notes[1])
    const c2 = Note.chroma(chord.notes[2])
    if (c1 != null && c2 != null) {
      const i3 = ((c1 - cc) + 12) % 12
      const i5 = ((c2 - cc) + 12) % 12
      if (i3 === 4 && i5 === 7) q = 'M'
      else if (i3 === 3 && i5 === 7) q = 'm'
      else if (i3 === 3 && i5 === 6) q = 'd'
      else if (i3 === 4 && i5 === 8) q = 'A'
    }
  }

  switch (semis) {
    case 0:  return q === 'M' ? 'I' : q === 'd' ? 'i°' : q === 'A' ? 'I+' : 'i'
    case 1:  return '♭II'
    case 2:  return q === 'M' ? 'II' : q === 'd' ? 'ii°' : 'ii'
    case 3:  return '♭III'
    case 4:  return q === 'M' ? 'III' : 'iii'
    case 5:  return q === 'm' ? 'iv' : 'IV'
    case 6:  return '♭V'
    case 7:  return q === 'M' ? 'V' : 'v'
    case 8:  return '♭VI'
    case 9:  return q === 'M' ? 'VI' : 'vi'
    case 10: return '♭VII'
    case 11: return q === 'd' ? 'vii°' : 'VII'
  }
  return null
}
