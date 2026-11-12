# cast83: per-form CASTFORM art; the cf78 weather-form decline lifted for ROM-proven bodies (ISSUES #143)

## Results

- **Field art is form-aware.** A CASTFORM in a weather form now draws its form in the field view: the form's frame and
  `castformPalette[form]`. The opponent uses `gCastformFrontSpriteCoords[form]` (size + y_offset) and `sCastformElevations[form]`;
  the player uses `sCastformBackSpriteYCoords[form]` (0). The live renderer's species sheets and palette banks read the same form.
  The normal form is byte-identical: differential **624 / 624** vs `f49b7d03f`.
- **ROM ground truth** comes from direct mGBA, lab seed 305420349, Scene ON, two fresh probe processes per scenario, r1 == r2.
  - Scenarios: audit 19's 16 `cast-*` scenarios plus 42 new `c83-*` ones.
  - Opposing species: CHANSEY, LAPRAS, MANTINE, SHARPEDO, and the elevated CROBAT / GOLBAT / PELIPPER.
  - Coverage: all three forms, both orientations, bodies by Castform and at Castform.
  - Each window is rendered through production `renderBattleResolutionLiveView` (`cast83Check.ts` = audit19Check with the slot form
    on the field).
  - Result: **181 windows; 134 live, every live window 0 px (all rows), r1 == r2.** Every proven key below has both Castform sides.
  - Table: windows / rows / px are summed per cell. "lifted" = measured with the form gate lifted (runner step 4); those keys keep
    declining.

