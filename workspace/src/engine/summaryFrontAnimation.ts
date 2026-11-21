/**
 * Source-driven summary front-sprite animation presentation.
 *
 * pokemon_summary_screen.c's SpriteCB_Pokemon sets sprite->data[1] (sDontFlip) to IsMonSpriteNotFlipped and calls
 * PokemonSummaryDoMonAnimation (pokemon.c), which starts the two-frame picture program at once (StartSpriteAnim(sprite, 1)) and the
 * species' motion either at once (StartMonSummaryAnimation: sIsSummaryAnim TRUE) or after a Task_PokemonSummaryAnimateAfterDelay
 * countdown. Every motion callback of pokemon_animation.c that a Battle Frontier species uses is transcribed below as a per-call
 * state machine over the sprite fields it touches (x2 / y2, data[0..7], the affine matrix, invisible, the palette blend, the shared
 * sAnims slot), with the summary's own flip rules: TryFlipX, HandleSetAffineData's xScale / rotation negation and
 * HandleStartAffineAnim's flipped affine anim when sDontFlip is FALSE.
 *
 * The clock is local to the currently installed mon sprite: `elapsed` = monAnimClock - start is 0 on the picture that first shows the
 * dispatch frame's state (sfa2's ROM receipts: the picture of frame f shows the sprite state of frame f - 1). The frame program's
 * command boundaries are visible one picture after the AnimateSprites that runs them. Motion call k runs in the AnimateSprites of
 * dispatch + 1 + k with no delay (the callback set inside SpriteCB_Pokemon first runs on the next frame) and of dispatch + delay + k
 * with one (the delay task's last tick runs in RunTasks, before that frame's AnimateSprites), so its state is visible at elapsed
 * k + 2 or delay + k + 1 (docs/sfa2-summary-front-animations.md).
 */

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import summaryFrontAnimationData from "../data/gen/summary-front-animation.json" with { type: "json" };

export interface SummaryFrontSpritePresentation {
  /** Extracted source motion type. */
  readonly sourceAnimationType: string;
  /**
   * "source" runs the transcribed callback; every Battle Frontier species has one (sfa2). "approximate-static" remains only for a
   * species outside the extracted data (the sprite holds still, never a throw).
   */
  readonly motionClaim: "source" | "approximate-static";
  readonly frame: 0 | 1;
  readonly x2: number;
  readonly y2: number;
  /**
   * The OAM matrix (pa, pb, pc, pd) while the sprite is in double-size affine mode (HandleStartAffineAnim until
   * ResetSpriteAfterAnim), flip included; null when the sprite draws as an ordinary (hFlip) OBJ.
   */
  readonly matrix: readonly [number, number, number, number] | null;
  /** sprite->invisible (Anim_FlickerIncreasing). */
  readonly invisible: boolean;
  /** The last BlendPalette over the sprite's 16 colours (coefficient 0..16 toward a BGR555 colour); null = none since dispatch. */
  readonly blend: { readonly coefficient: number; readonly color: number } | null;
  readonly animationStarted: boolean;
  readonly motionFinished: boolean;
}

interface SourceAnimation {
  readonly species: string;
  readonly delay: number;
  readonly motion: {
    readonly type: string;
    readonly callback: string;
  };
  readonly spriteFrameProgram: ReadonlyArray<{
    readonly frame: number;
    readonly duration: number;
  }> | null;
  /** species_info.h .noFlip: IsMonSpriteNotFlipped, the summary's sDontFlip. */
  readonly noFlip?: boolean;
}

const sourceAnimations = new Map(
  (summaryFrontAnimationData.species as SourceAnimation[]).map((entry) => [
    entry.species.replace("SPECIES_", ""),
    entry,
  ]),
);

export const SUMMARY_INITIAL_MON_ANIMATION_START = 5;
export const SUMMARY_REPLACEMENT_MON_ANIMATION_START = 0;

export function summaryFrontAnimationForSpecies(species: string): SourceAnimation {
  const animation = sourceAnimations.get(species);
  if (!animation) throw new Error(`missing summary front animation for ${species}`);
  return animation;
}

/** IsMonSpriteNotFlipped: noFlip species keep hFlip FALSE and sDontFlip TRUE. */
export function summaryFrontSpriteIsFlipped(species: string): boolean {
  return sourceAnimations.get(species)?.noFlip !== true;
}

function frameAt(
  program: SourceAnimation["spriteFrameProgram"],
  elapsed: number,
): 0 | 1 {
  if (!program || elapsed < 0) return 0;
  let remaining = elapsed;
  for (const command of program) {
    if (remaining < command.duration) return command.frame === 1 ? 1 : 0;
    remaining -= command.duration;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// C arithmetic and the sprite / BIOS primitives pokemon_animation.c uses.

const s16 = (value: number): number => (value << 16) >> 16;
const u16 = (value: number): number => value & 0xffff;
const u8 = (value: number): number => value & 0xff;
const s8 = (value: number): number => (value << 24) >> 24;
/** C integer division (truncation toward zero). */
const div = (a: number, b: number): number => Math.trunc(a / b);

/** trig.c Sin / Cos read gSineTable (256 entries + 64 repeated) directly; an index outside the table is a transcription error. */
function Sin(index: number, amplitude: number): number {
  if (index < 0 || index >= 320) throw new Error(`summary front animation: Sin index ${index} is outside gSineTable`);
  return s16((s16(amplitude) * GBA_SINE_TABLE_256[index & 0xff]!) >> 8);
}
function Cos(index: number, amplitude: number): number {
  if (index < 0 || index + 64 >= 320) throw new Error(`summary front animation: Cos index ${index} is outside gSineTable`);
  return s16((s16(amplitude) * GBA_SINE_TABLE_256[(index + 64) & 0xff]!) >> 8);
}

type Matrix = readonly [number, number, number, number];

/**
 * The oracle's HLE BIOS ObjAffineSet (mGBA): theta = (rotation >> 8) / 128 * pi, pa = cos * sx, pb = -sin * sx, pc = sin * sy,
 * pd = cos * sy with sx = xScale / 256, each halfword truncated (sendOutDispatcher.ts frontSendOutAffineAtTick, psychUp.ts).
 */
function objAffineSet(xScale: number, yScale: number, rotation: number): Matrix {
  const theta = ((u16(rotation) >> 8) / 128) * Math.PI;
  const sx = s16(xScale) / 256;
  const sy = s16(yScale) / 256;
  return [
    s16(Math.trunc(Math.cos(theta) * sx * 256)),
    s16(Math.trunc(-Math.sin(theta) * sx * 256)),
    s16(Math.trunc(Math.sin(theta) * sy * 256)),
    s16(Math.trunc(Math.cos(theta) * sy * 256)),
  ];
}

/** struct PokemonAnimData (sAnims[]): delay is u16, the rest s16. */
interface AnimData {
  delay: number;
  speed: number;
  runs: number;
  rotation: number;
  data: number;
}

interface SimSprite {
  x2: number;
  y2: number;
  /** sprite->data[0..7], s16. data[1] is sDontFlip in the summary. */
  readonly data: number[];
  readonly dontFlip: boolean;
  /** oam.affineMode is ST_OAM_AFFINE_DOUBLE (HandleStartAffineAnim) until ResetSpriteAfterAnim turns it off. */
  affineOn: boolean;
  /** The sprite's gOamMatrices entry. */
  matrix: Matrix;
  /** StartSpriteAffineAnim armed affineAnimBeginning this call: AnimateSprite's BeginAffineAnim, after the callback, writes anim 0 / 1. */
  beginAffine: boolean;
  /** centerToCornerVecX: -32 for the 64x64 OBJ, -64 in double-size mode (CalcCenterToCornerVec). */
  centerToCornerVecX: number;
  invisible: boolean;
  blend: { coefficient: number; color: number } | null;
  callback: SimCallback;
  /** sAnims[MAX_BATTLERS_COUNT] and sAnimIdx. */
  readonly anims: AnimData[];
  animIdx: number;
}

type SimCallback = (sprite: SimSprite) => void;

const waitAnimEnd: SimCallback = () => {};

function addNewAnim(sprite: SimSprite): number {
  sprite.animIdx = (sprite.animIdx + 1) % 4;
  sprite.anims[sprite.animIdx] = { delay: 0, speed: 0, runs: 1, rotation: 0, data: 0 };
  return sprite.animIdx;
}

function anim(sprite: SimSprite, id: number): AnimData {
  const slot = sprite.anims[id];
  if (!slot) throw new Error(`summary front animation: sAnims[${id}] read out of range`);
  return slot;
}

function handleStartAffineAnim(sprite: SimSprite): void {
  sprite.affineOn = true;
  sprite.centerToCornerVecX = -64;
  sprite.beginAffine = true;
}

function setAffineData(sprite: SimSprite, xScale: number, yScale: number, rotation: number): void {
  sprite.matrix = objAffineSet(s16(xScale), s16(yScale), u16(rotation));
}

function handleSetAffineData(sprite: SimSprite, xScale: number, yScale: number, rotation: number): void {
  let x = s16(xScale);
  let r = u16(rotation);
  if (!sprite.dontFlip) {
    x = s16(-x);
    r = u16(-r);
  }
  setAffineData(sprite, x, yScale, r);
}

function tryFlipX(sprite: SimSprite): void {
  if (!sprite.dontFlip) sprite.x2 = s16(-sprite.x2);
}

/** Summary branch: affine off, hFlip = !sDontFlip (unchanged), the matrix freed. */
function resetSpriteAfterAnim(sprite: SimSprite): void {
  sprite.affineOn = false;
  sprite.centerToCornerVecX = -32;
}

function blendPalette(sprite: SimSprite, coefficient: number, color: number): void {
  sprite.blend = { coefficient: u8(coefficient), color };
}

const RGB_BLACK = 0x0000;
const RGB_BLUE = 0x7c00;
const RGB_YELLOW = 0x03ff;
const RGB_ORANGE = 31 | (22 << 5); // RGB(31, 22, 0)

// ---------------------------------------------------------------------------
// pokemon_animation.c, in source order. Each Anim_* entry is the callback StartMonSummaryAnimation installs.

function Anim_CircularStretchTwice(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 40) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const v = s16(div(d[2]! * 512, 40) % 256);
    d[4] = s16(Sin(v, 32) + 256);
    d[5] = s16(Cos(v, 32) + 256);
    handleSetAffineData(sprite, d[4]!, d[5]!, 0);
  }
  d[2] = s16(d[2]! + 1);
}

