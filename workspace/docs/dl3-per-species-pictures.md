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
chunks, or copy it elsewhere and pass `spriteBase`. Cloudflare static assets: 376 files, each ~1-5 KiB raw (~12 KiB), well under the limits.
