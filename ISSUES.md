# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #9 — confirm-flow YES/NO dwell: multi-ball `SpriteCB_Pokeball` timing drift over a long undisturbed 3-ball idle, never exercised by any committed trace

**Symptom:** rebuilding `confirm-flow.json` (rent-3picks.json's exact button
prefix + idle to frame 279, dense captures 185-279) after fixing ISSUES #8's
3 gaps (see PROGRESS #34) still leaves periodic diffs scattered through
BOTH the reveal window (confirm+16 to confirm+40ish) and the settled YES/NO
dwell (confirm+48 onward through the last capture, frame 279) — every one
confined to a single rented ball's own 32x32 OBJ region (never the window,
text, or flash-bar pixels, which are all now clean), and every one small
(36-180px). This is a **4th, distinct** gap from #8's 3 (which were about
the reveal's own window/sprite/text rendering, all now fixed) — it's the
pre-existing `ballAnim.ts` model (already RAM-verified for shorter,
input-interrupted multi-ball windows by the now-closed ISSUES #6/#7) being
exercised, for the first time in any committed trace, by ~90 continuous
ticks of 3-balls-simultaneously-idle with **no cursor/menu input at all**
to periodically resync it. Not attributable to ISSUES #5 (wrong region:
ball OBJ pixels, not the WIN0 window; wrong shape: small steady blips, not
a shrinking/growing transient).

**Confirmed (this session, via `tools/compare` + oracle diffing, scratch
`confirm-flow.json` not committed):**
- All 3 rented balls are implicated at different times, not just one:
  frames 205/209/213/217/221/225/229 (bbox x21-42/y54-73, ~170-180px each,
  every 4 ticks) match ball **slot0**'s own 32x32 region (`ox=35*0+32-16=16`
  per `factoryDraftScreen.ts`'s ball layout); frames 237/254/258/270/274
  (bbox x69-77/y60-73, 45px) and 246/250/262/266 (x69-76/y61-73, 36px)
  match **slot1**'s region (`ox=51`); frames 256/264/272 (x91-110/y54-73,
  143-151px) match **slot2**'s region (`ox=86`).
- Not a regression from this session's ISSUES #8 fixes: the same pattern
  (with the same bboxes) is already present, byte-for-byte, in the
  *pre-fix* `npm run compare` run from earlier this session — the old
  font.ts bg-overrun bug (ISSUES #8 gap 3, since fixed) added a constant
  +30px to every dwell frame's count on top of it (e.g. old frame 256's
  181px = new 151px + the old bug's 30px), confirming the two are
  independent and this one predates every change committed this session.
- `core.ts`'s per-tick ball-anim loop is unconditional and un-gated by
  `confirmed`/`confirmReveal` state (by design, RNG-critical per
  `docs/confirm-flow-notes.md` §4) — `ballAnimStall` is freshly computed
  `[]` every tick with no cursor/menu input to ever populate it during this
  window, so the existing per-ball `advanceBallAnim` state machine
  (`ballAnim.ts`) runs fully undisturbed for the whole ~90-tick stretch -
  the first time any committed trace has exercised that for this long with
  all 3 slots simultaneously active.

**Leads:**
1. RAM-probe `gSprites[ballSpriteId].data[]`/`animCmdIndex` for all 3 ball
   slots across a dense confirm-flow-shaped idle window (same recipe as
   ISSUES #6/#7: `EmeraldOracle`, sprites located by known screen position)
   and cross-correlate tick-by-tick against `ballAnim.ts`'s internal
   `phase`/`cmdIndex`/`timer` state for the same replay, the way ISSUES #7's
   own fix was found — the periodicity (slot0's every-4-ticks cadence is
   notably regular) suggests a clean, state-derivable rule rather than
   another #5-style hardware race, but this needs RAM ground truth to
   confirm either way.
2. `ballAnim.ts`'s own `REST_INTERNAL_OFFSET`/`FAILURE_REROLL_DELAY` fudges
   are explicitly documented as tuned against 1-2-ball scenarios
   ("single-ball behavior is unaffected either way... a second ball's own
   interleaved draws made during that gap desync without this") - a 3-ball
   simultaneous scenario, run for many consecutive cycles with no
   interrupting stall, is untested territory for those constants; check
   whether a 3-ball-specific adjustment (same family as #7's slot-count-
   dependent fixes elsewhere in this screen) is needed.
3. Once modeled, rebuild `confirm-flow.json` (recipe: `rent-3picks.json`'s
   exact 19 segments + one 90-tick idle segment appended, `captureFrames`
   185-279) and re-run `npm run compare`; commit once clean modulo ISSUES
   #5's own already-accepted window-jitter pattern (frames 189-197ish, the
   3rd pick's own popup-close catch-up, byte-for-byte matching this same
   trace's own ball1/ball2 closes at frames 38/39 and 114/115 - see
   PROGRESS #34 for the cross-check that closed ISSUES #8's own gap 1).

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
