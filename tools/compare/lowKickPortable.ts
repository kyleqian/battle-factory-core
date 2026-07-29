import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { lowKickAtAge } from "../../src/animation/lowKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLowKickView,
  type SceneOnLowKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Side = "player" | "opponent";
type Fixture = SceneOnLowKickConfig & {
  schema: "low-kick-source-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: string;
  scenario: string;
  probe: string;
  probeMoveId: 67;
  attackerSide: Side;
  targetSide: Side;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 33 };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Sprite = { slot: number; template: number; x: number; y: number; x2: number; y2: number };
type BattlerSprite = {
  x2: number; y2: number; attr0: number; matrixNum: number;
  matrix: { a: number; b: number; c: number; d: number };
  hardwareMatrix: { a: number; b: number; c: number; d: number };
};
type Frame = {
  frame: number; sha256: string; animScriptActive: boolean;
  player: Record<string, unknown>; opponent: Record<string, unknown>;
  playerSprite: BattlerSprite; opponentSprite: BattlerSprite;
  sprites: Sprite[]; tasks: { func: number; data: number[] }[];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[]; softwareOam: string[];
  hardwareOam: number[][]; hardwareMatrices: number[][];
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
  bldcnt: number; bldalpha: number; bldy: number;
};
type Probe = {
  templates: Record<string, number>; taskFuncs: Record<string, number>;
  songHeaders: Record<string, number>; frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: lowKickEvidence.ts <player fixture> <opponent fixture>");
}
const receipts = new Map<string, string>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-low-kick-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir, String(fixture.probeMoveId),
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const source = Array.from({ length: 33 }, (_, age) =>
    byFrame.get(fixture.sourceWindow.startFrame + age));
  if (
    fixture.schema !== "low-kick-source-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame !== 32
    || source.some((frame) => !frame)
  ) throw new Error(`${fixture.orientation}: incomplete source window`);

  const receipt = createHash("sha256");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  const first = source[0]!;
  const targetPan = fixture.targetSide === "player" ? -63 : 63;
  const stage = createSceneOnMovePresentation({
    move: "LOW_KICK",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  let componentMatches = 0;
  let framebufferMatches = 0;
  for (const [age, frame] of source.entries()) {
    const frameFailureStart = failures.length;
    const oracle = frame!;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    receipt.update(JSON.stringify(oracle));
    receipt.update(rgb);
    rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }
    const predicted = lowKickAtAge(
      age,
      fixture.attackerSide,
      fixture.targetSide,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnLowKickView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (oracle.animScriptActive !== predicted.active) failures.push(`age ${age}: cleanup`);
    const named = (name: string) => oracle.sprites.filter((sprite) =>
      sprite.template === probe.templates[name]);
    const count = (name: string, start: number, end: number) => {
      if (named(name).length !== (age >= start && age <= end ? 1 : 0)) {
        failures.push(`age ${age}: ${name} lifetime`);
      }
    };
    count("gSlideMonToOffsetSpriteTemplate", 7, 11);
    count("gSlidingKickSpriteTemplate", 7, 14);
    count("gBasicHitSplatSpriteTemplate", 13, 22);
    count("gSlideMonToOriginalPosSpriteTemplate", 25, 28);
    const attacker = fixture.attackerSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
    const target = fixture.targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
    if (!same(
      { x2: attacker.x2, y2: attacker.y2 },
      predicted.attackerOffset,
    )) {
      failures.push(`age ${age}: SlideMon offset`);
    }
    const foot = named("gSlidingKickSpriteTemplate")[0];
    if (foot && !same(
      { x: foot.x, y: foot.y, x2: foot.x2, y2: foot.y2 },
      predicted.slidingFoot,
    )) failures.push(`age ${age}: target-relative SlidingKick callback`);
    const splat = named("gBasicHitSplatSpriteTemplate")[0];
    if (splat && (splat.x !== predicted.hitsplat?.x
      || splat.y !== predicted.hitsplat?.y)) {
      failures.push(`age ${age}: target-relative hit splat`);
    }
    const rotate = oracle.tasks.some((task) =>
      task.func === probe.taskFuncs.AnimTask_RotateMonSpriteToSide
      || task.func === probe.taskFuncs.AnimTask_RotateMonSpriteToSide_Step);
    if (rotate !== (age >= 13 && age <= 23)) failures.push(`age ${age}: RotateMon task`);
    const rotated = target.matrix.b !== 0 || target.matrix.c !== 0;
    if (rotated !== (age >= 13 && age <= 23)) {
      failures.push(`age ${age}: RotateMon matrix/OAM transfer`);
    }
    if (!same(target.matrix, predicted.targetTransform.matrix)
      || target.y2 !== predicted.targetTransform.y2) {
      failures.push(`age ${age}: RotateMon software matrix/position`);
    }
    const hardware = lowKickAtAge(
      age - 2,
      fixture.attackerSide,
      fixture.targetSide,
      fixture.target.geometry.animationCenter,
    ).targetTransform.matrix;
    if (!same(target.hardwareMatrix, hardware)) {
      failures.push(`age ${age}: RotateMon hardware matrix latch`);
    }
    const impactLoaded = age >= 4 && age < 32;
    const handsLoaded = age >= 1 && age < 32;
    for (const [tag, loaded] of [[10135, impactLoaded], [10143, handsLoaded]] as const) {
      if (oracle.paletteTags.includes(tag) !== loaded || oracle.tileTags.includes(tag) !== loaded) {
        failures.push(`age ${age}: animation tag ${tag}`);
      }
    }
    if (
      oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512
      || oracle.hardwarePalette.length !== 512 || oracle.paletteTags.length !== 16
      || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32
      || oracle.bldcnt !== 0 || oracle.bldalpha !== 0 || oracle.bldy !== 0
    ) failures.push(`age ${age}: palette/register/OAM shape`);
    if (age === 13) {
      const audible = oracle.se1.tracks.some((track) =>
        (track.flags & 0x80) !== 0 && track.panX === targetPan);
      if (oracle.se1.songHeader !== probe.songHeaders.SE_M_VITAL_THROW2 || !audible) {
        failures.push("age 13: Vital Throw target-pan trigger");
      }
    }
    for (const side of ["player", "opponent"] as const) {
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (oracle[side][key] !== first[side][key]) failures.push(`age ${age}: gameplay ${side}.${key}`);
      }
    }
    if (failures.length === frameFailureStart) componentMatches += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebufferMatches += 1;
    else {
      failures.push(`age ${age}: framebuffer diff ${diff}`);
      if (runNumber === 1 && age === 0) {
        const appRgb = Buffer.alloc(240 * 160 * 3);
        for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
          appRgb[pixel * 3] = app[pixel * 4]!;
          appRgb[pixel * 3 + 1] = app[pixel * 4 + 1]!;
          appRgb[pixel * 3 + 2] = app[pixel * 4 + 2]!;
        }
        writeFileSync(join(scratch, "app-age-0.rgb"), appRgb);
      }
    }
  }
  const digest = receipt.digest("hex");
  const rawDigest = rawWindow.digest("hex");
  if (digest !== fixture.evidenceSha256) failures.push(`evidence receipt ${digest}`);
  if (rawDigest !== fixture.rawRgbSha256) failures.push(`raw RGB receipt ${rawDigest}`);
  if (runNumber === 1) receipts.set(fixture.orientation, digest);
  else if (receipts.get(fixture.orientation) !== digest) failures.push("fresh-run receipt");
  console.log(
    `${fixture.orientation} run ${runNumber}: ${componentMatches}/33 semantic checks; `
    + `${framebufferMatches}/33 production framebuffer; `
    + `evidence/raw-RGB ${digest}/${rawDigest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
