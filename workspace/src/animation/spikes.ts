/**
 * Pure source-relative reducer for Move_SPIKES.
 *
 * This is deliberately only the Move_SPIKES presentation timeline: script
 * cursor, target arc sprites, resource/palette lifetimes, monbg handoff,
 * and sound scheduling.  Spikes' side condition, damage, RNG used by battle
 * resolution, turn order, and facility progression remain battle-owned.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { advanceRngValue } from "../engine/rng.ts";

export const SPIKES_WINDOW_ROWS = 114;
export const SPIKES_FIRST_INACTIVE_AGE = 113;
export const SPIKES_TAG = 10152;
export const SPIKES_SOURCE_BASE = 0x082d_18cd;

const NEUTRAL_MATRIX = [256, 0, 0, 256] as const;
const SPIKE_ATTR2 = 31025;
const ARC_DURATION = 30;
const ARC_STEP = Math.trunc(0x8000 / ARC_DURATION);
const SPAWN_AGES = [7, 19, 31] as const;
const TARGET_X_OFFSETS = [0, -24, 24] as const;

export type SpikesSide = "player" | "opponent";

export interface SpikesProfile {
  /** `gRng2Value` at Move_SPIKES's first retained source row. */
  readonly animationRngAtAge0: number;
  /** CreateSprite's three source-selected slots, in script command order. */
  readonly spriteSlots: readonly [number, number, number];
  /** `GetBattlerSpriteSubpriority(gBattleAnimTarget)`. */
  readonly targetSubpriority: number;
  /** Resource-allocation-derived OAM tile/palette word. */
  readonly oam?: Readonly<{ readonly spikeAttr2: number }>;
  /** Palette snapshots around the sole `loadspritegfx ANIM_TAG_SPIKES` edge. */
  readonly palette: Readonly<{
    readonly unfadedAtAge0: readonly number[];
    readonly fadedAtAge0: readonly number[];
    readonly hardwareAtAge0: readonly number[];
    readonly unfadedAfterLoad: readonly number[];
    readonly fadedAfterLoad: readonly number[];
    /** `monbg` allocates the copied target OBJ palette bank at source age 4. */
    readonly unfadedAfterMonbg: readonly number[];
    readonly fadedAfterMonbg: readonly number[];
  }>;
}

export interface SpikesSprite {
  readonly slot: number;
  readonly template: "gSpikesSpriteTemplate";
  readonly callback:
    | "AnimSpikes_Step1"
    | "WaitAnimForDuration"
    | "AnimSpikes_Step2";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  /** Source template is gOamData_AffineOff_ObjNormal_16x16. */
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly animation: Readonly<{
    readonly animNum: 0;
    readonly animCmdIndex: 0;
    readonly animDelayCounter: 156;
  }>;
  readonly data: readonly [number, number, number, number, number, -50, number, number];
  readonly attr: readonly [number, number, number];
}

export interface SpikesTask {
  readonly slot: number;
  readonly callback:
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "Task_WaitAndPlaySE";
  readonly data: readonly number[];
}

export interface SpikesState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_SPIKES";
    readonly offset: 0 | 3 | 5 | 33 | 61 | 83 | 86;
    readonly pointer: number;
    readonly pointerParity: 0 | 1;
    readonly wait: number;
    readonly args: readonly number[];
  }>;
  readonly animationRng: number;
  readonly sprites: readonly SpikesSprite[];
  readonly tasks: readonly SpikesTask[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0 | 1 | 2 | 3;
  readonly monbg: Readonly<{
    readonly active: boolean;
    readonly cleanupActive: boolean;
    readonly background: "BG1" | "BG2";
    readonly targetHiddenFromObj: boolean;
  }>;
  readonly matrices: Readonly<{
    readonly software: readonly (readonly [256, 0, 0, 256])[];
    readonly hardware: readonly (readonly [256, 0, 0, 256])[];
    readonly transferLagRows: 1;
  }>;
  readonly oam: Readonly<{ readonly transferLagRows: 1 }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly transferLagRows: 1;
    /** `monbg` refreshes OBJ palette DMA in the current row at source age 4. */
    readonly sameRowTransfer: boolean;
  }>;
  readonly resources: Readonly<{
    readonly loaded: boolean;
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
  }>;
  readonly audio: Readonly<{
    readonly starts: readonly Readonly<{
      readonly age: 7 | 19 | 35 | 47 | 59;
      readonly sound: "SE_M_JUMP_KICK" | "SE_M_HORN_ATTACK";
      readonly id: 143 | 166;
      readonly pan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
    }>[];
    readonly current: "SE_M_JUMP_KICK" | "SE_M_HORN_ATTACK" | null;
    readonly active: boolean;
    readonly status: 0 | 1 | 0x80000000;
    readonly attackerPan: -64 | 63;
    readonly targetPan: -63 | 63;
    readonly currentPan: -64 | -63 | 63;
  }>;
}

