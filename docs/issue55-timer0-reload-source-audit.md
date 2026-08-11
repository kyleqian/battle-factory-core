# Issue #55 — GBA Timer 0 reload and scheduling source audit

This is a source/ELF checkpoint for the Battle-Scene-OFF Factory
construction clock. It derives only the cadence of the timing event identified
by the queue receipt; it does not add a clock, an event queue, an audio model,
or a Timer 0 service-cost constant.

## Result

The canonical m4a setup selects `SOUND_MODE_FREQ_13379` (`0x0004_0000`).
`SampleFreqSet` selects table entry 4, or **224 PCM samples per VBlank**, and
writes this Timer 0 configuration:

| value | derivation |
| --- | --- |
| frequency selector | `4` (`SOUND_MODE_FREQ_13379`) |
| `pcmSamplesPerVBlank` | `gPcmSamplesPerVBlankTable[3] = 224` |
| PCM frequency | `(597275 * 224 + 5000) / 10000 = 13,379` Hz |
| m4a DMA-VSync period | integer `PCM_DMA_BUF_SIZE / 224 = floor(1584 / 224) = 7` VCounts |
| Timer 0 reload | `-(280896 / 224) = -1254 = 0xFB1A` (16-bit) |
| Timer 0 period | `(0x10000 - 0xFB1A) << 0 = 1,254` master cycles |
| Timer 0 control | `TIMER_ENABLE | TIMER_1CLK = 0x0080` |

Thus, once its first due time is known, the default Factory m4a timer has the
source-derived recurrence `due[n + 1] = due[n] + 1,254`. The `224 * 1,254 =
280,896` identity is the source's LCD-frame cycle budget; it is a cadence
derivation, not a claim that a callback costs a fixed number of cycles.

## Game-source path and configuration boundary

`AgbMain` calls `m4aSoundInit` before `EnableVCountIntrAtLine150`
(`src/main.c:99-102`). The pinned link result is:

| routine / data | ELF address | source role |
| --- | ---: | --- |
| `VBlankIntr` | `0x08000738` | calls `m4aSoundMain` |
| `VCountIntr` | `0x08000844` | calls `m4aSoundVSync` |
| `SoundMain` | `0x082DF05C` | m4a mixer body reached from VBlank |
| `m4aSoundVSync` | `0x082DFA10` | VCount-side DMA maintenance |
| `m4aSoundInit` | `0x082E0070` | enters the sound setup path |
| `SoundInit` | `0x082E04DC` | sets sound routing and first frequency setup |
| `SampleFreqSet` | `0x082E05D4` | owns Timer 0 disable/reload/enable writes |
| `m4aSoundMode` | `0x082E0678` | re-enters `SampleFreqSet` for a frequency mode |
| `m4aSoundVSyncOff` | `0x082E0764` | stops/reinitializes FIFO DMA only |
| `m4aSoundVSyncOn` | `0x082E07E0` | enables FIFO DMA and resets m4a DMA cadence |
| `gPcmSamplesPerVBlankTable` | `0x08675B64` | `{96,132,176,224,264,304,352,448,528,608,672,704}` |

`m4aSoundInit` first invokes `SoundInit(&gSoundInfo)`, then invokes
`m4aSoundMode` with the same frequency selector. `SoundInit` routes FIFO A
and B to Timer 0 (`SOUND_A_TIMER_0` and `SOUND_B_TIMER_0`) and seeds the
first `SampleFreqSet(SOUND_MODE_FREQ_13379)`. Since the later sound-mode
call contains a frequency bit, it calls `m4aSoundVSyncOff()` and then calls
`SampleFreqSet` again. The final state is still the table-4 configuration
above.

`SampleFreqSet` has the authoritative Timer 0 write order:

1. write `REG_TM0CNT_H = 0` (disable);
2. write `REG_TM0CNT_L = -(280896 / pcmSamplesPerVBlank)` (reload);
3. call `m4aSoundVSyncOn()` (DMA1/DMA2 special-repeat enable, not Timer 0
   enable);
4. wait through the `VCOUNT == 159` alignment; and
5. write `REG_TM0CNT_H = TIMER_ENABLE | TIMER_1CLK`.

The control value has neither `TIMER_INTR_ENABLE` nor count-up. Consequently
the game does not install or run a Timer 0 IRQ for normal m4a samples. The
VCount IRQ instead calls `m4aSoundVSync`; that routine decrements
`pcmDmaCounter`, reloads it to 7 when it reaches zero, and re-arms DMA1/DMA2
in FIFO special-repeat mode. VBlank calls `m4aSoundMain` / `SoundMain` to mix
the next audio data. These are related audio paths, but neither one is the
emulator timing-event callback named `GBA Timer 0`.

