/**
 * Source-relative reducer for one pointer-owned MOVE_ROCK_BLAST body.
 *
 * The natural EFFECT_MULTI_HIT dispatcher may invoke this body again.  This
 * module deliberately owns only one visual-script invocation, from the two
 * resource loads through its first inactive cleanup.  Damage, hit count,
 * accuracy, battle RNG, controller flow, and the outcome remain external.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type RockBlastSide = "player" | "opponent";

export const ROCK_BLAST_SOURCE_START = 0x082d_65f7;
export const ROCK_BLAST_SOURCE_END_EXCLUSIVE = 0x082d_6694;
export const ROCK_BLAST_FIRST_INACTIVE_AGE = 89;
export const ROCK_BLAST_ROCKS_TAG = 10058;
export const ROCK_BLAST_IMPACT_TAG = 10135;

export interface RockBlastAnimationProfile {
  readonly attackerSide: RockBlastSide;
  readonly attacker: Readonly<{
    readonly spriteSlot: number;
    readonly initialX2: number;
    readonly initialY2: number;
    readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
  }>;
  readonly target: Readonly<{
    readonly spriteSlot: number;
    readonly initialX2: number;
    readonly initialY2: number;
    readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
    /** InitSpritePosToAnimTarget(TRUE), including live species pic offsets. */
    readonly effectCenter: Readonly<{ x: number; y: number }>;
  }>;
  /** Live allocator identities; they never select a species or evidence pair. */
  readonly allocator: Readonly<{
    readonly lungeSlot: number;
    readonly rockSlot: number;
    readonly hitsplatSlot: number;
    readonly fragmentSlots: readonly [number, number, number, number];
    readonly shakeTaskSlot: number;
  }>;
  readonly gameplayRng: number;
  readonly immutableGameplayState?: unknown;
}

export interface RockBlastSourceCursor {
  readonly active: boolean;
  readonly offset: 0 | 3 | 6 | 19 | 42 | 155 | 156;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly command:
    | "load_rocks"
    | "load_impact"
    | "lunge_delay"
    | "rock_projectile"
    | "impact_package"
    | "end";
}

export interface RockBlastLunge {
  readonly kind: "lunge";
  readonly slot: number;
  readonly callback: "TranslateSpriteLinearById" | "ReverseHorizontalLungeDirection" | "DestroyAnimSprite";
  readonly invisible: true;
  readonly localAge: number;
  readonly attackerX2: number;
}

export interface RockBlastRock {
  readonly kind: "rock";
  readonly slot: number;
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroyAnimSprite";
  /** sAnims_BasicRock[0] / sAnim_Rock_Biggest / tiles 0..15. */
  readonly basicRockCell: 0;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrix: readonly [number, number, number, number];
  readonly sourceCreationOrder: 0;
}

export interface RockBlastHitsplat {
  readonly kind: "hitsplat";
  readonly slot: number;
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly matrix: 303;
  readonly sourceCreationOrder: 0;
}

export interface RockBlastFragment {
  readonly kind: "fragment";
  readonly index: 0 | 1 | 2 | 3;
  readonly slot: number;
  readonly callback: "TranslateSpriteLinearFixedPoint" | "DestroySpriteAndMatrix";
  /** sAnims_FlyingRock maps 1 -> BasicRock cell 3 and 2 -> cell 4. */
  readonly flyingRockAnim: 1 | 2;
  readonly basicRockCell: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly sourceCreationOrder: 1 | 2 | 3 | 4;
}

export type RockBlastSprite = RockBlastRock | RockBlastHitsplat | RockBlastFragment;

export interface RockBlastShakeTask {
  readonly kind: "shake";
  readonly slot: number;
  readonly targetSpriteSlot: number;
  readonly callback: "AnimTask_ShakeMon_Step";
  readonly localAge: number;
  readonly x2: number;
  readonly y2: 0;
  readonly displayLag: 1;
}

export interface RockBlastFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: RockBlastSourceCursor;
  readonly lunge: RockBlastLunge | null;
  readonly sprites: readonly RockBlastSprite[];
  readonly shakeTask: RockBlastShakeTask | null;
  readonly attackerOffset: Readonly<{ readonly x2: number; readonly y2: number }>;
  readonly targetOffset: Readonly<{ readonly x2: number; readonly y2: number }>;
  readonly resources: Readonly<{
    readonly rocks: Readonly<{ readonly tag: 10058; readonly loaded: boolean }>;
    readonly impact: Readonly<{ readonly tag: 10135; readonly loaded: boolean }>;
  }>;
  readonly audio: readonly Readonly<{
    readonly age: 12 | 39;
    readonly channel: "SE1";
    readonly song: "se_m_swagger" | "se_m_rock_throw";
    readonly pan: -64 | -63 | 63;
  }>[];
  readonly gameplay: Readonly<{
    readonly rng: number;
    readonly immutableState: unknown;
    readonly changed: false;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly sprites: number;
    readonly tasks: number;
    readonly resourcesFreed: boolean;
  }>;
}

