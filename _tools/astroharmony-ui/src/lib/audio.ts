// AstroHarmony — plugin audio shim.
//
// In the Electron app this file wraps Tone.js Samplers and routes chord
// playback through Web Audio. Inside the JUCE plugin, real audio happens
// C++-side (Sub-phase D wires juce::Synthesiser through the native function
// bridge). For Sub-phase B we KEEP all pure voicing helpers identical to the
// source — they're consumed by useChordPreview, RightPanel piano viz, MIDI
// export, etc. — and STUB the audio functions so the UI doesn't await a
// Tone.start() that hangs on missing sample files.

import type { ChordEntry, Inversion, VoicingType } from '@/types/music'
import { voicePerStyle } from '@/lib/voicings'

// ─── Pure helpers (identical to source) ──────────────────────────────────
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E',  Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
  'E#': 'F', 'B#': 'C',
  'C##': 'D', 'D##': 'E', 'E##': 'F#', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'C#',
  Dbb: 'C', Ebb: 'D', Fbb: 'D#', Gbb: 'F', Abb: 'G', Bbb: 'A', Cbb: 'A#',
}
function toSharp(note: string): string {
  const ascii = note
    .replace(/𝄪/g, '##').replace(/𝄫/g, 'bb')
    .replace(/♯/g, '#').replace(/♭/g, 'b')
  return FLAT_TO_SHARP[ascii] ?? ascii
}

function pcOf(note: string): number { return CHROMATIC.indexOf(toSharp(note)) }

function applyInversion(notes: string[], inv: Inversion): string[] {
  const a = [...notes]
  if (inv === '1st' && a.length >= 3) a.push(a.shift()!)
  if (inv === '2nd' && a.length >= 3) { a.push(a.shift()!); a.push(a.shift()!) }
  if (inv === '3rd' && a.length >= 4) { a.push(a.shift()!); a.push(a.shift()!); a.push(a.shift()!) }
  return a
}

function applyJazzVoicing(notes: string[]): string[] {
  if (notes.length < 4) return notes
  return notes.filter((_, i) => i !== 2)
}

function stackFromRoot(notes: string[], target: number): string[] {
  const semis = notes.map(pcOf)
  const used = new Set<number>([0])
  const result: string[] = [notes[0]]
  let current = semis[0]
  while (used.size < notes.length) {
    let bestIdx = -1
    let bestDiff = Infinity
    for (let i = 0; i < notes.length; i++) {
      if (used.has(i)) continue
      const interval = (semis[i] - current + 12) % 12
      const diff = Math.abs(interval - target)
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
    }
    if (bestIdx === -1) break
    used.add(bestIdx)
    result.push(notes[bestIdx])
    current = semis[bestIdx]
  }
  return result
}

function applyQuartalVoicing(notes: string[]): string[] {
  if (notes.length < 3) return notes
  return stackFromRoot(notes, 5)
}

function applyQuintalVoicing(notes: string[]): string[] {
  if (notes.length < 3) return notes
  return stackFromRoot(notes, 7)
}

function applyClusterVoicing(notes: string[]): string[] {
  if (notes.length < 3) return notes
  const rootSemi = pcOf(notes[0])
  const pairs = notes.map(n => ({ note: n, semi: pcOf(n) }))
  pairs.sort((a, b) => ((a.semi - rootSemi + 12) % 12) - ((b.semi - rootSemi + 12) % 12))
  return pairs.map(p => p.note)
}

export function voiceChord(notes: string[], octave = 4): string[] {
  const result: string[] = []
  let prevPc = -1
  let oct = octave
  notes.forEach((n, i) => {
    const sharp = toSharp(n)
    const pc = CHROMATIC.indexOf(sharp)
    if (i === 0) { result.push(`${sharp}${oct}`); prevPc = pc }
    else { if (pc <= prevPc) oct++; result.push(`${sharp}${oct}`); prevPc = pc }
  })
  return result
}

function applyDrop2(voiced: string[]): string[] {
  if (voiced.length < 3) return voiced
  const sorted = [...voiced].sort((a, b) => midiOf(a) - midiOf(b))
  const idx = sorted.length - 2
  const n = sorted[idx]
  const noteName = n.replace(/\d+$/, '')
  const oct = parseInt(n.match(/\d+$/)?.[0] ?? '4') - 1
  sorted[idx] = `${noteName}${oct}`
  return sorted.sort((a, b) => midiOf(a) - midiOf(b))
}

