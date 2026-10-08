import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import type { LiveMoveSpriteAllocatorInput, LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import { liveSubstituteSwapApplies, substituteSwapBodyField, substituteSwapCompositeDuration } from "./liveSubstituteSwap.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type {
  SceneOnMovePresentationState, SceneOnMoveConfig, SceneOnPresentationBattler,
} from "../animation/sceneOnPresentation.ts";
import { GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE } from "../animation/sceneOnPresentation.ts";
import { PRESENT_DAMAGE_FRAME_COUNT, PRESENT_HEAL_FRAME_COUNT } from "../animation/present.ts";
import { SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE, SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE } from "../animation/solarBeam.ts";
import { reduceMemento, type MementoBattlerConfig, type MementoConfig } from "../animation/memento.ts";
import { HOWL_FRAME_COUNT } from "../animation/howl.ts";
import { SUBSTITUTE_FRAME_COUNT } from "../animation/substitute.ts";
import { dragonRageFireSpitGeometryFor } from "../animation/dragonRage.ts";
import { TAIL_WHIP_FRAME_COUNT } from "../animation/tailWhip.ts";
import { CONFUSE_RAY_FRAME_COUNT } from "../animation/confuseRay.ts";
import { FOCUS_PUNCH_FIRST_INACTIVE_AGE } from "../animation/focusPunch.ts";
import { SCREECH_FIRST_INACTIVE_AGE } from "../animation/screech.ts";
import {
  BRICK_BREAK_NORMAL_FRAME_COUNT,
  BRICK_BREAK_SHATTERED_FRAME_COUNT,
} from "../animation/brickBreak.ts";
import { AGILITY_FRAME_COUNT } from "../animation/agility.ts";
import { SWORDS_DANCE_FRAME_COUNT } from "../animation/swordsDance.ts";
import { CALM_MIND_CLEANUP_AGE } from "../animation/calmMind.ts";
import { FURY_SWIPES_LAST_BODY_AGE } from "../animation/furySwipes.ts";
import { KARATE_CHOP_FRAME_COUNT } from "../animation/karateChop.ts";
import {
  HYPNOSIS_OPPONENT_FRAME_COUNT,
  HYPNOSIS_PLAYER_FRAME_COUNT,
} from "../animation/hypnosis.ts";
import { NIGHT_SHADE_FRAME_COUNT } from "../animation/nightShade.ts";
import { SHADOW_BALL_END_AGE } from "../animation/shadowBall.ts";
import { SPORE_FRAME_COUNT } from "../animation/spore.ts";
import { STOMP_FRAME_COUNT } from "../animation/stomp.ts";
import { STUN_SPORE_FRAME_COUNT } from "../animation/stunSpore.ts";
import { GRASS_WHISTLE_WINDOW_FRAMES } from "../animation/grassWhistle.ts";
import { DOUBLE_EDGE_FRAME_COUNT } from "../animation/doubleEdge.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../animation/speciesIdleAnim.ts";
import { liveTrackedFrontIdleRest, type LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { digAtAge } from "../animation/dig.ts";
import { FAINT_ATTACK_ANIMATION_PROFILE } from "../animation/faintAttack.ts";
import { RAZOR_LEAF_BODY_LAST_AGE } from "../animation/razorLeaf.ts";
import { THUNDER_PUNCH_MOVE_BODY_LAST_AGE } from "../animation/thunderPunch.ts";
import { NEEDLE_ARM_FRAME_COUNT } from "../animation/needleArm.ts";
import { COVET_FRAME_COUNT } from "../animation/covet.ts";
import {
  GUILLOTINE_OPPONENT_FRAME_COUNT,
  GUILLOTINE_PLAYER_FRAME_COUNT,
} from "../animation/guillotine.ts";

import { ACID_ARMOR_FIRST_INACTIVE_AGE } from "../animation/acidArmor.ts";
import { ATTRACT_FRAME_COUNT } from "../animation/attract.ts";
import { CHARM_BODY_FRAME_COUNT } from "../animation/charm.ts";
import { COTTON_SPORE_FRAME_COUNT } from "../animation/cottonSpore.ts";
import { DISABLE_WINDOW_FRAMES } from "../animation/disable.ts";
import { ENCORE_END_AGE } from "../animation/encore.ts";
import { REFRESH_FRAME_COUNT } from "../animation/refresh.ts";
import { CRABHAMMER_FRAME_COUNT } from "../animation/crabHammer.ts";
import { FISSURE_FRAME_COUNT } from "../animation/fissure.ts";
import { MAGICAL_LEAF_FRAME_COUNT } from "../animation/magicalLeaf.ts";
import { REST_FRAME_COUNT } from "../animation/rest.ts";
import { SWEET_KISS_FRAME_COUNT } from "../animation/sweetKiss.ts";
import { TICKLE_FRAME_COUNT } from "../animation/tickle.ts";
import { SURF_WAVE_FRAME_COUNT } from "../animation/surfWave.ts";
import { BIND_ANIMATION_PROFILE } from "../animation/bind.ts";
import { WRAP_ANIMATION_PROFILE } from "../animation/wrap.ts";
import { CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY } from "../animation/dragonBreath.ts";
import { icyWindEffectOamOrderAtAge } from "../animation/icyWind.ts";
import { blizzardEffectOamOrderAtAge } from "../animation/blizzard.ts";
import { YAWN_CLEANUP_AGE } from "../animation/yawn.ts";
import { ROCK_THROW_ANIMATION_PROFILE } from "../animation/rockThrow.ts";
import { perishSongNoteOrderFromFree } from "../animation/perishSong.ts";
import { LEAF_BLADE_OAM_ORDER_SLOTS } from "../animation/leafBlade.ts";
import { HEAL_BELL_REUSED_ORDER_SLOTS } from "../animation/healBell.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderForSlots, spriteOrderWithOccupiedPrefix } from "./spriteOrderProvider.ts";
import { DOUBLE_KICK_FRAME_COUNT } from "../animation/doubleKick.ts";
import { waterSpoutTimeline, type WaterSpoutLiveInputs } from "../animation/waterSpout.ts";
import { hiddenPowerUnownFormIndex } from "../animation/hiddenPower.ts";
import type { FlailPower } from "../animation/flail.ts";
import type { HailProfile } from "../animation/hail.ts";
import { composeLivePalettes, liveBattlerIsShiny } from "./liveMovePaletteComposite.ts";
import lovelyKissAsset from "../animation/assets/lovely-kiss.json" with { type: "json" };
import octazookaAsset from "../animation/assets/octazooka.json" with { type: "json" };
import spikesAsset from "../animation/assets/spikes.json" with { type: "json" };
import paletteResources from "../data/gen/live-animation-palette-resources.json" with { type: "json" };
import skyAttackAsset from "../animation/assets/sky-attack.json" with { type: "json" };
import snoreAsset from "../animation/assets/snore.json" with { type: "json" };
import spitUpRedOrbAsset from "../animation/assets/spit-up-red-orb.json" with { type: "json" };
import superpowerAsset from "../animation/assets/superpower-rock-orb-fire.json" with { type: "json" };
import { liveMoveBgWriteRow, liveMoveOptionalLagAge, liveMovePaletteTransferRow, liveMoveTimingBodyRows, liveMoveTimingParameter } from "./liveMoveTimingPolicy.ts";
import { liveSpitUpDuration, liveSpitUpInputs, type SpitUpCounter } from "./liveSpitUpInputs.ts";
import { SUPERPOWER_ROWS, liveSuperpowerInputs } from "./liveSuperpowerInputs.ts";
import { liveBonemerangInputs, liveLusterPurgeFields, liveMachPunchInputs, liveOutrageInputs, liveRapidSpinInputs, liveHyperVoiceInputs, liveSkyAttackInputs, liveSandTombProfile, liveSmogInputs, liveSnoreInputs } from "./liveQ2Moves.ts";
import { liveEruptionProfile, liveLovelyKissProfile, liveOctazookaProfile, liveSheerColdInputs, liveSheerColdRestoreFadeEndAge, liveSignalBeamInputs, liveSpikesProfile } from "./liveProfileMoves.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES, battlerSprite, liveOverheatInputs, livePsychUpInputs, liveSilverWindInputs } from "./liveBgSnapshotMoves.ts";
import { liveCurseStatsInputs, liveFuryCutterInputs, liveMegahornInputs, livePursuitInputs, liveReturnInputs, liveRevengeInputs, liveWillOWispInputs, livePsywaveInputs, liveExtrasensoryInputs, liveNightmareInputs, liveShockWaveInputs, liveSkillSwapInputs, liveFlatterInputs, FIRST_BODY_SCANLINE } from "./liveOamMoves.ts";
import shockWaveAsset from "../animation/assets/shock-wave.json" with { type: "json" };
import { shockWaveTimingFor } from "../animation/shockWave.ts";
import revengeScratchAsset from "../animation/assets/revenge-purple-scratch-swipe.json" with { type: "json" };
import hornDrillAsset from "../animation/assets/horn-drill.json" with { type: "json" };
import megaHornAsset from "../animation/assets/mega-horn-horn-hit-2.json" with { type: "json" };
import {
  CURSE_STATS_ROWS, curseStatsBattleBgAt, curseStatsPaletteAt, curseStatsRegistersAt, curseStatsSpritesAt, curseStatsTasksAt,
} from "../animation/curseModel.ts";
import { FLATTER_ROWS, FURY_CUTTER_ROWS, PURSUIT_ROWS, RETURN_ROWS } from "./liveMoveOamAssembler.ts";
import { willOWispSpritesAtAge, willOWispTimeline } from "../animation/willOWisp.ts";
import { skillSwapAtAge, type SkillSwapLiveInputs } from "../animation/skillSwap.ts";
import skillSwapOrbAsset from "../animation/assets/skill-swap-bluegreen-orb.json" with { type: "json" };
import { flatterAtAge, type FlatterLiveInputs } from "../animation/flatter.ts";
import { eruptionLaunchTimeline, type EruptionLaunchProfile } from "../animation/eruptionLaunch.ts";
import { ERUPTION_FALLING_ROCK_SOURCE_CALLS } from "../animation/eruptionFallingRock.ts";
import eruptionWarmRockAsset from "../animation/assets/eruption-warm-rock.json" with { type: "json" };
import flatterAsset from "../animation/assets/flatter.json" with { type: "json" };
import { pursuitTargetOffsetAtAge } from "../animation/pursuit.ts";
import { sortGbaSpriteOrder } from "../animation/gbaObjCompositor.ts";
import willOWispAsset from "../animation/assets/will-o-wisp.json" with { type: "json" };
import iceBallAsset from "../animation/assets/ice-ball.json" with { type: "json" };
import icyWindAsset from "../animation/assets/icy-wind.json" with { type: "json" };
import { liveIceBallEnd, liveIceBallInputs } from "./liveIceBallInputs.ts";
import type { DiveProfile } from "../animation/dive.ts";
import { linearTranslationDeltaQ8, linearTranslationOffsetAfterCallbacks } from "../animation/animLinearTranslation.ts";
import {
  dirtScatterOffsetFromWord, dirtScatterSlots, hyperBeamOrbFromWords, linearTranslationStep, liveMovePresentationRngWords, miniTwinklingStarFromWords, type LiveMovePresentationRngInput,
} from "./liveMovePresentationRng.ts";


/** Only adapters with production inputs belong here; exact acceptance is separate. */
/** Superpower's CIRCLE_OF_LIGHT / METEOR / FLAT_ROCK palettes (BGR555 words) for liveSuperpowerInputs (seam-provided, as Spit Up's). */
const SUPERPOWER_PALETTES = (() => {
  const words = (name: "circleOfLight" | "meteor" | "flatRock") => Object.freeze((superpowerAsset as unknown as {
    resources: Record<string, { art: { palette: { r: number; g: number; b: number }[] } }> }).resources[name]!.art.palette
    .map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10));
  return Object.freeze({ orb: words("circleOfLight"), meteor: words("meteor"), rock: words("flatRock") });
})();

/** Spit Up's RED_ORB_2 palette (BGR555 words) for liveSpitUpInputs (the engine reads animation assets only through this seam). */
const SPIT_UP_RED_ORB_PALETTE: readonly number[] = Object.freeze((spitUpRedOrbAsset as { art: { palette: { r: number; g: number; b: number }[] } }).art.palette
  .map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10));

/**
 * Dive setup first inactive age (the splash births at first inactive - 50). With the attacker's Y_PIC_OFFSET y (`ballY`): the ball rule
 * (species audit 11, all 18 measured attacker species, 52 windows); without it, the measured prep25 side defaults 117 / 114.
 */
function liveDiveSetupFirstInactive(side: "player" | "opponent", ballY?: number): number {
  if (ballY === undefined) return side === "player" ? 117 : 114;
  // AnimDiveBall from the attacker's Y_PIC_OFFSET y: 13 delay callbacks, rise (v += 336, y2 -= v >> 8) until y + y2 <= -32, 22 hidden
  // callbacks, fall at the final speed until y2 >= 0 (destroyed); the splash births 1 row later and the body ends 50 rows after it.
  let y2 = 0, v = 0, callback = 12;
  while (ballY + y2 > -32) { callback += 1; v += 336; y2 -= v >> 8; }
  callback += 22;
  while (y2 < 0) { callback += 1; y2 += v >> 8; }
  return 10 + callback + 1 + 50;
}

/** Dive setup splash birth (the droplets' Random2 draw age) from the displayed field (audit-11 patch proof). */
export function liveDiveSetupSplashBirth(field: BattleResolutionDisplayedField, side: "player" | "opponent"): number {
  return liveDiveSetupFirstInactive(side, liveBattlerAnchors(side, createBattleCommandFieldArtView(field)).picOffsetPoint.y) - 50;
}

/**
 * Dive SETUP body profile (prep25 s B.1 / C; tools/integration/prep25DiveReducerCheck.ts recipe): lowest-free slots over the known-entry
 * occupancy with the source lifetimes (ball at +10, splash + 10 droplets at first inactive - 50, birth-first), matrices K [0], subpriorities
 * the battler values, droplet velocities from the presentation words (AnimSprayWaterDroplet, battle_anim_flying.c:1106-1107:
 * data[0] = 736 +- (w & 0x1ff), data[1] = 896 +- (w & 0x7f), sign by bit 0; direction = the script's alternating arg), and the lent
 * activation order restricted to the body's slots (nothing is allocated before the ball at +10: the seed row 9 order is the lend).
 */
function liveDiveSetupProfile(side: "player" | "opponent", words: readonly number[], activationOrder: readonly number[], ballY?: number): DiveProfile {
  const firstInactiveAge = liveDiveSetupFirstInactive(side, ballY), splashBirth = firstInactiveAge - 50;
  const alive: { slot: number; until: number }[] = [];
  const take = (age: number, last: number): number => {
    let slot = 0;
    while (KNOWN_ENTRY_IN_USE_SPRITE_SLOTS.includes(slot) || alive.some((a) => a.slot === slot && a.until >= age)) slot += 1;
    alive.push({ slot, until: age + last + 1 });
    return slot;
  };
  const ballSlot = take(10, splashBirth - 22);
  const splashSlot = take(splashBirth, side === "player" ? 23 : 22);
  const droplets = Array.from({ length: 10 }, (_, i) => {
    const slot = take(splashBirth, side === "player" ? 30 : 29);
    const v1 = words[2 * i]! & 0x1ff, v2 = words[2 * i + 1]! & 0x7f;
    return { slot, matrixNum: 0, persistentOrder: 0, velocityX: v1 % 2 ? 736 + v1 : 736 - v1, velocityY: v2 % 2 ? 896 + v2 : 896 - v2,
      direction: (i % 2) as 0 | 1 };
  });
  const slots = [ballSlot, splashSlot, ...droplets.map((d) => d.slot)];
  return { firstInactiveAge, attackerSubpriority: side === "player" ? 30 : 40, targetSubpriority: side === "player" ? 40 : 30,
    ball: { slot: ballSlot, matrixNum: 0, persistentOrder: 0 }, splash: { slot: splashSlot, matrixNum: 0, persistentOrder: 0 },
    droplets, impacts: [], spriteOrderSeed: activationOrder.filter((slot) => slots.includes(slot)) };
}

/** Ice Ball's D4 lag rows: the timing policy's optional lag (liveMoveTimingPolicy.ts 301; the dominant phase has none). */
function liveIceBallLagRows(): number[] {
  const age = liveMoveOptionalLagAge(301);
  return age === null ? [] : [age];
}

export const LIVE_MOVE_ANIMATION_IDS = Object.freeze([
  2, 5, 9, 11, 12, 14, 21, 23, 25, 27, 29, 34, 36, 38, 39, 41, 42, 43, 44, 47, 48, 49, 50,
  51, 55, 65, 66, 67, 68, 74, 75, 78, 79, 83, 92, 93, 94, 95, 97, 101, 103, 105, 106, 108, 109, 112, 113,
  114, 115, 122, 124, 131, 136, 147, 148, 151, 154, 156, 158, 162, 163, 172, 178, 180, 182, 186, 188, 201, 204,
  208, 211, 213, 223, 227, 231, 232, 235, 242, 243, 246, 247, 257, 264, 272, 277, 280, 281, 287, 290, 302,
  305, 306, 319, 320, 321, 325, 334, 335, 336, 337, 342, 343, 347,
  56, 61, 197, 238, 259, 294, 341,
  // prep11 (docs/next-adapters-prep11.md): Leech Seed main body.
  73, 80, 161, 169, 193, 194, 278, 314, 327,
  // Roar / Whirlwind bodies (prep11 s0.2); the forced switch-out continuation is the Scene ON skip-removal hold.
  46, 18,
  // Fly / Bounce charge + strike bodies by request.turn (prep11 s2.3); the turn gap keeps the attacker hidden through
  // the presentation-only semi-invulnerable state (liveSemiInvulnerableHideBattler).
  19, 340,
  // Dig setup + unleash by request.turn (prep18 s1.1; hide through the between-turn gap like Fly/Bounce; setup = first body, unleash = host lend afterDigSetup).
  91,
  // Rollout counter bodies 1..5 (request.rolloutCounter, docs/rollout-endeavor-prep.md s0.1).
  205,
  // prep22 P1 (docs/next-adapters-prep22.md s B.5): Spikes and Octazooka through the shared profile builder (liveProfileMoves.ts).
  191, 190,
  // prep22 P3: Signal Beam first body (the WIN0 first-body registers and the lent order are the first-body inputs).
  324,
  // prep22 P3: Sheer Cold first body: reclassified to faithful timing (#151, liveMoveTimingPolicy.ts 329); its exact fixtures stay valid in scope.
  // Q2 (docs/next-adapters-prep25.md s0.2 / C): zero-Random2 bodies through liveQ2Moves.ts: Smog, Sand Tomb, Sky Attack
  // (charge + strike); Hyper Voice reclassified to faithful timing (#151, liveMoveTimingPolicy.ts 304). Snore (prep28: a known lend after Sleep Powder + its sleep status animations; any unknown lend declines).
  123, 328, 143, 173,
  // prep29 R1 (docs/next-adapters-prep29.md B.1): Bonemerang, both hit bodies (hit 1 first body, hit 2 after hit 1 through the lent order).
  155,
  // prep29 R1 (B.3): Rapid Spin (any known lend; the entry scanline is the constant S0 banks).
  229,
  // prep29 R1 (B.6): Outrage first body (S0 registers).
  200,
  // oam1 (docs/next-adapters-prep20.md): production hardware-OAM provider (liveMoveOamAssembler.ts), first body.
  // Fury Cutter: the counter-1 body only (a first body implies furyCutterCounter 1).
  261, 228, 210,
  // Return (strongest branch, friendship 255: the only one the Factory reaches), first body (docs/next-adapters-prep24.md s2).
  216,
  // Spit Up, all three Stockpile counters (docs/next-adapters-prep31.md s2 / s3; liveSpitUpInputs.ts): any known lend.
  255,
  // Extreme Speed (docs/next-adapters-prep34.md s1): reducer age 43 at activation, 321 rows; no Random2 / lag / history input.
  245,
  // Memento first body (docs/next-adapters-prep34.md s2): production-derived battler inputs + the first-body scanline entry; 175..179 rows.
  262,
  // Shock Wave (docs/next-adapters-prep33.md s1 / s3; liveOamMoves.ts liveShockWaveInputs): the reducer's geometry-derived timing, any known lend.
  351,
  // S10A: Eruption (prep36 source-derived profile, liveProfileMoves.ts liveEruptionProfile; scoped exact, no D3 / D4 parameter).
  284,
  // anchor3: source battler anchors (position center, picture height, pic offset).
  86, 87, 107, 116, 203, 207, 263, 339,
  // selectors: request-selected branches and healing anchors.
  76, 217, 236, 250,
  // multihit: one MOVE_ANIMATION per hit, selected by request.turn (battle_script_commands.c:1787).
  3, 4, 167,
  // anchor4: species idle offsets (and picture size) derived through liveBattlerAnchors.
  89, 90, 152, 345, 133, 60,
  // next5: eye anchors from liveBattlerAnchors (docs/next-adapters-prep.md s4).
  184, 137,
  // next5 personality: Spinda spots read the displayed party mon's personality (presentation-only).
  298, 146,
  // next5 self-target: healing anchors on the attacker, other-side battler drawn from the field.
  135,
  // prep2 (docs/next-adapters-prep2.md s2): Surf + Muddy Water share one branch.
  57, 330,
  // prep2: anchor-derived effect geometry.
  196, 59,
  // prep2: pic-coord yOffset (Fake Out); plain recipe (Cosmic Power).
  252, 322,
  // prep2: Future Sight turn-1 body only (the delayed hit is a separate playanimation, battle_scripts_1.s:3519).
  248,
  // prep2: Explosion body (attacker displayed HP is 0 at the event; setatkhptozero precedes attackanimation).
  153,
  // H_BUFFER S1 (docs/h-buffer-s1-prep.md): Mean Look, Smelling Salt, Defense Curl, Ingrain, Wrap, Bind, Dragon Breath.
  212, 265, 111, 275, 35, 20, 225,
  // prep5 (docs/next-adapters-prep5.md): Mist Ball, Aromatherapy, Follow Me, Metronome (body), Taunt, Belly Drum.
  296, 312, 266, 118, 269, 187,
  // prep6 (docs/next-adapters-prep6.md): Rock Tomb, Safeguard, Sweet Scent, Self-Destruct, Swallow, Knock Off, Faint Attack (player attacker only).
  317, 219, 230, 120, 256, 282, 185,
  // prep7 (docs/next-adapters-prep7.md): Aerial Ace, Quick Attack, Ice Punch, Fake Tears, Sleep Talk, Rock Slide (opponent attacker only),
  // Fire Blast (known-order gate), Dragon Dance (allocationOrder derived from the provider order).
  332, 98, 8, 313, 214, 157, 126, 349,
  // prep8 (docs/next-adapters-prep8.md; allocator constants = docs/allocator-plan-v2-evidence.md), each gated on the lent
  // known tracked order: Swift, Trick, Frustration (friendship <= 30), Seismic Toss (damage 33..65), Horn Drill, Aurora Beam,
  // Uproar, Thunderbolt, Stockpile, Zap Cannon.
  129, 271, 218, 69, 32, 62, 253, 85, 254, 192,
  // prep9 (docs/next-adapters-prep9.md; the D-PAL label is stale: no palette snapshot is consumed), each gated on the lent
  // known tracked order: Giga Drain, Sunny Day, Mega Drain, Absorb, Dream Eater.
  202, 241, 72, 71, 138,
  // prep7 order-gated (docs/next-adapters-prep7.md s0, docs/sprite-order-policy-gaps.md): Double Team (player attacker only;
  // frontClone from the lent order), Feather Dance (lend gate; the reducer simulates its own draw order).
  104, 297,
  // order consumers (docs/order-consumer-prep.md): Grudge, first move body of a battle only (sprite-order input).
  288,
  // order consumers, order-independent (docs/order-consumer-prep.md §0): Ember (one sprite per sort window, ties resolve
  // by creation order whatever the free order is).
  52,
  // Dragon Rage: one plume per sort window (orderFirePlumesForDraw); the 21-frame script tail is not covered.
  82,
  // Flamethrower: one flame per sort window, so the order seed is pixel-neutral (provider seed when known, ascending
  // otherwise); the script's 80-frame tail beyond the accepted window is uncovered.
  53,
  // Provider consumers (while the tracked order is known; unknown order -> null): Heal Bell.
  215,
  // Leaf Blade (initial persistent order of the blade + trail slots).
  348,
  // Perish Song (equal-centerY note ties from the provider's creation rank; literal 3/3 turn counts).
  195,
  // Rock Throw (64-entry seed: occupied prefix + F).
  88,
  // Blaze Kick (pixel-sensitive seed; 9-frame script tail beyond the accepted window is uncovered).
  299,
  // prep10 (docs/next-adapters-prep10.md): Magnitude (request.power = gBattleMovePower 70 / 110; lent order gate).
  222,
  // prep10: Reversal (amplitude = clamp(request.power / 12), the ROM's ShakeTargetBasedOnMovePowerOrDmg; lent order gate).
  179,
  // prep10: Pain Split (per-side pic-coords yOffset into the closed-form battler y2).
  220,
  // prep10: Rock Blast per-hit bodies (request.turn / request.multihit; lent order gate).
  350,
  // prep10: Razor Wind setup/unleash by request.turn (Cmd_choosetwoturnanim, like Solar Beam; lent order gate).
  13,
  // prep10: Spark, PLAYER attacker only (accepted constants; no accepted opponent-attacker evidence).
  209,
  // prep13 (docs/next-adapters-prep13.md s1.1-1.2): Ice Beam (geometry from the anchors; lent-order gate), Water Spout
  // (party HP tier + picture height + per-side rain seed; lent-order gate).
  58, 323,
  // prep13 s1.3: Hidden Power (Unown attacker only: the reducer's uninitialised eighth orb is Unown-specific; lent-order gate).
  237,
  // prep14 s1.7: Hail (no RNG; the target table is derived from the anchors).
  258,
  // prep16 s2.1/2.2 + lb21: Overheat, Silver Wind (known order lend; assets-only palette composite; !shiny).
  315, 318,
  // prep16 s2.3 + lb21: Psych Up, both attackers (known order lend).
  244,
  // r2-gates (docs/next-adapters-prep22.md s0/A): Fire Punch BODY only (101 rows; the burn flames are the separate Status_Burn body).
  7,
  // curse-live (docs/next-adapters-prep23.md s1.3/s3): Curse non-Ghost (CurseStats) body, known order lend; the Ghost branch declines.
  174,
  // prep27 (docs/next-adapters-prep27.md s0.1/s4): Baton Pass body (53 rows, constant; the attacker stays hidden after it through
  // liveSemiInvulnerableHideBattler until its switch-out).
  226,
  // prep27 s0.2/s5: Endeavor script body (68 rows) with the stale register power; declines when the unported Battle TV loop (W3)
  // may have written the register (liveStaleMovePowerTaintedBy).
  283,
  // S10A Substitute (docs/next-adapters-prep37.md s1/s3a.4): the BODY (87 rows); the doll is shown after it
  // (applySubstituteDollCommand); adapters decline while the defender is the doll, and present the swaps around a proven body while
  // only the attacker is (liveMoveSubstituteDollDeclines, liveSubstituteSwap.ts).
  164,
] as const);

/** In-use OBJ slots at a first-body activation (prep14 s1: equal in all 24 probed scenarios). */
const KNOWN_ENTRY_IN_USE_SPRITE_SLOTS: readonly number[] = Object.freeze([0, 1, 2, 6, 8, 60, 61, 62, 63]);
/** Palette arrays the Rain Dance / Hail compositors never read (prep14 s1.1, s1.7: zeros reproduce births and rng). */
const UNCONSUMED_PALETTE: readonly number[] = Object.freeze(Array.from({ length: 512 }, () => 0));
/** sHailCoordData: x, y, battler position (0 player left, 1 opponent left, 2/3 absent right), type (0 fixed, 1 negative mod, 2 positive mod). */
const HAIL_COORD_DATA: readonly (readonly [number, number, number, number])[] = Object.freeze([
  [100, 120, 0, 0], [85, 120, 0, 1], [242, 120, 1, 2], [66, 120, 2, 2], [182, 120, 3, 1],
  [60, 120, 0, 0], [214, 120, 1, 1], [113, 120, 0, 2], [210, 120, 3, 2], [38, 120, 2, 1]]);

const FLAIL_POWERS: readonly FlailPower[] = Object.freeze([20, 40, 80, 100, 150, 200]);

const SWEET_SCENT_PETAL_SLOTS: readonly number[] = Object.freeze([
  3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15, 16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14]);

/**
 * ISSUES #142: live age on which the elevated-opponent enemy shadow is still
 * displayed. `SpriteCB_EnemyShadow` (battle_gfx_sfx_util.c:1203) hides the
 * 32x8 shadow only after it observes gAnimScriptActive, so with the one-frame
 * display lag it is visible on the ROM frame where the move script activates.
 * shadowRow = activationFrame - acceptedWindowStart + ageOffset; an id is
 * listed only when 0 <= shadowRow < duration (its window starts at the
 * activation frame). Ids whose accepted window starts after activation (Bite,
 * Toxic, Confusion, ...) are absent: that frame precedes the body. Both
 * orientations share the row (tools/integration/fixtures/issue142-shadow-rows.json,
 * pinned by tests/liveShadowRows.test.ts).
 */
