namespace Clawdbot.Windows.Core;

/// <summary>
/// Request for exec approval from the Gateway
/// </summary>
public class ExecApprovalPromptRequest
{
    public required string Command { get; init; }
    public string? Cwd { get; init; }
    public string? Host { get; init; }
    public string? Security { get; init; }
    public string? Ask { get; init; }
    public string? AgentId { get; init; }
    public string? ResolvedPath { get; init; }
    public string? SessionKey { get; init; }
}

/// <summary>
/// Gateway exec approval request wrapper
/// </summary>
public class GatewayExecApprovalRequest
{
    public required string Id { get; init; }
    public required ExecApprovalPromptRequest Request { get; init; }
    public long CreatedAtMs { get; init; }
    public long ExpiresAtMs { get; init; }
    
    /// <summary>
    /// Check if the request has expired
    /// </summary>
    public bool IsExpired => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() > ExpiresAtMs;
    
    /// <summary>
    /// Time remaining until expiration
    /// </summary>
    public TimeSpan TimeRemaining
    {
        get
        {
            var remainingMs = ExpiresAtMs - DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return remainingMs > 0 ? TimeSpan.FromMilliseconds(remainingMs) : TimeSpan.Zero;
        }
    }
}

/// <summary>
/// User's decision on an exec approval request
/// </summary>
public enum ExecApprovalDecision
{
    /// <summary>
    /// Allow this command to run once
    /// </summary>
    AllowOnce,
    
    /// <summary>
    /// Allow this command and add to allowlist
    /// </summary>
    AllowAlways,
    
    /// <summary>
    /// Deny the command
    /// </summary>
    Deny
}

/// <summary>
/// Extension methods for ExecApprovalDecision
/// </summary>
public static class ExecApprovalDecisionExtensions
{
    /// <summary>
    /// Convert decision to the wire format expected by Gateway
    /// </summary>
    public static string ToWireFormat(this ExecApprovalDecision decision) => decision switch
    {
        ExecApprovalDecision.AllowOnce => "allow-once",
        ExecApprovalDecision.AllowAlways => "allow-always",
        ExecApprovalDecision.Deny => "deny",
        _ => "deny"
    };
}
