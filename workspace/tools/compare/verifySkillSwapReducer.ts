/** Strict retained-state replay for MOVE_SKILL_SWAP's reducer and typed seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SKILL_SWAP_ORB_TAG,
  skillSwapAtAge,
  type SkillSwapLiveInputs,
  type SkillSwapState,
} from "../../src/animation/skillSwap.ts";
import {
  sceneOnSkillSwapView,
  type SceneOnSkillSwapPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SkillSwapOrientation = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SKILL_SWAP reducer drift: ${message}`);
}

const OWNED_TASKS = new Set([
  "Task_FadeToBg",
  "SetPsychicBackground_Step",
  "AnimTask_SkillSwap_Step",
  "AnimTask_BlendMonInAndOut_Step",
  "Task_LoopAndPlaySE",
]);

function rowsFor(orientation: SkillSwapOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/skill-swap-${side}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function taskAt(row: Json, callback: string): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === callback);
  invariant(found, `missing ${callback}`);
  return found;
}

function distinctTaskAt(row: Json, callback: string, occupiedSlot: number): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === callback && entry.slot !== occupiedSlot);
  invariant(found, `missing distinct ${callback} slot`);
  return found;
}

function taskData(row: Json, callback: string): readonly number[] {
  return row.tasks.find((entry: Json) => entry.func?.symbol === callback)?.data ?? [];
}

function orbAt(row: Json, predicate: (entry: Json) => boolean): Json {
  const found = row.sprites.find((entry: Json) => entry.template?.symbol === "gSkillSwapOrbSpriteTemplate" && predicate(entry));
  invariant(found, "missing source-created Skill Swap orb");
  return found;
}

function battler(entry: Json): SkillSwapLiveInputs["attackerSprite"] {
  return {
    slot: entry.slot,
    x: entry.x,
    y: entry.y,
    x2: entry.x2,
    y2: entry.y2,
    attr: entry.attr,
    subpriority: entry.subpriority,
    matrixNum: entry.matrixNum,
    matrix: entry.matrix,
  };
}

function allocationsFor(rows: readonly Json[]): SkillSwapLiveInputs["orbAllocations"] {
  const starts = [
    ...Array.from({ length: 12 }, (_, index) => 42 + index * 7),
    ...Array.from({ length: 12 }, (_, index) => 60 + index * 7),
  ];
  return starts.map((age, sourceCreationOrder) => {
    const orb = orbAt(rows[age]!, (entry) => entry.data[0] === 16 && entry.x2 === 0 && entry.y2 === 0);
    return { slot: orb.slot, matrixNum: orb.matrixNum, sourceCreationOrder };
  });
}

function boundsFor(rows: readonly Json[]): Pick<SkillSwapLiveInputs, "attackerBounds" | "targetBounds"> {
  const first = taskAt(rows[42]!, "AnimTask_SkillSwap_Step").data;
  const firstSlot = taskAt(rows[42]!, "AnimTask_SkillSwap_Step").slot;
  const second = distinctTaskAt(rows[60]!, "AnimTask_SkillSwap_Step", firstSlot).data;
  return {
    targetBounds: {
      left: first[11] - 8,
      top: first[12] - 8,
      right: second[13] + 8,
      bottom: second[14] + 8,
    },
    attackerBounds: {
      left: first[13] - 8,
      top: first[14] - 8,
      right: second[11] + 8,
      bottom: second[12] + 8,
    },
  };
}

/** Builds one live Scene-ON snapshot; retained rows never enter production. */
export function skillSwapInputsFor(
  orientation: SkillSwapOrientation,
  rows: readonly Json[] = rowsFor(orientation),
  age = 0,
): SkillSwapLiveInputs {
  const first = rows[0]!;
  const current = rows[age]!;
  const targetSkill = taskAt(rows[42]!, "AnimTask_SkillSwap_Step");
  const targetBlend = taskAt(rows[42]!, "AnimTask_BlendMonInAndOut_Step");
  const loop = taskAt(rows[42]!, "Task_LoopAndPlaySE");
  const attackerSkill = distinctTaskAt(rows[60]!, "AnimTask_SkillSwap_Step", targetSkill.slot);
  const attackerBlend = distinctTaskAt(rows[60]!, "AnimTask_BlendMonInAndOut_Step", targetBlend.slot);
  const intoFade = taskAt(rows[4]!, "Task_FadeToBg");
  const psychic = taskAt(rows[23]!, "SetPsychicBackground_Step");
  const restoreFade = taskAt(rows[156]!, "Task_FadeToBg");
  const resourceRow = rows[1]!;
  const tileSlot = resourceRow.tileTags.indexOf(SKILL_SWAP_ORB_TAG);
  const paletteAllocatorSlot = resourceRow.paletteTags.indexOf(SKILL_SWAP_ORB_TAG);
  invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, `${orientation}: live blue-green resource allocation`);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const firstAudio = rows[42]!.audio.SE1;
  return {
    attackerSide,
    targetSide,
    attackerSpecies: attackerSide === "player" ? "GIRAFARIG" : "GIRAFARIG",
    targetSpecies: targetSide === "player" ? "SHUCKLE" : "SHUCKLE",
    ...boundsFor(rows),
    attackerSprite: battler(current.battlerSprites.attacker),
    targetSprite: battler(current.battlerSprites.target),
    taskSlots: {
      fadeToPsychic: intoFade.slot,
      psychicBackground: psychic.slot,
      targetOrbs: targetSkill.slot,
      targetBlend: targetBlend.slot,
      loopReversal: loop.slot,
      attackerOrbs: attackerSkill.slot,
      attackerBlend: attackerBlend.slot,
      restoreFade: restoreFade.slot,
    },
    orbAllocations: allocationsFor(rows),
    orbOam: current.sprites
      .filter((entry: Json) => entry.template?.symbol === "gSkillSwapOrbSpriteTemplate")
      .map((entry: Json) => ({ slot: entry.slot, attr: entry.attr, subpriority: entry.subpriority })),
    spriteOrder: current.spriteOrder,
    softwareOam: current.softwareOam,
    hardwareOam: current.hardwareOam,
    softwareMatrices: current.softwareMatrices,
    hardwareMatrices: current.hardwareMatrices,
    palette: {
      unfaded: current.unfadedPalette,
      faded: current.fadedPalette,
      hardware: current.hardwarePalette,
    },
    registers: current.registers,
    background: {
      currentVram: current.bgVram,
      battleVram: first.bgVram,
      psychicVram: rows[23]!.bgVram,
    },
    resources: {
      tag: SKILL_SWAP_ORB_TAG,
      tileSlot,
      paletteAllocatorSlot,
      paletteBank: 16 + paletteAllocatorSlot,
      tileRange: resourceRow.resourceAllocators.tileRanges[tileSlot],
      allocator: current.resourceAllocators,
    },
    sharedTaskData: {
      fadeToPsychic: taskData(current, "Task_FadeToBg"),
      loopReversal: taskData(current, "Task_LoopAndPlaySE"),
      restoreFade: taskData(current, "Task_FadeToBg"),
    },
    targetBlendPaletteStart: targetBlend.data[0],
    attackerBlendPaletteStart: attackerBlend.data[0],
    audio: { current: current.audio, attackerPan: firstAudio.tracks[0]!.panX },
    liveCounts: { visualTasks: current.visualTaskCount, soundTasks: current.soundTaskCount },
    animationRng: current.animationRng,
    firstInactiveAge: rows.length - 1,
    abilityOutcome: {
      playerAbilityAfterSwap: current.battlers.player.ability,
      opponentAbilityAfterSwap: current.battlers.opponent.ability,
    },
    gameplayRng: current.rawBattleState.gameplayRng,
    gameplayState: current.immutableState,
  };
}

