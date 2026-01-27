---
title: "Building the Windows Companion App"
summary: "Complete guide to building the Clawdbot Windows companion from scratch"
read_when:
  - Contributing to Windows companion development
  - Understanding Windows companion architecture
  - Extending the Windows app
---

# Building the Clawdbot Windows Companion App

This guide documents the complete process of building the Windows companion app for Clawdbot. It's written for developers who want to understand how it was built, contribute improvements, or use it as a reference for building similar apps.

## Overview

The Windows companion app is a native .NET 9 WPF application that:

- Runs in the system tray with connection status indicators
- Connects to the Clawdbot Gateway via WebSocket (Protocol v3)
- Shows exec approval dialogs when AI agents request to run commands
- Embeds the Control UI via WebView2
- Persists user settings to disk
- Supports auto-start on Windows login
- Plays notification sounds for important events

## Prerequisites

Before building, ensure you have:

- **Windows 10 (1903+) or Windows 11**
- **.NET 9.0 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Visual Studio 2022** (recommended) or **VS Code with C# extension**
- **WebView2 Runtime** - Ships with Windows 11, or [download for Windows 10](https://developer.microsoft.com/microsoft-edge/webview2/)

Verify your setup:

```powershell
dotnet --version
# Should show 9.0.x
```

## Architecture

The solution follows a clean 3-project structure:

```
apps/windows/
├── ClawdbotWindows.sln
├── src/
│   ├── Clawdbot.Windows/           # WPF App (UI layer)
│   │   ├── App.xaml(.cs)           # Entry point, DI setup
│   │   ├── MainWindow.xaml(.cs)    # WebView2 Control UI
│   │   ├── ExecApprovalDialog.xaml(.cs)  # Command approval UI
│   │   ├── SettingsWindow.xaml(.cs)      # Settings UI
│   │   ├── SystemTrayIcon.cs       # Tray icon + context menu
│   │   └── Assets/                 # Icons
│   │
│   ├── Clawdbot.Windows.Core/      # Business logic (no UI)
│   │   ├── GatewayChannel.cs       # WebSocket client
│   │   ├── ExecApprovalService.cs  # Approval event handling
│   │   ├── ExecApprovalModels.cs   # Request/response types
│   │   ├── AppSettings.cs          # JSON settings persistence
│   │   ├── AutoStartHelper.cs      # Windows Registry auto-start
│   │   ├── NotificationSounds.cs   # System sound playback
│   │   ├── AppLogger.cs            # File logging
│   │   └── WebView2Helper.cs       # Runtime detection
│   │
│   └── Clawdbot.Windows.Protocol/  # Gateway protocol models
│       └── GatewayModels.cs        # Protocol v3 types
│
└── tests/
    └── Clawdbot.Windows.Tests/     # xUnit tests
        ├── Phase0ValidationTests.cs
        ├── ExecApprovalTests.cs
        └── SettingsTests.cs
```

### Why This Structure?

1. **Protocol** - Isolated models that match the Gateway's TypeScript types exactly
2. **Core** - Testable business logic with no WPF dependencies
3. **Windows** - WPF-specific UI that consumes Core services

This mirrors the macOS app's ClawdbotKit/Clawdbot split.

## Build Process

### Step 1: Clone and Navigate

```powershell
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot/apps/windows
```

### Step 2: Restore and Build

```powershell
# Debug build (faster, includes debug menu)
dotnet build

# Release build (optimized)
dotnet build --configuration Release
```

### Step 3: Run Tests

```powershell
dotnet test
```

Expected output: **23 passing, 7 skipped** (skipped tests require a running Gateway)

### Step 4: Run the App

```powershell
# From apps/windows directory
dotnet run --project src\Clawdbot.Windows

# Or run the built executable
.\src\Clawdbot.Windows\bin\Release\net9.0-windows\Clawdbot.exe
```

The app starts minimized to the system tray. Look for the Clawdbot icon in your system tray (you may need to click the "^" arrow to see hidden icons).

## Development Phases

This section documents exactly how the app was built, phase by phase.

### Phase 0: Foundation (Gateway Connection)

**Goal:** Establish WebSocket connection to Gateway, validate protocol compatibility.

#### Files Created

1. **GatewayModels.cs** - Protocol types matching TypeScript schema
   ```csharp
   public record ConnectParams(
       int MinProtocol,
       int MaxProtocol,
       Dictionary<string, JsonElement> Client,
       // ...
   );
   
   public record HelloOk(
       int Protocol,
       string? Error,
       string? Gateway
   );
   ```

2. **GatewayChannel.cs** - WebSocket client with:
   - Connection state machine (Disconnected → Connecting → Connected)
   - Automatic reconnection with exponential backoff
   - Request/response correlation via message IDs
   - Event subscription (snapshot, exec approval, etc.)

3. **AppLogger.cs** - File-based logging to `%LOCALAPPDATA%\Clawdbot\logs\`

4. **Phase0ValidationTests.cs** - Integration tests for Gateway connection

#### Key Protocol Details

The Gateway uses Protocol v3 with JSON-RPC style messaging:

```json
// Request (client → gateway)
{"id": "1", "method": "config.get", "params": {}}

// Response (gateway → client)
{"id": "1", "ok": {"config": {...}, "configHash": "abc123"}}

// Event (gateway → client, no id)
{"method": "snapshot", "params": {...}}
```

### Phase 1: Core Features (Tray + Approvals)

**Goal:** System tray icon with exec approval dialogs.

#### Files Created

1. **SystemTrayIcon.cs** - Using Hardcodet.NotifyIcon.Wpf
   - Context menu with status, connect/disconnect, settings, exit
   - Double-click opens main window
   - Tooltip shows connection status

2. **ExecApprovalDialog.xaml** - WPF dialog matching macOS design
   - Command display in monospace font
   - Context details (working dir, host, agent, security level)
   - Countdown timer with progress bar
   - Three buttons: Allow Once, Always Allow, Don't Allow

3. **ExecApprovalService.cs** - Queue management
   - Handles multiple pending approvals
   - Auto-denies on timeout
   - Dispatches to UI thread

4. **MainWindow.xaml** - WebView2 embedding Control UI

#### Exec Approval Flow

```
Gateway → exec.approval event
    ↓
ExecApprovalService (queue)
    ↓
ExecApprovalDialog (UI)
    ↓
User clicks button
    ↓
GatewayChannel.SendExecApprovalResponse()
    ↓
Gateway
```

### Phase 2: Production Ready

**Goal:** Settings persistence, auto-start, notification sounds.

#### Files Created

1. **AppSettings.cs** - JSON settings
   ```csharp
   public class AppSettings
   {
       public string GatewayUrl { get; set; } = "ws://127.0.0.1:18789/";
       public bool StartOnLogin { get; set; } = false;
       public bool MinimizeToTray { get; set; } = true;
       public bool PlaySounds { get; set; } = true;
       // ...
   }
   ```
   
   Settings stored at: `%LOCALAPPDATA%\Clawdbot\settings.json`

2. **AutoStartHelper.cs** - Windows Registry integration
   ```csharp
   // Registry key: HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
   public static void Enable()
   {
       var exePath = Process.GetCurrentProcess().MainModule?.FileName;
       using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, true);
       key?.SetValue("Clawdbot", $"\"{exePath}\"");
   }
   ```

3. **NotificationSounds.cs** - Windows system sounds
   ```csharp
   public static void PlayApprovalRequest() => SystemSounds.Exclamation.Play();
   public static void PlayConnected() => SystemSounds.Asterisk.Play();
   ```

4. **SettingsWindow.xaml** - Settings UI with:
   - Gateway URL textbox
   - Checkboxes for all settings
   - Save/Cancel/Reset buttons
   - Version and path info display

#### Integration Points

In `App.xaml.cs`:
```csharp
// Load settings on startup
_settings = AppSettings.Load();

