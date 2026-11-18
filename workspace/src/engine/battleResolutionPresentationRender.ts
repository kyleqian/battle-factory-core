import { SITRUS_ITEM_HEAL_TEXT_FIRST_AGE } from "../animation/heldItemHeal.ts";
import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import { CASTFORM_CHANGE_LEAD_FRAMES, LIVE_TRANSFORM_MOVE_ID, liveTransformOf, withLiveTransform } from "./liveTransform.ts";
import {
  liveMovePresentationRngBodyKey, liveMoveRandom2Plan, type LiveMovePresentationRngInput, type LiveMoveRandom2PlanContext,
} from "./liveMovePresentationRng.ts";
import type { PresentationRngHost } from "./presentationRngHost.ts";
import {
  resolveNoMovesLeftMessageLines,
  isWeatherContinuesAnimation, WEATHER_CONTINUES_BODY_ROWS, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, WEATHER_CONTINUES_MOVE_IDS,
} from "./battleResolutionPresentation.ts";
import type { LiveMoveSpriteAllocatorInput, LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { liveSubstituteSwapApplies, substituteSwapTailFieldArt } from "./liveSubstituteSwap.ts";
import {
  liveBattlerAnchors, liveDiveSetupSplashBirth, liveMoveAnimationDuration, liveMoveOpponentShadowPostBodyHideRows,
  liveSemiInvulnerableHideBattler,
} from "./liveMoveAnimation.ts";
import { liveMoveTimingBodyOf, type LiveMoveTimingBody } from "./liveMoveTimingPolicy.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import {
  BATTLE_COMMAND_ACTION_ENTER_DELAY,
  type BattleCommandFieldBattler,
  type BattleCommandUiStatus,
} from "./battleCommandPresentation.ts";
import {
  BATTLE_COMMAND_ACTION_PROMPT_PREFIX,
  BATTLE_COMMAND_ACTION_PROMPT_SUFFIX,
} from "./battleCommandPresentationRender.ts";
import {
  battleCommandFieldArtElevation,
  createBattleCommandFieldArtView,
  type BattleCommandFieldArtBattler,
  type BattleCommandFieldArtView,
} from "./battleCommandFieldArt.ts";
import type {
  BattleResolutionDisplayedField,
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
  BattleResolutionSegment,
} from "./battleResolutionPresentation.ts";
import { backAnimWaitTick, playerFaintReplacementSendOutTiming, sendInNature } from "./switchInTail.ts";
import { SEND_IN_TAIL_ANIM_IDS, SEND_IN_TAIL_FRONT_ANIM_DURATION, SEND_IN_TAIL_SPECIES } from "../data/sendInTail.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "./battleScriptSourceConstants.ts";
import {
  battleStringPrintableLength,
  battleStringVisibleCharacters,
} from "./battleStringResolver.ts";
import {
  battleHealthBarAnimationFrames,
  battleHealthBarFillValueAtFrame,
  battleHealthBarValueAtFrame,
  type HealthboxContentParams,
} from "./healthboxAssembly.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import {
  partySendOutGoTextVisibleChars,
  partySendOutReleaseClock,
  type PartySendOutPhase,
  type PartySendOutTiming,
  partySendOutPhase,
} from "./partySelect.ts";
import { GBA_SINE_TABLE_256, genericHitReactionAtAge } from "./battleMenu.ts";
import {
  markPresentationCommandDegraded,
  presentationCommandDegradation,
  recordContainedPresentationError,
} from "./presentationContainment.ts";
import {
  backSendOutAffineAtTick, backSendOutFrameAtTick, backSendOutPaletteAtTick,
  frontSendOutAffineAtTick, frontSendOutAnimationDelay, frontSendOutFrameAtTick, frontSendOutInitializerTicks, frontSendOutPaletteAtTick,
} from "../animation/sendOutDispatcher.ts";
import { BACK_ANIM_NATURE_ORDER } from "../animation/backSendOutAnim.ts";
import { natureFromPersonality } from "./opponentGen.ts";
import { OPPONENT_SUMMARY_FADE_DELAY_FRAMES, OPPONENT_SUMMARY_FADE_FRAMES } from "./midBattleOpponentPartySummaryTiming.ts";
import { frontSendOutSpriteFrameAtTick } from "../animation/sendOutSpriteFrame.ts";
import { statsChangeParams } from "../animation/statsChange.ts";

export const BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES =
  BATTLE_COMMAND_ACTION_ENTER_DELAY;
/**
 * hpd2 (docs/hpd1-hp-hold.md): the handoff into a LOCKED player action's next turn (Rollout / Thrash / a charge move's strike: `HandleTurnActionSelectionState`
 * auto-confirms the player, so no action menu follows and the foe's choice is on the critical path). ROM, Rollout window (aud242o), Scene ON and OFF alike:
 * `BattleTurnPassed` -> `HandleTurnActionSelectionState` (9 frames: the foe's EmitChooseAction / AI ChooseMove / confirm states) -> `SetActionsAndBattlersTurnOrder`
 * / `RunTurnActionsFunctions` (3) -> the script's first instruction = 13 frames (13 / 13 / 13 / 12 at the four chained turns), the box clearing 2 frames after
 * `BattleTurnPassed`: the blank box lasts 15 frames before the next "used" print (15 / 15 / 15 / 14), the menu's 7 (6 + 1) elsewhere.
 */
export const BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES = BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES + 8;
/**
 * pfr192: the keyed clock of the player's faint-replacement send-in a segment owns (the forced party selector's presenting-switch-in
 * span), from its typed switch-in command (species / nickname / nature), the segment's scene and its "Go!" message.  When the segment
 * continues with exactly `turn-end`, that command's frames and the next-command handoff are inside the ROM's B + D + 17, so the span
 * ends that much earlier.  Null when the segment has no player switch-in (the party select then keeps its canonical clock).
 */
