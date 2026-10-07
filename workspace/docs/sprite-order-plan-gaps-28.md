# Sprite-order plan gaps that block live adapters (prep28, S10A side lane, evidence only)

New files only. Direct mGBA (never the shared HTTP oracles); every relied-on probe ran twice from fresh processes: **438 A/B pairs, 0 differ (`cmp`)**.
Reproduce: `sh tools/integration/prep28Run.sh` (~15 min; `SKIP_PROBES=1` reuses `/tmp/p28`). The production experiment is the committed
`tools/integration/fixtures/prep28/prep28-temp-src.patch` (applied, replayed, **reverted**; `git status --short src` is empty).

## 1. Results (first)

1. **Gap census.** 94 (move, side) cells of Factory Level-50 sets are absent from `SPRITE_ORDER_PRODUCTION_BODIES` = **16.3 %** of weighted move uses
   (`fixtures/prep28/ranked-gaps.json`; 92 real cells + the 2 `UNAVAILABLE` ids). 91 are NEEDS-KEYS, 3 NOT-OBSERVED (Baton Pass player, Helping Hand x2).
2. **New idea that closes part of the gap (no src grammar change).** `applySpriteOrderUnitPlan` already sorts a `P` group by `(word, creation window, free-order index)`.
   The words only have to be *a* sort key, so a KEYS group (equal priority word, different y) whose observed order obeys
   `sort by (priority word, -y, creation, F index)` can be written with **synthetic words = dense rank of (pw, -y)**; tied-y members then resolve from the lent free order
   (history-correct), which is exactly what made Sleep Powder look "geometry dependent" (the Venomoth scenario breaks a y tie 4-before-3, Hoppip 3-before-4; both follow the F index).
   `tools/integration/prep28Tie.py` applies this to every gap cell over 3 species-pair geometries x A/B + the committed corpora (>= 2 absolute-y fingerprints, one plan).
3. **14 cells CONFIRMED** (paste-ready: `fixtures/prep28/plan-rows.json`, same row shape as `sprite-order-body-plans-rely.json`; `tier: "confirmed"`, so
   `renderSpriteOrderProductionTable(..., extraBodies)` takes them as is): **79:opponent, 79:player (Sleep Powder)**, 85:opponent (Thunderbolt), 95:opponent/player (Hypnosis),
   78:opponent (Stun Spore), 352:opponent/player (Water Pulse), 337:opponent/player (Dragon Claw), 309:opponent/player (Meteor Mash), 348:opponent/player (Leaf Blade;
   its adapter is live and a consumer, now also plannable as a predecessor). 79 and 78 use synthetic `P` words (tie groups).
4. **Sky Attack (143) charge/strike**: both emit `MOVE_ANIMATION 143`; `request.turn` (0 charge, 1 strike) is the only discriminator. ROM: charge = **no sort windows** (plan `""`, 5 bodies),
   strike = `Cf;D0` (3 bodies player, 2 opponent), one plan each in every geometry, both sides (`fixtures/prep28/sky-attack-split.json`, rows `plan-rows-sky-attack.json`, strike keyed `10143:<side>`).
   They are **not** interchangeable: from the known entry the strike reorders the free list (`[4,3,..]` -> `[3,4,..]`). Needs a host change (patch: `moveId` 143 + `turn===1` -> 10143).
5. **Before / after, production event transform** (patch applied; `prep28Replay.ts`, committed+ext+prep28 tables, 657 scenarios, strict per scenario):
   known edges **1210 -> 1285** (+75), exact 1210 -> 1285, **mismatched 0 -> 0** (`corpus-replay-before-after.json`). The 2+1 Sky Attack strike edges go unknown -> known/exact.
6. **Snore after Sleep Powder** (`prep28SnoreCheck.ts`, both measured Snore ROM scenarios, Sleep Powder -> 2 sleep status animations -> Snore): lend at the Snore edge
   **unknown -> exact, both orientations** (`snore-before/after.json`). So a dense Snore fixture after the planned predecessor is buildable; the mv-0 bodies are fed as
   status-animation SLP because their window shape is exactly the production STATUS_SLP plan (`Cf;Cf;D0`) — an inference from plan equality, not an event-level identification.
   A real generated route with Snore after Sleep Powder was not found: leads with 79 (one side) and 173 (other) never co-occur in seeds 0-599 (`prep28SnoreRoutes.ts`, 0 routes).
