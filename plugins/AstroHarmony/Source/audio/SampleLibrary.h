#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>

#include <atomic>
#include <memory>
#include <unordered_map>
#include <vector>

//==============================================================================
// SampleLibrary — owns decoded sample buffers for all 4 sampled instruments.
//
// Samples live as MP3 blobs in BinaryData (namespace `Samples`, generated from
// plugins/AstroHarmony/Samples/<instrument>_<note>.mp3). On first access for
// a given instrument we decode every mp3 in its sample map into an
// AudioBuffer<float> + remember the root midi note. The SamplerEngine consumes
// these buffers to build juce::SamplerSound objects.
//
// Decoded buffers are cached for the plugin's lifetime — re-selecting an
// instrument that's been used before is instant. The piano set (~5 MB
// compressed, ~25 MB decoded at 44.1 kHz mono) is the heavy one; the others
// are <10 MB each.
//==============================================================================
class SampleLibrary
{
public:
    SampleLibrary();

    // One decoded sample: the audio data + the midi root note it should map to.
    struct Sample
    {
        std::unique_ptr<juce::AudioBuffer<float>> buffer;
        double sourceSampleRate { 44100.0 };
        int    rootMidiNote     { 60 };
        int    rangeLowMidi     { 0 };
        int    rangeHighMidi    { 127 };
    };

    // Returns the decoded sample list for the given instrument id
    // ("piano", "flute", "strings", "trumpet"). First call for an instrument
    // does the MP3 decode on the calling thread (typically the message
    // thread inside setActiveInstrument); subsequent calls hit the cache.
    // Empty vector if instrument id is unknown.
    const std::vector<Sample>& getSamplesForInstrument (const juce::String& instrumentId);

    // Returns the supported instrument ids in registration order.
    static juce::StringArray getInstrumentIds();

private:
    struct SampleMapEntry { const char* mapKey; const char* fileBaseName; };
    struct InstrumentDef
    {
        const char* id;
        std::vector<SampleMapEntry> entries;
    };

    static const std::vector<InstrumentDef>& getDefinitions();

    // Decode one MP3 file (`<binaryDataName>` looked up via Samples::getNamedResource).
    static Sample decodeSample (const juce::String& binaryDataName,
                                int rootMidiNote);

    // Convert "Ds3" / "Gs5" / "As4" / "C4" file-base names into the midi
    // root note. JS-friendly spellings use "s" instead of "#".
    static int midiNoteFromBaseName (const juce::String& baseName);

    std::unordered_map<juce::String, std::vector<Sample>> cache;
    juce::MP3AudioFormat mp3Format;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SampleLibrary)
};
