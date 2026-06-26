#include "PluginEditor.h"
#include "PluginProcessor.h"
#include "BinaryData.h"
#include "ParameterIDs.hpp"
#include "audio/SamplerEngine.h"
#include "audio/Scheduler.h"

#include <cstring>
#include <unordered_map>
#include <vector>

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

    // Parse note strings used by the UI ("C4", "Eb3", "F#5", "Bb2") into
    // MIDI numbers. Sharp-letter spellings are produced by lib/theory.ts /
    // lib/voicings.ts. We accept both "#" and "s" + both "b" flat spellings.
    int midiFromNoteString (const juce::String& note)
    {
        if (note.isEmpty()) return 60;

        int idx = 0;
        const auto letter = juce::CharacterFunctions::toUpperCase (note[idx++]);
        int semis = 0;
        switch (letter)
        {
            case 'C': semis = 0;  break;
            case 'D': semis = 2;  break;
            case 'E': semis = 4;  break;
            case 'F': semis = 5;  break;
            case 'G': semis = 7;  break;
            case 'A': semis = 9;  break;
            case 'B': semis = 11; break;
            default: return 60;
        }

        // Accidental
        if (idx < note.length())
        {
            const auto c = note[idx];
            if (c == '#' || c == 's' || c == 'S') { semis += 1; ++idx; }
            else if (c == 'b' || c == 'B')        { semis -= 1; ++idx; }
        }

        if (idx >= note.length()) return 60;
        const int octave = note.substring (idx).getIntValue();
        return juce::jlimit (0, 127, (octave + 1) * 12 + semis);
    }

    std::vector<int> midiFromVarArray (const juce::var& v, int transposeSemis)
    {
        std::vector<int> out;
        if (! v.isArray()) return out;
        if (auto* arr = v.getArray())
        {
            out.reserve ((size_t) arr->size());
            for (const auto& el : *arr)
                out.push_back (juce::jlimit (0, 127, midiFromNoteString (el.toString()) + transposeSemis));
        }
        return out;
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

    // ----- Audio control -----
    auto playChord = [this] (const juce::Array<juce::var>& args,
                             NativeFnCompletion complete)
    {
        // args: [ notes: string[], inversion?, drop2?, voicingType? ]
        // The JS side has already applied voicing — we only need the note
        // strings. Transpose is read from APVTS so DAW automation flows.
        const int transpose = (int) std::lround (
            audioProcessor.getAPVTS().getRawParameterValue (ParameterIDs::PITCH_TRANSPOSE)->load());

        auto notes = args.size() >= 1 ? midiFromVarArray (args[0], transpose) : std::vector<int>{};
        if (! notes.empty())
        {
            // Exclusive playback: explicitly release the previous chord
            // before starting the new one. The release envelope (~120 ms,
            // see SamplerEngine::envelopeFor) fades the old chord smoothly
            // so the cutoff doesn't click.
            //
            // 800 ms auto-release on the new chord — without it, sustained
            // instruments (and the natural piano decay) ring for the full
            // sample length (5-10 s) which feels droning for chord-by-chord
            // preview. With the 120 ms release tail layered on top, the
            // perceived total is ~900 ms — fast enough to feel responsive
            // when auditioning chords, slow enough that the chord registers.
            audioProcessor.getSamplerEngine().stopAll();
            audioProcessor.getSamplerEngine().playChord (notes, 0.85f, 800);
        }
        complete (juce::var (true));
    };

    auto playProgression = [this] (const juce::Array<juce::var>& args,
                                   NativeFnCompletion complete)
    {
        // args: [ progression: ChordEntry[], loop: bool ]
        // ChordEntry: { notes: string[], bars: number, ... }
        const int transpose = (int) std::lround (
            audioProcessor.getAPVTS().getRawParameterValue (ParameterIDs::PITCH_TRANSPOSE)->load());

        std::vector<Scheduler::ChordEntry> chords;
        if (args.size() >= 1 && args[0].isArray())
        {
            if (auto* arr = args[0].getArray())
            {
                chords.reserve ((size_t) arr->size());
                for (const auto& entry : *arr)
                {
                    Scheduler::ChordEntry c;
                    const auto notesVar = entry.getProperty ("notes", juce::var());
                    c.midiNotes = midiFromVarArray (notesVar, transpose);
                    const auto barsVar = entry.getProperty ("bars", juce::var (1.0));
                    c.bars = (float) (double) barsVar;
                    if (! c.midiNotes.empty())
                        chords.push_back (std::move (c));
                }
            }
        }

        const bool loop = args.size() >= 2 && bool (args[1]);

        auto& scheduler = audioProcessor.getScheduler();
        scheduler.stop();
        scheduler.setProgression (std::move (chords));
        scheduler.setLooping (loop);
        scheduler.start();
        complete (juce::var (true));
    };

    auto stopAll = [this] (const juce::Array<juce::var>& /*args*/,
                           NativeFnCompletion complete)
    {
        audioProcessor.getScheduler().stop();
        audioProcessor.getSamplerEngine().stopAll();
        complete (juce::var (true));
    };

    auto setInstrument = [this] (const juce::Array<juce::var>& args,
                                 NativeFnCompletion complete)
    {
        if (args.size() >= 1)
        {
            const auto id = args[0].toString();
            audioProcessor.getSamplerEngine().stopAll();
            audioProcessor.getSamplerEngine().setActiveInstrument (id);
        }
        complete (juce::var (true));
    };

    // ----- APVTS pokes from the UI (so DAW automation flows both ways) -----
    // The UI sliders haven't been migrated to JUCE's getSliderState yet — for
    // now JS calls these tiny native fns when a host-automatable value
    // changes, and we write the value into APVTS via setValueNotifyingHost.
    // The audio engine reads APVTS directly so DAW automation also works.
    // (Sub-phase G can switch the UI sliders to direct relay binding for
    // bidirectional DAW->UI updates.)
    auto pokeParam = [this] (const juce::String& paramId, float scaledValue)
    {
        if (auto* p = audioProcessor.getAPVTS().getParameter (paramId))
        {
            const auto& range = audioProcessor.getAPVTS().getParameterRange (paramId);
            p->setValueNotifyingHost (range.convertTo0to1 (scaledValue));
        }
    };

    auto setTempoBpm = [this, pokeParam] (const juce::Array<juce::var>& args,
                                          NativeFnCompletion complete)
    {
        if (args.size() >= 1) pokeParam (ParameterIDs::TEMPO, (float) (double) args[0]);
        complete (juce::var (true));
    };

    auto setMasterVolumePercent = [this, pokeParam] (const juce::Array<juce::var>& args,
                                                     NativeFnCompletion complete)
    {
        if (args.size() >= 1) pokeParam (ParameterIDs::MASTER_VOLUME, (float) (double) args[0]);
        complete (juce::var (true));
    };

    auto setTransposeSemis = [this, pokeParam] (const juce::Array<juce::var>& args,
                                                NativeFnCompletion complete)
    {
        if (args.size() >= 1) pokeParam (ParameterIDs::PITCH_TRANSPOSE, (float) (double) args[0]);
        complete (juce::var (true));
    };

    auto setLoopEnabled = [this, pokeParam] (const juce::Array<juce::var>& args,
                                             NativeFnCompletion complete)
    {
        if (args.size() >= 1) pokeParam (ParameterIDs::LOOP, bool (args[0]) ? 1.0f : 0.0f);
        complete (juce::var (true));
    };

    // ----- Sessions (Sub-phase E — backed by SessionStore on %APPDATA%) -----
    auto listSessions = [this] (const juce::Array<juce::var>& /*args*/,
                                NativeFnCompletion complete)
    {
        complete (sessionStore.listSessions());
    };

    auto loadSession = [this] (const juce::Array<juce::var>& args,
                               NativeFnCompletion complete)
    {
        if (args.size() < 1) { complete (makeErrorObject ("missing id")); return; }
        const auto record = sessionStore.loadSession (args[0].toString());
        if (record.hasProperty ("error"))
        {
            complete (record);
            return;
        }
        // Mirror the loaded data into the processor's cached blob so a
        // subsequent DAW save captures the just-loaded state.
        const auto data = record.getProperty ("data", juce::var());
        if (data.isObject())
            audioProcessor.setCustomStateBlob (juce::JSON::toString (data));
        complete (record);
    };

    auto saveCurrentSession = [this] (const juce::Array<juce::var>& args,
                                      NativeFnCompletion complete)
    {
        // args: [ id?: string, name?: string, blob: string ]
        // The blob is the full JSON state from the JS side — same shape
        // pushState uses. If id is empty a new session is created; if it
        // matches an existing file the file is overwritten in place.
        const juce::String id   = args.size() >= 1 ? args[0].toString() : juce::String();
        const juce::String name = args.size() >= 2 ? args[1].toString() : juce::String();
        const juce::String blob = args.size() >= 3 ? args[2].toString() : juce::String();
        complete (sessionStore.saveSession (id, name, blob));
    };

    auto deleteSession = [this] (const juce::Array<juce::var>& args,
                                 NativeFnCompletion complete)
    {
        if (args.size() < 1) { complete (makeErrorObject ("missing id")); return; }
        const bool ok = sessionStore.deleteSession (args[0].toString());
        complete (makeObject ({ { "success", ok } }));
    };

    auto renameSession = [this] (const juce::Array<juce::var>& args,
                                 NativeFnCompletion complete)
    {
        if (args.size() < 2) { complete (makeErrorObject ("missing id/name")); return; }
        const bool ok = sessionStore.renameSession (args[0].toString(), args[1].toString());
        complete (makeObject ({ { "success", ok } }));
    };

    auto duplicateSession = [this] (const juce::Array<juce::var>& args,
                                    NativeFnCompletion complete)
    {
        if (args.size() < 1) { complete (makeErrorObject ("missing id")); return; }
        complete (sessionStore.duplicateSession (args[0].toString()));
    };

    // ----- MIDI export (Sub-phase G) -----
    // args[0] = number[] (Uint8Array spread into a plain array on the JS
    //           side because the JUCE bridge marshals via JSON and doesn't
    //           preserve typed arrays).
    // args[1] = suggested filename without extension.
    auto exportMidi = [this] (const juce::Array<juce::var>& args,
                              NativeFnCompletion complete)
    {
        if (args.size() < 1 || ! args[0].isArray())
        {
            complete (makeErrorObject ("missing bytes"));
            return;
        }

        auto* arr = args[0].getArray();
        if (arr == nullptr || arr->isEmpty())
        {
            complete (makeErrorObject ("empty bytes"));
            return;
        }

        const juce::String suggestedNameRaw = args.size() >= 2 ? args[1].toString() : juce::String ("astroharmony");
        const auto suggestedName = suggestedNameRaw.isNotEmpty() ? suggestedNameRaw : juce::String ("astroharmony");

        // Copy bytes into a MemoryBlock now so the FileChooser callback can
        // capture them safely.
        juce::MemoryBlock bytes;
        bytes.setSize ((size_t) arr->size(), false);
        auto* dst = static_cast<juce::uint8*> (bytes.getData());
        for (int i = 0; i < arr->size(); ++i)
            dst[i] = (juce::uint8) ((int) (*arr)[i] & 0xFF);

        const auto defaultDir = juce::File::getSpecialLocation (
            juce::File::SpecialLocationType::userMusicDirectory);
        const auto initialFile = defaultDir.getChildFile (suggestedName + ".mid");

        auto chooser = std::make_shared<juce::FileChooser> (
            "Export MIDI", initialFile, "*.mid");

        const int flags = juce::FileBrowserComponent::saveMode
                        | juce::FileBrowserComponent::canSelectFiles
                        | juce::FileBrowserComponent::warnAboutOverwriting;

        chooser->launchAsync (flags,
            [chooser, bytes = std::move (bytes), complete] (const juce::FileChooser& fc) mutable
            {
                auto result = fc.getResult();
                if (result == juce::File{})
                {
                    complete (makeObject ({
                        { "success", false },
                        { "cancelled", true },
                    }));
                    return;
                }
                if (result.getFileExtension().isEmpty())
                    result = result.withFileExtension ("mid");

                if (! result.replaceWithData (bytes.getData(), bytes.getSize()))
                {
                    complete (makeErrorObject ("write failed"));
                    return;
                }

                complete (makeObject ({
                    { "success", true },
                    { "path",    juce::var (result.getFullPathName()) },
                }));
            });
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
            .withNativeFunction ("setTempoBpm",          std::move (setTempoBpm))
            .withNativeFunction ("setMasterVolumePercent", std::move (setMasterVolumePercent))
            .withNativeFunction ("setTransposeSemis",    std::move (setTransposeSemis))
            .withNativeFunction ("setLoopEnabled",       std::move (setLoopEnabled))
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

    // Every ~2s dump audio-thread counters to AstroHarmony.log so we can
    // see if the SamplerEngine is actually rendering audio.
    if (++diagDumpCounter >= 60)
    {
        diagDumpCounter = 0;
        auto& eng = audioProcessor.getSamplerEngine();
        auto path = juce::File::getSpecialLocation (juce::File::tempDirectory)
                        .getChildFile ("AstroHarmony.log");
        const juce::String line =
              juce::Time::getCurrentTime().toString (true, true, true, true)
            + " | [AudioStats] activeInstr=" + eng.getActiveInstrumentId()
            + " blocks=" + juce::String (eng.blocksProcessed.load())
            + " blocksWithAudio=" + juce::String (eng.blocksWithAudio.load())
            + " peak=" + juce::String (eng.lastBlockPeak.load(), 4)
            + " noteOns=" + juce::String (eng.noteOnsThisSession.load()) + "\n";
        path.appendText (line);
    }
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
