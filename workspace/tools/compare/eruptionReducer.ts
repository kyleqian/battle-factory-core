/** Dense state adapter and non-framebuffer audit for the composed Eruption reducer. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  ERUPTION_FALLING_ROCK_SOURCE_CALLS,
  type EruptionFallingRockProfile,
} from "../../src/animation/eruptionFallingRock.ts";
import {
  ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
  type EruptionHorizontalShakeProfile,
} from "../../src/animation/eruptionHorizontalShake.ts";
import { type EruptionLaunchProfile } from "../../src/animation/eruptionLaunch.ts";
import { type EruptionPaletteProfile } from "../../src/animation/eruptionPalette.ts";
import { type EruptionAnimationProfile, eruptionTimeline } from "../../src/animation/eruption.ts";

type Json = Record<string, any>;
export type EruptionOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/eruption-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export function readEruptionRows(orientation: EruptionOrientation): Json[] {
  const path = fixture.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

function runs(rows: Json[], predicate: (row: Json) => boolean): Array<readonly [number, number]> {
  const result: Array<readonly [number, number]> = [];
  let start: number | null = null;
  rows.forEach((_row, age) => {
    if (predicate(rows[age]!)) {
      if (start === null) start = age;
    } else if (start !== null) {
      result.push([start, age - 1]);
      start = null;
    }
  });
  if (start !== null) result.push([start, rows.length - 1]);
  return result;
}

function task(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((candidate: Json) => candidate.func.symbol === symbol);
}

function firstFreeSlots(row: Json): number[] {
  const occupied = new Set((row.sprites as Json[]).map((sprite) => sprite.slot));
  return Array.from({ length: 64 }, (_, slot) => slot).filter((slot) => !occupied.has(slot));
}

function launchProfile(side: EruptionOrientation, rows: Json[]): EruptionLaunchProfile {
  const sourceSide = side === "player-back" ? "player" : "opponent";
  const taskRuns = runs(rows, (row) => task(row, "AnimTask_EruptionLaunchRocks_Step") !== undefined);
  const soundRuns = runs(rows, (row) => task(row, "Task_WaitAndPlaySE") !== undefined);
  const firstLaunchAge = rows.findIndex((row) => row.sprites.some((sprite: Json) => sprite.template.symbol === "gEruptionLaunchRockSpriteTemplate"));
  const firstTask = task(rows[firstLaunchAge]!, "AnimTask_EruptionLaunchRocks_Step")!;
  const attacker = rows[0]!.battlerSprites.attacker as Json;
  return {
    side: sourceSide,
    geometry: {
      attackerSpriteSlot: attacker.slot,
      attackerX: attacker.x,
      attackerY: attacker.y,
      centerToCornerVecY: -64,
      battlerPicHeight: 64,
      battlerYDelta: sourceSide === "player" ? 10 : 11,
      matrixNum: rows[19]!.battlerSprites.attacker.matrixNum,
    },
    allocator: {
      freeSpriteSlots: firstFreeSlots(rows[firstLaunchAge - 1]!),
      tileTag: 10201,
      paletteTag: 10201,
      tileRange: rows[firstLaunchAge]!.allocators.tileRanges[6],
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      paletteSlot: rows[firstLaunchAge]!.allocators.paletteTags.indexOf(10201),
      loadedAge: rows.findIndex((row) => row.allocators.tileTags[6] === 10201),
      freedAge: rows.findIndex((row, age) => age > firstLaunchAge && row.allocators.tileTags[6] !== 10201),
    },
    taskSlot: firstTask.slot,
    waves: [
      { taskStartAge: taskRuns[0]![0], sourceOffset: rows[taskRuns[0]![0]]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[0]![1] },
      { taskStartAge: taskRuns[1]![0], sourceOffset: rows[taskRuns[1]![0]]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[1]![1] },
    ],
    startingAnimationRng: rows[0]!.animationRng,
    endAge: rows.length - 1,
  };
}

function fallingProfile(side: EruptionOrientation, rows: Json[]): EruptionFallingRockProfile {
  const creationAge = rows.findIndex((row) => row.sprites.some((sprite: Json) => sprite.template.symbol === "gEruptionFallingRockSpriteTemplate"));
  const first = rows[creationAge]!.sprites
    .filter((sprite: Json) => sprite.template.symbol === "gEruptionFallingRockSpriteTemplate")
    .sort((left: Json, right: Json) => left.slot - right.slot);
  const baseTile = rows[creationAge]!.allocators.tileRanges[6][0] as number;
  const calls = first.map((sprite: Json) => [
    sprite.x,
    sprite.data[0] === 1 ? sprite.y - 8 : sprite.y,
    sprite.data[0] === 0 ? sprite.data[6] + 1 : 0,
    sprite.data[7],
    ((sprite.attr[2] & 0x3ff) - baseTile) / 16,
    0, 0, 0,
  ]) as EruptionFallingRockProfile["calls"];
  if (!same(calls, ERUPTION_FALLING_ROCK_SOURCE_CALLS)) throw new Error(`${side}: falling source call drift`);
  const loadedAge = rows.findIndex((row) => row.allocators.tileTags[6] === 10201);
  const freedAge = rows.findIndex((row, age) => age > loadedAge && row.allocators.tileTags[6] !== 10201);
  const firstSprite = first[0]!;
  return {
    creationAge,
    endAge: rows.length - 1,
    calls,
    geometry: {
      oamCenterOffsetX: firstSprite.x - (firstSprite.attr[1] & 0x1ff),
      oamCenterOffsetY: (firstSprite.y - (firstSprite.attr[0] & 0xff) + 256) & 0xff,
      subpriority: firstSprite.subpriority,
      oamPriority: (firstSprite.attr[2] >> 10) & 3,
      horizontalFlip: (firstSprite.attr[1] & 0x8000) !== 0,
    },
    allocator: {
      freeSpriteSlots: first.map((sprite: Json) => sprite.slot),
      tileTag: 10201,
      paletteTag: 10201,
      tileRange: rows[loadedAge]!.allocators.tileRanges[6],
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      paletteSlot: rows[loadedAge]!.allocators.paletteTags.indexOf(10201),
      loadedAge,
      freedAge,
    },
    startingAnimationRng: rows[0]!.animationRng,
  };
}

function horizontalProfile(side: EruptionOrientation, rows: Json[], falling: EruptionFallingRockProfile): EruptionHorizontalShakeProfile {
  const creationAge = falling.creationAge + 23;
  const preCreate = rows[creationAge]!;
  const first = rows[creationAge + 1]!;
  const playerSprite = (side === "player-back" ? preCreate.battlerSprites.attacker : preCreate.battlerSprites.target) as Json;
  const opponentSprite = (side === "player-back" ? preCreate.battlerSprites.target : preCreate.battlerSprites.attacker) as Json;
  const battlers = [playerSprite, opponentSprite].map((sprite: Json, battlerId) => ({
    battlerId,
    side: battlerId === 0 ? "player" as const : "opponent" as const,
    spriteSlot: sprite.slot,
    x: sprite.x,
    y: sprite.y,
    initialX2: sprite.x2,
    initialY2: sprite.y2,
  })) as EruptionHorizontalShakeProfile["battlers"];
  return {
    orientation: side,
    taskCreationAge: creationAge,
    endAge: rows.length - 1,
    platformTaskSlot: task(first, "AnimTask_ShakePlatforms")!.slot,
    battlerTaskSlot: task(first, "AnimTask_ShakeBattlers")!.slot,
    platformInitialX: preCreate.battleBg.gBattle_BG3_X,
    battlers,
    startingAnimationRng: rows[0]!.animationRng,
    gameplayRng: rows[0]!.gameplayRng,
    resources: {
      tileTag: 10201,
      paletteTag: 10201,
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      tileRange: rows[1]!.allocators.tileRanges[6],
      paletteSlot: rows[1]!.allocators.paletteTags.indexOf(10201),
      loadedAge: 1,
      freedAge: rows.length - 1,
    },
  };
}

function paletteProfile(rows: Json[]): EruptionPaletteProfile {
  const opening = rows[4]!.sprites.find((sprite: Json) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate")!;
  const closingCommandAge = rows.findIndex((row) => row.scriptOffset === 204);
  const closing = rows[closingCommandAge]!.sprites.find((sprite: Json) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate")!;
  const paletteTagsAtAge0 = rows[0]!.allocators.paletteTags as number[];
  const tagsAfterLoad = rows[1]!.allocators.paletteTags as number[];
  const warmRockPaletteSlot = tagsAfterLoad.findIndex((tag, slot) => tag !== paletteTagsAtAge0[slot]);
  return {
    closingCommandAge,
    cleanupAge: rows.length - 1,
    attackerBattler: rows[0]!.animationBattlers.attacker,
    targetBattler: rows[0]!.animationBattlers.target,
    visiblePartnerBattlers: [],
    paletteSpriteSlots: { opening: opening.slot, closing: closing.slot },
    geometry: {
      x: opening.x,
      y: opening.y,
      openingSubpriority: opening.subpriority,
      closingSubpriority: closing.subpriority,
    },
    warmRockPaletteSlot,
    paletteTagsAtAge0,
    unfadedPaletteAtAge0: rows[0]!.unfadedPalette,
    fadedPaletteAtAge0: rows[0]!.fadedPalette,
    hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    warmRockPalette: rows[1]!.unfadedPalette.slice((16 + warmRockPaletteSlot) * 16, (17 + warmRockPaletteSlot) * 16),
  };
}

function orderProfile(rows: Json): EruptionAnimationProfile["spriteOrder"] {
  const sprites = [...rows.sprites, ...Object.values(rows.battlerSprites)] as Json[];
  const initialKeys = sprites.map((sprite) => ({
    slot: sprite.slot,
    priority: ((sprite.attr[2] >> 10) & 3) as 0 | 1 | 2 | 3,
    subpriority: sprite.subpriority,
    y: ((sprite.attr[0] & 0xff) >= 160 ? (sprite.attr[0] & 0xff) - 256 : sprite.attr[0] & 0xff),
  }));
  return { initialOrder: rows.spriteOrder, initialKeys };
}

export function eruptionProfileFor(orientation: EruptionOrientation, rows = readEruptionRows(orientation)): EruptionAnimationProfile {
  const launch = launchProfile(orientation, rows);
  const falling = fallingProfile(orientation, rows);
  const palette = paletteProfile(rows);
  const horizontalShake = horizontalProfile(orientation, rows, falling);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  return {
    orientation,
    endAge: rows.length - 1,
    launch,
    falling,
    horizontalShake,
    palette,
    audio: {
      commandAge: falling.creationAge + 24,
      endAge: rows.length - 1,
      taskSlot: 2,
      attackerSide,
      targetSide: attackerSide === "player" ? "opponent" : "player",
    },
    gameplayRng: rows[0]!.gameplayRng,
    immutableGameplayState: rows[0]!.immutableState,
    spriteOrder: orderProfile(rows[0]!),
  };
}

function normalizeTask(taskState: Json): Json {
  return { slot: taskState.slot, priority: taskState.priority, callback: taskState.func.symbol, data: taskState.data };
}

function normalizeSprite(sprite: Json): Json {
  return {
    slot: sprite.slot,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    data: sprite.data,
    attr: sprite.attr,
  };
}

function battlerById(row: Json, battlerId: number): Json {
  const attacker = row.animationBattlers.attacker as number;
  return (battlerId === attacker ? row.battlerSprites.attacker : row.battlerSprites.target) as Json;
}

function oamX(row: Json, battler: Json, bank: "softwareOam" | "hardwareOam"): number {
  const index = (row[bank] as string[]).findIndex((raw) => Buffer.from(raw, "hex").readUInt16LE(4) === battler.attr[2]);
  if (index < 0) throw new Error(`missing battler OAM entry for slot ${battler.slot}`);
  return Buffer.from((row[bank] as string[])[index]!, "hex").readUInt16LE(2) & 0x1ff;
}

/**
 * Combined source/task/resource audit. It deliberately excludes framebuffer
 * bytes and therefore cannot promote exact coverage.
 */
