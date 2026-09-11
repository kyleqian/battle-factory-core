/**
 * Hermetic, dense semantic replay for both source-owned MOVE_DIG bodies.
 *
 * The compressed rows are development evidence consumed by this comparator
 * only.  `src/animation/dig.ts` receives live geometry/allocation facts and
 * is intentionally independent of this file and of any framebuffer.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  DIG_DIRT_MOUND_TAG,
  DIG_IMPACT_TAG,
  DIG_MUD_SAND_TAG,
  DIG_SETUP_FIRST_INACTIVE_AGE,
  DIG_SOURCE_START,
  DIG_UNLEASH_FIRST_INACTIVE_AGE,
  digAtAge,
  type DigBody,
  type DigLiveInputs,
  type DigState,
} from "../../src/animation/dig.ts";
import {
  sceneOnDigView,
  type SceneOnDigConfig,
  type SceneOnDigPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type DigOrientation = "player-back" | "opponent-front";
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const BODY_LENGTH: Record<DigBody, number> = { setup: 195, unleash: 68 };
const FIRST_INACTIVE: Record<DigBody, number> = {
  setup: DIG_SETUP_FIRST_INACTIVE_AGE,
  unleash: DIG_UNLEASH_FIRST_INACTIVE_AGE,
};
const SIDE_FILE: Record<DigOrientation, string> = {
  "player-back": "player",
  "opponent-front": "opponent",
};
const OWN_TEMPLATES = new Set([
  "gDirtMoundSpriteTemplate", "gDirtPlumeSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
]);
const OWN_TASKS = new Set([
  "AnimTask_DigBounceMovement", "AnimTask_DigRiseUpFromHole",
  "Task_UpdateMonBg", "Task_ClearMonBg", "Task_ClearMonBgStatic",
  "AnimTask_ShakeMon_Step",
]);
const PLUME_STARTS = [18, 52, 86, 120, 154] as const;
const DISPLAY_HEIGHT = 160;
const RETAINED_SCANLINE_WORDS = DISPLAY_HEIGHT * 2;
const CANONICAL_EVIDENCE = {
  attacker: { name: "VIBRAVA", speciesId: 333 },
  target: { name: "CHANSEY", speciesId: 113 },
} as const;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function rowsFor(side: DigOrientation): Json[] {
  const path = resolve(ROOT, `tools/compare/evidence/dig-${SIDE_FILE[side]}-dense-state.json.gz`);
  return (JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as Json).frames;
}
function phaseRows(rows: Json[], body: DigBody): Json[] {
  const start = body === "setup" ? 0 : BODY_LENGTH.setup;
  return rows.slice(start, start + BODY_LENGTH[body]);
}
function spriteEntries(row: Json, template?: string): Json[] {
  return row.sprites.filter((sprite: Json) =>
    OWN_TEMPLATES.has(sprite.template?.symbol)
    && (template === undefined || sprite.template?.symbol === template));
}
function taskEntry(row: Json, callback: string): Json | undefined {
  return row.tasks.find((task: Json) => task.func?.symbol === callback);
}
function allocation(rows: Json[], tag: number, rowNumber: number): {
  tileSlot: number; paletteBank: number; tileRange: readonly [number, number];
} {
  const row = rows[rowNumber]!;
  const tileSlot = row.tileTags.indexOf(tag);
  const paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `resource ${tag} is not allocated at ${rowNumber}`);
  return { tileSlot, paletteBank, tileRange: row.resourceAllocators.tileRanges[tileSlot] };
}
function signedBg(value: number): number { return value > 0xff ? value - 0x200 : value; }
function selectedBg(row: Json, side: DigOrientation): { x: number; y: number } {
  const layer = side === "player-back" ? "2" : "1";
  return {
    x: row.battleBg[`gBattle_BG${layer}_X`],
    y: row.battleBg[`gBattle_BG${layer}_Y`],
  };
}
function selectedRegisters(row: Json, side: DigOrientation) {
  const layer = side === "player-back" ? "bg2" : "bg1";
  return {
    cnt: row.registers[`${layer}cnt`],
    scroll: {
      x: signedBg(row.registers[`${layer}hofs`]),
      y: signedBg(row.registers[`${layer}vofs`]),
    },
  };
}
/**
 * The probe samples the first 320 u16 values from each 0x3C0-word source
 * bank.  Dig's `SetDigScanlineEffect` writes only visible entries 0..159;
 * entries 160..319 are a retained, caller-owned witness.  Keeping exactly
 * this sampled prefix makes the reducer comparison source-accurate without
 * claiming the physical source bank is only 320 words long.
 */
