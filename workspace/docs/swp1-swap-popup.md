# swp1: the swap screen's popup after a summary, and PKMN FOR SWAP's chosen mon (2026-11-24)

Two picture bugs of the Battle Factory swap screen that spd2 found and confirmed on the ROM (`docs/spd2-rental-swap-spinda-spots.md`,
"Seen, not fixed"). Pictures only: gameplay follows the controller and is unchanged (census and digests below). Base: a866d9ddc, the
game the site runs (2f69f51b2 + ffw1 + spd2).

1. **The popup stayed up after a summary.** After a SUMMARY visit the engine drew the SUMMARY/SWAP/RECHOOSE popup and its pic for the
   rest of the swap screen. Kyle's 11-24 game: from NIDORINO's summary on (engine 19910) the popup stayed through SWAP, the whole enemy
   pick, the accept prompt and the exit (to 20340).
2. **The wrong mon on PKMN FOR SWAP.** On SWAP the closing popup, the species name, the arrow and the category jumped to the party's
   slot 0 (seed 28: MURKROW drawn for the chosen SEALEO).

## What the ROM does (`battle_factory_screen.c`)

Popup after a summary:

- `Swap_Task_OpenSummaryScreen` (:2378-2407) sets `fromSummaryScreen` and opens the summary; it returns to `CB2_InitSwapScreen`,
  which restores `cursorPos` from `gLastViewedMonIndex` (state 5, :3347-3355), rebuilds the sprites and, because `fromSummaryScreen`, the
  popup's pic with `Swap_ShowSummaryMonSprite` (state 6, :3356-3362; :4075-4097, the pic spd2 spots from the OT id), shows BG3
  (state 14) and installs `Swap_Task_HandleMenu` at `STATE_MENU_INIT` (state 15).
- `Swap_Task_HandleMenu` skips `OpenMonPic` while `fromSummaryScreen` (:2589-2593); `Swap_ShowMenuOptions` then clears it (:3706-3707).
  From here the popup is an ordinary one: B calls `CloseMonPic` + `Swap_ErasePopupMenu` and `Swap_Task_ScreenInfoTransitionIn` back
  to the picker (:2609-2619); SWAP (`Swap_OptionSwap`, :3989-3996) and RECHOOSE (:4004-4013) close it the same way. A later A on a ball
  opens a fresh popup with `OpenMonPic` (`STATE_MENU_INIT` again, `fromSummaryScreen` now FALSE).

SWAP:

- `Swap_OptionSwap` copies `cursorPos` to `playerMonId`, starts `CloseMonPic` and installs `Swap_Task_SwitchPartyScreen`; `cursorPos`
  is untouched.
- `Swap_Task_SwitchPartyScreen` (:3196-3252) waits for the close (`monPicAnimating`); state 0 prints the chosen mon's name for the
  transition (`Swap_PrintMonSpeciesForTransition`, :3204-3205, reads `cursorPos`); state 1 hides the arrow; state 2 slides the balls and
  fades the name; state 3 erases the species window and calls `Swap_InitActions(SWAP_ENEMY_SCREEN)` (:3218-3225), which sets
  `cursorPos = 0` (:3961-3980). That is +84 after the press in `factorySwapPresentation.ts`, where the presentation already resets
  its own cursor copies.
- The category window is printed by `Swap_PrintMonCategory` only in `Swap_Task_ScreenInfoTransitionIn` state 7 (:3167-3176), the step
  before state 8 installs the enemy picker: up to then it keeps the chosen mon's category.

## What the engine did

1. `core.ts` (`renderWithoutFactoryTerminal`) sent every frame with `factorySwap.returnedFromSummary` through the summary branch, which
   draws the popup as `phase: "playerOptions"`, `phaseElapsed: 59`. `returnedFromSummary` is set when `summaryReturn` hands over to
   `playerOptions` (`factorySwapPresentation.ts`) and never cleared. It cannot simply be cleared: the presentation's input timing reads it
   (`effectiveDelay`, a gameplay matter; see "Seen, not fixed").
