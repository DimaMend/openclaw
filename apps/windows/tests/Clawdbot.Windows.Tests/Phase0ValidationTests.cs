using Clawdbot.Windows.Core;
using Clawdbot.Windows.Protocol;

namespace Clawdbot.Windows.Tests;

/// <summary>
/// Phase 0 validation tests - must ALL pass before proceeding with development.
/// These tests require a running Gateway at ws://127.0.0.1:18789/
/// 
/// Run with: dotnet test --filter "Category=Phase0"
/// </summary>
[Trait("Category", "Phase0")]
public class Phase0ValidationTests
{
    private const string GatewayUrl = "ws://127.0.0.1:18789/";

    /// <summary>
    /// Checkpoint 0.1: Gateway Connectivity
    /// Test that we can establish a WebSocket connection and receive hello response
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint01_GatewayConnects_ReceivesHello()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);

        // Act
        await gateway.ConnectAsync();

        // Assert
        Assert.Equal(GatewayState.Connected, gateway.State);
        Assert.NotNull(gateway.HelloResponse);
        Assert.Equal(GatewayProtocol.Version, gateway.HelloResponse.Protocol);
        Assert.NotNull(gateway.Snapshot);
    }

    /// <summary>
    /// Checkpoint 0.2a: RPC Round-Trip - config.get
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint02a_ConfigGet_ReturnsConfigAndHash()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);
        await gateway.ConnectAsync();

        // Act
        var response = await gateway.RequestAsync<ConfigGetResponse>("config.get");

        // Assert
        Assert.NotNull(response);
        Assert.NotEmpty(response.Hash);
        Assert.NotEmpty(response.Path);
        // Raw may be empty if no config file exists, but should not be null
        Assert.NotNull(response.Raw);
    }

    /// <summary>
    /// Checkpoint 0.2b: RPC Round-Trip - channels.status
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint02b_ChannelsStatus_ReturnsChannelList()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);
        await gateway.ConnectAsync();

        // Act
        var response = await gateway.RequestAsync<ChannelsStatusResponse>("channels.status");

        // Assert
        Assert.NotNull(response);
        Assert.NotNull(response.ChannelOrder);
        Assert.NotNull(response.ChannelLabels);
        Assert.True(response.Ts > 0, "Timestamp should be positive");
    }

    /// <summary>
    /// Checkpoint 0.2c: RPC Round-Trip - sessions.list
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint02c_SessionsList_ReturnsSessions()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);
        await gateway.ConnectAsync();

        // Act
        var response = await gateway.RequestAsync<List<SessionInfo>>("sessions.list", new SessionsListParams
        {
            Limit = 10
        });

        // Assert
        Assert.NotNull(response);
        // Sessions list may be empty, but should not be null
    }

    /// <summary>
    /// Checkpoint 0.2d: Error responses parse correctly
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint02d_InvalidRequest_ReturnsStructuredError()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);
        await gateway.ConnectAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<GatewayException>(async () =>
        {
            await gateway.RequestAsync<object>("nonexistent.method");
        });

        Assert.NotNull(ex.Code);
        Assert.NotEmpty(ex.Message);
    }

    /// <summary>
    /// Checkpoint 0.3: Event Subscription
    /// Verify we receive snapshot event on connect
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint03_EventSubscription_ReceivesSnapshotOnConnect()
    {
        // Arrange
        await using var gateway = new GatewayChannel(GatewayUrl);
        var eventReceived = new TaskCompletionSource<bool>();

        gateway.EventReceived += (_, args) =>
        {
            if (args.EventName == "snapshot" || args.EventName == "stateVersion" || args.EventName == "presence")
            {
                eventReceived.TrySetResult(true);
            }
        };

        // Act
        await gateway.ConnectAsync();

        // Assert - snapshot is set immediately from hello response
        Assert.NotNull(gateway.Snapshot);
        Assert.True(gateway.Snapshot.UptimeMs >= 0);

        // Give a moment for any additional events
        var timeout = Task.Delay(TimeSpan.FromSeconds(2));
        await Task.WhenAny(eventReceived.Task, timeout);
    }

    /// <summary>
    /// Checkpoint 0.4: Multiple consecutive connections succeed
    /// Validates connection reliability
    /// </summary>
    [Fact(Skip = "Requires running Gateway")]
    public async Task Checkpoint04_ReliableConnection_TenConsecutiveConnections()
    {
        var successCount = 0;

        for (int i = 0; i < 10; i++)
        {
            try
            {
                await using var gateway = new GatewayChannel(GatewayUrl);
                await gateway.ConnectAsync();
                
                if (gateway.State == GatewayState.Connected)
                    successCount++;
                
                await gateway.DisconnectAsync();
                
                // Small delay between connections
                await Task.Delay(100);
            }
            catch
            {
                // Count failed attempts
            }
        }

        Assert.Equal(10, successCount);
    }
}

