# S10A plans54 — presentation inputs for the order host: Fury Cutter, Hail / HAIL_CONTINUES, Blizzard, Water Spout; Eruption fail-closed

Side lane, evidence + production in one step, using the prep45 / gdgeo / plans48 / plans51 method.
- Base: master `54cc50272` (src tree `503eb721`).
- Tested code: `3b68497b8` (src tree `4be4f535`). Later commits touch docs, tests, tools and fixtures only.
- Receipt: `tools/integration/fixtures/plans54-live-receipt.json`. Fixtures: `tools/integration/fixtures/plans54/`.

## Results

**Census, seeds 0..299** (`liveShareCensus.ts`, paired by `prep43CensusDelta.py`), base `54cc50272` against the tested code.
- 7970 commands, 0 pairing mismatches, identical command sequence.
- Battle digest identical: `0fd00eae…9137`.
- **0 live → fallback regressions.**

| | live by count | live by frames |
|---|---|---|
| `54cc50272` | 7617 / 7970 = **95.57 %** | 1130925 = **96.81 %** |
| plans54 | **7710 = 96.74 % (+93)** | **1144352 = 97.96 % (+13427)** |

Gains by first stop (the before-decline detail):

| first stop | live | still not live |
|---|---|---|
| `body 258:opponent` (Hail) | 17 / 2404 | — |
| `body 258:player` | 9 / 1238 | 2 (then Ice Ball 301) |
| `general animation HAIL_CONTINUES` | 11 / 1425 | — |
| `body 59:opponent` (Blizzard) | 10 / 1826 | — |
| `body 210:player` (Fury Cutter) | 16 / 1640 | 1 (case-local gate) |
| `body 210:opponent` | 6 / 914 | 1 (case-local gate) |
| `body 323:opponent` (Water Spout) | 4 / 1112 | — |
| `body 284:player` (Eruption, CAMERUPT) | 1 / 51 | — |
| `presentation: unclassified (case-local gate)` | 11 / 1981 | 23 |
| `presentation: sprite allocator history unknown` | 8 / 836 | 21 |

Chain predictor (`prep45Chains.py --cleared` the six units `--after`):
- predicted 56 commands / 8469 frames;
- measured predicted & live 55 / 8426, predicted & not live 1 / 43 (a case-local gate), not predicted & live 19 / 2184. The last group
  is later bodies of chains the instrument attributes elsewhere: Fury Cutter → Fury Cutter, and case-local / allocator-history declines
  whose case reads the order lend.

**Ranking (re-run on `54cc50272`, `fixtures/plans54/chains-before-seeds0-299.json`).** It is identical to plans51's: 169 order-lend-unknown
declines / 23963 frames. The in-scope greedy order was Water Spout 1112, then HAIL_CONTINUES 1017 → Hail 3642 → Blizzard 1826, then Fury
Cutter 821 (Eruption 51).

**Per-unit verdicts.** The probes are `plans54Probe.py`: direct mGBA, never the HTTP oracles. Every job pins its lab seed and runs twice
in fresh processes inside one batch. 36 jobs, **all A == B**. The per-frame check is `plans54Check.ts`, prep45Check's `checkUnit`
against the production text.

| unit | key / plan source | ROM instances exact | frames | predicted before probe |
|---|---|---|---|---|
| Fury Cutter 210 | **payload `furyCutterCounter`**: 210 / 10210 / 20210 / 30210 (counter 1 / 2 / 3 / 4+). `Cf;D0` / `Cff;D1;D0` | **25 / 25**: counters 1..5 on both sides, GROVYLE / SCYTHER per side | 71 | yes, from source (slice ~25 callbacks; blend ~10 / ~18): 25 / 25 |
| Hail 258 | geometry (both battlers): `hailSpriteOrderPlan.ts` over hail.ts's timeline + a SortSprites replay | **8 / 8**: 4 (player, opponent) pairs × both attacker sides | 286 | **8 / 8** (`hail-predictions.json`, committed `559c85a64`) |
| HAIL_CONTINUES | the same plan, **seam: species at a general-animation event** | **16 / 16**: 2 end turns × 8 jobs | 572 | **16 / 16** |
| Blizzard 59 | geometry (attacker, target): `blizzardSpriteOrderPlan.ts` over blizzard.ts's allocator replay | **11 / 11**: 4 pairs per side (7 player, 4 opponent) | 698 | **11 / 11** (`bcc24a497`, `3fa4d5282`) |
| Water Spout 323 | **seam: attacker HP (displayed field) + the lent order**: `waterSpoutSpriteOrderPlan.ts` over waterSpout.ts's timeline | **23 / 23**: NOSEPASS tiers 0..3 on both sides; MAGIKARP tiers 0..3 opponent, 2..3 player | 989 | 4 / 4 known-entry first bodies (`5e0add3f7`, `aa22833d6`); later bodies use the same committed function at the ROM's own start order |
| Eruption 284 | **fail-closed** by attacker species (`eruptionSpriteOrderPlan.ts`, ROM receipts only) | **12 / 12**: plans51 `er-*` + CAMERUPT 340 both sides | 304 | — (ROM receipts, no model) |

