# Free-slot `sSpriteOrder` provider — event model and production design

Design + evidence only (no production code touched). Answers the question left open by
`docs/sprite-order-evidence.md`: is there a much smaller exact model of the free-slot tie order that a move's
newly created effect sprites inherit?

**Verdict: yes — exact on every sampled frame.** The free-slot order `F` changes only at sprite create/destroy
events; the only extra information needed is the *array order among sprites destroyed in the same frame*, which
equals their live-key sort order (history-dependent only for equal keys).

Receipt `tools/integration/fixtures/sprite-order-event-model.json`; model `tools/integration/spriteOrderEventModel.py`;
probe `tools/compare/spriteOrderEventProbe.py`; batch `tools/integration/spriteOrderEventBatch.py`;
raw `tools/integration/fixtures/sprite-order-event-raw/` (22 scenarios × 2 fresh runs, + `calls/` ABI call streams).

## 1. Source rule (`reference/pokeemerald/src/sprite.c`)

- `SortSprites` (:372-460): `for i in 1..63` insertion-sorts the *whole* `sSpriteOrder[64]` array in place — one call
  is a complete stable sort of the previous array by `(sSpritePriorities, wrapped oam.y desc)`. The `while`
  moves element `i` left only while the left neighbour is **strictly** greater (`>` priority, or `==` priority and
  `y1 < y2`). Equal keys never swap, so a stable full sort per frame; no "one step per frame" behaviour exists.
  `BuildSpritePriorities` (:361) computes the priority for all 64 slots, free or not, every frame.
- `BuildOamBuffer` (:325) = `UpdateOamCoords`, `BuildSpritePriorities`, `SortSprites`; it runs inside
  `BattleMainCB2` (battle_main.c:1863) as `AnimateSprites(); BuildOamBuffer(); …; RunTasks();` — sprites
  created/destroyed by **tasks** are first sorted in the *next* frame; by **sprite callbacks** (inside `AnimateSprites`)
  in the same frame.
- `DestroySprite` (:618) → `ResetSprite` (:682) = `*sprite = sDummySprite` (priority 3, subpriority 255, `oam.y`
  160 → −96): the **maximum** possible key (no occupied sprite key ≥ dummy was ever sampled).
  `CreateSprite` (:502) takes the lowest free index, `CreateSpriteAtEnd` (:513) the highest; `CreateSpriteAt` (:540)
  `ResetSprite`s the slot then fills it. Neither touches `sSpriteOrder`. Only `ResetAllSprites` (:848) writes it
  (identity), via `ResetSpriteData` (:294).

Consequences (all free slots share the maximal key, so they are always the tail block after a sort):

1. A destroyed slot gets the max key; at the next sort strictly-smaller keys to its right move left past it and it
   stops **directly in front of the existing equal-key free block** — i.e. at the **head of `F`**. Several slots
   destroyed before one sort keep their previous *array* order among themselves (equal keys), ahead of the old `F`.
2. A created slot leaves the tail block: it is removed from `F`; `F` of the rest is untouched (stable sort).
3. Create+destroy of the same slot between two sorts is a no-op for `F`; destroy+recreate of one slot leaves it occupied.
4. So `F` is a pure function of: identity at reset, the ordered create/destroy events, and for same-sort-window
   multi-destroys the array order of the destroyed group.

## 2. Model `M_event`

    reset (ResetAllSprites)        F = [0..63]
    per sort window, created C, destroyed D (net over the window):
        F = order(D) ++ [s in F if s not in C]
    order(D) = D sorted by the previous array position   # == live key order; equal keys keep history

Variants evaluated per frame (observed free order = `sSpriteOrder` filtered to free slots after the frame):

| variant (order among same-frame destroyed slots) | hits | misses |
|---|---|---|
| `array` (previous array order — exact) | **40185** | **0** |
| `asc` (ascending slot, no keys) | 40117 | 68 |
| `desc` | 40088 | 97 |

Corpus: 22 scenarios (both orientations; Flamethrower, Blaze Kick, Rock Throw, Sand Attack, Mud Slap, Dive, Grudge
×2 orientations each, plus Karate Chop, Night Shade ×2, Screech, Recover, Smokescreen, Confuse Ray, Barrier), every
frame from the battle-entry `ResetSpriteData` to end of trace (≈1.3-2.8k frames each, first and later bodies;
56 move-activation edges incl. second/third actions and the later Dive/Grudge/Mud Slap/Sand Attack bodies).
Both fresh runs byte-identical 22/22. Per-activation observed free order = model in **56/56** (`activations`).
`calls/` holds exact `CreateSprite`/`DestroySprite` ABI call streams (lightScreenAllocatorCallProbe, 4 scenarios × 2
fresh runs, identical); replaying their in-frame call order reproduces the observed occupied mask 13/13 frames
each; they contain 4 net-zero slot touches per scenario (create+destroy or reuse in one frame) that the model treats
as no-ops, matching the data.
Broader sweep (single fresh run each, raw not committed): the other **221** audited manifest/needs-order scenarios (110 distinct moves,
both orientations): **373837 / 373837 frames hit, 0 misses** (`extraSingleRunScenarios`).

