#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"
#include "ParameterIDs.hpp"

//==============================================================================
// AstroHarmony Editor — Sub-phase C (JS<->C++ bridge).
//
// CRITICAL: member declaration order MUST be:
//   1. Parameter relays           (destroyed LAST)
//   2. WebBrowserComponent        (destroyed MIDDLE)
//   3. Parameter attachments      (destroyed FIRST)
//
// Sub-phase C adds:
//   - Native functions:  requestInitialState, pushState, audio stubs,
//                        session stubs, exportMidi stub, getBuildInfo
//   - 30 Hz Timer push:  hostBpmChanged, playStateChanged, currentBeatChanged
//   - Live restore:      processor::stateBlobChanged is monitored so a DAW
//                        preset switch with the editor open re-hydrates JS.
//
// Audio (Sub-phase D), file-based sessions (E), host transport polish (F),
// and MIDI export (G) layer on top of this bridge without touching it.
//==============================================================================
class AstroHarmonyAudioProcessorEditor : public juce::AudioProcessorEditor,
                                         private juce::Timer
{
public:
    explicit AstroHarmonyAudioProcessorEditor (AstroHarmonyAudioProcessor&);
    ~AstroHarmonyAudioProcessorEditor() override;

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
    // Push-event de-dup state (so we don't spam emitEvent 30 times/sec with
    // identical payloads — JS gets a callback only when something changes).
    float  lastEmittedBpm        { -1.0f };
    bool   lastEmittedIsPlaying  { false };
    bool   firstEmitDone         { false };
    int    lastEmittedBeatIndex  { -2 };
    int    lastBlobSerial        { -1 };

    void timerCallback() override;
    void emitInitialBridgeState();
    void emitStateRestored();

    //==========================================================================
    // Resource provider
    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);
    static const char* getMimeForExtension (const juce::String& extension);
    static juce::String getExtension (juce::String filename);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AstroHarmonyAudioProcessorEditor)
};
