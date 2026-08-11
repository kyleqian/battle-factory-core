import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const SPLASH = 150;
const PLAYER_ATTACKS = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});
const TRAINER_ATTACKS = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

function config(
  rngSeed: number,
  playerHp: number,
  playerBenchHp?: readonly [number, number],
): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 1,
      moveId: SPLASH,
      attack: 100,
      defense: 80,
      spAttack: 50,
      spDefense: 80,
      speed: 100,
      hp: playerHp,
      maxHp: 100,
      status2: 2,
    },
    trainer: {
      species: 43,
      moveId: SPLASH,
      attack: 50,
      defense: 100,
      spAttack: 50,
      spDefense: 100,
      speed: 50,
      hp: 100,
    },
    ...(playerBenchHp === undefined ? {} : {
      playerBenchHp,
      playerBenchOverride: [{
        species: 2,
        level: 50,
        hp: playerBenchHp[0],
        maxHP: playerBenchHp[0],
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 100,
        moves: [SPLASH, 0, 0, 0],
        pp: [40, 0, 0, 0],
      }],
    }),
  };
}

function runTurn(input: FactoryFullTurnConfig) {
  const initial = createFactoryFullTurnBattleState(input);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: PLAYER_ATTACKS,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command");
  }
  const reasons: string[] = [];
  let rngValue = afterPlayer.state.rng.value;
  let rngCalls = afterPlayer.state.rng.calls;
  const reduced = reduceFactoryFullTurnDecision({
    rules: afterPlayer.state.rules,
    request: afterPlayer.nextRequest,
    decision: TRAINER_ATTACKS,
    rng: {
      draw(reason) {
        reasons.push(reason);
        rngValue = advanceRngValue(rngValue);
        rngCalls += 1;
        return rngValue >>> 16;
      },
      snapshot: () => ({ value: rngValue, calls: rngCalls }),
    },
  });
  return { reduced, reasons, rngValue, rngCalls };
}

describe("factory full-turn confusion self-hit", () => {
  /**
   * battle_util.c:2157-2177: decrement confusion; while still confused,
   * draw exactly `Random() & 1`; zero sets attacker-as-target, computes
   * CalculateBaseDamage(attacker, attacker, MOVE_POUND, 0, 40, 0,
   * attacker, attacker), marks confusionSelfDmg/UNABLE, and hands off to
   * BattleScript_MoveUsedIsConfused.
   *
   * battle_scripts_1.s:3796-3815: the true chooser arm falls through to
   * BattleScript_DoSelfConfusionDmg, whose first command cancels multi-turn
   * state, then adjustnormaldamage2 performs the self-hit path's only other
   * RNG draw before HP update/faint handling/MoveEnd.
   */
  it("self-hits through the complete source script with both battlers surviving and no ordinary hit-chain rolls", () => {
    const { reduced, reasons, rngCalls, rngValue } = runTurn(config(0, 100));
    expect(reduced.boundary.kind).toBe("decision-required");
    expect(reduced.rules.rulesContext.battlers[0].hp).toBeLessThan(100);
    expect(reduced.rules.rulesContext.battlers[1].hp).toBe(100);
    expect(reduced.rules.rulesContext.battlers[0].pp[0]).toBe(16);
    expect(reduced.rules.rulesContext.battlers[0].status2 & 0x7).toBe(1);
    expect(reasons).toEqual([
      "attackcanceler:unable-to-use-move",
      "adjustnormaldamage2",
      "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
    ]);
    expect(rngCalls).toBe(3);
    expect(rngValue).toBe(
      advanceRngValue(advanceRngValue(advanceRngValue(0))),
    );
  });

  it("self-hit KO reaches the real player replacement boundary on the same two-draw cursor", () => {
    const { reduced, reasons, rngCalls, rngValue } = runTurn(config(0, 1, [100, 0]));
    expect(reduced.boundary).toMatchObject({
      kind: "decision-required",
      request: {
        kind: "forced-switch",
        side: "player",
        battler: 0,
        faintedPartyIndex: 0,
        legalPartyIndexes: [1],
      },
    });
    expect(reduced.rules.rulesContext.party.player[0].hp).toBe(0);
    expect(reasons).toEqual([
      "attackcanceler:unable-to-use-move",
      "adjustnormaldamage2",
    ]);
    expect(rngCalls).toBe(2);
    expect(rngValue).toBe(advanceRngValue(advanceRngValue(0)));
  });

  it("Random() & 1 true leaves the no-self-hit return arm and full move unchanged", () => {
    const { reduced, reasons, rngCalls, rngValue } = runTurn(config(3, 100));
    expect(reduced.boundary.kind).toBe("decision-required");
    expect(reduced.rules.rulesContext.battlers[0].hp).toBe(100);
    expect(reduced.rules.rulesContext.battlers[1].hp).toBe(100);
    expect(reduced.rules.rulesContext.battlers[0].pp[0]).toBe(15);
    expect(reduced.rules.rulesContext.battlers[0].status2 & 0x7).toBe(1);
    expect(reasons).toEqual([
      "attackcanceler:unable-to-use-move",
      "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
    ]);
    expect(rngCalls).toBe(2);
    expect(rngValue).toBe(advanceRngValue(advanceRngValue(3)));
  });
});
