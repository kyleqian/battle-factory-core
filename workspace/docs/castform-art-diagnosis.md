# ISSUES #143 — CASTFORM live art residual: root cause (diagnosis only, no production change)

## Answer

**The art is right; the Y placement is wrong.** The ROM's CASTFORM battler VRAM tiles and OBJ palette are
pixel-identical to the app's extracted pic and palette (0/4096 pixels, 16/16 palette entries). The constant block is a
sprite **position** error caused by two Castform-specific source tables the app does not model:

| side | source rule (`reference/pokeemerald/src/battle_anim_mons.c`) | ROM (RAM) | app | residual |
|---|---|---|---|---|
| player back | `GetBattlerYDelta` returns `sCastformBackSpriteYCoords[gBattleMonForms[b]]` = **0** for every form (`:72-79`, `:208-210`), not `gMonBackPicCoords[CASTFORM].y_offset` (13) | OAM y 48 (sprite y 80, centre) | origin y 48+13 = 61 (`battleCommandFieldArt.ts:86-88`) | sprite 13 px low → 800 px/row |
| opponent front | `GetBattlerElevation` returns `sCastformElevations[form]` = **13** for normal form (`:62-68`, `:255-258`), not `gEnemyMonElevation[CASTFORM]` (16) | OAM y 12 = 8 + 17 − 13 | 8 + 17 − 16 = 9 (`battleCommandFieldArt.ts:116-118`, JSON `enemy-mon-elevations.json` CASTFORM = 16) | sprite 3 px high → 400 px/row |

Opponent front `y_offset` is already right (17 = `gCastformFrontSpriteCoords[CASTFORM_NORMAL]`, same as `gMonFrontPicCoords`).
The ROM loaded the **normal form** (`gBattleMonForms` = 0 both sides, no weather).

## Evidence

* **Residual location (step 1)** — `tools/integration/castformDiagDiff.ts` re-renders the app frame for the retained
  castform-alt runs and diffs it with the ROM RGB: player bbox x57..185 y75..111 (the sprite plus where it should
  have been), opponent bbox x59..186 y21..58; ROM and app colours are the same palette on both sides, shapes are
  the same sprite displaced vertically (not a palette or tile difference). Reproduces the issue exactly: player 237/237 rows at
  800 px (189,600), opponent 400/401 px per row.
  Crops: `tools/integration/fixtures/castform-diag/crop-{player,opponent}-age0.json` (ascii, ROM vs app, legend inside).
* **ROM side (step 2)** — `tools/integration/castformDiagRom.py` + driver `castformDiagRun.py` (direct mGBA, Scene ON like the
  retained scenarios; the CASTFORM scenarios are the committed MINUN alt scenarios with species 354→385, byte-identical to the
  retained ones). Two fresh runs per case asserted identical. `fixtures/castform-diag/rom-evidence.json`:
  * player CASTFORM: gSprites slot 6, OAM attrs (48, 49192, 2417) = 64x64, tile 369, palette bank 0, **OAM (40, 48)**, y 80/y2 0,
    `gBattleMonForms`=0; VRAM tile range pixel mismatch vs app back pic: **0 at shift 0**; OBJ palette == app palette.
  * opponent CASTFORM: slot 8, tile 473, bank 1, **OAM (144, 12)**, y 44, VRAM 0 mismatch, palette equal.
  * MINUN controls (same scenarios): OAM y 56 (player: 48 + back y_offset 8) and 20 (opponent) — those follow the generic rule, which is
    why MINUN is exact.
  * Positions are static from frame 40 through 79 (idle), so the activation frame is not special.
* **App side (step 3)** — `createBattleCommandFieldArtView` (`src/engine/battleCommandFieldArt.ts:58-92`) picks the CASTFORM pic/palette
  correctly (`liveSceneOnBattlerArt`, `battleScene.ts:14871`, just indexes the same asset), then sets `origin.y = (48|8) + coords.yOffset`
  and `battleCommandFieldSpriteOrigin` (`:110-120`) subtracts `enemy-mon-elevations.json[speciesSymbol]`. First differing element vs ROM: that
  origin (app (40,61)/(144,9) vs ROM (40,48)/(144,12)).
* **What-if proof (no tracked file edited)** — `CASTFORM_DIAG_WHATIF=1 castformDiagDiff.ts` mutates only the in-memory JSON modules
  (`mon-pic-coords.back.CASTFORM.yOffset` 13→0, `enemy-mon-elevations.CASTFORM` 16→13): **237/237 rows exact, 0 residual px, both orientations**
  (`fixtures/castform-diag/app-vs-rom-whatif.json`; baseline 189,600 / 95,025 px). So these two numbers are the entire residual.

