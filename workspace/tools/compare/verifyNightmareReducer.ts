/** Strict retained-state replay for MOVE_NIGHTMARE's source-age reducer/seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  nightmareAtAge,
  type NightmareBattlerSprite,
  type NightmareLiveInputs,
} from "../../src/animation/nightmare.ts";
import {
  sceneOnNightmareView,
  type SceneOnNightmarePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type NightmareOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(`MOVE_NIGHTMARE reducer drift: ${message}`); }

function rowsFor(side: NightmareOrientation): Json[] {
  const path = `tools/compare/evidence/nightmare-${side === "player-back" ? "player" : "opponent"}-dense-state.json.gz`;
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, path))).toString("utf8")) as Json).frames;
}
function compactSprite(entry: Json): NightmareBattlerSprite {
  return {
    slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol,
    x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2, subpriority: entry.subpriority,
    attr: entry.attr, flags: entry.flags, matrixNum: entry.matrixNum, matrix: entry.matrix, data: entry.data,
  };
}
function cloneAt(row: Json): Json { return row.sprites.find((entry: Json) => entry.callback.symbol === "TranslateSpriteLinearFixedPoint"); }
function taskAt(row: Json, callback: string): Json { const task = row.tasks.find((entry: Json) => entry.func.symbol === callback); if (!task) throw new Error(`missing ${callback}`); return task; }
function targetPan(row: Json): number { return row.audio.SE1.tracks[0].panX; }

/** Builds a live input snapshot for a retained age; production never imports this evidence. */
export function nightmareInputsFor(side: NightmareOrientation, rows: readonly Json[], age = 0): NightmareLiveInputs {
  const first = rows[0]!, current = rows[age]!, setup = rows[40]!, cloneStart = rows[43]!;
  const attackerSide = side === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const selected = side === "player-back" ? "BG1" : "BG2";
  const monBgTask = taskAt(setup, "Task_UpdateMonBg"), cloneTask = taskAt(cloneStart, "AnimTask_NightmareClone_Step");
  const shake = taskAt(cloneStart, "AnimTask_ShakeMon_Step"), firstFade = taskAt(rows[1]!, "Task_FadeToBg"), restoreFade = taskAt(rows[127]!, "Task_FadeToBg");
  const clone = cloneAt(cloneStart)!;
  const sourceTarget = cloneStart.battlerSprites.target;
  return {
    attackerSide, targetSide, attackerSpecies: "HAUNTER",
    targetSpecies: side === "player-back" ? "SHUCKLE" : "KANGASKHAN",
    attackerPictureOrigin: { x: cloneStart.battlerSprites.attacker.x, y: cloneStart.battlerSprites.attacker.y },
    targetPictureOrigin: { x: clone.x, y: clone.y },
    attackerSprite: compactSprite(current.battlerSprites.attacker), targetSprite: compactSprite(current.battlerSprites.target),
    clone: {
      slot: clone.slot, template: "gMultiuseSpriteTemplate", attr: sourceTarget.attr, flags: clone.flags,
      matrixNum: clone.matrixNum, matrix: clone.matrix, subpriority: clone.subpriority,
      dataTail: [clone.data[5], clone.data[6], clone.data[7]], sourceCreationOrder: 0,
    },
    tasks: { fadeToGhost: firstFade.slot, clone: cloneTask.slot, shake: shake.slot, fadeRestore: restoreFade.slot },
    monBg: {
      updateTaskSlot: monBgTask.slot, clearTaskSlot: taskAt(rows[127]!, "Task_ClearMonBg").slot, selected,
      backgroundOrigin: { x: monBgTask.data[3], y: monBgTask.data[4] }, inBg2: monBgTask.data[5], battler: monBgTask.data[6],
      setupControl: selected === "BG1" ? rows[41]!.registers.bg1cnt : rows[41]!.registers.bg2cnt,
    },
    painterOrder: current.spriteOrder,
    resources: current.resourceAllocators, matrixBitmap: current.resourceAllocators.matrixBitmap, matrices: current.softwareMatrices,
    palettes: { unfaded: current.unfadedPalette, faded: current.fadedPalette, hardware: current.hardwarePalette },
    backgrounds: { battle: rows[0]!.bgVram, ghost: rows[20]!.bgVram, monBg: rows[41]!.bgVram, clear: rows[129]!.bgVram, clearedGhost: rows[131]!.bgVram, restoredBattle: rows[148]!.bgVram },
    registers: current.registers, audio: { targetPan: targetPan(cloneStart) }, animationRngSeed: first.animationRng,
    gameplayRng: first.rawBattleState.gameplayRng, gameplayState: first.immutableState,
  };
}

