# cln243 -- untrack write-only evidence (finish plan Cleanup 7)

Result: **11,691 files, 204.1 MB (194.6 MiB)** left the git index (`git rm --cached`; history untouched, no rewrite, no R2). The exact
list is the deleted set of the commit that added this doc: `git diff --name-only --diff-filter=D HEAD~1 HEAD` (or `HEAD^` if this file
sits in a later commit; look for the commit titled "cln243: untrack write-only evidence"). Old content stays reachable at the parent commit.

| Directory | Untracked | MB | Still tracked |
|---|---|---|---|
| `tools/compare/evidence` | 37 | 6.4 | 751 (about 593 MB) |
| `tools/integration/fixtures` | 11,364 | 195.4 | 11,225 |
| `docs/probes` | 290 | 2.3 | 7 (all `*.md` plus the 4.3 MB pinned dump) |

The scout's "about 590 MB" for `tools/compare/evidence` did **not** survive the runtime check: tests read nearly all of it (changemaps,
dense-state, raw-RGB archives, via `readFileSync`, `tar` child processes and spawned `tools/compare/*Evidence.ts` / `*ActualCore.ts`
runners). Only 37 files there are truly write-only. Almost all the saving is `tools/integration/fixtures` (step-id audit dumps).

## Rule (list: `.integration/evidence/cln243/candidates.txt`, ignored)

Universe: tracked files under the three directories. A file is **kept** when its basename or path is named in `src/`, `tests/`,
`package.json` or the vite/vitest/tsconfig files; when a directory path is named there (read whole); when a `${template}` path in
tests/src matches it; when it sits under `scenarios/`, `patches/` or `lend-live/`; or when `*.md`. Everything else was a candidate:
named nowhere, named only by tools no test imports, or named by a tool in a test's import closure (those were NOT trusted statically;
the import closure is 3,047 tools and mostly names output paths it only writes).

Exceptions kept regardless (extractor-input guard): any candidate whose basename is named by a tool that also mentions `src/data|assets`,
`src/animation/assets` or `tests/fixtures` -- 40 files, list in `.integration/evidence/cln243/exception-candidates.json`
(tools: `rst139ProductionCompare.ts`, `trn176Predict.ts`, `msg175Anchors.ts`, `speciesAudit13*`, `prep38Fixtures.py`, `remainingAdaptersCensus.mjs`, ...).
`*.md` under `docs/probes` and `tools/compare/evidence` stay tracked.

## Runtime proof

12,712 candidates were moved to `/tmp/cln243-aside/`, then the full suite ran under a preload (`NODE_OPTIONS=--require`) that wraps
`fs` (sync, callback, promises) and `child_process` argument strings. Any access to a path under the three directories was logged and,
if the file was in the aside tree, **restored on first access** (so a test dying at its first missing file cannot hide the second). Passes:

1. Six `--shard=i/6` runs: 1,100+ accesses to candidates, 91 then 222 then 173 files restored by hand; a hand-restore pass was too slow
   (tests stop at the first ENOENT), so the hook was changed to lazy-restore and the 276 files that had failed were re-run (35 left, all
   `tar`-based readers; the hook was extended to child_process args; those 35 then passed).
2. Final verification: all six shards again with the lazy hook and the final aside set: **0 restores, 0 accesses to any untracked file,
   1,784 files, 1,740 passed / 44 skipped / 0 failed; 14,204 tests passed / 241 skipped / 0 failed**. Shard wall times 170 / 380 / 286 /
   213 / 200 / 149 s at `POKEBENCH_VITEST_MAX_WORKERS=5` (about 23 min total; one foreground call cannot exceed 10 min here, hence shards).
3. `npm run typecheck` rc 0 (248 s), `npm run build` rc 0 (288 s).

Caveat: the proof covers node-side `fs` and any evidence path appearing in a spawned command's argument strings. A non-node child (python,
shell) that derives an evidence path itself would not be seen; no test failed for that reason.

Tests also *write* into the tracked evidence dirs (`stockpile-changemap-*.json`, same bytes); those stay tracked.
