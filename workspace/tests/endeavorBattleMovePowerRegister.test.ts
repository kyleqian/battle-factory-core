import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  createFactoryFullTurnBattleStateFromRulesContext,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { factoryAiLastCalcMovePower } from "../src/engine/factoryAiTryToFaint.ts";
import { initializeFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";

// docs/rollout-endeavor-prep.md s0.2: gBattleMovePower is a presentation-only EWRAM register read only by Cmd_attackanimation.
const ENDEAVOR = 283;
const SLEEP_TALK = 214;
const PLAYER_ENDEAVOR = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });
const TRAINER_SLEEP_TALK = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 325391,
    player: {
      species: 213, moveId: ENDEAVOR, moves: [ENDEAVOR, 0, 0, 0], pp: [5, 0, 0, 0], attack: 30, defense: 282, spAttack: 33,
      spDefense: 282, speed: 22, hp: 95, types: ["TYPE_BUG", "TYPE_ROCK"],
    },
    trainer: {
      species: 242, moveId: SLEEP_TALK, moves: [SLEEP_TALK, 0, 0, 0], pp: [10, 0, 0, 0], attack: 30, defense: 30, spAttack: 104,
      spDefense: 155, speed: 54, hp: 362, types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

/** Endeavor's MOVE_ANIMATION `power` argument (the third), plus the whole turn outcome for the unchanged-gameplay check. */
function playerEndeavorTurn(register: number | undefined) {
  const base = createFactoryFullTurnBattleState(config());
  const initial = register === undefined ? base : createFactoryFullTurnBattleStateFromRulesContext({
    requestId: 1, rngSeed: 325391,
    rulesContext: { ...base.rules.rulesContext, battleMovePower: register },
  });
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: PLAYER_ENDEAVOR });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
  const result = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: TRAINER_SLEEP_TALK });
  const events = JSON.stringify((result as { events?: unknown }).events ?? []);
  const arg = /"animationId":"MOVE_ANIMATION"[^}]*?"arguments":\["283","\d+","(\d+)"/.exec(events);
  const rules = result.kind === "terminal" ? null : result.state.rules.rulesContext;
  return {
    power: arg === null ? null : Number(arg[1]),
    hp: rules === null ? null : [rules.battlers[0]!.hp, rules.battlers[1]!.hp],
    rng: result.kind === "terminal" ? null : result.state.rng,
    register: rules?.battleMovePower ?? null,
  };
}

describe("Endeavor stale gBattleMovePower register", () => {
  it("W1 + first-of-run: Endeavor's MOVE_ANIMATION carries the register (0 on a fresh run), not the table power", () => {
    expect(playerEndeavorTurn(undefined).power).toBe(0);
  });
  it("carries a stale register verbatim and changes no outcome or RNG", () => {
    const fresh = playerEndeavorTurn(undefined);
    const stale = playerEndeavorTurn(40);
    expect(stale.power).toBe(40);
    expect({ ...stale, power: 0, register: 0 }).toEqual({ ...fresh, power: 0, register: 0 }); // only the register differs
    expect(stale.register).toBe(40);
  });
  it("W2 rule R: the last slot with power > 1 (effect-filtered below the full flag set)", () => {
    const mon = { attack: 100, defense: 100, spAttack: 100, spDefense: 100, level: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      statStages: { atk: 6, def: 6, spe: 6, spatk: 6, spdef: 6, acc: 6, eva: 6 } } as never;
    const target = { ...(mon as object), hp: 200, ability: "ABILITY_NONE" } as never;
    // [33 Tackle 35, 157 Rock Slide 75, 98 Quick Attack 40, 283 Endeavor power 1] -> 40; [..., 153 Explosion 250] -> 40 / 250.
    expect(factoryAiLastCalcMovePower(mon, target, [33, 157, 98, 283], false)).toBe(40);
    expect(factoryAiLastCalcMovePower(mon, target, [157, 153, 33, 283], false)).toBe(35);
    expect(factoryAiLastCalcMovePower(mon, target, [33, 157, 98, 153], false)).toBe(40);
    expect(factoryAiLastCalcMovePower(mon, target, [33, 157, 98, 153], true)).toBe(250);
    expect(factoryAiLastCalcMovePower(mon, target, [283, 0, 0, 0], true)).toBeNull();
  });
  it("cross-battle carry: a fresh battle start seeds the register from the previous battle (default 0)", () => {
    const sample = createFactoryFullTurnBattleState(config()).rules.rulesContext;
    const start = (battleMovePower?: number) => initializeFreshFactoryBattle({
      requestId: 1, rngSeed: 1, battleScene: "on", playerParty: sample.party.player as never, opponentParty: sample.party.opponent as never,
      ...(battleMovePower === undefined ? {} : { battleMovePower }),
    });
    expect(start().state.rules.rulesContext.battleMovePower).toBe(0);
    expect(start(75).state.rules.rulesContext.battleMovePower).toBe(75);
  });
});
