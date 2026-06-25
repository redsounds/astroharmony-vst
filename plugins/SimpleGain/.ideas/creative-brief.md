# SimpleGain — Creative Brief

## Hook
**The clean gain stage your DAW forgot.** SimpleGain is a transparent, single-purpose utility plugin that lets you trim level with confidence — input attenuation, output makeup, and a precise meter, nothing more.

## Vision
SimpleGain is the *first plugin* built with the Audio Plugin Coder (APC) workflow. Its job is twofold:

1. **End-user value:** Be the most boring, most trustworthy gain plugin in the rack. No coloration, no surprises, no DSP magic — just clean dB attenuation and visual feedback. The kind of plugin you reach for at the start and end of every chain.
2. **APC validation:** Exercise the entire Dream → Plan → Design → Implement → Ship pipeline on a deliberately simple DSP target, so any pipeline friction is exposed by the *framework*, not the *plugin complexity*.

## Sonic Character
- **Static, linear gain** — no envelope follower, no dynamics, no soft-clipping. A multiply on each sample.
- **Sample-accurate** parameter changes (smoothed to avoid zipper noise).
- **Unity by default** — opening the plugin on a track must not alter the signal in any way until a knob is touched.
- **Bit-transparent at 0 dB / 0 dB / no meter activity** — round-trip null test must pass.

## Detailed Behavior
- **Input Gain** attenuates (or modestly boosts) the incoming signal before the meter tap.
- **Output Trim** is a post-meter makeup stage, useful for staging the signal back to unity after upstream processing.
- **Level Meter** displays post-input-gain, pre-output-trim peak level in dBFS, with a fast attack and a slow release for readability. Peak-hold dots optional.
- **Stereo-linked** by default. Mono channel handling falls through cleanly.
- **Zero allocations** on the audio thread.

## Out of Scope (intentionally)
- No compression, limiting, or saturation.
- No L/R independent gain, no M/S.
- No preset browser, no A/B compare.
- No oversampling.

If any of these become interesting later, they spawn *new* plugins — SimpleGain stays simple.

## Aesthetic
**Clean modern dark.** Charcoal background (~#1E1E22), soft accent color on the active knob arc, sans-serif numerals, generous whitespace. No skeuomorphism, no brushed metal, no logos competing for attention. Reads as a "system tool" rather than a "product."

## Success Criteria
- Loads without errors in at least one DAW (Reaper or Ableton Live on Windows).
- Knob movements adjust level audibly and meter responds in real time.
- Bypass null-test passes at unity settings.
- The full APC workflow completes end-to-end without manual intervention outside the documented commands.
