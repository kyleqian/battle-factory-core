import { describe, expect, it } from "vitest";
import {
  activateAbilityScript,
  createEmptyCallbackStack,
  popEnd3,
  pushCursorAndCallback,
  runAbilityScriptToEnd3,
  type AbilityScriptStep,
  type CallbackContinuation,
  type CallbackStackState,
} from "../src/engine/battleScriptCallbackStack.ts";

/**
 * Design-scout prototype tests for `docs/end3-design.md` /
 * `docs/endturn-abilities-items-ground-truth.md` §1b/§5. Proves the
 * `BattleScriptPushCursorAndCallback` + `Cmd_end3` control-flow model this doc's
 * registration plan depends on -- UNWIRED (`src/engine/battleScriptCallbackStack.ts`
 * is not imported by any production module).
 */

const SPEED_BOOST_SCRIPT: readonly AbilityScriptStep[] = Object.freeze([
  Object.freeze({ kind: "opcode", label: "statbuffchange" }),
  Object.freeze({ kind: "opcode", label: "printstring" }),
  Object.freeze({ kind: "opcode", label: "waitmessage" }),
  Object.freeze({ kind: "end3" }),
]);

/** `BattleTurnPassed` (`battle_main.c:3956`) -- the plain-C caller every end-turn ability preempts. */
const END_TURN_SWEEP_CONTINUATION: CallbackContinuation = Object.freeze({ kind: "cCallback", name: "BattleTurnPassed" });

