import { turnTrapBranchOf, type TurnTrapBranch } from "./turnTrapBranch.ts";
import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import type { LiveMoveSpriteAllocatorInput, LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { LiveBattlerX2History, LiveMoveBattlerX2Input } from "./liveBattlerX2History.ts";
import { battleMoveAnimationRequest, type BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { opponentPartySummaryDrawTiming } from "./midBattleOpponentPartySummaryTiming.ts";
import { aiReplacementChoiceWork, speciesTypesOf } from "./battleScriptOpenPartyScreenOpcode.ts";
import {
  NO_MOVES_BOUNCE_STOP_AFTER,
  NO_MOVES_DISMISS_HOLD_FRAMES,
  NO_MOVES_DISMISS_HOLD_OFF_FRAMES,
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
import { aiReplacementChoiceExtraFrames, type BattleAiSwitchIntoWork } from "./battleAiSwitchInto.ts";
import type { BattleScriptSelectionRejection } from "./battleScriptActionAdmission.ts";
import {
  type BattleStringPromptGate,
  battleStringPrintableLength,
  battleStringPromptGates,
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
import { recordContainedPresentationError } from "./presentationContainment.ts";
import { substituteFadeCommandRows } from "./liveSubstituteFade.ts";
import { statsChangeParams, statsChangeSpan } from "../animation/statsChange.ts";
import { GENERAL_RAIN_SCRIPT_ROWS } from "../animation/rainDance.ts";
import { liveMoveAnimationDuration } from "./liveMoveAnimation.ts";
import {
  battleResolutionCommandDuration, battleResolutionFieldBeforeCommand, MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED,
} from "./battleResolutionPresentationRender.ts";
import { SEND_IN_TAIL_CASTFORM } from "../data/sendInTail.ts";
import { CASTFORM_CHANGE_COMMAND_FRAMES, CASTFORM_CHANGE_WEATHER_LOOP_FRAMES } from "./liveTransform.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS, BATTLE_SCRIPT_STATUS2_MASKS, BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE } from "./battleScriptSourceConstants.ts";
import { spriteOrderStatusAnimationName } from "./spriteOrderEventTransform.ts";
import { seg127StatusSeGateFromEvents, seg127StatusSeGateRows } from "./seg127StatusSeGate.ts";
import { battleHealthBarAnimationFrames } from "./healthboxAssembly.ts";
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
  minimumFrames: number; seGateFrames?: number; scriptLeadFrames?: number; bodyLeadFrames?: number; scriptTailRows?: number;
  /** bdt1: rows the body's sound clock (liveMoveSourceAge) runs ahead of its presented rows; sound only, never the command's duration. */
  soundAgeLeadFrames?: number;
}>;
export type BattleHitAnimationTiming = Readonly<{
  minimumFrames: 35 | typeof HIT_ANIMATION_INVISIBLE_FRAMES;
  firstDisplayedAge: 1;
  /** fsc1: the target's sprite is invisible (semi-invulnerable): the controller completes at once, nothing is drawn. */
  invisibleTarget?: true;
}>;
/**
 * sub183: tailFrames (present only when > 0) = the script rows between the bar's last row and the next print's first glyph (see hpPrintTailTiming).
 * mem2: instantDrop = `INSTANT_HP_BAR_DROP` (0x7FFF), the row where the HP text empties (the bar follows one row later): the command is its
 * `tailFrames` rows with no drain.
 */
export type BattleHpTiming = Readonly<{ minimumFrames: 28 | 0; tailFrames?: number; instantDrop?: number }>;
/**
 * The RAM stat write is silent for exactly 2 frames before the message box
 * clears (`docs/issue69-omniboost-off-ground-truth.md` §2: every one of the
 * 5 measured banners shows the same write-frame-to-box-clear-frame gap --
 * 283->285, 375->377, 468->470, 559->561, 652->654). The visible post-print
 * hold is a `message` property in source (`waitmessage` follows
 * `printfromtable`, not `statbuffchange`), not a `stat` one -- see
 * `BattleMessageTiming`. Usually 2; a `stat` between two prints presents the
 * ROM's single-row instructions up to the next print (lsd196).
 */
export type BattleStatTiming = Readonly<{ minimumFrames: number }>;
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
/**
 * hie1 (ISSUES #220, docs/hie-scout.md step 1; staged labs `hie1-{leftovers,sitrus,shellbell,cheri}-{on,off}`): every ITEMEFFECT
 * script plays `playanimation ..., B_ANIM_HELD_ITEM_EFFECT` right before its print. Scene ON: the animation runs its own ~204 rows
 * (src/animation/heldItemHeal.ts: first glyph of the print at age 204) and the print waits for the controller, so the general-animation
 * command lasts HELD_ITEM_EFFECT_COMMAND_FRAMES + a controller launch lead that depends on how the script was entered:
 * a RESTART (the item script runs from its own start, Leftovers / Sitrus: the animation event's execution is below the event before it)
 * leads by HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES, a CONTINUATION of the move script (Shell Bell, a cure berry after the hit) by
 * HELD_ITEM_EFFECT_CONTINUE_LEAD_FRAMES. Scene OFF: Cmd_playanimation takes BattleScript_Pausex20 (`pause B_WAIT_TIME_SHORT`) and the
 * print follows after the script's own executions (`heldItemEffectOffHoldFrames`), plus the same two leads. Behind a Substitute the
 * ROM skips the animation (TryHandleLaunchBattleTableAnimation; Scene ON only: the Scene OFF pause is unconditional).
 */
export const HELD_ITEM_EFFECT_COMMAND_FRAMES = 214;
/**
 * wsh1 (ISSUES #219): the three `playanimation` sites the held-item work did not cover. Scene ON runs the General_* script through
 * the controller and the next print / hit waits for it (Cmd_playanimation, battle_script_commands.c:4033-4038; skipped for a
 * STATUS3_SEMI_INVULNERABLE battler, and for a battler behind a Substitute by TryHandleLaunchBattleTableAnimation). The command lasts from the
 * previous command's end to the next command's first frame, measured on the ROM (docs/wsh1-general-anim-commands.md).
 */
export const WISH_HEAL_COMMAND_FRAMES = 201;
export const FUTURE_SIGHT_HIT_COMMAND_FRAMES = 172;
export const FOCUS_BAND_COMMAND_FRAMES = 129;
/**
 * ing1 (docs/fcp1-frame-catcher-pictures.md): BattleScript_IngrainTurnHeal's `playanimation BS_ATTACKER, B_ANIM_INGRAIN_HEAL`
 * (data/battle_scripts_1.s:3609-3610, General_IngrainHeal: src/animation/ingrainHeal.ts). ROM (tools/battle-lab/ing1-player-on.json): the
 * rows before the command sit at offset 0, "X absorbed nutrients with its roots!" at +198 (the same pattern as the Wish heal above).
 */
export const INGRAIN_HEAL_COMMAND_FRAMES = 198;
/**
 * trp1 (docs/trp1-turn-trap-animation.md): BattleScript_WrapTurnDmg's `playanimation BS_ATTACKER, B_ANIM_TURN_TRAP, sB_ANIM_ARG1`
 * (data/battle_scripts_1.s:3829-3833). General_TurnTrap (data/battle_anim_scripts.s:10361-10439) branches on the trapped battler's
 * wrapped move (AnimTask_GetTrappedMoveAnimId, battle_anim_throw.c:2486-2500): Status_FireSpin, Status_Whirlpool, Status_Clamp,
 * Status_SandTomb, else Status_BindWrap (Bind and Wrap). ROM (tools/battle-lab/trp1-<move>-<side>-on.json, both sides): the rows before
 * the command sit at a constant offset and "X is hurt by Y!" starts this many rows after the previous command's end.
 */
export const TURN_TRAP_COMMAND_FRAMES: Readonly<Record<TurnTrapBranch, number>> = Object.freeze({
  BIND_WRAP: 68, FIRE_SPIN: 81, WHIRLPOOL: 110, CLAMP: 39, SAND_TOMB: 101,
});
/**
 * kno3 (docs/kno1-item-knockoff-plan.md "kno3"): BattleScript_KnockedOff's `playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF` (General_ItemKnockoff:
 * one ITEM_BAG sprite, 3 load rows, then 40 path rows, + the AnimItemSteal_Step2 tail of 51 rows when the PLAYER's mon is the target). The
 * rows from the instruction's row E to the next print's first row are W + A + 2 (kno2): W = the controller's IsBattleSEPlaying wait for the
 * hit's effectivenesssound (sgs134RequestSeGate, fixed rows ITEM_KNOCKOFF_SE_FIXED_ROWS after the hit's SE), A the animation rows, 2 script rows.
 */
export const ITEM_KNOCKOFF_ANIMATION_ROWS_OPPONENT_TARGET = 43;
export const ITEM_KNOCKOFF_ANIMATION_ROWS_PLAYER_TARGET = 94;
export const ITEM_KNOCKOFF_SCRIPT_TAIL_ROWS = 3;
/** The Scene OFF twin: `Cmd_playanimation` takes BattleScript_Pausex20 (35 rows from the instruction's row to the print, both sides; out2). */
export const ITEM_KNOCKOFF_OFF_HOLD_FRAMES = 35;
/** Script rows after the knocked-off print's waitmessage before MoveEnd's turn-end block (ROM: `+0xc`, `return`, MoveEnd, MoveEnd+0x6 = 6 rows; the sprite-visibility commands present 2). */
export const ITEM_KNOCKOFF_PRINT_TAIL_ROWS = 4;
/** The rows from the hit's effectivenesssound to the knocked-off controller launch's first poll, less the HP bar's rows (kno2: SE age at E = 43 + drain, +1 for the first poll; seg127 drain = |from - to|). */
export const ITEM_KNOCKOFF_SE_FIXED_ROWS = 44;
export function itemKnockoffCommandFrames(battler: 0 | 1, seGate: number): number {
  return seGate + (battler === 0 ? ITEM_KNOCKOFF_ANIMATION_ROWS_PLAYER_TARGET : ITEM_KNOCKOFF_ANIMATION_ROWS_OPPONENT_TARGET) + ITEM_KNOCKOFF_SCRIPT_TAIL_ROWS;
}
export const HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES = 15;
export const HELD_ITEM_EFFECT_CONTINUE_LEAD_FRAMES = 9;
/** hie7: the item animation directly after the player's faint-replacement send-in starts on the script's exec row (ROM s2230 d6, s5063 d45: exec -> SE 152 = 8). */
export const HELD_ITEM_EFFECT_AFTER_SEND_IN_LEAD_FRAMES = 0;
/**
 * wbh1 (docs/wbh1-battle-start-white-herb.md): the battle-start entry phase (factoryBattleStartEntry.ts) times a script's rows from the
 * kernel, so its held-item command starts on the `playanimation` row itself (BattleScript_WhiteHerbRet, ROM labs wbh1-*-on: the anim's
 * first gAnimScriptActive row) and the print's first glyph follows 213 rows later (211 animation rows, the controller's completion,
 * printstring), on either side. hie3's script frame 0 (HELD_ITEM_EFFECT_COMMAND_FRAMES before the print) is the row before it.
 */
export const HELD_ITEM_EFFECT_ENTRY_LEAD_FRAMES = -1;
/**
 * A cure berry's script continues from the move's own `set-battler-status-data` receipt, whose `status` command (off121 / the 32-frame
 * default) already presents the frames up to the animation in both scenes (Scene OFF: the 35 executions; Scene ON: the 32 default),
 * so the held-item command presents the rest. Scene ON only: the ROM spends one frame more than the other continuations (224 vs 223);
 * Scene OFF's 35 + the continue lead is exact.
 */
export const HELD_ITEM_EFFECT_AFTER_STATUS_EXTRA_FRAMES = 1;
/**
 * wth236: the end-turn weather animations. BattleScript_DamagingWeatherContinues' `playanimation_var BS_ATTACKER, sB_ANIM_ARG1`
 * (General_Sandstorm / General_Hail: `goto Move_SANDSTORM` / `Move_HAIL`) and BattleScript_RainContinuesOrEnds /
 * SunlightContinues' `playanimation BS_ATTACKER, B_ANIM_RAIN_CONTINUES / B_ANIM_SUN_CONTINUES` (General_Rain; General_Sun =
 * `goto Move_SUNNY_DAY`) play on every continuing turn in Scene ON. Cmd_playanimation(_var) tests HITMARKER_NO_ANIMATIONS before
 * its weather branch (battle_script_commands.c:4046-4076), so Scene OFF plays nothing and presents no command (the kernel's
 * WEATHER_VAR receipt stays in both scenes: the digest does not move). The ROM launches the animation on battler 0 (apx227: the
 * first non-absent battler, whatever the receipt's battler says). Sun / Sandstorm / Hail: the command's rows are the table-animation
 * launch structure fps147 measured for B_ANIM_FOCUS_PUNCH_SETUP (the script active from row X + 2, the next print's first glyph 3 rows
 * after its last row) around each body's own row count (liveMoveAnimation.ts's body row table: Sunny Day 241 = 158, Sandstorm 201 =
 * 168, Hail 258 = 158); not yet pinned by a weather-window receipt. Rain: rnc1 below (General_Rain is not Rain Dance's body).
 */
export const WEATHER_CONTINUES_LAUNCH_LEAD_ROWS = 1;
export const WEATHER_CONTINUES_LAUNCH_TAIL_ROWS = 3;
/** The script rows of each weather body (RAIN_CONTINUES: General_Rain's own, rainDance.ts GENERAL_RAIN_SCRIPT_ROWS). */
export const WEATHER_CONTINUES_BODY_ROWS = Object.freeze({
  RAIN_CONTINUES: GENERAL_RAIN_SCRIPT_ROWS, SUN_CONTINUES: 158, SANDSTORM_CONTINUES: 168, HAIL_CONTINUES: 158,
} as const);
export type WeatherContinuesAnimation = keyof typeof WEATHER_CONTINUES_BODY_ROWS;
/**
 * General_Sun / General_Sandstorm / General_Hail draw the weather move's own body (battle_anim_scripts.s:10524-10531); General_Rain is
 * drawn by the Rain Dance adapter family (move 240's art and drop program) as its own script (request.generalRain, rainDance.ts
 * generalRainAtAge).
 */
export const WEATHER_CONTINUES_MOVE_IDS: Readonly<Record<WeatherContinuesAnimation, number>> = Object.freeze({
  RAIN_CONTINUES: 240, SUN_CONTINUES: 241, SANDSTORM_CONTINUES: 201, HAIL_CONTINUES: 258,
});
/**
 * rnc1 (docs/rnc1-rain-continues.md): B_ANIM_RAIN_CONTINUES rows, from the source and RAM read on all four rain turns of seed 19
 * Scene ON battle 2. Command elapsed 0 is the row BattleScript_RainContinuesOrEnds' `waitmessage B_WAIT_TIME_LONG` ends; `jumpifbyte`
 * runs at 1 and `playanimation` at 2, where the player controller launches General_Rain (TryHandleLaunchBattleTableAnimation) and
 * its task runs the script's first command: script row 0 (rainDance.ts generalRainAtAge). gAnimScriptActive falls at script row
 * GENERAL_RAIN_SCRIPT_ROWS (Cmd_end waits for SE_M_RAIN_DANCE), the controller completes one row later and `end2` runs one row after
 * that: 122 rows after the rain-stopped branch's `end2` (`jumpifbyte` jumps to it, elapsed 2). So the command is 122 rows and the
 * commands after it start as they do after "The rain stopped." (they were 191 rows: Rain Dance's 187-row body + 4, 69 too many).
 */
export const RAIN_CONTINUES_SCRIPT_START_ROWS = 2;
export const RAIN_CONTINUES_COMMAND_FRAMES = RAIN_CONTINUES_SCRIPT_START_ROWS + GENERAL_RAIN_SCRIPT_ROWS;
export function isWeatherContinuesAnimation(animation: string): animation is WeatherContinuesAnimation {
  return Object.hasOwn(WEATHER_CONTINUES_BODY_ROWS, animation);
}
/** The end-turn weather animation a kernel `animation` receipt names: the explicit playanimation ids, or playanimation_var's 12 / 13. */
export function weatherContinuesAnimationOf(payload: { readonly animationId: string; readonly arguments: readonly string[] }): WeatherContinuesAnimation | null {
  if (isWeatherContinuesAnimation(payload.animationId)) return payload.animationId;
  if (payload.animationId !== "WEATHER_VAR") return null;
  return payload.arguments[0] === "12" ? "SANDSTORM_CONTINUES" : payload.arguments[0] === "13" ? "HAIL_CONTINUES" : null;
}
export function weatherContinuesCommandFrames(animation: WeatherContinuesAnimation): number {
  if (animation === "RAIN_CONTINUES") return RAIN_CONTINUES_COMMAND_FRAMES;
  return WEATHER_CONTINUES_LAUNCH_LEAD_ROWS + WEATHER_CONTINUES_BODY_ROWS[animation] + WEATHER_CONTINUES_LAUNCH_TAIL_ROWS;
}
export const FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES = 3;
const CASTFORM_CHANGE_SUBSTITUTE = 1 << 7;
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
const SYNTHESIZED_AI_SWITCH_DISPATCHER = "synthesized-ai-switch";
/**
 * ais3: an AI voluntary switch's send-in (BattleScript_DoSwitchOut's `switchinanim`) throws its ball 2 frames after a faint
 * replacement's (seed 2741 ROM frames, both scenes: ball first drawn at send-in elapsed 4, not 2; open and everything after it
 * 2 later), so the whole send-in runs 2 frames late (`sendInVisualDelay`) and the command is 2 longer.
 */
const AI_SWITCH_SEND_IN_LEAD_FRAMES = 2;

/**
 * fch1: the opponent's faint replacement choice work (`GetMostSuitableMonToSwitchInto`, run by `OpponentHandleChoosePokemon` inside the script's
 * `openpartyscreen`) for the FaintedMonSendOutNew replacement that follows event `index`, or null when none follows. The bench is the segment's
 * starting party minus the fainted slot (`switch.fromPartyIndex`); the opposing mon is the player's displayed battler.
 */
function faintReplacementChoiceWork(
  beforeRules: BattleScriptRulesContext,
  currentField: BattleResolutionDisplayedField,
  events: readonly BattleKernelSemanticEvent[],
  index: number,
): BattleAiSwitchIntoWork | null {
  const next = events.slice(index + 1).find(({ payload }) => payload.kind === "switch");
  if (next === undefined || next.payload.kind !== "switch" || next.payload.side !== "opponent") return null;
  if (next.provenance?.sourceLabel !== "BattleScript_FaintedMonSendOutNew") return null;
  const player = beforeRules.battlers[0]!;
  const types = player.partyIndex === currentField.player.partyIndex ? player.types : speciesTypesOf(currentField.player.species);
  if (types === null) return null;
  return aiReplacementChoiceWork(beforeRules, next.payload.fromPartyIndex, { types, ability: player.ability, status2: player.status2 });
}

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
const HIT_ALL_LOOP_KO_BOX_TIMING = Object.freeze({ minimumFrames: 1, holdFrames: 0 });
const HIT_ALL_LOOP_SCRIPT = "BattleScript_DoHitAllWithUndergroundBonus";
/**
 * fsc1 c2: the hit-all loop's `printstring STRINGID_EMPTYSTRING3; waitmessage 1` clears the box on one row and the script runs on, so the box
 * lasts one frame per interpreter execution to the next presented receipt (+1 for waitmessage 1's controller row), like the Focus Punch pre-pass box,
 * not the 24-frame text minimum. Null when the next event carries no execution count.
 */
function hitAllLoopEmptyBoxTiming(events: readonly BattleKernelSemanticEvent[], index: number): BattleMessageTiming | null {
  const event = events[index];
  if (event === undefined || event.provenance?.sourceLabel !== HIT_ALL_LOOP_SCRIPT || event.payload.kind !== "message"
    || event.payload.messageId !== "STRINGID_EMPTYSTRING3") return null;
  const from = event.provenance.instructionExecution;
  const next = events[index + 1];
  const to = next?.provenance?.instructionExecution;
  if (from === undefined || to === undefined || to <= from) return null;
  // A KO: the faint chain's own lead (faintScriptPreCryFrames) already presents the rows from the box to `playfaintcry`.
  if (next!.payload.kind === "play-faint-cry") return HIT_ALL_LOOP_KO_BOX_TIMING;
  return Object.freeze({ minimumFrames: Math.max(1, to - from + 1), holdFrames: 0 });
}
const CHARGE_TURN_EMPTY_BOX_ROW_TIMING = Object.freeze({ minimumFrames: 1, holdFrames: 0 });

/** fpp150: the turn opens with BattleScript_FocusPunchSetUp (CheckFocusPunch_ClearVarsBeforeTurnStarts runs before action 1). */
export function battleResolutionOpensWithFocusPunchPrePass(events: readonly BattleKernelSemanticEvent[]): boolean {
  return events.find((event) => event.sequence >= 0)?.provenance?.sourceLabel === FOCUS_PUNCH_SETUP_SCRIPT;
}
export type BattleStatusIconTiming = Readonly<{ minimumFrames: number }>;
/**
 * fnt201: BattleScript_FaintTarget / BattleScript_FaintAttacker (data/battle_scripts_1.s:2809-2823) run
 * `playfaintcry` (1 row), `pause B_WAIT_TIME_LONG` (64 rows) and the `dofaintanimation` dispatch (1 row) before the
 * sink starts; PlayerHandleFaintAnimation / OpponentHandleFaintAnimation only begin on that third instruction.
 * ROM: anim row - cry row = 66 in every staged route and scene (tools/integration/fixtures/fnt201/rom-rows.json).
 */
export const FAINT_SCRIPT_LEAD_FRAMES = 66;

/**
 * fnt201: the script rows between the previous timed command and `playfaintcry` (BattleScript_FaintTarget / FaintAttacker is
 * entered by Cmd_tryfaintmon / a gotoscript with no controller work of its own). The kernel numbers each executed row
 * (`instructionExecution`): after an HP update (the `hp` command carries healthbarupdate's execution, datahpupdate is the next
 * row) the cry is `cry - healthbarupdate - 1` rows after the controller idles (7 for a target KO: critmessage,
 * waitmessage, resultmessage, waitmessage, seteffectwithchance, tryfaintmon...); after a print the ROM's idle run is the print's
 * `waitmessage B_WAIT_TIME_LONG` hold (the message command's own `holdFrames`) plus `cry - print - 1 - hold` rows. Rows that
 * commands emitted in between already present (the one-frame MoveEnd sprite-visibility receipts) are not counted twice.
 */
function faintScriptPreCryFrames(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  commands: readonly BattleResolutionPresentationCommand[],
): number {
  let cry: BattleKernelSemanticEvent | undefined;
  for (let at = index - 1; at >= 0 && cry === undefined; at -= 1) {
    if (events[at]!.payload.kind === "play-faint-cry") cry = events[at];
  }
  const cryExecution = cry?.provenance?.instructionExecution;
  if (cryExecution === undefined) return 0;
  let anchorIndex = commands.length - 1;
  while (anchorIndex >= 0 && commands[anchorIndex]!.type !== "hp" && commands[anchorIndex]!.type !== "message") {
    if (commands[anchorIndex]!.type !== "sprite-visibility" && commands[anchorIndex]!.type !== "status") return 0;
    anchorIndex -= 1;
  }
  const anchor = commands[anchorIndex];
  if (anchor === undefined || (anchor.type !== "hp" && anchor.type !== "message")) return 0;
  if (anchor.type === "message" && anchor.advance !== "automatic") return 0;
  const anchorExecution = events.find((event) => event.sequence === anchor.eventSequence)?.provenance?.instructionExecution;
  if (anchorExecution === undefined || cryExecution <= anchorExecution) return 0;
  const after = anchor.type === "message"
    ? cryExecution - anchorExecution - 1 - anchor.timing.holdFrames
    : cryExecution - anchorExecution - 1;
  let shown = 0;
  for (let at = anchorIndex + 1; at < commands.length; at += 1) shown += commands[at]!.type === "sprite-visibility" ? 1 : 0;
  return Math.max(0, after - shown);
}
export type BattleFaintTiming =
  | Readonly<{
      minimumFrames: number;
      sink: "opponent-tile-rows";
      steps: number;
      leadFrames?: number;
      healthboxVanishFrame: number;
    }>
  | Readonly<{
      minimumFrames: number;
      sink: "player-pixel-rows";
      pixelsPerFrame: 5;
      spriteRows: number;
      leadFrames?: number;
      healthboxVanishFrame: number;
    }>;
export type BattleSwitchInTiming = Readonly<{ minimumFrames: number }>;
export type BattleSpriteVisibilityTiming = Readonly<{
  minimumFrames: 1 | typeof FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES | typeof SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES
    | typeof LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES;
}>;
/** `blankTailFrames`: the last rows of the turn-end draw the cleared box (the release tail's box clear, msw2). */
export type BattleTurnEndTiming = Readonly<{ minimumFrames: number; blankTailFrames?: number }>;
/**
 * `holdFrames`: rows after the slide settles before the next command (lrc1: the loss tail's printstring, LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES).
 * `leadFrames`: rows before the slide's el 0, the sprite still off screen (wtl1: the win tail, WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES).
 */
export type BattleTrainerSlideTiming = Readonly<{
  minimumFrames: 38;
  leadFrames?: typeof WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES;
  holdFrames?: typeof LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES;
}>;

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
      /**
       * btn1: this command is (a piece of) a string the ROM holds on a `\p` / `\l` prompt (text.c:865-882), apart from the faint /
       * terminal ids whose button messages end the segment.  Such a piece never suppresses the segment's `turn-end`.
       */
      promptGate?: true;
      /**
       * fnt1 (docs/fnt1-fainted-box-clear.md): this button piece ends its string on `\p` (CHAR_PROMPT_CLEAR, nothing printed
       * after it): "{X} fainted!", "Player defeated ...!", a gated string's last page.  The press is taken from the printer's
       * first wait frame (as every `promptGate` piece), and the press clears the box when it lands on a down-arrow redraw frame
       * (`promptClearPressBlanksBox`).
       */
      promptClear?: true;
      /** btn1: glyphs of `lines` already on screen when the piece starts (the line a `\l` scroll keeps). Absent = 0. */
      startChars?: number;
      /** btn1: rows before the piece's first glyph (the `\l` scroll). Absent = 0. */
      leadFrames?: number;
    }>
  | Readonly<{
      type: "move-animation";
      animation?: BattleMoveAnimationRequest;
      /** trn181: the Scene ON action-transition pause (draw-nothing; leaves hides and live hosts untouched). */
      actionTransition?: true;
      /** trp1: Scene OFF's BattleScript_Pausex20 for B_ANIM_TURN_TRAP before "X is hurt by Y!" (draw-nothing, as every OFF hold). */
      turnTrapHold?: true;
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
      timing?: Readonly<{ minimumFrames: number; leadFrames?: number }>;
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
       * pau5: the entry script (Intimidate / Trace) that follows this send-in starts `entryScriptHoldFrames` after the post-`switchinanim`
       * release: the "Go! X!" box stays up that long on top of `settleHoldFrames` (the script's leading rows less the release rows it replaces).
       */
      entryScriptHoldFrames?: number;
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
      /** ais3: an AI voluntary switch's send-in (2 frames late as a whole; its Scene OFF release tint ramp starts like Scene ON's). */
      aiSwitch?: true;
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
      /**
       * lrc1: script rows before the controller's `CONTROLLER_RETURNMONTOBALL` dispatch, inside `timing.minimumFrames` (the loss
       * tail's `returnopponentmon1toball`, LOSS_RECALL_LEAD_FRAMES). The battler stays drawn at rest through them; the recall
       * (ball sound, ball effect, scale-down) runs on `phaseElapsed - leadFrames` (`switchOutRecallElapsed`). Absent = 0.
       */
      leadFrames?: number;
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
      animation: "FOCUS_PUNCH_SETUP" | "HELD_ITEM_EFFECT" | "LEECH_SEED_DRAIN" | "CASTFORM_CHANGE" | "WISH_HEAL" | "FUTURE_SIGHT_HIT" | "FOCUS_BAND" | "ITEM_KNOCKOFF" | "INGRAIN_HEAL" | "TURN_TRAP" | WeatherContinuesAnimation;
      /** trp1: a TURN_TRAP's wrapped move (the animation event's argument; General_TurnTrap's branch follows it, turnTrapBranchOf). */
      trapMove?: number;
      /** cff230: a CASTFORM_CHANGE's target form (the event's argument & ~CASTFORM_SUBSTITUTE; 0 = normal). */
      castformForm?: number;
      /** cff232 / snd233: extra rows before the morph's lead (a weather-loop change at battler 1, both scenes); absent = 0. */
      castformLeadExtra?: number;
      /**
       * lsd198: a LEECH_SEED_DRAIN whose event stream carries the kernel's animation receipt (Scene ON: General_LeechSeedDrain
       * plays); the render draws it as Move_ABSORB's body (battleResolutionPresentationRender.ts leechSeedDrainAbsorbEffect).
       */
      animated?: true;
      /**
       * hie7: the command directly follows the player's faint-replacement send-in (BattleScript_FaintedMonSendOutNew). The send-in span already ends where
       * the ROM script's exec row runs, and the controller is idle, so the launch lag the labs and hit tails fit (LEECH_SEED_DRAIN_SCRIPT_AGE 7,
       * the held-item restart lead 15) does not apply: ROM exec -> SE is 27 here, 34 in the labs (g180m s6912 d2).
       */
      afterPlayerSendIn?: true;
      /**
       * kno3: an ITEM_KNOCKOFF's IsBattleSEPlaying rows before the launch (sgs134RequestSeGate); absent = 0.
       * sep1: a LEECH_SEED_DRAIN after a hit (Scene ON): launchLagFrames = the rows from the script's exec row to the animation's first row, the hit SE's
       * IsBattleSEPlaying wait (hitSeDrainLaunchLag); absent = the legacy lag (7, or 0 right after the player's send-in).
       */
      timing: Readonly<{ minimumFrames: number; seGateFrames?: number; launchLagFrames?: number }>;
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
   * enc276: the move was confirmed with no move menu (Encore, or a forced Struggle). Encore keeps the action menu up through the
   * handoff; Struggle keeps the dismissed "has no moves left!" box up, behind `holdRemaining` extra frames before the stage walk.
   */
  forced?: Readonly<{ kind: "encore" } | { kind: "struggle"; holdRemaining: number; holdTotal: number; waitCursorAge: number }>;
  /**
   * fpp150: the turn opens with the Focus Punch pre-pass, whose empty box the ROM prints 3 rows after turn order (R4: 68 -> 71,
   * shown 72) where an action's first print lands 9 rows after it (36 -> 45, glyph 46). The handoff ends after
   * stop-bounce-request (the first command's frame is then the empty box's first display row on R4, both scenes); the remaining
   * stages' rows (the action prologue) are carried by the pre-pass's last print (FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES).
   */
  focusPunchPrePass?: true;
  /** hcr1: Scene OFF used-move print lead, frames of `action-dispatch` hold still to run (see `usedMovePrintLeadAdjust`). */
  usedMoveLeadHold?: number;
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
   * btn2 (ROM, both scenes): a button gate's release freezes the wait cursor at its last phase; the box keeps the print and the frozen
   * cursor until the next print or the box's clear.  The released message's command index + the cursor age shown on the release
   * frame (fnt1: the phase the printer drew on the frame before the press; < 0 = no arrow drawn yet).
   * fnt1 (docs/fnt1-fainted-box-clear.md): `clear` is set when a `promptClear` piece was released on a down-arrow redraw frame:
   * the box still shows the print on the release frame ("pending") and is blank from the next frame ("done", set by the
   * orchestrator's next tick) until the next print.
   */
  releasedWaitCursor?: Readonly<{ segmentIndex: number; commandIndex: number; age: number; clear?: "pending" | "done" }>;
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
  /** hcr1b / hcr2b: ticks the hit / effectiveness / faint sounds of a ruled used-move turn are stamped ahead of the presentation clock (1, both scenes). */
  usedMoveSoundLead?: number;
  /** hcr1b: the same for the general-animation sounds (Scene OFF only: 1). */
  usedMoveScriptSoundLead?: number;
  /** hcr2b: the same for the move-animation table SEs and the stat-change / Double Team stat SEs that follow them (Scene ON: min(u - 2, 2); Scene OFF: 1). */
  usedMoveAnimSoundLead?: number;
  /** hcr2c: Scene ON used-move print u, for the per-body move-animation sound lead (`usedMoveBodySoundLeadOf`). */
  usedMovePrintU?: number;
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
    /** enc276: the command presentation confirmed a forced move with no move menu. */
    forced?: "encore" | "struggle";
    forcedWaitCursorAge?: number;
  }>;
  opponentTrainer?: BattleResolutionOpponentTrainer | null;
  /**
   * pic9: source `gBattleStruct->hpOnSwitchout[foe side]` -- the foe's HP at the last switch-in of either battler (Cmd_switchineffects,
   * battle_script_commands.c:5276-5280) or at battle start (battle_main.c:3421); the voluntary switch's "Come back!" line reads it
   * (Cmd_hpthresholds2). The orchestrator's display ledger keeps it; absent = the foe's max HP (every Factory battle starts at full HP).
   */
  opponentHpOnSwitchout?: number;
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
 * stc1 (docs/aud251-s11-scoreboard-refresh.md "stc1"): BattleScript_DoSelfConfusionDmg (battle_scripts_1.s:3796-3804) runs status2animation,
 * jumpifbyte, cancelmultiturnmoves, adjustnormaldamage2 and printstring (5 rows) between the "is confused!" wait and the first glyph of
 * "It hurt itself in its confusion!"; the engine typed from the first of them (now the message's `leadFrames`). ROM seeds 7295 (decision 4) / 7682 (decision 2), Scene OFF:
 * the first glyph comes 5 rows later and the print's effectivenesssound (SE 13) 7 rows later than the engine's, so the message holds 2 more rows.
 */
const SELF_CONFUSION_HIT_MESSAGE_ID = "STRINGID_ITHURTCONFUSION";
const SELF_CONFUSION_OFF_PRE_PRINT_ROWS = 3;
/**
 * ftp1 item 4: BattleScript_EffectFocusPunch's printstring (STRINGID_PKMNLOSTFOCUS) starts its first glyph 16 rows after the engine's
 * command start (s310 d3, after a not-very-effective print: ROM +0xa print at 560 against 544; the held-item SE 152 -17 -> -1).
 */
const FOCUS_PUNCH_LOST_FOCUS_SCRIPT = "BattleScript_EffectFocusPunch";
const FOCUS_PUNCH_LOST_FOCUS_PRE_PRINT_ROWS = 16;
const SELF_CONFUSION_OFF_HIT_MESSAGE_TIMING = Object.freeze({ minimumFrames: 0, holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + 2 } as const);
/**
 * hse2 (docs/aud251-s11-scoreboard-refresh.md "hse2"; ROM lab hpf4m-confuse-off print 1323 -> used print 1417 = 94, T2 s7295 d5 97 / s499 d11 94):
 * a confusion that does not hurt skips `status2animation` in Scene OFF, so after the wait the script runs `jumpifbyte`, `goto`, `return` and the
 * used move's `HitFromAtkCanceler` / `AccCheck` / `AtkString` rows before the used print: 64 + the 3 launch rows + 4.
 */
const CONFUSION_HEAD_SCRIPT = "BattleScript_MoveUsedIsConfused";
const CONFUSION_OFF_USED_PRINT_EXTRA_ROWS = 4;
const CONFUSION_OFF_USED_PRINT_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + 3 + CONFUSION_OFF_USED_PRINT_EXTRA_ROWS,
} as const);
/**
 * ohs1 (Scene OFF, ROM s7295 d8 / s7682 / s830 and s6568 d29 / d21 / s7682 d4): the other two pre-move prints that lead into the used print skip
 * their launch, so the script's `return` and the used move's canceler rows are all that stand before it. MoveUsedIsConfusedNoMore
 * (`printstring`, `waitmessage`, `return`; wait release 53 -> `HitFromAtkCanceler` 118 -> used print 121): 64 + 5. MoveUsedIsInLove
 * (`printstring`, `waitmessage`, `status2animation`, `return`; print 9 -> 46, used print 115): the status launch's 3 rows (PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS) + 3.
 */
const CONFUSION_NO_MORE_HEAD_SCRIPT = "BattleScript_MoveUsedIsConfusedNoMore";
const IN_LOVE_HEAD_SCRIPT = "BattleScript_MoveUsedIsInLove";
const CONFUSION_NO_MORE_OFF_USED_PRINT_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + 5,
} as const);
const IN_LOVE_OFF_USED_PRINT_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + 3 + 3,
} as const);
function preMoveOffUsedPrintTiming(events: readonly BattleKernelSemanticEvent[], index: number): BattleMessageTiming | null {
  const label = events[index]!.provenance?.sourceLabel;
  const timing = label === CONFUSION_HEAD_SCRIPT ? CONFUSION_OFF_USED_PRINT_TIMING
    : label === CONFUSION_NO_MORE_HEAD_SCRIPT ? CONFUSION_NO_MORE_OFF_USED_PRINT_TIMING
    : label === IN_LOVE_HEAD_SCRIPT ? IN_LOVE_OFF_USED_PRINT_TIMING
    : null;
  if (timing === null) return null;
  for (let next = index + 1; next < events.length; next += 1) {
    const payload = events[next]!.payload;
    if (payload.kind === "message") return payload.messageId === "STRINGID_USEDMOVE" ? timing : null;
  }
  return null;
}
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
/** btn2: BattleScript_SubstituteFade returns into the caller's critmessage `waitmessage B_WAIT_TIME_LONG` (the FADED print sets MSG_DISPLAY). */
const SUBSTITUTE_FADED_MESSAGE_ID = "STRINGID_PKMNSUBSTITUTEFADED";
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
 * sta3 (docs/aud249-general-anim-sounds.md, ROM windows aud242c / aud242f / aud242g, step-mode `gBattlescriptCurrInstr` per frame): a
 * pre-move `printstring; waitmessage B_WAIT_TIME_LONG; status2animation` (BattleScript_MoveUsedIsConfused / IsAsleep) reaches the next
 * command 3 rows after the engine's message ends (waitmessage's completing row, the launch instruction's row, the controller row); the
 * script is scene-independent, so the 3 are message-box rows in both scenes.
 */
