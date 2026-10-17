import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import type { LiveMoveSpriteAllocatorInput, LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { LiveBattlerX2History, LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { battleMoveAnimationRequest, type BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import {
  battleCommandFieldBattlerFromPartyMember,
  createBattleCommandDisplayedField,
  type BattleCommandFieldBattler,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import { createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import { PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES } from "./battlePartySelect.ts";
import type {
  BattleBoundary,
  BattleCommandDecision,
  BattleCommandRequest,
  BattleDecisionTransitionResult,
  BattleForcedSwitchRequest,
  BattleKernelSemanticEvent,
  BattleOutcome,
  BattlePartyIndex,
  BattleState,
} from "./battleDecisionBoundary.ts";
import type { FactoryFullTurnDecisionRules } from "./factoryBattleScriptFullTurnDecision.ts";
import type {
  BattleScriptActionMessageSnapshot,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import type { BattleScriptSelectionRejection } from "./battleScriptActionAdmission.ts";
import {
  battleStringReferencesToken,
  resolveBattleNameWithPrefix,
  resolveBattleStringLines,
  resolveMoveName,
  resolveMoveNameExclaim,
} from "./battleStringResolver.ts";
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import {
  BATTLE_INTRO_STRINGS,
  type BattleIntroStringEntry,
} from "../data/battleIntroStrings.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import { substituteFadeDuration } from "./liveSubstituteFade.ts";
import { statsChangeParams, statsChangeSpan } from "../animation/statsChange.ts";
import { liveMoveAnimationDuration } from "./liveMoveAnimation.ts";
import { battleResolutionCommandDuration, battleResolutionFieldBeforeCommand } from "./battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import { spriteOrderStatusAnimationName } from "./spriteOrderEventTransform.ts";
import { seg127StatusSeGateFromEvents, seg127StatusSeGateRows } from "./seg127StatusSeGate.ts";
import {
  opponentSwitchInDuration, opponentSwitchInHealthboxSlideElapsed, opponentSwitchInVisualDelay,
  sceneOffOpponentSwitchInDuration, sceneOffOpponentSwitchInHealthboxSlideElapsed, sceneOffOpponentSwitchInLagElapsed,
  sceneOffOpponentSwitchInVisualDelay, sceneOffPlayerForcedSwitchInDuration, sceneOffPlayerForcedSwitchInHealthboxSlideElapsed,
  sceneOffPlayerForcedSwitchInVisualDelay, sceneOnPlayerForcedSwitchInDuration,
} from "./switchInTail.ts";

const FACTORY_ITEM_NAME_BY_ID = new Map(
  (frontierHeldItemsData.entries as readonly Readonly<{
    itemId: number;
    displayName: string;
  }>[]).map(({ itemId, displayName }) => [itemId, displayName]),
);

export type BattleStatName = Extract<
  BattleScriptSemanticEventPayload,
  { kind: "stat-stage-change" }
>["stat"];

export type PartyBallState = "empty" | "healthy" | "status" | "fainted";

/**
 * `holdFrames` is the source's own post-print `waitmessage B_WAIT_TIME_LONG`
 * (64, `reference/pokeemerald/include/constants/battle.h:324`), present after
 * every stat-change message's `printfromtable` (`BattleScript_StatUp`/
 * `BattleScript_StatDown`, `reference/pokeemerald/data/battle_scripts_1.s:
 * 513,559`; `BattleScript_AllStatsUp*`'s five identically-shaped per-stat
 * blocks, `:3464,3469,3474,3479,3483`) but not modeled for every message kind
 * here -- see `WAITMESSAGE_LONG_MESSAGE_IDS` at the call site.
 */
export type BattleMessageTiming =
  | Readonly<{ minimumFrames: 24; holdFrames: 0 }>
  | Readonly<{ minimumFrames: 24; holdFrames: 9 }>
  | Readonly<{ minimumFrames: 13; holdFrames: 0 }>
  // ISSUES #81 4b route-scoped used-move hold: the failed/no-anim path's
  // `pause`/controller span counts from print completion, so the typing term
  // is the exact printable length (minimumFrames 0), not the 24-frame floor.
  | Readonly<{ minimumFrames: 0; holdFrames: number }>
  // off108 (ISSUES #167): the provenance-derived used-move hold over a source
  // `pause B_WAIT_TIME_SHORT` (sourcePauseUsedMoveHoldFrames), after the floor.
  | Readonly<{ minimumFrames: 24; holdFrames: number }>
  // fpp150 (ISSUES #139): a Focus Punch pre-pass print -- the empty box's interpreter rows, or the focus print's
  // waitmessage B_WAIT_TIME_LONG + the end2 -> next action lead (focusPunchPrePassMessageTiming).
  | Readonly<{ minimumFrames: number; holdFrames: number }>;
/**
 * sgs134 (docs/sgs134-se-gate-other-requests.md): seGateFrames (present only when > 0) = HandleMoveAnimation's IsBattleSEPlaying rows
 * before a multi-hit move's 2nd+ hit (sgs134RequestSeGate); the live command presents them before its pre rows (the field as it is).
 */
/**
 * sub183 (docs/sub183-substitute-turn-timing.md): scriptLeadFrames (present only when > 0) = the script rows between the controller's
 * release of "X used Y!" and `attackanimation`, presented as a live body's first rows (the field as it is, before the seGate and pre
 * rows); only a script whose `attackstring` is followed by `waitstate` has them (BattleScript_EffectSubstitute).
 */
/**
 * ont193 (docs/btl188-scene-on-anchor-start.md, ISSUES #167 (a')): scriptTailRows (present only when > 0) = the source-derived rows from a
 * Scene ON no-hit body's start to the next command's first row, beyond the body's own pre + idle lead + live rows:
 * `(Δ(N) − Δ(attack) + 1) + k + 1` (moveAnimationScriptTailTiming). `liveMoveScriptTailFrames` subtracts the body's post rows and adds
 * the adapter's trail to get the rows the live body presents after its last row (the held last body row).
 */
export type BattleMoveAnimationTiming = Readonly<{
  minimumFrames: number; seGateFrames?: number; scriptLeadFrames?: number; scriptTailRows?: number;
}>;
export type BattleHitAnimationTiming = Readonly<{
  minimumFrames: 35;
  firstDisplayedAge: 1;
}>;
/** sub183: tailFrames (present only when > 0) = the script rows between the bar's last row and the next print's first glyph (see hpPrintTailTiming). */
export type BattleHpTiming = Readonly<{ minimumFrames: 28 | 0; tailFrames?: number }>;
/**
 * The RAM stat write is silent for exactly 2 frames before the message box
 * clears (`docs/issue69-omniboost-off-ground-truth.md` §2: every one of the
 * 5 measured banners shows the same write-frame-to-box-clear-frame gap --
 * 283->285, 375->377, 468->470, 559->561, 652->654). The visible post-print
 * hold is a `message` property in source (`waitmessage` follows
 * `printfromtable`, not `statbuffchange`), not a `stat` one -- see
 * `BattleMessageTiming`.
 */
export type BattleStatTiming = Readonly<{ minimumFrames: 2 }>;
/**
 * 32 frames; Scene OFF: the frames to the next print (off121, `sceneOffStatusFrames`); Scene ON, when a status animation of
 * the same execution follows: the same frames (sa125 SA3, `sceneOnStatusFrames`).
 */
export type BattleStatusTiming = Readonly<{ minimumFrames: number }>;
/**
 * sa125 (docs/sta123-status-animations-design.md §1 / §4, tools/integration/fixtures/sta123/receipts/rom-r1.json): the rows
 * the next script instruction waits on the controller after a Scene ON statusanimation = gAnimScriptActive rows + 1 (the
 * IsBattleSEPlaying gate before it, SA2, is added per receipt: sag130, seg127StatusSeGate.ts). WRAPPED has no table entry in
 * source (never played).
 */
export const STATUS_ANIMATION_ADDED_ROWS = Object.freeze({
  PSN: 71, CONFUSION: 100, BRN: 39, INFATUATION: 97, SLP: 97, PRZ: 39, FRZ: 117, CURSED: 75, NIGHTMARE: 75,
} as const);
export type BattleStatusAnimationName = keyof typeof STATUS_ANIMATION_ADDED_ROWS;
/**
 * fpp150 (ISSUES #139; fps147 §1 / §4b, 7 / 7 dense Scene ON windows): the general-animation command for
 * B_ANIM_FOCUS_PUNCH_SETUP spans ROM rows X + 1 .. X + 124 (X = the playanimation row; gAnimScriptActive X + 2 .. X + 121),
 * so the next message command's first frame is the first glyph of "…is tightening its focus!" at X + 125. Behind a Substitute
 * TryHandleLaunchBattleTableAnimation returns at once (battle_gfx_sfx_util.c:468-472): first glyph at X + 4, no animation.
 */
export const FOCUS_PUNCH_SETUP_COMMAND_FRAMES = 124;
export const FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES = 3;
/**
 * fpp150 (rcp143 R4, both scenes): the rows from the end of the "…is tightening its focus!" print + `waitmessage
 * B_WAIT_TIME_LONG` (L + 64) to the next action's first glyph: end2, RunTurnActionsFunctions and action 1's prologue
 * (ROM: print 108 / 198, next action's print 214 / 304, first glyph + 1; L = 31). Before a second Focus Punch user's
 * pre-pass (unprobed, fps147 §4h) the action prologue is replaced by CheckFocusPunch's re-entry: 4 rows fewer.
 */
export const FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES = 11;
export const FOCUS_PUNCH_PRE_PASS_NEXT_PRE_PASS_LEAD_FRAMES = 5;
/**
 * fpc180 (docs/fpc177-focus-punch-edges.md, 12 twice-fresh ROM cards, both scenes): the lead after the last pre-pass print is
 * `5 + u` (u = the next USEDMOVE print's instructionExecution; FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES is the fallback when no
 * USEDMOVE print is the next print), 7 into a voluntary switch's recall (focus glyph -> recall glyph 106 in the ROM), and the
 * party-select close hold before a pre-pass-opening voluntary switch is 7 (the empty box starts at turn order + 4).
 */
export const FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_BASE_FRAMES = 5;
export const FOCUS_PUNCH_PRE_PASS_SWITCH_RECALL_LEAD_FRAMES = 7;
export const FOCUS_PUNCH_PRE_PASS_SWITCH_CLOSE_FIELD_HOLD_FRAMES = 7;
export const FOCUS_PUNCH_SETUP_SCRIPT = "BattleScript_FocusPunchSetUp";
/** STATUS2_SUBSTITUTE (include/constants/battle.h:216). */
const FOCUS_PUNCH_STATUS2_SUBSTITUTE = 1 << 24;
const SYNTHESIZED_SWITCH_DISPATCHER = "synthesized-voluntary-switch";

/**
 * fpo187 (docs/fpo187-focus-punch-on-prepass-row.md, ont193): Scene ON only, the pre-pass `playanimation` launch
 * (Player/OpponentHandleBattleAnimation, gated by IsBattleSEPlaying) waits for the player's last menu SE_SELECT (10 frames) when
 * the first pre-pass of a turn follows a Fight-menu A confirm (animWait 2 -> empty glyph to tightening glyph 127). With no SE in
 * play (a voluntary-switch turn, or any later pre-pass of the turn) the launch is 2 rows earlier -> 125. Scene OFF has no
 * animation receipt (Pausex20 path) and never takes the term.
 */
export const FOCUS_PUNCH_PRE_PASS_MENU_SE_LAUNCH_WAIT_FRAMES = 2;
function focusPunchPrePassLaunchWaitsForMenuSe(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const isPrePassBox = (event: BattleKernelSemanticEvent): boolean =>
    event.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT && event.payload.kind === "message"
    && event.payload.messageId === "STRINGID_EMPTYSTRING3";
  if (events.findIndex(isPrePassBox) !== index) return false;
  return !events.some((event) => event.provenance?.dispatcher === SYNTHESIZED_SWITCH_DISPATCHER);
}

/**
 * fpp150: a pre-pass print's timing. The empty box (printstring STRINGID_EMPTYSTRING3 + waitmessage 1) lasts one frame per
 * kernel interpreter execution to the script's next presented receipt plus waitmessage 1's controller row (the kernel does not
 * count the printer's busy row): Scene ON the playanimation (2 + 1: rows X - 3 .. X - 1, the general-animation command then
 * starts X + 1), Scene OFF the focus print (36 + 1: BattleScript_Pausex20's call / pause 32 / return, the focus print's first
 * glyph then lands on its command's first frame). rcp143 R4: empty box shown 72, Scene OFF focus print 108 (glyph 109),
 * Scene ON X 74; fps147 §4b. The focus print adds the end2 -> next action / pre-pass lead.
 */
function focusPunchPrePassMessageTiming(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  base: BattleMessageTiming,
): BattleMessageTiming | null {
  const event = events[index]!;
  if (event.provenance?.sourceLabel !== FOCUS_PUNCH_SETUP_SCRIPT || event.payload.kind !== "message") return null;
  if (event.payload.messageId === "STRINGID_EMPTYSTRING3") {
    const next = events[index + 1];
    const from = event.provenance.instructionExecution;
    const to = next?.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT ? next.provenance.instructionExecution : undefined;
    if (from === undefined || to === undefined || to <= from) return null;
    const animWait = next?.payload.kind === "animation" && !focusPunchPrePassLaunchWaitsForMenuSe(events, index)
      ? FOCUS_PUNCH_PRE_PASS_MENU_SE_LAUNCH_WAIT_FRAMES
      : 0;
    return Object.freeze({ minimumFrames: Math.max(1, to - from + 1 - animWait), holdFrames: 0 });
  }
  if (event.payload.messageId === "STRINGID_PKMNTIGHTENINGFOCUS") {
    // The next print (skipping silent events such as the PP update that precedes a Substitute's used print).
    let next: BattleKernelSemanticEvent | undefined;
    for (let following = index + 1; following < events.length; following += 1) {
      next = events[following]!;
      if (next.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT || next.payload.kind === "message") break;
      next = undefined;
    }
    let lead: number;
    if (next?.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT) lead = FOCUS_PUNCH_PRE_PASS_NEXT_PRE_PASS_LEAD_FRAMES;
    else if (next?.provenance?.dispatcher === SYNTHESIZED_SWITCH_DISPATCHER) lead = FOCUS_PUNCH_PRE_PASS_SWITCH_RECALL_LEAD_FRAMES;
    else {
      const used = next?.payload.kind === "message" && next.payload.messageId === "STRINGID_USEDMOVE"
        ? next.provenance?.instructionExecution
        : undefined;
      lead = used === undefined ? FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES : FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_BASE_FRAMES + used;
    }
    return Object.freeze({ minimumFrames: base.minimumFrames, holdFrames: base.holdFrames + lead });
  }
  return null;
}

/**
 * chg161 (ISSUES #167 (d), docs/chg161-charge-turn-print.md): a two-turn move's charge-turn empty box (BattleScriptFirstChargingTurn:
 * printstring STRINGID_EMPTYSTRING3, ppreduce, attackanimation, waitanimation, ... printfromtable). The ROM clears the box on one row
 * (rel 0) and the script reaches attackanimation on the next (rel 1 = off108's G + 2; gAnimScriptActive rises at rel 4), 6 / 6 dense
 * windows (Dig / Razor Wind / Solar Beam, both scenes). Scene OFF: the box is that one row and BattleScript_Pausex20's pause command
 * (sceneOffNoHitPauseFrames, counted from the box's first row) presents the rest. Scene ON: production has no command for the rows
 * between waitanimation's release and the charge print; the box carries them, one frame per interpreter execution to the charge
 * print (the attackanimation execution's own rows are the move-animation command), so the charge print's first glyph lands on the
 * ROM row. Null if the shape differs.
 */
function chargeTurnEmptyBoxTiming(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
): BattleMessageTiming | null {
  const event = events[index]!;
  if (event.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT || event.payload.kind !== "message"
    || event.payload.messageId !== "STRINGID_EMPTYSTRING3") return null;
  const from = event.provenance.instructionExecution;
  let attack: BattleKernelSemanticEvent | null = null;
  for (let next = index + 1; next < events.length; next += 1) {
    const candidate = events[next]!;
    if (candidate.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT) return null;
    const payload = candidate.payload;
    if (attack === null) {
      if (payload.kind === "set-battler-pp-data") continue;
      if (payload.kind !== "animation"
        || (payload.animationId !== "MOVE_ANIMATION" && payload.animationId !== "SCENE_OFF_ATTACK_PAUSE")) return null;
      attack = candidate;
      if (payload.animationId === "SCENE_OFF_ATTACK_PAUSE") return CHARGE_TURN_EMPTY_BOX_ROW_TIMING;
      continue;
    }
    if (payload.kind !== "message") return null;
    const to = candidate.provenance?.instructionExecution;
    if (from === undefined || to === undefined || to <= from) return null;
    return Object.freeze({ minimumFrames: to - from, holdFrames: 0 });
  }
  return null;
}
const CHARGE_TURN_SCRIPT = "BattleScriptFirstChargingTurn";
const CHARGE_TURN_EMPTY_BOX_ROW_TIMING = Object.freeze({ minimumFrames: 1, holdFrames: 0 });

/** fpp150: the turn opens with BattleScript_FocusPunchSetUp (CheckFocusPunch_ClearVarsBeforeTurnStarts runs before action 1). */
export function battleResolutionOpensWithFocusPunchPrePass(events: readonly BattleKernelSemanticEvent[]): boolean {
  return events.find((event) => event.sequence >= 0)?.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT;
}
export type BattleStatusIconTiming = Readonly<{ minimumFrames: 1 }>;
export type BattleFaintTiming =
  | Readonly<{
      minimumFrames: number;
      sink: "opponent-tile-rows";
      steps: number;
      healthboxVanishFrame: number;
    }>
  | Readonly<{
      minimumFrames: number;
      sink: "player-pixel-rows";
      pixelsPerFrame: 5;
      spriteRows: number;
      healthboxVanishFrame: number;
    }>;
export type BattleSwitchInTiming = Readonly<{ minimumFrames: number }>;
export type BattleSpriteVisibilityTiming = Readonly<{
  minimumFrames: 1 | typeof FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES | typeof SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES;
}>;
export type BattleTurnEndTiming = Readonly<{ minimumFrames: 8 }>;
export type BattleTrainerSlideTiming = Readonly<{ minimumFrames: 38 }>;

export type BattleResolutionPresentationCommand =
  | Readonly<{
      type: "message";
      eventSequence: number;
      lines: readonly string[];
      advance: "automatic" | "button";
      /** Present only on a source faint message; owns a later forced-selector handoff. */
      faintBattler?: 0 | 1;
      /**
       * True only for the two quote-placeholder ids
       * (`TERMINAL_SEAM_QUOTE_MESSAGE_IDS`) whose real printer path never
       * spawns the wait-cursor task, per that const's own citation.
       */
      noCursor: boolean;
      timing: BattleMessageTiming;
      /**
       * Presentation-only: B_ANIM_SUBSTITUTE_FADE (battle_scripts_1.s BattleScript_SubstituteFade) ran for this battler
       * right before this message (STRINGID_PKMNSUBSTITUTEFADED). The ROM fade ends on the mon (prep37: row 84 / 83), so
       * the Substitute doll is no longer shown from this message on. The fade itself is the preceding "substitute-fade"
       * command (liveSubstituteFade.ts); this tag stays the doll clear's fallback.
       */
      substituteFadeBattler?: 0 | 1;
    }>
  | Readonly<{
      type: "move-animation";
      animation?: BattleMoveAnimationRequest;
      /** trn181: the Scene ON action-transition pause (draw-nothing; leaves hides and live hosts untouched). */
      actionTransition?: true;
      eventSequence: number;
      battler: 0 | 1;
      timing: BattleMoveAnimationTiming;
    }>
  | Readonly<{
      type: "hit-animation";
      eventSequence: number;
      battler: 0 | 1;
      timing: BattleHitAnimationTiming;
    }>
  | Readonly<{
      type: "hp";
      eventSequence: number;
      battler: 0 | 1;
      from: number;
      to: number;
      healthValue: number;
      timing: BattleHpTiming;
    }>
  | Readonly<{
      type: "stat";
      eventSequence: number;
      battler: 0 | 1;
      stat: BattleStatName;
      from: number;
      to: number;
      timing: BattleStatTiming;
    }>
  | Readonly<{
      type: "status";
      eventSequence: number;
      battler: 0 | 1;
      before: number;
      after: number;
      timing: BattleStatusTiming;
    }>
  | Readonly<{
      /** BtlController_EmitStatusIconUpdate's distinct healthbox display receipt. */
      type: "status-icon";
      eventSequence: number;
      battler: 0 | 1;
      status1: number;
      status2: number;
      timing: BattleStatusIconTiming;
    }>
  | Readonly<{
      type: "faint";
      eventSequence: number;
      battler: 0 | 1;
      partyIndex: BattlePartyIndex;
      timing: BattleFaintTiming;
    }>
  | Readonly<{
      type: "party-summary";
      eventSequence: number;
      battler: 0 | 1;
      visible: boolean;
      states: readonly PartyBallState[];
      /**
       * ISSUES #78 slice 4: the player's draw-party-status-summary receipt
       * plus the `getswitched` handoff before "Go!" -- the real
       * CONTROLLER_DRAWPARTYSTATUSSUMMARY occupies 1119-1120 and getswitched
       * flips at 1121, so the field-hold between the return-to-ball and the
       * "Go!" printstring (1119-1125) is 7 frames. Absent on every other
       * (non-voluntary-switch) path, where the default 1-frame receipt stands.
       */
      timing?: Readonly<{ minimumFrames: number }>;
    }>
  | Readonly<{
      type: "switch-in";
      eventSequence: number;
      battler: 0 | 1;
      fromPartyIndex: BattlePartyIndex;
      toPartyIndex: BattlePartyIndex;
      incoming: BattleCommandFieldBattler;
      /** Raw party status at the source switch boundary; owns the new healthbox icon. */
      incomingStatus1: number;
      timing: BattleSwitchInTiming;
      /**
       * ISSUES #78 slice 4: the send-in's post-controller `waitstate` release
       * + move-load hold (`SWITCH_IN_WAITSTATE_HOLD_FRAMES`), on top of the
       * 91-frame controller span.
       */
      settleHoldFrames?: number;
      /**
       * snd145: Scene ON opponent send-in only (src/engine/switchInTail.ts): the species-keyed healthbox slide start (switch-in
       * elapsed) and the frames the whole send-in starts late (CASTFORM 1). Absent = the calibrated constants (player; Scene OFF,
       * where HITMARKER_NO_ANIMATIONS skips the front animation that gates the slide: BattleAnimateFrontSprite, pokemon.c:6803).
       */
      healthboxSlideElapsed?: number;
      sendInVisualDelay?: number;
      /**
       * offs152: Scene OFF opponent send-in (src/engine/switchInTail.ts `sceneOffOpponentSwitchIn*`): the slide / visual delay above
       * are the Scene OFF constants and NO front animation runs (SKIP_FRONT_ANIM); Scene ON's faint-replacement hold does not apply.
       */
      skipFrontAnimation?: true;
      /** offs152: Scene OFF long-nickname lag frame -- from this elapsed on the send-in visuals run one frame late. */
      sendInLagElapsed?: number;
    }>
  | Readonly<{
      type: "switch-out";
      eventSequence: number;
      battler: 0 | 1;
      timing: BattleSwitchInTiming;
      /**
       * Scene ON forced switch-out (`Cmd_returntoball`, skipAnim = TRUE;
       * docs/forced-switch-continuation.md): no recall animation -- the live
       * body left the target off-screen, so this hold draws no target until
       * the recall receipt removes it and its healthbox.
       */
      skipAnimation?: true;
      /**
       * offs152: Scene OFF forced removal (no body ran): the target stays drawn at rest through the hold until the recall
       * receipt removes it in one row (docs/offs152-scene-off-send-in-tail.md §R0).
       */
      targetAtRest?: true;
    }>
  | Readonly<{
      type: "sprite-visibility";
      eventSequence: number;
      battler: 0 | 1;
      visible: boolean;
      /**
       * True only when this transition is the real `CONTROLLER_RETURNMONTOBALL`
       * receipt (`Cmd_various`'s `VARIOUS_RETURN_OPPONENT_MON1`/`MON2`,
       * `BtlController_EmitReturnMonToBall` -- `battle_controller_opponent.c`'s
       * `OpponentHandleReturnMonToBall`/`FreeMonSpriteAfterSwitchOutAnim` both
       * call `SetHealthboxSpriteInvisible` alongside destroying the sprite),
       * distinguished from the unrelated `CONTROLLER_SPRITEINVISIBILITY`
       * receipt (`Cmd_moveend`'s semi-invulnerable Dig/Fly toggle,
       * `Cmd_makevisible` -- `OpponentHandleSpriteInvisibility` only ever
       * touches the sprite's own `invisible` flag) via the emitting
       * instruction's own opcode, not any window-specific context.
       */
      recall: boolean;
      timing: BattleSpriteVisibilityTiming;
    }>
  | Readonly<{
      type: "turn-end";
      timing: BattleTurnEndTiming;
    }>
  | Readonly<{
      /**
       * S10A: General_SubstituteFade (B_ANIM_SUBSTITUTE_FADE; liveSubstituteFade.ts), presentation-only, Scene ON and OFF:
       * script rows + first inactive row + 2-row OAM tail (106 player / 104 opponent).
       */
      type: "substitute-fade";
      eventSequence: number;
      battler: 0 | 1;
      timing: Readonly<{ minimumFrames: number }>;
    }>
  | Readonly<{
      /**
       * sc106 (S10A, ISSUES #166 slice c): General_StatsChange (B_ANIM_STATS_CHANGE / Cmd_playstatchangeanimation),
       * presentation-only, Scene ON and OFF, at the kernel STATS_CHANGE `animation` event. `argument` is the animArg;
       * minimumFrames = statsChangeSpan(statsChangeParams(argument)).addedRows (76 / 90: playanimation -> next instruction
       * 77 / 91 rows vs 1 without the animation, docs/stat101-stats-change-design.md). None behind a Substitute (the ROM plays
       * nothing) and none after a live Double Team body, whose window already owns the banner (docs/sc106-stats-change-command.md).
       */
      type: "stats-change";
      eventSequence: number;
      battler: 0 | 1;
      argument: number;
      /**
       * scf117 (ISSUES #166): holdFrames (present only when > 0) = the rows from the animation's next instruction
       * (rel 77 / 91) to the following print's first glyph, less the `stat` frames between (statsChangeNextReceiptHoldFrames).
       */
      timing: Readonly<{ minimumFrames: number; holdFrames?: number; seGateFrames?: number }>;
    }>
  | Readonly<{
      /**
       * sa125 (S10A, ISSUES #168 slice SA1): B_ANIM_STATUS_* (Cmd_statusanimation / status2animation / chosenstatusanimation),
       * Scene ON only, at the kernel `status-animation` receipt (the kernel already skips Scene OFF, a Substitute and a
       * semi-invulnerable battler). `animation` is InitAndLaunchChosenStatusAnimation's pick (spriteOrderStatusAnimationName);
       * minimumFrames = the IsBattleSEPlaying gate (sag130 SA2, docs/seg127-status-se-gate.md) + STATUS_ANIMATION_ADDED_ROWS[animation],
       * the controller rows the next instruction waits (docs/sta123-status-animations-design.md §4). gaf140
       * (docs/gaf140-status-gate-age.md): seGateFrames (present only when > 0) = that gate, the rows before the animation's first row.
       */
      type: "status-animation";
      eventSequence: number;
      battler: 0 | 1;
      animation: BattleStatusAnimationName;
      timing: Readonly<{ minimumFrames: number; seGateFrames?: number }>;
    }>
  | Readonly<{
      /**
       * fpp150 (ISSUES #139, docs/fpp150-focus-punch-prepass.md): BattleScript_FocusPunchSetUp's B_ANIM_FOCUS_PUNCH_SETUP
       * (Scene ON only: the kernel's playanimation takes BattleScript_Pausex20 in Scene OFF). Command age a = ROM row X + 1 + a
       * (X = the playanimation row); General_FocusPunchSetUp is drawn at rel = age - 1 (fps147's rows). minimumFrames =
       * FOCUS_PUNCH_SETUP_COMMAND_FRAMES (the next print's first glyph at X + 125), or the substitute rows (no animation).
       */
      type: "general-animation";
      eventSequence: number;
      battler: 0 | 1;
      animation: "FOCUS_PUNCH_SETUP" | "LEECH_SEED_DRAIN";
      timing: Readonly<{ minimumFrames: number }>;
    }>
  | Readonly<{
      /** `Cmd_trainerslidein`/`Cmd_trainerslideout` -- generic across any trainer/outcome, see `TRAINER_SLIDE_TIMING`. */
      type: "trainer-slide";
      eventSequence: number;
      battler: 0 | 1;
      direction: "in" | "out";
      timing: BattleTrainerSlideTiming;
    }>;

export type BattleResolutionDisplayedField = Readonly<{
  player: BattleCommandFieldBattler;
  opponent: BattleCommandFieldBattler;
}>;

/**
 * Narrow compatibility receipt for the already-exact terminal battle window.
 * The immutable terminal boundary and all rendered strings are frozen before
 * the adapter starts; battleScene may consume its relative clocks, but may
 * not rediscover an outcome or trainer string from turn flags.
 */
export type BattleTerminalResolutionPresentationState = Readonly<{
  pendingBoundary: Extract<BattleBoundary, { kind: "terminal" }>;
  command: Readonly<{
    type: "terminal-result";
    resultLines: readonly [string, string];
    opponentLossLines: readonly [string, string];
  }>;
  confirmElapsed: number;
  menuRedrawElapsed: number;
  faintDismissElapsed: number | null;
  resultDismissElapsed: number | null;
  lossDismissElapsed: number | null;
}>;

export function createBattleTerminalResolutionPresentation(input: Readonly<{
  pendingBoundary: Extract<BattleBoundary, { kind: "terminal" }>;
  resultLines: readonly [string, string];
  opponentLossLines: readonly [string, string];
  confirmElapsed: number;
  menuRedrawElapsed: number;
}>): BattleTerminalResolutionPresentationState {
  return Object.freeze({
    pendingBoundary: input.pendingBoundary,
    command: Object.freeze({
      type: "terminal-result" as const,
      resultLines: Object.freeze([...input.resultLines]) as unknown as readonly [string, string],
      opponentLossLines: Object.freeze([...input.opponentLossLines]) as unknown as readonly [string, string],
    }),
    confirmElapsed: input.confirmElapsed,
    menuRedrawElapsed: input.menuRedrawElapsed,
    faintDismissElapsed: null,
    resultDismissElapsed: null,
    lossDismissElapsed: null,
  });
}

export function storeBattleTerminalPresentationDismiss(
  state: BattleTerminalResolutionPresentationState,
  gate: "faint" | "result" | "loss",
  elapsed: number,
): BattleTerminalResolutionPresentationState {
  const key = gate === "faint"
    ? "faintDismissElapsed"
    : gate === "result"
      ? "resultDismissElapsed"
      : "lossDismissElapsed";
  if (state[key] !== null) return state;
  return Object.freeze({ ...state, [key]: elapsed });
}

export type BattleResolutionSegment = Readonly<{
  /** Display field at this segment's real reducer boundary. */
  field: BattleResolutionDisplayedField;
  beforeRules: FactoryFullTurnDecisionRules;
  afterRules: FactoryFullTurnDecisionRules;
  events: readonly BattleKernelSemanticEvent[];
  commands: readonly BattleResolutionPresentationCommand[];
}>;

/**
 * The one-main-callback-at-a-time path from HandleInputChooseMove's accepted
 * response to Cmd_attackstring. These are source controller/interpreter
 * states, not a fitted duration:
 *
 * - battle_controller_player.c:481-527,200-213
 * - battle_main.c:4354-4402,4458-4551,4756-4854,4906-4957
 * - battle_util.c:78-292
 * - battle_scripts_1.s:236-247
 * - battle_script_commands.c:915-1006,1191-1203
 */
export type BattleResolutionConfirmHandoffStage =
  | "move-selection-response"
  | "selection-accepted"
  | "stop-bounce-request"
  | "actions-confirmed"
  | "turn-order"
  | "before-turn"
  | "action-dispatch"
  | "attack-canceler"
  | "accuracy-check";

export type BattleResolutionConfirmHandoff = Readonly<{
  stage: BattleResolutionConfirmHandoffStage;
  fightDisplayCursor: 0 | 1 | 2 | 3;
  idleBounceElapsed: number;
  bounceReset: boolean;
  /**
   * fpp150: the turn opens with the Focus Punch pre-pass, whose empty box the ROM prints 3 rows after turn order (R4: 68 -> 71,
   * shown 72) where an action's first print lands 9 rows after it (36 -> 45, glyph 46). The handoff ends after
   * stop-bounce-request (the first command's frame is then the empty box's first display row on R4, both scenes); the remaining
   * stages' rows (the action prologue) are carried by the pre-pass's last print (FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES).
   */
  focusPunchPrePass?: true;
}>;

/**
 * Frozen per-round trainer identity `messageLines` needs for the terminal
 * win-text seam (`STRINGID_PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/
 * `TRAINER1WINTEXT`) in addition to the send-out/intro family's existing
 * `className`/`name` substitutions. `speechLose`/`speechWin` are
 * `factoryTrainerPresentationForOpponent`'s own already-formatted 2-line
 * Easy Chat tuples (`factoryTrainerPresentation.ts`). `speechWin` is optional
 * (unlike `speechLose`) so the many pre-existing WIN-side-only fixtures that
 * never reach `STRINGID_TRAINER1WINTEXT` don't need a dummy value; every real
 * production caller (`factoryTrainerPresentationForOpponent`'s return value)
 * always supplies it. LOSS-side terminal seam,
 * `docs/terminal-seam-loss-path-ground-truth.md` §5 item 3.
 *
 * `trainerPic` is the extracted Frontier trainer-picture symbol
 * (`FactoryTrainerPresentation.trainerPic`, resolvable via
 * `resolveFrontierTrainerPic`) the terminal-seam trainer-slide visual draws
 * -- optional for the same reason as `speechWin`: only real production
 * callers need it, synthetic non-terminal fixtures don't.
 */
export type BattleResolutionOpponentTrainer = Readonly<{
  className: string;
  name: string;
  speechLose: readonly [string, string];
  speechWin?: readonly [string, string];
  trainerPic?: string;
}>;

export type BattleResolutionPresentationState = Readonly<{
  /**
   * Presentation-only Scene ON semi-invulnerable hide carried in from the display ledger at this resolution's start
   * (a live Fly/Bounce charge body in an earlier turn; battleResolutionPresentationRender.ts
   * applyLiveSemiInvulnerableCommand). Absent = nothing hidden.
   */
  liveSemiInvulnerableHidden?: readonly [boolean, boolean];
  /**
   * cf78: presentation-only ROM `gBattleMonForms` per battler slot carried in from the display ledger at this resolution's start
   * (battleResolutionPresentationRender.ts applyLiveCastformFormEvents). Absent = both slots in the normal form.
   */
  liveCastformForms?: readonly [number, number];
  liveMovePaletteInput?: LiveMovePaletteInput;
  liveMoveSpriteAllocatorInput?: LiveMoveSpriteAllocatorInput;
  liveMoveSpriteOrderInput?: LiveMoveSpriteOrderInput;
  /** Presentation-only battler x2 history at the current move body's activation edge (liveBattlerX2History.ts, #148). */
  liveMoveBattlerX2Input?: LiveMoveBattlerX2Input;
  /**
   * rst139 (docs/rst139-ordinary-row-rest.md): the tracked x2 history before the current command (Scene ON only; absent = no x2
   * host). Ordinary rows draw an `idle` opponent at its species front idle rest (battleResolutionPresentationRender.ts).
   */
  liveOrdinaryBattlerX2History?: LiveBattlerX2History;
  resolutionId: Readonly<{
    requestId: number;
    side: "player";
    battler: 0;
  }>;
  sourceDecision: BattleCommandDecision;
  segments: readonly BattleResolutionSegment[];
  segmentIndex: number;
  commandIndex: number;
  lifecycle: Readonly<{
    phase:
      | "confirm-handoff"
      | "presenting"
      | "awaiting-message-dismiss"
      | "forced-party-handoff"
      | "presenting-switch-in"
      | "next-command-handoff"
      | "terminal-handoff";
    phaseElapsed: number;
  }>;
  /**
   * ISSUES #78 residual (1): monotonic per-frame clock since this resolution
   * first rendered (0 = the null-handoff confirm phase's first tick, i.e.
   * trace frame 1035 of the staged voluntary-switch fixture). One frame per
   * `advanceFactoryRoundBattleResolution`/`advanceBattleResolutionConfirmHandoff`
   * tick, so the mid-battle ball-fade windows (recall 1088-1131, send-in
   * 1187-1231) can be keyed to the real trace timeline even though each fade
   * spans multiple presentation commands (switch-out -> party-summary ->
   * "Go!" / switch-in). Inactive for every other route (the fade coefficient
   * projection only reports nonzero work inside the two windows).
   */
  fadeTick: number;
  confirmHandoff: BattleResolutionConfirmHandoff | null;
  field: BattleResolutionDisplayedField;
  pendingBoundary: BattleBoundary;
  pendingBattle: BattleState<FactoryFullTurnDecisionRules>;
  forcedRequest: BattleForcedSwitchRequest | null;
  opponentTrainer: BattleResolutionOpponentTrainer | null;
}>;

export type CreateBattleResolutionPresentationInput = Readonly<{
  sourceRequest: BattleCommandRequest;
  sourceDecision: BattleCommandDecision;
  beforeRules: FactoryFullTurnDecisionRules;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  fieldBoundary: BattleCommandPresentationState["field"];
  /**
   * Required only for a confirmed `use-move` source decision (the fight-menu
   * bounce handoff). A voluntary `switch` source decision skips the
   * confirm-handoff entirely -- its resolution begins in the null-handoff
   * confirm phase (the settled-field hold) that `advanceBattleResolutionConfirmHandoff`
   * owns before the recall printstring's first glyph.
   */
  confirmHandoff?: Readonly<{
    fightDisplayCursor: 0 | 1 | 2 | 3;
    idleBounceElapsed: number;
  }>;
  opponentTrainer?: BattleResolutionOpponentTrainer | null;
  /**
   * Route-scoped post-print hold for `STRINGID_USEDMOVE` on the
   * failed/no-anim path (ISSUES #81 remainder 4b). The source runs a
   * `pause B_WAIT_TIME_SHORT` / an animation controller span after the
   * attackstring with NO `waitmessage`, so the message's on-box time is the
   * following script steps -- measured 38 (ButItFailed) / 39 (SPLASH) in
   * `docs/battle-message-pacing-ground-truth.md`. Only a route's staging
   * context supplies a nonzero value; the standard hit chain's USEDMOVE
   * stays held by its subsequent move/hit/HP commands (default 0).
   */
  usedMessageHoldFrames?: number;
}>;

const MESSAGE_TIMING = Object.freeze({ minimumFrames: 24, holdFrames: 0 } as const);
/** `B_WAIT_TIME_LONG` (`reference/pokeemerald/include/constants/battle.h:324`). */
export const WAITMESSAGE_LONG_HOLD_FRAMES = 64;
/**
 * Route-scoped `STRINGID_USEDMOVE` hold for the ButItFailed/no-anim path
 * (`pause B_WAIT_TIME_SHORT` = 32 + ~6 dispatch steps, measured 38 =
 * 1076-1113 in `docs/battle-message-pacing-ground-truth.md` §1/§3.4).
 * The standard hit chain's USEDMOVE is held by the subsequent move/hit/HP
 * commands instead, so this hold is opt-in via the staging context
 * (`CreateBattleResolutionPresentationInput.usedMessageHoldFrames`), never
 * a blanket USEDMOVE hold.
 */
export const USED_MESSAGE_B_WAIT_TIME_SHORT_HOLD_FRAMES = 38;
/**
 * Route-scoped `STRINGID_USEDMOVE` hold for the SPLASH no-anim path: the
 * `attackanimation`/`waitanimation` controller span (measured 39 = 1265-1303
 * in `docs/battle-message-pacing-ground-truth.md` §2).
 */
export const USED_MESSAGE_SPLASH_CONTROLLER_HOLD_FRAMES = 39;
/**
 * Shared post-print hold for every message id whose emitting script prints it
 * and then runs `waitmessage B_WAIT_TIME_LONG`. The hold counts down from
 * print completion, not from the print command (see
 * `docs/battle-message-hold-cadence-ground-truth.md` §2), so `holdFrames` is
 * strictly additive to the printable length. lsd194 (docs/lsd194-print-floor-and-drain.md): the ROM's first glyph -> next
 * instruction is exactly L + 64 for L = 14 .. 24 (no 24-frame floor, both scenes), so `minimumFrames` is 0 (msg175's USEDMOVE rule).
 */
export const WAITMESSAGE_LONG_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES,
} as const);
/**
 * ISSUES #78 slice 4: STRINGID_RETURNMON is printed with NO `waitmessage` --
 * its visible hold (1043-1124, 82 frames) is the return-to-ball controller
 * round-trip (`docs/mid-battle-switch-presentation-ground-truth.md` §4). The
 * message-only region is its own typing (1 glyph/frame from the 1044 edge)
 * plus the 9-frame post-print hold (1077-1085) before `returnatktoball`
 * dispatches; the box then stays as `latestMessage` through the switch-out,
 * party-summary, and getswitched (the full 82-frame window).
 */
export const RETURN_MON_POST_PRINT_HOLD_FRAMES = 9;
const RETURN_MON_TIMING = Object.freeze({
  minimumFrames: 24,
  holdFrames: RETURN_MON_POST_PRINT_HOLD_FRAMES,
} as const);
/**
 * ISSUES #78 slice 4: "Go! X!" is also waitmessage-free; its visible hold
 * (1125-1139, 13 frames from the 1126 first glyph) is the party-summary hide
 * + switch-in dispatch (ground truth §4). The generic 24-frame
 * `MESSAGE_TIMING` floor overshoots by 11.
 */
const SWITCH_IN_MESSAGE_TIMING = Object.freeze({ minimumFrames: 13, holdFrames: 0 } as const);
/**
 * ISSUES #78 slice 4: the player's draw-party-status-summary + getswitched
 * hold (real 1119-1125, 7 frames) before the "Go!" printstring at 1125.
 */
const PARTY_SUMMARY_DRAW_TIMING = Object.freeze({ minimumFrames: 7 } as const);
/**
 * Every stat-change message id source prints via `printfromtable
 * gStatUpStringIds`/`gStatDownStringIds` immediately followed by
 * `waitmessage B_WAIT_TIME_LONG` -- `BattleScript_StatUp`/`StatDown`
 * (`reference/pokeemerald/data/battle_scripts_1.s:511-514,556-560`) for the
 * single-stat case, `BattleScript_AllStatsUp*`'s five identical per-stat
 * blocks (`:3458-3483`) for the omniboost case. `gStatUpStringIds`/
 * `gStatDownStringIds` (`reference/pokeemerald/src/battle_message.c:
 * 1006-1022`) resolve to exactly these six STRINGIDs, so this set is
 * exhaustive for that script shape, not a partial sample.
 */
const STAT_CHANGE_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_ATTACKERSSTATROSE",
  "STRINGID_DEFENDERSSTATROSE",
  "STRINGID_STATSWONTINCREASE",
  "STRINGID_ATTACKERSSTATFELL",
  "STRINGID_DEFENDERSSTATFELL",
  "STRINGID_STATSWONTDECREASE",
]);
/**
 * The shared `waitmessage B_WAIT_TIME_LONG` family: stat-change ids plus the
 * standard hit chain's `critmessage`/`resultmessage` class. `STRINGID_
 * CRITICALHIT` is printed by `Cmd_critmessage` then held by `waitmessage
 * B_WAIT_TIME_LONG` (`battle_scripts_1.s:262`); `STRINGID_SUPEREFFECTIVE`/
 * `STRINGID_NOTVERYEFFECTIVE` are printed by `Cmd_resultmessage` then held
 * (`:264`); `STRINGID_ONEHITKO`/`STRINGID_PKMNENDUREDHIT` get their own
 * dedicated `printstring` + `waitmessage B_WAIT_TIME_LONG` scripts
 * (`BattleScript_OneHitKOMsg`/`BattleScript_EnduredMsg`, `:3688-3695`).
 * `STRINGID_BUTITFAILED`/`STRINGID_BUTNOTHINGHAPPENED` join via the
 * `ButItFailed`/`ButNothingHappened` script tails' `waitmessage B_WAIT_TIME_LONG`
 * (`BattleScript_ButItFailed`, `data/battle_scripts_1.s:2058-2063`, and
 * `BattleScript_EffectSplash`, `:1172-1181`) -- measured holds 79/74 in
 * `docs/battle-message-pacing-ground-truth.md` §1/§2.
 * Real interpreter receipts now derive this cadence from their following
 * source opcode (`messageTimingFromSourceProvenance`). This id set is the
 * compatibility fallback for older synthetic fixtures without a real program
 * counter; synthetic additions join the family here, never at a render site.
 */
export const WAITMESSAGE_LONG_MESSAGE_IDS: ReadonlySet<string> = new Set([
  ...STAT_CHANGE_MESSAGE_IDS,
  "STRINGID_SUPEREFFECTIVE",
  "STRINGID_NOTVERYEFFECTIVE",
  "STRINGID_CRITICALHIT",
  "STRINGID_ONEHITKO",
  "STRINGID_PKMNENDUREDHIT",
  "STRINGID_BUTITFAILED",
  "STRINGID_BUTNOTHINGHAPPENED",
]);

const BATTLE_SCRIPT_PROGRAM = loadBattleScriptProgram();

/**
 * Executes the cadence expressed immediately after a real source print
 * command. This is keyed by immutable interpreter provenance, not by the
 * rendered string or the move/species that happened to reach it. The legacy
 * id family remains only for synthetic receipts that have no usable program
 * counter (older focused presentation fixtures).
 */
function messageTimingFromSourceProvenance(
  event: BattleKernelSemanticEvent,
): BattleMessageTiming | null {
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined || programCounter < 0) return null;
  const following = BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 1];
  if (
    following?.opcodeName === "B_SCR_OP_WAITMESSAGE"
    && following.operands.length === 1
    && following.operands[0]!.expression === "B_WAIT_TIME_LONG"
  ) {
    return WAITMESSAGE_LONG_TIMING;
  }
  return null;
}
/**
 * Scene-OFF hit controller lifetime:
 * setup, 32 blink callbacks, completion, and waitstate release.
 * battle_controller_opponent.c:1804-1816,440-456;
 * battle_script_commands.c:3927-3931.
 */
