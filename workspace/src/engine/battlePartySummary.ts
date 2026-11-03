// sum241: the in-battle party menu's action window (SHIFT or SEND OUT / SUMMARY / CANCEL) and the summary screen it opens,
// shared by the voluntary (battlePartySelect.ts) and forced (partySelect.ts) selectors. Pure state: no pixels here.
//
// ROM (reference/pokeemerald):
// - Action lists: data/party_menu.h:696-697 -- sPartyMenuAction_ShiftSummaryCancel for the voluntary menu,
//   sPartyMenuAction_SendOutSummaryCancel when gPartyMenu.action == PARTY_ACTION_SEND_OUT
//   (GetPartyMenuActionsTypeInBattle, party_menu.c:5788-5796).
// - Input: Task_HandleSelectionMenuInput (party_menu.c:2740-2768); numActions is 3, so the window reads
//   Menu_ProcessInputNoWrapAround_other (menu.c:1071-1101): A runs the row under the cursor, B runs the LAST action (CANCEL),
//   UP / DOWN move without wrapping. DisplaySelectionWindow (party_menu.c:2524-2561) re-creates the window with
//   InitMenuInUpperLeftCorner(..., cursorPos 0, ...) every time it opens.
// - SUMMARY: CursorCb_Summary (party_menu.c:2770-2775) closes the menu into CB2_ShowPokemonSummaryScreen, which in battle calls
//   UpdatePartyToBattleOrder then ShowPokemonSummaryScreen(SUMMARY_MODE_LOCK_MOVES, gPlayerParty, slotId, gPlayerPartyCount - 1,
//   CB2_ReturnToPartyMenuFromSummaryScreen): the summary's mon index space IS the menu's battle-order row space, and the three
//   rows are the whole list (maxMonIndex 2).
// - Return: CB2_ReturnToPartyMenuFromSummaryScreen (party_menu.c:2790-2795) re-inits the menu on gLastViewedMonIndex with
//   PARTY_MSG_DO_WHAT_WITH_MON and Task_TryCreateSelectionWindow, i.e. the action window is open again, cursor on its first row.
import type { GbaButton } from "../input.ts";
import type { BattleStatus, FactoryRentalParty } from "./battleScenario.ts";
import type { BattleScriptPartyMemberState } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "./battleScriptSourceConstants.ts";
import {
  createFactoryRentalPresentation,
  withLiveBattleMember,
  type FactoryRentalPresentation,
  type LiveBattleMemberView,
  type SummaryAilment,
} from "./factoryRentalPresentation.ts";
import { BGM_BATTLE, scheduleSummaryOpenCry, scheduleSummaryStepSounds, type SummarySoundContext } from "./screenSounds.ts";
import {
  advanceSummaryScreen,
  openSummaryScreen,
  requestSummaryMonChange,
  requestSummaryMoveSelect,
  requestSummaryMoveSelectClose,
  requestSummaryMoveSelectionChange,
  requestSummaryPageChange,
  requestSummaryScreenExit,
  type SummaryScreenState,
} from "./summaryScreen.ts";

/** Which first row the action window lists: ACTIONS_SHIFT (voluntary) or ACTIONS_SEND_OUT (forced send-out). */
export type BattlePartyActions = "shift" | "sendOut";

/** sMenu.cursorPos inside the three-row action window: 0 = SHIFT / SEND OUT, 1 = SUMMARY, 2 = CANCEL. */
export type BattlePartyActionCursor = 0 | 1 | 2;
export const PARTY_ACTION_SUMMARY: BattlePartyActionCursor = 1;
export const PARTY_ACTION_CANCEL: BattlePartyActionCursor = 2;

/** gPlayerPartyCount - 1 for the three-mon Factory party: the summary's last mon index. */
export const BATTLE_PARTY_SUMMARY_MAX_SLOT = 2;

/** The three menu rows' summary presentations, row 0 first (the ROM's battle order, the summary's own index space). */
export type BattlePartySummaryMons = readonly [
  FactoryRentalPresentation,
  FactoryRentalPresentation,
  FactoryRentalPresentation,
];

/**
 * Menu_ProcessInputNoWrapAround_other's directional branch: JOY_REPEAT(DPAD_ANY) == DPAD_UP / DPAD_DOWN is an exact
 * comparison, so a second held direction cancels the move. (Held-key repeat itself is not modelled: fresh presses only.)
 */
export function partyActionWindowDirection(newKeys: ReadonlySet<GbaButton>): "UP" | "DOWN" | undefined {
  const up = newKeys.has("UP");
  const down = newKeys.has("DOWN");
  const sideways = newKeys.has("LEFT") || newKeys.has("RIGHT");
  if (up && !down && !sideways) return "UP";
  if (down && !up && !sideways) return "DOWN";
  return undefined;
}

/** Menu_MoveCursorNoWrapAround over the three rows. */
export function movePartyActionCursor(
  cursor: BattlePartyActionCursor,
  direction: "UP" | "DOWN",
): BattlePartyActionCursor {
  if (direction === "UP") return cursor === 0 ? 0 : ((cursor - 1) as BattlePartyActionCursor);
  return cursor === PARTY_ACTION_CANCEL ? PARTY_ACTION_CANCEL : ((cursor + 1) as BattlePartyActionCursor);
}

/** GetMonAilment (party_menu.c:1924-1936): 0 HP is AILMENT_FNT before status1 is read; PKRS draws no icon. */
export function summaryAilmentFromStatus1(hp: number, status1: number): SummaryAilment | null {
  if (hp === 0) return "faint";
  if ((status1 & (BATTLE_SCRIPT_STATUS1_POISON | BATTLE_SCRIPT_STATUS1_TOXIC_POISON)) !== 0) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralyzed";
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "frozen";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  return null;
}

