import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { biteEffectAtAge } from "../../src/animation/bite.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBiteView,
  type SceneOnBiteConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture extends SceneOnBiteConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly probeMoveId: number;
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
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
  readonly hardwareMatrix: Readonly<{
    a: number; b: number; c: number; d: number;
  }>;
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly {
    readonly func: number;
    readonly data: readonly number[];
  }[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
}

interface Probe {
  readonly schema: string;
  readonly templates: Readonly<Record<
    "gSharpTeethSpriteTemplate" | "gBasicHitSplatSpriteTemplate", number
  >>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_BITE", number>>;
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: bitePortable.ts <player-fixture> <opponent-fixture>");
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const freshDigests = new Map<string, string>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-bite-portable-"));
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
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const digest = createHash("sha256")
    .update(readFileSync(output))
    .digest("hex");
  const priorDigest = freshDigests.get(fixture.orientation);
  if (priorDigest !== undefined && priorDigest !== digest) {
    throw new Error(
      `${fixture.orientation}: fresh probe digest changed `
      + `${priorDigest} -> ${digest}`,
    );
  }
  freshDigests.set(fixture.orientation, digest);
  const stage = createSceneOnMovePresentation({
    move: "BITE",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const mismatches: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;
  for (
    let frame = fixture.denseWindow.startFrame;
    frame <= fixture.denseWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.denseWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = biteEffectAtAge(
      age,
      fixture.targetSide,
      fixture.targetCenter,
    );
    const seam = sceneOnBiteView({ ...stage, age });
    const expectedSprites = expected.sprites.map((sprite) => ({
      template: sprite.kind === "sharpTeeth"
        ? probe.templates.gSharpTeethSpriteTemplate
        : probe.templates.gBasicHitSplatSpriteTemplate,
      slot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      matrix: sprite.matrix,
    }));
    const actualSprites = actual.sprites.map((sprite) => ({
      template: sprite.template,
      slot: sprite.slot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      matrix: sprite.matrix,
    }));
    const sprites = same(actualSprites, expectedSprites);
    const shake = actual.tasks.filter((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon
      || task.func === probe.taskFuncs.AnimTask_ShakeMon_Step
    );
    const shakeShape = age < 12 || age > 23
      ? shake.length === 0
      : shake.length === 1
        && shake[0]!.data[4] === 0 && shake[0]!.data[5] === 4
        && shake[0]!.data[6] === 0;
    const registers = actual.dispcnt === 0xbf40
      && actual.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.bldalpha === (expected.alpha
        ? expected.alpha.eva | expected.alpha.evb << 8
        : 0);
    const sound = age !== 0 || (
      actual.se1.songHeader === probe.songHeaders.SE_M_BITE
      && actual.se1.status === 0
      && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === expected.soundPan
    );
    const prior = frames.get(frame - 1);
    const priorVisible = prior?.sprites ?? [];
    const hardwareOam = priorVisible.every((sprite) => {
      return actual.hardwareOam.some((item) =>
        same(item, [sprite.attr0, sprite.attr1, sprite.attr2])
      ) && same(actual.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a,
        sprite.matrix.b,
        sprite.matrix.c,
        sprite.matrix.d,
      ]);
    });
    const hardwarePalettes = priorVisible.every((sprite) => {
      const bank = sprite.attr2 >>> 12;
      const start = 256 + bank * 16;
      return actual.hardwarePalette.slice(start, start + 16).every(
        (color, offset) => color === prior!.fadedPalette[start + offset],
      );
    });
    const tags = (!actual.sprites.some((sprite) =>
      sprite.template === probe.templates.gSharpTeethSpriteTemplate)
      || actual.paletteTags.includes(10139))
      && (!actual.sprites.some((sprite) =>
        sprite.template === probe.templates.gBasicHitSplatSpriteTemplate)
        || actual.paletteTags.includes(10135));
    const counts = actual.visualTaskCount === actual.sprites.length
        + shake.length
      && actual.soundTaskCount === 0;
    const cleanup = actual.animScriptActive
      && (age !== 25 || (
        actual.visualTaskCount === 0
        && actual.soundTaskCount === 0
        && actual.sprites.length === 0
        && actual.tasks.length === 0
        && actual.bldcnt === 0
        && actual.bldalpha === 0
      ));
    const seamShape = same(seam.sprites, expected.sprites)
      && same(seam.targetOffset, expected.targetOffset)
      && same(seam.alpha, expected.alpha)
      && seam.targetMonbg === expected.targetMonbg;
    if (sprites && shakeShape && registers && sound && hardwareOam
      && hardwarePalettes && tags && counts && cleanup && seamShape) {
      componentMatches += 1;
    } else {
      mismatches.push(
        `frame ${frame}/age ${age}: sprites=${sprites} shake=${shakeShape} `
        + `registers=${registers} sound=${sound} oam=${hardwareOam} `
        + `palettes=${hardwarePalettes} tags=${tags} counts=${counts} `
        + `cleanup=${cleanup} active=${actual.animScriptActive} seam=${seamShape}`,
      );
    }

    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const digest = createHash("sha256").update(raw).digest("hex");
    if (digest !== actual.sha256) {
      throw new Error(`frame ${frame}: raw RGB digest mismatch`);
    }
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        diff += 1;
      }
    }
    if (diff === 0) framebufferMatches += 1;
    else mismatches.push(`frame ${frame}/age ${age}: framebuffer diff=${diff}`);
  }
  const total =
    fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${componentMatches}/${total} software/hardware; `
    + `${framebufferMatches}/${total} framebuffer; digest ${digest}`,
  );
  if (mismatches.length) {
    console.error(mismatches.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
