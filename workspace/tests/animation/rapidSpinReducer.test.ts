import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import rapidSpinAsset from "../../src/animation/assets/rapid-spin.json" with { type: "json" };
import { rapidSpinAtAge, type RapidSpinLiveInputs } from "../../src/animation/rapidSpin.ts";
import { verifyRapidSpinReducer } from "../../tools/compare/verifyRapidSpinReducer.ts";

const root = resolve(import.meta.dirname, "../..");
const zeros = Array.from({ length: 320 }, () => 0);
const base: RapidSpinLiveInputs = {
  attackerSide: "player", targetSide: "opponent",
  attackerSpecies: "WARTORTLE", targetSpecies: "ONIX",
  attackerCenter: { x: 72, y: 80 }, targetCenter: { x: 176, y: 42 },
  attackerSpriteSlot: 6, targetSpriteSlot: 8,
  rapidSpriteSlot: 3, impactSpriteSlot: 3, impactMatrixSlot: 0,
  elevationTaskSlot: 0, shakeTaskSlot: 0, monbgTaskSlot: 1,
  clearTaskSlot: 0, soundTaskSlot: 2,
  spriteOrder: Array.from({ length: 64 }, (_, slot) => slot),
  paletteBanks: { impact: 7, rapidSpin: 8 }, tileSlots: { impact: 6, rapidSpin: 7 },
  baseMatrixBitmap: 6, movePower: 20, moveDamage: 1,
  targetInitialOffset: { x: 0, y: 0 }, animationRng: 0x1234_5678,
  monbg: { layer: "bg2", spriteX: 72, spriteY: 90, bgX: -40, bgY: -58, inBg2: true, battlerId: 0 },
  initialScanlineSrcBuffer: 1,
  initialScanlineBanks: [zeros, zeros],
};

describe("MOVE_RAPID_SPIN source-relative reducer and typed seam", () => {
  it("replays all 262 retained component rows through reducer and seam", () => {
    expect(verifyRapidSpinReducer()).toEqual({
      "player-back": { reducerRows: 131, seamRows: 131, cleanup: { age: 130, active: false } },
      "opponent-front": { reducerRows: 131, seamRows: 131, cleanup: { age: 130, active: false } },
    });
  });

  it("consumes altered live geometry, allocation, palette, power, and animation RNG inputs", () => {
    const altered: RapidSpinLiveInputs = {
      ...base, attackerSpecies: "BLASTOISE", targetSpecies: "RELICANTH",
      attackerCenter: { x: 68, y: 84 }, targetCenter: { x: 181, y: 45 },
      attackerSpriteSlot: 9, targetSpriteSlot: 11,
      rapidSpriteSlot: 5, impactSpriteSlot: 7, impactMatrixSlot: 4,
      paletteBanks: { impact: 10, rapidSpin: 12 }, tileSlots: { impact: 15, rapidSpin: 19 },
      movePower: 96, moveDamage: 144, animationRng: 0x89ab_cdef,
      monbg: { layer: "bg2", spriteX: 68, spriteY: 93, bgX: -44, bgY: -61, inBg2: true, battlerId: 0 },
    };
    expect(rapidSpinAtAge(10, altered)).toMatchObject({
      battlers: { attacker: { species: "BLASTOISE", center: { x: 68, y: 84 } } },
      rapidSpin: { slot: 5, x: 68, y: 84 },
      resources: { impactPaletteBank: 10, rapidSpinPaletteBank: 12 },
      moveInputs: { power: 96, damage: 144, shakeSource: "power" },
      animationRng: 0x89ab_cdef,
    });
    expect(rapidSpinAtAge(53, altered)).toMatchObject({
      impact: { slot: 7, matrixSlot: 4, x: 181, y: 45 },
      shakeTask: { data: expect.arrayContaining([8]) },
      resources: { matrixBitmap: base.baseMatrixBitmap | (1 << 4) },
    });
    expect(rapidSpinAtAge(54, altered).targetOffset.x).toBe(4);
  });

  it("re-extracts only the absent Rapid Spin asset and reuses IMPACT", () => {
    const scratch = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
    const output = resolve(scratch, "rapid-spin.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractRapidSpinAssets.ts", "--out", output], { cwd: root });
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(rapidSpinAsset);
    expect(rapidSpinAsset.source.impact).toContain("battle-anim-hitsplat.json");
  });
});
