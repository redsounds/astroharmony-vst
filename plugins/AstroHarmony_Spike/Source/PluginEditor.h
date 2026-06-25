#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"

class AstroHarmonySpikeAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit AstroHarmonySpikeAudioProcessorEditor (AstroHarmonySpikeAudioProcessor&);
    ~AstroHarmonySpikeAudioProcessorEditor() override = default;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    AstroHarmonySpikeAudioProcessor& audioProcessor;

    // No relays / attachments for the spike — just WebView + one native function.
    std::unique_ptr<juce::WebBrowserComponent> webView;

    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AstroHarmonySpikeAudioProcessorEditor)
};
