import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export const CONFUSE_RAY_FRAME_COUNT = 270;
export const CONFUSE_RAY_BOUNCE_FIRST_AGE = 46;
export const CONFUSE_RAY_SPIRAL_FIRST_AGE = 166;

export interface ConfuseRayGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface ConfuseRayMatrix {
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export interface ConfuseRayBall {
  readonly kind: "bounce" | "spiral";
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly priority: 1 | 2;
  readonly invisible: boolean;
  readonly matrix: ConfuseRayMatrix;
}

export interface AdjustPanningVarState {
  readonly pan: number;
  readonly sourcePan: number;
  readonly targetPan: number;
  readonly increment: number;
}

export interface ConfuseRayState {
  readonly active: boolean;
  readonly background: "battle" | "ghost";
  readonly bldy: number;
  readonly blend: Readonly<{ eva: number; evb: number }>;
  readonly paletteBlendCoefficient: number;
  readonly monBgActive: boolean;
  readonly bounce: ConfuseRayBall | null;
  readonly spiral: ConfuseRayBall | null;
  readonly panning: AdjustPanningVarState | null;
}

const sin = (angle: number, amplitude: number): number =>
  (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;

const bounceMatrix = (localAge: number): ConfuseRayMatrix => {
  // CreateSprite advances the affine program once and AnimateSprites advances
  // it once more on the creation row. The two five-callback source commands
  // grow 30 Q8.8 units then shrink 30, while rotating ten GBA angle units.
  const callbacks = localAge + 2;
  const phase = callbacks % 10;
  const scale = 256 + 30 * (5 - Math.abs(5 - phase));
  const inverseScale = Math.trunc(0x10000 / scale);
  const radians = ((callbacks * 10) & 0xff) * 2 * Math.PI / 256;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    pa: Math.trunc(inverseScale * cosine),
    pb: Math.trunc(-inverseScale * sine),
    pc: Math.trunc(inverseScale * sine),
    pd: Math.trunc(inverseScale * cosine),
  };
};

function bounceAtAge(age: number, geometry: ConfuseRayGeometry): ConfuseRayBall | null {
  const localAge = age - CONFUSE_RAY_BOUNCE_FIRST_AGE;
  if (localAge < 0 || localAge > 74) return null;
  const x = geometry.attackerCenter.x
    + (geometry.attackerSide === "player" ? 28 : -28);
  const y = geometry.attackerCenter.y;
  const xDistance = geometry.targetCenter.x - x;
  const yDistance = geometry.targetCenter.y - y;
  const duration = Math.trunc((Math.abs(xDistance) << 8) / 288);
  let dx = Math.trunc((Math.abs(xDistance) << 8) / duration);
  let dy = Math.trunc((Math.abs(yDistance) << 8) / duration);
  if (xDistance < 0) dx |= 1; else dx &= ~1;
  if (yDistance < 0) dy |= 1; else dy &= ~1;
  const callbacks = localAge + 1;
  // The first callback after data[0] reaches zero only swaps Step1->Step2.
  // Later Step2 callbacks force data[0]=1 and continue the same accumulator.
  const effectiveCallbacks = callbacks <= duration ? callbacks : callbacks - 1;
  const translated = effectiveCallbacks;
  const linearX = dx & 1
    ? -((dx * translated) >> 8)
    : (dx * translated) >> 8;
  const linearY = dy & 1
    ? -((dy * translated) >> 8)
    : (dy * translated) >> 8;
  // The callback samples data[5] before advancing it by five.
  const angle = ((effectiveCallbacks - 1) * 5) & 0xff;
  return {
    kind: "bounce",
    localAge,
    x,
    y,
    x2: linearX + sin(angle, 10),
    y2: linearY + sin(angle + 64, 15),
    priority: 2,
    invisible: localAge === 74,
    matrix: bounceMatrix(localAge),
  };
}

function spiralAtAge(age: number, geometry: ConfuseRayGeometry): ConfuseRayBall | null {
  const localAge = age - CONFUSE_RAY_SPIRAL_FIRST_AGE;
  if (localAge < 0 || localAge > 58) return null;
  // The initializer invokes Step once inline and the creation-row scheduler
  // invokes it again, so source local age zero has already run two steps.
  const callbacks = localAge + 2;
  const angle = (callbacks * 19) & 0xff;
  const rise = callbacks * 80;
  const sampledAngle = (angle - 19) & 0xff;
  const temp = (sampledAngle - 65) & 0xffff;
  return {
    kind: "spiral",
    localAge,
    x: geometry.targetCenter.x,
    y: geometry.targetCenter.y - 16,
    x2: sin(sampledAngle, 32),
    y2: sin(sampledAngle + 64, 8) + (rise >> 8),
    priority: temp <= 130 ? 2 : 1,
    invisible: false,
    matrix: { pa: 256, pb: 0, pc: 0, pd: 256 },
  };
}

function backgroundBldy(age: number): number {
  if (age >= 9 && age <= 24) return age - 8;
  if (age >= 25 && age <= 28) return 16;
  if (age >= 29 && age <= 44) return 44 - age;
  if (age >= 230 && age <= 232) return 1;
  if (age >= 233 && age <= 247) return age - 231;
  if (age >= 248 && age <= 251) return 16;
  if (age >= 252 && age <= 267) return 267 - age;
  return 0;
}

function blendAtAge(age: number): { eva: number; evb: number } {
  let eva = 0;
  if (age >= 47 && age <= 61) eva = 61 - age;
  else if (age >= 75 && age <= 90) eva = age - 74;
  else if (age >= 91 && age <= 106) eva = 106 - age;
  return { eva, evb: 16 - eva };
}

function paletteBlendAtAge(age: number): number {
  if (age < 49 || age >= 162) return 0;
  const cycle = (age - 49) % 40;
  if (cycle < 12) return 2 + 2 * Math.floor(cycle / 2);
  if (cycle < 20) return 14;
  if (cycle < 32) return 12 - 2 * Math.floor((cycle - 20) / 2);
  return 0;
}

function panningAtAge(
  age: number,
  side: ConfuseRayGeometry["attackerSide"],
): AdjustPanningVarState | null {
  const localAge = age - CONFUSE_RAY_BOUNCE_FIRST_AGE;
  const sourcePan = side === "player" ? -64 : 63;
  const targetPan = side === "player" ? 63 : -63;
  const increment = side === "player" ? 2 : -2;
  const last = side === "player" ? 61 : 60;
  if (localAge < 0 || localAge > last) return null;
  const pan = sourcePan + increment * (localAge + 2);
  return {
    sourcePan,
    targetPan,
    increment,
    pan: increment > 0 ? Math.min(pan, targetPan) : Math.max(pan, targetPan),
  };
}

/** Age zero is the pointer-bounded `loadspritegfx ANIM_TAG_YELLOW_BALL` row. */
export function confuseRayAtAge(age: number, geometry: ConfuseRayGeometry): ConfuseRayState {
  return {
    active: age >= 0 && age < CONFUSE_RAY_FRAME_COUNT - 1,
    background: age >= 25 && age < 248 ? "ghost" : "battle",
    bldy: backgroundBldy(age),
    blend: blendAtAge(age),
    paletteBlendCoefficient: paletteBlendAtAge(age),
    monBgActive: age >= 5 && age < 232,
    bounce: bounceAtAge(age, geometry),
    spiral: spiralAtAge(age, geometry),
    panning: panningAtAge(age, geometry.attackerSide),
  };
}
