/**
 * Hermetic retained-row verifier for the MOVE_SHOCK_WAVE reducer.
 *
 * The dense rows are read here, at test/tool time only.  The production
 * reducer receives the resulting live allocation snapshot and is replayed
 * for every retained source age in both directions, twice per direction.
 * No oracle run or framebuffer comparison is performed by this verifier.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SHOCK_WAVE_RESOURCE_TAGS,
  shockWaveAtAge,
  shockWaveFirstInactiveAge,
  shockWaveSourceAtAge,
  shockWaveTimingFor,
  type ShockWaveLiveInputs,
  type ShockWaveOam,
  type ShockWaveState,
} from "../../src/animation/shockWave.ts";
import {
  sceneOnShockWaveView,
  type SceneOnShockWavePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type ShockWaveOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SHOCK_WAVE reducer drift: ${message}`);
}
function rowsFor(orientation: ShockWaveOrientation): Json[] {
  const name = orientation === "player-back" ? "player" : "opponent";
  const path = resolve(root, `tools/compare/evidence/shock-wave-${name}-dense-state.json.gz`);
  return (JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as Json).frames;
}
function task(row: Json, symbol: string): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
  invariant(found, `missing live task ${symbol}`);
  return found;
}
function sprite(row: Json, symbol: string): Json {
  const found = row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
  invariant(found, `missing live sprite ${symbol}`);
  return found;
}
function battler(entry: Json): ShockWaveLiveInputs["attackerSprite"] {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix, attr: [entry.attr[0], entry.attr[1], entry.attr[2]],
  };
}
function allocation(rows: Json[], start: number, tag: number): ShockWaveLiveInputs["resources"]["circleOfLight"] {
  const row = rows[start]!, tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing live allocation ${tag}`);
  const tileRange = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(tileRange) && tileRange.length === 2, `missing live tile range ${tag}`);
  return { tag, tileSlot, paletteBank, tileRange: [tileRange[0], tileRange[1]], palette: row.fadedPalette.slice(paletteBank * 16, paletteBank * 16 + 16) };
}
function sourceOam(row: Json, symbol: string): ShockWaveOam {
  const entry = sprite(row, symbol);
  return [entry.attr[0], entry.attr[1], entry.attr[2]];
}

/** Extract one live root allocation without passing retained rows to production. */
export function shockWaveInputsFor(orientation: ShockWaveOrientation, rows = rowsFor(orientation)): ShockWaveLiveInputs {
  const timing = orientation === "player-back" ? shockWaveTimingFor({ attackerSide: "player" }) : shockWaveTimingFor({ attackerSide: "opponent" });
  const row0 = rows[0]!, row16 = rows[16]!, row31 = rows[31]!, row45 = rows[45]!, row77 = rows[77]!, rowLightning = rows[timing.lightningStart]!, rowLightningSprite = rows[timing.lightningStart + 1]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const charging = task(row31, "AnimTask_ElectricChargingParticles_Step");
  const progressing = task(row77, "AnimTask_ShockWaveProgressingBolt");
  const lightning = task(rowLightning, "AnimTask_ShockWaveLightning");
  const shake = task(rows[timing.shakeStart]!, "AnimTask_ShakeMon_Step");
  const blend = task(rows[timing.shakeStart]!, "AnimTask_BlendSpriteColor_Step2");
  const monbg = task(row16, "Task_UpdateMonBg");
  const clear = task(rows[timing.clearStart]!, "Task_ClearMonBg");
  const simple = sprite(row16, "gSimplePaletteBlendSpriteTemplate");
  const target = row0.battlerSprites.target;
  const initialOccupied = [...new Set([
    ...row0.sprites.map((entry: Json) => entry.slot), row0.battlerSprites.attacker.slot, row0.battlerSprites.target.slot,
  ])];
  const input: ShockWaveLiveInputs = {
    attackerSide, targetSide,
    attackerSpecies: "FLAAFFY", targetSpecies: "CORSOLA",
    attackerPictureOrigin: { x: charging.data[14], y: charging.data[15] },
    targetPictureOrigin: { x: simple.x, y: simple.y },
    targetBattlePosition: { x: lightning.data[13], y: lightning.data[15] - 32 },
    attackerSprite: battler(row0.battlerSprites.attacker), targetSprite: battler(target),
    taskSlots: { charging: charging.slot, progressing: progressing.slot, lightning: lightning.slot, shake: shake.slot, blend: blend.slot, monbg: monbg.slot, clear: clear.slot },
    spriteSlots: { orb: sprite(row45, "gGrowingShockWaveOrbSpriteTemplate").slot, paletteBlend: simple.slot },
    matrixSlots: { orb: sprite(row45, "gGrowingShockWaveOrbSpriteTemplate").matrixNum },
    resources: {
      circleOfLight: allocation(rows, 4, SHOCK_WAVE_RESOURCE_TAGS.circleOfLight),
      electricOrbs: allocation(rows, 1, SHOCK_WAVE_RESOURCE_TAGS.electricOrbs),
      spark: allocation(rows, 7, SHOCK_WAVE_RESOURCE_TAGS.spark),
      lightning: allocation(rows, 10, SHOCK_WAVE_RESOURCE_TAGS.lightning),
    },
    allocator: { initialOccupiedSprites: initialOccupied, initialMatrixBitmap: row0.resourceAllocators.matrixBitmap, spriteOrder: row0.spriteOrder },
    oam: { charging: sourceOam(row31, "gElectricChargingParticlesSpriteTemplate"), orb: sourceOam(row45, "gGrowingShockWaveOrbSpriteTemplate"), progressing: sourceOam(row77, "gShockWaveProgressingBoltSpriteTemplate"), lightning: sourceOam(rowLightningSprite, "gLightningSpriteTemplate"), paletteBlend: sourceOam(row16, "gSimplePaletteBlendSpriteTemplate") },
    palettes: { unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette },
    background: { values: row0.battleBg, key: orientation === "player-back" ? "gBattle_BG2_Y" : "gBattle_BG1_Y", register: orientation === "player-back" ? "bg2vofs" : "bg1vofs", setupX: rows[13]!.battleBg[orientation === "player-back" ? "gBattle_BG2_X" : "gBattle_BG1_X"], setupValue: rows[13]!.battleBg[orientation === "player-back" ? "gBattle_BG2_Y" : "gBattle_BG1_Y"], clearValue: rows[timing.cleanupAge - 1]!.battleBg[orientation === "player-back" ? "gBattle_BG2_Y" : "gBattle_BG1_Y"], vram: row0.bgVram, setupVram: rows[14]!.bgVram, clearVram: rows[timing.cleanupAge]!.bgVram },
    registers: row0.registers,
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng,
  };
  void target;
  return input;
}

