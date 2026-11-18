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
import type { FrontierTransitionPresentation } from "./battleTransition.ts";
import type { BattleOpponent } from "./battleScenario.ts";
import walkupScript from "../data/gen/factory-brain-walkup-script.json" with { type: "json" };

export type BattleRoomPhase =
  | "entering"
  | "msgboxIdle"
  | "msgboxClosing"
  | "settled"
  | "brainEntering"
  | "brainMsgboxIdle"
  | "brainMsgboxClosing"
  | "brainMoving"
  | "brainSettled"
  | "brainSpeech"
  | "brainSpeechIdle"
  | "brainSpeechClosing"
  | "brainSpeechSettled";

export interface BattleRoomState {
  phase: BattleRoomPhase;
  /** Ticks since the first visible room frame (0 = trace tick 520, the ground-truth trace's own frame boundary - docs/battle-bringup-notes.md "Slice-0 ground truth" §2). */
  elapsed: number;
  /** Encounter-selected overworld gfx and Easy Chat opening quote. */
  encounter?: "destin" | "jenson";
  /** Generated round identity; absent only on the legacy canonical fixture. */
  trainerPresentation?: FactoryTrainerPresentation;
  /** GetSpecialBattleTransition's owned Random()%12 result once selected. */
  transitionPresentation?: FrontierTransitionPresentation;
  /**
   * True exactly when this entrance takes the Frontier-Brain branch
   * (`BattleOpponent.frontierBrain` is set on the round's current opponent -
   * `scripts.inc`'s `VAR_TEMP_F != FRONTIER_BRAIN_NOT_READY` gate,
   * :12-20/:62). Selects the `brain*` phase sequence below over the ordinary
   * `entering`/`msgboxIdle`/`msgboxClosing`/`settled` one; keyed off this
   * round-state field only - never a battle-number/trace-name check (see
   * `createBrainWalkupBattleRoomState`, the only place that sets it).
   */
  frontierBrainWalkup?: true;
  /**
   * Walk-up build step B2: true when this brain encounter shows the full
   * gated first-time personality speech (`silverFirstEncounter`/
   * `goldFirstEncounter` - see `brainSpeechTier` for which); false selects
   * the short repeat variant (`silverRepeat`/`goldRepeat` - the always-shown
   * close line only). Set once at construction from the tier's own heard-
   * speech flag (`factoryHeardBrainSpeech`/`markFactoryBrainSpeechHeard`,
   * factoryRoundBattleOrchestrator.ts) and never re-read afterward - only
   * meaningful when `frontierBrainWalkup` is set.
   */
  brainSpeechFirstEncounter?: boolean;
  /**
   * Walk-up build step B3: which Frontier-Brain tier's speech content
   * applies (`goldFirstEncounter`/`goldRepeat` vs `silverFirstEncounter`/
   * `silverRepeat`, both from `factory-brain-walkup-script.json`) - set once
   * at construction from `opponent.frontierBrain.status`
   * (`battleRoomStateForOpponent`), never re-read afterward. Defaults to
   * `"silver"` so every pre-B3 caller (silver's own tests/traces, and any
   * caller that never touched this field) is unchanged. Only meaningful
   * when `frontierBrainWalkup` is set.
   */
  brainSpeechTier?: "silver" | "gold";
  /**
   * Index into `brainSpeechBoxes(state)` for the box currently printing/
   * idle ("brainSpeech"/"brainSpeechIdle") or just dismissed
   * ("brainSpeechClosing"). Only meaningful during those phases.
   */
  speechStep?: number;
  /**
   * True only for a box entered via `battleRoomAcceptedState`'s direct
   * personality-to-personality continuation (`\p`/`\l`, never a real
   * close+reopen) whose PRIOR box was itself not the window's first box -
   * i.e. this is the window's 2nd or later accept-driven personality-page
   * transition. Selects the fast one-tick print model in
   * `msgboxVisual`/`advanceBattleRoom`'s "brainSpeech" case below instead
   * of the default clear-then-print one - see those call sites for the rule.
   *
   * Derived, not guessed, from four independent dense oracle windows:
   * `docs/noland-brain-intro-gold-ground-truth.md` §9‴/§9⁗ (gold's page 2→3
   * and 3→4 edges, both later `\p` transitions, one tick faster than page
   * 1→2's own first transition - which stayed exact) and
   * `docs/silver-speech-box2-evidence.md` (silver's box 1→2 edge, a `\p`
   * that is the window's SECOND accept-driven transition, counting box
   * 0→1's own `\l` scroll as the first - also one tick faster, plus its
   * six period-9 cursor-bob blips, the same shift propagated into the idle
   * phase). Both windows agree: the window's first accept-driven transition
   * (whether the source used `\l` or `\p` - the two are otherwise handled
   * identically, see `splitSpeechBoxes`' own doc) still shows the box
   * cleared for one tick before the first new character
   * (`battleRoomAcceptedState`'s plain `elapsed: 0` entry, this flag left
   * false); every later one skips that cleared tick - the accept tick
   * itself already shows the first new character, this flag set true.
   *
   * A box entered via a REAL close+reopen (leaving the last personality
   * page for the close/cry box, e.g. gold's page 4 -> close box, silver's
   * page 8 -> cry box) is a structurally different transition, but two more
   * dense edge fixtures (`docs/speech-close-edge-evidence.md`,
   * `docs/speech-close-edge-silver-evidence.md`) proved it renders under
   * the SAME slow/cleared model as the window's first transition (not the
   * fast one) - unconditionally false there regardless of `speechStep`.
   * That is unrelated to `battleRoomAcceptedState`'s OWN mechanism change
   * for this edge (skipping the `brainSpeechClosing` hidden wait entirely -
   * see that function's own doc): the earlier claim that the pre-existing
   * `factory-brain-gold-walkup-speech-close-off.json` guard had already
   * confirmed the slow model on this specific edge was false (that fixture
   * parks already inside the close box and never drives this transition at
   * all) - the two new edge fixtures are what actually exercise it.
   */
  speechAcceptedFast?: boolean;
}

/** core.ts creates this the tick prebattleRoom's "warpFade" phase reaches the fixed elapsed count matching trace tick 520 (see core.ts's handoff). */
export const INITIAL_BATTLE_ROOM_STATE: BattleRoomState = { phase: "entering", elapsed: 0 };
export const INITIAL_BATTLE_2_ROOM_STATE: BattleRoomState = {
  phase: "entering",
  elapsed: 0,
  encounter: "jenson",
};

/**
 * Walk-up build step B1: the Frontier-Brain BattleRoom entrance
 * (`factory-brain-walkup-script.json`'s `battleRoomEntrance` scene -
 * `EnterRoomFactoryHeadBattle`, `scripts.inc:51-60`). Noland
 * (`placement.brainGfx`) is already visible at (7,9) from the first
 * post-warp frame - the ordinary hidden-then-walked-in opponent path
 * (`entering`/`opponentStep`) never runs for this branch. `trainerPresentation`
 * carries Noland's identity forward for B2's speech step; this step itself
 * never reads its `speechBefore` (see `battleRoomQuote`'s brain guard).
 * `transitionPresentation` (S3, docs/brain-transition-wiring-design.md)
 * carries the opponent's precomputed `GetSpecialBattleTransition` draw
 * forward the same way -- set once here, at construction, never re-drawn;
 * the ordinary path's own tick-level draw (`opponentSetupExtraRngSteps`)
 * stays untouched and never fires for this branch (`state.phase !==
 * "settled"` excludes every brain phase).
 */
export function createBrainWalkupBattleRoomState(
  trainerPresentation?: FactoryTrainerPresentation,
  heardBrainSpeechBefore = false,
  brainSpeechTier: "silver" | "gold" = "silver",
  transitionPresentation?: FrontierTransitionPresentation,
): BattleRoomState {
  return Object.freeze({
    phase: "brainEntering",
    elapsed: 0,
    frontierBrainWalkup: true,
    brainSpeechFirstEncounter: !heardBrainSpeechBefore,
    brainSpeechTier,
    trainerPresentation,
    transitionPresentation,
  });
}

