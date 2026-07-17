# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #7 — `ballAnimStall`'s LEFT/RIGHT branch is wrong once 2+ balls are
  simultaneously active (RAM-DISPROVEN three more hypotheses across two
  sessions - see "fourth worker update" then "fifth worker update": neither
  active-ball count, "first cursor move only", NOR "entering slot's species
  alone" predicts the data - the species-only table the supervisor
  user-delegated-sanctioned this session was ITSELF RAM-DISPROVEN by a clean
  counterexample (HAUNTER stalls at one count/direction/origin, does NOT
  stall at another) - fix not yet implemented, no per-species table was
  coded. Blocks `rent-3picks.json`. The separate post-confirm
  cursor-input-drop bug this entry previously flagged is FIXED
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
LEFT/RIGHT specifically must stop applying past 1 active ball.

**Fourth worker update: both the "count-dependent" and "first-event-only"
hypotheses above are now RAM-DISPROVEN with clean counterexamples (fresh
probes, same corrected offsets as the third update). Neither active-ball
count, cursor direction, nor "is this the first-ever cursor move" predicts
the data; the actual determinant looks like the ENTERING slot's species
name (a render-cost-dependent race, same *class* of bug as ISSUES #5's
WIN0V jitter) - not proven down to the exact mechanism, and not fixed. Do
not hardcode a guess; see "Status" below for what's needed next.**

Built two RAM probes (same `EmeraldOracle` recipe + corrected `struct
Sprite` offsets as the third update, scratch scripts under `/tmp`, not
committed): (1) a fresh 4-rent/6-cursor-move trace (slots 0→1→2→3→4,
40-tick dwells throughout, plus a deliberate **consecutive** RIGHT at
1-active - two cursor moves in a row with no rent between them, both at the
same active count - to directly test "count==1 always stalls" against
"only the very first-ever cursor move stalls"); (2) an exact independent
re-derivation of entry 21/23/24's own original repro shape (36-tick dwells,
confirms landing at press-ticks 37/113/189) to cross-check RIGHT#2 rather
than trust the prior write-up at face value. Both used the cadence-
transition method (MOVING_CMDS' fixed 4/8/32-tick durations are
RNG-independent, so any *observed* gap of `duration+1` unambiguously means
exactly one stall landed in that window - no RNG replay needed).

Results (`t=action tick`, cursor move is `cursorPosBefore → cursorPosAfter`,
species per the anchor's pinned pool ONIX/MAGBY/BAYLEEF/BUTTERFREE/
HAUNTER/QUILAVA at slots 0-5):

| trigger | move | active-before | entering species | stalled? |
|---|---|---|---|---|
| RIGHT#1 (entry24 repro, t=75) | 0→1 | {0} | MAGBY | **yes** |
| RIGHT#2 (entry24 repro, t=151) | 1→2 | {0,1} | BAYLEEF | **no** |
| R1 (fresh probe, t=79) | 0→1 | {0} | MAGBY | **yes** |
| R2 (fresh probe, t=121, consecutive w/ R1, still 1 active) | 1→2 | {0} | BAYLEEF | **no** |
| R3 (fresh probe, t=241) | 2→3 | {0,2} | BUTTERFREE | **yes** |
| L1 (fresh probe, t=283) | 3→2 | {0,2} | BAYLEEF | **no** |
| R4 (fresh probe, t=325) | 2→3 | {0,2} | BUTTERFREE | **yes** |
| R5 (fresh probe, t=445) | 3→4 | {0,2,3} | HAUNTER | **yes** |

This kills both remaining hypotheses cleanly:
- **"count==1 stalls, count>1 doesn't" (H1) is disproven by R2**: exactly 1
  ball active (only ball 0, same as R1), immediately consecutive with no
  rent in between, yet **no** stall - count alone doesn't determine it.
- **"only the first-ever cursor move stalls" (H2) is disproven by R3/R4/R5**:
  each is the 3rd/5th/6th cursor move of the session (never the first), yet
  **all** stall.
- **Directional asymmetry is ruled out**: L1 (a LEFT) and R2/RIGHT#2 (RIGHTs)
  all enter BAYLEEF and all show *no* stall regardless of direction or which
  slot was left (R2/RIGHT#2 leave slot 1, L1 leaves slot 3 - different
  origins, same destination, same (null) result).
- **"leaving an occupied slot" was a promising 6/6 fit against the fresh
  probe alone but is directly falsified by RIGHT#2**: it leaves slot 1,
  freshly rented one confirm earlier (structurally identical timing to R3's
  own setup, which *does* stall) - same shape, opposite outcome.

