import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  THUNDER_WAVE_FRAME_COUNT,
  thunderWaveAtAge,
} from "../../src/animation/thunderWave.ts";
import {
  createSceneOnMovePresentation,
  sceneOnThunderWaveView,
  type SceneOnThunderWaveConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceAnimationWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
}
interface Identity { readonly address: number; readonly symbol?: string }
interface Matrix { readonly a: number; readonly b: number; readonly c: number; readonly d: number }
interface Sprite {
  readonly slot: number; readonly raw: string;
  readonly template: Identity; readonly callback: Identity;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly subpriority: number; readonly matrixNum: number;
  readonly matrix: Matrix; readonly data: readonly number[];
}
interface Task {
  readonly func: Identity;
  readonly data: readonly number[];
}
interface SoundPlayer {
  readonly songHeader: number;
  readonly status: number;
  readonly rawInfo: string;
  readonly tracks: readonly {
    readonly flags: number; readonly panX: number; readonly raw: string;
  }[];
}
interface Frame {
  readonly frame: number; readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly battleAnimScriptOffset: number | null;
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly tasks: readonly Task[]; readonly sprites: readonly Sprite[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly Matrix[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: SoundPlayer; readonly se2: SoundPlayer;
}
interface Probe {
  readonly schema: string;
  readonly sourceAnimationWindow: Fixture["sourceAnimationWindow"];
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: thunderWavePortable.ts <player-fixture> <opponent-fixture>",
  );
}
const digests = new Map<string, string>();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function bgr555TowardBlack(color: number, coefficient: number): number {
  const blend = (channel: number) =>
    channel + ((-channel * coefficient) >> 4);
  return blend(color & 0x1f)
    | (blend((color >>> 5) & 0x1f) << 5)
    | (blend((color >>> 10) & 0x1f) << 10);
}

function oamTriple(raw: string): readonly number[] {
  const u16 = (offset: number) =>
    Number.parseInt(raw.slice(offset + 2, offset + 4) + raw.slice(offset, offset + 2), 16);
  return [u16(0), u16(4), u16(8)];
}

function configFor(playerToOpponent: boolean): SceneOnThunderWaveConfig {
  return {
    move: "THUNDER_WAVE",
    attacker: {
      species: "FLAAFFY",
      geometry: playerToOpponent
        ? {
            side: "player",
            spriteCorner: { x: 40, y: 57 },
            animationCenter: { x: 72, y: 89 },
            battlePositionCenter: { x: 72, y: 80 },
          }
        : {
            side: "opponent",
            spriteCorner: { x: 144, y: 18 },
            animationCenter: { x: 176, y: 50 },
            battlePositionCenter: { x: 176, y: 40 },
          },
    },
    target: {
      species: "SHUCKLE",
      geometry: playerToOpponent
        ? {
            side: "opponent",
            spriteCorner: { x: 144, y: 17 },
            animationCenter: { x: 176, y: 49 },
            battlePositionCenter: { x: 176, y: 40 },
          }
        : {
            side: "player",
            spriteCorner: { x: 40, y: 59 },
            animationCenter: { x: 72, y: 91 },
            battlePositionCenter: { x: 72, y: 80 },
          },
    },
    targetEffectCenter: playerToOpponent
      ? { x: 176, y: 49 }
      : { x: 72, y: 99 },
    fieldProfile: playerToOpponent
      ? {
          playerHp: 145, playerMaxHp: 145,
          opponentHp: 127, opponentMaxHp: 127,
          playerGender: "male", opponentGender: "male",
        }
      : {
          playerHp: 127, playerMaxHp: 127,
          opponentHp: 145, opponentMaxHp: 145,
          playerGender: "male", opponentGender: "male",
        },
  };
}

function runFixture(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-thunder-wave-proof-");
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

  const outputBytes = readFileSync(output);
  const probe = JSON.parse(outputBytes.toString()) as Probe;
  if (probe.schema !== "thunder-wave-dense-evidence/v3") {
    throw new Error(`${fixture.orientation}: unexpected ${probe.schema}`);
  }
  if (!same(probe.sourceAnimationWindow, fixture.sourceAnimationWindow)
    || probe.sourceAnimationWindow.frameCount !== THUNDER_WAVE_FRAME_COUNT) {
    throw new Error(`${fixture.orientation}: source window changed`);
  }
  const digest = createHash("sha256").update(outputBytes).digest("hex");
  const previousDigest = digests.get(fixture.orientation);
  if (previousDigest !== undefined && previousDigest !== digest) {
    throw new Error(
      `${fixture.orientation}: fresh output changed ${previousDigest} -> ${digest}`,
    );
  }
  digests.set(fixture.orientation, digest);

  const playerToOpponent = fixture.orientation.startsWith("player-back");
  const config = configFor(playerToOpponent);
  const stage = createSceneOnMovePresentation(config);
  const allFrames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const start = fixture.sourceAnimationWindow.startFrame;
  const failures: string[] = [];
  let framebufferMatches = 0;

  for (let age = 0; age < THUNDER_WAVE_FRAME_COUNT; age += 1) {
    const frameNumber = start + age;
    const row = allFrames.get(frameNumber);
    if (!row) throw new Error(`${fixture.orientation}: omitted frame ${frameNumber}`);
    const expected = thunderWaveAtAge(
      age,
      config.attacker.geometry.side,
      config.targetEffectCenter,
      config.target.geometry.battlePositionCenter,
    );
    const seam = sceneOnThunderWaveView({ ...stage, age });
    const seamMatch = same({
      ...seam, age: undefined, attacker: undefined, target: undefined,
    }, expected);

    const actualBolts = row.sprites.filter(
      (sprite) => sprite.template.symbol === "gElectricBoltSegmentSpriteTemplate",
    );
    const actualBands = row.sprites.filter(
      (sprite) => sprite.template.symbol === "gThunderWaveSpriteTemplate",
    );
    const bolts = expected.bolts.every((bolt) =>
      actualBolts.some((actual) =>
        actual.slot === bolt.slot && actual.x === bolt.x && actual.y === bolt.y
        && actual.data[1] === bolt.localAge + 1
      )
    ) && actualBolts.length === expected.bolts.length;
    const bands = expected.bands.every((band) =>
      actualBands.some((actual) =>
        actual.slot === band.slot && actual.x === band.x && actual.y === band.y
        && actual.data[1] === band.localAge + 1
        && Boolean(Number.parseInt(actual.raw.slice(124, 126), 16) & 4)
          === band.hidden
      )
    ) && actualBands.length === expected.bands.length;
    const assets =
      row.paletteTags.includes(10001) === expected.assets.spark
      && row.paletteTags.includes(10011) === expected.assets.spark2
      && row.paletteTags.includes(10173) === expected.assets.sparkH;
    const tasks = row.visualTaskCount === expected.visualTaskCount
      && row.tasks.filter((task) =>
        task.func.symbol === "AnimTask_ElectricBolt_Step"
      ).length === Number(age >= 28 && age <= 37);

    const prior = allFrames.get(frameNumber - 1);
    const hardwareTriples = row.hardwareOam.map(oamTriple);
    const priorEffects = prior?.sprites.filter((sprite) =>
      (sprite.template.symbol === "gElectricBoltSegmentSpriteTemplate"
        && sprite.data[1] !== 1)
      || sprite.template.symbol === "gThunderWaveSpriteTemplate"
    ) ?? [];
    const effectHardware = priorEffects.every((sprite) => {
      const hidden = Boolean(Number.parseInt(sprite.raw.slice(124, 126), 16) & 4);
      const found = hardwareTriples.some((triple) =>
        same(triple, [sprite.attr0, sprite.attr1, sprite.attr2])
      );
      return hidden ? !found : found;
    });
    const priorBattlers = prior?.sprites.filter((sprite) =>
      sprite.template.symbol === "gMultiuseSpriteTemplate"
    ) ?? [];
    const battlerHardware = priorBattlers.every((sprite) =>
      hardwareTriples.some((triple) =>
        same(triple, [sprite.attr0, sprite.attr1, sprite.attr2])
      )
      && same(row.hardwareMatrices[sprite.matrixNum], sprite.matrix)
    );
    const paletteTransfer = age === 0 || row.hardwarePalette.every(
      (color, index) =>
        color === row.fadedPalette[index]
        || color === prior!.fadedPalette[index],
    );
    const palette = row.fadedPalette.slice(16, 64).every(
      (color, offset) => color === bgr555TowardBlack(
        row.unfadedPalette[16 + offset]!,
        expected.backgroundPaletteY,
      ),
    );
    const registers = same(row.registers, {
      dispcnt: 0xBF40,
      bg0cnt: 0x9800,
      bg1cnt: 0x9C00,
      bg2cnt: 0x5E00,
      bg3cnt: 0x5A0B,
      winin: 0x3F3F,
      winout: 0x3F3F,
      mosaic: 0,
      bldcnt: 0,
      bldalpha: 0,
      bldy: 0,
    });
    const expectedHeader = expected.soundRestart === null
      ? null : probe.songHeaders[expected.soundRestart];
    const audio = expectedHeader === null || (
      row.se1.songHeader === expectedHeader
      && row.se1.status === 0
      && row.se1.tracks.slice(0, 2).every(
        (track) => track.flags === 131 && track.panX === expected.soundPan,
      )
      && row.se2.songHeader !== expectedHeader
    );
    const raw = readFileSync(
      join(rgbDir, `${String(frameNumber).padStart(5, "0")}.rgb`),
    );
    const rawDigest =
      createHash("sha256").update(raw).digest("hex") === row.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let framebufferDiff = 0;
    const samples: string[] = [];
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        framebufferDiff += 1;
        if (samples.length < 4) {
          samples.push(
            `${pixel % 240},${Math.floor(pixel / 240)}:`
            + `${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
            + `!=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`,
          );
        }
      }
    }
    if (framebufferDiff === 0) framebufferMatches += 1;
    const active = Boolean(row.gAnimScriptActive) === expected.active
      && (age < 119
        ? row.battleAnimScriptOffset !== null
        : row.battleAnimScriptOffset === 110);
    if (!(seamMatch && bolts && bands && assets && tasks && effectHardware
      && battlerHardware && paletteTransfer && palette && registers && audio
      && rawDigest && active && framebufferDiff === 0)) {
      failures.push(
        `frame ${frameNumber}/age ${age}: seam=${seamMatch} bolts=${bolts}`
        + ` bands=${bands} assets=${assets} tasks=${tasks}`
        + ` effectHw=${effectHardware} battlerHw=${battlerHardware}`
        + ` transfer=${paletteTransfer} palette=${palette} regs=${registers}`
        + ` audio=${audio} raw=${rawDigest} active=${active}`
        + ` framebufferDiff=${framebufferDiff} ${samples.join(";")}`,
      );
    }
  }
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${THUNDER_WAVE_FRAME_COUNT - failures.length}/${THUNDER_WAVE_FRAME_COUNT}; `
    + `framebuffer ${framebufferMatches}/${THUNDER_WAVE_FRAME_COUNT}; `
    + `digest ${digest}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of fixturePaths) runFixture(fixturePath, run);
}
