/** Strict source/task/sprite audit for the banked Eruption launch component. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  ERUPTION_LAUNCH_SOURCE_BASE,
  ERUPTION_LAUNCH_ROCK_TILE_OFFSETS,
  eruptionLaunchTimeline,
  type EruptionLaunchProfile,
} from "../../src/animation/eruptionLaunch.ts";

type Json = Record<string, any>;
type Side = "player" | "opponent";
const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const readRows = (side: Side): Json[] => {
  const filename = side === "player"
    ? "tools/compare/evidence/eruption-player-dense-state.json.gz"
    : "tools/compare/evidence/eruption-opponent-dense-state.json.gz";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, filename))).toString("utf8")) as Json).frames;
};

function runs(rows: Json[], predicate: (row: Json) => boolean): Array<readonly [number, number]> {
  const result: Array<readonly [number, number]> = [];
  let start: number | null = null;
  rows.forEach((row, age) => {
    if (predicate(row)) {
      if (start === null) start = age;
    } else if (start !== null) {
      result.push([start, age - 1]);
      start = null;
    }
  });
  if (start !== null) result.push([start, rows.length - 1]);
  return result;
}

function launchTask(row: Json): Json | undefined {
  return row.tasks.find((task: Json) => task.func.symbol === "AnimTask_EruptionLaunchRocks_Step");
}

function launchSprites(row: Json): Json[] {
  return row.sprites
    .filter((sprite: Json) => sprite.template.symbol === "gEruptionLaunchRockSpriteTemplate")
    .sort((a: Json, b: Json) => a.slot - b.slot);
}

function firstFreeSlots(row: Json): number[] {
  const occupied = new Set((row.sprites as Json[]).map((sprite) => sprite.slot));
  return Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => !occupied.has(slot));
}

function birthAgeAt(rows: Json[], age: number, slot: number): number {
  let birth = age;
  while (birth > 0 && rows[birth - 1]!.sprites.some((sprite: Json) => sprite.slot === slot && sprite.template.symbol === "gEruptionLaunchRockSpriteTemplate")) birth -= 1;
  return birth;
}

function profileFor(side: Side, rows: Json[]): EruptionLaunchProfile {
  const first = rows[0]!;
  const attacker = first.battlerSprites.attacker as Json;
  const taskRuns = runs(rows, (row) => launchTask(row) !== undefined);
  const soundRuns = runs(rows, (row) => row.tasks.some((task: Json) => task.func.symbol === "Task_WaitAndPlaySE"));
  if (!same(taskRuns, side === "player" ? [[19, 99], [101, 181]] : [[19, 108], [110, 199]])
    || soundRuns.length !== 2) throw new Error(`${side}: launch/source task runs drifted`);
  const firstLaunchAge = rows.findIndex((row) => launchSprites(row).length > 0);
  if (firstLaunchAge < 1) throw new Error(`${side}: launch creation row missing`);
  const firstLaunchTask = launchTask(rows[firstLaunchAge])!;
  const secondTaskAge = taskRuns[1]![0];
  const tileRange = rows[firstLaunchAge]!.allocators.tileRanges[6] as [number, number];
  const paletteSlot = (rows[firstLaunchAge]!.allocators.paletteTags as number[]).indexOf(10201);
  const freedAge = rows.findIndex((row) => row.allocators.tileTags[6] !== 10201 && row.frame > rows[1]!.frame);
  return {
    side,
    geometry: {
      attackerSpriteSlot: attacker.slot,
      attackerX: attacker.x,
      attackerY: attacker.y,
      centerToCornerVecY: -64,
      battlerPicHeight: 64,
      battlerYDelta: side === "player" ? 10 : 11,
      matrixNum: rows[19]!.battlerSprites.attacker.matrixNum,
    },
    allocator: {
      freeSpriteSlots: firstFreeSlots(rows[firstLaunchAge - 1]!),
      tileTag: 10201,
      paletteTag: 10201,
      tileRange,
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      paletteSlot,
      loadedAge: rows.findIndex((row) => row.allocators.tileTags[6] === 10201),
      freedAge: freedAge < 0 ? null : freedAge,
    },
    taskSlot: firstLaunchTask.slot,
    waves: [
      { taskStartAge: taskRuns[0]![0], sourceOffset: rows[taskRuns[0]![0]]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[0]![1] },
      { taskStartAge: secondTaskAge, sourceOffset: rows[secondTaskAge]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[1]![1] },
    ],
    startingAnimationRng: first.animationRng,
    endAge: rows.length - 1,
  };
}

function fail(side: Side, age: number, field: string, expected: unknown, actual: unknown): never {
  throw new Error(`${side} age ${age} ${field} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function auditSide(side: Side): Json {
  const rows = readRows(side);
  const profile = profileFor(side, rows);
  const output = eruptionLaunchTimeline(profile);
  const taskRuns = runs(rows, (row) => launchTask(row) !== undefined);
  const launchLives = runs(rows, (row) => launchSprites(row).length > 0);
  let checkedComponentRows = 0;
  let checkedRngRows = 0;
  let checkedTransferRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const frame = output[age]!;
    if (frame.animationRng !== row.animationRng) fail(side, age, "animation RNG", row.animationRng, frame.animationRng);
    checkedRngRows += 1;
    if (age > 0) {
      const transfer = same(row.hardwareOam, rows[age - 1]!.softwareOam);
      if (!transfer || !frame.oamTransfer.hardwareEqualsPrecedingSoftware)
        fail(side, age, "RAM-to-hardware predecessor transfer", { hardware: true }, frame.oamTransfer);
      checkedTransferRows += 1;
    }
    const expectedTileLive = row.allocators.tileTags[6] === 10201;
    const expectedPaletteLive = row.allocators.paletteTags[7] === 10201;
    if (frame.resources.tileAllocationRetained !== expectedTileLive
      || frame.resources.paletteAllocationRetained !== expectedPaletteLive
      || !same(frame.resources.tileRange, row.allocators.tileRanges[6])
      || frame.resources.paletteSlot !== 7) {
      fail(side, age, "Warm Rock allocator/resource use", {
        tile: expectedTileLive, palette: expectedPaletteLive, range: row.allocators.tileRanges[6], paletteSlot: 7,
      }, frame.resources);
    }
    const expectedTask = launchTask(row);
    const expectedRocks = launchSprites(row);
    if (expectedTask === undefined && expectedRocks.length === 0) {
      if (frame.task !== null || frame.sprites.length !== 0 || frame.visualTaskCount !== 0) fail(side, age, "inactive launch cleanup", null, frame);
      continue;
    }
    checkedComponentRows += 1;
    if (expectedTask === undefined || frame.task === null) fail(side, age, "task presence", expectedTask !== undefined, frame.task);
    if (frame.task.func !== "AnimTask_EruptionLaunchRocks_Step"
      || frame.task.slot !== expectedTask.slot
      || frame.task.priority !== expectedTask.priority
      || !same(frame.task.data, expectedTask.data)) {
      fail(side, age, "task state/data/priority", expectedTask, frame.task);
    }
    const wave = frame.source!.offset === 33 ? 0 : 1;
    if (!same(frame.task.lifetime, taskRuns[wave]!)) fail(side, age, "task lifetime", taskRuns[wave], frame.task.lifetime);
    if (!same(frame.source, {
      owner: "Move_ERUPTION", command: "AnimTask_EruptionLaunchRocks", offset: row.scriptOffset,
      pointer: row.scriptPtr, pointerParity: row.scriptPtrParity, wait: row.scriptWait, args: [], priority: 2,
    })) fail(side, age, "source cursor", row, frame.source);
    if (frame.visualTaskCount !== 1) fail(side, age, "launch visual-task count", 1, frame.visualTaskCount);
    const matrixNum = profile.geometry.matrixNum;
    const matrixTransfer = age > 0
      && same(row.hardwareMatrices[matrixNum], rows[age - 1]!.softwareMatrices[matrixNum]);
    if (frame.battler === null
      || frame.battler.matrixNum !== matrixNum
      || !same(frame.battler.matrix, row.battlerSprites.attacker.matrix)
      || !same(frame.battler.hardwareMatrix, row.hardwareMatrices[matrixNum])
      || frame.oamTransfer.matricesEqualsPrecedingSoftware !== matrixTransfer) {
      fail(side, age, "affine matrix/OAM transfer", {
        matrixNum, matrix: row.battlerSprites.attacker.matrix, hardwareMatrix: row.hardwareMatrices[matrixNum], matrixTransfer,
      }, frame.battler);
    }
    const actualRocks = [...frame.sprites].sort((a, b) => a.slot - b.slot);
    if (actualRocks.length !== expectedRocks.length) fail(side, age, "sprite count", expectedRocks.length, actualRocks.length);
    expectedRocks.forEach((expected, index) => {
      const actual = actualRocks[index]!;
      const birth = birthAgeAt(rows, age, expected.slot);
      const expectedFields = [expected.slot, expected.x, expected.y, expected.x2, expected.y2, expected.data, expected.attr, expected.subpriority, expected.invisible];
      const actualFields = [actual.slot, actual.x, actual.y, actual.x2, actual.y2, actual.data, actual.attr, actual.subpriority, actual.invisible];
      if (!same(expectedFields, actualFields)
        || actual.template !== "gEruptionLaunchRockSpriteTemplate"
        || actual.callback !== "AnimEruptionLaunchRock"
        || actual.birthAge !== birth
        || actual.localAge !== age - birth
        || actual.tileOffset !== (expected.attr[2] - ((7 << 12) | (2 << 10) | profile.allocator.tileRange[0]))
        || actual.paletteSlot !== 7
        || actual.matrixNum !== 0
        || !same(actual.matrix, [256, 0, 0, 256])
        || actual.displayedInOam !== (age > birth)) {
        fail(side, age, `launch sprite slot ${expected.slot}`, expectedFields, actualFields);
      }
      if (age > birth) {
        const oamEntry = (row.softwareOam as string[]).some((raw) => {
          const bytes = Buffer.from(raw, "hex");
          return bytes.readUInt16LE(0) === expected.attr[0]
            && bytes.readUInt16LE(2) === expected.attr[1]
            && bytes.readUInt16LE(4) === expected.attr[2];
        });
        if (!oamEntry) fail(side, age, `launch sprite slot ${expected.slot} software OAM`, true, expected.attr);
      }
    });
    if (expectedRocks.length > 0
      && (frame.allocation.wave !== wave || !same(frame.allocation.slots, profile.allocator.freeSpriteSlots.slice(0, 7))))
      fail(side, age, "fixed-slot allocation", profile.allocator.freeSpriteSlots.slice(0, 7), frame.allocation);
  }
  const expectedStarts = side === "player" ? [61, 143] : [61, 152];
  const actualStarts = output.flatMap((frame) => frame.sprites.filter((sprite) => sprite.localAge === 0).map((sprite) => sprite.birthAge));
  if (!same([...new Set(actualStarts)], expectedStarts)) fail(side, -1, "launch wave starts", expectedStarts, actualStarts);
  const cleanupAge = taskRuns[1]![1] + 1;
  if (!output[cleanupAge]!.cleanup.firstInactive || output.slice(0, cleanupAge).some((frame) => frame.cleanup.firstInactive))
    fail(side, cleanupAge, "first launch-component cleanup", true, output[cleanupAge]!.cleanup);
  if (launchLives.length !== 2 || output.filter((frame) => frame.sprites.length).reduce((count, frame) => count + (frame.sprites.some((sprite) => sprite.localAge === 0) ? frame.sprites.length : 0), 0) !== 14)
    fail(side, -1, "launch lifecycle count", 14, launchLives);
  return {
    sourceWindow: { rows: rows.length, firstAge: 0, lastAge: rows.length - 1 },
    taskLifetimes: taskRuns,
    launchWaveStarts: expectedStarts,
    launchRockCreations: 14,
    checked: { componentRows: checkedComponentRows, rngRows: checkedRngRows, transferRows: checkedTransferRows },
    resources: { loadedAge: profile.allocator.loadedAge, freedAge: profile.allocator.freedAge },
  };
}

function auditAsset(): void {
  const asset = JSON.parse(readFileSync(resolve(root, "src/animation/assets/eruption-warm-rock.json"), "utf8")) as Json;
  const template = asset.templates.launch;
  if (asset.source.tag.value !== 10201
    || template.symbol !== "gEruptionLaunchRockSpriteTemplate"
    || template.callback !== "AnimEruptionLaunchRock"
    || !same(template.animation.tileOffsets, [64, 68, 72, 76, 80])
    || !same(template.cells.map((cell: Json) => cell.tileOffset), [64, 68, 72, 76, 80])) {
    throw new Error("Warm Rock launch cell/template asset drifted");
  }
  if (!same(ERUPTION_LAUNCH_ROCK_TILE_OFFSETS, [64, 68, 72, 76, 80, 64, 68]))
    throw new Error("Eruption launch tile-cell cycle drifted");
}

auditAsset();
const result = { component: "task:AnimTask_EruptionLaunchRocks + sprite:gEruptionLaunchRockSpriteTemplate", status: "unsupported-unfulfilled-component-checkpoint", "player-back": auditSide("player"), "opponent-front": auditSide("opponent") };
console.log(JSON.stringify(result, null, 2));
