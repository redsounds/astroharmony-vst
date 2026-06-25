/**
 * suggestNext — given the current state of a composition, return the
 * top-N chord candidates for a given mood.
 *
 * Pipeline:
 *   1. Determine the function of the last 1-2 chords.
 *   2. Collect key-relative candidates:
 *        a) bigram transitions (last two chords), if any
 *        b) single-function transitions
 *   3. Collect chord-relative candidates from neo-Riemannian /
 *      chromatic-mediant transforms (P, L, R, CM, tritone, slide).
 *   4. Score every candidate with:
 *        - mood weight × intensity × resolution penalty
 *        - in-mode boost / out-of-mode penalty
 *        - common-tone bonus (smooth voice-leading rewards 2 shared
 *          tones; jarring moods invert the curve to embrace 0-shared)
 *   5. Deduplicate by chord pitch-class set, keep highest scored.
 *   6. Sort, take top N.
 *
 * Pure function: no React, no store, no side effects.
 */

import { Note } from 'tonal'
import type { ChordEntry, ScaleType } from '@/types/music'
import type { MoodDefinition, MoodSuggestion, MoodTransition } from './types'
import { analyseChordFunction, resolveFunction } from './resolve'
import { getScaleNotes, normaliseRootForScale } from '@/lib/theory'
import { buildTransformCandidates, type TransformCandidate } from './transforms'

export interface SuggestOptions {
  /** Currently selected mood definition. */
  mood: MoodDefinition
  /** Tonic of the active key (e.g. 'C', 'F#'). */
  root: string
  /** Active scale/mode. */
  scaleType: ScaleType
  /** Existing chords in the progression. Latest is at the end. */
  progression: ChordEntry[]
  /** 0..1 — how chromatic / unexpected to allow. Default 0.5. */
  intensity?: number
  /** How many suggestions to return. Default 5. */
  topN?: number
}

const BORROWED_FUNCTIONS = new Set(['♭II', '♭III', '♭V', '♭VI', '♭VII', 'V/V', 'V/vi', 'V/IV', 'V/ii', 'V/iii'])

function intensityMultiplier(fn: string, intensity: number): number {
  const isBorrowed = BORROWED_FUNCTIONS.has(fn)
  if (isBorrowed) return 0.3 + intensity * 1.0
  return 1.0 - intensity * 0.15
}

function resolutionPenalty(nextFn: string, currentFn: string | null, mood: MoodDefinition): number {
  if (!mood.avoidsResolution) return 1.0
  if ((currentFn === 'V' || currentFn === 'V/V') && (nextFn === 'I' || nextFn === 'i')) {
    return 0.55
  }
  return 1.0
}

function jitter(seed: number): number {
  return ((Math.sin(seed * 9301) * 233280) % 1 + 1) % 1 * 0.02
}

/**
 * Voice-leading bonus.
 *   2 shared tones → 1.30   (sweet spot — smooth, P/L/R territory)
 *   1 shared tone  → 1.10   (colourful chromatic mediant)
 *   3 shared tones → 1.00   (very smooth but musically static)
 *   0 shared tones → 0.75   (jarring) — INVERTED for `embracesJarringMoves`
 */
function commonToneMultiplier(common: number, mood: MoodDefinition): number {
  if (mood.embracesJarringMoves) {
    switch (common) {
      case 0: return 1.30
      case 1: return 1.10
      case 2: return 0.90
      default: return 0.80
    }
  }
  switch (common) {
    case 0: return 0.75
    case 1: return 1.10
    case 2: return 1.30
    default: return 1.00
  }
}

function chromaSet(notes: string[]): Set<number> {
  const s = new Set<number>()
  for (const n of notes) { const c = Note.chroma(n); if (c != null) s.add(c) }
  return s
}

function fingerprint(chord: ChordEntry): string {
  return [...chromaSet(chord.notes)].sort((a, b) => a - b).join(',')
}

// ── Public API ────────────────────────────────────────────────────