7. **Sky Attack strike**: the strike edge is known/exact after the charge in all 3 ROM scenarios (player 2, opponent 1) with the patch; a dense fixture after the charge is buildable
   once the host keys the strike (`turn`); without that host change the charge plan is the only safe row.
8. **Route scans (600 generated routes: seeds 0-149 x slot sets [x,x,x], x=0..3)**: 317 later consumer bodies (45 order-consuming adapters), 140 known -> **149 known** (declined 177 -> 168).
   All 9 flips are Water Pulse (352) consumer bodies behind an earlier Water Pulse. **Named routes unchanged (0 of 985 route bodies flip)**: seeds 143, 77, 9, 43, 162, 175, 336, 713,
   70, 180, 65, 389, 71, 169, 277, 283 over all [x], [x,y], [x,x,x]. After the patch the first remaining invalidation there is (`prep28Reasons.ts`):
   seed 9: **28 Sand Attack (opponent)** 16/16 routes (NEEDS-KEYS: observed order contradicts the key rule); seed 77: **TURN_TRAP general animation** (8) and 260 Flatter (1);
   seed 143: the Water Pulse **CONFUSION status animation** (4 routes; the other 12 have no invalidation, the 352 body itself is now planned).
   The brief's route labels (`143/28`, `77/35`, `9/21`) are `seed/<predecessor move id>`-like; I could not map them to slot choices, so the scan covers every slot choice of those seeds.
9. **Brief items already planned, i.e. not gaps**: Fire Punch 7, Swagger 207 and High Jump Kick 136 both orientations are in `SPRITE_ORDER_PRODUCTION_BODIES` (7 via the rely tier;
   207/136 EXACT-PLAN in the ext table). A Psych Up / Lovely Kiss decline behind them has another cause (seed 77: TURN_TRAP; no Psych Up route with a known lend exists to test). Move 85 player was
   already planned; 85:opponent is now added. Sleep Powder (79) and the Sky Attack charge were the only brief names that were true gaps.

## 2. Ranked gap table (top 15 by census weight; weight = expected uses per set slot, both sides equal)

"Blocked" = later order-consumer bodies (45 adapters, `!spriteOrderInput?.known` guards of `liveMoveAnimation.ts`; heuristic list in `prep28RouteBlock.ts`) whose first unplanned predecessor
is this move, over the 600 routes above (177 declined bodies: 60 have no unplanned predecessor = other causes such as party menu / faint / first-body gates).

| # | cell | move | weight | ext verdict | prep28 tie verdict | blocked |
|---|---|---|---|---|---|---|
| 1 | 85:opponent | Thunderbolt | 6.47% | NEEDS-KEYS | **CONFIRMED** (3 abs-y) | 0 |
| 2-3 | 213 both | Attract | 5.97% | NEEDS-KEYS | NEEDS-KEYS: order contradicts the (pw,-y,creation,F) rule | 5 |
| 4-5 | 280 both | Brick Break | 5.84% | NEEDS-KEYS | NEEDS-KEYS: plan differs across geometries | 3 |
| 6-7 | 202 both | Giga Drain | 5.50% | NEEDS-KEYS | NEEDS-KEYS: rule contradicted | 0 |
| 8-9 | 240 both | Rain Dance | 3.35% | NEEDS-KEYS | NEEDS-KEYS: 4 plans | 2 |
| 10 | 315:player | Overheat | 3.07% | NEEDS-KEYS | NEEDS-KEYS: 2 plans (order flips with geometry y) | 0 |
| 11-12 | 91 both | Dig | 3.00% | NEEDS-KEYS | NEEDS-KEYS: rule contradicted | **32** |
| 13-14 | 8 both | Ice Punch | 2.79% | NEEDS-KEYS | NEEDS-KEYS: rule contradicted | 0 |
| 15 | 56:opponent | Hydro Pump | 2.49% | NEEDS-KEYS | INCONCLUSIVE (no body in 12 probes) | 0 |

