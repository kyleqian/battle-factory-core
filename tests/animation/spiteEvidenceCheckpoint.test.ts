import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixturePaths = [
  "tools/compare/fixtures/spite-player-haunter-opponent-onix.json",
  "tools/compare/fixtures/spite-opponent-haunter-player-onix.json",
] as const;

describe("MOVE_SPITE bilateral compositor checkpoint", () => {
  it("pins both complete Scene-ON receipts and their committed maps", () => {
    const fixtures = fixturePaths.map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(fixtures.map((fixture) => [
      fixture.orientation,
      fixture.sourceWindow.startFrame,
      fixture.sourceWindow.endFrame,
      fixture.sourceWindow.frameCount,
      fixture.probeJsonSha256,
      fixture.rawRgbSha256,
      fixture.changeMapSha256,
    ])).toEqual([
      ["player-back", 1000, 1220, 221,
        "819dd668e62e45b1e54684bda7b795f590d75f89484a5c1d1be345e6887a5a8a",
        "8dc2eee79572ab31247adef0357e2ca87dd0f53918d9f2299f8bb62e2b499d33",
        "9ca49a5aa0b98188f36cb4e0b3977932175f38f8d0bd3ec1af8396a3091592dd"],
      ["opponent-front", 1004, 1224, 221,
        "7e3ec5698c77fa2c04db5c0500e049e295ead57ba5649212aca6a19fc940c189",
        "7f49cb0c4cdaf30db723c23c7e8e891f11ba7158695e6750eec39d1d2fa17c7e",
        "1a89deb683c1a13a3db9727277a1f12f5553d5a7d72143091c394a88c8899d0d"],
    ]);
    for (const fixture of fixtures) {
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
    }
  });

  it("keeps the complete twice-fresh verifier executable but explicitly partial", () => {
    const portable = readFileSync("tools/compare/spitePortable.ts", "utf8");
    expect(portable).toContain("runNumber <= 2");
    expect(portable).toContain("tools/run-mgba-probe.py");
    expect(portable).toContain("framebuffer ${framebuffer}/221");
    expect(portable).toContain("checkpoint remains partial: ${failures.length}/221 acceptance failures");
    expect(portable).toContain("${221 - framebuffer}/221 framebuffer frames differ");
    expect(portable).toContain("if (failures.length && !checkpoint) throw");
  });

  it("leaves Spite and its ghost-background sibling unsupported", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact"))
      .toHaveLength(154);
    for (const move of ["MOVE_SPITE", "MOVE_NIGHT_SHADE"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toBeUndefined();
    }
  });
});
