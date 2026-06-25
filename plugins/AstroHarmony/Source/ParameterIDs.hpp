#pragma once

// AstroHarmony — host-automatable parameter IDs (APVTS).
// All other state (mood, instrument, progression, voicing, etc.) flows via
// the JS<->C++ pushState/requestInitialState bridge — see plan.md and
// .ideas/parameter-spec.md §2 for the full state schema.

namespace ParameterIDs
{
    inline constexpr auto TEMPO            = "tempo";
    inline constexpr auto MASTER_VOLUME    = "master_volume";
    inline constexpr auto PITCH_TRANSPOSE  = "pitch_transpose";
    inline constexpr auto LOOP             = "loop";
    inline constexpr auto BYPASS           = "bypass";
}
