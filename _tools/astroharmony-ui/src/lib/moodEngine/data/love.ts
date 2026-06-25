import type { MoodDefinition } from '../types'

/**
 * LOVE — Ionian / Lydian / Dorian.
 * Inspirations: jazz ballads (Bill Evans), La La Land, Chet Baker,
 * 50s romance progressions. ii-V-I, gentle vi-substitutions, Δ7/add9.
 */
export const LOVE: MoodDefinition = {
  id: 'love',
  label: 'Love',
  description: 'Romantic, warm',
  preferredModes: ['ionian', 'lydian', 'dorian'],
  preferredRoot: 'F',
  defaultVoicing: 'neoSoul',
  defaultBars: 4,
  avoidsResolution: false,

  // Smooth voice-leading. R (relative minor) and L (hopeful lift) dominate.
  transformWeights: {
    R_M:            10,
    L_M:             8,
    P:               7,
    R_m:             8,
    CM_upM3_same:    5,
    L_m:             6,
  },

  seeds: [
    { next: 'I',    weight: 10, label: 'Warm Open',     extensions: ['maj7','add9'], preferredBars: 4 },
    { next: 'vi',   weight: 8,  label: 'Tender Start',  extensions: ['m9'],          preferredBars: 4 },
    { next: 'IV',   weight: 7,  label: 'Soft Greeting', extensions: ['maj7'],        preferredBars: 4 },
    { next: 'ii',   weight: 6,  label: 'Quiet Whisper', extensions: ['m9'] },
    { next: 'I',    weight: 5,  label: 'Lydian Glow',   extensions: ['maj7','#11'],  preferredBars: 4 },
  ],

  fromFunction: {
    I: [
      { next: 'vi',   weight: 10, label: 'Tender Heart',     extensions: ['m9'],          preferredBars: 2 },
      { next: 'IV',   weight: 9,  label: 'Soft Embrace',     extensions: ['maj7'],        preferredBars: 2 },
      { next: 'V',    weight: 7,  label: 'Yearning Look',    extensions: ['sus4'],        preferredBars: 1 },
      { next: 'iii',  weight: 6,  label: 'Quiet Reflection', extensions: ['m7'] },
      { next: 'V/vi', weight: 6,  label: 'Confession',       extensions: ['7'] },
      { next: 'ii',   weight: 6,  label: 'Soft Question',    extensions: ['m9'] },
      { next: 'I',    weight: 4,  label: 'Lydian Glow',      extensions: ['maj7','#11'] },
      { next: '♭VI',  weight: 5,  label: 'Sudden Yearn',     extensions: ['maj7'] },
      { next: 'II',   weight: 5,  label: 'Magical Glance',   extensions: ['maj7'] },
      { next: 'V/IV', weight: 5,  label: 'Soft Sigh',        extensions: ['7'] },
    ],
    vi: [
      { next: 'IV',   weight: 10, label: "Lover's Step",     extensions: ['maj7'],        preferredBars: 2 },
      { next: 'I',    weight: 7,  label: 'Returning Light',  extensions: ['add9'] },
      { next: 'ii',   weight: 7,  label: 'Soft Question',    extensions: ['m7'] },
      { next: 'V',    weight: 6,  label: 'Yearning Build',   extensions: ['sus4'] },
      { next: 'iii',  weight: 5,  label: 'Inner Whisper',    extensions: ['m9'] },
      { next: 'V/V',  weight: 4,  label: 'Distant Hope',     extensions: ['7'] },
    ],
    IV: [
      { next: 'I',    weight: 10, label: 'Coming Home',      extensions: ['maj7'],        preferredBars: 4 },
      { next: 'V',    weight: 8,  label: 'Pleading Look',    extensions: ['sus4'],        preferredBars: 1 },
      { next: 'vi',   weight: 7,  label: 'Bittersweet',      extensions: ['m9'] },
      { next: 'ii',   weight: 5,  label: 'Soft Step',        extensions: ['m7'] },
      { next: 'iii',  weight: 4,  label: 'Inner Step',       extensions: ['m9'] },
      { next: 'IV',   weight: 4,  label: 'Lydian Glow',      extensions: ['maj7','#11'] },
      { next: 'V/V',  weight: 4,  label: 'Distant Yearn',    extensions: ['7'] },
    ],
    V: [
      { next: 'vi',   weight: 10, label: 'Yearning',         extensions: ['m9'],          preferredBars: 2 },
      { next: 'I',    weight: 8,  label: 'Embrace',          extensions: ['maj7'],        preferredBars: 4 },
      { next: 'IV',   weight: 5,  label: 'Soft Sigh',        extensions: ['maj7'] },
      { next: 'iii',  weight: 5,  label: 'Quiet Step',       extensions: ['m9'] },
      { next: 'ii',   weight: 4,  label: 'Pull Back',        extensions: ['m9'] },
    ],
    ii: [
      { next: 'V',    weight: 10, label: 'Jazz Build',       extensions: ['7','sus4'] },
      { next: 'I',    weight: 6,  label: 'Gentle Rest',      extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Soft Pivot',       extensions: ['m9'] },
      { next: 'iii',  weight: 4,  label: 'Inner Step',       extensions: ['m7'] },
    ],
    iii: [
      { next: 'vi',   weight: 9,  label: 'Yearning Step',    extensions: ['m9'] },
      { next: 'IV',   weight: 7,  label: 'Soft Ascent',      extensions: ['maj7'] },
      { next: 'ii',   weight: 5,  label: 'Inner Question',   extensions: ['m9'] },
      { next: 'V/vi', weight: 5,  label: 'Confession',       extensions: ['7'] },
    ],
    II: [
      { next: 'I',    weight: 9,  label: 'Lydian Glow',      extensions: ['maj7','#11'] },
      { next: 'V',    weight: 6,  label: 'Magical Build',    extensions: ['sus4'] },
      { next: 'vi',   weight: 5,  label: 'Quiet Step',       extensions: ['m9'] },
    ],
    '♭VI': [
      { next: 'I',    weight: 8,  label: 'Sudden Light',     extensions: ['add9'] },
      { next: 'IV',   weight: 7,  label: 'Modal Step',       extensions: ['maj7'] },
      { next: '♭VII', weight: 5,  label: 'Modal Climb' },
    ],
    '♭VII': [
      { next: 'IV',   weight: 8,  label: 'Modal Glow',       extensions: ['maj7'] },
      { next: 'I',    weight: 7,  label: 'Modal Return',     extensions: ['add9'] },
    ],
    'V/vi': [
      { next: 'vi',   weight: 10, label: 'Yearning Reach',   extensions: ['m9'] },
      { next: 'IV',   weight: 5,  label: 'Modal Escape',     extensions: ['maj7'] },
    ],
    'V/IV': [
      { next: 'IV',   weight: 10, label: 'Subdom Embrace',   extensions: ['maj7'] },
      { next: 'I',    weight: 5,  label: 'Soft Land',        extensions: ['maj7'] },
    ],
    'V/V': [
      { next: 'V',    weight: 10, label: 'Distant→Near',     extensions: ['sus4'] },
      { next: 'vi',   weight: 6,  label: 'Deceptive Yearn',  extensions: ['m9'] },
    ],
    '♭III': [
      { next: 'IV',   weight: 7,  label: 'Modal Walk',       extensions: ['maj7'] },
      { next: 'I',    weight: 6,  label: 'Sudden Light',     extensions: ['add9'] },
    ],
  },

  fromBigram: {
    'I→vi':   [
      { next: 'IV',   weight: 10, label: 'Love Story',       extensions: ['maj7'],        preferredBars: 2 },
      { next: 'V',    weight: 7,  label: 'Yearning Build',   extensions: ['sus4'] },
      { next: 'ii',   weight: 6,  label: 'Soft Question',    extensions: ['m9'] },
      { next: 'iii',  weight: 5,  label: 'Inner Step',       extensions: ['m9'] },
    ],
    'vi→IV':  [
      { next: 'I',    weight: 10, label: 'Sweet Return',     extensions: ['maj7','add9'] },
      { next: 'V',    weight: 7,  label: 'Pleading',         extensions: ['sus4'] },
      { next: 'ii',   weight: 5,  label: 'Inner Path',       extensions: ['m9'] },
    ],
    'IV→I':   [
      { next: 'vi',   weight: 9,  label: 'Tender Coda',      extensions: ['m9'] },
      { next: 'V',    weight: 7,  label: 'Sweet Question',   extensions: ['sus4'] },
      { next: 'ii',   weight: 6,  label: 'Soft Step',        extensions: ['m9'] },
    ],
    'ii→V':   [
      { next: 'I',    weight: 10, label: 'Jazz Cadence',     extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Deceptive',        extensions: ['m9'] },
      { next: 'iii',  weight: 5,  label: 'Lateral Step',     extensions: ['m9'] },
    ],
    'I→IV':   [
      { next: 'V',    weight: 9,  label: 'Authentic Embrace',extensions: ['sus4'] },
      { next: 'I',    weight: 7,  label: 'Plagal Vamp',      extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Bittersweet',      extensions: ['m9'] },
    ],
    'V→vi':   [
      { next: 'IV',   weight: 10, label: 'Romance Cycle',    extensions: ['maj7'] },
      { next: 'ii',   weight: 6,  label: 'Inner Step',       extensions: ['m9'] },
      { next: 'iii',  weight: 5,  label: 'Quiet Sway',       extensions: ['m9'] },
    ],
    'iii→vi': [
      { next: 'ii',   weight: 8,  label: 'Soft Step',        extensions: ['m9'] },
      { next: 'IV',   weight: 7,  label: 'Yearning Lift',    extensions: ['maj7'] },
      { next: 'V',    weight: 5,  label: 'Pleading',         extensions: ['sus4'] },
    ],
    'I→V':    [
      { next: 'vi',   weight: 10, label: 'Yearning Reach',   extensions: ['m9'] },
      { next: 'IV',   weight: 7,  label: 'Soft Sway',        extensions: ['maj7'] },
    ],
  },
}
