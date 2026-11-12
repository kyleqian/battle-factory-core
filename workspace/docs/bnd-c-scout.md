<!-- Read-only worker report (bnd-c scout, 2026-11-08, Sonnet 5.5, ~2 min). Saved verbatim by the supervisor; UNVERIFIED: the ~11 MB headless prediction comes from the 2026-11-02 experiment, and only appTrace.ts was checked among render tools. Open choice for the bnd-c brief: static side-effect install (simpler) vs dynamic import() in lib.ts (same ready gate; the browser chunk split only materialises with bnd-d). -->

bnd-c is feasible, and it's one worker step of 2 h or less. The design needs two changes to the supervisor's brief, covered in (2) and (5). I made no edits or commits, and the worktree is clean. I ran `engineBuildCheck.ts` once (`eb-7b7399877f107136`, which matches the bnd254b "After" value). I did not run `build:lib`, tests or a census.

## (1) Import sites of the two JSONs

**Headless-reachable (the only retainer):**
- `src/engine/battleCommandFieldArt.ts:2-3`, used at `:82-83` and by `speciesPic` (`:94-105`).
- The chain is `headless.ts:3` → `factorySession.ts` → `engine/core.ts` → `battleScene.ts` (and `battleResolutionPresentation`, `liveMoveAnimation`, `liveSubstitute*`) → `battleCommandFieldArt.ts`.
- `createBattleCommandFieldArtView` is on the tick path, so `speciesPic` keeps both tables. This matches `dist-lib/chunks-headless/assets-sprites-*.js` at 11,771,202 B.

**In the headless module graph but tree-shaken today (render-only):**
- `battleScene.ts:526` (front) and `:697` (back). The ~100 top-level `const xFrontSprite = asset.X!` lines are at `:1764-1812`, `:2572-2587` and `:3259`.
- `monPicRender.ts:28`, which is reachable via `factoryDraftScreen`.
- `summaryInfoPage.ts:58`.
- Rollup drops these today because `render` is unreachable from `headless.ts`. This needs re-confirming after the cut (see risks).

**Tests and tools (not in any bundle):**
- Tests: `battleMonPics`, `battleMonPicCatalog`, `battleScene` (`:246`), `bnd254bPicGeometry`, `battleSpritePalettes`, `cast83CastformForms` and `animation/viceGrip`.
- Tools: `integration/prep16PaletteComposite.ts`, `integration/hide66Census.ts`, `probe/verify-turn{9,10,13}-*.ts` and the extractors.
- Non-`src` references: `vite.config.ts:87` (`assets-sprites` chunk rule) and the extractors.

## (2) Minimal provider design

**Pixel reads that must go lazy.** In `battleCommandFieldArt`, `pic.tileset` and `pic.frame2` are read only at render time. The one tick-path exception is the transform branch (`:184-188`). It builds `{ tileset: shown.pic.tileset, palette }`, which would force the pixels during a tick. Every other `pic` read on the tick path is `pic.palette`, which already comes from `battle-sprite-palettes.json`.

**New modules (no JSON import in the first):**
1. `src/engine/monPicPixels.ts`: `installMonPicPixels({back, front})`, `monPicPixelsInstalled()`, and `backPixels(sym)` / `frontPixels(sym)`. The last two throw "mon pic pixels not installed" if called before install. This module is in the headless graph and tiny.
2. `src/engine/monPicPixelsInstall.ts`: imports the two JSONs, calls `installMonPicPixels` at module top level, and is never imported by anything in the headless graph.

**Changes to `battleCommandFieldArt.ts`:**
- Drop the JSON imports.
- `speciesPic` builds `pic` with `Object.defineProperties` lazy getters for `tileset` and `frame2` (non-enumerable or not, frozen) plus the table palette.
- The transform branch uses the same lazy-getter pattern instead of eagerly reading `shown.pic.tileset`.
- Render-time spreads at `battleScene.ts:7991`, `:8048` and `:55262` call the getters at render time, which is fine.

