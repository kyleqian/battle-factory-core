import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  createSceneOnMovePresentation,
  sceneOnNightShadeView,
  type SceneOnNightShadeConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  nightShadeAtAge,
  nightShadeBackgroundBldy,
} from "../../src/animation/nightShade.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnNightShadeConfig {
  orientation: string; scenario: string; probe: string; changeMap: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceBounds: { start: string; endExclusive: string };
  probeJsonSha256: string; rawRgbSha256: string; changeMapSha256: string;
}
interface Identified { symbol: string | null }
interface Task { func: Identified; data: number[] }
interface Sprite { hardwareMatrix: number[]; matrix: number[]; x2: number }
interface Frame {
  frame: number; sha256: string;
  script: { active: boolean; inBounds: boolean };
  tasks: Task[]; battlers: Sprite[]; battle: unknown;
  softwareOam: string[]; hardwareOam: string[]; hardwareMatrices: number[][];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[]; scanlineBuffers: number[][];
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
if (paths.length !== 2) throw new Error("usage: nightShadePortable.ts [--checkpoint] <player-fixture> <opponent-fixture>");
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
  for (let i = 0; i < 240 * 160; i++) if (
    app[i * 4] !== raw[i * 3] || app[i * 4 + 1] !== raw[i * 3 + 1]
    || app[i * 4 + 2] !== raw[i * 3 + 2]
  ) count++;
  return count;
}

const fresh = new Map<string, string>();
for (let runNumber = 1; runNumber <= 2; runNumber++) for (const fixturePath of paths) {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-night-shade-");
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
  if (probe.schema !== "night-shade-dense-evidence/v1"
      || probe.frames.length !== fixture.sourceWindow.frameCount
      || probe.frames[0]!.frame !== fixture.sourceWindow.startFrame
      || probe.frames.at(-1)!.frame !== fixture.sourceWindow.endFrame
      || probe.sourceBounds.start !== Number.parseInt(fixture.sourceBounds.start, 16)
      || probe.sourceBounds.endExclusive !== Number.parseInt(fixture.sourceBounds.endExclusive, 16)
      || probeHash !== fixture.probeJsonSha256) {
    throw new Error(`${fixture.orientation}: dense receipt drift ${probeHash}`);
  }
  for (const symbol of ["AnimTask_NightShadeClone_Step1", "AnimTask_NightShadeClone_Step2",
    "AnimTask_ShakeMon2_Step", "AnimTask_BlendColorCycleLoop", "Task_FadeToBg",
    "Task_UpdateMonBg", "Task_ClearMonBg"]) {
    if (!probe.topology.tasks.includes(symbol)) throw new Error(`${fixture.orientation}: missing ${symbol}`);
  }
  const stage = createSceneOnMovePresentation<SceneOnNightShadeConfig>({
    move: "NIGHT_SHADE", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const initialBattle = stable((probe.frames[0]!.battle as { battlers: unknown }).battlers);
  const attackerIndex = fixture.attacker.geometry.side === "player" ? 0 : 1;
  const rawHash = createHash("sha256");
  let reducer = 0, seam = 0, hardware = 0, framebuffer = 0;
  const failures: string[] = [];
  for (let age = 0; age < probe.frames.length; age++) {
    const row = probe.frames[age]!;
    const expected = nightShadeAtAge(age);
    const view = sceneOnNightShadeView({ ...stage, age });
    const cloneTasks = row.tasks.filter((task) => task.func.symbol?.startsWith("AnimTask_NightShadeClone"));
    const shakeTasks = row.tasks.filter((task) => task.func.symbol === "AnimTask_ShakeMon2_Step");
    const blendTasks = row.tasks.filter((task) => task.func.symbol === "AnimTask_BlendColorCycleLoop");
    const taskOk = cloneTasks.length === Number(age >= 55 && age < 182)
      && shakeTasks.length === Number(age >= 127 && age < 149)
      && blendTasks.length === Number(age >= 127 && age < 166);
    const registerOk = row.registers.BLDY === nightShadeBackgroundBldy(age)
      && row.registers.BLDALPHA === (expected.cloneAlpha.eva | (expected.cloneAlpha.evb << 8));
    const componentOk = row.script.inBounds && taskOk && registerOk
      && same(stable((row.battle as { battlers: unknown }).battlers), initialBattle);
    if (componentOk) reducer++;
    if (same(view, sceneOnNightShadeView({ ...stage, age }))) seam++;
    const attacker = row.battlers[attackerIndex]!;
    const hardwareOk = same(attacker.hardwareMatrix, [expected.cloneMatrix, 0, 0, expected.cloneMatrix])
      && row.softwareOam.length === 128 && row.hardwareOam.length === 128
      && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512
      && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
      && row.paletteTags.length === 16 && row.tileTags.length === 16
      && row.scanlineBuffers.length === 2 && Object.keys(row.audio).length === 2;
    if (hardwareOk) hardware++;
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) throw new Error("raw frame hash drift");
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), raw);
    if (diff === 0) framebuffer++;
    if (!componentOk || !hardwareOk || diff !== 0) failures.push(
      `${row.frame}/age${age}: reducer=${componentOk} hardware=${hardwareOk} framebufferDiff=${diff}`,
    );
  }
  const rawDigest = rawHash.digest("hex");
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { encoding: "utf8" });
  const map = mapRun.stdout.replace(/^# .* —/, `# night-shade ${fixture.orientation} — raw RGB888 —`);
  const mapHash = createHash("sha256").update(map).digest("hex");
  if (rawDigest !== fixture.rawRgbSha256 || mapHash !== fixture.changeMapSha256
      || map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    throw new Error(`${fixture.orientation}: RGB/change-map drift ${rawDigest}/${mapHash}`);
  }
  const receipt = `${probeHash}/${rawDigest}/${mapHash}`;
  if (fresh.has(fixture.orientation) && fresh.get(fixture.orientation) !== receipt) throw new Error("fresh runs differ");
  fresh.set(fixture.orientation, receipt);
  console.log(`${fixture.orientation} run ${runNumber}: reducer ${reducer}/228; seam ${seam}/228; hardware ${hardware}/228; framebuffer ${framebuffer}/228`);
  if (failures.length && !checkpoint) throw new Error(failures.slice(0, 60).join("\n"));
  if (failures.length && checkpoint) {
    console.log(`${fixture.orientation} checkpoint: ${failures.length}/228 failures; ${228 - framebuffer}/228 framebuffer frames differ`);
    console.log(failures.slice(0, 60).join("\n"));
  }
}
