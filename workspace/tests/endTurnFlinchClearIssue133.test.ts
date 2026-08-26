import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";

/**
 * ISSUES #133 / end-turn ordering audit FINDING 6.
 * `HandleEndTurn_ContinueBattle` (`src/battle_main.c:3941-3945`) clears
 * STATUS2_FLINCHED for EVERY battler at the top of the end-turn phase and
 * cancels multi-turn moves for any battler that is both asleep and
 * STATUS2_MULTIPLETURNS. The port previously cleared the flinch bit only at
 * CANCELER_FLINCH (`battleScriptActionAdmission.ts`), and
 * `AtkCanceler_UnableToUseMove` stops at the FIRST firing phase
 * (`battle_util.c:2268`) with ASLEEP/FROZEN/TRUANT/RECHARGE all ordered ahead
 * of FLINCH -- so a flinch landed on a loafing Truant holder (7 rental
 * entries) or a sleeping/frozen target survived into the next turn and cost
 * that mon a second consecutive turn.
 */

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WAIT_TIME_LONG = 64;
const NEUTRAL_STAT_STAGE = 6;
/** include/constants/battle.h:115-142. */
const STATUS1_SLEEP_3_TURNS = 3;
const STATUS2_FLINCHED = 1 << 3;
const STATUS2_MULTIPLETURNS = 1 << 12;
const STATUS2_LOCK_CONFUSE = (1 << 10) | (1 << 11);
const STATUS2_UPROAR = (1 << 4) | (1 << 5) | (1 << 6);
const STATUS2_BIDE = (1 << 8) | (1 << 9);
const STATUS2_CONFUSION = (1 << 0) | (1 << 1) | (1 << 2);

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
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [
      NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE,
      NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE, NEUTRAL_STAT_STAGE,
    ],
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
    isFirstTurn: changes.isFirstTurn,
  }) as unknown as BattleScriptRulesBattler;
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
    party: {
      player: [{ species: 302, isEgg: false, hp: 100 }, ...Array(5).fill({ species: 0, isEgg: false, hp: 0 })],
      opponent: [{ species: 302, isEgg: false, hp: 100 }, ...Array(5).fill({ species: 0, isEgg: false, hp: 0 })],
    },
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
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
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
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

function endTurn(rc: BattleScriptRulesContext) {
  const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
  const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
  if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
  return result.state.rulesContext;
}

describe("HandleEndTurn_ContinueBattle -- per-turn STATUS2_FLINCHED clear (ISSUES #133)", () => {
  it("clears STATUS2_FLINCHED for every battler, unconditionally", () => {
    const after = endTurn(context({
      battlers: [
        battler({ side: 0, status2: STATUS2_FLINCHED }),
        battler({ side: 1, partyIndex: 2, status2: STATUS2_FLINCHED }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[0]!.status2 & STATUS2_FLINCHED).toBe(0);
    expect(after.battlers[1]!.status2 & STATUS2_FLINCHED).toBe(0);
  });

  it("a flinch shadowed by CANCELER_TRUANT does not survive to the flinched mon's next acting turn", () => {
    // The audit's own scenario: opponent SLAKING is on its loafing turn
    // (truantCounter set), the player's faster mon lands a ROCK SLIDE flinch,
    // and CANCELER_TRUANT pre-empts CANCELER_FLINCH so the bit is never
    // consumed. The end-turn clear is the only thing that retires it.
    const after = endTurn(context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, partyIndex: 2, truantCounter: 1, status2: STATUS2_FLINCHED }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[1]!.status2 & STATUS2_FLINCHED).toBe(0);
    // The clear touches nothing else the canceler owns.
    expect(after.battlers[1]!.truantCounter).toBe(1);
  });

  it("a flinch shadowed by CANCELER_ASLEEP does not survive either", () => {
    const after = endTurn(context({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          partyIndex: 2,
          status1: STATUS1_SLEEP_3_TURNS,
          status2: STATUS2_FLINCHED,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[1]!.status2 & STATUS2_FLINCHED).toBe(0);
  });

  it("leaves an unflinched battler's status2 alone", () => {
    const after = endTurn(context({
      battlers: [
        battler({ side: 0, status2: STATUS2_CONFUSION }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[0]!.status2 & STATUS2_CONFUSION).toBe(STATUS2_CONFUSION);
  });
});

describe("HandleEndTurn_ContinueBattle -- CancelMultiTurnMoves for a sleeping multi-turn user", () => {
  it("cancels STATUS2_MULTIPLETURNS (and the rest of the CancelMultiTurnMoves mask) on a sleeping battler", () => {
    const after = endTurn(context({
      battlers: [
        battler({
          side: 0,
          status1: STATUS1_SLEEP_3_TURNS,
          status2: STATUS2_MULTIPLETURNS | STATUS2_LOCK_CONFUSE,
          rolloutTimer: 3,
          furyCutterCounter: 2,
        }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(0);
    expect(after.battlers[0]!.status2 & STATUS2_LOCK_CONFUSE).toBe(0);
    expect(after.battlers[0]!.rolloutTimer).toBe(0);
    expect(after.battlers[0]!.furyCutterCounter).toBe(0);
  });

  it("does NOT cancel a multi-turn lock on an AWAKE battler (both halves of the guard are required)", () => {
    const after = endTurn(context({
      battlers: [
        battler({ side: 0, status2: STATUS2_MULTIPLETURNS | STATUS2_UPROAR | STATUS2_BIDE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[0]!.status2 & STATUS2_MULTIPLETURNS).toBe(STATUS2_MULTIPLETURNS);
  });

  it("does NOT cancel on a sleeping battler that has no multi-turn lock", () => {
    const after = endTurn(context({
      battlers: [
        battler({ side: 0, status1: STATUS1_SLEEP_3_TURNS, rolloutTimer: 3, furyCutterCounter: 2 }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(after.battlers[0]!.rolloutTimer).toBe(3);
    expect(after.battlers[0]!.furyCutterCounter).toBe(2);
  });
});
