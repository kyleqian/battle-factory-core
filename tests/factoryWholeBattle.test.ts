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
import {
  createFactoryAiBattleHistory,
  FACTORY_AI_RUNG6_ACTION_GATE,
  submitLiveFactoryAiDecision,
} from "../src/engine/factoryAiLiveDriver.ts";
import { randomU16 } from "../src/engine/opponentGen.ts";

const RNG_SEED = 0x1234_5678;
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

describe("fresh Factory whole-battle integration (Gate-5 rungs 4/6)", () => {
  it("runs one legal 3v3 battle with every trainer command chosen by the live Factory AI", () => {
    // All six are real, distinct Level-50 corpus sets. Azurill is weak enough
    // for Granbull's real attacks to force a player replacement. Granbull
    // then loses to Hariyama's Cross Chop. Pidgeotto gives the source trainer
    // replacement selector a super-effective first-pass candidate, while all
    // three trainer movesets remain inside the ported mask-7 scoring families.
    const playerKernelParty = corpusParty([1, 678, 527]);
    const opponentKernelParty = corpusParty([664, 135, 59]);
    const preBattlePlayerParty = resolutionParty("player", playerKernelParty);
    const preBattleOpponentParty = resolutionParty("opponent", opponentKernelParty);
    let state = requireStarted(createFreshFactoryBattle({
      requestId: 1,
      rngSeed: RNG_SEED,
      playerParty: playerKernelParty,
      opponentParty: opponentKernelParty,
    }));
    let aiHistory = createFactoryAiBattleHistory(state.rules.rulesContext);

    const cursorCheckpoints = [state.rng.calls];
    const aiDecisionDrawRanges: Array<readonly [number, number]> = [];
    const aiChosenSubmissions: BattleDecisionSubmission[] = [];
    let forcedSwitches = 0;
    let sawNonterminalOpponentFaint = false;

    expect(state.rng).toEqual({ value: expectedRngValue(2), calls: 2 });

    for (let budget = 0; budget < 50 && state.boundary.kind === "decision-required"; budget += 1) {
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
      } else if (request.side === "trainer") {
        const previousCalls = state.rng.calls;
        const liveLegalDecisions = request.legalDecisions;
        const ai = submitLiveFactoryAiDecision(
          state,
          aiHistory,
          { factoryWinStreak: 28, trainerOpponentId: 222 },
          reduceFactoryFullTurnDecision,
        );
        expect(ai.actionGate).toBe(FACTORY_AI_RUNG6_ACTION_GATE);
        expect(liveLegalDecisions).toContainEqual(ai.submission.decision);
        expect(ai.trace.mask).toBe(7);
        expect(ai.trace.draws.length).toBeGreaterThan(0);
        expect(ai.trace.draws[0]!.before.calls).toBe(previousCalls);
        expect(ai.trace.draws.at(-1)!.after.calls).toBe(ai.rng.calls);
        for (let draw = 1; draw < ai.trace.draws.length; draw += 1) {
          expect(ai.trace.draws[draw]!.before).toEqual(ai.trace.draws[draw - 1]!.after);
        }
        aiDecisionDrawRanges.push([previousCalls, ai.rng.calls]);
        aiChosenSubmissions.push(ai.submission);
        aiHistory = ai.history;
        state = ai.transition.state;
        expect(state.rng.calls).toBeGreaterThanOrEqual(ai.rng.calls);
        expect(state.rng.value).toBe(expectedRngValue(state.rng.calls));
        cursorCheckpoints.push(state.rng.calls);
        continue;
      } else {
        // Player choices remain deterministic and test-authored. Hariyama
        // opens its switch-in turn with real Fake Out; subsequent turns and
        // the other player members use slot 0.
        const moveSlot = rules.battlers[0].partyIndex === 1
          ? rules.battlers[0].isFirstTurn === 2
            ? 3
            : rules.battlers[1].partyIndex === 1
              ? 2
              : 0
          : 0;
        const preferredDecision = request.legalDecisions.find(
          (candidate) => candidate.kind === "use-move" && candidate.moveSlot === moveSlot,
        );
        const decision = preferredDecision ?? request.legalDecisions.find(
          (candidate) => candidate.kind === "use-move",
        );
        if (decision === undefined) throw new Error("published player request has no legal move");
        expect(request.legalDecisions).toContainEqual(decision);
        submission = { requestId: request.requestId, side: request.side, decision };
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
    expect(aiChosenSubmissions.length).toBeGreaterThan(0);
    expect(aiChosenSubmissions.every((entry) => entry.side === "trainer")).toBe(true);
    expect(aiDecisionDrawRanges.every(([before, after]) => after > before)).toBe(true);
    for (let decision = 1; decision < aiDecisionDrawRanges.length; decision += 1) {
      expect(aiDecisionDrawRanges[decision]![0])
        .toBeGreaterThanOrEqual(aiDecisionDrawRanges[decision - 1]![1]);
    }
    expect(sawNonterminalOpponentFaint).toBe(true);
    expect(state.rules.rulesContext.party.opponent.slice(0, 3).map((member) => member.hp))
      .toEqual([0, 0, 0]);
    // Draws A/B, every AI policy ledger, hit chains, forced-switch tail, and
    // continuing-turn boundary draws share one cursor. Repeated entries are
    // player/forced-switch submissions (zero draws); no transition resets or
    // splices the stream.
    expect(cursorCheckpoints).toEqual([
      2, 2, 17, 18, 18, 29, 29, 40, 40, 51, 51, 62, 62,
      81, 81, 100, 100, 120, 120, 140, 140, 156, 156, 172, 172, 188,
    ]);

    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: state.rng.value,
      outcome: state.boundary.outcome,
      rulesContext: state.rules.rulesContext,
      preBattlePlayerParty,
      preBattleOpponentParty,
    });
    expect(resolution).toMatchObject({
      outcome: "win",
      rngValue: expectedRngValue(188),
    });
    expect(resolution.playerParty.map((member) => member.hp)).toEqual([0, 251, 186]);
    expect(resolution.opponentParty.map((member) => member.hp)).toEqual([0, 0, 0]);
  });
});