/**
 * Branch selection for a freshly-entered BattleRoom, keyed off the round
 * state's own `opponent.frontierBrain` field (set whenever
 * `getFactoryFrontierBrainStatus` resolved this battle to the Frontier
 * Brain - `battleScenario.ts`'s own doc on `BattleOpponent.frontierBrain`)
 * - never a battle-number/turn-number/trace-name check. This is the single
 * seam core.ts's BattleRoom construction sites call instead of hardcoding
 * the ordinary `INITIAL_BATTLE_2_ROOM_STATE` shape, so "does the upcoming
 * battle take the brain branch" has exactly one answer, testable without
 * touching core.ts's tick loop at all.
 */
export function battleRoomStateForOpponent(
  opponent: BattleOpponent | undefined,
  trainerPresentation?: FactoryTrainerPresentation,
  heardBrainSpeechBefore = false,
): BattleRoomState {
  if (opponent?.frontierBrain !== undefined) {
    // Fix 48 (docs/parity-mac/noland-return-battles.md): BattleNoland's switch (BattleFactoryBattleRoom scripts.inc:113-117). GOLD reads
    // the gold heard bit (IntroNolandGold, :143-147); SILVER (the default case) the silver bit (:118-121); the return battles with both
    // symbols go straight to the short lines with no heard-bit check: STREAK (battle 21) to BattleNolandSilver ("ShakeOutKnowledge"),
    // STREAK_LONG (42, then every 21) to BattleNolandGold ("AllRightBringItOn").
    const status = opponent.frontierBrain.status;
    const brainSpeechTier: "silver" | "gold" = status === "gold" || status === "streak-long" ? "gold" : "silver";
    const returnBattle = status === "streak" || status === "streak-long";
    return createBrainWalkupBattleRoomState(
      trainerPresentation,
      returnBattle || heardBrainSpeechBefore,
      brainSpeechTier,
      opponent.frontierBrain.transitionPresentation,
    );
  }
  return { ...INITIAL_BATTLE_2_ROOM_STATE, trainerPresentation };
}

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
    case "brainEntering": {
      const elapsed = state.elapsed + 1;
      if (elapsed >= BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED) {
        return { ...state, phase: "brainMsgboxIdle", elapsed: 0 };
      }
      return { ...state, phase: "brainEntering", elapsed };
    }
    case "brainMsgboxIdle":
      // Same idiom as "msgboxIdle" above: core.ts detects the A press and
      // starts "brainMsgboxClosing" directly; this case only covers ticks
      // with no press yet.
      return state;
    case "brainMsgboxClosing": {
      const elapsed = state.elapsed + 1;
      if (elapsed >= MSGBOX_CLOSE_TICKS) return { ...state, phase: "brainMoving", elapsed: 0 };
      return { ...state, phase: "brainMsgboxClosing", elapsed };
    }
    case "brainMoving": {
      const elapsed = state.elapsed + 1;
      if (elapsed >= BRAIN_MOVEMENT_SETTLE_ELAPSED) {
        return { ...state, phase: "brainSettled", elapsed: 0 };
      }
      return { ...state, phase: "brainMoving", elapsed };
    }
    case "brainSettled": {
      // Walk-up build step B2: hands off into the speech's first box once
      // SPEECH_APPEAR_ELAPSED ticks have passed (0 = immediately - see that
      // constant's own doc for why this is a structural default, not yet
      // dense-compare-measured).
      if (state.elapsed >= SPEECH_APPEAR_ELAPSED) {
        // Window opening, not an accept-driven transition - always the slow
        // (clear-then-print) model, see `speechAcceptedFast`'s own doc.
        return { ...state, phase: "brainSpeech", elapsed: 0, speechStep: 0, speechAcceptedFast: false };
      }
      return { ...state, phase: "brainSettled", elapsed: state.elapsed + 1 };
    }
    case "brainSpeech": {
      const printTicks = brainSpeechPrintTicks(brainSpeechBoxAt(state, state.speechStep ?? 0));
      // `speechAcceptedFast` boxes finish one tick sooner - see that field's
      // own doc for the derivation (the accept tick already shows character
      // 1, so full print is reached at elapsed printTicks-1, not printTicks).
      const completeElapsed = state.speechAcceptedFast ? printTicks - 1 : printTicks;
      const elapsed = state.elapsed + 1;
      if (elapsed >= completeElapsed) return { ...state, phase: "brainSpeechIdle", elapsed: 0 };
      return { ...state, phase: "brainSpeech", elapsed };
    }
    case "brainSpeechIdle":
      // Same idiom as "brainMsgboxIdle"/"msgboxIdle" above: core.ts detects
      // the A press and starts "brainSpeechClosing" directly; this case
      // only covers ticks with no press yet. Unlike those two (fully
      // static), `elapsed` keeps ticking here - it drives the "waiting for
      // input, more text follows" cursor's own bob animation
      // (brainSpeechCursorVisible/brainSpeechCursorYOffset below), which a
      // non-terminal box's own idle hold shows in every dense fixture this
      // step spot-checked.
      return { ...state, elapsed: state.elapsed + 1 };
    case "brainSpeechClosing": {
      // Only the window's FINAL box (the close/cry box's own dismiss, no
      // next box left) ever reaches this phase - `battleRoomAcceptedState`
      // intercepts every other box boundary (personality-to-personality AND
      // the real close+reopen into the close/cry box alike) directly into
      // "brainSpeech" on the accept tick itself, before this phase is ever
      // entered (see that function's own doc for the two edge fixtures that
      // proved the real-close-reopen case belongs there too). So there is
      // always no next box by the time `elapsed` reaches `MSGBOX_CLOSE_TICKS`
      // here - the hidden wait always ends in "brainSpeechSettled".
      const elapsed = state.elapsed + 1;
      if (elapsed >= MSGBOX_CLOSE_TICKS) {
        return { ...state, phase: "brainSpeechSettled", elapsed: 0, speechStep: (state.speechStep ?? 0) + 1 };
      }
      return { ...state, phase: "brainSpeechClosing", elapsed };
    }
    case "brainSpeechSettled":
      return { ...state, phase: "brainSpeechSettled", elapsed: state.elapsed + 1 };
  }
}

export function battleRoomQuoteInputReady(state: BattleRoomState): boolean {
  if (state.phase === "brainMsgboxIdle" || state.phase === "brainSpeechIdle") return true;
  if (state.phase !== "msgboxIdle") return false;
  return state.encounter !== "jenson" || state.elapsed >= 2;
}

/** The phase `battleRoomQuoteInputReady`'s A-press gate transitions to (core.ts's msgbox-close idiom, shared by every branch). */
export function battleRoomMsgboxClosingPhase(state: BattleRoomState): BattleRoomPhase {
  if (state.phase === "brainMsgboxIdle") return "brainMsgboxClosing";
  if (state.phase === "brainSpeechIdle") return "brainSpeechClosing";
  return "msgboxClosing";
}

