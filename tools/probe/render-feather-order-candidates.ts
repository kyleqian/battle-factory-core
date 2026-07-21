// S7 worktree probe, ISSUES #30 DECISIVE pixel test: render the 2 narrowed
// `sSpriteOrder` (4,7)-pair candidates from
// `tools/probe/simulate-feather-sprite-order.py` (via
// `dump-feather-order-candidates.py`'s JSON dump of the same, unmodified,
// algorithm) against fresh oracle captures, and diff shipped vs candidate A
// vs candidate B per tick. Read-only against engine code: only imports
// already-exported primitives (`drawSpriteSheetAffineRotate`,
// `compareFeatherDrawOrder`, `turn{6,7,8}FeatherSprites`) plus the
// committed probe/asset JSON data. Renders the "shipped" variant via the
// REAL production pipeline (`renderAppTrace`, the same one `npm run
// compare` uses), and derives candidate A/B frames by patching only the
// pixels where 2+ same-priority feathers overlap (the only pixels an
// internal reordering of a tie group can possibly change - see the
// docstring on `patchTieGroups` below for the proof sketch).
//
// Usage: npx tsx tools/probe/render-feather-order-candidates.ts

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawSpriteSheetAffineRotate } from "../../src/engine/battleScene.ts";
import {
  compareFeatherDrawOrder,
  turn6FeatherSprites,
  turn7FeatherSprites,
  turn8FeatherSprites,
  type FeatherRenderSprite,
} from "../../src/engine/featherDance.ts";
import battleAnimWhiteFeatherAsset from "../../src/assets/gen/battle-anim-white-feather.json" with { type: "json" };

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}
const battleAnimWhiteFeather = battleAnimWhiteFeatherAsset as { tileset: Tileset; frame2: Tileset; palette: [number, number, number][] };

/** Same class/value as `featherDance.ts`'s own private `FEATHER_RENDER_LAG` (re-verified per-turn in battle-turn-notes.md §34) - not importable (unexported), restated here as a known constant, not a guess. */
const FEATHER_RENDER_LAG = 1;

const TURN_LOOKUPS: Record<string, (t: number) => FeatherRenderSprite[]> = {
  turn6: turn6FeatherSprites,
  turn7: turn7FeatherSprites,
  turn8: turn8FeatherSprites,
};

interface CandidateDump {
  lastRamTick: number;
  residualWindow: [number, number];
  candidates: { a: Record<string, number[]>; b: Record<string, number[]> };
}

function spotTicks(w0: number, w1: number, n: number): number[] {
  const out = new Set<number>();
  for (let i = 0; i < n; i += 1) out.add(w0 + Math.round(((w1 - w0) * i) / (n - 1)));
  return [...out].sort((x, y) => x - y);
}

/**
 * Renders one feather sprite in isolation onto a scratch RGBA buffer whose
 * alpha channel starts at 0 (untouched sentinel - `drawSpriteSheetAffineRotate`'s
 * `setPixel` always writes alpha=255) and returns a sparse pixel-index -> RGB
 * map of exactly the pixels it painted.
 */
function spriteFootprint(s: FeatherRenderSprite): Map<number, [number, number, number]> {
  const tileset = s.animNum === 1 ? battleAnimWhiteFeather.frame2 : battleAnimWhiteFeather.tileset;
  const buf = new Uint8Array(240 * 160 * 4);
  drawSpriteSheetAffineRotate(buf, tileset, battleAnimWhiteFeather.palette, s.centerX, s.centerY, s.pa, s.pb, s.pc, s.pd);
  const map = new Map<number, [number, number, number]>();
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (buf[o + 3] === 255) map.set(y * 240 + x, [buf[o]!, buf[o + 1]!, buf[o + 2]!]);
    }
  }
  return map;
}

function compositeGroup(order: FeatherRenderSprite[], footprints: Map<number, Map<number, [number, number, number]>>): Map<number, [number, number, number]> {
  const result = new Map<number, [number, number, number]>();
  for (const s of order) {
    const fp = footprints.get(s.slot);
    if (!fp) continue;
    for (const [k, c] of fp) result.set(k, c);
  }
  return result;
}

