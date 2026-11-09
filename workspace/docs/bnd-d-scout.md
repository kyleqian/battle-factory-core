<!-- Read-only worker report (bnd-d scout, 2026-11-09, Sonnet 5.5, ~2 min). Saved verbatim by the supervisor; UNVERIFIED: sizes from the dist-lib built 06:22, no build or test run. Supervisor note: lazy-loaded sprite sheets are approved finish-plan scope, so the delayed `ready` it implies is in scope; the next brief must state the new contract (blank canvas until the chunk loads; input before `ready`) in docs/library-package.md and tell the website. -->

# bnd-d scout: browser sprite chunk made dynamic

**bnd-d scout (read-only; no edits or commits, worktree clean). Sizes are from the existing `dist-lib/` built Nov 9 06:22. I did not build or run tests.**

**1. Static importers that keep the sprite chunk in the browser entry graph**
- `battleScene.ts:526` and `:697` import the front and back sprite JSON. About 97 front consts (`:1768-1816`) and about 40 back consts (`:2576-2591`, `:3263-3292`) read `asset.SPECIES!` at module top level. Some are exported (`grovyle/kabuto/pidgeotto/murkrow FrontSprite`, `onixBackSprite`), and `battleSceneCanonical.ts` uses them.
- `monPicRender.ts:28` and `summaryInfoPage.ts:58` use the front JSON only as a fallback lookup, inside `frontSprite()` (`:59`) and `summaryFrontSprite()` (`:110`).
- `battlePartySelect.ts:3` and `battleScene.ts:706` import `party-mon-icons.json`. Trap: `manualChunks` puts that file in the same `assets-sprites` chunk (`vite.config.ts:81`). While either importer stays static, the whole 14.5 MB chunk stays static, even with every sprite importer gone. Fix: move `party-mon-icons` into `assets-gen` or its own chunk in `manualChunks`, or lazy it too. Headless does not contain it, so `ENGINE_BUILD` should not move.
- Minimal change:
  - **`battleScene.ts`:** add `lazyFront(sym)` and `lazyBack(sym)` returning frozen objects with enumerable getters `tileset`, `frame2` and `palette` that read `frontPixels` / `backPixels` on access. Replace the ~137 consts mechanically. Spreads like `{...onixFrontSprite, tileset: ...}` (`:18190-18196`) are fine because they run at render time. Any module-scope read of `.tileset` would throw before install, so a test must import `core.ts` with no install.
  - **`monPicRender.ts` and `summaryInfoPage.ts`:** replace the JSON with `frontPixels(species)` called inside the lookup. `MonPicPixelSheet` has no `palette` in its type (`monPicPixels.ts:5`), so widen it or read `battle-sprite-palettes.json`.
  - **`lib.ts`:**
    - Drop the static import of `monPicPixelsInstall.ts`.
    - Add `const pixels = monPicPixelsInstalled() ? Promise.resolve() : import("./engine/monPicPixelsInstall.ts").then(m => m.installBundledMonPicPixels())`. It must be an explicit call because of `sideEffects:false`.
    - Gate the first `draw()` and the `raf = requestAnimationFrame(loop)` start on `pixels`.
    - If the import rejects, call `onError({message, frame})` and do not start the loop.
  - **Resume:** `resumeStep` and `session.tick` never read pixels (bnd256c, headless proof), so resume can run while the chunk loads. Only drawing waits.
- Consequences for lib consumers:
  - `mountFactoryGame` still returns synchronously, but the canvas stays blank and `ready` is delayed until the sprite chunk loads (about 12 MB raw, roughly 1 MB gzip). The website needs its own loader until `ready`.
  - `press()` before `ready` is latched into frame 0. Either document "send input after `ready`" or drop pre-ready input. No `lib-types` change is needed.
  - Real-time play and trace frames start only after load, so the timing is sound.
  - This reverses the bnd256c supervisor decision ("no dynamic import, keep synchronous first draw / ready"). It needs explicit sign-off.
