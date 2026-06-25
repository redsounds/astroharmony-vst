#include "PluginEditor.h"
#include "BinaryData.h"

#include <cstring>

AstroHarmonySpikeAudioProcessorEditor::AstroHarmonySpikeAudioProcessorEditor (AstroHarmonySpikeAudioProcessor& p)
    : juce::AudioProcessorEditor (&p),
      audioProcessor (p)
{
    webView = std::make_unique<juce::WebBrowserComponent> (
        juce::WebBrowserComponent::Options{}
            .withBackend (juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options (
                juce::WebBrowserComponent::Options::WinWebView2{}
                    .withUserDataFolder (juce::File::getSpecialLocation (
                        juce::File::SpecialLocationType::tempDirectory)))
            .withNativeIntegrationEnabled()
            .withResourceProvider ([this] (const auto& url) { return getResource (url); })
            .withNativeFunction (
                "echoBack",
                [] (const juce::Array<juce::var>& args,
                    juce::WebBrowserComponent::NativeFunctionCompletion complete)
                {
                    juce::String payload;
                    for (int i = 0; i < args.size(); ++i)
                    {
                        if (i > 0) payload << "|";
                        payload << args[i].toString();
                    }
                    juce::var result ("echo from C++: " + payload);
                    complete (result);
                }));

    addAndMakeVisible (*webView);
    webView->goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setSize (720, 480);
}

void AstroHarmonySpikeAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour::fromString ("FF1A1825"));
}

void AstroHarmonySpikeAudioProcessorEditor::resized()
{
    if (webView != nullptr)
        webView->setBounds (getLocalBounds());
}

// URL normalization — same lesson as SimpleGain: on Windows JUCE strips
// "https://juce.backend" (no trailing slash) before invoking us. Strip leading
// slash, then we only serve a single "index.html" since the bundle is one file.
std::optional<juce::WebBrowserComponent::Resource>
AstroHarmonySpikeAudioProcessorEditor::getResource (const juce::String& url)
{
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