export function playerFaintReplacementSendOutTimingOfSegment(segment: BattleResolutionSegment): PartySendOutTiming | null {
  const index = segment.commands.findIndex((candidate) => candidate.type === "switch-in");
  const command = segment.commands[index];
  if (command === undefined || command.type !== "switch-in" || command.battler !== 0) return null;
  const message = segment.commands.find((candidate) => candidate.type === "message");
  if (message === undefined || message.type !== "message") return null;
  const rest = segment.commands.slice(index + 1);
  const turnEnd = rest.length === 1 && rest[0]!.type === "turn-end" ? rest[0] : undefined;
  return playerFaintReplacementSendOutTiming({
    species: command.incoming.species,
    nameLength: command.incoming.name.length,
    personality: command.incoming.personality ?? 0,
    sceneOn: (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0,
    followingFrames: turnEnd?.type === "turn-end" ? turnEnd.timing.minimumFrames + BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES : 0,
    goTextChars: battleStringPrintableLength(message.lines),
  });
}
/**
 * The stat RAM write is silent for exactly 2 frames before the message box
 * clears -- oracle-measured across all 5 omniboost banners (`docs/issue69-
 * omniboost-off-ground-truth.md` §2). The visible post-print hold belongs to
 * the following `message` command's own duration (`STAT_CHANGE_MESSAGE_
 * TIMING`, `battleResolutionPresentation.ts`), not this one -- ISSUES #69.
 */
export const BATTLE_RESOLUTION_STAT_CHANGE_FRAMES = 2;

/**
 * ISSUES #78 slices 2/3: the mid-battle voluntary switch-in presentation,
 * keyed on the `switch-in` command's own phaseElapsed (0 = the frame
 * `CONTROLLER_SWITCHINANIM` starts). Every boundary is the RAM-probed value
 * from `docs/mid-battle-switch-presentation-ground-truth.md` §3, expressed
 * relative to that command's frame 1140.
 */
export const MID_BATTLE_SWITCH_BALL_LAND_ELAPSED = 46; // 1140+46 = 1186: ball lands, emerge begins (pa 1638)
/**
 * ISSUES #78 window A: the thrown ball's visible span and per-frame state.
 *
 * The oracle RENDERED ball (pixel-verified frames 1143-1184, byte-exact via
 * the affine sampler in `battleScene.ts`) lags the RAM probe one tick: rendered
 * frame N shows the ball sprite's state at RAM tick N-1, so the ball first
 * renders at trace 1143 (elapsed 3, the ball sprite created at RAM 1141 with
 * no translation) and last at trace 1184 (elapsed 44, RAM 1183's (45,47)
 * translation); at elapsed 45 (RAM 1184) the ball's rotated opaque pixels all
 * sit at y>=112 and the terrain clip hides them entirely (oracle 1185 has zero
 * ball pixels). At elapsed 0-2 there is no rendered ball (oracle 1140-1142).
 *
 * Position is the RAM ball sprite's `x2`/`y2` (base (24,68), affine sprite so
 * the fields are the CENTER), and the affine matrix is the RAM
 * `gOamMatrices[2]` state (identical to `battleMenu.ts`'s committed
 * `BALL_SPIN_TABLE`, shared `sAffineAnim_BallRotate_4`; both verified
 * value-for-value against `docs/probes/mid-battle-switch-oam/oam-ram-probe.json`
 * ticks 1142-1183). The table is indexed by `elapsed - 2` (elapsed 3 -> RAM
 * 1142 -> entry 0, ... elapsed 44 -> RAM 1183 -> entry 41).
 *
 * Source: `SpriteCB_PlayerMonSendOut_2` (`pokeball.c:924-978`) +
 * `InitAnimArcTranslation`/`TranslateAnimHorizontalArc`
 * (`battle_anim_mons.c:785-808`) with `data[0]=25`, `stepX=490`,
 * `stepY=582`, `data[5]=-30` (the mid-battle send-out's target y, 24px lower
 * than the battle-START throw's 562). The battle-START forced-switch ball
 * (`battleScene.ts` `forcedSwitchBallCenter`) ports the same mechanism; this
 * table pins the exact per-tick result for THIS window's trace so the two
 * routes stay independent.
 */
export const MID_BATTLE_SWITCH_BALL_FIRST_VISIBLE_ELAPSED = 3; // rendered 1143
export const MID_BATTLE_SWITCH_BALL_LAST_VISIBLE_ELAPSED = 44; // rendered 1184
export const MID_BATTLE_SWITCH_BALL_BASE_X = 24;
export const MID_BATTLE_SWITCH_BALL_BASE_Y = 68;
export const MID_BATTLE_SWITCH_BALL_THROW_TABLE: readonly Readonly<{
  x2: number;
  y2: number;
  pa: number;
  pb: number;
  pc: number;
  pd: number;
}>[] = [
  { x2: 0, y2: 0, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 1, y2: -2, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 3, y2: -4, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 5, y2: -5, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 7, y2: -6, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 9, y2: -7, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 11, y2: -8, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 13, y2: -8, pa: 256, pb: 0, pc: 0, pd: 256 },
  { x2: 14, y2: -8, pa: 209, pb: -147, pc: 147, pd: 209 },
  { x2: 14, y2: -8, pa: 86, pb: -241, pc: 241, pd: 86 },
  { x2: 15, y2: -7, pa: -68, pb: -246, pc: 246, pd: -68 },
  { x2: 15, y2: -8, pa: -197, pb: -162, pc: 162, pd: -197 },
  { x2: 16, y2: -8, pa: -255, pb: -18, pc: 18, pd: -255 },
  { x2: 17, y2: -8, pa: -219, pb: 131, pc: -131, pd: -219 },
  { x2: 17, y2: -7, pa: -103, pb: 234, pc: -234, pd: -103 },
  { x2: 18, y2: -7, pa: 49, pb: 251, pc: -251, pd: 49 },
  { x2: 19, y2: -7, pa: 185, pb: 176, pc: -176, pd: 185 },
  { x2: 19, y2: -6, pa: 253, pb: 37, pc: -37, pd: 253 },
  { x2: 20, y2: -6, pa: 228, pb: -115, pc: 115, pd: 228 },
  { x2: 20, y2: -5, pa: 120, pb: -225, pc: 225, pd: 120 },
  { x2: 21, y2: -5, pa: -31, pb: -254, pc: 254, pd: -31 },
  { x2: 22, y2: -4, pa: -171, pb: -189, pc: 189, pd: -171 },
  { x2: 22, y2: -3, pa: -249, pb: -56, pc: 56, pd: -249 },
  { x2: 23, y2: -2, pa: -236, pb: 97, pc: -97, pd: -236 },
  { x2: 24, y2: -2, pa: -136, pb: 216, pc: -216, pd: -136 },
  { x2: 24, y2: -1, pa: 12, pb: 255, pc: -255, pd: 12 },
  { x2: 25, y2: 0, pa: 157, pb: 201, pc: -201, pd: 157 },
  { x2: 26, y2: 1, pa: 244, pb: 74, pc: -74, pd: 244 },
  { x2: 26, y2: 1, pa: 243, pb: -80, pc: 80, pd: 243 },
  { x2: 27, y2: 2, pa: 152, pb: -205, pc: 205, pd: 152 },
  { x2: 27, y2: 3, pa: 6, pb: -255, pc: 255, pd: 6 },
  { x2: 28, y2: 5, pa: -142, pb: -212, pc: 212, pd: -142 },
  { x2: 29, y2: 5, pa: -238, pb: -92, pc: 92, pd: -238 },
  { x2: 29, y2: 7, pa: -248, pb: 62, pc: -62, pd: -248 },
  { x2: 31, y2: 10, pa: -167, pb: 193, pc: -193, pd: -167 },
  { x2: 33, y2: 15, pa: -25, pb: 254, pc: -254, pd: -25 },
  { x2: 35, y2: 20, pa: 126, pb: 222, pc: -222, pd: 126 },
  { x2: 37, y2: 25, pa: 231, pb: 109, pc: -109, pd: 231 },
  { x2: 39, y2: 30, pa: 252, pb: -43, pc: 43, pd: 252 },
  { x2: 41, y2: 36, pa: 181, pb: -181, pc: 181, pd: 181 },
  { x2: 43, y2: 41, pa: 43, pb: -252, pc: 252, pd: 43 },
  { x2: 45, y2: 47, pa: -109, pb: -231, pc: 231, pd: -109 },
];
export const MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED = 48; // 1140+48 = 1188: mon becomes visible (pa 862)
export const MID_BATTLE_SWITCH_EMERGE_END_ELAPSED = 59; // 1140+59 = 1199: scale-down completes (pa 256)
// The rendered healthbox lags the RAM schedule by one tick (§10 timeline note,
// `docs/mid-battle-switch-presentation-ground-truth.md` §10.4): RAM x2 steps
// 110->0 over 1205-1227, but the visible slide spans rendered frames 1206-1228
// (x2 110...0 at 5 px/frame), so the app keys off elapsed 66-88, one tick later
// than the §3 RAM table.
export const MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED = 66; // 1140+66 = 1206 (render-lagged): slide starts
export const MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_END_ELAPSED = 88; // 1140+88 = 1228: slide completes
export const MID_BATTLE_SWITCH_HEALTHBOX_START_DX = 110;
export const MID_BATTLE_SWITCH_HEALTHBOX_STEP = 5;
/**
 * Ball-release emerge: `sAffineAnim_Battler_Emerge` (`src/data.c:144-149`,
 * the same +18-per-tick accumulator step the battle-START release uses),
 * entered at accumulator 58 when the mon becomes visible. §10.3's RAM `pa`
 * ramp 1129->862->697->...->256 is exactly `floor(0x10000/accumulator)` for
 * accumulator = 58 + 18k, k = 0..11 -- one visible entry ahead of the §3
 * table (which lists `pa 862` at the mon's first visible frame; §10 wins).
 */
export const MID_BATTLE_SWITCH_EMERGE_START_ACCUMULATOR = 58;
export const MID_BATTLE_SWITCH_EMERGE_ACCUMULATOR_STEP = 18;
export const MID_BATTLE_SWITCH_EMERGE_NEUTRAL_ACCUMULATOR = 256;

/**
 * ISSUES #78 slice 4: the return-to-ball (`CONTROLLER_RETURNMONTOBALL`)
 * span's affine scale-up, keyed on the `switch-out` command's phaseElapsed
 * (0 = the frame 1086 the receipt dispatches). `AnimTask_SwitchOutShrinkMon`
 * (`battle_anim_throw.c:642-667`) runs `scale += 0x30` (48) per tick from
 * `0x100` (256, 1.0x) until `>= 0x2D0` (720), i.e. 256->736 across relative
 * frames 14-24 (trace 1100-1110); the sprite then goes invisible at relative
 * 25 (trace 1111) and is freed ~1111-1117 while the healthbox persists until
 * the recall receipt that follows (`docs/mid-battle-switch-presentation-
 * ground-truth.md` §2).
 */
export const MID_BATTLE_SWITCH_OUT_SCALE_UP_ELAPSED = 14;
export const MID_BATTLE_SWITCH_OUT_SCALE_UP_END_ELAPSED = 24;
export const MID_BATTLE_SWITCH_OUT_SPRITE_FREED_ELAPSED = 25;
export const MID_BATTLE_SWITCH_OUT_SCALE_START = 256;
export const MID_BATTLE_SWITCH_OUT_SCALE_STEP = 48;
/**
 * `SetBattlerSpriteYOffsetFromYScale` (`battle_anim_mons.c:1873-1883`):
 * `var = MON_PIC_HEIGHT(64) - GetBattlerYDeltaFromSpriteId*2`, for RATTATA
 * `gMonBackPicCoords[19].y_offset = 13` (`back_pic_coordinates.h:26`) so
 * `var = 38`, then `y2 = (var - SAFE_DIV(var<<8, gOamMatrices[matrix].d))/2`
 * (integer division). Verified value-for-value against the §10.1 OAM table:
 * 304->3, 352->5, 400->7, 448->8, 496->9, 544->10, 592->11, 640->11, 688->12,
 * 736->12. The feet anchor keeps the sprite's feet on the ground as it grows.
 */
export function midBattleSwitchOutFeetAnchorY2(scale: number, yOffset = 13): number {
  if (scale <= MID_BATTLE_SWITCH_OUT_SCALE_START) return 0;
  const varr = 64 - 2 * yOffset;
  const shift = Math.floor((varr << 8) / scale);
  return Math.floor((varr - shift) / 2);
}

export type MidBattleSwitchOutView = Readonly<{
  elapsed: number;
  battler: 0 | 1;
  /** Affine scale factor (256 = 1.0x) during the scale-up window. */
  scale: number;
  /**
   * `SetBattlerSpriteYOffsetFromYScale` feet-anchor y2 during the scale-up
   * (0 before it). The sprite also flips to the double-size affine box
   * (mode 3, centerToCornerVec ±64 => 128px box, no 64px clip) for the whole
   * scale-up window (relative 14-24) per §10.1.
   */
  y2: number;
  /** False from relative frame 25 (the real sprite is freed ~1111-1117). */
  spriteVisible: boolean;
}>;

/**
 * Projects the return-to-ball's visible state from the `switch-out` command's
 * phaseElapsed alone. Before the scale-up window the outgoing sprite sits at
 * full size; during it the affine scale grows 256->736 at 48/tick; from
 * relative 25 the sprite is gone (the field is empty until the send-in).
 *
 * The rendered scale LAGS the §10.1 RAM table by two ticks: the probe reads
 * the gOamMatrices register the tick the affine anim writes it, but the
 * matrix is latched into the OAM matrix table two rendered frames later
 * (pixel-verified: oracle frame N renders the scale §10.1 lists at N-2, e.g.
 * the §10.1 "304 at 1101" first appears rendered at 1103, and the oracle's
 * mon at 1111-1112 still shows the 688/736 scales). The `y2` feet anchor and
 * the freed edge shift by the same two ticks.
 */
export function midBattleSwitchOutAt(
  elapsed: number,
  battler: 0 | 1,
  /** ais2: `GetBattlerYDeltaFromSpriteId` of the recalled battler (default: the player RATTATA back-pic 13 of the staged fixture). */
  yOffset = 13,
): MidBattleSwitchOutView {
  const renderedElapsed = elapsed - 2;
  const inWindow = renderedElapsed >= MID_BATTLE_SWITCH_OUT_SCALE_UP_ELAPSED
    && renderedElapsed <= MID_BATTLE_SWITCH_OUT_SCALE_UP_END_ELAPSED;
  const scale = inWindow
    ? MID_BATTLE_SWITCH_OUT_SCALE_START
      + MID_BATTLE_SWITCH_OUT_SCALE_STEP
        * (renderedElapsed - MID_BATTLE_SWITCH_OUT_SCALE_UP_ELAPSED)
    : MID_BATTLE_SWITCH_OUT_SCALE_START;
  return Object.freeze({
    elapsed,
    battler,
    scale,
    y2: midBattleSwitchOutFeetAnchorY2(scale, yOffset),
    spriteVisible: renderedElapsed < MID_BATTLE_SWITCH_OUT_SPRITE_FREED_ELAPSED,
  });
}

export type MidBattleSwitchInView = Readonly<{
  elapsed: number;
  battler: 0 | 1;
  /** Controller/party owner carried from the typed singles battler. */
  side: "player" | "opponent";
  ballVisible: boolean;
  /** Visible send-out ball frame; null while the ball is absent. */
  ballPose: "closed" | "open" | "open-final" | null;
  /** Source send-out origin before any player throw translation. */
  ballOrigin: Readonly<{ x: number; y: number }>;
  /**
   * Thrown-ball CENTER (px) + affine matrix, from the exact per-tick RAM
   * state (`MID_BATTLE_SWITCH_BALL_THROW_TABLE`, rendered one tick behind the
   * probe — see its doc). `ballVisible` is true only for rendered frames
   * 1143-1184 (elapsed 3-44): before that the ball sprite doesn't exist yet
   * and at elapsed 45+ the rotating ball's opaque pixels sit below the
   * terrain clip row. The scene renderer draws the 16x16 closed ball affine-
   * sampled around this center, clipped at y=112.
   */
  ballPosition: Readonly<{ x: number; y: number }>;
  ballMatrix: Readonly<{ pa: number; pb: number; pc: number; pd: number }>;
  monVisible: boolean;
  /** `sAffineAnim_Battler_Emerge` accumulator during the ball-release scale-down. */
  emergeAccumulator: number;
  /** Task_FadeMon_ToNormal coefficient for the opponent release silhouette. */
  monTintCoefficient: number;
  /** Player-healthbox x2 slide offset (110 -> 0 at 5 px/frame), or null before the slide. */
  healthboxDx: number | null;
  /**
   * fra151: a Scene ON opponent send-in's species front animation once the emerge has settled (null before it starts, for the
   * player side and in Scene OFF, whose SKIP_FRONT_ANIM path never launches it).
   */
  frontAnim: MidBattleSwitchInFrontAnim | null;
  /**
   * bso225: a Scene ON player send-in's species back animation once the emerge has ended (null before it starts, for the opponent
   * side, in Scene OFF -- whose SKIP_FRONT_ANIM path never calls `BattleAnimateBackSprite` -- and for a mon with no back reducer).
   */
  backAnim: MidBattleSwitchInBackAnim | null;
}>;

/** bso225: the player's back `Anim_*` state on one rendered frame (x2 / y2 offsets, OAM matrix, `BlendPalette` write). */
export type MidBattleSwitchInBackAnim = Readonly<{
  x2: number;
  y2: number;
  matrix: readonly [number, number, number, number] | null;
  blend: Readonly<{ coefficient: number; color: number }> | null;
  /** The release fade task rewrites the mon's palette this frame, so a glow / flash `BlendPalette` write does not show. */
  tintTaskWrites: boolean;
}>;

/** fra151: the settled send-in sprite's front animation state on one rendered frame. */
export type MidBattleSwitchInFrontAnim = Readonly<{
  /** `sAnim_<Name>_1` frame on screen (0 = the front pic, 1 = its second frame). */
  frame: 0 | 1;
  x2: number;
  y2: number;
  /** OAM matrix (pa, pb, pc, pd) of an affine `Anim_*` write; null = no affine transform. */
  matrix: readonly [number, number, number, number] | null;
  /** Anim_FlickerIncreasing's hidden frames. */
  invisible: boolean;
  /** A glow / flash family's last `BlendPalette` write (coefficient toward a BGR555 color); null = the sprite's own palette. */
  blend: Readonly<{ coefficient: number; color: number }> | null;
}>;

/**
 * fra151 (ISSUES #146 / #71 remainder, docs/fra151-front-send-in-animation.md): Scene ON opponent send-in elapsed on which the
 * `sAnim_<Name>_1` program's tick 0 renders. `SpriteCB_ReleasedMonFlyOut` (pokeball.c:1088-1131) sees the emerge's affineAnimEnded and
 * calls `DoMonFrontSpriteAnimation` (pokemon.c:6811-6856): `StartSpriteAnim(sprite, 1)` plus the `sMonAnimFunctions` callback, at once or
 * after `sMonAnimationDelayTable[species - 1]` frames (Task_AnimateAfterDelay's pre-decrement launches it one frame early). Fitted on the
 * snd145 dense windows (ROM rows of TAILLOW / ONIX / TYPHLOSION / SALAMENCE / SPHEAL / CASTFORM).
 */
export const MID_BATTLE_SWITCH_FRONT_ANIM_FRAME_START_ELAPSED = 34;
/** The `sMonAnimFunctions` callback's x2 / y2 / matrix for reducer tick N renders on `MOTION_START + N` (+ delay - 1). */
export const MID_BATTLE_SWITCH_FRONT_ANIM_MOTION_START_ELAPSED = 35;

/**
 * fra151: the release fade task (`Task_FadeMon_ToNormal`, run after the sprite callbacks and rewriting the same palette from the
 * unfaded buffer) writes only while it ramps (Scene ON el 40..56: coefficient 16 -> 0), not during its hold; a glow / flash
 * family's `BlendPalette` (every frame from its first tick) shows on every other frame. ROM (fra151 GASTLY GLOW_BLACK window):
 * the plain palette (glow coefficient 0) at el 35..39 over the held tint, the tint ramp at 40..56, the glow's 8, 8, 8, 9, ... from 57.
 */
function midBattleSwitchInPalette(
  frontAnim: MidBattleSwitchInFrontAnim | null,
  monTintCoefficient: number,
  tintTaskWrites: boolean,
): Readonly<{ monTintCoefficient: number; frontAnim: MidBattleSwitchInFrontAnim | null }> {
  if (frontAnim === null || frontAnim.blend === null) return { monTintCoefficient, frontAnim };
  return tintTaskWrites
    ? { monTintCoefficient, frontAnim: Object.freeze({ ...frontAnim, blend: null }) }
    : { monTintCoefficient: 0, frontAnim };
}

/**
 * pfb229 (docs/pfb228-faint-replacement-emerge.md): the player send-out ball's arc is species-keyed. `SpriteCB_PlayerMonSendOut_1`
 * (pokeball.c:911) targets `GetBattlerSpriteCoord(Y_PIC_OFFSET) + 24` = the mon sprite's `y + 32` (our `fieldArt.player.origin.y + 32`),
 * `InitAnimLinearTranslation` gives stepX 490 / stepY ((monY - 36) << 8) / 25 & ~1, and `SpriteCB_PlayerMonSendOut_2` adds the horizontal
 * arc (amplitude -30, with the data[7] 35..80 slow zone).  Port of tools/integration/pfb228Ball.py `ball_arc` (0 mismatching ticks in 8 ROM
 * windows).  The 43 entries are the ball sprite's (x2, y2) per `_2` callback tick; the last one is the landing tick.
 * `MID_BATTLE_SWITCH_BALL_MON_Y` (93) is the fitted voluntary-switch species' arc and reproduces `MID_BATTLE_SWITCH_BALL_THROW_TABLE`.
 */
export const MID_BATTLE_SWITCH_BALL_MON_Y = 93;
/** The MAGBY-calibrated forced-select ball clock's spawn (`switchInTail.ts` ballShift = B - 96): path-A elapsed 0 = release clock 96. */
const FORCED_SEND_IN_PATH_A_BALL_SPAWN = 96;
/** The canonical turn-15..17 MAGBY forced send-in, whose forced-selector release is hand-calibrated and stays as is. */
function isCanonicalMagbyIncoming(mon: Readonly<{ name: string; species: number }>): boolean {
  return mon.name === "MAGBY" && mon.species === 240;
}
const BALL_ARC_BASE_X = 24;
const BALL_ARC_BASE_Y = 68;
const BALL_ARC_TARGET_X = 72;
const BALL_ARC_TICKS = 25;
const BALL_ARC_AMPLITUDE = -30;

export function playerSendOutBallArc(monY: number): readonly Readonly<{ x2: number; y2: number }>[] {
  const sin = (index: number, amplitude: number): number => (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
  const dx = BALL_ARC_TARGET_X - BALL_ARC_BASE_X;
  const dy = monY + 32 - BALL_ARC_BASE_Y;
  let stepX = Math.floor((Math.abs(dx) * 256) / BALL_ARC_TICKS);
  let stepY = Math.floor((Math.abs(dy) * 256) / BALL_ARC_TICKS);
  stepX = dx < 0 ? stepX | 1 : stepX & ~1;
  stepY = dy < 0 ? stepY | 1 : stepY & ~1;
  const angleStep = Math.floor(0x8000 / BALL_ARC_TICKS);
  let remaining = BALL_ARC_TICKS;
  let accX = 0;
  let accY = 0;
  let angle = 0;
  let affine = 0;
  const out: { x2: number; y2: number }[] = [];
  for (let guard = 0; guard < 200; guard += 1) {
    const slow = ((angle >> 8) & 0xff) >= 35 && ((angle >> 8) & 0xff) < 80;
    if (!slow && remaining === 0) return out;
    if (slow && (affine & 0xff00) === 0) {
      stepX = ((Math.floor(stepX / 3)) & ~1) | (stepX & 1);
      stepY = ((Math.floor(stepY / 3)) & ~1) | (stepY & 1);
    }
    const kept = remaining;
    accX = (accX + stepX) & 0xffff;
    accY = (accY + stepY) & 0xffff;
    remaining -= 1;
    const x2 = (stepX & 1) !== 0 ? -(accX >> 8) : accX >> 8;
    let y2 = (stepY & 1) !== 0 ? -(accY >> 8) : accY >> 8;
    if (slow) {
      angle += Math.floor(angleStep / 3);
      y2 += sin((angle >> 8) & 0xff, BALL_ARC_AMPLITUDE);
      affine += 0x100;
      remaining = (affine >> 8) % 3 !== 0 ? kept : kept - 1;
      if (((angle >> 8) & 0xff) >= 80) {
        stepX = ((stepX * 3) & ~1) | (stepX & 1);
        stepY = ((stepY * 3) & ~1) | (stepY & 1);
      }
    } else {
      angle += angleStep;
      y2 += sin((angle >> 8) & 0xff, BALL_ARC_AMPLITUDE);
    }
    out.push(Object.freeze({ x2, y2 }));
  }
  return out;
}


const BALL_ROTATE_UNITS_PER_TICK = 25;
const BALL_ROTATION_FIRST_ENTRY = 8;
const BALL_LANDED_OPEN_TICKS = 5;
const BALL_LANDED_OPEN_FINAL_TICKS = 6;

/**
 * snd233: the player send-out ball after the 42 tabulated ticks (`MID_BATTLE_SWITCH_BALL_THROW_TABLE`, calibrated on the monY-93 window whose ball
 * is under the text box from there on). A species whose ball lands higher (monY 80..88) still shows its top rows above the terrain clip row 112:
 * arc ticks 41 and 42 (the landing tick, elapsed 46) keep rotating by `sAffineAnim_BallRotate_4`; the next row draws the closed ball unrotated
 * (`StartSpriteAffineAnim(sprite, 0)` at the landing), then `SpriteCB_ReleaseMonFromBall`'s `sBallAnimSeq1` shows the open ball for 5 rows and the
 * open-final ball for 6 (the opponent ball's cadence), and `HandleBallAnimEnd` hides the sprite.  Null while the ball is fully under the clip row.
 */
function midBattleSwitchBallTail(monY: number, elapsed: number): Readonly<{
  flight: boolean; entry: Readonly<{ x2: number; y2: number; pa: number; pb: number; pc: number; pd: number }>; pose: "open" | "open-final" | null;
}> | null {
  const arc = playerSendOutBallArc(monY);
  const arcIndex = elapsed - MID_BATTLE_SWITCH_BALL_FIRST_VISIBLE_ELAPSED - 1;
  const last = arc.at(-1)!;
  const at = arcIndex < arc.length ? arc[arcIndex]! : last;
  if (MID_BATTLE_SWITCH_BALL_BASE_Y + at.y2 - 8 >= 112) return null;
  if (arcIndex < arc.length) {
    const angle = (BALL_ROTATE_UNITS_PER_TICK * (arcIndex + 2 - BALL_ROTATION_FIRST_ENTRY)) & 0xff;
    const sin = GBA_SINE_TABLE_256[angle]!;
    const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
    return Object.freeze({ flight: true, pose: null, entry: Object.freeze({ x2: at.x2, y2: at.y2, pa: cos, pb: -sin, pc: sin, pd: cos }) });
  }
  const entry = Object.freeze({ x2: last.x2, y2: last.y2, pa: 256, pb: 0, pc: 0, pd: 256 });
  const age = arcIndex - arc.length;
  if (age === 0) return Object.freeze({ flight: true, pose: null, entry });
  const open = age - 1;
  if (open < 0 || open >= BALL_LANDED_OPEN_TICKS + BALL_LANDED_OPEN_FINAL_TICKS) return null;
  return Object.freeze({ flight: false, pose: open < BALL_LANDED_OPEN_TICKS ? "open" as const : "open-final" as const, entry });
}

const ballTableByMonY = new Map<number, typeof MID_BATTLE_SWITCH_BALL_THROW_TABLE>();

/** The per-tick ball table for a mon sprite y: table[0] = (0, 0), table[t] = arc[t - 1]; the affine rotation entries are species-independent. */
export function midBattleSwitchBallTable(monY: number): typeof MID_BATTLE_SWITCH_BALL_THROW_TABLE {
  const cached = ballTableByMonY.get(monY);
  if (cached !== undefined) return cached;
  const arc = playerSendOutBallArc(monY);
  const table = MID_BATTLE_SWITCH_BALL_THROW_TABLE.map((entry, t) => t === 0
    ? entry
    : Object.freeze({ ...entry, x2: arc[t - 1]!.x2, y2: arc[t - 1]!.y2 }));
  ballTableByMonY.set(monY, Object.freeze(table));
  return table;
}

/** The ball-open particle burst's y for a player send-in: the landing tick's ball y2 + 59 (ROM spawn row 63 + y2, minus the 4 px tile half); monY 93 -> 119. */
export function midBattleSwitchSendInParticleY(monY: number): number {
  return playerSendOutBallArc(monY).at(-1)!.y2 + 59;
}

/**
 * bso225 (ISSUES #146 / #71 remainder, docs/bso225-player-back-send-out.md): Scene ON player send-in elapsed on which the back
 * animation's reducer tick 0 renders. `SpriteCB_PlayerMonFromBall` (battle_main.c:2987) calls `BattleAnimateBackSprite` (pokemon.c:6886)
 * on the first callback after the emerge's `affineAnimEnded`; the callback is the species' `3 * GetSpeciesBackAnimSet + natureMod` entry.
 */
export const MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED = 66;

export function midBattleSwitchInBackAnimAt(species: string, nature: string, elapsed: number): MidBattleSwitchInBackAnim | null {
  const tick = elapsed - MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED;
  if (tick < 0) return null;
  const offset = backSendOutFrameAtTick(species, nature, tick);
  if (offset === null) return null;
  return Object.freeze({
    x2: offset.x2,
    y2: offset.y2,
    matrix: backSendOutAffineAtTick(species, nature, tick),
    blend: backSendOutPaletteAtTick(species, nature, tick),
    tintTaskWrites: backTintTaskWritesAt(elapsed),
  });
}

/**
 * bso225: `Task_FadeMon_ToNormal` (the player's release fade, `midBattleSwitchSendInFadeAt`) rewrites the mon palette from the unfaded
 * buffer on the frame before its ramp and while it ramps (obj 16 .. 0: ROM rows 70..86 from the send-in start, `elapsed` 71..87); during its hold and after, a glow / flash family's `BlendPalette` -- whose first
 * write (coefficient 0) restores the plain palette over the held tint -- is what shows. ROM (bso225 ENTEI SHAKE_GLOW_RED window).
 */
function backTintTaskWritesAt(elapsed: number): boolean {
  const fade = midBattleSwitchSendInFadeAt(elapsed, 0);
  if (fade === null) return false;
  if (fade.obj >= 16) return (midBattleSwitchSendInFadeAt(elapsed + 1, 0)?.obj ?? 16) < 16;
  return fade.obj > 0 || (midBattleSwitchSendInFadeAt(elapsed - 1, 0)?.obj ?? 0) > 0;
}

/** bso225: the back animation's selector inputs for a player mon (`GetNature` = personality % 25). */
export function backAnimNatureName(personality: number | undefined): string {
  return BACK_ANIM_NATURE_ORDER[natureFromPersonality((personality ?? 0) >>> 0)]!;
}

export function midBattleSwitchInFrontAnimAt(species: string, elapsed: number): MidBattleSwitchInFrontAnim | null {
  const frameTick = elapsed - MID_BATTLE_SWITCH_FRONT_ANIM_FRAME_START_ELAPSED;
  if (frameTick < 0) return null;
  const delay = frontSendOutAnimationDelay(species);
  const motionTick = elapsed - MID_BATTLE_SWITCH_FRONT_ANIM_MOTION_START_ELAPSED - (delay > 0 ? delay - 1 : 0)
    - frontSendOutInitializerTicks(species);
  const offset = motionTick < 0 ? null : frontSendOutFrameAtTick(species, motionTick);
  const palette = motionTick < 0 ? null : frontSendOutPaletteAtTick(species, motionTick);
  return Object.freeze({
    frame: frontSendOutSpriteFrameAtTick(species, frameTick) ?? 0,
    x2: offset?.x2 ?? 0,
    y2: offset?.y2 ?? 0,
    matrix: motionTick < 0 ? null : frontSendOutAffineAtTick(species, motionTick),
    invisible: palette?.invisible ?? false,
    blend: palette?.blend ?? null,
  });
}

/**
 * bso226 (docs/bso226-battle-start-intro-send-outs.md): the battle-start intro's Scene ON send-out animations ride the same ROM
 * callbacks as a mid-battle send-in (`SpriteCB_OpponentMonFromBall` -> `DoMonFrontSpriteAnimation`, `SpriteCB_PlayerMonFromBall` ->
 * `BattleAnimateBackSprite`), so the generated intro reuses the mid-battle views at an equivalent send-in elapsed. The opponent's emerge
 * starts at elapsed 19 (`MATERIALIZE_START_OFFSET`); the player's mon is first visible at elapsed 49 (= `PLAYER_MATERIALIZE_START_TICK`).
 * The shifts are the ROM fits on the battle-start windows (0 = the mid-battle anchors).
 */
export const GENERATED_INTRO_OPPONENT_ANIM_ELAPSED_SHIFT = -1;
export const GENERATED_INTRO_PLAYER_ANIM_ELAPSED_SHIFT = 1;

/** Opponent release tint + front animation for the generated intro's `local` = ticks since the opponent materialize started. */
export function generatedBattleStartOpponentAnimAt(species: string, local: number): Readonly<{
  monTintCoefficient: number;
  frontAnim: MidBattleSwitchInFrontAnim | null;
}> {
  const view = midBattleSwitchInAt(local + 19 + GENERATED_INTRO_OPPONENT_ANIM_ELAPSED_SHIFT, 1, undefined, species);
  return Object.freeze({ monTintCoefficient: view.monTintCoefficient, frontAnim: view.frontAnim });
}

/** Player back animation for the generated intro's `local` = ticks since the player mon became visible (`PLAYER_MATERIALIZE_START_TICK`). */
export function generatedBattleStartPlayerAnimAt(species: string, personality: number | undefined, local: number): MidBattleSwitchInBackAnim | null {
  return midBattleSwitchInBackAnimAt(
    species,
    backAnimNatureName(personality),
    local + MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED + 1 + GENERATED_INTRO_PLAYER_ANIM_ELAPSED_SHIFT,
  );
}

/**
 * go246 (docs/go246-intro-wait.md): the battle-start intro waits for the send-out animations like a mid-battle send-in. The opponent's
 * `Intro_TryShinyAnimShowHealthbox` (battle_controller_opponent.c:292-383) leaves only when the cry has ended (`bgmRestored`) AND the
 * battler sprite callback is `SpriteCallbackDummy` (the front animation ended); the player's "Go! <mon>!" dispatch follows. The app's
 * dispatch delay was the cry bound alone; Scene ON adds this hold = max(0, front-animation bound - cry-bound delay). The front-animation
 * bound uses the species tail's two terms (`src/data/sendInTail.ts`, the terms the mid-battle slide waits on): the function animation
 * `A + delay - 1` + 44 (SABLEYE / RATICATE / BUTTERFREE / SPOINK windows) and the sprite frame animation `S` + 43 (ELEKID / ARON),
 * ROM fits on dense battle-start windows. Scene OFF skips the front animation (`SKIP_FRONT_ANIM`): no hold.
 */
export const GENERATED_INTRO_OPPONENT_FUNCTION_ANIM_TO_DISPATCH = 44;
export const GENERATED_INTRO_OPPONENT_FRAME_ANIM_TO_DISPATCH = 43;

export function generatedIntroOpponentAnimHold(species: number, cryDispatchDelay: number): number {
  const row = SEND_IN_TAIL_SPECIES[species];
  if (row === undefined) return 0;
  const functionAnim = (SEND_IN_TAIL_FRONT_ANIM_DURATION[SEND_IN_TAIL_ANIM_IDS[row[1]]!] ?? 0) + (row[2] > 0 ? row[2] - 1 : 0);
  const bound = Math.max(row[0] + GENERATED_INTRO_OPPONENT_FRAME_ANIM_TO_DISPATCH, functionAnim + GENERATED_INTRO_OPPONENT_FUNCTION_ANIM_TO_DISPATCH);
  return Math.max(0, bound - cryDispatchDelay);
}

/**
 * go246: the player's `Intro_TryShinyAnimShowHealthbox` (battle_controller_player.c:979-1063) likewise waits for the cry and the back
 * animation (`BattleAnimateBackSprite`'s `SpriteCallbackDummy_2` -> `SpriteCallbackDummy` when the animation task ends) before the
 * first action menu. The app's ready lag was the cry bound alone; Scene ON adds max(0, T_back + 5 - cry) (`backAnimWaitTick`; ROM fit
 * on GRIMER / KOFFING / WAILMER battle-start windows, 0 for the cry-bound SPINDA / ONIX). Scene OFF: no back animation, no hold.
 */
export const GENERATED_INTRO_PLAYER_BACK_ANIM_TO_READY = 5;

export function generatedIntroPlayerAnimHold(species: number, personality: number, cryTicks: number): number {
  const back = backAnimWaitTick(species, sendInNature(personality));
  return back === null ? 0 : Math.max(0, back + GENERATED_INTRO_PLAYER_BACK_ANIM_TO_READY - cryTicks);
}

/**
 * Projects the mid-battle switch-in's visible state from the `switch-in`
 * command's phaseElapsed alone. The source send-in is
 * `SpriteCB_PlayerMonSendOut_1/2` (`pokeball.c:911-985`) for the ball throw,
 * `SpriteCB_PlayerMonFromBall` (`battle_main.c:2987-2990`) + the ball-release
 * emerge for the scale-down, and `StartHealthboxSlideIn` (`pokeball.c:
 * 1241-1269`) for the healthbox -- all four cadences pinned in the §3 table.
 */
export function midBattleSwitchInAt(
  elapsed: number,
  battler: 0 | 1,
  /**
   * snd145: a Scene ON opponent switch-in's species-keyed slide start (the command's `healthboxSlideElapsed`); omitted = the
   * calibrated constants (player 66; opponent 33: Scene OFF, whose skipped front animation does not gate the slide).
   */
  healthboxSlideStart?: number,
  /** fra151: the Scene ON opponent send-in species whose front animation plays (omitted = none: player side, Scene OFF). */
  frontAnimSpecies?: string,
  /** bso225: the Scene ON player send-in's back animation inputs (omitted = none: opponent side, Scene OFF). */
  backAnimMon?: Readonly<{ species: string; nature: string }>,
  /** pfb229: the Scene ON player send-in's mon sprite y (`fieldArt.player.origin.y + 32`) keying the ball arc (omitted = the fitted 93). */
  playerMonY: number = MID_BATTLE_SWITCH_BALL_MON_Y,
  /** ais3: the release tint ramp's hold (default 23 Scene OFF, 22 with a front animation); an AI switch's Scene OFF send-in uses 22 (seed 2741). */
  tintHoldOverride?: number,
): MidBattleSwitchInView {
  const side = battler === 0 ? "player" : "opponent";
  // DoPokeballSendOutAnimation routes by GetBattlerSide. Player send-outs
  // arc from (24,68); opponent send-outs stay at the singles battler coord
  // (176,40)+24 while SpriteCB_OpponentMonSendOut waits 16 callbacks.
  const ballOrigin = side === "player"
    ? Object.freeze({ x: MID_BATTLE_SWITCH_BALL_BASE_X, y: MID_BATTLE_SWITCH_BALL_BASE_Y })
    : Object.freeze({ x: 176, y: 64 });
  // The ball's rendered state is the RAM probe one tick earlier (trace 1143 =
  // elapsed 3 first shows RAM 1142's (0,0) state; trace 1184 = elapsed 44
  // shows RAM 1183's (45,47); elapsed 45's RAM 1184 state renders no opaque
  // pixels above the terrain clip). Table entry = elapsed - 2.
  const ballEntry = elapsed - MID_BATTLE_SWITCH_BALL_FIRST_VISIBLE_ELAPSED;
  const flightVisible = ballEntry >= 0
    && ballEntry < MID_BATTLE_SWITCH_BALL_THROW_TABLE.length;
  const tail = side === "player" && ballEntry >= MID_BATTLE_SWITCH_BALL_THROW_TABLE.length
    ? midBattleSwitchBallTail(playerMonY, elapsed)
    : null;
  const playerBallVisible = flightVisible || (tail !== null && tail.flight);
  const ball = side === "player" && flightVisible
    ? midBattleSwitchBallTable(playerMonY)[ballEntry]!
    : tail !== null && tail.flight ? tail.entry : null;
  const opponentBallPose = elapsed < 2 || elapsed >= 29
    ? null
    : elapsed < 18
      ? "closed" as const
      : elapsed < 23
        ? "open" as const
        : "open-final" as const;
  const ballPose = side === "player"
    ? (playerBallVisible ? "closed" as const : tail !== null ? tail.pose : null)
    : opponentBallPose;
  const ballVisible = ballPose !== null;
  const monVisible = elapsed >= (
    side === "player" ? MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED : 19
  );
  // The emerge's scale (and y2 descent) render one tick behind the §10.3
  // RAM table -- the mon becomes visible at elapsed 48 but that frame shows
  // the accumulator the probe records at 1187 (acc 40, pa 1638), and acc 58
  // first renders at elapsed 49 (trace 1189). Pixel-fit across 1190-1198:
  // rendered acc = 58 + 18*(elapsed-49), y2 = MATERIALIZE_Y2_TABLE[elapsed-49].
  const emergeAccumulator = Math.min(
    MID_BATTLE_SWITCH_EMERGE_NEUTRAL_ACCUMULATOR,
    MID_BATTLE_SWITCH_EMERGE_START_ACCUMULATOR
      + MID_BATTLE_SWITCH_EMERGE_ACCUMULATOR_STEP
        * (elapsed - (side === "player" ? MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED + 1 : 19)),
  );
  const opponentMaterializeLocal = elapsed - 19;
  // The shared release task holds the ball-open tint at 16 for 23 rendered
  // callbacks, then fades 15 -> 0. This is the handoff-relative form of the
  // source-derived generated-opponent release cadence in battleScene.ts.
  // fra151: on a Scene ON opponent send-in (front animation launched) the ROM's ramp starts one frame earlier (dense snd145 windows,
  // 6 species: coefficient 15 at local 22); the Scene OFF windows show the same 16 rows but stay with the OFF owner.
  const tintHold = tintHoldOverride ?? (frontAnimSpecies !== undefined ? 22 : 23);
  const monTintCoefficient = side === "opponent"
    ? opponentMaterializeLocal < tintHold
      ? 16
      : Math.max(0, 15 - (opponentMaterializeLocal - tintHold))
    : 0;
  const healthboxSlideElapsed = healthboxSlideStart ?? (side === "player"
    ? MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED
    : 33);
  const healthboxDx =
    elapsed < healthboxSlideElapsed
      ? null
      : side === "player"
        ? Math.max(
            0,
            MID_BATTLE_SWITCH_HEALTHBOX_START_DX
              - MID_BATTLE_SWITCH_HEALTHBOX_STEP
                * (elapsed - healthboxSlideElapsed),
          )
        : Math.min(
            0,
            -MID_BATTLE_SWITCH_HEALTHBOX_START_DX
              + MID_BATTLE_SWITCH_HEALTHBOX_STEP
                * (elapsed - healthboxSlideElapsed),
          );
  return Object.freeze({
    elapsed,
    battler,
    side,
    ballVisible,
    ballPose,
    ballOrigin,
    ballPosition: tail !== null && !tail.flight && tail.pose !== null
      ? Object.freeze({ x: MID_BATTLE_SWITCH_BALL_BASE_X + tail.entry.x2, y: MID_BATTLE_SWITCH_BALL_BASE_Y + tail.entry.y2 })
      : ball
      ? Object.freeze({
          x: MID_BATTLE_SWITCH_BALL_BASE_X + ball.x2,
          y: MID_BATTLE_SWITCH_BALL_BASE_Y + ball.y2,
        })
      : ballOrigin,
    ballMatrix: ball
      ? Object.freeze({ pa: ball.pa, pb: ball.pb, pc: ball.pc, pd: ball.pd })
      : Object.freeze({ pa: 256, pb: 0, pc: 0, pd: 256 }),
    monVisible,
    emergeAccumulator,
    healthboxDx,
    backAnim: backAnimMon === undefined || side !== "player" ? null : midBattleSwitchInBackAnimAt(backAnimMon.species, backAnimMon.nature, elapsed),
    ...midBattleSwitchInPalette(
      frontAnimSpecies === undefined || side !== "opponent" ? null : midBattleSwitchInFrontAnimAt(frontAnimSpecies, elapsed),
      monTintCoefficient,
      opponentMaterializeLocal >= tintHold - 1 && opponentMaterializeLocal <= tintHold + 15,
    ),
  });
}

export type MidBattleSwitchParticle = Readonly<{
  /** Spawn index 0-15 (angle = (i % 8) * 32). */
  i: number;
  /** Particle's own rendered age (frame - spawn - 2, clamped >= 0). */
  age: number;
  /**
   * True when the window's stolen particle-update tick (recall 1121 / send-in
   * 1204) has already occurred, so the rendered radius is one 2px step behind
   * the ideal `2*(age-1)` ramp for the rest of the particle's life.
   */
  frozen: boolean;
  /** Screen offset from the window origin (Sin/Cos radial, `gSineTable` Q8.8). */
  dx: number;
  dy: number;
}>;

/** §10.2: `AnimateBallOpenParticles`/`PokeBallOpenParticleAnimation` (battle_anim_throw.c:1577-1652, trig.c:515-523). */
export const MID_BATTLE_SWITCH_RECALL_PARTICLE_START_TRACE = 1089; // recall spawn 1089-1104, base (72,112), tiles 405-407, prio 2
export const MID_BATTLE_SWITCH_SEND_IN_PARTICLE_START_TRACE = 1187; // send-in spawn 1187-1202, base (72,123), tiles 417-419, prio 1

/**
 * The mid-battle switch ball-open particle burst, one particle/tick for 16
 * ticks at the window's base, each with angle `(i%8)*32` and radial
 * `dx/dy = Sin/Cos(angle, radius)` (`gSineTable` amplitude-scaled, Q8.8,
 * `trig.c:515-523`), `radius = 2*(age-1)`, tile `sAnim_RegularBall[age%6]`
 * (`battle_anim_throw.c:180`), destroyed at age 26. The RENDERED frame lags
 * the RAM spawn tick by one (visible x2/y2 = the RAM value at data[1]-2,
 * §10.2), so a particle spawned at trace S renders at age 0 from frame S+2
 * (and the newest particle renders at age -1 on its first visible frame) --
 * pixel-verified byte-exact across the whole recall window (1091-1099).
 * `dx`/`dy` are computed by the scene renderer (battleScene.ts owns the
 * `gSineTable`), so this function carries the raw age/angle and the caller
 * applies the Sin/Cos.
 */
export function midBattleSwitchParticleSchedulesAt(
  traceFrame: number,
  window: "recall" | "send-in",
  /** ais2: false = no stolen update tick (the opponent's recall: the party-summary sprite-sheet work of the player's staged fixture is absent). */
  recallStolenTick = true,
): readonly MidBattleSwitchParticle[] {
  const start = window === "recall"
    ? MID_BATTLE_SWITCH_RECALL_PARTICLE_START_TRACE
    : MID_BATTLE_SWITCH_SEND_IN_PARTICLE_START_TRACE;
  const out: MidBattleSwitchParticle[] = [];
  for (let i = 0; i < 16; i += 1) {
    // `PokeBallOpenParticleAnimation_Step2` (battle_anim_throw.c:1642-1657)
    // destroys a particle when its `data[1]` reaches 50; `data[1]` is 0 on
    // the spawn tick and the two ticks after, then steps +2/tick, so a
    // particle spawned at trace S dies at trace S+26. The RECALL window's
    // frame-1121 stolen tick (the party-summary sprite-sheet work §8.3 notes)
    // skips one destroy, shifting the i>=6 particles to S+27; the send-in
    // window's healthbox-slide-start stolen tick (1204, see the freeze note on
    // the caller's radius) likewise shifts every particle to S+27.
    // Rendered one tick behind the RAM receipt, a particle survives on screen
    // THROUGH the destroy-tick's rendered frame (the frame showing the tick
    // before the destroy), so the alive test is `traceFrame > destroyTick`.
    const destroyTick = window === "recall"
      ? start + 26 + i + (recallStolenTick && i >= 6 ? 1 : 0)
      : start + 27 + i;
    if (traceFrame > destroyTick) continue;
    const age = traceFrame - start - 2 - i;
    if (age < 0) continue;
    const frozen =
      (window === "recall" && recallStolenTick && traceFrame >= 1122 && i >= 6)
      || (window === "send-in" && traceFrame >= 1205);
    out.push(Object.freeze({ i, age, frozen, dx: 0, dy: 0 }));
  }
  return out;
}



export type MidBattleSwitchFadeAt = Readonly<{ bg: number; obj: number }>;

/**
 * ISSUES #78 residual (1): the resolution presentation's `fadeTick` clock
 * starts at 0 on the tick the null-handoff confirm phase first renders, i.e.
 * the staged voluntary-switch fixture's frame 1035 (the field-hold after the
 * party-menu close -- `docs/mid-battle-switch-presentation-ground-truth.md`
 * §2, pinned by `tests/factoryVoluntarySwitchSeam.test.ts`). `traceFrame =
 * MID_BATTLE_SWITCH_FADE_BASE_TRACE + fadeTick`, so the fade windows
 * (recall 1088-1131, send-in 1187-1231) map onto the real trace timeline even
 * though each spans several presentation commands.
 */
export const MID_BATTLE_SWITCH_FADE_BASE_TRACE = 1035;
/** ais2: the staged voluntary fixture's trace frame of the recall (`switch-out`) command's elapsed 0 (CONTROLLER_RETURNMONTOBALL, 1086). */
export const MID_BATTLE_SWITCH_OUT_TRACE = 1086;
const MID_BATTLE_SWITCH_RECALL_END_TRACE = 1140;

/**
 * ais2: `GetBattlerYDeltaFromSpriteId` of the opponent (battle_anim_mons.c:1897-1941): `gMonFrontPicCoords[species].y_offset`, or
 * `sCastformElevations[form]` for a CASTFORM. `SetBattlerSpriteYOffsetFromYScale`'s feet anchor reads it.
 */
export function opponentBattlerYDelta(art: BattleCommandFieldArtBattler): number {
  return art.castformForm !== undefined ? battleCommandFieldArtElevation(art, "opponent") : art.coords.yOffset;
}

/**
 * ais3: `GetBattlerYDeltaFromSpriteId` of the player: `gMonBackPicCoords[species].y_offset` (the transformed species while Transformed),
 * `sCastformBackSpriteYCoords[form]` (all 0) for a CASTFORM. The recall feet anchor read the staged fixture's RATTATA 13 for any species before.
 */
export function playerBattlerYDelta(art: BattleCommandFieldArtBattler): number {
  return art.speciesSymbol === "CASTFORM" ? 0 : art.coords.yOffset;
}

/**
 * ISSUES #78 residual (1): the mid-battle switch white ball-fade, ported as a
 * mechanism (`BeginNormalPaletteFade`/`LaunchBallFadeMonTask`,
 * `palette.c:156-200,406-490`, `battle_anim_throw.c:2033-2102`), keyed to the
 * staged trace's own frame timeline (see `MID_BATTLE_SWITCH_FADE_BASE_TRACE`).
 *
 * `bg` is the frame's effective white coefficient for the battle-field BG rows
 * 1-3: the fade's `y` steps by `deltaY=2` every second `UpdatePaletteFade`,
 * BG rows are only re-blended on the BG-toggle frames, and the rendered frame
 * shows that blend two ticks after the stepping tick (`bg[N] = y[N-2]`,
 * pixel-verified across every frame of the recall window). `obj` is the
 * `Task_FadeMon_ToBallColor`/`_Step` ball ramp: +1/frame 0->16 on the recall,
 * held 16, then -1/frame 16->0 on the send-in (independent of the BG/OBJ
 * toggle, unlike the white fade); it lags the same one frame behind the §8.3
 * per-tick state.
 *
 * The two stolen ticks are the documented ground truth, not the ideal curve
 * (§8.3 notes): the party-summary sprite-sheet work steals the update at
 * recall frame 1121 (white-out steps shift one frame later), and the
 * healthbox-slide start steals it at send-in frame 1205 (plateau runs one tick
 * longer).
 *
 * Render-lag: the oracle's RENDERED frame shows the palette one tick behind
 * the §8.3 tables (`rendered[N] = table[N-1]`, so the white coefficient at
 * frame N is the fade's `y` two ticks earlier -- pixel-verified across every
 * frame of the recall window, and the mon's ball ramp lags identically). The
 * caller therefore passes the render frame and gets the coefficients for that
 * frame directly.
 */
export function midBattleSwitchFadeAt(
  traceFrame: number,
  /** ais2: false = the recall's white-out without the frame-1121 stolen tick (the opponent's recall). */
  recallStolenTick = true,
): MidBattleSwitchFadeAt | null {
  // The §8.3 tables are the fade's per-tick STATE; the oracle's rendered
  // frame lags one tick behind them, so each coefficient is the table value
  // at `traceFrame - 1` (i.e. the white fade's `y` at `traceFrame - 2`).
  const inRecall = traceFrame >= 1088 && traceFrame <= 1139;
  if (inRecall) {
    return Object.freeze({
      bg: recallWhiteCoefficientAtFrame(traceFrame - 2, recallStolenTick),
      obj: Math.max(0, Math.min(16, traceFrame - 1090)),
    });
  }
  const inSendIn = traceFrame >= 1187 && traceFrame <= 1231;
  if (inSendIn) {
    return Object.freeze({
      bg: sendInWhiteCoefficientAtFrame(traceFrame - 2),
      obj: traceFrame - 1 < 1211
        ? 16
        : Math.max(0, 16 - (traceFrame - 1 - 1210)),
    });
  }
  return null;
}

function recallWhiteCoefficientAtFrame(frame: number, stolenTick = true): number {
  const k = frame - 1088;
  if (k < 0) return 0;
  if (k <= 16) return 2 * Math.floor((k + 1) / 2); // white in 1088-1104
  if (k <= 21) return 16; // plateau 1105-1109 (softwareFadeFinishing)
  if (k <= 38) {
    // White out 1110-1126. The frame-1121 stolen tick (heavy party-summary
    // sprite-sheet work) skips that frame's update: y holds at 6 for three
    // ticks (1119-1121), and the remaining steps shift one frame later.
    if (stolenTick && k === 33) return 6;
    const shifted = stolenTick && k >= 34 ? k - 1 : k;
    return 16 - 2 * Math.ceil((shifted - 22) / 2);
  }
  return 0; // finishing 1128-1131 clears, then idle
}

function sendInWhiteCoefficientAtFrame(frame: number): number {
  return sendInWhiteCoefficient(frame - 1187, true);
}

/**
 * The send-in white fade's `y` k ticks after its launch (`LaunchBallFadeMonTask(TRUE, ...)`: white in 0 -> 16 at 2 per second tick,
 * plateau, white out). `slideStolenTick`: the player send-in's healthbox-slide start steals one update inside the plateau (1203-1208
 * runs one tick longer); an opponent send-in's species-keyed slide starts long after the fade (send-in +70 or later), so its plateau
 * is the unstolen one (snd145: dense Scene ON windows, docs/snd145-send-in-tail-live.md).
 */
function sendInWhiteCoefficient(k: number, slideStolenTick: boolean): number {
  if (k < 0) return 0;
  if (k <= 15) return 2 * Math.floor((k + 2) / 2); // white in 1187-1202 (launch already stepped)
  const plateauEnd = slideStolenTick ? 22 : 21;
  if (k <= plateauEnd) return 16; // plateau 1203-1208 (healthbox-slide stolen tick extends it)
  if (k <= 38) return Math.max(0, 16 - 2 * Math.ceil((k - plateauEnd) / 2)); // white out 1209-1224
  return 0; // finishing 1226-1230 clears, then idle
}

/**
 * snd145 (ISSUES #146 remainder): the trace frame of the staged voluntary fixture at a PLAYER switch-in's elapsed (its `switch-in`
 * starts at 1140, docs/mid-battle-switch-presentation-ground-truth.md §2) -- the send-in fade / particle windows (1187-1231) are this
 * command's elapsed 47-91 on every player send-in.
 */
export const MID_BATTLE_SWITCH_PLAYER_SEND_IN_TRACE = 1140;
/**
 * snd145: an OPPONENT switch-in's ball opens at elapsed 18 (`SpriteCB_ReleaseMonFromBall`: StartSpriteAnim(sprite, 1),
 * AnimateBallOpenParticles and LaunchBallFadeMonTask in one tick); the rendered fade / particle clock is the player's 30 elapsed
 * earlier (the player ball opens at its elapsed 48 on the same convention), measured on dense Scene ON windows.
 */
export const MID_BATTLE_SWITCH_OPPONENT_SEND_IN_PARTICLE_START = 17;

/**
 * snd145 (ISSUES #146 remainder): the send-in half of the ball-open white fade, keyed to the `switch-in` command's own elapsed for
 * EVERY send-in (voluntary, forced Roar / Whirlwind, faint replacement; `SpriteCB_ReleaseMonFromBall` -> `LaunchBallFadeMonTask(TRUE,
 * battler, 14, ...)`, pokeball.c:750-758, fades BG palettes 1-3 white whichever side sends). The player keeps the voluntary
 * fixture's windows (its `obj` ramp blends the player mon); the opponent's `obj` is 0 (its release tint is the switch-in sprite's own
 * `monTintCoefficient`). Null outside the window.
 */
export function midBattleSwitchSendInFadeAt(elapsed: number, battler: 0 | 1): MidBattleSwitchFadeAt | null {
  if (battler === 0) {
    const traceFrame = MID_BATTLE_SWITCH_PLAYER_SEND_IN_TRACE + elapsed;
    return traceFrame >= 1187 ? midBattleSwitchFadeAt(traceFrame) : null;
  }
  const k = elapsed - MID_BATTLE_SWITCH_OPPONENT_SEND_IN_PARTICLE_START - 2;
  if (k < -2 || k > 38) return null;
  return Object.freeze({ bg: sendInWhiteCoefficient(k, false), obj: 0 });
}

/**
 * snd145: the send-in half of the ball-open particle burst at the `switch-in` command's elapsed, for every send-in. Player: the
 * voluntary fixture's send-in schedule (base (72,123), the slide-start stolen tick); opponent: the same 16-particle program spawned
 * from elapsed 17 (one per tick, rendered from spawn + 2, destroyed at spawn + 26: no stolen tick inside the window). Null outside.
 */
export function midBattleSwitchSendInParticlesAt(
  elapsed: number,
  battler: 0 | 1,
  /** pfb229: the player send-in's mon sprite y keying the burst's origin (omitted = the fitted 93: y 119). */
  playerMonY?: number,
): Readonly<{ window: "send-in" | "opponent-send-in"; schedules: readonly MidBattleSwitchParticle[]; originY?: number }> | null {
  if (battler === 0) {
    const traceFrame = MID_BATTLE_SWITCH_PLAYER_SEND_IN_TRACE + elapsed;
    return traceFrame >= MID_BATTLE_SWITCH_SEND_IN_PARTICLE_START_TRACE
      ? Object.freeze({
          window: "send-in",
          schedules: midBattleSwitchParticleSchedulesAt(traceFrame, "send-in"),
          ...(playerMonY === undefined ? {} : { originY: midBattleSwitchSendInParticleY(playerMonY) }),
        })
      : null;
  }
  const start = MID_BATTLE_SWITCH_OPPONENT_SEND_IN_PARTICLE_START;
  const out: MidBattleSwitchParticle[] = [];
  for (let i = 0; i < 16; i += 1) {
    if (elapsed > start + 26 + i) continue;
    const age = elapsed - start - 2 - i;
    if (age < 0) continue;
    out.push(Object.freeze({ i, age, frozen: false, dx: 0, dy: 0 }));
  }
  return elapsed >= start && elapsed <= start + 26 + 15 ? Object.freeze({ window: "opponent-send-in", schedules: out }) : null;
}

export type BattleResolutionRenderEffect =
  | Readonly<{ type: "move"; request: BattleMoveAnimationRequest; age: number; paletteInput?: LiveMovePaletteInput; spriteAllocatorInput?: LiveMoveSpriteAllocatorInput; spriteOrderInput?: LiveMoveSpriteOrderInput; presentationRng?: LiveMovePresentationRngInput; battlerX2Input?: LiveMoveBattlerX2Input;
      /** shadow105: lead row 0 of a lead > 0 command, the ROM's activation row (its OAM still shows the elevated-opponent shadow). */
      preActivationRow?: true }>
  /** S10A Substitute fade (liveSubstituteFade.ts): command age; the other battler's rest from the tracked x2 history. */
  | Readonly<{ type: "substitute-fade"; battler: 0 | 1; age: number; battlerX2Input?: LiveMoveBattlerX2Input }>
  /**
   * scd112 (S10A, ISSUES #166 slice d): General_StatsChange of the battler (animArg `argument`) at command age; `battlerX2Input` is
   * the tracked x2 history (present only in Scene ON, where the orchestrator's x2 host exists; absent = no residual x2).
   */
  | Readonly<{ type: "stats-change"; battler: 0 | 1; argument: number; age: number; battlerX2Input?: LiveMoveBattlerX2Input }>
  /**
   * sar131 (S10A, ISSUES #168 slice SA4): B_ANIM_STATUS_* `animation` of the battler at command age (drawn: statusAnimation.ts
   * liveStatusAnimationRow; others leave the field as it is); `battlerX2Input` = the tracked x2 history (Scene ON only).
   * sad133: `inflicted` = the command right after the battler's `status` command (sa125 SA3: a status the script just set).
   */
  | Readonly<{
      type: "status-animation"; battler: 0 | 1; animation: string; age: number; battlerX2Input?: LiveMoveBattlerX2Input; inflicted?: true;
    }>
  /**
   * fpp150 (ISSUES #139): a general animation (B_ANIM_FOCUS_PUNCH_SETUP) at the reducer's rel (= command age - 1; fps147 §4d);
   * drawn by battleScene.ts generalAnimationRenderView (src/animation/focusPunchSetUp.ts). `battlerX2Input` as status-animation.
   */
  | Readonly<{
      type: "general-animation"; battler: 0 | 1; animation: string; age: number; battlerX2Input?: LiveMoveBattlerX2Input;
      /** cff230: a CASTFORM_CHANGE's target form; its `age` is the morph body row (negative before the body starts). */
      castformForm?: number;
    }>
  | Readonly<{
      type: "hit";
      battler: 0 | 1;
      healthboxY2: number;
      targetInvisible: boolean;
    }>
  | Readonly<{
      type: "stat";
      battler: 0 | 1;
      stat: Extract<BattleResolutionPresentationCommand, { type: "stat" }>["stat"];
      from: number;
      to: number;
      age: number;
    }>
  | Readonly<{
      type: "status";
      battler: 0 | 1;
      before: number;
      after: number;
      age: number;
    }>
  | Readonly<{
      type: "faint";
      battler: 0 | 1;
      healthboxVisible: boolean;
      sink:
        | Readonly<{
            type: "opponent-tile-rows";
            keptRows: number;
            y2: number;
          }>
        | Readonly<{
            type: "player-pixel-rows";
            skipPixelRows: number;
          }>;
    }>;

export type BattleResolutionPresentationRenderView = Readonly<{
  field: BattleResolutionDisplayedField;
  fieldArt: BattleCommandFieldArtView;
  healthboxes: Readonly<{
    player: HealthboxContentParams & Readonly<{ currentHp: number; maxHp: number }>;
    opponent: HealthboxContentParams;
  }>;
  message: Readonly<{
    lines: readonly string[];
    visibleCharacters: number;
  }> | null;
  effect: BattleResolutionRenderEffect | null;
  /**
   * ISSUES #147: true on the ordinary rows right after a live move body whose
   * ROM script outlives its accepted window (`SpriteCB_EnemyShadow` keeps the
   * elevated-opponent shadow hidden while `gAnimScriptActive`); see
   * LIVE_MOVE_OPPONENT_SHADOW_POST_BODY_HIDE_ROWS. Absent means false.
   */
  postBodyShadowHidden?: boolean;
  visibility: Readonly<{
    player: Readonly<{ sprite: boolean; healthbox: boolean }>;
    opponent: Readonly<{ sprite: boolean; healthbox: boolean }>;
  }>;
  waitCursor: Readonly<{ age: number }> | null;
  bottom: "fight" | "message" | "blank";
  confirmHandoff: Readonly<{
    idleBounceElapsed: number;
    bounceReset: boolean;
    fightMenu: Readonly<{
      moveset: FightMoveset;
      displayCursor: 0 | 1 | 2 | 3;
    }>;
    /**
     * enc276: a forced move was confirmed with no move menu, so the bottom strip is not the fight chrome: the live action menu
     * (Encore) or the dismissed "has no moves left!" box (Struggle, fully typed, no wait ▼).
     */
    forcedBottom: Readonly<
      | { kind: "encore"; prompt: string }
      | { kind: "struggle"; lines: readonly string[]; waitCursorAge: number }
    > | null;
  }> | null;
  switchIn: Readonly<{
    elapsed: number;
    phase: PartySendOutPhase;
    /** pfr192: the faint-replacement send-in's keyed clock (null = the canonical MAGBY / Scene ON constants). */
    timing: PartySendOutTiming | null;
    battler: 0 | 1;
  }> | null;
  /**
   * ISSUES #78: the mid-battle voluntary switch-in presentation, populated
   * while the `switch-in` command is current in the ordinary `presenting`
   * phase (the forced-switch path uses `switchIn` + the party-select clock
   * instead). `renderBattleResolutionSceneOffView` draws the ball throw and
   * ball-release emerge from this; `midBattleSwitchInAt` supplies the
   * per-frame state from the command's own phaseElapsed.
   */
  midBattleSwitchIn: MidBattleSwitchInView | null;
  /**
   * ISSUES #78 slice 4: the voluntary-switch return-to-ball presentation,
   * populated while the `switch-out` command is current in the `presenting`
   * phase. `renderBattleResolutionSceneOffView` draws the outgoing mon's
   * affine scale-up (and then nothing once freed) from this; the recall
   * receipt that follows the span commits the hidden sprite/healthbox.
   */
  switchOut: MidBattleSwitchOutView | null;
  partySummary: Readonly<{
    battler: 0 | 1;
    states: readonly import("./battleResolutionPresentation.ts").PartyBallState[];
    /** obr251: frames since the bar's creation (draw command start minus its script lead); negative before the bar exists. */
    createAge: number;
    /** obr251: frames since the hide command began (the BLDALPHA fade-out runs on across later commands); null while shown. */
    fadeAge: number | null;
  }> | null;
  /**
   * ISSUES #78 residual (1): the white ball-fade's per-frame blend
   * coefficients, active only inside the two measured windows
   * (`docs/mid-battle-switch-presentation-ground-truth.md` §8.3). `bg` is the
   * white-fade coefficient for the battle-field BG rows 1-3 (0..16, `<<4`
   * scale); `obj` is the POKE BALL blend coefficient for the player mon's
   * OBJ row (`gBallOpenFadeColors[BALL_POKE] = 0x7ADF`, 16 = fully ball
   * colored). The message window and both healthboxes are never faded. Null
   * outside the windows.
   */
  midBattleSwitchFade: Readonly<{ bg: number; obj: number; /** ais2: the battler whose OBJ row `obj` blends (default 0, the player's recall / send-in). */ objBattler?: 0 | 1 }> | null;
  /**
   * §10.2 residual 1b: the mid-battle switch ball-open particles (recall
   * 1089-1130 base (72,112) prio 2, send-in 1187-1228 base (72,123) prio 1).
   * `schedules` carries each alive particle's spawn index + rendered age; the
   * scene renderer applies the Sin/Cos radial offsets and the tile cycle.
   */
  midBattleSwitchParticles: Readonly<{
    /** snd145: "opponent-send-in" = an opponent switch-in's burst at the opponent ball (base (176,59), prio 1, no terrain clip). */
    window: "recall" | "send-in" | "opponent-send-in" | "opponent-recall";
    schedules: readonly MidBattleSwitchParticle[];
    /** pfb229: a Scene ON player send-in's species-keyed burst y (omitted = the fitted 119). */
    originY?: number;
    /** ais2: the "opponent-recall" burst's drawn origin (base (176, 72) = GetBattlerSpriteCoord + 32, less the 8x8 tile's 4). */
    originX?: number;
  }> | null;
  /**
   * The terminal win/loss-text trainer slide-in/out, generic across any
   * trainer/outcome (`docs/terminal-seam-round-flow-scout.md` §3(iii)).
   * `offscreenX2` is the ported `SpriteCB_TrainerSlideIn` step (see
   * `TRAINER_SLIDE_TIMING`'s doc): 0 once fully settled on screen, positive
   * while still sliding off the right edge. The renderer owns the absolute
   * screen position; this view only exposes the relative offset.
   */
  trainerSlide: Readonly<{
    battler: 0 | 1;
    picSymbol: string | null;
    offscreenX2: number;
  }> | null;
}>;

export type BattleResolutionPresentationRenderAssets = Readonly<{
  drawScene(
    framebuffer: Uint8Array,
    view: BattleResolutionPresentationRenderView,
  ): void;
  /**
   * contain209: the decline path's static draw (battleScene.ts renderBattleResolutionSceneOffView) a contained command falls
   * back to; absent = no containment (a draw throw propagates). Draws onto a zeroed framebuffer.
   */
  drawStaticScene?(
    framebuffer: Uint8Array,
    view: BattleResolutionPresentationRenderView,
  ): void;
}>;

function uiStatusFromStatus1(status1: number): BattleCommandUiStatus {
  if (
    (status1 & BATTLE_SCRIPT_STATUS1_POISON) !== 0
    || (status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0
  ) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "freeze";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralysis";
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  return "none";
}

function replaceFieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  replacement: BattleCommandFieldBattler,
): BattleResolutionDisplayedField {
  return Object.freeze(
    battler === 0
      ? { player: replacement, opponent: field.opponent }
      : { player: field.player, opponent: replacement },
  );
}

function fieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): BattleCommandFieldBattler {
  return battler === 0 ? field.player : field.opponent;
}

function withDisplayedHp(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  hp: number,
): BattleResolutionDisplayedField {
  return replaceFieldBattler(
    field,
    battler,
    Object.freeze({ ...fieldBattler(field, battler), hp }),
  );
}

function withDisplayedStatus(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  status1: number,
): BattleResolutionDisplayedField {
  return replaceFieldBattler(
    field,
    battler,
    Object.freeze({
      ...fieldBattler(field, battler),
      status: uiStatusFromStatus1(status1),
    }),
  );
}

function withSubstituteDoll(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  doll: boolean,
): BattleResolutionDisplayedField {
  const current = fieldBattler(field, battler);
  if ((current.substituteDoll === true) === doll) return field;
  const { substituteDoll: _shown, ...mon } = current;
  return replaceFieldBattler(field, battler, Object.freeze(doll ? { ...mon, substituteDoll: true as const } : mon));
}

/**
 * Presentation-only Substitute doll at a command's START (prep37 s2-3): the ROM swaps the doll back to the mon
 * (SUBSTITUTE_TO_MON) before a faint or a switch-out's return to ball (battle_controller_player.c:2249, 2412). The fade
 * (General_SubstituteFade, liveSubstituteFade.ts) clears it at its own command's start and draws the battler itself on
 * every row; it ends on the mon before STRINGID_PKMNSUBSTITUTEFADED prints (that message's clear is the fallback when no
 * fade command precedes it). A switch-in's send-in shows the mon; a Baton Pass carry re-shows the doll only once the
 * switch-in completes.
 */
export function substituteDollAtCommandStart(
  field: BattleResolutionDisplayedField,
  command: BattleResolutionPresentationCommand,
): BattleResolutionDisplayedField {
  if (command.type === "faint" || command.type === "switch-out" || command.type === "substitute-fade") {
    return withSubstituteDoll(field, command.battler, false);
  }
  if (command.type === "message" && command.substituteFadeBattler !== undefined) {
    return withSubstituteDoll(field, command.substituteFadeBattler, false);
  }
  return field;
}

/**
 * Presentation-only Substitute doll after a COMPLETED command: a completed Substitute body (move 164's
 * MOVE_ANIMATION request; the ROM's doll latch is body row 86, behindSubstitute at 87) shows its attacker as the doll;
 * a switch-in shows its incoming battler as the settled field does (a Baton Pass carry keeps STATUS2_SUBSTITUTE, so
 * the incoming snapshot is a doll; any other switch-in clears it). Never read by rules, RNG or the queue.
 */
export function applySubstituteDollCommand(
  field: BattleResolutionDisplayedField,
  command: BattleResolutionPresentationCommand,
): BattleResolutionDisplayedField {
  const started = substituteDollAtCommandStart(field, command);
  if (command.type === "move-animation" && command.animation?.moveId === 164) {
    return withSubstituteDoll(started, command.battler, true);
  }
  return started;
}

function applyCompletedCommand(
  field: BattleResolutionDisplayedField,
  command: BattleResolutionPresentationCommand,
): BattleResolutionDisplayedField {
  field = applySubstituteDollCommand(field, command);
  // trf174: a completed Transform body leaves its attacker showing the copied species (HandleSpeciesGfxDataChange; both scenes play
  // it). The ROM transforms whether or not the body is drawn live; a switch-in below replaces the battler (the revert).
  if (command.type === "move-animation" && command.animation?.moveId === LIVE_TRANSFORM_MOVE_ID
    && command.animation.attacker !== command.animation.target) {
    field = withLiveTransform(field, command.animation.attacker === 0 ? 0 : 1, liveTransformOf(command.animation, field));
  }
  if (command.type === "hp") {
    return withDisplayedHp(field, command.battler, command.to);
  }
  if (command.type === "status-icon") {
    return withDisplayedStatus(field, command.battler, command.status1);
  }
  if (
    command.type === "message"
    || command.type === "move-animation"
    || command.type === "hit-animation"
    || command.type === "stat"
    // The raw status write is logical battle state. The later
    // status-icon controller receipt owns the visible healthbox transition.
    || command.type === "status"
    || command.type === "faint"
    || command.type === "party-summary"
    || command.type === "sprite-visibility"
    || command.type === "switch-out"
    || command.type === "turn-end"
    || command.type === "trainer-slide"
    || command.type === "substitute-fade"
    || command.type === "stats-change"
    // sa125 / sar131: the field stays as it is; the status-animation effect draws over it (battleScene.ts statusAnimationRenderView).
    || command.type === "status-animation"
    // fpp150: likewise the general animation (battleScene.ts generalAnimationRenderView).
    || command.type === "general-animation"
  ) return field;
  if (command.type === "switch-in") {
    return replaceFieldBattler(field, command.battler, command.incoming);
  }
  throw new Error("battle resolution renderer received an unknown command");
}

/**
 * ROM first identity rotation display (heldItemHeal.ts age 0), in frames after the HELD_ITEM_EFFECT command starts. The ROM's first
 * print glyph is exactly age 0 + SITRUS_ITEM_HEAL_TEXT_FIRST_AGE and the command lasts until that print, so age 0 is the command's
 * length less that age, on every path (restart 25, continuation 19; docs/hie2-held-item-render.md). Negative for the cure berry (-12):
 * its animation starts that many frames inside the preceding 32-frame status command, so the held-item view starts at age 12.
 */
/** wsh2: frames after the command starts that the General_* script's first command runs (age 0 of its draw; docs/wsh1-general-anim-commands.md). */
const GENERAL_SCRIPT_START_FRAMES: Readonly<Record<string, number>> = Object.freeze({ FOCUS_BAND: 8 });

function heldItemEffectAge0Frames(minimumFrames: number): number {
  return minimumFrames - SITRUS_ITEM_HEAL_TEXT_FIRST_AGE;
}

/** The displayed field at the start of `commands[index]`: `field` after the completed commands before it (currentCommandField's walk). */
export function battleResolutionFieldBeforeCommand(
  field: BattleResolutionDisplayedField,
  commands: readonly BattleResolutionPresentationCommand[],
  index: number,
): BattleResolutionDisplayedField {
  for (let completed = 0; completed < index; completed += 1) field = applyCompletedCommand(field, commands[completed]!);
  return field;
}

/**
 * The displayed field at the segment's move-animation command of `eventSequence` (the segment's field after the commands before it,
 * as currentCommandField builds the presented command's field), or null when the segment has no such command. S10A gdgeo: the
 * sprite-order host keys the Giga Drain / Mega Drain body plans by these species (liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText).
 */
export function battleResolutionMoveAnimationField(
  segment: Readonly<{ field: BattleResolutionDisplayedField; commands: readonly BattleResolutionPresentationCommand[] }>,
  eventSequence: number,
): BattleResolutionDisplayedField | null {
  let field = segment.field;
  for (const command of segment.commands) {
    if (command.type === "move-animation" && command.eventSequence === eventSequence) return field;
    field = applyCompletedCommand(field, command);
  }
  return null;
}

/** The current command's displayed field: the segment's field after its completed commands (as the duration / completion checks see it). */
export function currentCommandField(state: BattleResolutionPresentationState): BattleResolutionDisplayedField {
  const segment = currentSegment(state);
  let field = state.field;
  for (let index = 0; index < state.commandIndex; index += 1) {
    field = applyCompletedCommand(field, segment.commands[index]!);
  }
  return field;
}

/**
 * Field-derived Random2 plan inputs of the presented move body (tickLiveMovePresentationRngSession's planContext, core.ts): the Dive setup
 * splash birth from the attacker's ball rule on the displayed field (species audit 11).
 */
export function liveMoveRandom2PlanContextAt(
  state: BattleResolutionPresentationState,
  request: BattleMoveAnimationRequest,
): LiveMoveRandom2PlanContext {
  if (request.moveId !== 291 || (request.turn & 1) !== 0) return {};
  return { diveSetupSplashBirth: liveDiveSetupSplashBirth(currentCommandField(state), request.attacker === 0 ? "player" : "opponent") };
}

function currentSegment(state: BattleResolutionPresentationState) {
  const segment = state.segments[state.segmentIndex];
  if (!segment) {
    throw new Error(
      `battle resolution renderer has no segment ${state.segmentIndex}`,
    );
  }
  if (
    !Number.isSafeInteger(state.commandIndex)
    || state.commandIndex < 0
    || state.commandIndex > segment.commands.length
  ) {
    throw new Error(
      `battle resolution renderer has invalid command index ${state.commandIndex}`,
    );
  }
  return segment;
}

/**
 * idle94 (S10A timing fidelity): the ROM's idle lead rows. The accepted window of these adapters starts N rows after the
 * gAnimScriptActive rising edge; the ROM screen on those N rows is byte-identical to the frame before the activation and to
 * window row 0 (live age 0) on both sides (tools/integration/fixtures/idle94/lead-scan, r1 == r2), so the command presents N more
 * rows showing its age-0 frame before the accepted body. Presentation timing only.
 */
const LIVE_MOVE_IDLE_LEAD_ROWS: ReadonlyMap<number, number> = new Map([
  [41, 10], [44, 10], [51, 7], [52, 4], [55, 10], [71, 10], [74, 1], [75, 13], [82, 7], [92, 7], [93, 5], [94, 5], [106, 1], [120, 4],
  [124, 4], [136, 1], [146, 13], [153, 4], [158, 4], [184, 4], [188, 4], [204, 4], [207, 7], [225, 6], [232, 4], [247, 5], [248, 5],
  [269, 10], [282, 6], [294, 1], [299, 10], [305, 7], [313, 1], [325, 8], [334, 1], [337, 6], [339, 4], [342, 7], [343, 1], [347, 3],
]);

/**
 * The idle lead rows a live move-animation command presents before its accepted body (0: declined, a Substitute swap, no lead).
 * Live audit 24 / shadow105 / shp116 (docs/next-adapters-shadow105.md): while an ELEVATED opponent is on the field the ROM's
 * activation row (lead row 0) still shows its enemy shadow, which the body's age-0 frame hides — whichever side attacks; the render
 * presents that row with `preActivationRow` (the shadow drawn).
 */
export function liveMoveIdleLeadRows(request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField): number {
  const lead = LIVE_MOVE_IDLE_LEAD_ROWS.get(request.moveId) ?? 0;
  if (lead === 0 || liveSubstituteSwapApplies(request, field) === true || liveMoveAnimationDuration(request, field) === null) return 0;
  return lead;
}

/**
 * idle98 / iu120 (S10A timing fidelity): the ROM's universal rows around every live move body (docs/next-adapters-idle98.md,
 * docs/iu120-universal-rows.md). The script reaches Cmd_attackanimation 3 frames before gAnimScriptActive rises (pre) and waitanimation
 * releases 2 frames after the first inactive frame (post) on every body: damaging, multi-hit, two-turn, KO and status moves, both sides
 * (idle98 37 / 37, idle94 20 / 20, r1 == r2). The pre rows show the image before the activation (the command's row 0: production's
 * age-0 frame, or the idle lead's activation row); the post rows show the first inactive row, which is production's last row exactly
 * when the adapter's trail is -1 (idle94 table). The pre rows come before the idle lead rows: one hold of P + N + D + T rows.
 * Presentation timing only. Masks: 1 = the player attacks, 2 = the opponent attacks.
 */
const LIVE_MOVE_PRE_ROWS = 3;
const LIVE_MOVE_POST_ROWS = 2;
// Sides whose pre rows are NOT proven to be the age-0 frame: idle lead N != 0 outside idle94's 40 static-lead moves, or N unknown.
const LIVE_MOVE_NO_PRE_ROW_SIDES: ReadonlyMap<number, number> = new Map([
  [9, 3], [20, 3], [48, 3], [53, 3], [104, 3], [105, 3], [157, 1], [185, 3], [208, 3], [209, 3], [223, 3], [227, 3], [235, 3],
]);
// Sides whose trail is -1 (production's last row is the ROM's first inactive row): the post rows repeat it.
const LIVE_MOVE_POST_ROW_SIDES: ReadonlyMap<number, number> = new Map([
  [2, 3], [5, 3], [11, 3], [12, 3], [14, 3], [21, 3], [23, 3], [25, 3], [27, 3], [29, 3], [32, 3], [34, 3], [35, 3], [36, 3],
  [38, 3], [39, 3], [42, 3], [43, 3], [49, 3], [50, 3], [56, 3], [60, 3], [61, 3], [62, 3], [65, 3], [66, 3], [67, 3], [68, 3],
  [69, 3], [78, 3], [79, 3], [83, 3], [85, 3], [86, 3], [87, 3], [88, 3], [90, 3], [93, 3], [94, 3], [95, 3], [97, 3], [98, 3],
  [101, 3], [103, 3], [106, 3], [107, 3], [108, 3], [109, 3], [111, 3], [112, 3], [114, 3], [115, 3], [116, 3], [118, 3], [122, 3], [126, 1],
  [129, 3], [131, 3], [133, 3], [136, 3], [147, 3], [148, 3], [151, 3], [152, 3], [154, 3], [156, 3], [162, 3], [163, 3], [172, 3], [178, 3],
  [164, 3], [180, 3], [182, 3], [186, 3], [187, 3], [192, 1], [195, 3], [197, 3], [201, 3], [203, 3], [211, 3], [212, 3], [213, 3], [214, 2], [215, 3],
  [218, 3], [219, 3], [226, 3], [230, 3], [231, 3], [236, 3], [238, 3], [242, 3], [243, 3], [246, 3], [250, 3], [253, 3], [254, 3], [257, 3],
  [259, 3], [263, 3], [264, 3], [265, 3], [266, 3], [269, 3], [271, 3], [272, 3], [275, 3], [277, 3], [280, 3], [281, 3], [283, 3], [287, 3],
  [288, 3], [290, 3], [294, 3], [302, 3], [306, 3], [312, 3], [317, 3], [319, 3], [321, 3], [332, 3], [334, 3], [335, 3], [336, 3], [339, 3],
  [341, 3], [345, 3], [348, 3], [349, 3],
]);
// ont193: the adapter trail (idle94 table) of the no-post-row bodies whose script tail is ROM-measured (btl188: Sand-Attack's waitanimation
// run is P + N + D + 1 rows). A post-row side's trail is -1 by definition; any other body has no tail (null).
// tl205 (docs/tl204-zero-tail-rows.md): the no-post-row bodies whose script tail tl204 measured against fresh ROM rows (Scene ON, twice fresh) have trail -1
// (the ROM release row is the body's last row + 1: tail frames = scriptTailRows - 1): Double Team, Rain Dance, Sunny Day, Hail, Leech Seed, Light Screen,
// Charm, Calm Mind, Scary Face. Fake Tears (313) is held out: its trail is -1 too, but its live body window is 4 rows longer than the ROM's (182 vs 178),
// so the true 5-row tail would move its residual from -1 to +4 (worse); add 313 when the Move_FAKE_TEARS body is corrected. The other zero-frame ont193 moves stay unknown (0 frames) until measured.
const LIVE_MOVE_SCRIPT_TAIL_TRAIL_ROWS: ReadonlyMap<number, number> = new Map([
  [28, 0], [104, -1], [240, -1], [241, -1], [258, -1], [73, -1], [113, -1], [204, -1], [347, -1], [184, -1],
]);
// iu120: bodies live only after idle98's evidence (base 3dd2b74b9) whose rows it never measured (lead / trail unknown): Struggle
// (stl109 / sdl119, incl. its doll cells) keeps 0 / 0.
const LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS: ReadonlySet<number> = new Set([165]);
const NO_UNIVERSAL_ROWS = Object.freeze({ pre: 0, post: 0 });

/** The universal rows a live move-animation command presents around its body (none: declined, a Substitute swap, unmeasured). */
export function liveMoveUniversalRows(
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
): { readonly pre: number; readonly post: number } {
  if (LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS.has(request.moveId) || liveSubstituteSwapApplies(request, field) === true
    || liveMoveAnimationDuration(request, field) === null) return NO_UNIVERSAL_ROWS;
  const side = request.attacker === 0 ? 1 : 2;
  return Object.freeze({
    pre: ((LIVE_MOVE_NO_PRE_ROW_SIDES.get(request.moveId) ?? 0) & side) === 0 ? LIVE_MOVE_PRE_ROWS : 0,
    post: ((LIVE_MOVE_POST_ROW_SIDES.get(request.moveId) ?? 0) & side) !== 0 ? LIVE_MOVE_POST_ROWS : 0,
  });
}

/**
 * ont193 (docs/ont193-scene-on-tails.md): the rows a Scene ON no-hit live body holds its last row after its post rows, up to the next
 * command: `scriptTailRows + trail - post` (the ROM release row is attackanimation + P + N + D + trail + 1; the body presents P + N + D +
 * post). 0 when the command has no script tail, no universal rows (unmeasured / swap / declined) or no known trail.
 */
export function liveMoveScriptTailFrames(
  timing: { readonly scriptTailRows?: number },
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
): number {
  const tailRows = timing.scriptTailRows ?? 0;
  if (tailRows <= 0) return 0;
  const rows = liveMoveUniversalRows(request, field);
  const trail = rows.post > 0 ? -1 : LIVE_MOVE_SCRIPT_TAIL_TRAIL_ROWS.get(request.moveId);
  if (trail === undefined) return 0;
  // A masked pre (Double Team: its window owns the banner) gates the tail only when the trail is unmeasured; a declined / swap / unmeasured body has none.
  if (rows.pre === 0 && (LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS.has(request.moveId) || liveSubstituteSwapApplies(request, field) === true
    || liveMoveAnimationDuration(request, field) === null)) return 0;
  return Math.max(0, tailRows + trail - rows.post);
}

// hpd4: rows the command presents after its live body (+ post) so the next command (hit controller, next script step) starts on the ROM row
// (R -> H = lead + 3 + len + 4 against the accepted live window), tuned by exact-frame matches against the ROM frames (docs/hpd1-hp-hold.md).
const HPD4_BODY_TAIL_ROWS: ReadonlyMap<number, number> = new Map([[49, 3], [82, 26], [111, 3], [205, 3], [301, 3], [69, 1]]);
function liveMoveHitTailRows(command: Extract<BattleResolutionPresentationCommand, { type: "move-animation" }>): number {
  if ((command.timing.bodyLeadFrames ?? 0) === 0 || command.animation === undefined) return 0;
  return HPD4_BODY_TAIL_ROWS.get(command.animation.moveId) ?? 0;
}

/**
 * hpd4: the body lead (`bodyLeadFrames`) is presented as the command's first rows, so the sounds (ROM-calibrated against the release row,
 * whose tables already carry the typical lead in AGE_TO_SOUND_ROWS) read the command as it was before the lead: no lead rows, and the lead
 * back in the script tail it left.
 */
function withoutBodyLead(command: Extract<BattleResolutionPresentationCommand, { type: "move-animation" }>): BattleResolutionPresentationCommand {
  const lead = command.timing.bodyLeadFrames ?? 0;
  if (lead === 0) return command;
  const { bodyLeadFrames: _lead, ...timing } = command.timing;
  // hpd5: the pre-lead clock is level-flat for Seismic Toss (its body was one 228-row window before the damage levels were measured).
  const animation = command.animation?.moveId === 69 ? { ...command.animation, damage: 50 } : command.animation;
  return Object.freeze({ ...command, animation, timing: Object.freeze(timing.scriptTailRows === undefined ? timing : { ...timing, scriptTailRows: timing.scriptTailRows + lead }) });
}

/**
 * hpd4: the rows the presented resolution's earlier move-animation commands (and the current one when `includeCurrent`) present beyond the
 * pre-lead clock the controller-side sounds (hit SE, HP bar, faint) were calibrated on: their lead rows and hit tail. A sound anchored to a command start
 * subtracts it to stay on its ROM frame.
 */
export function moveBodyExtraRows(state: BattleResolutionPresentationState, includeCurrent: boolean): number {
  const field = currentCommandField(state);
  const bodyClass = liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput);
  const moveUse = state.liveMoveBattlerX2Input?.moveUse;
  let extra = 0;
  for (let s = 0; s <= state.segmentIndex; s += 1) {
    const commands = state.segments[s]!.commands;
    const end = s === state.segmentIndex ? state.commandIndex + (includeCurrent ? 1 : 0) : commands.length;
    for (let c = 0; c < end; c += 1) {
      const command = commands[c]!;
      if (command.type !== "move-animation" || (command.timing.bodyLeadFrames ?? 0) === 0) continue;
      extra += battleResolutionCommandDuration(command, field, bodyClass, moveUse)
        - battleResolutionCommandDuration(withoutBodyLead(command), field, bodyClass, moveUse);
    }
  }
  return extra;
}