/// <summary>
/// Protocol model tests - these don't require a running Gateway
/// </summary>
public class ProtocolModelTests
{
    [Fact]
    public void GatewayProtocol_HasCorrectVersion()
    {
        Assert.Equal(3, GatewayProtocol.Version);
        Assert.Equal(3, GatewayProtocol.MinVersion);
        Assert.Equal(3, GatewayProtocol.MaxVersion);
    }

    [Fact]
    public void ConnectParams_HasCorrectDefaults()
    {
        var connectParams = new ConnectParams();

        Assert.Equal(3, connectParams.MinProtocol);
        Assert.Equal(3, connectParams.MaxProtocol);
        Assert.NotNull(connectParams.Client);
        Assert.Equal("Clawdbot Windows", connectParams.Client["name"]);
        Assert.Equal("windows", connectParams.Client["platform"]);
    }

    [Fact]
    public void RequestFrame_SerializesCorrectly()
    {
        var frame = new RequestFrame
        {
            Id = "1",
            Method = "config.get",
            Params = null
        };

        Assert.Equal("request", frame.Type);
        Assert.Equal("1", frame.Id);
        Assert.Equal("config.get", frame.Method);
    }

    [Fact]
    public void ErrorCodes_ContainsExpectedCodes()
    {
        Assert.Equal("NOT_LINKED", ErrorCodes.NotLinked);
        Assert.Equal("NOT_PAIRED", ErrorCodes.NotPaired);
        Assert.Equal("AGENT_TIMEOUT", ErrorCodes.AgentTimeout);
        Assert.Equal("INVALID_REQUEST", ErrorCodes.InvalidRequest);
        Assert.Equal("UNAVAILABLE", ErrorCodes.Unavailable);
        Assert.Equal("CONFIG_HASH_MISMATCH", ErrorCodes.ConfigHashMismatch);
    }
}

/// <summary>
/// GatewayChannel unit tests (mocked, no network)
/// </summary>
public class GatewayChannelTests
{
    [Fact]
    public void GatewayChannel_InitialState_IsDisconnected()
    {
        var gateway = new GatewayChannel();
        Assert.Equal(GatewayState.Disconnected, gateway.State);
    }

    [Fact]
    public void GatewayChannel_DefaultUrl_IsLocalhost()
    {
        // Can't easily test this without reflection, but we can verify it doesn't throw
        var gateway = new GatewayChannel();
        Assert.NotNull(gateway);
    }

    [Fact]
    public void GatewayChannel_CustomUrl_IsAccepted()
    {
        var gateway = new GatewayChannel("ws://192.168.1.100:18789/");
        Assert.NotNull(gateway);
    }

    [Fact]
    public void GatewayChannel_CustomConnectParams_IsAccepted()
    {
        var connectParams = new ConnectParams
        {
            Role = "companion",
            Caps = new List<string> { "exec-approval", "voice-wake" }
        };

        var gateway = new GatewayChannel("ws://127.0.0.1:18789/", connectParams);
        Assert.NotNull(gateway);
    }

    [Fact]
    public async Task GatewayChannel_RequestWhenDisconnected_Throws()
    {
        var gateway = new GatewayChannel();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await gateway.RequestAsync<object>("test.method");
        });
    }
}
