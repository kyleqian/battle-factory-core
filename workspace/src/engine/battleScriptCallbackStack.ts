/**
 * UNWIRED DESIGN-SCOUT PROTOTYPE -- see `docs/end3-design.md`.
 *
 * Proves the control-flow model for `Cmd_end3` / `BattleScriptPushCursorAndCallback`,
 * the primitive `docs/endturn-abilities-items-ground-truth.md` §1b/§5 names as the
 * blocking gap for `ENDTURN_ABILITIES` slices 1-3 (Speed Boost / Rain Dish / Shed
 * Skin). Not imported by any production module -- `battleEndTurnOrchestration.ts`
 * and `battleScriptMachine.ts` are untouched. Registration is the follow-up
 * main-lane step; `docs/end3-design.md` has its checklist.
 *
 * Source citations (reference/pokeemerald):
 * - `src/battle_util.c:966-974` -- `BattleScriptPushCursor`/`BattleScriptPop`, the
 *   single shared `gBattleResources->battleScriptsStack` that both `Cmd_call`/
 *   `Cmd_return` AND `BattleScriptPushCursorAndCallback`/`Cmd_end3` push/pop.
 * - `src/battle_util.c:3201-3215` -- `BattleScriptExecute` vs
 *   `BattleScriptPushCursorAndCallback` side by side: only the latter calls
 *   `BattleScriptPushCursor()` first; both push the CURRENT `gBattleMainFunc`
 *   onto the separate `gBattleResources->battleCallbackStack`, but `BattleScriptExecute`
 *   resumes via `RunBattleScriptCommands_PopCallbacksStack` (self-terminating,
 *   pops on its OWN end/end2) while `BattleScriptPushCursorAndCallback` resumes
 *   via plain `RunBattleScriptCommands` (does NOT pop on end/end2 -- only `end3` pops).
 * - `src/battle_script_commands.c:3966-3973` -- `Cmd_end3`: pops the script-cursor
 *   stack (`BattleScriptPop()`), then pops `battleCallbackStack` (guarded: only
 *   decrements `size` if nonzero) and restores `gBattleMainFunc` from it.
 * - `src/battle_main.c:3956-3966` (`BattleTurnPassed`) + `:1494-1498`/`:2601-2658`
 *   of `battle_util.c` (`DoBattlerEndTurnEffects`'s `ENDTURN_ABILITIES` case +
 *   `AbilityBattleEffects`) -- the call chain for Speed Boost/Rain Dish/Shed Skin
 *   is 100% plain C (`BattleTurnPassed` -> `DoBattlerEndTurnEffects` ->
 *   `AbilityBattleEffects`) all the way down to the `BattleScriptPushCursorAndCallback`
 *   call. `gBattleMainFunc` at push time is `BattleTurnPassed` itself, NOT a
 *   script-running callback -- see `docs/end3-design.md` §2 for why this means
 *   the popped script cursor is real but observably dead in this call path.
 * - `src/battle_util.c:1777-1778` -- `DoBattlerEndTurnEffects`'s
 *   `if (effect != 0) return effect;` short-circuit: only ONE ability/item can
 *   fire per call into this function, which is why the callback stack this
 *   module models never exceeds depth 1 for the `ENDTURN_ABILITIES` call path
 *   (see the "sequential, never nested" test below).
 */

/**
 * What `gBattleMainFunc` held at push time, i.e. what `Cmd_end3` actually hands
 * control back to. Source draws this exact distinction by which function
 * `BattleScriptPushCursorAndCallback` is called FROM:
 *
 * - `cCallback`: the preempted caller was a plain C function with no script of
 *   its own running (`BattleTurnPassed` for end-turn abilities, per
 *   `battle_main.c:3956` -- `gBattleMainFunc` was `BattleTurnPassed`, a bare
 *   function pointer, not `RunBattleScriptCommands`). Resuming here means
 *   re-invoking that C function from its own top; whatever progress it had
 *   made lives in ITS OWN external state (here: `gBattleStruct->turnEffectsTracker`/
 *   `turnEffectsBattlerId`), never in a script cursor.
 * - `script`: the preempted caller WAS itself a running script (e.g. Intimidate's
 *   `BattleScriptPushCursorAndCallback(BattleScript_IntimidateActivatesEnd3)` at
 *   `battle_util.c:3010`, reached from `Cmd_switchinabilities` at
 *   `battle_script_commands.c:5265` -- `gBattleMainFunc` there is
 *   `RunBattleScriptCommands`/`RunBattleScriptCommands_PopCallbacksStack`).
 *   Resuming here means the popped script cursor genuinely IS the next opcode
 *   to run -- a real mid-script continuation. Not exercised by any of
 *   Speed Boost/Rain Dish/Shed Skin (all three preempt `BattleTurnPassed`), but
 *   modeled here so the primitive is the general one source actually has, not
 *   one hand-fitted to just these three cases.
 */
