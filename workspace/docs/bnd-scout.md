# Bundle hygiene scout (read-only, 2026-11-02, Sonnet worker; supervisor-saved, unverified)

Input to the bundle-hygiene briefs. As read on master `84235f563`; re-check before moving anything.

Worktree is clean (the analyzers wrote only to `/tmp`; I did not run `build:lib`, tests or the oracle).

# Bundle hygiene scout (read-only)

Baselines were measured in memory with Vite's build API: headless 22,284,817 B, browser lib 40,160,621 B. Current `ENGINE_BUILD` is `eb-891551c0b132b0c0`.

## (1) JSON under `src/` that only tests or tools import

I used the browser-lib module graph (a superset of the headless graph and the dev shell). 295 JSON files are in it. **100 of the 396 JSONs under `src/` are not in it, totalling 63.7 MB.** For all 100, no `src/*.ts` file has a real `import` or `readFileSync` of them. Where a `src/` file names one, it is only in a comment, for example `turnRng.ts` and `battleScene.ts`.

| Path | Size | Importers |
|---|---|---|
| `src/data/gen/level50-move-parameterization.json` | 35.2 MB | 12 tests (`gate6CoverageManifest`, `*HookJoinBatch`, `onDamageContactOracleEvidence`, …); `tools/extract/extract-level50-move-parameterization.ts` (writes it, `package.json:44`); `tools/report/gate6-coverage-manifest.ts:215` |
| `battle-script-command-candidate-audit.json` | 4.6 MB | 1 test, 1 extractor |
| `battle-script-opcode-observations.json` | 2.7 MB | 14 tests, 3 tools |
| `battle-script-handler-lexical-facts.json` | 2.6 MB | 16 tests, 2 tools |
| `battle1-switchin-ball-particle-detail-probe.json` | 1.7 MB | `battleScene.test.ts` |
| `audio-sound-sources.json` | 0.56 MB | 2 tests, 1 extractor |
| `turn6/7/8-*-bounce-blip` and `*-feather-sprites` probes | about 0.25–0.53 MB each | 1–2 tests and probe scripts, some `.py` |
| `dragonrage-full-probe-{player,opponent}-attacker.json` | 0.27 MB each | `dragonRage.test.ts` |
| `factory-ai-script-catalog.json` | 0.44 MB | 1 test, 1 extractor |
| `battle-script-command-handlers.json` | 0.17 MB | 17 tests, 5 tools |
| `factory-animation-inventory.json` | 0.24 MB | 17 tests, 127 tool references |
| `battle-animation-components.json` | 0.35 MB | 11 tests, 107 tool references |

- **Orphans:** 40 files totalling about 10.0 MB have no test or tool reference by basename. Examples are `battle1-victory-ram-dump.json` (3.9 MB), `battle1-winline-a-ram-dump.json`, `battle1-postwin-rng-dump.json`, `battle1-switchin-*-probe.json` and `battle2-*-dump.json`. A path or directory scan could still reach them (I grepped basenames only), so confirm before deleting; archiving is the safe route.
- **Biggest wins:** `level50-move-parameterization.json` alone is 55% of the 63.7 MB.
- **Left in place:** the `-inventory` and `-components` files have 100+ tool references, so they cost a lot of path edits for little size. Leave them.
- **`tests/fixtures/data/` does not exist yet;** `tests/fixtures/` already holds evidence JSON.
- **Why moving them is safe:** none of the 100 is in the emitted graph, so `ENGINE_BUILD` should not move. Check with `tools/build/engineBuildCheck.ts` before and after.

## (2) Why `battleCommandFieldArt` is in the headless graph

**Import chain:**
1. `src/headless.ts:3` imports `./factorySession.ts`.
2. `src/factorySession.ts:17` imports `./engine/core.ts`.
3. `src/engine/core.ts:1` and `:166` import `./battleScene.ts`.
4. `src/engine/battleScene.ts:832-833` imports `./battleCommandFieldArt.ts`.
5. `src/engine/battleCommandFieldArt.ts:2-3` imports `battle-back-sprites.json` and `battle-opponent-front-sprites.json`.

Other routes to the same module are `core.ts` → `battleResolutionPresentation.ts:11`, `core.ts` → `liveMoveAnimation.ts:11`, and `liveSubstituteSwap.ts:18` / `liveSubstituteFade.ts:22`.

**What actually retains the pixels:**
- The sprite JSONs have four importers in the graph: `battleCommandFieldArt`, `battleScene.ts` (about 100 top-level `const xFrontSprite = asset.X!` lines at `:1764-1812`, `:2572-2587` and `:3259`), `monPicRender.ts:28` (reached through `factoryDraftScreen`) and `summaryInfoPage.ts:58`.
- In the emitted headless output, only `battleCommandFieldArt`'s `const backSprites` and `const frontSprites` survive. The other three are tree-shaken.
- So `battleCommandFieldArt` is the single retainer. The whole 11.8 MB `assets-sprites` chunk exists because `createBattleCommandFieldArtView` (`battleCommandFieldArt.ts:220`, via `fieldArtBattler` at `:160-199`) is reachable and indexes those two tables.
- `party-mon-icons.json` and `frontier-trainer-pics.json` are already absent from the headless sprites chunk (`frontier-trainer-pics` still ships in headless `assets-gen`, 0.47 MB).

