# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #39 — S8 OFF GROVYLE accept opening has 15 bounded render residuals

`battle1-swap-enemy-accept-prompt.json` is **51/66 exact** through the
input-ready YES/NO boundary. Controller timing and the settled compositions
are source-relative; the remainder is exactly tick 29936's selected-species
window-copy color, 29978--29990's blended affine-flash overlap with the gray
center ball, and tick 30000's first YES/NO window-copy/OAM transient. The
neighboring transition, aperture-growth, full GROVYLE sprite, and settled
prompt frames match. Do not replace these residuals with framebuffer/tick
lookups or thin the dense trace. Next work should probe the generic VBlank
copy/OAM ownership at those three mechanism boundaries and stop before any
YES, NO, or B response.

## #38 — [PARKED 2026-07-22, supervisor decision] Turn 16 FAINT_ATTACK
  delayed-control tick 21006 exposes `BLDALPHA` one VBlank early

The canonical animation window is committed at **221/221 exact**
(`turn16-rung2a.json`, 20826-21046). A +30-frame pre-SEND-OUT delay is
**220/221**: delayed tick 21006 alone shows the next attacker-alpha
coefficient one frame early.

Direct task/RAM probes show identical active callbacks and task data at the
relative boundary (`data[1]=0x0d03`, `data[2]=0`), while the hardware register
differs: canonical `BLDALPHA=0x0e02`, delayed `0x0d03`. A fresh delay sweep
over `+0..+8,+15,+16,+30,+31,+32` reproduces the early exposure only at
`+30`; adjacent delays return to the normal cadence. This is therefore a
sub-tick `SetGpuReg`/VBlank visibility race below the engine's tick-state
abstraction, analogous in mechanism to the already-settled cycle-timing
family in #5, not a move-task reducer defect.

The delayed trace is not committed red. Do not add an absolute-tick,
delay-specific, or baked-frame patch. Reopen only if the engine gains a
general cycle/register-queue model; this extra delayed-control frame does not
block the roadmap's canonical S7 acceptance.

## #34 — Turn 14 FLY-up affine coverage at `17781-17787` remains excluded

The separate `17822-17845` one-glyph timing family is **closed
2026-07-23**: its source-timed printer repair extends
`turn14-fly-miss.json` from 185 to **206/206 exact**. The earlier
`17722-17768` PP/redraw/bounce family also remains closed.

Fresh RAM, final-OAM, VRAM, palette, and baseline-subtracted framebuffer
evidence isolates the only remainder to the first seven visible FLY-ball
frames. Whole-frame residuals are ball-footprint-only
**22/42/58/76/94/112/40 px**. The source/OAM-proven object is affine-double
**64x64** (not 32x32), and the verifier reconstructs its full 2048-byte live
transfer in the 128x128 destination box. The existing generic
floor/destination-center-64/source-center-32 convention is the strict best of
six plausible variants: aggregate **TP 8404, FP 444, FN 0**, with each
frame's false-positive count exactly equal to the whole-frame residual.
Alternative rounding and half-pixel centers are all worse.

This proves the current sampler is already the best tested general rule and
rules out timeline, matrix, object size, iteration box, transfer, palette,
position, and the tested center/rounding variants. Do not add a FLY,
tick, or matrix exception. Reopen only with an independently justified GBA
PPU coverage rule, first evaluated by
`tools/probe/verify-turn14-flyup-affine-sampler.ts` and then against
`turn14-fly-miss.json` (**206/206**) and `turn13-switchin.json`
(**242/242**). Full evidence: `docs/turn14-flyup-opening-probe.md`.

## #23 — [PARKED 2026-07-20, supervisor decision] DRAGON_BREATH compressed
  fire-projectile overdraw: renders 3177-3235 remain uncaptured

Opened 2026-07-20 (supervisor). The 8 fire-projectile sprites of
`Move_DRAGON_BREATH` (small_ember gfx, spawn every 4 ticks, 20-tick life)
are the sole un-landed mechanism of turn 2; `turn2-dragonbreath.json` ships
**235/235** with 3177-3235 excluded from `captureFrames` (this run's
standard treatment of un-green spans — never committed red). Everything
around it is green: kickoff text 3121-3176, shake/blend 3236-3263,
resolution 3264-3346, and the settled tail through 3846 apart from its
three separately documented single-tick bounce exclusions.

**Settled by the four attempts (do NOT re-derive):**
- Geometry: 21-entry `gOamMatrices` table (`a===d`, `b===-c`, identical
  across all 8 spawns), base `(72,88)`, render lag 1, spawn cadence and
  frame cycling — all RAM-verified.