export type CallbackContinuation =
  | Readonly<{ kind: "cCallback"; name: string }>
  | Readonly<{ kind: "script"; programCounter: number; callStack: readonly number[] }>;

/**
 * One entry of `gBattleResources->battleCallbackStack` joined with the matching
 * entry `BattleScriptPushCursor()` pushed onto `battleScriptsStack` in the same
 * `BattleScriptPushCursorAndCallback` call -- the two source stacks are pushed/
 * popped in lockstep by this primitive (never independently), so one frame
 * models both.
 */
export type CallbackStackFrame = Readonly<{
  /**
   * `gBattlescriptCurrInstr`/the script-side call stack at push time
   * (`BattleScriptPushCursor()`, `battle_util.c:966-969`). Real C state,
   * faithfully carried across push/pop -- but see `continuation`: when
   * `continuation.kind === "cCallback"`, NOTHING in source ever reads this
   * value back (the resumed C function derives its own resume point from its
   * own external state). It round-trips inert, not unused-by-mistake.
   */
  callerScriptCursor: Readonly<{ programCounter: number; callStack: readonly number[] }>;
  /** `gBattleMainFunc` at push time (`battle_util.c:3213`) -- what `end3` resumes. */
  continuation: CallbackContinuation;
}>;

export type CallbackStackState = Readonly<{
  frames: readonly CallbackStackFrame[];
}>;

export function createEmptyCallbackStack(): CallbackStackState {
  return Object.freeze({ frames: Object.freeze([]) });
}

/**
 * `BattleScriptPushCursorAndCallback(BS_ptr)` (`battle_util.c:3209-3215`):
 * push the caller's script cursor, push the caller's `gBattleMainFunc` (here:
 * `continuation`), then start the new script at `BS_ptr` (`newEntryProgramCounter`).
 * The new script gets its OWN fresh CALL/RETURN stack -- matching this engine's
 * existing `startBattleScriptExecute` precedent (`battleEndTurnOrchestration.ts`),
 * since nothing may `Cmd_return` past a script's own entry point either way.
 */
export function pushCursorAndCallback(
  stack: CallbackStackState,
  callerScriptCursor: Readonly<{ programCounter: number; callStack: readonly number[] }>,
  continuation: CallbackContinuation,
  newEntryProgramCounter: number,
): Readonly<{ stack: CallbackStackState; programCounter: number; callStack: readonly number[] }> {
  const frame: CallbackStackFrame = Object.freeze({
    callerScriptCursor: Object.freeze({
      programCounter: callerScriptCursor.programCounter,
      callStack: Object.freeze([...callerScriptCursor.callStack]),
    }),
    continuation,
  });
  return Object.freeze({
    stack: Object.freeze({ frames: Object.freeze([...stack.frames, frame]) }),
    programCounter: newEntryProgramCounter,
    callStack: Object.freeze([]),
  });
}

export type End3Result =
  | Readonly<{
    kind: "resumed";
    stack: CallbackStackState;
    continuation: CallbackContinuation;
    /** Popped alongside `continuation` (`BattleScriptPop()`); see the frame doc comment on when this is dead vs. load-bearing. */
    deadOrLiveScriptCursor: Readonly<{ programCounter: number; callStack: readonly number[] }>;
  }>
  | Readonly<{
    /**
     * `Cmd_end3` on an empty `battleCallbackStack` (`battle_script_commands.c:3970`'s
     * `if (size != 0) size--;` guard not taking the decrement branch, then reading
     * `function[0]` -- whatever stale value was last left there, never a crash).
     * Unreachable for any real script: every `end3`-terminated script in source is
     * only ever entered via a matching `BattleScriptPushCursorAndCallback`, so the
     * push/pop always balance. Rather than fabricate a "stale slot" to return, this
     * prototype surfaces the mismatch explicitly -- a real registration bug (an
     * `end3` script wired without a matching push) should fail loudly in TS, not
     * silently resume garbage the way the real console would.
     */
    kind: "underflow";
  }>;

