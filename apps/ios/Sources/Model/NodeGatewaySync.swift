import ClawdbotKit
import Foundation
import SwiftUI

// MARK: - Gateway Sync & Branding

/// Extension for gateway synchronization, branding, and wake word sync.
extension NodeAppModel {
    func applyMainSessionKey(_ key: String?) {
        let trimmed = (key ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let current = self.mainSessionKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if SessionKey.isCanonicalMainSessionKey(current) { return }
        if trimmed == current { return }
        self.mainSessionKey = trimmed
        self.talkMode.updateMainSessionKey(trimmed)
    }

    func refreshBrandingFromGateway() async {
        do {
            let res = try await self.gateway.request(method: "config.get", paramsJSON: "{}", timeoutSeconds: 8)
            guard let json = try JSONSerialization.jsonObject(with: res) as? [String: Any] else { return }
            guard let config = json["config"] as? [String: Any] else { return }
            let ui = config["ui"] as? [String: Any]
            let raw = (ui?["seamColor"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let session = config["session"] as? [String: Any]
            let mainKey = SessionKey.normalizeMainKey(session?["mainKey"] as? String)
            await MainActor.run {
                self.seamColorHex = raw.isEmpty ? nil : raw
                if !SessionKey.isCanonicalMainSessionKey(self.mainSessionKey) {
                    self.mainSessionKey = mainKey
                    self.talkMode.updateMainSessionKey(mainKey)
                }
            }
        } catch {
            // ignore
        }
    }

    func setGlobalWakeWords(_ words: [String]) async {
        let sanitized = VoiceWakePreferences.sanitizeTriggerWords(words)

        struct Payload: Codable {
            var triggers: [String]
        }
        let payload = Payload(triggers: sanitized)
        guard let data = try? JSONEncoder().encode(payload),
              let json = String(data: data, encoding: .utf8)
        else { return }

        do {
            _ = try await self.gateway.request(method: "voicewake.set", paramsJSON: json, timeoutSeconds: 12)
        } catch {
            // Best-effort only.
        }
    }

    func startVoiceWakeSync() async {
        self.voiceWakeSyncTask?.cancel()
        self.voiceWakeSyncTask = Task { [weak self] in
            guard let self else { return }

            await self.refreshWakeWordsFromGateway()

            let stream = await self.gateway.subscribeServerEvents(bufferingNewest: 200)
            for await evt in stream {
                if Task.isCancelled { return }
                guard evt.event == "voicewake.changed" else { continue }
                guard let payload = evt.payload else { continue }
                struct Payload: Decodable { var triggers: [String] }
                guard let decoded = try? GatewayPayloadDecoding.decode(payload, as: Payload.self) else { continue }
                let triggers = VoiceWakePreferences.sanitizeTriggerWords(decoded.triggers)
                VoiceWakePreferences.saveTriggerWords(triggers)
            }
        }
    }

    func refreshWakeWordsFromGateway() async {
        do {
            let data = try await self.gateway.request(method: "voicewake.get", paramsJSON: "{}", timeoutSeconds: 8)
            guard let triggers = VoiceWakePreferences.decodeGatewayTriggers(from: data) else { return }
            VoiceWakePreferences.saveTriggerWords(triggers)
        } catch {
            // Best-effort only.
        }
    }

    // MARK: - Color Utilities

    var seamColor: Color {
        Self.color(fromHex: self.seamColorHex) ?? Self.defaultSeamColor
    }

    static let defaultSeamColor = Color(red: 79 / 255.0, green: 122 / 255.0, blue: 154 / 255.0)

    static func color(fromHex raw: String?) -> Color? {
        let trimmed = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let hex = trimmed.hasPrefix("#") ? String(trimmed.dropFirst()) : trimmed
        guard hex.count == 6, let value = Int(hex, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255.0
        let g = Double((value >> 8) & 0xFF) / 255.0
        let b = Double(value & 0xFF) / 255.0
        return Color(red: r, green: g, blue: b)
    }

    // MARK: - A2UI URL Resolution

    func resolveA2UIHostURL() async -> String? {
        guard let raw = await self.gateway.currentCanvasHostUrl() else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let base = URL(string: trimmed) else { return nil }
        return base.appendingPathComponent("__clawdbot__/a2ui/").absoluteString + "?platform=ios"
    }

    func showA2UIOnConnectIfNeeded() async {
        guard let a2uiUrl = await self.resolveA2UIHostURL() else { return }
        let current = self.screen.urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if current.isEmpty || current == self.lastAutoA2uiURL {
            self.screen.navigate(to: a2uiUrl)
            self.lastAutoA2uiURL = a2uiUrl
        }
    }

    func showLocalCanvasOnDisconnect() {
        self.lastAutoA2uiURL = nil
        self.screen.showDefaultCanvas()
    }

    // MARK: - Offline Queue

    func flushOfflineQueue() async {
        let pending = await MainActor.run { self.offlineQueue.pending }
        guard !pending.isEmpty else { return }

        for msg in pending {
            do {
                struct Payload: Codable {
                    var text: String
                    var sessionKey: String?
                }
                let payload = Payload(text: msg.text, sessionKey: msg.sessionKey)
                let data = try JSONEncoder().encode(payload)
                guard let json = String(bytes: data, encoding: .utf8) else { continue }
                await self.gateway.sendEvent(event: "voice.transcript", payloadJSON: json)
                await MainActor.run { self.offlineQueue.dequeue(msg.id) }
            } catch {
                await MainActor.run { self.offlineQueue.markFailed(msg.id) }
            }
        }
    }
}
