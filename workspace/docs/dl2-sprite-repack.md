# dl2: repack the battle sprite sheets (handoff "Website load time", step B, idea 2 of `docs/dl1-download-size.md`)

The two battle mon-pic sheets are stored as image rows instead of tile JSON. No behaviour change: the provider decodes each species into the
existing `{tileset, palette, frame2?}` shape on its first read and caches it, so no consumer changed. Base `466ad7724`.

## Format

`src/assets/gen/battle-back-sprite-rows.json` and `battle-opponent-front-sprite-rows.json` (replace `battle-back-sprites.json` /
`battle-opponent-front-sprites.json`) are `{ SPECIES: string }`, same 376 keys in the same order. One string per species:

`<frame 0: 4096 hex digits><frame 1 (front pics only): 4096 hex digits><16 colours x 3 channels: 48 base-32 digits>`

A frame is the 64x64 picture in raster order (one digit per pixel, values 0..15; the tile JSON stored it 8x8 tile by tile). A channel is the 5-bit
value (the old 8-bit `r/g/b` were all `(v5 << 3) | (v5 >> 2)`, so nothing is lost; the encoder throws if a channel is not). The length says whether
a second frame is present (4144 back, 8240 front; the four one-frame species keep their duplicate `frame2`, as before).
`src/engine/monPicSheetCodec.ts` holds `encodeMonPicSheet` / `decodeMonPicSheet` / `unpackMonPicTable` (all species at once) /
`lazyUnpackMonPicTable` (per-species accessor, replaced by the decoded value on first read; `in`, key order and enumeration as the plain table).
`monPicPixelsInstall.ts` builds the two lazy tables (`bundledMonPicTables()`, memoised) and installs them; `monPicPixels.ts` only changed in
`lazyMonPicTable`'s descriptor trap, which now reports the value (not the accessor) so the view stays a plain data table.

## Encoding choice (brotli-11 of the whole file, KiB; `tools/bundle/chunkSizes.mjs` method)

| per-species string | front | back |
| --- | --- | --- |
| tile JSON (before) | 450 | 233 |
| **hex digit per pixel, raster (shipped)** | **291** | **149** |
| hex, frame 1 / frame 2 rows interleaved | 302 | 149 |
| one `chr(48 + v)` per pixel | 291 | 149 |
| one string for the whole sheet | 288 | 146 |
| base64 of 4 bpp bytes | 400 | 190 |
| base64 of 8 bpp bytes | 428 | 201 |

Base64 loses (it scrambles the byte alignment the long runs rely on); a latin1 string would need `\u00xx` escapes for the 0..15 range, so a
printable digit per pixel is the compact JSON form. One string per species costs ~1 percent against one string for everything and keeps the
decode lazy and per species (a battle reads 6 species). The raw JSON text is 4.6 MB (a digit per pixel; the 2.3 MB in dl1 was the 4 bpp estimate,
which brotli compresses worse), the sprite chunk is 4,575 KiB raw against 11,495.

## Measured (`npm run build:lib`, readable output, brotli-11 KiB; `node tools/bundle/chunkSizes.mjs`)

| chunk | before | after |
| --- | --- | --- |
| `assets-sprites` raw | 11,495.3 | 4,575.4 |
| `assets-sprites` gzip-9 | 880.9 | 575.2 |
| **`assets-sprites` brotli-11** | **692.1** | **430.5** (-261.6) |
| every other chunk (`lib` 886.9 -> 887.0, `monPicPixelsInstall` 0.2 -> 0.8) | unchanged | +0.7 |
| browser total brotli | 2,463.3 | 2,202.4 (-260.9) |
| headless total brotli | 767.2 | 767.2 |

First-battle path (dl1 table 1, without audio): 2363 -> ~2102.

Node import time, median of 5 (`.integration/dl2/importtime.mjs`, `spritetime.mjs`; not committed): `import("dist-lib/index.js")` 777 -> 782 ms
(the sprite chunk is dynamic, so unchanged); importing and installing the sprite chunk (`monPicPixelsInstall`, which also loads the shared `lib`
chunk) 1083 -> 813 ms (-270 ms, the JSON parse of 11.5 MB of text). Decoding is on demand: a 64x64 species decodes in microseconds.
`ENGINE_BUILD` `eb-3ab085f4fc915b5c` before and after (the headless graph does not include the sheets or the codec).

## Pinned

`tests/dl2SpriteRepack.test.ts`: the decoded back / front tables, serialised as the old extractor did (`JSON.stringify(table) + "\n"`), have
the sha256 of the deleted files (`10b3dfbf...2dd12e`, `2ceccd10...8b566cf`), for the eager unpack and for the runtime lazy tables; `encode(decode(x)) == x`
for all 752 strings; the files hold only `[0-9a-f]` and `[0-9a-v]` digits; lazy decode / cache / key order; the encoder's range checks.
`tests/battleMonPicCatalog.test.ts` still regenerates the files twice and compares them byte-for-byte with the committed ones.

## What else changed

- `tools/extract/extract-battle-mon-pics.ts` writes the two packed files (and still `mon-pic-coords.json`, unchanged). `extract-battle-sprite-palettes.ts`
  and `extract-battle-pic-geometry.ts` read the packed files through `unpackMonPicTable` (their outputs are unchanged and pinned by
  `battleSpritePalettes` / `bnd254bPicGeometry`).
- Direct readers of the old JSON now use the provider's tables: `tests/helpers/battleSprites.ts` (9 tests), `tools/integration/prep16PaletteComposite.ts`,
  `tools/probe/verify-turn{9,10,13}-*.ts`, and the python probe `tools/probe/pixel-consequence-sendout-slice-a.py` (inline decode).
  `tools/bundle/spriteBudget.mjs` measures the packed strings; `tools/bundle/packExperiment.mjs` (the dl1 experiment this step implements) is removed.
- `vite.config.ts` `manualChunks`: the new file names go to `assets-sprites`. `bnd257dLazySprites` / `bnd256cPixelProvider` ratchets use the new names.
- `summaryInfoPage` / `monPicRender` read `front-sprites.json`? They read `frontPixels(species)` (the provider) as a fallback since bnd257d, and
  `src/assets/gen/front-sprites.json` is a different small table (the draft / summary catalog, 8 KiB brotli); left alone.

## Acceptance

`compare:differential` vs `466ad7724`, 6 traces (`draft-menu-slot6`, `summary-info-magby-front-animation`, `factory-round-battle6-lukas-status-summary-message-off`,
`presentation-rng-playable-live-bodies-seeded-on`, `battle1-swap-enemy-picker`, `retire-yes-lobby-freeroam-off`): 2,134 / 2,134 captures byte-identical.
`lsd194Census.sh` seeds 0..49 both scenes, base vs head, `rst197CensusDelta.py`: 50 / 50 battles identical each (15,080 ON and 14,733 OFF commands, `bad 0`).
`npm run typecheck` 0, `npm run test:gate` 362 files / 2,843 tests green, the tests importing the sheets or the provider green, `npm run build` and `build:lib` 0,
`npm run play:random -- --minutes 2 --scene both`: 0 page errors, 0 console errors, 0 contained, 0 overlays (6 + 15 battles, swap screens, canvas hash equal to the mirror).
