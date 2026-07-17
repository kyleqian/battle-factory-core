# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #7 — `ballAnimStall`'s LEFT/RIGHT branch over-stalls once 2+ balls are
  simultaneously active (RAM-DISPROVEN: a RIGHT cursor move with 2 active
  balls costs neither of them a tick, but the current code still stalls
  both) - root cause and exact mechanism identified (see "third worker
  update"), fix not yet implemented. Blocks `rent-3picks.json`. The separate
  post-confirm cursor-input-drop bug this entry previously flagged is FIXED
  (`isCursorInputReady`, see PROGRESS); a fresh repro just needs any dwell
  `>= 20 ticks` after a confirm's press-tick before the next cursor move
  (`isCursorInputReady`'s own RAM-verified minimum) to avoid it entirely.

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

**Status (superseded by the "second worker update" below - kept for the
original evidence trail):** the two/three-simultaneous-stall question this
section raises is now answered (see below): real hardware stalls *every*
simultaneously-active ball per trigger, exactly matching `ballAnimStall`'s
existing `activeSlotsBeforeAction` formula - no fix needed there. The
frame 124/155/163 pixel mismatches are real but traced to something more
specific (a ball's own reroll-timer desync after 4+ accumulated stalls, RAM
evidence starts at tick 204) - see "Status" at the end of this entry for the
current next-step.

**Blocks:** `rent-3picks.json` (needs a 2-ball-then-3-ball dwell window to
assert ball-rock churn per the S5 brief) and the accompanying 3-ball
`gRngValue` Tier-1 RAM-pin (would either pin a known-wrong stream or require
fixing this first) - neither was committed this session; see `PROGRESS.md`.

**First worker update (superseded - the cursor-input-drop bug it found is
now fixed):** a prior session's 10-tick-dwell probe hit a *separate* bug -
real hardware drops a post-RENT-confirm cursor move sent too soon - and
never reached this issue's own question. That bug is now root-caused, fixed,
and Tier-1-pinned: `isCursorInputReady` (`src/engine/monPic.ts`), gating
`core.ts`'s cursor-mode branch on `monPic.phase === "closed"` (mirrors
`isMonPicInputReady`'s open-side gate). RAM-verified exact boundary
(`sFactorySelectScreen->monPicAnimating`, empirically-found struct offset
672 - NOT the naive `12 + 108*6 + 3*2 = 666` computed from the struct's
declared field sizes, so something in that layout has an unaccounted 6
bytes; re-derive by byte-scanning if this offset is ever needed again):
replaying `RENT_SLOT1` (confirm A press-tick 37), a `RIGHT` sent tick 56 is
dropped (`cursorPos` stays 0); tick 57 (the tick `monPicAnimating` first
reads FALSE) is accepted. See `tests/cursorInputGate.test.ts`.

**Second worker update (same session, after the fix above): the
two/three-simultaneous-stall rule itself is CONFIRMED CORRECT as already
implemented - `ballAnimStall`'s existing `activeSlotsBeforeAction` formula
(stall *every* currently-active ball, not just one) generalizes exactly
right up to a `cursorPos`-desync boundary that turned out to be OUT OF
SCOPE. The real, still-open bug is narrower and different: a ball that has
accumulated several stall events develops a 1-tick internal desync in its
own resting→moving reroll schedule, first observed at tick 204 of the repro
below. Do not guess a fix for this narrower bug without further RAM data -
see "Status" below.**

Built a fresh 3-ball repro (RAM probe, `tools/extract/inspect-anchor.py`
pattern, dumping `gSprites[ballSpriteId].data[0]`/`animNum`/`animCmdIndex`/
`animEnded` (empirically-verified struct-Sprite offsets `0x2A`/`0x2B`/`0x2E`/
`0x3F` bit `0x10`, `sizeof(struct Sprite)` = `0x44`) + `gRngValue`
tick-by-tick, cross-checked against a matching engine replay of the
identical button script) using a **≥40-tick dwell before every cursor
move** (well past the 20-tick gate above): rent slot0 → dwell40 → `RIGHT` →
rent slot1 (now 2 balls simultaneously active) → dwell40 → `RIGHT` (the
critical trigger: 2 already-active balls) → rent slot2 (3 balls active).
**Result: `gRngValue` matches bit-exact between RAM and engine on every one
of 37 sampled ticks spanning both the pre-trigger and post-trigger window
around the 2-active-ball `RIGHT`** - i.e. `ballAnimStall`'s current
"stall everyone active" formula already handles 2 (and, per the 3-ball
window sampled after slot2's rent, 3) simultaneously-active balls exactly
right. (A further probe tick pressing `RIGHT` a 3rd time, past the 3rd/final
rent, showed a real `cursorPos` divergence at that point - but this is
`Select_OptionRentDeselect` returning `SELECT_CONFIRM_MONS` and handing off
to `Select_Task_HandleYesNo` once all `FRONTIER_PARTY_SIZE` picks are made
(:1949-1970, :1615-1619) - the reveal/YES-NO screen this run's brief
explicitly keeps out of scope, not a `ballAnimStall` bug. No further cursor
input is legal after the 3rd confirm in the real game either.)

**Then reproduced ISSUES #7's original pixel symptom directly**, using a
script shaped like entry 21's own repro (36-tick dwells, confirms landing at
press-ticks 37/113/189 - `npm run compare` on a scratch trace, deleted after,
not committed): frame 124 (173px DIFF), frame 155 (173px), and frame 163
(173px) all still mismatch - so this issue is NOT resolved by the
cursor-input-gate fix alone; the pixel symptom is real. Cross-referencing
against the RAM/engine `gRngValue` dump of the *same* button script (a
different script than the clean-generalization repro above - this one keeps
the original 36-tick dwells rather than 40): **the two streams match
bit-exact for all 204 ticks from frame 1 through 203** (spanning both
cursor-move triggers and the 3rd rent, i.e. everywhere the pixel-mismatch
frames 124/155/163 themselves land - so those specific pixel diffs are
NOT yet explained by any `gRngValue`-visible state divergence at that point;
they may be a rendering-only lag/offset rather than a stall-count error, or
the divergence found below may propagate backward into earlier frames'
*rendering* without yet showing in gRngValue - not disentangled this
session). The streams then diverge for the first time at **tick 204**:
RAM shows ball 0 completing a resting→moving reroll this tick
(`animCmdIndex` 16→0, `animEnded` 1→0) and ball 1 advancing its moving cycle
normally (`animCmdIndex` 11→12); the engine has **neither** transition fire
- both stay parked one tick behind where RAM already is, only catching up
the following tick. By tick 204, ball 0 has accumulated **4** cumulative
stall events (the first `RIGHT`, confirm2, the second `RIGHT` shared with
ball 1, and confirm3 shared with ball 1 again) - more than
`ballAnimMultiBall.test.ts`'s own pinned cases ever reach (max 2). This
looks like the `REST_INTERNAL_OFFSET`/`FAILURE_REROLL_DELAY` internal-timing
machinery (`ballAnim.ts`) not composing correctly once a ball's rest-timer
countdown has itself been stalled multiple times by other balls' triggers
along the way, but this was not root-caused this session - RAM data stops
at tick 204's discovery, not yet enough to derive the correct formula.

**Status (superseded again - see "third worker update" below):** the
tick-204 mystery is now fully explained and the actual wrong rule is
identified precisely - it is NOT a "4th accumulated stall composes wrong"
internal-counter bug, it's that `ballAnimStall`'s LEFT/RIGHT branch
over-applies once 2+ balls are simultaneously active. No fix has been
implemented yet (ran out of session time deriving *why*, see below) -
next session can likely go straight to a fix with the evidence already in
hand.

**Third worker update: found and fixed a bystander bug in every prior
session's own RAM-probe methodology (wrong `struct Sprite` offsets), then
used the corrected probe to fully resolve the tick-204 mystery - the ball
DOES desync, but not from an internal-counter composition error: `ballAnimStall`'s
"stall everyone active" rule is RAM-DISPROVEN for LEFT/RIGHT triggers once
2+ balls are simultaneously active (RENT/DESELECT-confirm triggers are
unaffected and still correct). This directly contradicts the "second worker
update"'s own "RAM-CONFIRMED CORRECT" verdict above - that verdict was
built on a probe using the same wrong offsets fixed here, and/or a sample
window too narrow (37 ticks right around the trigger) to reach the ~30-tick-
later transition where the missing stall would first become visible.**

**The offset bug:** every prior session's RAM probe (this entry's own text
above, `PROGRESS.md`/`PROGRESS-archive.md`) cited `struct Sprite` offsets
`animNum`=0x2B, `animCmdIndex`=0x2E (as a `u8`), `data[0]`=0x2A. Direct
read of `reference/pokeemerald/include/sprite.h:194-242` (ground truth,
should have been consulted from the start instead of re-deriving offsets by
feel) shows the real layout is `animNum` **u8 @0x2A**, `animCmdIndex`
**u8 @0x2B**, `data[8]` **s16 array @0x2E** (so `data[0]` is a **2-byte
signed** read at 0x2E, not a `u8`), `animEnded` bit `0x10` of the u16 at
0x3E (that part was already right). All three non-`animEnded` fields were
mislabeled/mistyped relative to each other. This doesn't invalidate the
`gRngValue`-only findings (a separate, unambiguous global address, untouched
by this bug) but does invalidate any claim in this entry's history that
reasoned about which *sprite field* moved when.

**Corrected repro + method:** rebuilt entry 21/23's exact original script
(confirms landing at press-ticks 37/113/189, 36-tick dwells before each
RIGHT - `A`×2/idle×28/`DOWN`×2/idle×4/`A`×2 per rent, `RIGHT`×2/idle×36
between rents) against a fresh dev-time RAM probe (`EmeraldOracle`,
corrected offsets above, dumping `animNum`/`animCmdIndex`/`data[0]` for
`gSprites[0..2]` + `gRngValue` + `sFactorySelectScreen->cursorPos` every
tick from an early anchor point through tick ~230; scratch script, not
committed). Cross-referenced every `MOVING_CMDS`-cadence transition
(4-or-8-or-32-tick steps, exact durations from `ballAnim.ts`'s own table)
against its *naive* (zero-stall) expected tick to read off, per ball, per
trigger, whether that specific trigger's stall-consumption tick (one tick
after the trigger's own action tick) actually shifted the following
transition by +1:

| trigger (action tick) | balls active-before-action | ball0 shifted? | ball1 shifted? |
|---|---|---|---|
| RIGHT #1 (tick 75) | {0} | **yes** (+1) | n/a (not rented yet) |
| RENT-confirm #2 (tick 113) | {0} (excl. acted slot 1) | **yes** (+1) | n/a (is the acted slot) |
| RIGHT #2 (tick 151) | {0, 1} | **no** (+0) | **no** (+0) |
| RENT-confirm #3 (tick 189) | {0, 1} (excl. acted slot 2) | **yes** (+1) | **yes** (+1) |

`cursorPos` was independently confirmed to move 0→1 and 1→2 on both RIGHT
presses (not gate-dropped), so RIGHT #2 is a genuine, accepted cursor move
that simply doesn't cost anyone a tick - unlike RIGHT #1. Ball 0's total by
tick 204: RIGHT#1 + confirm#2 + confirm#3 = **3** real stalls (not the
previously-assumed 4, since RIGHT#2 contributes zero) - which lands its
2nd roll (a FAILURE, same as the single-ball baseline's own frame-201
FAILURE roll, RAM-pinned in `tests/ballAnim.test.ts`) at exactly
201 + 3 = **tick 204**, bit-exact with RAM. The current `ballAnimStall`
code computes a **4th** spurious stall (it still stalls both balls on
RIGHT #2), predicting the roll one tick later than RAM - exactly matching
entry 23's own observation ("the engine has neither transition fire - both
stay parked one tick behind"). Mystery fully closed: this was never an
internal-counter composition bug, it's this one over-stall.

**Not yet root-caused:** *why* LEFT/RIGHT stops costing anyone a tick once
2+ balls are active, while RENT/DESELECT-confirm keeps costing every
non-acted-on active ball a tick regardless of count. Both call the same
shaped `AddTextPrinterParameterized`+`CopyWindowToVram` pair
(`Select_PrintMonCategory`+`Select_PrintMonSpecies` vs
`Select_PrintSelectMonString`), so the mechanism entry 20 proposed (a
same-tick text-print call stealing the *next* tick's `AnimateSprites()` for
every other sprite) can't be the whole story as stated - something about
LEFT/RIGHT specifically must stop applying past 1 active ball. Only 2 RIGHT
presses were probed (both with disjoint ball-counts: 1-active and
2-active) - not enough data points to tell "stalls only when exactly 1 ball
active" from "stalls only the *first-ever* RIGHT" from some other rule
(e.g. LEFT vs RIGHT parity, or something about which slot the cursor is
leaving/entering). **Do not guess/hardcode either of these without one more
RAM data point** - the cheapest next probe is a 3rd RIGHT press (slot2→
slot?, 3 balls active - wraps to slot0 or needs a 4th rental slot) to see if
it also costs zero, which would support the simple "count > 1" rule; a
LEFT-instead-of-RIGHT variant with 2 active balls would rule out
directional asymmetry.

**Next session:** with the table above, the fix is likely a small,
well-targeted change to `core.ts`'s LEFT/RIGHT branch (narrowing when
`ballAnimStall = activeSlotsBeforeAction` applies) - but get the one more
RAM data point above first so the fix is a proven rule, not a fit to two
data points. HARD CONSTRAINT unchanged: `ballAnim.test.ts`/
`ballAnimMultiBall.test.ts` stay green (verified this session's finding
doesn't conflict with either - `ballAnimMultiBall.test.ts`'s own "two-ball
scenario" never exercises a RIGHT/LEFT trigger with 2+ balls already
active, only RENT-confirm triggers with 2+ active, which this session
confirms are unaffected). Once fixed: RAM-verify pixels at the original
repro's frames 124/155/163, add a Tier-1 test for the RIGHT-with-2+-active
rule (including the tick-204 checkpoint), then `rent-3picks.json` per the
brief's spec.

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