Top route blockers by blocked consumer bodies (before): Dig 91 (32, mostly Dig's own second body), Water Pulse 352 (17, **closed**), Fury Cutter 210 (13), Mud Slap 189 (10), Fly 19 (9),
Attract 213 (5), Grudge 288:player (5), Brick Break 280 (3), Sand Attack 28 (3), Dive 291 (3), Magnitude 222 (3), Flatter 260 (3), Rain Dance 240 (2). Full 94-row table incl. per-cell
consumer lists: `fixtures/prep28/ranked-gaps.json`; all verdicts with reasons: `fixtures/prep28/tie-verdicts.json`.

Named bodies, verdict and deciding key:

| body | verdict | live key / derivability |
|---|---|---|
| 79 Sleep Powder | **EXACT-PLAN both sides** (synthetic words) | order = (-y, F index at creation); y relative-static (same rank vectors in 4 abs-y fingerprints); tie by the lent free order, which the tracker has |
| 143 Sky Attack | charge `""` / strike `Cf;D0`, both sides | `request.turn`; needs host mapping change |
| 85 Thunderbolt | opponent EXACT-PLAN (player already) | relative-y static, 8-member group |
| 315 Overheat player | NEEDS-KEYS | y order of the 8-sprite group flips for one species pair (Diglett/Chansey): live y (battler/picture offset) needed; not derivable from rank vectors |
| 28 Sand Attack, 213 Attract, 202 Giga Drain, 91 Dig, 8 Ice Punch, 189 Mud Slap, 59 Blizzard-opp | NEEDS-KEYS | observed destroy order contradicts (pw,-y,creation,F): another key (x / oam / task order) decides; unresolved |
| 280, 240, 258, 210, 19, 75, 340, 345, 349 | NEEDS-KEYS | the plan (window stream) itself differs between geometries/histories (more than ties): needs a history key, not a y key |
| 7, 207, 136 | already planned | no gap |

## 3. What was not reached / caveats

* Only 14 of 92 cells are CONFIRMED; the other 66 NEEDS-KEYS fail for stated reasons, 14 are INCONCLUSIVE (no complete body: Baton Pass player, Helping Hand, Dream Eater, Soft Boiled, Moonlight, Astonish,
  Snore, Spit Up, Hydro Pump opponent; 3 alternate seeds tried for the status-move ones).
* The replays are partly circular for the new rows (the rows come from the same ROM scenarios); the cross-geometry rule (>= 2 absolute-y fingerprints, identical rank vectors) is what carries the claim, plus 0
  mismatches over the 1549 edges of the existing corpora around them. `tests/spriteOrderEventTransform.test.ts` pins the generated table: adding the rows requires regenerating through `spriteOrderProductionTable.ts`
  (`prep28Patch.ts` shows the call) and updating that pin; not done here (src out of scope).
* Remaining first blockers on the named routes: Sand Attack (28), TURN_TRAP general animation (NEEDS-KEYS, 2 plans), Water Pulse's CONFUSION status animation (`Status:B_ANIM_STATUS_CONFUSION`, 15 instances, 1 plan,
  equal-pw/different-y: the same tie method is the obvious next probe; not measured here).
* The route-scan consumer set and the 45-adapter count come from a text heuristic over `liveMoveAnimation.ts`.

## 4. Files

`tools/integration/`: `prep28Rank.py`, `prep28Aggregate.py`, `prep28RouteBlock.ts`, `prep28Rely.py` (reuses `spriteOrderRelYConfirm.py`), `prep28Tie.py`, `prep28Charge.py`, `prep28Events.py`, `prep28Patch.ts`,
`prep28Replay.ts`, `prep28SnoreCheck.ts`, `prep28SnoreRoutes.ts`, `prep28NamedRoutes.ts`, `prep28SeedRoutes.ts`, `prep28Reasons.ts`, `prep28Run.sh`.
`fixtures/prep28/`: `ranked-gaps*.json`, `tie-verdicts.json`, `plan-rows.json`, `plan-rows-sky-attack.json`, `sky-attack-split.json`, `prep28-temp-src.patch`, `routescan-{before,after}-N.json`,
`routescan-effect.json`, `corpus-replay-before-after.json`, `snore-{before,after}.json`, `body-events.json`, `rely/` (scenario JSONs + `verdicts.json` of the unchanged rely method).
