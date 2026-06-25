#pragma once

#include <atomic>
#include <juce_audio_processors/juce_audio_processors.h>

class SimpleGainAudioProcessor  : public juce::AudioProcessor
{
public:
    SimpleGainAudioProcessor();
    ~SimpleGainAudioProcessor() override = default;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesProperties&) const = delete;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;

    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==============================================================================
    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override  { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==============================================================================
    int getNumPrograms() override          { return 1; }
    int getCurrentProgram() override       { return 0; }
    void setCurrentProgram (int) override  {}
    const juce::String getProgramName (int) override                  { return {}; }
    void changeProgramName (int, const juce::String&) override        {}

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    //==============================================================================
    // Host-handled, sample-accurate bypass — JUCE pulls this for the host.
    juce::AudioProcessorParameter* getBypassParameter() const override { return bypassParameter; }

    //==============================================================================
    juce::AudioProcessorValueTreeState& getAPVTS() noexcept { return apvts; }

    // Read-only meter state for the editor. Per-channel peak in dBFS (clamped to -60).
    std::atomic<float> meterPeakLeft  { -60.0f };
    std::atomic<float> meterPeakRight { -60.0f };

private:
    //==============================================================================
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    juce::AudioProcessorValueTreeState apvts;

    // Cached parameter pointers (atomic float* — safe on the audio thread).
    std::atomic<float>* inputGainDbParam  { nullptr };
    std::atomic<float>* outputTrimDbParam { nullptr };
    juce::AudioParameterBool* bypassParameter { nullptr };

    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedInputGainLin;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedOutputTrimLin;

    // Peak meter envelope state (linear amplitude, then converted to dBFS at the end).
    float meterEnvL { 0.0f };
    float meterEnvR { 0.0f };
    float meterReleaseCoeff { 0.0f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SimpleGainAudioProcessor)
};
