import { describe, expect, it } from "vitest";
import focusEnergyFixture from "../tools/battle-lab/mechanic-focus-energy-success-repeat-off.json" with { type: "json" };
import { CRITICAL_HIT_CHANCE_ONE_IN, getCriticalHitChanceStage } from "../src/engine/damageCalc.ts";

describe("Focus Energy source/OFF evidence fixture", () => {
  it("uses complete legal parties and performs two ordinary player selections", () => {
    expect(focusEnergyFixture.profile).toBe("battle-scene-off");
    expect(focusEnergyFixture.overrides.parties.player).toHaveLength(3);
    expect(focusEnergyFixture.overrides.parties.opponent).toHaveLength(3);
    expect(focusEnergyFixture.overrides.parties.player[0]!.moves).toEqual([116, 33, 33, 33]);
    expect(focusEnergyFixture.overrides.parties.opponent[0]!.moves).toEqual([150, 150, 150, 150]);
    expect(focusEnergyFixture.trace.captureFrames.length).toBeGreaterThanOrEqual(240);
  });

  it("pins the source crit-stage consumer table and its cap", () => {
    expect(CRITICAL_HIT_CHANCE_ONE_IN).toEqual([16, 8, 4, 3, 2]);
    expect(getCriticalHitChanceStage({ focusEnergy: true })).toBe(2);
    expect(getCriticalHitChanceStage({ focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL" })).toBe(3);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS" })).toBe(3);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true })).toBe(4);
    expect(getCriticalHitChanceStage({ focusEnergy: true, attackerHoldEffect: "HOLD_EFFECT_STICK", isFarfetchd: true })).toBe(4);
    expect(getCriticalHitChanceStage({ focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL", attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true })).toBe(4);
  });
});
