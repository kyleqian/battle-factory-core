# Issue #55 — mGBA 0.10.5 Timer 0 → Direct Sound → DMA audit

This companion checkpoint narrows the unresolved Timer 0 service-cost question
for the Battle-Scene-OFF oracle. It does not alter the construction clock or
assign it a cost. The existing cadence audit remains the authority for the
1,254-cycle Timer 0 recurrence.

## Bound runtime and source

The OFF oracle loads the vendored `libmgba-py` CFFI binding. Its local
`mgba.libmgba_version_string()`, `projectVersion`, and dynamic library name all
identify **mGBA 0.10.5** (`libmgba.0.10.5.dylib`; git revision is unavailable
in the installed binary).
`bin/oracle info` remains intentionally broader at `mGBA 0.10.x`.

The source was obtained from Homebrew's `mgba` formula stable URL:

`https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz`

Its published and locally verified SHA-256 is:

`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`

The hermetic receipt at
`tests/fixtures/mgba-timer0-direct-sound-v1.json` records the reduced facts;
`tests/mgbaTimer0DirectSound.test.ts` is its Tier-1 drift guard. Regenerate or
validate source anchors without network access with:

```sh
node --experimental-strip-types tools/extract/extract-mgba-timer0-direct-sound-audit.ts \
  --source /path/to/mgba-0.10.5 --archive /path/to/mgba-0.10.5.tar.gz
```

The script validates the supplied archive if given, then validates the audit
anchors before rewriting the receipt. The test reads only the committed
fixture; it does not require the archive, Homebrew, an oracle, or an emulator.

## Source-reduced callback path

At the due edge, `mTimingTick` (`src/core/timing.c:96-116`) removes a root
event whenever `event.when - masterCycles <= 0` and calls it with
`cyclesLate = -(event.when - masterCycles)`. Its insertion rule orders an
earlier due time first, then a lower numeric priority; equal priorities retain
their existing insertion order.

`GBATimerInit` (`src/gba/timer.c:66-84`) names Timer 0 `GBA Timer 0` and gives
it priority 32. Its normal-overflow callback does the following in this exact
order (`timer.c:13-43`):

1. reschedule a normal (non-count-up) timer;
2. raise a timer IRQ only if the IRQ flag is set;
3. sample routed FIFO A;
4. sample routed FIFO B; then
5. cascade a qualifying count-up successor.

The Pokémon m4a configuration has no Timer 0 IRQ bit, routes FIFO A and FIFO
B to Timer 0, and enables their output bits. `GBATimerUpdateRegister`
(`timer.c:86-114`) computes `currentTime = mTimingCurrentTime - cyclesLate`
before its absolute reschedule. Therefore dispatch lateness does not slide the
next Timer 0 overflow phase; it can affect work requested by that callback.

For each routed FIFO, `GBAAudioSampleFIFO` (`src/gba/audio.c:327-350`) computes
the modular FIFO word count, then *before* it loads a word into its internal
sample, requests a refill only when all of these are true:

- the 8-word FIFO has more than 4 free words (at most 3 queued words);
- the channel has a positive DMA source (A maps to DMA1, B to DMA2);
- that DMA is custom-timed; and
- it remains enabled when `GBADMAUpdate` selects active work.

The request sets `dma.when = currentTime - cyclesLate` and `nextCount = 4`.
`GBADMASchedule` then forces FIFO DMA1/2 to fixed-destination, 32-bit mode.
There is no custom-DMA start-delay `+3` on this route; that delay belongs only
to the NOW branch.

`GBADMAUpdate` (`src/gba/dma.c:217-241`) chooses the enabled channel with a
nonzero `nextCount` and least `dma.when - currentTime`; a tie retains the
lower-numbered first scan result. It schedules the single `GBA DMA` event at
priority 64. Each `GBADMAService` sets `cpuBlocked`, advances that DMA's
`when`, then may move other overdue enabled DMA deadlines forward to the same
time. `GBAProcessEvents` (`src/gba/gba.c:293-339`) repeatedly ticks while
blocked and leaves `cpu.cycles` at `cpu.nextEvent` if still blocked. Thus the
emulator accounts DMA by timing-event progression and CPU stalling, not by an
unconditional C callback charge.

## Arithmetic that closes — per-channel 10 and source-reduced dual-refill 18

Pokémon Emerald assigns the m4a PCM buffer to `gSoundInfo` in IWRAM and maps
DMA1 to FIFO A and DMA2 to FIFO B (`src/m4a.c:353-398`; the buffer is embedded
in `struct SoundInfo` at `include/gba/m4a_internal.h:190-220`). For one fresh,
enabled, custom 4-word request from IWRAM region `0x03` to FIFO IO region
`0x04`, with `count == nextCount == 4`, mGBA's exact schedule arithmetic is:

