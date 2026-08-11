// Worktree lane probe (2026-07-21, ISSUES #33(b) / docs/turn13-bounce-
// notes.md): pins the settled-menu bounce residual's real root cause
// straight from a FRESH `bin/oracle run` (pixel-only, no RAM reads, no
// src/ dependency - same convention as `verify-turn13-materialize.ts`).
//
// The claim being pinned: `TURN13_SWITCHIN_MENU_REDRAW_TICK` (src/engine/
// battleScene.ts:6932, currently 17106) is mis-anchored. 17106 is really
// the TEXT-CLEAR tick (message box goes blank, same shape as `TURN5_
// SITRUS_TEXT_CLEAR_TICK`) - there's a genuine 6-tick BLANK HOLD
// (17106-17111) before the interactive chrome actually reveals at
// **17112** (matching `TURN5_SITRUS_TEXT_CLEAR_TICK`(7216)-to-`TURN5_
// SITRUS_MENU_REDRAW_TICK`(7222)'s own identical 6-tick gap, byte-
// identical blank-box pixels (107,165,165) fill / (74,66,82) border
// confirmed against that already-solved window this session). The
// current code uses 17106 as BOTH the text-clear point AND the bounce-
// reset anchor, which (a) draws the full interactive chrome 6 ticks too
// early (the huge 5983-7539px named residual at 17106-17111) and (b)
// anchors the settled idle-bounce sine phase 6 ticks off, which - because
// the bounce's onixY2/healthboxY2 only take values {0,1,2} - only
// SOMETIMES flips the rendered offset, producing the smaller, `~9-tick`-
// periodic 769-2325px residual at 17113/17117-17122/17126-17130/17175/
// 17200 etc.
//
// Every check below is a pure ORACLE ground-truth fact (sha256 equality/
// inequality across specific ticks) - it holds regardless of what `src/`
// currently does, and is exactly what the corrected model predicts:
// group boundaries land on 17106, 17112, 17113, 17123 (not 17106/17107/
// 17117 the way the CURRENT `TURN13_SWITCHIN_MENU_REDRAW_TICK=17106`
// model would predict), and ticks sharing the same real (onixY2,
// healthboxY2) pair - including cross-period repeats a full local bounce
// cycle apart (17112/17150, 17123/17200, 17132/17175) - are byte-
// identical frames.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn13-bounce.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces/turn13-switchin.json";
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

// Curated: the text-held baseline, the 6-tick blank hold, the reveal seam,
// the (0,1) one-tick blip, two full local-bounce-period cross-checks, and
// three of the brief's own named residual spot ticks (17117, 17175,
// 17200) - well under the oracle's 256-per-run capture cap.
const CAPTURE_FRAMES = [
  17095, 17105, 17106, 17107, 17108, 17109, 17110, 17111, 17112, 17113, 17114, 17117, 17122, 17123, 17126, 17130,
  17132, 17150, 17175, 17200,
];
check("curated capture list stays under the oracle's 256-per-run cap", CAPTURE_FRAMES.length <= 256, `got ${CAPTURE_FRAMES.length}`);
trace.captureFrames = CAPTURE_FRAMES;

