/**
 * Source-relative MOVE_ANCIENT_POWER body.
 *
 * This module deliberately stops at the move-owned component boundary.  It
 * ports the literal rock callback and task schedules without owning damage,
 * RNG, turn order, or controller state.  The Scene-ON compositor remains
 * open until a Baltoy back/front seam can be checked against both dense raw
 * RGB windows.
 *
 * Source: reference/pokeemerald/data/battle_anim_scripts.s:6875-6906 and
 * reference/pokeemerald/src/battle_anim_rock.c:565-582.
 */
import {
  shakeMon2DisplayedOffsetAtAge,
  type ShakeMon2Offset,
} from "./shakeMon2.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";

export const ANCIENT_POWER_MOVE_ID = 246;
export const ANCIENT_POWER_ATTACKER_SPECIES_ID = 318;
export const ANCIENT_POWER_SOURCE_SET_ID = 75;

export interface AncientPowerRockSpec {
  /** `InitSpritePosToAnimAttacker`'s signed initial x argument. */
  readonly xOffset: number;
  /** `StartSpriteAnim` argument, indexing `sAnims_BasicRock`. */
  readonly animNum: 1 | 2 | 3 | 4 | 5;
  /** `AnimRaiseSprite` terminal y offset. */
  readonly terminalY: number;
  /** `AnimRaiseSprite` linear duration. */
  readonly duration: number;
  /** First displayed age with this sprite allocated by the script. */
  readonly spawnAge: number;
  /** `gSprites` slot allocated by this fixed three-Pokémon Scene-ON setup. */
  readonly sourceSlot: number;
  /** Stable `sSpriteOrder` seed within its createsprite burst. */
  readonly sourceOamSeedOrder: number;
}

/** The ten literal createsprite calls, grouped as 6 + 2 + 2 by the script. */
export const ANCIENT_POWER_ROCKS: readonly AncientPowerRockSpec[] = Object.freeze([
  { xOffset: 20, animNum: 2, terminalY: -48, duration: 50, spawnAge: 10, sourceSlot: 4, sourceOamSeedOrder: 0 },
  { xOffset: 0, animNum: 5, terminalY: -38, duration: 25, spawnAge: 10, sourceSlot: 5, sourceOamSeedOrder: 5 },
  { xOffset: 32, animNum: 3, terminalY: -28, duration: 40, spawnAge: 10, sourceSlot: 7, sourceOamSeedOrder: 4 },
  { xOffset: -20, animNum: 2, terminalY: -48, duration: 50, spawnAge: 10, sourceSlot: 9, sourceOamSeedOrder: 3 },
  { xOffset: 20, animNum: 1, terminalY: -28, duration: 60, spawnAge: 10, sourceSlot: 10, sourceOamSeedOrder: 2 },
  { xOffset: 0, animNum: 4, terminalY: -28, duration: 30, spawnAge: 10, sourceSlot: 11, sourceOamSeedOrder: 1 },
  { xOffset: 15, animNum: 5, terminalY: -48, duration: 25, spawnAge: 22, sourceSlot: 3, sourceOamSeedOrder: 0 },
  { xOffset: -10, animNum: 4, terminalY: -42, duration: 30, spawnAge: 22, sourceSlot: 12, sourceOamSeedOrder: 1 },
  { xOffset: 0, animNum: 5, terminalY: -42, duration: 25, spawnAge: 34, sourceSlot: 13, sourceOamSeedOrder: 1 },
  { xOffset: -25, animNum: 4, terminalY: -48, duration: 30, spawnAge: 34, sourceSlot: 14, sourceOamSeedOrder: 0 },
]);

export interface AncientPowerGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly attackerBattlePositionCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSide: "player" | "opponent";
}

export interface AncientPowerRockState extends AncientPowerRockSpec {
  /** Index of the literal `createsprite` command in Move_ANCIENT_POWER. */
  readonly sourceIndex: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly y2: number;
  /** Source `sSpriteOrder` rank after `SortSprites` for this source row. */
  readonly oamOrder: number;
}

