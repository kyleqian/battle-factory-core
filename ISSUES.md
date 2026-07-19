# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #18 — sendout/S6-acceptance final residuals: 1493-96 (2-5px tail)

Parked 2026-07-19 (supervisor). After the OBJ-vs-OBJ blend-target-2 fix
(#113 / battle-menu-notes §3c) closed most of the blended-edge family
(sendout 246→251/256, menu-throw 78/78), and §7.30 (bounded worker,
2026-07-19) closed tick 1462 (the §7.19-named "settled-bar one-tick gap +
trainer-exit tail", sendout 251→252/256), what remains:
- **1493-95** (2-5px): last tail of the §7.28 blended-edge family — four
  independent RAM confirmations say every OAM/blend/position input is
  correct (§7.28/§7.29); the blend-target-2 fix closed 1470/71/79+1491/92
  but not these; §7.29's untested lead stands: probe the actual VRAM
  tile-graphics bytes (precedent: the `open.png` runtime overwrite,
  §7.25/e00f8f3).
- **1496** (3px): particle z-order gap named in §7.25 — the ONE
  non-ISSUES-#5 frame keeping `s6-acceptance.json` at 224/228.
Affects: `sendout.json` 252/256, `s6-acceptance.json` 224/228 (other 3
frames are ISSUES #5's settled pattern, x88-151-confirmed). S6 stays [~]
until these close or the user re-scopes.

## #16 — Opponent healthbox real assembly: frame SOLVED, three content
  pieces still open (text ×2, HP-bar subsprite placement) — send-out still
  ships the pixel-harvested block

**Updated by the supervisor at PROGRESS #89 (2026-07-18):** the assembly
pipeline is now COMPLETE for the settled full-HP/no-status case:
`composeOpponentHealthbox` (`src/engine/healthboxAssembly.ts`) reproduces
the committed harvest byte-exact — **2574/2574 opaque px, zero exclusion
rects** (`tests/healthboxAssembly.test.ts`), fully parameterized
(name/gender/level proven generic via MISDREAVUS/female/Lv100 and
MAGIKARP/none/Lv5 cases). Round-1's "tile remap" was dissolved (no remap
exists); round 2 solved all three content pieces — HP-bar subsprite
placement (offsets are CENTER-based, `AddSubspritesToOamBuffer`), nickname+
gender text (window rows 5-15 rectangular blit; gender symbol uses a
`{COLOR DYNAMIC_COLOR}` palette override 11/10), level text (healthboxRight
tile0, right-aligned `xPos=5*(3-digitCount)`, "Lv" = glyph 261). NOTE:
round-1's z-order claim was corrected — the BAR wins over the frame
wherever both are opaque. Full evidence: `docs/healthbox-assembly-notes.md`.
**Round 3 (supervisor, PROGRESS #91):** `hpFraction != 1` and
`status != "none"` now land too — `CalcBarFilledPixels` arithmetic
(floor(hpFraction*48), 1px non-faint sliver, strict-`>` band thresholds:
exactly 50% is yellow, exactly 20% is red), yellow/red tiles from the
newly-extracted `hpbar_anim.png` (`hpbarAnim` key), opponent status icons
from the newly-extracted `status2.png` (battler-1 sheet; `status.png` is
the player's), dynamic per-status palette slot battler+12. All hermetic-
Tier-1-pinned. **CAVEAT: no oracle pixels exist yet for partial HP or
status pre-action-menu — oracle validation is deferred to S7's first
HP-drain trace** (stated in the dossier too). **Open remainder:** wiring
the compositor into `battleScene.ts` to replace the shipping harvest
(`src/assets/gen/sendout-healthbox-opponent.json`) — a supervised step,
deliberately not done while the send-out window is under active pixel
work — plus that deferred S7 validation. **Why it matters later, not
now:** S6's settled content is byte-exact via the harvest; S7's HP drain
and battles 2-7's other opponents consume this pipeline.

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
