// Worktree lane probe (2026-07-21, docs/turn13-notes.md's own dated
// addendum, §50's residual 1 "Murkrow's own materialize/wobble" section).
// Pixel-only (no RAM reads - same convention as verify-turn13.ts): re-derives
// the three render-lag seams and the growing-silhouette/wobble/settle
// boundaries straight from a FRESH `bin/oracle run`, no stale PNGs, so it
// fails loudly if the real hardware's pixels stop matching the docs'
// citations. Does NOT assert anything about `src/` rendering (no engine
// code changed this session) - this is oracle self-consistency only, a
// pin for whoever wires the new TURN13_MURKROW_WOBBLE_TABLE in next.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn13-materialize.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn13-dense-a.json";
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

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// Dense capture across the whole residual-1 window plus a little slack on
// both sides, per docs/turn13-notes.md's own dated addendum (RAM 16980-17080
// probed; render lag is +1, so this covers the same span in render ticks).
const MATERIALIZE_DENSE = range(17002, 17022);
const WOBBLE_SAMPLE = [17027, 17028, 17035, 17036, 17042, 17043, 17050, 17051, 17059, 17060, 17066, 17067, 17068];
const SETTLE_SAMPLE = [17069, 17070, 17075];

const captureFrames = Array.from(new Set([...MATERIALIZE_DENSE, ...WOBBLE_SAMPLE, ...SETTLE_SAMPLE])).sort((a, b) => a - b);
check("curated capture list stays under the oracle's 256-per-run cap", captureFrames.length <= 256, `got ${captureFrames.length}`);
trace.captureFrames = captureFrames;

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn13-dense-a.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;
  const sha12 = (t: number) => sha(t).slice(0, 12);

  // === Render-lag seam 1: materialize onset. RAM 17002 (still invisible,
  // accumulator=40) -> RAM 17003 (visible, accumulator~58) is the FIRST
  // visible-growth tick; render lag +1 puts that on render 17004. ===
  check("pre-growth baseline (17002) matches the existing dossier's own cited materialize-sequence sha (d52464f09ddd)", sha12(17002) === "d52464f09ddd", `got ${sha12(17002)}`);
  check("render 17003 still matches the pre-growth baseline's own next cited sha (9262e5b26ab8), NOT yet grown", sha12(17003) === "9262e5b26ab8", `got ${sha12(17003)}`);
  check("render 17004 is the first visibly-grown frame (distinct from 17003)", sha(17004) !== sha(17003), `both read ${sha12(17004)}`);

  // === Growing-silhouette phase: monotonic distinct frames through the
  // 12-tick affineEmergeAccumulator ramp (render 17004-17015), matching
  // MATERIALIZE_Y2_TABLE/affineEmergeAccumulator holding byte-exact. ===
  const growthShas = range(17004, 17015).map(sha12);
  check("growing-silhouette phase (17004-17015) is 12 distinct frames (real per-tick scale growth, not a plateau)", new Set(growthShas).size === growthShas.length, `shas: ${growthShas.join(",")}`);

  // === Render-lag seam 2: wobble onset. RAM 17018 (animNum flips 0->1,
  // still affineMode NORMAL identity) -> RAM 17019 (affineMode DOUBLE,
  // data4 starts incrementing) is where the double-affine wobble engages;
  // render lag +1 puts the first visible wobble frame at render 17020. ===
  check("render 17020 is the first visibly-wobbled frame (distinct from 17019, the double-affine engagement tick)", sha(17020) !== sha(17019), `both read ${sha12(17020)}`);

  // === Wobble-phase sanity: every sparsely-sampled tick distinct from its
  // immediate neighbor sample (the RAM-derived TURN13_MURKROW_WOBBLE_TABLE
  // predicts continuous, non-repeating xScale/yScale/y2 movement across
  // this whole span except at its own two 16-tick-apart identity crossings,
  // none of which this sparse sample happens to land on both sides of). ===
  for (let i = 0; i < WOBBLE_SAMPLE.length - 1; i += 1) {
    const a = WOBBLE_SAMPLE[i]!;
    const b = WOBBLE_SAMPLE[i + 1]!;
    check(`wobble-phase sample ${a} differs from ${b}`, sha(a) !== sha(b), `both read ${sha12(a)}`);
  }

  // === Render-lag seam 3 / the table's own closing boundary: RAM 17067 is
  // the last non-identity tick; RAM 17068 already reads flat identity -
  // render 17069 should ALREADY be pixel-identical to the settled render
  // 17070 (TURN13_MURKROW_SETTLE_TICK), one tick before the settle cutover
  // even takes effect. This is the off-by-one the docs' own new
  // TURN13_MURKROW_WOBBLE_TABLE entry 49 exists to close. ===
  check("render 17068 is still wobble-affected (distinct from the settled sha)", sha(17068) !== sha(17069), `both read ${sha12(17068)}`);
  check("render 17069 is ALREADY pixel-identical to render 17070 (TURN13_MURKROW_SETTLE_TICK) - the table must end here, not clamp-repeat its last entry", sha(17069) === sha(17070), `17069=${sha12(17069)}, 17070=${sha12(17070)}`);
  check("render 17070 matches the existing TURN13_MURKROW_SETTLE_TICK sha this session's own probe cited (504aa59db260)", sha12(17070) === "504aa59db260", `got ${sha12(17070)}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
