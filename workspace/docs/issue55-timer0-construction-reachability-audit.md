# Issue #55 — Factory Timer 0 construction-class reachability audit

This side-lane checkpoint answers which of the already modeled zero/one/dual
Direct Sound refill classes can occur during ordinary Pokémon Emerald Battle
Factory party construction. It does not price Timer 0, alter the dispatcher,
or wire the construction clock.

The byte-stable receipt is
`tests/fixtures/factory-timer0-reachability-audit-v1.json`; its extractor is
`tools/extract/extract-factory-timer0-reachability-audit.ts` and its hermetic
guard is `tests/factoryTimer0ReachabilityAudit.test.ts`. Regeneration validates
the pinned pret source, an extracted mGBA 0.10.5 source tree, the oracle loader,
and the already committed construction census:

```sh
node --experimental-strip-types \
  tools/extract/extract-factory-timer0-reachability-audit.ts \
  --pokeemerald-source reference/pokeemerald \
  --mgba-source /path/to/mgba-0.10.5 \
  --oracle-source /path/to/pokeemerald-factory/oracle/emerald_core.py \
  --out tests/fixtures/factory-timer0-reachability-audit-v1.json
```

The audited mGBA release archive is still SHA-256
`91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14`.
Tier 1 needs no archive, network, emulator, or running oracle: it materializes
the exact audited anchors from the receipt, regenerates byte-for-byte, and
proves that changing an anchor is rejected as stale source.

## Source result: the construction epoch keeps A/B in one phase

Emerald's `SoundInit` (`reference/pokeemerald/src/m4a.c:353-395`) establishes
the pair in one setup:

- one `REG_SOUNDCNT_H` write resets both FIFOs and routes both to Timer 0;
- DMA1 maps the first `pcmBuffer` half to FIFO A and DMA2 maps the second half
  to FIFO B; and
- `m4aSoundVSyncOn` (`m4a.c:550-562`) enables both as special/repeat/32-bit
  DMA channels before `SampleFreqSet` enables Timer 0 (`m4a.c:400-430`).

The left/right output choice does not split consumption. Both forms of
`SetPokemonCryStereo` (`m4a.c:1758-1777`) retain Timer 0 and at least one
output side for **both** FIFO A and FIFO B. The ordinary VBlank path calls
`m4aSoundMain` (`src/main.c:347-370`); it does not rewrite either FIFO route.
A pinned-tree reference scan finds the FIFO and DMA1/2 sound setup writes in
`m4a.c`; the other `m4aSoundVSyncOn/Off` call sites belong to soft reset,
Berry Fix, egg hatch, and wireless-status transitions, not either audited
Factory construction function.

mGBA samples A and then B in the same Timer 0 callback
(`src/gba/timer.c:13-43`). Each `GBAAudioSampleFIFO` independently requests
four DMA words iff the modular queued-word level is at most three, then
consumes one byte from its internal word (`src/gba/audio.c:327-374`). Starting
from equal reset state, equal queued-word level and equal `internalRemaining`
therefore advance equally. A refill adds the same four words to both sides.
The fresh paired DMA graph observed at runtime completes in 18 master cycles,
far before the 1,254-cycle next Timer 0 deadline. Thus at each ordinary
construction Timer 0 entry the threshold test has the same truth value for A
and B: **zero or dual refill, never single refill**.

This is a scoped induction, not a whole-game claim. `m4aSoundVSyncOff/On`
contains separate DMA register writes, and reset/soft-reset edges, debugger or
lab staging, corrupt state, or a caller that changes only one DMA/FIFO can
break the premise. mGBA's callback is source-general and can request one
channel when given such asymmetric state. No claim is made that a single
refill is impossible under external staging or every Emerald transition.

## Finite construction evidence (kept separate)

The existing committed `factory-construction-timer0-fifo-v1` packets contain
256 selected Timer 0 crossings across the anchor, LILIANA, and legal-varied
construction epochs:

| case | crossings | zero refill | one refill | dual refill |
| --- | ---: | ---: | ---: | ---: |
| anchor | 126 | 85 | 0 | 41 |
| LILIANA | 57 | 38 | 0 | 19 |
| legal varied | 73 | 48 | 0 | 25 |
| **total** | **256** | **171** | **0** | **85** |

All 256 entry snapshots have equal A/B queued-word levels and equal
`internalRemaining`, with the stable DMA1→A / DMA2→B mapping. Every refill row
changes both FIFO write pointers; none changes only one. The separate absolute
runtime receipt adds two exact on-time dual-refill callback windows, both with
audio enabled and no mixer. These counts demonstrate actual zero and dual
occurrence and find no single occurrence. They corroborate, but do not replace,
the source-state induction above.

## What `audio.enable`, `mixer`, and `externalMixing` mean

`audio.enable` is mGBA's mirror of the emulated GBA `SOUNDCNT_X` master-enable
bit (`audio.c:223-260`). It is not host audio playback, mute state, or the
optional HLE mixer setting. mGBA reset clears it; Emerald `SoundInit` sets
`SOUND_MASTER_ENABLE`, and no ordinary construction path clears it. Both exact
runtime windows read `enabled=true`. Consequently the audio-disabled Timer 0
class is valid for the emulator in general but not reachable in this audited
post-boot construction epoch.

`audio.mixer` is different: `GBAAudioInit` initializes it to `NULL`
(`audio.c:34-58`). mGBA allocates and hot-plugs `CPU_COMPONENT_AUDIO_MIXER`
only when emulator configuration key `gba.audioHle` exists and is nonzero
(`src/gba/core.c:632-642`). The component then installs its pointer and can
recognize MP2K state by inspecting a FIFO DMA source
(`src/gba/extra/audio-mixer.c:21-47`, `audio.c:120-155`).
`externalMixing=true` means that optional component engaged an MP2K context;
neither field is a GBA register or game-selected mode.

The oracle loader calls `mgba.core.load_path`, loads the save, and resets the
core without setting or loading an mGBA config option. The runtime receipt
confirms `mixer.present=false` and `externalMixing=false` in both exact
windows. Therefore mixer-present is a real **optional emulator** path, but not
a real-game-selected path and not a path in this oracle. Even when installed,
the mixer hook inspects the FIFO DMA source; Timer 0 FIFO consumption and the
four-word refill threshold still run.

## Resulting boundary

For ordinary Battle Factory construction in this oracle:

- zero refill: source-reachable and observed 171 times;
- dual refill: source-reachable and observed 85 selected crossings plus two
  exact callback-entry windows;
- single refill: excluded while the proved paired-entry invariant holds and
  absent from the finite census, but source-reachable after asymmetric staging;
- audio disabled: excluded for this post-boot epoch, though valid during
  emulator reset or a game power-off path; and
- mixer present: optional `gba.audioHle` emulator configuration only, absent
  from this oracle.

This does not close pending/competing DMA, nonzero `cyclesLate`, IRQ/Audio
co-due work, or Video-started DMA classes. `serviceCostMasterCycles` remains
`null`, and the live construction clock remains unwired.