function normalizedScanlineWitness(row: Json, label: string): {
  state: 0 | 1 | 3;
  srcBuffer: 0 | 1;
  dmaDest: number;
  dmaControl: number;
  buffers: [number[], number[]];
} {
  const banks = row.scanlineBuffers;
  invariant(Array.isArray(banks) && banks.length === 2
    && banks.every((bank: unknown) => Array.isArray(bank) && bank.length === RETAINED_SCANLINE_WORDS),
  `${label}: expected two ${RETAINED_SCANLINE_WORDS}-word scanline witnesses`);
  return {
    state: row.scanline.state as 0 | 1 | 3,
    srcBuffer: row.scanline.srcBuffer as 0 | 1,
    dmaDest: row.scanline.dmaDest,
    dmaControl: row.scanline.dmaControl,
    buffers: [
      [...banks[0].slice(0, RETAINED_SCANLINE_WORDS)],
      [...banks[1].slice(0, RETAINED_SCANLINE_WORDS)],
    ],
  };
}
function assertCanonicalEvidenceSpecies(row: Json, side: DigOrientation, label: string): void {
  const attackerSide = side === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = row.battlers[attackerSide];
  const target = row.battlers[targetSide];
  invariant(attacker?.species === CANONICAL_EVIDENCE.attacker.speciesId
    && target?.species === CANONICAL_EVIDENCE.target.speciesId
    && row.parties[attackerSide]?.[attacker.partyIndex]?.species === CANONICAL_EVIDENCE.attacker.speciesId
    && row.parties[targetSide]?.[target.partyIndex]?.species === CANONICAL_EVIDENCE.target.speciesId
    && row.battlerSprites.attacker?.data?.[2] === CANONICAL_EVIDENCE.attacker.speciesId
    && row.battlerSprites.target?.data?.[2] === CANONICAL_EVIDENCE.target.speciesId,
  `${label}: retained VIBRAVA(333) -> CHANSEY(113) evidence drift`);
}
function expectedSprite(row: Json): Json[] {
  return spriteEntries(row).sort((left: Json, right: Json) => left.slot - right.slot).map((sprite: Json) => ({
    kind: sprite.template.symbol === "gDirtMoundSpriteTemplate" ? "dirt-mound"
      : sprite.template.symbol === "gDirtPlumeSpriteTemplate" ? "dirt-plume" : "impact",
    slot: sprite.slot,
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data, subpriority: sprite.subpriority, matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    visible: !Boolean(sprite.invisible),
    frame: sprite.template.symbol === "gBasicHitSplatSpriteTemplate" ? 0 : sprite.animNum,
  }));
}
function actualSprite(state: DigState): Json[] {
  return state.sprites.map((sprite) => ({
    kind: sprite.kind, slot: sprite.slot, template: sprite.template,
    callback: sprite.callback, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    data: sprite.data, subpriority: sprite.subpriority, matrixNum: sprite.matrixNum,
    matrix: sprite.matrix, visible: sprite.visible, frame: sprite.frame,
  }));
}
function expectedTasks(row: Json): Json[] {
  return row.tasks.filter((task: Json) => OWN_TASKS.has(task.func?.symbol))
    .map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }))
    .sort((left: Json, right: Json) => left.slot - right.slot);
}
function actualTasks(state: DigState): Json[] {
  return state.tasks.map((task) => ({ slot: task.slot, callback: task.callback, data: task.data }));
}
function sourceAudio(age: number, body: DigBody, side: DigOrientation): Json {
  const sidePan = "SOUND_PAN_ATTACKER" as const;
  const pan = side === "player-back" ? -64 : 63;
  if (body === "setup" && PLUME_STARTS.includes(age as (typeof PLUME_STARTS)[number])) {
    return { events: [{ channel: "SE1", sound: "SE_M_DIG", sourcePan: sidePan, pan }] };
  }
  if (body === "unleash" && age === 32) {
    return { events: [{ channel: "SE1", sound: "SE_M_MEGA_KICK2", sourcePan: sidePan, pan }] };
  }
  return { events: [] };
}
function sourceRowsDigest(states: readonly DigState[]): string {
  const semantic = states.map((state) => ({
    age: state.age, body: state.body, active: state.active, source: state.source,
    sprites: state.sprites, tasks: state.tasks, attacker: state.attacker, target: state.target,
    order: state.order, background: state.background, registers: state.registers,
    scanline: { state: state.scanline.state, srcBuffer: state.scanline.srcBuffer,
      dmaDest: state.scanline.dmaDest, dmaControl: state.scanline.dmaControl,
      startY: state.scanline.startY, endY: state.scanline.endY, bgX: state.scanline.bgX,
      buffers: state.scanline.buffers },
    resources: state.resources, audio: state.audio, rng: state.rng, cleanup: state.cleanup,
  }));
  return createHash("sha256").update(JSON.stringify(semantic)).digest("hex");
}