/**
 * The state `battleRoomQuoteInputReady`'s A-press gate transitions to -
 * core.ts's single accept seam for every `battleRoom` branch. Ordinarily a
 * box CLOSE (`battleRoomMsgboxClosingPhase` above, unchanged - entrance-03's
 * `brainMsgboxClosing` span is RAM-calibrated against `MSGBOX_CLOSE_TICKS`
 * already, see `BRAIN_MOVEMENT_CLOCK_OFFSET`'s own doc, so this seam must
 * not perturb it), but a brain personality-speech page that still has more
 * gated pages queued (`\p`, not the terminating `$` that hands off to the
 * close/cry box) never actually closes its window at all: `text.c`'s
 * `RENDER_STATE_CLEAR` clears and reprints the SAME already-open window one
 * tick later (docs/walkup-call-scene-ground-truth.md's own already-landed
 * `\p` mechanism for the call-scene's boxes 3/4/5, PROGRESS 1292/1293) - so
 * this case skips the close phase entirely and lands directly on the next
 * page at elapsed 0, the same "elapsed 0 renders the same tick" shape every
 * other phase entry already uses.
 *
 * The gated speech's LAST page (handing off to the close/cry box, a genuine
 * new `message()` call) turns out to render the SAME way pixel-for-pixel,
 * even though it's a structurally real close+reopen, not a `\p`/`\l` direct
 * continuation: two dense edge fixtures (`docs/speech-close-edge-evidence.md`
 * gold box3->close abs 2397-2450, `docs/speech-close-edge-silver-evidence.md`
 * silver box8->cry abs 3067-3141) both show the accept tick landing straight
 * on the next box's own cleared (0-char) frame, first glyph one tick later -
 * no `MSGBOX_HIDDEN` wait at all, i.e. `closemessage` and the next box's
 * `msgbox` open back-to-back within the same tick the script executes them,
 * same as every other page-turn's `RENDER_STATE_CLEAR`. So this function
 * takes the direct branch for ANY next box, personality-to-personality or
 * personality-to-close/cry alike - only `speechAcceptedFast` (see its own
 * doc) distinguishes the two render models. Only the window's FINAL box
 * (the close/cry box's own dismiss, no next box left) is still a real close
 * via `battleRoomMsgboxClosingPhase` below - that transition's own
 * `MSGBOX_CLOSE_TICKS` hidden wait is unchanged (gold-close/close-pause
 * guards).
 *
 * The accept frame's own visible content is NOT uniform across every
 * direct continuation, though - see `speechAcceptedFast`'s own doc for the
 * full derivation (four independent dense oracle windows:
 * `docs/noland-brain-intro-gold-ground-truth.md` §9‴/§9⁗,
 * `docs/silver-speech-box2-evidence.md`, and the two real-close-edge docs
 * cited above). Summary: the window's FIRST accept-driven transition
 * (`(state.speechStep ?? 0) === 0`, i.e. leaving the window's very first
 * box) and EVERY real close+reopen (leaving the last personality box into
 * the close/cry box) still show the window CLEARED (0 chars) on the accept
 * tick, with the next box's first glyph one tick later - gold's page 1→2
 * and page 4→close edges are both oracle-exact under exactly this model.
 * Every LATER personality-to-personality accept-driven transition
 * (`(state.speechStep ?? 0) >= 1` AND the next box is still personality
 * content) is one tick faster: the accept tick already shows the next box's
 * first character, with no cleared frame ever visible - gold's page 2→3/3→4
 * edges and silver's box 1→2 edge (the window's 2nd accept-driven
 * transition, counting box 0→1's own `\l` scroll as the 1st) are both
 * oracle-exact under this model instead.
 */
