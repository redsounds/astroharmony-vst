#include "AstroSamplerVoice.h"

void AstroSamplerVoice::stopNoteFast (double fadeDurationSeconds) noexcept
{
    if (! isVoiceActive())
        return;

    const double sr = getSampleRate();
    fastFadeSamplesTotal     = (int) std::max (1.0, sr * fadeDurationSeconds);
    fastFadeSamplesRemaining = fastFadeSamplesTotal;
    fastFading               = true;
}

void AstroSamplerVoice::startNote (int midiNoteNumber,
                                   float velocity,
                                   juce::SynthesiserSound* sound,
                                   int currentPitchWheelPosition)
{
    // Always reset the fast-fade flag when a fresh note starts — even if
    // a previous fade hadn't completed (e.g. JUCE recycled this voice for
    // a different note before our 3 ms ramp finished).
    fastFading = false;
    fastFadeSamplesRemaining = 0;
    juce::SamplerVoice::startNote (midiNoteNumber, velocity, sound, currentPitchWheelPosition);
}

void AstroSamplerVoice::renderNextBlock (juce::AudioBuffer<float>& outputBuffer,
                                         int startSample,
                                         int numSamples)
{
    if (! fastFading)
    {
        juce::SamplerVoice::renderNextBlock (outputBuffer, startSample, numSamples);
        return;
    }

    // Render the parent's output into a private scratch buffer, then scale
    // each sample by the fade ramp and mix into the real output. JUCE's
    // ADSR release (if it was also triggered, e.g. by Synthesiser::noteOn's
    // built-in same-note stopVoice) runs INSIDE the parent render — we
    // multiply on top of it, so whichever ramp reaches zero first wins.
    // At 3 ms vs ADSR ~80 ms, we always win.
    const int numChannels = outputBuffer.getNumChannels();
    if (scratchBuffer.getNumChannels() != numChannels
        || scratchBuffer.getNumSamples() < numSamples)
    {
        // dontKeepExistingContent + clearExtraSpace + avoidReallocating-if-possible
        scratchBuffer.setSize (numChannels, numSamples, false, false, true);
    }
    scratchBuffer.clear (0, numSamples);

    juce::SamplerVoice::renderNextBlock (scratchBuffer, 0, numSamples);

    for (int sample = 0; sample < numSamples; ++sample)
    {
        const float scale = fastFadeSamplesRemaining > 0
            ? (float) fastFadeSamplesRemaining / (float) fastFadeSamplesTotal
            : 0.0f;
        for (int ch = 0; ch < numChannels; ++ch)
            outputBuffer.addSample (ch, startSample + sample,
                                    scratchBuffer.getSample (ch, sample) * scale);
        if (fastFadeSamplesRemaining > 0)
            --fastFadeSamplesRemaining;
    }

    if (fastFadeSamplesRemaining == 0)
    {
        fastFading = false;
        // Mark the voice idle so Synthesiser can re-allocate it. Skipping
        // tail-off means clearCurrentNote + adsr.reset() — clean exit, no
        // extra fade (we already faded ourselves).
        juce::SamplerVoice::stopNote (0.0f, false);
    }
}