describe("battleScriptCallbackStack (END3 design-scout prototype)", () => {
  it("pushes during a simulated end-turn pass, runs the ability script's opcodes, and end3 pops back to the preempted continuation", () => {
    const priorScriptCursor = Object.freeze({ programCounter: 4242, callStack: Object.freeze([]) });
    const stack = createEmptyCallbackStack();

    const pushed = pushCursorAndCallback(stack, priorScriptCursor, END_TURN_SWEEP_CONTINUATION, 0);
    expect(pushed.stack.frames).toHaveLength(1);
    expect(pushed.programCounter).toBe(0);
    expect(pushed.callStack).toEqual([]);

    const run = runAbilityScriptToEnd3(SPEED_BOOST_SCRIPT, pushed.programCounter);
    expect(run.opcodesExecuted).toEqual(["statbuffchange", "printstring", "waitmessage"]);
    expect(run.programCounterAtEnd3).toBe(3);

    const popped = popEnd3(pushed.stack);
    if (popped.kind !== "resumed") throw new Error("expected a resumed end3 pop");
    expect(popped.stack.frames).toHaveLength(0);
    expect(popped.continuation).toEqual(END_TURN_SWEEP_CONTINUATION);
    // Real C state (BattleScriptPop's own restore) -- carried faithfully, but see the
    // module doc comment: nothing in the ENDTURN_ABILITIES call path ever reads it back,
    // because BattleTurnPassed re-derives its resume point from turnEffectsTracker, not
    // from gBattlescriptCurrInstr. We assert it round-trips exactly, not that it's used.
    expect(popped.deadOrLiveScriptCursor).toEqual(priorScriptCursor);
  });

  it("activateAbilityScript composes push+run+pop as one call (the proposed runTickScript-analog shape from docs/end3-design.md §2)", () => {
    const priorScriptCursor = Object.freeze({ programCounter: 99, callStack: Object.freeze([]) });
    const result = activateAbilityScript(
      priorScriptCursor,
      createEmptyCallbackStack(),
      END_TURN_SWEEP_CONTINUATION,
      SPEED_BOOST_SCRIPT,
      0,
    );
    expect(result.stack.frames).toHaveLength(0);
    expect(result.run.opcodesExecuted).toEqual(["statbuffchange", "printstring", "waitmessage"]);
    expect(result.resumed).toEqual(END_TURN_SWEEP_CONTINUATION);
  });

  it("two battlers' Speed Boost fire sequentially within one end-of-turn resolution, never nested (battle_util.c:1777-1778's effect-return short-circuit)", () => {
    // gBattlerByTurnOrder-style sweep: battler 0 is faster, goes first.
    const battlers = [
      { id: 0, speedStage: 6, name: "fast" },
      { id: 1, speedStage: 6, name: "slow" },
    ];
    let stack: CallbackStackState = createEmptyCallbackStack();
    const fired: string[] = [];
    const depthWhilePushed: number[] = [];

    for (const battler of battlers) {
      // ABILITY_SPEED_BOOST's own gate (battle_util.c:2642-2645): statStages[SPEED] < MAX_STAT_STAGE.
      const wouldFire = battler.speedStage < 12;
      if (!wouldFire) continue;

      // DoBattlerEndTurnEffects only ever has ONE push outstanding at a time --
      // assert that BEFORE this battler's push, the stack is empty (nothing left
      // nested from a prior battler that didn't fully unwind).
      expect(stack.frames).toHaveLength(0);

      const priorScriptCursor = Object.freeze({ programCounter: 0, callStack: Object.freeze([]) });
      const pushed = pushCursorAndCallback(stack, priorScriptCursor, END_TURN_SWEEP_CONTINUATION, 0);
      // Depth WHILE the ability script is running, before end3 pops it back --
      // this is the number that must never exceed 1 for this call path.
      depthWhilePushed.push(pushed.stack.frames.length);
      runAbilityScriptToEnd3(SPEED_BOOST_SCRIPT, pushed.programCounter);
      const popped = popEnd3(pushed.stack);
      if (popped.kind !== "resumed") throw new Error("expected a resumed end3 pop");

      stack = popped.stack;
      fired.push(battler.name);
      expect(popped.continuation).toEqual(END_TURN_SWEEP_CONTINUATION);
    }

    // Both battlers' Speed Boost DO fire within the same overall end-of-turn
    // resolution (this doc's own §3a live ledger confirms it fires every tick) --
    // just serialized one push/run/pop cycle at a time, never nested.
    expect(fired).toEqual(["fast", "slow"]);
    expect(Math.max(...depthWhilePushed)).toBe(1);
    expect(stack.frames).toHaveLength(0);
  });

  it("end3 on an empty callback stack (unreachable in real play -- every end3 script is only entered via a matching push) surfaces as an explicit mismatch, not silent garbage", () => {
    const stack = createEmptyCallbackStack();
    const result = popEnd3(stack);
    expect(result.kind).toBe("underflow");
  });

  it("models the OTHER source call shape too: end3 preempting a genuinely-running script (Intimidate/Trace mid-script, battle_util.c:3010) resumes the real next opcode, not a bare C callback", () => {
    // The preempted caller here is itself mid-script (gBattleMainFunc ==
    // RunBattleScriptCommands at push time), e.g. Cmd_switchinabilities calling
    // AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN, ...) from battle_script_commands.c:5265.
    const preemptedScriptContinuation: CallbackContinuation = Object.freeze({
      kind: "script",
      programCounter: 77,
      callStack: Object.freeze([12, 40]),
    });
    const priorScriptCursor = Object.freeze({ programCounter: 77, callStack: Object.freeze([12, 40]) });
    const stack = createEmptyCallbackStack();

    const pushed = pushCursorAndCallback(stack, priorScriptCursor, preemptedScriptContinuation, 0);
    const run = runAbilityScriptToEnd3(SPEED_BOOST_SCRIPT, pushed.programCounter);
    expect(run.haltedAtEnd3).toBe(true);

    const popped = popEnd3(pushed.stack);
    if (popped.kind !== "resumed") throw new Error("expected a resumed end3 pop");
    // Unlike the end-turn case, this continuation genuinely IS "resume this exact
    // script at this exact program counter" -- a real mid-script continuation, not
    // a dead value re-derived by external tracker state.
    expect(popped.continuation).toEqual(preemptedScriptContinuation);
    if (popped.continuation.kind !== "script") throw new Error("expected the script continuation variant");
    expect(popped.continuation.programCounter).toBe(77);
    expect(popped.continuation.callStack).toEqual([12, 40]);
  });
});
