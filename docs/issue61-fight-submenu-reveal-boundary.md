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
