/**
 * PROGRESS #449's own "Next": the composition capstone over everything
 * landed so far -- "decision -> both actions -> end-turn -> next decision
 * boundary," a genuine multi-turn cycle, built directly on
 * `runBattleEndTurnOrchestration` (no re-derivation of the field/battler
 * loop) and reusing the already-registered hit chain from the LITERAL
 * topology entry per move (census precedent, same mechanism
 * `factoryBattleScriptDecision.ts`'s asleep-move adapter already uses).
 *
 * Both sides' decisions enter through the EXISTING submission boundary
 * (`submitBattleDecision` + `BattleCommandRequest`, which already names
 * `side`/`battler`) -- no new shared boundary type. Source collects both
 * battlers' actions before computing turn order
 * (`HandleTurnActionSelectionState` gathers `gChosenActionByBattler[]` for
 * every battler before `SetActionsAndBattlersTurnOrder` ever runs,
 * `battle_main.c:4390-4420`/`:4757-4839`), so this reducer asks the player
 * first, then the trainer (test-supplied -- the AI port is a later step,
 * `docs/factory-ai-ground-truth.md`), and only then resolves the turn.
 *
 * **Action order:** `GetWhoStrikesFirst`/`SetActionsAndBattlersTurnOrder`
 * (`battle_main.c:4595-4839`) ported verbatim already in `turnOrder.ts`
 * (priority bracket, then effective speed, then the speed-tie
 * `Random() & 1` roll at `battle_main.c:4728/4745`) -- reused here, not
 * re-derived. `gBattleMons[].speed` needed a home in
 * `BattleScriptRulesContext` (PROGRESS #449's own named gap); added as a
 * `maxHP`-precedent defaulted field in the same commit as this module.
 *
 * **Second-action skip:** in singles, ANY fainted-actions fork triggered by
 * the first action -- terminal (`gBattleOutcome != 0`) OR the non-terminal
 * forced-switch dance -- cancels the second action, not just the terminal
 * case. Two distinct source mechanisms converge on the same rule:
 *  - Terminal: `RunTurnActionsFunctions` (`battle_main.c:4937-4943`) forces
 *    `gCurrentActionFuncId = B_ACTION_FINISHED` once `gBattleOutcome != 0`,
 *    skipping the second mover's own move dispatch entirely.
 *  - Non-terminal (forced switch): `BattleScript_HandleFaintedMon`'s own
 *    tail, `switchineffects BS_FAINTED` followed immediately by
 *    `cancelallactions` (`data/battle_scripts_1.s:2893-2895`, singles-only
 *    -- doubles takes an earlier `jumpifbattletype BATTLE_TYPE_DOUBLE`
 *    branch around it), sets every `gActionsByTurnOrder[i]` to
 *    `B_ACTION_CANCEL_PARTNER`, cancelling the still-pending second action
 *    the same turn. `cancelallactions` is already a registered opcode
 *    (`battleScriptSwitchinOpcode.ts`) reached by the existing forced-switch
 *    chain.
 * Either way `gBattleOutcome` gates whether `runBattleEndTurnOrchestration`
 * (the `BattleTurnPassed` port) itself still runs: `sEndTurnFuncsTable`
 * (`battle_main.c:554-565`) only reaches index 0 (`HandleEndTurn_
 * ContinueBattle`, which sets `gBattleMainFunc = BattleTurnPassed`) when
 * `gBattleOutcome === 0` -- so a terminal first action skips end-turn
 * orchestration entirely (this reducer reports the terminal boundary
 * immediately), while a non-terminal forced switch still reaches it (the
 * cancelled second action doesn't gate `BattleTurnPassed`, only
 * `gBattleOutcome` does).
 *
 * Both sides publish one legal decision for every nonzero moveset slot. The
 * same source-shaped GetMoveTarget port owns both singles requests, including
 * user-targeting moves, so initial and subsequent turns cannot drift.
 */
import {
  createBattleState,
  submitBattleDecision,
  type BattleBoundary,
  type BattleDecisionReducer,
  type BattleDecisionReducerContext,
  type BattleDecisionReducerOutput,
  type BattleDecisionRng,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleMoveDecision,
  type BattleMoveSlot,
  type BattlePartyIndex,
  type BattleSinglesBattler,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import { handleBattleActionFinished } from "./battleActionFinished.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  resumeBattleScriptFaintedActionsAfterPlayerChoice,
  runBattleScriptFaintedActionsOrchestration,
} from "./battleScriptFaintedActionsOrchestration.ts";
import { runBattleEndTurnOrchestration } from "./battleEndTurnOrchestration.ts";
import { effectiveSpeed, getWhoStrikesFirst, type TurnOrderBattler } from "./turnOrder.ts";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_PARTY_SIZE,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "./battleScriptSourceConstants.ts";
import { mapFactoryBattleOutcome } from "./factoryBattleScriptTerminalDecision.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

const ADAPTER = "factory-full-turn/v1";
const B_WAIT_TIME_LONG = 64;
const B_WAIT_TIME_SHORT = 32;
const STAT_SPEED = 3;
/** Real per-script instruction ceiling, matching battleEndTurnOrchestration.ts's own bump for the DoTurnDmg-family scripts' controller round trips. */
const SCRIPT_BUDGET = 256;

type MoveRow = Readonly<{
  id: number;
  priority: number;
  target: readonly string[];
}>;
type TopologyMoveRow = Readonly<{ id: number; entryScript: string }>;

const MOVES_BY_ID = new Map(
  (movesData.moves as readonly MoveRow[]).map((move) => [move.id, move]),
);
const TOPOLOGY_BY_MOVE = new Map(
  (topologyData.moves as readonly TopologyMoveRow[]).map((move) => [move.id, move]),
);
const PROGRAM = loadBattleScriptProgram();
const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const ZERO_STAT_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

type MachineState = BattleScriptMachineState<BattleScriptRulesContext>;
type Handlers = BattleScriptOpcodeHandlers<BattleScriptRulesContext>;

