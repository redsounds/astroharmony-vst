#include "PluginEditor.h"
#include "PluginProcessor.h"
#include "BinaryData.h"
#include "ParameterIDs.hpp"

#include <cstring>
#include <unordered_map>

namespace
{
    // Build a juce::var DynamicObject from a brace-init list of {key, value}
    // pairs — handy for the request/response native functions below.
    juce::var makeObject (std::initializer_list<std::pair<const char*, juce::var>> items)
    {
        auto* obj = new juce::DynamicObject();
        for (const auto& kv : items)
            obj->setProperty (juce::Identifier (kv.first), kv.second);
        return juce::var (obj);
    }

    juce::var makeErrorObject (const juce::String& message)
    {
        return makeObject ({
            { "success", false },
            { "error",   juce::var (message) },
        });
    }
}

//==============================================================================
AstroHarmonyAudioProcessorEditor::AstroHarmonyAudioProcessorEditor (AstroHarmonyAudioProcessor& p)
    : juce::AudioProcessorEditor (&p),
      audioProcessor (p)
{
    // ---- Create attachments before WebView (CloudWash pattern) ----
    auto& vts = audioProcessor.getAPVTS();

    tempoAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::TEMPO), tempoRelay);

    masterVolumeAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::MASTER_VOLUME), masterVolumeRelay);

    pitchTransposeAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::PITCH_TRANSPOSE), pitchTransposeRelay);

    loopAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::LOOP), loopRelay);

    //==========================================================================
    // Native functions — JS calls these via Juce.getNativeFunction("name")(...).
    // Sub-phase C wires the contract; Sub-phases D/E/G fill in real audio,
    // session storage, and MIDI export. Stubs that report success/failure are
    // intentional — they let the JS UI run its full call paths now without
    // pretending the backing feature exists.
    //==========================================================================

    using NativeFnCompletion = juce::WebBrowserComponent::NativeFunctionCompletion;

    // ----- State sync -----
    auto requestInitialState = [this] (const juce::Array<juce::var>& /*args*/,
                                       NativeFnCompletion complete)
    {
        complete (juce::var (audioProcessor.getCustomStateBlob()));
    };

    auto pushState = [this] (const juce::Array<juce::var>& args,
                             NativeFnCompletion complete)
    {
        if (args.size() >= 1)
            audioProcessor.setCustomStateBlob (args[0].toString());

        // Skip the serial we just bumped so our own Timer doesn't echo this
        // back to JS as a "state restored" event.
        lastBlobSerial = audioProcessor.getCustomStateBlobSerial();

        complete (juce::var (true));
    };

    // ----- Audio control (real impls in Sub-phase D) -----
    auto playChord = [] (const juce::Array<juce::var>& /*args*/,
                         NativeFnCompletion complete)
    {
        // Sub-phase D: trigger one-shot chord through Synthesiser.
        complete (juce::var (true));
    };

    auto playProgression = [] (const juce::Array<juce::var>& /*args*/,
                               NativeFnCompletion complete)
    {
        // Sub-phase D: start scheduler.
        complete (juce::var (true));
    };

    auto stopAll = [] (const juce::Array<juce::var>& /*args*/,
                       NativeFnCompletion complete)
    {
        // Sub-phase D: stop scheduler, release all voices.
        complete (juce::var (true));
    };

    auto setInstrument = [] (const juce::Array<juce::var>& /*args*/,
                             NativeFnCompletion complete)
    {
        // Sub-phase D: swap active sampler sound set.
        complete (juce::var (true));
    };

    // ----- Sessions (real impl in Sub-phase E) -----
    auto listSessions = [] (const juce::Array<juce::var>& /*args*/,
                            NativeFnCompletion complete)
    {
        complete (juce::var (juce::Array<juce::var>{})); // empty array for now
    };

    auto loadSession = [] (const juce::Array<juce::var>& /*args*/,
                           NativeFnCompletion complete)
    {
        complete (makeErrorObject ("sessions not implemented yet"));
    };

    auto saveCurrentSession = [] (const juce::Array<juce::var>& /*args*/,
                                  NativeFnCompletion complete)
    {
        complete (makeErrorObject ("sessions not implemented yet"));
    };

    auto deleteSession = [] (const juce::Array<juce::var>& /*args*/,
                             NativeFnCompletion complete)
    {
        complete (makeErrorObject ("sessions not implemented yet"));
    };

    auto renameSession = [] (const juce::Array<juce::var>& /*args*/,
                             NativeFnCompletion complete)
    {
        complete (makeErrorObject ("sessions not implemented yet"));
    };

    auto duplicateSession = [] (const juce::Array<juce::var>& /*args*/,
                                NativeFnCompletion complete)
    {
        complete (makeErrorObject ("sessions not implemented yet"));
    };

    // ----- MIDI export (real impl in Sub-phase G) -----
    auto exportMidi = [] (const juce::Array<juce::var>& /*args*/,
                          NativeFnCompletion complete)
    {
        complete (makeErrorObject ("midi export not implemented yet"));
    };

    // ----- Diagnostics -----
    auto getBuildInfo = [this] (const juce::Array<juce::var>& /*args*/,
                                NativeFnCompletion complete)
    {
        complete (makeObject ({
            { "version",     juce::var (juce::String (JUCE_STRINGIFY (JucePlugin_VersionString))) },
            { "buildDate",   juce::var (juce::String (__DATE__) + " " + juce::String (__TIME__)) },
            { "juceVersion", juce::var (juce::SystemStats::getJUCEVersion()) },
            { "sampleRate",  juce::var (audioProcessor.getSampleRate()) },
            { "subPhase",    juce::var (juce::String ("C")) },
        }));
    };

    //==========================================================================
    // Create WebView with everything registered.
    webView = std::make_unique<juce::WebBrowserComponent> (
        juce::WebBrowserComponent::Options{}
            .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options (
                juce::WebBrowserComponent::Options::WinWebView2{}
                    .withUserDataFolder (juce::File::getSpecialLocation (
                        juce::File::SpecialLocationType::tempDirectory)))
            .withNativeIntegrationEnabled()
            .withResourceProvider ([this] (const auto& url) { return getResource (url); })
            .withOptionsFrom (tempoRelay)
            .withOptionsFrom (masterVolumeRelay)
            .withOptionsFrom (pitchTransposeRelay)
            .withOptionsFrom (loopRelay)
            .withNativeFunction ("requestInitialState",  std::move (requestInitialState))
            .withNativeFunction ("pushState",            std::move (pushState))
            .withNativeFunction ("playChord",            std::move (playChord))
            .withNativeFunction ("playProgression",      std::move (playProgression))
            .withNativeFunction ("stopAll",              std::move (stopAll))
            .withNativeFunction ("setInstrument",        std::move (setInstrument))
            .withNativeFunction ("listSessions",         std::move (listSessions))
            .withNativeFunction ("loadSession",          std::move (loadSession))
            .withNativeFunction ("saveCurrentSession",   std::move (saveCurrentSession))
            .withNativeFunction ("deleteSession",        std::move (deleteSession))
            .withNativeFunction ("renameSession",        std::move (renameSession))
            .withNativeFunction ("duplicateSession",     std::move (duplicateSession))
            .withNativeFunction ("exportMidi",           std::move (exportMidi))
            .withNativeFunction ("getBuildInfo",         std::move (getBuildInfo)));

    addAndMakeVisible (*webView);
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setSize (1280, 800);
    setResizable (true, true);
    setResizeLimits (960, 700, 1920, 1200);

    // Seed the blob-serial baseline so the first Timer tick doesn't fire a
    // spurious stateRestored (the editor's initial render uses
    // requestInitialState directly).
    lastBlobSerial = audioProcessor.getCustomStateBlobSerial();

    startTimerHz (30);
}

