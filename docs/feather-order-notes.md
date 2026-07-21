# FEATHER_DANCE draw-order residual (ISSUES #30) — `sSpriteOrder` simulation probe

S7 worktree probe, computation-only (no engine code touched). Tests the
"model `sSpriteOrder`'s own persistent incremental insertion sort" lead filed
in `ISSUES.md #30` / `docs/battle-turn-notes.md §34` against the committed
`turn6/7/8-feather-sprites-probe.json` tables. **Result: a real, consistent,
decisive finding on the algorithm and on one genuine initial-permutation
ambiguity — but NOT a full pixel-level crack.** The persistent-order
simulation predicts a DIFFERENT draw order than the shipped
descending-slot heuristic on the large majority of the residual window's
ticks (89-97 of ~129, every turn, identically) — a live, still-untested
hypothesis, not an eliminated one. Time-capped before the pixel-render+diff
step; see "What's NOT done" below.

## The real algorithm, from source (not the entry's paraphrase)

`reference/pokeemerald/src/sprite.c`:

- `sSpriteOrder` (`EWRAM_DATA static u8 sSpriteOrder[MAX_SPRITES]`, line 282)
  is a **persistent, per-battle** array of `gSprites[]` indices — it is
  **not** reset or rebuilt from scratch each frame.
- Every frame, `BuildOamBuffer` (line 325) calls, in order:
  `BuildSpritePriorities()` → `SortSprites()` → `AddSpritesToOamBuffer()`.
- `BuildSpritePriorities` (line 361): for every one of the 64 slots,
  `sSpritePriorities[i] = sprite->subpriority | (sprite->oam.priority << 8)`
  — a single 16-bit key, **subpriority in the low byte, OAM `priority` in the
  high byte** (i.e. `oam.priority` dominates; `subpriority` only breaks ties
  within the same `oam.priority`).
- `SortSprites` (line 372): **a complete, textbook insertion sort**, run in
  full every single frame over all 64 `sSpriteOrder` entries (`for i in
  1..63: insert order[i] into the already-sorted prefix order[0..i-1]`) —
  this is NOT "one adjacent-pair pass" (a misreading the entry's own
  paraphrase invites); it is a full O(n²) sort that always leaves the array
  in the objectively-correct order for the CURRENT frame's keys, comparator:
  `swap when priority1 > priority2, OR (priority1 == priority2 AND Y1 <
  Y2)`, where `Y` is `sprite->oam.y` with the `>= DISPLAY_HEIGHT(160)` → `-256`
  wraparound applied (plus an extra `> 128` → `-256` wrap for
  `ST_OAM_AFFINE_DOUBLE` + `ST_OAM_SIZE_3` square/v-rectangle sprites only —
  **does not apply here**: `gFallingFeatherSpriteTemplate` uses
  `gOamData_AffineNormal_ObjNormal_32x32`, i.e. `ST_OAM_SIZE_2`, confirmed
  from `reference/pokeemerald/src/battle_anim_flying.c:171-180`).
- **Because it is a full sort (not a partial pass), the "persistence"
  actually only matters for a comparator TIE** — same `priority` key AND
  same wrapped `Y` — since insertion sort is stable, a genuine tie preserves
  whatever relative order the pair had going INTO this frame's sort, which
  came from the PREVIOUS frame's `sSpriteOrder`. A non-tie fully resorts
  correctly regardless of starting order (this is the flaw in a naive
  "persistent incremental" mental model that expects history to matter
  broadly — it only matters exactly at ties, but here ties are common and
  long-lived: see below).
