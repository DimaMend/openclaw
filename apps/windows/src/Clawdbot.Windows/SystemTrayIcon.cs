using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using Clawdbot.Windows.Core;
using Hardcodet.Wpf.TaskbarNotification;

namespace Clawdbot.Windows;

/// <summary>
/// System tray icon with context menu for Clawdbot
/// </summary>
public class SystemTrayIcon : IDisposable
{
    private readonly TaskbarIcon _trayIcon;
    private readonly GatewayChannel _gateway;
    private readonly AppSettings _settings;
    private MenuItem? _statusMenuItem;
    private MenuItem? _connectMenuItem;
    private readonly Icon? _baseIcon;

    public event EventHandler? ExitRequested;
    public event EventHandler? ShowWindowRequested;
    public event EventHandler? SettingsRequested;

    public SystemTrayIcon(GatewayChannel gateway, AppSettings settings)
    {
        _gateway = gateway;
        _settings = settings;

        // Try to load icon from file
        _baseIcon = LoadIconFromFile();
        AppLogger.Debug($"Base icon loaded: {_baseIcon != null}");

        // Create tray icon
        _trayIcon = new TaskbarIcon
        {
            ToolTipText = "Clawdbot - Disconnected",
            Icon = _baseIcon ?? CreateFallbackIcon(GatewayState.Disconnected),
            ContextMenu = CreateContextMenu()
        };

        // Double-click opens main window
        _trayIcon.TrayMouseDoubleClick += (_, _) => ShowWindowRequested?.Invoke(this, EventArgs.Empty);
        
        AppLogger.Debug("TaskbarIcon created");
    }

    public void UpdateStatus(GatewayState state, string? message = null)
    {
        var statusText = state switch
        {
            GatewayState.Connected => "Connected",
            GatewayState.Connecting => "Connecting...",
            GatewayState.Reconnecting => "Reconnecting...",
            GatewayState.Disconnected => message ?? "Disconnected",
            _ => "Unknown"
        };

        _trayIcon.ToolTipText = $"Clawdbot - {statusText}";
        
        // Use base icon if available, otherwise create fallback
        _trayIcon.Icon = _baseIcon ?? CreateFallbackIcon(state);

        if (_statusMenuItem != null)
        {
            _statusMenuItem.Header = $"Status: {statusText}";
        }

        if (_connectMenuItem != null)
        {
            _connectMenuItem.Header = state == GatewayState.Connected ? "Disconnect" : "Connect";
            _connectMenuItem.IsEnabled = state != GatewayState.Connecting && state != GatewayState.Reconnecting;
        }

        // Show balloon notification on disconnect
        if (state == GatewayState.Disconnected && message != null)
        {
            _trayIcon.ShowBalloonTip(
                "Clawdbot",
                $"Gateway connection lost: {message}",
                BalloonIcon.Warning);
        }
    }

    public void ShowNotification(string title, string message, BalloonIcon icon = BalloonIcon.Info)
    {
        _trayIcon.ShowBalloonTip(title, message, icon);
    }

