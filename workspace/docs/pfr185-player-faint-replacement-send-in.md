# pfr185: the PLAYER faint-replacement send-in, both scenes (ISSUES #146 remainder, plr162 "Not landed" item 2)

Evidence only: no `src/` file or existing test changed. Everything below is reproducible from the tools and receipts named at the end.

## Result in one paragraph

The ROM's player faint replacement is the same controller chain as the forced (Roar) send-in, and the forced-player model already live in both
scenes predicts it **exactly**: with `D = sceneOn/OffPlayerForcedSwitchInDuration(species, nature)` (the forced "dragged out!" first-glyph
frame, from the ball), the ROM's controller idles at `D - 2`, the next print (the action-selection text) starts at `D + 10` (CASTFORM `D + 11`)
and the action prompt at `D + 17`. 22 / 22 action prompts and 20 / 22 next-print rows are exact (the 2 misses are CASTFORM, +1 on the print
only, prompt exact). Production does **not** use that tail for a faint replacement: the real forced party menu hands the send-in to the
party select's fixed SEND OUT clock (`PARTY_SENDOUT_*`, `src/engine/partySelect.ts`), which is species-, nature- and scene-independent and was
calibrated on MAGBY in Scene ON (311). It is exact for that one case and wrong for every other (-9 .. +120 frames).

## Method

* ROM: `tools/battle-lab/playerfaint-slot2-sunnyday.json` with `overrides.parties.player[1]` set to the case's species / nature (the forced party menu's
  DOWN-then-A pick), fresh `EmeraldOracle` per run in Scene OFF (`battle-scene-off`) and ON (`battle-scene-on`) through `tools/run-mgba-probe.py`.
  `pfr185Probe.py` drives the inputs from ROM state (action prompt -> FIGHT -> slot; "<mon> fainted!" A; party menu DOWN, A, A; nothing pressed afterwards)
  and records per-frame controller / text-printer / sprite rows. 11 cases x 2 scenes, twice fresh: r1 == r2 byte-identical 22 / 22 (sha256 in
  `rom-rows-r1/r2.json`); MAGBY (the production calibration species) 2 / 2 more.
* Origins. `B` = the frame the send-in ball sprite spawns (`SpriteCB_WaitForBattlerBallReleaseAnim`), also the frame `PlayerHandleSwitchInAnim` hands over to
  `SwitchIn_TryShinyAnimShowHealthbox`. "confirm" = the SEND OUT press (the third party-menu press), the clock production counts from
  (`sendOutElapsed` 0). The ROM press frame and production elapsed 0 can differ by a frame; MAGBY Scene ON lands on production's 311 exactly,
  which fixes the convention used here.
* Production: the real kernel + `projectBattleResolutionCommands` + orchestrator on generated-rental routes (`generatedCommandAnimationReplay`, the replacement answered
  with DOWN / A / A), recording the phase boundaries from the first `presenting-switch-in` frame (`pfr185Prod.ts`, seeds 9, 20, 61, 76, 84 x both scenes).
  Production is identical in every seed and both scenes: `presenting-switch-in` 0..311, then `turn-end` (8) 311..319, `next-command-handoff` (6 blank frames) 319..325, action menu at **325**
  (seed 76 has one extra 101-frame message in the segment: 426).
* Model: `switchInTail.ts` `sceneOffPlayerForcedSwitchInDuration` / `sceneOnPlayerForcedSwitchInDuration` (OFF `max(91, cry + 66)`, ON `max(91, cry + 66, T_back + 70)`, CASTFORM +1), applied
  as above. Computed by `pfr185Model.ts`.

## Results (frames; "confirm" = from the SEND OUT press, "ball" = from B)

