import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { BattleMon, BattleParty } from "../src/engine/battleScenario.ts";
import {
  deriveBattleResolutionFromTerminalBoundary,
} from "../src/engine/battleResolutionAdapter.ts";
import {
  submitBattleDecision,
  type BattleDecisionSubmission,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  uniformBattleScriptIvs,
  type BattleScriptPartyMemberState,
  type BattleScriptPartyState,
} from "../src/engine/battleScriptRulesContext.ts";
import { createFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import {
  reduceFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  createFactoryCorpusPartyMember,
  type FactoryCorpusPartyMemberState,
} from "../src/engine/factoryCorpusParty.ts";
import { randomU16 } from "../src/engine/opponentGen.ts";

const RNG_SEED = 0x1234_5678;
const STATUS2_MULTIPLETURNS = 0x1000;
const STATUS2_RECHARGE = 0x400000;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

const EMPTY_PARTY_MEMBER: BattleScriptPartyMemberState = Object.freeze({
  species: 0,
  isEgg: false,
  abilityNum: 0,
  ivs: uniformBattleScriptIvs(0),
  personality: 0,
  experience: 0,
  level: 0,
  friendship: 0,
  maxHP: 0,
  attack: 0,
  defense: 0,
  speed: 0,
  spAttack: 0,
  spDefense: 0,
  hp: 0,
  status1: 0,
  item: 0,
  moves: Object.freeze([0, 0, 0, 0] as const),
  pp: Object.freeze([0, 0, 0, 0] as const),
  ppBonuses: 0,
});

function corpusMember(setId: number): FactoryCorpusPartyMemberState {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 31,
    abilitySlot: 0,
  });
}

function corpusParty(setIds: readonly [number, number, number]): BattleScriptPartyState {
  return Object.freeze([
    ...setIds.map(corpusMember),
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
  ]) as unknown as BattleScriptPartyState;
}

function resolutionParty(
  prefix: string,
  party: BattleScriptPartyState,
): BattleParty {
  return party.slice(0, 3).map((member, index): BattleMon => ({
    id: `${prefix}-${index}`,
    species: `${prefix.toUpperCase()}-${member.species}`,
    maxHp: member.maxHP,
    hp: member.hp,
    status: "none",
  })) as unknown as BattleParty;
}

function requireStarted(
  result: ReturnType<typeof createFreshFactoryBattle>,
): BattleState<FactoryFullTurnDecisionRules> {
  if ("kind" in result) throw new Error(`unexpected fresh-start barrier: ${result.sourceConstruct}`);
  return result;
}

function expectedRngValue(calls: number): number {
  let value = RNG_SEED;
  for (let call = 0; call < calls; call += 1) value = randomU16(value).rngValue;
  return value;
}

describe("fresh Factory whole-battle integration (Gate-5 rung 4)", () => {
  it("runs one legal 3v3 battle from draw A through a real player-win terminal", () => {
    // All six are real, distinct Level-50 corpus sets. Azurill is weak enough
    // for Aerodactyl's real Hyper Beam to force a player replacement.
    // Hariyama then wins with Cross Chop; the final Spheal's Ice Ball lock
    // exercises HandleTurnActionSelectionState's reducer-owned trainer path.
    const playerKernelParty = corpusParty([1, 678, 527]);
    const opponentKernelParty = corpusParty([531, 59, 196]);
    const preBattlePlayerParty = resolutionParty("player", playerKernelParty);
    const preBattleOpponentParty = resolutionParty("opponent", opponentKernelParty);
    let state = requireStarted(createFreshFactoryBattle({
      requestId: 1,
      rngSeed: RNG_SEED,
      playerParty: playerKernelParty,
      opponentParty: opponentKernelParty,
    }));

    const cursorCheckpoints = [state.rng.calls];
    let forcedSwitches = 0;
    let lockedTrainerTurns = 0;
    let sawNonterminalOpponentFaint = false;

    expect(state.rng).toEqual({ value: expectedRngValue(2), calls: 2 });

    for (let budget = 0; budget < 20 && state.boundary.kind === "decision-required"; budget += 1) {
      const request = state.boundary.request;
      const rules = state.rules.rulesContext;
      const faintedOpponents = rules.party.opponent.slice(0, 3)
        .filter((member) => member.hp === 0).length;
      if (faintedOpponents > 0) sawNonterminalOpponentFaint = true;

      let submission: BattleDecisionSubmission;
      if (request.kind === "forced-switch") {
        expect(request.side).toBe("player");
        const partyIndex = request.legalPartyIndexes[0]!;
        expect(request.legalPartyIndexes).toContain(partyIndex);
        submission = {
          requestId: request.requestId,
          side: request.side,
          decision: { kind: "switch", partyIndex },
        };
        forcedSwitches += 1;
      } else {
        // Slot 0 is intentionally the deterministic move for every selected
        // corpus member: Water Pulse, Hyper Beam, Cross Chop, or Ice Ball.
        const decision = request.legalDecisions.find(
          (candidate) => candidate.kind === "use-move" && candidate.moveSlot === 0,
        );
        if (decision === undefined) throw new Error("published request has no legal slot-0 move");
        expect(request.legalDecisions).toContainEqual(decision);
        submission = { requestId: request.requestId, side: request.side, decision };

        if (
          request.side === "player"
          && (rules.battlers[1].status2 & (STATUS2_MULTIPLETURNS | STATUS2_RECHARGE)) !== 0
        ) {
          lockedTrainerTurns += 1;
        }
      }

      const previousCalls = state.rng.calls;
      const transition = submitBattleDecision(
        state,
        submission,
        reduceFactoryFullTurnDecision,
      );
      state = transition.state;
      expect(state.rng.calls).toBeGreaterThanOrEqual(previousCalls);
      expect(state.rng.value).toBe(expectedRngValue(state.rng.calls));
      cursorCheckpoints.push(state.rng.calls);
    }

    expect(state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });
    if (state.boundary.kind !== "terminal") throw new Error("expected terminal boundary");
    expect(forcedSwitches).toBe(1);
    expect(lockedTrainerTurns).toBe(2);
    expect(sawNonterminalOpponentFaint).toBe(true);
    expect(state.rules.rulesContext.party.opponent.slice(0, 3).map((member) => member.hp))
      .toEqual([0, 0, 0]);
    // Draws A/B, command-only submissions, hit chains, forced-switch tail,
    // every continuing-turn boundary draw, and the locked trainer turns all
    // share this one monotonic cursor. No transition resets or splices it.
    expect(cursorCheckpoints).toEqual([2, 2, 8, 8, 11, 12, 17, 17, 22, 22, 28, 32]);

    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: state.rng.value,
      outcome: state.boundary.outcome,
      rulesContext: state.rules.rulesContext,
      preBattlePlayerParty,
      preBattleOpponentParty,
    });
    expect(resolution).toMatchObject({
      outcome: "win",
      rngValue: expectedRngValue(32),
    });
    expect(resolution.playerParty.map((member) => member.hp)).toEqual([0, 224, 186]);
    expect(resolution.opponentParty.map((member) => member.hp)).toEqual([0, 0, 0]);
  });
});