/** Build only from the first live allocation/geometry observation of a body. */
export function digInputsFor(rows: Json[], side: DigOrientation, body: DigBody): DigLiveInputs {
  const phase = phaseRows(rows, body);
  invariant(phase.length === BODY_LENGTH[body], `${side}/${body}: retained body length`);
  const setupRows = phaseRows(rows, "setup");
  const unleashRows = phaseRows(rows, "unleash");
  const taskFacts = body === "setup" ? unleashRows : phase;
  const root = phase[0]!;
  const attacker = root.battlerSprites.attacker;
  const target = root.battlerSprites.target;
  const mound = spriteEntries(phase[body === "setup" ? 7 : 11], "gDirtMoundSpriteTemplate");
  invariant(mound.length === 2, `${side}/${body}: two dirt mound allocations`);
  const plumes = body === "setup" ? PLUME_STARTS.flatMap((age) =>
    spriteEntries(phase[age], "gDirtPlumeSpriteTemplate").sort((a: Json, b: Json) => a.slot - b.slot)) : [];
  invariant(body === "unleash" || plumes.length === 20, `${side}/${body}: twenty plume allocations`);
  const bounce = taskEntry(phase[body === "setup" ? 10 : 14],
    body === "setup" ? "AnimTask_DigBounceMovement" : "AnimTask_DigRiseUpFromHole");
  const update = taskEntry(taskFacts[8], "Task_UpdateMonBg");
  const clear = taskEntry(taskFacts[32], "Task_ClearMonBg");
  const shake = taskEntry(taskFacts[32], "AnimTask_ShakeMon_Step");
  const impact = spriteEntries(phase[32], "gBasicHitSplatSpriteTemplate")[0];
  invariant(bounce && update && clear && shake, `${side}/${body}: task allocation facts`);
  const selected = side === "player-back" ? "bg2" : "bg1";
  const moundRow = body === "setup" ? 4 : 4;
  const impactRow = body === "setup" ? 1 : 1;
  const mudRow = setupRows[1]!;
  const moundAlloc = allocation(phase, DIG_DIRT_MOUND_TAG, moundRow);
  const impactAlloc = body === "unleash"
    ? allocation(phase, DIG_IMPACT_TAG, impactRow)
    : allocation(unleashRows, DIG_IMPACT_TAG, 1);
  const mudAlloc = body === "setup"
    ? allocation(phase, DIG_MUD_SAND_TAG, 1)
    : allocation(setupRows, DIG_MUD_SAND_TAG, 1);
  const updateData = update.data;
  const firstMound = mound[0]!;
  const firstPlume = plumes[0];
  const baseScroll = body === "unleash"
    ? { x: updateData[3], y: updateData[4] }
    : { x: selected === "bg2" ? -40 : -144, y: -128 };
  const snapshot = body === "unleash"
    ? { x: updateData[1], y: updateData[2] }
    : { x: attacker.x, y: DISPLAY_HEIGHT };
  const setupOffset = selectedBg(setupRows[7]!, side);
  const activeCnt = setupRows[8]!.registers[`${selected}cnt`];
  const inactiveCnt = root.registers[`${selected}cnt`];
  const matrix = (sprite: Json) => sprite.matrix as readonly [number, number, number, number];
  return {
    body, attackerSide: side === "player-back" ? "player" : "opponent",
    targetSide: side === "player-back" ? "opponent" : "player",
    attackerSpecies: CANONICAL_EVIDENCE.attacker.name,
    targetSpecies: CANONICAL_EVIDENCE.target.name,
    attackerCenter: { x: attacker.x, y: attacker.y }, targetCenter: { x: target.x, y: target.y },
    targetAnimationOrigin: { x: target.x, y: target.y + (side === "opponent-front" ? 8 : 0) },
    attackerElevationY: firstMound.y - 32,
    attackerInitialOffset: { x: attacker.x2, y: attacker.y2 },
    targetInitialOffset: { x: target.x2, y: target.y2 },
    attackerSpriteSlot: attacker.slot, targetSpriteSlot: target.slot,
    attackerSubpriority: attacker.subpriority, targetSubpriority: target.subpriority,
    attackerInitialVisible: !attacker.invisible, targetInitialVisible: !target.invisible,
    attackerInitialMatrixNum: attacker.matrixNum, targetInitialMatrixNum: target.matrixNum,
    attackerCleanupMatrixNum: phase[FIRST_INACTIVE[body]]!.battlerSprites.attacker.matrixNum,
    targetCleanupMatrixNum: phase[FIRST_INACTIVE[body]]!.battlerSprites.target.matrixNum,
    attackerInitialMatrix: matrix(attacker), targetInitialMatrix: matrix(target),
    moundSlots: mound.map((sprite: Json) => sprite.slot) as [number, number],
    plumeSlots: plumes.map((sprite: Json) => sprite.slot),
    impactSpriteSlot: impact?.slot ?? 0,
    impactMatrixNum: impact?.matrixNum ?? firstMound.matrixNum,
    moundMatrixNum: firstMound.matrixNum,
    plumeMatrixNum: firstPlume?.matrixNum ?? firstMound.matrixNum,
    digTaskSlot: bounce.slot, updateMonBgTaskSlot: update.slot,
    clearMonBgTaskSlot: clear.slot, shakeTaskSlot: shake.slot,
    spriteOrder: root.spriteOrder,
    mudSand: mudAlloc, dirtMound: moundAlloc, impact: impactAlloc,
    initialMatrixBitmap: root.resourceAllocators.matrixBitmap,
    setupBgOffset: setupOffset,
    monBg: {
      layer: selected, layerId: updateData[0],
      snapshot, baseScroll, activeCnt, inactiveCnt,
    },
    initialScanline: normalizedScanlineWitness(root, `${side}/${body} root`),
    animationRngSeed: root.animationRng,
  };
}

