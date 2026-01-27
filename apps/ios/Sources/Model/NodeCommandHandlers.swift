import ClawdbotKit
import Foundation
import UIKit

// MARK: - Command Handlers

/// Extension containing all node.invoke command handlers.
/// Separated from NodeAppModel for maintainability.
extension NodeAppModel {
    func routeInvoke(_ req: BridgeInvokeRequest) async -> BridgeInvokeResponse {
        let command = req.command

        if self.isBackgrounded, self.isBackgroundRestricted(command) {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .backgroundUnavailable,
                    message: "NODE_BACKGROUND_UNAVAILABLE: canvas/camera/screen commands require foreground"))
        }

        if command.hasPrefix("camera."), !self.isCameraEnabled() {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .unavailable,
                    message: "CAMERA_DISABLED: enable Camera in iOS Settings → Camera → Allow Camera"))
        }

        do {
            switch command {
            case ClawdbotLocationCommand.get.rawValue:
                return try await self.handleLocationInvoke(req)
            case ClawdbotCanvasCommand.present.rawValue,
                 ClawdbotCanvasCommand.hide.rawValue,
                 ClawdbotCanvasCommand.navigate.rawValue,
                 ClawdbotCanvasCommand.evalJS.rawValue,
                 ClawdbotCanvasCommand.snapshot.rawValue:
                return try await self.handleCanvasInvoke(req)
            case ClawdbotCanvasA2UICommand.reset.rawValue,
                 ClawdbotCanvasA2UICommand.push.rawValue,
                 ClawdbotCanvasA2UICommand.pushJSONL.rawValue:
                return try await self.handleCanvasA2UIInvoke(req)
            case ClawdbotCameraCommand.list.rawValue,
                 ClawdbotCameraCommand.snap.rawValue,
                 ClawdbotCameraCommand.clip.rawValue:
                return try await self.handleCameraInvoke(req)
            case ClawdbotScreenCommand.record.rawValue:
                return try await self.handleScreenRecordInvoke(req)
            default:
                return BridgeInvokeResponse(
                    id: req.id,
                    ok: false,
                    error: ClawdbotNodeError(code: .invalidRequest, message: "INVALID_REQUEST: unknown command"))
            }
        } catch {
            if command.hasPrefix("camera.") {
                let text = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                self.showCameraHUD(text: text, kind: .error, autoHideSeconds: 2.2)
            }
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(code: .unavailable, message: error.localizedDescription))
        }
    }

    func isBackgroundRestricted(_ command: String) -> Bool {
        command.hasPrefix("canvas.") || command.hasPrefix("camera.") || command.hasPrefix("screen.")
    }

    // MARK: - Location

    func handleLocationInvoke(_ req: BridgeInvokeRequest) async throws -> BridgeInvokeResponse {
        let mode = self.locationMode()
        guard mode != .off else {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .unavailable,
                    message: "LOCATION_DISABLED: enable Location in Settings"))
        }
        if self.isBackgrounded, mode != .always {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .backgroundUnavailable,
                    message: "LOCATION_BACKGROUND_UNAVAILABLE: background location requires Always"))
        }
        let params = (try? Self.decodeParams(ClawdbotLocationGetParams.self, from: req.paramsJSON)) ??
            ClawdbotLocationGetParams()
        let desired = params.desiredAccuracy ??
            (self.isLocationPreciseEnabled() ? .precise : .balanced)
        let status = self.locationService.authorizationStatus()
        if status != .authorizedAlways, status != .authorizedWhenInUse {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .unavailable,
                    message: "LOCATION_PERMISSION_REQUIRED: grant Location permission"))
        }
        if self.isBackgrounded, status != .authorizedAlways {
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(
                    code: .unavailable,
                    message: "LOCATION_PERMISSION_REQUIRED: enable Always for background access"))
        }
        let location = try await self.locationService.currentLocation(
            params: params,
            desiredAccuracy: desired,
            maxAgeMs: params.maxAgeMs,
            timeoutMs: params.timeoutMs)
        let isPrecise = self.locationService.accuracyAuthorization() == .fullAccuracy
        let payload = ClawdbotLocationPayload(
            lat: location.coordinate.latitude,
            lon: location.coordinate.longitude,
            accuracyMeters: location.horizontalAccuracy,
            altitudeMeters: location.verticalAccuracy >= 0 ? location.altitude : nil,
            speedMps: location.speed >= 0 ? location.speed : nil,
            headingDeg: location.course >= 0 ? location.course : nil,
            timestamp: ISO8601DateFormatter().string(from: location.timestamp),
            isPrecise: isPrecise,
            source: nil)
        let json = try Self.encodePayload(payload)
        return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: json)
    }

    // MARK: - Canvas

    func handleCanvasInvoke(_ req: BridgeInvokeRequest) async throws -> BridgeInvokeResponse {
        switch req.command {
        case ClawdbotCanvasCommand.present.rawValue:
            let params = (try? Self.decodeParams(ClawdbotCanvasPresentParams.self, from: req.paramsJSON)) ??
                ClawdbotCanvasPresentParams()
            let url = params.url?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if url.isEmpty {
                self.screen.showDefaultCanvas()
            } else {
                self.screen.navigate(to: url)
            }
            return BridgeInvokeResponse(id: req.id, ok: true)
        case ClawdbotCanvasCommand.hide.rawValue:
            return BridgeInvokeResponse(id: req.id, ok: true)
        case ClawdbotCanvasCommand.navigate.rawValue:
            let params = try Self.decodeParams(ClawdbotCanvasNavigateParams.self, from: req.paramsJSON)
            self.screen.navigate(to: params.url)
            return BridgeInvokeResponse(id: req.id, ok: true)
        case ClawdbotCanvasCommand.evalJS.rawValue:
            let params = try Self.decodeParams(ClawdbotCanvasEvalParams.self, from: req.paramsJSON)
            let result = try await self.screen.eval(javaScript: params.javaScript)
            let payload = try Self.encodePayload(["result": result])
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
        case ClawdbotCanvasCommand.snapshot.rawValue:
            let params = try? Self.decodeParams(ClawdbotCanvasSnapshotParams.self, from: req.paramsJSON)
            let format = params?.format ?? .jpeg
            let maxWidth: CGFloat? = {
                if let raw = params?.maxWidth, raw > 0 { return CGFloat(raw) }
                return switch format {
                case .png: 900
                case .jpeg: 1600
                }
            }()
            let base64 = try await self.screen.snapshotBase64(
                maxWidth: maxWidth,
                format: format,
                quality: params?.quality)
            let payload = try Self.encodePayload([
                "format": format == .jpeg ? "jpeg" : "png",
                "base64": base64,
            ])
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
        default:
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(code: .invalidRequest, message: "INVALID_REQUEST: unknown command"))
        }
    }

    // MARK: - Canvas A2UI

    func handleCanvasA2UIInvoke(_ req: BridgeInvokeRequest) async throws -> BridgeInvokeResponse {
        let command = req.command
        switch command {
        case ClawdbotCanvasA2UICommand.reset.rawValue:
            guard let a2uiUrl = await self.resolveA2UIHostURL() else {
                return BridgeInvokeResponse(
                    id: req.id,
                    ok: false,
                    error: ClawdbotNodeError(
                        code: .unavailable,
                        message: "A2UI_HOST_NOT_CONFIGURED: gateway did not advertise canvas host"))
            }
            self.screen.navigate(to: a2uiUrl)
            if await !self.screen.waitForA2UIReady(timeoutMs: 5000) {
                return BridgeInvokeResponse(
                    id: req.id,
                    ok: false,
                    error: ClawdbotNodeError(
                        code: .unavailable,
                        message: "A2UI_HOST_UNAVAILABLE: A2UI host not reachable"))
            }

            let json = try await self.screen.eval(javaScript: """
            (() => {
              if (!globalThis.clawdbotA2UI) return JSON.stringify({ ok: false, error: "missing clawdbotA2UI" });
              return JSON.stringify(globalThis.clawdbotA2UI.reset());
            })()
            """)
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: json)
        case ClawdbotCanvasA2UICommand.push.rawValue, ClawdbotCanvasA2UICommand.pushJSONL.rawValue:
            let messages: [AnyCodable]
            if command == ClawdbotCanvasA2UICommand.pushJSONL.rawValue {
                let params = try Self.decodeParams(ClawdbotCanvasA2UIPushJSONLParams.self, from: req.paramsJSON)
                messages = try ClawdbotCanvasA2UIJSONL.decodeMessagesFromJSONL(params.jsonl)
            } else {
                do {
                    let params = try Self.decodeParams(ClawdbotCanvasA2UIPushParams.self, from: req.paramsJSON)
                    messages = params.messages
                } catch {
                    let params = try Self.decodeParams(ClawdbotCanvasA2UIPushJSONLParams.self, from: req.paramsJSON)
                    messages = try ClawdbotCanvasA2UIJSONL.decodeMessagesFromJSONL(params.jsonl)
                }
            }

            guard let a2uiUrl = await self.resolveA2UIHostURL() else {
                return BridgeInvokeResponse(
                    id: req.id,
                    ok: false,
                    error: ClawdbotNodeError(
                        code: .unavailable,
                        message: "A2UI_HOST_NOT_CONFIGURED: gateway did not advertise canvas host"))
            }
            self.screen.navigate(to: a2uiUrl)
            if await !self.screen.waitForA2UIReady(timeoutMs: 5000) {
                return BridgeInvokeResponse(
                    id: req.id,
                    ok: false,
                    error: ClawdbotNodeError(
                        code: .unavailable,
                        message: "A2UI_HOST_UNAVAILABLE: A2UI host not reachable"))
            }

            let messagesJSON = try ClawdbotCanvasA2UIJSONL.encodeMessagesJSONArray(messages)
            let js = """
            (() => {
              try {
                if (!globalThis.clawdbotA2UI) return JSON.stringify({ ok: false, error: "missing clawdbotA2UI" });
                const messages = \(messagesJSON);
                return JSON.stringify(globalThis.clawdbotA2UI.applyMessages(messages));
              } catch (e) {
                return JSON.stringify({ ok: false, error: String(e?.message ?? e) });
              }
            })()
            """
            let resultJSON = try await self.screen.eval(javaScript: js)
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: resultJSON)
        default:
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(code: .invalidRequest, message: "INVALID_REQUEST: unknown command"))
        }
    }

    // MARK: - Camera

    func handleCameraInvoke(_ req: BridgeInvokeRequest) async throws -> BridgeInvokeResponse {
        switch req.command {
        case ClawdbotCameraCommand.list.rawValue:
            let devices = await self.camera.listDevices()
            struct Payload: Codable {
                var devices: [CameraController.CameraDeviceInfo]
            }
            let payload = try Self.encodePayload(Payload(devices: devices))
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
        case ClawdbotCameraCommand.snap.rawValue:
            self.showCameraHUD(text: "Taking photo…", kind: .photo)
            self.triggerCameraFlash()
            let params = (try? Self.decodeParams(ClawdbotCameraSnapParams.self, from: req.paramsJSON)) ??
                ClawdbotCameraSnapParams()
            let res = try await self.camera.snap(params: params)

            struct Payload: Codable {
                var format: String
                var base64: String
                var width: Int
                var height: Int
            }
            let payload = try Self.encodePayload(Payload(
                format: res.format,
                base64: res.base64,
                width: res.width,
                height: res.height))
            self.showCameraHUD(text: "Photo captured", kind: .success, autoHideSeconds: 1.6)
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
        case ClawdbotCameraCommand.clip.rawValue:
            let params = (try? Self.decodeParams(ClawdbotCameraClipParams.self, from: req.paramsJSON)) ??
                ClawdbotCameraClipParams()

            let suspended = (params.includeAudio ?? true) ? self.voiceWake.suspendForExternalAudioCapture() : false
            defer { self.voiceWake.resumeAfterExternalAudioCapture(wasSuspended: suspended) }

            self.showCameraHUD(text: "Recording…", kind: .recording)
            let res = try await self.camera.clip(params: params)

            struct Payload: Codable {
                var format: String
                var base64: String
                var durationMs: Int
                var hasAudio: Bool
            }
            let payload = try Self.encodePayload(Payload(
                format: res.format,
                base64: res.base64,
                durationMs: res.durationMs,
                hasAudio: res.hasAudio))
            self.showCameraHUD(text: "Clip captured", kind: .success, autoHideSeconds: 1.8)
            return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
        default:
            return BridgeInvokeResponse(
                id: req.id,
                ok: false,
                error: ClawdbotNodeError(code: .invalidRequest, message: "INVALID_REQUEST: unknown command"))
        }
    }

    // MARK: - Screen Recording

    func handleScreenRecordInvoke(_ req: BridgeInvokeRequest) async throws -> BridgeInvokeResponse {
        let params = (try? Self.decodeParams(ClawdbotScreenRecordParams.self, from: req.paramsJSON)) ??
            ClawdbotScreenRecordParams()
        if let format = params.format, format.lowercased() != "mp4" {
            throw NSError(domain: "Screen", code: 30, userInfo: [
                NSLocalizedDescriptionKey: "INVALID_REQUEST: screen format must be mp4",
            ])
        }
        self.screenRecordActive = true
        defer { self.screenRecordActive = false }
        let path = try await self.screenRecorder.record(
            screenIndex: params.screenIndex,
            durationMs: params.durationMs,
            fps: params.fps,
            includeAudio: params.includeAudio,
            outPath: nil)
        defer { try? FileManager().removeItem(atPath: path) }
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        struct Payload: Codable {
            var format: String
            var base64: String
            var durationMs: Int?
            var fps: Double?
            var screenIndex: Int?
            var hasAudio: Bool
        }
        let payload = try Self.encodePayload(Payload(
            format: "mp4",
            base64: data.base64EncodedString(),
            durationMs: params.durationMs,
            fps: params.fps,
            screenIndex: params.screenIndex,
            hasAudio: params.includeAudio ?? true))
        return BridgeInvokeResponse(id: req.id, ok: true, payloadJSON: payload)
    }
}
