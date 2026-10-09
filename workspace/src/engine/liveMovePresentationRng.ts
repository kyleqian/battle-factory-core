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
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "./liveMoveTimingPolicy.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { generalAnimationPresentationRngKey, WORDS_ORDER_GENERAL_ANIMATION } from "./wordsOrderUnits.ts";
import {
  activatePresentationRngBody,
  presentationRngBodyWords,
  recordPresentationRngSubStream,
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
  // Move_LUSTER_PURGE: six AnimHitSplatRandom sprites at ages 170 + 5k, two words each (x2, y2; battle_anim_normal.c:1049-1062; prep29 B.5).
  295: Object.freeze(Array.from({ length: 6 }, (_, k) => Object.freeze({ ageOffset: 170 + 5 * k, count: 2 }))),
  // Move_WATER_PULSE: six ring emissions (ages 86, 93, 100, 101, 108, 115) x 2 words (randomY, randomX;
  // battle_anim_water.c:1574-1575). The reducer replays them from the activation state alone.
  352: Object.freeze([86, 93, 100, 101, 108, 115].map((ageOffset) => Object.freeze({ ageOffset, count: 2 }))),
  // Move_FLATTER (S10A; docs/next-adapters-prep32.md s2 / prep35 s3 item 2): the script's confetti burst on the frame +65 (the 65 RfuMain1 steps are
  // the per-frame advance), 19 x CreateFlatterConfetti = 38 AnimFlatterConfetti, three words each in source order (w0 % 12 tile, w1 & 0x1ff
  // data[0], w2 & 0xff data[1]; battle_anim_effects_3.c:3033-3060).
  260: Object.freeze([Object.freeze({ ageOffset: 65, count: 114 })]),
  // Move_METEOR_MASH (D4b; faithful TIMING with d3, liveMoveTimingPolicy.ts, so not in LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS): 48 AnimMiniTwinklingStar
  // spawns, (& 3 -> tile, & 7 signed -> y) each (battle_anim_effects_3.c:2147, :2153), in the prep12 plan's frame groups (plans.json meteor-mash).
  309: Object.freeze([[48, 2], [50, 2], [52, 2], [54, 2], [56, 2], [58, 2], [60, 4], [62, 4], [64, 4], [66, 4], [68, 4], [70, 4], [72, 4], [74, 4],
    [76, 4], [78, 2], [79, 2], [80, 2], [82, 2], [84, 2], [86, 2], [88, 2], [90, 2], [102, 2], [104, 2], [106, 2], [108, 2], [111, 2], [113, 2],
    [115, 2], [117, 2], [119, 2], [121, 2], [123, 2], [125, 2], [127, 2], [129, 2], [131, 2], [133, 2]].map(([ageOffset, count]) => Object.freeze({ ageOffset: ageOffset!, count: count! }))),
});

/**
 * Move_ICE_BALL (faithful TIMING with d3, liveMoveTimingPolicy.ts 301): AnimIceBallParticle x shards in one frame (step 37), two words each
 * (randA = (w & 0xff) + 256, randB = w & 0x1ff folded; battle_anim_ice.c:1581-1607). The shard count is the counter's (5 / 7 / 9 / 10 / 10;
 * AnimTask_GetIceBallCounter = request.rolloutCounter - 1), so the plan is counter-keyed (docs/next-adapters-prep26.md s1.3).
 */
export const LIVE_ICE_BALL_RANDOM2_PLANS: readonly (readonly PresentationRngDrawStep[])[] = Object.freeze(
  [5, 7, 9, 10, 10].map((shards) => Object.freeze([Object.freeze({ ageOffset: 37, count: 2 * shards })])));

/**
 * Move_DIVE (faithful TIMING with d3, liveMoveTimingPolicy.ts 291): the setup body sprays 10 AnimSprayWaterDroplet in one frame (two words each, battle_anim_flying.c:1106-1107) at the splash birth
 * (first inactive - 50; these defaults 67 player attacker / 64 opponent attacker are the measured prep25 attackers, the live seam keys the
 * birth to the attacker's ball rule through LiveMoveRandom2PlanContext, species audit 11); the attack body 10 droplets at +16, then 2 AnimSmallDriftingBubbles x 2
 * words (battle_anim_water.c:1032-1033) at +30, +34, ..., +62 (docs/next-adapters-prep25.md s0.2, plans.json; 56 words). Turn-keyed and
 * side-keyed (request.turn & 1, request.attacker).
 */
export const LIVE_DIVE_RANDOM2_PLANS: Readonly<{ setup: Readonly<Record<"player" | "opponent", readonly PresentationRngDrawStep[]>>;
  attack: readonly PresentationRngDrawStep[] }> = Object.freeze({
  setup: Object.freeze({ player: Object.freeze([Object.freeze({ ageOffset: 67, count: 20 })]),
    opponent: Object.freeze([Object.freeze({ ageOffset: 64, count: 20 })]) }),
  attack: Object.freeze([Object.freeze({ ageOffset: 16, count: 20 }),
    ...Array.from({ length: 9 }, (_, k) => Object.freeze({ ageOffset: 30 + 4 * k, count: 4 }))]),
});

/**
 * General_Rain (B_ANIM_RAIN_CONTINUES): two AnimTask_CreateRaindrops tasks, 20 spawn frames (ages 17 + 3k, RAM-measured) x 4 words (x0, y0,
 * x1, y1; battle_anim_water.c:495-496; docs/next-adapters-prep46.md s1). Read as a NON-CONSUMING per-event sub-stream at the tick seam
 * (recordPresentationRngSubStream): only the sprite-order carry after it reads the words; no live adapter renders General_Rain.
 */
