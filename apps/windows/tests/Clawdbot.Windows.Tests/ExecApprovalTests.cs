using Clawdbot.Windows.Core;

namespace Clawdbot.Windows.Tests;

/// <summary>
/// Phase 1 tests for Exec Approval functionality
/// </summary>
[Trait("Category", "Phase1")]
public class ExecApprovalTests
{
    [Fact]
    public void ExecApprovalDecision_AllowOnce_ToWireFormat_ReturnsAllowOnce()
    {
        // Act
        var wireFormat = ExecApprovalDecision.AllowOnce.ToWireFormat();
        
        // Assert
        Assert.Equal("allow-once", wireFormat);
    }
    
    [Fact]
    public void ExecApprovalDecision_AllowAlways_ToWireFormat_ReturnsAllowAlways()
    {
        // Act
        var wireFormat = ExecApprovalDecision.AllowAlways.ToWireFormat();
        
        // Assert
        Assert.Equal("allow-always", wireFormat);
    }
    
    [Fact]
    public void ExecApprovalDecision_Deny_ToWireFormat_ReturnsDeny()
    {
        // Act
        var wireFormat = ExecApprovalDecision.Deny.ToWireFormat();
        
        // Assert
        Assert.Equal("deny", wireFormat);
    }
    
    [Fact]
    public void GatewayExecApprovalRequest_IsExpired_WhenPastExpiryTime_ReturnsTrue()
    {
        // Arrange
        var request = new GatewayExecApprovalRequest
        {
            Id = "test-id",
            Request = new ExecApprovalPromptRequest
            {
                Command = "echo hello",
                Cwd = "/tmp",
                Host = "localhost",
                Security = "ask",
                Ask = "always"
            },
            CreatedAtMs = DateTimeOffset.UtcNow.AddMinutes(-5).ToUnixTimeMilliseconds(),
            ExpiresAtMs = DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeMilliseconds() // Expired 1 min ago
        };
        
        // Act & Assert
        Assert.True(request.IsExpired);
    }
    
    [Fact]
    public void GatewayExecApprovalRequest_IsExpired_WhenNotPastExpiryTime_ReturnsFalse()
    {
        // Arrange
        var request = new GatewayExecApprovalRequest
        {
            Id = "test-id",
            Request = new ExecApprovalPromptRequest
            {
                Command = "echo hello",
                Cwd = "/tmp",
                Host = "localhost",
                Security = "ask",
                Ask = "always"
            },
            CreatedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ExpiresAtMs = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeMilliseconds() // Expires in 5 min
        };
        
        // Act & Assert
        Assert.False(request.IsExpired);
    }
    
    [Fact]
    public void GatewayExecApprovalRequest_TimeRemaining_WhenNotExpired_ReturnsPositiveTimeSpan()
    {
        // Arrange
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(5);
        var request = new GatewayExecApprovalRequest
        {
            Id = "test-id",
            Request = new ExecApprovalPromptRequest
            {
                Command = "echo hello",
                Cwd = "/tmp",
                Host = "localhost",
                Security = "ask",
                Ask = "always"
            },
            CreatedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ExpiresAtMs = expiresAt.ToUnixTimeMilliseconds()
        };
        
        // Act
        var remaining = request.TimeRemaining;
        
        // Assert
        Assert.True(remaining.TotalSeconds > 0);
        Assert.True(remaining.TotalMinutes <= 5);
    }
    
    [Fact]
    public void GatewayExecApprovalRequest_TimeRemaining_WhenExpired_ReturnsZero()
    {
        // Arrange
        var request = new GatewayExecApprovalRequest
        {
            Id = "test-id",
            Request = new ExecApprovalPromptRequest
            {
                Command = "echo hello",
                Cwd = "/tmp",
                Host = "localhost",
                Security = "ask",
                Ask = "always"
            },
            CreatedAtMs = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeMilliseconds(),
            ExpiresAtMs = DateTimeOffset.UtcNow.AddMinutes(-5).ToUnixTimeMilliseconds() // Expired 5 min ago
        };
        
        // Act
        var remaining = request.TimeRemaining;
        
        // Assert
        Assert.Equal(TimeSpan.Zero, remaining);
    }
    
    [Fact]
    public void ExecApprovalPromptRequest_Properties_CanBeSetAndRetrieved()
    {
        // Arrange & Act
        var request = new ExecApprovalPromptRequest
        {
            Command = "npm install",
            Cwd = "C:\\Projects\\MyApp",
            Host = "DESKTOP-123",
            Security = "sandbox",
            Ask = "once",
            AgentId = "agent-456",
            ResolvedPath = "C:\\Program Files\\nodejs\\npm.cmd",
            SessionKey = "session-789"
        };
        
        // Assert
        Assert.Equal("npm install", request.Command);
        Assert.Equal("C:\\Projects\\MyApp", request.Cwd);
        Assert.Equal("DESKTOP-123", request.Host);
        Assert.Equal("sandbox", request.Security);
        Assert.Equal("once", request.Ask);
        Assert.Equal("agent-456", request.AgentId);
        Assert.Equal("C:\\Program Files\\nodejs\\npm.cmd", request.ResolvedPath);
        Assert.Equal("session-789", request.SessionKey);
    }
}
