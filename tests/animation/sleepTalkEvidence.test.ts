import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_SLEEP_TALK bilateral Scene-ON evidence checkpoint", () => {
  const fixtures = ["player-seaking-opponent-onix", "opponent-seaking-player-onix"]
    .map((name) => JSON.parse(readFileSync(`tools/compare/fixtures/sleep-talk-${name}.json`, "utf8")));

  it("pins the complete distinct source body and legal set-333 carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/sleepTalkSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toEqual({
      move: "MOVE_SLEEP_TALK",
      moveId: 214,
      carrier: 333,
      letterSprites: 9,
      snoreCues: 3,
      symbols: {
        move: "0x082d4473",
        template: "0x085ce190",
        callback: "0x0815a7ec",
      },
    });
  });

  it("pins twice-fresh bilateral pointer-bounded windows through cleanup", () => {
    expect(fixtures.map((fixture) => [
      fixture.orientation,
      fixture.sourceWindow.startFrame,
      fixture.sourceWindow.endFrame,
      fixture.sourceWindow.frameCount,
      fixture.lifecycleCounts.gLetterZSpriteTemplate,
      fixture.freshRuns,
    ])).toEqual([
      ["player-back", 1356, 1541, 186, 9, 2],
      ["opponent-front", 4570, 4758, 189, 9, 2],
    ]);
    for (const fixture of fixtures) {
      expect(fixture.staging).toMatchObject({
        carrierSet: 333,
        restMove: 156,
        sleepTalkMove: 214,
        statusKind: "sleep",
        statusTurns: 2,
        status1: 2,
        heldItem: 183,
      });
      expect(fixture.topology).toEqual({
        tasks: ["AnimTask_SwayMonStep"],
        callbacks: ["AnimLetterZ"],
        templates: ["gLetterZSpriteTemplate"],
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("pins independent display latches and deterministic change maps", () => {
    expect(fixtures[0].display).toMatchObject({
      letterSpawnAges: [26, 34, 42, 64, 72, 80, 102, 110, 118],
      letterLastAges: [91, 99, 107, 129, 137, 145, 167, 175, 183],
      firstLetterData: [2, 5, -1, 10, -2],
    });
    expect(fixtures[1].display).toMatchObject({
      letterSpawnAges: [26, 34, 42, 64, 72, 80, 102, 110, 118],
      letterLastAges: [94, 102, 110, 132, 140, 148, 170, 178, 186],
      firstLetterData: [2, -5, 1, -10, 2],
    });
    for (const fixture of fixtures) {
      const map = readFileSync(fixture.changeMap);
      expect(createHash("sha256").update(map).digest("hex"))
        .toBe(fixture.changeMapSha256);
    }
  });

  it("keeps REST as the independently exact shared-control portable", () => {
    const portable = readFileSync("tools/compare/restPortable.ts", "utf8");
    expect(portable).toContain("source/hardware/seam/framebuffer exact");
    expect(portable).toContain("gSleepLetterZSpriteTemplate");
  });

  it("makes the complete Sleep Talk reducer and seam receipt load-bearing without pixels", () => {
    const portable = readFileSync("tools/compare/sleepTalkPortable.ts", "utf8");
    expect(portable).toContain("sleepTalkAtAge");
    expect(portable).toContain("sceneOnSleepTalkView");
    expect(portable).toContain("hardwareOamLagMatch");
    expect(portable).toContain("hardwareMatrixMatch");
    expect(portable).toContain("source/hardware/seam/raw-RGB exact (no framebuffer claim)");
    expect(portable).not.toContain("from \"../../src/engine/core.ts\"");
    expect(portable).not.toContain("framebuffer=\${");
  });
});