- `AddSpritesToOamBuffer` (line 482): walks `sSpriteOrder[0..63]` ascending,
  assigning consecutive OAM indices to each `inUse && !invisible` sprite it
  finds. **Lower final `sSpriteOrder` position → lower OAM index → drawn ON
  TOP** at equal hardware priority (re-confirmed from source, matches the
  entry's own paraphrase on this one point).
- `subpriority` for every `Move_FEATHER_DANCE` `createsprite` line
  (`data/battle_anim_scripts.s:3981-3992`) is `subpriority_offset = 0`
  (`asm/macros/battle_anim_script.inc:13`, 3rd macro arg) — confirmed, matches
  the entry. So all 8 feathers' priority key collapses to their raw
  `oam.priority` byte (the probe's own `priority` field, values `{0,2,3}`
  observed) with no subpriority contribution.

## Y-ties are pervasive, not rare — this is why "fresh Y-sort" underperformed

Computed directly from the committed probe tables (no simulation needed):
feathers spawn in **mirrored pairs at the identical RAM tick** — turn 6:
`(3)` alone, `(4,7)` @ 7412, `(8,9)` @ 7420, `(10,11)` @ 7428, `(12)` alone @
7436 (turns 7/8: same pattern, shifted). Each pair shares the exact same
`y+y2` **every tick of its shared lifetime** (they are horizontal mirror
images of one falling trajectory) — 159 same-priority-live-feather ticks
carry an exact Y tie in turn 6 alone (out of 138 multi-feather ticks total).
This is the mechanism `docs/battle-turn-notes.md §34`'s "descending-Y"
experiment (445px, worse than slot) couldn't model: a **fresh** per-tick
Y-sort has no notion of "which one was ahead last frame" for an exact tie —
it falls back to whatever arbitrary order the sort implementation's input
array happened to be in, which is not necessarily related to the real
`sSpriteOrder`'s own history-preserving tiebreak.

## The genuine unknown: initial relative order at spawn

The probe tables only cover the 8 feather slots (3/4/7/8/9/10/11/12) from
their own first RAM tick onward. `sSpriteOrder`'s real starting state for
these 8 positions, at the moment the first feather spawns, depends on the
**entire battle's sprite-creation/destruction history since
`ResetSpriteData`** (menus, mon sprites, HUD elements, etc. reusing and
freeing these same 64 slots for ~7000+ prior ticks) — not reconstructible
from the feather tables alone, exactly as the step brief anticipated.
Parameterized per the brief's instruction: tried all `2³ = 8` orderings of
the three same-tick spawn pairs `(4,7)`, `(8,9)`, `(10,11)` (slot 3 and 12
spawn alone, so their position is unambiguous — first-free-slot scanning
puts them at the ends), composed onto an ascending-slot skeleton.

**Decisive, consistent-across-all-3-turns finding**: only the **`(4,7)`**
pair's initial relative order has any effect on the simulated result — the
`(8,9)` and `(10,11)` orderings never change a single predicted draw order
in any of the three turns' probe tables (their priority/Y histories
apparently diverge enough, early enough, that any transient tie-preservation
from a different starting permutation gets overwritten by a real resort
before it would ever matter for a visible pixel). This holds **identically**
for turn 6, 7, and 8 — the same single bit is the only one that matters,
every time, which is itself the kind of "a consistent single permutation
across all 3 turns" result the brief flagged as decisive on its own.

| candidate (4,7 order) | ticks differing from shipped desc.-slot (of 138 tie ticks) | first diff tick (turn 6) |
|---|---|---|
| `(4,7)` initial (4 before 7) | **89** | 7429 (3-way tie `[3,9,11]`/`[4,7,8,10]`) |
| `(7,4)` initial (7 before 4) | **97** (window-restricted: 97; global 106) | 7412 (pair `[4,7]`, inside the already-0-diff prefix) |

(`(8,9)`/`(10,11)` orderings: 0 additional ticks changed in every combination
tested — fully redundant parameters for this dataset.)

## Restricted to the actual residual window (§34's 7421-7549 and its turn
7/8 analogues at the same +17-tick-from-spawn relative offset)

| turn | window | `(4,7)`-first candidates: pixel-relevant diff ticks | `(7,4)`-first candidates: pixel-relevant diff ticks |
|---|---|---|---|
| 6 | 7421-7549 | 89 | 97 |
| 7 | 8455-8583 | 89 | 97 |
| 8 | 9501-9629 | 89 | 97 |

"Pixel-relevant diff ticks" = ticks where the simulated persistent order
actually disagrees with the shipped descending-slot-within-tie-group rule
for at least one live same-priority tie group — i.e. the only ticks where
the two models could possibly produce different pixels. **The majority of
the residual window (89-97 of ~129 ticks, every turn) is one of these** —
this is a live, substantively different, untested-at-the-pixel-level
hypothesis, not a no-op restatement of the shipped rule.

## What's NOT done (time-capped)