export const LIVE_MOVE_OPPONENT_SHADOW_ROW: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries([
    2, 5, 11, 12, 14, 21, 23, 25, 27, 29, 34, 36, 38, 39, 42, 43, 47, 49, 50, 56, 61, 65, 66, 67, 68,
    78, 79, 83, 86, 87, 95, 97, 101, 103, 107, 108, 109, 112, 113, 114, 115, 116, 122, 131, 147, 148,
    151, 154, 156, 162, 163, 172, 178, 180, 182, 186, 197, 201, 203, 211, 213, 231, 238, 242, 243, 246,
    257, 259, 263, 264, 272, 277, 280, 281, 287, 290, 302, 306, 319, 320, 321, 335, 336, 341,
    // selectors batch (issue142-shadow-rows-extra.json): every variant's window starts at activation.
    76, 217, 236, 250,
    // multihit batch (multihit-shadow-rows.json): every hit window starts at its own activation.
    3, 4, 167,
    // anchor4 batch (issue142-shadow-rows-extra.json): every window starts at activation (Earthquake: age 0 is the activation frame).
    89, 90, 152, 345, 60, 133,
    // next5 (issue142-shadow-rows-extra.json): Glare/Teeter Dance/Soft-Boiled windows start at activation;
    // Scary Face (-4) and Dizzy Punch (-13) start after it and have no row.
    137, 298, 135,
    // prep2 (issue142-shadow-rows-extra.json): Surf / Muddy Water windows start at activation.
    57, 330, 196, 59, 252, 322,
    // H_BUFFER S1 (issue142-shadow-rows-extra.json): Mean Look, Smelling Salt, Defense Curl, Ingrain, Wrap start at activation.
    // Dragon Breath (-6) starts after it and has no row.
    212, 265, 111, 275, 35,
    // prep5 (issue142-shadow-rows-extra.json): Mist Ball, Aromatherapy, Follow Me, Metronome, Belly Drum start at
    // activation. Taunt (-10) starts after it and has no row.
    296, 312, 266, 118, 187,
    // prep6 (issue142-shadow-rows-extra.json): Rock Tomb, Safeguard, Sweet Scent, Swallow start at activation.
    // Self-Destruct (-4), Knock Off (-6), Faint Attack (-4) start after it and have no row.
    317, 219, 230, 256,
    // order consumers (issue142-shadow-rows-extra.json): Grudge's window starts at activation (66/70).
    // Heal Bell (215), Rock Throw (88), Perish Song (195), Leaf Blade (348) start at activation (0).
    288, 215, 348, 195, 88,
    // prep7 (issue142-shadow-rows-extra.json): Aerial Ace / Quick Attack accepted windows begin before activation (idle
    // rows owned by the preceding message command); the live age basis is the activation frame (reducer age 42 / 44), so
    // the shadow row is live age 0.
    332, 98,
    // Ice Punch (staged windows start at activation: row 0). Sleep Talk likewise. Fire Punch (prep22 s0.2: body A = row 0).
    8, 7, 214, 157, 126, 349,
    // prep8 (issue142-shadow-rows-extra.json): every window starts at the activation frame (row 0).
    129, 271, 218, 69, 32, 62, 253, 85, 254, 192,
    // prep10 (issue142-shadow-rows-extra.json): Magnitude / Reversal windows start at the activation frame (row 0).
    222, 179, 220, 350, 13,
    // prep9 (issue142-shadow-rows-extra.json): Giga Drain, Sunny Day, Mega Drain, Dream Eater windows start at the
    // activation frame (row 0). Absorb's window starts 10 frames after it (row -10, the Taunt convention): no row.
    202, 241, 72, 138,
    // Feather Dance (297): the live window starts at the activation frame (row 0). Double Team (104): the first window row is
    // one frame after the activation (row -1): no row.
    297,
    // prep11 (issue142-shadow-rows-extra.json): Leech Seed main body window starts at the activation frame (row 0).
    73, 80, 161, 169, 193, 194, 278, 314, 327,
    // Roar / Whirlwind: activation == window start (row 0) on both sides (prep11 s0.2).
    46, 18,
    // Fly / Bounce charge and strike: activation == window start (row 0), prep11 s0.2.
    19, 340,
    // Rollout bodies 1..5: activation == window start (row 0) on both sides.
    205,
    // Faithful-random adapters (liveMovePresentationRng.ts): Double Kick hit bodies, Astonish, Thrash, Flail, Wish start at activation (row 0,
    // prep12 §0.2 / random2-r1 activation probes).
    24, 310, 37, 175, 273,
    // Hyper Beam (63, faithful-random): activation == accepted window start (row 0), prep13 s0.1.
    63,
    // prep17: Mud-Slap, Sand-Attack faithful-random windows start at activation (row 0).
    189, 28,
    // prep18: Dig setup and unleash windows start at activation (row 0).
    91,
    // prep13 (issue142-shadow-rows-extra.json): Ice Beam, Water Spout activation == accepted window start (row 0), prep13 s0.1-0.2.
    58, 323, 237,
    // prep14 s2: Rain Dance, Water Pulse (faithful-random) and Hail activation == accepted window start (row 0).
    240, 352, 258,
    // prep16: Overheat, Silver Wind first-body activation == window start (row 0; prep16 s1, captures of the first-body scenarios).
    315, 318, 244,
    // oam1: Will-O-Wisp, Pursuit (normal body), Fury Cutter (counter 1) activation == window start (row 0; prep18-activation.json).
    261, 228, 210,
    // Return (strongest): activation == window start (row 0; prep24 / prep18 return probes, both sides).
    216,
    // Spit Up: activation == window start (row 0; prep31 / s10a-live spit-up windows, both sides, all three counters).
    255,
    // Shock Wave: activation == window start (row 0; d4a-live/shock-wave-*.json). The live hook draws an elevated opponent's shadow (WEEZING in
    // both roles: 195 px at age 0 otherwise, docs/next-adapters-prep33.md s1.4).
    351,
    // D4 faithful timing: Superpower windows start at activation (row 0; s10a-live/superpower-*.json; elevated WEEZING opponent in both roles:
    // 195 px at age 0 otherwise).
    276,
    // prep27: Baton Pass activation == window start (row 0; the dense body probe's first active frame, elevated NINJASK attacker).
    226,
    // prep27: Endeavor activation == window start (row 0; the dense script window, elevated GOLBAT target / NINJASK attacker).
    283,
    // curse-live: Curse (stats body) activation == window start (row 0; curseProbe.py sourceWindow, elevated PIDGEOT target dense).
    174,
    // prep22 P1: Lovely Kiss (faithful-random), Spikes, Octazooka windows start at activation (row 0; prep22 moves/*.json, both sides).
    142, 191, 190, 324,
    // Q2 (prep25 moves/*.json): the windows start at activation (row 0).
    304, 123, 328, 143, 173,
    // prep29 R1: Bonemerang windows start at activation (row 0).
    155, 229, 200, 295,
    // D4a faithful timing (liveMoveTimingPolicy.ts): Mach Punch windows start at activation (row 0; prep25 moves/mach-punch.json).
    183,
    // D4b faithful timing: Megahorn windows start at activation (row 0; d4a-live/megahorn-*.json, elevated GOLBAT target: 200 px at age 0 otherwise).
    224,
    // D4b faithful timing: Revenge windows start at activation (row 0; d4a-live/revenge-*.json).
    279,
    // Faithful timing: Nightmare windows start at activation (row 0; d4a-live/nightmare-*.json). The live hook draws an elevated opponent's
    // shadow whichever role it has (GENGAR -> GOLBAT player window: 200 px at age 0 otherwise, docs/next-adapters-prep32.md s1.5).
    171,
    // D4c faithful timing: Psywave windows start at activation (row 0; d4a-live/psywave-*.json). The live hook draws an elevated opponent's
    // shadow whichever role it has (ESPEON -> CROBAT player window: 200 px at age 0 otherwise, docs/next-adapters-prep30.md s2.4).
    149,
    // S10A: Eruption windows start at activation (row 0; s10a-live/eruption-*.json). The live hook draws an elevated opponent's shadow whichever
    // role it has (CAMERUPT -> WEEZING player / WEEZING -> GOLEM opponent: 195 px at age 0 otherwise, prep36 s0.2).
    284,
    // S10A faithful timing: Skill Swap windows start at activation (row 0; s10a-live/skill-swap-*.json). The live hook draws an elevated
    // opponent's shadow whichever role it has (ESPEON -> WEEZING player / WEEZING -> SNORLAX opponent: 195 px at age 0 otherwise, prep35 s1.3).
    285,
    // D4c faithful timing: Extrasensory windows start at activation (row 0; d4a-live/extrasensory-*.json; elevated CROBAT opponent in both roles).
    326,
    // D4b faithful timing + D3: Meteor Mash windows start at activation (row 0; prep12 plans.json acceptedWindowStartMinusActivation 0).
    309,
    // Faithful timing + D3: Ice Ball counter-0 windows start at activation (row 0; s10a-live/ice-ball-*.json).
    301,
    // Faithful timing + D3: Dive setup windows start at activation (row 0; s10a-live/dive-*.json; elevated GOLBAT target: the shadow row).
    291,
    // Sheer Cold (ISSUES #151, species audit 7 elevated FLYGON / GOLBAT opponent, both orientations): activation == window start (row 0).
    329,
    // Extreme Speed (prep34 s1.5): live age 0 = activation (s10a-live/extreme-speed-*.json; elevated GOLBAT target window).
    245,
    // Memento (prep34 s2.5): live age 0 = activation (s10a-live/memento-*.json; elevated GOLBAT target window). An elevated opponent-side
    // attacker (WEEZING) is at HP 0 already, so the hook's IsBattlerSpritePresent gate leaves its shadow hidden (battleScene.ts).
    262,
    // Substitute body (prep37 s1): live age 0 = activation (elevated GOLBAT attacker: 200 px at age 0 otherwise). No shadow return
    // after it: the doll keeps the shadow hidden (battle_gfx_sfx_util.c:1220; battleCommandFieldArt.ts).
    164,
  ].map((id) => [id, 0] as [number, number]).concat([
    // Bind (prep s2.7): activation 384/438 vs window 382/436 -> row +2, the first non-zero row; the shared hook
    // arms the shadow when the live age equals the row, so a non-zero row needs no further code.
    [20, 2],
  ])),
);

/**
 * Rows before the end of the body on which the elevated-opponent enemy shadow is shown again: `SpriteCB_EnemyShadow`
 * re-shows it when the script ends (one display frame later), and these accepted windows extend 2 frames past the script
 * end (docs/live-species-audit-2.md 2.1). Any adapter whose window ends after the script end needs its own entry.
 */
export const LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS: Readonly<Record<number, number>> = Object.freeze({ 113: 2, 248: 2 });

/**
 * ISSUES #147: ordinary rows after a live body on which the elevated-opponent shadow stays hidden, keyed by attacker side
 * then move id. `SpriteCB_EnemyShadow` re-shows the shadow one display frame after the ROM script ends; these accepted
 * windows end d = scriptEnd - E frames before it, so the shadow returns on E + d + 1
 * (tools/integration/fixtures/elevated-postbody/script-end-vs-window-table.json, docs/elevated-postbody-audit.md 3;
 * pinned by tests/elevatedRendererPostBody.test.ts). Unlisted move/side pairs measured d = 0 or were not measured.
 */
export const LIVE_MOVE_OPPONENT_SHADOW_POST_BODY_HIDE_ROWS: Readonly<Record<"player" | "opponent", Readonly<Record<number, number>>>> =
  Object.freeze({
    // Absorb, Dragon Rage, Dream Eater, Psybeam, Razor Wind, Sing, Sky Uppercut.
    player: Object.freeze({ 71: 2, 82: 21, 138: 1, 60: 1, 13: 1, 47: 1, 327: 1 }),
    // Absorb, Dragon Rage, Horn Drill.
    opponent: Object.freeze({ 71: 2, 82: 21, 32: 1 }),
  });

/** Post-body shadow hide rows for a finished live request (0 when the shadow returns on E+1). */
export function liveMoveOpponentShadowPostBodyHideRows(request: BattleMoveAnimationRequest): number {
  return LIVE_MOVE_OPPONENT_SHADOW_POST_BODY_HIDE_ROWS[request.attacker === 0 ? "player" : "opponent"][request.moveId] ?? 0;
}

/** True when `age` is on one of the final return rows of a request (see LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS). */
export function liveMoveOpponentShadowReturn(request: BattleMoveAnimationRequest, age: number): boolean {
  const rows = LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS[request.moveId];
  if (rows === undefined) return false;
  const duration = liveMoveAnimationDuration(request);
  return duration !== null && age >= duration - rows;
}

/** Shadow row for a live request, or null when the activation frame is outside the window. */
export function liveMoveOpponentShadowRow(request: BattleMoveAnimationRequest): number | null {
  // Dig unleash: the attacker is still hidden (semi-invulnerable) on its activation frame, so the shadow is not shown (prep18 dense,
  // elevated FLYGON opponent attacker: 200 px at age 0 otherwise); only the setup body shows it.
  if (request.moveId === 91 && (request.turn & 1) === 1) return null;
  return LIVE_MOVE_OPPONENT_SHADOW_ROW[request.moveId] ?? null;
}

export interface LiveBattlerAnchors {
  /** `GetBattlerSpriteCoord2(battler, X_2/Y_PIC_OFFSET)`. */
  readonly picOffsetPoint: Readonly<{ x: number; y: number }>;
  /** Unshifted battler OBJ center (sprite x/y; BG1_X/BG1_Y source). */
  readonly spriteCenter: Readonly<{ x: number; y: number }>;
  /** `sBattlerCoords` x/y for the battler position. */
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
  /** `MON_PIC_HEIGHT - 2 * yDelta` from the species pic coords. */
  readonly pictureHeight: number;
  /** Front idle rest offset (opponent only; the player back sprite has none); {0,0} once the x2 history is zeroed. */
  readonly frontIdleRest: Readonly<{ x2: number; y2: number }>;
}

/**
 * Raw source anchors for one live battler. Per-move side corrections (Disable
 * -8, Rest -16, ...) stay in each adapter. Sources, pokeemerald:
 * - battle_anim_mons.c:112-165 GetBattlerSpriteCoord: X/X_2 read sBattlerCoords;
 *   Y_PIC_OFFSET is GetBattlerSpriteFinal_Y(..., TRUE).
 * - battle_anim_mons.c:269-292 GetBattlerSpriteFinal_Y: YDelta, minus enemy
 *   elevation for the opponent, plus sBattlerCoords y; TRUE adds 8 on the
 *   player side and clamps to DISPLAY_HEIGHT - MON_PIC_HEIGHT + 8 (= 104).
 * - battle_anim_mons.c:294 GetBattlerSpriteCoord2 (X_2/Y_PIC_OFFSET forwards
 *   to the same values; the species is the displayed one).
 * - battle_gfx_sfx_util.c battler sprite creation: the OBJ is a 64x64 canvas
 *   placed at the sBattlerCoords x with the species yOffset, so the OBJ
 *   center is spriteCorner + 32 (opponent corner includes the elevation).
 */
export function liveBattlerAnchors(
  battler: "player" | "opponent",
  art: ReturnType<typeof createBattleCommandFieldArtView>,
  x2Input?: LiveMoveBattlerX2Input,
): LiveBattlerAnchors {
  const origin = battleCommandFieldSpriteOrigin(art[battler], battler);
  return {
    picOffsetPoint: {
      x: origin.x + 32,
      y: Math.min(104, origin.y + 32 + (battler === "player" ? 8 : 0)),
    },
    spriteCenter: { x: origin.x + 32, y: origin.y + 32 },
    battlePositionCenter: battler === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    pictureHeight: 64 - 2 * art[battler].coords.yOffset,
    // The species rest until a body runs an absolute-reset task on the battler (liveBattlerX2History.ts, ISSUES #148).
    frontIdleRest: battler === "opponent"
      ? liveTrackedFrontIdleRest(battler, speciesFrontIdleRestOffsetOrZero(art[battler].speciesSymbol), x2Input)
      : { x2: 0, y2: 0 },
  };
}

/**
 * MOVE_MEMENTO reducer config from the displayed field (docs/next-adapters-prep34.md s2.4): x = the battler sprite x; shadowTop =
 * GetBattlerSpriteCoordAttr(TOP) - 7 = Y_PIC_OFFSET - height / 2 - 7 (picOffsetPoint: player sprite y + 8 clamped at 104); shadowBottom = the
 * battle-position y + 31; bgX / bgY = 32 - (x + x2), 32 - (y + y2) (MoveBattlerSpriteToBG; x2 = an opponent front sprite's idle rest); BG /
 * priority rank / palette per side (K). Activation = the battle's FIRST animation body: the scanline entry is the intro residue
 * FIRST_BODY_SCANLINE (equal up to a display-neutral bank relabel) and WIN0 240 / 161.
 */
export function liveMementoReducerConfig(
  field: BattleResolutionDisplayedField, attackerSide: "player" | "opponent", x2Input?: LiveMoveBattlerX2Input,
): MementoConfig {
  const art = createBattleCommandFieldArtView(field);
  const battler = (side: "player" | "opponent"): MementoBattlerConfig => {
    const anchors = liveBattlerAnchors(side, art, x2Input), opponent = side === "opponent";
    return { battlerId: opponent ? 1 : 0, side, bg: opponent ? "BG1" : "BG2", bgPriorityRank: opponent ? 1 : 2, x: anchors.spriteCenter.x,
      shadowTop: anchors.picOffsetPoint.y - (liveBattlerCoordAttrs(side, art).height >> 1) - 7, shadowBottom: anchors.battlePositionCenter.y + 31,
      bgX: 32 - (anchors.spriteCenter.x + anchors.frontIdleRest.x2), bgY: 32 - (anchors.spriteCenter.y + anchors.frontIdleRest.y2),
      bgPaletteId: opponent ? 8 : 9 };
  };
  return { attacker: battler(attackerSide), target: battler(attackerSide === "player" ? "opponent" : "player"),
    initialScanlineSourceBuffer: FIRST_BODY_SCANLINE.srcBuffer as 0 | 1,
    initialScanlineBuffers: FIRST_BODY_SCANLINE.buffers as unknown as readonly [readonly number[], readonly number[]],
    initialWindow: { win0h: 240, win0v: 161 } };
}

/**
 * `GetBattlerSpriteCoordAttr` width/height/yOffset (battle_anim_mons.c:2151-2280): the species pic coords
 * the field art view already carries (back table for the player, front for the opponent).
 */
export function liveBattlerCoordAttrs(
  battler: "player" | "opponent",
  art: ReturnType<typeof createBattleCommandFieldArtView>,
): { readonly width: number; readonly height: number; readonly yOffset: number } {
  const { width, height, yOffset } = art[battler].coords;
  return { width, height, yOffset };
}

const effectOrderProvable = new Map<string, boolean>();
/**
 * Icy Wind / Blizzard replay source CreateSprite/SortSprites against the retained OAM slot table, which
 * their reducers verify and throw on (icyWind.ts:257, blizzard.ts:562). The table was captured at the
 * accepted geometry; a species pair whose pic points sort the particles differently is not proven, so
 * the live seam returns null (the scene-off view) instead of throwing mid-battle. The result depends on
 * the geometry only and is cached per (move, side, geometry).
 */
function provableEffectOrder(moveId: 196 | 59, side: "player" | "opponent", duration: number,
  geometry: Parameters<typeof icyWindEffectOamOrderAtAge>[2] | Parameters<typeof blizzardEffectOamOrderAtAge>[2]): boolean {
  const key = `${moveId}/${side}/${JSON.stringify(geometry)}`;
  let ok = effectOrderProvable.get(key);
  if (ok === undefined) {
    try {
      if (moveId === 196) icyWindEffectOamOrderAtAge(duration - 1, side, geometry as Parameters<typeof icyWindEffectOamOrderAtAge>[2]);
      else blizzardEffectOamOrderAtAge(duration - 1, side, geometry);
      ok = true;
    } catch { ok = false; }
    effectOrderProvable.set(key, ok);
  }
  return ok;
}

/** Free OBJ slots over the known-entry in-use set [0,1,2,6,8,60..63] (prep13 s1.2 launchSpriteSlots), ascending. */
const KNOWN_ENTRY_FREE_SPRITE_SLOTS: readonly number[] = Object.freeze(
  Array.from({ length: 64 }, (_, slot) => slot).filter(slot => ![0, 1, 2, 6, 8, 60, 61, 62, 63].includes(slot)));

const waterSpoutInputsCache = new Map<string, Readonly<WaterSpoutLiveInputs>>();
/**
 * prep13 s1.2: Water Spout's live inputs. HP = the attacker's party HP at activation (GetWaterSpoutPowerForAnim tier +
 * HorizontalShake length); `attackerSourceHeight` = the attacker's picture height (SetBattlerSpriteYOffsetFromYScale; the
 * reducer default 40 is Nosepass's); the rest are the known-entry constants. Memoised so the reducer's timeline cache hits.
 */
function waterSpoutLiveInputs(
  field: BattleResolutionDisplayedField, attackerSide: "player" | "opponent", order?: readonly number[],
): Readonly<WaterSpoutLiveInputs> | null {
  const mon = field[attackerSide];
  if (mon.maxHP <= 0 || mon.hp < 0 || mon.hp > mon.maxHP) return null;
  const art = createBattleCommandFieldArtView(field);
  const anchors = liveBattlerAnchors(attackerSide, art);
  const key = `${attackerSide}/${mon.hp}/${mon.maxHP}/${anchors.pictureHeight}/${anchors.picOffsetPoint.x},${anchors.picOffsetPoint.y}/${order?.join(",") ?? ""}`;
  let inputs = waterSpoutInputsCache.get(key);
  if (inputs === undefined) {
    inputs = Object.freeze({
      attackerSide, attackerHp: mon.hp, attackerMaxHp: mon.maxHP, attackerEffectCenter: anchors.picOffsetPoint,
      attackerSubpriority: attackerSide === "player" ? 30 : 40, launchTaskSlot: 0, launchSpriteSlots: KNOWN_ENTRY_FREE_SPRITE_SLOTS,
      attackerSourceHeight: anchors.pictureHeight, animationRng: 0, ...(order ? { spriteOrderSeed: order } : {}),
    });
    waterSpoutInputsCache.set(key, inputs);
  }
  return inputs;
}

/**
 * MOVE_SHOCK_WAVE's body timing from the live geometry (docs/next-adapters-prep33.md s0.2): the attacker's X_2 / Y_PIC_OFFSET picture origin
 * (the progressing bolt's destroy row), the target's picture origin and its plain BATTLER_COORD_Y (the lightning count).
 */
function liveShockWaveTiming(field: BattleResolutionDisplayedField, attackerSide: "player" | "opponent") {
  const art = createBattleCommandFieldArtView(field);
  const attacker = liveBattlerAnchors(attackerSide, art), target = liveBattlerAnchors(attackerSide === "player" ? "opponent" : "player", art);
  return shockWaveTimingFor({ attackerSide, attackerPictureOrigin: attacker.picOffsetPoint, targetPictureOrigin: target.picOffsetPoint,
    targetBattlePosition: target.battlePositionCenter, derivedTiming: true });
}

const eruptionProfileCache = new Map<string, ReturnType<typeof liveEruptionProfile>>();
/**
 * MOVE_ERUPTION's source-derived profile (docs/next-adapters-prep36.md s2; liveProfileMoves.ts liveEruptionProfile) from the displayed field: the
 * anchors, the attacker's pic-coords y_offset, the asset composite, the known-entry scene and the lent activation order (the schedule depends on
 * the attacker sprite y only). Null without a composite. Memoised (the launch reducer runs twice per profile).
 */
function liveEruptionProfileFor(field: BattleResolutionDisplayedField, attackerSide: "player" | "opponent", activationOrder: readonly number[]) {
  const art = createBattleCommandFieldArtView(field);
  const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
  if (palettes === null) return null;
  const anchors = { player: liveBattlerAnchors("player", art), opponent: liveBattlerAnchors("opponent", art) };
  const key = JSON.stringify([attackerSide, art.player.speciesSymbol, art.opponent.speciesSymbol, anchors, activationOrder]);
  let profile = eruptionProfileCache.get(key);
  if (profile === undefined) {
    profile = liveEruptionProfile({ attackerSide, anchors, attackerYDelta: art[attackerSide].coords.yOffset, palettes,
      warmRockPalette: (eruptionWarmRockAsset as unknown as { palette: { r: number; g: number; b: number }[] }).palette,
      sceneSprites: KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as readonly number[], subpriority: s.subpriority })),
      battlerSprites: { player: battlerSprite("player", anchors.player), opponent: battlerSprite("opponent", anchors.opponent) },
      activationOrder, animationRng: 0,
      launchLifetime: (launch, sourceOffset) => {
        const frame = eruptionLaunchTimeline(launch as unknown as EruptionLaunchProfile).find((fr) => fr.task !== null && fr.source?.offset === sourceOffset);
        if (!frame?.task) throw new Error(`Eruption launch wave ${sourceOffset} has no task`);
        return frame.task.lifetime;
      },
      fallingCalls: ERUPTION_FALLING_ROCK_SOURCE_CALLS });
    if (eruptionProfileCache.size > 16) eruptionProfileCache.clear();
    eruptionProfileCache.set(key, profile);
  }
  return profile;
}

/**
 * S10A Substitute (docs/next-adapters-prep37.md s3b): every live renderer composes both battlers from species art
 * (liveSceneOnBattlerArt), so while the displayed DEFENDER is the Substitute doll the body would draw the mon where the
 * ROM shows the doll (e.g. Tackle's monbg ANIM_TARGET moves the doll): it declines to the fallback. While only the
 * ATTACKER is the doll the ROM runs SUBSTITUTE_TO_MON, the body on the mon and MON_TO_SUBSTITUTE (liveSubstituteSwap.ts):
 * presented for the proven bodies (LIVE_SUBSTITUTE_SWAP_BODY_IDS, last hit), every other attacker-doll body declines.
 */
export function liveMoveSubstituteDollDeclines(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): boolean {
  const swap = liveSubstituteSwapApplies(request, field);
  if (swap !== null) return !swap;
  return (request.target === 0 ? field.player : field.opponent).substituteDoll === true;
}

