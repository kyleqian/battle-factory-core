/** Verbatim copy of src/animation/dive.ts as of 460cd3548 (the O(age^2) re-simulation); test-only reference for cln244. */

import { sortGbaSpriteOrder, type GbaSpriteOrderKey } from "../../src/animation/gbaObjCompositor.ts";

export type DiveBody = "setup" | "attack";
export type DiveSide = "player" | "opponent";

export interface DiveAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  readonly persistentOrder: number;
}

export interface DiveDropletProfile extends DiveAllocation {
  /** Random-derived horizontal speed (`data[0]`). */
  readonly velocityX: number;
  /** Random-derived initial vertical speed, before the first callback subtracts 32. */
  readonly velocityY: number;
  readonly direction: 0 | 1;
}

export interface DiveBubbleProfile extends DiveAllocation {
  readonly velocityX: number;
  readonly velocityY: number;
}

export interface DiveImpactProfile extends DiveAllocation {
  readonly bubbles: readonly [DiveBubbleProfile, DiveBubbleProfile];
}

export interface DiveProfile {
  readonly firstInactiveAge: number;
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly ball: DiveAllocation;
  readonly splash: DiveAllocation;
  readonly droplets: readonly DiveDropletProfile[];
  readonly impacts: readonly DiveImpactProfile[];
  /** Live `sSpriteOrder` restricted to every slot this body can allocate. */
  readonly spriteOrderSeed: readonly number[];
}

export interface DiveGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
  readonly attackerRestOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
  /**
   * Optional anchor split (docs/next-adapters-prep25.md s B.1a, measured 8/8): the setup ball's base point (the reducer adds 16 to y;
   * the ROM ball sits at the attacker's Y_PIC_OFFSET point) and the attack impact / bubble anchor (target Y_PIC_OFFSET y - 8 for a
   * player target, - 2 for an opponent target). Absent = `attackerPictureOffset` / `targetPictureOffset` (the accepted staged seam).
   */
  readonly attackerBallOffset?: Readonly<{ x: number; y: number }>;
  readonly targetImpactOffset?: Readonly<{ x: number; y: number }>;
}

interface DiveSpriteBase extends DiveAllocation {
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
}

export interface DiveBall extends DiveSpriteBase {
  readonly kind: "ball";
  readonly invisible: boolean;
  readonly matrix: readonly [number, 0, 0, number];
}
export interface DiveSplash extends DiveSpriteBase {
  readonly kind: "splash";
  readonly matrix: readonly [256, 0, 0, number];
}
export interface DiveDroplet extends DiveSpriteBase {
  readonly kind: "droplet";
  readonly direction: 0 | 1;
}
export interface DiveImpact extends DiveSpriteBase {
  readonly kind: "impact";
  readonly index: number;
  readonly matrix: readonly [303, 0, 0, 303];
}
export interface DiveBubble extends DiveSpriteBase {
  readonly kind: "bubble";
  readonly impact: number;
  readonly index: 0 | 1;
}

export interface DiveState {
  readonly age: number;
  readonly body: DiveBody;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly attackerInvisible: boolean;
  /** Source battler OBJ visibility, distinct from the one-row-later monbg scanout. */
  readonly targetInvisible: boolean;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly selectedBgOffsetX: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly ball: DiveBall | null;
  readonly splash: DiveSplash | null;
  readonly droplets: readonly DiveDroplet[];
  readonly impacts: readonly DiveImpact[];
  readonly bubbles: readonly DiveBubble[];
  /** Front-to-back live OAM order, after the source's stable per-row sort. */
  readonly hardwareOrder: readonly number[];
  readonly resources: Readonly<{ splash: boolean; sweatBead: boolean; roundShadow: boolean;
    waterImpact: boolean; smallBubbles: boolean }>;
  readonly audio: readonly Readonly<{ song: string; pan: DiveSide }>[];
}

const BALL_MATRIX_X = [1170, 682, 481, 372, 303, 256, 256, 256, 256, 256, 256,
  273, 292, 315, 341, 372, 409, 455, 512, 585, 682] as const;
const BALL_MATRIX_Y = [256, 256, 256, 256, 256, 256, 292, 341, 409, 512, 682,
  512, 409, 341, 292, 256, 227, 204, 186, 170, 157] as const;

