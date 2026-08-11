import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_BARRIER exact evidence", () => {
  it("pins bilateral complete dense receipts and change maps", () => {
    const fixtures = ["player-drowzee-opponent-onix", "opponent-drowzee-player-onix"]
      .map((name) => JSON.parse(readFileSync(`tools/compare/fixtures/barrier-${name}.json`, "utf8")));
    expect(fixtures.map((f) => [f.orientation, f.sourceWindow.frameCount, f.probeJsonSha256, f.rawRgbSha256, f.changeMapSha256])).toEqual([
      ["player-back", 76, "2ad5e1dc9fe0a36d37ebc940abf420eb9b9d41e866c82cb492f4734bf3efb57d", "12ac1d1fac7b66e0a6768a4dbe455d311200911938f5e8414a348e48281f9e44", "4a0d48b988349f9dd14284235aaa6b4d55ad51f54d419a357f7511a6d83f9483"],
      ["opponent-front", 76, "1e4d8c972a8023ef45fe2c6882b146257ff50766aa8d95bc409090f767e87913", "a3d5047fcad7005e93ba97be8335387c2a2cd5d7e02c918b241d714013a07d3d", "baf4be08ef750d554ec9cc675db67293be1b0d06511fc3b25aa9248a57e71711"],
    ]);
  });

  it("audits the complete source body, callback, assets, audio, and carriers", () => {
    const result = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/barrierSourceAudit.ts"], { encoding: "utf8" }));
    expect(result).toMatchObject({ move: "MOVE_BARRIER", moveId: 112, carriers: [114, 124, 415, 416, 434] });
  });

  it("regenerates Drowzee and gray-wall assets byte-for-byte", () => {
    const output = join(mkdtempSync(join(tmpdir(), "barrier-assets-")), "barrier.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractBarrierAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/barrier.json"));
  });

  it("keeps twice-fresh reducer/seam/hardware/framebuffer acceptance executable", () => {
    const portable = readFileSync("tools/compare/barrierPortable.ts", "utf8");
    expect(portable).toContain("runNumber <= 2");
    expect(portable).toContain("framebuffer ${framebuffer}/76");
    expect(portable).toContain("tools/run-mgba-probe.py");
  });
});
