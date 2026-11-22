# dl3: battle pictures per species (handoff "Website load time", step B, idea 1 of `docs/dl1-download-size.md`)

The browser no longer downloads the whole sprite sheets (376 species, front + back) before the first battle. The build emits one small file
per species and the game fetches the ones it is about to show. No behaviour change: ticks, traces, kernel events, sounds, frame hashes and the
library contract are identical (only the optional `spriteBase` option is new). Base `26477cf4b`.

## Design

- **Files.** `tools/build/monPicFiles.ts` (a Vite plugin, structurally typed because vitest and the app use two vite versions) emits
  `sprites/<SPECIES>.txt` = `<front dl2 row>\n<back dl2 row>` next to the chunks (the dl2 row format, `monPicSheetCodec.ts`) and a tiny manifest
  module (`virtual:pokebench-mon-pic-files`, 3.0 KiB brotli) mapping each species to `new URL(file, import.meta.url).href` (the audio-file
  pattern, so a host bundler emits them as assets). Outside a build (dev server, vitest) the manifest is `null`.
- **Store.** `src/engine/monPicSpriteStore.ts`: the same two provider tables as the full install, but a species is readable only after its file
  arrived; an earlier read throws `MonPicPending` (`monPicPending.ts`). `pending(wanted)` starts the fetches, `whenLoaded` awaits them. One retry,
  then a sticky failure. Decode is the dl2 lazy decode, cached.
- **The WHEN.** `src/engine/monPicNeeds.ts` scans the session state (draft slots / rentals, battle setup, round controller, round orchestrator,
  swap) for species names. At mount it names the draft's six; after every tick (`lib.ts`) it names the round's parties as soon as the controller
  builds them, i.e. before the Battle Room walk, and the swap candidates when the swap screen is built. A fetch starts the moment a name appears.
- **The hold rule.** Ticks never read pixels (the headless build proves it: it has no provider); only `render()` does. So before every tick and
  every draw the mount loop checks `pending(neededMonPics(state))`: if a needed picture has not arrived it requests another animation frame
  and does NOT tick and does NOT draw (the clock restarts so the wait is never replayed as a burst of ticks). Nothing about the held frame
  reaches the session, so trace and replays are untouched. The safety net is the `MonPicPending` throw: `render()` is pure and retryable, so a
  draw that reads a picture the scan missed is caught by `drawOrHold`, the species is added to the wanted set and the loop holds on it.
  `recordContainedPresentationError` rethrows `MonPicPending` (a missing picture is not a contained presentation error); that is the reason
  `ENGINE_BUILD` moves (the headless graph contains `presentationContainment.ts`).