| form | body | Castform | Castform = player | Castform = opponent |
|---|---|---|---|---|
| FIRE (sun) | AERIAL_ACE | defender (at) | 3 live, 150 rows, **0 px** | 3 live, 150 rows, **0 px** |
| FIRE (sun) | SHOCK_WAVE | defender (at) | 3 live, 789 rows, **0 px** | 3 live, 801 rows, **0 px** |
| FIRE (sun) | SUPER_FANG | defender (at) | 3 live, 600 rows, **0 px** | 3 live, 600 rows, **0 px** |
| FIRE (sun) | SURF | defender (at) | 3 live, 432 rows, **0 px** | 3 live, 432 rows, **0 px** |
| FIRE (sun) | SWIFT | defender (at) | 3 live, 240 rows, **0 px** | 3 live, 234 rows, **0 px** |
| FIRE (sun) | THUNDERBOLT | defender (at) | 3 live, 711 rows, **0 px** | 3 live, 711 rows, **0 px** |
| FIRE (sun) | WATER_PULSE | defender (at) | 3 live, 480 rows, **0 px** | 3 live, 480 rows, **0 px** |
| FIRE (sun) | EMBER | attacker (by) | 0/3 live; lifted 11651 px | 0/3 live; lifted 12314 px |
| FIRE (sun) | FLAMETHROWER | attacker (by) | 0/3 live; lifted 252460 px | 0/3 live; lifted 241491 px |
| WATER (rain) | AERIAL_ACE | defender (at) | 3 live, 150 rows, **0 px** | 3 live, 150 rows, **0 px** |
| WATER (rain) | BUBBLE_BEAM | defender (at) | 3 live, 717 rows, **0 px** | 3 live, 717 rows, **0 px** |
| WATER (rain) | DOUBLE_EDGE | defender (at) | 3 live, 423 rows, **0 px** | 3 live, 423 rows, **0 px** |
| WATER (rain) | ICE_BEAM | defender (at) | 3 live, 609 rows, **0 px** | 3 live, 609 rows, **0 px** |
| WATER (rain) | ICY_WIND | defender (at) | 0/2 live; lifted 335022 px | 0/2 live; lifted 0/337522 px |
| WATER (rain) | PROTECT | defender (at) | 1 live, 123 rows, **0 px** | 1 live, 123 rows, **0 px** |
| WATER (rain) | SHOCK_WAVE | defender (at) | 1/3 live; lifted 0 px (other: unclassified (case-local gate)) | 1/3 live; lifted 0 px (other: unclassified (case-local gate)) |
| WATER (rain) | SUPER_FANG | defender (at) | 3 live, 600 rows, **0 px** | 3 live, 600 rows, **0 px** |
| WATER (rain) | SURF | defender (at) | 3 live, 432 rows, **0 px** | 3 live, 432 rows, **0 px** |
| WATER (rain) | SWIFT | defender (at) | 3 live, 240 rows, **0 px** | 3 live, 234 rows, **0 px** |
| WATER (rain) | THUNDERBOLT | defender (at) | 3 live, 711 rows, **0 px** | 3 live, 711 rows, **0 px** |
| WATER (rain) | THUNDER_WAVE | defender (at) | 1 live, 120 rows, **0 px** | 1 live, 120 rows, **0 px** |
| WATER (rain) | WATER_PULSE | defender (at) | 3 live, 480 rows, **0 px** | 3 live, 480 rows, **0 px** |
| WATER (rain) | ICE_BEAM | attacker (by) | 3 live, 609 rows, **0 px** | 3 live, 609 rows, **0 px** |
| WATER (rain) | ICY_WIND | attacker (by) | 0/2 live; lifted 335691 px | 0/2 live; lifted 0/332548 px |
| WATER (rain) | SHOCK_WAVE | attacker (by) | 1/3 live; lifted 0 px (other: unclassified (case-local gate)) | 1/3 live; lifted 0 px (other: unclassified (case-local gate)) |
| WATER (rain) | THUNDERBOLT | attacker (by) | 2 live, 474 rows, **0 px** | 2 live, 474 rows, **0 px** |
| WATER (rain) | WATER_PULSE | attacker (by) | 3 live, 480 rows, **0 px** | 3 live, 480 rows, **0 px** |
| ICE (hail) | ICY_WIND | defender (at) | 1 live, 287 rows, **0 px** | 1 live, 287 rows, **0 px** |
| ICE (hail) | SCARY_FACE | defender (at) | 0/1 live; lifted 1371492 px | 0/1 live; lifted 1409982 px |
| ICE (hail) | SHOCK_WAVE | defender (at) | 1 live, 264 rows, **0 px** | 1 live, 266 rows, **0 px** |
| ICE (hail) | ICE_BEAM | attacker (by) | 1 live, 203 rows, **0 px** | 1 live, 203 rows, **0 px** |
| ICE (hail) | ICY_WIND | attacker (by) | 1 live, 287 rows, **0 px** | 1 live, 287 rows, **0 px** |
| ICE (hail) | SHOCK_WAVE | attacker (by) | 1 live, 266 rows, **0 px** | 1 live, 264 rows, **0 px** |
| ICE (hail) | WATER_PULSE | attacker (by) | 1 live, 160 rows, **0 px** | 1 live, 160 rows, **0 px** |
| normal (ctl) | PROTECT | defender (at) | 1 live, 123 rows, **0 px** | 1 live, 123 rows, **0 px** |
| normal (ctl) | SCARY_FACE | defender (at) | 3 live, 624 rows, **4266090 px** | 2 live, 416 rows, **2922216 px** |
| normal (ctl) | EMBER | attacker (by) | 3 live, 210 rows, **34959 px** | 3 live, 210 rows, **36930 px** |
| normal (ctl) | FLAMETHROWER | attacker (by) | 3 live, 630 rows, **695103 px** | 3 live, 630 rows, **624843 px** |

Notes:

- **Shock Wave in rain.** 2 of its 3 windows decline on the pre-existing Shock Wave case-local gate, as cf78 already recorded; that
  gate is unrelated to the form. Its live windows are 0 px.
- **Normal-form controls.** The `normal (ctl)` rows replay the same scenarios with Castform in its normal form. They show that the
  Ember / Flamethrower / Scary Face residuals belong to those bodies, not to the form. These bodies are already live with a
  normal-form Castform in production. See Limits.

**Gate (`liveCastformFormDeclines` / `liveCastformFormDeclineReason`, `liveMoveAnimation.ts`).** A live body with a weather-form
Castform is allowed only when its `moveId:role:form` key is in `LIVE_CASTFORM_FORM_PROVEN`.

