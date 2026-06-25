#include "PluginEditor.h"
#include "PluginProcessor.h"
#include "BinaryData.h"

#include <cstring>
#include <unordered_map>

//==============================================================================
AstroHarmonyAudioProcessorEditor::AstroHarmonyAudioProcessorEditor (AstroHarmonyAudioProcessor& p)
    : juce::AudioProcessorEditor (&p),
      audioProcessor (p)
{
    // ---- Create attachments first (matches CloudWash pattern that avoids the
    //      null-relay-pointer JUCE 8 footgun — attachments before WebView) ----
    auto& vts = audioProcessor.getAPVTS();

    tempoAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::TEMPO), tempoRelay);

    masterVolumeAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::MASTER_VOLUME), masterVolumeRelay);

    pitchTransposeAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::PITCH_TRANSPOSE), pitchTransposeRelay);

    loopAttachment = std::make_unique<juce::WebSliderParameterAttachment> (
        *vts.getParameter (ParameterIDs::LOOP), loopRelay);

    // ---- Create WebView with relays registered ----
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
            .withOptionsFrom (loopRelay));

    addAndMakeVisible (*webView);
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setSize (1280, 800);
    setResizable (true, true);
    setResizeLimits (960, 700, 1920, 1200);
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
// Resource provider — Sub-phase A serves a single placeholder HTML.
// Sub-phase B replaces the binary_data target with the Vite single-file bundle
// and this provider keeps serving "/" → index.html (no path-collision issues
// because vite-plugin-singlefile inlines everything into one HTML).
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
