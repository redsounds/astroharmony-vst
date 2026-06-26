#include "SampleLibrary.h"
#include "SamplesData.h"

#include <juce_audio_formats/juce_audio_formats.h>

namespace
{
    void logToFile (const juce::String& msg)
    {
        auto path = juce::File::getSpecialLocation (juce::File::tempDirectory)
                        .getChildFile ("AstroHarmony.log");
        path.appendText (juce::Time::getCurrentTime().toString (true, true, true, true)
                         + " | [SampleLib] " + msg + "\n");
    }
}

//==============================================================================
// Sample map mirrors lib/instruments.ts in cinematic-composer. Keys are
// sharp-spelling ("Ds" = D#) so they match the on-disk filenames generated
// by the rename step in Sub-phase D.1.
//==============================================================================
const std::vector<SampleLibrary::InstrumentDef>& SampleLibrary::getDefinitions()
{
    static const std::vector<InstrumentDef> defs =
    {
        // Salamander Grand Piano (V3, CC0). Sparse map every ~3 semitones.
        { "piano", {
            { "A0", "A0" }, { "C1", "C1" }, { "Ds1", "Ds1" }, { "Fs1", "Fs1" }, { "A1", "A1" },
            { "C2", "C2" }, { "Ds2", "Ds2" }, { "Fs2", "Fs2" }, { "A2", "A2" },
            { "C3", "C3" }, { "Ds3", "Ds3" }, { "Fs3", "Fs3" }, { "A3", "A3" },
            { "C4", "C4" }, { "Ds4", "Ds4" }, { "Fs4", "Fs4" }, { "A4", "A4" },
            { "C5", "C5" }, { "Ds5", "Ds5" }, { "Fs5", "Fs5" }, { "A5", "A5" },
            { "C6", "C6" }, { "Ds6", "Ds6" }, { "Fs6", "Fs6" }, { "A6", "A6" },
            { "C7", "C7" }, { "Ds7", "Ds7" }, { "Fs7", "Fs7" }, { "A7", "A7" },
            { "C8", "C8" },
        }},
        // Flute
        { "flute", {
            { "C4", "C4" }, { "E4", "E4" }, { "Gs4", "Gs4" },
            { "C5", "C5" }, { "E5", "E5" }, { "Gs5", "Gs5" },
            { "C6", "C6" }, { "E6", "E6" }, { "Gs6", "Gs6" },
            { "C7", "C7" },
        }},
        // VSCO 2 CE Violin Section. Map keys live an octave above the source
        // notes (G3 → file G2.mp3) so playback sounds an octave lower than
        // requested for a warmer cinematic register.
        { "strings", {
            { "G3", "G2" }, { "A3", "A2" }, { "B3", "B2" },
            { "D4", "D3" }, { "Fs4", "Fs3" }, { "A4", "A3" },
            { "C5", "C4" }, { "E5", "E4" }, { "G5", "G4" }, { "B5", "B4" },
            { "D6", "D5" },
        }},
        // Trumpet
        { "trumpet", {
            { "Fs3", "Fs3" }, { "As3", "As3" },
            { "D4", "D4" }, { "Fs4", "Fs4" }, { "As4", "As4" },
            { "D5", "D5" }, { "Fs5", "Fs5" }, { "As5", "As5" },
            { "D6", "D6" },
        }},
    };
    return defs;
}

juce::StringArray SampleLibrary::getInstrumentIds()
{
    juce::StringArray ids;
    for (const auto& d : getDefinitions())
        ids.add (juce::String (d.id));
    return ids;
}

SampleLibrary::SampleLibrary() = default;

//==============================================================================
int SampleLibrary::midiNoteFromBaseName (const juce::String& baseName)
{
    // baseName forms: "C4", "Ds3" (= D#3), "Gs5" (= G#5), "As4" (= A#4).
    if (baseName.length() < 2) return 60;

    int idx = 0;
    const auto letter = baseName[idx++];
    int semitonesFromC = 0;
    switch ((int) letter)
    {
        case 'C': semitonesFromC = 0;  break;
        case 'D': semitonesFromC = 2;  break;
        case 'E': semitonesFromC = 4;  break;
        case 'F': semitonesFromC = 5;  break;
        case 'G': semitonesFromC = 7;  break;
        case 'A': semitonesFromC = 9;  break;
        case 'B': semitonesFromC = 11; break;
        default: return 60;
    }

    if (idx < baseName.length() && (baseName[idx] == 's' || baseName[idx] == 'S'))
    {
        semitonesFromC += 1;
        ++idx;
    }
    else if (idx < baseName.length() && baseName[idx] == 'b')
    {
        semitonesFromC -= 1;
        ++idx;
    }

    if (idx >= baseName.length()) return 60;
    const int octave = baseName.substring (idx).getIntValue();

    // MIDI 60 == C4. (Some hosts treat C3 == 60; we follow the Tone.js / VST3
    // convention used in the source app.)
    return (octave + 1) * 12 + semitonesFromC;
}