2. `factorySwap.ts` (the controller) sets `cursor`, `infoCursor`, `displayCursor` and `arrowCursor` to 0 on the SWAP press;
   `renderFactorySwapPicker` reads `party[cursor]` for the pic, `party[displayCursor]` for the name and the arrow's x, and
   `party[infoCursor]` for the category.

## The change (render only)

- `factorySwapPresentation.ts`: `factorySwapSummaryReshowShown(state)` = `returnedFromSummary && selectedBallClock === null`: the
  summary return clears `selectedBallClock` and only entering the popup from the picker sets it again, so this is true exactly while the
  popup (or the closing pic) is the one `CB2_InitSwapScreen` rebuilt. Read by the renderer only; no state field was added or changed.
- `core.ts`: the summary branch takes `summaryFade`, `summaryReturn` and `playerOptions` while that popup is up, nothing else. Its OT-id
  pic (spd2) and its rebuilt-ball tiles follow the same test, so a later fresh popup's SUMMARY fades from its own pic (personality spots)
  and live balls. The close of the rebuilt popup (`playerPickerReturn` / `enemySwitch`) passes the OT id to the normal renderer for the
  press frame's buffered pic.
- `factorySwapRender.ts`: `factorySwapRenderCursorState` draws `enemySwitch` with the chosen mon (`playerMonId`) as cursor, species,
  arrow and category up to `FACTORY_SWAP_ENEMY_SWITCH_INIT_ACTIONS_ELAPSED` (+84), and the category through the whole switch.

## ROM evidence

Frame catcher (`tools/frame-catcher/run.sh`, `KEEP=1`; mGBA in process, no oracle server), the fixed tree against the base
(`git archive a866d9ddc`, `GAME=`). Evidence and scripts: `.integration/evidence/swp1/` (`win.py` region diffs, `pins.py` test pins,
`engdiff.py`, `newdiffs.py`, `swapstates.mjs`, `makeSpinda.mjs` with the `swapsum` and `reopen` modes, catcher runs in `catch-base/`,
`catch-fix/`).

