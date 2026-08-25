/**
 * Source-age reducer for MOVE_INGRAIN's visual body.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_INGRAIN`
 * - `asm/macros/battle_anim_script.inc:create_ingrain_{root,orb}_sprite`
 * - `src/battle_anim_effects_1.c:AnimIngrainRoot` / `AnimIngrainOrb`
 *
 * `age=0` is the first active Move_INGRAIN script row. This is deliberately
 * source-relative: field geometry and the live attacker subpriority arrive at
 * the Scene-ON seam, while status, switch prevention, healing, and all battle
 * state remain controller-owned.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export interface IngrainPoint {
  readonly x: number;
  readonly y: number;
}

/** `GetBattlerSpriteSubpriority(ANIM_ATTACKER)` at orb allocation. */
export interface IngrainProfile {
  readonly attackerSubpriority: number;
}

export interface IngrainRoot {
  readonly index: 0 | 1 | 2 | 3;
  readonly creationAge: 7 | 19 | 31 | 43;
  readonly duration: 150 | 140 | 130 | 120;
  /** Source `data[0]`, including its callback's creation-row double step. */
  readonly counter: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: 29 | 31;
  readonly oamPriority: 2;
  readonly animation: 0 | 1 | 2 | 3;
  /** `gIngrainRootAnimCmds*` command index retained by OAM. */
  readonly animationCommand: 0 | 1 | 2 | 3;
  readonly animationDelay: number;
  /** 16px cells in the 32x32 ROOTS sheet. */
  readonly sourceCell: 0 | 16 | 32 | 48;
  readonly hFlip: boolean;
  /** `AnimRootFlickerOut` only flickers during its final ten callback rows. */
  readonly invisible: boolean;
}

export interface IngrainOrb {
  readonly index: 0 | 1 | 2;
  readonly creationAge: 85 | 99 | 113;
  readonly duration: 30 | 30 | 18;
  /** Source `data[0]`, including the creation-row double callback step. */
  readonly phase: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly velocityX: -2 | -1 | 1;
  readonly waveAmplitude: 2 | 3;
  /** Live sprite allocation resolves the script's `ANIM_ATTACKER, 3` to -3. */
  readonly subpriority: number;
  readonly oamPriority: 2;
  /** `gIngrainOrbAnimCmds`: 0=cell 3, 1=cell 0. */
  readonly animationCommand: 0 | 1;
  readonly animationDelay: number;
  readonly sourceCell: 0 | 3;
  readonly invisible: false;
}

export interface IngrainSoundEvent {
  readonly age: 7 | 19 | 31 | 43 | 92 | 99 | 106 | 113;
  readonly song: "SE_M_SCRATCH" | "SE_M_BUBBLE3";
  readonly pan: "attacker";
}

export interface IngrainState {
  readonly age: number;
  readonly active: boolean;
  readonly sourceOffset: 0 | 3 | 6 | 29 | 52 | 75 | 98 | 117 | 123 | 146 | 152 | 175 | 176 | null;
  readonly rootsLoaded: boolean;
  readonly orbsLoaded: boolean;
  readonly roots: readonly IngrainRoot[];
  readonly orbs: readonly IngrainOrb[];
  readonly visualSpriteCount: number;
  readonly sounds: readonly IngrainSoundEvent[];
}

const ROOTS = [
  { creationAge: 7, x2: 16, y2: 26, subpriority: 29, animation: 2, duration: 150 },
  { creationAge: 19, x2: -32, y2: 20, subpriority: 31, animation: 1, duration: 140 },
  { creationAge: 31, x2: 32, y2: 22, subpriority: 31, animation: 0, duration: 130 },
  { creationAge: 43, x2: -16, y2: 25, subpriority: 29, animation: 3, duration: 120 },
] as const;

const ORBS = [
  { creationAge: 85, x: 32, y: 26, velocityX: -1, waveAmplitude: 3, duration: 30 },
  { creationAge: 99, x: -48, y: 20, velocityX: 1, waveAmplitude: 2, duration: 30 },
  { creationAge: 113, x: 48, y: 26, velocityX: -2, waveAmplitude: 3, duration: 18 },
] as const;

const SOUND_EVENTS: readonly IngrainSoundEvent[] = [
  { age: 7, song: "SE_M_SCRATCH", pan: "attacker" },
  { age: 19, song: "SE_M_SCRATCH", pan: "attacker" },
  { age: 31, song: "SE_M_SCRATCH", pan: "attacker" },
  { age: 43, song: "SE_M_SCRATCH", pan: "attacker" },
  { age: 92, song: "SE_M_BUBBLE3", pan: "attacker" },
  { age: 99, song: "SE_M_BUBBLE3", pan: "attacker" },
  { age: 106, song: "SE_M_BUBBLE3", pan: "attacker" },
  { age: 113, song: "SE_M_BUBBLE3", pan: "attacker" },
];

