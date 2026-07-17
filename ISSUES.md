# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #7 — multi-ball `ballAnimStall` model still wrong once a THIRD ball enters
  the picture: ball tile mismatches appear during pure-idle dwell with 2
  balls rented, unrelated to ISSUES #5's popup-close window (blocks
  `rent-3picks.json`)

**Symptom:** building the 3-pick dense trace (rent slot1 → RIGHT → rent
slot2 → RIGHT → rent slot3, each rent = `A`(2f) idle28f `DOWN`(2f) idle4f
`A`(2f), same shape as the committed `rent-slot1.json`, confirms landing at
press-ticks 37/113/189) surfaces `npm run compare` diffs at **ball OBJ
positions** (bbox e.g. x57-77/y54-73 = slot index 1's ball, x22-42/y54-73 =
slot index 0's ball) during plain idle dwell with no button held - i.e. well
outside any `CloseMonPic` popup-close window (which is confined to the
`x88-151` mon-pic-bg blend region per ISSUES #5's own scope). This is
exactly the "diffs at ball positions outside close windows" case the S5
worker brief calls out as "a model bug, investigate, don't attribute."

**Root-cause method (evidence, reproducible):** rather than trusting
`ballAnimTile()`'s own internal state, cloned the *oracle's own PNG* for a
mismatched frame and overlaid each of the ball's 3 candidate anim tiles
(0/16/32, `pokeball.selectedPalette`) directly onto it via `drawSprite`
(same call the renderer uses) - the **correct** tile is the one whose
overlay produces **zero residual diff** against the untouched oracle frame
(a same-bitmap-on-itself no-op; any other tile leaves nonzero diff both from
its own different pixels AND stale edge pixels from the ball graphic
underneath). This cleanly separates "which tile is objectively correct" from
this engine's (possibly wrong) internal state, with no RAM access needed.
Results for the specific trace above:
- **frame 124, ball index 1** (rented at confirm-2, press-tick 113 - only 11
  ticks earlier): true tile = **32**; engine's `ballAnimTile` = **0**.
- **frame 155, ball index 0** (rented at confirm-1, press-tick 37, 118 ticks
  earlier - well past `ballAnimMultiBall.test.ts`'s scenarios, which only
  probe to frame ~260 total but only under a SINGLE cross-ball stall event
  at a time): true tile = **32**; engine = **0**.
- **frame 163, same ball 0**: true tile = **0**; engine = **32** (i.e. the
  engine is sometimes *behind* and sometimes *ahead* of the correct phase by
  this point - not a constant offset).

**Why this looks like a genuinely untested scenario, not a regression of the
ISSUES #6 fix:** by frame ~145 this trace has moved the cursor with `RIGHT`
a *second* time (slot 1 → slot 2) while **two** balls (index 0 and 1) are
simultaneously rented - i.e. one trigger's `ballAnimStall` must stall *two*
already-active balls at once. `tests/ballAnimMultiBall.test.ts`'s own
"two-ball scenario" (the only multi-ball RAM-pinned case) never reaches this
shape: it only ever has a trigger stall exactly **one** already-active ball
(ball 0, from either the slot-2 `RIGHT` move or the slot-2 `RENT`-confirm,
never both at once). Ball 0 in the new repro above has accumulated **three**
stall-worthy trigger events by frame 163 (the `RIGHT` to slot 2, the slot-2
`RENT`-confirm, and the `RIGHT` to slot 3 - the last one shared
simultaneously with ball 1) - the two-simultaneous-stall case is completely
unverified. Separately, ball 1's own frame-124 mismatch (only 11 ticks after
its *own* confirm, before any second `RIGHT` exists yet) hints there may be
a second, independent gap in how a freshly-rented ball's settle/roll timeline
interacts with a same-tick stall applied to some *other* ball - these two
sub-symptoms were not disentangled this session.

**Not attributable to ISSUES #5:** confirmed by bbox location alone (ball
OBJ tiles, not the `x88-151` mon-pic window) - independently cross-checked by
the overlay method above, which needs no popup/window state at all.

**Status:** root cause not isolated - this needs the same caliber of
dev-time RAM probe ISSUES #6 used (`gSprites[ballSpriteId].data[0]`/`animNum`/
`animEnded` per rented ball, dumped tick-by-tick) but for a **3-ball**
scenario with **two sequential cursor moves**, to see whether: real hardware
only stalls *one* of the two simultaneously-active balls per trigger (not
both), stalls both but by a different amount, or something else entirely.
Do not guess at a fix without that data - the current `ballAnimStall` model
scored the two-ball case exactly right by being precise about the mechanism,
and a wrong guess here would silently re-break that.

**Blocks:** `rent-3picks.json` (needs a 2-ball-then-3-ball dwell window to
assert ball-rock churn per the S5 brief) and the accompanying 3-ball
`gRngValue` Tier-1 RAM-pin (would either pin a known-wrong stream or require
fixing this first) - neither was committed this session; see `PROGRESS.md`.

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
