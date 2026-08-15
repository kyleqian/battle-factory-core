import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import painSplitAsset from "../../src/animation/assets/pain-split.json" with { type: "json" };
import {
  PAIN_SPLIT_MATRICES,
  painSplitAtAge,
  painSplitDisplayedMatrixTransform,
} from "../../src/animation/painSplit.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPainSplitView,
} from "../../src/animation/sceneOnPresentation.ts";

const config = {
  move: "PAIN_SPLIT" as const,
  attacker: { species: "MISDREAVUS" as const, geometry: { side: "player" as const,
    spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 98 },
    battlePositionCenter: { x: 72, y: 80 } } },
  target: { species: "GENGAR" as const, geometry: { side: "opponent" as const,
    spriteCorner: { x: 144, y: 13 }, animationCenter: { x: 176, y: 45 },
    battlePositionCenter: { x: 176, y: 40 } } },
  fieldProfile: { playerHp: 117, playerMaxHp: 167, opponentHp: 156,
    opponentMaxHp: 156, playerGender: "female" as const, opponentGender: "male" as const },
};

describe("MOVE_PAIN_SPLIT source-relative presentation", () => {
  it("ports six ballistic projectiles and their literal animation frames", () => {
    const at = (age: number) => painSplitAtAge(age, {
      side: "player", species: "MISDREAVUS", center: { x: 72, y: 98 },
    }, { side: "opponent", species: "GENGAR", center: { x: 176, y: 45 } });
    expect(at(4).projectiles).toEqual([
      expect.objectContaining({ owner: "attacker", x: 64, y: 56, x2: 0, y2: 3, tileOffset: 0 }),
      expect.objectContaining({ owner: "target", x: 168, y: 3, x2: 0, y2: 3, tileOffset: 0 }),
    ]);
    expect(at(16).projectiles[0]).toMatchObject({ x2: 9, y2: 27, tileOffset: 4 });
    expect(at(17).projectiles[0]).toMatchObject({ x2: 10, y2: 24, tileOffset: 8 });
    expect(at(23).projectiles).toEqual([]);
    expect(at(29).projectiles).toHaveLength(2);
    expect(at(54).projectiles).toHaveLength(2);
  });

  it("derives all three task phases and the reset-only RAM+2 transfer", () => {
    const at = (age: number) => painSplitAtAge(age, {
      side: "player", species: "MISDREAVUS", center: { x: 72, y: 98 },
    }, { side: "opponent", species: "GENGAR", center: { x: 176, y: 45 } });
    expect(at(16).attackerTransform).toMatchObject({ x2: 2, y2: 4, matrix: PAIN_SPLIT_MATRICES[0] });
    expect(at(41).attackerTransform).toMatchObject({ x2: 2, y2: 18, matrix: PAIN_SPLIT_MATRICES[1] });
    expect(at(66).targetTransform).toMatchObject({ x2: 2, y2: 3, matrix: PAIN_SPLIT_MATRICES[2] });
    expect(painSplitDisplayedMatrixTransform(29, "player", "MISDREAVUS"))
      .toMatchObject({ x2: 2, y2: 4, affine: true, matrix: PAIN_SPLIT_MATRICES[0] });
    expect(painSplitDisplayedMatrixTransform(30, "player", "MISDREAVUS"))
      .toMatchObject({ affine: false, matrix: [256, 0, 0, 256] });
    expect(painSplitDisplayedMatrixTransform(48, "player", "GENGAR"))
      .toMatchObject({ x2: 2, y2: 18, affine: true, matrix: PAIN_SPLIT_MATRICES[1] });
    expect([16, 41, 66].map((age) => at(age).soundRestart))
      .toEqual(["SE_M_SWAGGER2", "SE_M_SWAGGER2", "SE_M_SWAGGER2"]);
    expect(at(80)).toMatchObject({ projectiles: [], tagsLoaded: false, active: false });
  });

  it("threads only immutable geometry and field chrome through the typed seam", () => {
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnPainSplitView({ ...stage, age: 41 }))
      .toMatchObject({ age: 41, soundRestart: "SE_M_SWAGGER2",
        attackerTransform: { matrix: PAIN_SPLIT_MATRICES[1] } });
  });

  it("regenerates the literal PAIN_SPLIT sheet and palette byte-for-byte", () => {
    expect(painSplitAsset).toMatchObject({ projectile: { tileset: { columns: 2, rows: 6 } } });
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-pain-split-assets-"));
    const output = join(scratch, "pain-split.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      resolve("tools/compare/extractPainSplitAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/pain-split.json")));
  });
});
