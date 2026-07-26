import { describe, expect, it } from "vitest";
import {
  runTryToFaint,
  type FactoryAiTryToFaintBattler,
  type FactoryAiTryToFaintTarget,
} from "../src/engine/factoryAiTryToFaint.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
});

const ATTACKER: FactoryAiTryToFaintBattler = Object.freeze({
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
  statStages: NEUTRAL_STAGES,
});

function target(overrides: Partial<FactoryAiTryToFaintTarget>): FactoryAiTryToFaintTarget {
  return Object.freeze({
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    level: 50,
    types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
    statStages: NEUTRAL_STAGES,
    hp: 999,
    ability: "ABILITY_NONE",
    ...overrides,
  });
}

const MOVE_POUND = 1; // EFFECT_HIT, power 40, TYPE_NORMAL
const MOVE_EXPLOSION = 153; // EFFECT_EXPLOSION, power 250
const MOVE_QUICK_ATTACK = 98; // EFFECT_QUICK_ATTACK, power 40
const MOVE_SURF = 57; // EFFECT_HIT, power 95, TYPE_WATER
const MOVE_ICE_BEAM = 58; // EFFECT_FREEZE_HIT, power 95, TYPE_ICE
const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN, power 0 -> MOVE_POWER_OTHER

function run(input: Readonly<{
  rng?: { value: number; calls: number };
  moveId: number;
  movesetIndex?: 0 | 1 | 2 | 3;
  moveset?: readonly [number, number, number, number];
  simulatedRng?: readonly [number, number, number, number];
  targetOverrides?: Partial<FactoryAiTryToFaintTarget>;
}>) {
  const moveset = input.moveset ?? [input.moveId, 0, 0, 0] as const;
  return runTryToFaint({
    rng: input.rng ?? { value: 0, calls: 0 },
    moveId: input.moveId,
    movesetIndex: input.movesetIndex ?? 0,
    moveset,
    simulatedRng: input.simulatedRng ?? [100, 100, 100, 100],
    attacker: ATTACKER,
    target: target(input.targetOverrides ?? {}),
    drawOrdinalStart: 1,
    reasonPrefix: "test-slot",
  });
}

describe("AI_TryToFaint (docs/factory-ai-ground-truth.md §1.3/§4 item 3)", () => {
  it("Pound (power 40) vs 100/100 level-50 neutral matchup deals exactly 19 -- the can-faint boundary", () => {
    const canFaint = run({ moveId: MOVE_POUND, targetOverrides: { hp: 19 } });
    expect(canFaint).toMatchObject({ canFaint: true, scoreDelta: 4, draws: [] });

    const cannotFaint = run({ moveId: MOVE_POUND, targetOverrides: { hp: 20 } });
    expect(cannotFaint).toMatchObject({ canFaint: false, mostPowerful: "most-powerful", scoreDelta: 0 });
  });

  it("grants +0 (no bonus) for a can-faint Explosion", () => {
    const result = run({ moveId: MOVE_EXPLOSION, targetOverrides: { hp: 5 } });
    expect(result).toMatchObject({ canFaint: true, scoreDelta: 0, draws: [] });
  });

  it("grants +6 (both score+2 and the score+4 fallthrough) for a can-faint Quick Attack", () => {
    const result = run({ moveId: MOVE_QUICK_ATTACK, targetOverrides: { hp: 5 } });
    expect(result).toMatchObject({ canFaint: true, scoreDelta: 6, draws: [] });
  });

  it("scores -1 when cannot faint and a moveset sibling deals strictly more estimated damage", () => {
    const result = run({
      moveId: MOVE_POUND,
      moveset: [MOVE_POUND, MOVE_SURF, 0, 0],
      movesetIndex: 0,
      targetOverrides: { hp: 999 },
    });
    expect(result).toMatchObject({ canFaint: false, mostPowerful: "not-most-powerful", scoreDelta: -1, draws: [] });
  });

  it("scores 0 (no penalty) when cannot faint but no moveset sibling out-damages it", () => {
    const result = run({
      moveId: MOVE_POUND,
      moveset: [MOVE_POUND, 0, 0, 0],
      movesetIndex: 0,
      targetOverrides: { hp: 999 },
    });
    expect(result).toMatchObject({ canFaint: false, mostPowerful: "most-powerful", scoreDelta: 0, draws: [] });
  });

  it("classifies a power<=1/ignored-effect considered move as MOVE_POWER_OTHER -- no -1 penalty", () => {
    const result = run({
      moveId: MOVE_GROWL,
      moveset: [MOVE_GROWL, MOVE_SURF, 0, 0],
      movesetIndex: 0,
      targetOverrides: { hp: 999 },
    });
    expect(result).toMatchObject({ canFaint: false, mostPowerful: "power-other", scoreDelta: 0, draws: [] });
  });

  it("draws exactly one if_random_less_than 80 roll when cannot-faint and exactly x4 effective, +2 on failure (roll >= 80)", () => {
    // seed 1 -> post-step randomValue%256 === 198 (>= 80: the fallthrough that grants +2).
    const result = run({
      moveId: MOVE_ICE_BEAM,
      moveset: [MOVE_ICE_BEAM, 0, 0, 0],
      rng: { value: 1, calls: 0 },
      targetOverrides: { hp: 999, types: ["TYPE_GRASS", "TYPE_FLYING"] },
    });
    expect(result).toMatchObject({ canFaint: false, mostPowerful: "most-powerful", scoreDelta: 2 });
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "double-super-effective", succeeded: true });
    expect(result.rng.calls).toBe(1);
  });

  it("draws the roll but grants +0 when the roll succeeds the < 80 jump (skips the bonus)", () => {
    // seed 4 -> post-step randomValue%256 === 25 (< 80: jumps past `score +2`).
    const result = run({
      moveId: MOVE_ICE_BEAM,
      moveset: [MOVE_ICE_BEAM, 0, 0, 0],
      rng: { value: 4, calls: 0 },
      targetOverrides: { hp: 999, types: ["TYPE_GRASS", "TYPE_FLYING"] },
    });
    expect(result).toMatchObject({ canFaint: false, mostPowerful: "most-powerful", scoreDelta: 0 });
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "double-super-effective", succeeded: false });
  });

  it("does not draw when cannot-faint and not x4 effective (neutral matchup)", () => {
    const result = run({ moveId: MOVE_POUND, targetOverrides: { hp: 999 } });
    expect(result.draws).toHaveLength(0);
    expect(result.rng.calls).toBe(0);
  });

  it("never treats Levitate-vs-Ground as x4 (the shipped non-BUGFIX quirk: the type loop is skipped, not zeroed)", () => {
    const result = run({
      moveId: MOVE_POUND, // TYPE_NORMAL, not Ground -- Levitate check is Ground-specific, this just proves the flag is inert off-type
      targetOverrides: { hp: 999, ability: "ABILITY_LEVITATE" },
    });
    expect(result.draws).toHaveLength(0);
  });
});