/** Build an ordinary typed presentation config from live retained facts. */
export function digConfigFor(
  rows: Json[], side: DigOrientation, body: DigBody,
): SceneOnDigConfig {
  const input = digInputsFor(rows, side, body);
  const phase = phaseRows(rows, body);
  const attacker = phase[0]!.battlerSprites.attacker;
  const target = phase[0]!.battlerSprites.target;
  const { body: _body, attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    move: "DIG",
    body,
    attacker: { species: input.attackerSpecies, geometry: {
      side: input.attackerSide,
      spriteCorner: { x: attacker.x - 32, y: attacker.y - 32 },
      animationCenter: input.attackerCenter,
      battlePositionCenter: input.attackerCenter,
    } },
    target: { species: input.targetSpecies, geometry: {
      side: input.targetSide,
      spriteCorner: { x: target.x - 32, y: target.y - 32 },
      animationCenter: input.targetAnimationOrigin ?? input.targetCenter,
      battlePositionCenter: input.targetCenter,
    } },
    fieldProfile: {
      playerHp: phase[0]!.battlers.player.hp,
      playerMaxHp: phase[0]!.battlers.player.maxHp,
      opponentHp: phase[0]!.battlers.opponent.hp,
      opponentMaxHp: phase[0]!.battlers.opponent.maxHp,
      playerGender: side === "player-back" ? "male" : "female",
      opponentGender: side === "player-back" ? "female" : "male",
    },
    animationInputs,
  };
}

