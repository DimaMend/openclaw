using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Clawdbot.Windows.Protocol;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Gateway connection state
/// </summary>
public enum GatewayState
{
    Disconnected,
    Connecting,
    Connected,
    Reconnecting
}

/// <summary>
/// Exception thrown when Gateway request fails
/// </summary>
public class GatewayException : Exception
{
    public string Code { get; }
    public object? ErrorData { get; }

    public GatewayException(string code, string message, object? data = null)
        : base(message)
    {
        Code = code;
        ErrorData = data;
    }
}

/// <summary>
/// Event args for Gateway events
/// </summary>
public class GatewayEventArgs : EventArgs
{
    public required string EventName { get; init; }
    public JsonElement? Payload { get; init; }
}

/// <summary>
/// Event args for state changes
/// </summary>
public class GatewayStateChangedEventArgs : EventArgs
{
    public GatewayState OldState { get; init; }
    public GatewayState NewState { get; init; }
}

/// <summary>
/// WebSocket client for Clawdbot Gateway.
/// Handles connection, reconnection, request/response correlation, and event dispatch.
/// </summary>
public class GatewayChannel : IAsyncDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _url;
    private readonly ConnectParams _connectParams;
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _receiveCts;
    private Task? _receiveTask;

    private readonly ConcurrentDictionary<string, TaskCompletionSource<JsonElement>> _pending = new();
    private int _requestId;
    private GatewayState _state = GatewayState.Disconnected;

    private int _reconnectAttempts;
    private const int MaxReconnectAttempts = 10;
    private static readonly int[] BackoffMs = { 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000 };

    /// <summary>
    /// Current connection state
    /// </summary>
    public GatewayState State => _state;

    /// <summary>
    /// Snapshot received on connection
    /// </summary>
    public Snapshot? Snapshot { get; private set; }

    /// <summary>
    /// Hello response from Gateway
    /// </summary>
    public HelloOk? HelloResponse { get; private set; }

    /// <summary>
    /// Fired when an event is received from Gateway
    /// </summary>
    public event EventHandler<GatewayEventArgs>? EventReceived;

    /// <summary>
    /// Fired when connection state changes
    /// </summary>
    public event EventHandler<GatewayStateChangedEventArgs>? StateChanged;

    /// <summary>
    /// Fired when connection is lost
    /// </summary>
    public event EventHandler? Disconnected;

    /// <summary>
    /// Fired when reconnection succeeds
    /// </summary>
    public event EventHandler? Reconnected;

    /// <summary>
    /// Create a new Gateway channel
    /// </summary>
    /// <param name="url">WebSocket URL, e.g. ws://127.0.0.1:18789/</param>
    /// <param name="connectParams">Optional connection parameters</param>
    public GatewayChannel(string url = "ws://127.0.0.1:18789/", ConnectParams? connectParams = null)
    {
        _url = url.TrimEnd('/') + "/";
        _connectParams = connectParams ?? new ConnectParams();
    }

    /// <summary>
    /// Connect to Gateway
    /// </summary>
    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (_state == GatewayState.Connected)
            return;

        SetState(GatewayState.Connecting);

        try
        {
            _webSocket = new ClientWebSocket();
            await _webSocket.ConnectAsync(new Uri(_url), cancellationToken);

            // Send hello
            var helloJson = JsonSerializer.Serialize(_connectParams, JsonOptions);
            var helloBytes = Encoding.UTF8.GetBytes(helloJson);
            await _webSocket.SendAsync(helloBytes, WebSocketMessageType.Text, true, cancellationToken);

            // Receive hello.ok
            var helloResponse = await ReceiveOneAsync(cancellationToken);
            HelloResponse = JsonSerializer.Deserialize<HelloOk>(helloResponse, JsonOptions)
                ?? throw new GatewayException("PROTOCOL_ERROR", "Invalid hello response");

            Snapshot = HelloResponse.Snapshot;

            // Start receive loop
            _receiveCts = new CancellationTokenSource();
            _receiveTask = ReceiveLoopAsync(_receiveCts.Token);

            _reconnectAttempts = 0;
            SetState(GatewayState.Connected);
        }
        catch (Exception) when (_state == GatewayState.Connecting)
        {
            SetState(GatewayState.Disconnected);
            throw;
        }
    }

    /// <summary>
    /// Send a request to Gateway and wait for response
    /// </summary>
    public async Task<TResponse> RequestAsync<TResponse>(
        string method,
        object? parameters = null,
        CancellationToken cancellationToken = default)
    {
        var responseJson = await RequestRawAsync(method, parameters, cancellationToken);
        return JsonSerializer.Deserialize<TResponse>(responseJson, JsonOptions)
            ?? throw new GatewayException("PROTOCOL_ERROR", $"Failed to deserialize response for {method}");
    }

    /// <summary>
    /// Send a request to Gateway and wait for raw JSON response
    /// </summary>
    public async Task<JsonElement> RequestRawAsync(
        string method,
        object? parameters = null,
        CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        var id = Interlocked.Increment(ref _requestId).ToString();
        var tcs = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);

        if (!_pending.TryAdd(id, tcs))
            throw new InvalidOperationException($"Duplicate request ID: {id}");

        try
        {
            var request = new RequestFrame
            {
                Id = id,
                Method = method,
                Params = parameters
            };

            var json = JsonSerializer.Serialize(request, JsonOptions);
            var bytes = Encoding.UTF8.GetBytes(json);

            await _webSocket!.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            using (timeoutCts.Token.Register(() => tcs.TrySetCanceled()))
            {
                return await tcs.Task;
            }
        }
        finally
        {
            _pending.TryRemove(id, out _);
        }
    }

    /// <summary>
    /// Send a request without waiting for response (fire and forget)
    /// </summary>
    public async Task SendAsync(string method, object? parameters = null, CancellationToken cancellationToken = default)
    {
        EnsureConnected();

        var id = Interlocked.Increment(ref _requestId).ToString();
        var request = new RequestFrame
        {
            Id = id,
            Method = method,
            Params = parameters
        };

        var json = JsonSerializer.Serialize(request, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await _webSocket!.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
    }

    /// <summary>
    /// Disconnect from Gateway
    /// </summary>
    public async Task DisconnectAsync()
    {
        _receiveCts?.Cancel();

        if (_webSocket?.State == WebSocketState.Open)
        {
            try
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnect", CancellationToken.None);
            }
            catch
            {
                // Ignore close errors
            }
        }

        _webSocket?.Dispose();
        _webSocket = null;
        SetState(GatewayState.Disconnected);

        // Cancel all pending requests
        foreach (var (_, tcs) in _pending)
        {
            tcs.TrySetCanceled();
        }
        _pending.Clear();
    }

    public async ValueTask DisposeAsync()
    {
        await DisconnectAsync();
        _receiveCts?.Dispose();
        GC.SuppressFinalize(this);
    }

    private async Task<JsonElement> ReceiveOneAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        using var ms = new MemoryStream();

        WebSocketReceiveResult result;
        do
        {
            result = await _webSocket!.ReceiveAsync(buffer, cancellationToken);
            ms.Write(buffer, 0, result.Count);
        } while (!result.EndOfMessage);

        ms.Position = 0;
        return await JsonSerializer.DeserializeAsync<JsonElement>(ms, JsonOptions, cancellationToken);
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        using var ms = new MemoryStream();

        try
        {
            while (!cancellationToken.IsCancellationRequested && _webSocket?.State == WebSocketState.Open)
            {
                ms.SetLength(0);

                WebSocketReceiveResult result;
                do
                {
                    result = await _webSocket.ReceiveAsync(buffer, cancellationToken);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await HandleDisconnectAsync();
                        return;
                    }
                    ms.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                ms.Position = 0;
                var json = await JsonSerializer.DeserializeAsync<JsonElement>(ms, JsonOptions, cancellationToken);
                ProcessMessage(json);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal cancellation
        }
        catch (WebSocketException)
        {
            await HandleDisconnectAsync();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Gateway receive error: {ex}");
            await HandleDisconnectAsync();
        }
    }

    private void ProcessMessage(JsonElement json)
    {
        if (!json.TryGetProperty("type", out var typeElement))
            return;

        var type = typeElement.GetString();

        switch (type)
        {
            case "response":
                HandleResponse(json);
                break;
            case "event":
                HandleEvent(json);
                break;
        }
    }

    private void HandleResponse(JsonElement json)
    {
        if (!json.TryGetProperty("id", out var idElement))
            return;

        var id = idElement.GetString();
        if (id == null || !_pending.TryRemove(id, out var tcs))
            return;

        if (json.TryGetProperty("error", out var errorElement))
        {
            var error = JsonSerializer.Deserialize<GatewayError>(errorElement, JsonOptions);
            tcs.TrySetException(new GatewayException(
                error?.Code ?? "UNKNOWN",
                error?.Message ?? "Unknown error",
                error?.Data));
        }
        else if (json.TryGetProperty("payload", out var payloadElement))
        {
            tcs.TrySetResult(payloadElement);
        }
        else
        {
            // Empty success response
            tcs.TrySetResult(default);
        }
    }

    private void HandleEvent(JsonElement json)
    {
        if (!json.TryGetProperty("event", out var eventElement))
            return;

        var eventName = eventElement.GetString();
        if (eventName == null)
            return;

        json.TryGetProperty("payload", out var payload);

        // Update local snapshot for certain events
        if (eventName == "snapshot" && payload.ValueKind == JsonValueKind.Object)
        {
            Snapshot = JsonSerializer.Deserialize<Snapshot>(payload, JsonOptions);
        }

        EventReceived?.Invoke(this, new GatewayEventArgs
        {
            EventName = eventName,
            Payload = payload
        });
    }

    private async Task HandleDisconnectAsync()
    {
        if (_state == GatewayState.Disconnected)
            return;

        SetState(GatewayState.Disconnected);
        Disconnected?.Invoke(this, EventArgs.Empty);

        // Attempt reconnection
        await TryReconnectAsync();
    }

    private async Task TryReconnectAsync()
    {
        if (_reconnectAttempts >= MaxReconnectAttempts)
        {
            System.Diagnostics.Debug.WriteLine("Max reconnect attempts reached");
            return;
        }

        SetState(GatewayState.Reconnecting);

        var delay = BackoffMs[Math.Min(_reconnectAttempts, BackoffMs.Length - 1)];
        _reconnectAttempts++;

        await Task.Delay(delay);

        try
        {
            await ConnectAsync();
            Reconnected?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Reconnect attempt {_reconnectAttempts} failed: {ex.Message}");
            await TryReconnectAsync();
        }
    }

    private void SetState(GatewayState newState)
    {
        var oldState = _state;
        if (oldState == newState)
            return;

        _state = newState;
        StateChanged?.Invoke(this, new GatewayStateChangedEventArgs
        {
            OldState = oldState,
            NewState = newState
        });
    }

    private void EnsureConnected()
    {
        if (_state != GatewayState.Connected || _webSocket?.State != WebSocketState.Open)
            throw new InvalidOperationException("Not connected to Gateway");
    }
}
