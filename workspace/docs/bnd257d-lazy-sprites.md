# bnd257d: the browser sprite chunk is a dynamic import (finish plan Phase 3 bundle hygiene, `bnd-d`)

Goal: `dist-lib/index.js` and its static chunks stop carrying the ~11.8 MB battle sprite sheets (`assets-sprites`). A host that mounts the game
fetches them once, in parallel with nothing it needs to render yet. Plan: `docs/bnd-d-scout.md` section 3. Supervisor sign-off (2026-11-13,
reversible): this reverses the bnd256c decision "no dynamic import, keep the synchronous first draw / `ready`".

## What changed

- `vite.config.ts` `manualChunks`: `party-mon-icons.json` (1.9 MB) moves from `assets-sprites` to `assets-gen`. `battlePartySelect.ts` and
  `battleScene.ts` import it statically, and a statically imported manual chunk is never lazy, so it had kept the whole sprite chunk static.
- `src/engine/monPicPixels.ts` (still no JSON): `MonPicPixelSheet` gains an optional `palette`; `lazyMonPicSheet(side, sym)` returns a frozen object
  with enumerable getters `tileset` / `frame2` / `palette` that read the provider on access; `lazyMonPicTable(side)` is a `Proxy` over the
  installed table (get / has / ownKeys / descriptor forward to it). Nothing reads pixels until an install.
- `src/engine/battleScene.ts`: the two sprite JSON imports are gone. The 91 module-scope per-species consts (`grovyleFrontSprite`, `onixBackSprite`,
  ...; mechanically replaced) are `lazyMonPicSheet(...)` and `opponentFrontSpritesAsset` / `battleBackSpritesAsset` are `lazyMonPicTable(...)`, so
  every render-time use (`liveShownFormSheets` Proxies, spreads like `{...onixFrontSprite, tileset}`, `Record` lookups) is unchanged. Every call is
  `/* @__PURE__ */`: without it rollup keeps ~90 dead calls in the headless graph (the module is only partly shaken out of it), which grew
  `headless.js` by 4 KB. With it every headless chunk is byte-identical.
- `src/engine/monPicRender.ts`, `src/engine/summaryInfoPage.ts`: the front-sprite fallback reads `frontPixels(species)` inside the lookup (same
  JSON objects, by identity) instead of importing the JSON.
- `src/lib.ts` (small, local): the static `monPicPixelsInstall` import is gone. `mountFactoryGameInternal` checks `monPicPixelsInstalled()`; if it
  is, everything is synchronous exactly as before. If not, `pixelsReady = import("./engine/monPicPixelsInstall.ts").then((m) =>
  m.installBundledMonPicPixels())` (an explicit call: package.json `sideEffects:false`). The first `draw()`, the rAF loop and so `ready` start in
  its `.then`; a rejection sets `crashed`, logs, and calls `onError({ message: "sprite pixels failed to load: ...", frame })` without starting the
  loop; `destroy()` before it resolves starts nothing. **`press()` is dropped until the pixels are in** (decision: drop, not latch; documented in
  `docs/library-package.md`). `resumeSync` still replays inline in the mount call (resume never reads pixels); the chunked resume runs in the loop,
  so it starts after the load. `FactoryGameInternal` gains `pixelsReady: Promise<void>` (not in the public contract / `lib-types`).
- `src/main.ts`: `__POKEBENCH__` and `__POKEBENCH_SESSION__` are defined in `game.pixelsReady.then(...)`, so the ABI is defined only after the
  pixels resolve and `advance()` (which ends in `draw()`) stays synchronous. A rejected load defines nothing (the library already reported it).
- `tools/browser/randomPlay.mjs`, `tools/browser/audioCheck.mjs`: `waitForFunction` for the globals now passes `polling: 100`. The default poll is
  `requestAnimationFrame`, which `randomPlay` stubs to a no-op in its init script; it used to pass only because the globals existed at load, and the
  first run after this change timed out at 60 s (`__POKEBENCH__` never seen). `AGENTS.md` notes it next to the ABI line.
- Tests: `tests/bnd257dLazySprites.test.ts` (new), `tests/bnd256cPixelProvider.test.ts` ("lib.ts imports it" became the dynamic form),
  `tests/audioHeadlessBoundary.test.ts` (the entry's code now sits in a shared `lib-*` chunk, so the player's dynamic import is looked up on every
  synchronous chunk).

## Why the entry became `index.js` (237 B) + `lib-*.js`

The installer chunk imports the provider module (`monPicPixels.ts`) that `lib.ts` also uses, so rollup hoists the entry's code into a shared
`chunks/lib-*.js` and `index.js` is a re-export. The package `exports`, `index.d.ts` and the public names are unaffected.

## Sizes (`npm run build:lib`, readable output; bytes)

