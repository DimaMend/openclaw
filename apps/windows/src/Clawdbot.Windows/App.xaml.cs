using System.Windows;
using Clawdbot.Windows.Core;

namespace Clawdbot.Windows;

/// <summary>
/// Main application entry point
/// </summary>
public partial class App : Application
{
    private AppSettings? _settings;
    private GatewayChannel? _gateway;
    private SystemTrayIcon? _trayIcon;
    private ExecApprovalService? _execApprovalService;

    /// <summary>
    /// Gets the current application settings.
    /// </summary>
    public AppSettings Settings => _settings ?? new AppSettings();

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        AppLogger.Info("Application startup initiated");
        
        // Load settings
        _settings = AppSettings.Load();
        AppLogger.Info($"Settings loaded. Gateway URL: {_settings.GatewayUrl}");

        // Set up global exception handlers
        DispatcherUnhandledException += (_, args) =>
        {
            AppLogger.Error("Unhandled UI exception", args.Exception);
            args.Handled = true;
        };
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            AppLogger.Error("Unhandled domain exception", args.ExceptionObject as Exception);
        };
        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            AppLogger.Error("Unobserved task exception", args.Exception);
            args.SetObserved();
        };

        try
        {
            // Initialize Gateway connection with URL from settings
            AppLogger.Info($"Creating GatewayChannel for {_settings.GatewayUrl}");
            _gateway = new GatewayChannel(_settings.GatewayUrl);

            // Initialize system tray
            AppLogger.Info("Creating SystemTrayIcon");
            _trayIcon = new SystemTrayIcon(_gateway, _settings);
            _trayIcon.ExitRequested += (_, _) =>
            {
                AppLogger.Info("Exit requested from tray icon");
                Shutdown();
            };
            _trayIcon.ShowWindowRequested += (_, _) =>
            {
                AppLogger.Info("Show window requested from tray icon");
                ShowMainWindow();
            };
            _trayIcon.SettingsRequested += (_, _) =>
            {
                AppLogger.Info("Settings requested from tray icon");
                ShowSettingsWindow();
            };
            _trayIcon.ShowWindowRequested += (_, _) =>
            {
                AppLogger.Info("Show window requested from tray icon");
                ShowMainWindow();
            };

            AppLogger.Info("System tray icon created successfully");

            // Try to connect to Gateway
            AppLogger.Info("Attempting to connect to Gateway");
            try
            {
                await _gateway.ConnectAsync();
                AppLogger.Info("Gateway connected successfully");
                _trayIcon.UpdateStatus(GatewayState.Connected);
            }
            catch (Exception ex)
            {
                AppLogger.Warn($"Gateway connection failed: {ex.Message}");
                _trayIcon.UpdateStatus(GatewayState.Disconnected, ex.Message);
            }

            // Subscribe to Gateway events
            _gateway.StateChanged += (_, args) =>
            {
                AppLogger.Debug($"Gateway state changed: {args.OldState} -> {args.NewState}");
                Dispatcher.Invoke(() => 
                {
                    _trayIcon?.UpdateStatus(args.NewState);
                    
                    // Play sound notification
                    if (_settings?.PlaySounds == true)
                    {
                        if (args.NewState == GatewayState.Connected)
                            NotificationSounds.PlayConnected();
                        else if (args.NewState == GatewayState.Disconnected && args.OldState == GatewayState.Connected)
                            NotificationSounds.PlayDisconnected();
                    }
                });
            };

            _gateway.EventReceived += OnGatewayEvent;
            
            // Initialize exec approval service
            AppLogger.Info("Setting up ExecApprovalService");
            _execApprovalService = new ExecApprovalService(_gateway);
            _execApprovalService.ApprovalRequested += OnExecApprovalRequested;
            
            AppLogger.Info("Application startup completed");
        }
        catch (Exception ex)
        {
            AppLogger.Error("Fatal error during startup", ex);
            MessageBox.Show($"Failed to start Clawdbot: {ex.Message}", "Clawdbot Error",
                MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(-1);
        }
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        AppLogger.Info($"Application exiting with code {e.ApplicationExitCode}");
        
        _execApprovalService?.Dispose();
        _trayIcon?.Dispose();

        if (_gateway != null)
            await _gateway.DisposeAsync();

        AppLogger.Info("Application exit complete");
        base.OnExit(e);
    }

    private void OnGatewayEvent(object? sender, GatewayEventArgs e)
    {
        // Gateway events are now handled by ExecApprovalService
        AppLogger.Debug($"Gateway event received: {e.EventName}");
    }
    
    private ExecApprovalDecision OnExecApprovalRequested(GatewayExecApprovalRequest request)
    {
        AppLogger.Info($"Showing exec approval dialog for request: {request.Id}");
        
        // Play approval request sound
        if (_settings?.PlaySounds == true)
            NotificationSounds.PlayApprovalRequest();
        
        var decision = ExecApprovalDialog.ShowApproval(request);
        
        // Play result sound
        if (_settings?.PlaySounds == true)
        {
            if (decision == ExecApprovalDecision.Deny)
                NotificationSounds.PlayApprovalDenied();
            else
                NotificationSounds.PlayApprovalGranted();
        }
        
        return decision;
    }

    private void ShowMainWindow()
    {
        if (MainWindow == null)
        {
            MainWindow = new MainWindow(_gateway!);
        }

        MainWindow.Show();
        MainWindow.Activate();
    }
    
    private void ShowSettingsWindow()
    {
        var settingsWindow = new SettingsWindow(_settings!);
        settingsWindow.Owner = MainWindow;
        var result = settingsWindow.ShowDialog();
        
        // If Gateway URL changed and user wants to reconnect
        if (result == true && _gateway != null)
        {
            _ = ReconnectGatewayAsync();
        }
    }
    
    private async Task ReconnectGatewayAsync()
    {
        try
        {
            AppLogger.Info("Reconnecting to Gateway with new URL...");
            await _gateway!.DisconnectAsync();
            
            // Create new gateway with updated URL
            var oldGateway = _gateway;
            _gateway = new GatewayChannel(_settings!.GatewayUrl);
            
            // Dispose old gateway
            await oldGateway.DisposeAsync();
            
            // Reconnect
            await _gateway.ConnectAsync();
            AppLogger.Info("Reconnected to Gateway successfully");
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to reconnect: {ex.Message}");
            _trayIcon?.UpdateStatus(GatewayState.Disconnected, ex.Message);
        }
    }
}
