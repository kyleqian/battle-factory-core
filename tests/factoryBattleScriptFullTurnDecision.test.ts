import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- the banked KO-scenario move (factoryBattleScriptTerminalDecision.test.ts).
const EMBER = 52; // EFFECT_BURN_HIT, TYPE_FIRE, 10% MOVE_EFFECT_BURN secondary proc.
/** The banked KO-scenario seed (factoryBattleScriptTerminalDecision.test.ts, docs/hit-chain-ground-truth.md). */
const KO_SCENARIO_RNG_SEED = 919694434;
/** Brute-force-found: Ember's 10% burn proc actually lands on turn 1 with this seed, per this move's own real hit-chain RNG order (accuracy, crit, damage, secondary-effect-chance). */
const BURN_PROC_RNG_SEED = 61;
const STATUS1_BURN = 1 << 4;

function config(overrides: Partial<FactoryFullTurnConfig> = {}): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 999,
    },
    trainer: {
      species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 999,
    },
    ...overrides,
  };
}

const PLAYER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });
const TRAINER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

describe("factory full-turn decision -- decision -> both actions -> end-turn -> next decision boundary", () => {
  it("asks the player, then the trainer, before resolving anything (both sides collected before turn order)", () => {
    const initial = createFactoryFullTurnBattleState(config());
    expect(initial.boundary).toEqual({
      kind: "decision-required",
      request: {
        kind: "command", requestId: 1, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: PLAYER_ATTACKS,
    });
    expect(afterPlayer.kind).toBe("decision-required");
    if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
    expect(afterPlayer.nextRequest).toEqual({
      kind: "command", requestId: 2, side: "trainer", battler: 1,
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
    });
    // Collecting the player's action alone must not execute anything yet.
    expect(afterPlayer.state.rng.calls).toBe(0);
    expect(afterPlayer.events.length).toBe(0);
  });

  it(
    "a full two-turn cycle: real GetWhoStrikesFirst order (player speed 100 > trainer speed 50, no tie), "
      + "each hit chain's own 4-roll ledger (accuracy/crit/damage/seteffectwithchance), runBattleEndTurnOrchestration, "
      + "then a coherent next decision boundary -- proving the LCG stream stays single and continuous across turns",
    () => {
      let state = createFactoryFullTurnBattleState(config());

      const t1p = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
      if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t1p.state;
      const t1t = submitFactoryFullTurnDecision(state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
      if (t1t.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
      state = t1t.state;

      // Player moves first (faster): 200 Atk -> 50 Def Strength lands for 204, dealing exactly that (999 -> 795).
      // Trainer then hits back: 50 Atk -> 50 Def Strength for 49 (999 -> 950). 4 rolls per hit chain, 8 total.
      const rc1 = (t1t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc1.battlers as Array<{ hp: number }>)[0]!.hp).toBe(950);
      expect((rc1.battlers as Array<{ hp: number }>)[1]!.hp).toBe(795);
      expect(rc1.battleOutcome).toBe(0);
      expect(t1t.state.rng.calls).toBe(8);
      expect(t1t.nextRequest).toEqual({
        kind: "command", requestId: 3, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      });

      const t2p = submitFactoryFullTurnDecision(state, { requestId: 3, side: "player", decision: PLAYER_ATTACKS });
      if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t2p.state;
      const t2t = submitFactoryFullTurnDecision(state, { requestId: 4, side: "trainer", decision: TRAINER_ATTACKS });
      if (t2t.kind !== "decision-required") throw new Error("expected decision-required after turn 2");

      // Turn 2 repeats the SAME mechanism from wherever the single LCG stream left off (900/614 -- pinned
      // by direct replay, not hand-derived, since the seed has already advanced 8 calls by this point).
      const rc2 = (t2t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc2.battlers as Array<{ hp: number }>)[0]!.hp).toBe(900);
      expect((rc2.battlers as Array<{ hp: number }>)[1]!.hp).toBe(614);
      expect(rc2.battleOutcome).toBe(0);
      expect(t2t.state.rng.calls).toBe(16); // cumulative across both turns -- one continuous stream, not reset per turn.
      expect(t2t.nextRequest).toEqual({
        kind: "command", requestId: 5, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      });
    },
  );

  it(
    "burn ticks between turns: applied via a REAL Ember MOVE_EFFECT_BURN proc on turn 1, "
      + "then floor(maxHP/8) at both end-turns (flat, no growing counter -- unlike Toxic)",
    () => {
      const burnConfig = config({
        rngSeed: BURN_PROC_RNG_SEED,
        player: {
          species: 1, moveId: EMBER, attack: 50, defense: 50, spAttack: 60, spDefense: 50, speed: 100, hp: 999,
        },
        trainer: {
          species: 43, moveId: STRENGTH, attack: 40, defense: 200, spAttack: 50, spDefense: 200, speed: 50, hp: 999,
        },
      });
      let state = createFactoryFullTurnBattleState(burnConfig);

      const t1p = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
      if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t1p.state;
      const t1t = submitFactoryFullTurnDecision(state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
      if (t1t.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
      state = t1t.state;

      const rc1 = (t1t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc1.battlers as Array<{ status1: number }>)[1]!.status1 & STATUS1_BURN).toBe(STATUS1_BURN);
      expect((rc1.battlers as Array<{ hp: number }>)[1]!.hp).toBe(869); // Ember's own chip damage + tick 1's floor(999/8)=124.
      expect((rc1.battlers as Array<{ hp: number }>)[0]!.hp).toBe(978);
      // The LAST damage precompute this turn is the end-turn tick's own (runs strictly after both actions) --
      // floor(999/8) = 124, decoupled from Ember's own hit-chain damage roll.
      expect(rc1.battleMoveDamage).toBe(124);
      expect(rc1.hpDealt).toBe(124);
      expect((rc1.party as { opponent: ReadonlyArray<{ hp: number; status1: number }> }).opponent[0]).toMatchObject({
        hp: 869,
        status1: STATUS1_BURN,
      });

      const t2p = submitFactoryFullTurnDecision(state, { requestId: 3, side: "player", decision: PLAYER_ATTACKS });
      if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t2p.state;
      const t2t = submitFactoryFullTurnDecision(state, { requestId: 4, side: "trainer", decision: TRAINER_ATTACKS });
      if (t2t.kind !== "decision-required") throw new Error("expected decision-required after turn 2");

      const rc2 = (t2t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc2.battlers as Array<{ status1: number }>)[1]!.status1 & STATUS1_BURN).toBe(STATUS1_BURN);
      expect((rc2.battlers as Array<{ hp: number }>)[1]!.hp).toBe(739); // 869 -> 739, same total drop as turn 1: recurrence.
      // Turn 2's own tick is the SAME flat floor(999/8) = 124 -- no growth (Toxic's own counter is the only status that grows, docs/end-turn-ground-truth.md §2b).
      expect(rc2.battleMoveDamage).toBe(124);
    },
  );

  it(
    "mid-turn KO on the first action: the second action is skipped per source "
      + "(RunTurnActionsFunctions, battle_main.c:4937-4943 forces B_ACTION_FINISHED once gBattleOutcome != 0; "
      + "the same rule the singles forced-switch fork's own cancelallactions enforces for the non-terminal case), "
      + "the faint fork runs, and the terminal boundary is reported directly -- runBattleEndTurnOrchestration never runs "
      + "(source's own sEndTurnFuncsTable only reaches BattleTurnPassed when gBattleOutcome stays 0)",
    () => {
      const koConfig = config({
        player: {
          species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
        },
        trainer: {
          species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
        },
      });
      const initial = createFactoryFullTurnBattleState(koConfig);
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1, side: "player", decision: PLAYER_ATTACKS,
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");

      const result = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
      });
      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.outcome).toBe("player-win");
      expect(result.state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });

      // Exactly the killing blow's own 4-roll ledger (accuracy, crit, adjustnormaldamage, seteffectwithchance) --
      // the trainer's own chosen Strength never runs, so it draws zero further RNG.
      expect(result.state.rng.calls).toBe(4);

      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON, computed by checkteamslost, not injected.
      expect((rulesContext.battlers as Array<{ hp: number }>)[1]!.hp).toBe(0);
      // The trainer's own move never dispatched: its PP is still full (16), unlike the player's (15, one use).
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[0]!.pp[0]).toBe(15);
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[1]!.pp[0]).toBe(16);
    },
  );

  it("throws if submitted again once terminal (matches submitBattleDecision's own hard-stop contract)", () => {
    const koConfig = config({
      player: {
        species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
      },
      trainer: {
        species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
      },
    });
    const initial = createFactoryFullTurnBattleState(koConfig);
    const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
    if (result.kind !== "terminal") throw new Error("expected terminal");
    expect(() => submitFactoryFullTurnDecision(result.state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS })).toThrow();
  });
});
