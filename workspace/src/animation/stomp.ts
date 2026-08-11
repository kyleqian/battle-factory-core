export type StompSide = "player" | "opponent";

export interface StompFoot {
  /** Sprite centre written by `InitSpritePosToAnimTarget`. */
  readonly x: number;
  readonly y: number;
  /** `AnimStompFoot`'s source-owned linear-translation offset. */
  readonly y2: number;
}

export interface StompState {
  readonly active: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  /** `monbg ANIM_TARGET`'s measured active display interval. */
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly foot: StompFoot | null;
  readonly hitsplat: Readonly<{ x: number; y: number; matrix: 303 }> | null;
  /** Source task/OAM result, not battle damage or flinch state. */
  readonly targetOffset: Readonly<{ x2: 0; y2: 0 | 4 }>;
  readonly sound: "SE_M_DOUBLE_TEAM" | "SE_M_MEGA_KICK2" | null;
  readonly soundPanSide: StompSide | null;
}

/** First pointer-bounded `Move_STOMP` display through inactive cleanup. */
export const STOMP_FRAME_COUNT = 67;

function footY2AtAge(age: number): number {
  // `AnimStompFoot_Step` waits 15 callbacks, then starts the source's six
  // Q8.8 translation callbacks from target Y-32 to Y.  The ROM's 32/6
  // accumulator rounds toward zero: 5,10,15,21,26,31; its last callback
  // holds the 31px result while `AnimStompFoot_End` waits fifteen frames.
  if (age < 26) return 0;
  return ([5, 10, 15, 21, 26, 31] as const)[Math.min(age - 26, 5)]!;
}

function targetShakeAtAge(age: number): 0 | 4 {
  // The script creates `AnimTask_ShakeMon(target, 0,4,9,1)` after the task
  // pass. Its initialization then traverses the target-monbg/OAM handoff;
  // the measured source-visible writes are paired at 33..46. This is local
  // to Stomp's creation point, rather than an absolute frame table.
  return age >= 33 && age <= 46 && Math.floor((age - 33) / 2) % 2 === 0
    ? 4
    : 0;
}

/** Pure source-relative `Move_STOMP`; gameplay effects remain engine-owned. */
export function stompAtAge(
  age: number,
  targetSide: StompSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): StompState {
  return {
    active: age >= 0 && age < STOMP_FRAME_COUNT - 1,
    handsAndFeetLoaded: age >= 1 && age < STOMP_FRAME_COUNT - 1,
    impactLoaded: age >= 4 && age < STOMP_FRAME_COUNT - 1,
    targetOnMonBg: age >= 7 && age <= 50,
    alpha: age >= 10 && age <= 50 ? { eva: 12, evb: 8 } : null,
    foot: age >= 10 && age <= 49
      ? { x: targetCenter.x, y: targetCenter.y - 32, y2: footY2AtAge(age) }
      : null,
    hitsplat: age >= 31 && age <= 40
      ? { x: targetCenter.x, y: targetCenter.y - 8, matrix: 303 }
      : null,
    targetOffset: { x2: 0, y2: targetShakeAtAge(age) },
    sound: age === 10 ? "SE_M_DOUBLE_TEAM" : age === 31 ? "SE_M_MEGA_KICK2" : null,
    soundPanSide: age === 10 || age === 31 ? targetSide : null,
  };
}
