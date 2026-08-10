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

## V2 exact-cycle result

The v2 probes now bank the formerly missing facts for anchor, LILIANA, and
legal varied trainer 222: first-`Random()` master-cycle phase, phase relative
to the preceding VBlank, every personality half and nature-check boundary,
`CreateMon`, EV, final-stat, Factory-post, and source-return boundaries, plus
VBlank entry, ambient `Random()`, handler return, and actual source resume.
All three fresh probes reproduced twice byte-for-byte.

That evidence **refutes** one exact callback under the current
`FactoryConstructionOperation` contract:

- the low/high `Random()` boundaries are normally 80/88 master cycles, but
  `GetNatureFromPersonality` rejection costs vary with the candidate
  personality (anchor spans 755–909 source cycles). The compiled path calls
  data-dependent division; the candidate personality/RNG value is not exposed
  by `FactoryConstructionOperation`.
- exact interrupt entry-to-resume costs vary with live VBlank audio/DMA work
  (anchor 29,475–57,638; LILIANA 31,368–54,553 master cycles). Mon inputs and
  source function do not encode that state.

The next missing mechanism is therefore an instruction/source-derived clock
that can consume the actual candidate personality, plus deterministic VBlank
audio/DMA workload state and IRQ-entry latency. A species/attempt table would
only memorize these receipts and is deliberately not landed. The isolated
scheduler remains unwired.
