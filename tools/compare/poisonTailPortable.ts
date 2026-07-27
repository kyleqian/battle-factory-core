import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { horizontalLungeDestroyTick } from "../../src/animation/horizontalLunge.ts";
import {
  POISON_TAIL_BUBBLE_START_AGES,
  poisonTailAtAge,
} from "../../src/animation/poisonTail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPoisonTailView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import poisonTailAsset from "../../src/animation/assets/poisonTail.json" with { type: "json" };
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attackerSide: "player" | "opponent";
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
  readonly slot: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly template: number; readonly callback: number; readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
  readonly hardwareMatrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
  readonly data: readonly number[];
}

interface ProbeTask {
  readonly slot: number; readonly func: number; readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly bg1X: number; readonly bg1Y: number;
  readonly registers: Readonly<Record<string, number>>;
  readonly playerSprite: ProbeSprite; readonly opponentSprite: ProbeSprite;
  readonly sprites: readonly ProbeSprite[];
  readonly activeSprites: readonly ProbeSprite[];
  readonly tasks: readonly ProbeTask[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number; readonly status: number;
    readonly tracks: readonly {
      readonly flags: number; readonly pan: number; readonly panX: number;
    }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-poison-tail-portable-"));
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
  readonly songHeaders: Readonly<Record<
    "SE_M_HARDEN" | "SE_M_VITAL_THROW2" | "SE_M_TOXIC",
    number
  >>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "POISON_TAIL",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const art = poisonTailAsset as {
  readonly metal: { readonly palette: readonly { r: number; g: number; b: number }[] };
  readonly seviperBack: { readonly palette: readonly { r: number; g: number; b: number }[] };
  readonly seviperFront: { readonly palette: readonly { r: number; g: number; b: number }[] };
};

const pack = (color: { readonly r: number; readonly g: number; readonly b: number }) =>
  (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10);
const blend = (color: number, coefficient: number, target: number) => {
  const channel = (shift: number) => {
    const from = (color >> shift) & 31;
    const to = (target >> shift) & 31;
    return from + (((to - from) * coefficient) >> 4);
  };
  return channel(0) | (channel(5) << 5) | (channel(10) << 10);
};
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const spriteKey = (sprite: {
  readonly kind: string; readonly oamSlot: number;
  readonly x: number; readonly y: number;
  readonly xScale: number; readonly yScale: number;
}) => [
  sprite.kind, sprite.oamSlot, sprite.x, sprite.y, sprite.xScale, sprite.yScale,
].join(":");
const taskNamed = (frame: ProbeFrame, ...names: string[]) =>
  frame.tasks.filter((task) => names.some((name) => probe.taskFuncs[name] === task.func));

let componentMatches = 0;
let framebufferMatches = 0;
const componentDiffs: string[] = [];
const framebufferDiffs: string[] = [];
let firstFramebufferDiff: string | null = null;
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge
    + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const prior = frames.get(frame - 1);
  const view = sceneOnPoisonTailView({ ...stage, age });
  const predicted = poisonTailAtAge(
    age,
    fixture.attackerSide,
    fixture.attacker.geometry.animationCenter,
    fixture.target.geometry.animationCenter,
  );

  const actualBubbles = oracle.sprites
    .filter((sprite) =>
      sprite.template === probe.templates.gPoisonBubbleSpriteTemplate)
    .map((sprite) => spriteKey({
      kind: "poisonBubble",
      oamSlot: sprite.slot,
      x: sprite.x + sprite.x2,
      y: sprite.y + sprite.y2,
      xScale: sprite.matrix.a,
      yScale: sprite.matrix.d,
    })).sort();
  const expectedBubbles = predicted.bubbles.map(spriteKey).sort();
  const bubbleShape = same(actualBubbles, expectedBubbles);

  const hitsplats = oracle.sprites.filter((sprite) =>
    sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
  const hitsplatShape = predicted.hitsplatVisible
    ? hitsplats.length === 1
      && hitsplats[0]!.x + hitsplats[0]!.x2
        === fixture.target.geometry.animationCenter.x
      && hitsplats[0]!.y + hitsplats[0]!.y2
        === fixture.target.geometry.animationCenter.y
      && hitsplats[0]!.matrix.a === 372
      && hitsplats[0]!.matrix.d === 372
    : hitsplats.length === 0;

  const lunges = oracle.sprites.filter((sprite) =>
    sprite.template === probe.templates.gHorizontalLungeSpriteTemplate);
  const lungeFirstAge = 103;
  const lungeShape =
    lunges.length === Number(
      age >= lungeFirstAge
      && age < lungeFirstAge + horizontalLungeDestroyTick(4) - 1,
    );
  const attackerSprite = fixture.attackerSide === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const targetSprite = fixture.targetSide === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const baselineTargetX2 = fixture.targetSide === "opponent" ? 1 : 0;
  const battlerShape =
    attackerSprite.x2 === predicted.attackerX2
    && targetSprite.x2 === (age < 111 ? baselineTargetX2 : predicted.targetX2)
    && attackerSprite.y2 === 0 && targetSprite.y2 === 0;

  const masks = oracle.activeSprites.filter((sprite) =>
    sprite.slot !== attackerSprite.slot
    && ((sprite.attr0 >>> 10) & 3) === 2);
  const maskShape = masks.length === Number(predicted.metallic.maskSpriteActive)
    && masks.every((sprite) =>
      sprite.x === fixture.attacker.geometry.animationCenter.x
      && sprite.y === fixture.attacker.geometry.animationCenter.y);

  const metallicTasks = taskNamed(
    oracle, "AnimTask_MetallicShine", "AnimTask_MetallicShine_Step",
  );
  const metallicTaskShape = predicted.metallic.active
    ? metallicTasks.length === 1
      && metallicTasks[0]!.data[10] === predicted.metallic.data10
      && metallicTasks[0]!.data[11] === predicted.metallic.data11
      && (age < 2 || (
        metallicTasks[0]!.data[1] === 1
        && metallicTasks[0]!.data[2] === 1
        && metallicTasks[0]!.data[3] === 23768
      ))
    : metallicTasks.length === 0;
  const shakeTasks = taskNamed(
    oracle, "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
  );
  const shakeTaskShape = age >= 111 && age <= 120
    ? shakeTasks.length === 1
      && shakeTasks[0]!.data[4] === 3
      && shakeTasks[0]!.data[5] === 0
    : shakeTasks.length === 0;
  const soundTasks = taskNamed(
    oracle, "SoundTask_LoopSEAdjustPanning", "SoundTask_LoopSEAdjustPanning_Step",
  );
  const soundTaskShape = soundTasks.length <= 1
    && soundTasks.every((task) =>
      task.data[1] === 28 && task.data[2] === 2);

  const carrierPalette = fixture.attackerSide === "player"
    ? art.seviperBack.palette : art.seviperFront.palette;
  const paletteStart = 256 + ((attackerSprite.attr2 >>> 12) & 15) * 16;
  const originalRow = carrierPalette.map(pack);
  const poisonColor = 24 | (6 << 5) | (23 << 10);
  const expectedFaded = originalRow.map((color) =>
    age >= 2 && age < 122 ? blend(color, 11, poisonColor) : color);
  const fadedRow = oracle.fadedPalette.slice(paletteStart, paletteStart + 16);
  const unfadedRow = oracle.unfadedPalette.slice(paletteStart, paletteStart + 16);
  const priorFaded = prior?.fadedPalette.slice(paletteStart, paletteStart + 16)
    ?? expectedFaded;
  const hardwareRow = oracle.hardwarePalette.slice(
    paletteStart, paletteStart + 16,
  );
  const metalPalette = art.metal.palette.map(pack);
  const paletteShape = same(fadedRow, expectedFaded)
    && same(unfadedRow, originalRow)
    && same(hardwareRow, priorFaded)
    && (age < 3 || age > 99 || metalPalette.every((color, index) =>
      oracle.hardwarePalette[128 + index] === color));

  const metallicRegisters = age < 100;
  const contactRegisters = age >= 103 && age <= 121;
  const registerShape =
    oracle.registers.BLDCNT
      === (metallicRegisters ? 16194 : contactRegisters ? 16192 : 0)
    && oracle.registers.BLDALPHA
      === (metallicRegisters ? 3080 : contactRegisters ? 2060 : 0)
    && oracle.registers.WINOUT === (metallicRegisters ? 16189 : 16191)
    && ((oracle.registers.DISPCNT & 0x8000) !== 0) === metallicRegisters
    && (age < 2 || !metallicRegisters
      || (
        oracle.bg1X === predicted.metallic.bg1X
        && oracle.bg1Y === predicted.metallic.bg1Y
      ));
  const seamShape = same(view.bubbles.map(spriteKey).sort(), expectedBubbles)
    && view.attackerX2 === predicted.attackerX2
    && view.targetX2 === predicted.targetX2
    && view.monbg === (age >= 100 && age <= 121)
    && view.alpha === contactRegisters
    && view.attackerPaletteRestored === (age >= 122);

  const boundaries = new Map<number, readonly [number, number]>([
    [0, [probe.songHeaders.SE_M_HARDEN,
      fixture.attackerSide === "player" ? -64 : 63]],
    [30, [probe.songHeaders.SE_M_HARDEN,
      fixture.attackerSide === "player" ? -64 : 63]],
    [111, [probe.songHeaders.SE_M_VITAL_THROW2,
      fixture.targetSide === "player" ? -63 : 63]],
    ...POISON_TAIL_BUBBLE_START_AGES.map((boundary) => [
      boundary,
      [probe.songHeaders.SE_M_TOXIC,
        fixture.targetSide === "player" ? -63 : 63] as const,
    ] as const),
  ]);
  const expectedSound = boundaries.get(age);
  const isRestart = oracle.se1.status === 0
    && oracle.se1.tracks[0]?.flags === 131;
  const soundShape = expectedSound
    ? isRestart
      && oracle.se1.songHeader === expectedSound[0]
      && oracle.se1.tracks[0]?.panX === expectedSound[1]
    : !isRestart;

  const priorRelevant = prior?.sprites.filter((sprite) =>
    sprite.template === probe.templates.gBasicHitSplatSpriteTemplate
    || sprite.template === probe.templates.gPoisonBubbleSpriteTemplate) ?? [];
  const hardwareOamShape = priorRelevant.every((sprite) =>
    oracle.hardwareOam.some((oam) =>
      oam[0] === sprite.attr0 && oam[1] === sprite.attr1 && oam[2] === sprite.attr2));
  const hardwareAffineShape = oracle.sprites
    .filter((sprite) =>
      sprite.template === probe.templates.gBasicHitSplatSpriteTemplate
      || sprite.template === probe.templates.gPoisonBubbleSpriteTemplate)
    .every((sprite) => {
      const priorSprite = priorRelevant.find((candidate) =>
        candidate.slot === sprite.slot && candidate.template === sprite.template);
      return priorSprite
        ? sprite.hardwareMatrix.a === priorSprite.matrix.a
          && sprite.hardwareMatrix.b === priorSprite.matrix.b
          && sprite.hardwareMatrix.c === priorSprite.matrix.c
          && sprite.hardwareMatrix.d === priorSprite.matrix.d
        : sprite.hardwareMatrix.a === 256 && sprite.hardwareMatrix.d === 256;
    });

  if (
    bubbleShape && hitsplatShape && lungeShape && battlerShape && maskShape
    && metallicTaskShape && shakeTaskShape && soundTaskShape && paletteShape
    && registerShape && seamShape && soundShape
    && hardwareOamShape && hardwareAffineShape
  ) {
    componentMatches += 1;
  } else {
    componentDiffs.push(
      `frame ${frame}/age ${age}: bubbles=${bubbleShape} hit=${hitsplatShape}`
      + ` lunge=${lungeShape} battlers=${battlerShape} mask=${maskShape}`
      + ` tasks=${metallicTaskShape}/${shakeTaskShape}/${soundTaskShape}`
      + ` palette=${paletteShape} regs=${registerShape} seam=${seamShape}`
      + ` sound=${soundShape} hw=${hardwareOamShape}/${hardwareAffineShape}`,
    );
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
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
    const summary = `${frame}:${count}:${minX},${minY}-${maxX},${maxY}`;
    framebufferDiffs.push(summary);
    if (firstFramebufferDiff === null) {
      firstFramebufferDiff = `first framebuffer diff ${summary}`;
    }
  }
}

const total =
  fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `POISON TAIL source components ${componentMatches}/${total};`
  + ` framebuffer ${framebufferMatches}/${total}`,
);
if (componentMatches !== total || framebufferMatches !== total) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  if (framebufferDiffs.length) {
    console.error(`framebuffer mismatches ${framebufferDiffs.join(" ")}`);
  }
  if (componentDiffs.length) console.error(componentDiffs.slice(0, 20).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
