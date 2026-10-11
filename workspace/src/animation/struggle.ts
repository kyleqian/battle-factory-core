import { decodeGbaHardwareOam, type GbaHardwareOamObject } from "./gbaObjCompositor.ts";
import { shakeMonInPlaceSequence } from "./shakeMonInPlace.ts";

/**
 * MOVE_STRUGGLE (165) source program (data/battle_anim_scripts.s:3045-3062; docs/stg107-struggle.md s1). Ages are rows after the
 * activation (gAnimScriptActive rising edge); sprite / task state at age a is shown one row later (the VBlank OAM copy), registers
 * on row a (the Return / Pursuit lag model).
 *
 *   loadspritegfx ANIM_TAG_IMPACT / ANIM_TAG_MOVEMENT_WAVES  OBJ palettes 7 / 8 (known-entry allocator), one frame each
 *   monbg ANIM_TARGET                                        target OBJ hidden + Task_UpdateMonBg from STRUGGLE_MONBG
 *   setalpha 12, 8                                           BLDCNT 0x3f40 / BLDALPHA 0x080c from STRUGGLE_BLEND
 *   AnimTask_ShakeMonInPlace (ATTACKER, 3, 0, 12, 4)         created at STRUGGLE_WAVES; the creating frame runs the task twice
 *   2 x gMovementWavesSpriteTemplate (0, 0, 2) / (0, 1, 2)   CreateSpriteAndAnimate at STRUGGLE_WAVES (two anim steps on that row)
 *   waitforvisualfinish                                      the waves end last (AnimMovementWaves_Step: 2 cycles)
 *   basic hitsplat (subpriority - 3, x 0, y 0, TARGET, anim 2) + AnimTask_ShakeMonInPlace (TARGET, 3, 0, 6, 1) at STRUGGLE_SPLAT
 *   waitforvisualfinish; clearmonbg ANIM_TARGET; blendoff     STRUGGLE_CLEAR_MONBG; first inactive age STRUGGLE_FIRST_INACTIVE
 * No Random / Random2 anywhere in the body.
 */
export const STRUGGLE_MONBG = 7;
export const STRUGGLE_BLEND = 10;
export const STRUGGLE_WAVES = 10;
/** One wave cycle = 4 frames x 8 ticks + the ANIMCMD_END row; the first cycle is one row shorter (CreateSpriteAndAnimate). */
const WAVE_CYCLE = 33;
export const STRUGGLE_WAVES_DESTROYED = STRUGGLE_WAVES + 2 * WAVE_CYCLE - 1;
export const STRUGGLE_SPLAT = STRUGGLE_WAVES_DESTROYED + 1;
/** gBasicHitSplatSpriteTemplate affine anim 2: 10 rows (Return's proven anim-2 life), matrix 372. */
export const STRUGGLE_SPLAT_LIFE = 10;
const ATTACKER_SHAKE = shakeMonInPlaceSequence(3, 0, 12, 4);
const TARGET_SHAKE = shakeMonInPlaceSequence(3, 0, 6, 1);
/** waitforvisualfinish after the last splat / target-shake row, then clearmonbg. */
export const STRUGGLE_CLEAR_MONBG = STRUGGLE_SPLAT + Math.max(STRUGGLE_SPLAT_LIFE, TARGET_SHAKE.length - 1) + 1;
/** gAnimScriptActive drops at this age (clearmonbg's Task_ClearMonBg + blendoff + the script's end, as Return weak's 83 -> 87). */
export const STRUGGLE_FIRST_INACTIVE = 111;
export const STRUGGLE_ROWS = STRUGGLE_FIRST_INACTIVE + 1;

/** AnimTask_ShakeMonInPlace created at `created`: its synchronous first step and RunTasks both run on the creating row. */
const shakeAt = (sequence: readonly { x2: number }[], created: number, state: number): number =>
  state < created ? 0 : sequence[Math.min(state - created + 1, sequence.length - 1)]!.x2;
export const struggleAttackerX2 = (state: number): number => shakeAt(ATTACKER_SHAKE, STRUGGLE_WAVES, state);
/** The attacker x2 BuildOamBuffer sees at a state: the OAM is built after AnimateSprites but before RunTasks, so it carries the
 * previous row's task steps plus the creating script command's synchronous first step (sequence[state - created]). */
export const struggleAttackerOamX2 = (state: number): number =>
  state < STRUGGLE_WAVES ? 0 : ATTACKER_SHAKE[Math.min(state - STRUGGLE_WAVES, ATTACKER_SHAKE.length - 1)]!.x2;
export const struggleTargetX2 = (state: number): number => shakeAt(TARGET_SHAKE, STRUGGLE_SPLAT, state);

