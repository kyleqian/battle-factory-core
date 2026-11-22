# trn225: the Frontier battle transitions drawn from source

The Factory's 12 battle transitions (`sBattleTransitionTable_BattleFrontier`, battle_setup.c:132-145) were drawn by the engine for only five
(LOGO_WAVE, CIRCLES_MEET, CIRCLES_CROSS, CIRCLES_MEET_IN_SEQ, CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ); the rest fell back to CIRCLES_MEET. This
step draws six more from source, each with its own picture, start clock, end and handoff into the battle intro, ROM-measured in both scenes.
Battle RNG, kernel events and outcomes are untouched (the draw was already taken for all 12, and both scenes share the rule).

## Done (0 bad frames against the ROM over the whole transition window into the battle intro, both scenes)

| id | table | transition | where | matched frames before -> after (OFF / ON) |
|---|---|---|---|---|
| 31 | 2 | SQUARES | `src/engine/battleTransitionSquares.ts` | 1115/1278 -> 1278/1278 / same |
| 32 | 3 | SQUARES_SCROLL | same | 1123/1317 -> 1317/1317 / same (seed 18; OFF seeds 21 and 23 also 0 bad) |
| 35 | 5 | CIRCLES_CROSS | `battleTransition.ts` (painter order at the crossings) | 1275/1288 -> 1288/1288 / same |
| 36 | 6 | CIRCLES_ASYMMETRIC_SPIRAL | `battleTransition.ts` | 1141/1285 -> 1285/1285 / same |
| 37 | 7 | CIRCLES_SYMMETRIC_SPIRAL | same | 1144/1288 -> 1288/1288 / same |
| 39 | 9 | CIRCLES_CROSS_IN_SEQ | same | 1168/1305 -> 1305/1305 / same |
| 41 | 11 | CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ | same | 1143/1319 -> 1319/1319 / same |

Already right and unchanged (0 bad): 34 CIRCLES_MEET_IN_SEQ, 38 CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ, 40 CIRCLES_MEET. (The id column is
`battle_transition.c`'s B_TRANSITION_FRONTIER_* number, the table column this repo's table index; id 33 is not in the Frontier table.) Frames counted are the whole probe recording (about 1,300 frames from the lab checkpoint through the battle intro), compared
with `nolandSceneEngine.ts` against a ROM recording that forces the transition id.

## Clocks (all measured on the ROM)

- The transition clock `te` is anchored to the battle BGM. The draw (task creation) is the frame with the VBlank advance and the Random()
  together; the BGM comes on it or one frame later (seeds 7, 21, 23, 28: one later). The circle families create their sprites at te 78 + offset.
- SQUARES / SQUARES_SCROLL: the task's Init runs on te 77; the callback `c` shows its BG0 tilemap copy on te 77 + c; direct VRAM and register
  writes show a frame before DMA'd tilemap and palette. The first Shrink tileset load tears the frame at scanline 23. SQUARES ends on te 168
  (handoff 171), SQUARES_SCROLL on te 207 (handoff 210, end + 3).
- SQUARES_SCROLL: BG0VOFS follows gBattle_BG0_X and BG0HOFS gBattle_BG0_Y; the scroll steps every second callback, with five steps landing a
  callback late (done 37, 65, 75, 113, 129); tilemap writes wrap at 32 in x and y. The direction is `Random() % 4` in the Init; its RNG state is
  the draw's post-state advanced 51 times (49 plain frames, the Init frame's VBlank advance and the call), `squaresScrollDirectionIndex`.
- The SortSprites painter order is replayed for the circle kinds (ties at the crossings).

## Noland room recordings (docs/parity-mac/noland-room-scenes.md)

The five recordings that drew a transition were re-recorded in full and are compared past it, to the frame Noland's team first shows
differently (the engine rolls his team from its own stream): silver-first-slow 1,239 -> 1,622 (it draws SQUARES_SCROLL, not 11: the BGM came a
frame after the draw), silver-first-b 1,089 -> 1,457, gold-heard / return-42 / gold-heard-scene-on 546 -> 882. `romTransitionTableIndex` now reads
the draw frame's RNG row (the fixture keeps it on the frame before the BGM when that is the draw frame).

## Tests

- `tests/battleTransitionFrontierSquares.test.ts` (clock, end, handoff, direction, pictures) and the extended
  `tests/battleTransitionFrontier.test.ts`; `tests/parityMacNolandRoomScenes.test.ts` is the ROM-grade pin (the five lifted fixtures fail on the
  commit before this step; the new squares test fails there because the module does not exist).

