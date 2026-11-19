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
| 35 | 6 | CIRCLES_CROSS | `battleTransition.ts` (painter order at the crossings) | 1275/1288 -> 1288/1288 / same |
| 36 | 7 | CIRCLES_ASYMMETRIC_SPIRAL | `battleTransition.ts` | 1141/1285 -> 1285/1285 / same |
| 37 | 8 | CIRCLES_SYMMETRIC_SPIRAL | same | 1144/1288 -> 1288/1288 / same |
| 39 | 10 | CIRCLES_CROSS_IN_SEQ | same | 1168/1305 -> 1305/1305 / same |
| 41 | 11 | CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ | same | 1143/1319 -> 1319/1319 / same |

Already right and unchanged (0 bad): 34 CIRCLES_MEET_IN_SEQ, 38 CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ, 40 CIRCLES_MEET. (The id/table columns are
`battle_transition.c`'s B_TRANSITION_FRONTIER_* number and this repo's table index; the hashes come from `romFrontierTransition.py` seeds in
the scan below.) Frames counted are the whole probe recording (about 1,300 frames from the lab checkpoint through the battle intro), compared
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

- LOGO_WIGGLE (29) is not drawn (163 bad frames of 1,290; shown as CIRCLES_MEET).
- LOGO_WAVE (30), already drawn, has an older mismatch: 217 bad frames, its handoff is 209 on the ROM's clock.
- The ordinary trainer's room (`core.ts`) uses the new pictures on the engine's existing per-kind clock and handoff; there is no ordinary-room ROM
  harness, so those are unmeasured (changing the handoff could move the RNG advance).
- SQUARES_SCROLL's direction depends on whether the BGM lagged the draw by a frame (j = 0 or 1); the engine does not know j, so outside the
  Noland harness it assumes 0 and can pick the wrong direction on those seeds.
