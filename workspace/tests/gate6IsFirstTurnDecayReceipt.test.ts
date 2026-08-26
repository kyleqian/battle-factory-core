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
 * `TurnValuesCleanUp(FALSE)`'s per-turn `gDisableStructs` decrements
 * (`src/battle_main.c:4876-4886`, called once per turn from
 * `BattleTurnPassed:3974`) and its both-branch substitute sync (`:4887-4888`),
 * pinned at the facts of the stock-ROM receipt
 * `tools/probe/receipts/gate6-first-turn-decay-off.json` (Battle Scene OFF,
 * fixture `tools/battle-lab/gate6-first-turn-decay-off.json`, byte-identical
 * across two fresh oracle runs).
 *
 * Receipt facts this file pins:
 *   turn 1 prompt  gDisableStructs[0..1].isFirstTurn == [1, 1]
 *   frame 324      [1, 1] -> [0, 0]        (end of turn 1)
 *   turn 3         NINJASK shifted in      isFirstTurn[0] := 2, NO Speed Boost
 *   frame 1660     2 -> 1                  (end of turn 3)
 *   turn 4 end     Speed Boost fires       Speed stage 6 -> 7
 *   frame 2433     1 -> 0                  (end of turn 4)
 *   turn 5 end     Speed Boost fires again Speed stage 7 -> 8
 */

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WAIT_TIME_LONG = 64;
/** include/constants/abilities.h. */
const ABILITY_SPEED_BOOST = 3;
const STAT_SPEED = 3;
const NEUTRAL_STAT_STAGE = 6;
/** include/constants/battle.h -- STATUS2_RECHARGE / STATUS2_SUBSTITUTE. */
const STATUS2_RECHARGE = 1 << 22;
const STATUS2_SUBSTITUTE = 1 << 24;


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

function runEndTurn(rc: BattleScriptRulesContext) {
  const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
  const initial = scratchState(rc, 0);
  const result = runBattleEndTurnOrchestration(program, handlers, initial);
  if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
  return { initial, result };
}

