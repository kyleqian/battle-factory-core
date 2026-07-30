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
import { advanceBattleScriptAttackCancelerUnableToUseMove } from "../src/engine/battleScriptAttackCanceler.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import type { BattleScriptSemanticEvent } from "../src/engine/battleScriptEvents.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";
import {
  calculateBaseDamage,
  NEUTRAL_STAT_STAGES,
} from "../src/engine/damageCalc.ts";
import { effectiveSpeed } from "../src/engine/turnOrder.ts";

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const ITEM_CHESTO_BERRY = 134;
const ITEM_LUM_BERRY = 141;
const ITEM_SITRUS_BERRY = 142;
const ITEM_LEFTOVERS = 200;
const MOVE_SWORDS_DANCE = 14;
const MOVE_FORESIGHT = 193;
const MOVE_SWAGGER = 207;
const MOVE_THUNDER_WAVE = 86;
const MOVE_THUNDER = 87;
const MOVE_WILL_O_WISP = 261;
const ABILITY_OWN_TEMPO = 20;
const ABILITY_SAND_VEIL = 8;
const STATUS1_SLEEP_TURN_3 = 3;
const STATUS2_CONFUSION_TURN_2 = 2;
const STATUS2_NIGHTMARE = 1 << 27;
const STATUS2_INFATUATED_BY_BATTLER_1 = 1 << 17;
const ATTACK_CANCELER_PC = 0x0800_1234;

