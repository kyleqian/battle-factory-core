/**
 * Strict semantic replay for MOVE_BONEMERANG's retained Scene-ON windows.
 *
 * Dense evidence is intentionally confined here.  The production reducer
 * imports no trace, canonical party, screenshot, raw RGB, or absolute battle
 * frame; it receives only current presentation facts through its typed seam.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  BONEMERANG_BONE_TAG,
  BONEMERANG_FIRST_INACTIVE_AGE,
  BONEMERANG_IMPACT_TAG,
  bonemerangAtAge,
  type BonemerangLiveInputs,
} from "../../src/animation/bonemerang.ts";
import {
  sceneOnBonemerangView,
  type SceneOnBonemerangPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type BonemerangOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const orientations: readonly BonemerangOrientation[] = ["player-back", "opponent-front"];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_BONEMERANG reducer drift: ${message}`);
}
function rowsFor(side: BonemerangOrientation): Json[] {
  const name = side === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/bonemerang-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}
function task(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}
function sprite(row: Json, symbol: string): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
}
function allocation(row: Json, tag: number) {
  const tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing tag allocation ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  return { tileSlot, paletteBank, tileRange: [range[0], range[1]] as const };
}
function battler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}

/** Extract scene inputs once; no reducer field is sourced from a later row. */
export function bonemerangInputsFor(side: BonemerangOrientation, rows: readonly Json[]): BonemerangLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row7 = rows[7]!, row8 = rows[8]!, row10 = rows[10]!;
  const row32 = rows[32]!, row51 = rows[51]!, row67 = rows[67]!;
  const bone = sprite(row10, "gBonemerangSpriteTemplate"), impact = sprite(row32, "gBasicHitSplatSpriteTemplate"), lunge = sprite(row51, "gHorizontalLungeSpriteTemplate");
  const shake = task(row32, "AnimTask_ShakeMon_Step"), update = task(row7, "Task_UpdateMonBg"), clear = task(row67, "Task_ClearMonBg");
  invariant(bone && impact && lunge && shake && update && clear, `${side}: live source allocation facts`);
  const targetSide = side === "player-back" ? "opponent" : "player";
  return {
    attackerSide: side === "player-back" ? "player" : "opponent", targetSide,
    attackerSpecies: "MAROWAK", targetSpecies: "CHANSEY",
    attackerPictureCenter: { x: bone.x, y: bone.y }, targetPictureCenter: { x: impact.x, y: impact.y },
    attackerSprite: battler(row0.battlerSprites.attacker), targetSprite: battler(row0.battlerSprites.target),
    allocations: {
      boneSpriteSlot: bone.slot, impactSpriteSlot: impact.slot, lungeSpriteSlot: lunge.slot,
      shakeTaskSlot: shake.slot, updateMonBgTaskSlot: update.slot, clearMonBgTaskSlot: clear.slot,
      boneMatrixSlot: bone.matrixNum, impactMatrixSlot: impact.matrixNum,
    },
    resources: { bone: allocation(row1, BONEMERANG_BONE_TAG), impact: allocation(row4, BONEMERANG_IMPACT_TAG) },
    spriteOrder: row0.spriteOrder,
    painterSprites: row0.sprites.map((entry: Json) => ({
      slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff,
    })),
    initialMatrixBitmap: row0.resourceAllocators.matrixBitmap,
    monbg: { layer: update.data[5] === 0 ? "bg1" : "bg2", scroll: { x: update.data[3], y: update.data[4] }, targetBgPriority: update.data[6] },
    background: {
      baseBg1Cnt: row0.registers.bg1cnt, baseBg2Cnt: row0.registers.bg2cnt,
      monbgBg1Cnt: row8.registers.bg1cnt, monbgBg2Cnt: row8.registers.bg2cnt,
      splitBg1Cnt: row10.registers.bg1cnt, splitBg2Cnt: row10.registers.bg2cnt,
    },
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function bonemerangConfigFor(side: BonemerangOrientation, rows: readonly Json[]): SceneOnBonemerangPresentationState["config"] {
  const input = bonemerangInputsFor(side, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureCenter, targetPictureCenter, ...animationInputs } = input;
  return {
    move: "BONEMERANG",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: attackerPictureCenter.x - 32, y: attackerPictureCenter.y - 32 }, animationCenter: attackerPictureCenter, battlePositionCenter: attackerPictureCenter } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: targetPictureCenter.x - 32, y: targetPictureCenter.y - 32 }, animationCenter: targetPictureCenter, battlePositionCenter: targetPictureCenter } },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp,
      playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp,
      opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
    },
    animationInputs,
  };
}
function ownedSprites(row: Json): Json[] {
  const names = new Set(["gBonemerangSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gHorizontalLungeSpriteTemplate"]);
  return row.sprites.filter((entry: Json) => names.has(entry.template?.symbol)).map((entry: Json) => ({
    slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, x: entry.x, y: entry.y,
    x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data,
  })).sort((left: Json, right: Json) => left.slot - right.slot);
}
function reducedSprites(state: ReturnType<typeof bonemerangAtAge>): Json[] {
  return state.sprites.map((entry) => ({
    slot: entry.slot, template: entry.template, callback: entry.callback, x: entry.x, y: entry.y,
    x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, oamPriority: entry.oamPriority,
    matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data,
  })).sort((left, right) => left.slot - right.slot);
}
function ownedTasks(row: Json): Json[] {
  const names = new Set(["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ShakeMon_Step"]);
  return row.tasks.filter((entry: Json) => names.has(entry.func?.symbol)).map((entry: Json) => ({ slot: entry.slot, callback: entry.func.symbol, data: entry.data }));
}
function reducedTasks(state: ReturnType<typeof bonemerangAtAge>): Json[] {
  return state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data }));
}
function signedScroll(value: number): number { return value > 0xff ? value - 0x200 : value; }
function expectedAudio(age: number, input: BonemerangLiveInputs): unknown {
  const attackerPan = input.attackerSide === "player" ? -64 : 63;
  const targetPan = input.targetSide === "player" ? -64 : 63;
  if (age === 10) return [{ channel: "SE1", sound: "SE_M_BONEMERANG", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }];
  if (age === 32) return [{ channel: "SE1", sound: "SE_M_HORN_ATTACK", sourcePan: "SOUND_PAN_TARGET", pan: targetPan }];
  if (age === 51) return [{ channel: "SE1", sound: "SE_M_VITAL_THROW", sourcePan: "SOUND_PAN_ATTACKER", pan: attackerPan }];
  return [];
}

