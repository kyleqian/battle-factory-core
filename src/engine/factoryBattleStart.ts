/**
 * Fresh Battle Factory singles lifecycle through the first player command.
 *
 * Source order is BattleStartClearSetData -> intro/controller party loads ->
 * TryDoEventsBeforeFirstTurn (battle_main.c:3019-3149, 3841-3929). The live
 * Scene-OFF receipt in docs/facility-round-loop-scout.md §4.1 proves draw A
 * at BattleStartClearSetData+0x29b and draw B at
 * TryDoEventsBeforeFirstTurn+0x26f, with B overwriting A before selection.
 */
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../data/gen/species-types.json" with { type: "json" };
import type { BattleKernelSemanticEvent, BattleState } from "./battleDecisionBoundary.ts";
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  createBattleScriptStatusRulesExecution,
  createBattleScriptRulesContext,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
  type BattleScriptPartyMemberState,
  type BattleScriptPartyState,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesBattlers,
} from "./battleScriptRulesContext.ts";
import {
  ABILITY_SYMBOLS,
} from "./battleScriptSwitchinOpcode.ts";
import {
  createFactoryEmptyBattlerState,
  createFactoryFullTurnBattleStateFromRulesContext,
  FACTORY_RUN_AWAY_NOOP_INVARIANT,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import { randomU16 } from "./opponentGen.ts";
import { effectiveSpeed } from "./turnOrder.ts";

const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const BATTLE_START_HOOK_ABILITIES = new Set([2, 13, 22, 36, 45, 59, 70, 77]);
/** ITEM_WHITE_HERB; ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN). */
const ITEM_WHITE_HERB = 180;
const INTIMIDATE_ID = 22;
const TRACE_ID = 36;
const STATUS3_INTIMIDATE_POKES = 1 << 19;
const STATUS3_TRACE = 1 << 20;
const program = loadBattleScriptProgram();
const switchineffectsProgramCounter = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_SWITCHINEFFECTS",
)?.programCounter;
if (switchineffectsProgramCounter === undefined) {
  throw new Error("committed Battle Script program has no B_SCR_OP_SWITCHINEFFECTS");
}
const SWITCHINEFFECTS_PC: number = switchineffectsProgramCounter;

type SpeciesStatsRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
type SpeciesTypesRow = Readonly<{ types: readonly [string, string] }>;
type HeldItemRow = Readonly<{
  itemId: number;
  holdEffect: string;
  holdEffectParam: number;
}>;

const SPECIES_STATS_BY_ID = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesStatsRow[]).map((row) => [row.id, row]),
);
const SPECIES_TYPES = speciesTypesData.species as unknown as readonly SpeciesTypesRow[];
const ABILITY_ID_BY_SYMBOL = new Map(ABILITY_SYMBOLS.map((symbol, id) => [symbol, id]));
const HELD_ITEM_BY_ID = new Map(
  (frontierHeldItemsData.entries as readonly HeldItemRow[]).map((row) => [row.itemId, row]),
);

/** SaveBlock2's `optionsBattleSceneOff` projected at BattleStartClearSetData. */
export type FactoryBattleScene = "on" | "off";

export type FactoryFreshBattleConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  /**
   * BattleStartClearSetData clears gHitMarker and then derives
   * HITMARKER_NO_ANIMATIONS from this option exactly once
   * (battle_main.c:3080-3091). It is presentation-only after this seam.
   */
  battleScene: FactoryBattleScene;
  /**
   * Source-owned draws between the supplied facility cursor and
   * BattleStartClearSetData. Anchor adapters may pin this from live RAM;
   * ordinary generated battles begin directly at the battle-start kernel.
   */
  preCommandRngCalls?: number;
  playerParty: BattleScriptPartyState;
  opponentParty: BattleScriptPartyState;
}>;

export type FactoryFreshBattleStart = BattleState<FactoryFullTurnDecisionRules>;

export type FactoryFreshBattleInitialization = Readonly<{
  kind: "started";
  state: BattleState<FactoryFullTurnDecisionRules>;
  events: readonly BattleKernelSemanticEvent[];
}>;