/** The same ailment from the scenario-level BattleStatus the forced route's BattleParty carries. */
export function summaryAilmentFromBattleStatus(hp: number, status: BattleStatus): SummaryAilment | null {
  if (hp === 0) return "faint";
  switch (status) {
    case "none":
      return null;
    case "poison":
    case "toxic":
      return "poison";
    case "paralysis":
      return "paralyzed";
    case "sleep":
      return "sleep";
    case "freeze":
      return "frozen";
    case "burn":
      return "burn";
  }
}

/** The kernel's party record (gPlayerParty mirror: HP, status1, held item, moves and PP all controller-synced) as a summary view. */
export function liveSummaryViewFromPartyMember(member: BattleScriptPartyMemberState): LiveBattleMemberView {
  return Object.freeze({
    hp: member.hp,
    maxHP: member.maxHP,
    item: member.item,
    moves: member.moves,
    pp: member.pp,
    ailment: summaryAilmentFromStatus1(member.hp, member.status1),
  });
}

/**
 * The three rows' presentations in menu order: each row's rental record (identity, nature, ability, stats, experience) with the
 * live battle values laid over it. `liveFor` answers by RAW party index; the result is indexed by menu ROW.
 */
export function buildBattlePartySummaryMons(
  rows: readonly [Readonly<{ partyIndex: number }>, Readonly<{ partyIndex: number }>, Readonly<{ partyIndex: number }>],
  records: FactoryRentalParty,
  liveFor: (partyIndex: 0 | 1 | 2) => LiveBattleMemberView,
): BattlePartySummaryMons {
  return Object.freeze(rows.map((row) => {
    const partyIndex = row.partyIndex as 0 | 1 | 2;
    const record = records[partyIndex];
    if (record === undefined) throw new Error(`battle party summary: no rental record for party index ${partyIndex}`);
    return withLiveBattleMember(createFactoryRentalPresentation(record), liveFor(partyIndex));
  })) as unknown as BattlePartySummaryMons;
}

function summarySoundContext(mons: BattlePartySummaryMons): SummarySoundContext {
  return { bgm: BGM_BATTLE, monFor: (slot) => mons[slot] };
}

/** CursorCb_Summary: the summary opens (SUMMARY_MODE_LOCK_MOVES) on the menu row under the cursor. */
export function openBattlePartySummary(row: 0 | 1 | 2, mons: BattlePartySummaryMons): SummaryScreenState {
  scheduleSummaryOpenCry(summarySoundContext(mons), row);
  return openSummaryScreen(row, { mode: "SUMMARY_MODE_LOCK_MOVES", returnTarget: "battleParty" });
}

/**
 * One tick of the summary screen while it owns the screen: the fade / page / mon state machine advances, then Task_HandleInput's
 * priority order (pokemon_summary_screen.c Task_HandleInput: UP, DOWN, LEFT, RIGHT, A, B) applies to this frame's fresh keys.
 * In LOCK_MOVES mode A on a Moves page opens the move selector (A or B inside it closes it, moves never reorder); A on the Info
 * page and B on any page close the summary. Up / Down clamp at the three rows (AdvanceMonIndex, no eggs in a Factory party).
 */
export function stepBattlePartySummary(
  summary: SummaryScreenState,
  newKeys: ReadonlySet<GbaButton>,
  mons: BattlePartySummaryMons,
): SummaryScreenState {
  const settled = advanceSummaryScreen(summary);
  const next = stepSettledBattlePartySummary(settled, newKeys, mons);
  scheduleSummaryStepSounds(settled, next, summarySoundContext(mons));
  return next;
}

function stepSettledBattlePartySummary(
  next: SummaryScreenState,
  newKeys: ReadonlySet<GbaButton>,
  mons: BattlePartySummaryMons,
): SummaryScreenState {
  if (next.transition || next.pageTransition || next.monTransition || !next.isOpen) return next;
  if (next.moveSelect) {
    const populatedMoves = mons[next.selectedSlot]?.moves.map((move) => move.id !== 0);
    if (newKeys.has("UP")) return requestSummaryMoveSelectionChange(next, "up", populatedMoves);
    if (newKeys.has("DOWN")) return requestSummaryMoveSelectionChange(next, "down", populatedMoves);
    if (newKeys.has("A") || newKeys.has("B")) return requestSummaryMoveSelectClose(next);
    return next;
  }
  if (newKeys.has("UP")) return requestSummaryMonChange(next, "up", BATTLE_PARTY_SUMMARY_MAX_SLOT);
  if (newKeys.has("DOWN")) return requestSummaryMonChange(next, "down", BATTLE_PARTY_SUMMARY_MAX_SLOT);
  if (newKeys.has("LEFT")) return requestSummaryPageChange(next, "left");
  if (newKeys.has("RIGHT")) return requestSummaryPageChange(next, "right");
  if (newKeys.has("A")) return next.page === "info" ? requestSummaryScreenExit(next) : requestSummaryMoveSelect(next);
  if (newKeys.has("B")) return requestSummaryScreenExit(next);
  return next;
}

/** True on the tick BeginCloseSummaryScreen fires: the settled summary just began its fade back to the menu. */
export function battlePartySummaryExitBegins(before: SummaryScreenState, after: SummaryScreenState): boolean {
  return before.transition === null && after.transition?.direction === "toDraft";
}

/** True once the exit fade-in has settled: CloseSummaryScreen has handed the screen back to the re-inited party menu. */
export function battlePartySummaryReturned(summary: SummaryScreenState): boolean {
  return summary.transition === null && !summary.isOpen && summary.monTransition === null && summary.pageTransition === null;
}
