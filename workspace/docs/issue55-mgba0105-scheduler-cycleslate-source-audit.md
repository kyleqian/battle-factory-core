# Issue #55 — mGBA 0.10.5 scheduler `cyclesLate` absolute-deadline audit

This is a source-only, side-lane receipt for interpreting a future Battle
Scene OFF Timer 0 runtime receipt. It extends rather than replaces the
existing Timer 0 reload, Direct Sound, and co-due scheduler audits. It does
not add a production clock, fit any service constant, or claim a completed
Timer 0 service timestamp.

The checked release is the exact source archive
`https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz`, SHA-256
`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`,
whose archive root is `mgba-0.10.5/`. The audit was regenerated from that
archive's root. The byte-stable receipt is
`tests/fixtures/mgba-timer0-scheduler-cycleslate-v1.json`; its verifier is
`tests/mgbaTimer0SchedulerCyclesLate.test.ts`; its source validator is
`tools/extract/extract-mgba-timer0-scheduler-cycleslate-audit.ts`.

To reproduce it from a locally retained archive and extracted root:

```sh
node --experimental-strip-types tools/extract/extract-mgba-timer0-scheduler-cycleslate-audit.ts \
  --source /path/to/mgba-0.10.5 \
  --archive /path/to/mgba-0.10.5.tar.gz
```

The validator content-hashes all seven audited paths before it inspects any
anchor, and validates the optional archive SHA-256. It therefore rejects a
tree with the right file names but stale contents. The Tier-1 test exercises
that rejection using an isolated, deliberately stale temporary tree; it does
not require an emulator, oracle, network, archive, Homebrew, or source tree.

## Absolute scheduling semantics

The common clock is in `include/mgba/core/timing.h:13-32` and
`src/core/timing.c:36-63,96-136`. Let `M` be `masterCycles`, `R` be
`relativeCycles`, `T = M + R` be `mTimingCurrentTime`, and `d` the requested
relative delay. `mTimingSchedule` records an absolute `event.when = T + d`.
`mTimingScheduleAbsolute(W)` converts to `d = W - T`, so it records exactly
`W`.

`mTimingTick` first advances `masterCycles`, then dispatches a root when
`event.when - masterCycles <= 0` and passes:

```text
cyclesLate = -(event.when - masterCycles)
```

Within `GBAProcessEvents` (`src/gba/gba.c:293-339`), `cpu->cycles` is cleared
before `mTimingTick`, so during an ordinary callback `T - cyclesLate` is the
event's original absolute deadline `D`. This is the useful translation for a
runtime receipt: **`D = currentTime - cyclesLate`**, not “the callback took
`cyclesLate` cycles.” `mTimingTick` does not automatically bill the C callback
body any emulated cycles.

The exact source ranges and hashes are carried in the fixture. The key callback
anchors are `src/gba/timer.c:13-43,86-114`, `src/gba/audio.c:327-374,439-481`,
`src/gba/video.c:140-219`, `src/gba/dma.c:112-333`, and
`src/gba/gba.c:27,550-565`.

## Equal deadlines and `cyclesLate` propagation

`mTimingSchedule` walks an existing root at equal deadline unless the existing
priority is numerically greater (`timing.c:46-59`). Thus lower numeric priority
runs first, while equal priority retains the event already present in the
list. A callback-created event goes through that same insertion rule and is
consumed by the same `mTimingTick` loop if already due. It can reorder remaining
roots, but cannot rerun a callback already removed from the root. The
`mTimingInterrupt`/`reroot` recovery path is source-pinned too.

At one exact deadline, the registered events relevant to Timer 0 are:

| Priority | Event | Source anchor |
| ---: | --- | --- |
| 0 | `GBA IRQ Event` | `gba.c:126-131` |
| 8 | `GBA Video` | `video.c:55-63` |
| 24 | `GBA Audio Sample` | `audio.c:34-38` |
| 32 | `GBA Timer 0` | `timer.c:66-84` |
| 64 | `GBA DMA` | `dma.c:19-24` |

The deadline propagation is deliberately asymmetric:

- IRQ: `GBATestIRQ` schedules `GBA_IRQ_DELAY - cyclesLate`; with the pinned
  delay of 7 this requests `D + 7`, unless an IRQ event is already scheduled.
- Video: Hdraw/Hblank reschedule their phase with `interval - cyclesLate`, so
  their next deadline remains `D + interval`. Their Vblank/Hblank/display
  DMA starts use `currentTime + 3 - cyclesLate = D + 3`. VCount/Vblank IRQs
  request `D + 7`; the source's Hblank-specific `cyclesLate - 6` path requests
  `D + 13`.
- Audio Sample: `_sample` mixes at `D` and reschedules at `D + 1024`. It does
  not consume a Direct Sound FIFO; Timer 0 does.
- Timer 0: normal rescheduling derives `currentTime = D` before its aligned
  absolute reschedule. It then raises a timer IRQ, samples FIFO A, samples FIFO
  B, and cascades a count-up successor. A qualifying FIFO writes
  `dma.when = D` and `nextCount = 4` before shared DMA arbitration.
- DMA: `GBADMAUpdate` scans DMA0–DMA3 and changes active channel only for a
  *strictly* earlier deadline, so an exact DMA1/DMA2 tie selects DMA1. Its one
  `GBA DMA` timing event remains priority 64.

## The crucial DMA boundary

The new receipt closes a detail that a Timer 0-only model must not erase.
`_dmaEvent` (`src/gba/dma.c:185-215`) explicitly ignores its `cyclesLate`.
For a fresh transfer (`nextCount == count`) it overwrites `dma.when` with the
actual `mTimingCurrentTime`. Therefore a FIFO DMA requested by Timer 0 at `D`
but dispatched late at `T` starts its fresh DMA service timeline at **`T`**,
not `D`. A partially serviced DMA does not take that fresh-start branch: its
stored `when` is advanced by `GBADMAService`, and overdue enabled DMA deadlines
can be coalesced to it (`dma.c:243-333`).

This means that a source-correct absolute Timer 0 receipt may translate the
Timer 0 event's deadline and each *requested* FIFO DMA deadline, but cannot
translate an absolute FIFO-service completion from only those fields. Video can
create DMA deadlines at `D + 3`; queued DMA, deadline ties, late dispatch,
channel state, and IRQ state alter the actual root sequence. A pure Timer 0
dispatcher therefore must not reify its independent 10-cycle channel deadline
work as DMA service start/completion timestamps or a generic makespan.

## Runtime receipt inventory

It must record at least: Timer 0 `event.when`, dispatch current time, and
`cyclesLate`; the ordered due root list with each event's absolute deadline,
priority, and insertion order; Timer reload/control/last event; FIFO A/B
routing/pointers/internal state; all four DMA registers plus `when`,
`nextCount`, and active channel; video phase; Audio Sample deadline; and IRQ
enable/flags/queued-event state.

The committed runtime receipt now supplies this inventory for two on-time,
fresh dual-refill classes: isolated and Video-co-due-without-Video-DMA. Both
finish their shared DMA graph at Timer-entry `+18`, while the independent
channel deadline work remains `10 + 10 = 20`. The public pure dispatcher names
that sum separately from the source-reduced zero/one/dual isolated graph
makespans **0/10/18**. The graph accepts actual Timer dispatch time and the
common request deadline; fresh callback-time rebasing makes nonzero lateness a
translation for this isolated class. It still does not price Timer 0 or any
co-due callback, so `serviceCostMasterCycles` remains unset.
