# bnd254b: tick path stops reading sprite pixels (finish plan Phase 3, bundle hygiene `bnd-b`)

Goal: the headless tick path reads field-battler picture geometry and palettes from small generated tables, not from
`src/assets/gen/battle-back-sprites.json` / `battle-opponent-front-sprites.json`. The JSON imports stay (that is `bnd-c`), so
headless size does not shrink yet; after this step every remaining headless use of the sprite pixels is render-only.

## What changed

- `src/assets/gen/battle-pic-geometry.json` (34 KB), written by `npm run extract:battle-pic-geometry`
  (`tools/extract/extract-battle-pic-geometry.ts`): `{back, front}` per species symbol (376 each), `substituteDoll.{player,opponent}`,
  `castform[form].{player,opponent}`, each `{columns, rows, topRow}`. `topRow` is the first tileset pixel row with a non-zero pixel
  (null if none; no sheet is empty). All 752 species sheets are 8x8 tiles; doll and CASTFORM forms too.
  The function is `monPicGeometry` (`src/engine/monPicGeometry.ts`, pure, no JSON).
- `BattleCommandFieldArtBattler` has a new `picGeometry` field (`battleCommandFieldArt.ts`), set for every variant: species pic (table),
  Substitute doll (table), CASTFORM weather form (table, by form), transformed battler (the copied species' geometry through the
  `...shown` spread).
- `fieldArtBattler` builds `pic` as `{...spriteTableEntry, palette}` with `palette` from `battle-sprite-palettes.json` (cached per side /
  species, so `pic` identity stays stable). `pic.tileset` / `pic.frame2` are still the sprite table's own objects (render input).

## Read inventory (before, on `b460b28c3`)

| Read | Where | What it read | Now |
| --- | --- | --- | --- |
| faint timing sprite height | `battleResolutionPresentation.ts:4880` | `fieldArt.player.pic.tileset.rows` | `fieldArt.player.picGeometry.rows` |
| faint skip-rows guard | `battleResolutionPresentationRender.ts:2569` | same `rows` (render-time, but cheap, switched for one source of truth) | `picGeometry.rows` |
| Extrasensory gate | `liveMoveAnimation.ts:4914` `liveFieldArtTopLine`, called at `:4462` | scanned `pic.tileset.tiles` for the first opaque row | `origin.y + picGeometry.topRow` (Infinity when null) |
| attacker / target palette | `liveMoveAnimation.ts:3314` | `art[side].pic.palette` | unchanged code; `pic.palette` is now the table palette |
| castform / doll palette patch | `liveMovePaletteComposite.ts:48,67` | `art[side].pic.palette` | unchanged code; same |
| transform palette | `battleCommandFieldArt.ts` (transform branch) | `shown.pic.palette` | unchanged code; same |

`liveSubstituteSwap.ts`, `liveSubstituteFade.ts` and `liveTransform.ts` only use the art types; no pixel or geometry read. No other
`src` module outside `battleScene.ts` / `battleSceneCanonical.ts` / `monPicRender.ts` / `summaryInfoPage.ts` reads `.pic` or a sprite
`tileset`.

Verified dynamically too: with `pic.tileset` temporarily replaced by a proxy that throws on any property read (not committed),
`tests/factoryLibrary.test.ts` kept passing every replay / event test (win, loss, streak, trace hand-outs, each with real battles);
the only failures were the three tests that render frames, and their stack was `core.ts render` -> `battleScene.ts drawSpriteSheet`.

## Remaining render-only uses of the sprite JSONs in the headless graph

- `battleScene.ts`: `import ... battle-opponent-front-sprites.json` (`:526`) / `battle-back-sprites.json` (`:697`) and the ~100 top-level
  `const xFrontSprite = asset.X!` consts; every `art.pic.tileset` / `.frame2` read in the renderers (`drawSpriteSheet*`, affine / tint draws,
  `battleScene.ts:5433+`, `:7942`, `:8495+`, `:55006+`). They run under `render()`, never `tick`.