**Other static importers.**
- `battleScene.ts:526`, `:697` and the top-level consts can stay for now. They are tree-shaken in headless (`bnd-d` territory).
- `monPicRender.ts:28` and `summaryInfoPage.ts:58` also read the JSON for draft and summary screens. `monPicRender.ts:28` is the one the first draw needs.
- If `lib.ts` loads the install module with a dynamic `import()`, the browser build gets no chunk split. `battleScene`, `monPicRender` and `summaryInfoPage` still import the JSON statically, so it stays in the static graph. Rollup only warns.
- The headless win does not depend on dynamic versus static. The brief's "dynamic import" is therefore cosmetic until `bnd-d`.
- Recommendation: use `import()` in `lib.ts` anyway, since the `ready` gate is the same either way. Alternatively use a static side-effect import for the first cut and drop the promise gate. That is simpler and has less risk. The supervisor should decide.

**Install points:**

| Point | Where | Notes |
|---|---|---|
| `lib.ts` mount | `lib.ts:64-202` | Details below. |
| Dev shell (`main.ts:105`) | goes through `mountFactoryGameInternal` | Covered automatically. |
| vitest | `tests/setup/` (currently `scratchSandbox*` only) | Add a setup file that statically imports `monPicPixelsInstall.ts`. |
| Render tools | ~204 tool files import `core.ts` and mention `render` | Cover them with a one-line side-effect import where they actually render battles. |
| `tools/compare/appTrace.ts` | `:10` imports `render` from `core.ts` | Add `import "../../src/engine/monPicPixelsInstall.ts"`. This is the harness `compare:differential` overlays via `--harness-from-head`. |

- `core.ts`'s `render` has no JSON of its own, so it needs no install. About 330 tests and tools call `render(` directly. A `lib.ts`-only install would break them all, which is why the vitest setup file matters.
- Per-tool installs for the other render tools can be handled by grepping for tools that call `render` on a battle state. Only `appTrace.ts` was verified in this scout.

**`lib.ts` behaviour.**
- `mountFactoryGameInternal` is synchronous and calls `draw()` at mount (`lib.ts:201`). It also draws in the resume loop (`:165`), `advance` (`:231`) and `reset` (`:239`).
- `draw()` must no-op until `monPicPixelsInstalled()`.
- At mount: if installed, start the rAF loop synchronously (this keeps the existing stub-canvas tests identical, because the vitest setup pre-installs). Otherwise run `import("./engine/monPicPixelsInstall.ts").then(start)`. `start` is the `draw(); raf = requestAnimationFrame(loop)` block at `:201-202`, guarded by `!destroyed && !crashed`.
- `ready` is emitted inside `loop` at `:167-170`, so deferring the rAF start makes `ready` wait. Ticks and resume also wait, so the trace and `t` are unaffected.
- `press`/`release` before start still fill `held`/`latched`.
- Load failure: route it to `options.onError` and set `crashed`.

Before the provider is filled, nothing renders. The canvas stays blank, which is the same as the existing pre-first-frame state.

## (3) Expected size change

- **Today:** `headless.js` is 3,164,714 B. `chunks-headless/` is 19.35 MB total, of which `assets-sprites` is 11,771,202 B. `dist-lib` exists, and `dist-headless` does not exist.
- **After the cut:** `assets-sprites` leaves `chunks-headless/` entirely, and the other chunks are unchanged. The scout experiment predicts a headless total of about 11.0 MB (22.28 MB → 11.01 MB), with `assets-sprites` down to 0.49 MB. I did not re-measure this.
- **If it holds:** `chunks-headless/` should be about 7.6 MB, meaning `assets-gen` 1.46 + `data-battle-script` 3.72 + `data-gen` 2.30 + `animation-assets` 0.10 MB, plus `headless.js` 3.16 MB.
- **Caveat:** that experiment stripped tiles from the JSON for all importers, so it did not test whether `battleScene` retains the pixels. That has to be checked by `build:lib` in the worker run.
- **Browser total:** unchanged. The 14.5 MB sprites chunk stays static until `bnd-d`.
- **`ENGINE_BUILD`:** changes once, from `eb-7b7399877f107136`. The website must be told.