type UnorderedAncientPowerRockState = Omit<AncientPowerRockState, "oamOrder">;

function signedInitialX(xOffset: number, side: AncientPowerGeometry["attackerSide"]): number {
  return side === "opponent" ? -xOffset : xOffset;
}

/**
 * `StartAnimLinearTranslation` uses a signed Q8.8 delta and emits the
 * preceding integer pixel at the callback pass.  The source row containing
 * the createsprite has already run that first callback, hence `step=1` at
 * `age === spawnAge`; this reproduces the observed 245/389/... data values.
 */
function raiseY2(spec: AncientPowerRockSpec, age: number): number {
  const step = age - spec.spawnAge + 1;
  if (step <= 0) return 0;
  // InitAnimLinearTranslation first truncates the Q8.8 delta, then the
  // callback truncates the accumulated magnitude back toward zero.
  const delta = Math.trunc((Math.abs(spec.terminalY) * 256) / spec.duration) | 1;
  const magnitude = (delta * Math.min(step, spec.duration)) >> 8;
  const y2 = spec.terminalY < 0
    ? -magnitude
    : magnitude;
  return y2 === 0 ? 0 : y2;
}

function unorderedAncientPowerRockState(
  index: number,
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): UnorderedAncientPowerRockState | null {
  const spec = ANCIENT_POWER_ROCKS[index];
  if (!spec || age < spec.spawnAge || age > spec.spawnAge + spec.duration) return null;
  const x = geometry.attackerCenter.x + signedInitialX(spec.xOffset, geometry.attackerSide);
  const y = geometry.attackerBattlePositionCenter.y + 32;
  return { ...spec, sourceIndex: index, centerX: x, centerY: y, y2: raiseY2(spec, age) };
}

/**
 * Source `SortSprites` is stable: each createsprite burst enters the prior
 * `sSpriteOrder` in its observed seed order, then equal-priority rocks are
 * insertion-sorted by OAM y descending.  This carries source OAM ordering as
 * data, rather than making a compositor decision from a displayed frame age.
 */
function sourceRockOrderAtAge(
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): readonly number[] {
  if (age < 0) return [];
  let order: number[] = [];
  for (let sourceAge = 0; sourceAge <= age; sourceAge += 1) {
    const created = ANCIENT_POWER_ROCKS
      .map((spec, index) => ({ spec, index }))
      .filter(({ spec }) => spec.spawnAge === sourceAge)
      .sort((a, b) => a.spec.sourceOamSeedOrder - b.spec.sourceOamSeedOrder)
      .map(({ index }) => index);
    order = [...created, ...order].filter((index) =>
      unorderedAncientPowerRockState(index, sourceAge, geometry) !== null,
    );
    // This is the source insertion-sort predicate from `sprite.c`: stable
    // among equal Y, and the larger signed OAM y goes into the earlier rank.
    for (let i = 1; i < order.length; i += 1) {
      const candidate = order[i]!;
      const candidateY = unorderedAncientPowerRockState(candidate, sourceAge, geometry)!.centerY
        + unorderedAncientPowerRockState(candidate, sourceAge, geometry)!.y2;
      let cursor = i;
      while (cursor > 0) {
        const prior = order[cursor - 1]!;
        const priorState = unorderedAncientPowerRockState(prior, sourceAge, geometry)!;
        if (priorState.centerY + priorState.y2 >= candidateY) break;
        order[cursor] = prior;
        cursor -= 1;
      }
      order[cursor] = candidate;
    }
  }
  return order;
}

export function ancientPowerRockState(
  index: number,
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): AncientPowerRockState | null {
  const state = unorderedAncientPowerRockState(index, age, geometry);
  if (!state) return null;
  const oamOrder = sourceRockOrderAtAge(age, geometry).indexOf(index);
  return { ...state, oamOrder };
}