export const PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS = 3;
const PRE_MOVE_STATUS_ANIMATION_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS,
} as const);
/**
 * sta5 step 2 (docs/aud249-general-anim-sounds.md, ROM windows aud242b Flatter / aud242f Swagger): a stat print whose script goes on to
 * inflict a status move effect (`printfromtable; waitmessage LONG; jumpifability; jumpifsideaffecting; setmoveeffect; seteffectprimary`,
 * which runs `chosenstatus2animation`) reaches the launch 6 rows after the message ends: waitmessage's completing row, the four script
 * rows, and the launch instruction's own row. Scene OFF (sta6m, ROM windows sta6m-{flatter,swagger}-off): the script rows are the same but
 * the animation is skipped, so the next command is the confusion print itself, three rows after the `chosenstatus2animation` row instead of the
 * launch's one: 7 rows (Flatter print -> print 171 -> 268 = 97, Swagger 185 -> 289 = 104; the app's 90 / 97 was 7 short).
 */
export const MOVE_INFLICTED_STATUS_ANIMATION_LEAD_ROWS = 6;
export const MOVE_INFLICTED_STATUS_SCENE_OFF_LEAD_ROWS = MOVE_INFLICTED_STATUS_ANIMATION_LEAD_ROWS + 1;
/**
 * gsp3 (ROM labs gsp3-{toxic,willowisp}-{player,foe}-on, T2 windows): the end-of-turn poison / burn tick (BattleScript_PoisonTurnDmg /
 * BurnTurnDmg) reaches its `statusanimation` row 2 rows (poison) / 3 rows (burn: the `goto BattleScript_DoStatusTurnDmg` is one more row)
 * after the print's waitmessage, not the pre-move cadence's 3 / 0 (ROM print -> DoStatusTurnDmg row 95 / 98 against the engine's 96 / 95).
 */
const END_TURN_STATUS_DAMAGE_LEAD_ROWS: Readonly<Record<string, number>> = Object.freeze({
  BattleScript_PoisonTurnDmg: 2,
  BattleScript_BurnTurnDmg: 3,
});
const MOVE_INFLICTED_STATUS_SCENE_OFF_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + MOVE_INFLICTED_STATUS_SCENE_OFF_LEAD_ROWS,
} as const);
const MOVE_INFLICTED_STATUS_ANIMATION_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + MOVE_INFLICTED_STATUS_ANIMATION_LEAD_ROWS,
} as const);
const MOVE_INFLICTED_STATUS_SHAPE = Object.freeze([
  "B_SCR_OP_JUMPIFABILITY",
  "B_SCR_OP_JUMPIFSIDEAFFECTING",
  "B_SCR_OP_SETBYTE",
  "B_SCR_OP_SETEFFECTPRIMARY",
]);
function isMoveInflictedStatusLaunch(programCounter: number): boolean {
  const instructions = BATTLE_SCRIPT_PROGRAM.instructions;
  return instructions[programCounter]?.opcodeName === "B_SCR_OP_PRINTFROMTABLE"
    && MOVE_INFLICTED_STATUS_SHAPE.every((name, offset) => instructions[programCounter + 2 + offset]?.opcodeName === name);
}
/**
 * Executes the cadence expressed immediately after a real source print
 * command. This is keyed by immutable interpreter provenance, not by the
 * rendered string or the move/species that happened to reach it. The legacy
 * id family remains only for synthetic receipts that have no usable program
 * counter (older focused presentation fixtures).
 */
function messageTimingFromSourceProvenance(
  event: BattleKernelSemanticEvent,
  sceneOnMoveAnimationSeen: boolean,
  sceneOff: boolean,
): BattleMessageTiming | null {
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined || programCounter < 0) return null;
  if (event.provenance?.sourceLabel === WAKE_UP_SCRIPT || event.provenance?.sourceLabel === THAW_SCRIPT) return WAKE_UP_MESSAGE_TIMING;
  const following = BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 1];
  if (
    following?.opcodeName === "B_SCR_OP_WAITMESSAGE"
    && following.operands.length === 1
    && following.operands[0]!.expression === "B_WAIT_TIME_LONG"
  ) {
    const tickLead = END_TURN_STATUS_DAMAGE_LEAD_ROWS[event.provenance?.sourceLabel ?? ""];
    if (tickLead !== undefined) return Object.freeze({ minimumFrames: 0, holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + tickLead });
    const launch = BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 2]?.opcodeName;
    if (launch === "B_SCR_OP_STATUS2ANIMATION" || launch === "B_SCR_OP_STATUSANIMATION") return PRE_MOVE_STATUS_ANIMATION_TIMING;
    if (!isMoveInflictedStatusLaunch(programCounter)) return WAITMESSAGE_LONG_TIMING;
    return sceneOff ? MOVE_INFLICTED_STATUS_SCENE_OFF_TIMING : sceneOnMoveAnimationSeen ? MOVE_INFLICTED_STATUS_ANIMATION_TIMING : WAITMESSAGE_LONG_TIMING;
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
/**
 * fsc1: Player/OpponentHandleHitAnimation (battle_controller_opponent.c:1804-1817) calls BufferExecCompleted at once when the target's
 * sprite is `invisible` (a Dig / Fly / Dive user between its charge turn's MOVEEND_ATTACKER_INVISIBLE / animation and its attack turn): no
 * DoHitAnimHealthboxEffect, no 32 blink callbacks. The visible blink is 35 command frames (setup, 32 callbacks, completion, release), the
 * invisible one is 2 (the controller's one callback and its release): the next row (healthbarupdate) runs 33 rows earlier, measured as
 * ROM SE + 3 against SE + 36 on seed 648 (fsc1m section 2).
 */
export const HIT_ANIMATION_INVISIBLE_FRAMES = 2;
const HIT_ANIMATION_INVISIBLE_TIMING = Object.freeze({
  minimumFrames: HIT_ANIMATION_INVISIBLE_FRAMES,
  firstDisplayedAge: 1,
  invisibleTarget: true,
} as const);
const STATUS3_ON_AIR = 1 << 6;
const STATUS3_UNDERGROUND = 1 << 7;
const STATUS3_UNDERWATER = 1 << 18;
const STATUS3_SEMI_INVULNERABLE = STATUS3_ON_AIR | STATUS3_UNDERGROUND | STATUS3_UNDERWATER;

/** ekd1: the hit that KOs a semi-invulnerable target clears its status3 before the segment ends; the charge turn's Fly / Dig / Dive / Bounce print still says it was hidden. */
const SEMI_INVULNERABLE_CHARGE_MESSAGES = new Set(["STRINGID_PKMNFLEWHIGH", "STRINGID_PKMNDUGHOLE", "STRINGID_PKMNHIDUNDERWATER", "STRINGID_PKMNSPRANGUP"]);

/**
 * fsc1 / ekd1 (both scenes): is the HIT_ANIMATION target's sprite invisible when the controller runs? The sprite is hidden from a semi-invulnerable charge
 * turn's end (Scene OFF: MOVEEND_ATTACKER_INVISIBLE, an explicit sprite-visibility receipt; Scene ON: the Dig / Fly / Dive animation)
 * until MOVEEND_ATTACKER_VISIBLE / MOVEEND_TARGET_VISIBLE, which is the span STATUS3_SEMI_INVULNERABLE is set. So: invisible at the
 * segment start when the status is set then, switched by this segment's visibility receipts, and hidden once the battler's own charge
 * script (a charge-turn animation / PP receipt on it) ran earlier in the segment and the status stands at the segment's end, or the hit KOs it.
 * Scene ON measured on fsc1-fly-gust-on (datahpupdate 3 rows after the effectiveness SE) and ekd1-dig-eqko-on (s648 d0, Earthquake KO of a Dig user).
 */
function hitTargetSpriteInvisible(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  beforeRules: BattleScriptRulesContext,
  afterRules: BattleScriptRulesContext,
  battler: 0 | 1,
): boolean {
  let invisible = (beforeRules.battlers[battler]!.status3 & STATUS3_SEMI_INVULNERABLE) !== 0;
  const newlyHidden = !invisible && ((afterRules.battlers[battler]!.status3 & STATUS3_SEMI_INVULNERABLE) !== 0
    || (events.slice(index + 1).some((event) => event.payload.kind === "play-faint-cry" && event.payload.battler === battler)
      && events.slice(0, index).some((event) => event.provenance?.sourceLabel === CHARGE_TURN_SCRIPT && event.payload.kind === "message"
        && SEMI_INVULNERABLE_CHARGE_MESSAGES.has(event.payload.messageId) && event.payload.actionSnapshot?.attacker === battler)));
  for (let before = 0; before < index; before += 1) {
    const payload = events[before]!.payload;
    if (payload.kind === "set-battler-sprite-visibility" && payload.battler === battler) {
      if (events[before]!.provenance?.opcodeName === "B_SCR_OP_MOVEEND") invisible = payload.invisible;
    } else if (newlyHidden && events[before]!.provenance?.sourceLabel === CHARGE_TURN_SCRIPT
      && (payload.kind === "animation" || payload.kind === "set-battler-pp-data") && payload.battler === battler) invisible = true;
  }
  return invisible;
}
/** BattleScript_Pausex20's `pause B_WAIT_TIME_SHORT`. */
const SCENE_OFF_MOVE_PAUSE_FRAMES = 32;
const EXPLOSION_OFF_BODY_ROWS = 1;

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
 * the print's rows are exactly L + 64 (lsd194) and production's status-icon
 * command is the `updatestatusicon` row itself, so the mapping holds again from
 * that icon's execution (the ROM then runs waitstate's 2 rows and `goto` before
 * attackanimation): P = Δ(N) − Δ(icon) + 1 + lead (rst197; independent of L).
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
/** chg1: frames after the rows-to-receipt count at which a Scene OFF semi-invulnerable hide is drawn (fitted on the Dig lab, see the doc). */
const SCENE_OFF_SEMI_INVULNERABLE_HIDE_LEAD = 2;

/**
 * sta3 (docs/aud249-general-anim-sounds.md): the next action's first print after the MoveEnd receipts. STRINGID_PKMNISCONFUSED is
 * BattleScript_MoveUsedIsConfused's first instruction (attackcanceler jumps there: u = 2), ROM-measured as the same E + 1 + d + n + 6 + u.
 */
const ACTION_TRANSITION_NEXT_PRINTS: ReadonlySet<string> = new Set(["STRINGID_USEDMOVE", "STRINGID_PKMNISCONFUSED", "STRINGID_PKMNFASTASLEEP", "STRINGID_PKMNINLOVE"]);
/**
 * chg4 (ROM labs chg4-dig-lightscreen-{on,off}; docs/aud251-s11-scoreboard-refresh.md "chg4"): the first charging turn of Dig / Fly / Solar Beam ... that follows another
 * action in the same turn is a transition print too. Its empty box (BattleScriptFirstChargingTurn's STRINGID_EMPTYSTRING3, u = its execution) is placed as the used print:
 * Scene OFF opens it on the ROM's `printstring` row + 1 (MoveEnd 197 -> EffectSemi 204 -> box 215: +18 over the old 0). Scene ON's box opens 8 rows before the
 * printstring row (the box is the 8-row release wait, turn start: box 30 for printstring 37 / 38) and the ON chain already carries 2 of the rows: -10.
 */
const CHARGE_TURN_OPENER_SCENE_ON_ROWS = -10;
function isChargeTurnOpener(event: BattleKernelSemanticEvent): boolean {
  return event.payload.kind === "message" && event.payload.messageId === "STRINGID_EMPTYSTRING3" && event.provenance?.sourceLabel === CHARGE_TURN_SCRIPT;
}
/** gsp2: the wake-up print is a transition print (Scene ON; bbk1: Scene OFF too, ROM labs wkl1m-wakeup-{player,foe}-off MoveEnd -> print +15 the engine had no pause for). */
const WAKE_UP_ACTION_TRANSITION_NEXT_PRINT = "STRINGID_PKMNWOKEUP";
/**
 * gsp3 (ROM labs gsp3-attract-{player,foe}-on): "X is in love with Y!" (BattleScript_MoveUsedIsInLove, reached from attackcanceler by a `call`) is a transition
 * print too, 2 rows earlier than the trn176 count: MoveEnd 583 -> print row 592 (ROM) against the rule's 594.
 */
const IN_LOVE_TRANSITION_PRINT = "STRINGID_PKMNINLOVE";
const IN_LOVE_TRANSITION_ROWS = -2;

/**
 * wtl1 (ROM labs aud241c-win-{off,on}; P = the press on the foe's last "fainted!", Q = P + 2 the controller's completion): the win tail's script
 * rows draw nothing. 5 rows from Q to the first MoveEnd receipt (BattleScript_MoveEnd's setbyte, moveend; its receipts are exec 126/127 = P + 5 / P + 6),
 * then 19 from the second receipt to BattleScript_FrontierTrainerBattleWon's printstring (HandleAction_TryFinish / HandleFaintedMonActions:
 * BattleScript_HandleFaintedMon's checkteamslost, ActionFinished, HandleEndTurn_BattleWon, jumpifnotbattletype / jumpifbattletype): the
 * "Player defeated" printstring executes at P + 25, its first glyph at P + 26 in both scenes.
 */
export const WIN_TAIL_PRE_RECEIPT_ROWS = 5;
export const WIN_TAIL_POST_RECEIPT_ROWS = 19;

/** wtl1: the win-tail hold rows around a MoveEnd receipt run that ends in STRINGID_PLAYERDEFEATEDTRAINER1 (null for any other receipt). */
function winTailHoldRows(events: readonly BattleKernelSemanticEvent[], receiptIndex: number): Readonly<{ before: number; after: number }> | null {
  const isReceipt = (event: BattleKernelSemanticEvent | undefined) =>
    event !== undefined && event.payload.kind === "set-battler-sprite-visibility" && event.provenance?.opcodeName === "B_SCR_OP_MOVEEND";
  let end = receiptIndex;
  while (isReceipt(events[end + 1])) end += 1;
  const next = events[end + 1];
  if (next === undefined || next.payload.kind !== "message" || next.payload.messageId !== "STRINGID_PLAYERDEFEATEDTRAINER1") return null;
  return Object.freeze({
    before: isReceipt(events[receiptIndex - 1]) ? 0 : WIN_TAIL_PRE_RECEIPT_ROWS,
    after: end === receiptIndex ? WIN_TAIL_POST_RECEIPT_ROWS : 0,
  });
}

/**
 * wtl1 (ROM labs wtl1-rain-{growl,player}-{off,on}): the turn-end weather print (BattleScript_RainContinuesOrEnds, printfromtable at +0, u = 1) after
 * the last action's MoveEnd. The ROM runs MoveEnd's remaining cases and HandleEndTurn / DoFieldEndTurnEffects before it: its printstring
 * executes 10 rows after MoveEnd's first row (stat fall 425 -> 435, hit 323 -> 333), 3 rows later than the next action's USEDMOVE chain (n + 6 + u).
 */
const END_TURN_PRINT_SCRIPTS: ReadonlySet<string> = new Set([
  "BattleScript_RainContinuesOrEnds",
  "BattleScript_DamagingWeatherContinues",
  "BattleScript_SandStormHailEnds",
  "BattleScript_SunlightContinues",
  "BattleScript_SunlightFaded",
  "BattleScript_SideStatusWoreOff",
  "BattleScript_PoisonTurnDmg",
  "BattleScript_BurnTurnDmg",
  "BattleScript_CurseTurnDmg",
  "BattleScript_MonTookFutureAttack",
]);
const END_TURN_WEATHER_PRINT_EXTRA_ROWS = 1;

/**
 * etp1 (ROM labs etp1-{sandstorm,hail}{,5}-{off,on}): the rows from the end of the previous end-turn step to the damage print of
 * BattleScript_DamagingWeatherLoop's first / second pass. Every script instruction between two waits costs one row.
 * After "The sandstorm rages" / "The hail continues" (`waitmessage B_WAIT_TIME_LONG`, kernel E = print + 64): playanimation_var (a no-op row in
 * Scene OFF), setbyte, copyarraywithindex, weatherdamage, jumpifword, printfromtable, then the first glyph one row after: k + 1 with k = instructions
 * from E to the printfromtable (Scene OFF: command ends on E, 7 rows late). Scene ON: the General_Sandstorm / General_Hail command already ends
 * WEATHER_CONTINUES_LAUNCH_TAIL_ROWS after its last row, so only the instructions past that tail are added (+2). After the pass's `healthbarupdate`
 * / `datahpupdate` command the second pass's print comes 3 rows later than the command's end (both scenes).
 */
const DAMAGING_WEATHER_LOOP_SCRIPT = "BattleScript_DamagingWeatherLoop";
const DAMAGING_WEATHER_LOOP_AFTER_HP_ROWS = 3;
// Wish's heal print after its hp command (ROM lab etp1-wish: +5 rows, both scenes). Perish Song's count prints: `perishCountChainLeadRows` (pso1).
const WISH_SCRIPT = "BattleScript_WishComesTrue";
const END_TURN_NEXT_SCRIPT_ROWS = 5;
/**
 * etp1 (labs etp1-{roar,whirlwind}-{on,off}; ROM press P = the A that dismisses "was dragged out!"; s222-on-wc, s94-on-wc, docs/msg2): the turn's
 * first end-turn print (the MoveEnd receipts only in between) starts its first glyph on P + 15 (the printer's release, BattleScript_TrainerBattleForceOut's
 * tail, MoveEnd and DoBattlerEndTurnEffects' rows); the receipts' frames put it on P + 2: 13 rows more, both scenes.
 */
const DRAGGED_OUT_END_TURN_PRINT_ROWS = 13;
function endTurnPrintFollowsDraggedOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  for (let back = index - 1; back >= 0; back -= 1) {
    const previous = events[back]!;
    if (previous.payload.kind === "set-battler-sprite-visibility" && previous.provenance?.opcodeName === "B_SCR_OP_MOVEEND") continue;
    return previous.payload.kind === "message" && previous.payload.messageId === "STRINGID_PKMNWASDRAGGEDOUT";
  }
  return false;
}

/**
 * pso1 (ROM labs etk1-perish-*, Scene OFF rows, hcr3mProbe): the rows from the previous script's release to the Perish Song count print's first
 * glyph that the engine does not present. After a move's last print (the Splash "But nothing happened!" lab): release 368 -> MoveEnd -> PerishSongCountGoesDown+0x3 ex1 378 -> glyph 379
 * (10 rows more than the engine's one MoveEnd receipt row; seed 2741's ROM rows after a paralysis print 5 more, after "But it failed!" 12 more). After the Perish Song cast's own print (`waitmessage 64`; PerishSongLoop x4 batters, MoveEnd, the end-turn step): release
 * +0x10 3857 -> PerishSongTakesLife+0x3 3874 -> glyph 3875 (17 rows more). The second battler's count print follows the first's `waitmessage` by end2, the turn-effect
 * battler increment and the next iteration: 475 -> 479 (5 rows more).
 */
const PERISH_AFTER_MOVE_PRINT_ROWS = 10;
const PERISH_AFTER_CAST_PRINT_ROWS = 17;
const PERISH_SECOND_BATTLER_ROWS = 5;
const PERISH_AFTER_PARALYSIS_PRINT_ROWS = 5;
const PERISH_AFTER_BUT_IT_FAILED_ROWS = 12;
function perishCountChainLeadRows(events: readonly BattleKernelSemanticEvent[], index: number): number {
  const event = events[index]!;
  const label = event.provenance?.sourceLabel;
  if (event.payload.kind !== "message" || (label !== "BattleScript_PerishSongCountGoesDown" && label !== "BattleScript_PerishSongTakesLife")) return 0;
  for (let back = index - 1; back >= 0; back -= 1) {
    const previous = events[back]!;
    if (previous.payload.kind === "set-battler-sprite-visibility" && previous.provenance?.opcodeName === "B_SCR_OP_MOVEEND") continue;
    if (previous.payload.kind !== "message") return 0;
    const previousLabel = previous.provenance?.sourceLabel;
    if (previousLabel === "BattleScript_PerishSongCountGoesDown" || previousLabel === "BattleScript_PerishSongTakesLife") return PERISH_SECOND_BATTLER_ROWS;
    if (previous.payload.messageId === "STRINGID_FAINTINTHREE") return PERISH_AFTER_CAST_PRINT_ROWS;
    if (previous.payload.messageId === "STRINGID_PKMNISPARALYZED") return PERISH_AFTER_PARALYSIS_PRINT_ROWS;
    return previous.payload.messageId === "STRINGID_BUTITFAILED" ? PERISH_AFTER_BUT_IT_FAILED_ROWS : PERISH_AFTER_MOVE_PRINT_ROWS;
  }
  return 0;
}