    private ContextMenu CreateContextMenu()
    {
        var menu = new ContextMenu();

        // Status (read-only)
        _statusMenuItem = new MenuItem
        {
            Header = "Status: Disconnected",
            IsEnabled = false
        };
        menu.Items.Add(_statusMenuItem);

        menu.Items.Add(new Separator());

        // Open Window
        var openItem = new MenuItem { Header = "Open Clawdbot" };
        openItem.Click += (_, _) => ShowWindowRequested?.Invoke(this, EventArgs.Empty);
        menu.Items.Add(openItem);

        // Connect/Disconnect
        _connectMenuItem = new MenuItem { Header = "Connect" };
        _connectMenuItem.Click += OnConnectClick;
        menu.Items.Add(_connectMenuItem);

        menu.Items.Add(new Separator());

        // Gateway Status (submenu)
        var gatewayMenu = new MenuItem { Header = "Gateway" };
        
        var openControlUi = new MenuItem { Header = "Open Control UI in Browser" };
        openControlUi.Click += (_, _) =>
        {
            // Convert ws:// to http:// for browser
            var httpUrl = _settings.GatewayUrl
                .Replace("ws://", "http://")
                .Replace("wss://", "https://")
                .TrimEnd('/');
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = httpUrl,
                UseShellExecute = true
            });
        };
        gatewayMenu.Items.Add(openControlUi);
        
        var copyUrl = new MenuItem { Header = "Copy Gateway URL" };
        copyUrl.Click += (_, _) => Clipboard.SetText(_settings.GatewayUrl);
        gatewayMenu.Items.Add(copyUrl);
        
        menu.Items.Add(gatewayMenu);

        menu.Items.Add(new Separator());
        
        // Debug menu (for testing)
        #if DEBUG
        var debugMenu = new MenuItem { Header = "Debug" };
        
        var testApprovalDialog = new MenuItem { Header = "Test Approval Dialog" };
        testApprovalDialog.Click += (_, _) => ShowTestApprovalDialog();
        debugMenu.Items.Add(testApprovalDialog);
        
        menu.Items.Add(debugMenu);
        menu.Items.Add(new Separator());
        #endif

        // Settings
        var settingsItem = new MenuItem { Header = "Settings..." };
        settingsItem.Click += (_, _) => SettingsRequested?.Invoke(this, EventArgs.Empty);
        menu.Items.Add(settingsItem);

        menu.Items.Add(new Separator());

        // Exit
        var exitItem = new MenuItem { Header = "Exit" };
        exitItem.Click += (_, _) => ExitRequested?.Invoke(this, EventArgs.Empty);
        menu.Items.Add(exitItem);

        return menu;
    }

    private async void OnConnectClick(object sender, RoutedEventArgs e)
    {
        if (_gateway.State == GatewayState.Connected)
        {
            await _gateway.DisconnectAsync();
        }
        else
        {
            try
            {
                await _gateway.ConnectAsync();
            }
            catch (Exception ex)
            {
                UpdateStatus(GatewayState.Disconnected, ex.Message);
            }
        }
    }

    private static Icon? LoadIconFromFile()
    {
        try
        {
            // Get the directory where the exe is located
            var exePath = Assembly.GetExecutingAssembly().Location;
            var exeDir = Path.GetDirectoryName(exePath);
            if (exeDir == null) return null;

            var iconPath = Path.Combine(exeDir, "Assets", "clawdbot.ico");
            AppLogger.Debug($"Looking for icon at: {iconPath}");

            if (File.Exists(iconPath))
            {
                var icon = new Icon(iconPath, 16, 16);
                AppLogger.Info($"Loaded tray icon from: {iconPath}");
                return icon;
            }
            
            AppLogger.Warn($"Icon file not found at: {iconPath}");
            return null;
        }
        catch (Exception ex)
        {
            AppLogger.Error("Failed to load icon from file", ex);
            return null;
        }
    }

    private static Icon CreateFallbackIcon(GatewayState state)
    {
        // Create a simple colored icon based on state
        // In a real app, you'd use actual icon files
        var color = state switch
        {
            GatewayState.Connected => Color.LimeGreen,
            GatewayState.Connecting => Color.Yellow,
            GatewayState.Reconnecting => Color.Orange,
            GatewayState.Disconnected => Color.Red,
            _ => Color.Gray
        };

        // Create a simple 16x16 icon with the lobster emoji/shape
        var bitmap = new Bitmap(16, 16);
        using (var g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            
            // Draw a simple lobster shape (two claws and body)
            using var brush = new SolidBrush(color);
            
            // Body (center ellipse)
            g.FillEllipse(brush, 4, 6, 8, 8);
            
            // Left claw
            g.FillEllipse(brush, 0, 2, 6, 5);
            
            // Right claw
            g.FillEllipse(brush, 10, 2, 6, 5);
        }

        return Icon.FromHandle(bitmap.GetHicon());
    }
    
    #if DEBUG
    private void ShowTestApprovalDialog()
    {
        AppLogger.Info("Showing test approval dialog");
        
        var testRequest = new GatewayExecApprovalRequest
        {
            Id = $"test-{Guid.NewGuid():N}",
            Request = new ExecApprovalPromptRequest
            {
                Command = "npm install --save-dev typescript @types/node eslint prettier",
                Cwd = @"C:\Users\User\Projects\MyApp",
                Host = Environment.MachineName,
                Security = "ask",
                Ask = "always",
                AgentId = "claude-3.5-sonnet",
                ResolvedPath = @"C:\Program Files\nodejs\npm.cmd",
                SessionKey = "session-demo-123"
            },
            CreatedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ExpiresAtMs = DateTimeOffset.UtcNow.AddSeconds(60).ToUnixTimeMilliseconds()
        };
        
        var decision = ExecApprovalDialog.ShowApproval(testRequest);
        AppLogger.Info($"Test dialog result: {decision}");
        
        ShowNotification("Exec Approval Test", $"Decision: {decision.ToWireFormat()}", BalloonIcon.Info);
    }
    #endif

    public void Dispose()
    {
        _trayIcon.Dispose();
        GC.SuppressFinalize(this);
    }
}
