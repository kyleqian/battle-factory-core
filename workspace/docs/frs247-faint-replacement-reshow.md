# frs247 -- faint-replacement return: the reshow rises from black and draws no player ball bar

Handoff item 4b(d), reported by Kyle 2026-11-04. After the forced party menu's SEND OUT on a faint replacement our screen was black for
about 37 frames, then the battle appeared washed toward white (mean about 246 against about 200) and faded down over 15 frames, and it
also drew the player's 6-ball party bar. The ROM does neither.

## ROM rule (mGBA on pokeemerald, battle-scene ON and OFF)

Frames are confirm-relative: `e = 0` is the frame of the A press that confirms SEND OUT.

| Frames | ROM |
|---|---|
| e17..55 | black (39 frames) |
| e56..70 | fade-in: `BLDY = 71 - e` (15 -> 1) |
| e71 on | full brightness |

* The source is `CB2_SetUpReshowBattleScreenAfterMenu` -> `BeginHardwarePaletteFade(0xFF, 0, 16, 0, 1)`: BLDCNT 0xFF is effect 3
  (brightness DECREASE) over every layer, BLDY 16 -> 0. A decrease fade rises from black. It is not a blend to white.
* `Cmd_drawpartystatussummary` always passes flags 1, and `PlayerHandleDrawPartyStatusSummary` skips the player side when flags != 0, so
  the player's ball bar is never drawn in a script. The opponent's bar is drawn.
* Identical for every species, both scenes, and for the first and the second faint of one battle.

## Root cause

The canonical MAGBY path (`drawMode0Ppu`, `mgbaDarkenColor`) already did this correctly (MAGBY ON 255/255 rows exact before and after).
The generic path, `renderBattleResolutionForcedPartySelect`'s non-canonical branch in `src/engine/battleScene.ts`, did two wrong things
after composing the scene:

1. `blendComponentToWhite` over e56..70, i.e. a fade from white, not a rise from black.
2. `drawTypedPartyStatusSummary` for the player tray (`PARTY_SENDOUT_SUMMARY_TRAY_END`, fed by `switchIn.partyStates`).

## Fix (presentation only)

* `battleScene.ts`: the post-compose pass is now `mgbaDarkenColor(pixel, partySendOutBattleFadeBldy(elapsed))` (`BLDY = 71 - e`), and the
  player tray block is removed.
* `partySelect.ts`: `PARTY_SENDOUT_SUMMARY_TRAY_END` removed (`partySendOutBattleFadeBldy` unchanged).
* `battleResolutionPresentationRender.ts`: `switchIn.partyStates` removed from the view type and builder (it only fed the tray).

No engine logic, RNG, kernel events or sounds changed. The voluntary-switch reshow (app 12543) is not touched: it does not go through
this branch. The opponent ball bar is untouched (`view.partySummary`).

## Proof (full-frame, `frs247Dense.ts --delta=0 --full`, production vs ROM, 9 species x 2 scenes + a two-faint battle)

Rows are confirm-relative frames from e56 to the action-menu prompt. "Fade px" is the per-window pixel count over e56..70.

| Case | Before: fade px (e56..70) | After: fade px | After: other residual rows |
|---|---|---|---|
| PIDGEY ON | 576,000 | 0 | none (149/149 exact) |
| BULBASAUR ON | 576,000 | 0 | none (222/222) |
| BUTTERFREE ON | 576,000 | 0 | none (219/219) |
| METAPOD ON | 576,000 | 0 | none (191/191) |
| twice ON, faint 1 (MAGIKARP) | 576,000 | 0 | none (195/195) |
| twice ON, faint 2 (JOLTEON) | 576,000 | 0 | e164-244 (back animation, 46,207 px) |
| TORKOAL ON | 576,000 | 0 | e167 (1,737 px) |
| CASTFORM ON | 576,000 | 0 | e165, e268 (453 px) |
| TYPHLOSION ON | 576,000 | 0 | e166, e170 (2,126 px) |
| WIGGLYTUFF ON | 576,000 | 0 | e167 (72 px) |
| MAGBY ON (canonical path) | 0 | 0 | none (255/255), unchanged |
| the other 8 species + twice OFF, faints 1 and 2 | 576,000 each (about 880k per window incl. residuals) | 0 | from e104-110 on (ball/release), about 300k px per window |
| MAGBY OFF | 28,080 | 28,080 | unchanged (e162-166, e184-205) |

