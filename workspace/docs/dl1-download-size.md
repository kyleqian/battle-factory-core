# dl1: download size of the browser library (handoff "Website load time", step B: measure and propose)

Measure and propose only: nothing under `src/` or the build config changed. Tree: `c6076ea27` (after lazy1, so the import-time work is already lazy).
All sizes are KiB of **brotli q11** unless stated; the build is the readable `npm run build:lib` output (the website's Vite minifies `lib`, so `lib` is
overstated by roughly 10 percent and the data chunks are not affected).

## Reproduce

```sh
npm run build:lib                                   # ~85 s
node tools/bundle/chunkSizes.mjs                    # table 1: raw / gzip / brotli per chunk
node tools/bundle/moduleBytes.mjs --top 60          # table 2: per source module (rollup rendered code per module, brotli of each alone)
node tools/bundle/spriteBudget.mjs                  # per-species sprite cost, species the Factory can show
node tools/bundle/packExperiment.mjs                # sprite sheet re-encodings (tile order vs raster, 4bpp vs 8bpp)
node tools/bundle/packTables.mjs                    # packing estimate for the other big tables
NODE_V8_COVERAGE=.integration/dl1/cov node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 3 --policy winning-swap --render-every 4 --max-frames 60000
node tools/bundle/deadCode.mjs --top 45             # V8 block coverage of that soak joined with the module sizes
```

## Table 1: chunks (browser entry `index.js`)

| chunk | loaded | raw | gzip-9 | brotli-11 |
| --- | --- | --- | --- | --- |
| `lib` (+ `index.js` 0.2) | static, first | 7133 | 1247 | **887** |
| `assets-sprites` | dynamic, but the mount waits for it (bnd257d `pixelsReady`) | 11495 | 881 | **692** |
| `assets-gen` | static | 8221 | 417 | **271** |
| `animation-assets` | static | 6152 | 373 | **237** |
| `data-gen` | static | 2941 | 247 | **160** |
| `data-battle-script` | static | 3636 | 228 | **116** |
| `audio-data` + `player` | dynamic, after first draw (not on the first-battle path) | 751 | 132 | 100 |
| **first-battle path** (everything above except audio) | | 39578 | 3393 | **2363** |

Audio files (1224 `.ogg` / `.m4a`, a track is 100 to 740 KB) are real files fetched when played; not counted.
Headless (`replayChallenge`, the Worker): `headless.js` 428 + `data-gen` 147 + `data-battle-script` 116 + `assets-gen` 69 + `animation-assets` 7 = 767 brotli.

**Note on the handoff's 3.26 MB.** Its per-chunk figures (data-gen 0.26, data-battle-script 0.24, assets-gen 0.42, animation-assets 0.36) match the
**gzip-9** column here, not brotli-11 (sprites 1.0 vs 0.88 gzip / 0.69 brotli; `lib` 0.81 is the minified build). If the CDN serves the chunks at gzip
or a low brotli level, serving them pre-compressed at brotli 11 is worth about **0.9 MB (-28 percent) with no code change** (idea 0 below). I cannot see
what the site's CDN sends from here; check it first.

## Table 2: where the bytes are (per module, brotli of the module alone)

| module | chunk | raw | brotli | note |
| --- | --- | --- | --- | --- |
| `assets/gen/battle-opponent-front-sprites.json` | assets-sprites | 6729 | 450 | 376 species, 2 frames each |
| `assets/gen/battle-back-sprites.json` | assets-sprites | 3444 | 233 | 376 species |
| `engine/battleScene.ts` | lib | 1576 | 130 | renderer + the retired Battle 1/2 march constants |
| `assets/gen/party-mon-icons.json` | assets-gen | 1872 | 98 | |
| `assets/gen/audio/manifest.json` | audio-data | 584 | 77 | lazy |
| `data/gen/battle-script-program.json` | data-battle-script | 2710 | 60 | |
| `data/gen/battle-script-graph.json` | data-battle-script | 951 | 40 | |
| `engine/liveMoveAnimation.ts` | lib | 253 | 40 | |
| `data/gen/battle-frontier-trainers.json` | data-gen | 850 | 36 | |
| `assets/gen/frontier-trainer-pics.json` | assets-gen | 460 | 34 | 300 trainers, one needed per battle |
| `assets/gen/battle-room-npcs.json` | assets-gen | 406 | 24 | |
| `animation/assets/*.json` (163 files, one per move effect) | animation-assets | 6000 | 237 | largest `hidden-power-red-orb` 11, `surf-wave` 9 |

