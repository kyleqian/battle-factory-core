# S10A plans69: the remaining sprite-order host stops (Conversion 2, Needle Arm, Magnitude, CASTFORM_CHANGE, Speed Boost; negatives)

Side lane, **evidence only, new files only** (plans48 / plans51 / sw67 method).
- Base: master `5f8279de1` (production src tree `c3ab72f5`). No tracked file was edited. The production change is two temp patches,
  applied only while measuring and then reverted. The runner applies them only to `git archive` copies.
- Fixtures: `tools/integration/fixtures/plans69/`.
- Tools: `plans69Probe.py`, `plans69PowerProbe.py`, `plans69Extract.py`, `plans69Check.ts`, `plans69PlanRows.ts`, `plans69Run.sh`.

## Results

**Four stops proven and patched; one stop is a kernel payload gap, also patched; six stops have a precise negative.**
- Probes: 104 direct-mGBA jobs × 2 fresh runs, plus 24 Magnitude `gAnimMovePower` jobs × 2. **All A == B.**
- A second, independent batch (`plans69Run.sh`) reproduced `units.json` / `check.json` / `plan-rows.json` and all census / delta /
  chain files **byte for byte** (28 artefacts).

| stop (morning report, seeds 0..999: frames / cmds) | kind | ROM verdict (`check.json`) | census 0..999 gain | fold |
|---|---|---|---|---|
| CASTFORM_CHANGE (1,843 / 9) | **EXACT** empty plan `""` | 8/8, Castform both sides, sun + rain, 2 defenders | +1 / +237 | anim row `CASTFORM_CHANGE` |
| body 222 Magnitude (player 1,632 / 13; opponent 174 / 1) | **GAME STATE**: `gAnimMovePower > 99` | ≤ 99 → `""` 36/36; > 99 → `Cf;D0;Cf;D1` 8/8. Power read from ROM RAM, both sides | +26 / +3,131 | rows 222 / 20222 + host key (below) |
| body 176 Conversion 2 opp (373 / 3) | **EXACT** | 8/8 per frame, both sides, 3 attacker × defender pairs | 0 (chained) | rows `176:*` |
| body 302 Needle Arm opp (1,094 / 7) | **EXACT** (= the base table's `302:player` text) | 4/6 per frame, **6/6 create-merged** (the 10-sprite burst seen as 9 + 1) | 0 (chained) | row `302:opponent` |
| stat animation 0 (282 / 1) | **kernel payload gap** (Speed Boost `animArg1` never set) | ROM STATS_CHANGE +1 = `Cf;D0` 5/5 (2 with Ninjask underground) | +4 / +724 (also clears 2 "stat animation 3") | Main-lane kernel fix |
| body 301 Ice Ball (player 5,404 / 54; opponent 1,787 / 18) | WORDS unit, lend scope | not probed (diagnosis) | — | resume below |
| body 189 Mud-Slap opp (2,059 / 19) | WORDS unit; every chain contains a later Ice Ball body | — | — | follows Ice Ball |
| body 63 Hyper Beam player (1,648 / 7) | **RANDOM2 + GEOMETRY** (orb lifetime) | 9 / 10 instances distinct | — | negative |
| body 260 Flatter (opp 1,570 / 10; player 556 / 3) | **RANDOM2** | 5 plans per side; varies with the lab seed at a fixed pair | — | negative |
| body 310 Astonish player (897 / 5) | **RANDOM2** (droplet pair painter order) | 2 plans; varies with the seed at a fixed pair | — | negative (words-able) |
| body 316 Odor Sleuth player (495 / 5) | **GEOMETRY** (target species) | 2 plans; seed-invariant; Golbat / Crobat targets vs 7 others | — | negative (geometry key) |

**Census, `liveShareCensus.ts`, base `5f8279de1` vs base + `temp-patch.diff`, paired by `prep43CensusDelta.py`.**
- Every range: 0 pairing mismatches, **0 live → fallback regressions**, **identical command key sequence** (battle, kind, moveId, side,
  attacker, target), **identical battle digest**, 0 render throws.
- **Seeds 0..299** (the required range): **+0**. The before and after reports are byte-identical. None of these stops occurs on
  0..299, as plans51 noted. The gains are on 300..999.

| seeds | commands | live before | live after | frames live before → after | digest |
|---|---:|---:|---:|---|---|
| 0..299 | 7,970 | 7,733 (97.03 %) | 7,733 | 1,147,322 → 1,147,322 | `e3603a848daa…` |
| 300..649 | 10,392 | 9,272 (89.22 %) | **9,291 (89.41 %)** | 1,390,385 → **1,392,651** | `5bec342dc0cb…` |
| 650..999 | 9,285 | 8,746 (94.19 %) | **8,760 (94.35 %)** | 1,320,511 → **1,322,447** | `d6296c488e24…` |
| **0..999** | 27,647 | 25,751 (93.14 %) | **25,784 (93.26 %), +33** | 3,858,218 → **3,862,420, +4,202** | |

Gains by first stop:
- `body 222:player`: 21 / 2,569;
- `body 222:opponent`: 5 / 562;
- `general animation CASTFORM_CHANGE`: 1 / 237;
- "sprite allocator history unknown": 4 / 410;
- "unclassified (case-local gate)": 2 / 424.

The last two are later bodies whose history now resolves.

**Speed Boost patch alone** (`temp-patch-speed-boost.diff`):
- 0..299 and 300..649: +0;
- 650..999: **+4 / +724** (`stat animation 3` 2 / 390, `stat animation 0` 2 / 334);
- 0 regressions, identical keys and digests.

The remaining 2 `stat animation 0` commands chain into `body 222:opponent`, so both patches together clear them.

**Chain predictor** (`prep61OrderCensus.ts` on the base, `prep45Chains.py`; 0..999 = the three ranges concatenated, battle ids offset
by range start):

| cleared set | predicted unlock | measured (`--after`) |
|---|---|---|
| plans69 (176, 302, 222, CASTFORM_CHANGE) | 26 / 3,194 | predicted & live 26 / 3,194; predicted & not live 0; not predicted & live 1 / 174 (battle 807 Magnitude: chain 222 + Hail 258 + HAIL_CONTINUES) |
| Speed Boost (`no EXACT plan: stat animation 0` / `3`) | 3 / 550 | 3 / 550; 0; 1 / 174 (battle 927 Magnitude) |
| today's landings only (Fly 19, Bounce 340, Dive 291, SUBSTITUTE_FADE, Shock Wave 351) | 184 / 32,862 | — |
| today's + plans69 | **210 / 36,056 (+26 / +3,194)** | — |
| today's + plans69 + Speed Boost | **213 / 36,606** | — |
| … + Ice Ball 301 (upper bound of the resume below) | 245 / 40,129 (+32 / +3,523) | — |
| … + Mud-Slap 189 | 247 / 40,231 (+2 / +102) | — |

On seeds 0..299 every plans69 chain prediction is 0, and today's + plans69 = today's only (45 / 7,272).

## Per-stop evidence

Source is pret `reference/pokeemerald`. A plan text is `decodeSpriteOrderPlan`'s format.

### CASTFORM_CHANGE: EXACT `""` (prediction committed first)
- **Source.** `General_CastformChange` (`data/battle_anim_scripts.s:10305`) runs `AnimTask_IsMonInvisible`, then `monbg`, sounds,
  `AnimTask_TransformMon` and `clearmonbg`, or `AnimTask_CastformGfxDataChange` when the battler is invisible. It has no `createsprite`.
  The battler's own OBJ is re-tiled in place.
- **Prediction.** `""`, committed in `7437f0335` (`predictions.json`) before any probe.
- **ROM.** 8/8 instances: Castform 385 sets the weather itself (the Sunny Day / Rain Dance scenarios with the user replaced), against
  Onix 95 / Golbat 42, on both sides. The labelled unit is the first mv-0 unit after the weather body. The end-turn
  `*_CONTINUES` units come later and are labelled `general mv-0`.

### Magnitude 222: game-state key `gAnimMovePower > 99` (prediction committed first)
- **Source.** `Move_MAGNITUDE` (`battle_anim_scripts.s:3318-3344`) calls `AnimTask_IsPowerOver99` (`battle_anim_ground.c:734`).
  - `MagnitudeRegular`: two `AnimTask_HorizontalShake` tasks, no sprite.
  - `MagnitudeIntense`: `delay 10`, `complex_palette_blend`, `delay 16`, `complex_palette_blend`.
  - No Random2 and no geometry in either branch.
- **Prediction** (`7437f0335`): `""` / `Cf;D0;Cf;D1`.
- **ROM.** 44 instances on both sides: the regular / intense scenarios with 2 defenders, plus a lab-seed sweep (seeds 2..9, 3 turns).
  - `plans69PowerProbe.py` reads `gAnimMovePower` from RAM at each body start (A == B). Bodies are joined on the probe frame counter.
  - power ≤ 99 → `""` 36/36; power > 99 → `Cf;D0;Cf;D1` 8/8.
- **Seam.** The kernel MOVE_ANIMATION request already carries the power (`battleMoveAnimationRequest(...).power`). The live adapter uses
  the same `> 99` split (`liveMoveAnimation.ts` `case 222`: 206 vs 174 frames).

### Conversion 2 176: EXACT
- **Source.** `Move_CONVERSION_2` (`:2340`): 16 fixed-argument `gConversion2SpriteTemplate` sprites (`AnimConversion2`,
  `battle_anim_effects_1.c:4881`: fixed delays 60..135), destroyed in creation order. No Random2, no geometry.
- **ROM.** `Cfffffffffffff;Cfff;D0;…;D15`: 8/8 per frame on both sides.
  - Pairs: Cacturne → Onix, Golbat → Snorlax, Snorlax → Golbat, on the Mega Punch scenarios with an extra turn (Conversion 2 fails until
    the target lands a move).
  - The 13 + 3 creation split is the same on every instance.

### Needle Arm 302: EXACT (opponent row new; the player row already exists with this text)
- **Source.** `Move_NEEDLE_ARM` (`:4064`) creates 12 inward `AnimNeedleArmSpike` spikes (`battle_anim_effects_1.c:3623`, fixed
  16-frame), then `waitforvisualfinish`, then the hitsplat, the fist and 8 outward spikes in one script frame. No Random2.
- **ROM.** 6 jobs: Cacnea → Onix, Snorlax → Golbat, Golbat → Snorlax, on both sides.
  - The base table's `302:player` text `…;Cfffffffff;Cf;D13;D12,18,19,17,16,20,15,21,14` is exact per frame on 4/6.
  - On `opp-143-42` and `opp-42-143` the ROM shows the 10-sprite burst in one frame (`Cffffffffff`).
  - Created slots, their order, and every destroy window and F are identical. The check's create-merged mode (consecutive create-only
    windows merged on both sides) is **6/6**.
  - The split is a frame-boundary artefact of one script frame's burst, so the order after the unit is the same.

