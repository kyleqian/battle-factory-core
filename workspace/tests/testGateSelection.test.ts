import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gate = readFileSync("tools/test/test-gate.list", "utf8").split("\n").filter(Boolean);
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as Record<string, string>;

describe("npm run test:gate selection (docs/cln240-test-gate.md)", () => {
  it("lists existing, sorted, unique test files", () => {
    expect([...gate].sort()).toEqual(gate);
    expect(new Set(gate).size).toBe(gate.length);
    for (const file of gate) {
      expect(file).toMatch(/^tests\/.+\.test\.ts$/);
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("contains the whole of test:smoke", () => {
    const smoke = scripts["test:smoke"].split(/\s+/).filter((token) => /^tests\/.+\.test\.ts$/.test(token));
    expect(smoke.length).toBeGreaterThan(0);
    for (const file of smoke) expect(gate, file).toContain(file);
  });

  it("is wired through its own vitest config and leaves npm test on the full suite", () => {
    expect(scripts["test:gate"]).toContain("--config vitest.gate.config.ts");
    expect(scripts.test).not.toContain("--config");
    expect(scripts.test).not.toContain("tests/");
  });

  it("is exactly what the committed generator produces", () => {
    execFileSync("node", ["--experimental-strip-types", "tools/test/generateTestGate.ts", "--check"], { stdio: "pipe" });
  });
});
