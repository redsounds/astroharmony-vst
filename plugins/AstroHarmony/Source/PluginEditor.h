#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"
#include "ParameterIDs.hpp"

//==============================================================================
// AstroHarmony Editor — Sub-phase A scaffold.
//
// CRITICAL: member declaration order MUST be:
//   1. Parameter relays           (destroyed LAST)
//   2. WebBrowserComponent        (destroyed MIDDLE)
//   3. Parameter attachments      (destroyed FIRST)
//
// Sub-phase C will add native functions (playChord, pushState, sessions, etc.)
// and the 30 Hz Timer emit pipeline. Sub-phase A only sets up the bare WebView
// + relays so the design phase's "placeholder visible in DAW" gate passes.
//==============================================================================
class AstroHarmonyAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit AstroHarmonyAudioProcessorEditor (AstroHarmonyAudioProcessor&);
    ~AstroHarmonyAudioProcessorEditor() override = default;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    AstroHarmonyAudioProcessor& audioProcessor;

    //==========================================================================
    // 1. PARAMETER RELAYS (declared first → destroyed last)
    juce::WebSliderRelay tempoRelay          { ParameterIDs::TEMPO };
    juce::WebSliderRelay masterVolumeRelay   { ParameterIDs::MASTER_VOLUME };
    juce::WebSliderRelay pitchTransposeRelay { ParameterIDs::PITCH_TRANSPOSE };
    juce::WebSliderRelay loopRelay           { ParameterIDs::LOOP };

    // 2. WEBBROWSERCOMPONENT (declared middle → destroyed middle)
    std::unique_ptr<juce::WebBrowserComponent> webView;

    // 3. PARAMETER ATTACHMENTS (declared last → destroyed first)
    std::unique_ptr<juce::WebSliderParameterAttachment> tempoAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> masterVolumeAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> pitchTransposeAttachment;
    std::unique_ptr<juce::WebSliderParameterAttachment> loopAttachment;

    //==========================================================================
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);
    static const char* getMimeForExtension (const juce::String& extension);
    static juce::String getExtension (juce::String filename);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AstroHarmonyAudioProcessorEditor)
};