function seamState(age: number, input: DigLiveInputs): SceneOnDigPresentationState {
  const { body: _body, attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    age,
    config: {
      move: "DIG", body: input.body,
      attacker: { species: input.attackerSpecies, geometry: {
        side: input.attackerSide, spriteCorner: input.attackerCenter,
        animationCenter: input.attackerCenter, battlePositionCenter: input.attackerCenter,
      } },
      target: { species: input.targetSpecies, geometry: {
        side: input.targetSide, spriteCorner: input.targetCenter,
        animationCenter: input.targetAnimationOrigin ?? input.targetCenter,
        battlePositionCenter: input.targetCenter,
      } },
      fieldProfile: {} as SceneOnDigConfig["fieldProfile"], animationInputs,
    },
  } as SceneOnDigPresentationState;
}

function expectedBackground(body: DigBody, age: number) {
  if (body === "setup") {
    return {
      vram: age < 8 || age >= 193 ? "battle" : age <= 190 ? "mon-bg" : "clear-pending",
      vramEvent: age === 8 ? "load-mon-bg" : age === 191 ? "clear-mon-bg"
        : age === 193 ? "restore-battle" : "none",
      monbg: age >= 7 && age <= 191,
    } as const;
  }
  return {
    vram: age < 9 || age >= 36 ? "battle" : age <= 33 ? "mon-bg" : "clear-pending",
    vramEvent: age === 9 ? "load-mon-bg" : age === 34 ? "clear-mon-bg"
      : age === 36 ? "restore-battle" : "none",
    monbg: age >= 8 && age <= 34,
  } as const;
}

