# AstroHarmony_Spike — feasibility test for Vite + React 19 + Zustand + @dnd-kit
# inside JUCE 8 WebView2. Deliberately minimal: no DSP, no params, just UI shell.

set(NEEDS_WEBVIEW2 FALSE)
if(WIN32)
    set(PLUGIN_FORMATS VST3 Standalone)
    set(NEEDS_WEBVIEW2 TRUE)
elseif(APPLE)
    set(PLUGIN_FORMATS VST3 AU Standalone)
elseif(UNIX)
    set(PLUGIN_FORMATS VST3 Standalone)
endif()

# Embed single-file Vite bundle (everything inlined into one HTML).
juce_add_binary_data(AstroHarmony_Spike_WebUI
    SOURCES
        Source/ui/public/index.html
)

juce_add_plugin(AstroHarmony_Spike
    COMPANY_NAME "Noizefield"
    PLUGIN_MANUFACTURER_CODE Nfld
    PLUGIN_CODE AhSp
    FORMATS ${PLUGIN_FORMATS}
    PRODUCT_NAME "AstroHarmony Spike"
    NEEDS_WEBVIEW2 ${NEEDS_WEBVIEW2}
    VST3_CATEGORIES Fx Tools
)

target_sources(AstroHarmony_Spike
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
)

target_include_directories(AstroHarmony_Spike
    PRIVATE
        Source
)

target_link_libraries(AstroHarmony_Spike
    PRIVATE
        AstroHarmony_Spike_WebUI
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

target_compile_definitions(AstroHarmony_Spike
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_VST3_CAN_REPLACE_VST2=0
        _USE_MATH_DEFINES=1
)

if(WIN32)
    target_compile_definitions(AstroHarmony_Spike
        PUBLIC
            JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    )
endif()

if(APPLE)
    target_compile_definitions(AstroHarmony_Spike PUBLIC JUCE_USE_CURL=0)
endif()
if(UNIX AND NOT APPLE)
    target_compile_definitions(AstroHarmony_Spike PUBLIC JUCE_USE_CURL=0)
endif()
