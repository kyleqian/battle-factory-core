import {
  BATTLE_COMMAND_ACTION_ENTER_DELAY,
  type BattleCommandFieldBattler,
  type BattleCommandUiStatus,
} from "./battleCommandPresentation.ts";
import {
  createBattleCommandFieldArtView,
  type BattleCommandFieldArtView,
} from "./battleCommandFieldArt.ts";
import type {
  BattleResolutionDisplayedField,
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
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
  battleHealthBarValueAtFrame,
  type HealthboxContentParams,
} from "./healthboxAssembly.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import {
  partySendOutGoTextVisibleChars,
  type PartySendOutPhase,
  partySendOutPhase,
} from "./partySelect.ts";
import { genericHitReactionAtAge } from "./battleMenu.ts";

export const BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES =
  BATTLE_COMMAND_ACTION_ENTER_DELAY;
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
export function midBattleSwitchOutFeetAnchorY2(scale: number): number {
  if (scale <= MID_BATTLE_SWITCH_OUT_SCALE_START) return 0;
  const varr = 64 - 2 * 13;
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
    y2: midBattleSwitchOutFeetAnchorY2(scale),
    spriteVisible: renderedElapsed < MID_BATTLE_SWITCH_OUT_SPRITE_FREED_ELAPSED,
  });
}