function runBody(side: DigOrientation, rows: Json[], body: DigBody): Json {
  const phase = phaseRows(rows, body);
  const input = digInputsFor(rows, side, body);
  const selected = side === "player-back" ? "bg2" : "bg1";
  const replay: DigState[] = [];
  for (const [age, row] of phase.entries()) {
    const reduced = digAtAge(age, input);
    const seam = sceneOnDigView(seamState(age, input));
    const seamCore = Object.fromEntries(Object.entries(seam)
      .filter(([key]) => key !== "presentationAttacker" && key !== "presentationTarget"));
    invariant(same(reduced, seamCore), `${side}/${body}: typed seam row ${age}`);
    invariant(seam.presentationAttacker.species === CANONICAL_EVIDENCE.attacker.name
      && seam.presentationTarget.species === CANONICAL_EVIDENCE.target.name,
    `${side}/${body}: separately named presentation identities row ${age}`);
    assertCanonicalEvidenceSpecies(row, side, `${side}/${body} row ${age}`);
    invariant(reduced.source.pointer === row.scriptPtr
      && reduced.source.pointer === DIG_SOURCE_START + row.scriptOffset
      && reduced.source.pointerParity === row.scriptPtrParity
      && reduced.source.pointerOffset === row.scriptOffset
      && reduced.source.wait === row.scriptWait
      && reduced.source.active === row.animScriptActive,
    `${side}/${body}: source cursor row ${age}`);
    invariant(same(actualSprite(reduced), expectedSprite(row)), `${side}/${body}: sprites row ${age}`);
    invariant(same(actualTasks(reduced), expectedTasks(row)), `${side}/${body}: tasks row ${age}`);
    const attacker = row.battlerSprites.attacker;
    const target = row.battlerSprites.target;
    invariant(same(reduced.attacker, {
      slot: attacker.slot, x: attacker.x, y: attacker.y, x2: attacker.x2, y2: attacker.y2,
      visible: !attacker.invisible, matrixNum: attacker.matrixNum, matrix: attacker.matrix,
    }), `${side}/${body}: attacker row ${age}`);
    invariant(same(reduced.target, {
      slot: target.slot, x: target.x, y: target.y, x2: target.x2, y2: target.y2,
      visible: !target.invisible, matrixNum: target.matrixNum, matrix: target.matrix,
    }), `${side}/${body}: target row ${age}`);
    invariant(same(reduced.background.scroll, selectedBg(row, side)), `${side}/${body}: BG scroll row ${age}`);
    const background = expectedBackground(body, age);
    invariant(reduced.background.layer === selected
      && reduced.background.vram === background.vram
      && reduced.background.vramEvent === background.vramEvent
      && reduced.background.monbg === background.monbg,
    `${side}/${body}: source monbg/VRAM lifecycle row ${age}`);
    const registers = selectedRegisters(row, side);
    invariant(reduced.registers.hardwareCnt === registers.cnt
      && same(reduced.registers.hardwareScroll, registers.scroll), `${side}/${body}: registers row ${age}`);
    const expectedScanline = normalizedScanlineWitness(row, `${side}/${body} row ${age}`);
    invariant(reduced.scanline.state === expectedScanline.state
      && reduced.scanline.srcBuffer === expectedScanline.srcBuffer
      && reduced.scanline.dmaDest === expectedScanline.dmaDest
      && reduced.scanline.dmaControl === expectedScanline.dmaControl
      && same(reduced.scanline.buffers, expectedScanline.buffers),
    `${side}/${body}: scanline state/src/DMA/full 320-word bank row ${age}`);
    invariant(reduced.resources.mudSand.loaded === row.tileTags.includes(DIG_MUD_SAND_TAG)
      && reduced.resources.dirtMound.loaded === row.tileTags.includes(DIG_DIRT_MOUND_TAG)
      && reduced.resources.impact.loaded === row.tileTags.includes(DIG_IMPACT_TAG)
      && reduced.resources.mudSand.loaded === row.paletteTags.includes(DIG_MUD_SAND_TAG)
      && reduced.resources.dirtMound.loaded === row.paletteTags.includes(DIG_DIRT_MOUND_TAG)
      && reduced.resources.impact.loaded === row.paletteTags.includes(DIG_IMPACT_TAG),
    `${side}/${body}: resource tags row ${age}`);
    invariant(reduced.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap,
      `${side}/${body}: matrix bitmap row ${age}`);
    invariant(reduced.cleanup.visualTasks === row.visualTaskCount
      && reduced.cleanup.soundTasks === row.soundTaskCount,
    `${side}/${body}: task ownership row ${age}`);
    invariant(same(reduced.audio, sourceAudio(age, body, side)), `${side}/${body}: audio row ${age}`);
    invariant(reduced.rng.gameplay === "untouched" && reduced.rng.animation === "caller-scheduled"
      && reduced.rng.before === input.animationRngSeed && reduced.rng.after === input.animationRngSeed
      && reduced.rng.advances === 0, `${side}/${body}: RNG row ${age}`);
    const ownedSlots = new Set(reduced.sprites.map((sprite) => sprite.slot));
    invariant(same(reduced.order.ownedSlots, row.spriteOrder.filter((slot: number) => ownedSlots.has(slot))),
      `${side}/${body}: OAM order row ${age}`);
    replay.push(reduced);
  }

  const firstInactive = FIRST_INACTIVE[body];
  const expectedOamRows = phase.slice(1).every((row, index) =>
    same(row.hardwareOam, phase[index]!.softwareOam));
  const expectedMatrixRows = phase.slice(1).every((row, index) =>
    same(row.hardwareMatrices, phase[index]!.softwareMatrices));
  const paletteEdges = phase.slice(1).flatMap((row, index) =>
    same(row.hardwarePalette, phase[index]!.fadedPalette) ? [] : [index + 1]);
  const expectedPalette = body === "setup" ? [7] : [];
  invariant(expectedOamRows && expectedMatrixRows, `${side}/${body}: predecessor OAM/matrix latches`);
  invariant(same(paletteEdges, expectedPalette), `${side}/${body}: palette latch`);
  const bgVramEdges = phase.flatMap((row, age) => age > 0 && row.bgVram.allSha256 !== phase[age - 1]!.bgVram.allSha256 ? [age] : []);
  const expectedBgVram = body === "setup" ? [8, 191, 193] : [9, 34, 36];
  const reducerBgEvents = replay.flatMap((state, age) =>
    state.background.vramEvent === "none" ? [] : [age]);
  const monbgTransitions = replay.flatMap((state, age) => age > 0
    && state.background.monbg !== replay[age - 1]!.background.monbg ? [age] : []);
  const expectedMonbgTransitions = body === "setup" ? [7, 192] : [8, 35];
  invariant(same(bgVramEdges, expectedBgVram) && same(reducerBgEvents, expectedBgVram)
    && same(monbgTransitions, expectedMonbgTransitions),
  `${side}/${body}: direct BG VRAM/monbg lifecycle transitions`);
  const last = replay[firstInactive]!;
  invariant(!last.active && !last.source.active && last.sprites.length === 0 && last.tasks.length === 0
    && last.cleanup.firstInactive && last.cleanup.resourcesReleased,
  `${side}/${body}: first inactive cleanup`);
  return {
    reducerRows: replay.length,
    seamRows: replay.length,
    digest: sourceRowsDigest(replay),
    lifecycle: body === "setup"
      ? { mounds: "7..187", plumes: "18..35 / 52..69 / 86..103 / 120..137 / 154..171",
        bounce: "10..167", staticClear: "189..191", firstInactive }
      : { mounds: "11..61", rise: "14..27", updateMonBg: "8..34", clearMonBg: "32..34",
        impact: "32..43", shake: "32..43", firstInactive },
    latches: body === "setup"
      ? { oam: "194/194 predecessor", matrices: "194/194 predecessor",
        palettes: "193/194 predecessor; source age 7 same-row", scanline: "10/167/168",
        bgVram: "8/191/193", monbg: "7..191" }
      : { oam: "67/67 predecessor", matrices: "67/67 predecessor",
        palettes: "67/67 predecessor", scanline: "14/27/28", bgVram: "9/34/36",
        monbg: "8..34" },
    cleanup: { age: firstInactive, active: false, visualTasks: 0, sprites: 0,
      tasks: 0, resourcesReleased: true, framebufferCompared: false },
  };
}

function runOrientation(side: DigOrientation): Json {
  const rows = rowsFor(side);
  invariant(rows.length === 263, `${side}: 263 retained rows`);
  const setup = runBody(side, rows, "setup");
  const unleash = runBody(side, rows, "unleash");
  const first = { setup, unleash };
  invariant(same(runBody(side, rows, "setup"), setup), `${side}: deterministic setup replay`);
  invariant(same(runBody(side, rows, "unleash"), unleash), `${side}: deterministic unleash replay`);
  return {
    reducerRows: setup.reducerRows + unleash.reducerRows,
    seamRows: setup.seamRows + unleash.seamRows,
    canonicalEvidence: CANONICAL_EVIDENCE,
    digest: createHash("sha256").update(JSON.stringify(first)).digest("hex"),
    setup, unleash,
  };
}

export function verifyDigReducer(): Json {
  const result: Json = {};
  for (const side of ["player-back", "opponent-front"] as const) result[side] = runOrientation(side);
  result.total = {
    retainedRows: 526, reducerRows: result["player-back"].reducerRows + result["opponent-front"].reducerRows,
    seamRows: result["player-back"].seamRows + result["opponent-front"].seamRows,
    framebufferCompared: false,
  };
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyDigReducer(), null, 2));
}
