# S10A plans51 — the next tail of sprite-order host stops: EXACT / KEYED / GEOMETRY-KEYED order plans

Side lane, evidence + production in one step, using the prep43 / prep45 / gdgeo / plans48 method.
- Base: master `ccc4774c4` (src tree `dde58985`).
- Tested code: `584b69147` (src tree `51b9db0b`). Later commits touch docs, tests, tools and fixtures only.
- Receipt: `tools/integration/fixtures/plans51-live-receipt.json`. Fixtures: `tools/integration/fixtures/plans51/`.

## Results

**Census, seeds 0..299** (`liveShareCensus.ts`, paired by `prep43CensusDelta.py`), base `ccc4774c4` against the tested code.
- 7970 commands, 0 pairing mismatches, identical command sequence.
- Battle digest identical: `069618f1…afe0`.
- **0 live → fallback regressions.**

| | live by count | live by frames |
|---|---|---|
| `ccc4774c4` | 7385 / 7970 = **92.66 %** | 1099550 = **94.12 %** |
| plans51 | **7390 = 92.72 % (+5)** | **1100612 = 94.21 % (+1062)** |

Gains by first stop:

| first stop | live | stopping after (out of scope) |
|---|---|---|
| Outrage `body 200:opponent` | 3 of 4 commands, 690 of 809 frames | 1 at "later-body (order lend not a first body)" |
| `general animation FOCUS_BAND` | 2 of 3 commands, 372 of 533 frames | 1 at "later-body (order lend not a first body)" |

Chain predictor (`prep45Chains.py --cleared "body 200 OUTRAGE|general animation FOCUS_BAND" --after`):
- predicted 7 commands / 1342 frames;
- measured predicted & live 5 / 1062, predicted & not live 2 / 280 (the consumer gate above), not predicted & live 0.

Report sha256:

| file | sha256 |
|---|---|
| before report | `cc268184…d097` |
| before jsonl | `3ea9f865…393d` |
| after report | `5e868113…6c` |
| after jsonl | `d57b8c38…dc` |
| delta | `d24a0776…87e7` |

Full hashes are in the receipt.

**Per-unit verdicts.**
- Probes are `plans51Probe.py`: direct mGBA, never the HTTP oracles. 140 jobs, every job twice in fresh processes, **all A == B**.
- The per-frame check is `plans51Check.ts`, prep45Check's `checkUnit`: the production cursor applies the plan prefix through every
  allocation window, and created / destroyed / F must equal the ROM after each one. A single survivor must be destroyed by the next
  allocation window (the carry).

| unit (host key) | verdict / plan | ROM instances (exact / total), allocation frames | species | source |
|---|---|---|---|---|
| body 200 Outrage (`200:player`, `200:opponent`) | **EXACT**, both sides identical (23 flames: `Cf`×14, `Cf/D0`, `Cf/D1`, …, `D22`) | **147 / 147**, 6468 | 4 (attacker, defender) pairs per side: Dragonite→Onix, Dragonite→Snorlax, Golbat→Onix, Snorlax→Golbat; plus the Outrage bodies of the FOCUS_BAND / SUBSTITUTE_FADE stagings (incl. locked 2nd / 3rd turns) | `Move_OUTRAGE`: fixed-argument `create_outrage_flame_sprite`, `TranslateSpriteLinearAndFlicker` for 30 frames; no Random2 |
| general FOCUS_BAND (`General:B_ANIM_FOCUS_BAND`) | **EXACT** `Cf;D0;Cf;D1;Cf` + carry | **14 / 14** (14 carries), 84 | holder Magikarp / Caterpie on both sides | `General_FocusBand`: two `simple_palette_blend` controller sprites, then `gSlideMonToOriginalPosSpriteTemplate`, which survives the script's `end` and is destroyed by the next allocation window (the ITEM_KNOCKOFF precedent) |

FOCUS_BAND staging (the plans48 sweep never reached it):
- the holder takes an OHKO from Dragonite's Outrage (the Outrage lab scenarios with the defender's lead set to Magikarp 129 /
  Caterpie 10, holding Focus Band 196);
- the band's 10 % roll is swept by the lab seed: 30 seeds per (side, holder), 120 jobs. 14 activations.

**Not landed (each still invalidates):**

- **SUBSTITUTE_FADE** (greedy gain 1487 on this census): NOT REACHED. Two stagings show the Substitute body and the breaking hit
  (and its hit animation), but no `General_SubstituteFade` body follows.
  - plans48's staging, Golbat / Crobat Substitute vs Rhydon's Rock Slide, re-run with +1800 idle frames.
  - Crobat / Golbat Substitute vs Dragonite's 90-power STAB Outrage. That damage is well over a level-50 substitute's HP.

  After the hit nothing animates for more than 1300 frames, and the locked Outrage does not continue. The probe rows carry no HP or
  `substituteHP`, so the cause is not identified. The `sf-*` jobs stay in the probe list as the record. The script is
  tasks-only, so an empty plan is likely but unproven.
  Resume: a staging that shows the fade body, e.g. a probe that also reads `gDisableStructs[].substituteHP` / the battle-script
  cursor, or a census-route replay on mGBA.
