import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { megaPunchAtAge } from "../../src/animation/megaPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMegaPunchView,
  type SceneOnMegaPunchConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

type Fixture = SceneOnMegaPunchConfig & {
  schema: "mega-punch-portable-evidence/v1";
  oracleProfile: "battle-scene-on";
  scenario: string;
  probe: string;
  probeMoveId: 5;
  orientation: string;
  attackerSide: "player" | "opponent";
  targetSide: "player" | "opponent";
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 160 };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Frame = {
  frame: number; sha256: string; animScriptActive: boolean;
  player: Record<string, unknown>; opponent: Record<string, unknown>;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
  sprites: { template: number; x: number; y: number; matrix: { a: number; b: number; c: number; d: number } }[];
  tasks: { func: number; data: number[] }[];
  fadedPalette: number[]; unfadedPalette: number[]; hardwarePalette: number[];
  paletteTags: number[]; tileTags: number[]; softwareOam: string[];
  hardwareOam: number[][]; hardwareMatrices: number[][];
  se1: { songHeader: number; status: number; tracks: { flags: number; panX: number }[] };
  bldcnt: number; bldalpha: number; bldy: number;
};
type Probe = {
  templates: Record<string, number>; taskFuncs: Record<string, number>;
  songHeaders: Record<string, number>; frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: megaPunchPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const receipts = new Map<string, string>();

function targetPan(side: "player" | "opponent"): number {
  // SOUND_PAN_TARGET: player battler is left, opponent battler is right.
  return side === "player" ? -63 : 63;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-mega-punch-"));
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
  const source = Array.from(
    { length: fixture.sourceWindow.frameCount },
    (_, age) => byFrame.get(fixture.sourceWindow.startFrame + age),
  );
  if (
    fixture.schema !== "mega-punch-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || source.some((frame) => !frame)
  ) throw new Error(`${fixture.orientation}: incomplete source window`);
  const stage = createSceneOnMovePresentation({
    move: "MEGA_PUNCH",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const first = source[0]!;
  const receipt = createHash("sha256");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;
  for (const [age, oracle] of source.entries()) {
    const frameFailureStart = failures.length;
    receipt.update(JSON.stringify(oracle));
    const rgb = readFileSync(join(rgbDir, `${String(oracle!.frame).padStart(5, "0")}.rgb`));
    receipt.update(rgb);
    rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle!.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }
    const predicted = megaPunchAtAge(
      age, fixture.targetSide, fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnMegaPunchView({ ...stage, age });
    const { age: _age, attacker: _a, target: _t, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (predicted.active !== oracle!.animScriptActive) failures.push(`age ${age}: cleanup`);
    const alphaEnabled = age >= 15 && age < 114;
    const restoreActive = age >= 121 && age <= 157;
    if (
      alphaEnabled
        ? oracle!.bldcnt !== 16192 || oracle!.bldalpha !== 2060 || oracle!.bldy !== 0
        : restoreActive
          ? oracle!.bldcnt !== 232 || oracle!.bldalpha !== 0
            || oracle!.bldy !== predicted.background.restoreBldy
          : oracle!.bldcnt !== 0 || oracle!.bldalpha !== 0 || oracle!.bldy !== 0
    ) failures.push(`age ${age}: blend registers`);
    if (predicted.sound !== null) {
      const header = probe.songHeaders[predicted.sound];
      const audibleTargetTrack = oracle!.se1.tracks.some((track) =>
        (track.flags & 0x80) !== 0 && track.panX === targetPan(fixture.targetSide));
      if (header === undefined || oracle!.se1.songHeader !== header || !audibleTargetTrack) {
        failures.push(`age ${age}: ${predicted.sound} target-pan trigger`);
      }
    }
    const fist = oracle!.sprites.filter((s) =>
      s.template === probe.templates.gMegaPunchKickSpriteTemplate);
    if (
      (predicted.fist === null) !== (fist.length === 0)
      || predicted.fist && (
        fist.length !== 1 || fist[0]!.x !== predicted.fist.x || fist[0]!.y !== predicted.fist.y
        || !same(fist[0]!.matrix, {
          a: predicted.fist.matrix.pa, b: predicted.fist.matrix.pb,
          c: predicted.fist.matrix.pc, d: predicted.fist.matrix.pd,
        })
      )
    ) failures.push(`age ${age}: MegaPunchKick software sprite`);
    const targetSprite = fixture.targetSide === "player"
      ? oracle!.playerSprite : oracle!.opponentSprite;
    if (
      age >= 71 && age <= 113
      && !same(
        { x2: targetSprite.x2, y2: targetSprite.y2 },
        predicted.targetOffset,
      )
    ) failures.push(`age ${age}: ShakeMon2`);
    const shake = oracle!.tasks.some((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon2
      || task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step);
    if (shake !== (age >= 71 && age <= 112)) failures.push(`age ${age}: ShakeMon2 task`);
    if (
      oracle!.fadedPalette.length !== 512 || oracle!.unfadedPalette.length !== 512
      || oracle!.hardwarePalette.length !== 512 || oracle!.paletteTags.length !== 16
      || oracle!.tileTags.length !== 128 || oracle!.softwareOam.length !== 128
      || oracle!.hardwareOam.length !== 128 || oracle!.hardwareMatrices.length !== 32
    ) failures.push(`age ${age}: palette/OAM hardware shape`);
    for (const side of ["player", "opponent"] as const) {
      const now = oracle![side];
      const initial = first[side];
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (now[key] !== initial[key]) failures.push(`age ${age}: gameplay ${side}.${key}`);
      }
    }
    if (failures.length === frameFailureStart) componentMatches += 1;
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
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
    else failures.push(`age ${age}: framebuffer diff ${diff}`);
  }
  const digest = receipt.digest("hex");
  const rawDigest = rawWindow.digest("hex");
  if (digest !== fixture.evidenceSha256) {
    failures.push(`evidence receipt ${digest} !== ${fixture.evidenceSha256}`);
  }
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB receipt ${rawDigest} !== ${fixture.rawRgbSha256}`);
  }
  if (runNumber === 1) receipts.set(fixture.orientation, digest);
  else if (receipts.get(fixture.orientation) !== digest) failures.push("fresh-run receipt");
  console.log(
    `${fixture.orientation} run ${runNumber}: ${componentMatches}/160 semantic checks; `
    + `${framebufferMatches}/160 production framebuffer; evidence/raw-RGB receipts ${digest}/${rawDigest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 30).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}
for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
