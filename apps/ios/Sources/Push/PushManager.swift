import Foundation
import OSLog
import PushKit
import UIKit
import UserNotifications

/// Manages push notification registration for VoIP (PushKit) and remote notifications.
/// VoIP push allows the app to wake from background for incoming calls/messages.
@MainActor
final class PushManager: NSObject, Sendable {
    static let shared = PushManager()

    private let logger = Logger(subsystem: "com.clawdbot", category: "push")
    private var voipRegistry: PKPushRegistry?
    private(set) var voipToken: Data?
    private(set) var remoteToken: Data?

    /// Called when a VoIP push is received. The gateway can use this to wake the app.
    var onIncomingVoIPPush: (@Sendable (PKPushPayload) async -> Void)?

    /// Called when the VoIP token is updated. Send this to the gateway for registration.
    var onVoIPTokenUpdated: (@Sendable (String) async -> Void)?

    /// Called when the remote notification token is updated.
    var onRemoteTokenUpdated: (@Sendable (String) async -> Void)?

    private override init() {
        super.init()
    }

    // MARK: - VoIP Push (PushKit)

    /// Register for VoIP push notifications.
    /// This enables the app to receive pushes that can wake it from suspended state.
    func registerForVoIPPush() {
        logger.info("Registering for VoIP push")
        voipRegistry = PKPushRegistry(queue: .main)
        voipRegistry?.delegate = self
        voipRegistry?.desiredPushTypes = [.voIP]
    }

    // MARK: - Remote Notifications

    /// Request permission and register for standard remote notifications.
    func registerForRemoteNotifications() async {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            if granted {
                logger.info("Remote notification permission granted")
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } else {
                logger.info("Remote notification permission denied")
            }
        } catch {
            logger.error("Failed to request notification permission: \(error.localizedDescription)")
        }
    }

    /// Called by AppDelegate when remote notification registration succeeds.
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        remoteToken = deviceToken
        let tokenString = deviceToken.map { String(format: "%02x", $0) }.joined()
        logger.info("Remote notification token: \(tokenString.prefix(16))...")

        Task {
            await onRemoteTokenUpdated?(tokenString)
        }
    }

    /// Called by AppDelegate when remote notification registration fails.
    func didFailToRegisterForRemoteNotifications(error: Error) {
        logger.error("Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - Token Helpers

    /// Returns the VoIP token as a hex string, or nil if not registered.
    var voipTokenString: String? {
        voipToken.map { $0.map { String(format: "%02x", $0) }.joined() }
    }

    /// Returns the remote notification token as a hex string, or nil if not registered.
    var remoteTokenString: String? {
        remoteToken.map { $0.map { String(format: "%02x", $0) }.joined() }
    }
}

// MARK: - PKPushRegistryDelegate

extension PushManager: PKPushRegistryDelegate {
    nonisolated func pushRegistry(
        _ registry: PKPushRegistry,
        didUpdate pushCredentials: PKPushCredentials,
        for type: PKPushType
    ) {
        Task { @MainActor in
            self.voipToken = pushCredentials.token
            let tokenString = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
            self.logger.info("VoIP push token: \(tokenString.prefix(16))...")

            await self.onVoIPTokenUpdated?(tokenString)
        }
    }

    nonisolated func pushRegistry(
        _ registry: PKPushRegistry,
        didReceiveIncomingPushWith payload: PKPushPayload,
        for type: PKPushType,
        completion: @escaping () -> Void
    ) {
        Task { @MainActor in
            self.logger.info("Received VoIP push: \(payload.dictionaryPayload.keys.joined(separator: ", "))")

            // Note: For VoIP pushes, iOS requires that you report a new incoming call
            // using CallKit within a few seconds, otherwise the app will be terminated.
            // For non-call use cases (like chat wakeup), consider using regular push
            // notifications with background mode instead.

            await self.onIncomingVoIPPush?(payload)
            completion()
        }
    }

    nonisolated func pushRegistry(
        _ registry: PKPushRegistry,
        didInvalidatePushTokenFor type: PKPushType
    ) {
        Task { @MainActor in
            self.logger.info("VoIP push token invalidated")
            self.voipToken = nil
        }
    }
}