function compareRow(side: BonemerangOrientation, age: number, row: Json, previous: Json | undefined, input: BonemerangLiveInputs): ReturnType<typeof bonemerangAtAge> {
  const state = bonemerangAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${side}/${age}: complete source cursor`);
  invariant(same(reducedSprites(state), ownedSprites(row)), `${side}/${age}: source projectile/hitsplat/lunge state`);
  invariant(same(reducedTasks(state), ownedTasks(row)), `${side}/${age}: source task state`);
  invariant(state.battlers.target.shake.x === row.battlerSprites.target.x2 && state.battlers.target.shake.y === row.battlerSprites.target.y2
    && state.battlers.target.visible === !row.battlerSprites.target.invisible && state.battlers.attacker.lunge.x === row.battlerSprites.attacker.x2,
  `${side}/${age}: battler shake/lunge`);
  invariant(state.resources.bone.loaded === row.tileTags.includes(BONEMERANG_BONE_TAG)
    && state.resources.impact.loaded === row.tileTags.includes(BONEMERANG_IMPACT_TAG)
    && state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap, `${side}/${age}: resource/matrix allocation`);
  const layer = input.monbg.layer, scroll = layer === "bg1"
    ? { x: row.battleBg.gBattle_BG1_X, y: row.battleBg.gBattle_BG1_Y }
    : { x: row.battleBg.gBattle_BG2_X, y: row.battleBg.gBattle_BG2_Y };
  const hardware = layer === "bg1"
    ? { x: signedScroll(row.registers.bg1hofs), y: signedScroll(row.registers.bg1vofs) }
    : { x: signedScroll(row.registers.bg2hofs), y: signedScroll(row.registers.bg2vofs) };
  invariant(same(state.background.softwareScroll, scroll) && same(state.background.hardwareScroll, hardware)
    && state.registers.bg1cnt === row.registers.bg1cnt && state.registers.bg2cnt === row.registers.bg2cnt
    && state.registers.bg1hofs === row.registers.bg1hofs && state.registers.bg1vofs === row.registers.bg1vofs
    && state.registers.bg2hofs === row.registers.bg2hofs && state.registers.bg2vofs === row.registers.bg2vofs
    && state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha,
  `${side}/${age}: monbg/split/alpha/register state`);
  invariant(same(state.painterOrder, row.spriteOrder), `${side}/${age}: painter order`);
  invariant(same(state.audio, expectedAudio(age, input)), `${side}/${age}: source audio/pan order`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng), `${side}/${age}: presentation/gameplay RNG boundary`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === ownedSprites(row).length, `${side}/${age}: task/sprite cleanup ownership`);
  if (age > 0) {
    invariant(same(row.hardwareOam, previous!.softwareOam) && same(row.hardwareMatrices, previous!.softwareMatrices)
      && state.displayTransfer.oam === "preceding-software" && state.displayTransfer.matrices === "preceding-software", `${side}/${age}: ordinary OAM/matrix RAM+1`);
    invariant(state.displayTransfer.palette === (age === 7 ? "same-row-monbg-setup" : "preceding-faded")
      && (age === 7 ? same(row.hardwarePalette, row.fadedPalette) : same(row.hardwarePalette, previous!.fadedPalette)), `${side}/${age}: palette transfer latch`);
  }
  return state;
}
function replay(side: BonemerangOrientation): Json {
  const rows = rowsFor(side);
  invariant(rows.length === 72, `${side}: complete retained root-to-cleanup rows`);
  const input = bonemerangInputsFor(side, rows), config = bonemerangConfigFor(side, rows);
  let reducerRows = 0, seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) for (let age = 0; age < rows.length; age += 1) {
    const reduced = compareRow(side, age, rows[age]!, rows[age - 1], input);
    const seam = sceneOnBonemerangView({ age, config });
    const { attacker: _attacker, target: _target, ...plainSeam } = seam;
    invariant(same(plainSeam, reduced), `${side}/${age}: narrow typed Scene-ON seam`);
    reducerRows += 1; seamRows += 1;
  }
  const inactive = bonemerangAtAge(BONEMERANG_FIRST_INACTIVE_AGE, input);
  invariant(!inactive.active && inactive.cleanup.firstInactive && inactive.sprites.length === 0 && inactive.tasks.length === 0
    && !inactive.resources.bone.loaded && !inactive.resources.impact.loaded && inactive.resources.allocator.matrixBitmap === input.initialMatrixBitmap,
  `${side}: first inactive cleanup`);
  return { retainedRows: 72, reducerRows, seamRows, cleanup: BONEMERANG_FIRST_INACTIVE_AGE, framebufferCompared: false, coverageCredit: false };
}

/** Replays all 144 retained bilateral component/state rows twice, through both boundaries. */
export function verifyBonemerangReducer(): Json {
  const results = Object.fromEntries(orientations.map((side) => [side, replay(side)]));
  return { ...results, bilateral: { retainedRows: 144, passes: 2, reducerRows: 288, seamRows: 288, framebufferCompared: false, coverageCredit: false } };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyBonemerangReducer(), null, 2));
}