export function nightmareConfigFor(side: NightmareOrientation, rows: readonly Json[], age = 0): SceneOnNightmarePresentationState["config"] {
  const input = nightmareInputsFor(side, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies,
    attackerPictureOrigin, targetPictureOrigin, ...animationInputs } = input;
  const first = rows[0]!;
  return {
    move: "NIGHTMARE",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: { x: attackerPictureOrigin.x, y: attackerSide === "opponent" ? 40 : attackerPictureOrigin.y } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: targetPictureOrigin } },
    fieldProfile: {
      playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: side === "opponent-front" ? "female" : "male",
      opponentGender: "female",
      playerStatus: side === "opponent-front" ? "sleep" : "none",
      opponentStatus: side === "player-back" ? "sleep" : "none",
    },
    animationInputs,
  };
}

function reducedTasks(state: ReturnType<typeof nightmareAtAge>): Json[] {
  return state.tasks.map((task) => ({ slot: task.slot, callback: task.callback, data: task.data }));
}
function retainedTasks(row: Json): Json[] {
  return row.tasks.map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }));
}
function reducedClone(state: ReturnType<typeof nightmareAtAge>): Json | null {
  const sprite = state.sprites[0];
  return sprite ? { slot: sprite.slot, template: sprite.template, callback: sprite.callback, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, subpriority: sprite.subpriority, flags: sprite.flags, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data } : null;
}
function retainedClone(row: Json): Json | null {
  const sprite = cloneAt(row);
  return sprite ? { slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol, attr: sprite.attr, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, subpriority: sprite.subpriority, flags: sprite.flags, matrixNum: sprite.matrixNum, matrix: sprite.matrix, data: sprite.data } : null;
}
function compareImmutable(side: NightmareOrientation, age: number, row: Json, first: Json): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${side}/${age}: opaque gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${side}/${age}: immutable semantic gameplay`);
}
function expectedAudio(age: number, row: Json): Json[] {
  return age === 43 ? [{ channel: "SE1", sound: "SE_M_NIGHTMARE", sourcePan: "SOUND_PAN_TARGET", pan: targetPan(row) }] : [];
}
function compareRow(side: NightmareOrientation, rows: readonly Json[], age: number, row: Json, previous: Json | undefined, first: Json): ReturnType<typeof nightmareAtAge> {
  const input = nightmareInputsFor(side, rows, age);
  const state = nightmareAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${side}/${age}: complete root source cursor/wait`);
  invariant(same(state.animArgs, row.animArgs), `${side}/${age}: complete source animation args`);
  invariant(same(reducedTasks(state), retainedTasks(row)), `${side}/${age}: complete task slot/callback/16-word state`);
  invariant(same(reducedClone(state), retainedClone(row)), `${side}/${age}: clone slot/OAM/geometry/data/matrix state`);
  invariant(same(state.battlers.attacker.sprite, compactSprite(row.battlerSprites.attacker)) && same(state.battlers.target.sprite, compactSprite(row.battlerSprites.target)),
    `${side}/${age}: caller-owned battler state retained exactly`);
  invariant(state.battlers.target.shake.x === row.battlerSprites.target.x2 && state.battlers.target.shake.y === row.battlerSprites.target.y2,
    `${side}/${age}: ShakeMon source offset`);
  invariant(same(state.resources.allocator, row.resourceAllocators) && state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap && same(state.resources.matrices, row.softwareMatrices),
    `${side}/${age}: live resource/matrix allocation retained`);
  invariant(same(state.painterOrder, row.spriteOrder), `${side}/${age}: persistent painter order retained`);
  invariant(same(state.palette.unfaded, row.unfadedPalette) && same(state.palette.faded, row.fadedPalette) && same(state.palette.hardware, row.hardwarePalette),
    `${side}/${age}: complete live palettes retained`);
  invariant(same(state.background.vram, row.bgVram), `${side}/${age}: source BG VRAM command phase`);
  const expectedBg = side === "player-back"
    ? { x: row.battleBg.gBattle_BG1_X, y: row.battleBg.gBattle_BG1_Y }
    : { x: row.battleBg.gBattle_BG2_X, y: row.battleBg.gBattle_BG2_Y };
  invariant(state.background.sourceX === expectedBg.x && state.background.sourceY === expectedBg.y, `${side}/${age}: selected MonBg source scroll`);
  const expectedHardware = side === "player-back"
    ? { x: row.registers.bg1hofs, y: row.registers.bg1vofs }
    : { x: row.registers.bg2hofs, y: row.registers.bg2vofs };
  invariant(state.background.hardwareX === expectedHardware.x && state.background.hardwareY === expectedHardware.y
    && state.background.targetOnBg === (row.battlerSprites.target.flags === 5), `${side}/${age}: target BG ownership and scanout`);
  invariant(state.palette.fadeLevel === row.registers.bldy, `${side}/${age}: FadeToBg coefficient`);
  invariant(same(state.registers, row.registers), `${side}/${age}: complete register state with source-owned blend/scroll writes`);
  invariant(same(state.audio, expectedAudio(age, row)), `${side}/${age}: Nightmare sound/pan source command`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng),
    `${side}/${age}: presentation/gameplay RNG boundary`);
  invariant(same(state.gameplay, row.immutableState), `${side}/${age}: opaque gameplay state retained`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === (retainedClone(row) ? 1 : 0),
    `${side}/${age}: exact visual cleanup ownership`);
  compareImmutable(side, age, row, first);
  if (age > 0) {
    invariant(same(row.hardwareOam, previous!.softwareOam) && same(row.hardwareMatrices, previous!.softwareMatrices)
      && state.displayTransfer.oam === "preceding-software" && state.displayTransfer.matrices === "preceding-software",
    `${side}/${age}: whole OAM/matrix RAM+1 latch`);
    const paletteLatched = age === 40 ? same(row.hardwarePalette, row.fadedPalette) : same(row.hardwarePalette, previous!.fadedPalette);
    invariant(paletteLatched && state.displayTransfer.palette === (age === 40 ? "same-row-monbg-setup" : "preceding-faded"), `${side}/${age}: whole palette transfer`);
  } else {
    invariant(state.displayTransfer.oam === "initial" && state.displayTransfer.matrices === "initial" && state.displayTransfer.palette === "initial", `${side}/0: initial hardware transfer`);
  }
  return state;
}
function replay(side: NightmareOrientation): Json {
  const rows = rowsFor(side);
  invariant(rows.length === 169, `${side}: complete retained 169-row source window`);
  const passDigests: string[] = [];
  let reducerRows = 0, seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const digest = createHash("sha256");
    for (let age = 0; age < rows.length; age += 1) {
      const row = rows[age]!, input = nightmareInputsFor(side, rows, age);
      const reduced = compareRow(side, rows, age, row, rows[age - 1], rows[0]!);
      const seam = sceneOnNightmareView({ age, config: nightmareConfigFor(side, rows, age) });
      const { attacker: _attacker, target: _target, ...plainSeam } = seam;
      invariant(same(plainSeam, reduced), `${side}/${age}: narrow typed Scene-ON seam`);
      digest.update(JSON.stringify({ reduced, plainSeam, input: { attackerSide: input.attackerSide, targetSide: input.targetSide, attackerSpecies: input.attackerSpecies, targetSpecies: input.targetSpecies } }));
      reducerRows += 1; seamRows += 1;
    }
    passDigests.push(digest.digest("hex"));
  }
  invariant(passDigests[0] === passDigests[1], `${side}: two passes must be byte-identical`);
  const cleanup = nightmareAtAge(168, nightmareInputsFor(side, rows, 168));
  invariant(!cleanup.active && cleanup.cleanup.firstInactive && cleanup.tasks.length === 0 && cleanup.sprites.length === 0 && cleanup.registers.bldcnt === 0 && cleanup.registers.bldalpha === 0 && cleanup.registers.bldy === 0,
    `${side}: exact first inactive cleanup`);
  return { retainedRows: 169, reducerRows, seamRows, cleanup: 168, digest: passDigests[0], framebufferCompared: false, coverageCredit: false };
}

/** Replays all 338 retained bilateral rows twice through reducer and typed seam. */
export function verifyNightmareReducer(): Json {
  const player = replay("player-back"), opponent = replay("opponent-front");
  return {
    "player-back": player,
    "opponent-front": opponent,
    bilateral: {
      retainedRows: 338, passes: 2, reducerRows: 676, seamRows: 676,
      digest: sha(`${player.digest}:${opponent.digest}`), framebufferCompared: false, coverageCredit: false,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyNightmareReducer(), null, 2));
}