export type FactoryFullTurnBattlerConfig = Readonly<{
  species: number;
  moveId: number;
  /**
   * Optional full 4-move moveset override (real Factory AI decision proof,
   * item 1 -- `docs/factory-ai-ground-truth.md`'s mask-7 policy needs a real
   * multi-slot choice, not a single staged move). When omitted, `moveId`
   * alone occupies slot 0 (this reducer's original staged-singles shape,
   * `factoryBattleScriptTerminalDecision.ts`'s own precedent).
   */
  moves?: readonly [number, number, number, number];
  /** Source `gBattleMons[].pp`; omitted legacy configs retain the old 16-per-nonzero-move default. */
  pp?: readonly [number, number, number, number];
  /** Source `gBattleMons[].ability`; omitted legacy configs retain the old zero default. */
  ability?: number;
  /** Source `gBattleMons[].item`; omitted legacy configs retain the old zero default. */
  item?: number;
  /** Source `gBattleMons[].friendship`; omitted legacy configs retain the old zero default. */
  friendship?: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  hp: number;
  maxHp?: number;
  status1?: number;
  status2?: number;
  statStages?: readonly [number, number, number, number, number, number, number, number];
  types?: readonly [string, string];
}>;

export type FactoryFullTurnConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  player: FactoryFullTurnBattlerConfig;
  trainer: FactoryFullTurnBattlerConfig;
  /**
   * Optional trainer-side bench (party slots 1/2, since `config.trainer`
   * itself always occupies slot 0 here -- this reducer's own convention,
   * distinct from `factoryBattleScriptTerminalDecision.ts`'s active-at-
   * slot-2 layout). Item 2's non-terminal forced-switch full-turn proof:
   * a healthy bench lets `BattleScript_HandleFaintedMon`'s AI branch
   * (`docs/forced-switch-ground-truth.md` §1c/§2, entry 447's machinery)
   * actually resume the battle instead of ending it. Omitted everywhere
   * else, keeping every existing fixture's hard-terminal-on-faint shape.
   */
  trainerBenchHp?: readonly [number, number];
  /** Mirrors `factoryBattleScriptTerminalDecision.ts`'s own `opponentBenchOverride` -- per-slot species/moves override for the two bench slots above. */
  trainerBenchOverride?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
  /**
   * Mirrors `trainerBenchHp` but for the PLAYER's bench (party slots 1/2,
   * since `config.player` itself always occupies slot 0 here too -- item 3's
   * player-side forced-switch full-turn proof. When the trainer's action
   * KOs the player's active mon non-terminally, `BattleScript_HandleFaintedMon`'s
   * player branch (`battleScriptOpenPartyScreenOpcode.ts`) halts on a real
   * `"player-choice-required"` reason instead of the AI's automatic pick --
   * this reducer surfaces that as a `"forced-switch"` decision-required
   * boundary (below) rather than throwing. Omitted everywhere else, keeping
   * every existing fixture's hard-terminal-on-faint shape.
   */
  playerBenchHp?: readonly [number, number];
  /** Mirrors `trainerBenchOverride`, for the player's bench slots above. */
  playerBenchOverride?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
}>;

export type FactoryFullTurnDecisionRules = BattleJsonObject & Readonly<{
  adapter: typeof ADAPTER;
  phase: "awaiting-player-command" | "awaiting-trainer-command" | "forced-switch-pending";
  pendingPlayerDecision: null | Readonly<{
    moveSlot: BattleMoveSlot;
    targetBattler: BattleSinglesBattler;
  }>;
  rulesContext: BattleScriptRulesContext;
  /**
   * Only present in phase "forced-switch-pending": the halted
   * `BattleScript_HandleFaintedMon` script's resumable machine state
   * (`factoryBattleScriptTerminalDecision.ts`'s own `pendingScript` precedent) --
   * see `pendingForcedSwitchAt`.
   */
  pendingScript?: PendingForcedSwitchScript;
}>;

type PendingForcedSwitchScript = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  scheduler: BattleScriptSchedulerState;
}>;

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
    specialStatus: Object.freeze({ restoredBattlerSprite: 0, physicalDmg: 0, specialDmg: 0 }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    disableTimer: 0,
    disableTimerStartValue: 0,
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
  config: FactoryFullTurnBattlerConfig,
): BattleScriptRulesBattlerState {
  const moves = config.moves ?? ([config.moveId, 0, 0, 0] as const);
  const pp = config.pp ?? (
    moves.map((moveId) => (moveId !== 0 ? 16 : 0)) as unknown as readonly [
      number,
      number,
      number,
      number,
    ]
  );
  return Object.freeze({
    ...emptyBattler(side),
    ability: config.ability ?? 0,
    hp: config.hp,
    item: config.item ?? 0,
    species: config.species,
    attack: config.attack,
    defense: config.defense,
    spAttack: config.spAttack,
    spDefense: config.spDefense,
    speed: config.speed,
    level: 50,
    friendship: config.friendship ?? 0,
    types: config.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: Object.freeze(moves),
    pp: Object.freeze(pp),
    statStages: config.statStages ?? NEUTRAL_STAT_STAGES,
    status1: config.status1 ?? 0,
    status2: config.status2 ?? 0,
    maxHP: config.maxHp ?? config.hp,
    partyIndex: 0,
  });
}

function partySlot(config: FactoryFullTurnBattlerConfig): BattleScriptPartyMemberInput {
  return { species: config.species, isEgg: false, hp: config.hp, status1: config.status1 ?? 0 };
}

const EMPTY_PARTY_SLOT: BattleScriptPartyMemberInput = Object.freeze({ species: 0, isEgg: false, hp: 0 });

/** A bench slot (party index 1 or 2, items 2/3's forced-switch proofs) -- species/moves come from `override`, `hp` is the only required field. */
function benchSlot(hp: number, override?: BattleScriptPartyMemberInput): BattleScriptPartyMemberInput {
  return { species: 0, isEgg: false, hp, ...override };
}

