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

## 6. obr2 (2026-11-23): residuals 1-4 re-measured; what is closed

Base `fold-20261123d` (53a20133a). Evidence `.integration/evidence/obr2/` (git-ignored).

* **1 / 2 (the faint box before the bar) -- already exact, closed.** `npm run compare` on `obr251-opponent-faint-{on,off}` now matches every frame 495..710 in both
  scenes (the 37 px `▾` and the 608 px blank-box residuals are gone: ON 303/306, OFF 216/306 over the whole 306-frame window, all remaining diffs after 711 / 798, below).
  Mechanism, source-proven by fnt1 (`docs/fnt1-fainted-box-clear.md`, text.c `RENDER_STATE_CLEAR`): the `\p` press at A is taken from G+1; the clear reaches the screen
  only with the same frame's `TextPrinterDrawDownArrow` copy (wait frame k % 9 == 0), otherwise the print and the frozen arrow stay until the next print. Scene ON's A
  lands on a non-redraw frame (text + frozen arrow to 625), Scene OFF's on a redraw frame (blank from 502 = A+1); both then print "sent out" at 626. Pinned in
  `tests/obr2OpponentFaintBox.test.ts` (both scenes, per frame 495..640, from the app's render view).
* **3 (ball tile names) -- pixels were wrong in unreachable-today paths; renamed.** `CreatePartyStatusSummarySprites` adds `oam.tileNum += 1` for an empty slot,
  `+= 3` for hp == 0 and `+= 2` for a major status (battle_interface.c:1546-1586); the sheet names (`HEALTHBOX_GFX_STATUS_BALL_FAINTED` / `_STATUSED`) are in the
  opposite order. `ballDisplay.states` followed the enum, so `ballIcons` (intro tray), `drawOpponentSummaryExit` and `drawTypedPartyStatusSummary` drew a fainted mon
  with the status tile and a status mon with the fainted tile. Reachability: the intro tray holds only healthy / empty balls (a Factory party is whole at battle
  start), the exit path is that same tray, and `drawTypedPartyStatusSummary` is player-side only, which `PlayerHandleDrawPartyStatusSummary` never draws mid-battle
  (ISSUES #78: the render view already drops battler 0). The canonical Battle 2 trays (TURN5 / TURN13) used the label `"Statused"` for FAINTED mons because that
  was the tile that matched the oracle. Fix: `states` is now `["Full","Empty","Statused","Fainted"]` (tile order 0..3 = ROM offsets; extractor and JSON), and the two
  canonical constants say `"Fainted"`: no pixel moves (`compare:differential` byte-identical on sendout / turn5-faint / turn13-dragonbreath-faint, 507 captures, and on
  both obr251 traces, 612 captures; census command streams byte-identical 0..199 both scenes). Pin `tests/obr2PartyBalls.test.ts` (red without the rename).
  Not oracle-compared: a *status* ball (needs an AI voluntary switch-out of a poisoned opponent mon, the tray's `+2` tile); the fainted ball (tile 3) is oracle-exact in the
  obr251 bar frames 527..546.
* **4 (fade across a segment boundary) -- measured, nothing to land.** Scanning the app's render view over census seeds 0..139 in both scenes (~600 opponent trays: faint
  replacements and AI switch-outs) found 0 frames where a summary with a fade running (or still shown) disappears because the presentation segment changed: the hide is always
  followed in its own segment by the switch-in (> 18 frames). The 18-frame fade does not cross a boundary in any reachable route; the code (`summary` is per segment) stays.
* The compare diffs that remain after the window (OFF 711..800, ON 798..800 on the obr251 traces) are the action-menu / opponent healthbox idle bounce after the replacement
  (ISSUES #56 class), not the party bar.