What DOES fit all 8 points with zero exceptions: **the ENTERING slot's
species**. Every move landing on BAYLEEF (3 independent occurrences: R2,
RIGHT#2, L1 - two different origins, both directions) shows no stall; every
move landing on MAGBY/BUTTERFREE/HAUNTER (5 occurrences) stalls. Plain
string length doesn't explain it either (BAYLEEF and HAUNTER are both 7
characters but land on opposite sides) - `Select_PrintMonSpecies`
(`battle_factory_screen.c:1879-1891`) computes `x =
GetStringRightAlignXOffset(FONT_NORMAL, gStringVar4, 86)`, a **variable-
width font** pixel-width calculation, so the render/CPU cost genuinely
depends on which glyphs are in the name, not just its length - a plausible
mechanism for a cycle-timing race landing on one side of some boundary
depending on that cost, structurally the same *kind* of bug as ISSUES #5
(WIN0V register race depending on unrelated per-frame CPU cost), just in a
different subsystem. `Select_PrintSelectMonString` (the RENT/DESELECT-
confirm path) prints one of 4 *fixed* strings unrelated to species, which
would explain why that trigger's stall is count-independent and always
fires - consistent with every RENT/DESELECT data point gathered so far
(third update's table + this session's R3/R4 confirms, all still stall
every non-acted active ball at every count tried).

**Status:** root cause narrowed to "likely a species-name-render-width-
dependent race on the ENTERING slot," analogous in kind to ISSUES #5 - but
not proven down to the exact GBA font-metric mechanism, and NOT fixed.
Implementing it exactly would mean porting `FONT_NORMAL`'s per-glyph pixel
widths and replicating `GetStringRightAlignXOffset`'s cost model well
enough to predict which side of the race a given species name lands on -
a materially bigger lift than the state-machine-level fixes this issue
has taken so far, and per ISSUES #5's own precedent this class of bug may
not be modelable at this engine's tick/state granularity at all (as opposed
to a clean formula that was simply hard to spot). **Do not hardcode a
per-slot lookup keyed to this one anchor's fixed rental pool as a
substitute for a real rule** - it would silently break for any other
species/anchor and isn't asked for. Per this run's own brief: the rule
still resists a clean derivation, so no `ballAnimStall` code change was
made this session; `rent-3picks.json` remains blocked.

