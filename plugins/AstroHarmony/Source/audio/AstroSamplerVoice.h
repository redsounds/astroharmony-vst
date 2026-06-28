#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>

//==============================================================================
// AstroSamplerVoice — juce::SamplerVoice with a 3 ms hard-fade override for
// same-note retriggers.
//
// The problem this solves: when a chord is re-triggered on a transient-rich
// instrument (piano, trumpet), the old voice's release tail (~80 ms) plays
// in parallel with the new voice's freshly-restarted sample. Both play the
// SAME sample at different positions → phase-coherent summing → audible
// comb-filter click on every retrigger.
//
// What this voice adds:
//   stopNoteFast (durationSecs) → arms a sample-counted fade ramp that
//   multiplies the parent class's per-block output down to zero in N
//   samples. By the time the new voice's transient ramps up, the old voice
//   is silent — no overlap, no comb filter.
//
// Usage from SamplerEngine: before synth.noteOn(midiNote) for a retrigger,
// iterate voices, find any AstroSamplerVoice currently playing that note,
// call stopNoteFast(0.003). Then call synth.noteOn() normally. JUCE's
// internal noteOn will additionally fire stopVoice(tail-off) on the still-
// active voice; both the ADSR release and the fast-fade ramp are applied,
// and the 3 ms ramp wins by killing the signal first.
//==============================================================================
class AstroSamplerVoice : public juce::SamplerVoice
{
public:
    AstroSamplerVoice() = default;

    /** Fast-fade the currently sounding note to silence over the given
        duration. No-op if the voice isn't currently active. Safe to call
        from the audio thread (used by SamplerEngine::playChord, which
        runs message-thread side but the synth lock is shared). */
    void stopNoteFast (double fadeDurationSeconds) noexcept;

    // SamplerVoice overrides ---------------------------------------------------
    void startNote (int midiNoteNumber,
                    float velocity,
                    juce::SynthesiserSound* sound,
                    int currentPitchWheelPosition) override;

    void renderNextBlock (juce::AudioBuffer<float>& outputBuffer,
                          int startSample,
                          int numSamples) override;

private:
    bool  fastFading              { false };
    int   fastFadeSamplesRemaining{ 0 };
    int   fastFadeSamplesTotal    { 0 };

    juce::AudioBuffer<float> scratchBuffer;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AstroSamplerVoice)
};