Fits before the predictions: the existing ROM corpus instances (`sprite-order-body-plans-ext.json`) equal each model. That covers Hail
258:player and 258:opponent (DELIBIRD vs ONIX), Blizzard 59:player and 59:opponent (PELIPPER vs ONIX), and Water Spout 323:player and
323:opponent (NOSEPASS vs SHUCKLE).

**Correctness first: ISSUES #155 (Eruption) → FAIL CLOSED.**
- The launch rocks start at the attacker sprite (`CreateEruptionLaunchRocks` / `GetEruptionLaunchRockInitialYPos`) and destroy
  off-screen. Same-frame destroy groups follow the attacker geometry only; the target is never read.
- The ROM shows 2 opponent plans and 3 player plans over 5 attacker species.
- No allocation-faithful rock timeline exists to geometry-key from. 284 now joins `SPRITE_ORDER_GEOMETRY_KEYED_BODIES`: a plan exists only
  at the ROM-proven attacker species, and anything else invalidates. The base `284:*` rows are no longer read.
- **Finding:** battle-lab species are INTERNAL ids. plans51's "camerupt" Eruption scenarios stage 323 = **BARBOACH**, so CAMERUPT (340, the
  only Factory user) had no receipt. plans54 probed it on both sides: its opponent plan equals the base row, and its player plan is a third
  player plan.
- In the same way, the "wailmer" Water Spout scenarios stage **NOSEPASS** 320.
- Test that fails without the change: `spriteOrderPlans54.test.ts`, "an unproven attacker … invalidates" (the base row used to apply).

**Not landed: none of the assigned units.** Out of scope as briefed: Dive / Fly / Bounce, SUBSTITUTE_FADE, Shock Wave, allocator
history, case-local / later-body gates.

## Production change

**Payload (Fury Cutter).**
- `battleScriptHitChainOpcode.ts` `Cmd_attackanimation`: the MOVE_ANIMATION of move 210 carries a 7th argument,
  `attackerBattler.furyCutterCounter`, read after `Cmd_furycuttercalc`. This is the Rollout / Ice Ball precedent; no gameplay state is
  written.
- `battleMoveAnimationRequest` parses it into the (moveId-gated) `rolloutCounter` field. Every consumer of that field checks the move id,
  and the case-210 renderer does not read it.
- `liveSpriteOrderHost.ts` `orderEventOf` keys by `FURY_CUTTER_ORDER_KEYS`. A body without the counter invalidates.
- Right / left (`counter & 1`) does not change allocation: counters 1..5 cover both parities, all exact.

**Seams.**
- `factoryRoundBattleOrchestrator.ts` `liveSpriteOrderBodyPlanAt`:
  - For Move_HAIL (258) at a non-command event, i.e. HAIL_CONTINUES, it resolves the displayed species: the segment field plus the
    switch-ins completed before that event (`liveSpriteOrderSpeciesBefore`).
  - It passes the command's displayed field (Water Spout's attacker HP) and the host's lent order to the geometry seam.
- `liveSpriteOrderHost.ts`:
  - It asks for 258's plan at HAIL_CONTINUES too, but only while both battler sprites are tracked and shown (`IsBattlerSpriteVisible`
    moves a hidden or fainted battler's targets to fixed coordinates).
  - The `lentFree` passed is `spriteOrderTrackerLend`, entry labels, exactly as the case-323 renderer gets it. The raw tracker free
    order is not in entry labels after a role change (census battle 153).
- `spriteOrderEventTransform.ts`:
  - `SPRITE_ORDER_GEOMETRY_KEYED_BODIES` gains 284, 258, 59 and 323.
  - The new `SPRITE_ORDER_GEOMETRY_KEYED_ANIMS` holds HAIL_CONTINUES.
  - A general-animation event may carry `geometryPlan`.
- `liveMoveAnimation.ts` `liveMoveGeometrySpriteOrderPlanText`:
  - It takes optional `field` / `lentFree` arguments.
  - New cases 284 / 258 / 59 / 323 (helpers `liveHailSpriteOrderPlanText`, `liveBlizzardSpriteOrderPlanText`).