function Anim_HorizontalVibrate(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2]! > 40) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
  } else {
    const sign = (d[2]! & 1) === 0 ? 1 : -1;
    sprite.x2 = s16(Sin(div(d[2]! * 128, 40) % 256, 6) * sign);
  }
  d[2] = s16(d[2]! + 1);
}

function HorizontalSlide(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2]! > d[0]!) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
  } else {
    sprite.x2 = Sin(div(d[2]! * 384, d[0]!) % 256, 6);
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

function Anim_HorizontalSlide(sprite: SimSprite): void {
  sprite.data[0] = 40;
  HorizontalSlide(sprite);
  sprite.callback = HorizontalSlide;
}

function VerticalSlide(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2]! > d[0]!) {
    sprite.callback = waitAnimEnd;
    sprite.y2 = 0;
  } else {
    sprite.y2 = s16(-Sin(div(d[2]! * 384, d[0]!) % 256, 6));
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

function Anim_VerticalSlide(sprite: SimSprite): void {
  sprite.data[0] = 40;
  VerticalSlide(sprite);
  sprite.callback = VerticalSlide;
}

function VerticalJumps(sprite: SimSprite): void {
  const d = sprite.data;
  let counter = d[2]!;
  if (counter > 384) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    switch (s16(div(counter, 128))) {
      case 0:
      case 1:
        sprite.y2 = s16(-Sin(counter % 128, d[0]! * 2));
        break;
      case 2:
      case 3:
        counter -= 256;
        sprite.y2 = s16(-Sin(counter, d[0]! * 3));
        break;
    }
  }
  d[2] = s16(d[2]! + 12);
}

function Anim_VerticalJumps_Big(sprite: SimSprite): void {
  sprite.data[0] = 4;
  VerticalJumps(sprite);
  sprite.callback = VerticalJumps;
}

function Anim_VerticalJumpsHorizontalJumps(sprite: SimSprite): void {
  const d = sprite.data;
  let counter = d[2]!;
  if (counter > 768) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    switch (s16(div(counter, 128))) {
      case 0:
      case 1:
        sprite.x2 = 0;
        break;
      case 2:
        counter = 0;
        break;
      case 3:
        sprite.x2 = s16(div(-((counter % 128) * 8), 128));
        break;
      case 4:
        sprite.x2 = s16(div(counter % 128, 8) - 8);
        break;
      case 5:
        sprite.x2 = s16(div(-((counter % 128) * 8), 128) + 8);
        break;
    }
    sprite.y2 = s16(-Sin(counter % 128, 8));
  }
  d[2] = s16(d[2]! + 12);
}

function Anim_GrowVibrate(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 40) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16(div(d[2]! * 256, 40) % 256);
    if (d[2]! % 2 === 0) {
      d[4] = s16(Sin(index, 32) + 256);
      d[5] = s16(Sin(index, 32) + 256);
    } else {
      d[4] = s16(Sin(index, 8) + 256);
      d[5] = s16(Sin(index, 8) + 256);
    }
    handleSetAffineData(sprite, d[4]!, d[5]!, 0);
  }
  d[2] = s16(d[2]! + 1);
}

/** sZigzagData: x delta, y delta, time. */
const ZIGZAG_DATA: readonly (readonly [number, number, number])[] = [
  [-1, -1, 6], [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-2, -2, 6], [2, 0, 6], [-2, 2, 6], [2, 0, 6], [-1, -1, 6], [0, 0, 0],
];

function Zigzag(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) d[3] = 0;
  if (ZIGZAG_DATA[d[3]!]![2] === d[2]) {
    if (ZIGZAG_DATA[d[3]!]![2] === 0) {
      sprite.callback = waitAnimEnd;
    } else {
      d[3] = s16(d[3]! + 1);
      d[2] = 0;
    }
  }
  if (ZIGZAG_DATA[d[3]!]![2] === 0) {
    sprite.callback = waitAnimEnd;
  } else {
    sprite.x2 = s16(sprite.x2 + ZIGZAG_DATA[d[3]!]![0]);
    sprite.y2 = s16(sprite.y2 + ZIGZAG_DATA[d[3]!]![1]);
    d[2] = s16(d[2]! + 1);
    tryFlipX(sprite);
  }
}

function Anim_ZigzagFast(sprite: SimSprite): void {
  Zigzag(sprite);
  sprite.callback = Zigzag;
}

function HorizontalShake(sprite: SimSprite): void {
  const d = sprite.data;
  const counter = d[2]!;
  if (counter > 2304) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
  } else {
    sprite.x2 = Sin(counter % 256, d[7]!);
  }
  d[2] = s16(d[2]! + d[0]!);
}

function Anim_HorizontalShake(sprite: SimSprite): void {
  sprite.data[0] = 60;
  sprite.data[7] = 3;
  HorizontalShake(sprite);
  sprite.callback = HorizontalShake;
}

