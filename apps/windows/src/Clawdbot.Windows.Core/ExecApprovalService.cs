using System.Text.Json;
using Clawdbot.Windows.Protocol;

namespace Clawdbot.Windows.Core;

/// <summary>
/// Handles exec approval requests from the Gateway.
/// Manages the queue of pending approvals and dispatches them to the UI thread.
/// </summary>
public sealed class ExecApprovalService : IDisposable
{
    private readonly GatewayChannel _gateway;
    private readonly Queue<GatewayExecApprovalRequest> _pendingRequests = new();
    private readonly object _lock = new();
    private bool _isShowingDialog;
    private bool _disposed;
    
    /// <summary>
    /// Raised when an exec approval request is received from the Gateway.
    /// Handler should show the dialog and return the decision.
    /// </summary>
    public event Func<GatewayExecApprovalRequest, ExecApprovalDecision>? ApprovalRequested;
    
    /// <summary>
    /// Raised when there are no more pending approvals.
    /// </summary>
    public event Action? QueueEmpty;
    
    /// <summary>
    /// Gets the number of pending approval requests.
    /// </summary>
    public int PendingCount
    {
        get
        {
            lock (_lock) return _pendingRequests.Count;
        }
    }
    
    public ExecApprovalService(GatewayChannel gateway)
    {
        _gateway = gateway ?? throw new ArgumentNullException(nameof(gateway));
        _gateway.EventReceived += OnGatewayEvent;
    }
    
    private void OnGatewayEvent(object? sender, GatewayEventArgs e)
    {
        if (e.EventName == "exec.approval.requested")
        {
            HandleApprovalRequested(e);
        }
    }
    
    private void HandleApprovalRequested(GatewayEventArgs evt)
    {
        try
        {
            // Parse the request from the event payload
            var request = ParseApprovalRequest(evt.Payload);
            if (request == null)
            {
                AppLogger.Warn("Failed to parse exec.approval.requested event payload");
                return;
            }
            
            AppLogger.Info($"Received exec approval request: id={request.Id}, command={TruncateCommand(request.Request.Command)}");
            
            // Add to queue and process
            lock (_lock)
            {
                _pendingRequests.Enqueue(request);
            }
            
            ProcessNextRequest();
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Error handling exec.approval.requested: {ex.Message}");
        }
    }
    
    private static GatewayExecApprovalRequest? ParseApprovalRequest(JsonElement? payload)
    {
        if (payload == null || !payload.HasValue) return null;
        
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            return payload.Value.Deserialize<GatewayExecApprovalRequest>(options);
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to parse approval request: {ex.Message}");
            return null;
        }
    }
    
    private void ProcessNextRequest()
    {
        GatewayExecApprovalRequest? request = null;
        
        lock (_lock)
        {
            if (_isShowingDialog || _pendingRequests.Count == 0)
            {
                return;
            }
            
            // Skip expired requests
            while (_pendingRequests.Count > 0)
            {
                var candidate = _pendingRequests.Peek();
                if (candidate.IsExpired)
                {
                    _pendingRequests.Dequeue();
                    AppLogger.Info($"Skipping expired approval request: id={candidate.Id}");
                    // Auto-deny expired requests
                    SendDecision(candidate.Id, ExecApprovalDecision.Deny);
                }
                else
                {
                    request = _pendingRequests.Dequeue();
                    break;
                }
            }
            
            if (request == null)
            {
                QueueEmpty?.Invoke();
                return;
            }
            
            _isShowingDialog = true;
        }
        
        // Show approval dialog on UI thread
        ShowApprovalDialog(request);
    }
    
    private void ShowApprovalDialog(GatewayExecApprovalRequest request)
    {
        try
        {
            // The caller is responsible for UI thread dispatch
            var decision = ApprovalRequested?.Invoke(request) ?? ExecApprovalDecision.Deny;
            HandleDecision(request.Id, decision);
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Error showing approval dialog: {ex.Message}");
            HandleDecision(request.Id, ExecApprovalDecision.Deny);
        }
    }
    
    private void HandleDecision(string requestId, ExecApprovalDecision decision)
    {
        AppLogger.Info($"User decision for request {requestId}: {decision}");
        
        // Send decision to Gateway
        SendDecision(requestId, decision);
        
        lock (_lock)
        {
            _isShowingDialog = false;
        }
        
        // Process next request in queue
        ProcessNextRequest();
    }
    
    private void SendDecision(string requestId, ExecApprovalDecision decision)
    {
        try
        {
            var payload = new
            {
                id = requestId,
                decision = decision.ToWireFormat()
            };
            
            _ = _gateway.SendAsync("exec.approval.resolve", payload);
            AppLogger.Info($"Sent exec approval decision: id={requestId}, decision={decision.ToWireFormat()}");
        }
        catch (Exception ex)
        {
            AppLogger.Error($"Failed to send approval decision: {ex.Message}");
        }
    }
    
    private static string TruncateCommand(string command, int maxLength = 50)
    {
        if (string.IsNullOrEmpty(command)) return "(empty)";
        if (command.Length <= maxLength) return command;
        return command[..(maxLength - 3)] + "...";
    }
    
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        
        _gateway.EventReceived -= OnGatewayEvent;
        
        lock (_lock)
        {
            _pendingRequests.Clear();
        }
    }
}
