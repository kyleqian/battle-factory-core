import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  createSceneOnMovePresentation,
  sceneOnSpiteView,
  type SceneOnSpiteConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  spiteBackgroundBldy,
  spiteWaveShift,
} from "../../src/animation/spite.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnSpiteConfig {
  orientation: string; scenario: string; probe: string; changeMap: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceBounds: { start: string; endExclusive: string };
  probeJsonSha256: string; rawRgbSha256: string; changeMapSha256: string;
}
interface Identified { symbol: string | null }
interface Task { func: Identified; data: number[] }
interface Sprite {
  slot: number; template: Identified; inUse: boolean; invisible: boolean;
  priority: number; subpriority: number; matrix: number[]; hardwareMatrix: number[];
}
interface Frame {
  frame: number; sha256: string;
  script: { active: boolean; pointer: number; inBounds: boolean };
  visualTaskCount: number; soundTaskCount: number; tasks: Task[]; sprites: Sprite[];
  battlers: Sprite[]; battle: unknown; softwareOam: string[]; hardwareOam: string[];
  hardwareMatrices: number[][]; fadedPalette: number[]; unfadedPalette: number[];
  hardwarePalette: number[]; paletteTags: number[]; tileTags: number[];
  scanline: { state: number; srcBuffer: number }; scanlineBuffers: number[][];
  registers: Record<string, number>; audio: Record<string, unknown>;
}
interface Probe {
  schema: string; sourceBounds: { start: number; endExclusive: number };
  topology: { tasks: string[]; templates: string[]; callbacks: string[] };
  frames: Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const checkpoint = process.argv.includes("--checkpoint");
const paths = process.argv.slice(2).filter((arg) => arg !== "--checkpoint");
if (paths.length !== 2) {
  throw new Error("usage: spitePortable.ts [--checkpoint] <player-fixture> <opponent-fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function stable(value: unknown): unknown {
  const b = value as Record<string, Record<string, unknown>>;
  return Object.fromEntries(["player", "opponent"].map((side) => [side, {
    species: b[side]!.species, hp: b[side]!.hp, maxHp: b[side]!.maxHp,
    item: b[side]!.item, status1: b[side]!.status1, status2: b[side]!.status2,
    status3: b[side]!.status3, statStages: b[side]!.statStages,
  }]));
}
function framebufferDiff(app: Uint8ClampedArray, raw: Buffer): number {
  let count = 0;
  for (let i = 0; i < 240 * 160; i++) {
    if (app[i * 4] !== raw[i * 3] || app[i * 4 + 1] !== raw[i * 3 + 1]
      || app[i * 4 + 2] !== raw[i * 3 + 2]) count++;
  }
  return count;
}

const fresh = new Map<string, string>();
for (let runNumber = 1; runNumber <= 2; runNumber++) for (const fixturePath of paths) {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-spite-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const probeHash = createHash("sha256").update(bytes).digest("hex");
  if (probe.schema !== "spite-dense-evidence/v2"
      || probe.frames.length !== fixture.sourceWindow.frameCount
      || probe.frames[0]!.frame !== fixture.sourceWindow.startFrame
      || probe.frames.at(-1)!.frame !== fixture.sourceWindow.endFrame
      || probe.sourceBounds.start !== Number.parseInt(fixture.sourceBounds.start, 16)
      || probe.sourceBounds.endExclusive !== Number.parseInt(fixture.sourceBounds.endExclusive, 16)
      || probeHash !== fixture.probeJsonSha256) {
    throw new Error(`${fixture.orientation}: dense receipt drift ${probeHash}`);
  }
  for (const symbol of ["AnimTask_SpiteTargetShadow_Step1", "AnimTask_SpiteTargetShadow_Step2",
    "AnimTask_SpiteTargetShadow_Step3", "AnimTask_BlendColorCycleLoop", "Task_FadeToBg",
    "Task_UpdateMonBg", "Task_ClearMonBg", "TaskFunc_UpdateWavePerFrame", "Task_LoopAndPlaySE"]) {
    if (!probe.topology.tasks.includes(symbol)) throw new Error(`${fixture.orientation}: missing ${symbol}`);
  }
  const stage = createSceneOnMovePresentation<SceneOnSpiteConfig>({
    move: "SPITE", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const initialBattle = stable((probe.frames[0]!.battle as { battlers: unknown }).battlers);
  const rawHash = createHash("sha256");
  let reducer = 0, seam = 0, hardware = 0, framebuffer = 0;
  const failures: string[] = [];
  for (let index = 0; index < probe.frames.length; index++) {
    const row = probe.frames[index]!;
    const age = row.frame - fixture.sourceWindow.startFrame;
    const view = sceneOnSpiteView({ ...stage, age });
    const spiteTasks = row.tasks.filter((task) => task.func.symbol?.startsWith("AnimTask_SpiteTargetShadow"));
    const clone = row.sprites.find((sprite) => sprite.template.symbol === "gMultiuseSpriteTemplate"
      && sprite.priority === 3);
    const expectedData15 = age <= 46 ? age - 41 : age <= 173 ? 5 : age - 173;
    const taskOk = spiteTasks.length === Number(age >= 43 && age <= 175)
      && Boolean(clone) === (age >= 43 && age <= 175)
      && (!spiteTasks[0] || spiteTasks[0].data[15] === expectedData15);
    const alpha = view.alpha.eva | (view.alpha.evb << 8);
    const registerOk = row.registers.BLDY === spiteBackgroundBldy(age)
      && row.registers.BLDALPHA === ((age >= 46 && age <= 176) ? alpha : 0);
    const expectedScanlineState = age >= 44 && age <= 173 ? 1 : age === 174 ? 3 : 0;
    const scanlineOk = row.scanlineBuffers.length === 2
      && row.scanlineBuffers.every((buffer) => buffer.length === 320)
      && row.scanline.state === expectedScanlineState
      && (age < 44 || age > 175
        || Number.isInteger(spiteWaveShift(Math.max(age, 50),
          fixture.target.geometry.spriteCorner.y,
          fixture.target.geometry.spriteCorner.y)));
    const componentOk = row.script.inBounds && taskOk
      && same(stable((row.battle as { battlers: unknown }).battlers), initialBattle);
    if (componentOk) reducer++;
    if (same(view, sceneOnSpiteView({ ...stage, age }))) seam++;
    const prior = probe.frames[index - 1];
    const paletteTransfer = !prior || age === 1 || age === 40
      || same(row.hardwarePalette, prior.fadedPalette);
    const hardwareOk = paletteTransfer && scanlineOk
      && row.softwareOam.length === 128 && row.hardwareOam.length === 128
      && row.hardwareMatrices.length === 32 && row.hardwareMatrices.every((m) => m.length === 4)
      && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512
      && row.hardwarePalette.length === 512 && row.paletteTags.length === 16
      && row.tileTags.length === 16 && Object.keys(row.audio).length === 2
      && (!clone || (clone.matrix.length === 4 && clone.hardwareMatrix.length === 4));
    if (hardwareOk) hardware++;
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) throw new Error("raw frame hash drift");
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (diff === 0) framebuffer++;
    if (!componentOk || !registerOk || !hardwareOk || diff !== 0) failures.push(
      `${row.frame}/age${age}: reducer=${componentOk} registers=${registerOk} hardware=${hardwareOk} framebufferDiff=${diff}`,
    );
  }
  const rawDigest = rawHash.digest("hex");
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { encoding: "utf8" });
  const map = mapRun.stdout.replace(
    /^# .* —/,
    `# spite ${fixture.orientation} — raw RGB888 —`,
  );
  const mapHash = createHash("sha256").update(map).digest("hex");
  if (rawDigest !== fixture.rawRgbSha256 || mapHash !== fixture.changeMapSha256
      || map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    throw new Error(`${fixture.orientation}: RGB/change-map drift ${rawDigest}/${mapHash}`);
  }
  const receipt = `${probeHash}/${rawDigest}/${mapHash}`;
  if (fresh.has(fixture.orientation) && fresh.get(fixture.orientation) !== receipt) throw new Error("fresh runs differ");
  fresh.set(fixture.orientation, receipt);
  console.log(`${fixture.orientation} run ${runNumber}: reducer ${reducer}/221; seam ${seam}/221; hardware ${hardware}/221; framebuffer ${framebuffer}/221`);
  if (failures.length && !checkpoint) throw new Error(failures.slice(0, 50).join("\n"));
  if (failures.length && checkpoint) {
    console.log(`${fixture.orientation} checkpoint remains partial: ${failures.length}/221 frames differ`);
  }
}