const FRAGMENTS = [
  { x: 0, y: 0, targetX: 20, targetY: 24, anim: 2, cell: 4 },
  { x: 5, y: 0, targetX: -20, targetY: 24, anim: 1, cell: 3 },
  { x: 0, y: 5, targetX: 20, targetY: -24, anim: 2, cell: 4 },
  { x: -5, y: 0, targetX: -20, targetY: -24, anim: 2, cell: 4 },
] as const;

function assertProfile(profile: Readonly<RockBlastAnimationProfile>): void {
  const slots = [
    profile.attacker.spriteSlot,
    profile.target.spriteSlot,
    profile.allocator.lungeSlot,
    profile.allocator.rockSlot,
    profile.allocator.hitsplatSlot,
    ...profile.allocator.fragmentSlots,
  ];
  if ((profile.attackerSide !== "player" && profile.attackerSide !== "opponent")
    || slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || !Number.isInteger(profile.allocator.shakeTaskSlot)
    || profile.allocator.shakeTaskSlot < 0 || profile.allocator.shakeTaskSlot >= 16) {
    throw new Error("invalid Rock Blast animation profile");
  }
}

function sourceAtAge(age: number): RockBlastSourceCursor {
  let offset: RockBlastSourceCursor["offset"];
  let wait = 0;
  let command: RockBlastSourceCursor["command"];
  if (age <= 0) { offset = 0; command = "load_rocks"; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; command = "load_impact"; }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; command = "lunge_delay"; }
  else if (age <= 11) { offset = 19; wait = Math.max(0, 10 - age); command = "lunge_delay"; }
  else if (age <= 38) { offset = 42; wait = 1; command = "rock_projectile"; }
  else if (age <= 54) { offset = 155; wait = 1; command = "impact_package"; }
  else { offset = 156; wait = 1; command = "end"; }
  const pointer = ROCK_BLAST_SOURCE_START + offset;
  return {
    active: age < ROCK_BLAST_FIRST_INACTIVE_AGE,
    offset,
    pointer,
    pointerParity: (pointer & 1) as 0 | 1,
    wait,
    command,
  };
}

function affineRockMatrix(age: number, side: RockBlastSide): readonly [number, number, number, number] {
  const localAge = age - 11;
  const angle = (Math.max(0, localAge + 1) * 5) & 0xff;
  const sine = GBA_SINE_TABLE_256[angle]!;
  const cosine = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  const signedSine = side === "player" ? sine : -sine;
  return [cosine, signedSine, -signedSine, cosine];
}

function signedLinearOffset(delta: number, callbacks: number, duration: number): number {
  return (delta * Math.min(Math.max(callbacks, 0), duration)) >> 8;
}

function rockAtAge(age: number, profile: Readonly<RockBlastAnimationProfile>): RockBlastRock | null {
  if (age < 12 || age > 37) return null;
  const direction = profile.attackerSide === "player" ? 1 : -1;
  const x = profile.attacker.battlePositionCenter.x + direction * 16;
  const y = profile.attacker.battlePositionCenter.y;
  const xDistance = profile.target.battlePositionCenter.x - x;
  const yDistance = profile.target.battlePositionCenter.y - y;
  const rawXDelta = Math.trunc(Math.abs(xDistance) * 256 / 25);
  const rawYDelta = Math.trunc(Math.abs(yDistance) * 256 / 25);
  const xDelta = xDistance < 0 ? rawXDelta | 1 : rawXDelta & ~1;
  const yDelta = yDistance < 0 ? rawYDelta | 1 : rawYDelta & ~1;
  const callbacks = Math.min(age - 11, 25);
  return {
    kind: "rock",
    slot: profile.allocator.rockSlot,
    callback: age === 37 ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup",
    basicRockCell: 0,
    x,
    y,
    x2: (xDistance < 0 ? -1 : 1) * ((xDelta * callbacks) >> 8),
    y2: (yDistance < 0 ? -1 : 1) * ((yDelta * callbacks) >> 8),
    subpriority: (profile.attackerSide === "player" ? 40 : 30) - 2,
    matrix: affineRockMatrix(age, profile.attackerSide),
    sourceCreationOrder: 0,
  };
}

function hitsplatAtAge(age: number, profile: Readonly<RockBlastAnimationProfile>): RockBlastHitsplat | null {
  if (age < 39 || age > 48) return null;
  return {
    kind: "hitsplat",
    slot: profile.allocator.hitsplatSlot,
    callback: age === 48 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    x: profile.target.effectCenter.x,
    y: profile.target.effectCenter.y,
    subpriority: (profile.attackerSide === "player" ? 40 : 30) - 3,
    matrix: 303,
    sourceCreationOrder: 0,
  };
}