Step 2 of the brief (render each candidate via the existing engine
primitives — `drawSpriteSheetAffineRotate`/the sampler — and diff against
fresh oracle captures for the 7421-7549 window) was **not reached** within
this session's time budget: deriving the exact algorithm from source,
validating it against the RAM tables, and parameterizing/testing the
initial-permutation ambiguity (all of which turned out to need more source
cross-referencing than the entry anticipated — e.g. the entry's own
paraphrase of `SortSprites` as "only re-sorts adjacent pairs when a swap
condition trips" undersells it; it is a full sort every frame, and the real
persistence-sensitive case is specifically exact-Y ties, which are pervasive
here because of the mirrored-pair spawn structure) consumed the rung's
budget. The half-texel sampling-center lead (§34's second untried lead) was
**not attempted** for the same reason.

**Verdict: (ii)-adjacent but incomplete** — not a strict, verified
improvement (no pixel diff run), not an elimination (the model demonstrably
predicts different orders than shipped on most of the residual window, so
it has NOT been ruled out), and not a 0-diff crack. The honest verdict is:
**the sSpriteOrder lead remains open and is now precisely
implementable-and-testable** (algorithm nailed down from source, the one
genuine parameter identified and narrowed to 2 candidates, both committed
and rerunnable) — a future session's fastest path is to render the ~89-97
turn-6 candidate ticks (`tools/probe/simulate-feather-sprite-order.py`'s
output) via the existing `drawSpriteSheetAffineRotate` primitive and diff
against oracle captures for 7421-7549 (needs a fresh `bin/oracle run` — the
committed `turn6-feathers.json` trace stops its own `captureFrames` at 7420).

## Committed artifacts

- `tools/probe/simulate-feather-sprite-order.py` — the algorithm-from-source
  simulation (rerunnable, no dependencies beyond the committed probe JSON):
  `python3 tools/probe/simulate-feather-sprite-order.py`.

## Proposed `ISSUES.md #30` update (not applied — supervisor's call)

Replace the "Leads for a future session" paragraph with: the algorithm is
now fully nailed down from source (full insertion sort every frame, not an
adjacent-pass; persistence only matters at exact-Y ties, which are pervasive
here due to mirrored-pair spawns); the one genuine initial-permutation
unknown (the `(4,7)` spawn pair's relative order) is narrowed to exactly 2
candidates, identical across all 3 turns; both predict a materially
different draw order than the shipped fix on 89-97 of ~129 residual-window
ticks, so this is a **live, narrowly-scoped, ready-to-render** hypothesis,
not yet eliminated. Next step for whoever picks this up: render both
candidates over the turn-6 window via the existing affine sampler and diff
against a fresh oracle capture (7421-7549) to pick a winner or eliminate
both; only then fall to the half-texel lead.

## S7 worktree probe, 2026-07-21: the DECISIVE pixel render+diff — candidate A wins, partial crack (425px → 230px), not a full 0-diff

Ran the render/diff step the previous session left as the "fastest path."
**Result: candidate A (the `(4,7)` pair spawning with 4 before 7) strictly
dominates candidate B (the flip) and beats the shipped descending-slot rule
in aggregate on all 3 turns — a real, load-bearing improvement — but does
NOT reach 0px, so this is verdict (2) from the brief's own list ("a
candidate strictly dominates but nonzero → partial").**

### Method

1. Fresh oracle captures: `turn6-menu.json`'s own committed script
   (segments untouched) with `captureFrames` overridden to `7421..7549`
   (129 frames, one `bin/oracle run`/`runOracleTrace` call) — the trace's
   own segment total (8346 frames) comfortably covers the window, so no
   segment edits were needed. Turn 7/8 retrodiction used the same trick
   against `turn7-menu.json`/`turn8-menu.json` (segment totals 9380/10826,
   both comfortably cover their own residual windows), with 8 evenly-spaced
   spot ticks each rather than the full ~129-tick window (cheap
   retrodiction, per the brief).
2. "Shipped" frames come from the REAL production pipeline
   (`renderAppTrace`, `tools/compare/appTrace.ts` — the same one `npm run
   compare` uses), not a reimplementation — so the shipped numbers below are
   the actual current-engine residual, not a proxy.
3. Candidate frames (`tools/probe/render-feather-order-candidates.ts`,
   `npx tsx`) are derived by PATCHING the shipped frame at exactly the
   pixels where 2+ same-priority feathers overlap (the only pixels a
   same-priority-tie reordering can possibly change — see the script's
   `patchTieGroups` docstring for the full proof sketch: same-priority
   members are always contiguous in the real paint sequence under ANY
   priority-dominant sort, shipped or candidate, so nothing else can be
   interleaved mid-block, and the block's position relative to Onix/other
   priorities is fixed regardless of the internal tie order). Per pixel,
   each candidate's own isolated tie-group composite (built by re-running
   the exported `drawSpriteSheetAffineRotate` primitive per sprite onto a
   scratch alpha-sentinel buffer, then compositing in the candidate's paint
   order) is used ONLY where the SHIPPED isolated composite already
   matches the real shipped frame's pixel at that spot (`matchesReal`) —
   this verifies the isolation assumption per-pixel rather than trusting it
   blindly; anywhere it fails (mostly the behind-Onix group's own overlap
   with Onix's sprite, and front-group pixels also covered by a
   different-priority front member — both cases where a NON-tied sprite
   wins regardless of the tie's internal order, so leaving the pixel
   unpatched is already the correct value, just conservatively
   under-verified) is left at the shipped value and counted as "unsafe" for
   transparency. **This makes the candidate totals below a verified,
   reproducible LOWER BOUND on the achievable improvement** (never
   overstates it, and both candidates are scored with the identical
   methodology so the A-vs-B comparison is apples-to-apples regardless of
   how conservative the absolute floor is).
4. Candidate per-tick order is read from
   `tools/probe/dump-feather-order-candidates.py`'s JSON dump — a thin
   wrapper that imports `simulate-feather-sprite-order.py` as a module and
   calls its own `simulate()` unmodified (no reimplementation, no second
   copy of the algorithm to drift out of sync) for exactly the 2 candidates
   that matter (`(4,7)`-first, `(7,4)`-first; the `(8,9)`/`(10,11)` bits
   fixed at 0, confirmed fully redundant by the prior session).

### Results

| turn | window | ticks | shipped total | candidate A total | candidate B total | exact-0 (shipped/A/B) |
|---|---|---|---|---|---|---|
| 6 | 7421-7549 | 129 | **425px** | **230px** | 265px | 9 / 9 / 9 |
| 7 | 8 spot ticks, 8455-8583 | 8 | 46px | **17px** | 17px | 0 / 1 / 1 |
| 8 | 8 spot ticks, 9501-9629 | 8 | 46px | **17px** | 17px | 0 / 1 / 1 |

Turn 6, per-tick (only ticks where shipped/A/B differ from each other or
from 0 shown — the rest are identical 1-4px across all three, unaffected by
either candidate):

| tick | shipped | A | B |
|---|---|---|---|
| 7426 | 1 | 1 | 3 |
| 7427 | 1 | 1 | 6 |
| 7428 | 1 | 1 | 13 |
| 7429 | 1 | 1 | 17 |
| 7430 | **30** | 1 | 1 |
| 7447 | **30** | 2 | 2 |
| 7448 | **24** | 2 | 2 |
| 7449 | **15** | 1 | 1 |
| 7450 | **9** | 1 | 1 |
| 7451 | **9** | 1 | 1 |
| 7463 | 1 | 2 | 2 |
| 7465 | 0 | 1 | 1 |
| 7469 | 1 | 2 | 2 |
| 7493 | 5 | 2 | 2 |
| 7494 | **16** | 2 | 2 |
| 7495 | **37** | 3 | 3 |
| 7512 | **18** | 4 | 4 |
| 7513 | **10** | 3 | 3 |
| 7514 | 5 | 2 | 2 |
| 7531 | 1 | **0** | **0** |
| 7532 | 3 | 1 | 1 |
| 7533 | 3 | 1 | 1 |
| 7534 | 2 | 1 | 1 |
| 7535 | 3 | 2 | 2 |
| 7536 | 2 | 1 | 1 |

**Candidate A is never worse than candidate B** (A ≤ B on 129/129 turn-6
ticks, strictly better on 4: 7426-7429 — exactly where `(7,4)`'s own
first-diff tick is, per the prior session's simulation table). **Candidate
A is worse than shipped on only 3 of 129 ticks** (7463/7465/7469, 1px each
— net -3px against a +195px aggregate win elsewhere); **candidate B is
worse than shipped on 7** (the same 3 plus 7426-7429). This is a clean,
one-sided result, not noise: A dominates B on every tick it's ever
different, and dominates shipped everywhere except 3 single-pixel ticks.

### Verdict: **partial** — candidate A ((4,7) pair spawns 4-before-7) is the winner, adopt it, but it is not a full crack

Per the brief's verdict list: this is case (2), "a candidate strictly
dominates but nonzero." The winning rule, stated so a fix is mechanical:

> When simulating `sSpriteOrder`'s persistent insertion sort for the 8
> `gFallingFeatherSpriteTemplate` slots, seed the initial relative order of
> the `(4,7)` same-tick spawn pair with **slot 4 before slot 7** (i.e. the
> ascending-slot skeleton `[3,4,7,8,9,10,11,12]`, unmodified — the `(8,9)`
> and `(10,11)` pairs' own initial order is irrelevant, confirmed
> redundant). Run the real algorithm from `sprite.c` (full insertion sort
> every frame, comparator `priority` ascending¹ then wrapped-Y ascending)
> forward from spawn, carrying the array tick-to-tick exactly as the
> persistent `sSpriteOrder` would. At render time (RAM tick = render tick −
> 1, the already-established lag), replace `compareFeatherDrawOrder`'s
> current `b.priority - a.priority || b.slot - a.slot` with a lookup into
> this simulated order (draw order = reverse of the simulated front-to-back
> `sSpriteOrder` position, restricted to that tick's live/same-priority-tied
> slots — non-tied slots are already correctly ordered by `priority` alone
> and need no change).
> ¹ (`sort_step`'s own comparator, `docs/feather-order-notes.md`'s earlier
> section: swap when `priority1 > priority2`, i.e. sorts priority ascending
> with descending-priority-first-painted — same net effect as
> `compareFeatherDrawOrder`'s existing `priority` term, only the tiebreak
> changes.)

**The remainder's shape** (why this isn't 0px): the residual that
survives — largest single spikes at 7430/7447/7448/7495/7512 under
shipped (9-37px) shrink to 1-4px under A, and every OTHER tick sits at a
flat 1-4px baseline under A that never fully clears — is consistent with
`battle-turn-notes.md` §29's original characterization: soft gradient edge
tones of the feather art at overlap boundaries, not shape/position errors
(this session did not re-crop-inspect A's own specific residual pixels
under the time cap, but the magnitude/flatness signature matches). Per the
brief's own routing: **the half-texel sampling-center lead is next** — test
±0.5 center-offset variants of `drawSpriteSheetAffineRotate`'s sampling for
feather sprites on top of candidate A's winning order, same window, same
protocol. Not attempted this session (time cap).

One more honest caveat: because the patch method only trusts
per-pixel-verified-safe tie-group pixels (see Method §3), the candidate
totals above are a **lower bound** — the true achievable 0-diff-adjacent
number after a real engine-level reorder (not a patched estimate) could be
slightly lower still, since a small number of pixels per tick (the
"unsafe" set, typically 150-350px/tick out of the full frame, concentrated
where the behind-Onix tie group's own footprint overlaps Onix's sprite, or
where a front-group member of one priority overlaps a different-priority
front member) were left at the shipped value rather than verified. This
does not change the A-vs-B comparison (both scored identically) or the
qualitative verdict.

### Turn 7/8 retrodiction: consistent

Both turns' 8 spot ticks (evenly spread across their own residual windows)
show the **identical 46px → 17px reduction under candidate A**, same as B
on this coarser sample (the `(4,7)`-vs-`(7,4)` divergence ticks weren't
among the 8 spot ticks sampled — turn 6's own dense 129-tick run is the
one that actually distinguishes A from B; turns 7/8 here confirm the
*rule* generalizes, not the A/B pick specifically, which was already
established identically across all 3 turns by the prior session's
simulation). No turn-specific surprises.

### Committed artifacts

- `tools/probe/dump-feather-order-candidates.py` — thin JSON-dump wrapper
  around `simulate-feather-sprite-order.py`'s own unmodified `simulate()`
  (imported as a module), producing the per-tick candidate order tables the
  renderer consumes. Rerunnable: `python3
  tools/probe/dump-feather-order-candidates.py` (writes
  `tools/probe/out/feather-order-candidates.json`, gitignored).
- `tools/probe/render-feather-order-candidates.ts` — the render+diff
  script itself. Rerunnable: `npx tsx
  tools/probe/render-feather-order-candidates.ts` (needs the oracle
  service up; runs 3 oracle calls, ~145 total captures). Writes
  `tools/probe/out/feather-order-render-results.json` (gitignored) with
  full per-tick numbers.

## Proposed `ISSUES.md #30` update (not applied — supervisor's call)

Replace the "2 live candidates, next step named" paragraph with: the
render+diff step is done. **Candidate A (the `(4,7)` spawn pair's initial
order, 4-before-7) wins** — strictly dominates candidate B (never worse,
strictly better on 4/129 turn-6 ticks) and cuts the shipped
descending-slot rule's residual from 425px to a verified-lower-bound
230px on turn 6's 7421-7549 window (46px → 17px on turn 7/8 spot checks,
same ratio) — a real, adoptable improvement, NOT a full crack (3/129
ticks land 1px worse than shipped; remainder reads as the same soft-edge
gradient signature §29 already characterized). Mechanical fix recipe is
written up in `docs/feather-order-notes.md`'s "Verdict" section above:
seed the persistent-insertion-sort simulation with `[3,4,7,8,9,10,11,12]`
and replace `compareFeatherDrawOrder`'s tiebreak with a lookup into the
simulated order. Next step for whoever implements it: port the
simulation into `featherDance.ts` (or precompute+commit a per-turn
`sSpriteOrder`-position table the same way the RAM probe tables already
work), re-run `npm run compare` against `turn6/7/8-feathers.json`'s
extended windows, then chase the residual's soft-edge-tone shape via the
half-texel sampling-center lead (untested) if it doesn't fully clear.