export function suggestNext(opts: SuggestOptions): MoodSuggestion[] {
  const { mood, scaleType, progression } = opts
  // Resolve every chord against the clean enharmonic root so transforms
  // like Note.transpose('D#','3M') don't end up with F##. The scale itself
  // (and any roman-based names) already use the clean spelling.
  const root = normaliseRootForScale(opts.root, scaleType)
  const intensity = opts.intensity ?? 0.5
  const topN = opts.topN ?? 5

  const scaleNotes = getScaleNotes(root, scaleType)
  const scaleChromas = new Set(
    scaleNotes.map(n => Note.chroma(n)).filter((c): c is number => c != null),
  )

  // Seeds-only when the progression is empty.
  if (progression.length === 0) {
    const seeds = scoreFunctionList(mood.seeds, mood, root, scaleType, null, intensity, scaleChromas, false, null)
    return finalise(seeds, topN)
  }

  const last = progression[progression.length - 1]
  const prev = progression.length >= 2 ? progression[progression.length - 2] : null
  const lastFn = analyseChordFunction(last, root, scaleType)
  const prevFn = prev ? analyseChordFunction(prev, root, scaleType) : null

  const candidates: MoodSuggestion[] = []

  // 1) Bigram lookup
  if (prevFn && lastFn && mood.fromBigram) {
    const key = `${prevFn}→${lastFn}`
    const list = mood.fromBigram[key]
    if (list && list.length > 0) {
      candidates.push(...scoreFunctionList(
        list, mood, root, scaleType, lastFn, intensity, scaleChromas, true, last,
      ))
    }
  }

  // 2) Single-function lookup
  if (lastFn && mood.fromFunction[lastFn]) {
    candidates.push(...scoreFunctionList(
      mood.fromFunction[lastFn]!, mood, root, scaleType, lastFn, intensity, scaleChromas, false, last,
    ))
  }

  // 3) Chord-relative transforms (P / L / R / chromatic mediants / tritone / slide).
  // These work even if the current chord isn't a recognised diatonic
  // function, and add the chord-relative emotional vocabulary the
  // research highlights as essential for cinematic motion.
  if (mood.transformWeights) {
    candidates.push(...scoreTransformList(
      buildTransformCandidates(last, scaleType, root), mood, intensity, scaleChromas, last,
    ))
  }

  // Final fallback — seeds if we couldn't generate anything.
  if (candidates.length === 0) {
    candidates.push(...scoreFunctionList(
      mood.seeds, mood, root, scaleType, null, intensity, scaleChromas, false, null,
    ))
  }

  return finalise(candidates, topN)
}

// ── Scoring helpers ───────────────────────────────────────────────

function scoreFunctionList(
  transitions: MoodTransition[],
  mood: MoodDefinition,
  root: string,
  scaleType: ScaleType,
  currentFn: string | null,
  intensity: number,
  scaleChromas: Set<number>,
  fromBigram: boolean,
  currentChord: ChordEntry | null,
): MoodSuggestion[] {
  const out: MoodSuggestion[] = []
  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i]
    const chord = resolveFunction(t.next, root, scaleType, t.extensions)
    if (!chord) continue

    const enriched: ChordEntry = {
      ...chord,
      voicingType: t.voicingHint ?? mood.defaultVoicing,
      inversion: t.inversionHint,
    }

    const allInMode = chord.notes.every(n => {
      const c = Note.chroma(n)
      return c != null && scaleChromas.has(c)
    })
    const modeMultiplier = allInMode ? 1.35 : 0.65

    // Common-tone count vs. the current chord (skipped when seeding)
    let commonMul = 1.0
    if (currentChord) {
      const curChromas = chromaSet(currentChord.notes)
      const cChromas = chromaSet(chord.notes)
      let common = 0
      for (const c of cChromas) if (curChromas.has(c)) common++
      commonMul = commonToneMultiplier(common, mood)
    }

    const score = t.weight
      * intensityMultiplier(t.next, intensity)
      * resolutionPenalty(t.next, currentFn, mood)
      * modeMultiplier
      * commonMul
      + jitter(i + (currentFn?.length ?? 0))

    out.push({ chord: enriched, transition: t, score, fromBigram, inMode: allInMode })
  }
  return out
}

function scoreTransformList(
  candidates: TransformCandidate[],
  mood: MoodDefinition,
  intensity: number,
  scaleChromas: Set<number>,
  currentChord: ChordEntry,
): MoodSuggestion[] {
  const out: MoodSuggestion[] = []
  const weights = mood.transformWeights ?? {}
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const weight = weights[c.transform.id]
    if (!weight) continue  // mood declined this transform

    const chord: ChordEntry = {
      ...c.chord,
      voicingType: c.transform.voicingHint ?? mood.defaultVoicing,
    }

    const allInMode = chord.notes.every(n => {
      const ch = Note.chroma(n)
      return ch != null && scaleChromas.has(ch)
    })
    const modeMultiplier = allInMode ? 1.20 : 0.85   // transforms are by nature chromatic; soft penalty only
    const commonMul = commonToneMultiplier(c.commonTones, mood)
    // Intensity dial: at intensity 0, weight transforms down; at 1, up
    const intensityMul = 0.6 + intensity * 0.8

    const score = weight
      * modeMultiplier
      * commonMul
      * intensityMul
      + jitter(i + c.transform.id.length)

    // Synthesise a MoodTransition shape so the UI doesn't need a new branch
    const transition: MoodTransition = {
      next: (c.chord.roman || c.transform.id) as MoodTransition['next'],
      weight,
      label: c.transform.label,
      extensions: c.transform.extensions,
      voicingHint: c.transform.voicingHint,
    }

    out.push({ chord, transition, score, fromBigram: false, inMode: allInMode })
  }
  return out
}

function finalise(candidates: MoodSuggestion[], topN: number): MoodSuggestion[] {
  // Dedup by pitch-class set, keep the best-scored entry for each.
  const best = new Map<string, MoodSuggestion>()
  for (const c of candidates) {
    const key = fingerprint(c.chord)
    const existing = best.get(key)
    if (!existing || c.score > existing.score) best.set(key, c)
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score)
  return ranked.slice(0, topN)
}
