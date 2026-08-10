# ISSUES #55 — source-operation construction clock

Side-lane implementation checkpoint, Battle Scene OFF.

`src/engine/factoryConstructionClock.ts` is the smallest executable clock
seam landed from the current evidence. It owns one raw `gRngValue` cursor and
models the source order:

1. `CreateMonWithEVSpreadNatureOTID` low/high `Random()` calls and its nature
   rejection loop;
2. `CreateMon`, EV-spread writes, and `CalculateMonStats`;
3. the Factory post-mon work (moves, friendship, held item);
4. the non-final source loop tail and next mon's argument loads; and
5. the source-function return.

Each operation is passed to a cycle-cost callback keyed by source function,
species/nature input, rejection attempt, and EV/stat work. Random operations
now carry their returned u16, attempt operations carry every assembled
candidate personality/nature/result, and CreateMon/EV/stat/Factory-post operations carry
the accepted personality required by encrypted box-mon substructure routing.
The clock also emits `factory-outer-loop` with the next source loop index and
next mon input. `reduceFactoryOuterLoopTiming` consumes only that index plus
the selectable caller's rental-rank/challenge source state; loaded mon values
do not alter this path's timing. When the accumulated cost crosses a configured
VBlank period, the clock invokes
the ambient callback once and emits a `VBlankIntr+0x87` event. No trainer id,
battle number, absolute presentation tick, or recorded cursor is read by the
model.

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

## V2 exact-cycle result

The v2 probes now bank the formerly missing facts for anchor, LILIANA, and
legal varied trainer 222: first-`Random()` master-cycle phase, phase relative
to the preceding VBlank, every personality half and nature-check boundary,
`CreateMon`, EV, final-stat, Factory-post, and source-return boundaries, plus
VBlank entry, ambient `Random()`, handler return, and actual source resume.
All three fresh probes reproduced twice byte-for-byte.

The candidate-dependent part is now source-derived. The retail compiler emits
`GetNatureFromPersonality -> __umodsi3(personality, 25)` followed by either
the rejection `bne` or accepted `CreateMon` setup. The exported
`reduceFactoryNatureAttemptTiming` walks that compiled control flow using
Emerald's configured WS0 timing: 2 cycles per sequential Thumb instruction,
+6 for a taken pipeline refill, and +1 for register `ROR`. It contains no
trainer, set, frame, cursor, or fixture branch.

Across all 278 nature-check boundaries in the three receipts, 267 measured
windows equal the reducer directly. The remaining 11 (anchor/LILIANA/varied
`5/2/4`) are each reducer +18 cycles. A fresh instruction-level anchor trace
located the +18 at a global timing-service handoff between two ordinary
2-cycle Thumb instructions; it is asynchronous hardware workload, not a
division instruction. Thus every boundary decomposes exactly into the
candidate instruction path plus either 0 or 18 external service cycles.

Exact interrupt entry-to-resume costs still vary with live VBlank audio/DMA
work (anchor 29,475–57,638; LILIANA 31,368–54,553 master cycles), and the +18
in-path service stalls show the same hardware workload is not confined to the
VBlank callback. Remaining construction operations also still need their own
source-derived budgets. Those mechanisms are not encoded by mon inputs, so
the isolated scheduler remains unwired.

The focused tests pin candidate propagation, wrong/accepted branch timing,
all 278 decompositions, clean-stream cursor identity, and the unresolved
hardware-workload evidence string. A fresh wrapped anchor v2 probe reproduced
the committed receipt byte-for-byte at SHA-256 `631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a`.

## EV-spread boundary checkpoint

The complete `CreateMon`-return to `CalculateMonStats`-entry audit is recorded
in `docs/issue55-construction-rng-schedule-receipt.md`. Its smallest newly
proven operation input is the accepted personality: each selected EV bit takes
`SetMonData -> SetBoxMonData`, whose decrypt/checksum/re-encrypt path repeatedly
executes `GetSubstruct -> __umodsi3(personality, 24)`. The scheduler now exposes
that source value on the downstream operation keys, including the Factory
friendship/held-item writes that re-enter `SetBoxMonData`. Exact ROM-fetch/EWRAM
access timing is still unported, so no observed EV duration or +18 residual is
adopted and the clock stays unwired.

## Non-final outer-loop reducer

The complete nine-span outer-loop receipt is source-reduced. The trainer-party
sibling is **130** cycles (`27×2 + 2×8 + 3×11 + 3×9`) for all four observations.
The selectable sibling's anchor branch is **261** cycles
(`61×2 + 6×8 + 5×11 + 4×9`) for all five source paths; four measure 261
directly and one measures **261 + 18** asynchronous service. All nine contain
zero complete VBlank pauses. The terms respectively count ordinary prefetched
Thumb instructions, taken control flow, PC-relative ROM literal reads, and ROM
facility-table reads in the pinned ELF.

The selectable reducer additionally models the real `i < rentalRank` arm and
`GetFactoryMonFixedIV`'s retail `challenge > 8` clamp from bounded source state.
It has no trainer/set/battle/frame/tick/cursor/fixture input, and
`sourceSetId` remains diagnostic only. This closes the outer-loop source budget
but does not change the unresolved CreateMon/EV/stat/Factory-post or live
VBlank/audio arbitration requirements, so the clock remains unwired.
