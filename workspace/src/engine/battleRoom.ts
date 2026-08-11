// S6 slice 2a: the BattleFrontier_BattleFactoryBattleRoom ENTRY window
// (tools/compare/traces-groundtruth/battle1-intro.json ticks 520-624) - warp
// fade-in + camera pan + decoy walk to settle. Picks up exactly where
// prebattleRoom.ts's "warpFade" phase leaves off (that phase already renders
// solid black indefinitely once its own fade settles - see core.ts's
// handoff at the fixed elapsed count matching trace tick 520).
//
// Ground truth: a custom RAM probe (tools/probe/ram-probe.py's own
// spec/struct-offset conventions, hand-extended since the fields needed
// here - gObjectEvents[].currentCoords/spriteId, gSprites[].x/y/animNum/
// animCmdIndex, gTotalCameraPixelOffsetY - aren't in that script's default
// watch list) read every tick 510-629, cross-checked against a dense oracle
// pixel probe (bin/oracle run, every frame 515-545) for the fade curve.
// Offsets: struct Sprite (include/sprite.h) x=0x20/y=0x22/animNum=0x2A/
// animCmdIndex=0x2B (sizeof 0x44); struct ObjectEvent
// (include/global.fieldmap.h) active=byte0x00 bit0/spriteId=0x04/
// currentCoords=0x10 (sizeof 0x24); gTotalCameraPixelOffsetY=0x3005de8
// (field_camera.c) - the cumulative vertical camera pan since the room
// loaded, reset to 0 as of trace tick 515 (the previous room's stale value
// carries over one instant, then resets).
//
// Findings:
// 1. **Fade-in reuses paletteFade.ts's FADE_IN exactly** (same shape as the
//    pre-battle room's own room fade-in) but with different tick indexing
//    at the call site: pixel-sampling a static background pixel (x200,y2,
//    an interior white tile, oracle PNGs for every frame 515-545) shows the
//    brightness ramp 24,24,57,57,90,90,123,123,156,156,189,189,222,222,255...
//    starting at trace tick 520 - this is bgFadeY(k, FADE_IN) for k =
//    elapsed directly (NOT elapsed+1, unlike prebattleRoom.ts's "fadingIn"
//    phase, which renders ticks=elapsed+1) - verified algebraically via
//    blendComponentToBlack for all 8 distinct steps, 0 mismatches. OBJ
//    (sprites) uses objFadeY(k, FADE_IN) the same way, one tick behind BG
//    per that function's own established lag (paletteFade.ts doc point 2).
// 2. **Camera pans a clean 1px/tick** - contra the extraction dossier's
//    "may not be a clean 1px/tick" open question (docs/battle-room-notes.md
//    §6 risk 1): gTotalCameraPixelOffsetY is static at 0 through RAM tick
//    541, then increments by exactly 1 every tick through tick 621 (value
//    80, matching initialCameraOriginPx.y(104) -> settledCameraOriginPx.y
//    (24)), then holds forever. No sub-tile easing/curve.
// 3. **The decoy's walk animation** (object_event_anims.h:211-218
//    sAnim_GoNorth: cmdIdx 0/2 -> picture-table frames 5/6, cmdIdx 1/3 ->
//    frame 1, each held 8 ticks, ANIM_STD_GO_NORTH = index 5 of
//    sAnimTable_Standard, object_event_anims.h:825-846) starts the same RAM
//    tick the pan itself starts (542) at a phase offset (first observed at
//    cmdIdx 1, not 0) and free-runs; baked as a literal per-elapsed-tick
//    table (ENTRY_STEPS) rather than re-deriving the ANIMCMD cadence
//    generically, matching this run's own established convention
//    (prebattleRoom.ts's WALK_STEPS) for oracle-pinned motion. Settles at
//    RAM tick 622 (one tick after the pan itself stops) on sAnim_GoEast's
//    frame 2 with hFlip (object_event_anims.h:229-236) - "face east",
//    matching docs/battle-room-notes.md's documented settle facing.
// 4. **The 6 scientists never move or animate this window** - RAM shows
//    animNum/animCmdIndex frozen the whole time (an equivalent-to-face-
//    south state, picture frame 0 either way), matching the brief's
//    "scientists still pre-turn" at tick 624. They DO shift on screen as
//    the camera pans, but via the same static tile-based camera formula
//    battleRoomRender.ts/prebattleRoomRender.ts already use elsewhere (no
//    separate per-scientist RAM table needed - just the panning origin).
// 5. **The decoy's own screen position is NOT the standard tile-camera
//    formula** - it reads a flat +8px off what that formula predicts for
//    its spawn tile the whole window, because it's mid-continuous-movement
//    (coordOffsetEnabled=FALSE for this sprite, matching prebattleRoom.ts's
//    own note that the camera-anchor-tracking/walking sprite's raw
//    gSprites[].x/y IS already the final screen position - no
//    gSpriteCoordOffsetX/Y addition needed). Baked directly from the
//    RAM-sampled values.

