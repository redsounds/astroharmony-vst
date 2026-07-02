; ============================================================================
;  AstroHarmony  --  Windows installer script (Inno Setup 6.1+)
;  Author: Astrotone Audio
;
;  Build:
;     "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer\astroharmony.iss
;
;  Output: installer\dist\AstroHarmony_Setup_1.0.0.exe
; ============================================================================

#define MyAppName        "AstroHarmony"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "Astrotone Audio"
#define MyAppURL         "https://astrotoneaudio.com"
#define MyAppSupportURL  "mailto:info@astrotoneaudio.com"
#define MyAppExeName     "AstroHarmony.exe"
#define MyAppVstName     "AstroHarmony.vst3"
#define BuildRoot        "..\build\plugins\AstroHarmony\AstroHarmony_artefacts\Release"
#define LicenseFilePath  "..\plugins\AstroHarmony\LICENSE.txt"

; Evergreen WebView2 Runtime registry GUID (per Microsoft docs)
#define WebView2Guid     "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
; Official Microsoft bootstrapper (~1.8 MB, downloads + installs the runtime)
#define WebView2BootUrl  "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

[Setup]
; A stable AppId so future installers see prior installs and upgrade in place.
AppId={{B4F8A5C9-7D3E-4F1A-9E2B-3A5C7D9F1B2E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppSupportURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppPublisher}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile={#LicenseFilePath}
OutputDir=dist
OutputBaseFilename=AstroHarmony_Setup_{#MyAppVersion}
SetupIconFile=icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#MyAppName} {#MyAppVersion}
UninstallDisplayIcon={app}\{#MyAppExeName}
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoDescription={#MyAppName} installer
MinVersion=10.0.17763
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full";       Description: "Full installation (VST3 + Standalone)"
Name: "vst3only";   Description: "VST3 plugin only"
Name: "standalone"; Description: "Standalone application only"
Name: "custom";     Description: "Custom installation"; Flags: iscustom

[Components]
Name: "vst3";       Description: "AstroHarmony VST3 plugin (for DAWs)";  Types: full vst3only custom
Name: "standalone"; Description: "AstroHarmony Standalone application";  Types: full standalone custom

[Files]
; --- VST3 plugin bundle (folder structure preserved) ------------------------
Source: "{#BuildRoot}\VST3\{#MyAppVstName}\*"; \
    DestDir: "{commoncf64}\VST3\{#MyAppVstName}"; \
    Components: vst3; \
    Flags: ignoreversion recursesubdirs createallsubdirs

; --- Standalone application -------------------------------------------------
Source: "{#BuildRoot}\Standalone\{#MyAppExeName}"; \
    DestDir: "{app}"; \
    Components: standalone; \
    Flags: ignoreversion

; --- License (always installed so {app} is never empty + always viewable) ---
Source: "{#LicenseFilePath}"; \
    DestDir: "{app}"; \
    DestName: "LICENSE.txt"; \
    Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Components: standalone
Name: "{group}\License Agreement"; Filename: "{app}\LICENSE.txt"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
; Launch the standalone after install if the user opts in (default off).
Filename: "{app}\{#MyAppExeName}"; \
    Description: "Launch {#MyAppName} now"; \
    Components: standalone; \
    Flags: nowait postinstall skipifsilent unchecked

[UninstallDelete]
; Remove the VST3 folder + the per-app dir, but leave user data
; (%APPDATA%\AstroHarmony\) untouched so sessions + license survive.
Type: filesandordirs; Name: "{commoncf64}\VST3\{#MyAppVstName}"
Type: filesandordirs; Name: "{app}"

; ============================================================================
;  WebView2 Runtime detection + bootstrap download
; ============================================================================
[Code]
var
  WebView2Page: TDownloadWizardPage;

function WebView2Missing(): Boolean;
var
  V: String;
begin
  Result := True;
  // System install (per-machine, 64-bit hive)
  if RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{#WebView2Guid}', 'pv', V) then
    if (V <> '') and (V <> '0.0.0.0') then Result := False;
  if Result then
    if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{#WebView2Guid}', 'pv', V) then
      if (V <> '') and (V <> '0.0.0.0') then Result := False;
  // Per-user install
  if Result then
    if RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{#WebView2Guid}', 'pv', V) then
      if (V <> '') and (V <> '0.0.0.0') then Result := False;
end;

procedure InitializeWizard();
begin
  WebView2Page := CreateDownloadPage(
    'Downloading prerequisite',
    'Microsoft Edge WebView2 Runtime is required and will be downloaded from Microsoft.',
    nil);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpReady) and WebView2Missing() then begin
    WebView2Page.Clear;
    WebView2Page.Add('{#WebView2BootUrl}', 'MicrosoftEdgeWebview2Setup.exe', '');
    WebView2Page.Show;
    try
      try
        WebView2Page.Download;
      except
        if MsgBox(
            'Could not download the Microsoft WebView2 Runtime:' #13#10 #13#10
            + GetExceptionMessage + #13#10 #13#10
            + 'AstroHarmony requires WebView2 to display its interface.' #13#10
            + 'Continue installing anyway?',
            mbError, MB_YESNO) = IDNO then
          Result := False;
      end;
    finally
      WebView2Page.Hide;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  BootPath: String;
begin
  if CurStep = ssPostInstall then begin
    BootPath := ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe');
    if FileExists(BootPath) then begin
      Exec(BootPath, '/silent /install', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;
