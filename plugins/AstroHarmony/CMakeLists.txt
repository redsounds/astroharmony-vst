# AstroHarmony — 1:1 VST3/AU/Standalone port of the AstroHarmony Electron app.
# See plugins/AstroHarmony/.ideas/ for the full spec.
#
# Sub-phase A (this checkpoint): plugin skeleton + placeholder HTML.
# Sub-phase B will swap the placeholder index.html for a Vite/React bundle and
# add embedded sample data targets — same juce_add_binary_data approach.

set(NEEDS_WEBVIEW2 FALSE)
if(WIN32)
    set(PLUGIN_FORMATS VST3 Standalone)
    set(NEEDS_WEBVIEW2 TRUE)
elseif(APPLE)
    set(PLUGIN_FORMATS VST3 AU Standalone)
elseif(UNIX)
    set(PLUGIN_FORMATS VST3 Standalone)
endif()

message(STATUS "AstroHarmony: Building for ${PLUGIN_FORMATS}")

# ============================================
# BINARY DATA (Embedded WebView UI)
# ============================================
# Sub-phase A: single placeholder HTML.
# Sub-phase B: same target, but index.html becomes the Vite single-file bundle
# (HTML + JS + CSS + JUCE lib + fonts all inlined). One file by design — sidesteps
# the multi-file resource provider collision footgun we hit on SimpleGain.
juce_add_binary_data(AstroHarmony_WebUI
    SOURCES
        Source/ui/public/index.html
)

# ============================================
# PLUGIN DEFINITION — VST3 Instrument
# ============================================
juce_add_plugin(AstroHarmony
    COMPANY_NAME "Noizefield"
    PLUGIN_MANUFACTURER_CODE Nfld
    PLUGIN_CODE Astr
    FORMATS ${PLUGIN_FORMATS}
    PRODUCT_NAME "AstroHarmony"
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    NEEDS_WEBVIEW2 ${NEEDS_WEBVIEW2}
    VST3_CATEGORIES Instrument Synth Tools
)

# ============================================
# SOURCE FILES
# ============================================
target_sources(AstroHarmony
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
)

target_include_directories(AstroHarmony
    PRIVATE
        Source
)

# ============================================
# LINK LIBRARIES
# ============================================
target_link_libraries(AstroHarmony
    PRIVATE
        AstroHarmony_WebUI
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_plugin_client
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_core
        juce::juce_data_structures
        juce::juce_dsp
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

# ============================================
# COMPILE DEFINITIONS
# ============================================
target_compile_definitions(AstroHarmony
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_VST3_CAN_REPLACE_VST2=0
        _USE_MATH_DEFINES=1
)

if(WIN32)
    target_compile_definitions(AstroHarmony
        PUBLIC
            JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    )
endif()

if(APPLE)
    target_compile_definitions(AstroHarmony PUBLIC JUCE_USE_CURL=0)
endif()
if(UNIX AND NOT APPLE)
    target_compile_definitions(AstroHarmony PUBLIC JUCE_USE_CURL=0)
endif()
