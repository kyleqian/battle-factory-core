# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #15 — pre-battle message-box frame art is baked from oracle pixels, not
  derived from the extracted asset (debt, works but unexplained)

**Symptom:** `src/assets/gen/prebattle-msgbox-frame.json` (S5 accept slice,
commit `c4880d4`) holds the box's pre-text frame as literal oracle-capture
pixels because rendering `prebattle-room-msgbox.json`'s extracted
tile/palette data through the standard `DrawDialogueFrame` tile algorithm
produced a consistent one-GBA-step color offset vs the oracle (~20 min
attempt, not root-caused — accept worker's PAPERCUT, 2026-07-18).

**Why it matters:** the committed trace is pixel-exact so nothing is
functionally wrong today, but the baked asset can't generalize (other
rooms/messages reuse `message_box.png`), and "one GBA step" smells like a
small, findable pipeline bug — likely the 15→24-bit expansion applied
once too many/few times, or an off-by-one palette slot, in either
`extract-prebattle-room.ts`'s msgbox path or the render step. Compare
against `docs/prebattle-room-notes.md` §3's two-asset rule (frame art vs
`text-palette.json` interior fill) before suspecting the algorithm itself.

**Fix bar:** derive the frame from `prebattle-room-msgbox.json` (or a
corrected re-extraction), delete the baked asset, and re-verify
`accept-prebattle.json` at its exact then-current count.
  8 frames, tapering (`accept-prebattle.json`)

**Symptom:** during the A-on-YES closing/un-reveal (`confirmReveal.ts`'s
"closing" phase with `accepting: true`, S5 final slice), a 4-row band at the
shrinking wide window's CURRENT top edge (`window.top`..`window.top+3`) and
current bottom edge (`window.bottom-4`..`window.bottom-1`) renders the wrong
color for `accept-prebattle.json` frames 262-269 (every frame, ~1536px/4% of
the screen) then every-other-frame through 279 (192→96→48→24→12→9px, halving
each capture - same tapering shape as ISSUES #5's flash-bar family), reaching
0 diff at frame 280 once the window fully collapses (`UNREVEAL_WINDOW_STEPS`
exhausted). Confirmed pixel-exact everywhere else in the whole exit sequence
(YES press through settled, fully-printed message + idle - see PROGRESS.md).

**Confirmed NOT the same bug as the two real fixes made this session** (both
kept, both root-caused from source, not guessed): (1) A-on-YES never calls
`Select_ErasePopupMenu(SELECT_WIN_YES_NO)` (`battle_factory_screen.c:1544-
1550` vs the decline branch's `:1556-1557` - grepped directly), so the YES/NO
box + cursor highlight stay visible through the whole closing AND the
subsequent exit fade, unlike decline - fixed in `confirmReveal.ts`
(`accepting` flag) + a new `factoryDraftScreen.ts` export
(`drawYesNoOverlayFaded`) called from `core.ts`'s `fadingOut` render branch.
(2) the 3 mon pics disappear one tick earlier for accept than decline's own
elapsed-3 cutoff (decline's extra same-tick work,
`Select_HandleMonSelectionChange`/`Select_PrintSelectMonString`, delays when
`FreeAndDestroyMonPicSprite`'s effect reaches that frame's render - same
"extra per-frame work costs a tick" family as ISSUES #9/#13) - fixed via a
per-`accepting` `monsVisible` cutoff in `getConfirmRevealVisual`. Both fixes
are pinned by `tests/confirmDecline.test.ts`'s new accept-path describe block
and re-verified against `confirm-decline.json` (still 67/67, zero regression).

**This entry is what's left after those fixes.** Confirmed NOT a window-
bounds or table-timing bug: `UNREVEAL_WINDOW_STEPS`'s top/bottom values
themselves are oracle-pixel-correct at this tick (the window's overall shape/
position matches oracle exactly - `bg3ColorWide(120, y)` returns a flat,
uniform `(214,255,239)` across y32-44 regardless of the window's current
top, so it isn't scrolling/repositioning content). The mismatch is
specifically in `target2Color`'s `bg1Color` fallback layer (the BG1 menu-
chrome content shown through the window where no ball/arrow is present) at
rows adjacent to the window's moving edge - not reproduced on the decline
path (`confirm-decline.json` stays 67/67 with the identical window-shrink
table), so it's specific to *something* about the accept-path's screen state
at those rows, not a shared rendering bug. Root cause not found this session
- deprioritized once the two real bugs above were fixed and the residual
shrank from ~14% of the frame to a bounded, tapering 4%, given the time
budget for this step. A future session should RAM-probe `REG_WIN0V`/BG1
tilemap content during this exact window (reuse `tools/probe/ram-probe.py`)
rather than guess further at `bg1Color`'s inputs.

**Scope:** `accept-prebattle.json` ships at 123/137 with all 14 non-matching
frames (262-269, 270/271/273/275/277/279) individually attributed to this
entry - same discipline as ISSUES #5's precedent (supervisor-sanctioned
attribution fallback, not a silent workaround).

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
