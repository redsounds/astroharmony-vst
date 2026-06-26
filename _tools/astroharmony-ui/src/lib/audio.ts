// AstroHarmony — plugin audio shim.
//
// In the Electron app this file wraps Tone.js Samplers and routes chord
// playback through Web Audio. Inside the JUCE plugin (Sub-phase D), audio
// happens C++-side: every operation here forwards to callNative('...', ...),
// which the PluginEditor's withNativeFunction handlers route into the
// SamplerEngine + Scheduler.
//
// The pure voicing helpers (voiceChord, getVoicedNotes, applyDrop2, etc.)
// stay identical to the Electron source — they're consumed synchronously by
// useChordPreview, RightPanel piano viz, MIDI export, store.setPianoView,
// and so on.

import type { ChordEntry, Inversion, VoicingType } from '@/types/music'
import { voicePerStyle } from '@/lib/voicings'
import { callNative, inJuce } from '@/jucebridge'

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
  if (inJuce()) { void callNative('setTransposeSemis', playbackTranspose) }
}
export function getPlaybackTranspose(): number { return playbackTranspose }

// ─── Audio operations — Sub-phase D: native bridge ───────────────────────
// In a plain browser (no JUCE backend) these are no-ops — useful for
// component dev outside the plugin DLL. Inside FL Studio, every call lands
// on a withNativeFunction handler in PluginEditor and drives the C++
// SamplerEngine / Scheduler.

export async function initAudio(): Promise<void> { /* no-op — C++ is always live */ }

export async function setActiveInstrument(id: string): Promise<void> {
  if (inJuce()) { void callNative('setInstrument', id) }
}

export async function setMasterVolume(percent: number): Promise<void> {
  if (inJuce()) { void callNative('setMasterVolumePercent', percent) }
}

export async function setTempo(bpm: number): Promise<void> {
  if (inJuce()) { void callNative('setTempoBpm', bpm) }
}

export async function setLoop(enabled: boolean): Promise<void> {
  if (inJuce()) { void callNative('setLoopEnabled', enabled) }
}

export async function playChord(
  notes: string[],
  _duration: string | number = '4n',
  inversion: Inversion = 'root',
  bassNote: string | null = null,
  drop2 = false,
  voicingType: VoicingType = 'standard',
  variant: number = 0,
): Promise<void> {
  if (!inJuce()) return
  // Apply voicing JS-side (the C++ side doesn't know about voicing rules,
  // it just plays whatever midi notes we pass). This keeps the audio path
  // identical between preview clicks, RightPanel taps, and Scheduler
  // playback — Sub-phase D's design choice.
  const voiced = getVoicedNotes(notes, inversion, drop2, bassNote, voicingType, variant)
  const stripped = voiced.length > 0 ? voiced : notes
  void callNative('playChord', stripped, inversion, drop2, voicingType)
}

export async function playProgression(
  chords: ChordEntry[],
  tempo: number,
  loop: boolean,
  onBeat: (beat: number) => void,
  onStop: () => void,
): Promise<void> {
  if (!inJuce()) { onStop(); return }
  // Voice every chord up-front so C++ gets concrete midi notes.
  const payload = chords.map(c => ({
    notes: getVoicedNotes(
      c.notes,
      c.inversion ?? 'root',
      c.drop2 ?? false,
      c.bassNote ?? null,
      c.voicingType ?? 'standard',
      c.voicingVariant ?? 0,
    ),
    bars: typeof c.bars === 'number' ? c.bars : 1,
  }))
  // Sync tempo + loop before kicking off — both are read by the Scheduler.
  await setTempo(tempo)
  await setLoop(loop)
  void callNative('playProgression', payload, loop)
  // currentBeat updates flow back via the C++ → JS currentBeatChanged
  // event (subscribed in lib/stateSync.ts). The onBeat callback the UI
  // passes is retained for browser-mode parity but unused in plugin mode.
  void onBeat
  void onStop
}

export function stopPlayback(): void {
  if (inJuce()) { void callNative('stopAll') }
}