## S7 worktree probe, 2026-07-21 (second session): the half-texel sampling-center lead — ELIMINATED, 11/11 variants tested, none improve on candidate A's floor

Reran the prior session's render+diff first to confirm reproduction (required
by this session's brief before extending): **exact reproduction** -
turn 6 shipped=425px/candidate A=230px/candidate B=265px over the same
7421-7549/129-tick window, turn 7/8 spot checks both 46px→17px. Baseline
confirmed byte-for-byte against the committed numbers above.

### Method

Built `tools/probe/render-feather-halftexel-candidates.ts`, a sibling script
(not a modification of the order-only script, since this lead's effect is
qualitatively different - see below). Generalizes
`render-feather-order-candidates.ts`'s `patchTieGroups` trick (patch only
pixels verified-safe via a per-pixel `matchesReal` check against the real
shipped frame) from "same-priority tie groups only" to **the full live-feather
set per tick** (`patchFullLayer`): a half-texel sampling-center shift can move
ANY feather pixel's color, including single-sprite edges and
different-priority overlaps that a tie-groups-only patch would never touch -
restricting to ties (as would have been the naive reuse of the existing
script) would have silently tested almost nothing. The safety argument still
holds without the tie-group's priority-contiguity property (see the
function's own docstring): the `matchesReal` per-pixel gate is what makes
patching sound, not contiguity, so widening the group only means more pixels
fail the gate and get counted `unsafe` (larger, honestly-reported, still a
verified lower bound) - it does not risk a false patch.

