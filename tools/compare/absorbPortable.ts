import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnAbsorbView,
  type SceneOnAbsorbConfig,
} from "../../src/animation/sceneOnPresentation.ts";

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
  readonly matrix: readonly number[];
}
interface ProbeFrame {
  readonly frame: number; readonly effectSprites: readonly ProbeSprite[];
  readonly tasks: readonly { readonly func: string; readonly data: readonly number[] }[];
  readonly player: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly opponent: { readonly x2: number; readonly y2: number; readonly attr2: number };
  readonly bldcnt: number; readonly bldalpha: number;
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
  readonly frames: readonly ProbeFrame[];
};
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

let matches = 0;
const diffs: string[] = [];
const soundHeaders = new Map<string, number>();
let expectedSoundHeader = frames.get(fixture.denseWindow.startFrame)!.se1.songHeader;
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
  if (view.soundRestart !== null) {
    const prior = soundHeaders.get(view.soundRestart);
    if (prior === undefined) soundHeaders.set(view.soundRestart, oracle.se1.songHeader);
    expectedSoundHeader = soundHeaders.get(view.soundRestart)!;
  }
  const expectedPan = view.soundRestart === null ? null
    : view.soundRestart === "SE_M_ABSORB_2"
      ? (fixture.attacker.geometry.side === "player" ? 192 : 63)
      : (fixture.target.geometry.side === "player" ? 193 : 63);
  const activeTracks = oracle.se1.tracks.filter((track) => (track.flags & 0x80) !== 0);
  const audio = oracle.se1.songHeader === expectedSoundHeader
    && (expectedPan === null || (
      activeTracks.length > 0
      && activeTracks.every((track) => track.panX === expectedPan)
    ));
  if (JSON.stringify(predicted) === JSON.stringify(actual)
    && target.y2 === view.targetY2 && alpha && monBg && palette
    && paletteController && audio && allocation) {
    matches++;
  } else {
    diffs.push(`frame ${frame}/age ${age}: sprites ${predicted} != ${actual}; `
      + `targetY2 ${view.targetY2}/${target.y2}; alpha=${alpha}; monBg=${monBg}; `
      + `palette=${palette}; paletteController=${paletteController}; audio=${audio}; `
      + `allocation=${allocation}`);
  }
}
const total = fixture.denseWindow.cleanupFrame - fixture.denseWindow.startFrame + 1;
console.log(`ABSORB source/software/typed seam ${matches}/${total}`);
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