function createInitialRules(config: FactoryFullTurnConfig): FactoryFullTurnDecisionRules {
  const playerParty = Object.freeze([
    partySlot(config.player),
    config.playerBenchHp
      ? benchSlot(config.playerBenchHp[0], config.playerBenchOverride?.[0])
      : EMPTY_PARTY_SLOT,
    config.playerBenchHp
      ? benchSlot(config.playerBenchHp[1], config.playerBenchOverride?.[1])
      : EMPTY_PARTY_SLOT,
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
  ]);
  const opponentParty = Object.freeze([
    partySlot(config.trainer),
    config.trainerBenchHp
      ? benchSlot(config.trainerBenchHp[0], config.trainerBenchOverride?.[0])
      : EMPTY_PARTY_SLOT,
    config.trainerBenchHp
      ? benchSlot(config.trainerBenchHp[1], config.trainerBenchOverride?.[1])
      : EMPTY_PARTY_SLOT,
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
  ]);
  if (playerParty.length !== BATTLE_SCRIPT_PARTY_SIZE || opponentParty.length !== BATTLE_SCRIPT_PARTY_SIZE) {
    throw new Error("staged parties must contain exactly PARTY_SIZE slots");
  }

  const rulesContext = createBattleScriptRulesContext({
    battlers: [
      activeBattler(0, config.player),
      activeBattler(1, config.trainer),
      emptyBattler(0),
      emptyBattler(1),
    ],
    selectorRoles: { attacker: null, target: null, effectBattler: null, fainted: null },
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
    hitMarker: 0,
    multiHitCounter: 0,
    party: { player: playerParty, opponent: opponentParty },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
  return Object.freeze({
    adapter: ADAPTER,
    phase: "awaiting-player-command",
    pendingPlayerDecision: null,
    rulesContext,
  });
}

export function createFactoryFullTurnBattleState(
  config: FactoryFullTurnConfig,
): BattleState<FactoryFullTurnDecisionRules> {
  const rules = createInitialRules(config);
  return createBattleState({
    rules,
    rngSeed: config.rngSeed,
    request: {
      kind: "command",
      requestId: config.requestId,
      side: "player",
      battler: 0,
      legalDecisions: legalMoveDecisions(rules.rulesContext, 0),
    },
  }) as BattleState<FactoryFullTurnDecisionRules>;
}

function rulesAt(input: FactoryFullTurnDecisionRules): FactoryFullTurnDecisionRules {
  const phase = (input as { phase?: unknown } | null)?.phase;
  if (
    input === null
    || typeof input !== "object"
    || (input as { adapter?: unknown }).adapter !== ADAPTER
    || (phase !== "awaiting-player-command" && phase !== "awaiting-trainer-command")
  ) {
    throw new Error("factory full-turn decision requires an awaiting-command staged rules payload");
  }
  const rulesContext = createBattleScriptRulesContext(
    (input as { rulesContext: unknown }).rulesContext as never,
  );
  return Object.freeze({
    adapter: ADAPTER,
    phase: phase as "awaiting-player-command" | "awaiting-trainer-command",
    pendingPlayerDecision: (input as {
      pendingPlayerDecision: null | Readonly<{
        moveSlot: BattleMoveSlot;
        targetBattler: BattleSinglesBattler;
      }>;
    }).pendingPlayerDecision,
    rulesContext,
  });
}

function buildRules(
  rulesContext: BattleScriptRulesContext,
  phase: FactoryFullTurnDecisionRules["phase"],
  pendingPlayerDecision: FactoryFullTurnDecisionRules["pendingPlayerDecision"],
): FactoryFullTurnDecisionRules {
  return Object.freeze({ adapter: ADAPTER, phase, pendingPlayerDecision, rulesContext });
}

function buildForcedSwitchPendingRules(
  rulesContext: BattleScriptRulesContext,
  pendingScript: PendingForcedSwitchScript,
): FactoryFullTurnDecisionRules {
  return Object.freeze({
    adapter: ADAPTER,
    phase: "forced-switch-pending",
    pendingPlayerDecision: null,
    rulesContext,
    pendingScript,
  });
}

function pendingScriptAt(value: unknown): PendingForcedSwitchScript {
  const record = value as
    | Readonly<{ programCounter?: unknown; callStack?: unknown; scheduler?: unknown }>
    | null
    | undefined;
  if (
    record === null
    || record === undefined
    || typeof record !== "object"
    || !Number.isSafeInteger(record.programCounter)
    || !Array.isArray(record.callStack)
    || !record.callStack.every((entry) => Number.isSafeInteger(entry))
  ) {
    throw new Error("factory full-turn decision pendingScript must be a valid halted-script bundle");
  }
  const scheduler = createBattleScriptSchedulerState(
    record.scheduler as Parameters<typeof createBattleScriptSchedulerState>[0],
  );
  return Object.freeze({
    programCounter: record.programCounter as number,
    callStack: Object.freeze([...(record.callStack as readonly number[])]),
    scheduler,
  });
}

/**
 * Reconstructs the halted `BattleScript_HandleFaintedMon` script paused
 * mid-dance at `openpartyscreen`'s player branch (item 3, mirroring
 * `factoryBattleScriptTerminalDecision.ts`'s own `pendingForcedSwitchAt`).
 * `rulesContext`/`pendingScript` are the only durable fields this phase
 * needs -- the current `BattleForcedSwitchRequest` (reconstructed by
 * `submitBattleDecision` from this same state's own previously-published
 * boundary) already carries `battler`/`faintedPartyIndex`/`legalPartyIndexes`.
 */
function pendingForcedSwitchAt(
  input: FactoryFullTurnDecisionRules,
): Readonly<{ rulesContext: BattleScriptRulesContext; pendingScript: PendingForcedSwitchScript }> {
  if (
    input === null
    || typeof input !== "object"
    || (input as { adapter?: unknown }).adapter !== ADAPTER
    || (input as { phase?: unknown }).phase !== "forced-switch-pending"
  ) {
    throw new Error("factory full-turn decision requires a forced-switch-pending staged rules payload");
  }
  const rulesContext = createBattleScriptRulesContext(
    (input as { rulesContext: unknown }).rulesContext as never,
  );
  const pendingScript = pendingScriptAt((input as { pendingScript?: unknown }).pendingScript);
  return Object.freeze({ rulesContext, pendingScript });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context: Readonly<{ state: MachineState }>) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    // Dynamic (not a fixed closure value): the attacker role changes across
    // this reducer's two actions plus the end-turn tick loop's own
    // per-battler reassignment (battleEndTurnOrchestration.ts's
    // enterTickBattlerContext), all sharing this one ports/handlers pair.
    resolveAttackerBattler: (context: Readonly<{ state: MachineState }>) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context: unknown, operand: Readonly<{ expression: string }>) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function acknowledgeAllPendingControllers(state: MachineState): MachineState {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

type RunToOwnEndResult =
  | Readonly<{ kind: "terminal"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

/** Runs one already-started BattleScriptExecute script to its own end/end2 halt (same shape as the fainted-actions/end-turn precedents' own helper). */
function runScriptToOwnEnd(program: BattleScriptProgram, handlers: Handlers, initialState: MachineState): RunToOwnEndResult {
  let state = initialState;
  for (let budget = 0; budget < SCRIPT_BUDGET; budget += 1) {
    const instruction = program.instructions[state.programCounter];
    if (!instruction) {
      throw new Error(`full-turn reducer left the committed program at ${state.programCounter}`);
    }
    if (!handlers[instruction.opcodeId]) {
      return Object.freeze({ kind: "barrier", state, instruction });
    }
    const stepped = stepBattleScriptMachine(program, state, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgeAllPendingControllers(stepped.state);
      if (acknowledged === stepped.state) {
        throw new Error(`full-turn reducer blocked inside ${instruction.source.label} without a safe controller acknowledgement`);
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind === "halted") {
      if (stepped.state.haltReason?.kind === "terminal") {
        return Object.freeze({ kind: "terminal", state: stepped.state });
      }
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind === "unsupported") {
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    state = stepped.state;
  }
  throw new Error("full-turn reducer exceeded its per-script instruction budget");
}

/** `BattleScriptExecute(script)`: a fresh top-level script, call stack reset, carrying the rules/RNG/event/scheduler state forward. */
function startBattleScriptExecute(
  program: BattleScriptProgram,
  entryLabel: string,
  priorState: MachineState,
): MachineState {
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  return Object.freeze({
    programCounter: entry.programCounter,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: priorState.scheduler,
    rulesContext: priorState.rulesContext,
    rng: priorState.rng,
    events: priorState.events,
  });
}

function buildActionContext(
  priorRulesContext: BattleScriptRulesContext,
  mover: BattleScriptBattlerId,
  moveId: number,
  moveSlot: BattleMoveSlot,
  target: BattleScriptBattlerId,
  forcedStruggle: boolean,
): BattleScriptRulesContext {
  const chosenMovePositions = Object.freeze(
    priorRulesContext.chosenMovePositions.map((position, battler) =>
      battler === mover ? moveSlot : position
    ),
  ) as unknown as BattleScriptRulesContext["chosenMovePositions"];
  return createBattleScriptRulesContext({
    ...priorRulesContext,
    selectorRoles: { attacker: mover, target, effectBattler: target, fainted: null },
    scriptingBattler: mover,
    currentMove: moveId,
    currentMovePosition: moveSlot,
    chosenMove: moveId,
    chosenMovePositions,
    // HandleAction_UseMove resets these globals for every acting battler
    // before BattleScriptExecute (battle_util.c:91-96). Carrying the first
    // action's completed canceler cursor into the second action would skip
    // newly-applied admission conditions such as Disable.
    atkCancelerTracker: 0,
    critMultiplier: 1,
    dmgMultiplier: 1,
    moveResultFlags: 0,
    multiHitCounter: 0,
    missType: 0,
    hitMarker: forcedStruggle
      ? (priorRulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT) >>> 0
      : priorRulesContext.hitMarker,
  });
}

type ActionResult =
  | Readonly<{ kind: "complete"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

/** Runs one battler's chosen move from its LITERAL topology entry (census precedent, `factoryBattleScriptDecision.ts`'s own mechanism). */
function runMoveAction(
  program: BattleScriptProgram,
  handlers: Handlers,
  priorState: MachineState,
  mover: BattleScriptBattlerId,
  moveId: number,
  moveSlot: BattleMoveSlot,
  target: BattleScriptBattlerId,
  forcedStruggle = false,
): ActionResult {
  const topology = TOPOLOGY_BY_MOVE.get(moveId);
  if (!topology) throw new Error(`move ${moveId} has no source Battle Script entry`);
  const actionContext = buildActionContext(
    priorState.rulesContext,
    mover,
    moveId,
    moveSlot,
    target,
    forcedStruggle,
  );
  const started = startBattleScriptExecute(program, topology.entryScript, {
    ...priorState,
    rulesContext: actionContext,
  });
  const run = runScriptToOwnEnd(program, handlers, started);
  if (run.kind === "barrier") return Object.freeze({ kind: "barrier", state: run.state, instruction: run.instruction });
  return Object.freeze({ kind: "complete", state: run.state });
}

function movePriority(moveId: number): number {
  const row = MOVES_BY_ID.get(moveId);
  if (!row) throw new Error(`move ${moveId} has no source move data row`);
  return row.priority;
}

function turnOrderBattler(rulesContext: BattleScriptRulesContext, battler: BattleScriptBattlerId, moveId: number): TurnOrderBattler {
  const b = rulesContext.battlers[battler];
  return { speed: b.speed, speedStage: b.statStages[STAT_SPEED]!, movePriority: movePriority(moveId) };
}

/**
 * Source GetBattlerTurnOrderNum/gCurrentTurnActionNumber (battle_script_
 * commands.c:2210-2219, battle_main.c:162), needed by SetMoveEffect's
 * MOVE_EFFECT_FLINCH gate (docs/set-move-effect-ground-truth.md:104-112).
 * This reducer is the one owner of real per-action turn-order values: mover1
 * always occupies position 0 (gBattlerByTurnOrder[0]), mover2 position 1
 * (singles only, matching this reducer's own two-mover shape), and
 * currentTurnActionNumber tracks which action is currently executing.
 * turnOrderNum itself does not change across the turn -- only
 * currentTurnActionNumber does, once per action -- so this is called once
 * per action with the same mover1/mover2 pair.
 */
function withTurnOrderPositions(
  rulesContext: BattleScriptRulesContext,
  currentTurnActionNumber: number,
  mover1: BattleScriptBattlerId,
  mover2: BattleScriptBattlerId,
): BattleScriptRulesContext {
  const battlers = rulesContext.battlers.map((battler, index) => {
    if (index === mover1) return Object.freeze({ ...battler, turnOrderNum: 0 });
    if (index === mover2) return Object.freeze({ ...battler, turnOrderNum: 1 });
    return battler;
  }) as unknown as BattleScriptRulesContext["battlers"];
  return Object.freeze({
    ...rulesContext,
    battlers: Object.freeze(battlers),
    battlerByTurnOrder: Object.freeze([
      mover1,
      mover2,
      2,
      3,
    ] as const),
    currentTurnActionNumber,
  });
}

function machineBarrierBoundary(instruction: BattleScriptInstruction, instructionsExecuted: number): BattleBoundary {
  return Object.freeze({
    kind: "machine-barrier",
    barrier: Object.freeze({
      kind: "battle-script",
      entryLabel: instruction.source.label,
      programCounter: instruction.programCounter,
      opcodeId: instruction.opcodeId,
      opcodeName: instruction.opcodeName,
      dispatcher: instruction.dispatcher,
      instructionsExecuted,
    }),
  });
}

/**
 * Singles projection of `GetMoveTarget` (`battle_util.c:3828-3910`) for every
 * target shape represented by generated `gBattleMoves[]`. Doubles-only
 * redirection and RANDOM's draw are unreachable with two active battlers:
 * every non-user shape resolves to the sole opposing active battler without
 * consuming RNG. Keeping the generated shape strict prevents a future source
 * expression from silently inheriting the wrong target.
 */
function sourceMoveTarget(
  moveId: number,
  attacker: BattleSinglesBattler,
): BattleSinglesBattler {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) {
    throw new Error(`move ${moveId} is absent from generated gBattleMoves`);
  }
  if (move.target.length !== 1) {
    throw new Error(
      `move ${moveId} has unsupported generated target shape ${move.target.join("|")}`,
    );
  }
  switch (move.target[0]) {
    case "MOVE_TARGET_USER":
      return attacker;
    case "MOVE_TARGET_SELECTED":
    case "MOVE_TARGET_DEPENDS":
    case "MOVE_TARGET_BOTH":
    case "MOVE_TARGET_FOES_AND_ALLY":
    case "MOVE_TARGET_OPPONENTS_FIELD":
    case "MOVE_TARGET_RANDOM":
      return attacker === 0 ? 1 : 0;
    default:
      throw new Error(
        `move ${moveId} has unsupported generated target shape ${move.target[0]}`,
      );
  }
}

/**
 * Source `HandleInputChooseMove` publishes the configured moves in slot
 * order. A zero move id is an empty slot, not a legal command;
 * `submitBattleDecision` remains the public membership validator.
 */
function legalMoveDecisions(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): readonly BattleMoveDecision[] {
  const locked = lockedMoveDecision(rulesContext, battler);
  if (locked !== null) return Object.freeze([locked]);
  const source = rulesContext.battlers[battler]!;
  const unusable = source.moves.map((moveId, slot) =>
    moveId === 0
    || source.pp[slot] === 0
    || (source.disabledMove !== 0 && moveId === source.disabledMove)
    || (source.encoreTimer !== 0 && moveId !== source.encoredMove)
  );
  if (unusable.every(Boolean)) {
    const moveSlot = rulesContext.chosenMovePositions[battler] as BattleMoveSlot;
    return Object.freeze([Object.freeze({
      kind: "use-move" as const,
      moveSlot,
      targetBattler: sourceMoveTarget(BATTLE_SCRIPT_MOVE_STRUGGLE, battler),
    })]);
  }
  const moves = source.moves;
  const legal = moves.flatMap((moveId, slot) =>
    !unusable[slot]
      ? [Object.freeze({
          kind: "use-move" as const,
          moveSlot: slot as BattleMoveSlot,
          targetBattler: sourceMoveTarget(moveId, battler),
        })]
      : []);
  return Object.freeze(legal);
}

function usesForcedStruggle(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  if (lockedMoveDecision(rulesContext, battler) !== null) return false;
  const source = rulesContext.battlers[battler]!;
  return source.moves.every((moveId, slot) =>
    moveId === 0
    || source.pp[slot] === 0
    || (source.disabledMove !== 0 && moveId === source.disabledMove)
    || (source.encoreTimer !== 0 && moveId !== source.encoredMove)
  );
}

/**
 * Source `HandleTurnActionSelectionState` + `HandleAction_UseMove`: a
 * STATUS2_MULTIPLETURNS battler does not choose a fresh action; it uses its
 * attacker-indexed gLockedMoves entry. This singles adapter recovers the
 * still-selected slot from gBattleStruct->chosenMovePositions.
 */
function lockedMoveDecision(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): BattleMoveDecision | null {
  const battlerState = rulesContext.battlers[battler]!;
  if (
    (
      battlerState.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    ) === 0
  ) {
    return null;
  }
  const moveId = rulesContext.lockedMoves[battler]!;
  const moveSlot = rulesContext.chosenMovePositions[battler]!;
  if (moveId === 0 || battlerState.moves[moveSlot] !== moveId) {
    throw new Error(
      `factory full-turn battler ${battler} has an active multi-turn lock without a usable gLockedMoves entry`,
    );
  }
  return Object.freeze({
    kind: "use-move",
    moveSlot: moveSlot as BattleMoveSlot,
    targetBattler: sourceMoveTarget(moveId, battler),
  });
}

function provenanceEvents(state: MachineState) {
  return Object.freeze(state.events.map((event) => {
    const { sequence: _sequence, provenance, ...payload } = event;
    return Object.freeze({
      payload: Object.freeze(payload),
      provenance,
    });
  }));
}

/**
 * Shared tail for every place this reducer finishes a reducer invocation
 * (fresh two-action turns AND the forced-switch resume path below): reconciles
 * the machine-local RNG ledger onto the decision boundary's own cumulative
 * cursor (the same subtlety this module's own header comment documents for
 * `rngBefore`/`rngAfter`).
 */
function finishFullTurn(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  finalState: MachineState,
  resultRules: FactoryFullTurnDecisionRules,
  boundary: BattleBoundary,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  reconcileFullTurnRng(ctxRng, rngBeforeCalls, finalState);
  return Object.freeze({
    rules: resultRules,
    events: provenanceEvents(finalState),
    boundary,
  });
}

function reconcileFullTurnRng(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  finalState: MachineState,
): void {
  for (const entry of finalState.rng.ledger) ctxRng.draw(entry.reason);
  const rngAfter = ctxRng.snapshot();
  if (rngAfter.value !== finalState.rng.value || rngAfter.calls !== rngBeforeCalls + finalState.rng.calls) {
    throw new Error("full-turn reducer RNG reconciliation diverged from the decision boundary cursor");
  }
}

/**
 * Runs `runBattleEndTurnOrchestration` and builds the resulting boundary --
 * shared by the normal two-action turn tail and the forced-switch resume
 * path (item 3): a "resumed" forced switch (mid-turn KO cancelled the still-
 * pending second action, or there was none left) reaches exactly this same
 * point either way.
 */
function runEndTurnTail(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  handlers: Handlers,
  preEndTurnState: MachineState,
  nextRequestId: number,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  const endTurn = runBattleEndTurnOrchestration(PROGRAM, handlers, preEndTurnState);
  if (endTurn.kind === "terminal") {
    return finishFullTurn(
      ctxRng, rngBeforeCalls, endTurn.state,
      buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
      Object.freeze({ kind: "terminal", outcome: mapFactoryBattleOutcome(endTurn.state.rulesContext.battleOutcome) }),
    );
  }
  if (endTurn.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctxRng, rngBeforeCalls, endTurn.state,
      buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
      machineBarrierBoundary(endTurn.instruction, endTurn.state.instructionsExecuted),
    );
  }
  if (endTurn.kind === "case-barrier") {
    throw new Error(
      `full-turn reducer's end-turn orchestration hit case ${endTurn.caseName} (${endTurn.detail}) -- outside `
        + "this reducer's modeled domain (no proof this rung exercises any still-barriered end-turn case)",
    );
  }
  if (endTurn.kind === "player-choice-required") {
    throw new Error(
      "full-turn reducer's end-turn orchestration produced a player-choice-required forced-switch request "
        + "-- outside this reducer's modeled domain (factoryBattleScriptTerminalDecision.ts's own "
        + "forced-switch resume support is the single-action sibling that models this)",
    );
  }

  // "next-turn" or "resumed": the battle continues into a fresh decision-required boundary.
  // HandleTurnActionSelectionState auto-confirms a multi-turn player's
  // B_ACTION_USE_MOVE, so only the trainer command remains to collect.
  const lockedPlayerDecision = lockedMoveDecision(endTurn.state.rulesContext, 0);
  const lockedTrainerDecision = lockedMoveDecision(endTurn.state.rulesContext, 1);
  if (lockedPlayerDecision !== null && lockedTrainerDecision !== null) {
    // Source auto-confirms both locked B_ACTION_USE_MOVE entries without
    // exposing either controller command. Resolve the next turn inside this
    // same decision transition, preserving the single RNG cursor and
    // prepending this turn's machine events to the recursively resolved tail.
    reconcileFullTurnRng(ctxRng, rngBeforeCalls, endTurn.state);
    const nested = reduceFactoryFullTurnDecision(Object.freeze({
      rules: buildRules(
        endTurn.state.rulesContext,
        "awaiting-trainer-command",
        Object.freeze({
          moveSlot: lockedPlayerDecision.moveSlot,
          targetBattler: lockedPlayerDecision.targetBattler,
        }),
      ),
      request: Object.freeze({
        kind: "command",
        requestId: nextRequestId - 1,
        side: "trainer",
        battler: 1 as const,
        legalDecisions: Object.freeze([lockedTrainerDecision]),
      }),
      decision: lockedTrainerDecision,
      rng: ctxRng,
    }));
    return Object.freeze({
      ...nested,
      events: Object.freeze([
        ...provenanceEvents(endTurn.state),
        ...nested.events,
      ]),
    });
  }
  if (lockedPlayerDecision !== null) {
    return finishFullTurn(
      ctxRng, rngBeforeCalls, endTurn.state,
      buildRules(
        endTurn.state.rulesContext,
        "awaiting-trainer-command",
        Object.freeze({
          moveSlot: lockedPlayerDecision.moveSlot,
          targetBattler: lockedPlayerDecision.targetBattler,
        }),
      ),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: nextRequestId,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: legalMoveDecisions(endTurn.state.rulesContext, 1),
        }),
      }),
    );
  }

  return finishFullTurn(
    ctxRng, rngBeforeCalls, endTurn.state,
    buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
    Object.freeze({
      kind: "decision-required",
      request: Object.freeze({
        kind: "command",
        requestId: nextRequestId,
        side: "player",
        battler: 0 as const,
        legalDecisions: legalMoveDecisions(endTurn.state.rulesContext, 0),
      }),
    }),
  );
}