function activeFromParty(
  side: 0 | 1,
  member: BattleScriptPartyMemberState,
): BattleScriptRulesBattlerState {
  const stats = SPECIES_STATS_BY_ID.get(member.species);
  if (member.abilityNum !== 0 && member.abilityNum !== 1) {
    throw new Error(`fresh Factory active ability slot must be 0 or 1, got ${member.abilityNum}`);
  }
  const abilitySymbol = stats?.abilities[member.abilityNum];
  const ability = abilitySymbol === undefined ? undefined : ABILITY_ID_BY_SYMBOL.get(abilitySymbol);
  const types = SPECIES_TYPES[member.species - 1]?.types;
  if (ability === undefined || types === undefined) {
    throw new Error(
      `fresh Factory active species ${member.species}/ability slot ${member.abilityNum} is unresolved`,
    );
  }
  return Object.freeze({
    ...createFactoryEmptyBattlerState(side),
    ability,
    ivs: member.ivs,
    isEgg: member.isEgg,
    abilityNum: member.abilityNum,
    experience: member.experience,
    ppBonuses: member.ppBonuses,
    species: member.species,
    personality: member.personality,
    attack: member.attack,
    defense: member.defense,
    speed: member.speed,
    spAttack: member.spAttack,
    spDefense: member.spDefense,
    level: member.level,
    friendship: member.friendship,
    hp: member.hp,
    maxHP: member.maxHP,
    status1: member.status1,
    item: member.item,
    moves: member.moves,
    pp: member.pp,
    types,
    statStages: NEUTRAL_STAT_STAGES,
    partyIndex: 0,
    // BattleStartClearSetData writes 2; pre-selection TurnValuesCleanUp(FALSE)
    // decrements it once at battle_main.c:4875-4876.
    isFirstTurn: 1,
  });
}

function preHookEffectiveSpeed(
  battler: BattleScriptRulesBattlerState,
  randomTurnNumber: number,
): number {
  const held = HELD_ITEM_BY_ID.get(battler.item);
  return effectiveSpeed({
    speed: battler.speed,
    speedStage: battler.statStages[3],
    movePriority: 0,
    ability: ABILITY_SYMBOLS[battler.ability] ?? null,
    holdEffect: held?.holdEffect ?? null,
    holdEffectParam: held?.holdEffectParam,
  }, {}, randomTurnNumber);
}

function lifecycleExternalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
        kind: "message" as const,
        messageId: operand.expression,
        substitutions: Object.freeze([]),
      })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (context) => context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
        ? 64
        : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

function acknowledgeControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function runEntryScript(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
): Readonly<{
  rulesContext: BattleScriptRulesContext;
  events: readonly BattleScriptSemanticEvent[];
}> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    entryLabel,
    rulesContext,
    rngSeed,
    lifecycleExternalPorts(),
  );
  let state = execution.state;
  for (let budget = 0; budget < 2_000; budget += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "blocked") {
      const acknowledged = acknowledgeControllers(result.state);
      if (acknowledged === result.state) {
        throw new Error(`${entryLabel} blocked without a controller acknowledgement`);
      }
      state = acknowledged;
      continue;
    }
    if (result.kind === "halted") {
      if (
        result.state.haltReason?.kind !== "terminal"
        && result.state.haltReason?.kind !== "end3"
      ) {
        throw new Error(`${entryLabel} halted at ${JSON.stringify(result.state.haltReason)}`);
      }
      if (result.state.rng.calls !== 0) {
        throw new Error(`${entryLabel} unexpectedly consumed battle RNG`);
      }
      return Object.freeze({
        rulesContext: result.state.rulesContext,
        events: result.state.events,
      });
    }
    if (result.kind === "unsupported") {
      throw new Error(`${entryLabel} reached unsupported opcode ${result.state.haltReason?.kind}`);
    }
    state = result.state;
  }
  throw new Error(`${entryLabel} exceeded its lifecycle instruction budget`);
}

/**
 * Reuses Cmd_switchineffects' already-source-ported ON_SWITCHIN dispatch for
 * weather/Forecast/Cloud Nine/Air Lock, whose ordinary-switch semantics match
 * TryDoEventsBeforeFirstTurn. Intimidate and Trace deliberately do not enter
 * here: battle_main.c:3869-3883 marks both during the ordered scan and resolves
 * them only after every battler's ON_SWITCHIN pass.
 */