export function battleRoomAcceptedState(state: BattleRoomState): BattleRoomState {
  if (state.phase === "brainSpeechIdle" && state.brainSpeechFirstEncounter === true) {
    const priorStep = state.speechStep ?? 0;
    const nextStep = priorStep + 1;
    if (nextStep < brainSpeechBoxes(state).length) {
      const isPersonalityContinuation = nextStep < brainSpeechPersonalityBoxCount(state);
      return {
        ...state,
        phase: "brainSpeech",
        elapsed: 0,
        speechStep: nextStep,
        // Real close+reopen (nextStep landed on the close/cry box, past the
        // last personality page) always uses the slow/cleared model, same as
        // the window's very first transition - see this function's own doc.
        speechAcceptedFast: isPersonalityContinuation && priorStep >= 1,
      };
    }
  }
  return { ...state, phase: battleRoomMsgboxClosingPhase(state), elapsed: 0 };
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

// Walk-up build step B1: the Frontier-Brain BattleRoom entrance's own
// "Get a move on!" box + Noland/decoy/scientist movement
// (`factory-brain-walkup-script.json`'s `battleRoomEntrance` scene,
// `EnterRoomFactoryHeadBattle`/`Movement_NolandMoveToBattle`/
// `Movement_PlayerEnterRoom`/`ScientistsFaceBattle`, `scripts.inc:51-60`).
//
// Source order is the REVERSE of the ordinary path's "entering" phase: the
// box appears FIRST (Noland/decoy/scientists are all already static and
// visible from the map transition, no walk-in needed to reveal them), THEN
// -only after the player dismisses it- Noland walks toward the battle line
// simultaneously with the decoy/real-player walk-in, THEN the scientists
// turn (same `call ...ScientistsFaceBattle` the ordinary path also reaches
// after its own decoy walk - literally the same event script, reused
// verbatim below via `scientistTurnFrame`).
//
// Noland's own walk (`Movement_NolandMoveToBattle`: `walk_up`x3, `face_left`)
// is `applymovement`'d in the same script block as the decoy/player's
// `Movement_PlayerEnterRoom` (`walk_up`x5, `face_right`) and both wait on the
// SAME `waitmovement 0` (scripts.inc:54-57) - i.e. one shared movement clock,
// not two independent ones. This lets Noland's per-tick progress reuse
// `entryStep`'s own `camPanY` column directly (see `nolandStep` below)
// instead of a freshly-derived counter, and gives a self-consistency check:
// algebraically, Noland's derived SETTLED screen position collapses to
// exactly `OPPONENT_SETTLED_SCREEN_Y` (56) - the ordinary opponent's own
// settle Y - because both this branch and the ordinary one park their
// LOCALID_FACTORY_BATTLE_OPPONENT slot at the same tile, (7,6). His walk
// animation reuses `sAnimTable_Standard`'s `GoNorth` frames too (same table
// every standard object event uses, `object_event_graphics_info.h:4523-4540`
// - see `extract-battle-room.ts`'s Noland extraction comment), so the walk
// column is literally the decoy's own `decoyFrame`, not a second lookup
// table; his post-walk `face_left` settle pose (frame 2, no hFlip) mirrors
// the ordinary opponent's own `face_left` settle convention
// (`OPPONENT_WALK_END_ELAPSED`'s doc above).
//
// **Walk-up build step B1b (dense-compare calibration against the committed
// `factory-brain-silver-walkup-02/03-*-dense-off.json` fixtures,
// `docs/noland-silver-walkup-presentation-map.md` §5 - `tools/compare/traces/
// factory-brain-silver-walkup-entrance-0{2,3}-off.json`, staged via
// `generatedRoundBattle7NolandRoomEntranceStage`):** the room's own fade-in
// curve starts exactly at fixture 02's own first captured frame (pixel-
// sampled: 24,24,57,...,255 from that frame on, matching this module's own
// documented ramp) - this pins `elapsed 0` to that fixture's frame numbering
// (`preCheckpointFrameOffset` in the committed traces) independent of the
// OTHER reference trace's own tick-520 numbering used elsewhere in this file.
// `BRAIN_MSGBOX_APPEAR_ELAPSED` MEASURED at 24 (was algebraically guessed at
// 0): the box border/fill is not drawn at all - not even empty - until the
// fade settles, not concurrently with it; fixture 02 closes 256/256 exact
// once corrected. `NOLAND_IDLE_FRAME` MEASURED at 0 (see its own doc) fixes
// the remaining fixture-02 residual (Noland's face must be visible, not the
// decoy's own north-facing idle pose).
//
// **Walk-up build step B1c (RAM re-derivation of the brainMoving walk/pan
// cadence, `tools/probe/probe-factory-brain-silver-entrance-movement-ram.py`
// - direct `gTotalCameraPixelOffsetY`/`gSprites`/`gObjectEvents` reads every
// frame 896-1151 of the same staged fixture 03 uses, not pixel curve-
// fitting):** B1b's own diagnosis (`entryStep`'s per-tick table doesn't
// reproduce this branch's cadence) was wrong in its root cause. RAM shows
// the decoy/camera in THIS window follow the exact SAME per-tick shape as
// `ENTRY_STEPS` (same clean 1px/tick pan, same animCmdIndex phase at every
// sampled tick, same one-tick-after-pan-stops settle) - just re-based onto a
// different zero point. `ENTRY_STEPS`' own leading 23 flat-pan ticks
// (indices 0-22) are an artifact of THAT window's warp fade-in still
// settling (S6 slice 2a finding 1/2 above) - irrelevant here, since
// `brainMoving` starts from a closed msgbox, not a fade. Re-based by
// `BRAIN_MOVEMENT_CLOCK_OFFSET` (22, RAM-measured - see its own doc),
// `entryStep`/`scientistTurnFrame`/`nolandStep` reproduce this window's real
// decoy/Noland position and animation at every RAM-sampled tick, not just
// the endpoints - `nolandStep`'s existing screenY/frame formulas (24 flat,
// then `24 + (camPanY - 48)` past the walk) were themselves ALREADY correct;
// only the elapsed value feeding them was wrong. Separately,
// `SPEECH_APPEAR_ELAPSED` (the `brainSettled` -> `brainSpeech` handoff,
// previously an unmeasured structural 0) is now MEASURED at 5, closing a
// distinct ~5-tick speech-box-appears-too-early mismatch this step also
// found once the walk/pan cadence stopped masking it. The compare trace's
// own A-press timing (`tools/compare/traces/factory-brain-silver-walkup-
// entrance-03-off.json`) was also corrected - it dismissed the msgbox ~20
// ticks before oracle's real dismissal point, an artifact of B1b's own
// (mis-scoped) tuning attempt, not a app-code bug.
//
// **Residual NOT closed this step, flagged honestly rather than relabeled
// "measured":** fixture 03 improves from a broad ~26-65% full-frame
// mismatch (0/256 in its own ramp+speech-onset region) to a bounded
// ~5-13%-of-frame residual confined to the mid-ramp window only (162/256
// frames now exact, up from 43/256; every frame before the ramp and every
// frame once the room is genuinely settled, including all of B2's speech
// content, is exact). Direct RAM cross-checks at multiple ramp ticks (not
// just the endpoints) show `camPanY`/decoy-animation/Noland-position all
// matching oracle's real RAM exactly at those sampled ticks - yet the
// rendered PIXELS still diverge mid-ramp (a small, sub-tile-scale
// misalignment: cross-correlating diff frames against a pure vertical pixel
// shift finds a best-fit +1px offset with ~98-99% background-tile
// agreement, not 100%, so it isn't simply a further one-tick lag either -
// `BRAIN_MOVEMENT_CLOCK_OFFSET` values of 21 and 23 were both tried and
// both regressed the OVERALL match count, so the fix isn't a uniform
// elapsed-clock shift). The true mechanism (likely a sub-tile easing/
// interpolation this room's own camera applies that `gTotalCameraPixelOffsetY`
// alone doesn't capture, or a second camera-adjacent RAM field this probe
// didn't read) is undetermined - a future step should RAM-probe
// `gSpriteCoordOffsetY`/OAM-buffer state directly across the ramp (this
// step's probe already reads `gSpriteCoordOffsetX/Y`, see its own source)
// rather than re-deriving further from `camPanY` alone.
// `BRAIN_MOVEMENT_SETTLE_ELAPSED` is now 86 (down from the prior 108) -
// still the same real-tick distance from `scientistTurnFrame`'s own
// (unshifted) 108 threshold, just expressed in this window's own un-shifted
// clock instead of `entryStep`'s.

// **Residual CLOSED (walk-up build step B1c mid-ramp probe, this session):**
// extended `tools/probe/probe-factory-brain-silver-entrance-movement-ram.py`
// to surface (previously read but dropped from its own output rows)
// `gSpriteCoordOffsetX/Y`, plus new fields it didn't read at all: each
// tracked sprite's actual hardware-visible OAM y/x (`sprite->oam.y/x`,
// struct OamData bitfields) and the `x2`/`y2`/`centerToCornerVecX/Y` terms
// `UpdateOamCoords`/`BuildOamBuffer` (src/sprite.c:322-352) sum into them.
// Cross-checking `oamY` against `spriteY + y2 + centerToCornerVecY +
// spriteCoordOffsetY` computed from the SAME captured frame, at every one
// of the 256 frames 896-1151, found EXACT agreement throughout - ruling out
// a same-frame OAM/coord-offset latch (the C source's own single-iteration
// `RunTasks->AnimateSprites->CameraUpdate->UpdateCameraPanning->
// BuildOamBuffer` order, confirmed in `field_camera.c`/`sprite.c`, means
// there's no cross-task lag to find within one already-captured RAM sample).
// The real mechanism was a harness-adjacent ONE-TICK COUNTING bug instead:
// a whole-frame pixel cross-correlation of the entrance-03 fixture (shifting
// the app's rendered frame N by dy and finding the dy that zeroes the diff)
// found a CONSTANT dy=+1 (app drawn one row too far down, i.e. one tick's
// worth of EXTRA pan) uniformly across the entire ramp (compare frames
// 321-399) - not growing, not present before or after. Re-deriving
// `entryStep`'s table lookup against the FRESH per-tick RAM camPanY trace
// (which is a clean, zero-deviation 1px/tick ramp - the earlier "not a
// uniform clock-offset" verdict above was right that the OFFSET constant
// itself doesn't need to change, but didn't isolate WHERE the remaining
// tick was hiding) showed: `entryStep`'s shared table has exactly ONE flat
// (`camPanY=0`) tick at `historicElapsed` 22 before ramping at 23, but this
// window's real RAM stays flat for TWO ticks after the
// `brainMsgboxClosing`->`brainMoving` transition (`state.elapsed` 0 AND 1
// both RAM-measure `camPanY=0`; the first real +1px tick is `state.elapsed`
// 2, not 1) - i.e. `state.elapsed` runs one tick AHEAD of the shared
// `entryStep`/`scientistTurnFrame`/`nolandStep` clock while `brainMoving` is
// in progress. Fixed at the render call site
// (`battleRoomRender.ts`'s `renderBattleRoomBrainEntranceScene`): feed those
// functions `state.elapsed - 1` instead of `state.elapsed` during
// `brainMoving` (`BRAIN_MOVEMENT_CLOCK_OFFSET`'s own +22 already lands the
// corrected clock on the right table row - no change needed to that
// constant or to `BRAIN_MOVEMENT_SETTLE_ELAPSED`, both of which stay
// correct as originally RAM-derived). The settled/pre-phase render branches
// need no correction (settled already feeds a comfortably-clamped constant;
// the pre-phase branch's forced `elapsed=0` already renders the correct
// still-flat pose). Verified: fixture 03 162/256 -> **242/256**
// (`--summary`, rerun live this session) - every mid-ramp frame is now
// exact; entrance-02 stays 256/256, all four B2 speech windows stay at
// their recorded counts, reveal stays 690/701 (all rerun live, unmoved).
// **Remaining bounded residual (NOT this mechanism, left honest):** frames
// 319-320 (the msgbox-close wipe transition itself, a pre-existing generic
// `MSGBOX_CLOSE` gap this step didn't touch) and frame 368 (a single-tick,
// 156px Noland walk-cycle picture-frame boundary mismatch - `nolandStep`
// picks a different frame than oracle for exactly one 8-tick animation-cycle
// edge; not investigated further this session, small enough to bound
// honestly rather than fit).

/** Noland's own walk distance in px (`walk_up`x3, this game's established 16-ticks/tile object-movement rate - see module doc points 2/3 above). */
export const NOLAND_WALK_PX = 48;
/** Noland's screen Y at `elapsed` 0 (spawn tile (7,9), zero pan) - RAM-confirmed this step (B1c, see module doc above): matches the RAM-sampled screen position formula (`nolY + spriteCoordOffsetY - 16`) exactly for every `camPanY < NOLAND_WALK_PX` tick sampled, not just algebraically derived. */
export const NOLAND_INITIAL_SCREEN_Y = 24;
/**
 * Noland's own resting pose before `brainMoving` starts (`brainEntering`/
 * `brainMsgboxIdle`/`brainMsgboxClosing`) - facing the player (picture frame
 * 0, matching `object_event_anims.h`'s `STD_FACE_SOUTH`), NOT the decoy's
 * own idle frame (1, `STD_FACE_NORTH` - correct for the decoy, which is
 * already oriented to walk north/away, but wrong for Noland, who stands
 * facing the player until his own walk begins). Dense-compare-measured
 * (`docs/noland-silver-walkup-presentation-map.md` fixture 02, oracle frame
 * 664 = elapsed 0 onward through the "Get a move on!" hold: Noland's face is
 * clearly visible the whole span, not the hat-only back-of-head pose
 * `decoyFrame`(1) renders).
 */
export const NOLAND_IDLE_FRAME = 0;

export interface NolandStep {
  /** Picture frame index into Noland's 9-frame sheet (same numbering as `EntryStep.decoyFrame`). */
  frame: number;
  hFlip: boolean;
  screenY: number;
}

/** Noland's per-tick walk-to-battle state within `brainMoving`, keyed by the SAME `elapsed` clock `entryStep`/`scientistTurnFrame` use (see module doc above). */
export function nolandStep(elapsed: number): NolandStep {
  const { camPanY, decoyFrame } = entryStep(elapsed);
  if (camPanY <= NOLAND_WALK_PX) {
    return { frame: decoyFrame, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y };
  }
  return { frame: 2, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y + (camPanY - NOLAND_WALK_PX) };
}

/**
 * Ticks to add to `brainMoving`'s own `elapsed` (0 = the tick `closemessage`
 * dismisses "Get a move on!") before feeding `entryStep`/`scientistTurnFrame`
 * - both keyed by the ORDINARY path's RAM-tick clock (S6 slice 2a/2b's
 * `elapsed` = trace tick - 520), which has its own ~22-tick pre-pan stall
 * baked in (`ENTRY_STEPS` indices 0-22, camera flat) that belongs to THAT
 * window's warp fade-in settling, not to this one (no fade here - just a
 * closed msgbox). RAM-measured this step (`tools/probe/probe-factory-brain-
 * silver-entrance-movement-ram.py`, `gTotalCameraPixelOffsetY`/`gSprites`/
 * `gObjectEvents` sampled every frame 896-1151 of the same staged route the
 * committed fixture 03 uses): the pan is flat at 0 through oracle frame 959,
 * becomes 1 at frame 960, and free-runs the SAME clean 1px/tick this file's
 * slice-2a doc already established - i.e. this window's OWN elapsed=1 lands
 * on oracle frame 960, matching `ENTRY_STEPS` index 23 (`entryStep(1 + 22)`)
 * exactly, including the decoy's animCmdIndex phase (RAM cmdIdx 2 at frame
 * 960, the same phase `ENTRY_STEPS[23]`'s frame value 6 implies per this
 * file's own point-3 finding). Verified across the whole window, not just
 * the boundary: decoy/Noland's raw sprite Y at every sampled pan value
 * matches `nolandStep`'s existing formula exactly (see its own doc), and the
 * decoy's settle transition (raw animNum 5->7, a walking-cycle freeze, not a
 * dedicated "face" table - same mechanism this file's slice-2b doc already
 * documents for the ordinary opponent's own settle) lands on oracle frame
 * 1040 = elapsed 81 in this shifted numbering, i.e. exactly one tick after
 * pan reaches 80 (frame 1039, elapsed 80) - the identical "settle one tick
 * after the pan itself stops" pattern `ENTRY_STEPS`'s own row 103 encodes.
 */
export const BRAIN_MOVEMENT_CLOCK_OFFSET = 22;

/** Elapsed tick `brainMoving` settles (scientists fully turned - see `scientistTurnFrame`'s own threshold, fed `elapsed + BRAIN_MOVEMENT_CLOCK_OFFSET`; strictly later than the decoy/pan/Noland settle at elapsed 81, which only covers the camera pan + walk). RAM-measured (same probe as `BRAIN_MOVEMENT_CLOCK_OFFSET`): scientists start their own turn only once `waitmovement 0` for the walk itself resolves (`ScientistsFaceBattle` is a separate, sequential `call` in source, scripts.inc:58) - `scientistTurnFrame`'s own threshold (108, unshifted) minus this window's `BRAIN_MOVEMENT_CLOCK_OFFSET` (22) = 86. */
export const BRAIN_MOVEMENT_SETTLE_ELAPSED = 86;

const getAMoveOnEvent = walkupScript.scenes.battleRoomEntrance.events[0] as {
  readonly pages: readonly string[];
};
// The JSON's pages[] preserves control codes as literal ROM macro text (see
// factoryBrainWalkupScript.test.ts's own "control codes preserved as literal
// ROM macros" convention) - "\n" here is the two literal characters
// backslash+n, not a decoded newline, hence the "\\n" split pattern.
const [BRAIN_MSGBOX_LINE1, BRAIN_MSGBOX_LINE2] = getAMoveOnEvent.pages[0]!.split("\\n") as [string, string];
export { BRAIN_MSGBOX_LINE1, BRAIN_MSGBOX_LINE2 };

/** Total printable characters across both lines of "Hey, hey!\nGet a move on!" - same 1-tick/char convention as `MSGBOX_PRINT_TICKS`. */
export const BRAIN_MSGBOX_PRINT_TICKS = BRAIN_MSGBOX_LINE1.length + BRAIN_MSGBOX_LINE2.length;
/** First elapsed tick the box (border+fill) is visible - MEASURED against fixture 02's dense compare (closes 256/256 exact at this value): the box does not appear at all until the room's own fade-in curve settles, not concurrently with it (see module doc above). */
export const BRAIN_MSGBOX_APPEAR_ELAPSED = 24;
/** First elapsed tick of "brainMsgboxIdle" (fully printed, static, awaiting A). */
export const BRAIN_MSGBOX_PRINT_COMPLETE_ELAPSED = BRAIN_MSGBOX_APPEAR_ELAPSED + BRAIN_MSGBOX_PRINT_TICKS;

/** "brainEntering" phase's own msgbox visual - a pure function of `elapsed`, matching `enteringMsgboxVisual`'s own convention. */
function enteringBrainMsgboxVisual(elapsed: number): MsgboxVisual {
  if (elapsed < BRAIN_MSGBOX_APPEAR_ELAPSED) return MSGBOX_HIDDEN;
  return { visible: true, chars: elapsed - BRAIN_MSGBOX_APPEAR_ELAPSED };
}

// Walk-up build step B2: the silver personality speech (8 `\p` pages, frames
// 1113-3200 of docs/noland-silver-walkup-presentation-map.md's dense map) +
// the always-shown battle-cry line, sourced directly from
// factory-brain-walkup-script.json's silverFirstEncounter/silverRepeat
// scenes. Modeled as a flat queue of "boxes" (each a 2-line [line1, line2]
// pair) rather than distinguishing the JSON's own \n/\l/\p control codes at
// runtime - the rendered box only ever shows 2 lines regardless of which
// control code produced the break, and this engine always redraws the box
// fresh from state (never incrementally scrolls pixels), so the difference
// between a \l scroll and a \p new-page clear is a presentation-only detail
// with no bearing on WHICH text is shown WHEN. silverFirstEncounter's 8
// pages flatten to 9 boxes (page 1's internal \l scroll splits into 2, see
// splitSpeechBoxes); silverRepeat skips the gated personality speech
// entirely and shows only the always-present cry box (docs/noland-walkup-
// dialogue-scoping.md §1.5: BattleNoland's STREAK case jumps straight past
// the gated line) - both variants' cry box is the same text either way.
//
// Per-box timing reuses this module's own established conventions rather
// than inventing new magic numbers: 1 tick/char printing (matching
// BRAIN_MSGBOX_PRINT_TICKS/MSGBOX_PRINT_TICKS), MSGBOX_CLOSE_TICKS for the
// transition between boxes (closing the old one before the next starts
// printing). Structural defaults, NOT independently dense-compare-measured
// for this specific window - see SPEECH_APPEAR_ELAPSED's own doc for why
// (the speech-open boundary sits just past B1b's own not-yet-closed
// brainMoving cadence residual, battleRoom.ts's module doc above/PROGRESS
// 1278). The flag itself (`frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH`,
// silverFirstEncounter.events[1]) has no on-screen effect - see
// battleRoomJustFinishedBrainPersonalitySpeech below for where core.ts hooks
// it, keyed on ORDER (speech-then-cry) not on a specific pixel/tick.

/** Splits one JSON page's raw text into 2-line boxes, threading the \l scroll (if any) into a second box whose own line1 is the previous box's line2 - see module doc above for why \n/\l are otherwise handled identically. */
function splitSpeechBoxes(pageText: string): readonly (readonly [string, string])[] {
  const parts = pageText.split(/(\\n|\\l)/);
  const boxes: [string, string][] = [];
  let line1 = parts[0] ?? "";
  let line2 = "";
  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = parts[i];
    const text = parts[i + 1] ?? "";
    if (delimiter === "\\l") {
      boxes.push([line1, line2]);
      line1 = line2;
      line2 = text;
    } else {
      line2 = text;
    }
  }
  boxes.push([line1, line2]);
  // The extraction JSON preserves source spelling with a plain ASCII
  // apostrophe; the font's own apostrophe glyph is the localized right-
  // single-quote character (same normalization factoryTrainerPresentation.
  // ts's displayEasyChatWord already applies for this exact class of
  // extracted text - a straight apostrophe has no charmap entry and renders
  // as a blank, dense-compare-caught via the box0 "name's"/"I'm" spot-check
  // trace this step's own compare work added).
  return boxes.map(([a, b]) => [a.replaceAll("'", "’"), b.replaceAll("'", "’")]);
}