export function skillSwapConfigFor(
  orientation: SkillSwapOrientation,
  rows: readonly Json[] = rowsFor(orientation),
  age = 0,
): SceneOnSkillSwapPresentationState["config"] {
  const input = skillSwapInputsFor(orientation, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, ...animationInputs } = input;
  const first = rows[0]!;
  return {
    move: "SKILL_SWAP",
    attacker: {
      species: attackerSpecies as never,
      geometry: {
        side: attackerSide,
        spriteCorner: { x: input.attackerBounds.left, y: input.attackerBounds.top },
        animationCenter: { x: input.attackerSprite.x, y: input.attackerSprite.y },
        battlePositionCenter: { x: input.attackerSprite.x, y: input.attackerSprite.y },
      },
    },
    target: {
      species: targetSpecies as never,
      geometry: {
        side: targetSide,
        spriteCorner: { x: input.targetBounds.left, y: input.targetBounds.top },
        animationCenter: { x: input.targetSprite.x, y: input.targetSprite.y },
        battlePositionCenter: { x: input.targetSprite.x, y: input.targetSprite.y },
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

function reducedTasks(state: SkillSwapState): Json[] {
  return state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data }));
}

function retainedOrbs(row: Json): Json[] {
  return row.sprites
    .filter((entry: Json) => entry.template?.symbol === "gSkillSwapOrbSpriteTemplate")
    .map((entry: Json) => ({
      slot: entry.slot,
      template: entry.template.symbol,
      callback: entry.callback.symbol,
      matrixNum: entry.matrixNum,
      matrix: entry.matrix,
      attr: entry.attr,
      subpriority: entry.subpriority,
      x: entry.x,
      y: entry.y,
      x2: entry.x2,
      y2: entry.y2,
      data: entry.data,
      painterIndex: row.spriteOrder.indexOf(entry.slot),
    }))
    .sort((left: Json, right: Json) => left.slot - right.slot);
}

function reducedOrbs(state: SkillSwapState): Json[] {
  return state.orbs.map((entry) => ({
    slot: entry.slot,
    template: entry.template,
    callback: entry.callback,
    matrixNum: entry.matrixNum,
    matrix: entry.matrix,
    attr: entry.attr,
    subpriority: entry.subpriority,
    x: entry.x,
    y: entry.y,
    x2: entry.x2,
    y2: entry.y2,
    data: entry.data,
    painterIndex: entry.painterIndex,
  }));
}

function assertOpaqueGameplay(
  orientation: SkillSwapOrientation,
  age: number,
  row: Json,
  first: Json,
): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${orientation}/${age}: opaque gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${orientation}/${age}: immutable gameplay state`);
}

function compareRow(
  orientation: SkillSwapOrientation,
  rows: readonly Json[],
  age: number,
): SkillSwapState {
  const row = rows[age]!;
  const input = skillSwapInputsFor(orientation, rows, age);
  const state = skillSwapAtAge(age, input);
  invariant(state.active === row.animScriptActive
    && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptOffset
    && state.source.wait === row.scriptWait,
  `${orientation}/${age}: root/subroutine cursor and wait`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: complete source anim args`);
  invariant(same(reducedTasks(state), retainedTasks(row)), `${orientation}/${age}: complete task slots/callbacks/data`);
  invariant(same(reducedOrbs(state), retainedOrbs(row)), `${orientation}/${age}: complete orb OAM/arc/matrix/data state`);
  invariant(same(state.battlers.attacker.sprite, battler(row.battlerSprites.attacker))
    && same(state.battlers.target.sprite, battler(row.battlerSprites.target)), `${orientation}/${age}: live battler geometry`);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: live source painter order`);
  invariant(same(state.buffers.softwareOam, row.softwareOam)
    && same(state.buffers.hardwareOam, row.hardwareOam)
    && same(state.buffers.softwareMatrices, row.softwareMatrices)
    && same(state.buffers.hardwareMatrices, row.hardwareMatrices), `${orientation}/${age}: whole OAM/matrix buffers`);
  invariant(same(state.palette.unfaded, row.unfadedPalette)
    && same(state.palette.faded, row.fadedPalette)
    && same(state.palette.hardware, row.hardwarePalette), `${orientation}/${age}: complete live palette buffers`);
  invariant(same(state.registers, row.registers) && same(state.background.vram, row.bgVram), `${orientation}/${age}: registers and BG VRAM`);
  const resourceLoaded = row.tileTags.includes(SKILL_SWAP_ORB_TAG) && row.paletteTags.includes(SKILL_SWAP_ORB_TAG);
  invariant(state.resources.loaded === resourceLoaded, `${orientation}/${age}: blue-green resource lifetime`);
  if (resourceLoaded) {
    invariant(row.tileTags[state.resources.tileSlot!] === SKILL_SWAP_ORB_TAG
      && row.paletteTags[state.resources.paletteAllocatorSlot!] === SKILL_SWAP_ORB_TAG,
    `${orientation}/${age}: blue-green allocation slots`);
  }
  invariant(same(state.resources.allocator, row.resourceAllocators), `${orientation}/${age}: live allocator state`);
  invariant(same(state.audio.live, row.audio), `${orientation}/${age}: live audio state`);
  if (age === 42) {
    invariant(same(state.audio.events, [{ channel: "SE1", sound: "SE_M_REVERSAL", pan: row.audio.SE1.tracks[0]!.panX, interval: 24, repeats: 3 }]), `${orientation}/${age}: reversal loop command/pan`);
  } else {
    invariant(state.audio.events.length === 0, `${orientation}/${age}: no repeated root audio command`);
  }
  invariant(state.rng.animation === row.animationRng
    && state.rng.gameplayUnchanged
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${orientation}/${age}: presentation/gameplay RNG boundary`);
  invariant(same(state.outcome, {
    playerAbilityAfterSwap: row.battlers.player.ability,
    opponentAbilityAfterSwap: row.battlers.opponent.ability,
  }), `${orientation}/${age}: legal ability result carried only`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount
    && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedOrbs === retainedOrbs(row).length
    && state.cleanup.firstInactive === (age === rows.length - 1)
    && state.cleanup.resourcesReleased === (age >= rows.length - 1), `${orientation}/${age}: cleanup ownership`);
  assertOpaqueGameplay(orientation, age, row, rows[0]!);

  if (age === 0) {
    invariant(state.displayTransfer.oam === "initial"
      && state.displayTransfer.matrices === "initial"
      && state.displayTransfer.palette === "initial", `${orientation}/0: initial transfer`);
  } else {
    const previous = rows[age - 1]!;
    invariant(same(row.hardwareOam, previous.softwareOam)
      && same(row.hardwareMatrices, previous.softwareMatrices)
      && same(row.hardwarePalette, previous.fadedPalette)
      && state.displayTransfer.oam === "preceding-software"
      && state.displayTransfer.matrices === "preceding-software"
      && state.displayTransfer.palette === "preceding-faded", `${orientation}/${age}: predecessor OAM/matrix/palette transfer`);
  }
  return state;
}

