import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick, type ShakeMon2Offset } from "./shakeMon2.ts";

export type LeafBladeSide = "player" | "opponent";

export interface LeafBladeTargetGeometry {
  /** `GetBattlerSpriteCoord(target, BATTLER_COORD_X_2/Y_PIC_OFFSET)`. */
  readonly pictureOffset: Readonly<{ x: number; y: number }>;
  /** `GetBattlerSpriteCoordAttr(target, WIDTH/HEIGHT)`. */
  readonly width: number;
  readonly height: number;
  /** `GetBattlerSpriteSubpriority(target)`. */
  readonly subpriority: number;
}

export interface LeafBladeSprite {
  readonly kind: "blade" | "trail";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly animation: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly tileCell: 4 | 5 | 7 | 8;
  readonly hFlip: boolean;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  readonly callback: "SpriteCallbackDummy" | "AnimTask_LeafBlade_Step2_Callback";
  readonly blinkCounter: number;
  readonly blinkCycles: number;
}

export type LeafBladeTaskState =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 0xff;

export interface LeafBladeSoundEvent {
  readonly song: "SE_M_CUT" | "SE_M_LEER";
  readonly pan: number;
  readonly player: "SE1";
}

export interface LeafBladeState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{ leaf: boolean; crossImpact: boolean }>;
  readonly scriptOffset: 0 | 3 | 6 | 15 | 38 | 61 | 82 | 85 | 90 | 126 | 130;
  readonly taskState: LeafBladeTaskState | null;
  readonly taskChildCount: number;
  readonly sprites: readonly LeafBladeSprite[];
  readonly targetOffset: ShakeMon2Offset;
  readonly shakeTaskActive: boolean;
  readonly crossImpact: Readonly<{
    x: number;
    y: number;
    remaining: number;
    callback: "WaitAnimForDuration" | "DestroyAnimSprite";
  }> | null;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly updateMonBgTaskActive: boolean;
  readonly clearMonBgTaskActive: boolean;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly soundEvents: readonly LeafBladeSoundEvent[];
}

const ARC_FIRST_AGE = 7;
const ARC_STRIDE = 18;
const ARC_COUNT = 7;
const ARC_CALLBACKS = 10;
const TRAILS_PER_ARC = 11;
const LEAF_TASK_LAST_AGE = 142;
const FIRST_INACTIVE_AGE = 223;
const ANIMATION = [0, 1, 2, 3, 4, 5, 6] as const;
const TILE_CELL = [7, 8, 5, 7, 4, 4, 7] as const;
const H_FLIP = [false, false, false, true, false, true, false] as const;
const TRAIL_OAM_SLOTS = [4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16] as const;

function trailSpawnAge(spawnIndex: number): number {
  return ARC_FIRST_AGE
    + Math.floor(spawnIndex / TRAILS_PER_ARC) * ARC_STRIDE
    + spawnIndex % TRAILS_PER_ARC;
}

function trailLastAge(spawnIndex: number): number {
  // Step2 begins alternate trails with data[0] 0/1. Both destroy after the
  // ninth invisible toggle, yielding alternating 18/17-display lifetimes.
  return trailSpawnAge(spawnIndex) + ((spawnIndex & 1) === 0 ? 17 : 16);
}

function buildTrailSlots(): readonly number[] {
  const assigned: number[] = [];
  for (let spawnIndex = 0; spawnIndex < ARC_COUNT * TRAILS_PER_ARC; spawnIndex += 1) {
    const age = trailSpawnAge(spawnIndex);
    const occupied = new Set(assigned.filter((_, prior) => trailLastAge(prior) >= age));
    const slot = TRAIL_OAM_SLOTS.find((candidate) => !occupied.has(candidate));
    if (slot === undefined) throw new Error("Leaf Blade exhausted its source OAM slots");
    assigned.push(slot);
  }
  return assigned;
}

const TRAIL_SLOT = buildTrailSlots();

interface Arc {
  readonly start: Readonly<{ x: number; y: number }>;
  readonly target: Readonly<{ x: number; y: number }>;
  readonly factor: 8 | -8;
  readonly subpriority: number;
}

