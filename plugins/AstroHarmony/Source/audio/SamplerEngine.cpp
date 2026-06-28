#include "SamplerEngine.h"
#include "AstroSamplerVoice.h"

namespace
{
    // Writes diagnostics to %TEMP%\AstroHarmony.log so we can post-mortem
    // the audio path without a debugger attached. TEMP is always writable
    // by the user even when OneDrive controls Documents. Cheap to call
    // from the message thread; do NOT call from the audio thread.
    void logToFile (const juce::String& msg)
    {
        auto path = juce::File::getSpecialLocation (juce::File::tempDirectory)
                        .getChildFile ("AstroHarmony.log");
        path.appendText (juce::Time::getCurrentTime().toString (true, true, true, true)
                         + " | " + msg + "\n");
    }
}

namespace
{
    // Rapid same-chord retrigger is the worst case: every click stacks 5-7
    // voices in release with 5-7 fresh voices in attack. At 16, ~3 fast
    // clicks fill the pool and the next click triggers voice stealing —
    // and JUCE's voice steal is an instant kill, which IS the click the
    // user hears. 32 gives enough headroom for ~5-6 overlapping chord
    // retriggers before any voice ever needs to be stolen.
    constexpr int kMaxPolyphony = 32;

    // Per-instrument gain offsets from cinematic-composer/lib/instruments.ts
    // (in dB). The Salamander piano samples are normalised to a healthy
    // -6 dB, the VSCO strings are mastered very low and need +10 dB to sit
    // in the same mix, the trumpet samples are slightly hotter than the
    // piano so they get attenuated. Without this map, strings are inaudible
    // next to piano — the user-reported issue at the end of Sub-phase D.
    float instrumentGainFor (const juce::String& id)
    {
        // dB → linear, starting from the cinematic-composer base offsets
        // and adjusted by ear so the four instruments feel level-matched
        // at the same master volume:
        //   piano   -1 dB pull-down so transient hammer hits don't dominate
        //   flute   +1 dB nudge so it sits with the keys
        //   strings +2 dB nudge so the section reads above the piano
        // (Multiply by 10^(dB/20): -1 dB → ×0.891, +1 dB → ×1.122, +2 dB → ×1.259.)
        if (id == "piano")   return 0.891f;   // 1.000 × 0.891
        if (id == "flute")   return 0.891f;   // 0.794 × 1.122
        if (id == "strings") return 7.94f;    // 6.31  × 1.259
        if (id == "trumpet") return 0.501f;
        return 1.0f;
    }

    juce::BigInteger makeNoteRange (int low, int high)
    {
        juce::BigInteger range;
        range.setRange (low, juce::jmax (1, high - low + 1), true);
        return range;
    }

    // Perceptual taper: UI shows 0-100 %, audio uses (vol/100)^2. Matches
    // the Tone.js layer the source app pipes through.
    float volumePercentToGain (float percent)
    {
        const float p = juce::jlimit (0.0f, 100.0f, percent) / 100.0f;
        return p * p;
    }

    // Convert semitone shift to a playback rate ratio that the synth will
    // multiply into the per-voice pitch. JUCE's SamplerVoice already does
    // pitch interpolation from the per-note ratio, so we apply the transpose
    // as a global rate multiplier in process() via per-block re-routing of
    // playback notes (cheaper: shift the midi note instead — done in
    // playChord/noteOn).
    //
    // Kept here as a smoothing target for a future fade-in/out on transpose
    // changes; current code applies transpose at trigger time, which is the
    // simpler, click-free path for a chord-based instrument like this.
    float semisToRatio (float semis) { return std::pow (2.0f, semis / 12.0f); }
}

