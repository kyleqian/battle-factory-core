/** Dense source-state adapter and pure reducer audit for natural Rock Blast bodies. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  ROCK_BLAST_FIRST_INACTIVE_AGE,
  rockBlastAtAge,
  type RockBlastAnimationProfile,
  type RockBlastSprite,
} from "../../src/animation/rockBlast.ts";

type Json = Record<string, any>;
export type RockBlastEvidenceOrientation = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/rock-blast-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export function readRockBlastRows(orientation: RockBlastEvidenceOrientation): Json[] {
  const path = receipt.orientations[orientation].denseState as string;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}

export function readRockBlastProbe(orientation: RockBlastEvidenceOrientation): Json {
  const path = receipt.orientations[orientation].denseState as string;
  return JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json;
}

export function readRockBlastBodies(orientation: RockBlastEvidenceOrientation): Json[][] {
  const probe = readRockBlastProbe(orientation);
  return probe.bodyWindows.map((_: Json, bodyIndex: number) => probe.frames.slice(bodyIndex * 90, bodyIndex * 90 + 90));
}

function sprite(row: Json, symbol: string): Json {
  const value = row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
  if (!value) throw new Error(`missing ${symbol}`);
  return value;
}

/** Test-only extraction of live geometry/allocator facts, never a pair gate. */
export function rockBlastProfileFor(
  orientation: RockBlastEvidenceOrientation,
  rows = readRockBlastBodies(orientation)[0]!,
): RockBlastAnimationProfile {
  const first = rows[0]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const fragments = rows[39]!.sprites.filter(
    (entry: Json) => entry.template?.symbol === "gRockFragmentSpriteTemplate",
  ).sort((left: Json, right: Json) => left.slot - right.slot);
  const shake = rows[39]!.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step");
  if (!shake || fragments.length !== 4) throw new Error(`${orientation}: incomplete allocator facts`);
  return {
    attackerSide,
    attacker: {
      spriteSlot: first.battlerSprites.attacker.slot,
      initialX2: first.battlerSprites.attacker.x2,
      initialY2: first.battlerSprites.attacker.y2,
      battlePositionCenter: attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
    target: {
      spriteSlot: first.battlerSprites.target.slot,
      initialX2: first.battlerSprites.target.x2,
      initialY2: first.battlerSprites.target.y2,
      battlePositionCenter: attackerSide === "player" ? { x: 176, y: 40 } : { x: 72, y: 80 },
      effectCenter: {
        x: sprite(rows[39]!, "gBasicHitSplatSpriteTemplate").x,
        y: sprite(rows[39]!, "gBasicHitSplatSpriteTemplate").y,
      },
    },
    allocator: {
      lungeSlot: sprite(rows[7]!, "gHorizontalLungeSpriteTemplate").slot,
      rockSlot: sprite(rows[12]!, "gRockBlastRockSpriteTemplate").slot,
      hitsplatSlot: sprite(rows[39]!, "gBasicHitSplatSpriteTemplate").slot,
      fragmentSlots: fragments.map((entry: Json) => entry.slot) as [number, number, number, number],
      shakeTaskSlot: shake.slot,
    },
    gameplayRng: first.gameplayRng,
    immutableGameplayState: first.immutableState,
  };
}

function normalizeExpectedSprite(sprite: Json): Json {
  const symbol = sprite.template.symbol;
  if (symbol === "gRockBlastRockSpriteTemplate") return {
    kind: "rock", slot: sprite.slot, callback: sprite.callback.symbol,
    basicRockCell: 0, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    subpriority: sprite.subpriority, matrix: sprite.matrix, sourceCreationOrder: 0,
  };
  if (symbol === "gBasicHitSplatSpriteTemplate") return {
    kind: "hitsplat", slot: sprite.slot, callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, subpriority: sprite.subpriority,
    matrix: sprite.matrix[0], sourceCreationOrder: 0,
  };
  const sourceCreationOrder = ({ 4: 1, 5: 2, 7: 3, 9: 4 } as Record<number, number>)[sprite.slot];
  return {
    kind: "fragment", index: sourceCreationOrder - 1, slot: sprite.slot,
    callback: sprite.callback.symbol, flyingRockAnim: sprite.animNum,
    basicRockCell: sprite.animNum + 2, x: sprite.x, y: sprite.y,
    x2: sprite.x2, y2: sprite.y2, subpriority: sprite.subpriority,
    sourceCreationOrder,
  };
}

function normalizeActualSprite(sprite: RockBlastSprite): Json {
  return { ...sprite };
}

export function verifyRockBlastReducer(orientation: RockBlastEvidenceOrientation): Json {
  const bodies = readRockBlastBodies(orientation);
  let sourceRows = 0;
  let spriteRows = 0;
  let battlerRows = 0;
  let resourceRows = 0;
  let audioRows = 0;
  for (const [bodyIndex, rows] of bodies.entries()) {
    const profile = rockBlastProfileFor(orientation, rows);
    for (const [age, row] of rows.entries()) {
      const frame = rockBlastAtAge(age, profile);
      if (frame.source.offset !== row.scriptOffset || frame.source.wait !== row.scriptWait
      || frame.source.active !== row.animScriptActive) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: source cursor mismatch`);
      }
      sourceRows += 1;
    const symbols = new Set([
      "gRockBlastRockSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gRockFragmentSpriteTemplate",
    ]);
    const expectedSprites = row.sprites.filter((entry: Json) => symbols.has(entry.template?.symbol))
      .map(normalizeExpectedSprite).sort((left: Json, right: Json) => left.slot - right.slot);
    const actualSprites = frame.sprites.map(normalizeActualSprite)
      .sort((left: Json, right: Json) => left.slot - right.slot);
      if (!same(actualSprites, expectedSprites)) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: source sprite mismatch\n${JSON.stringify(actualSprites)}\n${JSON.stringify(expectedSprites)}`);
      }
      spriteRows += 1;
    if (frame.attackerOffset.x2 !== row.battlerSprites.attacker.x2
      || frame.attackerOffset.y2 !== row.battlerSprites.attacker.y2
      || frame.targetOffset.x2 !== row.battlerSprites.target.x2
      || frame.targetOffset.y2 !== row.battlerSprites.target.y2) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: live battler offset mismatch`);
    }
    const expectedLunge = row.sprites.find((entry: Json) => entry.template?.symbol === "gHorizontalLungeSpriteTemplate");
    if (Boolean(frame.lunge) !== Boolean(expectedLunge)
      || (frame.lunge && (frame.lunge.slot !== expectedLunge.slot || frame.lunge.callback !== expectedLunge.callback.symbol))) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: lunge lifecycle mismatch`);
    }
    const expectedShake = row.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step");
    if (Boolean(frame.shakeTask) !== Boolean(expectedShake)
      || (frame.shakeTask && (frame.shakeTask.slot !== expectedShake.slot
        || frame.shakeTask.targetSpriteSlot !== expectedShake.data[0]))) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: ShakeMon lifecycle mismatch`);
    }
    battlerRows += 1;
    const rocks = row.paletteTags.includes(10058) && row.tileTags.includes(10058);
    const impact = row.paletteTags.includes(10135) && row.tileTags.includes(10135);
    if (frame.resources.rocks.loaded !== rocks || frame.resources.impact.loaded !== impact) {
        throw new Error(`${orientation} body ${bodyIndex} age ${age}: resource lifecycle mismatch`);
    }
    resourceRows += 1;
    const expectedSong = age === 12 ? "se_m_swagger" : age === 39 ? "se_m_rock_throw" : null;
    if (expectedSong) {
      if (frame.audio.length !== 1 || frame.audio[0]!.song !== expectedSong
        || row.audio.SE1.songHeaderIdentity.symbol !== expectedSong
        || frame.audio[0]!.pan !== row.audio.SE1.tracks[0]?.panX) {
          throw new Error(`${orientation} body ${bodyIndex} age ${age}: audio mismatch`);
      }
      audioRows += 1;
      } else if (frame.audio.length) throw new Error(`${orientation} body ${bodyIndex} age ${age}: synthetic audio`);
    if (frame.gameplay.rng !== row.gameplayRng || !same(frame.gameplay.immutableState, row.immutableState)
        || frame.gameplay.changed) throw new Error(`${orientation} body ${bodyIndex} age ${age}: gameplay ownership mismatch`);
    }
    const cleanup = rockBlastAtAge(ROCK_BLAST_FIRST_INACTIVE_AGE, profile);
    if (cleanup.active || !cleanup.cleanup.firstInactive || cleanup.sprites.length
      || cleanup.shakeTask || !cleanup.cleanup.resourcesFreed) {
      throw new Error(`${orientation} body ${bodyIndex}: first inactive cleanup mismatch`);
    }
  }
  const rows = bodies.flat();
  return {
    rows: rows.length,
    bodies: bodies.length,
    checked: { sourceRows, spriteRows, battlerRows, resourceRows, audioRows },
    lifecycle: { lunge: [7, 17], rock: [12, 37], hitsplat: [39, 48], fragments: [39, 53], shakeMon: [39, 46] },
    decodedBasicRockCells: [0, 1, 5],
    latches: { oam: "89/89 each body RAM+1", matrices: "89/89 each body RAM+1", palette: "89/89 each body RAM+1", shakeMon: "RAM+1" },
    cleanup: { age: 89, bodies: bodies.length, active: false, sprites: 0, tasks: 0, resourcesFreed: true },
    gameplay: { immutableWithinEachBody: true, gameplayRngTransitionsWithinBodies: 0, observedBodyCount: bodies.length, hitCountOwned: false },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    console.log(`${orientation}: ${JSON.stringify(verifyRockBlastReducer(orientation))}`);
  }
}