import { FADE_IN } from "./paletteFade.ts";
import type { FactoryTrainerPresentation } from "./factoryTrainerPresentation.ts";

export type BattleRoomPhase = "entering" | "msgboxIdle" | "msgboxClosing" | "settled";

export interface BattleRoomState {
  phase: BattleRoomPhase;
  /** Ticks since the first visible room frame (0 = trace tick 520, the ground-truth trace's own frame boundary - docs/battle-bringup-notes.md "Slice-0 ground truth" §2). */
  elapsed: number;
  /** Encounter-selected overworld gfx and Easy Chat opening quote. */
  encounter?: "destin" | "jenson";
  /** Generated round identity; absent only on the legacy canonical fixture. */
  trainerPresentation?: FactoryTrainerPresentation;
}

/** core.ts creates this the tick prebattleRoom's "warpFade" phase reaches the fixed elapsed count matching trace tick 520 (see core.ts's handoff). */
export const INITIAL_BATTLE_ROOM_STATE: BattleRoomState = { phase: "entering", elapsed: 0 };
export const INITIAL_BATTLE_2_ROOM_STATE: BattleRoomState = {
  phase: "entering",
  elapsed: 0,
  encounter: "jenson",
};

/** Battle 2's ASYMMETRIC_SPIRAL_IN_SEQ transition reaches the battle-scene
 * black hold at this encounter-relative settled age. */
export const BATTLE_2_SCENE_HANDOFF_ELAPSED = 209;

/**
 * Extra, non-VBlank Random() calls made while the opponent party and battle
 * transition are prepared. `settled.elapsed === 0` is the frame the first
 * rejection loop completes; the later ages are source/RAM-relative to that
 * state edge, not global trace ticks. The ordinary one-call-per-VBlank
 * cadence is owned by core.ts and is deliberately excluded here.
 *
 * FillFactoryFrontierTrainerParty uses Random32() twice per rejected
 * personality candidate, hence 28*2, 16*2, and 95*2 calls for this trace's
 * three source-derived nature loops. GetSpecialBattleTransition contributes
 * the final single call. See docs/battle-bringup-notes.md §3.1.
 */
export function opponentSetupExtraRngSteps(state: BattleRoomState): number {
  if (state.phase !== "settled") return 0;
  if (state.encounter === "jenson") {
    switch (state.elapsed) {
      case 0:
        return 25 * 2;
      case 8:
        return 11 * 2;
      case 15:
        return 2 * 2;
      case 23:
        return 1;
      default:
        return 0;
    }
  }
  switch (state.elapsed) {
    case 0:
      return 28 * 2;
    case 11:
      return 16 * 2;
    case 18:
      return 95 * 2;
    case 26:
      return 1;
    default:
      return 0;
  }
}

/**
 * prebattleRoom.ts's "warpFade" phase elapsed count at which core.ts hands
 * off to this module: WALK_TICKS (80) ticks of walking + this many ticks of
 * warpFade puts the render at trace tick 483+37 = 520, the ground-truth
 * trace's own first visible-room frame (docs/battle-bringup-notes.md
 * "Slice-0 ground truth" §2).
 */
export const WARP_FADE_TO_ROOM_ELAPSED = 37;

