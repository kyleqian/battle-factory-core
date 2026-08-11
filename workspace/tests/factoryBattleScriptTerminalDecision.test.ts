import { describe, expect, it } from "vitest";
import {
  parseBattleState,
  serializeBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryTerminalMoveBattleState,
  mapFactoryBattleOutcome,
  submitFactoryTerminalMoveDecision,
  type FactoryTerminalDecisionRules,
  type FactoryTerminalMoveConfig,
} from "../src/engine/factoryBattleScriptTerminalDecision.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- docs/hit-chain-ground-truth.md's KO scenario move.
/** The KO scenario's real ROM frame-0 gRngValue (docs/hit-chain-ground-truth.md). */
const KO_SCENARIO_RNG_SEED = 919694434;
/** docs/forced-switch-ground-truth.md §2/§3's own switch-in pick: MACHOP + a real super-effective (FIGHTING vs NORMAL) move. */
const MACHOP = 66;
const KARATE_CHOP = 2;
/** docs/forced-switch-ground-truth.md §3a's own "next living index" decoy -- healthy, but never the AI/player's actual pick. */
const PIDGEY = 16;

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
    "non-terminal fork: opponent still has exactly one healthy bench slot -- selects that sole legal "
      + "replacement without entering the irrelevant raw-damage fallback and publishes the next real command",
    () => {
      const initial = createFactoryTerminalMoveBattleState(config({ opponentBenchHp: [90, 0] }));
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_TARGET);
      expect(result.kind).toBe("decision-required");
      if (result.kind !== "decision-required") throw new Error("expected decision-required");
      expect(result.nextRequest).toMatchObject({
        kind: "command",
        requestId: 2,
        side: "player",
        battler: 0,
      });
      expect(result.state.boundary).toEqual({
        kind: "decision-required",
        request: result.nextRequest,
      });
      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(0); // genuinely undecided
      expect(result.state.rng.calls).toBe(4); // replacement orchestration draws no additional RNG
    },
  );

  it(
    "non-terminal fork, healthy bench WITH a real switch-in candidate: the orchestration now runs the "
      + "ENTIRE forced switch (openpartyscreen -> switchhandleorder -> getswitchedmondata -> "
      + "switchindataupdate -> hpthresholds -> hidepartystatussummary -> switchinanim -> waitstate -> "
      + "resetplayerfainted -> switchineffects -> cancelallactions -> end2) and the reducer surfaces a "
      + "REAL decision-required boundary for the next turn, per docs/forced-switch-ground-truth.md §1c's "
      + "'battle genuinely resumes' finding -- not a fake terminal, not a barrier",
    () => {
      const initial = createFactoryTerminalMoveBattleState(config({
        opponentBenchHp: [145, 0],
        opponentBenchOverride: [{ species: MACHOP, moves: [KARATE_CHOP, 0, 0, 0] }, undefined],
      }));
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_TARGET);
      expect(result.kind).toBe("decision-required");
      if (result.kind !== "decision-required") throw new Error("expected decision-required");

      // MACHOP (raw party index 0, this fixture's only living bench slot) is now the active
      // opponent battler 1, rebuilt from real party-derived data.
      expect(result.nextRequest).toEqual({
        kind: "command",
        requestId: 2,
        side: "player",
        battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      });
      expect(result.state.boundary).toEqual({ kind: "decision-required", request: result.nextRequest });

      const rulesContext = (result.state.rules as {
        rulesContext: {
          battleOutcome: number;
          battlers: ReadonlyArray<{
            species: number;
            hp: number;
            partyIndex: number;
            status1: number;
            status2: number;
            status3: number;
            statStages: readonly number[];
            types: readonly [string, string];
          }>;
        };
      }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(0); // battle genuinely continues -- never terminal, never a fake outcome
      const switchedIn = rulesContext.battlers[1]!;
      expect(switchedIn.species).toBe(MACHOP);
      expect(switchedIn.hp).toBe(145);
      expect(switchedIn.partyIndex).toBe(0);
      expect(switchedIn.types).toEqual(["TYPE_FIGHTING", "TYPE_FIGHTING"]);
      expect(switchedIn.status1).toBe(0);
      expect(switchedIn.status2).toBe(0);
      expect(switchedIn.status3).toBe(0);
      expect(switchedIn.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]); // SwitchInClearSetData's neutral reset

      // Zero Random() draws through the killing hit chain AND the entire switch-in dance
      // (docs/forced-switch-ground-truth.md §2b) -- still exactly the banked 4-roll hit-chain ledger.
      expect(result.state.rng.calls).toBe(4);
    },
  );
});

