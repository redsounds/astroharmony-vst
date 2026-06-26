#include "SessionStore.h"
#include "SeedsData.h"

namespace
{
    juce::var makeObject (std::initializer_list<std::pair<const char*, juce::var>> items)
    {
        auto* obj = new juce::DynamicObject();
        for (const auto& kv : items)
            obj->setProperty (juce::Identifier (kv.first), kv.second);
        return juce::var (obj);
    }

    juce::var makeError (const juce::String& message)
    {
        return makeObject ({
            { "success", false },
            { "error",   juce::var (message) },
        });
    }

    juce::int64 nowMs() { return juce::Time::currentTimeMillis(); }
}

//==============================================================================
SessionStore::SessionStore()
{
    sessionsDir = juce::File::getSpecialLocation (
                      juce::File::SpecialLocationType::userApplicationDataDirectory)
                  .getChildFile ("AstroHarmony")
                  .getChildFile ("sessions");

    seedBundledStartersIfNeeded();
}

//==============================================================================
void SessionStore::seedBundledStartersIfNeeded()
{
    ensureDirExists();

    // Marker file in the parent dir — survives even if the user deletes all
    // sessions, so we never re-seed and re-create presets they intentionally
    // removed. (One-way migration: first launch only.)
    const auto markerFile = sessionsDir.getParentDirectory().getChildFile (".seeded");
    if (markerFile.existsAsFile())
        return;

    // Look up the bundled JSON. CMake binary_data strips hyphens entirely
    // when generating C++ symbols, so "seed-sessions.json" becomes
    // "seedsessions_json" (NOT "seed_sessions_json"). Only the dot is
    // turned into an underscore.
    int sizeBytes = 0;
    const auto* data = Seeds::getNamedResource ("seedsessions_json", sizeBytes);
    if (data == nullptr || sizeBytes <= 0)
        return; // don't write the marker — let the next launch retry

    // The String(const char*, size_t) ctor interprets the size as a
    // character count, NOT a byte count — multi-byte UTF-8 codepoints get
    // chopped or misaligned. Use fromUTF8 which explicitly takes a byte
    // length, so musical symbols (♭, ♯, △) survive the trip from
    // BinaryData → JSON parse → file write.
    const auto json = juce::String::fromUTF8 (data, (int) sizeBytes);
    const auto parsed = juce::JSON::parse (json);
    if (! parsed.isArray())
        return;

    int seededCount = 0;
    if (auto* arr = parsed.getArray())
    {
        for (const auto& seed : *arr)
        {
            const auto name = seed.getProperty ("name", juce::var ("Untitled")).toString();
            const auto sData = seed.getProperty ("data", juce::var());
            if (! sData.isObject()) continue;
            saveSession (juce::String(), name, juce::JSON::toString (sData));
            ++seededCount;
        }
    }

    // Only persist the "we've seeded" marker when at least one preset
    // actually landed on disk — otherwise a transient failure would lock
    // out future retries.
    if (seededCount > 0)
        markerFile.create();
}

juce::File SessionStore::getSessionsDir() const { return sessionsDir; }

void SessionStore::ensureDirExists() const
{
    if (! sessionsDir.exists())
        sessionsDir.createDirectory();
}

juce::File SessionStore::sessionFileFor (const juce::String& id) const
{
    // Defensive — strip any path-traversal characters out of the id before
    // touching the filesystem. The JS-side ids are 8 chars [a-z0-9] but
    // anything coming over the bridge is untrusted.
    juce::String safe;
    for (auto c : id)
        if (juce::CharacterFunctions::isLetterOrDigit (c) || c == '-' || c == '_')
            safe << c;
    if (safe.isEmpty()) safe = "invalid";
    return sessionsDir.getChildFile (safe + ".json");
}

juce::String SessionStore::makeId()
{
    juce::Random& rng = juce::Random::getSystemRandom();
    static const char* alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    juce::String s;
    for (int i = 0; i < 8; ++i)
        s << alphabet[rng.nextInt (36)];
    return s;
}

//==============================================================================
juce::var SessionStore::metaFromSessionVar (const juce::var& session)
{
    const auto data = session.getProperty ("data", juce::var (juce::DynamicObject::Ptr (new juce::DynamicObject())));
    const auto progression = data.getProperty ("progression", juce::var());
    int chordCount = 0;
    double bars = 0.0;
    if (progression.isArray())
    {
        if (auto* arr = progression.getArray())
        {
            chordCount = arr->size();
            for (const auto& entry : *arr)
            {
                const auto b = entry.getProperty ("bars", juce::var (1.0));
                bars += (double) b;
            }
        }
    }

    return makeObject ({
        { "id",         session.getProperty ("id", juce::var ("")) },
        { "name",       session.getProperty ("name", juce::var ("Untitled")) },
        { "createdAt",  session.getProperty ("createdAt", juce::var (0)) },
        { "updatedAt",  session.getProperty ("updatedAt", juce::var (0)) },
        { "chordCount", juce::var (chordCount) },
        { "bars",       juce::var (bars) },
    });
}

