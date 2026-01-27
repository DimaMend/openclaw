using System.Windows;
using System.Windows.Media;
using Clawdbot.Windows.Core;
using Microsoft.Web.WebView2.Core;

namespace Clawdbot.Windows;

/// <summary>
/// Main window with embedded Control UI
/// </summary>
public partial class MainWindow : Window
{
    private readonly GatewayChannel _gateway;

    public MainWindow(GatewayChannel gateway)
    {
        AppLogger.Info("MainWindow constructor started");
        InitializeComponent();
        _gateway = gateway;

        // Check WebView2 availability early
        var webView2Version = WebView2Helper.GetWebView2Version();
        AppLogger.Info($"WebView2 Runtime version: {webView2Version ?? "NOT INSTALLED"}");

        // Subscribe to state changes
        _gateway.StateChanged += OnGatewayStateChanged;

        // Initialize WebView2
        InitializeWebViewAsync();

        // Set initial status
        UpdateStatus(_gateway.State);

        // Handle window closing - hide instead of close
        Closing += (_, e) =>
        {
            AppLogger.Debug("MainWindow closing - hiding instead");
            e.Cancel = true;
            Hide();
        };
        
        AppLogger.Info("MainWindow constructor completed");
    }

    private async void InitializeWebViewAsync()
    {
        AppLogger.Info("Initializing WebView2...");
        try
        {
            // Initialize WebView2
            await WebView.EnsureCoreWebView2Async();
            AppLogger.Info("WebView2 CoreWebView2 initialized successfully");

            // Configure WebView2 settings
            WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            WebView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;

            // Handle navigation errors
            WebView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                AppLogger.Debug($"WebView2 navigation completed: Success={args.IsSuccess}, Status={args.WebErrorStatus}");
                if (!args.IsSuccess)
                {
                    ShowOverlay($"Failed to load Control UI: {args.WebErrorStatus}");
                    RetryButton.Visibility = Visibility.Visible;
                }
                else
                {
                    HideOverlay();
                }
            };

            // Handle new window requests (open in default browser)
            WebView.CoreWebView2.NewWindowRequested += (_, args) =>
            {
                AppLogger.Debug($"New window requested: {args.Uri}");
                args.Handled = true;
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = args.Uri,
                    UseShellExecute = true
                });
            };

            // Navigate if connected
            if (_gateway.State == GatewayState.Connected)
            {
                AppLogger.Info("Gateway connected, navigating to Control UI");
                WebView.Source = new Uri("http://127.0.0.1:18789/");
            }
            else
            {
                AppLogger.Info("Gateway not connected, showing waiting message");
                ShowOverlay("Waiting for Gateway connection...");
            }
        }
        catch (WebView2RuntimeNotFoundException ex)
        {
            // Specific error for missing WebView2 Runtime
            AppLogger.Error("WebView2 Runtime not found", ex);
            ShowWebView2NotInstalledError();
        }
        catch (Exception ex)
        {
            AppLogger.Error("WebView2 initialization failed", ex);
            
            // Check if it's a WebView2-related error
            if (!WebView2Helper.IsWebView2RuntimeInstalled())
            {
                ShowWebView2NotInstalledError();
            }
            else
            {
                ShowOverlay($"WebView2 initialization failed: {ex.Message}");
                RetryButton.Visibility = Visibility.Visible;
            }
        }
    }

    private void ShowWebView2NotInstalledError()
    {
        var message = "Microsoft Edge WebView2 Runtime is not installed.\n\n" +
                      "Click 'Download' to install it from Microsoft.";
        ShowOverlay(message);
        
        // Change button to download WebView2
        RetryButton.Content = "Download WebView2";
        RetryButton.Click -= RetryButton_Click;
        RetryButton.Click += (_, _) => WebView2Helper.OpenDownloadPage();
        RetryButton.Visibility = Visibility.Visible;
    }

    private void OnGatewayStateChanged(object? sender, GatewayStateChangedEventArgs e)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateStatus(e.NewState);

            if (e.NewState == GatewayState.Connected)
            {
                // Reload Control UI
                WebView.Source = new Uri("http://127.0.0.1:18789/");
            }
            else if (e.NewState == GatewayState.Disconnected)
            {
                ShowOverlay("Gateway disconnected. Waiting for reconnection...");
            }
            else if (e.NewState == GatewayState.Reconnecting)
            {
                ShowOverlay("Reconnecting to Gateway...");
            }
        });
    }

    private void UpdateStatus(GatewayState state, string? message = null)
    {
        var (color, text) = state switch
        {
            GatewayState.Connected => (Brushes.LimeGreen, "Connected"),
            GatewayState.Connecting => (Brushes.Yellow, "Connecting..."),
            GatewayState.Reconnecting => (Brushes.Orange, "Reconnecting..."),
            GatewayState.Disconnected => (Brushes.Red, message ?? "Disconnected"),
            _ => (Brushes.Gray, "Unknown")
        };

        StatusIndicator.Fill = color;
        StatusText.Text = text;

        // Update gateway info
        if (_gateway.HelloResponse?.Server != null)
        {
            var version = _gateway.HelloResponse.Server.TryGetValue("version", out var v) ? v.ToString() : "?";
            GatewayInfo.Text = $"Gateway: ws://127.0.0.1:18789 (v{version})";
        }
    }

    private void ShowOverlay(string message)
    {
        OverlayMessage.Text = message;
        OverlayPanel.Visibility = Visibility.Visible;
    }

    private void HideOverlay()
    {
        OverlayPanel.Visibility = Visibility.Collapsed;
        RetryButton.Visibility = Visibility.Collapsed;
    }

    private async void RetryButton_Click(object sender, RoutedEventArgs e)
    {
        RetryButton.Visibility = Visibility.Collapsed;
        ShowOverlay("Connecting to Gateway...");

        try
        {
            await _gateway.ConnectAsync();
        }
        catch (Exception ex)
        {
            ShowOverlay($"Connection failed: {ex.Message}");
            RetryButton.Visibility = Visibility.Visible;
        }
    }
}