## Seed -> id scan (probe-only, seeds 0..59)

29: 25 45 8; 30: 13 26 41 54 9; 31: 12 1; 32: 18 21 23 44; 34: 14 17 29 49; 35: 28 30 36 39 53; 36: 31 34 35 38 48 50 57 5; 37: 11 19 20 43 55 7;
38: 42 58; 39: 10 4; 40: 15 22 27 2 and others; 41: 16 24 47 6 3.

## Open remainder (ISSUES #225)

- The ordinary trainer's room (`core.ts`) uses the new pictures on the engine's existing per-kind clock and handoff; there is no ordinary-room ROM
  harness, so those are unmeasured (changing the handoff could move the RNG advance).
- SQUARES_SCROLL's direction depends on whether the BGM lagged the draw by a frame (j = 0 or 1); the engine does not know j, so outside the
  Noland harness it assumes 0 and can pick the wrong direction on those seeds.

## trn226: LOGO_WIGGLE (29) and LOGO_WAVE (30)

Bad frames (`shaMismatch` of `nolandSceneEngine.ts` over the whole ROM recording, Scene OFF and ON identical):

| id | seeds | before | after | summary line (OFF; ON is the same numbers) |
|---|---|---|---|---|
| 29 LOGO_WIGGLE | 25 | 163 of 1,294 | 0 | `frames 1294 sha-mismatch 0 draws-mismatch 1294 rng-mismatch 277 gate-mismatch 0 sound-mismatch 13 late []` |
| 29 | 45 | | 0 | `frames 1293 sha-mismatch 0 ... rng-mismatch 276` |
| 29 | 8 | | 0 | `frames 1290 sha-mismatch 0 ... rng-mismatch 273` |
| 30 LOGO_WAVE | 13 | 217 of 1,314 | 0 | `frames 1314 sha-mismatch 0` |
| 30 | 26 / 41 / 54 / 9 | | 0 | frames 1309 / 1307 / 1312 / 1315, `sha-mismatch 0` |

(`draws-mismatch` and `rng-mismatch` are the harness artifact: the engine rolls its own team; they are the same before and after.)

- LOGO_WAVE: the Noland-room path started its clock at te 26 like the circles, but the wave's constants (flicker te 34, main te 84, handoff 209)
  put the task's creation at te 32 (`LOGO_WAVE_TRANSITION_START_TE`, `battleRoom.ts`); the ROM's flicker starts two frames after it. With the
  right start all 217 frames match. On the brain path the wave's handoff stays te 209 and so comes 6 frames earlier in elapsed frames; the
  ordinary room (`core.ts`, `BATTLE_2_SCENE_HANDOFF_ELAPSED = 209`) was not touched.
- LOGO_WIGGLE (`src/engine/battleTransitionLogoWiggle.ts`): the PatternWeave state machine (battle_transition.c:1375-1745) on the Frontier logo.
  Init runs on te 77, callback `c` shows on te 78 + c. Blend (BLDALPHA, BG0 as target 1, eva = tBlendTarget2, evb = tBlendTarget1; 8-bit
  `(top*eva + under*evb) >> 4`) fades the logo in (eva +1 every third callback to 16), then the room out (evb 16 -> 0, c 32..62); the HBlank
  DMA scrolls BG0 by `SetSinWave` (amplitude 0x4000 - 256 per callback), scanline y uses buffer[y-1] and scanline 0 the previous frame's last
  write (c = 63 shows -1 there); from c = 64 SetCircularMask closes WIN0H (scanline 0 again the previous frame's last entry, the whole
  screen before the first mask frame). The task ends on te 184 (c = 106, black from there) and CB2_InitBattle's handoff is te 187 (end + 3).
  `battleIntroSceneAssemblyDisplayLag` stays 0 for it (post-handoff frames match).
- Census `tools/integration/lsd194Census.sh` seeds 0..199, base 5819467ba vs HEAD: eventsDigest identical 200/200 in both scenes (61,381 / 62,965
  commands, byte-identical shards); `tests/randomRoundSoak*.test.ts` pass unpinned-changed (9 files, 120 tests): no gameplay or RNG change.