- Test ABI (`main.ts:139`): `__POKEBENCH__.advance` ends with `draw()` and must stay synchronous. Define `__POKEBENCH__` and `__POKEBENCH_SESSION__` only after the pixels resolve (`game.pixelsReady.then(...)`, internal mount only). `randomPlay.mjs` (`:170`, `:352`) and the differential harness already wait for those globals. Skip the import when the provider is already installed, so vitest (`tests/setup/monPicPixels.ts`) and the render tools keep the synchronous behavior. `tests/factoryLibrary.test.ts` (`draws()===1`, ready on the first frame) should then pass unchanged.

**2. Other tables that could follow the same pattern** (browser vs headless chunk, from `dist-lib`)
- **Sprites, 6.83 + 3.51 MB source (about 11.8 MB in the chunk):** the main target.
- **`party-mon-icons`, 1.9 MB:**
  - Cheap. It is a `partyIcons[key]` lookup at render (`battlePartySelect.ts:934`, `battleScene.ts:13566`).
  - Give it its own chunk and either a sibling provider or a generalized `artProvider`.
- **`frontier-trainer-pics` (0.47 MB), `fight-submenu-window` (0.49), `menu-idle-blank` and `menu-idle-base` (0.44 each), `party-menu-chrome` (0.41):**
  - All are `battleScene`-only. About 2.2 MB, but each needs the lazy-getter treatment.
  - `frontier-trainer-pics` builds a top-level `Map` (`:1760`), so it needs lazy construction.
  - `battle-room-npcs` (0.41 MB) is in `battleRoomRender.ts`.
  - Better as part of the bnd-e renderer split.
- **Not cheap:**
  - `animation-assets` (6.3 MB browser vs 0.1 MB headless) and `assets-gen` (5.66 vs 1.46 MB) are render-only but reached statically from renderer code.
  - They need the bnd-e `renderer.ts` split, roughly 10 MB.
  - `data-battle-script` (3.7 MB) and `data-gen` (3.0 vs 2.3 MB) are on the tick path. No.

**3. Step plan (about 2 h)**
1. (10 min) Baseline: `node --experimental-strip-types tools/build/engineBuildCheck.ts`, `npm run build:lib`, record sizes.
2. (15 min) In `manualChunks`, move `party-mon-icons` out of `assets-sprites`.
3. (35 min) Replace the `battleScene.ts` consts with `lazyFront` / `lazyBack`. Switch `monPicRender.ts` and `summaryInfoPage.ts` to the provider. Add a test that imports `core.ts` uninstalled without throwing.
4. (20 min) `lib.ts` dynamic install plus gating and error path. Gate the `main.ts` ABI on the pixels promise. Update the `tests/bnd256cPixelProvider.test.ts` ratchet ("lib.ts imports it" becomes `import(`).
5. (20 min) Add a `factoryLibrary` test with the provider uninstalled: no draw or `ready` until the install resolves, `onError` on a rejected import.
6. (20 min) Run `npm run typecheck`, `npm run test:smoke`, then the full `npm test`.

Acceptance:
- `index.js` plus its static chunks drop from 40.4 MB to about 28 MB. `assets-sprites` becomes a dynamic chunk of about 11.8 MB.
- Largest file stays under 20 MB. Total bytes are roughly unchanged.
- Headless output and `ENGINE_BUILD` are unchanged (`engineBuildCheck` before and after). If it moves, treat it as one expected change and tell the website.
- `play:random` passes on Battle Scene ON and OFF with no pageerror.
- `compare:differential` against the pre-change base is 100% byte-identical. `--harness-from-head` is already tolerant.
- The test ABI is still synchronous, and `tests/factoryLibrary.test.ts` passes unchanged.

Risks:
- A module-scope pixel read throws only in the browser (found by the uninstalled-import test and `play:random`).
- The `sideEffects:false` trap, so the install must be an explicit call.
- The rollup `manualChunks` rule that a statically imported manual chunk is never lazy (step 2).
- Any remaining static importer silently keeps the chunk static. Check by grepping the built `index.js` for a static `assets-sprites` import.
- Delayed `ready` is a visible contract change for the website.