function fragmentAtAge(
  age: number,
  index: 0 | 1 | 2 | 3,
  profile: Readonly<RockBlastAnimationProfile>,
): RockBlastFragment | null {
  if (age < 39 || age > 53) return null;
  const spec = FRAGMENTS[index];
  const direction = profile.attackerSide === "player" ? 1 : -1;
  const callbacks = Math.min(age - 38, 14);
  const dx = Math.trunc(spec.targetX * 256 / 14);
  const dy = Math.trunc(spec.targetY * 256 / 14);
  return {
    kind: "fragment",
    index,
    slot: profile.allocator.fragmentSlots[index],
    callback: age === 53 ? "DestroySpriteAndMatrix" : "TranslateSpriteLinearFixedPoint",
    flyingRockAnim: spec.anim,
    basicRockCell: spec.cell,
    x: profile.target.effectCenter.x + direction * spec.x,
    y: profile.target.effectCenter.y + spec.y,
    x2: signedLinearOffset(dx, callbacks, 14),
    y2: signedLinearOffset(dy, callbacks, 14),
    subpriority: (profile.attackerSide === "player" ? 40 : 30) - 2,
    sourceCreationOrder: (index + 1) as 1 | 2 | 3 | 4,
  };
}

function lungeAtAge(age: number, profile: Readonly<RockBlastAnimationProfile>): RockBlastLunge | null {
  if (age < 7 || age > 17) return null;
  const localAge = age - 7;
  return {
    kind: "lunge",
    slot: profile.allocator.lungeSlot,
    callback: age === 17
      ? "DestroyAnimSprite"
      : age === 11 ? "ReverseHorizontalLungeDirection" : "TranslateSpriteLinearById",
    invisible: true,
    localAge,
    attackerX2: age === 17 ? 0 : horizontalLungeX2AtTick(4, 6, profile.attackerSide, age - 6),
  };
}

export function rockBlastAtAge(
  age: number,
  profile: Readonly<RockBlastAnimationProfile>,
): RockBlastFrame {
  assertProfile(profile);
  const source = sourceAtAge(age);
  const lunge = lungeAtAge(age, profile);
  const rock = rockAtAge(age, profile);
  const hitsplat = hitsplatAtAge(age, profile);
  const fragments = ([0, 1, 2, 3] as const).flatMap((index) => {
    const fragment = fragmentAtAge(age, index, profile);
    return fragment ? [fragment] : [];
  });
  const shakeOffset = shakeMonOffsetAtTick(3, 0, 5, 1, age - 38);
  const shakeTask = age >= 39 && age <= 46 ? {
    kind: "shake" as const,
    slot: profile.allocator.shakeTaskSlot,
    targetSpriteSlot: profile.target.spriteSlot,
    callback: "AnimTask_ShakeMon_Step" as const,
    localAge: age - 39,
    x2: shakeOffset.x2,
    y2: 0 as const,
    displayLag: 1 as const,
  } : null;
  const attackerOffset = age < 7
    ? { x2: profile.attacker.initialX2, y2: profile.attacker.initialY2 }
    : { x2: lunge?.attackerX2 ?? 0, y2: 0 };
  const targetOffset = age < 39
    ? { x2: profile.target.initialX2, y2: profile.target.initialY2 }
    : { x2: shakeTask?.x2 ?? 0, y2: 0 };
  const sprites: RockBlastSprite[] = [
    ...(rock ? [rock] : []),
    ...(hitsplat ? [hitsplat] : []),
    ...fragments,
  ];
  const attackerPan = profile.attackerSide === "player" ? -64 as const : 63 as const;
  const targetPan = profile.attackerSide === "player" ? 63 as const : -63 as const;
  const audio = age === 12
    ? [{ age: 12 as const, channel: "SE1" as const, song: "se_m_swagger" as const, pan: attackerPan }]
    : age === 39
      ? [{ age: 39 as const, channel: "SE1" as const, song: "se_m_rock_throw" as const, pan: targetPan }]
      : [];
  return {
    age,
    active: source.active,
    source,
    lunge,
    sprites,
    shakeTask,
    attackerOffset,
    targetOffset,
    resources: {
      rocks: { tag: ROCK_BLAST_ROCKS_TAG, loaded: age >= 1 && age < ROCK_BLAST_FIRST_INACTIVE_AGE },
      impact: { tag: ROCK_BLAST_IMPACT_TAG, loaded: age >= 4 && age < ROCK_BLAST_FIRST_INACTIVE_AGE },
    },
    audio,
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState, changed: false },
    cleanup: {
      firstInactive: age === ROCK_BLAST_FIRST_INACTIVE_AGE,
      sprites: sprites.length,
      tasks: Number(shakeTask !== null),
      resourcesFreed: age >= ROCK_BLAST_FIRST_INACTIVE_AGE,
    },
  };
}

/**
 * Move-owned ShakeMon scanout for the first impact body.  The dense bilateral
 * hardware maps place the synchronous creation write on displayed age 40,
 * then follow the source task's ordinary on/off sequence.  This is separate
 * from the reducer's probe-point RAM value and is never inferred from another
 * move's ShakeMon invocation.
 */
export function rockBlastDisplayedTargetOffsetAtAge(age: number): Readonly<{ x2: number; y2: 0 }> {
  const offset = shakeMonOffsetAtTick(3, 0, 5, 1, age - 40);
  return { x2: offset.x2, y2: 0 };
}
