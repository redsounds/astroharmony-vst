# SimpleGain — Static gain/trim utility plugin with peak meter.
# WebView2 UI on Windows; cross-platform plumbing kept for parity with the repo.

# ============================================
# PLATFORM-SPECIFIC CONFIGURATION
# ============================================
set(NEEDS_WEBVIEW2 FALSE)
set(NEEDS_WEB_BROWSER FALSE)

if(WIN32)
    set(PLUGIN_FORMATS VST3 Standalone)
    set(NEEDS_WEBVIEW2 TRUE)
elseif(APPLE)
    set(PLUGIN_FORMATS VST3 AU Standalone)
elseif(UNIX)
    set(PLUGIN_FORMATS VST3 Standalone)
    set(NEEDS_WEB_BROWSER TRUE)
else()
    message(FATAL_ERROR "SimpleGain: unsupported platform")
endif()

message(STATUS "SimpleGain: Building for ${PLUGIN_FORMATS}")

# ============================================
# BINARY DATA (Embedded WebView UI)
# ============================================
juce_add_binary_data(SimpleGain_WebUI
    SOURCES
        Source/ui/public/index.html
        Source/ui/public/js/index.js
        Source/ui/public/js/juce/index.js
        Source/ui/public/js/juce/check_native_interop.js
)

# ============================================
# PLUGIN DEFINITION
# ============================================
juce_add_plugin(SimpleGain
    COMPANY_NAME "Noizefield"
    PLUGIN_MANUFACTURER_CODE Nfld
    PLUGIN_CODE Sgn1
    FORMATS ${PLUGIN_FORMATS}
    PRODUCT_NAME "SimpleGain"
    NEEDS_WEBVIEW2 ${NEEDS_WEBVIEW2}
    NEEDS_WEB_BROWSER ${NEEDS_WEB_BROWSER}
    VST3_CATEGORIES Fx Tools
)

# ============================================
# SOURCE FILES
# ============================================
target_sources(SimpleGain
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
)

target_include_directories(SimpleGain
    PRIVATE
        Source
)

# ============================================
# LINK LIBRARIES
# ============================================
target_link_libraries(SimpleGain
    PRIVATE
        SimpleGain_WebUI
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
target_compile_definitions(SimpleGain
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_VST3_CAN_REPLACE_VST2=0
        _USE_MATH_DEFINES=1
)

if(WIN32)
    target_compile_definitions(SimpleGain
        PUBLIC
            JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    )
endif()

if(APPLE)
    target_compile_definitions(SimpleGain
        PUBLIC
            JUCE_USE_CURL=0
    )
endif()

if(UNIX AND NOT APPLE)
    target_compile_definitions(SimpleGain
        PUBLIC
            JUCE_USE_CURL=0
    )
endif()
