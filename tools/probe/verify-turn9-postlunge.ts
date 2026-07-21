// S7 slice R rungs (c3)/(c4) prep — mandatory first step for whoever picks this
// up next, same convention as tools/compare/scratch/diag-quickattack-anchor.ts.
// Re-derives the pinned facts in docs/turn9-shake-notes.md straight from a FRESH
// `bin/oracle run` (no stale PNGs, no trusting the doc's own prose) and fails
// loudly if the real hardware's pixels ever stop matching this session's own
// findings. Pixel-only (no RAM reads — this runs from plain `node`, not the
// mgba-venv python interpreter the RAM probes need); RAM facts are cross-cited
// in the notes doc from tools/probe/dump-endeavor-tail.py / dump-quickattack-
// anim.py runs, not re-asserted here.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn9-postlunge.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

// Union of every tick this script's assertions touch, across both windows.
const EP1_RANGE = range(10924, 10950);
const EP2_RANGE = range(10945, 10986);
const MSG_RANGE = range(10999, 11006);
const captureFrames = Array.from(new Set([...EP1_RANGE, ...EP2_RANGE, ...MSG_RANGE])).sort((a, b) => a - b);
trace.captureFrames = captureFrames;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// Bboxes (screen-space, half-open) — see docs/turn9-shake-notes.md's own methodology section.
const ONIX_BOX = { x0: 44, x1: 99, y0: 49, y1: 111 }; // Onix's own real sprite (battler0, gBattlerSpriteIds slot 6)
const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 }; // the AnimHitSplatBasic sprite footprint (32x32 @ center 72,88)
const HEALTHBOX_BOX = { x0: 127, x1: 229, y0: 74, y1: 110 }; // Onix's own healthbox + border sub-pieces

function inBox(x: number, y: number, b: { x0: number; x1: number; y0: number; y1: number }): boolean {
  return x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;
}

interface RegionDiff {
  total: number;
  onix: number; // ONIX_BOX minus HITSPLAT_BOX
  hitsplat: number; // HITSPLAT_BOX
  healthbox: number; // HEALTHBOX_BOX
  other: number;
}

