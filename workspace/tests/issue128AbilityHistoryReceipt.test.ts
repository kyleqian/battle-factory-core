import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { initializeFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  createFactoryAiBattleHistory,
  submitLiveFactoryAiDecision,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";
import type { BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";

/**
 * ISSUES #128 — the ROM records battle-start Intimidate/Trace onto
 * `BATTLE_HISTORY->abilities[0]`, the PLAYER's slot, not the holder's.
 *
 * Source chain, all four links opened:
 *  - `AbilityBattleEffects` closes every dispatch with
 *    `if (effect && caseID < ABILITYEFFECT_CHECK_OTHER_SIDE && gLastUsedAbility != 0xFF)
 *     RecordAbilityBattle(battler, gLastUsedAbility);` (`battle_util.c:3194-3195`).
 *  - `ABILITYEFFECT_INTIMIDATE1` = 9 and `ABILITYEFFECT_TRACE` = 11 are both
 *    below `ABILITYEFFECT_CHECK_OTHER_SIDE` = 12 (`include/battle_util.h:21/23/24`),
 *    so both pass the guard, and neither case reassigns `battler`.
 *  - Battle start dispatches BOTH with the literal `0`
 *    (`battle_main.c:3880` / `:3882`); so does `HandleFaintedMonActions`
 *    state 6 (`battle_util.c:1959-1960`).
 *  - `RecordAbilityBattle` is an unguarded
 *    `BATTLE_HISTORY->abilities[battler] = abilityId`
 *    (`battle_ai_script_commands.c:643-646`).
 *
 * The numbers below are the stock-ROM receipt in
 * `tools/probe/receipts/issue128-ability-history-off.json` (Battle Scene OFF,
 * seed 305419897, each arm run twice from a fresh oracle, byte-identical),
 * taken through `tools/probe/probe-issue128-ability-history-off.py` on the
 * three `tools/battle-lab/issue128-ability-history-*-off.json` fixtures.
 */

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

const SET_GOLDUCK = 418; // FRONTIER_MON_GOLDUCK_1 -- ABILITY_DAMP / ABILITY_CLOUD_NINE.
const SET_MIGHTYENA = 202; // FRONTIER_MON_MIGHTYENA_1 -- ABILITY_INTIMIDATE only.
const SET_POOCHYENA = 20; // FRONTIER_MON_POOCHYENA_1 -- ABILITY_RUN_AWAY only (control).
const SET_GARDEVOIR = 813; // FRONTIER_MON_GARDEVOIR_6 -- abilitySlot 1 = ABILITY_TRACE.

const ABILITY_DAMP = 6;
const ABILITY_INTIMIDATE = 22;
const ABILITY_TRACE = 36;
const ABILITY_RUN_AWAY = 50;

function member(setId: number, abilitySlot: 0 | 1 = 0) {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 3,
    abilitySlot,
  });
}

function party(activeSetId: number, abilitySlot: 0 | 1 = 0): BattleScriptPartyState {
  return Object.freeze([
    member(activeSetId, abilitySlot),
    member(300),
    member(301),
    member(302),
    member(303),
    member(304),
  ]) as unknown as BattleScriptPartyState;
}

/** Player lead is always the two-ability Golduck the ROM receipt used. */
function startArm(aiSetId: number, aiAbilitySlot: 0 | 1 = 0) {
  return initializeFreshFactoryBattle({
    requestId: 1,
    rngSeed: 3,
    battleScene: "off",
    playerParty: party(SET_GOLDUCK, 0),
    opponentParty: party(aiSetId, aiAbilitySlot),
  });
}

describe("ISSUES #128 receipt: battle-start Intimidate/Trace record onto BATTLE_HISTORY->abilities[0]", () => {
  it("INTIMIDATE arm: the AI's Mightyena holds it, but the record lands on the player's slot 0", () => {
    const started = startArm(SET_MIGHTYENA);
    const rules = started.state.rules.rulesContext;
    // The holder really is battler 1, and the player really is battler 0.
    expect(rules.battlers[1].ability).toBe(ABILITY_INTIMIDATE);
    expect(rules.battlers[0].ability).toBe(ABILITY_DAMP);
    // ROM: BATTLE_HISTORY->abilities[0..3] == [22, 0, 0, 0].
    expect(rules.aiObservedAbilityIds).toEqual([ABILITY_INTIMIDATE, 0, 0, 0]);
    // The lowered stage confirms Intimidate actually fired (effect != 0, the
    // precondition for the record tail).
    expect(rules.battlers[0].statStages[1]).toBe(5);
  });

  it("CONTROL arm: a single-ability non-Intimidate AI lead records nothing", () => {
    const started = startArm(SET_POOCHYENA);
    const rules = started.state.rules.rulesContext;
    expect(rules.battlers[1].ability).toBe(ABILITY_RUN_AWAY);
    // ROM: BATTLE_HISTORY->abilities[0..3] == [0, 0, 0, 0].
    expect(rules.aiObservedAbilityIds).toEqual([0, 0, 0, 0]);
    expect(rules.battlers[0].statStages[1]).toBe(6);
  });

  it("TRACE arm: the COPIED ability, not the tracer's index, lands on the player's slot 0", () => {
    const started = startArm(SET_GARDEVOIR, 1);
    const rules = started.state.rules.rulesContext;
    // Gardevoir traced the player Golduck's Damp, so its live ability is Damp.
    expect(rules.battlers[1].ability).toBe(ABILITY_DAMP);
    // ROM: BATTLE_HISTORY->abilities[0..3] == [6, 0, 0, 0] -- gLastUsedAbility
    // is the copied ability, and the recorded battler is still the literal 0.
    expect(rules.aiObservedAbilityIds).toEqual([ABILITY_DAMP, 0, 0, 0]);
    expect(rules.aiObservedAbilityIds[1]).not.toBe(ABILITY_TRACE);
  });
});

