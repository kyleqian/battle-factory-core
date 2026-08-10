import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { barrierAtAge, magicCoatAtAge } from "../../src/animation/barrier.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMagicCoatView,
  type SceneOnMagicCoatConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const fixtures = [
  "tools/compare/fixtures/magic-coat-player-spoink-opponent-onix.json",
  "tools/compare/fixtures/magic-coat-opponent-spoink-player-onix.json",
].map((path) => JSON.parse(readFileSync(path, "utf8")));

describe("MOVE_MAGIC_COAT exact defensive-wall presentation", () => {
  it("pins the source interval, sole four-component body, and lowest Level-50 carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/magicCoatSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toEqual({
      move: "MOVE_MAGIC_COAT", moveId: 277,
      sourceBounds: {
        start: "0x082d6c5d", endExclusive: "0x082d6c7a",
        byteBody: "0x1d label-address bytes / 0x1e Thumb-data-symbol convention",
      },
      lowestCarrier: "set 121 FRONTIER_MON_SPOINK / SPECIES_SPOINK 351",
      components: [
        "asset:ANIM_TAG_ORANGE_LIGHT_WALL",
        "sprite:gMagicCoatWallSpriteTemplate",
        "visualCommand:setalpha", "visualCommand:blendoff",
      ],
    });
  });

  it("reuses the source-identical no-sparkle wall program with its own typed seam", () => {
    for (const fixture of fixtures) {
      const center = fixture.attacker.geometry.battlePositionCenter;
      const side = fixture.attacker.geometry.side;
      for (let age = 0; age <= 75; age++) {
        expect(magicCoatAtAge(age, center, side)).toEqual(
          barrierAtAge(age, center, side),
        );
      }
      const stage = createSceneOnMovePresentation<SceneOnMagicCoatConfig>({
        move: "MAGIC_COAT", attacker: fixture.attacker, target: fixture.target,
        allocatorProfile: fixture.allocatorProfile,
        fieldProfile: fixture.fieldProfile,
      });
      const view = sceneOnMagicCoatView({ ...stage, age: 4 });
      expect(view).toMatchObject({
        wall: { x: side === "player" ? 112 : 136,
          y: center.y, paletteRotationSteps: 0 },
        soundTaskActive: true,
      });
      expect(view).not.toHaveProperty("sparkles");
      expect(sceneOnMagicCoatView({ ...stage, age: 75 }).active).toBe(false);
      expect(stage.config).not.toHaveProperty("magicCoatTarget");
    }
  });

  it("uses complete legal parties and constrains only active Spoink's moves", () => {
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
      const active = fixture.orientation === "player-back"
        ? scenario.overrides.parties.player[0]
        : scenario.overrides.parties.opponent[0];
      const onix = fixture.orientation === "player-back"
        ? scenario.overrides.parties.opponent[0]
        : scenario.overrides.parties.player[0];
      expect(active).toMatchObject({
        species: 351, nature: 7, item: 142,
        moves: [277, 277, 277, 277],
      });
      expect(onix.moves).toEqual([157, 20, 225, 201]);
    }
  });

  it("regenerates Spoink and orange-wall assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-magic-coat-assets-"));
    const output = join(scratch, "magic-coat.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractMagicCoatAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/magic-coat.json"),
    );
  });

  it("pins complete bilateral dense receipts and a twice-fresh portable verifier", () => {
    expect(fixtures.map((fixture) => ({
      orientation: fixture.orientation, window: fixture.sourceWindow,
      probe: fixture.probeJsonSha256, raw: fixture.rawRgbSha256,
      map: fixture.changeMapSha256,
    }))).toEqual([
      {
        orientation: "player-back",
        window: { startFrame: 69, endFrame: 144, frameCount: 76, wallFrame: 73 },
        probe: "c71bd1e2db4fc5833a5c1d7144d5b29a8cf6a5d54e4694b2da2b86801151a377",
        raw: "6b1734912efa3c045040b3919d464b1fb4159994ba8ad0669a6c30ee4c3cd0a9",
        map: "a2f6f128af566f88024893899b1956f622457da21b51a00f7715f816bca3a43c",
      },
      {
        orientation: "opponent-front",
        window: { startFrame: 73, endFrame: 148, frameCount: 76, wallFrame: 77 },
        probe: "340502f8ee286c92a655359f17e9782e6496cb070f4f73b1690db802ce791acd",
        raw: "378e362c97d254d04665a6f6079e9fee512d53bc0bcfcb61a8746ef39dce842b",
        map: "dd3063a359eeeb2f498742ced8c79cf8717cca6a4f771c1371cfc6676640b254",
      },
    ]);
    const verifier = readFileSync("tools/compare/barrierPortable.ts", "utf8");
    expect(verifier).toContain("for (let runNumber = 1; runNumber <= 2; runNumber++)");
    expect(verifier).toContain("hardware");
    expect(verifier).toContain("framebuffer");
  });
});