- **Shock Wave 351** (693): GEOMETRY, and the reducer is not allocation-faithful. `plans51ShockWaveFit.ts` derives the plan from
  `shockWave.ts`'s own timeline (`shockWaveAtAge`: owned sprites plus the modelled sSpriteOrder painter order; creations first-free in
  slot order; a same-age destroy group in the previous age's painter order). The reducer inputs are the ones the live `case 351` adapter
  builds. Against plans48's 8 ROM receipts:
  - windows 0..36 are exact on all 8;
  - window 37 (f+81) diverges everywhere: the two duration-40 charging particles stay allocated in the ROM until f+92 / f+93, while
    the reducer ends them at f+79 / f+80 (pixel-neutral for the renderer);
  - with those two lifetimes forced to the ROM's, the next divergence is windows 40..46 (bolt lifetimes);
  - on the opponent side the ROM has 79 windows, the model 98.

  No predictions were recorded and no grid was probed, because the model fails its own fit data.
  Resume: an allocation-faithful Shock Wave timeline (animation lane, `shockWave.ts`), then this generator through the seam
  (`liveMoveGeometrySpriteOrderPlanText` + `SPRITE_ORDER_GEOMETRY_KEYED_BODIES`).
- **Eruption 284** (51; `body 284:player` only): GEOMETRY. Probed for an EXACT plan, 4 pairs per side: **2 ROM plans per side**.
  `AnimTask_EruptionLaunchRocks`' rocks start at the attacker, and the destroy groups split or merge with its geometry (opponent
  Golbat, player Snorlax). Not landed.
  - **Finding (pre-existing, not changed):** the base table's `284:opponent` plan (`sprite-order-body-plans-ext.json`) is per-frame
    exact on 3 / 4 opponent instances (Camerupt → Onix / Snorlax, Snorlax → Golbat), not on the elevated Golbat attacker (ROM
    23 windows vs plan 25: two destroy pairs share a frame).
  - In this census (seeds 0..299) no opponent Eruption mis-carried: corpus replays have 0 mismatches. An elevated Eruption user
    would carry a wrong order.
  - Resume: geometry-key 284 (both sides) from an Eruption reducer timeline, as above.
- **Fury Cutter 210** (821): needs the hit count. The script branches on `AnimTask_GetFuryCutterHitCount` /
  `AnimTask_IsFuryCutterHitRight` (`gDisableStructs[attacker].furyCutterCounter`). It is not reachable from the event or the host's
  state: the MOVE_ANIMATION request carries no counter, and the live adapter itself only claims the counter-1 first body
  (`liveMoveAnimation.ts` `case 210`). Reconstructing the counter from the event history would re-derive gameplay state.
  - Exact change needed: the kernel's MOVE_ANIMATION payload for move 210 carries `furyCutterCounter` after `Cmd_furycuttercalc`
    (`src/engine/battleScriptHitChainOpcode.ts`, the furycuttercalc / attackanimation path), mapped in
    `liveSpriteOrderHost.ts` `orderEventOf` to keys 210 / 10210 / 20210 / 30210 (count 1 / 2 / 3 / 4+) × right / left.
  - Parity proof required: Scene ON/OFF parity on one Fury Cutter route, battle digest identical.
