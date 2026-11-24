# srt1: the popup rebuilt after a swap-screen summary takes input inside the fade-in, as on the ROM (2026-11-24)

A gameplay-timing difference of the Battle Factory swap screen that swi1 found (`docs/swi1-swap-popup-input-timing.md`, "Seen, not
fixed"); Kyle approved the fix on 2026-11-24 ("Yes, fix it"). Base: bcacf9026, the game the site runs (build `eb-0c82cb1217b6eb3a` =
a866d9ddc + swp1 + swi1). Branch `srt1-swap-summary-return-input`.

**The difference.** After a SUMMARY visit on the swap screen, the summary's B returns to the swap screen and `CB2_InitSwapScreen`
rebuilds the SUMMARY/SWAP/RECHOOSE popup (no OpenMonPic). The ROM's rebuilt popup takes A / B / UP / DOWN from the summary B's +42,
while the screen is still fading in; the engine took them from +61. A press at +42..+60 did nothing on the engine. On the ROM it moves
the cursor, closes the popup, swaps, re-chooses or opens the summary again.

## What the ROM does

- `CB2_InitSwapScreen` (`battle_factory_screen.c` :3273-3461): state 14 starts the fade-in, `BeginNormalPaletteFade(PALETTES_ALL, 0, 16,
  0, RGB_BLACK)` (:3398-3415). State 15 creates `Swap_Task_HandleMenu` at `STATE_MENU_INIT` and installs `Swap_CB2` (:3416-3433).
- `Swap_Task_HandleMenu` (:2585-2631): `STATE_MENU_INIT` skips `OpenMonPic` while `fromSummaryScreen` (:2589-2593).
  `STATE_MENU_SHOW_OPTIONS` calls `Swap_ShowMenuOptions`. `STATE_MENU_HANDLE_INPUT` checks only `monPicAnimating`, which `HideMonPic`
  set FALSE when the summary opened (:4112-4118). Nothing waits for the palette fade. A and B use `JOY_NEW`, UP and DOWN use
  `JOY_REPEAT`.
- `Swap_CB2` runs `UpdatePaletteFade` before `RunTasks` (:2334-2341). So a task sees the fade's `active` cleared on the frame the
  fade clears it.
- `BeginNormalPaletteFade` returns FALSE and does nothing while a fade is active (`palette.c` :161-164). `Swap_Task_OpenSummaryScreen`'s
  `STATE_SUMMARY_FADE` calls it the frame after the A, and `STATE_SUMMARY_CLEAN` waits for `!gPaletteFade.active` (:2378-2407). So a
  SUMMARY taken inside the fade-in does not fade out: it waits for the fade-in to end.
- B (`CloseMonPic` + `Swap_Task_ScreenInfoTransitionIn`, :2609-2619), SWAP (`Swap_OptionSwap` -> `Swap_Task_SwitchPartyScreen`,
  :3989-3996, :3196-3252) and RECHOOSE (:4004-4013) do not touch the palette fade until `ScreenInfoTransitionIn` state 3's text fade
  (:3146-3148). By then the fade-in is over, so they run as they do after it.

## ROM evidence

The method is swi1's: the frame catcher's ROM side cannot say which presses the ROM takes, because its driver repeats a press until it
lands. So the ROM is asked directly. `srt1rom.py` (`.integration/evidence/srt1/`) wraps the catcher's ROM driver (`romRun.py`) on an
engine run of `swi1-reopendown-s28` (seed 28, Scene ON: swap 1 opens slot 1 SEALEO, its SUMMARY). At the ROM's summary B (ROM frame
12998) it branches from the saved state:

1. A sweep: the B, k - 1 empty frames, then a one-frame A / B / UP / DOWN at +k (k = 1..80). A press is "taken" when the live tasks,
   `menuCursorPos` / `cursorPos` or the main callback after that frame differ from the same frame without it.