/**
 * "entering" covers every deterministic tick (camera pan, scientists' turn,
 * opponent walk-in, msgbox appear+print - all pure functions of `elapsed`,
 * see below) through print-complete (MSGBOX_PRINT_COMPLETE_ELAPSED); from
 * there the msgbox phases take over (see that section's doc for why they're
 * split out - the close is player-paced, unlike everything above).
 */
export function advanceBattleRoom(state: BattleRoomState): BattleRoomState {
  switch (state.phase) {
    case "entering": {
      const elapsed = state.elapsed + 1;
      if (elapsed >= msgboxPrintCompleteElapsed(state)) {
        return { ...state, phase: "msgboxIdle", elapsed: 0 };
      }
      return { ...state, phase: "entering", elapsed };
    }
    case "msgboxIdle":
      // MSGBOX_DEFAULT blocks on player A - core.ts detects the press and
      // starts "msgboxClosing" directly (see that section's doc); this case
      // only covers ticks with no press yet, holding byte-identical.
      return state.encounter === "jenson"
        ? { ...state, elapsed: state.elapsed + 1 }
        : state;
    case "msgboxClosing": {
      const elapsed = state.elapsed + 1;
      if (elapsed >= MSGBOX_CLOSE_TICKS) return { ...state, phase: "settled", elapsed: 0 };
      return { ...state, phase: "msgboxClosing", elapsed };
    }
    case "settled":
      return { ...state, phase: "settled", elapsed: state.elapsed + 1 };
  }
}

export function battleRoomQuoteInputReady(state: BattleRoomState): boolean {
  if (state.phase !== "msgboxIdle") return false;
  return state.encounter !== "jenson" || state.elapsed >= 2;
}

/**
 * Per-elapsed-tick table (RAM-probed, RAM ticks 519..622 -> elapsed 0..103 -
 * see module doc points 2/3), one row per tick: [camPanY, decoyFrame,
 * decoyHFlip]. `camPanY` is how many pixels the camera (and every
 * world-fixed sprite, e.g. the scientists) has panned north so far -
 * subtract from the room's initial origin/screen-Y. Clamped past the end
 * (index 103, the settled state - camera stopped at elapsed 102, decoy's
 * own face-east settle pose lands one tick later).
 */
const ENTRY_STEPS: readonly (readonly [number, number, boolean])[] = [
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [0, 1, false],
  [1, 6, false],
  [2, 6, false],
  [3, 6, false],
  [4, 6, false],
  [5, 6, false],
  [6, 6, false],
  [7, 6, false],
  [8, 6, false],
  [9, 1, false],
  [10, 1, false],
  [11, 1, false],
  [12, 1, false],
  [13, 1, false],
  [14, 1, false],
  [15, 1, false],
  [16, 1, false],
  [17, 5, false],
  [18, 5, false],
  [19, 5, false],
  [20, 5, false],
  [21, 5, false],
  [22, 5, false],
  [23, 5, false],
  [24, 5, false],
  [25, 1, false],
  [26, 1, false],
  [27, 1, false],
  [28, 1, false],
  [29, 1, false],
  [30, 1, false],
  [31, 1, false],
  [32, 1, false],
  [33, 6, false],
  [34, 6, false],
  [35, 6, false],
  [36, 6, false],
  [37, 6, false],
  [38, 6, false],
  [39, 6, false],
  [40, 6, false],
  [41, 1, false],
  [42, 1, false],
  [43, 1, false],
  [44, 1, false],
  [45, 1, false],
  [46, 1, false],
  [47, 1, false],
  [48, 1, false],
  [49, 5, false],
  [50, 5, false],
  [51, 5, false],
  [52, 5, false],
  [53, 5, false],
  [54, 5, false],
  [55, 5, false],
  [56, 5, false],
  [57, 1, false],
  [58, 1, false],
  [59, 1, false],
  [60, 1, false],
  [61, 1, false],
  [62, 1, false],
  [63, 1, false],
  [64, 1, false],
  [65, 6, false],
  [66, 6, false],
  [67, 6, false],
  [68, 6, false],
  [69, 6, false],
  [70, 6, false],
  [71, 6, false],
  [72, 6, false],
  [73, 1, false],
  [74, 1, false],
  [75, 1, false],
  [76, 1, false],
  [77, 1, false],
  [78, 1, false],
  [79, 1, false],
  [80, 1, false],
  [80, 2, true],
];

