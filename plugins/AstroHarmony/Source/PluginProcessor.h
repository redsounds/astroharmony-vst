#pragma once

#include <atomic>
#include <juce_audio_processors/juce_audio_processors.h>

//==============================================================================
// AstroHarmony — Sub-phase A (skeleton).
// No DSP yet. Output is silent. APVTS exposes the 5 host-automatable params
// from .ideas/parameter-spec.md §1. AudioPlayHead is sampled per block and
// published to atomics for the editor's 30 Hz Timer to read.
//
// DSP (juce::Synthesiser, Sampler voices, Reverb) lands in Sub-phase D.
//==============================================================================
class AstroHarmonyAudioProcessor : public juce::AudioProcessor
{
public:
    AstroHarmonyAudioProcessor();
    ~AstroHarmonyAudioProcessor() override = default;

    //==========================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override;
    using AudioProcessor::processBlock;

    //==========================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==========================================================================
    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override  { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==========================================================================
    int getNumPrograms() override          { return 1; }
    int getCurrentProgram() override       { return 0; }
    void setCurrentProgram (int) override  {}
    const juce::String getProgramName (int) override                 { return {}; }
    void changeProgramName (int, const juce::String&) override       {}

    //==========================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    // Host-handled, sample-accurate bypass.
    juce::AudioProcessorParameter* getBypassParameter() const override { return bypassParameter; }

    //==========================================================================
    juce::AudioProcessorValueTreeState& getAPVTS() noexcept { return apvts; }

    // Read-only state published from the audio thread for the editor's Timer.
    std::atomic<float> hostBpm           { 0.0f };
    std::atomic<bool>  hostIsPlaying     { false };
    std::atomic<double> hostPpqPosition  { 0.0 };

    // Sub-phase A: placeholder fake beat for UI "playStateChanged" sanity test.
    // Replaced with real scheduler tick in Sub-phase D.
    std::atomic<int> currentBeatIndex { -1 };

    // Sub-phase C: opaque state blob round-tripped through DAW save/load.
    // Pushed from JS via pushState() native function; serialized into the
    // APVTS XML alongside the host-automatable params.
    juce::String getCustomStateBlob() const;
    void setCustomStateBlob (const juce::String& blob);

    // Monotonic counter bumped every time setCustomStateBlob() runs. The
    // editor's 30 Hz Timer polls this and re-hydrates JS when it changes,
    // which catches DAW preset switches that happen *while* the editor is
    // open (setStateInformation can fire on a live editor in some hosts).
    int getCustomStateBlobSerial() const noexcept { return customStateBlobSerial.load(); }

private:
    //==========================================================================
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    juce::AudioProcessorValueTreeState apvts;

    // Cached parameter pointers (atomic float*) — safe on the audio thread.
    std::atomic<float>* tempoParam          { nullptr };
    std::atomic<float>* masterVolumeParam   { nullptr };
    std::atomic<float>* pitchTransposeParam { nullptr };
    std::atomic<float>* loopParam           { nullptr };
    juce::AudioParameterBool* bypassParameter { nullptr };

    // Custom state blob storage. Lock protects the String; the serial is an
    // atomic int polled by the editor without taking the lock.
    juce::String customStateBlob;
    juce::CriticalSection customStateLock;
    std::atomic<int> customStateBlobSerial { 0 };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AstroHarmonyAudioProcessor)
};
