# Sprite-order plan coverage on real Factory move uses (S10A, ROM evidence, new files only)

Evidence only; no production code, no existing file edited. Goal: raise the share of real Factory Level-50 move uses whose body has an
EXACT-PLAN in **both** orientations (`sprite-order-body-plans.json` verdict per `(move, attacker side)`; see `docs/sprite-order-body-plans.md`).

## 1. Coverage before / after (first)

Weighted share of move uses whose `(move, side)` has the verdict (both orientations counted; `unattributed` bodies are NOT credited to a side;
weight model in §2). "before" = committed `sprite-order-body-plans.json`, "after" = new `sprite-order-body-plans-ext.json`.

| verdict (weighted uses) | before | after |
|---|---|---|
| EXACT | 51.60% | 68.19% |
| NEEDS-KEYS | 14.40% | 30.86% |
| NOT-OBSERVED | 34.00% | 0.95% |
| (move, side) cells EXACT / NEEDS-KEYS / NOT-OBSERVED (of 550) | 235 / 90 / 225 | 372 / 171 / 7 |


Every one of the 5 real-route gap pairs named in `docs/sprite-order-real-route.md` is now covered except 283 and 19/7:
`104:opponent`, `297:opponent`, `225:player`, `98:opponent`, `185:opponent` are **EXACT-PLAN** (n=1 scenario each, two fresh runs identical);
`19` (Fly, both sides) and `7` (Fire Punch, both sides) are **NEEDS-KEYS**; `283` (Endeavor, both sides) is **still NOT-OBSERVED**
(see §5). Real-route battle-1 histories had 18 non-covered body edges: 104 (9), 297 (9), 225:player (8), 98 (5), 185 (2) become table-covered
(not re-replayed here; the plan-only replay below is over the scenario corpus).

Plan-only replay (the committed `spriteOrderBodyPlans.py` replay, unchanged logic, run over committed table + ext table = 1366 activation edges):
committed corpus 790 edges / 659 exact / **0 mismatched**; union corpus **1366 edges / 1053 preceded by EXACT plans / 1053 exact / 0 mismatched**
(`replayMismatches: []`; first edges 554/554, later edges 499/499). No committed (move, side) body regressed (0 EXACT-PLAN → NEEDS-KEYS);
23 (move, side) bodies appear in both corpora, all with an unchanged verdict (18 EXACT, 5 NEEDS-KEYS), i.e. the new scenarios independently
confirm those plans (e.g. `157:player` EXACT over 20 scenarios).

## 2. Weight model (ranking)