describe("ISSUES #128 receipt: the slot-0 record removes the AI's get_ability draws", () => {
  /** Runs battle start, the player's first command, then the live AI decision. */
  function firstAiDecision(aiSetId: number, aiAbilitySlot: 0 | 1 = 0) {
    const started = startArm(aiSetId, aiAbilitySlot);
    const afterPlayer = submitFactoryFullTurnDecision(started.state, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error(`expected a trainer command boundary, got ${afterPlayer.kind}`);
    }
    const history = syncFactoryAiBattleHistory(
      createFactoryAiBattleHistory(started.state.rules.rulesContext),
      afterPlayer.state.rules.rulesContext,
    );
    const decision = submitLiveFactoryAiDecision(
      afterPlayer.state,
      history,
      { factoryWinStreak: 28, trainerOpponentId: 222 },
      (context) => ({
        rules: context.rules,
        events: [],
        boundary: { kind: "terminal", outcome: "player-win" },
      }),
    );
    if (decision.phase !== "move") throw new Error("expected a move decision");
    const getAbilityDraws = decision.trace.draws.filter(
      (draw) => "kind" in draw && draw.kind === "get-ability",
    ).length;
    return { history, decision, getAbilityDraws };
  }

  // aip262: the live view now fills usablePartyMons, so AI_CBM_Roar (battle_ai_scripts.s:334-339) passes its
  // `count_usable_party_mons AI_TARGET == 0` gate against the benched player party and reads Suction Cups (one more
  // Cmd_get_ability draw, "slot-2-check-bad-move-roar-ability"; Set 20 carries Roar). The ROM receipt's 8 is the
  // fixture's Roar-less moveset; the engine set here has 8 + that one Roar read.
  const CONTROL_DRAWS = 9;

  it("CONTROL arm: 9 get_ability draws against the two-ability player lead (8 receipt reads + Roar's Suction Cups read)", () => {
    const { history, getAbilityDraws } = firstAiDecision(SET_POOCHYENA);
    // Nothing recorded on slot 0, so Cmd_get_ability falls through to the
    // `Random() & 1` guess: 2 reads per scored move slot x 4 slots (ROM receipt: 8), plus Roar's read.
    expect(history.knownAbilities[0]).toBeNull();
    expect(getAbilityDraws).toBe(CONTROL_DRAWS);
  });

  it("INTIMIDATE arm: 0 get_ability draws — the false slot-0 record short-circuits every read", () => {
    const { history, getAbilityDraws } = firstAiDecision(SET_MIGHTYENA);
    // The record is FALSE (the player's Golduck has Damp, not Intimidate) and
    // the AI believes it anyway. ROM: 0 Cmd_get_ability draws.
    expect(history.knownAbilities[0]).toBe("ABILITY_INTIMIDATE");
    expect(getAbilityDraws).toBe(0);
  });

  it("TRACE arm: 0 get_ability draws — the copied ability short-circuits every read", () => {
    const { history, getAbilityDraws } = firstAiDecision(SET_GARDEVOIR, 1);
    expect(history.knownAbilities[0]).toBe("ABILITY_DAMP");
    expect(getAbilityDraws).toBe(0);
  });

  it("the arms differ by exactly the Cmd_get_ability draws the false slot-0 record removes (the receipt's 8 + Roar's read)", () => {
    const control = firstAiDecision(SET_POOCHYENA);
    const intimidate = firstAiDecision(SET_MIGHTYENA);
    const trace = firstAiDecision(SET_GARDEVOIR, 1);
    expect(control.getAbilityDraws - intimidate.getAbilityDraws).toBe(CONTROL_DRAWS);
    expect(control.getAbilityDraws - trace.getAbilityDraws).toBe(CONTROL_DRAWS);
  });
});

