#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "ParameterIDs.hpp"

//==============================================================================
AstroHarmonyAudioProcessor::AstroHarmonyAudioProcessor()
    : AudioProcessor (BusesProperties()
                        .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "PARAMETERS", createParameterLayout())
{
    tempoParam          = apvts.getRawParameterValue (ParameterIDs::TEMPO);
    masterVolumeParam   = apvts.getRawParameterValue (ParameterIDs::MASTER_VOLUME);
    pitchTransposeParam = apvts.getRawParameterValue (ParameterIDs::PITCH_TRANSPOSE);
    loopParam           = apvts.getRawParameterValue (ParameterIDs::LOOP);
    bypassParameter     = dynamic_cast<juce::AudioParameterBool*> (apvts.getParameter (ParameterIDs::BYPASS));
    jassert (bypassParameter != nullptr);
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout
AstroHarmonyAudioProcessor::createParameterLayout()
{
    using namespace juce;
    AudioProcessorValueTreeState::ParameterLayout layout;

    // tempo: 40-200 BPM, linear, default 100
    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::TEMPO, 1 },
        "Tempo",
        NormalisableRange<float> (40.0f, 200.0f, 0.1f),
        100.0f,
        AudioParameterFloatAttributes().withLabel ("BPM")));

    // master_volume: 0-100 %, linear (perceptual mapping done downstream), default 80
    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::MASTER_VOLUME, 1 },
        "Master Volume",
        NormalisableRange<float> (0.0f, 100.0f, 0.1f),
        80.0f,
        AudioParameterFloatAttributes().withLabel ("%")));

    // pitch_transpose: -12 to +12 semitones, default 0
    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::PITCH_TRANSPOSE, 1 },
        "Pitch Transpose",
        NormalisableRange<float> (-12.0f, 12.0f, 1.0f),
        0.0f,
        AudioParameterFloatAttributes().withLabel ("st")));

    // loop: bool, default false. Modeled as Float (0/1) so the WebSliderRelay can
    // sit alongside the float relays without a separate toggle path. (Could switch
    // to AudioParameterBool + WebToggleButtonRelay later if a DAW shows it ugly.)
    layout.add (std::make_unique<AudioParameterFloat> (
        ParameterID { ParameterIDs::LOOP, 1 },
        "Loop",
        NormalisableRange<float> (0.0f, 1.0f, 1.0f),
        0.0f));

    // bypass: bool, host-handled via getBypassParameter()
    layout.add (std::make_unique<AudioParameterBool> (
        ParameterID { ParameterIDs::BYPASS, 1 },
        "Bypass", false));

    return layout;
}

//==============================================================================
void AstroHarmonyAudioProcessor::prepareToPlay (double /*sampleRate*/, int /*samplesPerBlock*/)
{
    // Sub-phase A: nothing to prepare. Synthesiser/Reverb come in Sub-phase D.
    hostBpm.store (0.0f);
    hostIsPlaying.store (false);
    hostPpqPosition.store (0.0);
    currentBeatIndex.store (-1);
}

void AstroHarmonyAudioProcessor::releaseResources()
{
}

bool AstroHarmonyAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto mainOut = layouts.getMainOutputChannelSet();
    return mainOut == juce::AudioChannelSet::mono()
        || mainOut == juce::AudioChannelSet::stereo();
}

//==============================================================================
void AstroHarmonyAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                               juce::MidiBuffer& /*midi*/)
{
    juce::ScopedNoDenormals noDenormals;

    const int numSamples = buffer.getNumSamples();
    if (numSamples == 0)
        return;

    // No DSP yet — output silence. Clear all output channels.
    buffer.clear();

    // Read host transport for the editor's Timer to surface (Sub-phase C wires
    // the actual JS event, but the atomics are populated from day one so the
    // path is exercised).
    if (auto* playHead = getPlayHead())
    {
        if (auto pos = playHead->getPosition())
        {
            if (auto bpm = pos->getBpm())
                hostBpm.store (static_cast<float> (*bpm));

            hostIsPlaying.store (pos->getIsPlaying());

            if (auto ppq = pos->getPpqPosition())
                hostPpqPosition.store (*ppq);
        }
    }
}

//==============================================================================
juce::AudioProcessorEditor* AstroHarmonyAudioProcessor::createEditor()
{
    return new AstroHarmonyAudioProcessorEditor (*this);
}

//==============================================================================
// Custom state blob — opaque JSON pushed by JS via pushState() native fn.
juce::String AstroHarmonyAudioProcessor::getCustomStateBlob() const
{
    const juce::ScopedLock sl (customStateLock);
    return customStateBlob;
}

void AstroHarmonyAudioProcessor::setCustomStateBlob (const juce::String& blob)
{
    {
        const juce::ScopedLock sl (customStateLock);
        customStateBlob = blob;
    }
    customStateBlobSerial.fetch_add (1, std::memory_order_release);
}

//==============================================================================
// State persistence: APVTS XML + custom state blob in one ValueTree, written
// to MemoryBlock. The blob is a string (JSON from JS side), wrapped in its
// own <CustomState> child so it never collides with APVTS internals.
void AstroHarmonyAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto root = juce::ValueTree ("AstroHarmonyState");
    root.appendChild (apvts.copyState(), nullptr);

    juce::ValueTree custom ("CustomState");
    custom.setProperty ("blob", getCustomStateBlob(), nullptr);
    root.appendChild (custom, nullptr);

    if (auto xml = root.createXml())
        copyXmlToBinary (*xml, destData);
}

void AstroHarmonyAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    auto xml = getXmlFromBinary (data, sizeInBytes);
    if (xml == nullptr) return;

    auto root = juce::ValueTree::fromXml (*xml);
    if (! root.isValid() || root.getType() != juce::Identifier ("AstroHarmonyState"))
        return;

    if (auto apvtsChild = root.getChildWithName (apvts.state.getType()); apvtsChild.isValid())
        apvts.replaceState (apvtsChild);

    if (auto customChild = root.getChildWithName ("CustomState"); customChild.isValid())
        setCustomStateBlob (customChild.getProperty ("blob", juce::var()).toString());
}

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AstroHarmonyAudioProcessor();
}
