/**
 * ISSUES #97-B live calibration: app-side predicted bounce series for the
 * SAME two windows `dump-turn5-6-reopen-bounce-driver.py` RAM-probes
 * (turn5-action-off.json @5920-5960, turn6-reopen-off.json @7300-7351).
 *
 * Drives the REAL engine (`createInitialState`/`tick`/`render` from
 * `core.ts`, the exact modules `tools/compare/appTrace.ts` uses) through
 * the trace's own 76-segment button script, and at each target tick reads
 * the REAL runtime `BattleSceneState` (`fightSubmenu`,
 * `latestCompletedCommandHandoff`) straight off `state.battleScene` - no
 * internal formula re-derivation. The turn-5/turn-6 bounceTick formulas
 * themselves (`battleScene.ts:8307-8310` turn-5 dispatch,
 * `battleScene.ts:11810-11828` turn-6 dispatch) are transcribed verbatim
 * from source (cited inline below) since their own local helper functions
 * (`turn5LegacyResettledBounceTickFromLatest`/`turn5SubmenuBounceTickFromLatest`)
 * are private/unexported - every constant and primitive the transcription
 * uses (`TICK0`, `MENU_IDLE_BLANK_END_TICK`,
 * `TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG`,
 * `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`, `FIGHT_SUBMENU_OPEN_DELAY`,
 * `latestCompletedCommandPresentationEpochElapsedSinceReset`,
 * `isTurn4LatestCompletedCommandLifecycleActive`, `turn6KickoffBounceTick`,
 * `turn5SitrusResettledBounceTick`, `menuIdleBounce`) is a real, live,
 * exported production symbol, not a copy of arithmetic invented here.
 *
 * No `src/` file is edited. Run:
 *   node --experimental-strip-types tools/probe/analyze-turn5-6-reopen-bounce-app-series.ts
 */
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider (bnd257d)
import { readFileSync } from "node:fs";
import { createInitialState, tick, type EngineState } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import type { Trace } from "../compare/oracleClient.ts";
import {
  menuIdleBounce,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  FIGHT_SUBMENU_OPEN_DELAY,
  MENU_IDLE_BLANK_END_TICK,
} from "../../src/engine/battleMenu.ts";
import {
  TICK0,
  turn5SitrusResettledBounceTick,
  turn6KickoffBounceTick,
} from "../../src/engine/battleScene.ts";
import { TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG } from "../../src/engine/battleSceneCanonical.ts";
import {
  latestCompletedCommandPresentationEpochElapsedSinceReset,
  type LatestCompletedCommandHandoff,
} from "../../src/engine/nextCommandHandoff.ts";
import { isTurn4LatestCompletedCommandLifecycleActive } from "../../src/engine/turn4ResolutionAdapter.ts";

const TRACE_PATH = new URL("../compare/traces/turn5-action-off.json", import.meta.url);
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const WINDOW_A: readonly [number, number] = [5920, 5960];
const WINDOW_B: readonly [number, number] = [7300, 7351];
function inWindows(t: number): boolean {
  return (t >= WINDOW_A[0] && t <= WINDOW_A[1]) || (t >= WINDOW_B[0] && t <= WINDOW_B[1]);
}

// battleScene.ts:10276/10280 turn5LegacyResettledBounceTickFromLatest, verbatim.
function turn5LegacyResettledBounceTickFromLatest(t: number, latest: LatestCompletedCommandHandoff | null): number | null {
  const epochAge = latestCompletedCommandPresentationEpochElapsedSinceReset(latest, t - TICK0);
  if (epochAge === null) return null;
  return MENU_IDLE_BLANK_END_TICK + 1 + epochAge - TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG;
}
// battleScene.ts:10288 turn5SubmenuBounceTickFromLatest, verbatim.
function turn5SubmenuBounceTickFromLatest(t: number, latest: LatestCompletedCommandHandoff | null): number | null {
  const legacy = turn5LegacyResettledBounceTickFromLatest(t, latest);
  return legacy === null ? null : legacy - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

let state: EngineState = createInitialState({ appRoute: trace.appRoute });
let frame = 0;

const rows: Array<Record<string, unknown>> = [];

function recordIfInWindow(): void {
  if (!inWindows(frame)) return;
  const bs = state.battleScene;
  if (bs === null) {
    rows.push({ tick: frame, note: "no battleScene" });
    return;
  }
  const sm = bs.fightSubmenu;
  const latest = bs.latestCompletedCommandHandoff;
  const epochElapsed = latest?.content?.presentationEpoch?.elapsed ?? null;

  const turn5Active = isTurn4LatestCompletedCommandLifecycleActive(latest, sm.openElapsed);
  const turn5ReopenPressTick = sm.openElapsed === null ? null : TICK0 + sm.openElapsed;

  let turn5BounceTick: number | null = null;
  let turn5Branch: string | null = null;
  if (turn5Active) {
    if (frame === turn5ReopenPressTick) {
      turn5BounceTick = turn5LegacyResettledBounceTickFromLatest(frame, latest);
      turn5Branch = "legacy(pressTick)";
    } else {
      turn5BounceTick = turn5SubmenuBounceTickFromLatest(frame, latest);
      turn5Branch = "submenu(shifted)";
    }
  }
  const turn5Bounce = turn5BounceTick === null ? null : menuIdleBounce(turn5BounceTick);

  // battleScene.ts:11810-11828 drawTurn6FightSubmenuWindow dispatch, verbatim.
  let turn6BounceTickPre: number | null = null;
  let turn6Branch: string | null = null;
  if (sm.openElapsed === null) {
    turn6BounceTickPre = frame; // drawTurn6ActionMenuIdleWindow(fb, t) default bounceTick=t
    turn6Branch = "idle(openElapsed=null, bounceTick=t)";
  } else {
    const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
    if (frame < revealTick) {
      turn6BounceTickPre = frame - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
      turn6Branch = "preReveal(t-shift)";
    } else if (sm.confirmElapsed !== null) {
      turn6BounceTickPre = turn6KickoffBounceTick(frame, TICK0 + sm.confirmElapsed);
      turn6Branch = "kickoff(confirmed)";
    } else {
      turn6BounceTickPre = frame - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
      turn6Branch = "postReveal-preConfirm(t-shift)";
    }
  }
  const turn6FinalTick = turn5SitrusResettledBounceTick(turn6BounceTickPre);
  const turn6Bounce = menuIdleBounce(turn6FinalTick);

  rows.push({
    tick: frame,
    sceneElapsed: bs.elapsed,
    smOpenElapsed: sm.openElapsed,
    smConfirmElapsed: sm.confirmElapsed,
    smCloseElapsed: sm.closeElapsed,
    epochElapsed,
    turn5Active,
    turn5ReopenPressTick,
    turn5Branch,
    turn5BounceTick,
    turn5OnixY2: turn5Bounce?.onixY2 ?? null,
    turn5HealthboxY2: turn5Bounce?.healthboxY2 ?? null,
    turn6Branch,
    turn6BounceTickPre,
    turn6FinalTick,
    turn6OnixY2: turn6Bounce.onixY2,
    turn6HealthboxY2: turn6Bounce.healthboxY2,
  });
}

recordIfInWindow();
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  recordIfInWindow();
}

console.log(JSON.stringify({ rows }, null, 0));