**Not a pure type-only cut.** The tick path reads three things from `pic`:
- `battleResolutionPresentation.ts:4870` reads `tileset.rows`, the sprite height for faint timing.
- `liveMoveAnimation.ts:3314` and `liveMovePaletteComposite.ts:48,67` read `pic.palette`. Palettes already exist in `battle-sprite-palettes.json`.
- `liveFieldArtTopLine` (`liveMoveAnimation.ts:4914`, called at `:4462` for the Extrasensory gate) scans `tileset.tiles` pixels for the first opaque row of the opponent. This is the only tile-pixel read I found outside the `battleScene.ts` renderers.

**Smallest cut:** keep `fieldArtBattler` building `{species, speciesSymbol, coords, origin, pic}` but make `pic` carry only `palette` and `tileset.{columns,rows}` from a small generated table. Generate one table of rows, columns and `topLine` per front species, in the style of the `battle-sprite-palettes.json` extractor, pinned by a test. Put `tiles` and `frame2` behind a pixel provider that renderers call, which `lib.ts` fills by dynamic import before the first `draw()` and which headless never installs.
- **Feasibility check:** stripping `tiles` and `frame2.tiles` from both JSONs in an in-memory transform took the headless total from 22.28 MB to **11.01 MB**. The sprites chunk went from 11.77 MB to 0.49 MB, and the other chunks were unchanged.
- **Risk:** any tile read I missed would throw in headless. The census and differential identity below catch it.

## (3) 10 largest modules in the browser lib bundle

Sizes are rendered MiB. Lazy-load here means a dynamic import started at mount and awaited before `ready` or the first `draw`, so the tick path never waits on the network.

| # | Module | Size | On tick path (in headless)? | Lazy-loadable? |
|---|---|---|---|---|
| 1 | `assets/gen/battle-opponent-front-sprites.json` | 6.57 | Not after the (2) cut | Yes. It could be sharded per species, but the draft and battle species are only known mid-run, so preloading the whole sheet before `ready` is simpler. |
| 2 | `assets/gen/battle-back-sprites.json` | 3.36 | Not after the (2) cut | Yes, same as #1. |
| 3 | `data/gen/battle-script-program.json` | 2.65 | Yes (interpreter) | No |
| 4 | `assets/gen/party-mon-icons.json` | 1.83 | No (already absent from headless) | Yes (render-only, `battlePartySelect` and `battleScene`) |
| 5 | `engine/battleScene.ts` (code) | 1.54 | Partly (`core.ts` imports it for tick state) | Not without splitting renderer from tick code |
| 6 | `data/gen/battle-script-graph.json` | 0.93 | Yes | No |
| 7 | `data/gen/battle-frontier-trainers.json` | 0.83 | Yes | No |
| 8 | `assets/gen/fight-submenu-window.json` | 0.47 | No | Yes |
| 9 | `assets/gen/frontier-trainer-pics.json` | 0.45 | Retained in headless by `battleScene` top-level consts, but render-only | Yes (after `battleScene` top-level reads are deferred) |
| 10 | `animation/assets/hidden-power-red-orb.json` | 0.45 | No (headless `animation-assets` chunk is only 0.1 MB) | Yes |

- **Runners-up:** `menu-idle-blank`, `menu-idle-base`, `battle-room-npcs` and `party-menu-chrome` (about 0.4 MB each) are all render-only and lazy-able.
- **Bigger lever:** the browser `index.js` is 7.1 MB against headless's 3.1 MB. About 4 MB of renderer code plus the `assets-gen` and `animation-assets` JSON (6.3 MB) is render-only. `render()` lives in `core.ts:3942` and `lib.ts:6` imports it statically. Splitting out a `renderer.ts` loaded by `import()` in `lib.ts` would lazy-load all of it without touching `tick`, but it is the largest refactor here.

## (4) Gamepad input entry points

- **Nothing exists today.** `grep -i gamepad` over `src`, `tests`, `tools` and `lib-types` finds nothing. It appears only in plans (`finish-plan.md:170,206`, `ROADMAP.md:55`, the handoff, and "out of scope" in `nch231-new-challenge.md:4`).
- **Entry points:**
  - `FactoryGame.press(button)` / `release(button)` are declared at `src/factoryContract.ts:58-59` and `lib-types/index.d.ts:39-40`.
  - `src/lib.ts:55-56` forwards them, and `lib.ts:212-218` implements them. `press` adds to `held` and `latched`, and `release` only deletes from `held`. `sample()` (`lib.ts:96`) feeds `session.tick`, which the recorder turns into the trace.
