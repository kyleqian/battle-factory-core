import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  tauntAtAge,
  type TauntState,
} from "../../src/animation/taunt.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTauntView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { PNG } from "pngjs";

interface Fixture {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attackerSide: "player" | "opponent";
  attackerHead: { x: number; y: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Sprite {
  slot: number; subpriority: number;
  attr0: number; attr1: number; attr2: number;
  x: number; y: number; x2: number; y2: number;
  template: number; callback: number;
  matrix: { a: number; b: number; c: number; d: number };
  hardwareMatrix: { a: number; b: number; c: number; d: number };
}
interface SoundPlayer {
  songHeader: number; status: number;
  tracks: readonly { flags: number; panX: number }[];
}
interface Frame {
  frame: number; sha256: string; sprites: readonly Sprite[];
  hardwareOam: readonly (readonly number[])[];
  hardwareMatrices: readonly {
    a: number; b: number; c: number; d: number;
  }[];
  fadedPalette: readonly number[]; unfadedPalette: readonly number[];
  hardwarePalette: readonly number[];
  paletteTags: readonly number[];
  bldcnt: number; bldalpha: number; bldy: number;
  se1: SoundPlayer; se2: SoundPlayer;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/taunt-player-murkrow-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-taunt-portable-"));
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

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  templates: Record<string, number>;
  callbacks: Record<string, number>;
  songHeaders: Record<string, number>;
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "TAUNT",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerHead: fixture.attackerHead,
  fieldProfile: fixture.fieldProfile,
});

function callbackFor(kind: "bubble" | "finger" | "anger", age: number): number {
  if (kind === "bubble") {
    return probe.callbacks[
      age < 8 || age >= 53 && age < 62
        ? "RunStoredCallbackWhenAnimEnds"
        : age === 62 ? "DestroyAnimSprite" : "AnimThoughtBubble_Step"
    ]!;
  }
  if (kind === "finger") {
    return probe.callbacks[
      age < 10 ? "AnimTauntFinger_Step1"
        : age < 39 ? "RunStoredCallbackWhenAnimEnds" : "AnimTauntFinger_Step2"
    ]!;
  }
  return probe.callbacks[
    age === 16 ? "DestroySpriteAndMatrix"
      : "RunStoredCallbackWhenAffineAnimEnds"
  ]!;
}

function expectedSoftware(state: TauntState): readonly string[] {
  const result: string[] = [];
  if (state.thoughtBubble) {
    const sprite = state.thoughtBubble;
    result.push([
      probe.templates.gThoughtBubbleSpriteTemplate,
      sprite.x, sprite.y, sprite.x - 16, sprite.y - 16,
      0x8800 + 537 + sprite.frame * 16,
      Number(sprite.hFlip), 256,
      callbackFor("bubble", sprite.age),
      3, fixture.attackerSide === "player" ? 19 : 29,
    ].join(","));
  }
  if (state.finger) {
    const sprite = state.finger;
    result.push([
      probe.templates.gTauntFingerSpriteTemplate,
      sprite.x, sprite.y, sprite.x - 16, sprite.y - 16,
      0x7800 + 305 + sprite.frame * 16,
      Number(sprite.hFlip), 256,
      callbackFor("finger", sprite.age),
      4, fixture.attackerSide === "player" ? 18 : 28,
    ].join(","));
  }
  for (const mark of state.angerMarks) {
    const matrix = Math.trunc(0x10000 / mark.xScale);
    result.push([
      probe.templates.gAngerMarkSpriteTemplate,
      mark.x, mark.y, mark.x - 8, mark.y - 8,
      0x9800 + 353, 0, matrix,
      callbackFor("anger", mark.age),
      3, fixture.target.geometry.side === "player" ? 28 : 38,
    ].join(","));
  }
  return result;
}

function actualSoftware(sprite: Sprite): string {
  const affine = sprite.template === probe.templates.gAngerMarkSpriteTemplate;
  const left = sprite.attr1 & 0x1ff;
  const top = sprite.attr0 & 0xff;
  return [
    sprite.template, sprite.x, sprite.y, left, top, sprite.attr2,
    affine ? 0 : (sprite.attr1 >> 12) & 1,
    sprite.matrix.a, sprite.callback, sprite.slot, sprite.subpriority,
  ].join(",");
}

function expectedHardware(state: TauntState): readonly string[] {
  return expectedSoftware(state).map((shape) => {
    const p = shape.split(",");
    const template = Number(p[0]);
    const left = Number(p[3]);
    const top = Number(p[4]);
    const attr2 = Number(p[5]);
    const hFlip = Number(p[6]);
    if (template === probe.templates.gAngerMarkSpriteTemplate) {
      return [0x100 | top, 0x4000 | left, attr2].join(",");
    }
    return [top, 0x8000 | hFlip << 12 | left, attr2].join(",");
  }).reverse();
}

const failures: string[] = [];
let matches = 0;
let framebufferMatches = 0;
const framebufferMismatches: string[] = [];
let wroteDiagnostic = false;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = tauntAtAge(
    age, fixture.attackerSide, fixture.attackerHead,
    fixture.target.geometry.side, fixture.target.geometry.animationCenter,
  );
  const seam = sceneOnTauntView({ ...stage, age });
  const softwareExpected = expectedSoftware(expected);
  const softwareActual = oracle.sprites.map(actualSoftware);
  const software = JSON.stringify(softwareActual) === JSON.stringify(softwareExpected);
  const prior = tauntAtAge(
    age - 1, fixture.attackerSide, fixture.attackerHead,
    fixture.target.geometry.side, fixture.target.geometry.animationCenter,
  );
  const hardwareActual = oracle.hardwareOam
    .filter((oam) => {
      const palette = ((oam[2] ?? 0) >> 12) & 15;
      const tile = (oam[2] ?? 0) & 1023;
      return palette === 8 && tile >= 537 && tile <= 585
        || palette === 7 && tile >= 305 && tile <= 337
        || palette === 9 && tile === 353;
    })
    .map((oam) => [oam[0], oam[1], oam[2]].join(","));
  const hardwareExpected = expectedHardware(prior);
  const hardware = JSON.stringify(hardwareActual) === JSON.stringify(hardwareExpected);
  const palettePixels = oracle.hardwarePalette.every(
    (color, index) => color === oracle.fadedPalette[index],
  ) && [7, 8, 9].every((bank) => {
    const first = 256 + bank * 16;
    return oracle.unfadedPalette.slice(first, first + 16).every(
      (color, index) => color === oracle.fadedPalette[first + index],
    );
  });
  const assetsLoaded = age < 124;
  const palette = palettePixels
    && oracle.paletteTags[7] === (assetsLoaded ? 10214 : 0xffff)
    && oracle.paletteTags[8] === (assetsLoaded ? 10209 : 0xffff)
    && oracle.paletteTags[9] === (assetsLoaded ? 10087 : 0xffff);
  const registers = oracle.bldcnt === 0 && oracle.bldalpha === 0 && oracle.bldy === 0;
  const hardwareMatrix = prior.angerMarks.every((mark) => {
    const oam = oracle.hardwareOam.find(
      (item) => ((item[2] ?? 0) & 0xffff) === 0x9800 + 353,
    );
    const matrix = oracle.hardwareMatrices[((oam?.[1] ?? 0) >> 9) & 31];
    const expectedMatrix = Math.trunc(0x10000 / mark.xScale);
    return matrix?.a === expectedMatrix
      && matrix.b === 0
      && matrix.c === 0
      && matrix.d === expectedMatrix;
  });
  let sound = true;
  if (expected.soundRestart) {
    const player = expected.soundRestart === "SE_M_TAIL_WHIP" ? oracle.se2 : oracle.se1;
    const expectedPan = expected.soundRestart === "SE_M_SWAGGER2"
      ? expected.soundPanSide === "player" ? -63 : 63
      : expected.soundPanSide === "player" ? -64 : 63;
    sound = player.songHeader === probe.songHeaders[expected.soundRestart]
      && player.status === 0
      && player.tracks[0]?.flags === 131
      && player.tracks[0]?.panX === expectedPan;
  }
  const seamShape = JSON.stringify({
    ...seam, age: undefined, attacker: undefined, target: undefined,
  }) === JSON.stringify(expected);
  if (
    software && hardware && hardwareMatrix && palette
    && registers && sound && seamShape
  ) {
    matches += 1;
  } else {
    failures.push(
      `frame ${frame}/age ${age}: software=${software} hardware=${hardware} matrix=${hardwareMatrix} palette=${palette} registers=${registers} sound=${sound} seam=${seamShape}`
      + (software ? "" : `\n actual=${JSON.stringify(softwareActual)}\n expect=${JSON.stringify(softwareExpected)}`)
      + (hardware ? "" : `\n hwactual=${JSON.stringify(hardwareActual)}\n hwexpect=${JSON.stringify(hardwareExpected)}`),
    );
  }
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const rgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
    throw new Error(`raw RGB digest mismatch at frame ${frame}`);
  }
  let diffPixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
    ) diffPixels += 1;
  }
  if (diffPixels === 0) framebufferMatches += 1;
  else {
    framebufferMismatches.push(`${age}:${diffPixels}`);
    if (!wroteDiagnostic) {
      const oracleRgba = Buffer.alloc(240 * 160 * 4);
      const diffRgba = Buffer.alloc(240 * 160 * 4);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        oracleRgba[pixel * 4] = rgb[pixel * 3]!;
        oracleRgba[pixel * 4 + 1] = rgb[pixel * 3 + 1]!;
        oracleRgba[pixel * 4 + 2] = rgb[pixel * 3 + 2]!;
        oracleRgba[pixel * 4 + 3] = 255;
        if (
          app[pixel * 4] !== rgb[pixel * 3]
          || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
        ) {
          diffRgba[pixel * 4] = 255;
          diffRgba[pixel * 4 + 3] = 255;
        }
      }
      writeFileSync(join(scratch, `oracle-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: oracleRgba,
      }));
      writeFileSync(join(scratch, `app-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: Buffer.from(app),
      }));
      writeFileSync(join(scratch, `diff-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: diffRgba,
      }));
      wroteDiagnostic = true;
    }
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `TAUNT source components + typed seam ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (matches !== total || framebufferMatches !== total) {
  console.error(failures.slice(0, 30).join("\n"));
  console.error(`framebuffer mismatch age:pixels: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
