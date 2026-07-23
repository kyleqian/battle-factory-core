import { describe, expect, it } from "vitest";
import {
  burnResidualDamage,
  firePunchFistVisible,
  firePunchBurnFlames,
  firePunchFaintState,
  firePunchParticlesInDrawOrder,
  firePunchResidualBurnFlames,
  firePunchResolutionState,
  firePunchSpiralParticles,
  firePunchSpreadParticles,
  firePunchTargetBlendCoeff,
  firePunchTurn17MenuBounceTick,
  TURN17_FIRE_PUNCH_ENTRY_AGE,
  TURN17_FIRE_PUNCH_HP_COMMIT_AGE,
  TURN17_FIRE_PUNCH_RESOLUTION,
  TURN17_FAINTED_TEXT_TOTAL,
} from "../src/engine/firePunch.ts";
import ember from "../src/assets/gen/battle-anim-small-ember.json" with { type: "json" };
import hands from "../src/assets/gen/battle-anim-hands-and-feet.json" with { type: "json" };
import { advanceRngValue } from "../src/engine/rng.ts";

describe("FIRE_PUNCH source-derived reducers", () => {
  it("pins the delay-2 red ramp and delay-0 restore", () => {
    expect([45, 46, 48, 49, 70, 114, 115, 122, 123].map(firePunchTargetBlendCoeff))
      .toEqual([0, 1, 1, 2, 9, 9, 8, 1, 0]);
  });

  it("pins all four spiral phases and its closed lifetime", () => {
    expect(firePunchSpiralParticles(40)).toEqual([]);
    expect(firePunchSpiralParticles(41).map(({ x, y, frame }) => [x, y, frame]))
      .toEqual([[188, 107, 1], [232, 38, 1], [163, -6, 1], [120, 69, 1]]);
    expect(firePunchSpiralParticles(70)).toHaveLength(4);
    expect(firePunchSpiralParticles(71)).toEqual([]);
  });

  it("pins the seven fixed-point spread vectors and fist lifetime", () => {
    expect(firePunchSpreadParticles(72).map(({ x, y }) => [x, y]))
      .toEqual([[176, 61], [175, 61], [176, 60], [175, 60], [176, 61], [175, 60], [176, 60]]);
    expect(firePunchSpreadParticles(73).map(({ x, y }) => [x, y]))
      .toEqual([[177, 62], [174, 62], [177, 59], [174, 60], [177, 61], [174, 60], [176, 60]]);
    expect(firePunchSpreadParticles(112)).toHaveLength(7);
    expect(firePunchSpreadParticles(113)).toEqual([]);
    expect([71, 72, 80, 81].map(firePunchFistVisible)).toEqual([false, true, true, false]);
    expect(firePunchParticlesInDrawOrder(72).map(({ x, y }) => [x, y]))
      .toEqual([[176, 60], [175, 60], [175, 60], [176, 60], [176, 61], [176, 61], [175, 61]]);
  });

  it("pins hit wobble/blink and the pre-write display drain", () => {
    expect(firePunchResolutionState(132)).toMatchObject({ healthboxY2: 0, targetInvisible: false });
    expect(firePunchResolutionState(133).healthboxY2).toBe(1);
    expect(firePunchResolutionState(134)).toMatchObject({ healthboxY2: -1, targetInvisible: true });
    expect(firePunchResolutionState(137).targetInvisible).toBe(true);
    expect(firePunchResolutionState(138).targetInvisible).toBe(false);
    expect(firePunchResolutionState(152).healthboxY2).toBe(-1);
    expect(firePunchResolutionState(153).healthboxY2).toBe(0);
    expect(firePunchResolutionState(168).displayedHp).toBe(141);
    expect(firePunchResolutionState(234).displayedHp).toBe(75);
    expect(firePunchResolutionState(235).displayedHp).toBe(75);
  });

  it("pins Turn 17's shared-entry age, lethal drain, carried BRN, and atomic boundary", () => {
    expect(TURN17_FIRE_PUNCH_ENTRY_AGE).toBe(27);
    expect(TURN17_FIRE_PUNCH_HP_COMMIT_AGE - TURN17_FIRE_PUNCH_ENTRY_AGE).toBe(200);
    expect(firePunchResolutionState(226, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      displayedHp: 0,
      battleHp: 58,
      status: "burn",
      healthboxStatus: "burn",
      secondaryRollConsumed: false,
    });
    expect(firePunchResolutionState(227, TURN17_FIRE_PUNCH_RESOLUTION).battleHp).toBe(0);
  });

  it("pins Turn 17's lethal secondary no-op and current-move ownership", () => {
    expect(firePunchResolutionState(231, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      secondaryRollConsumed: false,
      currentMove: "FIRE_PUNCH",
      rngValue: 1102173384,
    });
    expect(firePunchResolutionState(232, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      secondaryRollConsumed: true,
      secondaryRollSucceeded: false,
      status: "burn",
      currentMove: "FIRE_PUNCH",
      rngValue: 2185030043,
    });
    expect(firePunchResolutionState(339, TURN17_FIRE_PUNCH_RESOLUTION).currentMove)
      .toBe("FIRE_PUNCH");
    expect(firePunchResolutionState(318, TURN17_FIRE_PUNCH_RESOLUTION).message)
      .toBe("FIRE_PUNCH");
    expect(firePunchResolutionState(319, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      message: "FAINTED",
      status: "none",
      healthboxStatus: "none",
    });
  });

  it("pins Turn 17's sink, teardown, text cadence, and input gate", () => {
    expect(firePunchFaintState(226, TURN17_FIRE_PUNCH_RESOLUTION)).toBeNull();
    expect(firePunchFaintState(227, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      sink: null,
      healthboxVisible: true,
      status: "burn",
      textVisibleChars: 0,
      inputReady: false,
    });
    expect(firePunchFaintState(301, TURN17_FIRE_PUNCH_RESOLUTION)!.sink).toBeNull();
    expect(firePunchFaintState(302, TURN17_FIRE_PUNCH_RESOLUTION)!.sink)
      .toEqual({ keptRows: 6, y2: 8 });
    expect(firePunchFaintState(312, TURN17_FIRE_PUNCH_RESOLUTION)!.sink)
      .toEqual({ keptRows: 1, y2: 48 });
    expect(firePunchFaintState(317, TURN17_FIRE_PUNCH_RESOLUTION)).toMatchObject({
      healthboxVisible: false,
      status: "none",
      textVisibleChars: 0,
    });
    expect(firePunchFaintState(318, TURN17_FIRE_PUNCH_RESOLUTION)!.textVisibleChars).toBe(0);
    expect(firePunchFaintState(319, TURN17_FIRE_PUNCH_RESOLUTION)!.textVisibleChars).toBe(1);
    expect(firePunchFaintState(337, TURN17_FIRE_PUNCH_RESOLUTION)!.textVisibleChars)
      .toBe(TURN17_FAINTED_TEXT_TOTAL);
    expect(firePunchFaintState(338, TURN17_FIRE_PUNCH_RESOLUTION)!.inputReady).toBe(false);
    expect(firePunchFaintState(339, TURN17_FIRE_PUNCH_RESOLUTION)!.inputReady).toBe(true);
  });

  it("pins the atomic HP write, successful secondary roll/status, badge, message, and move reset", () => {
    const beforeBurnRoll = 2840502189;
    const afterBurnRoll = advanceRngValue(beforeBurnRoll);
    expect(afterBurnRoll).toBe(2012156700);
    expect((afterBurnRoll >>> 16) % 100).toBeLessThan(10);

    expect(firePunchResolutionState(235)).toMatchObject({
      battleHp: 142,
      secondaryRollConsumed: false,
      status: "none",
      message: "FIRE_PUNCH",
    });
    expect(firePunchResolutionState(236).battleHp).toBe(75);
    expect(firePunchResolutionState(240)).toMatchObject({
      secondaryRollConsumed: false,
      secondaryRollSucceeded: false,
      status: "none",
    });
    expect(firePunchResolutionState(241)).toMatchObject({
      secondaryRollConsumed: true,
      secondaryRollSucceeded: true,
      status: "burn",
      healthboxStatus: "none",
    });
    expect(firePunchResolutionState(282).message).toBe("FIRE_PUNCH");
    expect(firePunchResolutionState(283).message).toBe("BURNED");
    expect(firePunchResolutionState(371).healthboxStatus).toBe("none");
    expect(firePunchResolutionState(372).healthboxStatus).toBe("burn");
    expect(firePunchResolutionState(382).currentMove).toBe("FIRE_PUNCH");
    expect(firePunchResolutionState(383).currentMove).toBeNull();
    expect(firePunchResolutionState(386).message).toBe("BURNED");
    expect(firePunchResolutionState(387).message).toBe("BURN_RESIDUAL");
  });

  it("pins Status_Burn's three fixed-point flame translations and lifetimes", () => {
    expect(firePunchBurnFlames(246)).toEqual([]);
    expect(firePunchBurnFlames(247)).toEqual([{ x: 152, y: 64, frame: 0 }]);
    expect(firePunchBurnFlames(250)).toEqual([{ x: 159, y: 64, frame: 1 }]);
    expect(firePunchBurnFlames(253)).toEqual([
      { x: 152, y: 64, frame: 0 },
      { x: 166, y: 64, frame: 1 },
    ]);
    expect(firePunchBurnFlames(259)).toHaveLength(3);
    expect(firePunchBurnFlames(268)).toEqual([
      { x: 173, y: 64, frame: 2 },
      { x: 187, y: 64, frame: 4 },
      { x: 199, y: 64, frame: 0 },
    ]);
    expect(firePunchBurnFlames(280)).toEqual([{ x: 199, y: 64, frame: 0 }]);
    expect(firePunchBurnFlames(281)).toEqual([]);
  });

  it("pins source-accurate burn residual damage, display drain, and atomic HP write", () => {
    expect(burnResidualDamage(142)).toBe(17);
    expect(burnResidualDamage(7)).toBe(1);
    expect(firePunchResolutionState(526)).toMatchObject({ displayedHp: 75, battleHp: 75 });
    expect(firePunchResolutionState(527)).toMatchObject({ displayedHp: 73, battleHp: 75 });
    expect(firePunchResolutionState(543)).toMatchObject({ displayedHp: 58, battleHp: 75 });
    expect(firePunchResolutionState(544)).toMatchObject({ displayedHp: 58, battleHp: 58 });
  });

  it("pins the residual status animation and two tail RNG/ownership boundaries", () => {
    expect(firePunchResidualBurnFlames(488)).toEqual([]);
    expect(firePunchResidualBurnFlames(489)).toEqual([{ x: 152, y: 64, frame: 0 }]);
    expect(firePunchResidualBurnFlames(522)).toEqual([{ x: 199, y: 64, frame: 0 }]);
    expect(firePunchResidualBurnFlames(523)).toEqual([]);

    expect(firePunchResolutionState(384)).toMatchObject({
      attacker: "MAGBY",
      target: "MURKROW",
      moveDamage: 0,
    });
    expect(firePunchResolutionState(385)).toMatchObject({
      attacker: "MURKROW",
      target: "MAGBY",
      moveDamage: 17,
    });
    expect(firePunchResolutionState(548)).toMatchObject({
      attacker: "MURKROW",
      target: "MAGBY",
      moveDamage: 17,
      tailRngCallsConsumed: 0,
      rngValue: 2012156700,
    });
    expect(firePunchResolutionState(549)).toMatchObject({
      attacker: "MAGBY",
      target: "MURKROW",
      moveDamage: 0,
      tailRngCallsConsumed: 1,
      rngValue: 3427142495,
    });
    expect(firePunchResolutionState(554)).toMatchObject({
      attacker: "MAGBY",
      target: "MAGBY",
      tailRngCallsConsumed: 6,
      rngValue: 1239728170,
    });
  });

  it("pins message clear and fresh action-menu bounce handoff", () => {
    expect(firePunchResolutionState(549).message).toBe("BURN_RESIDUAL");
    expect(firePunchResolutionState(550).message).toBe("BLANK");
    expect(firePunchResolutionState(554).message).toBe("BLANK");
    expect(firePunchResolutionState(555).message).toBe("ACTION_MENU");
    expect(firePunchTurn17MenuBounceTick(554)).toBeNull();
    expect(firePunchTurn17MenuBounceTick(555)).toBe(1748);
    expect(firePunchTurn17MenuBounceTick(556)).toBe(1749);
  });
});

describe("FIRE_PUNCH extracted assets", () => {
  it("pins the shared small-ember sheet and source animation metadata", () => {
    expect(ember.tileset).toMatchObject({ columns: 4, rows: 20 });
    expect(ember.tileset.tiles).toHaveLength(80);
    expect(ember.firePunchAnims).toMatchObject({
      frames: [1, 2, 3],
      frameDurationTicks: 4,
      spiral: { durationTicks: 30, radiusStart: 60, radiusDeltaFixed8: -512, angleStep: 9 },
      spread: { startYOffset: 10, durationTicks: 40 },
    });
  });

  it("pins the hands-and-feet sheet and FIRE_PUNCH's fist frame", () => {
    expect(hands.tileset).toMatchObject({ columns: 4, rows: 16 });
    expect(hands.tileset.tiles).toHaveLength(64);
    expect(hands.palette).toHaveLength(16);
    expect(hands.firePunchFist).toMatchObject({ frame: 0, durationArg: 8 });
  });
});