**Next session, in order:** (1) determine whether the species-render-width
theory is even testable further without a font-metric port - e.g. RAM-read
`GetStringRightAlignXOffset`'s actual computed `x` value or the raw
`REG_VCOUNT` at the `SetGpuReg`-equivalent moment (if any single register
write is the actual race point here, analogous to ISSUES #5's investigation
method) directly, rather than inferring it from stall/no-stall outcomes;
(2) if that confirms a genuine sub-tick hardware race with no tick-level
proxy (as ISSUES #5 concluded for its own case), close this out the same
way ISSUES #5 was closed - root-caused, not fixable at this granularity,
document and move on; (3) if it turns out to reduce to something simpler
after all (e.g. a specific glyph or byte value, not full font-metric
simulation), that's the fix. Either way, get sign-off before spending
further session budget here given two consecutive sessions have now each
found the prior session's "confirmed" rule wrong on closer data - this
issue has proven expensive to chase further without new investigative
tooling (RAM access to the actual race-determining register/variable, not
just its downstream effect on sprite state).

**Fifth worker update: the supervisor-sanctioned "species-only" table (PROGRESS
entry 26's DECISIONS block, user-delegated) is RAM-DISPROVEN by a clean
counterexample this session, per the SANCTIONED APPROACH's own explicit stop
condition ("if ANY probe contradicts the species-only rule, STOP... do not
implement"). No `ballAnimStall` code change was made; `rent-3picks.json`
remains blocked.**

**Method:** same corrected `struct Sprite` offsets as the third/fourth
updates (`animNum` u8@0x2A, `animCmdIndex` u8@0x2B, `data[0]` s16@0x2E,
`animEnded` bit 0x10 of u16@0x3E), `ballSpriteId` read directly from
`sFactorySelectScreen->mons[i].ballSpriteId` (not assumed `== i`) rather than
inferred from stall outcomes. Two fresh scripts (scratch Python under `/tmp`,
`EmeraldOracle`, not committed), each with **exactly one active ball**
throughout (so `activeSlotsBeforeAction` is trivially `[observer]` for every
LEFT/RIGHT - no multi-ball composition to disentangle) and 40-tick dwells
between moves:
- **Script A** (observer = ball0, ONIX, rented via the exact `RENT_SLOT1`
  shape - confirm action-tick 37, cross-verified bit-exact against
  `ballAnim.test.ts`'s own frame-39 SUCCESS-roll checkpoint, `data[0]`
  0→32 at tick 39 in this probe too): four consecutive LEFT moves,
  slot0→5 (QUILAVA)→4 (HAUNTER)→3 (BUTTERFREE)→2 (BAYLEEF).
- **Script B** (observer = ball1, MAGBY, rented at slot1): one LEFT move,
  slot1→0 (ONIX).

Per-move attribution used the same cadence-transition method as the third/
fourth updates (`MOVING_CMDS`' 4-or-8-or-32-tick durations are RNG-
independent when no rest/reroll boundary is crossed, so an observed
transition gap of `duration+1` unambiguously means one stall landed in that
window), cross-checked at every step against 6-8 *clean, unaffected*
neighboring gaps in the same run (all matching their table duration exactly,
confirming the method's calibration before trusting any single reading):

| move | count/dir/origin | prior data for this species | this probe |
|---|---|---|---|
| ONIX (script B, slot1→0) | count1/LEFT/origin1 | none (first data point) | **stalls** (gap 73→106 = 33 = 32+1, window contains the only move) |
| QUILAVA (script A, slot0→5) | count1/LEFT/origin0(wrap) | none (first data point) | **stalls** (gap 72→105 = 33 = 32+1) |
| HAUNTER (script A, slot5→4) | count1/LEFT/origin5 | count3/RIGHT/origin3 (fourth update, R5): **stalls** | **no stall** (gap 121→129 = 8, exactly matching the unstalled `MOVING_CMDS[11].duration`, flanked by six other clean duration-8/duration-4 gaps in the same run with zero drift) |
| BUTTERFREE (script A, slot4→3) | count1/LEFT/origin4 | count2/RIGHT/origin2 ×2 (third/fourth updates): **stalls** | inconclusive - lands on the cmdIndex16-exhaustion→resting boundary, whose true unstalled RAM gap isn't independently calibrated in this session's data (observed 171 vs a naive 169; a generic "+1 visible-lag" pattern seen elsewhere in this same probe, e.g. the settling→moving `animNum` flip landing 1 tick after the roll itself, would predict 170 clean or 171 stalled - most consistent with **stalls**, matching prior data, but not as clean a read as the HAUNTER point) |
| BAYLEEF (script A, slot3→2) | count1/LEFT/origin3 | count1/RIGHT/origin1, count2/RIGHT/origin1, count2/LEFT/origin3 (all): **no stall** | **no stall** (gap 203→207 = 4, clean) - consistent, 4/4 |

`cursorPos` was independently read at every sampled tick (both scripts) and
confirms every move landed on the intended slot - not a script/gate bug.

**The contradiction:** HAUNTER stalls at (count3, RIGHT, origin=slot3) but
does *not* stall at (count1, LEFT, origin=slot5) - the entering species
(HAUNTER, identical both times) is the same, yet the outcome differs. This
directly falsifies "the entering slot's species alone determines the stall"
- the SANCTIONED APPROACH this session was asked to complete and implement.
Combined with ONIX/QUILAVA both cleanly joining the "stalls" set as
first-time data points (no contradiction there) and BAYLEEF's clean 4/4
no-stall record, the shape of the data now looks like: BAYLEEF is genuinely
special (never stalls regardless of anything tried - 4/4 across both
directions, three different origins, two counts), but the *other* species
aren't a clean fixed set - something about HAUNTER's specific move context
(direction, origin/leaving-species, or count) flips its outcome. This
resurrects the pre-simplification "fourth worker update" theory (a genuine
render-cost/cycle-timing race, not a clean per-species lookup) rather than
supporting the simpler table the supervisor's width-check reasoning
(PROGRESS entry 26) proposed - that reasoning correctly killed the
character-count/pixel-width theories, but "BAYLEEF is uniquely cheap to
render" doesn't imply "every other species is uniformly expensive
regardless of context."

**Not attempted this session:** re-testing HAUNTER a third time (e.g. at
count1/RIGHT/origin3, isolating direction from the count/origin change
already made) to see whether direction, origin, or count is the actual
missing variable - ran out of session budget after finding the
contradiction, per the brief's explicit stop condition.

**Next session:** do not resume "species-only table" implementation as
scoped. Options, in rough order of promise: (1) get renewed sign-off on
whether to chase the finer variable (direction/origin/count in combination
with species) with a few more targeted single-ball isolated probes (this
session's method - one active ball, cadence-transition gaps - is cheap and
reliable, ~15-20 min per targeted re-test); (2) revisit the "fourth worker
update"'s harder-to-implement render-cost-race theory (`GetStringRightAlignXOffset`
pixel-width-dependent timing) now that it's no longer superseded by a working
simpler alternative; (3) if neither converges, treat like ISSUES #5 - root-
caused as a race, not modelable at this tick granularity, document and ship
`rent-3picks.json` un-built (or move it out of scope) rather than keep
re-deriving "confirmed" rules that keep breaking on the next data point (this
is now the *second* consecutive sanctioned/confirmed rule RAM-disproven by
the following session - worth flagging to whoever owns the user-delegated
policy decision for #7, per entry 26's DECISIONS block, that empirical-table
modeling has not yet produced a rule that survives a fresh probe).

## #5 — [POLICY SETTLED 2026-07-17, user-delegated] mon-pic close WIN0V
  jitter: 0-diff stays the bar; re-time trace interactions into clean
  windows where feasible; otherwise ship with each non-matching frame
  individually attributed to this entry's pattern (x88-151 close-window
  confinement). No further fix attempts. rent-slot1.json: next worker in
  that area should attempt a clean-window re-time (candidates ~31/47+
  per PROGRESS-archive #17). Mechanism summary below is kept for
  attribution evidence; this is no longer an open work item.

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