function ballMotion(localAge: number, centerY: number) {
  let y2 = 0, velocity = 0, state: "delay" | "up" | "pause" | "down" = "delay";
  let delay = 12, pause = 0, invisible = false;
  for (let callback = 0; callback <= localAge; callback += 1) {
    if (state === "delay") {
      delay -= 1;
      if (delay < 0) state = "up";
    } else if (state === "up") {
      velocity += 336;
      y2 -= velocity >> 8;
      if (centerY + y2 <= -32) state = "pause";
    } else if (state === "pause") {
      invisible = true;
      pause += 1;
      if (pause > 21) state = "down";
    } else {
      y2 += velocity >> 8;
      if (centerY + y2 > -32) invisible = false;
    }
  }
  return { y2, invisible };
}

function splashAt(localAge: number, lastLocalAge: number, allocation: DiveAllocation,
  picture: Readonly<{ x: number; y: number }>, subpriority: number): DiveSplash | null {
  if (localAge < 0 || localAge > lastLocalAge) return null;
  const matrixY = localAge <= 11 ? 512 - 40 * (localAge + 1) : 32 + 40 * (localAge - 11);
  const t = Math.min(128, Math.trunc(0x3d00 / matrixY) + 1);
  return { kind: "splash", localAge, ...allocation, x: picture.x, y: picture.y,
    x2: 0, y2: Math.trunc((64 - t) / 2), subpriority: subpriority - 3,
    matrix: [256, 0, 0, matrixY] };
}

function dropletAt(localAge: number, lastLocalAge: number, p: DiveDropletProfile,
  picture: Readonly<{ x: number; y: number }>, subpriority: number): DiveDroplet | null {
  if (localAge < 0 || localAge > lastLocalAge) return null;
  let x2 = 0, y2 = 0, velocityY = p.velocityY;
  for (let callback = 0; callback <= localAge; callback += 1) {
    const dx = p.velocityX >> 8;
    x2 += p.direction ? -dx : dx;
    y2 -= velocityY >> 8;
    velocityY -= 32;
  }
  return { kind: "droplet", localAge, ...p, x: picture.x, y: picture.y + 32,
    x2, y2, subpriority: subpriority - 5 };
}

function overwritten(slot: number, birth: number, age: number,
  births: readonly Readonly<{ birth: number; slot: number }>[]): boolean {
  return births.some((other) => other.slot === slot && other.birth > birth && other.birth <= age);
}

