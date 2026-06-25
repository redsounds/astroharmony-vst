#include "PluginEditor.h"
#include "PluginProcessor.h"
#include "BinaryData.h"

#include <cstring>
#include <unordered_map>

//==============================================================================
SimpleGainAudioProcessorEditor::SimpleGainAudioProcessorEditor (SimpleGainAudioProcessor& p)
    : juce::AudioProcessorEditor (&p),
      audioProcessor (p)
{
    // ---- Attachments first (member init already created the relays) -------
    inputGainAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *audioProcessor.getAPVTS().getParameter (ParameterIDs::INPUT_GAIN),
        inputGainRelay);

    outputTrimAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *audioProcessor.getAPVTS().getParameter (ParameterIDs::OUTPUT_TRIM),
        outputTrimRelay);

    bypassAttachment = std::make_unique<juce::WebToggleButtonParameterAttachment> (
        *audioProcessor.getAPVTS().getParameter (ParameterIDs::BYPASS),
        bypassRelay);

    // ---- Create WebView (relays registered via .withOptionsFrom) -----------
    webView = std::make_unique<juce::WebBrowserComponent> (
        juce::WebBrowserComponent::Options{}
            .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options (
                juce::WebBrowserComponent::Options::WinWebView2{}
                    .withUserDataFolder (juce::File::getSpecialLocation (
                        juce::File::SpecialLocationType::tempDirectory)))
            .withNativeIntegrationEnabled()
            .withResourceProvider ([this] (const auto& url) { return getResource (url); })
            .withOptionsFrom (inputGainRelay)
            .withOptionsFrom (outputTrimRelay)
            .withOptionsFrom (bypassRelay));

    addAndMakeVisible (*webView);
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setSize (520, 260);

    // 30 Hz meter pump
    startTimerHz (30);
}

SimpleGainAudioProcessorEditor::~SimpleGainAudioProcessorEditor()
{
    stopTimer();
    // Members destroyed in reverse declaration order:
    //   1. attachments (first)
    //   2. webView     (middle)
    //   3. relays      (last)
}

//==============================================================================
void SimpleGainAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour::fromString ("FF101014"));
}

void SimpleGainAudioProcessorEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
}

//==============================================================================
void SimpleGainAudioProcessorEditor::timerCallback()
{
    if (webView == nullptr || ! webView->isVisible())
        return;

    const float peakL = audioProcessor.meterPeakLeft .load();
    const float peakR = audioProcessor.meterPeakRight.load();

    const juce::String js = "if (window.updateMeters) { window.updateMeters("
                          + juce::String (peakL, 2) + ", "
                          + juce::String (peakR, 2) + "); }";
    webView->evaluateJavascript (js);
}

//==============================================================================
// Resource provider — serves the embedded UI files via BinaryData iteration.
//==============================================================================
const char* SimpleGainAudioProcessorEditor::getMimeForExtension (const juce::String& extension)
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
        { "svg",  "image/svg+xml" }
    };

    const auto it = mimeMap.find (extension.toLowerCase());
    return it != mimeMap.end() ? it->second : "text/plain";
}

juce::String SimpleGainAudioProcessorEditor::getExtension (juce::String filename)
{
    return filename.fromLastOccurrenceOf (".", false, false);
}

std::optional<juce::WebBrowserComponent::Resource>
SimpleGainAudioProcessorEditor::getResource (const juce::String& url)
{
    // Normalise the URL down to a path like "index.html" or "js/juce/index.js".
    //
    // Subtle: on Windows JUCE's native code strips "https://juce.backend" (no
    // trailing slash) before invoking us — see juce_WebBrowserComponent_windows.cpp,
    // call to fromFirstOccurrenceOf("https://juce.backend", false, false). So the
    // URL we receive looks like "/js/index.js". `getResourceProviderRoot()` returns
    // "https://juce.backend/" *with* trailing slash, so doing fromFirstOccurrenceOf
    // on that would silently fall through to empty and route every request to
    // index.html. Strip the leading slash directly instead.
    auto resourcePath = url;
    if (resourcePath.startsWith ("https://juce.backend"))
        resourcePath = resourcePath.fromFirstOccurrenceOf ("https://juce.backend", false, false);
    while (resourcePath.startsWithChar ('/'))
        resourcePath = resourcePath.substring (1);
    if (resourcePath.isEmpty())
        resourcePath = "index.html";

    // Hardcoded path → BinaryData symbol mapping.
    // CMake mangles same-named files by appending a numeric suffix
    // ("index.js" appears twice → first is `index_js`, second is `index_js2`),
    // so the symbol names do NOT encode their source directory. We map by hand
    // to make the wiring obvious and avoid the collision footgun.
    const char* data = nullptr;
    int dataSize = 0;
    juce::String mime;

    if (resourcePath == "index.html")
    {
        data = BinaryData::index_html;
        dataSize = BinaryData::index_htmlSize;
        mime = "text/html";
    }
    else if (resourcePath == "js/index.js")
    {
        data = BinaryData::index_js;
        dataSize = BinaryData::index_jsSize;
        mime = "text/javascript";
    }
    else if (resourcePath == "js/juce/index.js")
    {
        data = BinaryData::index_js2;          // CMake-mangled — second index.js
        dataSize = BinaryData::index_js2Size;
        mime = "text/javascript";
    }
    else if (resourcePath == "js/juce/check_native_interop.js")
    {
        data = BinaryData::check_native_interop_js;
        dataSize = BinaryData::check_native_interop_jsSize;
        mime = "text/javascript";
    }

    if (data != nullptr && dataSize > 0)
    {
        std::vector<std::byte> bytes (static_cast<size_t> (dataSize));
        std::memcpy (bytes.data(), data, static_cast<size_t> (dataSize));
        return juce::WebBrowserComponent::Resource { std::move (bytes), std::move (mime) };
    }

    return std::nullopt;
}
