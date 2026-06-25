#include "PluginProcessor.h"
#include "PluginEditor.h"

AstroHarmonySpikeAudioProcessor::AstroHarmonySpikeAudioProcessor()
    : AudioProcessor (BusesProperties()
                        .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                        .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{
}

bool AstroHarmonySpikeAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto mainOut = layouts.getMainOutputChannelSet();
    if (mainOut != juce::AudioChannelSet::mono() && mainOut != juce::AudioChannelSet::stereo())
        return false;
    return layouts.getMainInputChannelSet() == mainOut;
}

juce::AudioProcessorEditor* AstroHarmonySpikeAudioProcessor::createEditor()
{
    return new AstroHarmonySpikeAudioProcessorEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AstroHarmonySpikeAudioProcessor();
}
