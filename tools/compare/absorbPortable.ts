import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnAbsorbView,
  type SceneOnAbsorbConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture extends SceneOnAbsorbConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly cleanupFrame: number;
  };
  readonly appStage: { readonly presentationAge: number };
}
interface ProbeSprite {
  readonly slot: number; readonly template: string; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly animCmdIndex: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly subpriority: number;
  readonly matrix: readonly number[];
}
interface ProbeFrame {
  readonly frame: number; readonly effectSprites: readonly ProbeSprite[];
  readonly spriteOrder: readonly number[];
  readonly tasks: readonly { readonly func: string; readonly data: readonly number[] }[];
  readonly player: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly opponent: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly battleMons: readonly {
    readonly hp: number; readonly maxHP: number;
  }[];
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly dispcnt: number; readonly bg1cnt: number;
  readonly bg1x: number; readonly bg1y: number;
  readonly bg1hofs: number; readonly bg1vofs: number;
  readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number;
  readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[];
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-absorb-compare-"));
const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
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
  readonly schema: string;
  readonly frames: readonly ProbeFrame[];
};
if (probe.schema !== "absorb-dense-evidence/v3") {
  throw new Error(`${fixture.scenario}: unexpected probe schema ${probe.schema}`);
}
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "ABSORB", attacker: fixture.attacker, target: fixture.target,
  healingCenter: fixture.healingCenter,
  absorptionCenter: fixture.absorptionCenter,
  allocatorProfile: fixture.allocatorProfile,
  fieldProfile: fixture.fieldProfile,
});
const templateKind = (name: string) =>
  name === "gAbsorptionOrbSpriteTemplate" ? "orb"
    : name === "gHealingBlueStarSpriteTemplate" ? "star" : "hitsplat";
const key = (sprite: {
  readonly kind: string; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly frame: number;
  readonly xScale: number; readonly yScale: number;
}) => [
  sprite.kind, sprite.x, sprite.y, sprite.x2, sprite.y2,
  sprite.frame, sprite.xScale, sprite.yScale,
].join(":");
const blend = (source: number, target: number, y: number): number => {
  let result = 0;
  for (let shift = 0; shift < 15; shift += 5) {
    const a = (source >> shift) & 31, b = (target >> shift) & 31;
    result |= Math.trunc((a * (16 - y) + b * y) / 16) << shift;
  }
  return result;
};
const effectOam = (row: ProbeFrame) => row.hardwareOam.filter((item) => {
  const tile = item[2]! & 1023;
  const palette = item[2]! >> 12;
  return (palette === 7 && tile === 313)
    || (palette === 8 && tile >= 537 && tile <= 633)
    || (palette === 9 && tile === 317);
});
const softwareEffectSprites = (row: ProbeFrame) =>
  row.effectSprites.filter((sprite) =>
    sprite.template !== "gSimplePaletteBlendSpriteTemplate");
const expectedHardwareOam = (row: ProbeFrame) =>
  softwareEffectSprites(row)
    .slice()
    .sort((a, b) =>
      row.spriteOrder.indexOf(a.slot) - row.spriteOrder.indexOf(b.slot))
    .map((sprite) => [sprite.attr0, sprite.attr1, sprite.attr2]);