/** hpd4: the presented move-animation command's duration on the pre-lead clock (what liveMoveSourceAge's lastAge reads), for sounds scheduled from its start. */
export function presentedMoveDurationOnSoundClock(state: BattleResolutionPresentationState): number | null {
  const command = state.segments[state.segmentIndex]?.commands[state.commandIndex];
  if (command === undefined || command.type !== "move-animation") return null;
  return battleResolutionCommandDuration(withoutBodyLead(command), currentCommandField(state), liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput), state.liveMoveBattlerX2Input?.moveUse);
}

/**
 * The presented live move-animation command and its unclamped body age (aud242a, docs/aud242-move-anim-sounds.md): rows since the body's
 * age 0 (negative over the seGate / script lead / pre / idle lead rows, not held at the last body row). Null when the presented command is
 * not a live move animation (declined bodies have no ROM-faithful clock).
 */
export function liveMoveSourceAge(
  state: BattleResolutionPresentationState,
): Readonly<{ request: BattleMoveAnimationRequest; age: number; lastAge: number; attackerSpecies: number; attackerElevation: number; attackerHpQuarter: number; picOffsetY: (battler: 0 | 1) => number; topY: (battler: 0 | 1) => number }> | null {
  const segment = state.segments[state.segmentIndex];
  const command = segment?.commands[state.commandIndex];
  if (command === undefined || command.type !== "move-animation" || command.animation === undefined) return null;
  const field = currentCommandField(state);
  if (liveMoveAnimationDuration(command.animation, field) === null) return null;
  const seGate = (command.timing.seGateFrames ?? 0) + (command.timing.scriptLeadFrames ?? 0);
  const pre = liveMoveUniversalRows(command.animation, field).pre;
  const age = state.lifecycle.phaseElapsed - seGate - pre;
  // aud260: the age of the command's last presenting row (the command completes when phaseElapsed + 1 >= its duration), for the sound-only tail past the window.
  const duration = battleResolutionCommandDuration(withoutBodyLead(command), field, liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput), state.liveMoveBattlerX2Input?.moveUse);
  const lastAge = duration - 1 - seGate - pre;
  // aud242l: BATTLER_COORD_Y_PIC_OFFSET (GetBattlerSpriteFinal_Y(..., TRUE)) of the live battler, read only by the pic-dependent sprite lifetimes of the sound timing table.
  const picOffsetY = (battler: 0 | 1): number => liveBattlerAnchors(battler === 0 ? "player" : "opponent", createBattleCommandFieldArtView(field)).picOffsetPoint.y;
  // aud262: BATTLER_COORD_ATTR_TOP (GetBattlerSpriteCoordAttr, battle_anim_mons.c): the pic Y minus half the species' pic height (the Memento shadow tasks).
  const topY = (battler: 0 | 1): number => picOffsetY(battler) - Math.trunc(createBattleCommandFieldArtView(field)[battler === 0 ? "player" : "opponent"].coords.height / 2);
  // aud262: GetBattlerYCoordWithElevation reads the species (a Substitute doll does not hide it): the attacker's gEnemyMonElevation / sCastformElevations, 0 for the player.
  const attackerSide = command.animation.attacker === 0 ? "player" : "opponent";
  const attackerArt = createBattleCommandFieldArtView(field)[attackerSide];
  const { substituteDoll: _doll, ...undolledArt } = attackerArt;
  const attackerElevation = battleCommandFieldArtElevation(undolledArt, attackerSide);
  // aud262: GetWaterSpoutPowerForAnim (battle_anim_water.c:1139-1170): maxhp / 4 (integer), the first i < 3 with hp < maxhp * (i + 1), else 3.
  const attackerMon = fieldBattler(field, command.animation.attacker);
  const quarterHp = Math.trunc(attackerMon.maxHP / 4);
  const attackerHpQuarter = [0, 1, 2].find((i) => attackerMon.hp < quarterHp * (i + 1)) ?? 3;
  return Object.freeze({ request: command.animation, age, lastAge, attackerSpecies: attackerMon.species, attackerElevation, attackerHpQuarter, picOffsetY, topY });
}

