import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  SLEEP_TALK_FRAME_COUNT,
  SLEEP_TALK_LETTER_SPAWN_AGES,
  sleepTalkAtAge,
  type SleepTalkMatrix,
} from "../../src/animation/sleepTalk.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSleepTalkView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Window = { startFrame: number; endFrame: number; frameCount: number };
type Orientation = "player-back" | "opponent-front";
type Fixture = {
  schema: "sleep-talk-evidence/v1";
  orientation: Orientation;
  scenario: string;
  probe: string;
  sourceWindow: Window;
  sourceSymbols: Record<string, string>;
  lifecycleCounts: Record<string, number>;
  topology: unknown;
  display: {
    letterSpawnAges: readonly number[];
    letterLastAges: readonly number[];
    firstLetterData: readonly number[];
  };
  evidenceSha256: string;
  rawRgbSha256: string;
};

type Sprite = {
  slot: number;
  attr: number[];
  matrixNum: number;
  matrix: number[];
  data: number[];
  template: { symbol: string | null };
  callback: { symbol: string | null };
};
type Task = {
  slot: number;
  func: { symbol: string | null };
  data: number[];
};
type Track = { flags: number; panX: number; raw: string };
type SoundPlayer = {
  rawInfo: string;
  songHeader: number;
  status: number;
  tracks: Track[];
};
type Frame = {
  frame: number;
  sha256: string;
  gAnimScriptActive: number;
  scriptOffset: number | null;
  scriptWait: number;
  visualTaskCount: number;
  soundTaskCount: number;
  tasks: Task[];
  sprites: Sprite[];
  softwareOam: string[];
  hardwareOam: string[];
  hardwareMatrices: number[][];
  fadedPalette: number[];
  unfadedPalette: number[];
  hardwarePalette: number[];
  paletteTags: number[];
  tileTags: number[];
  registers: Record<string, number>;
  se1: SoundPlayer;
  se2: SoundPlayer;
};
type Probe = {
  schema: "sleep-talk-dense-evidence/v1";
  sourceWindow: Window;
  lifecycleCounts: Record<string, number>;
  topology: unknown;
  songHeaders: Record<string, number>;
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: sleepTalkPortable.ts <player fixture> <opponent fixture>");
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<Orientation, { evidence: string; raw: string }>();
const IDENTITY: readonly [number, number, number, number] = [256, 0, 0, 256];

function stageFor(orientation: Orientation) {
  const player = orientation === "player-back";
  const attacker: SceneOnPresentationBattler = {
    species: "SEAKING",
    geometry: player
      ? {
          side: "player",
          spriteCorner: { x: 40, y: 67 },
          animationCenter: { x: 72, y: 99 },
          battlePositionCenter: { x: 72, y: 80 },
        }
      : {
          side: "opponent",
          spriteCorner: { x: 144, y: 12 },
          animationCenter: { x: 176, y: 44 },
          battlePositionCenter: { x: 176, y: 40 },
        },
  };
  const target: SceneOnPresentationBattler = {
    species: "ONIX",
    geometry: player
      ? {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        }
      : {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
  };
  return createSceneOnMovePresentation({
    move: "SLEEP_TALK",
    attacker,
    target,
  });
}

function u16le(value: number): string {
  const n = value & 0xffff;
  return `${(n & 0xff).toString(16).padStart(2, "0")}${(n >> 8)
    .toString(16)
    .padStart(2, "0")}`;
}

function oamPrefix(attr: readonly [number, number, number]): string {
  return attr.map(u16le).join("");
}

function matrixArray(matrix: SleepTalkMatrix): readonly [number, number, number, number] {
  return [matrix.a, matrix.b, matrix.c, matrix.d];
}

function normalizedSprite(sprite: Sprite): unknown {
  return {
    slot: sprite.slot,
    attr: sprite.attr,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    data: sprite.data,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
  };
}

function expectedSprite(letter: ReturnType<typeof sleepTalkAtAge>["letters"][number]): unknown {
  return {
    slot: letter.slot,
    attr: letter.oam.attr,
    matrixNum: letter.matrixNum,
    matrix: matrixArray(letter.matrix),
    data: letter.data,
    template: letter.template,
    callback: letter.callback,
  };
}

function activeLetterRows(frame: Frame): Sprite[] {
  return frame.sprites.filter(
    (sprite) => sprite.template.symbol === "gLetterZSpriteTemplate",
  );
}

function sortedSymbols(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = createScratchDir("pokebench-sleep-talk-portable-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const fields = probe.frames.every((frame) =>
    frame.softwareOam.length === 128
    && frame.hardwareOam.length === 128
    && frame.hardwareMatrices.length === 32
    && frame.hardwareMatrices.every((matrix) => matrix.length === 4)
    && frame.fadedPalette.length === 512
    && frame.unfadedPalette.length === 512
    && frame.hardwarePalette.length === 512
    && frame.paletteTags.length === 16
    && frame.tileTags.length === 128
    && Object.keys(frame.registers).length === 8
    && Array.isArray(frame.tasks)
    && Array.isArray(frame.sprites)
    && frame.se1.tracks.length === 3
    && frame.se2.tracks.length === 3
  );
  const observedTopology = {
    tasks: sortedSymbols(probe.frames.flatMap((frame) =>
      frame.tasks
        .map((task) => task.func.symbol)
        .filter((symbol): symbol is string => symbol !== null)
        .filter((symbol) => symbol === "AnimTask_SwayMonStep"),
    )),
    callbacks: sortedSymbols(probe.frames.flatMap((frame) =>
      frame.sprites
        .map((sprite) => sprite.callback.symbol)
        .filter((symbol): symbol is string => symbol === "AnimLetterZ"),
    )),
    templates: sortedSymbols(probe.frames.flatMap((frame) =>
      frame.sprites
        .map((sprite) => sprite.template.symbol)
        .filter((symbol): symbol is string => symbol === "gLetterZSpriteTemplate"),
    )),
  };
  if (
    fixture.schema !== "sleep-talk-evidence/v1"
    || probe.schema !== "sleep-talk-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || !same(probe.lifecycleCounts, fixture.lifecycleCounts)
    || !same(observedTopology, {
      tasks: ["AnimTask_SwayMonStep"],
      callbacks: ["AnimLetterZ"],
      templates: ["gLetterZSpriteTemplate"],
    })
    || !same(observedTopology, fixture.topology)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== SLEEP_TALK_FRAME_COUNT[fixture.orientation === "player-back" ? "player" : "opponent"]
    || !fields
  ) {
    throw new Error(`${fixture.orientation}: immutable dense receipt changed`);
  }

  const stage = stageFor(fixture.orientation);
  const side = stage.config.attacker.geometry.side;
  const center = stage.config.attacker.geometry.animationCenter;
  const frameCount = SLEEP_TALK_FRAME_COUNT[side];
  const failures: string[] = [];
  const raw = createHash("sha256");
  const hardwareMatrices = Array.from({ length: 32 }, () => [...IDENTITY]);

  for (const [age, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    raw.update(rgb);
    const rawFrameMatch =
      createHash("sha256").update(rgb).digest("hex") === oracle.sha256;
    const component = sleepTalkAtAge(age, side, center);
    const seam = sceneOnSleepTalkView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    const seamMatch = same(seamState, component);
    const sourceSprites = activeLetterRows(oracle);
    const softwareSpritesMatch = same(
      component.letters.map(expectedSprite).sort((a, b) =>
        (a as { slot: number }).slot - (b as { slot: number }).slot,
      ),
      sourceSprites.map(normalizedSprite),
    );
    const expectedSoftwareOam = component.letters
      .map((letter) => oamPrefix(letter.oam.attr))
      .sort();
    const observedSoftwareOam = oracle.softwareOam
      .filter((entry) => expectedSoftwareOam.some((prefix) => entry.startsWith(prefix)))
      .map((entry) => entry.slice(0, 12))
      .sort();
    const softwareOamMatch = same(observedSoftwareOam, expectedSoftwareOam);
    const hardwareOamLagMatch = age === 0
      || same(oracle.hardwareOam, probe.frames[age - 1]!.softwareOam);
    const hardwareMatrixMatch = same(oracle.hardwareMatrices, hardwareMatrices);
    const perLetterHardwareMatch = component.letters.every((letter) => {
      const hardware = letter.hardwareOam;
      const oamMatch = hardware === null
        || oracle.hardwareOam.some((entry) => entry.startsWith(oamPrefix(hardware.attr)));
      const matrixMatch = same(
        oracle.hardwareMatrices[letter.matrixNum],
        matrixArray(letter.hardwareMatrix),
      );
      return oamMatch && matrixMatch;
    });
    const taskMatch = same(
      oracle.tasks.map((task) => ({
        slot: task.slot,
        callback: task.func.symbol,
        data: task.data,
      })),
      component.swayTask === null
        ? []
        : [{
            slot: component.swayTask.slot,
            callback: component.swayTask.callback,
            data: component.swayTask.data,
          }],
    );
    const registerMatch = same(oracle.registers, component.registers);
    const tileTagCount = oracle.tileTags.filter(
      (tag) => tag === component.assetTags.tileTagId,
    ).length;
    const paletteTagCount = oracle.paletteTags.filter(
      (tag) => tag === component.assetTags.paletteTagId,
    ).length;
    const tagsMatch = tileTagCount === (component.assetTags.tileLoaded ? 1 : 0)
      && paletteTagCount === (component.assetTags.paletteLoaded ? 1 : 0);
    const soundTracks = oracle.se1.tracks.filter((track) => (track.flags & 0x80) !== 0);
    const audioMatch = component.soundRestart === null
      || (
        oracle.se1.songHeader === probe.songHeaders.se_m_snore
        && soundTracks.length >= 1
        && soundTracks.every((track) => track.panX === component.soundPan)
      );
    const frameMatch =
      oracle.gAnimScriptActive === Number(component.gAnimScriptActive)
      && oracle.scriptOffset === component.scriptOffset
      && oracle.scriptWait === component.scriptWait
      && oracle.visualTaskCount === component.visualTaskCount
      && oracle.soundTaskCount === component.soundTaskCount
      && sourceSprites.every((sprite) => sprite.callback.symbol === "AnimLetterZ")
      && tagsMatch;
    const cleanup = age !== frameCount - 1
      || (!component.active
        && !oracle.gAnimScriptActive
        && oracle.visualTaskCount === 0);
    if (
      !rawFrameMatch || !seamMatch || !softwareSpritesMatch
      || !softwareOamMatch || !hardwareOamLagMatch || !hardwareMatrixMatch
      || !perLetterHardwareMatch || !taskMatch || !registerMatch
      || !audioMatch || !frameMatch || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: raw=${rawFrameMatch} `
        + `seam=${seamMatch} sprites=${softwareSpritesMatch} `
        + `softwareOam=${softwareOamMatch} hardwareOam=${hardwareOamLagMatch} `
        + `matrix=${hardwareMatrixMatch && perLetterHardwareMatch} `
        + `task=${taskMatch} registers=${registerMatch} audio=${audioMatch} `
        + `frame=${frameMatch} cleanup=${cleanup}`,
      );
    }

    const nextMatrices = Array.from({ length: 32 }, () => [...IDENTITY]);
    for (const letter of component.letters) {
      nextMatrices[letter.matrixNum] = matrixArray(letter.matrix);
    }
    for (const [index, matrix] of nextMatrices.entries()) {
      hardwareMatrices[index] = matrix;
    }
  }

  const rawDigest = raw.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    failures.push(`raw RGB receipt digest ${rawDigest} changed`);
  }
  const observedLastAges = SLEEP_TALK_LETTER_SPAWN_AGES.map((spawnAge, index) => {
    let last = -1;
    for (let age = 0; age < frameCount; age++) {
      if (sleepTalkAtAge(age, side, center).letters.some((letter) => letter.index === index)) {
        last = age;
      }
    }
    return last;
  });
  const lifecycleMatch =
    same(fixture.display.letterSpawnAges, SLEEP_TALK_LETTER_SPAWN_AGES)
    && same(fixture.display.letterLastAges, observedLastAges)
    && same(
      fixture.display.firstLetterData,
      sleepTalkAtAge(26, side, center).letters[0]!.data.slice(0, 5),
    );
  if (!lifecycleMatch) failures.push("fixture lifecycle display fields diverged");
  if (failures.length) throw new Error(failures.slice(0, 110).join("\n"));

  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw: rawDigest })) {
    throw new Error(`${fixture.orientation}: fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw: rawDigest });
  console.log(
    `${fixture.orientation} run ${runNumber}: ${probe.frames.length}/${frameCount} `
    + "source/hardware/seam/raw-RGB exact (no framebuffer claim)",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
