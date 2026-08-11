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

## Construction-state scope

The already-committed construction reachability receipt records two exact
runtime windows with audio enabled, no optional mixer, and
`externalMixing=false`; it also identifies mixer presence as optional
`gba.audioHle` behavior unavailable in this oracle and disabled audio as
outside the post-boot construction epoch. That excludes the optional HLE and
external-mixing bypass at the construction-epoch scope.

The three compact FIFO rows do not themselves serialize mixer pointers,
`externalMixing`, PSG/output-route values, stream/sync state, or callback
duration. This audit deliberately does not promote the two-window observation
to a per-row runtime graph. It contains no absolute scheduler timestamp or
fixture-driven production behavior, and it must not wire
`runFactoryConstructionClock`.