Traces: Kyle's 11-24 game (`_playtest-20261124/spinda/kyle1124.json`, read in place); seed 28 Scene ON `spd-swap-s28.json` (spd2's: swap 1
picks slot 1 SEALEO and SWAPs without a summary; swap 2 opens SPINDA, its SUMMARY, back, B, quit); `swp1-swapsum-s28.json` (new: swap 1
opens SEALEO, SUMMARY, back, then SWAP from the rebuilt popup, Kyle's path with a slot other than 0, takes SPINDA, accepts);
`swp1-reopen-s28.json` (new: SUMMARY, back, B, then A on the same ball again and B).

Per window, every engine frame against the ROM frame at the same distance from the press that entered the window (the ROM driver's own
press, from `rom/timeline.json`; it sometimes lands a frame after ours). "Balls" = the frame differs only in the balls' row (y 48..79):
the balls rock on `Random()` draws and the catcher syncs `gRngValue` only at battle starts, so they never match by more than chance.

| window | trace, engine frames | fixed: exact / + only balls / rest | base: exact |
|---|---|---|---|
| bug 2: SWAP close and party switch | seed 28, 12478-12610 | 106 / 27 / 0 of 133 | 0 |
| bug 1: B close of the rebuilt popup | seed 28, 26131-26185 | 14 / 39 / 2 of 55 | 1 |
| bug 1: the picker after it | seed 28, 26186-26218 | 0 / 2 / 31 of 33 (all only balls + the species colour) | 0 |
| bug 1: "Quit swapping?" | seed 28, 26219-26255 | 0 / 0 / 37 of 37 (all only balls + the species colour) | 0 |
| bugs 1+2: SWAP from the rebuilt popup, switch | swapsum, 12753-12885 | 103 / 29 / 1 of 133 | 0 |
| bug 1: enemy picker | swapsum, 12886-12917 | 32 / 0 / 0 of 32 | 0 |
| bug 1: accept prompt | swapsum, 12918-13043 | 118 / 2 / 6 of 126 (1 only balls + the species colour) | 0 |
| bug 1: accept exit | swapsum, 13044-13084 | 40 / 0 / 1 of 41 | 0 |
| bug 1 (Kyle): SWAP from NIDORINO's rebuilt popup, switch | kyle1124, 20031-20163 | 107 / 26 / 0 of 133 | 1 |
| bug 1 (Kyle): enemy pick | kyle1124, 20164-20190 | 27 / 0 / 0 of 27 | 0 |
| bug 1 (Kyle): accept prompt | kyle1124, 20191-20299 | 0 / 0 / 109 of 109 (all only balls + the species colour) | 0 |
| bug 1 (Kyle): accept exit | kyle1124, 20300-20340 | 6 / 0 / 35 of 41 (34 only balls + the species colour) | 0 |
| bug 1: B close of the rebuilt popup | reopen, 12722-12778 | 17 / 38 / 2 of 57 | 1 |
| bug 1: the picker after it | reopen, 12779-12809 | 0 / 0 / 31 of 31 (all only balls + the species colour) | 0 |
| a fresh popup on the same ball (OpenMonPic, held 90) | reopen, 12810-12900 | 0 / 0 / 91 of 91 (88 only balls + the species colour) | 0 |
| its B close | reopen, 12901-12956 | 0 / 0 / 56 of 56 (53 only balls + the species colour) | 0 |

The rest, frame by frame:

- **The species name's colour** (the picker after the post-summary close, "Quit swapping?", Kyle's accept prompt): its breathe
  (`Swap_Task_FadeSpeciesName`) runs in another phase on the ROM. In the seed 28 picker the ROM starts a dimming step 2 frames after the
  picker is installed and ours bounces at full red; in Kyle's long picker before any summary (19085-19551) the ROM's pulses run ~40
  frames ahead of ours. Pre-existing (the engine's species-fade state across the swap screen), only newly visible here because the base
  drew the popup instead. In Kyle's accept prompt the name froze one step apart because the ROM driver's A landed a frame later, on a step.
- **The B close's press frame** (seed 28 26131, reopen 12722 and 12901): our menu highlight hides on the press frame, the ROM's one frame
  later (the B close's shared model, `factorySwapPlayerReturnMonPicVisual(0)`, pinned by `docs/factory-swap-player-options-b-close-probe.md`
  for a B taken at the popup's first input frame; these B presses came 40 to 93 frames later).
- **+2 of a close** (seed 28 26133, swapsum 12755, reopen 12724; reopen 12903-12904, +2 and +3): the ROM's BG3 window is one
  contraction step ahead (rows 44..83 against our 40..87), then matches again. Not in Kyle's SWAP from his rebuilt popup, nor in seed 28's
  SWAP without a summary, and also in the reopen trace's close of a fresh popup, so not tied to the summary. ROM-side cause not pinned
  (the window steps are `SetGpuReg` writes, which reach the screen at once only when made inside VBlank, `gpu_regs.c:66-78`).
- **OpenMonPic's last window frames** (the fresh popup's +52..+55, the accept prompt's +57..+61) and **the YES press frame** (swapsum
  13044, Kyle 20300): the same frames differ in seed 28's ordinary first popup (12459-12463) and accept prompt (12699-12704, 12769), on the
  base too.

Whole runs (catcher picture differences, base -> fixed): Kyle's 11-24 218 -> 191 (74 of 74 menus followed); seed 28 swap trace
199 -> 182 (79 of 79); swapsum 163 -> 135 (39 of 39), one stretch content -> timing (the enemy picker); reopen 140 -> 134 (41 of 41).
Nothing else moved: the engine's pictures differ between the two trees only inside the windows above (seed 28 12478-12610 and
26131-26277, Kyle 20031-20340, swapsum 12753-13084, reopen 12722-12884 and 12893-13047), the ROM runs are byte-identical, and the
gameplay digests are equal (seed 28 5e95f8532ae3d507, Kyle 5235d173ebbdc70d, swapsum and reopen ec5b67c6ce456252). The catcher's few
"fixed only" groups are all on these swap screens (the balls, the species colour, the +2 window).