function endTurnChainLeadRows(events: readonly BattleKernelSemanticEvent[], index: number, sceneOn: boolean): number {
  const event = events[index]!;
  const executed = event.provenance?.instructionExecution;
  if (event.payload.kind !== "message" || executed === undefined) return 0;
  const label = event.provenance?.sourceLabel;
  const perishLead = perishCountChainLeadRows(events, index);
  if (perishLead > 0) return perishLead;
  if (label === WISH_SCRIPT) {
    const previous = events[index - 1];
    return previous?.payload.kind === "hp-change" && previous.provenance?.sourceLabel === label && event.payload.messageId === "STRINGID_PKMNREGAINEDHEALTH"
      ? END_TURN_NEXT_SCRIPT_ROWS : 0;
  }
  if (END_TURN_PRINT_SCRIPTS.has(label ?? "") && label !== DAMAGING_WEATHER_LOOP_SCRIPT && endTurnPrintFollowsDraggedOut(events, index)) return DRAGGED_OUT_END_TURN_PRINT_ROWS;
  if (label !== DAMAGING_WEATHER_LOOP_SCRIPT) return 0;
  for (let back = index - 1; back >= 0; back -= 1) {
    const previous = events[back]!;
    const previousExecution = previous.provenance?.instructionExecution;
    if (previousExecution === undefined) return 0;
    if (previous.payload.kind === "hp-change") return DAMAGING_WEATHER_LOOP_AFTER_HP_ROWS;
    if (previous.payload.kind === "animation" && weatherContinuesAnimationOf(previous.payload) !== null) {
      if (sceneOn) return Math.max(0, executed - previousExecution - WEATHER_CONTINUES_LAUNCH_TAIL_ROWS);
      continue;
    }
    if (previous.payload.kind === "message") {
      return executed - (previousExecution + WAITMESSAGE_LONG_HOLD_FRAMES) + 1;
    }
  }
  return 0;
}

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
  sceneOn: boolean,
): Readonly<{ frames: number; rowsToReceipt: number }> | null {
  const isMoveEndReceipt = (event: BattleKernelSemanticEvent) =>
    event.payload.kind === "set-battler-sprite-visibility" && event.provenance?.opcodeName === "B_SCR_OP_MOVEEND";
  const e1 = events[receiptIndex]!.provenance?.instructionExecution;
  if (e1 === undefined) return null;
  let execution = e1;
  let used: number | null = null;
  let statusFramesAfter = 0;
  let usedIsPreMove = false;
  let inLoveRows = 0;
  let endTurnRows = 0;
  for (let index = receiptIndex + 1; index < events.length; index += 1) {
    const event = events[index]!;
    const next = event.provenance?.instructionExecution;
    if (next === undefined) return null;
    if (next > execution && isMoveEndReceipt(event)) {
      execution = next;
      continue;
    }
    if (next < e1 && event.payload.kind === "set-battler-status-data" && used === null) {
      // sta3: the sleep counter's status write inside the next action's attackcanceler draws nothing; its 1-frame command is presented after the pause.
      const frames = sceneOn ? sceneOnStatusFrames(events, index) : sceneOffStatusFrames(events, index, null, 0);
      if (frames === null) return null;
      statusFramesAfter += frames;
      continue;
    }
    // sbm1: Solar Beam in sun runs SolarBeamOnFirstTurn's `ppreduce` (no draw) before its used print.
    if (next < e1 && event.payload.kind === "set-battler-pp-data" && used === null) continue;
    const endTurnWeather = event.payload.kind === "message" && END_TURN_PRINT_SCRIPTS.has(event.provenance?.sourceLabel ?? "");
    if (
      next >= e1 || event.payload.kind !== "message"
      || !(endTurnWeather || ACTION_TRANSITION_NEXT_PRINTS.has(event.payload.messageId) || event.payload.messageId === WAKE_UP_ACTION_TRANSITION_NEXT_PRINT
        || isChargeTurnOpener(event))
    ) return null;
    if (endTurnWeather) endTurnRows = END_TURN_WEATHER_PRINT_EXTRA_ROWS;
    if (sceneOn && isChargeTurnOpener(event)) endTurnRows = CHARGE_TURN_OPENER_SCENE_ON_ROWS;
    used = next;
    usedIsPreMove = !endTurnWeather && event.payload.messageId !== "STRINGID_USEDMOVE";
    if (event.payload.messageId === IN_LOVE_TRANSITION_PRINT) inLoveRows = IN_LOVE_TRANSITION_ROWS;
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
    if (kind === "status-animation") {
      anchor = event;
      break;
    }
    // lse4: a lead-class Scene ON body that prints nothing after its animation (Wish): the release row is the animation's own, one row after its execution.
    if (kind === "animation" && event.payload.animationId === "MOVE_ANIMATION") {
      const presentedBody = commands.find((command) => command.type === "move-animation" && command.eventSequence === event.sequence);
      if (presentedBody?.type !== "move-animation" || (presentedBody.timing.bodyLeadFrames ?? 0) <= 0) return null;
      anchor = event;
      break;
    }
  }
  if (anchor === null) return null;
  let anchorExecution = anchor.provenance!.instructionExecution;
  if (anchor.payload.kind === "animation" || anchor.payload.kind === "status-animation") anchorExecution += 1;
  if (anchor.payload.kind === "message") {
    if (anchor.payload.messageId === "STRINGID_USEDMOVE") return null;
    if (anchor.payload.messageId === "STRINGID_EMPTYSTRING3") {
      if (hitAllLoopEmptyBoxTiming(events, events.indexOf(anchor)) === null || events[receiptIndex - 1] !== anchor) return null;
      anchorExecution = e1;
    } else {
      const following = BATTLE_SCRIPT_PROGRAM.instructions[anchor.provenance!.programCounter + 1];
      const wait = following?.opcodeName === "B_SCR_OP_WAITMESSAGE"
        ? ACTION_TRANSITION_WAIT_ROWS[following.operands[0]?.expression ?? ""]
        : undefined;
      if (wait === undefined) return null;
      anchorExecution += wait;
    }
  }
  let presented = 0;
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index]!;
    if (!("eventSequence" in command) || command.eventSequence <= anchor.sequence) break;
    const timing = (command as { timing?: { minimumFrames: number; holdFrames?: number } }).timing;
    if (timing === undefined || (timing.holdFrames ?? 0) > 0) return null;
    presented += timing.minimumFrames;
  }
  // sta3 (aud242g dreameater, ROM): before a pre-move print the status icon's second controller row (production presents one frame) is one more row.
  const iconSecondRow = anchor.payload.kind === "status-icon-update" && usedIsPreMove ? 1 : 0;
  const frames = e1 - anchorExecution - 1 + ACTION_TRANSITION_ROWS + used - presented - statusFramesAfter + iconSecondRow + inLoveRows + endTurnRows;
  return frames > 0 ? { frames, rowsToReceipt: e1 - anchorExecution - 1 - presented } : null;
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
  let presented = openerFrames;
  let held = false;
  let iconSequence: number | null = null;
  for (const command of presentedSinceOpener) {
    const timing = (command as { timing?: { minimumFrames: number; holdFrames?: number } }).timing;
    if (command.type === "move-animation" || command.type === "hit-animation" || timing === undefined) return null;
    if (command.type === "message" || (timing.holdFrames ?? 0) > 0) held = true;
    if (command.type === "status-icon") iconSequence = command.eventSequence;
    // mem2: an instant-drop hp command presents its real rows (tailFrames) and has no floor.
    presented += command.type === "hp" && command.timing.instantDrop !== undefined ? command.timing.tailFrames ?? 0 : timing.minimumFrames;
  }
  // The held-message path is ROM-anchored only for Rest's shape: trysetrest's
  // status, the held print, the status icon (off108 §1 / off148 R3). Other
  // held prints before the attack receipt (Magnitude, a Magic Coat bounce)
  // are unmeasured.
  if (held && presentedSinceOpener.map((command) => command.type).join() !== "status,message,status-icon") return null;
  // rst197: the held chain's last command is Rest's `updatestatusicon` (one frame = the ROM row it executes on, the print + its
  // waitmessage being exactly L + 64 rows); the ROM runs `waitstate` (2 rows) and `goto` before attackanimation, so the pause (from the
  // frame after the icon command) is anchored on that icon's execution: P = Δ(N) - Δ(icon) + 1 + lead.
  let iconExecution: number | null = null;
  if (held) {
    iconExecution = events.find((event) => event.sequence === iconSequence)?.provenance?.instructionExecution ?? null;
    if (iconExecution === null) return null;
  }
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
    const frames = iconExecution !== null
      ? next - iconExecution + 1 + lead - skipped
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
const STAT_DOWN_PRINT_LABEL = "BattleScript_StatDownPrintString";
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
    if (candidate.payload.kind === "set-battler-pp-data" || candidate.payload.kind === "stat-stage-change") continue;
    if (candidate.payload.kind !== "message") return null;
    const programCounter = candidate.provenance!.programCounter;
    // chg2 (s3738 Aerial Ace -39 / -79): a stat change that cannot happen (BattleScript_EffectStatDown: `pause B_WAIT_TIME_SHORT; goto BattleScript_StatDownPrintString`) reaches
    // its print through a goto, which the straight-line look-back below stops at; a print at that label with no animation receipt before it is the pause path (ROM: used print
    // -> "won't go lower" print 61 rows, the pause's 32 + 6 dispatch steps after the 23-row print).
    if (candidate.provenance?.sourceLabel === STAT_DOWN_PRINT_LABEL) return next - used + 1;
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
        && (instruction.operands[0]?.expression === "B_WAIT_TIME_SHORT" || instruction.operands[0]?.expression === "B_WAIT_TIME_LONG")
      ) return next - used + 1;
      // fix122 (aud118 DEFECT B): a ROM-proven attackanimation reached with no
      // receipt took Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch, which
      // pushes BattleScript_Pausex20 in BOTH scenes (battle_script_commands.c:
      // 1793-1797): the failed set* / protect-like / stockpile / setseeded print.
      if (NO_EFFECT_ATTACKANIMATION_HOLD_PCS.has(programCounter - back)) return next - used + 1;
    }
    // eqk1 (s1914 seg21, labs eqk1-eq-imm / eqk1-tackle-imm): a damaging move's `resultmessage` ("It doesn't affect X!") reached with no
    // animation receipt took the same NO_EFFECT branch (Pausex20 in both scenes) at the `attackanimation` 9 instructions back, behind
    // waitanimation .. datahpupdate .. critmessage .. waitmessage that run without a receipt: the print comes one row per execution later.
    // cfs1 (s8108 d41 / d44 / d50, labs cfs1-digconf-levitate-{on,off}): Levitate / Wonder Guard's miss print (MOVE_RESULT_MISSED, also in
    // MOVE_RESULT_NO_EFFECT) reaches the same Pausex20: used print -> "makes Ground moves miss" 69 rows (Dig unleash, ROM 1061 -> 1130), as ITDOESNTAFFECT.
    if (
      candidate.provenance!.opcodeName === "B_SCR_OP_RESULTMESSAGE"
      && (candidate.payload.messageId === "STRINGID_ITDOESNTAFFECT"
        || candidate.payload.messageId === "STRINGID_PKMNMAKESGROUNDMISS"
        || candidate.payload.messageId === "STRINGID_AVOIDEDDAMAGE")
    ) {
      for (let back = 1; back <= 12 && programCounter - back >= 0; back += 1) {
        const opcode = BATTLE_SCRIPT_PROGRAM.instructions[programCounter - back]?.opcodeName;
        if (opcode === "B_SCR_OP_ATTACKANIMATION") return next - used + 1;
        if (opcode === undefined || opcode === "B_SCR_OP_GOTO" || opcode === "B_SCR_OP_END" || opcode === "B_SCR_OP_RETURN") break;
      }
    }
    return null;
  }
  return null;
}
/**
 * pau2 (docs/pau1-script-pauses.md "pau2"): the script labels whose print has NO "X used Y!" anchor (an end-of-turn script
 * started by BattleScriptExecute), so sourcePauseUsedMoveHoldFrames can never see their pre-print `pause`. Each is a ROM-measured
 * label: BattleScript_SafeguardEnds = `pause B_WAIT_TIME_SHORT` 32 rows, then the print (psn4, docs/aud249-general-anim-sounds.md,
 * seeds 3738 / 499 ROM replays). The switch-in ability prints (Drizzle, Trace, Sand Stream, Drought, Intimidate) sit behind the
 * ability pop-up and are unmeasured, so they are not listed.
 * msg2: BattleScript_WishButFullHp (battle_scripts_1.s:3601-3606: WISH print, `waitmessage B_WAIT_TIME_LONG`, `pause
 * B_WAIT_TIME_SHORT`, then "X's HP is full!"), an end-turn script too: its pause was not presented (the HP-full print came 66 rows
 * after the wish print's last glyph; the ROM's comes 100 rows after, fcm1 catcher, 7 / 7 rounds in both scenes).
 */
export const ANCHORLESS_PRE_PRINT_PAUSE_LABELS = Object.freeze(["BattleScript_SafeguardEnds", "BattleScript_WishButFullHp"] as const);
/**
 * pau3: ROM-measured frames the end-turn script start adds before its pause (SafeguardEnds: the print is 10 frames later than the pause
 * alone, Scene OFF and ON, pau3-safeguard-{off,on}). msg2: WishButFullHp's pause follows the previous print's own wait inside the
 * same script, so only the pause and printstring rows are added: 32 + 2 = 34 (the 100 - 66 rows above).
 */
const ANCHORLESS_PRE_PRINT_LEAD_FRAMES: Readonly<Record<string, number>> = Object.freeze({
  BattleScript_SafeguardEnds: 10,
  BattleScript_WishButFullHp: 2,
});
const WAIT_TIME_FRAMES: Readonly<Record<string, number>> = Object.freeze({ B_WAIT_TIME_SHORT: 32, B_WAIT_TIME_LONG: 64 });
/** The source `pause`'s length when the print at `messageIndex` is the first print of a listed anchor-less script; else null. */
export function anchorlessPrePrintPauseFrames(event: BattleKernelSemanticEvent): number | null {
  const provenance = event.provenance;
  if (provenance === undefined || provenance.programCounter < 1) return null;
  if (!(ANCHORLESS_PRE_PRINT_PAUSE_LABELS as readonly string[]).includes(provenance.sourceLabel)) return null;
  const instruction = BATTLE_SCRIPT_PROGRAM.instructions[provenance.programCounter - 1];
  if (instruction?.opcodeName !== "B_SCR_OP_PAUSE") return null;
  const pause = WAIT_TIME_FRAMES[instruction.operands[0]?.expression ?? ""];
  return pause === undefined ? null : pause + (ANCHORLESS_PRE_PRINT_LEAD_FRAMES[provenance.sourceLabel] ?? 0);
}
/**
 * hie1: the executions the interpreter spent on the way to `events[index]` and the lead the controller adds. A restart (the event's
 * execution is below the one before it, or it is the first event) counts from execution 0 and leads by the restart lead; a
 * continuation counts from the previous event and leads by the continue lead.
 */
function heldItemEffectExecutionsAndLead(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
): { executions: number; lead: number } {
  const execution = instructionExecutionOf(events[index]!);
  const previous = index === 0 ? null : events[index - 1]!.provenance?.instructionExecution ?? null;
  return previous === null || execution < previous
    ? { executions: execution, lead: HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES }
    : { executions: execution - previous, lead: HELD_ITEM_EFFECT_CONTINUE_LEAD_FRAMES };
}
/**
 * hie5 (ROM labs hie5-{yawn,curse,swordsdance}-foe-on): an item script that restarts after a move script whose last print is followed by MoveEnd
 * (`printstring`, `waitmessage`, T more script rows, MoveEnd; Yawn / Curse / Swords Dance T = 1, Recoil T = 3) starts its animation at MoveEnd + 11 rows,
 * so the controller lead is HELD_ITEM_EFFECT_AFTER_PRINT_LEAD_FRAMES + T (the engine's command starts 2 frames after the print's wait ends). The 15-row
 * restart lead fitted a hit's tail (hp update, no print). T is the kernel's execution count from the print to MoveEnd less the waitmessage's frames + 2.
 * Null when the event before the animation is not a print followed by MoveEnd receipts. Scene ON only (the caller).
 */
export const HELD_ITEM_EFFECT_AFTER_PRINT_LEAD_FRAMES = 9;
function heldItemEffectAfterPrintLead(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  let print = index - 1;
  while (print >= 0 && events[print]!.provenance?.sourceLabel === "BattleScript_MoveEnd") print -= 1;
  if (print < 0 || print === index - 1 || events[print]!.payload.kind !== "message") return null;
  const programCounter = events[print]!.provenance?.programCounter;
  const printExecution = events[print]!.provenance?.instructionExecution;
  const moveEndExecution = events[print + 1]!.provenance?.instructionExecution;
  if (programCounter === undefined || printExecution === undefined || moveEndExecution === undefined) return null;
  const wait = BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 1];
  if (wait?.opcodeName !== "B_SCR_OP_WAITMESSAGE") return null;
  const waitFrames = WAIT_TIME_FRAMES[wait.operands[0]?.expression ?? ""];
  if (waitFrames === undefined) return null;
  return HELD_ITEM_EFFECT_AFTER_PRINT_LEAD_FRAMES + moveEndExecution - printExecution - waitFrames - 2;
}
/**
 * hie1: Scene OFF's presented hold for an item print whose source is `playanimation ..., B_ANIM_HELD_ITEM_EFFECT` right before it
 * (battle_script_commands.c:4014-4018 -> BattleScript_Pausex20, `pause B_WAIT_TIME_SHORT` = 32 frames). Every instruction from the
 * previous receipt to the print runs once per frame (the pause's own blocked retries included), so the hold is that execution count
 * plus the controller lead. When the status command of a cure berry's status-data receipt (off121) already presents those executions
 * (`executionsPresented`: the last command is that `status`), only the lead remains. Null when the print is not preceded by that
 * instruction or has no provenance.
 */
/** wsh1: the controller lead replacing the held-item leads (15 / 9) for the other two print-after-playanimation sites (ROM-measured: Wish 36 = its 36 executions, Focus Band 40 = 38 + 2). */
const WSH1_OFF_HOLD_LEAD: Readonly<Record<string, number>> = { B_ANIM_WISH_HEAL: 0, B_ANIM_FOCUS_BAND: 2, B_ANIM_INGRAIN_HEAL: 0, B_ANIM_TURN_TRAP: 0 };
/** wsh1: Scene OFF's Pausex20 before the hit, ROM-measured on tools/battle-lab/wsh1-fs-off.json (the previous message's own wait is already presented). */
const FUTURE_SIGHT_HIT_OFF_HOLD_FRAMES = 42;
/** BattleScript_DoFutureAttackHit's `effectivenesssound` right after the shared PLAYANIMATION slot (Future Sight's jumps over Doom Desire's; both take Pausex20 in Scene OFF). */
function futureSightHitPlayanimationBefore(programCounter: number | undefined): boolean {
  if (programCounter === undefined) return false;
  return BATTLE_SCRIPT_PROGRAM.instructions[programCounter - 1]?.opcodeName === "B_SCR_OP_EFFECTIVENESSSOUND"
    && BATTLE_SCRIPT_PROGRAM.instructions[programCounter - 2]?.operands.some((operand) => operand.expression === "B_ANIM_DOOM_DESIRE_HIT") === true;
}
/** trp1: the animType operand of the `playanimation` right before the print at `messageIndex` (null when the print does not follow one). */
function playanimationBeforePrint(events: readonly BattleKernelSemanticEvent[], messageIndex: number): string | null {
  const programCounter = events[messageIndex]!.provenance?.programCounter;
  if (programCounter === undefined || programCounter < 1) return null;
  const instruction = BATTLE_SCRIPT_PROGRAM.instructions[programCounter - 1];
  return instruction?.opcodeName === "B_SCR_OP_PLAYANIMATION" ? instruction.operands[1]?.expression ?? null : null;
}
function heldItemEffectOffHoldFrames(
  events: readonly BattleKernelSemanticEvent[],
  messageIndex: number,
  executionsPresented: boolean,
): number | null {
  const programCounter = events[messageIndex]!.provenance?.programCounter;
  if (programCounter === undefined || programCounter < 1) return null;
  const instruction = BATTLE_SCRIPT_PROGRAM.instructions[programCounter - 1];
  if (
    instruction?.opcodeName !== "B_SCR_OP_PLAYANIMATION"
    || !instruction.operands.some((operand) => operand.expression === "B_ANIM_HELD_ITEM_EFFECT" || operand.expression === "B_ANIM_ITEM_KNOCKOFF" || operand.expression in WSH1_OFF_HOLD_LEAD)
  ) return null;
  if (instruction.operands.some((operand) => operand.expression === "B_ANIM_ITEM_KNOCKOFF")) return ITEM_KNOCKOFF_OFF_HOLD_FRAMES;
  const { executions, lead } = heldItemEffectExecutionsAndLead(events, messageIndex);
  const leadFrames = instruction.operands.map((operand) => WSH1_OFF_HOLD_LEAD[operand.expression]).find((value) => value !== undefined) ?? lead;
  return (executionsPresented ? 0 : executions) + leadFrames;
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
 * gsp2 (docs/aud251-s11-scoreboard-refresh.md "gsp2"; ROM per-frame probe on the 25 Scene ON seeds): `BattleScript_MoveUsedWokeUp`
 * (`bicword; printfromtable gWokeUpStringIds; waitmessage B_WAIT_TIME_LONG; updatestatusicon BS_ATTACKER; return`) is entered by
 * attackcanceler's sleep check, which writes the cleared status (the `status` receipt) and prints two rows later. The status write
 * draws nothing in Scene ON (no status animation follows).
 */
const WAKE_UP_SCRIPT = "BattleScript_MoveUsedWokeUp";
/** ftp1: `BattleScript_MoveUsedUnfroze` is the wake-up script without the `bicword`: print, `waitmessage B_WAIT_TIME_LONG`, `updatestatusicon`, `return` (ROM print -> icon 91 = the wake-up's hold + 2). */
const THAW_SCRIPT = "BattleScript_MoveUsedUnfroze";
/** The wake-up print's instructionExecution when `events[statusIndex]` is attackcanceler's sleep-clearing status write, else null. */
function wakeUpPrintExecution(events: readonly BattleKernelSemanticEvent[], statusIndex: number): number | null {
  const status = events[statusIndex]!;
  if (status.payload.kind !== "set-battler-status-data" || status.provenance?.opcodeName !== "B_SCR_OP_ATTACKCANCELER") return null;
  const print = events[statusIndex + 1];
  const icon = events[statusIndex + 2];
  if (
    print === undefined || icon === undefined || print.payload.kind !== "message" || print.provenance?.sourceLabel !== WAKE_UP_SCRIPT
    || icon.payload.kind !== "status-icon-update" || icon.provenance?.sourceLabel !== WAKE_UP_SCRIPT
  ) return null;
  return print.provenance.instructionExecution ?? null;
}
/**
 * gsp2: rows from commit to the first action's first print: the action dispatch (`SpecialStatusesClear` ...: the script starts on row 6)
 * plus the print's instructionExecution u (one row each, the first print on 6 + u: ROM 9 / 12 / 17 for u = 3 / 6 / 11). The turn's
 * first command starts on commit + 9 (u = 3), so a wake-up's status command lasts u - 3 and its print starts on the ROM's row.
 */
const TURN_START_PRINT_BASE_U = 3;
/**
 * gsp2: the wake-up print's `waitmessage B_WAIT_TIME_LONG` completes, `updatestatusicon` executes and the box returns two rows after
 * the 64-row hold (ROM print -> icon rows 82 against the 80 of the plain `WAITMESSAGE_LONG_TIMING` for every wake-up, both prints'
 * glyph counts alike).
 */
const WAKE_UP_MESSAGE_TAIL_ROWS = 2;
const WAKE_UP_MESSAGE_TIMING = Object.freeze({
  minimumFrames: 0,
  holdFrames: WAITMESSAGE_LONG_HOLD_FRAMES + WAKE_UP_MESSAGE_TAIL_ROWS,
} as const);
/**
 * gsp2: the wake-up's `updatestatusicon` row to the next print: `return` and the move script's rows up to its first print run one per
 * frame (ROM icon -> next print = instructionExecution delta + 1 on 22 of 23 wake-ups; the icon command's own 1 frame is that +1).
 */
function wakeUpStatusIconFrames(events: readonly BattleKernelSemanticEvent[], iconIndex: number): number | null {
  const icon = events[iconIndex]!;
  if ((icon.provenance?.sourceLabel !== WAKE_UP_SCRIPT && icon.provenance?.sourceLabel !== THAW_SCRIPT) || icon.payload.kind !== "status-icon-update") return null;
  const next = events[iconIndex + 1];
  const from = icon.provenance.instructionExecution;
  const to = next?.provenance?.instructionExecution;
  if (next === undefined || next.payload.kind !== "message" || from === undefined || to === undefined || to <= from) return null;
  return to - from + 1;
}

/**
 * ftp1: attackcanceler's natural thaw (the status write, then `BattleScript_MoveUsedUnfroze` = printfromtable, waitmessage,
 * updatestatusicon with no pre-hold and no status animation) prints one row after the write in both scenes (off121: thaw 1), so the
 * Scene ON status command lasts delta(print) - delta(status) instead of the 32-frame status pause. Returns the thaw print's
 * instructionExecution, else null.
 */
function thawPrintExecution(events: readonly BattleKernelSemanticEvent[], statusIndex: number): number | null {
  const status = events[statusIndex]!;
  if (status.payload.kind !== "set-battler-status-data" || status.provenance?.opcodeName !== "B_SCR_OP_ATTACKCANCELER") return null;
  for (let index = statusIndex + 1; index < events.length; index += 1) {
    const payload = events[index]!.payload;
    if (payload.kind === "set-battler-pp-data" || payload.kind === "play-se") continue;
    if (payload.kind !== "message" || (payload.messageId !== "STRINGID_PKMNWASDEFROSTED2" && payload.messageId !== "STRINGID_PKMNWASDEFROSTEDBY")) return null;
    return events[index]!.provenance?.instructionExecution ?? null;
  }
  return null;
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
  const wakeUpPrint = wakeUpPrintExecution(events, statusIndex);
  if (wakeUpPrint !== null) return wakeUpPrint - status;
  const thawPrint = thawPrintExecution(events, statusIndex);
  if (thawPrint !== null) return thawPrint - status;
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
 * drains the SE); HIT_ANIMATION is a sprite blink. kno3: B_ANIM_ITEM_KNOCKOFF waits the same way (43 fixed rows, kno2). Every other request (Speed Boost, held items, ...) presents 0.
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
  } else if (request.animationId === "ITEM_KNOCKOFF") {
    fixedRows = ITEM_KNOCKOFF_SE_FIXED_ROWS;
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
/**
 * hpd4: the live bodies whose ROM windows (attackanimation exec -> gAnimScriptActive -> hit controller, tools/integration/hpd2Probe.py) show the
 * accepted live window does not contain the script lead: Sonic Boom, Dragon Rage, Defense Curl, Rollout. Seismic Toss is audited but held out (docs/hpd1-hp-hold.md, hpd4). Their lead is presented as
 * the command's first rows (`bodyLeadFrames`); every other body keeps the lead in its script tail (its accepted window was fitted without an audit).
 */
const HPD4_BODY_LEAD_MOVE_IDS: readonly number[] = [49, 82, 111, 205, 301, 69];
/**
 * hpd8: the "shape A" bodies of hpd7 / hpd7c (docs/hpd1-hp-hold.md): the accepted live window is the ROM's gAnimScriptActive length + 1, the ROM gap after it is 4.
 * Their lead is the kernel's instruction count (no table), and the rows after the body are 6 - pre - post (`liveMoveHitTailRows`). Aerial Ace, Psychic,
 * Thunderbolt, Double-Edge, Quick Attack, Body Slam, Ancient Power, Giga Drain, Ice Beam, Surf, Dig (the attack turn only: the charge turn is shape C),
 * Struggle, Rock Slide, Bubble Beam, Fire Blast, Magical Leaf.
 */
const HPD8_SHAPE_A_MOVE_IDS: ReadonlySet<number> = new Set([332, 94, 85, 38, 98, 34, 246, 202, 58, 57, 91, 165, 157, 61, 126, 345, 53, 76, 44, 188, 89, 185, 56, 59]);
/**
 * sta5 (docs/aud249-general-anim-sounds.md): the move-inflicted status bodies of sta4 (Flatter 260, Swagger 207, Spore 147, Toxic 92): the rows after the
 * body that put the next command (`stat` / `status`, then the stat or status animation) on the ROM row, net of the 2-row `stat` / `status` command.
 */
export const STA5_STATUS_BODY_TAIL_ROWS: ReadonlyMap<number, number> = new Map([[260, 4], [207, 5], [147, 0], [92, 7], [95, 0]]);
/**
 * lead2 (B1, docs/lead1m-rule-lead-design.md): the nine unaudited bodies the ROM measured as shape A (live + idle = len + 1, gap 4, counter lead = ROM lead):
 * Double Kick 24 (hit 1: lead 16; hit 2+ has no used-print anchor, so no lead and no tail), Icy Wind 196, Water Pulse 352, Facade 263, Mega Kick 25, Counter 68 (lead 4),
 * Comet Punch 4 and Doubleslap 3 (hit 1: lead 15), Mega Drain 72.
 */
const LEAD2_SHAPE_A_MOVE_IDS: ReadonlySet<number> = new Set([24, 196, 352, 263, 25, 68, 4, 72, 3]);
/**
 * lead3 (B2, docs/lead1m-rule-lead-design.md): the unmeasured plain hits ("A?") and +-1 bodies ("A~") of the appendix. LEAD3_MEASURED: the bodies whose ROM window (first HP-drain frame, Scene ON lab)
 * and matched frames improved with the rule: Shadow Ball 247, Rock Tomb 317, Psybeam 60, Crunch 242, Knock Off 282, Ice Punch 8, Headbutt 29, Slam 21, Flail 175, Metal Claw 232, Slash 163,
 * Mud-Slap 189, Fire Punch 7, and the non-5 counters Fury Swipes 154 (hit 1, lead 15), Low Kick 67 (8), Fury Cutter 210 (9), Psywave 149 (6), Horn Drill 32 (7).
 * LEAD3_PREDICTED: the other single-hit A? / A~ bodies with the plain counter 5, joined by the class (gap 4 by the next-event chain), not measured one by one.
 * Out: Night Shade 101 (no HP drain in either arm to compare), Signal Beam 324 / Mud Shot 341 / Dynamic Punch 223 / Covet 343 / Gust 16 (their pan-sweep SE rows score `extra` in the T1 census with the shifted clock), the trap / charge / flinch-turn bodies (Focus Punch, Fake Out, Whirlpool, Wrap, Fire Spin, Bind, Sand Tomb), and every multi-hit or variant-counter body not measured.
 */
const LEAD3_MEASURED_MOVE_IDS: readonly number[] = [247, 317, 60, 242, 282, 8, 29, 21, 175, 232, 163, 189, 7, 154, 67, 210, 149, 32];
const LEAD3_PREDICTED_MOVE_IDS: readonly number[] = [337, 315, 124, 51, 93, 52, 224, 290, 129, 231, 309, 306, 238, 211, 138, 161, 55, 348, 228, 314, 183, 87, 65, 62, 23, 323, 179, 172, 136, 75, 36, 326, 229, 152, 351, 327, 310, 299, 284, 190, 162, 158, 146, 122, 66, 330, 325, 257, 123, 27, 305, 304, 245];
const LEAD3_SHAPE_A_MOVE_IDS: ReadonlySet<number> = new Set([...LEAD3_MEASURED_MOVE_IDS, ...LEAD3_PREDICTED_MOVE_IDS]);
/**
 * lse2 (docs/hpd1-hp-hold.md): the no-hit status / stat bodies whose script lead (ROM `exec` rise -> `gAnimScriptActive`) is put in front of the body instead of
 * in the script tail: Leech Seed (lead 36), Cosmic Power (2), Calm Mind (2), Encore (2, turn 2). Their body SEs keep the move-body sound clock (calibrated on a 7-row lead; Encore 3),
 * so the sound clock is moved by `bodyLead - calibrated lead` (`lse2BodySoundAgeShift`).
 */
const LSE2_BODY_LEAD_MOVE_IDS: ReadonlySet<number> = new Set([73, 322, 347, 227]);
/** The lead each lse2 body's sound clock was calibrated on (Encore's 220-row body SEs sit 4 rows closer to the print release). */
const LSE2_SOUND_CLOCK_LEADS: ReadonlyMap<number, number> = new Map([[73, 7], [322, 7], [347, 7], [227, 3]]);
/**
 * lead4 (B3, docs/lead1m-rule-lead-design.md): the "S" status / stat bodies (Double Team, Protect, Light Screen, Rain Dance, Agility, Swords Dance, ...) whose script lead
 * (ROM `exec` rise -> `gAnimScriptActive`) is put in front of the body instead of after it. The row total is unchanged (the new script tail is the old one less the lead, the lead is
 * added in front), so only the body position and its sound clock move by `lead`. Only ids whose tail is presented (a post-row side, or a `LIVE_MOVE_SCRIPT_TAIL_TRAIL_ROWS` entry) are in:
 * for the others the lead would add frames. Held out (no presented tail): Growth 74, Recycle 278, Fake Tears 313, 248, 244, 285, 194, 193, 191, 297, 144, 110.
 */
const LEAD4_S_LEAD_MOVE_IDS: ReadonlySet<number> = new Set([
  104, 182, 113, 240, 184, 108, 201, 204, 219, 266, 28, 241, 213, 97, 334, 230, 151, 133, 258, 14, 203, 197, 349, 254, 215, 107, 281, 180, 288, 195, 115, 103,
  277, 178, 43, 39, 148, 106, 275, 112, 321, 259, 319, 271, 339, 294, 272, 50, 269, 116,
]);
/**
 * lse4 (docs/hpd1-hp-hold.md lse3 table): Revenge 279 and Absorb 71 join the shape-A class (lead 5, gap 4). Absorb's accepted window is 2 rows short of the ROM's len + 1 (`LSE4_WINDOW_SHORT_ROWS`).
 */
const MAGNITUDE_MOVE_ID = 222;
const LSE4_SHAPE_A_MOVE_IDS: ReadonlySet<number> = new Set([279, 71, 222]);
/**
 * hit1 (docs/hit1-move-hit-timing.md): Thunder Punch, lead1m's class B body (counter lead 5 = the ROM's, gap 4, s = +32: "fix the adapter window
 * first"). Its window is now the ROM's: the 10 idle lead rows (idle94) + 104 body rows + Cmd_end's 22 SE-wait rows = len 135 + 1 (liveMoveEndSeWaitRows),
 * so it is shape A: the lead in front, tail 6 - pre - post. ROM (frame catcher, t3 x 33): the body and the hit blink on the ROM's rows.
 */
const HIT1_SHAPE_A_MOVE_IDS: ReadonlySet<number> = new Set([9]);
/**
 * lse4 "gap-print": the lead is the kernel counter, the rows after the body are `T = 2 + gap - pre - post + s` with the ROM gap of the next command: a print (`printfromtable` / `printstring`) is
 * Delta + 1 (Recycle 3, the Razor Wind charge turn 7), any other next command is shape A (gap 4). Recycle 278, Razor Wind 13 (both turns).
 */
const LSE4_GAP_PRINT_MOVE_IDS: ReadonlySet<number> = new Set([278, 13]);
/** lse4 "lead-only": a body with no visible print after it (the ROM's gap is the generic action transition, played by `actionTransitionPauseFrames`): Wish 273. */
const LSE4_LEAD_ONLY_MOVE_IDS: ReadonlySet<number> = new Set([273]);
/** lse4: rows the accepted adapter window is short of the ROM's `len + 1` (`s`): Absorb (script runs 2 rows past the window), Razor Wind (len = live, both turns). Added to the rows after the body. */
export const LSE4_WINDOW_SHORT_ROWS: ReadonlyMap<number, number> = new Map([[71, 2], [13, 1]]);
/**
 * b4l "c-lead" (docs/aud251-s11-scoreboard-refresh.md b4m / b4l): the B4 status / hit bodies whose kernel lead (the instruction rows from the used print's release to `attackanimation`,
 * ROM L = A0 - R - 3: 9 / 9 / 7 / 7 / 7 / 7 / 4 / 6 / 8 / 9 / 7) is presented in front of the body, with the lead-only class's tail plus a per-id window adjust: the rows after the body the
 * ROM's next command (the status animation, stat, or hit animation) is off by once the lead is in (`C_LEAD_WINDOW_ADJUST`, ROM next command - engine next command). Thunder Wave 86, Stun Spore 78,
 * Sleep Powder 79, Sing 47, Grasswhistle 320, Confuse Ray 109, Curse 174, Lovely Kiss 142, Will-O-Wisp 261, Glare 137, Brick Break 280, Sweet Kiss 186 (cfs1: window adjust 2,
 * labs mechanic-sweet-kiss-{player,opponent}-luvdisc-*: every Confusion SE -2 -> +0; Supersonic 48 was tried and moved s5569 d12 15 rows the wrong way (T2 mass +208), so it stays out).
 */
export const C_LEAD_WINDOW_ADJUST: ReadonlyMap<number, number> = new Map([[47, 3], [142, 3], [280, 3], [186, 2], [261, 2], [137, 2], [109, 2], [174, 4], [320, -2], [86, 0], [78, 0], [79, 0]]);
/** The lead a c-lead body's sound table was fitted on when it is not the generic 7 (Confuse Ray's table was fitted on its own L = 6 lab, so its SEs already sit on the ROM frames). */
const C_LEAD_SOUND_CLOCK_LEADS: ReadonlyMap<number, number> = new Map([[109, 6]]);
/** The lead the S bodies' sound clock was calibrated on (the generic move-body clock, AGE_TO_SOUND_ROWS = 7). */
const LEAD4_SOUND_CLOCK_LEAD = 7;
/** Per-body clock leads (ROM minus ours on the 7 clock: Smokescreen / Scary Face / Metal Sound -2, Sweet Scent -3 in the aud242 fixtures; Double Team, 98 of 190 T2 SEs, +2 before the shift is -4): their SEs sit closer to the print release. */
const LEAD4_SOUND_CLOCK_LEADS: ReadonlyMap<number, number> = new Map([[108, 5], [184, 5], [319, 5], [230, 6], [104, 5]]);
/** `precedingRows`: the rows of the `stat` commands presented between the used print and the body (the S bodies' counter lead is those plus `bodyLeadFrames`). */
export function lse2BodySoundAgeShift(moveId: number, bodyLeadFrames: number | undefined, precedingRows = 0): number {
  if ((bodyLeadFrames ?? 0) <= 0) return 0;
  const calibrated = LSE2_SOUND_CLOCK_LEADS.get(moveId);
  if (calibrated !== undefined) return bodyLeadFrames! - calibrated;
  if (C_LEAD_WINDOW_ADJUST.has(moveId)) return bodyLeadFrames! - (C_LEAD_SOUND_CLOCK_LEADS.get(moveId) ?? LEAD4_SOUND_CLOCK_LEAD);
  return LEAD4_S_LEAD_MOVE_IDS.has(moveId) ? bodyLeadFrames! + precedingRows - (LEAD4_SOUND_CLOCK_LEADS.get(moveId) ?? LEAD4_SOUND_CLOCK_LEAD) : 0;
}
/**
 * lead2 (docs/lead1m-rule-lead-design.md): the move-body lead RULE. A body that matches a rule class presents the kernel's instruction-counter lead as its first
 * rows (`bodyLeadFrames`); the class says where the rows after the body come from. "shape-a": ROM window = live + idle - 1, gap 4, tail `6 - pre - post`
 * (`liveMoveHitTailRows`); "status-tail": the sta5 script-tail table; "lse2": the lse2 lead-first status bodies; "lead-table": the hpd4 bodies with explicit tails.
 * Every consumer asks one of the predicates below instead of testing its own id set, so a batch widens one class.
 */
export type BodyLeadRule = "lead-table" | "shape-a" | "status-tail" | "lse2" | "s-lead" | "gap-print" | "lead-only" | "c-lead";
const BODY_LEAD_RULE: ReadonlyMap<number, BodyLeadRule> = new Map<number, BodyLeadRule>([
  ...HPD4_BODY_LEAD_MOVE_IDS.map((id): [number, BodyLeadRule] => [id, "lead-table"]),
  ...[...HPD8_SHAPE_A_MOVE_IDS, ...LEAD2_SHAPE_A_MOVE_IDS, ...LEAD3_SHAPE_A_MOVE_IDS, ...LSE4_SHAPE_A_MOVE_IDS, ...HIT1_SHAPE_A_MOVE_IDS].map((id): [number, BodyLeadRule] => [id, "shape-a"]),
  ...[...STA5_STATUS_BODY_TAIL_ROWS.keys()].map((id): [number, BodyLeadRule] => [id, "status-tail"]),
  ...[...LSE2_BODY_LEAD_MOVE_IDS].map((id): [number, BodyLeadRule] => [id, "lse2"]),
  ...[...LEAD4_S_LEAD_MOVE_IDS].map((id): [number, BodyLeadRule] => [id, "s-lead"]),
  ...[...LSE4_GAP_PRINT_MOVE_IDS].map((id): [number, BodyLeadRule] => [id, "gap-print"]),
  ...[...LSE4_LEAD_ONLY_MOVE_IDS].map((id): [number, BodyLeadRule] => [id, "lead-only"]),
  ...[...C_LEAD_WINDOW_ADJUST.keys()].map((id): [number, BodyLeadRule] => [id, "c-lead"]),
]);
/** The body's lead is presented as `bodyLeadFrames` (not carried in `scriptTailRows`). */
export function bodyLeadRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.has(moveId);
}
/** The rows after the body are the shape-A hit tail `6 - pre - post`. */
export function bodyHitTailRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "shape-a";
}
/** The lead-first body keeps the audited hit-tail / status-tail composition (the render effect's age hold). */
export function bodyLeadTailCompositionApplies(moveId: number): boolean {
  const rule = BODY_LEAD_RULE.get(moveId);
  return rule === "shape-a" || rule === "status-tail" || rule === "s-lead" || rule === "gap-print" || rule === "c-lead";
}
export function bodyGapPrintRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "gap-print";
}
export function bodyCLeadRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "c-lead";
}
export function bodyLeadOnlyRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "lead-only";
}
export function bodySLeadRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "s-lead";
}
export function bodyStatusTailRuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "status-tail";
}
export function bodyLse2RuleApplies(moveId: number): boolean {
  return BODY_LEAD_RULE.get(moveId) === "lse2";
}

