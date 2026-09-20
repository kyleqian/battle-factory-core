/** Strict retained-state replay for MOVE_PSYWAVE's reducer and typed seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  PSYWAVE_BLUE_RING_TAG,
  PSYWAVE_FIRST_INACTIVE_AGE,
  psywaveAtAge,
  type PsywaveLiveInputs,
  type PsywaveState,
} from "../../src/animation/psywave.ts";
import {
  sceneOnPsywaveView,
  type SceneOnPsywavePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type PsywaveWindow = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_PSYWAVE reducer drift: ${message}`);
}

const OWNED_TASKS = new Set([
  "Task_FadeToBg",
  "SetPsychicBackground_Step",
  "AnimTask_RunSinAnimTimer",
  "SoundTask_LoopSEAdjustPanning_Step",
  "AnimTask_BlendColorCycleLoop",
]);
const RING_CREATION_AGES = Array.from({ length: 12 }, (_, order) => 42 + order * 6);

function rowsFile(window: PsywaveWindow): string {
  return window === "player-back"
    ? "tools/compare/evidence/psywave-player-dense-state.json.gz"
    : "tools/compare/evidence/psywave-opponent-dense-state.json.gz";
}

export function psywaveRowsFor(window: PsywaveWindow): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, rowsFile(window)))).toString("utf8")) as Json).frames;
}

function taskAt(row: Json, callback: string): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === callback);
  invariant(found, `missing ${callback}`);
  return found;
}

function taskData(row: Json, callback: string): readonly number[] {
  return row.tasks.find((entry: Json) => entry.func?.symbol === callback)?.data ?? [];
}

function sideFor(window: PsywaveWindow): "player" | "opponent" {
  return window === "player-back" ? "player" : "opponent";
}

function speciesFor(window: PsywaveWindow): Readonly<{ attacker: string; target: string }> {
  return window === "player-back"
    ? { attacker: "SPOINK", target: "ONIX" }
    : { attacker: "CHIMECHO", target: "ONIX" };
}

function artFor(sprite: Json, displaySpecies: string): PsywaveLiveInputs["attackerArt"] {
  return {
    displaySpecies,
    slot: sprite.slot,
    attr: sprite.attr,
    subpriority: sprite.subpriority,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
  };
}

function displaySpeciesFor(window: PsywaveWindow): Readonly<{ attacker: string; target: string }> {
  return window === "player-back"
    ? { attacker: "LUVDISC", target: "ONIX" }
    : { attacker: "SWABLU", target: "ONIX" };
}

function pictureCenter(sprite: Json, side: "player" | "opponent"): Readonly<{ x: number; y: number }> {
  return { x: sprite.x, y: sprite.y + (side === "player" ? 8 : 0) };
}

function ringAt(row: Json, predicate: (entry: Json) => boolean = () => true): Json {
  const found = row.sprites.find((entry: Json) => entry.template?.symbol === "gPsywaveRingSpriteTemplate" && predicate(entry));
  invariant(found, "missing source-created BLUE_RING");
  return found;
}

function allocationsFor(rows: readonly Json[]): PsywaveLiveInputs["ringAllocations"] {
  return RING_CREATION_AGES.map((age, sourceCreationOrder) => {
    // The initializer plus same-row callback leaves a just-created ring at
    // data[0] = 28; older six-age-cadence rings have already advanced.
    const ring = ringAt(rows[age]!, (entry) => entry.data[0] === 28);
    return { slot: ring.slot, matrixNum: ring.matrixNum, sourceCreationOrder };
  });
}

/** Builds one live Scene-ON snapshot; retained rows never enter production. */
export function psywaveInputsFor(
  window: PsywaveWindow,
  rows: readonly Json[] = psywaveRowsFor(window),
  age = 0,
): PsywaveLiveInputs {
  const first = rows[0]!;
  const current = rows[age]!;
  const attackerSide = sideFor(window);
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const fadeToPsychic = taskAt(rows[4]!, "Task_FadeToBg");
  const psychicBackground = taskAt(rows[23]!, "SetPsychicBackground_Step");
  const sinTimer = taskAt(rows[42]!, "AnimTask_RunSinAnimTimer");
  const loopSound = taskAt(rows[42]!, "SoundTask_LoopSEAdjustPanning_Step");
  const paletteCycle = taskAt(rows[66]!, "AnimTask_BlendColorCycleLoop");
  const restoreBattle = taskAt(rows[165]!, "Task_FadeToBg");
  const resourceRow = rows[1]!;
  const tileSlot = resourceRow.tileTags.indexOf(PSYWAVE_BLUE_RING_TAG);
  const paletteSlot = resourceRow.paletteTags.indexOf(PSYWAVE_BLUE_RING_TAG);
  invariant(tileSlot >= 0 && paletteSlot >= 0, `${window}: BLUE_RING resource allocation`);
  return {
    attackerSide,
    targetSide,
    attackerSpecies: speciesFor(window).attacker,
    targetSpecies: speciesFor(window).target,
    attackerPictureCenter: pictureCenter(current.battlerSprites.attacker, attackerSide),
    targetPictureCenter: pictureCenter(current.battlerSprites.target, targetSide),
    attackerAnimationCenter: { x: current.battlerSprites.attacker.x, y: current.battlerSprites.attacker.y },
    targetAnimationCenter: { x: current.battlerSprites.target.x, y: current.battlerSprites.target.y },
    attackerArt: artFor(current.battlerSprites.attacker, displaySpeciesFor(window).attacker),
    targetArt: artFor(current.battlerSprites.target, displaySpeciesFor(window).target),
    taskSlots: {
      fadeToPsychic: fadeToPsychic.slot,
      psychicBackground: psychicBackground.slot,
      sinTimer: sinTimer.slot,
      loopSound: loopSound.slot,
      paletteCycle: paletteCycle.slot,
      restoreBattle: restoreBattle.slot,
    },
    ringAllocations: allocationsFor(rows),
    ringOam: current.sprites
      .filter((entry: Json) => entry.template?.symbol === "gPsywaveRingSpriteTemplate")
      .map((entry: Json) => ({ slot: entry.slot, attr: entry.attr, subpriority: entry.subpriority })),
    spriteOrder: current.spriteOrder,
    buffers: {
      softwareOam: current.softwareOam,
      hardwareOam: current.hardwareOam,
      softwareMatrices: current.softwareMatrices,
      hardwareMatrices: current.hardwareMatrices,
    },
    palette: {
      unfaded: current.unfadedPalette,
      faded: current.fadedPalette,
      hardware: current.hardwarePalette,
    },
    targetPaletteBank: 16 + (current.battlerSprites.target.attr[2] >>> 12),
    registers: current.registers,
    background: {
      currentVram: current.bgVram,
      battleVram: first.bgVram,
      psychicVram: rows[23]!.bgVram,
    },
    resources: {
      tag: PSYWAVE_BLUE_RING_TAG,
      tileSlot,
      paletteSlot,
      paletteBank: 16 + paletteSlot,
      tileRange: resourceRow.resourceAllocators.tileRanges[tileSlot],
      allocator: current.resourceAllocators,
    },
    sharedTaskData: {
      fadeToPsychic: taskData(current, "Task_FadeToBg"),
      paletteCycle: taskData(current, "AnimTask_BlendColorCycleLoop"),
      restoreBattle: taskData(current, "Task_FadeToBg"),
    },
    audio: {
      current: current.audio,
      attackerPan: loopSound.data[1],
      targetPan: loopSound.data[2],
    },
    liveCounts: {
      visualTasks: current.visualTaskCount,
      soundTasks: current.soundTaskCount,
      matrixBitmap: current.resourceAllocators.matrixBitmap,
    },
    animationRng: current.animationRng,
    gameplayRng: current.rawBattleState.gameplayRng,
    gameplayState: current.immutableState,
  };
}

