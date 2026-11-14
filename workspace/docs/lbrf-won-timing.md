# lbr-f: won-route Lobby timing residuals from lbr-d2b (Battle Scene OFF)

Residuals 1 and 2 of `docs/lbrd2b-won-windows.md`. Residual 1 is fixed on master; residual 2 is ROM-measured and fixed on branch
`lbr-f-residual2` (not merged: it needs a test re-pin that did not fit the step).

## Residual 1 (fixed): the won record question starts 1 tick early

lbr-d2b read it as "the wait cursor is 1 tick late". The text printer and the input gate are NOT separately off: the whole record question (typing,
arrow, input gate) starts 1 tick later in the app than in the ROM on the **won** route. The loss route, with the same constants, is exact
(`loss-terminal-record-cursor-off` 80 / 80 before and after), so the shared 63 (`recordPromptInputDelay`) and the render rule
(`state.age > inputReadyAge`, arrow phase from `inputReadyAge + 1`) are right; the won profile's prompt anchor was 1 tick late.

Evidence (`tools/compare/traces/lbrf-*`, copies of `lbrd-won-no-off` with other capture windows / A positions):

* `lbrf-won-record-typing-off` (frames 8840-8899): before, 15 / 60 (every glyph tick differed, the app typing 1 tick behind); after 60 / 60.
* `lbrf-gate-3779-off` / `lbrf-gate-3780-off`: the first A is moved from rel 4400 to rel 3779 / 3780 (2-frame press, same convention as the other
  A presses). ROM: 3779 is rejected (the arrow is bobbing, nothing else happens), 3780 is accepted (the record scroll starts). Both 58 / 58 after the fix;
  before it, the app's gate was 3781, so the 3780 trace could not match. `tests/fixtures/data/factory-seventh-win-timeline-off.json` already said
  `scrollWait` starts at 3780; the old unit test pinned the app's 3781 gate (A at 3780 "rejected").

Fix: `FACTORY_ROUND_WON_TERMINAL_PROFILE.recordPromptDelayFromRestore` 169 -> 168 (`src/engine/factoryTerminalPresentation.ts`). The restore age
(`restoreDelayFromExchangeRelease` 49, party restore and the save SE) is not moved; the menu / scroll / farewell constants are all A-relative
and unaffected. Prompt first age is now 3717 (was 3718), the gate 3780, the arrow's first frame 3779 + 0 (ROM-exact, 8892). Unit test updated
(`tests/factoryTerminalPresentation.test.ts`: first age 3717, A at 3779 rejected, ready at 3780).

## Residual 2 (branch `lbr-f-residual2`): saving -> saved

ROM: "SAVING..." stays through frame 10690, blank 2 frames (10691-10692), "saved the game." types from 10693. The app cleared 2 ticks early
and typed 3 early. Fix: `ATTENDANT_SCREENS.saving.autoHold` 259 -> 261 and a saving-specific first-glyph lead
`ATTENDANT_TIMING.savingToSavedFirstGlyph = 6` (the "ask" screens keep the shared 5). Source reason: the saved message is not a script message;
it is `ShowSaveMessage(gText_PlayerSavedGame, ...)` inside `SaveDoSaveCallback` (`start_menu.c`, after `TrySavingData`), a different path from the
script's msgbox -> clear -> print, so a different clear-to-first-glyph gap; the exact cause of the extra blank frame (flash write overrunning a
frame vs the printer setup) is not separated. Measured result: `lbrd-won-attendant-off` 1324 / 1416 -> 1349 / 1416 (the saving window 10689-10713
now matches; the rest is NPC wander).

Why not on master: the +2 ticks shift the cursor at the attendant hand-off, so every in-game new challenge is dealt differently. After the change
`tests/lbrd.test.ts` `WIN_TWO_SEED` (pinned 10, then 16 / 19 / 35 from the lbr-e scan) fails its full-file run for all four (seed 16 even loses in
Scene ON), and `tests/lbre.test.ts` "same timeline" compared frame counts of two different deals (relaxed on the branch to +-40). The soak pins
(`randomRoundSoak.test.ts`, 64 tests) and lbra / lbrb / lbrc pass. Remaining work: scan other `WIN_TWO_SEED` values on the FULL file (a `-t` filter
skips earlier tests that change the cursor and gives false passes), then merge the branch.
