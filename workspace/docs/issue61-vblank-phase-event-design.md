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

## 2. Candidate designs

All candidates preserve one ownership rule: the command-presentation state
owns the transition, and rendering plus input consume the same published
fact. That matches the ROM, where one idle poll both writes the reveal scroll
and installs the input handler (`battle_controller_player.c:2607-2614`). It
also removes the present duplication: the typed command owner advances
`fight-opening` by `FIGHT_SUBMENU_OPEN_DELAY`
(`src/engine/battleCommandPresentation.ts:83-119,321-362`), the legacy input
gate independently compares the same delay (`src/engine/core.ts:1123-1163`),
and legacy render paths independently construct `revealTick` values
(`src/engine/battleScene.ts:7015-7020,7562-7569,11273-11276,11372-11375,
11588-11591,12389-12392,12980-12983,13320-13323,13566-13569,
13666-13669,15094-15097,15558-15561`).

### Candidate A — frame-level BG-copy event reducer

**New state/event.** Add a pure `BgCopyQueueState` containing request-slot
occupancy, BG busy bits, and a monotonically increasing VBlank epoch. Advance
it only through typed events such as `enqueueBgCopy`, `vblankDrain`, and
`controllerPoll`. A successful `controllerPoll` publishes one immutable
`moveMenuDmaReady` edge. This directly ports the queue/bitfield rules
(`bg.c:375-415,440-462`; `dma3_manager.c:42-95,163-182`) without storing a
press-relative reveal tick.

**Consumers.** `BattleCommandPresentationState` would own the queue episode
and edge, rather than transitioning `fight-opening` at a delay
(`src/engine/battleCommandPresentation.ts:92-119,357-362`). Its render view
would expose `moveMenuDmaReady`; the typed renderer would select action versus
FIGHT chrome from that fact instead of phase age
(`src/engine/battleCommandPresentationRender.ts:110-135,275-296`). The legacy
adapter would put the same edge on `FightSubmenuState` (whose current open
state contains only elapsed/cursor/close/confirm data,
`src/engine/battleMenu.ts:957-1017`). Every legacy `battleScene.ts` reveal
comparison listed above and `core.ts`'s input gate would consume that edge.