function battler(
  changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([33, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function partySlot(species: number, hp: number): BattleScriptPartyMemberInput {
  return { species, isEgg: false, hp };
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = {
  species: 0,
  isEgg: false,
  hp: 0,
};

function endTurnContext(
  item: number,
  hp: number,
  weather: number,
  activeChanges: Partial<BattleScriptRulesBattler> = {},
): ReturnType<typeof createBattleScriptRulesContext> {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        hp,
        maxHP: 160,
        item,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
        ...activeChanges,
      }),
      battler({
        side: 1,
        species: 74,
        hp: 160,
        maxHP: 160,
        types: ["TYPE_ROCK", "TYPE_GROUND"],
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
    weatherTimer: weather === 0 ? 0 : 5,
    battlerByTurnOrder: [0, 1, 2, 3],
    party: {
      player: [partySlot(1, hp), EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      opponent: [partySlot(74, 160), EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  } satisfies BattleScriptRulesContextInput);
}

const ports = Object.freeze({
  isControllerIdle: (context) =>
    context.state.scheduler.pendingControllerBattlers.length === 0,
  prepareMessage: (_context, operand) =>
    operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
      : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => 0 as const,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
  resolveByteOperand: () => null,
} satisfies BattleScriptStatusRulesExternalPorts);

const completeEffectPorts = Object.freeze({
  ...ports,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression === "B_WAIT_TIME_LONG"
      || operand.expression === "B_WAIT_TIME_SHORT"
      ? 1
      : null,
}) satisfies BattleScriptStatusRulesExternalPorts;

function runEndTurn(
  item: number,
  hp: number,
  weather: number,
  activeChanges: Partial<BattleScriptRulesBattler> = {},
) {
  const rulesContext = endTurnContext(item, hp, weather, activeChanges);
  const initial = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    0x1234_5678,
    ports,
  ).state;
  const result = runBattleEndTurnOrchestration(
    program,
    createBattleScriptStatusRulesHandlers(program, ports),
    initial,
  );
  if (result.kind !== "next-turn") {
    throw new Error(`K1 end-turn pass stopped at ${result.kind}`);
  }
  return result.state;
}

function hpChangesForBattler(
  events: readonly BattleScriptSemanticEvent[],
  battlerId: number,
) {
  return events.flatMap((event) =>
    event.kind === "hp-change" && event.battler === battlerId
      ? [{ from: event.from, to: event.to }]
      : []
  );
}

/** Modular inverse of ISO_RANDOMIZE1's multiplier (1103515245) mod 2**32. */
const RNG_MULTIPLIER_INVERSE = 4005161829n;
const RNG_MOD = 1n << 32n;

function rngValueBeforeU16(targetU16: number): number {
  const after = BigInt(targetU16) * 65536n;
  const before = (
    (((after - 24691n) % RNG_MOD + RNG_MOD) % RNG_MOD
      * RNG_MULTIPLIER_INVERSE)
    % RNG_MOD
  );
  return Number(before);
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`missing Battle Script label ${label}`);
  return entry.programCounter;
}

function accuracyContext(
  weather: number,
  accuracyDelta: -2 | 0 | 2,
): ReturnType<typeof createBattleScriptRulesContext> {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        moves: [MOVE_THUNDER, 0, 0, 0],
        pp: [10, 0, 0, 0],
        statStages: [6, 6, 6, 6, 6, 6, 6 + accuracyDelta, 6],
      }),
      battler({
        side: 1,
        ability: weather === B_WEATHER_SANDSTORM_TEMPORARY
          ? ABILITY_SAND_VEIL
          : 0,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_THUNDER,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function stepAccuracy(
  weather: number,
  accuracyDelta: -2 | 0 | 2,
  nextRandomU16: number,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromAccCheck",
    accuracyContext(weather, accuracyDelta),
    rngValueBeforeU16(nextRandomU16),
    ports,
  );
  const result = stepBattleScriptMachine(
    program,
    execution.state,
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`K2 accuracy script stopped at ${result.kind}`);
  }
  return result.state;
}

function cancelerContext(
  status1: number,
  status2: number,
): ReturnType<typeof createBattleScriptRulesContext> {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, status1, status2 }),
      battler({ side: 1 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function runCanceler(status1: number, status2: number, rngValue: number) {
  return advanceBattleScriptAttackCancelerUnableToUseMove(
    Object.freeze({
      rulesContext: cancelerContext(status1, status2),
      rngValue,
      rngCallsConsumed: 0,
    }),
    ATTACK_CANCELER_PC,
  );
}

function cancelerPhaseNames(
  result: ReturnType<typeof advanceBattleScriptAttackCancelerUnableToUseMove>,
) {
  return result.receipt.phases.map((phase) => phase.receipt.sourcePhase);
}

function effectContext(
  move: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        moves: [move, 0, 0, 0],
        pp: [20, 0, 0, 0],
        ...attackerChanges,
      }),
      battler({ side: 1, ...targetChanges }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function runCompleteEffect(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    entryLabel,
    rulesContext,
    rngSeed,
    completeEffectPorts,
  );
  let result = stepBattleScriptMachine(
    program,
    execution.state,
    execution.handlers,
  );
  for (let steps = 1; steps < 250 && result.kind !== "halted"; steps++) {
    if (
      result.kind !== "advanced"
      && result.kind !== "scheduler-progressed"
      && result.kind !== "blocked"
    ) {
      throw new Error(`${entryLabel} stopped at ${result.kind}`);
    }
    let next = result.state;
    if (result.kind === "blocked") {
      for (const battlerId of next.scheduler.pendingControllerBattlers) {
        next = acknowledgeBattleScriptMachineController(next, battlerId);
      }
    }
    result = stepBattleScriptMachine(program, next, execution.handlers);
  }
  if (result.kind !== "halted") {
    throw new Error(`${entryLabel} did not finish within the step budget`);
  }
  return result.state;
}

const K4_DAMAGE_DEFENDER = Object.freeze({
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  statStages: { ...NEUTRAL_STAT_STAGES },
});

function k4PhysicalDamage(attackStage: number, isBurned: boolean): number {
  return calculateBaseDamage({
    attacker: {
      ...K4_DAMAGE_DEFENDER,
      statStages: { ...NEUTRAL_STAT_STAGES, atk: attackStage },
      isBurned,
    },
    defender: K4_DAMAGE_DEFENDER,
    movePower: 50,
    moveType: "TYPE_NORMAL",
    isCriticalHit: false,
  });
}

function k5AccuracyContext(
  accuracyStage: number,
  evasionStage: number,
  targetStatus2: number,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        moves: [33, 0, 0, 0],
        statStages: [6, 6, 6, 6, 6, 6, accuracyStage, 6],
      }),
      battler({
        side: 1,
        status2: targetStatus2,
        statStages: [6, 6, 6, 6, 6, 6, 6, evasionStage],
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function stepK5Accuracy(
  accuracyStage: number,
  evasionStage: number,
  targetStatus2: number,
  nextRandomU16: number,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HitFromAccCheck",
    k5AccuracyContext(accuracyStage, evasionStage, targetStatus2),
    rngValueBeforeU16(nextRandomU16),
    ports,
  );
  const result = stepBattleScriptMachine(
    program,
    execution.state,
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`K5 accuracy script stopped at ${result.kind}`);
  }
  return result.state;
}

describe("Gate-6 K1 weather × held-item end-turn ordering", () => {
  it("finishes sand chip before Leftovers heals, while the no-weather control performs only the heal", () => {
    const sand = runEndTurn(
      ITEM_LEFTOVERS,
      100,
      B_WEATHER_SANDSTORM_TEMPORARY,
    );
    expect(hpChangesForBattler(sand.events, 0)).toEqual([
      { from: 100, to: 90 },
      { from: 90, to: 100 },
    ]);
    expect(sand.rulesContext.battlers[0]).toMatchObject({
      hp: 100,
      item: ITEM_LEFTOVERS,
    });
    expect(sand.rulesContext.party.player[0]?.hp).toBe(100);

    const clear = runEndTurn(ITEM_LEFTOVERS, 100, 0);
    expect(hpChangesForBattler(clear.events, 0)).toEqual([
      { from: 100, to: 110 },
    ]);
    expect(clear.rulesContext.battlers[0].hp).toBe(110);
  });

  it("lets weather chip cross Sitrus's half-HP gate before the item pass; without weather the berry stays dormant", () => {
    const sand = runEndTurn(
      ITEM_SITRUS_BERRY,
      85,
      B_WEATHER_SANDSTORM_TEMPORARY,
    );
    expect(hpChangesForBattler(sand.events, 0)).toEqual([
      { from: 85, to: 75 },
      { from: 75, to: 105 },
    ]);
    expect(sand.rulesContext.battlers[0]).toMatchObject({
      hp: 105,
      item: 0,
    });
    expect(sand.rulesContext.party.player[0]?.hp).toBe(105);

    const clear = runEndTurn(ITEM_SITRUS_BERRY, 85, 0);
    expect(hpChangesForBattler(clear.events, 0)).toEqual([]);
    expect(clear.rulesContext.battlers[0]).toMatchObject({
      hp: 85,
      item: ITEM_SITRUS_BERRY,
    });
  });
});

describe("Gate-6 K2 weather × accuracy-stage arithmetic", () => {
  it.each([
    ["sun", B_WEATHER_SUN_TEMPORARY, -2, 30],
    ["sun", B_WEATHER_SUN_TEMPORARY, 0, 50],
    ["sun", B_WEATHER_SUN_TEMPORARY, 2, 83],
    ["sand", B_WEATHER_SANDSTORM_TEMPORARY, -2, 33],
    ["sand", B_WEATHER_SANDSTORM_TEMPORARY, 0, 56],
    ["sand", B_WEATHER_SANDSTORM_TEMPORARY, 2, 92],
  ] as const)(
    "%s at accuracy stage %+i applies the stage ratio before its weather/ability boundary, yielding %i",
    (_name, weather, stage, expectedAccuracy) => {
      const boundaryHit = stepAccuracy(weather, stage, expectedAccuracy - 1);
      expect(boundaryHit.programCounter).toBe(
        labelPc("BattleScript_HitFromAtkString"),
      );
      expect(boundaryHit.rulesContext.moveResultFlags & 1).toBe(0);
      expect(boundaryHit.rng.calls).toBe(1);

      const firstMiss = stepAccuracy(weather, stage, expectedAccuracy);
      expect(firstMiss.programCounter).toBe(
        labelPc("BattleScript_PrintMoveMissed"),
      );
      expect(firstMiss.rulesContext.moveResultFlags & 1).toBe(1);
      expect(firstMiss.rng.calls).toBe(1);
    },
  );

  it.each([-2, 0, 2] as const)(
    "rain Thunder bypasses the ordinary stage-%+i accuracy roll entirely",
    (stage) => {
      const state = stepAccuracy(
        B_WEATHER_RAIN_TEMPORARY,
        stage,
        99,
      );
      expect(state.programCounter).toBe(
        labelPc("BattleScript_HitFromAtkString"),
      );
      expect(state.rulesContext.moveResultFlags & 1).toBe(0);
      expect(state.rng.calls).toBe(0);
    },
  );
});

describe("Gate-6 K3 status × volatile ordering", () => {
  it.each([
    ["Chesto", ITEM_CHESTO_BERRY],
    ["Lum", ITEM_LUM_BERRY],
  ] as const)(
    "%s's complete end-turn item script cures sleep and its coupled Nightmare bit without clearing independent infatuation",
    (_name, item) => {
      const state = runEndTurn(item, 100, 0, {
        status1: STATUS1_SLEEP_TURN_3,
        status2: STATUS2_NIGHTMARE | STATUS2_INFATUATED_BY_BATTLER_1,
      });
      expect(state.rulesContext.battlers[0]).toMatchObject({
        item: 0,
        status1: 0,
        status2: STATUS2_INFATUATED_BY_BATTLER_1,
      });
      expect(state.rulesContext.party.player[0]?.status1).toBe(0);
      expect(state.events).toContainEqual(
        expect.objectContaining({
          kind: "set-battler-item",
          battler: 0,
          item: 0,
        }),
      );
    },
  );

  it("orders confusion before paralysis before infatuation and threads only the draws reached after each resumable gate", () => {
    const first = runCanceler(
      BATTLE_SCRIPT_STATUS1_PARALYSIS,
      STATUS2_CONFUSION_TURN_2 | STATUS2_INFATUATED_BY_BATTLER_1,
      3,
    );
    expect(cancelerPhaseNames(first).at(-1)).toBe("CANCELER_CONFUSED");
    expect(cancelerPhaseNames(first)).not.toContain("CANCELER_PARALYZED");
    expect(cancelerPhaseNames(first)).not.toContain("CANCELER_IN_LOVE");
    expect(first).toMatchObject({
      effect: 1,
      rngValue: 3310570426,
      rngCallsConsumed: 1,
      rulesContext: { atkCancelerTracker: 10 },
      receipt: {
        rng: {
          before: 3,
          after: 3310570426,
          callsConsumed: 1,
        },
      },
    });
    expect(
      first.rulesContext.battlers[0].status1
      & BATTLE_SCRIPT_STATUS1_PARALYSIS,
    ).not.toBe(0);
    expect(
      first.rulesContext.battlers[0].status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION,
    ).not.toBe(0);

    const resumed = advanceBattleScriptAttackCancelerUnableToUseMove(
      first,
      ATTACK_CANCELER_PC,
    );
    expect(cancelerPhaseNames(resumed)).toEqual([
      "CANCELER_PARALYZED",
      "CANCELER_IN_LOVE",
    ]);
    expect(resumed).toMatchObject({
      effect: 1,
      rngValue: 3555356340,
      rngCallsConsumed: 3,
      rulesContext: { atkCancelerTracker: 12 },
      receipt: {
        rng: {
          before: 3310570426,
          after: 3555356340,
          callsBefore: 1,
          callsAfter: 3,
          callsConsumed: 2,
        },
      },
    });
    expect(resumed.receipt.phases[0]?.receipt).toMatchObject({
      sourcePhase: "CANCELER_PARALYZED",
      rng: {
        before: 3310570426,
        after: 828787365,
        modulo: 2,
      },
      effect: 0,
    });
    expect(resumed.receipt.phases[1]?.receipt).toMatchObject({
      sourcePhase: "CANCELER_IN_LOVE",
      rng: {
        before: 828787365,
        after: 3555356340,
        lowBit: 0,
      },
      effect: 1,
    });
  });

  it("a paralysis early-out consumes its one draw and skips infatuation's draw without clearing that volatile", () => {
    const result = runCanceler(
      BATTLE_SCRIPT_STATUS1_PARALYSIS,
      STATUS2_INFATUATED_BY_BATTLER_1,
      rngValueBeforeU16(0),
    );
    expect(cancelerPhaseNames(result).at(-1)).toBe("CANCELER_PARALYZED");
    expect(cancelerPhaseNames(result)).not.toContain("CANCELER_IN_LOVE");
    expect(result).toMatchObject({
      effect: 1,
      rngCallsConsumed: 1,
      rulesContext: { atkCancelerTracker: 11 },
      receipt: { rng: { callsConsumed: 1 } },
    });
    expect(
      result.rulesContext.battlers[0].status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION,
    ).not.toBe(0);
  });
});

describe("Gate-6 K4 status × stat-stage arithmetic", () => {
  it.each([
    [
      "burn",
      MOVE_WILL_O_WISP,
      "BattleScript_EffectWillOWisp",
      BATTLE_SCRIPT_STATUS1_BURN,
    ],
    [
      "paralysis",
      MOVE_THUNDER_WAVE,
      "BattleScript_EffectParalyze",
      BATTLE_SCRIPT_STATUS1_PARALYSIS,
    ],
  ] as const)(
    "applying %s through its complete effect script sets status without mutating any staged stat",
    (_name, move, entryLabel, expectedStatus) => {
      const stages = Object.freeze([6, 8, 4, 9, 3, 11, 5, 10]);
      const state = runCompleteEffect(
        entryLabel,
        effectContext(move, {}, { statStages: stages }),
        rngValueBeforeU16(0),
      );
      expect(state.haltReason).toMatchObject({
        kind: "terminal",
        opcodeName: "B_SCR_OP_END",
      });
      expect(state.rulesContext.battlers[1]).toMatchObject({
        status1: expectedStatus,
        statStages: stages,
      });
    },
  );

  it("burn halves physical damage after the Attack-stage modifier, including the +2 Attack combination", () => {
    expect(k4PhysicalDamage(6, false)).toBe(24);
    expect(k4PhysicalDamage(6, true)).toBe(13);
    expect(k4PhysicalDamage(8, false)).toBe(46);
    expect(k4PhysicalDamage(8, true)).toBe(24);
  });

  it("paralysis quarters speed after the Speed-stage modifier, including the +2 Speed combination", () => {
    expect(effectiveSpeed({
      speed: 101,
      speedStage: 6,
      movePriority: 0,
      isParalyzed: false,
    })).toBe(101);
    expect(effectiveSpeed({
      speed: 101,
      speedStage: 6,
      movePriority: 0,
      isParalyzed: true,
    })).toBe(25);
    expect(effectiveSpeed({
      speed: 101,
      speedStage: 8,
      movePriority: 0,
      isParalyzed: false,
    })).toBe(202);
    expect(effectiveSpeed({
      speed: 101,
      speedStage: 8,
      movePriority: 0,
      isParalyzed: true,
    })).toBe(50);
  });

  it.each([
    [10, 12],
    [11, 12],
    [12, 12],
  ] as const)(
    "the independent Swords Dance stage mutation clamps Attack %i + 2 to %i",
    (initialAttackStage, expectedAttackStage) => {
      const state = runCompleteEffect(
        "BattleScript_EffectAttackUp2",
        effectContext(MOVE_SWORDS_DANCE, {
          statStages: [6, initialAttackStage, 6, 6, 6, 6, 6, 6],
        }),
      );
      expect(state.rulesContext.battlers[0].statStages[1]).toBe(
        expectedAttackStage,
      );
    },
  );
});

describe("Gate-6 K5 volatile × stat-stage interactions", () => {
  it("Swagger's complete effect applies confusion and exactly one +2 Attack mutation", () => {
    const state = runCompleteEffect(
      "BattleScript_EffectSwagger",
      effectContext(MOVE_SWAGGER),
    );
    expect(state.rulesContext.battlers[1].status2 & 0x7).not.toBe(0);
    expect(state.rulesContext.battlers[1].statStages[1]).toBe(8);
    expect(
      state.events.filter((event) => event.kind === "stat-stage-change"),
    ).toEqual([
      expect.objectContaining({
        battler: 1,
        stat: "attack",
        from: 6,
        to: 8,
      }),
    ]);
  });

  it("Swagger raises an Own Tempo target's Attack once before the ability rejects confusion", () => {
    const state = runCompleteEffect(
      "BattleScript_EffectSwagger",
      effectContext(MOVE_SWAGGER, {}, { ability: ABILITY_OWN_TEMPO }),
    );
    expect(state.rulesContext.battlers[1]).toMatchObject({
      ability: ABILITY_OWN_TEMPO,
      status2: 0,
    });
    expect(state.rulesContext.battlers[1].statStages[1]).toBe(8);
    expect(
      state.events.filter((event) => event.kind === "stat-stage-change"),
    ).toEqual([
      expect.objectContaining({
        battler: 1,
        stat: "attack",
        from: 6,
        to: 8,
      }),
    ]);
    expect(state.rng.calls).toBe(1);
  });

  it("Foresight's complete effect makes accuracy ignore target EVASION only, while the attacker's lowered ACCURACY still sets the hit boundary", () => {
    const foresight = runCompleteEffect(
      "BattleScript_EffectForesight",
      effectContext(MOVE_FORESIGHT, {}, {
        statStages: [6, 6, 6, 6, 6, 6, 6, 12],
      }),
      rngValueBeforeU16(0),
    );
    const targetStatus2 = foresight.rulesContext.battlers[1].status2;
    expect(targetStatus2 & BATTLE_SCRIPT_STATUS2_FORESIGHT).not.toBe(0);
    expect(foresight.rulesContext.battlers[1].statStages[7]).toBe(12);

    const withoutForesight = stepK5Accuracy(4, 12, 0, 40);
    expect(withoutForesight.programCounter).toBe(
      labelPc("BattleScript_PrintMoveMissed"),
    );

    const ignoredEvasion = stepK5Accuracy(4, 12, targetStatus2, 40);
    expect(ignoredEvasion.programCounter).toBe(
      labelPc("BattleScript_HitFromAtkString"),
    );

    // Tackle's 95 base accuracy at stage -2 is floor(95 * 60 / 100) = 57.
    const boundaryHit = stepK5Accuracy(4, 12, targetStatus2, 56);
    expect(boundaryHit.programCounter).toBe(
      labelPc("BattleScript_HitFromAtkString"),
    );
    const firstMiss = stepK5Accuracy(4, 12, targetStatus2, 57);
    expect(firstMiss.programCounter).toBe(
      labelPc("BattleScript_PrintMoveMissed"),
    );

    const neutralEvasionSameBoundary = stepK5Accuracy(
      4,
      6,
      targetStatus2,
      57,
    );
    expect(neutralEvasionSameBoundary.programCounter).toBe(
      labelPc("BattleScript_PrintMoveMissed"),
    );
  });
});
