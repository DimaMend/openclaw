using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Clawdbot.Windows.Core;

namespace Clawdbot.Windows;

/// <summary>
/// Exec approval dialog window - allows users to approve or deny commands.
/// Mirrors the macOS NSAlert-based approval UI.
/// </summary>
public partial class ExecApprovalDialog : Window
{
    private readonly GatewayExecApprovalRequest _request;
    private readonly DispatcherTimer _countdownTimer;
    
    /// <summary>
    /// Gets the user's decision after the dialog closes.
    /// Null if the dialog was closed without a decision (timeout or window close).
    /// </summary>
    public ExecApprovalDecision? Decision { get; private set; }
    
    /// <summary>
    /// Creates a new exec approval dialog for the given request.
    /// </summary>
    public ExecApprovalDialog(GatewayExecApprovalRequest request)
    {
        _request = request ?? throw new ArgumentNullException(nameof(request));
        
        InitializeComponent();
        
        // Populate command
        CommandTextBox.Text = request.Request.Command;
        
        // Build context details
        PopulateContext();
        
        // Set up countdown timer
        _countdownTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(1)
        };
        _countdownTimer.Tick += CountdownTimer_Tick;
        
        UpdateTimerDisplay();
        _countdownTimer.Start();
        
        // Handle keyboard shortcuts
        PreviewKeyDown += (s, e) =>
        {
            if (e.Key == System.Windows.Input.Key.Escape)
            {
                Decision = ExecApprovalDecision.Deny;
                DialogResult = false;
                Close();
                e.Handled = true;
            }
        };
        
        // Set focus to Allow Once button
        Loaded += (s, e) => AllowOnceButton.Focus();
        
        AppLogger.Info($"Showing exec approval dialog for command: {TruncateCommand(request.Request.Command)}");
    }
    
    private void PopulateContext()
    {
        var req = _request.Request;
        
        // Working directory
        if (!string.IsNullOrEmpty(req.Cwd))
        {
            AddContextRow("Working Directory", req.Cwd);
        }
        
        // Resolved path (executable)
        if (!string.IsNullOrEmpty(req.ResolvedPath))
        {
            AddContextRow("Executable", req.ResolvedPath);
        }
        
        // Host
        if (!string.IsNullOrEmpty(req.Host))
        {
            AddContextRow("Host", req.Host);
        }
        
        // Agent ID
        if (!string.IsNullOrEmpty(req.AgentId))
        {
            AddContextRow("Agent", req.AgentId);
        }
        
        // Security level
        AddContextRow("Security", FormatSecurity(req.Security));
        
        // Ask mode
        AddContextRow("Ask Mode", FormatAsk(req.Ask));
    }
    
    private void AddContextRow(string label, string value)
    {
        var row = new Grid();
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
        row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        
        var labelBlock = new TextBlock
        {
            Text = label,
            FontSize = 12,
            Foreground = FindResource("TextSecondaryBrush") as System.Windows.Media.Brush
        };
        Grid.SetColumn(labelBlock, 0);
        
        var valueBlock = new TextBlock
        {
            Text = value,
            FontSize = 12,
            Foreground = FindResource("TextPrimaryBrush") as System.Windows.Media.Brush,
            TextTrimming = TextTrimming.CharacterEllipsis,
            ToolTip = value
        };
        Grid.SetColumn(valueBlock, 1);
        
        row.Children.Add(labelBlock);
        row.Children.Add(valueBlock);
        
        // The StackPanel in XAML doesn't support Spacing in older WPF
        // Add margin to each row for spacing
        row.Margin = new Thickness(0, 0, 0, 4);
        
        ContextPanel.Children.Add(row);
    }
    
    private static string FormatSecurity(string? security)
    {
        return security?.ToLowerInvariant() switch
        {
            "sandbox" => "🛡️ Sandboxed",
            "auto" => "⚙️ Auto",
            "ask" => "❓ Ask",
            "trust" => "✅ Trusted",
            _ => security ?? "Unknown"
        };
    }
    
    private static string FormatAsk(string? ask)
    {
        return ask?.ToLowerInvariant() switch
        {
            "always" => "Always ask",
            "once" => "Ask once",
            "never" => "Never ask",
            "auto" => "Automatic",
            _ => ask ?? "Unknown"
        };
    }
    
    private void CountdownTimer_Tick(object? sender, EventArgs e)
    {
        if (_request.IsExpired)
        {
            _countdownTimer.Stop();
            AppLogger.Info("Exec approval request expired, auto-denying");
            Decision = ExecApprovalDecision.Deny;
            DialogResult = false;
            Close();
            return;
        }
        
        UpdateTimerDisplay();
    }
    
    private void UpdateTimerDisplay()
    {
        var remaining = _request.TimeRemaining;
        if (remaining.TotalSeconds <= 0)
        {
            TimerText.Text = "Expired";
            TimerText.Foreground = FindResource("TextSecondaryBrush") as System.Windows.Media.Brush;
        }
        else if (remaining.TotalSeconds <= 10)
        {
            TimerText.Text = $"Expires in {remaining.TotalSeconds:F0}s";
            TimerText.Foreground = System.Windows.Media.Brushes.OrangeRed;
        }
        else
        {
            var minutes = (int)remaining.TotalMinutes;
            var seconds = (int)(remaining.TotalSeconds % 60);
            TimerText.Text = $"Expires in {minutes}:{seconds:D2}";
        }
    }
    
    private void AllowOnceButton_Click(object sender, RoutedEventArgs e)
    {
        AppLogger.Info($"User clicked Allow Once for command: {TruncateCommand(_request.Request.Command)}");
        Decision = ExecApprovalDecision.AllowOnce;
        DialogResult = true;
        _countdownTimer.Stop();
        Close();
    }
    
    private void AllowAlwaysButton_Click(object sender, RoutedEventArgs e)
    {
        AppLogger.Info($"User clicked Always Allow for command: {TruncateCommand(_request.Request.Command)}");
        Decision = ExecApprovalDecision.AllowAlways;
        DialogResult = true;
        _countdownTimer.Stop();
        Close();
    }
    
    private void DenyButton_Click(object sender, RoutedEventArgs e)
    {
        AppLogger.Info($"User clicked Don't Allow for command: {TruncateCommand(_request.Request.Command)}");
        Decision = ExecApprovalDecision.Deny;
        DialogResult = false;
        _countdownTimer.Stop();
        Close();
    }
    
    protected override void OnClosed(EventArgs e)
    {
        _countdownTimer.Stop();
        base.OnClosed(e);
        
        // If user closed without making a decision, treat as deny
        if (Decision == null)
        {
            AppLogger.Info("Dialog closed without decision, treating as deny");
            Decision = ExecApprovalDecision.Deny;
        }
    }
    
    private static string TruncateCommand(string command, int maxLength = 50)
    {
        if (string.IsNullOrEmpty(command)) return "(empty)";
        if (command.Length <= maxLength) return command;
        return command[..(maxLength - 3)] + "...";
    }
    
    /// <summary>
    /// Shows the dialog and returns the user's decision.
    /// Must be called from the UI thread.
    /// </summary>
    public static ExecApprovalDecision ShowApproval(GatewayExecApprovalRequest request)
    {
        var dialog = new ExecApprovalDialog(request);
        dialog.ShowDialog();
        return dialog.Decision ?? ExecApprovalDecision.Deny;
    }
}
