# Next adapters prep 36: source-derived provider prototype for MOVE_ERUPTION (284) (S10A, side lane)

Evidence + prototype; **new files only** (no tracked file edited; no `src/`, adapter, `PROGRESS.md` / `ISSUES.md` / ledger change). Method = prep24 / prep26 / prep30 / prep31 / prep35: a source-derived input model checked field by field against every row of every window, then fed to the **unchanged** reducer (`src/animation/eruption.ts`) and renderer (`battleScene.ts` ERUPTION branch, `:15558`) for a pixel check against raw ROM RGB. Base `af095fe14`. Every emulator number is a ROM frame from the accepted corpora (`tools/compare/evidence/eruption-{player,opponent}-dense-state.json.gz` + raw RGB tarballs) or an **independent direct mGBA run** (`tools/compare/eruptionProbe.py` via `tools/run-mgba-probe.py`). The shared HTTP oracles were never contacted.

Reproducibility: 8 alternate scenarios (2 from prep29 and 6 new ones) ran twice from fresh processes in each of two independent full passes (`/tmp/p36c`, `/tmp/p36d`). Within each pass the state JSON was `cmp`-identical and the RGB directories `diff -rq`-identical. Across the two passes, 8/8 scenario states and RGB dumps were also identical (4 fresh processes per scenario). All 8 receipts in `tools/integration/fixtures/prep36/` are `cmp`-identical to both fresh `prep36Run.sh` passes. An earlier 7-scenario pass pair (`/tmp/p36a`, `/tmp/p36b`) was likewise identical.

## 0. Results

### 0.1 Verdict

**ERUPTION 284: READY-WITH-CHANGE (scoped exact; no T field, no Random2).** `prep36EruptionModel.ts` `eruptionProfile36` builds every input the reducer and renderer read from production facts. Those facts are:

- the attacker side and the two displayed species (art view, `liveBattlerAnchors`, `coords.yOffset`);
- the known-entry scene and allocator;
- `composeLivePalettes` and the warm-rock asset palette;
- two pass-through host lends: the activation `sSpriteOrder` and the presentation RNG value.

The schedule (wave ends, wave-2 start, falling / shake / audio / closing ages, `endAge`) is derived through the **unchanged** launch reducer from the attacker sprite y. No capture row is read.

The "change" is wiring only. There are no reducer or renderer edits. Production needs:

- a field-dependent duration (as Water Spout / Shock Wave);
- the builder;
- one gate (attacker idle rest 0). This gate never fires in the Factory, because CAMERUPT is the only Factory Eruption user and its rest is 0.

**Correction to the accepted evidence:** the accepted corpora's "camerupt" is species **323 = BARBOACH** (the scenario used the national-dex number). **Real CAMERUPT is internal 340.** This prep is its first probe: player attacker y 99 (back `y_offset` 19), opponent y 49. It is exact in both orientations.

**Correction to the accepted profile extractor:** `tools/compare/eruptionReducer.ts` hard-codes `battlerYDelta` = 10 / 11 (`:63`). These are BARBOACH's values. With any other attacker species, the corpus-style profile fails 56-96 rows (below). The model uses the species `y_offset` and is exact.

### 0.2 Per-window numbers (receipt `eruption-check-pixels.json`)

Fields are checked on every row: the source cursor, active flag, task counts, the 5 Eruption task kinds (slot / priority / callback / data), the launch, falling and palette sprites (slot / x / y / x2 / y2 / subpriority / data / attr), the attacker pose and matrix under the launch task, palettes, the shake battlers, the platform latch, the source order and the animation RNG.

