import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  sludgeEffectAtAge,
  sludgeTargetPaletteYAtAge,
} from "../../src/animation/sludge.ts";
import {
  SLUDGE_BOMB_HIT_START_AGES,
  SLUDGE_BOMB_PROJECTILE_START_AGES,
  sludgeBombEffectAtAge,
} from "../../src/animation/sludgeBomb.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSludgeBombView,
  sceneOnSludgeView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture {
  readonly move?: "SLUDGE" | "SLUDGE_BOMB";
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly projectileOrigin: Readonly<{ x: number; y: number }>;
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
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrix: { readonly a: number; readonly d: number };
}
interface ProbeFrame {
  readonly frame: number;
  readonly playerSprite: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly opponentSprite: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly sprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly se1: {
    readonly songHeader: number; readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-sludge-components-"));
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
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_BUBBLE3" | "SE_M_TOXIC" | "SE_M_DIG", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const key = (sprite: {
  readonly kind: string; readonly oamSlot: number; readonly x: number; readonly y: number;
  readonly xScale: number; readonly yScale: number;
}) => [sprite.kind, sprite.oamSlot, sprite.x, sprite.y, sprite.xScale, sprite.yScale].join(":");
const blendPaletteColor = (color: number, coeff: number, target = 31774) => {
  const channel = (shift: number) => {
    const from = (color >> shift) & 31;
    const to = (target >> shift) & 31;
    return from + (((to - from) * coeff) >> 4);
  };
  return channel(0) | (channel(5) << 5) | (channel(10) << 10);
};
let matches = 0;
let framebufferMatches = 0;
const mismatches: string[] = [];
const framebufferMismatches: string[] = [];
let firstFramebufferDiff: string | null = null;
const isBomb = fixture.move === "SLUDGE_BOMB";
const stage = createSceneOnMovePresentation({
  move: isBomb ? "SLUDGE_BOMB" : "SLUDGE",
  attacker: fixture.attacker,
  target: fixture.target,
  projectileOrigin: fixture.projectileOrigin,
  fieldProfile: fixture.fieldProfile,
});
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const predicted = isBomb
    ? sludgeBombEffectAtAge(
        age, fixture.attackerSide, fixture.projectileOrigin, fixture.targetCenter,
      )
    : sludgeEffectAtAge(
        age, fixture.attackerSide, fixture.projectileOrigin, fixture.targetCenter,
      );
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expectedSprites = predicted.sprites.map(key).sort();
  const actualSprites = oracle.sprites.map((sprite) => key({
    kind: sprite.template === probe.templates.gSludgeProjectileSpriteTemplate
      ? "projectile"
      : sprite.template === probe.templates.gSludgeBombHitParticleSpriteTemplate
        ? "hitParticle"
        : "poisonBubble",
    oamSlot: sprite.slot,
    x: sprite.x + sprite.x2,
    y: sprite.y + sprite.y2,
    xScale: sprite.matrix.a,
    yScale: sprite.matrix.d,
  })).sort();
  const target = fixture.targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
  const baselineTargetX2 = fixture.targetSide === "opponent" ? 1 : 0;
  const predictedTargetX2 = age < (isBomb ? 50 : 41)
    ? baselineTargetX2
    : predicted.targetOffset.x2;
  const shake = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs[isBomb ? "AnimTask_ShakeMon2" : "AnimTask_ShakeMon"]
    || task.func === probe.taskFuncs[isBomb ? "AnimTask_ShakeMon2_Step" : "AnimTask_ShakeMon_Step"]
  );
  const blend = oracle.tasks.filter((task) =>
    task.func === probe.taskFuncs.AnimTask_BlendColorCycle
    || task.func === probe.taskFuncs.AnimTask_BlendColorCycleLoop
  );
  const shakeShape = age < (isBomb ? 50 : 41) || age > (isBomb ? 77 : 48)
    ? shake.length === 0
    : shake.length === 1
      && (isBomb
        ? shake[0]!.data[1] >= 1 && shake[0]!.data[1] <= 14
          && shake[0]!.data[4] === 3 && shake[0]!.data[5] === 0
        : shake[0]!.data[2] === 1 && shake[0]!.data[4] === 3
          && shake[0]!.data[5] === 0);
  const blendShape = age < (isBomb ? 50 : 41) || age > (isBomb ? 96 : 87)
    ? blend.length === 0
    : blend.length === 1
      && blend[0]!.data[0] === 4 && blend[0]!.data[1] === 1
      && blend[0]!.data[4] === 12 && blend[0]!.data[5] === 31774;
  const targetPaletteStart = 256 + ((target.attr2 >> 12) & 0xf) * 16;
  const unfadedRow = oracle.unfadedPalette.slice(targetPaletteStart, targetPaletteStart + 16);
  const fadedRow = oracle.fadedPalette.slice(targetPaletteStart, targetPaletteStart + 16);
  const hardwareRow = oracle.hardwarePalette.slice(targetPaletteStart, targetPaletteStart + 16);
  const paletteCoefficients = Array.from({ length: 13 }, (_, coefficient) => coefficient)
    .filter((coefficient) => unfadedRow.every(
      (color, index) => blendPaletteColor(color, coefficient) === fadedRow[index],
    ));
  const prior = frames.get(frame - 1);
  const hardwareExpected = prior
    ? prior.fadedPalette.slice(targetPaletteStart, targetPaletteStart + 16)
    : fadedRow;
  const expectedCoefficient = isBomb
    ? predicted.defenderPaletteY
    : sludgeTargetPaletteYAtAge(age);
  const paletteShape = paletteCoefficients.includes(expectedCoefficient)
    && JSON.stringify(hardwareExpected) === JSON.stringify(hardwareRow);
  const toxicSoundAge = (isBomb
    ? [98, 106, 114, 122, 130, 138]
    : [41, 49, 57, 65, 73, 81]).includes(age);
  const projectileSoundAge = (isBomb
    ? SLUDGE_BOMB_PROJECTILE_START_AGES
    : [0]).includes(age as never);
  const digSoundAge = isBomb && SLUDGE_BOMB_HIT_START_AGES.includes(age as never);
  const soundBoundary = projectileSoundAge || digSoundAge || toxicSoundAge;
  const expectedSong = projectileSoundAge
    ? probe.songHeaders.SE_M_BUBBLE3
    : digSoundAge ? probe.songHeaders.SE_M_DIG : probe.songHeaders.SE_M_TOXIC;
  const expectedPan = projectileSoundAge
    ? (fixture.attackerSide === "player" ? -64 : 63)
    : (fixture.targetSide === "player" ? -63 : 63);
  const soundShape = !soundBoundary || (
    oracle.se1.songHeader === expectedSong
    && oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX === expectedPan
  );
  const seamState = { ...stage, age };
  const seamView = isBomb
    ? sceneOnSludgeBombView(seamState)
    : sceneOnSludgeView(seamState);
  const seamShape = JSON.stringify(
    seamView.sprites.map(key).sort(),
  ) === JSON.stringify(expectedSprites)
    && seamView.targetOffset.x2 === predicted.targetOffset.x2
    && seamView.targetOffset.y2 === predicted.targetOffset.y2
    && seamView.defenderPaletteY === expectedCoefficient;
  if (JSON.stringify(expectedSprites) === JSON.stringify(actualSprites)
      && predictedTargetX2 === target.x2
      && predicted.targetOffset.y2 === target.y2
      && shakeShape && blendShape && paletteShape && soundShape && seamShape) {
    matches += 1;
  } else {
    mismatches.push(`frame ${frame}: sprites predicted=${expectedSprites} actual=${actualSprites}; target predicted=${predictedTargetX2},${predicted.targetOffset.y2} actual=${target.x2},${target.y2}; tasks shake=${shake.length} blend=${blend.length}; palette predicted=${expectedCoefficient} actual=${paletteCoefficients} hwPriorLatch=${JSON.stringify(hardwareExpected) === JSON.stringify(hardwareRow)}; soundBoundary=${soundBoundary} sound=${oracle.se1.songHeader}/${oracle.se1.status}/${oracle.se1.tracks[0]?.flags}/${oracle.se1.tracks[0]?.panX} expected=${expectedSong}/0/131/${expectedPan}; seam=${seamShape}`);
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: seamState,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  let exact = true;
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (
      app[rgba] === oracleRgb[rgb]
      && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]
    ) continue;
    exact = false;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (exact) {
    framebufferMatches += 1;
  } else {
    if (firstFramebufferDiff === null) {
      firstFramebufferDiff =
        `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
    }
    framebufferMismatches.push(
      `${frame}:${count}:${minX},${minY}-${maxX},${maxY}`,
    );
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `${isBomb ? "SLUDGE BOMB" : "SLUDGE"} source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (matches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (framebufferMismatches.length) {
    console.error(`framebuffer mismatches ${framebufferMismatches.join(" ")}`);
  }
  console.error(mismatches.slice(0, 12).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
