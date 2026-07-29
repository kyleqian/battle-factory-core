/**
 * S10 step (iv) part 2: `HandleFaintedMonActions` orchestration equivalent
 * (`reference/pokeemerald/src/battle_util.c:1894-1971`).
 *
 * This is deliberately NOT a Battle Script opcode. Source runs it from the
 * C main loop's action-func cycle (`HandleAction_TryFinish`, `:638-645`),
 * once the acting battler's own move script has finished (its own
 * `BattleScriptExecute` reached `end`/`end2`) -- a wholly separate state
 * machine from the Battle Script VM's own call/return mechanism
 * (`docs/faint-outcome-ground-truth.md` §3.1). Callers invoke this only
 * after the move script's own halt reports `kind: "terminal"`.
 *
 * Source states, and how each maps here:
 *  - state 0: clears `gAbsentBattlerFlags` bits for battlers that regained a
 *    switch-in-able mon. Not modeled: this engine's singles adapters always
 *    keep battlers 2/3 (the unused doubles slots) absent, and
 *    `HasNoMonsToSwitch` is always true for them, so on the only domain this
 *    orchestration is proven against (`battleTopology.battlersCount === 2`)
 *    the loop is a real, provable no-op.
 *  - states 1-2: `BattleScriptExecute(BattleScript_GiveExp)` per fainted
 *    battler (`gBattlerFainted = gBattlerTarget = faintedActionsBattlerId`
 *    reassigned first, `:1915`) plus `OpponentSwitchInResetSentPokesToOpponentValue`
 *    (an unmodeled field with no reader anywhere in this engine's terminal
 *    path -- not observable here).
 *  - states 3-5: `BattleScriptExecute(BattleScript_HandleFaintedMon)` per
 *    fainted battler, same reassignment. This is the script that actually
 *    runs `checkteamslost`/`jumpifbyte` and decides the real terminal
 *    `gBattleOutcome` -- and, per `docs/forced-switch-ground-truth.md` §4,
 *    now also runs the full non-terminal forced-switch dance
 *    (`openpartyscreen` through `cancelallactions`) when the fainted
 *    battler's side still has a healthy replacement.
 *  - state 6: Intimidate1/Trace/held-item/Forecast switch-in hooks, which
 *    react to flags `Cmd_switchineffects`'s own `AbilityBattleEffects
 *    (ABILITYEFFECT_ON_SWITCHIN)` call sets. `battleScriptSwitchinOpcode.ts`
 *    barriers that same call whenever the switched-in battler's ability is
 *    one that would set those flags -- so if `Cmd_switchineffects` ever
 *    advances past itself on a path this orchestration completes, no such
 *    flag was set and state 6 is guaranteed a no-op, not a silently skipped
 *    branch.
 *
 * Source only ever queues ONE `BattleScriptExecute` call per
 * `HandleFaintedMonActions` invocation and returns control to the main loop
 * (multiple real invocations resume the loop via its persisted
 * `faintedActionsState`). This module instead drives each queued script all
 * the way to ITS OWN halt before considering the next fainted battler --
 * behaviorally identical while preserving the source loop's battler cursor:
 * a contact ability such as Rough Skin can faint the singles attacker after
 * the target already reached zero HP. If the player-side handler pauses for
 * a replacement, the resume path finishes that script and then continues the
 * still-pending higher battler indexes before leaving fainted actions.
 */
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

const GIVE_EXP_LABEL = "BattleScript_GiveExp";
const HANDLE_FAINTED_MON_LABEL = "BattleScript_HandleFaintedMon";
const INTIMIDATE_LABEL = "BattleScript_IntimidateActivatesEnd3";
const TRACE_LABEL = "BattleScript_TraceActivates";
const WHITE_HERB_END2_LABEL = "BattleScript_WhiteHerbEnd2";
/** include/constants/abilities.h: source ids for state-6's two pending ability passes. */
const PENDING_ENTRY_ABILITY = Object.freeze({ intimidate: 22, trace: 36 });
const ITEM_WHITE_HERB = 180;
const STATUS3_INTIMIDATE_POKES = 1 << 19;
const STATUS3_TRACE = 1 << 20;
/**
 * Real per-script instruction ceiling; both scripts complete in single
 * digits. Doubled from the pre-forced-switch pin (32) because the forced-
 * switch dance's own controller round trips (`getswitchedmondata`,
 * `switchinanim`, `hidepartystatussummary`) each cost one extra
 * blocked-then-acknowledged budget tick per opcode, per the auto-
 * acknowledgement loop below.
 */