export function psywaveConfigFor(
  window: PsywaveWindow,
  rows: readonly Json[] = psywaveRowsFor(window),
  age = 0,
): SceneOnPsywavePresentationState["config"] {
  const input = psywaveInputsFor(window, rows, age);
  const {
    attackerSide,
    targetSide,
    attackerSpecies,
    targetSpecies,
    attackerPictureCenter,
    targetPictureCenter,
    attackerAnimationCenter,
    targetAnimationCenter,
    ...animationInputs
  } = input;
  const first = rows[0]!;
  return {
    move: "PSYWAVE",
    attacker: {
      species: attackerSpecies as never,
      geometry: {
        side: attackerSide,
        spriteCorner: { x: attackerAnimationCenter.x - 32, y: attackerAnimationCenter.y - 32 },
        animationCenter: attackerAnimationCenter,
        battlePositionCenter: attackerPictureCenter,
      },
    },
    target: {
      species: targetSpecies as never,
      geometry: {
        side: targetSide,
        spriteCorner: { x: targetAnimationCenter.x - 32, y: targetAnimationCenter.y - 32 },
        animationCenter: targetAnimationCenter,
        battlePositionCenter: targetPictureCenter,
      },
    },
    fieldProfile: {
      playerHp: first.parties.player[0].hp,
      playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp,
      opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    animationInputs,
  };
}

function retainedTasks(row: Json): Json[] {
  return row.tasks
    .filter((entry: Json) => OWNED_TASKS.has(entry.func?.symbol))
    .map((entry: Json) => ({ slot: entry.slot, callback: entry.func.symbol, data: entry.data }))
    .sort((left: Json, right: Json) => left.slot - right.slot || left.callback.localeCompare(right.callback));
}

function reducedTasks(state: PsywaveState): Json[] {
  return state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data }));
}

