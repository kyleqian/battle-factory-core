// Pins the cleanup contract of `tools/lib/scratch.ts`.
//
// The comparators write diagnostic PNGs and raw framebuffers into their scratch
// directory, print the path, and exit nonzero when they find a mismatch — so
// cleanup MUST be gated on a clean exit. If that gating ever inverts, a failing
// comparator would delete the artifacts a human was about to open, which is
// worse than the leak the helper exists to fix. Both directions are asserted.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scratchModule = pathToFileURL(resolve("tools/lib/scratch.ts")).href;

function scratchDirFromChildExiting(code: number): string {
  const script =
    `import { createScratchDir } from ${JSON.stringify(scratchModule)};\n` +
    `console.log(createScratchDir("pokebench-scratch-selftest-"));\n` +
    `process.exit(${code});\n`;
  const args = ["--experimental-strip-types", "--input-type=module", "--eval", script];
  try {
    return execFileSync(process.execPath, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    // A nonzero exit is expected in one of the two cases below.
    return String((error as { stdout?: string }).stdout ?? "").trim();
  }
}

describe("tools scratch directories", () => {
  it("removes the directory when the tool exits cleanly", () => {
    const directory = scratchDirFromChildExiting(0);
    expect(directory).not.toBe("");
    expect(existsSync(directory)).toBe(false);
  });

  it("keeps the directory when the tool exits nonzero, for inspection", () => {
    const directory = scratchDirFromChildExiting(1);
    expect(directory).not.toBe("");
    expect(existsSync(directory)).toBe(true);
  });
});
