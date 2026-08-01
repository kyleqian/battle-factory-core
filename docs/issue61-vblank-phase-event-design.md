# ISSUES #61 — controller/VBlank phase-event design

## Verdict

There is no source-backed, frame-level state discriminator that makes the
turn-3 FIGHT opening different from the initial, turn-2, and turn-4 openings.
The source-backed discriminator is the foreground CPU's execution phase
relative to the asynchronous VBlank interrupt: specifically, whether the
player controller polls the BG-copy request slots before or after the VBlank
handler drains them. The existing watches establish those two observed orders,
while the full-ring follow-up establishes identical `9/11/6` request batches,
sizes, and destinations for all four openings
([banked dossier, "Queue-slot follow-up"](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).

That phase is a sub-tick fact. `pokeemerald` does not store a turn, cursor,
request-count, or other logical flag that predicts it; it falls out of the
instruction/cycle cost of the foreground work relative to the hardware scanout
phase. This is the same architectural class as the settled #5 mechanism, where
an otherwise identical state-level operation lands on a different side of
VBlank according to cumulative CPU work (`ISSUES.md:644-724`). A faithful fix
therefore requires either a cycle-aware scheduler or an externally supplied
instruction-phase event. The current engine has neither. The recommendation is
to **park #61 at its one-frame residual**, not to fit a phase bit from turn,
absolute tick, cursor, queue slot, or the fixed move-window payload.

## 1. Source model

### 1.1 Foreground controller order

The foreground loop reads keys, runs the main callbacks, then waits for a
VBlank interrupt (`reference/pokeemerald/src/main.c:131-168`). `CallCallbacks`
runs `callback1` before `callback2` (`main.c:188-195`). During an established
battle those callbacks are `BattleMainCB1` and `BattleMainCB2`
(`reference/pokeemerald/src/battle_main.c:1850-1852`): `BattleMainCB1` runs
`gBattleMainFunc` and then each battler controller in battler order
(`battle_main.c:3026-3032`), while `BattleMainCB2` advances sprites, builds
OAM, runs text printers, updates palette fade, and runs tasks
(`battle_main.c:1863-1869`).

The player controller is itself a function pointer. `PlayerBufferRunCommand`
dispatches a pending controller command (`reference/pokeemerald/src/
battle_controller_player.c:216-225`). For `CONTROLLER_CHOOSEMOVE`,
`PlayerHandleChooseMove` calls `InitMoveSelectionsVarsAndStrings` and installs
`HandleChooseMoveAfterDma3` (`battle_controller_player.c:2629-2640`). The
initializer draws four names, the cursor, PP label/value, and type
(`battle_controller_player.c:2643-2651`); the underlying helpers issue the
four name-window copies, PP-window copies, and BG0 cursor tilemap copies
(`battle_controller_player.c:1456-1517`).

On later controller invocations, `HandleChooseMoveAfterDma3` calls
`IsDma3ManagerBusyWithBgCopy`. A busy result changes nothing. The first idle
result sets `gBattle_BG0_Y` to 320 and installs `HandleInputChooseMove`
(`battle_controller_player.c:2607-2614`). Thus both visibility ownership and
input ownership change at the same controller edge; neither is authorized by
a press-relative timer.

### 1.2 What “DMA busy” means

`BattlePutTextOnWindow` fills/prints a window, puts its tilemap, and requests a
full window copy (`reference/pokeemerald/src/battle_message.c:2958-3030`). A
full copy requests both tile graphics and the BG tilemap
(`reference/pokeemerald/src/window.c:266-282`). BG copy helpers record each
returned request slot in `sDmaBusyBitfield`
(`reference/pokeemerald/src/bg.c:375-415`).

`IsDma3ManagerBusyWithBgCopy` scans those bits. For every set bit it asks
whether that exact request slot still has a nonzero size; a live slot returns
busy immediately, while an already-drained slot causes the stale BG bit to be
cleared. Only after the whole scan finds no live slot does it return idle
(`reference/pokeemerald/src/bg.c:440-462`; the slot test is
`reference/pokeemerald/src/dma3_manager.c:163-182`). This explains the turn-3
snapshot in which the six requests are gone while the waiter and stale busy
bits are still visible: queue drain and the later controller poll that clears
the bookkeeping are distinct events
([banked dossier, “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).

The queue is a 128-entry ring with a processing cursor
(`reference/pokeemerald/src/dma3_manager.c:4-23`). `ProcessDma3Requests`
walks from that cursor, performs each transfer, zeros the slot, and advances
the cursor; it can stop if the manager is locked, if the attempted batch would
exceed 40 KiB, or if `VCOUNT` is past 224
(`dma3_manager.c:42-95`). The banked full-ring evidence rules out payload,
request count, destination, cursor position, and the 40-KiB cap as the
four-opening discriminator: all openings enqueue the same three batches, and
the final six-request batch drains intact on the relevant VBlank
([banked dossier, “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).
`sDma3ManagerLocked` was not watched, so this design does not invent a lock
explanation; the banked causal observation is only that turn 3's poll precedes
the final drain.

### 1.3 Where VBlank interposes

VBlank is an interrupt, not a call made by the battle controller. The main
loop's `WaitForVBlank` merely clears and spins on an interrupt-set flag
(`reference/pokeemerald/src/main.c:410-416`), while `VBlankIntr` is installed
in the interrupt table (`main.c:28-46`). When the interrupt fires,
`VBlankIntr` runs the active VBlank callback, then flushes buffered GPU
register values, then drains the DMA3 request queue—in that exact order
(`main.c:340-359`).

For battles, the VBlank callback copies `gBattle_BG0_Y` into the buffered
`BG0VOFS` register before the generic GPU flush and DMA drain
(`reference/pokeemerald/src/battle_main.c:2084-2105`). `SetGpuReg` writes its
shadow immediately but writes hardware immediately only during VBlank (or
forced blank); otherwise it queues the register for the next VBlank flush
(`reference/pokeemerald/src/gpu_regs.c:49-98`). Consequently the complete
reveal pipeline is:

1. foreground move-menu construction enqueues BG copies and installs the DMA
   waiter (`battle_controller_player.c:2629-2651`);
2. a VBlank interrupt drains those request slots after the battle VBlank
   callback and GPU-buffer flush (`main.c:340-359`);
3. a later foreground waiter poll observes the drained slots, clears their
   stale busy bits, writes `gBattle_BG0_Y=320`, and installs the input callback
   (`battle_controller_player.c:2607-2614`); and
4. the following battle VBlank callback publishes that Y value to `BG0VOFS`,
   producing the first visible move-list frame (`battle_main.c:2084-2105`;
   `gpu_regs.c:49-98`).

The four banked openings agree with that pipeline: the initial, turn-2, and
turn-4 waiters cross after one observed busy residency, while turn 3 remains
in the waiter across the extra pre-drain observation and reveals one frame
later
([banked dossier, “Reproducible probe”](issue61-fight-submenu-reveal-boundary.md#reproducible-probe)).

### 1.4 The determining state is below tick granularity

At the instant of a poll, the answer is ordinary state: the BG busy bit and
the referenced queue slot's `size` (`bg.c:440-462`; `dma3_manager.c:163-182`).
What the tick engine cannot derive is whether the VBlank interrupt has already
run `ProcessDma3Requests` before that poll. The source exposes no persistent
`controllerBeforeVBlank` flag. The hardware facts that determine the order are
the current CPU instruction/cycle position and scanout/VBlank phase; the
amount of foreground work includes `gBattleMainFunc`, all battler controllers,
and the sprite/text/task work in the two battle callbacks
(`battle_main.c:1863-1869,3026-3032`; `main.c:340-359`).

This is not merely an unknown frame-level variable. Identical queue state and
payload produce the two orders in the banked evidence, and the current native
command state has no scheduler/VBlank-phase input
([banked dossier, final two paragraphs of “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).
Deriving the order requires accounting for where CPU execution is when the
VBlank IRQ arrives, just as #5's settled register race required cumulative
per-frame CPU cycle cost (`ISSUES.md:678-724`).

