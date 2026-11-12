# S10A sw67 — Shock Wave 351: an allocation-faithful timeline and a geometry-keyed sprite-order plan

Side lane, evidence + production in one step, using the plans48 / plans51 / plans54 method.
- Base: master `82690e775` (src tree `06b791ff`).
- Tested code: `abbefec90` (src tree `c3ab72f5`). Later commits touch tests, tools, fixtures and docs only.
- Receipt: `tools/integration/fixtures/sw67-live-receipt.json`. Fixtures: `tools/integration/fixtures/sw67/`.

## Results

**Rung 1: the reducer's allocation lifetimes were already source-faithful. plans51's divergence came from its plan generator.**
`shockWave.ts`'s render path is unchanged and every Shock Wave pixel test is byte-identical. The only addition is
`shockWaveSpriteOrderPlanText` / `shockWaveSpriteOrderPlanWindows`, which read `shockWaveAtAge`.

plans51's generator tracked sprite identity as `kind@birthAge`. The ROM snapshot can only see slot occupancy, and the source
reuses a slot inside a single frame:
- `CreateSprite` takes the lowest free index (`src/sprite.c:502-511`).
- `BattleMainCB2` runs `AnimateSprites` (sprite callbacks, so `DestroySprite`) before `RunTasks` (task `CreateSprite`)
  (`src/battle_main.c:1863-1869`).
- So the two duration-40 charging particles (slots 3 / 4) die at age 79 / 80. In the same frame,
  `AnimTask_ShockWaveProgressingBolt` creates a bolt that takes the freed slot. Each bolt lives 13 frames, so the ROM sees slots
  3 / 4 occupied until f+92 / f+93.
- This is the "particles stay allocated until f+92 / f+93" plans51 reported. It is a different sprite in the same slot, not a
  longer particle.

The generator now keys identity by occupied slot. Per window it emits the new slots in index order (`C`), then the freed ones
in the previous age's painter order (`D`). With that change the plan matches every window. No lifetime was fitted.

Source lifetimes (pret `reference/pokeemerald`). The reducer already matched each one; `tests/spriteOrderSw67.test.ts` now pins them.

| sprite | created by | lifetime (ages alive) | source |
|---|---|---|---|
| palette blend | script `simple_palette_blend` (CB1) | 16..29 | `battle_anim_scripts.s` Move_SHOCK_WAVE; `asm/macros/battle_anim_script.inc:290` |
| 20 charging particles | `AnimTask_ElectricChargingParticles_Step`, one per frame from 31 | duration + 8, with duration 40, 40, 35, 35, …, 10 (`data[0] = 40 - data[8] * 5`; `data[8]` grows every 2 particles while ≤ 5) | `battle_anim_electric.c:848,865`; anim 0 (4 × 1 frame) through `RunStoredCallbackWhenAnimEnds` (`battle_anim_mons.c:735`); `AnimElectricChargingParticles_Step` → `AnimTranslateLinear` (`battle_anim_mons.c:1111-1139`) → `DestroySprite` (`battle_anim_electric.c:880-887`) |
| growing orb | script `createsprite` at 45 | 45..105 | `AnimGrowingShockWaveOrb` affine anim 2 (30 + 30 frames, `battle_anim_electric.c:321-327`) → `DestroySpriteAndMatrix` (`:1147`) |
| progressing bolts | `AnimTask_ShockWaveProgressingBolt` (one per frame in state 1) | 13 | `AnimShockWaveProgressingBolt`: `++data[0] > 12` → `DestroySprite` (`battle_anim_electric.c:1269-1276`) |
| lightning bolts | `AnimTask_ShockWaveLightning` (one every 2 frames) | 30 | `AnimShockWaveLightning`: `animEnded` (`sAnim_Lightning` 5 + 5 + 8 + 5 + 5) → `DestroySprite` (`:1328-1335`) |

**Fit against plans48's 8 ROM receipts.** `sw67ShockWaveFit.ts` goes through the production seam and starts from each receipt's
own `F0`. Every row passes all four checks:
- every window's free order `F` equals the ROM's;
- the window count is equal;
- every window's body age equals its ROM frame offset;
- the seam text equals the direct reducer text.

| job | side (attacker → target) | ROM windows | model | verdict |
|---|---|---:|---:|---|
| sw-opp | FLAAFFY → CORSOLA | 79 | 79 | per-frame exact |
| sw-opp-atk-golbat | GOLBAT → CORSOLA | 86 | 86 | per-frame exact |
| sw-opp-golbat | FLAAFFY → GOLBAT | 79 | 79 | per-frame exact |
| sw-opp-snorlax | FLAAFFY → SNORLAX | 79 | 79 | per-frame exact |
| sw-ply | FLAAFFY → CORSOLA | 106 | 106 | per-frame exact |
| sw-ply-atk-snorlax | SNORLAX → CORSOLA | 106 | 106 | per-frame exact |
| sw-ply-golbat | FLAAFFY → GOLBAT | 106 | 106 | per-frame exact |
| sw-ply-snorlax | FLAAFFY → SNORLAX | 106 | 106 | per-frame exact |

