# Ordinary Factory entry: sSpriteOrder evidence (Scene ON)

Closes the gap in `docs/sprite-order-provider-design.md`: the proven corpus was BattleLab-staged only; the real playable
game uses `ordinary-factory` (`factoryRoundBattleOrchestrator.ts` seeds `createKnownEntrySpriteAllocatorProvider("ordinary-factory")`).

## Route (cited, not invented)
`tools/compare/traces-groundtruth/battle1-turn1.json` (44 segments, 2900 frames; extends `battle1-intro.json`, see
`docs/battle-bringup-notes.md` "Slice-0 ground truth" §1): from the `oracle/bootstrap/factory.json` open Level-50
rental draft, rent 1/2/3 + YES, exit sequence, trainer intro, first action prompt, FIGHT, first move. Plain button input.

## Probe
`tools/compare/spriteOrderFactoryEntryProbe.py <trace.json> <out.json> [label]` (adapted from `spriteOrderEventProbe.py`,
same `sprite-order-event-raw/v2` rows plus `route`, `label`, `endState` = party personalities + gRngValue at trace end).
Run through `tools/run-mgba-probe.py`, direct in-process mGBA, Scene ON bootstrap `factory.json`, never the HTTP oracles.

## Runs (`tools/integration/fixtures/sprite-order-factory-raw/`, two fresh runs each, byte-identical)
| scenario | opponent lead personality | first move (sAnimMoveIndex) | frames kept | notes |
|---|---|---|---|---|
| `battle1-turn1` (canonical) | 1094072807 | 104 | 1057..2900 (1844) | ResetSpriteData at frame 1057, first move alloc at 1964 |
| `battle1-turn1-varB` | 160268132 | 157 | 1041..2901 (1861) | `…/sprite-order-factory-traces/battle1-turn1-varB.json`: canonical script with segment 1 idle 28->29 frames, shifting boot RNG cursor: different opponent lead and different first move, same player rentals |

Not covered: different player rentals (cursor-picking variants tried did not change the draft), battle 2+ after a win,
doubles, other facilities. The entry stream is a function of source controllers, so these are expected equal but unproven.

## Comparison (tests/spriteOrderProvider.test.ts, "ordinary Factory entry")
- Per-window `[created, destroyedInArrayOrder]` stream from ResetSpriteData: the first 78 windows are IDENTICAL to
  `BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS` in both scenarios (the 78th is the cursor pair destroyed `[4,3]`).
- Free order just before the first move's first allocation (frame 1964, creates `[3,4]`) equals
  `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` in both scenarios.
- Occupied set at that point `[0,1,2,6,8,60,61,62,63]` equals `createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove` occupants
  (ROM-confirms the allocator's Factory route).
- Per-frame provider replay over all kept frames: 0 misses.

## Result
`knownEntrySpriteOrderState("ordinary-factory")` now returns the known state (same windows table).