// Create channel with settings URL
_channel = new GatewayChannel(_settings.GatewayUrl);

// Play sounds on events
_channel.StateChanged += (_, state) => {
    if (_settings.PlaySounds)
    {
        if (state == GatewayState.Connected)
            NotificationSounds.PlayConnected();
    }
};
```

## Key Implementation Details

### WebSocket Connection

The `GatewayChannel` manages the WebSocket lifecycle:

```csharp
public async Task ConnectAsync()
{
    State = GatewayState.Connecting;
    
    _ws = new ClientWebSocket();
    await _ws.ConnectAsync(new Uri(_gatewayUrl), CancellationToken.None);
    
    // Send connect frame
    await SendAsync(new ConnectFrame { 
        Params = new ConnectParams { 
            MinProtocol = 3, 
            MaxProtocol = 3,
            // ...
        } 
    });
    
    // Wait for hello response
    var hello = await ReceiveHelloAsync();
    if (hello.Protocol != 3) throw new Exception("Protocol mismatch");
    
    State = GatewayState.Connected;
    
    // Start receive loop
    _ = ReceiveLoopAsync();
}
```

### Exec Approval Queue

Multiple approval requests can arrive while a dialog is open:

```csharp
private readonly Queue<ExecApprovalRequest> _pendingApprovals = new();
private ExecApprovalDialog? _currentDialog;

