// Worktree lane probe (2026-07-22, ISSUES #34 / docs/turn13-bounce-notes.md
// §10): pins turn 14's own settled-menu-redraw bounce residual straight from
// a FRESH `bin/oracle run` (pixel-only, no RAM reads, no src/ dependency -
// same convention as `verify-turn13-bounce.ts`, its own direct precedent).
//
// The claim being pinned: `TURN14_MENU_REDRAW_TICK` (src/engine/
// battleScene.ts:10816, 18086) is the correct chrome-reveal anchor (does NOT
// move, unlike turn 13's own conflated constant) but is missing TWO things
// `drawTurn14FlyMissWindow` doesn't currently model:
//   1. A 6-tick blank hold (18080-18085) before the reveal - the same
//      TEXT_CLEAR_TICK-to-MENU_REDRAW_TICK gap #33(b) already fixed for
//      turn 13's own switch-in, unmodeled here (the app currently holds the
//      fully-typed "ONIX's attack missed!" text straight through this span).
//   2. The bounce regime RESETS FRESH at 18086 (mirrors turn 13's own
//      switch-in reset, `TURN13_SWITCHIN_RESET_SHIFT`'s own role) rather
//      than continuing turn 13's live cycle the way the CURRENT code's
//      `t + TURN13_SWITCHIN_RESET_SHIFT` formula assumes. A direct RAM probe
//      (`dump-turn14-bounce-driver.py`, docs/turn13-bounce-notes.md's own §2
//      method re-pointed at this window) fitting BOTH candidate formulas
//      against the driver's own raw `y2` ground truth across all 871 probed
//      ticks (18086-18956) found the CONTINUE formula mismatches EVERY
//      single tick, while a RESET formula - identical shape to
//      `TURN13_SWITCHIN_RESET_SHIFT`, just re-anchored at
//      `TURN14_MENU_REDRAW_TICK` in place of `TURN13_SWITCHIN_MENU_REDRAW_
//      TICK` - matches all 871 with ZERO mismatches. This is not a close
//      fit; it's exact, and decisive.
//
// Every check below is a pure ORACLE ground-truth fact (sha256 equality/
// inequality across specific ticks) - it holds regardless of what `src/`
// currently does, and is exactly what the RESET model predicts: the blank
// hold (18080-18085), the reveal (18086), a one-tick (0,1) blip (18087)
// mirroring turn 13's own 17113, phase-group boundaries at 18088/18097/
// 18106/18115/18124, and cross-period confirmation that the SAME (onixY2,
// healthboxY2)=(0,1) phase recurs at 18115, 18415, 18815, AND 18956 - all
// four ticks byte-identical despite being up to 841 ticks apart (nothing
// else on screen changes in this settled window) - which is what actually
// rules out coincidence and confirms a clean, exact, periodic rule.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn14-bounce.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces/turn14-fly-miss.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

// Curated: the held-text baseline, the 6-tick blank hold, the reveal seam,
// the (0,1) one-tick blip, phase-group boundaries through one full local
// cycle, the two previously-regressed spot ticks (18095/18415 - the third,
// 18087, is the blip itself), and two far settled-tail spot ticks
// (18815/18956) - well under the oracle's 256-per-run capture cap.
const CAPTURE_FRAMES = [
  18078, 18079, 18080, 18081, 18082, 18083, 18084, 18085, 18086, 18087, 18088, 18089, 18095, 18096, 18097, 18104,
  18106, 18113, 18115, 18123, 18124, 18415, 18815, 18956,
];
check("curated capture list stays under the oracle's 256-per-run cap", CAPTURE_FRAMES.length <= 256, `got ${CAPTURE_FRAMES.length}`);
trace.captureFrames = CAPTURE_FRAMES;

