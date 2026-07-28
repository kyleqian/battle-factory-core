import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { twineedleEffectAtAge } from "../../src/animation/twineedle.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTwineedleView,
  type SceneOnTwineedleConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture extends SceneOnTwineedleConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly probeMoveId: number;
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
}

interface ProbeSprite {
  readonly template: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly {
    readonly func: number;
    readonly data: readonly number[];
  }[];
  readonly playerSprite: Readonly<{ x2: number; y2: number }>;
  readonly opponentSprite: Readonly<{ x2: number; y2: number }>;
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
}

interface Probe {
  readonly schema: string;
  readonly templates: Readonly<Record<
    "gLinearStingerSpriteTemplate" | "gHandleInvertHitSplatSpriteTemplate",
    number
  >>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<
    "SE_M_RAZOR_WIND2" | "SE_M_HORN_ATTACK", number
  >>;
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: twineedlePortable.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const freshDigests = new Map<string, string>();

function verify(fixturePath: string): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-twineedle-portable-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
    String(fixture.probeMoveId),
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
  if (probe.schema !== "poison-fang-dense-evidence/v2") {
    throw new Error(`unexpected probe schema ${probe.schema}`);
  }
  const digest = createHash("sha256").update(readFileSync(output)).digest("hex");
  const priorDigest = freshDigests.get(fixture.orientation);
  if (priorDigest !== undefined && priorDigest !== digest) {
    throw new Error(
      `${fixture.orientation}: fresh probe changed ${priorDigest} -> ${digest}`,
    );
  }
  freshDigests.set(fixture.orientation, digest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const stage = createSceneOnMovePresentation({
    move: "TWINEEDLE",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const mismatches: string[] = [];
  let matches = 0;
  let framebufferMatches = 0;
  for (
    let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.denseWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = twineedleEffectAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnTwineedleView({ ...stage, age });
    const expectedSprites = expected.sprites.map((sprite) => ({
      template: sprite.kind === "needle"
        ? probe.templates.gLinearStingerSpriteTemplate
        : probe.templates.gHandleInvertHitSplatSpriteTemplate,
      slot: sprite.oamSlot,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      matrix: sprite.matrix,
    }));
    const actualSprites = actual.sprites.map((sprite) => ({
      template: sprite.template,
      slot: sprite.slot,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      matrix: sprite.matrix,
    }));
    const sprites = same(actualSprites, expectedSprites);
    const targetSprite = fixture.target.geometry.side === "player"
      ? actual.playerSprite : actual.opponentSprite;
    const baselineX2 =
      fixture.target.geometry.side === "opponent" && age < 22 ? 1 : 0;
    const targetOffset =
      targetSprite.x2 === expected.targetOffset.x2 + baselineX2
      && targetSprite.y2 === expected.targetOffset.y2;
    const shake = actual.tasks.filter((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon2
      || task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step
    );
    const shakeActive = age >= 22 && age <= 29;
    const tasks = shake.length === (shakeActive ? 1 : 0);
    const registers = actual.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.bldalpha === (expected.alpha ? 0x080c : 0);
    const soundEvent = expected.soundEvents.find((event) => event.age === age);
    const sound = soundEvent === undefined || (
      actual.se1.songHeader === probe.songHeaders[soundEvent.song]
      && actual.se1.status === 0
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === soundEvent.pan
    );
    const prior = frames.get(frame - 1);
    const priorSprites = prior?.sprites ?? [];
    const hardwareOam = priorSprites.every((sprite) =>
      actual.hardwareOam.some((item) =>
        same(item, [sprite.attr0, sprite.attr1, sprite.attr2])
      ) && same(actual.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ])
    );
    const hardwarePalette = priorSprites.every((sprite) => {
      const bank = sprite.attr2 >>> 12;
      const start = 256 + bank * 16;
      return actual.hardwarePalette.slice(start, start + 16).every(
        (color, offset) => color === prior!.fadedPalette[start + offset],
      );
    });
    const counts = actual.visualTaskCount
      === actual.sprites.length + shake.length;
    const cleanup = actual.animScriptActive && (
      age !== 36 || (
        actual.visualTaskCount === 0
        && actual.soundTaskCount === 0
        && actual.sprites.length === 0
        && actual.tasks.length === 0
        && actual.bldcnt === 0
        && actual.bldalpha === 0
      )
    );
    const seamShape = same(seam.sprites, expected.sprites)
      && same(seam.targetOffset, expected.targetOffset)
      && same(seam.alpha, expected.alpha)
      && seam.targetMonbg === expected.targetMonbg;
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const rawDigest = createHash("sha256").update(raw).digest("hex")
      === actual.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    const samples: string[] = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        diff += 1;
        if (samples.length < 8) {
          samples.push(
            `${pixel % 240},${Math.floor(pixel / 240)}:`
            + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
            + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
          );
        }
      }
    }
    if (diff === 0) framebufferMatches += 1;
    if (sprites && targetOffset && tasks && registers && sound && hardwareOam
      && hardwarePalette && counts && cleanup && seamShape && rawDigest) {
      matches += 1;
    } else {
      mismatches.push(
        `frame ${frame}/age ${age}: sprites=${sprites} offset=${targetOffset} `
        + `tasks=${tasks} regs=${registers} sound=${sound} oam=${hardwareOam} `
        + `pal=${hardwarePalette} counts=${counts} cleanup=${cleanup} `
        + `seam=${seamShape} raw=${rawDigest} framebufferDiff=${diff}`,
      );
    }
    if (diff !== 0 && sprites && targetOffset && tasks && registers && sound
      && hardwareOam && hardwarePalette && counts && cleanup && seamShape
      && rawDigest) {
      mismatches.push(
        `frame ${frame}/age ${age}: framebufferDiff=${diff} `
        + `samples=${samples.join(";")}`,
      );
    }
  }
  const total = fixture.denseWindow.endFrame
    - fixture.denseWindow.startFrame + 1;
  console.log(
    `${fixture.orientation}: components ${matches}/${total}; `
    + `framebuffer ${framebufferMatches}/${total}; digest ${digest}`,
  );
  if (mismatches.length) throw new Error(mismatches.join("\n"));
}

for (let run = 0; run < 2; run += 1) {
  for (const fixture of fixturePaths) verify(fixture);
}