The half-texel offset itself is a **local, non-engine copy**
(`drawFeatherOffset`) of `drawSpriteSheetAffineRotate`'s inverse-transform
loop, with the offset added as an extra term **inside the pre-shift
accumulator**: `sx = ((dx*pa + dy*pb + offXFixed) >> 8) + halfW` where
`offXFixed ∈ {-128, 0, +128}` (8.8 fixed-point, i.e. ±0.5 source texel) -
this is the precise "does the real hardware round-to-nearest instead of
floor-truncate" test the brief's wording implies, and it changes the flooring
boundary rather than just translating the whole sprite. **Startup
self-check**: the local copy is diffed byte-for-byte against the real
`drawSpriteSheetAffineRotate` at offset (0,0) on a real probed matrix before
any variant runs - this actually caught a real transcription bug during
development (the palette entries are `{r,g,b}` objects, not `[r,g,b]`
tuples; an early draft indexed them as arrays and got silent zeros) - so the
"byte-identical at offset 0" claim below is verified, not assumed.

Same turn-6 129-tick window (7421-7549), same single oracle
call + `renderAppTrace` call (shipped/oracle pixels fetched ONCE, all 11
variants scored locally against the same captures - no extra oracle round
trips per variant).

### The 9-variant uniform grid: every nonzero offset is strictly, dramatically worse

