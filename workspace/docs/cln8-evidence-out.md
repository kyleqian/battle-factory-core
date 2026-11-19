# cln8: tracked evidence nothing reads (finish-plan Cleanup 7 / 1), 2026-11-18

Scope: `git rm` tracked files under `tools/compare/evidence`, `tools/integration/fixtures` and `docs/probes` that no kept code or config reads. No `src/` change, no history rewrite. Follows `docs/cln7-scout.md` (2026-11-07), whose numbers predate `cln243: untrack write-only evidence (11691 files, 204 MB)`.

## Inventory, before and after (tracked files / bytes)

| Directory | Before | After | Removed |
|---|---|---|---|
| `tools/compare/evidence` | 751 / 619,409,092 | 751 / 619,409,092 | 0 |
| `tools/integration/fixtures` | 11,234 / 85,054,526 | 11,105 / 84,511,917 | 129 / 542,609 |
| `docs/probes` | 7 / 4,598,040 | 7 / 4,598,040 | 0 |
| whole repo | 23,781 | 23,652 | 129 |

The scout's 625 MB / 238 MB figures are mostly gone already; today's tree is what cln243 left. Nearly all of what remains is read (see below), so this step removes little.

## Rule used (a file is "read" if any of these holds; otherwise it is a removal candidate)

Reader corpus = every tracked `.ts .tsx .py .sh .mjs .js .json .yml .toml .html` outside the three directories (src/, tests/, tools/, docs JSON, package/vite configs). `.gitignore` and the root `ANIMATION_COVERAGE.json` are excluded as readers: the ignore file is not a read, and `tools/animation/coverage.ts` only validates the ledger shape and never opens the cited paths.

1. the full repo path appears in the corpus, or
2. the basename appears as a token, or
3. (fixtures) the depth-1 directory name appears as a token: the whole directory is kept (covers `readdirSync` / glob and `${FX}/<dir>/...` forms), or
4. a corpus token with a `-` or `_` and 6+ characters is a prefix of the file or directory name (covers templates such as `curse-${window}-dense-state.json.gz`, `snore-${stem}-raw-rgb.tar.gz`, `"species-audit-" + tag`).

Data JSON counts as a reader. That matters: `tools/compare/fixtures/*-evidence.json` ledgers cite `tools/compare/evidence/...` paths and tests do `existsSync(resolve(root, run.changeMap))` or sha256-check them (for example `triAttackEvidenceCheckpoint.test.ts`), so those paths are live reads even though no test names them literally.

Candidate count under the rule: 0 in `tools/compare/evidence`, 129 in `tools/integration/fixtures`, 0 in `docs/probes`. I also verified by hand the three evidence families that look unread by literal match: `curse-ghost-*` / `curse-stats-*-raw-rgb` (read by `curseProduction.ts` / `curseActualCore.ts` through `curse-${window}-...` templates, run by `curseProduction.test.ts` and `curseActualCore.test.ts`) and `snore-*` (`snoreEvidence.ts` template, run by `snoreEvidenceCheckpoint.test.ts`). All kept.

## Removed (commit c2185e8cb, 129 files, 542,609 bytes, all under `tools/integration/fixtures/`)

| Path | Files | Why unread |
|---|---|---|
| `aud137/scenarios/` | 44 | runner / stage scripts (`aud137*.sh/.py/.ts`) no longer exist; only `docs/aud137-live-audit-28.md` cites it |
| `audit-22/scenarios/` | 30 | no script, test or src names it |
| `audit-23/scenarios/` | 29 | same |
| `audit-24/scenarios/` | 24 | same |
| `altspecies3-derivation.json` | 1 | cited only by `docs/altspecies3-results.md` |
| `hpd3/rom-script-leads.json` | 1 | cited only by `docs/hpd1-hp-hold.md` |

Docs that cite these paths are left as written (they are history); the files are in git history.

## Kept, and why

- `tools/compare/evidence` (751 files, 619 MB): every file is pinned. 409 files (201 MB) are cited only by `tools/compare/fixtures/*-evidence.json` ledgers that tests read and existence / hash check; 258 more (373 MB) are also named by `tools/compare/*Evidence.ts` writers or verifiers; 72 (35 MB) are named by tests directly; the 12 curse / snore files above are template reads. Removing any of them breaks a kept test, e.g. both tri-attack changemaps (77 MB) are `existsSync`-checked by `triAttackEvidenceCheckpoint.test.ts`. Shrinking this directory further needs a decision, not a rule: relax those existence / hash checks or retire the ledger fixtures (and their writer scripts), then remove. Out of scope here.
- `tools/integration/fixtures` (11,105 files, 84.5 MB): every depth-1 directory is named by some test or script (many by tools-only writers; kept by the conservative rule).
- `docs/probes` (7 files): `src/engine/battleScene.ts` and `battleResolutionPresentationRender.ts` cite `kadabra-materialize-settle/` and `mid-battle-switch-oam/oam-ram-probe.json` (4.3 MB), `tests/generatedPlayerMaterializeSettleSpecies.test.ts` cites `generated-player-materialize-tail-tick/`; the other READMEs are documentation, not dumps.
- Untouched by instruction: `tests/fixtures`, `src/data/gen`, `src/assets/gen`, `src/animation/assets`, `tools/compare/traces*`, `tools/battle-lab`, `docs/parity-mac`, stage files.

## Runtime proof (with the 129 files removed)

- 228 test files naming `compare/evidence`, `integration/fixtures` or `docs/probes` (`grep -rlE` over `tests/`, plus one more that mentions `integration` and `fixtures`; the 229th grep hit is a helper, `tests/helpers/land97LeadAges.ts`): 228 / 228 files, 2,244 / 2,244 tests passed (two vitest runs, `--pool=forks --testTimeout=20000`).
- `npm run test:gate`: 362 / 362 files, 2,844 tests passed.
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- Full `npm test` is left to the supervisor on the merged tree.

## Getting a file back

```
git show c2185e8cb^:workspace/tools/integration/fixtures/aud137/scenarios/<file> > <file>
git checkout c2185e8cb^ -- tools/integration/fixtures/aud137     # whole directory (from workspace/)
```

(`workspace/` prefix applies when the repo root is the parent layer; from inside `workspace/` use the plain path with `git checkout`.) Earlier removals: `git show 374a89644^:<path>` (cln243).