2. Cases: the B, then a script of one-frame presses. The case records per frame the tasks, callbacks, cursors and `gPaletteFade` (y,
   active), the pictures and the sound calls (romRun's `SoundLog`). It also probes, frame by frame after the last press, the first frame
   the next screen takes a one-frame press (RIGHT in a picker, B in the summary).

`srt1eng.mjs` does the same on the engine (`tick` on saved states; `render` for the pictures; `collectSoundTick` for the sounds). Both
count frames from the summary B frame (+0).

### The ROM's timeline (no press)

| frame | ROM |
|---|---|
| +22 | `CB2_InitSwapScreen` |
| +38 | state 14: the fade-in starts (y 16, active) |
| +39 | `Swap_CB2`; `Swap_Task_HandleMenu` state 2 (`STATE_MENU_INIT`) |
| +40 | state 9 (`STATE_MENU_SHOW_OPTIONS`), y 14 |
| +41 | state 3 (`STATE_MENU_HANDLE_INPUT`): input from +42 |
| +42..+54 | y 12 -> 0 (2 every 2 frames) |
| +61 | `gPaletteFade.active` cleared (`softwareFadeFinishing`), before that frame's tasks |

The engine draws this fade-in as before (summary screen return transition: black hold to +41, fade frames +42..+57). Its 114 frames
+17..+130 are the ROM's (98 exact, 16 differ only in the balls' row: the balls rock on `Random()` draws the catcher does not sync), on
the base and the fixed tree alike.

### The first frame each button is taken (sweep, k = 1..80; every later k is taken too)

| button | ROM | base bcacf9026 | fixed |
|---|---|---|---|
| A | +42 | +61 | **+42** |
| B | +42 | +61 | **+42** |
| UP | +42 | +61 | **+42** |
| DOWN | +42 | +61 | **+42** |

Kyle's 11-24 game, the same sweep from his NIDORINO summary B (ROM frame 20085): ROM +42 for all four, base +61, fixed +42.

### What a press inside the fade does

From the summary B. "Next input" is the probe: the first frame the next screen takes a one-frame press, after the case's last press.

| case | ROM | base | fixed |
|---|---|---|---|
| DOWN / UP at +42, +50, +58 | cursor moves (UP wraps to RECHOOSE), SE_SELECT on the press frame, drawn inside the fade | ignored (no SE) | as the ROM |
| B at +42..+60 (every k) | popup closes under the fade; picker takes input at B+56 | ignored (from +61: B+56) | B+56 at every k |
| RECHOOSE (UP +42, A at +43 / +50 / +58 / +63) | closes; picker at A+56 | ignored | A+56 |
| SWAP (DOWN +42, A at +43 / +50 / +55 / +58 / +60 / +63) | closes, party switch; enemy picker at A+134 | ignored (from +61: A+133) | A+133 at every k (see "Seen, not fixed": every SWAP is A+133 on the engine) |
| SUMMARY, A at +42..+59 (every k) | the popup goes on fading in, no fade-out; summary first input and its cry at **+101** whatever k | ignored | +101 at every k, cry +101 |
| SUMMARY, A at +60 | ordinary fade-out (`BeginNormalPaletteFade` runs at +61, after the fade cleared): summary input and cry at A+63 = +123 | ignored | +123 |
| SUMMARY, A at +61..+63 | A+63 | A+63 | A+63 |
| A at +41 | not taken (state 9 that frame) | not taken | not taken |

The ROM's SUMMARY inside the fade, frame by frame (`romrows.py rom/rom1.json a42`):

- +42: `Swap_Task_OpenSummaryScreen` 6. +43: 7, its fade refused.
- +61: the fade-in's `active` clears. `STATE_SUMMARY_CLEAN` passes the same frame (sprites destroyed, windows freed) and goes to state 8.
- +62: `CB2_InitSummaryScreen`. +77: `Task_HandleInput`. +78: the summary's fade-in. +101: input and cry.

Pictures: frames +0..+62 are exactly the no-press frames; the popup reaches full brightness and the highlight stays on SUMMARY. From +63
on they are exactly the frames of an A at +61, 23 frames earlier: the summary opens as after an A at +38, the fade-in's start, because
the two fades are equally long. The A at +46, +50, +54, +56, +58 and +59 gives the same frames as the A at +42, all 171 of them
(`romvs.py`).

### Pictures of the cases: ROM against each engine, frame by frame from the summary B