function moveAnimationScriptLeadTiming(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  presentedSinceUsed: number | null,
  moveId: number,
): { scriptLeadFrames?: number; bodyLeadFrames?: number } {
  const animation = instructionExecutionOf(events[index]!);
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = events[i]!;
    const payload = candidate.payload;
    const chargeOpener = payload.kind === "message" && payload.messageId === "STRINGID_EMPTYSTRING3"
      && events[index]!.provenance?.sourceLabel === CHARGE_TURN_SCRIPT && candidate.provenance?.sourceLabel === CHARGE_TURN_SCRIPT;
    if (payload.kind !== "message" || (payload.messageId !== "STRINGID_USEDMOVE" && !chargeOpener)) continue;
    const used = instructionExecutionOf(candidate);
    const programCounter = candidate.provenance?.programCounter;
    if (programCounter === undefined || animation <= used) return {};
    if (BATTLE_SCRIPT_PROGRAM.instructions[programCounter + 1]?.opcodeName === "B_SCR_OP_WAITSTATE") {
      const waitLead = animation - (used + 1);
      return waitLead > 0 ? { scriptLeadFrames: waitLead } : {};
    }
    if (moveId === MAGNITUDE_MOVE_ID) {
      // mxp1: the body's script lead is counted from the Magnitude print's waitmessage (ROM: goto .. attackanimation 10 rows, A at +13 from the command).
      const magnitudePrint = events.slice(i + 1, index).find((e) => e.payload.kind === "message" && e.payload.messageId === "STRINGID_MAGNITUDESTRENGTH");
      if (magnitudePrint === undefined) return {};
      const magnitudeLead = animation - (instructionExecutionOf(magnitudePrint) + 1 + WAITMESSAGE_LONG_HOLD_FRAMES);
      return magnitudeLead > 0 ? { bodyLeadFrames: magnitudeLead } : {};
    }
    if (presentedSinceUsed === null || !bodyLeadRuleApplies(moveId) || (events[index]!.provenance?.sourceLabel === CHARGE_TURN_SCRIPT && !bodyGapPrintRuleApplies(moveId))) return {};
    const lead = animation - (used + 1) - presentedSinceUsed;
    return lead > 0 ? { bodyLeadFrames: lead } : {};
  }
  return {};
}

/**
 * bdt1 / chg2 (Scene ON): the attack turn of a two-turn move is a locked continuation with no move menu, so the engine's first command is the print. The ROM
 * runs the effect script first (EffectSemiInvulnerable -> SecondTurnSemiInvulnerable -> TryHit -> HitFromAtkString, or EffectSolarBeam / EffectRazorWind /
 * EffectSkyAttack -> TwoTurnMovesSecondTurn -> HitFromAccCheck), its `printstring` row at press + 6 + u (u = the print's kernel execution count: Dig / Fly /
 * Bounce / Dive 11, Solar Beam 12, Razor Wind 9; ROM labs bdt1-dig-{player,opponent}-on: 1043 press -> 1060 printstring ex2, the glyphs release 1081 ->
 * `attackanimation` 1087, A0 1089). The rows are typed as the message's scroll lead, so the print and the body's sounds start where the ROM's do. A one-turn use
 * (Solar Beam in sun) has no STATUS2_MULTIPLETURNS at the action's start and keeps its menu press.
 * chg3: a player-charger's turn has no press and its command starts 10 rows later than the ROM's effect-script row (turn-end command + 22 against the ROM's
 * MoveEnd + 19 / 20, with the charge turn now ending on the ROM): the player lead is 6 + u - 10 (chg2-{fly,dive,solarbeam,razorwind,skyattack,bounce}-player-on and
 * bdt1-dig-player-on, attack-turn SEs +10 .. +11 before, 0 .. -2 after).
 */
const TWO_TURN_MOVES: ReadonlySet<number> = new Set([13, 19, 76, 91, 130, 143, 291, 340]);
const TWO_TURN_SECOND_PRINT_PRESS_ROWS = 6;
const TWO_TURN_PLAYER_NO_PRESS_ROWS = 10;
/**
 * ftp1 (s8108 d12 gen:219 +48 once cfs1's Levitate hold landed): a second-turn used print right after the "snapped out of its confusion" print
 * (`BattleScript_MoveUsedIsConfusedNoMore`, a separate presented command with its own hold) carries that script's wait rows in its instruction
 * execution (3 -> 78), which the lead above would count again (lead 84 against the ROM's 35: used glyph row 285 = ROM 285 after the change, the
 * Levitate print and the weather tick -1). The rows past the confusion print's execution that the lead does not owe are measured at 46 (one window).
 */
const CONFUSION_ENDED_SCRIPT = "BattleScript_MoveUsedIsConfusedNoMore";
const TWO_TURN_AFTER_CONFUSION_PRINT_ROWS = 46;
function twoTurnSecondPrintLead(
  event: BattleKernelSemanticEvent,
  beforeRules: BattleScriptRulesContext,
  actionSnapshot: BattleScriptActionMessageSnapshot | null | undefined,
  previous?: BattleKernelSemanticEvent,
): { leadFrames: number } | null {
  const currentMove = actionSnapshot?.currentMove;
  if (currentMove === undefined || !TWO_TURN_MOVES.has(currentMove) || (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0) return null;
  if (event.payload.kind !== "message" || event.payload.messageId !== "STRINGID_USEDMOVE"
    || (event.provenance?.sourceLabel !== "BattleScript_HitFromAtkString" && event.provenance?.sourceLabel !== "BattleScript_HitFromAccCheck")) return null;
  if ((beforeRules.battlers[actionSnapshot!.attacker]!.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS) === 0) return null;
  const exec = event.provenance.instructionExecution;
  const afterConfusionPrint = previous?.payload.kind === "message" && previous.provenance?.sourceLabel === CONFUSION_ENDED_SCRIPT && previous.provenance.instructionExecution !== undefined
    ? previous.provenance.instructionExecution + TWO_TURN_AFTER_CONFUSION_PRINT_ROWS : 0;
  return { leadFrames: TWO_TURN_SECOND_PRINT_PRESS_ROWS - (actionSnapshot!.attacker === 0 ? TWO_TURN_PLAYER_NO_PRESS_ROWS : 0) + exec - afterConfusionPrint };
}
/**
 * chg2 (Scene ON; generalizes bdt1's Dig value): a charge-turn body (BattleScriptFirstChargingTurn) plays its sounds on the ROM's own script rows, but the
 * generic sound clock assumes the used print's release reaches `gAnimScriptActive` (A0) 10 rows later (R -> A0 = 10). The presented box command always starts at
 * the same row while the ROM reaches the charge script's opener (STRINGID_EMPTYSTRING3, kernel instruction execution E) E rows after the effect script's first
 * row, so R -> A0 = E - 6: bdt1-dig / chg2-{fly,bounce,dive,solarbeam,razorwind,skyattack}-{player,opponent}-on, ROM first SE exactly (E 10 / 7 / 10 / 9 / 9 / 6 / 6
 * -> R -> A0 4 / 1 / 4 / 3 / 3 / 0 / 0 on the ROM). The sound clock moves by 10 - (E - 6) rows; the command's duration and pixels are untouched (the Fly
 * charge turn's pixels match the ROM at the present duration, a 3-row earlier body made it worse).
 */
const CHARGE_TURN_SOUND_LEAD_BASE_ROWS = 16;
/**
 * chg3 (Scene ON): after the charge print the ROM's chain to the next action is E - 2 rows longer than the presented one (opener execution E: the next action's SEs
 * were 4 .. 8 rows early on chg2-{fly,dive,solarbeam,skyattack,bounce}-{player,opponent}-on and bdt1-dig-player-on; E - 2 = 4 + (E - 6), the ROM's A0 lies E - 6 rows
 * after the command start and the release -> next row gap is 4 more). The charge print's glyph row is exact (chg161), so the rows are the print's hold. Razor Wind
 * (gap-print class) already carries them before its glyph.
 */
const CHARGE_TURN_CHAIN_BASE_ROWS = 2;
function chargeTurnOpenerExecution(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = events[i]!;
    if (candidate.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT) return null;
    if (candidate.payload.kind === "message" && candidate.payload.messageId === "STRINGID_EMPTYSTRING3") {
      const before = events[i - 1];
      if (before !== undefined && instructionExecutionOf(before) < instructionExecutionOf(candidate)) return null;
      return instructionExecutionOf(candidate);
    }
  }
  return null;
}
function chargeTurnChainRows(events: readonly BattleKernelSemanticEvent[], index: number, moveId: number | undefined): number {
  if (moveId === undefined || !TWO_TURN_MOVES.has(moveId) || bodyGapPrintRuleApplies(moveId)) return 0;
  const opener = chargeTurnOpenerExecution(events, index);
  return opener === null ? 0 : Math.max(0, opener - CHARGE_TURN_CHAIN_BASE_ROWS);
}
function chargeTurnSoundLead(events: readonly BattleKernelSemanticEvent[], index: number): { soundAgeLeadFrames?: number } {
  if (events[index]!.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT) return {};
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = events[i]!;
    if (candidate.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT) return {};
    if (candidate.payload.kind === "message" && candidate.payload.messageId === "STRINGID_EMPTYSTRING3") {
      // A charger that woke up / thawed first (s2230 Bounce, E = 79) reaches the opener after a detour presented as its own commands: E is no longer the rows to the animation.
      const before = events[i - 1];
      if (before !== undefined && instructionExecutionOf(before) < instructionExecutionOf(candidate)) return {};
      return { soundAgeLeadFrames: CHARGE_TURN_SOUND_LEAD_BASE_ROWS - instructionExecutionOf(candidate) };
    }
  }
  return {};
}
/**
 * bdt1 (Scene ON): Rest's body (move 156: its SE_M_SNORE) plays 2 rows before the ROM on the generic sound clock (ROM A0 + 1 = 1200 against 1198 on the
 * bdt1-rest-player-on lab; 17 T2 windows, every one -2). The body's own rows are not short: the clock's 7-row calibration meets Rest's script lead of 9
 * (A0 - R - 3), so the clock runs 2 rows late (soundAgeLeadFrames -2).
 */
const MOVE_REST = 156;
const REST_SOUND_LEAD_ROWS = -2;
const REST_HEAL_PRINT_TAIL_ROWS = 10;
function bdt1BodySoundLead(events: readonly BattleKernelSemanticEvent[], index: number, moveId: number): { soundAgeLeadFrames?: number } {
  if (events[index]!.provenance?.sourceLabel === CHARGE_TURN_SCRIPT) return chargeTurnSoundLead(events, index);
  return moveId === MOVE_REST ? { soundAgeLeadFrames: REST_SOUND_LEAD_ROWS } : {};
}
const SCRIPT_TAIL_BETWEEN_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_WAITANIMATION", "B_SCR_OP_SETBYTE", "B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES"]);
// lse4: the first-charging-turn script (orword HITMARKER_CHARGING, setbyte, seteffectprimary, copyarray) between the animation and its print.
const CHARGE_TURN_BETWEEN_OPCODES: ReadonlySet<string> = new Set([...SCRIPT_TAIL_BETWEEN_OPCODES, "B_SCR_OP_ORWORD", "B_SCR_OP_SETEFFECTPRIMARY", "B_SCR_OP_COPYARRAY"]);
const CHARGE_TURN_PRINT_ROWS = 3;
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
  moveId: number,
): { scriptTailRows?: number } {
  const attack = events[index]!;
  const attackExecution = attack.provenance?.instructionExecution;
  const attackPc = attack.provenance?.programCounter;
  const chargeTurn = attack.provenance?.sourceLabel === CHARGE_TURN_SCRIPT;
  if (chargeTurn && bodyGapPrintRuleApplies(moveId)) {
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = events[i]!;
      if (candidate.payload.kind === "message" && candidate.payload.messageId === "STRINGID_EMPTYSTRING3" && candidate.provenance?.sourceLabel === CHARGE_TURN_SCRIPT) {
        usedExecution = instructionExecutionOf(candidate);
        break;
      }
    }
  }
  if (usedExecution === null || presentedSinceUsed === null || attackExecution === undefined || attackPc === undefined
    || (chargeTurn && !bodyGapPrintRuleApplies(moveId))) return {};
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
    if (!(chargeTurn ? CHARGE_TURN_BETWEEN_OPCODES : SCRIPT_TAIL_BETWEEN_OPCODES).has(instructions[pc]?.opcodeName ?? "")) return {};
  }
  const lead = attackExecution - usedExecution - 1 - presentedSinceUsed;
  if (lead < 0) return {};
  // lse4: a charge turn's print rows (measured against the ROM glyph row, 3 rows) belong to the message, not to the body tail.
  return { scriptTailRows: nextExecution - attackExecution + 1 + 1 + (bodyLeadRuleApplies(moveId) ? 0 : lead) - (chargeTurn ? CHARGE_TURN_PRINT_ROWS : 0) };
}

/** ont193: the rows presented since the used print's release (only silent-RAM `stat` commands are accepted), else null. */
function commandsPresentedSinceUsedPrint(
  events: readonly BattleKernelSemanticEvent[],
  openerIndex: number | null,
  since: readonly BattleResolutionPresentationCommand[],
  field: BattleResolutionDisplayedField,
): number | null {
  const opener = openerIndex === null ? undefined : events[openerIndex];
  if (opener?.payload.kind !== "message"
    || (opener.payload.messageId !== "STRINGID_USEDMOVE"
      && !(opener.payload.messageId === "STRINGID_EMPTYSTRING3" && opener.provenance?.sourceLabel === CHARGE_TURN_SCRIPT))) return null;
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
 * mem2 (docs/aud242-move-anim-sounds.md section 29, mem1 / exp1): `Cmd_trymemento` (battle_script_commands.c:9086) and `Cmd_tryexplosion` (:6555) emit
 * `BtlController_EmitHealthBarUpdate(INSTANT_HP_BAR_DROP)`; the controller runs `SetBattleBarStruct(maxHP, 0, 0x7FFF)` and empties the bar at its
 * first step (battle_controller_player.c:2708, _opponent.c:1690), so the exec flag is held 2 rows and the script moves on to `attackanimation`.
 * The hp command then spans the rows from its start to the move command's first row: `scriptRows` (the opcode rows from the bar update to
 * `attackanimation`) + the rows from the command start to the bar update (measured, 4 + 4 ROM windows, both sides: 3 after the shorter
 * "used MEMENTO!" message, 2 after "used EXPLOSION!" / "used SELF-DESTRUCT!"). The move command's own `pre` 3 follows. The same rows are the HP text's
 * empty row (the ROM writes `0/105` on the bar update's controller row and empties the bar graphic the row after, both sides).
 */
const INSTANT_HP_BAR_DROP = 0x7fff;
const INSTANT_HP_DROP_LEAD_ROWS = Object.freeze<Record<string, number>>({ B_SCR_OP_TRYMEMENTO: 3, B_SCR_OP_TRYEXPLOSION: 2 });
function instantHpDropTiming(events: readonly BattleKernelSemanticEvent[], healthEventSequence: number): BattleHpTiming {
  const healthIndex = events.findIndex((event) => event.sequence === healthEventSequence);
  const healthEvent = events[healthIndex];
  const opcodeName = healthEvent?.provenance?.opcodeName ?? "";
  const lead = INSTANT_HP_DROP_LEAD_ROWS[opcodeName];
  const bar = healthEvent?.provenance?.instructionExecution;
  const animation = events.slice(healthIndex + 1).find((event) => event.provenance?.opcodeName === "B_SCR_OP_ATTACKANIMATION")?.provenance?.instructionExecution;
  if (lead === undefined || bar === undefined || animation === undefined) {
    throw new Error(`battle resolution INSTANT_HP_BAR_DROP from ${opcodeName || "no opcode"} has no ROM-measured route to attackanimation`);
  }
  return Object.freeze({ minimumFrames: 0, tailFrames: lead + animation - bar, instantDrop: lead } as const);
}

/**
 * sub183 (ISSUES #153): BattleScript_EffectSubstitute's `datahpupdate; printfromtable; waitmessage`. The ROM's datahpupdate run is the
 * bar's frames + 2 where the HP command is bar + 1 (1 row), and the print's first glyph follows the printfromtable and waitmessage
 * rows (2 rows): 3 rows, 45 + 1 + 1 = G+97..G+143 then the glyph at G+144, both scenes, both sides (4 / 4 dense windows, 0 px).
 * Only the Substitute script is measured, so the rule requires its `attackanimation; waitanimation; healthbarupdate` lead-in (the
 * other `datahpupdate; printfromtable`, Leech Seed's turn-end drain, has no ROM window here).
 */
const HP_PRINT_TAIL_FRAMES = 3;
/** hpf5 S1 (hpf4m, both scenes): E 27 -> next exec +29, but cost bars E >= 28 are ROM-exact at tail 3 (sub183 dense windows, E 44 -> +47), so the tail stays 3 and only the 28 floor goes (a short bar was E 27 -> 31, now 30 = ROM + 1). */
const SUBSTITUTE_COST_HP_TIMING = Object.freeze({ minimumFrames: 0, tailFrames: HP_PRINT_TAIL_FRAMES } as const);
function hpPrintTailTiming(event: BattleKernelSemanticEvent, events?: readonly BattleKernelSemanticEvent[], index?: number): BattleHpTiming {
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined) return HP_TIMING;
  const at = (offset: number) => BATTLE_SCRIPT_PROGRAM.instructions[programCounter + offset]?.opcodeName;
  return at(0) === "B_SCR_OP_DATAHPUPDATE" && at(1) === "B_SCR_OP_PRINTFROMTABLE" && at(-1) === "B_SCR_OP_HEALTHBARUPDATE"
    && at(-2) === "B_SCR_OP_WAITANIMATION" && at(-3) === "B_SCR_OP_ATTACKANIMATION"
    ? SUBSTITUTE_COST_HP_TIMING
    : at(0) === "B_SCR_OP_DATAHPUPDATE" && at(-1) === "B_SCR_OP_HEALTHBARUPDATE" && at(-2) === "B_SCR_OP_ORWORD"
      && at(-3) === "B_SCR_OP_WAITMESSAGE" && at(-4) === "B_SCR_OP_PRINTSTRING"
      ? (at(1) === "B_SCR_OP_RETURN" && events !== undefined && index !== undefined && healContinuesMoveScript(events, index)
        ? (shellBellNextUsedPrint(events, index) ?? SHELL_BELL_HP_TIMING) : ITEM_HEAL_HP_TIMING) : HP_TIMING;
}
const shellBellNextUsedTimings = new Map<number, BattleHpTiming>();
/**
 * shb1: the Shell Bell heal's `datahpupdate; return` falls into the first action's MoveEnd and straight into the next action's used print with no MoveEnd
 * sprite-visibility receipt (so actionTransitionPauseFrames has no row to count from). Same rows as trn176's E + 1 + d + n + 6 + u with d = 1 (`return`) and
 * the receipts absent: the heal's hp command holds bar + 1 + 3 (SHELL_BELL_HP_TIMING) + 1 + ACTION_TRANSITION_ROWS + u.
 */
function shellBellNextUsedPrint(events: readonly BattleKernelSemanticEvent[], hpChangeIndex: number): BattleHpTiming | null {
  const next = events[hpChangeIndex + 1];
  const heal = events[hpChangeIndex]!.provenance?.instructionExecution;
  const used = next?.provenance?.instructionExecution;
  if (next === undefined || next.payload.kind !== "message" || next.payload.messageId !== "STRINGID_USEDMOVE" || used === undefined || heal === undefined || used >= heal) return null;
  const tail = SHELL_BELL_HP_TIMING.tailFrames + 1 + ACTION_TRANSITION_ROWS + used;
  let timing = shellBellNextUsedTimings.get(tail);
  if (timing === undefined) {
    timing = Object.freeze({ minimumFrames: 0, tailFrames: tail } as const);
    shellBellNextUsedTimings.set(tail, timing);
  }
  return timing;
}
/** hie4: the heal's script (its `playanimation` event on Scene ON, else its print) runs in the same script run as the event before it (its execution count did not restart). */
function healContinuesMoveScript(events: readonly BattleKernelSemanticEvent[], hpChangeIndex: number): boolean {
  for (let i = hpChangeIndex - 1; i > 0; i -= 1) {
    const payload = events[i]!.payload;
    if (payload.kind !== "message") continue;
    const animation = events[i - 1]!.payload;
    const start = animation.kind === "animation" && animation.animationId === "HELD_ITEM_EFFECT" && i > 1 ? i - 1 : i;
    const execution = events[start]!.provenance?.instructionExecution;
    const before = events[start - 1]!.provenance?.instructionExecution;
    return execution !== undefined && before !== undefined && execution > before;
  }
  return false;
}
/**
 * hie4 (ISSUES #220 post-heal tail): `BattleScript_ItemHealHP_Ret` / `_RemoveItem` / `BerryConfuseHealEnd2` (and Wish's heal) run `printstring; waitmessage;
 * orword; healthbarupdate; datahpupdate` with no `attackanimation; waitanimation` in front: the 28-row floor belongs to the ordinary hit's script (lsd194 §2.1), so
 * the bar is its own `battleHealthBarAnimationFrames + 1` (a Leftovers / Shell Bell heal is a few pixels, 21 rows shorter than the floor). Bars longer than 27 rows are unchanged.
 */