function zeroArgs(): readonly number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

function sourceAtAge(age: number, attackerSide: SpikesSide): SpikesState["source"] {
  const side = attackerSide === "player" ? 1 : -1;
  let offset: SpikesState["source"]["offset"];
  let wait: number;
  let args: readonly number[];
  if (age <= 0) {
    offset = 0; wait = 0; args = zeroArgs();
  } else if (age <= 3) {
    offset = 3; wait = age === 1 ? 1 : 0; args = zeroArgs();
  } else if (age <= 6) {
    offset = 5; wait = age === 4 ? 1 : 0; args = zeroArgs();
  } else if (age <= 18) {
    offset = 33; wait = Math.max(0, 17 - age); args = [20, 0, 0, 24, 30, 0, 0, 0];
  } else if (age <= 30) {
    offset = 61; wait = Math.max(0, 29 - age); args = [20, 0, -24 * side, 24, 30, 0, 0, 0];
  } else if (age <= 108) {
    offset = 83; wait = 1; args = [20, 0, 24 * side, 24, 30, 0, 0, 0];
  } else {
    offset = 86; wait = 1; args = [20, 0, 24 * side, 24, 30, 0, 0, 0];
  }
  const pointer = SPIKES_SOURCE_BASE + offset;
  return { owner: "Move_SPIKES", offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait, args };
}

function animationRngAtAge(age: number, seed: number): number {
  let value = seed >>> 0;
  // The source's ordinary callback pass consumes gRng2 once per source row
  // through age 110.  The inactive clean-up row makes the final observed
  // call, while the two clear-mongbg rows between them do not.
  for (let current = 1; current <= age; current += 1) {
    if (current <= 110 || current === SPIKES_FIRST_INACTIVE_AGE) value = advanceRngValue(value);
  }
  return value;
}

function rawDelta(distance: number): number {
  const magnitude = Math.trunc(Math.abs(distance) * 256 / ARC_DURATION);
  return distance < 0 ? magnitude | 1 : magnitude & ~1;
}

