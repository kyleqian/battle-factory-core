# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #8 — confirm-flow reveal render: real diffs remain past the wide-window's opening, root cause not yet identified (BG3 content + tick boundaries now RAM-verified; a 3rd, different-shaped gap remains)

**Symptom (narrowed this session):** the two leads this issue originally
opened with are now **closed** (see Confirmed below) — `bg3ColorTiled`'s
tiled approximation is replaced with real VRAM-extracted content, and
`confirmReveal.ts`'s window-hold boundary got a RAM-verified fix. Rebuilding
`confirm-flow.json` (rent-3picks.json's exact button prefix + idle to frame
279) and running `npm run compare` shows the diff magnitude drop sharply
(was 1000-5000px/2-14% starting ~confirm+34; now mostly 30-950px/0.1-2.5%,
with two outlier frames still in the old range) — real, substantial
progress, but **not yet 0-diff-modulo-ISSUES-#5**, so the trace was again
**not committed** per the brief's stop condition. Frames 185-188 (dense
continuity with rent-3picks.json's own 0-189 coverage) match exactly; every
frame from 189 (the confirm tick itself) onward through 279 (last capture)
has a nonzero diff. Bboxes/samples (`tools/compare/out/latest`, this
session, not committed):
- frame 189: 107px, small — plausibly a 1-tick boundary nuance right at the
  confirm tick itself, not investigated further.
- frame 190: 949px, bbox x88-223/y32-156 — app renders bright yellow
  `(255,222,0)` at e.g. (89,32) where oracle shows `(210,230,164)`; this is
  **during the flash phase** (confirm+1), and y=32 is nowhere near the flash
  bar's own y=64 row, so this looks like a *different*, likely pre-existing
  code path (the 3rd pick's own `monPic` close-window rendering, which
  `rent-3picks.json` never exercised past its own frame 189) — not
  diagnosed further this session.
- frame 191: 2922px, bbox x88-239/y36-143 — same yellow-vs-oracle mismatch,
  larger.
- frame 233 (the "shown" transition tick under the corrected model): 4058px,
  bbox x21-218/y34-140 — app shows grayscale-ish tones (e.g. `(132,123,123)`
  at (51,34)) where oracle shows `(210,230,164)`; likely related to the
  1-2 tick stagger this session's RAM probe found between real hardware's 3
  chosen-mon sprites (slot0 appears 2 ticks before, slots1-2 one tick
  before, this engine's single `monsAndYesNoVisible` flag flips) - not yet
  modeled, see Confirmed.
- frame 249 (steady YES/NO dwell): 81px, bbox x158-199/y116-139 — app shows
  red `(255,0,0)` where oracle shows white `(255,255,255)`, near the YES/NO
  box's own text/cursor area — unrelated in location/color to either of the
  above, a 3rd distinct gap.
- **Ruled out:** none of these match ISSUES #5's own signature (x88-151
  confinement, 512px/frame-scale window-growth jitter) — different bboxes,
  different magnitudes, different (non-jitter-like: solid wrong colors, not
  partial-window blends) failure shape. Not attributable to that policy.

**Confirmed this session (leads 1-2 from the prior write-up, both closed):**
1. **BG3 wide-window content, RAM/VRAM-verified and fixed.**
   `Select_InitBgs` (`battle_factory_screen.c:1202-1206`) calls
   `CopyToBgTilemapBufferRect(3, sMonPicBg_Tilemap, X, 4, 8, 8)` for
   `X ∈ {11, 2, 20}` — i.e. it copies the *same* already-extracted 8x8
   tile block to 3 disjoint tile-column anchors (x=16/88/160) **once at
   screen init**, unconditionally; two 8px gaps (x80-88, x152-160) are never
   written and stay transparent (`AllocZeroed`). Direct VRAM dump (scratch
   probe, mapBaseIndex 27 → VRAM 0x0600D800, rows 4-11) confirmed this
   tile-for-tile, byte-for-byte. Fixed: `extract-factory-screen.ts` now
   emits a `wideTilemap` field (26x8) in `mon-pic-bg.json` with the real
   3-block+2-gap geometry; `monPicRender.ts`'s `bg3ColorTiled` (continuous
   64px-period tiling, anchored wrong) is replaced with `bg3ColorWide`
   (reads the real wideTilemap).