plans51's generator, run on the same inputs, still diverges at window 37 on all 8 receipts (its opponent models have 98 / 96 windows). The difference
is the generator alone.

**Rung 2: geometry classes, predictions, then the grid.**
- `sw67Classes.ts` ran every Factory Shock Wave user against all 376 Factory targets, per side, at the known-entry first-action order.
  The 7 users are MAGNEMITE 81, MAGNETON 82, PICHU 172, MAREEP 179, FLAAFFY 180, NOSEPASS 320 and CASTFORM 385 (internal ids).
- **The plan depends on the attacker only.** The target species never changes it, because the lightning count reads the target
  position's plain `BATTLER_COORD_Y`.

| side | class (windows) | attackers |
|---|---:|---|
| player | 106 | MAGNETON, PICHU, MAREEP, FLAAFFY, NOSEPASS |
| player | 102 | MAGNEMITE |
| player | 104 | CASTFORM |
| opponent | 79 | MAGNEMITE, PICHU, FLAAFFY, NOSEPASS |
| opponent | 86 | MAGNETON, MAREEP, CASTFORM |

The predictions were committed in `59598c128` before any probe ran (`fixtures/sw67/predictions.json`, written by `sw67Predict.ts`).
- 9 NEW (attacker, target) pairs per side, covering every class.
- None is a plans48 pair. No target is Ground-type or has Volt Absorb, so the move animates.
- The 102 / 104 player classes (MAGNEMITE, CASTFORM) had no ROM receipt before.

The grid was probed with `sw67Probe.py`: direct mGBA, never the HTTP oracles.
- Each job is plans48's Shock Wave scenario of its side with the attacker's and defender's lead species swapped. Each lead's gender
  is one its species allows (`species_info.h`), and the lab seed is pinned at 305420351.
- 18 jobs, each run twice in fresh processes inside one batch: **all A == B**.
- A second, independent batch (`sw67Run.sh`) reproduced `units.json` byte for byte.

| job | windows predicted / ROM | prediction == seam plan == ROM per frame |
|---|---|---|
| sw67-ply-81-143 MAGNEMITE → SNORLAX | 102 / 102 | yes |
| sw67-ply-81-169 MAGNEMITE → CROBAT | 102 / 102 | yes |
| sw67-ply-385-242 CASTFORM → BLISSEY | 104 / 104 | yes |
| sw67-ply-385-213 CASTFORM → SHUCKLE | 104 / 104 | yes |
| sw67-ply-82-42 MAGNETON → GOLBAT | 106 / 106 | yes |
| sw67-ply-172-80 PICHU → SLOWBRO | 106 / 106 | yes |
| sw67-ply-179-131 MAREEP → LAPRAS | 106 / 106 | yes |
| sw67-ply-320-149 NOSEPASS → DRAGONITE | 106 / 106 | yes |
| sw67-ply-180-202 FLAAFFY → WOBBUFFET | 106 / 106 | yes |
| sw67-opp-81-143 MAGNEMITE → SNORLAX | 79 / 79 | yes |
| sw67-opp-172-213 PICHU → SHUCKLE | 79 / 79 | yes |
| sw67-opp-320-149 NOSEPASS → DRAGONITE | 79 / 79 | yes |
| sw67-opp-180-115 FLAAFFY → KANGASKHAN | 79 / 79 | yes |
| sw67-opp-82-242 MAGNETON → BLISSEY | 86 / 86 | yes |
| sw67-opp-82-202 MAGNETON → WOBBUFFET | 86 / 86 | yes |
| sw67-opp-385-80 CASTFORM → SLOWBRO | 86 / 86 | yes |
| sw67-opp-179-131 MAREEP → LAPRAS | 86 / 86 | yes |
| sw67-opp-385-169 CASTFORM → CROBAT | 86 / 86 | yes |

**18 / 18 per-frame exact.** That covers F, window count, body age == frame offset, seam text, and the committed prediction with its
`F0`.

**Rung 3: live-share census, seeds 0..299.**
- Run with `liveShareCensus.ts` on `82690e775` and on the tested code, paired by `prep43CensusDelta.py`.
- 7970 commands, 0 pairing mismatches, **identical command key sequence** (battle, kind, moveId, side, attacker, target).
- Battle digest identical: `e3603a84…03e4`.
- **0 live → fallback regressions.** Render sanity: 0 throws.

| | live by count | live by frames |
|---|---|---|
| `82690e775` | 7729 / 7970 = **96.98 %** | 1146541 = **97.99 %** |
| sw67 | **7733 = 97.03 % (+4)** | **1147322 = 98.06 % (+781)** |

Gained commands:
- battle 130: WATER PULSE (160) and the 2nd SHOCK WAVE (266);
- battle 223: the 2nd SHOCK WAVE (267).

  These three were "sprite-order lend unknown" declines whose first stop was `body 351:player`.
