import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MEGA_PUNCH_FRAME_COUNT,
  megaPunchAtAge,
  megaPunchFistMatrixAtAge,
} from "../../src/animation/megaPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMegaPunchView,
} from "../../src/animation/sceneOnPresentation.ts";

const opponent = { x: 176, y: 42 };

describe("MOVE_MEGA_PUNCH source-relative reducer", () => {
  it("ports the MegaPunchKick affine callback and its hardware cleanup", () => {
    expect(megaPunchFistMatrixAtAge(13)).toBeNull();
    expect(megaPunchFistMatrixAtAge(14)).toEqual({
      pa: 229, pb: -122, pc: 122, pd: 229,
    });
    expect(megaPunchFistMatrixAtAge(65)).toEqual({
      pa: 256, pb: 0, pc: 0, pd: 256,
    });
    expect(megaPunchFistMatrixAtAge(87)).not.toBeNull();
    expect(megaPunchFistMatrixAtAge(88)).toBeNull();
  });

  it("pins background, palette, hitsplat, ShakeMon2, sound, and cleanup boundaries", () => {
    expect(MEGA_PUNCH_FRAME_COUNT).toBe(160);
    expect(megaPunchAtAge(14, "opponent", opponent).sound).toBe("SE_M_MEGA_KICK");
    expect(megaPunchAtAge(19, "opponent", opponent).targetWhiteCoefficient).toBe(1);
    expect(megaPunchAtAge(71, "opponent", opponent)).toMatchObject({
      hitsplatVisible: true,
      targetOffset: { x2: -4, y2: 0 },
      sound: "SE_M_VITAL_THROW2",
      background: { variant: "opponent", impact: true },
    });
    expect(megaPunchAtAge(72, "opponent", opponent).battlerBlackCoefficient).toBe(8);
    expect(megaPunchAtAge(114, "opponent", opponent).alpha).toBeNull();
    expect(megaPunchAtAge(137, "opponent", opponent).background.restoreBldy).toBe(16);
    expect(megaPunchAtAge(158, "opponent", opponent).active).toBe(true);
    expect(megaPunchAtAge(159, "opponent", opponent).active).toBe(false);
  });

  it("exposes Mega Punch through the narrow Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "MEGA_PUNCH",
      attacker: {
        species: "CACTURNE",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 55 },
          animationCenter: { x: 72, y: 87 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: opponent,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 177, playerMaxHp: 177,
        opponentHp: 142, opponentMaxHp: 142,
      },
    });
    expect(sceneOnMegaPunchView({ ...stage, age: 71 })).toMatchObject({
      age: 71, attacker: { species: "CACTURNE" }, target: { species: "ONIX" },
      fist: { variant: 0 }, hitsplatVisible: true,
    });
  });

  it("keeps source audit and extracted carrier art reproducible", () => {
    expect(execFileSync("npx", ["tsx", "tools/compare/megaPunchSourceAudit.ts"], {
      encoding: "utf8",
    })).toContain("sole and lowest legal Level-50 MOVE_MEGA_PUNCH carrier");
    const before = readFileSync("src/animation/assets/megaPunch.json");
    execFileSync("npx", ["tsx", "tools/compare/extractMegaPunchAssets.ts"]);
    expect(readFileSync("src/animation/assets/megaPunch.json")).toEqual(before);
  });
});
