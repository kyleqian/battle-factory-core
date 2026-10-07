/**
 * Faithful-random live adapters (D3 option (a); docs/presentation-rng.md, docs/next-adapters-prep12-random2.md §1).
 *
 * A Random2 move body draws its words from the per-battle presentation host, never from gameplay RNG, capture rows or
 * fixture builders. `tick` activates the body on its activation frame (live age 0, which is the ROM's first anim-active
 * frame A for every move here: prep12 §0.2) with the move's source draw plan, exactly once per body key; render only
 * reads the recorded words (`presentationRngBodyWords`), so a repaint never draws.
 *
 * These ids are a bucket disjoint from LIVE_MOVE_ANIMATION_IDS (scoped exact): surrogate frames are faithful random,
 * never oracle-exact (docs/animation-integration-live-status.json faithfulRandomClaim).
 */

import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import {
  activatePresentationRngBody,
  presentationRngBodyWords,
  tickPresentationRngSession,
  type PresentationRngDrawStep,
  type PresentationRngHost,
  type PresentationRngSession,
  type PresentationRngWords,
} from "./presentationRngHost.ts";

/** Source draw plans: `ageOffset` from the activation frame, `count` Random2 calls (prep12 plans.json). */
export const LIVE_MOVE_RANDOM2_PLANS: Readonly<Record<number, readonly PresentationRngDrawStep[]>> = Object.freeze({
  // Move_DOUBLE_KICK (one body per hit): AnimFistOrFootRandomPos x, y, x sign, y sign
  // (battle_anim_fight.c:487-492; script arg2 = 1 skips the :478 draw).
  24: Object.freeze([Object.freeze({ ageOffset: 10, count: 4 })]),
  // Move_ASTONISH: AnimSprayWaterDroplet x2 in one frame, (& 0x1ff, & 0x7f) per droplet (battle_anim_flying.c:1106-1107).
  310: Object.freeze([Object.freeze({ ageOffset: 31, count: 4 })]),
  // Move_THRASH: three AnimFistOrFootRandomPos sprites (args 1,10,0|1|3), 4 words each (battle_anim_fight.c:487-492).
  37: Object.freeze([7, 37, 67].map((ageOffset) => Object.freeze({ ageOffset, count: 4 }))),
  // Move_FLAIL: AnimHitSplatRandom (animation=3 skips the :1054 draw) x2 % 48 - 24, y2 % 24 - 12
  // (battle_anim_normal.c:1062-1063); AnimTask_FlailMovement draws nothing.
  175: Object.freeze([Object.freeze({ ageOffset: 49, count: 2 })]),
  // Move_WISH: 21 AnimMiniTwinklingStar, one per 3 frames from +41, (& 3 -> tile, & 7 signed -> y) each
  // (battle_anim_effects_3.c:2147, :2153).
  273: Object.freeze(Array.from({ length: 21 }, (_, i) => Object.freeze({ ageOffset: 41 + 3 * i, count: 2 }))),
  // Move_HYPER_BEAM: 52 orbs, two per frame group (+110 step 3, 26 groups), three words each: animation (% 8),
  // speed ((& 31) + 64), phase (& 0xff) (battle_anim_effects_1.c:2339-2356; prep12 s1.8).
  63: Object.freeze(Array.from({ length: 26 }, (_, g) => Object.freeze({ ageOffset: 110 + 3 * g, count: 6 }))),
  // Move_MUD_SLAP / Move_SAND_ATTACK: six AnimDirtScatter waves of five sprites, (x, y) = (Random2() & 0x1F, Random2() & 0x1F)
  // per sprite in spawn order (battle_anim_ground.c:213-214); wave rows A+9 (Mud) / A+12 (Sand), step 4 (prep17 s0.2, authoritative).
  189: Object.freeze(Array.from({ length: 6 }, (_, w) => Object.freeze({ ageOffset: 9 + 4 * w, count: 10 }))),
  28: Object.freeze(Array.from({ length: 6 }, (_, w) => Object.freeze({ ageOffset: 12 + 4 * w, count: 10 }))),
  // Move_LOVELY_KISS: four AnimPinkHeart sprites switch to AnimPinkHeart_Step on the same frame (+120) and each draws
  // `data[3] = Random2() % 180` (battle_anim_effects_2.c:3577; prep22 s B.1, plan replay == accepted animationRng 153/153).
  142: Object.freeze([Object.freeze({ ageOffset: 120, count: 4 })]),
  // Move_RAIN_DANCE: two AnimTask_CreateRaindrops tasks, 40 spawn frames (ages 18, 20, then 23 step 3 to 134) x 4 words
  // (x0, y0, x1, y1; battle_anim_water.c:495-496). The reducer replays them from the activation state alone.
  240: Object.freeze([18, 20, ...Array.from({ length: 38 }, (_, i) => 23 + 3 * i)].map((ageOffset) => Object.freeze({ ageOffset, count: 4 }))),
  // Move_WATER_PULSE: six ring emissions (ages 86, 93, 100, 101, 108, 115) x 2 words (randomY, randomX;
  // battle_anim_water.c:1574-1575). The reducer replays them from the activation state alone.
  352: Object.freeze([86, 93, 100, 101, 108, 115].map((ageOffset) => Object.freeze({ ageOffset, count: 2 }))),
});

