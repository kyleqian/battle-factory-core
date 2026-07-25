/**
 * S10 step (iv) part 2/3: a sibling of factoryBattleScriptDecision.ts's
 * reduceFactoryAsleepMoveDecision, scoped to the opposite edge of the same
 * decision-reducer flow -- a staged Level-50 Factory singles turn whose
 * submitted move is the killing blow on the opponent's last healthy party
 * member. Wires the real registered hit chain
 * (BattleScript_HitFromAtkCanceler onward) into the new
 * HandleFaintedMonActions orchestration equivalent
 * (battleScriptFaintedActionsOrchestration.ts), producing the kernel's FIRST
 * genuine `{ kind: "terminal", outcome }` boundary -- computed by
 * checkteamslost from the staged party slice, never fabricated.
 *
 * A sibling reducer rather than growing reduceFactoryAsleepMoveDecision: that
 * adapter's own rulesAt validates a sleeping-attacker phase and always stops
 * at the move-end barrier by design (ROADMAP step (iii)'s own boundary);
 * this one's scenario is a different battler roster and always continues
 * past moveend into the fainted-actions orchestration.
 *
 * Starts execution at the move's own topology entryScript
 * (BattleScript_EffectHit), not the BattleScript_HitFromAtkCanceler shortcut
 * earlier RUNG 4 proofs used: EFFECT_HIT's shared script opens with
 * `jumpifnotmove MOVE_SURF, BattleScript_HitFromAtkCanceler`
 * (data/battle_scripts_1.s:237), compiled to B_SCR_OP_JUMPIFHALFWORD --
 * registered by the executable-frontier census (2026-07-25), along with its
 * two guard siblings (B_SCR_OP_JUMPIFSTATUS3CONDITION, B_SCR_OP_ORWORD), so
 * this adapter no longer needs to route around the script's own entry.
 */
import {
  createBattleState,
  submitBattleDecision,
  type BattleDecisionReducer,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleOutcome,
  type BattleSinglesBattler,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import { runBattleScriptFaintedActionsOrchestration } from "./battleScriptFaintedActionsOrchestration.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_PARTY_SIZE,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";

const ADAPTER = "factory-terminal-ko/v1";
const ENTRY_LABEL = "BattleScript_EffectHit";
const B_WAIT_TIME_LONG = 64;
/** include/constants/battle.h:100-102. */
const B_OUTCOME_WON = 1;
const B_OUTCOME_LOST = 2;
const B_OUTCOME_DREW = 3;

const PROGRAM = loadBattleScriptProgram();
const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const ZERO_STAT_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

/** Pins the raw B_OUTCOME_* byte (`Cmd_checkteamslost`'s only writer) onto the kernel's 3-valued BattleOutcome. */
export function mapFactoryBattleOutcome(battleOutcome: number): BattleOutcome {
  if (battleOutcome === B_OUTCOME_WON) return "player-win";
  if (battleOutcome === B_OUTCOME_LOST) return "trainer-win";
  if (battleOutcome === B_OUTCOME_DREW) return "draw";
  throw new Error(
    `battleOutcome ${battleOutcome} is outside the terminal WON(1)/LOST(2)/DREW(3) domain`,
  );
}

export type FactoryTerminalMoveConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  attackerMoveId: number;
  attackerAttack: number;
  targetDefense: number;
  targetHp: number;
  /**
   * The opponent's two other Level-50 Factory party slots' HP, staged
   * pre-fainted (or not) directly in this rules-context constructor -- this
   * is what lets the orchestration's terminal-vs-non-terminal fork be
   * proven without replaying two prior battles' worth of hit chains.
   */
  opponentBenchHp: readonly [number, number];
  /**
   * Optional per-slot override (species/moves) for the two bench slots above
   * -- both otherwise share `STAGED_OPPONENT_SPECIES`'s real types with no
   * moves, which can never satisfy `GetMostSuitableMonToSwitchInto`'s pass-1
   * super-effective-move gate (`battleAiSwitchInto.ts`). Lets the non-
   * terminal fork's own integration proof stage a real switch-in candidate
   * (e.g. MACHOP + a real Fighting move) without altering either existing
   * fixture's bench.
   */
  opponentBenchOverride?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
  /**
   * Which side delivers the staged killing blow. Defaults to "player" (the
   * original WON-path staging: the player's mon kills the opponent's last
   * mon). "trainer" mirrors the identical hit chain onto the player's own
   * (sole modeled) party slot instead -- same move math, opposite roles --
   * for a real trainer-win (LOST) integration proof
   * (battleResolutionAdapter.test.ts) with no new kernel modeling.
   */
  attackingSide?: "player" | "trainer";
}>;

