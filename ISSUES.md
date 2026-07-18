# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #7 — `rent-3picks.json` still not committed: the display-lag bug that
  blocked it is FIXED and RAM-pinned; a future session should re-run the
  compare below, classify the (already-analyzed-as-likely-benign) extra
  diff frames precisely, and ship the trace.

**Both the LEFT/RIGHT stall rule AND the second-ball display-tile lag are
now FIXED.** `ballAnimStall`'s cursor-move branch stalls every active ball
only when the entering slot's species is outside `{BAYLEEF, HAUNTER}`
(`cursorMoveStallsBalls`, `factoryDraftScreen.ts`; 12/12 RAM data points,
zero exceptions - full evidence table pruned from this entry, see git log
around 2026-07-17). `advanceBallAnim` (`ballAnim.ts`) now takes a per-slot
`displayLagTicks` (2 for slot 0, 1 for every other slot, wired from
`core.ts`'s ball-index loop) instead of a flat 2 - RAM-probed (dev-time
EmeraldOracle, scratch scripts, ~80 cadence transitions across both balls
of a 2-rent dwell): real hardware's own OAM-buffer display lag from *its
own* `animCmdIndex` is a uniform 1 tick for every ball, always; the old
flat "2" was only ever correct for slot 0 because slot 0's *own*
settling-phase internal `cmdIndex` model runs exactly 1 tick EARLY vs real
hardware's `animCmdIndex` (confirmed via engine-state dump: this engine's
ball 0 hits `cmdIndex` 9 at tick 104 in a two-ball dwell, one tick before
RAM's tick 105 - a pre-existing quirk the `REST_INTERNAL_OFFSET` comment
already flagged as present-but-harmless for single-ball). Slot 1's internal
`cmdIndex` has no such offset (matches RAM tick-for-tick), so it only needs
the real 1-tick lag. Pinned in `tests/ballAnimDisplayLag.test.ts` (3 tests)
against the RAM checkpoints (slot 0's cmdIndex8->9 transition at engine
tick 104, display update at 106; slot 1's at engine tick 179->display 180
and 187->display 188 - the exact two originally-reported bad frames).
Confirmed via `npm run compare` against a scratch reconstruction of the
3-pick shape that **frames 180 and 188 (previously 176px diffs at
ball-index-1's own OBJ position) now match exactly** - the reported bug is
gone. `npm test` 273/273, build green, `tools/compare/traces/rent-slot1.json`
re-verified unchanged at 125/139 (slot 0's own path is untouched).

**`rent-3picks.json` itself is still not committed** - not because of any
remaining known bug, but because a scratch reconstruction of the trace
(rent slot0 confirm@37 -> dwell36 -> RIGHT into MAGBY action-tick75 -> rent
slot1 confirm@113 -> dwell36 -> RIGHT into BAYLEEF action-tick151 -> rent
slot2 confirm@189, dense captures 0-189) surfaced **more diff frames than
this step's brief anticipated** ("168-170 and 189 only"), and the step's
own stop condition ("any other diff -> STOP, do not commit, document")
applied literally, so nothing was committed even though every extra diff
frame appears benign on inspection:

- **Frames 37-57 (14 frames, 190px->3343px->1px tapering) and 113-133 (16
  frames, same tapering shape)**: bbox-identical, pixel-count-identical to
  `rent-slot1.json`'s own **already-committed, already-accepted** 14-diff
  ISSUES #5 pattern (window-growth/flash-bar WIN0V jitter after a RENT
  confirm) - these are the SAME mon-pic-close jitter recurring once per
  rent (rent slot0's own close =37-57, rent slot1's own close =113-133,
  each offset from its own confirm tick identically to the single-ball
  baseline). Not new, not ball-OBJ-position bugs (frame 37/113's own
  190px sub-frame IS at each ball's OBJ x-range, but is byte-identical to
  the already-shipped `rent-slot1.json` frame 37, so pre-existing/accepted,
  not a new regression).
- **Frames 152-153 (127px at x196-236/y20-28, then 240px at x59-109/y80-92)**:
  land right after the second RIGHT move (action tick 151, into BAYLEEF).
  Bbox 152 (x196-236/y20-28) is in the species-name-text region, plausibly
  ROADMAP's already-documented, out-of-scope `Select_Task_FadeSpeciesName`
  "perpetual palette breathe... past ~104 [idle] frames... not yet modeled"
  gap (Domain notes) triggered by the species-name redraw the RIGHT move
  causes. Bbox 153 (x59-109/y80-92) is below the ball row (y64), not
  identified this session - needs its own bbox/overlay check before
  attribution.
- **Frames 168-170 (x88-151) and 189 (x93-110/y55-68, 107px)**: match the
  brief's own expectation, #5-attributable per the established pattern.
- **Frames 180 and 188: now CLEAN (0 diff)** - the bug this entry tracked
  is fixed.

None of the extra frames are at a ball's OBJ position in a way that isn't
already independently accepted (`rent-slot1.json`'s own committed 14-diff
list matches the 37-57 cluster exactly), so this is very likely shippable
as-is - but per the brief's explicit stop condition, it wasn't committed
without a fresh verification pass. **Next session:** (1) confirm frame
153's bbox against the species-name/message-text redraw hypothesis (RAM
probe or overlay method); (2) re-run `npm run compare` against the scratch
trace shape above (segments: 2A/28idle/2DOWN/4idle/2A confirm@37, 36idle,
2RIGHT, 2A/28idle/2DOWN/4idle/2A confirm@113, 36idle, 2RIGHT, 2A/28idle/
2DOWN/4idle/2A confirm@189, dense captures 0-189) to reconfirm the exact
diff set is stable; (3) if clean, commit `rent-3picks.json` with the
per-frame attributions in the message, delete this entry, and re-run
`npm run compare -- rent-slot1.json` (must stay 125/139).

## #5 — [POLICY SETTLED 2026-07-17, user-delegated] mon-pic close WIN0V
  jitter: 0-diff stays the bar; re-time trace interactions into clean
  windows where feasible; otherwise ship with each non-matching frame
  individually attributed to this entry's pattern (x88-151 close-window
  confinement). No further fix attempts. rent-slot1.json: RESOLVED to the
  attribution fallback (supervisor, 2026-07-17 ~16:20) — a worktree worker
  swept 8 re-time candidates around the archived "~31" window (confirm
  press-ticks 29-35, incl. DOWN-tick variations; ~47+ stays excluded, it
  blows the species-name-breathe budget): EVERY candidate was worse than
  the committed baseline (15-27 diffs vs baseline's 14), no exploitable
  pattern — consistent with the chaotic cycle-cost root cause below.
  rent-slot1.json ships at 125/139 permanently, all 14 frames attributed
  to this entry's pattern; no further re-time attempts unless a future
  session sweeps the untried ~40-60 tick range with a breathe-budget
  workaround. Mechanism summary below is kept for attribution evidence;
  this is no longer an open work item.

## (mechanism record) mon-pic close animation: WIN0V catch-up jitter is real hardware
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
