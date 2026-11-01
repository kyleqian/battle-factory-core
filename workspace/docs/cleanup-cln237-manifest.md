# cln237 cleanup manifest (docs/finish-plan.md "Cleanup" item 1)

One reversible deletion commit; git history is not rewritten. The deleted step tools and
fixtures live in the parent commit and in every earlier commit:

    git checkout 72c9d264c5bf7758dc07aaaa9699b7a413d89b3d -- workspace/<path>   # parent of the deletion commit
    # (master 0120db503 also has every deleted file)

The full deleted list (2,103 repo-relative paths, workspace-relative) is `docs/archive/cln237-deleted.txt`.
Deleted step tools are at the parent commit; docs and ledgers that cite them keep pointing at git history.

## Method

`tools/cleanup/keepClosure.ts` (`node --experimental-strip-types tools/cleanup/keepClosure.ts
--delete-list F --kept-list F --broad-mentions F`) treats every tracked file under
`tools/integration/` and `tools/compare/` as a deletion candidate and everything else tracked
(src, tests, other tools, launchers, package.json, core-rs, oracle/, ...; NOT `*.md`, `docs/`,
`ANIMATION_COVERAGE.json`) as a reference root. A candidate is kept if a seed names it or any
kept file (roots, then kept candidates, to a fixed point) references it by: repo-relative path
suffix, bare basename, python import, a directory path of depth >= 4 (kept whole), a bare token
equal to a depth-4 directory name (kept whole), or a quoted name fragment that is a `-_.`-boundary
prefix of a data file's basename (runtime-built names such as `${stem}-run-a.json`). Comments are
stripped before scanning, so a doc comment citing a directory keeps nothing. Seeds: the compare
core (run, batch, app-differential, inspect-frame, appTrace), `traces/` and `traces-groundtruth/`
whole, `lsd194Census.sh`, `rst197CensusDelta.py`, `start-local-preview.sh`. Idempotent: re-running
after the deletion reports 0 deletable files.

A test that needs a file keeps it; no test file was deleted. `tools/compare/traces/`,
`traces-groundtruth/` are kept whole. Kept tests read ~22.5k integration fixtures, which is why
the fixture trees shrink only by ~460 files.

## Counts (tracked files)

| directory | before | after | deleted |
|---|---:|---:|---:|
| tools/compare (top-level scripts) | 1,126 | 918 | 208 |
| tools/compare/evidence | 803 | 788 | 15 |
| tools/compare/fixtures | 1,206 | 1,201 | 5 |
| tools/compare/scratch | 116 | 9 | 107 |
| tools/compare/traces | 211 | 211 | 0 |
| tools/compare/traces-groundtruth | 74 | 74 | 0 |
| tools/integration (top-level scripts) | 1,842 | 530 | 1,312 |
| tools/integration/fixtures | 23,035 | 22,579 | 456 |
| tools/integration/random2R1,R4,R5 | 6 | 6 | 0 |
| **total** | 28,419 | 26,316 | 2,103 |

Deleted: 2,103 files, 189,684 lines, ~11.3 MB of blobs (history unchanged, so `.git` does not shrink).
