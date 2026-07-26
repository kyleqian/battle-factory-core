import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  submitFactoryAiDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- the banked KO-scenario move (factoryBattleScriptTerminalDecision.test.ts).
const EMBER = 52; // EFFECT_BURN_HIT, TYPE_FIRE, 10% MOVE_EFFECT_BURN secondary proc.
/** The banked KO-scenario seed (factoryBattleScriptTerminalDecision.test.ts, docs/hit-chain-ground-truth.md). */
const KO_SCENARIO_RNG_SEED = 919694434;
/** Brute-force-found: Ember's 10% burn proc actually lands on turn 1 with this seed, per this move's own real hit-chain RNG order (accuracy, crit, damage, secondary-effect-chance). */
const BURN_PROC_RNG_SEED = 61;
const STATUS1_BURN = 1 << 4;

// docs/factory-ai-ground-truth.md's own banked mask-7 fixture moveset/stat shape
// (factoryAiScoredDecision.test.ts) -- Alakazam-shaped attacker vs Marowak-shaped
// target, reused here so the SAME move-set proves out through the REAL hit chain,
// not just the AI's own damage estimate.
const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const NEUTRAL_STAGES = Object.freeze({ atk: 6, def: 6, spAtk: 6, spDef: 6 });

function aiTrainerConfig(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 105, moveId: STRENGTH, attack: 130, defense: 130, spAttack: 55, spDefense: 70, speed: 100, hp: 999,
      types: ["TYPE_GROUND", "TYPE_GROUND"],
    },
    trainer: {
      species: 65,
      moveId: MOVE_SURF,
      moves: [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT],
      attack: 55, defense: 65, spAttack: 135, spDefense: 105, speed: 50, hp: 999,
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    },
  };
}

/** Hand-built per `factoryAiDecisionPolicy.ts`'s own view contract -- no production "view builder" exists (direct-construction discipline), mirroring `factoryAiScoredDecision.test.ts`'s own fixture. */
function aiTrainerView(playerHp: number): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
    moves: Object.freeze([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT] as const),
    attacker: Object.freeze({
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
      attack: 55, defense: 65, spAttack: 135, spDefense: 105, level: 50, statStages: NEUTRAL_STAGES,
    }),
    target: Object.freeze({
      species: 105,
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 130, defense: 130, spAttack: 55, spDefense: 70, level: 50, statStages: NEUTRAL_STAGES,
      hp: playerHp,
      ability: "ABILITY_ROCK_HEAD",
      knownAbility: null,
    }),
  });
}

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