export function liveMoveAnimationDuration(
  request: BattleMoveAnimationRequest, field?: BattleResolutionDisplayedField,
): number | null {
  if (field !== undefined && liveSubstituteSwapApplies(request, field) === true) {
    const body = liveMoveAnimationDuration(request, substituteSwapBodyField(field, request.attacker === 0 ? 0 : 1));
    return body === null ? null : substituteSwapCompositeDuration(request.attacker === 0 ? "player" : "opponent", body);
  }
  if (field !== undefined && liveMoveSubstituteDollDeclines(request, field)) return null;
  switch (request.moveId) {
    // Shock Wave (prep33): activation .. the derived first inactive row (262..266 measured), only defined with the displayed field.
    // Eruption (prep36 s2): the first inactive row = E2 + 294 from the attacker sprite y (476..500 rows measured), only defined with the field.
    case 284: {
      const profile = field === undefined ? null : liveEruptionProfileFor(field, request.attacker === 0 ? "player" : "opponent", []);
      return profile === null ? null : profile.endAge + 1;
    }
    case 351: return field === undefined ? null : liveShockWaveTiming(field, request.attacker === 0 ? "player" : "opponent").cleanupAge + 1;
    // Water Spout (prep13 s1.2): the body length depends on the attacker's party HP and picture height (accepted rows
    // 278 full HP / 276 KINGDRA player-back / 270..201 at lower HP tiers), so it is only defined with the displayed field.
    case 323: {
      const inputs = field === undefined ? null : waterSpoutLiveInputs(field, request.attacker === 0 ? "player" : "opponent");
      return inputs === null ? null : waterSpoutTimeline(inputs).length;
    }
    case 2: return KARATE_CHOP_FRAME_COUNT;
    case 245: return 321; // Extreme Speed: activation .. first inactive row (prep34 s1.1, both sides, both species pairs).
    // Memento (prep34 s2.3): the body length depends on the shadow geometry (175..179 rows measured), only defined with the displayed field.
    case 262: return field === undefined ? null : reduceMemento(liveMementoReducerConfig(field, request.attacker === 0 ? "player" : "opponent")).length;
    case 9: return THUNDER_PUNCH_MOVE_BODY_LAST_AGE + 1;
    case 5: return 160; // Mega Punch source body through first inactive row.
    case 11: return 42; // Vice Grip source body through first inactive row.
    case 12:
      return request.attacker === 0
        ? GUILLOTINE_PLAYER_FRAME_COUNT
        : GUILLOTINE_OPPONENT_FRAME_COUNT;
    case 14: return SWORDS_DANCE_FRAME_COUNT;
    case 21: return 54; // Slam source body through first inactive row.
    case 23: return STOMP_FRAME_COUNT;
    case 25: return 160; // Mega Kick source body through first inactive row.
    case 27: return 55; // Rolling Kick source body through first inactive row.
    case 29: return 48; // headbuttAtAge: active through 46, then cleanup.
    case 34: return 107; // Body Slam source body through final cleanup row.
    case 36: return 98; // Take Down source body through final cleanup row.
    case 38: return DOUBLE_EDGE_FRAME_COUNT;
    case 39: return TAIL_WHIP_FRAME_COUNT;
    case 41: return 37; // Twineedle's two stingers through clearmonbg cleanup.
    case 42: return 93; // Pin Missile's complete source pointer body.
    case 43: return 70; // Leer source body through its last ShakeMon2 row.
    case 44: return 26; // First sharp-teeth row through inactive cleanup.
    // Full source-script body, including the target-monbg / palette cleanup.
    case 47: return request.attacker === 0 ? 245 : 248;
    case 48: return 51; // First Supersonic ring through the final inactive row.
    case 49: return 52; // Sonic Boom source body through the final inactive row.
    case 51: return 131; // Acid source body through its final row.
    case 55: return 111; // Water Gun source body through its final row.
    case 65: return 91; // Drill Peck's full BowMon/impact/cleanup body.
    case 66: return 124; // Submission source body through monbg cleanup.
    case 67: return 33; // Low Kick source body through first inactive row.
    case 68: return 88; // Counter's source body through final clear display.
    case 78:
    case 79: return STUN_SPORE_FRAME_COUNT;
    case 83: return 104; // Fire Spin source window through target-shake cleanup.
    case 92: return 219; // Toxic's bubbles through the source-owned cleanup.
    case 93:
    case 94: return 140; // Psychic-background fade-out through inactive cleanup.
    case 95:
      return request.attacker === 0
        ? HYPNOSIS_PLAYER_FRAME_COUNT
        : HYPNOSIS_OPPONENT_FRAME_COUNT;
    case 50: return DISABLE_WINDOW_FRAMES;
    case 74: return 63; // Growth's second ScaleMonAndRestore through cleanup.
    case 75: return RAZOR_LEAF_BODY_LAST_AGE + 1;
    case 97: return AGILITY_FRAME_COUNT;
    case 101: return NIGHT_SHADE_FRAME_COUNT;
    case 103: return SCREECH_FIRST_INACTIVE_AGE + 1;
    case 105: return 169; // Recover's final blend/star source-owned row.
    case 106: return 101; // Harden source body through its final blend row.
    case 108: return 125; // smokescreenAtAge: active through 123.
    case 109: return CONFUSE_RAY_FRAME_COUNT;
    // Script activation through the two inactive controller displays after
    // resource destruction. The following success printer starts next.
    case 112:
    case 277: return 76; // Defensive wall script through its first inactive cleanup row.
    case 113: return 88;
    case 115: return 79; // Reflect script (activation..cleanup pointer row).
    case 182: return 123; // Protect script through its first inactive row.
    case 243: return 86; // Mirror Coat script (activation..cleanup pointer row).
    case 122: return 73;
    case 124: return 102; // Sludge source body through its final row. // Lick source body through first inactive row.
    case 131: return 84; // Spike Cannon pointer body through inactive cleanup.
    case 136: return 91; // Hi Jump Kick source body through first inactive row.
    case 147: return SPORE_FRAME_COUNT;
    case 148: return 64; // Flash source body (snap, hold, 16..0 ramp) through cleanup.
    case 114: return 202; // Haze's FadeToBg/fog restore through cleanup.
    case 151: return ACID_ARMOR_FIRST_INACTIVE_AGE + 1;
    case 154: return FURY_SWIPES_LAST_BODY_AGE + 1;
    case 3: return 34; // Double Slap per-hit accepted window.
    case 4: case 167: return 37; // Comet Punch / Triple Kick per-hit accepted window.
    case 156: return REST_FRAME_COUNT;
    case 158: return 107; // Hyper Fang restorebg fade through cleanup.
    case 162: return 200; // Super Fang's complete palette/return cleanup body.
    case 163: return 46; // Slash body through final source-owned shake row.
    case 172: return 170; // Flame Wheel source body through cleanup.
    case 201: return 168; // Sandstorm source body (weather bookkeeping stays in rules).
    case 211: return 197; // Steel Wing source body through first inactive row.
    case 223: return 75; // Dynamic Punch source body through first inactive row.
    case 231: return 135;
    case 232: return 140; // Metal Claw source body through its final row. // Iron Tail source body through first inactive row.
    case 235: return 130; // Synthesis grow/star body through cleanup.
    case 178: return COTTON_SPORE_FRAME_COUNT;
    case 180: return 221; // Spite ghost-bg/target-clone body through cleanup.
    case 208: return 186; // Milk Drink bottle/ring/star body through cleanup.
    case 186: return SWEET_KISS_FRAME_COUNT;
    case 188: return 160; // Sludge Bomb source body through its final row.
    case 56: return 141; // Hydro Pump source body through its final row.
    case 61: return 239; // Bubble Beam source body through its final row.
    case 197: return 110; // Detect source body through its final row.
    case 238: return 88; // Cross Chop source body through its final row.
    case 259: return 177; // Torment source body through its final row.
    case 294: return 203; // Tail Glow source body through its final row.
    case 86: return 120; // Thunder Wave accepted source animation window.
    case 87: return 262; // Thunder source body through the first inactive cleanup row.
    case 107: return 153; // Minimize accepted source window.
    case 116: return 122; // Focus Energy accepted source window.
    case 203: return 122; // Endure accepted source window.
    case 207: return 161; // Swagger accepted source window.
    case 263: return 81; // Facade accepted source window.
    case 339: return 104; // Bulk Up accepted source window.
    // Cmd_choosetwoturnanim (battle_anim.c:1073): gAnimMoveTurn bit 0 selects the unleash body.
    case 76: return (request.turn & 1) === 0 
        ? SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE + 1 : SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE + 1;
    // AnimTask_IsHealingMove (battle_anim_effects_3.c:1531): heal iff gAnimMoveDmg <= 0.
    case 217: return request.damage > 0 ? PRESENT_DAMAGE_FRAME_COUNT : PRESENT_HEAL_FRAME_COUNT;
    case 250: return 133; // Whirlpool main body (accepted window 78..210); residual is a general animation.
    case 236: return 352; // Moonlight accepted source window (207..558).
    // The accepted opponent-front Mud Shot window is one row shorter.
    case 341: return request.attacker === 0 ? 145 : 144;
    case 204: return CHARM_BODY_FRAME_COUNT;
    case 213: return ATTRACT_FRAME_COUNT;
    case 227: return ENCORE_END_AGE + 1;
    case 242: return 142; // Crunch dark-background body through cleanup.
    case 246: return 128; // ancientPowerAtAge: active through 126, cleanup at 127.
    case 247: return SHADOW_BALL_END_AGE + 1;
    case 264:
      return FOCUS_PUNCH_FIRST_INACTIVE_AGE[
        request.target === 0 ? "player" : "opponent"
      ] + 1;
    case 272: return 147; // Role Play silhouette/blend body through cleanup.
    case 280:
      return request.turn === 0
        ? BRICK_BREAK_NORMAL_FRAME_COUNT
        : BRICK_BREAK_SHATTERED_FRAME_COUNT;
    case 290: return 102; // Factory Secret Power -> Strength complete body.
    case 302: return NEEDLE_ARM_FRAME_COUNT;
    case 257: return 168; // Heat Wave source body through cleanup.
    case 281: return YAWN_CLEANUP_AGE + 1;
    case 287: return REFRESH_FRAME_COUNT;
    case 305: return 104; // Poison Fang body through blend/monbg cleanup.
    case 306: return 69; // Crush Claw body through inactive cleanup.
    case 320: return GRASS_WHISTLE_WINDOW_FRAMES;
    // The opponent-front script drops its final wave one source row earlier.
    case 319: return request.attacker === 0 ? 86 : 85;
    case 321: return TICKLE_FRAME_COUNT;
    // Source restorebg fade, then inactive display. Both orientations restore.
    case 325: return request.attacker === 0 ? 106 : 105;
    // The source Block script is two rows longer on the opponent-front side.
    case 335: return request.attacker === 0 ? 141 : 146;
    case 334: return 101; // Iron Defense source body through its final blend row.
    case 336: return HOWL_FRAME_COUNT;
    case 337: return 137; // Dragon Claw palette restoration through cleanup.
    case 342: return 187; // Poison Tail source body through first inactive row.
    case 343: return COVET_FRAME_COUNT;
    case 89: return 198; // Earthquake accepted window (197 rows from presentation age 1).
    case 90: return FISSURE_FRAME_COUNT;
    case 152: return CRABHAMMER_FRAME_COUNT;
    case 345: return MAGICAL_LEAF_FRAME_COUNT;
    case 60: return 160; // Psybeam accepted window (source script through first inactive row).
    case 133: return 216; // Amnesia accepted window (source script through first inactive row).
    case 135: return 272; // Soft-Boiled accepted window (first inactive row 271).
    case 298: return 169; // Teeter Dance accepted window (firstInactiveAge 168).
    case 146: return 69; // Dizzy Punch accepted window; script tail 5 rows uncovered.
    case 184: return 190; // Scary Face accepted window (79..268); script tail 14 rows uncovered.
    case 137: return 213; // Glare accepted window (GLARE_SOURCE_FRAME_COUNT).
    case 57: case 330: return SURF_WAVE_FRAME_COUNT; // Surf / Muddy Water accepted window (144 rows).
    case 196: return 287; // Icy Wind accepted window (220..506).
    // Blizzard accepted windows: 214..585 player-back, 213..573 opponent-front (Guillotine precedent).
    case 59: return request.attacker === 0 ? 372 : 361;
    case 252: return 86; // Fake Out accepted window (78..163 / 82..167).
    case 164: return SUBSTITUTE_FRAME_COUNT; // Substitute body: activation .. first inactive row (prep37 s1, every pair and both sides).
    case 322: return 241; // Cosmic Power accepted window (294..534).
    // H_BUFFER S1 accepted windows (docs/h-buffer-s1-prep.md).
    case 212: return 171; // Mean Look (71..241 / 75..245).
    case 265: return 121; // Smelling Salt (218..338).
    case 111: return 100; // Defense Curl (214..313 / 215..314).
    case 275: return 164; // Ingrain (205..368 / 293..456).
    case 35: return 38; // Wrap (222..259 / 78..115).
    case 20: return 45; // Bind (382..426 / 436..480).
    // prep5 accepted windows (docs/next-adapters-prep5.md s2.4).
    case 296: return 213; // Mist Ball (75..287 / 79..291).
    // Aromatherapy: both windows end on the same script-end frame 474 but start at activation 75 / 79, so the
    // opponent-attacker window is 4 rows shorter (the reducer frameCount is 400; Blizzard precedent).
    case 312: return request.attacker === 0 ? 400 : 396;
    case 266: return 185; // Follow Me (69..253 / 73..257).
    case 118: return 127; // Metronome body (245..371 / 244..370); the called move is a separate request.
    case 269: return 125; // Taunt (76..200 / 80..204); script activation is 10 frames earlier.
    case 187: return 110; // Belly Drum (231..340 / 211..320).
    case 299: return 78; // Blaze Kick (399..476 / 453..530); the script runs 9 frames past the window (485/539), uncovered.
    case 88: return 87; // Rock Throw (296..382 / 296..382, no tail).
    case 195: return 259; // Perish Song (71..329 / 75..333, no tail).
    case 348: return 224; // Leaf Blade (76..299 / 80..303, no tail).
    case 80: return 244; // Petal Dance 215..458 / 217..460 (prep11 s0.2).
    // Fly / Bounce (prep11 s0.2): charge 51..93 (43 rows) / strike 408..475 (68); Bounce charge 254..317 (64) /
    // strike 771..825 (55). request.turn = gAnimMoveTurn (0 charge, 1 strike).
    case 19: return (request.turn & 1) === 0 ? 43 : 68;
    // Dive (S10A, faithful timing with D3; prep25 s0.2 / B.1): SETUP body only (request.turn bit 0 = 0): the first inactive age from the
    // attacker's ball rule on the displayed field (species audit 11; without the field the side defaults 117 / 114), + the first inactive row. The attack body (turn 1) declines: its activation order is the setup
    // body's words-dependent droplet sort (docs/s10a-random2-order-lend-blocker.md).
    case 291: { const side = request.attacker === 0 ? "player" : "opponent";
      return (request.turn & 1) === 0 ? liveDiveSetupFirstInactive(side, field === undefined ? undefined
        : liveBattlerAnchors(side, createBattleCommandFieldArtView(field)).picOffsetPoint.y) + 1 : null; }
    case 340: return (request.turn & 1) === 0 ? 64 : 55;
    // Rollout bodies by request.rolloutCounter (accepted corpus rows 167, 167, 161, 153, 145; prep11 s0.2).
    case 205: {
      const counter = request.rolloutCounter ?? 0;
      return [167, 167, 161, 153, 145][counter - 1] ?? null;
    }
    case 46: return request.attacker === 0 ? 99 : 104; // Roar 252..350 / 219..322 (cry timing differs by side; prep11 s0.2).
    case 18: return 83; // Whirlwind 222..304 / 316..398 (prep11 s0.2).
    case 278: return 203; // Recycle 2193..2395 / 2589..2791 (prep11 s0.2).
    case 169: return 207; // Spider Web 220..426 / 219..425.
    case 327: return 188; // Sky Uppercut 82..269 / 86..273; the COMBUSKEN script ends one frame later (prep11 open point 1).
    case 193: return 167; // Foresight 211..377 / 210..376.
    case 194: return 188; // Destiny Bond 219..406 / 218..405 (prep11 s0.2).
    case 314: return 112; // Air Cutter 74..185 / 78..189.
    case 161: return 284; // Tri Attack 81..364 / 77..360 (prep11 s0.2).
    case 73: return 141; // Leech Seed main body 246..386 / 245..385 (prep11 s0.2); the end-turn drain is a separate scene-off body.
    case 215: return 261; // Heal Bell (209..469 / 210..470, no tail).
    case 53: return 115; // Flamethrower (395..520 / 449..574 incl. 11 negative-age rows, ageOffset -11); script ends 600/654.
    case 82: return 150; // Dragon Rage (89..238 / 93..242); the script runs 21 frames past the window (259/263), uncovered.
    case 52: return 63; // Ember (388..450 / 442..504, ageOffset 0); script ends 3 frames later (453/507).
    case 288: return 209; // Grudge (66..274 / 70..278); script end 274/278 (no tail).
    // prep6 accepted windows (docs/next-adapters-prep6.md s0/s2.4).
    case 317: return 174; // Rock Tomb (217..390 / 229..402); window end = script end.
    case 219: return 71; // Safeguard (209..279 both).
    case 230: return 175; // Sweet Scent (222..396 both).
    // Self-Destruct: 113 rows (82..194 / 86..198) = the whole accepted window, live age 0 = its first row (reducer age 0,
    // selfDestructPortable.ts presentationAge 0), the Taunt/Dragon Rage convention: the window starts 4 frames after
    // the script activation (78/82, row -4, no #142 shadow row) and the script runs 10 frames past it (204/208), uncovered.
    case 120: return 113;
    // Knock Off: 59 rows (70..128 / 74..132) at accepted presentation age -11 (ageOffset -11): reducer age 0 = frame 81/85 =
    // activation + 6 (prep6 s2.4), so live age 0 is the reducer's age 0 and the activation is live age -6 (no #142 row).
    // The window ends 4 frames after the script end (124/128); duration = rows + ageOffset (the Dragon Breath convention).
    case 282: return 48;
    // Faint Attack: 221 rows (2344..2564 player attacker), reducer ages 0..220 (faintAttack.ts LAST_ANIMATION_OWNED_AGE);
    // the window starts 4 frames after the script activation (row -4, no #142 shadow row). Only the player-attacker
    // orientation has accepted evidence (prep6 s0): an opponent attacker returns null (no adapter, scene-off view).
    case 185: return request.attacker === 0 ? 221 : null;
    // Swallow: per stockpile branch (request.turn = gBattleScripting.animTurn = stockpileCounter, prep6 s2.1) and side:
    // player 163/178/193 (1247..1409 ...), opponent 161/176/191 (= 148 + 15 turn / 146 + 15 turn), every window end = script end.
    case 256:
      return request.turn >= 1 && request.turn <= 3 ? (request.attacker === 0 ? 148 : 146) + 15 * request.turn : null;
    // prep7 accepted windows (docs/next-adapters-prep7.md s2.2), counted from the activation frame: the accepted dense
    // windows start 35/31 (AA) and 37/33 (QA) rows earlier with idle body rows owned by the queue's `message` command.
    case 332: return 50; // Aerial Ace: activation..first inactive row (81..130 / 77..126); the later hit/HP/text rows are queue commands.
    case 98: return 33; // Quick Attack (83..115 / 79..111).
    case 313: return 87; // Fake Tears 80..166 / 76..162: the first displayed row is one after activation (row -1, no shadow row), 83 script + 4 clear rows.
    // Sleep Talk accepted windows start at activation and end at the first inactive script row (1356..1541 / 4570..4758).
    case 214: return request.attacker === 0 ? 186 : 189;
    // Rock Slide, opponent attacker only (no accepted player-attacker evidence): activation..first inactive script row
    // (1967..2104); the 37 later accepted rows are the target hit flash (hitFlashAnchorAge 141) and controller HUD.
    case 157: return request.attacker === 1 ? 138 : null;
    case 129: return request.attacker === 1 ? 80 : 78; // Swift 73..152 / 69..146 (prep8 s2.2): activation..script end.
    case 271: return 225; // Trick 70..294 / 66..290.
    // Magnitude 411..585 (power 70, 174 frames) / 191..397 (power 110, 206 frames): the reducer's first inactive age.
    case 222: return request.power > 99 ? 206 : request.power >= 10 && request.power <= 99 ? 174 : null;
    // Razor Wind: setup 45 frames (195..240 / 192..237), unleash 72 (553..625 / 661..733); gAnimMoveTurn bit 0 selects the body.
    // Spark 79..193 / 83..197 (activation + 9, row -9: no #142 shadow row): player attacker only; the script runs 2 rows past the window.
    case 209: return request.attacker === 0 ? 115 : null;
    case 13: return (request.turn & 1) === 0 ? 45 : 72;
    case 350: return 89; // Rock Blast per-hit body: activation..ROCK_BLAST_FIRST_INACTIVE_AGE (84/266/448 + 89 each).
    case 220: return 81; // Pain Split 445 / 446 .. +80 (81 accepted rows; the live window ends at the script's last active row).
    case 179: return 173; // Reversal 404..577 / 451..624: activation..first inactive row (reducer 174 displays, ages 0..173).
    case 218: return 229; // Frustration 80..308 / 76..304.
    case 69: return 228; // Seismic Toss 81..308 / 77..304.
    case 32: return request.attacker === 1 ? 192 : 193; // Horn Drill 214..405 / 213..405 (after a Tackle body).
    case 62: return 216; // Aurora Beam 216..431 / 215..430 (after a Tackle body).
    case 253: return 73; // Uproar 79..151 / 75..147.
    case 85: return 237; // Thunderbolt 83..319 / 79..315.
    case 254: return 99; // Stockpile 205..303 / 207..305 (after a Peck body).
    case 192: return 112; // Zap Cannon 84..195 / 80..191.
    // Double Team 71..300 (first-body lab run, activation 70; player attacker only, no accepted opponent evidence): row -1.
    case 104: return request.attacker === 0 ? 230 : null;
    // Feather Dance: activation..script end (79..246 / 83..250); the controller's stat banner and messages that follow are
    // queue commands (prep7 s2.2). The reducer is relative to the printer, +44 at the activation frame.
    case 297: return 168;
    case 202: return 230; // Giga Drain 214..443 both orientations (activation..script end).
    case 241: return 158; // Sunny Day 211..368.
    case 72: return 218; // Mega Drain 75..292 / 79..296.
    // Absorb 223..416 starts 10 frames after the activation (reducer age 0 = monbg-relative, Taunt convention: live age 0
    // = first window row, ageOffset 0, no #142 shadow row); the script runs 2 rows past the window end (418), uncovered.
    case 71: return 194;
    case 138: return request.attacker === 0 ? 266 : 267; // Dream Eater 1308..1573 / 2146..2412 (after Tackle, Sing).
    case 349: return 142; // Dragon Dance (78..219 / 74..215): window start = activation, window end = script end.
    case 126: return 197; // Fire Blast (1147..1343 / 215..411): window start = activation, window end = script end.
    case 7: return 101; // Fire Punch body A..first inactive (prep22 s0.1/A.1: identical across burn / no-burn / faint, both sides); Status_Burn is a later body.
    case 8: return 184; // Ice Punch script activation..first inactive row (staged 1966..2149 / 2339..2522); HP/text/freeze/Sitrus rows are queue commands.
    case 225: return 83; // Dragon Breath: 85 rows 395..479 / 449..533 starting at presentation age -2.
    case 248: return 114; // Future Sight turn-1 accepted window (77..190 / 81..194).
    case 153: return 212; // Explosion accepted window (76..287 / 80..291).
    case 347: return CALM_MIND_CLEANUP_AGE + 1;
    // Faithful-random adapters (liveMovePresentationRng.ts; not LIVE_MOVE_ANIMATION_IDS). Windows start at activation.
    case 24: return DOUBLE_KICK_FRAME_COUNT; // Double Kick per-hit body (227..262 both orientations).
    case 310: return 63; // Astonish accepted window (220..282 / 219..281).
    case 37: return 103; // Thrash accepted window (72..174 / 76..178); each lock-in turn is its own body.
    // Flail accepted windows (209..322 / 210..323; natural-HP tiers 114 rows each); power = gBattleMovePower.
    case 175: return FLAIL_POWERS.includes(request.power as FlailPower) ? 114 : null;
    case 273: return 271; // Wish accepted window (65..335 / 69..339).
    // Dig (prep18 s1.1): setup 195 rows / unleash 68 rows, both from the activation (the turn bit selects the body like Fly/Bounce).
    case 91: return (request.turn & 1) === 0 ? 195 : 68;
    // Profile moves (prep22 s0.2, bodies from the activation): Lovely Kiss 152 (faithful-random), Spikes 113, Octazooka 79.
    case 142: return 152;
    case 191: return 113;
    case 190: return 79;
    // Signal Beam first body: signalBeamFirstInactiveAge = 18 + |pan target - initial| = 145 (player attacker) / 144 (opponent), prep22 s0.2.
    case 324: return request.attacker === 0 ? 145 : 144;
    // Sheer Cold first body (faithful timing, #151): restore fade end (policy: per-side age-171 lag) + 2 = 191 rows (player attacker) / 190 (opponent).
    case 329: return liveSheerColdRestoreFadeEndAge(request.attacker === 0 ? "player" : "opponent") + 2;
    // Sky Attack (prep25): charge 148 rows / strike 180 rows, selected by gAnimMoveTurn bit 0 like Razor Wind / Solar Beam.
    // Faithful timing (D4, liveMoveTimingPolicy.ts; not LIVE_MOVE_ANIMATION_IDS): Mach Punch 107 iterations + fixed lags 71, 72 + the policy's
    // optional late lag at 91 (dominant measured phase, 110 rows; the other phase is 109 rows).
    case 183: return request.attacker === 0 || request.attacker === 1 ? liveMoveTimingBodyRows(183) : null;
    // Faithful timing (D4b): Megahorn 176 rows + the policy's optional late restorebg fade (dominant measured phase, 177 rows both sides;
    // the reducer's `cleanup = player ? 176 : 175` side rule is only the accepted corpora's phases).
    case 224: return liveMoveTimingBodyRows(224);
    // Faithful timing (S10A, prep32): Nightmare 164 iterations + fixed lags 21, 129, 130 + the policy's optional lag at 149 (168 rows both sides).
    case 171: return liveMoveTimingBodyRows(171);
    // Faithful timing (D4b): Revenge 145 rows both sides (activation .. first inactive); the policy picks the monbg BGnCNT write row.
    case 279: return 145;
    // D4 faithful timing: Superpower (prep31 s1): 248 rows both sides (constant in all 6 windows; the CPU phase is the monbg write row only).
    case 276: return SUPERPOWER_ROWS;
    // Faithful timing (D4c): Psywave 204 rows + the policy's optional late lag at task row 185 (dominant measured phase, 205 rows both sides).
    case 149: return liveMoveTimingBodyRows(149);
    // Faithful random (S10A, prep32 / prep35): Flatter 218 steps + the first inactive row = 219 rows both sides (no CPU-phase field).
    case 260: return FLATTER_ROWS;
    // Faithful timing (S10A, prep35): Skill Swap 195 rows (activation .. first inactive) + the policy's optional lag at row 176 (196 rows both sides).
    case 285: return liveMoveTimingBodyRows(285);
    // Faithful timing (D4c): Extrasensory 161 rows (activation .. first inactive) without the optional lag at task row 142 (policy: no lag, 4 of 6).
    case 326: return liveMoveTimingBodyRows(326);
    // Faithful timing (D4b, + D3 Random2): Meteor Mash 213 + the policy's restore lag L (row 195) + the first inactive row = 215 both sides.
    case 309: return liveMoveTimingBodyRows(309);
    // Faithful timing (S10A, + D3 Random2): Ice Ball counter 0 (request.rolloutCounter 1, AnimTask_GetIceBallCounter = rolloutCounter - 1) only:
    // 75 steps + the first inactive row, the policy's lag rows (none: dominant no-lag phase, liveMoveTimingPolicy.ts 301). Counters 1..4 follow an
    // earlier Ice Ball body whose Random2 shard sort decides their activation order (docs/s10a-random2-order-lend-blocker.md): no live body.
    case 301: return request.rolloutCounter === 1 ? liveIceBallEnd(0) + 1 + liveIceBallLagRows().length : null;
    case 295: return 332; // Luster Purge (prep29 B.5: 332 rows, constant in all four scenarios; faithful-random, plan rows in liveMovePresentationRng.ts).
    case 200: return 119; // Outrage (prep29 B.6: 119 rows, constant in all five bodies).
    case 229: return 130; // Rapid Spin (prep29 B.3: 130 rows, constant in all four scenarios).
    case 155: return 71; // Bonemerang (prep29 B.1: 71 rows per hit body, constant in all 8 bodies).
    case 173: return 69; // Snore (prep25: 69 rows, constant across the scenarios; no Random2).
    case 143: return (request.turn & 1) === 0 ? 148 : 180; // charge 148 rows, strike 180 (the strike needs the 10143 order-plan lend, see case 143)
    case 328: return 123; // Sand Tomb (prep25: constant across the four scenarios).
    case 123: return 305; // Smog (prep25: constant across the four scenarios).
    case 304: return 104; // Hyper Voice (prep25: constant across the four scenarios).
    case 189: return 51; // Mud-Slap A..A+50 (prep17: 77..127 / 81..131 / alt 72..122).
    case 28: return 58; // Sand-Attack A..A+57 (78..135 / 82..139 / alt 73..130).
    case 63: return 280; // Hyper Beam faithful-random body 79..358 / 83..362 (prep13 s0.1; reducer first inactive age 279).
    case 237: return 180; // Hidden Power 77..256 / 81..260 (prep13 s0.1, first inactive age 179).
    case 240: return 187; // Rain Dance 213..399 / 211..397 (prep14 s2).
    case 352: return 160; // Water Pulse 77..236 / 81..240 (prep14 s2, first inactive age 159).
    case 258: return 158; // Hail 64..221 (prep14 s2).
    case 244: return 179; // Psych Up 69..247 (prep16 s1.3; first inactive age 178); opponent attacker + later bodies: lb21 (docs/later-bodies-overheat-psychup.md).
    case 315: return 230; // Overheat first body 75..304 / 80..309 (prep16 s2.1; reducer first inactive age 229, displayed like every adapter: duration = first inactive + 1).
    case 318: return request.attacker === 0 ? 193 : 196; // Silver Wind first body 81..273 / 85..280 (prep16 s2.2: first inactive ages 192 / 195, duration = first inactive + 1).
    case 58: return 203; // Ice Beam 75..277 / 79..281 (prep13 s0.1; reducer first inactive age 202).
    // Will-O-Wisp (oam1): first inactive age + 1 of the source timeline from the static sBattlerCoords X_2 anchors (|dx| 105 /
    // 104 in singles; the orb translation duration is |dx|): 214 / 213 rows (76..289 / 80..292).
    // Pursuit normal body (oam1): 103 rows (73..175 / 77..179), PURSUIT_FIRST_INACTIVE_AGE 102 + 1. The switch-interception
    // body (request.turn & 1) declines (scene-off view): its allocator/healthbox scene follows a party-menu unit.
    case 228: return (request.turn & 1) === 0 ? PURSUIT_ROWS : null;
    // Fury Cutter (oam1): one body = 43 rows (78..120 / 82..124, first inactive age 42 + 1) for every counter.
    case 210: return FURY_CUTTER_ROWS;
    // Baton Pass (prep27 s0.1): 52 active rows + the cleanup row, constant across species, sides and body-start shifts.
    case 226: return 53;
    // Endeavor (prep27 s0.2): the script body, 67 active rows + the cleanup row (the HP set / drain are later queue commands).
    case 283: return 68;
    // Return (strongest branch, friendship 255, Factory-only): 282 rows both sides (0.25% of Factory move slots).
    case 216: return RETURN_ROWS;
    // Spit Up (prep31 s2.2): 108 rows (counters 1, 2), 109 (counter 3); request.turn = the Stockpile counter (gameplay-owned, read only).
    case 255: return liveSpitUpDuration(request.turn);
    // Curse (curse-live): MOVE_CURSE's choosetwoturnanim picks CurseStats when gAnimMoveTurn & 1 (BattleScript_EffectCurse
    // setbyte sB_ANIM_TURN 1 for a non-Ghost attacker, battle_scripts_1.s:1491-1492): 176 rows (first inactive age 175 + 1).
    // The Ghost branch (turn 0) declines: its row-26 palette-transfer scanline and BG2 scroll phase are frame-phase inputs.
    case 174: return (request.turn & 1) === 1 ? CURSE_STATS_ROWS : null;
    case 261: {
      const player = { x: 72, y: 0 }, opponent = { x: 176, y: 0 };
      return request.attacker === 0 ? willOWispTimeline("player", player, opponent).cleanup + 1
        : willOWispTimeline("opponent", opponent, player).cleanup + 1;
    }
    default: return null;
  }
}

/** Source singles field geometry and art, from the current displayed party members. */
// Body-only HUD profiles: every controller age is unreachable, so the staged views never draw text, HP drain, hit
// reaction, action menu or status (the live resolution queue owns them as separate commands).
const LIVE_FLY_BODY_ONLY_PROFILE = Object.freeze({
  targetHpBefore: 0, targetHpAfter: 0, hitReactionFirstAge: Number.POSITIVE_INFINITY,
  hpDrainFirstAge: Number.POSITIVE_INFINITY, chargeMessageFirstAge: Number.POSITIVE_INFINITY,
  strikeMoveTextFirstAge: Number.POSITIVE_INFINITY, resultTextFirstAge: Number.POSITIVE_INFINITY,
  currentMoveResetAge: Number.POSITIVE_INFINITY,
});
const LIVE_BOUNCE_BODY_ONLY_PROFILE = Object.freeze({
  moveTextFirstAge: Number.POSITIVE_INFINITY, moveTextClearAge: Number.POSITIVE_INFINITY,
  targetHpBefore: 0, targetHpAfter: 0, hitReactionFirstAge: Number.POSITIVE_INFINITY,
  hpDrainFirstAge: Number.POSITIVE_INFINITY, resultTextFirstAge: Number.POSITIVE_INFINITY,
  currentMoveResetAge: Number.POSITIVE_INFINITY,
});

/**
 * Presentation-only semi-invulnerable hide (prep11 s2.3). A live Fly/Bounce CHARGE body sets the attacker sprite's
 * `invisible` at age 7 (`AnimFlyBallUp` / `AnimBounceBallShrink`) and nothing in Scene ON clears it until the STRIKE
 * body's ball leaves the screen (age 39/40 Fly, 26 Bounce): `MOVEEND_ATTACKER_INVISIBLE` only emits a receipt under
 * HITMARKER_NO_ANIMATIONS (Scene OFF), so the queue carries no hide. Returns the hidden battler once this completed
 * body ends, or null. Never read by rules/RNG/queue.
 */
