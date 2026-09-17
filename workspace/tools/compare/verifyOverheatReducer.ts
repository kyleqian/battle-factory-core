/**
 * Hermetic retained-row verifier for MOVE_OVERHEAT's source-relative reducer.
 *
 * The two dense Scene-ON maps stay strictly in this test/tool boundary.  The
 * production reducer is supplied with one live scene allocation per side and
 * is replayed twice over every retained row; it never receives a per-age map,
 * emulator result, RGB frame, or gameplay decision.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  OVERHEAT_FIRST_INACTIVE_AGE,
  OVERHEAT_RESOURCE_TAGS,
  overheatAtAge,
  type OverheatLiveInputs,
  type OverheatState,
} from "../../src/animation/overheat.ts";
import {
  sceneOnOverheatView,
  type SceneOnOverheatPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type OverheatOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_OVERHEAT reducer drift: ${message}`);
}
function rowsFor(orientation: OverheatOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  const path = resolve(root, `tools/compare/evidence/overheat-${side}-dense-state.json.gz`);
  return (JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as Json).frames;
}
function battler(entry: Json): OverheatLiveInputs["attackerSprite"] {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority,
    oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum,
    matrix: [entry.matrix[0], entry.matrix[1], entry.matrix[2], entry.matrix[3]], flags: entry.flags,
  };
}
function firstSprite(row: Json, symbol: string): Json {
  const result = row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
  invariant(result, `missing ${symbol}`);
  return result;
}
function spriteBornAt(rows: Json[], age: number, symbol: string): Json {
  const current = rows[age]!.sprites.filter((entry: Json) => entry.template?.symbol === symbol);
  const previousSlots = new Set((rows[age - 1]?.sprites ?? []).filter((entry: Json) => entry.template?.symbol === symbol).map((entry: Json) => entry.slot));
  const result = current.find((entry: Json) => !previousSlots.has(entry.slot));
  invariant(result, `missing ${symbol} birth at ${age}`);
  return result;
}
function resource(rows: Json[], age: number, tag: number): OverheatLiveInputs["resources"]["smallEmber"] {
  const row = rows[age]!;
  const tileSlot = row.tileTags.indexOf(tag), paletteAllocatorSlot = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, `missing resource allocation ${tag} at ${age}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  const hardwarePaletteBank = 16 + paletteAllocatorSlot;
  return {
    tag, tileSlot, paletteAllocatorSlot, hardwarePaletteBank, tileRange: [range[0], range[1]],
    palette: row.fadedPalette.slice(hardwarePaletteBank * 16, hardwarePaletteBank * 16 + 16),
  };
}
function changedBank(before: readonly number[], after: readonly number[]): number {
  const banks = Array.from({ length: 32 }, (_, bank) => bank).filter((bank) => !same(before.slice(bank * 16, bank * 16 + 16), after.slice(bank * 16, bank * 16 + 16)));
  invariant(banks.length === 1, `expected one changed palette bank, got ${banks.join(",")}`);
  return banks[0]!;
}

/** Extract one legal, live scene allocation without passing retained rows to production. */
export function overheatInputsFor(orientation: OverheatOrientation, rows = rowsFor(orientation)): OverheatLiveInputs {
  const row0 = rows[0]!, attackerSide = orientation === "player-back" ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const firstFlames = rows[64]!.sprites.filter((entry: Json) => entry.template?.symbol === "gOverheatFlameSpriteTemplate");
  const secondFlames = rows[72]!.sprites.filter((entry: Json) => entry.template?.symbol === "gOverheatFlameSpriteTemplate").slice(-8);
  const thirdFlames = rows[80]!.sprites.filter((entry: Json) => entry.template?.symbol === "gOverheatFlameSpriteTemplate").slice(-8);
  invariant(firstFlames.length === 8 && secondFlames.length === 8 && thirdFlames.length === 8, `${orientation}: expected three 8-flame allocations`);
  const hitBirths = [107, 115, 125, 135].map((age) => spriteBornAt(rows, age, "gBasicHitSplatSpriteTemplate"));
  const blendBirths = [10, 35, 138, 170, 208].map((age) => firstSprite(rows[age]!, "gSimplePaletteBlendSpriteTemplate"));
  const monbg = rows[7]!.tasks.find((entry: Json) => entry.func?.symbol === "Task_UpdateMonBg");
  const firstShake = rows[35]!.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step");
  const targetShake = rows[107]!.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step");
  const lastShake = rows[138]!.tasks.find((entry: Json) => entry.func?.symbol === "AnimTask_ShakeMon_Step" && entry.slot !== targetShake?.slot);
  const clear = rows[186]!.tasks.find((entry: Json) => entry.func?.symbol === "Task_ClearMonBg");
  invariant(monbg && firstShake && targetShake && lastShake && clear, `${orientation}: missing retained task allocation`);
  const flame = firstFlames[0]!;
  const firstHit = hitBirths[0]!;
  const firstBlend = blendBirths[0]!;
  const xKey = Object.keys(rows[7]!.battleBg).find((key) => rows[7]!.battleBg[key] !== row0.battleBg[key]);
  invariant(xKey && xKey.endsWith("_X"), `${orientation}: missing monbg x key`);
  const yKey = xKey.replace(/_X$/u, "_Y");
  const bgNumber = xKey.match(/BG(\d)_X/u)?.[1];
  invariant(bgNumber, `${orientation}: missing selected BG number`);
  const controlRegister = `bg${bgNumber}cnt`, horizontalRegister = `bg${bgNumber}hofs`, verticalRegister = `bg${bgNumber}vofs`;
  const targetX = inputTargetX(rows[107]!, attackerSide, -5);
  const targetY = firstHit.y - 3;
  const attackerOrigin = { x: flame.x - 30, y: flame.y + 20 };
  const initialOccupiedSprites = [...new Set([...row0.sprites.map((entry: Json) => entry.slot), row0.battlerSprites.attacker.slot, row0.battlerSprites.target.slot])];
  return {
    attackerSide, targetSide,
    attackerSpecies: attackerSide === "player" ? "SOLROCK" : "MAGCARGO",
    targetSpecies: targetSide === "player" ? "SHUCKLE" : "SHUCKLE",
    attackerPictureOrigin: attackerOrigin, targetPictureOrigin: { x: targetX, y: targetY },
    attackerSprite: battler(row0.battlerSprites.attacker), targetSprite: battler(row0.battlerSprites.target),
    taskSlots: { monbg: monbg.slot, firstAttackerShake: firstShake.slot, targetShake: targetShake.slot, lastAttackerShake: lastShake.slot, clearMonbg: clear.slot },
    spriteSlots: { flames: [...firstFlames, ...secondFlames, ...thirdFlames].map((entry: Json) => entry.slot), hitsplats: hitBirths.map((entry) => entry.slot), paletteBlends: blendBirths.map((entry) => entry.slot) },
    matrixSlots: { hitsplats: hitBirths.map((entry) => entry.matrixNum) },
    resources: { smallEmber: resource(rows, 1, OVERHEAT_RESOURCE_TAGS.smallEmber), impact: resource(rows, 4, OVERHEAT_RESOURCE_TAGS.impact) },
    allocator: {
      initialOccupiedSprites, initialMatrixBitmap: row0.resourceAllocators.matrixBitmap, spriteOrder: row0.spriteOrder,
      initialLiveSprites: row0.sprites.map((entry: Json) => ({ slot: entry.slot, attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority })),
    },
    oam: {
      flame: [0, 0x8000, flame.attr[2]], hitsplat: [firstHit.attr[0], firstHit.attr[1], firstHit.attr[2]],
      paletteBlend: [firstBlend.attr[0], firstBlend.attr[1], firstBlend.attr[2]],
    },
    palettes: { unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette },
    background: {
      values: row0.battleBg, xKey, yKey, controlRegister, horizontalRegister, verticalRegister,
      setupX: rows[7]!.battleBg[xKey], setupY: rows[7]!.battleBg[yKey], setupControl: rows[8]!.registers[controlRegister],
      clearX: rows[189]!.battleBg[xKey], clearY: rows[189]!.battleBg[yKey], clearControl: rows[190]!.registers[controlRegister],
      clearHorizontal: rows[190]!.registers[horizontalRegister], clearVertical: rows[190]!.registers[verticalRegister],
      monbgPaletteBank: changedBank(rows[6]!.unfadedPalette, rows[7]!.unfadedPalette),
    },
    registers: row0.registers, animationRngSeed: row0.animationRng,
    gameplayRng: row0.rawBattleState.gameplayRng, gameplayState: row0.immutableState,
  };
}
function inputTargetX(row: Json, attackerSide: "player" | "opponent", x: number): number {
  const hit = firstSprite(row, "gBasicHitSplatSpriteTemplate");
  return hit.x - (attackerSide === "player" ? x : -x);
}