//==============================================================================
SampleLibrary::Sample
SampleLibrary::decodeSample (const juce::String& binaryDataName, int rootMidiNote)
{
    Sample s;
    s.rootMidiNote = rootMidiNote;

    int sizeBytes = 0;
    const auto* data = Samples::getNamedResource (binaryDataName.toRawUTF8(), sizeBytes);
    if (data == nullptr || sizeBytes <= 0)
    {
        logToFile ("MISS: " + binaryDataName + " (not in BinaryData)");
        return s;
    }

    auto inputStream = std::make_unique<juce::MemoryInputStream> (data, (size_t) sizeBytes, false);
    juce::MP3AudioFormat mp3;
    std::unique_ptr<juce::AudioFormatReader> reader (
        mp3.createReaderFor (inputStream.release(), true /* deleteStreamWhenDone */));

    if (reader == nullptr)
    {
        logToFile ("DECODE FAIL: " + binaryDataName + " (" + juce::String (sizeBytes) + " bytes)");
        return s;
    }

    const auto numSamples = (int) reader->lengthInSamples;
    if (numSamples <= 0)
    {
        logToFile ("ZERO LEN: " + binaryDataName);
        return s;
    }

    s.sourceSampleRate = reader->sampleRate > 0.0 ? reader->sampleRate : 44100.0;
    s.buffer = std::make_unique<juce::AudioBuffer<float>> (
        (int) juce::jmax<juce::uint32> (1u, reader->numChannels), numSamples);
    reader->read (s.buffer.get(), 0, numSamples, 0, true, true);
    return s;
}

//==============================================================================
// Decide which midi range a sample covers. Splits the keyboard between
// neighbouring sample roots: each sample covers from the midpoint to its
// own root, and from its own root to the midpoint of the next sample.
namespace
{
    void assignRanges (std::vector<SampleLibrary::Sample>& samples)
    {
        if (samples.empty()) return;

        std::sort (samples.begin(), samples.end(),
                   [] (const auto& a, const auto& b) { return a.rootMidiNote < b.rootMidiNote; });

        const int N = (int) samples.size();
        for (int i = 0; i < N; ++i)
        {
            const int prev = (i == 0) ? 0 : samples[i - 1].rootMidiNote;
            const int next = (i == N - 1) ? 127 : samples[i + 1].rootMidiNote;

            samples[i].rangeLowMidi  = (i == 0)     ? 0   : (prev + samples[i].rootMidiNote + 1) / 2;
            samples[i].rangeHighMidi = (i == N - 1) ? 127 : (samples[i].rootMidiNote + next) / 2;
        }
    }
}

//==============================================================================
const std::vector<SampleLibrary::Sample>&
SampleLibrary::getSamplesForInstrument (const juce::String& instrumentId)
{
    if (auto it = cache.find (instrumentId); it != cache.end())
        return it->second;

    std::vector<Sample> decoded;

    for (const auto& def : getDefinitions())
    {
        if (instrumentId != juce::String (def.id))
            continue;

        decoded.reserve (def.entries.size());
        for (const auto& entry : def.entries)
        {
            // BinaryData::getNamedResource looks up by mangled C++ symbol
            // name, not the original filename. CMake's juce_add_binary_data
            // turns "piano_A0.mp3" into the symbol "piano_A0_mp3" (dot →
            // underscore). Build the lookup string accordingly.
            const juce::String binaryName = juce::String (def.id) + "_"
                                          + juce::String (entry.fileBaseName) + "_mp3";
            const int rootMidi = midiNoteFromBaseName (entry.mapKey);

            auto sample = decodeSample (binaryName, rootMidi);
            if (sample.buffer != nullptr && sample.buffer->getNumSamples() > 0)
                decoded.push_back (std::move (sample));
        }
        break;
    }

    assignRanges (decoded);
    auto [it, inserted] = cache.emplace (instrumentId, std::move (decoded));
    return it->second;
}