- **Proven keys (29).** `role` is `by` when Castform attacks and `at` otherwise:
  - by: 196:by:3, 58:by:2/3, 352:by:2/3, 85:by:2, 351:by:2/3
  - at: 351:at:1/2/3, 129:at:1/2, 85:at:1/2, 352:at:1/2, 196:at:3, 58:at:2, 61:at:2, 332:at:1/2, 57:at:1/2, 162:at:1/2,
    86:at:2, 182:at:2, 38:at:2
- **Still declining, with a reason the census classifies:**
  - **Measured residual (5 keys, `LIVE_CASTFORM_FORM_RESIDUAL`):**
    - Ember 52:by:1. Its own residual: a red ember at ages 1..5 and the shadow row at age 0. The normal-form control has the same
      residual.
    - Flamethrower 53:by:1. Its own residual; the normal-form control has it too.
    - Scary Face 184:at:3. Its own residual; the normal-form control has it too.
    - Icy Wind 196:by:2 and 196:at:2. 332k..337k px in 6 of 8 rain windows, unexplained. No normal-form control was run.
  - **Not measured:** any other key, for example Fly, Ice Ball, Rest, Hail, Rain Dance, and Ember / Flamethrower / Scary Face in
    the other forms.
  - **Unknown form:** an argument outside 1..3. The art falls back to the normal form.
  - **Substitute swap composite:** `liveSubstituteSwap.ts` calls the gate without a request. Swap composites with a weather-form
    Castform are not measured.