/**
 * Patches `frame` (a clone of the shipped rgba) in place with `candidateOrder`'s
 * own composite, restricted to pixels where 2+ SAME-PRIORITY feathers overlap.
 *
 * Proof sketch (why isolating just the tie group is safe): `compareFeatherDrawOrder`
 * sorts primarily by `priority` (descending), so same-priority members are always
 * CONTIGUOUS in the real paint sequence - nothing of a different priority can be
 * interleaved within a tie group's own block, in EITHER the shipped or a candidate
 * ordering (both use priority as the dominant key; only the intra-block order is in
 * question). So: (a) the group's own combined footprint (which pixels ANY member
 * covers) is identical between orderings - same sprites, same shapes, just
 * reordered; (b) whether some other sprite (a different priority, or Onix) paints
 * OVER a given group pixel afterward is unaffected by which group member "wins" the
 * internal tie, since that other sprite's position relative to the WHOLE block is
 * fixed by priority alone. This is verified per-pixel at patch time, not just
 * assumed: `matchesReal` checks that the shipped isolated-group composite already
 * equals the real shipped frame's pixel before trusting the swap; any pixel where
 * that fails (something else painted on top afterward) is left untouched and
 * counted in `unsafe`, so any hole in this reasoning shows up as a nonzero count
 * rather than a silently wrong pixel.
 */
function patchTieGroups(
  frame: Uint8Array,
  shippedRgba: Uint8Array,
  tieGroups: FeatherRenderSprite[][],
  footprints: Map<number, Map<number, [number, number, number]>>,
  candidateOrderFor: (group: FeatherRenderSprite[]) => FeatherRenderSprite[],
): number {
  let unsafe = 0;
  for (const group of tieGroups) {
    const shippedOrder = group.slice().sort(compareFeatherDrawOrder);
    const shippedComposite = compositeGroup(shippedOrder, footprints);
    const candidateOrder = candidateOrderFor(group);
    const candidateComposite = compositeGroup(candidateOrder, footprints);
    for (const [key, shippedColor] of shippedComposite) {
      const o = key * 4;
      const matchesReal = shippedRgba[o] === shippedColor[0] && shippedRgba[o + 1] === shippedColor[1] && shippedRgba[o + 2] === shippedColor[2];
      if (!matchesReal) {
        unsafe += 1;
        continue;
      }
      const candColor = candidateComposite.get(key)!;
      frame[o] = candColor[0];
      frame[o + 1] = candColor[1];
      frame[o + 2] = candColor[2];
    }
  }
  return unsafe;
}

function diffCount(a: Uint8Array | Buffer, b: Uint8Array | Buffer): number {
  let n = 0;
  for (let i = 0; i < 240 * 160; i += 1) {
    const o = i * 4;
    if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2]) n += 1;
  }
  return n;
}