- Tests: `tests/battleTransitionFrontierLogo.test.ts` (wave start/handoff, wiggle blend weights, wave, mask, end/handoff, render).
- Website: only the Noland-room path (battle room started through the brain) changes length: LOGO_WAVE ends 6 frames earlier and LOGO_WIGGLE has its
  own length (handoff te 187 instead of the circles' ~202); the ordinary room's frame count is unchanged, so the play layer needs no change.

## nrv1: does trn226 move the Head battle's RNG? (post-freeze verification, no src/tests change)

Question: the ROM advances `Random()` once per VBlank outside a battle, so the Noland-room and transition frames before CB2_InitBattle feed the battle's
`gRngValue`; trn226 shortened LOGO_WAVE by 6 frames and LOGO_WIGGLE by ~15. Is the engine's RNG at the Head battle's start now closer to or further from the
ROM's?

**Answer: no change, and no regression. The engine's Head battle RNG does not depend on the room's frame count at all (it never equalled the ROM's, before or after
trn226).** What trn226 did change is the engine's hand-over frame, and it moved it onto the ROM's: for every id the engine's hand-over is now ROM CB2_InitBattle + 3.

Note on the baseline: master `62ebcc5b3` already contains trn226 (`c29634f3c` / `6279ba202` are its ancestors), so "before" below is `5819467ba` (the parent of
`c29634f3c`, the base the trn226 census used) and "after" is this tree. The only src files between them that the room reads are `battleRoom.ts` /
`battleTransition.ts` / the new `battleTransitionLogoWiggle.ts`.

### Why (source and engine)

- ROM: gRngValue after the room's last input (silver: frame 1016, the box is gone on 1018) takes one step per VBlank (171..219 frames to CB2_InitBattle) plus
  the non-VBlank draws of the Head's setup: FillFactoryBrainParty (battle_factory.c:759, called from battle_tower.c:1857) and GetSpecialBattleTransition
  (battle_tower.c:2099). Measured: from the frame before the cursors first differ to CB2_InitBattle the ROM takes 269..679 LCG steps in the 15 recordings that
  diverge at 1018 (up to 1,040 in the earlier-diverging ones, which start counting sooner), against 171..219 frames of the whole input-to-init span.
- Engine: the room's per-frame cursor (`state.rngValue`, one VBlank step per frame) matches the ROM's up to the frame the party build starts (first divergence
  frame 1018 in 15 of the 20 recordings, the box-gone frame; the other five diverge earlier, 288 x3 and 657 x2 (silver s31 off/on, gold s13, gold s25 / s18), identical before and after, not investigated). From there the
  engine does not follow the ROM: Noland's team and the transition are drawn from the round controller's gameplay stream (`scheduledBrainOpponent`,
  `factoryRoundBattleOrchestrator.ts:860-882`: "the two independent RNG systems", the design forbids wiring them), and the battle is created from
  `state.round.rules.rngValue` (`startCurrentBattle`, `rngSeed`) plus `preCommandRngCalls`, never from the room's cursor. So the frame count cannot reach the
  battle's RNG; the cursor after the hand-over is display state that the battle's own `rng.value` replaces (core.ts, `rngMode: "frontierBattle"`).
- This is the documented non-goal of docs/parity-mac/noland-room-scenes.md ("Noland's team and the transition come from the engine's gameplay RNG, not the
  room's per-frame cursor"); trn226's census (eventsDigest identical 200/200) agrees.

### Measurement

Tool: `tools/integration/nrv1RngAtBattleStart.ts ROM.json...` (JSON lines). ROM recordings: `tools/audio/romFrontierTransition.py ... --seed N --profile off|on
--sound` (now also records `enemyParty`, Noland's three species at CB2_InitBattle), the silver (challenge 2) lab walk-up with the silver-first fixture's presses,
and challenge 5 (gold) with the gold-first presses. The engine is staged at the same GO ON menu and ticked with the ROM's presses twice: `forced` (the ROM's
transition id and pause, `nolandSceneEngine.ts`' harness) and `free` (`driveEngine(..., { follow: false })`: the engine's own pause and transition draw). Evidence:
`.integration/evidence/nrv1/` (`rom-*.json`, `before/`, `after/`, `base-tree/` = `git archive 5819467ba`). Scene OFF and ON recordings (ids 29, 30, 32, 36, 41) have identical init frame and
gRngValue at init, and identical engine results.

Per transition id (silver, seed in brackets; "frames" = last room input (1016) to CB2_InitBattle; engine = frames from the same input to its hand-over, forced
to the ROM's id; the difference to the ROM in brackets):

| id | ROM frames | ROM gRngValue at CB2_InitBattle | engine frames before trn226 | engine frames after trn226 | engine battle seed (same before / after) |
|---|---|---|---|---|---|
| 29 LOGO_WIGGLE (25) | 188 | 3356037855 | 201 (+13) | 191 (+3) | 2909399924 |
| 30 LOGO_WAVE (13) | 208 | 1179800352 | 217 (+9) | 211 (+3) | 1762185886 |
| 31 SQUARES (12) | 171 | 772590910 | 174 (+3) | 174 (+3) | 3119917829 |
| 32 SQUARES_SCROLL (18) | 211 | 2384847758 | 214 (+3) | 214 (+3) | 3225055100 |
| 34 CIRCLES_MEET (14) | 202 | 1856164856 | 205 (+3) | 205 (+3) | 2755905075 |
| 35 CIRCLES_CROSS (28) | 182 | 2138144206 | 185 (+3) | 185 (+3) | 1965489608 |
| 36 ASYMMETRIC_SPIRAL (31) | 181 | 2109551667 | 184 (+3) | 184 (+3) | 1843668319 |
| 37 SYMMETRIC_SPIRAL (11) | 187 | 3493960024 | 190 (+3) | 190 (+3) | 621885184 |
| 38 MEET_IN_SEQ (42) | 206 | 156923694 | 209 (+3) | 209 (+3) | 2382060773 |
| 39 CROSS_IN_SEQ (10) | 202 | 1220395050 | 205 (+3) | 205 (+3) | 158840574 |
| 40 ASYMMETRIC_SPIRAL_IN_SEQ (15) | 219 | 1124019608 | 222 (+3) | 222 (+3) | 203113660 |
| 41 SYMMETRIC_SPIRAL_IN_SEQ (16) | 218 | 3134504208 | 221 (+3) | 221 (+3) | 1967021741 |

(Id names follow the table order of `sBattleTransitionTable_BattleFrontier`; the engine's own names are in `engineTransitionName` of the evidence.) Gold, the
same room timeline from its last input (655): ids 39 (seed 13) 198 -> 201 (+3), 40 (seeds 25 / 18) 213 -> 216 (+3), unchanged by trn226. Free runs (the engine's
own id): the ids the engine itself drew were 40, 31, 36, 39, 39, 35, 30, 31, 31, 31, 39, 39 (silver) and 36, 29, 35 (gold); only the runs that drew 29 or 30 changed
length (217 -> 211, 205 -> 195), all else identical.

What differs between before and after, over all 20 recordings x 2 modes: the hand-over frame of ids 29 / 30 and, with it, `state.rngValue` at the hand-over
(ids 29 / 30 only: 10 / 6 fewer LCG steps, the display cursor). Not changed: the engine's battle seed, the battle's RNG when the engine creates it (id 29: value
2835076606, 2 calls; id 30: 1355541048, 2 calls, ~550 frames after the hand-over), Noland's team (`engineOpponentSetIds`), the first divergence frame.

### ROM vs engine, and the first RNG-dependent outcome

- gRngValue at the battle start never equals the ROM's, before or after trn226 (0 of 40 runs): ROM at CB2_InitBattle is the table's third column; the engine's
  battle seed / creation value are the table's last column and the creation values (e.g. id 29: 2835076606 vs ROM 3356037855). Equality would need the
  party-build draws (the extra LCG steps beyond one per frame) modelled in the room's cursor, which the engine does not do (it draws the team from its own stream).
- The first RNG-dependent outcome that differs is Noland's team, fixed before the battle starts: the ROM's three species vs the engine's differ in 40 of 40 runs
  (all leads differ; e.g. seed 25: ROM 348 / 159 / 127, engine 8 / 148 / 127), so every later outcome (send-outs, the AI's choices, damage rolls) is the engine's
  own. The transition id the engine draws is likewise its own (free runs: the ROM's id was reproduced in 1 of 20).
- trn226 therefore did not turn a match into a mismatch: before it the Head's battle RNG was already independent of the room frames; the visible effect is only
  that ids 29 / 30 now take as long as the ROM's (+3 for every id, a constant measured over all 20 forced runs; cf. `GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY`).
- Residual (not a regression, not new): the engine's pause before the transition is fixed at 32 frames (a fixed constant, `BRAIN_BATTLE_TRANSITION_START_ELAPSED`; the ROM's equivalent is not measured here), so in `free` runs
  the engine's frames from the last input to the hand-over differ from the ROM's by the id it drew plus that pause; making the Head battle's RNG equal to
  the ROM's would be a separate feature (model FillFactoryBrainParty's draws and the VBlank steps in the room cursor and seed the battle from it).