| Window (attacker -> target) | attacker y | E1 / E2 | rows | profile leaves = corpus | all-row field checks | **model px** | corpus-profile px |
|---|---|---|---|---|---|---|---|
| accepted P BARBOACH -> ONIX (target idle rest x2 1) | 90 | 99 / 181 | 476 | 160/163 | all exact | **476/476 0 px** | 476/476 |
| accepted O BARBOACH -> ONIX | 51 | 108 / 199 | 494 | 160/163 | all exact | **494/494 0 px** | 494/494 |
| prep29 P TORKOAL -> GOLEM | 90 | 99 / 181 | 476 | 160/163 | all exact | **476/476 0 px** | 476/476 |
| prep29 O TORKOAL -> GOLEM | 42 | 111 / 205 | 500 | 159/163 | all exact | **500/500 0 px** | 416/500 |
| **prep36 P CAMERUPT -> GOLEM** | 99 | 99 / 181 | 476 | 159/163 | all exact | **476/476 0 px** | 384/476 |
| **prep36 O CAMERUPT -> GOLEM** | 49 | 108 / 199 | 494 | 159/163 | all exact | **494/494 0 px** | 438/494 |
| prep36 P STEELIX -> GOLEM (y 80) | 80 | 102 / 187 | 482 | 159/163 | all exact | **482/482 0 px** | 386/482 |
| prep36 P CAMERUPT -> WEEZING (elevated target) | 99 | 99 / 181 | 476 | 158/163 | all exact | 475/476 (row 0: 195 px) | 383/476 |
| prep36 O WEEZING (elevated attacker) -> GOLEM | 36 | 111 / 205 | 500 | 158/163 | all exact | 499/500 (row 0: 195 px) | 415/500 |
| prep36 O ONIX (attacker idle rest x2 1) -> GOLEM | 42 | 111 / 205 | 500 | 159/165 | launch pose 499/500 (row 113) | 478/500 (rows 0-20, 115; 23,976 px) | 394/500 |

"All exact" means these checks match on every row:

- source cursor, active, task counts, tasks, sprites, attacker launch pose and matrix;
- palettes on the rendered banks: 2 / 3 / 4 / 16 / 17 on every row, and the warm-rock bank 23 from row 2;
- shake battlers, platform latch (`gBattle_BG3_X` / `bg3hofs`), Eruption source order, and animation RNG;
- body length (`rowCount`): the model's `endAge + 1` equals the ROM window in 10/10.

Three checks are not exact on all rows, and none of them is a model defect:

- **`fullSourceOrder`** fails 2 rows in every window: row 61 and a matching wave-2 row. The same rows fail with the corpus profile (`fullSourceOrderCorpusProfile`), so this is reducer-inherent. The renderer reads `fullPainterOrder`, and pixels are 0 on those rows.
- **`paletteAll512`** fails because the composite fills only the rendered banks. The renderer does not read the other banks.
- **`reducerEqualsCorpusProfileReducer`**: row 0 differs only by the H tile range; the larger counts come from the extractor's wrong `battlerYDelta`.

**Pixels: 1,946/1,946 rows 0 px** on the accepted pair plus the prep29 alternates. Over all 10 windows, **4,850/4,874 rows are 0 px** (4,372/4,374 without the out-of-Factory ONIX attacker). The misses are:

- **row 0 of the two windows with an elevated opponent**: 195 px each. This is the enemy shadow in the pre-activation latch, the hand-off frame owned by the field renderer, exactly as Skill Swap / Shock Wave / Nightmare (prep35 §1.3).
- **the ONIX-attacker window**: outside the Factory. See §1.4.

### 0.3 Negative controls (receipts `eruption-neg-*.json`; accepted P + prep36 O CAMERUPT)

| Perturbation (`--neg=`) | Field check | Pixels |
|---|---|---|
| `wave2`: wave-2 start E1 + 1 instead of + 2 | rows 475/476, source 338/476, tasks 197/476, sprites 324/476, platform 274/476 (and O likewise) | 181/476 (663,923 px), 189/494 (644,977 px) |
| `ydelta`: `battlerYDelta` + 1 | launch pose 440/476, 470/494 | 440/476 (11,834 px), 470/494 (17,216 px) |
| `anchor`: attacker y + 1 (launch geometry) | tasks 314/476, sprites 398/476, launch pose 314/476 | 316/476 (64,506 px), 316/494 (133,520 px) |
| `palette`: composite bank-2 word 1 ^ 0x0421 | palettes 0/476, 0/494 | 0/476 (1,827,196 px), 0/494 (1,941,828 px) |
| `order`: identity activation order instead of the lend | full source order 0/476, 0/494; Eruption source order 475/476, 493/494 | **pixel-neutral** (476/476, 494/494) |
| `sub`: opening palette subpriority = attacker sub (not - 2) | sprites 462/476, 480/494 | **pixel-neutral** (the palette sprite is invisible) |