function VerticalShake(sprite: SimSprite): void {
  const d = sprite.data;
  const counter = d[2]!;
  if (counter > 2304) {
    sprite.callback = waitAnimEnd;
    sprite.y2 = 0;
  } else {
    sprite.y2 = Sin(counter % 256, 3);
  }
  d[2] = s16(d[2]! + d[0]!);
}

function Anim_VerticalShake(sprite: SimSprite): void {
  sprite.data[0] = 60;
  VerticalShake(sprite);
  sprite.callback = VerticalShake;
}

function Anim_CircularVibrate(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2]! > 512) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    const sign = (d[2]! & 1) === 0 ? 1 : -1;
    const amplitude = Sin(div(d[2]!, 4), 8);
    const index = d[2]! % 256;
    sprite.y2 = s16(Sin(index, amplitude) * sign);
    sprite.x2 = s16(Cos(index, amplitude) * sign);
  }
  d[2] = s16(d[2]! + 9);
}

function Twist(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  if (a.delay !== 0) {
    a.delay = u16(a.delay - 1);
  } else {
    if (d[2] === 0 && a.data === 0) {
      handleStartAffineAnim(sprite);
      a.data = s16(a.data + 1);
    }
    if (d[2]! > a.rotation) {
      handleSetAffineData(sprite, 256, 256, 0);
      if (a.runs > 1) {
        a.runs = s16(a.runs - 1);
        a.delay = 10;
        d[2] = 0;
      } else {
        resetSpriteAfterAnim(sprite);
        sprite.callback = waitAnimEnd;
      }
    } else {
      d[6] = Sin(d[2]! % 256, 4096);
      handleSetAffineData(sprite, 256, 256, d[6]!);
    }
    d[2] = s16(d[2]! + 16);
  }
}

function Anim_Twist(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 512;
  anim(sprite, id).delay = 0;
  Twist(sprite);
  sprite.callback = Twist;
}

function Spin(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, u8(d[0]!));
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > a.delay) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    d[6] = s16(div(65536, a.data) * d[2]!);
    handleSetAffineData(sprite, 256, 256, d[6]!);
  }
  d[2] = s16(d[2]! + 1);
}

function CircleCounterclockwise(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, u8(d[0]!));
  tryFlipX(sprite);
  if (d[2]! > a.rotation) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16((d[2]! + 192) % 256);
    sprite.x2 = s16(-Cos(index, a.data * 2));
    sprite.y2 = s16(Sin(index, a.data) + a.data);
  }
  d[2] = s16(d[2]! + a.speed);
  tryFlipX(sprite);
}

/** The GlowColor macro: BlendPalette toward `color` by Sin(data[2], colorIncrement), data[2] += speed, until data[2] > 128. */
function glowColor(sprite: SimSprite, color: number, colorIncrement: number, speed: number): void {
  const d = sprite.data;
  if (d[2] === 0) d[7] = 0x100; // OBJ_PLTT_ID(sprite->oam.paletteNum); only the blend's colours are presented
  if (d[2]! > 128) {
    blendPalette(sprite, 0, color);
    sprite.callback = waitAnimEnd;
  } else {
    d[6] = Sin(d[2]!, colorIncrement);
    blendPalette(sprite, d[6]!, color);
  }
  d[2] = s16(d[2]! + speed);
}

function Anim_GlowBlack(sprite: SimSprite): void {
  glowColor(sprite, RGB_BLACK, 16, 1);
}

function Anim_HorizontalStretch(sprite: SimSprite): void {
  const d = sprite.data;
  let index1 = 0;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 40) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index2 = s16(div(d[2]! * 128, 40));
    if (d[2]! >= 10 && d[2]! <= 29) {
      d[7] = s16(d[7]! + 51);
      index1 = 0xff & d[7]!;
    }
    if (!sprite.dontFlip) d[4] = s16(Sin(index2, 40) - 256 + Sin(index1, 16));
    else d[4] = s16(256 - Sin(index2, 40) - Sin(index1, 16));
    d[5] = s16(Sin(index2, 16) + 256);
    setAffineData(sprite, d[4]!, d[5]!, 0);
  }
  d[2] = s16(d[2]! + 1);
}

function Anim_VerticalStretch(sprite: SimSprite): void {
  const d = sprite.data;
  let posY = 0;
  let index1 = 0;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 40) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
    sprite.y2 = posY;
  } else {
    const index2 = s16(div(d[2]! * 128, 40));
    if (d[2]! >= 10 && d[2]! <= 29) {
      d[7] = s16(d[7]! + 51);
      index1 = 0xff & d[7]!;
    }
    if (!sprite.dontFlip) d[4] = s16(-Sin(index2, 16) - 256);
    else d[4] = s16(Sin(index2, 16) + 256);
    d[5] = s16(256 - Sin(index2, 40) - Sin(index1, 8));
    if (d[5] !== 256) posY = s16(div(256 - d[5]!, 8));
    sprite.y2 = s16(-posY);
    setAffineData(sprite, d[4]!, d[5]!, 0);
  }
  d[2] = s16(d[2]! + 1);
}

/** sVerticalShakeData: amplitude, duration (u8; -2 = pause, -1 = end). */
const VERTICAL_SHAKE_DATA: readonly (readonly [number, number])[] = [[6, 30], [u8(-2), 15], [6, 30], [u8(-1), 0]];

function VerticalShakeTwice(sprite: SimSprite): void {
  const d = sprite.data;
  const index = u8(d[2]!);
  const var7 = u8(d[6]!);
  const var5 = VERTICAL_SHAKE_DATA[d[5]!]![0];
  const var6 = VERTICAL_SHAKE_DATA[d[5]!]![1];
  let amplitude = 0;
  if (var5 !== u8(-2)) amplitude = var6 === 0 ? 0 : u8(div((var6 - var7) * var5, var6));
  else amplitude = 0;
  if (var5 === u8(-1)) {
    sprite.callback = waitAnimEnd;
    sprite.y2 = 0;
  } else {
    sprite.y2 = Sin(index, amplitude);
    if (var7 === var6) {
      d[5] = s16(d[5]! + 1);
      d[6] = 0;
    } else {
      d[2] = s16(d[2]! + d[0]!);
      d[6] = s16(d[6]! + 1);
    }
  }
}

function Anim_VerticalShakeTwice(sprite: SimSprite): void {
  sprite.data[0] = 48;
  VerticalShakeTwice(sprite);
  sprite.callback = VerticalShakeTwice;
}

function Anim_TipMoveForward(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  const counter = u8(d[2]!);
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 35) {
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
  } else {
    const index = s16(div((counter - 10) * 128, 20));
    if (counter < 10) handleSetAffineData(sprite, 256, 256, div(counter, 2) * 512);
    else if (counter >= 10 && counter <= 29) sprite.x2 = s16(-Sin(index, 5));
    else handleSetAffineData(sprite, 256, 256, div(35 - counter, 2) * 1024);
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

function Anim_HorizontalPivot(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 100) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16(div(d[2]! * 256, 100));
    sprite.y2 = Sin(index, 10);
    handleSetAffineData(sprite, 256, 256, Sin(index, 3276));
  }
  d[2] = s16(d[2]! + 1);
}

function VerticalSlideWobble(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 100) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16(div(d[2]! * 256, 100));
    const v = div(d[2]! * 512, 100) & 0xff;
    sprite.y2 = Sin(index, d[0]!);
    handleSetAffineData(sprite, 256, 256, Sin(v, 3276));
  }
  d[2] = s16(d[2]! + 1);
}

function Anim_VerticalSlideWobble(sprite: SimSprite): void {
  sprite.data[0] = 10;
  VerticalSlideWobble(sprite);
  sprite.callback = VerticalSlideWobble;
}

