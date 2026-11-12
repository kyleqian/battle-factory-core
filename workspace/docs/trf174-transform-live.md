# trf174 — live Move_TRANSFORM body + transformed field (ISSUES #153 remainder)

INTEGRATION lane, 2026-10-14. Presentation only: no kernel event, damage, RNG, turn-order or facility change.
Production commit `33e29db0b` (src tree `9f2269bce9b6`); tests / tools / receipts in later commits on
`worker/integration-20261014-074723` (base `0d6ec248e`).

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| ROM ground truth (direct mGBA `trf174Probe.py`, 8 staged mechanicLab scenarios: Scene ON / OFF x player / opponent DITTO x SLOWBRO / elevated GOLBAT, each run twice fresh) | r1 == r2 byte-identical, 8 / 8. Move_TRANSFORM: **108 script rows + the first inactive row = 109**, same rows in both scenes and on both sides | `.integration/validation/trf174/probe1/`, `tools/integration/trf174Probes.sh` |
| Body through the production live renderer (`renderBattleResolutionLiveView`; `liveFixtureDriver.ts`, 2 fresh `run-battle-lab-rgb.py` processes per window) | **8 / 8 windows, 109 / 109 rows 0 px, both runs**; `expectedDuration` 109 == rows. ON and OFF window digests are identical | `tools/integration/fixtures/trf174/driver-{on,off}.json` |
| Body controls (`trf174Check.ts`, `TRF174_AGE_SHIFT=±1`) | fail as required: 77–78 / 109 rows exact, 22,577–31,750 px per window | below |
| Post-body field (`trf174Field.ts`: rows y < 112 from the first row after the window, 140 rows or up to the next script) | **8 / 8 windows, 140 / 140 rows 0 px**: the copied species' picture, the transform palette, its corner, an elevated GOLBAT's elevation and enemy shadow (opponent DITTO), DITTO's own idle rest. Controls: the untransformed DITTO field 0 / 140 rows (242,060–292,320 px), the copied species with its raw palette 0 / 140 (183,400–285,740 px) | `tools/integration/fixtures/trf174/field.json` |
| Tier-1 (`tests/trf174Transform.test.ts`, 5 tests) | all 8 x 109 ROM rows sha256-exact through the live renderer; the mosaic law; field art (pic, blend, elevation, own rest); ledger set on completion / reverted by a switch-in; declines | — |
| Ordinary route, census seed 197 (`trf174Route.ts`, production only), both scenes | the Transform command (CHANSEY via Metronome -> MANTINE) is **live: 112 frames = 3 pre rows (age 0) + 109 body rows (ages 0..108)**, then every view of the rest of the battle (12,498 ON / 11,771 OFF frames: messages, menus, HP, hits, stats-change, status animations, switch-ins of the other side, faint) shows the battler as MANTINE | `tools/integration/fixtures/trf174/route-seed197-{on,off}.jsonl` |
| Census 0..999, both scenes (`trf174Census.sh`, base `0d6ec248e` vs head `d27b4bcaf`, src == `33e29db0b`) | **Command KEY sequences and `battleDigestExcludingFrames` identical** in both scenes; played / terminal / stalled 1000 / 997 / 3 unchanged. Every change is in **battle 197** (the census's only Transform: CHANSEY's Metronome -> Transform copying MANTINE). ON: 34 records — the Transform 32-frame fallback -> **live 112 frames**, and 33 later bodies of that battle (Aerial Ace 6, BubbleBeam 10, Confuse Ray 3, Future Sight 1, Icy Wind 6, Magic Coat 2, Psybeam 2, Rain Dance 3) now decline with "transformed battler: no body proven on the copied picture" (31 were live: they drew CHANSEY where the ROM shows MANTINE; 2 Magic Coat were already presentation fallbacks with an 81-frame live duration). Live 27,030 -> 27,000 commands (99.35 -> 99.24 %), 4,139,338 -> 4,133,093 frames. OFF: 1 record — the Transform 32 -> live 112 (live 82 -> 83) | `tools/integration/fixtures/trf174/census-{on,off}-{check,delta,keycheck}.txt`, `census-attribution.txt` |
| Differential (`fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 0d6ec248e`) | **641 / 641 captures byte-identical** (235 + 216 + 190) | `tools/integration/fixtures/trf174/differential.log` |
| Gates on `f11ef79b3` (tree `0f4223bc5699`, src `9f2269bce9b6` == production commit `33e29db0b`) | typecheck 0; smoke 448 / 448 (on `33e29db0b`); **full `npm test` 1,676 files passed / 44 skipped, 13,909 tests passed / 223 skipped, 0 failed** (2,978 s, `POKEBENCH_VITEST_MAX_WORKERS=2`); **`npm run build` OK**; soak vanilla 0:20 `--parallel 2`: **NOT COMPLETED** — started 09:57 after the build, still running (no result line) at the 10:44 session cap; rerun required | `.integration/validation/trf174/gates/` |

## Source and measured law

`Move_TRANSFORM` (`data/battle_anim_scripts.s:8283`): `monbg ANIM_ATTACKER`, two sounds, `AnimTask_TransformMon`
(`battle_anim_effects_3.c:2250`), `clearmonbg`. The attacker moves to its anim BG (BG2 player / BG1 opponent;
`Task_UpdateMonBg` follows the sprite position and copies its OBJ palette every frame). The task enables the BG mosaic, steps
it 1..15 once every 3 task runs, calls `HandleSpeciesGfxDataChange` (`battle_gfx_sfx_util.c:935`), steps it back 15..0,
clears it and, for an opponent attacker, re-arms the enemy shadow for the copied species.