async function main() {
  console.log(`Running fresh oracle capture over ${CAPTURE_FRAMES.length} ticks (turn13-switchin.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const sha = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c.sha256;
  };
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const allSame = (ticks: number[]) => new Set(ticks.map(sha12)).size === 1;

  // === The sent-out text is fully typed and HELD static through 17105 -
  // no change tick to tick in this span (baseline, not part of the bug). ===
  check("17095 == 17105 (sent-out text held static, nothing moving yet)", sha(17095) === sha(17105), `17095=${sha12(17095)} 17114=${sha12(17105)}`);

  // === The REAL text-clear boundary: 17106 is the first blank tick, NOT
  // yet the interactive chrome (contradicts the existing `TURN13_SWITCHIN_
  // MENU_REDRAW_TICK=17106` doc comment, which cites this exact sha
  // (5e5283bf92c2) as "the settled family" - it's actually the blank
  // box's own sha, a false-positive bisection target). ===
  check("17105 != 17106 (text clears to blank here)", sha(17105) !== sha(17106), `both read ${sha12(17106)}`);
  check("17106 sha starts with 5e5283bf92c2 (the historically-mislabeled 'settled family' sha - it's really the blank box)", sha(17106).startsWith("5e5283bf92c2"), `got ${sha12(17106)}`);

  // === A genuine 6-tick flat BLANK HOLD, 17106-17111 inclusive - same
  // shape (and byte-identical fill/border colors, confirmed separately
  // this session by cropping) as `TURN5_SITRUS_TEXT_CLEAR_TICK`(7216)-to-
  // `TURN5_SITRUS_MENU_REDRAW_TICK`(7222)'s own already-solved 6-tick gap. ===
  check("17106..17111 all byte-identical (the missing 6-tick blank hold)", allSame([17106, 17107, 17108, 17109, 17110, 17111]), `shas: ${[17106, 17107, 17108, 17109, 17110, 17111].map(sha12).join(",")}`);

  // === The REAL chrome-reveal tick is 17112, not 17106 - this is where
  // `TURN13_SWITCHIN_MENU_REDRAW_TICK` must actually point (and therefore
  // where `TURN13_SWITCHIN_RESET_SHIFT`'s own anchor must move to). ===
  check("17111 != 17112 (blank -> interactive chrome reveal, the true redraw tick)", sha(17111) !== sha(17112), `both read ${sha12(17112)}`);

  // === Once anchored at 17112, the bounce's (onixY2,healthboxY2)=(0,0)
  // group covers 17112/17114 AND the brief's own named-mismatching
  // 17117/17122 - all four must be byte-identical under the TRUE model
  // (the CURRENT `17106`-anchored model predicts 17117/17122 have already
  // flipped to a different phase - that's the residual). ===
  check("17112 == 17114 == 17117 == 17122 (one settled bounce phase, spans the currently-mismodeled 17117/17122)", allSame([17112, 17114, 17117, 17122]), `shas: ${[17112, 17114, 17117, 17122].map(sha12).join(",")}`);

  // === 17113 is a genuine one-tick (0,1) blip - distinct from its
  // neighbors on both sides (not itself part of either the (0,0) or (1,0)
  // group). ===
  check("17113 != 17112 (one-tick (onix=0,healthbox=1) blip, distinct from the (0,0) group)", sha(17113) !== sha(17112), `both read ${sha12(17113)}`);
  check("17113 != 17114 (the blip doesn't persist)", sha(17113) !== sha(17114), `both read ${sha12(17113)}`);

  // === The next phase group, (1,0), spans the brief's own named
  // 17123/17126/17130 - all byte-identical, and distinct from the (0,0)
  // group before it. ===
  check("17123 == 17126 == 17130 ((1,0) phase group, spans the named 17126/17130 residual ticks)", allSame([17123, 17126, 17130]), `shas: ${[17123, 17126, 17130].map(sha12).join(",")}`);
  check("17122 != 17123 (phase group boundary)", sha(17122) !== sha(17123), `both read ${sha12(17122)}`);

  // === Cross-period confirmation: the SAME (onixY2,healthboxY2) pair
  // recurs a full local bounce cycle later and must be byte-identical
  // (nothing else on screen is still changing in this settled window) -
  // this is what actually rules out "it's just a coincidence at these
  // specific ticks" and confirms a clean periodic rule, not a one-off fit. ===
  check("17132 == 17175 ((1,1) phase group repeats 43 ticks later, spans the named 17175 residual tick)", sha(17132) === sha(17175), `17132=${sha12(17132)} 17175=${sha12(17175)}`);
  check("17123 == 17200 ((1,0) phase group repeats 77 ticks later, spans the named 17200 residual tick)", sha(17123) === sha(17200), `17123=${sha12(17123)} 17200=${sha12(17200)}`);
  check("17150 == 17112 ((0,0) phase group repeats 38 ticks later)", sha(17150) === sha(17112), `17150=${sha12(17150)} 17112=${sha12(17112)}`);

  console.log(`\n${CAPTURE_FRAMES.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
