'use client'

import { useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { playChord, initAudio, getVoicedNotes } from '@/lib/audio'
import type { ChordEntry } from '@/types/music'

const PREVIEW_DURATION_MS = 1400

export function useChordPreview() {
  const {
    inversion, drop2, voicingType, progressionVoicing, progression,
    setPreviewNotes, setPinnedChordNotes, setBassNote, addChord,
  } = useStore()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const preview = useCallback(
    async (chord: ChordEntry, add = true) => {
      await initAudio()
      const bass = chord.bassNote ?? chord.notes[0]
      const inv = chord.inversion ?? inversion
      const d2 = chord.drop2 ?? drop2
      // Active progression style wins over the chord's hint, so chord
      // picker buttons + suggestions always sound in the current mood
      // style — both for the audio preview and the entry that lands in
      // the progression.
      const vt = (progressionVoicing ?? chord.voicingType ?? voicingType) as ChordEntry['voicingType']
      const variant = progressionVoicing
        ? progression.length % 4
        : (chord.voicingVariant ?? 0)
      playChord(chord.notes, '4n', inv, bass, d2, vt, variant)

      const voiced = getVoicedNotes(chord.notes, inv, d2, bass, vt, variant)
      const pianoNotes = voiced.map(n => n.replace(/\d+$/, ''))

      if (clearTimer.current) clearTimeout(clearTimer.current)
      setPreviewNotes(pianoNotes, voiced)
      setPinnedChordNotes(pianoNotes, voiced)
      setBassNote(bass)
      clearTimer.current = setTimeout(() => setPreviewNotes(null, null), PREVIEW_DURATION_MS)

      if (add) addChord({
        ...chord,
        bassNote: bass,
        inversion: inv,
        drop2: d2,
        voicingType: vt,
        voicingVariant: variant,
      })
    },
    [inversion, drop2, voicingType, progressionVoicing, progression.length,
     setPreviewNotes, setPinnedChordNotes, setBassNote, addChord]
  )

  return preview
}
