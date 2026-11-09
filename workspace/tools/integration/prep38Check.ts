// usage: node --experimental-strip-types --no-warnings tools/integration/prep38Check.ts --probes=<OUT dir> --out=<receipt.json> fixture.json...
// prep38: the PRODUCTION live view (renderBattleResolutionLiveView over liveAdapterFramebuffer.ts liveView) vs the two fresh prep38Probe.py
// runs of each fixture's own scenario, every row of the dense window [activation, first inactive row]. A `defenderDoll` fixture flags the
// DEFENDER as the displayed Substitute doll (BattleCommandFieldBattler.substituteDoll, the production presentation flag) and rebuilds the field
// art from it (createBattleCommandFieldArtView), exactly what production holds while the doll is up. Without the prep38 patch production
// declines (liveMoveSubstituteDollDeclines) and draws the static Scene OFF field (the fallback); with it the live adapter runs on the doll.
// Per run: rows, exact rows, residual px, digest (sha256 of the per-row residual list); per fixture: whether the two run digests agree, the
// affected ages, max px/row and the residual bbox (field / chrome split). Compact: no RGB.
// Age alignment: row i of the window is shown at live age i + shift. --shift=<s> fixes it; --calibrate (CONTROL fixtures only) scans
// s in [-24, 24] on run 1 and keeps the smallest residual (ties: the smallest |s|), then measures both runs at that s. The accepted fixtures
// put age 0 a move-specific number of rows after gAnimScriptActive (e.g. Bite 26-row windows vs 41 script rows); the TEST body of the same
// scenario uses its control's shift (the anim script is the same; the doll does not change its timing).
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";

