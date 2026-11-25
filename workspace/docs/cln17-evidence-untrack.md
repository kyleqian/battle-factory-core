# cln17 -- second evidence untrack (finish plan Cleanup 7, part 2)

Result: **32 files, 0.60 MB** left the git index (`git rm --cached`; files stay on disk, now ignored; history untouched). List with sizes:
`docs/archive/cln17-untracked.txt`. The yield is small on purpose: cln243 (`docs/cln243-evidence-untrack.md`) already took the write-only bulk
(11,691 files, 204 MB), and this re-measure shows **tests read everything else in `tools/compare/evidence`**.

State before: `tools/compare/evidence` 751 files (619 MB), `tools/integration/fixtures` about 11,100 files, `docs/probes` 7 files (4.6 MB).

## Method (both passes: full suite, 10 `--shard=i/10` runs, `POKEBENCH_VITEST_MAX_WORKERS=2`, about 58 min per pass)

Each foreground call is capped at 10 min here, so the suite ran as shards. Files were moved to `/tmp/cln17-aside/` (outside the worktree). A
preload (`NODE_OPTIONS=--require hook.cjs`, scratch under the ignored `.integration/evidence/cln17/`) wrapped `fs` (sync, callback, promises)
and the string arguments of `child_process`: the first access to an aside file (read, stat, exists, open, copy, or a directory read of a
subdirectory above it) moved it back and logged the accessing stack. A test therefore cannot die at its first missing file and hide the
second, and a file still aside at the end was never reached by any node-side access in the whole suite. Python / shell children that derive
an evidence path themselves are not seen by the hook; they would have failed with ENOENT, and no test did.

| Pass | Moved aside | Restored on access | Still aside | Full suite |
|---|---|---|---|---|
| 1: static scan candidates (named by no test / src file, no named directory) | 915 files (679 in `tools/compare/evidence`, 584 MB; 236 in `tools/integration/fixtures`, 3 MB) | **915 (all)** | 0 | 2,029 files, 17,309 passed / 243 skipped / **0 failed** |
| 2: everything non-`.md` in the three directories except pass 1's proven readers | 10,932 files | 10,893 | **39 (5.9 MB)** | 2,029 files, 17,309 passed / 243 skipped / **0 failed** |

- Pass 1 is the headline: every `tools/compare/evidence` file the static scan called unreferenced is read at runtime (`tools/compare/*Evidence.ts`
  checkpoint tests, `tar` readers, `liveSelectorsMoveAdapters`, `flailReducer`, ...). The scout's "about 590 MB write-only" was wrong again.
- Pass 2 used a broader rule (any directory read restores the whole subtree under it). Almost all of its restores come from directory
  listings, 8,652 of them from `tests/iss215ToolPixelInstall.test.ts`, which only *lists* `tools/**/*.ts` and never opens a fixture. Those
  8,652 files are therefore kept by a false positive, not by a proven read; a third pass that exempts that one walker is the only way to find
  more (cost: one more full suite, about 58 min; unknown yield, probably small `tools/integration/fixtures` receipts). Not done here.
- No baseline run was needed: both moved-aside passes had 0 failures (sa125 / sag130 included), so there was nothing to compare.
- The hook restores on any access, so these passes prove "never touched", not "a test fails without it"; for the 915 + 10,893 restored files
  that is the intended (conservative) direction.

## What was untracked (32 files)

Top-level `tools/integration/fixtures/*-live-receipt.json` / `prep*-routes.json` / `prep*-probe.json` style receipts that tests and `src` name
only in comments or provenance strings (`liveMoveTimingPolicy.ts` evidence cells, "receipt X" comments) and never open. Never read at
runtime by the whole suite with the files absent.

## What stays tracked although no test read it (7 files, 5.3 MB), and why

Provenance cited by `src` / tests, kept so the citation resolves in a fresh clone (same reading as cln243's "pinned dump"):

- `docs/probes/mid-battle-switch-oam/oam-ram-probe.json` (4.3 MB; `battleResolutionPresentationRender.ts` says it is checked value for value against it)
- `docs/probes/kadabra-materialize-settle/{out,scenario}.json` (`battleScene.ts`, `prebattleRoom` tests)
- `tools/integration/fixtures/allocator-consumer-tie-audit.json` (`liveMoveSpriteAllocator.ts`)
- `prep6-faint-attack-player.json`, `prep7-double-team-player.json`, `prep7-rock-slide-opponent.json` (their paths are in the expected fixture-name lists of the `*Sides` / `liveFa185Timing` tests)

Everything else in the three directories stays tracked: it was read at runtime (pass 1, 915 files, 584 MB) or sits under a directory a test
enumerates (pass 2). `*.md` under the three directories were not moved.

## Rules

`.gitignore` has one explicit line per untracked file (same style as cln243). New evidence goes to `.integration/evidence/<step>/`
(`AGENTS.md`, "Evidence stays out of git").
