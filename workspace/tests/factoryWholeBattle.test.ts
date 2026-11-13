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
  FACTORY_AI_ACTION_GATE,
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
      battleScene: "on",
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
        expect(ai.actionGate).toBe(FACTORY_AI_ACTION_GATE);
        expect(liveLegalDecisions).toContainEqual(ai.submission.decision);
        const policyDraws = ai.phase === "move"
          ? [...ai.switchPolicy.draws, ...ai.trace.draws]
          : [...ai.switchPolicy.draws];
        if (ai.phase === "move") expect(ai.trace.mask).toBe(7);
        expect(policyDraws.length).toBeGreaterThan(0);
        expect(policyDraws[0]!.before.calls).toBe(previousCalls);
        expect(policyDraws.at(-1)!.after.calls).toBe(ai.rng.calls);
        for (let draw = 1; draw < policyDraws.length; draw += 1) {
          expect(policyDraws[draw]!.before).toEqual(policyDraws[draw - 1]!.after);
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

    // Re-pinned 2026-08-25 for the union of the four end-turn source fixes.
    // The first divergence from the old trajectory is ONE extra draw at the end
    // of turn 1 -- cursorCheckpoints[5] moves 23 -> 24 while [0..4] are
    // byte-identical -- which is exactly ENDTURN_ORDER's speed-tie Random()
    // (ISSUES #131; ROM receipt tools/probe/receipts/issue131-endturn-order-off
    // .json). From there the shared cursor compounds through the isFirstTurn
    // decay (#130) and the end-turn STATUS2_FLINCHED clear (#133), and this
    // curated party's engineered win path no longer holds: Azurill still faints
    // to Granbull, but the run now ends in a trainer win with a second forced
    // switch. This is a self-authored scenario, not an oracle receipt, and its
    // point is that every trainer command comes from the live Factory AI on one
    // uninterrupted cursor -- which the assertions below still pin. Every value
    // is regenerated from the union engine.
    // Re-pinned 2026-11-12 (parity-mac, docs/parity-mac/STATUS.md "Re-pins"): the AI fixes of that lane (scripts run on
    // every slot with PP, try-to-faint ends at -1, speed-tie draw order, replacement pass 1) change this self-authored
    // battle's AI draw counts from the third decision on, and the run ends in a PLAYER win again (Hariyama survives at 38).
    // Still no oracle receipt; the point pinned here is unchanged: one uninterrupted cursor under the live AI.
    expect(state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });
    if (state.boundary.kind !== "terminal") throw new Error("expected terminal boundary");
    expect(forcedSwitches).toBe(2);
    expect(aiChosenSubmissions).toHaveLength(8);
    expect(aiChosenSubmissions.every((entry) => entry.side === "trainer")).toBe(true);
    expect(aiDecisionDrawRanges.every(([before, after]) => after > before)).toBe(true);
    for (let decision = 1; decision < aiDecisionDrawRanges.length; decision += 1) {
      expect(aiDecisionDrawRanges[decision]![0])
        .toBeGreaterThanOrEqual(aiDecisionDrawRanges[decision - 1]![1]);
    }
    expect(sawNonterminalOpponentFaint).toBe(true);
    // The player KOs all three opponents and keeps its last member at 38.
    expect(state.rules.rulesContext.party.opponent.slice(0, 3).map((member) => member.hp))
      .toEqual([0, 0, 0]);
    expect(state.rules.rulesContext.party.player.slice(0, 3).map((member) => member.hp))
      .toEqual([0, 0, 38]);
    // Draws A/B, every AI policy ledger, hit chains, forced-switch tail, and
    // continuing-turn boundary draws share one cursor. Repeated entries are
    // player/forced-switch submissions (zero draws); no transition resets or
    // splices the stream.
    // Re-pinned for ISSUES #128 (was 12 AI decisions ending at cursor 196).
    // Granbull leads with Intimidate, so battle start now records
    // ABILITY_INTIMIDATE onto aiObservedAbilityIds[0] exactly as the ROM's
    // RecordAbilityBattle(0, ...) does (battle_main.c:3880 +
    // battle_util.c:3194-3195). While Azurill (Thick Fat / Huge Power, two
    // abilities) is the active target that record short-circuits
    // Cmd_get_ability's `Random() & 1` guess -- the first AI decision drops
    // from 15 draws to 9. syncFactoryAiBattleHistory clears the cell on the
    // player's forced replacement, so the later decisions keep their original
    // 21-draw shape; the battle simply runs one extra turn on the new stream.
    expect(cursorCheckpoints).toEqual([
      // [0..4] byte-identical to the pre-union stream; [5] is where
      // ENDTURN_ORDER's tie draw first lands (23 -> 24).
      // 2026-11-12 parity-mac re-pin: was 2, 2, 11, 12, 12, 24, 24, 46, 46, 72, 72, 94, 95, 95, 106, 106, 119, 119, 130.
      2, 2, 11, 12, 12, 30, 30, 50, 50, 75, 75, 98, 98, 119, 120, 120, 136, 136, 145,
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
      rngValue: expectedRngValue(145),
    });
    expect(resolution.playerParty.map((member) => member.hp)).toEqual([0, 0, 38]);
    expect(resolution.opponentParty.map((member) => member.hp)).toEqual([0, 0, 0]);
  });
});
