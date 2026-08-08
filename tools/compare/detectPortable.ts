import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDetectView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: unknown;
  readonly target: unknown;
  readonly attackerPictureOffset: { readonly x: number; readonly y: number };
  readonly targetPictureOffset: { readonly x: number; readonly y: number };
  readonly battlerHeight: number;
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "partial" | "exact";
    readonly framebufferMatching?: number;
    readonly componentMatching?: number;
  };
}

interface ProbeSprite {
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly attr2: number;
}

interface ProbeMoveSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly template: number;
  readonly attr2: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly visualTaskCount: number;
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly moveSprites: readonly ProbeMoveSprite[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
}

interface Probe {
  readonly schema: string;
  readonly frames: readonly ProbeFrame[];
  readonly taskFuncs: Record<string, number>;
  readonly sparkleTemplate: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-detect-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
    "197",
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as Probe;
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
const moveFrames = probe.frames.filter(() => true);
if (moveFrames.length !== fixture.denseWindow.frameCount) {
  errors.push(`frames ${moveFrames.length} != fixture ${fixture.denseWindow.frameCount}`);
}
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${moveFrames.length}/${fixture.denseWindow.frameCount} isolated move frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const orientation = (fixture.attacker as { geometry: { side: string } }).geometry.side === "player"
  ? "player-to-opponent"
  : "opponent-to-player";
const stage = createSceneOnMovePresentation({
  move: "DETECT",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
  attackerPictureOffset: fixture.attackerPictureOffset,
  targetPictureOffset: fixture.targetPictureOffset,
  battlerHeight: fixture.battlerHeight,
} as never);
let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

/** Invert the ROM's `BlendPalette` (`orig + ((target - orig) * y) >> 4`). */
function decodeY(orig5: number, cur5: number, target5: number): number | null {
  if (orig5 === target5) return cur5 === orig5 ? 0 : null;
  for (let y = 0; y < 16; y += 1) {
    if (orig5 + (((target5 - orig5) * y) >> 4) === cur5) return y;
  }
  return null;
}

/** Displayed F_PAL_BG toward-black coefficient from the hardware palette. */
function displayedBgBlendY(frame: ProbeFrame): number {
  let best = 0;
  for (let entry = 16; entry < 64; entry += 1) {
    const orig = frame.unfadedPalette[entry];
    const cur = frame.hardwarePalette[entry];
    for (const shift of [0, 5, 10]) {
      const y = decodeY((orig >> shift) & 31, (cur >> shift) & 31, 0);
      if (y !== null && y > best) best = y;
    }
  }
  return best;
}

/** Displayed F_PAL_ATTACKER toward-white coefficient from the hardware OBJ bank. */
function displayedAttackerPaletteY(frame: ProbeFrame, attackerBank: number): number {
  const base = 256 + attackerBank * 16;
  let best = 0;
  for (let i = 0; i < 16; i += 1) {
    const orig = frame.unfadedPalette[base + i];
    const cur = frame.hardwarePalette[base + i];
    if (orig === 0 || orig === 0x7fff) continue;
    for (const shift of [0, 5, 10]) {
      const y = decodeY((orig >> shift) & 31, (cur >> shift) & 31, 31);
      if (y !== null && y > best) best = y;
    }
  }
  return best;
}

const frames = new Map(moveFrames.map((frame) => [frame.frame, frame]));
const sparkleTemplate = probe.sparkleTemplate;
// Base tile number of the first software sparkle frame; the anim offsets
// (0/16/32/48/64) are relative to it.
let sparkleBaseTile: number | null = null;

for (const frame of moveFrames) {
  const age = frame.frame - fixture.denseWindow.startFrame;
  const view = sceneOnDetectView({ ...stage, age });
  // The reducer's blends/vt are displayed-truth at `age` directly; the
  // sparkle reducer models the DISPLAYED sparkle (software spawn +1), so it
  // is compared against the probe's software sparkle one age ahead.
  const viewSparkle = sceneOnDetectView({ ...stage, age: age + 1 }).sparkle;
  const attacker = orientation === "player-to-opponent"
    ? frame.playerSprite
    : frame.opponentSprite;
  const attackerBank = (attacker.attr2 >> 12) & 15;

  const bgY = displayedBgBlendY(frame);
  const attY = displayedAttackerPaletteY(frame, attackerBank);
  const probeSparkle = frame.moveSprites.filter(
    (s) => s.template === sparkleTemplate,
  )[0];
  let sparkleExact: boolean;
  if (probeSparkle === undefined) {
    sparkleExact = viewSparkle === null;
  } else {
    const tileNum = probeSparkle.attr2 & 0x3ff;
    if (sparkleBaseTile === null) sparkleBaseTile = tileNum;
    const probeTileOffset = (tileNum - sparkleBaseTile!) % 80;
    sparkleExact = viewSparkle !== null
      && viewSparkle.x === probeSparkle.x
      && viewSparkle.y === probeSparkle.y
      && viewSparkle.tileOffset === probeTileOffset;
  }

  const bgExact = view.bgBlendY === bgY;
  const attExact = view.attackerPaletteY === attY;
  const vtExact = view.visualTaskCount === frame.visualTaskCount;
  if (!bgExact || !attExact || !vtExact || !sparkleExact) {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: bg ${view.bgBlendY}vs${bgY}`
      + ` att ${view.attackerPaletteY}vs${attY}`
      + ` vt ${view.visualTaskCount}vs${frame.visualTaskCount}`
      + ` sparkle ${JSON.stringify(viewSparkle)}`
      + `vs${probeSparkle ? `x${probeSparkle.x} y${probeSparkle.y}` : "absent"}`,
    );
  } else {
    componentMatches += 1;
  }

  // shared-framebuffer axis through the full engine render
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      appRgba[pixel * 4] !== oracleRgb[pixel * 3]
      || appRgba[pixel * 4 + 1] !== oracleRgb[pixel * 3 + 1]
      || appRgba[pixel * 4 + 2] !== oracleRgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else {
    let count = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (
        appRgba[pixel * 4] === oracleRgb[offset]
        && appRgba[pixel * 4 + 1] === oracleRgb[offset + 1]
        && appRgba[pixel * 4 + 2] === oracleRgb[offset + 2]
      ) continue;
      count += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    framebufferDiffLines.push(`framebuffer diff at frame ${frame.frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = moveFrames.length;
console.log(`DETECT component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMismatches.length) console.error(componentMismatches.slice(0, 24).join("\n"));
if (framebufferDiffLines.length) console.error(framebufferDiffLines.slice(0, 24).join("\n"));
if (componentMatches !== total || framebufferMatches !== total) {
  console.error(`scratch: ${scratch}`);
  if (fixture.acceptance.status === "exact") process.exit(1);
  if (framebufferMatches !== (fixture.acceptance.framebufferMatching ?? -1)
    || componentMatches !== (fixture.acceptance.componentMatching ?? -1)) {
    console.error("staged counts drifted from the fixture's recorded partial state");
    process.exit(1);
  }
}
if (fixture.acceptance.status === "exact"
  && framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