function verifyMoveOwnedIntervals(orientation: SkillSwapOrientation, rows: readonly Json[]): void {
  const firstInactive = rows.length - 1;
  invariant(firstInactive === (orientation === "player-back" ? 195 : 194), `${orientation}: first inactive row`);
  for (const [age, row] of rows.entries()) {
    const names = retainedTasks(row).map((entry) => entry.callback);
    const needsTargetSkill = age >= 42 && age <= 136;
    const needsAttackerSkill = age >= 60 && age <= 154;
    const needsTargetBlend = age >= 42 && age <= 112;
    const needsAttackerBlend = age >= 60 && age <= 130;
    const needsPsychic = age >= 23 && age <= 174;
    const needsFade = age >= 4 && age <= 40 || age >= 156 && age <= firstInactive - 2;
    invariant(names.filter((name) => name === "AnimTask_SkillSwap_Step").length === Number(needsTargetSkill) + Number(needsAttackerSkill), `${orientation}/${age}: two SkillSwap task intervals`);
    invariant(names.filter((name) => name === "AnimTask_BlendMonInAndOut_Step").length === Number(needsTargetBlend) + Number(needsAttackerBlend), `${orientation}/${age}: target then attacker BlendMon intervals`);
    invariant(names.includes("SetPsychicBackground_Step") === needsPsychic, `${orientation}/${age}: Psychic task interval`);
    invariant(names.includes("Task_FadeToBg") === needsFade, `${orientation}/${age}: Psychic fade/restore intervals`);
    const resourceLoaded = row.tileTags.includes(SKILL_SWAP_ORB_TAG) && row.paletteTags.includes(SKILL_SWAP_ORB_TAG);
    invariant(resourceLoaded === (age >= 1 && age < firstInactive), `${orientation}/${age}: resource load/release before inactive cleanup`);
  }
}