//==============================================================================
SamplerEngine::SamplerEngine()
{
    logToFile ("=== SamplerEngine ctor ===");
    synth.setNoteStealingEnabled (true);
    for (int i = 0; i < kMaxPolyphony; ++i)
        synth.addVoice (new AstroSamplerVoice());

    // Tone.js Reverb defaults from cinematic-composer/lib/audio.ts:
    //   roomSize 0.45, damping 0.55, wetLevel 0.14
    reverbParams.roomSize   = 0.45f;
    reverbParams.damping    = 0.55f;
    reverbParams.wetLevel   = 0.14f;
    reverbParams.dryLevel   = 0.86f;
    reverbParams.width      = 1.0f;
    reverbParams.freezeMode = 0.0f;
    reverb.setParameters (reverbParams);
}

SamplerEngine::~SamplerEngine() = default;

//==============================================================================
void SamplerEngine::prepare (double sampleRate, int blockSize, int numChannels)
{
    logToFile ("prepare: sampleRate=" + juce::String (sampleRate)
               + " blockSize=" + juce::String (blockSize)
               + " channels=" + juce::String (numChannels));
    currentSampleRate  = sampleRate;
    currentBlockSize   = blockSize;
    currentNumChannels = juce::jmax (1, numChannels);

    synth.setCurrentPlaybackSampleRate (sampleRate);

    juce::dsp::ProcessSpec spec;
    spec.sampleRate       = sampleRate;
    spec.maximumBlockSize = (juce::uint32) juce::jmax (1, blockSize);
    spec.numChannels      = (juce::uint32) currentNumChannels;
    reverb.prepare (spec);
    reverb.reset();

    smoothedGain.reset (sampleRate, 0.020);          // 20 ms taper
    smoothedTransposeRatio.reset (sampleRate, 0.050); // 50 ms taper
    smoothedGain.setCurrentAndTargetValue (volumePercentToGain (80.0f));
    smoothedTransposeRatio.setCurrentAndTargetValue (1.0f);
}

void SamplerEngine::releaseResources()
{
    synth.allNotesOff (0, false);
    reverb.reset();
}

//==============================================================================
juce::ADSR::Parameters SamplerEngine::envelopeFor (const juce::String& instrumentId)
{
    // Tighter envelope after switching to 32-voice polyphony — voice
    // stealing was the real click source, not envelope shape. With no
    // steals, release can be shorter (less overlap = less comb-filter
    // colouration). Attack stays short for snappy chord previews.
    juce::ADSR::Parameters env;
    env.attack  = 0.010f;
    env.decay   = 0.1f;
    env.sustain = 1.0f;
    env.release = 0.08f;

    if      (instrumentId == "flute")   { env.attack = 0.025f; env.release = 0.12f; }
    else if (instrumentId == "strings") { env.attack = 0.040f; env.release = 0.15f; }
    else if (instrumentId == "trumpet") { env.attack = 0.025f; env.release = 0.10f; }
    return env;
}

//==============================================================================
void SamplerEngine::setActiveInstrument (const juce::String& instrumentId)
{
    logToFile ("setActiveInstrument: " + instrumentId
               + " (was: " + activeInstrumentId + ")");
    instrumentGain.store (instrumentGainFor (instrumentId), std::memory_order_release);
    if (instrumentId == activeInstrumentId)
        return;
    activeInstrumentId = instrumentId;
    applyInstrumentSounds (instrumentId);
}