/** Faithful-random live adapters (disjoint from LIVE_MOVE_ANIMATION_IDS). */
export const LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS: readonly number[] = Object.freeze(
  Object.keys(LIVE_MOVE_RANDOM2_PLANS).map(Number),
);

export function liveMoveRandom2Plan(request: Pick<BattleMoveAnimationRequest, "moveId">): readonly PresentationRngDrawStep[] | null {
  return LIVE_MOVE_RANDOM2_PLANS[request.moveId] ?? null;
}

/**
 * Body key: one per move-animation command of a battle (request, segment, command), so each Double Kick hit and each
 * Thrash lock-in turn is its own body with its own activation. The host is per battle, so keys need not cross battles.
 */
export function liveMovePresentationRngBodyKey(resolution: Readonly<{
  resolutionId: Readonly<{ requestId: number }>; segmentIndex: number; commandIndex: number;
}>): string {
  return `move:${resolution.resolutionId.requestId}:${resolution.segmentIndex}:${resolution.commandIndex}`;
}

/** Read-only render input: the battle's presentation host and the body's key. */
export type LiveMovePresentationRngInput = Readonly<{ host: PresentationRngHost | null; key: string }>;

/**
 * Activation (tick only, on the body's activation frame): computes the body's words from the host state and schedules
 * its draws into the stream, once per key. Moves without a Random2 plan leave the host unchanged.
 */
export function activateLiveMovePresentationRng(
  host: PresentationRngHost,
  request: Pick<BattleMoveAnimationRequest, "moveId">,
  key: string,
): PresentationRngHost {
  const plan = liveMoveRandom2Plan(request);
  return plan === null ? host : activatePresentationRngBody(host, key, plan).host;
}

/** Render lookup: the activated body's words, or null (no host / not activated: the live seam falls back). */
export function liveMovePresentationRngWords(input: LiveMovePresentationRngInput | undefined): PresentationRngWords | null {
  return input === undefined ? null : presentationRngBodyWords(input.host, input.key);
}

/**
 * The presentation seam's per-tick update (core.ts tick, after the logical frame): step the session for the presented
 * battle (`activeBattleCallStart` identity edge; null = no battle on screen), then, on the activation frame (live age
 * 0) of a presented move command with a Random2 plan, activate that body once. Reads only the presentation queue's
 * command identity and age, never gameplay RNG.
 */
