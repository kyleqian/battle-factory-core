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
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { resolveSingleBattlePosition } from "../src/engine/battleScriptBattlerPositions.ts";

/**
 * ISSUES #104 (source-trace finding, PROGRESS 1364): does an EARLIER-ordered
 * battler's own end-turn tick fainting it cause a LATER-ordered battler to
 * silently lose its own end-turn residual effect that same turn?
 *
 * `battle_util.c` `DoBattlerEndTurnEffects` (1464-1783): the per-battler
 * `while` loop only `return`s early (line 1777-1778, `if (effect != 0) return
 * effect`) to let ONE fired script play out; `gBattleStruct->turnEffectsBattlerId`
 * / `turnEffectsTracker` are struct-persistent, so the very next call resumes
 * the SAME cursor and walks through every remaining case for the fainted
 * battler (all gated on `hp != 0`, so they no-op) before advancing to the next
 * battler in `gBattlerByTurnOrder`. `battle_main.c` `BattleTurnPassed`
 * (3956-3969) only skips a resumed `DoBattlerEndTurnEffects()` call when
 * `gBattleOutcome != 0` -- i.e. the SAME source gate this engine's
 * `runDoBattlerEndTurnEffects` (battleEndTurnOrchestration.ts:1497) uses for
 * its `"outcome-decided"` bail. `HandleFaintedMonActions` (3968, deferred
 * fainted-mon replacement UI) never runs until the per-battler loop is fully
 * exhausted OR the whole battle is decided -- so a battler fainting with
 * teammates still alive must NOT skip any other battler's own end-turn tick.
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

/** Mirrors battleEndTurnOrchestration.test.ts's own externalPorts -- real STRINGID_ and B_WAIT_TIME_LONG resolution, everything else stubbed. */
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

describe("ISSUES #104 -- later-ordered battler's end-turn tick after an earlier battler faints", () => {
  it(
    "the LATER-ordered (full HP) battler's own poison tick still applies after the EARLIER-ordered "
      + "(1 HP) battler's own poison tick faints it, when the fainted side still has a live teammate",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, hp: 1, maxHP: 8, status1: STATUS1_POISON, partyIndex: 0 }),
          battler({ side: 1, hp: 100, maxHP: 100, status1: STATUS1_POISON, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        battlerByTurnOrder: [0, 1, 2, 3],
        // Player's fainting battler 0 still has a live teammate (slot 1, hp 100) --
        // this faint must NOT decide the whole battle, so the per-battler loop
        // must keep walking gBattlerByTurnOrder to battler 1's own poison tick.
        party: { player: sixSlots(1, 100), opponent: sixSlots(0, 0, 100) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const initial = scratchState(rc, 0);
      expect(rc.battleOutcome).toBe(0);

      const result = runBattleEndTurnOrchestration(program, handlers, initial);

      // Battle continues (player still has a live teammate) -- a fainted battler
      // 0 with backups must resolve as a forced-switch decision, not a terminal.
      expect(result.state.rulesContext.battleOutcome).toBe(0);
      expect(result.kind).toBe("player-choice-required");
      expect(result.state.rulesContext.battlers[0]!.hp).toBe(0); // fainted from its own poison tick
      // The C value: floor(100/8) = 12 poison damage, same as any other turn.
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(88);
    },
  );
});
