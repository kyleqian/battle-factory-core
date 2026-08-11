// Worktree-lane probe (2026-07-22, ISSUES #35 / ISSUES #34's own remainder,
// docs/turn13-bounce-notes.md §12): pins the SAME missing-shift rule that
// root-causes BOTH the 7-tick turn-15 FIGHT-submenu-open residual AND a
// 9-tick subset of turn 14's 43-tick FIGHT-submenu-reopen residual.
//
// The claim being pinned: `drawTurn14FightSubmenuWindow`'s
// (`battleScene.ts:10943-10964`) and `drawTurn15FightSubmenuWindow`'s
// (`battleScene.ts:11045-11066`) own POST-REVEAL, PRE-CONFIRM branch
// ("submenu open, waiting for the confirm press") both compute
// `shiftedBounceTick = t + <turn's own RESET_SHIFT>` with NO
// `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` correction — unlike EVERY other turn's
// own structurally-identical branch (turns 2-13, `battleScene.ts`'s own
// `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` idiom, e.g. `drawTurn13FightSubmenu
// Window` line 9811), which all apply this same DMA-wait drift correction
// there. A direct RAM probe (`dump-turn14-bounce-driver.py`, reused
// verbatim, re-pointed at `turn15-fly-strike.json`'s own segments —
// byte-identical prefix to `turn14-fly-miss.json` through tick 18956,
// confirmed by segment diff) fitting the CANDIDATE model
// (`(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT) + RESET_SHIFT`, fed through the
// SAME `turn5SitrusResettledBounceTick`/`menuIdleBounce` pipeline every
// other regime in this file already reuses) against the raw `onixY2`/
// `healthboxMainY2` sprite fields found:
//   - turn 15's own post-reveal window (screen ticks 18958-18991, RAM
//     probed 17700-18995): the CANDIDATE model is EXACT — 0 mismatches
//     across the WHOLE window. The CURRENT (unshifted) model mismatches at
//     EXACTLY the 7 ticks ISSUES #35 names (18965/18966, 18974/18975,
//     18983/18984/18985) and NO others — a perfect 1:1 explanation.
//   - turn 14's own analogous window (screen ticks 17722-17757, the
//     pre-confirm portion of ISSUES #34's 43-tick family): the CANDIDATE
//     model is likewise EXACT — 0 mismatches. The CURRENT model mismatches
//     at exactly 9 ticks (17726/17727, 17735/17736, 17744/17745,
//     17753/17754/17755 — the SAME "2-3-tick cluster every ~9 ticks" shape,
//     including the single-tick "blip" this dossier's own `dfe20074ba4f`-
//     style artifacts already established elsewhere), a SUBSET of the named
//     43. Ticks 17758-17768 (11 of the 43) are past this window entirely —
//     RAM shows the ALREADY-active frozen-phase branch there
//     (`turn14KickoffBounceTick`'s own `TURN5_SITRUS_MENU_REDRAW_TICK`
//     freeze) already predicts the correct `(0,0)` constant with ZERO
//     mismatches, so this rule does NOT explain that remainder — it is
//     genuinely a separate, still-uncharacterized issue (see
//     docs/turn13-bounce-notes.md §12 for the full writeup).
//
// This script is the SAME kind of oracle-only, `src/`-independent sha
// equality/inequality pin `verify-turn13-bounce.ts`/`verify-turn14-bounce.ts`
// already established for this exact situation: rather than requiring RAM
// access to re-verify, it checks that real hardware's OWN plateau/transition
// shape (five ~9-tick plateaus per window, one single-tick blip at the
// confirm press) matches what the CANDIDATE (shifted) model predicts and
// does NOT match what the CURRENT (unshifted) model predicts — a directly
// falsifiable pixel fact, reproducible with a fresh `bin/oracle run`, no
// `src/` dependency at all.
//
// Usage: node --experimental-strip-types tools/probe/verify-submenu-bounce.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces/turn15-fly-strike.json";
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

// Curated: both windows' own five plateaus + confirm-press blip, plus the
// boundary ticks that pin each transition. Turn 14's window (17719-17758)
// and turn 15's window (18958-18992) — 60 ticks total, well under the
// oracle's 256-per-run cap.
const CAPTURE_FRAMES = [
  // --- Turn 14 (17722-17768 family, pre-confirm portion) ---
  17721, 17722, 17727, 17728, // G1=(1,1) -> G2=(0,1) boundary at 17728
  17734, 17735, 17736, 17737, // G2 -> G3=(0,0) boundary at 17737
  17743, 17744, 17745, 17746, // G3 -> G4=(1,0) boundary at 17746
  17752, 17753, 17754, 17755, 17756, 17757, // G4 -> blip(17755) -> G6=(1,1)
  17758, // frozen branch begins (NOT explained by this rule)
  // --- Turn 15 (18956-19044 window, boundary-(i) trace) ---
  18956, 18961, 18962, // closed pre-reveal chrome (18956-18961) -> reveal at 18962
  18963, 18964, 18965, 18966, 18967, // G(0,1) -> boundary at 18967
  18973, 18974, 18975, 18976, // -> G(0,0) -> boundary at 18976
  18982, 18983, 18984, 18985, 18986, 18987, // -> G(1,0) -> blip(18985) -> G(1,1)
];
check("curated capture list stays under the oracle's 256-per-run cap", CAPTURE_FRAMES.length <= 256, `got ${CAPTURE_FRAMES.length}`);
trace.captureFrames = [...new Set(CAPTURE_FRAMES)].sort((a, b) => a - b);

