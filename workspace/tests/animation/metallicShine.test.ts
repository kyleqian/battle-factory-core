import { describe, expect, it } from "vitest";
import {
  METALLIC_SHINE_CLEAR_AGE,
  METALLIC_SHINE_END_AGE,
  metallicShineAtAge,
} from "../../src/animation/metallicShine.ts";

describe("AnimTask_MetallicShine source reducer", () => {
  it("initializes the metal BG, copied OBJ-window mask, registers, and grayscale palette", () => {
    expect(metallicShineAtAge(0, 72, 80)).toEqual({
      active: true,
      data10: 0,
      data11: 0,
      bg1X: 24,
      bg1Y: -48,
      maskSpriteActive: true,
      metalBgLoaded: true,
      attackerGrayscale: true,
      objWindowEnabled: true,
      blendEnabled: true,
    });
  });

  it("sweeps BG1_X four pixels per callback and wraps each 128px phase", () => {
    expect(metallicShineAtAge(1, 72, 80)).toMatchObject({
      data10: 4, data11: 0, bg1X: 20,
    });
    expect(metallicShineAtAge(31, 72, 80)).toMatchObject({
      data10: 124, data11: 0, bg1X: -100,
    });
    expect(metallicShineAtAge(32, 72, 80)).toMatchObject({
      data10: 0, data11: 1, bg1X: 24,
    });
  });

  it("restores permanent=FALSE palette and clears the mask/BG after sweep two", () => {
    expect(METALLIC_SHINE_CLEAR_AGE).toBe(64);
    expect(metallicShineAtAge(63, 72, 80)).toMatchObject({
      data10: 124, data11: 1, maskSpriteActive: true,
      metalBgLoaded: true, attackerGrayscale: true,
    });
    expect(metallicShineAtAge(64, 72, 80)).toMatchObject({
      data10: 0, data11: 2, maskSpriteActive: false,
      metalBgLoaded: false, attackerGrayscale: false,
      active: true, objWindowEnabled: true,
    });
    expect(metallicShineAtAge(64, 72, 80, true).attackerGrayscale).toBe(true);
  });

  it("tears down OBJ-window and blend registers after sweep three", () => {
    expect(METALLIC_SHINE_END_AGE).toBe(96);
    expect(metallicShineAtAge(95, 72, 80)).toMatchObject({
      data10: 124, data11: 2, active: true,
      objWindowEnabled: true, blendEnabled: true,
    });
    expect(metallicShineAtAge(96, 72, 80)).toMatchObject({
      data10: 0, data11: 3, active: false,
      objWindowEnabled: false, blendEnabled: false,
      maskSpriteActive: false, metalBgLoaded: false,
    });
  });
});
