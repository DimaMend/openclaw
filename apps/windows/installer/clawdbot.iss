; Clawdbot Windows Companion - Inno Setup Script
; Download Inno Setup from: https://jrsoftware.org/isdl.php

#define MyAppName "Clawdbot"
#define MyAppVersion "2025.1.25"
#define MyAppPublisher "Clawdbot"
#define MyAppURL "https://clawd.bot"
#define MyAppExeName "Clawdbot.exe"

[Setup]
; NOTE: AppId uniquely identifies this application
AppId={{8E7B9A42-F3D8-4C91-B5E6-1A2B3C4D5E6F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/updates
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Output settings
OutputDir=..\dist
OutputBaseFilename=ClawdbotSetup-{#MyAppVersion}
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
; Require admin for Program Files install
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; Visual settings
SetupIconFile=..\src\Clawdbot.Windows\Assets\clawdbot.ico
WizardStyle=modern
; Minimum Windows version (Windows 10 1903)
MinVersion=10.0.18362

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Start Clawdbot when Windows starts"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
; Main application files from publish folder
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
; Start menu
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
; Desktop (optional)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Auto-start on login (if selected)
Root: HKCU; Subkey: "SOFTWARE\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Clawdbot"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startupicon

[Run]
; Option to launch after install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop the app before uninstall
Filename: "taskkill"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden; RunOnceId: "StopClawdbot"

[UninstallDelete]
; Clean up app data (optional - ask user?)
; Type: filesandordirs; Name: "{localappdata}\Clawdbot"

[Code]
// Check for .NET 9 runtime (framework-dependent builds only)
function IsDotNet9Installed: Boolean;
var
  ResultCode: Integer;
begin
  // Try to run dotnet --list-runtimes and check for 9.0
  Result := Exec('dotnet', '--list-runtimes', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function InitializeSetup: Boolean;
begin
  Result := True;
  
  // Uncomment for framework-dependent builds:
  // if not IsDotNet9Installed then
  // begin
  //   if MsgBox('Clawdbot requires .NET 9.0 Runtime.'#13#13'Would you like to download it now?', 
  //             mbConfirmation, MB_YESNO) = IDYES then
  //   begin
  //     ShellExec('open', 'https://dotnet.microsoft.com/download/dotnet/9.0', '', '', SW_SHOW, ewNoWait, ResultCode);
  //   end;
  //   Result := False;
  // end;
end;