function diveAtAgeRaw(age: number, body: DiveBody, attackerSide: DiveSide,
  geometry: Readonly<DiveGeometry>, profile: Readonly<DiveProfile>): DiveState {
  const setup = body === "setup";
  const splashBirth = setup ? profile.firstInactiveAge - 50 : 16;
  const picture = setup ? geometry.attackerPictureOffset : geometry.targetPictureOffset;
  const effectSubpriority = setup ? profile.attackerSubpriority : profile.targetSubpriority;
  const allBirths = [
    { birth: splashBirth, slot: profile.splash.slot },
    ...profile.droplets.map((p) => ({ birth: splashBirth, slot: p.slot })),
    ...(!setup ? profile.impacts.flatMap((p, index) => [{ birth: 30 + index * 4, slot: p.slot },
      ...p.bubbles.map((bubble) => ({ birth: 30 + index * 4, slot: bubble.slot }))]) : []),
  ];
  const lastSplashAge = setup && attackerSide === "player" ? 23 : 22;
  const lastDropletAge = setup && attackerSide === "player" ? 30 : 29;
  const splashLocalAge = age - splashBirth;
  // The player setup reuses the ball's affine matrix.  Its second source row
  // is the measured RAM+2 latch: the splash callback has not advanced yet.
  const splashCallbackAge = setup && attackerSide === "player" && splashLocalAge > 0
    ? splashLocalAge - 1 : splashLocalAge;
  const rawSplash = splashAt(splashCallbackAge, lastSplashAge, profile.splash, picture,
    effectSubpriority);
  const normalizedSplash = rawSplash && splashLocalAge <= lastSplashAge
    ? { ...rawSplash, localAge: splashLocalAge } : null;
  const splash = normalizedSplash && !overwritten(normalizedSplash.slot, splashBirth, age, allBirths)
    ? normalizedSplash : null;
  const dropletLocalAge = age - splashBirth;
  const dropletCallbackAge = setup && attackerSide === "player" && dropletLocalAge > 0
    ? dropletLocalAge - 1 : dropletLocalAge;
  const droplets = (dropletLocalAge <= lastDropletAge ? profile.droplets : [])
    .map((p) => dropletAt(dropletCallbackAge, lastDropletAge, p, picture,
    effectSubpriority)).filter((item): item is DiveDroplet => item !== null)
    .map((item) => ({ ...item, localAge: dropletLocalAge }))
    .filter((item) => !overwritten(item.slot, splashBirth, age, allBirths));
  const impacts: DiveImpact[] = [];
  const bubbles: DiveBubble[] = [];
  const impactAnchor = geometry.targetImpactOffset ?? geometry.targetPictureOffset;
  if (!setup) for (const [index, p] of profile.impacts.entries()) {
    const birth = 30 + index * 4, localAge = age - birth;
    if (localAge >= 0 && localAge <= 9 && !overwritten(p.slot, birth, age, allBirths)) {
      impacts.push({ kind: "impact", index, localAge, ...p,
        x: impactAnchor.x,
        y: impactAnchor.y + (attackerSide === "player" ? 22 : 28) - index * 5,
        x2: 0, y2: 0,
        subpriority: profile.targetSubpriority + (attackerSide === "player" ? -13 : 7),
        matrix: [303, 0, 0, 303] });
    }
    for (const [bubbleIndex, bubble] of p.bubbles.entries()) {
      if (localAge < 0 || localAge > 19 || overwritten(bubble.slot, birth, age, allBirths)) continue;
      const callbacks = localAge + 1;
      const xAccumulator = bubble.velocityX * callbacks;
      bubbles.push({ kind: "bubble", impact: index, index: bubbleIndex as 0 | 1,
        localAge, ...bubble, x: impactAnchor.x,
        y: impactAnchor.y + (attackerSide === "player" ? 22 : 28) - index * 5,
        x2: bubble.velocityX & 1 ? -(xAccumulator >> 8) : xAccumulator >> 8,
        y2: bubble.velocityY * callbacks >> 8,
        subpriority: profile.targetSubpriority + (attackerSide === "player" ? -14 : 6) });
    }
  }
  let ball: DiveBall | null = null;
  if (setup) {
    const localAge = age - 10;
    if (localAge >= 0 && localAge <= splashBirth - 12) {
      const ballAnchor = geometry.attackerBallOffset ?? geometry.attackerPictureOffset;
      const motion = ballMotion(localAge, ballAnchor.y + 16);
      const matrixIndex = Math.min(localAge, BALL_MATRIX_X.length - 1);
      ball = { kind: "ball", localAge, ...profile.ball,
        x: ballAnchor.x, y: ballAnchor.y + 16,
        x2: 0, y2: motion.y2, invisible: motion.invisible,
        subpriority: profile.attackerSubpriority - 2,
        matrix: [BALL_MATRIX_X[matrixIndex]!, 0, 0, BALL_MATRIX_Y[matrixIndex]!] };
    }
  }
  const shakeAt = (sourceAge: number): number => sourceAge >= 30 && sourceAge <= 61
    ? ((Math.floor((sourceAge - 30) / 2) & 1) ? 4 : -4) : 0;
  const shake = !setup ? shakeAt(age) : 0;
  return { age, body, active: age >= 0 && age <= profile.firstInactiveAge,
    scriptActive: age >= 0 && age < profile.firstInactiveAge,
    attackerInvisible: setup ? age >= 10 : age < 83,
    targetInvisible: !setup && age >= 13 && age < 83,
    targetMonbg: !setup && age >= 14 && age < 87,
    alpha: !setup && age >= 16 && age < 83 ? { eva: 12, evb: 8 } : null,
    // Task_UpdateMonBg copies the preceding ShakeMon2 source write into the
    // selected BG scroll register; keep that hardware latch separate from
    // the battler sprite's same-row software x2 below.
    selectedBgOffsetX: !setup ? shakeAt(age - 1) : 0,
    attackerOffset: geometry.attackerRestOffset,
    targetOffset: !setup && age >= 30
      ? { x2: age <= 61 ? shake : 0, y2: geometry.targetRestOffset.y2 }
      : geometry.targetRestOffset,
    ball, splash, droplets, impacts, bubbles, hardwareOrder: [],
    resources: { splash: age >= 1 && age < profile.firstInactiveAge,
      sweatBead: age >= 4 && age < profile.firstInactiveAge,
      roundShadow: setup && age >= 7 && age < profile.firstInactiveAge,
      waterImpact: !setup && age >= 7 && age < profile.firstInactiveAge,
      smallBubbles: !setup && age >= 10 && age < profile.firstInactiveAge },
    audio: [
      ...(setup && age === 10 ? [{ song: "SE_M_HEADBUTT", pan: attackerSide }] : []),
      ...(setup && age === splashBirth ? [{ song: "SE_M_DIVE", pan: attackerSide }] : []),
      ...(!setup && age === 16 ? [{ song: "SE_M_EXPLOSION", pan: attackerSide === "player" ? "opponent" as const : "player" as const }] : []),
      ...(!setup && age === 30 ? [{ song: "SE_M_WATERFALL", pan: attackerSide === "player" ? "opponent" as const : "player" as const }] : []),
    ],
  };
}

