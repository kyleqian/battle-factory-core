import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnFlashView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  FLASH_BG_PALETTE_MASK,
  FLASH_OBJ_PALETTE_MASK,
  flashFadedCoefficientAtAge,
} from "../../src/animation/flash.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: unknown;
  readonly target: unknown;
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

interface ProbeTask {
  readonly func: number;
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly animScriptActive: boolean;
  readonly inMoveScript: boolean;
  readonly visualTaskCount: number;
  readonly tasks: readonly ProbeTask[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-flash-compare-");
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
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as {
  readonly schema: string;
  readonly frames: readonly ProbeFrame[];
};
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
const moveFrames = probe.frames.filter((frame) => frame.inMoveScript);
if (moveFrames.length !== fixture.denseWindow.frameCount) {
  errors.push(`in-move frames ${moveFrames.length} != fixture ${fixture.denseWindow.frameCount}`);
}
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
const firstMove = moveFrames[0];
const lastMove = moveFrames.at(-1);
if (!firstMove?.animScriptActive || lastMove?.animScriptActive) errors.push("active/cleanup boundary drifted");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${moveFrames.length}/${fixture.denseWindow.frameCount} isolated move frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

/** GBA `BlendPalette` color math on 15-bit RGB5 values (`util.c:264`). */
function blendGbaColor(color: number, target: number, coeff: number): number {
  const r = color & 0x1f;
  const g = (color >> 5) & 0x1f;
  const b = (color >> 10) & 0x1f;
  const tr = target & 0x1f;
  const tg = (target >> 5) & 0x1f;
  const tb = (target >> 10) & 0x1f;
  return (r + (((tr - r) * coeff) >> 4))
    | ((g + (((tg - g) * coeff) >> 4)) << 5)
    | ((b + (((tb - b) * coeff) >> 4)) << 10);
}

function bankAffected(index: number): "bg" | "obj" | null {
  if (index >= 16 && index < 64) {
    return (FLASH_BG_PALETTE_MASK >> (index >> 4)) & 1 ? "bg" : null;
  }
  if (index >= 256 && index < 288) {
    return (FLASH_OBJ_PALETTE_MASK >> ((index >> 4) - 16)) & 1 ? "obj" : null;
  }
  return null;
}

function expectedPalette(probe: ProbeFrame): readonly number[] {
  const age = probe.frame - fixture.denseWindow.startFrame;
  const coeff = flashFadedCoefficientAtAge(age);
  if (coeff === null) return probe.unfadedPalette.slice();
  const faded = probe.unfadedPalette.slice();
  for (let index = 16; index < 64; index += 1) {
    if (bankAffected(index) !== "bg") continue;
    faded[index] = coeff === 16
      ? 0xffff
      : blendGbaColor(probe.unfadedPalette[index]!, 0x7fff, coeff);
  }
  for (let index = 256; index < 288; index += 1) {
    if (bankAffected(index) !== "obj") continue;
    faded[index] = coeff === 16
      ? 0x0000
      : blendGbaColor(probe.unfadedPalette[index]!, 0x0000, coeff);
  }
  return faded;
}

const frames = new Map(moveFrames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "FLASH",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

function expectedPhase(age: number): number {
  if (age <= 6) return 0;
  if (age <= 38) return 1;
  return 2;
}

for (const frame of moveFrames) {
  const age = frame.frame - fixture.denseWindow.startFrame;
  const view = sceneOnFlashView({ ...stage, age });
  const paletteExact = view.fadedCoefficient === flashFadedCoefficientAtAge(age);
  const expected = expectedPalette(frame);
  const ramExact = expected.every(
    (entry, index) => bankAffected(index) === null || entry === frame.fadedPalette[index],
  );
  const taskExact = view.visualTaskCount === frame.visualTaskCount;
  const words = frame.tasks[0]?.data;
  const lifecycleExact = !words
    ? age >= 40 || age === 0
    : words[0] === expectedPhase(age)
      && words[1] === (words[0] === 0 ? age : (age + 1) % 2)
      && (words[14] & 0xffff) === FLASH_OBJ_PALETTE_MASK
      && (words[15] & 0xffff) === FLASH_BG_PALETTE_MASK;
  if (!paletteExact || !ramExact || !taskExact || !lifecycleExact) {
    componentMismatches.push(
      `frame ${frame.frame}/age ${age}: coeff ${view.fadedCoefficient}vs${flashFadedCoefficientAtAge(age)} vt ${view.visualTaskCount}vs${frame.visualTaskCount} tasks ${frame.tasks.length}`,
    );
  } else {
    componentMatches += 1;
  }

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
console.log(`FLASH component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
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