public void EnqueueApproval(ExecApprovalRequest request)
{
    _pendingApprovals.Enqueue(request);
    if (_currentDialog == null)
        ShowNextApproval();
}

private void ShowNextApproval()
{
    if (!_pendingApprovals.TryDequeue(out var request)) return;
    
    _currentDialog = new ExecApprovalDialog(request);
    _currentDialog.Closed += (_, _) => {
        _currentDialog = null;
        ShowNextApproval(); // Process next in queue
    };
    _currentDialog.Show();
}
```

### Settings Persistence

Settings auto-save and provide defaults for missing properties:

```csharp
public static AppSettings Load()
{
    var path = GetSettingsFilePath();
    if (!File.Exists(path)) return new AppSettings();
    
    var json = File.ReadAllText(path);
    return JsonSerializer.Deserialize<AppSettings>(json) ?? new();
}

public void Save()
{
    var path = GetSettingsFilePath();
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    
    var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { 
        WriteIndented = true 
    });
    File.WriteAllText(path, json);
}
```

## Testing

### Unit Tests (No Gateway Required)

```powershell
dotnet test --filter "Category!=Integration"
```

Tests protocol models, settings persistence, approval models.

### Integration Tests (Gateway Required)

Start the Gateway first:

```bash
# In WSL2 or Linux terminal
clawdbot gateway run --bind loopback --port 18789
```

Then run all tests:

```powershell
dotnet test
```

### Manual Testing Checklist

- [ ] App starts and shows tray icon
- [ ] Tray icon tooltip shows "Disconnected" initially
- [ ] Right-click tray shows context menu
- [ ] Settings window opens and saves correctly
- [ ] Auto-start toggle modifies registry
- [ ] Double-click tray opens main window
- [ ] With Gateway running, icon shows "Connected"
- [ ] Exec approval dialog appears for test commands (Debug menu)

## Configuration

### Settings File

Location: `%LOCALAPPDATA%\Clawdbot\settings.json`

```json
{
  "gatewayUrl": "ws://127.0.0.1:18789/",
  "startOnLogin": false,
  "minimizeToTray": true,
  "playSounds": true,
  "showConnectionNotifications": true,
  "reconnectIntervalSeconds": 5
}
```

### Logs

Location: `%LOCALAPPDATA%\Clawdbot\logs\clawdbot-YYYY-MM-DD.log`

View live:
```powershell
Get-Content "$env:LOCALAPPDATA\Clawdbot\logs\clawdbot-$(Get-Date -Format 'yyyy-MM-dd').log" -Wait
```

## Next Steps for Contributors

The following features are planned but not yet implemented. Pick one and contribute!

### Phase 3: Distribution (Priority: High)

1. **MSIX Installer**
   - Create `Package.appxmanifest`
   - Configure signing certificate
   - Add to Windows Store or sideload
   - See: [MSIX Packaging Guide](https://docs.microsoft.com/windows/msix/)

2. **MSI Installer (Alternative)**
   - Use WiX Toolset v4
   - Create `Product.wxs` with component structure
   - See: [WiX Quick Start](https://wixtoolset.org/docs/intro/)

3. **Auto-Update Mechanism**
   - Check GitHub releases API for new versions
   - Download and apply updates
   - Consider: Squirrel.Windows or custom solution

### Phase 4: Feature Parity with macOS

1. **Voice Wake Integration**
   - Windows Speech Recognition API
   - "Hey Clawdbot" wake word detection
   - Microphone permission handling

2. **Talk Mode**
   - Audio capture and streaming
   - Text-to-speech for responses
   - Push-to-talk hotkey

3. **Canvas Commands**
   - Screenshot capture (screen.*)
   - Clipboard integration
   - File drag-and-drop

4. **Global Hotkeys**
   - Register system-wide keyboard shortcuts
   - Quick actions without opening app

### Phase 5: Polish

1. **Notifications**
   - Windows Toast notifications
   - Action buttons in notifications
   - Notification history

2. **Theming**
   - Dark/light mode following Windows setting
   - Custom accent colors
   - High contrast support

3. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - High DPI scaling

### Code Generator Enhancement

The project could benefit from a C# code generator similar to the Swift one:

```
scripts/protocol-gen-csharp.ts → GatewayModels.cs
```

This would auto-generate Protocol models from TypeBox schemas, keeping Windows in sync with Gateway changes.

## Troubleshooting

### "Cannot connect to Gateway"

1. Ensure Gateway is running: `clawdbot gateway run --bind loopback --port 18789`
2. Check Gateway URL in settings matches
3. Verify no firewall blocking port 18789
4. Check logs at `%LOCALAPPDATA%\Clawdbot\logs\`

### "WebView2 not available"

1. Windows 11: Should be pre-installed
2. Windows 10: Download from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/)
3. Check: `WebView2Helper.IsWebView2Available()` returns true

### "App doesn't start"

1. Check for existing process: `Get-Process Clawdbot -ErrorAction SilentlyContinue`
2. Kill if stuck: `Stop-Process -Name Clawdbot -Force`
3. Check logs for errors

### "Tray icon not visible"

1. Click the "^" arrow in system tray to see hidden icons
2. Drag Clawdbot icon to always-visible area
3. Windows Settings → Personalization → Taskbar → System tray icons

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes in `apps/windows/`
4. Run tests: `dotnet test`
5. Submit a pull request

### Code Style

- Follow C# naming conventions (PascalCase for public members)
- Use `async`/`await` for all I/O operations
- Add XML doc comments for public APIs
- Keep files under 500 lines when practical

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] New features have tests
- [ ] README updated if needed
- [ ] No compiler warnings
- [ ] Code formatted consistently

## Resources

- [Clawdbot Documentation](https://docs.clawd.bot)
- [Gateway Protocol Reference](https://docs.clawd.bot/gateway)
- [WPF Documentation](https://docs.microsoft.com/dotnet/desktop/wpf/)
- [WebView2 Documentation](https://docs.microsoft.com/microsoft-edge/webview2/)
- [Hardcodet TaskbarIcon](https://github.com/hardcodet/wpf-notifyicon)

## License

MIT - see [LICENSE](../../../LICENSE) in the project root.
