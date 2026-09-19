/**
 * Source-relative Scene-ON reducer for MOVE_SKILL_SWAP.
 *
 * The root owns two `AnimTask_SkillSwap` legs, their affine blue-green orbs,
 * the two white `BlendMonInAndOut` passes, and the Psychic background call.
 * Callers provide the currently allocated OAM/matrix/palette/resource state;
 * battle resolution and gameplay state deliberately remain opaque here.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SkillSwapSide = "player" | "opponent";
export type SkillSwapMatrix = readonly [number, number, number, number];
export type SkillSwapOam = readonly [number, number, number];

export interface SkillSwapPoint {
  readonly x: number;
  readonly y: number;
}

/** The source reads all four attribute corners, not a sprite's centre. */
export interface SkillSwapBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface SkillSwapBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: SkillSwapOam;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: SkillSwapMatrix;
}

/** A live allocator choice for one of the 24 source-created affine orbs. */
export interface SkillSwapOrbAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  readonly sourceCreationOrder: number;
}

/** Current software OAM owned by an allocated orb slot. */
export interface SkillSwapLiveOrbOam {
  readonly slot: number;
  readonly attr: SkillSwapOam;
  readonly subpriority: number;
}

export interface SkillSwapTaskSlots {
  readonly fadeToPsychic: number;
  readonly psychicBackground: number;
  readonly targetOrbs: number;
  readonly targetBlend: number;
  readonly loopReversal: number;
  readonly attackerOrbs: number;
  readonly attackerBlend: number;
  readonly restoreFade: number;
}

