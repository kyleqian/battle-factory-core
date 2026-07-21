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