Counted from +17. The summary's own exit fade-out, +0..+16, differs in its mon pic's box (x 14..69, y 32..85, about 600 px) on both
trees alike, a pre-existing difference not looked into here. Per frame: exact / differs only in the balls' row / only in the balls and
the species name (its breathe runs in another phase on the ROM, swp1's "Seen, not fixed") / more (`cmppics.py`). The base's frames
differ from the press on because it ignores the press.

| case (presses from the summary B) | frames | base: exact / balls / +species / more | fixed |
|---|---|---|---|
| none | +17..+130 | 98 / 16 / 0 / 0 | 98 / 16 / 0 / 0 |
| DOWN +42 | +17..+100 | 27 / 0 / 0 / 57 | 84 / 0 / 0 / 0 |
| DOWN +50 | +17..+100 | 35 / 0 / 0 / 49 | 84 / 0 / 0 / 0 |
| DOWN +58 | +17..+100 | 43 / 0 / 0 / 41 | 84 / 0 / 0 / 0 |
| UP +42 | +17..+100 | 27 / 0 / 0 / 57 | 84 / 0 / 0 / 0 |
| B +42 | +17..+130 | 26 / 0 / 0 / 88 | 77 / 5 / 32 / 0 |
| B +50 | +17..+130 | 34 / 0 / 0 / 80 | 87 / 2 / 24 / 1 |
| B +57 | +17..+130 | 41 / 0 / 0 / 73 | 91 / 4 / 17 / 2 |
| B +61 (after the fade) | +17..+130 | 95 / 4 / 13 / 2 | 95 / 4 / 13 / 2 |
| SUMMARY +42 (same for +46, +50, +54, +56, +58, +59) | +17..+170 | 46 / 0 / 0 / 108 | 154 / 0 / 0 / 0 |
| SUMMARY +60 | +17..+170 | 47 / 0 / 0 / 107 | 153 / 0 / 0 / 1 |
| SUMMARY +61 (after the fade) | +17..+170 | 153 / 0 / 0 / 1 | 153 / 0 / 0 / 1 |
| SWAP (DOWN +42, A +43) | +17..+200 | 27 / 0 / 0 / 157 | 180 / 4 / 0 / 0 |
| SWAP (DOWN +42, A +57) | +17..+200 | 27 / 0 / 0 / 157 | 180 / 3 / 0 / 1 |
| SWAP (DOWN +61, A +62) | +17..+200 | 179 / 4 / 0 / 1 | 179 / 4 / 0 / 1 |
| RECHOOSE (UP +42, A +43) | +17..+130 | 27 / 0 / 0 / 87 | 78 / 4 / 31 / 1 |
| RECHOOSE (UP +61, A +62) | +17..+130 | 96 / 4 / 12 / 2 | 96 / 4 / 12 / 2 |

The fixed tree's remaining "more" frames are swp1's known ones, also after the fade and on the base:

- The press frame of a B / A that closes or leaves the popup (786 px, x 182..239 y 112..127): our highlight hides on the press frame,
  the ROM's a frame later. B +50, B +57, SUMMARY +60 / +61, RECHOOSE +43 / +62.
- +2 of a close (512 px, x 88..151 y 40..87): the ROM's BG3 window is one contraction step ahead. B +57 (+59), SWAP +57 (+59), B +61,
  SWAP +62, RECHOOSE +62.

A B or SWAP at +42..+50 has no "more" frame at all: the highlight and the window are still too dark there to differ. Without a press
inside the window, the two engines' frames are byte-identical (`engvs.py`: none, B +61, SUMMARY +61, SWAP +62 and RECHOOSE +62: 0
frames differ).

Sounds (`sounds.py`, SE / cry / music starts): the fixed engine plays the ROM's in every case. That is SE_SELECT on each in-fade press
and the summary cry at +101 / +123 / +124; the base plays neither. One logging artifact: where two presses come on consecutive frames
(DOWN +42 and A +43), the ROM log keeps one SE_SELECT. romRun's `SoundLog` drops a call that leaves the m4a RAM unchanged. The same
happens with presses at +61 / +62 after the fade, on both trees.

## The change