export interface EntryStep {
  camPanY: number;
  decoyFrame: number;
  decoyHFlip: boolean;
}

export function entryStep(elapsed: number): EntryStep {
  const row = ENTRY_STEPS[Math.min(elapsed, ENTRY_STEPS.length - 1)]!;
  return { camPanY: row[0], decoyFrame: row[1], decoyHFlip: row[2] };
}

/** Elapsed tick the scene is fully settled (camera + decoy stopped) - RAM tick 622. */
export const ENTRY_SETTLE_ELAPSED = ENTRY_STEPS.length - 1;

// S6 slice 2b: SCIENTISTS-TURN + OPPONENT WALK-IN window (trace ticks
// 624-717 - elapsed 104-197, this module's `elapsed` = trace tick - 520).
//
// Ground truth: a custom RAM probe (same conventions as slice 2a's module
// doc above - struct Sprite/ObjectEvent offsets, gObjectEvents=0x2037350/
// gSprites=0x2020630/sizeof 0x24/0x44), every tick 600-745, watching all 16
// gObjectEvents slots' active/spriteId/graphicsId/localId/currentCoords/
// movementActionId and the corresponding gSprites' x/y/animNum/
// animCmdIndex/hFlip/invisible bits. Cross-checked against source
// (data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc's
// EventScript_ScientistsFaceBattle + EventScript_EnterRoom's
// removeobject/setobjectxyperm/addobject/applymovement sequence,
// src/event_object_movement.c's MovementAction_WalkInPlaceFasterRight/
// Left_Step0 + InitMoveInPlace/MovementAction_WalkInPlace_Step1, and
// src/data/object_events/object_event_anims.h's sAnimTable_Standard).
//
// **One-tick render lag applies here too** (this module's own doc for
// slice 2a: "frame N = RAM of tick N-1"), cross-confirmed against the
// already-pinned ENTRY_SETTLE_ELAPSED boundary (RAM tick 622 -> frame/
// elapsed 103, i.e. frameTick = RAMtick + 1, so elapsed = RAMtick - 519).
// All tick numbers below are already given in `elapsed` terms (post-shift).
//
// Findings:
// 1. **Scientists' turn is exactly 2 ticks of a transient frame, not 4** -
//    the RAM `duration=4` passed to InitMoveInPlace (event_object_movement.c
//    :5822-5828, `MovementAction_WalkInPlaceFasterRight/Left_Step0`) counts
//    *movement-step calls*, not visually-distinct frames: the anim's own
//    ANIMCMD_FRAME duration is 2 ticks/entry (`sAnim_GoFasterEast/West`,
//    object_event_anims.h:292-308, frames `[7,2,8,2]` each hFlip per
//    direction), and `SetStepAnimHandleAlternation`'s alternation logic
//    starts the anim already at cmdIndex 2 (not 0) - matching this file's
//    own precedent for the decoy's walk (doc point 3 above: "first observed
//    at cmdIdx 1, not 0"). Net effect, RAM-confirmed tick-by-tick: elapsed
//    <=105 holds the pre-turn face-south pose (picture frame 0); elapsed
//    106-107 shows the transient picture frame 8 (`ANIMCMD_FRAME(8,2,...)`,
//    cmdIndex 2); elapsed >=108 holds picture frame 2 (`ANIMCMD_FRAME(2,2,
//    ...)`, cmdIndex 3) - the SAME frame the movement settles on
//    (`animPaused=TRUE` freezes at whatever cmdIndex was live when the
//    4-tick action counter hits 0), so there is no distinct third phase.
//    hFlip is TRUE (face east) for scientists 1-3 (`turn: "east"` in
//    battle-room-layout.json, `Common_Movement_WalkInPlaceFasterRight` ->
//    `sAnim_GoFasterEast`, all frames hFlip) and FALSE (face west) for
//    scientists 4-6 (`...FasterLeft` -> `sAnim_GoFasterWest`, no hFlip) -
//    matching the doc's documented turn directions. All 6 scientists turn
//    in exact lockstep (single shared `waitmovement 0` after all 6
//    `applymovement`s, scripts.inc:235-241) - one shared phase table
//    suffices, no per-scientist timing needed.
// 2. **The opponent is added and starts its first walk_down step within the
//    same elapsed tick** - RAM shows the object still at its old (7,4)
//    template position/gfx through elapsed 111, then fully active at the
//    new (7,1) spawn tile *already one sub-pixel step into its walk*
//    (`sy` raw already offset by 1 from the extrapolated spawn value) at
//    elapsed 112 - i.e. `factory_setopponentgfx`/`removeobject`/
//    `setobjectxyperm`/`addobject`/`applymovement`'s Step0 (which
//    immediately calls Step1, `event_object_movement.c`'s general
//    `InitMovementNormal`+`Step1` pattern) all resolve inside one engine
//    tick, same as scientists' turn starting pre-advanced (finding 1).
//    Screen Y is **not** derived from the tile-camera formula during the
//    walk (unlike the settled/static case) - it free-runs a clean 1px/tick
//    ramp (no sub-tile easing, same convention as the entry camera pan),
//    RAM-confirmed via the sprite's raw `y` + the settled camera origin's Y
//    (24) matching the tile-formula screen position at both ends: spawn
//    tile (7,1) -> -23 at elapsed 112 (one tick past the formula spawn of
//    -24) and settle tile (7,6) -> 56 at elapsed 191 (`tileScreenPos`'s own
//    formula, independently confirmed since the opponent is static there,
//    same as the scientists' proven convention) - a clean affine map,
//    `screenY(elapsed) = elapsed - 135`, clamped at the settle value past
//    191. Screen X never changes (`walk_down` is vertical-only) - drawn via
//    the ordinary `tileScreenPos` tile-formula on the fixed tile x=7, same
//    as every other camera-tracked element (no raw-sprite-x dependency,
//    sidestepping this sprite's own raw-x/y encoding quirks).
// 3. **The walk's picture-frame cycle is `sAnim_GoSouth`** (animNum 4 =
//    `ANIM_STD_GO_SOUTH`, `object_event_anims.h:202-209`: frames
//    `[3,0,4,0]`, 8 ticks each, no hFlip) - RAM-confirmed for the full
//    80-tick walk (elapsed 112-191, 5 tiles x 16 ticks/tile, `walk_down x5`
//    at this game's established 1px/tick object-movement speed - see doc
//    point 3 above for the pan's own confirmation of this per-tick rate).
//    At settle (elapsed >=192) the RAM shows `animNum` switch to 6
//    (`ANIM_STD_GO_WEST`) cmdIndex 1 = picture frame 2, no hFlip - "face
//    west", matching `Movement_OpponentEnter`'s trailing `face_left`
//    (scripts.inc:206-213) and the documented settle facing.

