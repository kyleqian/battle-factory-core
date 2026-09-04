import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnConfuseRayView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly expectedFullStateSha256: string;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female" | "none";
    readonly opponentGender?: "male" | "female" | "none";
  };
}
interface Sprite {
  readonly template: { readonly symbol: string | null };
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrix: readonly number[];
}
interface Task {
  readonly func: { readonly symbol: string | null };
  readonly data: readonly number[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly Task[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly softwareMatrices: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: unknown;
  readonly se2: unknown;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly frames: readonly Frame[];
}
interface EvidenceOrientation {
  readonly orientation: string;
  readonly sourceWindow: Probe["sourceWindow"];
  readonly fullStateSha256Runs: readonly string[];
  readonly rawRgbSha256Runs: readonly string[];
}
interface EvidenceReceipt {
  readonly denseEvidence: { readonly orientations: readonly EvidenceOrientation[] };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const evidence = JSON.parse(readFileSync(
  join(root, "tools/compare/fixtures/confuse-ray-source-staging-checkpoint.json"),
  "utf8",
)) as EvidenceReceipt;
const orientation = fixture.attacker.geometry.side === "player" ? "player-back" : "opponent-front";
const receipt = evidence.denseEvidence.orientations.find((entry) => entry.orientation === orientation);
if (!receipt) throw new Error(`missing retained ${orientation} Confuse Ray evidence`);
const scratch = createScratchDir("pokebench-confuse-ray-compare-");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const sha = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");

function probeFresh(runIndex: number): { probe: Probe; raw: Buffer; rgbDir: string } {
  const output = join(scratch, `probe-${runIndex}.json`);
  const rgbDir = join(scratch, `rgb-${runIndex}`);
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const raw = readFileSync(output);
  return { probe: JSON.parse(raw.toString()) as Probe, raw, rgbDir };
}

const fresh = [probeFresh(1), probeFresh(2)];
if (sha(fresh[0]!.raw) !== sha(fresh[1]!.raw)) {
  throw new Error("twice-fresh full-state JSON differs");
}
if (
  sha(fresh[0]!.raw) !== fixture.expectedFullStateSha256
  || receipt.fullStateSha256Runs.length !== 2
  || receipt.fullStateSha256Runs.some((digest) => digest !== fixture.expectedFullStateSha256)
) {
  throw new Error("fresh complete state differs from the committed mechanical contract");
}
const rows = fresh[0]!.probe.frames;
if (
  fresh[0]!.probe.schema !== "confuse-ray-dense-evidence/v1"
  || JSON.stringify(fresh[0]!.probe.sourceWindow) !== JSON.stringify(receipt.sourceWindow)
  || fresh[0]!.probe.sourceWindow.frameCount !== 270
  || rows.length !== 270
) {
  throw new Error(`expected complete 270-row window, got ${rows.length}`);
}
const stage = createSceneOnMovePresentation({
  move: "CONFUSE_RAY",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
let latchMatches = 0;
let hardwareMatches = 0;
let audioMatches = 0;
const diffs: string[] = [];
const raw = [createHash("sha256"), createHash("sha256")];
const phase = { setup: [0, 45], bounce: [46, 120], gap: [121, 165], spiral: [166, 225], cleanup: [226, 269] } as const;
const phaseStats = Object.fromEntries(Object.keys(phase).map((key) => [key, { exact: 0, total: 0, pixels: 0 }])) as Record<string, { exact: number; total: number; pixels: number }>;

for (let age = 0; age < rows.length; age += 1) {
  const oracle = rows[age]!;
  const state = { ...stage, age };
  const view = sceneOnConfuseRayView(state);
  const bounce = oracle.sprites.find((sprite) => sprite.template.symbol === "gConfuseRayBallBounceSpriteTemplate");
  const spiral = oracle.sprites.find((sprite) => sprite.template.symbol === "gConfuseRayBallSpiralSpriteTemplate");
  const source = view.bounce ?? view.spiral;
  const actual = bounce ?? spiral;
  const panningTask = oracle.tasks.find((task) =>
    task.func.symbol === "SoundTask_AdjustPanningVar_Step",
  );
  const component = source === null
    ? actual === undefined
    : actual !== undefined
      && actual.x === source.x && actual.y === source.y
      && actual.x2 === source.x2 && actual.y2 === source.y2
      && actual.matrix.every((value, index) => value === Object.values(source.matrix)[index])
      && (view.panning === null
        ? panningTask === undefined
        : panningTask?.data[11] === view.panning.pan);
  if (component) componentMatches += 1;

  const hardware = oracle.softwareOam.length === 128
    && oracle.hardwareOam.length === 128
    && oracle.softwareMatrices.length === 32
    && oracle.hardwareMatrices.length === 32
    && oracle.fadedPalette.length === 512
    && oracle.unfadedPalette.length === 512
    && oracle.hardwarePalette.length === 512
    && oracle.paletteTags.length === 16
    && oracle.tileTags.length === 128
    && Object.keys(oracle.registers).length === 16;
  if (hardware) hardwareMatches += 1;

  const second = fresh[1]!.probe.frames[age]!;
  if (
    JSON.stringify(oracle.se1) === JSON.stringify(second.se1)
    && JSON.stringify(oracle.se2) === JSON.stringify(second.se2)
  ) audioMatches += 1;

  const latch = age > 0 && (
    JSON.stringify(oracle.hardwareOam) === JSON.stringify(rows[age - 1]!.softwareOam)
    && JSON.stringify(oracle.hardwareMatrices) === JSON.stringify(rows[age - 1]!.softwareMatrices)
    && JSON.stringify(oracle.hardwarePalette) === JSON.stringify(
      age === 4 ? oracle.fadedPalette : rows[age - 1]!.fadedPalette,
    )
  );
  if (latch) latchMatches += 1;

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(fresh[0]!.rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
  const secondRgb = readFileSync(join(fresh[1]!.rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
  if (!oracleRgb.equals(secondRgb)) throw new Error(`twice-fresh RGB differs at age ${age}`);
  if (sha(oracleRgb) !== oracle.sha256 || sha(secondRgb) !== second.sha256) {
    throw new Error(`raw RGB frame digest differs at age ${age}`);
  }
  raw[0].update(oracleRgb);
  raw[1].update(secondRgb);
  let pixels = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (app[rgba] !== oracleRgb[rgb] || app[rgba + 1] !== oracleRgb[rgb + 1] || app[rgba + 2] !== oracleRgb[rgb + 2]) {
      pixels += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const bucket = Object.entries(phase).find(([, [start, end]]) => age >= start && age <= end)![0];
  phaseStats[bucket]!.total += 1;
  phaseStats[bucket]!.pixels += pixels;
  if (pixels === 0) {
    framebufferMatches += 1;
    phaseStats[bucket]!.exact += 1;
  } else if (diffs.length < 40) {
    diffs.push(`age ${age}: ${pixels}px bbox=${minX},${minY}-${maxX},${maxY} component=${component} latch=${latch}`);
  }
}

console.log(`CONFUSE RAY component ${componentMatches}/270; latches ${latchMatches}/269; framebuffer ${framebufferMatches}/270`);
console.log(JSON.stringify(phaseStats));
console.log(`fresh full-state sha256 ${sha(fresh[0]!.raw)}`);
const rawDigests = raw.map((hash) => hash.digest("hex"));
console.log(`hardware ${hardwareMatches}/270; audio ${audioMatches}/270; raw RGB ${rawDigests.join(" / ")}`);
if (
  componentMatches !== 270
  || hardwareMatches !== 270
  || audioMatches !== 270
  || latchMatches !== 269
  || framebufferMatches !== 270
  || receipt.rawRgbSha256Runs.length !== 2
  || rawDigests.some((digest) => digest !== receipt.rawRgbSha256Runs[0])
  || receipt.rawRgbSha256Runs.some((digest) => digest !== rawDigests[0])
) {
  console.error(diffs.join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
