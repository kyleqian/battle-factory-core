# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #8 — confirm-flow reveal render: wide-window BG3 content is only approximated (tiled), and its state-machine tick boundaries are pixel-diff-derived, not RAM-verified

**Symptom:** `docs/confirm-flow-notes.md`'s reveal (3rd RENT confirm → 3-mon
reveal → YES/NO idle, implemented S5 slice 3, `src/engine/confirmReveal.ts`)
is state-machine-complete and RNG-exact, but a candidate `confirm-flow.json`
trace (rent-3picks.json's exact button prefix + idle through the reveal)
does **not** reach 0-diff-modulo-ISSUES-#5: starting around the wide WIN0
window's opening (~confirm+34) through the settled YES/NO idle, `npm run
compare` shows 1000-5000px diffs (2-14% of frame) — an order of magnitude
bigger than, and at a different location than, ISSUES #5's own
x88-151-confinement pattern. Not attributable to that policy; the trace was
**not committed** per the brief's stop condition.

**Confirmed:** `Select_ShowChosenMons`/`Select_Task_OpenChosenMonPics`
(`battle_factory_screen.c:2119-2244`) create 3
`sSpriteTemplate_Select_MonPicBgAnim` sprites (x=44/120/196) — the *same*
sprite template/affine-anim table `monPic.ts`'s single-popup flash already
models — so the flash-zoom phase reuses that module's own oracle-pinned
widths (1/1/4/4/8/8/16/16/32/32/64/64) at 3 positions, oracle-cross-checked
this slice. The wide window (x16-224 vs the single popup's x88-152) growing
(64,65)→(32,96) is the same 4px/tick pattern too. What's **not** verified:
(1) the wide window's BG3 pixel content — `src/assets/gen/mon-pic-bg.json`'s
tilemap is only 8x8 tiles (extracted for the narrow single-popup window
pre-this-slice); `monPicRender.ts`'s new `bg3ColorTiled` approximates the
wide window by tiling that same 8x8 pattern every 64px, which oracle
sampling (this slice, scratch) shows is close in shape (near-uniform wash,
consistent with a mostly-solid-fill BG3 tile) but not exact; (2)
`confirmReveal.ts`'s exact phase-boundary tick counts (13 flash incl. 1-tick
creation lag, 8 window-growth + 3 hold, +1 cursor lag) were derived from one
dense oracle pixel-diff pass this slice, not independently RAM-verified
byte-level like `monPic.ts`'s own `OPEN_TABLE_*`/`CLOSE_TABLE_*`.

**Leads:**
1. RAM/VRAM-dump BG3's actual tile/palette content during the wide window
   (not just infer it from pixel diffs) — the existing
   `tools/extract/inspect-anchor.py`-style recipe should extend to pull a
   wider tilemap region than the narrow window ever needed.
2. RAM-verify `confirmReveal.ts`'s tick boundaries the way `monPic.ts`'s
   tables are pinned (direct task/sprite-state struct reads across several
   checkpoint ticks, not just "the pixels changed here").
3. Once (1)/(2) land, rebuild `confirm-flow.json` against the exact
   rent-3picks.json prefix and re-run `npm run compare`; commit if clean
   modulo ISSUES #5's own already-accepted pattern.
4. The decline path (B/NO back to cursor mode, `docs/confirm-flow-notes.md`
   §3) is still unimplemented — explicitly a stretch goal, not attempted
   this slice.

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
