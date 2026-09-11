/**
 * Development-only strict semantic replay for MOVE_SHEER_COLD.
 *
 * The retained dense rows are an oracle contract for this verifier only.
 * Production imports neither this module nor any evidence/RGB artifact.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SHEER_COLD_CUBE_HARDWARE_OAM_END_AGE,
  SHEER_COLD_CUBE_SOFTWARE_OAM_END_AGE,
  SHEER_COLD_FIRST_INACTIVE_AGE_BY_TARGET,
  sheerColdAtAge,
  sheerColdFirstInactiveAge,
  type SheerColdLiveInputs,
} from "../../src/animation/sheerCold.ts";
import {
  sceneOnSheerColdView,
  type SceneOnSheerColdPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SheerColdOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const orientations: readonly SheerColdOrientation[] = ["player-back", "opponent-front"];
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sheer-cold-evidence.json"), "utf8")) as Json;
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SHEER_COLD reducer drift: ${message}`);
}
function namedTask(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((task: Json) => task.func?.symbol === symbol);
}
function allocation(row: Json, tag: number): { paletteBank: number; tileSlot: number; tileRange: readonly [number, number] } {
  const paletteBank = row.paletteTags.indexOf(tag);
  const tileSlot = row.tileTags.indexOf(tag);
  invariant(paletteBank >= 0 && tileSlot >= 0, `missing allocation ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  return { paletteBank, tileSlot, tileRange: [range[0], range[1]] };
}

export function sheerColdInputsFor(
  orientation: SheerColdOrientation,
  rows: readonly Json[],
): SheerColdLiveInputs {
  const row0 = rows[0]!;
  const row39 = rows[39]!;
  const row42 = rows[42]!;
  const row45 = rows[45]!;
  const attacker = row0.battlerSprites.attacker;
  const target = row0.battlerSprites.target;
  const update = namedTask(row42, "Task_UpdateMonBg");
  const cube = row45.sprites.find((sprite: Json) => sprite.template?.symbol === "sFrozenIceCubeSpriteTemplate");
  const fade = namedTask(rows[1]!, "Task_FadeToBg");
  const sound = namedTask(row45, "Task_WaitAndPlaySE");
  const clear = namedTask(rows[150]!, "Task_ClearMonBg");
  const restore = rows[150]!.tasks.find((task: Json) => task.func?.symbol === "Task_FadeToBg" && task.data[0] === -1);
  invariant(update && cube && fade && sound && clear && restore, `${orientation}: required source allocations`);
  const targetSide = orientation === "player-back" ? "opponent" : "player";
  const animationCenter = { x: cube.x + 32, y: cube.y + 36 };
  const restoreEnd = rows.reduce((last, row, age) => namedTask(row, "Task_FadeToBg")?.data[0] === -1 ? age : last, -1);
  return {
    attackerSide: orientation === "player-back" ? "player" : "opponent",
    targetSide,
    attackerSpecies: "DEWGONG",
    targetSpecies: "CHANSEY",
    targetAnimationCenter: animationCenter,
    targetBattlePositionCenter: { x: update.data[1], y: update.data[2] },
    attackerSprite: { slot: attacker.slot, subpriority: attacker.subpriority, matrixNum: attacker.matrixNum, matrix: attacker.matrix },
    targetSprite: { slot: target.slot, subpriority: target.subpriority, matrixNum: target.matrixNum, matrix: target.matrix },
    cubeSpriteSlot: cube.slot,
    taskSlots: {
      fadeToBg: fade.slot, cube: namedTask(row45, "AnimTask_FrozenIceCube_Step1")!.slot,
      updateMonBg: update.slot, sound: sound.slot, clearMonBg: clear.slot, restoreBg: restore.slot,
    },
    resources: { iceCube: allocation(row39, 10010) },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    spriteOrder: row0.spriteOrder,
    painterSprites: row0.sprites.map((sprite: Json) => ({
      slot: sprite.slot,
      subpriority: sprite.subpriority,
      oamPriority: (sprite.attr[2] >>> 10) & 3,
      y: sprite.y,
    })),
    monbg: {
      layer: update.data[5] === 1 ? "bg2" : "bg1",
      scroll: { x: update.data[3], y: update.data[4] },
    },
    background: { bg1Cnt: row0.registers.bg1cnt, bg2Cnt: row0.registers.bg2cnt },
    animationRng: row0.animationRng,
    gameplayRng: row0.rawBattleState.gameplayRng,
    restoreFadeEndAge: restoreEnd,
  };
}

export function sheerColdConfigFor(
  orientation: SheerColdOrientation,
  rows: readonly Json[],
): SceneOnSheerColdPresentationState["config"] {
  const input = sheerColdInputsFor(orientation, rows);
  const row0 = rows[0]!;
  const attacker = row0.battlerSprites.attacker;
  const target = row0.battlerSprites.target;
  const {
    attackerSide, targetSide, attackerSpecies, targetSpecies,
    targetAnimationCenter, targetBattlePositionCenter, ...animationInputs
  } = input;
  return {
    move: "SHEER_COLD",
    attacker: { species: attackerSpecies as never, geometry: {
      side: attackerSide, spriteCorner: { x: attacker.x - 32, y: attacker.y - 32 },
      animationCenter: { x: attacker.x, y: attacker.y }, battlePositionCenter: { x: attacker.x, y: attacker.y },
    } },
    target: { species: targetSpecies as never, geometry: {
      side: targetSide, spriteCorner: { x: target.x - 32, y: target.y - 32 },
      animationCenter: targetAnimationCenter!, battlePositionCenter: targetBattlePositionCenter!,
    } },
    fieldProfile: {
      playerHp: row0.battlers.player.hp, playerMaxHp: row0.battlers.player.maxHp,
      opponentHp: row0.battlers.opponent.hp, opponentMaxHp: row0.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "female",
    },
    animationInputs,
  } as SceneOnSheerColdPresentationState["config"];
}

function compareRow(
  orientation: SheerColdOrientation,
  age: number,
  row: Json,
  previous: Json | undefined,
  input: SheerColdLiveInputs,
  state: ReturnType<typeof sheerColdAtAge>,
): void {
  invariant(state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${orientation}/${age}: source cursor/wait`);
  invariant(state.active === row.animScriptActive, `${orientation}/${age}: source active`);
  const expectedCube = row.sprites.find((sprite: Json) => sprite.template?.symbol === "sFrozenIceCubeSpriteTemplate");
  invariant(state.sprites.length === (expectedCube ? 1 : 0), `${orientation}/${age}: cube parent lifetime`);
  if (expectedCube) {
    const cube = state.sprites[0]!;
    invariant(cube.slot === expectedCube.slot && cube.x === expectedCube.x && cube.y === expectedCube.y,
      `${orientation}/${age}: cube anchor`);
    invariant(cube.callback === expectedCube.callback.symbol && same(cube.data, expectedCube.data),
      `${orientation}/${age}: cube callback/data`);
    invariant(cube.matrixNum === expectedCube.matrixNum && same(cube.matrix, expectedCube.matrix)
      && cube.subpriority === expectedCube.subpriority && cube.flags === expectedCube.flags,
    `${orientation}/${age}: off-affine cube state`);
  }
  const ownNames = new Set([
    "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_WaitAndPlaySE",
    "AnimTask_FrozenIceCube_Step1", "AnimTask_FrozenIceCube_Step2",
    "AnimTask_FrozenIceCube_Step3", "AnimTask_FrozenIceCube_Step4",
  ]);
  const expectedTasks = row.tasks.filter((task: Json) => ownNames.has(task.func?.symbol));
  invariant(state.tasks.length === expectedTasks.length, `${orientation}/${age}: task topology`);
  for (const task of state.tasks) {
    const expected = expectedTasks.find((candidate: Json) => candidate.slot === task.slot && candidate.func?.symbol === task.callback);
    invariant(expected && same(task.data, expected.data), `${orientation}/${age}: task ${task.callback}/${task.slot} data`);
  }
  const loaded = row.tileTags.includes(10010) && row.paletteTags.includes(10010);
  invariant(state.resources.iceCube.loaded === loaded && state.resources.iceCube.tag === (loaded ? 10010 : null), `${orientation}/${age}: ICE_CUBE resource`);
  invariant(state.resources.iceCube.paletteBank === input.resources.iceCube.paletteBank
    && state.resources.iceCube.tileSlot === input.resources.iceCube.tileSlot
    && same(state.resources.iceCube.tileRange, input.resources.iceCube.tileRange), `${orientation}/${age}: ICE_CUBE allocation`);
  const rotations = [71, 74, 77, 94, 97, 100].filter((edge) => age >= edge).length;
  invariant(state.resources.iceCube.paletteRotation === rotations && state.palette.cubeRotation === rotations,
    `${orientation}/${age}: ICE_CUBE palette evolution`);
  const resourceLive = age >= 39 && age < sheerColdFirstInactiveAge(input);
  invariant(state.palette.fadedWrite === resourceLive && state.palette.hardwareWrite === (age > 39 && resourceLive),
    `${orientation}/${age}: ICE_CUBE palette transfer writes`);
  invariant(state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap
    && state.resources.allocator.affineAllocated === false, `${orientation}/${age}: matrix allocation`);
  invariant(state.background.monbg === Boolean(namedTask(row, "Task_UpdateMonBg")), `${orientation}/${age}: monbg lifetime`);
  const bgX = state.background.layer === "bg1" ? row.battleBg.gBattle_BG1_X : row.battleBg.gBattle_BG2_X;
  const bgY = state.background.layer === "bg1" ? row.battleBg.gBattle_BG1_Y : row.battleBg.gBattle_BG2_Y;
  invariant(state.background.softwareScroll.x === bgX && state.background.softwareScroll.y === bgY,
    `${orientation}/${age}: monbg scroll`);
  invariant(same(state.background.splitPriority, state.background.layer === "bg1"
    ? { bg1: age >= 42 ? 2 : 0, bg2: 0 }
    : { bg1: age >= 45 ? 1 : 0, bg2: age >= 43 ? 2 : 0 }), `${orientation}/${age}: split priority lifecycle`);
  invariant(state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha
    && state.registers.bldy === row.registers.bldy, `${orientation}/${age}: blend/BG_ICE registers`);
  invariant(state.registers.bg1cnt === row.registers.bg1cnt && state.registers.bg2cnt === row.registers.bg2cnt,
    `${orientation}/${age}: split BG control registers`);
  invariant(state.registers.bg1hofs === row.registers.bg1hofs && state.registers.bg1vofs === row.registers.bg1vofs
    && state.registers.bg2hofs === row.registers.bg2hofs && state.registers.bg2vofs === row.registers.bg2vofs,
  `${orientation}/${age}: target BG display offsets`);
  invariant(state.painterOrder.length === row.spriteOrder.length && same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: stable painter order`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === (expectedCube ? 1 : 0), `${orientation}/${age}: task ownership/cleanup`);
  const expectedAudio = age === 20
      ? [{ age, sound: "SE_M_ICY_WIND", pan: 0 }]
      : age === 62
      ? [{ age, sound: "SE_M_HAIL", pan: input.targetSide === "opponent" ? 63 : -63 }]
      : [];
  invariant(same(state.audio, expectedAudio), `${orientation}/${age}: audio/order`);
  invariant(state.rng.sourceDraws === 0 && state.rng.gameplayUnchanged === true
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng), `${orientation}/${age}: RNG separation`);
  if (age > 0) {
    invariant(same(row.hardwareOam, previous!.softwareOam) && state.displayTransfer.oam === "preceding-software",
      `${orientation}/${age}: OAM +1 transfer`);
    invariant(same(row.hardwareMatrices, previous!.softwareMatrices) && state.displayTransfer.matrices === "preceding-software",
      `${orientation}/${age}: matrix +1 transfer`);
    const sameRowPalette = age === 42;
    invariant(sameRowPalette ? state.displayTransfer.palette === "same-row-monbg-setup" : state.displayTransfer.palette === "preceding-faded",
      `${orientation}/${age}: palette transfer latch`);
  }
  const softwareCube = age >= 45 && age <= SHEER_COLD_CUBE_SOFTWARE_OAM_END_AGE;
  const hardwareCube = age >= 46 && age <= SHEER_COLD_CUBE_HARDWARE_OAM_END_AGE;
  const parentX = (input.targetAnimationCenter ?? input.targetBattlePositionCenter).x - 32;
  const parentY = (input.targetAnimationCenter ?? input.targetBattlePositionCenter).y - 36;
  const expectedPieces = [
    { index: 0, x: parentX - 16, y: parentY - 16, width: 32, height: 32, tileOffset: 0, priority: 2, flipX: false, flipY: false },
    { index: 1, x: parentX - 16, y: parentY + 48, width: 32, height: 32, tileOffset: 64, priority: 2, flipX: false, flipY: false },
    { index: 2, x: parentX + 48, y: parentY - 16, width: 32, height: 32, tileOffset: 96, priority: 2, flipX: false, flipY: false },
    { index: 3, x: parentX + 48, y: parentY + 48, width: 32, height: 32, tileOffset: 128, priority: 2, flipX: false, flipY: false },
  ];
  invariant(same(state.subsprites.software, softwareCube ? expectedPieces : [])
    && same(state.subsprites.hardware, hardwareCube ? expectedPieces : []), `${orientation}/${age}: four cube OAM pieces`);
}

function replay(orientation: SheerColdOrientation): Json {
  const receipt = fixture.orientations[orientation];
  const probe = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  invariant(rows.length === (orientation === "player-back" ? 192 : 191), `${orientation}: retained row count`);
  const input = sheerColdInputsFor(orientation, rows);
  const config = sheerColdConfigFor(orientation, rows);
  let reducerRows = 0;
  let seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let age = 0; age < rows.length; age += 1) {
      const reduced = sheerColdAtAge(age, input);
      const view = sceneOnSheerColdView({ age, config });
      compareRow(orientation, age, rows[age]!, rows[age - 1], input, reduced);
      invariant(view.source.pointerOffset === reduced.source.pointerOffset
        && same(view.tasks, reduced.tasks) && same(view.subsprites, reduced.subsprites), `${orientation}/${age}: typed seam drift`);
      reducerRows += 1;
      seamRows += 1;
    }
  }
  const inactiveAge = SHEER_COLD_FIRST_INACTIVE_AGE_BY_TARGET[input.targetSide];
  const clean = sheerColdAtAge(inactiveAge, input);
  invariant(!clean.active && clean.cleanup.firstInactive && clean.tasks.length === 0
    && clean.sprites.length === 0 && clean.resources.iceCube.loaded === false
    && clean.cleanup.visualTasks === 0 && clean.cleanup.soundTasks === 0,
  `${orientation}: first inactive cleanup`);
  return {
    retainedRows: rows.length, reducerRows, seamRows,
    lifecycle: { cubeTask: "45..148", cubeSprite: "45..146", firstInactive: inactiveAge },
    latches: { oam: `${rows.length - 1}/${rows.length - 1} predecessor`, matrices: `${rows.length - 1}/${rows.length - 1} predecessor`, palette: "preceding-faded except age 42" },
    framebufferCompared: false, coverageCredit: false,
  };
}

export function verifySheerColdReducer(): Json {
  const result = Object.fromEntries(orientations.map((orientation) => [orientation, replay(orientation)]));
  return {
    ...result,
    bilateral: { retainedRows: 383, passes: 2, reducerRows: 766, seamRows: 766, framebufferCompared: false, coverageCredit: false },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifySheerColdReducer(), null, 2));
}
