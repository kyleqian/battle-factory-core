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
 * Both sides model exactly one real move (slot 0) -- matching
 * `factoryBattleScriptTerminalDecision.ts`'s own staged-singles precedent
 * -- so legal decisions never need arbitrary move-slot selection.
 */
import {
  createBattleState,
  submitBattleDecision,
  type BattleBoundary,
  type BattleDecisionReducer,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleSinglesBattler,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { runBattleScriptFaintedActionsOrchestration } from "./battleScriptFaintedActionsOrchestration.ts";
import { runBattleEndTurnOrchestration } from "./battleEndTurnOrchestration.ts";
import { effectiveSpeed, getWhoStrikesFirst, type TurnOrderBattler } from "./turnOrder.ts";
import {
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
import { mapFactoryBattleOutcome } from "./factoryBattleScriptTerminalDecision.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

const ADAPTER = "factory-full-turn/v1";
const B_WAIT_TIME_LONG = 64;
const STAT_SPEED = 3;
/** Real per-script instruction ceiling, matching battleEndTurnOrchestration.ts's own bump for the DoTurnDmg-family scripts' controller round trips. */
const SCRIPT_BUDGET = 256;

type MoveRow = Readonly<{ id: number; priority: number }>;
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
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  hp: number;
  maxHp?: number;
  status1?: number;
  types?: readonly [string, string];
}>;

export type FactoryFullTurnConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  player: FactoryFullTurnBattlerConfig;
  trainer: FactoryFullTurnBattlerConfig;
}>;

export type FactoryFullTurnDecisionRules = BattleJsonObject & Readonly<{
  adapter: typeof ADAPTER;
  phase: "awaiting-player-command" | "awaiting-trainer-command";
  pendingPlayerDecision: null | Readonly<{ moveSlot: 0; targetBattler: BattleSinglesBattler }>;
  rulesContext: BattleScriptRulesContext;
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
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    targetNotAffected: 0,
    flag2Unknown: 0,
    chargingTurn: 0,
    protected: 0,
    ppNotAffectedByPressure: 0,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    level: 0,
    friendship: 0,
    partyIndex: 0,
    maxHP: 0,
    speed: 0,
  });
}

function activeBattler(
  side: 0 | 1,
  config: FactoryFullTurnBattlerConfig,
): BattleScriptRulesBattlerState {
  return Object.freeze({
    ...emptyBattler(side),
    hp: config.hp,
    species: config.species,
    attack: config.attack,
    defense: config.defense,
    spAttack: config.spAttack,
    spDefense: config.spDefense,
    speed: config.speed,
    level: 50,
    types: config.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: Object.freeze([config.moveId, 0, 0, 0] as const),
    pp: Object.freeze([16, 0, 0, 0] as const),
    statStages: NEUTRAL_STAT_STAGES,
    status1: config.status1 ?? 0,
    maxHP: config.maxHp ?? config.hp,
    partyIndex: 0,
  });
}

function partySlot(config: FactoryFullTurnBattlerConfig): BattleScriptPartyMemberInput {
  return { species: config.species, isEgg: false, hp: config.hp, status1: config.status1 ?? 0 };
}

const EMPTY_PARTY_SLOT: BattleScriptPartyMemberInput = Object.freeze({ species: 0, isEgg: false, hp: 0 });

