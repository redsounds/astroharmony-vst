#include "Scheduler.h"
#include "SamplerEngine.h"

Scheduler::Scheduler (SamplerEngine& e) : engine (e) {}

void Scheduler::prepare (double sampleRate)
{
    currentSampleRate = juce::jmax (1.0, sampleRate);
    samplesSinceChordStart = 0;
    audioActiveChordIndex = -1;
    currentChordIndex.store (-1, std::memory_order_release);
    currentlyPlayingNotes.clear();
}

//==============================================================================
void Scheduler::setProgression (std::vector<ChordEntry> chords)
{
    const std::lock_guard<std::mutex> lk (paramLock);
    progression = std::move (chords);
}

void Scheduler::start()
{
    samplesSinceChordStart = 0;
    audioActiveChordIndex = -1;
    currentChordIndex.store (-1, std::memory_order_release);
    playing.store (true, std::memory_order_release);
}

void Scheduler::stop()
{
    playing.store (false, std::memory_order_release);
    releaseCurrentChord();
    samplesSinceChordStart = 0;
    audioActiveChordIndex = -1;
    currentChordIndex.store (-1, std::memory_order_release);
}

//==============================================================================
juce::int64 Scheduler::samplesForChord (const ChordEntry& chord) const
{
    const float bpm   = juce::jmax (1.0f, tempoBpm.load (std::memory_order_acquire));
    const int   beats = juce::jmax (1, beatsPerBar.load (std::memory_order_acquire));
    const double samplesPerBeat = currentSampleRate * 60.0 / (double) bpm;
    const double samplesPerBar  = samplesPerBeat * (double) beats;
    const double total = samplesPerBar * juce::jmax (0.125, (double) chord.bars);
    return (juce::int64) std::llround (total);
}

void Scheduler::releaseCurrentChord()
{
    for (int n : currentlyPlayingNotes)
        engine.noteOffFromAudioThread (n);
    currentlyPlayingNotes.clear();
}

void Scheduler::triggerChord (int index)
{
    releaseCurrentChord();

    std::vector<int> notes;
    {
        const std::lock_guard<std::mutex> lk (paramLock);
        if (index < 0 || index >= (int) progression.size()) return;
        notes = progression[index].midiNotes;
    }

    for (int n : notes)
        engine.noteOnFromAudioThread (n, 0.85f);

    currentlyPlayingNotes = std::move (notes);
    audioActiveChordIndex = index;
    currentChordIndex.store (index, std::memory_order_release);
    samplesSinceChordStart = 0;
}

//==============================================================================
void Scheduler::tick (int numSamples)
{
    if (! playing.load (std::memory_order_acquire))
        return;

    // Snapshot progression length while holding the lock briefly.
    int progressionSize = 0;
    bool firstChordExists = false;
    {
        const std::lock_guard<std::mutex> lk (paramLock);
        progressionSize = (int) progression.size();
        firstChordExists = progressionSize > 0;
    }
    if (! firstChordExists)
        return;

    // Cold start — trigger chord 0.
    if (audioActiveChordIndex < 0)
    {
        triggerChord (0);
        // intentionally fall through so the elapsed-samples math runs for
        // this block too (matters for very-short chord durations).
    }

    // Advance by this block's samples; if we cross the chord boundary,
    // step to the next chord. Loop wraps to 0 if looping is on; otherwise
    // we stop after the final chord finishes.
    samplesSinceChordStart += numSamples;

    while (audioActiveChordIndex >= 0)
    {
        juce::int64 chordSamples = 0;
        {
            const std::lock_guard<std::mutex> lk (paramLock);
            if (audioActiveChordIndex >= (int) progression.size())
                break;
            chordSamples = samplesForChord (progression[(size_t) audioActiveChordIndex]);
        }

        if (samplesSinceChordStart < chordSamples)
            break;

        // Boundary crossed — advance.
        const int nextIndex = audioActiveChordIndex + 1;

        if (nextIndex >= progressionSize)
        {
            if (looping.load (std::memory_order_acquire))
            {
                triggerChord (0);
            }
            else
            {
                releaseCurrentChord();
                audioActiveChordIndex = -1;
                currentChordIndex.store (-1, std::memory_order_release);
                playing.store (false, std::memory_order_release);
            }
            break;
        }

        triggerChord (nextIndex);
        // Loop iterates in case multiple very-short chords elapse in one block.
    }
}