export type FactoryTerminalDecisionRules = BattleJsonObject & Readonly<{
  adapter: typeof ADAPTER;
  phase: "awaiting-command" | "non-terminal-barrier" | "terminal";
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

/** include/species.h -- an arbitrary real nonzero species id, only its non-zero-ness is load-bearing. */
const STAGED_PLAYER_SPECIES = 1; // SPECIES_BULBASAUR
const STAGED_OPPONENT_SPECIES = 43; // SPECIES_ODDISH -- TYPE_GRASS, matching the staged target's real type

function partySlot(hp: number, alive: boolean): BattleScriptPartyMemberInput {
  return { species: alive ? STAGED_OPPONENT_SPECIES : 0, isEgg: false, hp };
}

/**
 * `attackingSide` picks which battler ID is the mover vs. the defender --
 * everything downstream (`selectorRoles`, the submission's `side`/`battler`,
 * which physical party the fatal HP write lands in via `battler.side`,
 * `battleScriptRulesContext.ts:1244`) is symmetric in battler ID, so this is
 * the only branch point needed to mirror the WON staging into a LOST one.
 */
function resolveAttackingRoles(
  attackingSide: "player" | "trainer",
): Readonly<{ moverBattler: BattleSinglesBattler; defenderBattler: BattleSinglesBattler }> {
  const moverBattler: BattleSinglesBattler = attackingSide === "player" ? 0 : 1;
  const defenderBattler: BattleSinglesBattler = moverBattler === 0 ? 1 : 0;
  return { moverBattler, defenderBattler };
}

function createInitialRules(config: FactoryTerminalMoveConfig): FactoryTerminalDecisionRules {
  const attackingSide = config.attackingSide ?? "player";
  const { moverBattler, defenderBattler } = resolveAttackingRoles(attackingSide);

  const mover: BattleScriptRulesBattlerState = Object.freeze({
    ...emptyBattler(moverBattler),
    hp: 100,
    species: STAGED_PLAYER_SPECIES,
    attack: config.attackerAttack,
    level: 50,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: Object.freeze([config.attackerMoveId, 0, 0, 0] as const),
    pp: Object.freeze([16, 0, 0, 0] as const),
    statStages: NEUTRAL_STAT_STAGES,
    partyIndex: moverBattler === 0 ? 0 : 2,
  });
  const defender: BattleScriptRulesBattlerState = Object.freeze({
    ...emptyBattler(defenderBattler),
    hp: config.targetHp,
    species: STAGED_OPPONENT_SPECIES,
    defense: config.targetDefense,
    level: 50,
    types: Object.freeze(["TYPE_GRASS", "TYPE_GRASS"] as const),
    statStages: NEUTRAL_STAT_STAGES,
    partyIndex: defenderBattler === 0 ? 0 : 2,
  });
  const battlers: readonly [
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
    BattleScriptRulesBattlerState,
  ] = moverBattler === 0
    ? [mover, defender, emptyBattler(0), emptyBattler(1)]
    : [defender, mover, emptyBattler(0), emptyBattler(1)];

  // The player side has exactly one modeled party slot; the opponent side has
  // three (bench + the acting slot). Whichever role (mover/defender) sits on
  // a given side owns that side's real HP value -- the other side's shape is
  // unchanged from the original WON staging.
  const playerSlot0Hp = moverBattler === 0 ? 100 : config.targetHp;
  const opponentSlot2Hp = moverBattler === 0 ? config.targetHp : 100;
  const opponentParty = Object.freeze([
    { ...partySlot(config.opponentBenchHp[0], true), ...config.opponentBenchOverride?.[0] },
    { ...partySlot(config.opponentBenchHp[1], true), ...config.opponentBenchOverride?.[1] },
    partySlot(opponentSlot2Hp, true),
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
  ]) as unknown as readonly BattleScriptPartyMemberInput[];
  const playerParty = Object.freeze([
    { species: STAGED_PLAYER_SPECIES, isEgg: false, hp: playerSlot0Hp },
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
    { species: 0, isEgg: false, hp: 0 },
  ]) as unknown as readonly BattleScriptPartyMemberInput[];
  if (opponentParty.length !== BATTLE_SCRIPT_PARTY_SIZE) {
    throw new Error("staged opponent party must contain exactly PARTY_SIZE slots");
  }

  const rulesContext = createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: moverBattler, target: defenderBattler, effectBattler: defenderBattler, fainted: null },
    scriptingBattler: moverBattler,
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
    phase: "awaiting-command",
    rulesContext,
  }) as FactoryTerminalDecisionRules;
}