/**
 * Resumes a `"forced-switch"` request (item 3, mirroring
 * `factoryBattleScriptTerminalDecision.ts`'s own `resumeForcedSwitchDecision`):
 * reconstructs the halted `BattleScript_HandleFaintedMon` script from
 * `pendingForcedSwitchAt`'s durable bundle, writes the submitted
 * (already-validated-legal, per `submitBattleDecision`'s own
 * `legalPartyIndexes` gate) party index into `monToSwitchIntoId`, and drives
 * the same slice-1-9 machinery the AI-side dance already uses. A "resumed"
 * result (the only non-terminal, non-barrier outcome possible here) always
 * continues straight into `runEndTurnTail` -- `cancelallactions` already
 * cancelled any still-pending second action inside the dance itself, so there
 * is nothing left of this turn's two-action shape to resume.
 */
function resumeFullTurnForcedSwitch(
  ctx: BattleDecisionReducerContext<FactoryFullTurnDecisionRules>,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  if (ctx.request.kind !== "forced-switch" || ctx.decision.kind !== "switch") {
    throw new Error("factory full-turn decision forced-switch resume requires a matching switch submission");
  }
  const pending = pendingForcedSwitchAt(ctx.rules);
  const rngBefore = ctx.rng.snapshot();
  const actingBattler = pending.rulesContext.battlerByTurnOrder[
    pending.rulesContext.currentTurnActionNumber
  ];
  if (
    actingBattler === undefined
    || actingBattler >= pending.rulesContext.battleTopology.battlersCount
  ) {
    throw new Error(
      "factory full-turn decision forced-switch resume cannot resolve the acting battler at the current turn position",
    );
  }
  const instruction = PROGRAM.instructions[pending.pendingScript.programCounter];
  if (!instruction) {
    throw new Error(
      "factory full-turn decision forced-switch resume: pendingScript program counter is out of range",
    );
  }
  const haltedState: MachineState = Object.freeze({
    programCounter: pending.pendingScript.programCounter,
    callStack: pending.pendingScript.callStack,
    instructionsExecuted: 0,
    haltReason: Object.freeze({
      kind: "player-choice-required" as const,
      programCounter: pending.pendingScript.programCounter,
      opcodeId: instruction.opcodeId,
      opcodeName: instruction.opcodeName,
      battler: ctx.request.battler,
      faintedPartyIndex: ctx.request.faintedPartyIndex,
      legalPartyIndexes: ctx.request.legalPartyIndexes,
    }),
    scheduler: pending.pendingScript.scheduler,
    rulesContext: pending.rulesContext,
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  const ports = externalPorts();
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, ports);
  const orchestration = resumeBattleScriptFaintedActionsAfterPlayerChoice(
    PROGRAM,
    handlers,
    haltedState,
    ctx.decision.partyIndex,
  );
  if (orchestration.kind === "player-choice-required" || orchestration.kind === "no-fainted-battlers") {
    throw new Error(
      `factory full-turn decision forced-switch resume produced an unexpected ${orchestration.kind} result`,
    );
  }

  if (orchestration.kind === "terminal") {
    const finished = handleBattleActionFinished(
      orchestration.state,
      actingBattler as BattleScriptBattlerId,
    );
    return finishFullTurn(
      ctx.rng, rngBefore.calls, finished,
      buildRules(finished.rulesContext, "awaiting-player-command", null),
      Object.freeze({
        kind: "terminal",
        outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
      }),
    );
  }
  if (orchestration.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, orchestration.state,
      buildRules(orchestration.state.rulesContext, "awaiting-player-command", null),
      machineBarrierBoundary(orchestration.instruction, orchestration.state.instructionsExecuted),
    );
  }

  // orchestration.kind === "resumed"
  return runEndTurnTail(
    ctx.rng,
    rngBefore.calls,
    handlers,
    handleBattleActionFinished(
      orchestration.state,
      actingBattler as BattleScriptBattlerId,
    ),
    ctx.request.requestId + 1,
  );
}