/** Scientists' turn phase, keyed by `elapsed` (see finding 1 above). Picture frame 0 = pre-turn (face south); 8 = transient; 2 = settled turned (east/west per each scientist's own `turn` field). */
export function scientistTurnFrame(elapsed: number): { frame: number; turned: boolean } {
  if (elapsed < 106) return { frame: 0, turned: false };
  if (elapsed < 108) return { frame: 8, turned: true };
  return { frame: 2, turned: true };
}

/** First elapsed tick the opponent is active/visible (see finding 2). */
export const OPPONENT_ADD_ELAPSED = 112;
/** Last elapsed tick of the opponent's walk_down ramp - screenY reaches its settled value here and holds. */
export const OPPONENT_WALK_END_ELAPSED = 191;
/** Opponent's settled screen Y (tile (7,6) via the standard tileScreenPos formula - see finding 2). */
export const OPPONENT_SETTLED_SCREEN_Y = 56;

export interface OpponentStep {
  visible: boolean;
  /** Picture frame index into the opponent's 9-frame sheet. */
  frame: number;
  screenY: number;
}

/** The invisible/pre-add placeholder - never drawn (battleRoomRender.ts checks `visible`). */
const OPPONENT_HIDDEN: OpponentStep = { visible: false, frame: 0, screenY: 0 };