const HIT_ANIMATION_TIMING = Object.freeze({
  minimumFrames: 35,
  firstDisplayedAge: 1,
} as const);
/** BattleScript_Pausex20's `pause B_WAIT_TIME_SHORT`. */
const SCENE_OFF_MOVE_PAUSE_FRAMES = 32;

/**
 * off108 (ISSUES #167, docs/off108-scene-off-pauses.md): Scene OFF runs
 * BattleScript_Pausex20 for EVERY attackanimation, so a body without a hit
 * receipt (a status move, Protect, a two-turn charge turn, a no-effect damaging
 * move) still spends attackanimation .. waitanimation .. the next presented
 * instruction. As on the hit path, one frame per interpreter execution from
 * the opener print (STRINGID_USEDMOVE, or a charge turn's EMPTYSTRING3), whose
 * command ends on the frame after its final glyph: the next presented
 * receipt's command starts `instructionExecution - opener + lead` frames
 * later. lead = 1 for a print (its first glyph lands one frame after the print
 * executes) and for a status-data receipt (Cmd_statusanimation is the next
 * instruction) and for STATS_CHANGE (the sc106 stats-change command's age 0
 * is stat101's rel 1, the row after the gAnimScriptActive rise = the
 * playanimation row: stat102 frame mapping, olnd113); 0 for the HP bar.
 * Frames already presented since the opener are subtracted. An unlisted next
 * receipt is unmeasured: no pause there (off148: a sprite-visibility receipt
 * next, Wish / Roar / Baton Pass, whose next drawn change is a switch-out or
 * the next action's print; nothing next). offs152: a `returntoball` receipt (Roar / Whirlwind / Baton Pass) is N
 * with lead -3 (SCENE_OFF_RETURN_TO_BALL_LEAD).
 *
 * off148 (docs/off148-scene-off-pauses-remainder.md): a stat-stage-change
 * receipt between the attack receipt and N (Curse's statbuffchange before its
 * print, Swagger / Flatter's before STATS_CHANGE) draws nothing in Scene OFF;
 * it is skipped and its `stat` command's frames are subtracted. A held message
 * since the opener (Rest: "went to sleep!" + waitmessage + the status icon)
 * breaks the one-frame-per-execution mapping before the attack receipt, but
 * production's commands since the opener then end on the ROM's attackanimation
 * row, and the mapping holds again from there: P = Δ(N) − Δ(attack) + 1 + lead.
 */
/** The battler operand (`BS_TARGET` / `BS_ATTACKER`) of a `returntoball` receipt's source instruction, if known. */
function returnToBallOperand(event: BattleKernelSemanticEvent): string | null {
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined || programCounter < 0) return null;
  const instruction = BATTLE_SCRIPT_PROGRAM.instructions[programCounter];
  return instruction?.opcodeName === "B_SCR_OP_RETURNTOBALL" ? instruction.operands[0]?.expression ?? null : null;
}

/**
 * offs152 (docs/offs152-scene-off-send-in-tail.md §R0): the forced switch-out after a Scene OFF Roar / Whirlwind / Baton Pass body.
 * `returntoball` executes on row R and removes the target on R + 2 (off148 OFF probes), the forced hold's 4 frames end there, so the
 * switch-out command starts on R - 2 = the print convention's R + 2 (lead 1) minus 4.
 */
const SCENE_OFF_RETURN_TO_BALL_LEAD = -3; // 1 - FORCED_RETURN_TO_BALL_HOLD_FRAMES (declared below; pinned in tests/offs152SceneOffForcedSwitch.test.ts)

/**
 * trn176 (docs/trn176-action-transition.md): the action transition's fixed rows, `end`, HandleAction_TryFinish,
 * HandleAction_ActionFinished, HandleAction_UseMove and the next script's first row, plus the print's row after its attackstring:
 * the ROM's next "used" first glyph is E + 1 + d + n + 6 + u (E the previous action's last blocking row, d the rows from E to the
 * first `moveend`, n the MoveEnd sprite-visibility receipts, u the next USEDMOVE's instructionExecution).
 */
const ACTION_TRANSITION_ROWS = 6;

/**
 * msg175 (docs/msg175-used-message-duration.md, off148 §3 Wish): rows from the MoveEnd sprite-visibility receipt's execution to the
 * next action's "used" first glyph, less that action's own instructionExecution u: MoveEnd's remaining cases + the action dispatch
 * (next script on Δ + 5 = G + 45 with u counted from there, attackstring on u, first glyph two rows later). trn176: n + 6 with
 * Wish's single (attacker) receipt.
 */
const SCENE_OFF_MOVEEND_NEXT_USED_GLYPH_ROWS = 1 + ACTION_TRANSITION_ROWS;

const ACTION_TRANSITION_WAIT_ROWS: Readonly<Record<string, number>> = Object.freeze({ B_WAIT_TIME_LONG: WAITMESSAGE_LONG_HOLD_FRAMES });

/**
 * trn178 / trn181 (ISSUES #167 (a'), docs/trn178-action-transition-live.md, docs/trn181-action-transition-on.md; rule:
 * docs/trn176-action-transition.md; one rule for both scene modes): the draw-nothing pause
 * before an action's FIRST MoveEnd sprite-visibility receipt when only MoveEnd receipts follow and then the next action's
 * STRINGID_USEDMOVE (instructionExecution u, the kernel's count restarted). The anchor is the action's last print (E = its
 * instructionExecution + its `waitmessage B_WAIT_TIME_LONG`), HP update (`datahpupdate`) or status icon (`updatestatusicon`), whose
 * production command ends on E. Production presents each of the n receipts as one frame, so the n cancels:
 * P = d + 6 + u - (frames presented after the anchor's command), d = e1 - E - 1. Any other shape (no anchor, the anchor is the used
 * print itself (Wish: sceneOffNoHitPauseFrames), a print without that wait, a switch / faint / end of turn / pre-move print next)
 * stays unmeasured: null.
 */
function actionTransitionPauseFrames(
  events: readonly BattleKernelSemanticEvent[],
  receiptIndex: number,
  commands: readonly BattleResolutionPresentationCommand[],
): number | null {
  const isMoveEndReceipt = (event: BattleKernelSemanticEvent) =>
    event.payload.kind === "set-battler-sprite-visibility" && event.provenance?.opcodeName === "B_SCR_OP_MOVEEND";
  const e1 = events[receiptIndex]!.provenance?.instructionExecution;
  if (e1 === undefined) return null;
  let execution = e1;
  let used: number | null = null;
  for (let index = receiptIndex + 1; index < events.length; index += 1) {
    const event = events[index]!;
    const next = event.provenance?.instructionExecution;
    if (next === undefined) return null;
    if (next > execution && isMoveEndReceipt(event)) {
      execution = next;
      continue;
    }
    if (next >= e1 || event.payload.kind !== "message" || event.payload.messageId !== "STRINGID_USEDMOVE") return null;
    used = next;
    break;
  }
  if (used === null) return null;
  execution = e1;
  let anchor: BattleKernelSemanticEvent | null = null;
  for (let index = receiptIndex - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    const previous = event.provenance?.instructionExecution;
    if (previous === undefined || previous > execution || isMoveEndReceipt(event)) return null;
    execution = previous;
    const kind = event.payload.kind;
    if (kind === "message" || kind === "hp-change" || kind === "status-icon-update") {
      anchor = event;
      break;
    }
  }
  if (anchor === null) return null;
  let anchorExecution = anchor.provenance!.instructionExecution;
  if (anchor.payload.kind === "message") {
    if (anchor.payload.messageId === "STRINGID_USEDMOVE" || anchor.payload.messageId === "STRINGID_EMPTYSTRING3") return null;
    const following = BATTLE_SCRIPT_PROGRAM.instructions[anchor.provenance!.programCounter + 1];
    const wait = following?.opcodeName === "B_SCR_OP_WAITMESSAGE"
      ? ACTION_TRANSITION_WAIT_ROWS[following.operands[0]?.expression ?? ""]
      : undefined;
    if (wait === undefined) return null;
    anchorExecution += wait;
  }
  let presented = 0;
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index]!;
    if (!("eventSequence" in command) || command.eventSequence <= anchor.sequence) break;
    const timing = (command as { timing?: { minimumFrames: number; holdFrames?: number } }).timing;
    if (timing === undefined || (timing.holdFrames ?? 0) > 0) return null;
    presented += timing.minimumFrames;
  }
  const frames = e1 - anchorExecution - 1 + ACTION_TRANSITION_ROWS + used - presented;
  return frames > 0 ? frames : null;
}

function sceneOffNoHitPauseFrames(
  events: readonly BattleKernelSemanticEvent[],
  attackIndex: number,
  openerIndex: number | null,
  presentedSinceOpener: readonly BattleResolutionPresentationCommand[],
  // chg161: frames the opener's own command presents from G + 1 (the charge-turn empty box); 0 for a USEDMOVE (it ends on G).
  openerFrames = 0,
): number | null {
  if (openerIndex === null) return null;
  const opener = events[openerIndex]!.provenance?.instructionExecution;
  if (opener === undefined) return null;
  let execution = opener;
  for (let index = openerIndex + 1; index <= attackIndex; index += 1) {
    const next = events[index]!.provenance?.instructionExecution;
    if (next === undefined || next < execution) return null;
    execution = next;
  }
  const attack = execution;
  let presented = openerFrames;
  let held = false;
  for (const command of presentedSinceOpener) {
    const timing = (command as { timing?: { minimumFrames: number; holdFrames?: number } }).timing;
    if (command.type === "move-animation" || command.type === "hit-animation" || timing === undefined) return null;
    if (command.type === "message" || (timing.holdFrames ?? 0) > 0) held = true;
    presented += timing.minimumFrames;
  }
  // The held-message path is ROM-anchored only for Rest's shape: trysetrest's
  // status, the held print, the status icon (off108 §1 / off148 R3). Other
  // held prints before the attack receipt (Magnitude, a Magic Coat bounce)
  // are unmeasured.
  if (held && presentedSinceOpener.map((command) => command.type).join() !== "status,message,status-icon") return null;
  let skipped = 0;
  for (let index = attackIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    const next = candidate.provenance?.instructionExecution;
    if (next === undefined || next < execution) return null;
    execution = next;
    const payload = candidate.payload;
    if (payload.kind === "set-battler-pp-data" || payload.kind === "play-se") continue;
    if (payload.kind === "stat-stage-change") {
      if (payload.from !== payload.to) skipped += STAT_TIMING.minimumFrames;
      continue;
    }
    // msg175 (ISSUES #167 (a), Wish): a MoveEnd sprite-visibility receipt next (its 1-frame command draws nothing), then the next
    // action's USEDMOVE at instructionExecution u (the kernel restarts the count): the ROM's next first glyph is G + Δ(moveend) +
    // SCENE_OFF_MOVEEND_NEXT_USED_GLYPH_ROWS + u (off148 OFF, both sides G + 51 = 40 + 7 + 4). Production: the pause from G + 1, the
    // sprite-visibility frame, then that print. Any other continuation (end of turn, a switch, a pre-move print) stays unmeasured.
    if (payload.kind === "set-battler-sprite-visibility" && candidate.provenance?.opcodeName === "B_SCR_OP_MOVEEND" && !held) {
      const following = events[index + 1];
      const used = following?.provenance?.instructionExecution;
      if (following === undefined || used === undefined || used >= next || following.payload.kind !== "message"
        || following.payload.messageId !== "STRINGID_USEDMOVE") return null;
      const frames = next - opener + SCENE_OFF_MOVEEND_NEXT_USED_GLYPH_ROWS + used - 1 - 1 - presented - skipped;
      return frames > 0 ? frames : null;
    }
    const lead = payload.kind === "message" || payload.kind === "set-battler-status-data"
      || (payload.kind === "animation" && payload.animationId === "STATS_CHANGE")
      ? 1
      : payload.kind === "health-bar-update"
        ? 0
        : payload.kind === "set-battler-sprite-visibility" && payload.invisible
            && candidate.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL"
          ? SCENE_OFF_RETURN_TO_BALL_LEAD
          : null;
    if (lead === null) return null;
    const frames = held
      ? next - attack + 1 + lead - skipped
      : next - opener + lead - presented - skipped;
    return frames > 0 ? frames : null;
  }
  return null;
}

/**
 * fix122 (docs/fix122-audit26-defects.md): the attackanimation sites whose
 * Scene ON "But it failed!" hold is ROM-proven to 0 frames (the first
 * attackanimation at or after each label; BattleScript_EffectProtect is also
 * BattleScript_EffectEndure). Other sites keep the pause-only rule.
 */
export const NO_EFFECT_ATTACKANIMATION_HOLD_LABELS = Object.freeze([
  "BattleScript_PrintReflectLightScreenSafeguardString",
  "BattleScript_MoveWeatherChange",
  "BattleScript_EffectProtect",
  "BattleScript_EffectStockpile",
  "BattleScript_DoLeechSeed",
] as const);
const NO_EFFECT_ATTACKANIMATION_HOLD_PCS: ReadonlySet<number> = new Set(
  NO_EFFECT_ATTACKANIMATION_HOLD_LABELS.map((label) => {
    let programCounter = BATTLE_SCRIPT_PROGRAM.labelEntries[label]!.programCounter;
    while (BATTLE_SCRIPT_PROGRAM.instructions[programCounter]!.opcodeName !== "B_SCR_OP_ATTACKANIMATION") programCounter += 1;
    return programCounter;
  }),
);
/**
 * off108 (ISSUES #167): a `pause B_WAIT_TIME_SHORT` between the attack string
 * and the first print (BattleScript_MoveMissedPause, BattleScript_ButItFailed,
 * the not-affected / "already ..." tails) runs in BOTH scenes with no
 * controller command, so "X used Y!" stays on the box until that print. Hold
 * it for one frame per interpreter execution from the attack string, + 1 for
 * the printer. Only when the print is the first presented receipt after the
 * attack string (the PP receipt is silent) and the source puts that pause
 * within the three straight-line instructions before it.
 */