function runSharedOnSwitchinDispatch(
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
  battler: 0 | 1,
): Readonly<{
  rulesContext: BattleScriptRulesContext;
  events: readonly BattleScriptSemanticEvent[];
}> {
  const selectedRules = Object.freeze({
    ...rulesContext,
    selectorRoles: Object.freeze({ ...rulesContext.selectorRoles, fainted: battler }),
  });
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    selectedRules,
    rngSeed,
    lifecycleExternalPorts(),
  );
  let state: BattleScriptMachineState<BattleScriptRulesContext> = Object.freeze({
    ...execution.state,
    programCounter: SWITCHINEFFECTS_PC,
  });
  for (let budget = 0; budget < 2_000; budget += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "blocked") {
      const acknowledged = acknowledgeControllers(result.state);
      if (acknowledged === result.state) {
        throw new Error(
          `battle-start ON_SWITCHIN dispatch blocked without acknowledgement: ${
            JSON.stringify({
              instruction: program.instructions[result.state.programCounter]?.opcodeName,
              haltReason: result.state.haltReason,
              scheduler: result.state.scheduler,
            })
          }`,
        );
      }
      state = acknowledged;
      continue;
    }
    if (result.kind === "halted" && result.state.haltReason?.kind === "end3") {
      if (result.state.rng.calls !== 0) {
        throw new Error("battle-start ON_SWITCHIN callback unexpectedly consumed battle RNG");
      }
      return Object.freeze({
        rulesContext: result.state.rulesContext,
        events: result.state.events,
      });
    }
    if (result.kind === "halted" || result.kind === "unsupported") {
      throw new Error(`battle-start ON_SWITCHIN dispatch stopped at ${JSON.stringify(result.state.haltReason)}`);
    }
    state = result.state;
    if (state.programCounter === SWITCHINEFFECTS_PC + 1 && state.callStack.length === 0) {
      if (state.rng.calls !== 0) {
        throw new Error("battle-start ON_SWITCHIN dispatch unexpectedly consumed battle RNG");
      }
      return Object.freeze({ rulesContext: state.rulesContext, events: state.events });
    }
  }
  throw new Error("battle-start ON_SWITCHIN dispatch exceeded its instruction budget");
}

function withStatus3(
  rules: BattleScriptRulesContext,
  battler: 0 | 1,
  status3: number,
): BattleScriptRulesContext {
  const battlers = rules.battlers.map((candidate, index) =>
    index === battler ? Object.freeze({ ...candidate, status3: status3 >>> 0 }) : candidate
  ) as unknown as BattleScriptRulesBattlers;
  return Object.freeze({ ...rules, battlers: Object.freeze(battlers) });
}

function kernelEvents(events: readonly BattleScriptSemanticEvent[]): readonly BattleKernelSemanticEvent[] {
  return Object.freeze(events.map((event, sequence) => {
    const { sequence: _machineSequence, provenance, ...payload } = event;
    return Object.freeze({ sequence, payload: Object.freeze(payload), provenance });
  }));
}

/**
 * Initializes a fresh Factory battle and returns both the durable first
 * command state and the entry scripts' ordered semantic events.
 */
