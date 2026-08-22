import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  resumeBattleEndTurnAfterFaintedActions,
  runBattleEndTurnOrchestration,
} from "../src/engine/battleEndTurnOrchestration.ts";
import { resumeBattleScriptFaintedActionsAfterPlayerChoice } from "../src/engine/battleScriptFaintedActionsOrchestration.ts";
import { resolveSingleBattlePosition } from "../src/engine/battleScriptBattlerPositions.ts";
import { BATTLE_SCRIPT_STATUS3_PERISH_SONG } from "../src/engine/battleScriptSourceConstants.ts";

/**
 * ISSUES #102 remaining half: does the end-turn per-battler loop resume in
 * place across a fainted-actions player-choice pause?
 *
 * `battle_util.c` `DoBattlerEndTurnEffects` (1464-1783) keeps its cursor in
 * `gBattleStruct->turnEffectsBattlerId` / `turnEffectsTracker`, and
 * `battle_main.c` `BattleTurnPassed` (3956-3972) only reaches
 * `HandleFaintedMonActions` once that loop has returned 0 -- i.e. once every
 * battler in `gBattlerByTurnOrder` has walked all `ENDTURN_*` cases. So the
 * later-ordered battler's own residual damage lands BEFORE the forced-switch
 * prompt, and `HandleWishPerishSongOnTurnEnd` runs exactly once afterwards.
 *
 * VERDICT (2026-08-22): REFUTED, and pinned here so it stays refuted. The
 * engine's `runDoBattlerEndTurnEffects` runs the whole `battlerOrder` loop to
 * exhaustion before `runBattleEndTurnOrchestration` ever calls
 * `runBattleScriptFaintedActionsOrchestration`, so there is no cursor to lose
 * across the pause: the "bail the whole loop" return is keyed on
 * `battleOutcome !== 0` (the same gate as `BattleTurnPassed`'s
 * `if (gBattleOutcome == 0)`), not on a battler fainting. This file covers the
 * `finish-end-turn-after-faints` resume seam
 * (`resumeBattleEndTurnAfterFaintedActions`), which had no Tier-1 coverage at
 * all before now -- `tests/endTurnFaintResumeIssue104.test.ts` stops at the
 * pause.
 */

const program = loadBattleScriptProgram();
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_FACTORY_TRAINER = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;
const STATUS1_POISON = 1 << 3;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    chargeTimer: changes.chargeTimer ?? 0,
    chargeTimerStartValue: changes.chargeTimerStartValue ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
    encoreTimer: changes.encoreTimer ?? 0,
    encoredMove: changes.encoredMove ?? 0,
    encoredMovePos: changes.encoredMovePos ?? 0,
    encoreTimerStartValue: changes.encoreTimerStartValue ?? 0,
    perishSongTimer: changes.perishSongTimer ?? 0,
    perishSongTimerStartValue: changes.perishSongTimerStartValue ?? 0,
  }) as unknown as BattleScriptRulesBattler;
}

function fullSlot(hp: number): BattleScriptPartyMemberInput {
  return { species: 261, isEgg: false, hp };
}
const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function sixSlots(...alive: number[]): BattleScriptPartyMemberInput[] {
  const slots = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
  alive.forEach((hp, index) => {
    slots[index] = fullSlot(hp);
  });
  return slots;
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, partyIndex: 2 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY_TRAINER, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
}

function externalPorts(attacker: 0 | 1): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: Readonly<{ state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }>) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: resolveSingleBattlePosition,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function scratchState(rulesContext: BattleScriptRulesContext, attacker: 0 | 1) {
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    919694434,
    externalPorts(attacker),
  ).state;
}