| (ox, oy) texels | total px (129 ticks) | vs (0,0) |
|---|---|---|
| (-0.5, -0.5) | 32283 | 141.6x worse |
| (-0.5, 0) | 18627 | 81.7x worse |
| (-0.5, +0.5) | 32275 | 141.6x worse |
| (0, -0.5) | 24264 | 106.4x worse |
| **(0, 0)** | **228** | baseline (candidate A, no shift) |
| (0, +0.5) | 23504 | 103.1x worse |
| (+0.5, -0.5) | 32279 | 141.6x worse |
| (+0.5, 0) | 17814 | 78.1x worse |
| (+0.5, +0.5) | 32046 | 140.6x worse |

(0,0) here reproduces the prior session's 230px floor closely - 228px, not
byte-identical, because this session's method patches the FULL live-feather
set per tick rather than only tie-group pixels, so the two runs are not
expected to match exactly; the 228-vs-230 agreement to within 1% is itself a
cross-check that both methods are measuring the same real quantity.) No
variant reaches 0px on any tick, let alone all 129 (0 exact-0 ticks for every
nonzero offset vs candidate-A-alone's 9/129). This is not a weak or
ambiguous result: **every single nonzero half-texel shift, in every tested
direction, blows up the residual by 80-140x** - a shift this destructive
means the current floor-only convention is already very close to correct;
if a half-texel bias existed, drift in the WRONG direction would be
mildly worse, not catastrophically worse across all 8 nonzero cells
uniformly. That symmetry (every nonzero cell is bad, not just "wrong-signed"
ones) is itself evidence this isn't a subtle sign error in an otherwise-right
idea - the sampling-center convention the engine already uses is correct.

### The 2 conditional conventions: also both worse, ruling out the "plausible" refinements

| variant | total px | vs (0,0) |
|---|---|---|
| hFlip-conditional (±0.5 texel in X, sign flipped for `hFlip` sprites) | 17704 | 77.6x worse |
| box-origin (+0.5 screen-pixel offset applied to `dx`/`dy` before the matrix multiply, not to the source accumulator) | 31388 | 137.7x worse |

Both land in the same destructive range as the uniform grid's nonzero cells
(not better, not even competitively close) - neither of the brief's two
"most plausible" non-uniform refinements salvages the idea.

### Verdict: (iii) — the half-texel sampling-center lead is ELIMINATED

Per the brief's own verdict list: 11/11 tested variants (9 uniform + 2
conditional) are at best a no-op (the trivial (0,0) case, which is just
candidate A unchanged) and at worst ~140x worse. This is a clean, decisive
elimination, not a "didn't find the right magnitude" ambiguity - the grid
covered the full and only physically sensible magnitude (±1 half-texel,
the largest sub-pixel shift that doesn't wrap into a different texel
entirely) in both axes independently, plus the two brief-nominated
non-uniform refinements. `drawSpriteSheetAffineRotate`'s existing
floor-only `sx = ((dx*pa+dy*pb)>>8) + halfW` convention is not the source
of the remaining ~230px (verified-lower-bound) residual.