AstroHarmonyAudioProcessorEditor::~AstroHarmonyAudioProcessorEditor()
{
    stopTimer();
}

//==============================================================================
void AstroHarmonyAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour::fromString ("FF0A0A14"));  // --cc-bg-deep
}

void AstroHarmonyAudioProcessorEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
}

//==============================================================================
// 30 Hz push-event pipeline. Only emits when a value actually changes — JS
// receives one event per transition, not 30 redundant events per second.
void AstroHarmonyAudioProcessorEditor::timerCallback()
{
    if (webView == nullptr)
        return;

    const float currentBpm    = audioProcessor.hostBpm.load (std::memory_order_acquire);
    const bool  isHostPlaying = audioProcessor.hostIsPlaying.load (std::memory_order_acquire);
    const int   beatIndex     = audioProcessor.currentBeatIndex.load (std::memory_order_acquire);
    const int   blobSerial    = audioProcessor.getCustomStateBlobSerial();

    // hostBpmChanged — fires on first tick + whenever BPM crosses a 0.05 BPM
    // delta or the play state flips. (Float compare with small epsilon so we
    // don't spam JS on tiny drift in hosts that report e.g. 119.9997.)
    const bool bpmChanged   = std::abs (currentBpm - lastEmittedBpm) > 0.05f;
    const bool playChanged  = isHostPlaying != lastEmittedIsPlaying;

    if (! firstEmitDone || bpmChanged || playChanged)
    {
        webView->emitEventIfBrowserIsVisible ("hostBpmChanged",
            makeObject ({
                { "bpm",           juce::var (currentBpm) },
                { "isHostPlaying", juce::var (isHostPlaying) },
            }));
        lastEmittedBpm = currentBpm;
    }

    // playStateChanged — emit when host transport flips.
    if (! firstEmitDone || playChanged)
    {
        webView->emitEventIfBrowserIsVisible ("playStateChanged",
            makeObject ({
                { "isPlaying", juce::var (isHostPlaying) },
                { "mode",      juce::var (juce::String (isHostPlaying ? "host" : "standalone")) },
            }));
        lastEmittedIsPlaying = isHostPlaying;
    }

    // currentBeatChanged — only when the scheduler moves to a new beat
    // (Sub-phase D drives this; for now beatIndex stays at -1).
    if (beatIndex != lastEmittedBeatIndex)
    {
        webView->emitEventIfBrowserIsVisible ("currentBeatChanged",
            makeObject ({
                { "index", juce::var (beatIndex) },
            }));
        lastEmittedBeatIndex = beatIndex;
    }

    // stateRestored — DAW called setStateInformation while the editor is
    // alive (preset switch). Push the new blob so JS re-hydrates its store.
    if (blobSerial != lastBlobSerial)
    {
        webView->emitEventIfBrowserIsVisible ("stateRestored",
            makeObject ({
                { "blob", juce::var (audioProcessor.getCustomStateBlob()) },
            }));
        lastBlobSerial = blobSerial;
    }

    firstEmitDone = true;
}

