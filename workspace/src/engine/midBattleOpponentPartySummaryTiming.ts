// obr251: timing of the opponent's mid-battle party-status summary. Pure numbers, so the presentation modules can import it
// without pulling in battleScene.ts. The drawing lives in midBattleOpponentPartySummary.ts.

/** Controller hold: partyStatusDelayTimer `++ > 92` completes on the 94th tick and the script's four commands add 6 to the first glyph. */
export const OPPONENT_SUMMARY_HOLD_FRAMES = 100;
/** The script's per-frame commands from the faint print's end (MoveEnd, GiveExp, HandleFaintedMon, openpartyscreen, switchhandleorder) to drawpartystatussummary. */
export const OPPONENT_SUMMARY_FAINT_LEAD_FRAMES = 23;
/** BattleScript_DoSwitchOut's `switchhandleorder BS_ATTACKER, 1` between drawpartystatussummary and getswitchedmondata: one more script frame after the draw. */
export const OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES = 1;
/** SpriteCB_StatusSummaryBar_Enter: x2 -95 .. 0 in 5-px steps. */
export const OPPONENT_SUMMARY_SLIDE_FRAMES = 20;
/** Task_HidePartyStatusSummary_DuringBattle: tBlend 16 -> 0, one step per frame. */
export const OPPONENT_SUMMARY_FADE_FRAMES = 16;
/** Frames from the hide command's start to the first blended frame (script command -> controller task -> first display). */
export const OPPONENT_SUMMARY_FADE_DELAY_FRAMES = 2;

export type OpponentPartySummaryTiming = Readonly<{ minimumFrames: number; leadFrames: number }>;

/** The opponent draw command's duration: the optional script lead, then the controller hold to the next print's first glyph. */
export function opponentPartySummaryDrawTiming(afterFaint: boolean, voluntarySwitch = false): OpponentPartySummaryTiming {
  const leadFrames = afterFaint ? OPPONENT_SUMMARY_FAINT_LEAD_FRAMES : 0;
  const switchOrder = voluntarySwitch ? OPPONENT_SUMMARY_SWITCH_ORDER_FRAMES : 0;
  return Object.freeze({ minimumFrames: leadFrames + OPPONENT_SUMMARY_HOLD_FRAMES + switchOrder, leadFrames });
}