export interface SkillSwapLiveInputs {
  readonly attackerSide: SkillSwapSide;
  readonly targetSide: SkillSwapSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerBounds: Readonly<SkillSwapBounds>;
  readonly targetBounds: Readonly<SkillSwapBounds>;
  readonly attackerSprite: Readonly<SkillSwapBattlerSprite>;
  readonly targetSprite: Readonly<SkillSwapBattlerSprite>;
  readonly taskSlots: Readonly<SkillSwapTaskSlots>;
  /** The first twelve allocations are target -> attacker, then attacker -> target. */
  readonly orbAllocations: readonly SkillSwapOrbAllocation[];
  /** Current affine OAM fields, which are owned by the source sprite system. */
  readonly orbOam: readonly SkillSwapLiveOrbOam[];
  /** Persistent source painter order; this reducer never re-sorts it. */
  readonly spriteOrder: readonly number[];
  /** Whole live software/hardware buffers for the predecessor transfer seam. */
  readonly softwareOam: readonly unknown[];
  readonly hardwareOam: readonly unknown[];
  readonly softwareMatrices: readonly SkillSwapMatrix[];
  readonly hardwareMatrices: readonly SkillSwapMatrix[];
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{
    readonly currentVram: unknown;
    readonly battleVram: unknown;
    readonly psychicVram: unknown;
  }>;
  readonly resources: Readonly<{
    readonly tag: number;
    readonly tileSlot: number;
    readonly paletteAllocatorSlot: number;
    readonly paletteBank: number;
    readonly tileRange: readonly [number, number];
    readonly allocator: unknown;
  }>;
  /** Generic/shared task state remains live input rather than a new compositor. */
  readonly sharedTaskData: Readonly<{
    readonly fadeToPsychic: readonly number[];
    readonly loopReversal: readonly number[];
    readonly restoreFade: readonly number[];
  }>;
  /** `BlendPalette` starts at OBJ palette offset + 1, supplied by the scene. */
  readonly targetBlendPaletteStart: number;
  readonly attackerBlendPaletteStart: number;
  readonly audio: Readonly<{
    readonly current: unknown;
    readonly attackerPan: number;
  }>;
  readonly liveCounts: Readonly<{ readonly visualTasks: number; readonly soundTasks: number }>;
  readonly animationRng: number;
  /** The Scene-ON scheduler owns this one orientation-dependent final fade row. */
  readonly firstInactiveAge: number;
  /** Legal Skill Swap result, supplied by battle resolution but never changed here. */
  readonly abilityOutcome: Readonly<{
    readonly playerAbilityAfterSwap: number;
    readonly opponentAbilityAfterSwap: number;
  }>;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export interface SkillSwapSourceCursor {
  readonly owner: "Move_SKILL_SWAP";
  readonly pointer: number;
  /** Offset inside the root or its two source subroutines. */
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface SkillSwapTask {
  readonly slot: number;
  readonly callback:
    | "Task_FadeToBg"
    | "SetPsychicBackground_Step"
    | "AnimTask_SkillSwap_Step"
    | "AnimTask_BlendMonInAndOut_Step"
    | "Task_LoopAndPlaySE";
  readonly role:
    | "fade-to-psychic"
    | "psychic-background"
    | "target-orbs"
    | "target-blend"
    | "loop-reversal"
    | "attacker-orbs"
    | "attacker-blend"
    | "restore-background";
  readonly data: readonly number[];
}

export interface SkillSwapOrb {
  readonly slot: number;
  readonly template: "gSkillSwapOrbSpriteTemplate";
  readonly callback: "AnimSkillSwapOrb";
  readonly sourceCreationOrder: number;
  readonly leg: "target-to-attacker" | "attacker-to-target";
  readonly affineAnimation: 0 | 1 | 2 | 3;
  readonly matrixNum: number;
  readonly matrix: SkillSwapMatrix;
  readonly attr: SkillSwapOam;
  readonly subpriority: number;
  readonly painterIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** Complete source `sprite->data[0..7]` after the current callback. */
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly displayedStart: number;
  readonly displayedEnd: number;
}

export interface SkillSwapState {
  readonly age: number;
  readonly active: boolean;
  readonly source: SkillSwapSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: SkillSwapSide; readonly species: string; readonly bounds: SkillSwapBounds; readonly sprite: SkillSwapBattlerSprite }>;
    readonly target: Readonly<{ readonly side: SkillSwapSide; readonly species: string; readonly bounds: SkillSwapBounds; readonly sprite: SkillSwapBattlerSprite }>;
  }>;
  readonly tasks: readonly SkillSwapTask[];
  readonly orbs: readonly SkillSwapOrb[];
  readonly resources: Readonly<{
    readonly loaded: boolean;
    readonly tag: number;
    readonly tileSlot: number | null;
    readonly paletteAllocatorSlot: number | null;
    readonly paletteBank: number | null;
    readonly tileRange: readonly [number, number] | null;
    readonly allocator: unknown;
  }>;
  readonly painterOrder: readonly number[];
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly SkillSwapMatrix[];
    readonly hardwareMatrices: readonly SkillSwapMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly background: Readonly<{
    readonly phase: "battle" | "psychic" | "restoring" | "restored";
    readonly vram: unknown;
    readonly battleVram: unknown;
    readonly psychicVram: unknown;
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly audio: Readonly<{
    readonly live: unknown;
    readonly events: readonly Readonly<{
      readonly channel: "SE1";
      readonly sound: "SE_M_REVERSAL";
      readonly pan: number;
      readonly interval: 24;
      readonly repeats: 3;
    }>[];
  }>;
  readonly outcome: SkillSwapLiveInputs["abilityOutcome"];
  readonly rng: Readonly<{
    readonly animation: number;
    readonly gameplay: unknown;
    readonly gameplayUnchanged: true;
  }>;
  readonly gameplay: unknown;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedTasks: number;
    readonly ownedOrbs: number;
    readonly resourcesReleased: boolean;
  }>;
}

export const SKILL_SWAP_SOURCE_START = 0x082c_e3d8;
export const SKILL_SWAP_SOURCE_END_EXCLUSIVE = 0x082c_e423;
export const SKILL_SWAP_PSYCHIC_BACKGROUND_START = 0x082d_7cd1;
export const SKILL_SWAP_UNSET_BACKGROUND_START = 0x082d_7cdd;
export const SKILL_SWAP_ORB_TAG = 10251;

const ORB_DURATION = 16;
const ORBS_PER_LEG = 12;
const ORB_CADENCE = 7;

