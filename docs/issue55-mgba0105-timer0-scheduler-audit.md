# Issue #55 — mGBA 0.10.5 Timer 0 co-due scheduler audit

This is a source-only side-lane checkpoint for the Battle-Scene-OFF oracle.
It complements `docs/issue55-mgba0105-timer0-direct-sound-audit.md`: that
receipt closes the fresh FIFO DMA arithmetic and conditional dual-refill
difference; this receipt closes event ordering and records the boundary where
the emulator's stateful work must remain external. It does not alter the
construction clock or assign `Timer 0` a fixed service cost.

The hermetic receipt is
`tests/fixtures/mgba-timer0-scheduler-v1.json`, guarded by
`tests/mgbaTimer0Scheduler.test.ts`. The pinned archive and source tree were
available at `/tmp/pokebench-mgba-0105-audit-v4BhuA`; the dev-time validator is
`tools/extract/extract-mgba-timer0-scheduler-audit.ts`. No oracle, emulator, or
network is needed by the Tier-1 test.

## Scheduler ordering

`mTimingSchedule` (`src/core/timing.c:36-59`) stores an absolute event time,
then walks the root list. It stops before an existing event only when that
event is later, or when it has the same due time and a numerically greater
priority. Therefore the exact equal-time rule is:

| priority | event | consequence at one due time |
| ---: | --- | --- |
| 0 | `GBA IRQ Event` | first among the audited events |
| 8 | `GBA Video` | before audio and Timer 0 |
| 24 | `GBA Audio Sample` | before Timer 0 |
| 32 | `GBA Timer 0` | before DMA |
| 64 | `GBA DMA` | after Timer 0 and the FIFO request it may create |

Equal priorities preserve insertion order: the insertion loop walks past an
existing event whose priority is equal to the new event. This matters for
events scheduled by a callback at a due time already represented in the root.
The callback's new event is not a special case; it is inserted by the same
list walk and then consumed by `mTimingTick`'s `nextWhen <= 0` loop.

`mTimingTick` (`src/core/timing.c:96-117`) advances `masterCycles` by its
caller-supplied `cycles`, repeatedly removes due roots, and passes
`cyclesLate = -nextWhen` to each callback. It does not charge an emulated
amount for the C callback body. If a callback schedules a due event, the same
tick can continue into it; a rerooted list can cause a zero-cycle recursive
tick after the current due list drains.

The GBA event registration in `src/gba/gba.c:126-131`, `src/gba/video.c:55-63`,
`src/gba/audio.c:34-38`, `src/gba/timer.c:66-84`, and `src/gba/dma.c:19-24`
pins the priorities above. `GBARaiseIRQ` only schedules the priority-0 IRQ
event if the interrupt is enabled and not already scheduled, at
`GBA_IRQ_DELAY - cyclesLate` (`src/gba/gba.c:550-564`). An IRQ already due is
therefore external co-due work; a Timer 0 IRQ raised at an on-time callback
normally schedules seven cycles later rather than adding a Timer 0 charge.

## What runs around a Timer 0 edge

The normal Timer 0 callback is source-ordered (`src/gba/timer.c:13-43`):

1. reschedule the normal timer using `currentTime - cyclesLate`;
2. request a timer IRQ if its flag is set;
3. sample routed FIFO A;
4. sample routed FIFO B; and
5. cascade a qualifying count-up timer.

`GBATimerUpdateRegister` (`src/gba/timer.c:86-114`) schedules the next
overflow from the corrected current time. It does not model a callback charge.
Emerald routes Direct Sound A/B to Timer 0 and DMA1/DMA2; the FIFO functions
can request DMA1, DMA2, both, or neither depending on FIFO and DMA state.

If all events are exactly co-due, the mGBA callback order is IRQ (if already
due), Video, Audio Sample, Timer 0, then DMA. Video's callback schedules its
next Hdraw/Hblank event before renderer and display DMA work. Its Hblank/Vblank
paths can start display/Hblank/Vblank DMA and request IRQs. Those side effects
are not part of a Timer 0 reducer.

`GBA Audio Sample` is a separate priority-24 event. Its interval is

```text
GBA_ARM7TDMI_FREQUENCY / 0x4000
= 0x1000000 / 0x4000
= 1024 master cycles.
```