function sine(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

function arcOffset(arc: Readonly<Arc>, callbacks: number): Readonly<{ x: number; y: number }> {
  const xDelta = linearTranslationDeltaQ8(arc.target.x - arc.start.x, ARC_CALLBACKS);
  const yDelta = linearTranslationDeltaQ8(arc.target.y - arc.start.y, ARC_CALLBACKS);
  const n = Math.max(0, Math.min(callbacks, ARC_CALLBACKS));
  const phase = Math.trunc(0x8000 / ARC_CALLBACKS) * n;
  return {
    x: linearTranslationOffsetAfterCallbacks(xDelta, n, ARC_CALLBACKS),
    y: linearTranslationOffsetAfterCallbacks(yDelta, n, ARC_CALLBACKS)
      + sine(phase >> 8, arc.factor),
  };
}

/**
 * Source waypoints for `AnimTask_LeafBlade` states 0..12. Each new arc starts
 * at the preceding Q8.8 arc's actual truncated endpoint, exactly as the C
 * task's `sprite->x += sprite->x2` transition does.
 */
function arcsFor(
  targetSide: LeafBladeSide,
  geometry: Readonly<LeafBladeTargetGeometry>,
): readonly Arc[] {
  const side = targetSide === "opponent" ? 1 : -1;
  const { x, y } = geometry.pictureOffset;
  const halfWidth = geometry.width / 2 + 10;
  const halfHeight = geometry.height / 2 + 10;
  const outerY = 56 - side * 64;
  const outer = { x: y - outerY + x, y: outerY };
  const requested = [
    { x: x - halfWidth * side, y: y + halfHeight * side },
    { x, y },
    { x: x - halfWidth * side, y: y - halfHeight * side },
    { x: x + halfWidth * side, y: y + halfHeight * side },
    { x, y },
    { x: x - halfWidth * side, y: y + halfHeight * side },
    outer,
  ];
  const priorityDelta = [0, 2, 2, 0, 2, 2, 0] as const;
  const arcs: Arc[] = [];
  let start = outer;
  for (let index = 0; index < ARC_COUNT; index += 1) {
    const target = requested[index]!;
    const arc: Arc = {
      start,
      target,
      factor: target.y < start.y ? -8 : 8,
      subpriority: geometry.subpriority - 1 + priorityDelta[index]!,
    };
    arcs.push(arc);
    const terminal = arcOffset(arc, ARC_CALLBACKS);
    start = { x: start.x + terminal.x, y: start.y + terminal.y };
  }
  return arcs;
}

function spriteShape(
  kind: LeafBladeSprite["kind"],
  spawnIndex: number,
  arcIndex: number,
  position: Readonly<{ x: number; y: number }>,
  subpriority: number,
  elapsed = 0,
  animationJustStarted = false,
): LeafBladeSprite {
  const seed = kind === "trail" ? spawnIndex & 1 : 0;
  const blinkCycles = kind === "trail" ? Math.floor((seed + elapsed) / 2) : 0;
  // StartSpriteAnim changes animNum immediately, but the first ANIMCMD_FRAME
  // does not replace attr2/hFlip until the following animation callback.
  // A freshly allocated trail likewise retains template animation 0 for its
  // creation callback before installing the selected arc's cell.
  const oamAnimation = kind === "trail" && elapsed === 0
    ? 0
    : animationJustStarted ? Math.max(0, arcIndex - 1) : arcIndex;
  return {
    kind,
    spawnIndex,
    oamSlot: kind === "blade" ? 3 : TRAIL_SLOT[spawnIndex]!,
    animation: ANIMATION[arcIndex]!,
    tileCell: TILE_CELL[oamAnimation]!,
    hFlip: H_FLIP[oamAnimation]!,
    x: position.x,
    y: position.y,
    subpriority,
    invisible: kind === "trail" && blinkCycles % 2 === 1,
    callback: kind === "trail"
      ? "AnimTask_LeafBlade_Step2_Callback"
      : "SpriteCallbackDummy",
    blinkCounter: kind === "trail" ? (seed + elapsed) % 2 : 0,
    blinkCycles,
  };
}

/** Move-owned scanout latch measured from both dense Leaf Blade windows. */
export function leafBladeDisplayedTargetX2AtAge(
  age: number,
  targetSide: LeafBladeSide,
): number {
  // Once target monbg is active, ShakeMon2 writes BG scroll before scanout;
  // the long impact shake therefore follows the ordinary RAM+1 display path.
  if (age >= 162 && age <= 196) {
    return shakeAtAge(age - 1).offset.x2;
  }
  for (const [start, amplitude] of [[11, 2], [63, 2], [115, 2]] as const) {
    // Task creation writes its positive first displacement after the current
    // OAM build; it reaches scanout one display before the ordinary RAM+2
    // ShakeMon2 body.
    if (age === start + 1) return amplitude;
    if (age >= start + 2) {
      const displayed = shakeAtAge(age - 2);
      if (displayed.active) return displayed.offset.x2;
    }
  }
  // ONIX's opponent-front idle holds x2=1 until the first shake task owns
  // and then neutralizes that field. Player-back ONIX starts at zero.
  return targetSide === "opponent" && age <= 11 ? 1 : 0;
}

/**
 * Front-to-back source OAM order for the Leaf Blade sprites at scanout.
 * `SortSprites` is a stable insertion sort by priority, then descending Y;
 * carrying its order across destroyed/reused slots matters when two trails
 * occupy the same point.
 */
export function leafBladeDisplayedOamOrderAtAge(
  age: number,
  attackerSide: LeafBladeSide,
  targetSide: LeafBladeSide,
  geometry: Readonly<LeafBladeTargetGeometry>,
): readonly number[] {
  const order = [3, ...TRAIL_OAM_SLOTS];
  for (let displayAge = 0; displayAge <= age; displayAge += 1) {
    const created = leafBladeAtAge(
      displayAge - 2,
      attackerSide,
      targetSide,
      geometry,
    ).sprites;
    const oam = leafBladeAtAge(
      displayAge - 1,
      attackerSide,
      targetSide,
      geometry,
    ).sprites;
    const admitted = created.flatMap((sprite) => {
      const transferred = oam.find((candidate) =>
        candidate.kind === sprite.kind
        && candidate.spawnIndex === sprite.spawnIndex
      );
      return transferred || sprite.kind === "blade" ? [{
        slot: sprite.oamSlot,
        subpriority: transferred?.subpriority ?? sprite.subpriority,
        y: sprite.y,
      }] : [];
    });
    const bySlot = new Map(admitted.map((sprite) => [sprite.slot, sprite]));
    order.sort((left, right) => {
      const leftSprite = bySlot.get(left);
      const rightSprite = bySlot.get(right);
      return (leftSprite?.subpriority ?? 0xff) - (rightSprite?.subpriority ?? 0xff)
        || (rightSprite?.y ?? 160) - (leftSprite?.y ?? 160);
    });
  }
  return order;
}

function leafSpritesAtAge(
  age: number,
  arcs: readonly Arc[],
): readonly LeafBladeSprite[] {
  const sprites: LeafBladeSprite[] = [];
  for (let arcIndex = 0; arcIndex < ARC_COUNT; arcIndex += 1) {
    const first = ARC_FIRST_AGE + arcIndex * ARC_STRIDE;
    for (let callback = 0; callback < TRAILS_PER_ARC; callback += 1) {
      const spawnAge = first + callback;
      const spawnIndex = arcIndex * TRAILS_PER_ARC + callback;
      const elapsed = age - spawnAge;
      const seed = spawnIndex & 1;
      if (elapsed < 0 || Math.floor((seed + elapsed) / 2) > 8) continue;
      const arc = arcs[arcIndex]!;
      // Step2 snapshots x+x2 before this callback advances the primary arc.
      const offset = arcOffset(arc, Math.min(callback, ARC_CALLBACKS));
      sprites.push(spriteShape(
        "trail",
        spawnIndex,
        arcIndex,
        { x: arc.start.x + offset.x, y: arc.start.y + offset.y },
        arc.subpriority,
        elapsed,
      ));
    }
  }

  const local = age - ARC_FIRST_AGE;
  if (local < 0 || age >= 125) return sprites;
  const arcIndex = Math.min(ARC_COUNT - 1, Math.floor(local / ARC_STRIDE));
  const arc = arcs[arcIndex]!;
  const within = local - arcIndex * ARC_STRIDE;
  let position: Readonly<{ x: number; y: number }>;
  if (within === 17 && arcIndex + 1 < ARC_COUNT) {
    position = arcs[arcIndex + 1]!.start;
  } else {
    const offset = arcOffset(arc, Math.min(within + 1, ARC_CALLBACKS));
    position = { x: arc.start.x + offset.x, y: arc.start.y + offset.y };
  }
  const animationIndex = within === 17 && arcIndex + 1 < ARC_COUNT
    ? arcIndex + 1
    : arcIndex;
  const activeArc = arcs[animationIndex]!;
  sprites.unshift(spriteShape(
    "blade",
    -1,
    animationIndex,
    position,
    activeArc.subpriority,
    0,
    within === 17 && arcIndex + 1 < ARC_COUNT,
  ));
  return sprites;
}

function taskStateAtAge(age: number): LeafBladeTaskState | null {
  if (age < ARC_FIRST_AGE || age > LEAF_TASK_LAST_AGE) return null;
  if (age >= 125) return 13;
  const arc = Math.floor((age - ARC_FIRST_AGE) / ARC_STRIDE);
  const within = age - (ARC_FIRST_AGE + arc * ARC_STRIDE);
  if (within <= 9) return (arc * 2) as LeafBladeTaskState;
  if (within <= 15) return 0xff;
  if (within === 16) return (arc * 2 + 1) as LeafBladeTaskState;
  return (arc * 2 + 2) as LeafBladeTaskState;
}

function scriptOffsetAtAge(age: number): LeafBladeState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 10) return 15;
  if (age <= 62) return 38;
  if (age <= 114) return 61;
  if (age <= 143) return 82;
  if (age <= 146) return 85;
  if (age <= 160) return 90;
  if (age <= 198) return 126;
  return 130;
}