function createInitialRules(config: FactoryFullTurnConfig): FactoryFullTurnDecisionRules {
  const playerParty = Object.freeze([
    partySlot(config.player),
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
  ]);
  const opponentParty = Object.freeze([
    partySlot(config.trainer),
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
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
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
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
      pendingPlayerDecision: null | Readonly<{ moveSlot: 0; targetBattler: BattleSinglesBattler }>;
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
    resolveHalfwordOperand: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
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
  target: BattleScriptBattlerId,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    ...priorRulesContext,
    selectorRoles: { attacker: mover, target, effectBattler: target, fainted: null },
    scriptingBattler: mover,
    currentMove: moveId,
    currentMovePosition: 0,
    chosenMove: moveId,
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
  target: BattleScriptBattlerId,
): ActionResult {
  const topology = TOPOLOGY_BY_MOVE.get(moveId);
  if (!topology) throw new Error(`move ${moveId} has no source Battle Script entry`);
  const actionContext = buildActionContext(priorState.rulesContext, mover, moveId, target);
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

function eventPayloads(state: MachineState) {
  return Object.freeze(state.events.map((event) => {
    const { sequence: _sequence, provenance: _provenance, ...payload } = event;
    return Object.freeze(payload);
  }));
}

export const reduceFactoryFullTurnDecision: BattleDecisionReducer<FactoryFullTurnDecisionRules> = (
  ctx,
) => {
  const rules = rulesAt(ctx.rules);

  if (rules.phase === "awaiting-player-command") {
    if (
      ctx.request.kind !== "command"
      || ctx.request.side !== "player"
      || ctx.request.battler !== 0
      || ctx.decision.kind !== "use-move"
      || ctx.decision.moveSlot !== 0
    ) {
      throw new Error("factory full-turn decision requires the player's staged singles use-move command");
    }
    return Object.freeze({
      rules: buildRules(
        rules.rulesContext,
        "awaiting-trainer-command",
        Object.freeze({ moveSlot: 0 as const, targetBattler: ctx.decision.targetBattler }),
      ),
      events: [],
      boundary: Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: ctx.request.requestId + 1,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: Object.freeze([
            Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const }),
          ]),
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
    || ctx.decision.moveSlot !== 0
    || rules.pendingPlayerDecision === null
  ) {
    throw new Error("factory full-turn decision requires the trainer's staged singles use-move command");
  }

  const rc0 = rules.rulesContext;
  const playerMoveId = rc0.battlers[0]!.moves[0];
  const trainerMoveId = rc0.battlers[1]!.moves[0];
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
  const mover1Target: BattleScriptBattlerId = playerFirst ? playerTarget : trainerTarget;
  const mover2: BattleScriptBattlerId = playerFirst ? 1 : 0;
  const mover2MoveId = playerFirst ? trainerMoveId : playerMoveId;
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
    rulesContext: rc0,
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  function finish(
    finalState: MachineState,
    resultRules: FactoryFullTurnDecisionRules,
    boundary: BattleBoundary,
  ) {
    for (const entry of finalState.rng.ledger) ctx.rng.draw(entry.reason);
    const rngAfter = ctx.rng.snapshot();
    // finalState.rng is a machine-local ledger (calls always starts at 0 per
    // reducer invocation, battleScriptMachine.ts's own createBattleScriptRngState
    // contract) -- rngAfter.calls is the whole-battle cumulative counter
    // (BattleState.rng.calls, carried across every prior turn's submissions),
    // so the two are compared via rngBefore's own cumulative count, not
    // directly against each other (a single-invocation adapter like
    // factoryBattleScriptTerminalDecision.ts never has to make this
    // distinction, since its rngBefore.calls is always 0).
    if (rngAfter.value !== finalState.rng.value || rngAfter.calls !== rngBefore.calls + finalState.rng.calls) {
      throw new Error("full-turn reducer RNG reconciliation diverged from the decision boundary cursor");
    }
    return Object.freeze({
      rules: resultRules,
      events: eventPayloads(finalState),
      boundary,
    });
  }

  const action1 = runMoveAction(PROGRAM, handlers, initialState, mover1, mover1MoveId, mover1Target);
  if (action1.kind === "barrier") {
    return finish(
      action1.state,
      buildRules(action1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(action1.instruction, action1.state.instructionsExecuted),
    );
  }

  const faint1 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action1.state);
  if (faint1.kind === "terminal") {
    return finish(
      faint1.state,
      buildRules(faint1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      Object.freeze({ kind: "terminal", outcome: mapFactoryBattleOutcome(faint1.state.rulesContext.battleOutcome) }),
    );
  }
  if (faint1.kind === "non-terminal-barrier") {
    return finish(
      faint1.state,
      buildRules(faint1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(faint1.instruction, faint1.state.instructionsExecuted),
    );
  }
  if (faint1.kind === "player-choice-required") {
    throw new Error(
      "full-turn reducer's fainted-actions orchestration produced a player-choice-required forced-switch "
        + "request -- outside this reducer's modeled domain (factoryBattleScriptTerminalDecision.ts's own "
        + "forced-switch resume support is the single-action sibling that models this)",
    );
  }

  // faint1.kind is "no-fainted-battlers" (run action 2) or "resumed" (skip action 2, per cancelallactions).
  let preEndTurnState = faint1.state;
  if (faint1.kind === "no-fainted-battlers") {
    const action2 = runMoveAction(PROGRAM, handlers, faint1.state, mover2, mover2MoveId, mover2Target);
    if (action2.kind === "barrier") {
      return finish(
        action2.state,
        buildRules(action2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(action2.instruction, action2.state.instructionsExecuted),
      );
    }
    const faint2 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action2.state);
    if (faint2.kind === "terminal") {
      return finish(
        faint2.state,
        buildRules(faint2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        Object.freeze({ kind: "terminal", outcome: mapFactoryBattleOutcome(faint2.state.rulesContext.battleOutcome) }),
      );
    }
    if (faint2.kind === "non-terminal-barrier") {
      return finish(
        faint2.state,
        buildRules(faint2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(faint2.instruction, faint2.state.instructionsExecuted),
      );
    }
    if (faint2.kind === "player-choice-required") {
      throw new Error(
        "full-turn reducer's fainted-actions orchestration produced a player-choice-required forced-switch "
          + "request -- outside this reducer's modeled domain (factoryBattleScriptTerminalDecision.ts's own "
          + "forced-switch resume support is the single-action sibling that models this)",
      );
    }
    preEndTurnState = faint2.state; // "no-fainted-battlers" or "resumed"
  }

  const endTurn = runBattleEndTurnOrchestration(PROGRAM, handlers, preEndTurnState);
  if (endTurn.kind === "terminal") {
    return finish(
      endTurn.state,
      buildRules(endTurn.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      Object.freeze({ kind: "terminal", outcome: mapFactoryBattleOutcome(endTurn.state.rulesContext.battleOutcome) }),
    );
  }
  if (endTurn.kind === "non-terminal-barrier") {
    return finish(
      endTurn.state,
      buildRules(endTurn.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
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
  return finish(
    endTurn.state,
    buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
    Object.freeze({
      kind: "decision-required",
      request: Object.freeze({
        kind: "command",
        requestId: ctx.request.requestId + 1,
        side: "player",
        battler: 0 as const,
        legalDecisions: Object.freeze([
          Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const }),
        ]),
      }),
    }),
  );
};

export function submitFactoryFullTurnDecision(
  state: BattleState<FactoryFullTurnDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  return submitBattleDecision(state, submission, reduceFactoryFullTurnDecision);
}
