/**
 * Strict fresh Scene-ON verifier for the bilateral MOVE_LEER acceptance unit.
 * It consumes the live mGBA probe only; no screenshot, framebuffer, or
 * per-age recording is used by the production compositor.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnLeerView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { leerAtAge } from "../../src/animation/leer.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
}

interface ProbeSprite {
  readonly template: { readonly symbol?: string | null };
  readonly attr: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly gAnimScriptActive: boolean;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly { readonly func: { readonly symbol?: string | null }; readonly data: readonly number[] }[];
  readonly sprites: readonly ProbeSprite[];
  readonly immutableState: unknown;
  readonly softwareOam?: readonly unknown[];
  readonly hardwareOam?: readonly unknown[];
  readonly softwareMatrices?: readonly unknown[];
  readonly hardwareMatrices?: readonly unknown[];
  readonly fadedPalette?: readonly unknown[];
  readonly unfadedPalette?: readonly unknown[];
  readonly hardwarePalette?: readonly unknown[];
  readonly paletteTags?: readonly unknown[];
  readonly tileTags?: readonly unknown[];
  readonly registers?: Readonly<Record<string, number>>;
  readonly se1?: unknown;
  readonly se2?: unknown;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-leer-compare-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const probeRun = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  },
);
if (probeRun.stdout) process.stdout.write(probeRun.stdout);
if (probeRun.stderr) process.stderr.write(probeRun.stderr);
if (probeRun.status !== 0) process.exit(probeRun.status ?? 1);

const probeBytes = readFileSync(output);
const probe = JSON.parse(probeBytes.toString("utf8")) as {
  readonly schema: string;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly frames: readonly ProbeFrame[];
};
const frameMap = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "LEER",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const speciesId = (species: string): number => species === "DRAGONAIR" ? 148 : 95;
const frameRgb = (frame: number): Buffer => readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
const hash = (value: Buffer | string): string => createHash("sha256").update(value).digest("hex");

function mapForWindow(): string {
  const lines = [
    `# MOVE_LEER ${fixture.orientation === "player-back" ? "player" : "opponent"} — source-relative ages 0..${fixture.denseWindow.frameCount - 1} (${fixture.denseWindow.frameCount} frames, 240x160)`,
    "# ages absent from this table are byte-identical to the previous age",
    "age  changedPx  bbox(minx,miny-maxx,maxy)",
  ];
  let previous: Buffer | null = null;
  let staticFrom: number | null = null;
  for (let age = 0; age < fixture.denseWindow.frameCount; age += 1) {
    const current = frameRgb(fixture.denseWindow.startFrame + age);
    if (!previous) {
      lines.push(`${age}  (first frame)`);
      previous = current;
      continue;
    }
    if (current.equals(previous)) {
      if (staticFrom === null) staticFrom = age;
      continue;
    }
    if (staticFrom !== null) {
      lines.push(staticFrom === age - 1
        ? `  static ${staticFrom}`
        : `  static ${staticFrom}-${age - 1}`);
      staticFrom = null;
    }
    let changed = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (current[offset] === previous[offset]
        && current[offset + 1] === previous[offset + 1]
        && current[offset + 2] === previous[offset + 2]) continue;
      changed += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    lines.push(`${age}  ${changed}  ${minX},${minY}-${maxX},${maxY}`);
    previous = current;
  }
  if (staticFrom !== null) lines.push(staticFrom === fixture.denseWindow.frameCount - 1
    ? `  static ${staticFrom}`
    : `  static ${staticFrom}-${fixture.denseWindow.frameCount - 1}`);
  return `${lines.join("\n")}\n`;
}

const errors: string[] = [];
if (probe.schema !== "leer-dense-evidence/v1") errors.push(`schema ${probe.schema}`);
if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) errors.push("source window drifted");
if (probe.frames.length !== fixture.denseWindow.frameCount) errors.push("dense frame count drifted");
if (hash(probeBytes) !== fixture.evidenceSha256) errors.push(`evidence ${hash(probeBytes)}`);
if (hash(probeBytes) !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence differs");
const rawRgb = Buffer.concat(readdirSync(rgbDir)
  .filter((name) => name.endsWith(".rgb"))
  .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
  .map((name) => readFileSync(join(rgbDir, name))));
if (hash(rawRgb) !== fixture.rawRgbSha256) errors.push(`RGB ${hash(rawRgb)}`);
const map = mapForWindow();
if (map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) errors.push("change map drifted");
if (hash(map) !== fixture.changeMapSha256) errors.push(`change map ${hash(map)}`);

const firstImmutable = JSON.stringify(probe.frames[0]?.immutableState);
for (const frame of probe.frames) {
  if (frame.sprites.length < 9
    || frame.softwareOam?.length !== 128 || frame.hardwareOam?.length !== 128
    || frame.softwareMatrices?.length !== 32 || frame.hardwareMatrices?.length !== 32
    || frame.fadedPalette?.length !== 512 || frame.unfadedPalette?.length !== 512
    || frame.hardwarePalette?.length !== 512 || frame.paletteTags?.length !== 16
    || frame.tileTags?.length !== 128 || !frame.registers || frame.se1 === undefined || frame.se2 === undefined
    || JSON.stringify(frame.immutableState) !== firstImmutable) {
    errors.push(`strict evidence shape at ${frame.frame}`);
    break;
  }
}

let componentMatches = 0;
let seamMatches = 0;
const componentFailures: string[] = [];
for (let age = 0; age < fixture.denseWindow.frameCount; age += 1) {
  const frame = frameMap.get(fixture.denseWindow.startFrame + age);
  if (!frame) {
    componentFailures.push(`missing frame ${age}`);
    continue;
  }
  const state = { ...stage, age };
  const view = sceneOnLeerView(state);
  if (view.attacker === fixture.attacker && view.target === fixture.target) seamMatches += 1;
  const eye = frame.sprites.find((sprite) => sprite.template.symbol === "gLeerSpriteTemplate");
  const expected = leerAtAge(age, fixture.attacker.geometry.side);
  const attacker = frame.sprites.find((sprite) =>
    sprite.template.symbol === "gMultiuseSpriteTemplate" && sprite.data[2] === speciesId("DRAGONAIR"));
  const target = frame.sprites.find((sprite) =>
    sprite.template.symbol === "gMultiuseSpriteTemplate" && sprite.data[2] === speciesId("ONIX"));
  const eyeMatches = expected.sprite.active
    ? !!eye && eye.x === expected.sprite.x && eye.y === expected.sprite.y
      && eye.attr[2] === 31257 + expected.sprite.tileOffset
    : !eye;
  const sourceMatches = !!attacker && !!target
    && attacker.matrix[0] === view.attackerScale
    && attacker.matrix[3] === view.attackerScale
    && target.x2 === view.targetOffset.x2
    && target.y2 === view.targetOffset.y2;
  const registerMatches = frame.registers!.bldcnt === (view.blend ? 16192 : 0)
    && frame.registers!.bldalpha === (view.blend ? 2056 : 0);
  const tasks = new Set(frame.tasks.map((task) => task.func.symbol));
  const taskMatches = (age < 4
    ? !tasks.has("Task_UpdateMonBg") && !tasks.has("Task_ClearMonBg")
    : age < 56
      ? tasks.has("Task_UpdateMonBg") && !tasks.has("Task_ClearMonBg")
      : age < 59
        ? tasks.has("Task_UpdateMonBg") && tasks.has("Task_ClearMonBg")
        : !tasks.has("Task_UpdateMonBg") && !tasks.has("Task_ClearMonBg"))
    && (age < 7 || age > 25 || tasks.has("AnimTask_ScaleMonAndRestore_Step"))
    && (age < 39 || age > 54 || tasks.has("AnimTask_ShakeMon2_Step"));
  if (eyeMatches && sourceMatches && registerMatches && taskMatches) componentMatches += 1;
  else if (componentFailures.length < 8) componentFailures.push(
    `frame ${age}: eye=${eyeMatches} source=${sourceMatches} reg=${registerMatches} tasks=${taskMatches}`,
  );
}

let framebufferMatches = 0;
const framebufferFailures: string[] = [];
for (let age = 0; age < fixture.denseWindow.frameCount; age += 1) {
  const state = { ...stage, age: fixture.appStage.presentationAge + age };
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const actual = render(engine);
  const expected = frameRgb(fixture.denseWindow.startFrame + age);
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgba = pixel * 4;
    const rgb = pixel * 3;
    if (actual[rgba] !== expected[rgb] || actual[rgba + 1] !== expected[rgb + 1] || actual[rgba + 2] !== expected[rgb + 2]) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else if (framebufferFailures.length < 8) framebufferFailures.push(`frame ${age}`);
}

console.log(`LEER source/component/seam ${errors.length === 0 ? fixture.denseWindow.frameCount : 0}/${componentMatches}/${seamMatches}; framebuffer ${framebufferMatches}/${fixture.denseWindow.frameCount}`);
if (componentFailures.length) console.error(componentFailures.join("\n"));
if (framebufferFailures.length) console.error(framebufferFailures.join("\n"));
if (errors.length) console.error(errors.join("\n"));
if (errors.length || componentMatches !== fixture.denseWindow.frameCount
  || seamMatches !== fixture.denseWindow.frameCount
  || framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