## (4) Test and proof plan

- **Before/after capture.** Record on the pre-change commit (`275da6fd8`) `ENGINE_BUILD`, then `replayChallenge` digest, `frames`, `streak`, `ended` and `battles` for the fixed seeds and traces that `tests/factoryLibrary.test.ts` uses. Re-run on the new build, from `dist-lib/headless.js`. Expect identical digest and events, with only `ENGINE_BUILD` different.
- **Real headless guarantee.** A `node --input-type=module` run of the built `headless.js` that replays a trace with real battles. It must not throw "not installed", and `chunks-headless/` must have no `assets-sprites`.
- **New test** `tests/bnd254cPixelProvider.test.ts` with these checks:
  - Getters throw before install and return the same object identity as the JSON after install.
  - Lazy-getter `pic` still passes `bnd254bPicGeometry` / `cast83`.
  - A transformed battler does not read pixels at construction time.
  - Static ratchet: `battleCommandFieldArt.ts` contains no sprite-JSON name.
- **Existing suites:** `factoryLibrary`, `bnd254bPicGeometry`, `cast83CastformForms`, `battleMonPics*`, and `battleScene`. Then the full sharded `npm test`.
- **Render differential.** `npm run compare:differential -- <traces> --base 275da6fd8 --harness-from-head [--capture-range S:E]`. Use traces covering a doll, CASTFORM, a transform, an opponent front sprite with `frame2`, and the draft screen. This must be byte-identical.
- **Plus** a `--render-every 1` sample, `npm run build`, `build:lib`, typecheck, and the Scene ON/OFF census (kernel digests must match the last baseline). The census is expected to be unaffected because no tick output changes.

## (5) Risks and worker brief outline

**Risks:**
- **Tick-path leak.** Any eager `pic.tileset` / `frame2` read on the tick path throws in headless. The transform branch (`battleCommandFieldArt.ts:188`) is the known case. bnd254b's proxy trick (throwing getters under `factoryLibrary.test.ts`) is a good dynamic check.
- **Hidden render-only retention.** A `battleScene` top-level const might retain the JSON in headless. If so, the `assets-sprites` chunk won't leave, and the fix is to defer those reads (`bnd-d`) first.
- **Missed install sites.** The ~330 tests and tools that render need the install. Missing one gives "not installed" failures. The vitest setup file removes the test risk, and tools need a grep for which ones really render battles.
- **Blank first frame.** In the real browser, first paint now waits for the import. The browser bench ABI (`tools/browser/goalPlay.ts`, `main.ts` `__POKEBENCH__`) may assume a synchronous first `draw()` or `ready` timing, and needs checking.
- **`draw()` no-op.** `advance()` and `reset()` also call `draw()`, so the guard has to cover all four call sites.
- **Cosmetic dynamic import.** The browser chunk split does not materialize until `bnd-d`. Don't promise it.

**Worker brief outline (about 2 h):**
1. Record baselines: `ENGINE_BUILD`, `replayChallenge` digests, `chunks-headless` sizes, and the differential base commit.
2. Add `monPicPixels.ts` and `monPicPixelsInstall.ts`.
3. Convert `speciesPic` and the transform branch to lazy getters, and drop the two JSON imports.
4. `lib.ts`: gated start, `draw()` guard, and load-failure routing to `onError`.
5. Add the vitest setup file, then install in `appTrace.ts` and the other render tools.
6. Add the new test and update any existing test that relied on identity.
7. `build:lib`, confirm no `assets-sprites` in headless and the new `ENGINE_BUILD`.
8. Prove digest equality, the differential, `factoryLibrary`, the full sharded suite and the census.
9. Update `docs/library-package.md` size table (`:139-142`) and the "still carries sprite pixels" paragraph, then PROGRESS.

**Scoping:** nothing is mis-scoped. The one thing the supervisor should decide is static versus dynamic install. If dynamic, tell the worker the browser chunk split is not expected in this step.
