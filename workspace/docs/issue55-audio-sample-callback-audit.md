# Issue #55 — mGBA 0.10.5 Audio Sample callback audit

This side-lane audit answers a narrow scheduler question: what the mGBA
`GBA Audio Sample` callback itself can do around the three already-pinned
Battle-Scene-OFF construction rows that cross both Audio Sample and Timer 0.
It is evidence, not a duration reducer or construction-clock change.

The generated receipt is
`tests/fixtures/issue55-audio-sample-callback-audit-v1.json`; its Tier-1
guard is `tests/issue55-audio-sample-callback-audit.test.ts`; its source
extractor is `tools/extract/extract-issue55-audio-sample-callback-audit.ts`.
The source is the exact mGBA archive:

`https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz`

with SHA-256
`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`
and root `mgba-0.10.5`. The extractor content-hashes all six audited source
files before accepting anchors, and verifies the archive when it is supplied.

```sh
node --experimental-strip-types tools/extract/extract-issue55-audio-sample-callback-audit.ts \
  --source /path/to/mgba-0.10.5 \
  --archive /path/to/mgba-0.10.5.tar.gz
```

## Exact source behavior

`GBAAudioInit` registers `GBA Audio Sample` at priority 24. Timer 0 is
priority 32. mGBA orders roots by absolute deadline and then lower numeric
priority, so if both have the same deadline the Audio Sample callback runs
before Timer 0.

The callback `_sample` first mixes at its corrected due time
`mTimingCurrentTime - cyclesLate`, clears the two FIFO staging sample arrays
from their final current value, delivers host audio, and schedules only its
own event at `SAMPLE_INTERVAL - cyclesLate`. `SAMPLE_INTERVAL` is 1,024, so
the next Audio Sample deadline is the current callback's original deadline
plus 1,024.

The callback does not directly call `GBAAudioSampleFIFO`, `GBADMASchedule`, or
`GBARaiseIRQ`. FIFO word consumption and custom FIFO-DMA requests are in
Timer 0's `GBATimerUpdate`, after its `audio.enable` and output/timer-route
gates. Thus Audio Sample can update mixer/output state and its own event, but
does not directly create the pair of FIFO-DMA requests that Timer 0 may make.

`GBAAudioSample` has two relevant branches. A non-null optional mixer runs
`mixer->step`; when `externalMixing` is false it also adds direct-sound A/B
samples subject to their disable/output flags, while true skips those direct
adds. mGBA's built-in MP2K mixer is installed only through nonzero
`gba.audioHle`; its `_mp2kStep` source contains no timing-schedule, DMA,
FIFO-sampling, or IRQ call. The `mixer->step` and stream callbacks remain
function-pointer boundaries, so the audit makes no transitive claim about an
unrecorded host configuration. A failed `mCoreSyncProduceAudio` can set
`earlyExit`; that outcome is likewise not captured in the selected rows.

## The three rows are adjacent, not equal-deadline

The compact receipt is derived mechanically from the existing FIFO receipts:
LILIANA encrypted-accessor ordinal 23, varied get-nature ordinal 12, and
varied nature-attempt ordinal 63. All are 20-cycle instruction edges with
paired FIFO word levels `3,3 → 7,7`, internal remaining `3,3 → 2,2`, and
DMA1/DMA2 `nextCount` zero before and after the whole observed edge.

“Co-due” here only means both callbacks crossed during one instruction edge.
In every row Audio Sample's recorded deadline is **one master cycle later**
than Timer 0's. Therefore none is an exact Audio/Timer shared-deadline
observation: the source priority rule tells what would happen at equality, but
does not authorize claiming that Audio ran first in these rows. The receipt
does validate its periodic reschedule in each row:
`afterDelta = beforeDelta + 1024 - observedEdgeCycles`.

No per-callback execution graph, callback duration, or service cost is
inferred from the before/after pair.

## Selected LILIANA runtime edge

A specialized opt-in wrapper now closes the first row's live scheduler graph.
It selects outer `CalculateMonStats` encrypted-accessor ordinal 23, then the
zero-based 27th visit to the repeated division instruction at `0x082e7c3e`.
Wrappers for only Timer 0, Audio Sample, and DMA are installed at that
accessor's entry while the two relevant deadlines are still 1,092 and 529
master cycles in the future. They delegate without retention until the exact
selected instruction and restore at the last DMA completion.

