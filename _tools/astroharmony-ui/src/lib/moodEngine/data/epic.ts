import type { MoodDefinition } from '../types'

/**
 * EPIC — bright cinematic heroism in E♭ major (Ionian-first).
 * Inspirations: John Williams (Star Wars Main Theme, Indiana Jones,
 * Superman, Raiders March), Two Steps from Hell, Williams-style
 * triumphal fanfares. Mixolydian gives the ♭VII heroic move; Aeolian
 * stays available for darker-shade borrowings (♭III, ♭VI).
 */
export const EPIC: MoodDefinition = {
  id: 'epic',
  label: 'Epic',
  description: 'Powerful, grand, heroic',
  preferredModes: ['ionian', 'mixolydian', 'aeolian'],
  preferredRoot: 'D#',
  defaultVoicing: 'cinematic',
  defaultBars: 2,
  avoidsResolution: false,

  // Hans Zimmer's signature i→♭VI is exactly L_m (Cinematic Lift).
  // Heroic Mediant (Cm→E♭) and same-quality CMs give that big trailer feel.
  transformWeights: {
    L_m:           10,
    CM_upm3_same:   9,
    R_m:            8,
    P:              7,
    CM_dnM3_same:   8,
    CM_upM3_same:   7,
    L_M:            6,
    R_M:            5,
  },

  seeds: [
    { next: 'i',    weight: 10, label: 'Heroic Tonic',     extensions: ['add9'],         preferredBars: 2 },
    { next: 'I',    weight: 9,  label: 'Triumphant Open',  extensions: ['add9'],         preferredBars: 2 },
    { next: 'vi',   weight: 8,  label: 'Brooding Anchor',  extensions: ['m9'],           preferredBars: 4 },
    { next: '♭VI',  weight: 7,  label: 'Ominous Pedal',    extensions: ['maj7'],         preferredBars: 4 },
    { next: '♭III', weight: 6,  label: 'Modal Foundation', extensions: ['add9'],         preferredBars: 2 },
    { next: 'iv',   weight: 5,  label: 'Battle Drone',     extensions: ['m11'],          preferredBars: 4 },
  ],

  fromFunction: {
    i: [
      { next: '♭VI',  weight: 10, label: 'Heroic Rise',          extensions: ['maj7','add9'], preferredBars: 2 },
      { next: '♭VII', weight: 10, label: 'Driving Forward',      extensions: ['sus4'],         preferredBars: 2 },
      { next: 'iv',   weight: 8,  label: 'Battle Pulse',          extensions: ['m9'],          preferredBars: 1 },
      { next: '♭III', weight: 8,  label: 'Modal Reveal',          extensions: ['add9'],        preferredBars: 2 },
      { next: 'V',    weight: 7,  label: 'Heroic Call',           extensions: ['sus4'],        preferredBars: 1 },
      { next: 'I',    weight: 7,  label: 'Sudden Light',          extensions: ['add9'],        preferredBars: 2 },
      { next: 'VI',   weight: 6,  label: 'Chromatic Lift',        extensions: ['maj7'],        preferredBars: 2 },
      { next: 'V/V',  weight: 5,  label: 'Distant Storm',         extensions: ['7'],            preferredBars: 1 },
      { next: 'Vsus4',weight: 6,  label: 'Suspended Heroism',                                   preferredBars: 2 },
      { next: 'ii°',  weight: 4,  label: 'Lurking Doubt',         extensions: ['m7'] },
      { next: '♭II',  weight: 4,  label: 'Cinematic Shock',       extensions: ['maj7'] },
      { next: 'iii',  weight: 3,  label: 'Quiet Lift',            extensions: ['m9'] },
    ],
    I: [
      { next: '♭VII', weight: 10, label: 'Mixolydian Power',                                    preferredBars: 2 },
      { next: 'vi',   weight: 9,  label: 'Heroic Shadow',         extensions: ['m9'],          preferredBars: 2 },
      { next: '♭VI',  weight: 9,  label: 'Chromatic Rise',        extensions: ['maj7'],        preferredBars: 2 },
      { next: 'IV',   weight: 8,  label: 'Lydian Lift',           extensions: ['maj7','#11'],  preferredBars: 2 },
      { next: 'V',    weight: 7,  label: 'Open Sky',              extensions: ['sus4'],        preferredBars: 1 },
      { next: '♭III', weight: 7,  label: 'Cinematic Pivot',       extensions: ['add9'],        preferredBars: 2 },
      { next: 'iii',  weight: 6,  label: 'Quiet Reflection',      extensions: ['m9'],          preferredBars: 2 },
      { next: 'V/vi', weight: 5,  label: 'Plot Twist',            extensions: ['7'],            preferredBars: 1 },
      { next: 'Vsus4',weight: 6,  label: 'Suspended Reach',                                     preferredBars: 2 },
      { next: 'II',   weight: 5,  label: 'Lydian Float',          extensions: ['maj7'] },
    ],
    '♭VI': [
      { next: '♭VII', weight: 10, label: 'Epic Climb',            extensions: ['sus2'],        preferredBars: 2 },
      { next: 'i',    weight: 8,  label: 'Heroic Resolve',        extensions: ['m9'],          preferredBars: 4 },
      { next: 'iv',   weight: 7,  label: 'Doomed Turn',           extensions: ['m7'],          preferredBars: 2 },
      { next: '♭III', weight: 7,  label: 'Modal Step',            extensions: ['add9'],        preferredBars: 2 },
      { next: 'V',    weight: 6,  label: 'Climactic Build',       extensions: ['7','sus4'],    preferredBars: 1 },
      { next: 'I',    weight: 6,  label: 'Sudden Light',          extensions: ['maj7'] },
      { next: 'IV',   weight: 5,  label: 'Picardy Lift',          extensions: ['maj7'] },
    ],
    '♭VII': [
      { next: 'i',    weight: 10, label: 'Triumphant Return',     extensions: ['m9'],          preferredBars: 4 },
      { next: '♭VI',  weight: 8,  label: 'Epic Sway',                                          preferredBars: 2 },
      { next: 'IV',   weight: 7,  label: 'Lifted Hope',           extensions: ['maj7'] },
      { next: 'I',    weight: 7,  label: 'Mixo Climb',            extensions: ['add9'] },
      { next: '♭III', weight: 6,  label: 'Modal Slide',           extensions: ['add9'] },
      { next: 'iv',   weight: 5,  label: 'Reluctant Descent',     extensions: ['m9'] },
      { next: 'V',    weight: 5,  label: 'Sudden Dominance',      extensions: ['7'] },
    ],
    '♭III': [
      { next: 'i',    weight: 8,  label: 'Modal Return',          extensions: ['m9'],          preferredBars: 2 },
      { next: '♭VI',  weight: 9,  label: 'Cinematic Step',        extensions: ['maj7'],        preferredBars: 2 },
      { next: 'iv',   weight: 7,  label: 'Inward Pivot',          extensions: ['m9'] },
      { next: '♭VII', weight: 8,  label: 'Forward Drive' },
      { next: 'V',    weight: 5,  label: 'Sudden Tension',        extensions: ['7'] },
      { next: 'I',    weight: 4,  label: 'Brightening',           extensions: ['add9'] },
    ],
    iv: [
      { next: 'V',    weight: 9,  label: 'Tension Build',         extensions: ['sus4','7'],    preferredBars: 1 },
      { next: 'i',    weight: 8,  label: 'Plagal Heroic',         extensions: ['m9'] },
      { next: '♭VI',  weight: 8,  label: 'Heroic Pivot',          extensions: ['maj7'] },
      { next: '♭VII', weight: 7,  label: 'Marching Rise' },
      { next: '♭III', weight: 6,  label: 'Modal Walk',            extensions: ['add9'] },
      { next: 'I',    weight: 5,  label: 'Picardy Light',         extensions: ['maj7'] },
      { next: 'Vsus4',weight: 6,  label: 'Hanging Tension' },
    ],
    V: [
      { next: 'i',    weight: 9,  label: 'Heroic Cadence',        extensions: ['m9'],          preferredBars: 4 },
      { next: '♭VI',  weight: 9,  label: 'Deceptive Twist',       extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Quiet Deception',       extensions: ['m9'] },
      { next: 'I',    weight: 6,  label: 'Authentic Triumph',     extensions: ['add9'] },
      { next: 'IV',   weight: 5,  label: 'Plagal Sway',           extensions: ['maj7'] },
      { next: '♭VII', weight: 6,  label: 'Modal Twist' },
    ],
    Vsus4: [
      { next: 'V',    weight: 9,  label: 'Released Tension',      extensions: ['7'] },
      { next: 'i',    weight: 7,  label: 'Hanging Resolution',    extensions: ['m9'] },
      { next: '♭VI',  weight: 6,  label: 'Suspended Twist',       extensions: ['maj7'] },
      { next: 'IV',   weight: 5,  label: 'Stable Rest' },
    ],
    vi: [
      { next: 'IV',   weight: 9,  label: 'Pop Heroic',            extensions: ['maj7'] },
      { next: 'V',    weight: 8,  label: 'Yearning Build',        extensions: ['sus4'] },
      { next: 'iii',  weight: 6,  label: 'Reflective',            extensions: ['m9'] },
      { next: 'ii',   weight: 6,  label: 'Subdominant Step' },
      { next: 'I',    weight: 6,  label: 'Brief Light',           extensions: ['add9'] },
      { next: '♭VII', weight: 7,  label: 'Modal Pivot' },
    ],
    IV: [
      { next: 'I',    weight: 8,  label: 'Plagal Glory',          extensions: ['maj7'] },
      { next: 'V',    weight: 9,  label: 'Heroic Lift',           extensions: ['sus4'] },
      { next: 'vi',   weight: 6,  label: 'Bittersweet Step',      extensions: ['m9'] },
      { next: '♭VII', weight: 8,  label: 'Mixo Forward' },
      { next: 'IV',   weight: 4,  label: 'Lydian Hold',           extensions: ['maj7','#11'] },
    ],
    ii: [
      { next: 'V',    weight: 9,  label: 'Classic Build',         extensions: ['7','sus4'] },
      { next: 'I',    weight: 6,  label: 'Soft Resolve' },
      { next: 'IV',   weight: 5,  label: 'Lateral Lift' },
      { next: 'vi',   weight: 5,  label: 'Reflective Turn',       extensions: ['m9'] },
    ],
    iii: [
      { next: 'IV',   weight: 8,  label: 'Lift Path',             extensions: ['maj7'] },
      { next: 'vi',   weight: 7,  label: 'Quiet Step' },
      { next: '♭VI',  weight: 6,  label: 'Modal Shift',           extensions: ['maj7'] },
    ],
    II: [
      { next: 'I',    weight: 8,  label: 'Lydian Cadence',        extensions: ['maj7','#11'] },
      { next: 'V',    weight: 7,  label: 'Magical Build' },
      { next: 'IV',   weight: 6,  label: 'Subdominant Step',      extensions: ['maj7'] },
    ],
    VI: [
      { next: 'iv',   weight: 7,  label: 'Sudden Sorrow',         extensions: ['m9'] },
      { next: 'V',    weight: 8,  label: 'Tension Climb',         extensions: ['sus4'] },
      { next: 'i',    weight: 6,  label: 'Heroic Return',         extensions: ['m9'] },
      { next: 'VII',  weight: 6,  label: 'Modal Slide' },
    ],
  },

  fromBigram: {
    'i→♭VI':    [
      { next: '♭VII', weight: 10, label: 'Three-Chord Anthem', preferredBars: 2 },
      { next: 'IV',   weight: 7,  label: 'Hopeful Bridge',     extensions: ['maj7'] },
      { next: 'i',    weight: 6,  label: 'Heroic Hold',        extensions: ['m9'],   preferredBars: 4 },
      { next: 'V',    weight: 5,  label: 'Cinematic Build',    extensions: ['sus4'] },
    ],
    'i→♭VII':   [
      { next: '♭VI',  weight: 10, label: 'Cinematic Loop',     preferredBars: 2 },
      { next: 'i',    weight: 8,  label: 'Heroic Return',      extensions: ['m9'],   preferredBars: 4 },
      { next: 'IV',   weight: 6,  label: 'Lifted Bridge',      extensions: ['maj7'] },
      { next: '♭III', weight: 7,  label: 'Modal Flow' },
    ],
    '♭VI→♭VII': [
      { next: 'i',    weight: 10, label: 'Andante Resolution', preferredBars: 4 },
      { next: '♭III', weight: 7,  label: 'Major Reveal',       extensions: ['add9'] },
      { next: '♭VI',  weight: 6,  label: 'Cycle Continues' },
      { next: 'I',    weight: 5,  label: 'Picardy Triumph',    extensions: ['add9'] },
    ],
    '♭VII→♭VI': [
      { next: '♭VII', weight: 9,  label: 'Andalusian Pulse' },
      { next: 'i',    weight: 7,  label: 'Sorrowful Return',   extensions: ['m9'] },
      { next: 'iv',   weight: 6,  label: 'Doomed Step',        extensions: ['m9'] },
    ],
    'I→♭VII':   [
      { next: 'IV',   weight: 10, label: 'Hopeful Anthem',     extensions: ['maj7'] },
      { next: 'I',    weight: 7,  label: 'Mixo Vamp' },
      { next: 'V',    weight: 6,  label: 'Modal Build',        extensions: ['sus4'] },
    ],
    '♭VI→i':    [
      { next: '♭VII', weight: 9,  label: 'Three-Chord Loop' },
      { next: 'iv',   weight: 7,  label: 'Dark Turn',          extensions: ['m9'] },
      { next: 'V',    weight: 6,  label: 'Climactic Build',    extensions: ['sus4'] },
    ],
    'IV→V':     [
      { next: 'I',    weight: 9,  label: 'Classic Cadence',    extensions: ['add9'],preferredBars: 4 },
      { next: 'vi',   weight: 8,  label: 'Deceptive',          extensions: ['m9'] },
      { next: '♭VI',  weight: 7,  label: 'Modal Twist',        extensions: ['maj7'] },
    ],
    'iv→V':     [
      { next: 'i',    weight: 9,  label: 'Minor Cadence',      extensions: ['m9'],   preferredBars: 4 },
      { next: '♭VI',  weight: 8,  label: 'Deceptive Heroic',   extensions: ['maj7'] },
      { next: 'Vsus4',weight: 6,  label: 'Pull Back' },
    ],
    'V→vi':     [
      { next: 'IV',   weight: 9,  label: 'Pop Heroic Loop',    extensions: ['maj7'] },
      { next: '♭VI',  weight: 7,  label: 'Cinematic Twist',    extensions: ['maj7'] },
    ],
    'vi→IV':    [
      { next: 'V',    weight: 9,  label: 'Rising Heroic',      extensions: ['sus4'] },
      { next: 'I',    weight: 8,  label: 'Pop Return',         extensions: ['add9'] },
      { next: '♭VII', weight: 7,  label: 'Modal Bridge' },
    ],
    'i→iv':     [
      { next: 'V',    weight: 9,  label: 'Heroic Build',       extensions: ['sus4'] },
      { next: '♭VI',  weight: 8,  label: 'Sorrow→Light',       extensions: ['maj7'] },
      { next: '♭VII', weight: 7,  label: 'Modal Lift' },
    ],
    '♭III→♭VI': [
      { next: '♭VII', weight: 9,  label: 'Modal March' },
      { next: 'i',    weight: 7,  label: 'Heroic Return' },
    ],
  },
}
