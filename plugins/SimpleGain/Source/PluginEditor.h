#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"
#include "ParameterIDs.hpp"

//==============================================================================
// SimpleGain Editor — JUCE 8 WebView2 integration.
//
// CRITICAL: Member declaration order MUST be:
//   1. Parameter relays           (destroyed LAST)
//   2. WebBrowserComponent        (destroyed MIDDLE)
//   3. Parameter attachments      (destroyed FIRST)
//
// WebView references the relays via .withOptionsFrom(); attachments reference
// both the relays and the host parameters. C++ destroys members in reverse
// declaration order, so this layout guarantees nothing accesses freed memory
// when the DAW unloads the plugin.
//
// See: .claude/troubleshooting/resolutions/webview-member-order-crash.md
//==============================================================================
class SimpleGainAudioProcessorEditor  : public juce::AudioProcessorEditor,
                                        public juce::Timer
{
public:
    explicit SimpleGainAudioProcessorEditor (SimpleGainAudioProcessor&);
    ~SimpleGainAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    void timerCallback() override;

private:
    SimpleGainAudioProcessor& audioProcessor;

    //==========================================================================
    // 1. PARAMETER RELAYS (declared first → destroyed last)
    juce::WebSliderRelay       inputGainRelay  { ParameterIDs::INPUT_GAIN };
    juce::WebSliderRelay       outputTrimRelay { ParameterIDs::OUTPUT_TRIM };
    juce::WebToggleButtonRelay bypassRelay     { ParameterIDs::BYPASS };

    // 2. WEBBROWSERCOMPONENT (declared middle → destroyed middle)
    std::unique_ptr<juce::WebBrowserComponent> webView;

    // 3. PARAMETER ATTACHMENTS (declared last → destroyed first)
    std::unique_ptr<juce::WebSliderParameterAttachment>       inputGainAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment>       outputTrimAttachment;
    std::unique_ptr<juce::WebToggleButtonParameterAttachment> bypassAttachment;

    //==========================================================================
    // Resource provider
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);
    static const char* getMimeForExtension (const juce::String& extension);
    static juce::String getExtension (juce::String filename);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SimpleGainAudioProcessorEditor)
};
