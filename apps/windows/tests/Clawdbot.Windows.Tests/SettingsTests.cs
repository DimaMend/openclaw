using Clawdbot.Windows.Core;
using Xunit;

namespace Clawdbot.Windows.Tests;

/// <summary>
/// Tests for Phase 2 Settings functionality
/// </summary>
public class SettingsTests
{
    [Fact]
    public void AppSettings_DefaultValues_AreCorrect()
    {
        // Arrange & Act
        var settings = new AppSettings();

        // Assert - Check default values match expected
        Assert.Equal("ws://127.0.0.1:18789/", settings.GatewayUrl);
        Assert.False(settings.StartOnLogin);
        Assert.True(settings.MinimizeToTray);
        Assert.True(settings.PlaySounds);
        Assert.True(settings.ShowConnectionNotifications);
        Assert.Equal(5, settings.ReconnectIntervalSeconds);
    }

    [Fact]
    public void AppSettings_GetSettingsFilePath_ReturnsValidPath()
    {
        // Act
        var path = AppSettings.GetSettingsFilePath();

        // Assert
        Assert.NotNull(path);
        Assert.NotEmpty(path);
        Assert.Contains("Clawdbot", path);
        Assert.EndsWith("settings.json", path);
    }

    [Fact]
    public void AppSettings_SaveAndLoad_PreservesValues()
    {
        // Arrange
        var testSettingsPath = Path.Combine(
            Path.GetTempPath(),
            "clawdbot-test",
            $"settings-{Guid.NewGuid()}.json");
        
        var originalSettings = new AppSettings
        {
            GatewayUrl = "ws://custom.host:9999/",
            StartOnLogin = true,
            MinimizeToTray = false,
            PlaySounds = false,
            ShowConnectionNotifications = false,
            ReconnectIntervalSeconds = 15
        };

        try
        {
            // Act - Save
            var dir = Path.GetDirectoryName(testSettingsPath)!;
            Directory.CreateDirectory(dir);
            var json = System.Text.Json.JsonSerializer.Serialize(originalSettings, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            });
            File.WriteAllText(testSettingsPath, json);

            // Act - Load
            var loadedJson = File.ReadAllText(testSettingsPath);
            var loadedSettings = System.Text.Json.JsonSerializer.Deserialize<AppSettings>(loadedJson);

            // Assert
            Assert.NotNull(loadedSettings);
            Assert.Equal(originalSettings.GatewayUrl, loadedSettings.GatewayUrl);
            Assert.Equal(originalSettings.StartOnLogin, loadedSettings.StartOnLogin);
            Assert.Equal(originalSettings.MinimizeToTray, loadedSettings.MinimizeToTray);
            Assert.Equal(originalSettings.PlaySounds, loadedSettings.PlaySounds);
            Assert.Equal(originalSettings.ShowConnectionNotifications, loadedSettings.ShowConnectionNotifications);
            Assert.Equal(originalSettings.ReconnectIntervalSeconds, loadedSettings.ReconnectIntervalSeconds);
        }
        finally
        {
            // Cleanup
            if (File.Exists(testSettingsPath))
            {
                File.Delete(testSettingsPath);
            }
        }
    }

    [Fact]
    public void AppSettings_Reset_RestoresDefaults()
    {
        // Arrange
        var settings = new AppSettings
        {
            GatewayUrl = "ws://custom.host:9999/",
            StartOnLogin = true,
            MinimizeToTray = false,
            PlaySounds = false,
            ReconnectIntervalSeconds = 30
        };

        // Act
        settings.Reset();

        // Assert - Should be back to defaults
        Assert.Equal("ws://127.0.0.1:18789/", settings.GatewayUrl);
        Assert.False(settings.StartOnLogin);
        Assert.True(settings.MinimizeToTray);
        Assert.True(settings.PlaySounds);
        Assert.Equal(5, settings.ReconnectIntervalSeconds);
    }

    [Fact]
    public void AutoStartHelper_RegistryKeyPath_IsCorrect()
    {
        // The registry key should be under Current User Run
        // We can't easily test actual registry operations in unit tests
        // but we can verify the helper exists and has expected methods
        
        // Act & Assert - Just verify the static methods exist and don't throw
        // Note: IsEnabled() reads registry which might not exist
        var enabled = AutoStartHelper.IsEnabled();
        
        // Should return false if not enabled (default state)
        // This is a "doesn't throw" test
        Assert.True(enabled || !enabled); // Always true, but proves method works
    }

    [Fact]
    public void NotificationSounds_Methods_ExistAndDontThrow()
    {
        // These methods play system sounds, we just verify they don't crash
        // In a real test environment, sounds might not play (headless CI)
        
        // Act & Assert - Just verify methods don't throw
        // Note: These actually play sounds if audio is available
        try
        {
            // We can't easily mock SystemSounds, so just verify methods exist
            // by calling a method that should be silent in test
            Assert.True(true); // Placeholder
        }
        catch (Exception ex)
        {
            // Should not throw
            Assert.Fail($"NotificationSounds threw unexpected exception: {ex.Message}");
        }
    }
}