### stat animation 0: a kernel payload gap (Speed Boost), not a plan
- **Instance.** Census seed 927. The opponent Ninjask uses Dig, and at the end of the turn Speed Boost plays
  `BattleScript_SpeedBoostActivates`: `playanimation BS_ATTACKER, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1`.
- **ROM.** `battle_util.c:2646-2647` sets `gBattleScripting.animArg1 = STAT_ANIM_PLUS1 + STAT_SPEED` (= 17) and `animArg2 = 0`.
- **Kernel.** `battleEndTurnOrchestration.ts:1217-1231` (the Speed Boost tick) never sets `animArg1`. The event carries the stale value:
  0 on the first activation, 3 after an earlier one. That is the `stat animation 3` stop, 2 commands.
  - `AnimTask_StatsChange` with argument 0 would hit `default: DestroyAnimVisualTask` (`battle_anim_status_effects.c:527`).
  - So "argument 0" is not a ROM case.
- **ROM probe.** Ninjask 302 leads with Dig or Mega Punch, on both sides. The STATS_CHANGE unit is `Cf;D0` 5/5, and 2 of those 5 ran
  with the Ninjask underground. `Cf;D0` is the production `STATS_CHANGE_CLASS_1` plan, so the host needs no new plan once the argument
  is right.
- **Fix.** `temp-patch-speed-boost.diff` adds one field: `animArg1: STAT_ANIM_PLUS1 + STAT_SPEED` in the tick's rules context.
  - Main lane (`battleEndTurnOrchestration.ts`).
  - It is presentation-only: `animArg1` is read only by `playanimation`'s `sB_ANIM_ARG1`.
  - Census: identical battle digest on all 1000 seeds.

