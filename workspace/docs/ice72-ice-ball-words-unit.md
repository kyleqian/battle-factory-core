# ice72: Ice Ball 301 as a words-order unit for ANY consumer

S10A history widening (integration lane). Base: master `a7904fcc0` (src `5cd1b684`). Tested code: `738a868f0` (src `9ec2aba1`;
production change in `a443a9e32`). Receipt: `tools/integration/fixtures/ice72-live-receipt.json`.

## Results

| check | result |
|---|---|
| ROM probes (`ice72Run.sh`, direct mGBA, lab seed 305419897) | 5 jobs, A == B 5/5; two fresh batches r1 == r2 on every artefact (raw sha256, units, predictions, chain, vectors) |
| Ice Ball bodies, plan == ROM | **31 / 31 carried exact** + 1 fail-closed decline (Onix target, species idle rest x2 = 1); 32 bodies, both sides, counters 1..5, 10 at a non-entry (rho) occupancy |
| Consumer lends == ROM | **27 / 27** non-Ice-Ball consumers (Water Gun ×16, Swift ×6, Tackle ×5; 2 past a KO + send-out) and **42 / 42** nested words-body activations (later Ice Balls, Mud-Slap consumers) |
| Chains (words57 per-window / per-frame walk) | 46 / 47 EXACT (the decline above), 64,319 frames and 851 windows checked |
| Dense deferred-lend windows (`lendIceBallWindows.sh`) | 12 / 12 fixtures 0 violations; 11 selected-phase windows 0 px twice fresh; the documented alternate-phase window is unchanged |
| Census 0..999, base vs final | **+76 commands / +7,295 frames live**; 0 live → fallback; command key sequence and battle digest identical in every range; 0 render throws |
| Chain predictor (`--cleared "body 301 ICE_BALL"`) | predicted +32 / +3,523; measured predicted & live **32 / 3,523**, predicted & not live **0**, not predicted & live 35 / 3,031 |
| Scene ON / OFF parity (census battle 19, seed 19 streak 13) | RNG, rules and boundary equal at 63 action-menu boundaries; 23 Ice Ball / Mud-Slap / Water Pulse bodies on the route |
| Presentation-seed replay | route seeds 152 and 1 (`liveIceBallAdapter.test.ts`): replay equal; two presentation seeds and Scene OFF keep gameplay / RNG / facility; seed 1 bodies 1..4 now live every age under both seeds |
| Gates on `738a868f0` | targeted 44 files / 286 tests; typecheck; smoke 448; full suite 1,605 files / 13,197 tests (two shards); build; differential 624 / 624 byte-identical; `git diff --check` |

Census per range (`liveShareCensus.ts`, three parallel ranges, `prep43CensusDelta.py`):

| seeds | commands | live before | live after | live frames before → after |
|---|---:|---:|---:|---|
| 0..299 | 7,970 | 7,809 (97.98 %) | **7,853 (98.53 %), +44** | 1,159,011 → 1,162,741 (+3,730) |
| 300..649 | 10,392 | 9,450 (90.94 %) | **9,464 (91.07 %), +14** | 1,416,483 → 1,418,155 (+1,672) |
| 650..999 | 9,285 | 8,839 (95.20 %) | **8,857 (95.39 %), +18** | 1,336,941 → 1,338,834 (+1,893) |
| **0..999** | 27,647 | 26,098 (94.40 %) | **26,174 (94.67 %), +76** | 3,912,435 → 3,919,730 (+7,295) |

The measured gain exceeds the predictor. The predictor counts only commands whose order-host stop chain is all Ice Ball. It misses two
kinds of command:
- later Ice Ball bodies that declined at the Ice Ball case's own gate (`!spriteOrderInput?.known`, "unclassified (case-local gate)")
  rather than at an order-host stop;
- chains that also contain a Mud-Slap stop (battle 19's Mud-Slap / Water Pulse after the Sealeo's Ice Ball).

With Mud-Slap also cleared the predictor gives +34 / +3,625.

## Production change

- `wordsOrderUnits.ts`: 301 joins `WORDS_ORDER_UNIT_MOVE_IDS`. `DEFERRED_LEND_MOVE_IDS` is now exactly the words units.
- `liveSpriteOrderHost.ts`:
  - The Ice Ball marker arms off the entry occupancy, like the dirt units. Its activation is the tracker's entry-label lend (rho).
  - It records `bodySpecies`.
  - `lendLiveSpriteOrder` gives it to any consumer, still honouring `POSTKO_LEND_EXCLUDED_MOVE_IDS`, which is empty.
- `liveMoveAnimation.ts`:
  - `liveIceBallWordsPostFree` is `liveIceBallInputs(...).postBodyFree`, called with the adapter's own arguments. It reads the body's
    rollout counter, its recorded words and the art of its displayed species, at species rest.
  - `liveWordsOrderDeferredCarry` carries 301 through it and declines without `bodySpecies`. Because the marker is a words marker,
    `LIVE_WORDS_ORDER_DEFERRED_REPLAY` replays the ROM-checked battle units after it.
  - The Ice Ball case drops its own Ice-Ball-only resolution callback. The render seam's generic `resolveWordsOrderLend` resolves the
    marker for every consumer, Ice Ball included. A resolved lend is a per-command D3 faithful-random history claim, as for the other
    words units.