function midiOf(noteWithOct: string): number {
  const note = noteWithOct.replace(/\d+$/, '')
  const oct = parseInt(noteWithOct.match(/\d+$/)?.[0] ?? '4')
  return (oct + 1) * 12 + pcOf(note)
}

export function getVoicedNotes(
  notes: string[],
  inversion: Inversion = 'root',
  drop2 = false,
  bassNote: string | null = null,
  voicingType: VoicingType = 'standard',
  variant: number = 0,
  prevVoicing: string[] | null = null,
): string[] {
  // Style engine for variants / non-quick-path types. Source used CommonJS
  // require() to dodge a circular import; we use a static ES import (no
  // cycle in our tree).
  if (variant > 0 || (voicingType !== 'standard' && voicingType !== 'jazz' &&
      voicingType !== 'quartal' && voicingType !== 'quintal' &&
      voicingType !== 'cluster')) {
    let voiced = voicePerStyle(notes, voicingType, variant, prevVoicing)
    if (bassNote) voiced = ensureBassLowest(voiced, bassNote)
    return voiced
  }

  let processed: string[]
  switch (voicingType) {
    case 'jazz':    processed = applyJazzVoicing(notes); break
    case 'quartal': processed = applyQuartalVoicing(notes); break
    case 'quintal': processed = applyQuintalVoicing(notes); break
    case 'cluster': processed = applyClusterVoicing(notes); break
    default:        processed = applyInversion(notes, inversion); break
  }
  let voiced = voiceChord(processed)
  if (drop2 && voicingType === 'standard') voiced = applyDrop2(voiced)
  if (bassNote) voiced = ensureBassLowest(voiced, bassNote)
  return voiced
}

function ensureBassLowest(voiced: string[], bassNote: string): string[] {
  if (voiced.length === 0) return [`${toSharp(bassNote)}3`]
  const bassSharp = toSharp(bassNote)
  const bassPc = CHROMATIC.indexOf(bassSharp)
  if (bassPc < 0) return voiced

  const working = [...voiced].sort((a, b) => midiOf(a) - midiOf(b))
  const lowestMidi = midiOf(working[0])

  const lowestOctaveName = Math.floor(lowestMidi / 12) - 1
  let bassOctave = lowestOctaveName - 1
  let targetMidi = (bassOctave + 1) * 12 + bassPc

  while (targetMidi < 24) { bassOctave += 1; targetMidi += 12 }
  while (bassOctave > 2) { bassOctave -= 1; targetMidi -= 12 }
  if (targetMidi >= lowestMidi) return working
  if (working.some(n => midiOf(n) === targetMidi)) return working

  return [`${bassSharp}${bassOctave}`, ...working]
}

let playbackTranspose = 0
export function setPlaybackTranspose(semis: number): void {
  playbackTranspose = Math.max(-24, Math.min(24, Math.round(semis)))
}
export function getPlaybackTranspose(): number { return playbackTranspose }

// ─── Audio operations — stubbed for Sub-phase B ──────────────────────────
// Sub-phase D wires these to the C++ JUCE Synthesiser via
// jucebridge.callNative("playChord", ...) etc. For now they're no-ops so
// the UI never blocks on a Tone.start() that can't complete inside the
// plugin (no /samples/ resource provider yet, no AudioContext gesture
// guarantee inside WebView2).

export async function initAudio(): Promise<void> { /* no-op */ }
export async function setActiveInstrument(_id: string): Promise<void> { /* no-op */ }
export async function setMasterVolume(_percent: number): Promise<void> { /* no-op */ }

export async function playChord(
  _notes: string[],
  _duration: string | number = '4n',
  _inversion: Inversion = 'root',
  _bassNote: string | null = null,
  _drop2 = false,
  _voicingType: VoicingType = 'standard',
  _variant: number = 0,
): Promise<void> { /* no-op — Sub-phase D will route through callNative('playChord', ...) */ }

export async function playProgression(
  _chords: ChordEntry[],
  _tempo: number,
  _loop: boolean,
  _onBeat: (beat: number) => void,
  _onStop: () => void,
): Promise<void> { /* no-op — Sub-phase D + F handle scheduler + host sync */ }

export function stopPlayback(): void { /* no-op */ }