`tools/integration/spriteOrderPlanCoverageRank.py`. Set pools: `src/data/gen/battle-frontier-mons.json` (882 sets) indexed by the Level-50 ranges of
`src/data/gen/factory-round-policy.json` (`rentalSelection.ranges.level50`, the table `src/engine/factoryRentalGeneration.ts`
`getLevel50FactoryRentalRange` and `src/engine/factoryBrainOpponentGeneration.ts` draw from). Ordinary play = battles 0..6 (ranges 0..6, equal weight
per battle; range 7 only for streaks >= 7 is excluded), each set in a range equally likely (the engine's draw is `start + draw % size`, so uniform),
4 moves per set each one use; the same distribution is used for both orientations (opponent sets and the player's rentals come from the same
ranges; the "better range" +1 shift for rentals is not modelled). This is a use-share, not a time-share. 275 distinct moves, 157 of them in
`LIVE_MOVE_ANIMATION_IDS` today.

## 3. Newly EXACT (move, side)
| move | side | weight |
|---|---|---|
| 332 AERIAL_ACE | player | 1.11% |
| 104 DOUBLE_TEAM | opponent | 0.86% |
| 104 DOUBLE_TEAM | player | 0.86% |
| 185 FAINT_ATTACK | opponent | 0.48% |
| 98 QUICK_ATTACK | opponent | 0.47% |
| 98 QUICK_ATTACK | player | 0.47% |
| 317 ROCK_TOMB | opponent | 0.36% |
| 317 ROCK_TOMB | player | 0.36% |
| 207 SWAGGER | opponent | 0.35% |
| 207 SWAGGER | player | 0.35% |
| 243 MIRROR_COAT | opponent | 0.28% |
| 243 MIRROR_COAT | player | 0.28% |
| 174 CURSE | opponent | 0.26% |
| 174 CURSE | player | 0.26% |
| 318 SILVER_WIND | opponent | 0.26% |
| 318 SILVER_WIND | player | 0.26% |
| 226 BATON_PASS | opponent | 0.24% |
| 24 DOUBLE_KICK | opponent | 0.22% |
| 24 DOUBLE_KICK | player | 0.22% |
| 73 LEECH_SEED | opponent | 0.22% |
| 73 LEECH_SEED | player | 0.22% |
| 175 FLAIL | opponent | 0.20% |
| 175 FLAIL | player | 0.20% |
| 225 DRAGON_BREATH | player | 0.20% |
| 244 PSYCH_UP | opponent | 0.18% |
| 244 PSYCH_UP | player | 0.18% |
| 273 WISH | opponent | 0.18% |
| 273 WISH | player | 0.18% |
| 218 FRUSTRATION | opponent | 0.17% |
| 218 FRUSTRATION | player | 0.17% |
| 224 MEGAHORN | opponent | 0.15% |
| 224 MEGAHORN | player | 0.15% |
| 282 KNOCK_OFF | opponent | 0.15% |
| 282 KNOCK_OFF | player | 0.15% |
| 111 DEFENSE_CURL | opponent | 0.15% |
| 111 DEFENSE_CURL | player | 0.15% |
| 219 SAFEGUARD | opponent | 0.14% |
| 219 SAFEGUARD | player | 0.14% |
| 129 SWIFT | opponent | 0.13% |
| 129 SWIFT | player | 0.13% |
| 32 HORN_DRILL | opponent | 0.13% |
| 32 HORN_DRILL | player | 0.13% |
| 266 FOLLOW_ME | opponent | 0.13% |
| 266 FOLLOW_ME | player | 0.13% |
| 216 RETURN | opponent | 0.13% |
| 216 RETURN | player | 0.13% |
| 205 ROLLOUT | opponent | 0.11% |
| 205 ROLLOUT | player | 0.11% |
| 164 SUBSTITUTE | opponent | 0.11% |
| 164 SUBSTITUTE | player | 0.11% |
| 214 SLEEP_TALK | opponent | 0.11% |
| 214 SLEEP_TALK | player | 0.11% |
| 248 FUTURE_SIGHT | player | 0.11% |
| 275 INGRAIN | opponent | 0.09% |
| 275 INGRAIN | player | 0.09% |
| 35 WRAP | opponent | 0.09% |
| 35 WRAP | player | 0.09% |
| 194 DESTINY_BOND | opponent | 0.09% |
| 194 DESTINY_BOND | player | 0.09% |
| 285 SKILL_SWAP | opponent | 0.09% |
| 285 SKILL_SWAP | player | 0.09% |
| 271 TRICK | opponent | 0.09% |
| 271 TRICK | player | 0.09% |
| 329 SHEER_COLD | opponent | 0.07% |
| 329 SHEER_COLD | player | 0.07% |
| 314 AIR_CUTTER | opponent | 0.07% |
| 314 AIR_CUTTER | player | 0.07% |
| 193 FORESIGHT | opponent | 0.07% |
| 193 FORESIGHT | player | 0.07% |
| 183 MACH_PUNCH | opponent | 0.07% |
| 183 MACH_PUNCH | player | 0.07% |
| 245 EXTREME_SPEED | opponent | 0.06% |
| 245 EXTREME_SPEED | player | 0.06% |
| 326 EXTRASENSORY | opponent | 0.06% |
| 326 EXTRASENSORY | player | 0.06% |
| 191 SPIKES | opponent | 0.05% |
| 191 SPIKES | player | 0.05% |
| 212 MEAN_LOOK | opponent | 0.05% |
| 212 MEAN_LOOK | player | 0.05% |
| 269 TAUNT | opponent | 0.05% |
| 269 TAUNT | player | 0.05% |
| 327 SKY_UPPERCUT | opponent | 0.05% |
| 327 SKY_UPPERCUT | player | 0.05% |
| 310 ASTONISH | opponent | 0.04% |
| 220 PAIN_SPLIT | opponent | 0.04% |
| 220 PAIN_SPLIT | player | 0.04% |
| 149 PSYWAVE | opponent | 0.04% |
| 149 PSYWAVE | player | 0.04% |
| 297 FEATHER_DANCE | opponent | 0.04% |
| 297 FEATHER_DANCE | player | 0.04% |
| 298 TEETER_DANCE | opponent | 0.04% |
| 298 TEETER_DANCE | player | 0.04% |
| 20 BIND | opponent | 0.04% |
| 20 BIND | player | 0.04% |
| 278 RECYCLE | opponent | 0.04% |
| 278 RECYCLE | player | 0.04% |
| 118 METRONOME | opponent | 0.04% |
| 118 METRONOME | player | 0.04% |
| 171 NIGHTMARE | opponent | 0.04% |
| 171 NIGHTMARE | player | 0.04% |
| 254 STOCKPILE | opponent | 0.03% |
| 254 STOCKPILE | player | 0.03% |
| 256 SWALLOW | opponent | 0.03% |
| 256 SWALLOW | player | 0.03% |
| 190 OCTAZOOKA | opponent | 0.03% |
| 190 OCTAZOOKA | player | 0.03% |
| 279 REVENGE | opponent | 0.03% |
| 279 REVENGE | player | 0.03% |
| 71 ABSORB | opponent | 0.02% |
| 71 ABSORB | player | 0.02% |
| 123 SMOG | opponent | 0.02% |
| 123 SMOG | player | 0.02% |
| 169 SPIDER_WEB | opponent | 0.02% |
| 169 SPIDER_WEB | player | 0.02% |
| 328 SAND_TOMB | opponent | 0.02% |
| 328 SAND_TOMB | player | 0.02% |
| 265 SMELLING_SALT | opponent | 0.02% |
| 265 SMELLING_SALT | player | 0.02% |
| 155 BONEMERANG | opponent | 0.02% |
| 155 BONEMERANG | player | 0.02% |
| 304 HYPER_VOICE | opponent | 0.02% |
| 304 HYPER_VOICE | player | 0.02% |
| 37 THRASH | opponent | 0.02% |
| 37 THRASH | player | 0.02% |
| 262 MEMENTO | opponent | 0.02% |
| 262 MEMENTO | player | 0.02% |
| 276 SUPERPOWER | opponent | 0.02% |
| 276 SUPERPOWER | player | 0.02% |
| 120 SELF_DESTRUCT | opponent | 0.02% |
| 120 SELF_DESTRUCT | player | 0.02% |
| 162 SUPER_FANG | opponent | 0.02% |
| 162 SUPER_FANG | player | 0.02% |
| 158 HYPER_FANG | opponent | 0.02% |
| 158 HYPER_FANG | player | 0.02% |
| 284 ERUPTION | opponent | 0.02% |
| 187 BELLY_DRUM | opponent | 0.02% |
| 187 BELLY_DRUM | player | 0.02% |

137 cells, +16.59%


Caveat: many newly EXACT bodies rest on **one** scenario (125 ext-only EXACT bodies have n=1). The committed corpus's evidence that single-slot/static
bodies are species-independent (72 bodies with n>=2, all identical; the 23 overlaps above) supports reuse, but a production consumer should keep
invalidating on the event rules, not trust n=1 bodies beyond that evidence.

## 4. New NEEDS-KEYS (were NOT-OBSERVED)

Group reason: nearly all are "equal priority word, different y" (a multi-destroy group whose members share `priority<<8|subpriority` and differ in
`oam.y`; order = live y, species/position dependent) - the same cause as the committed NEEDS-KEYS list (`sprite-order-gap-causes.md`). A few add
"observed order contradicts key/creation rule" (crossed tie) or "plan varies between scenarios" (Fly, Bounce, Sky Attack, Fury Cutter: first body
vs later body differ).

| move | side | weight | reasons |
|---|---|---|---|
| 58 ICE_BEAM | opponent | 0.99% | equal priority word, different y (y is species/position dependent) (n=1) |
| 58 ICE_BEAM | player | 0.99% | equal priority word, different y (y is species/position dependent) (n=1) |
| 85 THUNDERBOLT | opponent | 0.81% | equal priority word, different y (y is species/position dependent) (n=2) |
| 85 THUNDERBOLT | player | 0.81% | equal priority word, different y (y is species/position dependent) (n=1) |
| 213 ATTRACT | opponent | 0.75% | observed order contradicts key/creation rule (n=1) |
| 213 ATTRACT | player | 0.75% | observed order contradicts key/creation rule (n=1) |
| 46 ROAR | opponent | 0.59% | equal priority word, different y (y is species/position dependent) (n=1) |
| 46 ROAR | player | 0.59% | equal priority word, different y (y is species/position dependent) (n=1) |
| 44 BITE | opponent | 0.46% | equal priority word, different y (y is species/position dependent) (n=1) |
| 44 BITE | player | 0.46% | equal priority word, different y (y is species/position dependent) (n=1) |
| 240 RAIN_DANCE | opponent | 0.42% | equal priority word, different y (y is species/position dependent) (n=1) |
| 240 RAIN_DANCE | player | 0.42% | equal priority word, different y (y is species/position dependent) (n=1) |
| 315 OVERHEAT | opponent | 0.38% | equal priority word, different y (y is species/position dependent) (n=1) |
| 315 OVERHEAT | player | 0.38% | equal priority word, different y (y is species/position dependent) (n=1) |
| 91 DIG | opponent | 0.37% | observed order contradicts key/creation rule (n=2) |
| 91 DIG | player | 0.37% | observed order contradicts key/creation rule (n=2) |
| 8 ICE_PUNCH | opponent | 0.35% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 8 ICE_PUNCH | player | 0.35% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 7 FIRE_PUNCH | opponent | 0.33% | equal priority word, different y (y is species/position dependent) (n=1) |
| 7 FIRE_PUNCH | player | 0.33% | equal priority word, different y (y is species/position dependent) (n=1) |
| 126 FIRE_BLAST | opponent | 0.30% | equal priority word, different y (y is species/position dependent) (n=1) |
| 126 FIRE_BLAST | player | 0.30% | equal priority word, different y (y is species/position dependent) (n=1) |
| 352 WATER_PULSE | opponent | 0.24% | equal priority word, different y (y is species/position dependent) (n=1) |
| 352 WATER_PULSE | player | 0.24% | equal priority word, different y (y is species/position dependent) (n=1) |
| 349 DRAGON_DANCE | opponent | 0.20% | equal priority word, different y (y is species/position dependent) (n=1) |
| 349 DRAGON_DANCE | player | 0.20% | equal priority word, different y (y is species/position dependent) (n=1) |
| 179 REVERSAL | opponent | 0.17% | observed order contradicts key/creation rule (n=1) |
| 179 REVERSAL | player | 0.17% | observed order contradicts key/creation rule (n=1) |
| 261 WILL_O_WISP | opponent | 0.15% | equal priority word, different y (y is species/position dependent) (n=1) |
| 261 WILL_O_WISP | player | 0.15% | equal priority word, different y (y is species/position dependent) (n=1) |
| 209 SPARK | opponent | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 209 SPARK | player | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 313 FAKE_TEARS | opponent | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 313 FAKE_TEARS | player | 0.13% | equal priority word, different y (y is species/position dependent) (n=2) |
| 258 HAIL | player | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 210 FURY_CUTTER | opponent | 0.13% | plan varies between scenarios (n=4) |
| 210 FURY_CUTTER | player | 0.13% | plan varies between scenarios (n=4) |
| 80 PETAL_DANCE | opponent | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 80 PETAL_DANCE | player | 0.13% | equal priority word, different y (y is species/position dependent) (n=1) |
| 69 SEISMIC_TOSS | opponent | 0.12% | equal priority word, different y (y is species/position dependent) (n=1) |
| 69 SEISMIC_TOSS | player | 0.12% | equal priority word, different y (y is species/position dependent) (n=1) |
| 309 METEOR_MASH | opponent | 0.11% | equal priority word, different y (y is species/position dependent) (n=1) |
| 309 METEOR_MASH | player | 0.11% | equal priority word, different y (y is species/position dependent) (n=1) |
| 324 SIGNAL_BEAM | opponent | 0.09% | equal priority word, different y (y is species/position dependent) (n=1) |
| 324 SIGNAL_BEAM | player | 0.09% | equal priority word, different y (y is species/position dependent) (n=1) |
| 230 SWEET_SCENT | opponent | 0.09% | equal priority word, different y (y is species/position dependent) (n=1) |
| 230 SWEET_SCENT | player | 0.09% | equal priority word, different y (y is species/position dependent) (n=1) |
| 19 FLY | opponent | 0.09% | plan varies between scenarios (n=2) |
| 19 FLY | player | 0.09% | plan varies between scenarios (n=2) |
| 18 WHIRLWIND | opponent | 0.08% | equal priority word, different y (y is species/position dependent) (n=1) |
| 18 WHIRLWIND | player | 0.08% | equal priority word, different y (y is species/position dependent) (n=1) |
| 340 BOUNCE | opponent | 0.08% | plan varies between scenarios (n=2) |
| 340 BOUNCE | player | 0.08% | plan varies between scenarios (n=2) |
| 142 LOVELY_KISS | opponent | 0.07% | equal priority word, different y (y is species/position dependent) (n=1) |
| 142 LOVELY_KISS | player | 0.07% | equal priority word, different y (y is species/position dependent) (n=1) |
| 351 SHOCK_WAVE | opponent | 0.07% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 351 SHOCK_WAVE | player | 0.07% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 301 ICE_BALL | opponent | 0.06% | equal priority word, different y (y is species/position dependent) (n=1) |
| 301 ICE_BALL | player | 0.06% | equal priority word, different y (y is species/position dependent) (n=5) |
| 260 FLATTER | opponent | 0.04% | equal priority word, different y (y is species/position dependent) (n=1) |
| 260 FLATTER | player | 0.04% | equal priority word, different y (y is species/position dependent) (n=1) |
| 310 ASTONISH | player | 0.04% | equal priority word, different y (y is species/position dependent) (n=1) |
| 13 RAZOR_WIND | opponent | 0.04% | equal priority word, different y (y is species/position dependent) (n=2) |
| 13 RAZOR_WIND | player | 0.04% | equal priority word, different y (y is species/position dependent) (n=2) |
| 350 ROCK_BLAST | opponent | 0.04% | equal priority word, different y (y is species/position dependent) (n=2) |
| 350 ROCK_BLAST | player | 0.04% | equal priority word, different y (y is species/position dependent) (n=2) |
| 173 SNORE | opponent | 0.04% | equal priority word, different y (y is species/position dependent) (n=1) |
| 173 SNORE | player | 0.04% | equal priority word, different y (y is species/position dependent) (n=1) |
| 237 HIDDEN_POWER | opponent | 0.02% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 237 HIDDEN_POWER | player | 0.02% | equal priority word, different y (y is species/position dependent); observed order contradicts key/creation rule (n=1) |
| 41 TWINEEDLE | opponent | 0.02% | equal priority word, different y (y is species/position dependent) (n=2) |
| 41 TWINEEDLE | player | 0.02% | equal priority word, different y (y is species/position dependent) (n=2) |
| 312 AROMATHERAPY | opponent | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |
| 312 AROMATHERAPY | player | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |
| 192 ZAP_CANNON | opponent | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |
| 192 ZAP_CANNON | player | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |
| 143 SKY_ATTACK | opponent | 0.02% | plan varies between scenarios (n=2) |
| 143 SKY_ATTACK | player | 0.02% | plan varies between scenarios (n=2) |
| 255 SPIT_UP | opponent | 0.02% | equal priority word, different y (y is species/position dependent) (n=2) |
| 255 SPIT_UP | player | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |
| 284 ERUPTION | player | 0.02% | equal priority word, different y (y is species/position dependent) (n=1) |


## 5. Still NOT-OBSERVED
| move | side | weight | live id |
|---|---|---|---|
| 226 BATON_PASS | player | 0.24% | False |
| 270 HELPING_HAND | opponent | 0.18% | False |
| 270 HELPING_HAND | player | 0.18% | False |
| 283 ENDEAVOR | opponent | 0.11% | False |
| 283 ENDEAVOR | player | 0.11% | False |
| 0 UNAVAILABLE | opponent | 0.06% | False |
| 0 UNAVAILABLE | player | 0.06% | False |

7 cells remain, 0.95%

Why: `270 Helping Hand` fails in singles (no animation body), `283 Endeavor` produced no 283 body in either generic scenario (equal HP in the
minimal template; needs a staged low-HP attacker - not done), `226 Baton Pass` has no switch-target flow in the minimal template, `0 UNAVAILABLE`
is not a real move. All 7 cells together are 0.95% of weighted uses. Mirror Coat (243) was probed through stock scenarios and is EXACT.

## 6. Method, scenarios, determinism

* Stock BattleLab scenarios `tools/battle-lab/mechanic-<move>-*.json` with the attacker on the pair's side and `profile: battle-scene-on`
  (Scene-OFF `*-off` scenarios are rejected by the Scene-ON probe) were run through `tools/compare/spriteOrderEventProbe.py` (direct in-process mGBA,
  never the HTTP oracles): 195 stock scenarios in the final union (228 raw rows: 195 stock + 33 generated; 223 yielded an activation edge). For pairs with no usable stock scenario, `tools/integration/spriteOrderPlanCoverageScenarios.py` generates a
  minimal scenario from `mechanic-quick-attack-{,player-}pidgeotto-onix.json` (lead's four moves = [move]*4, same A,A trace) into
  `tools/integration/fixtures/plan-coverage-scenarios/` (33 files; `--force` adds some for pairs whose stock scenario never produced a body).
* **Determinism:** every scenario was run twice (`--repeat 2`); all 249 compared run pairs (171 + 29 + 34 + 15, over four passes; some scenarios recur across passes) had identical `rows` and frame counts
  (0 differ). Only `-0` rows enter the table; raw rows live in /tmp and are not committed.
* 223 of the scenarios yielded >= 1 activation edge and are in `sprite-order-body-events-ext.json` (0.5 MB). The ext plans file is 1.6 MB.

## 7. Files and regeneration

New files only: `tools/integration/spriteOrderPlanCoverageRank.py` (weights + verdict lookup), `spriteOrderPlanCoverageProbe.py` (probe sweep),
`spriteOrderPlanCoverageScenarios.py` (scenario generator), `spriteOrderBodyPlansExt.py` (wrapper; imports `spriteOrderBodyPlans.py`, redirects its
TABLE/PLANS to a temp union table, adds per-body `provenance` = committed / ext / committed+ext + ext scenario names), `spriteOrderPlanCoverageReport.py`
(before/after tables), fixtures `sprite-order-body-events-ext.json`, `sprite-order-body-plans-ext.json`, `plan-coverage-scenarios/`.

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py; PY=$V/mgba-venv/bin/python
python3 tools/integration/spriteOrderPlanCoverageScenarios.py [--force]                       # generic scenarios for uncovered pairs
$PY tools/integration/spriteOrderPlanCoverageProbe.py /tmp/ev-ext  --repeat 2                  # pass 1 (committed plans decide the pairs)
$PY tools/integration/spriteOrderPlanCoverageProbe.py /tmp/ev-ext3 --plans tools/integration/fixtures/sprite-order-body-plans-ext.json --repeat 2 --max-per-pair 3   # later passes
mkdir /tmp/ev-all; cp /tmp/ev-ext*/*-0.json /tmp/ev-all/                                       # union, first copy wins (cp -n)
python3 tools/integration/spriteOrderBodyPlansExt.py --extra /tmp/ev-all --write               # ext table + ext plans (pure python3)
python3 tools/integration/spriteOrderBodyPlansExt.py --write                                   # plans-ext from the committed ext table only
python3 tools/integration/spriteOrderPlanCoverageReport.py                                     # before/after tables
```
Unchanged by this work: `spriteOrderEventModel.py` (array 40185/0) and `spriteOrderBodyPlans.py` (246 EXACT / 93 NEEDS-KEYS, 790/659/0 replay).