function displayedOffset(raw: number, negative: boolean, callbacks: number): number {
  const magnitude = Math.trunc(raw * callbacks / 256);
  return negative ? -magnitude : magnitude;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function spikeAtAge(
  age: number,
  index: 0 | 1 | 2,
  attackerSide: SpikesSide,
  attacker: Readonly<{ x: number; y: number }>,
  target: Readonly<{ x: number; y: number }>,
  profile: SpikesProfile,
): SpikesSprite | null {
  const spawnAge = SPAWN_AGES[index];
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge > 76) return null;
  const side = attackerSide === "player" ? 1 : -1;
  const x = attacker.x + side * 20;
  const y = attacker.y;
  const xDistance = target.x + side * TARGET_X_OFFSETS[index] - x;
  const yDistance = target.y + 24 - y;
  const xRaw = rawDelta(xDistance);
  const yRaw = rawDelta(yDistance);
  let callback: SpikesSprite["callback"];
  let x2: number;
  let y2: number;
  let data: SpikesSprite["data"];
  if (localAge <= 29) {
    const callbacks = localAge + 1;
    x2 = displayedOffset(xRaw, xDistance < 0, callbacks);
    y2 = displayedOffset(yRaw, yDistance < 0, callbacks)
      + gbaSin((ARC_STEP * callbacks) >> 8, -50);
    callback = "AnimSpikes_Step1";
    data = [
      ARC_DURATION - callbacks, xRaw, yRaw, xRaw * callbacks, yRaw * callbacks,
      -50, ARC_STEP, ARC_STEP * callbacks,
    ];
  } else {
    const callbacks = ARC_DURATION;
    x2 = displayedOffset(xRaw, xDistance < 0, callbacks);
    y2 = displayedOffset(yRaw, yDistance < 0, callbacks)
      + gbaSin((ARC_STEP * callbacks) >> 8, -50);
    if (localAge <= 60) {
      callback = "WaitAnimForDuration";
      data = [
        30 - (localAge - 30), 0, yRaw, xRaw * callbacks, yRaw * callbacks,
        -50, -22675, 2069,
      ];
    } else {
      callback = "AnimSpikes_Step2";
      data = [
        0, localAge - 61, yRaw, xRaw * callbacks, yRaw * callbacks,
        -50, -22675, 2069,
      ];
    }
  }
  const attr2 = profile.oam?.spikeAttr2 ?? SPIKE_ATTR2;
  return {
    slot: profile.spriteSlots[index],
    template: "gSpikesSpriteTemplate",
    callback,
    x,
    y,
    x2,
    y2,
    subpriority: profile.targetSubpriority,
    invisible: localAge >= 63 && Math.floor((localAge - 63) / 2) % 2 === 0,
    matrixNum: 0,
    matrix: NEUTRAL_MATRIX,
    animation: { animNum: 0, animCmdIndex: 0, animDelayCounter: 156 },
    data,
    attr: [(y + y2 - 8) & 0xff, 0x4000 | ((x + x2 - 8) & 0x1ff), attr2],
  };
}

