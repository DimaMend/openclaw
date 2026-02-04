import { describe, expect, it } from "vitest";
import { detectCommandSubstitution } from "./exec-safety.js";

describe("detectCommandSubstitution", () => {
  it("detects backtick command substitution", () => {
    const result = detectCommandSubstitution('echo "hello `whoami`"');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("backtick");
    expect(result[0].match).toBe("`whoami`");
  });

  it("detects $() command substitution", () => {
    const result = detectCommandSubstitution('echo "hello $(date)"');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("dollar-paren");
    expect(result[0].match).toBe("$(date)");
  });

  it("detects multiple patterns", () => {
    const result = detectCommandSubstitution('echo "`cmd1`" and "$(cmd2)"');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("backtick");
    expect(result[1].type).toBe("dollar-paren");
  });

  it("returns empty array for safe commands", () => {
    expect(detectCommandSubstitution("ls -la")).toHaveLength(0);
    expect(detectCommandSubstitution("echo 'hello world'")).toHaveLength(0);
    expect(detectCommandSubstitution("cat file.txt | grep pattern")).toHaveLength(0);
  });

  it("detects markdown-style code in shell arguments", () => {
    // This is the problematic case we're trying to catch
    const result = detectCommandSubstitution(
      'tool "Run this: `cp -r src dst`" arg',
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("backtick");
    expect(result[0].match).toBe("`cp -r src dst`");
  });
});