function RisingWobble(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 100) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16(div(d[2]! * 256, 100));
    const v = div(d[2]! * 512, 100) & 0xff;
    sprite.y2 = s16(-Sin(div(index, 2), d[0]! * 2));
    handleSetAffineData(sprite, 256, 256, Sin(v, 3276));
  }
  d[2] = s16(d[2]! + 1);
}

function Anim_RisingWobble(sprite: SimSprite): void {
  sprite.data[0] = 5;
  RisingWobble(sprite);
  sprite.callback = RisingWobble;
}

function Anim_HorizontalSlideWobble(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) handleStartAffineAnim(sprite);
  if (d[2]! > 100) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.x2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const index = s16(div(d[2]! * 256, 100));
    const v = div(d[2]! * 512, 100) & 0xff;
    sprite.x2 = Sin(index, 8);
    handleSetAffineData(sprite, 256, 256, Sin(v, 3276));
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

function VerticalSquishBounce(sprite: SimSprite): void {
  const d = sprite.data;
  let posY = 0;
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[3] = 0;
  }
  tryFlipX(sprite);
  if (d[2]! > d[0]! * 3) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const yScale = s16(Sin(d[4]!, 32) + 256);
    if (d[2]! > d[0]! && d[2]! < d[0]! * 2) d[3] = s16(d[3]! + div(128, d[0]!));
    if (yScale > 256) posY = s16(div(256 - yScale, 8));
    sprite.y2 = s16(-Sin(d[3]!, 10) - posY);
    handleSetAffineData(sprite, 256 - Sin(d[4]!, 32), yScale, 0);
    d[2] = s16(d[2]! + 1);
    d[4] = (d[4]! + div(128, d[0]!)) & 0xff;
  }
  tryFlipX(sprite);
}

function Anim_VerticalSquishBounce(sprite: SimSprite): void {
  sprite.data[0] = 16;
  VerticalSquishBounce(sprite);
  sprite.callback = VerticalSquishBounce;
}

function ShrinkGrow(sprite: SimSprite): void {
  const d = sprite.data;
  let posY = 0;
  if (d[2]! > div(128, d[6]!) * d[7]!) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    const yScale = s16(Sin(d[4]!, 32) + 256);
    if (yScale > 256) posY = s16(div(256 - yScale, 8));
    sprite.y2 = s16(-posY);
    handleSetAffineData(sprite, Sin(d[4]!, 48) + 256, yScale, 0);
    d[2] = s16(d[2]! + 1);
    d[4] = (d[4]! + d[6]!) & 0xff;
  }
}

function Anim_ShrinkGrow(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[7] = 3;
    d[6] = 8;
  }
  ShrinkGrow(sprite);
}

/** sBounceRotateToSidesData[2][8]: x start, x end, time. */
const BOUNCE_ROTATE_TO_SIDES_DATA: readonly (readonly (readonly [number, number, number])[])[] = [
  [[0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12], [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0]],
  [[0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24], [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0]],
];

function BounceRotateToSides(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  const structId = u8(d[0]!);
  const a = anim(sprite, structId);
  const v = a.rotation;
  const row = BOUNCE_ROTATE_TO_SIDES_DATA[a.data]![d[4]!]!;
  const r9 = s8(row[0]);
  const r10 = s16(row[1] - r9);
  const r7 = d[3]!;
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[2] = s16(d[2]! + 1);
  }
  if (row[2] === 0) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.x2 = 0;
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  } else {
    sprite.y2 = s16(-Sin(div(r7 * 128, row[2]), 10));
    sprite.x2 = s16(div(r10 * r7, row[2]) + r9);
    const rotation = u16(div(-(v * sprite.x2), 8));
    handleSetAffineData(sprite, 256, 256, rotation);
    if (r7 === row[2]) {
      d[4] = s16(d[4]! + 1);
      d[3] = 0;
    } else {
      d[3] = s16(d[3]! + 1);
    }
  }
  tryFlipX(sprite);
}

function Anim_BounceRotateToSides(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 4096;
  anim(sprite, id).data = sprite.data[6]!;
  BounceRotateToSides(sprite);
  sprite.callback = BounceRotateToSides;
}

function Anim_GlowOrange(sprite: SimSprite): void {
  glowColor(sprite, RGB_ORANGE, 12, 2);
}

function Anim_GlowBlue(sprite: SimSprite): void {
  glowColor(sprite, RGB_BLUE, 12, 2);
}

function Anim_BackAndLunge(sprite: SimSprite): void {
  handleStartAffineAnim(sprite);
  sprite.callback = BackAndLunge_0;
}

function BackAndLunge_0(sprite: SimSprite): void {
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 + 1);
  if (sprite.x2 > 7) {
    sprite.x2 = 8;
    sprite.data[7] = 2;
    sprite.callback = BackAndLunge_1;
  }
  tryFlipX(sprite);
}

function BackAndLunge_1(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 - d[7]!);
  d[7] = s16(d[7]! + 1);
  if (sprite.x2 <= 0) {
    let v = u8(d[7]!);
    d[6] = 0;
    let subResult = sprite.x2;
    do {
      subResult = s16(subResult - v);
      d[6] = s16(d[6]! + 1);
      v = u8(v + 1);
    } while (subResult > -8);
    d[5] = 1;
    sprite.callback = BackAndLunge_2;
  }
  tryFlipX(sprite);
}

function BackAndLunge_2(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 - d[7]!);
  d[7] = s16(d[7]! + 1);
  const rotation = u8(div(d[5]! * 6, d[6]!));
  d[5] = s16(d[5]! + 1);
  if (d[5]! > d[6]!) d[5] = d[6]!;
  handleSetAffineData(sprite, 256, 256, rotation * 256);
  if (sprite.x2 < -8) {
    sprite.x2 = -8;
    d[4] = 2;
    d[3] = 0;
    d[2] = rotation;
    sprite.callback = BackAndLunge_3;
  }
  tryFlipX(sprite);
}

function BackAndLunge_3(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[3]! > 11) {
    d[2] = s16(d[2]! - 2);
    if (d[2]! < 0) d[2] = 0;
    handleSetAffineData(sprite, 256, 256, d[2]! << 8);
    if (d[2] === 0) sprite.callback = BackAndLunge_4;
  } else {
    sprite.x2 = s16(sprite.x2 + d[4]!);
    d[4] = s16(-d[4]!);
    d[3] = s16(d[3]! + 1);
  }
  tryFlipX(sprite);
}

function BackAndLunge_4(sprite: SimSprite): void {
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 + 2);
  if (sprite.x2 > 0) {
    sprite.x2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  }
  tryFlipX(sprite);
}

function Anim_FrontFlip(sprite: SimSprite): void {
  handleStartAffineAnim(sprite);
  sprite.callback = FrontFlip_0;
}

function FrontFlip_0(sprite: SimSprite): void {
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 + 1);
  sprite.y2 = s16(sprite.y2 - 1);
  if (sprite.x2 > 15) {
    sprite.data[2] = 0;
    sprite.callback = FrontFlip_1;
  }
  tryFlipX(sprite);
}

function FrontFlip_1(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  d[2] = s16(d[2]! + 16);
  if (sprite.x2 <= -16) {
    sprite.x2 = -16;
    sprite.y2 = 16;
    d[2] = 0;
    sprite.callback = FrontFlip_2;
  } else {
    sprite.x2 = s16(sprite.x2 - 2);
    sprite.y2 = s16(sprite.y2 + 2);
  }
  handleSetAffineData(sprite, 256, 256, d[2]! << 8);
  tryFlipX(sprite);
}

function FrontFlip_2(sprite: SimSprite): void {
  tryFlipX(sprite);
  sprite.x2 = s16(sprite.x2 + 1);
  sprite.y2 = s16(sprite.y2 - 1);
  if (sprite.x2 >= 0) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  }
  tryFlipX(sprite);
}

