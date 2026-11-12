# ord124 (S10A side lane, 2026-10-11): the `sprite-order lend unknown` / `later-body` buckets — Odor Sleuth 316 computed, False Swipe 206, Hyper Beam 63

Base: FIXED master `2daafd503` (production src `b4befa039`). Evidence and a banked patch, new files only. Every tree is a git-archive
copy of `2daafd503`; the patched copy also gets `tools/integration/fixtures/ord124/ord124-order-plans.diff`. Direct mGBA only, with the lab
seed pinned in every job. Runner: `sh tools/integration/ord124Run.sh <fresh-out-dir>` (§5).

## Results

| Rung | Result | Receipts (`tools/integration/fixtures/ord124/`) |
|---|---|---|
| **1** attribution (census 0..999, base) | lend unknown **125 / 15,490** = Odor Sleuth `316:player` **106 / 11,832** (84.8 %, all in battle 705) + Hyper Beam `63:player` 12 / 2,229 + Astonish `310:player` 5 / 912 + next-mon summary 2 / 517. later-body **23 / 3,772** = **all Extrasensory 326, player later bodies** (a case-local scanout gate; the lend is known, so no order plan applies). | `ord124-attr-base.json` (byte-identical to the committed final census `final-2131feda7`) |
| **2** prediction -> ROM RAM | Odor Sleuth from source: the clone pair is a **tied-word FDERIVED group that leaves in its lend order** (`Cff;Cf;Cf;D2;D3;D0,1/P<w>,<w>;Cf;D4`). The prediction was committed first. Then it was checked **exact per allocation window on 51 / 51 bodies** (`316:opponent` 22, `316:player` 29; 30 first / 21 later; both lend classes). False Swipe 206 (found in rung 3): **18 / 18** bodies on one plan. Hyper Beam 63: negative (RANDOM2); its recharge turn plays no body. | `ord124-prediction.md`, `ord124-plan-rows.json`, `ord124-units.json`, `ord124-check.json` |
| **3** banked patch | Built with the table generator: rows for 316 + 206, both sides (+4 keys, +3 plans, no base index moved). Windows after the bodies: CHAIN lend == ROM `sSpriteOrder` on **12 / 12** windows (base: 2 / 12, the 10 after-body windows unknown). **10 / 10 after-body windows are live and 0 px on every row**; r1 == r2 on 12 / 12. Census 0..999: **+106 commands / +11,832 frames live**, 0 other status changes, KEY sequence, battleDigest, commandKeyDigest, shard digests and per-command frames all identical. | `ord124-order-plans.diff`, `ord124-fold-test-pins.diff`, `ord124-rung3-*.txt/jsonl`, `ord124-census-pair.json`, `ord124-census-check.json`, `ord124-attr-patched.json` |

Census 0..999 headline (`stg107Census.sh`: 10 `--seeds=a..b --index-from=a` shards, `hist73Merge.py`):

| tree | commands | live | live frames | lend unknown | later-body |
|---|---:|---:|---:|---:|---:|
| base `2daafd503` | 27,426 | 27,139 (98.95 %) | 4,132,330 / 4,160,787 (99.32 %) | 125 / 15,490 | 23 / 3,772 |
| + `ord124-order-plans.diff` | 27,426 | **27,245 (99.34 %)** | **4,144,162 (99.60 %)** | **19 / 3,658** | 23 / 3,772 |

- All 106 lifted commands are in battle 705 (CHANSEY vs WOBBUFFET): Struggle `165:player` 83, Struggle `165:opponent` 18,
  Swallow `254:opponent` 5. Before the patch, every one of them failed with the order host's `no EXACT plan: body 316:player`.
- `land82CensusCheck` (prep43-census-delta) found 0 pairing mismatches and 0 regressions. The only unit that changes is
  `body 316:player` 106 / 11,832, and all of it is live after the patch.

**Why False Swipe is in the patch.** I first measured an intermediate copy with the Odor Sleuth rows only. It lifted **0**: battle 705's
next Metronome call (command 20) is **False Swipe 206**, which had no plan anywhere and invalidated the host again. All 106 commands then
blamed `body 206:player`. Adding the False Swipe rows (observed, single-slot) lifts the whole battle.

## 1. Rung 1: attribution (`ord124Attribution.py`)