- **Modes.** `sprites: "files"` (the library default in a build) or `"all"` (the full tables as before: the dev server, vitest, node tools,
  and the dev shell's `?pokebench=1` bench ABI, whose synchronous `advance()` cannot wait for a file; `play:random` goal mode uses it).
  The library build has no full-table chunk at all (`__POKEBENCH_SPRITE_FULL__ = false`). Node / `headless.js` keep the synchronous full path
  and no network. `mountFactoryGame` (the public mount) always uses the files.
- **API.** `FactoryGameOptions.spriteBase?: string` (documented in `docs/library-package.md`): where the files are when the host copied
  `dist-lib/sprites/`. Default: next to the chunks via `import.meta.url`.
- **Residual risk.** A few `catch {}` seams in live move animation could swallow a pending throw. They are not reachable for a picture the scan
  names (every species of both parties and the swap candidates is loaded before the frame that can draw it), which covers Transform / Mimic-style
  cases because they only show species already in the battle. The Tier-1 test compares every drawn frame of a Scene ON play-through.

## Bytes (brotli q11, `tools/bundle/chunkSizes.mjs`)

| | before (base build:lib) | after |
|---|---|---|
| first-battle path | 2112.5 KiB | ~1700 KiB |
| `index.js` (the `lib` chunk) | 895.3 | 896.9 |
| sprite chunk (`assets-sprites`) | 430.5 | gone (an empty 0-byte stub remains in `chunks/`) |
| `monPicPixelsInstall` | 0.8 | gone |
| manifest chunk | - | 3.0 |
| sprite files | - | 376 files, 449.5 KiB total, avg 1224 B, max 2243 B |
| first battle's pictures (6 draft + ~3 enemy) | 430.5 | ~11-15 KiB |
| TOTAL browser JS | 2212.3 | 1785.3 |

The first-battle path is `index.js` + `assets-gen` 271.8 + `animation-assets` 236.7 + `data-gen` 161.3 + `data-battle-script` 116.1 + the manifest + the
files. A full run that meets all 376 species downloads 449.5 KiB of files instead of 430.5 KiB (+19 KiB of per-file overhead).

## ENGINE_BUILD

`eb-34fdbefde3b8a8ee` (base `26477cf4b`) -> `eb-a8afeda5e973176f` (`presentationContainment.ts` moved; nothing else in the headless graph).

## Evidence

- `npm run compare:differential -- draft-menu-slot6 presentation-rng-playable-live-bodies-seeded-on battle1-swap-enemy-picker --base 26477cf4b --summary`:
  386 captures byte-identical.
- `tests/dl3PerSpeciesPictures.test.ts` (Tier 1): store ensure / pending / decode equality with the full tables, retry and sticky failure, the
  containment rethrow, a headless session ticking over a store with nothing loaded (no request), the draft's six at mount, no tick and no draw
  while the pictures are in flight, `press` dropped before the first frame, every drawn frame of a 2600-frame Scene ON play-through equal to the
  full-table render of the same trace, a load failure reporting `onError` once.
- `npm run play:random -- --minutes 3 --scene both --seed 1` (bench ABI, full tables): 0 page errors, 0 console errors, 0 contained, 0 divergences.
- `node --experimental-strip-types tools/browser/dl3Pictures.mjs --seconds 150 --scene on|off` (the built page, real rAF, real key events, NO
  bench ABI): the draft's six files before the first frame (657-780 ms), the battle's three enemy files as the round is built, 24.2 KiB raw
  in total, 0 page / console / contained errors.

## Website note

The website that bundles this package needs no configuration: its bundler emits `dist-lib/sprites/*.txt` the same way it emits the audio files.
A host that serves the package's files unbundled must serve `dist-lib/sprites/` (plain text; any content type; Brotli/gzip recommended) next to the
chunks, or copy it elsewhere and pass `spriteBase`. Cloudflare static assets: 376 files, each ~8-12 KiB raw (1-2 KiB over the wire), well under the limits.

## dl4: move animations per asset (idea 3 of `docs/dl1-download-size.md`)

Same machinery as the pictures, for the 163 move-animation asset files (`src/animation/assets/*.json`, 6.0 MB raw, 237 KiB brotli, all
imported by `battleScene.ts` / `liveMoveAnimation.ts`). Scene OFF plays none and needs none. No behaviour change: ticks, frame hashes, kernel
events, sounds and the library contract are identical; `ENGINE_BUILD` does not move (`eb-a8afeda5e973176f`, the headless graph is byte-for-byte
the same, headless `animation-assets` 6.8 KiB as before).

**Design.**
- `src/engine/animAssets.ts`: a provider (`installAnimAssets`, `installedAnimAssets`) and `lazyAnimAsset<typeof Data>("name")`, a `Proxy` over the
  asset that reads the installed source on every access. `battleScene.ts` / `liveMoveAnimation.ts` keep their consts (`const knockOffAsset =
  /* @__PURE__ */ lazyAnimAsset<typeof knockOffAssetData>("knock-off")`, the JSON is now a type-only import), 10 derived consts that read an
  asset at module scope are wrapped in `lazyAnimAssetPart`, so no consumer changed and nothing reads an asset at import time (the headless
  graph tree-shakes the unused consts as before).
- `src/engine/animAssetStore.ts`: a per-asset store with the dl3 store's contract (`pending`, `whenLoaded`, one retry, sticky failure). A read
  of an asset that has not arrived starts its fetch, records the miss and throws `AnimAssetPending`; `presentationContainment` rethrows it like
  `MonPicPending`. Safety net: `drawFrame` in the mount loop discards the frame when the store recorded a miss even if a renderer `catch{}`
  swallowed the throw (render is pure), so a half-drawn frame can never reach the canvas.
  **Correction (fam1, `docs/fam1-first-use-move-animations.md`):** containment did not rethrow it until fam1; the draw seam recorded it and
  degraded the command, so the first use of a move whose file was not prefetched drew the static field (the 2026-11-22 playtest's Whirlpool
  and Spark). It now passes every seam while `core.ts render()` runs, and stays contained on the tick.
- `src/engine/animAssetNeeds.ts` + `src/assets/gen/anim-asset-moves.json`: `neededAnimAssets(state, table, has)` names the files a frame may
  read, from the numeric move ids the round controller's parties carry (party move lists, known when the parties are built, before the Battle
  Room walk and fade) and every `moveId` / `calledMove` / `currentMove` / `chosenMove` in the presentation and staged turn. The mount loop
  prefetches them and HOLDS (no tick, no draw) while one is pending, exactly like a picture. Scene OFF names none.
