// sum241: frames of the summary screen opened from an in-battle party menu (CursorCb_Summary -> ShowPokemonSummaryScreen
// (SUMMARY_MODE_LOCK_MOVES) -> CB2_ReturnToPartyMenuFromSummaryScreen), composed from the same page renderers as the draft
// screen's summary (summaryInfoPage.ts) over the party menu the caller draws as the host.
//
// This lives beside, not inside, battlePartySelect.ts: summaryInfoPage.ts imports battleScene.ts, which imports the party menu
// modules, so the composition root (core.ts) dispatches here instead of the menu renderer importing the summary pages.
//
// Approximations, named: the entry / exit fades reuse the draft summary's oracle-pinned curves and black holds
// (paletteFade.ts), not Task_ClosePartyMenu's and InitPartyMenu's own; the party menu host fades as one layer at the BG
// coefficient (the real menu's OBJ layer trails one blend step).
import { blendComponentToBlack, bgFadeY, objFadeY, ENTRY_BLACK_HOLD_TICKS, ENTRY_FADE_OUT, EXIT_BLACK_HOLD_TICKS, EXIT_FADE_OUT, FADE_IN } from "./paletteFade.ts";
import { fillFramebuffer } from "./framebuffer.ts";
import { summaryPageLayerOffsets, type SummaryScreenState } from "./summaryScreen.ts";
import {
  renderSummaryBattleMovesPage,
  renderSummaryBattleMoveSelectPage,
  renderSummaryContestMovesPage,
  renderSummaryInfoPage,
  renderSummaryInfoPageFaded,
  renderSummaryMonTransition,
  renderSummaryPageCleared,
  renderSummaryPageFaded,
  renderSummaryPageTransition,
  renderSummarySkillsPage,
} from "./summaryInfoPage.ts";
import type { BattlePartySummaryMons } from "./battlePartySummary.ts";
import type { FactoryRentalPresentation } from "./factoryRentalPresentation.ts";

function fadeFramebuffer(fb: Uint8Array, y: number): void {
  if (y <= 0) return;
  for (let o = 0; o < fb.length; o += 4) {
    fb[o] = blendComponentToBlack(fb[o]!, y);
    fb[o + 1] = blendComponentToBlack(fb[o + 1]!, y);
    fb[o + 2] = blendComponentToBlack(fb[o + 2]!, y);
  }
}

/**
 * Draws the summary screen state `summary` (opened by a party menu) into `fb`. `drawHost` draws the party menu itself, used
 * for the entry fade-out and the exit fade-in (the re-inited menu: the step function already moved the menu's fields on the
 * exit edge).
 */
export function renderBattlePartySummary(
  fb: Uint8Array,
  summary: SummaryScreenState,
  mons: BattlePartySummaryMons | null,
  drawHost: (fb: Uint8Array) => void,
): void {
  if (mons === null) throw new Error("battle party summary: the menu has no summary presentations");
  const rentals: readonly FactoryRentalPresentation[] = mons;
  const slot = summary.selectedSlot;
  const monAnimClock = summary.monAnimClock ?? summary.openElapsed + 1;
  const animateSwitchedMon = summary.monAnimClock !== null;
  const hostFaded = (bgY: number): void => {
    drawHost(fb);
    fadeFramebuffer(fb, bgY);
  };
  const t = summary.transition;
  if (!t) {
    if (summary.moveSelect) {
      fb.set(renderSummaryBattleMoveSelectPage(
        rentals,
        slot,
        monAnimClock,
        summary.moveSelect,
        animateSwitchedMon,
        summary.page as "battleMoves" | "contestMoves",
      ));
      return;
    }
    if (summary.monTransition) {
      fb.set(renderSummaryMonTransition(rentals, summary.monTransition, monAnimClock, animateSwitchedMon, summary.page));
      return;
    }
    if (summary.pageTransition) {
      // Same handoff shape as the draft route (core.ts): the outgoing page holds one callback, a forward wipe clears the
      // outgoing windows for two, then the scroll.
      const pageTransition = summary.pageTransition;
      const layers = summaryPageLayerOffsets(pageTransition);
      if (pageTransition.elapsed === 0) {
        fb.set(pageTransition.fromPage === "skills"
          ? renderSummarySkillsPage(rentals, slot, summary.openElapsed + 1, animateSwitchedMon)
          : pageTransition.fromPage === "battleMoves"
            ? renderSummaryBattleMovesPage(rentals, slot, monAnimClock, animateSwitchedMon)
            : pageTransition.fromPage === "contestMoves"
              ? renderSummaryContestMovesPage(rentals, slot, monAnimClock, animateSwitchedMon)
              : renderSummaryInfoPage(rentals, slot, monAnimClock, animateSwitchedMon));
        return;
      }
      if (layers.movingPage === pageTransition.toPage && pageTransition.elapsed <= 2) {
        fb.set(renderSummaryPageCleared(rentals, slot, monAnimClock, pageTransition.fromPage, animateSwitchedMon));
        return;
      }
      fb.set(renderSummaryPageTransition(rentals, slot, pageTransition, monAnimClock, animateSwitchedMon));
      return;
    }
    if (!summary.isOpen) {
      // Settled and closed: the step function clears the summary on this same tick; draw the menu that owns the screen.
      drawHost(fb);
      return;
    }
    fb.set(summary.page === "skills"
      ? renderSummarySkillsPage(rentals, slot, monAnimClock, animateSwitchedMon)
      : summary.page === "battleMoves"
        ? renderSummaryBattleMovesPage(rentals, slot, monAnimClock, animateSwitchedMon)
        : summary.page === "contestMoves"
          ? renderSummaryContestMovesPage(rentals, slot, monAnimClock, animateSwitchedMon)
          : renderSummaryInfoPage(rentals, slot, monAnimClock, animateSwitchedMon));
    return;
  }
  const isEntry = t.direction === "toSummary";
  if (t.phase === "black") {
    // The hold's own last tick already shows the following fade-in's first step (the draft route's oracle-verified quirk).
    const holdTicks = isEntry ? ENTRY_BLACK_HOLD_TICKS : EXIT_BLACK_HOLD_TICKS;
    if (t.elapsed + 1 < holdTicks) {
      fillFramebuffer(fb, 0, 0, 0);
      return;
    }
    const bgY = bgFadeY(0, FADE_IN);
    const objY = objFadeY(0, FADE_IN);
    if (isEntry) fb.set(renderSummaryInfoPageFaded(rentals, slot, bgY, objY));
    else hostFaded(bgY);
    return;
  }
  const timing = t.phase === "fadingIn" ? FADE_IN : isEntry ? ENTRY_FADE_OUT : EXIT_FADE_OUT;
  // +1: BeginNormalPaletteFade applies its first blend step within the trigger tick (see core.ts's draft dispatch).
  const ticks = t.elapsed + 1;
  const bgY = bgFadeY(ticks, timing);
  const objY = objFadeY(ticks, timing);
  const showingHost = isEntry === (t.phase === "fadingOut");
  if (showingHost) hostFaded(bgY);
  else fb.set(renderSummaryPageFaded(rentals, slot, summary.page, bgY, objY, monAnimClock, animateSwitchedMon));
}
