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
import { createEmptyCallbackStack, popEnd3 } from "../src/engine/battleScriptCallbackStack.ts";

/**
 * `ENDTURN_ABILITIES` slice 1 (Speed Boost + Rain Dish), docs/endturn-
 * abilities-items-ground-truth.md §1b/§3a/§3b + docs/end3-design.md. Verified
 * against the doc's own live ledgers: §3a's NINJASK (statStages[SPEED]
 * 6->7->8->9 across 3 ticks, zero RNG) and §3b's LOTAD (104->111->...->107,
 * +7 = floor(115/16), zero RNG).
 */

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WAIT_TIME_LONG = 64;
/** include/constants/abilities.h. */
const ABILITY_SPEED_BOOST = 3;
const ABILITY_RAIN_DISH = 44;
/** include/constants/battle.h:232-234 -- B_WEATHER_RAIN_TEMPORARY, the bit docs/endturn-abilities-items-ground-truth.md §3b's own live ledger sets. */
const B_WEATHER_RAIN = 1 << 0;
const STAT_SPEED = 3;
const MAX_STAT_STAGE = 12;
const NEUTRAL_STAT_STAGE = 6;

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

describe("runBattleEndTurnOrchestration -- ENDTURN_ABILITIES slice 1 (Speed Boost / Rain Dish)", () => {
  it("Speed Boost fires: +1 speed stage, the raised-speed message, script runs to END3, callback resumes, zero RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, ability: ABILITY_SPEED_BOOST }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);

    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE + 1);
    expect(result.state.events.some((event) => event.kind === "message" && event.messageId === "STRINGID_PKMNRAISEDSPEED")).toBe(true);
    expect(result.state.haltReason).toBeNull();
    expect(result.state.rng.calls).toBe(initial.rng.calls);
    expect(result.state.rng.value).toBe(initial.rng.value);
  });

  it("Rain Dish heals floor(maxHP/16) in rain", () => {
    const rc = context({
      weather: B_WEATHER_RAIN,
      battlers: [
        battler({ side: 0, ability: ABILITY_RAIN_DISH, hp: 100, maxHP: 115 }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);

    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(107); // 100 + floor(115/16) = 100 + 7
    expect(result.state.rng.calls).toBe(initial.rng.calls);
    expect(result.state.rng.value).toBe(initial.rng.value);
  });

  it("Rain Dish does not fire without rain", () => {
    const rc = context({
      weather: 0,
      battlers: [
        battler({ side: 0, ability: ABILITY_RAIN_DISH, hp: 100, maxHP: 115 }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(100);
  });

  it("Speed Boost does not fire at MAX_STAT_STAGE (12)", () => {
    const rc = context({
      battlers: [
        battler({
          side: 0, ability: ABILITY_SPEED_BOOST,
          statStages: [6, 6, 6, MAX_STAT_STAGE, 6, 6, 6, 6],
        }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(MAX_STAT_STAGE);
  });

  it("Speed Boost does not fire on isFirstTurn == 2 (battle_util.c:2643's own exception)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, ability: ABILITY_SPEED_BOOST, isFirstTurn: 2 }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE);
  });

  it("two battlers' Speed Boost fire sequentially (never nested) within one end-turn pass", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, ability: ABILITY_SPEED_BOOST }),
        battler({ side: 1, ability: ABILITY_SPEED_BOOST, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);

    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE + 1);
    expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPEED]).toBe(NEUTRAL_STAT_STAGE + 1);
    expect(result.state.rng.calls).toBe(initial.rng.calls); // zero Random() draws for either battler
  });

  it("the empty-stack END3 mismatch surfaces explicitly (not silent garbage) via the same primitive production wiring relies on", () => {
    const popped = popEnd3(createEmptyCallbackStack());
    expect(popped.kind).toBe("underflow");
  });
});