- New generators in `src/animation/`: `eruptionSpriteOrderPlan.ts`, `hailSpriteOrderPlan.ts`, `blizzardSpriteOrderPlan.ts`,
  `waterSpoutSpriteOrderPlan.ts`.
  - They handle same-frame slot reuse: a slot freed and re-taken in one frame is not an allocation event, the ROM extraction's
    semantics.
  - No renderer case, allocator or reducer changed.

**Plans.** `fixtures/plans54/plan-rows.json` (rows-v1, from `plans54PlanRows.ts` over `check.json`) is appended after plans51 in
`spriteOrderProductionTable.ts`, and the table is regenerated. Bodies go 527 → 535 (Fury Cutter keys × 2 sides). Plans stay at 221: the
Fury Cutter texts deduplicate to existing plans. No base index moved.

**Scene ON/OFF parity** (`words57Parity.ts`, final code, `fixtures/plans54/parity/`). Census battles 45 (Fury Cutter: payload), 14 (Hail
+ HAIL_CONTINUES: the general-animation seam), 153 (Water Spout: field + lend) and 48 (Blizzard). Each run covers ON (presentation
seed A) twice fresh, ON with seed B, and OFF.
- The logical state and gameplay RNG at every command are identical: 30 / 20 / 60 / 21 snapshots.
- The tool exits 1 only because these battles have no faithful-random consumer frames, its own words57 requirement.

**Corpus replays** (0 mismatches throughout):

| replay | known (before → after) | exact | mismatched |
|---|---|---|---|
| `prep45CorpusReplay.ts`, corpus, turn-keyed | 1159 → **1173** | 1173 | 0 |
| `prep45CorpusReplay.ts`, prep45 probes | 241 → 240 | 240 | 0 |
| `plans51CorpusReplay.ts`, plans51 probes | 203 → 201 | 201 | 0 |

- The corpus gains 14 edges after Fury Cutter bodies. The corpus has no counter, so every body is fed `Cf;D0`; `Cff;D1;D0` leaves the
  same free order.
- The −1 / −2 edges are after geometry-keyed bodies (Blizzard / Eruption). The replays feed move ids without species, and these bodies
  now fail closed there.

**Pins that moved:**
- `tests/spriteOrderEventTransform.test.ts`: table 527 → 535 bodies (221 plans), plus `plans54/plan-rows.json` in the merge list.
- The same file's corpus replay pin: known / exact 1159 → 1173, later 605 → 619, unkeyed 1159 / 1156 → 1173 / 1170 (the same 3
  mismatches).
- No other sprite-order / lend / allocator / geometry pin moved.

**New tests:**
- `tests/spriteOrderPlans54.test.ts` (11 tests): every ROM instance is per-frame exact under production; predictions equal production;
  host keys and lends; fail-closed cases.
- `tests/battleScriptHitChainOpcode.test.ts`: the furyCutterCounter argument.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py
    ../../vendor/mgba-venv/bin/python tools/integration/plans54Probe.py /tmp/p54 --jobs 8 [--only BODY210,...]
    python3 tools/integration/plans54Extract.py /tmp/p54 /tmp/p54-units.json
    node --experimental-strip-types tools/integration/plans54Check.ts /tmp/check.json tools/integration/fixtures/plans51/units.json tools/integration/fixtures/plans54/units.json
    node --experimental-strip-types tools/integration/plans54PlanRows.ts tools/integration/fixtures/plans54/check.json /tmp/rows.json
    node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts && git diff --exit-code src
    node --experimental-strip-types tools/integration/plans54{Hail,Blizzard,WaterSpout}Predict.ts /tmp/pred.json   # == the committed predictions
    node --experimental-strip-types tools/integration/prep45CorpusReplay.ts /tmp/replay.json
    node --experimental-strip-types tools/integration/liveShareCensus.ts --seeds=0..299 --out=/tmp/after.json --commands=/tmp/after.jsonl
    python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> /tmp/after.json /tmp/after.jsonl /tmp/delta.json
    node --experimental-strip-types tools/integration/words57Parity.ts <45|14|153|48> /tmp/parity.json

Caveats:
- The units fixture merges four probe batches: Eruption + Fury Cutter, Hail, Blizzard, Water Spout. Each job's A / B pair is from one
  batch.
- The plans are n-relative and applied on the raw tracker. The relabel (rho) argument of docs/playerfaint-lend-audit.md §3 carries them
  to non-entry occupancies, as for every existing plan; the probes are all at the known-entry occupancy.
