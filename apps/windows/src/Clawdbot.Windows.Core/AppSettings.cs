using System.Text.Json;
using System.Text.Json.Serialization;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Application settings persisted to disk.
/// Stored at %LOCALAPPDATA%\Clawdbot\settings.json
/// </summary>
public class AppSettings
{
    private static readonly string SettingsDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Clawdbot");
    
    private static readonly string SettingsPath = Path.Combine(SettingsDirectory, "settings.json");
    
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    
    /// <summary>
    /// Gateway WebSocket URL (default: ws://127.0.0.1:18789/)
    /// </summary>
    [JsonPropertyName("gatewayUrl")]
    public string GatewayUrl { get; set; } = "ws://127.0.0.1:18789/";
    
    /// <summary>
    /// Whether to start Clawdbot when Windows starts
    /// </summary>
    [JsonPropertyName("startOnLogin")]
    public bool StartOnLogin { get; set; } = false;
    
    /// <summary>
    /// Whether to minimize to tray instead of closing when X is clicked
    /// </summary>
    [JsonPropertyName("minimizeToTray")]
    public bool MinimizeToTray { get; set; } = true;
    
    /// <summary>
    /// Whether to play notification sounds
    /// </summary>
    [JsonPropertyName("playSounds")]
    public bool PlaySounds { get; set; } = true;
    
    /// <summary>
    /// Whether to show balloon notifications for connection status changes
    /// </summary>
    [JsonPropertyName("showConnectionNotifications")]
    public bool ShowConnectionNotifications { get; set; } = true;
    
    /// <summary>
    /// Auto-reconnect interval in seconds (0 = disabled)
    /// </summary>
    [JsonPropertyName("reconnectIntervalSeconds")]
    public int ReconnectIntervalSeconds { get; set; } = 5;
    
    /// <summary>
    /// Exec approval timeout in seconds (0 = use server default)
    /// </summary>
    [JsonPropertyName("execApprovalTimeoutSeconds")]
    public int ExecApprovalTimeoutSeconds { get; set; } = 0;
    
    /// <summary>
    /// Last window position (X)
    /// </summary>
    [JsonPropertyName("windowX")]
    public double? WindowX { get; set; }
    
    /// <summary>
    /// Last window position (Y)
    /// </summary>
    [JsonPropertyName("windowY")]
    public double? WindowY { get; set; }
    
    /// <summary>
    /// Last window width
    /// </summary>
    [JsonPropertyName("windowWidth")]
    public double? WindowWidth { get; set; }
    
    /// <summary>
    /// Last window height
    /// </summary>
    [JsonPropertyName("windowHeight")]
    public double? WindowHeight { get; set; }
    
    /// <summary>
    /// Loads settings from disk, or returns default settings if file doesn't exist.
    /// </summary>
    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(SettingsPath))
            {
                var json = File.ReadAllText(SettingsPath);
                var settings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions);
                if (settings != null)
                {
                    AppLogger.Info($"Loaded settings from {SettingsPath}");
                    return settings;
                }
            }
        }
        catch (Exception ex)
        {
            AppLogger.Warn($"Failed to load settings: {ex.Message}");
        }
        
        AppLogger.Info("Using default settings");
        return new AppSettings();
    }
    
    /// <summary>
    /// Saves settings to disk.
    /// </summary>
    public void Save()
    {
        try
        {
            // Ensure directory exists
            Directory.CreateDirectory(SettingsDirectory);
            
            var json = JsonSerializer.Serialize(this, JsonOptions);
            File.WriteAllText(SettingsPath, json);
            
            AppLogger.Info($"Saved settings to {SettingsPath}");
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to save settings: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Resets settings to defaults and saves.
    /// </summary>
    public void Reset()
    {
        GatewayUrl = "ws://127.0.0.1:18789/";
        StartOnLogin = false;
        MinimizeToTray = true;
        PlaySounds = true;
        ShowConnectionNotifications = true;
        ReconnectIntervalSeconds = 5;
        ExecApprovalTimeoutSeconds = 0;
        WindowX = null;
        WindowY = null;
        WindowWidth = null;
        WindowHeight = null;
        
        Save();
        AppLogger.Info("Settings reset to defaults");
    }
    
    /// <summary>
    /// Gets the path to the settings file.
    /// </summary>
    public static string GetSettingsFilePath() => SettingsPath;
}