describe(
  "factory full-turn decision -- real Factory AI (mask 7) trainer decisions via submitFactoryAiDecision "
    + "(item 1: the kernel stays decision-source-agnostic -- the SAME reduceFactoryFullTurnDecision reducer, "
    + "just entered through the policy's own RNG-synchronizing composition instead of a test-supplied submission)",
  () => {
    const PLAYER_ATTACKS_TRAINER = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });

    it(
      "two real turns: each turn the trainer's move is chosen by the live mask-7 policy from a real 4-move "
        + "set (Surf/RockSlide/BodySlam/Thunderbolt) -- Surf wins unambiguously both times (it strictly "
        + "out-damages the other three against this Ground-type target, no tie to break) -- with the complete "
        + "per-turn draw ledger (policy draws + both hit chains) pinned as ONE continuous LCG stream",
      () => {
        let state = createFactoryFullTurnBattleState(aiTrainerConfig());

        // Turn 1, action 1: the player's own real hit chain (test-supplied, as before -- only the TRAINER side changes).
        const t1p = submitFactoryFullTurnDecision(state, {
          requestId: 1, side: "player", decision: PLAYER_ATTACKS_TRAINER,
        });
        if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
        expect(t1p.nextRequest.side).toBe("trainer");
        state = t1p.state;

        // Turn 1, action 2: the trainer's decision comes from the REAL policy, not a test-supplied submission.
        const t1PlayerHp = (t1p.state.rules as { rulesContext: { battlers: ReadonlyArray<{ hp: number }> } })
          .rulesContext.battlers[0]!.hp;
        expect(t1PlayerHp).toBe(999); // the player's own move never damages itself
        const t1Ai = submitFactoryAiDecision(state, aiTrainerView(t1PlayerHp), reduceFactoryFullTurnDecision);
        expect(t1Ai.trace.mask).toBe(7);
        expect(t1Ai.trace.executedScoringScripts).toEqual(["check-bad-move", "try-to-faint", "check-viability"]);
        // setup(4) + CBM get_ability (2 per non-immune slot x 3 = 6) + tie(1) -- zero from
        // TryToFaint/CheckViability (Surf's own damage estimate dwarfs the other three at 999 HP,
        // so every slot resolves via the cannot-faint/most-powerful compare, no extra Random() calls).
        expect(t1Ai.trace.draws).toHaveLength(11);
        expect(t1Ai.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 99, 99, 89]);
        expect(t1Ai.trace.bestMoveSlots).toEqual([0]); // Surf, the ONLY best slot -- no tie to break
        expect(t1Ai.submission.decision).toEqual({ kind: "use-move", moveSlot: 0, targetBattler: 0 });

        const t1 = t1Ai.transition;
        expect(t1.kind).toBe("decision-required");
        if (t1.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
        expect(t1.nextRequest.side).toBe("player");
        // The whole-battle cumulative cursor: 11 policy draws + 4 (player's Strength hit chain)
        // + 4 (trainer's real Surf hit chain, chosen by the policy) = 19.
        expect(t1.state.rng.calls).toBe(19);
        const rc1 = (t1.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
        expect(rc1.battleOutcome).toBe(0);
        const rc1Battlers = rc1.battlers as ReadonlyArray<{ hp: number }>;
        // Pinned by direct replay (KO_SCENARIO_RNG_SEED's own real LCG stream), not hand-derived --
        // player's Strength (Atk130 -> Def65, no STAB) then the AI's own real chosen Surf
        // (SpAtk135 -> SpDef70, 2x super effective vs Ground/Ground, no STAB).
        expect(rc1Battlers[1]!.hp).toBe(936); // trainer: 999 -> 936 (Strength)
        expect(rc1Battlers[0]!.hp).toBe(835); // player: 999 -> 835 (Surf, the policy's real chosen move)

        // Turn 2: the SAME mechanism repeats from wherever the one continuous LCG stream left off.
        const t2p = submitFactoryFullTurnDecision(t1.state, {
          requestId: t1.nextRequest.requestId, side: "player", decision: PLAYER_ATTACKS_TRAINER,
        });
        if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
        expect(t2p.nextRequest.side).toBe("trainer");

        const t2PlayerHp = (t2p.state.rules as { rulesContext: { battlers: ReadonlyArray<{ hp: number }> } })
          .rulesContext.battlers[0]!.hp;
        expect(t2PlayerHp).toBe(835);
        const t2Ai = submitFactoryAiDecision(t2p.state, aiTrainerView(t2PlayerHp), reduceFactoryFullTurnDecision);
        expect(t2Ai.trace.mask).toBe(7);
        expect(t2Ai.trace.draws).toHaveLength(11);
        expect(t2Ai.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 99, 99, 89]);
        expect(t2Ai.trace.bestMoveSlots).toEqual([0]); // Surf wins again, still unambiguous
        expect(t2Ai.submission.decision).toEqual({ kind: "use-move", moveSlot: 0, targetBattler: 0 });

        const t2 = t2Ai.transition;
        expect(t2.kind).toBe("decision-required");
        if (t2.kind !== "decision-required") throw new Error("expected decision-required after turn 2");
        // Cumulative across BOTH turns -- one continuous stream, not reset per turn:
        // 19 (turn 1) + 11 (turn 2 policy) + 4 (turn 2 player hit chain) + 4 (turn 2 trainer hit chain) = 38.
        expect(t2.state.rng.calls).toBe(38);
        const rc2 = (t2.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
        expect(rc2.battleOutcome).toBe(0);
        const rc2Battlers = rc2.battlers as ReadonlyArray<{ hp: number }>;
        expect(rc2Battlers[1]!.hp).toBe(871); // trainer: 936 -> 871 (Strength again)
        expect(rc2Battlers[0]!.hp).toBe(694); // player: 835 -> 694 (Surf again)
      },
    );
  },
);
