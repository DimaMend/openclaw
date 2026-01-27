import { describe, expect, it } from "vitest";

import { parseTidbUrl, resolveTidbSslMode } from "./tidb-tool.js";

describe("tidb tool url parsing", () => {
  it("parses tidb:// with default port 4000", () => {
    const parsed = parseTidbUrl("tidb://user:pass@example.com/mydb");
    expect(parsed.scheme).toBe("tidb");
    expect(parsed.host).toBe("example.com");
    expect(parsed.port).toBe(4000);
    expect(parsed.user).toBe("user");
    expect(parsed.password).toBe("pass");
    expect(parsed.database).toBe("mydb");
  });

  it("parses mysql:// with default port 3306", () => {
    const parsed = parseTidbUrl("mysql://user@example.com/mydb");
    expect(parsed.scheme).toBe("mysql");
    expect(parsed.port).toBe(3306);
  });

  it("passes through query params and resolves sslMode", () => {
    const parsed = parseTidbUrl(
      "tidb://user:pass@example.com:4000/mydb?sslMode=verify_identity&connectTimeout=10",
    );
    expect(parsed.params.sslMode).toBe("verify_identity");
    expect(resolveTidbSslMode(parsed)).toBe("VERIFY_IDENTITY");
  });

  it("infers TiDB Cloud SSL defaults when unset", () => {
    const parsed = parseTidbUrl("tidb://user:pass@gateway01.foo.prod.aws.tidbcloud.com/mydb");
    expect(resolveTidbSslMode(parsed)).toBe("VERIFY_IDENTITY");
  });

  it("infers TiDB Cloud SSL defaults for mysql:// urls too", () => {
    const parsed = parseTidbUrl("mysql://user:pass@gateway01.foo.prod.aws.tidbcloud.com:4000/mydb");
    expect(resolveTidbSslMode(parsed)).toBe("VERIFY_IDENTITY");
  });
});