const SCRIPT_BUDGET = 2_000;

export type BattleScriptFaintedActionsResult =
  | Readonly<{
    /** Source: HandleFaintedMonActions returns FALSE with nothing to do. */
    kind: "no-fainted-battlers";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
  }>
  | Readonly<{
    /**
     * Every fainted battler's BattleScript_HandleFaintedMon reached
     * BattleScript_FaintedMonEnd via checkteamslost's own terminal jump
     * (`state.rulesContext.battleOutcome` is nonzero -- the real, computed
     * WON/LOST/DREW byte).
     */
    kind: "terminal";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
  }>
  | Readonly<{
    /**
     * Every fainted battler's BattleScript_HandleFaintedMon reached
     * BattleScript_FaintedMonEnd via the full forced-switch dance
     * (`docs/forced-switch-ground-truth.md` §4) instead of checkteamslost's
     * terminal jump -- `battleOutcome` is still 0 (undecided) and a healthy
     * replacement is now the active battler. The battle genuinely resumes:
     * source's `BattleTurnPassed` would re-enter `HandleTurnActionSelectionState`
     * from here (§1c) -- a real next decision boundary, not a fake terminal.
     */
    kind: "resumed";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
  }>
  | Readonly<{
    /**
     * A fainted battler's own side still has a healthy party member:
     * checkteamslost's jumpifbyte did not take the FaintedMonEnd branch, so
     * BattleScript_HandleFaintedMon fell into the forced-switch dance
     * (`jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose`),
     * which is unregistered -- a real, named machine boundary, not a fake
     * terminal.
     */
    kind: "non-terminal-barrier";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
    /**
     * The unregistered instruction the script halted on -- real source
     * is `jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose`,
     * which is itself a macro expanding to plain `jumpifword`
     * (`asm/macros/battle_script.inc:1434-1436`), so `opcodeName` here reads
     * `B_SCR_OP_JUMPIFWORD`, not a distinct "jumpifbattletype" opcode.
     */
    instruction: BattleScriptInstruction;
  }>
  | Readonly<{
    /**
     * The fainted battler is player-side and its own party still has a
     * legal replacement (`docs/forced-switch-ground-truth.md` §3/§4 slice
     * 10): `openpartyscreen`'s player branch halted with a real, genuine
     * `"player-choice-required"` reason (`battleScriptMachine.ts`) instead
     * of an unsupported placeholder. `state` is paused mid-script (NOT yet
     * at `BattleScript_FaintedMonEnd`) -- a caller resumes it with
     * `resumeBattleScriptFaintedActionsAfterPlayerChoice` once the human
     * picks a legal slot from `legalPartyIndexes`.
     */
    kind: "player-choice-required";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
    battler: BattleScriptBattlerId;
    faintedPartyIndex: number;
    legalPartyIndexes: readonly number[];
  }>;

function collectFaintedBattlers(
  rulesContext: BattleScriptRulesContext,
): readonly BattleScriptBattlerId[] {
  const battlersCount = rulesContext.battleTopology.battlersCount;
  const fainted: BattleScriptBattlerId[] = [];
  for (let battler = 0; battler < battlersCount; battler += 1) {
    if (rulesContext.battlers[battler]!.hp === 0) {
      fainted.push(battler as BattleScriptBattlerId);
    }
  }
  return Object.freeze(fainted);
}

/** `gBattlerFainted = gBattlerTarget = gBattleStruct->faintedActionsBattlerId` (`battle_util.c:1915/1941`). */
function enterFaintedBattlerContext(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  faintedBattler: BattleScriptBattlerId,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const roles = state.rulesContext.selectorRoles;
  if (roles.target === faintedBattler && roles.fainted === faintedBattler) return state;
  return Object.freeze({
    ...state,
    rulesContext: Object.freeze({
      ...state.rulesContext,
      selectorRoles: Object.freeze({ ...roles, target: faintedBattler, fainted: faintedBattler }),
    }),
  });
}

/**
 * `BattleScriptExecute(script)`: `gBattlescriptCurrInstr = script;
 * gBattleResources->battleScriptsStack->size = 0;` (a fresh top-level script,
 * call stack reset) -- carries the rules/RNG/event/scheduler state forward
 * exactly as the real global state does across the call.
 */