export function ancientPowerRocksAtAge(
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): readonly AncientPowerRockState[] {
  const order = sourceRockOrderAtAge(age, geometry);
  return ANCIENT_POWER_ROCKS.flatMap((_, index) => {
    const state = unorderedAncientPowerRockState(index, age, geometry);
    return state ? [state] : [];
  }).map((state) => ({ ...state, oamOrder: order.indexOf(state.sourceIndex) }));
}

/** Draw from highest to lowest hardware OAM index, so lower source ranks win. */
export function ancientPowerRockPainterOrder(
  rocks: readonly AncientPowerRockState[],
): readonly AncientPowerRockState[] {
  return rocks.slice().sort((a, b) => b.oamOrder - a.oamOrder);
}

export interface AncientPowerTaskSchedule {
  readonly creationAge: number;
  readonly xOffset: number;
  readonly yOffset: number;
  readonly numTimes: number;
  readonly frameDelay: number;
}

export const ANCIENT_POWER_ATTACKER_SHAKE: Readonly<AncientPowerTaskSchedule> = Object.freeze({
  creationAge: 10,
  xOffset: 1,
  yOffset: 0,
  numTimes: 30,
  frameDelay: 1,
});

export const ANCIENT_POWER_TARGET_SHAKE: Readonly<AncientPowerTaskSchedule> = Object.freeze({
  creationAge: 77,
  xOffset: 3,
  yOffset: 0,
  numTimes: 6,
  frameDelay: 1,
});

export function ancientPowerShakeAtAge(
  age: number,
  schedule: Readonly<AncientPowerTaskSchedule>,
): ShakeMon2Offset {
  return shakeMon2DisplayedOffsetAtAge(
    schedule.xOffset,
    schedule.yOffset,
    schedule.numTimes,
    schedule.frameDelay,
    age,
    schedule.creationAge,
  );
}

/** Direct `gSprites` state after the source task scheduler, before OAM latch. */
export function ancientPowerLiveShakeMon2AtAge(
  age: number,
  schedule: Readonly<AncientPowerTaskSchedule>,
): ShakeMon2Offset {
  const elapsed = age - schedule.creationAge;
  const finalLiveAge = schedule.numTimes * 2 - 3;
  if (elapsed < 0 || elapsed > finalLiveAge) return { x2: 0, y2: 0 };
  const sign = elapsed % 4 < 2 ? -1 : 1;
  return { x2: sign * schedule.xOffset, y2: sign * schedule.yOffset };
}

/** The two source-side helpers temporarily move the attacker by sixteen px. */
export const ANCIENT_POWER_SLIDE_TO_OFFSET_AGE = 73;
export const ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE = 89;

/** Source-side direct battler offsets; scanout state deliberately remains in `ancientPowerAtAge`. */
export function ancientPowerLiveAttackerX2AtAge(
  age: number,
  side: AncientPowerGeometry["attackerSide"],
): number {
  if (age <= 67) return ancientPowerLiveShakeMon2AtAge(age, ANCIENT_POWER_ATTACKER_SHAKE).x2;
  if (age >= 72 && age <= 76) {
    return slideMonToOffsetAtTick({
      battlerSide: side, targetXOffset: 16, targetYOffset: 0, mirrorVertical: false, durationTicks: 4,
    }, age - 72).x2;
  }
  if (age >= 77 && age <= 87) return side === "player" ? 16 : -16;
  if (age >= 88 && age <= 94) {
    return slideMonToOriginalPosAtTick({
      currentX2: side === "player" ? 16 : -16, currentY2: 0, axisSnapMode: 0, durationTicks: 7,
    }, age - 88).x2;
  }
  return 0;
}

export function ancientPowerLiveTargetX2AtAge(age: number): number {
  return ancientPowerLiveShakeMon2AtAge(age, ANCIENT_POWER_TARGET_SHAKE).x2;
}

export function ancientPowerLiveMonBgActiveAtAge(age: number): boolean {
  return age >= 7 && age < 96;
}

