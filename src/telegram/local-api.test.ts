import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TelegramAccountConfig } from "../config/types.js";
import {
  resolveTelegramApiRoot,
  normalizeApiRoot,
  isLocalApiPath,
  validateLocalApiPath,
} from "./local-api.js";

describe("local-api", () => {
  const originalEnv = process.env.TELEGRAM_LOCAL_API_SERVER;

  beforeEach(() => {
    delete process.env.TELEGRAM_LOCAL_API_SERVER;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TELEGRAM_LOCAL_API_SERVER = originalEnv;
    } else {
      delete process.env.TELEGRAM_LOCAL_API_SERVER;
    }
  });

  describe("resolveTelegramApiRoot", () => {
    it("returns default API base when not configured", () => {
      const result = resolveTelegramApiRoot();
      expect(result).toBe("https://api.telegram.org");
    });

    it("returns config value when localApiServer is set", () => {
      const config: TelegramAccountConfig = {
        localApiServer: "http://localhost:8081",
      };
      const result = resolveTelegramApiRoot(config);
      expect(result).toBe("http://localhost:8081");
    });

    it("returns env var when config not set but env is set", () => {
      process.env.TELEGRAM_LOCAL_API_SERVER = "http://localhost:9000";
      const result = resolveTelegramApiRoot();
      expect(result).toBe("http://localhost:9000");
    });

    it("prefers config over env var", () => {
      process.env.TELEGRAM_LOCAL_API_SERVER = "http://localhost:9000";
      const config: TelegramAccountConfig = {
        localApiServer: "http://localhost:8081",
      };
      const result = resolveTelegramApiRoot(config);
      expect(result).toBe("http://localhost:8081");
    });

    it("strips trailing slashes from config value", () => {
      const config: TelegramAccountConfig = {
        localApiServer: "http://localhost:8081/",
      };
      const result = resolveTelegramApiRoot(config);
      expect(result).toBe("http://localhost:8081");
    });

    it("strips multiple trailing slashes from config value", () => {
      const config: TelegramAccountConfig = {
        localApiServer: "http://localhost:8081///",
      };
      const result = resolveTelegramApiRoot(config);
      expect(result).toBe("http://localhost:8081");
    });

    it("strips trailing slashes from env var", () => {
      process.env.TELEGRAM_LOCAL_API_SERVER = "http://localhost:9000/";
      const result = resolveTelegramApiRoot();
      expect(result).toBe("http://localhost:9000");
    });

    it("returns default when config value is empty string", () => {
      const config: TelegramAccountConfig = {
        localApiServer: "",
      };
      const result = resolveTelegramApiRoot(config);
      expect(result).toBe("https://api.telegram.org");
    });

    it("returns default when env var is empty string", () => {
      process.env.TELEGRAM_LOCAL_API_SERVER = "";
      const result = resolveTelegramApiRoot();
      expect(result).toBe("https://api.telegram.org");
    });
  });

  describe("normalizeApiRoot", () => {
    it("strips trailing slashes", () => {
      const result = normalizeApiRoot("http://localhost:8081/");
      expect(result).toBe("http://localhost:8081");
    });

    it("strips multiple trailing slashes", () => {
      const result = normalizeApiRoot("http://localhost:8081///");
      expect(result).toBe("http://localhost:8081");
    });

    it("handles URLs without trailing slashes", () => {
      const result = normalizeApiRoot("http://localhost:8081");
      expect(result).toBe("http://localhost:8081");
    });

    it("returns undefined for undefined input", () => {
      const result = normalizeApiRoot(undefined);
      expect(result).toBeUndefined();
    });

    it("returns empty string for empty string input", () => {
      const result = normalizeApiRoot("");
      expect(result).toBe("");
    });

    it("preserves path components", () => {
      const result = normalizeApiRoot("http://localhost:8081/api/v1/");
      expect(result).toBe("http://localhost:8081/api/v1");
    });
  });

  describe("isLocalApiPath", () => {
    it("returns true for Unix absolute paths", () => {
      expect(isLocalApiPath("/var/lib/telegram-bot-api/file.pdf")).toBe(true);
      expect(isLocalApiPath("/home/user/documents/file.pdf")).toBe(true);
      expect(isLocalApiPath("/")).toBe(true);
    });

    it("returns true for Windows absolute paths", () => {
      expect(isLocalApiPath("C:\\Users\\bot\\file.pdf")).toBe(true);
      expect(isLocalApiPath("D:\\data\\documents\\file.pdf")).toBe(true);
      expect(isLocalApiPath("C:\\")).toBe(true);
    });

    it("returns true for Windows paths with lowercase drive letter", () => {
      expect(isLocalApiPath("c:\\Users\\bot\\file.pdf")).toBe(true);
      expect(isLocalApiPath("d:\\data\\documents\\file.pdf")).toBe(true);
    });

    it("returns false for relative paths", () => {
      expect(isLocalApiPath("documents/file.pdf")).toBe(false);
      expect(isLocalApiPath("./documents/file.pdf")).toBe(false);
      expect(isLocalApiPath("../documents/file.pdf")).toBe(false);
      expect(isLocalApiPath("file.pdf")).toBe(false);
    });

    it("returns false for UNC paths (backslash format)", () => {
      expect(isLocalApiPath("\\\\server\\share\\file.pdf")).toBe(false);
    });

    it("returns false for file:// URLs", () => {
      expect(isLocalApiPath("file:///var/lib/telegram-bot-api/file.pdf")).toBe(false);
      expect(isLocalApiPath("file://C:/Users/bot/file.pdf")).toBe(false);
    });

    it("returns false for http/https URLs", () => {
      expect(isLocalApiPath("http://localhost:8081/file.pdf")).toBe(false);
      expect(isLocalApiPath("https://api.telegram.org/file.pdf")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isLocalApiPath("")).toBe(false);
    });

    it("returns true for Windows paths with forward slashes", () => {
      expect(isLocalApiPath("C:/Users/bot/file.pdf")).toBe(true);
      expect(isLocalApiPath("D:/data/documents/file.pdf")).toBe(true);
    });
  });

  describe("validateLocalApiPath", () => {
    it("returns valid for absolute paths without allowedDir", () => {
      const result = validateLocalApiPath("/var/lib/telegram/file.pdf", undefined);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.resolved).toContain("file.pdf");
      }
    });

    it("returns invalid for non-absolute paths", () => {
      const result = validateLocalApiPath("relative/path.pdf", undefined);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("Not an absolute path");
      }
    });

    it("returns valid for paths within allowedDir", () => {
      const result = validateLocalApiPath("/var/lib/telegram/photos/file.pdf", "/var/lib/telegram");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for paths outside allowedDir", () => {
      const result = validateLocalApiPath("/etc/passwd", "/var/lib/telegram");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("Path outside allowed directory");
      }
    });

    it("normalizes path traversal attempts", () => {
      const result = validateLocalApiPath(
        "/var/lib/telegram/../../../etc/passwd",
        "/var/lib/telegram",
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("Path outside allowed directory");
      }
    });

    it("allows exact match of allowedDir", () => {
      const result = validateLocalApiPath("/var/lib/telegram", "/var/lib/telegram");
      expect(result.valid).toBe(true);
    });
  });
});