export function liveSemiInvulnerableHideBattler(request: BattleMoveAnimationRequest): 0 | 1 | null {
  // Baton Pass (prep27 s0.1): AnimBatonPassPokeball sets the attacker `invisible` at age 9 and the ROM keeps it hidden until the
  // switch-out's instant returntoball (opponent E+9; player through the party screen, A+76), so the same hide carries it.
  if (request.moveId === 226) return liveMoveAnimationDuration(request) !== null ? request.attacker : null;
  return (request.moveId === 19 || request.moveId === 340 || request.moveId === 91 || request.moveId === 291) && (request.turn & 1) === 0
    && liveMoveAnimationDuration(request) !== null ? request.attacker : null;
}

export function liveMoveAnimationPresentation(
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
  age: number,
  paletteInput?: LiveMovePaletteInput,
  spriteAllocatorInput?: LiveMoveSpriteAllocatorInput,
  spriteOrderInput?: LiveMoveSpriteOrderInput,
  presentationRngInput?: LiveMovePresentationRngInput,
  battlerX2Input?: LiveMoveBattlerX2Input,
): SceneOnMovePresentationState | null {
  if (liveMoveAnimationDuration(request, field) === null) return null;
  const art = createBattleCommandFieldArtView(field);
  const battler = (side: "player" | "opponent"): SceneOnPresentationBattler => {
    const origin = battleCommandFieldSpriteOrigin(art[side], side);
    // ISSUES #148: a battler an earlier body left at x2/y2 0 is drawn there by the renderer's species-rest readers.
    const rest = liveBattlerAnchors(side, art).frontIdleRest, tracked = liveBattlerAnchors(side, art, battlerX2Input).frontIdleRest;
    return {
      ...(tracked.x2 === rest.x2 && tracked.y2 === rest.y2 ? {} : { liveIdleRest: tracked }),
      species: art[side].speciesSymbol,
      geometry: {
        side, spriteCorner: origin,
        // GetBattlerSpriteFinal_Y(..., TRUE): player effects add 8 and
        // clamp to 104; the field origin already includes opponent elevation.
        animationCenter: {
          x: origin.x + 32,
          y: Math.min(104, origin.y + 32 + (side === "player" ? 8 : 0)),
        },
        battlePositionCenter: {
          x: side === "player" ? 72 : 176,
          y: side === "player" ? 80 : 40,
        },
      },
    };
  };
  const attacker = battler(request.attacker === 0 ? "player" : "opponent");
  // These move bodies draw the whole field. A self-targeting move's effect
  // adapter must separately retain its semantic target when one is added.
  const target = battler(request.attacker === 0 ? "opponent" : "player");
  // Effect pictures use Y_PIC_OFFSET (the player-side +8/clamp above), while
  // affine battler centers use the unshifted OBJ center. Keep that selector
  // explicit at the live seam instead of inheriting fixture coordinates.
  const affineCenterBattler = (battler: SceneOnPresentationBattler): SceneOnPresentationBattler => ({
    ...battler,
    geometry: {
      ...battler.geometry,
      animationCenter: {
        x: battler.geometry.spriteCorner.x + 32,
        y: battler.geometry.spriteCorner.y + 32,
      },
    },
  });
  const pictureHeight = (side: "player" | "opponent") =>
    64 - 2 * art[side].coords.yOffset;
  const attackerAnchors = liveBattlerAnchors(attacker.geometry.side, art, battlerX2Input);
  const fieldProfile = {
    playerHp: field.player.hp, playerMaxHp: field.player.maxHP,
    opponentHp: field.opponent.hp, opponentMaxHp: field.opponent.maxHP,
    // All HUD values are composed from the live resolution view after the body.
  };
  let config: SceneOnMoveConfig;
  switch (request.moveId) {
    case 2: config = { move: "KARATE_CHOP", attacker, target, fieldProfile }; break;
    case 9:
      config = {
        move: "THUNDER_PUNCH", attacker, target,
        // Thunder Punch's legacy fixture config requires the narrow
        // faint-attack status shape. Preserve the live burn bit when it is
        // present; the live queue still owns the complete current HUD/status.
        fieldProfile: {
          ...fieldProfile,
          playerStatus: field.player.status === "burn" ? "burn" : "none",
        },
      };
      break;
    case 5: config = { move: "MEGA_PUNCH", attacker, target, fieldProfile }; break;
    case 11: config = { move: "VICE_GRIP", attacker, target, fieldProfile }; break;
    case 12: config = { move: "GUILLOTINE", attacker, target, fieldProfile }; break;
    case 14: config = { move: "SWORDS_DANCE", attacker, target, fieldProfile }; break;
    case 21: config = { move: "SLAM", attacker, target, fieldProfile }; break;
    case 23: config = { move: "STOMP", attacker, target, fieldProfile }; break;
    case 25: config = { move: "MEGA_KICK", attacker, target, fieldProfile }; break;
    case 27: config = { move: "ROLLING_KICK", attacker, target, fieldProfile }; break;
    case 29:
      // BowMon's affine center is the existing OBJ center; its hitsplat
      // independently uses the target picture-offset coordinate.
      config = { move: "HEADBUTT", attacker: { ...attacker, geometry: {
        ...attacker.geometry, animationCenter: {
          x: attacker.geometry.spriteCorner.x + 32, y: attacker.geometry.spriteCorner.y + 32,
        },
      } }, target, fieldProfile };
      break;
    case 34: config = { move: "BODY_SLAM", attacker, target, fieldProfile }; break;
    case 36: config = { move: "TAKE_DOWN", attacker, target, fieldProfile }; break;
    case 38: config = { move: "DOUBLE_EDGE", attacker, target, fieldProfile }; break;
    case 39: config = { move: "TAIL_WHIP", attacker, target, fieldProfile }; break;
    case 41: config = { move: "TWINEEDLE", attacker, target, fieldProfile }; break;
    case 42: config = { move: "PIN_MISSILE", attacker, target, fieldProfile }; break;
    case 43: config = { move: "LEER", attacker, target, fieldProfile }; break;
    case 44: config = { move: "BITE", attacker, target, fieldProfile }; break;
    case 47: config = { move: "SING", attacker, target, fieldProfile }; break;
    case 48: config = { move: "SUPERSONIC", attacker, target, fieldProfile }; break;
    case 49: config = { move: "SONIC_BOOM", attacker, target, fieldProfile }; break;
    case 51:
      config = { move: "ACID", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 55:
      config = { move: "WATER_GUN", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 124:
      config = { move: "SLUDGE", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 188:
      config = { move: "SLUDGE_BOMB", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 106:
      config = { move: "HARDEN", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 334:
      config = { move: "IRON_DEFENSE", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 56: case 61: case 341: {
      const move = request.moveId === 56 ? "HYDRO_PUMP" : request.moveId === 61 ? "BUBBLE_BEAM" : "MUD_SHOT";
      config = {
        move, attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
      };
      break;
    }
    case 238:
      config = { move: "CROSS_CHOP", attacker, target, fieldProfile,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint };
      break;
    case 197:
      config = { move: "DETECT", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint };
      break;
    case 294:
      config = { move: "TAIL_GLOW", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint };
      break;
    case 116: case 203:
      // GetBattlerSpriteCoord(attacker, BATTLER_COORD_X/Y) reads sBattlerCoords.
      config = { move: request.moveId === 116 ? "FOCUS_ENERGY" : "ENDURE", attacker, target, fieldProfile,
        attackerCoord: attackerAnchors.battlePositionCenter };
      break;
    case 263: case 107:
      config = { move: request.moveId === 263 ? "FACADE" : "MINIMIZE", attacker, target, fieldProfile,
        battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 86: case 87:
      // GetBattlerSpriteCoord(target, X_2/Y_2) resolves to the picture-offset point.
      config = { move: request.moveId === 86 ? "THUNDER_WAVE" : "THUNDER", attacker, target, fieldProfile,
        targetEffectCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint };
      break;
    case 207:
      config = { move: "SWAGGER", attacker, target, fieldProfile,
        breathOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 339:
      config = { move: "BULK_UP", attacker, target, fieldProfile,
        breathOrigin: attackerAnchors.picOffsetPoint, battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 250: config = { move: "WHIRLPOOL", attacker, target, fieldProfile, body: "main" }; break;
    case 76: {
      // sourceOrbOrigin adds 10 to the "resolved animation center" to reach
      // GetBattlerSpriteCoord(Y_PIC_OFFSET), so battlers carry that point minus 10.
      const resolved = (battler: SceneOnPresentationBattler): SceneOnPresentationBattler => {
        const point = liveBattlerAnchors(battler.geometry.side, art, battlerX2Input).picOffsetPoint;
        return { ...battler, geometry: { ...battler.geometry, animationCenter: {
          x: point.x, y: point.y - 10 } } };
      };
      config = { move: "SOLAR_BEAM", attacker: resolved(attacker), target: resolved(target), fieldProfile,
        body: (request.turn & 1) === 0 ? "setup" : "unleash" };
      break;
    }
    case 217: {
      // presentAtAge adds the player-side +8 of CreateHealingEffect's Y_PIC_OFFSET
      // itself, so hand it the picture-offset point without that +8 (clamp kept).
      const targetPoint = liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint;
      config = { move: "PRESENT", attacker, fieldProfile,
        branch: request.damage > 0 ? "damage" : "heal",
        target: { ...target, geometry: { ...target.geometry, animationCenter: {
          x: targetPoint.x, y: targetPoint.y - (target.geometry.side === "player" ? 8 : 0) } } } };
      break;
    }
    case 236: {
      // InitSpritePosToAnimAttacker(TRUE) reads the attacker's picture-offset point.
      // The staged heal payload is never read live (the controller owns HP).
      const attackerHp = attacker.geometry.side === "player" ? field.player.hp : field.opponent.hp;
      const attackerMaxHp = attacker.geometry.side === "player" ? field.player.maxHP : field.opponent.maxHP;
      config = { move: "MOONLIGHT", attacker, target,
        fieldProfile: { ...fieldProfile, pendingHeal: {
          battler: "attacker", fromHp: attackerHp, toHp: attackerMaxHp,
          weather: "none", numerator: 1, denominator: 2 } },
        healingCenter: attackerAnchors.picOffsetPoint };
      break;
    }
    case 259:
      config = { move: "TORMENT", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
        battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 232:
      config = { move: "METAL_CLAW", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 65:
      // BowMon affines the battler OBJ around its unshifted sprite center.
      // The impact sprites independently retain the target's picture-offset
      // coordinate, so only the attacker takes the affine-center selector.
      config = {
        move: "DRILL_PECK",
        attacker: affineCenterBattler(attacker),
        target,
        fieldProfile,
      };
      break;
    case 66: config = { move: "SUBMISSION", attacker, target, fieldProfile }; break;
    case 67: config = { move: "LOW_KICK", attacker, target, fieldProfile }; break;
    case 68: config = { move: "COUNTER", attacker, target, fieldProfile }; break;
    case 78: config = { move: "STUN_SPORE", attacker, target, fieldProfile }; break;
    case 79: config = { move: "SLEEP_POWDER", attacker, target, fieldProfile }; break;
    case 83: config = { move: "FIRE_SPIN", attacker, target, fieldProfile }; break;
    case 92: config = { move: "TOXIC", attacker, target, fieldProfile }; break;
    case 93: config = { move: "CONFUSION", attacker, target, fieldProfile }; break;
    case 94: config = { move: "PSYCHIC", attacker, target, fieldProfile }; break;
    case 95: config = { move: "HYPNOSIS", attacker, target, fieldProfile }; break;
    case 50:
      // `AnimSpinningSparkle` starts from Y_PIC_OFFSET and its established
      // reducer applies the player-side remaining -8 itself.  Keep that
      // source convention at the adapter boundary rather than double-raising
      // the player back sprite.
      config = {
        move: "DISABLE",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y
                - (attacker.geometry.side === "player" ? 8 : 0),
            },
          },
        },
        target,
        fieldProfile,
      };
      break;
    case 74: config = { move: "GROWTH", attacker, target, fieldProfile }; break;
    case 75: config = { move: "RAZOR_LEAF", attacker, target, fieldProfile }; break;
    case 97: config = { move: "AGILITY", attacker, target, fieldProfile }; break;
    case 101: config = { move: "NIGHT_SHADE", attacker, target, fieldProfile }; break;
    case 103: config = { move: "SCREECH", attacker, target, fieldProfile }; break;
    case 105: config = { move: "RECOVER", attacker, target, fieldProfile }; break;
    case 108: config = { move: "SMOKESCREEN", attacker, target, fieldProfile }; break;
    case 109: config = { move: "CONFUSE_RAY", attacker, target, fieldProfile }; break;
    case 113:
      if (!spriteAllocatorInput?.historyKnown) return null;
      config = {
        move: "LIGHT_SCREEN", attacker, target, fieldProfile,
        allocatorProfile: {
          wall: spriteAllocatorInput.wall,
          sparkles: spriteAllocatorInput.sparkles,
        },
      };
      break;
    case 112: case 115: case 182: case 243: case 277: {
      if (!spriteAllocatorInput?.historyKnown) return null;
      const wall = spriteAllocatorInput.wall;
      const sparkles = spriteAllocatorInput.sparkles;
      config = request.moveId === 112
        ? { move: "BARRIER", attacker, target, fieldProfile, allocatorProfile: { wall } }
        : request.moveId === 277
        ? { move: "MAGIC_COAT", attacker, target, fieldProfile, allocatorProfile: { wall } }
        : request.moveId === 182
        ? { move: "PROTECT", attacker, target, fieldProfile, allocatorProfile: { protect: wall } }
        : request.moveId === 115
        ? { move: "REFLECT", attacker, target, fieldProfile, allocatorProfile: { wall, sparkles } }
        : { move: "MIRROR_COAT", attacker, target, fieldProfile, allocatorProfile: { wall, sparkles } };
      break;
    }
    case 122: config = { move: "LICK", attacker, target, fieldProfile }; break;
    case 131: config = { move: "SPIKE_CANNON", attacker, target, fieldProfile }; break;
    case 136:
      config = {
        move: "HI_JUMP_KICK", attacker, target, fieldProfile,
        targetInitialX2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2,
      };
      break;
    case 147: config = { move: "SPORE", attacker, target, fieldProfile }; break;
    case 148: config = { move: "FLASH", attacker, target, fieldProfile }; break;
    case 114: config = { move: "HAZE", attacker, target, fieldProfile }; break;
    case 151: config = { move: "ACID_ARMOR", attacker, target, fieldProfile }; break;
    case 154: config = { move: "FURY_SWIPES", attacker, target, fieldProfile }; break;
    case 3: config = { move: "DOUBLE_SLAP", attacker, target, fieldProfile, moveTurn: request.turn }; break;
    case 4:
      // cometPunchAtAge's opponent-route hitsplat offset (0, not the script's -8) is relative to
      // the unshifted OBJ center, not the player-side +8 Y_PIC_OFFSET point.
      config = { move: "COMET_PUNCH", attacker, target: affineCenterBattler(target), fieldProfile,
        moveTurn: request.turn };
      break;
    // Cmd_jumpifmoveturn 0/1 else Center (battle_anim_scripts.s:6543): turns >= 2 share the Center branch.
    case 167:
      config = { move: "TRIPLE_KICK", attacker, target, fieldProfile,
        moveTurn: Math.min(request.turn, 2) as 0 | 1 | 2 };
      break;
    case 156:
      // Rest's player-side Letter-Z renderer carries the affine OAM center
      // correction at scanout (`screenCenterYOffset: 16`), so its reducer
      // input is the source picture point minus that already-applied amount.
      config = {
        move: "REST",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y
                - (attacker.geometry.side === "player" ? 16 : 0),
            },
          },
        },
        target,
        fieldProfile,
      };
      break;
    case 158: config = { move: "HYPER_FANG", attacker, target, fieldProfile }; break;
    case 162: config = { move: "SUPER_FANG", attacker, target, fieldProfile }; break;
    case 163: config = { move: "SLASH", attacker, target, fieldProfile }; break;
    case 172: config = { move: "FLAME_WHEEL", attacker, target, fieldProfile }; break;
    case 201: config = { move: "SANDSTORM", attacker, target, fieldProfile }; break;
    case 211:
      config = {
        move: "STEEL_WING",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
      };
      break;
    case 223: config = { move: "DYNAMIC_PUNCH", attacker, target, fieldProfile }; break;
    case 231:
      config = {
        move: "IRON_TAIL",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
      };
      break;
    case 178: config = { move: "COTTON_SPORE", attacker, target, fieldProfile }; break;
    case 180: config = { move: "SPITE", attacker, target, fieldProfile }; break;
    case 208: config = { move: "MILK_DRINK", attacker, target, fieldProfile }; break;
    case 186: config = { move: "SWEET_KISS", attacker, target, fieldProfile }; break;
    case 204: config = { move: "CHARM", attacker, target, fieldProfile }; break;
    case 213: config = { move: "ATTRACT", attacker, target, fieldProfile }; break;
    case 227: config = { move: "ENCORE", attacker, target, fieldProfile }; break;
    case 283: {
      // prep27 s0.2/s5: the accepted reducer with source-relative inputs (attacker pic yOffset for SetBattlerSpriteYOffsetFromYScale,
      // droplets around the attacker battlePositionCenter, hitsplats at the target picOffsetPoint mirrored by its side) and the stale
      // gAnimMovePower = the engine's battleMovePower register (request.power; W1/W2/W4/carry). The Battle TV loop (W3) is not
      // ported: a possible W3 write declines. HP is unchanged inside the script body. A shiny pair declines (normal palettes).
      if (battlerX2Input?.staleMovePowerUnknown) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const targetHp = field[target.geometry.side].hp;
      config = { move: "ENDEAVOR", attacker, target,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" },
        animationProfile: { attackerYOffset: art[attacker.geometry.side].coords.yOffset, staleMovePower: request.power,
          hpDrainFirstAge: Number.POSITIVE_INFINITY, targetStartHp: targetHp, targetEndHp: targetHp } };
      break;
    }
    case 226:
      // batonPassAtAge(age, attacker.geometry.animationCenter) = liveBattlerAnchors(...).picOffsetPoint (prep27 s0.1: 53/53 component
      // rows on 4 pairs). The attacker palette blend reads the normal battle palette: a shiny pair declines.
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      config = { move: "BATON_PASS", attacker, target, fieldProfile };
      break;
    case 242: config = { move: "CRUNCH", attacker, target, fieldProfile }; break;
    case 246: config = { move: "ANCIENT_POWER", attacker, target, fieldProfile }; break;
    case 247: config = { move: "SHADOW_BALL", attacker, target, fieldProfile }; break;
    case 264: config = { move: "FOCUS_PUNCH", attacker, target, fieldProfile }; break;
    case 272: {
      // CreateAdditionalMonSpriteForMoveAnim places the target-species
      // silhouette at the attacker's coord plus that species' pic y offset in
      // the attacker's orientation; the view anchors it on battlePositionCenter.
      const pics = (monPicCoordsData as unknown as {
        back: Record<string, { yOffset: number }>; front: Record<string, { yOffset: number }>;
      })[attacker.geometry.side === "player" ? "back" : "front"];
      const yOffset = pics[target.species]?.yOffset ?? 0;
      config = {
        move: "ROLE_PLAY", target, fieldProfile,
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            battlePositionCenter: {
              x: attacker.geometry.battlePositionCenter.x,
              y: attacker.geometry.battlePositionCenter.y + yOffset,
            },
          },
        },
      };
      break;
    }
    case 235: config = { move: "SYNTHESIS", attacker, target, fieldProfile }; break;
    case 280:
      config = {
        move: "BRICK_BREAK",
        body: request.turn === 0 ? "normal" : "shattered-wall",
        attacker, target, fieldProfile,
      };
      break;
    case 290: config = { move: "SECRET_POWER", attacker, target, fieldProfile }; break;
    case 302: config = { move: "NEEDLE_ARM", attacker, target, fieldProfile }; break;
    case 281:
      config = {
        move: "YAWN", attacker, target, fieldProfile,
        battlerInput: {
          attackerPictureHeight: pictureHeight(attacker.geometry.side),
          targetPictureHeight: pictureHeight(target.geometry.side),
          attackerEffectCenter: attacker.geometry.animationCenter,
          targetEffectCenter: target.geometry.animationCenter,
        },
      };
      break;
    case 257: config = { move: "HEAT_WAVE", attacker, target, fieldProfile }; break;
    case 287: config = { move: "REFRESH", attacker, target, fieldProfile }; break;
    case 305: config = { move: "POISON_FANG", attacker, target, fieldProfile }; break;
    case 306: config = { move: "CRUSH_CLAW", attacker, target, fieldProfile }; break;
    case 320: config = { move: "GRASS_WHISTLE", attacker, target, fieldProfile }; break;
    case 319: config = { move: "METAL_SOUND", attacker, target, fieldProfile }; break;
    case 321:
      // `AnimEyeSparkle` starts from the effect-picture coordinate, then the
      // Move_TICKLE script supplies y=-8. `RockMonBackAndForth` instead
      // rotates the target battler OBJ around its unraised sprite center.
      config = {
        move: "TICKLE",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y - 8,
            },
          },
        },
        target: {
          ...target,
          geometry: {
            ...target.geometry,
            animationCenter: {
              x: target.geometry.spriteCorner.x + 32,
              y: target.geometry.spriteCorner.y + 32,
            },
          },
        },
        fieldProfile,
      };
      break;
    case 325:
      config = {
        move: "SHADOW_PUNCH", attacker, target,
        traceScratchUnfadedPalette: paletteInput?.traceScratchUnfadedPalette,
        fieldProfile: { ...fieldProfile, playerStatus: "none" },
        attackerSpriteId: request.attacker === 0 ? 6 : 8,
        attackerMoveSpeed: request.attacker === 0 ? 8 : -8,
        attackerSubpriority: request.attacker === 0 ? 30 : 40,
      };
      break;
    case 335: config = { move: "BLOCK", attacker, target, fieldProfile }; break;
    case 336:
      config = {
        move: "HOWL", attacker, target, fieldProfile,
        battlerInput: {
          pictureHeight: 64 - 2 * art[request.attacker === 0 ? "player" : "opponent"].coords.yOffset,
          species: attacker.species,
        },
      };
      break;
    case 337: config = { move: "DRAGON_CLAW", attacker, target, fieldProfile }; break;
    case 89:
      // ShakeBattlers retains each battler's current idle x2 (player back sprites have none).
      config = { move: "EARTHQUAKE", attacker, target, fieldProfile,
        initialBattlerX2: {
          player: liveBattlerAnchors("player", art, battlerX2Input).frontIdleRest.x2,
          opponent: liveBattlerAnchors("opponent", art, battlerX2Input).frontIdleRest.x2,
        } };
      break;
    case 90:
      config = { move: "FISSURE", attacker, target, fieldProfile,
        initialTargetX2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2 };
      break;
    case 133:
      // BATTLER_COORD_ATTR_WIDTH/HEIGHT: GetBattlerSpriteCoordAttr reads the species pic coords.
      config = { move: "AMNESIA", attacker, target, fieldProfile,
        attackerPictureSize: { width: art[attacker.geometry.side].coords.width,
          height: art[attacker.geometry.side].coords.height } };
      break;
    case 152: case 345: case 60:
      // Species-owned idle x2 of the target (player back sprites have none).
      config = { move: request.moveId === 152 ? "CRABHAMMER" : request.moveId === 60 ? "PSYBEAM" : "MAGICAL_LEAF", attacker, target, fieldProfile,
        targetIdleX2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2 };
      break;
    case 135: {
      // MOVE_TARGET_USER: the semantic target is the attacker (healing stars use X_2 / Y_PIC_OFFSET of it);
      // the other-side battler is only background and is drawn from the displayed field.
      // softBoiledFramebuffer.ts:30: the egg's attacker center is the OBJ center +5 (player) / +7 (opponent).
      const eggAttacker = { ...attacker, geometry: { ...attacker.geometry, animationCenter: {
        x: attackerAnchors.spriteCenter.x,
        y: attackerAnchors.spriteCenter.y + (attacker.geometry.side === "player" ? 5 : 7) } } };
      config = { move: "SOFT_BOILED", attacker: eggAttacker, target: eggAttacker, fieldProfile,
        healingCenter: attackerAnchors.picOffsetPoint, bystander: target };
      break;
    }
    case 298: {
      // teeterDanceFramebuffer.ts:84-110: the attacker's note/pic center is its pic point, the player-side
      // target uses its OBJ center, and the attacker's own sprite x/y is the OBJ center.
      config = { move: "TEETER_DANCE",
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: attackerAnchors.picOffsetPoint } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: target.geometry.side === "player"
          ? liveBattlerAnchors("player", art, battlerX2Input).spriteCenter : liveBattlerAnchors("opponent", art, battlerX2Input).picOffsetPoint } },
        fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter,
        attackerPersonality: field[attacker.geometry.side].personality ?? 0 };
      break;
    }
    case 146:
      config = { move: "DIZZY_PUNCH", attacker, target, fieldProfile,
        attackerPersonality: field[attacker.geometry.side].personality ?? 0 };
      break;
    case 184:
      // InitSpritePosToAnimAttacker(sprite, TRUE): attacker X_2 / Y_PIC_OFFSET.
      config = { move: "SCARY_FACE", attacker, target, fieldProfile,
        attackerEyeCenter: attackerAnchors.picOffsetPoint };
      break;
    case 137: {
      // AnimTask_GlareEyeDots (battle_anim_effects_3.c:3989): HEIGHT = GET_MON_COORDS_HEIGHT of the
      // attacker's own (back for player, front for opponent) pic coords, not LiveBattlerAnchors.pictureHeight.
      const pic = attackerAnchors.picOffsetPoint;
      const quarter = Math.trunc(art[attacker.geometry.side].coords.height / 4);
      config = { move: "GLARE", attacker, target, fieldProfile,
        attackerEyeCenter: { x: pic.x, y: pic.y - 8 },
        eyeDotStart: { x: pic.x + (attacker.geometry.side === "player" ? quarter : -quarter), y: pic.y - quarter },
        eyeDotEnd: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint };
      break;
    }
    case 57: case 330:
      config = { move: request.moveId === 330 ? "MUDDY_WATER" : "SURF", attacker, target, fieldProfile };
      break;
    case 196: case 59: {
      // Source X_2/Y_PIC attacker and target centers; singles SetAverageBattlerPositions is the target's own point.
      // Icy Wind's spikes aim at the target's sBattlerCoords point (battlePositionCenter).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const geometry = { attackerCenter: attackerAnchors.picOffsetPoint, targetCenter: targetAnchors.picOffsetPoint };
      const icyGeometry = { ...geometry, spikeTargetCenter: targetAnchors.battlePositionCenter };
      if (!provableEffectOrder(request.moveId as 196 | 59, attacker.geometry.side,
        liveMoveAnimationDuration(request)!, request.moveId === 196 ? icyGeometry : geometry)) return null;
      config = request.moveId === 196
        ? { move: "ICY_WIND", attacker, target, fieldProfile, effectGeometry: icyGeometry }
        : { move: "BLIZZARD", attacker, target, fieldProfile, effectGeometry: geometry };
      break;
    }
    case 252:
      // SetBattlerSpriteYOffsetFromYScale reads the target's pic-coords yOffset.
      config = { move: "FAKE_OUT", attacker, target, fieldProfile,
        targetPictureYOffset: liveBattlerCoordAttrs(target.geometry.side, art).yOffset };
      break;
    case 322: config = { move: "COSMIC_POWER", attacker, target, fieldProfile }; break;
    case 164:
      // Species audit 12: before the doll appears (ages 0..10) the body draws the attacker without its shiny palette
      // (shiny STEELIX 12,471 / 13,778 px); decline shiny battlers as the other live adapters do.
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      config = { move: "SUBSTITUTE", attacker, target, fieldProfile };
      break;
    case 212:
      // meanLookFramebuffer.ts:124: the eye is created from ANIM_ATTACKER, so the profile carries its subpriority.
      config = { move: "MEAN_LOOK", attacker, target, fieldProfile,
        animationProfile: { targetSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 265: {
      // GetBattlerSpriteCoordAttr width/height + picture height of the target (prep s2.6).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const coords = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "SMELLING_SALT", attacker, target, fieldProfile,
        animationProfile: {
          targetLeft: targetAnchors.picOffsetPoint.x - coords.width / 2,
          targetRight: targetAnchors.picOffsetPoint.x + coords.width / 2,
          targetTop: targetAnchors.picOffsetPoint.y - coords.height / 2,
          targetPictureY: targetAnchors.picOffsetPoint.y,
          targetVerticalSpan: targetAnchors.pictureHeight,
        } };
      break;
    }
    case 111:
      // Move_DEFENSE_CURL argv (0,6,0,1): AnimSpriteOnMonPos(respectMonPicOffsets=FALSE)
      // = attacker battlePositionCenter + (0,6) (battle_anim_mons.c:1515-1528).
      config = { move: "DEFENSE_CURL",
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: {
          x: attacker.geometry.battlePositionCenter.x, y: attacker.geometry.battlePositionCenter.y + 6 } } },
        target, fieldProfile,
        animationProfile: { attackerPicYOffset: art[attacker.geometry.side].coords.yOffset,
          attackerSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 275:
      config = { move: "INGRAIN", attacker, target, fieldProfile,
        animationProfile: { attackerSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 35:
      config = { move: "WRAP", attacker, target, fieldProfile, animationProfile: WRAP_ANIMATION_PROFILE };
      break;
    case 20:
      config = { move: "BIND", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: BIND_ANIMATION_PROFILE };
      break;
    case 225:
      config = { move: "DRAGON_BREATH", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: { ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
          attackerSide: attacker.geometry.side,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40 } };
      break;
    case 296: config = { move: "MIST_BALL", attacker, target, fieldProfile }; break;
    case 312: config = { move: "AROMATHERAPY", attacker, target, fieldProfile }; break;
    case 266: {
      // battle_anim_effects_1.c thought-bubble/finger top: BATTLER_COORD_X and max(10, pic y - height / 2).
      const pic = attackerAnchors.picOffsetPoint;
      const coords = liveBattlerCoordAttrs(attacker.geometry.side, art);
      config = { move: "FOLLOW_ME", attacker, target, fieldProfile,
        attackerTop: { x: attackerAnchors.battlePositionCenter.x, y: Math.max(10, pic.y - coords.height / 2) } };
      break;
    }
    case 118: case 269: {
      // SetSpriteNextToMonHead (battle_anim_effects_1.c:5480-5488).
      const pic = attackerAnchors.picOffsetPoint;
      const coords = liveBattlerCoordAttrs(attacker.geometry.side, art);
      const attackerHead = {
        x: pic.x + (attacker.geometry.side === "player" ? coords.width / 2 + 8 : -coords.width / 2 - 8),
        y: pic.y - Math.trunc(coords.height / 4),
      };
      config = request.moveId === 118
        ? { move: "METRONOME", attacker, target, fieldProfile, attackerHead }
        : { move: "TAUNT", attacker, target, fieldProfile, attackerHead };
      break;
    }
    case 187: {
      // SetSpriteCoordsToAnimAttackerCoords + the note's +8 y; HP is the displayed pre-move HP (healthbarupdate follows).
      const pic = attackerAnchors.picOffsetPoint;
      config = { move: "BELLY_DRUM", attacker, target, fieldProfile, attackerNoteOrigin: { x: pic.x, y: pic.y + 8 } };
      break;
    }
    case 52:
      // Order-independent (docs/order-consumer-prep.md §0): every equal-key ember/flare pair is created in a different
      // sort window, so ember.ts's creation-order rule needs no host order. Geometry as Dragon Breath's fire.
      config = { move: "EMBER", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
          targetBattlePosition: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).battlePositionCenter,
          attackerSide: attacker.geometry.side,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40,
        } };
      break;
    case 215: {
      // Order consumer (docs/order-consumer-prep.md §0): the persistent sort replays from F filtered to the six reused
      // slots at activation. Unknown tracked order (liveSpriteOrderHost.ts) -> null, the bounded scene-off view.
      if (!spriteOrderInput?.known) return null;
      const noteOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        HEAL_BELL_REUSED_ORDER_SLOTS);
      if (noteOrderSeed === null) return null;
      config = { move: "HEAL_BELL", attacker, target, fieldProfile, noteOrderSeed };
      break;
    }
    case 73:
      // prep11 s0.2: the main body needs no order; the allocator constants (seeds 3,4,5) equal the accepted corpus. The
      // residual-drain fields are unused by the main body. Launch from the attacker pic offset; the target holds its idle x2.
      config = { move: "LEECH_SEED", body: "main", attacker, target, fieldProfile,
        effectCenter: attackerAnchors.picOffsetPoint,
        targetRestOffset: { x2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2,
          y2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.y2 },
        allocatorProfile: { seeds: [3, 4, 5], hitsplat: 3, orbs: [3, 4, 5, 7, 9, 10, 11, 12], stars: [3, 4, 5, 3], paletteController: 3 } };
      break;
    case 161: {
      // prep11 s0.2: allocator constants equal the accepted corpus (triangle slot 3 matrix 0; flame/lightning/ice slots; palette
      // blends 3, 12); the 64-entry order is the lent one, so the known-entry baseline gates it (no lend -> scene-off).
      if (!spriteOrderInput?.known) return null;
      const fullOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "TRI_ATTACK", attacker, target, fieldProfile,
        animationGeometry: { attackerPositionCenter: attackerAnchors.battlePositionCenter,
          targetPictureCenter: targetAnchors.picOffsetPoint,
          targetRestOffset: { x2: targetAnchors.frontIdleRest.x2, y2: targetAnchors.frontIdleRest.y2 } },
        animationProfile: { triangleSlot: 3, triangleMatrixId: 0, fireSlots: [4, 5, 7, 9, 10, 11, 12, 3],
          lightningSlots: [3, 4, 5], iceSlots: [3, 4, 5, 7, 9, 10, 11], iceMatrixIds: [0, 3, 4, 5, 6, 7, 8],
          paletteSlots: [3, 12], effectSubpriority: (target.geometry.side === "player" ? 30 : 40) - 2, spriteOrderSeed: fullOrder } };
      break;
    }
    case 194: case 314: {
      // prep11 s0.2: allocator/task/resource constants equal the accepted corpora (the order is the lent one: no lend -> scene-off).
      // monbg (prep11-monbg-formula.json): the target battler sprite position incl. the species front-idle x2.
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const attackerSlot = attacker.geometry.side === "player" ? 6 : 8, targetSlot = attackerSlot === 6 ? 8 : 6;
      if (request.moveId === 194) {
        const bottom = (side: "player" | "opponent", a: LiveBattlerAnchors) => a.picOffsetPoint.y + liveBattlerCoordAttrs(side, art).height / 2;
        config = { move: "DESTINY_BOND", attacker, target, fieldProfile,
          animationInputs: { attackerBottom: bottom(attacker.geometry.side, attackerAnchors), targetBottom: bottom(target.geometry.side, targetAnchors),
            attackerSpriteSlot: attackerSlot, whiteShadowSpriteSlot: 3, whiteShadowTaskSlot: 0, shakeTaskSlot: 1, paletteTaskSlot: 2,
            fadeTaskSlot: 0, clearMonBgTaskSlot: 0, whiteShadowTileSlot: 6, whiteShadowPaletteBank: 7, whiteShadowTileRange: [305, 32],
            matrixBitmap: 6, spriteOrder: fullOrder, whiteShadowOrderIndex: 8, visibleObjPaletteBanks: [16, 17],
            excludedObjPaletteBanks: Array.from({ length: 14 }, (_, index) => index + 18) } };
      } else {
        const sub = (side: "player" | "opponent") => (side === "player" ? 30 : 40);
        const battlerInput = (slot: number, side: "player" | "opponent") =>
          ({ slot, subpriority: sub(side), matrixNum: 0, matrix: [256, 0, 0, 256] as [number, number, number, number] });
        const cx = targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, cy = targetAnchors.spriteCenter.y + targetAnchors.frontIdleRest.y2;
        config = { move: "AIR_CUTTER", attacker, target, fieldProfile,
          animationInputs: { attackerSprite: battlerInput(attackerSlot, attacker.geometry.side),
            targetSprite: battlerInput(targetSlot, target.geometry.side), waveSpriteSlots: [3, 4, 5], sliceSpriteSlot: 3,
            taskSlots: { projectile: 0, targetShake: 0, partnerShake: 2, updateMonBg: 1, clearMonBg: 0 },
            resources: { airWave: { paletteBank: 7, tileSlot: 6, tileRange: [305, 8] }, cut: { paletteBank: 8, tileSlot: 7, tileRange: [537, 64] },
              impact: { paletteBank: 9, tileSlot: 10, tileRange: [313, 16] } },
            matrixBitmap: 6, spriteOrder: fullOrder,
            monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", center: { x: cx, y: cy }, bgX: 32 - cx, bgY: 32 - cy } } };
      }
      break;
    }
    case 193: {
      // prep11 s0.2: constants equal the accepted corpora; target bounds are the GetBattlerSpriteCoordAttr rectangle (pic offset
      // +-half the pic coords; the corpus holds bottom one pixel inside and the right-top corner one below top).
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const tc = liveBattlerCoordAttrs(target.geometry.side, art);
      const pic = targetAnchors.picOffsetPoint;
      const cx = targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, cy = targetAnchors.spriteCenter.y + targetAnchors.frontIdleRest.y2;
      const top = pic.y - tc.height / 2;
      config = { move: "FORESIGHT", attacker, target, fieldProfile,
        animationInputs: { exactTranslation: true,
          targetBounds: { left: pic.x - tc.width / 2, right: pic.x + tc.width / 2, top, bottom: pic.y + tc.height / 2 },
          targetPictureOffset: pic, targetSpriteSlot: target.geometry.side === "player" ? 6 : 8, glassSpriteSlot: 3, blendTaskSlot: 0,
          updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, spriteOrder: fullOrder, glassPaletteBank: 7, glassTileSlot: 6, matrixBitmap: 6,
          monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", spriteX: cx, spriteY: cy, bgX: 32 - cx, bgY: 32 - cy,
            inBg2: target.geometry.side === "player", battlerId: target.geometry.side === "player" ? 0 : 1 } } };
      break;
    }
    case 327: {
      // prep11 s0.2: constants equal the accepted corpora; subpriorities are the attacker slide (-2) and target impact (-3) offsets.
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const cx = targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, cy = targetAnchors.spriteCenter.y + targetAnchors.frontIdleRest.y2;
      const offset = (a: LiveBattlerAnchors) => ({ x: a.frontIdleRest.x2, y: a.frontIdleRest.y2 });
      const attackerSub = attacker.geometry.side === "player" ? 30 : 40, targetSub = target.geometry.side === "player" ? 30 : 40;
      const targetSlot = target.geometry.side === "player" ? 6 : 8;
      // The reducer's attackerCenter/targetCenter are the battler OBJ centers (corner + 32), not the pic-offset animationCenter.
      const objCentered = (battler: typeof attacker, a: LiveBattlerAnchors) =>
        ({ ...battler, geometry: { ...battler.geometry, animationCenter: a.spriteCenter } });
      config = { move: "SKY_UPPERCUT", attacker: objCentered(attacker, attackerAnchors), target: objCentered(target, targetAnchors), fieldProfile,
        animationInputs: { targetPictureOrigin: targetAnchors.picOffsetPoint, attackerSpriteSlot: attacker.geometry.side === "player" ? 6 : 8,
          targetSpriteSlot: targetSlot, attackerInitialOffset: offset(attackerAnchors), targetInitialOffset: offset(targetAnchors),
          slideSpriteSlots: [3, 9, 3, 4], impactSpriteSlots: [4, 3, 5, 7, 4], impactMatrixSlots: [0, 3, 4, 5, 0],
          updateMonBgTaskSlot: 1, fadeInTaskSlot: 0, backgroundTaskSlot: 2, shakeMon2TaskSlot: 0, shakeMonInPlaceTaskSlot: 0,
          clearMonBgTaskSlot: 0, restoreFadeTaskSlot: 3, slideSubpriority: attackerSub - 2, impactSubpriority: targetSub - 3,
          impactPaletteBank: 7, impactTileSlot: 6, baseMatrixBitmap: 6, spriteOrder: fullOrder,
          monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", spriteSlot: targetSlot, spriteX: cx, spriteY: cy,
            bgX: 32 - cx, bgY: 32 - cy, inBg2: target.geometry.side === "player", battlerId: target.geometry.side === "player" ? 0 : 1 },
          initialBg3Offset: { x: 0, y: 0 } } };
      break;
    }
    case 169: {
      // prep11 s0.2: constants equal the accepted corpora. The reducer's attacker/target centers are the thread origin and web
      // centre: the InitSpritePosToAnim* pic-offset points; subpriorities are the battler ones minus 2 (thread: target, web:
      // attacker) and the attacker's minus 5 (palette blend).
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const cx = targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, cy = targetAnchors.spriteCenter.y + targetAnchors.frontIdleRest.y2;
      const centered = (battler: typeof attacker, a: LiveBattlerAnchors) =>
        ({ ...battler, geometry: { ...battler.geometry, animationCenter: a.picOffsetPoint, battlePositionCenter: a.picOffsetPoint } });
      const attackerSub = attacker.geometry.side === "player" ? 30 : 40, targetSub = target.geometry.side === "player" ? 30 : 40;
      // The thread spawns 20 px toward the target from the attacker's pic offset (the script's x argument).
      const threadOrigin = { x: attackerAnchors.picOffsetPoint.x + (attacker.geometry.side === "player" ? 20 : -20), y: attackerAnchors.picOffsetPoint.y };
      config = { move: "SPIDER_WEB", attacker: centered(attacker, { ...attackerAnchors, picOffsetPoint: threadOrigin }), target: centered(target, targetAnchors), fieldProfile,
        animationInputs: { threadOrigin,
          threadSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], paletteSpriteSlot: 3, webSpriteSlot: 3, webMatrixSlot: 0,
          updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, loopSoundTaskSlot: 0, spriteOrder: fullOrder,
          paletteSubpriority: attackerSub - 5, threadSubpriority: targetSub - 2, webSubpriority: attackerSub - 2, baseMatrixBitmap: 6,
          monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", spriteSlot: target.geometry.side === "player" ? 6 : 8,
            spriteX: cx, spriteY: cy, bgX: 32 - cx, bgY: 32 - cy, inBg2: target.geometry.side === "player",
            battlerId: target.geometry.side === "player" ? 0 : 1 } } };
      break;
    }
    case 278: {
      // prep11 s0.2: spriteSlot 3 / matrix 0 constants equal the accepted corpora; the arrow spawns at the attacker's pic-offset x and
      // BATTLER_COORD_ATTR_TOP (pic offset - height / 2), which the reducer takes as the attacker animation center. The blend task's
      // palette id (data only, no pixels) is OBJ_PLTT_ID(battler OBJ bank 0 / 1) + 1 = 257 / 273.
      const top = attackerAnchors.picOffsetPoint.y - liveBattlerCoordAttrs(attacker.geometry.side, art).height / 2;
      const arrowOrigin = { x: attackerAnchors.picOffsetPoint.x, y: top };
      config = { move: "RECYCLE", attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: arrowOrigin } }, target, fieldProfile,
        animationProfile: { attackerTop: top, attackerSubpriority: attacker.geometry.side === "player" ? 30 : 40, spriteSlot: 3, matrixNum: 0,
          attackerPaletteIdPlusOne: attacker.geometry.side === "player" ? 257 : 273 } };
      break;
    }
    case 80: {
      // prep11 s0.2: slots/tasks/matrix constants equal the accepted corpora. The thirteen flower translation steps are
      // InitAnimLinearTranslation's (|dy| << 8) / duration with the movingUp bit, from the script arguments: the big flowers
      // start at the BATTLER_COORD_Y position (+ initial y), the small ones at the pic offset (+ initial y); all end at pic offset + target y.
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const pic = attackerAnchors.picOffsetPoint;
      const programs: readonly (readonly [big: boolean, initialY: number, targetY: number, duration: number])[] = [
        [true, -24, 8, 140], [false, -24, 8, 100], [false, -24, 8, 100], [true, -24, 8, 140], [false, -24, 8, 100], [false, -24, 8, 100],
        [true, -24, 8, 140], [false, -24, 8, 100], [false, -24, 8, 100], [false, -24, 0, 100], [false, -24, 0, 100],
        [false, -16, 14, 80], [false, -14, 16, 80]];
      const flowerFixedPointSteps = programs.map(([big, initialY, targetY, duration]) => {
        const dy = (pic.y + targetY) - ((big ? attackerAnchors.battlePositionCenter.y : pic.y) + initialY);
        const step = ((Math.abs(dy) << 8) & 0xffff) / duration | 0;
        return { x: 0, y: dy < 0 ? step | 1 : step & ~1 };
      });
      const attackerSub = attacker.geometry.side === "player" ? 30 : 40;
      const cx = targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, cy = targetAnchors.spriteCenter.y + targetAnchors.frontIdleRest.y2;
      const targetSlot = target.geometry.side === "player" ? 6 : 8;
      config = { move: "PETAL_DANCE",
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: attackerAnchors.spriteCenter } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: targetAnchors.spriteCenter, battlePositionCenter: targetAnchors.spriteCenter } },
        fieldProfile,
        animationInputs: { attackerPictureOrigin: pic, flowerFixedPointSteps,
          flowerSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17], flowerMatrixNum: 0,
          attackerSpriteSlot: attacker.geometry.side === "player" ? 6 : 8, targetSpriteSlot: targetSlot,
          attackerInitialOffset: { x: attackerAnchors.frontIdleRest.x2, y: attackerAnchors.frontIdleRest.y2 },
          targetInitialOffset: { x: targetAnchors.frontIdleRest.x2, y: targetAnchors.frontIdleRest.y2 },
          attackerSubpriority: attackerSub, ellipseTaskSlot: 0, shakeTaskSlot: 0, updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0,
          offsetSlideSpriteSlot: 3, originalSlideSpriteSlot: 3, hitSplatSpriteSlot: 4, hitSplatMatrixSlot: 0,
          dummySpriteOrigin: targetAnchors.picOffsetPoint, slideSubpriority: attackerSub - 2, hitSplatSubpriority: attackerSub - 3,
          baseMatrixBitmap: 6, spriteOrder: fullOrder,
          monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", spriteSlot: targetSlot, spriteX: cx, spriteY: cy,
            bgX: 32 - cx, bgY: 32 - cy, inBg2: target.geometry.side === "player", battlerId: target.geometry.side === "player" ? 0 : 1 } } };
      break;
    }
    case 348: {
      // Order consumer (docs/order-consumer-prep.md §0): F filtered to the blade + trail slots at activation seeds the
      // persistent sort; unknown order -> null (scene-off fallback).
      if (!spriteOrderInput?.known) return null;
      const oamOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        LEAF_BLADE_OAM_ORDER_SLOTS);
      if (oamOrderSeed === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const targetCoords = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "LEAF_BLADE", attacker, target, fieldProfile, oamOrderSeed,
        targetIdleX2: targetAnchors.frontIdleRest.x2,
        targetProfile: { pictureOffset: targetAnchors.picOffsetPoint, width: targetCoords.width,
          height: targetCoords.height, subpriority: target.geometry.side === "player" ? 30 : 40 } };
      break;
    }
    case 299: {
      // Order consumer (docs/order-consumer-prep.md §0): F filtered to the ten lowest-free slots before the foot
      // allocation seeds the sort (pixel-sensitive: reversed/ascending seeds change 8 ages); unknown -> null.
      if (!spriteOrderInput?.known) return null;
      const spriteSlots = [...spriteOrderInput.free].sort((l, r) => l - r).slice(0, 10);
      const spriteOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        spriteSlots);
      if (spriteOrderSeed === null || spriteSlots.length !== 10) return null;
      config = { move: "BLAZE_KICK", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          targetCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40,
          attackerSide: attacker.geometry.side, spriteSlots, spriteOrderSeed,
        } };
      break;
    }
    case 88: {
      // Order consumer (docs/order-consumer-prep.md §0): the profile's 64-entry seed is the known-entry occupied
      // prefix + F (valid only while the occupants are the known-entry ones: the host lends only then, and the prefix
      // order is the known one at every such real-route body edge, tests/spriteOrderEventTransform.test.ts).
      if (!spriteOrderInput?.known) return null;
      const spriteOrderSeed = spriteOrderWithOccupiedPrefix(
        { known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (spriteOrderSeed === null) return null;
      config = { move: "ROCK_THROW", attacker, target, fieldProfile,
        animationProfile: { ...ROCK_THROW_ANIMATION_PROFILE, spriteOrderSeed,
          targetIdleX2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2 } };
      break;
    }
    case 195: {
      // Order consumer (docs/order-consumer-prep.md §0): equal-centerY notes inherit the free order of their
      // creation window; unknown order -> null. The 3/3 perish counts are the battle engine's immutable result
      // (next-adapters-prep5 §2.2): a live Perish Song always starts both timers at three.
      if (!spriteOrderInput?.known) return null;
      const noteOrderSeed = perishSongNoteOrderFromFree(spriteOrderInput.free);
      if (noteOrderSeed === null) return null;
      config = { move: "PERISH_SONG", attacker, target, noteOrderSeed,
        fieldProfile: { ...fieldProfile, playerPerishSongTurns: 3, opponentPerishSongTurns: 3 } };
      break;
    }
    case 53: {
      // docs/order-consumer-prep.md §0: flames take the eight lowest free slots, one per sort window, so equal keys
      // resolve by creation order whatever the free order is (0/130 ages change for 5 alternative seeds). A known
      // order supplies the provider's relative order (== accepted literal == observed 2/2); otherwise the slots
      // ascend. Slots are labels only here (known-entry lowest-free 3,4,5,7,9,10,11,12 when the host has no order).
      const known = spriteOrderInput?.known ? [...spriteOrderInput.free].sort((l, r) => l - r).slice(0, 8) : null;
      const flameSpriteSlots = known ?? [3, 4, 5, 7, 9, 10, 11, 12];
      const provided = known && spriteOrderInput
        ? spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, flameSpriteSlots) : null;
      config = { move: "FLAMETHROWER", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
          attackerSide: attacker.geometry.side,
          // ANIM_ATTACKER subpriority 3 off the attacker's base (30 player / 40 opponent): 27 / 37.
          flameSubpriority: attacker.geometry.side === "player" ? 27 : 37,
          flameSpriteSlots,
          spriteOrderSeed: provided ?? flameSpriteSlots,
        } };
      break;
    }
    case 82: {
      // D1 (#145): ROM StartDragonFireTranslation aims from the attacker's pic offset at the TARGET's, not at an ONIX literal.
      const dragonTargetPic = liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint;
      config = { move: "DRAGON_RAGE", attacker, target, fieldProfile,
        fireSpitGeometry: dragonRageFireSpitGeometryFor(attacker.geometry.side, attackerAnchors.picOffsetPoint, dragonTargetPic) };
      break;
    }
    case 288: {
      // Order consumer (docs/order-consumer-prep.md §0): the six flames take the six lowest free slots in one
      // sort window and inherit their relative free order, so only a host-supplied order is exact. Unknown tracked
      // order (liveSpriteOrderHost.ts) -> null, the bounded scene-off view.
      if (!spriteOrderInput?.known) return null;
      const lowestFree = [...spriteOrderInput.free].sort((left, right) => left - right).slice(0, 6);
      const seed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, lowestFree);
      if (lowestFree.length !== 6 || seed === null) return null;
      const side = attacker.geometry.side;
      // AnimTask_GrudgeFlames (battle_anim_ghost.c:1182-1187): X_2, GetBattlerYCoordWithElevation (sBattlerCoords y
      // minus the enemy elevation), BG priority of the battler's BG (BG2 player / BG1 opponent), subpriority.
      const elevation = art[side].origin.y - battleCommandFieldSpriteOrigin(art[side], side).y;
      config = {
        move: "GRUDGE",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
        animationProfile: {
          flameSlots: lowestFree as unknown as readonly [number, number, number, number, number, number],
          spriteOrderSeed: seed as unknown as readonly [number, number, number, number, number, number],
          attackerSubpriority: side === "player" ? 30 : 40,
          targetSubpriority: side === "player" ? 40 : 30,
          attackerBgPriority: side === "player" ? 2 : 1,
          attackerWidth: liveBattlerCoordAttrs(side, art).width,
          flameCenter: {
            x: attackerAnchors.battlePositionCenter.x,
            y: attackerAnchors.battlePositionCenter.y - (side === "opponent" ? elevation : 0),
          },
          // State-only diagnostic in grudge.ts (no pixel consumer); the live seam has no ROM animation-RNG value.
          animationRngSeed: 0,
        },
      };
      break;
    }
    case 317: {
      // docs/next-adapters-prep6.md s2.1: rocks/Red-X use the target pic point; the target's battler slot is the
      // known-entry slot (opponent 8 / player 6, equal to liveSpriteSlotForOwner on the known-entry host); the rock
      // slots 3,4,5,7,9 are first-free and seed-independent (0/42 seeds), so the reducer's slot rule needs no host.
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "ROCK_TOMB", attacker, target, fieldProfile,
        targetSpriteSlot: target.geometry.side === "opponent" ? 8 : 6,
        targetInitialX2: targetAnchors.frontIdleRest.x2,
        effectCenter: targetAnchors.picOffsetPoint };
      break;
    }
    case 219:
      // ringSubpriority = GetBattlerSpriteSubpriority(attacker) - 2 (30/40 - 2); the three ring slots are the
      // known-entry first-free slots 3,4,5 (prep6 s2.2) and seed-independent (0/42 seeds, s2.3): labels only.
      config = { move: "SAFEGUARD", attacker, target, fieldProfile,
        animationProfile: { ringSlots: [3, 4, 5], ringSubpriority: attacker.geometry.side === "player" ? 28 : 38 } };
      break;
    case 230:
      // spriteSlots = ROM spawn order of the 24 petals on the known-entry first-free host with slot reuse
      // (prep6-plans.json); seed-independent (0/42 seeds, 12 equal-key pairs none overlapping). targetSubpriority
      // is attacker subpriority - 2.
      config = { move: "SWEET_SCENT", attacker, target, fieldProfile,
        animationProfile: { spriteSlots: SWEET_SCENT_PETAL_SLOTS, targetSubpriority: attacker.geometry.side === "player" ? 28 : 38 } };
      break;
    // The attacker's displayed HP is already 0 at the event (setatkhptozero precedes attackanimation; prep6 s2.1),
    // the same displayed-field path as Explosion; the live seam reads it from the field.
    case 120: config = { move: "SELF_DESTRUCT", attacker, target, fieldProfile }; break;
    case 262: {
      // Memento (docs/next-adapters-prep34.md s2.5): the battle's first animation body only (the scanline entry is the intro residue; a later
      // body after a scanline body differs), non-shiny (live battler art draws normal palettes). The attacker's self-KO / stat drops are
      // gameplay-owned and never read inside the body; the HUD shows the displayed HP 0 (prep6 Self-Destruct path) under the live field.
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      config = { move: "MEMENTO", attacker, target,
        fieldProfile: { playerHp: field.player.hp, playerMaxHp: field.player.maxHP, opponentHp: field.opponent.hp, opponentMaxHp: field.opponent.maxHP },
        reducer: liveMementoReducerConfig(field, attacker.geometry.side, battlerX2Input) };
      break;
    }
    case 245: {
      // Extreme Speed (docs/next-adapters-prep34.md s1.4 / s1.5): reducer age 43 at the activation row (live age 0), both sides; the attacker's
      // pic-coords yOffset is the A input of the stretch y2. The renderer draws the live battler art at the field corners: zero idle rests
      // (the impact program writes the target x2 absolutely; no rest window was measured) and non-shiny battlers (normal palettes).
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const targetRest = liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest;
      if (attackerAnchors.frontIdleRest.x2 !== 0 || attackerAnchors.frontIdleRest.y2 !== 0 || targetRest.x2 !== 0 || targetRest.y2 !== 0) return null;
      // The hit splats' anchor is the target battler sprite (x, y) on both sides (prep34 s1.4 A: DUGTRIO (72, 91), GOLEM (72, 96)).
      config = { move: "EXTREME_SPEED", attacker, target: affineCenterBattler(target), animationAgeOffset: 43,
        attackerYOffset: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" } };
      break;
    }
    case 256: {
      // Stockpile count = request.turn (measured 1/2/3, prep6-swallow-probe.json). The attacker's affine centre is the
      // OBJ/sprite centre (affineCenterBattler), not the pic point; the pic point and coords.yOffset are separate inputs.
      const turn = request.turn as 1 | 2 | 3;
      config = { move: "SWALLOW", attacker: affineCenterBattler(attacker), target, fieldProfile, stockpileCount: turn,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        attackerPictureYOffset: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset };
      break;
    }
    // Knock Off reads only the target's animation centre (the hit splat) and the reducer age; no order seed exists in
    // the config (known seed shapes give 0 differing frames, prep6 s2.3), so there is no order input to lend.
    case 282: config = { move: "KNOCK_OFF", attacker, target, fieldProfile }; break;
    case 185:
      if (attacker.geometry.side !== "player") return null;
      // The canonical ONIX_TO_GROVYLE profile = the source-age constants (prep6 s2.1: spriteCorners and the target's
      // hit-splat centre derive exactly); the move text and HP chrome come from the live view under liveField.
      config = { move: "FAINT_ATTACK", attacker, target, animationProfile: FAINT_ATTACK_ANIMATION_PROFILE,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" },
        moveTextStartAge: -24 };
      break;
    case 332:
    case 98: {
      // The body fns read the attacker side and the reducer age only (prep7 s2.1); the controller profile, hit reaction,
      // HP and text are HUD owned by the queue's hit/HP/message commands (never-reached ages here). The accepted windows
      // start before activation: the reducer age at the activation frame is 42 (Aerial Ace) / 44 (Quick Attack), the
      // same for both orientations (the player preset's offset 4 re-expresses it, prep7-reducer-checks.json), so live
      // age 0 = activation = reducer age 42 / 44. Rows before it are idle bodies under the preceding `message` command
      // (the move compositor's age is the move-animation command's phaseElapsed, liveMoveAnimation.ts header comment).
      const never = 1_000_000;
      const common = { attacker, target, animationAgeOffset: request.moveId === 332 ? 42 : 44, moveTextStartAge: 0,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" as const } };
      config = request.moveId === 332
        ? { move: "AERIAL_ACE", ...common, controllerProfile: { targetHpBefore: field.player.hp, targetHpAfter: field.player.hp,
            hitReactionFirstAge: never, hpDrainFirstAge: never, moveTextClearAge: never, resultTextFirstAge: never,
            currentMoveResetAge: never } }
        : { move: "QUICK_ATTACK", ...common, controllerProfile: { targetHpBefore: field.player.hp, targetHpAfter: field.player.hp,
            hitReactionFirstAge: never, hpDrainFirstAge: never, resultTextFirstAge: never,
            resultKind: "notVeryEffective" as const, currentMoveResetAge: never } };
      break;
    }
    case 7:
      // prep22 s0.1/A.5: the body reads the geometry + the reducer age only (reducer age 27 at activation, both sides). The
      // resolution profile is the measured neutral constant (no HP commit / roll / burn: never-reached ages; the burn flames are
      // the separate Status_Burn body, which the live renderer never draws from this config). The opponent's idle rest is drawn by the
      // renderer (the target's hit shake replaces it at reducer age 72).
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      config = { move: "FIRE_PUNCH", attacker, target, animationAgeOffset: 27, moveTextStartAge: 0,
        resolutionProfile: { startHp: 0, endHp: 0, initialStatus: "none", hpCommitAge: 1_000_000, hpDrainFirstAge: 1_000_000,
          hitWobbleFirstAge: 1_000_000, hitBlinkFirstAge: 1_000_000, secondaryRollAge: 1_000_000, secondaryRollSucceeded: false,
          currentMoveResetAge: 1_000_000 } };
      break;
    case 8:
      // The body reads the target animation centre + side and the age only (prep7 s2.1). The accepted hpDrainProfile /
      // controllerDisplayProfile feed HP, result text, menu, freeze status (FrozenIceCube from age 409) and Sitrus: all
      // later queue commands outside the 183-frame script, so neutral never-reached ages are passed (omitting
      // controllerDisplayProfile drops no body-window pixel: dense rows 0..183 are exact without it).
      config = { move: "ICE_PUNCH", attacker, target, moveTextStartAge: 0,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" },
        hpDrainProfile: { startHp: field.player.hp, endHp: field.player.hp, firstDisplayedAge: 1_000_000 } };
      break;
    case 313: {
      // prep7 s2.1: the picture bounds are the attacker pic point -/+ width/2 and - height/2 (GetBattlerSpriteCoordAttr
      // LEFT/RIGHT/TOP, exact 2/2); the affine centre is the sprite centre, not the pic point. The typed
      // controllerPresentation is read only by the renderer's bottom-UI/banner block, which liveField skips (the queue's
      // stat command owns the banner, result text and menu): never-reached ages. The -2 Sp. Def receipt (6 -> 4, anim
      // argument 55) is the move's fixed effect (EFFECT_SPECIAL_DEFENSE_DOWN_2), which the display fn validates.
      const attrs = liveBattlerCoordAttrs(attacker.geometry.side, art);
      const pic = attackerAnchors.picOffsetPoint;
      const never = 1_000_000;
      config = { move: "FAKE_TEARS", attacker: affineCenterBattler(attacker), target, fieldProfile,
        attackerPictureBounds: { left: pic.x - attrs.width / 2, right: pic.x + attrs.width / 2, top: pic.y - attrs.height / 2 },
        controllerPresentation: { kind: "resolved-stat-drop",
          kickoff: { messageId: "STRINGID_USEDMOVE", firstAge: 0,
            selection: { moveIds: [0, 0, 0, 0], maxPP: [0, 0, 0, 0], cursor: 0 } },
          statChange: { battler: "target", stat: "special-defense", from: 6, to: 4 },
          statAnimation: { animationId: "STATS_CHANGE", argument: 55, firstAge: never },
          result: { messageId: "STRINGID_DEFENDERSSTATFELL", firstAge: never },
          moveEnd: { clearAge: never } } };
      break;
    }
    // Sleep Talk: the body reads the attacker side + animation centre and the age only (prep7 s2.1); the sleep status, HP
    // and text the staged branch hard-coded come from the displayed field under liveField (the field already says
    // `sleep`, prep7-sleep-talk-field.json). The called move is an ordinary second request (Metronome precedent).
    case 214: config = { move: "SLEEP_TALK", attacker, target }; break;
    case 157:
      if (attacker.geometry.side !== "opponent") return null;
      // The reducer is seed-independent (0/40 arbitrary seeds, prep7 s2.3): the 64-entry spriteOrderSeed is the provider
      // order (known-entry occupied prefix + F) when the tracked order is known and the accepted known-entry literal
      // otherwise (both equal the observed order at a first body); the first-found pixel result is the same either way.
      config = { move: "ROCK_SLIDE", attacker, target,
        animationProfile: { ...GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE,
          spriteOrderSeed: (spriteOrderInput?.known
            ? spriteOrderWithOccupiedPrefix({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
              KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) : null) ?? GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE.spriteOrderSeed },
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" }, moveTextStartAge: 0 };
      break;
    case 126: {
      // First-body gate (prep7 s2.3): the reducer's own 64-entry literal (fireBlast.ts FIRE_BLAST_ORDER_SEED) differs from
      // the provider order (occupied prefix + F) only in slots 3/4 and renders identically (0 differing pixels / 197 ages,
      // both orientations), so no reducer input exists; a body without a known tracked order is not proven -> null.
      if (!spriteOrderInput?.known) return null;
      config = { move: "FIRE_BLAST", attacker, target, fieldProfile,
        animationProfile: { attackerPictureCenter: attackerAnchors.picOffsetPoint,
          targetPictureCenter: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint,
          targetSpriteSlot: target.geometry.side === "opponent" ? 8 : 6 } };
      break;
    }
    case 349: {
      // First-body gate (prep7 s2): the six orbs take the slots 3,4,5,7,9,10 (first-free); the reducer ranks them by
      // `allocationOrder` = each orb's index in the provider's free order restricted to those slots ([4,3,5,10,9,7] ->
      // [1,0,2,5,4,3], reproduces the ROM orb order at age 20). Unknown tracked order -> null (Grudge recipe). The orb
      // radius is max(width, height) >> 1 of the attacker's picture.
      if (!spriteOrderInput?.known) return null;
      const allocationSlots = [3, 4, 5, 7, 9, 10];
      const providerOrder = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, allocationSlots);
      if (providerOrder === null) return null;
      const { width, height } = liveBattlerCoordAttrs(attacker.geometry.side, art);
      config = { move: "DRAGON_DANCE", attacker, target, fieldProfile,
        animationProfile: { pictureSize: { width, height }, allocationSlots,
          allocationOrder: allocationSlots.map(slot => providerOrder.indexOf(slot)) } };
      break;
    }
    case 129: case 271: {
      // prep8 s0/s3: the allocator-derived ids (star/bag slots, ShakeMon/Stretch task slots) are the constants of the
      // baseline (matrix bitmap 0x6, no task, equal to the ROM plan at all 481 activations, allocator-plan-v2-evidence.md),
      // valid only while the known-entry history holds: gate on the lent tracked order. The caller-owned RNG is echoed
      // into the view and never read for pixels; the live seam has none, so it is 0.
      if (!spriteOrderInput?.known) return null;
      const attackerSlot = attacker.geometry.side === "player" ? 6 : 8;
      const targetSlot = target.geometry.side === "player" ? 6 : 8;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      if (request.moveId === 129) {
        config = { move: "SWIFT", attacker: affineCenterBattler(attacker), target: affineCenterBattler(target), fieldProfile,
          animationProfile: { attackerSide: attacker.geometry.side, attackerEffectCenter: attackerAnchors.picOffsetPoint,
            targetAverageCenter: targetAnchors.picOffsetPoint, attackerSpriteSlot: attackerSlot, targetSpriteSlot: targetSlot,
            targetInitialOffset: { x2: targetAnchors.frontIdleRest.x2, y2: 0 }, starSlots: [3, 4, 5, 7, 9],
            targetShakeTaskSlot: 0, gameplayRng: 0 } };
      } else {
        config = { move: "TRICK", attacker: affineCenterBattler(attacker), target: affineCenterBattler(target), fieldProfile,
          animationProfile: { bagSlots: [3, 4],
            attacker: { spriteSlot: attackerSlot, stretchTaskSlot: 1, shakeTaskSlot: 0 },
            target: { spriteSlot: targetSlot, stretchTaskSlot: 0, shakeTaskSlot: 1 },
            orientation: attacker.geometry.side === "player" ? "player-back" : "opponent-front", gameplayRng: 0 } };
      }
      break;
    }
    case 209: {
      // prep10 s3.5, player attacker: flashing initial callback/affine advances are all 0 (Minun, Plusle, Chinchou); the
      // tie order is the accepted artifact (not derived: unproven for other histories, so the lend gate applies).
      if (!spriteOrderInput?.known) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SPARK", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint, targetPictureOffset: targetAnchors.battlePositionCenter,
        targetImpactPosition: targetAnchors.picOffsetPoint, attackerBgPriority: 2, targetBgPriority: 1,
        flashingInitialCallbackAdvances: [0, 0, 0, 0, 0, 0, 0, 0], flashingInitialAffineAdvances: [0, 0, 0, 0, 0, 0, 0, 0],
        hardwareTieSlotOrder: [12, 7, 3, 4, 5, 9, 10, 11] };
      break;
    }
    case 13: {
      // prep10 s3.9: the allocator ids are the known-entry constants (tornadoes 3,4,5 / matrices 0,3,4; crescents 3,4,5 /
      // matrices 16,8,0; subpriority = attacker subpriority - 2). The three own sprites are created in ascending slot order
      // and nothing else in the order is drawn, so the lent order is pixel-neutral (dense-verified with the order
      // withheld AND lent): ungated like Solar Beam, which is why the unleash body (after an untracked setup body) renders.
      // ShakeMon2 starts from the target's live idle x2/y2.
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "RAZOR_WIND", body: (request.turn & 1) === 0 ? "setup" : "unleash", attacker, target, fieldProfile,
        attackerPictureCenter: attackerAnchors.picOffsetPoint, targetPictureCenter: targetAnchors.picOffsetPoint,
        targetRestOffset: { x2: targetAnchors.frontIdleRest.x2, y2: targetAnchors.frontIdleRest.y2 },
        animationProfile: { tornadoSpriteSlots: [3, 4, 5], tornadoMatrixIds: [0, 3, 4], crescentSpriteSlots: [3, 4, 5],
          crescentMatrixIds: [16, 8, 0], spriteOrderSeed: [3, 4, 5], effectPriority: 1,
          effectSubpriority: (attacker.geometry.side === "player" ? 30 : 40) - 2 } };
      break;
    }
    case 350: {
      // prep10 s3.8: one body per hit (request.turn 0..n-1). Allocator ids are the known-entry constants (lunge 3, rock 4,
      // hitsplat 3, fragments 4,5,7,9, ShakeMon task 0; matrix bitmap 0x6, no task at activation), identical for every hit:
      // gate on the lent order. The reducer reads no order; the caller-owned RNG is echoed only.
      if (!spriteOrderInput?.known) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const slotOf = (side: "player" | "opponent") => side === "player" ? 6 : 8;
      config = { move: "ROCK_BLAST", attacker, target, bodies: [{ fieldProfile, moveTextVisible: false,
        animationProfile: { attackerSide: attacker.geometry.side,
          attacker: { spriteSlot: slotOf(attacker.geometry.side), initialX2: attackerAnchors.frontIdleRest.x2,
            initialY2: attackerAnchors.frontIdleRest.y2, battlePositionCenter: attackerAnchors.battlePositionCenter },
          target: { spriteSlot: slotOf(target.geometry.side), initialX2: targetAnchors.frontIdleRest.x2,
            initialY2: targetAnchors.frontIdleRest.y2, battlePositionCenter: targetAnchors.battlePositionCenter,
            effectCenter: targetAnchors.picOffsetPoint },
          allocator: { lungeSlot: 3, rockSlot: 4, hitsplatSlot: 3, fragmentSlots: [4, 5, 7, 9], shakeTaskSlot: 0 },
          gameplayRng: 0 } }] };
      break;
    }
    case 220:
      // prep10 s3.4: SetBattlerSpriteYOffsetFromYScale reads each battler's species pic-coords yOffset (player back / opponent front).
      config = { move: "PAIN_SPLIT", attacker, target, fieldProfile,
        pictureYOffsets: { attacker: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset,
          target: liveBattlerCoordAttrs(target.geometry.side, art).yOffset } };
      break;
    case 179: {
      // prep10 s3.2: ShakeTargetBasedOnMovePowerOrDmg amplitude = clamp(gAnimMovePower / 12, 1, 16) (request.power = gBattleMovePower).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "REVERSAL", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint, targetPictureOffset: targetAnchors.picOffsetPoint,
        resolvedShake: { kind: "resolved-power-shake", amplitude: Math.min(16, Math.max(1, Math.floor(request.power / 12))) } };
      break;
    }
    case 222: {
      // prep10 s3.1: request.power is gBattleMovePower (the engine's own Random()%100 roll). The battler allocator slots and
      // the 64-entry order are the known-entry constants (matrix bitmap 0x6, no task at activation): gate on the lent order.
      if (!spriteOrderInput?.known) return null;
      const fullOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      config = { move: "MAGNITUDE", attacker, target, fieldProfile,
        animationInputs: { movePower: request.power, attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
          initialPlatformX: 0,
          initialBattlerX2: { player: liveBattlerAnchors("player", art, battlerX2Input).frontIdleRest.x2,
            opponent: liveBattlerAnchors("opponent", art, battlerX2Input).frontIdleRest.x2 },
          battlerSpriteSlots: { player: 6, opponent: 8 }, spriteOrder: fullOrder } };
      break;
    }
    case 218: case 69: case 32: case 62: case 253: case 85: case 254: case 192: {
      // prep8 s0/s3 (docs/next-adapters-prep8.md): the allocator-derived ids/slots below are the constants of the baseline
      // (matrix bitmap 0x6, no task, equal to the ROM plan at all 481 activations; docs/allocator-plan-v2-evidence.md), valid
      // only while the known-entry history holds, which is exactly when the host lends the tracked order: no lend -> null.
      // Every order field is taken from the lent free order (64-entry occupied prefix + free order, or its slot subsets).
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const orderIndex = (slot: number) => fullOrder.indexOf(slot);
      const side = attacker.geometry.side;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const subA = side === "player" ? 30 : 40, subT = side === "player" ? 40 : 30;
      const towardTarget = side === "player" ? 1 : -1;
      const restOffset = (a: LiveBattlerAnchors) => ({ x2: a.frontIdleRest.x2, y2: a.frontIdleRest.y2 });
      const attackerCentre = affineCenterBattler(attacker), targetCentre = affineCenterBattler(target);
      switch (request.moveId) {
        case 218:
          // AnimTask_GetFrustrationPowerLevel: gAnimFriendship <= 30 is the strongest branch the reducer ports.
          if (request.friendship > 30) return null;
          config = { move: "FRUSTRATION", attacker: attackerCentre, target: targetCentre, fieldProfile,
            attackerEffectCenter: attackerAnchors.picOffsetPoint, targetEffectCenter: targetAnchors.picOffsetPoint,
            targetInitialX2: targetAnchors.frontIdleRest.x2,
            animationProfile: { angerSlot: 3, angerMatrix: 0, impactSlots: [3, 4], impactMatrices: [0, 3],
              impactOrders: [orderIndex(3), orderIndex(4)], impactSubpriority: subA - 3,
              attackerSubpriority: subA, targetSubpriority: subT } };
          break;
        case 69: {
          // AnimTask_GetSeismicTossDamageLevel: gAnimMoveDmg 33..65 is the medium branch the reducer ports.
          if (request.damage < 33 || request.damage > 65) return null;
          const wave = (slots: number[], matrices: number[]) => slots.map((slot, i) =>
            ({ slot, matrixNum: matrices[i]!, persistentOrder: orderIndex(slot) }));
          const rocks = [wave([4, 5, 7, 9], [3, 4, 5, 6]), wave([10, 11, 12, 13], [7, 8, 9, 10]), wave([4, 5, 7, 9], [3, 4, 5, 6])];
          config = { move: "SEISMIC_TOSS", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationGeometry: { targetEffectCenter: targetAnchors.picOffsetPoint,
              targetRockCenter: targetAnchors.battlePositionCenter,
              attackerRestOffset: restOffset(attackerAnchors), targetRestOffset: restOffset(targetAnchors) },
            animationProfile: { rocks, hitsplats: wave([3, 3, 3], [0, 0, 0]),
              attackerSubpriority: subA, targetSubpriority: subT,
              attackerPalette: art[attacker.geometry.side].pic.palette, targetPalette: art[target.geometry.side].pic.palette,
              attackerAnimFrame: side === "player" ? 0 : 1, targetAnimFrame: side === "player" ? 1 : 0 } };
          break;
        }
        case 32: {
          const seed = spriteOrderForSlots(lentState, [3, 4, 5]);
          if (seed === null) return null;
          config = { move: "HORN_DRILL", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationGeometry: { attackerCenter: attackerAnchors.spriteCenter, targetPictureCenter: targetAnchors.picOffsetPoint,
              attackerRestOffset: restOffset(attackerAnchors), targetRestOffset: restOffset(targetAnchors) },
            animationProfile: { hornSlot: 4, hornMatrixId: side === "player" ? 0 : 24,
              impactSlots: [3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4], impactMatrixIds: [0, 3, 4, 0, 3, 4, 0, 3, 4, 0, 3],
              spriteOrderSeed: seed, effectSubpriority: subT - 3 } };
          break;
        }
        case 62: {
          const cycle = <T,>(values: T[], n: number) => Array.from({ length: n }, (_, i) => values[i % values.length]!);
          config = { move: "AURORA_BEAM", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationGeometry: { attackerRingOrigin: { x: attackerAnchors.picOffsetPoint.x + 20 * towardTarget, y: attackerAnchors.picOffsetPoint.y },
              targetPictureCenter: targetAnchors.picOffsetPoint, targetRestOffset: restOffset(targetAnchors) },
            animationProfile: { ringSlots: cycle([3, 4, 5, 7, 9, 10], 40), ringMatrixIds: cycle([0, 3, 4, 5, 6, 7], 40),
              ringSubpriority: subT - 2, spriteOrderSeed: fullOrder } };
          break;
        }
        case 253:
          config = { move: "UPROAR", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationInputs: { ringSlots: [3, 3, 3], noteSlots: [4, 5], spriteOrder: fullOrder,
              attackerMatrixSlot: side === "player" ? 1 : 2, ringMatrixSlots: [0, 0, 0],
              attackerCenter: attackerAnchors.picOffsetPoint } };
          break;
        case 85: {
          const alloc = (slot: number, matrixNum: number) => ({ slot, matrixNum, order: orderIndex(slot) });
          const arcSlots = [3, 4, 3, 4, 3, 4, 3, 4], arcMatrices = [0, 8, 16, 0, 8, 16, 0, 8];
          config = { move: "THUNDERBOLT", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationGeometry: { targetBattleCenter: targetAnchors.battlePositionCenter, targetPictureCenter: targetAnchors.picOffsetPoint },
            animationProfile: {
              bolts: [3, 4, 5, 7, 9, 10, 11, 12, 3, 4, 5, 7, 9, 10, 11].map(slot => alloc(slot, 0)),
              orb: alloc(3, 0),
              flashes: [4, 5, 7, 9, 10, 11, 12, 13].map((slot, i) => alloc(slot, 3 + i)),
              arcs: arcSlots.map((slot, i) => alloc(slot, arcMatrices[i]!)) } };
          break;
        }
        case 254: {
          const orbSlotPool = [3, 4, 5, 7, 9] as const;
          const seed = spriteOrderForSlots(lentState, orbSlotPool);
          if (seed === null) return null;
          config = { move: "STOCKPILE", attacker: attackerCentre, target: targetCentre, fieldProfile,
            attackerPictureCenter: attackerAnchors.picOffsetPoint,
            attackerPictureYOffset: liveBattlerCoordAttrs(side, art).yOffset,
            // The ad-hoc age-0 shadow is retired under liveField (the shared liveOpponentShadow hook owns it).
            attackerShadowAtEntry: false,
            animationProfile: { orbSlotPool, orbMatrixPool: [0, 3, 4, 5, 6],
              spriteOrderSeed: seed as unknown as readonly [number, number, number, number, number], attackerSubpriority: subA } };
          break;
        }
        case 192: {
          const alloc = (slot: number, matrixNum: number, extra: { visibleFrom?: number; initializedFrom?: number } = {}) =>
            ({ slot, matrixNum, order: orderIndex(slot), ...extra });
          // Spark 7 (slot 12) becomes visible/initialised one row apart per orientation (prep8 s2.1 accepted configs).
          const sparkRows = side === "player"
            ? [[7, 7], [7, 7], [7, 7], [7, 7], [7, 7], [7, 7], [8, 8], [8, 8]]
            : [[7, 7], [7, 7], [7, 7], [7, 7], [7, 7], [7, 7], [7, 8], [8, 8]];
          const arcSlots = [3, 4, 3, 4, 3, 4, 3, 4], arcMatrices = [0, 8, 16, 0, 8, 16, 0, 8];
          config = { move: "ZAP_CANNON", attacker: attackerCentre, target: targetCentre, fieldProfile,
            animationGeometry: { attackerPictureCenter: { x: attackerAnchors.picOffsetPoint.x + 10 * towardTarget, y: attackerAnchors.picOffsetPoint.y },
              targetPictureCenter: targetAnchors.picOffsetPoint, targetBattleCenter: targetAnchors.battlePositionCenter },
            animationProfile: { ball: alloc(3, 0),
              sparks: [4, 5, 7, 9, 10, 11, 12, 13].map((slot, i) =>
                alloc(slot, i === 0 ? 0 : 2 + i, { visibleFrom: sparkRows[i]![0]!, initializedFrom: sparkRows[i]![1]! })),
              arcs: arcSlots.map((slot, i) => alloc(slot, arcMatrices[i]!)) } };
          break;
        }
        default: return null;
      }
      break;
    }
    case 202: case 241: case 72: case 71: case 138: {
      // prep9 (docs/next-adapters-prep9.md s0/s2): the allocator profiles are per-move constants (equal to the ROM first-free
      // replay in 12/12 histories, and to the accepted literals), valid only on the known-entry baseline, which is exactly when
      // the host lends the tracked order: no lend -> null. Order fields come from the lend; they are pixel-neutral (s2.3).
      if (!spriteOrderInput?.known) return null;
      const lentState = { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] };
      const fullOrder = spriteOrderWithOccupiedPrefix(lentState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      const side = attacker.geometry.side;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
      const healing = attackerAnchors.picOffsetPoint;
      const seedFor = (slots: readonly number[]) => spriteOrderForSlots(lentState, slots);
      const stars = [3, 4, 5, 3];
      switch (request.moveId) {
        case 241:
          config = { move: "SUNNY_DAY", attacker, target, fieldProfile,
            animationInputs: { raySlots: [3, 4, 5, 7], spriteOrder: fullOrder,
              paletteBanks: { background: [0, 1, 2, 3], attackerPartner: side === "player" ? 17 : 18 } } };
          break;
        case 202: {
          const orderSeed = seedFor([3, 4, 5, 7, 9, ...range(10, 21)]);
          if (orderSeed === null) return null;
          config = { move: "GIGA_DRAIN", attacker, target, fieldProfile, healingCenter: healing, absorptionCenter: healing,
            allocatorProfile: { hitsplat: 3, orbs: [3, 4, 5, 7, 9, ...range(10, 19), 3, 20, 21, 4, 7, 9, 5, 11, 13],
              stars, paletteController: 3, orderSeed } };
          break;
        }
        case 72: {
          const orderSeed = seedFor([3, 4, 5, 7, 9, ...range(10, 16)]);
          if (orderSeed === null) return null;
          config = { move: "MEGA_DRAIN", attacker, target, fieldProfile, healingCenter: healing, absorptionCenter: healing,
            allocatorProfile: { hitsplat: 3, orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 3, 15, 4, 5, 10, 16],
              stars, paletteController: 3, orderSeed } };
          break;
        }
        case 71:
          config = { move: "ABSORB", attacker, target, fieldProfile, healingCenter: healing, absorptionCenter: healing,
            allocatorProfile: { hitsplat: 3, orbs: [3, 4, 5, 7, 9, 3, 4, 10], stars, paletteController: 3 } };
          break;
        default: {
          const orderSeed = seedFor([3, 4, 5, 7, 9, ...range(10, 21)]);
          if (orderSeed === null) return null;
          config = { move: "DREAM_EATER", attacker, target, fieldProfile, healingCenter: healing, absorptionCenter: healing,
            targetRestOffset: { x2: targetAnchors.frontIdleRest.x2, y2: targetAnchors.frontIdleRest.y2 },
            allocatorProfile: { orbs: [3, 4, 5, 7, 9, ...range(10, 19), 3, 20, 21, 4, 7, 9, 5, 11, 13], stars, orderSeed } };
        }
      }
      break;
    }
    case 104: {
      if (!spriteOrderInput?.known) return null;
      const clonePair = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, [3, 4]);
      if (clonePair === null) return null;
      // The two clone sprites take slots 3 and 4; the one earlier in the lent order is drawn in front ("b" on a first body).
      config = { move: "DOUBLE_TEAM", attacker, target,
        fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: { cloneAnchorAge: 0, cloneVisibleStartAge: 2, cloneVisibleEndAge: 129, statsBannerStartAge: 163,
          statsBannerEndAge: 229, statsBannerBg1YAnchorAge: 166, frontClone: clonePair.indexOf(4) < clonePair.indexOf(3) ? "b" : "a" },
        moveTextStartAge: -28 };
      break;
    }
    case 297:
      if (!spriteOrderInput?.known) return null;
      config = { move: "FEATHER_DANCE", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        controllerProfile: { attackStageBefore: 0, attackStageAfter: 0 }, moveTextStartAge: 0, animationAgeOffset: 0 };
      break;
    case 153: config = { move: "EXPLOSION", attacker, target, fieldProfile }; break;
    case 248: config = { move: "FUTURE_SIGHT", attacker, target, fieldProfile }; break;
    case 342:
      config = {
        move: "POISON_TAIL",
        attacker: affineCenterBattler(attacker),
        target,
        fieldProfile,
      };
      break;
    case 343: config = { move: "COVET", attacker, target, fieldProfile }; break;
    case 347: config = { move: "CALM_MIND", attacker, target, fieldProfile }; break;
    // prep11 s2.3: body-only (the HUD profile is inert; the live queue owns text/HP/hit reaction). The reducers' age 0
    // is the first framebuffer row after the RAM hide (charge age 7 -> displayed 8; FLY strike ball callback 0 at age
    // 11, BOUNCE at 7), the same epochs as the accepted staged fixtures (tools/compare/fixtures/{fly,bounce}-*.json).
    // Allocator constants: ball slot 3 / matrix 0 (charge), ball 3 + hitsplat 4 (strike); no order lend is read.
    case 19: {
      const turn = (request.turn & 1) === 0 ? "charge" as const : "strike" as const;
      config = { move: "FLY", turn, attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        controllerProfile: LIVE_FLY_BODY_ONLY_PROFILE, animationAgeOffset: turn === "charge" ? -8 : -11 };
      break;
    }
    case 340: {
      const turn = (request.turn & 1) === 0 ? "charge" as const : "strike" as const;
      const player = attacker.geometry.side === "player";
      config = { move: "BOUNCE", turn, attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        controllerProfile: LIVE_BOUNCE_BODY_ONLY_PROFILE,
        animationAgeOffset: turn === "charge" ? -8 : -7, strikeEffectDelay: player ? 4 : 0,
        ...(player ? { strikeAttackerRestoreAge: 20 } : {}) };
      break;
    }
    // prep11 s0.2: no order or allocator input (slots/tasks are constants); the body ends with the target off-screen and
    // the Scene ON forced switch-out hold (battleResolutionPresentation.ts) owns E+1.. without redrawing it.
    case 205: {
      // prep11 ROLLOUT row: the counter selects the body (mud power 30 / rock templates); the particle slot pool and sort
      // seed are the reducer's (shared by all five bodies). AnimTask_Rollout: start/end = BATTLER_COORD_X_2 / BATTLER_COORD_Y
      // + 24 of attacker / target; monbg = the Task_UpdateMonBg formula; sprite slots 6 / 8. The target's idle x2 offset
      // applies to the counter 1 body only (accepted staged corpus, tools/compare/rolloutFramebuffer.ts).
      const counter = request.rolloutCounter;
      if (counter === undefined || !(counter >= 1 && counter <= 5)) return null;
      // Defense Curl doubles the power (60 << (counter - 1)); only the shake amplitude reads it (docs/rollout-curl-diagnosis.md).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const playerAttacker = attacker.geometry.side === "player";
      const baseX2 = counter === 1 ? targetAnchors.frontIdleRest.x2 : 0, baseY2 = counter === 1 ? targetAnchors.frontIdleRest.y2 : 0;
      const cx = targetAnchors.spriteCenter.x + baseX2, cy = targetAnchors.spriteCenter.y + baseY2;
      config = { move: "ROLLOUT", attacker, target, fieldProfile, counter: counter as 1 | 2 | 3 | 4 | 5,
        animationProfile: {
          side: attacker.geometry.side,
          attackerStart: { x: attackerAnchors.battlePositionCenter.x, y: attackerAnchors.battlePositionCenter.y + 24 },
          targetEnd: { x: targetAnchors.battlePositionCenter.x, y: targetAnchors.battlePositionCenter.y + 24 },
          attackerSpriteSlot: playerAttacker ? 6 : 8, targetSpriteSlot: playerAttacker ? 8 : 6,
          targetBaseX2: baseX2, targetBaseY2: baseY2,
          impactCenter: targetAnchors.picOffsetPoint, movePower: request.power,
          monbg: { layer: target.geometry.side === "player" ? "bg2" : "bg1", spriteX: cx, spriteY: cy,
            bgX: 32 - cx, bgY: 32 - cy, inBg2: target.geometry.side === "player", battlerId: target.geometry.side === "player" ? 0 : 1 } } };
      break;
    }
    case 46: config = { move: "ROAR", attacker, target, fieldProfile }; break;
    case 18: config = { move: "WHIRLWIND", attacker, target, fieldProfile }; break;
    case 24: {
      // Words from the presentation host only (activated in tick; null = not activated -> scene-off fallback).
      // AnimFistOrFootRandomPos (battle_anim_fight.c:483-492): x % (width/2), y % (height/4), & 1 negates; the
      // target's GetBattlerSpriteCoordAttr width/height.
      const words = liveMovePresentationRngWords(presentationRngInput)?.words;
      if (words === undefined || words.length !== 4) return null;
      const dims = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "DOUBLE_KICK", attacker, target, fieldProfile,
        targetDimensions: { width: dims.width, height: dims.height },
        fistRandom: { x: words[0]!, y: words[1]!, xSign: words[2]!, ySign: words[3]! } };
      break;
    }
    case 295: {
      // prep29 R1 / B.5: Luster Purge (faithful-random). Six AnimHitSplatRandom word pairs from the presentation host; geometry from the anchors.
      const draws = liveMovePresentationRngWords(presentationRngInput)?.draws;
      if (draws === undefined || draws.length !== 6 || draws.some((pair) => pair.length !== 2)) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "LUSTER_PURGE", attacker, target, fieldProfile,
        ...liveLusterPurgeFields({ attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, draws }) };
      break;
    }
    case 273: {
      // 21 mini twinkling stars, two words each in spawn order (miniTwinklingStarFromWords).
      const draws = liveMovePresentationRngWords(presentationRngInput)?.draws;
      if (draws === undefined || draws.length !== 21 || draws.some((pair) => pair.length !== 2)) return null;
      config = { move: "WISH", attacker, target, fieldProfile,
        twinkles: draws.map((pair) => miniTwinklingStarFromWords(pair[0]!, pair[1]!)) };
      break;
    }
    case 175: {
      // request.power is gBattleMovePower (the damagecalc wrote it; battleScriptHitChainOpcode.ts). AnimHitSplatRandom
      // (battle_anim_normal.c:1049-1063): InitSpritePosToAnimTarget(FALSE) = target sBattlerCoords + (relativeTo 1,
      // negated for an opponent attacker; animation 3 into y); x2 = w0 % 48 - 24, y2 = w1 % 24 - 12. The flail task
      // rotates the attacker about its unshifted OBJ center; the shake starts from the target's front-idle x2.
      const words = liveMovePresentationRngWords(presentationRngInput)?.words;
      if (words === undefined || words.length !== 2 || !FLAIL_POWERS.includes(request.power as FlailPower)) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "FLAIL", attacker: affineCenterBattler(attacker), target, fieldProfile,
        movePower: request.power as FlailPower,
        targetInitialX2: targetAnchors.frontIdleRest.x2,
        hitsplatCenter: {
          x: targetAnchors.battlePositionCenter.x + (attacker.geometry.side === "player" ? 1 : -1),
          y: targetAnchors.battlePositionCenter.y + 3,
        },
        visualRandom: { x: words[0]! % 48, y: words[1]! % 24 } };
      break;
    }
    case 37: {
      // Three AnimFistOrFootRandomPos groups (x, y, xSign, ySign) as Double Kick; the target's width/height moduli and
      // the attacker's pic-coords yOffset for the affine anchor.
      const draws = liveMovePresentationRngWords(presentationRngInput)?.draws;
      if (draws === undefined || draws.length !== 3 || draws.some((group) => group.length !== 4)) return null;
      const group = (g: readonly number[]) => ({ x: g[0]!, y: g[1]!, xSign: g[2]!, ySign: g[3]! });
      const dims = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "THRASH", attacker, target, fieldProfile,
        fistRandom: [group(draws[0]!), group(draws[1]!), group(draws[2]!)],
        targetDimensions: { width: dims.width, height: dims.height },
        attackerPicYOffset: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset };
      break;
    }
    case 310: {
      // AnimSprayWaterDroplet (battle_anim_flying.c:1106-1107): droplet k = (w[2k] & 0x1ff, w[2k+1] & 0x7f);
      // SetBattlerSpriteYOffsetFromYScale reads the target's pic-coords yOffset (as Fake Out). The droplets and the
      // stretch anchor on the target's unshifted OBJ center (staged astonishEvidence.ts: ONIX back (72, 80)).
      const words = liveMovePresentationRngWords(presentationRngInput)?.words;
      if (words === undefined || words.length !== 4) return null;
      config = { move: "ASTONISH", attacker, target: affineCenterBattler(target), fieldProfile,
        targetPictureYOffset: liveBattlerCoordAttrs(target.geometry.side, art).yOffset,
        targetElevation: art[target.geometry.side].origin.y - battleCommandFieldSpriteOrigin(art[target.geometry.side], target.geometry.side).y,
        dropletRandom: [{ v1: words[0]! & 0x1ff, v2: words[1]! & 0x7f }, { v1: words[2]! & 0x1ff, v2: words[3]! & 0x7f }] };
      break;
    }
    case 58: {
      // prep13 s1.1: geometry from the anchors, the monbg base from the target's source sprite centre + idle x2 (the first
      // Task_UpdateMonBg data), every other field a constant/echo; the 64-entry activation order is the lent order (it
      // alone reproduces the ROM order rows), so an unknown tracked order is not proven -> null.
      if (!spriteOrderInput?.known) return null;
      const initialOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (initialOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "ICE_BEAM", attacker, target, fieldProfile,
        animationProfile: { orientation: attacker.geometry.side === "player" ? "player-back" : "opponent-front",
          endAge: 202, gameplayRng: 0, animationRngStart: 0,
          geometry: { attackerPictureOffset: attackerAnchors.picOffsetPoint, targetPictureOffset: targetAnchors.picOffsetPoint,
            targetCenter: targetAnchors.picOffsetPoint,
            monbgBaseHofs: 544 - (targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2),
            monbgBaseVofs: 544 - targetAnchors.spriteCenter.y },
          spriteOrder: { initialOrder } },
        targetIdleX2: targetAnchors.frontIdleRest.x2 };
      break;
    }
    case 63: {
      // prep13 s1.4 (faithful random): 52 orbs x (animation, speed, phase) from the presentation host's 26 x 6 words; the
      // orb slots are the lowest-free allocator over the known-entry in-use set, each orb released `visible rows + 1` frames
      // after its birth (the reducer's own lifetime, so a pass with placeholder slots measures it); persistentOrder = the
      // slot's index in the lent order. Geometry/rest from the anchors. Unknown tracked order -> null.
      const draws = liveMovePresentationRngWords(presentationRngInput)?.draws;
      if (draws === undefined || draws.length !== 26 || draws.some((group) => group.length !== 6) || !spriteOrderInput?.known) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const side = attacker.geometry.side;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const animationGeometry = { attackerPictureCenter: attackerAnchors.picOffsetPoint, targetPictureCenter: targetAnchors.picOffsetPoint,
        attackerRestOffset: { x2: attackerAnchors.frontIdleRest.x2, y2: attackerAnchors.frontIdleRest.y2 },
        targetRestOffset: { x2: targetAnchors.frontIdleRest.x2, y2: targetAnchors.frontIdleRest.y2 } };
      const words = draws.flatMap((group) => [
        hyperBeamOrbFromWords(group[0]!, group[1]!, group[2]!), hyperBeamOrbFromWords(group[3]!, group[4]!, group[5]!)]);
      const subs = { attackerSubpriority: side === "player" ? 30 : 40, targetSubpriority: side === "player" ? 40 : 30 };
      // Visible rows of an orb = duration - 1, duration = (|xDiff| << 4) / speed (hyperBeam.ts orbAtAge: it is created with
      // `remaining` = duration, ticks twice by its first display row and is destroyed on the tick that finds 0 left).
      const originX = animationGeometry.attackerPictureCenter.x + (side === "player" ? 20 : -20);
      const xDiff = Math.abs(animationGeometry.targetPictureCenter.x - originX);
      const visibleRows = words.map((word) => Math.max(0, Math.trunc((xDiff << 4) / word.speed) - 1));
      const alive: { slot: number; until: number }[] = [];
      const slots: number[] = [];
      words.forEach((_, index) => {
        const born = 110 + Math.floor(index / 2) * 3;
        for (let k = alive.length - 1; k >= 0; k -= 1) if (alive[k]!.until <= born) alive.splice(k, 1);
        let slot = 0;
        while ([0, 1, 2, 6, 8, 60, 61, 62, 63].includes(slot) || alive.some((a) => a.slot === slot)) slot += 1;
        slots.push(slot);
        alive.push({ slot, until: born + visibleRows[index]! + 1 });
      });
      config = { move: "HYPER_BEAM", attacker, target, fieldProfile, animationGeometry,
        animationProfile: { orbs: words.map((word, index) => ({ ...word, slot: slots[index]!, persistentOrder: lentOrder.indexOf(slots[index]!) })),
          ...subs, spriteOrderSeed: lentOrder } };
      break;
    }
    case 142: case 191: case 190: {
      // prep22 P1 (docs/next-adapters-prep22.md s B.5): the shared profile builder. Slots / subpriority / attr2 / palette snapshots are
      // production-derivable (liveProfileMoves.ts); the effect pictures are drawn from the displayed species art, so only a tracker lend
      // (the first-body / known-order gate: the activation order differs between bodies of one battle) and a non-shiny pair are required.
      // Lovely Kiss reads its activation value from the presentation host (the four `% 180` draws replay from it); no host = decline.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      if (palettes === null) return null;
      const targetSide = target.geometry.side;
      const base = { free: KNOWN_ENTRY_FREE_SPRITE_SLOTS, targetSide, palettes };
      if (request.moveId === 142) {
        const words = liveMovePresentationRngWords(presentationRngInput);
        if (words === null || words.draws.length !== 1 || words.words.length !== 4) return null;
        config = { move: "LOVELY_KISS", attacker, target, fieldProfile,
          animationProfile: liveLovelyKissProfile({ ...base, activationRng: words.activationValue,
            pinkHeartPalette: lovelyKissAsset.pinkHeart.palette, devilPalette: lovelyKissAsset.devil.palette }) };
      } else if (request.moveId === 191) {
        config = { move: "SPIKES", attacker, target, fieldProfile, animationProfile: liveSpikesProfile({ ...base, activationRng: 0, spikePalette: spikesAsset.spike.palette }) };
      } else {
        config = { move: "OCTAZOOKA", attacker, target, fieldProfile, animationProfile: liveOctazookaProfile({ ...base, activationRng: 0,
          graySmokePalette: octazookaAsset.graySmoke.palette, blackBallPalette: octazookaAsset.blackBall.palette }) };
      }
      break;
    }
    case 324: {
      // prep22 P3 (docs/next-adapters-prep22.md s B.5): Signal Beam, first body only (WIN0 (240, 161) is the battle's first-body reset and the
      // painter order is the lent known-entry order); a later body declines. Non-shiny, the assets-only composite palette.
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SIGNAL_BEAM", attacker, target, fieldProfile,
        animationInputs: liveSignalBeamInputs({ attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors,
          palettes, spriteOrder: lentOrder }) as never };
      break;
    }
    case 329: {
      // prep22 P3: Sheer Cold, first body only (the activation BG registers and the lent order are the first-body inputs); a later body declines.
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SHEER_COLD", attacker, target, fieldProfile,
        animationInputs: liveSheerColdInputs({ attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors,
          spriteOrder: lentOrder }) as never,
        idleRest: { attacker: attackerAnchors.frontIdleRest, target: targetAnchors.frontIdleRest } };
      break;
    }
    case 143: {
      // prep25 Q2 / prep28: Sky Attack charge (first body: WIN0 (240, 161) is the battle's first-body reset) and strike (turn bit 1, 180 rows,
      // WIN0 (0, 0) after the charge). The order host keys the strike 10143 (request.turn), so the tracker lends the strike its own free order.
      const strike = (request.turn & 1) === 1;
      if (!spriteOrderInput?.known || (!strike && !spriteOrderInput.firstBody)) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SKY_ATTACK", body: strike ? "unleash" : "setup", attacker, target, fieldProfile, animationInputs: liveSkyAttackInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder, firstBody: !strike,
        impactPalette: (paletteResources.resources as Record<string, { colors: readonly number[] }>).ANIM_TAG_IMPACT!.colors,
        birdPalette: skyAttackAsset.bird.palette.map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10) }) as never };
      break;
    }
    case 155: {
      // prep29 R1: Bonemerang. Hit 1 is the first body (S0 registers); hit 2 only directly after a first-body hit 1 (a later body declines).
      if (!spriteOrderInput?.known || (spriteOrderInput.firstBody !== true && spriteOrderInput.afterBonemerangHit1 !== true)) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "BONEMERANG", attacker, target, fieldProfile, animationInputs: liveBonemerangInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes: undefined as never, spriteOrder: lentOrder,
        firstBody: spriteOrderInput.firstBody === true }) as never };
      break;
    }
    case 229: {
      // prep29 R1 / B.3: Rapid Spin. The spin sprite is at the attacker's battle-position centre, the hit splat at the target's picture offset point.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const { targetSide: _targetSide, gameplayRng: _gameplayRng, ...inputs } = liveRapidSpinInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, spriteOrder: lentOrder,
        movePower: request.power, moveDamage: request.damage }) as Record<string, unknown>;
      config = { move: "RAPID_SPIN", fieldProfile,
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: attackerAnchors.battlePositionCenter } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: targetAnchors.picOffsetPoint } },
        animationInputs: inputs as never };
      break;
    }
    case 200: {
      // prep29 R1 / B.6: Outrage, first body only (the S0 registers; a later body declines).
      if (spriteOrderInput?.known !== true || spriteOrderInput.firstBody !== true) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const { attackerPictureOrigin, targetPictureOrigin, ...inputs } = liveOutrageInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder,
        smallEmberPalette: (paletteResources.resources as Record<string, { colors: readonly number[] }>).ANIM_TAG_SMALL_EMBER!.colors }) as Record<string, any>;
      config = { move: "OUTRAGE", fieldProfile,
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: attackerPictureOrigin } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: targetPictureOrigin } },
        animationInputs: inputs as never };
      break;
    }
    case 183: {
      // D4a faithful timing: Mach Punch, first body only (prep25 B.5: WIN0 (240, 161) and the S0 BG3HOFS / blend registers in all four first bodies;
      // the trace / splat / fist slots are the known-entry lowest-free slots). The optional late lag is the timing policy's phase.
      if (spriteOrderInput?.known !== true || spriteOrderInput.firstBody !== true) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const machPunchInputs = liveMachPunchInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder, firstBody: true,
        healthbarPalette: (paletteResources as unknown as { initial: { healthbar: readonly number[] } }).initial.healthbar });
      if (machPunchInputs === null) return null;
      config = { move: "MACH_PUNCH", attacker, target, fieldProfile, animationInputs: machPunchInputs as never };
      break;
    }
    case 173: {
      // prep25 Q2 / prep28: Snore (the user is asleep, so a known lend exists only behind planned sleep bodies: Sleep Powder + the sleep status animations).
      // No first-body gate: the registers follow the body history (firstBody false once any unit ran).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SNORE", attacker, target, fieldProfile, animationInputs: liveSnoreInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder,
        firstBody: spriteOrderInput.firstBody === true, snoreZPalette: snoreAsset.snoreZ.palette as never }) as never };
      break;
    }
    case 328: {
      // prep25 Q2: Sand Tomb through the SandTombAnimationProfile builder (no register input); lent order + non-shiny.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SAND_TOMB", attacker, target, fieldProfile, animationProfile: liveSandTombProfile({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, spriteOrder: lentOrder,
        freeSpriteSlots: KNOWN_ENTRY_FREE_SPRITE_SLOTS }) as never, attackerIdleRest: attackerAnchors.frontIdleRest };
      break;
    }
    case 123: {
      // prep25 Q2: Smog. No WIN0 input (the BG control registers are S0 plus the monbg / split writes); lent order + non-shiny + composite.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "SMOG", attacker, target, fieldProfile, animationInputs: liveSmogInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder }) as never };
      break;
    }
    case 304: {
      // prep25 Q2: Hyper Voice. No register input; the lent order (any known history) and the assets-only composite are the inputs.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || lentOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      config = { move: "HYPER_VOICE", attacker, target, fieldProfile, animationInputs: liveHyperVoiceInputs({
        attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes, spriteOrder: lentOrder,
        attackerSpeciesId: art[attacker.geometry.side].species,
        thinRingPalette: (paletteResources.resources as Record<string, { colors: readonly number[] }>).ANIM_TAG_THIN_RING!.colors }) as never };
      break;
    }
    case 91: {
      // prep18 s1.1 (exact, no RNG). Setup is the battle's first body (the BG registers / scanline are the measured constant S0);
      // unleash follows a Dig setup with no unit since (host lend `afterDigSetup`: the post-setup order and BG state, scanline chained
      // from the setup reducer's end state). Anything else declines. Geometry from the anchors, every allocator/task/matrix field is the
      // measured constant shared by both corpora and the FLYGON/GOLEM alternates (both attacker sides).
      const unleash = (request.turn & 1) === 1;
      if (!spriteOrderInput || (unleash ? !spriteOrderInput.afterDigSetup : !spriteOrderInput.firstBody)) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const playerAttacker = attacker.geometry.side === "player";
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const ac = attackerAnchors.spriteCenter, tc = targetAnchors.spriteCenter;
      const elevation = art[attacker.geometry.side].origin.y - battleCommandFieldSpriteOrigin(art[attacker.geometry.side], attacker.geometry.side).y;
      const baseInputs = (body: "setup" | "unleash") => ({
        attackerElevationY: playerAttacker ? 80 : 40 - elevation,
        targetAnimationOrigin: { x: tc.x, y: tc.y + (playerAttacker ? 0 : 8) },
        attackerInitialOffset: { x: attackerAnchors.frontIdleRest.x2, y: attackerAnchors.frontIdleRest.y2 },
        targetInitialOffset: { x: targetAnchors.frontIdleRest.x2, y: targetAnchors.frontIdleRest.y2 },
        attackerSpriteSlot: playerAttacker ? 6 : 8, targetSpriteSlot: playerAttacker ? 8 : 6,
        attackerSubpriority: playerAttacker ? 30 : 40, targetSubpriority: playerAttacker ? 40 : 30,
        attackerInitialVisible: body === "setup", targetInitialVisible: true,
        attackerInitialMatrixNum: 0, targetInitialMatrixNum: 0,
        attackerCleanupMatrixNum: playerAttacker ? 1 : 2, targetCleanupMatrixNum: playerAttacker ? 2 : 1,
        attackerInitialMatrix: [256, 0, 0, 256] as const, targetInitialMatrix: [256, 0, 0, 256] as const,
        moundSlots: [3, 4] as const, plumeSlots: body === "setup" ? [5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10, 5, 7, 9, 10] : [],
        impactSpriteSlot: body === "setup" ? 0 : 5, impactMatrixNum: 0, moundMatrixNum: 0, plumeMatrixNum: 0,
        digTaskSlot: 0, updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 2, shakeTaskSlot: 0,
        spriteOrder: lentOrder,
        mudSand: { tileSlot: 6, paletteBank: 7, tileRange: [305, 5] as const },
        dirtMound: { tileSlot: 7, paletteBank: 8, tileRange: [body === "setup" ? 310 : 321, 16] as const },
        impact: { tileSlot: 6, paletteBank: 7, tileRange: [305, 16] as const },
        initialMatrixBitmap: 6,
        setupBgOffset: { x: 32 - ac.x, y: 32 - ac.y },
        monBg: { layer: playerAttacker ? "bg2" as const : "bg1" as const, layerId: playerAttacker ? 6 : 8,
          snapshot: { x: ac.x, y: 160 }, baseScroll: { x: 32 - ac.x, y: -128 },
          activeCnt: playerAttacker ? 0x5e02 : 0x5c02,
          inactiveCnt: body === "unleash" ? (playerAttacker ? 0x5e02 : 0x5c02) : playerAttacker ? 0x5e00 : 0x9c00 },
        animationRngSeed: 0,
      });
      const withBattlers = {
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: ac, battlePositionCenter: ac } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: baseInputs("setup").targetAnimationOrigin, battlePositionCenter: tc } },
      };
      // First-body scanline S0 (prep18 s1.1: bank 0 = 80 x +2, 80 x -2, then zeros; bank 1 zero; equal in every measured scenario).
      const setupScanline = { srcBuffer: 1 as const, state: 0 as const, dmaDest: 67108892, dmaControl: 2724200449,
        buffers: [[...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)], Array(320).fill(0)] as [number[], number[]] };
      const setupInputs = { ...baseInputs("setup"), initialScanline: setupScanline };
      let initialScanline = setupScanline;
      if (unleash) {
        // The unleash root scanline is exactly the setup reducer's state at its first inactive row (prep18-dig-chain.json).
        const end = digAtAge(194, { ...setupInputs, body: "setup", attackerSide: attacker.geometry.side, targetSide: target.geometry.side,
          attackerSpecies: attacker.species, targetSpecies: target.species, attackerCenter: ac, targetCenter: tc } as never).scanline;
        initialScanline = { srcBuffer: end.srcBuffer, state: end.state as 0, dmaDest: end.dmaDest, dmaControl: end.dmaControl,
          buffers: [[...end.buffers[0]!], [...end.buffers[1]!]] } as never;
      }
      config = { move: "DIG", body: unleash ? "unleash" : "setup", ...withBattlers,
        fieldProfile: { ...fieldProfile, playerStatus: "none" as const },
        animationInputs: { ...baseInputs(unleash ? "unleash" : "setup"), initialScanline } as never };
      break;
    }
    case 189: case 28: {
      // prep17 s0.2 (faithful random): 30 dirt sprites x (xWord, yWord) from the host's six 10-word rows. Source = the attacker's
      // pic point + (+-15, +15), destination = the target's pic point + the AnimDirtScatter offsets (both are the anchors the
      // production field already provides); steps = InitAnimLinearTranslation over 20 frames. Slots = lowest-free over the
      // computed lifetimes (two transient slot-3 helpers). The lent order is the activation order (Sand) / the pre-wave-1
      // order (Mud: the transients swap slots 4/3), identical across bodies. Unknown tracked order -> null.
      const draws = liveMovePresentationRngWords(presentationRngInput)?.draws;
      if (draws === undefined || draws.length !== 6 || draws.some((row) => row.length !== 10) || !spriteOrderInput?.known) return null;
      const lentOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (lentOrder === null) return null;
      const mud = request.moveId === 189;
      let spriteOrderSeed: readonly number[] = lentOrder;
      if (mud) {
        const at = lentOrder.indexOf(4);
        if (lentOrder[at + 1] !== 3) return null;
        spriteOrderSeed = lentOrder.map((slot, index) => index === at ? 3 : index === at + 1 ? 4 : slot);
      }
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const playerAttacker = attacker.geometry.side === "player";
      const source = { x: attackerAnchors.picOffsetPoint.x + (playerAttacker ? 15 : -15), y: attackerAnchors.picOffsetPoint.y + 15 };
      const words = draws.flat();
      const slots = dirtScatterSlots(mud ? [[4, 8], [9, 11]] : [[7, 11], [12, 14]], mud ? 9 : 12, [0, 1, 2, 6, 8, 60, 61, 62, 63]);
      const seeds = slots.map((slot, i) => ({ slot,
        xStep: linearTranslationStep(targetAnchors.picOffsetPoint.x + dirtScatterOffsetFromWord(words[2 * i]!) - source.x, 20),
        yStep: linearTranslationStep(targetAnchors.picOffsetPoint.y + dirtScatterOffsetFromWord(words[2 * i + 1]!) - source.y, 20) }));
      const common = { attacker, target, animationAgeOffset: mud ? 42 : 43, moveTextStartAge: 0,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" as const } };
      config = mud
        ? { move: "MUD_SLAP", ...common, animationProfile: { mud: seeds, spriteOrderSeed } }
        // The accuracy banner and result text are controller-owned HUD after the 58-row body (never-reached ages here).
        : { move: "SAND_ATTACK", ...common, animationProfile: { dirt: seeds, spriteOrderSeed },
            controllerProfile: { accuracyStageBefore: 0, accuracyStageAfter: 0, resultTextFirstAge: 1_000_000, currentMoveResetAge: 1_000_000 } };
      break;
    }
    case 240: {
      // prep14 s1.1 (faithful random): the reducer replays its own 160 draws from one number, the host state at the body's
      // activation frame; the plan registered with the host (liveMovePresentationRng.ts) consumes them once. The
      // in-use slot set is the known-entry constant; the palette arrays are not consumed by the compositor.
      const words = liveMovePresentationRngWords(presentationRngInput);
      if (words === null) return null;
      config = { move: "RAIN_DANCE", attacker, target, fieldProfile,
        animationProfile: { animationRngAtAge0: words.activationValue, occupiedSpriteSlots: KNOWN_ENTRY_IN_USE_SPRITE_SLOTS,
          unfadedPaletteBeforeLoad: UNCONSUMED_PALETTE, fadedPaletteBeforeLoad: UNCONSUMED_PALETTE,
          hardwarePaletteAtAge0: UNCONSUMED_PALETTE, unfadedPaletteAfterLoad: UNCONSUMED_PALETTE,
          fadedPaletteAfterLoad: UNCONSUMED_PALETTE } };
      break;
    }
    case 352: {
      // prep14 s1.2 (faithful random, first-body order lent): geometry from the anchors (sprite centres, picture offsets), the
      // monbg snapshot from the target's source sprite centre + idle x2, allocator constants equal 3/3 scenarios + both corpora.
      const words = liveMovePresentationRngWords(presentationRngInput);
      if (words === null || !spriteOrderInput?.known) return null;
      const initialOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (initialOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const playerAttacker = attacker.geometry.side === "player";
      const snapshot = { x: targetAnchors.spriteCenter.x + targetAnchors.frontIdleRest.x2, y: targetAnchors.spriteCenter.y };
      config = { move: "WATER_PULSE", attacker: affineCenterBattler(attacker), target: affineCenterBattler(target), fieldProfile,
        animationInputs: {
          targetPictureCenter: targetAnchors.picOffsetPoint, attackerRingOrigin: attackerAnchors.picOffsetPoint,
          targetRingCenter: targetAnchors.picOffsetPoint,
          attackerSpriteSlot: playerAttacker ? 6 : 8, targetSpriteSlot: playerAttacker ? 8 : 6,
          attackerSubpriority: playerAttacker ? 30 : 40, targetSubpriority: playerAttacker ? 40 : 30,
          targetInitialOffset: { x: targetAnchors.frontIdleRest.x2, y: targetAnchors.frontIdleRest.y2 },
          simplePaletteSpriteSlot: 3, smallBubbleSlots: [4, 5, 7, 9, 10], ringSlots: [3, 4, 5],
          ringBubbleSlots: [7, 9, 10, 11, 12, 13, 14, 15, 7, 9, 3, 10], ringMatrixSlots: [0, 3, 4],
          ringBubbleMatrixSlots: [5, 6, 7, 8, 9, 10, 11, 12, 5, 6, 0, 7],
          smallBubbles: { tileSlot: 6, paletteBank: 7, tileRange: [305, 10] }, blueRing2: { tileSlot: 7, paletteBank: 8, tileRange: [315, 8] },
          updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, shakeTaskSlot: 0,
          monBg: { layer: playerAttacker ? "bg1" : "bg2", layerId: playerAttacker ? 8 : 6, snapshot,
            baseScroll: { x: 32 - snapshot.x, y: 32 - snapshot.y },
            // Task_UpdateMonBg's BGCNT writes; inactiveCnt is the first-body activation value (prep14 s1.2/1.4).
            activeCnt: playerAttacker ? 0x5c02 : 0x5e02, inactiveCnt: playerAttacker ? 0x9c00 : 0x5e00 },
          initialMatrixBitmap: 0x6, spriteOrder: initialOrder, animationRngSeed: words.activationValue } };
      break;
    }
    case 258: {
      // prep14 s1.7 (exact, no RNG): the ten-entry sHailCoordData table from GenerateHailParticle (battle_anim_ice.c:1414-1470) with
      // the anchors. `animationRngAtAge0` only seeds the reducer's per-age echo (no pixel consumer, proven by test): 0.
      const targets = HAIL_COORD_DATA.map(([x, y, position, type]) => {
        let targetX: number = x, targetY: number = y, impact = false;
        const side = position === 0 ? "player" as const : position === 1 ? "opponent" as const : null;
        if (type !== 0 && side !== null) {
          impact = true;
          const anchors = liveBattlerAnchors(side, art, battlerX2Input), attrs = liveBattlerCoordAttrs(side, art);
          // BATTLER_COORD_X_2 at generation time carries no idle x2 (front idle x2 is 0 by age ~45; prep14 s1.7).
          targetX = anchors.picOffsetPoint.x; targetY = anchors.picOffsetPoint.y;
          const dx = Math.trunc(attrs.width / 6), dy = Math.trunc(attrs.height / 6);
          if (type === 1) { targetX -= dx; targetY -= dy; } else { targetX += dx; targetY += dy; }
        }
        return { targetX, targetY, initialX: targetX - Math.trunc((targetY + 8) / 2), initialY: -8 as const, impact };
      }) as unknown as HailProfile["targets"];
      config = { move: "HAIL", attacker, target, fieldProfile,
        animationProfile: { animationRngAtAge0: 0, occupiedSpriteSlots: KNOWN_ENTRY_IN_USE_SPRITE_SLOTS,
          occupiedAffineMatrixSlots: [1, 2], targets,
          unfadedPaletteBeforeLoad: UNCONSUMED_PALETTE, fadedPaletteBeforeLoad: UNCONSUMED_PALETTE,
          hardwarePaletteAtAge0: UNCONSUMED_PALETTE, unfadedPaletteAfterHailLoad: UNCONSUMED_PALETTE,
          fadedPaletteAfterHailLoad: UNCONSUMED_PALETTE, unfadedPaletteAfterCrystalLoad: UNCONSUMED_PALETTE,
          fadedPaletteAfterCrystalLoad: UNCONSUMED_PALETTE } };
      break;
    }
    case 244: case 315: case 318: {
      // prep16 s0.3 + lb21: Overheat, Silver Wind and Psych Up (either side) need only a known order lend: their compositors never
      // read the activation BG registers (each read field is overwritten by the reducer first; later-bodies-bg-receipt.json,
      // docs/later-bodies-overheat-psychup.md), dense-exact after Tackle/Splash/Psychic/Growl+stat/Swords Dance+stat. A later
      // Overheat after an earlier Overheat has no order plan, so `known` declines it. Non-shiny (no shiny battle palette).
      // Everything else is the measured first-body constant set (liveBgSnapshotMoves.ts) + anchors + the assets-only composite.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      if (palettes === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const args = { attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors, palettes };
      if (request.moveId === 244) {
        const inputs = livePsychUpInputs(args);
        const order = spriteOrderWithOccupiedPrefix(
          { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
        if (inputs === null || order === null) return null;
        config = { move: "PSYCH_UP", attacker, target, fieldProfile, animationInputs: { ...inputs, spriteOrder: order } as never };
      } else if (request.moveId === 315) {
        const inputs = liveOverheatInputs(args);
        const order = spriteOrderWithOccupiedPrefix(
          { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
        if (inputs === null || order === null) return null;
        config = { move: "OVERHEAT", attacker, target, fieldProfile,
          animationInputs: { ...inputs, allocator: { ...inputs.allocator, spriteOrder: order } } as never };
      } else {
        // The sparkle slots/order are the known-entry constants: the lend must leave exactly the known-entry occupancy.
        if (spriteOrderWithOccupiedPrefix({ known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] },
          KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) === null) return null;
        const { attackerPictureOrigin, targetPictureOrigin, ...inputs } = liveSilverWindInputs(args);
        // The accepted compositor fit: effect pictures centre on the picture origin and the age-0 enemy shadow draws at
        // battlePositionCenter - 1 (generic shadow y 40 + 1 on the opponent side).
        const withOrigin = (battler: SceneOnPresentationBattler, origin: { x: number; y: number }): SceneOnPresentationBattler => ({
          ...battler, geometry: { ...battler.geometry, animationCenter: origin,
            battlePositionCenter: battler.geometry.side === "player" ? origin : { x: 176, y: 41 } } });
        config = { move: "SILVER_WIND", attacker: withOrigin(attacker, attackerPictureOrigin),
          target: withOrigin(target, targetPictureOrigin), fieldProfile, animationInputs: inputs as never };
      }
      break;
    }
    case 261: {
      // oam1 (prep20 s1.1 + G1): the display plan decodes a hardware-OAM buffer, built here by the production assembler from the
      // anchors, the known-entry allocator/scene constants and the lent activation order carried through the body (full 64-slot
      // SortSprites, dummy keys for free slots). First body only: the known-entry occupancy, allocator slots and the unfaded
      // composite palette are proven there (every dense fixture); non-shiny (no shiny battle palette); zero idle rests. Later bodies
      // (any known lend) are exact too: 12/12 lb26 fixtures after Tackle / Splash / Psychic / Growl+unit / Swords Dance+unit / Surf, both
      // sides (docs/later-bodies-curse-oam.md; the unfaded palette / known-entry allocator hold across those predecessors).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveWillOWispInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder, orbPalette: willOWispAsset.orb.palette, firePalette: willOWispAsset.fire.palette,
        laterBody: !spriteOrderInput.firstBody,
        timeline: (a, t) => willOWispTimeline(attacker.geometry.side, a, t),
        spritesAt: (state, a, t) => willOWispSpritesAtAge(state, { attackerSide: attacker.geometry.side, attackerCenter: a, targetCenter: t }) });
      if (inputs === null) return null;
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center } });
      config = { move: "WILL_O_WISP", attacker: withCenter(attacker, inputs.attackerCenter), target: withCenter(target, inputs.targetCenter),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 174: {
      // curse-live (prep23 s1.3/s3): the non-Ghost body (request.turn & 1, the gAnimMoveTurn choosetwoturnanim reads). Hardware OAM
      // from the assembler over the lent order (any known lend: the renderer reads no activation BG register the body does not
      // overwrite, and the only move sprite is the OBJ-window copy in the lowest free slot); tasks / registers / BG scroll /
      // palette from curseModel.ts; non-shiny (no shiny battle palette); zero idle rests (liveCurseStatsInputs).
      if ((request.turn & 1) !== 1 || !spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveCurseStatsInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        free: spriteOrderInput.free, sort: sortGbaSpriteOrder,
        model: { rows: CURSE_STATS_ROWS, tasksAt: curseStatsTasksAt, registersAt: curseStatsRegistersAt, battleBgAt: curseStatsBattleBgAt,
          paletteAt: curseStatsPaletteAt, spritesAt: curseStatsSpritesAt } });
      if (inputs === null) return null;
      // The CURSE seam centres are the battler sprite centres (gSprites x / y, as the staged seam); the renderer reads geometry only
      // for the age-0 enemy shadow (battlePositionCenter.y - (attr0 y - 8) = the shadow's y 40).
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center, battlePositionCenter: center } });
      config = { move: "CURSE", attacker: withCenter(attacker, attackerAnchors.spriteCenter),
        target: withCenter(target, targetAnchors.spriteCenter), fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 228: {
      // oam1 (prep20 s1.2): normal body only (request.turn & 1 = 0), first body (known-entry allocator: IMPACT slot 3 / matrix 0 /
      // tile 305 / palette slot 7; S0 BG state under the BG_DARK fade), non-shiny, zero idle rests. Hardware OAM + matrices from
      // the assembler; palette / BLDY / monbg / shake registers from the source schedule (liveOamMoves.ts livePursuitInputs).
      if ((request.turn & 1) !== 0 || !spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = livePursuitInputs({ attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors,
        palettes, activationOrder, movePower: request.power, sort: sortGbaSpriteOrder,
        targetOffsetAt: (state, power) => pursuitTargetOffsetAtAge(state, power, { x: 0, y: 0 }) });
      if (inputs === null) return null;
      config = { move: "PURSUIT", attacker,
        target: { ...target, geometry: { ...target.geometry, battlePositionCenter: inputs.impactCenter } },
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 210: {
      // oam1 (prep20 s1.3): counter-1 body only. No counter reaches the request (MOVE_ANIMATION carries none for 210), but a
      // first body implies it: furyCutterCounter starts at 0 for a sent-in battler, a successful Fury Cutter always plays its
      // body (so none ran before) and a miss resets it; Cmd_furycuttercalc then sets 1. Counters 2..5 are never first bodies
      // and also need the gComplexPaletteBlend palette provider: they decline. Non-shiny, zero idle rests.
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveFuryCutterInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        counter: 1, sort: sortGbaSpriteOrder });
      if (inputs === null) return null;
      config = { move: "FURY_CUTTER", attacker, target, fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 216: {
      // Return (prep24 s2): the strongest branch only (every Factory mon has friendship 255, so no request plumbing). First body (known-entry
      // allocator: IMPACT slot 3.., matrices free from 0; S0 BG state), non-shiny; the oam1 idle-rest convention (the model handles the
      // target's non-zero idle rest, proven on ONIX / GOLEM; the attacker's rest is replaced by the dip y2 and proven zero-or-handled).
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveReturnInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder });
      if (inputs === null) return null;
      config = { move: "RETURN", attacker, target, fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 276: {
      // D4 faithful timing: Superpower (prep31 s1 / s3; liveSuperpowerInputs.ts). Known lend (the prep31 WEEZING player window follows a Tackle:
      // the renderer branch reads only registers the body writes, as Revenge), known-entry allocator (orb / meteor / rock tiles 305 / 537 / 433,
      // banks 7 / 8 / 9, matrix 0), non-shiny, zero idle rests. The monbg write row (10 | 11) is the policy's, per side.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      const monbgCntRow = liveMoveBgWriteRow(276, attacker.geometry.side);
      if (palettes === null || activationOrder === null || (monbgCntRow !== 10 && monbgCntRow !== 11)) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveSuperpowerInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes,
        orbPalette: SUPERPOWER_PALETTES.orb, meteorPalette: SUPERPOWER_PALETTES.meteor, rockPalette: SUPERPOWER_PALETTES.rock,
        activationOrder, sort: sortGbaSpriteOrder, monbgCntRow });
      if (inputs === null) return null;
      config = { move: "SUPERPOWER", attacker, target, fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 255: {
      // Spit Up (prep31 s3): every Stockpile counter (request.turn 1..3), any known lend (the bodies follow Stockpile / Growl units; the
      // host's lent 64-slot order is the L input), known-entry allocator, non-shiny, zero idle rests. Registers never change (prep31 s2.1).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveSpitUpInputs({ counter: request.turn as SpitUpCounter, attackerSide: attacker.geometry.side,
        attackerSpecies: art[attacker.geometry.side].speciesSymbol, targetSpecies: art[target.geometry.side].speciesSymbol,
        attacker: attackerAnchors, target: targetAnchors, attackerYDelta: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset,
        palettes, redOrbPalette: SPIT_UP_RED_ORB_PALETTE, activationOrder, sort: sortGbaSpriteOrder });
      if (inputs === null) return null;
      config = { move: "SPIT_UP", attacker, target, fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 224: {
      // D4b faithful timing: Megahorn (prep24 s1.4; liveOamMoves.ts liveMegahornInputs). Known lend (the corpora follow a Tackle; any known lend:
      // the renderer branch reads no activation register the body does not overwrite), known-entry allocator (horn / impact tiles 305 / 313,
      // palette slots 7 / 8, matrices 0 / 3), non-shiny, the attacker's idle rest zero. Both CPU-phase bits come from the timing policy.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveMegahornInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder, hornPalette: megaHornAsset.hornHit2.palette, drillPalette: hornDrillAsset.drill.palette,
        endLate: liveMoveOptionalLagAge(224) !== null, monbgCntRow: liveMoveBgWriteRow(224) as 7 | 8 });
      if (inputs === null) return null;
      config = { move: "MEGAHORN", attacker, target, fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 351: {
      // Shock Wave (prep33 s1 / s3 item 1; liveOamMoves.ts liveShockWaveInputs). Any known lend (the lent 64-slot order is the L input), known-entry
      // allocator (orb / circle / spark / lightning tiles 305 / 537 / 309 / 601), non-shiny, zero idle rests (the attacker's monbg origin and the
      // target ShakeMon x2 start from the sprite centre). The reducer derives its timing from the seam geometry (shockWaveTimingFor).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const zeroRest = (a: typeof attackerAnchors) => a.frontIdleRest.x2 === 0 && a.frontIdleRest.y2 === 0;
      if (!zeroRest(attackerAnchors) || !zeroRest(targetAnchors)) return null;
      const rgb555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
      const resourcePalette = (name: "circleOfLight" | "electricOrbs" | "spark" | "lightning") =>
        (shockWaveAsset as unknown as { art: Record<string, { palette: { r: number; g: number; b: number }[] }> }).art[name]!.palette.map(rgb555);
      const animationInputs = liveShockWaveInputs({ attackerSide: attacker.geometry.side, opponentSpecies: art.opponent.speciesSymbol,
        attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        resourcePalettes: { circleOfLight: resourcePalette("circleOfLight"), electricOrbs: resourcePalette("electricOrbs"),
          spark: resourcePalette("spark"), lightning: resourcePalette("lightning") } });
      // The SHOCK_WAVE seam: animationCenter = X_2 / Y_PIC_OFFSET (picture origins), the target's battlePositionCenter = the plain
      // BATTLER_COORD_Y (no elevation; the lightning count), the corner = sprite centre - 32.
      const withGeometry = (battler: SceneOnPresentationBattler, anchors: typeof attackerAnchors, position: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, spriteCorner: { x: anchors.spriteCenter.x - 32, y: anchors.spriteCenter.y - 32 },
          animationCenter: anchors.picOffsetPoint, battlePositionCenter: position } });
      config = { move: "SHOCK_WAVE", attacker: withGeometry(attacker, attackerAnchors, attackerAnchors.picOffsetPoint),
        target: withGeometry(target, targetAnchors, { x: targetAnchors.picOffsetPoint.x, y: targetAnchors.battlePositionCenter.y }),
        fieldProfile, animationInputs: animationInputs as never };
      break;
    }
    case 171: {
      // Faithful timing: Nightmare (prep32 s1 / s3; liveOamMoves.ts liveNightmareInputs). Any known lend (Nightmare needs a sleeping target, so it
      // always follows an earlier body: the Hypnosis + SLP status history changes only the free tail, the occupied part equals the known entry;
      // the tracker's carried free order makes the 64-slot order exact), known-entry allocator (the clone takes slot 3), non-shiny, zero idle
      // rests (the ShakeMon x2 program starts from 0). Both CPU-phase bits come from the timing policy (lag at 149; BG-palette restore row).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      const restoreRow = liveMovePaletteTransferRow(171);
      if (palettes === null || activationOrder === null || (restoreRow !== 148 && restoreRow !== 149)) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const zeroRest = (a: typeof attackerAnchors) => a.frontIdleRest.x2 === 0 && a.frontIdleRest.y2 === 0;
      if (!zeroRest(attackerAnchors) || !zeroRest(targetAnchors)) return null;
      const inputs = liveNightmareInputs({ attackerSide: attacker.geometry.side, attacker: attackerAnchors, target: targetAnchors,
        attackerSpeciesId: field[attacker.geometry.side].species, targetSpeciesId: field[target.geometry.side].species, palettes, activationOrder,
        sort: sortGbaSpriteOrder, phase: { lag149: liveMoveOptionalLagAge(171) === 149, restoreRow } });
      // The NIGHTMARE seam centres are the battler sprite centres (gSprites x / y; the reducer's picture origins); the corner is centre - 32.
      const withCenter = (battler: SceneOnPresentationBattler, anchors: typeof attackerAnchors): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, spriteCorner: { x: anchors.spriteCenter.x - 32, y: anchors.spriteCenter.y - 32 },
          animationCenter: anchors.spriteCenter, battlePositionCenter: anchors.battlePositionCenter } });
      config = { move: "NIGHTMARE", attacker: withCenter(attacker, attackerAnchors), target: withCenter(target, targetAnchors),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 149: {
      // D4c faithful timing: Psywave (prep30 s2 / s3; liveOamMoves.ts livePsywaveInputs). Known lend (the accepted player body is a first body,
      // the accepted opponent follows a Tackle), known-entry allocator (BLUE_RING tile 305, palette slot 7, matrices 1 / 2 held), non-shiny.
      // Psywave never moves a battler: the ring origin / destination are the X_2 / Y_PIC_OFFSET coordinates (not the sprite position), and the
      // battler OBJ keeps its idle rest (battlerObject; the accepted ONIX opponent target rests at a non-zero x2 / y2). The late lag is the policy's.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = livePsywaveInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder, lateLag: liveMoveOptionalLagAge(149) !== null });
      // The PSYWAVE seam centres: battlePositionCenter = X_2 / Y_PIC_OFFSET (ring origin / destination), animationCenter = the sprite centre.
      const withCenters = (battler: SceneOnPresentationBattler, anchors: typeof attackerAnchors): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: anchors.spriteCenter, battlePositionCenter: anchors.picOffsetPoint } });
      config = { move: "PSYWAVE", attacker: withCenters(attacker, attackerAnchors), target: withCenters(target, targetAnchors),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 260: {
      // S10A faithful random: Flatter (prep35 s2 / s3 item 2; liveOamMoves.ts liveFlatterInputs). The 114 confetti words from the presentation
      // host only (null = not activated -> scene-off fallback). First body (the activation registers are S0, WIN0 240 / 161), known lend,
      // known-entry allocator (spotlight 305 / confetti 433, palette slots 7 / 8), non-shiny. An elevated opponent declines: its row-0 shadow
      // (the pre-activation latch) is unmeasured for Flatter (prep35 s4).
      const rng = liveMovePresentationRngWords(presentationRngInput);
      if (rng === null || rng.words.length !== 114) return null;
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      if (art.opponent.origin.y !== battleCommandFieldSpriteOrigin(art.opponent, "opponent").y) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const attackerSide = attacker.geometry.side, targetSide = target.geometry.side;
      const asset = flatterAsset as unknown as Record<"spotlight" | "confetti", { palette: { r: number; g: number; b: number }[] }>;
      const inputs = liveFlatterInputs({ attackerSide, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder, words: rng.words, animationRng: rng.activationValue,
        spotlightPalette: asset.spotlight.palette, confettiPalette: asset.confetti.palette,
        stateAt: (state, programInput) => {
          const st = flatterAtAge(state, { ...(programInput as unknown as FlatterLiveInputs), attackerSide, targetSide,
            attackerSpecies: art[attackerSide].speciesSymbol, targetSpecies: art[targetSide].speciesSymbol });
          return { spotlight: st.spotlight, verticalDipSlots: st.verticalDips.map((d) => d.slot), confetti: st.confetti,
            targetDipY2: st.battlers.target.offset.y2 - targetAnchors.frontIdleRest.y2 };
        } });
      if (inputs === null) return null;
      // The FLATTER view rebuilds attackerCenter / targetCenter from geometry.animationCenter (prep35 papercut): set them to the live anchors
      // (attacker sprite centre, target BATTLER_COORD_X / _Y), as verifyFlatterReducer.ts flatterConfigFor.
      const withCenter = (battler: SceneOnPresentationBattler, c: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, spriteCorner: { x: c.x - 32, y: c.y - 32 }, animationCenter: c, battlePositionCenter: c } });
      config = { move: "FLATTER", attacker: withCenter(attacker, inputs.attackerCenter), target: withCenter(target, inputs.targetCenter),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 285: {
      // S10A faithful timing: Skill Swap (prep35 s1 / s3 item 1; liveOamMoves.ts liveSkillSwapInputs). Known lend (the lent 64-slot order is the
      // L input; every measured window is a first body), known-entry allocator (BLUEGREEN_ORB tile 305, palette slot 7, orb (slot, matrix) pairs
      // over the known entry), non-shiny, zero idle rests (the battler OBJ and the trajectory bounds are the rest-free sprite / pic points).
      // Both CPU-phase bits come from the timing policy (lag at 176; the display-neutral bank-2 restore row).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      const restoreRow = liveMovePaletteTransferRow(285);
      if (palettes === null || activationOrder === null || restoreRow === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const zeroRest = (a: typeof attackerAnchors) => a.frontIdleRest.x2 === 0 && a.frontIdleRest.y2 === 0;
      if (!zeroRest(attackerAnchors) || !zeroRest(targetAnchors)) return null;
      const attackerSide = attacker.geometry.side, targetSide = target.geometry.side;
      const rgb555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
      const inputs = liveSkillSwapInputs({ attackerSide, attacker: attackerAnchors, target: targetAnchors,
        attackerPicSize: liveBattlerCoordAttrs(attackerSide, art), targetPicSize: liveBattlerCoordAttrs(targetSide, art), palettes, activationOrder,
        sort: sortGbaSpriteOrder, orbPalette: (skillSwapOrbAsset as unknown as { orb: { palette: { r: number; g: number; b: number }[] } }).orb.palette.map(rgb555),
        orbsAt: (state, programInput) => skillSwapAtAge(state, { ...(programInput as unknown as SkillSwapLiveInputs), attackerSide, targetSide,
          attackerSpecies: "", targetSpecies: "" }).orbs,
        lag: liveMoveOptionalLagAge(285) === 176, restoreRow });
      // The SKILL_SWAP seam centres are the battler sprite centres; the corner is centre - 32 (the branch draws the battlers from the OAM).
      const withCenter = (battler: SceneOnPresentationBattler, anchors: typeof attackerAnchors): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, spriteCorner: { x: anchors.spriteCenter.x - 32, y: anchors.spriteCenter.y - 32 },
          animationCenter: anchors.spriteCenter, battlePositionCenter: anchors.battlePositionCenter } });
      config = { move: "SKILL_SWAP", attacker: withCenter(attacker, attackerAnchors), target: withCenter(target, targetAnchors),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 326: {
      // D4c faithful timing: Extrasensory (prep30 s1 / s3; liveOamMoves.ts liveExtrasensoryInputs). The scanline buffers at activation are history
      // (the battle intro's residue): only the battle's FIRST animation unit is proven to start from them (every measured window is a first body),
      // so a later body declines (an earlier scanline body may have left other buffers). Known-entry allocator, non-shiny, zero target idle rest.
      if (!spriteOrderInput?.known || !spriteOrderInput.firstBody) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveExtrasensoryInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors,
        attackerPictureHeight: pictureHeight(attacker.geometry.side), palettes, activationOrder, sort: sortGbaSpriteOrder,
        lateLag: liveMoveOptionalLagAge(326) !== null });
      if (inputs === null) return null;
      // The EXTRASENSORY seam centres are the battler sprite centres (gSprites x / y).
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center, battlePositionCenter: center } });
      config = { move: "EXTRASENSORY", attacker: withCenter(attacker, attackerAnchors.spriteCenter), target: withCenter(target, targetAnchors.spriteCenter),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 279: {
      // D4b faithful timing: Revenge (prep26 s2 / s4; liveOamMoves.ts liveRevengeInputs). Known lend (the accepted bodies are first bodies, the
      // alternates follow a Tackle), known-entry allocator, non-shiny, a zero TARGET idle rest (an attacker rest is exact, species audit 9). The monbg BGnCNT write row comes from the timing policy.
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveRevengeInputs({ attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        sort: sortGbaSpriteOrder, scratchPalette: revengeScratchAsset.purpleScratch.palette, monbgCntRow: liveMoveBgWriteRow(279) as 4 | 5 });
      if (inputs === null) return null;
      // The REVENGE seam centres are the battler sprite centres (gSprites x / y), as the accepted seam.
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center, battlePositionCenter: center } });
      config = { move: "REVENGE", attacker: withCenter(attacker, attackerAnchors.spriteCenter), target: withCenter(target, targetAnchors.spriteCenter),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 309: {
      // D4b faithful timing + D3: Meteor Mash (prep17 s0.1). 48 mini twinkling stars, two presentation-host words each in spawn order
      // (miniTwinklingStarFromWords); the row-195 restore lag L from the timing policy. Non-shiny. Centres: the attacker's sprite centre, the
      // target's Y_PIC_OFFSET point (the accepted seam: opponent target = its sprite centre, player target = centre + 8).
      // The METEOR_MASH branch draws status-free healthboxes: a displayed status declines.
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      if ((field.player.status ?? "none") !== "none" || (field.opponent.status ?? "none") !== "none") return null;
      const words = liveMovePresentationRngWords(presentationRngInput)?.words;
      if (words === undefined || words.length !== 96) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center } });
      config = { move: "METEOR_MASH", attacker: withCenter(attacker, attackerAnchors.spriteCenter), target: withCenter(target, targetAnchors.picOffsetPoint),
        fieldProfile: { ...fieldProfile, playerStatus: "none" }, restoreLagRows: liveMoveOptionalLagAge(309) === null ? 0 : 1,
        twinkles: Array.from({ length: 48 }, (_, i) => {
          const star = miniTwinklingStarFromWords(words[2 * i]!, words[2 * i + 1]!);
          return { tile: star.tileOffset, y2: star.yOffset };
        }) };
      break;
    }
    case 291: {
      // Faithful timing with D3 (S10A; docs/next-adapters-prep25.md s0.2 / B.1 / B.1a / C): the Dive SETUP body (turn bit 0 = 0) after any known
      // lend with the known-entry occupancy; the attack body declines (its activation order is the setup droplets' words-dependent sort,
      // docs/s10a-random2-order-lend-blocker.md). The attacker stays hidden from setup age 10 across the turn gap (liveSemiInvulnerableHideBattler,
      // as Dig). Anchors (B.1a, 8/8): splash / droplets at battlePositionCenter, the ball at the attacker's Y_PIC_OFFSET point (reducer + 16).
      // Words from the presentation host only. The DIVE branch draws status-free healthboxes and unshaded battler art: a displayed status
      // or a shiny battler declines.
      if ((request.turn & 1) !== 0 || !spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      if ((field.player.status ?? "none") !== "none" || (field.opponent.status ?? "none") !== "none") return null;
      const words = liveMovePresentationRngWords(presentationRngInput)?.words;
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (words === undefined || words.length !== 20 || activationOrder === null) return null;
      const side = attacker.geometry.side;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const a = attackerAnchors, t = targetAnchors;
      const withCenter = (battler: SceneOnPresentationBattler, center: { x: number; y: number }): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: center } });
      config = { move: "DIVE", body: "setup", setupRow68ReusedAffine: liveMoveTimingParameter(291, "oam-transfer-row")?.chosen === "event", attacker: withCenter(attacker, a.spriteCenter), target: withCenter(target, t.spriteCenter),
        fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationGeometry: { attackerCenter: a.spriteCenter, targetCenter: t.spriteCenter,
          attackerPictureOffset: a.battlePositionCenter, targetPictureOffset: t.battlePositionCenter,
          attackerBallOffset: { x: a.battlePositionCenter.x, y: a.picOffsetPoint.y - 16 },
          attackerRestOffset: a.frontIdleRest, targetRestOffset: t.frontIdleRest },
        animationProfile: liveDiveSetupProfile(side, words, activationOrder, a.picOffsetPoint.y) };
      break;
    }
    case 301: {
      // Faithful timing + D3 (S10A; docs/next-adapters-prep26.md s1 / s4): Ice Ball counter 0 only (the first body of a chain; later counters
      // follow an earlier Ice Ball body whose words-dependent shard sort is the activation order: docs/s10a-random2-order-lend-blocker.md,
      // they decline). Hardware OAM / matrices / palettes / registers / tasks from liveIceBallInputs.ts over the lent order (any known lend
      // with the known-entry occupancy), the presentation host's words (2 per shard at step 37) and the policy's lag rows. Non-shiny.
      if (request.rolloutCounter !== 1 || !spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      const rng = liveMovePresentationRngWords(presentationRngInput);
      const palettes = composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol);
      const activationOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (rng === null || palettes === null || activationOrder === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art, battlerX2Input);
      const inputs = liveIceBallInputs({ counter: 0, attackerSide: attacker.geometry.side, attackerSpecies: art[attacker.geometry.side].speciesSymbol,
        targetSpecies: art[target.geometry.side].speciesSymbol, attacker: attackerAnchors, target: targetAnchors, palettes, activationOrder,
        words: rng.words, activationValue: rng.activationValue, lagRows: liveIceBallLagRows(), sort: sortGbaSpriteOrder,
        linear: { deltaQ8: linearTranslationDeltaQ8, offsetAfterCallbacks: linearTranslationOffsetAfterCallbacks },
        chunkPalette: iceBallAsset.chunk.palette, icePalette: icyWindAsset.background.palette });
      if (inputs === null) return null;
      // The ICE_BALL seam centres are the Y_PIC_OFFSET points (the chunk / shard anchors); the renderer reads battlePositionCenter only for
      // the age-0 enemy shadow (y - (attr0 y - 8)), so it is the battler sprite centre (shadow y 40), as the CURSE seam.
      const withCenter = (battler: SceneOnPresentationBattler, anchors: typeof targetAnchors): SceneOnPresentationBattler => ({
        ...battler, geometry: { ...battler.geometry, animationCenter: anchors.picOffsetPoint, battlePositionCenter: anchors.spriteCenter } });
      config = { move: "ICE_BALL", attacker: withCenter(attacker, attackerAnchors), target: withCenter(target, targetAnchors),
        fieldProfile, animationInputs: inputs.animationInputsAt(age) as never };
      break;
    }
    case 237: {
      // prep13 s1.3. The reducer is Unown-only (GENGAR controls show the eighth orb already initialised); every Factory
      // Hidden Power user is Unown. The attacker centre is GetBattlerSpriteCoord(Y_PIC_OFFSET) of the personality's LETTER-form
      // species (SPECIES_UNOWN_B.. coords), the only provider the base-species anchors lack; letters 26/27 are unproven -> null.
      if (attacker.species !== "UNOWN" || !spriteOrderInput?.known) return null;
      const personality = field[attacker.geometry.side].personality ?? 0;
      const form = hiddenPowerUnownFormIndex(personality);
      if (form >= 26) return null;
      const formKey = form === 0 ? "UNOWN" : `UNOWN_${String.fromCharCode(65 + form)}`;
      const side = attacker.geometry.side;
      const formCoords = (monPicCoordsData as unknown as Record<"back" | "front", Record<string, { width: number; height: number; yOffset: number }>>)[side === "player" ? "back" : "front"][formKey];
      if (formCoords === undefined) return null;
      // The art view derives the sprite origin from the species yOffset (fieldArtBattler): re-derive it for the form.
      const formArt = { ...art, [side]: { ...art[side], coords: formCoords,
        origin: { x: art[side].origin.x, y: art[side].origin.y - art[side].coords.yOffset + formCoords.yOffset } } } as typeof art;
      const center = liveBattlerAnchors(side, formArt, battlerX2Input).picOffsetPoint;
      // The sprite itself sits at the letter form's own origin too (BattleLoadMonSpriteGfx / GetBattlerSpriteDefault_Y read the form coords).
      const formOrigin = battleCommandFieldSpriteOrigin(formArt[side], side);
      const fullOrder = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (fullOrder === null) return null;
      // Orbit [3,4,5,7,9,10] + scatter [11..18]: lowest-free over the in-use set [0,1,2,6,8,60..63]; matrices first-free over 0x6.
      const slots = KNOWN_ENTRY_FREE_SPRITE_SLOTS.slice(0, 14);
      const matrices = [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      config = { move: "HIDDEN_POWER", attacker: { ...attacker, geometry: { ...attacker.geometry, spriteCorner: formOrigin, animationCenter: center } }, target, fieldProfile,
        animationProfile: { attackerSubpriority: side === "player" ? 30 : 40, targetSubpriority: side === "player" ? 40 : 30,
          allocationSlots: slots, spriteOrderSeed: fullOrder.filter(slot => slots.includes(slot)),
          orbitMatrixNums: matrices.slice(0, 6), scatterMatrixNums: matrices.slice(6),
          uninitializedScatterY: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).picOffsetPoint.y,
          attackerPersonality: personality, animationRngSeed: 0 } };
      break;
    }
    case 284: {
      // Eruption (prep36 s2; liveProfileMoves.ts liveEruptionProfile): the Spikes gates (known lend, non-shiny, the assets-only composite) plus a
      // zero attacker idle rest (the launch task zeroes x2: an idle-rest attacker misses rows 0-20 / one launch row, prep36 s1.4; CAMERUPT, the
      // only Factory user, rests at 0). No first-body gate: the branch reads no BG / WIN register (prep36 s1.1).
      if (!spriteOrderInput?.known) return null;
      if (liveBattlerIsShiny(field.player.personality) || liveBattlerIsShiny(field.opponent.personality)) return null;
      if (attackerAnchors.frontIdleRest.x2 !== 0 || attackerAnchors.frontIdleRest.y2 !== 0) return null;
      const order = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (order === null) return null;
      const animationProfile = liveEruptionProfileFor(field, attacker.geometry.side, order);
      if (animationProfile === null) return null;
      config = { move: "ERUPTION", attacker, target, fieldProfile, animationProfile: animationProfile as never };
      break;
    }
    case 323: {
      // prep13 s1.2: the 64-entry activation order is the lent order (known entry + tracked history), pixel-relevant for the
      // painter ties; an unknown tracked order is not proven -> null.
      if (!spriteOrderInput?.known) return null;
      const order = spriteOrderWithOccupiedPrefix(
        { known: true as const, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (order === null) return null;
      const animationInputs = waterSpoutLiveInputs(field, attacker.geometry.side, order);
      if (animationInputs === null) return null;
      config = { move: "WATER_SPOUT", attacker, target, fieldProfile, animationInputs,
        targetIdleX2: liveBattlerAnchors(target.geometry.side, art, battlerX2Input).frontIdleRest.x2 };
      break;
    }
    default: return null;
  }
  // sceneOnLightScreenView/lightScreenAtAge are relative to wall creation;
  // the controller-owned live command starts at animation-script activation.
  // The MetallicShine bodies' accepted staged windows start at presentation
  // age -1: the first displayed row precedes the shine task's age 0.
  const shineBody = request.moveId === 106 || request.moveId === 334 || request.moveId === 232;
  // Reflect and Mirror Coat views anchor at wall creation (activation + 7);
  // Barrier, Magic Coat and Protect anchor at the first script pointer.
  const wallAnchorOffset = request.moveId === 113 || request.moveId === 115
    || request.moveId === 243 ? 7 : 0;
  // Sweet Scent's accepted rows start at reducer age -4 (the pointer-owned setup rows, sweetScentFramebuffer.ts:101).
  const setupAge = request.moveId === 230 ? 4 : 0;
  // Feather Dance: the reducer age is the printer-relative age, 44 at the activation frame (prep7 s2.2).
  return { config, age: wallAnchorOffset ? age - wallAnchorOffset : shineBody ? age - 1
    : request.moveId === 297 ? age + 44 : age - setupAge };
}
