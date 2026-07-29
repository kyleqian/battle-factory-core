import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { crossChopAtAge } from "../../src/animation/crossChop.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCrossChopView,
  type SceneOnCrossChopConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture extends SceneOnCrossChopConfig {
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
  readonly targetPan: number;
  readonly soundAges: {
    readonly megaKick: number;
    readonly razorWind: number;
  };
  readonly topology: Record<string, readonly string[]>;
}
interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: {
    readonly address: number;
    readonly symbol: string | null;
  };
  readonly callback: {
    readonly symbol: string | null;
  };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}
interface Task {
  readonly slot: number;
  readonly func: {
    readonly symbol: string | null;
  };
  readonly data: readonly number[];
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
  readonly templates: {
    readonly gCrossChopHandSpriteTemplate: number;
    readonly gCrossImpactSpriteTemplate: number;
  };
  readonly songHeaders: {
    readonly se_m_mega_kick: number;
    readonly se_m_razor_wind: number;
  };
  readonly topology: Fixture["topology"];
  readonly lifecycleCounts: {
    readonly crossChopHand: number;
    readonly crossImpact: number;
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: crossChopPortable.ts <player fixture> <opponent fixture>",
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
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-cross-chop-"));
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
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
    fixture.schema !== "cross-chop-portable-evidence/v1"
    || probe.schema !== "cross-chop-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.lifecycleCounts.crossChopHand !== 2
    || probe.lifecycleCounts.crossImpact !== 1
    || probe.frames[0]?.gAnimScriptActive !== 1
    || probe.frames.at(-1)?.gAnimScriptActive !== 0
    || probe.frames.at(-1)?.visualTaskCount !== 0
  ) {
    throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  }
  const priorFresh = fresh.get(fixture.orientation);
  if (priorFresh && !same(priorFresh, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });

  const stage = createSceneOnMovePresentation<SceneOnCrossChopConfig>({
    move: "CROSS_CHOP",
    attacker: fixture.attacker,
    target: fixture.target,
    targetPictureOffset: fixture.targetPictureOffset,
    fieldProfile: fixture.fieldProfile,
  });
  const byFrame = new Map(probe.frames.map((frame) => [frame.frame, frame]));
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
    const expected = crossChopAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.targetPictureOffset,
    );
    const seam = sceneOnCrossChopView({ ...stage, age });
    const actualHands = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gCrossChopHandSpriteTemplate
    ).map((sprite) => ({
      index: sprite.slot === 3 ? 0 : 1,
      oamSlot: sprite.slot,
      x: i16(sprite.raw, 0x20),
      y: i16(sprite.raw, 0x22),
      x2: i16(sprite.raw, 0x24),
      y2: i16(sprite.raw, 0x26),
      hFlip: Boolean(sprite.attr[1]! & 0x1000),
      callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const actualImpact = actual.sprites.find((sprite) =>
      sprite.template.address === probe.templates.gCrossImpactSpriteTemplate
    );
    const impactShape = actualImpact
      ? {
          oamSlot: actualImpact.slot,
          x: i16(actualImpact.raw, 0x20),
          y: i16(actualImpact.raw, 0x22),
          remaining: actualImpact.data[0],
          callback: actualImpact.callback.symbol,
        }
      : null;
    const paletteSprite = actual.sprites.find((sprite) =>
      sprite.template.symbol === "gComplexPaletteBlendSpriteTemplate"
    );
    const paletteShape = paletteSprite
      ? { callback: paletteSprite.callback.symbol }
      : null;
    const expectedPaletteShape = expected.paletteBlend
      ? { callback: expected.paletteBlend.callback }
      : null;
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const targetSlot = fixture.target.geometry.side === "opponent" ? 8 : 6;
    const targetSprite = actual.sprites.find((sprite) =>
      sprite.slot === targetSlot
      && sprite.template.symbol === "gMultiuseSpriteTemplate"
    );
    const software = same(actualHands, expected.hands)
      && same(impactShape, expected.impact)
      && same(paletteShape, expectedPaletteShape)
      && taskNames.includes("AnimTask_ShakeMon_Step")
        === expected.shakeTaskActive
      && taskNames.includes("Task_ClearMonBg")
        === expected.clearMonBgTaskActive
      && taskNames.includes("Task_UpdateMonBg")
        === expected.updateMonBgTaskActive
      && i16(targetSprite?.raw ?? "", 0x24)
        === expected.targetBaselineX2 + expected.targetOffset.x2;
    const source = actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const registers = expected.alpha
      ? actual.registers.bldcnt === 16192
        && actual.registers.bldalpha === 2060
      : actual.registers.bldcnt === 0 && actual.registers.bldalpha === 0;
    const tags =
      actual.paletteTags.includes(10143)
        === expected.assetsLoaded.handsAndFeet
      && actual.paletteTags.includes(10285)
        === expected.assetsLoaded.crossImpact;
    const event = expected.soundEvents.find((item) => item.age === age);
    const expectedSong = event?.song === "SE_M_MEGA_KICK"
      ? probe.songHeaders.se_m_mega_kick
      : probe.songHeaders.se_m_razor_wind;
    const audio = actual.se1.tracks.length === 3
      && actual.se2.tracks.length === 3
      && ![
        probe.songHeaders.se_m_mega_kick,
        probe.songHeaders.se_m_razor_wind,
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
    const receiptShapes = actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.hardwareMatrices.every((matrix) => matrix.length === 4)
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.sprites.every((sprite) =>
        sprite.matrixNum >= 0 && sprite.matrixNum < 32
      );
    const seamShape = seam.active === expected.active
      && same(seam.assetsLoaded, expected.assetsLoaded)
      && seam.targetMonbg === expected.targetMonbg
      && same(seam.alpha, expected.alpha)
      && seam.scriptOffset === expected.scriptOffset
      && seam.visualTaskCount === expected.visualTaskCount
      && same(seam.hands, expected.hands)
      && same(seam.impact, expected.impact)
      && same(seam.paletteBlend, expected.paletteBlend)
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
      && receiptShapes && seamShape
    ) components += 1;
    else if (componentMismatches.length < 20) {
      componentMismatches.push(
        `frame ${frame}/age ${age}: software=${software} source=${source} `
        + `registers=${registers} tags=${tags} audio=${audio} `
        + `transfers=${transfers} receipts=${receiptShapes} seam=${seamShape}`,
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
