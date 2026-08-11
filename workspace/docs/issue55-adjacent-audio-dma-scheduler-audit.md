# Issue #55 — adjacent Audio Sample / FIFO-DMA scheduler audit

This side-lane evidence checkpoint answers one narrow question: what exact
mGBA 0.10.5 source says after a Timer 0 root is due at deadline D while GBA
Audio Sample is due at D + 1. It does not change the construction clock, add
a duration constant, or turn one selected runtime receipt into a general
construction-clock rule.

The compact generated receipt is
tests/fixtures/issue55-adjacent-audio-dma-scheduler-audit-v1.json. Its Tier-1
provenance/semantic guard is
tests/issue55-adjacent-audio-dma-scheduler-audit.test.ts; its extractor is
tools/extract/extract-issue55-adjacent-audio-dma-scheduler-audit.ts.
It consumes the separately committed selected LILIANA runtime packet at
tests/fixtures/factory-timer0-selected-adjacent-runtime-v1.json
(SHA-256 `a0cdb0c1952b77580bfe1e3dd4834af98c40d579484931a3bd657061f117e5fc`)
alongside the older aggregate and on-time runtime receipts.

The exact source is mGBA 0.10.5:

- Archive: https://github.com/mgba-emu/mgba/archive/refs/tags/0.10.5.tar.gz
- Root: mgba-0.10.5
- SHA-256: 91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14

The extractor hashes each source file and verifies the archive when supplied.
Run:

    node --experimental-strip-types tools/extract/extract-issue55-adjacent-audio-dma-scheduler-audit.ts \
      --source /path/to/mgba-0.10.5 \
      --archive /path/to/mgba-0.10.5.tar.gz

## Source mechanics

This section is source-derived only. It establishes queue and state-transition
rules, not a callback-entry order for any compact row.

Timing roots are ordered by absolute deadline and then lower numeric priority.
Thus Audio Sample (24) wins an equal-deadline tie with Timer 0 (32), and
Timer 0 wins an equal-deadline tie with DMA (64). That is not the relevant
comparison here: a Timer root at D is before Audio at D + 1, and FIFO DMA
created by that Timer is also placed at D, ahead of Audio by deadline even
though DMA has priority 64.

GBATimerUpdateRegister corrects its next normal overflow from current time
minus cyclesLate, preserving D + 1254. When routed FIFO occupancy and custom
DMA gates pass, Timer 0 calls FIFO A then FIFO B. GBAAudioSampleFIFO gives
their mapped DMA1/DMA2 records when = D and nextCount = 4, then calls
GBADMASchedule. Equal DMA1/DMA2 deadlines select DMA1 because GBADMAUpdate
scans channels ascending and replaces its choice only for a strictly earlier
deadline.

The selected DMA event corrects a fresh channel's when to its actual timing
current time, sets cpuBlocked, and services one word. Each word advances the
selected deadline by base 2 plus applicable first-word non-sequential or
later-word sequential waitstates, updates pointers/count, and moves every
overdue enabled DMA deadline forward to that new deadline. It then arbitrates
again. The final word marks completion and adds a terminal +2 for the
IWRAM-to-IO FIFO shape; a later DMA event clears nextCount and applies
repeat/IRQ behavior.

For the pinned default 32-bit IWRAM-to-IO four-word shape, this is four
2-cycle word advances plus terminal +2: 10 scheduled deadline cycles per
channel and a 20-cycle independent-work sum. It is neither a Timer callback
cost nor a selected-row makespan. GBAProcessEvents continues timing while
cpuBlocked, so the scheduler graph controls when CPU execution can resume.

Audio Sample is separate: it samples at corrected original deadline D + 1 and
schedules its next event at D + 1025. It does not directly request FIFO DMA.
Under the deliberately narrow zero-late model with only new DMA1/DMA2 roots
and Audio outstanding, DMA1's first word moves the DMA deadline pair to D + 2;
Audio at D + 1 then precedes the next DMA root. This is a source transition,
not a statement about the LILIANA run.

## Committed adjacent facts

Only these already-committed Battle-Scene-OFF FIFO receipt rows feed the
fixture. Their relative pre-instruction deadlines prove adjacency, not an
execution log.

| row | Timer 0 relative deadline | Audio relative deadline | other due root |
| --- | ---: | ---: | --- |
| LILIANA encrypted-accessor 23 | -1 | 0 | none |
| varied get-nature 12 | -5 | -4 | none |
| varied nature-attempt 63 | -6 | -5 | Video |

Every row is a 20-cycle instruction edge. Both FIFOs go 3,3 to 7,7, internal
remaining goes 3,3 to 2,2, and DMA1/DMA2 nextCount is zero before and after.
Those aggregate endpoints prove a paired refill completed, but do not by
themselves establish the order of Timer, DMA, Audio, or Video callback entries
inside the edge.

The older runtime receipt supplies two different on-time fresh dual-refill
windows: an isolated one and one with exact prior Video. Both have Audio not
due before Timer 0, request DMA1 then DMA2, observe active DMA sequence
1,1,1,1,2,1,2,2,2,2, complete DMA1 then DMA2, and reach idle after 18 master
cycles. That evidence remains valid for those windows only; it is not an
Audio-at-D-plus-1 receipt and is retained separately from the selected
LILIANA graph below.

## Selected LILIANA adjacent runtime receipt

The committed selected packet is byte-identical across two fresh Battle-Scene-
OFF captures. It selects LILIANA `encrypted-accessor` ordinal 23, precisely the
Timer=D / Audio=D+1 row above, and retains the full Timer/Audio/DMA hardware
boundary while wrappers are active only for the selected edge.

Its observed callback graph is: **Timer 0 (`cyclesLate=1`) → first DMA1
service (`cyclesLate=1`) → Audio Sample (`cyclesLate=0`) → the remaining DMA
service graph**. Timer requests FIFO A/DMA1 then FIFO B/DMA2; DMA1 completes
before DMA2; all four DMA `nextCount` values are zero after completion, with
`activeDma=-1` and `cpuBlocked=false`. At Audio entry, DMA1 has three words
remaining, DMA2 has four, and the CPU remains DMA-blocked.

This is a recorded selected-row order, not a service-cost measurement. It does
not assign a callback duration, infer a Timer-entry-to-idle cost, borrow the
older 18-cycle result, or wire `runFactoryConstructionClock`.

## Remaining legal factory-varied observations

The only adjacent-deadline rows still requiring separately selected runtime
packets are:

- `factory-varied` **get-nature ordinal 12** (Timer=D, Audio=D+1, no Video due)
- `factory-varied` **nature-attempt ordinal 63** (Video and Timer at D, Audio=D+1)

The LILIANA Timer-late / DMA1 / Audio-on-time order must not be transplanted
to either row. In particular, the Video-co-due row needs its own callback
graph; neither source ordering nor its aggregate FIFO endpoints supplies it.