**Census 0..999.** Base `f49b7d03f` (the supervisor's 10 shards) vs final `03bee8e77`. Final src then differs only by two `export`
keywords.

- **+32 commands / +6,521 frames live.** Live share goes from 93.79 % / 97.37 % to **93.91 % / 97.54 %**.
- **0 live -> fallback.** 0 pairing mismatches.
- **Unchanged:** the command KEY digest `26489b38…` and `battleDigest` `11b30db7…`. `battleDigestExcludingFrames` is equal in all
  10 shards.
- **391 changed command lines:**
  - 333 are only the decline `gate` line citations. They shifted because the gate block in `liveMoveAnimation.ts` grew.
  - 58 are the Castform commands.
- **Lifted (32):**
  - 603: Water Pulse 2, Thunderbolt 3, Ice Beam 4, Super Fang 1
  - 643: Ice Beam 2, Thunder Wave 1, Water Pulse 2, Surf 1, Double-Edge 1
  - 651: BubbleBeam 3, Aerial Ace 2, Shock Wave 1
  - 950: Shock Wave 3, Icy Wind 4, Water Pulse 2
- **Remainder (26):**
  - Not measured:
    - Ember 52:by:2 (651) ×4 and 52:by:3 (950) ×2
    - Fly 19:at:3 ×3, Ice Ball 301:at:3 ×2
    - Rain Dance 240:at:2 ×2, Rest 156:at:3, Hail 258:at:3
    - Flamethrower 53:by:2, Scary Face 184:at:2
  - Measured residual: Icy Wind 196:by:2 ×3 and 196:at:2 ×2 (651).
  - Now past the form gate, declining on other gates:
    - Protect (603) ×3: "sprite allocator history unknown"
    - Water Pulse (950) ×1: the case-local gate

**Scene ON / OFF parity (`cf78Parity.ts`).** RNG, rules context, boundary and facility state are equal at every action-menu
arrival on both routes:

| route | turns | Castform bodies | now live (base) |
|---|---|---|---|
| 950, hail | 20 | 19 | **9** (0) |
| 603, rain | 15 | 16 | **10** (0) |

**Gates on the final code:**

- Related set (every CASTFORM / castform / FieldArt test, the inventory and playable tests): **66 files / 1,274 tests**.
- Typecheck.
- Smoke: 448.
- Full suite as two shards:
  - 808 files + 22 skipped / 6,928 tests
  - 807 files + 22 skipped / 6,339 tests
  - Total **1,615 files / 13,267 tests, 0 failed**.
- Build.
- Differential **624 / 624 byte-identical**.
- `git diff --check`.

## What changed

- **Asset.** The new catalog is `src/assets/gen/castform-forms.json`, written by `tools/extract/cast83-extract-castform-forms.ts`.
  - For each form: the front frame (opponent schema, with `frame2` = the same frame) and the back frame, both from the per-form
    PNGs. The palette comes from the form's `.pal`.
  - The extractor parses the three source tables from `battle_anim_mons.c`.
  - Form order is `graphics_file_rules.mk`'s concatenation: normal, sunny, rainy, snowy.
  - Existing catalogs are untouched.
  - `tests/cast83CastformForms.test.ts` pins each form against the reference build's own sheets: 4bpp re-encoding ==
    `anim_front.4bpp` / `back.4bpp` chunk `form`, and BGR555 == `normal.gbapal` chunk `form`. It also pins form 0 == the existing
    `CASTFORM` entries.
- **Species-art paths.** Every path a live body uses to read species art:
  - `battleCommandFieldArt.ts`: `createBattleCommandFieldArtView`, `battleCommandFieldSpeciesSpriteOrigin` (doll),
    `battleCommandFieldArtElevation`. Everything that anchors on the art view follows: `liveBattlerAnchors`, the static scene, and
    the swap / fallback rows.
  - `battleScene.ts`:
    - `liveSceneOnBattlerSheet`, which feeds `liveSceneOnBattlerArt`.
    - The two species maps that every `renderSceneOnMovePresentation` branch reads. They now go through
      `liveCastformFormSheets`, armed by `renderBattleResolutionLiveView` from `fieldArt.*.castformForm`.
    - `renderSceneOffTurnView` and the staged (non-live) branch constants also read species art, but never in a live body.
  - `liveMovePaletteComposite.ts`: `composeLiveArtPalettes`. It replaces the 27 `composeLivePalettes(art.player.speciesSymbol, …)`
    calls in `liveMoveAnimation.ts`, and `composeLiveFieldPalettes` is built on it.
  - Not form-aware, and not read with a weather-form Castform by any proven key:
    - `monPicRender.ts`, which is draft / swap only.
    - The species-only art views in `liveMoveAbsorptionOrbCenters` and the geometry plan text (Giga Drain / Mega Drain / Dream Eater
      plans). Those moves are not in the proven set.
- **Scene OFF and fallback pixels.** These also change for a weather-form Castform, because the field art is shared. The ROM shows
  the form in Scene OFF too: `Cmd_docastformchangeanimation` emits `B_ANIM_CASTFORM_CHANGE` unconditionally, and it is not behind
  `HITMARKER_NO_ANIMATIONS`. The normal form is unchanged.

## Limits

- **Ember / Flamethrower / Scary Face residuals are not form residuals.** The normal-form controls (c83-ctl-*) show them with a
  normal-form Castform and these opposing species. Those bodies are live today in that case, for example census battle 950's Ember
  before the hail. This is a separate finding to file.
- **Icy Wind in rain is unexplained.** 2 of its 8 windows are exact.
- **Width (step 5) is not done.** For the normal form, front coords width stays at the app's 24, while the source has 32. The
  weather forms use the source sizes (48 / 32 / 64).
- **Transform** of a Castform form is still not modelled, as in cf78.

## Rerun (from workspace/)

```
node --experimental-strip-types tools/extract/cast83-extract-castform-forms.ts      # regenerates src/assets/gen/castform-forms.json
sh tools/integration/cast83Run.sh <fresh-out-dir>    # ~8 min: stage == committed, probe + derive == committed, final + lifted receipts == committed
node --experimental-strip-types --no-warnings tools/integration/cf78Parity.ts --seed=950 --streak=13 --out=p950.json   # and --seed=603 --streak=18
# census: git archive of each tree, 10 shards each (k = 0..9):
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=<100k>..<100k+99> --index-from=<100k> --out=r<k>.json --commands=r<k>.jsonl
python3 tools/integration/hist73Merge.py <dir> merged.json merged.jsonl; python3 tools/integration/prep43CensusDelta.py base.json base.jsonl final.json final.jsonl delta.json
```