const ITEM_HEAL_HP_TIMING = Object.freeze({ minimumFrames: 0 } as const);
/**
 * hie4: Shell Bell's `ItemHealHP_Ret` is a `call` out of the move script's `moveend`, so the heal returns into `moveend; end` and the turn-action machine
 * (Leftovers / the berries restart a script that `end2`s straight back into the end-turn loop): 3 rows more before the action prompt, measured in both scenes
 * (hie1-shellbell-{off,on}: ROM text run 82 vs the end2 path's 79).
 */
const SHELL_BELL_HP_TIMING = Object.freeze({ minimumFrames: 0, tailFrames: 3 } as const);
/** hie4: ... and the blank box run before the prompt is 1 row longer than the end2 path's (ROM 7 vs 6, both scenes): turn-end 9 after a Shell Bell heal. */
const SHELL_BELL_TURN_END_TIMING = Object.freeze({ minimumFrames: 9 } as const);
/**
 * hpd1 (docs/hpd1-hp-hold.md): the ordinary hit's `hp` command has NO 28-frame floor where the shape is measured. The ROM's hold after `healthbarupdate` is the
 * bar's frames + 2 (Cmd_datahpupdate blocks on the controller, battle_script_commands.c:1932-1960) and then the script rows to the
 * next presented event, so the command is the bar's frames + 1 plus `tailFrames`, measured in 14 / 12 ROM windows (7 damages, both
 * scenes; 0 frames ROM - app across bars of 9..90 frames):
 *   - hit -> next action's USEDMOVE (the action-transition pause below already presents the d rows after `datahpupdate`): +1, the
 *     `datahpupdate` row itself;
 *   - hit -> only MoveEnd receipts then the turn end (nothing else presented): + d = the rows from `datahpupdate` to the first
 *     MoveEnd receipt (`critmessage`, `waitmessage`, `resultmessage`, `waitmessage`, `seteffectwithchance`, `tryfaintmon`, `moveendall`).
 * Any other shape (an effectiveness / crit print, a faint, a heal, a held item next) and every hit ON THE PLAYER (all 20 ROM labs hit the foe; the off108
 * Rest window's foe-Tackle-on-player anchor moves -3 -> -14 without the floor) has no ROM window yet: it keeps the legacy 28-frame floor.
 */
const HP_DATAHPUPDATE_ROW_FRAMES = 1;
/** hcr3: a hit whose secondary effect is a stat change (Icy Wind, seed 1914, ROM): bar 12, then `datahpupdate` .. `BattleScript_StatDown`'s playanimation 6 rows; the stat command takes the last 2 (no 28-row floor). */
const HP_STAT_NEXT_TAIL_FRAMES = 4;
/**
 * stc2: the ROM's hp -> stat interval is scene-free (stc1-icywind-{foe,plr} / stc1-rocktomb-foe labs, both scenes: the hp row to `datahpupdate`'s change is the bar's drop + 2, then 6 rows to
 * BattleScript_StatDown's `playanimation`, = drop + 8; the stat SE is that exec + 4). Scene OFF's stats-change command starts ON the exec (stc1 secondary shift 2, SE age 4), which is
 * hp (bar + 1) + tail + the 2-row stat command = bar + 8 at tail 5. Scene ON's command keeps the hcr3 tail 4 (measured exact on aud252 seed 1914 with its own age convention).
 */
const HP_STAT_NEXT_TAIL_FRAMES_OFF = 5;
/** The rows between this `datahpupdate` and the next event when that is a MoveEnd receipt (d), or null. */
function hpMoveEndLeadRows(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  const event = events[index]!;
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined || BATTLE_SCRIPT_PROGRAM.instructions[programCounter]?.opcodeName !== "B_SCR_OP_DATAHPUPDATE") return null;
  const next = events[index + 1];
  if (next?.payload.kind !== "set-battler-sprite-visibility" || next.provenance?.opcodeName !== "B_SCR_OP_MOVEEND") return null;
  const hpExecution = event.provenance?.instructionExecution;
  const receiptExecution = next.provenance.instructionExecution;
  return hpExecution === undefined || receiptExecution === undefined || receiptExecution <= hpExecution ? null : receiptExecution - hpExecution - 1;
}
/**
 * kno3: the hit's bar is followed by `datahpupdate` and the script rows to BattleScript_KnockedOff's `playanimation` (the move script's
 * MoveEnd steps; 6 rows from the `datahpupdate` row to the instruction's row, both scenes: Scene ON's ITEM_KNOCKOFF receipt, Scene OFF's
 * knocked-off print minus its 34-row Pausex20). The bar has no 28-row floor there (out2: the ROM bar is 5 / 26 rows, the floor presented 28):
 * bar + 1 + (rows to the instruction - 1), then the animation command starts on the instruction's row. Null when anything else follows.
 */
function knockoffHpTailRows(events: readonly BattleKernelSemanticEvent[], index: number, sceneOff: boolean): number | null {
  const event = events[index]!;
  const hpExecution = event.provenance?.instructionExecution;
  if (hpExecution === undefined || BATTLE_SCRIPT_PROGRAM.instructions[event.provenance?.programCounter ?? -1]?.opcodeName !== "B_SCR_OP_DATAHPUPDATE") return null;
  let next: BattleKernelSemanticEvent | undefined;
  for (let following = index + 1; following < events.length && next === undefined; following += 1) {
    const kind = events[following]!.payload.kind;
    if (kind !== "set-battler-pp-data" && kind !== "game-stat-increment") next = events[following]!;
  }
  const execution = next?.provenance?.instructionExecution;
  if (next === undefined || execution === undefined) return null;
  if (sceneOff) {
    const programCounter = next.provenance?.programCounter;
    if (next.payload.kind !== "message" || next.payload.messageId !== "STRINGID_PKMNKNOCKEDOFF" || programCounter === undefined
      || !BATTLE_SCRIPT_PROGRAM.instructions[programCounter - 1]?.operands.some((operand) => operand.expression === "B_ANIM_ITEM_KNOCKOFF")) return null;
    const rows = execution - hpExecution - ITEM_KNOCKOFF_OFF_PAUSE_EXECUTIONS;
    return rows > 0 ? rows - 1 : null;
  }
  if (next.payload.kind !== "animation" || next.payload.animationId !== "ITEM_KNOCKOFF" || execution <= hpExecution) return null;
  return execution - hpExecution - 1 + ITEM_KNOCKOFF_MOVEEND_BLOCKED_ROWS;
}
/** `BattleScript_Pausex20`'s executions (`pause B_WAIT_TIME_SHORT` = 32 blocked rows + the instruction and the `return`). */
const ITEM_KNOCKOFF_OFF_PAUSE_EXECUTIONS = 34;
const ITEM_KNOCKOFF_MOVEEND_BLOCKED_ROWS = 2;
function knockoffHpTiming(events: readonly BattleKernelSemanticEvent[], index: number, beforeRules: BattleScriptRulesContext): BattleHpTiming | null {
  const tailFrames = knockoffHpTailRows(events, index, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0);
  return tailFrames === null ? null : Object.freeze({ minimumFrames: 0, tailFrames } as const);
}
/**
 * hpf1: the hit's own effect print (`critmessage` / `resultmessage`) right after `datahpupdate`. The ROM's hp-to-print hold is the same
 * `datahpupdate` row + the script rows to the print + 2 (the print's setup before its first glyph; Substitute's `datahpupdate; printfromtable`
 * is Delta 1 -> 3, Rolling Kick's `critmessage; waitmessage; resultmessage` is Delta 3 -> 5), with no 28-row floor (the floor is 5 short of it on a 32-row bar and
 * 13 long on a 9-row bar). Returns the tail, or null when the next event is not that print.
 */
const HP_MESSAGE_SETUP_ROWS = 2;
/**
 * hpf2: the hpf1 hp -> print hold (`datahpupdate` row + script rows to the print + 2) also holds for a heal (Rest / Recover / Soft-Boiled / Milk Drink /
 * Moonlight / Curse), a recoil and a drain's `printfromtable`: all `healthbarupdate; datahpupdate; <print>`, so the rule is the opcode's, not the move's.
 */
const HP_HIT_EFFECT_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_CRITMESSAGE", "B_SCR_OP_RESULTMESSAGE"]);
const HP_MESSAGE_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_CRITMESSAGE", "B_SCR_OP_RESULTMESSAGE", "B_SCR_OP_PRINTSTRING", "B_SCR_OP_PRINTFROMTABLE"]);
/** hpf2: a hit's bar then the turn end's first print (hail / sandstorm / poison): the ROM's bar -> print rise is the bar's rows + 17 = MoveEnd rows 7 + 2 sprite rows + 8. */
const HP_END_TURN_PRINT_LEAD_ROWS = 8;
/**
 * hpb3: a Focus Band survival (`BattleScript_FocusBandActivates` right after the hit's `datahpupdate`; drv2 OFF s4235 d2, 8 -> 1): the ROM's bar is 7 rows,
 * `datahpupdate` is bar + 2 after the bar row and the Focus Band script's first row 3 later, so the 28-row floor held the next command 15 rows late.
 * The tail is the stat-next convention (the next command starts on the script's `playanimation` / Pausex20 row).
 */
const FOCUS_BAND_PC = BATTLE_SCRIPT_PROGRAM.labelEntries["BattleScript_FocusBandActivates"]!.programCounter;
const FOCUS_BAND_SCRIPT_ROWS = 12;
/**
 * hpb3: a hit whose attacker's Shell Bell heals right after it (`BattleScript_ItemHealHP_Ret`; T2 ON s97 d11 / d12 / d13 and hie1-shellbell-on, ROM): `datahpupdate` is the bar + 2 after the bar row,
 * the MoveEnd rows run, and the item's `playanimation` sits 11 executions after `datahpupdate` in every window (bars 20, 25 and 40): the animation starts bar + 13 after the bar row, with no 28-row floor
 * (the floor was 8 rows early on a 25-row bar, 3 early on 20). The animation command follows the two MoveEnd sprite-visibility rows, so the tail is those executions - 1, less the 9 rows
 * the engine's HELD_ITEM_EFFECT command leads its script row (its first SE is at command + 17, the ROM's at the script row + 8: hie3 / hie1-shellbell-on, a 40-row bar: ROM SE 766 = command 758 + 8).
 */
const HP_ITEM_ANIMATION_COMMAND_LEAD_ROWS = 9;
const ITEM_HEAL_RET_PC = BATTLE_SCRIPT_PROGRAM.labelEntries["BattleScript_ItemHealHP_Ret"]!.programCounter;
const ITEM_HEAL_RET_SCRIPT_ROWS = 10;
function hpItemAnimationRows(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  const event = events[index]!;
  const hpExecution = event.provenance?.instructionExecution;
  if (hpExecution === undefined || BATTLE_SCRIPT_PROGRAM.instructions[event.provenance?.programCounter ?? -1]?.opcodeName !== "B_SCR_OP_DATAHPUPDATE") return null;
  const first = events[index + 1];
  const second = events[index + 2];
  const animation = events[index + 3];
  const programCounter = animation?.provenance?.programCounter;
  if (first?.provenance?.opcodeName !== "B_SCR_OP_MOVEEND" || second?.provenance?.opcodeName !== "B_SCR_OP_MOVEEND" || animation?.payload.kind !== "animation"
    || programCounter === undefined || programCounter < ITEM_HEAL_RET_PC || programCounter >= ITEM_HEAL_RET_PC + ITEM_HEAL_RET_SCRIPT_ROWS) return null;
  const execution = animation.provenance?.instructionExecution;
  return execution === undefined || execution - hpExecution - 1 <= HP_ITEM_ANIMATION_COMMAND_LEAD_ROWS ? null : execution - hpExecution - 1 - HP_ITEM_ANIMATION_COMMAND_LEAD_ROWS;
}
/**
 * shb1 (Scene ON only; T2 s97 d11 / d12 / d13): the Shell Bell's `playanimation` is HandleBattleAnimation's IsBattleSEPlaying wait like the other gated requests
 * (sgs134RequestSeGate): the hit's effectiveness SE (73 rows for SE 13) is still playing when the script row arrives if the bar was short. ROM: hit SE -> the item's
 * script row is 49 fixed rows + the bar (d12 / d13: bar 20, SE 192, exec 261 = 69, the launch 4 rows late and the item's SEs +12 from the exec instead of +8; d11: bar 25, 74 rows,
 * no wait; every lab: bars >= 40). Scene OFF has no animation script to wait: its `playanimation` row is bar + 13 with no gate (T2 OFF s97 d13, exec 146 = datahpupdate 135 + 11).
 */
const HP_ITEM_ANIMATION_SE_FIXED_ROWS = 49;
/**
 * sep1: the battle SE a controller request would still wait on (HandleBattleAnimation / HandleMoveAnimation / HandleStatusAnimation poll IsBattleSEPlaying): the
 * song of the last `play-se` before events[index] when nothing between starts an animation script (Cmd_end drains its own SEs) or prints (a print's 64-row
 * waitmessage outlasts every effectiveness SE). A hit's HIT_ANIMATION receipt does not end it. Null: nothing playing.
 */
function pendingBattleSeSong(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const payload = events[i]!.payload;
    if (payload.kind === "play-se") return payload.songId;
    if (payload.kind === "message" || payload.kind === "status-animation" || (payload.kind === "animation" && payload.animationId !== "HIT_ANIMATION")) return null;
  }
  return null;
}
function hpItemAnimationSeGate(events: readonly BattleKernelSemanticEvent[], index: number): number {
  const hp = events[index]!.payload;
  if (hp.kind !== "hp-change") return 0;
  const songId = pendingBattleSeSong(events, index);
  return songId === null ? 0 : seg127StatusSeGateRows({ songId, seAgeRows: HP_ITEM_ANIMATION_SE_FIXED_ROWS + Math.abs(hp.from - hp.to) });
}
/**
 * sep1: the turn-end Leech Seed drain's `playanimation` is the same IsBattleSEPlaying wait (etp1-leechseed-on / -leechseedc-on, ROM): hit SE 13 at 597 / 604, the
 * script's exec row (BattleScript_LeechSeedTurnDrain+0x7) at 663 / 708 = hit hp start + (bar + 1) + 17, the animation's first row at 670 / 708 = max(exec, SE + 73).
 * The launch lag of 7 rows the labs fitted is the short bar's remainder of the SE (73 - 66), 0 on the long bar. SE -> hp start is the hit animation's rows + 1;
 * after the bar the script runs 17 rows (HIT_TO_SEED_DRAIN_TAIL_ROWS beyond the bar's own + the two MoveEnd sprite-visibility rows) to the exec row.
 */
const HIT_TO_SEED_DRAIN_TAIL_ROWS = 15;
/** rcv1: Scene OFF, a drain after a hit: the ROM's Pausex20 -> seeded healthbarupdate runs 35 rows, the print-preceded 36 (44 = 8 + 36 fits the latter). */
const OFF_HIT_SEED_DRAIN_EARLY_ROWS = 9;
const SEED_DRAIN_PRESENTED_ROWS_BEFORE_EXEC = 2;
/** The lag the drain command's minimumFrames was fitted with (battleResolutionPresentationRender.ts LEECH_SEED_DRAIN_SCRIPT_AGE; a test pins them equal). */
const LEECH_SEED_DRAIN_LEGACY_LAG = 7;
/**
 * ldw1: a drain right after a weather-continues animation (Sun / Rain; the damaging weathers end in their own hp / print rows) or the opponent's send-in.
 * The previous script's Cmd_end drained its own SE, so IsBattleSEPlaying is false when the drain's playanimation runs and the controller is idle: the command
 * starts on the script's exec row (ROM SunlightContinues+0xd -> LeechSeedTurnDrain+0x7 ex2; FaintedMonEnd+0x0 -> LeechSeedTurnDrain+0x0 -> +0x7 one row later) instead of
 * LEECH_SEED_DRAIN_LEGACY_LAG + 2 rows before it. launchLagFrames 0, and the command is those 9 rows shorter (ROM exec -> "drained" print is 229 / 235 rows in
 * the Sun / foe-send-in labs against the 238 of a command that starts 9 rows before its exec, etp3-recoverls4).
 */
const LEECH_SEED_DRAIN_IDLE_CONTROLLER_EARLY_ROWS = 9;
function hitSeDrainLaunchLag(songId: number | null, hitAnimationRows: number, barRows: number): number | null {
  if (songId === null) return null;
  return seg127StatusSeGateRows({ songId, seAgeRows: 1 + hitAnimationRows + barRows + HIT_TO_SEED_DRAIN_TAIL_ROWS + SEED_DRAIN_PRESENTED_ROWS_BEFORE_EXEC });
}
function focusBandNext(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const programCounter = events[index + 1]?.provenance?.programCounter;
  return programCounter !== undefined && programCounter >= FOCUS_BAND_PC && programCounter < FOCUS_BAND_PC + FOCUS_BAND_SCRIPT_ROWS;
}
function hpMessageLeadRows(events: readonly BattleKernelSemanticEvent[], index: number): number | null {
  const event = events[index]!;
  const programCounter = event.provenance?.programCounter;
  if (programCounter === undefined || BATTLE_SCRIPT_PROGRAM.instructions[programCounter]?.opcodeName !== "B_SCR_OP_DATAHPUPDATE") return null;
  const next = events[index + 1];
  const opcodeName = next?.provenance?.opcodeName;
  if (next?.payload.kind !== "message" || !HP_MESSAGE_OPCODES.has(opcodeName ?? "")) return null;
  const hpExecution = event.provenance?.instructionExecution;
  const messageExecution = next.provenance?.instructionExecution;
  return hpExecution === undefined || messageExecution === undefined || messageExecution <= hpExecution
    ? null : messageExecution - hpExecution + HP_MESSAGE_SETUP_ROWS;
}
/**
 * hpf1: the hit that faints its target runs `datahpupdate; ... tryfaintmon` into the faint chain's `playfaintcry` with nothing presented between: the ROM's hp
 * command is the bar's own frames + 1 and the chain follows (aud241b lowhp-faint ON / OFF: the 11 -> 0 bar is 12 rows, the 28-row floor put the stop / cry /
 * faint sounds 16 late; hpf1-pk-dragonrage ON / OFF: a 48-row bar is followed by the faint at +0).
 */
function hpFaintNext(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const programCounter = events[index]!.provenance?.programCounter;
  return programCounter !== undefined && BATTLE_SCRIPT_PROGRAM.instructions[programCounter]?.opcodeName === "B_SCR_OP_DATAHPUPDATE"
    && events[index + 1]?.payload.kind === "play-faint-cry";
}
/**
 * hpf5 (docs/hpd1-hp-hold.md "hpf5", measured in hpf4m): the end-of-turn damage ticks. `BattleScript_DoTurnDmg` (poison / toxic / burn / Curse / Nightmare /
 * wrap family) and `BattleScript_DamagingWeatherLoop` (sandstorm / hail) run `healthbarupdate; datahpupdate; tryfaintmon` with no 28-row floor: the ROM's
 * next controller exec after a tick bar is E + 8 (E = bar frames + 1 = the hp command; the 8 rows are TURN_END_TIMING) for every bar length E = 4..27.
 * T1: the tick is the bar's own frames. T4: a tick that faints starts the faint chain at E + 2. T3: a weather tick's next print sits 10 rows after the bar
 * (a following battler's damage message), the last battler's tick leaves through `cbf..cc8` 4 rows later than the status ticks before the turn end's 8.
 */
const TICK_HP_TIMING = Object.freeze({ minimumFrames: 0 } as const);
const TICK_FAINT_TAIL_FRAMES = 2;
const WEATHER_TICK_MESSAGE_TAIL_FRAMES = 10;
const WEATHER_TICK_LAST_TAIL_FRAMES = 4;
/** ldw2: the weather hit's effectiveness SE (Cmd_effectivenesssound) plays this many rows after its hit-animation command starts (ROM etp3-sandls3-on: command 1158, SE 13 at 1160). */
const WEATHER_HIT_SE_AFTER_COMMAND_ROWS = 2;
const WRAP_SECONDARY_TAIL_FRAMES = 7;
const TURN_DAMAGE_PC = datahpupdatePcAfter("BattleScript_DoTurnDmg");
const WEATHER_DAMAGE_PC = datahpupdatePcAfter("BattleScript_DamagingWeatherLoop");
/** hpf5 T2: `BattleScript_MoveEffectWrap`'s `printfromtable` is the wrap hit's secondary message (E + 7 after the hit's bar, E 7..16 by move). */
/**
 * hcr3: `BattleScript_DoRecoil` after the hit's effectiveness / crit print (aud252 seed 2230, Double-Edge, ROM): the print's `waitmessage` ends 7 script rows before the recoil bar
 * (`MoveEffectRecoil`, `DoRecoil`'s `orword`; the print's box stays up), and the bar's `healthbarupdate` -> the recoil print is E + 1 rows (E = bar + 1; messageRows - 1), with no 28-row floor.
 */
const RECOIL_PC = datahpupdatePcAfter("BattleScript_DoRecoil");
const HP_RECOIL_LEAD_ROWS = 7;
/**
 * fnt2 (ROM lab fnt2-absorb-se, both KO seeds 830 s2 / s6, 1415 s53): the drain's heal bar (`BattleScript_AbsorbUpdateHp`'s `healthbarupdate; datahpupdate`) after the hit's
 * effectiveness / crit print. The print's `waitmessage` ends and the script runs `resultmessage` 's tail `negativedamage; orword; jumpifability; setbyte; goto` + the
 * `healthbarupdate` row before the bar: 6 rows the print's box stays up (the recoil's 7 above, same shape). A neutral hit has no print and the target bar's `bars` tail already holds them.
 */
const DRAIN_PC = datahpupdatePcAfter("BattleScript_AbsorbUpdateHp");
const HP_DRAIN_LEAD_ROWS = 6;
const WRAP_SECONDARY_PC = BATTLE_SCRIPT_PROGRAM.labelEntries["BattleScript_MoveEffectWrap"]!.programCounter;
type HpTick = "turn-damage" | "weather";
function hpTickKind(event: BattleKernelSemanticEvent): HpTick | null {
  const programCounter = event.provenance?.programCounter;
  return programCounter === TURN_DAMAGE_PC ? "turn-damage" : programCounter === WEATHER_DAMAGE_PC ? "weather" : null;
}
interface HpLeadRows {
  readonly tick: HpTick | null;
  /** The next kernel event is the wrap hit's secondary message (hpf5 T2). */
  readonly wrapSecondary: boolean;
  readonly moveEndRows: number | null; readonly messageRows: number | null; readonly faintNext: boolean;
  /** The print after `datahpupdate` is the hit's own effect message (critmessage / resultmessage). */
  readonly hitEffectMessage: boolean;
  /** The `healthbarupdate` instruction's execution (the bar's own row). */
  readonly barExecution: number | undefined;
  /** The `datahpupdate` of `BattleScript_DoRecoil` (a recoil bar). */
  readonly recoil: boolean;
  /** The `datahpupdate` of `BattleScript_AbsorbUpdateHp` (a drain's heal bar). */
  readonly drain: boolean;
  /** The next kernel event is `BattleScript_FocusBandActivates` (hpb3). */
  readonly focusBand: boolean;
  /** hpb3: the rows from `datahpupdate` to a healing berry's `playanimation` after the MoveEnd rows, or null. */
  readonly itemAnimationRows: number | null;
  readonly itemAnimationSeGate: number;
  /** sep1: the battle SE still playing when the hit's bar starts, and the bar's rows (battleHealthBarAnimationFrames + 1). */
  readonly pendingSeSong: number | null;
  readonly barRows: number;
  /** HITMARKER_NO_ANIMATIONS (Scene OFF) when the hp command was projected. */
  readonly sceneOff: boolean;
}
/** Applies the hpd1 / hpf1 tail to the plain hp commands of a finished command list (see hpMoveEndLeadRows, hpMessageLeadRows). */
function applyHpHitTails(
  commands: BattleResolutionPresentationCommand[],
  leadRows: ReadonlyMap<number, HpLeadRows>,
): void {
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]!;
    const leads = command.type === "hp" ? leadRows.get(command.eventSequence) : undefined;
    if (command.type !== "hp" || leads === undefined || command.timing !== HP_TIMING) continue;
    // trp1: a TURN_TRAP animation (Scene ON) or its Pausex20 hold (Scene OFF) sits right before its "X is hurt by Y!" print and is the
    // next controller exec the tails measured (their lead ends where the print's command used to start); the rules read past it.
    const rest = commands.slice(index + 1).filter((next) => !(next.type === "general-animation" && next.animation === "TURN_TRAP")
      && !(next.type === "move-animation" && next.turnTrapHold === true));
    if (leads.tick !== null && rest[0]?.type === "faint" && leads.faintNext) {
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames: TICK_FAINT_TAIL_FRAMES }) });
      continue;
    }
    if (leads.tick === "turn-damage") {
      commands[index] = Object.freeze({ ...command, timing: TICK_HP_TIMING });
      continue;
    }
    if (leads.tick === "weather") {
      const tailFrames = rest[0]?.type === "message" ? WEATHER_TICK_MESSAGE_TAIL_FRAMES : WEATHER_TICK_LAST_TAIL_FRAMES;
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames }) });
      const weatherDrain = rest[0];
      const weatherHit = commands[index - 1];
      if (weatherDrain?.type === "general-animation" && weatherDrain.animation === "LEECH_SEED_DRAIN" && weatherDrain.animated === true && weatherDrain.afterPlayerSendIn !== true
        && weatherHit?.type === "hit-animation" && weatherHit.battler === command.battler && leads.barRows > 0) {
        const gate = seg127StatusSeGateRows({
          songId: leads.pendingSeSong,
          seAgeRows: weatherHit.timing.minimumFrames - WEATHER_HIT_SE_AFTER_COMMAND_ROWS + leads.barRows + tailFrames + LEECH_SEED_DRAIN_LEGACY_LAG + 2,
        });
        const at = commands.indexOf(weatherDrain);
        const lag = (weatherDrain.timing.launchLagFrames ?? LEECH_SEED_DRAIN_LEGACY_LAG + 2) + gate;
        commands[at] = Object.freeze({ ...weatherDrain, timing: Object.freeze({ minimumFrames: weatherDrain.timing.minimumFrames + gate, launchLagFrames: lag }) });
      }
      continue;
    }
    const recoilPrevious = commands[index - 1];
    if (leads.recoil && leads.messageRows !== null && rest[0]?.type === "message" && recoilPrevious?.type === "message") {
      commands[index - 1] = Object.freeze({ ...recoilPrevious, timing: Object.freeze({ ...recoilPrevious.timing, holdFrames: recoilPrevious.timing.holdFrames + HP_RECOIL_LEAD_ROWS }) });
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames: leads.messageRows - 1 }) });
      continue;
    }
    if (leads.drain && recoilPrevious?.type === "message") {
      commands[index - 1] = Object.freeze({ ...recoilPrevious, timing: Object.freeze({ ...recoilPrevious.timing, holdFrames: recoilPrevious.timing.holdFrames + HP_DRAIN_LEAD_ROWS }) });
    }
    if (leads.wrapSecondary && rest[0]?.type === "message") {
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames: WRAP_SECONDARY_TAIL_FRAMES }) });
      continue;
    }
    const seedDrain = rest[2];
    if (recoilPrevious?.type === "hit-animation" && recoilPrevious.battler === command.battler && rest[0]?.type === "sprite-visibility" && rest[1]?.type === "sprite-visibility"
      && seedDrain?.type === "general-animation" && seedDrain.animation === "LEECH_SEED_DRAIN" && seedDrain.afterPlayerSendIn !== true && leads.moveEndRows !== null && !leads.sceneOff) {
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames: HIT_TO_SEED_DRAIN_TAIL_ROWS }) });
      const lag = hitSeDrainLaunchLag(leads.pendingSeSong, recoilPrevious.timing.minimumFrames, leads.barRows);
      if (lag !== null && seedDrain.animated === true) {
        const at = commands.indexOf(seedDrain);
        commands[at] = Object.freeze({ ...seedDrain, timing: Object.freeze({ minimumFrames: seedDrain.timing.minimumFrames - LEECH_SEED_DRAIN_LEGACY_LAG + lag, launchLagFrames: lag }) });
      }
      continue;
    }
    if (leads.sceneOff && recoilPrevious?.type === "hit-animation" && recoilPrevious.battler === command.battler && rest[0]?.type === "sprite-visibility" && rest[1]?.type === "sprite-visibility"
      && seedDrain?.type === "general-animation" && seedDrain.animation === "LEECH_SEED_DRAIN" && seedDrain.afterPlayerSendIn !== true && seedDrain.animated !== true) {
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames: HIT_TO_SEED_DRAIN_TAIL_ROWS }) });
      const at = commands.indexOf(seedDrain);
      commands[at] = Object.freeze({ ...seedDrain, timing: Object.freeze({ minimumFrames: seedDrain.timing.minimumFrames - OFF_HIT_SEED_DRAIN_EARLY_ROWS }) });
    }
    const transition = rest[0]?.type === "move-animation" && rest[1]?.type === "sprite-visibility";
    const endsTurn = rest.length > 0 && rest.every((c) => c.type === "sprite-visibility" || c.type === "turn-end");
    const previous = commands[index - 1];
    const hit = previous?.type === "hit-animation" && previous.battler === command.battler;
    const next = rest[0];
    const nextLeads = next?.type === "hp" && next.timing === HP_TIMING ? leadRows.get(next.eventSequence) : undefined;
    const bars = hit && leads.barExecution !== undefined && nextLeads?.barExecution !== undefined && nextLeads.barExecution > leads.barExecution
      ? nextLeads.barExecution - leads.barExecution : 0;
    const endTurnPrint = hit && leads.moveEndRows !== null && rest[0]?.type === "sprite-visibility" && rest[1]?.type === "sprite-visibility" && rest[2]?.type === "message";
    const heal = command.to > command.from;
    const afterHp = previous?.type === "hp";
    const printHold = next?.type === "message" && leads.messageRows !== null && ((hit && leads.hitEffectMessage) || heal || afterHp || leads.drain);
    if (!hit && !printHold && command.battler === 0) continue;
    const faint = hit && rest[0]?.type === "faint" && leads.faintNext;
    const statNext = (hit && rest[0]?.type === "stat") || (hit && leads.focusBand);
    const itemAnimation = hit && leads.itemAnimationRows !== null && rest[0]?.type === "sprite-visibility" && rest[1]?.type === "sprite-visibility" && rest[2]?.type === "general-animation";
    const tailFrames = statNext ? (leads.sceneOff ? HP_STAT_NEXT_TAIL_FRAMES_OFF : HP_STAT_NEXT_TAIL_FRAMES) : transition ? (leads.moveEndRows === null ? 0 : HP_DATAHPUPDATE_ROW_FRAMES)
      : endsTurn ? leads.moveEndRows ?? 0 : bars > 0 ? bars : endTurnPrint ? leads.moveEndRows! + HP_END_TURN_PRINT_LEAD_ROWS
      : itemAnimation ? leads.itemAnimationRows! + (leads.sceneOff ? 0 : leads.itemAnimationSeGate) : printHold ? leads.messageRows! : 0;
    if (faint) commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0 }) });
    else if (tailFrames > 0) commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: 0, tailFrames }) });
  }
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
/**
 * chg1: Skull Bash's Defense boost after its charge box (Scene OFF): STATS_CHANGE's `playanimation` executes on row A, the box's
 * print on row P with its waitmessage's 64 rows after it; the animation's first drawn frame is A - P - 63 frames after the held box (fitted on
 * the Skull Bash lab, 7 frames; the generic 2-frame stat command is 5 short: setstatchanger .. playanimation).
 */