async function main() {
  console.log(`Running fresh oracle capture over ${CAPTURE_FRAMES.length} ticks (turn14-fly-miss.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const sha = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c.sha256;
  };
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const allSame = (ticks: number[]) => new Set(ticks.map(sha12)).size === 1;

  // === The "ONIX's attack missed!" text is fully typed and HELD static
  // through 18079 - baseline, not part of the bug. ===
  check("18078 == 18079 (missed-text held static, nothing moving yet)", sha(18078) === sha(18079), `18078=${sha12(18078)} 18079=${sha12(18079)}`);

  // === The missing 6-tick BLANK HOLD (18080-18085), same class as #33(b)'s
  // turn-13 switch-in blank hold - currently unmodeled (the app holds the
  // typed text straight through this span instead). ===
  check("18079 != 18080 (text clears to blank here)", sha(18079) !== sha(18080), `both read ${sha12(18080)}`);
  check("18080..18085 all byte-identical (the missing 6-tick blank hold)", allSame([18080, 18081, 18082, 18083, 18084, 18085]), `shas: ${[18080, 18081, 18082, 18083, 18084, 18085].map(sha12).join(",")}`);

  // === TURN14_MENU_REDRAW_TICK=18086 is already the correct reveal anchor
  // (does NOT move, unlike turn 13's own conflated constant) - first tick
  // whose sha diverges from the blank hold's own. ===
  check("18085 != 18086 (blank -> interactive chrome reveal)", sha(18085) !== sha(18086), `both read ${sha12(18086)}`);

  // === RESET, not continue: under the RESET model, 18086's own (onixY2,
  // healthboxY2)=(0,0) phase recurs at 18088-18096 (crossing the blip) AND
  // at the previously-regressed 18095 - all byte-identical. The CURRENT
  // `t + TURN13_SWITCHIN_RESET_SHIFT` continuation formula predicts a
  // DIFFERENT, non-(0,0) phase for this whole span (RAM-probe-confirmed
  // mismatch on all 871 checked ticks 18086-18956), so this group of checks
  // is exactly what distinguishes RESET from CONTINUE. ===
  check("18086 == 18088 == 18089 == 18095 (one settled bounce phase, spans the reveal tick itself and the previously-regressed 18095)", allSame([18086, 18088, 18089, 18095]), `shas: ${[18086, 18088, 18089, 18095].map(sha12).join(",")}`);

  // === 18087 is a genuine one-tick (onix=0,healthbox=1) blip - the SAME
  // role turn 13's own 17113 played - distinct from both neighbors. ===
  check("18087 != 18086 (one-tick blip, distinct from the (0,0) group)", sha(18087) !== sha(18086), `both read ${sha12(18087)}`);
  check("18087 != 18088 (the blip doesn't persist)", sha(18087) !== sha(18088), `both read ${sha12(18087)}`);

  // === Phase group boundaries through one full local bounce cycle
  // (18097=(1,0), 18106=(1,1), 18115=(0,1), 18124=(0,0) again - a fresh
  // instance of the SAME phase 18086 started at, 38 ticks later, mirroring
  // `verify-turn13-bounce.ts`'s own 17112/17150 cross-check). ===
  check("18097 == 18104 ((1,0) phase group)", sha(18097) === sha(18104), `18097=${sha12(18097)} 18104=${sha12(18104)}`);
  check("18096 != 18097 (phase group boundary)", sha(18096) !== sha(18097), `both read ${sha12(18097)}`);
  check("18106 == 18113 ((1,1) phase group)", sha(18106) === sha(18113), `18106=${sha12(18106)} 18113=${sha12(18113)}`);
  check("18115 == 18123 ((0,1) phase group)", sha(18115) === sha(18123), `18115=${sha12(18115)} 18123=${sha12(18123)}`);
  check("18124 == 18086 ((0,0) phase repeats a full local cycle - 38 ticks - later)", sha(18124) === sha(18086), `18124=${sha12(18124)} 18086=${sha12(18086)}`);

  // === Cross-period confirmation, far apart: the SAME (onixY2,
  // healthboxY2)=(0,1) pair recurs at 18115, the previously-regressed
  // 18415 (300 ticks later), and the settled-tail spot ticks 18815/18956
  // (700/841 ticks later) - all four byte-identical. This is what rules out
  // "coincidence at these specific ticks" and confirms a clean periodic
  // rule spanning the WHOLE settled tail, not just the region right after
  // the reveal. ===
  check("18115 == 18415 == 18815 == 18956 ((0,1) phase recurs 300/700/841 ticks later - the far spot ticks named in ISSUES #34)", allSame([18115, 18415, 18815, 18956]), `shas: ${[18115, 18415, 18815, 18956].map(sha12).join(",")}`);

  console.log(`\n${CAPTURE_FRAMES.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