/** `Cmd_end3` (`battle_script_commands.c:3966-3973`). */
export function popEnd3(stack: CallbackStackState): End3Result {
  if (stack.frames.length === 0) {
    return Object.freeze({ kind: "underflow" });
  }
  const top = stack.frames[stack.frames.length - 1]!;
  return Object.freeze({
    kind: "resumed",
    stack: Object.freeze({ frames: Object.freeze(stack.frames.slice(0, -1)) }),
    continuation: top.continuation,
    deadOrLiveScriptCursor: top.callerScriptCursor,
  });
}

/**
 * A minimal synthetic "ability activation script" -- just enough opcode shape
 * to prove push/run/pop, not a port of the real opcode set (that's
 * `battleScriptMachine.ts`'s job, untouched here). Each step is either a plain
 * opcode (advances one instruction, carries a label for assertions) or the
 * `end3` terminal.
 */
export type AbilityScriptStep =
  | Readonly<{ kind: "opcode"; label: string }>
  | Readonly<{ kind: "end3" }>;

export type AbilityScriptRunResult = Readonly<{
  opcodesExecuted: readonly string[];
  haltedAtEnd3: true;
  programCounterAtEnd3: number;
}>;

/** Runs a script (as started by `pushCursorAndCallback`'s `programCounter`) to its own `end3`. */
export function runAbilityScriptToEnd3(
  script: readonly AbilityScriptStep[],
  programCounter: number,
): AbilityScriptRunResult {
  const opcodesExecuted: string[] = [];
  let pc = programCounter;
  for (let budget = 0; budget < 1000; budget += 1) {
    const step = script[pc];
    if (!step) throw new Error(`ability script ran off the end at pc=${pc} without hitting end3`);
    if (step.kind === "end3") {
      return Object.freeze({
        opcodesExecuted: Object.freeze(opcodesExecuted),
        haltedAtEnd3: true,
        programCounterAtEnd3: pc,
      });
    }
    opcodesExecuted.push(step.label);
    pc += 1;
  }
  throw new Error("ability script exceeded its instruction budget without hitting end3");
}

/**
 * The proposed "minimal structure to host push-cursor-and-callback faithfully"
 * from `docs/end3-design.md` §2, composed as one call: push, run the ability
 * script to its own `end3`, pop, and hand back the resumed continuation. This
 * is the shape a real `runPushCursorAndCallbackTickScript` alongside the
 * existing `runTickScript` (`battleEndTurnOrchestration.ts:230`) would take --
 * same "run one call's worth of script to completion" convention that helper
 * already uses (see `docs/end3-design.md` §2's "no cross-tick suspend needed"
 * finding), just with a callback-stack push/pop wrapped around the run instead
 * of a callStack reset.
 */
export function activateAbilityScript(
  priorScriptCursor: Readonly<{ programCounter: number; callStack: readonly number[] }>,
  stack: CallbackStackState,
  continuation: CallbackContinuation,
  script: readonly AbilityScriptStep[],
  entryProgramCounter: number,
): Readonly<{ stack: CallbackStackState; run: AbilityScriptRunResult; resumed: CallbackContinuation }> {
  const pushed = pushCursorAndCallback(stack, priorScriptCursor, continuation, entryProgramCounter);
  const run = runAbilityScriptToEnd3(script, pushed.programCounter);
  const popped = popEnd3(pushed.stack);
  if (popped.kind === "underflow") {
    throw new Error("activateAbilityScript: end3 underflow immediately after its own matching push -- unreachable, indicates a bug in this prototype");
  }
  return Object.freeze({ stack: popped.stack, run, resumed: popped.continuation });
}