The remaining `lib` bytes are 640 `.ts` modules; after `battleScene.ts` and `liveMoveAnimation.ts` the next are all 12 to 21 KiB (`battleScriptHitChainOpcode`, `battleResolutionPresentation`, `battleSceneCanonical`, `core`, ...).
`tools/bundle/moduleBytes.mjs` writes the full list to `.integration/dl1/modules.json`.

## Ideas, ranked

First-battle path before: **2363**. "After" is the path with that idea alone.

| # | idea | saves | first-battle path after | impl. size | risk | additive API for the website |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | serve the chunks pre-compressed at brotli 11 (if the CDN does not already) | up to ~900 vs the handoff's 3.26 MB; 0 vs this table | 2363 | none (deploy config) | none | none |
| 1 | per-species pictures through the pixel provider | **~677** (692 -> ~15) | **~1686** | M-L: provider + build step + a prefetch / hold rule | medium-high | `FactoryGameOptions.spriteBase?: string` (optional) |
| 2 | repack the two sprite sheets (raster 8bpp) | **~240** (692 -> ~450) | ~2123 | S: extractor + a decode in the provider | low | none |
| 3 | per-move animation assets | up to ~225 (237 -> ~12 moves) | ~2140 | M: same hold rule as 1 | medium | none (reuses 1's option) |
| 4 | delete / split the retired canonical march | ~63 sure, up to ~190 | ~2170 to 2300 | M, needs a product decision | medium | none |
| 5 | trainer pics per battle, other tables repacked | ~30 + ~25 | ~2310 | S each | low | none |

Ideas 1 and 2 overlap on the same 692: 1 alone is ~1686, 1 + 2 is ~1681 (a per-species pack is ~35 percent smaller but only ~15 KiB are fetched), so
**do 2 first as the cheap sure win, and 1 only if the 0.7 MB matters**. 1 + 3 + 4 + 5 together bring the path to about 1.3 to 1.4 MiB (`lib` 887 is the
floor until the code itself shrinks).

**1. Pictures per battle.** All 376 species are shipped and all 376 can appear (850 level-50 sets cover 374, so pruning the sheet statically saves
nothing). Per species the cost alone is 1.41 front + 0.80 back (brotli of the entry alone, `spriteBudget.mjs`). On screen: the draft shows the
6 candidates (6 fronts = 8.5); a battle shows the opponent's 3 fronts and the player's 3 backs (6.6), so draft + battle 1 is ~15 and each further battle ~7.
The seam exists: `monPicPixels.ts` (`frontPixels` / `backPixels` read synchronously, the 91 `lazyMonPicSheet` consts and `lazyMonPicTable` in
`battleScene.ts` already defer to it, bnd257d). What is new: (a) the build emits one small file per species next to the chunks (the audio files use
`new URL(..., import.meta.url)` the same way), (b) `installMonPicPixels` becomes a per-species store with `ensure(species[])`, (c) the **when**: the
draft's 6 are known at mount (`gameplaySeed` gives the draft) and a battle's 6 as soon as the round controller builds the parties, which is before
the Battle Room walk and fade; the loop must still be able to **hold** (not tick, so the trace is untouched) if a picture has not arrived, the same
mechanism as `pixelsReady` today. Risks: the hold rule on a slow network, a sheet read that is not behind the provider (`summaryInfoPage` and
`monPicRender` read `front-sprites.json` directly: 8 KiB, fine), `press()` dropped while holding, and ENGINE_BUILD moves (the headless graph changes
shape; tick output does not).

**2. Repack the sprite sheets.** Measured on the real tables (whole-table brotli): front 448 -> **290**, back 229 -> **147** (-240 total) with the
picture stored as image rows, one byte per pixel (all pixels are 0..15), palettes unchanged; tile order 4bpp is 350 / 177, and `frame2 xor tileset`
is worse (410), so do not do the delta. It also takes the sprite chunk from 11.8 MB of JSON text to ~2.3 MB, which is the 0.18 s parse the handoff
measured (gzip 881 -> ~560). The provider decodes a species into the existing `{columns, rows, tiles}` shape on first read and caches it (a 64x64
picture is 4096 values, microseconds), so no consumer changes. Needs an extractor change (`extract-battle-mon-pics.ts`) and a pinned test that the
decoded table equals the old JSON; no API change, no behaviour change, ENGINE_BUILD unchanged (the headless graph does not include the sheets).

**3. Animation assets per move.** `lib` imports all 163 asset files by name (237 brotli, 6.0 MB raw) although a battle plays at most 24 move
animations, and Scene OFF plays none. Same hold rule as 1; only worth it if Scene ON is the site's mode. Risk: an animation that reads its asset
mid-frame must not see a pending load.

**4. Dead code.** Reachability method: V8 block coverage of the soak (the same `tick()` / `render()` the lib runs, `winning-swap`, seeds 1 and 3, 3 battles
deep, generated route) ORed per file and joined with the shipped sizes (`deadCode.mjs`). Honest result: **no module is wholesale dead on the generated
route** (643 `.ts` modules shipped, 10 never loaded and all of them are the lazy audio player / `factorySession` which the soak does not use; none of the
rest is below 5 percent executed). What the soak does not execute is move- and species-specific code (only 3 battles), so low coverage is not a
dead-code signal. The one structural candidate is the **retired canonical Battle 1/2 march**: `battleSceneCanonical.ts` (19), the 36 `turn*ResolutionAdapter` /
`turn*PresentationStaging` / `battle2CommandAdapter` modules (44) and the canonical constants and renderers inside `battleScene.ts` (130 in total for the
file; the share is not measured). They are reachable only through the pinned ROM anchor start (`gameplaySeed` absent, `createInitialState`) and
tests; lazy1 made them lazy but did not delete them ("every table is read by the renderer, core.ts, tests"). If the website always passes a
`gameplaySeed` and the anchor start can go (or move behind a dynamic `import()` that only that start loads), ~63 is sure and up to ~190 plausible.
I did not confirm the website never mounts without a seed; that is the decision this needs.

**5. Other.** `assets-gen` (271): `frontier-trainer-pics` 34 (a battle needs one of 300 pics), `battle-sprite-palettes` 16 (duplicates the palette
inside each sprite-sheet entry), `battle-room-npcs` 24. Lifting integer arrays into binary blobs, tried on the big tables (`packTables.mjs`):
`party-mon-icons` 96 -> 85, `frontier-trainer-pics` 34 -> 29, `battle-room-npcs` 23 -> 20, `menu-idle-base` 5.3 -> 3.7, `front-sprites` 8.2 -> 6.9,
trainers / mons / moves unchanged: **~25 in all**. The Battle Script tables (`program` 60, `graph` 40, `macro` 18) and `data-gen` hold objects and
strings, not number arrays, and compress 25 to 40:1 already; nothing to pack. Fonts are inside `data-gen` (a few KiB). Audio manifest 77 KiB sits in the
lazy `audio-data` chunk, off the first-battle path, but a compact manifest would take ~60 off the sound start.

## What I did not do

No prototype of 1 or 3 and no measurement of what the production CDN sends. The coverage run is three battles per seed, so it can prove "this code
executes" and cannot prove "this code never executes". No `src/` or build config change; `npm run test:smoke` was not needed (scripts under
`tools/bundle/` are standalone `.mjs`, not imported by any test).
