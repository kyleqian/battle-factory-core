# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #6 — multi-ball `SpriteCB_Pokeball` timing: a rented ball's own animation
  is measurably delayed (~2 ticks) by a SECOND ball's popup open/close,
  contradicting the "fully independent per-sprite `data[0]`" assumption
  (S5 scout dossier Risk 2, `ballAnim.ts` module comment) — root cause NOT
  yet found, blocks modeling ≥2 simultaneously-rented balls RNG-exactly.

**Symptom:** RAM-dumped (`gSprites[ballSpriteId]`'s `data[0]`/`animNum`/
`animEnded`, `EmeraldOracle` recipe per `tools/extract/inspect-anchor.py`,
scratch scripts not committed) tick-by-tick comparison of two scenarios that
should be identical for ball 0 (its own FSM is purely elapsed-tick-driven
per source, `battle_factory_screen.c:1059-1090`, no dependency on other
sprites):
  - (a) rent slot 1 only, idle 220 ticks: ball 0's 128-tick "moving" cycle
    ends (`animEnded` flips true) at **tick 168**; its 32-tick resting
    countdown reaches 0 and rolls (FAILURE) at **tick 201** — matches
    `tests/ballAnim.test.ts`'s existing RAM-pinned checkpoint exactly.
  - (b) rent slot 1, dwell 40 ticks, then RIGHT + open slot 2's popup + DOWN
    + RENT-confirm slot 2 (ticks ~79-124, all while ball 0's moving cycle is
    still in flight), then idle: ball 0's `animEnded` flip lands at
    **tick 170** (+2), its roll at **tick 203** (+2) — a reproducible,
    RAM-confirmed 2-tick delay purely from a second ball's popup
    opening+closing nearby, with **zero code difference in ball 0's own
    selection/timing**.
  - Cross-checked against the current TS engine (`core.ts`'s tick() loop,
    which already iterates all `ballAnims` slots unconditionally in slot
    order — structurally N-ball-capable since slice 1): matches scenario
    (a) exactly, diverges from scenario (b) at exactly the two delayed
    transitions (5 tick-level `gRngValue` mismatches, all at ticks
    199-203 and 253 — the roll events nearest the delay).

**Ruled out:** not a probe artifact (single-ball probe independently
reproduces the pre-existing RAM-pinned `tests/ballAnim.test.ts` checkpoints
exactly); not explained by `SpriteCB_Pokeball`'s own source, which reads
`sprite->data[0]` with no shared/global state (`battle_factory_screen.c:1059-1090`);
not `AnimateSprites()` being conditionally skipped, since `CB2_SelectScreen`
calls it unconditionally every frame (`battle_factory_screen.c:1092-1099`).

**Leads (not investigated further — ran out of session time):** the delay
correlates with slot 2's own `OpenMonPic`/`CloseMonPic` calls (2 mon-pic
transitions during the window ≈ the observed 2-tick total delay to ball 0,
suggestive of ~1 tick stolen per transition, but only one data point — not
confirmed to be per-transition vs a flat per-popup-session cost). Next
probe: isolate a single open-only vs open+close to distinguish. Candidate
mechanism: something `OpenMonPic`/`CloseMonPic` does (VRAM/tile buffer
setup for the popup's own mon-pic sprite) may cost a frame that effectively
delays `RunTasks()`/sprite processing for unrelated sprites that frame -
not yet read from source.

**Practical impact:** blocks S5 slice 2's `rent-3picks.json` (needs the
RNG stream exact through 2-3 simultaneously-rented balls) until this is
pinned. Single-ball RNG (S5 slice 1, `rent-slot1.json`) is unaffected.

