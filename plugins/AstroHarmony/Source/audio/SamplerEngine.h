#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

#include <atomic>
#include <memory>
#include <vector>

#include "SampleLibrary.h"

//==============================================================================
// SamplerEngine — the audio half of AstroHarmony.
//
// Owns:
//   - juce::Synthesiser with 8 sampler voices (configurable polyphony cap)
//   - SampleLibrary for instrument switching
//   - juce::dsp::Reverb chain after the synth (params chosen to match the
//     Tone.js Reverb the Electron app uses)
//   - Master volume (linear gain, smoothed) read from APVTS
//   - Pitch transpose (semitones) read from APVTS
//
// Threading:
//   - process() runs on the audio thread
//   - playChord / setActiveInstrument run on the message thread
//   - SpinLock soundsLock guards the synth sound list during instrument
//     swaps (audio thread takes a try-lock; failure → emits silence for one
//     block, which is inaudible in practice)
//
// Sub-phase D wires playChord/stopAll/setActiveInstrument; Sub-phase F will
// integrate the Scheduler more tightly with host transport.
//==============================================================================
class SamplerEngine
{
public:
    SamplerEngine();
    ~SamplerEngine();

    void prepare (double sampleRate, int blockSize, int numChannels);
    void releaseResources();

    // Audio thread. Writes into `buffer`, additive nothing — caller is
    // expected to clear the buffer first if any prior content matters.
    void process (juce::AudioBuffer<float>& buffer,
                  float masterVolumePercent,
                  float pitchTransposeSemis);

    //==========================================================================
    // Public message-thread API — called from PluginEditor native functions
    // or from the Scheduler running on the audio thread (see noteOn/noteOff).

    /** Set the active sampler sound set. Decoded on first use, cached after. */
    void setActiveInstrument (const juce::String& instrumentId);

    /** Trigger a chord by midi note numbers. If `autoReleaseMs` is > 0, an
        asynchronous note-off is scheduled after that many ms so the chord
        decays naturally rather than ringing for the full sample length. */
    void playChord (const std::vector<int>& midiNotes,
                    float velocity,
                    int autoReleaseMs = 0);

    /** Hard release all currently sounding notes. */
    void stopAll();

    /** Audio-thread-safe note-on / note-off used by the Scheduler. */
    void noteOnFromAudioThread (int midiNote, float velocity);
    void noteOffFromAudioThread (int midiNote);

    /** Active instrument id (mostly for diagnostics). */
    juce::String getActiveInstrumentId() const { return activeInstrumentId; }

    // Diagnostic counters — message-thread reads from PluginEditor Timer.
    std::atomic<int>   blocksProcessed     { 0 };
    std::atomic<int>   blocksWithAudio     { 0 };
    std::atomic<float> lastBlockPeak       { 0.0f };
    std::atomic<int>   noteOnsThisSession  { 0 };

private:
    SampleLibrary library;

    juce::Synthesiser synth;
    juce::SpinLock soundsLock;

    juce::dsp::Reverb reverb;
    juce::dsp::Reverb::Parameters reverbParams;

    juce::SmoothedValue<float> smoothedGain;
    juce::SmoothedValue<float> smoothedTransposeRatio;

    // Per-instrument linear gain offset, updated atomically when the
    // instrument changes. Sub-phase D applies it as a post-synth multiplier
    // so the four instruments sit at consistent perceived loudness.
    std::atomic<float> instrumentGain { 1.0f };

    // Bumped every time playChord is called. Auto-release timers capture
    // their own generation and only fire noteOff if it still matches —
    // otherwise the previous chord's pending auto-release would kill the
    // freshly retriggered notes of the next chord.
    std::atomic<int> playChordGeneration { 0 };

    double currentSampleRate { 44100.0 };
    int currentBlockSize { 0 };
    int currentNumChannels { 2 };

    juce::String activeInstrumentId;

    void applyInstrumentSounds (const juce::String& instrumentId);

    // ADSR envelope chosen per instrument (mirrors lib/instruments.ts attack
    // + release values from cinematic-composer).
    static juce::ADSR::Parameters envelopeFor (const juce::String& instrumentId);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SamplerEngine)
};