function sourcePauseUsedMoveHoldFrames(
  events: readonly BattleKernelSemanticEvent[],
  usedIndex: number,
): number | null {
  const used = events[usedIndex]!.provenance?.instructionExecution;
  if (used === undefined) return null;
  let execution = used;
  for (let index = usedIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    const next = candidate.provenance?.instructionExecution;
    if (next === undefined || next < execution) return null;
    execution = next;
    if (candidate.payload.kind === "set-battler-pp-data") continue;
    if (candidate.payload.kind !== "message") return null;
    const programCounter = candidate.provenance!.programCounter;
    for (let back = 1; back <= 3 && programCounter - back >= 0; back += 1) {
      const instruction = BATTLE_SCRIPT_PROGRAM.instructions[programCounter - back];
      if (
        instruction === undefined
        || instruction.opcodeName === "B_SCR_OP_GOTO"
        || instruction.opcodeName === "B_SCR_OP_END"
        || instruction.opcodeName === "B_SCR_OP_RETURN"
      ) return null;
      if (
        instruction.opcodeName === "B_SCR_OP_PAUSE"
        && instruction.operands[0]?.expression === "B_WAIT_TIME_SHORT"
      ) return next - used + 1;
      // fix122 (aud118 DEFECT B): a ROM-proven attackanimation reached with no
      // receipt took Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch, which
      // pushes BattleScript_Pausex20 in BOTH scenes (battle_script_commands.c:
      // 1793-1797): the failed set* / protect-like / stockpile / setseeded print.
      if (NO_EFFECT_ATTACKANIMATION_HOLD_PCS.has(programCounter - back)) return next - used + 1;
    }
    return null;
  }
  return null;
}
/**
 * off121 (docs/off121-status-command.md): in Scene OFF `Cmd_statusanimation` is skipped (HITMARKER_NO_ANIMATIONS,
 * battle_script_commands.c:5753), so nothing is drawn between a status-data receipt (BtlController_EmitSetMonData
 * REQUEST_STATUS_BATTLE: SetMoveEffect, the attack canceler's sleep / freeze turns, trysetrest, cleareffectsonfaint) and the
 * print after it: every instruction in between runs once per frame (Rest's `pause B_WAIT_TIME_SHORT` once per blocked
 * retry). The status command ends where the print's command starts. Commands start `instructionExecution + lead` after
 * the anchor with lead 1 for both receipts (off108), so the command lasts delta(print) - delta(status). When the status
 * command is the first command after "X used Y!" in the same execution (Rest's trysetrest), it starts on the frame after
 * that print's final glyph (idle98's G + 1), before the ROM's status row, so it lasts delta(print) - delta(used) + 1.
 * Anything else between the two receipts, or no provenance: null (the 32-frame command stays).
 */
function sceneOffStatusFrames(
  events: readonly BattleKernelSemanticEvent[],
  statusIndex: number,
  usedIndex: number | null,
  presentedSinceUsed: number,
): number | null {
  const status = events[statusIndex]!.provenance?.instructionExecution;
  if (status === undefined) return null;
  let print: number | null = null;
  let execution = status;
  for (let index = statusIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    const next = candidate.provenance?.instructionExecution;
    if (next === undefined || next < execution) return null;
    execution = next;
    if (candidate.payload.kind === "set-battler-pp-data" || candidate.payload.kind === "play-se") continue;
    if (candidate.payload.kind !== "message") return null;
    print = next;
    break;
  }
  if (print === null || print <= status) return null;
  const usedEvent = usedIndex === null ? undefined : events[usedIndex];
  const used = usedEvent?.provenance?.instructionExecution;
  if (
    usedIndex === null || usedEvent === undefined || used === undefined || presentedSinceUsed !== 0
    || usedEvent.payload.kind !== "message" || usedEvent.payload.messageId !== "STRINGID_USEDMOVE"
  ) return print - status;
  execution = used;
  for (let index = usedIndex + 1; index <= statusIndex; index += 1) {
    const next = events[index]!.provenance?.instructionExecution;
    if (next === undefined || next < execution) return print - status;
    execution = next;
  }
  return print - used + 1;
}
/**
 * sa125 SA3 (docs/sa125-status-animation-command.md): in Scene ON a status-data receipt whose battler's statusanimation runs
 * in the same execution -- right before the print (move / ability infliction: status, statusanimation, print) or right
 * after it (sleep / frozen turns: status, print, waitmessage, statusanimation) -- draws nothing itself either: the ROM
 * status write -> animation -> print timeline is the Scene OFF one plus the animation's controller rows, which the
 * `status-animation` command owns. So the status command lasts delta(print) - delta(status) (off121's rule) and the
 * status-animation command follows it. Anything else between the receipts, or no status animation: null (32 stays).
 */
function sceneOnStatusFrames(events: readonly BattleKernelSemanticEvent[], statusIndex: number): number | null {
  const statusEvent = events[statusIndex]!;
  const status = statusEvent.provenance?.instructionExecution;
  if (status === undefined || statusEvent.payload.kind !== "set-battler-status-data") return null;
  const battler = statusEvent.payload.battler;
  let print: number | null = null;
  let animated = false;
  let execution = status;
  for (let index = statusIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    const next = candidate.provenance?.instructionExecution;
    if (next === undefined || next < execution) return null;
    execution = next;
    const payload = candidate.payload;
    if (payload.kind === "set-battler-pp-data" || payload.kind === "play-se") continue;
    if (payload.kind === "status-animation" && print === null) {
      if (payload.battler !== battler) return null;
      animated = true;
      continue;
    }
    if (print === null) {
      if (payload.kind !== "message") return null;
      print = next;
      if (animated) break;
      continue;
    }
    animated = payload.kind === "status-animation" && payload.battler === battler;
    break;
  }
  return animated && print !== null && print > status ? print - status : null;
}
/**
 * sag130 SA2 (docs/sag130-status-se-gate-live.md): the controller's IsBattleSEPlaying rows before the status animation of
 * `events[index]` (seg127's rule over the segment's kernel events). HP-bar rows = |from - to| (MoveBattleBar's 1 HP per row: every
 * Factory mon has max HP >= 48 but Shedinja, whose hit faints it, and the faint print closes the gate). A path with no measured
 * fixed rows (null; none on census seeds 0..999) presents gate 0 (counted by sag130CensusDelta.py).
 */
function statusAnimationSeGate(events: readonly BattleKernelSemanticEvent[], index: number): number {
  return seg127StatusSeGateFromEvents(events.map((e) => e.payload), index)?.gate ?? 0;
}

/**
 * sgs134 (docs/sgs134-se-gate-other-requests.md): the controller's IsBattleSEPlaying rows before the OTHER gated requests, seg127's rule
 * clamp(seRows[songId] - (fixedRows + HP-bar rows), 0, 29) over the segment's kernel events with the ROM-measured fixed rows
 * (fixtures/sgs134/receipts/rom-r1.json / rom-off-r1.json, both sides): 44 for B_ANIM_STATS_CHANGE from a hit's secondary, both scenes
 * (HandleBattleAnimation; SetMoveEffect's ChangeStatBuffs = the `stat-stage-change` right before the request, then BattleScript_StatDown
 * -> DEFENDERSSTATFELL / BattleScript_StatUp -> ATTACKERSSTATROSE; the playstatchangeanimation paths — Overheat / Superpower /
 * AncientPower — animate before their stat change and are unmeasured: 0) and 62 for a multi-hit move's 2nd+ MOVE_ANIMATION, Scene ON
 * (BattleScript_DoMultiHit: HandleMoveAnimation; Scene OFF skips the attackanimation request). The SE is
 * closed (0) by any print but the multi-hit loop's EMPTYSTRING3 (waitmessage 1) and by any animation script in between (its Cmd_end
 * drains the SE); HIT_ANIMATION is a sprite blink. Every other request (Speed Boost, held items, Knock Off, ...) presents 0.
 */
function sgs134RequestSeGate(events: readonly BattleKernelSemanticEvent[], index: number): number {
  const payloads = events.map((e) => e.payload);
  const request = payloads[index]!;
  if (request.kind !== "animation") return 0;
  let se = -1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (payloads[i]!.kind === "play-se") { se = i; break; }
  }
  if (se < 0) return 0;
  let drain = 0;
  let emptyBetween = false;
  for (const q of payloads.slice(se + 1, index)) {
    if (q.kind === "message") {
      if (q.messageId !== "STRINGID_EMPTYSTRING3") return 0;
      emptyBetween = true;
    } else if (q.kind === "status-animation" || (q.kind === "animation" && q.animationId !== "HIT_ANIMATION")) {
      return 0;
    } else if (q.kind === "hp-change") {
      drain += Math.abs(q.from - q.to);
    }
  }
  // The hit that played the SE: its MOVE_ANIMATION (Scene ON) / SCENE_OFF_ATTACK_PAUSE (Scene OFF).
  let move: (typeof payloads)[number] | null = null;
  for (let i = se - 1; i >= 0; i -= 1) {
    const q = payloads[i]!;
    if (q.kind === "animation" && (q.animationId === "MOVE_ANIMATION" || q.animationId === "SCENE_OFF_ATTACK_PAUSE")) { move = q; break; }
  }
  if (move === null || move.kind !== "animation") return 0;
  const moveId = move.animationId === "MOVE_ANIMATION" ? String(move.arguments[0]) : null;
  const next = payloads.slice(index + 1).find((q) => q.kind === "message");
  const nextId = next?.kind === "message" ? next.messageId : null;
  const songId = (payloads[se] as Extract<(typeof payloads)[number], { kind: "play-se" }>).songId;
  let fixedRows: number | null = null;
  if (request.animationId === "STATS_CHANGE") {
    let previous: (typeof payloads)[number] | undefined;
    for (let i = index - 1; i > se && previous === undefined; i -= 1) {
      if (payloads[i]!.kind !== "set-battler-pp-data" && payloads[i]!.kind !== "game-stat-increment") previous = payloads[i];
    }
    if (previous?.kind === "stat-stage-change"
      && (nextId === "STRINGID_DEFENDERSSTATFELL" || nextId === "STRINGID_ATTACKERSSTATROSE")) fixedRows = 44;
  } else if (request.animationId === "MOVE_ANIMATION") {
    if (emptyBetween && moveId !== null && String(request.arguments[0]) === moveId && !(nextId ?? "").startsWith("STRINGID_PKMN")) {
      fixedRows = 62;
    }
  }
  return fixedRows === null ? 0 : seg127StatusSeGateRows({ songId, seAgeRows: fixedRows + drain });
}
function moveAnimationSeGateTiming(events: readonly BattleKernelSemanticEvent[], index: number): { seGateFrames?: number } {
  const seGate = sgs134RequestSeGate(events, index);
  return seGate > 0 ? { seGateFrames: seGate } : {};
}

/**
 * sub183 (ISSUES #153): `attackstring; waitstate` holds the script until the controller releases the used print (its release row is the
 * waitstate's), so every instruction up to `attackanimation` runs AFTER the print: BattleScript_EffectSubstitute's jumpifstatus2,
 * setsubstitute and jumpifbyte, then attackanimation (ROM G+2..G+5 against the release row G+1: 5 / 5 windows, both scenes and sides).
 * An ordinary script runs its post-attackstring instructions while the print types, so `attackanimation` is the release row itself
 * (production's body starts there) and the lead is 0. The lead is the kernel's instructionExecution(MOVE_ANIMATION) - (waitstate's).
 */
function moveAnimationScriptLeadTiming(events: readonly BattleKernelSemanticEvent[], index: number): { scriptLeadFrames?: number } {
  const animation = instructionExecutionOf(events[index]!);
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = events[i]!;
    const payload = candidate.payload;
    if (payload.kind !== "message" || payload.messageId !== "STRINGID_USEDMOVE") continue;
    const used = instructionExecutionOf(candidate);
    const programCounter = candidate.provenance?.programCounter;
    if (programCounter === undefined || animation <= used) return {};
    const lead = animation - (used + 1);
    return BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 1]?.opcodeName === "B_SCR_OP_WAITSTATE" && lead > 0
      ? { scriptLeadFrames: lead } : {};
  }
  return {};
}

const SCRIPT_TAIL_BETWEEN_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_WAITANIMATION", "B_SCR_OP_SETBYTE", "B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES"]);
const SCRIPT_TAIL_NEXT_OPCODES: ReadonlySet<string> = new Set([
  "B_SCR_OP_PLAYSTATCHANGEANIMATION", "B_SCR_OP_PLAYANIMATION", "B_SCR_OP_PRINTFROMTABLE", "B_SCR_OP_PRINTSTRING",
]);
/**
 * ont193 (ISSUES #167 (a')): a Scene ON no-hit live body (`attackanimation; waitanimation; [setbyte;] <next receipt>`: the stat / protect /
 * status scripts) ends on the ROM's `waitanimation` release row, but the next script instruction runs `Δ(N) − Δ(attack)` rows later and the next
 * receipt's controller work starts one row after that. The body starts on the used print's release row (G + 1) and the script reaches
 * `attackanimation` k rows later (k = Δ(attack) − Δ(used) − 1 less the rows presented in between: Sand-Attack's 2-row `stat` command); the
 * ROM release row is `attackanimation + (P + N + D + trail + 1)`. Returns Δ(N) − Δ(attack) + 1 + k + 1 (the caller's pre + lead + live
 * excluded); null when the script shape differs (a hit body, a charge turn, a Substitute, an unpresented command between).
 */
function moveAnimationScriptTailTiming(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  usedExecution: number | null,
  presentedSinceUsed: number | null,
): { scriptTailRows?: number } {
  const attack = events[index]!;
  const attackExecution = attack.provenance?.instructionExecution;
  const attackPc = attack.provenance?.programCounter;
  if (usedExecution === null || presentedSinceUsed === null || attackExecution === undefined || attackPc === undefined
    || attack.provenance?.sourceLabel === CHARGE_TURN_SCRIPT) return {};
  let next: BattleKernelSemanticEvent | undefined;
  for (let following = index + 1; following < events.length; following += 1) {
    const candidate = events[following]!;
    if (candidate.payload.kind === "set-battler-pp-data" || candidate.payload.kind === "game-stat-increment") continue;
    next = candidate;
    break;
  }
  if (next === undefined) return {};
  const isStatsChange = next.payload.kind === "animation" && next.payload.animationId === "STATS_CHANGE";
  if (next.payload.kind !== "message" && !isStatsChange) return {};
  const nextExecution = next.provenance?.instructionExecution;
  const nextPc = next.provenance?.programCounter;
  if (nextExecution === undefined || nextPc === undefined || nextExecution <= attackExecution) return {};
  const instructions = BATTLE_SCRIPT_PROGRAM.instructions;
  if (nextPc - attackPc !== nextExecution - attackExecution || instructions[attackPc + 1]?.opcodeName !== "B_SCR_OP_WAITANIMATION"
    || !SCRIPT_TAIL_NEXT_OPCODES.has(instructions[nextPc]?.opcodeName ?? "")) return {};
  for (let pc = attackPc + 1; pc < nextPc; pc += 1) {
    if (!SCRIPT_TAIL_BETWEEN_OPCODES.has(instructions[pc]?.opcodeName ?? "")) return {};
  }
  const lead = attackExecution - usedExecution - 1 - presentedSinceUsed;
  if (lead < 0) return {};
  return { scriptTailRows: nextExecution - attackExecution + 1 + lead + 1 };
}

/** ont193: the rows presented since the used print's release (only silent-RAM `stat` commands are accepted), else null. */
function commandsPresentedSinceUsedPrint(
  events: readonly BattleKernelSemanticEvent[],
  openerIndex: number | null,
  since: readonly BattleResolutionPresentationCommand[],
  field: BattleResolutionDisplayedField,
): number | null {
  const opener = openerIndex === null ? undefined : events[openerIndex];
  if (opener?.payload.kind !== "message" || opener.payload.messageId !== "STRINGID_USEDMOVE") return null;
  let rows = 0;
  for (const command of since) {
    if (command.type !== "stat") return null;
    rows += battleResolutionCommandDuration(command, field);
  }
  return rows;
}

/** sa125 SA1: the presented B_ANIM_STATUS_* of a kernel `status-animation` receipt, or null (WRAPPED / none: no table entry). */
function statusAnimationPresented(isStatus2: number, status: number): BattleStatusAnimationName | null {
  const name = spriteOrderStatusAnimationName(isStatus2 !== 0, status);
  return name !== null && Object.hasOwn(STATUS_ANIMATION_ADDED_ROWS, name) ? name as BattleStatusAnimationName : null;
}
const HP_TIMING = Object.freeze({ minimumFrames: 28 } as const);

/**
 * sub183 (ISSUES #153): BattleScript_EffectSubstitute's `datahpupdate; printfromtable; waitmessage`. The ROM's datahpupdate run is the
 * bar's frames + 2 where the HP command is bar + 1 (1 row), and the print's first glyph follows the printfromtable and waitmessage
 * rows (2 rows): 3 rows, 45 + 1 + 1 = G+97..G+143 then the glyph at G+144, both scenes, both sides (4 / 4 dense windows, 0 px).
 * Only the Substitute script is measured, so the rule requires its `attackanimation; waitanimation; healthbarupdate` lead-in (the
 * other `datahpupdate; printfromtable`, Leech Seed's turn-end drain, has no ROM window here).
 */
const HP_PRINT_TAIL_FRAMES = 3;
function hpPrintTailTiming(event: BattleKernelSemanticEvent): BattleHpTiming {
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined) return HP_TIMING;
  const at = (offset: number) => BATTLE_SCRIPT_PROGRAM.instructions[programCounter + offset]?.opcodeName;
  return at(0) === "B_SCR_OP_DATAHPUPDATE" && at(1) === "B_SCR_OP_PRINTFROMTABLE" && at(-1) === "B_SCR_OP_HEALTHBARUPDATE"
    && at(-2) === "B_SCR_OP_WAITANIMATION" && at(-3) === "B_SCR_OP_ATTACKANIMATION"
    ? Object.freeze({ minimumFrames: 28, tailFrames: HP_PRINT_TAIL_FRAMES } as const) : HP_TIMING;
}
/**
 * lsd194 (docs/lsd194-print-floor-and-drain.md; lsd186 receipts, 6 ROM cases: 3 scenarios x both scenes, twice-fresh): the turn-end Leech
 * Seed drain, `BattleScript_LeechSeedTurnDrain` (`playanimation; orword; healthbarupdate; datahpupdate; copyword; jumpifability;
 * manipulatedamage; setbyte; goto`) then `BattleScript_LeechSeedTurnPrintAndUpdateHp` (`orword; healthbarupdate; datahpupdate;
 * printfromtable; waitmessage`). HITMARKER_PASSIVE_HP_UPDATE only gates Counter / Mirror Coat / Shell Bell records
 * (Cmd_datahpupdate, battle_script_commands.c:1932-1960), never a wait: each `datahpupdate` blocks on the preceding `healthbarupdate`'s
 * controller exactly like any other, so a bar's ROM run is the bar's frames + 2 with no 28-row floor.
 *   - Lead (from the last presented MoveEnd row to the seeded bar): the print's `goto` + MoveEnd rows beyond the two presented
 *     sprite-visibility rows (LEECH_SEED_DRAIN_PRE_ROWS) + the script's own executions through the seeded `healthbarupdate`
 *     (`instructionExecution`: `playanimation`, Scene OFF's Pausex20 33 rows, `orword`, `healthbarupdate` = 36) + Scene ON's
 *     animation rows beyond the `orword` row its 208-row run already holds (LEECH_SEED_DRAIN_ANIMATION_ROWS: `delay 0` = 2 ticks
 *     + Move_ABSORB's 206 rows, the 10-row window lead + 194 window + 2 to the script end).
 *   - Seeded bar: no floor; tail = the executions to the receiver's `datahpupdate` (8 = the run's `datahpupdate` row + 7 script rows).
 *   - Receiver bar: no floor; tail = HP_PRINT_TAIL_FRAMES (the `datahpupdate` row, `printfromtable`, the `waitmessage` row).
 * Only the ordinary path is measured (no Liquid Ooze: its `jumpifability` skips rows, so the tail would not be 8 and the rule is off).
 */
const LEECH_SEED_DRAIN_PRE_ROWS = 8;
export const LEECH_SEED_DRAIN_ANIMATION_ROWS = 208;
const LEECH_SEED_DRAIN_SEEDED_TAIL = 8;
function datahpupdatePcAfter(label: string): number {
  let programCounter = BATTLE_SCRIPT_PROGRAM.labelEntries[label]!.programCounter;
  while (BATTLE_SCRIPT_PROGRAM.instructions[programCounter]!.opcodeName !== "B_SCR_OP_DATAHPUPDATE") programCounter += 1;
  return programCounter;
}
const LEECH_SEED_DRAIN_SEEDED_PC = datahpupdatePcAfter("BattleScript_LeechSeedTurnDrain");
const LEECH_SEED_DRAIN_RECEIVER_PC = datahpupdatePcAfter("BattleScript_LeechSeedTurnPrintAndUpdateHp");
/** The drain role of the hp-change at events[index], or null (not a measured ordinary drain). */
function leechSeedDrainRole(events: readonly BattleKernelSemanticEvent[], index: number): "seeded" | "receiver" | null {
  const event = events[index]!;
  const pc = event.provenance?.programCounter;
  if (pc === LEECH_SEED_DRAIN_RECEIVER_PC) {
    const seeded = events.slice(0, index).reverse().find((e) => e.payload.kind === "hp-change");
    return seeded?.provenance?.programCounter === LEECH_SEED_DRAIN_SEEDED_PC
      && event.provenance!.instructionExecution! - seeded.provenance.instructionExecution! === LEECH_SEED_DRAIN_SEEDED_TAIL ? "receiver" : null;
  }
  if (pc !== LEECH_SEED_DRAIN_SEEDED_PC) return null;
  const receiver = events.slice(index + 1).find((e) => e.payload.kind === "hp-change");
  return receiver?.provenance?.programCounter === LEECH_SEED_DRAIN_RECEIVER_PC
    && receiver.provenance.instructionExecution! - event.provenance!.instructionExecution! === LEECH_SEED_DRAIN_SEEDED_TAIL ? "seeded" : null;
}
const LEECH_SEED_DRAIN_SEEDED_HP_TIMING = Object.freeze({ minimumFrames: 0, tailFrames: LEECH_SEED_DRAIN_SEEDED_TAIL } as const);
const LEECH_SEED_DRAIN_RECEIVER_HP_TIMING = Object.freeze({ minimumFrames: 0, tailFrames: HP_PRINT_TAIL_FRAMES } as const);
const STAT_TIMING = Object.freeze({ minimumFrames: 2 } as const);
const STATUS_TIMING = Object.freeze({ minimumFrames: 32 } as const);
/**
 * Cmd_updatestatusicon emits one controller request and waits for it
 * (battle_script_commands.c:7699-7730). Its player/opponent controller
 * handlers copy the healthbox status tile on that callback, then install the
 * ordinary completion callback (battle_controller_{player,opponent}.c:
 * 1712-1722 / 2755-2765). The display edge is therefore the receipt's own
 * one callback, independent of any skipped Scene-OFF status animation.
 */
const STATUS_ICON_TIMING = Object.freeze({ minimumFrames: 1 } as const);
/**
 * ISSUES #78: the mid-battle voluntary switch-in span. `Cmd_switchinanim`
 * (`reference/pokeemerald/data/battle_scripts_1.s:3122`) starts the
 * `CONTROLLER_SWITCHINANIM` send-out at frame 1140 of the staged OFF fixture
 * and its `waitstate` releases at ~1230 (`docs/mid-battle-switch-presentation-
 * ground-truth.md` §2) -- a 91-frame controller lifetime. The opponent's next
 * move message waits for the whole send-in (first glyph 1241), so the app's
 * `switch-in` command must hold ~91 frames while "Go! ...!" persists on the
 * box -- NOT the old 1-frame instant swap. The visible sub-phases (ball
 * throw 45f, ball-release emerge 12f, healthbox slide 23f) are modeled by
 * the renderer inside this span; the command duration covers the whole
 * cadence either way. With the app's 24-frame SWITCHINMON message + 1-frame
 * party-summary hide, the 91-frame span lands the opponent's move at the
 * source's 116-frame gap exactly.
 */
export const SWITCH_IN_SPAN_FRAMES = 91;
const SWITCH_IN_TIMING = Object.freeze({ minimumFrames: SWITCH_IN_SPAN_FRAMES } as const);
/**
 * ISSUES #78 slice 4: the 11-frame `waitstate` release + move-load hold
 * (`switchinanim`'s `waitstate` releases 1231-1238, the opponent's move is
 * loaded 1239-1240, and the "used" printstring dispatches at 1241 --
 * docs/mid-battle-switch-presentation-ground-truth.md §2). The send-in
 * sprite/healthbox stay settled on field through this hold, so the switch-in
 * command's duration carries it on top of the 91-frame controller span.
 */
export const SWITCH_IN_WAITSTATE_HOLD_FRAMES = 11;
/**
 * snd145 (ISSUES #146 remainder): a Scene ON opponent faint replacement that ends the turn. The ROM blanks the message box 10 frames after
 * the species' send-in tail (where a forced switch prints "dragged out!") and draws the action menu at +17 (dense Scene ON windows,
 * 5 / 5 species without a switch-in effect; docs/snd145-send-in-tail-live.md); production's next-command handoff shows 6 blank
 * frames, so the switch-in holds 11 more frames: menu exact, the blank one frame late.
 */
export const OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES = 11;
/**
 * snd145 (ISSUES #146 remainder): in Scene ON the opponent's send-in tail is species-keyed (the healthbox slide waits for the front
 * animation, the next printstring for the controller end; src/engine/switchInTail.ts), so its controller span is the species' whole
 * duration minus the shared waitstate hold. The player side keeps the calibrated 91-frame span (its message is cry-bound, not
 * modelled). offs152: Scene OFF skips the front animation (HITMARKER_NO_ANIMATIONS -> SKIP_FRONT_ANIM): the opponent's span is the
 * slide- or cry-bound Scene OFF tail (`sceneOffOpponentSwitchInDuration`, keyed by species and the incoming nickname's length).
 */
