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

export type BattleRoomPhase = "entering";

export interface BattleRoomState {
  phase: BattleRoomPhase;
  /** Ticks since the first visible room frame (0 = trace tick 520, the ground-truth trace's own frame boundary - docs/battle-bringup-notes.md "Slice-0 ground truth" §2). */
  elapsed: number;
}

/** core.ts creates this the tick prebattleRoom's "warpFade" phase reaches the fixed elapsed count matching trace tick 520 (see core.ts's handoff). */
export const INITIAL_BATTLE_ROOM_STATE: BattleRoomState = { phase: "entering", elapsed: 0 };

/**
 * prebattleRoom.ts's "warpFade" phase elapsed count at which core.ts hands
 * off to this module: WALK_TICKS (80) ticks of walking + this many ticks of
 * warpFade puts the render at trace tick 483+37 = 520, the ground-truth
 * trace's own first visible-room frame (docs/battle-bringup-notes.md
 * "Slice-0 ground truth" §2).
 */
export const WARP_FADE_TO_ROOM_ELAPSED = 37;

export function advanceBattleRoom(state: BattleRoomState): BattleRoomState {
  return { phase: state.phase, elapsed: state.elapsed + 1 };
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

export { FADE_IN };
