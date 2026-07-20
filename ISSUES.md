# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #21 — Battle-2 turn-1 damage: RAM-observed pre-STAB base 19 vs
  hand-formula 17 from the same RAM inputs — damageCalc generality gap

Opened 2026-07-19 (supervisor, from the battle-2 scout's §18 finding).
ONIX's ROCK_SLIDE vs KABUTO (decline branch, `battle2-turn1.json`):
`gBattleMoveDamage` locks to 28, RAM-observed via an intermediate 19 one
tick prior (33108→33109), and `19×15/10=28` (STAB) is exact — but the
documented `CalculateBaseDamage` reconstruction with the same RAM-read
inputs gives 17 (→ range [21,25] after spread). Structurally checked and
not the cause: crit (BATTLE_ARMOR short-circuits the roll — itself a new
pinned mechanic), weather, SITRUS_BERRY/BATTLE_ARMOR damage hooks. The
2-point base gap is unexplained. `damageCalc.ts` was bit-exact for every
battle-1 sample (§10/§12), so something about THIS matchup's inputs or a
formula branch is unmodeled. Leads (§18): RAM-probe `gBattleMons[1].
defense` and stat stages at the calc tick (scout's `dump-battler-full.py`
lacks `statStages[]`, offset 0x18 `pokemon.h:277` — add it); re-check
badge/frontier modifiers in `CalculateBaseDamage` source. Affects: S7/S8
engine correctness for battles 2+ (battle-1 traces unaffected).

## #20 — FONT_NARROW never extracted: FIGHT-submenu move-name/PP/type text
  is a battle-1-only static harvest, blocks arbitrary movesets (S8/S9)

Opened 2026-07-19 (supervisor, from the FIGHT-submenu worker's flag). The
move-select submenu's text windows (`B_WIN_MOVE_NAME_*`/`B_WIN_PP`/
`B_WIN_MOVE_TYPE`) use `FONT_NARROW` — source-confirmed a genuinely
separate glyph tileset from `FONT_NORMAL` (not just narrower widths), and
this run has never extracted it (`src/data/gen/` has font-normal/
font-small only). The shipped slice renders battle 1's fixed Onix moveset
via per-slot static pixel harvests (`fight-submenu-window.json`,
pixel-confirmed byte-identical across each slot's dwell — fine for every
battle-1 trace). Any OTHER moveset (post-swap battles 2-7 in S8, breadth
in S9) cannot render until `FONT_NARROW` glyphs+widths are extracted and
the submenu text goes through the real text pipeline like the action menu
does. Lead: extractor conventions in `tools/extract/extract-battle-*.ts`;
glyph source `graphics/fonts/`; widths table per font id in `text.c`.
**Extraction half CLOSED 2026-07-19** (bounded worker, supervisor-merged):
`src/data/gen/font-narrow.json` landed, proven byte-exact by rendering all
four battle-1 move names through the engine's own `drawText` against the
oracle-harvested patches (`tests/fontNarrow.test.ts`, 24 checks, 0
mismatches). **Remaining: the rewire itself** — `drawFightSubmenuWindow` →
real glyph rendering instead of the static harvest, which needs (a) the
PP dynamic-color state machine (`SetPPNumbersPaletteInMoveSelection`,
bank-5 idx 11/12 by `GetCurrentPPToMaxPPState`) and (b) the mixed-font
runs ("TYPE/" in NARROW then FONT_NORMAL type name; PP numbers on the
separate FONT_NORMAL `B_WIN_PP_REMAINING` window) — both source-traced in
the test header.

## #19 — fight-submenu.json residual: tick 2073 (99px, healthbox-adjacent row)

Opened 2026-07-19 (bounded worker, FIGHT-submenu engine slice). `tools/
compare/traces/fight-submenu.json` is 234/235; the one residual tick, 2073,
is a 99px diff confined to exactly screen row y=111 (x 127-225) — one row
below the healthbox bounce region's own bbox (y74-110). Same
still-unidentified family as `docs/battle-turn-notes.md` §11 finding 4's
own two idle-only-trace anomalies (ticks 2071/2135 there — different
absolute tick since that trace's button script differs, same "single-tick,
boundary-row, healthbox-adjacent" shape). Ruled out this session: a third
discrete healthbox-bounce state (the existing 0/1/2 model gets every OTHER
tick in the 235-tick window to 0 diff); every integer
`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT` value from -9 to 0 (grid-searched
against the full post-close range — -4, the shipped value, is uniquely
optimal at 1/66 mismatches, strictly better than every neighbor). Full
derivation: `docs/battle-menu-notes.md` §8.
**Recurs identically** (S7 slice E1, this session): `turn2-endeavor.json`
tick 2906 - the FIGHT submenu's reveal tick for turn 2's own reopen - same
exact bbox (x127-225, y=111), same 99px count, confirming this is a general
property of the submenu-reveal/resume mechanism, not a turn-1-only or
nav-only quirk. Still not root-caused.
Affects: `tools/compare/traces/fight-submenu.json` 234/235 (only frame);
`tools/compare/traces/turn2-endeavor.json` 76/77 (only frame, tick 2906).

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

## #16 — Opponent-healthbox compositor: status-icon variant has NO
  oracle-pixel validation yet (partial-HP is now validated)

Trimmed 2026-07-19 (bounded worker, S7 slice D): the `hpFraction != 1`
half of this entry is now RESOLVED — `turn1-drain.json`'s ROCK_SLIDE
drain (Grovyle 143→101 HP, 43 distinct integer HPs, 15 distinct
fill-pixel-count transitions) hits real oracle pixels for the first time
and matches the hermetic `calcBarFilledPixels`/`floor(hpFraction*48)`
formula exactly — 0 residual, no model fix needed (see
`docs/battle-menu-notes.md` §12). The bar stays in the green band this
whole window (33/48 px > the 24px green threshold), so the yellow/red
band thresholds and the `filledPixels==0` sliver rule are still only
hermetically pinned, not oracle-confirmed — same for every status icon
(`UpdateStatusIconInHealthbox`'s placement/color-substitution math): this
trace's own seed battle never inflicts a status condition, so `status !=
"none"` remains untested against real pixels. Battles 2-7's other
opponents (S8) consume the same pipeline and may exercise these paths.

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