const STATS_CHANGE_AFTER_BODY_AGE_SHIFT = 4;

/**
 * aud248: the presented stats-change command and its age (rows since the animation's rel 0, after the IsBattleSEPlaying gate; the same age as the
 * `stats-change` render effect). Null when another command is presented, before the gate, or behind a Substitute (the ROM plays nothing).
 */
export function statsChangeSourceAge(
  state: BattleResolutionPresentationState,
): Readonly<{ battler: 0 | 1; argument: number; age: number; direction: "up" | "down" }> | null {
  const command = state.segments[state.segmentIndex]?.commands[state.commandIndex];
  if (command === undefined || command.type !== "stats-change") return null;
  const previous = state.segments[state.segmentIndex]!.commands[state.commandIndex - 1];
  // hpd4: after an audited body the command starts on the ROM's gAnimScriptActive edge (+1), so the SE (ROM: edge + 4) is 4 rows earlier than the
  // generic age that absorbed the old early start (aud242o Defense Curl windows: SE 175 vs command 172).
  const afterBodyLead = previous?.type === "move-animation" && (previous.timing.bodyLeadFrames ?? 0) > 0 ? STATS_CHANGE_AFTER_BODY_AGE_SHIFT : 0;
  const age = state.lifecycle.phaseElapsed - (command.timing.seGateFrames ?? 0) + afterBodyLead;
  if (age < 0 || fieldBattler(currentCommandField(state), command.battler).substituteDoll === true) return null;
  // The pure General_StatsChange reducer's params (null for an argument it rejects: the ROM plays nothing); read here so the sound
  // emitter stays outside the animation boundary (tests/animation/animationBoundaryRatchet.test.ts).
  const params = statsChangeParams(command.argument);
  if (params === null) return null;
  return Object.freeze({ battler: command.battler, argument: command.argument, age, direction: params.direction });
}