- battle 27: LIGHT SCREEN (88), a "sprite allocator history unknown" decline after that battle's Shock Wave.

Not gained, unchanged from before: battle 205's 2nd / 3rd opponent Shock Wave. The case-351 gate fires on a lend whose occupied set is
not the known entry. The plan fails closed on the same condition.

Chain predictor (`prep61OrderCensus.ts` on `82690e775`, then `prep45Chains.py --cleared "body 351 SHOCK_WAVE" --after`):
- predicted 3 commands / 693 frames;
- measured predicted & live 3 / 693, predicted & not live 0, not predicted & live 0.

**Scene ON/OFF parity.** `tests/spriteOrderSw67.test.ts` runs route 7 / streak 7 with CASTFORM using Shock Wave twice (slots [2, 2]).
- Both bodies are live with this change; the second fell back on `82690e775`.
- Scene ON and OFF have equal boundaries, rules, RNG, facility state and final rngValue.

## Production change

- `src/animation/shockWave.ts`: `shockWaveSpriteOrderPlanText` / `shockWaveSpriteOrderPlanWindows`, the plan of `shockWaveAtAge`'s own
  timeline as described above. The reducer and render path are not changed.
- `src/engine/liveMoveAnimation.ts`: in `liveMoveGeometrySpriteOrderPlanText`, case 351 calls `liveShockWaveSpriteOrderPlanText`.
  - Inputs: the displayed field plus the lent free order.
  - It builds the case-351 inputs (`liveShockWaveInputs`, picture origins, the target's plain `BATTLER_COORD_Y`), cached per
    (side, species, lend).
  - It returns null without the field or lend, or when the lend's occupied set is not the known entry
    (`spriteOrderWithOccupiedPrefix`). The adapter's own gate is the same.
- `src/engine/spriteOrderEventTransform.ts`: `SPRITE_ORDER_GEOMETRY_KEYED_BODIES` gains 351. There was no base-table `351:*` row.
- Unchanged: the host / provider / orchestrator call sites. The seam already passes the field and the lent order for every move.
  The engine/animation import boundary is unchanged: `liveMoveAnimation.ts` already imported `shockWave.ts`.

## Tests

`tests/spriteOrderSw67.test.ts`, 6 tests:
- source lifetimes;
- the slot handoff (3 / 4 → bolts at 79 / 80, freed at 92 / 93);
- plans48's 8 receipts per-frame exact through the seam (79 / 86 / 106 windows; 2 opponent plans, 1 player plan among them);
- the 18-pair grid (A == B, prediction == plan == ROM, all 5 classes);
- 351 geometry-keyed with null plan cases;
- the Scene ON/OFF route.

## Reproduce

    tools/integration/sw67Run.sh <fresh-out-dir> [--base 82690e775] [--skip-classes] [--skip-probe] [--skip-census]

It runs fit → classes (~2 min) → predictions → grid probes (~20 s) + extract + grid check → census before / after (~3 min, parallel) +
delta + key / digest check → chain predictor (~3 min). Each step's output is compared byte for byte with `fixtures/sw67/` where it is
deterministic. The individual steps:

    node --experimental-strip-types tools/integration/sw67ShockWaveFit.ts /tmp/sw67/fit-plans48.json        # == fixtures/sw67/fit-plans48.json
    node --experimental-strip-types tools/integration/sw67Classes.ts /tmp/sw67/classes.json                 # == classes.json
    node --experimental-strip-types tools/integration/sw67Predict.ts /tmp/sw67/predictions.json             # == predictions.json
    PYTHONPATH=../../vendor/libmgba-py ../../vendor/mgba-venv/bin/python \
      tools/integration/sw67Probe.py /tmp/sw67/probe --jobs 12
    python3 tools/integration/sw67Extract.py /tmp/sw67/probe /tmp/sw67/units.json                           # == units.json
    node --experimental-strip-types tools/integration/sw67ShockWaveFit.ts /tmp/sw67/grid-check.json --units=/tmp/sw67/units.json \
      --prefix=sw67- --predictions=tools/integration/fixtures/sw67/predictions.json                         # == grid-check.json
    node --experimental-strip-types tools/integration/liveShareCensus.ts --seeds=0..299 --out=<after.json> --commands=<after.jsonl>
    python3 tools/integration/prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <delta.json>
    python3 tools/integration/prep45Chains.py <order-before.jsonl> <chains.json> --cleared "body 351 SHOCK_WAVE" --after <after.jsonl>

Caveats:
- Battle-lab species are internal ids. MAGNEMITE / MAGNETON / BLISSEY / KANGASKHAN leads get their forced gender.
- The base census ran from a `git archive` of `82690e775`'s `workspace/src` (tree `06b791ff`), not a checkout. Its 0..299 numbers
  equal `docs/live-share-census.md` "Latest".