Two fresh Battle-Scene-OFF runs through `tools/run-mgba-probe.py` produced
byte-identical 27,844-byte packets (SHA-256
`a0cdb0c1952b77580bfe1e3dd4834af98c40d579484931a3bd657061f117e5fc`).
The actual callback graph is Timer 0 at D (`cyclesLate=1`), one DMA1 service
callback, Audio Sample at D+1 (`cyclesLate=0`), then the remaining DMA1/2
service. Timer requests DMA1 then DMA2; completion is DMA1 then DMA2, all
`nextCount`s return to zero, and wrappers restore at callback sequence 11.
Full Timer entry/exit, Audio entry/exit, and post-completion scheduler, FIFO,
DMA0-3, audio/mixer, active-DMA, and CPU-blocked state is retained in
`tests/fixtures/factory-timer0-selected-adjacent-runtime-v1.json`.

This is adjacent-deadline evidence, not an exact-equality Audio-before-Timer
class. It does not price either callback, set `serviceCostMasterCycles`, or
wire `runFactoryConstructionClock`.

## Selected legal-varied get-nature runtime edge

The same wrapper architecture now closes get-nature ordinal 12 at
`0x082e7bf2→0x082e7bf4`. A bounded source-order scout pinned the repeated
division instruction's zero-based occurrence **4** before capture; selection
uses only the outer `CalculateMonStats` call, direct get-nature ordinal and
return class, and that occurrence. It has no frame, cycle, party, or identity
lookup.

Two fresh Battle-Scene-OFF runs completed in **12.3s / 11.6s** and produced
byte-identical 27,846-byte packets (SHA-256
`21ea415896100b66283f94b4eb5dc7cbc59c40d06b5e4495040b24a1a7910040`).
Wrappers install with Timer 0 / Audio Sample **305 / 306** master cycles in
the future. The retained graph is Timer at D (`cyclesLate=5`), DMA1's first
callback, Audio at D+1 (`cyclesLate=4`), then the remaining DMA1/2 graph.
Requests and completions are both 1→2; DMA active order is
`1,1,1,1,2,1,2,2,2,2`; completion is 18 cycles after Timer entry and all DMA
work is clear when the wrappers restore at sequence 11. Exact deadlines,
callback order, and full Timer/Audio/completion hardware are pinned in
`factoryTimer0SelectedVariedGetNatureRuntime.test.ts`.

This independently validated row remains evidence only. It does not supply a
service price or construction-clock wiring.

## Selected legal-varied nature-attempt runtime edge

Nature-attempt ordinal 63 closes the Video+Audio sibling at
`0x082e7c10→0x082e7c12`. Its bounded source-order scout pins zero-based
repeated-PC occurrence **0**. Wrappers for Video, Timer 0, Audio Sample, and
DMA install at the selected `GetNatureFromPersonality` entry with those three
roots **232 / 232 / 233** cycles in the future, then retain only from that
exact occurrence.

Two fresh OFF runs completed in **12.5s / 12.0s** and produced byte-identical
34,818-byte packets (SHA-256
`d32aa8d8abe0f0bb507a84e41c921bec046d849802f549c4a1e7408f35f684a1`).
Video@D runs first (`cyclesLate=6`), reschedules itself, and leaves all four
DMA `nextCount`s zero. Timer@D follows (`cyclesLate=6`), then DMA1's first
callback, Audio@D+1 (`cyclesLate=5`), and the remaining DMA1/2 graph.
Requests and completions are both 1→2; the DMA active order is again
`1,1,1,1,2,1,2,2,2,2`; completion is 18 cycles after Timer entry and wrappers
restore at sequence 12. The byte pin plus explicit Tier-1 assertions retain
the exact callback deadlines/order and full Video/Timer/Audio/completion
hardware.

All three natural adjacent-deadline rows are therefore closed twice fresh.
They remain three bounded runtime observations, not a generic service cost.

## Construction-state scope

The already-committed construction reachability receipt records two exact
runtime windows with audio enabled, no optional mixer, and
`externalMixing=false`; it also identifies mixer presence as optional
`gba.audioHle` behavior unavailable in this oracle and disabled audio as
outside the post-boot construction epoch. That excludes the optional HLE and
external-mixing bypass at the construction-epoch scope.

The three bounded rows do not make mixer pointers,
`externalMixing`, PSG/output-route values, stream/sync state, or callback
duration into a source-general cost model. They contain exact scheduler
timestamps only as immutable evidence, not fixture-driven production
behavior, and must not wire
`runFactoryConstructionClock`.
