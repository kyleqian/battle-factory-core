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
 *    `gBattleOutcome`.
 *  - state 6: Intimidate1/Trace/held-item/Forecast switch-in hooks. Only
 *    fires for a battler that just switched in; the forced-switch flow
 *    (`openpartyscreen BS_FAINTED`/`switchhandleorder BS_FAINTED`) is out of
 *    this rung's scope (unregistered opcodes, ISSUES tracked separately), so
 *    nothing ever switches in on any path this orchestration completes --
 *    state 6 is a provable no-op on every reachable outcome here, not a
 *    silently skipped branch.
 *
 * Source only ever queues ONE `BattleScriptExecute` call per
 * `HandleFaintedMonActions` invocation and returns control to the main loop
 * (multiple real invocations resume the loop via its persisted
 * `faintedActionsState`). This module instead drives each queued script all
 * the way to ITS OWN halt before considering the next fainted battler --
 * behaviorally identical for every scenario this engine can construct today
 * (`battlersCount === 2`, so at most one battler can be newly fainted per
 * action; simultaneous multi-battler faints are a doubles-only case
 * `docs/faint-outcome-ground-truth.md` §4 already marks unreachable in
 * singles), since none of `BattleScript_GiveExp`/`BattleScript_HandleFaintedMon`
 * ever block on a controller mid-script on the modeled path.
 */
import {
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
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const GIVE_EXP_LABEL = "BattleScript_GiveExp";
const HANDLE_FAINTED_MON_LABEL = "BattleScript_HandleFaintedMon";
/** Real per-script instruction ceiling; both scripts complete in single digits. */
const SCRIPT_BUDGET = 32;

export type BattleScriptFaintedActionsResult =
  | Readonly<{
    /** Source: HandleFaintedMonActions returns FALSE with nothing to do. */
    kind: "no-fainted-battlers";
    state: BattleScriptMachineState<BattleScriptRulesContext>;
  }>
  | Readonly<{
    /**
     * Every fainted battler's BattleScript_HandleFaintedMon reached
     * BattleScript_FaintedMonEnd (checkteamslost decided the battle) --
     * `state.rulesContext.battleOutcome` is the real, computed byte.
     */
    kind: "terminal";
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
  }>;

/**
 * Runs one already-started `BattleScriptExecute` script to its own
 * `end`/`end2` halt, or stops the instant an unregistered opcode is reached
 * -- neither `BattleScript_GiveExp` nor `BattleScript_HandleFaintedMon` ever
 * waits on a controller on the modeled path (setbyte/getexp/checkteamslost/
 * jumpifbyte/end2 are all pure source-command opcodes), so this needs no
 * controller-acknowledgement loop, unlike a move's own hit chain.
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
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      return Object.freeze({ kind: "terminal", state: stepped.state });
    }
    if (stepped.kind !== "advanced") {
      throw new Error(
        `fainted-actions orchestration hit an unexpected ${stepped.kind} step inside `
          + `${instruction.source.label} -- outside this rung's modeled (setbyte/getexp/checkteamslost/`
          + "jumpifbyte/end2) domain",
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
    return Object.freeze({ kind: "no-fainted-battlers", state: initialState });
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
    state = run.state;
  }

  for (const faintedBattler of faintedBattlers) {
    state = enterFaintedBattlerContext(state, faintedBattler);
    const started = startBattleScriptExecute(program, HANDLE_FAINTED_MON_LABEL, state);
    const run = runScriptToOwnEnd(program, handlers, started);
    if (run.kind === "barrier") {
      return Object.freeze({ kind: "non-terminal-barrier", state: run.state, instruction: run.instruction });
    }
    state = run.state;
  }

  return Object.freeze({ kind: "terminal", state });
}