Pictures (ROM | before | after): `.integration/evidence/swp1/swp1-bug1-popup-after-summary.png` (Kyle's enemy pick, the seed 28 picker
after the close) and `.integration/evidence/swp1/swp1-bug2-pkmn-for-swap.png` (seed 28's SWAP +3 and +60).

## Gameplay unchanged

`tools/integration/lsd194Census.sh` (`LSD194_SHARDS=20 LSD194_SHARD_SEEDS=10`, seeds 200..209) on a866d9ddc and 1e7f9ba51, Scene ON and
OFF: every `eventsDigest` identical, no errors, the shards byte-identical. ENGINE_BUILD (the headless gameplay graph's hash) is
unchanged, `eb-49f4aa3056b93403`: the change is all in modules the headless build drops.

## Tests

`tests/swp1SwapPopup.test.ts` plays seed 28 by state, not by frame numbers: the soak's `RandomPlayer` ("winning-swap") outside the swap
screens and the scripted swap screens of `makeSpinda.mjs` (`swap` and `swapsum`). A checkpoint is the first frame of a swap-screen state,
`<swap>:<phase><* after a summary>:<phase elapsed>`; its pin is the sha256 of the catcher's ROM frame at the same point (RGB888, the balls'
row zeroed on both sides; in the post-summary picker and quit prompt the species window too). 34 pins: bug 2's switch (+0 .. +132), the
rebuilt popup's B close, the picker and the quit prompt, and the SWAP from the rebuilt popup through the enemy picker, the accept prompt
and its exit. The base matches none of them. It passes on master's timing too (the trial merge below), where spd2's fixed-frame trace had
desynced.

## Gates

Branch `swp1-swap-popup` (from a866d9ddc):

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b`: clean.
- `tests/swp1SwapPopup.test.ts`, `tests/spd2RentalSwapSpindaSpots.test.ts` and the swap-screen tests (every test file naming
  `factorySwap`: factoryRoundBattleOrchestrator, factoryReturnToFrustration, factorySwap, factorySwapPresentation, interactiveRouting,
  pic5SwapSummaryParty, randomRoundSoak, snd2SwapSummaryCry, summaryScreen, sum259SummaryFlow): 12 files, 254 tests passed.
- Full `npm test`: 1,956 files passed, 44 skipped; 17,165 tests passed, 243 skipped, 0 failed (the two extra skips need `dist-lib`;
  after the build both files pass, 17 tests).
- `npm run -s build:lib`: ENGINE_BUILD `eb-49f4aa3056b93403`, the site's (unchanged, see above): a deploy of this fix carries the
  same ENGINE_BUILD as the live game.

Trial merge into master 54866c8c0 (a scratch worktree, `.integration/evidence/swp1/trial`, merge commit f3821dd34; master not moved): no
conflicts (`core.ts` auto-merged); `tsc -b` clean; `tests/swp1SwapPopup.test.ts` 2/2 and `tests/spd2RentalSwapSpindaSpots.test.ts` 5/5 on
master's timing; full `npm test` 1,976 files passed, 44 skipped; 17,258 tests passed, 243 skipped, 0 failed. ENGINE_BUILD there
`eb-cf7a9cb1d877618f`, the same as master's own.

## Seen, not fixed

- **Gameplay: a popup opened after a summary visit takes input at +1.** `advanceFactorySwapPresentationClocks` makes `playerOptions`
  ready after 1 frame whenever `returnedFromSummary` (`effectiveDelay`), which is right for the rebuilt popup (no `OpenMonPic`), but the
  flag never clears, so a later popup opened from the picker on the same swap screen accepts A/B/UP/DOWN from +1 instead of +58 (the ROM
  waits for `OpenMonPic` in `STATE_MENU_SHOW_OPTIONS`, :2594-2600). Measured: `.integration/evidence/swp1/reopen.mjs`, seed 28's
  post-summary picker, A on slot 1 -> input-ready at +1 (the first popup of that screen: +58). A gameplay change; left for a decision.
  The picture of that later popup is now its own `OpenMonPic`, as on the ROM (the reopen rows above; before: the rebuilt popup at once).
- The species name's breathe phase on the swap screen (above).