Before, every non-canonical window differed on all 38,400 px of each of the 15 fade rows. After, e56..70 are exact in every run. The OFF
totals after the fix (about 300k px per window) are the pre-existing ball/release residuals (pfr192, timing/animation), unchanged by this
step; the fade rows no longer contribute. The remaining ON residuals are single frames or the second-faint back animation, all after the
fade window and out of scope here.

Committed ROM fixture: `tools/integration/fixtures/frs247/rom-frames.json` holds, for five windows (PIDGEY ON and OFF, twice-battle
faint 1 ON and OFF, faint 2 ON), the ROM full-frame sha256 for every frame from e56 through the last exactly matching frame (50 to 195
frames each) plus the ROM per-frame mean brightness for e17..70 (zero for e17..55). Regenerate with `frs247RomFrames.sh` then
`frs247Fixture.ts`.

## Differential and census

* `npm run compare:differential` over all 211 `tools/compare/traces/*.json` against the parent `0b4fb3341`: 38,532 captures,
  all byte-identical, 0 changed. No existing trace contains a generic faint-replacement return, so no capture is expected to move; the
  changed frames are only covered by the new hermetic test and the dense harness. (Run in seven batches of 20-54 traces because of the
  10-minute tool limit.)
* `lsd194Census.sh` (`LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4`, seeds 0..999) at `87e9366af`, both scenes, against
  `.integration/validation/sv-20261103/go246-evidence/census/` (`d34e3b650`) via `rst197CensusDelta.py`:
  ON 1000/1000 battles identical, 322,634 commands, `bad 0`; OFF 1000/1000 identical, 317,269 commands, `bad 0`. 0 logical or command changes.

## Tests

* New `tests/frs247FaintReplacementReshow.test.ts` (12 tests): per-frame full-frame sha256 against the ROM fixture, monotone rise and ROM mean
  brightness over e56..71, ROM black for e17..55, `BLDY = 71 - e`. With the three source files restored to `0b4fb3341`, 10 of the 12 fail.
* Re-pinned: `tests/battleResolutionPresentation.test.ts`, whose `switchIn` view pin carried `partyStates` (the tray data the ROM does not
  draw).
* Gates: typecheck 0; the smoke files plus all 176 test files that import `battleScene`, `partySelect` or `battleResolutionPresentationRender`
  (183 files, 2,660 tests, run in four vitest batches) pass; `build` 0; `build:lib` 0.

## Item 4b(e) notes (out of scope, not changed)

The ROM draws the opponent's ball bar in the faint-replacement scripts (`Cmd_drawpartystatussummary` opponent side) and holds it for
about 93 frames; our opponent bar timing is the separate item 4b(e). This step only removed the player bar. The dense harness compares
the opponent half with `--full`, which is where the 4b(e) difference will show.

## Tooling

`tools/integration/frs247RomFrames.{py,sh}` (ROM probe; `FRS_FAINTS=2` for the two-faint scenario), `frs247Production.ts` (production
frame builder shared by the harness, fixture generator and test), `frs247Dense.ts` (per-frame diff, `--faint=N`, `--full`, `--dump`),
`frs247Fixture.ts` (fixture generator).

## Receipts

Tested source tree: commit `87e9366af6895d5705d7d040123ec74d276696aa`, tree `b77d7c3c7e280f0fc18bb01fb0e21ef5bbe94768` (the doc commit
that follows changes only this file).