describe("TurnValuesCleanUp(FALSE) -- isFirstTurn decay (gate6-first-turn-decay-off receipt)", () => {
  it("decrements every battler's isFirstTurn once per turn and floors it at 0", () => {
    // The receipt's turn-1 prompt reads [1, 1] (TryDoEventsBeforeFirstTurn's own
    // TurnValuesCleanUp(FALSE) already pre-decremented the leads' 2), and turn 2's
    // prompt reads [0, 0].
    const { result } = runEndTurn(context({
      battlers: [
        battler({ side: 0, isFirstTurn: 1 }),
        battler({ side: 1, partyIndex: 2, isFirstTurn: 1 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(result.state.rulesContext.battlers[0]!.isFirstTurn).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.isFirstTurn).toBe(0);

    // Already 0: `if (gDisableStructs[i].isFirstTurn)` guards the decrement, so
    // it never wraps to 255.
    const { result: floored } = runEndTurn(context({
      battlers: [
        battler({ side: 0, isFirstTurn: 0 }),
        battler({ side: 1, partyIndex: 2, isFirstTurn: 0 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(floored.state.rulesContext.battlers[0]!.isFirstTurn).toBe(0);
    expect(floored.state.rulesContext.battlers[1]!.isFirstTurn).toBe(0);
  });

  it("arm 1 (Fake Out): the lead's isFirstTurn reaches 0 after exactly one end-turn pass", () => {
    // Cmd_jumpifnotfirstturn (data/battle_scripts_1.s:2048-2052) is Fake Out's
    // only gate: nonzero => the move works, 0 => "But it failed!". The receipt
    // shows the flinch on turn 1 and the failure on turn 2.
    let rc = context({
      battlers: [
        battler({ side: 0, isFirstTurn: 1 }),
        battler({ side: 1, partyIndex: 2, isFirstTurn: 1 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    expect(rc.battlers[0]!.isFirstTurn).toBe(1); // turn 1: Fake Out flinches
    rc = runEndTurn(rc).result.state.rulesContext;
    expect(rc.battlers[0]!.isFirstTurn).toBe(0); // turn 2: "But it failed!"
    rc = runEndTurn(rc).result.state.rulesContext;
    expect(rc.battlers[0]!.isFirstTurn).toBe(0); // and stays failed for the battle
  });

  it("arm 2 (Speed Boost): suppressed on the switch-in turn, fires on the next two turns", () => {
    // battle_util.c:2643's gate is `isFirstTurn != 2`, so a mid-battle switch-in
    // sits out exactly one end-turn pass -- the receipt's NINJASK (species 302,
    // FRONTIER_MON_NINJASK_1 set 238) shifted in on turn 3.
    const switchedIn = context({
      battlers: [
        battler({ side: 0, species: 302, ability: ABILITY_SPEED_BOOST, isFirstTurn: 2 }),
        battler({ side: 1, partyIndex: 2, isFirstTurn: 0 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const turn3 = runEndTurn(switchedIn).result;
    expect(turn3.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE);
    expect(turn3.state.events.some((e) => e.kind === "message" && e.messageId === "STRINGID_PKMNRAISEDSPEED")).toBe(false);
    // ...and the same pass decays 2 -> 1, which is what re-opens the gate.
    expect(turn3.state.rulesContext.battlers[0]!.isFirstTurn).toBe(1);

    const turn4 = runEndTurn(turn3.state.rulesContext).result;
    expect(turn4.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE + 1);
    expect(turn4.state.events.some((e) => e.kind === "message" && e.messageId === "STRINGID_PKMNRAISEDSPEED")).toBe(true);
    expect(turn4.state.rulesContext.battlers[0]!.isFirstTurn).toBe(0);

    const turn5 = runEndTurn(turn4.state.rulesContext).result;
    expect(turn5.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE + 2);
  });
});

describe("TurnValuesCleanUp(FALSE) -- rechargeTimer decay and substitute sync", () => {
  it("steps rechargeTimer 2 -> 1 without touching STATUS2_RECHARGE", () => {
    const { result } = runEndTurn(context({
      battlers: [
        battler({ side: 0, rechargeTimer: 2, status2: STATUS2_RECHARGE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(result.state.rulesContext.battlers[0]!.rechargeTimer).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_RECHARGE).toBe(STATUS2_RECHARGE);
  });

  it("clears STATUS2_RECHARGE exactly when rechargeTimer reaches 0", () => {
    const { result } = runEndTurn(context({
      battlers: [
        battler({ side: 0, rechargeTimer: 1, status2: STATUS2_RECHARGE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(result.state.rulesContext.battlers[0]!.rechargeTimer).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_RECHARGE).toBe(0);
  });

  it("leaves a 0 rechargeTimer alone (no wrap, no spurious STATUS2_RECHARGE clear)", () => {
    const { result } = runEndTurn(context({
      battlers: [
        battler({ side: 0, rechargeTimer: 0, status2: STATUS2_RECHARGE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(result.state.rulesContext.battlers[0]!.rechargeTimer).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_RECHARGE).toBe(STATUS2_RECHARGE);
  });

  it("clears STATUS2_SUBSTITUTE for a battler whose substituteHP is 0", () => {
    const { result } = runEndTurn(context({
      battlers: [
        battler({ side: 0, substituteHP: 0, status2: STATUS2_SUBSTITUTE }),
        battler({ side: 1, partyIndex: 2, substituteHP: 25, status2: STATUS2_SUBSTITUTE }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    }));
    expect(result.state.rulesContext.battlers[0]!.status2 & STATUS2_SUBSTITUTE).toBe(0);
    // A live Substitute is untouched.
    expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_SUBSTITUTE).toBe(STATUS2_SUBSTITUTE);
  });
});
