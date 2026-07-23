// Fresh Battle Scene ON diagnostic for ISSUES #34's seven opening FLY-up
// frames.  This is intentionally dev-time only: it invokes the mGBA RAM/OAM
// probe, fetches fresh oracle frames, and reconstructs the one live OBJ on a
// blank mask.  Nothing here is imported by src/ or the production bundle.
//
// Usage:
//   node --experimental-strip-types tools/probe/verify-turn14-flyup-affine-sampler.ts
//
// The probe exits 139 during libmGBA teardown after writing valid JSON; that
// historical quirk is accepted only when the expected output was completed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces/turn14-fly-miss.json";
// The immediately preceding framebuffer (17780) still contains Murkrow due
// to the one-frame presentation lead.  17805 is the first fresh frame after
// the ball's RAM destruction (17804) with Murkrow still hidden and before any
// FLY-up text, making it the valid bare-scene baseline for subtraction.
const BASELINE_FRAME = 17805;
const FRAMES = [17781, 17782, 17783, 17784, 17785, 17786, 17787];
const RAM_START = 17780;
const RAM_END = 17786; // render f uses the final OAM/matrix assembled at f - 1.
const SCREEN_W = 240;
const SCREEN_H = 160;

type Oam = {
  x: number; y: number; affineMode: number; shape: number; size: number;
  matrixNum: number; tileNum: number; paletteNum: number; index: number;
};
type DumpRow = {
  tick: number;
  s3: {
    matrix: { a: number; b: number; c: number; d: number };
    objTransfer: { vram4bpp: number[]; width: number; height: number; paletteBgr555: number[] };
    finalOamMatches: Oam[];
  };
};

type Convention = {
  name: string;
  destCenter: number;
  sourceCenter: number;
  rounding: "floor" | "trunc" | "nearest";
};

// All variants retain the PPU's 2x native affine-double iteration box and
// final-OAM wrapping.  Only pixel-centre convention and signed fixed-point
// rounding vary; these are the remaining source-/hardware-plausible choices.
const CONVENTIONS: Convention[] = [
  { name: "floor/d64/s32", destCenter: 64, sourceCenter: 32, rounding: "floor" },
  { name: "trunc/d64/s32", destCenter: 64, sourceCenter: 32, rounding: "trunc" },
  { name: "nearest/d64/s32", destCenter: 64, sourceCenter: 32, rounding: "nearest" },
  { name: "floor/d63.5/s31.5", destCenter: 63.5, sourceCenter: 31.5, rounding: "floor" },
  { name: "floor/d63.5/s32", destCenter: 63.5, sourceCenter: 32, rounding: "floor" },
  { name: "floor/d64/s31.5", destCenter: 64, sourceCenter: 31.5, rounding: "floor" },
];

function harnessRoot(): string {
  for (let candidate = resolve(process.cwd()); ; candidate = dirname(candidate)) {
    if (existsSync(join(candidate, "oracle", "emerald_core.py"))) return candidate;
    if (dirname(candidate) === candidate) throw new Error("could not find harness oracle/");
  }
}

function floorFixed(value: number, convention: Convention["rounding"]): number {
  if (convention === "floor") return Math.floor(value);
  if (convention === "trunc") return Math.trunc(value);
  return Math.round(value);
}

function sourceIndex(vram: number[], width: number, sx: number, sy: number): number {
  const tileX = Math.floor(sx / 8);
  const tileY = Math.floor(sy / 8);
  const byte = vram[(tileY * (width / 8) + tileX) * 32 + (sy % 8) * 4 + Math.floor((sx % 8) / 2)]!;
  return sx % 2 === 0 ? byte & 0xF : byte >> 4;
}

function renderMask(row: DumpRow, convention: Convention): Uint8Array {
  const oam = row.s3.finalOamMatches;
  if (oam.length !== 1) throw new Error(`RAM ${row.tick}: expected exactly one final slot-3 OAM match, got ${oam.length}`);
  const entry = oam[0]!;
  if (entry.affineMode !== 3 || entry.shape !== 0 || entry.size !== 3) {
    throw new Error(`RAM ${row.tick}: expected 64x64 affine-double ROUND_SHADOW OAM, got ${JSON.stringify(entry)}`);
  }
  const { width, height, vram4bpp } = row.s3.objTransfer;
  if (width !== 64 || height !== 64 || vram4bpp.length !== 2048) {
    throw new Error(`RAM ${row.tick}: ROUND_SHADOW transfer is not full 64x64 4bpp`);
  }
  const out = new Uint8Array(SCREEN_W * SCREEN_H);
  // Affine-double makes the iteration box 128x128 but keeps a 64x64 native
  // source.  The OAM coordinates are unsigned/wrapping hardware coordinates.
  for (let dy = 0; dy < height * 2; dy += 1) for (let dx = 0; dx < width * 2; dx += 1) {
    const rx = dx - convention.destCenter;
    const ry = dy - convention.destCenter;
    const sx = floorFixed((rx * row.s3.matrix.a + ry * row.s3.matrix.b) / 256, convention.rounding) + convention.sourceCenter;
    const sy = floorFixed((rx * row.s3.matrix.c + ry * row.s3.matrix.d) / 256, convention.rounding) + convention.sourceCenter;
    if (sx < 0 || sx >= width || sy < 0 || sy >= height || sourceIndex(vram4bpp, width, sx, sy) === 0) continue;
    const x = (entry.x + dx) & 0x1FF;
    const y = (entry.y + dy) & 0xFF;
    if (x < SCREEN_W && y < SCREEN_H) out[y * SCREEN_W + x] = 1;
  }
  return out;
}