void SamplerEngine::applyInstrumentSounds (const juce::String& instrumentId)
{
    const auto& samples = library.getSamplesForInstrument (instrumentId);
    const auto env = envelopeFor (instrumentId);
    logToFile ("applyInstrumentSounds[" + instrumentId
               + "] decoded samples: " + juce::String ((int) samples.size()));

    // Build the new sound list off the audio thread, then swap under the
    // SpinLock so process() sees either the old set or the new set, never
    // a half-built mix.
    juce::ReferenceCountedArray<juce::SynthesiserSound> newSounds;
    for (const auto& s : samples)
    {
        if (s.buffer == nullptr || s.buffer->getNumSamples() == 0)
            continue;

        const auto range = makeNoteRange (s.rangeLowMidi, s.rangeHighMidi);
        const juce::BigInteger allVelocity = [] { juce::BigInteger v; v.setRange (0, 128, true); return v; }();

        const juce::String soundName = "smp_" + juce::String (s.rootMidiNote);
        const double maxSampleSeconds = (double) s.buffer->getNumSamples() / s.sourceSampleRate + 4.0;

        // JUCE 8's SamplerSound only ships with a reader-based ctor (no
        // direct AudioBuffer overload). Roundtrip the decoded buffer
        // through an in-memory WAV so we can hand the SamplerSound a real
        // AudioFormatReader. The OutputStream and InputStream MUST be heap-
        // allocated — `createWriterFor`/`createReaderFor` take ownership
        // and delete them on destruction.
        juce::MemoryBlock wavBlock;
        {
            juce::WavAudioFormat wav;
            auto* os = new juce::MemoryOutputStream (wavBlock, false);
            std::unique_ptr<juce::AudioFormatWriter> writer (
                wav.createWriterFor (os, s.sourceSampleRate,
                                     (unsigned int) s.buffer->getNumChannels(),
                                     16, {}, 0));
            if (writer == nullptr)
            {
                delete os; // createWriterFor only takes ownership on success
                continue;
            }
            writer->writeFromAudioSampleBuffer (*s.buffer, 0, s.buffer->getNumSamples());
            writer.reset(); // flushes + deletes os, finalising the WAV header
        }
        if (wavBlock.getSize() == 0)
            continue;

        juce::WavAudioFormat wav;
        auto* memStream = new juce::MemoryInputStream (wavBlock.getData(),
                                                       wavBlock.getSize(),
                                                       true /* keepInternalCopyOfData */);
        std::unique_ptr<juce::AudioFormatReader> wavReader (
            wav.createReaderFor (memStream, true /* deleteStreamWhenDone */));
        if (wavReader == nullptr)
            continue;

        newSounds.add (new juce::SamplerSound (
            soundName,
            *wavReader,
            range,
            s.rootMidiNote,
            env.attack,
            env.release,
            maxSampleSeconds));
    }

    {
        const juce::SpinLock::ScopedLockType sl (soundsLock);
        synth.clearSounds();
        for (auto* snd : newSounds)
            synth.addSound (snd);
    }
    logToFile ("applyInstrumentSounds[" + instrumentId
               + "] sounds added to synth: " + juce::String (newSounds.size()));
}

//==============================================================================
void SamplerEngine::playChord (const std::vector<int>& midiNotes,
                               float velocity,
                               int autoReleaseMs)
{
    juce::String notesStr;
    for (int n : midiNotes) notesStr << n << " ";
    logToFile ("playChord notes=[" + notesStr + "] vel=" + juce::String (velocity)
               + " autoRelease=" + juce::String (autoReleaseMs) + "ms"
               + " synthNumSounds=" + juce::String (synth.getNumSounds())
               + " synthNumVoices=" + juce::String (synth.getNumVoices()));

    {
        const juce::SpinLock::ScopedLockType sl (soundsLock);

        // Fast-fade any voice currently playing one of these notes BEFORE
        // calling noteOn for the new one. JUCE's noteOn also stops same-
        // note voices but uses the SamplerSound's release envelope
        // (~80 ms) — which is long enough for a transient-rich sample
        // (piano, trumpet) to comb-filter against the new voice. Our
        // AstroSamplerVoice::stopNoteFast arms a 3 ms hard fade-out so
        // the old transient is silent before the new transient develops.
        for (int n : midiNotes)
        {
            const int target = juce::jlimit (0, 127, n);
            for (int i = 0; i < synth.getNumVoices(); ++i)
            {
                if (auto* v = dynamic_cast<AstroSamplerVoice*> (synth.getVoice (i)))
                {
                    if (v->isVoiceActive() && v->getCurrentlyPlayingNote() == target)
                        v->stopNoteFast (0.003);
                }
            }
        }

        for (int n : midiNotes)
        {
            synth.noteOn (1, juce::jlimit (0, 127, n), juce::jlimit (0.0f, 1.0f, velocity));
            noteOnsThisSession.fetch_add (1);
        }
    }

    // Schedule asynchronous note-off so sustained instruments (strings,
    // flute, trumpet) decay after a musically sensible duration instead of
    // ringing for the full sample length. Piano benefits too — its natural
    // decay tail then plays out under the release envelope.
    //
    // Generation-guarded: if the user re-triggers any chord before this
    // timer fires, the generation atomic bumps and the captured value no
    // longer matches — the timer no-ops instead of killing the new chord's
    // freshly-allocated voices for the same notes. (That bug looked like
    // "the second click is shorter than the first.")
    if (autoReleaseMs > 0 && ! midiNotes.empty())
    {
        const int myGeneration = playChordGeneration.fetch_add (1) + 1;
        const std::vector<int> notesCopy (midiNotes);
        juce::Timer::callAfterDelay (autoReleaseMs, [this, notesCopy, myGeneration]
        {
            if (playChordGeneration.load (std::memory_order_acquire) != myGeneration)
                return;
            const juce::SpinLock::ScopedLockType sl (soundsLock);
            for (int n : notesCopy)
                synth.noteOff (1, juce::jlimit (0, 127, n), 0.0f, true);
        });
    }
}