### Forensics on candidate A's actual remaining residual (in place of further half-texel work)

Built `tools/probe/forensics-feather-residual.ts` (reuses the exported,
`matchesReal`-gated `patchFullLayer`/`uniformPolicy` from the half-texel
script - NOT a fresh naive re-composite; an early draft of this forensics
script skipped the safety gate and produced misleading "mismatches" that
were actually Onix-occlusion pixels the real gate would have correctly left
untouched, a mistake caught by cross-checking against the feather palette's
own color range, see below). Dumped the first 4 genuinely-gated-residual
pixels in the window (ticks 7421-7422):

| tick | pixel | candidate A | oracle | shipped | delta |
|---|---|---|---|---|---|
| 7421 | (59,65) | (255,255,255) | (247,247,255) | (255,255,255) | 8,8,0 |
| 7422 | (86,62) | (181,206,255) | (247,247,255) | (181,206,255) | 66,41,0 |
| 7422 | (61,64) | (255,255,255) | (132,123,123) | (255,255,255) | 123,132,132 |
| 7422 | (61,65) | (255,255,255) | (132,123,123) | (255,255,255) | 123,132,132 |

Two distinct signatures, not one:

1. **(59,65) and (86,62): soft near-white/blue gradient tones, small deltas**
   (≤66 in one channel, 0 in blue) - this is exactly §29's already-characterized
   signature (app close-to-white/blue vs oracle a slightly different
   close-to-white/blue) and is consistent with a genuine sub-pixel sampling
   effect. But it's NOT the half-texel-sampling-center mechanism just
   eliminated above (that was tested exhaustively and made things worse) -
   candidly, this session did not identify the alternative mechanism that
   *would* produce this signature; flagged for a future session as still
   the right general shape to chase (candidates not yet tried: a
   coverage/blend-based anti-aliasing model rather than a pure
   nearest-neighbor shift, or a difference in which of two adjacent texels
   wins at an EXACT tie in the `>>8` floor for specific `pa/pb/pc/pd`
   ranges - i.e. a data-dependent rounding rule rather than a constant
   spatial offset, which a uniform half-texel grid by construction cannot
   detect).