function spriteTop(sprite: DiveBall | DiveSplash | DiveDroplet | DiveImpact | DiveBubble): number {
  // SortSprites compares the OBJ top coordinate, not the animation center.
  // These are the source OAM dimensions for round shadow/Splash, sweat bead,
  // Water Impact, and Small Bubbles respectively. The affine 64x64 objects
  // have distinct subpriorities, but retaining their real geometry keeps the
  // scheduler valid for altered live allocations as well.
  const halfHeight = sprite.kind === "ball" || sprite.kind === "splash" ? 32
    : sprite.kind === "impact" ? 16 : 4;
  const top = (sprite.y + sprite.y2 - halfHeight) & 0xff;
  return top >= 160 ? top - 256 : top;
}

function allocatedSlots(body: DiveBody, profile: Readonly<DiveProfile>): number[] {
  return [...new Set([
    ...(body === "setup" ? [profile.ball.slot] : []),
    profile.splash.slot,
    ...profile.droplets.map((sprite) => sprite.slot),
    ...profile.impacts.flatMap((impact) => [
      impact.slot, ...impact.bubbles.map((bubble) => bubble.slot),
    ]),
  ])];
}

/**
 * Replay Emerald's persistent `sSpriteOrder` rather than using a sprite's
 * creation-row rank forever. Moving equal-subpriority objects are stably
 * re-sorted by live OAM Y every row; a later exact-Y tie therefore preserves
 * the immediately preceding hardware order, including destroyed/reused slots.
 */
function hardwareOrderAtAge(age: number, body: DiveBody, attackerSide: DiveSide,
  geometry: Readonly<DiveGeometry>, profile: Readonly<DiveProfile>): readonly number[] {
  const slots = allocatedSlots(body, profile);
  if (profile.spriteOrderSeed.length !== slots.length
    || new Set(profile.spriteOrderSeed).size !== slots.length
    || slots.some((slot) => !profile.spriteOrderSeed.includes(slot))) {
    throw new Error("Dive sprite-order seed must permute every live allocation slot");
  }
  const firstAllocationAge = body === "setup" ? 10 : 16;
  let order = profile.spriteOrderSeed.slice();
  let currentSlots = new Set<number>();
  for (let sourceAge = firstAllocationAge; sourceAge <= age; sourceAge += 1) {
    const frame = diveAtAgeRaw(sourceAge, body, attackerSide, geometry, profile);
    const sprites = [frame.ball, frame.splash, ...frame.droplets, ...frame.impacts,
      ...frame.bubbles].filter((sprite): sprite is NonNullable<typeof sprite> => sprite !== null);
    const bySlot = new Map(sprites.map((sprite) => [sprite.slot, sprite] as const));
    currentSlots = new Set(bySlot.keys());
    const keys: GbaSpriteOrderKey[] = order.map((slot) => {
      const sprite = bySlot.get(slot);
      return sprite ? { slot, priority: 2, subpriority: sprite.subpriority,
        y: spriteTop(sprite) }
        : { slot, priority: 3, subpriority: 255, y: -96 };
    });
    order = sortGbaSpriteOrder(order, keys);
  }
  return order.filter((slot) => currentSlots.has(slot));
}

export function diveAtAge(age: number, body: DiveBody, attackerSide: DiveSide,
  geometry: Readonly<DiveGeometry>, profile: Readonly<DiveProfile>): DiveState {
  const state = diveAtAgeRaw(age, body, attackerSide, geometry, profile);
  return { ...state, hardwareOrder: hardwareOrderAtAge(age, body, attackerSide, geometry, profile) };
}