export function switchInTiming(
  battler: 0 | 1, species: number, sceneOn = true, nickname = "", forcedPlayer = false, personality = 0,
): BattleSwitchInTiming {
  // plr162 / snd182: a forced (Roar / Whirlwind) player send-in lasts its cry- or floor-bound tail, plus the back animation's wait in
  // Scene ON (src/engine/switchInTail.ts; `personality` supplies the nature that picks the back animation).
  if (battler === 0 && forcedPlayer) {
    const duration = sceneOn
      ? sceneOnPlayerForcedSwitchInDuration(species, personality)
      : sceneOffPlayerForcedSwitchInDuration(species);
    return Object.freeze({ minimumFrames: duration - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
  }
  if (battler === 0) return SWITCH_IN_TIMING;
  const duration = sceneOn ? opponentSwitchInDuration(species) : sceneOffOpponentSwitchInDuration(species, nickname);
  return Object.freeze({ minimumFrames: duration - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
}
/**
 * ISSUES #78 slice 4: the real `CONTROLLER_RETURNMONTOBALL` receipt's
 * 32-frame lifetime (`returnatktoball` -> `PlayerHandleReturnMonToBall` ->
 * `DoSwitchOutAnimation`, battle_controller_player.c:2227-2259). The outgoing
 * mon's switch-out animation (affine scale-up 256->736 over the span's
 * relative frames 14-24, sprite freed from ~25) is modeled by the switch-out
 * command's renderer.
 */
export const RETURN_TO_BALL_SPAN_FRAMES = 32;
const SWITCH_OUT_TIMING = Object.freeze({ minimumFrames: RETURN_TO_BALL_SPAN_FRAMES } as const);
/**
 * Scene ON forced switch-out after a Roar/Whirlwind body (docs/forced-switch-continuation.md §1, §6): `Cmd_returntoball`
 * passes skipAnim = TRUE, so `OpponentHandleReturnMonToBall`/`PlayerHandleReturnMonToBall` destroy the sprite and hide
 * the healthbox in one step (RAM: body end E -> E+4), and `switchinanim` starts the send-in 6 frames later (RAM E+10).
 * Both reach the framebuffer one OAM latch later (direct-mGBA frames: healthbox gone from E+5, ball from E+13 = el 2 of a
 * send-in starting at E+11; tools/integration/forcedSwitchContinuationCompare.ts). The body's final dense row is E, so
 * the hold covers E+1..E+4 and the recall receipt E+5..E+10.
 */
export const FORCED_RETURN_TO_BALL_HOLD_FRAMES = 4;
export const FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES = 6;
const FORCED_SWITCH_OUT_TIMING = Object.freeze({ minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES } as const);
/**
 * offs152 (ISSUES #146 items 4/5, docs/offs152-scene-off-send-in-tail.md §R0): Scene OFF reaches the same `Cmd_returntoball`
 * (skipAnim = TRUE, `battle_script_commands.c:5346-5353`) with no body: Roar / Whirlwind (`returntoball BS_TARGET`) and Baton Pass
 * (`returntoball BS_ATTACKER`, `battle_scripts_1.s:1706`) remove the sprite + healthbox in ONE row, returntoball row + 2 (off148 OFF
 * probes: Roar G+44 -> G+46, opponent Baton Pass G+43 -> G+45), so Scene OFF uses the forced hold (4) with the target at rest.
 * Roar's `switchinanim` follows 6 rows later (the Scene ON gap: send-in ball at removal + 8, G+54); Baton Pass prints
 * STRINGID_SWITCHINMON first (getswitchedmondata, switchindataupdate's 2-row wait, hpthresholds): first glyph G+50 = removal + 5.
 */
export const SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES = 5;
const SCENE_OFF_FORCED_SWITCH_OUT = Object.freeze({
  timing: FORCED_SWITCH_OUT_TIMING, skipAnimation: true as const, targetAtRest: true as const,
});
const TURN_END_TIMING = Object.freeze({ minimumFrames: 8 } as const);
/**
 * ISSUES #73 rung B correction (2026-08-04): the prior port (53, from
 * `battleScene.ts`'s `TURN17_TRAINER_SLIDE_SETTLE_DELAY` doc comment) had two
 * independent errors -- (1) it was never fit-verified against pixels, and
 * (2) even its own arithmetic was wrong: source `OpponentHandleTrainerSlide`
 * (`reference/pokeemerald/src/battle_controller_opponent.c:1385-1390`)
 * creates the trainer sprite at `x2=96` with `sSpeedX=-2`, and the shared
 * `SpriteCB_TrainerSlideIn` (`battle_gfx_sfx_util.c:396-409`) adds `sSpeedX`
 * per callback until `x2==0` -- that is 96/2=48 callbacks, not 53.
 *
 * Fresh oracle pixel evidence settles the question directly (not just the
 * source math): `docs/terminal-seam-loss-path-ground-truth.md`'s committed
 * twice-identical fixture (`tools/battle-lab/loss-terminal-explosion-
 * dusclops-off.json`) has the opponent-controller command dispatch the slide
 * at tick 2996 (`opponentControllerCommand` 6->8) and the trainer sprite's
 * on-screen bounding box stop moving at tick 3034 -- **38 ticks**, re-derived
 * this session via a dense per-tick re-probe (frame 2994-3059) of that same
 * fixture. The observed leading edge fits `offscreenX2 = 2*(38-age)` exactly
 * at every sampled tick from first visibility (age 13, x=239) through settle
 * (age 38, x=189) -- not merely close, bit-exact against 8 independent
 * sample points. The remaining ~10-tick gap between dispatch and the sprite's
 * first visible pixel (age 0-12) is invisible either way (still fully
 * off-screen under this formula), so it does not distinguish a literal `x2`
 * register replay from this observable-motion model; the model is pinned to
 * what pixels can actually prove.
 */
export const TRAINER_SLIDE_TIMING = Object.freeze({ minimumFrames: 38 } as const);
/**
 * The three terminal win/loss-text STRINGIDs are printed by
 * `BattleScript_FrontierTrainerBattleWon(_LoseTexts)`/
 * `BattleScript_LocalBattleLost(PrintTrainersWinText)`, each followed by a
 * real `PAUSE_UNTIL_PRESS`-gated wait for input (oracle-confirmed dismiss:
 * `docs/terminal-seam-loss-path-ground-truth.md` §2 frame ~3230, the same
 * "A" dismiss shape already modeled for `STRINGID_TARGETFAINTED`/
 * `STRINGID_ATTACKERFAINTED`).
 */
const TERMINAL_SEAM_BUTTON_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_PLAYERDEFEATEDTRAINER1",
  "STRINGID_TRAINER1LOSETEXT",
  "STRINGID_TRAINER1WINTEXT",
]);
/**
 * Only 2 of the 3 button ids above are wait-cursor-less -- this is NOT
 * uniform across `TERMINAL_SEAM_BUTTON_MESSAGE_IDS` (source-read for
 * ISSUES #73's LOSS-window cursor-gating step):
 *
 * `STRINGID_TRAINER1WINTEXT`/`STRINGID_TRAINER1LOSETEXT`'s own static
 * templates are bare placeholders with no literal pause code at all
 * (`reference/pokeemerald/src/battle_message.c:1424`
 * `sText_Trainer1WinText[] = _("{B_TRAINER1_WIN_TEXT}")`; `:55`
 * `sText_Trainer1LoseText[] = _("{B_TRAINER1_LOSE_TEXT}")`). Their wait
 * comes entirely from `BufferStringBattle`'s placeholder substitution
 * (`battle_message.c:2600-2748`): for exactly the 4
 * `B_TXT_TRAINER{1,2}_{WIN,LOSE}_TEXT` cases (`:2741-2748`), after copying
 * the resolved Easy Chat text it appends `EXT_CTRL_CODE_BEGIN` +
 * `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` -- an *extended* control code that
 * `text.c`'s render loop (`:1018-1022`) resolves to `RENDER_STATE_WAIT`,
 * serviced every tick by `TextPrinterWait` (`text.c:884-900`): waits for
 * `JOY_NEW(A_BUTTON|B_BUTTON)` and nothing else -- it never calls
 * `TextPrinterDrawDownArrow`.
 *
 * `STRINGID_PLAYERDEFEATEDTRAINER1` is different: its static template
 * (`battle_message.c:371` `sText_PlayerDefeatedLinkTrainerTrainer1[] =
 * _("Player defeated\n{B_TRAINER1_CLASS} {B_TRAINER1_NAME}!\p")`) ends in a
 * literal `\p` (`CHAR_PROMPT_CLEAR`, byte 0xFB per `charmap.txt:1088`,
 * *not* an extended code). `text.c`'s render loop resolves that byte
 * directly to `RENDER_STATE_CLEAR` (`:1102-1105`), serviced by
 * `TextPrinterWaitWithDownArrow` (`text.c:865-882`), which *does* call
 * `TextPrinterDrawDownArrow` every tick while waiting -- the exact
 * `sDownArrowYCoords`/8-tick-delay shape `CURSOR_Y_OFFSETS` in
 * `battleScene.ts` already ports. So the down-arrow/wait-cursor task is
 * genuinely spawned for this id; gating it off would be a regression, not a
 * fix. (This id is LOSS-window-inapplicable -- `BattleScript_LocalBattleLost`
 * never prints it, only `BattleScript_FrontierTrainerBattleWon` does -- so
 * it does not appear in this window's own compare, but the set membership
 * must still stay correct for the future WIN-side wiring, ISSUES #73.)
 *
 * `STRINGID_TRAINER2WINTEXT`/`STRINGID_TRAINER2LOSETEXT` share the identical
 * bare-placeholder-plus-`EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` shape (same
 * `BufferStringBattle` cases) but aren't modeled at all yet (no two-opponent
 * Factory battle support) -- not added here since there is no command site
 * to gate.
 */
const TERMINAL_SEAM_QUOTE_MESSAGE_IDS: ReadonlySet<string> = new Set([
  "STRINGID_TRAINER1LOSETEXT",
  "STRINGID_TRAINER1WINTEXT",
]);

/**
 * `{B_BUFF1}`'s real source for every stat-change message, oracle-confirmed
 * (`tools/battle-lab/swords-dance-cap-wontincrease-off.json`): `ChangeStatBuffs`'s
 * `PREPARE_STAT_BUFFER(gBattleTextBuff1, statId)` (battle_script_commands.c:6958)
 * copies `gStatNamesTable` (battle_message.c:425-443) -- "ATTACK"/"DEFENSE"/
 * "SPEED"/"SP. ATK"/"SP. DEF" capitalized, "accuracy"/"evasiveness" lowercase --
 * not `lastStatChange.stat`'s own internal lowercase-always enum string.
 */
const STAT_DISPLAY_NAME: Readonly<Record<string, string>> = Object.freeze({
  "attack": "ATTACK",
  "defense": "DEFENSE",
  "speed": "SPEED",
  "special-attack": "SP. ATK",
  "special-defense": "SP. DEF",
  "accuracy": "accuracy",
  "evasion": "evasiveness",
});

/**
 * The move's own target battler, for the several presentation ids
 * (ISSUES #70 batch 1) whose source template's only nickname placeholder is
 * {B_DEF_NAME_WITH_PREFIX} -- Cmd_resultmessage/Cmd_healthbarupdate print
 * these while rulesContext.selectorRoles.target (== the opposite singles
 * battler of the attacker) is still the current action's target, the same
 * relationship STRINGID_ITDOESNTAFFECT/STRINGID_PKMNSUBJECTEDTOTORMENT above
 * already rely on.
 */
function requireMoveDefender(lastMoveAttacker: 0 | 1 | null, context: string): 0 | 1 {
  if (lastMoveAttacker === null) {
    throw new Error(`battle resolution ${context} has no preceding used-move event`);
  }
  return lastMoveAttacker === 0 ? 1 : 0;
}

function requireMoveAttacker(lastMoveAttacker: 0 | 1 | null, context: string): 0 | 1 {
  if (lastMoveAttacker === null) {
    throw new Error(`battle resolution ${context} has no preceding used-move event`);
  }
  return lastMoveAttacker;
}

function nameWithPrefixResolver(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): () => string {
  const displayed = fieldBattler(field, battler);
  return () => resolveBattleNameWithPrefix({
    side: battler === 0 ? "player" : "opponent",
    isTrainerBattle: true,
    nickname: displayed.name,
  });
}

function singlesBattler(battler: number, context: string): 0 | 1 {
  if (battler === 0 || battler === 1) return battler;
  throw new Error(`${context} cannot present non-singles battler ${battler}`);
}

function fieldBattler(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): BattleCommandFieldBattler {
  return battler === 0 ? field.player : field.opponent;
}

function factoryItemDisplayName(itemId: number): string {
  const name = FACTORY_ITEM_NAME_BY_ID.get(itemId);
  if (name === undefined) {
    throw new Error(`battle resolution cannot resolve Factory held item ${itemId}`);
  }
  return name;
}

/**
 * ISSUES #72 scout §2.2 option (b): the 4 still-unresolved
 * `printselectionstring` STRINGIDs (`docs/selection-rejection-subsystem-scout.md`
 * §1.5) -- `battleStringResolver`'s completeness guard has zero coverage for
 * these today, because no `messageLines` caller can ever reach them: this
 * engine's `submitBattleDecision` pre-filters every illegal move slot out of
 * `legalDecisions` before it could ever be selected and rejected
 * (`battleDecisionBoundary.ts:678-680`). Exported so the advisory
 * `describeIllegalMoveSelection` query (`battleScriptActionAdmission.ts`,
 * surfaced as `rejectionReasonBySlot` in `battleCommandPresentation.ts`) can
 * render source-exact flavor text for a greyed-out slot directly, without
 * threading a synthetic kernel event through the whole resolution pipeline.
 * `STRINGID_PKMNCANTUSEMOVESEALED` (Imprison) is deliberately absent -- DEAD
 * carrier, same RALTS-below-floor gate as its AtkCanceler-side sibling
 * (ISSUES #72) -- the completeness guard below stays fatal for it precisely
 * because it should never actually be reached (user decision 2026-08-03: no
 * fallbacks).
 */
export function resolveMoveSelectionRejectionMessageLines(
  rejection: BattleScriptSelectionRejection,
  field: BattleResolutionDisplayedField,
): readonly string[] {
  const { stringId, battler, currentMove, heldItem } = rejection;
  if (stringId === "STRINGID_NOPPLEFT") {
    // sText_NoPPLeft (battle_message.c:360): no placeholders at all.
    return resolveBattleStringLines(stringId);
  }
  if (stringId === "STRINGID_PKMNCANTUSEMOVETORMENT") {
    // sText_PkmnCantUseMoveTorment (battle_message.c:260): only
    // {B_ACTIVE_NAME_WITH_PREFIX} -- the rejected move never appears in the
    // message text, unlike Disabled/Taunt's sibling branches.
    return resolveBattleStringLines(stringId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(
        field,
        singlesBattler(battler, `${stringId} selection rejection`),
      ),
    });
  }
  if (stringId === "STRINGID_ITEMALLOWSONLYYMOVE") {
    // sText_ItemAllowsOnlyYMove (battle_message.c:496): {B_LAST_ITEM} is the
    // holder's own Choice Band; {B_CURRENT_MOVE} is gCurrentMove, which
    // TrySetCantSelectMoveBattleScript (:1057) points at the still-allowed
    // *choicedMove -- describeIllegalMoveSelection already threads that
    // through `currentMove` for this cause.
    return resolveBattleStringLines(stringId, {
      B_LAST_ITEM: () => factoryItemDisplayName(heldItem),
      B_CURRENT_MOVE: () => resolveMoveName(currentMove),
    });
  }
  if (
    stringId === "STRINGID_PKMNCANTUSEMOVETAUNT"
    || stringId === "STRINGID_PKMNMOVEISDISABLED"
  ) {
    // Soak signature 4 (docs/soak-crash-catalog.md §4) -- the two live
    // rejection ids the scout doc's §1.5 named as still-unresolved.
    // sText_PkmnCantUseMoveTaunt (battle_message.c:261) /
    // sText_PkmnMoveIsDisabled (battle_message.c:259):
    // {B_ACTIVE_NAME_WITH_PREFIX} is the rejected battler;
    // {B_CURRENT_MOVE} is gCurrentMove, which TrySetCantSelectMoveBattleScript
    // sets to the rejected move itself for both causes (battle_util.c:1016
    // Taunt, :986 Disabled) -- describeIllegalMoveSelection threads that
    // through `currentMove`.
    return resolveBattleStringLines(stringId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(
        field,
        singlesBattler(battler, `${stringId} selection rejection`),
      ),
      B_CURRENT_MOVE: () => resolveMoveName(currentMove),
    });
  }
  throw new Error(
    `battle resolution ${stringId} has no move-selection-rejection message resolver`,
  );
}

/**
 * `AreAllMovesUnusable`'s own selection script (`battle_util.c:1125-1140`,
 * `BattleScript_NoMovesLeft`) -- a different, battler-level cause from
 * `describeIllegalMoveSelection`'s six (scout §1.2b), sharing only the
 * `printselectionstring`/STRINGID-blind-spot shape. Source gates this
 * *before* the move menu is shown at all, so it has no per-slot rejection
 * object to carry -- just the battler whose turn it is.
 */
export function resolveNoMovesLeftMessageLines(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
): readonly string[] {
  return resolveBattleStringLines("STRINGID_PKMNHASNOMOVESLEFT", {
    B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
  });
}

/**
 * `resolveBattleStringLines`-style segment splice for `battleIntroStrings.ts`'s
 * hand-mapped ids 0/1/2/5 (ISSUES #70's `STRINGID_INTROSENDOUT` extractor-gap
 * fix) -- those ids sit below the extracted table's own scoped range, so they
 * are never in `resolveBattleStringLines`'s `BY_SYMBOL` map. `battleIntroStrings.ts`'s
 * own segment shape is a strict subset of the extracted table's (text/
 * placeholder/linebreak only, no `{CONTROL ...}` segments), so this mirrors
 * `resolveBattleStringLines`'s walk exactly for that subset.
 */
function resolveIntroStringEntry(
  entry: BattleIntroStringEntry,
  resolvers: Record<string, () => string>,
): readonly string[] {
  const lines: string[] = [];
  let current = "";
  for (const segment of entry.segments) {
    if (segment.type === "text") {
      current += segment.value;
    } else if (segment.type === "placeholder") {
      const resolve = resolvers[segment.token];
      if (!resolve) {
        throw new Error(
          `battle resolution ${entry.symbol} references placeholder {${segment.token}} with no resolver supplied`,
        );
      }
      current += resolve();
    } else {
      lines.push(current);
      current = "";
    }
  }
  if (current !== "") lines.push(current);
  return Object.freeze(lines);
}

function findIntroStringEntry(
  id: BattleIntroStringEntry["id"],
  cSymbol: string,
): BattleIntroStringEntry {
  const entry = BATTLE_INTRO_STRINGS.find((e) => e.id === id && e.source.cSymbol === cSymbol);
  if (!entry) throw new Error(`battle resolution: no battleIntroStrings entry for id ${id} / ${cSymbol}`);
  return entry;
}

function sourceLabelOf(event: BattleKernelSemanticEvent): string {
  if (!event.provenance) {
    throw new Error(
      `battle resolution event ${event.sequence}/${event.payload.kind} has no interpreter provenance`,
    );
  }
  return event.provenance.sourceLabel;
}

function instructionExecutionOf(event: BattleKernelSemanticEvent): number {
  sourceLabelOf(event);
  return event.provenance!.instructionExecution;
}

/**
 * The `Cmd_hitanimation` receipt that pairs with this attack animation.
 * Source pairs the two inside ONE script execution: `attackanimation` /
 * `waitanimation` / `effectivenesssound` / `hitanimation BS_TARGET` are four
 * consecutive instructions of `BattleScript_HitFromAtkAnimation`
 * (`data/battle_scripts_1.s:253-258`), and Scene OFF only substitutes the
 * first with `BattleScript_Pausex20`.
 *
 * So the scan must stop at that execution's end. A non-damaging move has an
 * attack animation and NO hit animation at all (`BattleScript_
 * MoveWeatherChange` -- Hail, Rain Dance), while a LATER execution in the
 * same turn receipt can own a wholly unrelated `hitanimation`: the
 * end-of-turn `BattleScript_DamagingWeatherLoop` hail/sandstorm tick is
 * exactly that. `instructionExecution` counts within one execution and
 * restarts at the next (`instructionsExecuted: 0`), so a drop in it IS the
 * execution boundary. Pairing across it claimed a hit that had "executed"
 * before its own move-use receipt -- ISSUES #95's fatal negative span.
 */
function nextHitAnimation(
  events: readonly BattleKernelSemanticEvent[],
  moveIndex: number,
): BattleKernelSemanticEvent | null {
  // Staged/synthetic fixtures without interpreter provenance keep the plain
  // forward scan; the caller's own ordering invariant stays their guard.
  let execution = events[moveIndex]!.provenance?.instructionExecution ?? null;
  for (let index = moveIndex + 1; index < events.length; index += 1) {
    const candidate = events[index]!;
    const candidateExecution = candidate.provenance?.instructionExecution ?? null;
    if (execution !== null && candidateExecution !== null) {
      if (candidateExecution < execution) break;
      execution = candidateExecution;
    }
    if (
      candidate.payload.kind === "animation"
      && candidate.payload.animationId === "HIT_ANIMATION"
    ) return candidate;
    if (
      candidate.payload.kind === "animation"
      && (
        candidate.payload.animationId === "MOVE_ANIMATION"
        || candidate.payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
      )
    ) break;
  }
  return null;
}

/**
 * Compatibility only for staged/synthetic message receipts that intentionally
 * lack the production Cmd_printstring action snapshot. Real full-turn
 * STRINGID_USEDMOVE receipts never need to discover a later PP controller
 * event, which is absent for a locked continuation.
 */
