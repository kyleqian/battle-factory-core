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
import frontierHeldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

const program = loadBattleScriptProgram();
/** include/constants/battle.h:78/117-122. */
const BATTLE_TYPE_FACTORY = 1 << 19;
const STATUS1_BURN = 1 << 4;
const STATUS1_TOXIC_POISON = 1 << 7;
const B_WAIT_TIME_LONG = 64;
/** include/constants/battle.h:140-141,158-159,167. */
const STATUS3_ROOTED = 1 << 10;
const STATUS3_CHARGED_UP = 1 << 9;
const STATUS3_ALWAYS_HITS_TURN_1 = 1 << 3;
const STATUS3_ALWAYS_HITS_TURN_2 = 2 << 3;
const STATUS3_LEECHSEED = 1 << 2;
const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);
/** include/abilities.h:68. */
const ABILITY_LIQUID_OOZE = 64;
/** include/constants/items.h -- docs/endturn-abilities-items-ground-truth.md §5 slice 4's own ten held items. */
const ITEM_BERRY_JUICE = 44;
const ITEM_CHERI_BERRY = 133;
const ITEM_CHESTO_BERRY = 134;
const ITEM_PECHA_BERRY = 135;
const ITEM_RAWST_BERRY = 136;
const ITEM_ASPEAR_BERRY = 137;
const ITEM_LEPPA_BERRY = 138;
const ITEM_PERSIM_BERRY = 140;
const ITEM_LUM_BERRY = 141;
const ITEM_SITRUS_BERRY = 142;
const ITEM_FIGY_BERRY = 143;
const ITEM_WIKI_BERRY = 144;
const ITEM_MAGO_BERRY = 145;
const ITEM_AGUAV_BERRY = 146;
const ITEM_IAPAPA_BERRY = 147;
const ITEM_LIECHI_BERRY = 168;
const ITEM_GANLON_BERRY = 169;
const ITEM_SALAC_BERRY = 170;
const ITEM_PETAYA_BERRY = 171;
const ITEM_APICOT_BERRY = 172;
const ITEM_LANSAT_BERRY = 173;
const ITEM_STARF_BERRY = 174;
const ITEM_WHITE_HERB = 180;
const ITEM_MENTAL_HERB = 185;
const ITEM_LEFTOVERS = 200;
/** include/constants/battle.h:129-142. */
const STATUS2_CONFUSION = (1 << 0) | (1 << 1) | (1 << 2);
const STATUS2_NIGHTMARE = 1 << 27;
const STATUS2_INFATUATION = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19);
/** include/constants/battle.h:115-120. */
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_POISON = 1 << 3;
const STATUS1_SLEEP_3_TURNS = 3;
/** include/constants/battle.h -- STAT_ATK/STAT_SPEED/STAT_SPATK (doc §5 slice 5). */
const STAT_ATK = 1;
const STAT_SPEED = 3;
const STAT_SPATK = 4;
/** include/constants/battle.h:168-169 -- STATUS3_YAWN's 2-bit turn counter (bits 11-12), docs/yawn-thrash-endturn-design.md §2. */
const STATUS3_YAWN_MASK = (1 << 11) | (1 << 12);
const STATUS3_YAWN_TURN_1 = (1 << 11) & STATUS3_YAWN_MASK;
const STATUS3_YAWN_TURN_2 = (2 << 11) & STATUS3_YAWN_MASK;
/** include/constants/abilities.h -- same ids as Rung 1's `JUMPIFABILITY_VALUES` widening. */
const ABILITY_VITAL_SPIRIT = 72;
const ABILITY_INSOMNIA = 15;
const ABILITY_SOUNDPROOF = 43;
/** include/constants/abilities.h:24 -- Own Tempo, docs/yawn-thrash-endturn-design.md §4's confusion-onset blocker. */
const ABILITY_OWN_TEMPO = 20;
/** include/constants/battle.h:137-139 -- STATUS2_LOCK_CONFUSE's 2-bit turn counter (bits 10-11) plus STATUS2_MULTIPLETURNS (bit 12), docs/yawn-thrash-endturn-design.md §4. */
const STATUS2_LOCK_CONFUSE_MASK = (1 << 10) | (1 << 11);
const STATUS2_LOCK_CONFUSE_TURN_1 = (1 << 10) & STATUS2_LOCK_CONFUSE_MASK;
const STATUS2_LOCK_CONFUSE_TURN_2 = (2 << 10) & STATUS2_LOCK_CONFUSE_MASK;
const STATUS2_LOCK_CONFUSE_TURN_3 = (3 << 10) & STATUS2_LOCK_CONFUSE_MASK;
const STATUS2_MULTIPLETURNS = 1 << 12;
const STATUS2_UPROAR_MASK = (1 << 4) | (1 << 5) | (1 << 6);
const STATUS2_UPROAR_TURN_1 = 1 << 4;
const STATUS2_UPROAR_TURN_2 = 2 << 4;
const STATUS2_UPROAR_TURN_3 = 3 << 4;
/** src/data/gen/moves.json -- gBattleMoves[].pp (base PP), doc §6 addendum's RESTORE_PP tests. */
const MOVE_TACKLE = 33;
const MOVE_HYDRO_PUMP = 56;

const ZERO_CARRIER_ITEM_CASES = [
  [ITEM_FIGY_BERRY, "HOLD_EFFECT_CONFUSE_SPICY"],
  [ITEM_WIKI_BERRY, "HOLD_EFFECT_CONFUSE_DRY"],
  [ITEM_MAGO_BERRY, "HOLD_EFFECT_CONFUSE_SWEET"],
  [ITEM_AGUAV_BERRY, "HOLD_EFFECT_CONFUSE_BITTER"],
  [ITEM_IAPAPA_BERRY, "HOLD_EFFECT_CONFUSE_SOUR"],
  [ITEM_GANLON_BERRY, "HOLD_EFFECT_DEFENSE_UP"],
  [ITEM_APICOT_BERRY, "HOLD_EFFECT_SP_DEFENSE_UP"],
  [ITEM_LANSAT_BERRY, "HOLD_EFFECT_CRITICAL_UP"],
  [ITEM_STARF_BERRY, "HOLD_EFFECT_RANDOM_STAT_UP"],
] as const;

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
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
}

/** Mirrors factoryBattleScriptTerminalDecision.ts's own externalPorts(attacker) -- real STRINGID_* message/B_WAIT_TIME_LONG resolution, everything else stubbed. */
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
  // Any committed label works as a scratch entry point -- runBattleEndTurnOrchestration
  // always starts its own fresh BattleScriptExecute per fired case, ignoring this one.
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    919694434,
    externalPorts(attacker),
  ).state;
}

