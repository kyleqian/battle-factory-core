// Fresh complete reducer/seam/source-state/OAM/audio/RGB/framebuffer proof for
// MOVE_FURY_SWIPES. The verifier intentionally regenerates both legal staged
// orientations twice; no checked-in capture is used as an oracle substitute.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  FURY_SWIPES_FIRST_LUNGE_AGE,
  FURY_SWIPES_FIRST_SWIPE_AGE,
  FURY_SWIPES_SECOND_LUNGE_AGE,
  FURY_SWIPES_SECOND_SWIPE_AGE,
  furySwipesAtAge,
} from "../../src/animation/furySwipes.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFurySwipesView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly move: "FURY_SWIPES";
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: unknown;
  readonly target: unknown;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender: "male" | "female";
    readonly opponentGender: "male" | "female";
  };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly normalizedMapSha256: string;
}

interface Sprite {
  readonly slot: number;
  readonly template: number;
  readonly callback: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly matrixNum: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
  readonly data: readonly number[];
}

interface Task {
  readonly slot: number;
  readonly func: number;
  readonly data: readonly number[];
}

interface BattlerSnapshot {
  readonly species: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly stats: unknown;
  readonly moves: readonly number[];
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly player: BattlerSnapshot;
  readonly opponent: BattlerSnapshot;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly playerPersonality: number;
  readonly opponentPersonality: number;
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly Task[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly pan: number; readonly panX: number }[];
  };
  readonly dispcnt: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: number;
}

interface Probe {
  readonly schema: string;
  readonly setup: unknown;
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: furySwipesPortable.ts <player-fixture> <opponent-fixture>");
}

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function rawDigest(frames: readonly Frame[], rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of frames) {
    hash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  return hash.digest("hex");
}

function normalizedChangeMap(
  frames: ReadonlyMap<number, Frame>,
  rgbDir: string,
  start: number,
  end: number,
): string {
  const lines = [
    `# normalized Scene-ON MOVE_FURY_SWIPES window ${start}..${end} (${end - start + 1} frames)`,
    "age  oracleFrame  changedPx  bbox(minx,miny-maxx,maxy)",
  ];
  let previous: Buffer | null = null;
  for (let frame = start; frame <= end; frame += 1) {
    if (!frames.has(frame)) throw new Error(`missing RGB frame ${frame}`);
    const current = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    if (previous === null) {
      lines.push(`${String(frame - start).padStart(2, "0")}  ${frame}  (first frame)`);
    } else if (!current.equals(previous)) {
      let changed = 0;
      let minX = 240;
      let minY = 160;
      let maxX = -1;
      let maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 3;
        if (current[offset] === previous[offset]
          && current[offset + 1] === previous[offset + 1]
          && current[offset + 2] === previous[offset + 2]) continue;
        changed += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      lines.push(
        `${String(frame - start).padStart(2, "0")}  ${frame}  ${changed}  ${minX},${minY}-${maxX},${maxY}`,
      );
    }
    previous = current;
  }
  return `${lines.join("\n")}\n`;
}

function spriteKeys(sprites: readonly Sprite[], furyTemplate: number): string[] {
  return sprites
    .filter((sprite) => sprite.template === furyTemplate)
    .map((sprite) => {
      const animation = (sprite.attr1 & 0x1000) !== 0 ? 1 : 0;
      const frame = ((sprite.attr2 & 0x3ff) - 537) / 16;
      if (!Number.isInteger(frame)) throw new Error(`unexpected SWIPE tile ${sprite.attr2}`);
      return `${sprite.x},${sprite.y},${animation},${frame}`;
    })
    .sort();
}

function hardwareOamMatches(prior: Frame, current: Frame): boolean {
  const objects = [prior.playerSprite, prior.opponentSprite, ...prior.sprites]
    .filter((sprite) => !sprite.invisible);
  return objects.every((sprite) => current.hardwareOam.some((oam) =>
    same(oam, [sprite.attr0, sprite.attr1, sprite.attr2])));
}

function hardwareMatricesMatch(prior: Frame, current: Frame): boolean {
  if (current.hardwareMatrices.length !== 32
    || current.hardwareMatrices.some((matrix) => matrix.length !== 4)) return false;
  const affine = [prior.playerSprite, prior.opponentSprite, ...prior.sprites]
    .filter((sprite) => (sprite.attr0 & 0x300) !== 0);
  return affine.every((sprite) => same(
    current.hardwareMatrices[sprite.matrixNum],
    [sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d],
  ));
}

function hardwarePaletteMatches(prior: Frame, current: Frame): boolean {
  if (current.hardwarePalette.length !== 512
    || prior.fadedPalette.length !== 512
    || prior.unfadedPalette.length !== 512) return false;
  const objects = [prior.playerSprite, prior.opponentSprite, ...prior.sprites]
    .filter((sprite) => !sprite.invisible);
  return objects.every((sprite) => {
    const bank = (sprite.attr2 >>> 12) & 0xf;
    const start = 256 + bank * 16;
    return current.hardwarePalette.slice(start, start + 16).every(
      (color, index) => color === prior.fadedPalette[start + index],
    );
  });
}