function startBattleScriptExecute(
  program: BattleScriptProgram,
  entryLabel: string,
  priorState: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
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

type RunToOwnEndResult =
  | Readonly<{ kind: "terminal"; state: BattleScriptMachineState<BattleScriptRulesContext> }>
  | Readonly<{
    kind: "barrier";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
    instruction: BattleScriptInstruction;
  }>
  | Readonly<{
    kind: "player-choice";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
    battler: BattleScriptBattlerId;
    faintedPartyIndex: number;
    legalPartyIndexes: readonly number[];
  }>;

/**
 * Acknowledges every pending controller battler unconditionally -- the same
 * transparent-passthrough model `factoryBattleScriptTerminalDecision.ts`'s
 * own hit-chain loop already uses for controller round trips: this engine
 * has no real async "wait for frames" concept at the Tier-1 level, so a
 * `blocked` step always resolves on the very next tick.
 */
function acknowledgeAllPendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

/**
 * Runs one already-started `BattleScriptExecute` script to its own
 * `end`/`end2` halt, or stops the instant an unregistered opcode is reached.
 * `BattleScript_GiveExp`/`BattleScript_HandleFaintedMon`'s pre-forced-switch
 * opcodes never wait on a controller, but the forced-switch dance's own
 * round trips (`getswitchedmondata`, `switchinanim`, `hidepartystatussummary`,
 * `drawpartystatussummary`) do mark a battler pending -- `blocked` steps are
 * auto-acknowledged here rather than left for the caller. Spikes also reaches
 * the shared waitmessage scheduler; its scheduler-only progress is likewise
 * transparent and consumes no script instruction.
 */
function runScriptToOwnEnd(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  initialState: BattleScriptMachineState<BattleScriptRulesContext>,
): RunToOwnEndResult {
  let state = initialState;
  for (let budget = 0; budget < SCRIPT_BUDGET; budget += 1) {
    const instruction = program.instructions[state.programCounter];
    if (!instruction) {
      throw new Error(`fainted-actions orchestration left the committed program at ${state.programCounter}`);
    }
    if (!handlers[instruction.opcodeId]) {
      return Object.freeze({ kind: "barrier", state, instruction });
    }
    const stepped = stepBattleScriptMachine(program, state, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgeAllPendingControllers(stepped.state);
      if (acknowledged === stepped.state) {
        // pause/waitmessage may establish only scheduler time, with no
        // controller owner. Preserve that scheduler state and let the next
        // machine step advance its bounded wait.
        state = stepped.state;
        continue;
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind === "scheduler-progressed") {
      state = stepped.state;
      continue;
    }
    if (stepped.kind === "halted") {
      const haltReason = stepped.state.haltReason;
      if (haltReason?.kind === "terminal" || haltReason?.kind === "end3") {
        return Object.freeze({ kind: "terminal", state: stepped.state });
      }
      if (haltReason?.kind === "player-choice-required") {
        return Object.freeze({
          kind: "player-choice",
          state: stepped.state,
          battler: haltReason.battler,
          faintedPartyIndex: haltReason.faintedPartyIndex,
          legalPartyIndexes: haltReason.legalPartyIndexes,
        });
      }
      // A registered opcode's own (b) barrier (e.g. openpartyscreen's pass-2
      // unsupported-branch halt) is the same kind of real machine boundary as an
      // unregistered opcode -- surface it the same way, not a crash.
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind !== "advanced") {
      throw new Error(
        `fainted-actions orchestration hit an unexpected ${stepped.kind} step inside `
          + `${instruction.source.label} -- outside this rung's modeled (setbyte/getexp/checkteamslost/`
          + "jumpifbyte/openpartyscreen/end2) domain",
      );
    }
    state = stepped.state;
  }
  throw new Error("fainted-actions orchestration exceeded its per-script instruction budget");
}

/**
 * The C-side `HandleFaintedMonActions` loop equivalent. Call once a hit
 * chain's own move script halts with `haltReason.kind === "terminal"`.
 */
export function runBattleScriptFaintedActionsOrchestration(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  initialState: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptFaintedActionsResult {
  const faintedBattlers = collectFaintedBattlers(initialState.rulesContext);
  if (faintedBattlers.length === 0) {
    return Object.freeze({
      kind: "no-fainted-battlers",
      state: runPendingSwitchinEffects(program, handlers, initialState),
    });
  }

  let state = initialState;
  for (const faintedBattler of faintedBattlers) {
    state = enterFaintedBattlerContext(state, faintedBattler);
    const started = startBattleScriptExecute(program, GIVE_EXP_LABEL, state);
    const run = runScriptToOwnEnd(program, handlers, started);
    if (run.kind === "barrier") {
      throw new Error(
        `BattleScript_GiveExp hit unregistered opcode ${run.instruction.opcodeName} -- outside `
          + "this rung's Frontier short-circuit scope (docs/faint-outcome-ground-truth.md §1a row 10)",
      );
    }
    if (run.kind === "player-choice") {
      throw new Error("BattleScript_GiveExp unexpectedly halted on a player-choice-required opcode");
    }
    state = run.state;
  }

  return runFaintedBattlerHandlers(program, handlers, state, faintedBattlers);
}

function replaceBattler(
  rules: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  patch: Partial<BattleScriptRulesContext["battlers"][number]>,
): BattleScriptRulesContext {
  const battlers = rules.battlers.map((candidate, index) =>
    index === battler ? Object.freeze({ ...candidate, ...patch }) : candidate
  ) as unknown as BattleScriptRulesBattlers;
  return Object.freeze({ ...rules, battlers: Object.freeze(battlers) });
}

function requireCompletedPendingScript(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  label: string,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const result = runScriptToOwnEnd(program, handlers, startBattleScriptExecute(program, label, state));
  if (result.kind !== "terminal") {
    throw new Error(`fainted-actions state 6 ${label} did not complete (${result.kind})`);
  }
  return result.state;
}

/** `HandleFaintedMonActions` state 6: pending Intimidate, Trace, then the reachable White Herb item pass. */
function runPendingSwitchinEffects(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  initialState: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let state = initialState;
  for (let battler = 0; battler < state.rulesContext.battleTopology.battlersCount; battler += 1) {
    const id = battler as BattleScriptBattlerId;
    const active = state.rulesContext.battlers[id];
    if (active.ability !== PENDING_ENTRY_ABILITY.intimidate || (active.status3 & STATUS3_INTIMIDATE_POKES) === 0) continue;
    const rules = replaceBattler(state.rulesContext, id, {
      status3: (active.status3 & ~STATUS3_INTIMIDATE_POKES) >>> 0,
    });
    state = requireCompletedPendingScript(program, handlers, Object.freeze({
      ...state,
      haltReason: null,
      rulesContext: Object.freeze({
        ...rules,
        scriptingBattler: id,
        lastUsedAbility: PENDING_ENTRY_ABILITY.intimidate,
      }),
    }), INTIMIDATE_LABEL);
  }
  for (let battler = 0; battler < state.rulesContext.battleTopology.battlersCount; battler += 1) {
    const id = battler as BattleScriptBattlerId;
    const active = state.rulesContext.battlers[id];
    if (active.ability !== PENDING_ENTRY_ABILITY.trace || (active.status3 & STATUS3_TRACE) === 0) continue;
    const target = state.rulesContext.battlers.findIndex((candidate, index) =>
      index < state.rulesContext.battleTopology.battlersCount
      && candidate.side !== active.side
      && candidate.hp !== 0
      && candidate.ability !== 0
    );
    if (target < 0) continue;
    const opposing = target as BattleScriptBattlerId;
    const copiedAbility = state.rulesContext.battlers[opposing].ability;
    const rules = replaceBattler(state.rulesContext, id, {
      ability: copiedAbility,
      status3: (active.status3 & ~STATUS3_TRACE) >>> 0,
    });
    state = requireCompletedPendingScript(program, handlers, Object.freeze({
      ...state,
      haltReason: null,
      rulesContext: Object.freeze({
        ...rules,
        scriptingBattler: id,
        lastUsedAbility: copiedAbility,
        battleTextBuff1MonNick: Object.freeze({
          battler: opposing,
          partyIndex: state.rulesContext.battlers[opposing].partyIndex,
        }),
      }),
    }), TRACE_LABEL);
  }
  const player = state.rulesContext.battlers[0];
  if (player.hp !== 0 && player.item === ITEM_WHITE_HERB && player.statStages.some((stage) => stage < 6)) {
    const rules = replaceBattler(state.rulesContext, 0, {
      statStages: Object.freeze(player.statStages.map((stage) => stage < 6 ? 6 : stage)) as never,
    });
    state = requireCompletedPendingScript(program, handlers, Object.freeze({
      ...state,
      haltReason: null,
      rulesContext: Object.freeze({ ...rules, scriptingBattler: 0 }),
    }), WHITE_HERB_END2_LABEL);
  }
  return state;
}

function runFaintedBattlerHandlers(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  initialState: BattleScriptMachineState<BattleScriptRulesContext>,
  faintedBattlers: readonly BattleScriptBattlerId[],
): BattleScriptFaintedActionsResult {
  let state = initialState;
  for (const faintedBattler of faintedBattlers) {
    state = enterFaintedBattlerContext(state, faintedBattler);
    const started = startBattleScriptExecute(program, HANDLE_FAINTED_MON_LABEL, state);
    const run = runScriptToOwnEnd(program, handlers, started);
    if (run.kind === "player-choice") {
      return Object.freeze({
        kind: "player-choice-required",
        state: run.state,
        battler: run.battler,
        faintedPartyIndex: run.faintedPartyIndex,
        legalPartyIndexes: run.legalPartyIndexes,
      });
    }
    if (run.kind === "barrier") {
      return Object.freeze({ kind: "non-terminal-barrier", state: run.state, instruction: run.instruction });
    }
    state = run.state;
  }

  // checkteamslost is the only writer of battleOutcome (battleScriptCheckteamslostOpcode.ts):
  // nonzero means its own terminal jump was taken (BattleScript_FaintedMonEnd via the WON/LOST/DREW
  // path); zero means every fainted battler instead ran the full forced-switch dance to the SAME
  // BattleScript_FaintedMonEnd label (docs/forced-switch-ground-truth.md §1) -- the battle resumes.
  const completed = runPendingSwitchinEffects(program, handlers, state);
  return completed.rulesContext.battleOutcome !== 0
    ? Object.freeze({ kind: "terminal", state: completed })
    : Object.freeze({ kind: "resumed", state: completed });
}

/**
 * Resumes a `"player-choice-required"` halt (docs/forced-switch-ground-truth.md
 * §3/§4 slice 10) once the human has picked a legal replacement: writes the
 * chosen raw party index into `monToSwitchIntoId[battler]` -- exactly the
 * field the AI branch itself writes (`battleScriptOpenPartyScreenOpcode.ts`)
 * -- clears the halt, and re-steps from the SAME program counter, which then
 * takes that handler's own "already decided" advance path. The rest of the
 * forced-switch dance (switchhandleorder through cancelallactions/end2) then
 * runs exactly as the AI-side dance already does, so this reuses
 * `runScriptToOwnEnd` unmodified.
 */
export function resumeBattleScriptFaintedActionsAfterPlayerChoice(
  program: BattleScriptProgram,
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>,
  haltedState: BattleScriptMachineState<BattleScriptRulesContext>,
  chosenPartyIndex: number,
): BattleScriptFaintedActionsResult {
  const reason = haltedState.haltReason;
  if (reason === null || reason.kind !== "player-choice-required") {
    throw new Error(
      "resumeBattleScriptFaintedActionsAfterPlayerChoice requires a player-choice-required halt",
    );
  }
  if (!reason.legalPartyIndexes.includes(chosenPartyIndex)) {
    throw new Error(
      `chosen party index ${chosenPartyIndex} is not among the legal switch-in slots `
        + `(${reason.legalPartyIndexes.join(", ")})`,
    );
  }
  const rules = haltedState.rulesContext;
  const resumedBattler = reason.battler;
  const monToSwitchIntoId = Object.freeze(
    rules.monToSwitchIntoId.map((value, index) => (index === reason.battler ? chosenPartyIndex : value)),
  ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];
  const resumedState: BattleScriptMachineState<BattleScriptRulesContext> = Object.freeze({
    ...haltedState,
    haltReason: null,
    rulesContext: Object.freeze({ ...rules, monToSwitchIntoId }),
  });

  const run = runScriptToOwnEnd(program, handlers, resumedState);
  if (run.kind === "player-choice") {
    throw new Error("forced-switch resume unexpectedly halted on a second player-choice-required opcode");
  }
  if (run.kind === "barrier") {
    return Object.freeze({ kind: "non-terminal-barrier", state: run.state, instruction: run.instruction });
  }
  const state = run.state;
  const remainingFaintedBattlers = collectFaintedBattlers(state.rulesContext)
    .filter((battler) => battler > resumedBattler);
  if (remainingFaintedBattlers.length !== 0) {
    return runFaintedBattlerHandlers(
      program,
      handlers,
      state,
      Object.freeze(remainingFaintedBattlers),
    );
  }
  const completed = runPendingSwitchinEffects(program, handlers, state);
  return completed.rulesContext.battleOutcome !== 0
    ? Object.freeze({ kind: "terminal", state: completed })
    : Object.freeze({ kind: "resumed", state: completed });
}
