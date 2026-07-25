import { describe, expect, it } from "vitest";
import {
  createFactoryTerminalMoveBattleState,
  mapFactoryBattleOutcome,
  submitFactoryTerminalMoveDecision,
  type FactoryTerminalMoveConfig,
} from "../src/engine/factoryBattleScriptTerminalDecision.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- docs/hit-chain-ground-truth.md's KO scenario move.
/** The KO scenario's real ROM frame-0 gRngValue (docs/hit-chain-ground-truth.md). */
const KO_SCENARIO_RNG_SEED = 919694434;

function config(overrides: Partial<FactoryTerminalMoveConfig> = {}): FactoryTerminalMoveConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    attackerMoveId: STRENGTH,
    attackerAttack: 200,
    targetDefense: 50,
    targetHp: 90,
    opponentBenchHp: [0, 0],
    ...overrides,
  };
}

const USE_STRENGTH_ON_TARGET = Object.freeze({
  requestId: 1,
  side: "player" as const,
  decision: Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const }),
});

describe("mapFactoryBattleOutcome", () => {
  it("pins the raw battleOutcome byte -> BattleOutcome mapping (Cmd_checkteamslost's only writer)", () => {
    expect(mapFactoryBattleOutcome(1)).toBe("player-win"); // B_OUTCOME_WON
    expect(mapFactoryBattleOutcome(2)).toBe("trainer-win"); // B_OUTCOME_LOST
    expect(mapFactoryBattleOutcome(3)).toBe("draw"); // B_OUTCOME_DREW = WON | LOST
  });

  it("rejects any byte outside the terminal WON/LOST/DREW domain", () => {
    expect(() => mapFactoryBattleOutcome(0)).toThrow();
    expect(() => mapFactoryBattleOutcome(4)).toThrow();
  });
});

describe("factory terminal move decision -- staged Level-50 Factory KO-of-the-last-healthy-mon battle", () => {
  it(
    "runs submitBattleDecision -> real hit chain -> HandleFaintedMonActions orchestration -> a REAL "
      + "{ kind: terminal, outcome: player-win } boundary, computed by checkteamslost from the party slice",
    () => {
      const initial = createFactoryTerminalMoveBattleState(config());
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_TARGET);
      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.outcome).toBe("player-win");
      expect(result.state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });

      // The banked hit-chain ledger stays exactly 4 rolls (accuracycheck, critcalc,
      // adjustnormaldamage, seteffectwithchance) -- GiveExp/HandleFaintedMon draw none.
      expect(result.state.rng.calls).toBe(4);

      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleMoveDamage).toBe(204); // 200 Atk -> 50 Def, Strength STAB -> 96% roll -> 204
      expect(rulesContext.hpDealt).toBe(90); // dealt == remaining HP, not the full 204 damage
      expect((rulesContext.battlers as Array<{ hp: number }>)[1]!.hp).toBe(0);
      expect(rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON, computed not injected
    },
  );

  it(
    "throws if submitted again once terminal (matches submitBattleDecision's own hard-stop contract)",
    () => {
      const initial = createFactoryTerminalMoveBattleState(config());
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_TARGET);
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(() => submitFactoryTerminalMoveDecision(result.state, USE_STRENGTH_ON_TARGET)).toThrow();
    },
  );

  it(
    "non-terminal fork: opponent still has a healthy bench slot -- surfaces as a named machine-barrier "
      + "boundary (the real, unregistered jumpifbattletype forced-switch gate), never a fake terminal",
    () => {
      const initial = createFactoryTerminalMoveBattleState(config({ opponentBenchHp: [90, 0] }));
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_TARGET);
      expect(result.kind).toBe("machine-barrier");
      if (result.kind !== "machine-barrier") throw new Error("expected machine-barrier");
      expect(result.barrier).toMatchObject({
        kind: "battle-script",
        entryLabel: "BattleScript_HandleFaintedMon",
        opcodeName: "B_SCR_OP_JUMPIFWORD",
      });
      expect(result.state.boundary.kind).toBe("machine-barrier");
      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(0); // genuinely undecided
      expect(result.state.rng.calls).toBe(4); // the barrier itself draws no additional RNG
    },
  );
});
