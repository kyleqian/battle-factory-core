import { describe, expect, it } from "vitest";
import {
  cosmicPowerAtAge,
  cosmicPowerDisplayedBlendCoefficient,
  COSMIC_POWER_SOURCE_END_EXCLUSIVE,
  COSMIC_POWER_SOURCE_START,
} from "../../src/animation/cosmicPower.ts";

const center = { x: 72, y: 104 };

describe("Move_COSMIC_POWER source reducer", () => {
  it("pins the exclusive source interval and first inactive cleanup row", () => {
    expect(COSMIC_POWER_SOURCE_START).toBe(0x082d5f5d);
    expect(COSMIC_POWER_SOURCE_END_EXCLUSIVE).toBe(0x082d5fe2);
  });

  it("keeps the two non-attacker palette ramps one display behind task RAM", () => {
    expect(cosmicPowerAtAge(3, "player", center).nonAttackerBlendTaskActive).toBe(false);
    expect(cosmicPowerAtAge(4, "player", center).nonAttackerBlendRamCoefficient).toBe(2);
    expect(cosmicPowerDisplayedBlendCoefficient(4)).toBe(1);
    expect(cosmicPowerDisplayedBlendCoefficient(18)).toBe(15);
    expect(cosmicPowerAtAge(17, "player", center).nonAttackerBlendRamCoefficient).toBe(15);
    expect(cosmicPowerAtAge(181, "player", center).nonAttackerBlendRamCoefficient).toBe(13);
    expect(cosmicPowerDisplayedBlendCoefficient(181)).toBe(14);
    expect(cosmicPowerDisplayedBlendCoefficient(195)).toBe(0);
  });

  it("models the measured fade and two-frame sliding BG cadence", () => {
    expect(cosmicPowerAtAge(19, "player", center).bldcnt).toBe(0);
    expect(cosmicPowerAtAge(20, "player", center).bldy).toBe(0);
    expect(cosmicPowerAtAge(20, "player", center).bldcnt).toBe(232);
    expect(cosmicPowerAtAge(36, "player", center).bldy).toBe(16);
    expect(cosmicPowerAtAge(38, "player", center).background).toBe("cosmic");
    expect(cosmicPowerAtAge(40, "player", center).bg3vofs).toBe(1);
    expect(cosmicPowerAtAge(41, "player", center).bg3vofs).toBe(1);
    expect(cosmicPowerAtAge(220, "player", center).bg3vofs).toBe(91);
    expect(cosmicPowerAtAge(221, "player", center).bg3vofs).toBe(0);
    expect(cosmicPowerAtAge(220, "player", center).background).toBe("cosmic");
    expect(cosmicPowerAtAge(221, "player", center).background).toBe("battle");
    expect(cosmicPowerAtAge(238, "player", center).bldy).toBe(0);
  });

  it("orients source sounds and GrantingStars without changing their ages", () => {
    const player = cosmicPowerAtAge(129, "player", center);
    const opponent = cosmicPowerAtAge(129, "opponent", center);
    expect(player.audio).toEqual([{
      age: 129,
      player: "SE1",
      song: "SE_M_MORNING_SUN",
      pan: -64,
    }]);
    expect(opponent.audio[0]?.pan).toBe(63);
    expect(cosmicPowerAtAge(129, "player", center).sprites).toHaveLength(1);
    expect(cosmicPowerAtAge(139, "player", center).sprites).toHaveLength(2);
    expect(cosmicPowerAtAge(189, "player", center).sprites[0]?.y2).toBe(7);
    expect(cosmicPowerAtAge(199, "player", center).sprites[0]?.y2).toBe(7);
    expect(cosmicPowerAtAge(240, "player", center).active).toBe(false);
    expect(cosmicPowerAtAge(240, "player", center).sprites).toEqual([]);
    expect(cosmicPowerAtAge(0, "player", center).resources.sparkle2Loaded).toBe(false);
    expect(cosmicPowerAtAge(1, "player", center).resources.sparkle2Loaded).toBe(true);
    expect(cosmicPowerAtAge(240, "player", center).resources.sparkle2Loaded).toBe(false);
  });
});
