import type { MoodDefinition } from '../types'

/**
 * HORROR — Phrygian / Locrian / Phrygian Dominant / Diminished.
 * Inspirations: John Carpenter, Goblin (Suspiria), Penderecki,
 * Mica Levi (Under the Skin). Tritones, dim7 chains, major↔minor shock.
 */
export const HORROR: MoodDefinition = {
  id: 'horror',
  label: 'Horror',
  description: 'Dark, scary, eerie',
  preferredModes: ['phrygian', 'locrian', 'phrygianDom', 'alteredDim'],
  preferredRoot: 'D',
  defaultVoicing: 'cinematic',
  defaultBars: 1,
  avoidsResolution: true,

  // Tritone (devil's interval) + Slide + Parallel flip own the horror
  // vocabulary. Carpenter, Goblin, Mica Levi all live here.
  transformWeights: {
    TRI_M:          10,
    TRI_m:          10,
    SLIDE_up:        9,
    SLIDE_dn:        9,
    P:               8,
    CM_dnm3_same:    7,
    CM_dnM3_same:    6,
  },
  embracesJarringMoves: true,

  seeds: [
    { next: 'i',    weight: 10, label: 'Stalking Tonic',   extensions: ['m9'],   preferredBars: 2 },
    { next: 'vii°', weight: 9,  label: 'Imminent Dread',   extensions: ['dim7'], preferredBars: 1 },
    { next: '♭II',  weight: 7,  label: 'Eerie Whisper',    extensions: ['maj7'] },
    { next: 'i°',   weight: 6,  label: 'Pure Terror',      extensions: ['dim7'] },
    { next: '♭V',   weight: 5,  label: 'Tritone Pulse',    extensions: ['maj7'] },
  ],

  fromFunction: {
    i: [
      { next: '♭II',  weight: 10, label: 'Phrygian Stab',     extensions: ['maj7'],     preferredBars: 1 },
      { next: '♭V',   weight: 10, label: 'Tritone Horror',    extensions: ['maj7'] },
      { next: 'vii°', weight: 9,  label: 'Diminished Terror', extensions: ['dim7'] },
      { next: 'I',    weight: 8,  label: 'Major→Minor Shock', extensions: ['maj7'] },
      { next: '♭VI',  weight: 7,  label: 'Andalusian Doom',   extensions: ['maj7'] },
      { next: 'i°',   weight: 7,  label: 'Pure Dread',        extensions: ['dim7'] },
      { next: 'V',    weight: 6,  label: 'Stalker Build',     extensions: ['7','b9'] },
      { next: 'iv',   weight: 6,  label: 'Dread Sink',        extensions: ['m11'] },
      { next: 'I+',   weight: 5,  label: 'Augmented Lurch',                              preferredBars: 1 },
      { next: '♭III', weight: 5,  label: 'Modal Shadow',      extensions: ['maj7'] },
      { next: 'ii°',  weight: 5,  label: 'Half-Dim Crawl',    extensions: ['m7'] },
    ],
    '♭II': [
      { next: 'i',    weight: 9,  label: 'Eerie Resolution',  extensions: ['m9'] },
      { next: '♭V',   weight: 8,  label: 'Tritone Trap',      extensions: ['maj7'] },
      { next: 'vii°', weight: 8,  label: 'Tightening Grip',   extensions: ['dim7'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Pulse',    preferredBars: 1 },
      { next: '♭III', weight: 6,  label: 'Eastern Veil',      extensions: ['maj7'] },
      { next: 'I',    weight: 5,  label: 'Brief False Light', extensions: ['maj7'] },
    ],
    '♭V': [
      { next: 'i',    weight: 6,  label: 'Tritone Snap',      extensions: ['m9'] },
      { next: '♭II',  weight: 9,  label: 'Crawling Closer',   extensions: ['maj7'] },
      { next: 'vii°', weight: 8,  label: 'Dread Spiral',      extensions: ['dim7'] },
      { next: '♭VI',  weight: 6,  label: 'Tritone Drift',     extensions: ['maj7'] },
      { next: 'V',    weight: 5,  label: 'Sudden Pressure',   extensions: ['7','b9'] },
    ],
    'vii°': [
      { next: 'i',    weight: 5,  label: 'Reluctant Anchor',  extensions: ['m9'] },
      { next: '♭II',  weight: 9,  label: 'Sliding Horror',    extensions: ['maj7'] },
      { next: '♭V',   weight: 8,  label: 'Tritone Loop',      extensions: ['maj7'] },
      { next: '♭VI',  weight: 6,  label: 'Doom Slide',        extensions: ['maj7'] },
      { next: 'V',    weight: 6,  label: 'Building Threat',   extensions: ['7','b9'] },
      { next: 'i°',   weight: 7,  label: 'Doubled Dread',     extensions: ['dim7'] },
    ],
    'I': [
      { next: 'i',    weight: 10, label: 'Major→Minor Shock', extensions: ['m9'] },
      { next: '♭VI',  weight: 7,  label: 'Sudden Shadow',     extensions: ['maj7'] },
      { next: '♭II',  weight: 7,  label: 'Chromatic Crash',   extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Dim Crash',         extensions: ['dim7'] },
      { next: '♭V',   weight: 5,  label: 'Tritone Shock',     extensions: ['maj7'] },
    ],
    'i°': [
      { next: 'i',    weight: 7,  label: 'Dread Anchor',      extensions: ['m9'] },
      { next: '♭II',  weight: 8,  label: 'Stalker Approach',  extensions: ['maj7'] },
      { next: '♭V',   weight: 7,  label: 'Tritone Lurch',     extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Diminished Loop',   extensions: ['dim7'] },
    ],
    'I+': [
      { next: 'i',    weight: 7,  label: 'Augmented Drop',    extensions: ['m9'] },
      { next: '♭VI',  weight: 6,  label: 'Twisted Step',      extensions: ['maj7'] },
      { next: 'iv',   weight: 5,  label: 'Augmented Sink',    extensions: ['m11'] },
    ],
    'iv': [
      { next: 'vii°', weight: 7,  label: 'Tightening Crawl',  extensions: ['dim7'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Slide',    extensions: ['maj7'] },
      { next: 'V',    weight: 6,  label: 'Reluctant Build',   extensions: ['7','b9'] },
      { next: 'i',    weight: 4,  label: 'Pulled Back',       extensions: ['m9'] },
    ],
    '♭VI': [
      { next: '♭VII', weight: 8,  label: 'Modal Stalk' },
      { next: '♭II',  weight: 6,  label: 'Sudden Pivot',      extensions: ['maj7'] },
      { next: 'vii°', weight: 7,  label: 'Dim Trap',          extensions: ['dim7'] },
      { next: 'V',    weight: 5,  label: 'Climactic Threat',  extensions: ['7','b9'] },
    ],
    '♭III': [
      { next: '♭VI',  weight: 7,  label: 'Modal Descent',     extensions: ['maj7'] },
      { next: 'iv',   weight: 6,  label: 'Sudden Sink',       extensions: ['m9'] },
      { next: 'vii°', weight: 5,  label: 'Dim Pivot',         extensions: ['dim7'] },
    ],
    'V': [
      { next: '♭VI',  weight: 8,  label: 'Deceptive Doom',    extensions: ['maj7'] },
      { next: 'vii°', weight: 7,  label: 'Climbing Threat',   extensions: ['dim7'] },
      { next: 'i',    weight: 3,  label: 'Forced End',        extensions: ['m9'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Twist',    extensions: ['maj7'] },
    ],
    'ii°': [
      { next: '♭II',  weight: 8,  label: 'Crawl Step',        extensions: ['maj7'] },
      { next: 'V',    weight: 7,  label: 'Climactic Doom',    extensions: ['7','b9'] },
      { next: 'vii°', weight: 6,  label: 'Dim Spiral',        extensions: ['dim7'] },
    ],
  },

  fromBigram: {
    'i→♭II':   [
      { next: 'i',    weight: 10, label: 'Phrygian Loop',     extensions: ['m9'],   preferredBars: 1 },
      { next: '♭V',   weight: 9,  label: 'Tritone Trap',      extensions: ['maj7'] },
      { next: 'vii°', weight: 7,  label: 'Tightening',        extensions: ['dim7'] },
    ],
    'i→♭V':    [
      { next: '♭II',  weight: 9,  label: 'Chromatic Stalk',   extensions: ['maj7'] },
      { next: 'vii°', weight: 7,  label: 'Spiraling Doom',    extensions: ['dim7'] },
      { next: 'i',    weight: 5,  label: 'Tritone Loop',      extensions: ['m9'] },
    ],
    'i→vii°':  [
      { next: '♭II',  weight: 9,  label: 'Spiraling Trap',    extensions: ['maj7'] },
      { next: '♭V',   weight: 8,  label: 'Tritone Slide',     extensions: ['maj7'] },
      { next: 'i°',   weight: 6,  label: 'Doubled Dread',     extensions: ['dim7'] },
    ],
    'I→i':     [
      { next: '♭VI',  weight: 9,  label: 'Modal Plunge',      extensions: ['maj7'] },
      { next: 'iv',   weight: 7,  label: 'Sad Pivot',         extensions: ['m9'] },
      { next: '♭II',  weight: 6,  label: 'Phrygian Twist',    extensions: ['maj7'] },
    ],
    'i→I':     [
      { next: 'i',    weight: 10, label: 'Picardy Shock',     extensions: ['m9'] },
      { next: '♭VI',  weight: 7,  label: 'Sudden Shadow',     extensions: ['maj7'] },
    ],
    '♭II→i':   [
      { next: '♭II',  weight: 9,  label: 'Phrygian Pulse',    preferredBars: 1 },
      { next: '♭V',   weight: 8,  label: 'Tritone Trap',      extensions: ['maj7'] },
      { next: 'vii°', weight: 6,  label: 'Spiraling Doom',    extensions: ['dim7'] },
    ],
    'vii°→i':  [
      { next: 'vii°', weight: 8,  label: 'Dim Loop',          extensions: ['dim7'] },
      { next: '♭II',  weight: 7,  label: 'Stalking',          extensions: ['maj7'] },
    ],
  },
}