function retainedRings(row: Json): Json[] {
  return row.sprites.filter((entry: Json) => entry.template?.symbol === "gPsywaveRingSpriteTemplate")
    .map((entry: Json) => ({
      slot: entry.slot,
      template: entry.template.symbol,
      callback: entry.callback.symbol,
      matrixNum: entry.matrixNum,
      matrix: entry.matrix,
      attr: entry.attr,
      subpriority: entry.subpriority,
      painterIndex: row.spriteOrder.indexOf(entry.slot),
      x: entry.x,
      y: entry.y,
      x2: entry.x2,
      y2: entry.y2,
      data: entry.data,
    })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function reducedRings(state: PsywaveState): Json[] {
  return state.rings.map((entry) => ({
    slot: entry.slot,
    template: entry.template,
    callback: entry.callback,
    matrixNum: entry.matrixNum,
    matrix: entry.matrix,
    attr: entry.attr,
    subpriority: entry.subpriority,
    painterIndex: entry.painterIndex,
    x: entry.x,
    y: entry.y,
    x2: entry.x2,
    y2: entry.y2,
    data: entry.data,
  })).sort((left: Json, right: Json) => left.slot - right.slot);
}

function assertOpaqueGameplay(window: PsywaveWindow, age: number, row: Json, first: Json): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${window}/${age}: opaque gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${window}/${age}: immutable gameplay state`);
}

function expectedBackgroundPhase(age: number): PsywaveState["background"]["phase"] {
  if (age < 4 || age >= 184) return "battle";
  if (age < 23) return "fading-to-psychic";
  if (age < 165) return "psychic";
  return "restoring-battle";
}

function compareRow(window: PsywaveWindow, rows: readonly Json[], age: number): PsywaveState {
  const row = rows[age]!;
  const input = psywaveInputsFor(window, rows, age);
  const state = psywaveAtAge(age, input);
  invariant(state.active === row.animScriptActive
    && state.source.pointer === row.scriptPtr
    && state.source.wait === row.scriptWait, `${window}/${age}: root/subroutine cursor`);
  invariant(same(state.animArgs, row.animArgs), `${window}/${age}: complete source anim args`);
  invariant(same(reducedTasks(state), retainedTasks(row)), `${window}/${age}: complete owned task slots/callbacks/data`);
  invariant(same(reducedRings(state), retainedRings(row)), `${window}/${age}: twelve BLUE_RING trajectory/OAM/matrix/data state`);
  invariant(same(state.battlers.attacker.animationCenter, { x: row.battlerSprites.attacker.x, y: row.battlerSprites.attacker.y })
    && same(state.battlers.target.animationCenter, { x: row.battlerSprites.target.x, y: row.battlerSprites.target.y })
    && same(state.battlers.attacker.art, artFor(row.battlerSprites.attacker, displaySpeciesFor(window).attacker))
    && same(state.battlers.target.art, artFor(row.battlerSprites.target, displaySpeciesFor(window).target)), `${window}/${age}: live art identity and geometry`);
  invariant(same(state.painterOrder, row.spriteOrder), `${window}/${age}: live source painter order`);
  invariant(same(state.buffers.softwareOam, row.softwareOam)
    && same(state.buffers.hardwareOam, row.hardwareOam)
    && same(state.buffers.softwareMatrices, row.softwareMatrices)
    && same(state.buffers.hardwareMatrices, row.hardwareMatrices), `${window}/${age}: whole OAM/matrix buffers`);
  invariant(same(state.palette.unfaded, row.unfadedPalette)
    && same(state.palette.faded, row.fadedPalette)
    && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: complete live palette buffers`);
  invariant(state.paletteBanks.target === 16 + (row.battlerSprites.target.attr[2] >>> 12)
    && same(state.registers, row.registers)
    && same(state.background.vram, row.bgVram)
    && state.background.phase === expectedBackgroundPhase(age), `${window}/${age}: palette bank/register/Psychic BG state`);
  const loaded = row.tileTags.includes(PSYWAVE_BLUE_RING_TAG) && row.paletteTags.includes(PSYWAVE_BLUE_RING_TAG);
  invariant(state.resources.loaded === loaded
    && state.resources.tileSlot === (loaded ? input.resources.tileSlot : null)
    && state.resources.paletteSlot === (loaded ? input.resources.paletteSlot : null)
    && state.resources.paletteBank === (loaded ? input.resources.paletteBank : null)
    && state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap
    && same(state.resources.allocator, row.resourceAllocators), `${window}/${age}: BLUE_RING allocation/resource lifecycle`);
  invariant(same(state.audio.live, row.audio), `${window}/${age}: live audio state`);
  const expectedAudio = [
    ...(age === 4 ? [{ kind: "play", channel: "SE1", sound: "SE_M_PSYBEAM", pan: input.audio.attackerPan }] : []),
    ...(age === 42 ? [{ kind: "loop", channel: "SE1", sound: "SE_M_TELEPORT", sourcePan: input.audio.attackerPan, targetPan: input.audio.targetPan, panIncrement: input.audio.attackerPan < input.audio.targetPan ? 2 : -2, repetitions: 9, panDelay: 0, soundDelay: 10 }] : []),
  ];
  invariant(same(state.audio.events, expectedAudio), `${window}/${age}: source audio commands/panning`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${window}/${age}: presentation/gameplay RNG boundary`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount
    && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedRings === retainedRings(row).length
    && state.cleanup.firstInactive === (age === PSYWAVE_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age >= PSYWAVE_FIRST_INACTIVE_AGE), `${window}/${age}: inactive cleanup ownership`);
  assertOpaqueGameplay(window, age, row, rows[0]!);

  if (age === 0) {
    invariant(state.displayTransfer.oam === "initial"
      && state.displayTransfer.matrices === "initial"
      && state.displayTransfer.palette === "initial", `${window}/0: initial transfer`);
  } else {
    const previous = rows[age - 1]!;
    invariant(same(row.hardwareOam, previous.softwareOam)
      && same(row.hardwareMatrices, previous.softwareMatrices)
      && same(row.hardwarePalette, previous.fadedPalette)
      && state.displayTransfer.oam === "preceding-software"
      && state.displayTransfer.matrices === "preceding-software"
      && state.displayTransfer.palette === "preceding-faded"
      && state.displayTransfer.registers === "current-source", `${window}/${age}: predecessor latches/current registers`);
  }
  return state;
}

function replay(window: PsywaveWindow) {
  const rows = psywaveRowsFor(window);
  invariant(rows.length === 205 && !rows.at(-1)!.animScriptActive, `${window}: complete 205-row cleanup`);
  const reducerDigests: string[] = [];
  const seamDigests: string[] = [];
  let reducerRows = 0;
  let seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const reducerHasher = createHash("sha256");
    const seamHasher = createHash("sha256");
    for (const [age] of rows.entries()) {
      const state = compareRow(window, rows, age);
      const config = psywaveConfigFor(window, rows, age);
      const seam = sceneOnPsywaveView({ age, config } as SceneOnPsywavePresentationState);
      const { attacker, target, ...plainSeam } = seam;
      invariant(same(plainSeam, state), `${window}/${age}: narrow typed Scene-ON seam`);
      invariant(same(attacker, config.attacker) && same(target, config.target), `${window}/${age}: live seam battlers`);
      reducerHasher.update(JSON.stringify(state));
      seamHasher.update(JSON.stringify(plainSeam));
      reducerRows += 1;
      seamRows += 1;
    }
    reducerDigests.push(reducerHasher.digest("hex"));
    seamDigests.push(seamHasher.digest("hex"));
  }
  invariant(reducerDigests[0] === reducerDigests[1] && seamDigests[0] === seamDigests[1], `${window}: twice-run reducer/seam determinism`);
  const cleanup = psywaveAtAge(PSYWAVE_FIRST_INACTIVE_AGE, psywaveInputsFor(window, rows, PSYWAVE_FIRST_INACTIVE_AGE));
  invariant(!cleanup.active && cleanup.tasks.length === 0 && cleanup.rings.length === 0 && cleanup.cleanup.resourcesReleased,
    `${window}: exact inactive cleanup`);
  return {
    retainedRows: rows.length,
    reducerRows,
    seamRows,
    reducerSha256: reducerDigests[0],
    seamSha256: seamDigests[0],
    framebufferCompared: false,
    coverageCredit: false,
  } as const;
}

/** Replays all 410 retained bilateral rows twice through reducer and typed seam. */
export function verifyPsywaveReducer() {
  const player = replay("player-back");
  const opponent = replay("opponent-front");
  return {
    "player-back": player,
    "opponent-front": opponent,
    bilateral: {
      retainedRows: player.retainedRows + opponent.retainedRows,
      passes: 2,
      reducerRows: player.reducerRows + opponent.reducerRows,
      seamRows: player.seamRows + opponent.seamRows,
      reducerSha256: digest([player.reducerSha256, opponent.reducerSha256]),
      seamSha256: digest([player.seamSha256, opponent.seamSha256]),
      framebufferCompared: false,
      coverageCredit: false,
    },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyPsywaveReducer(), null, 2));
}
