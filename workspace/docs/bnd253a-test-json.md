# bnd253a: test-only / tool-only JSON out of `src/` (finish plan Phase 3, bundle hygiene `bnd-a`)

Goal: `src/` holds only what the shipped engine graph imports. 97 generated JSON files that no shipped module (browser lib,
headless, dev shell) imports moved with `git mv` to `tests/fixtures/data/`; importers, extractor output paths and probe scripts
changed in the same commit. No emitted module changed.

## Before / after

| | Before (`7d382d766`) | After |
|---|---|---|
| `ENGINE_BUILD` (`tools/build/engineBuildCheck.ts`) | `eb-22fc0e2bc29aaff3` | `eb-22fc0e2bc29aaff3` |
| `dist-lib/` after `npm run build:lib` (14 files: `index.js`, `headless.js`, both chunk dirs, `.d.ts`) | 62,844,112 B | 62,844,112 B, every file's sha256 identical |
| headless output (`headless.js` + `chunks-headless/`) | 3,163,907 + 19,315,139 B | identical (same hashes) |
| `src/` (`du -sb`) | 108,951,791 B | 45,794,691 B (-63.16 MB, -58%) |
| JSON under `src/` | 396 | 299 (all shipped) + 2 allowlisted |
| unshipped JSON under `src/` (full rollup graph) | 99, 63,741,959 B | 2, 584,789 B |
| `tests/fixtures/data/` | absent | 97 files, 63,157,219 B |
| `npm run typecheck` / `npm run build` / `npm run build:lib` | 0 / 0 / 0 | 0 / 0 / 0 |

"Unshipped" is measured with `tools/build/srcJsonShipped.ts`: it builds `src/lib.ts`, `src/headless.ts` and `index.html` in memory
(Vite build API, `moduleParsed` hook, ~40 s) and lists every `src/**/*.json` that appears in none of the three graphs. Output at
the 2026-11-08 baseline: 99 files, 89 in `src/data/gen/`, 5 in `src/assets/gen/`, 3 in `src/animation/assets/` (the scout's
"100 of 396" on the older master, re-measured). The two that stay: `src/data/gen/factory-animation-inventory.json` (150 tool/test
references) and `src/data/gen/battle-animation-components.json` (123), per the scout's advice.

## What moved (97 files)

Largest first; all listed sizes are the pre-move bytes.

