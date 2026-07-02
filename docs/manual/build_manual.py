"""Build the AstroHarmony VST + Standalone user manual as a multi-page PDF.

Run from the project root:

    python docs/manual/build_manual.py

Output: docs/manual/AstroHarmony-User-Manual.pdf
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# Palette -----------------------------------------------------------------
INK = colors.HexColor("#1f2330")
INK_DIM = colors.HexColor("#4a5366")
INK_MUTE = colors.HexColor("#7c8696")
ACCENT = colors.HexColor("#5a7d82")
ACCENT_LIGHT = colors.HexColor("#7fa8b8")
ROSE = colors.HexColor("#c4869a")
CREAM = colors.HexColor("#f5f1e8")
PAPER = colors.HexColor("#fbf8f3")
DIVIDER = colors.HexColor("#d8d3c8")
CODE_BG = colors.HexColor("#f0ece4")
TABLE_HEADER_BG = colors.HexColor("#2d3344")
TABLE_ROW_ALT = colors.HexColor("#f4efe5")

# Page geometry -----------------------------------------------------------
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 2.2 * cm
MARGIN_TOP = 2.5 * cm
MARGIN_BOTTOM = 2.0 * cm
FRAME_WIDTH = PAGE_WIDTH - 2 * MARGIN_X
FRAME_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM


def _cover_page(canv, _doc):
    canv.saveState()
    canv.setFillColor(INK)
    canv.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canv.setFillColor(ACCENT)
    canv.rect(0, PAGE_HEIGHT - 0.6 * cm, PAGE_WIDTH, 0.6 * cm, stroke=0, fill=1)
    canv.setFillColor(ROSE)
    canv.rect(0, 0, PAGE_WIDTH, 0.4 * cm, stroke=0, fill=1)
    canv.restoreState()


def _content_page(canv, doc):
    canv.saveState()
    canv.setFillColor(ACCENT_LIGHT)
    canv.rect(MARGIN_X, PAGE_HEIGHT - MARGIN_TOP + 1.3 * cm, FRAME_WIDTH, 0.05 * cm, stroke=0, fill=1)
    canv.setFillColor(INK_MUTE)
    canv.setFont("Helvetica", 8)
    canv.drawString(MARGIN_X, PAGE_HEIGHT - MARGIN_TOP + 1.6 * cm, "ASTROHARMONY  —  USER MANUAL")
    canv.drawRightString(
        PAGE_WIDTH - MARGIN_X,
        PAGE_HEIGHT - MARGIN_TOP + 1.6 * cm,
        "Astrotone Audio",
    )
    canv.setFillColor(INK_MUTE)
    canv.setFont("Helvetica", 8)
    canv.drawString(MARGIN_X, MARGIN_BOTTOM - 1.0 * cm, "© 2026 Astrotone Audio  ·  info@astrotoneaudio.com")
    canv.drawRightString(
        PAGE_WIDTH - MARGIN_X,
        MARGIN_BOTTOM - 1.0 * cm,
        f"Page {doc.page - 1}",
    )
    canv.restoreState()


# Styles ------------------------------------------------------------------
def make_styles():
    base = getSampleStyleSheet()
    s = {}
    s["CoverTitle"] = ParagraphStyle(
        "CoverTitle", parent=base["Title"],
        fontName="Helvetica-Bold", fontSize=46, leading=52,
        textColor=CREAM, alignment=TA_CENTER, spaceAfter=18,
    )
    s["CoverSub"] = ParagraphStyle(
        "CoverSub", parent=base["Normal"],
        fontName="Helvetica", fontSize=14, leading=18,
        textColor=ACCENT_LIGHT, alignment=TA_CENTER, spaceAfter=8,
    )
    s["CoverMeta"] = ParagraphStyle(
        "CoverMeta", parent=base["Normal"],
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=colors.HexColor("#a8b0bd"), alignment=TA_CENTER,
    )
    s["H1"] = ParagraphStyle(
        "H1", parent=base["Heading1"],
        fontName="Helvetica-Bold", fontSize=22, leading=28,
        textColor=INK, spaceBefore=12, spaceAfter=10,
    )
    s["H2"] = ParagraphStyle(
        "H2", parent=base["Heading2"],
        fontName="Helvetica-Bold", fontSize=14, leading=20,
        textColor=ACCENT, spaceBefore=14, spaceAfter=6,
    )
    s["H3"] = ParagraphStyle(
        "H3", parent=base["Heading3"],
        fontName="Helvetica-Bold", fontSize=11, leading=16,
        textColor=INK, spaceBefore=10, spaceAfter=4,
    )
    s["Body"] = ParagraphStyle(
        "Body", parent=base["Normal"],
        fontName="Helvetica", fontSize=10.5, leading=15,
        textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6,
    )
    s["Bullet"] = ParagraphStyle(
        "Bullet", parent=s["Body"],
        leftIndent=14, bulletIndent=2, spaceAfter=3,
    )
    s["Tip"] = ParagraphStyle(
        "Tip", parent=s["Body"],
        fontName="Helvetica-Oblique", fontSize=10, leading=14,
        textColor=INK_DIM, leftIndent=10, rightIndent=10,
        borderColor=ACCENT_LIGHT, borderWidth=0,
        backColor=colors.HexColor("#eef3f5"),
        borderPadding=8, spaceBefore=6, spaceAfter=10,
    )
    s["Code"] = ParagraphStyle(
        "Code", parent=base["Code"],
        fontName="Courier", fontSize=9.5, leading=13,
        textColor=INK, backColor=CODE_BG,
        leftIndent=8, rightIndent=8, borderPadding=6,
        spaceBefore=4, spaceAfter=8,
    )
    s["Cell"] = ParagraphStyle(
        "Cell", parent=s["Body"],
        fontSize=9.5, leading=12, alignment=TA_LEFT, spaceAfter=0,
    )
    return s


STYLES = make_styles()


# Helpers -----------------------------------------------------------------
ENTITY_MAP = {
    "&mdash;": "—", "&ndash;": "–",
    "&rarr;": "→", "&larr;": "←", "&uarr;": "↑", "&darr;": "↓",
    "&ldquo;": "“", "&rdquo;": "”", "&lsquo;": "‘", "&rsquo;": "’",
    "&hellip;": "…", "&middot;": "·", "&bull;": "•",
    "&times;": "×", "&nbsp;": " ",
}


def _decode_entities(s):
    for k, v in ENTITY_MAP.items():
        s = s.replace(k, v)
    return s


def h1(text):    return Paragraph(_decode_entities(text), STYLES["H1"])
def h2(text):    return Paragraph(_decode_entities(text), STYLES["H2"])
def h3(text):    return Paragraph(_decode_entities(text), STYLES["H3"])
def body(text):  return Paragraph(_decode_entities(text), STYLES["Body"])
def tip(text):   return Paragraph(_decode_entities(text), STYLES["Tip"])
def code(text):  return Paragraph(_decode_entities(text), STYLES["Code"])


def bullet_list(items):
    return [Paragraph(f"•  {_decode_entities(t)}", STYLES["Bullet"]) for t in items]


def _cell(value, style_name="Cell"):
    if not isinstance(value, str):
        return value
    return Paragraph(_decode_entities(value), STYLES[style_name])


def info_table(rows, col_widths=None):
    if col_widths is None:
        col_widths = [FRAME_WIDTH * 0.30, FRAME_WIDTH * 0.70]
    wrapped = [list(rows[0])]
    for row in rows[1:]:
        wrapped.append([_cell(c) for c in row])
    tbl = Table(wrapped, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), CREAM),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, TABLE_ROW_ALT]),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, ACCENT),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, DIVIDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


# Cover + TOC -------------------------------------------------------------
def build_cover():
    return [
        Spacer(1, 5.0 * cm),
        Paragraph("ASTROHARMONY", STYLES["CoverTitle"]),
        Paragraph("Chord progressions, shaped by feeling.", STYLES["CoverSub"]),
        Paragraph("VST3 plugin &middot; Standalone application &middot; Windows", STYLES["CoverSub"]),
        Spacer(1, 8 * cm),
        Paragraph("User Manual &middot; Version 1.0", STYLES["CoverMeta"]),
        Spacer(1, 0.2 * cm),
        Paragraph("Astrotone Audio &nbsp;&middot;&nbsp; 2026", STYLES["CoverMeta"]),
        Spacer(1, 0.2 * cm),
        Paragraph("info@astrotoneaudio.com", STYLES["CoverMeta"]),
    ]


def build_toc():
    rows = [
        ("1.",  "Welcome",                                "4"),
        ("2.",  "Installing &amp; Activating",            "5"),
        ("3.",  "Using AstroHarmony in Your DAW",         "6"),
        ("4.",  "The Workspace at a Glance",              "8"),
        ("5.",  "Choosing a Mood",                        "9"),
        ("6.",  "Scale, Mode &amp; Extensions",           "10"),
        ("7.",  "Diatonic &amp; Suspended Chords",        "11"),
        ("8.",  "Suggested Chords",                       "12"),
        ("9.",  "Building a Progression",                 "13"),
        ("10.", "Progression Voicing Styles",             "14"),
        ("11.", "Per-Chord Editing &amp; Slash Bass",     "15"),
        ("12.", "Piano View",                             "16"),
        ("13.", "Instruments",                            "17"),
        ("14.", "Playback Pitch (Transpose)",             "18"),
        ("15.", "Projects: Save, Load, Duplicate",        "19"),
        ("16.", "MIDI Export &amp; Drag-Out",             "20"),
        ("17.", "Settings",                               "21"),
        ("18.", "Keyboard &amp; Mouse Shortcuts",         "22"),
        ("19.", "Troubleshooting",                        "23"),
        ("20.", "License Terms (Summary)",                "25"),
        ("21.", "Support &amp; Contact",                  "26"),
    ]
    data = [["§", "Section", "Page"]] + [
        [r[0], Paragraph(r[1], STYLES["Cell"]), r[2]] for r in rows
    ]
    tbl = Table(data, colWidths=[1.4 * cm, FRAME_WIDTH - 3.6 * cm, 2.2 * cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), CREAM),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, DIVIDER),
    ]))
    return [h1("Contents"), Spacer(1, 0.4 * cm), tbl]


# Sections ----------------------------------------------------------------
def section_welcome():
    return [
        h1("1. Welcome"),
        body(
            "AstroHarmony is a chord-progression workbench for composers and producers "
            "who want to start from a <b>feeling</b> rather than a music-theory grid. "
            "Pick a mood, audition harmonies that already fit, drop them onto the "
            "timeline, dress them with a voicing style, and play it back in your DAW "
            "or export to MIDI."
        ),
        body("This release ships in two interchangeable formats:"),
        *bullet_list([
            "<b>VST3 plugin</b> &mdash; loads inside any modern DAW (FL Studio, Studio One, Reaper, Cubase, Ableton Live, Bitwig). Audio is routed straight to the host&rsquo;s mixer.",
            "<b>Standalone application</b> &mdash; a self-contained app for ideation away from the DAW. Same engine, same UI, same projects.",
        ]),
        body("Both formats use the same audio engine, share the same project library on disk, and accept the same licence key."),
        h2("Built for three audiences"),
        *bullet_list([
            "<b>Film composers</b> &mdash; cinematic, modal and chromatic-mediant moves at hand.",
            "<b>Game composers</b> &mdash; adaptive harmonic moods per scene, character or level.",
            "<b>Beat producers</b> &mdash; lush jazz, neo-soul and gospel voicings without the theory homework.",
        ]),
        body(
            "Everything runs offline once activated. There is no cloud account, no "
            "telemetry, and no DAW lock-in &mdash; chords leave the app as standard "
            "MIDI events that any modern DAW will record or import."
        ),
        h2("What ships in the box"),
        info_table([
            ["Component", "Detail"],
            ["Moods", "Epic, Dark, Hopeful, Sad, Tension, Mystery, Fantasy, Adventure, Love, Horror"],
            ["Voicing styles", "Standard, Cinematic, Jazz Shell, Piano Spread, Neo Soul, Gospel, Voice Leading, Open Voicing, Quartal, Quintal, Cluster"],
            ["Instruments", "Grand Piano, Strings, Flute, Trumpet &mdash; bundled, no separate download"],
            ["Theory engine", "Diatonic and modal chord generation in every common Western mode, plus Harmonic / Melodic Minor and exotic modes"],
            ["MIDI export", "One-click .mid download <i>and</i> drag-out from the EXPORT button straight onto a DAW track"],
        ]),
    ]


def section_install():
    return [
        h1("2. Installing &amp; Activating"),
        h2("System requirements"),
        info_table([
            ["Requirement", "Detail"],
            ["Operating system", "Windows 10 version 1809 (October 2018 Update) or later, or Windows 11. 64-bit only."],
            ["WebView2 Runtime", "Required for the user interface. Ships with Windows 11 and current Windows 10 builds; the installer fetches it from Microsoft if missing."],
            ["DAW (for the VST3)", "Any VST3-compatible host: FL Studio 20.7+, Studio One 5+, Reaper 6+, Cubase 12+, Ableton Live 11+, Bitwig Studio 4+."],
            ["Disk space", "About 80 MB after install (binaries + bundled samples)."],
        ]),
        h2("Running the installer"),
        body(
            "Double-click <font face='Courier'>AstroHarmony_Setup_1.0.0.exe</font>. "
            "Windows SmartScreen may show a blue warning because the installer is "
            "not yet code-signed &mdash; click <b>More info</b> &rarr; <b>Run anyway</b>. "
            "When EV code signing is added in a future build, the warning will disappear."
        ),
        body("The installer walks you through five screens:"),
        *bullet_list([
            "<b>License Agreement</b> &mdash; the full EULA. You must click <b>I accept</b> to continue. This screen is the legal point at which you activate the EU 14-day right-of-withdrawal waiver for installed copies (Article 16(m) of EU Directive 2011/83/EU).",
            "<b>Select Components</b> &mdash; tick what you want: VST3 plugin, Standalone application, or both. The default is &ldquo;Full installation&rdquo;.",
            "<b>Select Install Location</b> &mdash; where the Standalone goes. The default is <font face='Courier'>C:\\Program Files\\Astrotone Audio\\AstroHarmony</font>. The VST3 path is fixed by Steinberg&rsquo;s spec (see below) and is not configurable.",
            "<b>Ready to Install</b> &mdash; final confirmation.",
            "<b>Installing</b> &mdash; if WebView2 Runtime is missing, the installer downloads ~1.8&nbsp;MB from Microsoft and installs it silently before finishing.",
        ]),
        h2("Where files land"),
        info_table([
            ["File", "Path"],
            ["VST3 plugin", "C:\\Program Files\\Common Files\\VST3\\AstroHarmony.vst3"],
            ["Standalone app", "C:\\Program Files\\Astrotone Audio\\AstroHarmony\\AstroHarmony.exe"],
            ["License agreement", "C:\\Program Files\\Astrotone Audio\\AstroHarmony\\LICENSE.txt"],
            ["Your projects", "%APPDATA%\\AstroHarmony\\sessions\\"],
            ["Your licence key", "%APPDATA%\\AstroHarmony\\license.txt"],
        ]),
        body(
            "The two paths under <font face='Courier'>%APPDATA%\\AstroHarmony</font> "
            "are <b>never touched by the uninstaller</b>. Reinstalling or upgrading "
            "preserves your projects and your activation."
        ),
        h2("First launch &mdash; activation"),
        body(
            "On first launch (Standalone) or first instance in a DAW (VST3), the "
            "app opens on an <b>Activation</b> screen. Paste the licence key you "
            "received with your purchase (format: "
            "<font face='Courier'>XXXX-XXXX-XXXX-XXXX</font>) and click "
            "<b>Activate</b>. Validation happens locally against a bundled hash "
            "list &mdash; no internet connection is required and no data is sent."
        ),
        tip(
            "The key is case-insensitive and accepts spaces. "
            "<font face='Courier'>ab12 cd34 ef56 gh78</font> is treated the same as "
            "<font face='Courier'>AB12-CD34-EF56-GH78</font>."
        ),
        body(
            "Once activated, the key persists in "
            "<font face='Courier'>%APPDATA%\\AstroHarmony\\license.txt</font>. Both "
            "the Standalone and the VST3 read from the same file, so activating one "
            "format unlocks the other automatically. Your purchase allows install "
            "on up to <b>three (3) devices</b>."
        ),
    ]


def section_daw():
    return [
        h1("3. Using AstroHarmony in Your DAW"),
        body(
            "AstroHarmony is an <b>instrument plugin</b> (not an effect). It "
            "produces audio &mdash; the chord progression you built &mdash; and "
            "sends it to a stereo bus in your DAW."
        ),
        h2("Finding the plugin"),
        body(
            "After install, ask your DAW to re-scan plugins. AstroHarmony appears "
            "under <b>Vendor: Astrotone Audio</b>, <b>Category: Instrument / "
            "Synth / Sampler</b>."
        ),
        h3("FL Studio"),
        *bullet_list([
            "Open <b>Options &rarr; Manage plugins</b>.",
            "Click <b>Find more plugins</b> &mdash; FL re-scans <font face='Courier'>C:\\Program Files\\Common Files\\VST3\\</font>.",
            "AstroHarmony shows up in the &ldquo;Recently installed&rdquo; pane. Click the star to favourite it; right-click &rarr; <b>Add to channel rack</b> drops it onto the project.",
        ]),
        h3("Studio One"),
        body(
            "Studio One auto-scans on launch. AstroHarmony appears under "
            "<b>Instruments &rarr; Astrotone Audio</b>. Drag it onto a track or "
            "into empty space in the arrange view to create a new instrument track."
        ),
        h3("Reaper"),
        *bullet_list([
            "<b>Options &rarr; Preferences &rarr; Plug-ins &rarr; VST</b>.",
            "Confirm <font face='Courier'>C:\\Program Files\\Common Files\\VST3</font> is in the VST3 paths.",
            "Click <b>Re-scan</b>. AstroHarmony appears as <b>VST3i: AstroHarmony (Astrotone Audio)</b>.",
        ]),
        h3("Ableton Live"),
        *bullet_list([
            "<b>Preferences &rarr; Plug-Ins</b>. Make sure <b>Use VST3 Plug-In System Folders</b> is on.",
            "Click <b>Rescan</b>. The plugin appears under <b>Plug-Ins &rarr; VST3 &rarr; Astrotone Audio</b> in the browser.",
        ]),
    ]


def section_workspace():
    return [
        h1("4. The Workspace at a Glance"),
        body("The window is split into three columns and two bars."),
        info_table([
            ["Area", "What it does"],
            ["Top bar", "Project menu, save / undo / redo, instrument picker, transport (play / stop / loop), tempo, settings."],
            ["Mood column (left)", "Pick the emotional palette &mdash; the rest of the UI reshapes around it."],
            ["Centre column", "Active progression timeline, suggested chords, scale picker, diatonic and suspended chord rows."],
            ["Right panel", "Progression voicing style, chord-notes piano view, slash-bass selector."],
            ["Bottom bar", "Playback pitch shift (-12 to +12 semitones), CLEAR, and EXPORT MIDI."],
        ]),
        body(
            "The divider between the centre and the right panel is draggable. "
            "Wider right panel &rarr; bigger piano. Narrower right panel &rarr; "
            "more room for chord buttons. The position is remembered between launches."
        ),
        tip(
            "When loaded as a VST3, the plugin window can be resized by dragging "
            "its bottom-right corner. The UI scales fluidly; the splitter position "
            "and zoom level are saved with the DAW project."
        ),
    ]


def section_mood():
    return [
        h1("5. Choosing a Mood"),
        body("Each mood ships with three things wired in:"),
        *bullet_list([
            "<b>Preferred modes</b> &mdash; the scale dropdown auto-snaps to whichever fits the mood best.",
            "<b>Suggested chord transitions</b> &mdash; the &ldquo;Suggested Next Chords&rdquo; row is built from move templates specific to the mood (Epic loves chromatic mediants, Sad leans on modal interchange, Mystery favours diminished pivots, etc.).",
            "<b>Preferred root</b> &mdash; some moods (Epic, Adventure) sound best in flat keys; switching mood may transpose you there.",
        ]),
        body(
            "Clicking a mood while a progression is already on the timeline does "
            "<i>not</i> destroy what you wrote &mdash; only the <b>suggestions</b> "
            "are re-computed. Your existing chords keep playing as they are."
        ),
        h2("The ten moods"),
        info_table([
            ["Mood", "Character"],
            ["Epic", "Powerful, grand, heroic &mdash; Ionian / Mixolydian / Aeolian."],
            ["Dark", "Mysterious, ominous &mdash; Aeolian / Phrygian / Locrian / Harmonic Minor."],
            ["Hopeful", "Uplifting, inspiring &mdash; bright Ionian + Lydian colour."],
            ["Sad", "Melancholic, emotional &mdash; Aeolian / Dorian / Phrygian."],
            ["Tension", "Suspenseful, intense &mdash; Harmonic Minor, Phrygian Dominant, Diminished."],
            ["Mystery", "Curious, uncertain &mdash; Phrygian, Locrian, Phrygian Major."],
            ["Fantasy", "Magical, otherworldly &mdash; modal mixture with Lydian sparkle."],
            ["Adventure", "Bold, exciting, dynamic &mdash; quartal &amp; pentatonic colour."],
            ["Love", "Romantic, warm &mdash; major / Lydian / Dorian with extensions."],
            ["Horror", "Dark, scary, eerie &mdash; Phrygian, Locrian, exotic minors."],
        ]),
    ]


def section_scale():
    return [
        h1("6. Scale, Mode &amp; Extensions"),
        h2("Picking a tonic"),
        body(
            "The left dropdown holds the tonic note (A, A#, B&hellip;G#). The right "
            "dropdown holds the mode. The two are independent &mdash; you can run "
            "D# Locrian or B Lydian if your project asks for it."
        ),
        h2("Mode families available"),
        info_table([
            ["Family", "Members"],
            ["Major modes", "Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian"],
            ["Harmonic minor", "Harmonic Minor, Locrian #6, Ionian #5, Dorian #4, Phrygian Dominant, Lydian #2, Altered Dim (Ultralocrian)"],
            ["Melodic minor", "Melodic Minor, Dorian b2, Lydian Augmented, Lydian Dominant, Mixolydian b6, Locrian #2, Super Locrian (Altered)"],
            ["Phrygian Major", "Aka &ldquo;Spanish Phrygian&rdquo; &mdash; major third on a Phrygian frame."],
        ]),
        h2("Extensions tabs"),
        body(
            "Above the diatonic rows is a tab strip: <b>Triad / 6&amp;7 / 9 / 11 / 13</b>. "
            "These select how many notes the chord buttons will generate."
        ),
        info_table([
            ["Tab", "Notes per chord", "Example I-chord in C major"],
            ["Triad", "3", "C E G"],
            ["6&amp;7", "4", "C E G B (CΔ7) or C E G A (C6)"],
            ["9", "5", "C E G B D (CΔ9)"],
            ["11", "6, avoid-4 stripped on major-3rd chords", "Dm9 + G &rarr; Dm11"],
            ["13", "7, avoid-4 stripped", "CΔ13 spread across the row"],
        ]),
        tip(
            "Major-3rd chords drop the natural 11 automatically &mdash; the b9 clash between "
            "major 3rd and perfect 11 ruins every voicing. Lydian #11 keeps the colour, and "
            "minor chords keep the natural 11 because it sits a clean M9 above the b3."
        ),
    ]


def section_diatonic():
    return [
        h1("7. Diatonic &amp; Suspended Chords"),
        body(
            "Below the scale picker is the chord grid. Each column is a scale degree "
            "(I, II, III, IV, V, VI, VII), each row is a chord flavour."
        ),
        h2("Rows"),
        *bullet_list([
            "<b>Diatonic Chords</b> &mdash; the seven chords that belong to the current mode at the selected extension level.",
            "<b>sus2</b> &mdash; suspended-second variant of every degree, where the third has been replaced by a major second.",
            "<b>sus4</b> &mdash; suspended-fourth variant of every degree.",
        ]),
        body(
            "Each pill has two halves. Click the <b>name</b> to preview the chord "
            "on the piano view without adding it. Click the <b>+</b> on the right "
            "to drop the chord onto the timeline."
        ),
        h2("Empty slots"),
        body(
            "A dashed-outline slot in a row means &ldquo;the scale doesn&rsquo;t "
            "support a clean version of this chord here&rdquo; (e.g. sus2 on a "
            "degree whose second is a tritone). This is intentional &mdash; the "
            "app refuses to give you a flat-fifth sus2 because it doesn&rsquo;t "
            "voice well."
        ),
    ]


def section_suggestions():
    return [
        h1("8. Suggested Chords"),
        body(
            "Between the timeline and the scale picker is the <b>Suggested Next "
            "Chords</b> row. It rebuilds itself each time you change mood, key, "
            "extension or the last chord on the timeline."
        ),
        body(
            "Each suggestion carries a label (&ldquo;Heroic Mediant&rdquo;, "
            "&ldquo;Cinematic Descent&rdquo;, &ldquo;Sudden Sorrow&rdquo;&hellip;) "
            "describing the harmonic move it makes, plus the Roman numeral of the "
            "resulting chord in the current key. Some suggestions come from a "
            "<i>secondary</i> mode &mdash; they show a small &uarr; arrow with the "
            "borrowed scale&rsquo;s name."
        ),
        h2("Borrowed chords"),
        body(
            "When a suggestion borrows from another mode (for example "
            "<font face='Courier'>Dbm/C# &uarr; Db Dorian</font>), the chord is shown "
            "with its original spelling and a slash bass. The piano view still "
            "shows every pitch correctly &mdash; double accidentals (Cb, Fb, B#, "
            "G##, etc.) are normalised so the keys light up no matter how the "
            "chord is spelled."
        ),
        tip(
            "Suggestions tend to fit best when the current mode matches one of the "
            "&ldquo;X prefers:&rdquo; chips below the mode dropdown. Picking an "
            "exotic mode outside that list (e.g. Epic + Locrian #2) will still "
            "produce suggestions &mdash; just expect a few chords to live outside "
            "the strict scale."
        ),
    ]


def section_building():
    return [
        h1("9. Building a Progression"),
        body(
            "Drop chords onto the timeline by clicking the <b>+</b> on either a "
            "diatonic pill or a suggestion card. The new chord lands at the end of "
            "the progression and is automatically selected so the right-panel "
            "controls follow it."
        ),
        h2("Reordering and resizing"),
        *bullet_list([
            "<b>Drag</b> a chord card sideways to reorder it. Colours follow the card so it stays visually distinct after a reorder.",
            "<b>Drag the right edge</b> of a chord card to change how many bars it lasts (snaps to half-bar).",
            "<b>×</b> in the top-right corner of a card removes it.",
            "<b>CLEAR</b> button above the timeline empties the whole progression in one click &mdash; no confirm dialog. If you tap it by accident, hit <b>Ctrl+Z</b>.",
        ]),
        h2("Undo / Redo"),
        body(
            "Every add / remove / reorder / voicing change pushes onto an unlimited "
            "history stack. Use <b>Ctrl+Z</b> / <b>Ctrl+Shift+Z</b> or the &lsaquo; "
            "and &rsaquo; arrows in the top bar."
        ),
    ]


def section_voicings():
    return [
        h1("10. Progression Voicing Styles"),
        body(
            "Above the piano view in the right panel is the <b>Progression Style</b> "
            "dropdown. Picking a style applies the same voicing flavour to every "
            "chord on the timeline. Each style ships with four variants &mdash; use "
            "the &lsaquo; / &rsaquo; arrows under <b>Selected</b> to cycle them."
        ),
        info_table([
            ["Style", "Character"],
            ["Standard", "Inversion-driven triads with optional drop-2."],
            ["Cinematic", "Modern film-score wide spread: deep bass + mid-high colour tones."],
            ["Jazz Shell", "Root + 3rd + 7th + colour tone &mdash; the classic comping shape."],
            ["Piano Spread", "Left-hand root + 5th, right-hand 3-7-9 cluster (classical pianist)."],
            ["Neo Soul", "Rootless extensions, Robert Glasper feel."],
            ["Gospel", "Bass + dense right-hand cluster; great for church-key pads."],
            ["Voice Leading", "Smoothest path from the previous chord &mdash; minimal motion in the upper voices."],
            ["Open Voicing", "Wide intervals, classical orchestral spread."],
            ["Quartal", "Stacked fourths; modal jazz colour."],
            ["Quintal", "Stacked fifths; bright sus-flavoured."],
            ["Cluster", "Tight close-position, modern dissonance."],
        ]),
        tip(
            "The reshuffle button (the circular arrow next to the dropdown) keeps "
            "the same style but re-rolls every chord&rsquo;s variant. Hit it a few "
            "times if you want to taste the full range of a style without manually "
            "stepping through variants."
        ),
    ]


def section_perchord():
    return [
        h1("11. Per-Chord Editing &amp; Slash Bass"),
        body("Selecting a chord card (click anywhere on it) wires the right panel to that chord."),
        h2("Variant arrows"),
        body(
            "&lsaquo; / &rsaquo; next to <b>Selected</b> in the right panel cycles "
            "through the four variants of the current voicing style for the "
            "selected chord only &mdash; the rest of the progression is untouched."
        ),
        h2("Bass Note row"),
        body(
            "Each chord has a slash bass selector at the bottom of the right panel. "
            "Click any chromatic note to set it as the bass; click again to clear "
            "back to the chord root. The piano view marks the active bass in dusty "
            "rose so you can see at a glance where it sits."
        ),
        tip(
            "Slash bass changes the lowest sounded note <i>and</i> the MIDI export "
            "&mdash; both during playback. The chord notes themselves are not "
            "rewritten, so analysing the progression after the fact still shows "
            "the original Roman numeral."
        ),
    ]


def section_piano():
    return [
        h1("12. Piano View"),
        body(
            "The piano view in the right panel shows two distinct things depending "
            "on the mode toggle in its top-right corner:"
        ),
        info_table([
            ["Mode", "What lights up"],
            ["SCALE", "Every note that belongs to the current scale across all six octaves."],
            ["CHORD", "Only the notes of the currently selected chord, voiced exactly as it will play."],
        ]),
        h2("Colours"),
        *bullet_list([
            "<b>Dusty rose</b> &mdash; the bass note (lowest sounding pitch class of the chord).",
            "<b>Dusty teal</b> &mdash; the rest of the chord tones at their voiced positions.",
            "<b>Empty</b> (white / dark) &mdash; not part of the current chord or scale.",
        ]),
        tip(
            "Heads-up: the piano view shows the <b>theory pitches</b>, not the "
            "<b>playback pitches</b>. If you have the playback pitch shift slider "
            "at +5, the audio plays five semitones higher but the piano keeps "
            "showing the original chord. This is by design &mdash; the visual "
            "harmony stays consistent with the chord card labels."
        ),
    ]


def section_instruments():
    return [
        h1("13. Instruments"),
        body(
            "In the top bar (just left of the play button) is a pill showing the "
            "current instrument&rsquo;s icon and name. Click it to open the picker. "
            "Instruments are grouped by family (Keys, Strings, Woodwinds, Brass)."
        ),
        info_table([
            ["Instrument", "Range played", "Character"],
            ["Grand Piano", "A0 &ndash; C8", "Bright, sustained, every chord tone audible &mdash; the default for sketching."],
            ["Strings", "G2 &ndash; B4", "Soft attack, long sustain &mdash; cinematic pads."],
            ["Flute", "C4 &ndash; C7", "Pure-tone single voice; renders chords as parallel lines."],
            ["Trumpet", "F#3 &ndash; F#5", "Brassy attack &mdash; great for heroic / Epic-mood sketches."],
        ]),
        body(
            "Switching instruments is instant &mdash; samples are bundled with the "
            "plugin and loaded on demand. The first chord after a switch may have a "
            "few milliseconds of extra latency while the new instrument warms up."
        ),
        tip(
            "All four instruments are designed for clean MIDI export. The note ranges "
            "above are what plays back inside AstroHarmony &mdash; once you export to "
            "MIDI and route the file to your own sampler, every pitch in the "
            "progression is preserved at its true register."
        ),
    ]


def section_transpose():
    return [
        h1("14. Playback Pitch (Transpose)"),
        body(
            "The bottom bar carries a <b>PITCH</b> control with a slider, two step "
            "buttons (<b>&minus;</b> / <b>+</b>) and a numeric readout. Range: "
            "&minus;12 to +12 semitones."
        ),
        body(
            "Pitch shift is <b>playback-only</b>. It changes what comes out of the "
            "speakers and what lands in the exported MIDI file &mdash; nothing else."
        ),
        info_table([
            ["Stays the same", "Changes"],
            ["Chord names on the timeline", "Audio playback"],
            ["Notes on the piano view", "MIDI export pitch"],
            ["Suggested chords", ""],
            ["Diatonic / suspended chord rows", ""],
            ["Scale picker / mode picker", ""],
        ]),
        tip(
            "Double-click anywhere on the pitch slider to snap it back to 0. "
            "Useful when you&rsquo;ve been auditioning a key change and want to "
            "compare against the original."
        ),
    ]


def section_projects():
    return [
        h1("15. Projects: Save, Load, Duplicate"),
        body(
            "The top-left <b>Projects ▾</b> menu manages all your sessions, stored "
            "as JSON files in <font face='Courier'>%APPDATA%\\AstroHarmony\\sessions\\</font>. "
            "Standalone and VST3 share the same folder &mdash; a project saved in "
            "Standalone shows up in the DAW the next time you open the plugin window."
        ),
        h2("Saving"),
        *bullet_list([
            "<b>Save</b> button (next to Projects) overwrites the active session.",
            "<b>Save current as new&hellip;</b> at the bottom of the Projects menu opens a dialog asking for a name, then snapshots everything into a fresh session.",
        ]),
        h2("Per-session menu"),
        body("Hover any session row in the Projects menu and three icons appear:"),
        *bullet_list([
            "<b>Rename</b> in place.",
            "<b>Duplicate</b> (the copy is suffixed &ldquo;(copy)&rdquo;).",
            "<b>Delete</b> &mdash; opens a small in-app confirmation modal styled to match the rest of the UI. Press <b>Enter</b> to confirm, <b>Esc</b> to cancel.",
        ]),
        body(
            "Sessions remember <b>everything</b>: progression, mood, scale, voicing "
            "style and per-chord variants, instrument, playback pitch, tempo, loop "
            "state, and piano-view mode."
        ),
        h2("Starter projects"),
        body(
            "Fresh installs ship with three example sessions that you can edit, "
            "duplicate or delete freely:"
        ),
        info_table([
            ["Name", "Style"],
            ["Sad01",  "A Aeolian &middot; Piano Spread &middot; 100 BPM &middot; Piano"],
            ["Epic01", "D# Ionian &middot; Cinematic &middot; 219 BPM &middot; Trumpet"],
            ["Love01", "F Ionian &middot; Neo Soul &middot; 219 BPM &middot; Flute"],
        ]),
        tip(
            "The session folder is left alone by the uninstaller. Reinstalling, "
            "upgrading to a future version, or moving the install location all keep "
            "your projects intact."
        ),
    ]


def section_midi():
    return [
        h1("16. MIDI Export &amp; Drag-Out"),
        body(
            "AstroHarmony offers two ways to get a progression out as MIDI. Both "
            "produce identical Standard MIDI Files (Type 0)."
        ),
        h2("Method 1: Click EXPORT MIDI"),
        body(
            "Click the <b>EXPORT MIDI</b> button in the bottom right corner. A Save "
            "dialog opens; pick a folder and filename. The file is written and the "
            "dialog closes &mdash; that&rsquo;s it. Use this when you want a long-lived "
            ".mid file you can keep, version, or send to a collaborator."
        ),
        h2("Method 2: Drag the EXPORT MIDI button onto a DAW track"),
        body(
            "Press and hold the <b>EXPORT MIDI</b> button, then drag &mdash; the cursor "
            "switches to a drag-and-drop icon. Release the mouse over an empty area of "
            "an instrument track in your DAW. AstroHarmony writes the file to "
            "<font face='Courier'>%TEMP%\\AstroHarmony\\</font> and hands it to the DAW "
            "as an OS-level file drag. Your DAW imports it as if you had dragged a "
            ".mid file from File Explorer."
        ),
        tip(
            "The drag is triggered after 5 pixels of mouse movement. A normal click "
            "(no movement) still opens the Save dialog. So both workflows live on the "
            "same button without one stealing from the other."
        ),
        h2("What&rsquo;s in the file"),
        *bullet_list([
            "<b>Track name</b> &mdash; the project&rsquo;s name (e.g. &ldquo;Sad01&rdquo;).",
            "<b>Tempo meta-event</b> &mdash; the BPM displayed in the top bar.",
            "<b>Time signature</b> &mdash; 4/4 with quarter-note pulse.",
            "<b>Note events</b> &mdash; one note-on per voiced pitch at the start of each chord, one note-off at the end of its bar count.",
            "<b>Transpose offset</b> &mdash; applied to every note so the file matches what you heard.",
        ]),
        h2("Filename"),
        body(
            "The default filename is the project name &ldquo;slugified&rdquo; &mdash; "
            "lowercased, spaces &rarr; dashes, special characters stripped. So a "
            "project called <i>Epic Hero 01</i> downloads as "
            "<font face='Courier'>epic-hero-01.mid</font>. Untitled projects fall "
            "back to <font face='Courier'>untitled.mid</font>."
        ),
    ]


def section_settings():
    return [
        h1("17. Settings"),
        body(
            "The gear icon (⚙) on the far right of the top bar opens a small "
            "About popover. It shows:"
        ),
        *bullet_list([
            "<b>AstroHarmony</b> &mdash; product name and tagline (&ldquo;Chord-progression composer.&rdquo;).",
            "<b>Build</b> &mdash; the version string of the plugin you are running. Include this in any bug report.",
            "<b>Copyright</b> &mdash; © 2026 Astrotone Audio.",
        ]),
        body(
            "Full sample credits and open-source-library attribution are reproduced "
            "in <font face='Courier'>LICENSE.txt</font>, shown during install and "
            "available afterwards from the Start Menu (<b>AstroHarmony &rarr; "
            "License Agreement</b>) or directly from the install folder."
        ),
        body("Closing the popover: click outside it, hit Escape, or click the × in its top-right corner."),
        h2("Standalone-only: audio device settings"),
        body(
            "When running the Standalone, an extra <b>Options</b> menu in the top "
            "menu bar exposes the host&rsquo;s audio device settings &mdash; output "
            "device, sample rate, buffer size, MIDI input device. These are JUCE&rsquo;s "
            "standard standalone-host controls. The VST3 version inherits these settings "
            "from your DAW and exposes none of its own."
        ),
    ]


def section_shortcuts():
    return [
        h1("18. Keyboard &amp; Mouse Shortcuts"),
        info_table([
            ["Action", "Shortcut"],
            ["Undo last edit", "Ctrl+Z"],
            ["Redo last edit", "Ctrl+Shift+Z"],
            ["Save current session", "Click the Save button in the top bar"],
            ["Close any popover / modal", "Esc"],
            ["Confirm rename / save-as / delete", "Enter"],
            ["Reorder chord cards", "Drag horizontally"],
            ["Resize chord bars", "Drag the right edge of a card"],
            ["Reset pitch slider", "Double-click on the slider"],
            ["Cycle voicing variants (selected chord)", "&lsaquo; / &rsaquo; in the right panel"],
            ["Export MIDI to disk", "Click EXPORT MIDI"],
            ["Drag MIDI into DAW", "Press &amp; drag EXPORT MIDI onto a track"],
        ], col_widths=[FRAME_WIDTH * 0.60, FRAME_WIDTH * 0.40]),
    ]


def section_troubleshooting():
    return [
        h1("19. Troubleshooting"),

        h2("Windows SmartScreen blocks the installer"),
        body(
            "The installer is not yet EV-code-signed. Click <b>More info</b> &rarr; "
            "<b>Run anyway</b>. The block will disappear automatically once enough "
            "users have installed the same file (Microsoft tracks installer "
            "reputation per hash)."
        ),

        h2("The activation screen keeps reappearing"),
        body(
            "Your local key cache (<font face='Courier'>%APPDATA%\\AstroHarmony\\license.txt</font>) "
            "was cleared. Paste your licence key again &mdash; the same key works on "
            "the same machine forever (up to 3 devices per purchase)."
        ),

        h2("Plugin doesn&rsquo;t appear in my DAW after install"),
        *bullet_list([
            "Confirm the file exists at <font face='Courier'>C:\\Program Files\\Common Files\\VST3\\AstroHarmony.vst3</font>.",
            "In your DAW&rsquo;s plugin preferences, force a full re-scan (FL: <b>Options &rarr; Manage plugins &rarr; Find more plugins</b>).",
            "Some DAWs cache plugin metadata. If you rebuilt or reinstalled with a different version, delete the stale entry from the DAW&rsquo;s plugin list before rescanning.",
        ]),

        h2("FL Studio shows AstroHarmony as an effect, not an instrument"),
        body(
            "FL Studio decides plugin type from the VST3 metadata. AstroHarmony is "
            "declared as <b>Instrument | Synth | Sampler</b>, but FL sometimes mis-"
            "classifies on the first scan after a new install. Fix: in <b>Manage "
            "plugins</b>, find AstroHarmony, right-click &rarr; <b>Set as Generator</b>. "
            "FL remembers the choice for future projects."
        ),

        h2("FL Studio says &ldquo;Vendor: unknown&rdquo;"),
        body(
            "Same root cause &mdash; cached metadata from an older build. Delete the "
            "AstroHarmony entry from <b>Manage plugins</b>, then <b>Find more plugins</b> "
            "to force a fresh scan. The vendor should read <b>Astrotone Audio</b>."
        ),

        h2("Clicks when changing chords quickly"),
        body(
            "DAWs with very small audio buffer sizes (under 256 samples) can produce "
            "click artefacts on rapid chord changes. The plugin uses a 3 ms fade on "
            "same-note retriggers to suppress this, but extreme low-latency settings "
            "may still leak through."
        ),
        *bullet_list([
            "Raise the audio buffer in your DAW&rsquo;s ASIO settings to <b>256</b> or <b>512</b> samples.",
            "If you need low latency for live performance, switch to a softer-attack instrument (Strings, Flute).",
            "Standalone running on Windows&rsquo; default WASAPI driver has its own buffer; raise it under <b>Options &rarr; Audio/MIDI Settings</b>.",
        ]),

        h2("Plugin window is blank / shows a white box"),
        body(
            "The user interface is rendered by Microsoft Edge WebView2. If the "
            "Runtime is missing, the host area appears blank. Re-run the installer "
            "&mdash; it will detect the missing Runtime and offer to install it. "
            "Alternatively, install it manually from Microsoft (search "
            "<i>WebView2 Runtime download</i>)."
        ),

        h2("&ldquo;Plug-in scan failed&rdquo; on a clean Windows install"),
        body(
            "Usually means the WebView2 Runtime is missing. Install it (see previous "
            "tip) and re-scan. If the scan still fails, check that the .vst3 bundle "
            "is the full folder including the <font face='Courier'>Contents\\x86_64-win</font> "
            "subfolder and not just the inner binary &mdash; some file-copy tools strip the "
            "bundle structure."
        ),

        h2("Chord is missing some notes on the piano view"),
        body(
            "Earlier builds had trouble with double-accidental spellings (G##, Dbb) "
            "and unicode sharps. This release normalises every spelling before the "
            "piano renderer sees it, so all chord tones should light up. If you spot "
            "a missing note, please send the chord name and the mode to support."
        ),

        h2("MIDI export sounds wrong in my DAW"),
        body(
            "Two common causes: <b>(1)</b> your DAW track is loaded with an "
            "instrument whose range doesn&rsquo;t cover the exported pitches "
            "(common with brass libraries that won&rsquo;t play below E2); "
            "<b>(2)</b> you exported with the playback pitch slider not at zero "
            "and you didn&rsquo;t realise &mdash; the file is correctly "
            "transposed but in a different key from what the timeline labels."
        ),

        h2("Drag-out from EXPORT MIDI doesn&rsquo;t land on the track"),
        body(
            "AstroHarmony hands the file to your DAW as an OS-level file drop. "
            "If the DAW&rsquo;s arrange view doesn&rsquo;t accept it, drop instead "
            "onto the DAW&rsquo;s File Browser pane and drag from there. The .mid "
            "file is always also written to <font face='Courier'>%TEMP%\\AstroHarmony\\</font> "
            "so you can pick it up manually if all else fails."
        ),
    ]


def section_license_summary():
    return [
        h1("20. License Terms (Summary)"),
        body(
            "AstroHarmony is licensed, not sold. The full End User License Agreement "
            "is shown during installation, must be accepted to proceed, and is also "
            "installed as <font face='Courier'>LICENSE.txt</font> in the application folder."
        ),
        h2("What you can do"),
        *bullet_list([
            "Install on up to <b>three (3) devices</b> you own.",
            "Use the plugin and/or the Standalone for any lawful purpose, including <b>commercial</b> work (film, game, music release, beat sales).",
            "Keep full ownership of every chord progression, MIDI export and audio bounce you produce. The Licensor claims nothing in your output.",
        ]),
        h2("What you may not do"),
        *bullet_list([
            "Resell, redistribute or sublicense the software itself.",
            "Reverse-engineer or modify the binary.",
            "Share your licence key with anyone else.",
            "Extract, repackage or redistribute the bundled audio samples as a sample library.",
        ]),
        h2("Refund &amp; right of withdrawal (EU / UK)"),
        body(
            "EU and UK consumers have a statutory 14-day right of withdrawal under "
            "EU Directive 2011/83/EU. <b>Activating</b> the Software on any device "
            "within that window starts the &ldquo;immediate performance&rdquo; "
            "clause &mdash; per Article 16(m), the right of withdrawal ends at "
            "that moment. <b>Unactivated</b> copies remain refundable within the "
            "14-day window upon written request to "
            "<font face='Courier'>info@astrotoneaudio.com</font>."
        ),
        h2("Privacy"),
        body(
            "The Software does not collect or transmit personal data. Everything "
            "lives locally: projects in <font face='Courier'>%APPDATA%\\AstroHarmony\\sessions\\</font>, "
            "licence key in <font face='Courier'>%APPDATA%\\AstroHarmony\\license.txt</font>. "
            "No telemetry, no analytics, no &ldquo;phone home&rdquo; after activation."
        ),
        h2("Governing law"),
        body(
            "The EULA is governed by the laws of the Republic of Lithuania. "
            "Disputes are heard by the competent courts of Lithuania, except "
            "where mandatory consumer-protection law of your country of "
            "residence provides otherwise."
        ),
        body(
            "VST is a trademark of Steinberg Media Technologies GmbH, registered "
            "in Europe and other countries."
        ),
    ]


def section_support():
    return [
        h1("21. Support &amp; Contact"),
        body("All questions, refund requests, bug reports and licence enquiries go to a single inbox:"),
        Spacer(1, 0.3 * cm),
        Paragraph(
            "<font size='13' color='#5a7d82'><b>info@astrotoneaudio.com</b></font>",
            STYLES["Body"],
        ),
        Spacer(1, 0.3 * cm),
        body("When emailing about a bug, please include:"),
        *bullet_list([
            "Your Windows version (10 or 11, and the build number from <font face='Courier'>winver</font>).",
            "Your DAW and its version (or &ldquo;Standalone&rdquo; if you ran the app directly).",
            "The plugin build, visible under the gear icon &rarr; <b>About &rarr; Build</b>.",
            "A short description of the steps that triggered the issue.",
            "If relevant, the project file (drag-export it as MIDI and attach the .mid).",
        ]),
        Spacer(1, 0.6 * cm),
        Paragraph(
            "<i>Thank you for using AstroHarmony.</i><br/>"
            "<i>&mdash; Astrotone Audio</i>",
            ParagraphStyle(
                "Sign", parent=STYLES["Body"],
                fontSize=11, leading=18, alignment=TA_CENTER,
                textColor=ACCENT, spaceBefore=20,
            ),
        ),
    ]


# Document assembly -------------------------------------------------------
def build_pdf(output_path: Path):
    doc = BaseDocTemplate(
        str(output_path),
        pagesize=A4,
        title="AstroHarmony — User Manual",
        author="Astrotone Audio",
        subject="AstroHarmony VST3 + Standalone user manual",
        creator="Astrotone Audio",
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
    )

    frame_full = Frame(
        0, 0, PAGE_WIDTH, PAGE_HEIGHT,
        leftPadding=0, rightPadding=0,
        topPadding=0, bottomPadding=0,
        showBoundary=0, id="cover",
    )
    frame_content = Frame(
        MARGIN_X, MARGIN_BOTTOM, FRAME_WIDTH, FRAME_HEIGHT,
        leftPadding=0, rightPadding=0,
        topPadding=0, bottomPadding=0,
        showBoundary=0, id="content",
    )

    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[frame_full], onPage=_cover_page),
        PageTemplate(id="Content", frames=[frame_content], onPage=_content_page),
    ])

    story = []
    story.extend(build_cover())
    story.append(NextPageTemplate("Content"))
    story.append(PageBreak())

    sections = [
        build_toc,
        section_welcome,
        section_install,
        section_daw,
        section_workspace,
        section_mood,
        section_scale,
        section_diatonic,
        section_suggestions,
        section_building,
        section_voicings,
        section_perchord,
        section_piano,
        section_instruments,
        section_transpose,
        section_projects,
        section_midi,
        section_settings,
        section_shortcuts,
        section_troubleshooting,
        section_license_summary,
        section_support,
    ]
    for i, section in enumerate(sections):
        story.extend(section())
        if i < len(sections) - 1:
            story.append(PageBreak())

    doc.build(story)


if __name__ == "__main__":
    out = Path(__file__).parent / "AstroHarmony-User-Manual.pdf"
    build_pdf(out)
    print(f"Wrote {out} ({out.stat().st_size / 1024:.1f} KB)")
