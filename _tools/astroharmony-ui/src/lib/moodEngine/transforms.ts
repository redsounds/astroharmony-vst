/**
 * Chord-relative transformations.
 *
 * Where suggest.ts/data/*.ts work in KEY-relative Roman numerals (♭VI is
 * always the same chord in C minor), this module works in CHORD-relative
 * neo-Riemannian transformations (P, L, R) and chromatic mediants. These
 * are the moves film composers reach for because they share common tones
 * with the current chord — the "voice-leading" magic — rather than
 * snapping back to the tonic's diatonic chord set.
 *
 * Each transform encodes:
 *   - rootDelta    semitones the root moves
 *   - newQuality   'M', 'm', 'flip' (parallel), or 'same' (chromatic mediant)
 *   - commonTones  theoretical shared pitch classes with the source triad
 *   - label        human-readable emotional name
 *
 * Mood files declare per-transform weights via `transformWeights`. The
 * engine merges these candidates with the existing function-based ones.
 */

import { Note } from 'tonal'
import type { ChordEntry, ScaleType, VoicingType } from '@/types/music'
import { buildAbsoluteChord } from './resolve'

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export type TriadQuality = 'M' | 'm' | 'd' | 'A'

// ── Chord analysis helpers ─────────────────────────────────────────

export function analyseRootAndQuality(
  chord: ChordEntry,
): { root: string; quality: TriadQuality } | null {
  const root = chord.notes[0]
  if (!root || chord.notes.length < 3) return null
  const r = Note.chroma(root)
  const t = Note.chroma(chord.notes[1])
  const f = Note.chroma(chord.notes[2])
  if (r == null || t == null || f == null) return null
  const i3 = ((t - r) + 12) % 12
  const i5 = ((f - r) + 12) % 12
  if (i3 === 4 && i5 === 7) return { root, quality: 'M' }
  if (i3 === 3 && i5 === 7) return { root, quality: 'm' }
  if (i3 === 3 && i5 === 6) return { root, quality: 'd' }
  if (i3 === 4 && i5 === 8) return { root, quality: 'A' }
  return null
}

export function commonToneCount(a: ChordEntry, b: ChordEntry): number {
  const pa = new Set<number>()
  for (const n of a.notes) { const c = Note.chroma(n); if (c != null) pa.add(c) }
  let n = 0
  for (const x of b.notes) { const c = Note.chroma(x); if (c != null && pa.has(c)) n++ }
  return n
}

// ── Transform table ────────────────────────────────────────────────

export interface TransformDef {
  id: string
  label: string
  appliesTo: TriadQuality[]
  rootDelta: number
  /** 'flip' = parallel switch (M↔m). 'same' = same as source. */
  newQuality: 'M' | 'm' | 'flip' | 'same'
  commonTones: number
  extensions?: string[]
  voicingHint?: VoicingType
}

export const TRANSFORMS: TransformDef[] = [
  // Parallel — flip major↔minor on the same root (2 common tones)
  { id: 'P',            label: 'Shadow Twin',        appliesTo: ['M'], rootDelta: 0,  newQuality: 'm',    commonTones: 2 },
  { id: 'P',            label: 'Sudden Light',       appliesTo: ['m'], rootDelta: 0,  newQuality: 'M',    commonTones: 2 },

  // Leading-tone — neo-Riemannian L (2 common tones)
  { id: 'L_M',          label: 'Hopeful Lift',       appliesTo: ['M'], rootDelta: 4,  newQuality: 'm',    commonTones: 2 },  // C → Em
  { id: 'L_m',          label: 'Cinematic Lift',     appliesTo: ['m'], rootDelta: -4, newQuality: 'M',    commonTones: 2 },  // Cm → A♭ (Zimmer signature)

  // Relative — neo-Riemannian R (2 common tones)
  { id: 'R_M',          label: 'Bittersweet Fall',   appliesTo: ['M'], rootDelta: -3, newQuality: 'm',    commonTones: 2 },  // C → Am
  { id: 'R_m',          label: 'Sister Major',       appliesTo: ['m'], rootDelta: 3,  newQuality: 'M',    commonTones: 2 },  // Cm → E♭

  // Chromatic mediants — same quality, third apart (1 common tone)
  { id: 'CM_upM3_same', label: 'Magic Mediant',      appliesTo: ['M','m'], rootDelta: 4,  newQuality: 'same', commonTones: 1 },
  { id: 'CM_dnM3_same', label: 'Cinematic Descent',  appliesTo: ['M','m'], rootDelta: -4, newQuality: 'same', commonTones: 1 },
  { id: 'CM_upm3_same', label: 'Heroic Mediant',     appliesTo: ['M','m'], rootDelta: 3,  newQuality: 'same', commonTones: 1 },
  { id: 'CM_dnm3_same', label: 'Mystery Step',       appliesTo: ['M','m'], rootDelta: -3, newQuality: 'same', commonTones: 1 },

  // Tritone — devil's interval (0 common tones)
  { id: 'TRI_M',        label: "Devil's Door",       appliesTo: ['M'], rootDelta: 6,  newQuality: 'M',    commonTones: 0 },
  { id: 'TRI_m',        label: 'Tritone Stalk',      appliesTo: ['m'], rootDelta: 6,  newQuality: 'm',    commonTones: 0 },

  // Slide — root moves a semitone, quality flips (1 common tone)
  { id: 'SLIDE_up',     label: 'Eerie Slide Up',     appliesTo: ['M','m'], rootDelta: 1,  newQuality: 'flip', commonTones: 1 },
  { id: 'SLIDE_dn',     label: 'Trembling Step',     appliesTo: ['M','m'], rootDelta: -1, newQuality: 'flip', commonTones: 1 },
]

