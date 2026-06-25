import type { MoodDefinition } from '../types'

/**
 * DARK — Aeolian / Phrygian / Harmonic Minor.
 * Inspirations: Blade Runner, Game of Thrones, Stranger Things, Joy Division.
 * Modal interchange, descending lines, avoided resolution.
 */
export const DARK: MoodDefinition = {
  id: 'dark',
  label: 'Dark',
  description: 'Mysterious, ominous',
  preferredModes: ['aeolian', 'phrygian', 'locrian', 'harmonicMinor'],
  preferredRoot: 'D',
  defaultVoicing: 'cinematic',
  defaultBars: 2,
  avoidsResolution: true,

  // Descending chromatic motion + parallel darkening (M→m) own the Dark
  // identity. Tritone is too horror-genre; Slide creates dread.
  transformWeights: {
    P:              10,   // sudden light reversed: M→m
    CM_dnm3_same:    9,   // brooding descent
    SLIDE_dn:        8,
    CM_dnM3_same:    8,
    R_M:             7,
    L_m:             6,   // even Dark sometimes wants the cinematic lift
    CM_upm3_same:    5,
  },

  seeds: [
    { next: 'i',    weight: 10, label: 'Shrouded Tonic',   extensions: ['m9'],   preferredBars: 4 },
    { next: 'iv',   weight: 8,  label: 'Deep Sorrow',      extensions: ['m11'],  preferredBars: 2 },
    { next: '♭VI',  weight: 7,  label: 'Ominous Open',     extensions: ['maj7'], preferredBars: 4 },
    { next: 'vii°', weight: 6,  label: 'Dimmed Threshold', extensions: ['dim7'], preferredBars: 1 },
    { next: '♭II',  weight: 6,  label: 'Phrygian Veil',    extensions: ['maj7'], preferredBars: 2 },
    { next: '♭III', weight: 5,  label: 'Aeolian Sigh',     extensions: ['add9'], preferredBars: 4 },
  ],

  fromFunction: {
    i: [
      { next: '♭VI',  weight: 10, label: 'Andalusian Fall',  extensions: ['maj7'],     preferredBars: 2 },
      { next: '♭II',  weight: 9,  label: 'Phrygian Shock',   extensions: ['maj7'],     preferredBars: 1 },
      { next: 'iv',   weight: 9,  label: 'Inner Despair',    extensions: ['m11'],      preferredBars: 2 },
      { next: '♭VII', weight: 8,  label: 'Modal Drift',                                preferredBars: 2 },
      { next: '♭III', weight: 7,  label: 'Aeolian Step',     extensions: ['add9'] },
      { next: 'vii°', weight: 7,  label: 'Diminished Veil',  extensions: ['dim7'] },
      { next: 'v',    weight: 6,  label: 'Aeolian Sigh',     extensions: ['m7'] },
      { next: 'ii°',  weight: 6,  label: 'Locrian Pressure', extensions: ['m7'] },
      { next: '♭V',   weight: 5,  label: 'Tritone Dread',    extensions: ['maj7'] },
      { next: 'V',    weight: 4,  label: 'Harmonic Pull',    extensions: ['7','b9'] },
      { next: 'i°',   weight: 5,  label: 'Pure Dread',       extensions: ['dim7'] },
    ],
    '♭VI': [
      { next: '♭VII', weight: 10, label: 'Tightening Dread',                          preferredBars: 2 },
      { next: 'iv',   weight: 8,  label: 'Doomed Loop',      extensions: ['m9'] },
      { next: 'i',    weight: 6,  label: 'Cold Return',      extensions: ['m9'],     preferredBars: 4 },
      { next: 'V',    weight: 7,  label: 'Dramatic Climb',   extensions: ['7','sus4'] },
      { next: '♭III', weight: 6,  label: 'Modal Plunge',     extensions: ['add9'] },
      { next: '♭II',  weight: 5,  label: 'Phrygian Pivot',   extensions: ['maj7'] },
      { next: '♭VI',  weight: 4,  label: 'Drone Hold',       extensions: ['maj7'],   preferredBars: 4 },
    ],
    iv: [
      { next: 'i',    weight: 8,  label: 'Reluctant Return', extensions: ['m9'],     preferredBars: 2 },
      { next: '♭VI',  weight: 9,  label: 'Sinking Pivot',    extensions: ['maj7'] },
      { next: 'v',    weight: 7,  label: 'Modal Step Down' },
      { next: 'V',    weight: 7,  label: 'Tragic Tension',   extensions: ['7','b9'] },
      { next: '♭VII', weight: 6,  label: 'Walking Sadness' },
      { next: '♭II',  weight: 5,  label: 'Phrygian Tear',    extensions: ['maj7'] },
      { next: 'vii°', weight: 5,  label: 'Diminished Slide', extensions: ['dim7'] },
    ],
    VII: [
      { next: '♭VI',  weight: 10, label: 'Descending Doom',                          preferredBars: 2 },
      { next: 'i',    weight: 6,  label: 'Aeolian Loop' },
      { next: '♭VII', weight: 5,  label: 'Modal Slide' },
      { next: 'iv',   weight: 6,  label: 'Modal Drop',       extensions: ['m9'] },
    ],
    '♭VII': [
      { next: '♭VI',  weight: 9,  label: 'Chromatic Sinking',                        preferredBars: 2 },
      { next: 'i',    weight: 6,  label: 'Modal Return' },
      { next: 'iv',   weight: 7,  label: 'Sorrow Step',      extensions: ['m9'] },
      { next: '♭III', weight: 5,  label: 'Modal Walk',       extensions: ['add9'] },
      { next: 'v',    weight: 4,  label: 'Modal Drift' },
    ],
    '♭II': [
      { next: 'i',    weight: 8,  label: 'Phrygian Cadence', extensions: ['m9'] },
      { next: 'iv',   weight: 7,  label: 'Stepwise Doom',    extensions: ['m11'] },
      { next: '♭III', weight: 6,  label: 'Eastern Shift',    extensions: ['add9'] },
      { next: '♭VI',  weight: 5,  label: 'Slow Descent',     extensions: ['maj7'] },
      { next: 'V',    weight: 5,  label: 'Italian Climb',    extensions: ['7'] },
    ],
    '♭III': [
      { next: '♭VI',  weight: 9,  label: 'Modal Descent',    extensions: ['maj7'] },
      { next: 'iv',   weight: 7,  label: 'Inward Step',      extensions: ['m9'] },
      { next: '♭II',  weight: 6,  label: 'Sudden Shadow',    extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Resigned Return',  extensions: ['m9'] },
      { next: '♭VII', weight: 6,  label: 'Modal Cycle' },
    ],
    v: [
      { next: 'i',    weight: 8,  label: 'Modal Sigh',       extensions: ['m9'] },
      { next: 'iv',   weight: 7,  label: 'Sorrow Loop' },
      { next: '♭VI',  weight: 6,  label: 'Slow Descent',     extensions: ['maj7'] },
      { next: '♭VII', weight: 5,  label: 'Modal Walk' },
    ],
    V: [
      { next: '♭VI',  weight: 9,  label: 'Deceptive Doom',   extensions: ['maj7'] },
      { next: 'i',    weight: 4,  label: 'Forced Light',     extensions: ['m9'] },
      { next: 'iv',   weight: 7,  label: 'Tragic Plunge',    extensions: ['m11'] },
      { next: 'vii°', weight: 6,  label: 'Tightening Loop',  extensions: ['dim7'] },
    ],
    'vii°': [
      { next: 'i',    weight: 5,  label: 'Lurking Anchor',   extensions: ['m9'] },
      { next: '♭II',  weight: 8,  label: 'Sliding Shadow',   extensions: ['maj7'] },
      { next: 'V',    weight: 7,  label: 'Building Tension', extensions: ['7'] },
      { next: '♭VI',  weight: 6,  label: 'Doom Descent',     extensions: ['maj7'] },
      { next: 'iv',   weight: 5,  label: 'Diminished Drop',  extensions: ['m9'] },
    ],
    'ii°': [
      { next: 'V',    weight: 8,  label: 'Half-Dim Build',   extensions: ['7','b9'] },
      { next: 'i',    weight: 6,  label: 'Locrian Sigh' },
      { next: '♭II',  weight: 5,  label: 'Modal Slide',      extensions: ['maj7'] },
    ],
    '♭V': [
      { next: 'i',    weight: 7,  label: 'Tritone Snap',     extensions: ['m9'] },
      { next: '♭II',  weight: 8,  label: 'Tightening Stalk', extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Diminished Loop',  extensions: ['dim7'] },
    ],
    III: [
      { next: '♭VI',  weight: 9,  label: 'Modal Pivot',      extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Sudden Sorrow',    extensions: ['m9'] },
      { next: 'i',    weight: 5,  label: 'Brief Light' },
    ],
  },

  fromBigram: {
    'VII→♭VI':  [
      { next: '♭VII', weight: 10, label: 'Andalusian Loop',  preferredBars: 2 },
      { next: 'V',    weight: 6,  label: 'Tension Build',    extensions: ['7'] },
      { next: 'iv',   weight: 5,  label: 'Modal Plunge',     extensions: ['m9'] },
    ],
    '♭VI→♭VII': [
      { next: 'i',    weight: 8,  label: 'Resolution',       extensions: ['m9'],   preferredBars: 4 },
      { next: '♭VI',  weight: 7,  label: 'Cycle Continues' },
      { next: 'iv',   weight: 6,  label: 'Modal Sway' },
    ],
    'i→♭II':    [
      { next: 'i',    weight: 10, label: 'Phrygian Loop',    extensions: ['m9'],   preferredBars: 1 },
      { next: '♭III', weight: 7,  label: 'Eastern Shift' },
      { next: '♭VI',  weight: 6,  label: 'Slow Plunge',      extensions: ['maj7'] },
    ],
    'i→iv':     [
      { next: 'VII',  weight: 9,  label: 'Sorrow Descent' },
      { next: 'V',    weight: 7,  label: 'Tragic Tension',   extensions: ['7','b9'] },
      { next: '♭VI',  weight: 8,  label: 'Sinking Pivot',    extensions: ['maj7'] },
      { next: 'i',    weight: 6,  label: 'Cyclic Sorrow',    extensions: ['m9'] },
    ],
    'i→♭VI':    [
      { next: '♭VII', weight: 9,  label: 'Three-Chord Dark', preferredBars: 2 },
      { next: 'iv',   weight: 7,  label: 'Dark Spiral',      extensions: ['m9'] },
      { next: 'V',    weight: 6,  label: 'Dramatic Climb',   extensions: ['sus4'] },
    ],
    '♭VII→♭VI':[
      { next: 'V',    weight: 9,  label: 'Andalusian Cadence', extensions: ['7','b9'] },
      { next: 'i',    weight: 6,  label: 'Sorrowful Loop',   extensions: ['m9'] },
      { next: '♭VII', weight: 5,  label: 'Cycle Continues' },
    ],
    '♭III→♭VI': [
      { next: '♭VII', weight: 9,  label: 'Modal Descent' },
      { next: 'iv',   weight: 7,  label: 'Sorrow Step',      extensions: ['m9'] },
      { next: 'i',    weight: 6,  label: 'Sad Return',       extensions: ['m9'] },
    ],
    'iv→♭VI':   [
      { next: '♭VII', weight: 8,  label: 'Modal Sway' },
      { next: 'V',    weight: 7,  label: 'Tragic Build',     extensions: ['7'] },
      { next: 'i',    weight: 6,  label: 'Looping Doom' },
    ],
    'iv→V':     [
      { next: '♭VI',  weight: 9,  label: 'Doomed Cadence',   extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Reluctant Light' },
      { next: 'vii°', weight: 7,  label: 'Tightening',       extensions: ['dim7'] },
    ],
    'V→♭VI':    [
      { next: '♭VII', weight: 9,  label: 'Modal March' },
      { next: 'iv',   weight: 7,  label: 'Sorrow Pivot' },
      { next: 'i',    weight: 5,  label: 'Heavy Light' },
    ],
    '♭II→i':    [
      { next: '♭II',  weight: 9,  label: 'Phrygian Pulse',   preferredBars: 1 },
      { next: 'iv',   weight: 7,  label: 'Sorrow Spiral' },
      { next: '♭VI',  weight: 6,  label: 'Slow Plunge' },
    ],
    'i→♭III':   [
      { next: '♭VI',  weight: 9,  label: 'Modal Descent',    extensions: ['maj7'] },
      { next: 'iv',   weight: 7,  label: 'Sorrow Walk',      extensions: ['m9'] },
      { next: '♭VII', weight: 6,  label: 'Modal Build' },
    ],
    'i→♭VII':   [
      { next: '♭VI',  weight: 10, label: 'Andalusian Climb', preferredBars: 2 },
      { next: 'iv',   weight: 6,  label: 'Modal Sigh' },
      { next: 'V',    weight: 5,  label: 'Sudden Pull',      extensions: ['7'] },
    ],
  },
}
