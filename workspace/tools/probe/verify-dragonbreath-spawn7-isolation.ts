// Fresh Battle Scene ON isolation probe for ISSUES #23's DRAGON_BREATH
// projectile residual. This is dev-time evidence only: it reads a fresh
// live OAM/matrix dump, renders one ember on a blank framebuffer with the
// shared affine sampler, and verifies the production scene against a fresh
// oracle frame. Nothing here is imported by src/ or production.
//
// Usage:
//   probe_dir=$(mktemp -d /tmp/dragonbreath-isolation.XXXXXX)
//   python3 tools/run-mgba-probe.py "$probe_dir/ram.json" -- \
//     /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
//     tools/probe/dump-dragonbreath-anim.py \
//     tools/compare/traces/turn2-dragonbreath-projectiles.json \
//     "$probe_dir/ram.json" 3168 3234
//   node --experimental-strip-types \
//     tools/probe/verify-dragonbreath-spawn7-isolation.ts "$probe_dir/ram.json"
//
// It deliberately uses one compressed and one magnified *single-live-sprite*
// render.  The earlier whole-scene note that frame 3220 had only spawn 7 is
// false: RAM 3219 has four live embers.  So is the first version of this
// instrument's render 3223/RAM 3222 claim: that RAM tick also has four.
// Exhaustive RAM scanning found that only RAM 3231-3234 has a sole live,
// magnified ember (the eleventh spawn, in reused sprite slot 9).
import { readFileSync } from "node:fs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawSpriteSheetAffineRotate } from "../../src/engine/battleScene.ts";

const TRACE_PATH = "tools/compare/traces/turn2-dragonbreath-projectiles.json";
const SCREEN_W = 240;
const SCREEN_H = 160;
const SCAN_START_RAM = 3168;
const SCAN_END_RAM = 3234;
const CASES = [
  { render: 3177, ram: 3176, regime: "compressed", expectedSlot: 3 },
  { render: 3232, ram: 3231, regime: "magnified", expectedSlot: 9 },
] as const;

type Sprite = {
  slot: number; x: number; y: number; x2: number; y2: number;
  animCmdIndex: number; matrixA: number; matrixB: number; matrixC: number; matrixD: number;
};
type RamRow = { tick: number; fireSprites: Sprite[] };
type Color = { r: number; g: number; b: number };
type Tileset = { columns: number; rows: number; tiles: number[][] };

function blankRender(sprite: Sprite, asset: { tileset: Tileset; palette: Color[] }): Uint8Array {
  const fb = new Uint8Array(SCREEN_W * SCREEN_H * 4);
  const frame = sprite.animCmdIndex + 1; // anim command 0/1/2 == sheet frame 1/2/3.
  const tileset = { columns: 4, rows: 4, tiles: asset.tileset.tiles.slice(16 * frame, 16 * frame + 16) };
  drawSpriteSheetAffineRotate(
    fb, tileset, asset.palette,
    sprite.x + sprite.x2, sprite.y + sprite.y2,
    sprite.matrixA, sprite.matrixB, sprite.matrixC, sprite.matrixD,
  );
  const out = new Uint8Array(SCREEN_W * SCREEN_H);
  for (let i = 0; i < out.length; i += 1) out[i] = fb[i * 4 + 3] === 255 ? 1 : 0;
  return out;
}

function bounds(mask: Uint8Array): string {
  let left = SCREEN_W, top = SCREEN_H, right = -1, bottom = -1;
  for (let y = 0; y < SCREEN_H; y += 1) for (let x = 0; x < SCREEN_W; x += 1) {
    if (!mask[y * SCREEN_W + x]) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < 0 ? "none" : `${left},${top}-${right},${bottom}`;
}

function count(mask: Uint8Array): number {
  let count = 0;
  for (const value of mask) count += value;
  return count;
}

function pixelDiff(a: Uint8Array, b: Uint8Array): number {
  let diff = 0;
  for (let p = 0; p < a.length; p += 4) {
    if (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2]) diff += 1;
  }
  return diff;
}

const dumpPath = process.argv[2];
if (!dumpPath) throw new Error("pass a fresh run-mgba-probe JSON path");
const rows = new Map((JSON.parse(readFileSync(dumpPath, "utf8")) as { ticks: RamRow[] }).ticks.map((row) => [row.tick, row]));
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;
trace.oracleProfile = "battle-scene-on";
trace.captureFrames = CASES.map((c) => c.render);
const [oracle, app] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
const oracleByFrame = new Map(oracle.captures.map((capture) => [capture.frame, capture.rgba]));
const appByFrame = new Map(app.map((capture) => [capture.frame, capture.rgba]));
const asset = JSON.parse(readFileSync("src/assets/gen/battle-anim-small-ember.json", "utf8")) as { tileset: Tileset; palette: Color[] };

const soleMagnified = [...rows.values()].filter((row) =>
  row.fireSprites.length === 1 && Math.abs(row.fireSprites[0]!.matrixA) < 256
);
console.log(`exhaustive RAM ${SCAN_START_RAM}-${SCAN_END_RAM}: sole-live magnified candidates ${soleMagnified.map((row) => `${row.tick}(slot ${row.fireSprites[0]!.slot}, render ${row.tick + 1})`).join(", ") || "none"}`);
for (const c of CASES) {
  const row = rows.get(c.ram);
  const oracleRgba = oracleByFrame.get(c.render);
  const appRgba = appByFrame.get(c.render);
  if (!row || !oracleRgba || !appRgba) throw new Error(`missing input for render ${c.render}/RAM ${c.ram}`);
  if (row.fireSprites.length !== 1 || row.fireSprites[0]?.slot !== c.expectedSlot) {
    throw new Error(`RAM ${c.ram}: expected only slot ${c.expectedSlot}, got ${JSON.stringify(row.fireSprites)}`);
  }
  const sprite = row.fireSprites[0]!;
  const predicted = blankRender(sprite, asset);
  const diff = pixelDiff(oracleRgba, appRgba);
  console.log(`${c.regime} render ${c.render} <- RAM ${c.ram}, slot ${sprite.slot}, center=(${sprite.x + sprite.x2},${sprite.y + sprite.y2}), matrix=(${sprite.matrixA},${sprite.matrixB},${sprite.matrixC},${sprite.matrixD}), frame=${sprite.animCmdIndex + 1}`);
  console.log(`  blank shared-sampler coverage: ${count(predicted)}px bounds ${bounds(predicted)}`);
  console.log(`  production scene vs fresh ON oracle: ${diff}px`);
  if (diff !== 0) throw new Error(`render ${c.render}: production scene differs by ${diff}px`);
}
