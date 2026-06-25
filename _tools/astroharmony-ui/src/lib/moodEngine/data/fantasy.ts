import type { MoodDefinition } from '../types'

/**
 * FANTASY — Lydian / Dorian / Lydian Augmented.
 * Inspirations: Harry Potter, Studio Ghibli, Howard Shore (LOTR),
 * Nintendo overworld themes.
 * Floating Lydian #11, surprise modal mixture, magical lift.
 */
export const FANTASY: MoodDefinition = {
  id: 'fantasy',
  label: 'Fantasy',
  description: 'Magical, otherworldly',
  preferredModes: ['lydian', 'dorian', 'ionian', 'lydianAug'],
  preferredRoot: 'D#',
  defaultVoicing: 'openVoicing',
  defaultBars: 2,
  avoidsResolution: false,

  // Fantasy = Magic Mediant (C → E major). Harry Potter, Ghibli ground.
  transformWeights: {
    CM_upM3_same:   10,   // the magical move
    CM_dnM3_same:    8,
    L_M:             8,
    CM_upm3_same:    7,
    R_M:             6,
    R_m:             6,
    P:               4,
  },

  seeds: [
    { next: 'I',    weight: 10, label: 'Magical Opening', extensions: ['maj7','#11'], preferredBars: 4 },
    { next: 'vi',   weight: 7,  label: 'Enchanted Step',  extensions: ['m9'],         preferredBars: 4 },
    { next: 'iii',  weight: 6,  label: 'Whimsical Start', extensions: ['m9'],         preferredBars: 2 },
    { next: 'II',   weight: 6,  label: 'Lydian Float',    extensions: ['maj7'],       preferredBars: 4 },
    { next: 'IV',   weight: 5,  label: 'Magical Lift',    extensions: ['maj7','#11'], preferredBars: 4 },
  ],

  fromFunction: {
    I: [
      { next: 'II',   weight: 10, label: 'Lydian Float',     extensions: ['maj7'],        preferredBars: 2 },
      { next: 'iii',  weight: 8,  label: 'Whimsical Lift',   extensions: ['m7'] },
      { next: 'vi',   weight: 7,  label: 'Magical Step',     extensions: ['m9'] },
      { next: '♭VI',  weight: 7,  label: 'Chromatic Wonder', extensions: ['maj7'] },
      { next: 'V/vi', weight: 6,  label: 'Plot Twist',       extensions: ['7'] },
      { next: 'IV',   weight: 7,  label: 'Soft Magic',       extensions: ['maj7','#11'] },
      { next: 'V',    weight: 6,  label: 'Open Sky',         extensions: ['sus4'] },
      { next: '♭VII', weight: 6,  label: 'Mixo Drift' },
      { next: 'III',  weight: 5,  label: 'Sudden Reveal',    extensions: ['maj7'] },
      { next: 'V/IV', weight: 5,  label: 'Distant Bell',     extensions: ['7'] },
      { next: 'ii',   weight: 5,  label: 'Soft Question',    extensions: ['m9'] },
    ],
    II: [
      { next: 'I',    weight: 10, label: 'Lydian Cadence',   extensions: ['maj7','#11'] },
      { next: 'IV',   weight: 7,  label: 'Subdominant Step', extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Quiet Step',       extensions: ['m9'] },
      { next: 'V',    weight: 6,  label: 'Magical Build',    extensions: ['sus4'] },
      { next: 'iii',  weight: 5,  label: 'Soft Step',        extensions: ['m9'] },
    ],
    iii: [
      { next: 'IV',   weight: 9,  label: 'Spiral Up',        extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Modal Lift',       extensions: ['m9'] },
      { next: 'I',    weight: 5,  label: 'Soft Return',      extensions: ['maj7'] },
      { next: 'II',   weight: 6,  label: 'Sudden Magic',     extensions: ['maj7'] },
      { next: 'ii',   weight: 5,  label: 'Inner Step',       extensions: ['m9'] },
    ],
    IV: [
      { next: 'V',    weight: 8,  label: 'Magical Ascent',   extensions: ['sus4'] },
      { next: 'I',    weight: 7,  label: 'Cadence',          extensions: ['maj7'] },
      { next: 'II',   weight: 8,  label: 'Lydian Open',      extensions: ['maj7','#11'] },
      { next: 'vi',   weight: 6,  label: 'Bittersweet Step', extensions: ['m9'] },
      { next: 'iii',  weight: 5,  label: 'Inner Lift',       extensions: ['m9'] },
      { next: '♭VII', weight: 6,  label: 'Modal Twist' },
    ],
    vi: [
      { next: 'IV',   weight: 9,  label: 'Enchanted Step',   extensions: ['maj7'] },
      { next: 'II',   weight: 7,  label: 'Sudden Magic',     extensions: ['maj7'] },
      { next: 'I',    weight: 6,  label: 'Soft Return',      extensions: ['add9'] },
      { next: 'iii',  weight: 6,  label: 'Inner Spiral',     extensions: ['m9'] },
      { next: 'V',    weight: 5,  label: 'Yearning Build',   extensions: ['sus4'] },
    ],
    '♭VI': [
      { next: 'I',    weight: 7,  label: 'Magical Return',   extensions: ['add9'] },
      { next: 'IV',   weight: 7,  label: 'Otherworldly',     extensions: ['maj7'] },
      { next: '♭VII', weight: 6,  label: 'Modal Climb' },
      { next: 'II',   weight: 5,  label: 'Sudden Bell',      extensions: ['maj7'] },
    ],
    '♭VII': [
      { next: 'IV',   weight: 8,  label: 'Mixo Magic',       extensions: ['maj7'] },
      { next: 'I',    weight: 7,  label: 'Modal Cadence',    extensions: ['add9'] },
      { next: 'vi',   weight: 6,  label: 'Modal Sway',       extensions: ['m9'] },
    ],
    III: [
      { next: 'vi',   weight: 9,  label: 'Magical Step',     extensions: ['m9'] },
      { next: 'IV',   weight: 6,  label: 'Soft Lift',        extensions: ['maj7'] },
      { next: 'I',    weight: 5,  label: 'Sudden Light',     extensions: ['maj7'] },
    ],
    V: [
      { next: 'I',    weight: 8,  label: 'Magical Cadence',  extensions: ['maj7'] },
      { next: 'vi',   weight: 8,  label: 'Plot Twist',       extensions: ['m9'] },
      { next: 'IV',   weight: 5,  label: 'Plagal Magic',     extensions: ['maj7'] },
      { next: 'iii',  weight: 5,  label: 'Soft Step',        extensions: ['m9'] },
    ],
    ii: [
      { next: 'V',    weight: 8,  label: 'Soft Build',       extensions: ['sus4'] },
      { next: 'I',    weight: 6,  label: 'Quiet Resolution', extensions: ['maj7'] },
      { next: 'iii',  weight: 5,  label: 'Lateral Step',     extensions: ['m9'] },
      { next: 'IV',   weight: 5,  label: 'Modal Step',       extensions: ['maj7'] },
    ],
    'V/vi': [
      { next: 'vi',   weight: 10, label: 'Magical Twist',    extensions: ['m9'] },
      { next: 'IV',   weight: 5,  label: 'Modal Escape',     extensions: ['maj7'] },
    ],
  },

  fromBigram: {
    'I→II':   [
      { next: 'I',    weight: 9, label: 'Lydian Vamp',       extensions: ['maj7','#11'] },
      { next: 'IV',   weight: 7, label: 'Soft Anchor',       extensions: ['maj7'] },
      { next: 'vi',   weight: 6, label: 'Enchanted Step',    extensions: ['m9'] },
    ],
    'I→vi':   [
      { next: 'II',   weight: 9, label: 'Magic Step',        extensions: ['maj7'] },
      { next: 'IV',   weight: 8, label: 'Enchanted Path',    extensions: ['maj7'] },
      { next: 'iii',  weight: 6, label: 'Inner Spiral',      extensions: ['m9'] },
    ],
    'vi→IV':  [
      { next: 'I',    weight: 9, label: 'Magical Return',    extensions: ['add9'] },
      { next: 'II',   weight: 8, label: 'Lydian Lift',       extensions: ['maj7','#11'] },
      { next: 'V',    weight: 6, label: 'Build to Cast',     extensions: ['sus4'] },
    ],
    'I→iii':  [
      { next: 'IV',   weight: 9, label: 'Tender Ascent',     extensions: ['maj7'] },
      { next: 'vi',   weight: 7, label: 'Inner Spiral',      extensions: ['m9'] },
      { next: 'II',   weight: 6, label: 'Sudden Magic',      extensions: ['maj7'] },
    ],
    'iii→IV': [
      { next: 'V',    weight: 8, label: 'Climactic Cast',    extensions: ['sus4'] },
      { next: 'I',    weight: 7, label: 'Magical Land',      extensions: ['maj7'] },
      { next: 'II',   weight: 6, label: 'Lydian Open',       extensions: ['maj7','#11'] },
    ],
    'IV→I':   [
      { next: 'vi',   weight: 8, label: 'Enchanted Sway',    extensions: ['m9'] },
      { next: 'II',   weight: 7, label: 'Magic Open',        extensions: ['maj7','#11'] },
    ],
    'V→vi':   [
      { next: 'IV',   weight: 9, label: 'Magical Loop',      extensions: ['maj7'] },
      { next: 'II',   weight: 7, label: 'Sudden Magic',      extensions: ['maj7'] },
    ],
    'I→IV':   [
      { next: 'II',   weight: 8, label: 'Lydian Build',      extensions: ['maj7','#11'] },
      { next: 'V',    weight: 6, label: 'Bell Toll',         extensions: ['sus4'] },
    ],
  },
}
