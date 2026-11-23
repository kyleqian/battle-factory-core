// obr251: timing of the opponent's mid-battle party-status summary. Pure numbers, so the presentation modules can import it
// without pulling in battleScene.ts. The drawing lives in midBattleOpponentPartySummary.ts.

/** Controller hold: partyStatusDelayTimer `++ > 92` completes on the 94th tick and the script's four commands add 6 to the first glyph. */
export const OPPONENT_SUMMARY_HOLD_FRAMES = 100;
/** The script's per-frame commands from the faint print's end (MoveEnd, GiveExp, HandleFaintedMon, openpartyscreen, switchhandleorder) to drawpartystatussummary. */
export const OPPONENT_SUMMARY_FAINT_LEAD_FRAMES = 23;
/** BattleScript_DoSwitchOut's `switchhandleorder BS_ATTACKER, 1` between drawpartystatussummary and getswitchedmondata: one more script frame after the draw. */
export const OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES = 1;
/**
 * ait1 (D4 faithful timing, docs/ais1-ai-switch-withdraw.md "ait1", docs/faithful-timing.md): the ROM's controller skips one main-loop iteration right after a
 * voluntary AI switch's tray draw in most observations (`EndDrawPartyStatusSummary`'s partyStatusDelayTimer reads 0 on two consecutive frames; no source branch,
 * a VBlank overrun of the tray-creating iteration), so tray draw -> "sent out" print is 102 frames, not the source's 101; the tray slide starts one frame later too.
 * Dominant measured phase: 15 of 24 observations have the lag frame (the ais5 Perish labs 12 of 14, real-play ROM chains 3 of 10; a tie would pick no lag).
 */
export const OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES = 1;
/** Banked measurements of the voluntary AI switch tray lag frame (event = the stall at draw + 1), all sources together. */
export const OPPONENT_SUMMARY_SWITCH_TRAY_LAG_MEASURED = Object.freeze({ event: 15, noEvent: 9 });
/** SpriteCB_StatusSummaryBar_Enter: x2 -95 .. 0 in 5-px steps. */
export const OPPONENT_SUMMARY_SLIDE_FRAMES = 20;
/** Task_HidePartyStatusSummary_DuringBattle: tBlend 16 -> 0, one step per frame. */
export const OPPONENT_SUMMARY_FADE_FRAMES = 16;
/** Frames from the hide command's start to the first blended frame (script command -> controller task -> first display). */
export const OPPONENT_SUMMARY_FADE_DELAY_FRAMES = 2;

/**
 * fnt2 (fnt2-shellbell-ko lab, ROM `FaintedMonSendOutNew` / SE 114 at the heal's `datahpupdate` + 20 + choice extra; seed 2 res6 +23): a Shell Bell heal's hp command (bar + 1 + 3 tail rows) runs
 * between the faint print and the draw. The heal returns into `MoveEnd` past its first rows, so the lead from the heal's `datahpupdate` is 3 rows shorter than from a faint print's end, and the
 * hp command's own 3 tail rows already run those script rows: 6 rows off the lead.
 */
export const OPPONENT_SUMMARY_SHELL_BELL_LEAD_FRAMES = 6;

/**
 * fkt1 / aic1m (ROM s8108): a faint raised inside BattleScript_DamagingWeatherLoop returns into the loop before the faint script's tail (HandleFaintedMon, the ball tray) runs:
 * `checkteamslost` (1 row) and the Increment block (jumpifbyte gBattleOutcome, addbyte, jumpifbytenotequal: 3 rows) = 4 rows, then every battler left in the turn order runs an undamaged
 * iteration (copyarraywithindex, weatherdamage, jumpifword -> Increment: 3 + 3 = 6 rows), then the ContinuesEnd rows already inside the 23-row lead.
 */
export const OPPONENT_SUMMARY_WEATHER_TAIL_BASE_FRAMES = 4;
export const OPPONENT_SUMMARY_WEATHER_TAIL_ITERATION_FRAMES = 6;

export function weatherTailFrames(battlersAfterFaintedInTurnOrder: number): number {
  return OPPONENT_SUMMARY_WEATHER_TAIL_BASE_FRAMES + OPPONENT_SUMMARY_WEATHER_TAIL_ITERATION_FRAMES * battlersAfterFaintedInTurnOrder;
}

export type OpponentPartySummaryTiming = Readonly<{ minimumFrames: number; leadFrames: number; lagFrames?: number }>;

/** The opponent draw command's duration: the optional script lead, then the controller hold to the next print's first glyph. */
export function opponentPartySummaryDrawTiming(afterFaint: boolean, voluntarySwitch = false, choiceExtraFrames = 0, afterShellBellHeal = false, weatherTailRows = 0): OpponentPartySummaryTiming {
  const leadFrames = afterFaint ? OPPONENT_SUMMARY_FAINT_LEAD_FRAMES + choiceExtraFrames + weatherTailRows - (afterShellBellHeal ? OPPONENT_SUMMARY_SHELL_BELL_LEAD_FRAMES : 0) : 0;
  const switchOrder = voluntarySwitch ? OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES : 0;
  const lagFrames = voluntarySwitch ? OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES : 0;
  const minimumFrames = leadFrames + OPPONENT_SUMMARY_HOLD_FRAMES + switchOrder + lagFrames;
  return Object.freeze(lagFrames === 0 ? { minimumFrames, leadFrames } : { minimumFrames, leadFrames, lagFrames });
}
