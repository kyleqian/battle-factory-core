# Sprite-order REL-Y-STATIC confirmation (S10A, ROM evidence, new files only)

Direct mGBA (never the shared HTTP oracles), Scene ON. Source: `docs/sprite-order-policy-gaps.md` (§3 Endeavor / §3b Fake Tears, relative-y rule) and `fixtures/sprite-order-policy-gaps/relative-y-candidates.json`
(121 unconfirmed "single geometry" cells). No production code or existing file is changed.

## Results

| | cells | weighted Factory use |
|---|---|---|
| unconfirmed cells probed | 121 | 19.71% |
| **CONFIRMED** (>= 2 absolute-y geometries, same plan, same relative-y vectors in every KEYS group) | 60 | 11.97% |
| **CONFIRMED, abs-invariant tier** (same plan, same relative AND absolute y over >= 3 scenarios on different species pairs: y does not depend on the picture geometry, so no 2nd absolute geometry exists to probe) | 23 | 3.14% |
| **REFUTED** -> NEEDS-KEYS (plan or relative-y vector differs, or the KEYS rule does not hold) | 30 | 4.18% |
| INCONCLUSIVE (no complete body in any scenario / <3 scenarios) | 8 | 0.42% |

(283:opponent Endeavor is one of the 8 INCONCLUSIVE only because this sweep's two probes show one absolute-y fingerprint; it already has its EXACT row in `sprite-order-policy-gaps/relative-y-plans.json`, 5 bodies, and is overlaid from there in the replays.)

Weighted EXACT coverage (the `spriteOrderPlanCoverageRank.py` weight model; every Level-50 move id x both sides; table = `sprite-order-body-plans-ext.json`):

| table | weighted EXACT | EXACT cells / 574 |
|---|---|---|
| before (plans-ext) | **68.19%** | 372 |
| + policy-gaps rows (Endeavor, Fake Tears; 4 rows) | 68.67% | 376 |
| + policy-gaps + rely **confirmed** tier (60 rows) | **80.63%** | 436 |
| + policy-gaps + all rely rows (83 rows incl. abs-invariant) | **83.67%** | 456 |

Replays (edges known / exact / mismatched; 0 mismatches everywhere):

| plan-only replay, union corpus = committed + ext tables + 699 two-run-identical rely probes (2705 body edges) | known / exact / mismatched |
|---|---|
| ext plans only (no overlay) | 1885 / 1885 / 0 of 2705 |
| + policy-gaps rows | 1891 / 1891 / 0 of 2705 |
| + policy-gaps + rely confirmed tier | 2158 / 2158 / 0 of 2705 |
| + policy-gaps + all rely rows | 2201 / 2201 / 0 of 2705 |

Original ext corpus alone (1366 edges): no overlay 1053 known / 0 mismatched (reproduces the committed 1366 / 1053 / 0); + all rely rows 1119 known / 1119 exact / 0 mismatched.
Note the overlay rows are derived from the same scenarios they are replayed on (circular for those edges by construction); what the replay adds is that the *gap plans around* the bodies stay exact (0 mismatches) and that the strictly cross-geometry rule held (see Method).

Pure-transform replay with the production transform (`spriteOrderRelYReplay.ts`, same core as `spriteOrderPolicyGapsReplay.ts`):

| stream set | no override | + policy-gaps | + rely confirmed | + all rely |
|---|---|---|---|---|
| 15 policy-gaps ROM streams, edges known/exact/mismatch of 39 | 27/27/0 | 39/39/0 | 39/39/0 | 39/39/0 |
| strict real route (5 traces), move edges known/exact/mismatch of 91 | 15/15/0 | 44/44/0 | 44/44/0 | 44/44/0 |
| strict real route, anim edges known/exact/mismatch of 27 | 5/5/0 | 9/9/0 | 9/9/0 | 9/9/0 |

The strict real route gains nothing from the rely rows: none of the five canonical battle-1 traces uses a rely move before its next uncovered unit (`RunTurnActionsFunctions` / `HandleTurnActionSelectionState`, see `docs/sprite-order-policy-gaps.md` §2.4). The gain is on the lab/union corpus and, in production, on any route that does use these moves.

## Method

1. **Rank** (`spriteOrderRelYConfirm.py rank`): the 121 `REL-Y-STATIC (single geometry: unconfirmed)` cells ordered by the coverage weight model (`ranking.json`).
2. **Geometries** (`gen`): for each cell and side, from the Endeavor lab template (`policy-gaps/scenarios/endeavor-<side>-onix-...json`) the attacker's four moves = the move, three species pairs: Dragonair/Chansey, Diglett/Chansey, Onix/Pidgeotto (different picture coordinates; Chansey forced female). 363 scenarios; for the 19 cells that produced no body (accuracy misses) `retry` adds battle seeds 11,22,33,44,55,66 (342 more). All in `fixtures/sprite-order-rely/scenarios/` (705 files).
3. **Probe** (`probe`): `tools/compare/spriteOrderEventProbe.py`, run A and run B of every scenario (1410 runs, 5 min at 14 jobs); only A==B (bytewise) runs are used (699/705 scenarios yielded events; all A/B pairs identical, 0 skipped).
4. **Verdict** (`analyze`): per cell pool the old scenarios (committed + ext tables) and the identical new ones. Per body: window stream with destroy orders (`P.sig`), relative-y vector of every KEYS group (y - min y, in observed destroy order) and the absolute-y fingerprint. CONFIRMED = all KEYS groups are `equal priority word, different y`, one plan signature, one relative-y vector list, >= 2 absolute fingerprints. abs-invariant tier = same but one absolute fingerprint over >= 3 scenarios on different species pairs (the effect sprites are anchored to the battler position and constant offsets, never to the species picture: Dragonair, Diglett, Chansey, Onix, Pidgeotto have different `gMonFrontPicCoords`). REFUTED when the plan differs, a relative-y vector differs, or a group is not of the equal-word/different-y kind; the differing window is recorded in `verdicts.json` (`difference`).
5. **Rows** (`spriteOrderRelYPlans.ts`): `fixtures/sprite-order-body-plans-rely.json`, 83 rows `{verdict: "EXACT-PLAN", rule, tier, plan, encoded, census, provenance}` (same shape as `relative-y-plans.json`; `plan` round-trips through `decodeSpriteOrderPlan`; 53 distinct plans). Tier `abs-invariant` rows are flagged so the production generator can include them or not.
6. **Replays**: `spriteOrderRelYReplay.py` (union table, plan-only, gaps from the union's own EXACT gap plans) and `spriteOrderRelYReplay.ts` (production transform over the policy-gaps ROM streams and the strict real route).

Script cites for the relative offsets (a sample; the other rows rest on the observed vectors): Bite (44): `reference/pokeemerald/data/battle_anim_scripts.s:5294-5295` two `create_sharp_teeth_sprite` at `y=-32` / `y=32` relative to the attacker (constant 64 spread; rel-y observed identical on 3 absolute geometries). Ice Beam (58): `:5359-5360` outer crystals at `(20, 12)` and `(20, -12)` offsets, then the `IceBeamCreateCrystals` calls (fixed offsets from the attacker). Endeavor `CreateSweatDroplets` is cited in `policy-gaps.md` §3.

## CONFIRMED, top 20 by weight (full list: `verdicts.json`)

| rank | cell | move | weight | tier | geometries | abs-y fingerprints |
|---|---|---|---|---|---|---|
| 1 | 58:opponent | ICE_BEAM | 0.990% | confirmed | 4 | 2 |
| 2 | 58:player | ICE_BEAM | 0.990% | confirmed | 4 | 3 |
| 3 | 85:player | THUNDERBOLT | 0.809% | confirmed | 4 | 2 |
| 4 | 188:opponent | SLUDGE_BOMB | 0.728% | confirmed | 4 | 3 |
| 5 | 188:player | SLUDGE_BOMB | 0.728% | confirmed | 4 | 3 |
| 6 | 46:opponent | ROAR | 0.592% | abs-invariant | 4 | 1 |
| 7 | 46:player | ROAR | 0.592% | abs-invariant | 4 | 1 |
| 8 | 242:opponent | CRUNCH | 0.531% | confirmed | 4 | 3 |
| 9 | 242:player | CRUNCH | 0.531% | confirmed | 4 | 3 |
| 10 | 44:opponent | BITE | 0.455% | confirmed | 4 | 3 |
| 11 | 44:player | BITE | 0.455% | confirmed | 4 | 3 |
| 12 | 315:opponent | OVERHEAT | 0.384% | confirmed | 4 | 4 |
| 13 | 7:opponent | FIRE_PUNCH | 0.334% | confirmed | 4 | 3 |
| 14 | 7:player | FIRE_PUNCH | 0.334% | confirmed | 4 | 3 |
| 15 | 126:opponent | FIRE_BLAST | 0.296% | confirmed | 4 | 3 |
| 16 | 126:player | FIRE_BLAST | 0.296% | confirmed | 4 | 3 |
| 17 | 263:opponent | FACADE | 0.274% | abs-invariant | 4 | 1 |
| 18 | 263:player | FACADE | 0.274% | abs-invariant | 4 | 1 |
| 19 | 108:opponent | SMOKESCREEN | 0.238% | confirmed | 3 | 2 |
| 20 | 108:player | SMOKESCREEN | 0.238% | confirmed | 3 | 2 |

## REFUTED (NEEDS-KEYS), all 30

Reasons: *relative-y vectors differ* = the spread between the group members depends on the species/position (a real y dependence, e.g. Water Pulse, Dragon Claw, Meteor Mash, Leaf Blade); *plan differs* = the window stream itself changes between scenarios (weather/status duration, hit vs. miss/faint branch, crit): these may be state-dependent rather than geometry-dependent, but the criterion (identical across geometries) fails either way; *contradicts key rule* = the observed order is not (priority, -y) even within one scenario.

| cell | move | weight | observed difference |
|---|---|---|---|
| 240:opponent | RAIN_DANCE | 0.419% | plan differs across geometries (4 distinct plans) (first differing window 9 of 80) |
| 240:player | RAIN_DANCE | 0.419% | plan differs across geometries (4 distinct plans) (first differing window 7 of 80) |
| 315:player | OVERHEAT | 0.384% | plan differs across geometries (2 distinct plans) (first differing window 9 of 24) |
| 189:opponent | MUD_SLAP | 0.270% | KEYS group not of the equal-word/different-y kind: observed order contradicts key/creation rule |
| 352:opponent | WATER_PULSE | 0.235% | relative-y vectors differ across geometries: [[43, 0], [29, 47, 0], [27, 43, 0], [59, 0], [59, 0]] vs [[45, 0] |
| 352:player | WATER_PULSE | 0.235% | relative-y vectors differ across geometries: [[43, 0], [84, 39, 0], [84, 39, 0], [59, 0], [57, 0]] vs [[45, 0] |
| 28:player | SAND_ATTACK | 0.203% | KEYS group not of the equal-word/different-y kind: observed order contradicts key/creation rule |
| 349:opponent | DRAGON_DANCE | 0.200% | plan differs across geometries (2 distinct plans) (first differing window 2 of 3) |
| 78:opponent | STUN_SPORE | 0.182% | plan differs across geometries (2 distinct plans) (first differing window 4 of 8) |
| 337:opponent | DRAGON_CLAW | 0.167% | relative-y vectors differ across geometries: [[20, 0], [80, 60, 0]] vs [[20, 0], [91, 71, 0]] vs [[20, 0], [92 |
| 337:player | DRAGON_CLAW | 0.167% | relative-y vectors differ across geometries: [[20, 0], [17, 20, 0]] vs [[20, 0], [19, 20, 0]] vs [[20, 0], [26 |
| 345:opponent | MAGICAL_LEAF | 0.165% | plan differs across geometries (2 distinct plans) (first differing window 23 of 24) |
| 258:opponent | HAIL | 0.128% | plan differs across geometries (4 distinct plans) (first differing window 6 of 34) |
| 258:player | HAIL | 0.128% | plan differs across geometries (4 distinct plans) (first differing window 6 of 34) |
| 309:opponent | METEOR_MASH | 0.110% | relative-y vectors differ across geometries: [[38, 0], [39, 0], [49, 0], [31, 0], [38, 0], [38, 0], [41, 0], [ |
| 309:player | METEOR_MASH | 0.110% | relative-y vectors differ across geometries: [[29, 0], [37, 0], [39, 0], [40, 0], [31, 0], [31, 0], [38, 0], [ |
| 75:opponent | RAZOR_LEAF | 0.091% | plan differs across geometries (2 distinct plans) (first differing window 21 of 22) |
| 72:opponent | MEGA_DRAIN | 0.077% | KEYS group not of the equal-word/different-y kind: observed order contradicts key/creation rule |
| 72:player | MEGA_DRAIN | 0.077% | plan differs across geometries (2 distinct plans) (first differing window 17 of 37) |
| 348:opponent | LEAF_BLADE | 0.074% | relative-y vectors differ across geometries: [[7, 0], [7, 0], [5, 0], [4, 0], [3, 0]] vs [[7, 0], [7, 0], [5,  |
| 348:player | LEAF_BLADE | 0.074% | relative-y vectors differ across geometries: [[12, 0], [11, 0], [9, 0], [8, 0], [7, 0]] vs [[12, 0], [11, 0],  |
| 301:opponent | ICE_BALL | 0.057% | plan differs across geometries (3 distinct plans) (first differing window 3 of 4) |
| 260:opponent | FLATTER | 0.040% | plan differs across geometries (4 distinct plans) (first differing window 8 of 10) |
| 260:player | FLATTER | 0.040% | plan differs across geometries (4 distinct plans) (first differing window 8 of 10) |
| 302:opponent | NEEDLE_ARM | 0.037% | plan differs across geometries (2 distinct plans) (first differing window 16 of 19) |
| 63:opponent | HYPER_BEAM | 0.019% | plan differs across geometries (4 distinct plans) (first differing window 7 of 65) |
| 63:player | HYPER_BEAM | 0.019% | KEYS group not of the equal-word/different-y kind: observed order contradicts key/creation rule |
| 192:opponent | ZAP_CANNON | 0.019% | plan differs across geometries (2 distinct plans) (first differing window 2 of 20) |
| 192:player | ZAP_CANNON | 0.019% | plan differs across geometries (2 distinct plans) (first differing window 0 of 20) |
| 284:player | ERUPTION | 0.017% | plan differs across geometries (3 distinct plans) (first differing window 3 of 27) |

## INCONCLUSIVE

| cell | move | weight | why inconclusive |
|---|---|---|---|
| 283:opponent | ENDEAVOR | 0.111% | all geometries share one absolute-y fingerprint (<3 scenarios) |
| 135:opponent | SOFT_BOILED | 0.091% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 236:opponent | MOONLIGHT | 0.072% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 310:player | ASTONISH | 0.038% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 173:opponent | SNORE | 0.037% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 173:player | SNORE | 0.037% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 255:opponent | SPIT_UP | 0.017% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |
| 255:player | SPIT_UP | 0.017% | no complete identical new body ({"diglett-chansey": 0, "diglett-chanse |

Soft Boiled / Moonlight need a damaged attacker, Snore / Spit Up need a Sleep / Stockpile setup, Astonish produced no complete body (no stock scenario state for it): none of these is reachable from the generic template, and the retry seeds do not change that.

## Evidence index and regeneration

`tools/integration/fixtures/sprite-order-rely/`: `ranking.json`, `scenarios/*.json` (705), `verdicts.json` (per cell: probes with sha256 prefix and A==B flag, plan/relative-y hash per geometry, verdict, difference), `confirmed-plans.json`, `replay-receipt.json` (union plan-only replay + weighted coverage), `replay-receipt-ts.json`. Rows: `tools/integration/fixtures/sprite-order-body-plans-rely.json`. Raw mGBA rows (~110 KB each) are not committed; regenerate them in `/tmp/rely`.

```
python3 tools/integration/spriteOrderRelYConfirm.py rank
python3 tools/integration/spriteOrderRelYConfirm.py gen && python3 tools/integration/spriteOrderRelYConfirm.py retry   # retry needs verdicts.json from a first analyze
OUT=/tmp/rely python3 tools/integration/spriteOrderRelYConfirm.py probe --jobs 14      # direct mGBA, ~6 min
OUT=/tmp/rely python3 tools/integration/spriteOrderRelYConfirm.py analyze --write
node --experimental-strip-types tools/integration/spriteOrderRelYPlans.ts --write
OUT=/tmp/rely python3 tools/integration/spriteOrderRelYReplay.py --write
node --experimental-strip-types tools/integration/spriteOrderRelYReplay.ts --write
python3 tools/integration/spriteOrderRelYConfirm.py report 20
```
(`retry` generates the seed variants only for cells whose first analysis was "no complete body"; the committed scenario set already contains them, so a plain re-run of `probe` + `analyze` reproduces the verdicts.)

## Open items / proposal for the production table

* Rows to merge: `sprite-order-body-plans-rely.json` `bodies` (verdict EXACT-PLAN, keys `<move>:<side>`), after the policy-gaps rows, same as proposal B in `policy-gaps.md`. Prefer the 60 `confirmed` rows first; the 23 `abs-invariant` rows rest on 4 scenarios x different species with identical absolute y.
* The `tests/spriteOrderEventTransform.test.ts` byte-for-byte pin and `exact` count will change when rows are merged (supervisor-owned).
* Several REFUTED cells (Rain Dance, Hail, Flatter, Hyper Beam) differ by state-dependent window branches; a state-keyed plan (weather already active, etc.) might make them exact later.
