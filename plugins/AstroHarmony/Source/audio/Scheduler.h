#pragma once

#include <juce_core/juce_core.h>

#include <atomic>
#include <mutex>
#include <vector>

class SamplerEngine;

//==============================================================================
// Scheduler — drives chord-by-chord progression playback.
//
// Standalone-mode timing model (Sub-phase D): a sample counter advances
// every processBlock; when the count reaches the per-chord boundary
// (bars × beatsPerBar × samplesPerBeat) we release the current chord and
// trigger the next one. Bars-per-chord and tempo come from the host project
// state (pushState blob) — see PluginProcessor for how those reach us.
//
// Sub-phase F will swap this for an AudioPlayHead-locked variant that
// aligns to the host's transport position. For now: free-running internal
// tempo, with loop wrap when the progression ends.
//
// Thread model:
//   - setProgression / start / stop run on the message thread (called from
//     PluginEditor native functions). They take `paramLock` to swap in
//     new state.
//   - tick() runs on the audio thread inside processBlock. It does NOT take
//     paramLock (relies on the audio-thread state snapshot being updated
//     atomically by the message-thread setters). When more elaborate state
//     transitions are needed (Sub-phase F), the snapshot pattern will go
//     through a fifo.
//==============================================================================
class Scheduler
{
public:
    explicit Scheduler (SamplerEngine& engine);

    void prepare (double sampleRate);

    struct ChordEntry
    {
        std::vector<int> midiNotes;   // resolved + transposed before queueing
        float bars { 1.0f };          // chord duration in bars
    };

    // Replace the entire progression. Safe to call any time; the audio
    // thread picks up the new list on the next tick.
    void setProgression (std::vector<ChordEntry> chords);

    void setTempoBpm (float bpm)        { tempoBpm.store (juce::jmax (1.0f, bpm), std::memory_order_release); }
    void setLooping  (bool shouldLoop)  { looping.store (shouldLoop, std::memory_order_release); }
    void setBeatsPerBar (int n)         { beatsPerBar.store (juce::jmax (1, n), std::memory_order_release); }

    void start();
    void stop();
    bool isPlaying() const              { return playing.load (std::memory_order_acquire); }

    // Audio thread — call once per processBlock.
    void tick (int numSamples);

    // Surface state for the editor (consumed by PluginEditor::timerCallback
    // when it emits currentBeatChanged events).
    int  getCurrentChordIndex() const   { return currentChordIndex.load (std::memory_order_acquire); }

private:
    SamplerEngine& engine;

    std::mutex paramLock;
    std::vector<ChordEntry> progression;

    double currentSampleRate { 44100.0 };
    std::atomic<float> tempoBpm     { 100.0f };
    std::atomic<int>   beatsPerBar  { 4 };
    std::atomic<bool>  looping      { false };
    std::atomic<bool>  playing      { false };

    // Audio-thread state.
    std::atomic<int> currentChordIndex { -1 };
    int   audioActiveChordIndex { -1 };
    juce::int64 samplesSinceChordStart { 0 };
    std::vector<int> currentlyPlayingNotes;

    void releaseCurrentChord();
    void triggerChord (int index);
    juce::int64 samplesForChord (const ChordEntry& chord) const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Scheduler)
};