function changedMask(frame: Uint8Array, baseline: Uint8Array): Uint8Array {
  const out = new Uint8Array(SCREEN_W * SCREEN_H);
  for (let i = 0; i < out.length; i += 1) {
    const p = i * 4;
    out[i] = frame[p] !== baseline[p] || frame[p + 1] !== baseline[p + 1] || frame[p + 2] !== baseline[p + 2] ? 1 : 0;
  }
  return out;
}

function score(actual: Uint8Array, predicted: Uint8Array) {
  let tp = 0; let fp = 0; let fn = 0;
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] && predicted[i]) tp += 1;
    else if (predicted[i]) fp += 1;
    else if (actual[i]) fn += 1;
  }
  const union = tp + fp + fn;
  return { actual: tp + fn, predicted: tp + fp, tp, fp, fn, xor: fp + fn, jaccard: union === 0 ? 1 : tp / union };
}

function runRamProbe(output: string): void {
  const root = harnessRoot();
  // `oracle/` lives under pokeemerald-factory while shared vendor tools live
  // one directory above it in this harness layout.
  const pythonCandidates = [
    join(root, "vendor", "mgba-venv", "bin", "python"),
    join(dirname(root), "vendor", "mgba-venv", "bin", "python"),
  ];
  const python = pythonCandidates.find(existsSync);
  if (!python) throw new Error(`mGBA Python not found (${pythonCandidates.join(", ")})`);
  try {
    execFileSync(python, ["tools/probe/dump-fly-anim.py", TRACE_PATH, output, String(RAM_START), String(RAM_END)], { stdio: "ignore" });
  } catch (error: unknown) {
    // libmGBA's post-write teardown SIGSEGV is established probe behavior.
    if (!existsSync(output)) throw error;
  }
  if (!existsSync(output)) throw new Error("RAM/OAM probe did not write its output");
}

const temp = mkdtempSync(join(tmpdir(), "flyup-affine-"));
try {
  const dumpPath = join(temp, "ram-oam.json");
  runRamProbe(dumpPath);
  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as { ticks: DumpRow[] };
  const rows = new Map(dump.ticks.map((row) => [row.tick, row]));
  const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;
  trace.oracleProfile = "battle-scene-on";
  trace.captureFrames = [BASELINE_FRAME, ...FRAMES];
  const oracle = await runOracleTrace(trace);
  const captures = new Map(oracle.captures.map((capture) => [capture.frame, capture.rgba]));
  const baseline = captures.get(BASELINE_FRAME);
  if (!baseline) throw new Error(`fresh ON oracle omitted baseline ${BASELINE_FRAME}`);

  const totals = new Map(CONVENTIONS.map((c) => [c.name, { tp: 0, fp: 0, fn: 0 }]));
  const details = new Map<string, Array<{ frame: number; matrix: string; score: ReturnType<typeof score> }>>(CONVENTIONS.map((c) => [c.name, []]));
  for (const frame of FRAMES) {
    const actualFrame = captures.get(frame);
    const row = rows.get(frame - 1);
    if (!actualFrame || !row) throw new Error(`missing fresh input for render ${frame}`);
    const actual = changedMask(actualFrame, baseline);
    for (const convention of CONVENTIONS) {
      const result = score(actual, renderMask(row, convention));
      const total = totals.get(convention.name)!;
      total.tp += result.tp; total.fp += result.fp; total.fn += result.fn;
      details.get(convention.name)!.push({ frame, matrix: `(${row.s3.matrix.a},${row.s3.matrix.b},${row.s3.matrix.c},${row.s3.matrix.d})`, score: result });
    }
  }
  const ranked = [...CONVENTIONS].sort((a, b) => {
    const x = totals.get(a.name)!; const y = totals.get(b.name)!;
    return (x.fp + x.fn) - (y.fp + y.fn) || y.tp - x.tp;
  });
  console.log(`fresh ON oracle: bare-scene baseline ${BASELINE_FRAME}, renders 17781-17787; RAM ticks 17780-17786`);
  console.log("final OAM: slot 3 = index 10, 64x64 4bpp affine-double, x=112 y=243 (hardware wrapped), tile=305 palette=7 matrix=2");
  console.log("native transfer: 2048 bytes / 64 tiles; source confirms gFlyBallUpSpriteTemplate uses gOamData_AffineDouble_ObjNormal_64x64");
  console.log("\naggregate convention ranking (covered-pixel mask):");
  for (const convention of ranked) {
    const t = totals.get(convention.name)!; const union = t.tp + t.fp + t.fn;
    console.log(`${convention.name}: TP=${t.tp} FP=${t.fp} FN=${t.fn} XOR=${t.fp + t.fn} J=${(t.tp / union).toFixed(6)}`);
  }
  const winner = ranked[0]!;
  console.log(`\nper-matrix (${winner.name}, the aggregate winner):`);
  for (const row of details.get(winner.name)!) {
    const s = row.score;
    console.log(`${row.frame} ${row.matrix}: actual=${s.actual} predicted=${s.predicted} TP=${s.tp} FP=${s.fp} FN=${s.fn} XOR=${s.xor} J=${s.jaccard.toFixed(6)}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