- `battleSceneCanonical.ts`: `*FrontSprite.tileset` / `*BackSprite.tileset` draws (render).
- `battleCommandFieldArt.ts` itself: the two table imports and `speciesPic` (the pixel reference handed to `pic`). This is the single
  retainer `bnd-c` replaces with a pixel provider.
- `monPicRender.ts:28`, `summaryInfoPage.ts:58` (draft / summary screens; tree-shaken in headless today).
- Not changed, small: `castform-forms.json` (palettes + pixels of the 4 forms, ~0.1 MB) and `animation/assets/substitute.json` still supply the
  doll / form `pic`; their geometry now comes from the table, their palettes are still read from those small assets on the tick path.

## Acceptance

| | Before (`b460b28c3`) | After |
| --- | --- | --- |
| `ENGINE_BUILD` (`tools/build/engineBuildCheck.ts`) | `eb-f5ed6a9418d226b7` | `eb-7b7399877f107136` (expected: emitted code and a new 34 KB table) |
| headless.js / chunks-headless | not re-measured on this base; the `bnd253a` baseline was 3,163,907 / 19,315,139 B | 3,164,714 / 19,351,586 B (+37 KB: the table; the 11.77 MB `assets-sprites` chunk is still there until `bnd-c`) |
| `npm run typecheck` / `build` / `build:lib` | 0 | 0 / 0 / 0 |

The website must be told the build id moved (the engine's tick outputs did not).

Equality proof, `tests/bnd254bPicGeometry.test.ts` (Tier 1, ~0.2 s):

1. `battle-pic-geometry.json` equals `extractBattlePicGeometry(...)` of the pixel sources (the extractor round trip; 376 + 376 + 4 + doll).
2. Exhaustive old read vs new read for every species on both sides (752 sheets) through the real `createBattleCommandFieldArtView`: `rows`,
   `columns`, `liveFieldArtTopLine` against a verbatim copy of the pre-bnd254b pixel scan, `pic.palette` against the JSON palette,
   `pic.tileset` identical to the JSON object.
3. Substitute doll (both sides) and CASTFORM forms 1..3 (both sides): the table geometry equals the scan of the sheet actually drawn.
4. A transformed battler carries the copied species' geometry.
5. Static ratchet: `battleResolutionPresentation.ts`, `battleResolutionPresentationRender.ts`, `liveMoveAnimation.ts` and
   `liveMovePaletteComposite.ts` (comments stripped) contain no `pic.tileset`, `tileset.tiles` or sprite-JSON name.

One existing test changed: `cast83CastformForms.test.ts` "normal form" compared `pic` by identity to the JSON entry; it now compares by value
plus tileset identity (the palette is the table's equal array).

Full suite (`POKEBENCH_VITEST_MAX_WORKERS=4 npm test -- --shard=i/6`, foreground): all green.

| Shard | Files passed | Skipped | Tests passed | Skipped |
| --- | --- | --- | --- | --- |
| 1/6 | 294 | 4 | 2,149 | 27 |
| 2/6 | 286 | 12 | 2,166 | 58 |
| 3/6 | 292 | 6 | 3,035 | 34 |
| 4/6 | 292 | 6 | 2,709 | 48 |
| 5/6 | 288 | 10 | 2,298 | 47 |
| 6/6 | 292 | 6 | 1,992 | 27 |
| **Total** | **1,744 of 1,788** | **44** | **14,349** | **241** |

0 failed. (Shard 1 first ran with the cast83 identity assertion failing; fixed as above and the shard re-run green.)

## Next: `bnd-c`

`speciesPic` is the only place that still hands the sprite pixels to the tick-built art. A pixel provider can replace `{...sheet, palette}`
with a lazy `tileset` / `frame2` (filled by `lib.ts` via `import()` before the first `draw()`, never installed headless). Remaining render
reads listed above must go through the provider (`battleScene.ts` top-level consts are `bnd-d`).
