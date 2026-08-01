# ISSUES #61 — Scene-OFF FIGHT reveal boundary

This is a bounded evidence checkpoint. It deliberately does **not** change
`FIGHT_SUBMENU_OPEN_DELAY`, a renderer comparison, or any turn dispatcher.
The source/RAM contract disproves the proposed one-comparison fix: the real
controller's DMA wait is not a fixed number of polls.

## Source-owned transition

The ordinary player controller follows one reusable chain:

1. `HandleInputChooseAction` accepts FIGHT and calls
   `PlayerBufferExecCompleted` (`battle_controller_player.c:233-322`).
2. The engine later emits `CONTROLLER_CHOOSEMOVE`.
3. `PlayerHandleChooseMove` calls `InitMoveSelectionsVarsAndStrings`, which
   draws the four move-name windows, cursor, PP, and type off-screen, then
   installs `HandleChooseMoveAfterDma3`
   (`battle_controller_player.c:2629-2651`).
4. `HandleChooseMoveAfterDma3` polls
   `IsDma3ManagerBusyWithBgCopy()`. Only the first poll that returns false
   writes `gBattle_BG0_Y = DISPLAY_HEIGHT * 2` and installs
   `HandleInputChooseMove` (`battle_controller_player.c:2607-2614`).
5. `IsDma3ManagerBusyWithBgCopy` scans `sDmaBusyBitfield` and the circular
   DMA3 request queue (`bg.c:440-460`); `ProcessDma3Requests` drains that queue
   during VBlank subject to its byte/VCOUNT limits (`dma3_manager.c:42-96`).

The hardware reveal therefore belongs to the callback/DMA-ready boundary,
not to a fixed comparison against the A-press tick.

## Reproducible probe

Run both committed specs through the validated wrapper:

```sh
probe_dir=$(mktemp -d)
python3 tools/run-mgba-probe.py "$probe_dir/turn3.json" -- \
  tools/probe/ram-probe.py \
  tools/probe/specs/issue61-turn3-fight-reveal-watch.json \
  "$probe_dir/turn3.json"
python3 tools/run-mgba-probe.py "$probe_dir/turn4.json" -- \
  tools/probe/ram-probe.py \
  tools/probe/specs/issue61-turn4-fight-reveal-watch.json \
  "$probe_dir/turn4.json"
```

Relevant pinned addresses/callbacks from the reference ELF/map:

| Signal | Address/value |
| --- | --- |
| `gBattlerControllerFuncs` | `0x03005d60` |
| `gBattle_BG0_Y` | `0x02022e16` |
| `sDma3RequestCursor` | `0x03000811` |
| `sDmaBusyBitfield` | `0x03000938` (four `u32`s) |
| `PlayerBufferRunCommand` | `0x08057505` (Thumb) |
| `HandleChooseMoveAfterDma3` | `0x0805c115` (Thumb) |
| `HandleInputChooseMove` | `0x08057bfd` (Thumb) |

The OFF-profile probe gives four independent openings:

| Opening | `JOY_NEW(A)` | `HandleChooseMoveAfterDma3` RAM ticks | first `HandleInputChooseMove`, `BG0_Y=320` | first visible move-list frame |
| --- | ---: | --- | ---: | ---: |
| initial | 1887 | 1890 | 1891 | 1892 |
| turn-2 reopen | 2901 | 2904 | 2905 | 2906 |
| turn-3 reopen | 3847 | **3850, 3851** | 3852 | **3853** |
| turn-4 reopen | 4893 | 4896 | 4897 | 4898 |

Turn 3 is not a generic inclusive/exclusive mistake. At RAM tick 3850 the
DMA cursor advances `96 -> 102`, but the busy bitfield remains nonzero; the
next controller poll at 3851 still remains in
`HandleChooseMoveAfterDma3`. Only tick 3852 clears the busy bits and crosses
once into `HandleInputChooseMove`. The other three openings cross after one
poll. Dense pixel comparison agrees: turn 3's oracle keeps the action menu
through frame 3852 and reveals on 3853, whereas the app reveals on 3852.

## Queue-slot follow-up (2026-08-01)

The initial watch intentionally exposed only the cursor and BG-owned busy
bits. `tools/probe/dump-issue61-dma-queue.py` now reads the source
`sDma3Requests[128]` ring directly (`0x03000010`, 16-byte
`struct Dma3Request` entries), so a queue model can be judged against the
actual request contents rather than a cursor-value fit. Reproduce with:

```sh
probe_dir=$(mktemp -d)
python3 tools/run-mgba-probe.py "$probe_dir/turn3-queue.json" -- \
  tools/probe/dump-issue61-dma-queue.py \
  tools/probe/specs/issue61-fight-reveal-queue-watch.json \
  "$probe_dir/turn3-queue.json"
python3 tools/run-mgba-probe.py "$probe_dir/turn4-queue.json" -- \
  tools/probe/dump-issue61-dma-queue.py \
  tools/probe/specs/issue61-turn4-fight-reveal-queue-watch.json \
  "$probe_dir/turn4-queue.json"
```

All four source openings enqueue the same `InitMoveSelectionsVarsAndStrings`
copy batches: **9**, then **11**, then **6** requests, with the same ordered
sizes and destinations (`4096`-byte window tiles, `512`-byte window tiles,
and the final `256/4096/512` cursor/PP/type batch). Each batch is below
`ProcessDma3Requests`'s 40-KiB cap. The observed cursor progress is:

| Opening | queue cursor after the 9 / 11 / 6 batches | first callback result |
| --- | --- | --- |
| initial | `107 -> 116 -> 127 -> 5` | queue already drained; ready |
| turn 2 | `106 -> 115 -> 126 -> 4` | queue already drained; ready |
| turn 3 | `76 -> 85 -> 96 -> 102` | first poll precedes final VBlank drain; busy |
| turn 4 | `44 -> 53 -> 64 -> 70` | queue already drained; ready |

At turn 3 snapshot 3851, the six final requests have drained
(`requests=[]`, cursor `102`), but `HandleChooseMoveAfterDma3` is still
installed and the busy bits are stale. Therefore its first poll ran before
that VBlank drain; the following frame clears the bits and crosses. This
is an execution-phase ordering difference between the controller callback
and VBlank, not a different move-window payload, a cursor slot, or a
different number/size of BG copies.

The current native command state has neither a source scheduler/VBlank-phase
owner nor an input to recover that phase. A queue-byte/count threshold would
be an invented fit: it would treat identical `9/11/6` batches differently
without a source-owned causal signal. The next legitimate implementation
step is to derive and expose that generic controller-versus-VBlank ordering
event; until then, #61 must remain a one-frame bounded residual.

## Bounded verdict

Changing all duplicated Scene-OFF branches from `t < revealTick` to
`t <= revealTick` would repair turn 3 but would move the already-exact
initial/turn-2/turn-4 transitions one frame late. Likewise, changing the
global delay by pixel fit is source-wrong. A safe implementation needs the
generic command-presentation owner to expose a source-derived DMA-ready
reveal event (or a faithful bounded model of the BG-copy queue), and every
legacy Scene-OFF renderer plus its input gate must consume that single event.
The current state has neither signal; inventing one only for turn 3, its
cursor, or its absolute tick would violate the executable-frontier gate.

Until that presentation seam exists, #61 remains open and precisely bounded
to the single turn-3 frame rather than being hidden by a global regression.
