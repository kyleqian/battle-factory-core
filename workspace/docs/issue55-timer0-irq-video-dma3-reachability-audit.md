# Issue #55 — Timer 0 IRQ, Video-started DMA, and immediate DMA3 reachability

This side-lane receipt closes only a bounded set of remaining scheduler
classes for ordinary Battle-Scene-OFF Battle Factory construction. It does not
price the Timer 0 callback, wire the construction clock, or generalize a
finite observation into a game-wide DMA rule.

The canonical receipt is
`tests/fixtures/factory-timer0-irq-video-dma3-reachability-audit-v1.json`.
Its hermetic Tier-1 guard is
`tests/factoryTimer0IrqVideoDma3ReachabilityAudit.test.ts`; the dev-time
extractor is
`tools/extract/extract-factory-timer0-irq-video-dma3-reachability-audit.ts`.
It accepts only a pinned Emerald source tree and an mGBA 0.10.5 source tree:

```sh
node --experimental-strip-types \
  tools/extract/extract-factory-timer0-irq-video-dma3-reachability-audit.ts \
  --pokeemerald-source reference/pokeemerald \
  --mgba-source /path/to/mgba-0.10.5 \
  --out /tmp/issue55-irq-video-dma3.json
```

The mGBA release is the archive with SHA-256
`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`.
The extractor checks every cited source anchor before it writes, and the test
mutates a source anchor to prove stale-source rejection. The test synthesizes
only the audited text plus committed fixtures, so it needs no oracle,
emulator, network, archive, or retained source checkout.

## Timer 0 does not create an IRQ event in the audited MP2K path

Emerald's `SampleFreqSet` (`src/m4a.c:400-430`) disables Timer 0, selects the
sample-rate reload, invokes the paired FIFO setup, waits for VCOUNT 159, then
writes:

```c
REG_TM0CNT_H = TIMER_ENABLE | TIMER_1CLK;
```

`TIMER_INTR_ENABLE` is `0x40`; `TIMER_ENABLE` is `0x80`. Thus normal MP2K
Timer 0 is enabled but has no timer-IRQ bit. This is a **source invariant for
that MP2K setup path**, not an assertion that no code can ever change Timer 0.

mGBA 0.10.5 derives the DoIrq flag from control bit `0x0040`
(`src/gba/timer.c:86-114`) and at overflow calls `GBARaiseIRQ` only when that
flag is set (`timer.c:13-43`). `GBARaiseIRQ` sets IF, then `GBATestIRQ`
schedules the priority-0 `GBA IRQ Event` only if IE intersects IF; the request
is `GBA_IRQ_DELAY - cyclesLate`, with delay 7 (`src/gba/gba.c:27,126-131,
550-565`). Because MP2K omits `0x40`, its Timer 0 overflow cannot take that
route in the audited construction state, regardless of an otherwise enabled
Timer 0 bit in IE.

The finite construction census independently agrees: all **256** selected
Timer 0 crossings (126 anchor, 57 LILIANA, 73 legal-varied) record
`TM0CNT_H = 0x0080`, zero Timer 0 IRQ-enable bits, and zero `GBA IRQ Event`
occurrences across their 512 before/after scheduler snapshots. Those are
observations, not a claim that VBlank, serial, Timer 3, DMA completion, or an
externally reconfigured Timer 0 cannot schedule an IRQ event.

## What the Video callback can start

mGBA's priority-8 Video event calls `GBADMARunVblank` at VBlank and
`GBADMARunHblank` during visible HBlank (`src/gba/video.c:140-219`). Each
function starts work only for an **enabled** DMA channel whose timing equals
VBlank/HBlank and whose `nextCount` is zero; it supplies a deadline and copies
the transfer count before normal DMA arbitration (`src/gba/dma.c:112-184`).
Therefore a Video callback can create pending DMA work before a co-due
priority-32 Timer 0 callback, but only when a channel is configured for one
of those two timings.

