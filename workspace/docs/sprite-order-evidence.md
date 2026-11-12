# `sSpriteOrder` at live move activation — can production know it?

Evidence only (Scene ON, direct mGBA, no production code touched). Question: can the
presentation host supply the battle's live `sSpriteOrder` when a live move activates, for the ~30
accepted-but-not-live adapters that take `spriteOrderSeed` / `spriteOrder` / `orderSeed`?

Receipt: `tools/integration/fixtures/sprite-order-evidence.json` (pins, summary, 251 samples each with both
raw sha256, seed comparison). Raw rows: `tools/integration/fixtures/sprite-order-raw/<move>-<scenario>-{0,1}.json`.

## Source reading (`reference/pokeemerald/src/sprite.c`)

- `sSpriteOrder` is `EWRAM_DATA static u8 sSpriteOrder[64]` (:282; ELF `0x020217f4`). It is set to the
  identity permutation only in `ResetAllSprites` (:855), reached from `ResetSpriteData` (:294). Nothing else
  resets it: `CreateSprite`/`DestroySprite` (`ResetSprite`, a copy of the dummy sprite) never touch it.
- `BuildOamBuffer` (:325) per frame: `UpdateOamCoords` (:339, `oam.y/x` only for `inUse && !invisible`
  sprites; invisible/free sprites keep stale `oam.y`), `BuildSpritePriorities` (:361,
  `subpriority | oam.priority << 8` for ALL 64 slots, in-use or not), `SortSprites` (:372), then
  `AddSpritesToOamBuffer` (:486, walks `sSpriteOrder[0..63]`; index 0 = first OAM entry = drawn in front).
- `SortSprites` keys, in order: (1) packed priority `(oam.priority<<8)|subpriority`, ascending; (2) `oam.y`
  with `y>=160 → y-256` (plus a second wrap for double-affine size-3 square/vertical sprites with `y>128`),
  DESCENDING (`sprite1Y < sprite2Y` swaps); (3) nothing: equal keys keep the previous array order.
  It is one persistent insertion-sort pass over the *previous frame's array*, so equal-key ties inherit
  history (the array is never rebuilt from slot numbers).
- Why ties depend on history: a freed slot becomes the dummy sprite (priority 3, subpriority 255, `oam.y`
  160 → -96, verified in 251/251 samples as the only free-slot key). All free slots therefore tie forever and
  keep whatever relative order they had when they were last in use / last reordered. The `lowest-free-slot`
  allocator then hands the move exactly those tied slots, so the effect slots' mutual order at activation is
  residual history. Ties among *live* sprites with identical `(priority, subpriority, y)` are the same story.

## Method

`tools/compare/spriteOrderProbe.py <move> <scenario> <out>` (activation/cleanup detection copied from
`allocatorNetZeroProbe.py`, which parses argv at import so it cannot be imported): per frame from trace
frame 0 reads the 64-byte order and every slot's `inUse/invisible/oam.y/priority/affineMode/size/shape/subpriority`;
stores order+keys at activation-1, activation, cleanup, the effect slots (created in [activation, cleanup]),
every order change in the window, and a self-check `order[f] == one SortSprites pass(order[f-1], keys[f])`.
`tools/integration/spriteOrderBatch.py` runs every (move, scenario) twice in fresh processes, 4 at a time
(jobs: all 235 audited net-zero manifest scenarios plus the "needs order" scenarios of 19 moves).
`tools/integration/spriteOrderAnalyze.py` (pure python) builds the receipt.

    V=../../vendor; export PYTHONPATH=$V/libmgba-py; PY=$V/mgba-venv/bin/python
    $PY tools/integration/spriteOrderBatch.py --shard 0/2; $PY tools/integration/spriteOrderBatch.py --shard 1/2
    python3 tools/integration/spriteOrderAnalyze.py        # rewrites sprite-order-evidence.json

## Results (251 bodies, 243 scenario jobs, 110 distinct moves, both orientations, many species)

- Both fresh runs byte-identical: 251/251 (243/243 files). 235 first bodies, 16 later bodies (Pin Missile,
  Spike Cannon, Fury Swipes, Synthesis, Shadow Ball, Mirror Coat, Dive, Grudge, ...).