/** The body age shown on this row: held at 0 over the pre + lead rows and at the last body row over the post rows. */
function liveMoveUniversalRowAge(
  state: BattleResolutionPresentationState,
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
  // sgs134: HandleMoveAnimation's IsBattleSEPlaying rows (a multi-hit's 2nd+ hit), presented before the pre rows.
  seGate = 0,
  scriptTail = 0,
): number {
  const rows = liveMoveUniversalRows(request, field);
  const age = Math.max(0, state.lifecycle.phaseElapsed - seGate - rows.pre - liveMoveIdleLeadRows(request, field));
  if (rows.post === 0 && scriptTail === 0) return age;
  const live = liveMoveAnimationDuration(request, field, liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput),
    state.liveMoveBattlerX2Input?.moveUse);
  return live === null ? age : Math.min(age, live - 1);
}

/**
 * lsd198 (docs/lsd198-leech-seed-drain-animation.md): General_LeechSeedDrain is `createvisualtask AnimTask_GetBattlersFromArg, 5; delay 0;
 * goto Move_ABSORB`. playanimation hands the script gBattleScripting.animArg1 | animArg2 << 8 (battle_script_commands.c Cmd_playanimation;
 * battle_util.c ENDTURN_LEECH_SEED sets animArg1 = gBattlerTarget = the HP receiver, animArg2 = gBattlerAttacker = the seeded mon) and the task
 * writes gBattleAnimAttacker = animArg & 0xff, gBattleAnimTarget = animArg >> 8 (battle_anim_throw.c): the ABSORB body's attacker (the healed
 * side, orbs fly to it) is the seed's owner, its target (hit splat, drained) the seeded battler = the command's `battler` (the healthbarupdate
 * BS_ATTACKER). Singles: the owner is the other battler. The body is the existing live ABSORB adapter (liveMoveAnimation.ts case 71, 194 rows).
 */
export const LEECH_SEED_DRAIN_ABSORB_MOVE_ID = 71;
export const LEECH_SEED_DRAIN_BODY_START_AGE = 21;
const LEECH_SEED_DRAIN_BODY_ROWS = 194;

