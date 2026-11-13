import { describe, expect, it } from "vitest";
import { estimateDamage, runTryToFaint, type FactoryAiTryToFaintBattler, type FactoryAiTryToFaintTarget } from "../src/engine/factoryAiTryToFaint.ts";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

// docs/parity-mac/ai-effectiveness-foresight.md, second part. TypeCalc (battle_script_commands.c:1536-1591) breaks out of the type table at the
// TYPE_FORESIGHT row when the target has STATUS2_FORESIGHT (:1560-1566): Normal / Fighting -> Ghost x0 is never applied. The check-bad-move pass was
// fixed with ROM seed 959. The other two passes call the same TypeCalc: Cmd_if_can_faint and Cmd_get_how_powerful_move_is (AI_CalcDmg + TypeCalc) in
// AI_TryToFaint, and every `if_type_effectiveness` probe in AI_CheckViability. Their ports did not take Foresight.
// Reach: silver Noland (the Brain always runs all three scripts) with Machoke (set 283: Cross Chop, Foresight) or Hitmonlee (set 338: Mega Kick,
// Brick Break, Foresight) against a Ghost-type rental.
const NEUTRAL = Object.freeze({ atk: 6, def: 6, spAtk: 6, spDef: 6 });
const ATTACKER: FactoryAiTryToFaintBattler = Object.freeze({
  attack: 100, defense: 100, spAttack: 100, spDefense: 100, level: 50, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const, statStages: NEUTRAL,
}) as unknown as FactoryAiTryToFaintBattler;
const ghost = (isForesighted: boolean, hp = 40): FactoryAiTryToFaintTarget => Object.freeze({
  attack: 100, defense: 100, spAttack: 100, spDefense: 100, level: 50, types: ["TYPE_DARK", "TYPE_GHOST"] as const, statStages: NEUTRAL,
  hp, ability: "ABILITY_KEEN_EYE", ...(isForesighted ? { isForesighted: true } : {}),
}) as unknown as FactoryAiTryToFaintTarget;
const MEGA_KICK = 25; const CROSS_CHOP = 238; const BRICK_BREAK = 280; const ROCK_TOMB = 317;

describe("AI_TryToFaint reads Foresight on the target", () => {
  it("the damage estimate of a Normal / Fighting move into a Ghost is real damage, not the floor of 1", () => {
    // Unfixed: 1 in all four.
    expect(estimateDamage(ATTACKER, ghost(false), MEGA_KICK, 100)).toBe(1);
    expect(estimateDamage(ATTACKER, ghost(true), MEGA_KICK, 100)).toBeGreaterThan(40);
    expect(estimateDamage(ATTACKER, ghost(false), BRICK_BREAK, 100)).toBe(1);
    // Fighting -> Dark x2, with same-type bonus
    expect(estimateDamage(ATTACKER, ghost(true), BRICK_BREAK, 100)).toBeGreaterThan(estimateDamage(ATTACKER, ghost(true), MEGA_KICK, 100));
  });

  it("if_can_faint and get_how_powerful_move_is follow: +4 for the knock-out, and Rock Tomb is no longer the most powerful move", () => {
    const run = (target: FactoryAiTryToFaintTarget, movesetIndex: 0 | 1 | 2 | 3, moveset: readonly [number, number, number, number]) => runTryToFaint({
      rng: { value: 0, calls: 0 }, moveId: moveset[movesetIndex], movesetIndex, moveset, simulatedRng: [100, 100, 100, 100],
      attacker: ATTACKER, target, drawOrdinalStart: 1, reasonPrefix: "probe",
    });
    const moves = [MEGA_KICK, BRICK_BREAK, 193, ROCK_TOMB] as const;
    // Without Foresight the game's AI sees Mega Kick as 1 damage: not a knock-out, and not the most powerful move (Rock Tomb is).
    expect(run(ghost(false), 0, moves)).toMatchObject({ canFaint: false, scoreDelta: -1 });
    // With Foresight Mega Kick knocks the 40 HP target out: +4. Unfixed: -1.
    expect(run(ghost(true), 0, moves)).toMatchObject({ canFaint: true, scoreDelta: 4 });
    // Rock Tomb into a target with 400 HP: the most powerful move without Foresight (0), behind the two others with it (-1). Unfixed: 0.
    expect(run(ghost(false, 400), 3, moves).scoreDelta).toBe(0);
    expect(run(ghost(true, 400), 3, moves).scoreDelta).toBe(-1);
  });
});

describe("AI_CheckViability's type probes read Foresight on the target", () => {
  const BASE = Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const, isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6,
    spAtkStage: 6, spDefStage: 6, hp: 100, maxHp: 100, moves: [CROSS_CHOP, 33, 33, 33] as const,
  });
  const run = (isForesighted: boolean) => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 }, moveId: CROSS_CHOP, attacker: BASE,
      target: { ...BASE, types: ["TYPE_DARK", "TYPE_GHOST"] as const, ...(isForesighted ? { isForesighted: true } : {}) },
      staleFuncResultFallback: undefined, drawOrdinalStart: 1, reasonPrefix: "probe",
    } as never);
    if (result.kind !== "scored") throw new Error(`expected a scored result, got ${result.kind}`);
    return result.draws.length;
  };

  it("AI_CV_HighCrit (data/battle_ai_scripts.s:1449-1461): Cross Chop into a Foresighted Dark / Ghost is x2 and goes straight to the second roll", () => {
    // x0 (no Foresight): neither x0.25 / x0.5 nor x2 / x4, so the script takes its first roll (198, not below 128) and then the second: 2 draws.
    expect(run(false)).toBe(2);
    // x2 (Foresight): jumps to AI_CV_HighCrit2: 1 draw. Unfixed: 2, and every later random number of the battle is one draw off.
    expect(run(true)).toBe(1);
  });
});
