export type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type Extension = 'triad' | '7' | '9' | '11' | '13'

export type Inversion = 'root' | '1st' | '2nd' | '3rd'

export type VoicingType =
  | 'standard'
  | 'cinematic'
  | 'pianoSpread'
  | 'jazz'          // rootless shell
  | 'neoSoul'
  | 'gospel'
  | 'voiceLeading'
  | 'openVoicing'
  | 'quartal'
  | 'cluster'
  | 'quintal'       // retained for backward-compat

export type Duration = '1' | '2'

export type BaseScale = 'ionian' | 'harmonic_minor' | 'melodic_minor'

export type ScaleType =
  // Ionian family (7 modes)
  | 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian'
  // Harmonic Minor family (7 modes)
  | 'harmonicMinor' | 'locrianNat6' | 'ionianAug' | 'dorianSharp4'
  | 'phrygianDom' | 'lydianSharp2' | 'alteredDim'
  // Melodic Minor family (7 modes)
  | 'melodicMinor' | 'dorianFlat2' | 'lydianAug' | 'lydianDom'
  | 'mixolydianFlat6' | 'locrianNat2' | 'superLocrian'

export interface ModeDefinition {
  key: ScaleType
  name: string
  tonalName: string
  family: BaseScale
  modeIndex: number
}

export interface ChordEntry {
  notes: string[]
  displayName: string
  roman: string
  sourceRoot: string
  sourceScale: ScaleType
  bassNote?: string
  inversion?: Inversion
  drop2?: boolean
  voicingType?: VoicingType
  duration?: Duration
  /** Length in musical bars (1 bar = 4 beats). Step = 0.5. Default 1. */
  bars?: number
  /** Variant index inside a voicing style (0-3). */
  voicingVariant?: number
  /** Stable color index (0-5) — survives reordering so cards keep their hue. */
  colorIndex?: number
}

export interface ScaleDefinition {
  intervals: number[]
  romanNumerals: string[]
  tonalName: string
}

export interface VoicingSettings {
  inversion: Inversion
  drop2: boolean
  bassNote: string | null
  voicingType: VoicingType
}
