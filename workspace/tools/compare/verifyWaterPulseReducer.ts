/**
 * Strict, hermetic component verifier for the MOVE_WATER_PULSE reducer.
 *
 * Dense maps remain dev-time evidence only.  This file never participates in
 * production imports or framebuffer acceptance; it proves the source reducer
 * and its typed Scene-ON seam against both retained semantic windows.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  WATER_PULSE_BLUE_RING_2_TAG,
  WATER_PULSE_FIRST_INACTIVE_AGE,
  WATER_PULSE_SMALL_BUBBLES_TAG,
  waterPulseAtAge,
  waterPulsePaletteCoefficientAtAge,
  type WaterPulseLiveInputs,
} from "../../src/animation/waterPulse.ts";
import {
  sceneOnWaterPulseView,
  type SceneOnWaterPulseConfig,
  type SceneOnWaterPulsePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type WaterPulseOrientation = "player-back" | "opponent-front";
type Side = WaterPulseOrientation;
const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const statePath: Record<Side, string> = {
  "player-back": "tools/compare/evidence/water-pulse-player-dense-state.json.gz",
  "opponent-front": "tools/compare/evidence/water-pulse-opponent-dense-state.json.gz",
};
const ownedTemplates = new Set([
  "gSimplePaletteBlendSpriteTemplate", "gWaterPulseBubbleSpriteTemplate",
  "gWaterPulseRingSpriteTemplate", "gWaterPulseRingBubbleSpriteTemplate",
]);
const ownedTasks = new Set(["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step"]);

function rowsFor(side: Side): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, statePath[side]))).toString("utf8")) as Json).frames;
}
function task(row: Json, callback: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === callback);
}
function sprites(row: Json, template: string): Json[] {
  return row.sprites.filter((entry: Json) => entry.template?.symbol === template);
}
function owned(row: Json): Json[] {
  return row.sprites.filter((entry: Json) => ownedTemplates.has(entry.template?.symbol)).sort((a: Json, b: Json) => a.slot - b.slot);
}
/** BG scroll registers retain their source's signed 9-bit offsets. */
function signedBgScroll(value: number): number { return value > 0xff ? value - 0x200 : value; }
function transitions(rows: Json[], select: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row), select(rows[age - 1]!)) ? [age] : []);
}
function lives(rows: Json[], template: string): readonly [number, number][] {
  const starts = new Map<number, number>();
  const result: [number, number][] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Set(sprites(row, template).map((sprite) => sprite.slot));
    for (const slot of current) if (!starts.has(slot)) starts.set(slot, age);
    for (const [slot, start] of starts) if (!current.has(slot)) {
      result.push([start, age - 1]); starts.delete(slot);
    }
  }
  for (const [slot, start] of starts) { void slot; result.push([start, rows.length - 1]); }
  return result.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
}

