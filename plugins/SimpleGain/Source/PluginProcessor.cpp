#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "ParameterIDs.hpp"

namespace
{
    constexpr float kParamMinDb = -60.0f;
    constexpr float kParamMaxDb =  12.0f;

    inline float dbToGain (float dB)
    {
        return juce::Decibels::decibelsToGain (dB, kParamMinDb);
    }
}

//==============================================================================
SimpleGainAudioProcessor::SimpleGainAudioProcessor()
    : AudioProcessor (BusesProperties()
                        .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                        .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "PARAMETERS", createParameterLayout())
{
    inputGainDbParam  = apvts.getRawParameterValue (ParameterIDs::INPUT_GAIN);
    outputTrimDbParam = apvts.getRawParameterValue (ParameterIDs::OUTPUT_TRIM);
    bypassParameter   = dynamic_cast<juce::AudioParameterBool*> (apvts.getParameter (ParameterIDs::BYPASS));
    jassert (bypassParameter != nullptr);
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout
SimpleGainAudioProcessor::createParameterLayout()
{
    using namespace juce;

    AudioProcessorValueTreeState::ParameterLayout layout;

    // Skewed range: small motions near 0 dB make fine adjustments.
    auto dbRange = NormalisableRange<float> (kParamMinDb, kParamMaxDb, 0.01f);
    dbRange.setSkewForCentre (0.0f);

    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::INPUT_GAIN,  1 },
        "Input Gain", dbRange, 0.0f,
        AudioParameterFloatAttributes().withLabel ("dB")));

    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::OUTPUT_TRIM, 1 },
        "Output Trim", dbRange, 0.0f,
        AudioParameterFloatAttributes().withLabel ("dB")));

    layout.add (std::make_unique<AudioParameterBool> (
        ParameterID { ParameterIDs::BYPASS, 1 },
        "Bypass", false));

    return layout;
}

//==============================================================================
void SimpleGainAudioProcessor::prepareToPlay (double sampleRate, int /*samplesPerBlock*/)
{
    constexpr double smoothingSeconds = 0.020; // 20 ms

    smoothedInputGainLin.reset  (sampleRate, smoothingSeconds);
    smoothedOutputTrimLin.reset (sampleRate, smoothingSeconds);

    smoothedInputGainLin .setCurrentAndTargetValue (dbToGain (inputGainDbParam ->load()));
    smoothedOutputTrimLin.setCurrentAndTargetValue (dbToGain (outputTrimDbParam->load()));

    // Meter envelope release: ~300 ms time constant.
    constexpr double releaseSeconds = 0.300;
    meterReleaseCoeff = static_cast<float> (std::exp (-1.0 / (releaseSeconds * sampleRate)));

    meterEnvL = 0.0f;
    meterEnvR = 0.0f;
    meterPeakLeft .store (-60.0f);
    meterPeakRight.store (-60.0f);
}

void SimpleGainAudioProcessor::releaseResources()
{
}

bool SimpleGainAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto mainOut = layouts.getMainOutputChannelSet();

    if (mainOut != juce::AudioChannelSet::mono()
        && mainOut != juce::AudioChannelSet::stereo())
        return false;

    return layouts.getMainInputChannelSet() == mainOut;
}

//==============================================================================
void SimpleGainAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                             juce::MidiBuffer& /*midi*/)
{
    juce::ScopedNoDenormals noDenormals;

    const int numChannels = buffer.getNumChannels();
    const int numSamples  = buffer.getNumSamples();

    if (numSamples == 0)
        return;

    // Clear any extra output channels that don't have input.
    for (int ch = getTotalNumInputChannels(); ch < getTotalNumOutputChannels(); ++ch)
        buffer.clear (ch, 0, numSamples);

    // If host is bypassing, JUCE handles the mux upstream when getBypassParameter() is provided.
    // But the host still calls processBlock() — we just leave the buffer untouched and decay the meter.
    if (bypassParameter != nullptr && bypassParameter->get())
    {
        meterEnvL *= std::pow (meterReleaseCoeff, static_cast<float> (numSamples));
        meterEnvR *= std::pow (meterReleaseCoeff, static_cast<float> (numSamples));
        meterPeakLeft .store (juce::Decibels::gainToDecibels (meterEnvL, -60.0f));
        meterPeakRight.store (juce::Decibels::gainToDecibels (meterEnvR, -60.0f));
        return;
    }

    smoothedInputGainLin .setTargetValue (dbToGain (inputGainDbParam ->load()));
    smoothedOutputTrimLin.setTargetValue (dbToGain (outputTrimDbParam->load()));

    float* const left  = buffer.getWritePointer (0);
    float* const right = (numChannels > 1) ? buffer.getWritePointer (1) : nullptr;

    for (int n = 0; n < numSamples; ++n)
    {
        const float inGain  = smoothedInputGainLin .getNextValue();
        const float outGain = smoothedOutputTrimLin.getNextValue();

        // Input gain
        float l = left[n] * inGain;
        float r = (right != nullptr) ? right[n] * inGain : l;

        // Meter tap — peak follower with release coefficient.
        const float absL = std::abs (l);
        const float absR = std::abs (r);
        meterEnvL = (absL > meterEnvL) ? absL : meterEnvL * meterReleaseCoeff;
        meterEnvR = (absR > meterEnvR) ? absR : meterEnvR * meterReleaseCoeff;

        // Output trim
        left[n] = l * outGain;
        if (right != nullptr) right[n] = r * outGain;
    }

    // Publish meter to UI (dBFS, clamped at -60).
    meterPeakLeft .store (juce::Decibels::gainToDecibels (meterEnvL, -60.0f));
    meterPeakRight.store (juce::Decibels::gainToDecibels (numChannels > 1 ? meterEnvR : meterEnvL, -60.0f));
}

//==============================================================================
juce::AudioProcessorEditor* SimpleGainAudioProcessor::createEditor()
{
    return new SimpleGainAudioProcessorEditor (*this);
}

//==============================================================================
void SimpleGainAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    if (auto state = apvts.copyState(); state.isValid())
        if (auto xml = state.createXml())
            copyXmlToBinary (*xml, destData);
}

void SimpleGainAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        if (xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new SimpleGainAudioProcessor();
}