function replay(orientation: SkillSwapOrientation) {
  const rows = rowsFor(orientation);
  invariant(rows.length === (orientation === "player-back" ? 196 : 195), `${orientation}: retained dense row count`);
  verifyMoveOwnedIntervals(orientation, rows);
  const reducerDigests: string[] = [];
  const seamDigests: string[] = [];
  let reducerRows = 0;
  let seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    const reducedHasher = createHash("sha256");
    const seamHasher = createHash("sha256");
    for (const [age] of rows.entries()) {
      const state = compareRow(orientation, rows, age);
      const seam = sceneOnSkillSwapView({ age, config: skillSwapConfigFor(orientation, rows, age) } as SceneOnSkillSwapPresentationState);
      const { attacker, target, ...plainSeam } = seam;
      invariant(same(plainSeam, state), `${orientation}/${age}: narrow typed Scene-ON seam`);
      invariant(same(attacker, skillSwapConfigFor(orientation, rows, age).attacker)
        && same(target, skillSwapConfigFor(orientation, rows, age).target), `${orientation}/${age}: live seam battlers`);
      reducedHasher.update(JSON.stringify(state));
      seamHasher.update(JSON.stringify(plainSeam));
      reducerRows += 1;
      seamRows += 1;
    }
    reducerDigests.push(reducedHasher.digest("hex"));
    seamDigests.push(seamHasher.digest("hex"));
  }
  invariant(reducerDigests[0] === reducerDigests[1] && seamDigests[0] === seamDigests[1], `${orientation}: twice-fresh reducer/seam determinism`);
  const cleanup = skillSwapAtAge(rows.length - 1, skillSwapInputsFor(orientation, rows, rows.length - 1));
  invariant(!cleanup.active && cleanup.cleanup.firstInactive && cleanup.tasks.length === 0 && cleanup.orbs.length === 0 && cleanup.cleanup.resourcesReleased, `${orientation}: exact inactive cleanup`);
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

/** Replays all 391 retained bilateral rows twice through reducer and typed seam. */
export function verifySkillSwapReducer() {
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
  console.log(JSON.stringify(verifySkillSwapReducer(), null, 2));
}