2. **`confirmReveal.ts`'s window-hold boundary, RAM-verified and fixed.**
   Direct `REG_DISPCNT`/`REG_WIN0V` + `gSprites[]` reads (scratch probe,
   sprites located by known screen position, not struct-offset guessing)
   across the whole reveal found `Select_Task_OpenChosenMonPics`' case0
   (WIN0 on, degenerate 64,65 window) and case1 (`ShowBg(3)`/`BLDCNT` setup,
   no window change) are **2 separate ticks**, not 1 as originally modeled
   — real hardware holds the degenerate window for 2 ticks before the
   8-tick growth starts, one tick later than previously implemented.
   `WINDOW_STEPS` gained an extra `{64,65}` entry (old→new: `[64/65,
   60/69, 56/73, 52/77, 48/81, 44/85, 40/89, 36/93, 32/96, 32/96, 32/96]`
   → `[64/65, 64/65, 60/69, 56/73, 52/77, 48/81, 44/85, 40/89, 36/93,
   32/96, 32/96]`, same 11-entry length so the flash→window→shown overall
   tick budget is unchanged, only the content of indices 1/8/9/10 shifted).
   The flash-phase boundary (13 ticks incl. 1-tick creation lag) was
   independently re-confirmed exact (sprite creation at confirm+19, all 3
   border sprites' `affineAnimEnded` simultaneously true at confirm+31,
   matching the existing 12-entry `FLASH_WIDTHS` table with no change
   needed).
3. **New, not-yet-modeled real behavior found along the way:** the 3 chosen
   mon sprites do **not** all appear on the same tick real hardware-side —
   `Select_CreateChosenMonsSprites()`'s sprite-creation loop shows slot0 (x16)
   one tick *before* slots1-2 (x88/x160) in the RAM probe (confirm+41 vs
   confirm+42) — `confirmReveal.ts`'s single `monsAndYesNoVisible` boolean
   collapses this to one tick (matching slots1-2, not slot0). Mechanism not
   diagnosed (plausibly a `RunTasks`/sprite-creation-loop ordering artifact,
   same family as other 1-tick OAM-vs-window lags already documented
   elsewhere in this codebase) — likely contributor to frame 233's diff.
4. The BG3 wash was confirmed (pixel-sampled, several frames through
   confirm+69) to stay visible **permanently** through the settled YES/NO
   idle, not just during the window's growth — `confirmReveal.ts`'s
   existing "shown"-phase `window` field (already non-null) already models
   this correctly; no change needed there.

**Leads (renumbered):**
1. Diagnose frame 190/191's yellow-pixel mismatch — likely in the 3rd
   pick's own `monPic` close-window rendering during ticks confirm+1/+2,
   territory `rent-3picks.json` never reached (it stops at frame 189).
   Cross-check against `monPic.ts`'s `CLOSE_TABLE_B` + `monPicRender.ts`'s
   narrow-window `drawMonPic` path with a dense oracle capture of exactly
   these ticks.
2. Model the slot0-vs-slots1/2 1-tick creation stagger found in Confirmed
   item 3 (RAM-verify the exact mechanism first, not just the offset) and
   re-check frame 233.
3. Diagnose frame 249's red-vs-white mismatch near the YES/NO box — likely
   an unrelated, 3rd bug (different bbox, different failure shape from
   1/2 above).
4. Once 1-3 land, rebuild `confirm-flow.json` and re-run `npm run compare`;
   commit if clean modulo ISSUES #5's own already-accepted pattern.
5. The decline path (B/NO back to cursor mode, `docs/confirm-flow-notes.md`
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