void SamplerEngine::stopAll()
{
    const juce::SpinLock::ScopedLockType sl (soundsLock);
    synth.allNotesOff (1, true /* allowTailOff */);
}

void SamplerEngine::noteOnFromAudioThread (int midiNote, float velocity)
{
    // process() already holds the lock when this is called.
    synth.noteOn (1, juce::jlimit (0, 127, midiNote), juce::jlimit (0.0f, 1.0f, velocity));
}

void SamplerEngine::noteOffFromAudioThread (int midiNote)
{
    synth.noteOff (1, juce::jlimit (0, 127, midiNote), 0.0f, true);
}

//==============================================================================
void SamplerEngine::process (juce::AudioBuffer<float>& buffer,
                             float masterVolumePercent,
                             float /*pitchTransposeSemis*/)
{
    const int numSamples = buffer.getNumSamples();
    if (numSamples == 0) return;

    smoothedGain.setTargetValue (volumePercentToGain (masterVolumePercent));

    // Try-lock so an in-progress instrument swap doesn't block the audio
    // thread. If contended we emit silence for one block (~10 ms typical) —
    // not audible in practice.
    const juce::SpinLock::ScopedTryLockType tryLock (soundsLock);
    if (! tryLock.isLocked())
    {
        buffer.clear();
        return;
    }

    // Synth renders into the buffer additively (in JUCE Synthesiser the
    // call replaces silence with synthesised audio; for an instrument with
    // no input audio that's the same thing).
    juce::MidiBuffer emptyMidi;
    synth.renderNextBlock (buffer, emptyMidi, 0, numSamples);

    // Reverb chain (stereo). If we have one channel, treat the block as
    // mono — JUCE Reverb handles either.
    juce::dsp::AudioBlock<float> block (buffer);
    juce::dsp::ProcessContextReplacing<float> ctx (block);
    reverb.process (ctx);

    // Master gain × per-instrument gain. Master is per-sample smoothed;
    // instrument gain only changes at instrument-switch time so we treat
    // it as constant for the block (block size is small enough at 256
    // samples that any zipper would be inaudible).
    const float instGain = instrumentGain.load (std::memory_order_acquire);
    for (int sample = 0; sample < numSamples; ++sample)
    {
        const float g = smoothedGain.getNextValue() * instGain;
        for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
            buffer.setSample (ch, sample, buffer.getSample (ch, sample) * g);
    }

    // Diagnostic: track if any audio actually came out this block.
    blocksProcessed.fetch_add (1);
    const float peak = buffer.getMagnitude (0, numSamples);
    if (peak > 0.0001f)
    {
        blocksWithAudio.fetch_add (1);
        lastBlockPeak.store (peak);
    }
}