### What needs live keys (precisely)

The 68 `asc` misses are all same-window multi-destroy groups whose array order is not ascending: the battle-entry
cursor pair `{3,4}` (always `[4,3]`, constant, before the first move), and multi-sprite move bodies destroyed
together at cleanup (Smokescreen, Confuse Ray, Mud Slap, Sand Attack, Grudge, Dive, Blaze Kick/Flamethrower's *prior*
move, …). For those the group order is the **stable key sort** of the destroyed sprites at destroy time:
key = `(priority<<8|subpriority, wrapped oam.y desc)`:
- groups with all-distinct keys: key sort = array order in 40/40 groups;
- groups with ties (88 groups): ties are broken by *creation order* (creation frame, then `F` index at creation) in
  85/88; the 3 exceptions (Mud Slap, Sand Attack, Grudge) are sprites whose `y` crossed (equal only after moving),
  where the tie inherits the order they held before crossing — needs the live sort, not creation order.

So the exact minimal state beyond `F` is the **live-sprite order only** (the occupied prefix of the array, ≤~20
sprites, not 64): a persistent list sorted per frame by live keys; free slots are never simulated. This is exactly
the source `SortSprites` restricted to occupied sprites (valid because free slots are always the tail: no occupied key ≥ dummy).
Note: ~496 frames per corpus have a just-created/just-destroyed (task-phase) sprite not yet sorted — consistent with
the BattleMainCB2 order above and invisible to the model.

### First-action shortcut

For the first legal action after the ordinary singles entry, `F` at first allocation is **one constant** in all 22
scenarios (both orientations/species/moves):
`4,3,21,20,5,19,18,17,16,15,14,13,12,11,10,9,7,54..59,23,22,48..53,24..47`.
It depends only on the known-entry stream. Later actions need the events of the prior bodies.

### Which sampled activations are exact *without* live keys

`activationEdgesExactWithoutLiveKeys` = 39/56 (entry `{3,4}` handled as the constant `[4,3]`, all other same-window
groups ascending, i.e. only single-destroy history plus the entry constant). All first actions are keyless. Accepted
order-needing fixtures:

| move (scenario) | activation | keyless? | what it still needs |
|---|---|---|---|
| Rock Throw ×2 | first body (tf 296, after a Tackle body, move 33) | yes | the prior body's create/destroy events (no non-ascending destroy group) |
| Mud Slap ×2 (pidgeotto) | first action | yes | entry constant; seed at the **first-allocation frame** (act+8, see sprite-order-evidence) — event model gives F at any frame |
| Sand Attack ×2 | first action | yes | entry constant (same act+8 note) |
| Grudge ×2 | first action | yes | entry constant (later body needs live keys) |
| Dive ×2 | first Dive body (tf 196/199, after Tackle) | yes | prior-body events; later Dive body needs live keys |
| Flamethrower, Blaze Kick (opponent-first scenarios) | after the opponent's move 185 | yes | prior-body events (no non-ascending destroy group) |
| Flamethrower, Blaze Kick (player-first scenarios) | second action after move 259 (6-sprite group) | **no** | live keys of the 6 prior sprites at destroy |

## 3. Production provider shape

New pure module `src/engine/spriteOrderProvider.ts` (name suggestion), beside `liveSpriteAllocator.ts`:

    interface SpriteOrderState {
      readonly known: boolean;               // same bit as LiveSpriteAllocatorHost.historyKnown
      readonly free: readonly number[];      // F: free slots in tie order (64 - occupied entries)
      readonly pendingDestroyed: readonly number[]; // destroyed since last sort window, in call order (diagnostic)
    }
    init()                                    -> known, free=[0..63]            // ResetSpriteData-equivalent
    onCreate(state, slot)                     -> free minus slot                // from allocateFirst/EndLiveSprite
    onDestroyGroup(state, slots, arrayOrder)  -> arrayOrder(slots) ++ free      // sorted-window group
    invalidate(state)                         -> known=false                    // same triggers as allocator history
    orderForFirstAllocation(state, n)         -> first n entries of free        // what a move's effect slots inherit

