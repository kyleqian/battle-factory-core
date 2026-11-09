/**
 * ISSUES #97-B rung (class-(iii) dispatch-stall root cause,
 * `docs/turn5-family-class3-diagnosis.md` §6): extends the exact pattern
 * `analyze-turn5-6-reopen-bounce-app-series.ts` already established across
 * the FULL 5958-7005 range these six `turn5-confirm-off-*`/
 * `turn5-resolve-off-*` traces cover. Drives the REAL engine
 * (`createInitialState`/`tick`) through the shared 76-segment button
 * script and, at every tick in range, reads `state.battleScene` directly
 * and re-evaluates the SAME top-level dispatch conditions
 * `drawFightSubmenuWindow`/`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`
 * use (`battleScene.ts:8477`, `:10396`, `:14833/:14838/:14839`) using only
 * real exported symbols - no formula re-derivation, no `src/` edit.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolve-dispatch-app-series.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick, type EngineState } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import type { Trace } from "../compare/oracleClient.ts";
import { endeavorHp, rockSlideTextStartTick } from "../../src/engine/battleMenu.ts";
import {
  TICK0,
  TURN5_ROCKSLIDE_PRESS_TICK,
  TURN5_OFF_ROCKSLIDE_TEXT_DELAY,
  TURN5_ENDEAVOR_HP,
  TURN5_FAINTED_TEXT_DELAY,
  SWITCHIN_SENTOUT_TEXT_START_TICK,
  TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK,
  TURN5_OFF_SITRUS_TEXT_CLEAR_TICK,
  TURN5_OFF_SITRUS_MENU_REDRAW_TICK,
  TURN5_ICONBAR_CREATE_TICK,
  TURN5_ICONBAR_FADE_START_TICK,
  TURN5_ICONBAR_DESTROY_TICK,
  turn5FaintedTextStartTick,
} from "../../src/engine/battleScene.ts";
import { isTurn4LatestCompletedCommandLifecycleActive } from "../../src/engine/turn4ResolutionAdapter.ts";

const TRACE_PATH = new URL("../compare/traces/turn5-resolve-off-a.json", import.meta.url);
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const RANGE: readonly [number, number] = [5958, 7005];
function inRange(t: number): boolean {
  return t >= RANGE[0] && t <= RANGE[1];
}

const ROCKSLIDE_TEXT_START = rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK, TURN5_OFF_ROCKSLIDE_TEXT_DELAY);
const FAINTED_START = turn5FaintedTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK);

let state: EngineState = createInitialState({ appRoute: trace.appRoute });
let frame = 0;

const rows: Array<Record<string, unknown>> = [];

function recordIfInRange(): void {
  if (!inRange(frame)) return;
  const bs = state.battleScene;
  if (bs === null) {
    rows.push({ tick: frame, note: "no battleScene" });
    return;
  }
  const sm = bs.fightSubmenu;
  const latest = bs.latestCompletedCommandHandoff;
  const turn5Active = isTurn4LatestCompletedCommandLifecycleActive(latest, sm.openElapsed);
  const endeavorPressTick = sm.confirmElapsed === null ? null : TICK0 + sm.confirmElapsed;

  let branch = "NOT turn5Active (falls through to an earlier/other top-level branch)";
  let onixHp: number | null = null;
  let sub: string | null = null;

  if (turn5Active) {
    if (frame >= ROCKSLIDE_TEXT_START) {
      branch = "drawTurn5RockSlideWindow";
      if (frame < FAINTED_START) {
        sub = "attackText (ONIX used ROCK SLIDE!)";
      } else if (frame < TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK) {
        sub = frame >= SWITCHIN_SENTOUT_TEXT_START_TICK ? "sentOutText (BUG CATCHER DESTIN sent out PIDGEOTTO!)" : "faintedText (Foe GROVYLE fainted!)";
      } else {
        sub = "sitrusPhase (heal text / menu redraw)";
      }
    } else {
      branch = "drawTurn5EndeavorText";
      onixHp = endeavorPressTick === null ? null : endeavorHp(frame, endeavorPressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to);
    }
  }

  rows.push({
    tick: frame,
    smOpenElapsed: sm.openElapsed,
    smConfirmElapsed: sm.confirmElapsed,
    smCloseElapsed: sm.closeElapsed,
    turn5Active,
    endeavorPressTick,
    branch,
    sub,
    onixHp,
    iconbarPhase: frame < TURN5_ICONBAR_CREATE_TICK ? "pre" : frame < TURN5_ICONBAR_FADE_START_TICK ? "solid" : frame < TURN5_ICONBAR_DESTROY_TICK ? "fading" : "destroyed",
  });
}

recordIfInRange();
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  recordIfInRange();
}

const outPath = new URL("../../artifacts/turn5-resolve-dispatch-app-series.json", import.meta.url);
writeFileSync(outPath, JSON.stringify({
  sourceTrace: "tools/compare/traces/turn5-resolve-off-a.json (76-segment script shared by all 6 confirm/resolve-off traces, verified by sha256)",
  range: RANGE,
  constants: {
    TICK0,
    TURN5_ROCKSLIDE_PRESS_TICK,
    ROCKSLIDE_TEXT_START,
    FAINTED_START,
    SWITCHIN_SENTOUT_TEXT_START_TICK,
    TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK,
    TURN5_OFF_SITRUS_TEXT_CLEAR_TICK,
    TURN5_OFF_SITRUS_MENU_REDRAW_TICK,
    TURN5_ICONBAR_CREATE_TICK,
    TURN5_ICONBAR_FADE_START_TICK,
    TURN5_ICONBAR_DESTROY_TICK,
  },
  rows,
}, null, 0));
console.log(`wrote ${rows.length} rows to ${outPath.pathname}`);