- Tools: `fixtureIceBallChain` (`liveAdapterFramebuffer.ts`) passes the fixture's displayed species to the marker, as the orchestrator
  does (`battleResolutionMoveAnimationField`).
- Gameplay, RNG, damage, turn order and facility state are untouched. The words come only from the presentation host. The census's
  command keys and battle digests are identical, and so is the ON / OFF parity.

## Evidence (step 1)

Jobs are complete Mechanics Lab parties with internal species ids and lab seed 305419897. Each job's A / B runs are in one batch.
`ice72OrderRngProbe.py` is `prep46OrderRngProbe.py` plus a per-frame read of `gBattleMons[0..1].species`, so each body's displayed species
is read from RAM, not inferred.

| job | Ice Ball side | species pair(s) | consumers | notes |
|---|---|---|---|---|
| ply-glalie-wg | player | Glalie → Snorlax, Lickitung, Onix | Water Gun, Tackle | counters 1..5, then a KO + send-out; new chains at non-entry occupancy; counter 4 after the Onix send-in (the decline) |
| opp-glalie-wg | opponent | Glalie → Lapras | Water Gun | counters 1..5; the counter-5 chain goes past a KO + send-out to 2 consumers |
| opp-sealeo-wg | opponent | Sealeo → Walrein | Water Gun | counters 1..4 |
| ko-opp-ms-sealeo | opponent | Sealeo → Snorlax, Glalie → Snorlax | Swift | a Mud-Slap marker, then a KO + send-in; the FIRST Ice Ball marker is at a non-entry occupancy |
| ply-glalie-ms | player | Glalie → Walrein | Mud-Slap (a words consumer) | Ice Ball ↔ Mud-Slap nesting both ways |

The check is `ice72Chain.ts`, which is `words57Chain.ts` with 301 a words body:
- The carry is production's `liveIceBallWordsPostFree` at the RAM-read words. The rollout counter is derived from the ROM shards
  (5 / 7 / 9 / 10) and the body length.
- The production replay (`resolveSpriteOrderDeferredLend` with the production plans) runs past every unit.
- Each consumer's lend is compared with the ROM activation order in the lend's labels.

The predictions were written by the `ICE72_PREDICT` pass and committed in `526517e1a`, before the comparison was reviewed. In the first
run the check pass ran right after the predict pass, so its one-line summary was printed before that commit. The predictions are
deterministic outputs of production code on the recorded words: the r2 rerun, on the wired code, gives byte-identical predictions.

Dropped jobs:
- `ply-sealeo-wp` and `ko-ply-glalie-sunkern` ended their battles inside the trace, and the end-of-battle sprite reset cleared the probe
  rows. `ply-glalie-wg`'s counter-4 body after the Onix send-in covers the player's later Ice Ball after a send-in.
- A first attempt with national dex ids (362 / 364 / 365 = Dusclops / Slakoth / Vigoroth internally) was redone with internal ids.

Counter-example / fail-closed shape: the Ice Ball target's species front-idle rest must be 0. `liveIceBallInputs` declines otherwise,
both in the adapter and in the carry. The carry reads species rest only, not the battler x2 history, so a resting species whose x2 was
reset by an earlier body declines too (fail closed).

## Tests

- `tests/ice72IceBallWordsUnit.test.ts` (6 tests):
  - words-unit membership;
  - plan == ROM on the 32 receipt bodies (31 exact plus the Onix decline; the host plan's words equal the RAM draws; 29 distinct
    post-body orders);
  - lends == ROM on the 27 consumer vectors;
  - a species-free marker declines;
  - a non-entry Ice Ball marker arms in entry labels with the species;
  - a non-Ice-Ball consumer (Water Gun) takes the Ice Ball marker, and a later Ice Ball nests it.
- Old-rule pins moved:
  - `spriteOrderDeferredLend` (the Tackle now takes the lend);
  - `wordsOrderDeferredLend` ×2 (Ice Ball lends to any consumer; it arms off-entry);
  - `words57DeferredBattleUnits` (an Ice Ball marker replays battle units);
  - `words59DeferredBodySpecies` (Ice Ball records species);
  - `liveIceBallAdapter` (route seed 1 Delibird: bodies 3..4, after the opponent's KO + send-in, are now live every age).
- Revert experiment (`fixtures/ice72/revert-experiment.txt`): the three production files at `9e76f5bf0` (carry present, wiring absent)
  fail 10 tests: 4 of the new ones and the 6 moved pins.

## Rerun

```sh
# from workspace/
sh tools/integration/ice72Run.sh <fresh-out-dir>        # ~1 min: probes r1 + r2, extract, predictions, chain check, byte compare with fixtures/ice72/
OUT=<dir> sh tools/integration/lendIceBallWindows.sh     # 12 dense deferred-lend windows through the production renderer (direct mGBA)
sh tools/integration/ice72Census.sh <fresh-out-dir> a7904fcc0 738a868f0   # ~11 min: census 0..999 base vs final + order census + chains
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=19 --streak=13 --moves=301,189,352 --out=<file>
```
