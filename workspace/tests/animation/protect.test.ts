import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { protectAtAge } from "../../src/animation/protect.ts";
import {
  createSceneOnMovePresentation, sceneOnProtectView,
  type SceneOnProtectConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const fixtures = [
  "tools/compare/fixtures/protect-player-houndour-opponent-onix.json",
  "tools/compare/fixtures/protect-opponent-houndour-player-onix.json",
].map((path) => JSON.parse(readFileSync(path, "utf8")));

describe("MOVE_PROTECT exact Scene-ON presentation", () => {
  it("pins the real even ROM interval, five-component body, and lowest carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/protectSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toEqual({
      move: "MOVE_PROTECT", moveId: 182,
      sourceBounds: { start: "0x082cb3b4", endInclusive: "0x082cb3d1", byteBody: "0x1e" },
      lowestCarrier: "set 119 FRONTIER_MON_HOUNDOUR / SPECIES_HOUNDOUR 228",
      components: ["asset:ANIM_TAG_PROTECT", "sprite:gProtectSpriteTemplate",
        "visualCommand:monbg", "visualCommand:splitbgprio", "visualCommand:clearmonbg"],
    });
  });

  it("ports every callback phase from source age through inactive cleanup", () => {
    expect(protectAtAge(0, { x: 72, y: 80 }, "player")).toMatchObject({
      active: true, sprite: null, attackerBattlerHidden: false,
    });
    expect(protectAtAge(4, { x: 72, y: 80 }, "player").attackerBattlerHidden).toBe(true);
    expect(protectAtAge(7, { x: 72, y: 80 }, "player").sprite).toEqual({
      x: 96, y: 80, x2: 0, priority: 3, subpriority: 28,
      duration: 89, invisible: false, callback: "step",
      paletteRotationSteps: 0, alpha: { eva: 0, evb: 16 },
    });
    expect(protectAtAge(26, { x: 72, y: 80 }, "player").sprite).toMatchObject({
      x2: -7, duration: 70, paletteRotationSteps: 10, alpha: { eva: 10, evb: 6 },
    });
    expect(protectAtAge(96, { x: 176, y: 40 }, "opponent").sprite).toMatchObject({
      x: 200, x2: -33, priority: 2, subpriority: 38, duration: 0,
    });
    expect(protectAtAge(116, { x: 72, y: 80 }, "player").sprite).toMatchObject({
      x2: -41, invisible: true, callback: "destroyBlend", alpha: { eva: 0, evb: 16 },
    });
    expect(protectAtAge(117, { x: 72, y: 80 }, "player")).toMatchObject({ sprite: null, attackerBattlerHidden: true });
    expect(protectAtAge(118, { x: 72, y: 80 }, "player").attackerBattlerHidden).toBe(false);
    expect(protectAtAge(122, { x: 72, y: 80 }, "player").active).toBe(false);
  });

  it("uses a narrow typed seam with immutable field geometry", () => {
    for (const fixture of fixtures) {
      const stage = createSceneOnMovePresentation<SceneOnProtectConfig>({
        move: "PROTECT", attacker: fixture.attacker, target: fixture.target,
        allocatorProfile: fixture.allocatorProfile, fieldProfile: fixture.fieldProfile,
      });
      expect(sceneOnProtectView({ ...stage, age: 7 }).sprite).toMatchObject({
        x: fixture.attacker.geometry.battlePositionCenter.x + 24,
        y: fixture.attacker.geometry.battlePositionCenter.y,
      });
      expect(stage.config).not.toHaveProperty("protectSucceeded");
      expect(stage.config).not.toHaveProperty("battleRng");
    }
  });

  it("uses full legal parties and constrains only the active Houndour", () => {
    for (const fixture of fixtures) {
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      for (const side of ["player", "opponent"]) {
        expect(scenario.overrides.parties[side]).toHaveLength(3);
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ppUps).toHaveLength(4);
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
        }
      }
      const houndourSide = fixture.orientation === "player-back" ? "player" : "opponent";
      const onixSide = houndourSide === "player" ? "opponent" : "player";
      expect(scenario.overrides.parties[houndourSide][0]).toMatchObject({
        species: 228, nature: 6, item: 215, moves: [182, 182, 182, 182],
      });
      expect(scenario.overrides.parties[onixSide][0].moves).toEqual([157, 20, 225, 201]);
    }
  });

  it("regenerates assets and pins complete stable bilateral receipts", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-protect-assets-"));
    const output = join(scratch, "protect.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractProtectAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/protect.json"));
    expect(fixtures.map((fixture) => ({
      orientation: fixture.orientation, window: fixture.sourceWindow,
      probe: fixture.probeJsonSha256, raw: fixture.rawRgbSha256,
      map: fixture.changeMapSha256,
    }))).toEqual([
      { orientation: "player-back", window: { startFrame: 68, endFrame: 190, frameCount: 123, spriteFrame: 75 },
        probe: "e2769d1649763ff2c6732f51ac2e84833513b8918653d25381e47b911c2b78a6",
        raw: "a1d645924121c1aaffea6fdae8d636bc05a6ade0d38c0f0cc92ff6d9b54fb3f6",
        map: "7bea1a4bba4b42491f08397df4d97657f4d512ff1949a33c9d4f7f5d45633105" },
      { orientation: "opponent-front", window: { startFrame: 72, endFrame: 194, frameCount: 123, spriteFrame: 79 },
        probe: "cc2bc15a937eef4e32948f3e99c24a1a49003c87bdb5f1ae48992939c7743721",
        raw: "e483782163b2d05636347b75acebc62d68ed902a270223459502b9931bfd9080",
        map: "dcf82d6b347db6f66fa053320dcc00303096488238a0a9473c36d667e32c3a0d" },
    ]);
    for (const fixture of fixtures) {
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
    }
    expect(readFileSync("tools/compare/protectPortable.ts", "utf8"))
      .toContain("for (let runNumber = 1; runNumber <= 2; runNumber++)");
  });
});