function ppEventAfter(
  events: readonly BattleKernelSemanticEvent[],
  messageIndex: number,
): Extract<BattleScriptSemanticEventPayload, { kind: "set-battler-pp-data" }> {
  for (let index = messageIndex + 1; index < events.length; index += 1) {
    const payload = events[index]!.payload;
    if (payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE") break;
    if (payload.kind === "set-battler-pp-data") return payload;
  }
  throw new Error("battle resolution used-move event has no same-action PP event");
}

function messageLines(
  event: BattleKernelSemanticEvent,
  eventIndex: number,
  events: readonly BattleKernelSemanticEvent[],
  field: BattleResolutionDisplayedField,
  switchInBattler: 0 | 1 | null,
  /** The switch-in's own source-boundary display snapshot, non-null exactly when `switchInBattler` is. */
  switchInIncoming: BattleCommandFieldBattler | null,
  lastStatChange: Extract<
    BattleScriptSemanticEventPayload,
    { kind: "stat-stage-change" }
  > | null,
  lastFaintBattler: 0 | 1 | null,
  pendingStatusMessageBattler: 0 | 1 | null,
  lastMoveAttacker: 0 | 1 | null,
  pendingHeldItemEffectBattler: 0 | 1 | null,
  heldItems: readonly [number, number],
  actionSnapshot: BattleScriptActionMessageSnapshot | null,
  opponentTrainer: BattleResolutionOpponentTrainer | null,
): readonly string[] {
  if (event.payload.kind !== "message") {
    throw new Error("battle resolution message resolver received a non-message event");
  }
  const { messageId } = event.payload;
  // Keep this scalar outside resolver callbacks: TypeScript deliberately
  // drops a discriminated-union narrowing through a captured property read.
  const lastItemAtPrint = event.payload.lastItem;
  // BattleStringExpandPlaceholders reads these two name selectors from
  // independent globals at the print receipt: gEffectBattler and
  // gBattleScripting.battler (battle_message.c:2444-2452). Build the shared
  // overlay from the extracted source/charmap template instead of inferring a
  // role from a nearby animation, status write, or a particular STRINGID.
  // Branches below still own their extra substitution data; the fallback uses
  // this overlay for every sibling whose only missing information is one of
  // these source selectors.
  const sourceSelectorResolvers: Record<string, () => string> = {};
  if (
    battleStringReferencesToken(messageId, "B_EFF_NAME_WITH_PREFIX")
    && event.payload.effectBattler !== undefined
  ) {
    const effectBattler = singlesBattler(
      event.payload.effectBattler,
      `${messageId} effect battler`,
    );
    sourceSelectorResolvers.B_EFF_NAME_WITH_PREFIX = nameWithPrefixResolver(field, effectBattler);
  }
  if (
    battleStringReferencesToken(messageId, "B_SCR_ACTIVE_NAME_WITH_PREFIX")
    && event.payload.scriptingBattler !== undefined
  ) {
    const scriptingBattler = singlesBattler(
      event.payload.scriptingBattler,
      `${messageId} scripting battler`,
    );
    sourceSelectorResolvers.B_SCR_ACTIVE_NAME_WITH_PREFIX = nameWithPrefixResolver(field, scriptingBattler);
  }
  const itemNameAtPrint = (fallbackBattler: 0 | 1): string =>
    factoryItemDisplayName(lastItemAtPrint ?? heldItems[fallbackBattler]);
  if (messageId === "STRINGID_USEDMOVE") {
    const pp = actionSnapshot === null ? ppEventAfter(events, eventIndex) : null;
    const battler = actionSnapshot === null
      ? singlesBattler(pp!.battler, "used-move message")
      : singlesBattler(actionSnapshot.attacker, "used-move action snapshot");
    const displayed = fieldBattler(field, battler);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      // Cmd_attackstring/Cmd_printstring sees gCurrentMove, not the move in
      // the PP-owning slot. This distinction is observable for Assist-called
      // FLY: the source slot is Assist, while the locked continuation prints
      // FLY and emits no second PP update.
      B_BUFF2: () => resolveMoveNameExclaim(
        actionSnapshot?.currentMove ?? displayed.moveIds[pp!.movePosition]!,
      ),
    });
  }
  if (messageId === "STRINGID_ITDOESNTAFFECT") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution no-effect message has no preceding used-move event",
      );
    }
    const defender = lastMoveAttacker === 0 ? 1 : 0;
    const displayed = fieldBattler(field, defender);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: defender === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_ATTACKMISSED") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution attack-missed message has no preceding used-move event",
      );
    }
    const displayed = fieldBattler(field, lastMoveAttacker);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastMoveAttacker === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_PKMNSUBJECTEDTOTORMENT") {
    if (lastMoveAttacker === null) {
      throw new Error(
        "battle resolution subjected-to-torment message has no preceding used-move event",
      );
    }
    const target = lastMoveAttacker === 0 ? 1 : 0;
    const displayed = fieldBattler(field, target);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: target === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  // ISSUES #70 batch 1 (docs/issue70-stringid-reachability.md, ranked rows
  // 1-8): the STRINGIDs below hit battleStringResolver's completeness guard
  // whenever a currently-wired opcode reached them, because the generic
  // fallback (below) never supplied their placeholders.
  if (messageId === "STRINGID_PKMNENERGYDRAINED") {
    // gAbsorbDrainStringIds[0] (battle_message.c:441-444), Cmd_printfromtable
    // -- Absorb/Mega Drain/Giga Drain landing on a non-Liquid-Ooze target.
    const defender = requireMoveDefender(lastMoveAttacker, "energy-drained message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNPROTECTEDITSELF") {
    // MISS_STRING_ID_BY_TYPE[B_MSG_PROTECTED], Cmd_resultmessage -- any
    // attack a Protect/Detect use blocks.
    const defender = requireMoveDefender(lastMoveAttacker, "protected-itself message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNAVOIDEDATTACK") {
    // MISS_STRING_ID_BY_TYPE[B_MSG_AVOIDED_ATK], Cmd_resultmessage --
    // Wonder-Guard-style double-avoid tail (battleScriptHitChainOpcode.ts:1224).
    const defender = requireMoveDefender(lastMoveAttacker, "avoided-attack message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNFELLFORTAUNT") {
    // BattleScript_EffectTaunt (reference/pokeemerald/data/battle_scripts_1.s:
    // 2308-2318): Cmd_settaunt operates on gBattlerTarget directly (no
    // gBattlerTarget reassignment precedes it, unlike Helping Hand), so
    // {B_DEF_NAME_WITH_PREFIX} is the taunted battler -- the move's own
    // (opposite-of-attacker) target, same relationship as
    // STRINGID_PKMNSUBJECTEDTOTORMENT/STRINGID_PKMNAVOIDEDATTACK above.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-for-taunt message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCANTUSEMOVETAUNT") {
    // BattleScript_MoveUsedIsTaunted (battle_scripts_1.s:3580-3583), reached
    // from advanceBattleScriptAttackCancelerTaunted's CANCELER_TAUNTED phase
    // (battleScriptActionAdmission.ts) *instead of* STRINGID_USEDMOVE for a
    // taunted battler's own blocked status-move action -- lastMoveAttacker
    // (tied to the last completed used-move message) is the wrong battler
    // here, sourced from the frozen action snapshot's own attacker/currentMove
    // like STRINGID_PKMNRAISEDDEF's {B_CURRENT_MOVE} above. {B_ACTIVE_NAME_
    // WITH_PREFIX} reads gActiveBattler == gBattlerAttacker at this print
    // (battle_message.c:2447), the taunted battler picking the blocked move.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId.toLowerCase()} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  // ISSUES #72 batch 1 (docs/issue72-reachability-triage.md, ranked rows
  // 1-13): the same Taunt-pair idiom extended to the highest-carrier-weight
  // REACHABLE printstring gaps -- the "already status" family, a few
  // standalone defender-only ids, and the ability-blocks-the-move's-own-
  // effect cluster.
  if (
    messageId === "STRINGID_PKMNALREADYASLEEP"
    || messageId === "STRINGID_PKMNALREADYCONFUSED"
    || messageId === "STRINGID_PKMNALREADYHASBURN"
    || messageId === "STRINGID_PKMNALREADYPOISONED"
    || messageId === "STRINGID_PKMNISALREADYPARALYZED"
  ) {
    // BattleScript_AlreadyAsleep/AlreadyConfused(+TeeterDance sibling)/
    // AlreadyBurned/AlreadyPoisoned/AlreadyParalyzed: each of EffectSleep/
    // EffectConfuse/EffectWillOWisp/EffectToxic/EffectParalyze's own
    // `jumpifstatus(2) BS_TARGET, STATUS1/2_X, BattleScript_AlreadyX` --
    // purely generic jumpifstatus+printstring opcodes (zero TS references to
    // any of these labels), so BS_TARGET is still the move's own target,
    // same relationship as STRINGID_PKMNFELLFORTAUNT above.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNWASCONFUSED") {
    // BattleScript_MoveEffectConfusion (battle_scripts_1.s:3932-3936), the
    // success tail of every direct EFFECT_CONFUSE move (Confuse Ray/Swagger/
    // Flatter/Teeter Dance): `setmoveeffect MOVE_EFFECT_CONFUSION` +
    // `seteffectprimary` then print this. {B_EFF_NAME_WITH_PREFIX} reads
    // gEffectBattler (charmap.txt:368), which applySetMoveEffect set to the
    // move's own target (battleScriptHitChainOpcode.ts:2841-2848,
    // applyConfusionMoveEffect) -- so the message event carries that battler
    // via prepareMessage's scoped effectBattler attach
    // (factoryBattleScriptFullTurnDecision.ts). Unlike the status1 infliction
    // quartet, confusion is a STATUS2 write with no set-battler-status-data
    // receipt, so the generic fallback's pendingStatusMessageBattler bridge
    // never fires -- this branch is the only route to resolve it.
    if (event.payload.effectBattler === undefined) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler substitution`);
    }
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    return resolveBattleStringLines(messageId, {
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
    });
  }
  if (
    messageId === "STRINGID_PKMNISCONFUSED"
    || messageId === "STRINGID_PKMNHEALEDCONFUSION"
    || messageId === "STRINGID_PKMNFATIGUECONFUSION"
  ) {
    // BattleScript_MoveUsedIsConfused / MoveUsedIsConfusedNoMore
    // (battle_scripts_1.s:3796-3822, the CANCELER_CONFUSED_ACTION_CHECK
    // admission handoffs) and BattleScript_ThrashConfuses (:3790-3794, the
    // end-turn Thrash fatigue infliction). Each prints {B_ATK_NAME_WITH_PREFIX}
    // reading gBattlerAttacker -- the confused battler trying to act / just
    // snapped out / the thrashing battler -- which the frozen action
    // snapshot's own attacker is (the acting battler owns the admission; the
    // end-turn tick reassigns the attacker role per tick battler,
    // battleEndTurnOrchestration.ts's enterTickBattlerContext).
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId.toLowerCase()} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
    });
  }
  if (messageId === "STRINGID_PKMNWASDEFROSTED") {
    // executeDefrost (battleScriptMoveEndControllers.ts:133-168): a special
    // Fire-type hit thawing its own (still-current) target.
    const defender = requireMoveDefender(lastMoveAttacker, "defrosted message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNWASDEFROSTEDBY") {
    // BattleScript_MoveUsedUnfroze (data/battle_scripts_1.s:3761-3765):
    // Cmd_attackcanceler's own frozen+EFFECT_THAW_HIT branch
    // (battleScriptActionAdmission.ts:3790-3850) hands off here -- before
    // attackstring ever runs -- when the attacker itself is frozen and
    // self-thaws by using a Thaw Hit move (Flame Wheel/Sacred Fire); distinct
    // from STRINGID_PKMNWASDEFROSTED above, which is the *target* thawed by
    // an ordinary Fire-type hit. gGotDefrostedStringIds' sibling row,
    // STRINGID_PKMNWASDEFROSTED2 (the plain 20%-roll natural thaw, no move
    // named), needs no dedicated case: its only placeholder,
    // {B_ATK_NAME_WITH_PREFIX}, is already supplied correctly by this
    // function's generic tail fallback below, sourced from the same
    // actionSnapshot-derived `lastMoveAttacker`.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const attacker = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNFELLINLOVE") {
    // BattleScript_EffectAttract's own success tail, right after
    // Cmd_tryinfatuating's success branch (battleScriptTryinfatuatingOpcode.ts)
    // leaves gBattlerTarget unchanged -- the attracted battler.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-in-love message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNPREVENTSSTATLOSSWITH") {
    // BattleScript_AbilityNoStatLoss (battleScriptStatBuffs.ts:265-271,
    // Clear Body/White Smoke) -- blockedMessage freezes scriptingBattler to
    // the battler about to lose the stat before the call-explicit transfer,
    // same shape as the STRINGID_PKMNPOISONEDBY family's scriptingBattler
    // read above. {B_SCR_ACTIVE_ABILITY} is engine-supplied via
    // prepareMessage (factoryBattleScriptFullTurnDecision.ts).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (
    messageId === "STRINGID_PKMNSXCUREDITSYPROBLEM"
    || messageId === "STRINGID_PKMNSXCUREDYPROBLEM"
  ) {
    // BattleScript_AbilityCuredStatus, MOVEEND_IMMUNITY_ABILITIES's quiet
    // scan (battleScriptMoveEndOpcode.ts:650-709) -- scriptingBattler is the
    // just-cured battler; {B_BUFF1} is the cured status's own display name
    // (battleTextBuff1Status, same source STRINGID_PKMNSITEMCUREDPROBLEM's
    // {B_BUFF1} above reads), engine-supplied alongside {B_SCR_ACTIVE_ABILITY}.
    // ISSUES #72 batch 6: STRINGID_PKMNSXCUREDYPROBLEM (Shed Skin's own
    // end-turn tick, runShedSkinTick) shares this identical template text and
    // substitution shape byte-for-byte.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/status substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    const statusName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_BUFF1: () => statusName,
    });
  }
  if (
    messageId === "STRINGID_PKMNPREVENTSCONFUSIONWITH"
    || messageId === "STRINGID_PKMNPREVENTSROMANCEWITH"
  ) {
    // BattleScript_OwnTempoPrevents/ObliviousPreventsAttraction -- both read
    // the ability off the move's own (still-current) target role, so
    // {B_DEF_ABILITY} is engine-supplied via prepareMessage keyed on
    // rules.selectorRoles.target, same battler requireMoveDefender resolves.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  // ISSUES #72 batch 2 (docs/issue72-reachability-triage.md, ranked rows
  // 14-25 starting from STRINGID_PKMNSXWOREOFF): the Taunt-pair idiom
  // continued -- EFFECT_ROAR's Ingrain/Suction Cups pair, the trainer-battle
  // force-out tail, the Intimidate switch-in loop, Damp/Volt Absorb/Water
  // Absorb/Inner Focus's ability-blocks-the-move's-own-effect shapes, Keen
  // Eye/Hyper Cutter's specific-stat-loss block, and Reflect/Light Screen/
  // Mist's end-of-turn wear-off.
  if (messageId === "STRINGID_PKMNANCHOREDITSELF") {
    // BattleScript_PrintMonIsRooted: EffectRoar's own `jumpifstatus3
    // BS_TARGET, STATUS3_ROOTED` -- a purely generic opcode (zero TS
    // references), so BS_TARGET is still the move's own target.
    const defender = requireMoveDefender(lastMoveAttacker, "anchored-itself message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNANCHORSITSELFWITH") {
    // BattleScript_AbilityPreventsPhasingOut: EffectRoar's own `jumpifability
    // BS_TARGET, ABILITY_SUCTION_CUPS` -- same purely generic shape as
    // ANCHOREDITSELF above, plus the ability substitution engine-supplied
    // via prepareMessage keyed on rules.selectorRoles.target.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "anchors-itself-with message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNWASDRAGGEDOUT") {
    // BattleScript_TrainerBattleForceOut's unconditional printstring, reached
    // from EffectRoar's forcerandomswitch success tail -- the move's own
    // (still-current) target, the battler that got switched out.
    const defender = requireMoveDefender(lastMoveAttacker, "dragged-out message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCUTSATTACKWITH") {
    // BattleScript_IntimidateActivatesLoop: scriptingBattler is the
    // switching-in Intimidate holder (frozen before the loop starts,
    // factoryBattleStart.ts/battleScriptFaintedActionsOrchestration.ts);
    // targetBattler is the loop's own BS_TARGET, cycled per opposing battler
    // by trygetintimidatetarget -- NOT the generic requireMoveDefender
    // shape, since this isn't a move's own target relationship.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.targetBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/target-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const targetBattler = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, targetBattler),
    });
  }
  if (messageId === "STRINGID_PREVENTEDFROMWORKING") {
    // BattleScript_IntimidatePrevented: BS_TARGET at this print is whichever
    // battler's Clear Body/Hyper Cutter/White Smoke just blocked the loop's
    // current Intimidate application; scriptingBattler is still the
    // Intimidate holder. {B_BUFF1} is fixed -- this label is only ever
    // reached from the Intimidate loop.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.targetBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/target-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const targetBattler = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, targetBattler),
      B_DEF_ABILITY: () => ability,
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: () => "INTIMIDATE",
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSFLINCHING") {
    // BattleScript_FlinchPrevention: applyFlinchMoveEffect's own
    // effectBattler param (Fake Out's real target for the certain-flinch,
    // non-affectsUser case) is applySetMoveEffect's selectorRoles.effectBattler
    // write, same field the ability-prevention family above already reads.
    if (event.payload.effectBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler/ability substitution`);
    }
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
      B_EFF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSYLOSS") {
    // BattleScript_AbilityNoSpecificStatLoss: ChangeStatBuffs's blockedMessage
    // freezes scriptingBattler to the battler about to lose the stat (Keen
    // Eye/Hyper Cutter's own holder), same shape STRINGID_PKMNPREVENTSSTATLOSSWITH
    // (batch 1) already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/stat substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    const statName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_BUFF1: () => statName,
    });
  }
  if (messageId === "STRINGID_PKMNPREVENTSUSAGE") {
    // BattleScript_DampStopsExplosion: Cmd_tryexplosion re-points
    // selectorRoles.target to the Damp holder before jumping here. That holder
    // can be the attacker itself, so its print receipt must not infer the
    // ordinary opposing defender. {B_CURRENT_MOVE} is the actionSnapshot's
    // own currentMove, same idiom STRINGID_PKMNCANTUSEMOVETAUNT uses.
    if (
      actionSnapshot === null
      || event.payload.targetBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/target-battler/ability substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "prevents-usage message");
    const dampBattler = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, dampBattler),
      B_DEF_ABILITY: () => ability,
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNRESTOREDHPUSING") {
    // BattleScript_MoveHPDrain: Volt Absorb/Water Absorb below-full-HP branch
    // -- selectorRoles.target unchanged from the move's own real target.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "restored-hp message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXMADEYUSELESS") {
    // BattleScript_MonMadeMoveUseless: same Volt Absorb/Water Absorb branch
    // at full HP; {B_CURRENT_MOVE} is the actionSnapshot's own currentMove.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "made-useless message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNSXWOREOFF") {
    // BattleScript_SideStatusWoreOff: runTickScript's own enterTickBattlerContext
    // sets selectorRoles.attacker to the affected side's own representative
    // battler (reflectBattlerId/lightscreenBattlerId/mistBattlerId), matching
    // real source's `gActiveBattler = gBattlerAttacker = gSideTimers[side].*BattlerId`
    // (battle_util.c:1224/1256/1276) -- {B_ATK_PREFIX1} is that battler's own
    // side ("Ally"/"Foe", battle_message.c:2649-2653), not a nickname.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX1: () => (battler === 0 ? "Ally" : "Foe"),
      B_BUFF1: () => moveName,
    });
  }
  // ISSUES #72 batch 4 (docs/issue72-reachability-triage.md): the plain-idiom
  // tail starting at STRINGID_PKMNLAIDCURSE.
  if (messageId === "STRINGID_PKMNLAIDCURSE") {
    // BattleScript_DoGhostCurse: a Ghost-type Curse always targets the
    // opponent (MOVE_TARGET_SELECTED), so gBattlerAttacker != gBattlerTarget
    // and the label's own jumpifbytenotequal skips getmovetarget -- the
    // move's own (still-current) attacker/target roles are unchanged.
    const attacker = requireMoveAttacker(lastMoveAttacker, "laid-curse message");
    const defender = requireMoveDefender(lastMoveAttacker, "laid-curse message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNCOPIEDSTATCHANGES") {
    // BattleScript_EffectPsychUp: Cmd_copyfoestats reads/writes the move's own
    // (still-current) attacker/target roles unconditionally -- zero TS
    // references to this label (a purely generic printstring), same shape as
    // STRINGID_PKMNPREVENTSUSAGE's attacker+defender pair.
    const attacker = requireMoveAttacker(lastMoveAttacker, "copied-stat-changes message");
    const defender = requireMoveDefender(lastMoveAttacker, "copied-stat-changes message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNWASMADEDROWSY") {
    // BattleScript_EffectYawn's own unconditional success tail (after the
    // Insomnia/Vital Spirit/Safeguard/accuracy/jumpifcantmakeasleep gates all
    // pass) prints against the move's own (still-current) attacker/target
    // roles -- no role-changing opcode runs between setyawn and this print.
    const attacker = requireMoveAttacker(lastMoveAttacker, "made-drowsy message");
    const defender = requireMoveDefender(lastMoveAttacker, "made-drowsy message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNSXBLOCKSY") {
    // BattleScript_SoundproofProtected: the attack-canceler's own moves-block
    // Soundproof check (battleScriptAbilityMovesBlock.ts) reads
    // selectorRoles.target without reassigning it -- the move's own
    // (still-current) target is the Soundproof holder; {B_CURRENT_MOVE} is
    // the actionSnapshot's own currentMove, same idiom
    // STRINGID_PKMNSXMADEYUSELESS uses.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "blocks-move message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  // ISSUES #72 batch 5 (docs/issue72-reachability-triage.md): the
  // plain-idiom tail continued from STRINGID_PKMNFREEDFROM.
  if (messageId === "STRINGID_PKMNFREEDFROM") {
    // BattleScript_WrapEnds: runWrapTick's own release branch
    // (WRAP_ENDS_LABEL, battleEndTurnOrchestration.ts), sibling of
    // STRINGID_PKMNHURTBY's WRAP_TURN_DMG_LABEL branch -- same
    // enterTickBattlerContext reassignment, same wrappedMove substitution.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (messageId === "STRINGID_PKMNGOTFREE") {
    // BattleScript_WrapFree: Cmd_rapidspinfree's own Wrap branch
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:495-526) -- the Rapid Spin
    // user's attacker role is never reassigned (only target/scriptingBattler
    // are, and both land on the same battler as requireMoveDefender in this
    // engine's singles-only scope), so {B_ATK_NAME_WITH_PREFIX} is the freed
    // battler and {B_DEF_NAME_WITH_PREFIX} is the wrap's original caster.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "got-free message");
    const defender = requireMoveDefender(lastMoveAttacker, "got-free message");
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (
    messageId === "STRINGID_PKMNDREAMEATEN"
    || messageId === "STRINGID_PKMNWASNTAFFECTED"
    || messageId === "STRINGID_PKMNGOTENCORE"
    || messageId === "STRINGID_TARGETCANTESCAPENOW"
  ) {
    // BattleScript_DreamEaterWorked/WasntAffected (EffectDreamEater's own
    // jumpifstatus-positive/negative branches), BattleScript_EffectEncore,
    // BattleScript_EffectMeanLook (Mean Look/Spider Web/Block share this
    // label) -- all zero-TS-reference move-effect entry scripts, so BS_TARGET
    // is still the move's own (still-current) target.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNIDENTIFIED") {
    // BattleScript_EffectForesight: another zero-TS-reference move-effect
    // entry script, attacker/target both still the move's own unchanged
    // roles.
    const attacker = requireMoveAttacker(lastMoveAttacker, "identified message");
    const defender = requireMoveDefender(lastMoveAttacker, "identified message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNTOOKAIM") {
    // BattleScript_EffectLockOn (data/battle_scripts_1.s:1286-1297,
    // EFFECT_LOCK_ON/Lock-On/Mind Reader): attackcanceler + accuracycheck +
    // setalwayshitflag (Cmd_setalwayshitflag is ported --
    // battleScriptSetalwayshitflagOpcode.ts) all run before this printstring,
    // none of which reassign gBattlerAttacker/gBattlerTarget -- same
    // zero-TS-reference-outside-AI-scoring, unchanged-roles shape as
    // STRINGID_PKMNIDENTIFIED above.
    const attacker = requireMoveAttacker(lastMoveAttacker, "took-aim message");
    const defender = requireMoveDefender(lastMoveAttacker, "took-aim message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNSXINFATUATEDY"
    || messageId === "STRINGID_PKMNHURTSWITH"
    || messageId === "STRINGID_PKMNCOPIEDFOE"
  ) {
    // Cute Charm/Rough Skin (executeOnDamageAbilities, battleScriptMoveEndOpcode.ts:
    // 507-521,562-586) and Role Play (a zero-TS-reference move-effect entry
    // script) all read the ability holder off the move's own unchanged
    // target -- same battler requireMoveDefender resolves, {B_DEF_ABILITY}
    // engine-supplied via prepareMessage the same way STRINGID_PKMNRESTOREDHPUSING's
    // family already is.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNKNOCKEDOFF") {
    // MOVE_EFFECT_KNOCK_OFF handler (battleScriptHitChainOpcode.ts:3198-3239):
    // effectBattler === target here (Knock Off is not an affects-user
    // effect), and neither selectorRoles.attacker/target is ever reassigned
    // -- the item is cleared from rules state before the script runs, but
    // {B_LAST_ITEM} reads the already-owned `heldItems` snapshot, which still
    // holds the pre-removal name at this same print (the typed removeitem
    // controller receipt that would advance it comes later).
    const attacker = requireMoveAttacker(lastMoveAttacker, "knocked-off message");
    const defender = requireMoveDefender(lastMoveAttacker, "knocked-off message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => itemNameAtPrint(defender),
    });
  }
  if (messageId === "STRINGID_PKMNSXMADEITINEFFECTIVE") {
    // BattleScript_PrintAbilityMadeIneffective: reached by unlabeled
    // fallthrough from BattleScript_PrintBankAbilityMadeIneffective, whose own
    // `copybyte sBATTLER, sBATTLER_WITH_ABILITY` (battleScriptIngrainLeechSeed
    // WrapOpcode.ts:297-306) already writes scriptingBattler to the Insomnia/
    // Vital Spirit holder recorded by EffectYawn's own jumpifability checks --
    // the exact same scriptingBattler idiom STRINGID_PKMNSXCUREDITSYPROBLEM
    // already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (
    messageId === "STRINGID_AVOIDEDDAMAGE"
    || messageId === "STRINGID_PKMNMAKESGROUNDMISS"
  ) {
    // MISS_STRING_ID_BY_TYPE[B_MSG_AVOIDED_DMG]/[B_MSG_GROUND_MISS],
    // Cmd_resultmessage -- Wonder Guard / Levitate, the same defending
    // battler checkWonderGuardAndLevitate/typecalc/typecalc2 tested
    // (battleScriptHitChainOpcode.ts:958-959,986-989,1617-1622,1672-1677,
    // 1778-1783,1818-1823). {B_DEF_ABILITY} is prepareMessage's own
    // substitution (factoryBattleScriptFullTurnDecision.ts), sourced from
    // that same target's rulesContext.battlers[target].ability.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (
    messageId === "STRINGID_PKMNPOISONEDBY"
    || messageId === "STRINGID_PKMNBURNEDBY"
    || messageId === "STRINGID_PKMNWASPARALYZEDBY"
    || messageId === "STRINGID_PKMNFROZENBY"
    || messageId === "STRINGID_PKMNMADESLEEP"
  ) {
    // gGotPoisonedStringIds[1]/gGotBurnedStringIds[1]/gGotParalyzedStringIds[1]
    // (battle_message.c:387-390) -- Poison Point/Flame Body/Static/Effect
    // Spore's on-contact status block (battleScriptMoveEndOpcode.ts:447-608).
    // B_SCR_ACTIVE_* is the ability holder (applySetMoveEffect's
    // scriptingBattler, battleScriptHitChainOpcode.ts:2841-2848); B_EFF_* is
    // the attacker who got statused. Prefer the print-time gEffectBattler
    // snapshot, retaining the old status-controller bridge only for staged
    // receipts that predate it. ISSUES #70 batch 2 (docs/issue70-
    // stringid-reachability.md rows 4/23): gGotFrozenStringIds[1]/
    // gFellAsleepStringIds[1] share this exact template shape and the same
    // generic applySetMoveEffect(abilityEffectHitmarkerSet) dispatch tail
    // (battleScriptHitChainOpcode.ts:3410-3413) -- wired and real, but no
    // rental ability drives MOVE_EFFECT_FREEZE/SLEEP through it in vanilla
    // Gen3 (zero-incidence per the doc's own sum-check).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const effectBattler = event.payload.effectBattler !== undefined
      ? singlesBattler(event.payload.effectBattler, `${messageId} effect battler`)
      : pendingStatusMessageBattler;
    if (effectBattler === null) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler/preceding status event`);
    }
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
    });
  }
  if (messageId === "STRINGID_PKMNSITEMCUREDPROBLEM") {
    // gBerryEffectStringIds[0] (battle_message.c:437-441),
    // BattleScript_BerryCureChosenStatusRet (Lum Berry/Mental Herb -- the
    // "any status" cure items; per-status berries print their own distinct
    // fixed-text STRINGIDs and never reach this template). {B_BUFF1} is
    // prepareMessage's substitution of rulesContext.battleTextBuff1Status,
    // captured pre-clear at both live call sites (battleScriptMoveEndOpcode.ts:
    // 793,811; battleEndTurnOrchestration.ts's HOLD_EFFECT_CURE_STATUS/
    // CURE_ATTRACT branches).
    if (event.payload.substitutions.length === 0) {
      throw new Error("battle resolution item-cured-problem message has no status substitution");
    }
    const scriptingBattler = event.payload.scriptingBattler !== undefined
      ? singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`)
      : pendingHeldItemEffectBattler;
    if (scriptingBattler === null) {
      throw new Error("battle resolution item-cured-problem message has no scripting battler/preceding held-item effect");
    }
    const statusName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_LAST_ITEM: () => itemNameAtPrint(scriptingBattler),
      B_BUFF1: () => statusName,
    });
  }
  if (
    messageId === "STRINGID_PKMNSITEMRESTOREDHEALTH"
    || messageId === "STRINGID_PKMNSITEMRESTOREDHPALITTLE"
  ) {
    // BattleScript_ItemHealHP_RemoveItem / BattleScript_ItemHealHP_Ret
    // (data/battle_scripts_1.s:4356-4364,4377-4384) -- the end-turn berry
    // heal, Leftovers, and Shell Bell. The print owner is print-time
    // gBattleScripting.battler (battle_util.c:3604-3606 stamps the holder for
    // every fired ITEMEFFECT_NORMAL effect; battle_message.c:2450 reads it),
    // NOT the B_ANIM_HELD_ITEM_EFFECT receipt: Scene OFF's whole-battle
    // HITMARKER_NO_ANIMATIONS (factoryBattleStart.ts:405-407) routes
    // Cmd_playanimation into its BattleScript_Pausex20 branch
    // (battle_script_commands.c:4014-4018), so the generated route never
    // emits that animation event at all. {B_LAST_ITEM} is source's
    // gLastUsedItem (battle_util.c:3266, the holder's item read before the
    // effect switch); printstring runs BEFORE removeitem in both scripts, so
    // the tracked heldItems entry still holds the fired item at print time.
    const scriptingBattler = event.payload.scriptingBattler !== undefined
      ? singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`)
      : pendingHeldItemEffectBattler;
    if (scriptingBattler === null) {
      throw new Error(
        `battle resolution ${messageId} message has no scripting battler/preceding held-item effect`,
      );
    }
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_LAST_ITEM: () => itemNameAtPrint(scriptingBattler),
    });
  }
  if (messageId === "STRINGID_PKMNENDUREDHIT") {
    // classifyResultMessage's MOVE_RESULT_FOE_ENDURED case
    // (battleScriptHitChainOpcode.ts:2611-2612) -- an Endure carrier takes a
    // hit that would otherwise KO it.
    const defender = requireMoveDefender(lastMoveAttacker, "endured-hit message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_SUBSTITUTEDAMAGED") {
    // Cmd_healthbarupdate direct literal (battleScriptHitChainOpcode.ts:2354)
    // -- any damaging hit landing on a battler with an active Substitute.
    const defender = requireMoveDefender(lastMoveAttacker, "substitute-damaged message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNRAISEDDEF"
    || messageId === "STRINGID_PKMNRAISEDSPDEF"
    || messageId === "STRINGID_PKMNCOVEREDBYVEIL"
    || messageId === "STRINGID_PKMNRAISEDDEFALITTLE"
    || messageId === "STRINGID_PKMNRAISEDSPDEFALITTLE"
  ) {
    // createSetSideStatusHandler's REFLECT_CONFIG/LIGHTSCREEN_CONFIG/
    // SAFEGUARD_CONFIG success choosers (battleScriptSetSideStatusOpcode.ts).
    // {B_ATK_PREFIX2} is the literal "Ally"/"Foe" side label (battle_message.c:
    // 2637-2641, sText_AllyPkmnPrefix2/sText_FoePkmnPrefix3), not a nicknamed
    // battler -- the attacking side that cast Reflect/Light Screen/Safeguard.
    // {B_CURRENT_MOVE} is gMoveNames[gBattleMsgDataPtr->currentMove]
    // (battle_message.c:2453-2456), the frozen action snapshot's own move.
    // ISSUES #70 batch 2 (docs/issue70-stringid-reachability.md rows 35/37):
    // gReflectLightScreenSafeguardStringIds[2]/[4] (the doubles-only "a
    // little" choosers) share this exact template shape; structurally
    // unreachable in this engine's singles-only scope
    // (battleScriptSetSideStatusOpcode.ts:14-19's own header comment).
    if (lastMoveAttacker === null || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
    }
    const prefix2 = lastMoveAttacker === 0 ? "Ally" : "Foe";
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX2: () => prefix2,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNSHROUDEDINMIST") {
    // MIST_CONFIG's own successChooser (B_MSG_SET_MIST), the same
    // createSetSideStatusHandler family as Reflect/Light Screen/Safeguard
    // above, but gText_PkmnShroudedInMist (battle_message.c:151) has no
    // {B_CURRENT_MOVE} placeholder -- Mist's own name is implied.
    if (lastMoveAttacker === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move event`);
    }
    const prefix2 = lastMoveAttacker === 0 ? "Ally" : "Foe";
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX2: () => prefix2,
    });
  }
  if (messageId === "STRINGID_PKMNCHOSEXASDESTINY") {
    // gFutureMoveUsedStringIds[1], battleScriptTrysetfutureattackOpcode.ts:
    // 129-165 -- multistringChooser=1 iff currentMove === MOVE_DOOM_DESIRE,
    // never a legal Factory L50 rental move (Jirachi-exclusive).
    if (lastMoveAttacker === null || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
    }
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, lastMoveAttacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (
    messageId === "STRINGID_PKMNSQUEEZEDBYBIND"
    || messageId === "STRINGID_PKMNWRAPPEDBY"
    || messageId === "STRINGID_PKMNTRAPPEDINVORTEX"
    || messageId === "STRINGID_PKMNCLAMPED"
    || messageId === "STRINGID_PKMNTRAPPEDBYSANDTOMB"
  ) {
    // gWrappedStringIds, applyWrapMoveEffect (battleScriptHitChainOpcode.ts:
    // 3692-3727) -- indexed by the move's own position in TRAPPING_MOVES
    // (Bind/Wrap/Fire Spin/Clamp/Whirlpool/Sand Tomb; Fire Spin and
    // Whirlpool share idx2's text, matching vanilla gWrappedStringIds).
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNHURTBY") {
    // BattleScript_WrapTurnDmg (reference/pokeemerald/data/battle_scripts_1.s:
    // 3829-3833), fired from ENDTURN_WRAP (battle_util.c:1592-1621,
    // runWrapTick/WRAP_TURN_DMG_LABEL, battleEndTurnOrchestration.ts) -- the
    // trap's own recurring damage tick, reachable the same turn a wrap-family
    // move (Bind/Wrap/Fire Spin/Clamp/Whirlpool/Sand Tomb) first lands.
    // BS_ATTACKER is reassigned to the trapped battler itself for this tick
    // (battle_util.c:1471, enterTickBattlerContext), not the last move's real
    // attacker, so this reads the print-time action snapshot rather than
    // lastMoveAttacker. {B_BUFF1} is the trapping move's own name --
    // prepareMessage's own battlers[...].wrappedMove substitution
    // (factoryBattleScriptFullTurnDecision.ts).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot/substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId.toLowerCase()} action snapshot`);
    const trappingMoveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => trappingMoveName,
    });
  }
  if (
    messageId === "STRINGID_PKMNEVADEDATTACK"
    || messageId === "STRINGID_PKMNSEEDED"
  ) {
    // gLeechSeedStringIds[1]/[0], Cmd_setseeded
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:87-120) -- Leech Seed
    // missing (already-seeded/accuracy-missed) or landing.
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNOBTAINEDX"
    || messageId === "STRINGID_PKMNOBTAINEDX2"
    || messageId === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ"
  ) {
    // gItemSwapStringIds, Cmd_tryswapitems (battleScriptTryswapitemsOpcode.ts:
    // 119-215, Trick) -- {B_BUFF1}/{B_BUFF2} are prepareMessage's own
    // battleTextBuff1Item/battleTextBuff2Item substitutions (already wired).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no item substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const buff1 = event.payload.substitutions[0]!;
    const buff2 = messageId === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ"
      ? event.payload.substitutions[1]!
      : event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => buff1,
      B_BUFF2: () => buff2,
    });
  }
  if (messageId === "STRINGID_PKMNUNAFFECTED") {
    // gKOFailedStringIds[1], Cmd_tryKO (battleScriptTryKOOpcode.ts:170-175) --
    // B_MSG_KO_UNAFFECTED iff targetLevel > attackerLevel, never true in this
    // engine's mirror-level L50 singles scope.
    const defender = requireMoveDefender(lastMoveAttacker, "unaffected message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (
    messageId === "STRINGID_PKMNRAISEDFIREPOWERWITH"
    || messageId === "STRINGID_PKMNSXMADEYINEFFECTIVE"
  ) {
    // gFlashFireStringIds, advancePastAccuracyCheck
    // (battleScriptHitChainOpcode.ts:908-925) -- first activation vs an
    // already-boosted re-activation. {B_DEF_ABILITY} is prepareMessage's own
    // substitution, sourced from that same target's rulesContext.battlers[
    // target].ability (same shape as AVOIDEDDAMAGE/PKMNMAKESGROUNDMISS above).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    const ability = event.payload.substitutions[0]!;
    const resolvers: Record<string, () => string> = {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    };
    if (messageId === "STRINGID_PKMNSXMADEYINEFFECTIVE") {
      if (actionSnapshot === null) {
        throw new Error(`battle resolution ${messageId} message has no preceding used-move action snapshot`);
      }
      resolvers.B_CURRENT_MOVE = () => resolveMoveName(actionSnapshot.currentMove);
    }
    return resolveBattleStringLines(messageId, resolvers);
  }
  if (messageId === "STRINGID_HITXTIMES") {
    // BattleScript_MultiHitPrintStrings's printstring, real script data
    // right after `copyarray gBattleTextBuff1, sMULTIHIT_STRING, 6`
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:308-323). {B_BUFF1} is
    // prepareMessage's substitution of rulesContext.multiHitStringCounter,
    // the multi-hit family's own hits-landed counter.
    if (event.payload.substitutions.length === 0) {
      throw new Error("battle resolution hit-x-times message has no hit-count substitution");
    }
    const hitCount = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => hitCount,
    });
  }
  // ISSUES #70 batch 3 (docs/issue70-stringid-reachability.md rows 6-14,
  // 21-22, 40): the ability-prevention family, the Uproar family, Stockpile/
  // Swallow, and Transform.
  if (
    messageId === "STRINGID_PKMNPREVENTSPOISONINGWITH"
    || messageId === "STRINGID_PKMNSXPREVENTSBURNS"
    || messageId === "STRINGID_PKMNPREVENTSPARALYSISWITH"
  ) {
    // gPSNPreventionStringIds[0]/gBRNPreventionStringIds[0]/
    // gPRLZPreventionStringIds[0] (battle_message.c:391-405) -- the
    // direct-status-move context (Toxic/Will-O-Wisp/Thunder Wave-family vs
    // Immunity/Water Veil/Limber), reached via BattleScript_ImmunityProtected/
    // WaterVeilPrevents/LimberProtected's own `copybyte gEffectBattler,
    // gBattlerTarget` (battle_scripts_1.s:715,1035,2191), already ported as
    // Cmd_copyarray's gEffectBattler<-gBattlerTarget tuple
    // (battleScriptIngrainLeechSeedWrapOpcode.ts:277-290). Both template
    // variants ({B_DEF_ABILITY} for PSN/PRLZ, {B_EFF_ABILITY} for BRN) name
    // the same battler here, since this context never swaps effectBattler
    // away from the real move's target.
    if (event.payload.effectBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no effect-battler/ability substitution`);
    }
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
      B_DEF_ABILITY: () => ability,
      B_EFF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXPREVENTSYSZ") {
    // idx1 of all three prevention tables (battle_message.c:391-405) -- only
    // reachable via Synchronize's own seteffectprimary re-application
    // (executeSynchronize, battleScriptMoveEndOpcode.ts), which sets
    // HITMARKER_STATUS_ABILITY_EFFECT before applySetMoveEffect runs.
    // {B_ATK_NAME_WITH_PREFIX}/{B_DEF_NAME_WITH_PREFIX} are the real, fixed
    // attacker/target (unaffected by Synchronize's own effectBattler/
    // scriptingBattler swap) -- lastMoveAttacker already tracks them.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no ability substitutions`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "prevents-ability message");
    const defender = requireMoveDefender(lastMoveAttacker, "prevents-ability message");
    const attackerAbility = event.payload.substitutions[0]!;
    const defenderAbility = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_ATK_ABILITY: () => attackerAbility,
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => defenderAbility,
    });
  }
  if (messageId === "STRINGID_PKMNSXHADNOEFFECTONY") {
    // idx2 of all three prevention tables -- same Synchronize-only
    // reachability as above, but the type-immune (not ability-block) tail:
    // {B_SCR_ACTIVE_*} is the ability holder (scriptingBattler, always
    // Synchronize in practice), {B_EFF_NAME_WITH_PREFIX} is the type-immune
    // battler (effectBattler).
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.effectBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/effect-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const effectBattler = singlesBattler(event.payload.effectBattler, `${messageId} effect battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_EFF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, effectBattler),
    });
  }
  if (
    messageId === "STRINGID_PKMNCANTSLEEPINUPROAR2"
    || messageId === "STRINGID_UPROARKEPTPKMNAWAKE"
  ) {
    // gUproarAwakeStringIds[0]/[1] (battle_message.c:426-431),
    // createJumpifcantmakeasleepOpcodeHandler -- both choosers only differ in
    // wording on whose Uproar it is; the displayed battler is always the
    // sleep move's own real target either way.
    const target = requireMoveDefender(lastMoveAttacker, `${messageId.toLowerCase()} message`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, target),
    });
  }
  if (messageId === "STRINGID_PKMNSTAYEDAWAKEUSING") {
    // gUproarAwakeStringIds[2] -- the Insomnia/Vital Spirit branch,
    // independent of any Uproar carrier.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const target = requireMoveDefender(lastMoveAttacker, "stayed-awake message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, target),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_USINGITEMSTATOFPKMNROSE") {
    // gStatUpStringIds[4] (battle_message.c:1006-1015), BattleScript_
    // BerryStatRaiseDoStatUp -- the same statbuffchange/BattleScript_StatUp
    // mechanism as ATTACKERSSTATROSE/DEFENDERSSTATROSE below, just a
    // different chooser index; {B_BUFF1}/{B_BUFF2} reuse that same
    // lastStatChange tracking. {B_SCR_ACTIVE_NAME_WITH_PREFIX}/{B_LAST_ITEM}
    // are the berry holder (scriptingBattler, battleEndTurnOrchestration.ts's
    // STAT_UP_BERRIES tick).
    if (event.payload.scriptingBattler === undefined || !lastStatChange) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/stat event`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution ${messageId} message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_LAST_ITEM: () => itemNameAtPrint(scriptingBattler),
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: () => statName,
      B_BUFF2: () => (lastStatChange.requestedMagnitude === 2 ? "sharply rose!" : "rose!"),
    });
  }
  if (messageId === "STRINGID_PKMNSTOCKPILED") {
    // gStockpileUsedStringIds[0] (battle_message.c:341-345),
    // stockpileHandler -- {B_BUFF1} is the post-increment stockpile counter
    // (rulesContext.battleTextBuff1ByteNumber), the same shape as HITXTIMES.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no stockpile-count substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "stockpiled message");
    const count = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => count,
    });
  }
  if (messageId === "STRINGID_PKMNHPFULL") {
    // gSwallowFailStringIds[1] (battle_message.c:351-355) -- Swallow at full
    // HP self-targets (stockpileToHpHealHandler reassigns
    // selectorRoles.target to the attacker itself), so {B_DEF_NAME_WITH_PREFIX}
    // is the attacker, not the generic opposite-singles-battler defender.
    const attacker = requireMoveAttacker(lastMoveAttacker, "hp-full message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNTRANSFORMEDINTO") {
    // gTransformUsedStringIds[0] (battle_message.c:331-335) -- {B_BUFF1} is
    // the species Transform just copied (rulesContext.battleTextBuff1Species).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no species substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "transformed-into message");
    const speciesName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => speciesName,
    });
  }
  if (
    messageId === "STRINGID_DEFENDERSSTATROSE"
    || messageId === "STRINGID_DEFENDERSSTATFELL"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-fell message");
    const displayed = fieldBattler(field, battler);
    // ChangeStatBuffs's {B_BUFF2} "sharply"/"harshly" selection reads the
    // pre-clamp requested magnitude, not the post-clamp from/to delta
    // (battle_script_commands.c:7038,7061; docs/issue66b-preclamp-magnitude-verdict.md).
    const magnitude = lastStatChange.requestedMagnitude;
    const rose = messageId === "STRINGID_DEFENDERSSTATROSE";
    // {B_BUFF1} is ChangeStatBuffs's own PREPARE_STAT_BUFFER(gBattleTextBuff1,
    // statId) (battle_script_commands.c:6958), which copies gStatNamesTable
    // ("ATTACK" etc, not lastStatChange.stat's lowercase-always enum string) --
    // oracle-confirmed pixel mismatch, docs/issue66b-stat-name-capitalization-verdict.md.
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-change message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      B_BUFF1: () => statName,
      B_BUFF2: () =>
        rose
          ? magnitude === 2 ? "sharply rose!" : "rose!"
          : magnitude === 2 ? "harshly fell!" : "fell!",
    });
  }
  if (
    messageId === "STRINGID_ATTACKERSSTATROSE"
    || messageId === "STRINGID_ATTACKERSSTATFELL"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-fell message");
    const displayed = fieldBattler(field, battler);
    const magnitude = lastStatChange.requestedMagnitude;
    const rose = messageId === "STRINGID_ATTACKERSSTATROSE";
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-change message has unknown stat ${lastStatChange.stat}`);
    }
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: battler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
      B_BUFF1: () => statName,
      B_BUFF2: () =>
        rose
          ? magnitude === 2 ? "sharply rose!" : "rose!"
          : magnitude === 2 ? "harshly fell!" : "fell!",
    });
  }
  if (
    messageId === "STRINGID_STATSWONTINCREASE"
    || messageId === "STRINGID_STATSWONTDECREASE"
  ) {
    if (!lastStatChange) {
      throw new Error(
        "battle resolution stat-change message has no preceding stat event",
      );
    }
    const battler = singlesBattler(lastStatChange.battler, "stat-wont-change message");
    const displayed = fieldBattler(field, battler);
    const nameWithPrefix = () => resolveBattleNameWithPrefix({
      side: battler === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
    const statName = STAT_DISPLAY_NAME[lastStatChange.stat];
    if (statName === undefined) {
      throw new Error(`battle resolution stat-wont-change message has unknown stat ${lastStatChange.stat}`);
    }
    if (messageId === "STRINGID_STATSWONTINCREASE") {
      return resolveBattleStringLines(messageId, {
        B_ATK_NAME_WITH_PREFIX: nameWithPrefix,
        B_BUFF1: () => statName,
      });
    }
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefix,
      B_BUFF1: () => statName,
    });
  }
  if (messageId === "STRINGID_TARGETFAINTED") {
    if (lastFaintBattler === null) {
      throw new Error("battle resolution target-fainted message has no faint event");
    }
    const displayed = fieldBattler(field, lastFaintBattler);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastFaintBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_ATTACKERFAINTED") {
    if (lastFaintBattler === null) {
      throw new Error("battle resolution attacker-fainted message has no faint event");
    }
    const displayed = fieldBattler(field, lastFaintBattler);
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: () => resolveBattleNameWithPrefix({
        side: lastFaintBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      }),
    });
  }
  if (messageId === "STRINGID_SWITCHINMON") {
    if (switchInBattler === null || switchInIncoming === null) {
      throw new Error(
        "battle resolution switch-in message has no preceding switch/post-switch field",
      );
    }
    const incoming = switchInIncoming;
    if (switchInBattler === 0) {
      return Object.freeze([`Go! ${incoming.name}!`]);
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent switch-in message requires a frozen trainer-name substitution",
      );
    }
    return Object.freeze([
      `${opponentTrainer.className} ${opponentTrainer.name} sent`,
      `out ${incoming.name}!`,
    ]);
  }
  // ISSUES #70's STRINGID_INTROSENDOUT extractor gap: ids 0/1/2/5 sit below
  // the extracted table's own scoped range (src/data/battleIntroStrings.ts's
  // own header), so they read that hand-mapped table instead of
  // resolveBattleStringLines, the same way STRINGID_SWITCHINMON (id 3, just
  // above) hand-builds its own lines. No engine path emits any of these 4
  // ids yet (ISSUES #71 owns the live send-out seam); this is resolver
  // completeness only, so a future emitter resolves instead of crashing.
  if (messageId === "STRINGID_INTROMSG") {
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution intro message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(
      findIntroStringEntry(0, "sText_Trainer1WantsToBattle"),
      {
        B_TRAINER1_CLASS: () => opponentTrainer.className,
        B_TRAINER1_NAME: () => opponentTrainer.name,
      },
    );
  }
  if (messageId === "STRINGID_INTROSENDOUT") {
    if (event.payload.introBattler === undefined) {
      throw new Error("battle resolution intro-sendout message has no intro battler");
    }
    const battler = singlesBattler(event.payload.introBattler, "intro-sendout message");
    if (battler === 0) {
      return resolveIntroStringEntry(findIntroStringEntry(1, "sText_GoPkmn"), {
        B_PLAYER_MON1_NAME: () => fieldBattler(field, 0).name,
      });
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent intro-sendout message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(findIntroStringEntry(1, "sText_Trainer1SentOutPkmn"), {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
      B_OPPONENT_MON1_NAME: () => fieldBattler(field, 1).name,
    });
  }
  if (messageId === "STRINGID_RETURNMON") {
    if (event.payload.introBattler === undefined) {
      throw new Error("battle resolution return-mon message has no intro battler");
    }
    const battler = singlesBattler(event.payload.introBattler, "return-mon message");
    const returning = fieldBattler(field, battler);
    if (battler === 0) {
      const hpScale = event.payload.introHpScale;
      if (hpScale === undefined) {
        throw new Error("battle resolution player return-mon message has no hp scale");
      }
      const cSymbolByHpScale: Readonly<Record<0 | 1 | 2 | 3, string>> = {
        0: "sText_PkmnThatsEnough",
        1: "sText_PkmnComeBack",
        2: "sText_PkmnOkComeBack",
        3: "sText_PkmnGoodComeBack",
      };
      return resolveIntroStringEntry(findIntroStringEntry(2, cSymbolByHpScale[hpScale]), {
        B_BUFF1: () => returning.name,
      });
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution opponent return-mon message requires a frozen trainer-name substitution",
      );
    }
    return resolveIntroStringEntry(findIntroStringEntry(2, "sText_Trainer1WithdrewPkmn"), {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
      B_BUFF1: () => returning.name,
    });
  }
  if (messageId === "STRINGID_BATTLEEND") {
    if (event.payload.introOutcome === undefined) {
      throw new Error("battle resolution battle-end message has no outcome");
    }
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution battle-end message requires a frozen trainer-name substitution",
      );
    }
    const cSymbolByOutcome: Readonly<Record<BattleOutcome, string>> = {
      "player-win": "sText_PlayerDefeatedLinkTrainer",
      "trainer-win": "sText_PlayerLostAgainstLinkTrainer",
      draw: "sText_PlayerBattledToDrawLinkTrainer",
    };
    return resolveIntroStringEntry(
      findIntroStringEntry(5, cSymbolByOutcome[event.payload.introOutcome]),
      { B_LINK_OPPONENT1_NAME: () => opponentTrainer.name },
    );
  }
  // Terminal-seam increment (ii) (docs/terminal-seam-round-flow-scout.md §3,
  // ISSUES #72's Taunt-pair idiom extended to the win-side terminal ids):
  // BattleScript_FrontierTrainerBattleWon's own two printstrings, reachable
  // only now that increment (i) resumes the interpreter past checkteamslost's
  // end2 into that script.
  if (messageId === "STRINGID_PLAYERDEFEATEDTRAINER1") {
    // data/battle_scripts_1.s:3029-3030 -- {B_TRAINER1_CLASS}/{B_TRAINER1_NAME}
    // are the plain per-round opponent identity, same idiom as
    // STRINGID_INTROMSG/STRINGID_SWITCHINMON above.
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution player-defeated-trainer message requires a frozen trainer-name substitution",
      );
    }
    return resolveBattleStringLines(messageId, {
      B_TRAINER1_CLASS: () => opponentTrainer.className,
      B_TRAINER1_NAME: () => opponentTrainer.name,
    });
  }
  if (messageId === "STRINGID_TRAINER1LOSETEXT") {
    // data/battle_scripts_1.s:3035-3038 -- unlike every other id in this
    // file, the extracted template is a single bare {B_TRAINER1_LOSE_TEXT}
    // placeholder with no line-break segment of its own: the source's line
    // split lives entirely inside CopyFrontierTrainerText's Easy-Chat-word
    // buffer, already formatted into its fixed 2-line shape by
    // factoryTrainerPresentationForOpponent (formatFactoryEasyChatSpeech).
    // So this hand-builds the 2-line result directly, the same shape
    // STRINGID_SWITCHINMON's opponent branch uses above, rather than routing
    // through resolveBattleStringLines (which only knows how to split on the
    // template's own line-break segments).
    if (opponentTrainer === null) {
      throw new Error(
        "battle resolution trainer-lose-text message requires a frozen trainer-name substitution",
      );
    }
    return opponentTrainer.speechLose;
  }
  if (messageId === "STRINGID_TRAINER1WINTEXT") {
    // data/battle_scripts_1.s:2968 (BattleScript_LocalBattleLostPrintTrainersWinText)
    // -- the LOSS-side mirror of STRINGID_TRAINER1LOSETEXT just above: same
    // bare {B_TRAINER1_WIN_TEXT} placeholder with no line-break segment of
    // its own, same CopyFrontierTrainerText Easy-Chat-word buffer, just the
    // opposite per-trainer speech field (speechWin instead of speechLose).
    // docs/terminal-seam-loss-path-ground-truth.md §2(b): DESTIN's speechWin
    // ("I AM ABOUT TO OVERHEAT") pixel-confirmed against this exact field.
    if (opponentTrainer === null || opponentTrainer.speechWin === undefined) {
      throw new Error(
        "battle resolution trainer-win-text message requires a frozen trainer-name substitution",
      );
    }
    return opponentTrainer.speechWin;
  }
  // ISSUES #72 batch 6 (docs/issue72-reachability-triage.md): the plain-idiom
  // tail continued from STRINGID_PKMNSXCUREDYPROBLEM.
  if (messageId === "STRINGID_PKMNWISHCAMETRUE") {
    // BattleScript_WishComesTrue/WishButFullHp: Cmd_trywish's own heal-effect
    // state PREPARE_MON_NICK_WITH_PREFIX_BUFFERs the Wish target's own name
    // into {B_BUFF1} -- runDoFieldEndTurnEffects's own selectorRoles.target
    // write plus enterTickBattlerContext's generic attacker reassignment both
    // land on the same (no-switch-in-between) battler in this engine's scope.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_BUFF1: nameWithPrefixResolver(field, battler),
    });
  }
  if (messageId === "STRINGID_PKMNUSEDSAFEGUARD") {
    // BattleScript_SafeguardProtected/TeeterDanceSafeguardProtected: the
    // jumpifsideaffecting check reads BS_TARGET without reassigning it -- the
    // move's own (still-current) target, same plain shape
    // STRINGID_TARGETCANTESCAPENOW already uses.
    const defender = requireMoveDefender(lastMoveAttacker, "used-safeguard message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNSXRESTOREDHPALITTLE2") {
    // BattleScript_RainDishActivates: runAbilitiesTick's own Rain Dish branch
    // never reassigns scriptingBattler (unlike Shed Skin/Speed Boost) --
    // {B_ATK_NAME_WITH_PREFIX}/{B_ATK_ABILITY} read gBattlerAttacker, set
    // generically by enterTickBattlerContext for every end-turn tick
    // (battle_util.c:2604's own unconditional gBattlerAttacker = battler).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/ability substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_ATK_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNMOVEISDISABLED") {
    // BattleScript_MoveUsedIsDisabled: same {B_ACTIVE_NAME_WITH_PREFIX}/
    // {B_CURRENT_MOVE} shape STRINGID_PKMNCANTUSEMOVETAUNT already uses -- the
    // attack-canceler's own handoff (battleScriptActionAdmission.ts:2192) is
    // wired the same Taunt/Imprison idiom.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNMOVEWASDISABLED") {
    // BattleScript_EffectDisable: disablelastusedattack and this printstring
    // run back-to-back with no role change in between
    // (data/battle_scripts_1.s:1183-1193) -- BS_TARGET is still the move's
    // own (still-current) defender, whose own disabledMove field
    // Cmd_disablelastusedattack just wrote.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no move substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "move-was-disabled message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNPERISHCOUNTFELL") {
    // BattleScript_PerishSongCountGoesDown/PerishSongTakesLife share this
    // printstring (data/battle_scripts_1.s:3438-3450); runPerishSongAfterFutureAttacks
    // freezes selectorRoles.attacker to the counting battler and stamps the
    // pre-decrement count into battleTextBuff1ByteNumber (battle_util.c:1846's
    // own PREPARE_BYTE_NUMBER_BUFFER call, captured before the decrement).
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/count substitution`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const count = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_BUFF1: () => count,
    });
  }
  if (messageId === "STRINGID_PKMNMOVEBOUNCED") {
    // BattleScript_MagicCoatBounce: the Magic Coat attack-canceler handoff
    // never reassigns attacker/target (battleScriptMagicCoat.ts:470-506) --
    // BS_ATTACKER/{B_CURRENT_MOVE} are still the original caster and their
    // own blocked status move.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "move-bounced message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_NATUREPOWERTURNEDINTO") {
    // BattleScript_EffectNaturePower (data/battle_scripts_1.s:2286-2293):
    // callenvironmentattack overwrites gCurrentMove to the terrain-selected
    // move (Cmd_callenvironmentattack, battle_script_commands.c:9108-9115)
    // and continues straight into this printstring in the same script frame
    // (battleScriptEnvironmentAttackOpcode.ts's call-stack transition defers
    // the *called* move's effect script until the trailing `return`), so
    // {B_CURRENT_MOVE} names the called move (e.g. SWIFT in the Factory's
    // BATTLE_ENVIRONMENT_BUILDING), never NATURE POWER itself.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    return resolveBattleStringLines(messageId, {
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNRAISEDSPEED") {
    // BattleScript_SpeedBoostActivates: runAbilitiesTick's own Speed Boost
    // branch now sets scriptingBattler the same way Shed Skin's own tick
    // already does (battle_util.c:2649's gBattleScripting.battler = battler).
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSHROUDEDITSELF") {
    // BattleScript_EffectMagicCoat's own success tail -- a zero-TS-reference
    // move-effect entry script, attacker/target both still the move's own
    // unchanged roles.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no preceding action snapshot`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "shrouded-itself message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_STATSWONTDECREASE2") {
    // BattleScript_CantLowerMultipleStats (EffectTickle's own compound
    // both-stats-already-at-minimum gate) -- BS_TARGET unchanged, plain
    // defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "stats-wont-decrease message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNFELLINTONIGHTMARE") {
    // BattleScript_NightmareWorked (EffectNightmare's own compound
    // already-asleep gate) -- BS_TARGET unchanged, plain defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "fell-into-nightmare message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNHEALEDPARALYSIS") {
    // MOVE_EFFECT_REMOVE_PARALYSIS handler (Smelling Salt's sole carrier) --
    // BS_TARGET unchanged, plain defender-only shape.
    const defender = requireMoveDefender(lastMoveAttacker, "healed-paralysis message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  // ISSUES #105: BattleScript_EffectConversion/Conversion2/Camouflage all
  // print this same STRINGID after tryconversiontypechange/
  // settypetorandomresistance/settypetoenvironment (battle_scripts_1.s:664,
  // 1282, 2805) -- none of the three reassign selectorRoles, so BS_ATTACKER
  // stays the move's own still-current user, the same battler whose types[]
  // just changed.
  if (messageId === "STRINGID_PKMNCHANGEDTYPE") {
    if (event.payload.substitutions.length < 1) {
      throw new Error(`battle resolution ${messageId} message has no type substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "changed-type message");
    const typeName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => typeName,
    });
  }
  // ISSUES #72 batch 7: the small-plumbing + known-staging cluster of the
  // remaining REACHABLE-15 list (docs/issue72-reachability-triage.md,
  // PROGRESS 904's own classification).
  if (messageId === "STRINGID_PKMNCHANGEDTYPEWITH") {
    // BattleScript_ColorChangeActivates: executeOnDamageAbilities's own
    // Color Change branch never reassigns selectorRoles -- BS_TARGET stays
    // the move's own still-current target, the same battler whose types[]
    // just changed.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no ability/type substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "changed-type-with message");
    const ability = event.payload.substitutions[0]!;
    const typeName = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
      B_BUFF1: () => typeName,
    });
  }
  if (messageId === "STRINGID_PKMNREDUCEDPP") {
    // Cmd_tryspiteppreduce (Spite): reads rules.selectorRoles.target
    // directly (requireBattlerRole), never reassigned -- the move's own
    // still-current target, whose last-used move/PP this reduces.
    if (event.payload.substitutions.length < 2) {
      throw new Error(`battle resolution ${messageId} message has no move/pp substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "reduced-pp message");
    const moveName = event.payload.substitutions[0]!;
    const ppAmount = event.payload.substitutions[1]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
      B_BUFF2: () => ppAmount,
    });
  }
  if (messageId === "STRINGID_PKMNSITEMRESTOREDPP") {
    // BattleScript_BerryPPHealEnd2 (Leppa Berry): runItemsTick's own
    // HOLD_EFFECT_RESTORE_PP branch sets scriptingBattler to the berry
    // holder, same shape STRINGID_USINGITEMSTATOFPKMNROSE already uses for
    // {B_SCR_ACTIVE_NAME_WITH_PREFIX}/{B_LAST_ITEM}.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/move substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_LAST_ITEM: () => itemNameAtPrint(scriptingBattler),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNSTOLEITEM") {
    // MOVE_EFFECT_STEAL_ITEM handler (Thief/Covet): unlike Knock Off, this
    // handler's own set-battler-item events (attacker gains the stolen item,
    // target loses it) fire in the SAME transition that calls into
    // BattleScript_ItemSteal, i.e. strictly before this print in event
    // order -- so by print time heldItems[attacker] already holds the
    // transferred item (heldItems[defender] would read ITEM_NONE here).
    const attacker = requireMoveAttacker(lastMoveAttacker, "stole-item message");
    const defender = requireMoveDefender(lastMoveAttacker, "stole-item message");
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => itemNameAtPrint(attacker),
    });
  }
  if (messageId === "STRINGID_PKMNTRACED") {
    // ABILITYEFFECT_TRACE (battle_util.c:3017-3069): scriptingBattler is the
    // tracer itself; {B_BUFF1} is the traced-FROM battler's own
    // name-with-prefix (PREPARE_MON_NICK_WITH_PREFIX_BUFFER, a distinct
    // battler from scriptingBattler, threaded via prepareMessage's new
    // monNickBattler field since name resolution needs `field`); {B_BUFF2}
    // is the copied ability, engine-supplied via prepareMessage.
    if (
      event.payload.scriptingBattler === undefined
      || event.payload.monNickBattler === undefined
      || event.payload.substitutions.length === 0
    ) {
      throw new Error(`battle resolution ${messageId} message has no scripting/mon-nick-battler or ability substitution`);
    }
    const scriptingBattler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const nickBattler = singlesBattler(event.payload.monNickBattler, `${messageId} mon-nick battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, scriptingBattler),
      B_BUFF1: nameWithPrefixResolver(field, nickBattler),
      B_BUFF2: () => ability,
    });
  }
  // ISSUES #72 batch 8 (docs/issue72-hard-tail-scout.md): the REACHABLE-10
  // hard tail.
  if (messageId === "STRINGID_PKMNPROTECTEDBY") {
    // Cmd_tryKO (battleScriptTryKOOpcode.ts:117-134): the Sturdy check never
    // reassigns selectorRoles -- the move's own (still-current) target is
    // the Sturdy holder, matching real source's unconditional
    // gBattlerTarget check (battle_script_commands.c:7511-7518) ahead of
    // any accuracy/hit roll -- deterministic, not RNG-gated.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no ability substitution`);
    }
    const defender = requireMoveDefender(lastMoveAttacker, "protected-by message");
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_DEF_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXWHIPPEDUPSANDSTORM") {
    // BattleScript_SandstreamActivates: Cmd_switchineffects's own Sand
    // Stream branch freezes scriptingBattler to the switching-in battler
    // (battleScriptSwitchinOpcode.ts:973-981), same shape
    // STRINGID_PKMNPREVENTSSTATLOSSWITH already uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability substitution`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
    });
  }
  if (messageId === "STRINGID_PKMNSXBLOCKSY2") {
    // BattleScript_PerishSongNotAffected: EffectPerishSong's own per-battler
    // Soundproof loop (setbyte/addbyte sBATTLER) -- scriptingBattler is
    // already the generic sBATTLER field (battleScriptSetByte.ts:267,304),
    // {B_CURRENT_MOVE} is the actionSnapshot's own currentMove, same idiom
    // STRINGID_PKMNSXBLOCKSY uses.
    if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0 || actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/action-snapshot`);
    }
    const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const ability = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      B_SCR_ACTIVE_ABILITY: () => ability,
      B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
    });
  }
  if (messageId === "STRINGID_PKMNTOOKFOE") {
    // BattleScript_DestinyBondTakesLife: Cmd_tryfaintmon's nested
    // call-stack transition never reassigns selectorRoles.attacker/.target
    // (battleScriptHitChainOpcode.ts:4295-4340) -- the plain
    // attacker/defender pair from the original hit, unchanged. Destiny
    // Bond/Grudge can only ever fire off a BS_TARGET/BS_FAINTED
    // tryfaintmon call site (docs/issue72-hard-tail-scout.md §1b) since
    // both require the attacker role's own battler to still be alive.
    const attacker = requireMoveAttacker(lastMoveAttacker, "took-foe message");
    const defender = requireMoveDefender(lastMoveAttacker, "took-foe message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNLOSTPPGRUDGE") {
    // BattleScript_GrudgeTakesPP: scheduleGrudge (battleScriptHitChainOpcode.ts:
    // 4354-4376) captures battleTextBuff1Move off the ATTACKER role's own
    // chosen move (the battler that just landed the killing hit, real
    // source's gBattleMons[gBattlerAttacker].moves[moveIndex] --
    // battle_script_commands.c:3030), not the Grudge caster's own move --
    // same plain attacker/defender pair STRINGID_PKMNTOOKFOE above uses.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no move substitution`);
    }
    const attacker = requireMoveAttacker(lastMoveAttacker, "lost-pp-grudge message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNREGAINEDHEALTH") {
    // The 3-label split (docs/issue72-hard-tail-scout.md §3): the correct
    // battler differs per emitting label, since BattleScript_EffectRestoreHp/
    // the self-heal family reassign selectorRoles.target = attacker
    // (battleScriptTryhealhalfhealthOpcode.ts:47) while
    // BattleScript_PresentHealTarget's own Present sub-path never reassigns
    // (a genuinely opposing battler) and BattleScript_WishComesTrue is a
    // tick-scoped actionSnapshot.attacker read, same shape
    // STRINGID_PKMNWISHCAMETRUE already uses.
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const MOVE_PRESENT = 217;
    const label = sourceLabelOf(event);
    if (label === "BattleScript_WishComesTrue") {
      const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
      return resolveBattleStringLines(messageId, {
        B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
      });
    }
    if (label === "BattleScript_PresentHealTarget" && actionSnapshot.currentMove === MOVE_PRESENT) {
      const defender = requireMoveDefender(lastMoveAttacker, "regained-health message (Present)");
      return resolveBattleStringLines(messageId, {
        B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      });
    }
    // BattleScript_EffectRestoreHp, or PresentHealTarget reached via the
    // self-heal family (Rest/Moonlight/Synthesis/Swallow/Softboiled/MilkDrink).
    const attacker = requireMoveAttacker(lastMoveAttacker, "regained-health message (self-heal)");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    });
  }
  if (messageId === "STRINGID_PKMNHUNGONWITHX") {
    // BattleScript_FocusBandActivates: Cmd_adjustnormaldamage's own Focus
    // Band branch (battleScriptHitChainOpcode.ts:1978-1996) never removes
    // the item (unlike Knock Off/Thief) -- heldItems[defender] already
    // holds it unchanged at print time, the plain requireMoveDefender +
    // item-name idiom STRINGID_PKMNSTOLEITEM's own B_LAST_ITEM read already
    // established.
    const defender = requireMoveDefender(lastMoveAttacker, "hung-on-with message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_LAST_ITEM: () => itemNameAtPrint(defender),
    });
  }
  if (messageId === "STRINGID_PKMNSAFEGUARDEXPIRED") {
    // BattleScript_SafeguardEnds: runScreenFieldCase's own tick
    // (battleEndTurnOrchestration.ts:1916-1924) shares the identical
    // enterTickBattlerContext-set selectorRoles.attacker shape
    // STRINGID_PKMNSXWOREOFF already uses. {B_ATK_PREFIX3} resolves through
    // the identical "Ally"/"Foe" side text as {B_ATK_PREFIX1}
    // (battle_message.c:2649-2668: sText_AllyPkmnPrefix/AllyPkmnPrefix3 are
    // both literally "Ally", sText_FoePkmnPrefix2/FoePkmnPrefix4 both
    // literally "Foe" -- distinct string constants, identical text).
    if (actionSnapshot === null) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot`);
    }
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_ATK_PREFIX3: () => (battler === 0 ? "Ally" : "Foe"),
    });
  }
  if (messageId === "STRINGID_PKMNTOOKATTACK") {
    // BattleScript_MonTookFutureAttack: runFutureAttacksAfterFaints's own
    // tick (battleEndTurnOrchestration.ts:2246-2264) reassigns selectorRoles
    // to the ORIGINAL caster (attacker) and the delayed hit's own recipient
    // (target) -- in this engine's singles-only scope the recipient is
    // always the singles-opposite of the caster, the same requireMoveDefender
    // relationship every other plain-idiom id already uses.
    if (actionSnapshot === null || event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no action snapshot/move substitution`);
    }
    const caster = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    const defender = requireMoveDefender(caster, "took-attack message");
    const moveName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
      B_BUFF1: () => moveName,
    });
  }
  if (messageId === "STRINGID_PKMNSUBSTITUTEFADED") {
    // BattleScript_SubstituteFade (data/battle_scripts_1.s:4257-4260, `playanimation
    // BS_TARGET`): reached from Cmd_datahpupdate's substitute-HP path, which
    // never reassigns selectorRoles -- the move's own still-current defender
    // (the Substitute holder) is BS_TARGET, the same plain idiom
    // STRINGID_TARGETFAINTED/STRINGID_PKMNHUNGONWITHX already use.
    const defender = requireMoveDefender(lastMoveAttacker, "substitute-faded message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNATTACK") {
    // BattleScript_BeatUpLoop (data/battle_scripts_1.s:1946-1951): the
    // looping party member's own name-with-prefix, already resolved
    // presentation-side by prepareMessage (ISSUES #106 --
    // factoryBattleScriptFullTurnDecision.ts's own STRINGID_PKMNATTACK case,
    // full `rules.party` access needed since the member need not be the
    // active battler).
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no beat-up party-member substitution`);
    }
    const memberName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => memberName,
    });
  }
  // STRINGID_PKMNMADEITRAIN/STRINGID_PKMNSXINTENSIFIEDSUN (Drizzle/Drought
  // switch-in) are deliberately absent -- ISSUES #108's re-trace found both
  // DEAD in Factory Level-50 singles: Kyogre/Groudon are the only Gen 3
  // Drizzle/Drought carriers and neither is a `FRONTIER_MON_*` eligible
  // rental (absent from every extracted frontier trainer mon set), so the
  // completeness guard below stays fatal for them precisely because they
  // should never actually be reached (same DEAD-carrier precedent as
  // STRINGID_PKMNCANTUSEMOVESEALED above).
  if (messageId === "STRINGID_PKMNRAGEBUILDING") {
    // BattleScript_RageIsBuilding (data/battle_scripts_1.s:3349-3352):
    // executeRage's own moveend check (battleScriptMoveEndOpcode.ts) calls
    // this label with the current move's `target` (the STATUS2_RAGE holder
    // just hit) still current -- the same plain requireMoveDefender idiom
    // STRINGID_PKMNSUBSTITUTEFADED/STRINGID_PKMNFELLINLOVE already use.
    const defender = requireMoveDefender(lastMoveAttacker, "rage-building message");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  if (messageId === "STRINGID_PKMNSNATCHEDMOVE") {
    // BattleScript_SnatchedMove (data/battle_scripts_1.s:3677-3686):
    // Cmd_snatchsetbattlers (battleScriptSnatchOpcode.ts) already reassigns
    // scriptingBattler to the original attacker (the move's victim) and
    // selectorRoles.target to the snatcher. NOT the requireMoveDefender
    // idiom: for a self-targeted victim move, snatchsetbattlers *also*
    // aliases selectorRoles.attacker to the snatcher (so
    // actionSnapshot-derived lastMoveAttacker is the snatcher, not the
    // victim, and requireMoveDefender's opposite-of-attacker would name the
    // victim twice) -- selectorRoles.target is the only source that is
    // uniformly the snatcher regardless of self-targeting, engine-supplied
    // via prepareMessage's own targetBattler field (ISSUES #108).
    if (event.payload.scriptingBattler === undefined || event.payload.targetBattler === undefined) {
      throw new Error(`battle resolution ${messageId} message has no scripting/target battler`);
    }
    const victim = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
    const snatcher = singlesBattler(event.payload.targetBattler, `${messageId} target battler`);
    return resolveBattleStringLines(messageId, {
      B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, victim),
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, snatcher),
    });
  }
  if (messageId === "STRINGID_MAGNITUDESTRENGTH") {
    // BattleScript_EffectMagnitude (data/battle_scripts_1.s:1683-1692):
    // magnitudedamagecalculation runs (and prints) BEFORE the actual hit
    // lands (goto BattleScript_HitsAllWithUndergroundBonusLoop). Cmd_magnitude
    // damagecalculation (battle_script_commands.c:8670-8710) writes the
    // rolled tier straight into gBattleTextBuff1 via PREPARE_BYTE_NUMBER_BUFFER
    // -- the same battleTextBuff1ByteNumber shape STOCKPILE/PERISHCOUNTFELL
    // already use (magnitudeHandler, battleScriptRankedBatch1Opcode.ts:130).
    // {B_BUFF1} is the only placeholder; no attacker/defender name needed.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no magnitude substitution`);
    }
    const magnitude = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => magnitude,
    });
  }
  const resolvers: Record<string, () => string> = { ...sourceSelectorResolvers };
  if (
    battleStringReferencesToken(messageId, "B_LAST_ITEM")
    && lastItemAtPrint !== undefined
  ) {
    // gLastUsedItem is frozen at Cmd_printstring. It is intentionally not
    // reconstructed from a held-item animation: Scene OFF can skip that
    // presentation receipt while the source string still prints the item.
    resolvers.B_LAST_ITEM = () => factoryItemDisplayName(lastItemAtPrint);
  }
  if (lastMoveAttacker !== null) {
    const displayed = fieldBattler(field, lastMoveAttacker);
    // Some effect scripts print their action-specific result after a
    // controller PP receipt without STRINGID_USEDMOVE (two-turn charge is
    // one source example). Supplying the already-owned attacker token is
    // generic; templates that do not reference it ignore it.
    resolvers.B_ATK_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
      side: lastMoveAttacker === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
  }
  if (
    pendingStatusMessageBattler !== null
    && resolvers.B_EFF_NAME_WITH_PREFIX === undefined
  ) {
    const displayed = fieldBattler(field, pendingStatusMessageBattler);
    // SetMoveEffect's raw REQUEST_STATUS_BATTLE receipt precedes its result
    // text. Keep that target only until the next text receipt, so a
    // B_EFF_NAME_WITH_PREFIX template is sourced from the status write—not
    // inferred from a move, species, or later battle state.
    resolvers.B_EFF_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
      side: pendingStatusMessageBattler === 0 ? "player" : "opponent",
      isTrainerBattle: true,
      nickname: displayed.name,
    });
  }
  if (pendingHeldItemEffectBattler !== null) {
    const displayed = fieldBattler(field, pendingHeldItemEffectBattler);
    // Every source held-item result script presents B_ANIM_HELD_ITEM_EFFECT
    // for the same BS_ATTACKER/BS_SCRIPTING battler before printing its text.
    // Preserve that typed controller receipt as gBattleScripting.battler's
    // presentation owner; do not rediscover the owner from a move or species.
    if (resolvers.B_SCR_ACTIVE_NAME_WITH_PREFIX === undefined) {
      resolvers.B_SCR_ACTIVE_NAME_WITH_PREFIX = () => resolveBattleNameWithPrefix({
        side: pendingHeldItemEffectBattler === 0 ? "player" : "opponent",
        isTrainerBattle: true,
        nickname: displayed.name,
      });
    }
    // gLastUsedItem is the item which fired, before the later removeitem
    // controller receipt consumes it. `heldItems` starts at the segment's
    // reducer boundary and follows any typed item writes in event order.
    if (resolvers.B_LAST_ITEM === undefined) {
      resolvers.B_LAST_ITEM = () => factoryItemDisplayName(
        heldItems[pendingHeldItemEffectBattler],
      );
    }
  }
  return resolveBattleStringLines(messageId, resolvers);
}