2. **(61,64)/(61,65): a much larger, non-gradient delta** (123-132 per
   channel) landing on a color, `(132,123,123)`, that is **not in the
   feather sprite's own palette at all** (the palette is entirely white/blue
   tones, RGB values checked directly from
   `src/assets/gen/battle-anim-white-feather.json` - `{r,g,b}` in
   `{(0,0,0),(255,255,255),(231,239,255),(206,222,255),(181,206,255),`
   `(156,189,255),(132,173,255),(107,156,255)}`, indices 8-15 all
   `(0,0,0)`/transparent). `(132,123,123)` is a warm gray, characteristic of
   Onix's own body shading, not feather art. Candidate A leaves this pixel
   at `255,255,255` (shipped's own value, since the `matchesReal` gate
   correctly refused to patch it - meaning shipped's OWN composite already
   disagreed with the real frame there too, so this pixel was already wrong
   under BOTH the shipped rule and candidate A, unaffected by either
   ordering fix). This reads as a DIFFERENT mechanism class entirely: an
   **occlusion/priority-split boundary error** (the exact edge where the
   base-priority feather group's silhouette meets Onix's own sprite, per
   §29 rung (d)'s "z-order against Onix is priority-split" finding - this
   is a plausible site for a small pixel-perimeter discrepancy in exactly
   which pixels the priority split's boundary check assigns to which side),
   not a feather-vs-feather draw-order or sampling issue at all - so
   neither this session's order-recipe fix nor a half-texel offset could
   ever have touched it.

**Practical implication for the fix recipe**: candidate A's order fix
(previous section) should still be adopted - it is a real, large,
independently-verified improvement (425px→230px) - but the remaining
residual is NOT one uniform mechanism. A future session chasing full 0px
should split it: (a) the soft-gradient-tone pixels need a genuinely new
sub-pixel/anti-aliasing hypothesis (half-texel is now ruled out), and (b)
the Onix-boundary pixels need a look at the priority-split occlusion
check's own pixel-exact boundary condition (`beforeMonSprite`/
`GetBattlerSpriteBGPriority` wiring in `battleScene.ts`/`featherDance.ts`),
a completely different code path than the affine sampler. Only a handful of
pixels were inspected under this session's time cap - a future session
should dump a larger sample (20-30 pixels across several ticks) and bucket
by these two signatures before picking either thread up, to get a real
proportion estimate rather than this session's anecdotal 2-vs-2 split.

### Committed artifacts

- `tools/probe/render-feather-halftexel-candidates.ts` - the 9-variant +
  2-conditional half-texel render+diff script. Rerunnable: `npx tsx
  tools/probe/render-feather-halftexel-candidates.ts` (needs the oracle
  service up; 1 oracle call). Writes
  `tools/probe/out/feather-halftexel-render-results.json` (gitignored).
  Exports `patchFullLayer`/`uniformPolicy`/`OffsetPolicy` for reuse (see
  the forensics script below).
- `tools/probe/forensics-feather-residual.ts` - dumps N mismatched pixels
  from candidate A's own real (gated) residual with covering-feather
  matrix/position state. Rerunnable: `npx tsx
  tools/probe/forensics-feather-residual.ts`.

## Proposed `ISSUES.md #30` update (this session, not applied - supervisor's call)

Append to the existing entry: the half-texel sampling-center lead (the
brief's second queued lead) is now **ELIMINATED** - 9 uniform grid points
(±0.5 texel × ±0.5 texel in the affine inverse transform's pre-shift
accumulator) plus 2 non-uniform refinements (hFlip-conditional, OAM
double-size-box-origin convention) were all tested against the same
turn-6 129-tick window candidate A already uses; every nonzero variant is
80-140x WORSE than the existing floor-only convention, and none reaches
0px on any tick. The existing `drawSpriteSheetAffineRotate` sampling
convention is confirmed correct; the ~228-230px residual is not a sampling-
center bug. Forensics on 4 sampled residual pixels found TWO distinct
signatures instead of one: (a) small soft-gradient white/blue deltas
matching §29's original characterization, mechanism still unidentified
(candidates for a future session: coverage-based anti-aliasing, or a
data-dependent floor-tie rule - NOT a constant spatial offset, which this
session's grid rules out); (b) a separate, larger-delta signature landing
on Onix's own gray body color (not in the feather palette at all) exactly
at the priority-split occlusion boundary with Onix's sprite - a completely
different code path (`beforeMonSprite`/priority-split wiring) that neither
the draw-order fix nor any sampling change could touch. **All 3 of the
brief's queued leads for ISSUES #30 (sSpriteOrder persistence, half-texel
sampling, and now this forensics split) are now closed out**; the
remaining open work is two independently-diagnosable, differently-located
small residual classes, not one more lead to chase - a future session
should treat them as two separate tickets/threads rather than one.
