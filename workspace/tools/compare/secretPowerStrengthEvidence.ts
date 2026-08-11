import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { strengthAtAge } from "../../src/animation/strength.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSecretPowerView,
  type SceneOnPresentationBattler,
  type SceneOnSecretPowerConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "secret-power-strength-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: SceneOnSecretPowerConfig["fieldProfile"];
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}

interface Sprite {
  readonly template: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

interface SoundPlayer {
  readonly songHeader: number;
  readonly status: number;
  readonly tracks: readonly Readonly<{ flags: number; panX: number }>[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly Readonly<{ func: number }>[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly se1: SoundPlayer;
  readonly se2: SoundPlayer;
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
}

interface Probe {
  readonly schema: "secret-power-strength-dense-evidence/v1";
  readonly move: 290;
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: secretPowerStrengthEvidence.ts <player-fixture> <opponent-fixture>",
  );
}

const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

function compareFramebuffer(
  app: Uint8ClampedArray,
  raw: Buffer,
): { readonly count: number; readonly samples: readonly string[] } {
  let count = 0;
  const samples: string[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
    ) {
      count += 1;
      if (samples.length < 4) {
        samples.push(
          `${pixel % 240},${Math.floor(pixel / 240)}:`
          + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
          + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
        );
      }
    }
  }
  return { count, samples };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  if (
    fixture.schema !== "secret-power-strength-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
  ) {
    throw new Error(`${fixture.orientation}: invalid fixture contract`);
  }
  const scratch = createScratchDir("pokebench-secret-power-strength-evidence-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const outputBytes = readFileSync(output);
  const probe = JSON.parse(outputBytes.toString()) as Probe;
  if (
    probe.schema !== "secret-power-strength-dense-evidence/v1"
    || probe.move !== 290
  ) {
    throw new Error(`${fixture.orientation}: unexpected probe contract`);
  }
  const evidenceDigest =
    createHash("sha256").update(outputBytes).digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) {
    throw new Error(
      `${fixture.orientation}: evidence ${evidenceDigest} `
      + `!= ${fixture.evidenceSha256}`,
    );
  }
  if (
    evidenceDigests.has(fixture.orientation)
    && evidenceDigests.get(fixture.orientation) !== evidenceDigest
  ) {
    throw new Error(`${fixture.orientation}: fresh evidence changed`);
  }
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const playerToOpponent = fixture.attacker.geometry.side === "player";
  const config: SceneOnSecretPowerConfig = {
    move: "SECRET_POWER",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  };
  const stage = createSceneOnMovePresentation(config);
  const rawHash = createHash("sha256");
  const errors: string[] = [];
  let matched = 0;
  let framebufferMatched = 0;

  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`${fixture.orientation}: missing ${frame}`);
    const expected = strengthAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.target.geometry.animationCenter,
    );
    const view = sceneOnSecretPowerView({ ...stage, age });
    const attacker = playerToOpponent
      ? actual.playerSprite : actual.opponentSprite;
    const target = playerToOpponent
      ? actual.opponentSprite : actual.playerSprite;
    const targetIdleX2 = playerToOpponent && age < 48 ? 1 : 0;
    const hitsplats = actual.sprites.filter(
      (sprite) =>
        sprite.template === probe.templates.gBasicHitSplatSpriteTemplate,
    );
    const returnSprites = actual.sprites.filter(
      (sprite) =>
        sprite.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate,
    );
    const taskCount = (name: string) =>
      actual.tasks.filter((task) => task.func === probe.taskFuncs[name]).length;
    const impactLoaded = actual.paletteTags.includes(10135)
      && actual.tileTags.includes(10135);
    const expectedBlend = age >= 7 && age <= 93;
    const expectedTargetInvisible = age >= 4 && age <= 93;
    const expectedSound = age === 7
      ? {
          header: probe.songHeaders.SE_M_TAKE_DOWN,
          pan: playerToOpponent ? -64 : 63,
        }
      : [54, 60, 66].includes(age)
        ? {
            header: probe.songHeaders.SE_M_MEGA_KICK2,
            pan: playerToOpponent ? 63 : -63,
          }
        : null;
    const prior = frames.get(frame - 1);
    const hardwareBattlers = !prior || [
      prior.playerSprite,
      prior.opponentSprite,
    ].every((sprite, index) =>
      (
        index === (playerToOpponent ? 1 : 0)
        && sprite.invisible
      )
      || actual.hardwareOam.some(
        (oam) => same(oam, [sprite.attr0, sprite.attr1, sprite.attr2]),
      )
    );

    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const framebuffer = compareFramebuffer(render(engine), raw);
    if (framebuffer.count === 0) framebufferMatched += 1;

    const receiptShapes = actual.fadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.paletteTags.length === 16
      && actual.tileTags.length === 128;
    const hitGeometry = hitsplats.length === expected.hitSplats.length
      && hitsplats.every((sprite) =>
        expected.hitSplats.some((hit) =>
          hit.x === sprite.x
          && hit.y === sprite.y
          && sprite.matrix.a === 303
          && sprite.matrix.b === 0
          && sprite.matrix.c === 0
          && sprite.matrix.d === 303
        )
      );
    const semantic = attacker.x2 === expected.attackerOffset.x2
      && attacker.y2 === expected.attackerOffset.y2
      && target.x2 === expected.targetOffset.x2 + targetIdleX2
      && target.y2 === expected.targetOffset.y2
      && target.invisible === expectedTargetInvisible
      && returnSprites.length === Number(expected.returnSlideActive)
      && taskCount("AnimTask_ShakeAndSinkMon_Step")
        === Number(expected.shakeAndSinkActive)
      && taskCount("AnimTask_TranslateMonElliptical_Step")
        === Number(expected.ellipticalTaskActive)
      && taskCount("AnimTask_ShakeMon2_Step")
        === Number(expected.shakeMon2Active)
      && hitGeometry
      && impactLoaded === expected.impactLoaded
      && actual.animScriptActive === expected.active
      && same(view.attackerOffset, expected.attackerOffset)
      && same(view.targetOffset, expected.targetOffset)
      && same(view.hitSplats, expected.hitSplats);
    const registers = actual.dispcnt === 0xBF40
      && actual.bldy === 0
      && actual.bldcnt === (expectedBlend ? 0x3F40 : 0)
      && actual.bldalpha === (expectedBlend ? 0x080C : 0);
    const audio = expectedSound === null
      || [actual.se1, actual.se2].some((sound) =>
        sound.songHeader === expectedSound.header
        && sound.tracks[0]?.panX === expectedSound.pan
      );
    const rgbReceipt =
      createHash("sha256").update(raw).digest("hex") === actual.sha256;
    if (
      semantic
      && registers
      && audio
      && hardwareBattlers
      && receiptShapes
      && rgbReceipt
      && actual.visualTaskCount
        === actual.sprites.length
          + Number(expected.shakeAndSinkActive)
          + Number(expected.ellipticalTaskActive)
          + Number(expected.shakeMon2Active)
      && actual.soundTaskCount === 0
      && actual.battleAnimAttacker === (playerToOpponent ? 0 : 1)
      && actual.battleAnimTarget === (playerToOpponent ? 1 : 0)
      && framebuffer.count === 0
    ) {
      matched += 1;
    } else {
      errors.push(
        `frame ${frame}/age ${age}: semantic=${semantic} `
        + `registers=${registers} audio=${audio} hardware=${hardwareBattlers} `
        + `framebuffer=${framebuffer.count} ${framebuffer.samples.join(";")}`,
      );
    }
  }

  const rawDigest = rawHash.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(
      `${fixture.orientation}: raw ${rawDigest} != ${fixture.rawRgbSha256}`,
    );
  }
  if (
    rawDigests.has(fixture.orientation)
    && rawDigests.get(fixture.orientation) !== rawDigest
  ) {
    throw new Error(`${fixture.orientation}: fresh raw RGB changed`);
  }
  rawDigests.set(fixture.orientation, rawDigest);
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${matched}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebufferMatched}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidenceDigest}; raw ${rawDigest}`,
  );
  if (errors.length > 0) {
    console.error(errors.slice(0, 30).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixture of fixturePaths) verify(fixture, run);
}