function TumblingFrontFlip(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  if (a.delay !== 0) {
    a.delay = u16(a.delay - 1);
  } else {
    tryFlipX(sprite);
    if (d[2] === 0) {
      d[2] = s16(d[2]! + 1);
      handleStartAffineAnim(sprite);
      d[7] = a.speed;
      d[3] = -1;
      d[4] = -1;
      d[5] = 0;
      d[6] = 0;
    }
    sprite.x2 = s16(sprite.x2 + d[7]! * 2 * d[3]!);
    sprite.y2 = s16(sprite.y2 + d[7]! * d[4]!);
    d[6] = s16(d[6]! + 8);
    if (sprite.x2 <= -16 || sprite.x2 >= 16) {
      sprite.x2 = s16(d[3]! * 16);
      d[3] = s16(-d[3]!);
      d[5] = s16(d[5]! + 1);
    } else if (sprite.y2 <= -16 || sprite.y2 >= 16) {
      sprite.y2 = s16(d[4]! * 16);
      d[4] = s16(-d[4]!);
      d[5] = s16(d[5]! + 1);
    }
    if (d[5]! > 5 && sprite.x2 <= 0) {
      sprite.x2 = 0;
      sprite.y2 = 0;
      if (a.runs > 1) {
        a.runs = s16(a.runs - 1);
        d[5] = 0;
        d[6] = 0;
        a.delay = 10;
      } else {
        resetSpriteAfterAnim(sprite);
        sprite.callback = waitAnimEnd;
      }
    }
    handleSetAffineData(sprite, 256, 256, d[6]! << 8);
    tryFlipX(sprite);
  }
}

function Anim_Figure8(sprite: SimSprite): void {
  handleStartAffineAnim(sprite);
  sprite.data[6] = 0;
  sprite.data[7] = 0;
  sprite.callback = Figure8;
}

function Figure8(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  d[6] = s16(d[6]! + 4);
  sprite.x2 = s16(-Sin(d[6]!, 16));
  sprite.y2 = s16(-Sin((d[6]! * 2) & 0xff, 8));
  if (d[6]! > 192 && d[7] === 1) {
    handleSetAffineData(sprite, 256, 256, 0);
    d[7] = s16(d[7]! + 1);
  } else if (d[6]! > 64 && d[7] === 0) {
    handleSetAffineData(sprite, -256, 256, 0);
    d[7] = s16(d[7]! + 1);
  }
  if (d[6]! > 255) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
  }
  tryFlipX(sprite);
}

/** sYellowFlashData: isYellow, time ((u8)-1 ends). */
const YELLOW_FLASH_DATA: readonly (readonly [boolean, number])[] = [
  [false, 5], [true, 1], [false, 15], [true, 4], [false, 2], [true, 2], [false, 2], [true, 2], [false, 2], [true, 2], [false, 2],
  [true, 2], [false, 2], [false, u8(-1)],
];

function Anim_FlashYellow(sprite: SimSprite): void {
  const d = sprite.data;
  d[2] = s16(d[2]! + 1);
  if (d[2] === 1) {
    d[7] = 0x100; // OBJ_PLTT_ID(sprite->oam.paletteNum)
    d[6] = 0;
    d[5] = 0;
    d[4] = 0;
  }
  const row = YELLOW_FLASH_DATA[d[6]!]!;
  if (row[1] === u8(-1)) {
    sprite.callback = waitAnimEnd;
  } else {
    if (d[4] === 1) {
      blendPalette(sprite, row[0] ? 16 : 0, RGB_YELLOW);
      d[4] = 0;
    }
    if (row[1] === d[5]) {
      d[4] = 1;
      d[5] = 0;
      d[6] = s16(d[6]! + 1);
    } else {
      d[5] = s16(d[5]! + 1);
    }
  }
}

function swing(sprite: SimSprite, convex: boolean): void {
  const d = sprite.data;
  if (d[2] === 0) handleStartAffineAnim(sprite);
  tryFlipX(sprite);
  const a = anim(sprite, d[0]!);
  if (d[2]! > a.data) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.x2 = 0;
    if (a.runs > 1) {
      a.runs = s16(a.runs - 1);
      d[2] = 0;
    } else {
      resetSpriteAfterAnim(sprite);
      sprite.callback = waitAnimEnd;
    }
  } else {
    const index = s16(div(d[2]! * 256, a.data));
    sprite.x2 = s16(-Sin(index, 10));
    handleSetAffineData(sprite, 256, 256, convex ? -Sin(index, 3276) : Sin(index, 3276));
  }
  d[2] = s16(d[2]! + 1);
  tryFlipX(sprite);
}

function SwingConcave(sprite: SimSprite): void {
  swing(sprite, false);
}

function SwingConvex(sprite: SimSprite): void {
  swing(sprite, true);
}

function Anim_SwingConcave_FastShort(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 50;
  SwingConcave(sprite);
  sprite.callback = SwingConcave;
}

function Anim_RotateUpSlamDown(sprite: SimSprite): void {
  handleStartAffineAnim(sprite);
  sprite.data[6] = s16(-div(14 * sprite.centerToCornerVecX, 10));
  sprite.data[7] = 128;
  sprite.callback = RotateUpSlamDown_0;
}

function RotateUpSlamDown_0(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  d[7] = s16(d[7]! - 1);
  sprite.x2 = s16(d[6]! + Cos(d[7]!, d[6]!));
  sprite.y2 = s16(-Sin(d[7]!, d[6]!));
  handleSetAffineData(sprite, 256, 256, (d[7]! - 128) << 8);
  if (d[7]! <= 120) {
    d[7] = 120;
    d[3] = 0;
    sprite.callback = RotateUpSlamDown_1;
  }
  tryFlipX(sprite);
}

function RotateUpSlamDown_1(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[3] === 20) {
    sprite.callback = RotateUpSlamDown_2;
    d[3] = 0;
  }
  d[3] = s16(d[3]! + 1);
}

function RotateUpSlamDown_2(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  d[7] = s16(d[7]! + 2);
  sprite.x2 = s16(d[6]! + Cos(d[7]!, d[6]!));
  sprite.y2 = s16(-Sin(d[7]!, d[6]!));
  handleSetAffineData(sprite, 256, 256, (d[7]! - 128) << 8);
  if (d[7]! >= 128) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    handleSetAffineData(sprite, 256, 256, 0);
    d[2] = 0;
    resetSpriteAfterAnim(sprite);
    sprite.callback = Anim_VerticalShake;
  }
  tryFlipX(sprite);
}

function DeepVerticalSquishBounce(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  if (a.delay !== 0) {
    a.delay = u16(a.delay - 1);
  } else {
    if (d[2] === 0) {
      handleStartAffineAnim(sprite);
      d[4] = 0;
      d[5] = 0;
      d[2] = 1;
    }
    if (d[5] === 0) {
      d[7] = Sin(d[4]!, 256);
      sprite.y2 = Sin(d[4]!, 16);
      d[6] = Sin(d[4]!, 32);
      handleSetAffineData(sprite, 256 - d[6]!, 256 + d[7]!, 0);
      if (d[4] === 128) {
        d[4] = 0;
        d[5] = 1;
      }
    } else if (d[5] === 1) {
      d[7] = Sin(d[4]!, 32);
      sprite.y2 = s16(-Sin(d[4]!, 8));
      d[6] = Sin(d[4]!, 128);
      handleSetAffineData(sprite, 256 + d[6]!, 256 - d[7]!, 0);
      if (d[4] === 128) {
        if (a.runs > 1) {
          a.runs = s16(a.runs - 1);
          a.delay = 10;
          d[4] = 0;
          d[5] = 0;
        } else {
          handleSetAffineData(sprite, 256, 256, 0);
          resetSpriteAfterAnim(sprite);
          sprite.callback = waitAnimEnd;
        }
      }
    }
    d[4] = s16(d[4]! + a.rotation);
  }
}

