/**
 * Development-only strict semantic replay for MOVE_SMOG.
 *
 * Retained dense oracle rows stay on this verifier side of the presentation
 * seam. Production imports only src/animation/smog.ts and never reads a
 * recording, image, RGB byte, scenario, or absolute battle tick.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SMOG_FIRST_INACTIVE_AGE,
  SMOG_PURPLE_GAS_CLOUD_TAG,
  smogAtAge,
  type SmogLiveInputs,
} from "../../src/animation/smog.ts";
import {
  sceneOnSmogView,
  type SceneOnSmogPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SmogOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const orientations: readonly SmogOrientation[] = ["player-back", "opponent-front"];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SMOG reducer drift: ${message}`);
}
function task(row: Json, symbol: string, occurrence = 0): Json | undefined {
  return row.tasks.filter((entry: Json) => entry.func?.symbol === symbol)[occurrence];
}
function allocation(row: Json, tag: number): { paletteBank: number; tileSlot: number; tileRange: readonly [number, number] } {
  const paletteBank = row.paletteTags.indexOf(tag), tileSlot = row.tileTags.indexOf(tag);
  invariant(paletteBank >= 0 && tileSlot >= 0, `missing allocation ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  return { paletteBank, tileSlot, tileRange: [range[0], range[1]] };
}
function cloud(row: Json, index = 0): Json | undefined {
  return row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSmogCloudSpriteTemplate")[index];
}
function battlerSprite(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}

export function smogInputsFor(orientation: SmogOrientation, rows: readonly Json[]): SmogLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row5 = rows[5]!, row7 = rows[7]!, row192 = rows[192]!, row204 = rows[204]!, row301 = rows[301]!;
  const first = cloud(row7);
  const update = task(row4, "Task_UpdateMonBg"), mist = task(row7, "Task_LoopAndPlaySE");
  const blend = task(row192, "AnimTask_BlendColorCycleLoop"), toxic = task(row192, "Task_LoopAndPlaySE");
  const shake = task(row204, "AnimTask_ShakeMon2_Step"), clear = task(row301, "Task_ClearMonBg");
  invariant(first && update && mist && blend && toxic && shake && clear, `${orientation}: source allocations`);
  const targetSide = orientation === "player-back" ? "opponent" : "player";
  const target = battlerSprite(row0.battlerSprites.target);
  const attacker = battlerSprite(row0.battlerSprites.attacker);
  const cloudSlots = [7, 16, 25, 34, 43, 52, 61].map((age) => {
    const newest = rows[age]!.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSmogCloudSpriteTemplate").at(-1);
    invariant(newest, `${orientation}: cloud allocation at age ${age}`);
    return newest.slot;
  });
  return {
    attackerSide: orientation === "player-back" ? "player" : "opponent", targetSide,
    attackerSpecies: "MAGBY",
    targetSpecies: "ONIX",
    targetPictureOrigin: { x: first.x, y: first.y + 24 - (targetSide === "player" ? 8 : 0) },
    targetBgPriority: (first.attr[2] >>> 10) & 3,
    attackerSprite: attacker, targetSprite: target, cloudSpriteSlots: cloudSlots,
    taskSlots: { updateMonBg: update.slot, mistSound: mist.slot, blendColorCycle: blend.slot, shakeMon2: shake.slot, toxicSound: toxic.slot, clearMonBg: clear.slot },
    resources: { purpleGasCloud: allocation(row1, SMOG_PURPLE_GAS_CLOUD_TAG) },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    spriteOrder: row0.spriteOrder,
    painterSprites: row0.sprites.map((sprite: Json) => ({
      slot: sprite.slot, subpriority: sprite.subpriority, oamPriority: (sprite.attr[2] >>> 10) & 3,
      oamY: sprite.attr[0] & 0xff,
    })),
    monbg: { layer: update.data[5] === 1 ? "bg2" : "bg1", scroll: { x: update.data[3], y: update.data[4] } },
    background: {
      baseBg1Cnt: row0.registers.bg1cnt, baseBg2Cnt: row0.registers.bg2cnt,
      monbgBg1Cnt: row5.registers.bg1cnt, monbgBg2Cnt: row5.registers.bg2cnt,
      splitBg1Cnt: row7.registers.bg1cnt, splitBg2Cnt: row7.registers.bg2cnt,
    },
    targetPaletteBank: 16 + ((row0.battlerSprites.target.attr[2] >>> 12) & 0xf),
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function smogConfigFor(orientation: SmogOrientation, rows: readonly Json[]): SceneOnSmogPresentationState["config"] {
  const input = smogInputsFor(orientation, rows);
  const row0 = rows[0]!;
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, ...animationInputs } = input;
  return {
    move: "SMOG",
    attacker: { species: attackerSpecies as never, geometry: {
      side: attackerSide, spriteCorner: { x: row0.battlerSprites.attacker.x - 32, y: row0.battlerSprites.attacker.y - 32 },
      animationCenter: { x: row0.battlerSprites.attacker.x, y: row0.battlerSprites.attacker.y },
      battlePositionCenter: { x: row0.battlerSprites.attacker.x, y: row0.battlerSprites.attacker.y },
    } },
    target: { species: targetSpecies as never, geometry: {
      side: targetSide, spriteCorner: { x: row0.battlerSprites.target.x - 32, y: row0.battlerSprites.target.y - 32 },
      animationCenter: { x: row0.battlerSprites.target.x, y: row0.battlerSprites.target.y },
      battlePositionCenter: { x: row0.battlerSprites.target.x, y: row0.battlerSprites.target.y },
    } },
    fieldProfile: {
      playerHp: row0.battlers.player.hp, playerMaxHp: row0.battlers.player.maxHp,
      opponentHp: row0.battlers.opponent.hp, opponentMaxHp: row0.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    }, animationInputs,
  } as SceneOnSmogPresentationState["config"];
}

function compareRow(orientation: SmogOrientation, age: number, row: Json, previous: Json | undefined, input: SmogLiveInputs): ReturnType<typeof smogAtAge> {
  const state = smogAtAge(age, input);
  invariant(state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait && state.active === row.animScriptActive,
    `${orientation}/${age}: source cursor`);
  const expectedClouds = row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSmogCloudSpriteTemplate");
  invariant(state.sprites.length === expectedClouds.length, `${orientation}/${age}: cloud topology`);
  for (const sprite of state.sprites) {
    const expected = expectedClouds.find((entry: Json) => entry.slot === sprite.slot);
    invariant(expected && sprite.callback === expected.callback.symbol && sprite.x === expected.x && sprite.y === expected.y
      && sprite.x2 === expected.x2 && sprite.y2 === expected.y2 && sprite.oamPriority === ((expected.attr[2] >>> 10) & 3)
      && sprite.subpriority === expected.subpriority && sprite.matrixNum === expected.matrixNum && same(sprite.matrix, expected.matrix)
      && sprite.flags === expected.flags && sprite.animCmdIndex === expected.animCmdIndex && sprite.animDelayCounter === expected.animDelayCounter
      && same(sprite.data, expected.data), `${orientation}/${age}: cloud ${sprite.slot}`);
  }
  const ownNames = new Set(["Task_UpdateMonBg", "Task_LoopAndPlaySE", "AnimTask_BlendColorCycleLoop", "AnimTask_ShakeMon2_Step", "Task_ClearMonBg"]);
  const expectedTasks = row.tasks.filter((entry: Json) => ownNames.has(entry.func?.symbol));
  invariant(state.tasks.length === expectedTasks.length, `${orientation}/${age}: task topology`);
  for (const entry of state.tasks) {
    const expected = expectedTasks.find((candidate: Json) => candidate.slot === entry.slot && candidate.func?.symbol === entry.callback);
    invariant(expected && same(entry.data, expected.data), `${orientation}/${age}: ${entry.callback}/${entry.slot}`);
  }
  const loaded = row.tileTags.includes(SMOG_PURPLE_GAS_CLOUD_TAG) && row.paletteTags.includes(SMOG_PURPLE_GAS_CLOUD_TAG);
  invariant(state.resources.purpleGasCloud.loaded === loaded && state.resources.purpleGasCloud.tag === (loaded ? SMOG_PURPLE_GAS_CLOUD_TAG : null)
    && state.resources.purpleGasCloud.paletteBank === input.resources.purpleGasCloud.paletteBank
    && state.resources.purpleGasCloud.tileSlot === input.resources.purpleGasCloud.tileSlot
    && same(state.resources.purpleGasCloud.tileRange, input.resources.purpleGasCloud.tileRange), `${orientation}/${age}: purple asset allocation/release`);
  invariant(state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap && state.resources.allocator.affineAllocated === false,
    `${orientation}/${age}: no matrix allocation`);
  const paletteEdges = [196, 200, 204, 208, 212, 216, 226, 230, 234, 238, 242, 246];
  const expectedBlend = age < 196 || age > 246 ? 0
    : age <= 216 ? 2 * Math.floor((age - 192) / 4)
      : age < 226 ? 12 : 12 - 2 * Math.floor((age - 222) / 4);
  invariant(state.palette.purpleGasCloud.fadedWrite === (age === 1)
    && state.palette.purpleGasCloud.hardwareWrite === (age === 2)
    && state.palette.target.blendAmount === expectedBlend
    && state.palette.target.fadedWrite === paletteEdges.includes(age)
    && state.palette.target.hardwareWrite === paletteEdges.includes(age - 1), `${orientation}/${age}: source palette programs`);
  const layer = input.monbg.layer;
  const bgX = layer === "bg1" ? row.battleBg.gBattle_BG1_X : row.battleBg.gBattle_BG2_X;
  const bgY = layer === "bg1" ? row.battleBg.gBattle_BG1_Y : row.battleBg.gBattle_BG2_Y;
  invariant(state.background.monbg === (age >= 4 && age <= 303) && state.background.clearPending === (age >= 301 && age <= 303)
    && state.background.targetVisible === !row.battlerSprites.target.invisible, `${orientation}/${age}: monbg visibility/clear`);
  invariant(state.background.softwareScroll.x === bgX && state.background.softwareScroll.y === bgY,
    `${orientation}/${age}: selected BG software scroll`);
  invariant(state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha && state.registers.bldy === row.registers.bldy
    && state.registers.bg1cnt === row.registers.bg1cnt && state.registers.bg2cnt === row.registers.bg2cnt
    && state.registers.bg1hofs === row.registers.bg1hofs && state.registers.bg1vofs === row.registers.bg1vofs
    && state.registers.bg2hofs === row.registers.bg2hofs && state.registers.bg2vofs === row.registers.bg2vofs, `${orientation}/${age}: registers`);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: persistent painter order`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === expectedClouds.length,
    `${orientation}/${age}: visual/sound ownership`);
  const expectedDraws = age <= 302 ? age : age <= 304 ? 302 : age - 2;
  invariant(state.rng.animation === row.animationRng && state.rng.sourceDraws === expectedDraws && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng),
    `${orientation}/${age}: presentation/gameplay RNG boundary`);
  if (age > 0) {
    invariant(same(row.hardwareOam, previous!.softwareOam) && same(row.hardwareMatrices, previous!.softwareMatrices)
      && state.displayTransfer.oam === "preceding-software" && state.displayTransfer.matrices === "preceding-software", `${orientation}/${age}: OAM/matrix +1`);
    invariant(state.displayTransfer.palette === (age === 4 ? "same-row-monbg-setup" : "preceding-faded"), `${orientation}/${age}: palette latch`);
    invariant(age === 4 ? same(row.hardwarePalette, row.fadedPalette) : same(row.hardwarePalette, previous!.fadedPalette),
      `${orientation}/${age}: hardware palette source latch`);
  }
  return state;
}

function replay(orientation: SmogOrientation): Json {
  const path = orientation === "player-back"
    ? "tools/compare/evidence/smog-player-dense-state.json.gz"
    : "tools/compare/evidence/smog-opponent-dense-state.json.gz";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames as Json[];
  invariant(rows.length === 306, `${orientation}: retained dense rows`);
  const input = smogInputsFor(orientation, rows), config = smogConfigFor(orientation, rows);
  let reducerRows = 0, seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) for (let age = 0; age < rows.length; age += 1) {
    const reduced = compareRow(orientation, age, rows[age]!, rows[age - 1], input);
    const view = sceneOnSmogView({ age, config });
    invariant(view.source.pointerOffset === reduced.source.pointerOffset && same(view.sprites, reduced.sprites)
      && same(view.tasks, reduced.tasks) && same(view.registers, reduced.registers) && same(view.painterOrder, reduced.painterOrder), `${orientation}/${age}: typed seam`);
    reducerRows += 1; seamRows += 1;
  }
  const clean = smogAtAge(SMOG_FIRST_INACTIVE_AGE, input);
  invariant(!clean.active && clean.cleanup.firstInactive && clean.sprites.length === 0 && clean.tasks.length === 0
    && !clean.resources.purpleGasCloud.loaded && clean.cleanup.visualTasks === 0 && clean.cleanup.soundTasks === 0,
  `${orientation}: first inactive cleanup`);
  return {
    retainedRows: rows.length, reducerRows, seamRows,
    lifecycle: { clouds: "7..299", monbg: "4..303", cleanup: SMOG_FIRST_INACTIVE_AGE },
    latches: { oam: "305/305 predecessor", matrices: "305/305 predecessor", palette: "predecessor except age 4 monbg setup", targetBgScroll: "selected layer predecessor" },
    framebufferCompared: false, coverageCredit: false,
  };
}

/** Two complete strict replays of every retained Scene-ON component row. */
export function verifySmogReducer(): Json {
  const results = Object.fromEntries(orientations.map((orientation) => [orientation, replay(orientation)]));
  return {
    ...results,
    bilateral: { retainedRows: 612, passes: 2, reducerRows: 1224, seamRows: 1224, framebufferCompared: false, coverageCredit: false },
  };
}
