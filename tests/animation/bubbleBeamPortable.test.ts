import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_BUBBLE_BEAM portable Scene-ON evidence", () => {
  it("reruns both legal Surskit orientations twice with fixed evidence and raw RGB digests", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/bubbleBeamPortable.ts", "tools/compare/fixtures/bubble-beam-player-surskit-opponent-onix.json", "tools/compare/fixtures/bubble-beam-opponent-surskit-player-onix.json"], { encoding: "utf8", timeout: 120000 });
    expect((output.match(/pass [12]:/g) ?? []).length).toBe(4);
  }, 150000);
});