| part | source arithmetic | master cycles |
| --- | --- | ---: |
| first 32-bit word | `2 + nonseq32[3] + nonseq32[4] = 2 + 0 + 0` | 2 |
| next three words | `3 × (2 + seq32[3] + seq32[4]) = 3 × (2 + 0 + 0)` | 6 |
| completion edge | `+2` because source/destination are below `REGION_CART0` | 2 |
| per-channel scheduled deadline advance | `2 + 6 + 2` | **10** |

This is the smallest per-channel fact claimed by this audit: a fresh DMA's
own scheduled deadline advances by **10** master cycles. It is deadline work,
not an observed service start or completion timestamp; it is not an invariant
Timer 0 callback cost and it is not 18.

Timer 0 tests FIFO A before FIFO B, and the Emerald configuration routes both
to Timer 0. If both requests are fresh and isolated, `GBADMAUpdate` selects
DMA1 on the common-deadline tie. Its first callback rebases DMA1 to actual
dispatch time. Each of DMA1's four 2-cycle words coalesces overdue DMA2 to the
new word deadline; crucially, that coalescing happens before DMA1 receives its
terminal +2. DMA2 therefore wins at +8 while DMA1's completion is due at +10.
DMA2's first word also reaches +10, where ascending-channel arbitration clears
DMA1 before DMA2 continues; DMA2's last word and sentinel finish at +16/+18.

Thus zero, one, and dual fresh isolated graphs complete in **0**, **10**, and
**18** cycles. The dual value is computed by callback-time rebasing, per-word
progression, pre-terminal coalescing, and channel arbitration; it is not the
independent-work sum `10 + 10 = 20`, a fitted receipt value, or a Timer 0
service-cost constant. A late Timer callback produces the same relative graph:
the common requested deadline is in the past, but the first fresh DMA rebases
to actual dispatch time. The committed runtime receipts confirm this derived
order for on-time and late adjacent Audio cases.

## Pure dispatch registration

`dispatchFactoryTimer0DirectSound` now implements only the source-closed
conditional branch above. Its input is semantic source state: the modular
queued-word threshold, Timer/output routing, DMA source mapping, custom-timing
and enable eligibility, the global `gba->audio.enable` gate, and the audited
four-word IWRAM-to-FIFO mode. A caller must additionally assert isolated DMA
ownership: no pre-existing work, no competing DMA work, and no
Video-started DMA work. Every represented DMA1/DMA2 has an explicit pre-Timer
0 `nextCountWords == 0`; a pending transfer is rejected rather than serialized
as if it were fresh. With the global audio gate false, mGBA does not enter
either FIFO sampler, so the reducer returns the empty zero-cycle graph.

The dispatcher samples A before B and returns both the ordered per-channel
deadline work (sum 0/10/20) and `freshDmaGraph`, the source-reduced shared
timeline (makespan 0/10/18). The standalone graph reducer accepts actual Timer
dispatch time plus the common `currentTime - cyclesLate` request deadline, so
Tier 1 pins late common translation without introducing a case/tick lookup.
Invalid FIFO levels, channel mappings, regions, modes, counts, pending work,
future request deadlines, reversed/duplicate channels, or ownership assertions
are rejected rather than generalized beyond the audit.

`dispatchFactoryTimer0CadenceWithDirectSound` composes this reducer with the
existing cadence registration. Every crossed period requires its own explicit
Direct Sound state, including repeated late crossings, while recurrence stays
anchored to the original due phase. It does not synthesize state evolution
between crossings. Tier-1 coverage is in
`tests/factoryTimer0DirectSoundDispatch.test.ts`.

This closes the pure isolated fresh FIFO-DMA graph, not the construction clock.
`serviceCostMasterCycles` remains `null`: Timer callback overhead, non-isolated
or pending DMA, Video-started DMA, and co-due Video/Audio/IRQ callbacks remain
outside this reducer. `runFactoryConstructionClock` is still unwired.

## Absolute runtime composition follow-up

The fresh callback-entry receipt in the companion scheduler audit independently
confirms the reducer: service order `1,1,1,1,2,1,2,2,2,2`, DMA2's first word
at +8, DMA1 completion at +10, and final idle at +18. The 20-cycle instruction
edge is a 2-cycle CPU instruction plus the 18-cycle blocked graph. This still
does not create an unconditional Timer callback cost.