All six fail their field checks, and four of them also fail pixels. Two of the derived fields are state-only in these windows: the lend's tail order and the palette-sprite subpriority.

### 0.4 Field classes (**S** source program, **K** known-entry constant, **A** battler anchor / species table, **P** asset palette, **L** host lend, **M** measured constant, **H** host history (pixel-neutral), **T** CPU phase)

| Class | Fields (profile path -> derivation) |
|---|---|
| S | Script cadence (`battle_anim_scripts.s:3805-3828`), in rows:<br>- wave 1 task at 19, after the opening blend (delay 2, 0 -> 4) plus `waitforvisualfinish`;<br>- each companion `Task_WaitAndPlaySE` ends at start + 59 (`waitplaysewithpan .., 60`);<br>- **wave-2 start = E1 + 2**;<br>- falling creation = E2 + 34 (`waitforvisualfinish`, `delay 30`);<br>- shake tasks after creation + 23 (`delay 22`), `loopsewithpan` + 24, closing blend + 106;<br>- `endAge` = E2 + 294.<br>E1 and E2 come from the **unchanged** `eruptionLaunchTimeline` given the attacker y; they equal 2 E1 + 277 = `endAge` in 10/10 windows.<br>Falling calls `ERUPTION_FALLING_ROCK_SOURCE_CALLS`; geometry 16 / 16, subpriority 3 (`ScriptCmd_createsprite` floor), priority 2, h-flip.<br>`centerToCornerVecY` -64 and pic height 64 (64x64 affine double).<br>Closing-blend subpriority 3; opening = attacker subpriority - 2 (createsprite arg 2).<br>Tag 10201; allocations loaded at row 1 and freed at `endAge`.<br>Attacker x2 / y2 = 0 at shake creation (`battle_anim_fire.c:845`, the launch task resets x2). |
| K | Tile range [537, 84] and palette slot 7 (first fit over the known-entry allocator).<br>`paletteTagsAtAge0` (`ER36.paletteTags`).<br>Free OBJ slots = the known-entry free list (55 for the launch scan; the lowest 6 for the falling rocks; slot 3 for both palette sprites).<br>Task slots 0 / 1 (launch + companion), 0 / 1 / 2 (platform / battler shake / loop SE).<br>Battler matrices `healthBoxesData.matrixNum` 1 (player) / 2 (opponent).<br>Battler subpriority 30 / 40; platform x 0 (S0 `gBattle_BG3_X`).<br>Scene occupants `KNOWN_ENTRY_NON_BATTLER_SPRITES`.<br>All of these are equal in 10/10 windows. |
| A | Attacker sprite centre (x, **y**: drives E1 / E2 / `endAge`), `battlerYDelta` = `art[side].coords.yOffset` (**load-bearing**: `--neg=ydelta`; BARBOACH 10 / 11, CAMERUPT 19 / 9, TORKOAL 10 / 2, STEELIX 0, WEEZING 2), shake battlers (sprite centre + the target's `frontIdleRest`), palette-sprite position = target `picOffsetPoint`, sort keys from `battlerSprite` |
| P | `composeLivePalettes(player, opponent)` banks 2 / 3 / 4 / 16 / 17 (exact at activation and through both RGB_RED blends on every row); warm-rock palette from `src/animation/assets/eruption-warm-rock.json` |
| L | Activation `sSpriteOrder` (pixel-neutral here: `--neg=order`); presentation RNG value (pass-through, Eruption draws no Random2, prep29); gameplay RNG / immutable state (pass-through) |
| H | `tileRangeBeforeLoad` (previous body's tile slot 6 residue: [433, 12] / [305, 16]; the model uses [0, 0], pixels 0); OBJ bank 23 on rows 0-1 (previous palette before the load is displayed; no rock is drawn before row 21); the enemy-shadow sort key / row-0 latch of an elevated opponent (model: known-entry invisible shadow, `initialKeys[2].y` 0 vs 65: pixel-neutral from row 1) |
| M | none |
| T | **none**: 0 lag frames in every window; the body length varies only with the attacker geometry (derived) |

## 1. Details

### 1.1 What the branch reads

`sceneOnEruptionView` gives the reducer frame at ages `age`, `age - 1` and `age - 2`. From it, the renderer reads:

- palette `hardware` banks 2 / 3 / 4, 16 + attacker / target battler id, and 16 + `warmRockPaletteSlot`;
- `horizontalShake.platform.displayedX` and the battlers' `hardwareOamX2` / `y2`;
- the launch battler pose and its `hardwareMatrix`;
- the launch / falling sprites (`tileOffset`, x, y, x2, y2, `birthAge`, `invisible`) and `order.fullPainterOrder`.

From the profile it reads `palette.attackerBattler` / `targetBattler`, `launch.geometry.attackerSpriteSlot` and the shake battler slots. It also reads the config species, geometry and `fieldProfile` (HP / gender for the healthboxes).

It reads **no** BG / WIN registers: the accepted O window activates with WIN0 0,0, P with 240,161, and both are 0 px. There is therefore **no first-body gate**, unlike prep29's suggestion. Audio is not rendered. The model still builds the audio profile, the reducer requires it, and the loop-SE task is checked on every row.

### 1.2 Schedule derivation

`eruptionProfile36` runs the launch reducer in two passes:

1. Wave 2 is parked at age 900, which yields wave 1's task lifetime end E1.
2. Wave 2 is set to E1 + 2, which yields E2.

All later ages are fixed offsets from E2 (§0.4 S). E1 depends on the attacker y and side through the source launch program (the rocks' invisibility test `y > 120` and the opponent's per-5-frame y walk):

- y 99 / 90 -> 99;
- y 80 -> 102;
- opponent y 51 -> 108;
- opponent y 49 -> 108;
- opponent y 42 / 36 -> 111.

### 1.3 Corpus-profile extractor drift

`eruptionProfileFor` (the accepted framebuffer verifier's profile) reads most fields from the capture. It hard-codes `battlerYDelta` (`eruptionReducer.ts:66`), and that value is right only for BARBOACH. Fed through the same renderer, the corpus-style profile fails:

- 84 rows (TORKOAL O);
- 92 (CAMERUPT P);
- 56 (CAMERUPT O);
- 96 (STEELIX P).

The failures are on the launch rows (the attacker y2 after `SetBattlerSpriteYOffsetFromYScale`). The model's species value is exact on all of them. Any production builder must use the species `y_offset`.

### 1.4 Attacker with a front idle rest (outside the Factory)

ONIX as the opponent attacker (front idle rest x2 = 1) misses on two sets of rows:

- **Rows 0-20 (1,091 px each).** Before the launch task, the renderer draws the attacker at `spriteCorner + shake.hardwareOamX2`. That value is the shake's `initialX2`, which must be 0 to be source-correct at shake creation, because the launch task zeroes x2.
- **Row 115 (launch pose row 113).** The reducer applies `geometry.initialX2` to both waves; the source wave 2 starts from x2 0.

Fixing either needs a reducer or renderer change. MOVE_ERUPTION's only Factory user is CAMERUPT (1 set in `battle_frontier_mons.h`, rest {0, 0}), so the production builder should **decline when the attacker's `frontIdleRest` is non-zero**. A target idle rest is fine: the accepted P ONIX target is 0 px.

## 2. Integration recipe (no src change made here)

1. **`src/engine/liveProfileMoves.ts`**: add `liveEruptionProfile(input)` next to `liveSpikesProfile` (`:29`). It is a 1:1 port of `prep36EruptionModel.ts` `eruptionProfile36` and takes these inputs:
   - side;
   - attacker / target anchors from `liveBattlerAnchors` (`liveMoveAnimation.ts:482`);
   - `art[side].coords.yOffset`;
   - `battlerSprite` from `liveBgSnapshotMoves.ts:48` and `KNOWN_ENTRY_NON_BATTLER_SPRITES` (`:41`) for the sort keys;
   - `KNOWN_ENTRY_FREE_SPRITE_SLOTS` (`liveMoveAnimation.ts:539`);
   - the palette composite and the `eruption-warm-rock.json` palette;
   - the lent order and the presentation RNG value.

   The schedule needs the launch reducer through the seam (src/engine reaches src/animation only through the pinned seam). Either pass `eruptionLaunchTimeline` as a callback, as Will-O-Wisp's `timeline` does, or import it where `liveMoveAnimation.ts` already imports animation modules.
2. **Duration**: in `liveMoveAnimationDuration` (`liveMoveAnimation.ts:579`), add `case 284: field === undefined ? null : liveEruptionProfile(...).endAge + 1` next to Water Spout (`:587`). This gives 476 / 494 / 500 / 482 rows, depending on attacker geometry.
3. **Config**: add `case 284` next to the profile-move case (`liveMoveAnimation.ts:2566`): `{ move: "ERUPTION", attacker, target, fieldProfile, animationProfile }`. Use the same gates as Spikes:
   - `spriteOrderInput.known`;
   - a non-shiny pair (`liveBattlerIsShiny`);
   - `composeLivePalettes` non-null;
   - **plus** attacker `frontIdleRest` == {0, 0}.

   No first-body gate is needed (§1.1). Rows 0 of an elevated-opponent window are the shadow hand-off frame, handled as for Skill Swap / Shock Wave.
4. Renderer and reducer: no change. Expected dense acceptance is every body row exact. The accepted pair plus prep29 / prep36 alternates measured 4,874 rows, and the only misses are §0.2's documented row 0 frames and the out-of-Factory ONIX attacker. Bucket: **scoped exact** (no D3 / D4 parameter).

## 3. Not reached / limits

- **Not probed:** later bodies (a second Eruption in one battle with a non-known-entry lend / allocator), shiny battlers, doubles, and a status-animation-active attacker (the audio profile's `attackerStatusAnimationActive`).
- **Out of scope:** Eruption damage scaling with HP is gameplay. The animation does not read HP beyond the healthbox.
- **Row 0 for elevated opponents:** these windows were compared with the plain renderer only. The hand-off-frame shadow is the live seam's job.
- **H values:** the host's previous-body values (tile slot 6 residue, OBJ bank 23 before row 2) are not modelled. They are pixel-neutral in all 10 windows.

## 4. Files and reproduction

| File | Role |
|---|---|
| `tools/integration/prep36EruptionModel.ts` | Source-derived `EruptionAnimationProfile` builder (`eruptionProfile36`, `ER36` constants, negatives) |
| `tools/integration/prep36EruptionCheck.ts` | Profile leaf diff vs `eruptionProfileFor`, per-row field checks vs ROM rows, pixels (model + corpus-profile baseline), `--neg=wave2\|ydelta\|anchor\|order\|palette\|sub` |
| `tools/integration/prep36Scenarios.py` | Writes the 6 `tools/battle-lab/prep36-eruption-alt-*.json` scenarios (attacker / target species swaps of the prep29 alternates) |
| `tools/integration/prep36Run.sh` | Probes (each scenario twice, state `cmp` + RGB `diff -rq`) + check + pixels + negatives + summary into caller-given `OUT` / `REC` |
| `tools/integration/prep36Summary.py` | One-screen `summary.txt` from the receipts |
| `tools/integration/fixtures/prep36/` | 7 JSON receipts + `summary.txt` (counts, mismatch rows; no RGB, no mGBA logs) |

```sh
OUT=/tmp/p36x/probe REC=/tmp/p36x/rec sh tools/integration/prep36Run.sh            # 8 scenarios x 2 fresh probes + 10-window check/pixels + 6 negatives (~3-7 min)
for f in tools/integration/fixtures/prep36/*; do cmp $f /tmp/p36x/rec/$(basename $f); done
OUT=/tmp/p36x/probe REC=/tmp/p36x/rec2 SKIP_PROBES=1 sh tools/integration/prep36Run.sh   # second checker pass over the same probes
```

## 5. Papercuts

- PAPERCUT: the accepted Eruption scenarios are named "camerupt" but stage species 323 (BARBOACH, the national-dex number). The accepted profile extractor also hard-codes BARBOACH's `battlerYDelta`. Both hide the real Factory geometry until a direct probe; this cost ~4 minutes.