describe("ISSUES #102 -- end-turn per-battler cursor across a fainted-actions pause", () => {
  it(
    "the LATER-ordered opponent still takes its own poison tick when the EARLIER-ordered player "
      + "battler's own poison tick faints it and forces a switch prompt, and Perish Song ticks once on resume",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, hp: 1, maxHP: 8, status1: STATUS1_POISON, partyIndex: 0, tauntTimer: 3 }),
          battler({
            side: 1,
            hp: 100,
            maxHP: 100,
            status1: STATUS1_POISON,
            partyIndex: 2,
            tauntTimer: 3,
            status3: BATTLE_SCRIPT_STATUS3_PERISH_SONG,
            perishSongTimer: 2,
            perishSongTimerStartValue: 3,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        battlerByTurnOrder: [0, 1, 2, 3],
        party: { player: sixSlots(1, 100), opponent: sixSlots(0, 0, 100) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const paused = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));

      expect(paused.kind).toBe("player-choice-required");
      if (paused.kind !== "player-choice-required") throw new Error("unreachable");
      expect(paused.battler).toBe(0);
      expect(paused.state.rulesContext.battlers[0]!.hp).toBe(0);
      // ENDTURN_POISON for the later-ordered battler 1 must already have run:
      // DoBattlerEndTurnEffects exhausts gBattlerByTurnOrder before
      // BattleTurnPassed ever reaches HandleFaintedMonActions.
      expect(paused.state.rulesContext.battlers[1]!.hp).toBe(88);
      // HandleWishPerishSongOnTurnEnd runs strictly after the faint dance.
      expect(paused.state.rulesContext.battlers[1]!.perishSongTimer).toBe(2);
      // Cursor evidence. ENDTURN_TAUNT (battle_util.c:1748-1752) sits well AFTER
      // ENDTURN_POISON in the tracker enum and -- unlike the damage cases --
      // carries no `hp != 0` gate, so reaching 3 -> 2 on battler 1 proves
      // turnEffectsBattlerId advanced past the fainted battler AND walked
      // turnEffectsTracker all the way through the late cases, inside the same
      // end-turn pass, before HandleFaintedMonActions raised the prompt.
      expect(paused.state.rulesContext.battlers[1]!.tauntTimer).toBe(2);
      // Battler 0's own taunt timer is 0, not 2: `tryfaintmon BS_ATTACKER` jumps
      // into BattleScript_FaintAttacker, whose `cleareffectsonfaint BS_ATTACKER`
      // (battle_scripts_1.s:2809-2814) runs FaintClearSetData
      // (battle_main.c:3264) and memsets the whole gDisableStructs entry --
      // so the later, ungated ENDTURN_TAUNT case decrements nothing.
      expect(paused.state.rulesContext.battlers[0]!.tauntTimer).toBe(0);

      const resumedFaints = resumeBattleScriptFaintedActionsAfterPlayerChoice(
        program,
        handlers,
        paused.state,
        1,
      );
      expect(resumedFaints.kind).toBe("resumed");
      if (resumedFaints.kind !== "resumed") throw new Error("unreachable");

      const finished = resumeBattleEndTurnAfterFaintedActions(program, handlers, resumedFaints.state);
      expect(finished.kind).toBe("resumed");
      if (finished.kind !== "resumed" && finished.kind !== "next-turn") throw new Error("unreachable");
      // The later battler keeps its already-applied poison damage -- no re-tick.
      expect(finished.state.rulesContext.battlers[1]!.hp).toBe(88);
      // Perish Song counted down exactly once for the whole turn.
      expect(finished.state.rulesContext.battlers[1]!.perishSongTimer).toBe(1);
      // The switched-in replacement is NOT given the end-turn ticks it was absent
      // for: full HP, and no second pass over battler 1's already-walked cases.
      expect(finished.state.rulesContext.battlers[0]!.hp).toBe(100);
      expect(finished.state.rulesContext.battlers[1]!.tauntTimer).toBe(2);
    },
  );

  it(
    "HandleWishPerishSongOnTurnEnd resumes at its own cursor: an EARLIER-ordered battler's "
      + "Perish Song countdown and Future Sight counter must not tick twice when a LATER-ordered "
      + "battler's Perish Song KO pauses for the player's replacement",
    () => {
      const rc = context({
        battlers: [
          // Player, ordered SECOND. Perish counter is already at 0, so its own
          // BattleScript_PerishSongTakesLife faints it and -- with a live bench
          // mon -- raises the forced-switch prompt.
          battler({
            side: 0,
            hp: 100,
            maxHP: 100,
            partyIndex: 0,
            status3: BATTLE_SCRIPT_STATUS3_PERISH_SONG,
            perishSongTimer: 0,
            perishSongTimerStartValue: 3,
          }),
          // Opponent, ordered FIRST: both its delayed-attack counter and its
          // Perish Song countdown are consumed before the pause.
          battler({
            side: 1,
            hp: 100,
            maxHP: 100,
            partyIndex: 2,
            status3: BATTLE_SCRIPT_STATUS3_PERISH_SONG,
            perishSongTimer: 2,
            perishSongTimerStartValue: 3,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        battlerByTurnOrder: [1, 0, 2, 3],
        futureSightCounter: [0, 3, 0, 0],
        futureSightMove: [0, 248, 0, 0],
        futureSightAttacker: [0, 0, 0, 0],
        futureSightDmg: [0, 40, 0, 0],
        party: { player: sixSlots(100, 100), opponent: sixSlots(0, 0, 100) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const paused = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));

      expect(paused.kind).toBe("player-choice-required");
      if (paused.kind !== "player-choice-required") throw new Error("unreachable");
      expect(paused.battler).toBe(0);
      expect(paused.state.rulesContext.battlers[0]!.hp).toBe(0);
      // Both of the earlier-ordered battler's cursors advanced exactly once.
      expect(paused.state.rulesContext.futureSightCounter[1]).toBe(2);
      expect(paused.state.rulesContext.battlers[1]!.perishSongTimer).toBe(1);

      const resumedFaints = resumeBattleScriptFaintedActionsAfterPlayerChoice(
        program,
        handlers,
        paused.state,
        1,
      );
      expect(resumedFaints.kind).toBe("resumed");
      if (resumedFaints.kind !== "resumed") throw new Error("unreachable");

      const finished = resumeBattleEndTurnAfterFaintedActions(program, handlers, resumedFaints.state);
      expect(finished.kind).not.toBe("non-terminal-barrier");
      // `wishPerishSongBattlerId` (battle_util.c:1785-1862) is incremented BEFORE
      // each effect fires and survives the BattleTurnPassed round-trip that runs
      // HandleFaintedMonActions, so neither loop revisits battler 1 this turn.
      expect(finished.state.rulesContext.futureSightCounter[1]).toBe(2);
      expect(finished.state.rulesContext.battlers[1]!.perishSongTimer).toBe(1);
    },
  );

  it(
    "mirror: the LATER-ordered player battler still takes its own poison tick when the "
      + "EARLIER-ordered opponent battler's own poison tick faints it (AI replacement, no pause)",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, hp: 100, maxHP: 100, status1: STATUS1_POISON, partyIndex: 0 }),
          battler({ side: 1, hp: 1, maxHP: 8, status1: STATUS1_POISON, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        battlerByTurnOrder: [1, 0, 2, 3],
        party: { player: sixSlots(100, 100), opponent: sixSlots(0, 0, 1, 100) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));

      // The AI picks its own replacement inside HandleFaintedMonActions, so no
      // player pause is raised and the turn runs straight through.
      expect(result.kind).not.toBe("player-choice-required");
      expect(result.kind).not.toBe("non-terminal-barrier");
      // ENDTURN_POISON for the later-ordered battler 0 landed before the faint
      // dance ever ran: floor(100/8) = 12, same as any other turn.
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(88);
      // Opponent's slot-2 mon fainted from its own tick and slot 3 came in.
      expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.partyIndex).toBe(3);
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    },
  );
});