export function shockWaveConfigFor(orientation: ShockWaveOrientation, rows = rowsFor(orientation)): SceneOnShockWavePresentationState["config"] {
  const input = shockWaveInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOrigin, targetPictureOrigin, targetBattlePosition, ...animationInputs } = input;
  void targetBattlePosition;
  return {
    move: "SHOCK_WAVE",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: input.attackerPictureOrigin } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: input.targetBattlePosition } },
    fieldProfile: { playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp, opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp, playerGender: "male", opponentGender: "male" },
    animationInputs,
  };
}

const ownedTemplates = new Set([
  "gElectricChargingParticlesSpriteTemplate", "gGrowingShockWaveOrbSpriteTemplate", "gShockWaveProgressingBoltSpriteTemplate", "gLightningSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
]);
function ownedRows(row: Json): Json[] { return row.sprites.filter((entry: Json) => ownedTemplates.has(entry.template?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot); }
function compact(entry: Json): Json { return { slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, subpriority: entry.subpriority, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data.slice(0, 8) }; }

function compareTasks(orientation: ShockWaveOrientation, age: number, row: Json, state: ShockWaveState): void {
  const expected = row.tasks.filter((entry: Json) => ["AnimTask_ElectricChargingParticles_Step", "AnimTask_ShockWaveProgressingBolt", "AnimTask_ShockWaveLightning", "AnimTask_ShakeMon_Step", "AnimTask_BlendSpriteColor_Step2", "Task_UpdateMonBg", "Task_ClearMonBg"].includes(entry.func?.symbol)).sort((a: Json, b: Json) => a.slot - b.slot || a.func.symbol.localeCompare(b.func.symbol));
  const actual = state.tasks.slice().sort((a, b) => a.slot - b.slot || a.callback.localeCompare(b.callback));
  invariant(expected.length === actual.length, `${orientation}/${age}: task ownership`);
  for (let index = 0; index < expected.length; index += 1) invariant(expected[index]!.slot === actual[index]!.slot && expected[index]!.func.symbol === actual[index]!.callback && same(expected[index]!.data, actual[index]!.data), `${orientation}/${age}: full ${expected[index]!.func.symbol} task data`);
}
function compareSprites(orientation: ShockWaveOrientation, age: number, row: Json, state: ShockWaveState): void {
  const expected = ownedRows(row).map(compact), actual = state.sprites.map((entry) => compact({ ...entry, template: { symbol: entry.template }, callback: { symbol: entry.callback } })).sort((a, b) => a.slot - b.slot);
  invariant(same(expected, actual), `${orientation}/${age}: complete owned sprite bodies`);
}
function compareLatches(orientation: ShockWaveOrientation, age: number, rows: Json[], state: ShockWaveState, input: ShockWaveLiveInputs): void {
  const row = rows[age]!, timing = shockWaveTimingFor(input);
  invariant(state.displayTransfer.oam === (age === 0 ? "initial" : "preceding-software") && state.displayTransfer.matrices === (age === 0 ? "initial" : "preceding-software"), `${orientation}/${age}: OAM/matrix transfer latch`);
  if (age > 0) { invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam) && same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${orientation}/${age}: whole OAM/matrices RAM+1`); }
  invariant(state.displayTransfer.palette === (age === 0 ? "initial" : age === 13 ? "same-row-monbg-setup" : "preceding-faded"), `${orientation}/${age}: palette transfer latch`);
  if (age > 0) invariant(same(row.hardwarePalette, rows[age - 1]!.fadedPalette) || age === 13, `${orientation}/${age}: hardware palette preceding faded`);
  invariant(state.displayTransfer.selectedBackground === (age >= 14 ? "visible-after-age-14" : "initial"), `${orientation}/${age}: BG/VRAM visibility latch`);
  invariant(state.registers[input.background.register] === (age >= 14 && age < timing.cleanupAge ? (input.background.setupValue + 512) % 512 : 0), `${orientation}/${age}: selected BG register schedule`);
}
function compareRow(orientation: ShockWaveOrientation, age: number, rows: Json[], input: ShockWaveLiveInputs): void {
  const row = rows[age]!, state = shockWaveAtAge(age, input), timing = shockWaveTimingFor(input);
  invariant(state.age === age && state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait, `${orientation}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  compareTasks(orientation, age, row, state); compareSprites(orientation, age, row, state);
  // Battler OAM/matrix cleanup after the root returns inactive belongs to the
  // surrounding battle scene.  The move-owned contract is live geometry plus
  // ShakeMon's x2/y2 writes; whole OAM transfer is pinned independently below.
  invariant(state.battlers.attacker.sprite.x === row.battlerSprites.attacker.x && state.battlers.attacker.sprite.y === row.battlerSprites.attacker.y && state.battlers.attacker.sprite.x2 === row.battlerSprites.attacker.x2 && state.battlers.attacker.sprite.y2 === row.battlerSprites.attacker.y2 && state.battlers.target.sprite.x === row.battlerSprites.target.x && state.battlers.target.sprite.y === row.battlerSprites.target.y && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2 && state.battlers.target.sprite.y2 === row.battlerSprites.target.y2, `${orientation}/${age}: battler geometry/ShakeMon`);
  invariant(state.painterOrder.length === 64 && new Set(state.painterOrder).size === 64 && state.painterOrder.every((slot) => row.spriteOrder.includes(slot)), `${orientation}/${age}: live painter-order permutation`);
  invariant(state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: matrix allocator bitmap`);
  for (const [name, tag] of Object.entries(SHOCK_WAVE_RESOURCE_TAGS)) invariant(state.resources.tags[name as keyof typeof SHOCK_WAVE_RESOURCE_TAGS].loaded === row.tileTags.includes(tag) && state.resources.tags[name as keyof typeof SHOCK_WAVE_RESOURCE_TAGS].loaded === row.paletteTags.includes(tag), `${orientation}/${age}: resource ${name} lifetime`);
  invariant(state.palette.simpleBlendCoefficient === (age < 19 ? 0 : age < 23 ? 2 : age < timing.shakeStart + 2 ? 4 : 0), `${orientation}/${age}: simple palette program`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.firstInactive === (age === timing.cleanupAge) && state.cleanup.resourcesReleased === (age >= timing.cleanupAge), `${orientation}/${age}: cleanup counters`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplay === row.rawBattleState.gameplayRng && state.rng.gameplayUnchanged, `${orientation}/${age}: RNG split`);
  invariant(same(row.immutableState, rows[0]!.immutableState) && same(row.rawBattleState.gameplayRng, rows[0]!.rawBattleState.gameplayRng), `${orientation}/${age}: immutable gameplay`);
  compareLatches(orientation, age, rows, state, input);
}

function replayOrientation(orientation: ShockWaveOrientation): { readonly retainedRows: number; readonly reducerRows: number; readonly seamRows: number; readonly cleanup: number } {
  const rows = rowsFor(orientation), input = shockWaveInputsFor(orientation, rows), config = shockWaveConfigFor(orientation, rows), expectedCleanup = shockWaveFirstInactiveAge(input);
  invariant(rows.length === expectedCleanup + 1, `${orientation}: complete retained root through cleanup`);
  for (let pass = 0; pass < 2; pass += 1) for (const [age] of rows.entries()) {
    compareRow(orientation, age, rows, input);
    const reduced = shockWaveAtAge(age, input), seam = sceneOnShockWaveView({ age, config } as SceneOnShockWavePresentationState);
    const { attacker, target, ...seamState } = seam;
    invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: typed seam divergence`);
  }
  invariant(shockWaveSourceAtAge(expectedCleanup, shockWaveTimingFor(input).lightningStart).active === false, `${orientation}: inactive source cleanup`);
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: expectedCleanup };
}

/** Replay both retained maps twice; no framebuffer or coverage credit. */
export function verifyShockWaveReducer() {
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyShockWaveReducer(), null, 2));