const silverFirstEncounterScene = walkupScript.scenes.silverFirstEncounter as {
  readonly events: readonly { readonly kind: string; readonly pages?: readonly string[] }[];
};
const silverRepeatScene = walkupScript.scenes.silverRepeat as {
  readonly events: readonly { readonly kind: string; readonly pages?: readonly string[] }[];
};

function onlyMessageEvents(
  events: readonly { readonly kind: string; readonly pages?: readonly string[] }[],
): readonly { readonly pages: readonly string[] }[] {
  return events.filter(
    (event): event is { readonly kind: string; readonly pages: readonly string[] } =>
      event.kind === "message",
  );
}

const [silverPersonalityMessage, silverCryMessage] = onlyMessageEvents(silverFirstEncounterScene.events);
const [silverRepeatCryMessage] = onlyMessageEvents(silverRepeatScene.events);

/** The 8-page gated personality speech, flattened to 9 boxes (page 1's internal \l scroll is 2 boxes). */
export const SILVER_PERSONALITY_SPEECH_BOXES: readonly (readonly [string, string])[] =
  silverPersonalityMessage!.pages.flatMap(splitSpeechBoxes);

/** Index one past the personality speech's last box - the cry box (identical text either variant) sits here. */
export const SILVER_PERSONALITY_BOX_COUNT = SILVER_PERSONALITY_SPEECH_BOXES.length;