function runFixture(fixturePath: string, runNumber: number): {
  readonly evidence: string;
  readonly raw: string;
  readonly map: string;
} {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  if (fixture.schema !== "scene-on-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || fixture.move !== "FURY_SWIPES") {
    throw new Error(`${fixturePath}: invalid Scene-ON Fury Swipes fixture`);
  }
  const scratch = createScratchDir("pokebench-fury-swipes-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const pythonPath = join(vendor, "libmgba-py");
  const proc = spawnSync(
    "python3",
    [
      join(root, "tools/run-mgba-probe.py"),
      output,
      "--",
      join(vendor, "mgba-venv/bin/python3"),
      resolve(root, fixture.probe),
      resolve(root, fixture.scenario),
      output,
      rgbDir,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: [pythonPath, process.env.PYTHONPATH].filter(Boolean).join(":"),
      },
    },
  );
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);

  const evidenceBytes = readFileSync(output);
  const probe = JSON.parse(evidenceBytes.toString("utf8")) as Probe;
  const evidence = sha256(evidenceBytes);
  const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
  const start = fixture.denseWindow.startFrame;
  const end = fixture.denseWindow.endFrame;
  const count = end - start + 1;
  if (count !== fixture.denseWindow.frameCount || count !== 48) {
    throw new Error(`${fixturePath}: expected 48-frame pointer-bounded window`);
  }
  if (probe.schema !== fixture.evidenceSchema) throw new Error(`${fixturePath}: schema drift`);
  if (evidence !== fixture.evidenceSha256) throw new Error(`${fixturePath}: evidence ${evidence}`);
  const raw = rawDigest(probe.frames, rgbDir);
  if (raw !== fixture.rawRgbSha256) throw new Error(`${fixturePath}: raw RGB ${raw}`);
  const mapText = normalizedChangeMap(frames, rgbDir, start, end);
  const map = sha256(Buffer.from(mapText));
  if (map !== fixture.normalizedMapSha256) throw new Error(`${fixturePath}: normalized map ${map}`);

  const stage = createSceneOnMovePresentation({
    move: "FURY_SWIPES",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  } as never);
  const playerToOpponent = fixture.orientation === "player-to-opponent";
  const failures: string[] = [];
  const first = frames.get(start);
  if (!first) throw new Error(`${fixturePath}: missing first dense frame`);
  const immutable = JSON.stringify({
    player: first.player,
    opponent: first.opponent,
    playerPersonality: first.playerPersonality,
    opponentPersonality: first.opponentPersonality,
  });

  for (let age = 0; age < count; age += 1) {
    const frameNumber = start + age;
    const row = frames.get(frameNumber);
    const prior = frames.get(frameNumber - 1);
    if (!row || !prior) throw new Error(`${fixturePath}: missing age ${age} or transfer row`);
    const expected = furySwipesAtAge(age, {
      attackerSide: playerToOpponent ? "player" : "opponent",
      targetSide: playerToOpponent ? "opponent" : "player",
      targetCenter: playerToOpponent ? { x: 176, y: 42 } : { x: 72, y: 88 },
    });
    const seam = sceneOnFurySwipesView({ ...stage, age } as never);
    const seamMatch = same(
      {
        attackerX2: seam.attackerX2,
        targetX2: seam.targetX2,
        swipes: seam.swipes,
        sound: seam.sound,
        active: seam.active,
      },
      expected,
    );
    const attacker = playerToOpponent ? row.playerSprite : row.opponentSprite;
    const target = playerToOpponent ? row.opponentSprite : row.playerSprite;
    const targetSlot = target.slot;
    const targetBaseline = playerToOpponent && age < FURY_SWIPES_FIRST_SWIPE_AGE ? 1 : 0;
    const sourceBattlers = attacker.x2 === expected.attackerX2
      && attacker.y2 === 0
      && target.x2 === expected.targetX2 + targetBaseline
      && target.y2 === 0;
    const sourceBattleState = JSON.stringify({
      player: row.player,
      opponent: row.opponent,
      playerPersonality: row.playerPersonality,
      opponentPersonality: row.opponentPersonality,
    }) === immutable;
    const lungeExpected = (age >= FURY_SWIPES_FIRST_LUNGE_AGE && age <= 16)
      || (age >= FURY_SWIPES_SECOND_LUNGE_AGE && age <= 34);
    const lunges = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gHorizontalLungeSpriteTemplate);
    const lungeExpectedSubpriorities = [
      age >= FURY_SWIPES_FIRST_LUNGE_AGE && age <= 16
        ? (playerToOpponent ? 28 : 38) : null,
      age >= FURY_SWIPES_SECOND_LUNGE_AGE && age <= 34
        ? (playerToOpponent ? 38 : 28) : null,
    ].filter((value): value is number => value !== null);
    const lungeShape = lunges.length === lungeExpectedSubpriorities.length
      && lunges.every((sprite, index) =>
        sprite.invisible
        && sprite.callback !== 0
        && sprite.subpriority === lungeExpectedSubpriorities[index]
        && sprite.data.length === 8,
      )
      && lunges.length === Number(lungeExpected);
    const fury = row.sprites.filter((sprite) =>
      sprite.template === probe.templates.gFurySwipesSpriteTemplate);
    const swipeShape = same(spriteKeys(fury, probe.templates.gFurySwipesSpriteTemplate),
      expected.swipes.map((swipe) =>
        `${swipe.x},${swipe.y},${swipe.animation},${swipe.animationFrame}`).sort())
      && fury.every((sprite) => {
        const hFlip = (sprite.attr1 & 0x1000) !== 0;
        const expectedHFlip = expected.swipes.some((swipe) =>
          swipe.x === sprite.x && swipe.y === sprite.y && swipe.animation === 1,
        );
        return sprite.callback !== 0
          && sprite.subpriority === (playerToOpponent ? 38 : 28)
          && hFlip === expectedHFlip
          && sprite.matrix.a === 256 && sprite.matrix.b === 0
          && sprite.matrix.c === 0 && sprite.matrix.d === 256;
      });
    const firstTask = age >= FURY_SWIPES_FIRST_SWIPE_AGE && age <= 17;
    const secondTask = age >= FURY_SWIPES_SECOND_SWIPE_AGE && age <= 39;
    const tasks = row.tasks.filter((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step);
    const taskShape = tasks.length === Number(firstTask || secondTask)
      && tasks.every((task) => {
        const local = firstTask ? age - FURY_SWIPES_FIRST_SWIPE_AGE
          : age - FURY_SWIPES_SECOND_SWIPE_AGE;
        const numTimes = firstTask ? 5 : 7;
        const offset = firstTask ? 3 : 4;
        return task.data[0] === targetSlot
          && task.data[1] === numTimes - 1 - Math.floor(local / 2)
          && task.data[2] === 1
          && task.data[3] === (local % 2 === 0 ? 1 : 0)
          && task.data[4] === offset
          && task.data[5] === 0;
      });
    const counts = row.visualTaskCount === row.sprites.length + row.tasks.length
      && row.soundTaskCount === 0;
    const sound = (age !== FURY_SWIPES_FIRST_SWIPE_AGE
      && age !== FURY_SWIPES_SECOND_SWIPE_AGE)
      || (row.se1.songHeader === probe.songHeaders.SE_M_SCRATCH
        && row.se1.status === 0
        && row.se1.tracks[0]?.flags === 131
        && row.se1.tracks[0]?.panX === (playerToOpponent ? 63 : -63));
    const registers = (row.dispcnt & 0x1f00) !== 0
      && row.bldcnt === 0 && row.bldalpha === 0 && row.bldy === 0;
    const palettes = row.fadedPalette.length === 512
      && row.unfadedPalette.length === 512
      && hardwarePaletteMatches(prior, row);
    const oam = hardwareOamMatches(prior, row);
    const matrices = hardwareMatricesMatch(prior, row);
    const raw = readFileSync(join(rgbDir, `${String(frameNumber).padStart(5, "0")}.rgb`));
    const rawExact = sha256(raw) === row.sha256;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let framebufferDiff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const appOffset = pixel * 4;
      const rawOffset = pixel * 3;
      if (app[appOffset] !== raw[rawOffset]
        || app[appOffset + 1] !== raw[rawOffset + 1]
        || app[appOffset + 2] !== raw[rawOffset + 2]) framebufferDiff += 1;
    }
    const framebuffer = framebufferDiff === 0;
    const scriptBoundary = age < count - 1
      ? row.animScriptActive
      : !row.animScriptActive;
    const ok = seamMatch && sourceBattlers && sourceBattleState
      && lungeShape && fury.length === expected.swipes.length && swipeShape
      && taskShape && counts && sound && registers && palettes && oam
      && matrices && rawExact && framebuffer && scriptBoundary;
    if (!ok) failures.push(
      `frame ${frameNumber}/age ${age}: seam=${seamMatch} battlers=${sourceBattlers}`
      + ` state=${sourceBattleState} lunge=${lungeShape} swipe=${swipeShape}`
      + ` task=${taskShape} counts=${counts} sound=${sound} regs=${registers}`
      + ` palettes=${palettes} oam=${oam} matrices=${matrices} raw=${rawExact}`
      + ` framebuffer=${framebuffer} script=${scriptBoundary}`,
    );
  }
  if (failures.length) throw new Error(failures.slice(0, 12).join("\n"));
  console.log(`${fixture.orientation} run ${runNumber}: 48/48 reducer/seam/source/OAM/palette/audio/RGB/framebuffer ages exact; evidence ${evidence}; raw ${raw}; map ${map}`);
  return { evidence, raw, map };
}

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const first = runFixture(fixturePath, 1);
  const second = runFixture(fixturePath, 2);
  if (first.evidence !== second.evidence
    || first.raw !== second.raw
    || first.map !== second.map
    || first.evidence !== fixture.evidenceSha256
    || second.evidence !== fixture.secondFreshEvidenceSha256) {
    throw new Error(`${fixturePath}: fresh evidence/raw/map receipts were not byte-stable`);
  }
}