The MP2K DMA1/DMA2 configuration is neither: `m4aSoundVSyncOn` writes both
as `DMA_START_SPECIAL | DMA_REPEAT | DMA_32BIT`. In the exact full-state
`video-co-due-dual-refill` receipt, Video runs first at the same deadline and
leaves all four `nextCount`s zero. Timer entry then sees DMA timings
`[NOW, SPECIAL, SPECIAL, NOW]` and channel 0/3 disabled. The isolated
full-state window has the same all-channel shape.

The broader finite evidence is deliberately weaker but concordant:

- The selected Timer census contains 20 Video-co-due crossings (and three
  Audio-Sample co-due crossings); its per-crossing DMA payload intentionally
  covers only DMA1/2 FIFO state, so it is **not** an all-channel DMA proof.
- The committed VBlank-workload packet has 113 VBlank-entry observations
  (52 anchor, 31 LILIANA, 30 legal-varied). Every one has a null HBlank
  callback and zero `gScanlineEffect.dmaControl`. On the two field cases,
  `VBlankCB_Field` is the only recorded callback that calls
  `ScanlineEffect_InitHBlankDmaTransfer`; with a zero control word that helper
  cannot arm an enabled HBlank transfer.

HBlank/VBlank DMA remains **source-general reachable**. Emerald's scanline
manager can write DMA0 with an HBlank control word, and battle-transition code
does so explicitly (`scanline_effect.c:72-96`, `scanline_effect.h:5-6`,
`battle_transition.c:30,1741-1747`). Those paths are outside this post-boot
ordinary Factory construction epoch. The receipt thus rules the class out for
the exact all-channel Video window and gives finite epoch support; it does not
pretend the compact Timer census contains DMA0/3 at every crossing.

## Immediate DMA3 is a separate CPU-side class

`VBlankIntr` calls the optional game VBlank callback, copies buffered GPU
values, then calls `ProcessDma3Requests` before `m4aSoundMain`
(`src/main.c:343-361`). `RequestDma3Copy`/`RequestDma3Fill` place entries in a
software queue; the manager drains entries while under its 40 KiB/VCOUNT
limits and invokes the `Dma3CopyLarge*`/`Dma3FillLarge*` macros
(`src/dma3_manager.c:42-146`). Those macros write the DMA3 registers with
`DMA_START_NOW` (`include/gba/macro.h:57-173`).

In mGBA, a newly enabled NOW transfer gets `when = currentTime + 3` and
`nextCount = count` (`src/gba/dma.c:81-111`). It is CPU-triggered work from
the game's VBlank interrupt body, **not** a VBlank/HBlank transfer initiated
by mGBA's Video callback. mGBA's scheduler then treats it like any other DMA
event; it does not contain a rule that completes every such DMA before an
unrelated Timer 0 due edge. Consequently pending immediate DMA3 is
source-general reachable after other code arms one, and remains distinct from
the Video-started-DMA class.

For the audited construction epoch it is absent in the evidence available:

- all 113 VBlank-entry snapshots find the DMA3 request queue empty, unlocked,
  and with zero queued bytes; and
- both exact full all-channel Timer receipts find DMA3 disabled with NOW
  timing and `nextCount = 0`, plus `activeDMA = -1`, no ongoing DMA, and an
  unblocked CPU.

The VBlank packet is sampled before that interrupt's callback and queue drain,
so it cannot prove that later instructions never enqueue a request. Likewise,
the 256-crossing packet intentionally omits DMA0/3 register state. The
bounded result is therefore: **no pending immediate DMA3 in the exact Timer
windows or VBlank-entry census; still source-reachable under a different
CPU-side workload.**

## Result

For this ordinary post-boot Factory construction epoch, Timer 0 IRQ work is
excluded by the MP2K control invariant and corroborated by all recorded Timer
controls. Video can be co-due (20 times in the selected census), but it starts
no DMA in the all-channel exact Video receipt; HBlank/VBlank DMA stays a
separate source-general path, not an assumed cost. CPU-side immediate DMA3 is
also absent in the exact windows and sampled VBlank entries but remains a
future stateful scheduler class. `serviceCostMasterCycles` stays `null`, and
no clock or dispatcher code changes in this checkpoint.