async function main() {
  console.log(`Running fresh oracle capture over ${trace.captureFrames!.length} ticks (turn15-fly-strike.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const sha = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c.sha256;
  };
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const allSame = (ticks: number[]) => new Set(ticks.map(sha12)).size === 1;

  // === TURN 14 (17722-17768's own pre-confirm portion) ===

  // G1=(1,1): real hardware holds this phase through 17727 - the CURRENT
  // (unshifted) model wrongly transitions two ticks early, at 17726.
  check("turn14 17722 == 17727 (G1=(1,1) holds through the CURRENT model's own premature 17726 transition)", sha(17722) === sha(17727), `17722=${sha12(17722)} 17727=${sha12(17727)}`);
  check("turn14 17727 != 17728 (real G1->G2 boundary)", sha(17727) !== sha(17728), `both read ${sha12(17728)}`);

  // G2=(0,1): holds through 17736.
  check("turn14 17728 == 17736 (G2=(0,1) holds through the CURRENT model's own premature 17735 transition)", sha(17728) === sha(17736), `17728=${sha12(17728)} 17736=${sha12(17736)}`);
  check("turn14 17736 != 17737 (real G2->G3 boundary)", sha(17736) !== sha(17737), `both read ${sha12(17737)}`);

  // G3=(0,0): holds through 17745.
  check("turn14 17737 == 17745 (G3=(0,0) holds through the CURRENT model's own premature 17744 transition)", sha(17737) === sha(17745), `17737=${sha12(17737)} 17745=${sha12(17745)}`);
  check("turn14 17745 != 17746 (real G3->G4 boundary)", sha(17745) !== sha(17746), `both read ${sha12(17746)}`);

  // G4=(1,0): holds through 17754 (the CURRENT model wrongly transitions at
  // 17753 AND treats 17754 as already the blip).
  check("turn14 17746 == 17754 (G4=(1,0) holds through the CURRENT model's own premature 17753 transition)", sha(17746) === sha(17754), `17746=${sha12(17746)} 17754=${sha12(17754)}`);

  // Confirm-press blip at 17755 - a genuine single-tick (2,1) phase, distinct
  // from both neighbors (same role as this dossier's own already-documented
  // one-tick blips, e.g. turn13's 17113).
  check("turn14 17754 != 17755 (confirm-press blip, distinct from G4)", sha(17754) !== sha(17755), `both read ${sha12(17755)}`);
  check("turn14 17755 != 17756 (the blip doesn't persist)", sha(17755) !== sha(17756), `both read ${sha12(17755)}`);
  check("turn14 17756 == 17757 (G6=(1,1) settles after the blip)", sha(17756) === sha(17757), `17756=${sha12(17756)} 17757=${sha12(17757)}`);

  // Past 17757, the ALREADY-CORRECT frozen branch takes over (constant
  // (0,0)) - NOT explained by this rule, flagged not asserted.
  check("turn14 17757 != 17758 (freeze boundary - a SEPARATE, already-correct mechanism, out of this rule's scope)", sha(17757) !== sha(17758), `both read ${sha12(17758)}`);

  // === TURN 15 (18956-19044's own boundary-(i) window) ===

  check("turn15 18956 == 18961 (closed pre-reveal chrome, unaffected by this rule)", sha(18956) === sha(18961), `18956=${sha12(18956)} 18961=${sha12(18961)}`);
  check("turn15 18961 != 18962 (chrome reveal, pressTick(18957)+FIGHT_SUBMENU_OPEN_DELAY(5))", sha(18961) !== sha(18962), `both read ${sha12(18962)}`);
  check("turn15 18962 == 18966 (G=(0,1) holds through the CURRENT model's own premature 18965 transition)", sha(18962) === sha(18966), `18962=${sha12(18962)} 18966=${sha12(18966)}`);
  check("turn15 18966 != 18967 (real G->G boundary)", sha(18966) !== sha(18967), `both read ${sha12(18967)}`);

  check("turn15 18967 == 18975 (G=(0,0) holds through the CURRENT model's own premature 18974 transition)", sha(18967) === sha(18975), `18967=${sha12(18967)} 18975=${sha12(18975)}`);
  check("turn15 18975 != 18976 (real G->G boundary)", sha(18975) !== sha(18976), `both read ${sha12(18976)}`);

  check("turn15 18976 == 18984 (G=(1,0) holds through the CURRENT model's own premature 18983 transition)", sha(18976) === sha(18984), `18976=${sha12(18976)} 18984=${sha12(18984)}`);

  check("turn15 18984 != 18985 (the (2,1) blip, distinct from its own neighbors - same role as turn14's 17755)", sha(18984) !== sha(18985), `both read ${sha12(18985)}`);
  check("turn15 18985 != 18986 (the blip doesn't persist)", sha(18985) !== sha(18986), `both read ${sha12(18985)}`);
  check("turn15 18986 == 18987 (G=(1,1) settles after the blip)", sha(18986) === sha(18987), `18986=${sha12(18986)} 18987=${sha12(18987)}`);

  // Cross-window confirmation: turn 14's and turn 15's own analogous
  // plateaus should NOT be byte-identical to each other (different battle
  // content on screen - message box, cursor, etc.), just structurally the
  // same SHAPE - a sanity check this isn't a copy-paste artifact.
  check("turn14 17722 != turn15 18956 (same bug SHAPE, not the same frame content)", sha(17722) !== sha(18956), "expected different battle content");

  console.log(`\n${trace.captureFrames!.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