// ── Apply transforms ──────────────────────────────────────────────

export interface AppliedTransform {
  transform: TransformDef
  newRoot: string
  newQuality: TriadQuality
}

const SEMITONE_INTERVALS_UP: Record<number, string> = {
  0: '1P', 1: '2m', 2: '2M', 3: '3m', 4: '3M', 5: '4P',
  6: '5d', 7: '5P', 8: '6m', 9: '6M', 10: '7m', 11: '7M',
}

/** Transpose preserving the source's spelling family; if tonal returns a
 *  double accidental, fall back to its enharmonic. */
function transposeClean(root: string, deltaSemis: number): string {
  const up = ((deltaSemis % 12) + 12) % 12
  const ivl = SEMITONE_INTERVALS_UP[up]
  let r = Note.transpose(root, ivl) || root
  if (r.includes('##') || r.includes('bb')) {
    const enh = Note.enharmonic(r)
    if (enh) r = enh
  }
  return r
}

export function getTransformCandidates(
  sourceRoot: string,
  sourceQuality: TriadQuality,
): AppliedTransform[] {
  const sourceChroma = Note.chroma(sourceRoot)
  if (sourceChroma == null) return []
  if (sourceQuality !== 'M' && sourceQuality !== 'm') return []
  const out: AppliedTransform[] = []
  for (const t of TRANSFORMS) {
    if (!t.appliesTo.includes(sourceQuality)) continue
    const newRoot = transposeClean(sourceRoot, t.rootDelta)
    let newQuality: TriadQuality
    switch (t.newQuality) {
      case 'flip': newQuality = sourceQuality === 'M' ? 'm' : 'M'; break
      case 'same': newQuality = sourceQuality;                      break
      default:     newQuality = t.newQuality
    }
    out.push({ transform: t, newRoot, newQuality })
  }
  return out
}

export interface TransformCandidate {
  transform: TransformDef
  chord: ChordEntry
  commonTones: number
}

// Lookup roman numeral for a chord whose root is `semitones` above the
// song's tonic and whose quality is the given triad quality.
const ROMAN_BY_SEMITONE: Record<number, { M: string; m: string }> = {
  0:  { M: 'I',    m: 'i'    },
  1:  { M: '♭II',  m: '♭ii'  },
  2:  { M: 'II',   m: 'ii'   },
  3:  { M: '♭III', m: '♭iii' },
  4:  { M: 'III',  m: 'iii'  },
  5:  { M: 'IV',   m: 'iv'   },
  6:  { M: '♭V',   m: '♭v'   },
  7:  { M: 'V',    m: 'v'    },
  8:  { M: '♭VI',  m: '♭vi'  },
  9:  { M: 'VI',   m: 'vi'   },
  10: { M: '♭VII', m: '♭vii' },
  11: { M: 'VII',  m: 'vii'  },
}

function romanFor(keyRoot: string, chordRoot: string, quality: TriadQuality): string {
  const kc = Note.chroma(keyRoot)
  const cc = Note.chroma(chordRoot)
  if (kc == null || cc == null) return ''
  const semis = ((cc - kc) + 12) % 12
  const entry = ROMAN_BY_SEMITONE[semis]
  if (!entry) return ''
  if (quality === 'd') return `${entry.m}°`
  if (quality === 'A') return `${entry.M}+`
  return quality === 'M' ? entry.M : entry.m
}

/** If the roman has a ♭ prefix, prefer the flat spelling of a sharp note.
 *  E.g. D♯ → E♭ when roman = ♭III, G♯ → A♭ when roman = ♭VI.
 *  This makes chromatic mediants in major keys read idiomatically. */
function preferFlatSpelling(roman: string, note: string): string {
  if (!roman.includes('♭')) return note
  if (!note.includes('#')) return note
  const enh = Note.enharmonic(note)
  return enh || note
}

export function buildTransformCandidates(
  currentChord: ChordEntry,
  scaleType: ScaleType,
  keyRoot?: string,
): TransformCandidate[] {
  const rq = analyseRootAndQuality(currentChord)
  if (!rq) return []
  const applied = getTransformCandidates(rq.root, rq.quality)
  const out: TransformCandidate[] = []
  for (const a of applied) {
    const roman = keyRoot ? romanFor(keyRoot, a.newRoot, a.newQuality) : ''
    const spelledRoot = preferFlatSpelling(roman, a.newRoot)
    const chord = buildAbsoluteChord(spelledRoot, a.newQuality, scaleType, a.transform.extensions, roman)
    if (!chord) continue
    out.push({
      transform: a.transform,
      chord,
      commonTones: commonToneCount(currentChord, chord),
    })
  }
  return out
}
