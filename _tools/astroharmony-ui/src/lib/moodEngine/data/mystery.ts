import type { MoodDefinition } from '../types'

/**
 * MYSTERY — Phrygian / Dorian / Locrian / Phrygian Dominant.
 * Inspirations: Twin Peaks, Mr. Robot, Blade Runner ambient cues.
 * Modal ambiguity, sustained pedal tones, unresolved sus chords.
 */
export const MYSTERY: MoodDefinition = {
  id: 'mystery',
  label: 'Mystery',
  description: 'Curious, uncertain',
  preferredModes: ['phrygian', 'dorian', 'locrian', 'phrygianDom'],
  preferredRoot: 'C#',
  defaultVoicing: 'cinematic',
  defaultBars: 2,
  avoidsResolution: true,

  // Mystery loves chromatic mediants (1 common tone) and ambiguous slides.
  transformWeights: {
    CM_dnm3_same:   10,
    CM_upM3_same:    9,
    CM_dnM3_same:    8,
    CM_upm3_same:    8,
    SLIDE_dn:        7,
    SLIDE_up:        7,
    P:               5,
    L_m:             6,
  },

  seeds: [
    { next: 'i',    weight: 10, label: 'Hidden Tonic',   extensions: ['m9'],   preferredBars: 4 },
    { next: 'I',    weight: 7,  label: 'False Light',    extensions: ['maj7'], preferredBars: 4 },
    { next: 'Vsus4',weight: 7,  label: 'Sus Drone',                            preferredBars: 4 },
    { next: '♭II',  weight: 6,  label: 'Phrygian Veil',  extensions: ['maj7'] },
    { next: 'vii°', weight: 6,  label: 'Dim Question',   extensions: ['dim7'] },
  ],

  fromFunction: {
    i: [
      { next: '♭II',  weight: 9, label: 'Phrygian Question',extensions: ['maj7'], preferredBars: 2 },
      { next: '♭V',   weight: 8, label: 'Tritone Lurking',  extensions: ['maj7'] },
      { next: '♭VII', weight: 8, label: 'Modal Drift' },
      { next: 'vii°', weight: 8, label: 'Diminished Mist',  extensions: ['dim7'] },
      { next: 'III',  weight: 7, label: 'Sudden Major',     extensions: ['add9'] },
      { next: 'iv',   weight: 6, label: 'Inward Spiral',    extensions: ['m11'] },
      { next: 'I',    weight: 6, label: 'Tonic Swap',       extensions: ['maj7'] },
      { next: 'Vsus4',weight: 7, label: 'Hanging Question' },
      { next: 'ii°',  weight: 6, label: 'Half-Dim Veil',    extensions: ['m7'] },
      { next: '♭III', weight: 7, label: 'Modal Step',       extensions: ['maj7'] },
      { next: 'V',    weight: 5, label: 'Sudden Tension',   extensions: ['7','b9'] },
    ],
    '♭II': [
      { next: 'i',    weight: 8, label: 'Whispered Cadence',extensions: ['m9'] },
      { next: '♭III', weight: 7, label: 'Eastern Step',     extensions: ['maj7'] },
      { next: 'vii°', weight: 7, label: 'Shifting Floor',   extensions: ['dim7'] },
      { next: '♭II',  weight: 6, label: 'Phrygian Vamp',    preferredBars: 1 },
      { next: '♭V',   weight: 6, label: 'Tritone Slide',    extensions: ['maj7'] },
    ],
    '♭VII': [
      { next: '♭VI',  weight: 9, label: 'Descending Veil' },
      { next: 'i',    weight: 6, label: 'Modal Tear' },
      { next: 'III',  weight: 6, label: 'Sudden Light',     extensions: ['maj7'] },
      { next: '♭III', weight: 7, label: 'Modal Walk',       extensions: ['maj7'] },
      { next: 'iv',   weight: 5, label: 'Sad Step',         extensions: ['m9'] },
    ],
    'vii°': [
      { next: 'i',    weight: 5, label: 'Reluctant Anchor' },
      { next: '♭II',  weight: 8, label: 'Sliding Shadow',   extensions: ['maj7'] },
      { next: 'V',    weight: 7, label: 'Hidden Tension',   extensions: ['7','b9'] },
      { next: '♭VI',  weight: 6, label: 'Doom Pivot',       extensions: ['maj7'] },
      { next: '♭V',   weight: 6, label: 'Tritone Trap',     extensions: ['maj7'] },
    ],
    III: [
      { next: '♭VI',  weight: 8, label: 'Modal Pivot',      extensions: ['maj7'] },
      { next: '♭II',  weight: 7, label: 'Sudden Shadow',    extensions: ['maj7'] },
      { next: 'i',    weight: 5, label: 'Returning Doubt',  extensions: ['m9'] },
      { next: 'iv',   weight: 6, label: 'Inner Step',       extensions: ['m9'] },
    ],
    '♭III': [
      { next: '♭VI',  weight: 8, label: 'Modal Walk',       extensions: ['maj7'] },
      { next: 'iv',   weight: 7, label: 'Inward Pivot',     extensions: ['m9'] },
      { next: 'i',    weight: 5, label: 'Resigned Return',  extensions: ['m9'] },
      { next: '♭VII', weight: 7, label: 'Modal Drift' },
    ],
    '♭VI': [
      { next: '♭VII', weight: 8, label: 'Modal Climb' },
      { next: '♭II',  weight: 7, label: 'Tritone Step',     extensions: ['maj7'] },
      { next: 'i',    weight: 5, label: 'Sorrow Return',    extensions: ['m9'] },
      { next: 'iv',   weight: 6, label: 'Doomed Loop',      extensions: ['m9'] },
    ],
    iv: [
      { next: '♭II',  weight: 7, label: 'Phrygian Slide',   extensions: ['maj7'] },
      { next: 'vii°', weight: 6, label: 'Dim Trap',         extensions: ['dim7'] },
      { next: 'V',    weight: 5, label: 'Sudden Build',     extensions: ['7'] },
      { next: 'i',    weight: 4, label: 'Reluctant Return', extensions: ['m9'] },
    ],
    Vsus4: [
      { next: 'i',    weight: 7, label: 'Modal Release',    extensions: ['m9'] },
      { next: '♭VI',  weight: 7, label: 'Held Stretch',     extensions: ['maj7'] },
      { next: 'V',    weight: 5, label: 'Released',         extensions: ['7'] },
    ],
    I: [
      { next: '♭VII', weight: 7, label: 'Mixo Drift' },
      { next: 'iii',  weight: 6, label: 'Reflective',       extensions: ['m9'] },
      { next: '♭VI',  weight: 5, label: 'Sudden Shadow',    extensions: ['maj7'] },
      { next: 'i',    weight: 6, label: 'Modal Swap',       extensions: ['m9'] },
    ],
    '♭V': [
      { next: 'i',    weight: 6, label: 'Tritone Land',     extensions: ['m9'] },
      { next: '♭II',  weight: 8, label: 'Slipping Stalk',   extensions: ['maj7'] },
      { next: 'vii°', weight: 7, label: 'Diminished Trap',  extensions: ['dim7'] },
    ],
    V: [
      { next: '♭VI',  weight: 8, label: 'Modal Twist',      extensions: ['maj7'] },
      { next: 'vii°', weight: 7, label: 'Climbing Mist',    extensions: ['dim7'] },
      { next: 'i',    weight: 4, label: 'Half-Heard Land',  extensions: ['m9'] },
    ],
  },

  fromBigram: {
    'i→♭II':   [
      { next: 'i',    weight: 9,  label: 'Whispering Loop',  preferredBars: 2 },
      { next: '♭III', weight: 7,  label: 'Eastern Twist',    extensions: ['maj7'] },
      { next: '♭V',   weight: 6,  label: 'Tritone Slide',    extensions: ['maj7'] },
    ],
    'i→vii°':  [
      { next: '♭II',  weight: 8,  label: 'Spiraling Shadow', extensions: ['maj7'] },
      { next: 'V',    weight: 6,  label: 'Hidden Storm',     extensions: ['7'] },
      { next: '♭V',   weight: 7,  label: 'Tritone Trap',     extensions: ['maj7'] },
    ],
    'i→♭VII':  [
      { next: '♭VI',  weight: 8,  label: 'Modal Descent' },
      { next: 'III',  weight: 6,  label: 'Sudden Light',     extensions: ['maj7'] },
      { next: '♭III', weight: 7,  label: 'Modal Cycle',      extensions: ['maj7'] },
    ],
    'I→i':     [
      { next: '♭VI',  weight: 9,  label: 'Modal Swap',       extensions: ['maj7'] },
      { next: 'iv',   weight: 7,  label: 'Inward Pivot',     extensions: ['m9'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Stalk',   extensions: ['maj7'] },
    ],
    'i→III':   [
      { next: '♭VI',  weight: 8,  label: 'Modal Pivot',      extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Inner Step',       extensions: ['m9'] },
    ],
    '♭II→i':   [
      { next: '♭II',  weight: 8,  label: 'Phrygian Pulse' },
      { next: '♭V',   weight: 7,  label: 'Tritone Trap',     extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Spiraling',        extensions: ['dim7'] },
    ],
    'i→Vsus4': [
      { next: '♭VI',  weight: 8,  label: 'Held Drift',       extensions: ['maj7'] },
      { next: 'i',    weight: 6,  label: 'Modal Loop',       extensions: ['m9'] },
    ],
  },
}