const require = createRequire(import.meta.url);
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const hash = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
type F = Fixture & { stem: string; kind: string; defenderDoll: boolean; moveId: number };
const out: Record<string, unknown>[] = [];
const probeCache = new Map<string, { frame: number; sha256: string }[]>();
for (const path of paths) {
  const f = JSON.parse(readFileSync(path, "utf8")) as F;
  // A preceding-body pair without a plan unit whose production tracker cannot lend (e.g. after the defender's Substitute body) withholds
  // the order input (POKEBENCH_LIVE_ORDER_INPUT=none, the documented control: order-independent adapters stay exact without it).
  // --order=drop-164: hypothesis control that treats the defender's Substitute body as order-neutral (drops it from precedingBodies, so the
  // fixture tool lends the plan / tracker order of the remaining history); production's tracker returns unknown after 164.
  if (args.order === "drop-164" && f.precedingBodies) f.precedingBodies = f.precedingBodies.filter((u) => u.moveId !== 164);
  let orderInput = args.order === "drop-164" ? "drop-164" : "fixture";
  try { liveView(f, 0); } catch (e) { if (!String(e).includes("Sprite order unknown")) throw e; orderInput = "none"; }
  const view = (age: number) => {
    if (orderInput === "none") process.env.POKEBENCH_LIVE_ORDER_INPUT = "none";
    const v = liveView(f, age);
    delete process.env.POKEBENCH_LIVE_ORDER_INPUT;
    if (!f.defenderDoll) return v;
    const side = f.target.geometry.side;
    const field = { ...v.field, [side]: { ...v.field[side], substituteDoll: true as const } };
    return { ...v, field, fieldArt: createBattleCommandFieldArtView(field) };
  };
  const v0 = view(0);
  const request = (v0.effect as { request: BattleMoveAnimationRequest }).request;
  const duration = liveMoveAnimationDuration(request, v0.field);
  const fx = v0.effect as { paletteInput?: never; spriteAllocatorInput?: never; spriteOrderInput?: never; presentationRng?: never; battlerX2Input?: never };
  const live = liveMoveAnimationPresentation(request, v0.field, 0, fx.paletteInput, fx.spriteAllocatorInput, fx.spriteOrderInput,
    fx.presentationRng, fx.battlerX2Input) !== null;
  const { startFrame: A, endFrame: E } = f.denseWindow!;
  const K = "calibrate" in args ? 24 : 0;
  // --shifts=<calibration receipts dir>: the shift calibrated on this move's own CONTROL bodies (the smallest residual among them).
  const fromControls = (): number => {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const best = readdirSync(args.shifts!).filter((n) => n.endsWith("-control.json")).map((n) => JSON.parse(readFileSync(join(args.shifts!, n), "utf8"))[0])
      .filter((r: { move: string }) => r.move === f.move).sort((x: { runs: { residualPixels: number }[] }, y: { runs: { residualPixels: number }[] }) =>
        x.runs[0]!.residualPixels - y.runs[0]!.residualPixels)[0];
    return (best?.shift as number | undefined) ?? 0;
  };
  let shift = args.shift !== undefined ? Number(args.shift) : args.shifts !== undefined ? fromControls() : 0;
  const cache = new Map<number, { live: string; rgba: Uint8Array }>();
  const at = (age: number) => {
    let r = cache.get(age);
    if (!r) { const rgba = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(rgba, view(age)); r = { live: hash(rgba), rgba }; cache.set(age, r); }
    return r;
  };
  const rgbOf = (key: string, frame: number) => inflateSync(readFileSync(join(args.probes!, `${key}-rgb`, `${String(frame).padStart(5, "0")}.rgb.z`)));
  const diff = (rgb: Uint8Array, rgba: Uint8Array) => { let n = 0; for (let p = 0; p < 240 * 160; p++) if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) n++; return n; };
  const scan: [number, number][] = [];
  if (K) {
    const roms = Array.from({ length: E - A + 1 }, (_, i) => rgbOf(`${f.stem}-r1`, A + i));
    for (let s0 = -K; s0 <= K; s0++) scan.push([s0, roms.reduce((a, rgb, i) => a + diff(rgb, at(i + s0).rgba), 0)]);
    shift = [...scan].sort((x, y) => x[1] - y[1] || Math.abs(x[0]) - Math.abs(y[0]))[0]![0];
  }
  const rendered = Array.from({ length: E - A + 1 }, (_, i) => at(i + shift));
  const runs = [1, 2].map((r) => {
    const key = `${f.stem}-r${r}`;
    let frames = probeCache.get(key);
    if (!frames) { frames = (JSON.parse(readFileSync(join(args.probes!, `${key}.json`), "utf8")).frames as { frame: number; sha256: string }[]); probeCache.clear(); probeCache.set(key, frames); }
    const rows = rendered.map(({ rgba, live: liveHash }, age) => {
      const frame = A + age;
      const rgb = rgbOf(key, frame);
      if (rgb.length !== 240 * 160 * 3 || hash(rgb) !== frames![frame]!.sha256) throw new Error(`source RGB receipt drift ${key} ${frame}`);
      let px = 0, field = 0, x0 = 240, y0 = 160, x1 = -1, y1 = -1;
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
          px++; const x = p % 240, y = (p / 240) | 0; if (y < 112) field++;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      return { age, frame, px, field, bbox: px ? [x0, y0, x1, y1] : null, source: hash(rgb).slice(0, 16), live: liveHash.slice(0, 16) };
    });
    return { run: r, rows, residualPixels: rows.reduce((a, x) => a + x.px, 0), exactRows: rows.filter((x) => x.px === 0).length,
      digest: hash(JSON.stringify(rows)) };
  });
  const r0 = runs[0]!;
  const bad = r0.rows.filter((x) => x.px > 0);
  const bbox = bad.reduce<number[] | null>((b, x) => !x.bbox ? b : !b ? [...x.bbox] : [Math.min(b[0]!, x.bbox[0]!), Math.min(b[1]!, x.bbox[1]!),
    Math.max(b[2]!, x.bbox[2]!), Math.max(b[3]!, x.bbox[3]!)], null);
  // contiguous affected-age ranges
  const ranges: string[] = [];
  for (const x of bad) { const last = ranges.at(-1); const m = last?.match(/^(\d+)(?:\.\.(\d+))?$/);
    if (m && Number(m[2] ?? m[1]) === x.age - 1) ranges[ranges.length - 1] = `${m[1]}..${x.age}`; else ranges.push(String(x.age)); }
  const entry = { fixture: path.split("/").pop(), stem: f.stem, kind: f.kind, move: f.move, attackerSide: f.attacker.geometry.side, defenderDoll: f.defenderDoll,
    window: [A, E], rows: r0.rows.length, orderInput, shift, ...(K ? { calibration: scan.filter(([, px]) => px === Math.min(...scan.map((x) => x[1]))) } : {}), liveDuration: duration, liveEngaged: live, identical: runs.every((r) => r.digest === r0.digest),
    runs: runs.map((r) => ({ run: r.run, residualPixels: r.residualPixels, exactRows: r.exactRows, digest: r.digest })),
    affectedAges: ranges.join(","), maxPxRow: Math.max(0, ...bad.map((x) => x.px)), fieldPx: bad.reduce((a, x) => a + x.field, 0), bbox,
    perRow: bad.slice(0, 400).map((x) => [x.age, x.px, x.bbox]) };
  out.push(entry);
  console.log(f.stem, f.kind, JSON.stringify({ order: orderInput, shift, rows: entry.rows, dur: duration, live, identical: entry.identical, px: runs.map((r) => r.residualPixels),
    exact: r0.exactRows, ages: entry.affectedAges.slice(0, 60), maxPxRow: entry.maxPxRow, bbox }));
}
writeFileSync(args.out!, JSON.stringify(out, null, 1) + "\n");