function leechSeedDrainAbsorbEffect(
  command: Extract<BattleResolutionPresentationCommand, { type: "general-animation" }>,
  state: BattleResolutionPresentationState,
): BattleResolutionRenderEffect | null {
  const age = state.lifecycle.phaseElapsed - LEECH_SEED_DRAIN_BODY_START_AGE;
  if (age < 0 || age >= LEECH_SEED_DRAIN_BODY_ROWS) return null;
  const owner = command.battler === 0 ? 1 : 0;
  const request: BattleMoveAnimationRequest = Object.freeze({
    moveId: LEECH_SEED_DRAIN_ABSORB_MOVE_ID, attacker: owner, target: command.battler, turn: 0, power: 0, damage: 0, friendship: 0, multihit: 0,
    // TryHandleLaunchBattleTableAnimation runs the script from Task_ClearBitWhenBattleTableAnimDone (absorbAtAge `taskHostedScript`).
    taskHostedScript: true,
  });
  return Object.freeze({
    type: "move", request, age,
    spriteOrderInput: state.liveMoveSpriteOrderInput,
    ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
  });
}
/**
 * wth236: an end-turn weather animation (General_Rain / Sun / Sandstorm / Hail) over the field: the weather move's own body
 * (Rain Dance 240 / Sunny Day 241 / Sandstorm 201 / Hail 258) launched from the general table, with the ROM's battler 0 as the
 * attacker. Command age a = ROM row X + 1 + a (X = the playanimation row); the script is active from X + 2, so the body's age is
 * a - 1 for WEATHER_CONTINUES_BODY_ROWS rows; before and after it the field stands as it is (null).
 */
function weatherContinuesBodyEffect(
  command: Extract<BattleResolutionPresentationCommand, { type: "general-animation" }>,
  state: BattleResolutionPresentationState,
  presentationRngHost: LiveMovePresentationRngInput["host"] | undefined,
): BattleResolutionRenderEffect | null {
  if (!isWeatherContinuesAnimation(command.animation)) return null;
  const age = state.lifecycle.phaseElapsed - WEATHER_CONTINUES_LAUNCH_LEAD_ROWS;
  if (age < 0 || age >= WEATHER_CONTINUES_BODY_ROWS[command.animation]) return null;
  const request: BattleMoveAnimationRequest = Object.freeze({
    moveId: WEATHER_CONTINUES_MOVE_IDS[command.animation], attacker: command.battler, target: command.battler === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 0, multihit: 0,
  });
  return Object.freeze({
    type: "move", request, age,
    paletteInput: state.liveMovePaletteInput,
    spriteAllocatorInput: state.liveMoveSpriteAllocatorInput,
    spriteOrderInput: state.liveMoveSpriteOrderInput,
    ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
    // General_Rain's raindrops are a Random2 body (liveMovePresentationRng.ts): the session host + this command's key.
    ...(liveMoveRandom2Plan(request) === null && state.liveMoveSpriteOrderInput?.deferred === undefined ? {} : {
      presentationRng: Object.freeze({ host: presentationRngHost ?? null, key: liveMovePresentationRngBodyKey(state) }),
    }),
  });
}

export function battleResolutionCommandDuration(
  command: BattleResolutionPresentationCommand,
  field: BattleResolutionDisplayedField,
  // The presented move body's order-host body class (liveMoveTimingBodyOf; d4later body-keyed D4 phases); default the first body.
  bodyClass: LiveMoveTimingBody = "first",
  // tmr136: the presented move body's use ordinal in the battle (the x2 history host's LiveMoveBattlerX2Input.moveUse; absent = unknown).
  moveUse?: number,
): number {
  switch (command.type) {
    case "message":
      // holdFrames is the source's own post-print `waitmessage
      // B_WAIT_TIME_LONG` -- a hold *after* the text finishes printing, not
      // part of the print-speed floor/length term (ISSUES #69).
      return Math.max(
        command.timing.minimumFrames,
        battleStringPrintableLength(command.lines),
      ) + command.timing.holdFrames;
    case "move-animation": {
      const live = command.animation ? liveMoveAnimationDuration(command.animation, field, bodyClass, moveUse) : null;
      // sgs134: + HandleMoveAnimation's IsBattleSEPlaying rows (seGateFrames: a multi-hit move's 2nd+ hit).
      const seGate = command.timing.seGateFrames ?? 0;
      if (live === null) return seGate + command.timing.minimumFrames;
      const rows = liveMoveUniversalRows(command.animation!, field);
      return seGate + (command.timing.scriptLeadFrames ?? 0) + (command.timing.bodyLeadFrames ?? 0) + rows.pre
        + liveMoveIdleLeadRows(command.animation!, field) + live + rows.post + liveMoveScriptTailFrames(command.timing, command.animation!, field)
        + liveMoveHitTailRows(command);
    }
    case "hit-animation":
      return command.timing.minimumFrames;
    case "hp": {
      if (command.timing.instantDrop) return command.timing.tailFrames ?? 0;
      const maxHp = fieldBattler(field, command.battler).maxHP;
      return Math.max(
        command.timing.minimumFrames,
        // Frame 0 preserves the old display value; the source controller's
        // first graphical step is frame 1.
        battleHealthBarAnimationFrames({
          maxHp,
          from: command.from,
          to: command.to,
        }) + 1,
      ) + (command.timing.tailFrames ?? 0);
    }
    case "stat":
      return Math.max(
        command.timing.minimumFrames,
        BATTLE_RESOLUTION_STAT_CHANGE_FRAMES,
      );
    case "status":
    case "status-icon":
    case "faint":
    case "switch-in":
    case "switch-out":
    case "sprite-visibility":
      return command.type === "switch-in"
        ? command.timing.minimumFrames + (command.settleHoldFrames ?? 0)
        : command.timing.minimumFrames;
    case "party-summary":
      return command.timing?.minimumFrames ?? 1;
    case "turn-end":
      return command.timing.minimumFrames;
    case "trainer-slide":
    case "substitute-fade":
      return command.timing.minimumFrames;
    // sc106: General_StatsChange's added rows (76 / 90, statsChangeSpan); scd112 draws the banner over the field (stats-change effect).
    // scf117: + the rows to the following print's first glyph (holdFrames, statsChangeNextReceiptHoldFrames).
    case "stats-change":
      return command.timing.minimumFrames + (command.timing.holdFrames ?? 0);
    // sa125 (ISSUES #168 SA1): B_ANIM_STATUS_*'s controller rows (STATUS_ANIMATION_ADDED_ROWS); sar131 draws PSN / PRZ.
    case "status-animation":
      return command.timing.minimumFrames;
    // fpp150: X + 1 .. X + 124 (FOCUS_PUNCH_SETUP_COMMAND_FRAMES; 3 behind a Substitute).
    case "general-animation":
      return command.timing.minimumFrames;
  }
}

export function isBattleResolutionCommandComplete(
  state: BattleResolutionPresentationState,
): boolean {
  if (state.lifecycle.phase !== "presenting") return false;
  const segment = currentSegment(state);
  const command = segment.commands[state.commandIndex];
  if (!command) return true;
  // A button-advance message's dismiss input is the only thing that may
  // retire it -- `battleResolutionCommandDuration`'s length-derived duration
  // is a typing-speed floor, not a substitute completion path. Without this
  // gate, a message whose printable length sits within 1 of
  // `minimumFrames` can have that duration elapse *before*
  // `isBattleResolutionButtonMessageReady` first goes true, silently
  // skipping the dismiss wait entirely (ISSUES #75).
  if (command.type === "message" && command.advance === "button") {
    return isBattleResolutionButtonMessageReady(state);
  }
  // contain209 (presentationContainment.ts): a throw computing the presented command's duration holds it for its fallback
  // length (a pure function of the command and its field, re-evaluated identically every frame) and draws it static.
  let duration: number;
  try {
    let field = state.field;
    for (let index = 0; index < state.commandIndex; index += 1) {
      field = applyCompletedCommand(field, segment.commands[index]!);
    }
    duration = battleResolutionCommandDuration(command, field, liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput),
      state.liveMoveBattlerX2Input?.moveUse);
  } catch (error) {
    recordContainedPresentationError("duration", command.type, error, presentationCommandDetail(state));
    markPresentationCommandDegraded(command, 1);
    duration = battleResolutionCommandFallbackDuration(command);
  }
  return state.lifecycle.phaseElapsed + 1 >= duration;
}

/**
 * contain209: the length a contained command holds the static field for -- the decline path's: a move-animation without a live
 * duration presents seGate + minimumFrames (battleResolutionCommandDuration), every other command its timing floor.
 */
export function battleResolutionCommandFallbackDuration(command: BattleResolutionPresentationCommand): number {
  if (command.type === "move-animation") return Math.max(1, (command.timing.seGateFrames ?? 0) + command.timing.minimumFrames);
  const timing = (command as { timing?: { minimumFrames?: number } }).timing;
  return Math.max(1, timing?.minimumFrames ?? 1);
}

function containedHistoryRead<T>(
  what: string,
  segment: ReturnType<typeof currentSegment>,
  state: BattleResolutionPresentationState,
  declined: T,
  read: () => T,
): T {
  try {
    return read();
  } catch (error) {
    const previous = segment.commands[state.commandIndex - 1];
    recordContainedPresentationError("draw", previous?.type ?? "unknown", error, `${what}: ${presentationCommandDetail(state)}`);
    return declined;
  }
}

function presentationCommandDetail(state: BattleResolutionPresentationState): string {
  return `request ${state.resolutionId.requestId} segment ${state.segmentIndex} command ${state.commandIndex}`
    + ` ${state.lifecycle.phase} @${state.lifecycle.phaseElapsed}`;
}

export function isBattleResolutionButtonMessageReady(
  state: BattleResolutionPresentationState,
): boolean {
  const command = currentSegment(state).commands[state.commandIndex];
  return command?.type === "message"
    && command.advance === "button"
    && state.lifecycle.phaseElapsed
      >= battleStringPrintableLength(command.lines) + 1;
}

export function isBattleResolutionNextCommandHandoffComplete(
  state: BattleResolutionPresentationState,
): boolean {
  return state.lifecycle.phase === "next-command-handoff"
    && state.lifecycle.phaseElapsed >= BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES;
}

/**
 * sar131: the B_ANIM_STATUS_* the live field draws (statusAnimation.ts liveStatusAnimationRow's cases; src/engine reads src/animation
 * only through battleScene.ts, so the set is pinned equal by tests/sar131StatusAnimationRender.test.ts).
 */
export const STATUS_ANIMATIONS_DRAWN: ReadonlySet<string> = new Set([
  "PSN",
  "PRZ",
  // sad133 (SA6 / SA7 / SA8)
  "CURSED",
  "NIGHTMARE",
  "CONFUSION",
  "FRZ",
  // sae135 (SA5)
  "SLP",
  "BRN",
  "INFATUATION",
]);

/**
 * ISSUES #147: whether the current presenting row is one of the first
 * `liveMoveOpponentShadowPostBodyHideRows` ordinary rows after the segment's
 * latest live move body (row 1 = the first frame after the body's last row).
 */
function postBodyShadowHiddenAt(
  state: BattleResolutionPresentationState,
  segment: ReturnType<typeof currentSegment>,
): boolean {
  if (
    state.lifecycle.phase !== "presenting"
    && state.lifecycle.phase !== "awaiting-message-dismiss"
  ) return false;
  const command = segment.commands[state.commandIndex];
  if (!command || (command.type === "move-animation" && command.animation)) return false;
  const fields = [state.field];
  for (let index = 0; index < state.commandIndex; index += 1) {
    fields.push(applyCompletedCommand(fields[index]!, segment.commands[index]!));
  }
  let rows = state.lifecycle.phaseElapsed + 1;
  for (let index = state.commandIndex - 1; index >= 0; index -= 1) {
    const completed = segment.commands[index]!;
    // A presented Substitute fade owns the shadow through its own tail (liveSubstituteFade.ts): visible after it.
    if (completed.type === "substitute-fade") return false;
    // sar131: SpriteCB_EnemyShadow hides the shadow while gAnimScriptActive, shown one row late: a drawn status animation's hide
    // (statusAnimationRenderView: ages 1 .. end) holds through the next command's first row.
    if (completed.type === "status-animation" && rows <= 1 && STATUS_ANIMATIONS_DRAWN.has(completed.animation)) {
      return true;
    }
    if (completed.type === "move-animation") {
      if (!completed.animation || liveMoveAnimationDuration(completed.animation, fields[index]!) === null) return false;
      return rows <= liveMoveOpponentShadowPostBodyHideRows(completed.animation);
    }
    rows += battleResolutionCommandDuration(completed, fields[index]!);
  }
  return false;
}

/**
 * S10A tail row (liveSubstituteSwap.ts substituteSwapTailX2): the attacker side whose doll is latched one row at the swap-back's
 * last moving x2, on the first row of the command right after a presented Substitute swap composite (same segment), while that
 * attacker is still shown as the doll. Presentation only.
 */
function substituteSwapTailSideAt(
  state: BattleResolutionPresentationState,
  segment: ReturnType<typeof currentSegment>,
  field: BattleResolutionDisplayedField,
): "player" | "opponent" | null {
  if (state.lifecycle.phase !== "presenting" || state.lifecycle.phaseElapsed !== 0 || state.commandIndex === 0) return null;
  const previous = segment.commands[state.commandIndex - 1];
  if (previous?.type !== "move-animation" || !previous.animation) return null;
  let before = state.field;
  for (let index = 0; index < state.commandIndex - 1; index += 1) before = applyCompletedCommand(before, segment.commands[index]!);
  if (liveSubstituteSwapApplies(previous.animation, before) !== true || liveMoveAnimationDuration(previous.animation, before) === null) {
    return null;
  }
  const side = previous.animation.attacker === 0 ? "player" : "opponent";
  return field[side].substituteDoll === true ? side : null;
}

function healthboxParams(
  battler: BattleCommandFieldBattler,
  targetHp?: number,
  barFill?: number,
): HealthboxContentParams {
  return Object.freeze({
    name: battler.name,
    level: battler.level,
    gender: battler.gender === "genderless" ? "none" : battler.gender,
    hpFraction: battler.hp / battler.maxHP,
    ...(targetHp === undefined
      ? {}
      : { hpTargetFraction: targetHp / battler.maxHP }),
    ...(barFill === undefined ? {} : { hpBarFraction: barFill / battler.maxHP }),
    status: battler.status,
  });
}

/**
 * Projects one framebuffer view strictly from the immutable display field,
 * typed commands, and command-relative lifecycle. It never reads the
 * transition's settled rules, battle RNG, scene elapsed time, or a canonical
 * duration vector.
 */
/** Per battler (0 player, 1 opponent): sprite hidden by a completed live Fly/Bounce charge body. */
export type LiveSemiInvulnerableHidden = readonly [boolean, boolean];
export const LIVE_SEMI_INVULNERABLE_NONE: LiveSemiInvulnerableHidden = Object.freeze([false, false] as const);

/**
 * Presentation-only semi-invulnerable hide (Scene ON; `liveSemiInvulnerableHideBattler`). A completed live charge body
 * hides its attacker until that battler's next body completes (the strike restores it inside its own body), a
 * controller sprite-visibility receipt takes over (MOVEEND_ATTACKER_VISIBLE after an unusable/failed strike), or the
 * battler faints or is switched. Other battlers' bodies leave it hidden (the ROM sprite stays invisible). Scene OFF
 * carries no MOVE_ANIMATION request, so it never sets the hide. Never read by rules, RNG or the queue.
 */
export function applyLiveSemiInvulnerableCommand(
  hidden: LiveSemiInvulnerableHidden,
  command: BattleResolutionPresentationCommand,
): LiveSemiInvulnerableHidden {
  if (!("battler" in command)) return hidden;
  const battler = command.battler;
  let next: boolean;
  if (command.type === "move-animation") {
    if (command.actionTransition) return hidden;
    const hide = command.animation ? liveSemiInvulnerableHideBattler(command.animation) : null;
    if (hide !== null) {
      next = true;
      if (hide !== battler) return hidden;
    } else {
      next = false;
    }
  } else if (command.type === "sprite-visibility" || command.type === "faint"
    || command.type === "switch-in" || command.type === "switch-out") {
    next = false;
  } else {
    return hidden;
  }
  if (hidden[battler] === next) return hidden;
  return Object.freeze(battler === 0 ? [next, hidden[1]] as const : [hidden[0], next] as const);
}

/**
 * cf78 (ISSUES #143 remainder, live audit 19): the ROM's per-slot `gBattleMonForms`, presentation-only. The CASTFORM_CHANGE launch
 * writes `argument & ~CASTFORM_SUBSTITUTE` into the slot (battle_gfx_sfx_util.c:465 behind a Substitute, :948 via
 * AnimTask_CastformGfxDataChange / HandleSpeciesGfxDataChange otherwise); nothing resets it within a battle (ClearBattleMonForms,
 * pokemon.c:6418, runs at battle setup), so the form stays with the SLOT across faints and switches, and a CASTFORM the slot
 * displays later is drawn in it (BattleLoadOpponentMonSpriteGfx / BattleLoadPlayerMonSpriteGfx, battle_gfx_sfx_util.c:619 / :682).
 * Derived only from the kernel's CASTFORM_CHANGE animation events (battleScriptTryCastformDataChangeOpcode.ts); never read by
 * rules, RNG or the queue. A non-numeric argument is an unknown form (255): it declines like a non-normal one.
 */
export type LiveCastformForms = readonly [number, number];
export const LIVE_CASTFORM_FORMS_NORMAL: LiveCastformForms = Object.freeze([0, 0] as const);
const LIVE_CASTFORM_SPECIES = 385;
const LIVE_CASTFORM_SUBSTITUTE = 1 << 7;
const LIVE_CASTFORM_UNKNOWN_FORM = 0xff;

/** Applies the CASTFORM_CHANGE events of one segment up to `throughSequence` (strictly before it when `strict`). */
export function applyLiveCastformFormEvents(
  forms: LiveCastformForms,
  events: readonly Readonly<{ sequence: number; payload: unknown }>[],
  throughSequence: number,
  strict: boolean,
): LiveCastformForms {
  let next = forms;
  for (const event of events) {
    if (strict ? event.sequence >= throughSequence : event.sequence > throughSequence) continue;
    const payload = event.payload as Readonly<{ kind?: string; animationId?: string; battler?: number; arguments?: readonly string[] }>;
    if (payload.kind !== "animation" || payload.animationId !== "CASTFORM_CHANGE") continue;
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) continue;
    const argument = Number(payload.arguments?.[0]);
    const form = Number.isInteger(argument) ? (argument & ~LIVE_CASTFORM_SUBSTITUTE) >>> 0 : LIVE_CASTFORM_UNKNOWN_FORM;
    if (next[battler] === form) continue;
    next = Object.freeze(battler === 0 ? [form, next[1]] as const : [next[0], form] as const);
  }
  return next;
}

/** The slot forms at a resolution command: every earlier segment, then this segment's events strictly before the command. */
function liveCastformFormsAt(
  state: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand | null,
): LiveCastformForms {
  let forms = state.liveCastformForms ?? LIVE_CASTFORM_FORMS_NORMAL;
  for (let segmentIndex = 0; segmentIndex < state.segmentIndex; segmentIndex += 1) {
    forms = applyLiveCastformFormEvents(forms, state.segments[segmentIndex]!.events, Number.POSITIVE_INFINITY, false);
  }
  const limit = command !== null && "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
  return applyLiveCastformFormEvents(forms, state.segments[state.segmentIndex]?.events ?? [], limit, true);
}

/**
 * The slot forms once `command` has completed (the display ledger's carry): every segment before the command's own, then that
 * segment's events through the command, or all of them when it is the segment's last command (trailing events included).
 */
export function liveCastformFormsThroughCommand(
  state: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): LiveCastformForms {
  const segmentIndex = state.segments.findIndex((segment) => segment.commands.includes(command));
  if (segmentIndex < 0) return state.liveCastformForms ?? LIVE_CASTFORM_FORMS_NORMAL;
  let forms = state.liveCastformForms ?? LIVE_CASTFORM_FORMS_NORMAL;
  for (let index = 0; index < segmentIndex; index += 1) {
    forms = applyLiveCastformFormEvents(forms, state.segments[index]!.events, Number.POSITIVE_INFINITY, false);
  }
  const commands = state.segments[segmentIndex]!.commands;
  const last = commands[commands.length - 1] === command;
  const limit = !last && "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
  return applyLiveCastformFormEvents(forms, state.segments[segmentIndex]!.events, limit, false);
}

/** The displayed field with `castformForm` on each CASTFORM whose slot form is not the normal one (removed otherwise). */
export function withLiveCastformForms(
  field: BattleResolutionDisplayedField,
  forms: LiveCastformForms,
): BattleResolutionDisplayedField {
  let next = field;
  for (const battler of [0, 1] as const) {
    const current = fieldBattler(next, battler);
    const form = current.species === LIVE_CASTFORM_SPECIES && forms[battler] !== 0 ? forms[battler] : undefined;
    if (current.castformForm === form) continue;
    const { castformForm: _form, ...mon } = current;
    next = replaceFieldBattler(next, battler, Object.freeze(form === undefined ? mon : { ...mon, castformForm: form }));
  }
  return next;
}