export const reduceFactoryFullTurnDecision: BattleDecisionReducer<FactoryFullTurnDecisionRules> = (
  ctx,
) => {
  if (ctx.request.kind === "forced-switch") {
    return resumeFullTurnForcedSwitch(ctx);
  }
  const rules = rulesAt(ctx.rules);

  if (rules.phase === "awaiting-player-command") {
    if (
      ctx.request.kind !== "command"
      || ctx.request.side !== "player"
      || ctx.request.battler !== 0
      || ctx.decision.kind !== "use-move"
    ) {
      throw new Error("factory full-turn decision requires the player's staged singles use-move command");
    }
    const pendingRules = buildRules(
      rules.rulesContext,
      "awaiting-trainer-command",
      Object.freeze({
        moveSlot: ctx.decision.moveSlot,
        targetBattler: ctx.decision.targetBattler,
      }),
    );
    const lockedTrainerDecision = lockedMoveDecision(rules.rulesContext, 1);
    if (lockedTrainerDecision !== null) {
      // HandleTurnActionSelectionState has already auto-confirmed the
      // trainer's locked action, so the player's submitted command completes
      // action collection and resolves the turn immediately.
      return reduceFactoryFullTurnDecision(Object.freeze({
        rules: pendingRules,
        request: Object.freeze({
          kind: "command",
          requestId: ctx.request.requestId,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: Object.freeze([lockedTrainerDecision]),
        }),
        decision: lockedTrainerDecision,
        rng: ctx.rng,
      }));
    }
    return Object.freeze({
      rules: pendingRules,
      events: [],
      boundary: Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: ctx.request.requestId + 1,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: legalMoveDecisions(rules.rulesContext, 1),
        }),
      }),
    });
  }

  // phase === "awaiting-trainer-command"
  if (
    ctx.request.kind !== "command"
    || ctx.request.side !== "trainer"
    || ctx.request.battler !== 1
    || ctx.decision.kind !== "use-move"
    || rules.pendingPlayerDecision === null
  ) {
    throw new Error("factory full-turn decision requires the trainer's staged singles use-move command");
  }

  const rc0 = rules.rulesContext;
  const playerMoveSlot = rules.pendingPlayerDecision.moveSlot;
  const trainerMoveSlot = ctx.decision.moveSlot;
  const playerForcedStruggle = usesForcedStruggle(rc0, 0);
  const trainerForcedStruggle = usesForcedStruggle(rc0, 1);
  const playerMoveId = playerForcedStruggle
    ? BATTLE_SCRIPT_MOVE_STRUGGLE
    : rc0.battlers[0]!.moves[playerMoveSlot];
  const trainerMoveId = trainerForcedStruggle
    ? BATTLE_SCRIPT_MOVE_STRUGGLE
    : rc0.battlers[1]!.moves[ctx.decision.moveSlot];
  if (playerMoveId === 0) {
    throw new Error(
      `factory full-turn decision player move slot ${playerMoveSlot} is not usable`,
    );
  }
  if (trainerMoveId === 0) {
    throw new Error(`factory full-turn decision trainer move slot ${ctx.decision.moveSlot} is not usable`);
  }
  const playerTarget = rules.pendingPlayerDecision.targetBattler;
  const trainerTarget = ctx.decision.targetBattler;

  const playerTOB = turnOrderBattler(rc0, 0, playerMoveId);
  const trainerTOB = turnOrderBattler(rc0, 1, trainerMoveId);
  const bothPriorityZero = playerTOB.movePriority === 0 && trainerTOB.movePriority === 0;
  const priorityEqual = playerTOB.movePriority === trainerTOB.movePriority;
  const isSpeedTie = (bothPriorityZero || priorityEqual)
    && effectiveSpeed(playerTOB) === effectiveSpeed(trainerTOB);
  // battle_main.c:4728/4745 -- Random() & 1, drawn ONLY on a genuine speed tie.
  const speedTieRngRoll = isSpeedTie ? ctx.rng.draw("turn order speed tie (Random() & 1)") : 0;
  const strikesFirst = getWhoStrikesFirst(playerTOB, trainerTOB, speedTieRngRoll);
  const playerFirst = strikesFirst === 0;

  const mover1: BattleScriptBattlerId = playerFirst ? 0 : 1;
  const mover1MoveId = playerFirst ? playerMoveId : trainerMoveId;
  const mover1MoveSlot = playerFirst ? playerMoveSlot : trainerMoveSlot;
  const mover1Target: BattleScriptBattlerId = playerFirst ? playerTarget : trainerTarget;
  const mover2: BattleScriptBattlerId = playerFirst ? 1 : 0;
  const mover2MoveId = playerFirst ? trainerMoveId : playerMoveId;
  const mover2MoveSlot = playerFirst ? trainerMoveSlot : playerMoveSlot;
  const mover2Target: BattleScriptBattlerId = playerFirst ? trainerTarget : playerTarget;

  const ports = externalPorts();
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, ports);
  const rngBefore = ctx.rng.snapshot();

  const initialState: MachineState = Object.freeze({
    programCounter: 0,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: createBattleScriptSchedulerState(),
    rulesContext: withTurnOrderPositions(rc0, 0, mover1, mover2),
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  const action1 = runMoveAction(
    PROGRAM,
    handlers,
    initialState,
    mover1,
    mover1MoveId,
    mover1MoveSlot,
    mover1Target,
    mover1 === 0 ? playerForcedStruggle : trainerForcedStruggle,
  );
  if (action1.kind === "barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, action1.state,
      buildRules(action1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(action1.instruction, action1.state.instructionsExecuted),
    );
  }

  const faint1 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action1.state);
  if (faint1.kind === "terminal") {
    const finished = handleBattleActionFinished(faint1.state, mover1);
    return finishFullTurn(
      ctx.rng, rngBefore.calls, finished,
      buildRules(finished.rulesContext, rules.phase, rules.pendingPlayerDecision),
      Object.freeze({
        kind: "terminal",
        outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
      }),
    );
  }
  if (faint1.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, faint1.state,
      buildRules(faint1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(faint1.instruction, faint1.state.instructionsExecuted),
    );
  }
  if (faint1.kind === "player-choice-required") {
    // The fainted battler is player-side and its own bench still has a legal
    // replacement (item 3): surface it as a real "forced-switch" decision-
    // required boundary, not a throw -- cancelallactions inside the dance
    // itself already handles the still-pending second action (mover2 never
    // runs once resumed, matching item 2's own non-terminal fork).
    return finishFullTurn(
      ctx.rng, rngBefore.calls, faint1.state,
      buildForcedSwitchPendingRules(faint1.state.rulesContext, {
        programCounter: faint1.state.programCounter,
        callStack: faint1.state.callStack,
        scheduler: faint1.state.scheduler,
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: ctx.request.requestId + 1,
          side: faint1.battler === 0 ? "player" as const : "trainer" as const,
          battler: faint1.battler as BattleSinglesBattler,
          faintedPartyIndex: faint1.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: faint1.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }

  // faint1.kind is "no-fainted-battlers" (run action 2) or "resumed" (skip action 2, per cancelallactions).
  let preEndTurnState = handleBattleActionFinished(faint1.state, mover1);
  if (faint1.kind === "no-fainted-battlers") {
    // RunTurnActionsFunctions clears these action-local bits when advancing
    // gCurrentTurnActionNumber (battle_main.c:4949-4954). In particular, a
    // first mover stopped by Disable must not make the second mover disobey.
    const betweenActionsRules = createBattleScriptRulesContext({
      ...preEndTurnState.rulesContext,
      hitMarker: (
        preEndTurnState.rulesContext.hitMarker
        & ~BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
        & ~BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
      ) >>> 0,
    });
    const preAction2State: MachineState = Object.freeze({
      ...preEndTurnState,
      rulesContext: withTurnOrderPositions(
        betweenActionsRules,
        1,
        mover1,
        mover2,
      ),
    });
    const action2 = runMoveAction(
      PROGRAM,
      handlers,
      preAction2State,
      mover2,
      mover2MoveId,
      mover2MoveSlot,
      mover2Target,
      mover2 === 0 ? playerForcedStruggle : trainerForcedStruggle,
    );
    if (action2.kind === "barrier") {
      return finishFullTurn(
        ctx.rng, rngBefore.calls, action2.state,
        buildRules(action2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(action2.instruction, action2.state.instructionsExecuted),
      );
    }
    const faint2 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action2.state);
    if (faint2.kind === "terminal") {
      const finished = handleBattleActionFinished(faint2.state, mover2);
      return finishFullTurn(
        ctx.rng, rngBefore.calls, finished,
        buildRules(finished.rulesContext, rules.phase, rules.pendingPlayerDecision),
        Object.freeze({
          kind: "terminal",
          outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
        }),
      );
    }
    if (faint2.kind === "non-terminal-barrier") {
      return finishFullTurn(
        ctx.rng, rngBefore.calls, faint2.state,
        buildRules(faint2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(faint2.instruction, faint2.state.instructionsExecuted),
      );
    }
    if (faint2.kind === "player-choice-required") {
      // Same fork as faint1 above, just arising from the SECOND (final) action of the turn instead.
      return finishFullTurn(
        ctx.rng, rngBefore.calls, faint2.state,
        buildForcedSwitchPendingRules(faint2.state.rulesContext, {
          programCounter: faint2.state.programCounter,
          callStack: faint2.state.callStack,
          scheduler: faint2.state.scheduler,
        }),
        Object.freeze({
          kind: "decision-required",
          request: Object.freeze({
            kind: "forced-switch",
            requestId: ctx.request.requestId + 1,
            side: faint2.battler === 0 ? "player" as const : "trainer" as const,
            battler: faint2.battler as BattleSinglesBattler,
            faintedPartyIndex: faint2.faintedPartyIndex as BattlePartyIndex,
            legalPartyIndexes: faint2.legalPartyIndexes as readonly BattlePartyIndex[],
          }),
        }),
      );
    }
    preEndTurnState = handleBattleActionFinished(
      faint2.state,
      mover2,
    ); // "no-fainted-battlers" or "resumed"
  }

  return runEndTurnTail(ctx.rng, rngBefore.calls, handlers, preEndTurnState, ctx.request.requestId + 1);
};

export function submitFactoryFullTurnDecision(
  state: BattleState<FactoryFullTurnDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  return submitBattleDecision(state, submission, reduceFactoryFullTurnDecision);
}