- The "concurrent `AnimTask_BlendBattleAnimPal` also blends the ember
  palette" theory is CLOSED by source-level call-chain proof
  (`F_PAL_TARGET` → `GetBattlePalettesMask` only ever selects a named
  battler's own OBJ palette bank, never the ember's gfx-tag palette),
  corroborated by pixel evidence (every mismatched pixel is a clean
  small-ember ramp color — a shape defect, not a color one).
- The shared sampler `drawSpriteSheetAffineRotate` is ELIMINATED: its
  double-size iteration box is source-confirmed correct
  (`gOamData_AffineDouble_ObjNormal_32x32`, same mode as the working ball
  spin), and a 4-variant rounding/offset sweep found the current
  convention strictly best (8181 diff-px vs 11410/21469/21933). This
  matters beyond DRAGON_BREATH: a defect there would have affected every
  other rotating sprite.
- An extra-tick-of-life hypothesis was tested and made tick 3220 worse
  (342→649px); reverted.

**Fresh sole-sprite isolation (2026-07-23) narrows the residual:** the prior
render-3223/RAM-3222 magnified case was invalid because four projectiles were
live. An exhaustive 3168-3234 RAM scan finds the sole magnified window at
RAM 3231-3234. The repaired verifier reports:

- compressed render 3177/RAM 3176: oracle mask 10 px, **TP 10, FP 34,
  FN 0**;
- sole-live magnified render 3232/RAM 3231: oracle mask 128 px,
  **TP 128, FP 0, FN 0**.

The claimed magnified missing blob is therefore falsified. The shared sampler
is pixel-exact when genuinely isolated in the magnified regime; only bounded
compressed overdraw remains. Do not change the generic affine sampler from
this evidence. The next useful probe is source-data decomposition within the
compressed regime (native sheet/frame selection and coverage before scene
composition), using the repaired sole-live candidate audit as a guard.
Full evidence and runnable verifier:
`docs/dragon-breath-notes.md` and
`tools/probe/verify-dragonbreath-spawn7-isolation.ts`.

## #18 — [POLICY SETTLED 2026-07-19, user decision] sendout tick 1496
  (particle z-order, 3px): accepted/parked permanently; S6 ticked [x] with
  every diff frame individually attributed (3× #5, 1× this entry). The
  persistent-`sSpriteOrder` architecture build was declined as out of
  proportion. No further fix attempts unless the user re-opens it.
  Mechanism record below is kept for attribution evidence.

Parked 2026-07-19 (supervisor); trimmed 2026-07-19 (§7.31, closed tick
1493); trimmed again 2026-07-19 (§7.32, closed 1494/1495 - a one-tick
`drawOpponentSummaryExit` clock stall, same family as §7.18's particle
stall). What remains is exactly one tick:
- **1496** (3px): particle z-order gap named in §7.25 — the ONE
  non-ISSUES-#5 frame keeping `s6-acceptance.json` at 224/228. §7.31
  RAM-confirmed the pixel-exact winner (spawn index 14, not 13) and ruled
  out sprite-slot reuse scrambling (real array positions: idx6 for particle
  13, idx23 for particle 14 — NOT scrambled). §7.32 read the actual source
  this residual depends on (`reference/pokeemerald/src/sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`) and found: (1) the
  particles are created via plain `CreateSprite`, not `CreateSpriteAtEnd` as
  previously assumed (`CreateSpriteAtEnd` is real in this scene but only for
  the summary bar's icons and the healthbox, `battle_interface.c`); (2) the
  real tie-break mechanism is `sSpriteOrder` — a PERSISTENT 64-slot
  permutation reset to identity only once (`ResetAllSprites`, battle start)
  and continuously insertion-sorted in place every frame thereafter, where
  an exact tie preserves whatever relative order two slots inherited from
  the *entire prior history* of every sprite (of any kind) that has ever
  occupied those two slot numbers — not a function of raw spawn/slot index
  at all. Determining the real winner for slots 6 vs. 23 at this one tick
  would require simulating that entire scene-wide history as persistent
  engine state, a materially different architecture (whole-scene OAM-order
  simulation) than this engine's current per-burst, stateless
  `sortAliveParticlesByScreenY` — out of proportion to a 3px fix and exactly
  the kind of change that risks regressing every other window sharing that
  sort. No fix shipped (a special-cased index swap would be undocumented
  curve-fitting, the same mistake §7.25 already made and reverted). Full
  derivation: `docs/battle-scene-notes.md` §7.32.
Affects: `sendout.json` 255/256, `s6-acceptance.json` 224/228 (3 frames are
ISSUES #5's settled pattern, x88-151-confirmed; 1 frame is #18's own 1496).

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