- Semantics check: one source SortSprites pass over the previous frame's order reproduces the observed order
  at 36640 of 36903 sampled window frames, and at 100% of activation-1 frames. The 263 misses (81 bodies) are all
  inside/after the move window, never at activation-1 (sprites created/freed after that frame's sort).
- All baselines have the same occupied set `[0,1,2,6,8,60,61,62,63]`; in 251/251 the effect slots are free at
  activation-1, every free slot sorts behind every occupied slot, and the occupied slots' relative order equals a
  fresh sort of their keys (251/251).
- **The order of the free tail is not constant**: 14 distinct full 64-orders, 33 distinct (effect-slot-set,
  relative order) patterns. Dominant clusters (first bodies, tail head): `4,3,21,20,5,19…` ×113,
  `3,4,21,20,5,19…` ×107, `3,9,7,5,4,21…` ×9, `3,4,5,21,20…` ×5, `3,10,9,7,5,4,…` ×3, `7,5,3,4,9,…` ×3, and 8 singletons.
  The `4,3` vs `3,4` split follows *when* the move runs (first action, activation ≈ 65-85 → `4,3`;
  later actions ≈ 195+ → `3,4`; both orientations, all species), i.e. history, not species/side.

| model (tested on all 251 activation-1 states) | hits | misses |
|---|---|---|
| M_asc: effect slots in ascending slot order | 126 | 125 |
| M_fresh: identity array stable-sorted by current keys (no history), full 64-order | 0 | 251 |
| M_fresh restricted to occupied slots (battler/healthbox/shadow vs each other) | 251 | 0 |
| M_fresh restricted to effect slots | 126 | 125 |
| M_const: most common pattern per effect-slot set (in-sample, optimistic; 229 bodies with effect slots) | 155 | 74 |

Accepted-fixture seeds vs observed (10 fixtures): flamethrower ×2, blaze kick ×2 (restricted to their slot lists),
rock throw ×2 and sand attack ×2 (64-entry) equal the observed order at activation-1: 8/10. Mud Slap ×2 (64-entry)
differ only in the 3/4 swap at activation-1 (`4,3` vs seed `3,4`) and equal the observed order at act+8
(frames 89 / 85), the frame before the first mud sprite is created (the order jumps 20 positions on the next
frame). So all 10 accepted seeds are real observed orders, but "immediately before the first allocation" is
not always activation-1: it must be sampled at the first-allocation frame. Not reproducible from the repo:
Sunny Day and Magnitude configs carry `spriteOrder` only inside dense probe rows (not compared; observed orders for
their scenarios are in the receipt: both orientations, SUNNY_DAY 241, MAGNITUDE 222 ×4).

## Verdicts

**(a) Invariant? Partly.** Invariant across all 251 samples: effect slots are free (dummy key) so they sort
behind every battler/healthbox/shadow slot; occupied-slot relative order is a pure function of their keys.
NOT invariant: the relative order of the effect slots among themselves (33 patterns, 14 full orders), and thus any
tie between equal-key effect sprites. A constant seed per move/orientation/species is wrong (same move, same
scenario shape, `4,3` vs `3,4` depending on how many actions preceded).

**(b) Deterministic from known quantities? No, not from the activation-time state alone.** The tie residue is a
function of the whole key history of the free slots (the order each slot held when it was freed, after every
frame's sort since `ResetAllSprites`). Models that use only known-entry occupants + keys (M_fresh, M_asc, M_const)
fail 251/251, 125/251, 74/229. Precise ties that break them: free slots all carry the identical dummy key
(3,255,y=160), so e.g. slots 3/4 (4,3 vs 3,4), the 9..21 descending stale run (`21,20,5,19…9`) and 5/7/9/10 order
cannot be derived from the baseline occupancy. The only exact model is the full persistent simulation (below).

**(c) Minimal provider.** Exactly reproduce SortSprites: keep `order[64]`, initialised to identity at the
host's ResetSpriteData-equivalent (battle entry), and run one stable insertion-sort pass over it every presented
frame with the keys (`oam.priority`, `subpriority`, wrapped `oam.y` incl. the double-affine rule, dummy key for free
slots) of ALL sprites that exist, including transient ones (send-out balls, healthbox slide/hit effects, shadows,
previous move bodies, status/stat animations). Inputs: per-slot `{inUse, invisible, priority, subpriority, oam.y
(= y + y2 + centerToCornerVecY + coordOffset)}` from the same allocator ledger `liveMoveSpriteAllocator.ts`
tracks. Update rule: sort after every frame's callbacks, before the next `CreateSprite`. Invalidate (order
unknown → refuse the live adapter or fall back to canonical capture) on any event that creates/destroys/moves a
sprite whose key the host does not model — exactly the events that already invalidate allocator history —
and never reseed from a constant. Seed the adapter at the move's first-allocation frame, not activation-1
(Mud Slap shows the two differ). The alternative is a captured table keyed by deterministic scenario epoch, which
is not a production provider.

## What each verdict unlocks (of the ~30 order-dependent moves)

- (a) alone: nothing that needs effect-vs-effect ties. Moves whose reducers only compare effect sprites with
  *battler/healthbox/shadow* slots can rely on the invariant part (effect slots behind occupied ones before
  creation; ordering after creation by real keys); I did not audit per-move which adapters are in that class.
- (b): nothing: no small model reproduces the observed orders.
- (c): all of FLAMETHROWER, BLAZE_KICK, DIVE, GRUDGE, AURORA_BEAM, HYPER_BEAM, TRI_ATTACK, WATER_SPOUT,
  ROCK_THROW, MUD_SLAP, SAND_ATTACK, MEGA_DRAIN, DREAM_EATER, GIGA_DRAIN, SUNNY_DAY, UPROAR, MAGNITUDE,
  PURSUIT, RAPID_SPIN become implementable once the full tracker exists and is exact; each still needs its own
  fixture check against the observed order recorded in the receipt (scenarios probed for all 19 above).

## Caveats

- Scenario-shaped BattleLab entries only (Scene ON); one baseline occupancy set; histories are short (first or
  second action). Longer battles have more past sprites and more tie breaks, not fewer.
- Effect slots = every slot created in [activation, cleanup], which includes some non-move sprites; 22 bodies have none.
- Seed comparison used the `-0` raw run; `windowFramesMatching` lists matching frames. Sunny Day/Magnitude configs
  were not compared to a stored seed.
- No per-move audit of which of the ~30 moves truly tie in-engine (equal priority/subpriority/y).