- Files: `sprites/anim/<asset>.txt` (the asset's minified JSON) next to `sprites/<SPECIES>.txt`, so one copied `sprites/` directory serves both
  and `spriteBase` is reused (no new option). `virtual:pokebench-anim-asset-files` (build plugin in `tools/build/monPicFiles.ts`) emits them. Lib
  build: only the lazy assets are files (140); assets some module imports as a value stay in the `animation-assets` chunk (23: the 6 the
  headless tick path reaches, 5 read by about every battle: absorb, cross-chop, hypnosis, reflect, swagger, and 12 that `src/animation/*.ts`
  modules import themselves). App build / vitest / node tools / the bench ABI install the full table (`animAssetsFull.ts`, generated by
  `tools/build/generateAnimAssetsFull.ts`, a test pins it), so they behave as before.
- The move table is derived, not hand-written: `tools/bundle/animAssetNeeds.ts record` plays Scene ON soaks with every frame rendered over a
  recording source, `build` maps each asset to the moves whose name it carries (`knock-off` <- KNOCK_OFF; 4 aliases: purple-flame <- GRUDGE,
  kadabra-front <- ROLE_PLAY, water-orb <- HYDRO_PUMP, rain-drops <- RAIN_DANCE) plus the intersection of the move sets of the battles that
  read it without any of its own moves. Over 45 recorded battles (12 seeds, coverage-fight and full policies): 0 of 278 reads of a lazy asset
  were not predicted by the battle's moves. A move the soaks never played is covered by its name; anything the scan misses is caught by the
  store (a read of a pending asset holds the loop on it), so a gap in the table is a short hold, never a wrong frame.
  **Superseded (fam1):** the name rule missed files a move borrows (Whirlpool reads water-orb, Spark reads dynamicPunch's hit splat); 39
  Factory moves had a gap. The table is now recorded per move (`animAssetNeeds.ts moves` + `stage`, `docs/fam1-first-use-move-animations.md`)
  and `tests/fam1MoveAnimationReads*.test.ts` checks every Factory move.

**Called moves (Metronome, Mimic, Sleep Talk, Assist, Mirror Move...): fetch-on-call, no always-loaded set.** Always loading every move a
called move could pick would be all 163 files again (Metronome alone can call ~all of them). The called move is named in the presentation
(`calledMove` / `moveId`) as soon as the tick that chose it ran, so the scan starts its fetch then (I did not measure how many frames
that is before the draw); if the file has not arrived when the frame draws, the loop holds at the draw, never at a tick, so the trace is
untouched either way. `tests/dl4AnimAssets.test.ts` pins the scan for a called move; there is no Metronome compare trace in
`tools/compare/traces`.

**Bytes (brotli q11, `tools/bundle/chunkSizes.mjs`, `npm run build:lib`).**

| | before (dl3) | after |
|---|---|---|
| `animation-assets` chunk | 236.7 KiB | 27.4 KiB |
| anim manifest chunk | - | 1.4 |
| TOTAL browser JS | 1785.3 | 1580.8 |
| TOTAL headless | 774.6 | 774.6 |
| anim files | - | 140 files, 5.28 MB raw, 289.7 KiB brotli per file (avg 2.1 KiB) |
| first-battle path | ~1700 | ~1541 (chunks -208, plus the battle's files) |
| extra bytes per battle (scan result, per-file brotli) | - | mean 49.4 KiB, median 48.7, max 61.3 over 45 battles (cached files are not fetched again) |

The scan prefetches every move of both parties (up to 8 mons x 4 moves) rather than only the moves a battle ends up playing; that is the
mean 20 files above (the browser run of 150 s fetched 21 files, 698 KiB raw). Narrowing it to the moves actually chosen would save half of
that but would put the fetch inside the battle, so I left it.

**Evidence.**
- `npm run compare:differential -- presentation-rng-playable-live-bodies-seeded-on enc276-encore-on battle1-swap-enemy-picker --base e166a1ace --summary`:
  509 captures byte-identical (`enc276-encore-on` stands in for the called-move trace, which does not exist; its Encore asset is a lazy file).
- `tests/dl4AnimAssets.test.ts` (Tier 1): generated table in sync, the lazy / eager split (every asset is one or the other, never both), store
  pending / record / retry / sticky failure, the lazy proxy, the needs scan (Scene OFF none, Scene ON the parties' moves), a called move, a
  headless session ticking 1500 frames over a store with nothing loaded (no request, no recorded miss), and a 2600-frame Scene ON play-through
  over a store that delivers each file a macrotask late whose every drawn frame equals the full-table render of the same trace.
- `node --experimental-strip-types tools/browser/dl3Pictures.mjs --seconds 150 --scene on` (built page, real rAF and keys, no bench ABI): 8957
  frames, 21 animation asset files + 9 pictures loaded, 0 failed, 0 page / console / contained errors.
- `animationBoundaryRatchet.test.ts` pins one new consumer, `src/engine/animAssetsFull.ts` (data only, the generated full table).
- `npm run test:gate` (362 files, 2844 tests), `npm run typecheck`, `npm run build`, `npm run build:lib`, `npm run soak -- --policy vanilla --seeds 0:4
  --scene on` (4 OK) are green.

**Website note.** Nothing to configure: the bundler emits `dist-lib/sprites/anim/*.txt` with the pictures, and a host that copies or serves
`dist-lib/sprites/` (with `spriteBase`) serves the `anim/` subdirectory too. No API change.