| case | scene | ball (confirm) | ROM idle (ball) | ROM next print / prompt (confirm) | production now (confirm) | production - ROM prompt | forced-model next / prompt (confirm) | model - ROM |
|---|---|---|---|---|---|---|---|---|
| PIDGEY n6 | OFF | 97 | 89 | 198 / 205 | 305 / 325 | +120 | 198 / 205 | +0 / +0 |
| PIDGEY n6 | ON | 97 | 89 | 198 / 205 | 305 / 325 | +120 | 198 / 205 | +0 / +0 |
| METAPOD n6 | OFF | 98 | 130 | 240 / 247 | 305 / 325 | +78 | 240 / 247 | +0 / +0 |
| METAPOD n6 | ON | 98 | 130 | 240 / 247 | 305 / 325 | +78 | 240 / 247 | +0 / +0 |
| TORKOAL n6 | OFF | 98 | 91 | 201 / 208 | 305 / 325 | +117 | 201 / 208 | +0 / +0 |
| TORKOAL n6 | ON | 98 | 196 | 306 / 313 | 305 / 325 | +12 | 306 / 313 | +0 / +0 |
| TORKOAL n0 | OFF | 98 | 91 | 201 / 208 | 305 / 325 | +117 | 201 / 208 | +0 / +0 |
| TORKOAL n0 | ON | 98 | 196 | 306 / 313 | 305 / 325 | +12 | 306 / 313 | +0 / +0 |
| TORKOAL n10 | OFF | 98 | 91 | 201 / 208 | 305 / 325 | +117 | 201 / 208 | +0 / +0 |
| TORKOAL n10 | ON | 98 | 196 | 306 / 313 | 305 / 325 | +12 | 306 / 313 | +0 / +0 |
| BUTTERFREE n6 | OFF | 101 | 93 | 206 / 213 | 305 / 325 | +112 | 206 / 213 | +0 / +0 |
| BUTTERFREE n6 | ON | 101 | 155 | 268 / 275 | 305 / 325 | +50 | 268 / 275 | +0 / +0 |
| BULBASAUR n0 | OFF | 100 | 111 | 223 / 230 | 305 / 325 | +95 | 223 / 230 | +0 / +0 |
| BULBASAUR n0 | ON | 100 | 130 | 242 / 249 | 305 / 325 | +76 | 242 / 249 | +0 / +0 |
| BULBASAUR n10 | OFF | 100 | 111 | 223 / 230 | 305 / 325 | +95 | 223 / 230 | +0 / +0 |
| BULBASAUR n10 | ON | 100 | 159 | 271 / 278 | 305 / 325 | +47 | 271 / 278 | +0 / +0 |
| WIGGLYTUFF n6 | OFF | 101 | 89 | 202 / 209 | 305 / 325 | +116 | 202 / 209 | +0 / +0 |
| WIGGLYTUFF n6 | ON | 101 | 132 | 245 / 252 | 305 / 325 | +73 | 245 / 252 | +0 / +0 |
| TYPHLOSION n6 | OFF | 101 | 172 | 285 / 292 | 305 / 325 | +33 | 285 / 292 | +0 / +0 |
| TYPHLOSION n6 | ON | 101 | 196 | 309 / 316 | 305 / 325 | +9 | 309 / 316 | +0 / +0 |
| CASTFORM n6 | OFF | 99 | 101 | 213 / 219 | 305 / 325 | +106 | 212 / 219 | -1 / +0 |
| CASTFORM n6 | ON | 99 | 156 | 268 / 274 | 305 / 325 | +51 | 267 / 274 | -1 / +0 |

"production now" is the party select's `PARTY_SENDOUT_BLANK_MESSAGE_START` (305, the blank message / next print) and the measured action menu (325 = 311 + turn-end 8 + handoff 6).
"model - ROM" is (next print, action prompt) measured from the ball; the CASTFORM next-print row is -1 (ROM `D + 11`), its prompt exact.

Calibration species (MAGBY 240, nature 6, twice fresh, `magby-*` receipts): ROM Scene OFF next print / prompt 213 / 220, Scene ON 304 / 311; model (ball 96 + D 107 / 198 + 10 / 17) 213 / 220 and 304 / 311, exact.
Production's 311 clock is exactly MAGBY Scene ON (and its 305 is the same row +1); Scene OFF MAGBY is already 105 frames late in production (325 vs 220).

## Mechanism

