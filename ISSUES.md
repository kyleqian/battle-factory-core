# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #7 — `rent-3picks.json` still blocked: a SECOND, narrower ball-render bug
  (a second active ball's own display-tile lags real hardware by 1 tick
  around its cmdIndex8→9→10 moving-cadence transition), unrelated to the
  LEFT/RIGHT stall rule this entry used to be about.

**The LEFT/RIGHT stall rule itself is FIXED** (worker, this session):
`ballAnimStall`'s cursor-move branch now stalls every active ball only when
the entering slot's species is outside `{BAYLEEF, HAUNTER}`
(`cursorMoveStallsBalls`, `factoryDraftScreen.ts`) - the corrected 2-species
safe-list from the prior "sixth worker update" (12/12 RAM data points, zero
exceptions; full evidence table was in this entry's history, now pruned -
see git log for `factoryDraftScreen.ts`/this file around 2026-07-17 if
needed). Pinned with `tests/ballAnimSpeciesStall.test.ts` (6 tests) against
the RAM-derived checkpoints (Probe A: action ticks 79/121/163/205, decisive
HAUNTER-no-stall window 203→207; Probe C: count=2 HAUNTER-no-stall windows
276→284 and 275→307). RENT/DESELECT confirms are unchanged (always stall
every other active ball, species-independent). `npm test` 270/270, build
green, `rent-slot1.json` re-verified still 125/139 (no regression).

**But `rent-3picks.json` still can't ship clean** - building the exact
PROGRESS-archive #21 trace (rent slot0 → dwell36 → RIGHT into MAGBY (stalls,
action tick 75) → rent slot1 → dwell36 → RIGHT into BAYLEEF (no stall, action
tick 151, now correctly modeled) → rent slot2, confirm press-tick 189) and
running `npm run compare` (scratch trace, captures 0-245, not committed)
surfaces:

- **Frames 168-170, 189: DIFF confined to x88-151** (the mon-pic-bg blend
  window) - matches ISSUES #5's already-accepted WIN0V-jitter pattern
  exactly (same bbox, same class), fine per #5's settled policy.
- **Frames 180 and 188: DIFF at x56-76/y54-73 (176px each) - OUTSIDE
  x88-151, at ball-index-1's (MAGBY) own OBJ position.** This is the
  brief's explicit stop condition ("diff at ball OBJ positions or otherwise
  outside a close window means the stall model is still wrong").
- **Frames ≥190: diff explodes immediately** (949px at 190, growing to
  13271px by 234+, bbox spreading up to x239/y32-156) - the "Are these three
  POKéMON OK?" YES/NO reveal chain (unimplemented screen, out of scope per
  entry 26) starts diverging essentially the very next tick after the 3rd
  confirm, not gradually - confirms the trace's own captures must end
  strictly at or before tick 189 (189 itself is clean/#5-attributable; 190+
  is not).

**Root-caused the 180/188 diff, confirmed NOT a stall-model bug:**
cross-checked via `git worktree` against the pre-this-session commit (before
the species-key fix landed) - the 176px diff at 180/188 is **byte-identical
before and after the fix**, so it isn't caused by (or fixable via) the
LEFT/RIGHT stall rule at all. Ball 1 (MAGBY, rented at confirm press-tick
113) experiences zero stall triggers between its own selection and tick 188
(RIGHT into BAYLEEF at tick 151 is correctly a no-stall event for it too,
confirmed identical before/after the fix) - pure zero-stall arithmetic from
`MOVING_CMDS`' fixed durations independently predicts its internal `cmdIndex`
reaches 9 at tick 179 exactly, which **matches the engine's actual internal
state** (verified via a scratch replay). The bug is specifically in the
**display tile**, not the internal/RNG-critical cmdIndex: overlaying each
candidate ball tile (0/16/32) onto the oracle's own frame-180 PNG (same
zero-residual-diff method as this entry's original "second worker update")
shows the oracle displays tile **16** at frame 180 and tile **0** at frame
188, while the engine (per `ballAnimTile`'s documented 2-tick display lag)
still shows the *previous* tile at each of those frames, catching up exactly
1 tick late (engine shows tile 16 starting frame 181, not 180; tile 0
starting frame 189, not 188). So `ballAnimState.displayTile`'s "always
exactly 2 ticks behind" constant (`ballAnim.ts` header doc) isn't exactly 2
for this transition on a second simultaneously-active ball - it's 1. Not
root-caused further this session (why the lag varies is unknown - possibly
the same class of composition gap this entry originally suspected before
being redirected to the LEFT/RIGHT stall question).

**Do not guess a fix.** This is a different, narrower bug than the one this
entry spent its history on - the LEFT/RIGHT species-stall rule is correct
and shipped. `rent-3picks.json` remains blocked until a future session
RAM-probes the display-lag mechanism for a second active ball directly (same
recipe as this entry's prior sessions: `EmeraldOracle` + corrected `struct
Sprite` offsets, dump `animCmdIndex`/`data[0]` tick-by-tick for
`gSprites[1]` across a 2-ball dwell with no cursor moves at all - the bug
reproduces with just 2 plain rents, no RIGHT/LEFT needed, since it's tied to
ball 1's *own* cmdIndex8→9→10 transition timing, not to any stall trigger).

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