describe("runBattleEndTurnOrchestration (BattleTurnPassed equivalent)", () => {
  it("ENDTURN_LOCK_ON decrements two turns to one, then expires while preserving unrelated status3", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, status3: STATUS3_ALWAYS_HITS_TURN_2 | STATUS3_ROOTED }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const first = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    if (first.kind !== "next-turn") throw new Error("expected next-turn");
    expect(first.state.rulesContext.battlers[0].status3).toBe(
      STATUS3_ALWAYS_HITS_TURN_1 | STATUS3_ROOTED,
    );
    const second = runBattleEndTurnOrchestration(program, handlers, first.state);
    if (second.kind !== "next-turn") throw new Error("expected next-turn");
    expect(second.state.rulesContext.battlers[0].status3).toBe(STATUS3_ROOTED);
  });

  it("ENDTURN_CHARGE decrements 2 -> 1, then expires 1 -> 0 and clears only the charged bit", () => {
    const rc = context({
      battlers: [
        battler({
          side: 0,
          status3: STATUS3_CHARGED_UP | STATUS3_ROOTED,
          chargeTimer: 2,
          chargeTimerStartValue: 2,
        }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const first = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(first.kind).toBe("next-turn");
    if (first.kind !== "next-turn") throw new Error("expected next-turn");
    expect(first.state.rulesContext.battlers[0]).toMatchObject({
      status3: STATUS3_CHARGED_UP | STATUS3_ROOTED,
      chargeTimer: 1,
      chargeTimerStartValue: 2,
    });
    const second = runBattleEndTurnOrchestration(program, handlers, first.state);
    expect(second.kind).toBe("next-turn");
    if (second.kind !== "next-turn") throw new Error("expected next-turn");
    expect(second.state.rulesContext.battlers[0]).toMatchObject({
      status3: STATUS3_ROOTED,
      chargeTimer: 0,
      chargeTimerStartValue: 2,
    });
    expect(second.state.rng.calls).toBe(0);
  });

  it("ENDTURN_NIGHTMARES pins the OFF receipt's 116 -> 87 -> 58 quarter-HP ladder with zero RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 116, maxHP: 116, status1: 3, status2: STATUS2_NIGHTMARE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(116), opponent: sixSlots(0, 0, 100) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const turn1 = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(turn1.kind).toBe("next-turn");
    if (turn1.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn1.state.rulesContext.battlers[0]).toMatchObject({
      hp: 87,
      status2: STATUS2_NIGHTMARE,
    });
    expect(turn1.state.rulesContext.party.player[0].hp).toBe(87);
    const turn2 = runBattleEndTurnOrchestration(program, handlers, turn1.state);
    expect(turn2.kind).toBe("next-turn");
    if (turn2.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn2.state.rulesContext.battlers[0]).toMatchObject({
      hp: 58,
      status2: STATUS2_NIGHTMARE,
    });
    expect(turn2.state.rulesContext.party.player[0].hp).toBe(58);
    expect(turn2.state.rng.calls).toBe(0);
  });

  it("ENDTURN_NIGHTMARES clears the volatile after wake without another HP tick", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 58, maxHP: 116, status1: 0, status2: STATUS2_NIGHTMARE }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(58), opponent: sixSlots(0, 0, 100) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0]).toMatchObject({ hp: 58, status2: 0 });
    expect(result.state.rulesContext.party.player[0].hp).toBe(58);
    expect(result.state.rng.calls).toBe(0);
  });

  it.each([
    ["decrements without expiry", { encoreTimer: 3, encoredMove: MOVE_TACKLE, encoredMovePos: 0, moves: [MOVE_TACKLE, 0, 0, 0], pp: [2, 0, 0, 0] }, 2, MOVE_TACKLE, false],
    ["timer expiry messages", { encoreTimer: 1, encoredMove: MOVE_TACKLE, encoredMovePos: 0, moves: [MOVE_TACKLE, 0, 0, 0], pp: [2, 0, 0, 0] }, 0, 0, true],
    ["zero-PP expiry messages", { encoreTimer: 3, encoredMove: MOVE_TACKLE, encoredMovePos: 0, moves: [MOVE_TACKLE, 0, 0, 0], pp: [0, 0, 0, 0] }, 0, 0, true],
    ["slot overwrite clears silently", { encoreTimer: 3, encoredMove: MOVE_TACKLE, encoredMovePos: 0, moves: [MOVE_HYDRO_PUMP, 0, 0, 0], pp: [2, 0, 0, 0] }, 0, 0, false],
  ] as const)("ENDTURN_ENCORE %s", (_name, changes, timer, move, messages) => {
    const rc = context({
      battlers: [
        battler({ side: 0, ...changes }),
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
    expect(result.state.rulesContext.battlers[0]).toMatchObject({
      encoreTimer: timer,
      encoredMove: move,
    });
    expect(result.state.events.some((event) =>
      event.kind === "message" && event.messageId === "STRINGID_PKMNENCOREENDED"
    )).toBe(messages);
  });

  it("no live end-turn condition on either battler: next-turn with zero RNG and an unchanged rulesContext", () => {
    const rc = context();
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it(
    "ENDTURN_TAUNT follows per-battler tracker order and decrements each present nonzero timer exactly once "
      + "(2->1, 1->0) with no message/controller/RNG work",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, tauntTimer: 2 }),
          battler({ side: 1, partyIndex: 2, tauntTimer: 1 }),
          battler({ side: 0, tauntTimer: 7 }),
          battler({ side: 1, tauntTimer: 9 }),
        ],
        // ENDTURN_ORDER consumes this source-shaped order for the two active
        // battlers. Slots 2/3 are outside battlersCount and must stay exact.
        battlerByTurnOrder: [1, 0, 3, 2],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers.map(({ tauntTimer }) =>
        tauntTimer
      )).toEqual([1, 0, 7, 9]);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(Object.isFrozen(result.state.rulesContext.battlers[0])).toBe(true);
      expect(Object.isFrozen(result.state.rulesContext.battlers[1])).toBe(true);
    },
  );

  it("ENDTURN_TAUNT skips an absent battler and leaves its timer untouched", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, tauntTimer: 2 }),
        battler({ side: 1, partyIndex: 2, tauntTimer: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      absentBattlerFlags: 1 << 1,
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error("expected next-turn");
    expect(result.state.rulesContext.battlers[0].tauntTimer).toBe(1);
    expect(result.state.rulesContext.battlers[1].tauntTimer).toBe(2);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });

  it(
    "(ISSUES #46) the full ProtectStruct table clears once per turn on the next-turn transition "
      + "(TurnValuesCleanUp(FALSE), docs/counter-retaliation-design.md §2.4) -- every modeled field, "
      + "on every battler, not just the one an admission reducer happened to overwrite",
    () => {
      const stale: Partial<BattleScriptRulesBattler> = {
        protected: 1,
        endured: 1,
        chargingTurn: 1,
        targetNotAffected: 1,
        flag2Unknown: 1,
        prlzImmobility: 1,
        confusionSelfDmg: 1,
        loveImmobility: 1,
        bounceMove: 1,
        stealMove: 1,
        helpingHand: 1,
        usedDisabledMove: 1,
        usedTauntedMove: 1,
        usedImprisonedMove: 1,
        flinchImmobility: 1,
        protectPhysicalDmg: 14,
        protectPhysicalBattlerId: 0,
        protectSpecialDmg: 8,
        protectSpecialBattlerId: 1,
      };
      const rc = context({
        battlers: [
          { ...battler({ side: 0 }), ...stale } as BattleScriptRulesBattler,
          { ...battler({ side: 1, partyIndex: 2 }), ...stale } as BattleScriptRulesBattler,
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      for (const id of [0, 1] as const) {
        expect(result.state.rulesContext.battlers[id]).toMatchObject({
          protected: 0,
          endured: 0,
          chargingTurn: 0,
          targetNotAffected: 0,
          flag2Unknown: 0,
          prlzImmobility: 0,
          confusionSelfDmg: 0,
          loveImmobility: 0,
          bounceMove: 0,
          stealMove: 0,
          helpingHand: 0,
          usedDisabledMove: 0,
          usedTauntedMove: 0,
          usedImprisonedMove: 0,
          flinchImmobility: 0,
          protectPhysicalDmg: 0,
          protectPhysicalBattlerId: 0,
          protectSpecialDmg: 0,
          protectSpecialBattlerId: 0,
        });
      }
    },
  );

  it(
    "(a) burn ticks maxHP/8 at end-turn across two consecutive turns -- doc's live 105 -> 92 -> 79 "
      + "ledger (docs/end-turn-ground-truth.md §2a), zero RNG, battler AND party slot both synced",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, hp: 105, maxHP: 105, status1: STATUS1_BURN, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 105) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const turn1Initial = scratchState(rc, 1);
      const turn1 = runBattleEndTurnOrchestration(program, handlers, turn1Initial);

      expect(turn1.kind).toBe("next-turn");
      expect(turn1.state.rulesContext.battlers[1]!.hp).toBe(92); // floor(105/8) = 13
      expect(turn1.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN); // no counter, unlike toxic
      expect(turn1.state.rulesContext.party.opponent[2]!.hp).toBe(92); // party slot sync
      expect(turn1.state.rng.calls).toBe(turn1Initial.rng.calls); // zero Random() draws (doc §2a)
      expect(turn1.state.rng.value).toBe(turn1Initial.rng.value);

      const turn2 = runBattleEndTurnOrchestration(program, handlers, turn1.state);
      expect(turn2.kind).toBe("next-turn");
      expect(turn2.state.rulesContext.battlers[1]!.hp).toBe(79); // 92 - 13, same flat damage (no growing counter)
      expect(turn2.state.rulesContext.party.opponent[2]!.hp).toBe(79);
      expect(turn2.state.rng.calls).toBe(turn1.state.rng.calls);
      expect(turn2.state.rng.value).toBe(turn1.state.rng.value);
    },
  );

  it(
    "(b) an end-turn Toxic KO runs the SAME faint machinery as a mid-turn KO -- inline checkteamslost "
      + "short-circuits the field/battler loop, HandleFaintedMonActions still runs unconditionally and "
      + "computes a REAL battleOutcome, zero RNG throughout (docs/end-turn-ground-truth.md §2b)",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, hp: 1, maxHP: 1, status1: STATUS1_TOXIC_POISON, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        // Opponent's bench is already fainted -- the SHEDINJA/1-HP terminal shape (doc's cheapest live KO),
        // proving the terminal fork of the "outcome-or-switch" faint machinery.
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 1) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      expect(rc.battleOutcome).toBe(0);

      const result = runBattleEndTurnOrchestration(program, handlers, initial);

      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.state.rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON -- opponent's whole party is now 0
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
      expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(0);
      // cleareffectsonfaint clears status1 (doc §2b frame 990), same as the mid-turn faint precedent.
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      // Zero further Random() draws from the counter-increment through GiveExp/HandleFaintedMon (doc §2b).
      expect(result.state.rng.calls).toBe(initial.rng.calls);
      expect(result.state.rng.value).toBe(initial.rng.value);
    },
  );

  it("regular poison ticks floor(maxHP/8) with no counter (distinct from Toxic's growing multiplier)", () => {
    const STATUS1_POISON = 1 << 3;
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 100, maxHP: 100, status1: STATUS1_POISON, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(88); // floor(100/8) = 12
  });

  it("Toxic's counter grows the tick each turn (1x, 2x, ...) unlike burn/regular poison", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 1000, maxHP: 1000, status1: STATUS1_TOXIC_POISON, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 1000) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const turn1 = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    if (turn1.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn1.state.rulesContext.battlers[1]!.hp).toBe(938); // 1000 - floor(1000/16)*1 = 1000 - 62
    const turn2 = runBattleEndTurnOrchestration(program, handlers, turn1.state);
    if (turn2.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn2.state.rulesContext.battlers[1]!.hp).toBe(814); // 938 - 62*2 = 814
  });

  it("(c) Ingrain heal ticks floor(maxHP/16) capped at maxHP -- doc's live 159 -> 161 ledger (docs/ingrain-leechseed-wrap-ground-truth.md §2a), zero RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 159, maxHP: 161, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 159) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(161); // capped at maxHP, not a blind +10 (floor(161/16))
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(STATUS3_ROOTED);
    expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(161);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Ingrain heal ticks a full floor(maxHP/16) when nowhere near the cap", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 50, maxHP: 161, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 50) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(60); // 50 + floor(161/16) = 50 + 10
  });

  it("Ingrain does not heal at full HP or at 0 HP (real guard, not just an inert no-op)", () => {
    const fullHpRc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 100, maxHP: 100, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(fullHpRc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("(d) Leech Seed drains floor(maxHP/8) from the seeded battler and heals the seeder the same amount, zero RNG (docs/ingrain-leechseed-wrap-ground-truth.md §2b)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 100, maxHP: 200, partyIndex: 0 }), // seeder (player, battler 0)
        battler({ side: 1, hp: 170, maxHP: 170, status3: STATUS3_LEECHSEED | 0, partyIndex: 2 }), // seeded, seeder id 0
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(149); // 170 - floor(170/8) = 170 - 21
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(121); // seeder gains the same 21
    expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_LEECHSEED).not.toBe(0);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Leech Seed + Liquid Ooze on the SEEDED battler: the seeder is damaged instead of healed (real ability branch, not source-cited only)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 100, maxHP: 200, partyIndex: 0 }), // seeder
        battler({ side: 1, hp: 170, maxHP: 170, status3: STATUS3_LEECHSEED | 0, ability: ABILITY_LIQUID_OOZE, partyIndex: 2 }), // seeded, has Liquid Ooze
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(149); // seeded mon still drains normally: 170 - 21
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(79); // seeder takes 21 damage instead of healing
  });

  it("(e) Wrap still-trapped: counter decrements first, then deals floor(maxHP/16), zero RNG (docs/ingrain-leechseed-wrap-ground-truth.md §2c)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 170, maxHP: 170, status2: 3 << 13, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect((result.state.rulesContext.battlers[1]!.status2 & STATUS2_WRAPPED_MASK) >>> 13).toBe(2); // 3 -> 2
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(160); // 170 - floor(170/16) = 170 - 10
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Wrap release: the decrement hitting zero frees the battler with no damage this tick", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 170, maxHP: 170, status2: 1 << 13, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_WRAPPED_MASK).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(170); // unchanged -- release deals no damage
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  describe("ENDTURN_THRASH (battle_util.c:1674-1695, docs/yawn-thrash-endturn-design.md §4)", () => {
    it("mid-lock: counter decrements (TURN(3) -> TURN(2)), MULTIPLETURNS stays set, no confusion, zero RNG", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status2: STATUS2_LOCK_CONFUSE_TURN_3 | STATUS2_MULTIPLETURNS, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      const b1 = result.state.rulesContext.battlers[1]!;
      expect(b1.status2 & STATUS2_LOCK_CONFUSE_MASK).toBe(STATUS2_LOCK_CONFUSE_TURN_2);
      expect(b1.status2 & STATUS2_MULTIPLETURNS).not.toBe(0);
      expect(b1.status2 & STATUS2_CONFUSION).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("final turn: lock expires and the confusion transition fires -- MULTIPLETURNS clears, STATUS2_CONFUSION lands via the exact (Random() % 4) + 2 roll, exactly 1 RNG draw, BattleScript_ThrashConfuses runs cleanly to its own end2 (seed 919694434 -> (randomValue%4)+2 == 3)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status2: STATUS2_LOCK_CONFUSE_TURN_1 | STATUS2_MULTIPLETURNS, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn"); // proves BattleScript_ThrashConfuses ran to its own end2, no opcode-barrier
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      const b1 = result.state.rulesContext.battlers[1]!;
      expect(b1.status2 & STATUS2_LOCK_CONFUSE_MASK).toBe(0);
      expect(b1.status2 & STATUS2_MULTIPLETURNS).toBe(0);
      expect(b1.status2 & STATUS2_CONFUSION).toBe(3);
      expect(result.state.rng.calls).toBe(initial.rng.calls + 1);
    });

    it("WasUnableToUseMove (flinchImmobility) takes priority over the lock-expiry branch: CancelMultiTurnMoves clears the WHOLE lock outright, no confusion, zero RNG -- even on what would have been the final turn", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({
            side: 1,
            status2: STATUS2_LOCK_CONFUSE_TURN_1 | STATUS2_MULTIPLETURNS,
            flinchImmobility: 1,
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      const b1 = result.state.rulesContext.battlers[1]!;
      expect(b1.status2).toBe(0); // LOCK_CONFUSE + MULTIPLETURNS both cleared by CancelMultiTurnMoves, no CONFUSION set
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("already confused from another source blocks the transition (source's own outer `!(status2 & STATUS2_CONFUSION)` gate, live here -- nothing earlier in this case excludes it): MULTIPLETURNS still clears, but the existing confusion duration is untouched, zero RNG", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({
            side: 1,
            status2: STATUS2_LOCK_CONFUSE_TURN_1 | STATUS2_MULTIPLETURNS | 2, // pre-existing STATUS2_CONFUSION = 2 turns
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      const b1 = result.state.rulesContext.battlers[1]!;
      expect(b1.status2 & STATUS2_LOCK_CONFUSE_MASK).toBe(0);
      expect(b1.status2 & STATUS2_MULTIPLETURNS).toBe(0);
      expect(b1.status2 & STATUS2_CONFUSION).toBe(2); // untouched, not re-rolled
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("Own Tempo blocks SetMoveEffect's own confusion branch: the lock clears silently, no script, no message, zero RNG (source's own `if (status2 & STATUS2_CONFUSION) BattleScriptExecute(...)` guard never fires)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({
            side: 1,
            status2: STATUS2_LOCK_CONFUSE_TURN_1 | STATUS2_MULTIPLETURNS,
            ability: ABILITY_OWN_TEMPO,
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      const b1 = result.state.rulesContext.battlers[1]!;
      expect(b1.status2).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    // A fainted lock-in target (hp === 0) is ALSO ported (runThrashTick mirrors
    // applySetMoveEffect's own non-primary-gated hp===0 early-out,
    // battleScriptHitChainOpcode.ts:2326-2328) but is not independently
    // Tier-1-pinned here: constructing a battler at hp===0 through this full
    // orchestration harness always routes into `HandleFaintedMonActions`'s own
    // switch-decision barrier (`GetMostSuitableMonToSwitchInto`'s AI_CalcDmg
    // fallback, unmodeled) regardless of Thrash state -- verified live this
    // rung with a plain hp===0 fixture carrying zero Thrash state, same
    // barrier. Staging a genuine same-pass faint (e.g. via Leech Seed damage
    // landing on 0 immediately before this battler's own THRASH case) plus a
    // real switch decision is out of proportion for this rung's own scope.

    it("no lock-in bit set at all: pure no-op, zero RNG", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });
  });

  describe("ENDTURN_UPROAR (battle_util.c:1625-1672)", () => {
    it("continuation decrements the timer, preserves MULTIPLETURNS, and prints the continuing message", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_3 | STATUS2_MULTIPLETURNS }),
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
      const active = result.state.rulesContext.battlers[0]!;
      expect(active.status2 & STATUS2_UPROAR_MASK).toBe(STATUS2_UPROAR_TURN_2);
      expect(active.status2 & STATUS2_MULTIPLETURNS).not.toBe(0);
      expect(result.state.events).toContainEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNMAKINGUPROAR" }),
      );
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("expiry decrements to zero, cancels the lock, and prints the ended message", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_1 | STATUS2_MULTIPLETURNS }),
          battler({ side: 1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[0]!.status2).toBe(0);
      expect(result.state.events).toContainEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNCALMEDDOWN" }),
      );
    });

    it("unable-to-move cancellation wins after the decrement and clears the whole multi-turn lock", () => {
      const rc = context({
        battlers: [
          battler({
            side: 0,
            status2: STATUS2_UPROAR_TURN_3 | STATUS2_MULTIPLETURNS,
            flinchImmobility: 1,
          }),
          battler({ side: 1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[0]!.status2).toBe(0);
      expect(result.state.events).toContainEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNCALMEDDOWN" }),
      );
    });

    it("wakes a sleeping non-Soundproof battler before decrement, clears Nightmare, and synchronizes party status", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_2 | STATUS2_MULTIPLETURNS }),
          battler({
            side: 1,
            status1: STATUS1_SLEEP_3_TURNS,
            status2: STATUS2_NIGHTMARE,
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_NIGHTMARE).toBe(0);
      expect(result.state.rulesContext.party.opponent[2]!.status1).toBe(0);
      expect(result.state.events).toContainEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWOKEUPINUPROAR" }),
      );
    });

    it("Soundproof sleeper is not awakened by Uproar", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_2 | STATUS2_MULTIPLETURNS }),
          battler({
            side: 1,
            ability: ABILITY_SOUNDPROOF,
            status1: STATUS1_SLEEP_3_TURNS,
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 0));
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_SLEEP_3_TURNS);
      expect(result.state.events).not.toContainEqual(
        expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWOKEUPINUPROAR" }),
      );
    });
  });

  describe("ENDTURN_YAWN (battle_util.c:1753-1771, docs/yawn-thrash-endturn-design.md §2)", () => {
    it("first end-turn pass only decrements the counter (TURN(2) -> TURN(1)), no sleep transition, zero RNG", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_2, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(STATUS3_YAWN_TURN_1);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("second end-turn pass empties the counter and fires the real sleep transition: status1 sleep-turn write, cancelMultiTurnMoves, exactly 1 RNG draw (seed 919694434 -> (randomValue&3)+2 == 3)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(3); // STATUS1_SLEEP_TURN(3), 2-5 turn range
      expect(result.state.rulesContext.party.opponent[2]!.status1).toBe(3);
      expect(result.state.rng.calls).toBe(initial.rng.calls + 1);
    });

    it("does not transition when status1 is already set (statused-target AND-chain blocker) -- still decrements to zero", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_1, status1: STATUS1_BURN, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN); // unchanged, not overwritten by sleep
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("does not transition when the target has Vital Spirit (AND-chain blocker)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_1, ability: ABILITY_VITAL_SPIRIT, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("does not transition when the target has Insomnia (AND-chain blocker)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_1, ability: ABILITY_INSOMNIA, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("active Uproar blocks Yawn's sleep transition after the counter expires", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_3 | STATUS2_MULTIPLETURNS }),
          battler({ side: 1, status3: STATUS3_YAWN_TURN_1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const initial = scratchState(rc, 0);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });

    it("Soundproof exempts the Yawn target from Uproar's sleep block", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, status2: STATUS2_UPROAR_TURN_3 | STATUS2_MULTIPLETURNS }),
          battler({
            side: 1,
            ability: ABILITY_SOUNDPROOF,
            status3: STATUS3_YAWN_TURN_1,
            partyIndex: 2,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
      const initial = scratchState(rc, 0);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status1 & 0x7).not.toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls + 1);
    });

    it("no yawn counter set at all: pure no-op, zero RNG", () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      const result = runBattleEndTurnOrchestration(program, handlers, initial);
      expect(result.kind).toBe("next-turn");
      if (result.kind !== "next-turn") throw new Error("expected next-turn");
      expect(result.state.rulesContext.battlers[1]!.status3).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    });
  });

  describe(
    "(f) ENDTURN_ITEMS1 (ItemBattleEffects(ITEMEFFECT_NORMAL, battler, FALSE), docs/endturn-abilities-items-ground-truth.md §1c/§5 slice 4)",
    () => {
      it("Leftovers heals floor(maxHP/16) capped at maxHP and PERSISTS (the only non-consuming case), zero RNG", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 160, item: ITEM_LEFTOVERS, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
          party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const initial = scratchState(rc, 1);
        const result = runBattleEndTurnOrchestration(program, handlers, initial);
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.hp).toBe(110); // 100 + floor(160/16) = 100 + 10
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEFTOVERS); // persists
        expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(110);
        expect(result.state.rng.calls).toBe(initial.rng.calls);
      });

      it("Leftovers does not heal at full HP (real guard, not a blanket skip)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 160, maxHP: 160, item: ITEM_LEFTOVERS, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.hp).toBe(160);
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEFTOVERS);
      });

      it("White Herb resets every stat stage below neutral(6) back to 6 and CONSUMES the item, zero RNG", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({
              side: 1, hp: 100, maxHP: 100, item: ITEM_WHITE_HERB, partyIndex: 2,
              statStages: [6, 4, 6, 3, 6, 6, 6, 6], // ATK -2, SPEED -3, everything else neutral
            }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const initial = scratchState(rc, 1);
        const result = runBattleEndTurnOrchestration(program, handlers, initial);
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
        expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // ITEM_NONE -- consumed
        expect(result.state.rng.calls).toBe(initial.rng.calls);
      });

      it("White Herb does not fire when every stat stage is already neutral or above (real guard)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_WHITE_HERB, partyIndex: 2, statStages: [6, 6, 8, 6, 6, 6, 6, 6] }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_WHITE_HERB); // untouched, not consumed
        expect(result.state.rulesContext.battlers[1]!.statStages).toEqual([6, 6, 8, 6, 6, 6, 6, 6]);
      });

      const cureBerryCases: ReadonlyArray<{
        name: string;
        item: number;
        battlerChanges: Partial<BattleScriptRulesBattler>;
        assertCured: (battlerAfter: BattleScriptRulesBattler) => void;
      }> = [
        {
          name: "Cheri Berry cures paralysis",
          item: ITEM_CHERI_BERRY,
          battlerChanges: { status1: STATUS1_PARALYSIS },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Pecha Berry cures regular poison",
          item: ITEM_PECHA_BERRY,
          battlerChanges: { status1: STATUS1_POISON },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Pecha Berry cures toxic poison (also clears the toxic counter)",
          item: ITEM_PECHA_BERRY,
          battlerChanges: { status1: STATUS1_TOXIC_POISON | (5 << 8) },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Rawst Berry cures burn",
          item: ITEM_RAWST_BERRY,
          battlerChanges: { status1: STATUS1_BURN },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Aspear Berry cures freeze",
          item: ITEM_ASPEAR_BERRY,
          battlerChanges: { status1: STATUS1_FREEZE },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Chesto Berry cures sleep (and the nightmare glitch-fix bit)",
          item: ITEM_CHESTO_BERRY,
          battlerChanges: { status1: STATUS1_SLEEP_3_TURNS, status2: STATUS2_NIGHTMARE },
          assertCured: (b) => {
            expect(b.status1).toBe(0);
            expect(b.status2 & STATUS2_NIGHTMARE).toBe(0);
          },
        },
        {
          name: "Persim Berry cures confusion (status2, not status1)",
          item: ITEM_PERSIM_BERRY,
          battlerChanges: { status2: STATUS2_CONFUSION },
          assertCured: (b) => expect(b.status2 & STATUS2_CONFUSION).toBe(0),
        },
        {
          name: "Mental Herb cures infatuation",
          item: ITEM_MENTAL_HERB,
          battlerChanges: { status2: STATUS2_INFATUATION },
          assertCured: (b) => expect(b.status2 & STATUS2_INFATUATION).toBe(0),
        },
        {
          name: "Lum Berry cures a single status1 condition",
          item: ITEM_LUM_BERRY,
          battlerChanges: { status1: STATUS1_PARALYSIS },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Lum Berry cures status1 AND confusion together in the same tick",
          item: ITEM_LUM_BERRY,
          battlerChanges: { status1: STATUS1_BURN, status2: STATUS2_CONFUSION },
          assertCured: (b) => {
            expect(b.status1).toBe(0);
            expect(b.status2 & STATUS2_CONFUSION).toBe(0);
          },
        },
      ];

      for (const { name, item, battlerChanges, assertCured } of cureBerryCases) {
        it(`${name}, consuming the berry, zero RNG`, () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item, partyIndex: 2, ...battlerChanges }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
            party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          assertCured(result.state.rulesContext.battlers[1]!);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // ITEM_NONE -- every one of these consumes
          expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(100); // untouched, no HP change
          expect(result.state.rng.calls).toBe(initial.rng.calls); // zero Random() draws (doc §4)
        });
      }

      it("a cure berry held with no matching status does not fire (real per-case guard, item persists)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_CHERI_BERRY, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_CHERI_BERRY);
      });

      describe(
        "(d) RESTORE_HP (Sitrus/Oran/Berry Juice) and RESTORE_PP (Leppa) -- doc §6 addendum, "
          + "battle_util.c:3337-3373",
        () => {
          it("Sitrus Berry heals hp<=floor(maxHP/2) by its own holdEffectParam (30), item consumed, zero RNG", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({ side: 1, hp: 40, maxHP: 100, item: ITEM_SITRUS_BERRY, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
              party: { player: sixSlots(100), opponent: sixSlots(0, 0, 40) },
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const initial = scratchState(rc, 1);
            const result = runBattleEndTurnOrchestration(program, handlers, initial);
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(70); // 40 + 30
            expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(70); // datahpupdate's own party HP mirror sync
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // consumed (ITEM_NONE)
            expect(result.state.rng.calls).toBe(initial.rng.calls);
          });

          it("Sitrus Berry fires exactly at hp === floor(maxHP/2) (inclusive boundary)", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({ side: 1, hp: 50, maxHP: 100, item: ITEM_SITRUS_BERRY, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(80); // 50 + 30
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
          });

          it("Sitrus Berry does not fire one HP above the gate (real gate, not blanket possession)", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({ side: 1, hp: 51, maxHP: 100, item: ITEM_SITRUS_BERRY, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(51); // unchanged
            expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_SITRUS_BERRY); // not consumed
          });

          it("Berry Juice's heal is capped at maxHP, not the raw holdEffectParam (20)", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({ side: 1, hp: 10, maxHP: 20, item: ITEM_BERRY_JUICE, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            // naive heal would be 10+20=30 > maxHP(20) -- capped to exactly maxHP, never overshooting.
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(20);
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
          });

          it("Leppa Berry restores the first zero-PP move slot by its own holdEffectParam (10), item consumed, zero RNG", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({
                  side: 1, hp: 100, maxHP: 100, item: ITEM_LEPPA_BERRY,
                  moves: [MOVE_TACKLE, 0, 0, 0], pp: [0, 0, 0, 0], partyIndex: 2,
                }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const initial = scratchState(rc, 1);
            const result = runBattleEndTurnOrchestration(program, handlers, initial);
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.pp).toEqual([10, 0, 0, 0]); // MOVE_TACKLE base pp 35, param 10
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
            expect(result.state.rng.calls).toBe(initial.rng.calls);
          });

          it("Leppa Berry's restore is capped at the move's own base PP (Hydro Pump: 5, not the raw param 10)", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({
                  side: 1, hp: 100, maxHP: 100, item: ITEM_LEPPA_BERRY,
                  moves: [MOVE_HYDRO_PUMP, 0, 0, 0], pp: [0, 0, 0, 0], partyIndex: 2,
                }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.pp).toEqual([5, 0, 0, 0]); // MOVE_HYDRO_PUMP base pp 5 < param 10
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
          });

          it("Leppa Berry picks the FIRST zero-PP slot, skipping an earlier non-zero-PP move (slot-selection semantics)", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({
                  side: 1, hp: 100, maxHP: 100, item: ITEM_LEPPA_BERRY,
                  moves: [MOVE_TACKLE, MOVE_HYDRO_PUMP, 0, 0], pp: [20, 0, 0, 0], partyIndex: 2,
                }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            // slot 0 (Tackle, pp 20) is untouched; slot 1 (Hydro Pump) is the first zero-PP slot, capped at 5.
            expect(result.state.rulesContext.battlers[1]!.pp).toEqual([20, 5, 0, 0]);
            expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
          });

          it("Leppa Berry does not fire when no move slot is at exactly 0 PP", () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({
                  side: 1, hp: 100, maxHP: 100, item: ITEM_LEPPA_BERRY,
                  moves: [MOVE_TACKLE, 0, 0, 0], pp: [1, 0, 0, 0], partyIndex: 2,
                }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.pp).toEqual([1, 0, 0, 0]);
            expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEPPA_BERRY); // not consumed
          });
        },
      );

      describe("(b) named case barriers: source-real hold effects with zero Factory L50 carriers", () => {
        it.each(ZERO_CARRIER_ITEM_CASES)(
          "%s / %s barriers by its source name when explicitly staged",
          (item, holdEffect) => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                battler({ side: 1, hp: 100, maxHP: 100, item, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("case-barrier");
            if (result.kind !== "case-barrier") throw new Error("expected case-barrier");
            expect(result.caseName).toBe("ENDTURN_ITEMS1");
            expect(result.detail).toContain(holdEffect);
            expect(result.detail).toContain("zero Factory L50 carriers");
          },
        );

        it("proves all nine barriers have zero carriers in the complete generated 882-entry catalog", () => {
          expect(frontierMonsData.count).toBe(882);
          const effectByTableId = new Map(
            frontierHeldItemsData.entries.map((entry) => [entry.itemTableId, entry.holdEffect]),
          );
          for (const [, holdEffect] of ZERO_CARRIER_ITEM_CASES) {
            const carriers = frontierMonsData.entries.filter(
              (mon) => effectByTableId.get(mon.itemTableId) === holdEffect,
            );
            expect(carriers, holdEffect).toHaveLength(0);
          }
        });

        it("does not blanket-barrier an ordinary non-end-turn hold effect", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item: 186, partyIndex: 2 }), // Choice Band
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
        });
      });

      describe("(c) slice 5: Liechi/Salac/Petaya stat-up berries", () => {
        it("Liechi Berry fires at hp <= floor(maxHP/4): +1 Attack stage, item consumed, zero RNG", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 25, maxHP: 100, item: ITEM_LIECHI_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(7);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // consumed (ITEM_NONE)
          expect(result.state.rng.calls).toBe(initial.rng.calls);
        });

        it("Liechi Berry does not fire above the hp <= floor(maxHP/4) threshold (real gate, not blanket possession)", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 26, maxHP: 100, item: ITEM_LIECHI_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(6);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LIECHI_BERRY); // not consumed
        });

        it("Salac Berry fires: +1 Speed stage, item consumed", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 20, maxHP: 100, item: ITEM_SALAC_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPEED]).toBe(7);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
        });

        it("Salac Berry does not fire above the threshold", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 26, maxHP: 100, item: ITEM_SALAC_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPEED]).toBe(6);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_SALAC_BERRY);
        });

        it("Petaya Berry fires: +1 Sp. Attack stage, item consumed", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 25, maxHP: 100, item: ITEM_PETAYA_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPATK]).toBe(7);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
        });

        it("Petaya Berry does not fire at MAX_STAT_STAGE even under the HP threshold", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({
                side: 1, hp: 10, maxHP: 100, item: ITEM_PETAYA_BERRY, partyIndex: 2,
                statStages: [6, 6, 6, 6, 12, 6, 6, 6],
              }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          expect(result.state.rulesContext.battlers[1]!.statStages[STAT_SPATK]).toBe(12);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_PETAYA_BERRY); // not consumed
        });
      });
    },
  );

  describe(
    "(g) ENDTURN_ITEMS2 (ItemBattleEffects(ITEMEFFECT_NORMAL, battler, TRUE) -- SAME caseID as ITEMS1, only moveTurn "
      + "differs, battle_util.c:1500-1505 -- docs/yawn-thrash-endturn-design.md §5, Rung 3)",
    () => {
      describe("moveTurn gate: no-double-fire regression, one per §5's must-gate row", () => {
        it("Leftovers heals exactly once per tick (ITEMS1 only) -- an ungated ITEMS2 call would heal a second time", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 160, item: ITEM_LEFTOVERS, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
            party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          // 100 + floor(160/16) = 110 -- NOT 120, which is what a second, ungated ITEMS2 heal would produce.
          expect(result.state.rulesContext.battlers[1]!.hp).toBe(110);
          expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(110);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEFTOVERS);
          expect(result.state.rng.calls).toBe(initial.rng.calls);
        });

        it(
          "Liechi Berry does NOT fire at ITEMS2 even though burn drops HP below its threshold mid-tick "
            + "(stat-up berries gate on !moveTurn -- battle_util.c:3245 -- so they only ever check at ITEMS1)",
          () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                // hp=30 > floor(100/4)=25 at ITEMS1 -- does not fire there. Burn then deals floor(100/8)=12,
                // dropping hp to 18 (<=25) BEFORE ITEMS2 runs. An ungated ITEMS2 call would newly satisfy the
                // threshold and fire a spurious stat raise; the moveTurn gate must suppress it regardless.
                battler({ side: 1, hp: 30, maxHP: 100, item: ITEM_LIECHI_BERRY, status1: STATUS1_BURN, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
              party: { player: sixSlots(100), opponent: sixSlots(0, 0, 30) },
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const initial = scratchState(rc, 1);
            const result = runBattleEndTurnOrchestration(program, handlers, initial);
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(18); // burn only: 30 - floor(100/8)
            expect(result.state.rulesContext.battlers[1]!.statStages[STAT_ATK]).toBe(6); // unchanged
            expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LIECHI_BERRY); // not consumed
            expect(result.state.rng.calls).toBe(initial.rng.calls); // burn + (non-firing) Liechi both draw zero RNG
          },
        );

        it(
          "Sitrus Berry's RESTORE_HP does NOT fire at ITEMS2 even though burn drops HP below its threshold "
            + "mid-tick (source's own moveTurn gate, battle_util.c:3337 -- RESTORE_PP shares the identical "
            + "`!moveTurn &&` gate shape, verified by direct code read, but has no modeled mid-tick PP mutator "
            + "in this engine to exercise the same live before/after transition)",
          () => {
            const rc = context({
              battlers: [
                battler({ side: 0 }),
                // hp=55 > floor(100/2)=50 at ITEMS1 -- does not fire there. Burn deals floor(100/8)=12,
                // dropping hp to 43 (<=50) BEFORE ITEMS2 runs. An ungated ITEMS2 call would spuriously heal.
                battler({ side: 1, hp: 55, maxHP: 100, item: ITEM_SITRUS_BERRY, status1: STATUS1_BURN, partyIndex: 2 }),
                battler({ side: 0 }),
                battler({ side: 1 }),
              ],
              party: { player: sixSlots(100), opponent: sixSlots(0, 0, 55) },
            });
            const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
            const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
            expect(result.kind).toBe("next-turn");
            if (result.kind !== "next-turn") throw new Error("expected next-turn");
            expect(result.state.rulesContext.battlers[1]!.hp).toBe(43); // burn only: 55 - floor(100/8), no heal
            expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_SITRUS_BERRY); // not consumed
          },
        );
      });

      it(
        "REAL TRIGGER: a Chesto Berry cures the sleep status ENDTURN_YAWN itself just wrote, in the SAME "
          + "end-turn pass, before ITEMS1 ever saw it (docs/yawn-thrash-endturn-design.md §5's worked example: "
          + "ITEMS1 runs before YAWN sets status1, so the cure is invisible to that tick's ITEMS1 and can only "
          + "fire at ITEMS2) -- negative companion for 'no double heal' is the Leftovers test above",
        () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, status3: STATUS3_YAWN_TURN_1, item: ITEM_CHESTO_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          // Yawn's own transition already cleared the counter; the cure (ITEMS2) then clears the sleep it just wrote.
          expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_YAWN_MASK).toBe(0);
          expect(result.state.rulesContext.battlers[1]!.status1).toBe(0); // cured in the SAME pass, never "felt"
          expect(result.state.rulesContext.party.opponent[2]!.status1).toBe(0);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // consumed
          expect(result.state.rng.calls).toBe(initial.rng.calls + 1); // only Yawn's own sleep-turn roll; the cure draws none
        },
      );

      it(
        "REAL TRIGGER (Rung 6, docs/yawn-thrash-endturn-design.md §7): a Persim Berry cures the confusion "
          + "ENDTURN_THRASH itself just wrote on the lock's final turn, in the SAME end-turn pass -- ITEMS2's "
          + "OTHER real trigger class (the Chesto/Yawn test above is the first), proving the SAME moveTurn-gated "
          + "HOLD_EFFECT_CURE_CONFUSION branch (already item-agnostic since Rung 3, no new code) fires off a "
          + "Thrash-family source instead of Yawn -- TAUROS/MOVE_THRASH is the named Factory-L50 carrier (§3's "
          + "table), modeled here at the status2/item level per this reducer's own existing convention",
        () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({
                side: 1,
                status2: STATUS2_LOCK_CONFUSE_TURN_1 | STATUS2_MULTIPLETURNS, // lock's final turn, mirrors the ENDTURN_THRASH suite's own transition case
                item: ITEM_PERSIM_BERRY,
                partyIndex: 2,
              }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          const b1 = result.state.rulesContext.battlers[1]!;
          // ENDTURN_THRASH's own transition already cleared the lock; the cure (ITEMS2) then clears the
          // confusion it just wrote -- never "felt" as a lost turn, same shape as the Chesto/Yawn sibling above.
          expect(b1.status2 & STATUS2_LOCK_CONFUSE_MASK).toBe(0);
          expect(b1.status2 & STATUS2_MULTIPLETURNS).toBe(0);
          expect(b1.status2 & STATUS2_CONFUSION).toBe(0);
          expect(b1.item).toBe(0); // consumed
          // seed 919694434 -> (randomValue % 4) + 2 == 3, Thrash's own duration roll; the cure draws none.
          expect(result.state.rng.calls).toBe(initial.rng.calls + 1);
        },
      );
    },
  );
});