- **Keyboard is not in the library.** Only the dev shell binds keys, at `src/main.ts:111-121`, using `buttonForKey` (`src/input.ts:21-41`).
- **Smallest design:** add an opt-in `src/gamepad.ts` helper that polls `navigator.getGamepads()` on the mount's rAF and maps Standard Gamepad buttons to `GbaButton`. It would diff against the previous poll and call `press` / `release`, so the trace and tick path are untouched. The mapping is: 0 = A, 1 = B, 8 = SELECT, 9 = START, 12–15 = D-pad, 4 = L, 5 = R. D-pad axes need a deadzone. It wires from `main.ts` for the dev shell and ships as an optional `@pokebench/factory` export.
- **Open call:** whether the mount polls the gamepad itself or only exports the helper, since the website owns the on-screen pad. I would export the helper and have the dev shell opt in.

## (5) Proposed bounded worker steps

Every step ends with typecheck, the full suite and build. Run `tools/build/engineBuildCheck.ts` before and after each.

1. **`bnd-a`: move or archive test-only JSON.**
   - **Scope:** move the largest test-referenced JSONs to `tests/fixtures/data/`: `level50-move-parameterization`, `battle-script-command-candidate-audit`, `opcode-observations` and `handler-lexical-facts`. Update the 12–16 test imports and the path constants in extractors, `gate6-coverage-manifest.ts:215`, `package.json:44` and `docs`. Move the 40 orphans to `docs/archive/probe-json/`.
   - **Acceptance:** `ENGINE_BUILD` identical (`eb-891551c0b132b0c0`) and headless bytes identical. Repo `src/` shrinks by about 50 MB. Census and differential are not needed because no emitted module changes.
2. **`bnd-b`: pic geometry table.**
   - **Scope:** add the generated table (rows, columns, `topLine` per front species, plus the palette source) with its extractor and pinning test. Switch `battleResolutionPresentation.ts:4870`, `liveFieldArtTopLine` and the palette reads to it, with the JSON still imported.
   - **Acceptance:** `ENGINE_BUILD` may stay the same or change. If the emitted code moves, it is one expected change, and the website must be told. The pinning test proves the table equals the JSON-derived values for all 376 species.
3. **`bnd-c`: pixel provider and dynamic import.**
   - **Scope:** `battleCommandFieldArt` stops importing the JSON; a pixel provider is filled by `lib.ts` via `import()` before `ready` and the first `draw()`. Also install it in the dev shell and tests that render.
   - **Acceptance:** headless 22.3 MB → about 11.0 MB (measured by the stripped-JSON experiment), `assets-sprites` absent from `chunks-headless/`. `ENGINE_BUILD` changes once. `replayChallenge` digest and events must be identical to the pre-change build on the fixed seeds. Run `factoryLibrary.test.ts`, the Scene ON and OFF census (kernel digests must match the last baseline), the `compare:differential` pair, and a `--render-every 1` sample for pixels. Browser total is unchanged but the sprites chunk becomes a dynamic chunk.
   - **Risk:** this step needs the oracle's census run, so it should be its own worker run.
4. **`bnd-d`: defer the other render-only top-level reads and shrink headless further.**
   - **Scope:** `frontier-trainer-pics`, `battle-bg`, `stat-anim-banner` and `castform-forms` in headless `assets-gen` (about 1.4 MB). The main target is `battleScene.ts`'s top-level `const xFrontSprite` reads, which can move behind the provider.
   - **Acceptance:** headless `assets-gen` chunk shrinks, with the same identity gates as `bnd-c`.
5. **`bnd-e`: lazy renderer (optional, larger).**
   - **Scope:** move `render` and its asset graph behind `import()` in `lib.ts`, and lazy-load `party-mon-icons`, `fight-submenu-window`, `menu-*`, `battle-room-npcs` and the animation assets.
   - **Acceptance:** `index.js` shrinks by about 4 MB and `assets-gen` / `animation-assets` become async chunks. `ENGINE_BUILD` unchanged, because the headless graph is untouched. Browser tests with a stub canvas must `await` the renderer load.
6. **`bnd-f`: gamepad helper.**
   - **Scope:** `src/gamepad.ts` (poll to `press` / `release`) plus a unit test with a fake `navigator.getGamepads`, an optional export and a `lib-types` declaration, wired in `main.ts`.
   - **Acceptance:** a held-button trace equals the keyboard trace for the same input. `ENGINE_BUILD` unchanged if kept out of the headless graph.

**Suggested order:** `bnd-a` first (cheap, no oracle), then `bnd-b` and `bnd-c` together if time allows (that is the 11 MB headless win), and `bnd-f` any time. `bnd-d` and `bnd-e` are optional.