### Ice Ball 301 / Mud-Slap 189: why the words units still end at "no EXACT plan"
Both are deferred-lend units (`liveSpriteOrderHost.ts:83-88`, `DEFERRED_LEND_MOVE_IDS = [301, 28, 189, 240]`). Their bodies invalidate the
tracker by design, and later consumers must take the deferred lend.

From the base order census, 0..999 (`gate` = the decline site):
- **`body 301:*`, 48 declines.**
  - 26 are later Ice Ball bodies (counter ≥ 1) at `liveMoveAnimation.ts:4031` (`!spriteOrderInput?.known`): no lend reached them.
    - `markLiveSpriteOrderDeferredBody` records an Ice Ball marker only at entry occupancy (`liveSpriteOrderHost.ts:118-122`:
      "Ice Ball keeps the entry-occupancy rule"; words units are exempt). Example: battle 19, Sealeo after a send-in.
    - A non-Ice-Ball body in between is replayed only if it has a production plan.
  - 22 are other moves: Mud-Slap ×10, Sand-Attack ×3, Petal Dance / Shock Wave / Water Pulse ×2, Silver Wind / Snore / Magnitude ×1.
    - `lendLiveSpriteOrder` gives the deferred lend to a non-Ice-Ball consumer only for words units (`:591-597`: "an Ice Ball marker
      lends only to Ice Ball").
    - Only the Ice Ball adapter can resolve an Ice Ball marker: its `resolveSpriteOrderDeferredLend` callback handles `body.moveId === 301`
      only (`liveMoveAnimation.ts:4046-4052`, `iceBallArgs(...).postBodyFree`).
- **`body 189:opponent`, 19 declines** (Water Pulse ×10, Mud-Slap ×9). Every chain is
  `[189:opponent, 301:player, (258:player, HAIL_CONTINUES)]`. The Mud-Slap marker resolves, but the deferred replay then meets an Ice Ball
  body, which has no production plan (Random2 shard sort). So the Mud-Slap stop is an Ice Ball stop; 17/19 also need the Hail units.
- **Resume (integration lane).** Make 301 a words-order unit for ANY consumer: its carry is `liveIceBallInputs(...).postBodyFree` at the
  body's recorded words. The function already exists and is used for Ice Ball → Ice Ball.
  - Wire it into the words-deferred carry (`liveWordsOrderDeferredCarry`) and relax the entry-occupancy rule as words59 did for the dirt
    units: the body species marker plus a role-isomorphic lend.
  - Upper bound from the chain predictor: +32 / +3,523 on top of today's landings + plans69 + Speed Boost (0..999). Mud-Slap then adds
    +2 / +102.

### Hyper Beam 63: RANDOM2 + GEOMETRY (negative)
- **Source.** `AnimHyperBeamOrb` (`battle_anim_effects_1.c:2336-2360`) draws three Random2 words per orb (anim, speed, wave). The orb
  lives until `AnimFastTranslateLinear` arrives, with `speed = (Random2() & 31) + 64` over the attacker → target distance. So 52 orbs (`HyperBeamOrbs` ×26, 2 each) have
  Random2- and geometry-dependent lifetimes, and the destroy order follows them.
- **ROM.** 10 instances: Aerodactyl → Onix, Snorlax → Golbat, and lab seeds 1..3 at the base pair. 9 distinct plans.
- **Resume.** A words law like prep65's Dive: the orb lifetimes from the body's 156 recorded words and the attacker / target X_2 /
  Y_PIC_OFFSET coordinates. It needs a Hyper Beam reducer timeline (animation lane), then a Random2 words unit.

### Flatter 260: RANDOM2 (negative)
- **Source.** `AnimFlatterConfetti` (`battle_anim_effects_3.c:3033`) draws three Random2 words per confetti, 38 confetti in all
  (`CreateFlatterConfetti` ×19). Lifetime is a fixed 31 frames, but the velocity is Random2. A same-frame destroy group of up to ~38
  sprites therefore frees in painter order, which `SortSprites` keys on y. The creation split across frames also varied.
- **ROM.** 12 instances: 5 plans per side, and they differ by lab seed at the fixed Nidorina → Onix pair.
- **Resume.** A confetti words law (y after 31 frames from the two Random2 velocities), then the painter sort.

### Astonish 310: RANDOM2 (negative; small words law)
- **Source.** `Move_ASTONISH` (`:9411`): the lunge controller, then two `gSprayWaterDropletSpriteTemplate` droplets created in one
  frame. `AnimSprayWaterDroplet` (`battle_anim_flying.c:1104`) draws 2 Random2 words each; the lifetime is a fixed 31 frames.
  - The two droplets die in the same frame, and their freed order is their painter order (y). The y follows the Random2 vertical
    velocities.
- **ROM.** 16 instances: plans `Cf;D0;Cff;D1,2` / `Cf;D0;Cff;D2,1`.
  - At the fixed pair Loudred → Onix the order flips with the lab seed: opponent seed 3 vs the rest; player base seed vs seeds 1..5.
- **Resume.** The smallest words unit here: 4 words → two y values → `D1,2` or `D2,1`.

### Odor Sleuth 316: GEOMETRY by target (negative)
- **Source.** `AnimTask_OdorSleuthMovement` (`battle_anim_effects_3.c:4955`) makes two `CloneBattlerSpriteWithBlend(ANIM_TARGET)` clones.
  The task and sprite logic has no Random2. The two clones are destroyed in the same frame, and their painter order depends on the
  target's sprite geometry.
- **ROM.** 18 instances.
  - Seed-invariant: seeds 1..3 × both sides at Cacturne → Onix.
  - `…;D0,1;…` for target Golbat 42 / Crobat 169, on both sides (player Golbat included).
  - `…;D1,0;…` for Onix 95, Snorlax 143, Wobbuffet 202, Shuckle 213, Slowbro 80, Dragonite 149, Lapras 131.
- **Resume.** A 2-class predictor over all Factory targets, from the clone sort keys (`AnimTask_OdorSleuthMovement_Step` +
  `SortSprites`), then `SPRITE_ORDER_GEOMETRY_KEYED_BODIES` 316. The two observed classes are not enough to key 376 targets.

## Temp patch and fold instructions

`fixtures/plans69/temp-patch.diff` (3 files, +8 / −3):
1. `tools/integration/spriteOrderProductionTable.ts`: append `fixture("plans69/plan-rows.json")` after plans54's rows.
2. `src/engine/spriteOrderProductionPlans.ts`: regenerated (`node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts`).
   - bodies 535 → 542, plans 221 → 222 (only Conversion 2's text is new), anims + `CASTFORM_CHANGE` (index of `""`).
   - New keys `176:*`, `222:*`, `20222:*`, `302:opponent`. No base index moved.
3. `src/engine/liveSpriteOrderHost.ts` `orderEventOf`: `const magnitudeIntense = request.moveId === 222 && request.power > 99;` and key
   `20222` (beside Present's 20217).

`fixtures/plans69/plan-rows.json` is rows-v1, written by `plans69PlanRows.ts` from `check.json`.
- Tooling mirrors a fold should also key (not needed for production): `spriteOrderCrossBodyCorpusReplay.ts`,
  `orderCrossBodyRouteScan.ts` and `prep45CorpusReplay.ts` need 222 → 20222 when power > 99, as plans48 did for 20217.

`fixtures/plans69/temp-patch-speed-boost.diff` (Main lane, 1 file, +3): the Speed Boost tick's `animArg1`.

**Pins a fold moves** (`fixtures/plans69/fold-test-pins.diff`, all in `tests/spriteOrderEventTransform.test.ts`). These are the only
failures across the 30 related test files with the patch applied.

| line | pin | before → after |
|---|---|---|
| 31 | `SPRITE_ORDER_PRODUCTION_BODIES` length | 535 → 542 |
| 32 | `SPRITE_ORDER_PRODUCTION_PLANS` length | 221 → 222 |
| 39-41 | the ext-table check's appended rows | + `fixture("plans69/plan-rows.json").bodies` (`222:opponent` otherwise expected null) |
| 343 | corpus `known` | 1173 → 1175 (`exact == known` holds) |
| 344 | corpus `laterKnown` | 619 → 621 |
| 347 | unkeyed corpus `{known, exact, mismatched}` | {1173, 1170, 3} → {1175, 1172, 3} |

With `temp-patch.diff` + `fold-test-pins.diff` applied, the **full `npm test` passed: 1598 files / 13,159 tests** (then reverted).
The speed-boost patch's tests were not run separately. Its census is above; the Main lane would add a kernel pin (Speed Boost
STATS_CHANGE payload argument 17).

## Rerun

```sh
# from workspace/: probes (~1 min) + census 0..999 on base / patched / speed trees (~5 min) + chains + fold pins (~1 min)
tools/integration/plans69Run.sh <fresh-out-dir> [--base 5f8279de1] [--skip-probe] [--skip-census] [--skip-tests]
```

It compares every artefact byte for byte with `fixtures/plans69/`.
- The census jsonl streams are not committed; their sha256 are in `jsonl-sha256.txt`.
- The temp patches are applied only to `git archive` copies under the out dir, so no tracked file is touched.
- Probe jobs carry an explicit lab seed, and every A / B pair runs in one batch.