## #5 — mon-pic close animation: WIN0V catch-up jitter is real hardware
  cycle-timing, not a modelable game-state bug (root-caused, NOT fixable at
  this engine's tick/state granularity - see "why this can't be fixed" below)

**Symptom:** the mon-pic close animation (`monPic.ts` CLOSE_TABLE_B, driving
`monPicRender.ts`'s WIN0 window blend) renders the wrong pixels inside the
window (`x88-151`) for several ticks of *some* closes but not others -
confirmed independent of RENT/DESELECT (a bare `A` open then `B` close with
nothing else touched reproduces it too).

**Root cause, confirmed via direct RAM/IO-register inspection** (dev-time
recipe, `EmeraldOracle.core.memory.u16[...]`, scratch scripts not committed -
methodology below so this is reproducible):

1. `Task_CloseMonPic` (`reference/pokeemerald/src/battle_factory_screen.c:4250-4292`)
   is a completely clean, deterministic state machine: `data[5]`/`data[8]`
   (`tWinTop`/`tWinBottom`) step by exactly ±4 every single tick with **zero**
   periodicity or absolute-tick dependence - confirmed by dumping
   `gTasks[2]`'s raw `data[]` words tick-by-tick for both a clean close
   (press-tick 30) and a bad one (press-tick 36): the *internal* state is
   bit-for-bit identical between the two runs, just time-shifted by 6 ticks.
   `RunTasks`'s priority-linked-list shape (`gTasks[]` `prev`/`next`/`priority`
   fields, `reference/pokeemerald/src/task.c`) is also identical between the
   two runs, ruling out task-scheduling/insertion-order as a factor.
2. The *visible* WIN0V register is NOT the task's raw state - GBA's
   `SetGpuReg` (`reference/pokeemerald/src/gpu_regs.c:66-98`) always writes
   the new value into a shadow buffer (`sGpuRegBuffer`) immediately, but only
   copies it to the real hardware register **now** if `REG_VCOUNT` is
   currently inside vblank (161-225); otherwise it's queued
   (`sGpuRegWaitingList`) and only reaches hardware on the *next* vblank
   flush. This is a genuine, permanent 1-tick render lag, and
   `monPic.ts`'s existing `CLOSE_TABLE_B`/`CLOSE_TABLE_A` already correctly
   encode it (each table index N holds the task's internal value from tick
   N-1) - **this part was never the bug**.
3. The actual jitter: on some ticks, `Task_CloseMonPic`'s `SetGpuReg(WIN0V,
   ...)` call happens to execute *after* `REG_VCOUNT` has already crossed
   into vblank that frame (instead of before, which is the normal case),
   so the write lands on hardware immediately instead of being queued -
   collapsing the usual 1-tick lag and producing a "catch-up" (a skipped
   window-growth step, or a duplicated one on the next tick to resync).
   `REG_VCOUNT`'s value at the moment this one `SetGpuReg` call executes
   depends on the **total CPU cycle cost of everything else that ran earlier
   in the same frame** (`AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/
   `UpdatePaletteFade`/all of `RunTasks`, per `CB2_SelectScreen`) - a
   cycle-accurate hardware race, not game *state*.

**Confirmed NOT reducible to any state this engine tracks** (the decisive
test): replaying `tools/compare/traces/rent-slot1.json`'s exact button
sequence with 0/3/7/10/17 idle frames prepended (shifting every absolute
tick but preserving every *relative* offset - ticks-since-open,
ticks-since-RENT-confirm, close-table variant, all unchanged) produces a
**different** WIN0V catch-up pattern each time. So the jitter is a function
of absolute session tick (ultimately: total emulated CPU cycles since boot,
via `RunTextPrinters`/sprite-processing/etc. cost on nearby ticks) with no
proxy available in this engine's tick-level `EngineState` - only a
cycle-accurate CPU emulation would reproduce it exactly, which is out of
scope for a tick/state-machine reimplementation.

**Ruled out along the way** (leads from the previous investigation,
superseded by the above): `monPicBg`'s tileset/palette is genuinely static
across the close (RAM-dumped, no change) - the earlier "un-modeled
shimmer/palette-cycle" suspicion was wrong. It's also not about the DOWN
press, not about `hasActed`/close-table variant (clean and broken closes use
the identical variant), and not a fixed function of ticks-since-close-started.

**Confirmed scope of the visible damage:** for `rent-slot1.json` specifically,
`npm run compare` shows `DIFF` on frames 37-47 (the window-growth phase,
up to 3343px/8.71%) tapering down through frames 49-57 (1-64px, halving
roughly in step with the post-window flash-bar's own width table) - i.e. the
same one jitter event also perturbs the flash-shrink phase that immediately
follows, since it's driven by the same task's tick sequence. Frames 58-138
(fully past the close) are unaffected and independently RAM-verified exact
(RNG stream, state machine - see PROGRESS #17).

**Why this can't be fixed at this engine's level:** a correct fix would
require modeling per-frame CPU cycle cost across unrelated subsystems
(text printer drain state, sprite count, palette fade activity) precisely
enough to predict which side of the vblank boundary `REG_VCOUNT` lands on
for one specific `SetGpuReg` call - i.e. cycle-accurate CPU emulation. That
is a different order of engineering than this codebase's tick/state-machine
architecture and is not proposed here.

**Remaining work / options for a future slice (none attempted - would each
need explicit sign-off since they lean away from "model the real mechanism"):**
- Re-time `rent-slot1.json`'s RENT-confirm press so its close lands in a
  tick range empirically confirmed clean for *that exact* trace (not a
  general rule - the shift-test above proves no general rule exists). This
  is the "dodge" option the current brief explicitly ruled out, but may be
  the only practical unblock short of cycle-accurate emulation.
- Accept `rent-slot1.json` at 125/139 permanently and document the gap
  inline (its RENT/DESELECT-specific behavior is already independently
  RAM-verified via `tests/rentSelect.test.ts`/`tests/ballAnim.test.ts`, so
  the uncovered pixels are 100% attributable to this pre-existing,
  RENT-independent close-animation jitter, not to unverified S5 logic).
