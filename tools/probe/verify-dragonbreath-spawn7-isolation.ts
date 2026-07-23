// Fresh Battle Scene ON isolation probe for ISSUES #23's DRAGON_BREATH
// projectile residual.  This is dev-time evidence only: it reads the live
// OAM/matrix state, renders one ember on a blank framebuffer with the shared
// affine sampler, and subtracts the live app's no-projectile scene from a
// fresh oracle frame.  Nothing here is imported by src/ or production.
//
// Usage:
//   node --experimental-strip-types tools/probe/verify-dragonbreath-spawn7-isolation.ts
//
// It deliberately uses one compressed and one magnified *single-live-sprite*
// render.  In particular, the earlier whole-scene note that frame 3220 had
// only spawn 7 is false: RAM has four live embers then.  Render 3223 consumes
// RAM 3222, where the last (zero-based spawn 7) is the sole live projectile.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawSpriteSheetAffineRotate } from "../../src/engine/battleScene.ts";

const TRACE_PATH = "tools/compare/scratch/dragonbreath-projectile-window.json";
const SCREEN_W = 240;
const SCREEN_H = 160;
const CASES = [
  { render: 3177, ram: 3176, regime: "compressed", expectedSlot: 3 },
  { render: 3223, ram: 3222, regime: "magnified", expectedSlot: 4 },
] as const;

type Sprite = {
  slot: number; x: number; y: number; x2: number; y2: number;
  animCmdIndex: number; matrixA: number; matrixB: number; matrixC: number; matrixD: number;
};
type RamRow = { tick: number; fireSprites: Sprite[] };
type Color = { r: number; g: number; b: number };
type Tileset = { columns: number; rows: number; tiles: number[][] };

function harnessRoot(): string {
  for (let candidate = resolve(process.cwd()); ; candidate = dirname(candidate)) {
    if (existsSync(join(candidate, "oracle", "emerald_core.py"))) return candidate;
    if (dirname(candidate) === candidate) throw new Error("could not find harness oracle/");
  }
}

function runRamProbe(output: string): void {
  const root = harnessRoot();
  const pythonCandidates = [
    join(root, "vendor", "mgba-venv", "bin", "python"),
    join(dirname(root), "vendor", "mgba-venv", "bin", "python"),
  ];
  const python = pythonCandidates.find(existsSync);
  if (!python) throw new Error(`mGBA Python not found (${pythonCandidates.join(", ")})`);
  try {
    execFileSync(python, ["tools/probe/dump-dragonbreath-anim.py", TRACE_PATH, output, "3176", "3222"], { stdio: "ignore" });
  } catch (error: unknown) {
    // libmGBA can fault during teardown after flushing a complete probe.
    if (!existsSync(output)) throw error;
  }
  if (!existsSync(output)) throw new Error("RAM probe did not write its output");
}

function changedMask(oracle: Uint8Array, baseline: Uint8Array): Uint8Array {
  const out = new Uint8Array(SCREEN_W * SCREEN_H);
  for (let i = 0; i < out.length; i += 1) {
    const p = i * 4;
    out[i] = oracle[p] !== baseline[p] || oracle[p + 1] !== baseline[p + 1] || oracle[p + 2] !== baseline[p + 2] ? 1 : 0;
  }
  return out;
}

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

function score(actual: Uint8Array, predicted: Uint8Array) {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] && predicted[i]) tp += 1;
    else if (predicted[i]) fp += 1;
    else if (actual[i]) fn += 1;
  }
  return { actual: tp + fn, predicted: tp + fp, tp, fp, fn, xor: fp + fn };
}

function bounds(mask: Uint8Array): string {
  let left = SCREEN_W, top = SCREEN_H, right = -1, bottom = -1;
  for (let y = 0; y < SCREEN_H; y += 1) for (let x = 0; x < SCREEN_W; x += 1) {
    if (!mask[y * SCREEN_W + x]) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < 0 ? "none" : `${left},${top}-${right},${bottom}`;
}

function outsideDoubleBox(mask: Uint8Array, sprite: Sprite): number {
  const centerX = sprite.x + sprite.x2, centerY = sprite.y + sprite.y2;
  let count = 0;
  for (let y = 0; y < SCREEN_H; y += 1) for (let x = 0; x < SCREEN_W; x += 1) {
    if (!mask[y * SCREEN_W + x]) continue;
    if (x < centerX - 32 || x >= centerX + 32 || y < centerY - 32 || y >= centerY + 32) count += 1;
  }
  return count;
}

const temp = mkdtempSync(join(tmpdir(), "dragonbreath-spawn7-"));
try {
  const dumpPath = join(temp, "ram.json");
  runRamProbe(dumpPath);
  const rows = new Map((JSON.parse(readFileSync(dumpPath, "utf8")) as { ticks: RamRow[] }).ticks.map((row) => [row.tick, row]));
  const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;
  trace.oracleProfile = "battle-scene-on";
  trace.captureFrames = CASES.map((c) => c.render);
  const [oracle, app] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const oracleByFrame = new Map(oracle.captures.map((capture) => [capture.frame, capture.rgba]));
  const appByFrame = new Map(app.map((capture) => [capture.frame, capture.rgba]));
  const asset = JSON.parse(readFileSync("src/assets/gen/battle-anim-small-ember.json", "utf8")) as { tileset: Tileset; palette: Color[] };

  console.log("fresh ON oracle minus contemporaneous app baseline (which has no DRAGON_BREATH projectile draw)");
  console.log("the baseline is accepted only when every differing oracle pixel stays inside the sole live sprite's 64x64 affine-double box");
  for (const c of CASES) {
    const row = rows.get(c.ram);
    const oracleRgba = oracleByFrame.get(c.render);
    const appRgba = appByFrame.get(c.render);
    if (!row || !oracleRgba || !appRgba) throw new Error(`missing input for render ${c.render}/RAM ${c.ram}`);
    if (row.fireSprites.length !== 1 || row.fireSprites[0]?.slot !== c.expectedSlot) {
      throw new Error(`RAM ${c.ram}: expected only slot ${c.expectedSlot}, got ${JSON.stringify(row.fireSprites)}`);
    }
    const sprite = row.fireSprites[0]!;
    const actual = changedMask(oracleRgba, appRgba);
    const predicted = blankRender(sprite, asset);
    const result = score(actual, predicted);
    const outside = outsideDoubleBox(actual, sprite);
    console.log(`${c.regime} render ${c.render} <- RAM ${c.ram}, slot ${sprite.slot}, center=(${sprite.x + sprite.x2},${sprite.y + sprite.y2}), matrix=(${sprite.matrixA},${sprite.matrixB},${sprite.matrixC},${sprite.matrixD}), frame=${sprite.animCmdIndex + 1}`);
    console.log(`  oracle-minus-baseline: ${result.actual}px bounds ${bounds(actual)}; outside affine-double box: ${outside}`);
    console.log(`  blank shared sampler: ${result.predicted}px; TP=${result.tp} FP(overdraw)=${result.fp} FN(missing)=${result.fn} XOR=${result.xor}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