let matches = 0;
let framebufferMatches = 0;
const diffs: string[] = [];
const soundHeaders = new Map<string, number>();
let expectedSoundHeader = frames.get(fixture.denseWindow.startFrame)!.se1.songHeader;
let expectedSoundPan: number | null = null;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.cleanupFrame; frame++) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const view = sceneOnAbsorbView({ ...stage, age });
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const predicted = view.sprites.map(key).sort();
  const paletteControllers = oracle.effectSprites.filter((sprite) =>
    sprite.template === "gSimplePaletteBlendSpriteTemplate"
  );
  const actual = oracle.effectSprites.filter((sprite) =>
    sprite.template !== "gSimplePaletteBlendSpriteTemplate"
  ).map((sprite) => key({
    kind: templateKind(sprite.template), x: sprite.x, y: sprite.y,
    x2: sprite.x2, y2: sprite.y2,
    frame: sprite.template === "gBasicHitSplatSpriteTemplate"
      ? 2 : sprite.template === "gAbsorptionOrbSpriteTemplate"
        ? 8 : (sprite.animCmdIndex === 7 ? 0 : sprite.animCmdIndex),
    xScale: sprite.matrix[0]!, yScale: sprite.matrix[3]!,
  })).sort();
  const expectedSlots = view.sprites.map((sprite) =>
    sprite.kind === "hitsplat" ? fixture.allocatorProfile.hitsplat
      : sprite.kind === "orb" ? fixture.allocatorProfile.orbs[sprite.spawnIndex]!
        : fixture.allocatorProfile.stars[sprite.spawnIndex]!
  ).sort((a, b) => a - b);
  const actualSlots = oracle.effectSprites.filter((sprite) =>
    sprite.template !== "gSimplePaletteBlendSpriteTemplate"
  ).map((sprite) => sprite.slot).sort((a, b) => a - b);
  const allocation = JSON.stringify(expectedSlots) === JSON.stringify(actualSlots)
    && paletteControllers.every((sprite) =>
      sprite.slot === fixture.allocatorProfile.paletteController
    );
  const target = fixture.target.geometry.side === "player"
    ? oracle.player : oracle.opponent;
  const alpha = view.alpha === null
    ? oracle.bldcnt === 0 && oracle.bldalpha === 0
    : oracle.bldcnt === 16192 && oracle.bldalpha === 2060;
  const monBg = oracle.tasks.some((task) =>
    task.func === "Task_UpdateMonBg" || task.func === "Task_ClearMonBg"
  ) === (view.targetOnMonBg || age === 191 || age === 192 || age === 193);
  const palette = oracle.fadedPalette.slice(16, 64).every((color, offset) =>
    color === blend(oracle.unfadedPalette[offset + 16]!,
      view.bgPaletteBlendColor, view.bgPaletteBlendY)
  );
  const paletteController =
    paletteControllers.length === (view.paletteControllerActive ? 1 : 0);
  const priorOracle = frames.get(frame - 1);
  if (!priorOracle) throw new Error(`probe omitted hardware source frame ${frame - 1}`);
  const hardwareOam = JSON.stringify(effectOam(oracle))
    === JSON.stringify(expectedHardwareOam(priorOracle));
  const hardwareMatrices = softwareEffectSprites(priorOracle)
    .filter((sprite) => sprite.template !== "gHealingBlueStarSpriteTemplate")
    .every((sprite) => {
      const matrixNum = sprite.attr1 >> 9 & 31;
      return JSON.stringify(oracle.hardwareMatrices[matrixNum])
        === JSON.stringify(sprite.matrix);
    });
  const displayedPalette = sceneOnAbsorbView({ ...stage, age: age - 1 });
  const hardwareBgPalette = oracle.hardwarePalette.slice(16, 64)
    .every((color, offset) =>
      color === blend(
        oracle.unfadedPalette[offset + 16]!,
        displayedPalette.bgPaletteBlendColor,
        displayedPalette.bgPaletteBlendY,
      ));
  const effectPalettes = [7, 8, 9].every((bank) => {
    const start = 256 + bank * 16;
    return oracle.hardwarePalette.slice(start, start + 16).every(
      (color, offset) =>
        color === oracle.fadedPalette[start + offset]
        && color === oracle.unfadedPalette[start + offset],
    );
  });
  const paletteTags = oracle.paletteTags[7] === 10147
    && oracle.paletteTags[8] === 10031
    && oracle.paletteTags[9] === 10135;
  const expectedVisualTasks = view.sprites.length
    + Number(view.paletteControllerActive)
    + Number(age >= 20 && age <= 27);
  const taskCounts = oracle.visualTaskCount === expectedVisualTasks
    && oracle.soundTaskCount === 0;
  const hpProfile = oracle.battleMons[0]?.hp === fixture.fieldProfile.playerHp
    && oracle.battleMons[0]?.maxHP === fixture.fieldProfile.playerMaxHp
    && oracle.battleMons[1]?.hp === fixture.fieldProfile.opponentHp
    && oracle.battleMons[1]?.maxHP === fixture.fieldProfile.opponentMaxHp;
  const playerToOpponent = fixture.attacker.geometry.side === "player";
  const expectedBg1Cnt = playerToOpponent
    ? (age === 0 ? 39936 : 23554)
    : (age < 3 ? 23554 : 23553);
  const expectedBg1X = playerToOpponent && age < 194
    ? -fixture.target.geometry.spriteCorner.x - Number(age < 20) : 0;
  const expectedBg1Y = playerToOpponent && age < 194
    ? -fixture.target.geometry.spriteCorner.y - view.targetY2 : 0;
  const expectedBg1Hofs = playerToOpponent && age > 0
    ? ((-fixture.target.geometry.spriteCorner.x
      - Number(age <= 20)) & 0x1ff) : 0;
  const expectedBg1Vofs = playerToOpponent && age > 0
    ? ((-fixture.target.geometry.spriteCorner.y
      - displayedPalette.targetY2) & 0x1ff) : 0;
  const registers = oracle.dispcnt === 48960
    && oracle.bg1cnt === expectedBg1Cnt
    && oracle.bg1x === expectedBg1X && oracle.bg1y === expectedBg1Y
    && oracle.bg1hofs === expectedBg1Hofs
    && oracle.bg1vofs === expectedBg1Vofs
    && oracle.bldy === 0 && alpha;
  if (view.soundRestart !== null) {
    const prior = soundHeaders.get(view.soundRestart);
    if (prior === undefined) soundHeaders.set(view.soundRestart, oracle.se1.songHeader);
    expectedSoundHeader = soundHeaders.get(view.soundRestart)!;
    expectedSoundPan = view.soundRestart === "SE_M_ABSORB_2"
      ? (fixture.attacker.geometry.side === "player" ? -64 : 63)
      : (fixture.target.geometry.side === "player" ? -63 : 63);
  }
  const activeTracks = oracle.se1.tracks.filter((track) => (track.flags & 0x80) !== 0);
  const audio = oracle.se1.songHeader === expectedSoundHeader
    && (expectedSoundPan === null
      || activeTracks.every((track) => track.panX === expectedSoundPan))
    && oracle.se2.tracks.every((track) => (track.flags & 0x80) === 0);
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const rgb = readFileSync(join(
    rgbDir,
    `${String(frame).padStart(5, "0")}.rgb`,
  ));
  const digest = createHash("sha256").update(rgb).digest("hex") === oracle.sha256;
  let pixelDiff = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] === rgb[pixel * 3]
      && app[pixel * 4 + 1] === rgb[pixel * 3 + 1]
      && app[pixel * 4 + 2] === rgb[pixel * 3 + 2]) continue;
    pixelDiff += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const framebuffer = pixelDiff === 0;
  if (framebuffer) framebufferMatches += 1;
  if (JSON.stringify(predicted) === JSON.stringify(actual)
    && target.y2 === view.targetY2 && alpha && monBg && palette
    && paletteController && audio && allocation
    && hardwareOam && hardwareMatrices && hardwareBgPalette
    && effectPalettes && paletteTags && taskCounts && hpProfile && registers
    && digest && framebuffer) {
    matches++;
  } else {
    diffs.push(`frame ${frame}/age ${age}: sprites ${predicted} != ${actual}; `
      + `targetY2 ${view.targetY2}/${target.y2}; alpha=${alpha}; monBg=${monBg}; `
      + `palette=${palette}; paletteController=${paletteController}; audio=${audio}; `
      + `allocation=${allocation}; hwOam=${hardwareOam}; hwMatrix=${hardwareMatrices}; `
      + `hwBgPalette=${hardwareBgPalette}; effectPalettes=${effectPalettes}; `
      + `paletteTags=${paletteTags}; taskCounts=${taskCounts}; hp=${hpProfile}; `
      + `registers=${registers}; digest=${digest}; framebuffer=${framebuffer}; `
      + `diff=${pixelDiff} bbox=${minX},${minY}-${maxX},${maxY}`);
  }
}
const total = fixture.denseWindow.cleanupFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `ABSORB source/software/hardware/framebuffer ${matches}/${total}; `
  + `framebuffer ${framebufferMatches}/${total}`,
);
if (soundHeaders.size !== 3
  || new Set(soundHeaders.values()).size !== soundHeaders.size) {
  diffs.push(`audio identities were not three distinct source songs: ${
    JSON.stringify([...soundHeaders])
  }`);
}
if (matches !== total || diffs.length) {
  console.error(diffs.slice(0, 12).join("\n"));
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
