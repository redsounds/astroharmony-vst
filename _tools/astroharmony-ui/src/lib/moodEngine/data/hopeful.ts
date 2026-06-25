import type { MoodDefinition } from '../types'

/**
 * HOPEFUL — Ionian / Lydian / Mixolydian.
 * Inspirations: Coldplay, Disney/Pixar, Up, Aaron Copland.
 * Plagal cadences, IV→I motion, gentle modal mixture for bittersweet lift.
 */
export const HOPEFUL: MoodDefinition = {
  id: 'hopeful',
  label: 'Hopeful',
  description: 'Uplifting, inspiring',
  preferredModes: ['ionian', 'lydian', 'mixolydian'],
  preferredRoot: 'F',
  defaultVoicing: 'pianoSpread',
  defaultBars: 2,
  avoidsResolution: false,

  // Rising mediants (Magic Mediant, Heroic Mediant) and the classic L
  // lift drive the hopeful character. Parallel down (M→m) penalised.
  transformWeights: {
    L_M:            10,   // C → Em — Coldplay-style hope lift
    P:               3,
    R_M:             8,   // C → Am — bittersweet but still warm
    CM_upM3_same:    9,   // magical rise
    CM_upm3_same:    7,
    L_m:             6,
    R_m:             5,
  },

  seeds: [
    { next: 'I',    weight: 10, label: 'Open Sky',         extensions: ['maj7','add9'], preferredBars: 2 },
    { next: 'IV',   weight: 8,  label: 'Soft Beginning',   extensions: ['maj7'],        preferredBars: 2 },
    { next: 'vi',   weight: 7,  label: 'Bittersweet Open', extensions: ['m9'],          preferredBars: 4 },
    { next: 'I',    weight: 6,  label: 'Lydian Magic',     extensions: ['maj7','#11'],  preferredBars: 4 },
    { next: 'ii',   weight: 5,  label: 'Quiet Start',      extensions: ['m9'] },
  ],

  fromFunction: {
    I: [
      { next: 'IV',  weight: 10, label: 'Plagal Hope',         extensions: ['maj7'],        preferredBars: 2 },
      { next: 'V',   weight: 9,  label: 'Open Sky',            extensions: ['sus4'],        preferredBars: 1 },
      { next: 'vi',  weight: 8,  label: 'Bittersweet Lift',    extensions: ['m9'],          preferredBars: 2 },
      { next: 'iii', weight: 6,  label: 'Tender Step',         extensions: ['m7'] },
      { next: 'V/vi',weight: 5,  label: 'Sudden Twist',        extensions: ['7'] },
      { next: 'ii',  weight: 7,  label: 'Soft Question',       extensions: ['m9'] },
      { next: 'I',   weight: 5,  label: 'Lydian Hold',         extensions: ['maj7','#11'] },
      { next: 'II',  weight: 5,  label: 'Magical Float',       extensions: ['maj7'] },
      { next: '♭VII',weight: 6,  label: 'Mixo Lift' },
      { next: 'V/IV',weight: 4,  label: 'Distant Bell',        extensions: ['7'] },
      { next: '♭III',weight: 4,  label: 'Modal Surprise',      extensions: ['maj7'] },
    ],
    IV: [
      { next: 'I',   weight: 10, label: 'Plagal Cadence',      extensions: ['maj7'],        preferredBars: 4 },
      { next: 'V',   weight: 9,  label: 'Rising Hope',         extensions: ['sus4'],        preferredBars: 1 },
      { next: 'vi',  weight: 7,  label: 'Gentle Lean',         extensions: ['m9'] },
      { next: 'iii', weight: 5,  label: 'Soft Reflection',     extensions: ['m7'] },
      { next: 'ii',  weight: 6,  label: 'Subdominant Walk',    extensions: ['m9'] },
      { next: 'IV',  weight: 4,  label: 'Lydian Hold',         extensions: ['maj7','#11'] },
      { next: '♭VII',weight: 5,  label: 'Modal Lift' },
    ],
    V: [
      { next: 'I',   weight: 10, label: 'Authentic Joy',       extensions: ['maj7'],        preferredBars: 4 },
      { next: 'vi',  weight: 8,  label: 'Deceptive Lift',      extensions: ['m9'] },
      { next: 'IV',  weight: 5,  label: 'Plagal Return',       extensions: ['maj7'] },
      { next: 'ii',  weight: 4,  label: 'Backward Step',       extensions: ['m7'] },
      { next: 'iii', weight: 5,  label: 'Soft Sway',           extensions: ['m9'] },
    ],
    vi: [
      { next: 'IV',  weight: 10, label: 'Pop Hope',            extensions: ['maj7'],        preferredBars: 2 },
      { next: 'V',   weight: 8,  label: 'Yearning Lift',       extensions: ['sus4'] },
      { next: 'I',   weight: 7,  label: 'Sunlight',            extensions: ['add9'] },
      { next: 'ii',  weight: 6,  label: 'Soft Step',           extensions: ['m7'] },
      { next: 'iii', weight: 5,  label: 'Inner Reflection',    extensions: ['m9'] },
      { next: 'V/V', weight: 5,  label: 'Sudden Hope',         extensions: ['7'] },
    ],
    ii: [
      { next: 'V',   weight: 10, label: 'Classic Cadence',     extensions: ['7','sus4'],   preferredBars: 1 },
      { next: 'I',   weight: 6,  label: 'Soft Resolution',     extensions: ['maj7'] },
      { next: 'IV',  weight: 5,  label: 'Lateral Hope',        extensions: ['maj7'] },
      { next: 'vi',  weight: 5,  label: 'Reflective Step',     extensions: ['m9'] },
      { next: 'iii', weight: 4,  label: 'Inner Lift',          extensions: ['m7'] },
    ],
    iii: [
      { next: 'IV',  weight: 9,  label: 'Tender Ascent',       extensions: ['maj7'] },
      { next: 'vi',  weight: 7,  label: 'Reflective Sway',     extensions: ['m9'] },
      { next: 'ii',  weight: 5,  label: 'Soft Anchor',         extensions: ['m7'] },
      { next: 'IV',  weight: 5,  label: 'Lydian Climb',        extensions: ['maj7','#11'] },
      { next: 'V/vi',weight: 4,  label: 'Sudden Twist',        extensions: ['7'] },
    ],
    '♭VII': [
      { next: 'IV',  weight: 10, label: 'Hopeful Anthem',      extensions: ['maj7'] },
      { next: 'I',   weight: 8,  label: 'Mixo Cadence',        extensions: ['add9'] },
      { next: 'vi',  weight: 6,  label: 'Modal Sway',          extensions: ['m9'] },
      { next: 'V',   weight: 5,  label: 'Modal Build',         extensions: ['sus4'] },
    ],
    II: [
      { next: 'I',   weight: 9,  label: 'Lydian Cadence',      extensions: ['maj7','#11'] },
      { next: 'IV',  weight: 7,  label: 'Subdominant Lift',    extensions: ['maj7'] },
      { next: 'V',   weight: 6,  label: 'Magical Build',       extensions: ['sus4'] },
    ],
    '♭III': [
      { next: 'IV',  weight: 8,  label: 'Modal Rise',          extensions: ['maj7'] },
      { next: 'I',   weight: 6,  label: 'Sudden Light',        extensions: ['add9'] },
      { next: 'vi',  weight: 5,  label: 'Modal Sway',          extensions: ['m9'] },
    ],
    '♭VI': [
      { next: 'I',   weight: 8,  label: 'Chromatic Return',    extensions: ['add9'] },
      { next: 'IV',  weight: 7,  label: 'Modal Step',          extensions: ['maj7'] },
      { next: '♭VII',weight: 6,  label: 'Modal Climb' },
    ],
    'V/vi': [
      { next: 'vi',  weight: 10, label: 'Yearning Resolution', extensions: ['m9'] },
      { next: 'IV',  weight: 5,  label: 'Modal Escape',        extensions: ['maj7'] },
    ],
    'V/IV': [
      { next: 'IV',  weight: 10, label: 'Subdom Resolution',   extensions: ['maj7'] },
      { next: 'I',   weight: 5,  label: 'Deceptive Light' },
    ],
    'V/V': [
      { next: 'V',   weight: 10, label: 'Double-Dom Lift',     extensions: ['sus4'] },
      { next: 'vi',  weight: 5,  label: 'Deceptive Twist',     extensions: ['m9'] },
    ],
  },

  fromBigram: {
    'I→V':   [
      { next: 'vi', weight: 10, label: '4-Chord Hit',         extensions: ['m9'] },
      { next: 'IV', weight: 8,  label: 'Driving Forward',     extensions: ['maj7'] },
      { next: 'I',  weight: 6,  label: 'Authentic Loop',      extensions: ['maj7'] },
      { next: 'iii',weight: 5,  label: 'Soft Step',           extensions: ['m9'] },
    ],
    'vi→IV': [
      { next: 'I',  weight: 10, label: 'Pop Classic',         extensions: ['add9'],preferredBars: 2 },
      { next: 'V',  weight: 9,  label: 'Rising Build',        extensions: ['sus4'] },
      { next: 'ii', weight: 6,  label: 'Inner Path',          extensions: ['m7'] },
    ],
    'I→vi':  [
      { next: 'IV', weight: 10, label: 'Standard Pop',        extensions: ['maj7'] },
      { next: 'iii',weight: 7,  label: 'Yearning Sway',       extensions: ['m9'] },
      { next: 'ii', weight: 6,  label: 'Soft Step',           extensions: ['m7'] },
      { next: 'V',  weight: 5,  label: 'Cadential Push',      extensions: ['sus4'] },
    ],
    'IV→I':  [
      { next: 'vi', weight: 9,  label: 'Plagal Vamp',         extensions: ['m9'] },
      { next: 'V',  weight: 8,  label: 'Triumph',             extensions: ['sus4'] },
      { next: 'IV', weight: 6,  label: 'Plagal Hold' },
      { next: 'ii', weight: 5,  label: 'Soft Step',           extensions: ['m7'] },
    ],
    'V→vi':  [
      { next: 'IV', weight: 10, label: 'Pop Cycle',           extensions: ['maj7'] },
      { next: 'ii', weight: 7,  label: 'Yearning Step',       extensions: ['m9'] },
      { next: 'iii',weight: 6,  label: 'Reflective Step',     extensions: ['m9'] },
    ],
    'I→IV':  [
      { next: 'V',  weight: 9,  label: 'Rising Anthem',       extensions: ['sus4'] },
      { next: 'I',  weight: 8,  label: 'Plagal Vamp',         extensions: ['maj7'] },
      { next: 'vi', weight: 7,  label: 'Bittersweet Sway',    extensions: ['m9'] },
      { next: 'ii', weight: 5,  label: 'Subdom Walk',         extensions: ['m7'] },
    ],
    'ii→V':  [
      { next: 'I',  weight: 10, label: 'Jazz Cadence',        extensions: ['maj7'] },
      { next: 'vi', weight: 7,  label: 'Deceptive',           extensions: ['m9'] },
      { next: 'iii',weight: 5,  label: 'Soft Path',           extensions: ['m9'] },
    ],
    'vi→V':  [
      { next: 'I',  weight: 9,  label: 'Pop Cadence',         extensions: ['add9'] },
      { next: 'IV', weight: 8,  label: 'Modal Sway',          extensions: ['maj7'] },
      { next: 'vi', weight: 6,  label: 'Yearning Loop',       extensions: ['m9'] },
    ],
    'IV→V':  [
      { next: 'I',  weight: 10, label: 'Authentic Cadence',   extensions: ['maj7'],preferredBars: 4 },
      { next: 'vi', weight: 8,  label: 'Deceptive Lift',      extensions: ['m9'] },
      { next: 'IV', weight: 5,  label: 'Plagal Loop',         extensions: ['maj7'] },
    ],
    'I→ii':  [
      { next: 'V',  weight: 10, label: 'Classic Build',       extensions: ['sus4'] },
      { next: 'IV', weight: 6,  label: 'Lateral Step',        extensions: ['maj7'] },
    ],
    'I→iii': [
      { next: 'IV', weight: 9,  label: 'Tender Ascent',       extensions: ['maj7'] },
      { next: 'vi', weight: 7,  label: 'Reflective Sway',     extensions: ['m9'] },
    ],
    'I→♭VII':[
      { next: 'IV', weight: 10, label: 'Mixo Hope',           extensions: ['maj7'] },
      { next: 'I',  weight: 7,  label: 'Mixo Vamp' },
    ],
  },
}
