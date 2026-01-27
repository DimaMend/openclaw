using System.Media;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Plays Windows notification sounds for various events.
/// </summary>
public static class NotificationSounds
{
    /// <summary>
    /// Play when an exec approval request arrives.
    /// </summary>
    public static void PlayApprovalRequest()
    {
        PlaySystemSound(SystemSounds.Exclamation);
    }
    
    /// <summary>
    /// Play when approval is granted.
    /// </summary>
    public static void PlayApprovalGranted()
    {
        PlaySystemSound(SystemSounds.Asterisk);
    }
    
    /// <summary>
    /// Play when approval is denied.
    /// </summary>
    public static void PlayApprovalDenied()
    {
        PlaySystemSound(SystemSounds.Hand);
    }
    
    /// <summary>
    /// Play when Gateway connects successfully.
    /// </summary>
    public static void PlayConnected()
    {
        PlaySystemSound(SystemSounds.Asterisk);
    }
    
    /// <summary>
    /// Play when Gateway disconnects.
    /// </summary>
    public static void PlayDisconnected()
    {
        PlaySystemSound(SystemSounds.Exclamation);
    }
    
    /// <summary>
    /// Play a generic notification sound.
    /// </summary>
    public static void PlayNotification()
    {
        PlaySystemSound(SystemSounds.Asterisk);
    }
    
    /// <summary>
    /// Play an error sound.
    /// </summary>
    public static void PlayError()
    {
        PlaySystemSound(SystemSounds.Hand);
    }
    
    private static void PlaySystemSound(SystemSound sound)
    {
        try
        {
            sound.Play();
        }
        catch (Exception ex)
        {
            AppLogger.Debug($"Failed to play system sound: {ex.Message}");
        }
    }
}
