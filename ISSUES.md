# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #12 — un-reveal first-ticks residual: `confirm-decline.json` frames
  253-255 (156/251/1129px) not root-caused

**Symptom:** small diffs in the un-reveal's first 1-3 visible ticks
(`Select_Task_CloseChosenMonPics` window, right where the YES/NO box +
mon pics tear down).

**Status:** NOT attributable to ISSUES #5 (different task than
`CloseMonPic`; no cycle-jitter evidence gathered — the decline worker noted
"same character" but did not probe). History warns against premature
jitter attribution: ISSUES #8/#9/#10 all looked like this and were all
real, fixable modeling bugs. Needs a RAM/pixel chase (the #9/#10 recipe:
dense captures + direct RGB row-scans + `gSprites`/task-state probes).

**New evidence (2026-07-17, ISSUES #11 worker, `tools/probe/ram-probe.py`):**
RAM-probing `confirm-decline.json`'s actual decline tick-by-tick
(`fadeSpeciesNameActive` at `sFactorySelectScreen+0x2A2`) shows the real
flag flips TRUE exactly **one tick after** this engine's own decline branch
(`core.ts`, `newKeys.has("B") || (A && yesNoCursorPos===1)`) fires its other
same-tick effects (`selectedIds`/`message`/`confirmReveal`→"closing") — even
though in the source, `Select_DeclineChosenMons()` and
`fadeSpeciesNameActive = TRUE` are the same synchronous call
(`battle_factory_screen.c:1556`/`1567`), so they can't really be 1 tick
apart in the real game. The likely explanation: this engine's decline
branch itself fires 1 tick early relative to the oracle for *all* its
effects, not just this one — a plausible root cause for this entry's
253-255 residual (frames right at that same boundary). Not chased further
(out of scope for that step); the speciesNameFade wiring compensates with
an explicit +1 tick delay on its own activation only (`core.ts`, see the
comment at the `wasClosingAtZero` check) rather than touching the existing
(possibly off-by-one) decline branch itself.

## #13 — periodic ball-area bumps during the post-decline window (11
  frames: 259/263/267/270/271/273/275/278/286/294/302, mostly +173-176px
  (273 is +3px), y54-73)

**Symptom:** on top of #11's now-fixed constant baseline, the ball-rendering
area diffs on a rough ball-anim cadence while the un-reveal plays out and
after.

**New evidence (2026-07-17, ISSUES #11 worker):** with #11 fixed
(`confirm-decline.json` now 53/67, `npm run compare`), an 11th frame in this
family surfaced: **273** (3px, `x=44/120/196,y=64` — the ball row), much
smaller than the other 10's ~173-176px but the same y54-73 ball-area
region and clearly independent of species-text rendering (verified: the
species-name-fade commit touches only `drawText`'s palette argument for the
WIN_SPECIES window, nothing ball-related — `git diff` of that commit has no
`ballAnims`/`drawSprite`/`drawConfirmReveal` changes). Was invisible before
#11's fix because every frame 256-306 was already diffing on the ~129px
species-color baseline, so a lone independent 3px bump never stood out in
the prior (un-decomposed) per-frame counts. Confirms this entry isn't
specific to the ~173-176px magnitude — the underlying stall/lag predicate
fires on some 11th tick too, just with a smaller footprint there.

**Lead:** a display-lag/stall analogue of `isRevealStallActive` on the
un-reveal side (decline's own print call is already modeled as a 1-tick
`ballAnimStall`; something near `Select_Task_CloseChosenMonPics` — or the
`Select_CreateChosenMonsSprites` teardown mirror — may add more).
RAM-probe balls' `animCmdIndex`/`displayTile` across the decline window
with ISSUES #9's method (or the newly-committed `tools/probe/ram-probe.py`,
see its own usage note). Fix likely lands in `ballAnim.ts`/`core.ts` as
one more stall predicate.

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