export const GENERAL_RAIN_RANDOM2_PLAN: readonly PresentationRngDrawStep[] = Object.freeze(
  Array.from({ length: 20 }, (_, k) => Object.freeze({ ageOffset: 17 + 3 * k, count: 4 }))); // == rainDance.ts GENERAL_RAIN_SPAWN_AGES (tested)

/** Faithful-random live adapters (disjoint from LIVE_MOVE_ANIMATION_IDS and from the faithful-timing ids, which keep their D3 plan). */
export const LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS: readonly number[] = Object.freeze(
  Object.keys(LIVE_MOVE_RANDOM2_PLANS).map(Number).filter((id) => !LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS.includes(id)),
);

/**
 * Field-derived plan inputs the request alone does not carry: the Dive setup splash birth from the displayed field (liveDiveSetupSplashBirth,
 * liveMoveAnimation.ts; the ball rule over the attacker's Y_PIC_OFFSET). Absent: the side's measured default (67 / 64).
 */
export type LiveMoveRandom2PlanContext = Readonly<{ diveSetupSplashBirth?: number }>;

export function liveMoveRandom2Plan(
  request: Pick<BattleMoveAnimationRequest, "moveId"> & Partial<Pick<BattleMoveAnimationRequest, "rolloutCounter" | "turn" | "attacker">>,
  context?: LiveMoveRandom2PlanContext,
): readonly PresentationRngDrawStep[] | null {
  if (request.moveId === 291) {
    if (request.turn === undefined || request.attacker === undefined) return null;
    if ((request.turn & 1) === 1) return LIVE_DIVE_RANDOM2_PLANS.attack;
    const plan = LIVE_DIVE_RANDOM2_PLANS.setup[request.attacker === 0 ? "player" : "opponent"];
    const splashBirth = context?.diveSetupSplashBirth;
    return splashBirth === undefined || splashBirth === plan[0]!.ageOffset ? plan : [{ ageOffset: splashBirth, count: 20 }];
  }
  if (request.moveId === 301) {
    const counter = request.rolloutCounter;
    return counter !== undefined && counter >= 1 && counter <= 5 ? LIVE_ICE_BALL_RANDOM2_PLANS[counter - 1]! : null;
  }
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
  request: Pick<BattleMoveAnimationRequest, "moveId"> & Partial<Pick<BattleMoveAnimationRequest, "rolloutCounter" | "turn" | "attacker">>,
  key: string,
  context?: LiveMoveRandom2PlanContext,
): PresentationRngHost {
  const plan = liveMoveRandom2Plan(request, context);
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
 * command identity, age and displayed field (`planContext`, core.ts: liveMoveRandom2PlanContextAt), never gameplay RNG.
 */
export function tickLiveMovePresentationRngSession(
  session: PresentationRngSession,
  orchestrator: Readonly<{
    activeBattleCallStart?: number | null;
    battleResolutionPresentation?: BattleResolutionPresentationState | null;
  }> | null,
  planContext?: (resolution: BattleResolutionPresentationState, request: BattleMoveAnimationRequest) => LiveMoveRandom2PlanContext,
): PresentationRngSession {
  const stepped = tickPresentationRngSession(session, orchestrator?.activeBattleCallStart ?? null);
  const host = stepped.host;
  const resolution = orchestrator?.battleResolutionPresentation;
  if (!host || !resolution || resolution.lifecycle.phase !== "presenting" || resolution.lifecycle.phaseElapsed !== 0) {
    return stepped;
  }
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  if (command === undefined) return stepped;
  // General-animation anchor (prep46 s2): a RAIN_CONTINUES event is presented with the first command at or after it (it has no command
  // of its own); record its non-consuming sub-stream once per event key. The shared stream is not advanced.
  // words59: a RAIN_CONTINUES after the resolution's LAST command (the end-turn rain after the turn's final message) has no command at or
  // after it; it is recorded at that final command's activation, where the order host applies the segment's trailing events and marks
  // it (factoryRoundBattleOrchestrator isFinalCommand). Trailing events of an earlier segment keep the next segment's first command.
  const finalCommand = resolution.segmentIndex === resolution.segments.length - 1
    && resolution.commandIndex === resolution.segments[resolution.segmentIndex]!.commands.length - 1;
  let recorded = host;
  const through = !finalCommand && "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
  for (let segmentIndex = 0; segmentIndex <= resolution.segmentIndex; segmentIndex += 1) {
    for (const event of resolution.segments[segmentIndex]?.events ?? []) {
      if (segmentIndex === resolution.segmentIndex && event.sequence > through) break;
      if (event.payload.kind !== "animation" || (event.payload as { animationId?: string }).animationId !== WORDS_ORDER_GENERAL_ANIMATION) continue;
      recorded = recordPresentationRngSubStream(recorded,
        generalAnimationPresentationRngKey(resolution.resolutionId.requestId, segmentIndex, event.sequence), GENERAL_RAIN_RANDOM2_PLAN);
    }
  }
  const activated = command.type !== "move-animation" || !command.animation ? recorded
    : activateLiveMovePresentationRng(recorded, command.animation, liveMovePresentationRngBodyKey(resolution),
      planContext?.(resolution, command.animation));
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