function sourceOffsetAtAge(age: number): IngrainState["sourceOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 18) return 29;
  if (age <= 30) return 52;
  if (age <= 42) return 75;
  if (age <= 84) return 98;
  if (age <= 91) return 117;
  if (age <= 98) return 123;
  if (age <= 105) return 146;
  if (age <= 112) return 152;
  if (age <= 162) return 175;
  if (age === 163) return 176;
  return null;
}

function rootAnimationAtAge(
  animation: 0 | 1 | 2 | 3,
  localAge: number,
): Pick<IngrainRoot, "animationCommand" | "animationDelay" | "sourceCell" | "hFlip"> {
  const commandCount = animation === 0 || animation === 1 ? 4 : 3;
  // StartSpriteAnim leaves command 0 on its six creation-delay rows, then
  // each following command owns seven rows. ANIMCMD_END retains the final
  // cell with a zero delay instead of wrapping.
  const nextCommand = localAge <= 5 ? 0 : 1 + Math.floor((localAge - 6) / 7);
  const command = Math.min(commandCount - 1, nextCommand);
  const animationDelay = localAge <= 5
    ? 5 - localAge
    : nextCommand >= commandCount
      ? 0
      : 6 - ((localAge - 6) % 7);
  return {
    animationCommand: command as IngrainRoot["animationCommand"],
    animationDelay,
    sourceCell: (command * 16) as IngrainRoot["sourceCell"],
    hFlip: animation === 1 || animation === 3,
  };
}

function rootAtAge(
  index: 0 | 1 | 2 | 3,
  age: number,
  attackerCenter: Readonly<IngrainPoint>,
): IngrainRoot | null {
  const root = ROOTS[index];
  const localAge = age - root.creationAge;
  const counter = localAge + 2;
  if (localAge < 0 || counter > root.duration) return null;
  const overflow = attackerCenter.y + root.y2 > 120
    ? attackerCenter.y + root.y2 - 120
    : 0;
  return {
    index,
    creationAge: root.creationAge,
    duration: root.duration,
    counter,
    x: attackerCenter.x,
    y: attackerCenter.y + overflow,
    x2: root.x2,
    y2: root.y2,
    subpriority: root.subpriority,
    oamPriority: 2,
    animation: root.animation,
    ...rootAnimationAtAge(root.animation, localAge),
    invisible: counter > root.duration - 10 && counter % 2 === 1,
  };
}

function orbAnimationAtAge(
  localAge: number,
): Pick<IngrainOrb, "animationCommand" | "animationDelay" | "sourceCell"> {
  if (localAge === 0) return { animationCommand: 0, animationDelay: 1, sourceCell: 3 };
  if (localAge === 1) return { animationCommand: 0, animationDelay: 0, sourceCell: 3 };
  const phase = (localAge - 2) % 8;
  if (phase < 5) return { animationCommand: 1, animationDelay: 4 - phase, sourceCell: 0 };
  return { animationCommand: 0, animationDelay: 7 - phase, sourceCell: 3 };
}

function orbAtAge(
  index: 0 | 1 | 2,
  age: number,
  attackerCenter: Readonly<IngrainPoint>,
  profile: Readonly<IngrainProfile>,
): IngrainOrb | null {
  const orb = ORBS[index];
  const localAge = age - orb.creationAge;
  const phase = localAge + 2;
  if (localAge < 0 || phase > orb.duration) return null;
  return {
    index,
    creationAge: orb.creationAge,
    duration: orb.duration,
    phase,
    x: attackerCenter.x + orb.x,
    y: attackerCenter.y + orb.y,
    x2: orb.velocityX * phase,
    y2: (orb.waveAmplitude * GBA_SINE_TABLE_256[(phase * 20) & 0xff]!) >> 8,
    velocityX: orb.velocityX,
    waveAmplitude: orb.waveAmplitude,
    subpriority: profile.attackerSubpriority - 3,
    oamPriority: 2,
    ...orbAnimationAtAge(localAge),
    invisible: false,
  };
}

/** Literal script and callback state at one Move_INGRAIN source age. */
export function ingrainAtAge(
  age: number,
  attackerCenter: Readonly<IngrainPoint>,
  profile: Readonly<IngrainProfile>,
): IngrainState {
  const roots = ROOTS.map((_, index) => rootAtAge(
    index as 0 | 1 | 2 | 3,
    age,
    attackerCenter,
  )).filter((root): root is IngrainRoot => root !== null);
  const orbs = ORBS.map((_, index) => orbAtAge(
    index as 0 | 1 | 2,
    age,
    attackerCenter,
    profile,
  )).filter((orb): orb is IngrainOrb => orb !== null);
  return {
    age,
    active: age >= 0 && age <= 162,
    sourceOffset: sourceOffsetAtAge(age),
    rootsLoaded: age >= 1 && age <= 162,
    orbsLoaded: age >= 4 && age <= 162,
    roots,
    orbs,
    visualSpriteCount: roots.length + orbs.length,
    sounds: SOUND_EVENTS.filter((event) => event.age === age),
  };
}
