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
 * `DoFieldEndTurnEffects`' four side-scoped cases are CASE-major
 * (`src/battle_util.c:1220-1315`): ENDTURN_REFLECT, ENDTURN_LIGHT_SCREEN,
 * ENDTURN_MIST and ENDTURN_SAFEGUARD each own a `while (turnSideTracker < 2)`
 * loop, so the visit order is Reflect(0), Reflect(1), LightScreen(0),
 * LightScreen(1), Mist(0), Mist(1), Safeguard(0), Safeguard(1).
 *
 * Pinned at the facts of the stock-ROM receipt
 * `tools/probe/receipts/gate6-screen-expiry-order-off.json` (Battle Scene OFF,
 * fixture `tools/battle-lab/gate6-screen-expiry-order-off.json`,
 * byte-identical across two fresh oracle runs): the player's LIGHT SCREEN
 * (side 0) and the opponent's REFLECT (side 1) both go up on turn 1 and both
 * expire at the end of turn 5, and the ROM prints
 *   frame 2060  "Foe's REFLECT wore off!"
 *   frame 2151  "Ally's LIGHT SCREEN wore off!"
 * -- Reflect's case, side 1, still ahead of Light Screen's case, side 0.
 *
 * Both expiries emit the same STRINGID_PKMNSXWOREOFF, so the local
 * `prepareMessage` port tags each message with `battleTextBuff1Move` (source's
 * PREPARE_MOVE_BUFFER(gBattleTextBuff1, MOVE_*) at battle_util.c:1229/1258/
 * 1276) to make the ORDER observable.
 */

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WAIT_TIME_LONG = 64;
const B_WAIT_TIME_SHORT = 32;
const NEUTRAL_STAT_STAGE = 6;
/** include/constants/battle.h:210-217. */
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_MIST = 1 << 8;
/** include/constants/moves.h -- STRINGID_PKMNSXWOREOFF's {B_BUFF1} source. */
const MOVE_REFLECT = 115;
const MOVE_LIGHT_SCREEN = 113;
const MOVE_MIST = 54;


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

/**
 * Same shape as the other end-turn suites' port stub, except `prepareMessage`
 * appends the live `battleTextBuff1Move` so two STRINGID_PKMNSXWOREOFF
 * messages from different cases are distinguishable in the event stream.
 */
function externalPorts(attacker: 0 | 1): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: Readonly<{ state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }>) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (
      ctx: Readonly<{ state: { rulesContext: BattleScriptRulesContext } }>,
      operand: Readonly<{ expression: string }>,
    ) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: `${operand.expression}:${ctx.state.rulesContext.battleTextBuff1Move}`,
          substitutions: Object.freeze([]),
        })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG"
        ? B_WAIT_TIME_LONG
        : operand.expression === "B_WAIT_TIME_SHORT"
          ? B_WAIT_TIME_SHORT
          : null,
    resolveByteOperand: () => null,
  }) as unknown as BattleScriptStatusRulesExternalPorts;
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

function endTurnMessageIds(rc: BattleScriptRulesContext): readonly string[] {
  const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
  const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
  if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
  return result.state.events
    .filter((event): event is Extract<typeof event, { kind: "message" }> => event.kind === "message")
    .map((event) => event.messageId);
}

const REFLECT_WORE_OFF = `STRINGID_PKMNSXWOREOFF:${MOVE_REFLECT}`;
const LIGHT_SCREEN_WORE_OFF = `STRINGID_PKMNSXWOREOFF:${MOVE_LIGHT_SCREEN}`;
const MIST_WORE_OFF = `STRINGID_PKMNSXWOREOFF:${MOVE_MIST}`;
const SAFEGUARD_ENDED = "STRINGID_PKMNSAFEGUARDEXPIRED:0";

describe("DoFieldEndTurnEffects -- case-major side loop (gate6-screen-expiry-order-off receipt)", () => {
  it("opponent Reflect (side 1) expires BEFORE player Light Screen (side 0) on the same turn", () => {
    const rc = context({
      sideStatuses: [SIDE_STATUS_LIGHTSCREEN, SIDE_STATUS_REFLECT],
      sideTimers: [
        { lightscreenTimer: 1, lightscreenBattlerId: 0 },
        { reflectTimer: 1, reflectBattlerId: 1 },
      ],
    });
    const messages = endTurnMessageIds(rc);
    expect(messages).toContain(REFLECT_WORE_OFF);
    expect(messages).toContain(LIGHT_SCREEN_WORE_OFF);
    // The receipt's order: Reflect's case (side 1) then Light Screen's case (side 0).
    expect(messages.indexOf(REFLECT_WORE_OFF)).toBeLessThan(messages.indexOf(LIGHT_SCREEN_WORE_OFF));
  });

  it("all four cases fire case-major across both sides in one pass", () => {
    // Player side 0 holds Light Screen + Safeguard; opponent side 1 holds
    // Reflect + Mist. Case-major order => Reflect(1), LightScreen(0), Mist(1),
    // Safeguard(0). A side-major loop would give LightScreen, Safeguard,
    // Reflect, Mist.
    const rc = context({
      sideStatuses: [
        SIDE_STATUS_LIGHTSCREEN | SIDE_STATUS_SAFEGUARD,
        SIDE_STATUS_REFLECT | SIDE_STATUS_MIST,
      ],
      sideTimers: [
        { lightscreenTimer: 1, lightscreenBattlerId: 0, safeguardTimer: 1, safeguardBattlerId: 0 },
        { reflectTimer: 1, reflectBattlerId: 1, mistBattlerId: 1 },
      ],
      mistTimers: [0, 1],
    });
    expect(endTurnMessageIds(rc)).toEqual([
      REFLECT_WORE_OFF,
      LIGHT_SCREEN_WORE_OFF,
      MIST_WORE_OFF,
      SAFEGUARD_ENDED,
    ]);
  });

  it("same-case both-side expiries still run side 0 before side 1 (the inner turnSideTracker loop)", () => {
    const rc = context({
      sideStatuses: [SIDE_STATUS_REFLECT, SIDE_STATUS_REFLECT],
      sideTimers: [
        { reflectTimer: 1, reflectBattlerId: 0 },
        { reflectTimer: 1, reflectBattlerId: 1 },
      ],
    });
    // Both are Reflect, so the messages are identical -- what the pin proves is
    // that the case fires exactly twice and the side cursor advanced past both.
    expect(endTurnMessageIds(rc)).toEqual([REFLECT_WORE_OFF, REFLECT_WORE_OFF]);
  });
});
