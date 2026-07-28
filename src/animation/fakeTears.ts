import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  rockMonBackAndForthAtAge,
  type CharmMatrix,
  type CharmRockState,
  type CharmSide,
} from "./charm.ts";

export const FAKE_TEARS_ROCK_START_AGE = 10;
export const FAKE_TEARS_TEAR_SPAWN_AGES = [20, 30, 40, 50] as const;
export const FAKE_TEARS_SOUND_RESTART_AGES = [10, 22, 35, 48] as const;
export const FAKE_TEARS_SCRIPT_END_AGE = 86;
export const FAKE_TEARS_CLEAR_FRAME_COUNT = 4;
export const FAKE_TEARS_SOURCE_FRAME_COUNT =
  FAKE_TEARS_SCRIPT_END_AGE + 1 + FAKE_TEARS_CLEAR_FRAME_COUNT;

const TEAR_SLOTS = [[3, 4], [5, 7], [9, 10], [11, 12]] as const;

export interface FakeTearsBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

export interface FakeTearsTear {
  readonly identity: `tear-${number}`;
  readonly pair: number;
  readonly type: 0 | 1 | 2 | 3;
  readonly slot: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: CharmMatrix;
}

export interface FakeTearsState {
  readonly active: boolean;
  readonly smallBubblesLoaded: boolean;
  readonly thoughtBubbleLoaded: boolean;
  readonly musicNotesLoaded: boolean;
  readonly smallBubblesBlendY: number;
  readonly rock: CharmRockState;
  readonly tears: readonly FakeTearsTear[];
  readonly soundRestart: "SE_M_TAIL_WHIP" | null;
  readonly soundPanSide: CharmSide | null;
}

function tearMatrix(localAge: number, type: 0 | 1 | 2 | 3): CharmMatrix {
  const mirrored = type >= 2;
  const callbacks = Math.min(localAge + 1, 8);
  const rotation = mirrored
    ? -80 + callbacks * 2
    : 80 - callbacks * 2;
  const sin = GBA_SINE_TABLE_256[rotation & 0xff]!;
  const cos = GBA_SINE_TABLE_256[(rotation + 64) & 0xff]!;
  return {
    a: Math.trunc((cos * 256) / 192),
    b: Math.trunc((-sin * 256) / 192),
    c: Math.trunc((sin * 256) / 192),
    d: Math.trunc((cos * 256) / 192),
  };
}

export function fakeTearsTearAtAge(
  age: number,
  pair: number,
  typeInPair: 0 | 1,
  bounds: FakeTearsBounds,
): FakeTearsTear | null {
  const spawnAge = FAKE_TEARS_TEAR_SPAWN_AGES[pair];
  const slots = TEAR_SLOTS[pair];
  if (spawnAge === undefined || slots === undefined) return null;
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge >= 32) return null;
  const type = (pair % 2 === 0 ? typeInPair : typeInPair + 2) as 0 | 1 | 2 | 3;
  const fromRight = type < 2;
  const inset = type % 2 === 0 ? 8 : 14;
  const x = fromRight ? bounds.right - inset : bounds.left + inset;
  const y = bounds.top + (type % 2 === 0 ? 8 : 16);
  const callbacks = localAge + 1;
  const x2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(fromRight ? 20 : -20, 32),
    callbacks,
    32,
  ) || 0;
  const linearY = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(12, 32),
    callbacks,
    32,
  );
  const arcAngle = (callbacks * 4) & 0xff;
  const y2 = linearY
    + ((GBA_SINE_TABLE_256[arcAngle]! * -12) >> 8);
  return {
    identity: `tear-${pair * 2 + typeInPair}`,
    pair,
    type,
    slot: slots[typeInPair],
    localAge,
    x,
    y,
    x2,
    y2,
    matrix: tearMatrix(localAge, type),
  };
}

/**
 * Source-relative `Move_FAKE_TEARS` reducer. Age zero is the first displayed
 * SMALL_BUBBLES load. THOUGHT_BUBBLE and MUSIC_NOTES are deliberately
 * represented as load/free lifecycles: the stock script creates no sprite
 * from either tag.
 */
export function fakeTearsAtAge(
  age: number,
  attackerSide: CharmSide,
  attackerBounds: FakeTearsBounds,
): FakeTearsState {
  const tears: FakeTearsTear[] = [];
  for (let pair = 0; pair < FAKE_TEARS_TEAR_SPAWN_AGES.length; pair += 1) {
    for (const typeInPair of [0, 1] as const) {
      const tear = fakeTearsTearAtAge(age, pair, typeInPair, attackerBounds);
      if (tear) tears.push(tear);
    }
  }
  const assetsLive = age >= 0 && age <= FAKE_TEARS_SCRIPT_END_AGE;
  return {
    active: age >= 0 && age < FAKE_TEARS_SCRIPT_END_AGE,
    smallBubblesLoaded: assetsLive,
    thoughtBubbleLoaded: age >= 3 && age <= FAKE_TEARS_SCRIPT_END_AGE,
    musicNotesLoaded: age >= 6 && age <= FAKE_TEARS_SCRIPT_END_AGE,
    smallBubblesBlendY: age >= 9 && assetsLive ? 4 : 0,
    rock: rockMonBackAndForthAtAge(
      age - FAKE_TEARS_ROCK_START_AGE,
      attackerSide,
      1,
      2,
    ),
    tears,
    soundRestart: FAKE_TEARS_SOUND_RESTART_AGES.includes(age as never)
      ? "SE_M_TAIL_WHIP"
      : null,
    soundPanSide: FAKE_TEARS_SOUND_RESTART_AGES.includes(age as never)
      ? attackerSide
      : null,
  };
}
