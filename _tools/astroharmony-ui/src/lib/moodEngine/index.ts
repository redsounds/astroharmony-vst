/**
 * Mood Engine — public entry point.
 *
 * Phase 1 ships:
 *   - 10 mood definitions (Epic, Dark, Hopeful, Sad, Tension,
 *     Mystery, Fantasy, Adventure, Love, Horror)
 *   - Roman-numeral function resolver (diatonic + borrowed + secondary
 *     dominants + a handful of specials like Vsus4)
 *   - Bigram + single-function suggestion algorithm with intensity
 *     weighting and resolution penalty
 *
 * Phase 2 will wire suggestNext() into the SuggestedChords UI.
 */

export * from './types'
export { suggestNext } from './suggest'
export type { SuggestOptions } from './suggest'
export { analyseChordFunction, resolveFunction } from './resolve'
export { MOODS, MOOD_LIST, getMood } from './data'
