using System.Diagnostics;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Simple file-based logger for debugging
/// </summary>
public static class AppLogger
{
    private static readonly string LogPath;
    private static readonly object WriteLock = new();

    static AppLogger()
    {
        // Log to user's AppData folder
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var logDir = Path.Combine(appData, "Clawdbot", "logs");
        Directory.CreateDirectory(logDir);
        
        LogPath = Path.Combine(logDir, $"clawdbot-{DateTime.Now:yyyy-MM-dd}.log");
        
        // Log startup
        Info($"=== Clawdbot Windows Companion Started ===");
        Info($"Log path: {LogPath}");
        Info($".NET Version: {Environment.Version}");
        Info($"OS: {Environment.OSVersion}");
        Info($"Machine: {Environment.MachineName}");
    }

    public static void Info(string message)
    {
        Write("INFO", message);
    }

    public static void Debug(string message)
    {
        Write("DEBUG", message);
    }

    public static void Warn(string message)
    {
        Write("WARN", message);
    }

    public static void Error(string message, Exception? ex = null)
    {
        Write("ERROR", message);
        if (ex != null)
        {
            Write("ERROR", $"  Exception: {ex.GetType().Name}: {ex.Message}");
            Write("ERROR", $"  Stack: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Write("ERROR", $"  Inner: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
            }
        }
    }

    private static void Write(string level, string message)
    {
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var logLine = $"[{timestamp}] [{level,-5}] {message}";
        
        lock (WriteLock)
        {
            try
            {
                File.AppendAllText(LogPath, logLine + Environment.NewLine);
            }
            catch
            {
                // Ignore logging failures
            }
        }

        // Also write to debug output
        System.Diagnostics.Debug.WriteLine(logLine);
    }

    public static string GetLogPath() => LogPath;
}