/** Opponent's per-tick walk-in state, keyed by `elapsed` (see findings 2/3). */
export function opponentStep(elapsed: number): OpponentStep {
  if (elapsed < OPPONENT_ADD_ELAPSED) return OPPONENT_HIDDEN;
  const screenY = Math.min(elapsed - 135, OPPONENT_SETTLED_SCREEN_Y);
  if (elapsed > OPPONENT_WALK_END_ELAPSED) {
    return { visible: true, frame: 2, screenY };
  }
  const cyclePos = Math.floor((elapsed - OPPONENT_ADD_ELAPSED) / 8) % 4;
  const frame = [3, 0, 4, 0][cyclePos]!;
  return { visible: true, frame, screenY };
}

// S6 slice 2c: OPPONENT-SPEECH MSGBOX window (trace ticks 718-843 - elapsed
// 198-323, this module's own `elapsed` = trace tick - 520, same convention
// as slices 2a/2b above).
//
// Ground truth: docs/battle-room-notes.md §8 (dense every-frame oracle
// captures, ticks 690-760 and 838-851 - independently re-confirmed this
// session via a fresh oracle probe, /tmp/s6c/probe.json, truncating this
// run's own committed tools/compare/traces-groundtruth/battle1-intro.json
// at 851 frames with every-frame captureFrames 710-851). §8.1: the box is
// the literal same asset/window as the pre-battle room's own
// ("Right this way, please!") - MSGBOX_DEFAULT always draws window 0's
// fixed template, no map-specific variant - so this slice reuses
// prebattleRoomRender.ts's drawMessageBoxFrame/drawMessageBoxText verbatim
// rather than re-deriving box compositing.
//
// §8.2 (appear + print, RAM/pixel-pinned, re-confirmed by this session's own
// probe: frame 717 sha a15c8dc2... == frame 843's, frame 718 sha 488bb636...
// distinct, frame 738 sha e93719bf... == frames 739-842's): box+fill appear
// atomically at elapsed 198 (tick 718), zero characters; first glyph at
// elapsed 199 (tick 719); exactly 1 tick per character including space
// ticks (§8.2's tick->char table); line 2 starts at elapsed 211 (tick 731);
// print-complete/settle at elapsed 218 (tick 738) - MSGBOX_PRINT_COMPLETE_ELAPSED
// is exactly MSGBOX_APPEAR_ELAPSED + (line1.length + line2.length), i.e. the
// 20-character total is the print duration, not a separately-pinned magic
// number.
//
// §8.3 (close): the ground-truth trace's own button script (battle1-
// intro.json's segment 29, `["A"], frames:2`, immediately after 100 frames
// of no input following segment 28) holds A for the two tick() calls that
// produce captured frames 839 and 840. readKeys.ts's edge-triggered newKeys
// therefore fires exactly once - on the call producing frame 839 (frame
// 840's call sees A already held, so it's not "new"). Reusing prebattleRoom.
// ts's own "idle -> closing phase, created directly on the press tick"
// idiom (its own A-press-gate doc), the pinned "box static through 842,
// vanished by 843" resolves to a clean MSGBOX_CLOSE_TICKS=4: created at
// frame 839 (elapsed 0, box still fully printed/visible - indistinguishable
// from idle), elapsed 1/2/3 at frames 840/841/842 (still visible), then
// elapsed 4 at frame 843 hits the >=MSGBOX_CLOSE_TICKS transition to
// "settled" (no box) - this is the only tick count consistent with both the
// committed segment data and the pinned pixels, not a hardcoded
// "vanish = press+5" guess. This is a DIFFERENT constant from
// prebattleRoom.ts's own MESSAGE_CLOSING_TICKS (2) - a different call
// site/window, not reused.
//
// Assumption flagged per the brief: only this one idle-phase press (at
// elapsed 121 relative to msgboxIdle's own start, i.e. well after print-
// complete) is oracle-exercised; whether an EARLIER press - e.g. right at
// print-complete itself - would behave identically (same 4-tick close) is
// not probed this session. Modeled as "any A press while msgboxIdle starts
// the same 4-tick close, regardless of how long idle has been held" - the
// simplest mechanism consistent with the one pinned data point, matching
// this codebase's established MSGBOX_DEFAULT convention (prebattleRoom.ts's
// own "idle" case never itself times out or varies by hold duration).

