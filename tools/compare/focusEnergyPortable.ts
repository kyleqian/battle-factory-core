import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { focusEnergyAtAge } from "../../src/animation/focusEnergy.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFocusEnergyView,
  type SceneOnFocusEnergyConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

interface Fixture extends SceneOnFocusEnergyConfig {
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
  readonly soundStartAge: number;
  readonly soundPan: number;
  readonly topology: Record<string, readonly string[]>;
}
interface Sprite {
  readonly slot: number;
  readonly raw: string;
  readonly template: { readonly address: number; readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly matrixNum: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}
interface Task {
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
  readonly templates: { readonly gEndureEnergySpriteTemplate: number };
  readonly songHeaders: { readonly SE_M_DRAGON_RAGE: number };
  readonly topology: Fixture["topology"];
  readonly lifecycleCounts: { readonly endureEnergy: number };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error(
    "usage: focusEnergyPortable.ts <player fixture> <opponent fixture>",
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
const blend5ToWhite = (component: number, coefficient: number) =>
  component + (((31 - component) * coefficient) >> 4);
const blend15ToWhite = (color: number, coefficient: number) =>
  blend5ToWhite(color & 31, coefficient)
  | (blend5ToWhite((color >> 5) & 31, coefficient) << 5)
  | (blend5ToWhite((color >> 10) & 31, coefficient) << 10);

function verify(fixturePath: string): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-focus-energy-"));
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
    fixture.schema !== "focus-energy-portable-evidence/v2"
    || probe.schema !== "focus-energy-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.topology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || rawDigest !== fixture.rawRgbSha256
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.lifecycleCounts.endureEnergy !== 15
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

  const stage = createSceneOnMovePresentation<SceneOnFocusEnergyConfig>({
    move: "FOCUS_ENERGY",
    attacker: fixture.attacker,
    target: fixture.target,
    attackerCoord: fixture.attackerCoord,
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
    const expected = focusEnergyAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.attackerCoord,
    );
    const seam = sceneOnFocusEnergyView({ ...stage, age });
    const actualSprites = actual.sprites.filter((sprite) =>
      sprite.template.address === probe.templates.gEndureEnergySpriteTemplate
    ).map((sprite) => ({
      oamSlot: sprite.slot,
      x: i16(sprite.raw, 0x20),
      y: i16(sprite.raw, 0x22),
      frame: Math.floor(((sprite.attr[2]! & 1023) - 305) / 8),
      data0: sprite.data[0],
      data1: sprite.data[1],
      callback: sprite.callback.symbol,
    })).sort((left, right) => left.oamSlot - right.oamSlot);
    const expectedSprites = expected.sprites.map((sprite) => ({
      oamSlot: sprite.oamSlot,
      x: sprite.x,
      y: sprite.y,
      frame: sprite.frame,
      data0: sprite.data0,
      data1: sprite.data1,
      callback: sprite.callback,
    }));
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const attackerSlot =
      fixture.attacker.geometry.side === "player" ? 6 : 8;
    const attackerSprite = actual.sprites.find((sprite) =>
      sprite.slot === attackerSlot
      && sprite.template.symbol === "gMultiuseSpriteTemplate"
    );
    const software = same(actualSprites, expectedSprites)
      && i16(attackerSprite?.raw ?? "", 0x24) === expected.attackerX2
      && taskNames.includes("AnimTask_BlendColorCycleLoop")
        === expected.paletteTaskActive
      && taskNames.includes("AnimTask_ShakeMon2_Step")
        === expected.shakeTaskActive;
    const source = actual.scriptOffset === expected.scriptOffset
      && Boolean(actual.gAnimScriptActive) === expected.active
      && actual.visualTaskCount === expected.visualTaskCount
      && actual.soundTaskCount === expected.soundTaskCount;
    const paletteStart =
      fixture.attacker.geometry.side === "player" ? 256 : 272;
    const palette = Array.from({ length: 16 }, (_, index) =>
      actual.fadedPalette[paletteStart + index]
        === blend15ToWhite(
          actual.unfadedPalette[paletteStart + index]!,
          expected.attackerPaletteY,
        )
    ).every(Boolean);
    const tags = actual.paletteTags.includes(10184)
      === expected.assetLoaded;
    const audioStarts = age === fixture.soundStartAge;
    const audio = actual.se1.tracks.length === 3
      && actual.se2.tracks.length === 3
      && actual.se2.songHeader !== probe.songHeaders.SE_M_DRAGON_RAGE
      && (!audioStarts || (
        actual.se1.songHeader === probe.songHeaders.SE_M_DRAGON_RAGE
        && actual.se1.tracks[0]?.flags === 131
        && actual.se1.tracks[0]?.panX === fixture.soundPan
      ));
    const prior = byFrame.get(frame - 1);
    const transfers = !prior || (
      same(actual.hardwareOam, prior.softwareOam)
      && (
        same(actual.hardwarePalette, prior.fadedPalette)
        || same(actual.hardwarePalette, actual.fadedPalette)
      )
    );
    const receipts = actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.hardwareMatrices.every((matrix) => matrix.length === 4)
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.sprites.every((sprite) =>
        sprite.matrixNum >= 0 && sprite.matrixNum < 32
        && sprite.matrix.length === 4
      )
      && Object.keys(actual.registers).length === 8
      && actual.registers.bldcnt === 0
      && actual.registers.bldalpha === 0
      && actual.registers.bldy === 0;
    const seamShape = seam.active === expected.active
      && seam.assetLoaded === expected.assetLoaded
      && seam.scriptOffset === expected.scriptOffset
      && seam.visualTaskCount === expected.visualTaskCount
      && same(seam.sprites, expected.sprites)
      && seam.paletteTaskActive === expected.paletteTaskActive
      && seam.attackerPaletteY === expected.attackerPaletteY
      && seam.shakeTaskActive === expected.shakeTaskActive
      && seam.attackerX2 === expected.attackerX2
      && seam.attackerShakeDisplayAge === expected.attackerShakeDisplayAge
      && seam.attackerDisplayX2 === expected.attackerDisplayX2
      && same(seam.soundEvents, expected.soundEvents);

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
      software && source && palette && tags && audio && transfers
      && receipts && seamShape
    ) components += 1;
    else if (componentMismatches.length < 20) {
      componentMismatches.push(
        `frame ${frame}/age ${age}: software=${software} source=${source} `
        + `palette=${palette} tags=${tags} audio=${audio} `
        + `transfers=${transfers} receipts=${receipts} seam=${seamShape}`,
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
  for (const path of paths) verify(path);
}