function Anim_DeepVerticalSquishBounce(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 4;
  DeepVerticalSquishBounce(sprite);
  sprite.callback = DeepVerticalSquishBounce;
}

function Anim_HorizontalJumps(sprite: SimSprite): void {
  const d = sprite.data;
  const counter = d[2]!;
  tryFlipX(sprite);
  if (counter > 512) {
    sprite.callback = waitAnimEnd;
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    switch (div(d[2]!, 128)) {
      case 0:
        sprite.x2 = s16(div(-((counter % 128) * 8), 128));
        break;
      case 1:
        sprite.x2 = s16(div(counter % 128, 16) - 8);
        break;
      case 2:
        sprite.x2 = s16(div(counter % 128, 16));
        break;
      case 3:
        sprite.x2 = s16(div(-((counter % 128) * 8), 128) + 8);
        break;
    }
    sprite.y2 = s16(-Sin(counter % 128, 8));
  }
  d[2] = s16(d[2]! + 12);
  tryFlipX(sprite);
}

function Anim_HorizontalJumpsVerticalStretch(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = -1;
  handleStartAffineAnim(sprite);
  sprite.data[3] = 0;
  HorizontalJumpsVerticalStretch_0(sprite);
  sprite.callback = HorizontalJumpsVerticalStretch_0;
}

function HorizontalJumpsVerticalStretch_0(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  if (a.delay !== 0) {
    a.delay = u16(a.delay - 1);
  } else {
    tryFlipX(sprite);
    const counter = d[2]!;
    if (d[2]! > 128) {
      d[2] = 0;
      sprite.callback = HorizontalJumpsVerticalStretch_1;
    } else {
      const v = 8 * a.data;
      sprite.x2 = s16(div(v * (counter % 128), 128));
      sprite.y2 = s16(-Sin(counter % 128, 8));
      d[2] = s16(d[2]! + 12);
    }
    tryFlipX(sprite);
  }
}

function HorizontalJumpsVerticalStretch_1(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  tryFlipX(sprite);
  if (d[2]! > 48) {
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.y2 = 0;
    d[2] = 0;
    sprite.callback = HorizontalJumpsVerticalStretch_2;
  } else {
    const yScale = s16(Sin(d[4]!, 64) + 256);
    if (d[2]! >= 16 && d[2]! <= 31) {
      d[3] = s16(d[3]! + 8);
      sprite.x2 = s16(sprite.x2 - a.data);
    }
    let yDelta = 0;
    if (yScale > 256) yDelta = s16(div(256 - yScale, 8));
    sprite.y2 = s16(-Sin(d[3]!, 20) - yDelta);
    handleSetAffineData(sprite, 256 - Sin(d[4]!, 32), yScale, 0);
    d[2] = s16(d[2]! + 1);
    d[4] = s16(d[4]! + 8);
    d[4] = d[4]! & 0xff;
  }
  tryFlipX(sprite);
}

function HorizontalJumpsVerticalStretch_2(sprite: SimSprite): void {
  const d = sprite.data;
  const a = anim(sprite, d[0]!);
  tryFlipX(sprite);
  const counter = d[2]!;
  if (counter > 128) {
    if (a.runs > 1) {
      a.runs = s16(a.runs - 1);
      a.delay = 10;
      d[3] = 0;
      d[2] = 0;
      d[4] = 0;
      sprite.callback = HorizontalJumpsVerticalStretch_0;
    } else {
      resetSpriteAfterAnim(sprite);
      sprite.callback = waitAnimEnd;
    }
    sprite.x2 = 0;
    sprite.y2 = 0;
  } else {
    const v = a.data;
    sprite.x2 = s16(div(v * ((counter % 128) * 8), 128) + 8 * -v);
    sprite.y2 = s16(-Sin(counter % 128, 8));
  }
  d[2] = s16(d[2]! + 12);
  tryFlipX(sprite);
}

function RotateToSides(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[2] = s16(d[2]! + 1);
  }
  tryFlipX(sprite);
  const a = anim(sprite, d[0]!);
  if (d[7]! > 254) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    handleSetAffineData(sprite, 256, 256, 0);
    if (a.runs > 1) {
      a.runs = s16(a.runs - 1);
      d[2] = 0;
      d[7] = 0;
    } else {
      resetSpriteAfterAnim(sprite);
      sprite.callback = waitAnimEnd;
    }
    tryFlipX(sprite);
  } else {
    sprite.x2 = s16(-Sin(d[7]!, 16));
    const rotation = u16(Sin(d[7]!, 32));
    handleSetAffineData(sprite, 256, 256, rotation << 8);
    d[7] = s16(d[7]! + a.rotation);
    tryFlipX(sprite);
  }
}

function Anim_RotateUpToSides(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[2] = s16(d[2]! + 1);
  }
  tryFlipX(sprite);
  if (d[7]! > 254) {
    sprite.x2 = 0;
    sprite.y2 = 0;
    handleSetAffineData(sprite, 256, 256, 0);
    resetSpriteAfterAnim(sprite);
    sprite.callback = waitAnimEnd;
    tryFlipX(sprite);
  } else {
    sprite.x2 = s16(-Sin(d[7]!, 16));
    sprite.y2 = s16(-Sin(d[7]! % 128, 16));
    const rotation = u16(Sin(d[7]!, 32));
    handleSetAffineData(sprite, 256, 256, rotation << 8);
    d[7] = s16(d[7]! + 8);
    tryFlipX(sprite);
  }
}

function Anim_FlickerIncreasing(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) d[7] = 0;
  if (d[2] === d[7]) {
    d[7] = 0;
    d[2] = s16(d[2]! + 1);
    sprite.invisible = false;
  } else {
    d[7] = s16(d[7]! + 1);
    sprite.invisible = true;
  }
  if (d[2]! > 10) {
    sprite.invisible = false;
    sprite.callback = waitAnimEnd;
  }
}

function Anim_GrowInStages(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[5] = 0;
    d[6] = 0;
    d[7] = 0;
    d[2] = s16(d[2]! + 1);
  }
  if (d[6]! > 0) {
    d[6] = s16(d[6]! - 1);
    if (d[5] !== 3) {
      let scale = s16(div(8 * d[6]!, 20));
      scale = Sin(d[7]! - scale, 64);
      handleSetAffineData(sprite, 256 - scale, 256 - scale, 0);
    }
  } else {
    let v: number;
    if (d[5] === 3) {
      if (d[7]! > 63) {
        d[7] = 64;
        handleSetAffineData(sprite, 256, 256, 0);
        resetSpriteAfterAnim(sprite);
        sprite.callback = waitAnimEnd;
      }
      v = Cos(d[7]!, 64);
    } else {
      v = Sin(d[7]!, 64);
      if (d[7]! > 63) {
        d[5] = 3;
        d[6] = 10;
        d[7] = 0;
      } else if (v > 48 && d[5] === 1) {
        d[5] = 2;
        d[6] = 20;
      } else if (v > 16 && d[5] === 0) {
        d[5] = 1;
        d[6] = 20;
      }
    }
    d[7] = s16(d[7]! + 2);
    handleSetAffineData(sprite, 256 - v, 256 - v, 0);
  }
  tryFlipX(sprite);
}

