# swt1: a swap-screen popup opened after a summary waits for its OpenMonPic (2026-11-24)

A gameplay-timing bug of the Battle Factory swap screen that swp1 found (`docs/swp1-swap-popup.md`, "Seen, not fixed"); Kyle approved the
fix on 2026-11-24 ("Yes, fix it"). Base: 1c0d55b82, the game the site runs (build `eb-49f4aa3056b93403` = a866d9ddc + swp1).
(Master also has an older, unrelated step called swt1, without a doc: 70f0d8b11 "the next command after an opponent faint replacement /
AI send-in starts 9 frames later", `tests/swt1OpponentSendInNextPrint.test.ts`.)

**The bug.** After a SUMMARY visit on the swap screen, every later SUMMARY/SWAP/RECHOOSE popup opened from the picker on the same swap
screen took A / B / UP / DOWN from +1 (the frame after the A that opened it) instead of +58. A press made while the popup was still
opening (the ROM ignores it) chose SUMMARY, SWAP or RECHOOSE, moved the cursor or closed the popup.

## What the ROM does (`battle_factory_screen.c`)

- `Swap_Task_OpenSummaryScreen` sets `fromSummaryScreen` (:2402). `CB2_InitSwapScreen` rebuilds the screen and, because of it, the popup's
  pic (`Swap_ShowSummaryMonSprite`, state 6, :3356-3362) and installs `Swap_Task_HandleMenu` at `STATE_MENU_INIT` (state 15, :3416-3433).
- `Swap_Task_HandleMenu` (:2585-2631): `STATE_MENU_INIT` skips `OpenMonPic` while `fromSummaryScreen` (:2589-2593);
  `STATE_MENU_SHOW_OPTIONS` waits for `monPicAnimating` (:2594-2600) and calls `Swap_ShowMenuOptions`, which clears `fromSummaryScreen`
  (:3706-3707); `STATE_MENU_HANDLE_INPUT` takes A / B / UP / DOWN once `monPicAnimating` is not TRUE (:2601-2629).
- So only the popup the summary return rebuilds skips `OpenMonPic`. A popup a later A on a ball opens (the picker's
  `Swap_Task_HandleChooseMons` -> transition out -> `STATE_MENU_INIT`, `fromSummaryScreen` now FALSE) runs `OpenMonPic` and waits for it,
  like the screen's first popup. (`Swap_InitStruct` sets the flag FALSE only when the struct is first allocated, :3256-3265.)

## What the engine did

`returnedFromSummary` (`factorySwapPresentation.ts`) is set when `summaryReturn` hands over to `playerOptions` and never cleared, and
`advanceFactorySwapPresentationClocks` made `playerOptions` ready after 1 frame whenever it was set (`effectiveDelay`). Right for the
rebuilt popup, wrong for every later one.

## The change

`effectiveDelay` reads `factorySwapSummaryReshowShown(state)` (swp1's "the popup shown is still the one CB2_InitSwapScreen rebuilt":
`returnedFromSummary && selectedBallClock === null`) instead of `returnedFromSummary`. The summary return clears `selectedBallClock`;
only entering the popup from the picker (the `OpenMonPic` path) sets it again. So the rebuilt popup keeps its timing, a later fresh popup
waits `FACTORY_SWAP_PHASE_READY_DELAYS.playerOptions` (58) like the first one, and a further SUMMARY from that popup gives a rebuilt
popup again. No state field was added; `returnedFromSummary` still marks "after a summary" for the renderer and the ball rolls.

ENGINE_BUILD (the headless gameplay graph's hash, `node --experimental-strip-types tools/build/engineBuildCheck.ts`):
`eb-49f4aa3056b93403` -> **`eb-0c82cb1217b6eb3a`**.

## ROM evidence

The frame catcher's ROM side (`tools/frame-catcher/romRun.py`, mGBA in process) cannot answer "which press does the ROM take": its
driver replays the engine's menu presses at the engine's offsets from the menu's first frame and repeats a press without effect, and an
engine press without effect is never replayed. So the ROM is asked directly. `romsweep.py` (`.integration/evidence/swt1/`) runs the
catcher's driver on an engine run of the trace and, at each popup-opening A and summary B the driver makes, branches from the saved
state before it: that press alone (one frame), k - 1 empty frames, then a one-frame A / B / DOWN at +k. A press is "taken" when the
live tasks (function and tState), the swap / select `menuCursorPos` and `cursorPos` or the main callback after its frame (or one frame
later) differ from the same frames without it; the state is then restored and the driver goes on. `engsweep.mjs` does the same on the
engine (`tick` on saved engine states). Seed 28, Scene ON (spd2's seed: swap 1 is SEALEO in slot 1).

Traces (`makeSwt1.mjs`, makeSpinda.mjs plus modes; generated on the fixed engine): swap 1 opens slot 1, its SUMMARY, back, B closes the
rebuilt popup, A opens slot 1 again (P), then:

- `swt1-reopendown-s28`: DOWN at P+10, +30, +56 (inside the ROM's wait), DOWN +58, UP +70, B +80, then the picker and quit.
- `swt1-reopenb-s28`: B at +20, B at +58.
- `swt1-reopena-s28`: A at +20, A at +58 (SUMMARY), back, B closes that rebuilt popup, quit.
- `swt1-draftreopen-s28` (the select screen, below).

### Sweep: the first k at which A / B / DOWN is taken (every k from 1 to 75 / 90; all later k are taken too)

| popup | ROM | base 1c0d55b82 | fixed |
|---|---|---|---|
| the swap screen's first popup (A on slot 1) | +58 | +58 | +58 |
| the popup rebuilt after the summary (from the summary's B) | **+42** | +61 | +61 (unchanged, "Seen, not fixed") |
| a popup opened after the summary visit (A on slot 1 again) | +58 | **+1** (A +2) | +58 |

A at +1 is not a new press on either side (the opening A is still held). Engine sweeps on Kyle's 11-24 trace: one popup (+58) and one
summary B (+61), no popup after the summary, on both trees.

### The traces' own presses, from the reopen A (ROM: the same presses after the ROM's own A)

| press | ROM | base | fixed |
|---|---|---|---|
| DOWN +10 | ignored (`Swap_Task_ScreenInfoTransitionOut` state 3) | taken: SUMMARY -> SWAP | ignored |
| DOWN +30 | ignored (transition out, state 5) | taken: -> RECHOOSE | ignored |
| DOWN +56 | ignored (`Swap_Task_HandleMenu` state 9, OpenMonPic running) | taken: -> SUMMARY | ignored |
| DOWN +58 | taken: -> SWAP (`HandleMenu` state 3) | taken | taken |
| UP +70, B +80 | taken | taken | taken |
| B +20 | ignored | taken: closes the popup | ignored |
| B +58 | taken: closes (`ScreenInfoTransitionIn`, `Task_CloseMonPic`) | ignored (already closing) | taken |
| A +20 | ignored | taken: SUMMARY | ignored |
| A +58 | taken: SUMMARY (`Swap_Task_OpenSummaryScreen` 6) | ignored (already in the summary fade) | taken |

The fixed engine takes and ignores exactly the presses the ROM does.

### Pictures and sounds of that window

The ROM's frames of that replay (`SWEEP_FRAMES`, from the reopen A) against each engine's frames from its own reopen A (the catcher's
engine runs, `KEEP=1`), per frame: same, or same but the balls' row (y 48..79; the balls rock on `Random()` draws the catcher does not
sync) and the species name (its breathe runs in another phase on the ROM, swp1's "Seen, not fixed"), or more (`litpics.py`):

| trace, frames from P | base: same (balls/species aside) / more | fixed |
|---|---|---|
| reopendown, +0..+140 | 136 / 5 | 136 / 5 |
| reopenb, +0..+118 | 43 / 76 (closes from +20) | 115 / 4 |
| reopena, +0..+118 | 20 / 99 (SUMMARY fade from +20) | 116 / 3 (42 of them exact) |

The fixed engine's few other frames are swp1's known ones, on the base too: OpenMonPic's last window frames (+52, +53, +55), the B
press frame (+80, the menu highlight hides a frame early) and +2 / +3 of a close (the BG3 window one step ahead). In reopendown the two
engines draw the same frames (no frame differs): the options are not drawn yet at +10..+55, and the base's three early DOWNs had brought
its cursor back to SUMMARY by +56. There the difference is sound: the base plays SE_SELECT at +10, +30 and +56 (the ROM takes no press there, so plays none); the
fixed engine's sounds in the window are the ROM's (+58, +70, +80).

### Whole runs (catcher picture differences, base -> fixed)

Kyle's 11-24 game (`_playtest-20261124/spinda/kyle1124.json`, read in place) 191 -> 191: the two engine runs are byte-identical (0 of
34,339 frames differ, digest 5235d173ebbdc70d both); his SWAP came from the rebuilt popup and he opened no popup after the summary.
reopendown 135 -> 134, reopenb 130 -> 131, reopena 142 -> 140. The engine pictures differ between the trees only at 12830-13012
(reopenb) and 12830-13005 (reopena), i.e. from P+20 (none in reopendown); the gameplay digests are equal (ec5b67c6ce456252). These
totals barely move because the catcher's driver adapts: it repeated the base's early presses on the ROM until the ROM took them (from
+60), and it binds the swap popup's menu at the A on our side but at `Swap_Task_HandleMenu`'s install (+34) on the ROM's, so the
popup's presses reach the ROM about 34 frames after ours on both trees. The sweep and the literal replay above are the evidence.

## The select screen (rental draft): no such problem

The ROM's select screen has its own `fromSummaryScreen`: `Select_Task_HandleMenu` skips `OpenMonPic` while it is set (:1590-1594), the
reshown popup goes through `STATE_MENU_RESHOW` -> `STATE_MENU_REINIT`, which waits for the palette fade and clears it (:1651-1666), and
`STATE_MENU_SHOW_OPTIONS` clears it too (:1595-1602). The engine has no such flag on the draft: the summary returns to the draft's menu
with the pic already open, its input waits for the summary transition, and every popup a later A on a ball opens goes through
`openMonPic` and `isMonPicInputReady` (`monPic.ts`), the same gate as the first popup. Measured (`swt1-draftreopen-s28`: slot 0, its
SUMMARY, back, B closes the reshown popup, A on slot 0 again with DOWN at +5 and +15, then RENT, two more rentals, YES):

| popup | ROM | engine (base = fixed) |
|---|---|---|
| a popup opened from the cursor (the first, and three after the summary visit) | +25 | +27 |
| the reshown popup (from the summary's B) | +57 | +53 |

A popup after a summary visit waits as long as the first one on both sides, so nothing to fix for swt1. The two offsets are older,
independent input-timing differences (below).

## Gameplay checks

- `tools/integration/lsd194Census.sh` (`LSD194_SHARDS=20 LSD194_SHARD_SEEDS=10`, seeds 200..209) on 1c0d55b82 and 6696d3d8c, Scene ON and
  OFF: shards byte-identical, every `eventsDigest` equal, no errors. The census plays single battles through the round orchestrator
  (`censusRound.ts`) and never reaches the swap screen, so it cannot see this change.
- A swap-screen soak that does (`soakcmp.mjs`: the soak's "winning-swap" player outside the swap screen, a "full" RandomPlayer with
  random presses and SUMMARY detours on it, three battles, seeds 0..99, both scenes, both trees). Scene ON: 220 swap screens, 103 with a
  summary, 51 popups opened after a summary in 40 seeds; OFF: 218 / 102 / 51 in 41 seeds. Every seed without such a popup is identical
  on the two trees (60 ON, 59 OFF). Every seed with one has later frames (the player presses when the popup can take it: +58 instead of
  +1), except OFF seed 20 (both runs hit the 90,000-frame cap). The digest differs in 4 runs (ON seeds 24 and 39, OFF 39 and 71): the
  same swap choices and results, the next battles start with the same opponents and the same battle RNG at the first action menu
  (`soakexplain.mjs`), but the soak's in-battle presses land on new phases after the longer swap screen. Replaying the fixed run's exact
  inputs on both trees gives equal digests in all 4 (`soakreplay.mjs`): the rules did not change, the soak's input stream did.

## Tests

- `tests/swt1SwapPopupInputTiming.test.ts` (new): plays seed 28 by state (the soak's RandomPlayer "winning-swap" outside the swap screen,
  the swap screen scripted as `reopendown`'s prefix), finds the three presses by state and branches the engine state per +k: the first
  popup and the popup after the summary take A / B / DOWN from +58 (the ROM's), the rebuilt popup from the summary B's +61 (the engine's;
  the ROM's +42 is an `it.todo`). 4 passed, 1 todo; on the base 1 fails (the popup after the summary: taken from +1).
- `tests/randomRoundSoak.test.ts` "(c) leaves "full" byte-identical for two seeds": trajectory pins (not ROM frames) of the exploring
  policy, which opens popups after summaries on the swap screen. Seed 0 68945 -> 69545 (its first such popup at 22899: RIGHT at 22958
  instead of 22905), seed 1 57651 -> 57793 (43452: A at 43511 instead of 43467); same battle 3 / depth 2 / turn 21 and 15 / roundLost.
  The decision notes are identical up to the swap screen; after it the press-stream notes interleave on new phases.
- Not changed: `tests/factorySwapPresentation.test.ts` pins the rebuilt popup's input at handover +1 (summary B +61), which this change
  keeps; no test pinned the later popup's +1. swp1's and spd2's tests press only when the controller is ready and pass as before.

## Gates

Branch `swt1-swap-input-timing` (from 1c0d55b82):

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b`: clean.
- The swap-screen tests (every test file naming `factorySwap`, plus swp1, spd2 and swt1): 13 files, 258 passed, 1 todo.
- Full `npm test` on b6b44123a: 1,957 files passed, 44 skipped; 17,169 tests passed, 243 skipped, 1 todo, 0 failed. (A first run on
  6696d3d8c had one failure: `tests/abilityItemParityCensus.test.ts`, because `tools/report/ability-item-parity-census.ts` pins a site
  of `factorySwapPresentation.ts` by line number, `:130 ABILITY_NONE`, and a longer doc comment above it had moved it to :134. The
  comment is one line again.)
- ENGINE_BUILD `eb-0c82cb1217b6eb3a` (base `eb-49f4aa3056b93403`; `tools/build/engineBuildCheck.ts`). `npm run build:lib` was not run.

Trial merge of b6b44123a into master a65235589 (a scratch worktree, `.integration/evidence/swt1/trial`, merge commit e5518651f; master
not moved): one conflict, `tests/randomRoundSoak.test.ts`, where both sides moved the exploring soak's "full" pins; resolved to
master's trajectory with this change, measured on the merged tree: seed 0 40494 -> 40651 (battle 2 / depth 1 / turn 24), seed 1
57634 -> 57776 (battle 3 / depth 2 / turn 15), roundLost both. `factorySwapPresentation.ts` merged cleanly. `tsc -b` clean; full
`npm test` 1,977 files passed, 44 skipped; 17,262 tests passed, 243 skipped, 1 todo, 0 failed (the new test passes on master's timing).
ENGINE_BUILD there `eb-6593d11cb0b0b714` (master's own `eb-cf7a9cb1d877618f`).

## Seen, not fixed

- **The rebuilt popup takes input 19 frames late.** On the ROM it takes A / B / DOWN from the summary B's +42: `Swap_Task_HandleMenu`
  reaches `STATE_MENU_HANDLE_INPUT` at +41, during `CB2_InitSwapScreen`'s palette fade-in, and that state checks only `monPicAnimating`,
  which `HideMonPic` cleared when the summary opened (:4112-4118). The engine takes it from +61 (`summaryReturn` hands over at +60, then
  +1). `docs/factory-swap-summary-return-probe.md` says DOWN at B+60 (29883) is rejected "during return fade", but its own dump shows the
  cursor moved on that frame (re-run in `.integration/evidence/swt1/oldprobe/`): that probe measured only +60 and +61. A fix would take
  input during the fade-in (`summaryReturn` +42..+60), and the renderer would then have to draw a cursor move, a B close, SUMMARY or SWAP
  inside the fade: a gameplay and picture change of its own, for a decision.
- **The select screen**: a popup opened from the cursor takes input at +27 on the engine, +25 on the ROM; the popup reshown after a
  summary at +53, the ROM's at +57 (`STATE_MENU_REINIT` waits for `!gPaletteFade.active`, :1651-1662). Pre-existing, the same on both
  trees.
- The catcher's swap popup anchor starts at the A on our side and at `Swap_Task_HandleMenu`'s install on the ROM's (+34), so popup presses
  reach the ROM 34 frames late (above).

## Evidence (`.integration/evidence/swt1/`, not in git)

`makeSwt1.mjs` and the traces (`swt1-*-s28.json`, `.log.txt`); `romsweep.py`, `engsweep.mjs`, `showsweep.py`, `literal.sh` and their
outputs in `sweep/` (`rom-reopendown.json`, `rom-draftreopen.json`, `rom-literal-*.json` / `.npy`, `eng-*.json`) and `sweep-eng-*.json`;
`litpics.py`; catcher runs `catch-base/`, `catch-fix/` (`KEEP=1`; base = `git archive 1c0d55b82` in `base-game/`); `engdiff.py`;
`census/`; `soakcmp.mjs`, `soakexplain.mjs` / `.sh`, `soakreplay.mjs`, `soakpin.mjs`, `soakpindiff.mjs` and `soak/`; the old summary
return probe re-run in `oldprobe/`; full-suite logs `fullsuite2.log`, `trial-fullsuite.log`; the trial merge worktree `trial/`.
