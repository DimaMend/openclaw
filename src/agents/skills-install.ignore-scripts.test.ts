import { describe, expect, it } from "vitest";

/**
 * VULN-211: Skill installation must use --ignore-scripts flag
 *
 * This test verifies that all package manager commands include the
 * --ignore-scripts flag to prevent execution of arbitrary lifecycle scripts
 * from untrusted packages during skill installation.
 *
 * CWE-506: Embedded Malicious Code
 * CWE-494: Download of Code Without Integrity Check
 */

// We need to test the buildNodeInstallCommand function indirectly
// since it's not exported. We'll import the module and verify the behavior
// through the exported functions.

describe("VULN-211: skill install must use --ignore-scripts", () => {
  it("buildNodeInstallCommand includes --ignore-scripts for npm", async () => {
    // The function is internal, so we verify by checking the source code
    // This test ensures the fix is present and documented
    const fs = await import("node:fs");
    const path = await import("node:path");

    const skillsInstallPath = path.resolve(import.meta.dirname, "skills-install.ts");
    const sourceCode = fs.readFileSync(skillsInstallPath, "utf-8");

    // Verify npm install includes --ignore-scripts
    expect(sourceCode).toContain('["npm", "install", "-g", "--ignore-scripts"');
  });

  it("buildNodeInstallCommand includes --ignore-scripts for pnpm", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const skillsInstallPath = path.resolve(import.meta.dirname, "skills-install.ts");
    const sourceCode = fs.readFileSync(skillsInstallPath, "utf-8");

    // Verify pnpm add includes --ignore-scripts
    expect(sourceCode).toContain('["pnpm", "add", "-g", "--ignore-scripts"');
  });

  it("buildNodeInstallCommand includes --ignore-scripts for yarn", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const skillsInstallPath = path.resolve(import.meta.dirname, "skills-install.ts");
    const sourceCode = fs.readFileSync(skillsInstallPath, "utf-8");

    // Verify yarn global add includes --ignore-scripts
    expect(sourceCode).toContain('["yarn", "global", "add", "--ignore-scripts"');
  });

  it("buildNodeInstallCommand includes --ignore-scripts for bun", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const skillsInstallPath = path.resolve(import.meta.dirname, "skills-install.ts");
    const sourceCode = fs.readFileSync(skillsInstallPath, "utf-8");

    // Verify bun add includes --ignore-scripts
    expect(sourceCode).toContain('["bun", "add", "-g", "--ignore-scripts"');
  });

  it("has CWE comment explaining the security fix", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const skillsInstallPath = path.resolve(import.meta.dirname, "skills-install.ts");
    const sourceCode = fs.readFileSync(skillsInstallPath, "utf-8");

    // Verify the security comment is present
    expect(sourceCode).toContain("CWE-506");
    expect(sourceCode).toContain("CWE-494");
    expect(sourceCode).toContain("--ignore-scripts");
  });
});