//==============================================================================
juce::var SessionStore::listSessions() const
{
    ensureDirExists();

    juce::Array<juce::var> list;
    juce::Array<juce::File> files;
    sessionsDir.findChildFiles (files, juce::File::findFiles, false, "*.json");

    for (const auto& f : files)
    {
        const auto contents = f.loadFileAsString();
        auto session = juce::JSON::parse (contents);
        if (! session.isObject()) continue;
        list.add (metaFromSessionVar (session));
    }

    // Newest first.
    std::sort (list.begin(), list.end(),
               [] (const juce::var& a, const juce::var& b)
               {
                   return (juce::int64) a.getProperty ("updatedAt", 0)
                        > (juce::int64) b.getProperty ("updatedAt", 0);
               });

    return juce::var (list);
}

//==============================================================================
juce::var SessionStore::loadSession (const juce::String& id) const
{
    if (id.isEmpty())
        return makeError ("empty id");

    const auto file = sessionFileFor (id);
    if (! file.existsAsFile())
        return makeError ("session not found: " + id);

    const auto contents = file.loadFileAsString();
    auto session = juce::JSON::parse (contents);
    if (! session.isObject())
        return makeError ("corrupt session file");

    // Return the full record so JS gets {id, name, createdAt, updatedAt,
    // data} — the editor's loadSession handler unpacks it.
    return session;
}

//==============================================================================
juce::var SessionStore::saveSession (const juce::String& idIn,
                                     const juce::String& nameIn,
                                     const juce::String& stateBlobJson)
{
    ensureDirExists();

    const bool isUpdate = idIn.isNotEmpty() && sessionFileFor (idIn).existsAsFile();
    const juce::String id = idIn.isNotEmpty() ? idIn : makeId();

    juce::int64 createdAt = nowMs();
    juce::String name = nameIn.isNotEmpty() ? nameIn : juce::String ("Untitled");

    if (isUpdate)
    {
        // Preserve createdAt and the existing name if no new one was given.
        const auto existing = juce::JSON::parse (sessionFileFor (id).loadFileAsString());
        if (existing.isObject())
        {
            createdAt = (juce::int64) existing.getProperty ("createdAt", (juce::int64) createdAt);
            if (nameIn.isEmpty())
                name = existing.getProperty ("name", juce::var ("Untitled")).toString();
        }
    }

    const auto updatedAt = nowMs();
    auto data = juce::JSON::parse (stateBlobJson);
    if (! data.isObject())
        data = juce::var (new juce::DynamicObject());

    auto session = makeObject ({
        { "id",        juce::var (id) },
        { "name",      juce::var (name) },
        { "createdAt", juce::var (createdAt) },
        { "updatedAt", juce::var (updatedAt) },
        { "data",      data },
    });

    const auto file = sessionFileFor (id);
    file.replaceWithText (juce::JSON::toString (session));

    return metaFromSessionVar (session);
}

//==============================================================================
bool SessionStore::deleteSession (const juce::String& id)
{
    if (id.isEmpty()) return false;
    const auto file = sessionFileFor (id);
    if (! file.existsAsFile()) return false;
    return file.deleteFile();
}

bool SessionStore::renameSession (const juce::String& id, const juce::String& newName)
{
    if (id.isEmpty() || newName.isEmpty()) return false;
    const auto file = sessionFileFor (id);
    if (! file.existsAsFile()) return false;

    auto session = juce::JSON::parse (file.loadFileAsString());
    if (! session.isObject()) return false;

    if (auto* obj = session.getDynamicObject())
    {
        obj->setProperty ("name", newName);
        obj->setProperty ("updatedAt", nowMs());
    }

    file.replaceWithText (juce::JSON::toString (session));
    return true;
}

//==============================================================================
juce::var SessionStore::duplicateSession (const juce::String& id)
{
    if (id.isEmpty()) return makeError ("empty id");
    const auto file = sessionFileFor (id);
    if (! file.existsAsFile()) return makeError ("session not found");

    auto session = juce::JSON::parse (file.loadFileAsString());
    if (! session.isObject()) return makeError ("corrupt session");

    const juce::String newId = makeId();
    const juce::String origName = session.getProperty ("name", juce::var ("Untitled")).toString();
    const juce::String newName = origName + " (copy)";
    const auto now = nowMs();

    if (auto* obj = session.getDynamicObject())
    {
        obj->setProperty ("id", newId);
        obj->setProperty ("name", newName);
        obj->setProperty ("createdAt", now);
        obj->setProperty ("updatedAt", now);
    }

    sessionFileFor (newId).replaceWithText (juce::JSON::toString (session));
    return metaFromSessionVar (session);
}
