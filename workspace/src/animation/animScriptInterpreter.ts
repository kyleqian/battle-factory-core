// Minimal interpreter over the committed anim command stream
// (`src/data/gen/battle-move-anim-scripts.json`): walks a move's `main`
// command list and returns each `createsprite`'s own arg vector plus the RAM
// tick (relative to the FIRST createsprite) it fires at. Extracted from
// `featherDance.ts` (ANIMATION_PROGRESS.md's 2026-07-24 anim-script
// interpreter spike) when `mistBall.ts` became the second move to walk a
// createsprite schedule this way (generalization step, same date) - both
// moves import this one function rather than each keeping their own copy.
//
// Only `delay` and `createsprite` affect createsprite timing; every other op
// (loadspritegfx/monbg/splitbgprio_all/playsewithpan/waitforvisualfinish/
// clearmonbg/end) either precedes the first createsprite (its absolute
// offset is a separately calibrated input - see each caller's own anchor
// constant) or follows the last one, so it's a fixed 0-tick no-op here.
//
// The `delay N -> N+2 ticks until the next opcode runs` rule comes from the
// shared script VM itself (`reference/pokeemerald/src/battle_anim.c`):
// `RunAnimScriptCommand`'s do-while executes ops back-to-back in ONE tick
// until it hits `Cmd_delay` (sets `sAnimFramesToWait=N`, switches callback to
// `WaitAnimFrameCount`); `WaitAnimFrameCount` runs once per subsequent tick,
// decrementing until it observes the count already `<=0` (N decrementing
// calls + 1 more call to detect zero = N+1 calls), and only resumes
// `RunAnimScriptCommand` on the FOLLOWING tick - N+2 ticks total from the
// tick `delay` was issued to the tick the next createsprite fires. Verified
// (not fitted) against FEATHER_DANCE's RAM-probed 8-tick spawn spacing
// (`tests/featherDanceInterpreter.test.ts`); MIST_BALL's own script has only
// one `createsprite` before its first `delay`, so its schedule is the
// trivial one-element case (`tests/mistBall.test.ts`).
export interface AnimScriptCommand {
  op: string;
  args?: number[];
  frames?: number;
}

/**
 * General `waitforvisualfinish`-aware schedule (DRAGON_RAGE rung 4,
 * ANIMATION_PROGRESS.md's 2026-07-25 sections): the MIST_BALL enumeration
 * (2026-07-24) flagged that `waitforvisualfinish` needs real sprite-
 * lifetime tracking to generalize past FEATHER_DANCE's own script-position
 * coincidence. `Cmd_waitforvisualfinish` (`battle_anim.c:455-465`) blocks
 * until `gAnimVisualTaskCount == 0` - i.e. until EVERY sprite/task created
 * since the last wait has self-destroyed, not just the most recent one.
 * `Cmd_createsprite`/`Cmd_createvisualtask` increment that counter and never
 * set `sAnimFramesToWait`, so a run of creation ops (optionally separated by
 * `delay`) all become active in the same "batch" a `waitforvisualfinish`
 * then gates on together.
 *
 * RAM-probed and confirmed exactly (`dump-dragonrage-full.py`, both
 * attacker orientations, every one of DRAGON_RAGE's 5 `waitforvisualfinish`
 * barriers): once every active item's own OWN destroy tick (ticks-since-
 * its-own-creation, supplied by the caller's `lifetimeOf` per primitive -
 * `shakeMonSequence(...).length - 2`, `slideMonTo{Offset,OriginalPos}
 * DestroyTick`, this move's own fire-spit/fire-plume lifetimes) is known,
 * the next command's own tick is `max(activeGoneTicks) + 1` - the same
 * 1-tick resolution lag observed at every transition (matches
 * `SlideMonToOffset`'s own already-documented deferred-destroy shape:
 * `Cmd_waitforvisualfinish` only unblocks the tick AFTER the last active
 * item is actually gone from `gAnimVisualTaskCount`'s own bookkeeping).
 * `delay N` still costs `N+2` (the pre-existing VM rule, unaffected by
 * pending visual tasks - `Cmd_delay` and `Cmd_waitforvisualfinish` are
 * different ops with independent counters).
 */
export interface AnimScheduleLifetime {
  /** Ticks after this event's own creation tick that it becomes inactive (destroyed). */
  readonly goneAfterTicks: number;
}

export interface ScheduledAnimEvent {
  readonly tick: number;
  readonly cmd: AnimScriptCommand;
}

const CREATION_OPS = new Set(["createsprite", "createvisualtask"]);

function isCreationOp(op: string): boolean {
  return CREATION_OPS.has(op) || op.startsWith("create_");
}

export function interpretAnimSchedule(
  main: readonly AnimScriptCommand[],
  lifetimeOf: (cmd: AnimScriptCommand) => AnimScheduleLifetime,
): ScheduledAnimEvent[] {
  const events: ScheduledAnimEvent[] = [];
  let tick = 0;
  let activeGoneTicks: number[] = [];
  for (const cmd of main) {
    if (isCreationOp(cmd.op)) {
      events.push({ tick, cmd });
      activeGoneTicks.push(tick + lifetimeOf(cmd).goneAfterTicks);
    } else if (cmd.op === "delay") {
      tick += cmd.frames! + 2;
    } else if (cmd.op === "waitforvisualfinish" && activeGoneTicks.length > 0) {
      tick = Math.max(...activeGoneTicks) + 1;
      activeGoneTicks = [];
    }
  }
  return events;
}

export function interpretCreateSpriteSchedule(
  main: readonly AnimScriptCommand[],
): Array<{ tick: number; args: number[] }> {
  const schedule: Array<{ tick: number; args: number[] }> = [];
  let tick = 0;
  let started = false;
  for (const cmd of main) {
    if (cmd.op === "createsprite") {
      started = true;
      schedule.push({ tick, args: cmd.args! });
    } else if (cmd.op === "delay" && started) {
      tick += cmd.frames! + 2;
    }
  }
  return schedule;
}
