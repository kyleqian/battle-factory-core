/** Hermetic retained-row verifier for MOVE_SNORE's reducer and typed seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SNORE_FIRST_INACTIVE_AGE, SNORE_Z_TAG, snoreAtAge,
  type SnoreLiveInputs, type SnoreState,
} from "../../src/animation/snore.ts";
import { sceneOnSnoreView, type SceneOnSnorePresentationState } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SnoreOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_SNORE reducer drift: ${message}`); }
function rowsFor(orientation: SnoreOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/snore-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}
function battler(entry: Json): SnoreLiveInputs["attackerSprite"] {
  return { slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: [entry.matrix[0], entry.matrix[1], entry.matrix[2], entry.matrix[3]], flags: entry.flags,
    animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter, data: entry.data };
}
function allocation(entry: Json): SnoreLiveInputs["effectAllocations"][number]["z"][number] {
  return { slot: entry.slot, attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, flags: entry.flags };
}
function sprite(row: Json, symbol: string): Json[] { return row.sprites.filter((entry: Json) => entry.template?.symbol === symbol).sort((a: Json, b: Json) => a.slot - b.slot); }
function task(row: Json, symbol: string): Json { const found = row.tasks.find((entry: Json) => entry.func?.symbol === symbol); invariant(found, `missing ${symbol}`); return found; }

export function snoreInputsFor(orientation: SnoreOrientation, rows = rowsFor(orientation)): SnoreLiveInputs {
  const first = rows[0]!, birth = rows[7]!, second = rows[39]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const resourceRow = rows[1]!, tileSlot = resourceRow.tileTags.indexOf(SNORE_Z_TAG), paletteAllocatorSlot = resourceRow.paletteTags.indexOf(SNORE_Z_TAG), paletteBank = 16 + paletteAllocatorSlot;
  const zBirth = sprite(birth, "gSnoreZSpriteTemplate"), zSecond = sprite(second, "gSnoreZSpriteTemplate");
  const platformBirth = sprite(birth, "gShakeMonOrPlatformSpriteTemplate")[0]!, platformSecond = sprite(second, "gShakeMonOrPlatformSpriteTemplate")[0]!;
  const activeOrderKeys = first.sprites.map((entry: Json) => ({ slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff }));
  const bg = attackerSide === "player" ? 2 as const : 1 as const;
  const registerAge = attackerSide === "player" ? 5 : 4;
  return {
    attackerSide, targetSide, attackerSpecies: "SEALEO", targetSpecies: "VENOMOTH",
    attackerPictureOrigin: { x: zBirth[0]!.x, y: zBirth[0]!.y }, targetPictureOrigin: { x: platformBirth.x, y: platformBirth.y },
    attackerSprite: battler(first.battlerSprites.attacker), targetSprite: battler(first.battlerSprites.target),
    taskSlots: { scale: task(birth, "AnimTask_ScaleMonAndRestore_Step").slot, monbg: task(rows[4]!, "Task_UpdateMonBg").slot, targetShake: task(birth, "AnimTask_ShakeMon2_Step").slot, clearMonbg: task(rows[65]!, "Task_ClearMonBg").slot },
    effectAllocations: [
      { platform: allocation(platformBirth), z: zBirth.map(allocation) },
      { platform: allocation(platformSecond), z: zSecond.map(allocation) },
    ],
    scaleMatrixNum: birth.battlerSprites.attacker.matrixNum,
    resource: { tag: SNORE_Z_TAG, tileSlot, paletteAllocatorSlot, paletteBank, tileRange: resourceRow.resourceAllocators.tileRanges[tileSlot], palette: resourceRow.unfadedPalette.slice(paletteBank * 16, paletteBank * 16 + 16) },
    allocator: { matrixBitmap: first.resourceAllocators.matrixBitmap, spriteOrder: first.spriteOrder, activeOrderKeys },
    palettes: { unfaded: first.unfadedPalette, faded: first.fadedPalette, hardware: first.hardwarePalette },
    background: { values: first.battleBg, registers: first.registers, monbg: { bg, activeCnt: rows[registerAge]!.registers[`bg${bg}cnt`], paletteBank: attackerSide === "player" ? 9 : 8 } },
    animationRngSeed: first.animationRng, gameplayRng: first.rawBattleState.gameplayRng, gameplayState: first.immutableState,
  };
}

export function snoreConfigFor(orientation: SnoreOrientation, rows = rowsFor(orientation)): SceneOnSnorePresentationState["config"] {
  const input = snoreInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOrigin, targetPictureOrigin, ...animationInputs } = input;
  const first = rows[0]!;
  return { move: "SNORE",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: attackerSide === "player" ? { x: 64, y: 92 } : { x: 176, y: 40 } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: targetSide === "player" ? { x: 64, y: 92 } : { x: 176, y: 40 } } },
    fieldProfile: { playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp, opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp, playerGender: first.parties.player[0].gender, opponentGender: first.parties.opponent[0].gender, playerStatus: first.parties.player[0].status.kind, opponentStatus: first.parties.opponent[0].status.kind }, animationInputs };
}

function compactRowSprite(entry: Json): unknown { return { slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, data: entry.data, animNum: entry.animNum, animCmdIndex: entry.animCmdIndex, animDelayCounter: entry.animDelayCounter }; }
function compactZ(entry: SnoreState["sprites"]["z"][number]): unknown { return { ...entry }; }
function compactRowPlatform(entry: Json): unknown { return { slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, data: entry.data }; }
function compactStatePlatform(entry: NonNullable<SnoreState["sprites"]["platform"]>): unknown { return { slot: entry.slot, template: entry.template, callback: entry.callback, attr: entry.attr, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority, oamPriority: entry.oamPriority, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, data: entry.data }; }
function compactTask(entry: Json): unknown { return { slot: entry.slot, callback: entry.func.symbol, data: entry.data }; }
const OWNED_TASKS = new Set(["Task_UpdateMonBg", "Task_ClearMonBg", "AnimTask_ScaleMonAndRestore_Step", "AnimTask_ShakeMon2_Step"]);

function compareRow(orientation: SnoreOrientation, age: number, rows: Json[], input: SnoreLiveInputs): void {
  const row = rows[age]!, state = snoreAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.owner === row.scriptOwner && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait, `${orientation}/${age}: complete source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: anim args`);
  invariant(same(state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data })), row.tasks.filter((entry: Json) => OWNED_TASKS.has(entry.func?.symbol)).sort((a: Json,b: Json)=>a.slot-b.slot).map(compactTask)), `${orientation}/${age}: task callbacks/data`);
  invariant(same(state.sprites.z.map(compactZ), sprite(row, "gSnoreZSpriteTemplate").map(compactRowSprite)), `${orientation}/${age}: all Z callback/OAM fields`);
  invariant(same(state.sprites.platform ? compactStatePlatform(state.sprites.platform) : null, (sprite(row, "gShakeMonOrPlatformSpriteTemplate")[0] ? compactRowPlatform(sprite(row, "gShakeMonOrPlatformSpriteTemplate")[0]!) : null)), `${orientation}/${age}: platform sprite fields`);
  invariant(state.battlers.attacker.species === "SEALEO" && state.battlers.target.species === "VENOMOTH" && state.battlers.attacker.sprite.matrixNum === row.battlerSprites.attacker.matrixNum && same(state.battlers.attacker.sprite.matrix, row.battlerSprites.attacker.matrix) && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2, `${orientation}/${age}: live battler identity/scale/shake`);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: persistent sprite order`);
  invariant(same(state.background.values, row.battleBg) && same(state.background.registers, row.registers), `${orientation}/${age}: monbg/platform/alpha registers`);
  invariant(same(state.palette.unfaded, row.unfadedPalette) && same(state.palette.faded, row.fadedPalette) && same(state.palette.hardware, row.hardwarePalette), `${orientation}/${age}: resource palette schedule`);
  const loaded = row.tileTags.includes(SNORE_Z_TAG) && row.paletteTags.includes(SNORE_Z_TAG);
  invariant(state.resources.snoreZ.loaded === loaded && state.resources.snoreZ.tag === (loaded ? SNORE_Z_TAG : null) && state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: resource/matrix lifecycle`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng) && same(state.rng.gameplayState, row.immutableState), `${orientation}/${age}: presentation RNG/gameplay opacity`);
  const expectedEvents = age === 7 || age === 39 ? [{ sound: "SE_M_SNORE", pan: "attacker", call: age === 7 ? 1 : 2 }] : [];
  invariant(same(state.audio.events, expectedEvents), `${orientation}/${age}: two audio restarts`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.firstInactive === (age === SNORE_FIRST_INACTIVE_AGE) && state.cleanup.resourcesReleased === (age === SNORE_FIRST_INACTIVE_AGE), `${orientation}/${age}: visual/audio/cleanup counts`);
  if (age > 0) invariant(state.displayTransfer.oam === "preceding-software" && same(row.hardwareOam, rows[age - 1]!.softwareOam), `${orientation}/${age}: OAM RAM+1`);
  for (const key of ["playerParty","opponentParty","battleMons","battleOutcome","battleWeather","gameplayRng"]) invariant(row.rawBattleState[key] === rows[0]!.rawBattleState[key], `${orientation}/${age}: immutable gameplay ${key}`);
}

function replay(orientation: SnoreOrientation) {
  const rows = rowsFor(orientation), input = snoreInputsFor(orientation, rows), config = snoreConfigFor(orientation, rows);
  const reducerStates = rows.map((_, age) => snoreAtAge(age, input));
  const seamStates = rows.map((_, age) => sceneOnSnoreView({ age, config } as SceneOnSnorePresentationState));
  invariant(rows.length === SNORE_FIRST_INACTIVE_AGE + 1, `${orientation}: complete retained window`);
  for (let pass = 0; pass < 2; pass += 1) for (const [age] of rows.entries()) {
    compareRow(orientation, age, rows, input);
    const reduced = snoreAtAge(age, input), seam = sceneOnSnoreView({ age, config } as SceneOnSnorePresentationState);
    const { attacker, target, ...seamState } = seam;
    invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: typed seam`);
  }
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: SNORE_FIRST_INACTIVE_AGE, reducerSha256: digest(reducerStates), seamSha256: digest(seamStates) };
}

export function verifySnoreReducer() {
  const player = replay("player-back"), opponent = replay("opponent-front");
  return { "player-back": { ...player, framebufferCompared: false, coverageCredit: false }, "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false }, bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false } } as const;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySnoreReducer(), null, 2));