describe(
  "player-side forced switch -- docs/forced-switch-ground-truth.md §3/§4 slice 10: the trainer's killing "
    + "blow lands on the player's active mon, whose bench still has a legal replacement",
  () => {
    /**
     * Mirrors §2/§3's own bench (SUNKERN@0 dies/PIDGEY@1 decoy/MACHOP@2 the
     * real pick), but on the PLAYER'S side this time -- attackingSide
     * "trainer" makes the trainer's URSARING-shaped one-shot rig (the same
     * STRENGTH/200atk/50def/90hp numbers as the WON-path fixture) deliver the
     * killing blow onto the player's own active mon instead.
     */
    function playerForcedSwitchConfig(overrides: Partial<FactoryTerminalMoveConfig> = {}): FactoryTerminalMoveConfig {
      return config({
        attackingSide: "trainer",
        playerBenchHp: [100, 145],
        playerBenchOverride: [{ species: PIDGEY }, { species: MACHOP, moves: [KARATE_CHOP, 0, 0, 0] }],
        ...overrides,
      });
    }

    const USE_STRENGTH_ON_PLAYER = Object.freeze({
      requestId: 1,
      side: "trainer" as const,
      decision: Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const }),
    });

    function pausedState(): BattleState<FactoryTerminalDecisionRules> {
      const initial = createFactoryTerminalMoveBattleState(playerForcedSwitchConfig());
      const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_PLAYER);
      if (result.kind !== "decision-required") throw new Error(`expected decision-required, got ${result.kind}`);
      return result.state;
    }

    it(
      "KO with a healthy player bench surfaces a forced-switch decision request naming exactly the legal "
        + "slots -- PIDGEY and MACHOP, never the fainted slot itself",
      () => {
        const initial = createFactoryTerminalMoveBattleState(playerForcedSwitchConfig());
        const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_PLAYER);
        expect(result.kind).toBe("decision-required");
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        expect(result.nextRequest).toEqual({
          kind: "forced-switch",
          requestId: 2,
          side: "player",
          battler: 0,
          faintedPartyIndex: 0,
          legalPartyIndexes: [1, 2],
        });
        expect(result.state.boundary).toEqual({ kind: "decision-required", request: result.nextRequest });
        // Zero Random() draws -- the halt itself is not a controller round trip (docs §3d).
        expect(result.state.rng.calls).toBe(4); // the killing hit chain's own banked 4-roll ledger, nothing more
      },
    );

    it(
      "submitting the legal MACHOP slot (not the healthy PIDGEY decoy) rebuilds the player's active battler "
        + "from the bench record and resumes to a genuine next decision boundary, zero further Random() calls",
      () => {
        const paused = pausedState();
        const result = submitFactoryTerminalMoveDecision(paused, {
          requestId: 2,
          side: "player",
          decision: { kind: "switch", partyIndex: 2 },
        });
        expect(result.kind).toBe("decision-required");
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        expect(result.nextRequest).toEqual({
          kind: "command",
          requestId: 3,
          side: "trainer",
          battler: 1,
          legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
        });

        const rulesContext = (result.state.rules as {
          rulesContext: {
            battleOutcome: number;
            battlers: ReadonlyArray<{
              species: number;
              hp: number;
              partyIndex: number;
              status1: number;
              status2: number;
              status3: number;
              statStages: readonly number[];
              types: readonly [string, string];
            }>;
          };
        }).rulesContext;
        expect(rulesContext.battleOutcome).toBe(0); // battle genuinely continues
        const switchedIn = rulesContext.battlers[0]!;
        expect(switchedIn.species).toBe(MACHOP);
        expect(switchedIn.hp).toBe(145);
        expect(switchedIn.partyIndex).toBe(2); // raw party index -- NOT PIDGEY's index 1
        expect(switchedIn.types).toEqual(["TYPE_FIGHTING", "TYPE_FIGHTING"]);
        expect(switchedIn.status1).toBe(0);
        expect(switchedIn.status2).toBe(0);
        expect(switchedIn.status3).toBe(0);
        expect(switchedIn.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]); // SwitchInClearSetData's neutral reset

        // Zero Random() draws across BOTH submissions -- the killing hit chain's own banked
        // 4-roll ledger, then the entire forced-switch dance (docs §3d), nothing more.
        expect(result.state.rng.calls).toBe(4);
      },
    );

    describe("rejected submissions leave the paused state untouched", () => {
      it("the fainted/already-active slot (index 0) is rejected", () => {
        const paused = pausedState();
        const before = serializeBattleState(paused);
        expect(() =>
          submitFactoryTerminalMoveDecision(paused, {
            requestId: 2,
            side: "player",
            decision: { kind: "switch", partyIndex: 0 },
          })
        ).toThrow();
        expect(serializeBattleState(paused)).toBe(before);
      });

      it("an out-of-range party index (6) is rejected", () => {
        const paused = pausedState();
        const before = serializeBattleState(paused);
        expect(() =>
          submitFactoryTerminalMoveDecision(paused, {
            requestId: 2,
            side: "player",
            decision: { kind: "switch", partyIndex: 6 as never },
          })
        ).toThrow();
        expect(serializeBattleState(paused)).toBe(before);
      });

      it("a submission from the wrong side (trainer, not player) is rejected", () => {
        const paused = pausedState();
        const before = serializeBattleState(paused);
        expect(() =>
          submitFactoryTerminalMoveDecision(paused, {
            requestId: 2,
            side: "trainer",
            decision: { kind: "switch", partyIndex: 2 },
          })
        ).toThrow();
        expect(serializeBattleState(paused)).toBe(before);
      });

      it("an egg slot is excluded from legalPartyIndexes and rejected if submitted anyway", () => {
        const initial = createFactoryTerminalMoveBattleState(
          playerForcedSwitchConfig({ playerBenchOverride: [{ species: PIDGEY, isEgg: true }, { species: MACHOP, moves: [KARATE_CHOP, 0, 0, 0] }] }),
        );
        const result = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_PLAYER);
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        expect(result.nextRequest).toMatchObject({ kind: "forced-switch", legalPartyIndexes: [2] });

        const before = serializeBattleState(result.state);
        expect(() =>
          submitFactoryTerminalMoveDecision(result.state, {
            requestId: 2,
            side: "player",
            decision: { kind: "switch", partyIndex: 1 }, // the egg slot -- legal-looking index, illegal mon
          })
        ).toThrow();
        expect(serializeBattleState(result.state)).toBe(before);
      });
    });

    it("canonical serialization replays the same forced-switch request AND the same resume transition", () => {
      const initial = createFactoryTerminalMoveBattleState(playerForcedSwitchConfig());
      const restoredInitial = parseBattleState(
        serializeBattleState(initial),
      ) as BattleState<FactoryTerminalDecisionRules>;

      const first = submitFactoryTerminalMoveDecision(initial, USE_STRENGTH_ON_PLAYER);
      const replay = submitFactoryTerminalMoveDecision(restoredInitial, USE_STRENGTH_ON_PLAYER);
      expect(replay).toEqual(first);
      expect(serializeBattleState(replay.state)).toBe(serializeBattleState(first.state));
      if (first.kind !== "decision-required") throw new Error("expected decision-required");

      // The paused forced-switch-pending state itself (the interesting new payload -- pendingScript)
      // round-trips through JSON and resumes identically from the restored copy.
      const restoredPaused = parseBattleState(
        serializeBattleState(first.state),
      ) as BattleState<FactoryTerminalDecisionRules>;
      const switchSubmission = Object.freeze({
        requestId: 2,
        side: "player" as const,
        decision: Object.freeze({ kind: "switch" as const, partyIndex: 2 as const }),
      });
      const resumedFromLive = submitFactoryTerminalMoveDecision(first.state, switchSubmission);
      const resumedFromRestored = submitFactoryTerminalMoveDecision(restoredPaused, switchSubmission);
      expect(resumedFromRestored).toEqual(resumedFromLive);
      expect(serializeBattleState(resumedFromRestored.state)).toBe(serializeBattleState(resumedFromLive.state));
    });
  },
);
