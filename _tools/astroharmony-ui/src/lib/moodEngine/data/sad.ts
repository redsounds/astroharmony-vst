import type { MoodDefinition } from '../types'

/**
 * SAD — Aeolian / Dorian / Phrygian.
 * Inspirations: Adele, Bon Iver, Max Richter, Joni Mitchell.
 * Falling motion, suspended decay, modal mixture for melancholic ambiguity.
 */
export const SAD: MoodDefinition = {
  id: 'sad',
  label: 'Sad',
  description: 'Melancholic, emotional',
  preferredModes: ['aeolian', 'dorian', 'phrygian'],
  preferredRoot: 'A',
  defaultVoicing: 'pianoSpread',
  defaultBars: 4,
  avoidsResolution: false,

  // P (M→m) and R (M→vi) are the sad classics; descending mediants add depth.
  transformWeights: {
    P:              10,   // instant darken
    R_M:             8,   // C → Am
    CM_dnm3_same:    7,
    R_m:             7,   // Cm → E♭ — bittersweet major glimpse
    CM_dnM3_same:    6,
    L_m:             5,
    L_M:             4,
  },

  seeds: [
    { next: 'i',    weight: 10, label: 'Lone Tonic',     extensions: ['m9'],   preferredBars: 4 },
    { next: 'vi',   weight: 8,  label: 'Reflective',     extensions: ['m9'],   preferredBars: 4 },
    { next: 'iv',   weight: 7,  label: 'Falling Heart',  extensions: ['m11'],  preferredBars: 4 },
    { next: '♭VI',  weight: 6,  label: 'Distant Memory', extensions: ['maj7'], preferredBars: 4 },
    { next: 'I',    weight: 5,  label: 'Bittersweet',    extensions: ['maj7'], preferredBars: 4 },
  ],

  fromFunction: {
    i: [
      { next: 'iv',   weight: 10, label: 'Falling Tear',     extensions: ['m9'],   preferredBars: 4 },
      { next: '♭VI',  weight: 9,  label: 'Melancholic Drift',extensions: ['maj7'], preferredBars: 4 },
      { next: 'v',    weight: 8,  label: 'Aeolian Sigh',     extensions: ['m7'] },
      { next: '♭III', weight: 7,  label: 'Modal Light',      extensions: ['maj7'] },
      { next: '♭VII', weight: 7,  label: 'Walking Sadness' },
      { next: 'III',  weight: 6,  label: 'Sudden Hope',      extensions: ['maj7'] },
      { next: 'I',    weight: 5,  label: 'Bittersweet Twist',extensions: ['maj7'] },
      { next: 'IV',   weight: 6,  label: 'Dorian Lift',      extensions: ['maj7'] },
      { next: 'ii°',  weight: 5,  label: 'Locrian Cloud',    extensions: ['m7'] },
      { next: '♭II',  weight: 4,  label: 'Phrygian Tear',    extensions: ['maj7'] },
      { next: 'V/V',  weight: 3,  label: 'Distant Yearning', extensions: ['7'] },
    ],
    iv: [
      { next: 'i',    weight: 10, label: 'Returning Sorrow', extensions: ['m9'],   preferredBars: 4 },
      { next: '♭VI',  weight: 8,  label: 'Deeper Sadness',   extensions: ['maj7'] },
      { next: 'v',    weight: 7,  label: 'Stepwise Tears' },
      { next: '♭VII', weight: 6,  label: 'Modal Walk' },
      { next: 'V',    weight: 5,  label: 'Yearning Build',   extensions: ['sus4'] },
      { next: 'IV',   weight: 5,  label: 'Dorian Lift',      extensions: ['maj7'] },
      { next: '♭III', weight: 6,  label: 'Modal Step',       extensions: ['maj7'] },
    ],
    '♭VI': [
      { next: 'iv',   weight: 9,  label: 'Drifting Sadness', extensions: ['m9'] },
      { next: '♭VII', weight: 8,  label: 'Modal Walk' },
      { next: 'i',    weight: 7,  label: 'Resigned Return',  extensions: ['m9'],   preferredBars: 4 },
      { next: '♭III', weight: 6,  label: 'Modal Pivot',      extensions: ['maj7'] },
      { next: 'V',    weight: 5,  label: 'Climactic Sorrow', extensions: ['7'] },
      { next: '♭II',  weight: 4,  label: 'Phrygian Sigh',    extensions: ['maj7'] },
    ],
    III: [
      { next: 'iv',   weight: 8,  label: 'Bittersweet Drop' },
      { next: '♭VI',  weight: 7,  label: 'Major→Minor',      extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Modal Return',     extensions: ['m9'] },
      { next: 'V',    weight: 4,  label: 'Sudden Tension',   extensions: ['7'] },
    ],
    v: [
      { next: 'i',    weight: 9,  label: 'Modal Cadence',    extensions: ['m9'],   preferredBars: 4 },
      { next: 'iv',   weight: 7,  label: 'Backwards Step' },
      { next: '♭VI',  weight: 6,  label: 'Slow Plunge',      extensions: ['maj7'] },
      { next: '♭VII', weight: 5,  label: 'Modal Drift' },
    ],
    V: [
      { next: 'i',    weight: 8,  label: 'Harmonic Cadence', extensions: ['m9'],   preferredBars: 4 },
      { next: '♭VI',  weight: 9,  label: 'Deceptive Sorrow', extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Tearful Step',     extensions: ['m11'] },
      { next: 'vi',   weight: 5,  label: 'Modal Sway',       extensions: ['m9'] },
    ],
    VII: [
      { next: 'i',    weight: 8,  label: 'Walking Home',     extensions: ['m9'] },
      { next: '♭VI',  weight: 7,  label: 'Sad Descent',      extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Modal Drop',       extensions: ['m9'] },
    ],
    '♭VII': [
      { next: '♭VI',  weight: 9,  label: 'Modal Descent',    extensions: ['maj7'] },
      { next: 'i',    weight: 6,  label: 'Modal Return',     extensions: ['m9'] },
      { next: 'iv',   weight: 7,  label: 'Sorrowful Walk',   extensions: ['m9'] },
      { next: '♭III', weight: 5,  label: 'Modal Cycle',      extensions: ['maj7'] },
    ],
    '♭III': [
      { next: 'iv',   weight: 8,  label: 'Aeolian Step',     extensions: ['m9'] },
      { next: '♭VI',  weight: 9,  label: 'Modal Descent',    extensions: ['maj7'] },
      { next: 'i',    weight: 6,  label: 'Inward Return',    extensions: ['m9'] },
      { next: '♭VII', weight: 7,  label: 'Modal Walk' },
    ],
    I: [
      { next: 'vi',   weight: 10, label: 'Bittersweet Step', extensions: ['m9'] },
      { next: 'iii',  weight: 7,  label: 'Tender Reflection',extensions: ['m7'] },
      { next: 'IV',   weight: 6,  label: 'Soft Lift',        extensions: ['maj7'] },
      { next: '♭VI',  weight: 6,  label: 'Sudden Sorrow',    extensions: ['maj7'] },
      { next: 'V/vi', weight: 5,  label: 'Confession',       extensions: ['7'] },
    ],
    vi: [
      { next: 'IV',   weight: 9,  label: 'Yearning Step',    extensions: ['maj7'] },
      { next: 'ii',   weight: 7,  label: 'Inner Question',   extensions: ['m9'] },
      { next: 'iii',  weight: 6,  label: 'Soft Pivot',       extensions: ['m9'] },
      { next: 'V',    weight: 5,  label: 'Yearning Build',   extensions: ['sus4'] },
      { next: 'I',    weight: 5,  label: 'Brief Light',      extensions: ['maj7'] },
    ],
    ii: [
      { next: 'V',    weight: 9,  label: 'Soft Build',       extensions: ['7'] },
      { next: 'I',    weight: 5,  label: 'Tender Rest',      extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Yearning Step',    extensions: ['m9'] },
    ],
    IV: [
      { next: 'I',    weight: 8,  label: 'Soft Resolution',  extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Bittersweet Sway', extensions: ['m9'] },
      { next: 'V',    weight: 5,  label: 'Yearning Lift',    extensions: ['sus4'] },
      { next: 'iv',   weight: 6,  label: 'Minor Pivot',      extensions: ['m9'] },
    ],
  },

  fromBigram: {
    'i→iv':    [
      { next: 'i',    weight: 10, label: 'Cyclic Sorrow',    extensions: ['m9'],   preferredBars: 4 },
      { next: 'v',    weight: 7,  label: 'Aeolian Build' },
      { next: '♭VI',  weight: 8,  label: 'Sinking Pivot',    extensions: ['maj7'] },
      { next: '♭VII', weight: 6,  label: 'Modal Walk' },
    ],
    'i→♭VI':   [
      { next: 'iv',   weight: 9,  label: 'Triple Sadness',   extensions: ['m9'] },
      { next: '♭VII', weight: 8,  label: 'Modal Sway' },
      { next: 'i',    weight: 6,  label: 'Loop Return',      extensions: ['m9'] },
    ],
    'iv→i':    [
      { next: 'v',    weight: 7,  label: 'Long Cycle' },
      { next: '♭VI',  weight: 8,  label: 'Renewed Sorrow',   extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Sorrow Vamp',      extensions: ['m9'] },
    ],
    'I→vi':    [
      { next: 'IV',   weight: 9,  label: 'Bittersweet Cycle',extensions: ['maj7'] },
      { next: 'iii',  weight: 7,  label: 'Yearning Step',    extensions: ['m9'] },
      { next: 'ii',   weight: 6,  label: 'Soft Question',    extensions: ['m9'] },
    ],
    'vi→IV':   [
      { next: 'I',    weight: 9,  label: 'Pop Sadness',      extensions: ['maj7'] },
      { next: 'V',    weight: 7,  label: 'Yearning Build',   extensions: ['sus4'] },
      { next: 'ii',   weight: 6,  label: 'Inner Path',       extensions: ['m9'] },
    ],
    'i→v':     [
      { next: 'iv',   weight: 8,  label: 'Aeolian Cycle' },
      { next: '♭VI',  weight: 7,  label: 'Sad Descent',      extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Sigh Return',      extensions: ['m9'] },
    ],
    'i→III':   [
      { next: 'iv',   weight: 8,  label: 'Bittersweet Step' },
      { next: '♭VI',  weight: 7,  label: 'Major→Minor',      extensions: ['maj7'] },
    ],
    '♭VI→iv':  [
      { next: '♭VII', weight: 8,  label: 'Modal Walk' },
      { next: 'i',    weight: 7,  label: 'Resigned Return',  extensions: ['m9'] },
    ],
    'IV→I':    [
      { next: 'vi',   weight: 8,  label: 'Plagal Sway',      extensions: ['m9'] },
      { next: 'ii',   weight: 6,  label: 'Inner Step',       extensions: ['m9'] },
    ],
  },
}
