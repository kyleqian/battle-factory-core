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
  const row = rows[start]!, tileSlot = row.tileTags.indexOf(tag), paletteAllocatorSlot = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, `missing live allocation ${tag}`);
  const tileRange = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(tileRange) && tileRange.length === 2, `missing live tile range ${tag}`);
  const hardwarePaletteBank = 16 + paletteAllocatorSlot;
  return { tag, tileSlot, paletteAllocatorSlot, hardwarePaletteBank, tileRange: [tileRange[0], tileRange[1]], palette: row.fadedPalette.slice(hardwarePaletteBank * 16, hardwarePaletteBank * 16 + 16) };
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
    allocator: {
      initialOccupiedSprites: initialOccupied,
      initialMatrixBitmap: row0.resourceAllocators.matrixBitmap,
      spriteOrder: row0.spriteOrder,
      initialLiveSprites: row0.sprites.map((entry: Json) => ({ slot: entry.slot, attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority })),
    },
    oam: { charging: sourceOam(row31, "gElectricChargingParticlesSpriteTemplate"), orb: sourceOam(row45, "gGrowingShockWaveOrbSpriteTemplate"), progressing: sourceOam(row77, "gShockWaveProgressingBoltSpriteTemplate"), lightning: sourceOam(rowLightningSprite, "gLightningSpriteTemplate"), paletteBlend: sourceOam(row16, "gSimplePaletteBlendSpriteTemplate") },
    palettes: { unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette },
    background: (() => {
      const bg = orientation === "player-back" ? 2 : 1;
      const xKey = `gBattle_BG${bg}_X`, yKey = `gBattle_BG${bg}_Y`;
      const controlRegister = `bg${bg}cnt`, horizontalRegister = `bg${bg}hofs`, verticalRegister = `bg${bg}vofs`;
      return {
        values: row0.battleBg, xKey, yKey, controlRegister, horizontalRegister, verticalRegister,
        setupX: rows[13]!.battleBg[xKey], setupY: rows[13]!.battleBg[yKey], setupControl: rows[14]!.registers[controlRegister],
        clearX: rows[timing.cleanupAge - 1]!.battleBg[xKey], clearY: rows[timing.cleanupAge - 1]!.battleBg[yKey], clearControl: rows[timing.cleanupAge]!.registers[controlRegister],
        clearHorizontal: rows[timing.cleanupAge]!.registers[horizontalRegister], clearVertical: rows[timing.cleanupAge]!.registers[verticalRegister],
        monbgPaletteBank: orientation === "player-back" ? 9 : 8,
        initialVram: row0.bgVram, setupVram: rows[14]!.bgVram, clearingVram: rows[timing.cleanupAge - 2]!.bgVram, clearVram: rows[timing.cleanupAge]!.bgVram,
      };
    })(),
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
    fieldProfile: { playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp, opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp, playerGender: rows[0]!.parties.player[0].gender, opponentGender: rows[0]!.parties.opponent[0].gender },
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
  const row = rows[age]!;
  invariant(state.displayTransfer.oam === (age === 0 ? "initial" : "preceding-software") && state.displayTransfer.matrices === (age === 0 ? "initial" : "preceding-software"), `${orientation}/${age}: OAM/matrix transfer latch`);
  if (age > 0) { invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam) && same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${orientation}/${age}: whole OAM/matrices RAM+1`); }
  invariant(state.displayTransfer.palette === (age === 0 ? "initial" : age === 13 ? "same-row-monbg-setup" : "preceding-faded"), `${orientation}/${age}: palette transfer latch`);
  if (age > 0) invariant(age === 13 ? same(row.hardwarePalette, row.fadedPalette) : same(row.hardwarePalette, rows[age - 1]!.fadedPalette), `${orientation}/${age}: exact hardware palette transfer`);
  invariant(state.displayTransfer.selectedBackground === (age >= 14 ? "visible-after-age-14" : "initial"), `${orientation}/${age}: BG/VRAM visibility latch`);
  invariant(state.background.values[input.background.xKey] === row.battleBg[input.background.xKey] && state.background.values[input.background.yKey] === row.battleBg[input.background.yKey], `${orientation}/${age}: selected BG source X/Y`);
  for (const register of [input.background.controlRegister, input.background.horizontalRegister, input.background.verticalRegister]) invariant(state.registers[register] === row.registers[register], `${orientation}/${age}: selected ${register}`);
  invariant(same(state.background.vram, row.bgVram), `${orientation}/${age}: setup/clear BG VRAM`);
  for (const register of Object.keys(input.registers).filter((entry) => ![input.background.controlRegister, input.background.horizontalRegister, input.background.verticalRegister, "bldcnt", "bldalpha"].includes(entry))) invariant(state.registers[register] === input.registers[register], `${orientation}/${age}: preserve unrelated register ${register}`);
}
function bank(palette: readonly number[], index: number): readonly number[] { return palette.slice(index * 16, index * 16 + 16); }
function comparePalette(orientation: ShockWaveOrientation, age: number, row: Json, state: ShockWaveState, input: ShockWaveLiveInputs): void {
  const banks = [...new Set(state.palette.banks)];
  for (const index of banks) {
    invariant(same(bank(state.palette.unfaded, index), bank(row.unfadedPalette, index)), `${orientation}/${age}: unfaded bank ${index}`);
    invariant(same(bank(state.palette.faded, index), bank(row.fadedPalette, index)), `${orientation}/${age}: faded bank ${index}`);
    invariant(same(bank(state.palette.hardware, index), bank(row.hardwarePalette, index)), `${orientation}/${age}: hardware bank ${index}`);
  }
  const unrelated = 31;
  invariant(!banks.includes(unrelated) && same(bank(state.palette.unfaded, unrelated), bank(input.palettes.unfaded, unrelated)) && same(bank(state.palette.faded, unrelated), bank(input.palettes.faded, unrelated)), `${orientation}/${age}: caller-owned palette bank preserved`);
}
function compareAudio(orientation: ShockWaveOrientation, age: number, row: Json, state: ShockWaveState, input: ShockWaveLiveInputs): void {
  for (const event of state.audio) {
    const channel = event.sound === "se_m_thunderbolt" ? row.audio.SE2 : row.audio.SE1;
    invariant(channel.songHeaderIdentity.symbol === event.sound && channel.tracks.some((track: Json) => track.panX === event.pan), `${orientation}/${age}: ${event.sound} pan ${event.pan}`);
  }
  if (age === 31 || age === shockWaveTimingFor(input).lightningStart) invariant(state.audio.length > 0, `${orientation}/${age}: scripted audio event`);
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
  if (age < timing.cleanupAge) for (const role of ["attacker", "target"] as const) {
    const actual = state.battlers[role].sprite, expected = row.battlerSprites[role];
    invariant(same({ attr: actual.attr, subpriority: actual.subpriority, oamPriority: actual.oamPriority, matrixNum: actual.matrixNum, matrix: actual.matrix }, { attr: expected.attr, subpriority: expected.subpriority, oamPriority: (expected.attr[2] >>> 10) & 3, matrixNum: expected.matrixNum, matrix: expected.matrix }), `${orientation}/${age}: ${role} OAM/matrix state`);
  }
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: exact live painter order`);
  invariant(state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: matrix allocator bitmap`);
  for (const [name, tag] of Object.entries(SHOCK_WAVE_RESOURCE_TAGS)) {
    const resource = state.resources.tags[name as keyof typeof SHOCK_WAVE_RESOURCE_TAGS];
    invariant(resource.loaded === row.tileTags.includes(tag) && resource.loaded === row.paletteTags.includes(tag), `${orientation}/${age}: resource ${name} lifetime`);
    if (resource.loaded) invariant(row.tileTags[resource.tileSlot] === tag && row.paletteTags[resource.paletteAllocatorSlot] === tag && resource.hardwarePaletteBank === resource.paletteAllocatorSlot + 16 && same(row.resourceAllocators.tileRanges[resource.tileSlot], resource.tileRange), `${orientation}/${age}: exact resource ${name} allocation`);
  }
  invariant(state.palette.simpleBlendCoefficient === (age < 19 ? 0 : age < 23 ? 2 : age < timing.shakeStart + 2 ? 4 : 0), `${orientation}/${age}: simple palette program`);
  comparePalette(orientation, age, row, state, input); compareAudio(orientation, age, row, state, input);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === ownedRows(row).length && state.cleanup.firstInactive === (age === timing.cleanupAge) && state.cleanup.resourcesReleased === (age >= timing.cleanupAge), `${orientation}/${age}: cleanup counters and owned sprites`);
  const expectedDraws = age < timing.cleanupAge - 2 ? age : age < timing.cleanupAge ? timing.cleanupAge - 3 : timing.cleanupAge - 2;
  invariant(state.rng.animation === row.animationRng && state.rng.sourceDraws === expectedDraws && state.rng.gameplay === row.rawBattleState.gameplayRng && state.rng.gameplayUnchanged, `${orientation}/${age}: RNG split and source draw schedule`);
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
