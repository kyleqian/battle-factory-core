# Post-KO consumer audit: which order/allocator-gated adapters may render after a knock-out (S10A rung 2; ROM evidence + design)

Evidence and design only; **no production code changed** (new files only). Direct in-process mGBA, Scene ON, never the shared HTTP oracles.
Geometry studied: **opponent lead KO'd → next-mon summary → send-out → first bodies after it** (both orientations), the geometry of
`docs/sprite-order-uncovered-units.md` §1.2/§1.3. Player-faint / forced-switch / party-menu geometries are out of scope (see §5).

## 0. Results first

* **Consumer table** (§1): 37 consumers in `src/engine/liveMoveAnimation.ts` (31 order-/allocator-gated, 6 ungated with entry constants);
  16.7 % of all Level-50 Factory move uses (per side, `spriteOrderPlanCoverageRank.py` weights).
* **ROM**: 8 BattleLab `overrides.parties` scenarios, every one run twice fresh, byte-identical state (sha1 below). At **all 37 known
  activation edges** (8 entry + 29 post-KO) the model — production tracker + `UNIT_PLANS` faint / summary / nextSendOut, driven by the
  scenario's semantic event list, never by masks — matches the ROM `F`, occupancy and battler slots, and the §1.3 constants (matrix bitmap
  `0x3`, battler matrices player 1 / opponent 0, **empty task table**): **0 mismatches**; the constants also hold at the 8 post-KO
  edges where the strict tracker is unknown for plan-coverage reasons (37/37 post-KO edges). Post-KO occupancy is `{0,1,2,5,6,60..63}` (new
  opponent battler slot 5), the occupant sort prefix is `[62,60,0,63,1,61,6,5,2]` = the known-entry prefix with 8→5, at all 44 post-KO activations.
* **What-if** (§3): 13 (move, side) representatives over the full accepted dense window, two fresh ROM runs each:
  **7 GENERALIZES** (current code + raw post-unit lend, or ungated code as it runs today: Flamethrower P, Double Team P, Swift P/O,
  Fire Blast P, Rock Tomb P, Rock Slide O), **6 NEEDS-PARAM** (Thunderbolt O, Giga Drain O, Sunny Day P, Dragon Dance P self-decline on
  the raw post-KO `F`; all exact with the **entry-label lend π(F)**; Light Screen P, Protect P exact with entry-label allocator input),
  **0 NEEDS-NEW**. Every representative is exact (0 residual) under π(F) / today's ungated code.
* **Proposal** (§4): generalise `spriteOrderTrackerLend` from "occupancy == entry set" to "occupancy **role-isomorphic** to the entry
  (fixed occupants {0,1,2,60..63} + exactly the two tracked battler slots), no prompt pair" and lend **π(F)** = `F` relabelled to
  entry slot labels by free-slot rank (post-KO 3,4,7,8,9,10.. → 3,4,5,7,9,10..; battler 5 → 8). No consumer code changes; every
  probed consumer is exact; unprobed members are class-inferred (§3.2). The allocator host gets the same relabelled view.
* **Today (no production change)**: the 6 ungated consumers already render after a KO with entry constants. Measured: Flamethrower,
  Rock Tomb (target slot 8 vs ROM 5), Rock Slide (prefix → literal fallback) are exact post-KO; Safeguard, Sweet Scent, Shadow Punch
  are class-inferred (labels only, seed-independent per prep6/prep7).

## 1. Consumer table (`tools/integration/fixtures/postko/consumer-table.json`, `postkoConsumerTable.py`)

Classes: (i) slots from the free set (lowest-free slices / allocator host), (ii) hard-coded sprite slots, (iii) battler slots / known-entry
occupied prefix, (iv) affine matrix ids / task slots, (v) other gate-only. "Raw post-KO lend" = what the CURRENT code does if handed the
tracker's raw post-KO `F` (mechanical, from the code paths): **self-declines** = `spriteOrderWithOccupiedPrefix` (prefix has 8, `F` has 8
→ duplicate → null) or `spriteOrderForSlots` with slot 5 (occupied post-KO) → null; **entry constants** = renders with entry constants
that differ from the post-KO ROM values. Share = % of all Level-50 move uses, per side.

