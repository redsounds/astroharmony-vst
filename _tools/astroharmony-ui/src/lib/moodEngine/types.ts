/**
 * Mood Engine — TYPES
 *
 * Every transition in a mood definition uses *Roman-numeral functions*
 * (relative to the current key + scale) so the same data works in every
 * tonality.
 *
 * Function-name conventions used throughout the engine:
 *   Uppercase     = major-quality triad/seventh (I, IV, V, ♭VI, ♭VII)
 *   Lowercase     = minor-quality                 (i, ii, iii, iv, vi)
 *   ° suffix      = diminished                    (vii°, ii°)
 *   ♭ / ♯ prefix  = borrowed / chromatically altered
 *   /X suffix     = secondary dominant of X       (V/V, V/vi, V/IV)
 */

import type { Inversion, VoicingType } from '@/types/music'

// ── Function vocabulary ────────────────────────────────────────────

export type DiatonicFunction =
  // Major diatonic
  | 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°'
  // Minor diatonic (natural)
  | 'i' | 'ii°' | 'III' | 'iv' | 'v' | 'VI' | 'VII'
  // Lydian-mode II (major on 2nd degree — appears in Lydian, Lydian Dom, etc.)
  | 'II'
  // Borrowed / modal-mixture (most common)
  | '♭II' | '♭III' | '♭V' | '♭VI' | '♭VII'
  // Secondary dominants
  | 'V/V' | 'V/vi' | 'V/IV' | 'V/ii' | 'V/iii'
  // Special cases
  | 'I+' | 'i°' | 'Vsus4'

// ── Transition record ─────────────────────────────────────────────

export interface MoodTransition {
  /** What chord function the engine should suggest next. */
  next: DiatonicFunction
  /** 0-10 priority; engine sorts descending. */
  weight: number
  /** Short, human-friendly label shown above the suggested pill. */
  label: string
  /** Chord extension stack to apply (e.g. ['maj7','add9']). Optional. */
  extensions?: string[]
  /** Preferred bar count for this transition. Defaults to mood.defaultBars. */
  preferredBars?: number
  /** Voicing override (lets dark transitions force cluster, etc.). */
  voicingHint?: VoicingType
  /** Inversion override (used for voice-leading). */
  inversionHint?: Inversion
}

// ── Mood definition ────────────────────────────────────────────────

export interface MoodDefinition {
  id: string
  label: string
  description: string

  /** Scales that naturally express this mood. UI may suggest a switch. */
  preferredModes: string[]

  /**
   * Root key suggested by this mood — drives historical / cinematic
   * convention (e.g. Epic → E♭ for Star Wars heroism, Sad → A minor).
   * Applied to the global root when the mood is selected. Sharps only
   * ('C', 'C#', 'D', 'D#', ...) — flats are sharp-named (E♭ = 'D#').
   */
  preferredRoot?: string

  /** Default voicing if a transition does not override. */
  defaultVoicing: VoicingType
  /** Default bar length per suggested chord. */
  defaultBars: number

  /**
   * Whether to *penalise* the perfect-authentic cadence (V→i / V→I).
   * Dark / Tension moods avoid resolution; Hope moods embrace it.
   */
  avoidsResolution: boolean

  /**
   * Top-level transition table keyed by the function of the
   * current chord. If `vi` is the last chord, the engine looks up
   * `fromFunction['vi']` for candidates.
   */
  fromFunction: Partial<Record<DiatonicFunction, MoodTransition[]>>

  /**
   * Optional bigram table — looked up first. Keys join the last two
   * functions with '→' (e.g. 'i→VI'). If present, overrides the
   * single-function lookup for that pair.
   */
  fromBigram?: Record<string, MoodTransition[]>

  /**
   * Seed chords used when the progression is empty — gives the user
   * something resonant to start with.
   */
  seeds: MoodTransition[]

  /**
   * Per-transform weights for the chord-relative engine (P, L, R,
   * chromatic mediants, tritone, slide). Keys match transform `id`s in
   * lib/moodEngine/transforms.ts. Higher = the mood prefers that move.
   * Missing keys default to 0 (transform won't surface).
   */
  transformWeights?: Record<string, number>

  /**
   * Whether this mood treats jarring (0-common-tone) transforms as a
   * feature (Horror, Tension) instead of a penalty. Defaults to false.
   */
  embracesJarringMoves?: boolean
}

// ── Suggestion output ─────────────────────────────────────────────

import type { ChordEntry } from '@/types/music'

export interface MoodSuggestion {
  /** A real, key-resolved chord ready to drop into the progression. */
  chord: ChordEntry
  /** Original transition record (label, weight, hints). */
  transition: MoodTransition
  /** Numeric score used to rank suggestions (after intensity weighting). */
  score: number
  /** True if the engine had to fall back from a bigram to single-function. */
  fromBigram: boolean
  /** True when every chord tone belongs to the active scale/mode. */
  inMode: boolean
}