export function tickLiveMovePresentationRngSession(
  session: PresentationRngSession,
  orchestrator: Readonly<{
    activeBattleCallStart?: number | null;
    battleResolutionPresentation?: BattleResolutionPresentationState | null;
  }> | null,
): PresentationRngSession {
  const stepped = tickPresentationRngSession(session, orchestrator?.activeBattleCallStart ?? null);
  const host = stepped.host;
  const resolution = orchestrator?.battleResolutionPresentation;
  if (!host || !resolution || resolution.lifecycle.phase !== "presenting" || resolution.lifecycle.phaseElapsed !== 0) {
    return stepped;
  }
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  if (command?.type !== "move-animation" || !command.animation) return stepped;
  const activated = activateLiveMovePresentationRng(host, command.animation, liveMovePresentationRngBodyKey(resolution));
  return activated === host ? stepped : Object.freeze({ ...stepped, host: activated });
}

/** AnimMiniTwinklingStar (battle_anim_effects_3.c:2147-2156): `Random2() & 3` 0 -> tile +4 else +5; `Random2() & 7`, > 3 negated. */
export function miniTwinklingStarFromWords(tileWord: number, yWord: number): Readonly<{ tileOffset: 4 | 5; yOffset: number }> {
  const y = yWord & 7;
  return { tileOffset: (tileWord & 3) === 0 ? 4 : 5, yOffset: y > 3 ? -y : y };
}

/** AnimHyperBeamOrb's three words per orb (battle_anim_effects_1.c:2339-2356): StartSpriteAnim(% 8), speed (& 31) + 64, phase & 0xff. */
export function hyperBeamOrbFromWords(animationWord: number, speedWord: number, phaseWord: number):
  Readonly<{ animation: number; speed: number; phase: number }> {
  return { animation: animationWord % 8, speed: (speedWord & 31) + 64, phase: phaseWord & 0xff };
}

/** AnimDirtScatter's offset word (battle_anim_ground.c:213-218): `Random2() & 0x1F`, then `> 16` -> `16 - v` (-15..16). */
export function dirtScatterOffsetFromWord(word: number): number {
  const v = word & 0x1f;
  return v > 16 ? 16 - v : v;
}

/**
 * InitAnimLinearTranslation (battle_anim_mons.c:1065-1092) over `duration` frames for one axis: `(|d| << 8) as u16 / duration`,
 * bit 0 set when moving negatively, cleared otherwise.
 */
export function linearTranslationStep(delta: number, duration: number): number {
  const magnitude = Math.trunc(((Math.abs(delta) << 8) & 0xffff) / duration);
  return delta < 0 ? magnitude | 1 : magnitude & ~1;
}

/**
 * Mud-Slap / Sand-Attack dirt lowest-free OAM slots (prep17 s0.2 item 2): base in-use slots, two transient slot-3 helper
 * sprites with measured lifetimes, `waves` x 5 sprites born every 4 rows from `firstWaveRow`, each alive 21 rows; the
 * second transient is created before the first wave's sprites in the same row. Returns the dirt slots in spawn order.
 */
export function dirtScatterSlots(
  transients: readonly (readonly [number, number])[], firstWaveRow: number, base: readonly number[],
): readonly number[] {
  const alive: { slot: number; until: number }[] = [];
  const allocate = (row: number, until: number): number => {
    for (let k = alive.length - 1; k >= 0; k -= 1) if (alive[k]!.until <= row) alive.splice(k, 1);
    let slot = 0;
    while (base.includes(slot) || alive.some((a) => a.slot === slot)) slot += 1;
    alive.push({ slot, until });
    return slot;
  };
  type Birth = { row: number; order: number; until: number; dirt: boolean };
  const births: Birth[] = [
    ...transients.map(([from, to], i): Birth => ({ row: from, order: i === 0 ? 0 : -1, until: to, dirt: false })),
    ...Array.from({ length: 30 }, (_, i): Birth => ({ row: firstWaveRow + 4 * Math.floor(i / 5), order: 1 + i, until: firstWaveRow + 4 * Math.floor(i / 5) + 21, dirt: true })),
  ].sort((a, b) => a.row - b.row || a.order - b.order);
  const slots: number[] = [];
  for (const birth of births) {
    const slot = allocate(birth.row, birth.until);
    if (birth.dirt) slots.push(slot);
  }
  return slots;
}
