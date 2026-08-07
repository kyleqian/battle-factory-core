import { describe, expect, it } from "vitest";
import {
  FLASH_BG_PALETTE_MASK,
  FLASH_OBJ_PALETTE_MASK,
  FLASH_PHASE0_FRAME_COUNT,
  FLASH_SNAP_COEFFICIENT,
  FLASH_TASK_CREATE_AGE,
  FLASH_TASK_DESTROY_AGE,
  flashAtAge,
  flashFadedCoefficientAtAge,
} from "../../src/animation/flash.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFlashView,
  type SceneOnFlashConfig,
} from "../../src/animation/sceneOnPresentation.ts";

function displayedCoefficientAtAge(age: number): number | null {
  return flashFadedCoefficientAtAge(age - 1);
}

describe("MOVE_FLASH source-relative reducer", () => {
  it("splits the flash between BG palettes 1-3 and battle-mon OBJ palettes 0-1", () => {
    // data[15] = GetBattlePalettesMask(TRUE, ...) & 0xFFFF = 0xe (banks 1-3);
    // data[14] = GetBattleMonSpritePalettesMask(1,1,1,1) >> 16 = 0x3 (banks 0-1).
    expect(FLASH_BG_PALETTE_MASK).toBe(0x000e);
    expect(FLASH_OBJ_PALETTE_MASK).toBe(0x0003);
    const state = flashAtAge(10);
    expect(state.objPaletteMask).toBe(0x0003);
    expect(state.bgPaletteMask).toBe(0x000e);
  });

  it("snaps to white/black and holds for the 7-frame phase 0", () => {
    // Age 0 is the script's playsewithpan frame - no palette write yet.
    expect(flashFadedCoefficientAtAge(0)).toBeNull();
    expect(FLASH_TASK_CREATE_AGE).toBe(1);
    expect(FLASH_SNAP_COEFFICIENT).toBe(16);
    expect(FLASH_PHASE0_FRAME_COUNT).toBe(7);
    // Task created at age 1; phase 0 increments data[1] 1..7 -> hold ages 1-8.
    for (let age = 1; age <= 8; age += 1) {
      expect(flashFadedCoefficientAtAge(age)).toBe(16);
    }
  });

  it("ramps the coefficient 16 down to 0 one decrement per 2 frames", () => {
    // data[2] = 16 then the phase-1 cadence (data[1] > 1 every 2 frames)
    // blends 15,14,...,0 at RAM ages 9,11,...,39.
    expect(flashFadedCoefficientAtAge(9)).toBe(15);
    expect(flashFadedCoefficientAtAge(10)).toBe(15);
    expect(flashFadedCoefficientAtAge(11)).toBe(14);
    expect(flashFadedCoefficientAtAge(12)).toBe(14);
    expect(flashFadedCoefficientAtAge(20)).toBe(10);
    expect(flashFadedCoefficientAtAge(37)).toBe(1);
    expect(flashFadedCoefficientAtAge(38)).toBe(1);
    expect(flashFadedCoefficientAtAge(39)).toBe(0);
    expect(flashFadedCoefficientAtAge(40)).toBeNull();
    expect(FLASH_TASK_DESTROY_AGE).toBe(40);
  });

  it("latches the display one age behind the RAM palette", () => {
    // OAM/palette writes render on the following display: the snap shows from
    // display age 2 through 9 and the 16..0 ramp from display age 10 (both
    // orientations share this latch - it is palette-display timing, not side).
    expect(displayedCoefficientAtAge(0)).toBeNull();
    expect(displayedCoefficientAtAge(1)).toBeNull();
    for (let age = 2; age <= 9; age += 1) {
      expect(displayedCoefficientAtAge(age)).toBe(16);
    }
    expect(displayedCoefficientAtAge(10)).toBe(15);
    expect(displayedCoefficientAtAge(39)).toBe(1);
    expect(displayedCoefficientAtAge(40)).toBe(0);
    expect(displayedCoefficientAtAge(41)).toBeNull();
  });

  it("tracks the visual-task lifecycle through the isolated window and cleanup", () => {
    expect(flashAtAge(0).visualTaskCount).toBe(0);
    for (let age = 1; age < 40; age += 1) {
      expect(flashAtAge(age).visualTaskCount).toBe(1);
    }
    for (let age = 40; age <= 63; age += 1) {
      expect(flashAtAge(age).visualTaskCount).toBe(0);
    }
  });

  it("exposes only immutable presentation geometry through the typed seam", () => {
    const config: SceneOnFlashConfig = {
      move: "FLASH",
      attacker: {
        species: "MAREEP",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 89 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 147,
        playerMaxHp: 162,
        opponentHp: 142,
        opponentMaxHp: 142,
        playerGender: "female",
        opponentGender: "male",
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnFlashView({ ...stage, age: 10 });
    expect(view).toMatchObject({
      age: 10,
      attacker: { species: "MAREEP" },
      target: { species: "ONIX" },
      visualTaskCount: 1,
      fadedCoefficient: 15,
    });
    expect(view).toMatchObject({ bgPaletteMask: 0x000e, objPaletteMask: 0x0003 });
    expect("damage" in view).toBe(false);
    expect("moves" in view).toBe(false);
  });
});