- **Water Spout 323** (1112): HP-keyed (`GetWaterSpoutPowerForAnim`). The geometry seam is called by
  `factoryRoundBattleOrchestrator.ts:265-272` (`liveSpriteOrderBodyPlanAt`) with species only.
  - Exact change needed (sibling's file): pass the attacker's `hp` / `maxHP` of `battleResolutionMoveAnimationField(...)` to
    `liveMoveGeometrySpriteOrderPlanText`, then a plan from `waterSpout.ts`'s timeline at that HP tier.
- **HAIL_CONTINUES** (1017; unlocks Hail 258 with it, 3642, and Blizzard 59): geometry. `General_Hail: goto Move_HAIL`, and
  `GenerateHailParticle` targets the visible battlers' coordinates. `liveSpriteOrderBodyPlanAt` resolves the displayed field only at a
  **move-animation command** (`battleResolutionMoveAnimationField`), and WEATHER_VAR is not one
  (`battleResolutionPresentation.ts:3398-3418`).
  - Exact change needed (orchestrator): a field lookup at a general-animation event sequence (the segment field after the commands
    completed before that sequence), so the host can request a plan for HAIL_CONTINUES.
  - Hail body 258 alone unlocks 1 command / 51 frames here, and Blizzard alone 0, so neither was attempted without it.
- **Dive 291** (5013), **Fly 19** (376), **Bounce 340** (51): two-turn semi-invulnerable.
  - The host invalidates on "semi-invulnerable battler hidden" by design (`liveSpriteOrderHost.ts` `orderEventOf`: animations are
    skipped for a STATUS3_SEMI_INVULNERABLE battler). Dig has its own deferred handling.
  - Dive's setup is also words-dependent (prep45). Its resolution is the deferred lend plus the later-body consumer gate (out of scope).
  - The chain instrument's "solo" gain for these units ignores the hide invalidation.
- **Ice Ball 301**, **Mud-Slap 189**: deferred-lend / words units (consumer gates, out of scope).
- Hyper Beam 63, Magnitude 222, Flatter 260, CASTFORM_CHANGE: not in this census's chains (0 frames on seeds 0..299).

## Ranking (base `ccc4774c4`, seeds 0..299)

`prep45OrderCensus.ts` + `prep45Chains.py` (`fixtures/plans51/chains-before-seeds0-299.json`): 176 order-lend-unknown declines /
25305 frames.

Greedy gain over the non-excluded units:

| unit | gain |
|---|---:|
| Dive | 5013 |
| SUBSTITUTE_FADE | 1487 |
| Dream Eater | 1220 (shadow-tracker artefact: never a first stop, geometry plan already landed) |
| Water Spout | 1112 |
| HAIL_CONTINUES | 1017 |
| Hail | 3642 |
| Blizzard | 1826 |
| Fury Cutter | 821 |
| Mud-Slap | 1701 |
| Ice Ball | 2439 |
| Outrage | 809 |
| Shock Wave | 693 |
| FOCUS_BAND | 533 |
| TURN_TRAP WHIRLPOOL | 510 |
| Fly | 376 |
| WRAP | 160 |
| Bounce | 51 |
| FIRE_SPIN | 103 |
| Eruption | 51 |

Solo unlocks: SUBSTITUTE_FADE 7 / 1487, Fury Cutter 7 / 821, Outrage 4 / 809, Shock Wave 3 / 693, FOCUS_BAND 3 / 533, Hail 1 / 51,
Blizzard 0.

## Production change

**Plans.**
- `fixtures/plans51/plan-rows.json` is rows-v1, written by `plans51PlanRows.ts` from `check.json`. Rows require exact == instances
  and both sides proven.
- It is appended after plans48's rows in `spriteOrderProductionTable.ts`, and the table is regenerated, never hand-edited.
- bodies 525 → 527 (`200:player`, `200:opponent`), plans 219 → 221, anims 24 → 25 (`FOCUS_BAND`). No base index moved.

**No host, provider, transform or seam code changed.** Both units are keyed as the host already emits them. No event payload
changed, so no Scene ON/OFF parity route was needed.

**Corpus replays.**

| replay | edges | known | exact | mismatched |
|---|---:|---:|---:|---:|
| `prep45CorpusReplay.ts` corpus, turn-keyed | 1366 | 1159 → 1159 | 1159 → 1159 | 0 → 0 |
| `prep45CorpusReplay.ts` prep45 probes | 291 | 241 → 241 | 241 → 241 | 0 → 0 |
| `plans51CorpusReplay.ts` plans51 probes (new: the same strict replay over `fixtures/plans51/units.json`) | 205 | 149 → **203** | 149 → **203** | 0 → 0 |

In the plans51 probes, the known edges after Outrage go 0 → 26 / 26 and after FOCUS_BAND (through the carry) 0 → 14 / 14.

**Pins that moved:** `tests/spriteOrderEventTransform.test.ts`, table counts 527 bodies / 221 plans (was 525 / 219), and the
appended-rows merge list gains `plans51/plan-rows.json`. No other sprite-order / lend / allocator / geometry pin moved.

**New tests:** `tests/spriteOrderPlans51.test.ts`.
- Receipts A == B, and every check label exact on both sides.
- Outrage: 147 ROM instances == production text per side, a per-frame re-check, ≥ 2 attacker species per side, known after the event.
- FOCUS_BAND: 14 instances == production text, per-frame + carry, 2 holders × 2 sides, known after the event.
- Not landed: Eruption's 2 ROM plans per side, SUBSTITUTE_FADE never reached, no `SUBSTITUTE_FADE` row.
- The Outrage and FOCUS_BAND tests fail on the base table.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py
    ../../vendor/mgba-venv/bin/python tools/integration/plans51Probe.py /tmp/p51/probe --jobs 12   # ~2 min
    python3 tools/integration/plans51Extract.py /tmp/p51/probe /tmp/p51/units.json          # == fixtures/plans51/units.json
    node --experimental-strip-types tools/integration/plans51Check.ts /tmp/p51/units.json /tmp/p51/check.json   # == check.json
    node --experimental-strip-types tools/integration/plans51PlanRows.ts tools/integration/fixtures/plans51/check.json /tmp/rows.json
    node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts && git diff --exit-code src  # table regenerates
    node --experimental-strip-types tools/integration/plans51CorpusReplay.ts /tmp/p51-replay.json
    node --experimental-strip-types tools/integration/prep45CorpusReplay.ts /tmp/replay.json
    node --experimental-strip-types tools/integration/plans51ShockWaveFit.ts [--force-particles]   # the Shock Wave fit record
    node --experimental-strip-types tools/integration/liveShareCensus.ts --seeds=0..299 --out=/tmp/after.json --commands=/tmp/after.jsonl
    python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> /tmp/after.json /tmp/after.jsonl /tmp/delta.json

Caveat: the receipts come from one probe directory whose jobs were run in batches (Outrage, then SUBSTITUTE_FADE / FOCUS_BAND,
then Eruption). Each job's A / B pair comes from one batch.