`m4aSoundVSyncOff` does not write `REG_TM0CNT_*`; it disables/reset-prepares
DMA1/DMA2 and clears the PCM buffer. Timer 0 is actually disabled by the
first write in the following `SampleFreqSet`. A direct m4a frequency change
can also arrive through the MPlay jump table, so a general model must treat
each proven `SampleFreqSet` as a new disable/reload/enable boundary rather
than assuming the first initialization lasts forever. Other non-Factory
source paths (RFU and flash code) can use Timer 0 too; this audit makes no
claim that those paths execute during the Factory construction epoch.

## mGBA scheduler facts (separate from game-source facts)

The oracle reports mGBA 0.10.x and the installed libmgba binary identifies as
**mGBA 0.10.5**. The scheduler statements below were audited against the
mGBA 0.10.5 release source (local source archive SHA-256
`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`),
especially `include/mgba/core/timing.h`,
`include/mgba/internal/gba/timer.h`, `src/core/timing.c`,
`src/gba/io.c`, `src/gba/timer.c`, and `src/gba/audio.c`. They explain the
queue name observed in the existing receipt; they are not Pokémon game code.

- `GBATimerInit` names the timer-0 event `GBA Timer 0` and gives it priority
  `0x20` (32), matching the queue receipt.
- A write to `TM0CNT_LO` changes the timer's stored reload. A control write
  masks to `0x00C7`, then updates enable, IRQ, count-up, and prescale state.
  Timer 0 cannot be count-up in mGBA (`timer > 0 && control & 0x0004`).
- An enable, count-up, or prescale transition deschedules the old event. On
  enabling a non-count-up timer, mGBA loads the stored reload into the timer
  register, aligns `lastEvent` to the prescale boundary, and schedules the
  next overflow. A disable leaves no pending Timer 0 event.
- At an overflow, `GBATimerUpdate0` calls `GBATimerUpdate`. For a normal
  timer, `GBATimerUpdateRegister` updates the visible count and schedules the
  event again at an absolute time. With reload `R` and prescale-bit count
  `p`, the steady recurrence is `(0x10000 - R) << p`; here that is 1,254.
- `mTimingTick` removes each due event and invokes it with `cyclesLate`.
  `GBATimerUpdateRegister` subtracts that lateness before its absolute
  reschedule, so late dispatch does not move the next due phase. `mTiming`
  orders by absolute due time and then event priority.
- The Timer 0 callback may raise an IRQ only when the control IRQ bit is set
  (it is not here). With the m4a FIFO routes enabled it can sample FIFO A and
  B and request their special-timing DMA transfers. Those audio/DMA effects
  are emulator callback behavior, not a game Timer 0 ISR.

## Registration contract for `factoryConstructionClock.ts`

The smallest source-derived event record is deliberately narrow:

```ts
type FactoryTimer0Cadence = {
  enabled: boolean;
  reload: number;                 // Factory default: 0xFB1A
  prescaleBits: number;           // Factory default: 0
  periodMasterCycles: number;     // Factory default: 1_254
  nextDueMasterCycle: number | null;
};
```

On a proven `SampleFreqSet` write sequence, set `enabled` false for the
disable, set the reload/period from the selected m4a table entry, then set
`enabled` true and seed `nextDueMasterCycle` with the first overflow after
the final enable. Each due event advances `nextDueMasterCycle` by
`periodMasterCycles`, independently of how long its service takes. For the
current Factory rate, the registration may assert the fixed selector/table
values above; it should expose frequency/reload changes rather than silently
continuing with 1,254 cycles after an unmodeled m4a frequency change.

This state is sufficient to identify *when* a Timer 0 event is due. It is
not sufficient to price it. In particular, do not put `18` in the state or
in a recurrence: the one observed `+18` window establishes event identity
only. The Timer callback's FIFO and DMA behavior, its host service cost, and
whether that cost is invariant across the 85 joins remain separate evidence
requirements.

## Bounded unknown and next observable

Source proves the period but not the Factory epoch's absolute phase. The
final enable follows a VCOUNT-159 wait, and the construction receipts do not
yet record the master cycle of that enable or the Timer 0 `when` field at
construction-clock entry. Do not infer it from the lone `+18` result.

The next admissible observable is a non-mutating timing-queue/register
snapshot at construction-clock entry that records `TM0CNT_L`, `TM0CNT_H`, and
the `GBA Timer 0` event's `when` value (or, equivalently, the final-enable
master cycle). A second snapshot one or more overflows later must differ by
an integral multiple of 1,254. Only then can a main-lane event registration
seed `nextDueMasterCycle` without a fitted phase; service cost still remains
null until independently established.

## Drift guard

`tests/factoryTimer0SourceAudit.test.ts` reads the pinned m4a source,
headers, map, and loadable ELF bytes. It pins the table, constants, function
addresses, call sites, Timer 0 register literal pool, write order, and the
1,254-cycle formula so source/ELF drift fails Tier 1 rather than quietly
changing this handoff.