function assertAge(age: number, input: Readonly<SkillSwapLiveInputs>): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Skill Swap source age ${age}`);
  if (!Number.isInteger(input.firstInactiveAge) || input.firstInactiveAge < 176) {
    throw new Error(`invalid Skill Swap first inactive age ${input.firstInactiveAge}`);
  }
  if (input.orbAllocations.length !== ORBS_PER_LEG * 2) {
    throw new Error(`Skill Swap requires ${ORBS_PER_LEG * 2} live orb allocations`);
  }
}

/** Exact root/subroutine cursor observed from the source script, never a controller tick. */
export function skillSwapSourceAtAge(age: number, firstInactiveAge: number): SkillSwapSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Skill Swap source age ${age}`);
  if (age === 0) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_SOURCE_START, pointerOffset: 0, active: true, wait: 0 };
  if (age <= 3) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_SOURCE_START + 3, pointerOffset: 3, active: true, wait: age === 1 ? 1 : 0 };
  if (age <= 22) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_PSYCHIC_BACKGROUND_START + 2, pointerOffset: 2, active: true, wait: 1 };
  if (age <= 41) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_PSYCHIC_BACKGROUND_START + 10, pointerOffset: 10, active: true, wait: 1 };
  if (age <= 59) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_SOURCE_START + 42, pointerOffset: 42, active: true, wait: Math.max(0, 58 - age) };
  if (age <= 155) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_SOURCE_START + 68, pointerOffset: 68, active: true, wait: 1 };
  if (age <= 174) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_UNSET_BACKGROUND_START + 1, pointerOffset: 13, active: true, wait: 1 };
  if (age < firstInactiveAge) return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_UNSET_BACKGROUND_START + 6, pointerOffset: 18, active: true, wait: 1 };
  return { owner: "Move_SKILL_SWAP", pointer: SKILL_SWAP_SOURCE_END_EXCLUSIVE - 1, pointerOffset: 74, active: false, wait: 0 };
}

function signed16(value: number): number {
  const word = value & 0xffff;
  return word & 0x8000 ? word - 0x10000 : word;
}

/** `InitAnimLinearTranslation`'s unsigned-magnitude / low-bit direction encoding. */
function encodedDelta(distance: number): number {
  const magnitude = Math.trunc((Math.abs(distance) * 256) / ORB_DURATION);
  return distance < 0 ? magnitude | 1 : magnitude & ~1;
}

