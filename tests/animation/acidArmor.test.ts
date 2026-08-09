import { describe, expect, it } from "vitest";
import {
  ACID_ARMOR_FIRST_INACTIVE_AGE,
  acidArmorAtAge,
} from "../../src/animation/acidArmor.ts";

describe("MOVE_ACID_ARMOR source-relative reducer", () => {
  it("ports the complete four-state task and alternating alpha ramps", () => {
    expect(acidArmorAtAge(3, "player").taskActive).toBe(false);
    expect(acidArmorAtAge(4, "player").taskData).toEqual([
      0, 2, 0, 16, 0, 0, 33, 24, 24, 63, 0, 0, 0, 46, 112, 6,
    ]);
    expect(acidArmorAtAge(36, "player").taskData.slice(0, 9)).toEqual([
      0, 66, 2, 15, 1, 0, 64, 744, 24,
    ]);
    expect(acidArmorAtAge(68, "player").taskData.slice(0, 5)).toEqual([1, 126, 2, 0, 16]);
    expect(acidArmorAtAge(80, "player").taskData.slice(0, 5)).toEqual([2, 126, 1, 1, 16]);
    expect(acidArmorAtAge(111, "player").taskData.slice(0, 5)).toEqual([3, 126, 0, 0, 0]);
    expect(acidArmorAtAge(112, "player").taskActive).toBe(false);
    expect(acidArmorAtAge(112, "player").bldalpha).toBe(0x0010);
    expect(acidArmorAtAge(113, "player").bldcnt).toBe(0);
  });

  it("mirrors the source phase and chooses BG priority by orientation", () => {
    const player = acidArmorAtAge(20, "player");
    const opponent = acidArmorAtAge(20, "opponent");
    expect(player.bg).toBe("BG2");
    expect(player.bldcnt).toBe(0x3f44);
    expect(player.taskData.slice(5, 9)).toEqual([0, 49, 408, 24]);
    expect(opponent.bg).toBe("BG1");
    expect(opponent.bldcnt).toBe(0x3f42);
    expect(opponent.taskData.slice(5, 9)).toEqual([1, 49, -408, -24]);
    expect(player.scanlines[80]!.hofs).toBe(-41);
    expect(opponent.scanlines[40]!.hofs).toBe(-134);
  });

  it("keeps scanline, monbg, and first-inactive cleanup bounds explicit", () => {
    expect(acidArmorAtAge(4, "player").scanlineActive).toBe(true);
    expect(acidArmorAtAge(79, "player").scanlineActive).toBe(true);
    expect(acidArmorAtAge(80, "player").scanlineActive).toBe(false);
    expect(acidArmorAtAge(112, "player").monbgActive).toBe(true);
    expect(acidArmorAtAge(113, "player").monbgActive).toBe(false);
    expect(ACID_ARMOR_FIRST_INACTIVE_AGE).toBe(118);
  });
});