function chargeTurnStatTiming(
  events: readonly BattleKernelSemanticEvent[],
  index: number,
  beforeRules: BattleScriptRulesContext,
): Readonly<{ minimumFrames: number }> | null {
  if ((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) return null;
  const box = events[index - 1];
  const animation = events[index + 1];
  if (box === undefined || animation === undefined || box.payload.kind !== "message" || box.provenance?.sourceLabel !== CHARGE_TURN_SCRIPT) return null;
  if (animation.payload.kind !== "animation" || animation.payload.animationId !== "STATS_CHANGE") return null;
  const printExecution = box.provenance?.instructionExecution;
  const animationExecution = animation.provenance?.instructionExecution;
  if (printExecution === undefined || animationExecution === undefined) return null;
  return Object.freeze({ minimumFrames: Math.max(STAT_TIMING.minimumFrames, animationExecution - printExecution - WAITMESSAGE_LONG_HOLD_FRAMES + 1) });
}
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
function wakeUpIconTiming(events: readonly BattleKernelSemanticEvent[], iconIndex: number) {
  const frames = wakeUpStatusIconFrames(events, iconIndex);
  return frames === null ? null : Object.freeze({ minimumFrames: frames });
}
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
export const OPPONENT_SEND_IN_NEXT_PRINT_FRAMES = 9;
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
  // vis243a: the voluntary player send-in waits for the same ROM chain as the forced one (back animation in Scene ON, then the cry:
  // SwitchIn_CleanShinyAnimShowSubstitute -> SwitchIn_HandleSoundAndEnd); its next print follows the usual 11-frame waitstate hold.
  if (battler === 0) {
    const duration = sceneOn
      ? sceneOnPlayerForcedSwitchInDuration(species, personality)
      : sceneOffPlayerForcedSwitchInDuration(species);
    return Object.freeze({ minimumFrames: duration });
  }
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
/**
 * lrc1 (docs/lrc1-loss-recall.md): the loss tail's `returnopponentmon1toball BS_ATTACKER` + `waitstate`
 * (BattleScript_LocalBattleLostPrintTrainersWinText, battle_scripts_1.s:2962-2963). `VARIOUS_RETURN_OPPONENT_MON1`
 * (battle_script_commands.c:6455-6461) sends `BtlController_EmitReturnMonToBall(..., FALSE)` while the opponent has HP, so
 * `OpponentHandleReturnMonToBall` runs `DoSwitchOutAnimation` -> B_ANIM_SWITCH_OUT_OPPONENT_MON (battle_controller_opponent.c:1200-1235;
 * Special_SwitchOutOpponentMon: AnimTask_SwitchOutBallEffect, delay 10, AnimTask_SwitchOutShrinkMon) -> FreeMonSpriteAfterSwitchOutAnim,
 * the same return to ball as an AI switch (ais1 / ais2): a `switch-out` (SE_BALL_OPEN at recall elapsed 2), then the healthbox-hiding
 * recall receipt. ROM frames (fcs1 sweep, 8 lost battles, both scenes; DUSCLOPS loss lab, docs/terminal-seam-loss-path-ground-truth.md):
 * dispatch D, SE_BALL_OPEN D + 2, healthbox gone D + 32, trainer slide (this model's el 0) D + 45 (lab: 2951 -> 2996), slide settled D + 83,
 * the win text's first row D + 86 (every lost battle: SE_BALL_OPEN + 84).
 * - LOSS_RECALL_LEAD_FRAMES: the script rows from the `switch-out` command's start (the row after the last "fainted!" box's A and the
 *   turn's remaining commands) to D. Kept from the measured SE_BALL_OPEN of aud241c / aud252 (command start + 22 = lead + 2), so the
 *   sound frame does not move; the picture now follows it.
 * - LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES: D + 32 -> D + 45 (FreeMonSpriteAfterSwitchOutAnim's completion, waitstate,
 *   returnopponentmon2toball, waitstate, trainerslidein, the slide sprite's off-screen rows before this model's el 0).
 * - LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES: the slide settles (el 38) and printstring's first row shows 3 rows later
 *   (docs/terminal-seam-antecedent-boundary-probe.md §3: exec-flag sampling lag, waitstate's own row, the printer's render lag).
 */
export const LOSS_RECALL_LEAD_FRAMES = 20;
export const LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES = 13;
export const LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES = 3;
export const LOSS_TAIL_SCRIPT_LABEL = "BattleScript_LocalBattleLostPrintTrainersWinText";
const LOSS_RECALL_SWITCH_OUT = Object.freeze({
  timing: Object.freeze({ minimumFrames: LOSS_RECALL_LEAD_FRAMES + RETURN_TO_BALL_SPAN_FRAMES }),
  leadFrames: LOSS_RECALL_LEAD_FRAMES,
});
const LOSS_TAIL_TRAINER_SLIDE_TIMING = Object.freeze({ minimumFrames: 38, holdFrames: LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES } as const);
/**
 * wtl1 (docs/wtl1-win-tail-timing.md): the win tail, `BattleScript_FrontierTrainerBattleWon` (battle_scripts_1.s:3027-3048).
 * - "Player defeated ...!" itself is the box's wtl1 (WIN_TAIL_PRE_RECEIPT_ROWS / WIN_TAIL_POST_RECEIPT_ROWS, winTailHoldRows): P + 26, which
 *   is also the frame catcher's victory BGM + 4.
 * - WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES: from the press on "Player defeated ...!" to the slide model's el 0 (the printer's release, the
 *   controller's completion, `trainerslidein`'s dispatch, and the slide sprite's off-screen rows, as the loss tail's
 *   LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES). Then the 38 rows of the slide and the 3 rows to the lose text's first glyph
 *   (LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES; `waitstate`, the printer). ROM: the press to the lose text's first glyph 55 frames in 22 of 22
 *   wins; ours 38 before.
 */
export const WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES = 14;
export const WIN_TAIL_SCRIPT_LABEL = "BattleScript_FrontierTrainerBattleWon_LoseTexts";
const WIN_TAIL_TRAINER_SLIDE_TIMING = Object.freeze({
  minimumFrames: 38, leadFrames: WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES, holdFrames: LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES,
} as const);
/** The `switch-out` command's recall clock (lrc1 `leadFrames`): negative while the battler still waits at rest for the dispatch. */
export function switchOutRecallElapsed(
  command: Extract<BattleResolutionPresentationCommand, { type: "switch-out" }>,
  phaseElapsed: number,
): number {
  return phaseElapsed - (command.leadFrames ?? 0);
}
const TURN_END_TIMING = Object.freeze({ minimumFrames: 8 } as const);

/**
 * btn2 (ROM, subp1m labs, both scenes): the rows from a button gate's release (the engine's next command starts on press + 1) to the
 * script's `moveendall`, which the 8-row turn-end follows: the printer's release (resume on press + 3) plus the instructions the
 * script still runs, one row each.  Dragged out: 2 (press + 5); Substitute damaged: 7 (press + 10); Substitute faded: the instructions
 * after the 64-row `waitmessage` hold (4) + the 5 before it.  Only a print directly before the turn-end (the fade case has its own lead).
 * msw2: after a Substitute release the ROM clears the box one row before the totals below end (subhit lab 520 of a turn-end ending 521 and a
 * menu on 527, faded 883 / 884 / 890, both scenes), so those two keep their totals and draw the last `RELEASE_TAIL_BLANK_ROWS` row cleared.
 * Dragged out stays msg2's 4 (ROM catcher: clear press + 14 in 33 / 33, menu press + 20 in 20 of 35; the lab's 7-row gap before the menu is 5 to 8
 * across catcher runs, so the roar lab's menu stays 1 row early).
 */
export const RELEASE_TAIL_BLANK_ROWS = 1;
export const RELEASE_TO_MOVEEND_ROWS: Readonly<Record<string, number>> = Object.freeze({
  STRINGID_PKMNWASDRAGGEDOUT: 4,
  STRINGID_SUBSTITUTEDAMAGED: 10,
  STRINGID_PKMNSUBSTITUTEFADED: 9,
});

/**
 * chg1: Scene OFF, a turn that ends on the `resultmessage` "attack missed!" print (BattleScript_MoveMissed: resultmessage, waitmessage,
 * `goto BattleScript_MoveEnd`, moveendall) clears its box one row after the generic 8-frame turn end (Dig lab, ROM 340 vs 339). Only a
 * turn with a semi-invulnerable battler (at its start, or hidden by a MoveEnd receipt in it; the unleash turn's miss): a plain accuracy miss (ais2 seed 2741) stays on the generic 8.
 */
const SCENE_OFF_MISS_TURN_END_ROWS = 1;
function sceneOffMissTurnEnd(
  commands: readonly BattleResolutionPresentationCommand[],
  events: readonly BattleKernelSemanticEvent[],
  beforeRules: BattleScriptRulesContext,
): boolean {
  if ((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) return false;
  const semiInvulnerable = beforeRules.battlers.some((battler) => (battler.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0)
    || events.some((event) => event.payload.kind === "set-battler-sprite-visibility" && event.payload.invisible);
  if (!semiInvulnerable) return false;
  let index = commands.length - 1;
  while (index >= 0 && commands[index]!.type === "sprite-visibility") index -= 1;
  const printed = commands[index];
  if (printed?.type !== "message") return false;
  const payload = events.find((event) => event.sequence === printed.eventSequence)?.payload;
  return payload?.kind === "message" && payload.messageId === "STRINGID_ATTACKMISSED";
}
export function turnEndTimingAfterRelease(
  commands: readonly BattleResolutionPresentationCommand[], events: readonly BattleKernelSemanticEvent[],
): BattleTurnEndTiming {
  let index = commands.length - 1;
  while (index >= 0 && commands[index]!.type === "sprite-visibility") index -= 1;
  const printed = commands[index];
  if (printed?.type !== "message" || printed.promptGate !== true) return TURN_END_TIMING;
  const payload = events.find((event) => event.sequence === printed.eventSequence)?.payload;
  const messageId = payload?.kind === "message" ? payload.messageId : undefined;
  const rows = messageId === undefined ? undefined : RELEASE_TO_MOVEEND_ROWS[messageId];
  return rows === undefined ? TURN_END_TIMING
    : Object.freeze({
      minimumFrames: TURN_END_TIMING.minimumFrames + rows,
      ...(messageId === "STRINGID_PKMNWASDRAGGEDOUT" ? {} : { blankTailFrames: RELEASE_TAIL_BLANK_ROWS }),
    });
}
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

type MessageCommand = Extract<BattleResolutionPresentationCommand, { type: "message" }>;

/** btn1: rows a message piece spends printing: its scroll lead plus the glyphs not yet on screen. */
export function messageCommandTypedRows(command: MessageCommand): number {
  return (command.leadFrames ?? 0) + battleStringPrintableLength(command.lines) - (command.startChars ?? 0);
}

/** btn1: glyphs of a message piece on screen at its printer age (0 = the first printer callback). */
export function messageCommandVisibleCharacters(command: MessageCommand, age: number): number {
  return Math.min(
    battleStringPrintableLength(command.lines),
    (command.startChars ?? 0) + Math.max(0, age + 1 - (command.leadFrames ?? 0)),
  );
}

/** btn1: rows the `\l` scroll takes after the press (Static's `\l`: press + 33 = the scroll + the 25-glyph second line + 3). */
export const PROMPT_SCROLL_ROWS = 5;

/**
 * btn1 (docs/subp1m-battle-text-pause.md): a Factory battle prints with `autoScroll` off, so every `\p` / `\l` in a battle string
 * holds the printer until a NEW A or B press.  The gates are read from the string's template (`battleStringPromptGates`): the
 * message becomes one piece per gate -- a piece types its page, then (`advance: "button"`) waits for the press; the page after a
 * `\p` is cleared, after a `\l` it scrolls (the last line stays, `startChars`, then `PROMPT_SCROLL_ROWS` rows).  A trailing gate
 * keeps the source's post-print `waitmessage` as a separate hold piece (the source runs it after the printer releases).  The faint
 * and terminal-seam ids are unchanged: their button message ends the segment (no `turn-end`).
 */
export function promptGatedMessageCommands(base: MessageCommand, messageId: string): readonly MessageCommand[] {
  const gates = battleStringPromptGates(messageId);
  if (messageId === "STRINGID_TARGETFAINTED" || messageId === "STRINGID_ATTACKERFAINTED" || TERMINAL_SEAM_BUTTON_MESSAGE_IDS.has(messageId)) {
    // fnt1: "{X} fainted!\p" / "Player defeated ...!\p" end on a `\p`; the two quote ids wait on PAUSE_UNTIL_PRESS (no gate here).
    const last = gates[gates.length - 1];
    const promptClear = !base.noCursor && last?.kind === "clear" && last.afterLines >= base.lines.length;
    return [Object.freeze({ ...base, advance: "button" as const, ...(promptClear ? { promptClear: true as const } : {}) })];
  }
  if (gates.length === 0) return [base];
  const lines = base.lines;
  const chars = (window: readonly string[]) => battleStringPrintableLength(window);
  const pieces: MessageCommand[] = [];
  let start = 0;
  let previous: BattleStringPromptGate["kind"] | null = null;
  const windowFrom = (first: number, end: number): readonly string[] => Object.freeze(lines.slice(Math.max(first, end - 2), end));
  for (const gate of gates) {
    const end = Math.min(gate.afterLines, lines.length);
    if (end <= start) continue;
    const kept = previous === "scroll" ? 1 : 0;
    const window = windowFrom(start - kept, end);
    pieces.push(Object.freeze({
      ...base,
      lines: window,
      advance: "button" as const,
      promptGate: true as const,
      timing: Object.freeze({ minimumFrames: 0, holdFrames: 0 }),
      ...(kept === 1 ? { startChars: chars(window.slice(0, 1)), leadFrames: PROMPT_SCROLL_ROWS } : {}),
    }));
    start = end;
    previous = gate.kind;
  }
  if (start >= lines.length && previous === "clear" && pieces.length > 0) {
    // fnt1: the string's last marker is a `\p` with nothing after it: its last page is a `promptClear` piece.
    pieces[pieces.length - 1] = Object.freeze({ ...pieces[pieces.length - 1]!, promptClear: true as const });
  }
  if (start < lines.length) {
    const kept = previous === "scroll" ? 1 : 0;
    const window = windowFrom(start - kept, lines.length);
    pieces.push(Object.freeze({
      ...base,
      lines: window,
      advance: "automatic" as const,
      promptGate: true as const,
      timing: Object.freeze({ minimumFrames: 0, holdFrames: base.timing.holdFrames }),
      ...(kept === 1 ? { startChars: chars(window.slice(0, 1)), leadFrames: PROMPT_SCROLL_ROWS } : {}),
    }));
  } else if (base.timing.holdFrames > 0) {
    const window = pieces[pieces.length - 1]!.lines;
    pieces.push(Object.freeze({
      ...base,
      lines: window,
      advance: "automatic" as const,
      promptGate: true as const,
      startChars: chars(window),
      timing: Object.freeze({ minimumFrames: 0, holdFrames: base.timing.holdFrames }),
    }));
  }
  return pieces;
}
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
/**
 * bbk1: Scene OFF Brick Break through a screen (labs bbk1-brickbreak-{lightscreen,reflect}-off, ROM rows used print 208 -> `BrickBreakAnim+0x10` print 278 -> SE 14 363):
 * the body ends one row after the print's execution (print = used + 70), and typecalc2 / effectivenesssound / hitanimation run 3 rows after the print's waitmessage hold (print -> SE 85).
 */
const BRICK_BREAK_WALL_PRINT_BODY_ROWS = 1;
const BRICK_BREAK_WALL_PRINT_TAIL_ROWS = 3;

/** bbk1: Brick Break through a screen runs `printstring STRINGID_THEWALLSHATTERED` between attackanimation and hitanimation; the message command presents that print and its waitmessage, so the body ends at the print (ROM BrickBreakAnim+0x0 -> +0x10). */
function brickBreakWallShatteredPrint(
  events: readonly BattleKernelSemanticEvent[],
  moveIndex: number,
): BattleKernelSemanticEvent | null {
  const next = events[moveIndex + 1];
  return next !== undefined && next.payload.kind === "message" && next.payload.messageId === "STRINGID_THEWALLSHATTERED" ? next : null;
}

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
  /** pic9: the opponent battler's HP as the kernel's events stand at this print (Cmd_hpthresholds reads gBattleMons). */
  opposingHp: Readonly<{ hp: number; maxHP: number }> = { hp: field.opponent.hp, maxHP: field.opponent.maxHP },
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
      // pic9: `hpthresholds` before the print scales the OPPOSING battler's HP at that moment (it used to be "Go!" always).
      const lines = [
        [`Go! ${incoming.name}!`],
        [`Do it! ${incoming.name}!`],
        [`Go for it, ${incoming.name}!`],
        ["Your foe’s weak!", `Get ’em, ${incoming.name}!`],
      ] as const;
      return Object.freeze([...lines[switchInMonHpScale(opposingHp.hp, opposingHp.maxHP)]]);
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
    // BattleScript_WishComesTrue/WishButFullHp: Cmd_trywish's heal-effect state
    // PREPARE_MON_NICK_WITH_PREFIX_BUFFERs gWishFutureKnock.wishMonId[target]
    // into {B_BUFF1} (battle_script_commands.c:9309): the party member that
    // made the wish, with the slot's side prefix -- not the battler now in the
    // slot (msg2: fcm1 s89-on-wc battle 9 "Foe ILLUMISE's WISH" with DRAGONAIR
    // in). Resolved by prepareMessage from rules.party, like Beat Up's member.
    if (event.payload.substitutions.length === 0) {
      throw new Error(`battle resolution ${messageId} message has no wisher substitution`);
    }
    const wisherName = event.payload.substitutions[0]!;
    return resolveBattleStringLines(messageId, {
      B_BUFF1: () => wisherName,
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

/**
 * lsd196: a `stat` between two prints (Bulk Up's ATTACK -> DEFENSE: `printfromtable; waitmessage` ... `setstatchanger; statbuffchange;
 * jumpifbyte; printfromtable`). The first print's `waitmessage B_WAIT_TIME_LONG` hold is `previous.timing.holdFrames` executions of the
 * kernel's count; every further execution up to the next print is one single-row instruction (ROM off108 Bulk Up: 4 rows, then the next
 * print's first glyph one row later). Rows = those instructions + the first-glyph lead; the `stat` command presents all of them.
 */
function statBetweenPrintsFrames(
  events: readonly BattleKernelSemanticEvent[],
  previous: BattleResolutionPresentationCommand,
  stat: Extract<BattleResolutionPresentationCommand, { type: "stat" }>,
  following: BattleResolutionPresentationCommand,
): number {
  if (previous.type !== "message" || following.type !== "message") return 0;
  const first = events.find((event) => event.sequence === previous.eventSequence)?.provenance?.instructionExecution;
  const second = events.find((event) => event.sequence === following.eventSequence)?.provenance?.instructionExecution;
  if (first === undefined || second === undefined || second <= first) return 0;
  const lead = 1;
  return Math.max(stat.timing.minimumFrames, second - first - previous.timing.holdFrames + lead);
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
  const hpLeadRows = new Map<number, HpLeadRows>();
  let leechDrainAnimated = false;
  const seedDrainInSegment = events.some((e) => e.provenance?.programCounter === LEECH_SEED_DRAIN_SEEDED_PC && e.payload.kind === "hp-change");
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
  let lastUsedCurrentMove: number | null = null;
  // Target of the latest Scene ON MOVE_ANIMATION receipt (Scene OFF has none): its `returntoball` is the forced removal.
  let sceneOnMoveTarget: 0 | 1 | null = null;
  // sta5 step 2 holds are Scene ON rows (the launch follows a Scene ON MOVE_ANIMATION receipt; Scene OFF has none and keeps its commands).
  let sceneOnMoveAnimationSeen = false;
  // plr162 / snd182: battlers whose forced `returntoball BS_TARGET` (Roar / Whirlwind) removal awaits its send-in (both scenes).
  const forcedDraggedOut = new Set<0 | 1>();
  let pendingHeldItemEffectBattler: 0 | 1 | null = null;
  const heldItems = [
    beforeRules.battlers[0]!.item,
    beforeRules.battlers[1]!.item,
  ] as [number, number];
  let usedMoveInstructionExecution: number | null = null;
  // off108: the opener print's event index and the command count after it.
  let chargeChainCarry: { rows: number; attacker: number | undefined } | null = null;
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
  // pic9: each battler's HP as the kernel's hp-change events stand (the switch-in line's hpthresholds reads the foe's).
  const liveHp: [number, number] = [field.player.hp, field.opponent.hp];
  const substituteFades: { at: number; battler: 0 | 1; sequence: number }[] = [];
  const statsChanges: { at: number; battler: 0 | 1; sequence: number; argument: number; frames: number; seGate: number }[] = [];
  let playerSendInEnd = -1;
  const heldItemEffects: { at: number; battler: 0 | 1; sequence: number; frames: number; afterStatus: boolean; seGate?: number; trapMove?: number; animation: "HELD_ITEM_EFFECT" | "WISH_HEAL" | "FUTURE_SIGHT_HIT" | "FOCUS_BAND" | "ITEM_KNOCKOFF" | "INGRAIN_HEAL" | "TURN_TRAP" }[] = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const synthesized = event.provenance?.dispatcher === SYNTHESIZED_SWITCH_DISPATCHER
      || event.provenance?.dispatcher === SYNTHESIZED_AI_SWITCH_DISPATCHER;
    if (!Number.isSafeInteger(event.sequence) || (event.sequence <= lastSequence && !synthesized)) {
      throw new Error(
        `battle resolution event sequence ${event.sequence} is not strictly increasing after ${lastSequence}`,
      );
    }
    if (!synthesized) lastSequence = event.sequence;
    const payload = event.payload;
    if (payload.kind === "animation" && payload.animationId === "LEECH_SEED_DRAIN") leechDrainAnimated = true;
    if (payload.kind === "set-battler-pp-data") {
      lastMoveAttacker = singlesBattler(payload.battler, "PP update");
      continue;
    }
    if (payload.kind === "message") {
      sourceLabelOf(event);
      const actionSnapshot = payload.actionSnapshot ?? null;
      if (actionSnapshot !== null) lastUsedCurrentMove = actionSnapshot.currentMove;
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
      if (
        pendingHeldItemEffectBattler === null
        && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
      ) {
        const heldItemHold = heldItemEffectOffHoldFrames(events, index, commands[commands.length - 1]?.type === "status");
        if (heldItemHold !== null) {
          commands.push(Object.freeze({
            type: "move-animation",
            ...(playanimationBeforePrint(events, index) === "B_ANIM_TURN_TRAP" ? { turnTrapHold: true as const } : {}),
            eventSequence: event.sequence,
            battler: lastMoveAttacker ?? 0,
            timing: Object.freeze({ minimumFrames: heldItemHold }),
          }));
        }
      }
      const selfConfusionOff = payload.messageId === SELF_CONFUSION_HIT_MESSAGE_ID && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
      const prePrintPause = anchorlessPrePrintPauseFrames(event);
      if (prePrintPause !== null) {
        commands.push(Object.freeze({
          type: "move-animation",
          ...((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0 ? { actionTransition: true as const } : {}),
          eventSequence: event.sequence,
          battler: lastMoveAttacker ?? 0,
          timing: Object.freeze({ minimumFrames: prePrintPause }),
        }));
      }
      if (event.provenance?.sourceLabel === CHARGE_TURN_SCRIPT && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) {
        const rows = chargeTurnChainRows(events, index, actionSnapshot?.currentMove);
        if (rows > 0) chargeChainCarry = { rows, attacker: actionSnapshot?.attacker };
      }
      const carriedRows = payload.messageId === "STRINGID_USEDMOVE" ? chargeChainCarry : null;
      if (carriedRows !== null) chargeChainCarry = null;
      const carryAfterGlyph = carriedRows !== null && carriedRows.attacker !== actionSnapshot?.attacker ? carriedRows.rows : 0;
      const carryBeforeGlyph = carriedRows !== null && carryAfterGlyph === 0 ? carriedRows.rows : 0;
      commands.push(...promptGatedMessageCommands(Object.freeze({
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
          { hp: liveHp[1], maxHP: currentField.opponent.maxHP },
        ),
        advance: "automatic",
        ...(selfConfusionOff ? { leadFrames: SELF_CONFUSION_OFF_PRE_PRINT_ROWS } : {}),
        ...(event.provenance?.sourceLabel === FOCUS_PUNCH_LOST_FOCUS_SCRIPT ? { leadFrames: FOCUS_PUNCH_LOST_FOCUS_PRE_PRINT_ROWS } : {}),
        ...(twoTurnSecondPrintLead(event, beforeRules, actionSnapshot, events[index - 1]) ?? {}),
        ...(carryBeforeGlyph > 0 ? { leadFrames: (twoTurnSecondPrintLead(event, beforeRules, actionSnapshot, events[index - 1])?.leadFrames ?? 0) + carryBeforeGlyph } : {}),
        ...(endTurnChainLeadRows(events, index, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) > 0
          ? { leadFrames: endTurnChainLeadRows(events, index, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) } : {}),
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
            holdFrames: (usedMessageHoldFrames > 0
              ? usedMessageHoldFrames
              : sourcePauseUsedMoveHoldFrames(events, index) ?? 0) + carryAfterGlyph,
          })
          : payload.messageId === "STRINGID_RETURNMON"
            ? RETURN_MON_TIMING
            : payload.messageId === "STRINGID_SWITCHINMON"
              ? SWITCH_IN_MESSAGE_TIMING
              : (() => {
                const base = selfConfusionOff
                  ? SELF_CONFUSION_OFF_HIT_MESSAGE_TIMING
                  : (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0 && preMoveOffUsedPrintTiming(events, index) !== null
                  ? preMoveOffUsedPrintTiming(events, index)!
                  : messageTimingFromSourceProvenance(event, sceneOnMoveAnimationSeen, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0)
                  ?? (WAITMESSAGE_LONG_MESSAGE_IDS.has(payload.messageId) || payload.messageId === SUBSTITUTE_FADED_MESSAGE_ID
                  ? WAITMESSAGE_LONG_TIMING
                  : MESSAGE_TIMING);
                const timing = focusPunchPrePassMessageTiming(events, index, base) ?? chargeTurnEmptyBoxTiming(events, index) ?? hitAllLoopEmptyBoxTiming(events, index) ?? base;
                if (payload.messageId === "STRINGID_THEWALLSHATTERED") {
                  return Object.freeze({ minimumFrames: timing.minimumFrames, holdFrames: timing.holdFrames + BRICK_BREAK_WALL_PRINT_TAIL_ROWS });
                }
                if (event.provenance?.sourceLabel === "BattleScript_PresentHealTarget" && actionSnapshot?.currentMove === MOVE_REST
                  && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) {
                  return Object.freeze({ minimumFrames: timing.minimumFrames, holdFrames: timing.holdFrames + REST_HEAL_PRINT_TAIL_ROWS });
                }
                return payload.messageId === "STRINGID_PKMNKNOCKEDOFF"
                  ? Object.freeze({ minimumFrames: timing.minimumFrames, holdFrames: timing.holdFrames + ITEM_KNOCKOFF_PRINT_TAIL_ROWS })
                  : timing;
              })(),
      }), payload.messageId));
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
        // lrc1: the loss tail's printstring shows 3 rows after the slide settles (LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES). wtl1: the win
        // tail's slide (BattleScript_FrontierTrainerBattleWon_LoseTexts) has the same 3 rows and a 14-row lead from the press.
        timing: payload.kind === "trainer-slide-in" && event.provenance?.sourceLabel === LOSS_TAIL_SCRIPT_LABEL
          ? LOSS_TAIL_TRAINER_SLIDE_TIMING
          : payload.kind === "trainer-slide-in" && event.provenance?.sourceLabel === WIN_TAIL_SCRIPT_LABEL
            ? WIN_TAIL_TRAINER_SLIDE_TIMING
            : TRAINER_SLIDE_TIMING,
      }));
      continue;
    }
    if (payload.kind === "animation") {
      const weather = weatherContinuesAnimationOf(payload);
      if (weather !== null) {
        // wth236: Scene ON draws the weather body (battleResolutionPresentationRender.ts weatherContinuesBodyEffect); Scene OFF
        // skips the animation entirely (HITMARKER_NO_ANIMATIONS precedes the weather branch of Cmd_playanimation_var).
        if ((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) {
          commands.push(Object.freeze({
            type: "general-animation",
            eventSequence: event.sequence,
            battler: 0,
            animation: weather,
            animated: true,
            // sst1's "buffeted" rows are etp1's print lead (damagingWeatherLoopLeadRows), not this command's tail.
            timing: Object.freeze({ minimumFrames: weatherContinuesCommandFrames(weather) }),
          }));
        }
        continue;
      }
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
    if (payload.kind === "animation" && payload.animationId === "CASTFORM_CHANGE") {
      // cff230 / cff232: General_CastformChange plays in both scenes (Cmd_docastformchangeanimation has no NO_ANIMATIONS test and the
      // oracle shows the same 117 rows with Scene OFF); behind a Substitute the ROM skips it.
      const argument = Number(payload.arguments[0]);
      if (
        Number.isInteger(argument) && (argument & CASTFORM_CHANGE_SUBSTITUTE) === 0
        && (payload.battler === 0 || payload.battler === 1)
      ) {
        // cff232: the weather loop's battler-1 iteration (the weather print is the event right before; a send-in's is not) costs 3 rows.
        const extra = payload.battler === 1 && events[index - 1]?.payload.kind === "message" ? CASTFORM_CHANGE_WEATHER_LOOP_FRAMES : 0;
        commands.push(Object.freeze({
          type: "general-animation",
          eventSequence: event.sequence,
          battler: payload.battler,
          animation: "CASTFORM_CHANGE",
          castformForm: argument,
          ...(extra === 0 ? {} : { castformLeadExtra: extra }),
          timing: Object.freeze({ minimumFrames: CASTFORM_CHANGE_COMMAND_FRAMES + extra }),
        }));
      }
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
      const { lead: baseLead } = heldItemEffectExecutionsAndLead(events, index);
      const lead = commands.length === playerSendInEnd ? HELD_ITEM_EFFECT_AFTER_SEND_IN_LEAD_FRAMES
        : baseLead === HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES ? heldItemEffectAfterPrintLead(events, index) ?? baseLead : baseLead;
      heldItemEffects.push({
        at: commands.length, battler: pendingHeldItemEffectBattler, sequence: event.sequence,
        frames: HELD_ITEM_EFFECT_COMMAND_FRAMES + lead,
        afterStatus: events[index - 1]?.payload.kind === "set-battler-status-data" && commands[commands.length - 1]?.type === "status",
        animation: "HELD_ITEM_EFFECT",
      });
      continue;
    }
    if (payload.kind === "animation" && payload.animationId === "ITEM_KNOCKOFF") {
      const battler = singlesBattler(payload.battler ?? -1, "item knocked off animation");
      const seGate = sgs134RequestSeGate(events, index);
      heldItemEffects.push({
        at: commands.length, battler, sequence: event.sequence, frames: itemKnockoffCommandFrames(battler, seGate),
        afterStatus: false, animation: "ITEM_KNOCKOFF", ...(seGate > 0 ? { seGate } : {}),
      });
      continue;
    }
    if (payload.kind === "animation" && (payload.animationId === "WISH_HEAL" || payload.animationId === "FUTURE_SIGHT_HIT" || payload.animationId === "FOCUS_BAND" || payload.animationId === "INGRAIN_HEAL")) {
      heldItemEffects.push({
        at: commands.length, battler: singlesBattler(payload.battler ?? -1, "general animation"), sequence: event.sequence,
        frames: payload.animationId === "WISH_HEAL" ? WISH_HEAL_COMMAND_FRAMES
          : payload.animationId === "INGRAIN_HEAL" ? INGRAIN_HEAL_COMMAND_FRAMES
          : payload.animationId === "FUTURE_SIGHT_HIT" ? FUTURE_SIGHT_HIT_COMMAND_FRAMES : FOCUS_BAND_COMMAND_FRAMES,
        afterStatus: false, animation: payload.animationId,
      });
      continue;
    }
    if (payload.kind === "animation" && payload.animationId === "TURN_TRAP") {
      // trp1: Scene ON only (the kernel emits the receipt past Cmd_playanimation's HITMARKER_NO_ANIMATIONS / semi-invulnerable branches;
      // Scene OFF's Pausex20 is the WSH1_OFF_HOLD_LEAD hold on the print). Behind a Substitute the ROM skips it (the insert below).
      const trapMove = Number(payload.arguments[0] ?? 0);
      heldItemEffects.push({
        at: commands.length, battler: singlesBattler(payload.battler ?? -1, "turn trap animation"), sequence: event.sequence,
        frames: TURN_TRAP_COMMAND_FRAMES[turnTrapBranchOf(trapMove)], afterStatus: false, animation: "TURN_TRAP", trapMove,
      });
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
        sceneOnMoveAnimationSeen = true;
        const presentedSinceUsedAtAttack = commandsPresentedSinceUsedPrint(events, pauseOpenerIndex, commands.slice(pauseOpenerCommands), field);
        commands.push(Object.freeze({
          type: "move-animation",
          eventSequence: event.sequence,
          battler,
          animation,
          // An unadapted move retains a bounded pause, explicitly reported by
          // the readiness registry. No substitute effect receives exact credit.
          timing: Object.freeze({
            minimumFrames: SCENE_OFF_MOVE_PAUSE_FRAMES, ...moveAnimationSeGateTiming(events, index), ...moveAnimationScriptLeadTiming(events, index, presentedSinceUsedAtAttack, animation.moveId),
            ...moveAnimationScriptTailTiming(events, index, usedMoveInstructionExecution, presentedSinceUsedAtAttack, animation.moveId),
            ...bdt1BodySoundLead(events, index, animation.moveId),
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
      // eqk1: Magnitude's pause SHORT, print and `waitmessage B_WAIT_TIME_LONG` (used print -> print + 64 rows) are presented by the message commands (ROM first SE was +36 OFF otherwise).
      const magnitudePrint = events[index - 1];
      const magnitudeWaitRows = magnitudePrint?.payload.kind === "message" && magnitudePrint.payload.messageId === "STRINGID_MAGNITUDESTRENGTH"
        ? instructionExecutionOf(magnitudePrint) - usedMoveInstructionExecution + WAITMESSAGE_LONG_HOLD_FRAMES
        : 0;
      const executedPauseCallbacks =
        payload.animationId === "SCENE_OFF_ATTACK_PAUSE"
          ? SCENE_OFF_MOVE_PAUSE_FRAMES + 1 + magnitudeWaitRows
          : 0;
      // mxp1: Self-Destruct / Explosion run `tryexplosion; setatkhptozero; waitstate` before the animation; the user's `hp` command presents those rows, so the
      // body spans only the animation instruction to the hit (ROM labs eqk1-{expl,sd}-{p,f}-off: attackanimation -> hitanimation 43 rows, was 48).
      const explosionFamily = payload.animationId === "SCENE_OFF_ATTACK_PAUSE" && (lastUsedCurrentMove === 120 || lastUsedCurrentMove === 153);
      const wallShatteredPrint = brickBreakWallShatteredPrint(events, index);
      const interveningInstructions = explosionFamily
        ? hitExecution - instructionExecutionOf(event) - executedPauseCallbacks + EXPLOSION_OFF_BODY_ROWS
        : (wallShatteredPrint === null ? hitExecution : instructionExecutionOf(wallShatteredPrint) + BRICK_BREAK_WALL_PRINT_BODY_ROWS) - usedMoveInstructionExecution - executedPauseCallbacks;
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
      if ((beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0 && futureSightHitPlayanimationBefore(events[index]!.provenance?.programCounter)) {
        commands.push(Object.freeze({
          type: "move-animation",
          eventSequence: event.sequence,
          battler: lastMoveAttacker ?? 0,
          timing: Object.freeze({ minimumFrames: FUTURE_SIGHT_HIT_OFF_HOLD_FRAMES }),
        }));
      }
      const hitBattler = singlesBattler(payload.battler ?? -1, "hit animation");
      commands.push(Object.freeze({
        type: "hit-animation",
        eventSequence: event.sequence,
        battler: hitBattler,
        timing: hitTargetSpriteInvisible(events, index, beforeRules, afterRules, hitBattler) ? HIT_ANIMATION_INVISIBLE_TIMING : HIT_ANIMATION_TIMING,
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
      liveHp[battler] = payload.to;
      const health = pendingHealth.get(battler);
      if (!health) {
        throw new Error(`battle resolution HP change for battler ${battler} has no health-bar update`);
      }
      pendingHealth.delete(battler);
      const drainRole = leechSeedDrainRole(events, index);
      if (drainRole === "seeded") {
        const drainPrevious = commands[commands.length - 1];
        const afterIdleController = leechDrainAnimated && (
          (drainPrevious?.type === "general-animation" && isWeatherContinuesAnimation(drainPrevious.animation))
          || (drainPrevious?.type === "switch-in" && drainPrevious.battler === 1));
        const drainMinimumFrames = LEECH_SEED_DRAIN_PRE_ROWS + health.instructionExecution!
          + (leechDrainAnimated ? LEECH_SEED_DRAIN_ANIMATION_ROWS - 1 : 0);
        commands.push(Object.freeze({
          type: "general-animation",
          eventSequence: health.eventSequence,
          battler,
          animation: "LEECH_SEED_DRAIN",
          ...(leechDrainAnimated ? { animated: true as const } : {}),
          ...(commands.length === playerSendInEnd ? { afterPlayerSendIn: true as const } : {}),
          timing: Object.freeze(afterIdleController
            ? { minimumFrames: drainMinimumFrames - LEECH_SEED_DRAIN_IDLE_CONTROLLER_EARLY_ROWS, launchLagFrames: 0 }
            : { minimumFrames: drainMinimumFrames }),
        }));
      }
      leechDrainAnimated = false;
      const moveEndRows = drainRole === null ? hpMoveEndLeadRows(events, index) : null;
      const messageRows = drainRole === null ? hpMessageLeadRows(events, index) : null;
      const faintNext = drainRole === null && hpFaintNext(events, index);
      const hitEffectMessage = HP_HIT_EFFECT_OPCODES.has(events[index + 1]?.provenance?.opcodeName ?? "") || hitAllLoopEmptyBoxTiming(events, index + 1) !== null;
      hpLeadRows.set(health.eventSequence, { tick: hpTickKind(event), wrapSecondary: events[index + 1]?.provenance?.programCounter === WRAP_SECONDARY_PC, moveEndRows, messageRows, faintNext, hitEffectMessage, barExecution: health.instructionExecution, recoil: event.provenance?.programCounter === RECOIL_PC, drain: event.provenance?.programCounter === DRAIN_PC, focusBand: focusBandNext(events, index), itemAnimationRows: drainRole === null ? hpItemAnimationRows(events, index) : null, itemAnimationSeGate: drainRole === null ? hpItemAnimationSeGate(events, index) : 0, pendingSeSong: drainRole === null ? pendingBattleSeSong(events, index) : null, barRows: seedDrainInSegment ? battleHealthBarAnimationFrames({ maxHp: (battler === 0 ? currentField.player : currentField.opponent).maxHP, from: payload.from, to: payload.to }) + 1 : 0, sceneOff: (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0 });
      commands.push(Object.freeze({
        type: "hp",
        eventSequence: health.eventSequence,
        battler,
        from: payload.from,
        to: payload.to,
        healthValue: health.healthValue,
        timing: health.healthValue === INSTANT_HP_BAR_DROP ? instantHpDropTiming(events, health.eventSequence)
          : drainRole === "seeded" ? LEECH_SEED_DRAIN_SEEDED_HP_TIMING
          : drainRole === "receiver" ? LEECH_SEED_DRAIN_RECEIVER_HP_TIMING : knockoffHpTiming(events, index, beforeRules) ?? hpPrintTailTiming(event, events, index),
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
          timing: chargeTurnStatTiming(events, index, beforeRules) ?? STAT_TIMING,
        }));
      }
      continue;
    }
    if (payload.kind === "set-battler-status-data") {
      const battler = singlesBattler(payload.battler, "status change");
      pendingStatusMessageBattler = battler;
      // fnt201: BattleScript_Faint* `cleareffectsonfaint` -> `printstring` is one instruction row in both scenes (no animation).
      const sceneOffStatus = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
        || event.provenance?.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT"
        ? sceneOffStatusFrames(events, index, pauseOpenerIndex, commands.length - pauseOpenerCommands)
        : index === 0 && wakeUpPrintExecution(events, index) !== null
          ? Math.max(0, wakeUpPrintExecution(events, index)! - TURN_START_PRINT_BASE_U)
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
        timing: wakeUpIconTiming(events, index) ?? STATUS_ICON_TIMING,
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
      // Scene ON: Roar/Whirlwind's `returntoball BS_TARGET` after a MOVE_ANIMATION receipt on that target, and Baton Pass's
      // `returntoball BS_ATTACKER` (snd3: its body already hid the attacker, AnimBatonPassPokeball; the receipt is the same instant
      // removal with no recall animation and no SE_BALL_OPEN, OpponentHandleReturnMonToBall / PlayerHandleReturnMonToBall skipAnim);
      // Scene OFF: every `returntoball` (offs152).
      // offs152: in Scene OFF every `returntoball` receipt is the forced removal (no body; the target is drawn at rest).
      const returnToBall = event.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL" && payload.invisible;
      const sceneOffRemoval = returnToBall && (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
      const batonPassRemoval = returnToBall && returnToBallOperand(event) === "BS_ATTACKER";
      const forcedRemoval = returnToBall && (sceneOffRemoval || batonPassRemoval || sceneOnMoveTarget === battler);
      if (forcedRemoval) sceneOnMoveTarget = null;
      if (forcedRemoval && returnToBallOperand(event) === "BS_TARGET") forcedDraggedOut.add(battler);
      const removalGap = batonPassRemoval
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
      // lrc1: the loss tail's `returnopponentmon1toball` (VARIOUS_RETURN_OPPONENT_MON1, skipAnim FALSE) is the opponent's animated
      // return to ball, both scenes: lead + switch-out, then the recall receipt held to the trainer slide (LOSS_RECALL_* above).
      const lossRecall = payload.invisible && battler === 1
        && event.provenance?.opcodeName === "B_SCR_OP_VARIOUS"
        && event.provenance.sourceLabel === LOSS_TAIL_SCRIPT_LABEL;
      if (lossRecall) {
        commands.push(Object.freeze({ type: "switch-out", eventSequence: event.sequence, battler, ...LOSS_RECALL_SWITCH_OUT }));
      }
      const transition = event.provenance?.opcodeName === "B_SCR_OP_MOVEEND"
        ? actionTransitionPauseFrames(events, index, commands, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0)
        : null;
      const sceneOffNoAnimations = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
      // chg1: a Scene OFF semi-invulnerable hide (Dig / Fly / Bounce / Dive MoveEnd receipt) is drawn on the receipt's own row, not at the
      // end of the action transition: the pause splits into the rows to the receipt and the transition rows after it.
      const hideAtReceipt = transition !== null && sceneOffNoAnimations && payload.invisible;
      const winTail = event.provenance?.opcodeName === "B_SCR_OP_MOVEEND" ? winTailHoldRows(events, index) : null;
      const pauseBefore = winTail !== null ? winTail.before : transition === null ? 0
        : hideAtReceipt ? Math.min(transition.frames, Math.max(0, transition.rowsToReceipt + SCENE_OFF_SEMI_INVULNERABLE_HIDE_LEAD))
          : transition.frames;
      const pause = (minimumFrames: number) => Object.freeze({
        type: "move-animation" as const,
        ...(sceneOffNoAnimations ? {} : { actionTransition: true as const }),
        eventSequence: event.sequence,
        battler,
        timing: Object.freeze({ minimumFrames }),
      });
      if (pauseBefore > 0) commands.push(pause(pauseBefore));
      commands.push(Object.freeze({
        type: "sprite-visibility",
        eventSequence: event.sequence,
        battler,
        visible: !payload.invisible,
        // Each of BtlController_EmitReturnMonToBall/EmitSpriteInvisibility is
        // one controller callback; the receipt itself owns the relative
        // display edge. The forced removal holds until `switchinanim`.
        timing: Object.freeze({
          minimumFrames: forcedRemoval ? removalGap : lossRecall ? LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES : 1 as const,
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
      if (transition !== null && hideAtReceipt && transition.frames - pauseBefore > 0) commands.push(pause(transition.frames - pauseBefore));
      if (winTail !== null && winTail.after > 0) commands.push(pause(winTail.after));
      continue;
    }
    if (payload.kind === "faint-animation") {
      const battler = singlesBattler(payload.battler, "faint animation");
      if (!zeroHpBattlers.has(battler)) {
        throw new Error(
          `battle resolution faint animation for battler ${battler} has no zero-HP event`,
        );
      }
      const leadFrames = FAINT_SCRIPT_LEAD_FRAMES + faintScriptPreCryFrames(events, index, commands);
      const timing: BattleFaintTiming = battler === 1
        ? (() => {
            const steps = 8 - Math.floor(fieldArt.opponent.coords.yOffset / 8);
            const healthboxVanishFrame = 2 * steps + 3;
            return Object.freeze({
              minimumFrames: leadFrames + healthboxVanishFrame + 2,
              sink: "opponent-tile-rows" as const,
              steps,
              leadFrames,
              healthboxVanishFrame,
            });
          })()
        : (() => {
            const spriteRows = fieldArt.player.picGeometry.rows * 8;
            // PlayerHandleFaintAnimation: sSpeedY 5 per frame from the sprite's y (GetBattlerSpriteDefault_Y = 80 + the back pic
            // y_offset, battle_anim_mons.c:112-170, :269-292) until FreeMonSpriteAfterFaintAnim sees y + y2 > DISPLAY_HEIGHT (160)
            // and frees it with the healthbox: floor((80 - y_offset) / 5) + 1 callback frames, + 1 controller-completion row
            // (ROM dofaintanimation busy rows: ABRA 15, PRIMEAPE 16; an offset-0 sprite gives the previous 18).
            const healthboxVanishFrame = Math.floor((80 - fieldArt.player.coords.yOffset) / 5) + 2;
            return Object.freeze({
              minimumFrames: leadFrames + healthboxVanishFrame + 2,
              sink: "player-pixel-rows" as const,
              pixelsPerFrame: 5 as const,
              spriteRows,
              leadFrames,
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
        timing: payload.kind === "draw-party-status-summary"
          ? battler === 0
            ? PARTY_SUMMARY_DRAW_TIMING
            : opponentPartySummaryDrawTiming(lastFaintBattler === 1, event.provenance?.sourceLabel === "BattleScript_DoSwitchOut", (() => {
              const work = lastFaintBattler === 1 ? faintReplacementChoiceWork(beforeRules, currentField, events, index) : null;
              return work === null ? 0 : aiReplacementChoiceExtraFrames(work);
            })(), commands[commands.length - 1]?.type === "hp" && commands[commands.length - 1]!.timing === SHELL_BELL_HP_TIMING)
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
      liveHp[battler] = incoming.field.hp;
      const sceneOn = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0;
      const speciesTail = battler === 1 && sceneOn;
      const forcedPlayer = battler === 0 && forcedDraggedOut.has(0);
      forcedDraggedOut.delete(battler);
      const sendInLabel = event.provenance?.sourceLabel;
      const faintReplacement = battler === 1 && sendInLabel === "BattleScript_FaintedMonSendOutNew";
      const aiSwitchLead = battler === 1 && (sendInLabel === "BattleScript_DoSwitchOut" || faintReplacement) ? AI_SWITCH_SEND_IN_LEAD_FRAMES : 0;
      const sendIn: Extract<BattleResolutionPresentationCommand, { type: "switch-in" }> = Object.freeze({
        type: "switch-in" as const,
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
        } : battler === 0 && incoming.field.species === SEND_IN_TAIL_CASTFORM ? {
          // vis243a: a voluntary CASTFORM send-in runs one frame late as a whole (the forced path's CASTFORM shift, ball at elapsed 4).
          healthboxSlideElapsed: MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED + 1,
          sendInVisualDelay: 1,
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
            const lag = faintReplacement ? null : sceneOffOpponentSwitchInLagElapsed(incoming.field.species, incoming.field.name);
            return lag === null ? {} : { sendInLagElapsed: lag };
          })(),
        } : {}),
      });
      commands.push(aiSwitchLead === 0 ? sendIn : Object.freeze({
        ...sendIn,
        aiSwitch: true as const,
        timing: Object.freeze({ ...sendIn.timing, minimumFrames: sendIn.timing.minimumFrames + aiSwitchLead }),
        sendInVisualDelay: (sendIn.sendInVisualDelay ?? 0) + aiSwitchLead,
        healthboxSlideElapsed: (sendIn.healthboxSlideElapsed ?? 0) + aiSwitchLead,
        ...(sendIn.sendInLagElapsed === undefined ? {} : { sendInLagElapsed: sendIn.sendInLagElapsed + aiSwitchLead }),
      }));
      if (battler === 0 && sendInLabel === "BattleScript_FaintedMonSendOutNew") playerSendInEnd = commands.length;
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
    ...substituteFades.map((fade) => ({ at: fade.at, sequence: fade.sequence, fade, statsChange: null, heldItem: null })),
    ...statsChanges.map((statsChange) => ({ at: statsChange.at, sequence: statsChange.sequence, fade: null, statsChange, heldItem: null })),
    ...heldItemEffects.map((heldItem) => ({ at: heldItem.at, sequence: heldItem.sequence, fade: null, statsChange: null, heldItem })),
  ].sort((a, b) => a.at - b.at || a.sequence - b.sequence);
  if (inserts.length !== 0) {
    const ordered: BattleResolutionPresentationCommand[] = [];
    let next = 0;
    for (let index = 0; index <= commands.length; index += 1) {
      for (; next < inserts.length && inserts[next]!.at === index; next += 1) {
        const { fade, statsChange, heldItem } = inserts[next]!;
        if (heldItem !== null) {
          const atStart = battleResolutionFieldBeforeCommand(field, ordered, ordered.length);
          if ((heldItem.battler === 0 ? atStart.player : atStart.opponent).substituteDoll !== true) {
            const statusBefore = ordered[ordered.length - 1];
            const presented = heldItem.afterStatus && statusBefore?.type === "status" ? statusBefore.timing.minimumFrames : 0;
            ordered.push(Object.freeze({
              type: "general-animation" as const, eventSequence: heldItem.sequence, battler: heldItem.battler,
              animation: heldItem.animation,
              ...(heldItem.trapMove === undefined ? {} : { trapMove: heldItem.trapMove }),
              timing: (heldItem.animation === "HELD_ITEM_EFFECT" ? (t: Record<string, number>) => t : Object.freeze)({
                minimumFrames: heldItem.frames - presented + (presented > 0 ? HELD_ITEM_EFFECT_AFTER_STATUS_EXTRA_FRAMES : 0),
                ...(heldItem.seGate === undefined ? {} : { seGateFrames: heldItem.seGate }),
              }),
            }));
          }
        } else if (fade !== null) {
          ordered.push(Object.freeze({
            type: "substitute-fade" as const, eventSequence: fade.sequence, battler: fade.battler,
            timing: Object.freeze({ minimumFrames: substituteFadeCommandRows(fade.battler === 0 ? "player" : "opponent") }),
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
  for (let index = 1; index < commands.length - 1; index += 1) {
    const command = commands[index]!;
    if (command.type !== "stat") continue;
    const rows = statBetweenPrintsFrames(events, commands[index - 1]!, command, commands[index + 1]!);
    if (rows > command.timing.minimumFrames) {
      commands[index] = Object.freeze({ ...command, timing: Object.freeze({ minimumFrames: rows }) });
    }
  }
  applyDraggedOutEntryScriptLead(events, commands, (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0);
  const entryScriptEndsSegment = applyMidBattleEntryScriptBlocks(events, commands);
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
  // swt1: after an opponent faint replacement / AI switch the script's next print (the poison / burn tick, the weather line, the move's
  // "used" text) sits 12 rows after the `waitstate` release (`FaintedMonSendOutNew+0x10` -> `FaintedMonEnd` +5 -> next label +11 -> glyph +12);
  // the next command otherwise starts 3 rows after it.
  commands.forEach((command, index) => {
    if (command.type === "switch-in" && command.battler === 1 && command.aiSwitch === true && command.entryScriptHoldFrames === undefined
      && index + 1 < commands.length && commands[index + 1]!.type !== "turn-end") {
      commands[index] = Object.freeze({ ...command, settleHoldFrames: (command.settleHoldFrames ?? 0) + OPPONENT_SEND_IN_NEXT_PRINT_FRAMES });
    }
  });
  if (!commands.some(
    (command) => command.type === "message" && command.advance === "button" && command.promptGate !== true,
  )) {
    const lastHp = commands[commands.length - 1];
    const baseTurnEnd = lastHp?.type === "hp" && lastHp.timing === SHELL_BELL_HP_TIMING ? SHELL_BELL_TURN_END_TIMING
      : turnEndTimingAfterRelease(commands, events);
    commands.push(Object.freeze({
      type: "turn-end",
      timing: sceneOffMissTurnEnd(commands, events, beforeRules) ? Object.freeze({ minimumFrames: baseTurnEnd.minimumFrames + SCENE_OFF_MISS_TURN_END_ROWS }) : baseTurnEnd,
    }));
  }
  const finalCommand = commands[commands.length - 1];
  if (entryScriptEndsSegment === 0 && finalCommand?.type === "turn-end") {
    commands[commands.length - 1] = Object.freeze({ ...finalCommand, timing: Object.freeze({ ...finalCommand.timing, minimumFrames: finalCommand.timing.minimumFrames - ENTRY_SCRIPT_PLAYER_TURN_END_TRIM_FRAMES }) });
  }
  applyHpHitTails(commands, hpLeadRows);
  return Object.freeze(commands);
}

/**
 * contain213 (presentationContainment.ts "commands"): a resolution segment's presentation commands. A throw while projecting the
 * kernel receipt presents the span as containedResolutionSegmentCommands instead (the kernel's outcome is already decided).
 */
function projectResolutionSegmentCommands(
  events: readonly BattleKernelSemanticEvent[],
  beforeRules: BattleScriptRulesContext,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  field: BattleResolutionDisplayedField,
  opponentTrainer: BattleResolutionOpponentTrainer | null,
  usedMessageHoldFrames: number,
  requestId: number,
): readonly BattleResolutionPresentationCommand[] {
  try {
    return projectBattleResolutionCommands(
      events,
      beforeRules,
      transition.state.rules.rulesContext,
      field,
      fieldAfter(transition),
      opponentTrainer,
      usedMessageHoldFrames,
    );
  } catch (error) {
    let contained: readonly BattleResolutionPresentationCommand[];
    try {
      contained = containedResolutionSegmentCommands(events, beforeRules, transition.state.rules.rulesContext, field, opponentTrainer);
    } catch {
      throw error;
    }
    recordContainedPresentationError("commands", "segment", error,
      `request ${requestId} events ${events[0]?.sequence ?? "-"}..${events.at(-1)?.sequence ?? "-"}`);
    return contained;
  }
}

/**
 * contain213: the minimal command list of a span whose projection threw -- per active battler, its send-in message and typed
 * switch-in when the receipt changed its party slot (the display ledger and the forced send-out require both), else its HP bar /
 * status icon moved to the kernel's endpoint; then a turn-end, which settles the display ledger to the rules boundary.
 */
function containedResolutionSegmentCommands(
  events: readonly BattleKernelSemanticEvent[],
  beforeRules: BattleScriptRulesContext,
  afterRules: BattleScriptRulesContext,
  field: BattleResolutionDisplayedField,
  opponentTrainer: BattleResolutionOpponentTrainer | null,
): readonly BattleResolutionPresentationCommand[] {
  const settled = createBattleCommandDisplayedField(afterRules);
  const sceneOn = (beforeRules.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0;
  const eventSequence = events.at(-1)?.sequence ?? 0;
  const commands: BattleResolutionPresentationCommand[] = [];
  for (const battler of [0, 1] as const) {
    const before = battler === 0 ? field.player : field.opponent;
    const after = battler === 0 ? settled.player : settled.opponent;
    const active = afterRules.battlers[battler]!;
    if (before.partyIndex !== after.partyIndex) {
      commands.push(Object.freeze({
        type: "message", eventSequence,
        lines: Object.freeze(battler === 0 || opponentTrainer === null
          ? [`Go! ${after.name}!`]
          : [`${opponentTrainer.className} ${opponentTrainer.name} sent`, `out ${after.name}!`]),
        advance: "automatic", noCursor: false, timing: SWITCH_IN_MESSAGE_TIMING,
      }));
      commands.push(Object.freeze({
        type: "switch-in", eventSequence, battler,
        fromPartyIndex: before.partyIndex, toPartyIndex: after.partyIndex,
        incoming: after, incomingStatus1: active.status1,
        timing: switchInTiming(battler, after.species, sceneOn, after.name, false, after.personality),
        settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES,
      }));
      continue;
    }
    if (before.hp !== after.hp) {
      commands.push(Object.freeze({
        type: "hp", eventSequence, battler, from: before.hp, to: after.hp, healthValue: before.hp - after.hp, timing: HP_TIMING,
      }));
    }
    if (before.status !== after.status) {
      commands.push(Object.freeze({
        type: "status-icon", eventSequence, battler, status1: active.status1, status2: active.status2, timing: STATUS_ICON_TIMING,
      }));
    }
  }
  commands.push(Object.freeze({ type: "turn-end", timing: TURN_END_TIMING }));
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
  const playerEvents = input.sourceDecision.kind === "switch"
    ? withSynthesizedSwitchRecallEvents(input.transition.events, field, input.opponentHpOnSwitchout ?? field.opponent.maxHP)
    : input.transition.events;
  const events = input.opponentTrainer === undefined || input.opponentTrainer === null
    ? playerEvents
    : withSynthesizedAiSwitchRecallEvents(playerEvents);
  const segment = Object.freeze({
    field,
    beforeRules: input.beforeRules,
    afterRules: input.transition.state.rules,
    events,
    commands: projectResolutionSegmentCommands(
      events,
      input.beforeRules.rulesContext,
      input.transition,
      field,
      input.opponentTrainer ?? null,
      input.usedMessageHoldFrames ?? 0,
      input.sourceRequest.requestId,
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
          ...(input.confirmHandoff!.forced === "encore"
            ? { forced: Object.freeze({ kind: "encore" as const }) }
            : input.confirmHandoff!.forced === "struggle"
              ? {
                forced: (() => {
                  const holdTotal = (input.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0 ? NO_MOVES_DISMISS_HOLD_OFF_FRAMES : NO_MOVES_DISMISS_HOLD_FRAMES;
                  return Object.freeze({ kind: "struggle" as const, holdRemaining: holdTotal, holdTotal, waitCursorAge: input.confirmHandoff!.forcedWaitCursorAge ?? 0 });
                })(),
              }
              : {}),
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
 * pic9: Cmd_hpthresholds2 (battle_script_commands.c:6286-6306), the hpScale of STRINGID_RETURNMON's player branch
 * (battle_message.c:2081-2090: 0 "that's enough!", 1 "come back!", 2 "OK!", 3 "good!"). `hpSwitchout` is a u8 local, so the stored
 * HP is truncated to its low 8 bits (a foe above 255 HP compares against hp & 0xFF), as on the ROM.
 */
export function returnMonHpScale(opponentHpOnSwitchout: number, opponentHp: number): 0 | 1 | 2 | 3 {
  const hpSwitchout = opponentHpOnSwitchout & 0xff;
  if (opponentHp >= hpSwitchout) return 0;
  const result = Math.trunc(((hpSwitchout - opponentHp) * 100) / hpSwitchout);
  return result <= 29 ? 1 : result <= 69 ? 2 : 3;
}

/**
 * pic9: Cmd_hpthresholds (battle_script_commands.c:6258-6283), the hpScale of STRINGID_SWITCHINMON's player branch
 * (battle_message.c:2100-2110: 0 "Go! X!", 1 "Do it! X!", 2 "Go for it, X!", 3 "Your foe's weak! Get 'em, X!") from the opposing
 * battler's current HP percent; a fainted foe reads 0.
 */
export function switchInMonHpScale(opponentHp: number, opponentMaxHp: number): 0 | 1 | 2 | 3 {
  let result = Math.trunc((opponentHp * 100) / opponentMaxHp);
  if (result === 0) result = 1;
  if (result > 69 || opponentHp === 0) return 0;
  return result > 39 ? 1 : result > 9 ? 2 : 3;
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
  opponentHpOnSwitchout: number,
): readonly BattleKernelSemanticEvent[] {
  // pic9: BattleScript_ActionSwitch runs `hpthresholds2 BS_ATTACKER` before STRINGID_RETURNMON, which scales the damage dealt to the
  // OPPOSING battler since its hpOnSwitchout (the switch runs first in the turn, so the foe's HP is the turn's start HP). It used to
  // read the outgoing mon's own HP: Kyle's MAGBY said "OK! Come back!" where the ROM said "good! Come back!".
  const hpScale = returnMonHpScale(opponentHpOnSwitchout, field.opponent.hp);
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

/**
 * ais1: the opponent's AI mid-battle switch is the same `BattleScript_ActionSwitch` prelude the kernel skips for either side
 * (`runVoluntarySwitchAction` begins at the Pursuit loop), so its first receipt is BattleScript_DoSwitchOut's summary draw. The
 * ROM prints STRINGID_RETURNMON ("<TRAINER> withdrew <MON>!") and runs `returnatktoball` (`OpponentHandleReturnMonToBall` ->
 * `DoSwitchOutAnimation`, B_ANIM_SWITCH_OUT_OPPONENT_MON, the same 32-frame span as the player's) before that draw: both receipts are
 * synthesized ahead of the summary exactly as the player's are (negative sequences, their own dispatcher so the Focus Punch
 * pre-pass / menu-SE terms keyed on the player's voluntary switch do not move). A switch after a move body in the segment
 * (Pursuit's interception) is left as the kernel emits it.
 */
function withSynthesizedAiSwitchRecallEvents(
  events: readonly BattleKernelSemanticEvent[],
): readonly BattleKernelSemanticEvent[] {
  const summaryAt = events.findIndex((event, index) =>
    event.payload.kind === "draw-party-status-summary" && event.payload.battler === 1
    && event.provenance?.sourceLabel === "BattleScript_DoSwitchOut"
    && !events.slice(0, index).some(({ payload }) =>
      (payload.kind === "animation" && payload.animationId === "MOVE_ANIMATION")
      || (payload.kind === "set-battler-sprite-visibility" && payload.battler === 1 && payload.invisible)));
  if (summaryAt < 0) return events;
  const provenance = (opcodeName: string) => Object.freeze({
    programCounter: -1,
    opcodeId: -1,
    opcodeName,
    dispatcher: SYNTHESIZED_AI_SWITCH_DISPATCHER,
    sourceLabel: "BattleScript_ActionSwitch",
    sourceStatementLine: -1,
    instructionExecution: -1,
  });
  return Object.freeze([
    ...events.slice(0, summaryAt),
    Object.freeze({
      sequence: -4,
      payload: Object.freeze({
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: Object.freeze([]),
        introBattler: 1 as const,
      }),
      provenance: provenance("B_SCR_OP_PRINTSTRING"),
    }),
    Object.freeze({
      sequence: -3,
      payload: Object.freeze({ kind: "set-battler-sprite-visibility", battler: 1 as const, invisible: true }),
      provenance: provenance("B_SCR_OP_RETURNATKTOBALL"),
    }),
    ...events.slice(summaryAt),
  ]);
}

/**
 * hcr1 / hcr1b / hcr2 (docs/aud251-s11-scoreboard-refresh.md): a plain `use-move` turn's first used-move print (`attackstring`) is the ROM
 * `printstring` row at commit + 6 + u, u = the USEDMOVE print's `instructionExecution` (commands from the effect-script entry: `setmoveeffect` /
 * `goto` / `jumpifnotmove` / `incrementgamestat` are one frame each before `attackcanceler`, `accuracycheck`, `attackstring`); the oracle swaps
 * the text box one frame later, so the first glyph is at commit + 7 + u (hcr1b Scene OFF and hcr2 Scene ON pixel traces, u = 2 / 3 / 4 / 6 / 8,
 * exact). The fixed stage walk puts it at commit + 9, exact for u = 2; the adjustment is `u - 2` (a hold on `action-dispatch`), the same in both scenes.
 * The ROM plays the script-row sounds ahead of the frame the pixels reach them (the hcr2 labs / ROM sound log, ROM - engine with the hold only):
 * hit / effectiveness SE, faint cry and SE_FAINT one tick early at every u (hcr2b: both scenes); a Scene ON move body's table SEs min(u - 2, 2) ticks early
 * (hcr2c: the hold's own frames, capped at 2; the table clock is calibrated at a script lead of 7, so a body whose kernel lead L >= 4 is presented with
 * its own lead takes 7 - L instead: L = 5 -> 2, Seismic Toss 6 -> 1, Counter 4 -> 3, Dragon Rage 9 -> -2 at every u; the LSE2 / LEAD4 "S" bodies already carry that
 * difference in their sound-age shift and keep the cap); Scene OFF
 * stamps its stats-change / general-animation sounds one early as well (hcr1b). Scene ON's stat-change SEs (aud248 labs, T2 mass 25,108 -> 25,090) and Double Team stat SE
 * (34 frames after the body's last SE, aud252) take the body's lead; its general-animation sounds get none (a one-tick lead was worse). The lead is captured
 * per scheduled sound (`setSoundTickLead`), so battle-end, send-in and tray sounds keep their frames and the T1 census reads the emission tick back.
 * Forced (Encore / Struggle) and Focus Punch pre-pass handoffs keep their own leads; a turn that opens with anything but a USEDMOVE
 * print (status / ability / wake-up / confusion head) is not covered.
 */
const USED_MOVE_LEAD_MIN_U = 2;
const USED_MOVE_LEAD_MAX_U = 20;
const USED_MOVE_SOUND_LEAD = 1;
const USED_MOVE_ANIM_SOUND_LEAD_SCENE_ON = 2;
const PLAIN_BODY_SOUND_LEAD_MIN_L = 4;
const MOVE_BODY_SOUND_CLOCK_LEAD = 7;
/**
 * ohr1 (Scene OFF; ROM s499 d23 / s7295 / s830, the hse1m "pre-move head" windows): the pre-move head prints that attackcanceler jumps to
 * (MoveUsedIsConfused / ConfusedNoMore / InLove, kernel u = 2 .. 5) are `printstring` rows at commit + 6 + u like the used print, so
 * a head after a longer effect entry (SpeedDownHit u = 6, plain print row 12; confusion u = 5, ROM print row 11) starts u - 2 frames after the
 * stage walk's commit + 9, not on it. Asleep (walk ends on `before-turn`) and the wake-up (status command first) keep their own rules.
 */
const OFF_HEAD_PRINT_LABELS: ReadonlySet<string> = new Set([CONFUSION_HEAD_SCRIPT, CONFUSION_NO_MORE_HEAD_SCRIPT, IN_LOVE_HEAD_SCRIPT]);
function usedMovePrintLeadU(state: BattleResolutionPresentationState, handoff: BattleResolutionConfirmHandoff): number | null {
  if (handoff.forced !== undefined || handoff.focusPunchPrePass === true) return null;
  // chg1's continuation segment and charge-turn box were measured in Scene OFF only (pixel labs); Scene ON keeps hcr2's first-segment USEDMOVE rule.
  const sceneOff = sceneOffOf(state);
  const segment = sceneOff || state.segmentIndex > 0 ? state.segments[state.segmentIndex] : state.segments[0];
  if (segment === undefined || state.sourceDecision.kind !== "use-move") return null;
  // sbm1: Solar Beam in sun runs SolarBeamOnFirstTurn's `ppreduce` before the used print (kernel u = 16), so the print is the first message, not the first event.
  const first = segment.events.find((event) => event.payload.kind !== "set-battler-pp-data");
  if (first === undefined || first.payload.kind !== "message") return null;
  const chargeBox = sceneOff && first.payload.messageId === "STRINGID_EMPTYSTRING3" && first.provenance?.sourceLabel === CHARGE_TURN_SCRIPT;
  const head = sceneOff && OFF_HEAD_PRINT_LABELS.has(first.provenance?.sourceLabel ?? "");
  if (first.payload.messageId !== "STRINGID_USEDMOVE" && !chargeBox && !head) return null;
  const u = first.provenance?.instructionExecution;
  return u === undefined || u < USED_MOVE_LEAD_MIN_U || u > USED_MOVE_LEAD_MAX_U ? null : u;
}
/**
 * gsp3 (ROM lab bdt1-rest3-player-on, Scene ON; T2 windows): a plain `use-move` turn whose first action is asleep (the sleep counter's status write, then
 * BattleScript_MoveUsedIsAsleep's "is fast asleep!" print) prints on the attackcanceler's row + 1: ROM label row 2072 against the engine's 2075, so the
 * statusanimation / SE 197 and the next action ran 3 rows late. attackcanceler jumps out before the dispatch / accuracy rows the walk holds
 * (`action-dispatch`, `attack-canceler`, `accuracy-check`), so the walk ends at `before-turn`.
 */
function turnOpensWithAsleepPrint(state: BattleResolutionPresentationState): boolean {
  if (state.sourceDecision?.kind !== "use-move") return false;
  const events = state.segments[0]?.events;
  if (events === undefined) return false;
  const first = events.find((event) => event.payload.kind !== "set-battler-status-data");
  return first?.payload.kind === "message" && first.payload.messageId === "STRINGID_PKMNFASTASLEEP";
}
function sceneOffOf(state: BattleResolutionPresentationState): boolean {
  return ((state.segments[0]?.beforeRules.rulesContext.hitMarker ?? 0) & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0;
}
function usedMoveSoundLeadsOf(state: BattleResolutionPresentationState, u: number): Readonly<{ hit: number; script: number; anim: number }> {
  return sceneOffOf(state)
    ? { hit: USED_MOVE_SOUND_LEAD, script: USED_MOVE_SOUND_LEAD, anim: USED_MOVE_SOUND_LEAD }
    : { hit: USED_MOVE_SOUND_LEAD, script: 0, anim: Math.min(u - USED_MOVE_LEAD_MIN_U, USED_MOVE_ANIM_SOUND_LEAD_SCENE_ON) };
}
export function usedMoveBodySoundLeadOf(state: BattleResolutionPresentationState): number {
  // mvs1 x hcr1b (merge of the box's 2026-11-20 run with the Mac's 11-21 fixes): Scene OFF plays move-body SEs only for Transform and Substitute
  // (Cmd_attackanimation's HITMARKER_NO_ANIMATIONS exception), on mvs1's script clock (`moveAnimationScriptStartRow`), whose + 4 was fitted to the ROM's SE log
  // on a print that is pixel-exact (u = 2), so the one-tick Scene OFF lead of a ruled turn would count the pixel -> script-row tick twice. ROM: the
  // mvs1-transform-{player,opp}-off labs (SE_M_TELEPORT / SE_M_MINIMIZE 61 / 109, 65 / 113: the lead put them at 60 / 108, 64 / 112) and fcm1 s36-off-ws
  // METRONOME -> SUBSTITUTE (SE_M_ATTRACT on command row 8; the lead stamped it on row 7). The stat-change / Double Team / hit / general leads stay.
  if (sceneOffOf(state)) return 0;
  const u = state.usedMovePrintU;
  if (u === undefined) return state.usedMoveAnimSoundLead ?? 0;
  const base = Math.min(u - USED_MOVE_LEAD_MIN_U, USED_MOVE_ANIM_SOUND_LEAD_SCENE_ON);
  const commands = state.segments[state.segmentIndex]?.commands ?? [];
  const command = commands[state.commandIndex];
  if (command?.type !== "move-animation" || command.animation === undefined) return base;
  const lead = command.timing.bodyLeadFrames ?? 0;
  // b4l: a c-lead body presents its lead for real, so the sound clock follows it (`lse2BodySoundAgeShift`, L - 7) and the 7 - L tick lead is dropped.
  if (C_LEAD_WINDOW_ADJUST.has(command.animation.moveId)) return 0;
  if (lead < PLAIN_BODY_SOUND_LEAD_MIN_L || lse2BodySoundAgeShift(command.animation.moveId, lead) !== 0) return base;
  return MOVE_BODY_SOUND_CLOCK_LEAD - lead;
}
function usedMovePrintLeadAdjust(state: BattleResolutionPresentationState, handoff: BattleResolutionConfirmHandoff): number {
  const u = usedMovePrintLeadU(state, handoff);
  return u === null ? 0 : u - 2;
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
  if (handoff.forced?.kind === "struggle" && handoff.forced.holdRemaining > 0) {
    // enc276: the dismissed no-moves box stays up while the ROM finishes `BattleScript_NoMovesLeft` (measured +19 to the first
    // used-move glyph where an Encore/ordinary confirm needs +10); the idle bounce keeps running until the walk's own stop.
    return Object.freeze({
      ...state,
      lifecycle: Object.freeze({
        phase: "confirm-handoff" as const,
        phaseElapsed: 0,
      }),
      confirmHandoff: Object.freeze({
        ...handoff,
        bounceReset: handoff.bounceReset || handoff.forced.holdTotal - (handoff.forced.holdRemaining - 1) >= NO_MOVES_BOUNCE_STOP_AFTER,
        forced: Object.freeze({ kind: "struggle" as const, holdRemaining: handoff.forced.holdRemaining - 1, holdTotal: handoff.forced.holdTotal, waitCursorAge: handoff.forced.waitCursorAge }),
        idleBounceElapsed: handoff.idleBounceElapsed + 1,
      }),
      fadeTick: state.fadeTick + 1,
    });
  }
  if (handoff.stage === "action-dispatch") {
    const hold = handoff.usedMoveLeadHold ?? Math.max(0, usedMovePrintLeadAdjust(state, handoff));
    if (hold > 0) {
      return Object.freeze({
        ...state,
        lifecycle: Object.freeze({ phase: "confirm-handoff" as const, phaseElapsed: 0 }),
        confirmHandoff: Object.freeze({ ...handoff, usedMoveLeadHold: hold - 1 }),
        fadeTick: state.fadeTick + 1,
      });
    }
  }
  const nextStage = handoff.focusPunchPrePass === true && handoff.stage === "stop-bounce-request"
    ? null
    : handoff.stage === "before-turn" && handoff.forced === undefined && turnOpensWithAsleepPrint(state)
      ? null
      : CONFIRM_HANDOFF_NEXT[handoff.stage];
  if (nextStage === null) {
    const printU = usedMovePrintLeadU(state, handoff);
    const lead = printU === null ? { hit: 0, script: 0, anim: 0 } : usedMoveSoundLeadsOf(state, printU);
    return Object.freeze({
      ...state,
      lifecycle: Object.freeze({
        phase: "presenting" as const,
        phaseElapsed: 0,
      }),
      confirmHandoff: null,
      fadeTick: state.fadeTick + 1,
      ...(lead.hit > 0 ? { usedMoveSoundLead: lead.hit } : {}),
      ...(lead.script > 0 ? { usedMoveScriptSoundLead: lead.script } : {}),
      ...(lead.anim > 0 ? { usedMoveAnimSoundLead: lead.anim } : {}),
      ...(printU !== null && !sceneOffOf(state) ? { usedMovePrintU: printU } : {}),
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
  /**
   * flow1: the player's own decision at the intervening command. A voluntary switch is presented as a fresh switch resolution's is
   * (the recall line, the return to the ball, the party-menu close hold); absent or a move = the segment as the kernel emits it.
   */
  sourceDecision?: BattleCommandDecision;
  /** flow1: as `CreateBattleResolutionPresentationInput.opponentHpOnSwitchout`, for the switch's "Come back!" line. */
  opponentHpOnSwitchout?: number;
  /** chg1: the player's confirmed move at the intervening command (the walk a Scene OFF continuation runs before the locked action's first print). */
  confirmHandoff?: Readonly<{ fightDisplayCursor: 0 | 1 | 2 | 3; idleBounceElapsed: number }>;
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
  events: readonly BattleKernelSemanticEvent[] = transition.events,
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
    events,
    commands: projectResolutionSegmentCommands(
      events,
      resolution.pendingBattle.rules.rulesContext,
      transition,
      fieldBoundary,
      resolution.opponentTrainer,
      0,
      resolution.resolutionId.requestId,
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
 * bbk1 item 3 (chg4's narrowed rule): a Scene ON continuation after the opponent's locked action whose first print is the player's own plain hit
 * (not the locked battler's unleash, no miss) runs the confirm walk as OFF's does: ROM Ice Beam printstring at commit + 12 (s830 d1).
 */
function sceneOnPlainHitContinuation(events: readonly BattleKernelSemanticEvent[], lockedAction: BattleResolutionLockedActionIdentity): boolean {
  const first = events[0];
  if (first === undefined || first.payload.kind !== "message" || first.payload.messageId !== "STRINGID_USEDMOVE") return false;
  const attacker = first.payload.actionSnapshot?.attacker;
  if (attacker === undefined || attacker === lockedAction.battler) return false;
  if (events.some(({ payload }) => payload.kind === "message" && (payload.messageId === "STRINGID_ATTACKMISSED" || payload.messageId === "STRINGID_PKMNAVOIDEDATTACK"))) return false;
  const nextUsed = events.findIndex((event, index) => index > 0 && event.payload.kind === "message" && event.payload.messageId === "STRINGID_USEDMOVE");
  return events.slice(0, nextUsed < 0 ? events.length : nextUsed).some(({ payload }) => payload.kind === "hp-change" && payload.battler === 1 - attacker);
}

/**
 * chg1: the player's locked action (no command menu) unleashing in Scene OFF: the app's turn start stands for a first print on row
 * `TURN_START_PRINT_BASE_U` (as a wake-up print's), so a first print on a later row u waits u - 3 frames more (ROM probes, Dig / Fly / ...).
 */
function lockedTurnPrintLead(segment: BattleResolutionSegment): BattleResolutionPresentationCommand | null {
  if ((segment.beforeRules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) === 0) return null;
  const first = segment.events[0];
  if (first === undefined || first.payload.kind !== "message" || first.payload.messageId !== "STRINGID_USEDMOVE") return null;
  const u = first.provenance?.instructionExecution;
  if (u === undefined || u <= TURN_START_PRINT_BASE_U || u > USED_MOVE_LEAD_MAX_U) return null;
  return Object.freeze({
    type: "move-animation" as const,
    eventSequence: first.sequence,
    battler: 0 as const,
    timing: Object.freeze({ minimumFrames: u - TURN_START_PRINT_BASE_U }),
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
  // flow1: the trainer's command here can be a voluntary switch (seed 18: the player's AZUMARILL underground after Dig, the AI
  // switches to BAYLEEF). The ROM runs BattleScript_ActionSwitch's prelude for it ("<TRAINER> withdrew <MON>!" and the recall,
  // SE_BALL_OPEN) as for any AI switch; the kernel skips it and only the fresh resolution re-made it.
  const baseSegment = appendResolutionSegment(
    resolution,
    transition,
    fieldBoundary,
    resolution.opponentTrainer === null ? transition.events : withSynthesizedAiSwitchRecallEvents(transition.events),
  );
  const lead = lockedTurnPrintLead(baseSegment);
  const segment = lead === null ? baseSegment : Object.freeze({ ...baseSegment, commands: Object.freeze([lead, ...baseSegment.commands]) });
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
  // flow1: the player switching while the foe is locked into a two-turn move (Dig, Fly, Bide, Thrash, recharge, ...) runs the
  // same BattleScript_ActionSwitch prelude on the ROM as any voluntary switch (hpthresholds2, STRINGID_RETURNMON, returnatktoball:
  // "GROWLITHE, that's enough! Come back!", the recall and its SE_BALL_OPEN). The kernel skips that prelude for presentation to
  // re-make (withSynthesizedSwitchRecallEvents), which only the fresh resolution did: this segment started at "Go! VOLBEAT!". The
  // segment now gets the recall receipts, the switch's own decision and the fresh switch's party-menu close hold + recall clock.
  const switching = input.sourceDecision?.kind === "switch";
  const sceneOffWalk = !switching && input.confirmHandoff !== undefined
    && ((resolution.pendingBattle.rules.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0
      || sceneOnPlainHitContinuation(transition.events, lockedAction));
  const segment = appendResolutionSegment(
    resolution,
    transition,
    fieldBoundary,
    switching
      ? withSynthesizedSwitchRecallEvents(
        transition.events,
        fieldBoundary,
        input.opponentHpOnSwitchout ?? fieldBoundary.opponent.maxHP,
      )
      : transition.events,
  );
  return Object.freeze({
    ...resolution,
    ...(switching
      ? {
        sourceDecision: Object.freeze({ ...input.sourceDecision! }),
        confirmHandoff: null,
        fadeTick: 0,
      }
      : {}),
    segments: Object.freeze([...resolution.segments, segment]),
    segmentIndex: resolution.segments.length,
    commandIndex: 0,
    ...(sceneOffWalk
      ? {
        confirmHandoff: Object.freeze({
          stage: "move-selection-response" as const,
          bounceReset: false,
          fightDisplayCursor: input.confirmHandoff!.fightDisplayCursor,
          idleBounceElapsed: input.confirmHandoff!.idleBounceElapsed,
        }),
      }
      : {}),
    lifecycle: Object.freeze(switching || sceneOffWalk
      ? { phase: "confirm-handoff" as const, phaseElapsed: 0 }
      : { phase: "presenting" as const, phaseElapsed: 0 }),
    field: fieldBoundary,
    pendingBoundary: transition.state.boundary,
    pendingBattle: transition.state,
    forcedRequest: pendingPlayerForcedSwitchRequest(transition.state.boundary),
  });
}

/** Rows the last print stays drawn after its wait and the script's remaining rows (BattleTurnPassed's first rows; measured on the ROM, Trace and Intimidate agree). */
export const ENTRY_SCRIPT_END_HELD_ROWS = 3;
/**
 * pau5: the rows an entry script runs after its print's `waitmessage` before its `end3` (instructions only; the `end3` halts and is not
 * a row): BattleScript_IntimidateActivatesLoopIncrement's addbyte + goto, the loop head's trygetintimidatetarget and the return = 4;
 * BattleScript_TraceActivates goes straight to end3 = 0. They equal the kernel's whole-script rows minus the print's last row and wait
 * (the battle-start scripts: 114 and 98 rows), so a mid-battle block lasts as long as pau4's.
 */
/** pau5: rows of the send-in's post-`switchinanim` hold (SWITCH_IN_WAITSTATE_HOLD_FRAMES) that follow the script instead of preceding it: the script starts 7 rows into the hold and the next action's load (4 rows) comes after its end (ROM probes: the print / stat row is this many frames late otherwise). */
const ENTRY_SCRIPT_SETTLE_OVERLAP_FRAMES = 4;
/** pau5: the opponent's replacement runs its entry script this many rows later than the player's send-in does (ROM probes, a frame-shift scan of all four opponent traces: -12 in both scenes, Intimidate and Trace). */
const ENTRY_SCRIPT_OPPONENT_RELEASE_EXTRA_FRAMES = 12;
/** pau5: an opponent replacement whose entry script ends the turn reaches the action prompt this many rows after pau4's end rows (ROM probes: all four opponent traces, the app's prompt was 8 early). */
const ENTRY_SCRIPT_OPPONENT_TAIL_EXTRA_FRAMES = 8;
/** pau5: a forced player replacement whose entry script ends the turn: the app's turn-end block was this many rows late (ROM probes, both scenes). */
const ENTRY_SCRIPT_PLAYER_TURN_END_TRIM_FRAMES = 5;
const ENTRY_SCRIPT_TRAILING_ROWS: Readonly<Record<string, number>> = Object.freeze({
  BattleScript_IntimidateActivatesLoop: 4,
  BattleScript_TraceActivates: 0,
});
/**
 * msg2 (docs/msg2-roar-wish-messages.md): the rows from a "dragged out!" release to the dragged-in battler's entry script's own
 * start. Fitted on the ROM: the hold after the release is the script's lead + 9 in all three catcher cases (Scene OFF; Intimidate
 * lead 41 -> 50, Trace lead 33 -> 42).
 */
export const DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS = 9;
/**
 * msg2: Roar / Whirlwind's drag-in (BattleScript_TrainerBattleForceOut, battle_scripts_1.s:3334-3341: switchinanim, the "dragged
 * out!" print, switchineffects, then BattleScript_MoveEnd) reaches the dragged-in battler's entry script (Intimidate / Trace) only
 * after the press: the kernel emits moveend's two sprite-visibility receipts first, then the script, whose first event's
 * `instructionExecution` is its leading rows (the pause and the loop set-up), as in pau5. pau5's block needs the send-in directly
 * before the script, so here the script had no lead: "X's INTIMIDATE cuts ..." printed 51 rows and "X TRACED ..." 42 rows after the
 * press too early (fcm1 catcher: s36-off-ws, s89-off-ws, s118-off-wc). A hold of lead + DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS goes
 * before the script (the released print and its frozen cursor stay up, as on the ROM), and the stat row lasts up to the
 * STATS_CHANGE animation as in pau5. The script's closing rows are left as they were (ROM within 2 rows: Intimidate's turn-end 2
 * later, Trace's 2 earlier).
 */
function applyDraggedOutEntryScriptLead(
  events: readonly BattleKernelSemanticEvent[],
  commands: BattleResolutionPresentationCommand[],
  sceneOn: boolean,
): void {
  const inScript = (event: BattleKernelSemanticEvent): boolean =>
    event.provenance !== undefined && event.provenance.sourceLabel in ENTRY_SCRIPT_TRAILING_ROWS;
  const first = events.findIndex(inScript);
  if (first < 0) return;
  const script = events.filter((event) => inScript(event) && event.provenance!.sourceLabel === events[first]!.provenance!.sourceLabel);
  const sequences = new Set(script.map((event) => event.sequence));
  const execution = (sequence: number): number | undefined => script.find((event) => event.sequence === sequence)?.provenance?.instructionExecution;
  const start = commands.findIndex((command) => "eventSequence" in command && sequences.has(command.eventSequence));
  if (start < 1) return;
  let gate = start - 1;
  while (gate > 0 && commands[gate]!.type === "sprite-visibility") gate -= 1;
  const printed = commands[gate];
  if (printed?.type !== "message" || printed.promptGate !== true || commands[gate - 1]?.type !== "switch-in") return;
  const payload = events.find((event) => event.sequence === printed.eventSequence)?.payload;
  if (payload?.kind !== "message" || payload.messageId !== "STRINGID_PKMNWASDRAGGEDOUT") return;
  const firstCommand = commands[start] as { eventSequence: number };
  const lead = execution(firstCommand.eventSequence);
  if (lead === undefined) return;
  for (let index = start; index + 1 < commands.length; index += 1) {
    const command = commands[index]!;
    if (!("eventSequence" in command) || !sequences.has(command.eventSequence)) break;
    const following = commands[index + 1]!;
    if (command.type === "stat" && following.type === "stats-change") {
      const from = execution(command.eventSequence);
      const to = execution(following.eventSequence);
      if (from !== undefined && to !== undefined && to - from > command.timing.minimumFrames) {
        commands[index] = Object.freeze({ ...command, timing: Object.freeze({ ...command.timing, minimumFrames: to - from }) });
      }
    }
  }
  const switchIn = commands[gate - 1] as Extract<BattleResolutionPresentationCommand, { type: "switch-in" }>;
  commands.splice(start, 0, Object.freeze({
    type: "move-animation",
    ...(sceneOn ? { actionTransition: true as const } : {}),
    eventSequence: firstCommand.eventSequence,
    battler: switchIn.battler,
    timing: Object.freeze({ minimumFrames: lead + DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS }),
  }));
}
/**
 * pau5 (docs/pau1-script-pauses.md "pau5"): a mid-battle switch-in whose ability runs an entry script (Intimidate / Trace; a faint
 * replacement, a voluntary switch or the opponent's replacement). The script's rows count from its own start exactly like the
 * battle-start scripts (pau4): the first event's `instructionExecution` is the leading rows (`pause B_WAIT_TIME_SHORT` and the loop
 * set-up) that the "Go! X!" box stays up for, the stat row lasts up to the STATS_CHANGE animation, and the last print holds
 * through its wait and the script's closing rows. A battle-start script has no switch-in command before it (pau4 times that one).
 */
function applyMidBattleEntryScriptBlocks(
  events: readonly BattleKernelSemanticEvent[],
  commands: BattleResolutionPresentationCommand[],
): 0 | 1 | null {
  const inScript = (event: BattleKernelSemanticEvent): boolean =>
    event.provenance !== undefined && event.provenance.sourceLabel in ENTRY_SCRIPT_TRAILING_ROWS;
  const first = events.findIndex(inScript);
  if (first < 0) return null;
  const script = events.filter((event) => inScript(event) && event.provenance!.sourceLabel === events[first]!.provenance!.sourceLabel);
  const sequences = new Set(script.map((event) => event.sequence));
  const execution = (sequence: number): number | undefined => script.find((event) => event.sequence === sequence)?.provenance?.instructionExecution;
  const start = commands.findIndex((command) => "eventSequence" in command && sequences.has(command.eventSequence));
  const before = commands[start - 1];
  if (start < 1 || before?.type !== "switch-in") return null;
  const lead = execution((commands[start] as { eventSequence: number }).eventSequence);
  if (lead === undefined) return null;
  commands[start - 1] = Object.freeze({ ...before, entryScriptHoldFrames: lead - ENTRY_SCRIPT_SETTLE_OVERLAP_FRAMES + (before.battler === 1 ? ENTRY_SCRIPT_OPPONENT_RELEASE_EXTRA_FRAMES : 0) });
  let end = start;
  while (end + 1 < commands.length && "eventSequence" in commands[end + 1]! && sequences.has((commands[end + 1] as { eventSequence: number }).eventSequence)) end += 1;
  for (let index = start; index <= end; index += 1) {
    const command = commands[index]!;
    const following = commands[index + 1];
    if (command.type === "stat" && following?.type === "stats-change") {
      const from = execution(command.eventSequence);
      const to = execution(following.eventSequence);
      if (from !== undefined && to !== undefined && to - from > command.timing.minimumFrames) {
        commands[index] = Object.freeze({ ...command, timing: Object.freeze({ ...command.timing, minimumFrames: to - from }) });
      }
    }
  }
  const last = [...script].reverse().find((event) => event.payload.kind === "message");
  const printed = commands[end];
  if (last === undefined || printed?.type !== "message") return null;
  const closing = ENTRY_SCRIPT_TRAILING_ROWS[last.provenance!.sourceLabel]! + ENTRY_SCRIPT_END_HELD_ROWS
    + (end + 1 < commands.length ? ENTRY_SCRIPT_SETTLE_OVERLAP_FRAMES : before.battler === 1 ? ENTRY_SCRIPT_OPPONENT_TAIL_EXTRA_FRAMES : 0);
  commands[end] = Object.freeze({ ...printed, timing: Object.freeze({ ...printed.timing, holdFrames: (printed.timing.holdFrames ?? 0) + closing }) });
  return end + 1 < commands.length ? null : before.battler;
}
