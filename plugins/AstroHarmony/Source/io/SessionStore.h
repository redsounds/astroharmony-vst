#pragma once

#include <juce_core/juce_core.h>

//==============================================================================
// SessionStore — file-based named-project library (Sub-phase E).
//
// Storage: %APPDATA%\AstroHarmony\sessions\<id>.json (Windows) — one JSON
// file per session. On other platforms, juce::userApplicationDataDirectory
// + "AstroHarmony/sessions/" gives a sensible cross-platform equivalent.
//
// Each session file structure:
//   {
//     "id":        "<8-char id>",
//     "name":      "<user-given name>",
//     "createdAt": <unix-ms>,
//     "updatedAt": <unix-ms>,
//     "data":      <state blob — same JSON shape as pushState>
//   }
//
// All methods run on the message thread; file I/O is synchronous. Sessions
// are independent of the DAW state blob — they survive DAW close/reopen
// and are shared across all DAW projects on the same user account.
//==============================================================================
class SessionStore
{
public:
    SessionStore();

    //==========================================================================
    /** Returns the on-disk directory used for session storage. Created on
        first use if missing. */
    juce::File getSessionsDir() const;

    /** Returns an array of session metadata objects (no payload data) for
        the Projects dropdown. Sorted by updatedAt descending — most
        recently used first. */
    juce::var listSessions() const;

    /** Returns the full session as a juce::var object (with id, name,
        timestamps, and data). Returns a var with success=false if missing. */
    juce::var loadSession (const juce::String& id) const;

    /** Writes the given state blob to a session file.
        - If `id` is empty, a new id is generated and a new file created.
        - If `id` is provided AND a file exists for it, the file is
          overwritten (updatedAt bumped, name kept unless `name` provided).
        - If `id` is provided but no file exists, the file is created with
          that id.
        Returns the SessionMeta var for the written session. */
    juce::var saveSession (const juce::String& id,
                           const juce::String& name,
                           const juce::String& stateBlobJson);

    /** Deletes the session file. Returns true on success. */
    bool deleteSession (const juce::String& id);

    /** Updates only the `name` and `updatedAt` fields. */
    bool renameSession (const juce::String& id, const juce::String& newName);

    /** Copies a session under a new id (+ " (copy)" suffix on the name).
        Returns the new SessionMeta. */
    juce::var duplicateSession (const juce::String& id);

private:
    juce::File sessionsDir;

    void ensureDirExists() const;
    juce::File sessionFileFor (const juce::String& id) const;

    // First-run only — populates the sessions directory with the curated
    // starter progressions bundled into the DLL. Triggered from the ctor;
    // a tiny marker file (.seeded) prevents re-seeding after the user
    // deletes seeds they don't want.
    void seedBundledStartersIfNeeded();

    // Build a SessionMeta var (id, name, createdAt, updatedAt, chordCount,
    // bars) from a parsed session var (the whole file contents).
    static juce::var metaFromSessionVar (const juce::var& session);

    // Random 8-char alphanumeric id matching the JS-side makeId() format.
    static juce::String makeId();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SessionStore)
};