export function createFactoryTerminalMoveBattleState(
  config: FactoryTerminalMoveConfig,
): BattleState<FactoryTerminalDecisionRules> {
  const rules = createInitialRules(config);
  const { moverBattler, defenderBattler } = resolveAttackingRoles(config.attackingSide ?? "player");
  return createBattleState({
    rules,
    rngSeed: config.rngSeed,
    request: {
      kind: "command",
      requestId: config.requestId,
      side: moverBattler === 0 ? "player" : "trainer",
      battler: moverBattler,
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: defenderBattler }],
    },
  }) as BattleState<FactoryTerminalDecisionRules>;
}

function rulesAt(input: FactoryTerminalDecisionRules): FactoryTerminalDecisionRules {
  if (
    input === null
    || typeof input !== "object"
    || (input as { adapter?: unknown }).adapter !== ADAPTER
    || (input as { phase?: unknown }).phase !== "awaiting-command"
  ) {
    throw new Error("factory terminal decision requires an awaiting-command staged rules payload");
  }
  const rulesContext = createBattleScriptRulesContext(
    (input as { rulesContext: unknown }).rulesContext as never,
  );
  return Object.freeze({ adapter: ADAPTER, phase: "awaiting-command", rulesContext });
}

function externalPorts(attacker: 0 | 1): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>) =>
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
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
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

