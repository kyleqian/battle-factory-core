# ISSUES #55 — source-operation construction clock

Side-lane implementation checkpoint, Battle Scene OFF.

`src/engine/factoryConstructionClock.ts` is the smallest executable clock
seam landed from the current evidence. It owns one raw `gRngValue` cursor and
models the source order:

1. `CreateMonWithEVSpreadNatureOTID` low/high `Random()` calls and its nature
   rejection loop;
2. `CreateMon`, EV-spread writes, and `CalculateMonStats`;
3. the Factory post-mon work (moves, friendship, held item); and
4. the source-function return.

Each operation is passed to a cycle-cost callback keyed by source function,
species/nature input, rejection attempt, and EV/stat work. When the accumulated
cost crosses a configured VBlank period, the clock invokes the ambient callback
once and emits a `VBlankIntr+0x87` event. No trainer id, battle number,
absolute presentation tick, or recorded cursor is read by the model.

## What is pinned

`tests/factoryConstructionClock.test.ts` pins a deterministic two-mon clock
with exact construction/ambient tag order, frame histogram, per-mon entry
cursors, personalities, ambient cursors, and final cursor. It also runs the
three committed receipt inputs through the separately named clean stream:

| receipt | construction | ambient | total | frames |
| --- | ---: | ---: | ---: | ---: |
| anchor, six rentals | 242 | 52 | 294 | 53 |
| LILIANA, three opponents | 112 | 31 | 143 | 32 |
| legal varied, three opponents | 202 | 30 | 232 | 31 |

The existing `tests/factoryConstructionRngScheduleReceipt.test.ts` remains the
gapless exact receipt check for all 294/143/232 tagged events and all six/three/
three personality boundaries. The clean stream deliberately omits the ambient
callback and therefore remains the old source-state-only result; it is not
claimed to reproduce later live personalities.

## Exact-live boundary

The committed v1 receipt has frame numbers and LCG edges, but no initial
master-cycle phase at the first construction call and no source-operation CPU
cycle budget. It consequently cannot identify one source-general live clock:
the same `FillFactoryFrontierTrainerParty` path has attempt vectors `[13, 7,
36]` and `[59, 12, 30]`, with different frame gaps `[10, 12]` and `[11, 10]`.
The scheduler accepts those missing facts as an explicit callback rather than
fitting a per-receipt table. The focused test names the remaining evidence:

- initial mGBA master-cycle phase at the first construction `Random()`;
- cycle budget for each source construction phase; and
- VBlank callback cycle cost/order at each crossed period.

For fresh probe work, `tools/probe/trace-factory-construction-rng.py` has an
opt-in `FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1` mode that records mGBA
`globalCycles` and `frameCycles` without changing the committed v1 receipt
schema. That is the next source/cycle evidence needed before a main-lane live
caller can claim personality-exact timing.

