// Pixel-pair dump of the Defense Curl Rollout residual (diagnosis only).
// usage: node --experimental-strip-types --no-warnings tools/integration/rolloutCurlPixels.ts <fixture.json> <run-dir> <ages,comma> [startFrame]
// <run-dir> = a retained POKEBENCH_LIVE_EVIDENCE_DIR/<fixture>-runN (rgb/ + probe.json). Prints compact JSON only (no RGB).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";

const [fx, dir, agesArg] = process.argv.slice(2);
const f = JSON.parse(readFileSync(fx!, "utf8")) as Fixture;
const start = f.denseWindow!.startFrame;
const out: unknown[] = [];
for (const age of agesArg!.split(",").map(Number)) {
  const rgb = readFileSync(join(dir!, "rgb", `${String(start + age).padStart(5, "0")}.rgb`));
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  // optional scratch dump (never committed): CURL_DUMP_DIR=<dir> writes live-<age>.rgb (3 bytes/px)
  if (process.env.CURL_DUMP_DIR) {
    const live = new Uint8Array(240 * 160 * 3);
    for (let p = 0; p < 240 * 160; p++) { live[p * 3] = rgba[p * 4]!; live[p * 3 + 1] = rgba[p * 4 + 1]!; live[p * 3 + 2] = rgba[p * 4 + 2]!; }
    writeFileSync(join(process.env.CURL_DUMP_DIR, `live-${age}.rgb`), live);
  }
  const px: { x: number; y: number; rom: string; live: string }[] = [];
  const hex = (a: ArrayLike<number>, o: number) => [a[o]!, a[o + 1]!, a[o + 2]!].map(v => v.toString(16).padStart(2, "0")).join("");
  for (let p = 0; p < 240 * 160; p++) {
    if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2])
      px.push({ x: p % 240, y: Math.floor(p / 240), rom: hex(rgb, p * 3), live: hex(rgba, p * 4) });
  }
  const bbox = px.length ? { x0: Math.min(...px.map(q => q.x)), x1: Math.max(...px.map(q => q.x)), y0: Math.min(...px.map(q => q.y)), y1: Math.max(...px.map(q => q.y)) } : null;
  const pairs: Record<string, number> = {};
  for (const q of px) pairs[`${q.rom}>${q.live}`] = (pairs[`${q.rom}>${q.live}`] ?? 0) + 1;
  // coarse regions: opponent healthbox (x<110,y<45), player half (x<120,y>=45), opponent half (x>=120)
  const regions = { oppHealthbox: 0, playerHalf: 0, opponentHalf: 0, other: 0 };
  const box = (pred: (q: { x: number; y: number }) => boolean) => { const s = px.filter(pred); return s.length ? { n: s.length, x0: Math.min(...s.map(q => q.x)), x1: Math.max(...s.map(q => q.x)), y0: Math.min(...s.map(q => q.y)), y1: Math.max(...s.map(q => q.y)) } : null; };
  const rb = { oppHealthbox: box(q => q.x < 110 && q.y < 45), playerHalf: box(q => !(q.x < 110 && q.y < 45) && q.x < 120 && q.y >= 45), opponentHalf: box(q => !(q.x < 110 && q.y < 45) && q.x >= 120) };
  void regions;
  out.push({ age, count: px.length, bbox, regionBoxes: rb, pairs: agesArg!.includes("full") ? pairs : Object.keys(pairs).length, first: px.slice(0, 4) });
}
console.log(JSON.stringify(out, null, 1));