export const reduceFactoryTerminalMoveDecision: BattleDecisionReducer<FactoryTerminalDecisionRules> = (
  context,
) => {
  const rules = rulesAt(context.rules);
  const attacker = rules.rulesContext.selectorRoles.attacker;
  if (
    context.request.kind !== "command"
    || attacker === null
    || context.request.battler !== attacker
    || context.decision.kind !== "use-move"
    || context.decision.moveSlot !== 0
  ) {
    throw new Error("factory terminal decision adapter requires its staged singles use-move command");
  }
  const targetBattler = context.decision.targetBattler;
  const moveId = rules.rulesContext.battlers[attacker].moves[context.decision.moveSlot];
  if (moveId === 0) throw new Error("staged move slot 0 is not usable");

  const selectedContext = createBattleScriptRulesContext({
    ...rules.rulesContext,
    selectorRoles: { attacker, target: targetBattler, effectBattler: targetBattler, fainted: null },
    scriptingBattler: attacker,
    currentMove: moveId,
    currentMovePosition: 0,
    chosenMove: moveId,
  });

  const ports = externalPorts(attacker);
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, ports);
  const rngBefore = context.rng.snapshot();
  let machine = createBattleScriptStatusRulesExecution(
    PROGRAM,
    ENTRY_LABEL,
    selectedContext,
    rngBefore.value,
    ports,
  ).state;

  let scriptComplete = false;
  for (let budget = 0; budget < 256; budget += 1) {
    const barrierInstruction = PROGRAM.instructions[machine.programCounter];
    if (!barrierInstruction) {
      throw new Error(`Battle Script left the committed program at ${machine.programCounter}`);
    }
    if (!handlers[barrierInstruction.opcodeId]) {
      throw new Error(
        `factory terminal decision hit unregistered opcode ${barrierInstruction.opcodeName} before its own `
          + "script completed -- outside this rung's staged singles hit-chain scope",
      );
    }
    const stepped = stepBattleScriptMachine(PROGRAM, machine, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(machine);
      if (acknowledged === machine) {
        throw new Error("Battle Script blocked without a safe controller acknowledgement");
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
      throw new Error(`Battle Script stopped before its own script completed: ${stepped.kind}`);
    }
    machine = acknowledgePendingControllers(stepped.state);
  }
  if (!scriptComplete) {
    throw new Error("factory terminal decision's staged hit chain did not reach its own script end");
  }

  const orchestration = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, machine);
  if (orchestration.kind === "no-fainted-battlers") {
    throw new Error(
      "factory terminal decision adapter requires the submitted move to be the killing blow "
        + "(HandleFaintedMonActions found nothing fainted)",
    );
  }

  // Mirror the machine's own internal RNG cursor onto the decision boundary's
  // cursor: both are the identical deterministic LCG starting from the same
  // rngBefore.value, so replaying the same call count/order lands on the same
  // final value (the orchestration itself draws zero further Random() calls,
  // docs/faint-outcome-ground-truth.md §2b, so machine.rng already equals
  // orchestration.state.rng here).
  for (const entry of machine.rng.ledger) context.rng.draw(entry.reason);
  const rngAfter = context.rng.snapshot();
  if (rngAfter.value !== orchestration.state.rng.value || rngAfter.calls !== orchestration.state.rng.calls) {
    throw new Error("Battle Script RNG reconciliation diverged from the decision boundary cursor");
  }

  if (orchestration.kind === "non-terminal-barrier") {
    const barrierInstruction = orchestration.instruction;
    return Object.freeze({
      rules: Object.freeze({
        adapter: ADAPTER,
        phase: "non-terminal-barrier",
        rulesContext: orchestration.state.rulesContext,
      }) as FactoryTerminalDecisionRules,
      events: eventPayloads(orchestration.state),
      boundary: Object.freeze({
        kind: "machine-barrier",
        barrier: Object.freeze({
          kind: "battle-script",
          entryLabel: "BattleScript_HandleFaintedMon",
          programCounter: barrierInstruction.programCounter,
          opcodeId: barrierInstruction.opcodeId,
          opcodeName: barrierInstruction.opcodeName,
          dispatcher: barrierInstruction.dispatcher,
          instructionsExecuted: orchestration.state.instructionsExecuted,
        }),
      }),
    });
  }

  if (orchestration.kind === "resumed") {
    // The battle genuinely resumes (docs/forced-switch-ground-truth.md §1c): source re-enters
    // HandleTurnActionSelectionState. End-turn orchestration (dual-sided submission, turn-order
    // priority, the AI's own next move pick) is out of this adapter's scope, so the next boundary
    // reuses this adapter's own established single-command-per-turn shape: the mover's side is
    // asked again with its one already-known legal decision, now targeting the switched-in battler.
    return Object.freeze({
      rules: Object.freeze({
        adapter: ADAPTER,
        phase: "awaiting-command",
        rulesContext: orchestration.state.rulesContext,
      }) as FactoryTerminalDecisionRules,
      events: eventPayloads(orchestration.state),
      boundary: Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: context.request.requestId + 1,
          side: context.request.side,
          battler: attacker,
          legalDecisions: Object.freeze([
            Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler }),
          ]),
        }),
      }),
    });
  }

  const outcome = mapFactoryBattleOutcome(orchestration.state.rulesContext.battleOutcome);
  return Object.freeze({
    rules: Object.freeze({
      adapter: ADAPTER,
      phase: "terminal",
      rulesContext: orchestration.state.rulesContext,
    }) as FactoryTerminalDecisionRules,
    events: eventPayloads(orchestration.state),
    boundary: Object.freeze({ kind: "terminal", outcome }),
  });
};

export function submitFactoryTerminalMoveDecision(
  state: BattleState<FactoryTerminalDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryTerminalDecisionRules> {
  return submitBattleDecision(state, submission, reduceFactoryTerminalMoveDecision);
}