/**
 * ISSUES #128 second half: `Cmd_get_ability` / `Cmd_check_ability` test
 * `BATTLE_HISTORY->abilities[battler]` BEFORE the Shadow Tag / Magnet Pull /
 * Arena Trap shortcut (`battle_ai_script_commands.c`: the history read is the
 * first `if`, the trapper shortcut its `else if`). The port had the two
 * swapped, which only becomes observable once a slot-0 record can disagree
 * with the occupant's real ability -- which is exactly what the first half
 * above creates.
 */
const SET_DUGTRIO = 372; // FRONTIER_MON_DUGTRIO_1 -- abilitySlot 1 = ABILITY_ARENA_TRAP.

const NEUTRAL_STAGES = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});

const HYPNOSIS = 95; // EFFECT_SLEEP -- routes to AI_CBM_Sleep's `get_ability AI_TARGET`.

/** Dugtrio (real ability Arena Trap) with a slot-0 record the AI must prefer. */
function trapperCarrierView(knownAbility: string | null): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [HYPNOSIS, HYPNOSIS, HYPNOSIS, HYPNOSIS] as const,
    attacker: Object.freeze({
      types: ["TYPE_DARK", "TYPE_DARK"] as const, // Mightyena (287)
      attack: 110, defense: 90, spAttack: 80, spDefense: 80, speed: 90, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 145, maxHp: 145,
      ability: "ABILITY_INTIMIDATE",
    }),
    target: Object.freeze({
      species: 51, // DUGTRIO -- Sand Veil / Arena Trap, i.e. a two-ability trapper carrier.
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 100, defense: 70, spAttack: 70, spDefense: 90, speed: 140, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 125, maxHp: 125,
      ability: "ABILITY_ARENA_TRAP",
      knownAbility,
      lastUsedMoveId: 89, // EARTHQUAKE
      knownMoveIds: [89],
    }),
  }) as FactoryAiScoredView;
}

const fourSlotRequest = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

describe("ISSUES #128: get_ability / check_ability read BattleHistory before the trapper shortcut", () => {
  it("an unrecorded trapper carrier still takes the trapper shortcut and draws nothing", () => {
    const choice = chooseFactoryAiScoredDecision({
      view: trapperCarrierView(null),
      request: fourSlotRequest,
      rng: { value: 3323223981, calls: 0 },
    });
    // Arena Trap short-circuits the two-ability guess exactly as the source's
    // `else if` chain does when abilities[battler] is ABILITY_NONE.
    expect(choice.trace.draws.filter((draw) =>
      "kind" in draw && draw.kind === "get-ability"
    ).length).toBe(0);
    // Arena Trap is neither Insomnia nor Vital Spirit, so AI_CBM_Sleep does
    // not subtract.
    expect(choice.trace.slotScores.map((slot) => slot.checkBadMoveDelta)).toEqual([0, 0, 0, 0]);
  });

  it("a recorded slot-0 ability WINS over the trapper shortcut (source order)", () => {
    // Reachable shape: the AI's Intimidate lead has already written
    // abilities[0]; here the recorded value is one AI_CBM_Sleep actually gates
    // on, so the two candidate orders produce different scores. Trapper-first
    // (the old port order) would answer ABILITY_ARENA_TRAP and score 100.
    const choice = chooseFactoryAiScoredDecision({
      view: trapperCarrierView("ABILITY_INSOMNIA"),
      request: fourSlotRequest,
      rng: { value: 3323223981, calls: 0 },
    });
    expect(choice.trace.draws.filter((draw) =>
      "kind" in draw && draw.kind === "get-ability"
    ).length).toBe(0);
    expect(choice.trace.slotScores.map((slot) => slot.checkBadMoveDelta)).toEqual([-10, -10, -10, -10]);
  });

  it("the reachable board: a player Dugtrio facing an AI Intimidate lead is recorded as INTIMIDATE", () => {
    const started = initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "off",
      playerParty: party(SET_DUGTRIO, 1), // real ability ABILITY_ARENA_TRAP
      opponentParty: party(SET_MIGHTYENA),
    });
    const rules = started.state.rules.rulesContext;
    expect(rules.battlers[0].ability).toBe(71); // ABILITY_ARENA_TRAP
    expect(rules.aiObservedAbilityIds).toEqual([ABILITY_INTIMIDATE, 0, 0, 0]);
    const history = syncFactoryAiBattleHistory(
      createFactoryAiBattleHistory(rules),
      rules,
    );
    // Source order: the (false) history record answers, not Arena Trap.
    expect(history.knownAbilities[0]).toBe("ABILITY_INTIMIDATE");
  });
});
