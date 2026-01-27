using Microsoft.Win32;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Manages Windows auto-start (Run at login) functionality via Registry.
/// </summary>
public static class AutoStartHelper
{
    private const string RegistryKeyPath = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    private const string AppName = "Clawdbot";
    
    /// <summary>
    /// Checks if auto-start is currently enabled.
    /// </summary>
    public static bool IsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKeyPath, false);
            var value = key?.GetValue(AppName);
            return value != null;
        }
        catch (Exception ex)
        {
            AppLogger.Warn($"Failed to check auto-start status: {ex.Message}");
            return false;
        }
    }
    
    /// <summary>
    /// Enables auto-start by adding Registry entry.
    /// </summary>
    public static bool Enable()
    {
        try
        {
            var exePath = GetExecutablePath();
            if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
            {
                AppLogger.Error($"Cannot enable auto-start: executable not found at {exePath}");
                return false;
            }
            
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKeyPath, true);
            if (key == null)
            {
                AppLogger.Error("Failed to open Registry key for auto-start");
                return false;
            }
            
            // Add quotes around path in case it contains spaces
            key.SetValue(AppName, $"\"{exePath}\" --minimized");
            
            AppLogger.Info($"Auto-start enabled: {exePath}");
            return true;
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to enable auto-start: {ex.Message}");
            return false;
        }
    }
    
    /// <summary>
    /// Disables auto-start by removing Registry entry.
    /// </summary>
    public static bool Disable()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKeyPath, true);
            if (key == null)
            {
                AppLogger.Warn("Registry key not found for auto-start");
                return true; // Already disabled
            }
            
            if (key.GetValue(AppName) != null)
            {
                key.DeleteValue(AppName);
                AppLogger.Info("Auto-start disabled");
            }
            
            return true;
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to disable auto-start: {ex.Message}");
            return false;
        }
    }
    
    /// <summary>
    /// Sets auto-start enabled/disabled based on the parameter.
    /// </summary>
    public static bool SetEnabled(bool enabled)
    {
        return enabled ? Enable() : Disable();
    }
    
    /// <summary>
    /// Gets the path to the current executable.
    /// </summary>
    private static string GetExecutablePath()
    {
        // Get the entry assembly location
        var entryAssembly = System.Reflection.Assembly.GetEntryAssembly();
        if (entryAssembly != null)
        {
            var location = entryAssembly.Location;
            
            // If running via dotnet, the location will be the DLL, not the EXE
            // Try to find the corresponding .exe
            if (location.EndsWith(".dll", StringComparison.OrdinalIgnoreCase))
            {
                var exePath = Path.ChangeExtension(location, ".exe");
                if (File.Exists(exePath))
                {
                    return exePath;
                }
            }
            
            return location;
        }
        
        // Fallback: use process path
        return Environment.ProcessPath ?? string.Empty;
    }
}