const SILVER_CRY_BOX = splitSpeechBoxes(silverCryMessage!.pages[0]!)[0]!;

/** First-encounter box queue: the 9 personality boxes, then the cry. */
export const SILVER_FIRST_ENCOUNTER_SPEECH_BOXES: readonly (readonly [string, string])[] = [
  ...SILVER_PERSONALITY_SPEECH_BOXES,
  SILVER_CRY_BOX,
];

/** Repeat-encounter box queue (silverRepeat.events: the cry message + the DoNolandBattle call) - just the cry box, same text as the first-encounter variant's own final box. */
export const SILVER_REPEAT_SPEECH_BOXES: readonly (readonly [string, string])[] = [
  splitSpeechBoxes(silverRepeatCryMessage!.pages[0]!)[0]!,
];

// Walk-up build step B3: the gold Noland speech (goldFirstEncounter/
// goldRepeat), same box-queue idiom as B2's silver machinery above but with
// two structural differences the dense gold ground truth pins (docs/noland-
// brain-intro-gold-ground-truth.md §7'): (1) 4 pages, none containing a \l
// scroll (unlike silver's page 1), so the personality speech flattens 1:1 to
// 4 boxes rather than 9; (2) no battle-cry message event at all - the gated
// speech's own `frontier_set` is followed directly by a separate, always-
// shown "All right!\nBring it on!" close line, structurally the same
// position (and reuse point in brainSpeechBoxes/brainSpeechCursorVisible/
// battleRoomJustFinishedBrainPersonalitySpeech below) as silver's cry box,
// just not called "cry" in the JSON.
const goldFirstEncounterScene = walkupScript.scenes.goldFirstEncounter as {
  readonly events: readonly { readonly kind: string; readonly pages?: readonly string[] }[];
};
const goldRepeatScene = walkupScript.scenes.goldRepeat as {
  readonly events: readonly { readonly kind: string; readonly pages?: readonly string[] }[];
};

const [goldPersonalityMessage, goldCloseMessage] = onlyMessageEvents(goldFirstEncounterScene.events);
const [goldRepeatCloseMessage] = onlyMessageEvents(goldRepeatScene.events);

/** The 4-page gated personality speech, flattened 1:1 to 4 boxes (no \l scroll in any gold page). */
export const GOLD_PERSONALITY_SPEECH_BOXES: readonly (readonly [string, string])[] =
  goldPersonalityMessage!.pages.flatMap(splitSpeechBoxes);

/** Index one past the personality speech's last box - the close box ("All right! Bring it on!") sits here. */
export const GOLD_PERSONALITY_BOX_COUNT = GOLD_PERSONALITY_SPEECH_BOXES.length;

const GOLD_CLOSE_BOX = splitSpeechBoxes(goldCloseMessage!.pages[0]!)[0]!;

/** First-encounter box queue: the 4 personality boxes, then the close line - no battle-cry box for gold (module doc above). */
export const GOLD_FIRST_ENCOUNTER_SPEECH_BOXES: readonly (readonly [string, string])[] = [
  ...GOLD_PERSONALITY_SPEECH_BOXES,
  GOLD_CLOSE_BOX,
];

/** Repeat-encounter box queue (goldRepeat.events: the close message + the DoNolandBattle call) - just the close box, same text as the first-encounter variant's own final box. */
export const GOLD_REPEAT_SPEECH_BOXES: readonly (readonly [string, string])[] = [
  splitSpeechBoxes(goldRepeatCloseMessage!.pages[0]!)[0]!,
];

function brainSpeechPersonalityBoxCount(state: BattleRoomState): number {
  return state.brainSpeechTier === "gold" ? GOLD_PERSONALITY_BOX_COUNT : SILVER_PERSONALITY_BOX_COUNT;
}

function brainSpeechBoxes(state: BattleRoomState): readonly (readonly [string, string])[] {
  if (state.brainSpeechTier === "gold") {
    return state.brainSpeechFirstEncounter
      ? GOLD_FIRST_ENCOUNTER_SPEECH_BOXES
      : GOLD_REPEAT_SPEECH_BOXES;
  }
  return state.brainSpeechFirstEncounter
    ? SILVER_FIRST_ENCOUNTER_SPEECH_BOXES
    : SILVER_REPEAT_SPEECH_BOXES;
}