/** First elapsed tick the box (border+fill) is on screen - trace tick 718. */
export const MSGBOX_APPEAR_ELAPSED = 198;
/** BattleFrontier_BattleFactoryBattleRoom_EventScript_BattleOpponent's palace_getopponentintro-buffered speech (docs/battle-room-notes.md §8.2) - the curly apostrophe is charmap code 180, the plain ASCII "'" isn't in the charmap. */
export const MSGBOX_LINE1 = "IT’S WAY TOO";
export const MSGBOX_LINE2 = "HOT HERE";
export const JENSON_MSGBOX_LINE1 = "MY POKéMON WILL";
export const JENSON_MSGBOX_LINE2 = "MAKE YOU DOWNCAST";
/** Total printable characters across both lines - the print's own duration in ticks (1 tick/char, including space ticks). */
export const MSGBOX_PRINT_TICKS = MSGBOX_LINE1.length + MSGBOX_LINE2.length;
/** First elapsed tick of "msgboxIdle" (fully printed, static) - trace tick 738. */
export const MSGBOX_PRINT_COMPLETE_ELAPSED = MSGBOX_APPEAR_ELAPSED + MSGBOX_PRINT_TICKS;
/** Ticks from the A-press registering to the box vanishing (see §8.3 derivation above). */
export const MSGBOX_CLOSE_TICKS = 4;

/**
 * Scene `elapsed` to feed entryStep/scientistTurnFrame/opponentStep once
 * past "entering" - those three are all clamped/settled by elapsed 192 (see
 * their own docs above), so any value at or past that works identically;
 * reuses MSGBOX_PRINT_COMPLETE_ELAPSED since it's already past every clamp
 * threshold and already computed.
 */
export const SETTLED_SCENE_ELAPSED = MSGBOX_PRINT_COMPLETE_ELAPSED;

export interface MsgboxVisual {
  visible: boolean;
  /** Characters visible across both lines combined (0..MSGBOX_PRINT_TICKS) - battleRoomRender.ts splits this across MSGBOX_LINE1/LINE2. */
  chars: number;
}

export function battleRoomQuote(state: BattleRoomState): readonly [string, string] {
  if (state.trainerPresentation !== undefined) {
    return state.trainerPresentation.speechBefore;
  }
  return state.encounter === "jenson"
    ? [JENSON_MSGBOX_LINE1, JENSON_MSGBOX_LINE2]
    : [MSGBOX_LINE1, MSGBOX_LINE2];
}

export function msgboxPrintTicks(state: BattleRoomState): number {
  const [line1, line2] = battleRoomQuote(state);
  return line1.length + line2.length;
}

export function msgboxPrintCompleteElapsed(state: BattleRoomState): number {
  return MSGBOX_APPEAR_ELAPSED + msgboxPrintTicks(state);
}

const MSGBOX_HIDDEN: MsgboxVisual = { visible: false, chars: 0 };
/** "entering" phase's own msgbox visual - a pure function of the (still-global) elapsed counter, matching scientistTurnFrame/opponentStep's own convention. */
function enteringMsgboxVisual(elapsed: number): MsgboxVisual {
  if (elapsed < MSGBOX_APPEAR_ELAPSED) return MSGBOX_HIDDEN;
  return { visible: true, chars: elapsed - MSGBOX_APPEAR_ELAPSED };
}

/** Per-phase message-box visual (battleRoomRender.ts/core.ts consume this directly - see module doc for the per-phase derivation). */
export function msgboxVisual(state: BattleRoomState): MsgboxVisual {
  const full = { visible: true, chars: msgboxPrintTicks(state) };
  switch (state.phase) {
    case "entering":
      return enteringMsgboxVisual(state.elapsed);
    case "msgboxIdle":
    case "msgboxClosing":
      return full;
    case "settled":
      return MSGBOX_HIDDEN;
  }
}

export { FADE_IN };