| id | move | line | gate | classes | entry constants / derivation | raw post-KO lend | share % |
|---|---|---|---|---|---|---|---|
| 113 | LIGHT_SCREEN | `liveMoveAnimation.ts:806` | allocator | i | wall + sparkles first-free on the allocator host (entry 3; 4,5,7 → post-KO 4,7,8) | host invalidated by faint/summary/send-out (`factoryRoundBattleOrchestrator.ts:2192`) | 0.814 |
| 112 115 182 243 277 | BARRIER REFLECT PROTECT MIRROR_COAT MAGIC_COAT | `:816` | allocator | i | same host recipe | same | 0.191 0.322 1.153 0.557 0.108 |
| 215 | HEAL_BELL | `:1188` | order | ii | `HEAL_BELL_REUSED_ORDER_SLOTS` [4,5,7,9,10,11] | self-declines (5) | 0.142 |
| 348 | LEAF_BLADE | `:1198` | order | ii | `LEAF_BLADE_OAM_ORDER_SLOTS` | (renders; unmeasured) | 0.149 |
| 299 | BLAZE_KICK | `:1212` | order | i | `sorted(F)[:10]` | derives from F | 0.037 |
| 88 | ROCK_THROW | `:1228` | order | iii | `KNOWN_ENTRY_OCCUPIED` prefix + F | self-declines (prefix) | 0.074 |
| 195 | PERISH_SONG | `:1240` | order | ii | fixed note windows over F | declines if a window slot is occupied | 0.146 |
| 53 | FLAMETHROWER | `:1251` | **none** | i | `sorted(F)[:8]` or literal 3,4,5,7,9..12 (labels) | derives from F | 0.951 |
| 288 | GRUDGE | `:1273` | order | i | `sorted(F)[:6]` | derives from F | 0.111 |
| 317 | ROCK_TOMB | `:1307` | **none** | iii | `targetSpriteSlot` 8/6 (ROM post-KO 5) | entry constants | 0.728 |
| 219 | SAFEGUARD | `:1318` | **none** | ii | ring slots [3,4,5] (post-KO 3,4,7) | entry constants | 0.287 |
| 230 | SWEET_SCENT | `:1324` | **none** | ii | 24 petal slots 3,4,5,7,9.. (post-KO 3,4,7,8,9..) | entry constants | 0.185 |
| 157 | ROCK_SLIDE (opp) | `:1407` | **none** | iii | prefix + F, else the accepted literal | prefix null → literal | 2.117 |
| 126 | FIRE_BLAST | `:1419` | order | iii | `targetSpriteSlot` 8/6 | entry constants | 0.592 |
| 349 | DRAGON_DANCE | `:1430` | order | ii | `allocationSlots` [3,4,5,7,9,10] (post-KO 3,4,7,8,9,10) | self-declines (5) | 0.400 |
| 129 | SWIFT | `:1445` | order | ii iii iv | stars [3,4,5,7,9] (post-KO 3,4,7,8,9), battler 6/8, ShakeMon task 0 | entry constants | 0.258 |
| 271 | TRICK | `:1445` | order | ii iii iv | bags [3,4], battler 6/8, task slots | entry constants | 0.176 |
| 218 69 32 62 253 85 254 192 | FRUSTRATION SEISMIC_TOSS HORN_DRILL AURORA_BEAM UPROAR THUNDERBOLT STOCKPILE ZAP_CANNON | `:1469` | order | ii iii iv | slot lists + matrix ids [0,3,4,..] (post-KO first effect matrix 2), Uproar `attackerMatrixSlot` 1/2 (post-KO opp 0), prefix | self-declines (prefix) | 0.343 0.248 0.257 0.102 0.034 1.618 0.068 0.037 |
| 241 202 72 71 138 | SUNNY_DAY GIGA_DRAIN MEGA_DRAIN ABSORB DREAM_EATER | `:1584` | order | ii iii | prep9 slot constants, prefix | self-declines (prefix) | 0.843 1.375 0.153 0.040 0.217 |
| 104 | DOUBLE_TEAM (player) | `:1634` | order | ii | clone pair [3,4] order from F | renders (3,4 still lowest free) | 1.720 |
| 297 | FEATHER_DANCE | `:1646` | order | v | gate only | renders | 0.074 |
| 325 | SHADOW_PUNCH | `:991` | **none** | iii | `attackerSpriteId` 6/8 | entry constants | 0.074 |

