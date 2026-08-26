/** Strict source/state audit for Move_ERUPTION's falling-rock sprite component. */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  ERUPTION_FALLING_ROCK_DEFAULT_GEOMETRY,
  ERUPTION_FALLING_ROCK_SOURCE_BASE,
  ERUPTION_FALLING_ROCK_SOURCE_CALLS,
  ERUPTION_FALLING_ROCK_TILE_OFFSETS,
  ERUPTION_FALLING_ROCK_WARM_ROCK_TAG,
  type EruptionFallingRockFrame,
  type EruptionFallingRockProfile,
  eruptionFallingRockTimeline,
} from "../../src/animation/eruptionFallingRock.ts";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");
const fail = (side: Side, age: number | string, message: string): never => {
  throw new Error(`${side} falling-rock audit age ${age}: ${message}`);
};

function requireToken(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

function rowsFor(side: Side): Json[] {
  const archive = `tools/compare/evidence/eruption-${side === "player-back" ? "player" : "opponent"}-dense-state.json.gz`;
  const evidence = JSON.parse(gunzipSync(readFileSync(resolve(root, archive))).toString("utf8")) as Json;
  if (evidence.schema !== "eruption-dense-evidence/v1" || evidence.profile !== "battle-scene-on" || evidence.move !== 284) {
    throw new Error(`${side}: dense evidence identity drifted`);
  }
  const rows = evidence.frames as Json[];
  const expectedLength = side === "player-back" ? 476 : 494;
  if (rows.length !== expectedLength) throw new Error(`${side}: retained dense row count drifted`);
  return rows;
}

function falling(row: Json): Json[] {
  return row.sprites
    .filter((sprite: Json) => sprite.template?.symbol === "gEruptionFallingRockSpriteTemplate")
    .sort((a: Json, b: Json) => a.slot - b.slot);
}

function profileFor(side: Side, rows: Json[]): EruptionFallingRockProfile {
  const creationAge = rows.findIndex((row) => falling(row).length !== 0);
  if (creationAge < 0) throw new Error(`${side}: falling-rock creation missing`);
  const first = falling(rows[creationAge]!);
  if (first.length !== 6) throw new Error(`${side}: expected six falling-rock creations`);
  const slots = first.map((sprite) => sprite.slot) as readonly number[];
  const baseTile = rows[creationAge]!.allocators.tileRanges[6][0] as number;
  const calls = first.map((sprite) => {
    const tileOffset = ((sprite.attr[2] & 0x3ff) - baseTile);
    const sourceY = sprite.data[0] === 1 ? sprite.y - 8 : sprite.y;
    const sourceDelay = sprite.data[0] === 0 ? sprite.data[6] + 1 : 0;
    return [sprite.x, sourceY, sourceDelay, sprite.data[7], tileOffset / 16, 0, 0, 0] as const;
  }) as EruptionFallingRockProfile["calls"];
  if (!same(calls, ERUPTION_FALLING_ROCK_SOURCE_CALLS)) throw new Error(`${side}: source call tuples drifted`);
  if (!same(first.map((sprite) => (sprite.attr[2] & 0x3ff) - baseTile), ERUPTION_FALLING_ROCK_TILE_OFFSETS)) {
    throw new Error(`${side}: Warm Rock tile offsets drifted`);
  }
  const loadedAge = rows.findIndex((row) => row.allocators.tileTags[6] === ERUPTION_FALLING_ROCK_WARM_ROCK_TAG);
  const freedAge = rows.findIndex((row, age) => age > loadedAge && row.allocators.tileTags[6] !== ERUPTION_FALLING_ROCK_WARM_ROCK_TAG);
  const paletteSlot = rows[loadedAge]!.allocators.paletteTags.indexOf(ERUPTION_FALLING_ROCK_WARM_ROCK_TAG);
  if (loadedAge < 0 || freedAge < 0 || paletteSlot < 0) throw new Error(`${side}: Warm Rock allocator lifetime missing`);
  const firstSprite = first[0]!;
  const geometry = {
    oamCenterOffsetX: firstSprite.x - (firstSprite.attr[1] & 0x1ff),
    oamCenterOffsetY: (firstSprite.y - (firstSprite.attr[0] & 0xff) + 256) & 0xff,
    subpriority: firstSprite.subpriority,
    oamPriority: (firstSprite.attr[2] >> 10) & 3,
    horizontalFlip: (firstSprite.attr[1] & 0x8000) !== 0,
  };
  const firstInactiveAge = rows.findIndex((row, age) => age > creationAge && falling(row).length === 0);
  const expectedCreationAge = side === "player-back" ? 215 : 233;
  if (creationAge !== expectedCreationAge || firstInactiveAge !== creationAge + 109) {
    throw new Error(`${side}: creation/first-inactive ages drifted`);
  }
  return {
    creationAge,
    endAge: rows.length - 1,
    calls,
    geometry,
    allocator: {
      freeSpriteSlots: slots,
      tileTag: ERUPTION_FALLING_ROCK_WARM_ROCK_TAG,
      paletteTag: ERUPTION_FALLING_ROCK_WARM_ROCK_TAG,
      tileRange: rows[loadedAge]!.allocators.tileRanges[6],
      tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      paletteSlot,
      loadedAge,
      freedAge,
    },
    startingAnimationRng: rows[0]!.animationRng,
  };
}

function expectedSprite(sprite: Json, age: number, profile: EruptionFallingRockProfile): Json {
  const sourceOrderIndex = profile.allocator.freeSpriteSlots.indexOf(sprite.slot);
  const tileOffset = ((sprite.attr[2] & 0x3ff) - profile.allocator.tileRange[0]);
  return {
    slot: sprite.slot,
    sourceOrderIndex,
    template: sprite.template.symbol,
    templateCallback: "AnimEruptionFallingRock",
    callback: sprite.callback.symbol,
    birthAge: profile.creationAge,
    localAge: age - profile.creationAge,
    state: sprite.data[0],
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    oamPriority: (sprite.attr[2] >> 10) & 3,
    invisible: sprite.invisible,
    data: sprite.data,
    tileOffset,
    paletteSlot: profile.allocator.paletteSlot,
    attr: sprite.attr,
    displayedInOam: age > profile.creationAge,
  };
}

function compareFrame(side: Side, age: number, row: Json, previous: Json | undefined, next: Json | undefined, frame: EruptionFallingRockFrame, profile: EruptionFallingRockProfile): void {
  if (row.scriptOwner !== "Move_ERUPTION") fail(side, age, "source owner drifted");
  if (!same(frame.animationRng, row.animationRng)) fail(side, age, "animation RNG changed");
  if (frame.animationRngTransition.previous !== (age > 0 ? previous!.animationRng : null)) fail(side, age, "animation RNG predecessor drifted");
  if (frame.animationRngTransition.next !== (age < profile.endAge ? next!.animationRng : null)) fail(side, age, "animation RNG successor drifted");
  const source = frame.source;
  if (age < profile.creationAge) {
    if (source !== null) fail(side, age, "source cursor exposed before falling creates");
  } else {
    if (!source) fail(side, age, "source cursor missing");
    const expected = { offset: row.scriptOffset, pointer: row.scriptPtr, pointerParity: row.scriptPtrParity, wait: row.scriptWait, args: row.animArgs };
    if (!same(source, expected)) fail(side, age, `source cursor/args mismatch ${JSON.stringify({ expected, actual: source })}`);
    if (row.scriptPtr !== ERUPTION_FALLING_ROCK_SOURCE_BASE + row.scriptOffset) fail(side, age, "source pointer/base mismatch");
  }
  const actualSprites = falling(row).map((sprite) => expectedSprite(sprite, age, profile));
  if (!same(frame.sprites, frame.sprites.slice().sort((a, b) => a.slot - b.slot))) fail(side, age, "reducer sprite order is not allocator order");
  if (!same(frame.sprites, actualSprites)) fail(side, age, `sprite state mismatch ${JSON.stringify({ expected: actualSprites, actual: frame.sprites })}`);
  const expectedActive = actualSprites.length;
  if (frame.visual.activeSprites !== expectedActive || frame.visual.createdSprites !== (age >= profile.creationAge ? 6 : 0)
    || frame.visual.ownedVisualTaskCount !== 0) fail(side, age, "falling visual count drifted");
  const priorSlots = previous ? new Set(falling(previous).map((sprite) => sprite.slot)) : new Set<number>();
  const currentSlots = new Set(actualSprites.map((sprite) => sprite.slot));
  const destroyed = [...priorSlots].filter((slot) => !currentSlots.has(slot)).sort((a, b) => a - b);
  if (!same(frame.destroyedSlots, destroyed)) fail(side, age, "sprite destruction edge drifted");
  const tags = row.allocators.tileTags;
  const palettes = row.allocators.paletteTags;
  const loaded = tags[6] === ERUPTION_FALLING_ROCK_WARM_ROCK_TAG;
  const retained = age >= profile.allocator.loadedAge && age < profile.allocator.freedAge!;
  const expectedTileRange = age < profile.allocator.loadedAge
    ? profile.allocator.tileRangeBeforeLoad
    : profile.allocator.tileRange;
  if (!same(row.allocators.tileRanges[6], expectedTileRange)
    || !same(frame.resources.tileRange, row.allocators.tileRanges[6])
    || frame.resources.tileAllocationRetained !== retained
    || frame.resources.paletteAllocationRetained !== retained
    || frame.resources.paletteSlot !== profile.allocator.paletteSlot
    || (palettes[profile.allocator.paletteSlot] === ERUPTION_FALLING_ROCK_WARM_ROCK_TAG) !== retained) {
    fail(side, age, "Warm Rock resource lifetime drifted");
  }
  const expectedTransfer = age > 0 && same(row.hardwareOam, previous!.softwareOam);
  if (frame.oamTransfer.hardwareEqualsPrecedingSoftware !== expectedTransfer || frame.oamTransfer.transferLagRows !== 1) {
    fail(side, age, "software-to-hardware OAM predecessor timing drifted");
  }
  const firstInactive = age === profile.creationAge + 109;
  if (frame.cleanup.firstInactive !== firstInactive || frame.cleanup.activeSprites !== expectedActive || frame.cleanup.active !== (expectedActive !== 0)) {
    fail(side, age, "first inactive cleanup state drifted");
  }
}

function auditSourceAndAsset(): void {
  const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
  const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
  for (const token of [
    "const struct SpriteTemplate gEruptionFallingRockSpriteTemplate =",
    ".callback = AnimEruptionFallingRock,",
    "static void AnimEruptionFallingRock(struct Sprite *sprite)",
    "static void AnimEruptionFallingRock_Step(struct Sprite *sprite)",
    "sprite->sFallDelay = gBattleAnimArgs[2];",
    "sprite->sTargetY = gBattleAnimArgs[3];",
    "sprite->oam.tileNum += gBattleAnimArgs[4] * 16;",
    "sprite->y += 8;",
    "if (++sprite->sEndTimer > 16)",
    "DestroyAnimSprite(sprite);",
  ]) requireToken(fire, token, "Eruption falling-rock source");
  const body = scripts.slice(scripts.indexOf("Move_ERUPTION:"), scripts.indexOf("Move_SKILL_SWAP:"));
  for (const token of [
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 200, -32, 0, 100, 0",
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 30, -32, 16, 90, 1",
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 150, -32, 32, 60, 2",
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 90, -32, 48, 80, 3",
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 110, -32, 64, 50, 0",
    "createsprite gEruptionFallingRockSpriteTemplate, ANIM_ATTACKER, 40, 60, -32, 80, 70, 1",
    "delay 22",
    "delay 80",
  ]) requireToken(body, token, "Move_ERUPTION source");
  const asset = JSON.parse(read("src/animation/assets/eruption-warm-rock.json")) as Json;
  const fallingAsset = asset.templates?.falling;
  if (!fallingAsset
    || fallingAsset.symbol !== "gEruptionFallingRockSpriteTemplate"
    || fallingAsset.callback !== "AnimEruptionFallingRock"
    || fallingAsset.oam.shape !== "32x32" || fallingAsset.oam.size !== "32x32"
    || fallingAsset.oam.affine !== false || fallingAsset.oam.objMode !== "NORMAL" || fallingAsset.oam.priority !== 2
    || fallingAsset.animation.table !== "gDummySpriteAnimTable"
    || fallingAsset.animation.cellSelection !== "gBattleAnimArgs[4] * 16"
    || !same(fallingAsset.animation.tileOffsets, [0, 16, 32, 48])
    || !same(fallingAsset.animation.scriptFrameArgs, [0, 1, 2, 3, 0, 1])) {
    throw new Error("Warm Rock falling template asset drifted");
  }
}

function auditSide(side: Side): Json {
  const rows = rowsFor(side);
  const profile = profileFor(side, rows);
  const replay = eruptionFallingRockTimeline(profile);
  const firstInactiveAge = profile.creationAge + 109;
  let spriteRows = 0;
  let transferRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const previous = age > 0 ? rows[age - 1] : undefined;
    const frame = replay.frames[age]!;
    compareFrame(side, age, row, previous, age + 1 < rows.length ? rows[age + 1] : undefined, frame, profile);
    spriteRows += falling(row).length;
    if (age > 0 && same(row.hardwareOam, previous!.softwareOam)) transferRows += 1;
  }
  const expectedLifecycle = replay.lifecycle.map((life) => ({
    slot: life.slot,
    sourceOrderIndex: life.sourceOrderIndex,
    birthAge: life.birthAge,
    destroyAge: life.destroyAge,
    lastVisibleAge: life.lastVisibleAge,
    tileOffset: life.tileOffset,
  }));
  const firstInactive = rows.findIndex((row, age) => age > profile.creationAge && falling(row).length === 0);
  if (firstInactive !== firstInactiveAge || !same(replay.frames[firstInactiveAge]!.destroyedSlots, [10])) {
    throw new Error(`${side}: first inactive destruction boundary drifted`);
  }
  return {
    sourceWindow: { startFrame: rows[0]!.frame, endFrame: rows.at(-1)!.frame, frameCount: rows.length },
    creation: { age: profile.creationAge, frame: rows[profile.creationAge]!.frame, count: 6, slots: profile.allocator.freeSpriteSlots, tileOffsets: ERUPTION_FALLING_ROCK_TILE_OFFSETS },
    lifecycle: expectedLifecycle,
    source: { phases: [153, 187, 204], pointerBase: ERUPTION_FALLING_ROCK_SOURCE_BASE, rowsChecked: rows.length },
    resources: { loadedAge: profile.allocator.loadedAge, freedAge: profile.allocator.freedAge, tileRange: profile.allocator.tileRange, tileRangeBeforeLoad: profile.allocator.tileRangeBeforeLoad, paletteSlot: profile.allocator.paletteSlot },
    counts: { spriteRows, transferRows, firstInactiveAge },
    status: "unsupported-unfulfilled-component-audit",
  };
}

auditSourceAndAsset();
const result = {
  component: "sprite:gEruptionFallingRockSpriteTemplate",
  move: "MOVE_ERUPTION",
  oracleProfile: "battle-scene-on",
  status: "unsupported-unfulfilled-component-audit",
  coverageCredit: false,
  ownership: { fallingRockSpriteOnly: true, task: false, shake: false, palette: false, audio: false, gameplay: false, rngConsumption: false, framebuffer: false },
  sides: { "player-back": auditSide("player-back"), "opponent-front": auditSide("opponent-front") },
};
console.log(JSON.stringify(result, null, 2));
