# sum259: summary-screen flow (ISSUES #192)

Oracle: Battle Scene OFF, `bin/oracle`. Traces: `tools/compare/traces/sum259-*.json`. Tests: `tests/sum259SummaryFlow.test.ts`.

## (a) Draft cursor follows gLastViewedMonIndex (5da16df07)
CloseSummaryScreen stores `gLastViewedMonIndex` (pokemon_summary_screen.c:1519); `CB2_InitSelectScreen` restores `cursorPos` from it (battle_factory_screen.c:1242).
Ours sets `draftScreen.cursorPos = summaryScreen.selectedSlot` when the exit is accepted.
Traces `sum259-draft-return-cursor` 113/113 and `sum259-draft-reopen-after-return` 73/73 exact.

## (b) Input ready at open+63 (6ebeaa7f9)
Task_HandleInput and SpriteCB_Pokemon wait for `!gPaletteFade.active`. `active` clears only after IsSoftwarePaletteFadeFinishing's extra UpdatePaletteFade calls (palette.c:807-828), so input and the open cry start 4 ticks after the visible fade-in ends (open+59).
Ours: `inputLockTicks` (`SUMMARY_FADE_FINISH_TICKS = 4`, `SUMMARY_INPUT_READY_TICKS = 63`) rejects exit, page, mon and move requests.
The exact frame carries +-1-2 frames of VBlank/visibility ambiguity from C alone; the value 63 is ROM-measured: B at open+60 and +62 is ignored, +63 closes (`sum259-input-ready-b60/b62/b63`, 84/86/87 frames, all exact; the old code gave 10/84 and 12/86).
Helpers in summaryScreen, summaryScreenRender, summaryMoveCancelRow and sum241PartyActionWindow tests now settle at 63 ticks (not a ROM re-pin: the ROM evidence is the traces above).

## (c) Swap summary UP/DOWN (e19f1ec50)
Swap calls `ShowPokemonSummaryScreen(SUMMARY_MODE_NORMAL, gPlayerParty, cursorPos, FRONTIER_PARTY_SIZE - 1, CB2_InitSwapScreen)` (battle_factory_screen.c:2404): 3 mons, slots 0..2. AdvanceMonIndex (pokemon_summary_screen.c:1696) clamps on the Info page (UP at 0 and DOWN at max return -1, no wrap).
Ours: `requestSummaryMonChange(..., maxSlot = 2)` in the swap summaryFade branch, sounds through scheduleSummaryStepSounds, and `beginFactorySwapSummaryReturn` sets cursor / infoCursor / displayCursor / arrowCursor / selectedBallIndex to the last viewed slot (CB2_InitSwapScreen state 5, :3353).
Trace `sum259-swap-summary-mon-change` (DOWN at open+63, DOWN, UP, B): 208/242 frames exact. Residual frames, all not fixed:
- 29842, 29914 (18 and 68 px, bbox x201-221 y93-101): small, not diagnosed.
- 29878, 29880-29897: mon-change sprite transition area (x12-74 y35-92), the known #188 class seen on the draft screen.
- 30036-30043 and 30052-30056 (about 370 px, bbox x61-178 y54-73): the two ball sprites' interior shading after returning with cursor 1 (cursor 0 return is exact in battle1-swap-player-summary-return). Unexplained; hypothesis only: the post-return ball roll depends on the RNG value or the ball epoch for a non-zero cursor. Not verified.
Mon-change sounds were not compared against ROM audio fixtures for the swap screen.

## Results
- typecheck + `npm run build`: exit 0. `npm run build:lib`: exit 0. `npm run test:gate`: 362 files / 2836 tests green.
- Touched-module tests green: aud240a, aud240b, audioSinkNeutral, factorySwapPresentation, summaryScreen, sum259SummaryFlow, sum241PartyActionWindow, summaryMoveCancelRow, factoryRoundBattleOrchestrator, interactiveRouting. summaryScreenRender: fixed, final standalone green run not confirmed.
- Differential vs base 3ce21fcd6 over 24 summary/party/swap-summary traces (run with (a)+(b)): 2576/2576 byte-identical. Not re-run for (c), and the 5-unrelated-battle-trace differential was NOT run.
- NOT done: soak canary (`--seeds 0:20 --policy vanilla`; it exceeded the 600 s tool limit and was left unfinished), tests/factoryLibrary.test.ts, ENGINE_BUILD before/after (hash is a build-time content hash, `tools/build/engineBuild.ts`; the injected value was not recorded).
