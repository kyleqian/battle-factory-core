/** Strict dense-source audit for MOVE_ERUPTION's paired HorizontalShake tasks. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
  ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS,
  ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE,
  ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
  ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG,
  eruptionHorizontalShakeTimeline,
  type EruptionHorizontalShakeOrientation,
  type EruptionHorizontalShakeProfile,
} from "../../src/animation/eruptionHorizontalShake.ts";

type Json = Record<string, any>;
type Side = EruptionHorizontalShakeOrientation;

const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");
const fail = (side: Side, age: number | string, message: string): never => {
  throw new Error(`${side} Eruption HorizontalShake audit age ${age}: ${message}`);
};

function requireToken(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

function rowsFor(side: Side): Json[] {
  const name = side === "player-back" ? "player" : "opponent";
  const evidence = JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/eruption-${name}-dense-state.json.gz`))).toString("utf8")) as Json;
  const expectedRows = side === "player-back" ? 476 : 494;
  if (evidence.schema !== "eruption-dense-evidence/v1"
    || evidence.profile !== "battle-scene-on"
    || evidence.move !== 284
    || evidence.frames.length !== expectedRows) {
    throw new Error(`${side}: retained dense evidence identity/window drifted`);
  }
  return evidence.frames as Json[];
}

function task(row: Json, callback: "AnimTask_ShakePlatforms" | "AnimTask_ShakeBattlers"): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === callback);
}

function u16(raw: string, offset: number): number {
  return Buffer.from(raw, "hex").readUInt16LE(offset);
}

function oamEntryByAttr2(row: Json, attr2: number): Readonly<{ readonly x: number; readonly y: number; readonly raw: string }> {
  const matches = (row.softwareOam as string[])
    .filter((raw) => u16(raw, 4) === attr2)
    .map((raw) => ({ x: u16(raw, 2) & 0x1ff, y: u16(raw, 0) & 0xff, raw }));
  if (matches.length !== 1) throw new Error(`expected exactly one software OAM entry for attr2 ${attr2}, got ${matches.length}`);
  return matches[0]!;
}

function sourceAddress(symbol: string): number {
  const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing source symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}

function auditSource(): void {
  const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
  const ground = read("reference/pokeemerald/src/battle_anim_ground.c");
  const body = scripts.slice(scripts.indexOf("Move_ERUPTION:"), scripts.indexOf("Move_SKILL_SWAP:"));
  for (const token of [
    "createvisualtask AnimTask_HorizontalShake, 5, (MAX_BATTLERS_COUNT + 1), 8, 60",
    "createvisualtask AnimTask_HorizontalShake, 5, MAX_BATTLERS_COUNT, 8, 60",
    "loopsewithpan SE_M_ROCK_THROW, SOUND_PAN_TARGET, 16, 12",
    "delay 80",
  ]) requireToken(body, token, "Move_ERUPTION source");
  for (const token of [
    "void AnimTask_HorizontalShake(u8 taskId)",
    "task->tHorizOffset = task->tInitHorizOffset = gBattleAnimArgs[1] + 3;",
    "task->tMaxTime = gBattleAnimArgs[2];",
    "case MAX_BATTLERS_COUNT + 1: // Shake platforms",
    "task->tInitialX = gBattle_BG3_X;",
    "task->func = AnimTask_ShakePlatforms;",
    "case MAX_BATTLERS_COUNT: // Shake all battlers",
    "if (IsBattlerSpriteVisible(i))",
    "task->tbattlerSpriteIds(task->tNumBattlers) = gBattlerSpriteIds[i];",
    "task->func = AnimTask_ShakeBattlers;",
    "static void AnimTask_ShakePlatforms(u8 taskId)",
    "if (++task->tDelay > 1)",
    "if (++task->tTimer == task->tMaxTime)",
    "if (--task->tHorizOffset == 0)",
    "gBattle_BG3_X = task->tInitialX;",
    "static void AnimTask_ShakeBattlers(u8 taskId)",
    "SetBattlersXOffsetForShake(task);",
    "xOffset = (task->tHorizOffset / 2) + (task->tHorizOffset & 1);",
    "xOffset = -(task->tHorizOffset / 2);",
    "gSprites[task->tbattlerSpriteIds(i)].x2 = xOffset;",
    "DestroyAnimVisualTask(taskId);",
  ]) requireToken(ground, token, "AnimTask_HorizontalShake source");
  if (sourceAddress("Move_ERUPTION") !== ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE
    || sourceAddress("AnimTask_HorizontalShake") !== 0x081152dc
    || sourceAddress("AnimTask_ShakePlatforms") !== 0x081153ac
    || sourceAddress("AnimTask_ShakeBattlers") !== 0x081154a4) {
    throw new Error("Eruption HorizontalShake source-symbol address drifted");
  }
}

function profileFor(side: Side, rows: Json[]): EruptionHorizontalShakeProfile {
  const expected = side === "player-back"
    ? {
      creationAge: 238, firstCallbackAge: 239, firstFrame: 234, lastFrame: 709,
      attacker: 0, target: 1,
      battlers: [
        { battlerId: 0, side: "player" as const, spriteSlot: 6, x: 72, y: 90, initialX2: 0, initialY2: 0 },
        { battlerId: 1, side: "opponent" as const, spriteSlot: 8, x: 176, y: 42, initialX2: 1, initialY2: 0 },
      ],
    }
    : {
      creationAge: 256, firstCallbackAge: 257, firstFrame: 221, lastFrame: 714,
      attacker: 1, target: 0,
      battlers: [
        { battlerId: 0, side: "player" as const, spriteSlot: 6, x: 72, y: 80, initialX2: 0, initialY2: 0 },
        { battlerId: 1, side: "opponent" as const, spriteSlot: 8, x: 176, y: 51, initialX2: 0, initialY2: 0 },
      ],
    };
  const preCreate = rows[expected.creationAge]!;
  const first = rows[expected.firstCallbackAge]!;
  if (rows[0]!.frame !== expected.firstFrame || rows.at(-1)!.frame !== expected.lastFrame
    || task(preCreate, "AnimTask_ShakePlatforms") || task(preCreate, "AnimTask_ShakeBattlers")
    || preCreate.scriptOffset !== 153 || preCreate.scriptWait !== 0
    || !same(preCreate.animArgs, [60, -32, 80, 70, 1, 0, 0, 0])
    || first.animationBattlers.attacker !== expected.attacker
    || first.animationBattlers.target !== expected.target
    || first.scriptOffset !== ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET
    || first.scriptPtr !== ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE + ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET
    || first.scriptWait !== 80
    || !same(first.animArgs, ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS)) {
    throw new Error(`${side}: task creation/source cursor contract drifted`);
  }
  const platform = task(first, "AnimTask_ShakePlatforms");
  const battlers = task(first, "AnimTask_ShakeBattlers");
  if (!platform || !battlers || platform.slot !== 0 || battlers.slot !== 1) {
    throw new Error(`${side}: task allocator slots drifted`);
  }
  const observedBattlers = expected.battlers.map((geometry) => {
    const sprite = preCreate.sprites.find((entry: Json) => entry.slot === geometry.spriteSlot);
    if (!sprite || !same(
      [sprite.x, sprite.y, sprite.x2, sprite.y2],
      [geometry.x, geometry.y, geometry.initialX2, geometry.initialY2],
    )) throw new Error(`${side}: battler geometry drifted for slot ${geometry.spriteSlot}`);
    return geometry;
  }) as EruptionHorizontalShakeProfile["battlers"];
  const loadedAge = rows.findIndex((row) => row.allocators.tileTags[6] === ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG);
  const freedAge = rows.findIndex((row, age) => age > loadedAge && row.allocators.tileTags[6] !== ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG);
  const paletteSlot = rows[loadedAge]?.allocators.paletteTags.indexOf(ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG) ?? -1;
  if (loadedAge !== 1 || freedAge !== rows.length - 1 || paletteSlot !== 7) {
    throw new Error(`${side}: Warm Rock resource pass-through lifetime drifted`);
  }
  return {
    orientation: side,
    taskCreationAge: expected.creationAge,
    endAge: rows.length - 1,
    platformTaskSlot: platform.slot,
    battlerTaskSlot: battlers.slot,
    platformInitialX: preCreate.battleBg.gBattle_BG3_X,
    battlers: observedBattlers,
    startingAnimationRng: rows[0]!.animationRng,
    gameplayRng: rows[0]!.gameplayRng,
    resources: {
      tileTag: ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG,
      paletteTag: ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG,
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      tileRange: rows[loadedAge]!.allocators.tileRanges[6],
      paletteSlot,
      loadedAge,
      freedAge,
    },
  };
}

function expectedScriptAtAge(age: number, profile: Readonly<EruptionHorizontalShakeProfile>): Readonly<{ offset: number; wait: number; args: readonly number[] }> {
  const localAge = age - profile.taskCreationAge;
  if (localAge <= 0) return { offset: 153, wait: 0, args: [60, -32, 80, 70, 1, 0, 0, 0] };
  if (localAge <= 82) {
    return {
      offset: ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
      wait: Math.max(0, 80 - (localAge - 1)),
      args: ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
    };
  }
  return { offset: 204, wait: 1, args: [31, 4, 4, 0, 31, 0, 0, 0] };
}

function auditSide(side: Side): Json {
  const rows = rowsFor(side);
  const profile = profileFor(side, rows);
  const timeline = eruptionHorizontalShakeTimeline(profile);
  const firstCallbackAge = profile.taskCreationAge + 1;
  const lastCallbackAge = profile.taskCreationAge + ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS;
  const firstInactiveAge = lastCallbackAge + 1;
  const baselineOam = new Map(profile.battlers.map((geometry) => {
    const sprite = rows[profile.taskCreationAge]!.sprites.find((entry: Json) => entry.slot === geometry.spriteSlot)!;
    const software = oamEntryByAttr2(rows[profile.taskCreationAge]!, sprite.attr[2]);
    return [geometry.spriteSlot, {
      attr0: sprite.attr[0], attr2: sprite.attr[2], subpriority: sprite.subpriority,
      template: sprite.template.symbol, callback: sprite.callback.symbol, invisible: sprite.invisible,
      baseOamX: software.x - geometry.initialX2, baseOamY: software.y,
    }];
  }));
  let taskRows = 0;
  let taskDataRows = 0;
  let geometryRows = 0;
  let softwareOamRows = 0;
  let hardwareOamPredecessorRows = 0;
  let rngRows = 0;
  let resourceRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const frame = timeline[age]!;
    const script = expectedScriptAtAge(age, profile);
    if (row.scriptOwner !== "Move_ERUPTION"
      || row.scriptPtr !== ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE + row.scriptOffset
      || row.scriptPtrParity !== (row.scriptPtr & 1)
      || (age >= profile.taskCreationAge && (
        row.scriptOffset !== script.offset
        || row.scriptWait !== script.wait
        || !same(row.animArgs, script.args)
      ))) {
      fail(side, age, `source cursor/args drifted: ${JSON.stringify({ script, actual: {
        owner: row.scriptOwner, offset: row.scriptOffset, pointer: row.scriptPtr, parity: row.scriptPtrParity, wait: row.scriptWait, args: row.animArgs,
      } })}`);
    }
    if (frame.rng.animation !== row.animationRng
      || frame.rng.animationPrevious !== (age > 0 ? rows[age - 1]!.animationRng : null)
      || frame.rng.animationNext !== (age + 1 < rows.length ? rows[age + 1]!.animationRng : null)
      || frame.rng.gameplay !== row.gameplayRng
      || frame.rng.animationConsumedByTask
      || frame.rng.gameplayConsumedByTask) {
      fail(side, age, "RNG pass-through drifted");
    }
    rngRows += 1;
    const tileLive = row.allocators.tileTags[6] === ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG;
    const paletteLive = row.allocators.paletteTags[profile.resources.paletteSlot] === ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG;
    if (frame.resources.tileTag !== ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG
      || frame.resources.paletteTag !== ERUPTION_HORIZONTAL_SHAKE_WARM_ROCK_TAG
      || !same(frame.resources.tileRange, row.allocators.tileRanges[6])
      || frame.resources.paletteSlot !== profile.resources.paletteSlot
      || frame.resources.tileAllocationRetained !== tileLive
      || frame.resources.paletteAllocationRetained !== paletteLive
      || !frame.resources.passedThroughWithoutTaskAllocation) {
      fail(side, age, "Warm Rock resource pass-through drifted");
    }
    resourceRows += 1;
    if (age > 0) {
      if (!same(row.hardwareOam, rows[age - 1]!.softwareOam)) fail(side, age, "hardware OAM predecessor transfer drifted");
      hardwareOamPredecessorRows += 1;
    }
    const platform = task(row, "AnimTask_ShakePlatforms");
    const battlerTask = task(row, "AnimTask_ShakeBattlers");
    const active = age >= firstCallbackAge && age <= lastCallbackAge;
    if (active !== frame.lifecycle.active
      || frame.lifecycle.ownedVisualTaskCount !== (active ? 2 : 0)
      || frame.lifecycle.firstInactive !== (age === firstInactiveAge)
      || frame.lifecycle.destroyed !== (age >= firstInactiveAge)) {
      fail(side, age, "task lifecycle state drifted");
    }
    if (!active) {
      if (platform || battlerTask || frame.platformTask || frame.battlerTask) fail(side, age, "task survived outside complete lifecycle");
    } else {
      if (!platform || !battlerTask || !frame.platformTask || !frame.battlerTask
        || platform.slot !== frame.platformTask.slot
        || battlerTask.slot !== frame.battlerTask.slot
        || platform.func.symbol !== frame.platformTask.callback
        || battlerTask.func.symbol !== frame.battlerTask.callback
        || !same(platform.data, frame.platformTask.data)
        || !same(battlerTask.data, frame.battlerTask.data)
        || !same(battlerTask.data.slice(9, 14), [
          profile.battlers[0].spriteSlot, profile.battlers[1].spriteSlot, 0, 0, 2,
        ])) {
        fail(side, age, "task allocation slot/data/callback drifted");
      }
      taskRows += 1;
      taskDataRows += 2;
    }
    if (row.battleBg.gBattle_BG3_X !== frame.platform.sourceX
      || row.registers.bg3hofs !== (frame.platform.displayedX & 0x1ff)) {
      fail(side, age, "platform source/display-lag effect drifted");
    }
    if (age >= profile.taskCreationAge && age <= firstInactiveAge) {
      for (const reduced of frame.battlers) {
        const sprite = row.sprites.find((entry: Json) => entry.slot === reduced.spriteSlot);
        const baseline = baselineOam.get(reduced.spriteSlot)!;
        if (!sprite || !same([sprite.x, sprite.y, sprite.x2, sprite.y2], [reduced.x, reduced.y, reduced.x2, reduced.y2])
          || sprite.attr[0] !== baseline.attr0
          || sprite.attr[2] !== baseline.attr2
          || sprite.subpriority !== baseline.subpriority
          || sprite.template.symbol !== baseline.template
          || sprite.callback.symbol !== baseline.callback
          || sprite.invisible !== baseline.invisible) {
          fail(side, age, `battler geometry/source-x2 effect drifted for slot ${reduced.spriteSlot}`);
        }
        const software = oamEntryByAttr2(row, baseline.attr2);
        if (software.x !== ((baseline.baseOamX + reduced.displayedOamX2) & 0x1ff)
          || software.y !== baseline.baseOamY) {
          fail(side, age, `software OAM x2 effect/display lag drifted for slot ${reduced.spriteSlot}`);
        }
        geometryRows += 1;
        softwareOamRows += 1;
      }
    }
  }
  if (!timeline[firstInactiveAge]!.lifecycle.firstInactive
    || timeline.slice(0, firstInactiveAge).some((frame) => frame.lifecycle.firstInactive)
    || timeline[firstInactiveAge]!.platform.sourceX !== profile.platformInitialX
    || timeline[firstInactiveAge]!.battlers.some(({ x2 }) => x2 !== 0)) {
    fail(side, firstInactiveAge, "first task cleanup/reset drifted");
  }
  return {
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    source: {
      creationAge: profile.taskCreationAge,
      firstCallbackAge,
      sourceOffset: ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
      sourcePointer: ERUPTION_HORIZONTAL_SHAKE_SOURCE_BASE + ERUPTION_HORIZONTAL_SHAKE_SOURCE_OFFSET,
      capturedArgs: ERUPTION_HORIZONTAL_SHAKE_CAPTURED_ARGS,
      platformArgs: [5, 8, 60], battlerArgs: [4, 8, 60],
    },
    tasks: {
      platform: { slot: profile.platformTaskSlot, callback: "AnimTask_ShakePlatforms", rows: taskRows },
      battlers: { slot: profile.battlerTaskSlot, callback: "AnimTask_ShakeBattlers", rows: taskRows, spriteSlots: profile.battlers.map(({ spriteSlot }) => spriteSlot) },
      lifecycle: { lastCallbackAge, firstInactiveAge, callbackRows: ERUPTION_HORIZONTAL_SHAKE_CALLBACK_ROWS },
    },
    geometry: {
      attacker: rows[firstCallbackAge]!.animationBattlers.attacker,
      target: rows[firstCallbackAge]!.animationBattlers.target,
      battlers: profile.battlers,
    },
    resources: { loadedAge: profile.resources.loadedAge, freedAge: profile.resources.freedAge, paletteSlot: profile.resources.paletteSlot, tileRange: profile.resources.tileRange },
    checked: { rows: rows.length, taskRows, taskDataRows, geometryRows, softwareOamRows, hardwareOamPredecessorRows, rngRows, resourceRows },
  };
}

auditSource();
const result = {
  schema: "eruption-horizontal-shake-component-audit/v1",
  component: "task:AnimTask_HorizontalShake",
  move: "MOVE_ERUPTION",
  oracleProfile: "battle-scene-on",
  status: "unsupported-unfulfilled-component-audit",
  coverageCredit: false,
  ownership: {
    horizontalShakeOnly: true, launchRocks: false, fallingRocks: false, palette: false,
    audio: false, typedSeam: false, compositor: false, framebuffer: false,
    gameplay: false, damage: false, rngConsumption: false, controller: false,
  },
  sides: {
    "player-back": auditSide("player-back"),
    "opponent-front": auditSide("opponent-front"),
  },
};
console.log(JSON.stringify(result, null, 2));