function partyBallStates(
  rules: BattleScriptRulesContext,
  battler: 0 | 1,
): readonly PartyBallState[] {
  const party = battler === 0
    ? rules.party.player
    : rules.party.opponent;
  return Object.freeze(party.map((member): PartyBallState => {
    if (member.species === 0 || member.isEgg) return "empty";
    if (member.hp === 0) return "fainted";
    if (member.status1 !== 0) return "status";
    return "healthy";
  }));
}

/**
 * The incoming battler's source-boundary snapshot. Prefer the genuine next
 * command field when it exists, because a returning party member can carry
 * earlier HP/status/PP history that the reducer materializes while switching.
 * Then rewind only mutations proven by later ordered receipts: the first
 * post-switch HP command's `from` is the healthbox at switch time, and a later
 * status-controller write means the party record owns the prior icon. This
 * keeps a same-turn 153->66 hit from being applied before its command (ISSUES
 * #85 seed 0), while retaining earlier damage/status on a returning battler
 * (seed 6). With no command boundary, the pre-transition party is the only
 * source snapshot (the incoming mon can faint in the same turn; signature 6).
 */
function switchInIncomingSnapshot(
  beforeRules: BattleScriptRulesContext,
  afterRules: BattleScriptRulesContext,
  afterField: BattleResolutionDisplayedField | null,
  events: readonly BattleKernelSemanticEvent[],
  eventIndex: number,
  battler: 0 | 1,
  toPartyIndex: BattlePartyIndex,
): Readonly<{ field: BattleCommandFieldBattler; status1: number }> {
  const party = battler === 0
    ? beforeRules.party.player
    : beforeRules.party.opponent;
  const member = party[toPartyIndex]!;
  const partyField = battleCommandFieldBattlerFromPartyMember(
    battler === 0 ? "player" : "trainer",
    battler,
    toPartyIndex,
    member,
  );
  const settled = afterField === null ? null : fieldBattler(afterField, battler);
  const hasSettledIncoming = settled?.partyIndex === toPartyIndex;
  const later = events.slice(eventIndex + 1);
  const firstHp = later.find(({ payload }) =>
    payload.kind === "hp-change" && payload.battler === battler
  )?.payload;
  const hasLaterStatusWrite = later.some(({ payload }) =>
    (payload.kind === "set-battler-status-data"
      || payload.kind === "status-icon-update")
    && payload.battler === battler
  );
  const status1 = hasSettledIncoming && !hasLaterStatusWrite
    ? afterRules.battlers[battler]!.status1
    : member.status1;
  const field = hasSettledIncoming
    ? Object.freeze({
        ...settled,
        hp: firstHp?.kind === "hp-change" ? firstHp.from : settled.hp,
        status: hasLaterStatusWrite ? partyField.status : settled.status,
      })
    : partyField;
  return Object.freeze({
    field,
    status1,
  });
}