`_sample` mixes at `mTimingCurrentTime - cyclesLate` and reschedules itself at
`SAMPLE_INTERVAL - cyclesLate` (`src/gba/audio.c:386-482`). It consumes the
already rendered Direct Sound sample arrays; it does not call
`GBAAudioSampleFIFO`. FIFO word consumption/refill is owned by Timer 0's
callback, while sample mixing and the sample event cadence remain external.

## Direct Sound DMA ownership and reduction

`GBAAudioSampleFIFO` (`src/gba/audio.c:327-374`) computes FIFO occupancy,
requests a four-word custom DMA before loading an internal word, and then
updates the audio sample state. `GBAAudioScheduleFifoDma`
(`src/gba/audio.c:120-155`) forces fixed destination and 32-bit width. The
custom path does not add the `+3` start delay used only by `GBA_DMA_TIMING_NOW`;
the request's deadline is `mTimingCurrentTime - cyclesLate`.

`GBADMAUpdate` (`src/gba/dma.c:217-241`) selects the enabled DMA with a
nonzero `nextCount` and the smallest `dma.when - currentTime`. Its ascending
DMA0..DMA3 scan uses `<`, so equal deadlines retain the first channel: DMA1
wins a same-time DMA1/DMA2 selection. The single `GBA DMA` event has priority
64.

`GBADMAService` (`src/gba/dma.c:243-333`) is the cost owner. It sets
`cpuBlocked`, charges 2 base cycles plus the non-sequential waitstate on the
first word or sequential waitstates thereafter, advances the DMA deadline,
coalesces other overdue enabled DMA deadlines, and adds terminal `+2` when
either endpoint is below `REGION_CART0`. `GBAProcessEvents`
(`src/gba/gba.c:293-339`) repeatedly ticks while blocked and leaves the CPU at
the next event if the DMA remains active.

For the pinned Emerald PCM-buffer shape (IWRAM region `0x3` to FIFO IO region
`0x4`, four 32-bit words, default waitstates 0), one fresh DMA progression is:

```text
first word:  2 + nonseq32[3] + nonseq32[4] = 2
next words:  3 × (2 + seq32[3] + seq32[4]) = 6
completion:  +2 because both regions are below REGION_CART0
total:       2 + 6 + 2 = 10 master cycles
```

This 10-cycle progression, and the 20-cycle sum for two fresh FIFO refills,
can be reduced independently as a stateful DMA subgraph. They are not a
Timer 0 callback cost. In particular, the prior receipt's observed `+18`
comparison remains only `20 - 2` for its explicitly required branch; this
audit does not fit 24/26/29 totals or any other edge total.

## Negative boundary and next observable

No source-closed `serviceCostMasterCycles` exists. mGBA's scheduler charges no
fixed callback amount, while Timer 0 can enqueue zero, one, or two FIFO DMAs;
DMA arbitration, `cyclesLate`, prior DMA state, and co-due Video/Audio/IRQ
events alter what follows. The registered reducer is intentionally narrower
than a full scheduler: it only normalizes a fresh, isolated direct-sound graph
after an explicit `audio.enable` gate, zero DMA1/DMA2 `nextCount` work, and
no-preexisting/no-competing/no-Video-started-DMA assertions. In that narrow
case, Timer 0 gives each newly requested FIFO DMA the same
`currentTime - cyclesLate` deadline. The reducer reports only the relative
fresh-service sequence, so that shared translation cancels; it correctly keeps
absolute `currentTime` and `cyclesLate` out of its API. It cannot report a
deadline or order any co-due event.

A full scheduler reducer would instead need:

- FIFO A/B read/write pointers and `internalRemaining` at the overflow;
- DMA1/2 enable, count, `nextCount`, `when`, source, destination, and timing;
- exact current time and `cyclesLate`;
- any pre-existing DMA and Video-started DMA deadlines; and
- the active audio mixer mode (the reset path has `mixer = NULL`; a mixer can
  add source-inspection side effects in `GBAAudioScheduleFifoDma`).

The next useful OFF receipt is one Timer 0 overflow window containing those
fields plus the due event names/priorities and any Audio Sample, Video, IRQ,
or DMA event co-due with it. Until that exists, keep the construction clock
and its service cost unwired.
