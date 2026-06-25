import type { MoodDefinition } from '../types'

/**
 * TENSION — Harmonic Minor / Phrygian Dominant / Diminished.
 * Inspirations: Hitchcock, Bernard Herrmann, modern thriller scores.
 * Half-diminished, dim7 chains, deceptive resolutions, never quite closing.
 */
export const TENSION: MoodDefinition = {
  id: 'tension',
  label: 'Tension',
  description: 'Suspenseful, intense',
  preferredModes: ['aeolian', 'phrygianDom', 'harmonicMinor', 'locrian'],
  preferredRoot: 'F#',
  defaultVoicing: 'cinematic',
  defaultBars: 1,
  avoidsResolution: true,

  // Tension thrives on un-grounded moves. Tritone, slide, and parallel
  // flips create that "something's about to happen" feeling.
  transformWeights: {
    TRI_M:           10,
    TRI_m:           10,
    SLIDE_up:         9,
    SLIDE_dn:         9,
    P:                8,
    CM_dnm3_same:     7,
    L_M:              5,
    CM_upM3_same:     6,
  },
  embracesJarringMoves: true,

  seeds: [
    { next: 'i',    weight: 10, label: 'Suspense Tonic',  extensions: ['m9'],   preferredBars: 2 },
    { next: 'vii°', weight: 8,  label: 'Pressure Start',  extensions: ['dim7'], preferredBars: 1 },
    { next: 'iv',   weight: 7,  label: 'Threat Drone',    extensions: ['m11'],  preferredBars: 4 },
    { next: 'ii°',  weight: 6,  label: 'Half-Dim Open',   extensions: ['m7'] },
    { next: '♭II',  weight: 5,  label: 'Phrygian Stalk',  extensions: ['maj7'] },
  ],

  fromFunction: {
    i: [
      { next: 'V',    weight: 10, label: 'Building Up',      extensions: ['7','sus4'], preferredBars: 1 },
      { next: '♭II',  weight: 9,  label: 'Imminent Threat',  extensions: ['maj7'],     preferredBars: 1 },
      { next: 'vii°', weight: 9,  label: 'Edge of Danger',   extensions: ['dim7'],     preferredBars: 1 },
      { next: 'iv',   weight: 7,  label: 'Inner Pressure',   extensions: ['m11'] },
      { next: 'VII',  weight: 6,  label: 'Trembling Loop' },
      { next: 'V/V',  weight: 6,  label: 'Distant Storm',    extensions: ['7'] },
      { next: 'ii°',  weight: 7,  label: 'Half-Dim Walk',    extensions: ['m7'] },
      { next: '♭V',   weight: 6,  label: 'Tritone Lurking',  extensions: ['maj7'] },
      { next: 'V/vi', weight: 5,  label: 'Sidestep Threat',  extensions: ['7'] },
      { next: 'Vsus4',weight: 7,  label: 'Held Breath',                                preferredBars: 2 },
      { next: 'i°',   weight: 5,  label: 'Pure Dread',       extensions: ['dim7'] },
    ],
    V: [
      { next: '♭VI',  weight: 10, label: 'Deceptive Stall',  extensions: ['maj7'] },
      { next: 'i',    weight: 4,  label: 'Forced Release',   extensions: ['m9'] },
      { next: 'vii°', weight: 8,  label: 'Chromatic Climb',  extensions: ['dim7'] },
      { next: '♭II',  weight: 7,  label: 'False Resolution', extensions: ['maj7'] },
      { next: 'V',    weight: 6,  label: 'Holding Dominance',extensions: ['7','sus4'] },
      { next: '♭V',   weight: 5,  label: 'Tritone Step',     extensions: ['maj7'] },
      { next: 'vi',   weight: 6,  label: 'Deceptive Twist',  extensions: ['m9'] },
    ],
    '♭II': [
      { next: 'V',    weight: 10, label: 'Italian Climb',    extensions: ['7'] },
      { next: 'i',    weight: 6,  label: 'Phrygian Crash',   extensions: ['m9'] },
      { next: 'vii°', weight: 8,  label: 'Tightening Spiral',extensions: ['dim7'] },
      { next: '♭V',   weight: 7,  label: 'Tritone Trap',     extensions: ['maj7'] },
      { next: '♭II',  weight: 5,  label: 'Phrygian Vamp',    preferredBars: 1 },
    ],
    'vii°': [
      { next: 'i',    weight: 5,  label: 'Tense Release' },
      { next: 'V',    weight: 8,  label: 'Building Pressure',extensions: ['7'] },
      { next: '♭II',  weight: 9,  label: 'Spiraling',        extensions: ['maj7'] },
      { next: '♭V',   weight: 7,  label: 'Tritone Drop',     extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Half-Dim Sink',    extensions: ['m11'] },
    ],
    iv: [
      { next: 'V',    weight: 10, label: 'Cinematic Build',  extensions: ['7','sus4'], preferredBars: 1 },
      { next: 'vii°', weight: 7,  label: 'Step to Edge',     extensions: ['dim7'] },
      { next: '♭II',  weight: 6,  label: 'Sudden Lurch',     extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Reluctant Return', extensions: ['m9'] },
      { next: 'ii°',  weight: 7,  label: 'Half-Dim Pivot',   extensions: ['m7'] },
      { next: 'Vsus4',weight: 6,  label: 'Pull-Back' },
    ],
    VII: [
      { next: 'i',    weight: 7,  label: 'Looping Trouble' },
      { next: 'V',    weight: 8,  label: 'Rising Pressure',  extensions: ['7'] },
      { next: '♭VI',  weight: 6,  label: 'Modal Stalk',      extensions: ['maj7'] },
    ],
    'V/V': [
      { next: 'V',    weight: 10, label: 'Triple Dominant',  extensions: ['7'] },
      { next: 'i',    weight: 4,  label: 'Avoided Path' },
      { next: 'vii°', weight: 7,  label: 'Chained Pressure', extensions: ['dim7'] },
    ],
    'ii°': [
      { next: 'V',    weight: 9,  label: 'Half-Dim Build',   extensions: ['7','b9'] },
      { next: 'i',    weight: 5,  label: 'Locrian Sigh' },
      { next: '♭II',  weight: 6,  label: 'Modal Slide',      extensions: ['maj7'] },
      { next: 'vii°', weight: 7,  label: 'Diminished Loop',  extensions: ['dim7'] },
    ],
    '♭V': [
      { next: '♭II',  weight: 9,  label: 'Tritone Stalk',    extensions: ['maj7'] },
      { next: 'vii°', weight: 8,  label: 'Diminished Trap',  extensions: ['dim7'] },
      { next: 'i',    weight: 6,  label: 'Tritone Snap',     extensions: ['m9'] },
      { next: 'V',    weight: 7,  label: 'Sudden Dominance', extensions: ['7'] },
    ],
    '♭VI': [
      { next: 'V',    weight: 9,  label: 'Climactic Build',  extensions: ['7','sus4'] },
      { next: '♭VII', weight: 7,  label: 'Modal Stalk' },
      { next: 'vii°', weight: 6,  label: 'Tightening Slide', extensions: ['dim7'] },
      { next: 'iv',   weight: 6,  label: 'Inward Pivot',     extensions: ['m9'] },
    ],
    Vsus4: [
      { next: 'V',    weight: 9,  label: 'Released Pressure',extensions: ['7'] },
      { next: '♭VI',  weight: 7,  label: 'Deceptive Hang',   extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Tightening',       extensions: ['dim7'] },
    ],
    III: [
      { next: 'iv',   weight: 7,  label: 'Sudden Doubt',     extensions: ['m9'] },
      { next: '♭VI',  weight: 8,  label: 'Modal Slide',      extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Sudden Edge',      extensions: ['dim7'] },
    ],
    '♭III': [
      { next: 'V',    weight: 7,  label: 'Climbing Tension', extensions: ['7'] },
      { next: '♭VI',  weight: 8,  label: 'Modal Slide',      extensions: ['maj7'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Drop',    extensions: ['maj7'] },
    ],
  },

  fromBigram: {
    'iv→V':    [
      { next: 'i',    weight: 5,  label: 'Reluctant Close',  extensions: ['m9'] },
      { next: '♭VI',  weight: 10, label: 'Cliff Hanger',     extensions: ['maj7'] },
      { next: 'vii°', weight: 8,  label: 'Holding Breath',   extensions: ['dim7'] },
      { next: 'Vsus4',weight: 6,  label: 'Pulled Back' },
    ],
    'V→♭II':   [
      { next: 'V',    weight: 10, label: 'Caught Loop',      extensions: ['7'] },
      { next: 'i',    weight: 5,  label: 'Forced End',       extensions: ['m9'] },
      { next: 'vii°', weight: 7,  label: 'Tightening Trap',  extensions: ['dim7'] },
    ],
    'i→V':     [
      { next: '♭VI',  weight: 10, label: 'Deceptive Twist',  extensions: ['maj7'] },
      { next: 'vii°', weight: 8,  label: 'Tightening',       extensions: ['dim7'] },
      { next: 'V',    weight: 6,  label: 'Holding Pressure', extensions: ['7'] },
      { next: '♭II',  weight: 7,  label: 'False Resolution', extensions: ['maj7'] },
    ],
    'i→vii°':  [
      { next: '♭II',  weight: 9,  label: 'Spiraling Trap',   extensions: ['maj7'] },
      { next: 'V',    weight: 8,  label: 'Building Storm',   extensions: ['7'] },
      { next: '♭V',   weight: 7,  label: 'Tritone Slide',    extensions: ['maj7'] },
    ],
    'i→♭II':   [
      { next: 'i',    weight: 10, label: 'Phrygian Pulse',   preferredBars: 1 },
      { next: '♭V',   weight: 8,  label: 'Tritone Trap',     extensions: ['maj7'] },
      { next: 'V',    weight: 7,  label: 'Climbing Threat',  extensions: ['7'] },
    ],
    'V→♭VI':   [
      { next: '♭VII', weight: 9,  label: 'Modal Stalk' },
      { next: 'V',    weight: 7,  label: 'Caught Loop',      extensions: ['7'] },
      { next: 'iv',   weight: 5,  label: 'Sad Pivot',        extensions: ['m9'] },
    ],
    'i→iv':    [
      { next: 'V',    weight: 9,  label: 'Heroic Build',     extensions: ['sus4'] },
      { next: 'vii°', weight: 7,  label: 'Tightening',       extensions: ['dim7'] },
      { next: '♭VI',  weight: 6,  label: 'Sad Pivot',        extensions: ['maj7'] },
    ],
    'iv→vii°': [
      { next: '♭II',  weight: 9,  label: 'Spiraling Trap',   extensions: ['maj7'] },
      { next: 'i',    weight: 5,  label: 'Forced Release' },
      { next: 'V',    weight: 7,  label: 'Climbing Storm',   extensions: ['7'] },
    ],
    'V/V→V':   [
      { next: '♭VI',  weight: 9,  label: 'Double Twist',     extensions: ['maj7'] },
      { next: 'i',    weight: 4,  label: 'Reluctant End',    extensions: ['m9'] },
    ],
  },
}