function fieldAfter(
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
): BattleResolutionDisplayedField | null {
  if (
    transition.state.boundary.kind !== "decision-required"
    || transition.state.boundary.request.kind !== "command"
  ) return null;
  return createBattleCommandDisplayedField(transition.state.rules.rulesContext);
}

/** sc106: Double Team (104), whose accepted live window (liveMoveAnimation.ts, 230 rows) already contains its stats change. */
const STATS_CHANGE_OWNING_LIVE_MOVE_IDS: ReadonlySet<number> = new Set([104]);

/**
 * sc106: whether a STATS_CHANGE of `battler` presents a stats-change command after the commands `before` it.
 * - Not behind a Substitute: the ROM's controller skips the animation while the battler is behind its Substitute
 *   (battle_gfx_sfx_util.c TryHandleLaunchBattleTableAnimation, stat101 receipt harden-behind-sub: 1 row). The fact used is
 *   the displayed Substitute doll at the command's start (BattleCommandFieldBattler.substituteDoll after the preceding
 *   commands: the segment field's doll, set after a Substitute body, cleared at the fade / faint / switch-out, a switch-in's
 *   incoming snapshot), the same fact the renderer draws the doll from.
 * - Not right after a Double Team body of the same battler that has a live duration (Scene ON; Scene OFF has no such command):
 *   its window already presents the stats change through the row before the next message (docs/sc106-stats-change-command.md).
 */
function statsChangePresented(
  field: BattleResolutionDisplayedField,
  before: readonly BattleResolutionPresentationCommand[],
  battler: 0 | 1,
): boolean {
  const atStart = battleResolutionFieldBeforeCommand(field, before, before.length);
  if ((battler === 0 ? atStart.player : atStart.opponent).substituteDoll === true) return false;
  const previous = before[before.length - 1];
  return !(
    previous?.type === "move-animation"
    && previous.battler === battler
    && previous.animation !== undefined
    && STATS_CHANGE_OWNING_LIVE_MOVE_IDS.has(previous.animation.moveId)
    && liveMoveAnimationDuration(previous.animation, battleResolutionFieldBeforeCommand(field, before, before.length - 1)) !== null
  );
}

/**
 * scf117 (ISSUES #166, docs/scf117-stats-change-finish.md; olnd113's joint-target fix shape): the stats-change command
 * covers rel 1 .. 76 / 90, so the next command starts on rel 77 / 91, the row of the animation's next script instruction.
 * The ROM shows the first glyph of the following print one row after the print executes, `delta(print) - delta(STATS_CHANGE)
 * - 1` interpreter executions (one row each) after rel 77 / 91: Bulk Up's setstatchanger + statbuffchange + jumpifbyte, or
 * AllStatsUp's two (issue69: write 283, box clear 285). The `stat` commands in between draw nothing; their frames are
 * subtracted (the off108 pause convention). Anything else in between, or no provenance: 0.
 */
function statsChangeNextReceiptHoldFrames(
  events: readonly BattleKernelSemanticEvent[],
  statsChangeSequence: number,
  following: readonly BattleResolutionPresentationCommand[],
): number {
  const statsChange = events.find((event) => event.sequence === statsChangeSequence)?.provenance?.instructionExecution;
  if (statsChange === undefined) return 0;
  let presented = 0;
  for (const command of following) {
    if (command.type === "stat") {
      presented += command.timing.minimumFrames;
      continue;
    }
    if (command.type !== "message") return 0;
    const print = events.find((event) => event.sequence === command.eventSequence)?.provenance?.instructionExecution;
    if (print === undefined || print <= statsChange) return 0;
    const lead = 1;
    return Math.max(0, print - statsChange - 1 + lead - presented);
  }
  return 0;
}

export function projectBattleResolutionCommands(
  events: readonly BattleKernelSemanticEvent[],
  beforeRules: BattleScriptRulesContext,
  afterRules: BattleScriptRulesContext,
  field: BattleResolutionDisplayedField,
  afterField: BattleResolutionDisplayedField | null,
  opponentTrainer: BattleResolutionOpponentTrainer | null = null,
  usedMessageHoldFrames = 0,
): readonly BattleResolutionPresentationCommand[] {
  const commands: BattleResolutionPresentationCommand[] = [];
  const pendingHealth = new Map<0 | 1, { eventSequence: number; healthValue: number; instructionExecution: number | undefined }>();
  let leechDrainAnimated = false;
  const pendingSwitch = new Map<
    0 | 1,
    { eventSequence: number; fromPartyIndex: BattlePartyIndex; toPartyIndex: BattlePartyIndex }
  >();
  // -3 so the ISSUES #78 voluntary-switch seam's synthesized recall receipts
  // (sequences -2/-1) sort ahead of every real kernel event (sequence 0+).
  let lastSequence = -3;
  let lastStatChange: Extract<
    BattleScriptSemanticEventPayload,
    { kind: "stat-stage-change" }
  > | null = null;
  let lastFaintBattler: 0 | 1 | null = null;
  let pendingStatusMessageBattler: 0 | 1 | null = null;
  let lastMoveAttacker: 0 | 1 | null = null;
  // Target of the latest Scene ON MOVE_ANIMATION receipt (Scene OFF has none): its `returntoball` is the forced removal.
  let sceneOnMoveTarget: 0 | 1 | null = null;
  // plr162 / snd182: battlers whose forced `returntoball BS_TARGET` (Roar / Whirlwind) removal awaits its send-in (both scenes).
  const forcedDraggedOut = new Set<0 | 1>();
  let pendingHeldItemEffectBattler: 0 | 1 | null = null;
  const heldItems = [
    beforeRules.battlers[0]!.item,
    beforeRules.battlers[1]!.item,
  ] as [number, number];
  let usedMoveInstructionExecution: number | null = null;
  // off108: the opener print's event index and the command count after it.
  let pauseOpenerIndex: number | null = null;
  let pauseOpenerCommands = 0;
  let pauseOpenerFrames = 0;
  const zeroHpBattlers = new Set<0 | 1>();
  const fieldArt = createBattleCommandFieldArtView(field);
  // `gBattlerPartyIndexes[battler]` (battle_message.c's `BufferStringBattle`
  // name source) updates at `Cmd_getswitchedmondata`, before the incoming
  // mon's own STRINGID_SWITCHINMON print -- and stays updated for every later
  // print in the same segment (a post-switch-in weather tick, ability
  // activation, etc). `field` is this segment's pre-resolution snapshot;
  // `currentField` tracks the same shape but is replaced per-battler at each
  // switch-in below, so `messageLines` and the faint command always resolve
  // the battler slot's CURRENT occupant, never a stale pre-switch one
  // (ISSUES #115).
  let currentField: BattleResolutionDisplayedField = field;
  const substituteFades: { at: number; battler: 0 | 1; sequence: number }[] = [];
  const statsChanges: { at: number; battler: 0 | 1; sequence: number; argument: number; frames: number; seGate: number }[] = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (!Number.isSafeInteger(event.sequence) || (event.sequence <= lastSequence && event.provenance?.dispatcher !== SYNTHESIZED_SWITCH_DISPATCHER)) {
      throw new Error(
        `battle resolution event sequence ${event.sequence} is not strictly increasing after ${lastSequence}`,
      );
    }
    if (event.provenance?.dispatcher !== SYNTHESIZED_SWITCH_DISPATCHER) lastSequence = event.sequence;
    const payload = event.payload;
    if (payload.kind === "animation" && payload.animationId === "LEECH_SEED_DRAIN") leechDrainAnimated = true;
    if (payload.kind === "set-battler-pp-data") {
      lastMoveAttacker = singlesBattler(payload.battler, "PP update");
      continue;
    }
    if (payload.kind === "message") {
      sourceLabelOf(event);
      const actionSnapshot = payload.actionSnapshot ?? null;
      if (actionSnapshot !== null) {
        // The full-turn receipt is frozen at Cmd_printstring time. Keeping
        // this current message's source owner also makes generic subsequent
        // attacker templates independent of controller PP timing.
        lastMoveAttacker = singlesBattler(
          actionSnapshot.attacker,
          "message action snapshot",
        );
      }
      if (payload.messageId === "STRINGID_USEDMOVE") {
        usedMoveInstructionExecution = instructionExecutionOf(event);
        if (actionSnapshot === null) {
          // Synthetic fixtures that predate the frozen snapshot retain the
          // former PP-receipt bridge deliberately.
          lastMoveAttacker = singlesBattler(
            ppEventAfter(events, index).battler,
            "used-move message",
          );
        }
      }
      const switchInBattler = payload.messageId === "STRINGID_SWITCHINMON"
        ? ([...pendingSwitch.keys()].at(-1) ?? null)
        : null;
      const switchInIncoming = switchInBattler === null
        ? null
        : switchInIncomingSnapshot(
          beforeRules,
          afterRules,
          afterField,
          events,
          index,
          switchInBattler,
          pendingSwitch.get(switchInBattler)!.toPartyIndex,
        ).field;
      commands.push(Object.freeze({
        type: "message",
        eventSequence: event.sequence,
        lines: messageLines(
          event,
          index,
          events,
          currentField,
          switchInBattler,
          switchInIncoming,
          lastStatChange,
          lastFaintBattler,
          pendingStatusMessageBattler,
          lastMoveAttacker,
          pendingHeldItemEffectBattler,
          heldItems,
          actionSnapshot,
          opponentTrainer,
        ),
        advance:
          payload.messageId === "STRINGID_TARGETFAINTED"
          || payload.messageId === "STRINGID_ATTACKERFAINTED"
          || TERMINAL_SEAM_BUTTON_MESSAGE_IDS.has(payload.messageId)
            ? "button"
            : "automatic",
        ...(payload.messageId === "STRINGID_TARGETFAINTED"
          || payload.messageId === "STRINGID_ATTACKERFAINTED"
          ? { faintBattler: lastFaintBattler! }
          : {}),
        noCursor: TERMINAL_SEAM_QUOTE_MESSAGE_IDS.has(payload.messageId),
        // msg175 (docs/msg175-used-message-duration.md): the attackstring print runs one glyph per row, first glyph -> final
        // glyph G in exactly its printable length L (line breaks cost no row; 67 / 67 ROM uses, both scenes), and the next
        // presented event starts on G + 1. So the typing term is L itself, never the 24-frame `MESSAGE_TIMING` floor: the
        // route-scoped hold (`docs/battle-message-pacing-ground-truth.md` §3.3, the 23-glyph "…used\nSPLASH!" clears at
        // +62) and off108's source-pause hold both count from G.
        timing: payload.messageId === "STRINGID_USEDMOVE"
          ? Object.freeze({
            minimumFrames: 0,
            holdFrames: usedMessageHoldFrames > 0
              ? usedMessageHoldFrames
              : sourcePauseUsedMoveHoldFrames(events, index) ?? 0,
          })
          : payload.messageId === "STRINGID_RETURNMON"
            ? RETURN_MON_TIMING
            : payload.messageId === "STRINGID_SWITCHINMON"
              ? SWITCH_IN_MESSAGE_TIMING
              : (() => {
                const base = messageTimingFromSourceProvenance(event)
                  ?? (WAITMESSAGE_LONG_MESSAGE_IDS.has(payload.messageId)
                  ? WAITMESSAGE_LONG_TIMING
                  : MESSAGE_TIMING);
                return focusPunchPrePassMessageTiming(events, index, base) ?? chargeTurnEmptyBoxTiming(events, index) ?? base;
              })(),
      }));
      if (payload.messageId === "STRINGID_USEDMOVE" || payload.messageId === "STRINGID_EMPTYSTRING3") {
        pauseOpenerIndex = index;
        pauseOpenerCommands = commands.length;
        // chg161: the charge-turn box starts on off108's G + 1 (a USEDMOVE ends on G), so the Scene OFF pause counts it.
        pauseOpenerFrames = chargeTurnEmptyBoxTiming(events, index)?.minimumFrames ?? 0;
      }
      pendingStatusMessageBattler = null;
      pendingHeldItemEffectBattler = null;
      continue;
    }
    if (payload.kind === "trainer-slide-in" || payload.kind === "trainer-slide-out") {
      commands.push(Object.freeze({
        type: "trainer-slide",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler, "trainer slide"),
        direction: payload.kind === "trainer-slide-in" ? "in" as const : "out" as const,
        timing: TRAINER_SLIDE_TIMING,
      }));
      continue;
    }
    if (payload.kind === "animation" && payload.animationId === "FOCUS_PUNCH_SETUP") {
      const battler = singlesBattler(payload.battler ?? -1, "focus punch setup");
      // gBattleSpritesDataPtr->battlerData[].behindSubstitute at the turn's start = the battler's STATUS2_SUBSTITUTE.
      const behindSubstitute = (beforeRules.battlers[battler]!.status2 & FOCUS_PUNCH_STATUS2_SUBSTITUTE) !== 0;
      commands.push(Object.freeze({
        type: "general-animation",
        eventSequence: event.sequence,
        battler,
        animation: "FOCUS_PUNCH_SETUP",
        timing: Object.freeze({
          minimumFrames: behindSubstitute ? FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES : FOCUS_PUNCH_SETUP_COMMAND_FRAMES,
        }),
      }));
      continue;
    }
    if (payload.kind === "animation" && payload.animationId === "SUBSTITUTE_FADE") {
      substituteFades.push({
        at: commands.length, battler: singlesBattler(payload.battler ?? -1, "substitute fade"), sequence: event.sequence,
      });
      continue;
    }
    if (payload.kind === "animation" && payload.animationId === "STATS_CHANGE") {
      const params = statsChangeParams(Number(payload.arguments[0]));
      if (params !== null) {
        const seGate = sgs134RequestSeGate(events, index);
        statsChanges.push({
          at: commands.length, battler: singlesBattler(payload.battler ?? -1, "stats change"), sequence: event.sequence,
          argument: params.animArg, frames: seGate + statsChangeSpan(params).addedRows, seGate,
        });
      }
      continue;
    }
    if (
      payload.kind === "animation"
      && payload.animationId === "HELD_ITEM_EFFECT"
    ) {
      pendingHeldItemEffectBattler = singlesBattler(
        payload.battler ?? -1,
        "held-item effect animation",
      );
      continue;
    }
    if (
      payload.kind === "animation"
      && (
        payload.animationId === "MOVE_ANIMATION"
        || payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
      )
    ) {
      const battler = singlesBattler(payload.battler ?? -1, "attack pause");
      if (payload.animationId === "MOVE_ANIMATION") {
        const animation = battleMoveAnimationRequest(battler, payload.target, payload.arguments);
        sceneOnMoveTarget = animation.target === battler ? null : animation.target;
        commands.push(Object.freeze({
          type: "move-animation",
          eventSequence: event.sequence,
          battler,
          animation,
          // An unadapted move retains a bounded pause, explicitly reported by
          // the readiness registry. No substitute effect receives exact credit.
          timing: Object.freeze({
            minimumFrames: SCENE_OFF_MOVE_PAUSE_FRAMES, ...moveAnimationSeGateTiming(events, index), ...moveAnimationScriptLeadTiming(events, index),
            ...moveAnimationScriptTailTiming(
              events, index, usedMoveInstructionExecution,
              commandsPresentedSinceUsedPrint(events, pauseOpenerIndex, commands.slice(pauseOpenerCommands), field),
            ),
          }),
        }));
        continue;
      }
      const hit = nextHitAnimation(events, index);
      if (hit === null) {
        // An attack receipt without a hit receipt has no target hit/drain
        // choreography. Existing typed effect/status commands own its
        // controller-specific presentation; Scene OFF still runs
        // BattleScript_Pausex20 for it (off108, ISSUES #167).
        const pause = payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
          ? sceneOffNoHitPauseFrames(events, index, pauseOpenerIndex, commands.slice(pauseOpenerCommands), pauseOpenerFrames)
          : null;
        if (pause !== null) {
          commands.push(Object.freeze({
            type: "move-animation",
            eventSequence: event.sequence,
            battler,
            timing: Object.freeze({ minimumFrames: pause }),
          }));
        }
        continue;
      }
      if (usedMoveInstructionExecution === null) continue;
      const hitExecution = instructionExecutionOf(hit);
      // The interpreter provenance counts Cmd_pause's initial execution plus
      // each of B_WAIT_TIME_SHORT's blocked retries. The visual command owns
      // that source pause below, so exclude those callback executions before
      // applying the same attack-string-to-hit formula used by the controller
      // MOVE_ANIMATION receipt.
      const executedPauseCallbacks =
        payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
          ? SCENE_OFF_MOVE_PAUSE_FRAMES + 1
          : 0;
      const interveningInstructions =
        hitExecution - usedMoveInstructionExecution - executedPauseCallbacks;
      if (interveningInstructions <= 0) {
        throw new Error("battle resolution move/hit provenance is not ordered");
      }
      commands.push(Object.freeze({
        type: "move-animation",
        eventSequence: event.sequence,
        battler,
        // The attack-string text printer releases one callback after the
        // final displayed glyph. Then every source instruction through
        // Cmd_hitanimation runs once, while Scene OFF substitutes the
        // attackanimation command with BattleScript_Pausex20.
        timing: Object.freeze({
          minimumFrames:
            1 + interveningInstructions + SCENE_OFF_MOVE_PAUSE_FRAMES,
        }),
      }));
      continue;
    }
    if (
      payload.kind === "animation"
      && payload.animationId === "HIT_ANIMATION"
    ) {
      commands.push(Object.freeze({
        type: "hit-animation",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler ?? -1, "hit animation"),
        timing: HIT_ANIMATION_TIMING,
      }));
      continue;
    }
    if (payload.kind === "health-bar-update") {
      const battler = singlesBattler(payload.battler, "health-bar update");
      if (pendingHealth.has(battler)) {
        throw new Error(`battle resolution has two unpaired HP updates for battler ${battler}`);
      }
      pendingHealth.set(battler, {
        eventSequence: event.sequence,
        healthValue: payload.healthValue,
        instructionExecution: event.provenance?.instructionExecution,
      });
      continue;
    }
    if (payload.kind === "hp-change") {
      const battler = singlesBattler(payload.battler, "HP change");
      const health = pendingHealth.get(battler);
      if (!health) {
        throw new Error(`battle resolution HP change for battler ${battler} has no health-bar update`);
      }
      pendingHealth.delete(battler);
      const drainRole = leechSeedDrainRole(events, index);
      if (drainRole === "seeded") {
        commands.push(Object.freeze({
          type: "general-animation",
          eventSequence: health.eventSequence,
          battler,
          animation: "LEECH_SEED_DRAIN",
          timing: Object.freeze({
            minimumFrames: LEECH_SEED_DRAIN_PRE_ROWS + health.instructionExecution!
              + (leechDrainAnimated ? LEECH_SEED_DRAIN_ANIMATION_ROWS - 1 : 0),
          }),
        }));
      }
      leechDrainAnimated = false;
      commands.push(Object.freeze({
        type: "hp",
        eventSequence: health.eventSequence,
        battler,
        from: payload.from,
        to: payload.to,
        healthValue: health.healthValue,
        timing: drainRole === "seeded" ? LEECH_SEED_DRAIN_SEEDED_HP_TIMING
          : drainRole === "receiver" ? LEECH_SEED_DRAIN_RECEIVER_HP_TIMING : hpPrintTailTiming(event),
      }));
      if (payload.to === 0) zeroHpBattlers.add(battler);
      continue;
    }
    if (payload.kind === "stat-stage-change") {
      const battler = singlesBattler(payload.battler, "stat change");
      lastStatChange = payload;
      // Soak signature 7 (docs/soak-crash-catalog.md §7): a clamped change
      // (stage already at +-6, B_MSG_STAT_WONT_CHANGE) draws NO stat banner
      // in source -- BattleScript_EffectStatUp/StatDown route AROUND
      // setgraphicalstatchangevalues + playanimation B_ANIM_STATS_CHANGE
      // straight to the print (data/battle_scripts_1.s:495-497 StatUp,
      // :541-544 StatDown), so only STRINGID_STATSWONTINCREASE/DECREASE
      // shows (the canonical turn-11 ATK-floor window renders exactly this
      // way). Keep lastStatChange: that following wont-change message's
      // battler/stat resolve from this event.
      if (payload.from !== payload.to) {
        commands.push(Object.freeze({
          type: "stat",
          eventSequence: event.sequence,
          battler,
          stat: payload.stat,
          from: payload.from,
          to: payload.to,
          timing: STAT_TIMING,
        }));
      }
      continue;
    }
    if (payload.kind === "set-battler-status-data") {
      const battler = singlesBattler(payload.battler, "status change");
      pendingStatusMessageBattler = battler;
      const sceneOffStatus = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
        ? sceneOffStatusFrames(events, index, pauseOpenerIndex, commands.length - pauseOpenerCommands)
        : sceneOnStatusFrames(events, index);
      commands.push(Object.freeze({
        type: "status",
        eventSequence: event.sequence,
        battler,
        before: beforeRules.battlers[battler]!.status1,
        after: payload.status1,
        timing: sceneOffStatus === null ? STATUS_TIMING : Object.freeze({ minimumFrames: sceneOffStatus }),
      }));
      continue;
    }
    if (payload.kind === "status-animation") {
      const animation = statusAnimationPresented(payload.isStatus2, payload.status);
      if (animation !== null) {
        const seGate = statusAnimationSeGate(events, index);
        commands.push(Object.freeze({
          type: "status-animation",
          eventSequence: event.sequence,
          battler: singlesBattler(payload.battler, "status animation"),
          animation,
          timing: Object.freeze({
            minimumFrames: seGate + STATUS_ANIMATION_ADDED_ROWS[animation], ...(seGate > 0 ? { seGateFrames: seGate } : {}),
          }),
        }));
      }
      continue;
    }
    if (payload.kind === "set-battler-item") {
      const battler = singlesBattler(payload.battler, "held-item update");
      heldItems[battler] = payload.item;
      continue;
    }
    if (payload.kind === "status-icon-update") {
      pendingStatusMessageBattler = null;
      commands.push(Object.freeze({
        type: "status-icon",
        eventSequence: event.sequence,
        battler: singlesBattler(payload.battler, "status icon update"),
        status1: payload.status1,
        status2: payload.status2,
        timing: STATUS_ICON_TIMING,
      }));
      continue;
    }
    if (payload.kind === "set-battler-sprite-visibility") {
      const battler = singlesBattler(payload.battler, "sprite visibility");
      // ISSUES #78 slice 4: the synthesized voluntary-switch return-atk-to-ball
      // receipt is the real `CONTROLLER_RETURNMONTOBALL` round-trip -- a
      // 32-frame span, not the 1-frame visibility toggle. Emit a switch-out
      // command (the outgoing mon's scale-up + teardown, rendered from the
      // switch-out view) ahead of the recall receipt that commits the hidden
      // sprite/healthbox after the span.
      // Scene ON: Roar/Whirlwind's `returntoball BS_TARGET` after a MOVE_ANIMATION receipt on that target (Baton Pass's
      // `returntoball BS_ATTACKER` keeps the voluntary-style span below); Scene OFF: every `returntoball` (offs152).
      // offs152: in Scene OFF every `returntoball` receipt is the forced removal (no body; the target is drawn at rest).
      const returnToBall = event.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL" && payload.invisible;
      const sceneOffRemoval = returnToBall && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
      const forcedRemoval = returnToBall && (sceneOffRemoval || sceneOnMoveTarget === battler);
      if (forcedRemoval) sceneOnMoveTarget = null;
      if (forcedRemoval && returnToBallOperand(event) === "BS_TARGET") forcedDraggedOut.add(battler);
      const removalGap = sceneOffRemoval && returnToBallOperand(event) === "BS_ATTACKER"
        ? SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES
        : FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES;
      if (
        event.provenance?.opcodeName === "B_SCR_OP_RETURNATKTOBALL"
        || event.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL"
      ) {
        commands.push(Object.freeze({
          type: "switch-out",
          eventSequence: event.sequence,
          battler,
          ...(sceneOffRemoval
            ? SCENE_OFF_FORCED_SWITCH_OUT
            : forcedRemoval
              ? { timing: FORCED_SWITCH_OUT_TIMING, skipAnimation: true as const }
              : { timing: SWITCH_OUT_TIMING }),
        }));
      }
      const transitionPause = event.provenance?.opcodeName === "B_SCR_OP_MOVEEND"
        ? actionTransitionPauseFrames(events, index, commands)
        : null;
      if (transitionPause !== null) {
        commands.push(Object.freeze({
          type: "move-animation",
          ...((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0 ? { actionTransition: true as const } : {}),
          eventSequence: event.sequence,
          battler,
          timing: Object.freeze({ minimumFrames: transitionPause }),
        }));
      }
      commands.push(Object.freeze({
        type: "sprite-visibility",
        eventSequence: event.sequence,
        battler,
        visible: !payload.invisible,
        // Each of BtlController_EmitReturnMonToBall/EmitSpriteInvisibility is
        // one controller callback; the receipt itself owns the relative
        // display edge. The forced removal holds until `switchinanim`.
        timing: Object.freeze({
          minimumFrames: forcedRemoval ? removalGap : 1 as const,
        }),
        // See the "sprite-visibility" command type's own doc comment: the
        // real CONTROLLER_RETURNMONTOBALL receipts are Cmd_various's
        // VARIOUS_RETURN_OPPONENT_MON1/MON2 case and the voluntary-switch
        // `Cmd_returnatktoball` sibling (PlayerHandleReturnMonToBall,
        // battle_controller_player.c:2227-2242 -- both free the sprite AND
        // SetHealthboxSpriteInvisible). The synthesized voluntary-switch
        // receipt (ISSUES #78 seam) carries the returnatktoball provenance.
        recall: event.provenance?.opcodeName === "B_SCR_OP_VARIOUS"
          || event.provenance?.opcodeName === "B_SCR_OP_RETURNATKTOBALL"
          || event.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL",
      }));
      continue;
    }
    if (payload.kind === "faint-animation") {
      const battler = singlesBattler(payload.battler, "faint animation");
      if (!zeroHpBattlers.has(battler)) {
        throw new Error(
          `battle resolution faint animation for battler ${battler} has no zero-HP event`,
        );
      }
      const timing: BattleFaintTiming = battler === 1
        ? (() => {
            const steps = 8 - Math.floor(fieldArt.opponent.coords.yOffset / 8);
            const healthboxVanishFrame = 2 * steps + 3;
            return Object.freeze({
              minimumFrames: healthboxVanishFrame + 2,
              sink: "opponent-tile-rows" as const,
              steps,
              healthboxVanishFrame,
            });
          })()
        : (() => {
            const spriteRows = fieldArt.player.pic.tileset.rows * 8;
            const healthboxVanishFrame = Math.ceil(spriteRows / 5) + 5;
            return Object.freeze({
              minimumFrames: healthboxVanishFrame + 2,
              sink: "player-pixel-rows" as const,
              pixelsPerFrame: 5 as const,
              spriteRows,
              healthboxVanishFrame,
            });
          })();
      commands.push(Object.freeze({
        type: "faint",
        eventSequence: event.sequence,
        battler,
        partyIndex: fieldBattler(currentField, battler).partyIndex,
        timing,
      }));
      lastFaintBattler = battler;
      continue;
    }
    if (
      payload.kind === "draw-party-status-summary"
      || payload.kind === "hide-party-status-summary"
    ) {
      const battler = singlesBattler(payload.battler, "party summary");
      commands.push(Object.freeze({
        type: "party-summary",
        eventSequence: event.sequence,
        battler,
        visible: payload.kind === "draw-party-status-summary",
        states: partyBallStates(afterRules, battler),
        timing: payload.kind === "draw-party-status-summary" && battler === 0
          ? PARTY_SUMMARY_DRAW_TIMING
          : undefined,
      }));
      continue;
    }
    if (payload.kind === "switch") {
      const battler = payload.side === "player" ? 0 : 1;
      const fromPartyIndex = payload.fromPartyIndex as BattlePartyIndex;
      const toPartyIndex = payload.toPartyIndex as BattlePartyIndex;
      if (
        fromPartyIndex < 0 || fromPartyIndex > 5
        || toPartyIndex < 0 || toPartyIndex > 5
      ) {
        throw new Error("battle resolution switch party index is outside 0..5");
      }
      pendingSwitch.set(battler, {
        eventSequence: event.sequence,
        fromPartyIndex,
        toPartyIndex,
      });
      continue;
    }
    if (payload.kind === "switch-in-animation") {
      const battler = singlesBattler(payload.battler, "switch-in animation");
      const switched = pendingSwitch.get(battler);
      if (!switched) {
        throw new Error(
          `battle resolution switch-in marker for battler ${battler} has no preceding switch event`,
        );
      }
      if (payload.partyIndex !== switched.toPartyIndex) {
        throw new Error(
          `battle resolution switch-in marker for battler ${battler} does not match its switch receipt`,
        );
      }
      const incoming = switchInIncomingSnapshot(
        beforeRules,
        afterRules,
        afterField,
        events,
        index,
        battler,
        switched.toPartyIndex,
      );
      pendingSwitch.delete(battler);
      // This battler slot's occupant just committed (mirrors
      // `gBattlerPartyIndexes[battler]`); every subsequent name resolution in
      // this segment must see the incoming mon, not the one it replaced.
      currentField = battler === 0
        ? Object.freeze({ ...currentField, player: incoming.field })
        : Object.freeze({ ...currentField, opponent: incoming.field });
      const sceneOn = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0;
      const speciesTail = battler === 1 && sceneOn;
      const forcedPlayer = battler === 0 && forcedDraggedOut.has(0);
      forcedDraggedOut.delete(battler);
      commands.push(Object.freeze({
        type: "switch-in",
        eventSequence: event.sequence,
        battler,
        fromPartyIndex: switched.fromPartyIndex,
        toPartyIndex: switched.toPartyIndex,
        incoming: incoming.field,
        incomingStatus1: incoming.status1,
        timing: switchInTiming(battler, incoming.field.species, sceneOn, incoming.field.name, forcedPlayer, incoming.field.personality),
        settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES,
        ...(forcedPlayer ? {
          // plr162 / snd182: the forced player tail (slide 65; CASTFORM's whole send-in +1).
          healthboxSlideElapsed: sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(incoming.field.species),
          sendInVisualDelay: sceneOffPlayerForcedSwitchInVisualDelay(incoming.field.species),
        } : {}),
        ...(speciesTail ? {
          healthboxSlideElapsed: opponentSwitchInHealthboxSlideElapsed(incoming.field.species),
          sendInVisualDelay: opponentSwitchInVisualDelay(incoming.field.species),
        } : battler === 1 ? {
          // offs152: the Scene OFF opponent tail (no front animation).
          healthboxSlideElapsed: sceneOffOpponentSwitchInHealthboxSlideElapsed(incoming.field.species),
          sendInVisualDelay: sceneOffOpponentSwitchInVisualDelay(incoming.field.species),
          skipFrontAnimation: true as const,
          ...(() => {
            const lag = sceneOffOpponentSwitchInLagElapsed(incoming.field.species, incoming.field.name);
            return lag === null ? {} : { sendInLagElapsed: lag };
          })(),
        } : {}),
      }));
    }
  }
  if (pendingHealth.size !== 0) {
    throw new Error("battle resolution has an unpaired health-bar update");
  }
  if (pendingSwitch.size !== 0) {
    throw new Error(
      "battle resolution switch has no switch-in-animation presentation marker",
    );
  }
  for (const fade of substituteFades) {
    const at = commands.findIndex((command, index) => index >= fade.at && command.type === "message");
    const message = commands[at];
    if (message?.type === "message") {
      commands[at] = Object.freeze({ ...message, substituteFadeBattler: fade.battler });
    }
  }
  // The fade command itself, after whatever the queue last showed (the dismissed STRINGID_SUBSTITUTEDMG) and before the
  // "faded" message; and each stats-change command at its STATS_CHANGE event. Inserted in (position, event) order.
  const inserts = [
    ...substituteFades.map((fade) => ({ at: fade.at, sequence: fade.sequence, fade, statsChange: null })),
    ...statsChanges.map((statsChange) => ({ at: statsChange.at, sequence: statsChange.sequence, fade: null, statsChange })),
  ].sort((a, b) => a.at - b.at || a.sequence - b.sequence);
  if (inserts.length !== 0) {
    const ordered: BattleResolutionPresentationCommand[] = [];
    let next = 0;
    for (let index = 0; index <= commands.length; index += 1) {
      for (; next < inserts.length && inserts[next]!.at === index; next += 1) {
        const { fade, statsChange } = inserts[next]!;
        if (fade !== null) {
          ordered.push(Object.freeze({
            type: "substitute-fade" as const, eventSequence: fade.sequence, battler: fade.battler,
            timing: Object.freeze({ minimumFrames: substituteFadeDuration(fade.battler === 0 ? "player" : "opponent") }),
          }));
        } else if (statsChange !== null && statsChangePresented(field, ordered, statsChange.battler)) {
          ordered.push(Object.freeze({
            type: "stats-change" as const, eventSequence: statsChange.sequence, battler: statsChange.battler,
            argument: statsChange.argument, timing: Object.freeze({
              minimumFrames: statsChange.frames, ...(statsChange.seGate > 0 ? { seGateFrames: statsChange.seGate } : {}),
            }),
          }));
        }
      }
      if (index < commands.length) ordered.push(commands[index]!);
    }
    for (let index = 0; index < ordered.length; index += 1) {
      const command = ordered[index]!;
      if (command.type !== "stats-change") continue;
      const holdFrames = statsChangeNextReceiptHoldFrames(events, command.eventSequence, ordered.slice(index + 1));
      if (holdFrames > 0) {
        ordered[index] = Object.freeze({
          ...command, timing: Object.freeze({ ...command.timing, holdFrames }),
        });
      }
    }
    commands.splice(0, commands.length, ...ordered);
  }
  // snd145: an opponent FAINT REPLACEMENT that ends the turn holds its settled send-in through the source's post-`switchinanim`
  // turn-end work (`switchineffects`, the rest of `BattleScript_HandleFaintedMon`, `BattleTurnPassed`) before the action prompt.
  const last = commands[commands.length - 1];
  if (last?.type === "switch-in" && last.battler === 1 && last.healthboxSlideElapsed !== undefined && last.skipFrontAnimation !== true
    && commands.some((command) => command.type === "faint" && command.battler === 1)) {
    commands[commands.length - 1] = Object.freeze({
      ...last,
      settleHoldFrames: (last.settleHoldFrames ?? 0) + OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES,
    });
  }
  if (!commands.some(
    (command) => command.type === "message" && command.advance === "button",
  )) {
    commands.push(Object.freeze({ type: "turn-end", timing: TURN_END_TIMING }));
  }
  return Object.freeze(commands);
}

