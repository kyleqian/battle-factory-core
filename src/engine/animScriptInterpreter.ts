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