function encodedOffset(delta: number, callbacks: number): number {
  const accumulated = (delta * callbacks) & 0xffff;
  const offset = delta & 1 ? -(accumulated >> 8) : accumulated >> 8;
  return offset === 0 ? 0 : offset;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function taskData16(values: readonly number[]): readonly number[] {
  return [...values, ...Array(Math.max(0, 16 - values.length)).fill(0)];
}

function trajectoryFor(
  leg: "target-to-attacker" | "attacker-to-target",
  input: Readonly<SkillSwapLiveInputs>,
): Readonly<{ start: SkillSwapPoint; end: SkillSwapPoint; amplitude: number }> {
  const attacker = input.attackerBounds;
  const target = input.targetBounds;
  if (leg === "target-to-attacker") {
    return {
      start: { x: target.left + 8, y: target.top + 8 },
      end: { x: attacker.left + 8, y: attacker.top + 8 },
      amplitude: -10,
    };
  }
  return {
    start: { x: attacker.right - 8, y: attacker.bottom - 8 },
    end: { x: target.right - 8, y: target.bottom - 8 },
    amplitude: 10,
  };
}

function skillTaskAtAge(
  age: number,
  startAge: number,
  slot: number,
  role: "target-orbs" | "attacker-orbs",
  trajectory: Readonly<{ start: SkillSwapPoint; end: SkillSwapPoint; amplitude: number }>,
): SkillSwapTask | null {
  const elapsed = age - startAge;
  if (elapsed < 0 || elapsed > 94) return null;
  const spawned = Math.min(ORBS_PER_LEG, Math.floor(elapsed / ORB_CADENCE) + 1);
  const doneSpawning = spawned === ORBS_PER_LEG;
  const timer = doneSpawning ? elapsed - (ORB_CADENCE * (ORBS_PER_LEG - 1)) : elapsed % ORB_CADENCE;
  return {
    slot,
    callback: "AnimTask_SkillSwap_Step",
    role,
    data: taskData16([
      doneSpawning ? 1 : 0,
      timer,
      spawned,
      0, 0, 0, 0, 0, 0, 0,
      trajectory.amplitude,
      trajectory.start.x,
      trajectory.start.y,
      trajectory.end.x,
      trajectory.end.y,
    ]),
  };
}

/** `AnimTask_BlendMonInAndOut_Step`, including the creation-frame callback. */
function blendTaskAtAge(
  age: number,
  startAge: number,
  slot: number,
  role: "target-blend" | "attacker-blend",
  paletteStart: number,
): SkillSwapTask | null {
  const elapsed = age - startAge;
  if (elapsed < 0 || elapsed > 70) return null;
  let coefficient = 0;
  let delay = 0;
  let blendingOut = 0;
  let repeats = 1;
  for (let tick = 0; tick <= elapsed; tick += 1) {
    delay += 1;
    if (delay < 3) continue;
    delay = 0;
    if (!blendingOut) {
      coefficient += 1;
      if (coefficient === 12) blendingOut = 1;
    } else {
      coefficient -= 1;
      if (!coefficient) {
        repeats -= 1;
        if (repeats) {
          delay = 0;
          blendingOut = 0;
        }
      }
    }
  }
  return {
    slot,
    callback: "AnimTask_BlendMonInAndOut_Step",
    role,
    data: taskData16([paletteStart, 0x7fff, coefficient, 12, delay, 3, blendingOut, repeats]),
  };
}

function psychicTaskAtAge(age: number, slot: number): SkillSwapTask | null {
  if (age < 23 || age > 174) return null;
  return {
    slot,
    callback: "SetPsychicBackground_Step",
    role: "psychic-background",
    data: taskData16([0, 0, 0, 0, 0, (age - 22) & 3]),
  };
}

function sharedTask(
  slot: number,
  callback: "Task_FadeToBg" | "Task_LoopAndPlaySE",
  role: "fade-to-psychic" | "loop-reversal" | "restore-background",
  data: readonly number[],
): SkillSwapTask {
  return { slot, callback, role, data };
}

function liveOrbOam(slot: number, input: Readonly<SkillSwapLiveInputs>): SkillSwapLiveOrbOam {
  const found = input.orbOam.find((entry) => entry.slot === slot);
  if (!found) throw new Error(`missing live Skill Swap OAM for slot ${slot}`);
  return found;
}

function orbAtAge(
  age: number,
  startAge: number,
  ordinal: number,
  allocation: Readonly<SkillSwapOrbAllocation>,
  leg: "target-to-attacker" | "attacker-to-target",
  trajectory: Readonly<{ start: SkillSwapPoint; end: SkillSwapPoint; amplitude: number }>,
  input: Readonly<SkillSwapLiveInputs>,
): SkillSwapOrb | null {
  const spawnAge = startAge + ordinal * ORB_CADENCE;
  const elapsed = age - spawnAge;
  if (elapsed < 0 || elapsed > ORB_DURATION) return null;
  const deltaX = encodedDelta(trajectory.end.x - trajectory.start.x);
  const deltaY = encodedDelta(trajectory.end.y - trajectory.start.y);
  const phase = (elapsed * 8) & 0xff;
  const x2 = encodedOffset(deltaX, elapsed);
  const y2 = encodedOffset(deltaY, elapsed) + gbaSin(phase, trajectory.amplitude);
  const liveOam = liveOrbOam(allocation.slot, input);
  const matrix = input.softwareMatrices[allocation.matrixNum];
  if (!matrix) throw new Error(`missing live Skill Swap affine matrix ${allocation.matrixNum}`);
  return {
    slot: allocation.slot,
    template: "gSkillSwapOrbSpriteTemplate",
    callback: "AnimSkillSwapOrb",
    sourceCreationOrder: allocation.sourceCreationOrder,
    leg,
    affineAnimation: ((ordinal + 1) & 3) as 0 | 1 | 2 | 3,
    matrixNum: allocation.matrixNum,
    matrix,
    attr: liveOam.attr,
    subpriority: liveOam.subpriority,
    painterIndex: input.spriteOrder.indexOf(allocation.slot),
    x: trajectory.start.x,
    y: trajectory.start.y,
    x2,
    y2,
    data: [
      ORB_DURATION - elapsed,
      deltaX,
      deltaY,
      signed16(deltaX * elapsed),
      signed16(deltaY * elapsed),
      trajectory.amplitude,
      0x0800,
      signed16(0x0800 * elapsed),
    ],
    displayedStart: spawnAge + 1,
    displayedEnd: spawnAge + ORB_DURATION + 1,
  };
}

function animArgsAtAge(age: number): SkillSwapState["animArgs"] {
  if (age < 42) return [0, 0, 0, 0, 0, 0, 0, 0];
  return [age < 60 ? 1 : 0, 0x7fff, 12, 3, 1, 0, 0, age >= 175 ? -1 : 0];
}

function backgroundPhase(age: number): SkillSwapState["background"]["phase"] {
  if (age < 23) return "battle";
  if (age < 156) return "psychic";
  if (age < 175) return "restoring";
  return "restored";
}

/**
 * Reduces one source-owned Skill Swap age.  It intentionally does not draw,
 * dispatch from battleScene/core, create assets, or inspect gameplay state.
 */
export function skillSwapAtAge(age: number, input: Readonly<SkillSwapLiveInputs>): SkillSwapState {
  assertAge(age, input);
  const source = skillSwapSourceAtAge(age, input.firstInactiveAge);
  const targetTrajectory = trajectoryFor("target-to-attacker", input);
  const attackerTrajectory = trajectoryFor("attacker-to-target", input);
  const tasks = [
    age >= 4 && age <= 40
      ? sharedTask(input.taskSlots.fadeToPsychic, "Task_FadeToBg", "fade-to-psychic", input.sharedTaskData.fadeToPsychic)
      : null,
    psychicTaskAtAge(age, input.taskSlots.psychicBackground),
    skillTaskAtAge(age, 42, input.taskSlots.targetOrbs, "target-orbs", targetTrajectory),
    blendTaskAtAge(age, 42, input.taskSlots.targetBlend, "target-blend", input.targetBlendPaletteStart),
    age >= 42 && age <= 90
      ? sharedTask(input.taskSlots.loopReversal, "Task_LoopAndPlaySE", "loop-reversal", input.sharedTaskData.loopReversal)
      : null,
    skillTaskAtAge(age, 60, input.taskSlots.attackerOrbs, "attacker-orbs", attackerTrajectory),
    blendTaskAtAge(age, 60, input.taskSlots.attackerBlend, "attacker-blend", input.attackerBlendPaletteStart),
    age >= 156 && age <= input.firstInactiveAge - 2
      ? sharedTask(input.taskSlots.restoreFade, "Task_FadeToBg", "restore-background", input.sharedTaskData.restoreFade)
      : null,
  ].filter((entry): entry is SkillSwapTask => entry !== null)
    .sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));

  const orbs: SkillSwapOrb[] = [];
  for (let ordinal = 0; ordinal < ORBS_PER_LEG; ordinal += 1) {
    const targetOrb = orbAtAge(age, 42, ordinal, input.orbAllocations[ordinal]!, "target-to-attacker", targetTrajectory, input);
    if (targetOrb) orbs.push(targetOrb);
    const attackerOrb = orbAtAge(age, 60, ordinal, input.orbAllocations[ORBS_PER_LEG + ordinal]!, "attacker-to-target", attackerTrajectory, input);
    if (attackerOrb) orbs.push(attackerOrb);
  }
  orbs.sort((left, right) => left.slot - right.slot || left.sourceCreationOrder - right.sourceCreationOrder);

  const resourcesLoaded = age >= 1 && age < input.firstInactiveAge;
  return {
    age,
    active: source.active,
    source,
    animArgs: animArgsAtAge(age),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, bounds: input.attackerBounds, sprite: input.attackerSprite },
      target: { side: input.targetSide, species: input.targetSpecies, bounds: input.targetBounds, sprite: input.targetSprite },
    },
    tasks,
    orbs,
    resources: {
      loaded: resourcesLoaded,
      tag: input.resources.tag,
      tileSlot: resourcesLoaded ? input.resources.tileSlot : null,
      paletteAllocatorSlot: resourcesLoaded ? input.resources.paletteAllocatorSlot : null,
      paletteBank: resourcesLoaded ? input.resources.paletteBank : null,
      tileRange: resourcesLoaded ? input.resources.tileRange : null,
      allocator: input.resources.allocator,
    },
    painterOrder: input.spriteOrder,
    buffers: {
      softwareOam: input.softwareOam,
      hardwareOam: input.hardwareOam,
      softwareMatrices: input.softwareMatrices,
      hardwareMatrices: input.hardwareMatrices,
    },
    palette: input.palette,
    background: {
      phase: backgroundPhase(age),
      vram: input.background.currentVram,
      battleVram: input.background.battleVram,
      psychicVram: input.background.psychicVram,
    },
    registers: input.registers,
    audio: {
      live: input.audio.current,
      events: age === 42
        ? [{ channel: "SE1", sound: "SE_M_REVERSAL", pan: input.audio.attackerPan, interval: 24, repeats: 3 }]
        : [],
    },
    outcome: input.abilityOutcome,
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : "preceding-software",
      palette: age === 0 ? "initial" : "preceding-faded",
    },
    cleanup: {
      firstInactive: age === input.firstInactiveAge,
      visualTasks: input.liveCounts.visualTasks,
      soundTasks: input.liveCounts.soundTasks,
      ownedTasks: tasks.length,
      ownedOrbs: orbs.length,
      resourcesReleased: age >= input.firstInactiveAge,
    },
  };
}