export function verifyEruptionReducer(orientation: EruptionOrientation): Json {
  const rows = readEruptionRows(orientation);
  const profile = eruptionProfileFor(orientation, rows);
  const result = eruptionTimeline(profile);
  const baselineOamX = new Map(profile.horizontalShake.battlers.map((geometry) => {
    const sprite = rows[profile.horizontalShake.taskCreationAge]!.sprites.find((candidate: Json) => candidate.slot === geometry.spriteSlot)!;
    return [geometry.spriteSlot, (oamX(rows[profile.horizontalShake.taskCreationAge]!, sprite, "softwareOam") - geometry.initialX2) & 0x1ff];
  }));
  let sourceRows = 0;
  let spriteRows = 0;
  let taskRows = 0;
  let paletteRows = 0;
  let shakeRows = 0;
  let audioRows = 0;
  let orderRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const frame = result.frames[age]!;
    if (!same([frame.source.owner, frame.source.offset, frame.source.pointer, frame.source.pointerParity, frame.source.wait, frame.source.args], [row.scriptOwner, row.scriptOffset, row.scriptPtr, row.scriptPtrParity, row.scriptWait, row.animArgs])) throw new Error(`${orientation} age ${age}: composed source cursor drift`);
    sourceRows += 1;
    if (frame.visualTaskCount !== row.visualTaskCount || frame.soundTaskCount !== row.soundTaskCount) throw new Error(`${orientation} age ${age}: task counts drift`);
    const expectedTasks = row.tasks.filter((candidate: Json) => ["AnimTask_EruptionLaunchRocks_Step", "Task_WaitAndPlaySE", "AnimTask_ShakePlatforms", "AnimTask_ShakeBattlers", "Task_LoopAndPlaySE"].includes(candidate.func.symbol)).map(normalizeTask);
    const actualTasks = frame.tasks.map((taskState) => ({ slot: taskState.slot, priority: taskState.priority, callback: taskState.callback, data: taskState.data }));
    if (!same(actualTasks, expectedTasks)) throw new Error(`${orientation} age ${age}: composed task list drift`);
    taskRows += expectedTasks.length;
    const expectedSprites = row.sprites.filter((sprite: Json) => ["gEruptionLaunchRockSpriteTemplate", "gEruptionFallingRockSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"].includes(sprite.template.symbol)).map(normalizeSprite).sort((a: Json, b: Json) => a.slot - b.slot);
    const actualSprites = frame.sprites.map((sprite) => normalizeSprite({ ...sprite, template: { symbol: sprite.kind === "launch" ? "gEruptionLaunchRockSpriteTemplate" : sprite.kind === "falling" ? "gEruptionFallingRockSpriteTemplate" : "gSimplePaletteBlendSpriteTemplate" }, callback: { symbol: sprite.kind === "launch" ? "AnimEruptionLaunchRock" : sprite.kind === "falling" ? "AnimEruptionFallingRock_Step" : "AnimSimplePaletteBlend_Step" } })).sort((a, b) => a.slot - b.slot);
    if (!same(actualSprites, expectedSprites)) throw new Error(`${orientation} age ${age}: composed sprite state drift`);
    if (expectedSprites.length) spriteRows += expectedSprites.length;
    if (!same(frame.palette.palette.unfaded, row.unfadedPalette) || !same(frame.palette.palette.softwareFaded, row.fadedPalette) || !same(frame.palette.palette.hardware, row.hardwarePalette)) throw new Error(`${orientation} age ${age}: palette program drift`);
    paletteRows += 1;
    if (age >= profile.horizontalShake.taskCreationAge
      && age <= profile.horizontalShake.taskCreationAge + 201) {
      for (const battler of frame.horizontalShake.battlers) {
        const expected = battlerById(row, battler.battlerId);
        const baseX = baselineOamX.get(battler.spriteSlot)!;
        const displayedDelta = (oamX(row, expected, "softwareOam") - baseX) & 0x1ff;
        const displayedX2 = displayedDelta > 255 ? displayedDelta - 512 : displayedDelta;
        if (!same([battler.spriteSlot, battler.x, battler.y, battler.x2, battler.y2], [expected.slot, expected.x, expected.y, expected.x2, expected.y2])
          || battler.displayedOamX2 !== displayedX2) throw new Error(`${orientation} age ${age}: shake battler/OAM drift`);
      }
    }
    if (frame.horizontalShake.platform.sourceX !== row.battleBg.gBattle_BG3_X
      || (frame.horizontalShake.platform.displayedX & 0x1ff) !== row.registers.bg3hofs) throw new Error(`${orientation} age ${age}: shake platform latch drift`);
    shakeRows += frame.horizontalShake.lifecycle.callbackRows > 0 ? 1 : 0;
    if (frame.audio.source && row.scriptOffset === 187 && frame.audio.source.pointer !== row.scriptPtr) throw new Error(`${orientation} age ${age}: loop audio source drift`);
    audioRows += frame.audio.audio ? 1 : 0;
    const expectedOrder = row.spriteOrder.filter((slot: number) => expectedSprites.some((sprite: Json) => sprite.slot === slot));
    if (!same(frame.order.sourceOrder, expectedOrder)) throw new Error(`${orientation} age ${age}: source/painter order drift`);
    orderRows += 1;
    if (age > 0) {
      if (!same(row.hardwareOam, rows[age - 1]!.softwareOam) || !same(row.hardwarePalette, rows[age - 1]!.fadedPalette)) throw new Error(`${orientation} age ${age}: display latch drift`);
    }
    if (row.gameplayRng !== profile.gameplayRng || !same(row.immutableState, rows[0]!.immutableState) || frame.gameplay.changed) throw new Error(`${orientation} age ${age}: gameplay mutation`);
    if (frame.animationRng !== row.animationRng) throw new Error(`${orientation} age ${age}: animation RNG drift`);
  }
  const last = result.frames.at(-1)!;
  if (last.active || last.sprites.length || last.tasks.length || !last.cleanup.firstInactive || !last.cleanup.resourcesFreed) throw new Error(`${orientation}: composed cleanup drift`);
  return {
    orientation,
    rows: rows.length,
    checked: { sourceRows, spriteRows, taskRows, paletteRows, shakeRows, audioRows, orderRows },
    lifecycle: { launchRocks: 14, fallingRocks: 6, palettePrograms: 2 },
    cleanup: { age: last.age, active: last.active, sprites: last.sprites.length, tasks: last.tasks.length, framebufferCompared: false },
    gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: rows.length },
  };
}
