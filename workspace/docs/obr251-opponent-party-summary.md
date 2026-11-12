# obr251 -- the opponent faint-replacement party-status bar (hold, slide, mirrored balls, fade, SE)

Base `0042829f8`, branch `worker/integration-20261106-222122`. Presentation only: no kernel event, RNG draw, HP value or turn order changes.
Code: `src/engine/midBattleOpponentPartySummaryTiming.ts` (numbers), `src/engine/midBattleOpponentPartySummary.ts` (draw + SE),
`battleResolutionPresentation.ts` (draw command timing), `battleResolutionPresentationRender.ts` (age fields on the view),
`battleStartSounds.ts` (SE hook). `battleScene.ts` only delegates the opponent branch. Tests: `tests/obr251OpponentPartySummary.test.ts`.
Receipts: `tools/compare/traces/obr251-opponent-faint-{on,off}.json`, `tools/audio/fixtures/obr251-opponent-faint-{on,off}-window.json` (STEP-mode ROM probe),
`tools/battle-lab/obr251-opponent-faint-{on,off}.json`, `tools/integration/obr251Probe.ts`.

## 1. ROM timeline (A pressed at frame 501, both scenes)

| frame | ROM event |
| ---: | --- |
| 503 | faint printstring done |
| 525 | `drawpartystatussummary` (Cmd_drawpartystatussummary -> controller command) |
| 526 | bar created, `SE_BALL_TRAY_ENTER` pan 0 on SE12 (STEP-mode probe, both scenes) |
| 527-546 | slide in by `OPP_BAR_X2` (20 frames), balls ride on the bar |
| 626 | first glyph of "<TRAINER> sent out <MON>!" (creation + 100: the controller's 94-tick hold plus script overhead) |
| 651-662 | text end, hide command |
| 664-679 | BLDALPHA fade, 16 steps |
| 681 | `SE_BALL_OPEN` |

## 2. Mechanism

* Hold: the draw command previously held 1 frame, so the bar and the next message started together and the bar popped. The opponent draw now carries
  `minimumFrames = lead + 100` and `leadFrames = lead` (`opponentPartySummaryDrawTiming`). After an opponent faint `lead = 23` (the per-frame script
  commands between the faint print end, A+2, and the draw at 525); otherwise 0. Command start 503 -> next message 626 matches the ROM first glyph.
* The "25-frame lead" in the report = 23 script frames (source-proven: one battle-script command per frame from 503 to 525) + 1 frame display lag
  (`CREATE_DISPLAY_LAG`, the bar's first pixels are 527 for a 526 creation) -- named, not a separate delay.
* Slide: `OPP_BAR_X2[createAge - 1]` over 20 frames (`BAR_X = -24`, `BAR_Y = 40`); balls at `ICON_X + 10 * index + x2` (no per-ball stagger:
  `SpriteCB_StatusSummaryBalls_OnSwitchout` copies the bar's x2).
* Mirror: ball `index` shows `states[5 - index]` (CreatePartyStatusSummarySprites, opponent side).
* Ball tiles use the ROM `oam.tileNum += n` offsets (healthy 0, empty 1, status 2, fainted 3).
* Fade: after the hide command begins, 2 frames of delay, then eva = 16 - step for step 1..15, gone at step 16 (frames 654..668 shown at eva 15..1,
  669 gone). The view keeps being produced for 18 frames after the hide (`opponentSummaryView` returns null at `fadeAge >= 18`).
* Sound: `emitOpponentPartySummarySounds` emits `{se, SE_BALL_TRAY_ENTER, pan 0, SE12}` when the visible opponent draw command's elapsed crosses its
  `leadFrames` (frame 526), behind `soundCollecting()` via `emitMidBattleSwitchSounds`. Equal to the ROM fixture, exactly once, both scenes.

## 3. Proofs (numbers in the step report)

`npm run compare` on the obr251 traces, A = 501:
* Scene ON: before 404-1329 px over 503-548; after the bar frames 527-546 are exact. Remaining over A..A+200: a constant 37 px on 501..625 (the ROM keeps the
  `▾` cursor until 626, the app drops it at A) and, from 626, text-driven differences (the lab ROM trainer BLACK BELT SHIZUKA has a 35-frame text, the app's
  LADY ZOE 25 frames, so post-first-glyph frames are offset by 10). With that offset, hide and fade frames align exactly.
* Scene OFF: before 608 px at 502 and 975 at 503; after a constant 608 px over 502..625 plus 37 px at 501 (message box blank at A+1 in the ROM), same
  text offset from 626.

## 4. Residuals (named, not fixed)

1. Scene ON frozen `▾` cursor: the app drops it at A, the ROM keeps it until 626 (37 px constant).
2. Scene OFF message box: the ROM clears it at A+1, the app retains the faint text (608 px constant). Mechanism not source-proven.
3. `ballDisplay.states` is `['Full','Empty','Fainted','Statused']` while the ROM tile order is healthy 0, empty 1, status 2, fainted 3: the fainted/status
   labels are swapped in the intro tray, `drawTypedPartyStatusSummary` and the OPP exit path. The new module maps by ROM offsets; the others are untouched
   (the aud241a pins stay).
4. A fade that crosses a presentation segment boundary is not drawn.
5. No committed ROM pixel fixtures for this window; the pixel proof is the compare run.

## 5. Re-pinned tests (frames-only, kernel digest identical)

* `tests/battleResolutionPresentation.test.ts`: the `partySummary` view pin gained `createAge` / `fadeAge`.
* `tests/sc106StatsChangeCommand.test.ts`: three frame-anchored pins, each route crosses exactly one opponent faint replacement whose draw now holds
  123 frames instead of 1 (+122): seed 6 Intimidate anchor shift, seed 0 `route.frames` 6882 -> 7004 (Foe WOBBUFFET replacement), seed 13 `route.frames`
  9825 -> 9947 (Foe NIDORINA replacement).
* `tests/audioProbeFixtures.test.ts`: file list gained the two obr251 fixtures. (20 pre-existing failures there are the aud242b fixtures: `pan` kind not in
  EVENT_KINDS and the list lacks the aud242 files; untouched.)