function inputsFor(rows: Json[], side: Side): WaterPulseLiveInputs {
  const simple = sprites(rows[10]!, "gSimplePaletteBlendSpriteTemplate")[0];
  const bubbles = sprites(rows[22]!, "gWaterPulseBubbleSpriteTemplate").sort((a: Json, b: Json) => a.slot - b.slot);
  const rings = [72, 79, 86].map((age) =>
    sprites(rows[age]!, "gWaterPulseRingSpriteTemplate").find((sprite) => sprite.data[0] === 1));
  const ringBubbles = [86, 93, 100, 101, 108, 115].flatMap((age) =>
    sprites(rows[age]!, "gWaterPulseRingBubbleSpriteTemplate")
      .filter((sprite) => sprite.data[0] >= 19).sort((a: Json, b: Json) => a.slot - b.slot));
  const update = task(rows[7]!, "Task_UpdateMonBg");
  const clear = task(rows[155]!, "Task_ClearMonBg");
  const shake = task(rows[101]!, "AnimTask_ShakeMon_Step");
  invariant(simple && bubbles.length === 5 && rings.every(Boolean) && ringBubbles.length === 12
    && update && clear && shake, `${side}: live allocation facts`);
  const smallTileSlot = rows[1]!.tileTags.indexOf(WATER_PULSE_SMALL_BUBBLES_TAG);
  const smallPaletteBank = rows[1]!.paletteTags.indexOf(WATER_PULSE_SMALL_BUBBLES_TAG);
  const ringTileSlot = rows[4]!.tileTags.indexOf(WATER_PULSE_BLUE_RING_2_TAG);
  const ringPaletteBank = rows[4]!.paletteTags.indexOf(WATER_PULSE_BLUE_RING_2_TAG);
  invariant(smallTileSlot >= 0 && smallPaletteBank >= 0 && ringTileSlot >= 0 && ringPaletteBank >= 0,
    `${side}: resource allocation`);
  const attacker = rows[0]!.battlerSprites.attacker;
  const target = rows[0]!.battlerSprites.target;
  const layer = side === "player-back" ? "bg1" as const : "bg2" as const;
  return {
    attackerSide: side === "player-back" ? "player" : "opponent",
    targetSide: side === "player-back" ? "opponent" : "player",
    attackerSpecies: "WOBBUFFET",
    targetSpecies: "ONIX",
    attackerCenter: { x: attacker.x, y: attacker.y },
    targetCenter: { x: target.x, y: target.y },
    targetPictureCenter: { x: simple.x, y: simple.y },
    attackerRingOrigin: { x: rings[0]!.x, y: rings[0]!.y },
    targetRingCenter: { x: rings[0]!.data[1], y: rings[0]!.data[2] },
    attackerSpriteSlot: attacker.slot,
    targetSpriteSlot: target.slot,
    attackerSubpriority: attacker.subpriority,
    targetSubpriority: target.subpriority,
    targetInitialOffset: { x: target.x2, y: target.y2 },
    simplePaletteSpriteSlot: simple.slot,
    smallBubbleSlots: bubbles.map((sprite) => sprite.slot) as WaterPulseLiveInputs["smallBubbleSlots"],
    ringSlots: rings.map((sprite) => sprite.slot) as WaterPulseLiveInputs["ringSlots"],
    ringBubbleSlots: ringBubbles.map((sprite) => sprite.slot) as WaterPulseLiveInputs["ringBubbleSlots"],
    ringMatrixSlots: rings.map((sprite) => sprite.matrixNum) as WaterPulseLiveInputs["ringMatrixSlots"],
    ringBubbleMatrixSlots: ringBubbles.map((sprite) => sprite.matrixNum) as WaterPulseLiveInputs["ringBubbleMatrixSlots"],
    smallBubbles: { tileSlot: smallTileSlot, paletteBank: smallPaletteBank,
      tileRange: rows[1]!.resourceAllocators.tileRanges[smallTileSlot] as readonly [number, number] },
    blueRing2: { tileSlot: ringTileSlot, paletteBank: ringPaletteBank,
      tileRange: rows[4]!.resourceAllocators.tileRanges[ringTileSlot] as readonly [number, number] },
    updateMonBgTaskSlot: update.slot,
    clearMonBgTaskSlot: clear.slot,
    shakeTaskSlot: shake.slot,
    monBg: {
      layer, layerId: update.data[0], snapshot: { x: update.data[1], y: update.data[2] },
      baseScroll: { x: update.data[3], y: update.data[4] },
      activeCnt: rows[8]!.registers[`${layer}cnt`], inactiveCnt: rows[0]!.registers[`${layer}cnt`],
    },
    initialMatrixBitmap: rows[0]!.resourceAllocators.matrixBitmap,
    spriteOrder: rows[0]!.spriteOrder,
    animationRngSeed: rows[0]!.animationRng,
  };
}