`ord124Attribution.py` reads the census commands jsonl (`liveShareCensus.ts --commands=`, which records the order host's own `detail`).
It groups every `sprite-order lend unknown` / `later-body` decline by the host invalidation behind it. The invalidating body is the
first command of that battle with that move and side.

| invalidated by | commands / frames | battles (invalidating command) | declining commands |
|---|---:|---|---|
| `body 316:player` Odor Sleuth, Metronome-called | 106 / 11,832 | 705: CHANSEY -> WOBBUFFET, after METRONOME | Struggle 83 player + 18 opponent, Swallow 5 |
| `body 63:player` Hyper Beam | 12 / 2,229 | 644: AERODACTYL -> URSARING (1); 729: AERODACTYL -> MUK (11) | Struggle 5, Curse 3, Hyper Beam 3 (729); Hyper Beam 1 (644) |
| `body 310:player` Astonish | 5 / 912 | 394, 428, 615, 923 | one or two per battle |
| next-mon summary while the opponent battler is tracked | 2 / 517 | 355 | Double Team, Tri Attack |
| later-body (no host detail: lend known) | 23 / 3,772 | 11 battles | **Extrasensory 326 player** later bodies, `liveMoveAnimation.ts:4234` |

Shares of the 148 commands in the two buckets:
- Odor Sleuth: 71.6 % (84.8 % of the lend-unknown bucket);
- Extrasensory: 15.5 %;
- Hyper Beam: 8.1 %;
- Astonish: 3.4 %;
- summary: 1.4 %.

The later-body bucket is not an order-plan problem. A player attacker's later Extrasensory body declines on the scanout split
(prep30 s1.4, scan93), not on the lend.

## 2. Rung 2: prediction from source, then ROM RAM

### Odor Sleuth 316 (computed; `ord124-prediction.md`, committed in `5e965bbd6` before the check)

Sources: `AnimTask_OdorSleuthMovement` / `MoveOdorSleuthClone` (battle_anim_effects_3.c:4955-5058), `CloneBattlerSpriteWithBlend`
(battle_anim_mons.c:1626), and `UpdateOamCoords` / `BuildSpritePriorities` / `SortSprites` (sprite.c:339-440).

1. The clones take the two lowest free slot numbers.
2. Each clone is a whole-struct copy of the target sprite. Both clones therefore carry the target's priority word **and** oam.y, and only
   x2 / invisibility differ.
3. Both clones die in the same frame (same counters).
4. `SortSprites` is an insertion sort that swaps only on a strict key inequality, so equal-key entries never reorder. The pair therefore
   leaves `sSpriteOrder`, and the free order, in the order its two slots had in the lend.

In plan language this is an FDERIVED group with tied words. `applySpriteOrderUnitPlan` orders such a group by F index at creation:
- `316:player`: `Cff;Cf;Cf;D2;D3;D0,1/P552,552;Cf;D4` (the opponent battler's word);
- `316:opponent`: `…/P542,542…` (the player battler's word).

The tied words make the number itself irrelevant. **plans69's "GEOMETRY by target" classes are lend classes**: F0 `[3, 4, …]` gives D0,1
and `[4, 3, …]` gives D1,0. The two classes only tracked the target species because the preceding units differed.

**ROM** (`ord124Check.ts` runs the production cursor from the ROM F at the unit start and compares created / destroyed slots and F
after every allocation window):

| body | instances | exact per window | first / later | lend classes | sources |
|---|---:|---:|---|---|---|
| `316:player` | 29 | **29** | 18 / 11 | [3,4] -> D0,1: 16; [4,3] -> D1,0: 13 | plans69 units 12 + ord124 probes 17 |
| `316:opponent` | 22 | **22** | 12 / 10 | [3,4] -> D0,1: 14; [4,3] -> D1,0: 8 | plans69 units 6 + ord124 probes 16 |

The ord124 probes cover targets Onix 95, Golbat 42, Charizard 6, Pikachu 25, Gengar 94 and Tyranitar 248, with lab seeds 0 / 7 / 11
and three turns each. Every job ran A / B in fresh processes (A == B on all of them), in two fresh batches (`units` r1 == r2).

### False Swipe 206 (observed EXACT, single-slot; source-consistent)

Source: `gFalseSwipeSliceSpriteTemplate` plus six `gFalseSwipePositionedSliceSpriteTemplate` slices, 2 frames apart. Each lives a fixed
18-frame blink (`AnimFalseSwipeSlice_Step3`), with no Random2, so every destroy is single-slot. Then the basic hitsplat.

The plan `Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D3;D4;D5;D6;D0;Cf;D7` is exact on **18 / 18** bodies:
- both sides, 9 each;
- 6 first / 12 later;
- targets Onix / Golbat / Wobbuffet; seeds 7 / 11 / 0.

No earlier receipt observed it, because it reaches Factory play only through Metronome.

### Hyper Beam 63 (negative, unchanged from plans69)

`AnimHyperBeamOrb` draws Random2 speed, anim and wave words for 52 orbs. Each orb's lifetime is its Random2 speed over the
attacker -> target distance, so the destroy groups follow both.
- The 2 fresh instances (lab seed 5, both sides, one extra turn):
  - the player one repeats a plans69 player class;
  - the opponent one is a new text (plans69 already had 9 distinct plans in 10 instances).
- **Recharge turn** (`ord124-hb-*-s5` units): the recharge turn plays **no body** (no move-animation unit between the defender's two
  bodies).
  - A player recharger's turn has an **empty** gap: no action prompt, because the player cannot choose.
  - An opponent recharger's turn has the ordinary prompt gap of the defender.
  - The player route also shows one `mv-0` general-animation unit (`Cf;Cf;D0;Cf;D2;D1`) after the first gap. It was not identified
    here.
  - So once a Hyper Beam body plan exists, the recharge turn needs only the host's existing gap handling, plus a check of the
    empty-prompt turn.
- **Not done:** a words unit. The presentation RNG host could supply the orb words (prep46 / reseed85 pattern: a non-consuming
  sub-stream keyed per body). That would also need a Hyper Beam reducer timeline (orb x / y per frame from the attacker / target
  coordinates) and then the y-sorted destroy groups.
- The lift would be small: 12 commands / 2,229 frames on 0..999.

## 3. Rung 3: the banked patch

`ord124-order-plans.diff` (3 files, all generated through the table's own generator; presentation only):
1. `tools/integration/fixtures/ord124/ord124-plan-rows.json` (new; rows-v1; `316:*` and `206:*`, tier confirmed).
2. `tools/integration/spriteOrderProductionTable.ts`: append `fixture("ord124/ord124-plan-rows.json")` after ret88's rows.
3. `src/engine/spriteOrderProductionPlans.ts`, regenerated:
   - +3 plans (indices 224 / 225 / 226) and +4 keys `206:*` -> 224, `316:opponent` -> 225, `316:player` -> 226;
   - no base index moves;
   - re-running the generator in the patched copy is byte-identical.

No host change: 316 and 206 are ordinary table bodies (not geometry-keyed, not words units).

**Windows after the bodies** (`ord124Stage.py`, 6 routes). The attacker knows only Odor Sleuth or False Swipe. The defender knows only
Harden 106 or Mega Punch 5 (Factory-live). Both sides; three turns.
- Two fresh `audit20Probes` batches (`lends` and `derive` r1 == r2), then `aud110Align`, then `audit21Check` (two more fresh probes
  inside), in both copies.
- The Odor Sleuth / False Swipe windows themselves have no live adapter (fallback). They are history only.

| copy | windows | CHAIN lend == ROM | after-body windows: lend == ROM | after-body windows: live 0 px every row | r1 == r2 |
|---|---:|---:|---:|---:|---:|
| base | 12 | 2 | 0 / 10 (unknown) | (production declines them: lend unknown) | 12 |
| patched | 12 | **12** | **10 / 10** | **10 / 10** (Harden 101 / 101 rows, Mega Punch 160 / 160 rows) | 12 |

The patched after-body windows cover:
- Harden after Odor Sleuth, first + later, both sides;
- Harden after False Swipe, first + later, both sides;
- Mega Punch after Odor Sleuth, both sides.

**FINDING (pre-existing, not this patch).** The two first windows of the `wos-*-143-42-5` routes are Golbat's Mega Punch before any Odor
Sleuth. Their lend == ROM, yet they render **287,402 px** (opponent Snorlax's route: 142 / 159 rows exact) and **17,984 px** (159 / 160
rows), identically in base and patched. That is either a live Mega Punch defect at a Golbat attacker / Snorlax target or an alignment
artefact of the routes' first window. It was not investigated: it is outside this step.

**Fold pins.** In the patched copy, the 9 sprite-order test files pass **70 / 70** with `ord124-fold-test-pins.diff` applied. Without
it, exactly 1 test fails: the table length pin. **Full `npm test` in the patched copy (diff + fold pins): 1,639 files passed / 44 skipped,
13,532 tests passed / 223 skipped.**

## 4. FOLD INSTRUCTIONS (land step)

1. After merging this branch, `tools/integration/fixtures/ord124/ord124-plan-rows.json` already exists. Apply the rest by hand:
   - add `, fixture("ord124/ord124-plan-rows.json")` after `fixture("ret88/plan-rows.json")` in
     `tools/integration/spriteOrderProductionTable.ts`'s appended list;
   - regenerate with `node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts`;
   - the result must equal the `src/engine/spriteOrderProductionPlans.ts` hunk of `ord124-order-plans.diff` (2 changed lines, 3 plans
     appended).
2. Pins: apply `ord124-fold-test-pins.diff` to `tests/spriteOrderEventTransform.test.ts`. It moves 554 -> 558 bodies, 224 -> 227 plans
   and adds the comment. The ext-table check needs nothing, because 316 and 206 are absent from `sprite-order-body-plans-ext.json`.
3. Tests to add (`tests/ord124OrderPlans.test.ts`):
   - `spriteOrderProductionBodyPlan(316, side)` / `(206, side)` decode to the row texts;
   - the tied-word group follows the lend. `applySpriteOrderUnitPlan` from the receipts' F0 `[3, 4, …]` frees `[3, 4, …]`, and from
     `[4, 3, …]` frees `[4, 3, …]` (use `ord124-units.json` windows, as `ord124Check.ts` does);
   - every 316 / 206 unit of `ord124-units.json` is exact per window.
   - Revert experiment: drop the `/P552,552` / `/P542,542` words, i.e. a static `D0,1`. The `[4, 3]` class (21 instances) must fail.
4. Tooling mirrors: none. No host key, and nothing is geometry-keyed. `spriteOrderCrossBodyCorpusReplay.ts` / `prep45CorpusReplay.ts` read
   the table.
5. Accounting (`docs/live-share-census.md`): headline 98.95 % / 99.32 % -> **99.34 % / 99.60 %**. Lend unknown 125 / 15,490 ->
   19 / 3,658.
6. Residual, named:
   - Hyper Beam `63:player`, 12 / 2,229: RANDOM2 orb words + geometry, §2;
   - Astonish `310:player`, 5 / 912: plans69's small words law, 4 words -> `D1,2` / `D2,1`;
   - next-mon summary while the opponent battler is tracked, 2 / 517 (battle 355);
   - later-body: the Extrasensory player scanout split, 23 / 3,772.

## 5. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/ord124Run.sh .integration/validation/<fresh>                  # rungs 1-3, `same` / `DIFF` vs fixtures/ord124 (~6 min)
ORD124_TESTS=1 sh tools/integration/ord124Run.sh .integration/validation/<fresh>   # + the 9 sprite-order test files with the fold pins
```

Steps:
1. git-archive copies of `2daafd503` (base) and base + diff (patched). Checks that the table regenerates byte-identically.
2. Census 0..999 in both copies, then attribution, census pair and land82CensusCheck.
3. `ord124Probe.py` x2 (fresh batches; A / B per job): `units` r1 == r2, then `ord124Check.ts`.
4. `ord124Stage.py` routes: audit20Probes x2, lends in both copies (r1 == r2), aud110Align, then audit21Check / stf115Summary in both
   copies.

Tools: `ord124Attribution.py`, `ord124Probe.py`, `ord124Extract.py`, `ord124Check.ts`, `ord124Stage.py`, `ord124CensusPair.py`,
`ord124Run.sh`. Reused: `stg107Census.sh`, `hist73Merge.py`, `land82CensusCheck.py`, `audit20Probes.py` / `audit20Fixtures.py` /
`audit20Check.ts`, `aud110Align.py`, `stf115Check.sh` (audit21Check), `stf115Summary.py`, `prep43Probe` / `prep43Extract`,
`plans69Probe.scenario`.
