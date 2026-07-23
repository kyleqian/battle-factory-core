import { calculateBaseDamage, NEUTRAL_STAT_STAGES } from "./damageCalc.ts";
import { rockSlideOpponentHp } from "./battleMenu.ts";
import { getWhoStrikesFirst } from "./turnOrder.ts";

/**
 * Battle 2 turn 1 is anchored to the real A-confirm edge, never to an
 * absolute trace tick.  Canonical frame citations below are the accepted
 * confirm=33071 replay in docs/battle2-opening-notes.md.
 */
export const BATTLE2_ROCK_SLIDE_MOVE_ID = 157;
export const BATTLE2_SAND_ATTACK_MOVE_ID = 28;
export const BATTLE2_ROCK_SLIDE_DAMAGE = 28;
export const BATTLE2_KABUTO_START_HP = 91;
export const BATTLE2_KABUTO_END_HP = 63;

export const BATTLE2_TURN1_CURRENT_MOVE_DELAY = 7; // 33078
export const BATTLE2_TURN1_ACCURACY_RNG_DELAY = 11; // call at 33082
export const BATTLE2_TURN1_PP_COMMIT_DELAY = 36; // 33107
export const BATTLE2_TURN1_BASE_DAMAGE_DELAY = 37; // 33108
export const BATTLE2_TURN1_STAB_DAMAGE_DELAY = 38; // 33109
export const BATTLE2_TURN1_SPREAD_RNG_DELAY = 38; // call at 33109
export const BATTLE2_TURN1_SECONDARY_RNG_DELAY = 252; // call at 33323
export const BATTLE2_TURN1_HP_COMMIT_DELAY = 247; // rendered/stable 33318
export const BATTLE2_TURN1_LAST_ONIX_FRAME_DELAY = 260; // 33331
export const BATTLE2_TURN1_OPPONENT_HANDOFF_DELAY = 261; // 33332

/**
 * Battle 1's ROCK SLIDE mechanisms begin 380 frames later because GROVYLE
 * uses DOUBLE TEAM first.  Supplying this rebased press to the existing
 * pure rock/shake/hit/drain helpers preserves their proven internal clocks
 * while placing the direct, ONIX-first animation on Battle 2's timeline.
 */
export const BATTLE2_ROCK_SLIDE_REUSE_SHIFT = 380;

export function battle2RockSlideMechanismPressTick(confirmTick: number): number {
  return confirmTick - BATTLE2_ROCK_SLIDE_REUSE_SHIFT;
}

export function battle2Turn1RngCalls(frame: number, confirmTick: number): number {
  const age = frame - confirmTick;
  if (age >= BATTLE2_TURN1_SECONDARY_RNG_DELAY) return 3;
  if (age >= BATTLE2_TURN1_SPREAD_RNG_DELAY) return 2;
  if (age >= BATTLE2_TURN1_ACCURACY_RNG_DELAY) return 1;
  return 0;
}

export function battle2Turn1Order(): readonly [0 | 1, 0 | 1] {
  const onix = { speed: 76, speedStage: 6, movePriority: 0 };
  const kabuto = { speed: 61, speedStage: 6, movePriority: 0 };
  return getWhoStrikesFirst(onix, kabuto, 0) === 0 ? [0, 1] : [1, 0];
}

export function battle2RockSlideDamage(): {
  base: number;
  afterStab: number;
  final: number;
  isCritical: false;
} {
  const base = calculateBaseDamage({
    attacker: {
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      level: 50,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
      statStages: NEUTRAL_STAT_STAGES,
    },
    defender: {
      attack: 118,
      defense: 96,
      spAttack: 93,
      spDefense: 51,
      level: 50,
      types: ["TYPE_ROCK", "TYPE_WATER"],
      statStages: NEUTRAL_STAT_STAGES,
      ability: "ABILITY_BATTLE_ARMOR",
    },
    movePower: 75,
    moveType: "TYPE_ROCK",
    isCriticalHit: false,
  });
  const afterStab = Math.trunc((base * 15) / 10);
  return { base, afterStab, final: BATTLE2_ROCK_SLIDE_DAMAGE, isCritical: false };
}

export interface Battle2Turn1State {
  age: number;
  turnOrder: readonly [0 | 1, 0 | 1];
  attacker: 0;
  currentMove: 0 | 157;
  onixRockSlidePp: 9 | 10;
  rngCalls: 0 | 1 | 2 | 3;
  moveDamage: 8 | 19 | 28;
  critMultiplier: 1;
  accuracyHit: boolean | null;
  secondaryChecked: boolean;
  flinched: false;
  kabutoDisplayHp: number;
  kabutoHp: 63 | 91;
  opponentHandoffReady: boolean;
}

export function battle2Turn1State(frame: number, confirmTick: number): Battle2Turn1State {
  const age = frame - confirmTick;
  const mechanismPress = battle2RockSlideMechanismPressTick(confirmTick);
  const rngCalls = battle2Turn1RngCalls(frame, confirmTick) as 0 | 1 | 2 | 3;
  const damage = battle2RockSlideDamage();
  return {
    age,
    turnOrder: battle2Turn1Order(),
    attacker: 0,
    currentMove: age >= BATTLE2_TURN1_CURRENT_MOVE_DELAY ? BATTLE2_ROCK_SLIDE_MOVE_ID : 0,
    onixRockSlidePp: age >= BATTLE2_TURN1_PP_COMMIT_DELAY ? 9 : 10,
    rngCalls,
    moveDamage: (
      age >= BATTLE2_TURN1_STAB_DAMAGE_DELAY
        ? damage.final
        : age >= BATTLE2_TURN1_BASE_DAMAGE_DELAY
          ? damage.base
          : 8
    ) as 8 | 19 | 28,
    critMultiplier: 1,
    accuracyHit: rngCalls >= 1 ? true : null,
    secondaryChecked: rngCalls >= 3,
    flinched: false,
    kabutoDisplayHp: rockSlideOpponentHp(
      frame,
      mechanismPress,
      BATTLE2_KABUTO_START_HP,
      BATTLE2_KABUTO_END_HP,
    ),
    kabutoHp: age >= BATTLE2_TURN1_HP_COMMIT_DELAY ? 63 : 91,
    opponentHandoffReady: age >= BATTLE2_TURN1_OPPONENT_HANDOFF_DELAY,
  };
}
