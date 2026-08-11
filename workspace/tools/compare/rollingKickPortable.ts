import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { rollingKickAtAge } from "../../src/animation/rollingKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRollingKickView,
  type SceneOnRollingKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Fixture = SceneOnRollingKickConfig & {
  schema: "rolling-kick-portable-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: string;
  scenario: string;
  probe: string;
  probeMoveId: 27;
  attackerSide: Side;
  targetSide: Side;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 55 };
  evidenceSha256: string;
  rawRgbSha256: string;
};
type Sprite = {
  template: number; x: number; y: number; x2: number; y2: number;
  data: number[];
};
type Frame = {
  frame: number; sha256: string; animScriptActive: boolean;
  player: Record<string, unknown>; opponent: Record<string, unknown>;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
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
  throw new Error("usage: rollingKickPortable.ts <player fixture> <opponent fixture>");
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const receipts = new Map<string, string>();
const pan = (side: Side, sound: "SE_M_DOUBLE_TEAM" | "SE_M_VITAL_THROW2") =>
  side === "player" && sound === "SE_M_DOUBLE_TEAM" ? -64
    : side === "player" ? -63 : 63;

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-rolling-kick-");
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
    fixture.schema !== "rolling-kick-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || source.some((frame) => !frame)
  ) throw new Error(`${fixture.orientation}: incomplete source window`);
  const stage = createSceneOnMovePresentation({
    move: "ROLLING_KICK",
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
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle!.frame).padStart(5, "0")}.rgb`),
    );
    receipt.update(rgb);
    rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle!.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }
    const predicted = rollingKickAtAge(
      age,
      fixture.attackerSide,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnRollingKickView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (predicted.active !== oracle!.animScriptActive) failures.push(`age ${age}: cleanup`);
    const alpha = age >= 10 && age < 43;
    if (
      alpha
        ? oracle!.bldcnt !== 16192 || oracle!.bldalpha !== 2060 || oracle!.bldy !== 0
        : oracle!.bldcnt !== 0 || oracle!.bldalpha !== 0 || oracle!.bldy !== 0
    ) failures.push(`age ${age}: alpha registers`);
    const attackerSprite = fixture.attackerSide === "player"
      ? oracle!.playerSprite : oracle!.opponentSprite;
    const targetSprite = fixture.targetSide === "player"
      ? oracle!.playerSprite : oracle!.opponentSprite;
    if (!same(
      { x2: attackerSprite.x2, y2: attackerSprite.y2 },
      predicted.attackerOffset,
    )) failures.push(`age ${age}: attacker source callbacks`);
    if (!same(
      { x2: targetSprite.x2, y2: targetSprite.y2 },
      predicted.targetOffset,
    )) {
      const idleResidual = fixture.targetSide === "opponent"
        && age < 32 && targetSprite.x2 === 1 && targetSprite.y2 === 0;
      if (!idleResidual) failures.push(`age ${age}: target ShakeMon`);
    }
    const foot = oracle!.sprites.filter((sprite) =>
      sprite.template === probe.templates.gSlidingKickSpriteTemplate);
    if (
      (predicted.slidingFoot === null) !== (foot.length === 0)
      || predicted.slidingFoot && (
        foot.length !== 1
        || !same(
          { x: foot[0]!.x, y: foot[0]!.y, x2: foot[0]!.x2, y2: foot[0]!.y2 },
          predicted.slidingFoot,
        )
      )
    ) failures.push(`age ${age}: SlidingKick sprite`);
    const hitsplat = oracle!.sprites.filter((sprite) =>
      sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
    if (
      (predicted.hitsplat === null) !== (hitsplat.length === 0)
      || predicted.hitsplat && (
        hitsplat.length !== 1
        || hitsplat[0]!.x !== predicted.hitsplat.x
        || hitsplat[0]!.y !== predicted.hitsplat.y
      )
    ) failures.push(`age ${age}: hitsplat`);
    if (predicted.sound) {
      const expectedPan = pan(predicted.soundPanSide!, predicted.sound);
      const audible = oracle!.se1.tracks.some((track) =>
        (track.flags & 0x80) !== 0 && track.panX === expectedPan);
      if (
        oracle!.se1.songHeader !== probe.songHeaders[predicted.sound]
        || !audible
      ) failures.push(`age ${age}: ${predicted.sound} side-pan trigger`);
    }
    if (
      oracle!.fadedPalette.length !== 512 || oracle!.unfadedPalette.length !== 512
      || oracle!.hardwarePalette.length !== 512 || oracle!.paletteTags.length !== 16
      || oracle!.tileTags.length !== 128 || oracle!.softwareOam.length !== 128
      || oracle!.hardwareOam.length !== 128 || oracle!.hardwareMatrices.length !== 32
    ) failures.push(`age ${age}: palette/OAM hardware shape`);
    for (const side of ["player", "opponent"] as const) {
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (oracle![side][key] !== first[side][key]) {
          failures.push(`age ${age}: gameplay ${side}.${key}`);
        }
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
  if (digest !== fixture.evidenceSha256) failures.push(`evidence receipt ${digest}`);
  if (rawDigest !== fixture.rawRgbSha256) failures.push(`raw RGB receipt ${rawDigest}`);
  if (runNumber === 1) receipts.set(fixture.orientation, digest);
  else if (receipts.get(fixture.orientation) !== digest) failures.push("fresh-run receipt");
  console.log(
    `${fixture.orientation} run ${runNumber}: ${componentMatches}/55 semantic checks; `
    + `${framebufferMatches}/55 production framebuffer; `
    + `evidence/raw-RGB ${digest}/${rawDigest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const path of paths) verify(path, run);
}