`HandleSpeciesGfxDataChange` loads the TARGET's party species picture (back for a player attacker, front for an opponent)
with `gTransformedPersonalities` (the target's personality: SPINDA spots), the copied species' palette picked with the
ATTACKER's own personality / OT (shininess), `BlendPalette(.., 16, 6, RGB_WHITE)` copied into the unfaded buffer (so the
transformed battler keeps the whitened palette for the rest of its stay), and sets the sprite y to
`GetBattlerSpriteDefault_Y` of the copied species (yOffset; elevation for the opponent).

Measured (RAM rows from the activation row 0): mosaic step k on row 3k + 3 (1..15, rows 6..48), the swap on row 49, steps
14..0 on rows 52..94, the sprite visible again from row 96, the script's first inactive row 108. The display shows each row
one row late (BG mosaic register, VRAM, palette): `liveTransformMosaicLevel(age)` = the RAM level of row age − 1, the copied
species from display row 50. BG mosaic samples the block's top-left screen pixel; the anim BG lies under the healthbox OBJs
(the opponent's mosaic blocks reach the player healthbox's top rows) and under the text window. The enemy shadow shows on
row 0 and is hidden from row 1 through row 108 (`SpriteCB_EnemyShadow`, `gAnimScriptActive`); after the window it shows for an
elevated copied species. The opponent battler keeps its own x2 (DITTO's front idle rest), not the copied species' rest.

## Production change

- `src/engine/liveTransform.ts` (new): timing law, `LIVE_TRANSFORM_ROWS` 109, the decline gate, `withLiveTransform`.
- `BattleCommandFieldBattler.transform` (presentation-only): at a reducer boundary from `STATUS2_TRANSFORMED`
  (`species`, `transformedMonPersonality`); inside a resolution set by the display ledger after a completed Transform body
  (`applyCompletedCommand`, both scenes; whether or not the body was drawn live). A switch-in replaces the battler (the revert;
  the ROM's `ClearTemporarySpeciesSpriteData`). Faint and switch-out keep the transformed picture, as the ROM's sprite does.
- `createBattleCommandFieldArtView`: a transformed battler draws the copied species' picture, coords, corner and elevation
  with `battleCommandTransformPalette` (per 5-bit channel `c + (((31 − c) * 6) >> 4)`); `restSpeciesSymbol` keeps the
  battler's own front idle rest (`liveBattlerAnchors`, the command menu's rst139 rest).
- `renderBattleResolutionLiveView`: move 144 renders `renderLiveTransformBody` (the ordinary field + the screen-space mosaic
  anim BG, healthboxes redrawn above it). `liveMoveAnimationDuration(144)` = 109; the command presents the universal 3 pre rows.
- Every OTHER live body declines while either battler is shown transformed (no adapter is proven on the copied picture /
  blended palette): those commands fall back to the static field, which now draws the transformed battler.
- Transform is NOT added to `LIVE_MOVE_ANIMATION_IDS` / the live inventory JSON (the 276 catalogue and the inventory are the
  supervisor's ledgers): it is a live body outside the counted catalogue, like a general animation, until folded.

## Named remainders

- **Declined Transform bodies** (fall back, field still transformed afterwards): a shiny transformer (the copied species'
  shiny palette is not modelled), a SPINDA target (spots by the target personality; battleCommandFieldArt.ts has no Spinda spot path
  for any field battler), a CASTFORM attacker / target (form-keyed frames and palette), a doll on either side, a transformed battler.
- **Other bodies while a battler is transformed decline** (static field, correct transformed picture, body effects undrawn);
  per-move proof on the copied picture is future work.
- **Next print timing**: ROM first glyph of the post-Transform message at activation + 112; production's message command starts
  after the 112-frame command (= the ROM's 3 pre rows + 109) and shows its first glyph immediately, i.e. activation + 109 under the
  pre-row convention (−3). The command itself equals the ROM's waitanimation span (cf. sub157's Substitute 90 == 90); the rows
  between `waitanimation` and the next print's first glyph are the shared Scene ON route-timing class (sub157: Substitute HP −6),
  not fitted here.
- A transformed CASTFORM / a CASTFORM target's form, and a doll shown over a transformed battler (its species anchors read the
  battler's own species), are not modelled.

## Reproduce

```sh
OUT=<fresh> sh tools/integration/trf174Probes.sh                     # 8 scenarios x 2 fresh direct-mGBA runs, r1 == r2 (~3 min)
node --experimental-strip-types --no-warnings tools/integration/trf174Check.ts <OUT> tools/integration/fixtures/trf174/trf174-*.json
TRF174_AGE_SHIFT=1 node --experimental-strip-types --no-warnings tools/integration/trf174Check.ts <OUT> tools/integration/fixtures/trf174/trf174-*.json
TRF174_FIELD_OUT=field.json node --experimental-strip-types --no-warnings tools/integration/trf174Field.ts <OUT> tools/integration/fixtures/trf174/trf174-*.json
POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/liveFixtureDriver.ts on.json tools/integration/fixtures/trf174/trf174-on-*.json
node --experimental-strip-types --no-warnings tools/integration/trf174Route.ts --seeds=197 --scene=on|off
TRF174_CENSUS_JOBS=7 sh tools/integration/trf174Census.sh <fresh> 0d6ec248e:on 33e29db0b:on 0d6ec248e:off 33e29db0b:off
sh tools/integration/ret88Census.sh compare <fresh>/on-78e61e8c1 <fresh>/on-64cf938b4 <out-on>   # and off
npx vitest run tests/trf174Transform.test.ts
```