function diffRegions(png: Buffer, basePng: Buffer): RegionDiff {
  const img = PNG.sync.read(png);
  const base = PNG.sync.read(basePng);
  const out: RegionDiff = { total: 0, onix: 0, hitsplat: 0, healthbox: 0, other: 0 };
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (img.data[i] === base.data[i] && img.data[i + 1] === base.data[i + 1] && img.data[i + 2] === base.data[i + 2]) continue;
      out.total += 1;
      if (inBox(x, y, HITSPLAT_BOX)) out.hitsplat += 1;
      else if (inBox(x, y, ONIX_BOX)) out.onix += 1;
      else if (inBox(x, y, HEALTHBOX_BOX)) out.healthbox += 1;
      else out.other += 1;
    }
  }
  return out;
}

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };

  // --- Episode 1 (lunge-adjacent x2 shake + hitsplat), RAM ticks 10934-10943 ---
  const ep1Base = get(10924).png;
  const ep1 = (t: number) => diffRegions(get(t).png, ep1Base);

  check("10924-10928 settle: 0 diff vs self (sanity)", ep1(10928).total === 0, `got ${JSON.stringify(ep1(10928))}`);

  // Hitsplat (slot 7): RAM live 10934-10943 (10 ticks) -> render 10935-10944
  // (RAM+1 lag, ENDEAVOR_HITSPLAT_RENDER_LAG's own family).
  check("hitsplat NOT yet visible at 10934", ep1(10934).hitsplat === 0, `got ${ep1(10934).hitsplat}`);
  for (const t of range(10935, 10944)) {
    check(`hitsplat visible at ${t}`, ep1(t).hitsplat > 0, `got ${ep1(t).hitsplat}`);
  }
  check("hitsplat gone by 10945", ep1(10945).hitsplat === 0, `got ${ep1(10945).hitsplat}`);

  // Onix's own x2 shake (excl. hitsplat box): RAM x2=5/0 pairs at 10936-10943 ->
  // render+2 lag puts the shifted silhouette at 10938/10939/10942/10943, PLUS an
  // extra stall tick at 10935 (the shake task's own creation-tick stall, same
  // family as the fade-out task's stall docs/battle-menu-notes.md §10 notes).
  for (const t of [10935, 10938, 10939, 10942, 10943]) {
    check(`onix silhouette shifted at ${t} (x2 shake active)`, ep1(t).onix > 0, `got ${ep1(t).onix}`);
  }
  for (const t of [10936, 10937, 10940, 10941, 10944]) {
    check(`onix silhouette at rest at ${t} (x2=0)`, ep1(t).onix === 0, `got ${ep1(t).onix}`);
  }

  check("frame 10947 byte-identical to pre-window baseline (§36's own 0-diff-at-10947 claim)", ep1(10947).total === 0, `got ${ep1(10947).total}`);

  // --- Episode 2 (target shake, RAM ticks 10957-10977), healthbox wobble + Onix flicker ---
  const ep2Base = get(10945).png;
  const ep2 = (t: number) => diffRegions(get(t).png, ep2Base);

  check("no episode-2 activity yet at 10957 (pre-render-lag)", ep2(10957).onix === 0 && ep2(10957).healthbox === 0, `got ${JSON.stringify(ep2(10957))}`);

  // Healthbox/border y2 wobble: render 10958-10977 (20 ticks, RAM+1 lag off the
  // RAM 10957-10976 alternation) — every tick in this span must differ from the
  // pre-window baseline in the healthbox region.
  for (const t of range(10958, 10977)) {
    check(`healthbox wobble active at ${t}`, ep2(t).healthbox > 0, `got ${ep2(t).healthbox}`);
  }
  check("healthbox settled by 10978", ep2(10978).healthbox === 0, `got ${ep2(10978).healthbox}`);

  // Healthbox alternation parity: same-phase ticks 4 apart must match EXACTLY
  // (both reflect the same RAM y2 sign), matching the "identical diff count"
  // shape §36 flagged (root-caused here: it's the invisible-gated onix box that
  // looks deceptively constant, NOT the healthbox, which genuinely alternates).
  check("healthbox phase-locked: diff(10958) === diff(10962)", ep2(10958).healthbox === ep2(10962).healthbox, `${ep2(10958).healthbox} vs ${ep2(10962).healthbox}`);
  check("healthbox alternates: diff(10958) !== diff(10959)", ep2(10958).healthbox !== ep2(10959).healthbox, `both ${ep2(10958).healthbox}`);

  // Onix's own sprite: NOT a positional shift (RAM x2=y2=0 throughout episode 2,
  // tools/probe/dump-endeavor-tail.py) — the only thing gating the onix bbox is
  // the independent invisible-flicker, three 4-tick blocks at render
  // 10959-10962/10967-10970/10975-10978 (RAM+1 lag off RAM 10958-61/66-69/74-77).
  const invisibleBlocks = [range(10959, 10962), range(10967, 10970), range(10975, 10978)];
  for (const block of invisibleBlocks) {
    for (const t of block) check(`onix hidden (flicker) at ${t}`, ep2(t).onix > 0, `got ${ep2(t).onix}`);
  }
  for (const t of [10963, 10964, 10965, 10966, 10971, 10972, 10973, 10974]) {
    check(`onix visible (between flicker blocks) at ${t}`, ep2(t).onix === 0, `got ${ep2(t).onix}`);
  }
  // The three invisible blocks are pixel-identical to each other (same erasure,
  // no residual y2 dependence) — confirms the onix bbox is gated by visibility
  // alone, not by the healthbox's own y2 parity.
  check("flicker erasure identical across all 3 blocks", ep2(10959).onix === ep2(10967).onix && ep2(10967).onix === ep2(10975).onix, `${ep2(10959).onix}, ${ep2(10967).onix}, ${ep2(10975).onix}`);

  // (`.other` stays nonzero here — Pidgeotto's own still-unmodeled animation
  // loop, rung (c2)'s territory, keeps churning throughout; out of scope.)
  check(
    "episode 2 (onix+healthbox) fully settled by 10979",
    ep2(10979).onix === 0 && ep2(10979).healthbox === 0,
    `got onix=${ep2(10979).onix} healthbox=${ep2(10979).healthbox}`,
  );

  // --- HP-drain / message-box transition boundary (C4 territory, partial) ---
  const msgBase = get(10999).png;
  const msg = (t: number) => diffRegions(get(t).png, msgBase);
  for (const t of [11000, 11001, 11002, 11003, 11004]) {
    check(`still static pre-message at ${t}`, msg(t).other === 0, `got ${msg(t).other}`);
  }
  check("message-box transition begins at 11005 (not 11004 or 11006)", msg(11004).other === 0 && msg(11005).other > 0, `10999-11004 flat=${msg(11004).other===0}, 11005 diff=${msg(11005).other}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