function monbgTask(
  targetSide: SpikesSide,
  target: Readonly<{ x: number; y: number }>,
): SpikesTask {
  const playerTarget = targetSide === "player";
  return {
    slot: 1,
    callback: "Task_UpdateMonBg",
    data: playerTarget
      ? [6, target.x, target.y, target.x - 112, target.y - 128, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      : [8, target.x, target.y, target.x - 322, target.y - 52, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function tasksAtAge(
  age: number,
  targetSide: SpikesSide,
  target: Readonly<{ x: number; y: number }>,
): readonly SpikesTask[] {
  const tasks: SpikesTask[] = [];
  for (const [index, start] of SPAWN_AGES.entries()) {
    if (age < start || age > start + 27) continue;
    tasks.push({
      slot: index === 0 ? 0 : index + 1,
      callback: "Task_WaitAndPlaySE",
      data: [166, targetSide === "player" ? -63 : 63, start + 27 - age, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }
  if (age >= 109 && age <= 111) {
    tasks.push({
      slot: 0,
      callback: "Task_ClearMonBg",
      data: [0, age === 109 ? 1 : 2, targetSide === "player" ? 0 : 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }
  if (age >= 4 && age <= 111) tasks.push(monbgTask(targetSide, target));
  return tasks.sort((left, right) => left.slot - right.slot);
}

function paletteAtAge(age: number, profile: SpikesProfile): SpikesState["palette"] {
  const loaded = age >= 1;
  const monbgLoaded = age >= 4;
  return {
    unfaded: [...(monbgLoaded
      ? profile.palette.unfadedAfterMonbg
      : loaded ? profile.palette.unfadedAfterLoad : profile.palette.unfadedAtAge0)],
    faded: [...(monbgLoaded
      ? profile.palette.fadedAfterMonbg
      : loaded ? profile.palette.fadedAfterLoad : profile.palette.fadedAtAge0)],
    // Age 4 is the one measured same-row palette copy, triggered by the
    // `monbg` allocation. All other retained rows obey the ordinary lag.
    hardware: [...(age <= 1
      ? profile.palette.hardwareAtAge0
      : monbgLoaded ? profile.palette.fadedAfterMonbg : profile.palette.fadedAfterLoad)],
    transferLagRows: 1,
    sameRowTransfer: age === 4,
  };
}

function audioAtAge(
  age: number,
  attackerSide: SpikesSide,
  targetSide: SpikesSide,
): SpikesState["audio"] {
  // The third delayed horn attack naturally ends at source age 85; the
  // script/monbg window continues through age 112 without restarting SE1.
  const active = age >= 7 && age < 85;
  const landing = age >= 35;
  const starts = [
    { age: 7, sound: "SE_M_JUMP_KICK", id: 143, pan: "SOUND_PAN_ATTACKER" },
    { age: 19, sound: "SE_M_JUMP_KICK", id: 143, pan: "SOUND_PAN_ATTACKER" },
    { age: 35, sound: "SE_M_HORN_ATTACK", id: 166, pan: "SOUND_PAN_TARGET" },
    { age: 47, sound: "SE_M_HORN_ATTACK", id: 166, pan: "SOUND_PAN_TARGET" },
    { age: 59, sound: "SE_M_HORN_ATTACK", id: 166, pan: "SOUND_PAN_TARGET" },
  ] as const;
  const current = age < 7 ? null : landing ? "SE_M_HORN_ATTACK" : "SE_M_JUMP_KICK";
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = targetSide === "player" ? -63 : 63;
  const startedThisRow = starts.some((start) => start.age === age);
  return {
    starts,
    current,
    active,
    status: !active ? 0x80000000 : startedThisRow ? 0 : 1,
    attackerPan,
    targetPan,
    currentPan: current === "SE_M_HORN_ATTACK" ? targetPan : attackerPan,
  };
}

/** `age=0` is the first retained active Move_SPIKES source row. */
export function spikesAtAge(
  age: number,
  attackerSide: SpikesSide,
  attacker: Readonly<{ x: number; y: number }>,
  targetSide: SpikesSide,
  target: Readonly<{ x: number; y: number }>,
  profile: SpikesProfile,
  monbgTarget: Readonly<{ x: number; y: number }> = target,
): SpikesState {
  const sprites = SPAWN_AGES.flatMap((_, index) => {
    const sprite = spikeAtAge(age, index as 0 | 1 | 2, attackerSide, attacker, target, profile);
    return sprite ? [sprite] : [];
  });
  const tasks = tasksAtAge(age, targetSide, monbgTarget);
  const loaded = age >= 1 && age < SPIKES_FIRST_INACTIVE_AGE;
  const monbgActive = age >= 4 && age <= 111;
  const soundTaskCount = tasks.filter((task) => task.callback === "Task_WaitAndPlaySE").length as 0 | 1 | 2 | 3;
  return {
    age,
    active: age >= 0 && age < SPIKES_FIRST_INACTIVE_AGE,
    source: sourceAtAge(age, attackerSide),
    animationRng: animationRngAtAge(age, profile.animationRngAtAge0),
    sprites,
    tasks,
    // `gAnimVisualTaskCount` accounts for the three effect sprites, while
    // monbg's maintenance/cleanup tasks are ordinary battle UI tasks.
    visualTaskCount: sprites.length,
    soundTaskCount,
    monbg: {
      active: monbgActive,
      cleanupActive: age >= 109 && age <= 111,
      background: targetSide === "player" ? "BG2" : "BG1",
      targetHiddenFromObj: monbgActive,
    },
    matrices: {
      software: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
      hardware: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
      transferLagRows: 1,
    },
    oam: { transferLagRows: 1 },
    palette: paletteAtAge(age, profile),
    resources: {
      loaded,
      tileTags: loaded ? [SPIKES_TAG] : [],
      paletteTags: loaded ? [SPIKES_TAG] : [],
    },
    audio: audioAtAge(age, attackerSide, targetSide),
  };
}
