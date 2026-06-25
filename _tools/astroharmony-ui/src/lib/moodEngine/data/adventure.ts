import type { MoodDefinition } from '../types'

/**
 * ADVENTURE — Mixolydian / Ionian / Dorian.
 * Inspirations: Indiana Jones, Star Wars main theme, The Mandalorian,
 * Pirates of the Caribbean. Bold open voicings, marching motion.
 */
export const ADVENTURE: MoodDefinition = {
  id: 'adventure',
  label: 'Adventure',
  description: 'Bold, exciting, dynamic',
  preferredModes: ['mixolydian', 'ionian', 'dorian'],
  preferredRoot: 'D',
  defaultVoicing: 'cinematic',
  defaultBars: 1,
  avoidsResolution: false,

  // Hero theme: L lift + Heroic Mediant; descending mediants for plot twists.
  transformWeights: {
    L_M:            10,
    CM_upm3_same:    9,
    CM_dnm3_same:    7,
    R_M:             8,
    P:               5,
    L_m:             7,
    CM_upM3_same:    8,
  },

  seeds: [
    { next: 'I',    weight: 10, label: 'Bold Open',       extensions: ['add9'],         preferredBars: 2 },
    { next: 'V',    weight: 7,  label: 'Heroic Call',     extensions: ['sus4'],         preferredBars: 1 },
    { next: 'IV',   weight: 7,  label: 'Open Road',       extensions: ['maj7'],         preferredBars: 2 },
    { next: '♭VII', weight: 6,  label: 'Mixo Drone',                                    preferredBars: 4 },
    { next: 'vi',   weight: 5,  label: 'Cautious Start',  extensions: ['m9'],           preferredBars: 4 },
  ],

  fromFunction: {
    I: [
      { next: 'V',    weight: 10, label: 'Heroic Call',      extensions: ['sus4'],        preferredBars: 1 },
      { next: 'IV',   weight: 9,  label: 'Open Road',        extensions: ['maj7'],        preferredBars: 1 },
      { next: '♭VII', weight: 9,  label: 'Mixolydian Run' },
      { next: 'vi',   weight: 7,  label: 'Cautious Step',    extensions: ['m9'] },
      { next: 'V/V',  weight: 6,  label: 'Distant Goal',     extensions: ['7'] },
      { next: 'V/IV', weight: 5,  label: 'Side Path',        extensions: ['7'] },
      { next: 'iii',  weight: 6,  label: 'Inner Lift',       extensions: ['m9'] },
      { next: 'II',   weight: 5,  label: 'Lydian Surprise',  extensions: ['maj7','#11'] },
      { next: 'ii',   weight: 6,  label: 'Soft Question',    extensions: ['m9'] },
      { next: 'V/vi', weight: 5,  label: 'Plot Hook',        extensions: ['7'] },
      { next: '♭VI',  weight: 5,  label: 'Cinematic Shift',  extensions: ['maj7'] },
    ],
    IV: [
      { next: 'V',    weight: 10, label: 'Marching Forward', extensions: ['sus4'],        preferredBars: 1 },
      { next: 'I',    weight: 8,  label: 'Returning Home',   extensions: ['maj7'] },
      { next: '♭VII', weight: 8,  label: 'Off the Map' },
      { next: 'vi',   weight: 6,  label: 'Quiet Bend',       extensions: ['m9'] },
      { next: 'ii',   weight: 5,  label: 'Soft Step',        extensions: ['m9'] },
      { next: 'IV',   weight: 4,  label: 'Lydian Stretch',   extensions: ['maj7','#11'] },
    ],
    V: [
      { next: 'vi',   weight: 9,  label: 'Plot Twist',       extensions: ['m9'] },
      { next: 'I',    weight: 8,  label: 'Victory',          extensions: ['add9'],        preferredBars: 2 },
      { next: 'IV',   weight: 6,  label: 'Mixolydian Sway',  extensions: ['maj7'] },
      { next: '♭VI',  weight: 6,  label: 'Sudden Twist',     extensions: ['maj7'] },
      { next: 'V',    weight: 5,  label: 'Holding Sword',    extensions: ['sus4','7'] },
      { next: 'iii',  weight: 5,  label: 'Soft Step',        extensions: ['m9'] },
    ],
    vi: [
      { next: 'IV',   weight: 10, label: 'Pop Adventure',    extensions: ['maj7'],        preferredBars: 1 },
      { next: 'V',    weight: 8,  label: 'Rising Action',    extensions: ['sus4'] },
      { next: 'I',    weight: 6,  label: 'Brief Light',      extensions: ['add9'] },
      { next: 'ii',   weight: 6,  label: 'Reflection',       extensions: ['m9'] },
      { next: '♭VII', weight: 6,  label: 'Modal Bridge' },
    ],
    '♭VII': [
      { next: 'I',    weight: 9,  label: 'Mixo Cadence',     extensions: ['add9'] },
      { next: 'IV',   weight: 8,  label: 'Lateral Trek',     extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Modal Sway',       extensions: ['m9'] },
      { next: 'V',    weight: 5,  label: 'Modal Build',      extensions: ['sus4'] },
      { next: '♭VI',  weight: 5,  label: 'Modal Pivot',      extensions: ['maj7'] },
    ],
    ii: [
      { next: 'V',    weight: 9,  label: 'Build to Quest',   extensions: ['sus4'] },
      { next: 'I',    weight: 6,  label: 'Soft Land',        extensions: ['maj7'] },
      { next: 'IV',   weight: 5,  label: 'Side Step',        extensions: ['maj7'] },
    ],
    iii: [
      { next: 'IV',   weight: 8,  label: 'Tender Trek',      extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Inner Sway',       extensions: ['m9'] },
      { next: 'V/vi', weight: 6,  label: 'Plot Twist',       extensions: ['7'] },
    ],
    'V/V': [
      { next: 'V',    weight: 10, label: 'Double-Dom Lift',  extensions: ['sus4'] },
      { next: 'vi',   weight: 5,  label: 'Sidestep',         extensions: ['m9'] },
    ],
    'V/IV': [
      { next: 'IV',   weight: 10, label: 'Modal Path',       extensions: ['maj7'] },
      { next: 'I',    weight: 5,  label: 'Modal Land',       extensions: ['add9'] },
    ],
    'V/vi': [
      { next: 'vi',   weight: 10, label: 'Plot Pivot',       extensions: ['m9'] },
      { next: 'IV',   weight: 5,  label: 'Escape Route',     extensions: ['maj7'] },
    ],
    '♭VI': [
      { next: '♭VII', weight: 7,  label: 'Modal March' },
      { next: 'IV',   weight: 7,  label: 'Sudden Light',     extensions: ['maj7'] },
      { next: 'I',    weight: 6,  label: 'Triumph Return',   extensions: ['add9'] },
    ],
  },

  fromBigram: {
    'I→V':   [
      { next: 'vi',   weight: 10, label: '4-Chord Adventure',extensions: ['m9'],         preferredBars: 1 },
      { next: 'IV',   weight: 8,  label: 'March On',         extensions: ['maj7'] },
      { next: '♭VI',  weight: 6,  label: 'Sudden Twist',     extensions: ['maj7'] },
    ],
    'vi→IV': [
      { next: 'I',    weight: 10, label: 'Adventure Cycle',  extensions: ['add9'] },
      { next: 'V',    weight: 8,  label: 'Heroic Build',     extensions: ['sus4'] },
      { next: '♭VII', weight: 7,  label: 'Modal Bridge' },
    ],
    'IV→V':  [
      { next: 'I',    weight: 9,  label: 'Authentic Cadence',extensions: ['add9'] },
      { next: 'vi',   weight: 8,  label: 'Heroic Twist',     extensions: ['m9'] },
      { next: '♭VI',  weight: 6,  label: 'Sudden Doom',      extensions: ['maj7'] },
    ],
    'I→IV':  [
      { next: 'V',    weight: 9,  label: 'Marching Anthem',  extensions: ['sus4'] },
      { next: 'I',    weight: 7,  label: 'Anthem Vamp',      extensions: ['maj7'] },
      { next: '♭VII', weight: 6,  label: 'Modal Twist' },
    ],
    'I→♭VII':[
      { next: 'IV',   weight: 10, label: 'Mixo Hero',        extensions: ['maj7'] },
      { next: 'I',    weight: 7,  label: 'Mixo Vamp' },
      { next: 'V',    weight: 6,  label: 'Sudden Sword',     extensions: ['sus4'] },
    ],
    'V→vi':  [
      { next: 'IV',   weight: 10, label: 'Pop Adventure',    extensions: ['maj7'] },
      { next: '♭VII', weight: 7,  label: 'Modal Twist' },
      { next: 'I',    weight: 6,  label: 'Brief Light',      extensions: ['add9'] },
    ],
    '♭VII→IV': [
      { next: 'I',    weight: 9,  label: 'Mixo Anthem',      extensions: ['add9'] },
      { next: 'V',    weight: 6,  label: 'Marching Build',   extensions: ['sus4'] },
    ],
    'IV→I':  [
      { next: '♭VII', weight: 7,  label: 'Modal Loop' },
      { next: 'vi',   weight: 6,  label: 'Quiet Sway',       extensions: ['m9'] },
    ],
  },
}