/** gMovementWavesAnimCmds1 / gMovementWavesAnimCmds2 (battle_anim_effects_2.c:1134-1150): tile offsets, hFlip. */
export const STRUGGLE_WAVE_ANIMS = [
  [{ tileOffset: 0, hFlip: false }, { tileOffset: 16, hFlip: false }, { tileOffset: 32, hFlip: false }, { tileOffset: 16, hFlip: false }],
  [{ tileOffset: 16, hFlip: true }, { tileOffset: 32, hFlip: true }, { tileOffset: 16, hFlip: true }, { tileOffset: 0, hFlip: true }],
] as const;
/** The wave's anim frame (0..3) at a state, null before creation / after DestroyAnimSprite. */
export function struggleWaveFrame(state: number): number | null {
  const c = STRUGGLE_WAVES;
  if (state < c) return null;
  if (state < c + WAVE_CYCLE - 1) return state < c + 7 ? 0 : Math.min(3, 1 + Math.floor((state - c - 7) / 8));
  const second = c + WAVE_CYCLE - 1;
  if (state < second + WAVE_CYCLE) return Math.min(3, Math.floor((state - second) / 8));
  return null;
}

type Matrix = readonly [number, number, number, number];
export interface StruggleLiveInputs {
  readonly attackerArt: Readonly<{ displaySpecies: string; attr: readonly [number, number, number] }>;
  readonly targetArt: Readonly<{ displaySpecies: string; attr: readonly [number, number, number] }>;
  readonly buffers: Readonly<{ hardwareOam: readonly string[]; hardwareMatrices: readonly Matrix[] }>;
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly monbgLayer: "bg1" | "bg2";
  /** Known-entry allocator: ANIM_TAG_IMPACT / ANIM_TAG_MOVEMENT_WAVES tile ranges and OBJ palette banks. */
  readonly impactTiles: readonly [number, number];
  readonly wavesTiles: readonly [number, number];
  readonly impactBank: number;
  readonly wavesBank: number;
}
export interface StruggleDisplayPlan {
  readonly attacker: GbaHardwareOamObject<Matrix>;
  readonly target: GbaHardwareOamObject<Matrix> | null;
  readonly waves: readonly (GbaHardwareOamObject<Matrix> & { readonly frame: number; readonly hFlip: boolean })[];
  readonly impacts: readonly GbaHardwareOamObject<Matrix>[];
  readonly targetOnBg: boolean;
  readonly targetBgScroll: Readonly<{ x: number; y: number }>;
  readonly hardwarePalette: readonly number[];
}
const signed9 = (value: number): number => { const v = value & 0x1ff; return v >= 0x100 ? v - 0x200 : v; };

/** Hardware-buffer scanout of one Struggle row (Return's display-plan rules: monbg active ages 7 .. clear + 2, on the BG from 8). */
export function struggleDisplayPlan(age: number, input: Readonly<StruggleLiveInputs>): StruggleDisplayPlan {
  const objects = decodeGbaHardwareOam(input.buffers.hardwareOam, input.buffers.hardwareMatrices, [256, 0, 0, 256] as Matrix);
  const visible = (entry: GbaHardwareOamObject<Matrix>): boolean => (entry.attr[0] & 0x0200) === 0;
  const battler = (attr2: number) => objects.find((e) => e.attr[2] === attr2 && (e.attr[0] & 0x0c00) === 0 && visible(e)) ?? null;
  const attacker = battler(input.attackerArt.attr[2]);
  if (!attacker) throw new Error("missing displayed Struggle attacker OAM");
  const inRange = (e: GbaHardwareOamObject<Matrix>, [base, count]: readonly [number, number], bank: number) =>
    visible(e) && (e.attr[2] & 0x3ff) >= base && (e.attr[2] & 0x3ff) < base + count && 16 + (e.attr[2] >>> 12 & 0xf) === bank;
  const monbgActive = age >= STRUGGLE_MONBG && age <= STRUGGLE_CLEAR_MONBG + 2;
  const hofs = input.monbgLayer === "bg1" ? "bg1hofs" : "bg2hofs", vofs = input.monbgLayer === "bg1" ? "bg1vofs" : "bg2vofs";
  return {
    attacker,
    target: battler(input.targetArt.attr[2]),
    waves: objects.filter((e) => inRange(e, input.wavesTiles, input.wavesBank)).map((e) => ({ ...e,
      frame: ((e.attr[2] & 0x3ff) - input.wavesTiles[0]) >> 4, hFlip: (e.attr[1] & 0x1000) !== 0 })),
    impacts: objects.filter((e) => inRange(e, input.impactTiles, input.impactBank) && (e.attr[0] & 0x0500) === 0x0500),
    targetOnBg: monbgActive && age >= STRUGGLE_MONBG + 1,
    targetBgScroll: { x: signed9(input.registers[hofs] ?? 0), y: signed9(input.registers[vofs] ?? 0) },
    hardwarePalette: input.hardwarePalette,
  };
}