async function runJob(turn: string, traceFile: string, captureFrames: number[], dump: CandidateDump) {
  const base = JSON.parse(readFileSync(traceFile, "utf8")) as Trace;
  const trace: Trace = { segments: base.segments, captureFrames };
  const lookup = TURN_LOOKUPS[turn]!;

  const [oracleResult, appCaptures] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const appByFrame = new Map(appCaptures.map((c) => [c.frame, c]));

  const perTick: { tick: number; shipped: number; a: number; b: number; unsafeA: number; unsafeB: number }[] = [];
  for (const oc of oracleResult.captures) {
    const app = appByFrame.get(oc.frame);
    if (!app) {
      console.error(`  ${turn} tick ${oc.frame}: MISSING app capture`);
      continue;
    }
    const shippedRgba = app.rgba instanceof Uint8Array ? app.rgba : new Uint8Array(app.rgba);
    const oracleRgba = oc.rgba;
    const shippedDiff = diffCount(shippedRgba, oracleRgba);

    const sprites = lookup(oc.frame);
    const groups = new Map<number, FeatherRenderSprite[]>();
    for (const s of sprites) {
      const g = groups.get(s.priority) ?? [];
      g.push(s);
      groups.set(s.priority, g);
    }
    const tieGroups = [...groups.values()].filter((g) => g.length >= 2);

    let aDiff = shippedDiff;
    let bDiff = shippedDiff;
    let unsafeA = 0;
    let unsafeB = 0;
    if (tieGroups.length > 0) {
      const ramTick = String(oc.frame - FEATHER_RENDER_LAG);
      const footprints = new Map<number, Map<number, [number, number, number]>>();
      for (const g of tieGroups) for (const s of g) footprints.set(s.slot, spriteFootprint(s));

      const orderFor = (candKey: "a" | "b") => (group: FeatherRenderSprite[]) => {
        const simFrontToBack = dump.candidates[candKey][ramTick];
        if (!simFrontToBack) {
          console.error(`  ${turn} tick ${oc.frame}: missing sim data for RAM tick ${ramTick}`);
          return group.slice().sort(compareFeatherDrawOrder);
        }
        const paintOrderFull = [...simFrontToBack].reverse();
        const bySlot = new Map(group.map((s) => [s.slot, s]));
        const out: FeatherRenderSprite[] = [];
        for (const slot of paintOrderFull) {
          const s = bySlot.get(slot);
          if (s) out.push(s);
        }
        return out;
      };

      const frameA = new Uint8Array(shippedRgba);
      unsafeA = patchTieGroups(frameA, shippedRgba, tieGroups, footprints, orderFor("a"));
      aDiff = diffCount(frameA, oracleRgba);

      const frameB = new Uint8Array(shippedRgba);
      unsafeB = patchTieGroups(frameB, shippedRgba, tieGroups, footprints, orderFor("b"));
      bDiff = diffCount(frameB, oracleRgba);
    }

    perTick.push({ tick: oc.frame, shipped: shippedDiff, a: aDiff, b: bDiff, unsafeA, unsafeB });
  }
  return perTick;
}

async function main() {
  console.log("regenerating candidate order dump...");
  execFileSync("python3", ["tools/probe/dump-feather-order-candidates.py"], { stdio: "inherit" });
  const dumpAll = JSON.parse(readFileSync("tools/probe/out/feather-order-candidates.json", "utf8")) as Record<string, CandidateDump>;

  const jobs: { turn: string; traceFile: string; captureFrames: number[] }[] = [
    { turn: "turn6", traceFile: "tools/compare/traces/turn6-menu.json", captureFrames: range(7421, 7549) },
    { turn: "turn7", traceFile: "tools/compare/traces/turn7-menu.json", captureFrames: spotTicks(8455, 8583, 8) },
    { turn: "turn8", traceFile: "tools/compare/traces/turn8-menu.json", captureFrames: spotTicks(9501, 9629, 8) },
  ];

  const results: Record<string, Awaited<ReturnType<typeof runJob>>> = {};
  for (const job of jobs) {
    console.log(`\n=== ${job.turn}: ${job.captureFrames.length} captures ===`);
    const perTick = await runJob(job.turn, job.traceFile, job.captureFrames, dumpAll[job.turn]!);
    results[job.turn] = perTick;
    let totalShipped = 0;
    let totalA = 0;
    let totalB = 0;
    let totalUnsafeA = 0;
    let totalUnsafeB = 0;
    for (const r of perTick) {
      totalShipped += r.shipped;
      totalA += r.a;
      totalB += r.b;
      totalUnsafeA += r.unsafeA;
      totalUnsafeB += r.unsafeB;
      if (r.shipped || r.a || r.b) {
        console.log(`  tick ${r.tick}: shipped=${r.shipped}px A=${r.a}px B=${r.b}px` + (r.unsafeA || r.unsafeB ? ` (unsafeA=${r.unsafeA} unsafeB=${r.unsafeB})` : ""));
      }
    }
    console.log(`  TOTAL: shipped=${totalShipped}px A=${totalA}px B=${totalB}px unsafeA=${totalUnsafeA} unsafeB=${totalUnsafeB} (${perTick.length} ticks)`);
  }

  mkdirSync("tools/probe/out", { recursive: true });
  writeFileSync("tools/probe/out/feather-order-render-results.json", JSON.stringify(results, null, 2));
  console.log("\nwrote tools/probe/out/feather-order-render-results.json");
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
