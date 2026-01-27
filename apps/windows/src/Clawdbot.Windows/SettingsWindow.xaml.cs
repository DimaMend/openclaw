using System.Reflection;
using System.Windows;
using Clawdbot.Windows.Core;

namespace Clawdbot.Windows;

/// <summary>
/// Settings window for configuring Clawdbot preferences.
/// </summary>
public partial class SettingsWindow : Window
{
    private readonly AppSettings _settings;
    private readonly AppSettings _originalSettings;
    
    public SettingsWindow(AppSettings settings)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        
        // Keep a copy of original settings to detect changes
        _originalSettings = new AppSettings
        {
            GatewayUrl = settings.GatewayUrl,
            StartOnLogin = settings.StartOnLogin,
            MinimizeToTray = settings.MinimizeToTray,
            PlaySounds = settings.PlaySounds,
            ShowConnectionNotifications = settings.ShowConnectionNotifications
        };
        
        InitializeComponent();
        LoadSettings();
        
        AppLogger.Info("Settings window opened");
    }
    
    private void LoadSettings()
    {
        // Load current settings into UI
        GatewayUrlTextBox.Text = _settings.GatewayUrl;
        StartOnLoginCheckBox.IsChecked = _settings.StartOnLogin;
        MinimizeToTrayCheckBox.IsChecked = _settings.MinimizeToTray;
        PlaySoundsCheckBox.IsChecked = _settings.PlaySounds;
        ShowConnectionNotificationsCheckBox.IsChecked = _settings.ShowConnectionNotifications;
        
        // Update info section
        var version = Assembly.GetExecutingAssembly().GetName().Version;
        VersionText.Text = $"Version: {version?.Major}.{version?.Minor}.{version?.Build}";
        SettingsPathText.Text = $"Settings file: {AppSettings.GetSettingsFilePath()}";
        LogPathText.Text = $"Log file: {AppLogger.GetLogPath()}";
    }
    
    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        // Validate Gateway URL
        var gatewayUrl = GatewayUrlTextBox.Text.Trim();
        if (string.IsNullOrEmpty(gatewayUrl))
        {
            MessageBox.Show("Gateway URL cannot be empty.", "Validation Error", 
                MessageBoxButton.OK, MessageBoxImage.Warning);
            GatewayUrlTextBox.Focus();
            return;
        }
        
        if (!gatewayUrl.StartsWith("ws://") && !gatewayUrl.StartsWith("wss://"))
        {
            MessageBox.Show("Gateway URL must start with ws:// or wss://", "Validation Error",
                MessageBoxButton.OK, MessageBoxImage.Warning);
            GatewayUrlTextBox.Focus();
            return;
        }
        
        // Apply settings
        _settings.GatewayUrl = gatewayUrl;
        _settings.StartOnLogin = StartOnLoginCheckBox.IsChecked ?? false;
        _settings.MinimizeToTray = MinimizeToTrayCheckBox.IsChecked ?? true;
        _settings.PlaySounds = PlaySoundsCheckBox.IsChecked ?? true;
        _settings.ShowConnectionNotifications = ShowConnectionNotificationsCheckBox.IsChecked ?? true;
        
        // Handle auto-start Registry changes
        if (_settings.StartOnLogin != _originalSettings.StartOnLogin)
        {
            if (_settings.StartOnLogin)
            {
                if (!AutoStartHelper.Enable())
                {
                    MessageBox.Show("Failed to enable auto-start. You may need to run as administrator.", 
                        "Warning", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            else
            {
                AutoStartHelper.Disable();
            }
        }
        
        // Save to disk
        _settings.Save();
        
        AppLogger.Info("Settings saved");
        
        // Check if Gateway URL changed (requires restart)
        if (_settings.GatewayUrl != _originalSettings.GatewayUrl)
        {
            var result = MessageBox.Show(
                "Gateway URL has changed. Reconnect to the new Gateway now?",
                "Gateway URL Changed",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);
                
            if (result == MessageBoxResult.Yes)
            {
                DialogResult = true;
            }
        }
        
        Close();
    }
    
    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        AppLogger.Info("Settings cancelled");
        DialogResult = false;
        Close();
    }
    
    private void ResetButton_Click(object sender, RoutedEventArgs e)
    {
        var result = MessageBox.Show(
            "Reset all settings to their default values?",
            "Reset Settings",
            MessageBoxButton.YesNo,
            MessageBoxImage.Question);
            
        if (result == MessageBoxResult.Yes)
        {
            // Reset and reload
            _settings.Reset();
            LoadSettings();
            AppLogger.Info("Settings reset to defaults");
        }
    }
}
