# Issue #55 — adjacent Audio Sample / FIFO-DMA scheduler audit

This side-lane evidence checkpoint answers one narrow question: what exact
mGBA 0.10.5 source says after a Timer 0 root is due at deadline D while GBA
Audio Sample is due at D + 1. It does not change the construction clock, add
a duration constant, or claim the unrecorded LILIANA callback sequence.

The compact generated receipt is
tests/fixtures/issue55-adjacent-audio-dma-scheduler-audit-v1.json. Its Tier-1
provenance/semantic guard is
tests/issue55-adjacent-audio-dma-scheduler-audit.test.ts; its extractor is
tools/extract/extract-issue55-adjacent-audio-dma-scheduler-audit.ts.

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
Those aggregate endpoints prove a paired refill completed, but not the order
of Timer, DMA, Audio, or Video callback entries inside the edge.

The existing runtime receipt supplies two different on-time fresh dual-refill
windows: an isolated one and one with exact prior Video. Both have Audio not
due before Timer 0, request DMA1 then DMA2, observe active DMA sequence
1,1,1,1,2,1,2,2,2,2, complete DMA1 then DMA2, and reach idle after 18 master
cycles. That evidence is valid for those windows only; it is not an
Audio-at-D-plus-1 receipt and cannot be transplanted to LILIANA.

## Smallest remaining runtime observation

Retain LILIANA encrypted-accessor ordinal 23 twice fresh. From Timer 0 entry
through the first following Audio Sample callback and until DMA1/DMA2 both
become idle, record each Timer/DMA/Audio callback entry's name, priority,
relative scheduled deadline, current time, cyclesLate, active DMA, cpuBlocked,
DMA1/2 counts/deadlines, and FIFO A/B entry/exit state.

The two packets need only agree on that contiguous callback-entry sequence and
the Timer-entry-to-idle scheduler span. Until then, do not assert a LILIANA
interleaving or duration, borrow the 18-cycle isolated/Video result, or wire a
construction-clock cost.