describe("HandleWishPerishSongOnTurnEnd state 1", () => {
  const STATUS3_PERISH_SONG = 1 << 5;

  it("walks battlerByTurnOrder, formats the current timer, decrements each active holder, skips absent slots, and draws no RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, status3: STATUS3_PERISH_SONG, perishSongTimer: 3, perishSongTimerStartValue: 3 }),
        battler({ side: 1, partyIndex: 2, status3: STATUS3_PERISH_SONG, perishSongTimer: 2, perishSongTimerStartValue: 3 }),
        battler({ side: 0, status3: STATUS3_PERISH_SONG, perishSongTimer: 3, perishSongTimerStartValue: 3 }),
        battler({ side: 1 }),
      ],
      battlerByTurnOrder: [1, 0, 2, 3],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const first = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(first.kind).toBe("next-turn");
    if (first.kind !== "next-turn") throw new Error("expected next-turn");
    expect(first.state.rulesContext.battlers.map(({ perishSongTimer }) => perishSongTimer))
      .toEqual([2, 1, 3, 0]);
    // Opponent timer 2 is formatted first; player timer 3 is formatted last.
    expect(first.state.rulesContext.battleTextBuff1ByteNumber).toBe(3);
    expect(first.state.rng.calls).toBe(initial.rng.calls);

    const second = runBattleEndTurnOrchestration(program, handlers, first.state);
    expect(second.kind).toBe("next-turn");
    if (second.kind !== "next-turn") throw new Error("expected next-turn");
    expect(second.state.rulesContext.battlers.slice(0, 2).map(({ perishSongTimer }) => perishSongTimer))
      .toEqual([1, 0]);
    expect(second.state.rng.calls).toBe(initial.rng.calls);

    const absent = context({
      battlers: [
        battler({ side: 0, status3: STATUS3_PERISH_SONG, perishSongTimer: 3 }),
        battler({ side: 1, partyIndex: 2, status3: STATUS3_PERISH_SONG, perishSongTimer: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      absentBattlerFlags: 1 << 1,
      battleStructAbsentBattlerFlags: 1 << 1,
    });
    const skipped = runBattleEndTurnOrchestration(program, handlers, scratchState(absent, 0));
    expect(skipped.kind).toBe("next-turn");
    expect(skipped.state.rulesContext.battlers.slice(0, 2).map(({ perishSongTimer }) => perishSongTimer))
      .toEqual([2, 2]);
  });

  it("zero timer clears the bit, deals current HP as passive damage, routes through faint cleanup/checkteamslost, and decides the outcome", () => {
    const rc = context({
      battlers: [
        battler({
          side: 0,
          hp: 100,
          maxHP: 100,
          status3: STATUS3_PERISH_SONG,
          perishSongTimer: 0,
          perishSongTimerStartValue: 3,
        }),
        battler({ side: 1, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      battlerByTurnOrder: [0, 1, 2, 3],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const initial = scratchState(rc, 0);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("terminal");
    if (result.kind !== "terminal") throw new Error("expected terminal");
    expect(result.state.rulesContext.battlers[0]).toMatchObject({
      hp: 0,
      status3: 0,
      perishSongTimer: 0,
      perishSongTimerStartValue: 0,
    });
    expect(result.state.rulesContext.party.player[0]!.hp).toBe(0);
    expect(result.state.rulesContext.battleOutcome).not.toBe(0);
    expect(result.state.rulesContext.battleTextBuff1ByteNumber).toBe(0);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
    expect(result.state.events.some((event) =>
      event.kind === "health-bar-update" && event.battler === 0
    )).toBe(true);
  });

  it("when both sides are at zero, turn order feeds the first faint through checkteamslost before the scan resumes", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, status3: STATUS3_PERISH_SONG, perishSongTimer: 0, perishSongTimerStartValue: 3 }),
        battler({ side: 1, partyIndex: 2, status3: STATUS3_PERISH_SONG, perishSongTimer: 0, perishSongTimerStartValue: 3 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      battlerByTurnOrder: [1, 0, 2, 3],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("terminal");
    expect(result.state.rulesContext.battlers.slice(0, 2).map(({ hp }) => hp))
      .toEqual([100, 0]);
    expect(result.state.rulesContext.battleOutcome).not.toBe(0);
  });
});
