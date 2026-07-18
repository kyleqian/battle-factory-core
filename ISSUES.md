# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #9 — [ball-anim part FIXED] confirm-flow.json still blocked - by a NEW, unrelated gap (#10), not by this issue's own ball-anim drift

**Original symptom (FIXED this session, RAM-probed + committed):** the
`ballAnim.ts` display-lag model was wrong in two ways, both only visible
over a long undisturbed 3-ball idle (never exercised by any committed trace
before this session's `confirm-flow.json` rebuild attempt): (1) slot 0's
2-tick display lag (ISSUES #7) was hardcoded permanently, but RAM-proved to
apply only during slot 0's *first* moving cycle - `REST_INTERNAL_OFFSET`'s
own extra tick already resyncs slot 0's internal `cmdIndex` with RAM the
moment it first passes through "resting", so every cycle after that only
needs the same 1-tick lag every other slot always has; (2) a previously
unmodeled 4th stall source - `Select_CreateChosenMonsSprites()`'s own
per-frame cost, same shape as the already-modeled LEFT/RIGHT/RENT-confirm
text-print stalls (`ballAnimMultiBall.test.ts`) - adds 1 more display-lag
tick to every currently-active ball, landing near the reveal's
window-fully-grown hold (RAM-confirmed via all 3 slots' own next
`cmdIndex`-transition boundary after that point, all consistent with one
shared, screen-level event). Both are display-only fixes (`ballAnim.ts`'s
new `hasRested` field + `confirmReveal.ts`'s new `isRevealStallActive`) -
the RNG-critical internal `phase`/`cmdIndex`/`timer`/`pendingRest` state
machine was not touched, so every existing RNG pin still passes unmodified.
RAM-probed (all 3 ball slots simultaneously, `gSprites[]` located by known
screen position, cross-correlated tick-by-tick against `ballAnim.ts`'s
internal `cmdIndex` for confirm-flow.json's exact button script - scratch
probe script, not committed) and cross-verified exhaustively against the
fixed engine: **0 displayTile mismatches across all 3 slots for the full
280-tick window** (down from 15 before the fix). Fixed in `ballAnim.ts`/
`confirmReveal.ts`/`core.ts`, pinned by 4 new Tier-1 tests in
`ballAnimDisplayLag.test.ts` (`npm test` 292→296). See that commit for the
full evidence/derivation.

**Why #9 stays open instead of being deleted:** rebuilding
`confirm-flow.json` with the fix above eliminated *every* ball-OBJ diff
(frames 223-279 - the entire window-hold + shown/YES-NO-dwell portion - are
now byte-exact) but exposed a **5th, different, unrelated** gap in the
reveal's own flash-bar rendering (frames 210-222, confirmReveal's `flash`
phase itself) that has nothing to do with ball anims - filed as ISSUES #10.
`confirm-flow.json` cannot be committed until #10 is also resolved (or
explicitly deferred with sign-off), so this entry stays open as a pointer:
**the remaining blocker for `confirm-flow.json` is #10, not this issue's
original ball-anim scope, which is done.** One unrelated, pre-existing,
out-of-window gap also remains at absolute tick 114 (a `ballAnimStall`/
display-lag-chain interaction during slot 0's first cycle, unaffected by
this session's fix, outside `confirm-flow.json`'s captured range 185-279,
already present in `rent-3picks.json`'s own long-standing 157/190 count) -
not chased this session, no evidence yet of a clean rule for it.

**Confirm-flow.json rebuild recipe (unchanged, still correct):**
`rent-3picks.json`'s exact 19 segments + one 90-tick idle segment appended,
`captureFrames` 185-279. Frames 189-209 are ISSUES #5's own already-accepted
window-jitter pattern (the 3rd pick's own popup-close catch-up, tapering
189→199 then a shrinking halving tail 199/201/203/205/207/209 - 32/16/8/4/
3/1px, matching the mechanism record's own "halving... flash-bar width
table" description); frames 210-222 are ISSUES #10 (below); frames 223-279
are clean.

## #10 — confirmReveal.ts's own flash-bar width table is 1 tick early on every doubling step (not ISSUES #5 - deterministic, not a hardware race)

**Symptom:** during `confirm-flow.json`'s reveal-flash phase (engine ticks
210-221, `confirmReveal.ts`'s `flash` phase, `FLASH_WIDTHS =
[1,1,4,4,8,8,16,16,32,32,64,64]`), the 3 border-deco flash bars
(`REVEAL_FLASH_CENTERS = [44,120,196]`) render 1 tick too wide, every single
time the table doubles - not a chaotic ISSUES #5-style hardware race
(that varies with absolute session tick / unrelated CPU cost and would not
reproduce identically frame-for-frame): this is a clean, deterministic,
always-in-the-same-direction 1-tick shift, present on **every** doubling
boundary in this specific window (frames 210/212/214/216/218/220/222 all
diff by a growing amount - 3/9/12/24/48/96/133px - alternating with clean
matches at 211/213/215/217/219/221), not just one transition.

**Confirmed (this session, via `tools/compare` + direct pixel sampling,
scratch `confirm-flow.json` not committed - see ISSUES #9):** at engine
tick 220 (`confirmReveal.elapsed` 10, `FLASH_WIDTHS[10] = 64`), this
engine's bar 1 (center 44) already spans its full 64px width (x12-75) -
but the oracle's own frame 220 still shows the *previous* pair's 32px width
(x28-59 flash-colored, x12-27 still background/cursor/arrow colors
underneath) - the oracle doesn't reach width 64 until frame 221. Sampled
pixel-by-pixel (`app`/`oracle` RGB at y=64, x=0-39) to confirm this is a
genuine 1-tick-early *width* mismatch, not an unrelated color/blend bug -
every differing pixel is exactly this engine's *next* pair's width already
painted where the oracle's *current* pair's un-painted background/cursor
colors still show. All 3 bars show the identical shift (confirmed via the
full-frame bbox: 6 flanking clusters at frame 220, 2 per bar, exactly the
gap between this engine's width and the oracle's narrower one).

**Not #5:** #5's mechanism is a `SetGpuReg`/`REG_VCOUNT` vblank-boundary
race whose outcome depends on total CPU cycles burned earlier in the same
frame by unrelated subsystems - it produces different jitter patterns for
the same relative offsets shifted to different absolute ticks (the
shift-test in #5's own mechanism record). This gap reproduces identically
on every doubling boundary in a single trace with no such absolute-tick
dependence tested yet, and it's a clean single-tick, single-direction
shift (this engine always *ahead*, never behind) rather than a
catch-up-then-resync pattern - consistent with an ordinary off-by-one in
this engine's `flash` phase tick bookkeeping (same family as this file's
own already-fixed `WINDOW_STEPS` extra-hold-tick bugs), not a hardware race.
Not yet RAM-verified against `Task_...`'s own tick count though - the lead
below is the next step, not a re-litigation of #5.

**Leads:**
1. RAM/register-probe (same recipe as `confirmReveal.ts`'s own module-doc
   citations, ISSUES #8) the flash-bar affine-anim's actual per-tick zoom
   step during `confirm-flow.json`'s specific button script, to find
   whether the *true* oracle-visible bar width sequence needs one more
   hold tick somewhere in `FLASH_WIDTHS` (same shape as the already-fixed
   `WINDOW_STEPS` hold-tick gap, PROGRESS #33) - or whether the discrepancy
   is instead in `getConfirmRevealVisual`'s `elapsed` bookkeeping (an
   off-by-one in when `flash:0` should first apply after the 1-tick
   creation lag) rather than the table's values themselves.
2. Check whether this same off-by-one is *also* present (and simply never
   caught) in `monPic.ts`'s own single-ball flash, which reuses the
   identical `FLASH_WIDTHS`-shaped table/lookup pattern - if committed
   traces with single-ball flashes (e.g. `rent-slot1.json`) are clean
   through their own flash phase, the bug is specific to
   `confirmReveal.ts`'s *own* `elapsed` timing (its 1-tick creation-lag
   convention, or the extra ticks `WINDOW_STEPS`/flash-phase-transition
   bookkeeping already juggles elsewhere in this file), not the shared
   table.
3. Once modeled and RAM-verified, re-rebuild `confirm-flow.json` (same
   recipe as ISSUES #9's own note above) and re-run `npm run compare`;
   commit once clean modulo ISSUES #5's frames 189-209.

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