Per class (a consumer can be in several): (i) 9 / 4.24 %, (ii) 22 / 8.80 %, (iii) 20 / 9.35 %, (iv) 10 / 3.14 %, (v) 1 / 0.07 %.
Raw post-KO lend outcome: host-derived 6 / 3.15 %, self-declines 16 / 5.95 %, entry constants 7 / 2.30 %, derives from F 4 / 1.25 %,
gate/labels 4 / 4.06 %. Total 37 consumers, 16.70 %. Double Team / Rock Slide / Aerial-Ace-style one-orientation adapters: only the
listed side has a live adapter (Double Team opponent has none; its ROM edge is checked anyway).

## 2. ROM ground truth (8 scenarios, `tools/battle-lab/postko-*.json`)

All scenarios: player NINETALES (Flamethrower slot 1) KOs a SHEDINJA lead on turn 1 (guaranteed, Wonder Guard, 100 % accuracy); the two
benched opponents are identical so the Factory AI's send-out choice cannot change the consumer; messages are advanced by two A presses.
Probe `tools/integration/postkoStateProbe.py` (state + RGB every frame, frame numbering of `tools/probe/run-battle-lab-rgb.py`; the
activation = first `gAnimScriptActive` frame, calibrated equal to the accepted fixtures' `activationFrame` 217 / 391 / 83 / 306 / 68).
Model `tools/integration/postkoModelCheck.ts` (+ `…Run.ts`).

| scenario | post-KO edges (frame: unit) | model vs ROM | A == B sha1 |
|---|---|---|---|
| `postko-flamethrower-doubleteam` | 2079 Flamethrower P, 2494 Double Team O, 2656 stat | 4/4 edges 0 mismatches | `38ffce80…` |
| `postko-rocktomb-thunderbolt` | 2092 Thunderbolt O; later 3238 TB O, 3585 PRZ, 3791 Rock Tomb P, 4040 stat | 2092 exact; later edges unknown (no EXACT plan `85:opponent`) — constants 4/4 true at all | `5d9e5b52…` |
| `postko-doubleteam-swift-gigadrain` | 2089 Giga Drain O; 2616 DT P, 2778, 3247, 3771 Swift P | 2089 exact; later unknown (no EXACT plan `202:opponent`) | `571a9fd9…` |
| `postko-doubleteam-swift` | 2085 DT P, 2247 stat, 2460 Swift O, 3240 Swift P, 3427 Swift O | 6/6 0 | `6c135c46…` |
| `postko-lightscreen-protect-rockslide` | 2085 Light Screen P, 3225 Protect P | 3/3 0 | `7d9dc905…` |
| `postko-rockslide-opponent` | 2079 Flamethrower P, 2499 Rock Slide O | 3/3 0 (first 3 of 10 activations) | `90e59383…` |
| `postko-sunnyday-dragondance-fireblast` | 2082 Sunny Day P, 2383 Swift O, 2633 SUN, 3230 Dragon Dance P, 3375, 3677, 3929, 4542, 4794 | 10/10 0 | `f0f3b744…` |
| `postko-fireblast-player` | 2089 / 3223 / 4357 Fire Blast P, 2495 / 3630 / 4768 Swift O | 7/7 0 | `69efc87f…` |

Edges: 45 (8 entry, 37 post-KO); known 37 (8 entry + 29 post-KO), mismatches 0; the 4 constant checks hold at 37/37 post-KO edges. ROM facts confirmed at every post-KO edge:
occupancy `{0,1,2,5,6,60..63}`, `gBattlerSpriteIds` [6,5], battler matrices [1,0] (when affine), `gOamMatrixAllocBitmap` 0x3,
**task table empty** (the send-out's `Task_HandleMonAnimation` ends ~86 frames after the send-out and before the next prompt appears),
effect allocations = rank remap of the entry slots (Flamethrower 3,4,7,8,9,10,11,12; Rock Tomb 3,4,7,8,9; Swift 3,4,7,8,9; Light Screen
wall 3, sparkles 4,7,8; Dragon Dance 3,4,7,8,9,10; Sunny Day 3,4,7,8). Strict-mode "unknown" edges are body coverage
(`85:opponent`, `202:opponent` have no EXACT plan; production would decline there), not post-KO errors.

## 3. What-if verdicts (`tools/integration/postkoWhatIf.ts`, receipts `fixtures/postko/whatif-*.json`, summary `verdicts.json`)

The existing production adapter path (`liveView` of `liveAdapterFramebuffer.ts`, unchanged; only `effect.spriteOrderInput` replaced) is
rendered for every row of the accepted dense window (activation + the accepted offset of the move's existing fixture; never chosen by
matching) and compared with both fresh ROM runs (RGB sha256 receipts checked against the committed state fixture). Lends: `rung2` = the
model's raw post-unit `F`; `relabel` = π(F); `none` = today's behaviour after a KO. Light Screen / Protect get `liveView`'s known-entry
allocator input = the entry-label view.

| move | side | edge | window rows | rung2 (raw F) | relabel π(F) | none / today | verdict |
|---|---|---|---|---|---|---|---|
| FLAMETHROWER | P | S1 2079 | 126 (act+4, ageOffset −11) | 126/126 | – | 126/126 | **GENERALIZES** |
| ROCK_TOMB | P | S2 3791 | 174 | – | – | 174/174 | **GENERALIZES** (ungated; slot 8 is a label) |
| THUNDERBOLT | O | S2 2092 | 237 | 12/237 (declines) | **237/237** | declines | **NEEDS-PARAM** π |
| GIGA_DRAIN | O | S3 2089 | 230 | 0/230 (declines) | **230/230** | declines | **NEEDS-PARAM** π |
| DOUBLE_TEAM | P | S4 2085 | 230 (act+1) | 230/230 | 230/230 | declines | **GENERALIZES** |
| SWIFT | P | S4 3240 | 78 | 78/78 | 78/78 | declines | **GENERALIZES** (stars/battler/task constants are labels) |
| SWIFT | O | S4 2460 | 80 | 80/80 | 80/80 | declines | **GENERALIZES** |
| LIGHT_SCREEN | P | S5 2085 | 88 | – | 88/88 (entry-label host) | host invalid | **NEEDS-PARAM** (host view) |
| PROTECT | P | S5 3225 | 123 (calibrated 123/123 ×2 at entry) | – | 123/123 (entry-label host) | host invalid | **NEEDS-PARAM** (host view) |
| ROCK_SLIDE | O | S6 2499 | 138 | (= none) | 138/138 | 138/138 | **GENERALIZES** (literal fallback) |
| SUNNY_DAY | P | S7 2082 | 158 | 48/158 (declines) | **158/158** | declines | **NEEDS-PARAM** π |
| DRAGON_DANCE | P | S7 3230 | 142 | 53/142 (declines) | **142/142** | declines | **NEEDS-PARAM** π |
| FIRE_BLAST | P | S8 2089 | 197 | 197/197 | 197/197 | declines | **GENERALIZES** (target slot 8 is a label) |

The rung2 rows that decline (Thunderbolt 12/237, Giga Drain 0/230, Sunny Day 48/158, Dragon Dance 53/142) double as negative controls:
the harness does see a missing body.

### 3.1 NEEDS-PARAM: the one parameter

π is derived from the post-unit view alone: sort the free set ascending (post-KO `3,4,7,8,9,…`) and map rank-for-rank onto the
known-entry free set (`3,4,5,7,9,…`); map the tracked battler slots onto 6 (player) / 8 (opponent); fixed occupants 0,1,2,60..63 map
to themselves. Lend `F.map(π)`. Matrices need no input (no adapter reads a live matrix number; the adapters' matrix constants become
correct labels under the same rank argument: post-KO free matrices `2,3,4,…` ↔ entry `0,3,4,…`, battler matrices opp 0 ↔ 2).
For the allocator host: give `prepareLiveMoveSpriteAllocator` a host whose occupancy is the relabelled view (the known-entry
`firstMove` host is exactly that), or relabel its slot outputs.

### 3.2 Class inference (source-cited; marked "class-inferred" in `verdicts.json`)

π is an isomorphism of everything the adapters model: `CreateSprite` takes the lowest free index (`sprite.c:502-511`),
`CreateSpriteAtEnd` the highest (`:513`), `AllocOamMatrix` the first clear bit (`:1427`), `CreateTask` the first inactive slot
(`task.c:27`); `SortSprites` (`sprite.c:372-…`) compares only priority / subpriority / y keys and breaks ties by the current
`sSpriteOrder` position, never by slot number. A rank-preserving relabel of the free set + the battler role map therefore maps every
post-KO allocation and sort decision onto the entry one, provided (a) the occupant set is role-isomorphic (checked), (b) the occupant
prefix relabels to the entry prefix (observed at all 44 post-KO activations of the 8 scenarios), (c) the task table is empty (observed at all edges). On that
basis: Heal Bell, Rock Throw, Frustration, Seismic Toss, Horn Drill, Aurora Beam, Uproar, Stockpile, Zap Cannon, Mega Drain, Absorb,
Dream Eater → class-inferred NEEDS-PARAM π; Leaf Blade, Perish Song, Grudge, Blaze Kick, Trick, Feather Dance → class-inferred exact
under π; Barrier, Reflect, Mirror Coat, Magic Coat → class-inferred NEEDS-PARAM (host view); Safeguard, Sweet Scent, Shadow Punch →
class-inferred GENERALIZES (ungated, slot constants are labels, seed-independent per prep6/prep7, like the measured Rock Tomb).

## 4. Rung-2 proposal

1. **Lend gate** (`spriteOrderEventTransform.ts` `spriteOrderTrackerLend`): keep "known, no prompt pair"; replace the
   `occupied == KNOWN_ENTRY_OCCUPIED` test by: tracker battler slots known (from the nextSendOut survivor, as `UNIT_PLANS` does) and
   `occupied == sort([0,1,2,60,61,62,63, battler.player, battler.opponent])`; return `F.map(π)` (π as §3.1). At the entry π is the
   identity, so all first-body behaviour and receipts are unchanged. Any other occupancy (player-faint reshow `{0,1,2,3,5,60..63}`,
   mid-summary, prompt pair alive) → null, as today. Reference implementation: `entryLabelLend` in `tools/integration/postkoWhatIf.ts`.
2. **Consumers**: no change needed for any of the 37; the prefix/forSlots consumers stop self-declining because the lend is expressed in
   entry labels. Do **not** hand them the raw `F` (Thunderbolt / Giga Drain / Sunny Day / Dragon Dance decline on it; worse, a future
   consumer that does not self-check would render entry slots against a non-entry free set).
3. **Allocator host** (`liveSpriteAllocator` / `prepareLiveMoveSpriteAllocator`): after a modelled send-out, re-seed a known host from the
   relabelled view (= `createKnownEntrySpriteAllocatorProvider(...).firstMove`) instead of staying invalid; Light Screen and Protect are
   exact that way.
4. **Matrix / task view**: no field needed by any current adapter; if one is added later, lend `{matrixBitmap: 0x3 → relabelled 0x6,
   tasks: []}` only when the task table is empty (always true at a post-send-out body edge here).

Tests to add (all from this step's fixtures, hermetic): `entryLabelLend` unit tests (identity at the entry; post-KO free `[3,4,21,20,7,…]`
→ `[3,4,21,20,5,…]` exactly as in `whatif-*-relabel.json` `lendFree`; null for `{0,1,2,3,5,60..63}`); a tracker test feeding
`TURN1` of `postkoModelCheck.ts` and asserting the lend equals the relabelled `F` of `model-check-*.json`; the 13 drafted dense
fixtures below run through `verifyLiveAdapterFramebuffer` once the production lend exists (they need the history replay, so either a
`precedingUnits` field in the dense harness or the state fixtures' `rung2Lend`).

Draft dense fixtures (**drafts**, `schema postko-adapter-draft/v1`, `draft: true`): `tools/integration/fixtures/postko-{flamethrower-player,
rock-tomb-player, thunderbolt-opponent, giga-drain-opponent, double-team-player, swift-player, swift-opponent, light-screen-player,
protect-player, rock-slide-opponent, sunny-day-player, dragon-dance-player, fire-blast-player}.json` (scenario, species, field HP from
`gBattleMons`, activation edge, window = activation + accepted offset, links to the state + model-check fixtures).

## 5. Open questions / caveats

1. Only the opponent-KO geometry. Player faint → party menu reset → reshow → forced switch-in gives `{0,1,2,3,5,60..63}` (opponent
   battler 0, shadow 3, player 5): not role-isomorphic to the entry under the fixed-occupant map; π would need a role map that moves the
   healthboxes/shadow too. Unprobed; the proposed gate declines there.
2. A second KO (opponent #2 fainting, send-out #3 reusing slot 5) is predicted identical by `UNIT_PLANS` (doc §1.2) but not probed here.
3. 26 consumers are class-inferred, not measured; highest-weight unmeasured: Barrier/Reflect/Mirror Coat (allocator, 1.07 % together),
   Frustration 0.34, Safeguard 0.29, Horn Drill 0.26, Seismic Toss 0.25.
4. Bodies without an EXACT plan (`85:opponent`, `202:opponent`) still end the tracker; that is plan coverage, unrelated to post-KO.
5. Probe bug noticed in existing tooling: `spriteOrderUncoveredLabProbe.py` (and its siblings) mask bit 0 of every `nm` address, so
   `gAnimScriptActive` (bool8 at the odd address 0x020383fd) is read from `sAnimFramesToWait` (0x020383fc); their activation flags also
   use the script-pointer jump, so it may be harmless there, but the `act` column is mislabelled. `postkoStateProbe.py` keeps bit 0 for
   data symbols.

## 6. Reproduce

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py
for n in flamethrower-doubleteam rocktomb-thunderbolt doubleteam-swift-gigadrain doubleteam-swift lightscreen-protect-rockslide rockslide-opponent sunnyday-dragondance-fireblast fireblast-player; do
  for r in a b; do python3 tools/run-mgba-probe.py /tmp/pk-$n-$r.json -- $V/mgba-venv/bin/python tools/integration/postkoStateProbe.py tools/battle-lab/postko-$n.json /tmp/pk-$n-$r.json /tmp/pk-$n-$r-rgb; done
  cmp /tmp/pk-$n-a.json /tmp/pk-$n-b.json   # ~5-10 s per run; RGB dirs ~0.5 GB each in /tmp
  npx vite-node tools/integration/postkoModelCheckRun.ts -- postko-$n tools/integration/fixtures/postko/state-postko-$n.json
done
npx vite-node tools/integration/postkoWhatIf.ts -- tools/integration/fixtures/postko-thunderbolt-opponent.json /tmp/pk-rocktomb-thunderbolt-a-rgb /tmp/pk-rocktomb-thunderbolt-b-rgb --lend relabel
python3 tools/integration/postkoConsumerTable.py     # table (pure python)
python3 tools/integration/postkoVerdicts.py          # verdict merge
```
(The committed state fixtures keep the full state rows and the RGB sha256 of the frames around each activation; the what-if checks the
fresh RGB against them.)