function brainSpeechBoxAt(state: BattleRoomState, index: number): readonly [string, string] {
  const boxes = brainSpeechBoxes(state);
  return boxes[Math.min(index, boxes.length - 1)]!;
}

function brainSpeechPrintTicks(box: readonly [string, string]): number {
  return box[0].length + box[1].length;
}

/**
 * Elapsed tick "brainSettled" hands off into the speech's first box.
 * MEASURED (this step, alongside `BRAIN_MOVEMENT_CLOCK_OFFSET`): dense
 * compare against fixture 03 with the walk/pan cadence corrected showed the
 * app's speech box appearing 5 ticks before oracle's real one (a static
 * empty-box-shaped mismatch, oracle frames matching this module's own
 * `preCheckpointFrameOffset`-relative numbering 1046-1050 - `docs/noland-
 * silver-walkup-presentation-map.md`'s own "~1113" estimate was a rough
 * typewriter-visibility read, not a tick-exact appear boundary); 5 closes it
 * exactly.
 */
export const SPEECH_APPEAR_ELAPSED = 5;

/**
 * Elapsed tick "brainSpeechSettled" (the cry/close box just closed) hands
 * off to the battle-start intro - sourced directly from the already-
 * committed dense map's own pinned frames (docs/noland-silver-walkup-
 * presentation-map.md §3: "box closes; empty arena pause" 3201-3228 (28
 * frames), then "pre-transition flash onset" at 3229) rather than re-derived
 * this step, same reuse discipline as BRAIN_MOVEMENT_SETTLE_ELAPSED's own
 * doc above. Silver-specific value - see `brainSpeechSceneHandoffElapsed`
 * for gold's own (shorter) pause.
 */
export const BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED = 28;

/**
 * Gold's own version of `BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED` above - NOT the
 * same duration (a route-derived input, not a hardcoded gold branch of the
 * mechanism: both tiers share the identical "free-run brainSpeechSettled
 * until this many ticks, then hand off" rule, just measured against each
 * tier's own dense ground truth). docs/noland-brain-intro-gold-ground-
 * truth.md §7' ("factory-brain-gold-speech-close-off.json", stride-1
 * confirmed for every frame in that section): "2531–2556 | 26f hold
 * (`31aec4d68fe629cb`) | Dialogue box dismissed, empty-arena pause" - 26
 * frames, not silver's 28 (the doc's own §3′ table independently corroborates
 * this: "Dialogue-dismissed pause | 3201–3228 (28f) silver | 2531–~2557
 * (≥27f) gold | Same (±1f)").
 */
export const BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED_GOLD = 26;

/** Tier-general accessor for the two constants above - see their own docs. */
export function brainSpeechSceneHandoffElapsed(state: BattleRoomState): number {
  return state.brainSpeechTier === "gold"
    ? BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED_GOLD
    : BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED;
}

/**
 * True while the currently-shown speech box should draw the "waiting for
 * input, more text follows" cursor - dense-compare-caught (this step's own
 * box0/cry spot-check traces): every box still mid-string (joined to the
 * next by the source `\l`/`\p` control codes) shows it while idle, matching
 * this engine's own existing battle-scene wait-cursor mechanism
 * (battleScene.ts's drawCursor/CURSOR_Y_OFFSETS - same glyph, reused here).
 * The personality speech's LAST box (page 8 silver / page 4 gold, string-
 * terminated by `$` with no further `\p`) and the standalone close/cry box
 * (a separate msgbox call, same shape as the entrance's own cursor-less
 * "Get a move on!" box) do NOT - both close straight to the next scene with
 * no more text pending. Tier-general (`brainSpeechPersonalityBoxCount`):
 * gold's dense ground truth (docs/noland-brain-intro-gold-ground-truth.md
 * §7') independently confirms the same rule - page 4 is static, matching
 * this function's existing "last personality box never shows the cursor"
 * shape rather than needing a gold-specific carve-out.
 */
/**
 * The cursor does not appear the instant its owning phase's `elapsed` clock
 * starts - MEASURED this session (gold-open-window step): dense pixel diffs
 * of `factory-brain-gold-walkup-speech-open-off.json` (post accept-timing
 * fix, see this file's `battleRoomAcceptedState`/CLOSE-WIPE-adjacent doc
 * history) cross-referenced against a live `state.elapsed` trace
 * (`createInitialState`/`tick` stepped through the same trace) show oracle
 * draws NO cursor pixels at all - not offset-0, absent - for `elapsed` 0 and
 * 1 of every fresh `brainSpeechIdle` entry (frames 167-168 relative to that
 * fixture's own numbering, direct pixel readout: rows 142-148 all background
 * in oracle, full glyph in the app). `factory-brain-silver-walkup-
 * entrance-03-off.json` shows the byte-identical shape at its own box0 entry
 * (frames 471-472) - tier-general, not a gold-only artifact. Every later
 * bob-phase boundary is ALSO shifted exactly 2 ticks later than a raw
 * `elapsed`-indexed table lookup predicts in both fixtures (gold: pairs at
 * elapsed 9/10, 18/19, 27/28, ... every fixture-open bad frame closes under
 * `elapsed - 2`; silver entrance-03: the identical pairs at elapsed 9/10,
 * 18/19, 27/28, 36/37 relative to its own box0 entry close the same way) -
 * i.e. the cursor's own internal timer starts 2 ticks after the box's
 * `elapsed` clock, not concurrently with it.
 */
export const CURSOR_APPEAR_DELAY_TICKS = 2;

export function brainSpeechCursorVisible(state: BattleRoomState): boolean {
  return (
    (state.phase === "brainSpeechIdle" || state.phase === "brainSpeechClosing")
    && (state.speechStep ?? 0) < brainSpeechPersonalityBoxCount(state) - 1
    && state.elapsed >= CURSOR_APPEAR_DELAY_TICKS
  );
}

/**
 * Bob-animation Y offset for the wait cursor, keyed by the SAME idle
 * `elapsed` clock the box's own idle hold ages on (re-based by
 * `CURSOR_APPEAR_DELAY_TICKS`'s own doc above, since the cursor's own timer
 * starts 2 ticks later) - reuses battleScene.ts's own cycle (0,1,2,1 px, one
 * step every 9 ticks) rather than inventing a fresh one, since it is the
 * same glyph/mechanism. Only called from behind `brainSpeechCursorVisible`
 * (battleRoomRender.ts), which already guarantees `elapsed >=
 * CURSOR_APPEAR_DELAY_TICKS` - the subtraction below never goes negative.
 */
const CURSOR_Y_BOB_OFFSETS = [0, 1, 2, 1] as const;
export function brainSpeechCursorYOffset(state: BattleRoomState): number {
  const cursorElapsed = state.elapsed - CURSOR_APPEAR_DELAY_TICKS;
  return CURSOR_Y_BOB_OFFSETS[Math.floor(cursorElapsed / 9) % CURSOR_Y_BOB_OFFSETS.length]!;
}

/**
 * True for every brain-entrance phase from "brainSettled" onward - the
 * movement/camera settle pose (Noland/decoy/scientists at their final
 * resting positions). battleRoomRender.ts uses this to know when to stop
 * deriving their pose from the movement clock and hold the settled one
 * instead, since the speech phases below all continue holding that same
 * settled scene behind the message box.
 */
export function brainEntranceMovementSettled(phase: BattleRoomPhase): boolean {
  return (
    phase === "brainSettled"
    || phase === "brainSpeech"
    || phase === "brainSpeechIdle"
    || phase === "brainSpeechClosing"
    || phase === "brainSpeechSettled"
  );
}