Inputs are the existing allocator host events (`allocateFirstLiveSprite`, `allocateEndLiveSprite`,
`destroyLiveSprite`); a slot's `F` position is independent of the slot index choice, so create needs only the slot.
A destroy group = destroys within one `SortSprites` window; the host must tell sprite-callback destroys
(before this frame's sort) from task destroys (after it) — `callerLr` in the call probe distinguishes them.
Group order needs `arrayOrder`: provided by (a) the known-entry constants (`{3,4}` → `[4,3]`, `48..53`,
`54..59` ascending), (b) a single-slot group (trivial), (c) otherwise a `LiveKeyTracker` (slice 4) or **refusal**
(`known=false` → live adapter declines, falls back to canonical capture — never a guess).

Composition: `liveSpriteAllocator` stays the slot allocator; the order provider is a sibling updated by the same
transitions (wrap `allocate*`/`destroy*` in a single `LiveSpriteHost = {alloc, order}` or pass events to both from
`prepareLiveMoveSpriteAllocator`). `createKnownEntrySpriteAllocatorProvider` seeds `order` by replaying its own entry
stream (`commandPrompt`/`firstMove` get an `orderAt` field = the constant above, validated by the receipt). Invalidation:
exactly where `invalidateLiveSpriteAllocatorHost` fires (unmodelled move, switch, summary, substitute, transform).
A move adapter's `spriteOrderSeed` is then `order.free.slice(0, n)` ∪ (for 64-entry fixtures) the occupied
prefix from the known-entry occupants' keys (sprite-order-evidence: occupied order = fresh sort, 251/251).

## 4. Slice plan (each ≤45 min; all commands from `workspace/`)

1. **Pure `SpriteOrderState` + entry replay (design-only types + tests).** `src/engine/spriteOrderProvider.ts`,
   unit tests: reset, create-removes, destroy-head, same-window group, invalidate. Test-vector from the receipt:
   replay the known-entry host stream and assert `free` equals the constant above (both orientations).
   Accept: `node --experimental-strip-types --test src/engine/spriteOrderProvider.test.ts`, `npm run test:smoke`,
   `python3 tools/integration/spriteOrderEventModel.py` (40185/0).
2. **Wire into the known-entry provider** (`commandPrompt`/`firstMove` carry `order`) and the first-action path:
   expose `orderForFirstAllocation`; assert against `sprite-order-evidence.json` seeds for Mud Slap/Sand Attack/
   Rock Throw/Flamethrower/Blaze Kick/Grudge/Dive first-action fixtures (each fixture's seed at its first-allocation
   frame). Accept: targeted `node --test` of the six adapters' live-allocator tests + `npm run typecheck`.
3. **Prior-body event streams for single-sprite bodies** (Tackle/Pound-class `createsprite` + `destroy`): feed the
   moves already live (their owners/`move` identities) into the order provider; check "keyless" activations 39/56 with
   a test that replays `sprite-order-event-model.json` scenario activations. Accept: new test over the receipt's
   `activations` (needsLiveKeys=false must be exact), `npm test` subset for liveSpriteAllocator.
4. **`LiveKeyTracker`** (only if player-first Flamethrower/Blaze Kick or later bodies of Dive/Grudge/Mud Slap are wanted):
   per-frame stable sort of occupied sprites from adapter-known `(priority, subpriority, y)`; destroy groups consume it.
   Needs the per-sprite key hooks of the adapters (`oam.y` = y + y2 + centerToCornerVecY + coordOffset). Probe first
   (new spriteOrderEventProbe field with per-frame keys for occupied sprites; extend raw) to measure the 3/88 crossed-tie case.
   Accept: tracker reproduces all 17 `needsLiveKeys` activation edges in the receipt.
5. **Adapter unlock, one move per slice** (each: replace the fixed `spriteOrderSeed` with provider output, keep the old
   seed test as a regression): Mud Slap + Sand Attack (seed at first-allocation frame), then Rock Throw, Grudge,
   Dive, then Flamethrower/Blaze Kick opponent-first. Accept per move: the adapter's own live test, its direct-compare
   command, `npm run test:smoke`.

Out of scope here: moves whose activation follows switches/summary/substitute/transform (unknown history), and
scenarios beyond the BattleLab ordinary-singles entry.

## 5. Reproduction

    V=../../vendor; export PYTHONPATH=$V/libmgba-py; PY=$V/mgba-venv/bin/python
    $PY tools/integration/spriteOrderEventBatch.py                      # 22 scenarios x 2 fresh runs (~45 s)
    $PY tools/compare/lightScreenAllocatorCallProbe.py tools/battle-lab/mechanic-<scenario>.json <out.json>   # call streams
    $PY tools/integration/spriteOrderEventExtraBatch.py /tmp/ev-extra   # 221 more scenarios, single run (~6 min)
    python3 tools/integration/spriteOrderEventModel.py --write [--extra DIR]   # rewrites the receipt (pure python)

## 6. Caveats

- Scenario-shaped BattleLab entries only; histories are 1-4 actions. Model is exact per frame on them, not proven for
  arbitrary histories (but follows from the source rule; keys equal to the dummy key never occurred).
- Event stream for the corpus is the per-frame occupied-mask diff (+ previous array order); the ABI call streams
  were cross-checked on 4 scenarios only (entry window, 40 trace frames), not every scenario.
- A same-frame mix of callback-phase and task-phase destroys would split into two sort windows; no such mix was
  present in the corpus (0 misses), so the host must carry the phase before relying on a combined group.