/**
 * The player-side forced-switch request a freshly published boundary is
 * waiting on, if any. Every resolution owner -- the fresh one and all three
 * continuation appenders -- derives its `forcedRequest` from its own pending
 * boundary through this one reading. `HandleFaintedMonActions` re-runs its
 * whole battler scan after each replacement is sent out
 * (`battle_util.c:1899-1946`), so a continuation receipt can publish the very
 * next forced-switch request itself: the replacement can faint to an
 * end-of-turn effect (poison, weather, Leftovers-less residual damage) inside
 * the same receipt that sent it in, and the party menu must simply open again.
 */
function pendingPlayerForcedSwitchRequest(
  boundary: BattleBoundary,
): BattleForcedSwitchRequest | null {
  return boundary.kind === "decision-required"
    && boundary.request.kind === "forced-switch"
    && boundary.request.side === "player"
    ? boundary.request
    : null;
}

export function createBattleResolutionPresentation(
  input: CreateBattleResolutionPresentationInput,
): BattleResolutionPresentationState {
  if (input.sourceRequest.side !== "player" || input.sourceRequest.battler !== 0) {
    throw new Error("battle resolution requires a player-side singles source request");
  }
  if (!input.sourceRequest.legalDecisions.some((decision) =>
    JSON.stringify(decision) === JSON.stringify(input.sourceDecision)
  )) {
    throw new Error("battle resolution source decision is not legal for its source request");
  }
  if (input.sourceDecision.kind === "use-move") {
    if (
      input.confirmHandoff === undefined
      || input.sourceDecision.moveSlot !== input.confirmHandoff.fightDisplayCursor
    ) {
      throw new Error(
        "battle resolution confirm handoff requires the confirmed move cursor",
      );
    }
  } else if (input.sourceDecision.kind !== "switch") {
    throw new Error(
      "battle resolution source decision must be a confirmed move or a voluntary switch",
    );
  }
  const field = Object.freeze({
    player: input.fieldBoundary.player,
    opponent: input.fieldBoundary.opponent,
  });
  const events = input.sourceDecision.kind === "switch"
    ? withSynthesizedSwitchRecallEvents(input.transition.events, field)
    : input.transition.events;
  const segment = Object.freeze({
    field,
    beforeRules: input.beforeRules,
    afterRules: input.transition.state.rules,
    events,
    commands: projectBattleResolutionCommands(
      events,
      input.beforeRules.rulesContext,
      input.transition.state.rules.rulesContext,
      field,
      fieldAfter(input.transition),
      input.opponentTrainer ?? null,
      input.usedMessageHoldFrames ?? 0,
    ),
  });
  const boundary = input.transition.state.boundary;
  const forcedRequest = pendingPlayerForcedSwitchRequest(boundary);
  return Object.freeze({
    resolutionId: Object.freeze({
      requestId: input.sourceRequest.requestId,
      side: "player" as const,
      battler: 0 as const,
    }),
    sourceDecision: Object.freeze({ ...input.sourceDecision }),
    segments: Object.freeze([segment]),
    segmentIndex: 0,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "confirm-handoff" as const,
      phaseElapsed: 0,
    }),
    fadeTick: 0,
    confirmHandoff: input.sourceDecision.kind === "switch"
      ? null
      : Object.freeze({
          stage: "move-selection-response" as const,
          bounceReset: false,
          fightDisplayCursor: input.confirmHandoff!.fightDisplayCursor,
          idleBounceElapsed: input.confirmHandoff!.idleBounceElapsed,
          ...(battleResolutionOpensWithFocusPunchPrePass(events) ? { focusPunchPrePass: true as const } : {}),
        }),
    field,
    pendingBoundary: boundary,
    pendingBattle: input.transition.state,
    forcedRequest,
    opponentTrainer: input.opponentTrainer ?? null,
  });
}

/**
 * ISSUES #78 seam: the kernel deliberately treats the voluntary-switch
 * `BattleScript_ActionSwitch` prelude as "presentation bookkeeping"
 * (`factoryBattleScriptFullTurnDecision.ts`'s `runVoluntarySwitchAction`
 * comment -- the RETURNMON text and the return-to-ball controller round-trip
 * mutate no rules/RNG). The presentation therefore re-synthesizes those two
 * receipts ahead of the kernel's own `draw-party-status-summary` event so the
 * live voluntary-switch route shows the real recall message before "Go! X!",
 * exactly as the forced-switch and direct-resolution tests already do. The
 * negative sequences sort before every real kernel event
 * (`docs/mid-battle-switch-presentation-ground-truth.md` §2: recall printstring
 * 1044, return-to-ball 1077+).
 */
function withSynthesizedSwitchRecallEvents(
  events: readonly BattleKernelSemanticEvent[],
  field: BattleResolutionDisplayedField,
): readonly BattleKernelSemanticEvent[] {
  const outgoing = field.player;
  const hpScale: 0 | 1 | 2 | 3 = (() => {
    const ratio = (outgoing.hp * 4) / outgoing.maxHP;
    return ratio >= 3 ? 0 : ratio >= 2 ? 1 : ratio >= 1 ? 2 : 3;
  })();
  // fpc180: CheckFocusPunch_ClearVarsBeforeTurnStarts runs the pre-pass before BattleScript_ActionSwitch, so the recall follows
  // the last FocusPunchSetUp event (the synthesized receipts keep their negative sequences; the sequence order check skips them).
  let recallAt = 0;
  while (events[recallAt]?.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT) recallAt += 1;
  return Object.freeze([
    ...events.slice(0, recallAt),
    Object.freeze({
      sequence: -2,
      payload: Object.freeze({
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: Object.freeze([]),
        introBattler: 0 as const,
        introHpScale: hpScale,
      }),
      provenance: Object.freeze({
        programCounter: -1,
        opcodeId: -1,
        opcodeName: "B_SCR_OP_PRINTSTRING",
        dispatcher: SYNTHESIZED_SWITCH_DISPATCHER,
        sourceLabel: "BattleScript_ActionSwitch",
        sourceStatementLine: -1,
        instructionExecution: -1,
      }),
    }),
    Object.freeze({
      sequence: -1,
      payload: Object.freeze({
        kind: "set-battler-sprite-visibility",
        battler: 0 as const,
        invisible: true,
      }),
      provenance: Object.freeze({
        programCounter: -1,
        opcodeId: -1,
        opcodeName: "B_SCR_OP_RETURNATKTOBALL",
        dispatcher: SYNTHESIZED_SWITCH_DISPATCHER,
        sourceLabel: "BattleScript_ActionSwitch",
        sourceStatementLine: -1,
        instructionExecution: -1,
      }),
    }),
    ...events.slice(recallAt),
  ]);
}

const CONFIRM_HANDOFF_NEXT = Object.freeze({
  "move-selection-response": "selection-accepted",
  "selection-accepted": "stop-bounce-request",
  "stop-bounce-request": "actions-confirmed",
  "actions-confirmed": "turn-order",
  "turn-order": "before-turn",
  "before-turn": "action-dispatch",
  "action-dispatch": "attack-canceler",
  "attack-canceler": "accuracy-check",
  "accuracy-check": null,
} satisfies Readonly<
  Record<
    BattleResolutionConfirmHandoffStage,
    BattleResolutionConfirmHandoffStage | null
  >
>);

/**
 * Advances one source battle-main/controller callback. The bouncer sprite
 * runs before controllers each frame, so the selection-accepted and
 * stop-bounce-request callbacks still contribute a step; once the STOP_BOUNCE
 * controller completes, the confirmed field remains frozen.
 */
export function advanceBattleResolutionConfirmHandoff(
  state: BattleResolutionPresentationState,
): BattleResolutionPresentationState {
  const handoff = state.confirmHandoff;
  if (state.lifecycle.phase !== "confirm-handoff") {
    return state;
  }
  if (handoff === null) {
    // ISSUES #78: a voluntary-switch resolution enters the confirm phase with
    // a null handoff -- no fight-menu bounce to walk. The phase is the
    // settled-field hold between the party-menu close and the recall
    // printstring (docs/mid-battle-switch-presentation-ground-truth.md §2:
    // field idle 1035-1043), then the recall message's first glyph lands at
    // the fixture's 1044 edge.
    const nextElapsed = state.lifecycle.phaseElapsed + 1;
    // fpc180: a pre-pass-opening voluntary-switch turn's empty box begins at turn order + 4, not + 6.
    const closeHold = state.sourceDecision.kind === "switch" && state.segmentIndex === 0
      && battleResolutionOpensWithFocusPunchPrePass(state.segments[0]?.events ?? [])
      ? FOCUS_PUNCH_PRE_PASS_SWITCH_CLOSE_FIELD_HOLD_FRAMES
      : PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES;
    if (nextElapsed < closeHold) {
      return Object.freeze({
        ...state,
        lifecycle: Object.freeze({
          phase: "confirm-handoff" as const,
          phaseElapsed: nextElapsed,
        }),
        fadeTick: state.fadeTick + 1,
      });
    }
    return Object.freeze({
      ...state,
      lifecycle: Object.freeze({
        phase: "presenting" as const,
        phaseElapsed: 0,
      }),
      fadeTick: state.fadeTick + 1,
    });
  }
  const nextStage = handoff.focusPunchPrePass === true && handoff.stage === "stop-bounce-request"
    ? null
    : CONFIRM_HANDOFF_NEXT[handoff.stage];
  if (nextStage === null) {
    return Object.freeze({
      ...state,
      lifecycle: Object.freeze({
        phase: "presenting" as const,
        phaseElapsed: 0,
      }),
      confirmHandoff: null,
      fadeTick: state.fadeTick + 1,
    });
  }
  const bounceRuns =
    nextStage === "selection-accepted"
    || nextStage === "stop-bounce-request";
  return Object.freeze({
    ...state,
    lifecycle: Object.freeze({
      phase: "confirm-handoff" as const,
      phaseElapsed: 0,
    }),
    confirmHandoff: Object.freeze({
      ...handoff,
      stage: nextStage,
      // EndBounceEffect destroys both invisible bouncers and writes x2/y2=0
      // when LINK_STANDBY_MSG_STOP_BOUNCE is handled
      // (battle_main.c:2940-2965).
      bounceReset:
        handoff.bounceReset || nextStage === "actions-confirmed",
      idleBounceElapsed:
        handoff.idleBounceElapsed + (bounceRuns ? 1 : 0),
    }),
    fadeTick: state.fadeTick + 1,
  });
}

export type AppendBattleResolutionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  fieldBoundary: BattleResolutionDisplayedField;
}>;

export type AppendBattleResolutionActionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  /** The completed prior segment's frozen display field. */
  fieldBoundary: BattleResolutionDisplayedField;
}>;

export type BattleResolutionLockedActionIdentity = Readonly<{
  battler: 0 | 1;
  currentMove: number;
  currentMovePosition: 0 | 1 | 2 | 3;
}>;

export type AppendBattleResolutionLockedActionContinuationInput = Readonly<{
  resolution: BattleResolutionPresentationState;
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  /** The completed charge segment's frozen display field. */
  fieldBoundary: BattleResolutionDisplayedField;
  lockedAction: BattleResolutionLockedActionIdentity;
}>;

/**
 * `Cmd_printstring` freezes the action globals at every action-owned message.
 * A continuation need not print `STRINGID_USEDMOVE`: recharge and Bide-family
 * paths print their own source strings. The frozen action tuple is therefore
 * the narrow receipt that proves this driven transition resumed the retained
 * action rather than merely containing another battler's result text.
 */
function matchesRetainedLockedActionSnapshot(
  snapshot: BattleScriptActionMessageSnapshot | undefined,
  lockedAction: BattleResolutionLockedActionIdentity,
): boolean {
  return snapshot !== undefined
    && Object.isFrozen(snapshot)
    && snapshot.attacker === lockedAction.battler
    && snapshot.currentMove === lockedAction.currentMove
    && snapshot.currentMovePosition === lockedAction.currentMovePosition;
}

/**
 * Exported so a caller about to retain a resolution owner across a command
 * boundary (factoryRoundBattleOrchestrator.ts's beginCommandResolution) can
 * check the receipt before committing to the continuation: FaintClearSetData
 * (battle_main.c:3272) unconditionally zeroes status2 on faint, so a locked
 * battler that had STATUS2_MULTIPLETURNS/STATUS2_RECHARGE set can still be
 * KO'd by the other battler's own turn before its continuation ever prints —
 * a real, reachable game outcome, not a stale snapshot.
 */
export function hasRetainedLockedActionReceipt(
  events: readonly BattleKernelSemanticEvent[],
  lockedAction: BattleResolutionLockedActionIdentity,
): boolean {
  return events.some(({ payload }) =>
    payload.kind === "message"
    && matchesRetainedLockedActionSnapshot(payload.actionSnapshot, lockedAction)
  );
}

function appendResolutionSegment(
  resolution: BattleResolutionPresentationState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  fieldBoundary: BattleResolutionDisplayedField,
): BattleResolutionSegment {
  const priorSequence = resolution.segments
    .flatMap((segment) => segment.events)
    .at(-1)?.sequence ?? -1;
  const firstSequence = transition.events[0]?.sequence;
  if (firstSequence !== undefined && firstSequence <= priorSequence) {
    throw new Error(
      `battle resolution continuation event sequence ${firstSequence} is not after ${priorSequence}`,
    );
  }
  return Object.freeze({
    field: fieldBoundary,
    beforeRules: resolution.pendingBattle.rules,
    afterRules: transition.state.rules,
    events: transition.events,
    commands: projectBattleResolutionCommands(
      transition.events,
      resolution.pendingBattle.rules.rulesContext,
      transition.state.rules.rulesContext,
      fieldBoundary,
      fieldAfter(transition),
      resolution.opponentTrainer,
    ),
  });
}

/**
 * Appends the genuine forced-switch submission receipt without minting a
 * second resolution identity. Presentation may continue to hold the forced
 * selector while Slice 5's send-out renderer consumes this segment.
 */
export function appendBattleResolutionContinuation(
  input: AppendBattleResolutionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary } = input;
  if (resolution.forcedRequest === null) {
    throw new Error("battle resolution continuation requires a forced-switch request");
  }
  if (
    resolution.pendingBoundary.kind !== "decision-required"
    || resolution.pendingBoundary.request.requestId
      !== resolution.forcedRequest.requestId
  ) {
    throw new Error("battle resolution continuation does not match its pending boundary");
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "presenting-switch-in" as const,
      phaseElapsed: 0,
    }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    // NOT unconditionally null: the replacement this receipt sends out can
    // faint inside the very same receipt (end-of-turn poison etc.), which
    // publishes the *next* player forced-switch request. Dropping it left the
    // segment's own end routing to the ordinary next-command handoff, whose
    // player-command boundary invariant then failed (ISSUES #94).
    forcedRequest: pendingPlayerForcedSwitchRequest(transition.state.boundary),
  });
}

/**
 * Groups the automatic follow-up after a multi-turn player action without
 * pretending its two reducer passes were one event list. After the charge
 * turn, HandleTurnActionSelectionState has auto-confirmed the player's locked
 * action and published only the real trainer command. The round controller
 * drives that command, then appends its untouched receipt as a new segment.
 */
export function appendBattleResolutionActionContinuation(
  input: AppendBattleResolutionActionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary } = input;
  if (resolution.forcedRequest !== null) {
    throw new Error("automatic action continuation cannot replace a forced-switch receipt");
  }
  if (
    resolution.pendingBoundary.kind !== "decision-required"
    || resolution.pendingBoundary.request.kind !== "command"
    || resolution.pendingBoundary.request.side !== "trainer"
  ) {
    throw new Error("automatic action continuation requires a genuine trainer command boundary");
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({
      phase: "presenting" as const,
      phaseElapsed: 0,
    }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest: pendingPlayerForcedSwitchRequest(transition.state.boundary),
  });
}

/**
 * Reclaims a resolution owner after the opposing battler's locked action has
 * survived a genuine command request. The command request remains a distinct
 * kernel/UI identity; only the immutable charge and strike presentation
 * segments share an owner.
 */
export function appendBattleResolutionLockedActionContinuation(
  input: AppendBattleResolutionLockedActionContinuationInput,
): BattleResolutionPresentationState {
  const { resolution, transition, fieldBoundary, lockedAction } = input;
  const pending = resolution.pendingBoundary;
  if (
    resolution.forcedRequest !== null
    || pending.kind !== "decision-required"
    || pending.request.kind !== "command"
  ) {
    throw new Error("locked action continuation requires a genuine command boundary");
  }
  const pendingBattler = pending.request.battler;
  if (pendingBattler === lockedAction.battler) {
    throw new Error("locked action continuation must cross the opposing battler's command");
  }
  if (!hasRetainedLockedActionReceipt(transition.events, lockedAction)) {
    throw new Error(
      "locked action continuation receipt has no immutable matching action snapshot",
    );
  }
  const segment = appendResolutionSegment(resolution, transition, fieldBoundary);
  return Object.freeze({
    ...resolution,
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest: pendingPlayerForcedSwitchRequest(transition.state.boundary),
  });
}