export function overheatConfigFor(orientation: OverheatOrientation, rows = rowsFor(orientation)): SceneOnOverheatPresentationState["config"] {
  const input = overheatInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOrigin, targetPictureOrigin, ...animationInputs } = input;
  return {
    move: "OVERHEAT",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: attackerPictureOrigin } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: targetPictureOrigin } },
    fieldProfile: { playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp, opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp, playerGender: rows[0]!.parties.player[0].gender, opponentGender: rows[0]!.parties.opponent[0].gender },
    animationInputs,
  };
}

const OWNED_TEMPLATES = new Set(["gOverheatFlameSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
function ownedRows(row: Json): Json[] { return row.sprites.filter((entry: Json) => OWNED_TEMPLATES.has(entry.template?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot); }
function compactRowSprite(sprite: Json): unknown {
  return {
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: (sprite.attr[2] >>> 10) & 3, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    flags: sprite.flags, data: sprite.data, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
  };
}
function compactStateSprite(sprite: OverheatState["sprites"][number]): unknown {
  return {
    slot: sprite.slot, template: sprite.template, callback: sprite.callback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: sprite.oamPriority, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    flags: sprite.flags, data: sprite.data, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
  };
}
function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((entry: Json) => ["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step"].includes(entry.func?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot || left.func.symbol.localeCompare(right.func.symbol));
}
function compareLatches(orientation: OverheatOrientation, age: number, rows: Json[], input: OverheatLiveInputs, state: OverheatState): void {
  const row = rows[age]!;
  if (age > 0) {
    invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam), `${orientation}/${age}: full OAM predecessor transfer`);
    invariant(same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${orientation}/${age}: full matrix predecessor transfer`);
    invariant(same(row.hardwarePalette, age === 7 ? row.fadedPalette : rows[age - 1]!.fadedPalette), `${orientation}/${age}: palette latch`);
  }
  invariant(state.latches.oamAndMatrices === (age === 0 ? "initial" : "preceding-software"), `${orientation}/${age}: reducer OAM/matrix latch declaration`);
  invariant(state.latches.palette === (age === 0 ? "initial" : age === 7 ? "current-monbg" : "preceding-faded"), `${orientation}/${age}: reducer palette latch declaration`);
  if (age >= 109 && age <= 155 && age % 2 === 1) {
    invariant(row.battleBg[input.background.xKey] !== rows[age - 1]!.battleBg[input.background.xKey], `${orientation}/${age}: target ShakeMon source BG edge`);
  }
}
function compareAudio(orientation: OverheatOrientation, age: number, row: Json, state: OverheatState): void {
  for (const event of state.audio) {
    invariant(row.audio.SE1.songHeaderIdentity.symbol === event.sound && row.audio.SE1.tracks.some((track: Json) => track.panX === event.pan), `${orientation}/${age}: ${event.sound} pan`);
  }
  if ([32, 64, 107, 115, 125, 135].includes(age)) invariant(state.audio.length === 1, `${orientation}/${age}: source audio event`);
}
function compareRow(orientation: OverheatOrientation, age: number, rows: Json[], input: OverheatLiveInputs): void {
  const row = rows[age]!, state = overheatAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait, `${orientation}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  invariant(same(state.tasks.map((task) => ({ slot: task.slot, func: task.callback, data: task.data })), ownedTasks(row).map((task) => ({ slot: task.slot, func: task.func.symbol, data: task.data }))), `${orientation}/${age}: owned task identities/data`);
  invariant(same(state.sprites.map(compactStateSprite), ownedRows(row).map(compactRowSprite)), `${orientation}/${age}: all owned sprite geometry/OAM/matrices/data`);
  invariant(state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: matrix allocation`);
  for (const [name, tag] of Object.entries(OVERHEAT_RESOURCE_TAGS)) {
    const resource = state.resources.tags[name as keyof typeof OVERHEAT_RESOURCE_TAGS];
    invariant(resource.loaded === row.tileTags.includes(tag) && resource.loaded === row.paletteTags.includes(tag), `${orientation}/${age}: resource ${name} lifetime`);
    if (resource.loaded) invariant(row.tileTags[resource.tileSlot] === tag && row.paletteTags[resource.paletteAllocatorSlot] === tag && same(row.resourceAllocators.tileRanges[resource.tileSlot], resource.tileRange), `${orientation}/${age}: resource ${name} allocation`);
  }
  // At the first inactive row the allocator has released Small Ember,
  // Impact, and the monbg bank; their newly caller-owned contents are not a
  // MOVE_OVERHEAT output.  Every live row compares all 32 palette banks.
  if (age < OVERHEAT_FIRST_INACTIVE_AGE) invariant(same(state.palette.unfaded, row.unfadedPalette) && same(state.palette.faded, row.fadedPalette) && same(state.palette.hardware, row.hardwarePalette), `${orientation}/${age}: all palette banks`);
  invariant(same(state.background.values, row.battleBg), `${orientation}/${age}: target monbg/BG state`);
  for (const key of [input.background.controlRegister, input.background.horizontalRegister, input.background.verticalRegister, "bldcnt", "bldalpha"]) invariant(state.registers[key] === row.registers[key], `${orientation}/${age}: register ${key}`);
  invariant(state.battlers.attacker.sprite.x2 === row.battlerSprites.attacker.x2 && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2 && state.battlers.target.sprite.flags === row.battlerSprites.target.flags, `${orientation}/${age}: ShakeMon and target monbg flags`);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: full painter order`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === ownedRows(row).length && state.cleanup.ownedTasks === ownedTasks(row).length && state.cleanup.firstInactive === (age === OVERHEAT_FIRST_INACTIVE_AGE) && state.cleanup.resourcesReleased === (age === OVERHEAT_FIRST_INACTIVE_AGE), `${orientation}/${age}: cleanup counts`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng) && same(state.rng.gameplayState, row.immutableState) && same(row.immutableState, rows[0]!.immutableState), `${orientation}/${age}: presentation/gameplay RNG split`);
  invariant(state.palette.backup.allocated === (age >= 26 && age < 229) && state.palette.backup.backgroundCopiedAt === (age >= 29 ? 29 : null) && state.palette.backup.attackerCopiedAt === (age >= 135 ? 135 : null) && state.palette.backup.backgroundRestoredAt === (age >= 167 ? 167 : null) && state.palette.backup.attackerRestoredAt === (age >= 205 ? 205 : null), `${orientation}/${age}: backup palette chronology`);
  compareAudio(orientation, age, row, state); compareLatches(orientation, age, rows, input, state);
}
function replayOrientation(orientation: OverheatOrientation) {
  const rows = rowsFor(orientation), input = overheatInputsFor(orientation, rows), config = overheatConfigFor(orientation, rows);
  invariant(rows.length === OVERHEAT_FIRST_INACTIVE_AGE + 1, `${orientation}: complete retained source body`);
  for (let pass = 0; pass < 2; pass += 1) for (const [age] of rows.entries()) {
    compareRow(orientation, age, rows, input);
    const reduced = overheatAtAge(age, input);
    const seam = sceneOnOverheatView({ age, config } as SceneOnOverheatPresentationState);
    const { attacker, target, ...seamState } = seam;
    invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: typed presentation seam`);
  }
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: OVERHEAT_FIRST_INACTIVE_AGE };
}

/** Replay all 460 retained bilateral rows twice without framebuffer or credit. */
export function verifyOverheatReducer() {
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyOverheatReducer(), null, 2));
