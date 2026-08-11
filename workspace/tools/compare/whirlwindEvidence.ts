import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  whirlwindAtAge,
  whirlwindDisplayedTargetOffsetAtAge,
} from "../../src/animation/whirlwind.ts";
import {
  createSceneOnMovePresentation,
  sceneOnWhirlwindView,
  type SceneOnPresentationBattler,
  type SceneOnWhirlwindConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: SceneOnWhirlwindConfig["fieldProfile"];
  readonly battleState: Readonly<{
    player: BattlerState;
    opponent: BattlerState;
  }>;
}

interface BattlerState {
  readonly species: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly item: number;
}

interface Sprite {
  readonly slot: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: readonly number[];
  readonly data: readonly number[];
}

interface Task {
  readonly func: Readonly<{ symbol: string | null }>;
}

interface SoundPlayer {
  readonly songHeader: number;
  readonly status: number;
  readonly tracks: readonly Readonly<{ flags: number; panX: number }>[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: boolean;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly whirlwindSprites: readonly Sprite[];
  readonly battlers: readonly Sprite[];
  readonly tasks: readonly Task[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly softwareOam: readonly string[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly se1: SoundPlayer;
  readonly se2: SoundPlayer;
  readonly registers: Readonly<{
    dispcnt: number;
    bldcnt: number;
    bldalpha: number;
    bldy: number;
  }>;
  readonly battlerState: Readonly<{
    player: BattlerState;
    opponent: BattlerState;
  }>;
}

interface Probe {
  readonly schema: string;
  readonly move: number;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly lifecycleCounts: Readonly<{ gWhirlwindLineSpriteTemplate: number }>;
  readonly songHeaders: Readonly<{
    SE_M_DOUBLE_TEAM: number;
    SE_M_STRING_SHOT: number;
  }>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: whirlwindEvidence.ts <player-fixture> <opponent-fixture>",
  );
}
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function compareFramebuffer(app: Uint8ClampedArray, raw: Buffer): number {
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]
    ) {
      count += 1;
    }
  }
  return count;
}

function oamU16(bytes: readonly number[], offset: number): number {
  return bytes[offset]! | bytes[offset + 1]! << 8;
}