function Anim_LungeGrow(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[2] = s16(d[2]! + 1);
    d[7] = 0;
  }
  if (d[7]! > 512) {
    sprite.x2 = 0;
    resetSpriteAfterAnim(sprite);
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.callback = waitAnimEnd;
  } else {
    sprite.x2 = s16(-Sin(div(d[7]! % 256, 2), 16));
    d[7] = s16(d[7]! + 8);
    const scale = s16(-Sin(div(d[7]! % 256, 2), 64));
    handleSetAffineData(sprite, 256 + scale, 256 + scale, 0);
  }
  tryFlipX(sprite);
}

function Anim_CircleIntoBackground(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) {
    handleStartAffineAnim(sprite);
    d[2] = s16(d[2]! + 1);
    d[7] = 0;
  }
  if (d[7]! > 512) {
    sprite.x2 = 0;
    resetSpriteAfterAnim(sprite);
    handleSetAffineData(sprite, 256, 256, 0);
    sprite.callback = waitAnimEnd;
  } else {
    sprite.x2 = s16(-Sin(d[7]! % 256, 8));
    d[7] = s16(d[7]! + 8);
    const scale = Sin(div(d[7]! % 256, 2), 96);
    handleSetAffineData(sprite, 256 + scale, 256 + scale, 0);
  }
  tryFlipX(sprite);
}

function Anim_RapidHorizontalHops(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2]! > 2048) {
    sprite.callback = waitAnimEnd;
    d[6] = 0;
  } else {
    switch (s16(div(d[2]!, 512) % 4)) {
      case 0:
        sprite.x2 = s16(div(-((d[2]! % 512) * 16), 512));
        break;
      case 1:
        sprite.x2 = s16(div(d[2]! % 512, 32) - 16);
        break;
      case 2:
        sprite.x2 = s16(div(d[2]! % 512, 32));
        break;
      case 3:
        sprite.x2 = s16(div(-((d[2]! % 512) * 16), 512) + 16);
        break;
    }
    sprite.y2 = s16(-Sin(d[2]! % 128, 4));
    d[2] = s16(d[2]! + 24);
  }
  tryFlipX(sprite);
}

function Anim_FourPetal(sprite: SimSprite): void {
  const d = sprite.data;
  tryFlipX(sprite);
  if (d[2] === 0) {
    d[6] = 0;
    d[7] = 64;
    d[2] = s16(d[2]! + 1);
  }
  d[7] = s16(d[7]! + 8);
  if (d[6] === 4) {
    if (d[7]! > 63) {
      d[7] = 0;
      d[6] = s16(d[6]! + 1);
    }
  } else if (d[7]! > 127) {
    d[7] = 0;
    d[6] = s16(d[6]! + 1);
  }
  switch (d[6]) {
    case 1:
      sprite.x2 = s16(-Cos(d[7]!, 8));
      sprite.y2 = s16(Sin(d[7]!, 8) - 8);
      break;
    case 2:
      sprite.x2 = s16(Sin(d[7]! + 128, 8) + 8);
      sprite.y2 = s16(-Cos(d[7]!, 8));
      break;
    case 3:
      sprite.x2 = Cos(d[7]!, 8);
      sprite.y2 = s16(Sin(d[7]! + 128, 8) + 8);
      break;
    case 0:
    case 4:
      sprite.x2 = s16(Sin(d[7]!, 8) - 8);
      sprite.y2 = Cos(d[7]!, 8);
      break;
    default:
      sprite.x2 = 0;
      sprite.y2 = 0;
      sprite.callback = waitAnimEnd;
      break;
  }
  tryFlipX(sprite);
}

function Anim_VerticalSquishBounce_Slow(sprite: SimSprite): void {
  sprite.data[0] = 32;
  VerticalSquishBounce(sprite);
  sprite.callback = VerticalSquishBounce;
}

function Anim_HorizontalSlide_Slow(sprite: SimSprite): void {
  sprite.data[0] = 80;
  HorizontalSlide(sprite);
  sprite.callback = HorizontalSlide;
}

function Anim_VerticalSlide_Slow(sprite: SimSprite): void {
  sprite.data[0] = 80;
  VerticalSlide(sprite);
  sprite.callback = VerticalSlide;
}

function Anim_BounceRotateToSides_Small(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 2048;
  anim(sprite, id).data = sprite.data[6]!;
  BounceRotateToSides(sprite);
  sprite.callback = BounceRotateToSides;
}

function Anim_BounceRotateToSides_Slow(sprite: SimSprite): void {
  sprite.data[6] = 1;
  Anim_BounceRotateToSides(sprite);
}

function Anim_BounceRotateToSides_SmallSlow(sprite: SimSprite): void {
  sprite.data[6] = 1;
  Anim_BounceRotateToSides_Small(sprite);
}

function Anim_ZigzagSlow(sprite: SimSprite): void {
  const d = sprite.data;
  if (d[2] === 0) d[0] = 0;
  if (d[0]! <= 0) {
    Zigzag(sprite);
    d[0] = 1;
  } else {
    d[0] = s16(d[0]! - 1);
  }
}

function Anim_HorizontalShake_Slow(sprite: SimSprite): void {
  sprite.data[0] = 30;
  sprite.data[7] = 3;
  HorizontalShake(sprite);
  sprite.callback = HorizontalShake;
}

function Anim_Twist_Twice(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 1024;
  anim(sprite, id).delay = 0;
  anim(sprite, id).runs = 2;
  Twist(sprite);
  sprite.callback = Twist;
}

function Anim_CircleCounterclockwise_Slow(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 512;
  anim(sprite, id).data = 3;
  anim(sprite, id).speed = 12;
  CircleCounterclockwise(sprite);
  sprite.callback = CircleCounterclockwise;
}

function Anim_VerticalSlideWobble_Small(sprite: SimSprite): void {
  sprite.data[0] = 5;
  VerticalSlideWobble(sprite);
  sprite.callback = VerticalSlideWobble;
}

function Anim_VerticalJumps_Small(sprite: SimSprite): void {
  sprite.data[0] = 3;
  VerticalJumps(sprite);
  sprite.callback = VerticalJumps;
}

function Anim_Spin(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).delay = 60;
  anim(sprite, id).data = 30;
  Spin(sprite);
  sprite.callback = Spin;
}

function Anim_TumblingFrontFlip_Twice(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).speed = 1;
  anim(sprite, id).runs = 2;
  TumblingFrontFlip(sprite);
  sprite.callback = TumblingFrontFlip;
}

function Anim_HorizontalJumpsVerticalStretch_Twice(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 1;
  anim(sprite, id).runs = 2;
  handleStartAffineAnim(sprite);
  sprite.data[3] = 0;
  HorizontalJumpsVerticalStretch_0(sprite);
  sprite.callback = HorizontalJumpsVerticalStretch_0;
}

function Anim_RotateToSides_Twice(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).rotation = 4;
  anim(sprite, id).runs = 2;
  RotateToSides(sprite);
  sprite.callback = RotateToSides;
}

function Anim_SwingConcave(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 100;
  SwingConcave(sprite);
  sprite.callback = SwingConcave;
}

function Anim_SwingConcave_Fast(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 50;
  anim(sprite, id).runs = 2;
  SwingConcave(sprite);
  sprite.callback = SwingConcave;
}

function Anim_SwingConvex(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 100;
  SwingConvex(sprite);
  sprite.callback = SwingConvex;
}

function Anim_SwingConvex_Fast(sprite: SimSprite): void {
  const id = (sprite.data[0] = addNewAnim(sprite));
  anim(sprite, id).data = 50;
  anim(sprite, id).runs = 2;
  SwingConvex(sprite);
  sprite.callback = SwingConvex;
}