- `factorySwapPresentation.ts`, `advanceFactorySwapPresentationClocks`: `summaryReturn` hands over to `playerOptions` at the summary B's
  +41 (`FACTORY_SWAP_SUMMARY_RETURN_MENU_INPUT_STATE`; it was +60), the frame the ROM's `Swap_Task_HandleMenu` reaches
  `STATE_MENU_HANDLE_INPUT`. The rebuilt popup keeps its one-frame readiness (swi1's `effectiveDelay`), so input is taken from +42. The
  summary screen's return transition keeps running, and `core.ts` keeps drawing the popup through it. Its mon-pic clock now reads
  `summaryReturnClock` (not reset by the handover), so the frames without a press are byte-identical to the base's.
- A SUMMARY taken while the fade-in still runs (`factorySwapSummaryOpensInReturnFade`: the rebuilt popup and `summaryReturnClock` + 1 <
  `FACTORY_SWAP_SUMMARY_RETURN_FADE_IN_DONE` (61), i.e. A at +42..+59): `summaryFade` starts at `phaseElapsed` = clock - 38
  (`FACTORY_SWAP_SUMMARY_RETURN_FADE_IN_BEGIN`), the timeline of an A at +38.
  - `core.ts` advances the opened summary screen by the same frames, and the open cry is scheduled `SUMMARY_OPEN_CRY_DELAY - elapsed`
    later (`screenSounds.ts`).
  - `summaryOpenedInReturnFade` (a new optional state field, cleared by the next summary return) makes the renderer draw the popup still
    fading in up to `phaseElapsed` 24 (+62), the swap screen's last frame. The summary's own frames follow.
- B / RECHOOSE / SWAP inside the fade: the controller already closes the popup. `core.ts` now draws the remaining fade-in under the close
  (`factorySwapSummaryReturnFadeTicks(summaryReturnClock)`, the same step the summary transition draws, null once settled).
- DOWN / UP: nothing new; the cursor move is drawn by the same popup renderer inside the fade.

ENGINE_BUILD (`node --experimental-strip-types tools/build/engineBuildCheck.ts`): `eb-0c82cb1217b6eb3a` -> **`eb-175f3e18f45d40fb`**.

## Kyle's 11-24 game

`_playtest-20261124/spinda/kyle1124.json`, read in place. He opened NIDORINO's SUMMARY and closed it with B at engine frame 19850, held
to 19901 (+0..+51). His next presses are DOWN at 19981 (+131, held 18 frames) and A at 20031 (+181, SWAP). The B is held, so it is not
new after +0. No press of his falls in the newly live window (+42..+60).

- Base against fixed: the two engine runs are byte-identical: 34,338 frames, the same pictures (`perframe.u32` and `frames.bin`
  equal), sounds and digest `5235d173ebbdc70d`. Only the catcher's swap-menu anchor moves, from 19910 to 19891.
- On the ROM, his literal presses (`srt1rom.py`, case `kyle`: B +0..+51, DOWN +131..+148, A +181..+232) do what both engines do: DOWN to
  SWAP at +131, SWAP at +181. Pictures from +17 to +340: base and fixed both 280 exact + 44 balls only, 0 other. The sounds are the same
  on all three. The enemy picker takes its first input at +314 on both engines, +315 on the ROM (the SWAP difference below).
- Catcher, whole run: 191 -> 186 picture differences (base -> fixed). The engine runs are identical, so this is the driver. It replays
  his DOWN / A at the same offset from the swap-menu anchor. The base anchor is at +60, so it replayed them on the ROM at +111 / +161.
  The fixed anchor is at +41, so it replays them at +130 / +180, next to his real +131 / +181.

## The frame catcher

`tools/frame-catcher/run.sh`, `KEEP=1`, the fixed tree and the base (`GAME=` a `git archive bcacf9026` copy). Five new traces
(`makeSrt1.mjs`, swi1's maker with five more modes; made on the fixed engine; seed 28 Scene ON, swap 1: slot 1, its SUMMARY, then
presses from the summary B at 12619):

- `fadedown`: DOWN +42, UP +50, DOWN +58, B to close, quit.
- `fadeb`: B +45, quit.
- `faderech`: UP +42, A +44, quit.
- `fadeswap`: DOWN +42, A +44, take SPINDA, accept.
- `fadesum`: A +45 (SUMMARY inside the fade), the summary's B, B on the rebuilt popup, quit.

Whole runs (picture differences / sound differences, base -> fixed): fadedown 129 / 0 -> 129 / 0, fadeb 148 / 3 -> 152 / 0, faderech
143 / 3 -> 135 / 0, fadeswap 131 / 4 -> 139 / 0, fadesum 143 / 3 -> 122 / 0, Kyle 191 / 1 -> 186 / 1. The engine digests are equal on
both trees (`ec5b67c6ce456252` for the five traces, `5235d173ebbdc70d` for Kyle). The base ignores the in-fade presses, so its later
presses land on other screens; the round still ends the same.

The window from the summary B, engine frames 12619..12780, by `picmatch.py`'s method over the whole screen with the balls' row zeroed
(`catchwin.py`, closest ROM frame within +-80 of the anchor-aligned guess):

| trace | base: frames with an exact ROM partner | fixed |
|---|---|---|
| fadedown | 143 of 162 | 131 |
| fadeb | 143 | 118 |
| faderech | 143 | 108 |
| fadeswap | 145 | 132 |
| fadesum | 144 | 129 |

The first 17 frames are the summary's exit fade-out (above) on both trees. Past them, the catcher shows fewer exact frames on the fixed
tree, and that comes from its driver, not the game:

- The engine's swap-menu anchor is now `playerOptions`' first frame (+41). The ROM's is `Swap_Task_HandleMenu`'s first frame (+40, its
  install during +39).
- So the driver replays our +42 press at the ROM's +41, where `STATE_MENU_SHOW_OPTIONS` ignores it, and repeats it 8 frames later.
  `rom/timeline.json`, `fadedown`: DOWN at ROM +41 and +49, UP +55, DOWN +61, against our +42 / +50 / +58.
- The cursor or the close therefore moves at another point of the fade on the two sides, and that fade level never repeats: no exact
  partner exists within +-80. `picmatch.py catch-fix/srt1-fadedown-s28 168 104 240 160 12659 12680 --win 80`: 10 of 22 menu-region
  frames exact, the other 12 off by the highlight (1632 px); the base, which ignores the presses on both sides, 22 of 22.
- On the base the driver never replays these presses: our side did not take them.
- The literal replays above are the evidence for these windows. The catcher's whole runs show that nothing else moved: same digests, and
  the sound differences go from 3-4 to 0.

## Gameplay checks

- `tools/integration/lsd194Census.sh` (`LSD194_SHARDS=20 LSD194_SHARD_SEEDS=10`, seeds 200..209) on bcacf9026 and 068f77c07, Scene ON and
  OFF: the shards byte-identical, every `eventsDigest` equal, no errors. The census plays single battles through the round orchestrator
  and never reaches the swap screen, so it cannot see this change.
- swi1's swap-screen soak (`srt1soak.mjs` = swi1's `soakcmp.mjs` plus a record of the explorer's presses while the rebuilt popup was up
  at the summary B's +42..+60). The soak's "winning-swap" player plays outside the swap screen and a "full" RandomPlayer with random
  presses and SUMMARY detours plays on it, three battles, seeds 0..99, both scenes, both trees.

| | Scene ON | Scene OFF |
|---|---|---|
| swap screens / with a summary / summary visits | 221 / 103 / 407 | 219 / 102 / 409 |
| fixed-tree presses at +42..+60 (seeds) | 407 (64), all at +59 | 409 (63), all at +59 |
| those presses: A (an in-fade SUMMARY) / B / UP / DOWN / LEFT / RIGHT | 161 / 49 / 46 / 49 / 44 / 58 | 164 / 49 / 45 / 48 / 44 / 59 |
| base-tree presses there | 0 | 0 |
| runs identical (digest and frames) | 36 | 38 |
| same digest | 96 | 93 |

The explorer's first press after closing a summary always comes at +59 (its press cooldown). On the fixed tree the popup takes it;
on the base the press waits for +61. Every seed without such a press is identical on both trees (36 ON, 37 OFF), and so is one OFF seed
with one.

The digest differs in 11 runs: ON seeds 19, 39, 85, 92 and OFF 4, 39, 55, 61, 67, 71, 98 (`soakexplain.sh`, `soakexplain.txt`):

- Replaying the base run's exact inputs on the fixed tree gives the base digest in all 11 (`soakreplay.mjs`). With no press in the
  window, the rules are unchanged.
- The fixed run's inputs replayed on the base give the fixed digest in 2 (ON 19 and 92) and a third digest in 9: the base ignores those
  +59 presses.
- What differs, per run (`soakexplain.mjs`, up to battle 4's first action menu): the swap screens end sooner or later, and so does
  everything after them. The next trainer roll and the battle RNG come from `gRngValue`, which the rooms' VBlank advances every frame.
  - The next opponent differs: battle 3 in ON 39, OFF 4, 39 and 98; battle 4 in ON 92 and OFF 55, 67 and 71. Example: ON 39's battle 3
    is PORYGON / MAWILE / IVYSAUR on the base and RHYHORN / SUDOWOODO / ARIADOS on the fixed tree.
  - OFF 98's third swap takes the new opponent's MINUN where the base took LEDIAN.
  - The same opponents, another result: ON 85 and OFF 61 lose battle 3 on the base and win it on the fixed tree. The soak's in-battle
    presses land on new phases.
  - ON 19: the same opponents, swaps and results; only the battles' events differ.
  - Every swap screen that both runs reach with the same pool ends with the same party.
- So the change is the soak's input stream, not another rule: the explorer can now act at +59.

## Tests

- `tests/srt1SwapSummaryReturnInput.test.ts` (new, 8 tests). It plays seed 28 by state: the soak's RandomPlayer outside the swap screen;
  on it slot 1, its SUMMARY and the summary's B, found by state. From the state before the B it branches and pins:
  - A / B / UP / DOWN first taken at +42 (handover to `playerOptions` at +41, the summary transition still running);
  - DOWN +42: cursor 1 at once, displayed from +44, SE_SELECT at +42; UP +42 wraps to RECHOOSE;
  - B at +42 / +50 / +59 / +60 / +61 and RECHOOSE (A at +43 / +58 / +63): picker input 56 frames after the press;
  - SWAP (A at +43 / +57 / +63): enemy picker 133 frames after the A (the engine's own value; the ROM's 134 is "Seen, not fixed");
  - SUMMARY at every k in +42..+59: summary input at +101; at +60 / +61 / +63: A+63; cry at +101 and at A+63;
  - the in-fade SUMMARY's pictures (A at +42 / +50 / +59): +0..+62 equal to the no-press run, +63..+150 equal to the A-at-+61 run 23
    frames on (the ROM's equivalences);
  - 29 ROM picture pins: the sha256 of the ROM frame's RGB888 from `srt1rom.py` (`pinsrt1.py`), the balls' row zeroed, for no press,
    DOWN, UP, B, RECHOOSE, SWAP and SUMMARY inside the fade.

  On the base bcacf9026: 7 of 8 fail (the state check passes).
- `tests/swi1SwapPopupInputTiming.test.ts`: swi1's `it.todo` is now its pin. The rebuilt popup takes A / B / DOWN from the summary B's
  +42 (`ROM_REBUILT_POPUP_FIRST_INPUT`; was the engine's +61). 4 passed; on the base it fails.
- `tests/factorySwapPresentation.test.ts`, "round-trips SUMMARY_MODE_NORMAL ...": the handover to `playerOptions` is pinned at
  `summaryReturnClock` 41 (was +60) and the first input at 42 (was +61).
- `tests/randomRoundSoak.test.ts` "(c) leaves "full" byte-identical for two seeds": trajectory pins of the exploring policy, not ROM
  frames. Seed 0 69545 -> 69074: its first summary closes with A at 22627, and the next press (a LEFT the popup ignores on both trees)
  comes at 22686 instead of 22689; the presses after it land on new phases. Seed 1 57793 -> 57778 (A at 20037, LEFT at 20096 instead of
  20099). Both keep battle 3 / depth 2 / turn 21 and 15 / roundLost.
- `tools/report/ability-item-parity-census.ts` pins a site of `factorySwapPresentation.ts` by line number. The new state field moved
  `ABILITY_NONE` from :130 to :132; the pin follows (`tests/abilityItemParityCensus.test.ts` passes).

## Gates

Branch `srt1-swap-summary-return-input` (from bcacf9026):

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b`: clean.
- The swap-screen tests: every test file naming `factorySwap`, plus swp1, spd2, swi1, srt1 and randomRoundSoak, 14 files. All pass.
- Full `npm test` on 068f77c07: 1,958 files passed, 44 skipped; 17,177 tests passed, 243 skipped, 0 failed. The next commit changes only
  a source comment's line references and docs; after it the srt1, swi1, factorySwapPresentation and census tests pass again (59 tests) and
  ENGINE_BUILD is unchanged.
- ENGINE_BUILD `eb-175f3e18f45d40fb` (base `eb-0c82cb1217b6eb3a`). `npm run build:lib` was not run.

Trial merge into core master 69b26a564 (a scratch worktree, `.integration/evidence/srt1/trial`, merge commit b68aebd2a; master not
moved):

- One conflict, `tests/randomRoundSoak.test.ts`: both sides moved the exploring soak's "full" pins. It is resolved to master's trajectory
  with this change measured on the merged tree: seed 0 40651 -> 40615 (battle 2 / depth 1 / turn 24), seed 1 57776 -> 57761 (battle 3 /
  depth 2 / turn 15), roundLost both. Seed 0's decision notes are identical without frames; its first moved note is the LEFT after the
  summary's A close, 22730 -> 22727.
- `core.ts` and `factorySwapPresentation.ts` merged cleanly; the census line pin is right there too (:132).
- `tsc -b`: TRIAL_TSC. Full `npm test`: TRIAL_SUITE.
- ENGINE_BUILD there `eb-4b56dd7d4f1fa327` (master's own `eb-6593d11cb0b0b714`).

## The select screen (rental draft): two older input-timing differences, causes found, not fixed

Measured with `srt1rom.py` (`SRT1_TRIGGER=draft` / `draftsum`) and `srt1eng.mjs` on `swi1-draftreopen-s28`: its first popup from the
cursor (A at ROM frame 202) and its summary B (ROM 361).

**A popup opened from the cursor: ROM +25, engine +27.**

- ROM (`romrows2.py rom/romdraft.json dnone`): A at +0 sets `Select_Task_HandleMenu` state 2. +1: state 9, `OpenMonPic`. +14: the
  flash's affine anim ends and `SpriteCB_OpenMonPic` creates `Task_OpenMonPic` (:4175-4187). +14..+22: the window grows. +23: the task's
  last state destroys itself and `Select_CreateMonSprite` clears `monPicAnimating` (:4202-4248, :2014-2027).
- +24: `STATE_MENU_SHOW_OPTIONS` sees that and goes to `STATE_MENU_HANDLE_INPUT` (:1595-1602). The sweep takes A / B / UP / DOWN from +25.
- Engine: the draft menu's input gate is `isMonPicInputReady` (`monPic.ts`: `phase === "open"`). `advanceMonPic` reaches "open" only
  when the measured picture table ends. `OPEN_TABLE_A` has 27 rows: the pic and the menu text are drawn from row 25, the highlight in
  row 26. So input is taken from +27.
- The engine's gate is the end of its picture timeline; the ROM's is the task state. The ROM's pictures lag its tasks by about two
  frames: the options printed at +24 show at +25, the highlight sprite at +26.
- A fix would gate the menu's input on the task timeline (two rows before the table's end; every variant needs checking) rather than
  on the picture.

**The popup reshown after a summary: ROM +57, engine +53.**

- ROM (`romrows2.py rom/romdraftsum.json dsnone`): +22 `CB2_InitSelectScreen`; +28 its fade-in starts. +34 `Select_Task_HandleMenu`
  state 13 (`STATE_MENU_RESHOW`); +35 state 12 (`STATE_MENU_REINIT`), which waits for `!gPaletteFade.active` (:1651-1662).
- y reaches 0 at +49. `active` clears at +56 (`softwareFadeFinishing`; `CB2_SelectScreen` runs `UpdatePaletteFade` before `RunTasks`,
  :1092-1099), and REINIT goes to state 3 the same frame. The sweep takes input from +57.
- Engine: the menu waits for the summary screen's return transition. That ends with the visible fade (`summaryScreen.ts`:
  `EXIT_FADE_OUT_TICKS` 18 + `EXIT_BLACK_HOLD_TICKS` 20 + `FADE_IN_TICKS` 15 = +53), four frames before `active` clears.
- This is the same 4 the summary screen's own input waits after its fade-in (`SUMMARY_FADE_FINISH_TICKS`). A fix would add them to the
  draft return.

Both are input timing, the same on base and fixed, and each needs its own decision.

## Also corrected

`docs/factory-swap-summary-return-probe.md` said the rebuilt popup's first input was 29884 (B+61) and that a DOWN at 29883 (B+60) "is
rejected during return fade". Its own `picker-down-too-early` dump shows menu cursor 1 on 29883 (re-run in
`.integration/evidence/swi1/oldprobe/`). It probed only B+60 and B+61. The table and the text now give B+41 (`STATE_MENU_HANDLE_INPUT`,
fade active) and the first input at B+42.

## Seen, not fixed

- **SWAP's enemy picker takes its first input one frame early.** Engine A+133 (`enemySwitch` hands over and acknowledges at +133), ROM
  A+134. Measured for every SWAP here: inside the fade, after it, and from the swap screen's first popup (`SRT1_TRIGGER=popup`: DOWN
  +58, A +60 -> ROM +194, engine +193). It is the same on the base.
- swp1's residuals, also for presses inside the fade: the close's press-frame highlight (one frame early on our side) and +2 of a close
  (the ROM's BG3 window one step ahead).
- The summary's exit fade-out (+0..+16 from its B) differs in the summary mon pic's box on both trees.
- The species name's breathe phase on the swap screen (swp1).
- The catcher's swap-menu anchor: ours is `playerOptions`' first frame, the ROM's `Swap_Task_HandleMenu`'s. After a summary they are
  now one frame apart (+41 / +40), so the driver's first press inside the fade lands a frame early on the ROM and is repeated 8 frames
  later. A fresh popup's anchors are 34 frames apart (swi1).
- The select screen's two input timings (above).

## Evidence (`.integration/evidence/srt1/`, not in git)

- ROM side: `srt1rom.py` and `runrom.sh`. Case lists: `mkcases.py` -> `rom/cases1.txt`, `rom/cases-popup.txt`, `rom/cases-kyle.txt`,
  `rom/cases-draft*.txt`. Runs: `rom/rom1.json` (+ `rom/rom1/*.npz` pictures), `rom/rompopup.json`, `rom/romkyle.json`,
  `rom/romdraft.json`, `rom/romdraftsum.json`; the driver's engine runs `rom/eng-*`.
- Engine side: `srt1eng.mjs`, `eng/base1.json`, `eng/fix1.json` / `fix2.json` (+ `.rgb` pictures), `eng/kyle-*.json`, `eng/draft*.json`.
- Readers: `probetab.py`, `cmppics.py` (`pics-base.txt`, `pics-fix.txt`), `romvs.py`, `engvs.py`, `romrows.py`, `romrows2.py`,
  `sounds.py`, `pinsrt1.py`, `strip.py` (`pics/a42-rom*.png`).
- Kyle: `kyle/eng-base`, `kyle/eng-fix`.
- Catcher: `makeSrt1.mjs`, `traces/srt1-*-s28.json`, `catch-base/`, `catch-fix/` (`KEEP=1`), `catchwin.py`, `picmatch.py`.
- Census: `census/`. Soak: `srt1soak.mjs`, `runsoak.sh`, `soak/`, `soaksum.py` (`soaksum.txt`), `soakexplain.sh` (`soakexplain.txt`),
  `soakreplay.mjs`, `soakpin.mjs`, `soakpindiff.mjs`.
- Base copy `base-game/`, full-suite logs `fullsuite.log`, `trial-fullsuite.log`, the trial worktree `trial/`.