## Minimal fix proposal (production; not applied here)

1. `src/engine/battleCommandFieldArt.ts:86-88` — player origin Y must use the source Y delta, not the back coords' `yOffset`, for CASTFORM:
   `y: (side === "player" ? 48 : 8) + (species is CASTFORM && side === "player" ? 0 : picCoords.yOffset)` (a tiny `SOURCE_Y_DELTA` override table
   keyed by speciesSymbol is cleaner). Keep `coords` (32x40, yOffset 13) as is: the player's `GetBattlerSpriteCoordAttr` still reads
   `gMonBackPicCoords` for Castform (`battle_anim_mons.c:2200-2227`), so `liveBattlerCoordAttrs`/`pictureHeight` stay correct.
2. Elevation 16→13: preferably in the extractor so the JSON stays generated — `tools/extract/extract-enemy-mon-elevations.ts` should emit
   `CASTFORM: 13` (`sCastformElevations[CASTFORM_NORMAL]`) and regenerate `src/data/gen/enemy-mon-elevations.json`. Every consumer (the
   art view `:116`, `battleScene.ts` `enemyMonElevation` at `:5015` and its call sites `:5260/:5665/:8119/:23056/:54139/:54177`,
   `liveMoveAnimation.ts:1260`) then agrees with no further edit.
3. Latent, not a pixel residual here: the opponent's `GetBattlerSpriteCoordAttr` for Castform reads `gCastformFrontSpriteCoords[form]`
   = 32x32 (`:2253-2255`) while `mon-pic-coords.json` front CASTFORM is 24x32 (`gMonFrontPicCoords`). `liveBattlerCoordAttrs` width is therefore 24
   vs the source 32 for width-dependent moves (extractor `extract-battle-mon-pics.ts` / `mon-pic-coords`). Not exercised by Thunderbolt.
4. Not modelled anywhere: non-normal forms (Forecast/weather): per-form palette (`gBattleStruct->castformPalette[form]`,
   `battle_gfx_sfx_util.c:615-620`), coords (`gCastformFrontSpriteCoords`), elevation (14/13/13 for fire/water/ice) and back Y. Singles with
   weather will need `gBattleMonForms` in the field view; the normal form is correct after fixes 1-2.

## Blast radius

* **Not animation-only.** The art view origin feeds the static scene, send-out/materialize, faint, switch (`battleScene.ts:5233-5260`,
  `:5665-5685`, `:8119`, `:54139-54177`) and every live move adapter. Any Castform on the field renders 13 px low (player) / 3 px high
  (opponent) in all of them; the move-specific code is not at fault (MINUN exact).
* Shared-cause species (source special-cases in `GetBattlerYDelta`/`GetBattlerElevation`/`GetBattlerSpriteCoordAttr`): **CASTFORM** (this issue);
  **UNOWN** — ROM checked directly: personality 0x101 (letter F) gives player OAM y 58 = 48 + `UNOWN_F` y_offset 10 (and the F back pic),
  while the app art view always uses the `UNOWN` (letter A) pic/coords (y_offset 8 → 56, wrong pic); the personality→letter path
  (`GET_UNOWN_LETTER`, `mon-pic-coords.json` has `UNOWN_B..Z`) is not wired into `fieldArtBattler`. UNOWN (frontier mon 126) and SPINDA (145) are in
  the Factory level-50 initial range (110-199); CASTFORM sets 204/309. DEOXYS is not in any Factory set. SPINDA has a single pic/coords
  (spot pattern is a personality-dependent palette/pixel overlay, handled outside this view; not re-verified here). Unown is a separate residual
  to file/verify (the Unown ROM probe above was a one-off, not committed as fixture).

## Reproduce

```
python3 tools/integration/castformDiagRun.py 79        # ROM evidence, 2 fresh runs each, asserts identical -> fixtures/castform-diag/rom-evidence.json
npx tsx tools/integration/castformDiagDiff.ts <.integration/validation/prep8-batch-worker/castform-alt> player all   # baseline 189600 px
CASTFORM_DIAG_WHATIF=1 npx tsx tools/integration/castformDiagDiff.ts <same dir> opponent all                     # 0 px
```

Note: the opponent ROM run activates 4 frames later (frame 83) than the player run (79); the ROM dump frame (79, idle) is position-identical
(verified at frame 40 and 79). Evidence dirs live in the master checkout's untracked `.integration/`.