/** sMonAnimFunctions entries a Battle Frontier species uses, by the extracted callback name. */
const SUMMARY_FRONT_CALLBACKS: Readonly<Record<string, SimCallback>> = {
  Anim_BackAndLunge,
  Anim_BounceRotateToSides,
  Anim_BounceRotateToSides_Slow,
  Anim_BounceRotateToSides_Small,
  Anim_BounceRotateToSides_SmallSlow,
  Anim_CircleCounterclockwise_Slow,
  Anim_CircleIntoBackground,
  Anim_CircularStretchTwice,
  Anim_CircularVibrate,
  Anim_DeepVerticalSquishBounce,
  Anim_Figure8,
  Anim_FlashYellow,
  Anim_FlickerIncreasing,
  Anim_FourPetal,
  Anim_FrontFlip,
  Anim_GlowBlack,
  Anim_GlowBlue,
  Anim_GlowOrange,
  Anim_GrowInStages,
  Anim_GrowVibrate,
  Anim_HorizontalJumps,
  Anim_HorizontalJumpsVerticalStretch,
  Anim_HorizontalJumpsVerticalStretch_Twice,
  Anim_HorizontalPivot,
  Anim_HorizontalShake,
  Anim_HorizontalShake_Slow,
  Anim_HorizontalSlide,
  Anim_HorizontalSlide_Slow,
  Anim_HorizontalSlideWobble,
  Anim_HorizontalStretch,
  Anim_HorizontalVibrate,
  Anim_LungeGrow,
  Anim_RapidHorizontalHops,
  Anim_RisingWobble,
  Anim_RotateToSides_Twice,
  Anim_RotateUpSlamDown,
  Anim_RotateUpToSides,
  Anim_ShrinkGrow,
  Anim_Spin,
  Anim_SwingConcave,
  Anim_SwingConcave_Fast,
  Anim_SwingConcave_FastShort,
  Anim_SwingConvex,
  Anim_SwingConvex_Fast,
  Anim_TipMoveForward,
  Anim_TumblingFrontFlip_Twice,
  Anim_Twist,
  Anim_Twist_Twice,
  Anim_VerticalJumpsHorizontalJumps,
  Anim_VerticalJumps_Big,
  Anim_VerticalJumps_Small,
  Anim_VerticalShake,
  Anim_VerticalShakeTwice,
  Anim_VerticalSlide,
  Anim_VerticalSlide_Slow,
  Anim_VerticalSlideWobble,
  Anim_VerticalSlideWobble_Small,
  Anim_VerticalSquishBounce,
  Anim_VerticalSquishBounce_Slow,
  Anim_VerticalStretch,
  Anim_ZigzagFast,
  Anim_ZigzagSlow,
};

/** Motion types (ANIM_*) whose callbacks are transcribed: every type a Battle Frontier species uses. */
export const SUMMARY_FRONT_IMPLEMENTED_MOTIONS: readonly string[] = Object.freeze(
  [...new Set((summaryFrontAnimationData.species as SourceAnimation[])
    .filter((entry) => SUMMARY_FRONT_CALLBACKS[entry.motion.callback] !== undefined)
    .map((entry) => entry.motion.type))].sort(),
);

export type SummaryFrontMotionType = string;

interface SimFrame {
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Matrix | null;
  readonly invisible: boolean;
  readonly blend: { readonly coefficient: number; readonly color: number } | null;
  readonly done: boolean;
}

const simulatedTimelines = new Map<string, readonly SimFrame[]>();

/** The sprite state after each callback call (AnimateSprite's BeginAffineAnim included), until and including the finishing call. */
function simulatedTimeline(callbackName: string, dontFlip: boolean): readonly SimFrame[] {
  const key = `${callbackName}:${dontFlip}`;
  const cached = simulatedTimelines.get(key);
  if (cached) return cached;
  const entry = SUMMARY_FRONT_CALLBACKS[callbackName];
  if (!entry) throw new Error(`summary front animation: no transcription of ${callbackName}`);
  // CreateMonSprite: data[0] = species2, data[2] = 0; SpriteCB_Pokemon: data[1] = sDontFlip. Every callback that reads data[0]
  // writes it first; the others start from CreateSprite's zeroed fields.
  const sprite: SimSprite = {
    x2: 0,
    y2: 0,
    data: [0, dontFlip ? 1 : 0, 0, 0, 0, 0, 0, 0],
    dontFlip,
    affineOn: false,
    matrix: [256, 0, 0, 256],
    beginAffine: false,
    centerToCornerVecX: -32,
    invisible: false,
    blend: null,
    callback: entry,
    anims: [0, 1, 2, 3].map(() => ({ delay: 0, speed: 0, runs: 1, rotation: 0, data: 0 })),
    animIdx: 0,
  };
  const frames: SimFrame[] = [];
  for (let call = 0; call < 4096 && sprite.callback !== waitAnimEnd; call += 1) {
    sprite.callback(sprite);
    if (sprite.beginAffine) {
      // sMonAffineAnims[!sDontFlip]: AFFINEANIMCMD_FRAME(+-256, 256, 0, 0) through ConvertScaleParam + ObjAffineSet.
      sprite.matrix = [dontFlip ? 256 : -256, 0, 0, 256];
      sprite.beginAffine = false;
    }
    // `+ 0` folds the -0 that negated zero offsets produce.
    frames.push({
      x2: sprite.x2 + 0,
      y2: sprite.y2 + 0,
      matrix: sprite.affineOn ? sprite.matrix : null,
      invisible: sprite.invisible,
      blend: sprite.blend && { ...sprite.blend },
      done: sprite.callback === waitAnimEnd,
    });
  }
  if (sprite.callback !== waitAnimEnd) throw new Error(`summary front motion ${callbackName} did not finish`);
  simulatedTimelines.set(key, frames);
  return frames;
}

/** True for a motion type no species callback transcription covers (none among the Battle Frontier species since sfa2). */
export function summaryFrontMotionIsApproximate(type: string): boolean {
  return !SUMMARY_FRONT_IMPLEMENTED_MOTIONS.includes(type);
}

/**
 * The picture's sprite state at `monAnimClock` (see the module comment for the clock). `replacement` selects the Task_ChangeSummaryMon
 * start (SUMMARY_REPLACEMENT_MON_ANIMATION_START) instead of the screen construction's.
 */
export function summaryFrontSpritePresentation(
  species: string,
  monAnimClock: number,
  replacement: boolean,
): SummaryFrontSpritePresentation {
  const animation = sourceAnimations.get(species);
  // A species outside the extracted Battle Frontier rows keeps its picture still (presentation fallback, not a mapping).
  if (!animation) {
    return {
      sourceAnimationType: "ANIM_V_SLIDE",
      motionClaim: "approximate-static",
      frame: 0,
      x2: 0,
      y2: 0,
      matrix: null,
      invisible: false,
      blend: null,
      animationStarted: false,
      motionFinished: true,
    };
  }
  const start = replacement ? SUMMARY_REPLACEMENT_MON_ANIMATION_START : SUMMARY_INITIAL_MON_ANIMATION_START;
  const elapsed = monAnimClock - start;
  const type = animation.motion.type;
  const base = {
    sourceAnimationType: type,
    motionClaim: "source",
    // StartSpriteAnim(sprite, 1) runs at dispatch, before any delay; a command boundary shows on the following picture.
    frame: frameAt(animation.spriteFrameProgram, elapsed - 1),
    animationStarted: elapsed >= 0,
  } as const;
  const timeline = simulatedTimeline(animation.motion.callback, animation.noFlip === true);
  const call = elapsed - 1 - Math.max(animation.delay, 1);
  if (call < 0) {
    return { ...base, x2: 0, y2: 0, matrix: null, invisible: false, blend: null, motionFinished: false };
  }
  const frame = timeline[Math.min(call, timeline.length - 1)]!;
  return {
    ...base,
    x2: frame.x2,
    y2: frame.y2,
    matrix: frame.matrix,
    invisible: frame.invisible,
    blend: frame.blend,
    motionFinished: frame.done,
  };
}
