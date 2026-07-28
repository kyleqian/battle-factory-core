import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };
import {
  createBattleState,
  submitBattleDecision,
  type BattleDecisionReducer,
  type BattleDecisionSide,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleSinglesBattler,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

const ADAPTER = "factory-asleep-move/v1";
const PLAYER_SET_ID = 15;
const TRAINER_SET_ID = 291;
const PLAYER_ABILITY = 62; // ABILITY_GUTS
const TRAINER_ABILITY = 57; // ABILITY_PLUS
const B_WAIT_TIME_LONG = 64;
const LEVEL_50_SET_MAX = 849;

type FrontierMonRow = Readonly<{
  index: number;
  label: string;
  species: string;
  moves: readonly string[];
  itemTableId: number;
}>;

type FrontierHeldItemRow = Readonly<{
  itemTableId: number;
  itemId: number;
}>;

type MoveRow = Readonly<{
  move: string;
  id: number;
  pp: number;
  target: readonly string[];
}>;

type TopologyMoveRow = Readonly<{
  id: number;
  entryScript: string;
}>;

const FRONTIER_MONS = (frontierMonsData.entries as readonly FrontierMonRow[]);
const FRONTIER_HELD_ITEMS_BY_TABLE_ID = new Map(
  (frontierHeldItemsData.entries as readonly FrontierHeldItemRow[]).map(
    (item) => [item.itemTableId, item],
  ),
);
const MOVES_BY_SYMBOL = new Map(
  (movesData.moves as readonly MoveRow[]).map((move) => [move.move, move]),
);
const TOPOLOGY_BY_MOVE = new Map(
  (topologyData.moves as readonly TopologyMoveRow[]).map((move) => [move.id, move]),
);
const PROGRAM = loadBattleScriptProgram();
const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const ZERO_STAT_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

export type FactoryAsleepMoveConfig = Readonly<{
  playerSetId: number;
  trainerSetId: number;
  commandSide: BattleDecisionSide;
  playerHp: number;
  trainerHp: number;
  sleepTurns: number;
  rngSeed: number;
  requestId: number;
}>;

export type FactoryBattleScriptDecisionRules = BattleJsonObject & Readonly<{
  adapter: typeof ADAPTER;
  phase: "awaiting-command" | "move-end-barrier" | "script-complete";
  factory: Readonly<{
    level: 50;
    playerSetId: number;
    trainerSetId: number;
    playerSpecies: string;
    trainerSpecies: string;
  }>;
  selectedMove: null | Readonly<{
    slot: number;
    moveId: number;
    entryScript: string;
  }>;
  rulesContext: BattleScriptRulesContext;
}>;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} must have exactly keys ${expected.join(", ")}`);
  }
}

function requireInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value)
    || Number(value) < minimum
    || Number(value) > maximum
  ) {
    throw new Error(`${label} must be an integer in ${minimum}..${maximum}`);
  }
  return Number(value);
}

function frontierSet(setId: number, label: string): FrontierMonRow {
  const row = FRONTIER_MONS[setId];
  if (
    setId > LEVEL_50_SET_MAX
    || !row
    || row.index !== setId
    || row.moves.length !== 4
  ) {
    throw new Error(`${label} must identify a complete Level-50 Factory set`);
  }
  return row;
}

function sourceMoves(row: FrontierMonRow): readonly MoveRow[] {
  return Object.freeze(row.moves.map((symbol) => {
    const move = MOVES_BY_SYMBOL.get(symbol);
    if (!move) throw new Error(`${row.label} references unknown move ${symbol}`);
    return move;
  }));
}

function sourceHeldItem(row: FrontierMonRow): number {
  const heldItem = FRONTIER_HELD_ITEMS_BY_TABLE_ID.get(row.itemTableId);
  if (!heldItem) {
    throw new Error(`${row.label} references unknown held-item table row ${row.itemTableId}`);
  }
  return heldItem.itemId;
}

function battlerForSide(side: BattleDecisionSide): BattleSinglesBattler {
  return side === "player" ? 0 : 1;
}

function commandSideAt(value: unknown): BattleDecisionSide {
  if (value !== "player" && value !== "trainer") {
    throw new Error("commandSide must be player or trainer");
  }
  return value;
}

function sourceMoveTarget(
  move: MoveRow,
  attacker: BattleSinglesBattler,
): BattleSinglesBattler {
  if (move.target.length === 1 && move.target[0] === "MOVE_TARGET_USER") {
    return attacker;
  }
  if (move.target.length === 1 && move.target[0] === "MOVE_TARGET_SELECTED") {
    return attacker === 0 ? 1 : 0;
  }
  throw new Error(
    `${move.move} has unsupported staged singles target ${move.target.join("|")}`,
  );
}

function emptyBattler(side: 0 | 1): BattleScriptRulesBattlerState {
  return Object.freeze({
    side,
    ability: 0,
    hp: 0,
    item: 0,
    moves: Object.freeze([0, 0, 0, 0] as const),
    pp: Object.freeze([0, 0, 0, 0] as const),
    statStages: ZERO_STAT_STAGES,
    status1: 0,
    status2: 0,
    status3: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0,
      physicalDmg: 0,
      specialDmg: 0,
    }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    encoreTimer: 0,
    encoredMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    targetNotAffected: 0,
    flag2Unknown: 0,
    chargingTurn: 0,
    protected: 0,
    protectUses: 0,
    ppNotAffectedByPressure: 0,
    protectPhysicalDmg: 0,
    protectPhysicalBattlerId: 0,
    protectSpecialDmg: 0,
    protectSpecialBattlerId: 0,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 0,
    personality: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    level: 0,
    friendship: 0,
    partyIndex: 0,
    maxHP: 0,
    speed: 0,
    turnOrderNum: 1,
    wrappedMove: 0,
    wrappedBy: side,
    isFirstTurn: 0,
  });
}

function activeBattler(
  side: 0 | 1,
  ability: number,
  hp: number,
  moves: readonly MoveRow[],
  status1: number,
  item: number,
): BattleScriptRulesBattlerState {
  return Object.freeze({
    ...emptyBattler(side),
    ability,
    hp,
    item,
    moves: Object.freeze(moves.map(({ id }) => id)) as unknown as
      readonly [number, number, number, number],
    pp: Object.freeze(moves.map(({ pp }) => pp)) as unknown as
      readonly [number, number, number, number],
    statStages: NEUTRAL_STAT_STAGES,
    status1,
  });
}

function createInitialRules(config: FactoryAsleepMoveConfig): FactoryBattleScriptDecisionRules {
  const player = frontierSet(config.playerSetId, "playerSetId");
  const trainer = frontierSet(config.trainerSetId, "trainerSetId");
  if (
    player.index !== PLAYER_SET_ID
    || player.label !== "FRONTIER_MON_TYROGUE"
    || trainer.index !== TRAINER_SET_ID
    || trainer.label !== "FRONTIER_MON_PLUSLE_2"
  ) {
    throw new Error(
      "factory asleep adapter currently supports TYROGUE versus PLUSLE_2 only",
    );
  }
  const playerMoves = sourceMoves(player);
  const trainerMoves = sourceMoves(trainer);
  const attacker = battlerForSide(config.commandSide);
  const target = attacker === 0 ? 1 : 0;
  const rulesContext = createBattleScriptRulesContext({
    battlers: [
      activeBattler(
        0,
        PLAYER_ABILITY,
        config.playerHp,
        playerMoves,
        attacker === 0 ? config.sleepTurns : 0,
        sourceHeldItem(player),
      ),
      activeBattler(
        1,
        TRAINER_ABILITY,
        config.trainerHp,
        trainerMoves,
        attacker === 1 ? config.sleepTurns : 0,
        sourceHeldItem(trainer),
      ),
      emptyBattler(0),
      emptyBattler(1),
    ],
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
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
    absentBattlerFlags: 0b1100,
    // Source-explicit neutral move-end ownership. These are intentionally not
    // inferred by opcode 73, which remains unregistered.
    chosenMove: 0,
    choicedMove: [0, 0, 0, 0],
    changedItems: [0, 0, 0, 0],
    battleStructAbsentBattlerFlags: 0b1100,
    dynamicMoveType: 0,
    enigmaBerryHoldEffects: [0, 0, 0, 0],
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags:
        BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      // InitBattleControllers leaves unused singles slots at the source 0xFF.
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
  return Object.freeze({
    adapter: ADAPTER,
    phase: "awaiting-command",
    factory: Object.freeze({
      level: 50,
      playerSetId: player.index,
      trainerSetId: trainer.index,
      playerSpecies: player.species,
      trainerSpecies: trainer.species,
    }),
    selectedMove: null,
    rulesContext,
  }) as FactoryBattleScriptDecisionRules;
}

function configAt(input: FactoryAsleepMoveConfig): FactoryAsleepMoveConfig {
  const config = requireRecord(input, "Factory asleep move config");
  requireExactKeys(
    config,
    [
      "playerSetId",
      "trainerSetId",
      "commandSide",
      "playerHp",
      "trainerHp",
      "sleepTurns",
      "rngSeed",
      "requestId",
    ],
    "Factory asleep move config",
  );
  return Object.freeze({
    playerSetId: requireInteger(config.playerSetId, 0, LEVEL_50_SET_MAX, "playerSetId"),
    trainerSetId: requireInteger(config.trainerSetId, 0, LEVEL_50_SET_MAX, "trainerSetId"),
    commandSide: commandSideAt(config.commandSide),
    playerHp: requireInteger(config.playerHp, 1, 0xffff, "playerHp"),
    trainerHp: requireInteger(config.trainerHp, 1, 0xffff, "trainerHp"),
    sleepTurns: requireInteger(config.sleepTurns, 2, 7, "sleepTurns"),
    rngSeed: requireInteger(config.rngSeed, 0, 0xffff_ffff, "rngSeed"),
    requestId: requireInteger(config.requestId, 0, 0xffff_ffff, "requestId"),
  });
}

export function createFactoryAsleepMoveBattleState(
  input: FactoryAsleepMoveConfig,
): BattleState<FactoryBattleScriptDecisionRules> {
  const config = configAt(input);
  const rules = createInitialRules(config);
  const battler = battlerForSide(config.commandSide);
  const moves = sourceMoves(
    frontierSet(
      battler === 0 ? config.playerSetId : config.trainerSetId,
      `${config.commandSide}SetId`,
    ),
  );
  return createBattleState({
    rules,
    rngSeed: config.rngSeed,
    request: {
      kind: "command",
      requestId: config.requestId,
      side: config.commandSide,
      battler,
      legalDecisions: moves.map(
        (move, moveSlot) => ({
          kind: "use-move" as const,
          moveSlot: moveSlot as 0 | 1 | 2 | 3,
          targetBattler: sourceMoveTarget(move, battler),
        }),
      ),
    },
  }) as BattleState<FactoryBattleScriptDecisionRules>;
}

function rulesAt(input: FactoryBattleScriptDecisionRules): FactoryBattleScriptDecisionRules {
  const rules = requireRecord(input, "Factory asleep move rules");
  requireExactKeys(
    rules,
    ["adapter", "phase", "factory", "selectedMove", "rulesContext"],
    "Factory asleep move rules",
  );
  if (rules.adapter !== ADAPTER) throw new Error(`unsupported battle adapter ${String(rules.adapter)}`);
  if (rules.phase !== "awaiting-command") {
    throw new Error(`factory asleep move decision requires awaiting-command phase`);
  }
  if (rules.selectedMove !== null) {
    throw new Error("awaiting-command phase must not already own a selected move");
  }
  const factory = requireRecord(rules.factory, "Factory asleep move rules.factory");
  requireExactKeys(
    factory,
    [
      "level",
      "playerSetId",
      "trainerSetId",
      "playerSpecies",
      "trainerSpecies",
    ],
    "Factory asleep move rules.factory",
  );
  if (
    factory.level !== 50
    || factory.playerSetId !== PLAYER_SET_ID
    || factory.trainerSetId !== TRAINER_SET_ID
    || factory.playerSpecies !== "SPECIES_TYROGUE"
    || factory.trainerSpecies !== "SPECIES_PLUSLE"
  ) {
    throw new Error("Factory asleep move rules do not match the committed staged singles matchup");
  }
  const context = createBattleScriptRulesContext(
    requireRecord(rules.rulesContext, "Factory asleep move rules.rulesContext") as never,
  );
  const expectedPlayerMoves = sourceMoves(frontierSet(PLAYER_SET_ID, "playerSetId"));
  const expectedTrainerMoves = sourceMoves(frontierSet(TRAINER_SET_ID, "trainerSetId"));
  const attacker = context.selectorRoles.attacker;
  if (attacker !== 0 && attacker !== 1) {
    throw new Error("Factory asleep move rules require a singles attacker");
  }
  const expectedTarget = attacker === 0 ? 1 : 0;
  if (
    context.selectorRoles.target !== expectedTarget
    || context.selectorRoles.effectBattler !== expectedTarget
    || context.scriptingBattler !== attacker
    || context.absentBattlerFlags !== 0b1100
    || context.atkCancelerTracker !== 0
    || context.currentMove !== 0
    || context.battlers[0].side !== 0
    || context.battlers[1].side !== 1
    || context.battlers[0].ability !== PLAYER_ABILITY
    || context.battlers[1].ability !== TRAINER_ABILITY
    || context.battlers[0].moves.some((move, index) => move !== expectedPlayerMoves[index]!.id)
    || context.battlers[1].moves.some((move, index) => move !== expectedTrainerMoves[index]!.id)
    || (context.battlers[attacker].status1 & 7) < 2
    || (context.battlers[expectedTarget].status1 & 7) !== 0
  ) {
    throw new Error("Factory asleep move rules contain an invalid staged singles phase");
  }
  return Object.freeze({
    adapter: ADAPTER,
    phase: "awaiting-command",
    factory: Object.freeze({
      level: 50,
      playerSetId: PLAYER_SET_ID,
      trainerSetId: TRAINER_SET_ID,
      playerSpecies: "SPECIES_TYROGUE",
      trainerSpecies: "SPECIES_PLUSLE",
    }),
    selectedMove: null,
    rulesContext: context,
  }) as FactoryBattleScriptDecisionRules;
}

function acknowledgePendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    const before = next;
    next = acknowledgeBattleScriptMachineController(next, battler);
    if (
      next.rulesContext !== before.rulesContext
      || next.rng !== before.rng
      || next.events !== before.events
      || next.programCounter !== before.programCounter
      || next.callStack !== before.callStack
    ) {
      throw new Error("controller acknowledgement changed Battle Script rules execution");
    }
  }
  return next;
}

function eventPayloads(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  return Object.freeze(state.events.map((event) => {
    const { sequence: _sequence, provenance: _provenance, ...payload } = event;
    return Object.freeze(payload);
  }));
}

export const reduceFactoryAsleepMoveDecision:
BattleDecisionReducer<FactoryBattleScriptDecisionRules> = (
  boundary,
) => {
  const rules = rulesAt(boundary.rules);
  const attacker = rules.rulesContext.selectorRoles.attacker;
  if (
    boundary.request.kind !== "command"
    || attacker === null
    || boundary.request.battler !== attacker
    || boundary.request.side !== (attacker === 0 ? "player" : "trainer")
    || boundary.decision.kind !== "use-move"
  ) {
    throw new Error("factory asleep move adapter requires its active-side use-move command");
  }
  const moveSlot = boundary.decision.moveSlot;
  const moveId = rules.rulesContext.battlers[attacker].moves[moveSlot];
  if (moveId === 0 || rules.rulesContext.battlers[attacker].pp[moveSlot] === 0) {
    throw new Error(`Factory move slot ${moveSlot} is not usable`);
  }
  const topology = TOPOLOGY_BY_MOVE.get(moveId);
  if (!topology) throw new Error(`move ${moveId} has no source Battle Script entry`);
  const moveEntry = resolveBattleScriptLabel(PROGRAM, topology.entryScript);
  const attackCanceler = moveEntry
    ? PROGRAM.instructions[moveEntry.programCounter]
    : undefined;
  if (!moveEntry || attackCanceler?.opcodeId !== 0) {
    throw new Error(`${topology.entryScript} does not start with source opcode 0`);
  }

  const selectedContext = createBattleScriptRulesContext({
    ...rules.rulesContext,
    selectorRoles: {
      attacker,
      target: boundary.decision.targetBattler,
      effectBattler: boundary.decision.targetBattler,
    },
    scriptingBattler: attacker,
    currentMove: moveId,
    currentMovePosition: moveSlot,
    chosenMove: moveId,
  });
  const rngBefore = boundary.rng.snapshot();
  const ports = Object.freeze({
    isControllerIdle: (
      context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
    ) => context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (
      _context: unknown,
      operand: Readonly<{ expression: string }>,
    ) => operand.expression === "STRINGID_PKMNFASTASLEEP"
      ? Object.freeze({
        kind: "message" as const,
        messageId: "STRINGID_PKMNFASTASLEEP",
        substitutions: Object.freeze([
          attacker === 0 ? "TYROGUE" : "PLUSLE",
        ]),
      })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (
      _context: unknown,
      operand: Readonly<{ expression: string }>,
    ) => operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
  const execution = createBattleScriptStatusRulesExecution(
    PROGRAM,
    topology.entryScript,
    selectedContext,
    rngBefore.value,
    ports,
  );
  let machine = execution.state;
  let barrierInstruction = PROGRAM.instructions[machine.programCounter];
  // S10 step (iii) registered opcode 73, so the asleep script (which always
  // reaches BattleScript_MoveEnd) no longer stops there -- it now runs
  // Cmd_moveend genuinely and, on this staged singles turn, all the way to
  // the script's own `end`. That is a second legitimate stopping boundary
  // alongside the original "landed on an unregistered opcode" barrier; both
  // report through the same machine-barrier boundary shape, distinguished by
  // the reported opcode.
  let scriptComplete = false;
  for (let budget = 0; budget < 256; budget += 1) {
    barrierInstruction = PROGRAM.instructions[machine.programCounter];
    if (!barrierInstruction) {
      throw new Error(`Battle Script left the committed program at ${machine.programCounter}`);
    }
    if (!execution.handlers[barrierInstruction.opcodeId]) break;
    const stepped = stepBattleScriptMachine(PROGRAM, machine, execution.handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(machine);
      if (acknowledged === machine) {
        throw new Error(`Battle Script blocked without a safe controller acknowledgement`);
      }
      machine = acknowledged;
      continue;
    }
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      machine = stepped.state;
      scriptComplete = true;
      break;
    }
    if (stepped.kind === "halted" || stepped.kind === "unsupported") {
      throw new Error(`Battle Script stopped before its explicit adapter barrier`);
    }
    machine = acknowledgePendingControllers(stepped.state);
  }
  barrierInstruction = PROGRAM.instructions[machine.programCounter];
  if (!barrierInstruction) {
    throw new Error(`Battle Script left the committed program at ${machine.programCounter}`);
  }
  if (
    !scriptComplete
    && (
      execution.handlers[barrierInstruction.opcodeId]
      || barrierInstruction.opcodeId !== 73
      || barrierInstruction.opcodeName !== "B_SCR_OP_MOVEEND"
      || barrierInstruction.source.label !== "BattleScript_MoveEnd"
    )
  ) {
    throw new Error("Battle Script did not stop at the source Cmd_moveend barrier");
  }
  if (
    machine.rng.calls !== 0
    || machine.rng.value !== rngBefore.value
    || boundary.rng.snapshot().value !== rngBefore.value
    || boundary.rng.snapshot().calls !== rngBefore.calls
    || machine.scheduler.pendingControllerBattlers.length !== 0
  ) {
    throw new Error("Battle Script adapter changed RNG or left a controller unacknowledged");
  }

  return Object.freeze({
    rules: Object.freeze({
      adapter: ADAPTER,
      phase: scriptComplete ? "script-complete" : "move-end-barrier",
      factory: rules.factory,
      selectedMove: Object.freeze({
        slot: moveSlot,
        moveId,
        entryScript: topology.entryScript,
      }),
      rulesContext: machine.rulesContext,
    }) as FactoryBattleScriptDecisionRules,
    events: eventPayloads(machine),
    boundary: Object.freeze({
      kind: "machine-barrier",
      barrier: Object.freeze({
        kind: "battle-script",
        entryLabel: topology.entryScript,
        programCounter: barrierInstruction.programCounter,
        opcodeId: barrierInstruction.opcodeId,
        opcodeName: barrierInstruction.opcodeName,
        dispatcher: barrierInstruction.dispatcher,
        instructionsExecuted: machine.instructionsExecuted,
      }),
    }),
  });
};

export function submitFactoryAsleepMoveDecision(
  state: BattleState<FactoryBattleScriptDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryBattleScriptDecisionRules> {
  return submitBattleDecision(
    state,
    submission,
    reduceFactoryAsleepMoveDecision,
  );
}