/**
 * True the exact tick `battleRoomAcceptedState` transitions out of the
 * gated personality speech's LAST box into the always-shown close/cry box -
 * the JSON's own `frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH` moment
 * (both tiers' events order: the gated speech, THEN the flag set, THEN the
 * close/cry line). Not independently visible in pixels (the flag has no
 * on-screen effect - docs/noland-silver-walkup-presentation-map.md §1), so
 * exact-tick fidelity only needs to preserve this ORDER, not a specific
 * frame. Repeat encounters (`brainSpeechFirstEncounter` false) never satisfy
 * this - they only ever show the close/cry box, so there is no personality
 * speech to have just finished. Tier-general (`brainSpeechPersonalityBoxCount`):
 * the caller (core.ts) marks the SAME tier's heard flag (markFactoryBrainSpeech
 * Heard, keyed off `prev.brainSpeechTier`) the same tick this returns true.
 *
 * Was keyed off `prev.phase === "brainSpeechClosing"` before the real-close
 * edge fix (`docs/speech-close-edge-evidence.md`,
 * `docs/speech-close-edge-silver-evidence.md`) - that phase is no longer
 * ever entered for this transition (`battleRoomAcceptedState` now lands
 * directly on "brainSpeech", see its own doc), so this checks the new
 * accept-driven transition shape instead: leaving `speechStep ===
 * personalityBoxCount - 1` (the last personality box) via the accept seam
 * straight into "brainSpeech" (the close/cry box).
 */
export function battleRoomJustFinishedBrainPersonalitySpeech(
  prev: BattleRoomState,
  next: BattleRoomState,
): boolean {
  return (
    prev.frontierBrainWalkup === true
    && prev.brainSpeechFirstEncounter === true
    && prev.phase === "brainSpeechIdle"
    && next.phase === "brainSpeech"
    && (prev.speechStep ?? 0) === brainSpeechPersonalityBoxCount(prev) - 1
  );
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
  // The brain branch's own box ("Hey, hey!\nGet a move on!") is never the
  // opponent's battle quote - trainerPresentation.speechBefore is Noland's
  // identity carried forward for the speech step, not this scene's text.
  if (state.frontierBrainWalkup) {
    if (
      state.phase === "brainSpeech"
      || state.phase === "brainSpeechIdle"
      || state.phase === "brainSpeechClosing"
    ) {
      return brainSpeechBoxAt(state, state.speechStep ?? 0);
    }
    return [BRAIN_MSGBOX_LINE1, BRAIN_MSGBOX_LINE2];
  }
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

/**
 * Generic brain-room msgbox CLOSE WIPE: the box's own on-screen clear does
 * NOT coincide with its owning phase's elapsed-based state transition (that
 * boundary stays exactly as already RAM/pixel-calibrated elsewhere - moving
 * it would perturb BRAIN_MOVEMENT_CLOCK_OFFSET/entryStep sync or
 * brainSpeechSceneHandoffElapsed). Instead each closing phase has its own
 * measured lead/lag, both re-derived this step via fresh `bin/oracle`
 * reruns of already-committed fixtures (sha-probed frame-by-frame, not
 * fitted):
 *
 * - `brainMsgboxClosing`->`brainMoving` (the entrance escort box,
 *   `factory-brain-silver-walkup-entrance-03-off.json`, press at trace
 *   frame 314): oracle holds the box (sha `7d8066240c8e6514...`) through
 *   frame 320 - TWO ticks into `brainMoving` - and only clears at frame 321
 *   (sha `b7b33c16283c...`), the SAME tick `brainMoving`'s own camPanY
 *   first leaves 0 (battleRoom.ts's own B1c doc: "RAM stays flat two ticks
 *   after the brainMsgboxClosing->brainMoving transition"). The box does
 *   not clear on `brainMsgboxClosing`'s own fixed schedule - it clears when
 *   the room itself starts visibly moving, two `brainMoving`-elapsed ticks
 *   after the state transition already puts it there unconditionally
 *   hidden. Reproduce: `npm run compare -- factory-brain-silver-walkup-
 *   entrance-03-off.json --summary` (frames 319-320 were the only
 *   msgbox-class residual before this fix).
 * - `brainSpeechClosing`->`brainSpeechSettled` (the close/cry box that
 *   follows the gated personality speech in BOTH tiers -
 *   `factory-brain-gold-walkup-speech-close-off.json`, press at trace frame
 *   35): oracle clears the box (sha `f0d9bf0629eb...` -> `31aec4d68fe6...`)
 *   on `brainSpeechClosing`'s own very first elapsed tick (trace frame 36) -
 *   FOUR ticks before `MSGBOX_CLOSE_TICKS` ends the state's own hold. Unlike
 *   the escort box, this box's script (`BattleFrontier_BattleFactoryBattle
 *   Room_EventScript_DoNolandBattle`: `closemessage` is the very next
 *   command after the box's own `msgbox ..., MSGBOX_DEFAULT` macro returns,
 *   no intervening `applymovement`/`waitmessage`) closes essentially
 *   instantly - modeled as always-hidden through the whole phase. Tier-
 *   general: silver's own `BattleNolandSilver` label calls the identical
 *   `msgbox ..., MSGBOX_DEFAULT` -> (via `call DoNolandBattle`)
 *   `closemessage` shape (scripts.inc), so the immediate-clear applies to
 *   silver's close/cry box too, not just gold's (no committed silver bar
 *   exercises this transition to confirm pixel-for-pixel, but the source
 *   shape is identical - see the module's own "tier-general" convention
 *   elsewhere in this file).
 *
 * The two are NOT the same offset (+2 ticks vs. immediate/-4 ticks) because
 * they come from different script shapes, not because one is a mistake -
 * see each box's own script citation above.
 */
export const BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS = 2;

/** Per-phase message-box visual (battleRoomRender.ts/core.ts consume this directly - see module doc for the per-phase derivation, and the CLOSE WIPE doc above for the two closing-adjacent overrides). */
export function msgboxVisual(state: BattleRoomState): MsgboxVisual {
  switch (state.phase) {
    case "entering":
      return enteringMsgboxVisual(state.elapsed);
    case "msgboxIdle":
    case "msgboxClosing":
      return { visible: true, chars: msgboxPrintTicks(state) };
    case "settled":
      return MSGBOX_HIDDEN;
    case "brainEntering":
      return enteringBrainMsgboxVisual(state.elapsed);
    case "brainMsgboxIdle":
    case "brainMsgboxClosing":
      return { visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS };
    case "brainMoving":
      // CLOSE WIPE: the escort box lingers through this phase's own first
      // two elapsed ticks - see BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS's doc.
      return state.elapsed < BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS
        ? { visible: true, chars: BRAIN_MSGBOX_PRINT_TICKS }
        : MSGBOX_HIDDEN;
    case "brainSettled":
      return MSGBOX_HIDDEN;
    case "brainSpeech": {
      const box = brainSpeechBoxAt(state, state.speechStep ?? 0);
      // `speechAcceptedFast` boxes skip the cleared tick - the accept tick
      // (elapsed 0) already shows character 1, not 0 - see that field's own
      // doc for the two-window derivation.
      const printElapsed = state.speechAcceptedFast ? state.elapsed + 1 : state.elapsed;
      return { visible: true, chars: Math.min(printElapsed, brainSpeechPrintTicks(box)) };
    }
    case "brainSpeechIdle":
      return {
        visible: true,
        chars: brainSpeechPrintTicks(brainSpeechBoxAt(state, state.speechStep ?? 0)),
      };
    case "brainSpeechClosing":
      // CLOSE WIPE: the close/cry box clears immediately (see doc above),
      // well before MSGBOX_CLOSE_TICKS' own state-transition boundary.
      return MSGBOX_HIDDEN;
    case "brainSpeechSettled":
      return MSGBOX_HIDDEN;
  }
}

export { FADE_IN };