function hardwareContainsSprite(
  hardware: readonly (readonly number[])[],
  sprite: Sprite,
): boolean {
  return hardware.some((item) =>
    oamU16(item, 0) === sprite.attr0
    && oamU16(item, 2) === sprite.attr1
    && oamU16(item, 4) === sprite.attr2
  );
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  if (
    fixture.schema !== "whirlwind-portable-evidence/v2"
    || fixture.oracleProfile !== "battle-scene-on"
  ) {
    throw new Error(`${fixture.orientation}: invalid fixture contract`);
  }
  const scratch = createScratchDir("pokebench-whirlwind-evidence-");
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

  const outputBytes = readFileSync(output);
  const probe = JSON.parse(outputBytes.toString()) as Probe;
  if (
    probe.schema !== "whirlwind-dense-evidence/v2"
    || probe.move !== 18
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.lifecycleCounts.gWhirlwindLineSpriteTemplate !== 6
  ) {
    throw new Error(`${fixture.orientation}: unexpected probe contract`);
  }
  const evidenceDigest = createHash("sha256").update(outputBytes).digest("hex");
  if (evidenceDigest !== fixture.evidenceSha256) {
    throw new Error(
      `${fixture.orientation}: evidence digest ${evidenceDigest} `
      + `!= pinned ${fixture.evidenceSha256}`,
    );
  }
  if (
    evidenceDigests.has(fixture.orientation)
    && evidenceDigests.get(fixture.orientation) !== evidenceDigest
  ) {
    throw new Error(`${fixture.orientation}: fresh evidence changed`);
  }
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const config: SceneOnWhirlwindConfig = {
    move: "WHIRLWIND",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  };
  const stage = createSceneOnMovePresentation(config);
  const playerToOpponent = fixture.attacker.geometry.side === "player";
  const targetIndex = playerToOpponent ? 1 : 0;
  const firstLines = frames.get(fixture.sourceWindow.startFrame + 4)
    ?.whirlwindSprites;
  if (!firstLines?.length) {
    throw new Error(`${fixture.orientation}: missing first line group`);
  }
  const lineBaseTile = Math.min(
    ...firstLines.map((sprite) => sprite.attr2 & 0x3ff),
  );
  const rawHash = createHash("sha256");
  const errors: string[] = [];
  let matched = 0;
  let framebufferMatched = 0;

  for (
    let frame = fixture.sourceWindow.startFrame;
    frame <= fixture.sourceWindow.endFrame;
    frame += 1
  ) {
    const age = frame - fixture.sourceWindow.startFrame;
    const actual = frames.get(frame);
    if (!actual) throw new Error(`${fixture.orientation}: omitted frame ${frame}`);
    const expected = whirlwindAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.target.geometry.side,
      fixture.target.geometry.battlePositionCenter,
    );
    const view = sceneOnWhirlwindView({ ...stage, age });
    const target = actual.battlers[targetIndex]!;
    const baseline = playerToOpponent && age < 11 ? 1 : 0;
    const lines = [...actual.whirlwindSprites].sort(
      (left, right) => left.y - right.y,
    );
    const expectedLines = [...expected.lines].sort(
      (left, right) => left.y - right.y,
    );
    const lineState = lines.length === expectedLines.length
      && lines.every((sprite, index) => {
        const line = expectedLines[index]!;
        return sprite.x === line.x
          && sprite.y === line.y
          && sprite.x2 === line.x2
          && sprite.y2 === 0
          && sprite.data[0] === line.data0
          && sprite.data[7] === line.remaining
          && ((sprite.attr2 & 0x3ff) - lineBaseTile) / 8 === line.sheetFrame
          && Boolean(sprite.attr1 & 0x1000) === line.hFlip;
      });
    const taskNames = actual.tasks.map((task) => task.func.symbol);
    const sourceTasks =
      taskNames.includes("AnimTask_ShakeMon2_Step")
        === (age >= 11 && age <= 38)
      && taskNames.includes("AnimTask_TranslateMonElliptical_Step")
        === (age >= 42 && age <= 47)
      && taskNames.includes("AnimTask_SlideOffScreen_Step")
        === (
          age >= 51
          && age <= (fixture.target.geometry.side === "player" ? 63 : 62)
        );
    const tagLoaded = actual.paletteTags.includes(10162)
      && actual.tileTags.includes(10162);
    const prior = frames.get(frame - 1);
    const hardwareOam = prior === undefined
      || prior.whirlwindSprites.every((sprite) =>
        hardwareContainsSprite(actual.hardwareOam, sprite)
      );
    const hardwarePalette = prior === undefined
      || same(actual.hardwarePalette, prior.fadedPalette);
    const receiptShapes =
      actual.softwareOam.length === 128
      && actual.hardwareOam.length === 128
      && actual.hardwareMatrices.length === 32
      && actual.fadedPalette.length === 512
      && actual.unfadedPalette.length === 512
      && actual.hardwarePalette.length === 512
      && actual.paletteTags.length === 16
      && actual.tileTags.length === 128;
    const sound = expected.sound === null || (
      actual.se1.songHeader === probe.songHeaders[expected.sound.id]
      && actual.se1.tracks[0]?.panX === expected.sound.pan
      && actual.se2.songHeader !== probe.songHeaders[expected.sound.id]
    );
    const raw = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    rawHash.update(raw);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const framebufferDiff = compareFramebuffer(render(engine), raw);
    if (framebufferDiff === 0) framebufferMatched += 1;
    const displayedOffset = whirlwindDisplayedTargetOffsetAtAge(
      age,
      fixture.attacker.geometry.side,
      fixture.target.geometry.side,
      playerToOpponent ? { x2: 1, y2: 0 } : { x2: 0, y2: 0 },
    );
    const targetHardware = actual.hardwareOam.some((item) =>
      oamU16(item, 4) === target.attr2
      && (oamU16(item, 2) & 0x1ff)
        === ((
          fixture.target.geometry.spriteCorner.x + displayedOffset.x2
        ) & 0x1ff)
      && (oamU16(item, 0) & 0xff)
        === ((
          fixture.target.geometry.spriteCorner.y + displayedOffset.y2
        ) & 0xff)
    );

    const ok =
      lineState
      && target.x2 === expected.targetOffset.x2 + baseline
      && target.y2 === expected.targetOffset.y2
      && sourceTasks
      && tagLoaded === expected.linesLoaded
      && actual.gAnimScriptActive === expected.active
      && same(view.lines, expected.lines)
      && same(view.targetOffset, expected.targetOffset)
      && hardwareOam
      && targetHardware
      && hardwarePalette
      && receiptShapes
      && sound
      && actual.battleAnimAttacker === (playerToOpponent ? 0 : 1)
      && actual.battleAnimTarget === (playerToOpponent ? 1 : 0)
      && same(actual.battlerState.player, {
        ...actual.battlerState.player,
        ...fixture.battleState.player,
      })
      && same(actual.battlerState.opponent, {
        ...actual.battlerState.opponent,
        ...fixture.battleState.opponent,
      })
      && actual.registers.dispcnt === 0xBF40
      && actual.registers.bldcnt === 0
      && actual.registers.bldalpha === 0
      && actual.registers.bldy === 0
      && createHash("sha256").update(raw).digest("hex") === actual.sha256
      && framebufferDiff === 0;
    if (ok) matched += 1;
    else {
      errors.push(
        `frame ${frame}/age ${age}: line=${lineState} tasks=${sourceTasks} `
        + `oam=${hardwareOam}/${targetHardware} `
        + `palette=${hardwarePalette} audio=${sound} `
        + `framebufferDiff=${framebufferDiff}`,
      );
    }
  }

  const rawDigest = rawHash.digest("hex");
  if (rawDigest !== fixture.rawRgbSha256) {
    throw new Error(`${fixture.orientation}: raw RGB digest ${rawDigest} changed`);
  }
  if (
    rawDigests.has(fixture.orientation)
    && rawDigests.get(fixture.orientation) !== rawDigest
  ) {
    throw new Error(`${fixture.orientation}: fresh raw RGB changed`);
  }
  rawDigests.set(fixture.orientation, rawDigest);
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${matched}/${fixture.sourceWindow.frameCount}; `
    + `framebuffer ${framebufferMatched}/${fixture.sourceWindow.frameCount}; `
    + `evidence ${evidenceDigest}; raw ${rawDigest}`,
  );
  if (errors.length) {
    console.error(errors.slice(0, 24).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, run);
}