/** Build a seam config from current facts, never from a party identity gate. */
export function waterPulseConfigFor(side: Side, rows: Json[]): SceneOnWaterPulseConfig {
  const input = inputsFor(rows, side);
  const attacker = rows[0]!.battlerSprites.attacker;
  const target = rows[0]!.battlerSprites.target;
  const { attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    move: "WATER_PULSE",
    attacker: { species: "WOBBUFFET", geometry: {
      side: input.attackerSide, spriteCorner: { x: attacker.x - 32, y: attacker.y - 32 },
      animationCenter: input.attackerCenter, battlePositionCenter: input.attackerCenter,
    } },
    target: { species: "ONIX", geometry: {
      side: input.targetSide, spriteCorner: { x: target.x - 32, y: target.y - 32 },
      animationCenter: input.targetCenter, battlePositionCenter: input.targetCenter,
    } },
    fieldProfile: { playerHp: rows[0]!.battlers.player.hp, playerMaxHp: rows[0]!.battlers.player.maxHp,
      opponentHp: rows[0]!.battlers.opponent.hp, opponentMaxHp: rows[0]!.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male" },
    animationInputs,
  };
}

function sceneState(age: number, input: WaterPulseLiveInputs): SceneOnWaterPulsePresentationState {
  const { attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    age,
    config: {
      move: "WATER_PULSE",
      attacker: { species: input.attackerSpecies, geometry: {
        side: input.attackerSide, spriteCorner: input.attackerCenter,
        animationCenter: input.attackerCenter, battlePositionCenter: input.attackerCenter,
      } },
      target: { species: input.targetSpecies, geometry: {
        side: input.targetSide, spriteCorner: input.targetCenter,
        animationCenter: input.targetCenter, battlePositionCenter: input.targetCenter,
      } },
      fieldProfile: {}, animationInputs,
    },
  } as unknown as SceneOnWaterPulsePresentationState;
}

function expectedSprite(row: Json): Json[] {
  return owned(row).map((sprite) => ({
    slot: sprite.slot, callback: sprite.callback.symbol, x: sprite.x, y: sprite.y,
    x2: sprite.x2, y2: sprite.y2, data: sprite.data, subpriority: sprite.subpriority,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix,
  }));
}
function actualSprite(state: ReturnType<typeof waterPulseAtAge>): Json[] {
  return state.sprites.map((sprite) => ({
    slot: sprite.slot, callback: sprite.callback, x: sprite.x, y: sprite.y,
    x2: sprite.x2, y2: sprite.y2, data: sprite.data, subpriority: sprite.subpriority,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix,
  }));
}
function expectedTasks(row: Json): Json[] {
  return row.tasks.filter((entry: Json) => ownedTasks.has(entry.func?.symbol)).map((entry: Json) => ({
    slot: entry.slot, callback: entry.func.symbol, data: entry.data,
  })).sort((left: Json, right: Json) => left.slot - right.slot);
}
function expectedAudio(age: number, input: WaterPulseLiveInputs): unknown {
  const attackerPan: -64 | 63 = input.attackerSide === "player" ? -64 : 63;
  const targetPan: -64 | 63 = input.targetSide === "player" ? -64 : 63;
  if (age === 10) return { events: [{ channel: "SE1", sound: "SE_M_BUBBLE3", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }] };
  if (age === 22) return { events: [{ channel: "SE1", sound: "SE_M_BUBBLE3", sourcePan: "SOUND_PAN_TARGET", pan: targetPan }] };
  if (age === 72 || age === 79 || age === 86) return { events: [{ channel: "SE1", sound: "SE_M_GIGA_DRAIN", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }] };
  return { events: [] };
}

function runSide(side: Side): Json {
  const rows = rowsFor(side);
  invariant(rows.length === 160, `${side}: complete retained root window`);
  const input = inputsFor(rows, side);
  const selected = input.monBg.layer;
  for (const [age, row] of rows.entries()) {
    const reduced = waterPulseAtAge(age, input);
    const seam = sceneOnWaterPulseView(sceneState(age, input));
    invariant(same(reduced, Object.fromEntries(Object.entries(seam).filter(([key]) => key !== "attacker" && key !== "target"))),
      `${side}: typed seam row ${age}`);
    invariant(reduced.source.pointerOffset === row.scriptOffset && reduced.source.wait === row.scriptWait
      && reduced.active === row.animScriptActive, `${side}: root cursor ${age}`);
    invariant(same(actualSprite(reduced), expectedSprite(row)), `${side}: source-owned sprites ${age}`);
    invariant(same(reduced.tasks, expectedTasks(row)), `${side}: source-owned tasks ${age}`);
    invariant(same(reduced.targetOffset, { x: row.battlerSprites.target.x2, y: row.battlerSprites.target.y2 }),
      `${side}: target offset ${age}`);
    invariant(reduced.resources.smallBubbles.loaded === row.tileTags.includes(WATER_PULSE_SMALL_BUBBLES_TAG)
      && reduced.resources.smallBubbles.loaded === row.paletteTags.includes(WATER_PULSE_SMALL_BUBBLES_TAG)
      && reduced.resources.blueRing2.loaded === row.tileTags.includes(WATER_PULSE_BLUE_RING_2_TAG)
      && reduced.resources.blueRing2.loaded === row.paletteTags.includes(WATER_PULSE_BLUE_RING_2_TAG), `${side}: resource tags ${age}`);
    invariant(reduced.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap,
      `${side}: matrix allocation ${age}`);
    invariant(reduced.rng.animationAfter === row.animationRng && reduced.rng.gameplay === "untouched",
      `${side}: animation RNG ${age}`);
    invariant(same(reduced.audio, expectedAudio(age, input)), `${side}: source audio ${age}`);
    const paletteAge = age === 7 ? age : Math.max(0, age - 1);
    invariant(reduced.palette.softwareCoefficient === waterPulsePaletteCoefficientAtAge(age)
      && reduced.palette.hardwareCoefficient === waterPulsePaletteCoefficientAtAge(paletteAge)
      && reduced.displayTransfer.palettes === (age === 0 ? "current-faded"
        : age === 7 ? "current-faded-monbg-setup" : "preceding-faded"), `${side}: palette mechanism ${age}`);
    invariant(reduced.cleanup.visualTasks === row.visualTaskCount && reduced.cleanup.soundTasks === row.soundTaskCount,
      `${side}: visual/sound task ownership ${age}`);
    invariant(reduced.registers.hardwareCnt === row.registers[`${selected}cnt`]
      && same(reduced.registers.hardwareScroll, { x: signedBgScroll(row.registers[`${selected}hofs`]), y: signedBgScroll(row.registers[`${selected}vofs`]) }),
    `${side}: register transfer ${age}`);
    const expectedSoftwareScroll = age >= 7 && age <= 157
      ? { x: row.battleBg[`gBattle_${selected.toUpperCase()}_X`], y: row.battleBg[`gBattle_${selected.toUpperCase()}_Y`] }
      : null;
    invariant(same(reduced.background.softwareScroll, expectedSoftwareScroll), `${side}: monbg scroll ${age}`);
    const ownedSlots = new Set(reduced.sprites.map((sprite) => sprite.slot));
    invariant(same(reduced.order.ownedSlots, row.spriteOrder.filter((slot: number) => ownedSlots.has(slot))),
      `${side}: source sort order ${age}`);
  }
  invariant(same(lives(rows, "gWaterPulseBubbleSpriteTemplate"), [[22, 40], [22, 50], [22, 55], [22, 60], [22, 70]]), `${side}: five bubble lives`);
  invariant(same(lives(rows, "gWaterPulseRingSpriteTemplate"), [[72, 111], [79, 118], [86, 125]]), `${side}: ring lives`);
  invariant(same(lives(rows, "gSimplePaletteBlendSpriteTemplate"), [[10, 23], [136, 153]]), `${side}: simple palette lives`);
  invariant(same(transitions(rows, (row) => row.bgVram), [8, 157, 159]), `${side}: BG VRAM edges`);
  invariant(same(transitions(rows, (row) => row.fadedPalette), [1, 4, 7, 11, 13, 15, 17, 138, 141, 144, 147])
    && same(transitions(rows, (row) => row.hardwarePalette), [2, 5, 7, 12, 14, 16, 18, 139, 142, 145, 148]),
  `${side}: source and hardware palette edges`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)
    && same(row.hardwareMatrices, rows[index]!.softwareMatrices)), `${side}: own OAM/matrix predecessor latch`);
  const paletteExceptions = rows.slice(1).flatMap((row, index) => same(row.hardwarePalette, rows[index]!.fadedPalette) ? [] : [index + 1]);
  invariant(same(paletteExceptions, [7]), `${side}: own palette latch exception`);
  invariant(rows[159]!.animScriptActive === false && owned(rows[159]!).length === 0
    && expectedTasks(rows[159]!).length === 0, `${side}: clean first inactive`);
  return {
    reducerRows: rows.length,
    seamRows: rows.length,
    lifecycle: {
      smallBubbles: "22..70", rings: "72..111 / 79..118 / 86..125",
      ringBubblePairs: "86,93,100,101,108,115", simplePalette: "10..23 / 136..153",
      updateMonBg: "7..157", clearMonBg: "155..157", shake: "101..134", firstInactive: 159,
    },
    latches: {
      oam: "159/159 predecessor", matrices: "159/159 predecessor",
      palettes: "158/159 predecessor; source age 7 same-row monbg setup", bgVram: "8/157/159",
    },
    cleanup: { age: WATER_PULSE_FIRST_INACTIVE_AGE, active: false, visualTasks: 0, sprites: 0, framebufferCompared: false },
  };
}

export function verifyWaterPulseReducer(): Json {
  const result: Json = {};
  for (const side of ["player-back", "opponent-front"] as const) {
    const first = runSide(side);
    invariant(same(runSide(side), first), `${side}: deterministic second replay`);
    result[side] = first;
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyWaterPulseReducer(), null, 2));
}
