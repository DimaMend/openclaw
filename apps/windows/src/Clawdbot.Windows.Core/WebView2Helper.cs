using Microsoft.Win32;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Helper for WebView2 runtime detection
/// </summary>
public static class WebView2Helper
{
    /// <summary>
    /// Checks if WebView2 Runtime is installed
    /// </summary>
    public static bool IsWebView2RuntimeInstalled()
    {
        // Check for WebView2 Runtime in registry (both 32-bit and 64-bit)
        var version = GetWebView2Version();
        return version != null;
    }

    /// <summary>
    /// Gets the installed WebView2 Runtime version
    /// </summary>
    public static string? GetWebView2Version()
    {
        // Try 64-bit location
        var version = GetRegistryValue(
            @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "pv",
            RegistryView.Registry64);

        if (version != null)
            return version;

        // Try 32-bit location
        version = GetRegistryValue(
            @"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "pv",
            RegistryView.Registry64);

        if (version != null)
            return version;

        // Try default view
        version = GetRegistryValue(
            @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "pv",
            RegistryView.Default);

        return version;
    }

    private static string? GetRegistryValue(string subKey, string valueName, RegistryView view)
    {
        try
        {
            using var key = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view);
            using var subKeyHandle = key.OpenSubKey(subKey);
            return subKeyHandle?.GetValue(valueName)?.ToString();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the download URL for WebView2 Runtime
    /// </summary>
    public static string GetDownloadUrl()
    {
        return "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
    }

    /// <summary>
    /// Opens the WebView2 download page in the default browser
    /// </summary>
    public static void OpenDownloadPage()
    {
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = GetDownloadUrl(),
            UseShellExecute = true
        });
    }
}
