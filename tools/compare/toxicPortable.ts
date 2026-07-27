import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  TOXIC_LARGE_BUBBLE_START_AGES,
  TOXIC_POISON_BUBBLE_START_AGES,
  toxicEffectAtAge,
} from "../../src/animation/toxic.ts";
import {
  createSceneOnMovePresentation,
  sceneOnToxicView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attackerSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly targetSide: "player" | "opponent";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}
interface ProbeSprite {
  readonly slot: number; readonly template: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly callback: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
  readonly hardwareMatrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
}
interface ProbeFrame {
  readonly frame: number;
  readonly sprites: readonly ProbeSprite[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number; readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-toxic-portable-"));
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
  readonly templates: Readonly<Record<"gToxicBubbleSpriteTemplate" | "gPoisonBubbleSpriteTemplate", number>>;
  readonly callbacks: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_TOXIC", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const key = (sprite: {
  readonly kind: string; readonly oamSlot: number; readonly x: number; readonly y: number;
  readonly xScale: number; readonly yScale: number; readonly frame: number;
}) => [sprite.kind, sprite.oamSlot, sprite.x, sprite.y,
  sprite.xScale, sprite.yScale, sprite.frame].join(":");
let matches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferMismatches: string[] = [];
let firstFramebufferDiff: string | null = null;
const stage = createSceneOnMovePresentation({
  move: "TOXIC",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const soundAges = new Set([
  ...TOXIC_LARGE_BUBBLE_START_AGES,
  ...TOXIC_POISON_BUBBLE_START_AGES,
]);
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const predicted = toxicEffectAtAge(
    age, fixture.attackerSide, fixture.targetCenter,
    fixture.target.geometry.animationCenter,
  );
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expectedSprites = predicted.map(key).sort();
  const actualSprites = oracle.sprites.map((sprite) => {
    const toxic = sprite.template === probe.templates.gToxicBubbleSpriteTemplate;
    return key({
      kind: toxic ? "toxicBubble" : "poisonBubble",
      oamSlot: sprite.slot,
      x: sprite.x + sprite.x2,
      y: sprite.y + sprite.y2,
      xScale: sprite.matrix.a,
      yScale: sprite.matrix.d,
      frame: toxic ? Math.floor((((sprite.attr2 & 0x3ff) - 0x131) & 0x3ff) / 8) : 0,
    });
  }).sort();
  const callbacksShape = oracle.sprites.every((sprite) =>
    sprite.template === probe.templates.gToxicBubbleSpriteTemplate
      ? sprite.callback === probe.callbacks.AnimSpriteOnMonPos
      : sprite.callback === probe.callbacks.AnimBubbleEffect
        || sprite.callback === probe.callbacks.AnimBubbleEffect_Step
  );
  const priorPredicted = toxicEffectAtAge(
    age - 1, fixture.attackerSide, fixture.targetCenter,
    fixture.target.geometry.animationCenter,
  );
  const affineShape = oracle.sprites.every((sprite) => {
    const toxic = sprite.template === probe.templates.gToxicBubbleSpriteTemplate;
    const current = predicted.find((item) =>
      item.kind === (toxic ? "toxicBubble" : "poisonBubble")
      && item.oamSlot === sprite.slot
      && item.x === sprite.x + sprite.x2 && item.y === sprite.y + sprite.y2
      && item.xScale === sprite.matrix.a && item.yScale === sprite.matrix.d
    );
    const priorSprite = current && priorPredicted.find((item) =>
      item.kind === current.kind && item.spawnIndex === current.spawnIndex
    );
    const hardwareScale = priorSprite?.xScale ?? 256;
    return current !== undefined
      && sprite.matrix.b === 0 && sprite.matrix.c === 0
      && sprite.hardwareMatrix.a === hardwareScale
      && sprite.hardwareMatrix.b === 0 && sprite.hardwareMatrix.c === 0
      && sprite.hardwareMatrix.d === hardwareScale;
  });
  const prior = frames.get(frame - 1);
  const hardwareLatch = !prior || prior.sprites.every((sprite) =>
    oracle.hardwareOam.some((entry) =>
      JSON.stringify(entry) === JSON.stringify([sprite.attr0, sprite.attr1, sprite.attr2])
    )
  );
  const soundBoundary = soundAges.has(age);
  const expectedPan = fixture.targetSide === "player" ? -63 : 63;
  const soundShape = !soundBoundary || (
    oracle.se1.songHeader === probe.songHeaders.SE_M_TOXIC
    && oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX === expectedPan
  );
  const seamView = sceneOnToxicView({ ...stage, age });
  const seamShape = JSON.stringify(seamView.sprites.map(key).sort())
    === JSON.stringify(expectedSprites);
  if (JSON.stringify(expectedSprites) === JSON.stringify(actualSprites)
      && callbacksShape && affineShape && hardwareLatch && soundShape && seamShape) {
    matches += 1;
  } else {
    mismatches.push(`frame ${frame}: sprites predicted=${expectedSprites} actual=${actualSprites}; callbacks=${callbacksShape} affine=${affineShape} hardwareLatch=${hardwareLatch}; soundBoundary=${soundBoundary} sound=${oracle.se1.songHeader}/${oracle.se1.status}/${oracle.se1.tracks[0]?.flags}/${oracle.se1.tracks[0]?.panX} expected=${probe.songHeaders.SE_M_TOXIC}/0/131/${expectedPan}; seam=${seamShape}`);
  }
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (app[rgba] === oracleRgb[rgb] && app[rgba + 1] === oracleRgb[rgb + 1]
        && app[rgba + 2] === oracleRgb[rgb + 2]) continue;
    exact = false; count += 1;
    const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) framebufferMatches += 1;
  else {
    if (firstFramebufferDiff === null) {
      firstFramebufferDiff = `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
    }
    framebufferMismatches.push(`${frame}:${count}:${minX},${minY}-${maxX},${maxY}`);
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`TOXIC source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (matches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (framebufferMismatches.length) console.error(`framebuffer mismatches ${framebufferMismatches.join(" ")}`);
  console.error(mismatches.slice(0, 12).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