export function ancientPowerLiveBg3YAtAge(age: number): number {
  if (age < 11 || age > 19) return 0;
  return Math.floor((age - 11) / 2) % 2 === 0 ? -4 : 0;
}

export interface AncientPowerState {
  readonly age: number;
  readonly active: boolean;
  readonly rocks: readonly AncientPowerRockState[];
  /** Direct source `gSprites` state, before the OAM scanout latch. */
  readonly sourceAttackerX2: number;
  readonly sourceTargetX2: number;
  readonly sourceBg3Y: number;
  readonly sourceMonBgActive: boolean;
  /** Displayed state after the source's respective OAM/register latches. */
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly bg3vofs: number;
  readonly monBgActive: boolean;
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly resources: Readonly<{ rocks: boolean; impact: boolean }>;
  readonly hitsplatVisible: boolean;
}

/** Complete source-relative presentation state through first inactive cleanup. */
export function ancientPowerAtAge(
  age: number,
  geometry: Readonly<AncientPowerGeometry>,
): AncientPowerState {
  const shake = ancientPowerShakeAtAge(age, ANCIENT_POWER_ATTACKER_SHAKE).x2;
  let slide = 0;
  if (age >= ANCIENT_POWER_SLIDE_TO_OFFSET_AGE) {
    slide = slideMonToOffsetAtTick({
      battlerSide: geometry.attackerSide,
      targetXOffset: 16,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, age - ANCIENT_POWER_SLIDE_TO_OFFSET_AGE).x2;
  }
  if (age >= ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE) {
    const held = geometry.attackerSide === "player" ? 16 : -16;
    slide = slideMonToOriginalPosAtTick({
      currentX2: held,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 7,
    }, age - ANCIENT_POWER_SLIDE_TO_ORIGINAL_AGE).x2;
  }
  // The invisible helper initializes at age 9. Its first -4 write is age
  // 11 and reaches BG3 scanout at 12; alternate -4/0 two-row holds follow.
  const bg3vofs = age >= 12 && age <= 20
    ? (Math.floor((age - 12) / 2) % 2 === 0 ? -4 : 0)
    : 0;
  const sourceAttackerX2 = ancientPowerLiveAttackerX2AtAge(age, geometry.attackerSide);
  const sourceTargetX2 = ancientPowerLiveTargetX2AtAge(age);
  const sourceBg3Y = ancientPowerLiveBg3YAtAge(age);
  const sourceMonBgActive = ancientPowerLiveMonBgActiveAtAge(age);
  return {
    age,
    active: age >= 0 && age < 127,
    rocks: ancientPowerRocksAtAge(age, geometry),
    sourceAttackerX2,
    sourceTargetX2,
    sourceBg3Y,
    sourceMonBgActive,
    // Both tasks run their first callback on the creation row, so their
    // move-owned scanout begins with the negative write (not the common
    // helper's positive initializer assumption).
    attackerX2: age < ANCIENT_POWER_SLIDE_TO_OFFSET_AGE ? shake : slide,
    targetX2: age >= 78 && age <= 87
      ? (Math.floor((age - 78) / 2) % 2 === 0 ? -3 : 3)
      : 0,
    bg3vofs,
    monBgActive: age >= 8 && age < 96,
    bldcnt: age >= 10 && age < 96 ? 0x3f40 : 0,
    bldalpha: age >= 10 && age < 96 ? 0x080c : 0,
    resources: { rocks: age >= 1 && age < 127, impact: age >= 4 && age < 127 },
    hitsplatVisible: age >= 77 && age <= 86,
  };
}

/** Components claimed by this reducer; shared components remain independent acceptance units. */
export const ANCIENT_POWER_COMPONENTS = Object.freeze([
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_ROCKS",
  "sprite:gAncientPowerRockSpriteTemplate",
  "sprite:gSlideMonToOffsetSpriteTemplate",
  "sprite:gSlideMonToOriginalPosSpriteTemplate",
  "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:shake_mon_or_platform",
] as const);