1. Before the ball: `Go! <NAME>!` prints at **83** from the confirm in every case (FAST text, one glyph per frame, the same constant as production's `PARTY_SENDOUT_GO_TEXT_START` 84 - 1),
   and the ball spawns when that print ends: **B = 91 + length(NAME)** from the confirm (MAGBY 96, PIDGEY 97, METAPOD / TORKOAL 98, CASTFORM 99, BULBASAUR 100, BUTTERFREE / WIGGLYTUFF / TYPHLOSION 101; all 9 species fit). Production's ball
   (visible at 99, i.e. spawned at 97) is a fixed value.
2. From B the chain is the forced send-in's: healthbox slide at B + 65 (CASTFORM 66; `hbslide` column in the rows), `SwitchIn_CleanShinyAnimShowSubstitute` (waits for the back animation only in Scene ON), `SwitchIn_HandleSoundAndEnd` (waits for the cry), then `PlayerBufferRunCommand` idles at
   `D - 2` (PIDGEY 89, METAPOD 130, TORKOAL OFF 91 / ON 196, ...). A forced switch prints "X was dragged out!" at `D`; the faint path has no such print, and the main loop reaches the next turn instead (`gBattleMainFunc`: `RunTurnActionsFunctions` at idle + 7, `BattleTurnPassed` at + 11, `HandleTurnActionSelectionState` and the action-selection print at + 12 = `D + 10`), and `HandleInputChooseAction` at idle + 19 = `D + 17` (identical offsets in all 22 rows). CASTFORM's print is one frame later.
3. The species terms are the forced model's: cry-bound (METAPOD `cry + 66`, TYPHLOSION OFF), back-animation-bound only in Scene ON (TORKOAL ON 196 vs OFF 98, nature-independent for 0 / 6 / 10; BUTTERFREE ON 155 vs OFF 93; BULBASAUR n10 ON 159 vs n0 ON 130 vs OFF 111 - the nature picks the back animation),
   slide-bound otherwise (PIDGEY, WIGGLYTUFF OFF: idle 89 = the 91 floor; TORKOAL OFF 91 and BUTTERFREE OFF 93 are just above it, cry + 66).
4. Production: `battleForcedPartySelect.sendOutElapsed` runs 0 -> `PARTY_SENDOUT_ACTION_MENU_START` (311) regardless of species and scene (`factoryRoundBattleOrchestrator.ts` `presenting-switch-in`, `partySendOutBattleMenuReady`), and `switchInTiming(0, ...)` is never consulted for the forced-menu replacement (the typed `switch-in` command's own timing is the prefix the selector's renderer owns).
   Because the segment then continues with the ordinary `turn-end` command (the push at the end of `projectBattleResolutionCommands`, no button-advance message), the action menu appears at 311 + 8 + 6 = 325, 14 frames after the calibrated clock.

## The production change this implies (not made: evidence only)

The timeline that ends the send-out is a function of three inputs production already has at the confirm: the incoming species, its nickname length and (Scene ON) its nature:

* `ball spawn = 91 + length(name)` (production fixes 97); the Go! text start 83/84 and the fade/black phases are already right.
* `next print (blank-message start) = ball + D + 10` (CASTFORM: `D + 11`; its prompt is still `D + 17`), `action menu = ball + D + 17`, with `D = sceneOn/OffPlayerForcedSwitchInDuration(species, nature)` (`src/engine/switchInTail.ts`).
  Replace the constants `PARTY_SENDOUT_BLANK_MESSAGE_START` / `PARTY_SENDOUT_ACTION_MENU_START` (and the downstream ball / release / healthbox-slide rungs, which hang off the ball: slide at ball + 65, CASTFORM 66, as the forced path already does with
  `sceneOffPlayerForcedSwitchInHealthboxSlideElapsed` / `...VisualDelay`) by functions of (species, nickname, nature, scene) evaluated at the confirm. MAGBY Scene ON must stay 304 / 311 (a unit pin).
* The 8 + 6 frames of the following `turn-end` / handoff are inside the ROM's `D + 17`, so the keyed clock must end at `D + 17 - 14` when the segment continues with `turn-end` (as `OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES` already absorbs the opponent's), or the 14 must be removed from the command tail. Which of the two is right depends on whether the calibration route had the `turn-end`: it was not run here (see Not verified).
* The `PARTY_SENDOUT_*` consumers are `partySelect.ts`, `battleScene.ts` (~13584-13625), `battleSceneCanonical.ts` (~3612-3660) and the orchestrator's `presenting-switch-in` advance: the pixel timeline of the ball / release / slide moves with `ball`, so the dense
  pixel receipts that pinned MAGBY must be re-run with the species argument.

## Not verified / caveats

* Production's 325 includes the generated-route `turn-end`; the lab calibration scenario (a lethal hit with a button-advance "fainted!" message) was not driven through production here. The MAGBY-ON 311 match is the clock, not a measured production action menu on that route.
* Pixels were not compared (no dense alignment run): the ball spawn is the sprite-allocation frame (production's "visible" rung is allocation + 2); the slide / release rungs are only taken from the forced path.
* CRY_MODE_WEAK, shiny send-ins (the shiny animation adds frames in the ROM) and the opponent's Scene ON tail are outside this window; the nature dependence in Scene ON was checked for BULBASAUR (0 / 10) and TORKOAL (0 / 6 / 10) only.
* Three states are not separate rows: Baton Pass / U-turn replacements and the player's voluntary switch-in use `PlayerHandleSwitchInAnim` too; the voluntary one was calibrated separately (`SWITCH_IN_TIMING` 91 + 11) and is untouched here.

## Reproduce (workspace root, `source /etc/pokebench-runner.env`)

```
PY=/srv/pokebench/vendor/mgba-venv/bin/python python3 tools/integration/pfr185Run.py r1 /tmp/rom-rows-r1.json tools/integration/fixtures/pfr185/cases.json      # ROM, twice fresh (r1, r2)
python3 tools/integration/pfr185AEdge.py /tmp/confirm-edge.json /tmp/pfr185/r1 /tmp/pfr185/r2                                                              # confirm-relative offsets
node --experimental-strip-types --no-warnings tools/integration/pfr185Prod.ts /tmp/prod.json 9,20,61,76,84 both                                             # production
node --experimental-strip-types --no-warnings tools/integration/pfr185Model.ts /tmp/comparison.json                                                       # table
```

Receipts: `tools/integration/fixtures/pfr185/` (`cases.json`, `rom-rows-r1/r2.json`, `confirm-edge.json`, `magby-*`, `prod-timing.json`, `comparison.json`). Driver: `tools/integration/pfr185Probe.py` / `pfr185Run.py`.