function shakeAtAge(age: number): Readonly<{ active: boolean; offset: ShakeMon2Offset }> {
  for (const start of [11, 63, 115]) {
    if (age >= start && age <= start + 13) {
      return {
        active: true,
        offset: shakeMon2OffsetAtTick(2, 0, 8, 1, age - start + 1),
      };
    }
  }
  if (age >= 161 && age <= 194) {
    return {
      active: true,
      offset: shakeMon2OffsetAtTick(8, 0, 18, 1, age - 161 + 1),
    };
  }
  return { active: false, offset: { x2: 0, y2: 0 } };
}

/**
 * Pure source-relative reducer for the complete Move_LEAF_BLADE envelope.
 * Age zero is the first LEAF load display and age 223 is first inactive
 * cleanup. It contains no capture/framebuffer lookup and derives every blade
 * and trail from the seven source arc states and callback counters.
 */
export function leafBladeAtAge(
  age: number,
  attackerSide: LeafBladeSide,
  targetSide: LeafBladeSide,
  geometry: Readonly<LeafBladeTargetGeometry>,
): LeafBladeState {
  if (attackerSide === targetSide) {
    throw new Error("Leaf Blade attacker and target must occupy opposite sides");
  }
  const sprites = leafSpritesAtAge(age, arcsFor(targetSide, geometry));
  const shake = shakeAtAge(age);
  const impactAge = age - 161;
  const crossImpact = impactAge >= 0 && impactAge <= 36
    ? {
        x: geometry.pictureOffset.x,
        y: geometry.pictureOffset.y,
        remaining: Math.max(0, 35 - impactAge),
        callback: impactAge === 36
          ? "DestroyAnimSprite" as const
          : "WaitAnimForDuration" as const,
      }
    : null;
  const pan = attackerSide === "player" ? 63 : -63;
  const soundEvents: LeafBladeSoundEvent[] = [];
  if ([11, 63, 115].includes(age)) {
    soundEvents.push({ song: "SE_M_CUT", pan, player: "SE1" });
  } else if (age === 161) {
    soundEvents.push({ song: "SE_M_LEER", pan, player: "SE1" });
  }
  const taskState = taskStateAtAge(age);
  const taskChildCount = sprites.filter((sprite) => sprite.kind === "trail").length;
  return {
    active: age >= 0 && age < FIRST_INACTIVE_AGE,
    assetsLoaded: {
      leaf: age >= 1 && age < FIRST_INACTIVE_AGE,
      crossImpact: age >= 4 && age < FIRST_INACTIVE_AGE,
    },
    scriptOffset: scriptOffsetAtAge(age),
    taskState,
    taskChildCount,
    sprites,
    targetOffset: shake.offset,
    shakeTaskActive: shake.active,
    crossImpact,
    targetMonbg: age >= 144 && age <= 201,
    alpha: age >= 147 && age <= 198 ? { eva: 12, evb: 8 } : null,
    updateMonBgTaskActive: age >= 144 && age <= 201,
    clearMonBgTaskActive: age >= 199 && age <= 201,
    visualTaskCount: Number(taskState !== null) + Number(shake.active) + Number(crossImpact !== null),
    soundTaskCount: 0,
    soundEvents,
  };
}