//==============================================================================
// MIME helpers — used by the resource provider.
const char* AstroHarmonyAudioProcessorEditor::getMimeForExtension (const juce::String& extension)
{
    static const std::unordered_map<juce::String, const char*> mimeMap =
    {
        { "html", "text/html" },
        { "css",  "text/css" },
        { "js",   "text/javascript" },
        { "mjs",  "text/javascript" },
        { "json", "application/json" },
        { "png",  "image/png" },
        { "jpg",  "image/jpeg" },
        { "jpeg", "image/jpeg" },
        { "svg",  "image/svg+xml" },
        { "woff", "font/woff" },
        { "woff2","font/woff2" },
    };
    const auto it = mimeMap.find (extension.toLowerCase());
    return it != mimeMap.end() ? it->second : "text/plain";
}

juce::String AstroHarmonyAudioProcessorEditor::getExtension (juce::String filename)
{
    return filename.fromLastOccurrenceOf (".", false, false);
}

//==============================================================================
// Resource provider — single-file bundle from vite-plugin-singlefile. The
// resource provider sees one URL only ("index.html") because everything is
// inlined into that one HTML.
std::optional<juce::WebBrowserComponent::Resource>
AstroHarmonyAudioProcessorEditor::getResource (const juce::String& url)
{
    // JUCE Windows native strips "https://juce.backend" (no trailing slash)
    // before invoking us. Normalize to a leading-slash-less path.
    auto path = url;
    if (path.startsWith ("https://juce.backend"))
        path = path.fromFirstOccurrenceOf ("https://juce.backend", false, false);
    while (path.startsWithChar ('/'))
        path = path.substring (1);
    if (path.isEmpty())
        path = "index.html";

    if (path == "index.html")
    {
        std::vector<std::byte> bytes (static_cast<size_t> (BinaryData::index_htmlSize));
        std::memcpy (bytes.data(),
                     BinaryData::index_html,
                     static_cast<size_t> (BinaryData::index_htmlSize));
        return juce::WebBrowserComponent::Resource { std::move (bytes), juce::String { "text/html" } };
    }

    return std::nullopt;
}