type OpponentSummaryAge = Readonly<{ states: readonly import("./battleResolutionPresentation.ts").PartyBallState[]; lead: number; sinceDraw: number; sinceHide: number | null }>;

/** obr251: the drawn opponent summary with its ages at the current frame; kept past its hide command until the fade-out ends. */
function opponentSummaryView(
  summary: OpponentSummaryAge | null,
  shown: BattleResolutionPresentationRenderView["partySummary"],
  elapsed: number,
): BattleResolutionPresentationRenderView["partySummary"] {
  if (summary === null) return shown;
  const fadeAge = summary.sinceHide === null ? null : summary.sinceHide + elapsed;
  if (fadeAge !== null && fadeAge >= OPPONENT_SUMMARY_FADE_DELAY_FRAMES + OPPONENT_SUMMARY_FADE_FRAMES) return null;
  return Object.freeze({ battler: 1, states: summary.states, createAge: summary.sinceDraw + elapsed - summary.lead, fadeAge });
}

export function createBattleResolutionPresentationRenderView(
  state: BattleResolutionPresentationState,
  /** Read-only presentation Random2 host (EngineState.presentationRng.host); render never draws from it. */
  presentationRngHost?: PresentationRngHost | null,
  /** contain209: drop the current command's own presentation (a contained command whose ordinary view threw): the static field. */
  withoutCurrentCommand = false,
): BattleResolutionPresentationRenderView {
  const segment = currentSegment(state);
  let field = state.field;
  let latestMessage: readonly string[] | null = null;
  let switchIn: BattleResolutionPresentationRenderView["switchIn"] = null;
  let midBattleSwitchIn: BattleResolutionPresentationRenderView["midBattleSwitchIn"] = null;
  let switchOut: BattleResolutionPresentationRenderView["switchOut"] = null;
  let partySummary: BattleResolutionPresentationRenderView["partySummary"] = null;
  // obr251: the opponent summary's age, summed over completed commands: since its draw began (incl. the script lead, subtracted at
  // the end) and, once hidden, since its hide began (Task_HidePartyStatusSummary_DuringBattle's fade outlives the hide command).
  let summary = null as OpponentSummaryAge | null;
  // ais2: frames since the opponent's recall (`switch-out`) began, summed over completed commands: the ball effect (AnimTask_SwitchOutBallEffect's
  // white fade, mon tint and particles) outlives that 32-frame command into the sprite-visibility / party-summary commands that follow.
  let opponentRecallSince: number | null = null;
  const fainted = new Set<0 | 1>();
  const spriteVisibility = new Map<0 | 1, boolean>([[0, true], [1, true]]);
  // Recalled battlers (real CONTROLLER_RETURNMONTOBALL receipts) lose their
  // healthbox alongside the sprite; the unrelated CONTROLLER_SPRITEINVISIBILITY
  // receipt (Dig/Fly semi-invisibility) never does -- see the "sprite-visibility"
  // command's own `recall` doc comment.
  const healthboxVisibility = new Map<0 | 1, boolean>([[0, true], [1, true]]);
  let settledTrainer: Readonly<{ battler: 0 | 1 }> | null = null;
  // Visibility receipts are controller-owned persistent state. A later
  // automatic locked-action segment starts from the finished prior segment,
  // not from an invented visible baseline.
  let semiInvulnerableHidden = state.liveSemiInvulnerableHidden ?? LIVE_SEMI_INVULNERABLE_NONE;
  for (let segmentIndex = 0; segmentIndex < state.segmentIndex; segmentIndex += 1) {
    for (const completed of state.segments[segmentIndex]!.commands) {
      semiInvulnerableHidden = applyLiveSemiInvulnerableCommand(semiInvulnerableHidden, completed);
      if (completed.type === "sprite-visibility") {
        spriteVisibility.set(completed.battler, completed.visible);
        if (completed.recall) healthboxVisibility.set(completed.battler, completed.visible);
      }
      if (completed.type === "trainer-slide") {
        settledTrainer = completed.direction === "in"
          ? Object.freeze({ battler: completed.battler })
          : null;
      }
    }
  }
  const confirmHandoff = state.confirmHandoff === null
    ? null
    : Object.freeze({
        idleBounceElapsed: state.confirmHandoff.idleBounceElapsed,
        bounceReset: state.confirmHandoff.bounceReset,
        fightMenu: Object.freeze({
          moveset: buildFightMoveset(
            state.field.player.moveIds,
            state.field.player.currentPP,
            state.field.player.ppBonuses,
          ),
          displayCursor: state.confirmHandoff.fightDisplayCursor,
        }),
        forcedBottom: state.confirmHandoff.forced === undefined
          ? null
          : state.confirmHandoff.forced.kind === "encore"
            ? Object.freeze({
              kind: "encore" as const,
              prompt: `${BATTLE_COMMAND_ACTION_PROMPT_PREFIX}${state.field.player.name}${BATTLE_COMMAND_ACTION_PROMPT_SUFFIX}`,
            })
            : Object.freeze({
              kind: "struggle" as const,
              lines: resolveNoMovesLeftMessageLines(state.field, 0),
              waitCursorAge: state.confirmHandoff.forced.waitCursorAge,
            }),
      });
  // ISSUES #78 residual (1): the white ball-fade only ever runs on a
  // mid-battle SWITCH resolution. The `fadeTick` clock + the hardcoded
  // recall/send-in trace-frame windows ([1088,1139]/[1187,1231] relative to
  // `MID_BATTLE_SWITCH_FADE_BASE_TRACE`) are calibrated to the staged
  // voluntary-switch fixture; a non-switch resolution (e.g. a plain move like
  // this trace's GUST) can still advance `fadeTick` into that numeric range
  // and must not render a phantom ball-fade on its field/sprite.
  // snd145: only the RECALL half stays on this voluntary-switch clock; the send-in half belongs to the current `switch-in`
  // command (`midBattleSwitchSendInFadeAt`, below), for every send-in.
  const recallTraceFrame = MID_BATTLE_SWITCH_FADE_BASE_TRACE + state.fadeTick;
  let midBattleSwitchFade = state.sourceDecision.kind === "switch" && recallTraceFrame < 1187
    ? midBattleSwitchFadeAt(recallTraceFrame)
    : null;
  // §10.2 residual 1b: the ball-open particle burst, keyed to the same
  // switch-only fade windows (recall 1089-1130, send-in 1187-1228) so a
  // non-switch resolution never leaks particles.
  let midBattleSwitchParticles: BattleResolutionPresentationRenderView["midBattleSwitchParticles"] =
    state.sourceDecision.kind !== "switch" || recallTraceFrame >= MID_BATTLE_SWITCH_SEND_IN_PARTICLE_START_TRACE
      ? null
      : Object.freeze({
          window: "recall" as const,
          schedules: midBattleSwitchParticleSchedulesAt(recallTraceFrame, "recall"),
        });
  if (state.lifecycle.phase === "presenting-switch-in" && !withoutCurrentCommand) {
    const switchCommand = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "switch-in" }
      > => candidate.type === "switch-in",
    );
    const message = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "message" }
      > => candidate.type === "message",
    );
    if (!switchCommand || !message) {
      throw new Error(
        "battle resolution switch-in lifecycle requires message and switch commands",
      );
    }
    field = withSubstituteDoll(replaceFieldBattler(
      field,
      switchCommand.battler,
      switchCommand.incoming,
    ), switchCommand.battler, false);
    latestMessage = message.lines;
    const sendOutTiming = playerFaintReplacementSendOutTimingOfSegment(segment);
    switchIn = Object.freeze({
      elapsed: state.lifecycle.phaseElapsed,
      phase: partySendOutPhase(state.lifecycle.phaseElapsed, sendOutTiming ?? undefined),
      timing: sendOutTiming,
      battler: switchCommand.battler,
    });
    // pfb229 (docs/pfb228-faint-replacement-emerge.md): a Scene ON non-MAGBY faint-replacement send-in runs the path-A ball / release / emerge /
    // back-animation timeline translated by the keyed ball clock: A = partySendOutReleaseClock(e) - 96 = e - B - releaseExtra.
    // Scene OFF and the canonical MAGBY window keep the forced selector's generic release.
    const sceneOn = segment.beforeRules !== null && segment.beforeRules !== undefined
      && (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0;
    const forcedElapsed = sendOutTiming === null ? -1 : partySendOutReleaseClock(state.lifecycle.phaseElapsed, sendOutTiming) - FORCED_SEND_IN_PATH_A_BALL_SPAWN;
    if (sceneOn && sendOutTiming !== null && switchCommand.battler === 0 && !isCanonicalMagbyIncoming(field.player) && forcedElapsed >= 0) {
      const art = createBattleCommandFieldArtView(field);
      const playerMonY = art.player.origin.y + 32;
      midBattleSwitchIn = midBattleSwitchInAt(
        forcedElapsed,
        0,
        undefined,
        undefined,
        Object.freeze({ species: art.player.speciesSymbol, nature: backAnimNatureName(switchCommand.incoming.personality) }),
        playerMonY,
      );
      midBattleSwitchFade = midBattleSwitchSendInFadeAt(forcedElapsed, 0) ?? midBattleSwitchFade;
      midBattleSwitchParticles = midBattleSwitchSendInParticlesAt(forcedElapsed, 0, playerMonY) ?? midBattleSwitchParticles;
    }
  }
  for (let index = 0; index < state.commandIndex; index += 1) {
    const completed = segment.commands[index]!;
    if (summary !== null || opponentRecallSince !== null) {
      let frames: number;
      try {
        frames = battleResolutionCommandDuration(completed, field);
      } catch {
        frames = battleResolutionCommandFallbackDuration(completed);
      }
      if (summary !== null) summary = Object.freeze({ ...summary, sinceDraw: summary.sinceDraw + frames, sinceHide: summary.sinceHide === null ? null : summary.sinceHide + frames });
      if (opponentRecallSince !== null) opponentRecallSince += frames;
    }
    if (completed.type === "switch-out" && completed.battler === 1 && !completed.targetAtRest && !completed.skipAnimation && !semiInvulnerableHidden[1]) {
      let frames: number;
      try {
        frames = battleResolutionCommandDuration(completed, field);
      } catch {
        frames = battleResolutionCommandFallbackDuration(completed);
      }
      opponentRecallSince = frames;
    }
    field = applyCompletedCommand(field, completed);
    semiInvulnerableHidden = applyLiveSemiInvulnerableCommand(semiInvulnerableHidden, completed);
    if (completed.type === "message") latestMessage = completed.lines;
    if (completed.type === "faint") fainted.add(completed.battler);
    if (completed.type === "switch-in") {
      // The recall receipt hid the outgoing mon's sprite+healthbox; the
      // switch-in restores both for the incoming battler once the span's
      // controller receipt has passed.
      fainted.delete(completed.battler);
      spriteVisibility.set(completed.battler, true);
      healthboxVisibility.set(completed.battler, true);
    }
    if (completed.type === "sprite-visibility") {
      spriteVisibility.set(completed.battler, completed.visible);
      if (completed.recall) healthboxVisibility.set(completed.battler, completed.visible);
    }
    if (completed.type === "party-summary") {
      // ISSUES #78: `Cmd_drawpartystatussummary` always emits skipPlayer=1
      // (battle_script_commands.c:5728) and `PlayerHandleDrawPartyStatusSummary`
      // skips the player side (battle_controller_player.c:3015-3018) -- the
      // real game draws no player tray on the mid-battle switch route. Only
      // the opponent side (battler 1) draws via this command.
      partySummary = completed.visible && completed.battler !== 0
        ? Object.freeze({ battler: completed.battler, states: completed.states, createAge: 0, fadeAge: null })
        : null;
      if (completed.battler !== 0 && completed.visible) {
        summary = Object.freeze({
          states: completed.states,
          lead: completed.timing?.leadFrames ?? 0,
          sinceDraw: battleResolutionCommandDuration(completed, field),
          sinceHide: null,
        });
      } else if (summary !== null && summary.sinceHide === null) {
        summary = Object.freeze({ ...summary, sinceHide: battleResolutionCommandDuration(completed, field) });
      }
    }
    if (completed.type === "trainer-slide") {
      settledTrainer = completed.direction === "in"
        ? Object.freeze({ battler: completed.battler })
        : null;
    }
  }

  const command = segment.commands[state.commandIndex] ?? null;
  let effect: BattleResolutionRenderEffect | null = null;
  let visibleCharacters = latestMessage === null
    ? 0
    : switchIn === null
      ? battleStringPrintableLength(latestMessage)
      : partySendOutGoTextVisibleChars(switchIn.elapsed, switchIn.timing ?? undefined);
  let hpTarget: Readonly<{ battler: 0 | 1; to: number; barFill?: number }> | null = null;
  let waitCursor: Readonly<{ age: number }> | null = null;
  let activeTrainerSlide: Readonly<{ battler: 0 | 1; offscreenX2: number }> | null = null;
  // S10A fade: presented only over a battler shown as the doll at its start (else the ordinary field for its rows).
  const fadePresented = command?.type === "substitute-fade" && fieldBattler(field, command.battler).substituteDoll === true;
  if (
    command !== null
    && (state.lifecycle.phase === "presenting"
      || state.lifecycle.phase === "awaiting-message-dismiss"
      || state.lifecycle.phase === "forced-party-handoff")
  ) {
    field = substituteDollAtCommandStart(field, command);
  }

  if (
    (
      state.lifecycle.phase === "presenting"
      || state.lifecycle.phase === "awaiting-message-dismiss"
      || state.lifecycle.phase === "forced-party-handoff"
    )
    && command
    && !withoutCurrentCommand
  ) {
    if (command.type === "message") {
      latestMessage = command.lines;
      visibleCharacters = battleStringVisibleCharacters(
        command.lines,
        state.lifecycle.phaseElapsed,
      );
      if (
        command.advance === "button"
        && !command.noCursor
        && isBattleResolutionButtonMessageReady(state)
      ) {
        waitCursor = Object.freeze({
          age:
            state.lifecycle.phaseElapsed
            - battleStringPrintableLength(command.lines)
            - 1,
        });
      }
    } else if (command.type === "hp") {
      const battler = fieldBattler(field, command.battler);
      if (battler.hp !== command.from) {
        throw new Error(
          `battle resolution HP command starts at ${command.from}, displayed ${battler.hp}`,
        );
      }
      const semanticEndpoint = Math.max(
        0,
        Math.min(battler.maxHP, command.from - command.healthValue),
      );
      if (semanticEndpoint !== command.to) {
        throw new Error(
          `battle resolution HP controller ${command.healthValue} resolves ${command.from}->${semanticEndpoint}, event endpoint is ${command.to}`,
        );
      }
      // mem2: INSTANT_HP_BAR_DROP -- SetBattleBarStruct(maxHP, 0, 0x7FFF): the HP text empties on timing.instantDrop's row, the bar graphic one row later.
      const instantRow = command.timing.instantDrop;
      const elapsed = state.lifecycle.phaseElapsed;
      const barProgram = { maxHp: battler.maxHP, from: command.from, to: instantRow === undefined ? command.to : command.from };
      field = withDisplayedHp(
        field,
        command.battler,
        instantRow !== undefined ? (elapsed >= instantRow ? command.to : command.from) : battleHealthBarValueAtFrame(barProgram, elapsed),
      );
      // hpb202: below the bar's 48 pixels the Q_24_8 currValue (not the integer HP text) fills the bar.
      hpTarget = Object.freeze({
        battler: command.battler, to: command.to,
        ...(instantRow !== undefined ? { barFill: elapsed > instantRow ? command.to : command.from }
          : battler.maxHP < 48 ? { barFill: battleHealthBarFillValueAtFrame(barProgram, elapsed) } : {}),
      });
    } else if (command.type === "move-animation" && command.animation) {
      const lead = liveMoveIdleLeadRows(command.animation, field);
      // iu120: the pre rows show the activation row's image (idle98: F_att..A-1 == row A), so a lead > 0 command's pre rows keep it.
      // sub183: the script lead rows precede the seGate rows and show the same age-0 field.
      const seGate = (command.timing.seGateFrames ?? 0) + (command.timing.scriptLeadFrames ?? 0) + (command.timing.bodyLeadFrames ?? 0);
      const pre = seGate + liveMoveUniversalRows(command.animation, field).pre;
      effect = Object.freeze({
        type: "move", request: command.animation,
        age: liveMoveUniversalRowAge(state, command.animation, field, seGate, liveMoveScriptTailFrames(command.timing, command.animation, field)),
        ...(lead > 0 && state.lifecycle.phaseElapsed <= pre ? { preActivationRow: true as const } : {}),
        paletteInput: state.liveMovePaletteInput,
        spriteAllocatorInput: state.liveMoveSpriteAllocatorInput,
        spriteOrderInput: state.liveMoveSpriteOrderInput,
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
        // A Random2 body reads its own words; a deferred order lend (prep46: any consumer after a words unit) reads the earlier unit's
        // recorded words by its key at the seam, so a non-Random2 consumer gets the host too.
        ...(liveMoveRandom2Plan(command.animation) === null && state.liveMoveSpriteOrderInput?.deferred === undefined ? {} : {
          presentationRng: Object.freeze({ host: presentationRngHost ?? null, key: liveMovePresentationRngBodyKey(state) }),
        }),
      });
    } else if (command.type === "substitute-fade" && fadePresented) {
      effect = Object.freeze({
        type: "substitute-fade", battler: command.battler, age: state.lifecycle.phaseElapsed,
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      });
    } else if (command.type === "stats-change" && fieldBattler(field, command.battler).substituteDoll !== true
      && state.lifecycle.phaseElapsed >= (command.timing.seGateFrames ?? 0)) {
      // scd112: the banner over the field as it is (battleScene.ts statsChangeRenderView); never over the doll (the ROM plays nothing).
      // sgs134: after HandleBattleAnimation's IsBattleSEPlaying rows (seGateFrames; the field as it is until then).
      effect = Object.freeze({
        type: "stats-change", battler: command.battler, argument: command.argument,
        age: state.lifecycle.phaseElapsed - (command.timing.seGateFrames ?? 0),
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      });
    } else if (command.type === "status-animation" && state.lifecycle.phaseElapsed >= (command.timing.seGateFrames ?? 0)) {
      // sar131: the status animation over the field as it is (battleScene.ts statusAnimationRenderView). gaf140: after the
      // controller's IsBattleSEPlaying rows (seGateFrames; the field as it is, shadow and rest included, until the launch).
      const previous = state.commandIndex > 0 ? segment.commands[state.commandIndex - 1] : undefined;
      effect = Object.freeze({
        type: "status-animation", battler: command.battler, animation: command.animation,
        age: state.lifecycle.phaseElapsed - (command.timing.seGateFrames ?? 0),
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
        ...(previous?.type === "status" && previous.battler === command.battler ? { inflicted: true as const } : {}),
      });
    } else if (command.type === "general-animation" && command.animated === true && isWeatherContinuesAnimation(command.animation)) {
      // wth236: the weather body, else the field as it is (the launch lead and tail rows).
      effect = weatherContinuesBodyEffect(command, state, presentationRngHost) ?? Object.freeze({
        type: "general-animation", battler: command.battler, animation: command.animation, age: state.lifecycle.phaseElapsed - 1,
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      });
    } else if (command.type === "general-animation" && command.animation === "LEECH_SEED_DRAIN" && command.animated === true) {
      // Behind a doll the ROM plays nothing. Before the body (ages < 21) the rows are ordinary (the foe stands at its tracked idle rest); after
      // it the body has left the battlers at x2 0 (the general-animation effect, which draws nothing for this animation).
      const doll = fieldBattler(field, command.battler).substituteDoll === true;
      const body = doll ? null : leechSeedDrainAbsorbEffect(command, state);
      effect = body ?? (doll || state.lifecycle.phaseElapsed < LEECH_SEED_DRAIN_BODY_START_AGE ? null : Object.freeze({
        type: "general-animation", battler: command.battler, animation: command.animation, age: state.lifecycle.phaseElapsed - 1,
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      }));
    } else if (command.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT" && fieldBattler(field, command.battler).substituteDoll !== true) {
      // hie2: the age is relative to the ROM's first identity rotation display (heldItemEffectAge0Frames).
      effect = Object.freeze({
        type: "general-animation", battler: command.battler, animation: command.animation,
        age: state.lifecycle.phaseElapsed - heldItemEffectAge0Frames(command.timing.minimumFrames),
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      });
    } else if (command.type === "general-animation" && fieldBattler(field, command.battler).substituteDoll !== true) {
      // fpp150 (fps147 §4d): command age a is ROM row X + 1 + a, so the reducer's rel is a - 1. Behind the doll the ROM plays
      // nothing (TryHandleLaunchBattleTableAnimation), the field stays as it is.
      const castform = command.animation === "CASTFORM_CHANGE";
      effect = Object.freeze({
        type: "general-animation", battler: command.battler, animation: command.animation,
        age: state.lifecycle.phaseElapsed - (castform ? CASTFORM_CHANGE_LEAD_FRAMES + (command.castformLeadExtra ?? 0) : GENERAL_SCRIPT_START_FRAMES[command.animation] ?? 1),
        ...(castform ? { castformForm: command.castformForm ?? 0 } : {}),
        ...(state.liveMoveBattlerX2Input === undefined ? {} : { battlerX2Input: state.liveMoveBattlerX2Input }),
      });
    } else if (command.type === "hit-animation") {
      effect = Object.freeze({
        type: "hit",
        battler: command.battler,
        ...genericHitReactionAtAge(
          state.lifecycle.phaseElapsed,
          command.timing.firstDisplayedAge,
        ),
      });
    } else if (command.type === "stat") {
      effect = Object.freeze({
        type: "stat",
        battler: command.battler,
        stat: command.stat,
        from: command.from,
        to: command.to,
        age: state.lifecycle.phaseElapsed,
      });
    } else if (command.type === "status") {
      effect = Object.freeze({
        type: "status",
        battler: command.battler,
        before: command.before,
        after: command.after,
        age: state.lifecycle.phaseElapsed,
      });
    } else if (command.type === "faint") {
      const faintElapsed = Math.max(0, state.lifecycle.phaseElapsed - (command.timing.leadFrames ?? 0));
      if (command.timing.sink === "opponent-tile-rows") {
        const d = faintElapsed - 1;
        const erased = d <= 0
          ? 0
          : Math.min(command.timing.steps, Math.ceil(d / 2));
        effect = Object.freeze({
          type: "faint",
          battler: command.battler,
          healthboxVisible:
            faintElapsed
            < command.timing.healthboxVanishFrame,
          sink: Object.freeze({
            type: "opponent-tile-rows",
            keptRows: command.timing.steps - erased,
            y2: erased * 8,
          }),
        });
      } else {
        effect = Object.freeze({
          type: "faint",
          battler: command.battler,
          healthboxVisible:
            faintElapsed
            < command.timing.healthboxVanishFrame,
          sink: Object.freeze({
            type: "player-pixel-rows",
            skipPixelRows: Math.min(
              command.timing.spriteRows,
              command.timing.pixelsPerFrame * faintElapsed,
            ),
          }),
        });
      }
    } else if (command.type === "party-summary") {
      // ISSUES #78: the same skipPlayer gate as the completed-command loop
      // above -- the player side never draws the tray on the switch route.
      partySummary = command.visible && command.battler !== 0
        ? Object.freeze({ battler: command.battler, states: command.states, createAge: 0, fadeAge: null })
        : null;
      if (command.battler !== 0 && command.visible) {
        summary = Object.freeze({ states: command.states, lead: command.timing?.leadFrames ?? 0, sinceDraw: 0, sinceHide: null });
      } else if (summary !== null && summary.sinceHide === null) {
        summary = Object.freeze({ ...summary, sinceHide: 0 });
      }
    } else if (command.type === "switch-in") {
      // The incoming mon is already the field battler; the mid-battle
      // switch-in view holds its visible onset until the ball-release emerge.
      field = withSubstituteDoll(replaceFieldBattler(field, command.battler, command.incoming), command.battler, false);
      // snd145: a Scene ON opponent send-in carries its species-keyed slide start; CASTFORM's whole send-in runs one frame late.
      const visualDelay = command.sendInVisualDelay ?? 0;
      // offs152: a Scene OFF long-nickname send-in repeats the slide's first frame (lag frame): later visuals run one frame late.
      const lagged = command.sendInLagElapsed !== undefined && state.lifecycle.phaseElapsed >= command.sendInLagElapsed ? 1 : 0;
      const sendInElapsed = state.lifecycle.phaseElapsed - visualDelay - lagged;
      // pfb229: Scene ON keys the player ball arc and burst origin on the incoming mon's sprite y (Scene OFF keeps the fitted 93).
      const sceneOn = segment.beforeRules !== null && segment.beforeRules !== undefined
        && (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0;
      const playerMonY = command.battler === 0 && sceneOn ? createBattleCommandFieldArtView(field).player.origin.y + 32 : undefined;
      midBattleSwitchIn = midBattleSwitchInAt(
        sendInElapsed,
        command.battler,
        command.healthboxSlideElapsed === undefined ? undefined : command.healthboxSlideElapsed - visualDelay,
        // fra151: only the Scene ON opponent send-in (the species-keyed tail) launches the front animation (offs152: Scene OFF skips it).
        command.healthboxSlideElapsed === undefined || command.battler !== 1 || command.skipFrontAnimation === true
          ? undefined : createBattleCommandFieldArtView(field).opponent.speciesSymbol,
        // bso225: the Scene ON player send-in (voluntary, forced and any other `switch-in`) runs the species back animation.
        command.battler === 0 && segment.beforeRules !== null && segment.beforeRules !== undefined
          && (segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0
          ? Object.freeze({ species: createBattleCommandFieldArtView(field).player.speciesSymbol, nature: backAnimNatureName(command.incoming.personality) })
          : undefined,
        playerMonY,
        command.aiSwitch === true ? 22 : undefined,
      );
      midBattleSwitchFade = midBattleSwitchSendInFadeAt(sendInElapsed, command.battler) ?? midBattleSwitchFade;
      midBattleSwitchParticles = midBattleSwitchSendInParticlesAt(sendInElapsed, command.battler, playerMonY) ?? midBattleSwitchParticles;
      fainted.delete(command.battler);
    } else if (command.type === "switch-out") {
      // ISSUES #78 slice 4: the outgoing mon's return-to-ball scale-up owns
      // the battler's pixels for the whole span (the generic draw is gated
      // off below); from relative 25 the sprite is freed and the field is
      // empty until the send-in.
      // Scene ON forced removal: the live body left the target off-screen; nothing draws it until the recall receipt. A Baton
      // Pass attacker hidden by its completed live body (liveSemiInvulnerableHideBattler) is likewise already invisible: its
      // returntoball frees it unseen (prep27 s0.1: no recall scale-up in the ROM), so the span draws nothing either.
      // offs152: the Scene OFF forced hold draws the target at rest (the generic draw) until the recall receipt.
      const recalledArt = createBattleCommandFieldArtView(field);
      const recalledYDelta = command.battler === 1 ? opponentBattlerYDelta(recalledArt.opponent) : playerBattlerYDelta(recalledArt.player);
      // ais3: the player's recall effect runs on the voluntary-switch clock, which reads trace 1087 at this command's elapsed 0
      // (the effect's elapsed 0, trace 1086, is the last message frame); the scale ramp keys off that clock. The opponent's own
      // clock starts at the command.
      const recallElapsed = state.lifecycle.phaseElapsed + (command.battler === 0 ? 1 : 0);
      switchOut = command.targetAtRest ? null : command.skipAnimation || semiInvulnerableHidden[command.battler]
        ? Object.freeze({
            ...midBattleSwitchOutAt(recallElapsed, command.battler, recalledYDelta),
            spriteVisible: false,
          })
        : midBattleSwitchOutAt(
            recallElapsed,
            command.battler,
            recalledYDelta,
          );
    } else if (command.type === "sprite-visibility") {
      spriteVisibility.set(command.battler, command.visible);
      if (command.recall) healthboxVisibility.set(command.battler, command.visible);
    } else if (command.type === "trainer-slide") {
      const age = Math.min(state.lifecycle.phaseElapsed, command.timing.minimumFrames);
      activeTrainerSlide = Object.freeze({
        battler: command.battler,
        offscreenX2: command.direction === "in"
          ? 2 * (command.timing.minimumFrames - age)
          : 2 * age,
      });
    }
  } else if (
    !withoutCurrentCommand
    && state.lifecycle.phase !== "confirm-handoff"
    &&
    state.lifecycle.phase !== "next-command-handoff"
    && state.lifecycle.phase !== "terminal-handoff"
    && state.lifecycle.phase !== "presenting-switch-in"
    && state.lifecycle.phase !== "presenting"
    // ISSUES #89: a forced switch with no fainted message to intercept (e.g.
    // Baton Pass) reaches "forced-party-handoff" only once its segment's
    // commands are exhausted (`command` is null here, same as the classic
    // dance's "presenting" no-command edge above) -- render the already-
    // settled field, same as every other *-handoff phase.
    && state.lifecycle.phase !== "forced-party-handoff"
  ) {
    throw new Error(
      `battle resolution non-KO renderer cannot render ${state.lifecycle.phase}`,
    );
  }

  const playerTarget =
    hpTarget?.battler === 0 ? hpTarget.to : undefined;
  const opponentTarget =
    hpTarget?.battler === 1 ? hpTarget.to : undefined;
  const playerBarFill = hpTarget?.battler === 0 ? hpTarget.barFill : undefined;
  const opponentBarFill = hpTarget?.battler === 1 ? hpTarget.barFill : undefined;
  const playerFaint = effect?.type === "faint" && effect.battler === 0
    ? effect
    : null;
  const opponentFaint = effect?.type === "faint" && effect.battler === 1
    ? effect
    : null;
  // cf78: a displayed CASTFORM in a weather form (its slot's gBattleMonForms at this command) declines every live body.
  field = withLiveCastformForms(field, liveCastformFormsAt(state, command));
  // contain209: these two re-read an EARLIER live body; a throw there is that body's contained fault, and a declined body has
  // neither a swap tail nor a post-body shadow hide.
  const tailSide = containedHistoryRead("substitute swap tail", segment, state, null, () => substituteSwapTailSideAt(state, segment, field));
  const baseFieldArt = tailSide === null
    ? createBattleCommandFieldArtView(field)
    : substituteSwapTailFieldArt(createBattleCommandFieldArtView(field), tailSide);
  // rst139 (docs/rst139-ordinary-row-rest.md): outside a battle animation script the ROM keeps the battler sprite's x2 / y2 where the
  // last script or send-in left it, so an ordinary Scene ON row (message / HP / blink / stat / status / handoff; no body, fade, banner,
  // status animation, faint, switch or party summary) draws a tracked-`idle` opponent at its species front idle rest. `zeroed` and
  // `unknown` keep x2 0; the doll has no rest; Scene OFF carries no history.
  const ordinaryRest = state.liveOrdinaryBattlerX2History?.opponent === "idle"
      && (effect === null || effect.type === "hit" || effect.type === "stat" || effect.type === "status")
      && !(command !== null && state.lifecycle.phase !== "next-command-handoff" && state.lifecycle.phase !== "confirm-handoff"
        && (command.type === "switch-in" || command.type === "switch-out" || command.type === "party-summary"
          || command.type === "trainer-slide" || (command.type === "move-animation" && !command.actionTransition)))
      && switchIn === null && midBattleSwitchIn === null && switchOut === null && partySummary === null
      && field.opponent.substituteDoll !== true
    ? liveBattlerAnchors("opponent", baseFieldArt).frontIdleRest : null;
  const fieldArt = ordinaryRest === null || (ordinaryRest.x2 === 0 && ordinaryRest.y2 === 0) ? baseFieldArt : Object.freeze({
    ...baseFieldArt,
    opponent: Object.freeze({
      ...baseFieldArt.opponent,
      origin: Object.freeze({ x: baseFieldArt.opponent.origin.x + ordinaryRest.x2, y: baseFieldArt.opponent.origin.y + ordinaryRest.y2 }),
    }),
  });
  // ais2: the opponent's recall ball effect (AnimTask_SwitchOutBallEffect): the player's recall windows on the opponent's own switch-out clock.
  const opponentRecallElapsed = command?.type === "switch-out" && command.battler === 1 && !command.targetAtRest && !command.skipAnimation
      && !semiInvulnerableHidden[1]
    ? state.lifecycle.phaseElapsed
    : opponentRecallSince === null ? null : opponentRecallSince + state.lifecycle.phaseElapsed;
  if (opponentRecallElapsed !== null && MID_BATTLE_SWITCH_OUT_TRACE + opponentRecallElapsed < MID_BATTLE_SWITCH_RECALL_END_TRACE && midBattleSwitchFade === null && midBattleSwitchParticles === null) {
    const traceFrame = MID_BATTLE_SWITCH_OUT_TRACE + opponentRecallElapsed;
    const fade = midBattleSwitchFadeAt(traceFrame, false);
    if (fade !== null) midBattleSwitchFade = Object.freeze({ ...fade, objBattler: 1 as const });
    const schedules = midBattleSwitchParticleSchedulesAt(traceFrame, "recall", false);
    if (schedules.length > 0) {
      // GetBattlerSpriteCoord(BATTLER_COORD_X / _Y) is the slot's fixed (176, 40) (sBattlerCoords, no species term), +32 for the feet: base (176, 72).
      midBattleSwitchParticles = Object.freeze({ window: "opponent-recall" as const, schedules, originX: 172, originY: 68 });
    }
  }
  const playerHit = effect?.type === "hit" && effect.battler === 0
    ? effect
    : null;
  const opponentHit = effect?.type === "hit" && effect.battler === 1
    ? effect
    : null;
  return Object.freeze({
    field,
    fieldArt,
    healthboxes: Object.freeze({
      player: Object.freeze({
        ...healthboxParams(field.player, playerTarget, playerBarFill),
        currentHp: field.player.hp,
        maxHp: field.player.maxHP,
      }),
      opponent: healthboxParams(field.opponent, opponentTarget, opponentBarFill),
    }),
    message:
      latestMessage === null
        ? null
        : Object.freeze({
            lines: latestMessage,
            visibleCharacters,
          }),
    effect,
    postBodyShadowHidden: containedHistoryRead("post-body shadow", segment, state, false, () => postBodyShadowHiddenAt(state, segment)),
    visibility: Object.freeze({
      player: Object.freeze({
        sprite: (spriteVisibility.get(0) ?? true)
          && !semiInvulnerableHidden[0]
          && !fainted.has(0)
          && !(playerHit?.targetInvisible ?? false)
          // ISSUES #78: the mid-battle switch-in scene renderer owns the
          // battler's pixels for the whole send-in (ball throw, emerge, then
          // the full sprite) -- the generic draw must not double it.
          && midBattleSwitchIn?.battler !== 0
          // ISSUES #78 slice 4: the switch-out scene renderer owns the
          // outgoing mon's pixels for the whole return-to-ball span (full
          // sprite through the scale-up, then freed).
          && switchOut?.battler !== 0
          && !(
            playerFaint?.sink.type === "player-pixel-rows"
            && playerFaint.sink.skipPixelRows
              >= fieldArt.player.picGeometry.rows * 8
          ),
        healthbox: !fainted.has(0)
          && (playerFaint?.healthboxVisible ?? true)
          && (healthboxVisibility.get(0) ?? true)
          && midBattleSwitchIn?.battler !== 0,
      }),
      opponent: Object.freeze({
        sprite: (spriteVisibility.get(1) ?? true)
          && !semiInvulnerableHidden[1]
          && !fainted.has(1)
          && !(opponentHit?.targetInvisible ?? false)
          && midBattleSwitchIn?.battler !== 1
          && switchOut?.battler !== 1
          && !(
            opponentFaint?.sink.type === "opponent-tile-rows"
            && opponentFaint.sink.keptRows === 0
          ),
        healthbox: !fainted.has(1)
          && (opponentFaint?.healthboxVisible ?? true)
          && (healthboxVisibility.get(1) ?? true)
          && midBattleSwitchIn?.battler !== 1,
      }),
    }),
    waitCursor,
    bottom:
      confirmHandoff !== null
        ? "fight"
      : state.lifecycle.phase === "next-command-handoff"
      || switchIn?.phase === "blankMessage"
      // ISSUES #78 tail: the post-voluntary-switch turn-end clears the held
      // box text 2 frames before the turn-end command completes (oracle
      // 1398→1399, app +2 = 1400→1401). Route-scoped to the switch seam; the
      // shared next-command-handoff clock and every other seam stay untouched.
      || (
        command?.type === "turn-end"
        && state.sourceDecision.kind === "switch"
        && state.lifecycle.phaseElapsed
          >= command.timing.minimumFrames - 2
      )
        ? "blank"
        : "message",
    confirmHandoff,
    switchIn,
    midBattleSwitchIn,
    switchOut,
    midBattleSwitchFade,
    midBattleSwitchParticles,
    partySummary: opponentSummaryView(summary, partySummary, command === null ? 0 : state.lifecycle.phaseElapsed),
    trainerSlide: activeTrainerSlide !== null
      ? Object.freeze({
          battler: activeTrainerSlide.battler,
          picSymbol: state.opponentTrainer?.trainerPic ?? null,
          offscreenX2: activeTrainerSlide.offscreenX2,
        })
      : settledTrainer !== null
        ? Object.freeze({
            battler: settledTrainer.battler,
            picSymbol: state.opponentTrainer?.trainerPic ?? null,
            offscreenX2: 0,
          })
        : null,
  });
}

/**
 * contain209 (presentationContainment.ts): the presented command a draw-time throw degrades -- the current command of a
 * presenting phase (the switch-in command while the send-out plays), else null (handoff rows are not contained).
 */
function containedPresentationCommand(state: BattleResolutionPresentationState): BattleResolutionPresentationCommand | null {
  const segment = state.segments[state.segmentIndex];
  if (segment === undefined) return null;
  if (state.lifecycle.phase === "presenting-switch-in") return segment.commands.find((candidate) => candidate.type === "switch-in") ?? null;
  if (state.lifecycle.phase !== "presenting" && state.lifecycle.phase !== "awaiting-message-dismiss"
    && state.lifecycle.phase !== "forced-party-handoff") return null;
  return segment.commands[state.commandIndex] ?? null;
}

/**
 * contain213 (presentationContainment.ts "field"): a render view built inside tick() (the postwin / return-hold frozen scene). A
 * throw from the ordinary view falls back to the view without the current command's own presentation, and if that throws too, to
 * no frozen scene (null: the postwin renderer's existing black hold).
 */
export function containedBattleResolutionRenderView(
  state: BattleResolutionPresentationState,
  what: string,
): BattleResolutionPresentationRenderView | null {
  const record = (error: unknown) => recordContainedPresentationError("field",
    containedPresentationCommand(state)?.type ?? "view", error, `${what}: ${presentationCommandDetail(state)}`);
  try {
    return createBattleResolutionPresentationRenderView(state);
  } catch (error) {
    record(error);
  }
  try {
    return createBattleResolutionPresentationRenderView(state, null, true);
  } catch (error) {
    record(error);
  }
  return null;
}

/**
 * contain213 (presentationContainment.ts "field"): the displayed field a tick-side read takes from the render view (a continuation
 * segment's boundary). On a throw: the field without the current command's own presentation, then the segment field with every
 * completed command applied (a command whose application throws is skipped).
 */
export function containedBattleResolutionDisplayedField(
  state: BattleResolutionPresentationState,
  what: string,
): BattleResolutionPresentationRenderView["field"] {
  const record = (error: unknown) => recordContainedPresentationError("field",
    containedPresentationCommand(state)?.type ?? "view", error, `${what}: ${presentationCommandDetail(state)}`);
  try {
    return createBattleResolutionPresentationRenderView(state).field;
  } catch (error) {
    record(error);
  }
  try {
    return createBattleResolutionPresentationRenderView(state, null, true).field;
  } catch (error) {
    record(error);
  }
  let field = state.field;
  const commands = state.segments[state.segmentIndex]?.commands ?? [];
  for (let index = 0; index < Math.min(state.commandIndex, commands.length); index += 1) {
    try {
      field = applyCompletedCommand(field, commands[index]!);
    } catch (error) {
      record(error);
    }
  }
  return field;
}

export function renderBattleResolutionPresentation(
  framebuffer: Uint8Array,
  state: BattleResolutionPresentationState,
  assets: BattleResolutionPresentationRenderAssets,
  presentationRngHost?: PresentationRngHost | null,
): void {
  const command = assets.drawStaticScene === undefined ? null : containedPresentationCommand(state);
  if (command === null || presentationCommandDegradation(command) === undefined) {
    try {
      assets.drawScene(framebuffer, createBattleResolutionPresentationRenderView(state, presentationRngHost));
      return;
    } catch (error) {
      if (command === null) throw error;
      recordContainedPresentationError("draw", command.type, error, presentationCommandDetail(state));
      markPresentationCommandDegraded(command, 1);
    }
  }
  // The decline path: the static draw of the command's ordinary view (what a declined live body shows); if that view or its
  // draw throws too, the view without the command's own presentation. A throw there is not contained.
  const drawStatic = assets.drawStaticScene!;
  if (presentationCommandDegradation(command) === 1) {
    try {
      framebuffer.fill(0);
      drawStatic(framebuffer, createBattleResolutionPresentationRenderView(state, presentationRngHost));
      return;
    } catch (error) {
      recordContainedPresentationError("draw", command.type, error, presentationCommandDetail(state));
      markPresentationCommandDegraded(command, 2);
    }
  }
  framebuffer.fill(0);
  drawStatic(framebuffer, createBattleResolutionPresentationRenderView(state, presentationRngHost, true));
}