export type MidBattleSwitchInView = Readonly<{
  elapsed: number;
  battler: 0 | 1;
  ballVisible: boolean;
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
  /** Player-healthbox x2 slide offset (110 -> 0 at 5 px/frame), or null before the slide. */
  healthboxDx: number | null;
}>;

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
): MidBattleSwitchInView {
  // The ball's rendered state is the RAM probe one tick earlier (trace 1143 =
  // elapsed 3 first shows RAM 1142's (0,0) state; trace 1184 = elapsed 44
  // shows RAM 1183's (45,47); elapsed 45's RAM 1184 state renders no opaque
  // pixels above the terrain clip). Table entry = elapsed - 2.
  const ballEntry = elapsed - MID_BATTLE_SWITCH_BALL_FIRST_VISIBLE_ELAPSED;
  const ballVisible = ballEntry >= 0
    && ballEntry < MID_BATTLE_SWITCH_BALL_THROW_TABLE.length;
  const ball = ballVisible
    ? MID_BATTLE_SWITCH_BALL_THROW_TABLE[ballEntry]!
    : null;
  const monVisible = elapsed >= MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED;
  // The emerge's scale (and y2 descent) render one tick behind the §10.3
  // RAM table -- the mon becomes visible at elapsed 48 but that frame shows
  // the accumulator the probe records at 1187 (acc 40, pa 1638), and acc 58
  // first renders at elapsed 49 (trace 1189). Pixel-fit across 1190-1198:
  // rendered acc = 58 + 18*(elapsed-49), y2 = MATERIALIZE_Y2_TABLE[elapsed-49].
  const emergeAccumulator = Math.min(
    MID_BATTLE_SWITCH_EMERGE_NEUTRAL_ACCUMULATOR,
    MID_BATTLE_SWITCH_EMERGE_START_ACCUMULATOR
      + MID_BATTLE_SWITCH_EMERGE_ACCUMULATOR_STEP
        * (elapsed - MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED - 1),
  );
  const healthboxDx =
    elapsed < MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED
      ? null
      : Math.max(
          0,
          MID_BATTLE_SWITCH_HEALTHBOX_START_DX
            - MID_BATTLE_SWITCH_HEALTHBOX_STEP
              * (elapsed - MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED),
        );
  return Object.freeze({
    elapsed,
    battler,
    ballVisible,
    ballPosition: ball
      ? Object.freeze({
          x: MID_BATTLE_SWITCH_BALL_BASE_X + ball.x2,
          y: MID_BATTLE_SWITCH_BALL_BASE_Y + ball.y2,
        })
      : Object.freeze({ x: MID_BATTLE_SWITCH_BALL_BASE_X, y: MID_BATTLE_SWITCH_BALL_BASE_Y }),
    ballMatrix: ball
      ? Object.freeze({ pa: ball.pa, pb: ball.pb, pc: ball.pc, pd: ball.pd })
      : Object.freeze({ pa: 256, pb: 0, pc: 0, pd: 256 }),
    monVisible,
    emergeAccumulator,
    healthboxDx,
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
      ? start + 26 + i + (i >= 6 ? 1 : 0)
      : start + 27 + i;
    if (traceFrame > destroyTick) continue;
    const age = traceFrame - start - 2 - i;
    if (age < 0) continue;
    const frozen =
      (window === "recall" && traceFrame >= 1122 && i >= 6)
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
): MidBattleSwitchFadeAt | null {
  // The §8.3 tables are the fade's per-tick STATE; the oracle's rendered
  // frame lags one tick behind them, so each coefficient is the table value
  // at `traceFrame - 1` (i.e. the white fade's `y` at `traceFrame - 2`).
  const inRecall = traceFrame >= 1088 && traceFrame <= 1139;
  if (inRecall) {
    return Object.freeze({
      bg: recallWhiteCoefficientAtFrame(traceFrame - 2),
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

function recallWhiteCoefficientAtFrame(frame: number): number {
  const k = frame - 1088;
  if (k < 0) return 0;
  if (k <= 16) return 2 * Math.floor((k + 1) / 2); // white in 1088-1104
  if (k <= 21) return 16; // plateau 1105-1109 (softwareFadeFinishing)
  if (k <= 38) {
    // White out 1110-1126. The frame-1121 stolen tick (heavy party-summary
    // sprite-sheet work) skips that frame's update: y holds at 6 for three
    // ticks (1119-1121), and the remaining steps shift one frame later.
    if (k === 33) return 6;
    const shifted = k >= 34 ? k - 1 : k;
    return 16 - 2 * Math.ceil((shifted - 22) / 2);
  }
  return 0; // finishing 1128-1131 clears, then idle
}

function sendInWhiteCoefficientAtFrame(frame: number): number {
  const k = frame - 1187;
  if (k < 0) return 0;
  if (k <= 15) return 2 * Math.floor((k + 2) / 2); // white in 1187-1202 (launch already stepped)
  if (k <= 21) return 16; // plateau 1203-1208 (healthbox-slide stolen tick extends it)
  if (k <= 38) return 16 - 2 * Math.ceil((k - 22) / 2); // white out 1209-1224
  return 0; // finishing 1226-1230 clears, then idle
}

export type BattleResolutionRenderEffect =
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
  }> | null;
  switchIn: Readonly<{
    elapsed: number;
    phase: PartySendOutPhase;
    battler: 0 | 1;
    partyStates: readonly import("./battleResolutionPresentation.ts").PartyBallState[];
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
  midBattleSwitchFade: Readonly<{ bg: number; obj: number }> | null;
  /**
   * §10.2 residual 1b: the mid-battle switch ball-open particles (recall
   * 1089-1130 base (72,112) prio 2, send-in 1187-1228 base (72,123) prio 1).
   * `schedules` carries each alive particle's spawn index + rendered age; the
   * scene renderer applies the Sin/Cos radial offsets and the tile cycle.
   */
  midBattleSwitchParticles: Readonly<{
    window: "recall" | "send-in";
    schedules: readonly MidBattleSwitchParticle[];
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

function applyCompletedCommand(
  field: BattleResolutionDisplayedField,
  command: BattleResolutionPresentationCommand,
): BattleResolutionDisplayedField {
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
  ) return field;
  if (command.type === "switch-in") {
    return replaceFieldBattler(field, command.battler, command.incoming);
  }
  throw new Error("battle resolution renderer received an unknown command");
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

export function battleResolutionCommandDuration(
  command: BattleResolutionPresentationCommand,
  field: BattleResolutionDisplayedField,
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
    case "move-animation":
    case "hit-animation":
      return command.timing.minimumFrames;
    case "hp": {
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
      );
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
  let field = state.field;
  for (let index = 0; index < state.commandIndex; index += 1) {
    field = applyCompletedCommand(field, segment.commands[index]!);
  }
  return state.lifecycle.phaseElapsed + 1
    >= battleResolutionCommandDuration(command, field);
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

function healthboxParams(
  battler: BattleCommandFieldBattler,
  targetHp?: number,
): HealthboxContentParams {
  return Object.freeze({
    name: battler.name,
    level: battler.level,
    gender: battler.gender === "genderless" ? "none" : battler.gender,
    hpFraction: battler.hp / battler.maxHP,
    ...(targetHp === undefined
      ? {}
      : { hpTargetFraction: targetHp / battler.maxHP }),
    status: battler.status,
  });
}

/**
 * Projects one framebuffer view strictly from the immutable display field,
 * typed commands, and command-relative lifecycle. It never reads the
 * transition's settled rules, battle RNG, scene elapsed time, or a canonical
 * duration vector.
 */
export function createBattleResolutionPresentationRenderView(
  state: BattleResolutionPresentationState,
): BattleResolutionPresentationRenderView {
  const segment = currentSegment(state);
  let field = state.field;
  let latestMessage: readonly string[] | null = null;
  let switchIn: BattleResolutionPresentationRenderView["switchIn"] = null;
  let midBattleSwitchIn: BattleResolutionPresentationRenderView["midBattleSwitchIn"] = null;
  let switchOut: BattleResolutionPresentationRenderView["switchOut"] = null;
  let partySummary: BattleResolutionPresentationRenderView["partySummary"] = null;
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
  for (let segmentIndex = 0; segmentIndex < state.segmentIndex; segmentIndex += 1) {
    for (const completed of state.segments[segmentIndex]!.commands) {
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
      });
  // ISSUES #78 residual (1): the white ball-fade only ever runs on a
  // mid-battle SWITCH resolution. The `fadeTick` clock + the hardcoded
  // recall/send-in trace-frame windows ([1088,1139]/[1187,1231] relative to
  // `MID_BATTLE_SWITCH_FADE_BASE_TRACE`) are calibrated to the staged
  // voluntary-switch fixture; a non-switch resolution (e.g. a plain move like
  // this trace's GUST) can still advance `fadeTick` into that numeric range
  // and must not render a phantom ball-fade on its field/sprite.
  const midBattleSwitchFade = state.sourceDecision.kind === "switch"
    ? midBattleSwitchFadeAt(MID_BATTLE_SWITCH_FADE_BASE_TRACE + state.fadeTick)
    : null;
  // §10.2 residual 1b: the ball-open particle burst, keyed to the same
  // switch-only fade windows (recall 1089-1130, send-in 1187-1228) so a
  // non-switch resolution never leaks particles.
  const midBattleSwitchParticles = state.sourceDecision.kind !== "switch"
    ? null
    : (() => {
        const traceFrame = MID_BATTLE_SWITCH_FADE_BASE_TRACE + state.fadeTick;
        const window = traceFrame >= MID_BATTLE_SWITCH_SEND_IN_PARTICLE_START_TRACE
          ? "send-in"
          : "recall";
        return Object.freeze({
          window,
          schedules: midBattleSwitchParticleSchedulesAt(traceFrame, window),
        });
      })();
  if (state.lifecycle.phase === "presenting-switch-in") {
    const switchCommand = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "switch-in" }
      > => candidate.type === "switch-in",
    );
    const summary = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "party-summary" }
      > => candidate.type === "party-summary" && candidate.visible,
    );
    const message = segment.commands.find(
      (candidate): candidate is Extract<
        BattleResolutionPresentationCommand,
        { type: "message" }
      > => candidate.type === "message",
    );
    if (!switchCommand || !summary || !message) {
      throw new Error(
        "battle resolution switch-in lifecycle requires summary, message, and switch commands",
      );
    }
    field = replaceFieldBattler(
      field,
      switchCommand.battler,
      switchCommand.incoming,
    );
    latestMessage = message.lines;
    switchIn = Object.freeze({
      elapsed: state.lifecycle.phaseElapsed,
      phase: partySendOutPhase(state.lifecycle.phaseElapsed),
      battler: switchCommand.battler,
      partyStates: summary.states,
    });
  }
  for (let index = 0; index < state.commandIndex; index += 1) {
    const completed = segment.commands[index]!;
    field = applyCompletedCommand(field, completed);
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
        ? Object.freeze({ battler: completed.battler, states: completed.states })
        : null;
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
      : partySendOutGoTextVisibleChars(switchIn.elapsed);
  let hpTarget: Readonly<{ battler: 0 | 1; to: number }> | null = null;
  let waitCursor: Readonly<{ age: number }> | null = null;
  let activeTrainerSlide: Readonly<{ battler: 0 | 1; offscreenX2: number }> | null = null;

  if (
    (
      state.lifecycle.phase === "presenting"
      || state.lifecycle.phase === "awaiting-message-dismiss"
      || state.lifecycle.phase === "forced-party-handoff"
    )
    && command
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
      field = withDisplayedHp(
        field,
        command.battler,
        battleHealthBarValueAtFrame(
          { maxHp: battler.maxHP, from: command.from, to: command.to },
          state.lifecycle.phaseElapsed,
        ),
      );
      hpTarget = Object.freeze({ battler: command.battler, to: command.to });
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
      if (command.timing.sink === "opponent-tile-rows") {
        const d = state.lifecycle.phaseElapsed - 1;
        const erased = d <= 0
          ? 0
          : Math.min(command.timing.steps, Math.ceil(d / 2));
        effect = Object.freeze({
          type: "faint",
          battler: command.battler,
          healthboxVisible:
            state.lifecycle.phaseElapsed
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
            state.lifecycle.phaseElapsed
            < command.timing.healthboxVanishFrame,
          sink: Object.freeze({
            type: "player-pixel-rows",
            skipPixelRows: Math.min(
              command.timing.spriteRows,
              command.timing.pixelsPerFrame * state.lifecycle.phaseElapsed,
            ),
          }),
        });
      }
    } else if (command.type === "party-summary") {
      // ISSUES #78: the same skipPlayer gate as the completed-command loop
      // above -- the player side never draws the tray on the switch route.
      partySummary = command.visible && command.battler !== 0
        ? Object.freeze({ battler: command.battler, states: command.states })
        : null;
    } else if (command.type === "switch-in") {
      // The incoming mon is already the field battler; the mid-battle
      // switch-in view holds its visible onset until the ball-release emerge.
      field = replaceFieldBattler(field, command.battler, command.incoming);
      midBattleSwitchIn = midBattleSwitchInAt(
        state.lifecycle.phaseElapsed,
        command.battler,
      );
      fainted.delete(command.battler);
    } else if (command.type === "switch-out") {
      // ISSUES #78 slice 4: the outgoing mon's return-to-ball scale-up owns
      // the battler's pixels for the whole span (the generic draw is gated
      // off below); from relative 25 the sprite is freed and the field is
      // empty until the send-in.
      switchOut = midBattleSwitchOutAt(
        state.lifecycle.phaseElapsed,
        command.battler,
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
    state.lifecycle.phase !== "confirm-handoff"
    &&
    state.lifecycle.phase !== "next-command-handoff"
    && state.lifecycle.phase !== "terminal-handoff"
    && state.lifecycle.phase !== "presenting-switch-in"
    && state.lifecycle.phase !== "presenting"
  ) {
    throw new Error(
      `battle resolution non-KO renderer cannot render ${state.lifecycle.phase}`,
    );
  }

  const playerTarget =
    hpTarget?.battler === 0 ? hpTarget.to : undefined;
  const opponentTarget =
    hpTarget?.battler === 1 ? hpTarget.to : undefined;
  const playerFaint = effect?.type === "faint" && effect.battler === 0
    ? effect
    : null;
  const opponentFaint = effect?.type === "faint" && effect.battler === 1
    ? effect
    : null;
  const fieldArt = createBattleCommandFieldArtView(field);
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
        ...healthboxParams(field.player, playerTarget),
        currentHp: field.player.hp,
        maxHp: field.player.maxHP,
      }),
      opponent: healthboxParams(field.opponent, opponentTarget),
    }),
    message:
      latestMessage === null
        ? null
        : Object.freeze({
            lines: latestMessage,
            visibleCharacters,
          }),
    effect,
    visibility: Object.freeze({
      player: Object.freeze({
        sprite: (spriteVisibility.get(0) ?? true)
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
              >= fieldArt.player.pic.tileset.rows * 8
          ),
        healthbox: !fainted.has(0)
          && (playerFaint?.healthboxVisible ?? true)
          && (healthboxVisibility.get(0) ?? true)
          && midBattleSwitchIn?.battler !== 0,
      }),
      opponent: Object.freeze({
        sprite: (spriteVisibility.get(1) ?? true)
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
    partySummary,
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

export function renderBattleResolutionPresentation(
  framebuffer: Uint8Array,
  state: BattleResolutionPresentationState,
  assets: BattleResolutionPresentationRenderAssets,
): void {
  assets.drawScene(
    framebuffer,
    createBattleResolutionPresentationRenderView(state),
  );
}
