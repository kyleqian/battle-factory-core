import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { bubbleBeamAtAge } from "../../src/animation/bubbleBeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBubbleBeamView,
  type SceneOnBubbleBeamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

interface Fixture extends SceneOnBubbleBeamConfig {
  readonly schema: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
}
interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
}
interface Task {
  readonly slot: number;
  readonly func: { readonly symbol: string | null };
}
interface AudioPlayer {
  readonly songHeader: number;
  readonly tracks: readonly {
    readonly flags: number;
    readonly panX: number;
    readonly raw: string;
  }[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly Task[];
  readonly sprites: readonly Sprite[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: AudioPlayer;
  readonly se2: AudioPlayer;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly lifecycleCounts: {
    readonly bubbleProjectile: number;
    readonly waterBubble: number;
  };
  readonly topology: {
    readonly tasks: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly templates: {
    readonly gWaterBubbleProjectileSpriteTemplate: number;
    readonly gWaterBubbleSpriteTemplate: number;
  };
  readonly songHeaders: {
    readonly SE_M_BUBBLE: number;
    readonly SE_M_BUBBLE3: number;
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: bubbleBeamPortable.ts <player fixture> <opponent fixture>",
  );
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fresh = new Map<string, { evidence: string; raw: string }>();
const i16 = (raw: string, offset: number): number => {
  const value = Number.parseInt(
    raw.slice(offset * 2 + 2, offset * 2 + 4)
      + raw.slice(offset * 2, offset * 2 + 2),
    16,
  );
  return value >= 0x8000 ? value - 0x10000 : value;
};

function verify(fixturePath: string): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-bubble-beam-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  for (const frame of probe.frames) {
    const raw = readFileSync(
      join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) {
      throw new Error(`${fixture.orientation}: raw RGB changed at ${frame.frame}`);
    }
  }
  const rawDigest = rawHash.digest("hex");
  if (
    fixture.schema !== "bubble-beam-portable-evidence/v1"
    || probe.schema !== "bubble-beam-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.lifecycleCounts.bubbleProjectile !== 18
    || probe.lifecycleCounts.waterBubble !== 6
    || !probe.topology.callbacks.includes("AnimWaterBubbleProjectile_Step1")
    || !probe.topology.callbacks.includes("AnimBubbleEffect_Step")
    || !probe.topology.tasks.includes("AnimTask_SwayMonStep")
    || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || probe.frames.at(-1)?.visualTaskCount !== 0
  ) throw new Error(`${fixture.orientation}: portable evidence contract changed`);
  const previous = fresh.get(fixture.orientation);
  if (previous && !same(previous, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const stage = createSceneOnMovePresentation({
    move: "BUBBLE_BEAM",
    attacker: fixture.attacker,
    target: fixture.target,
    attackerPictureOffset: fixture.attackerPictureOffset,
    targetPictureOffset: fixture.targetPictureOffset,
    fieldProfile: fixture.fieldProfile,
  });
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const firstProjectile = probe.frames.flatMap((frame) => frame.sprites)
    .find((sprite) =>
      sprite.template.address === probe.templates.gWaterBubbleProjectileSpriteTemplate
    );
  const firstAfterEffect = probe.frames.flatMap((frame) => frame.sprites)
    .find((sprite) =>
      sprite.template.address === probe.templates.gWaterBubbleSpriteTemplate
    );
  if (!firstProjectile || !firstAfterEffect) {
    throw new Error(`${fixture.orientation}: missing Bubble Beam sprite family`);
  }
  const projectileTileBase = firstProjectile.attr[2]! & 0x3ff;
  const afterEffectTileBase = firstAfterEffect.attr[2]! & 0x3ff;
  const componentMismatches: string[] = [];
  const framebufferMismatches: string[] = [];
  let components = 0;
  let framebuffers = 0;
  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = byFrame.get(frame);
    if (!actual) throw new Error(`probe omitted frame ${frame}`);
    const expected = bubbleBeamAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attackerPictureOffset,
      fixture.targetPictureOffset,
    );
    const seam = sceneOnBubbleBeamView({ ...stage, age });
    const actualProjectiles = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gWaterBubbleProjectileSpriteTemplate
    ).map((sprite) => ({
      oamSlot: sprite.slot,
      x: i16(sprite.raw, 0x20),
      y: i16(sprite.raw, 0x22),
      x2: i16(sprite.raw, 0x24),
      y2: i16(sprite.raw, 0x26),
      frame: ((sprite.attr[2]! & 0x3ff) - projectileTileBase) / 4,
      matrix: sprite.matrix,
      callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedProjectiles = expected.projectiles.map((sprite) => ({
      oamSlot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      frame: sprite.frame,
      matrix: [sprite.matrix, 0, 0, sprite.matrix],
      callback: sprite.callback,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const actualAfterEffects = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gWaterBubbleSpriteTemplate
    ).map((sprite) => ({
      oamSlot: sprite.slot,
      x: i16(sprite.raw, 0x20),
      y: i16(sprite.raw, 0x22),
      x2: i16(sprite.raw, 0x24),
      y2: i16(sprite.raw, 0x26),
      frame: ((sprite.attr[2]! & 0x3ff) - afterEffectTileBase) / 4,
      matrix: sprite.matrix,
      callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedAfterEffects = expected.afterEffects.map((sprite) => ({
      oamSlot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      frame: sprite.frame,
      matrix: [sprite.matrix, 0, 0, sprite.matrix],
      callback: sprite.callback,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const actualSway = actual.tasks.some((task) =>
      task.func.symbol === "AnimTask_SwayMonStep"
    );
    const software = same(actualProjectiles, expectedProjectiles)
      && same(actualAfterEffects, expectedAfterEffects)
      && actualSway === expected.swayTaskActive;
    const source = actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const registers = expected.alpha
      ? actual.registers.bldcnt === 16192
        && actual.registers.bldalpha === 2060
      : actual.registers.bldcnt === 0 && actual.registers.bldalpha === 0;
    const tags = actual.paletteTags.includes(10146) === expected.bubbleLoaded
      && actual.paletteTags.includes(10155) === expected.smallBubblesLoaded;
    const event = expected.soundEvents.find((item) => item.age === age);
    const expectedSong = event?.song === "SE_M_BUBBLE"
      ? probe.songHeaders.SE_M_BUBBLE
      : probe.songHeaders.SE_M_BUBBLE3;
    const audio = actual.se1.tracks.length === 3
      && actual.se2.tracks.length === 3
      && ![
        probe.songHeaders.SE_M_BUBBLE,
        probe.songHeaders.SE_M_BUBBLE3,
      ].includes(actual.se2.songHeader)
      && (!event || (
        actual.se1.songHeader === expectedSong
        && actual.se1.tracks[0]?.flags === 131
        && actual.se1.tracks[0]?.panX === event.pan
      ));
    const prior = byFrame.get(frame - 1);
    const transfers = !prior || (
      same(actual.hardwareOam, prior.softwareOam)
      && (
        same(actual.hardwarePalette, prior.fadedPalette)
        || same(actual.hardwarePalette, actual.fadedPalette)
      )
    );
    const matrices = !prior || prior.sprites.filter((sprite) =>
      sprite.template.address
        === probe.templates.gWaterBubbleProjectileSpriteTemplate
      || sprite.template.address === probe.templates.gWaterBubbleSpriteTemplate
    ).every((sprite) =>
      same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const seamShape = seam.active === expected.active
      && seam.bubbleLoaded === expected.bubbleLoaded
      && seam.smallBubblesLoaded === expected.smallBubblesLoaded
      && same(seam.projectiles, expected.projectiles)
      && same(seam.afterEffects, expected.afterEffects)
      && same(seam.targetOffset, expected.targetOffset);
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
      ) diff += 1;
    }
    if (diff === 0) framebuffers += 1;
    if (
      software && source && registers && tags && audio && transfers
      && matrices && seamShape
    ) components += 1;
    else if (componentMismatches.length < 20) {
      componentMismatches.push(
        `frame ${frame}/age ${age}: software=${software} source=${source} `
        + `registers=${registers} tags=${tags} audio=${audio} `
        + `transfers=${transfers} matrices=${matrices} seam=${seamShape}`,
      );
    }
    if (diff !== 0 && framebufferMismatches.length < 20) {
      framebufferMismatches.push(
        `frame ${frame}/age ${age}: framebufferDiff=${diff}`,
      );
    }
  }
  console.log(
    `${fixture.orientation}: components ${components}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebuffers}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidence}; raw ${rawDigest}`,
  );
  if (componentMismatches.length || framebufferMismatches.length) {
    throw new Error(
      [...componentMismatches, ...framebufferMismatches].join("\n"),
    );
  }
}

for (let repeat = 0; repeat < 2; repeat += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath);
}
