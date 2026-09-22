/** Dense bilateral reducer/seam verifier for MOVE_EXTRASENSORY. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  extrasensoryAtAge,
  type ExtrasensoryLiveInputs,
  type ExtrasensoryState,
} from "../../src/animation/extrasensory.ts";
import {
  sceneOnExtrasensoryView,
  type SceneOnExtrasensoryPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type ExtrasensoryWindow = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_EXTRASENSORY reducer drift: ${message}`);
}

export function extrasensoryRowsFor(window: ExtrasensoryWindow): Json[] {
  const stem = window === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/extrasensory-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

const NOVEL = new Set(["AnimTask_BlendMonInAndOut_Step",
  "AnimTask_ExtrasensoryDistortion_Step", "AnimTask_TransparentCloneGrowAndShrink_Step"]);

function taskAt(rows: readonly Json[], age: number, callback: string): Json | undefined {
  return rows[age]!.tasks.find((entry: Json) => entry.func?.symbol === callback);
}

function art(sprite: Json, displaySpecies: string) {
  return { displaySpecies, slot: sprite.slot, attr: sprite.attr,
    subpriority: sprite.subpriority };
}

function liveSpecies(window: ExtrasensoryWindow) {
  return window === "player-back"
    ? { attacker: "NUZLEAF", target: "SHUCKLE", attackerDisplay: "NUZLEAF", targetDisplay: "SHUCKLE" }
    : { attacker: "NUZLEAF", target: "SHUCKLE", attackerDisplay: "NUZLEAF", targetDisplay: "SHUCKLE" };
}

export function extrasensoryInputsFor(window: ExtrasensoryWindow,
  rows: readonly Json[] = extrasensoryRowsFor(window), age = 0): ExtrasensoryLiveInputs {
  const row = rows[age]!;
  const attackerSide = window === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const species = liveSpecies(window);
  const slots = {
    fadeToPsychic: taskAt(rows, 1, "Task_FadeToBg")!.slot,
    psychicBackground: taskAt(rows, 20, "SetPsychicBackground_Step")!.slot,
    blend: taskAt(rows, 42, "AnimTask_BlendMonInAndOut_Step")!.slot,
    distortion: taskAt(rows, 42, "AnimTask_ExtrasensoryDistortion_Step")!.slot,
    clone: taskAt(rows, 94, "AnimTask_TransparentCloneGrowAndShrink_Step")!.slot,
    updateMonBg: taskAt(rows, 39, "Task_UpdateMonBg")!.slot,
    clearMonBg: taskAt(rows, 120, "Task_ClearMonBg")!.slot,
    restoreBattle: taskAt(rows, 120, "Task_FadeToBg")!.slot,
  };
  const sharedTaskData = Object.fromEntries(row.tasks
    .filter((entry: Json) => !NOVEL.has(entry.func?.symbol))
    .map((entry: Json) => [entry.func.symbol, entry.data]));
  const cloneSource = rows[94]!.sprites.find((entry: Json) => entry.slot === 3)!;
  const currentClone = row.sprites.find((entry: Json) => entry.slot === cloneSource.slot);
  const scanline = row.scanline;
  const first = rows[0]!;
  return {
    attackerSide, targetSide, attackerSpecies: species.attacker, targetSpecies: species.target,
    attackerCenter: { x: row.battlerSprites.attacker.x, y: row.battlerSprites.attacker.y },
    targetCenter: { x: row.battlerSprites.target.x, y: row.battlerSprites.target.y },
    attackerArt: art(row.battlerSprites.attacker, species.attackerDisplay),
    targetArt: art(row.battlerSprites.target, species.targetDisplay),
    taskSlots: slots, sharedTaskData,
    clone: { slot: cloneSource.slot, matrixNum: cloneSource.matrixNum,
      attr: currentClone?.attr ?? cloneSource.attr, subpriority: currentClone?.subpriority ?? cloneSource.subpriority,
      x: currentClone?.x ?? cloneSource.x, y: currentClone?.y ?? cloneSource.y,
      x2: currentClone?.x2 ?? 0, y2: currentClone?.y2 ?? 0 },
    spriteOrder: row.spriteOrder,
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette },
    registers: row.registers,
    background: { currentVram: row.bgVram, battleVram: first.bgVram,
      psychicVram: rows[20]!.bgVram,
      monbgPaletteBank: targetSide === "opponent" ? 8 : 9 },
    scanline: { state: scanline.state, srcBuffer: scanline.srcBuffer,
      dmaDest: scanline.dmaDest, buffers: row.scanlineBuffers },
    allocator: row.resourceAllocators, audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: row.resourceAllocators.matrixBitmap },
    animationRng: row.animationRng, gameplayRng: row.rawBattleState.gameplayRng,
    gameplayState: row.immutableState,
  };
}

export function extrasensoryConfigFor(window: ExtrasensoryWindow,
  rows: readonly Json[] = extrasensoryRowsFor(window), age = 0): SceneOnExtrasensoryPresentationState["config"] {
  const input = extrasensoryInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter,
    targetCenter, ...animationInputs } = input;
  const row = rows[age]!;
  const player = row.parties.player[0], opponent = row.parties.opponent[0];
  return {
    move: "EXTRASENSORY",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide,
      spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
    target: { species: targetSpecies as never, geometry: { side: targetSide,
      spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
      animationCenter: targetCenter, battlePositionCenter: targetCenter } },
    fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender, opponentGender: opponent.gender },
    animationInputs,
  };
}

function reducedTasks(state: ExtrasensoryState) {
  return state.tasks.map((task) => ({ slot: task.slot, callback: task.callback, data: task.data }))
    .sort((a, b) => a.slot - b.slot || a.callback.localeCompare(b.callback));
}
function retainedTasks(row: Json) {
  return row.tasks.map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }))
    .sort((a: Json, b: Json) => a.slot - b.slot || a.callback.localeCompare(b.callback));
}

function compareRow(window: ExtrasensoryWindow, rows: readonly Json[], age: number): ExtrasensoryState {
  const row = rows[age]!, input = extrasensoryInputsFor(window, rows, age);
  const state = extrasensoryAtAge(age, input);
  invariant(state.source.pointer === row.scriptPtr && state.source.wait === row.scriptWait
    && state.active === row.animScriptActive, `${window}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${window}/${age}: source arguments`);
  invariant(same(reducedTasks(state), retainedTasks(row)), `${window}/${age}: complete task state`);
  invariant(same(state.buffers.hardwareOam, row.hardwareOam)
    && same(state.buffers.hardwareMatrices, row.hardwareMatrices)
    && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: hardware buffers`);
  invariant(same(state.spriteOrder, row.spriteOrder) && same(state.registers, row.registers)
    && same(state.background.currentVram, row.bgVram)
    && same(state.scanline.buffers, row.scanlineBuffers), `${window}/${age}: order/BG/register/scanline state`);
  if (state.distortion.active) {
    const lo = state.distortion.lower, hi = state.distortion.upper + 1;
    invariant(same(state.distortion.sourceScanlineHofs.slice(lo, hi), row.scanlineBuffers[0].slice(lo, hi))
      && same(state.distortion.sourceScanlineHofs.slice(lo, hi), row.scanlineBuffers[1].slice(lo, hi)),
    `${window}/${age}: source-derived distortion banks`);
  }
  const clone = row.sprites.find((entry: Json) => entry.slot === 3
    && entry.template?.symbol === "gMultiuseSpriteTemplate");
  invariant((state.clone !== null) === Boolean(clone), `${window}/${age}: clone lifecycle`);
  invariant(same(state.audio.live, row.audio), `${window}/${age}: audio state`);
  invariant(same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${window}/${age}: opaque gameplay boundary`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount
    && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.matrixBitmap === row.resourceAllocators.matrixBitmap,
  `${window}/${age}: allocation and cleanup`);
  return state;
}

function replay(window: ExtrasensoryWindow) {
  const rows = extrasensoryRowsFor(window);
  invariant(rows.length === 161 && !rows[160]!.animScriptActive, `${window}: complete corpus`);
  const component: string[] = [], seam: string[] = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const ch = createHash("sha256"), sh = createHash("sha256");
    for (const [age] of rows.entries()) {
      const state = compareRow(window, rows, age);
      const config = extrasensoryConfigFor(window, rows, age);
      const view = sceneOnExtrasensoryView({ age, config });
      const { attacker, target, ...plain } = view;
      invariant(same(plain, state) && same(attacker, config.attacker)
        && same(target, config.target), `${window}/${age}: typed seam`);
      ch.update(JSON.stringify(state)); sh.update(JSON.stringify(plain));
    }
    component.push(ch.digest("hex")); seam.push(sh.digest("hex"));
  }
  invariant(component[0] === component[1] && seam[0] === seam[1], `${window}: deterministic replay`);
  return { rows: rows.length, passes: 2, componentRows: rows.length * 2,
    seamRows: rows.length * 2, componentSha256: component[0], seamSha256: seam[0] };
}

export function verifyExtrasensoryReducer() {
  const player = replay("player-back"), opponent = replay("opponent-front");
  return { "player-back": player, "opponent-front": opponent,
    bilateral: { rows: player.rows + opponent.rows, passes: 2,
      componentRows: player.componentRows + opponent.componentRows,
      seamRows: player.seamRows + opponent.seamRows } };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifyExtrasensoryReducer(), null, 2));
}