| File | Bytes | Readers / writer |
|---|---|---|
| `level50-move-parameterization.json` | 35,194,486 | 14 tests, `gate6-coverage-manifest.ts`; written by `npm run extract:level50-move-parameterization` |
| `battle-script-command-candidate-audit.json` | 4,619,469 | 1 test; `extract-battle-script-command-candidate-audit.ts` |
| `battle1-victory-ram-dump.json` | 3,876,932 | orphan (only named by another dump's comment) |
| `battle-script-opcode-observations.json` | 2,698,037 | 19 tests/tools; `extract-battle-script-opcode-observations.ts` |
| `battle-script-handler-lexical-facts.json` | 2,588,325 | 19 tests/tools; `extract-battle-script-handler-lexical-facts.ts` |
| `battle1-switchin-ball-particle-detail-probe.json` | 1,655,546 | `battleScene.test.ts` |
| 91 more | 12.5 MB | `battle1-*` / `battle2-*` / `turnN-*` RAM dumps and probes, `audio-sound-sources`, `factory-ai-script-catalog`, `battle-script-command-handlers`, `battle-script-move-end-{facts,delegates}`, `printfromtable-family-audit`, `dragonrage-*` probes, `ember-sprite-probe*`, small asset sidecars (`sendout-healthbox-opponent`, `trainer-pic-*`, `sky-uppercut`, `helping-hand-tag-hand`, ...) |

The full list is `git show --stat --format= 06e43b574 -M` (every row is a rename into `tests/fixtures/data/`).

Orphans (no test, tool or extractor reference outside docs by basename): 35 of the 97. **None deleted**: all were moved, so
nothing a probe or a future reader could want is lost. If a later step prunes them, `git log --diff-filter=D` on
`tests/fixtures/data/` is the audit trail.

### Path and extractor updates

- Every literal `src/{data,assets}/gen/<file>` and `src/animation/assets/<file>` string for a moved file was rewritten to
  `tests/fixtures/data/<file>` in tests (66 files; relative imports tidied to `./fixtures/data/...`), tools, probe specs,
  `ANIMATION_COVERAGE.json` and `src/**/*.ts` comments (comments do not reach the output, hence the unchanged hashes).
- Extractors whose default output directory was a `DATA_GEN` / `OUT_DIR` shared with shipped outputs got a per-file path:
  `extract-battle-formula-data` (`damage-formula-constants`), `extract-battle-move-anim-assets` (`battle-move-anim-tables`),
  `extract-battle-transition-frontier` (`...-squares`), `extract-battle-window` (`...-templates`), `extract-factory-screen`
  (`unused-pokeball-source`), `extract-factory-swap-screen` (`swap-screen-windows`),
  `extract-battle-script-opcode-observations` (reads handlers, writes observations; `--out-dir` still redirects both).
  The ones that only produce moved files changed their default directory: `extract-battle-script-{command-handlers,
  handler-lexical-facts,command-candidate-audit,move-end-facts,move-end-delegates}`, `extract-audio-sound-sources`,
  `extract-factory-terminal-messages`, `extract-level50-move-parameterization`, `extract-printfromtable-family-audit`,
  `extract-factory-ai-script-catalog`. Six python probe verifiers and `verify-turn13-frame2.ts` read the new path.
- Provenance strings **inside** the generated JSON were regenerated, not hand-edited: `battle-script-opcode-observations`,
  `-handler-lexical-facts`, `-command-candidate-audit` and `-move-end-facts` embed `src/data/gen/battle-script-*.json` paths
  (and the sha256 of an input that moved). The extractors were re-run in dependency order; the diffs are only those path
  strings and the cascaded sha256 (checked with a structural diff). `docs/gate6-coverage-manifest.{json,md}` were regenerated
  for the new `level50-move-parameterization` path. Shipped JSON that merely names a moved file as a string (for example
  `battle-transitions-frontier.json`) was left alone, because editing it would change the emitted module.
- Old paths still appear in historical `docs/*.md` and ledgers; they were not rewritten.

### Extractor check

Re-running with the new paths leaves the tree clean (byte-identical to the committed file):
`npm run extract:level50-move-parameterization` (35,194,486 B), `npm run extract:audio-sound-sources`,
`extract-battle-script-command-handlers.ts` (sha256 `b065d380af048cff...` before and after) and
`extract-battle-script-move-end-delegates.ts` (`0989ca287c337efb...`). The extractor round-trip tests
(`tests/battleScript*.test.ts`, `level50MoveParameterization`, `audioSoundSources`, `gate6CoverageManifest`, ...) regenerate each
file into a temp directory and compare byte-for-byte; they pass.

## Ratchet

`tests/bnd253SrcJsonShipped.test.ts` (Tier 1, about 0.1 s):

1. every `*.json` under `src/` must be named by a non-test `src/**/*.ts` module (import, `readFileSync`, URL; comments are
   stripped; matched by resolved path or basename for directory-constant reads) **or** be on `UNSHIPPED_ALLOWLIST`;
2. the allowlist only shrinks: each entry must still exist and still have no src importer (so it fails when an entry becomes
   shipped or is deleted), and its length is capped at 2;
3. no src module may name a path under `tests/`.

New recordings, probes and audit catalogs therefore go to `tests/fixtures/data/` (or `.integration/` per the evidence rule), not
`src/`. The exact graph check (`node --experimental-strip-types tools/build/srcJsonShipped.ts`, add `--json` for a list) is the
tool to re-derive the allowlist; run it after any change that adds a `src` JSON. The static test is an approximation: a JSON
imported only by a dead `src` module would pass the test and show up in the tool.

## Full suite

Six foreground `npm test -- --shard=i/6` passes (`POKEBENCH_VITEST_MAX_WORKERS=4`), all green:

| Shard | Files passed | Skipped | Tests passed | Skipped |
|---|---|---|---|---|
| 1/6 | 294 | 4 | 2,148 | 27 |
| 2/6 | 286 | 12 | 2,165 | 58 |
| 3/6 | 292 | 6 | 3,046 | 34 |
| 4/6 | 292 | 6 | 2,654 | 48 |
| 5/6 | 288 | 10 | 2,315 | 47 |
| 6/6 | 290 | 6 | 1,973 | 27 |
| **Total** | **1,742 passed of 1,786** | **44** | **14,301** | **241** |

0 failed files, 0 failed tests.

## Not done (out of scope)

`battleCommandFieldArt` pixel cut (`bnd-b`/`bnd-c`), lazy loading, gamepad. Typecheck heap after the move was not re-measured
(AGENTS.md's "~650 MB for the three largest" estimate should now be moot: those files are no longer in `src/`).