| file | before (`1658751e0`) | after |
| --- | --- | --- |
| `index.js` | 7,254,657 | 237 |
| `chunks/lib-*.js` | (in index.js) | 7,258,048 |
| `chunks/animation-assets` | 6,299,899 | 6,299,899 |
| `chunks/assets-gen` | 5,668,776 | 8,414,814 (+ party-mon-icons) |
| `chunks/data-battle-script` | 3,723,032 | 3,723,032 |
| `chunks/data-gen` | 3,004,277 | 3,004,277 |
| **static graph (index.js + static chunks)** | **40,467,880** | **28,700,307** |
| `chunks/assets-sprites` | 14,517,239 (static) | 11,771,172 (**dynamic**, gzip 936.5 KB) |
| `chunks/monPicPixelsInstall-*` | - | 342 (dynamic; imports the sprite chunk) |
| `chunks/audio-data`, `chunks/player` (dynamic, unchanged) | 496,086 + 210,036 | 496,086 + 210,036 |
| total | 41,174,002 | 41,177,943 |
| largest file | 14,517,239 | 11,771,172 (< 20 MB) |
| headless (`headless.js` + 4 chunks) | 3,208,045 + 7,581,835 | 3,208,045 + 7,581,834 (all real chunks `cmp`-identical; only the 1-byte empty stub is gone) |

No static chunk (and not `index.js`) mentions `assets-sprites` (checked by grep and pinned by the built-output ratchet in
`tests/bnd257dLazySprites.test.ts`). The Vite app build (`npm run build`) shows `assets-sprites` 10.3 MB minified as a lazily fetched chunk next to
a 3.4 MB `index` chunk.

## ENGINE_BUILD

`node --experimental-strip-types tools/build/engineBuildCheck.ts`: before `eb-93bc6e7a6b44c19b`, after **`eb-8faf63dbde5168d5`**. This could not be
kept literally unchanged: I built the headless graph in memory for both trees and every real chunk (`headless.js`, `data-gen`, `assets-gen`,
`animation-assets`, `data-battle-script`) is byte-identical (`cmp`), but the base also emitted a 1-byte empty `assets-sprites-l0sNRNKZ.js` that
nothing imports (the tree-shaken sprite JSON modules still named the chunk). `computeEngineBuild` hashes file names + code, so the headless graph
no longer naming the sprite JSON drops that file and moves the hash. Same class as bnd256c, which moved it for the same reason. **Tick outputs,
digests and traces are unchanged; the website must treat `eb-8faf63dbde5168d5` as the new build id (open challenges played on the old id would
need the old build).** If the supervisor wants the value kept, the only way is a constant in `hashChunks` that hashes in the dead stub entry
(`chunks-headless/assets-sprites-l0sNRNKZ.js`, empty); I did not add that hack.

## Proof

- `npm run typecheck`: exit 0 (on the tree with all `src/` changes).
- `npm run test:gate`: 361 / 362 files, 2842 / 2843 tests on the pre-fix tree; the one failure was `audioHeadlessBoundary` (the shared-`lib` chunk
  point above), fixed and re-run green; the final-tree gate result is in the last section.
- Touched suites green: `bnd257dLazySprites` (9), `bnd256cPixelProvider` (8), `factoryLibrary` (10, unchanged), `audioHeadlessBoundary` (3),
  `engineBuildHash` (6), `bnd255Gamepad` (12), `battleScene` (306), the `monPic*` and `summary*` suites (incl. `summaryAllFactorySpecies`).
- The new uninstalled-import test (`tests/bnd257dLazySprites.test.ts`): after `vi.resetModules()` it imports `core.ts`, `battleScene.ts`,
  `monPicRender.ts`, `summaryInfoPage.ts`, `battlePartySelect.ts` with no provider and nothing throws; `grovyleFrontSprite.tileset` and a spread of
  `kabutoFrontSprite` throw `mon pic pixels not installed` until the install, then return the JSON objects by identity. The mount tests (fresh
  `lib.ts`, no provider): `mountFactoryGameInternal` returns with 0 draws and no rAF queued; a press before the pixels is dropped; after
  `pixelsReady`, 1 draw, `ready` on the first pump, a later tap latches; `destroy()` before the load starts nothing; a failing installer
  (`vi.doMock`) gives one `onError` (`sprite pixels failed to load: sprite chunk lost`, frame 0), 0 draws, an empty rAF queue, no events, no
  trace.
- `npm run compare:differential -- battle2-kabuto-sendout-dense summary-info-onix flw252-party-fade-on draft-menu battle2-player-sendout-dense
  --base 1658751e0 --harness-from-head --summary`: **821 / 821 captures byte-identical** across 5 traces (Scene ON battle send-outs with Kabuto
  front and player back sprites, Summary Onix front sprite via the fallback lookup, party menu fade, draft menu).
- `npm run build` then `npm run play:random -- --minutes 2 --scene both` (seed 1): scene on 115,920 frames, scene off 169,440 frames; pageerrors 0,
  console errors 0, contained 0, overlays 0, divergences 0, mirror-only throws 0 (summary `.integration/random-play/2026-11-13T07-36-57-678Z`).
- Real-time (non-bench) built page, real rAF, headless Chromium: the sprite chunk and its installer were requested lazily, a `z` key press sent right
  after DOMContentLoaded was dropped, the session reached frame 182 in ~3 s, the canvas was non-blank, 0 page / console errors.

## Not done / follow-ups

- `docs/library-package.md`: the "default Vite build emits ONE 33 MB file" consumer figures were not re-measured (the static graph is now 28.7 MB,
  plus the lazy 11.8 MB chunk); the website's own `manualChunks` snippet still applies.
- Other lazy candidates (`frontier-trainer-pics`, menu windows, `animation-assets`, `assets-gen`) need the bnd-e renderer split; out of scope.