export function initializeFreshFactoryBattle(
  config: FactoryFreshBattleConfig,
): FactoryFreshBattleInitialization {
  const preCommandRngCalls = config.preCommandRngCalls ?? 0;
  if (!Number.isSafeInteger(preCommandRngCalls) || preCommandRngCalls < 0) {
    throw new Error("preCommandRngCalls must be a non-negative safe integer");
  }
  let battleStartRngValue = config.rngSeed >>> 0;
  for (let call = 0; call < preCommandRngCalls; call += 1) {
    battleStartRngValue = randomU16(battleStartRngValue).rngValue;
  }
  // BattleStartClearSetData:3140. The receipt proves this value is overwritten
  // before turn-1 selection but consumed by the pre-hook order sort.
  const drawA = randomU16(battleStartRngValue);
  const player = activeFromParty(0, config.playerParty[0]);
  const opponent = activeFromParty(1, config.opponentParty[0]);
  const playerSpeed = preHookEffectiveSpeed(player, drawA.value);
  const opponentSpeed = preHookEffectiveSpeed(opponent, drawA.value);
  // TryDoEventsBeforeFirstTurn:3850-3861 stable-sorts fastest first through
  // GetWhoStrikesFirst(TRUE). The Scene-OFF receipt in scout §4.1 proves an
  // equal-speed comparison consumes exactly one Random() strictly between A
  // and B; low bit 1 swaps the identity order to [1, 0].
  const tieDraw = playerSpeed === opponentSpeed ? randomU16(drawA.rngValue) : null;
  const rngBeforeB = tieDraw?.rngValue ?? drawA.rngValue;
  const turnOrder = playerSpeed === opponentSpeed
    ? (tieDraw!.value & 1) === 0 ? [0, 1] as const : [1, 0] as const
    : playerSpeed > opponentSpeed ? [0, 1] as const : [1, 0] as const;

  // The context materializes BattleStartClearSetData's tracked clears and the
  // :3895-3921 pre-selection cleanup. Hook mutations are applied to this
  // source-fresh state before draw B.
  let rulesContextBeforeB = createBattleScriptRulesContext({
    battlers: [
      player,
      opponent,
      createFactoryEmptyBattlerState(0),
      createFactoryEmptyBattlerState(1),
    ],
    // BattleStartClearSetData:3073-3074 initializes attacker and target to 0.
    // The effect battler is likewise zero in source-fresh EWRAM here.
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    gBattleEnvironment: BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    // `gHitMarker = 0` followed by the non-link, non-recorded option branch
    // at battle_main.c:3081-3091. Factory singles are neither link nor
    // recorded, so the typed fresh-start option is the entire source input.
    hitMarker: config.battleScene === "off"
      ? BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS
      : 0,
    multiHitCounter: 0,
    moveHistory: {
      lastPrintedMoves: [0, 0, 0, 0],
      lastMoves: [0, 0, 0, 0],
      lastResultingMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitByType: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
      lastTakenMove: new Array<number>(16).fill(0),
      lastTakenMoveFrom: new Array<number>(32).fill(0),
    },
    party: { player: config.playerParty, opponent: config.opponentParty },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_RUN_AWAY_NOOP_INVARIANT.battleTypeFlags,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    absentBattlerFlags: 0,
    weather: 0,
    randomTurnNumber: drawA.value,
  });

  const lifecycleEvents: BattleScriptSemanticEvent[] = [];

  // battle_main.c:3863-3868 calls ABILITYEFFECT_SWITCH_IN_WEATHER once.
  // The Factory battle room map declares WEATHER_NONE and MAP_TYPE_INDOOR
  // (data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json:8-9), which
  // reaches battle_util.c:2493-2524's switch default: no weather, no script.

  // battle_main.c:3869-3879: fastest-to-slowest ON_SWITCHIN scan. Weather and
  // form hooks can yield here; Intimidate/Trace only set completion flags.
  for (const battler of turnOrder) {
    const ability = rulesContextBeforeB.battlers[battler].ability;
    if (ability === INTIMIDATE_ID) {
      rulesContextBeforeB = withStatus3(
        rulesContextBeforeB,
        battler,
        rulesContextBeforeB.battlers[battler].status3 | STATUS3_INTIMIDATE_POKES,
      );
      continue;
    }
    if (ability === TRACE_ID) {
      rulesContextBeforeB = withStatus3(
        rulesContextBeforeB,
        battler,
        rulesContextBeforeB.battlers[battler].status3 | STATUS3_TRACE,
      );
      continue;
    }
    if (BATTLE_START_HOOK_ABILITIES.has(ability)) {
      const dispatched = runSharedOnSwitchinDispatch(rulesContextBeforeB, rngBeforeB, battler);
      rulesContextBeforeB = dispatched.rulesContext;
      lifecycleEvents.push(...dispatched.events);
    }
  }

  // battle_main.c:3880-3883 / battle_util.c:3003-3073: pending Intimidate is
  // battler-index ordered, then pending Trace is battler-index ordered.
  for (const battler of [0, 1] as const) {
    if ((rulesContextBeforeB.battlers[battler].status3 & STATUS3_INTIMIDATE_POKES) === 0) continue;
    rulesContextBeforeB = withStatus3(
      rulesContextBeforeB,
      battler,
      rulesContextBeforeB.battlers[battler].status3 & ~STATUS3_INTIMIDATE_POKES,
    );
    rulesContextBeforeB = Object.freeze({
      ...rulesContextBeforeB,
      scriptingBattler: battler,
      lastUsedAbility: INTIMIDATE_ID,
    });
    const resolved = runEntryScript(
      "BattleScript_IntimidateActivatesEnd3",
      rulesContextBeforeB,
      rngBeforeB,
    );
    rulesContextBeforeB = resolved.rulesContext;
    lifecycleEvents.push(...resolved.events);
  }
  for (const battler of [0, 1] as const) {
    if ((rulesContextBeforeB.battlers[battler].status3 & STATUS3_TRACE) === 0) continue;
    const opposing = battler === 0 ? 1 : 0;
    rulesContextBeforeB = withStatus3(
      rulesContextBeforeB,
      battler,
      rulesContextBeforeB.battlers[battler].status3 & ~STATUS3_TRACE,
    );
    const copiedAbility = rulesContextBeforeB.battlers[opposing].ability;
    if (copiedAbility === 0 || rulesContextBeforeB.battlers[opposing].hp === 0) continue;
    const battlers = rulesContextBeforeB.battlers.map((candidate, index) =>
      index === battler ? Object.freeze({ ...candidate, ability: copiedAbility }) : candidate
    ) as unknown as BattleScriptRulesBattlers;
    rulesContextBeforeB = Object.freeze({
      ...rulesContextBeforeB,
      battlers: Object.freeze(battlers),
      scriptingBattler: battler,
      lastUsedAbility: copiedAbility,
      battleTextBuff1MonNick: Object.freeze({
        battler: opposing,
        partyIndex: rulesContextBeforeB.battlers[opposing].partyIndex,
      }),
    });
    const resolved = runEntryScript("BattleScript_TraceActivates", rulesContextBeforeB, rngBeforeB);
    rulesContextBeforeB = resolved.rulesContext;
    lifecycleEvents.push(...resolved.events);
  }

  // battle_main.c:3884-3894 / battle_util.c:3303-3329: items use the same
  // speed order. Double Prize only writes unread prize bookkeeping. White
  // Herb resets every lowered stage and consumes itself through the shared
  // BattleScript_WhiteHerbEnd2 opcode machinery.
  for (const battler of turnOrder) {
    const active = rulesContextBeforeB.battlers[battler];
    if (active.item !== ITEM_WHITE_HERB || !active.statStages.some((stage) => stage < 6)) continue;
    const battlers = rulesContextBeforeB.battlers.map((candidate, index) =>
      index === battler
        ? Object.freeze({
          ...candidate,
          statStages: Object.freeze(candidate.statStages.map((stage) => stage < 6 ? 6 : stage)),
        })
        : candidate
    ) as unknown as BattleScriptRulesBattlers;
    rulesContextBeforeB = Object.freeze({
      ...rulesContextBeforeB,
      battlers: Object.freeze(battlers),
      scriptingBattler: battler,
    });
    const resolved = runEntryScript("BattleScript_WhiteHerbEnd2", rulesContextBeforeB, rngBeforeB);
    rulesContextBeforeB = resolved.rulesContext;
    lifecycleEvents.push(...resolved.events);
  }

  // TryDoEventsBeforeFirstTurn:3923; this is turn 1's readable global.
  const drawB = randomU16(rngBeforeB);
  const rulesContext = Object.freeze({
    ...rulesContextBeforeB,
    randomTurnNumber: drawB.value,
  });
  const events = kernelEvents(lifecycleEvents);
  const state = createFactoryFullTurnBattleStateFromRulesContext({
    requestId: config.requestId,
    rngSeed: drawB.rngValue,
    rngCalls: preCommandRngCalls + (tieDraw === null ? 2 : 3),
    nextEventSequence: events.length,
    rulesContext,
  });
  return Object.freeze({ kind: "started", state, events });
}

/** Backward-compatible state-only seam used by rung 2 and future battle drivers. */
export function createFreshFactoryBattle(
  config: FactoryFreshBattleConfig,
): FactoryFreshBattleStart {
  const result = initializeFreshFactoryBattle(config);
  return result.state;
}