**Tier-1 pins.** Pure tests would assert: (1) the source-identical `9/11/6`
enqueue stream leaves busy bits for precisely its live slots; (2)
`drain -> poll` publishes ready on the first poll; (3)
`poll -> drain -> poll` retains the waiter once and publishes ready on the
second poll; (4) a poll clears stale bits only after slots drain; and (5)
render visibility and input readiness change on the same edge. The event
orders and stale-bit behavior are direct ports of `bg.c:440-462` and
`dma3_manager.c:42-95,163-182`; the `9/11/6` fixture comes from the banked
full-ring watch
([banked dossier, “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).

**Blast radius/generalization.** If supplied the correct event order, this is
content-, cursor-, battle-, and turn-independent and would serve initial
opens, B-close/reopens, turns 5-8, and generated command requests. Migration
touches the command owner, its render projection, `FightSubmenuState`, the
legacy renderer family, and the legacy input gate identified above. All exact
open/close windows are in the blast radius because they currently key directly
off the fixed delay (`battleMenu.ts:893-896`; `battleScene.ts` citations
above).

**Evaluation: necessary but insufficient.** A reducer can replay either
ordering, but no frame-level input tells it which event comes first on a given
opening. Choosing a constant within-tick order makes all four identical
batches cross identically and therefore cannot produce the banked three
one-residency openings plus the turn-3 extra residency. Choosing the order by
turn, absolute tick, cursor, ring slot, or payload merely moves the rejected
fit into the event producer
([banked dossier, “Bounded verdict”](issue61-fight-submenu-reveal-boundary.md#bounded-verdict)).

### Candidate B — externally supplied controller/VBlank-order receipt

**New state/event.** Keep Candidate A's event reducer, but require the frame
driver to supply an ordered per-frame receipt such as
`[controllerPoll, vblankDrain]` or `[vblankDrain, controllerPoll]`. This is a
truthful interface: VBlank is an interrupt and its source ordering relative to
foreground code is exactly the missing fact (`main.c:340-359,410-416`). The
receipt would be generic and would contain no battle/turn/cursor identifiers.

**Consumers and tests.** The command owner, render view, legacy renderers, and
input gate consume only `moveMenuDmaReady`, exactly as in Candidate A. Tier-1
tests additionally pin both receipt orders, reject duplicate/out-of-order
events, and prove two openings with identical queue payload can cross on
different polls solely because their receipts differ. Those tests would model
the two event sequences already observed in the banked watches
([banked dossier, “Reproducible probe” and “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#reproducible-probe)).

**Blast radius/generalization.** Downstream blast radius is bounded to the
same command-presentation consumers as Candidate A. Upstream blast radius is
not bounded: today's production and deterministic test drivers provide one
button set per tick and call one pure engine tick (`src/main.ts:35-38,67-83`;
`src/engine/core.ts:439`), with no instruction-phase receipt. A generated
route likewise has no source for that receipt.

**Evaluation: a valid seam, not a fix.** This design is useful only if a real
scheduler or emulator supplies the receipt. Hardcoding a receipt sequence for
the four recordings would be an oracle recording disguised as scheduler state
and would not generalize to turns 5-8 or generated routes. It therefore cannot
satisfy #61 by itself.

### Candidate C — cycle-aware foreground/IRQ scheduler

**New state/event.** Add a cycle accumulator within the 280,896-cycle GBA
video frame, schedule VBlank IRQ entry at the hardware boundary, and assign
cycle costs to the foreground controller, battle main function, sprite/OAM,
text-printer, task, IRQ, GPU-register, and DMA operations. Candidate A's queue
then receives `vblankDrain` from the scheduler and `controllerPoll` when CPU
execution reaches the waiter. The app already knows the hardware frame length
but does not subdivide it (`src/main.ts:11-12,35-38`). Source requires the
listed foreground and IRQ participants (`battle_main.c:1863-1869,3026-3032`;
`main.c:340-359`).

**Consumers.** Downstream consumption remains Candidate A's single
`moveMenuDmaReady` edge. The cycle scheduler would sit above the whole engine,
because the phase depends on work in unrelated callbacks before the poll, not
only on the move-window code (`battle_main.c:1863-1869,3026-3032`; compare the
same cumulative-work finding for settled #5 at `ISSUES.md:678-724`).

**Tier-1 pins.** Tests would pin instruction/event ordering at the VBlank
boundary, DMA lock/cap/VCOUNT early exits, the four observed opening orders,
and phase continuity under inserted or removed foreground work. Queue and
reveal tests from Candidate A would remain unchanged. The source conditions
for early exit are `dma3_manager.c:42-95`; the expected four opening orders
come from the banked watches.

**Blast radius/generalization.** This is the only candidate that can generate
the phase rather than receive or guess it, so in principle it generalizes to
all future openings and every other register/DMA race. Its blast radius is the
entire timing engine: exact windows currently assume one atomic pure call per
video tick (`src/main.ts:35-38,67-83`; `src/engine/core.ts:439`). A partial
cycle budget for only FIGHT would still need the cumulative cost of preceding
unrelated work and would therefore be another fitted proxy, as #5's evidence
already demonstrates (`ISSUES.md:678-724`).

**Evaluation: source-faithful but out of proportion.** Faithful implementation
means ARM instruction timing or equivalently complete, validated costs for all
reachable foreground/IRQ work. That is CPU-emulation-scale work, not a bounded
command-presentation slice. No smaller source state has been found in the #61
queue watches.

## 3. Recommendation and bounded handoff

Park #61 under the same policy class as #5/#38. Candidate A is the right
downstream architecture but lacks a producer; Candidate B names the missing
input but cannot derive it; Candidate C derives it only by expanding the
native tick engine into a cycle scheduler. Implementing A or B with a
recording-specific producer would violate the issue's no-turn/no-tick/no-cursor
acceptance and the banked bounded verdict
([banked dossier, “Bounded verdict”](issue61-fight-submenu-reveal-boundary.md#bounded-verdict)).

Do not begin production work unless the falsification gate in §4 finds a
stable, source-owned phase proxy already available at tick granularity. If
that gate succeeds, the bounded implementation sequence is:

1. **Pure event reducer, no route wiring.** Port the source queue/busy-bit
   rules and the `moveMenuDmaReady` edge. Acceptance: synthetic
   `drain -> poll` and `poll -> drain -> poll` tests pass; no pixel path
   changes (`bg.c:440-462`; `dma3_manager.c:42-95,163-182`).
2. **Typed command owner.** Replace the typed owner's fixed
   `fight-opening -> fight-menu` delay with the event and project it to typed
   rendering/input. Acceptance: its existing lifecycle/render tests remain
   green and the synthetic initial/reopen boundaries prove render plus input
   cross atomically (`src/engine/battleCommandPresentation.ts:321-387`;
   `src/engine/battleCommandPresentationRender.ts:275-296`).
3. **Legacy adapter migration, behavior-preserving first.** Store the same
   edge on the legacy submenu state, route every `battleScene.ts` reveal branch
   and `core.ts` input gate through one selector, and initially feed the exact
   currently observed orders. Acceptance before changing turn 3:
   turn 1 stays **81/81 + 230/230 + 256/256 + 102/102**, turn 2 stays
   **256/256 + 237/237**, turn 3 stays **254/255 + 161/161**, and turn 4 stays
   **256/256 + 256/256** (`ISSUES.md:250-378`; capture inventory at
   `docs/rank6-off-ground-truth.md:72-81`).
4. **Real phase producer.** Wire only the source-owned proxy proved by §4.
   Acceptance: `turn3-endeavor-off.json` becomes **255/255**;
   `turn3-rockslide-off.json` remains **161/161**; every turn-1/2/4 count in
   slice 3 remains exact; synthetic initial/reopen tests stay green; and a
   source-data/generated opening uses the same event path without any
   battle/turn/absolute-tick branch (`ISSUES.md:502-528`; banked dossier,
   “Bounded verdict”).
5. **Breadth.** Exercise turns 5-8 and a generated command request with varied
   move contents/cursors. Acceptance: event order is produced without adding
   payload thresholds or episode selectors; identical copy batches remain
   semantically interchangeable
   ([banked dossier, “Queue-slot follow-up”](issue61-fight-submenu-reveal-boundary.md#queue-slot-follow-up)).

If §4 fails—as the present evidence predicts—stop before slice 1. A clean
event seam with no causal producer does not improve correctness and creates a
new place to hide a fitted exception.

## 4. Falsifiable predictions before implementation

### 4.1 Instruction-ordered VBlank watch (decisive)

A future worker should extend the existing OFF-profile #61 watch with emulator
breakpoints or instruction callbacks at:

- entry/exit of `HandleChooseMoveAfterDma3` (banked Thumb address
  `0x0805c115`);
- entry/exit of `ProcessDma3Requests` (map address `0x08000bf0`);
- each `RequestDma3Copy` return that forms the final six-request batch; and
- VBlank IRQ entry/exit.

At each event, record an emulator cycle counter, `REG_VCOUNT`, the player
controller function, `sDma3RequestCursor`, all four BG busy words, the six
final queue slots, and `sDma3ManagerLocked`. The existing validated wrapper
and traces remain the execution contract; the prior addresses/specs are in
the banked dossier's “Reproducible probe” and “Queue-slot follow-up.”

**Prediction:** initial/turn-2/turn-4 will order the relevant final drain
before the waiter poll that publishes ready. Turn 3 will order one waiter poll
before that drain and the ready poll after it. The final batch contents will
remain identical. The cycle/VCOUNT values—not a turn/cursor/slot/payload
field—will distinguish the order. This directly follows the source's split
between foreground polling (`battle_controller_player.c:2607-2614`) and
VBlank-only draining (`main.c:340-359`).

**Refutation:** if the event trace instead identifies a stable tick-level
state that differs before the four openings—for example a reproducible
`sDma3ManagerLocked` or VCOUNT-limit outcome—and that state alone predicts the
order across delayed presses, turns 5-8, and generated openings, then the
cycle-only verdict is false. That state should become Candidate A's event
producer. Merely observing a different cycle count confirms rather than
refutes the verdict.

### 4.2 Delay sweep (secondary generalization check)

Using copies of the existing OFF watch specs, insert 0–31 idle frames before
each FIGHT press without changing the move selection, and retain the full-ring
queue plus instruction-ordered events from §4.1. The source operation remains
the same `InitMoveSelectionsVarsAndStrings` chain
(`battle_controller_player.c:2629-2651`), and the banked baseline predicts the
same `9/11/6` queue content for an unchanged moveset.

**Prediction:** any crossing changes will correlate with instruction/cycle
phase at VBlank, not queue size, cursor, or a fixed open count. A stable
frame-level proxy that predicts every sweep member would refute the parking
verdict and justify the bounded slices above. A proxy that only names the
original turn-3 trace does not.
