# cln15: dead one-off tools (finish plan Cleanup 1)

Result: **1 file removed** (`tools/compare/rockTombProbe.py`, 7,886 bytes). No `src/` change, no fixture removed.
Earlier sweeps (`docs/archive/cln237-deleted.txt`, `cln279-deleted.txt`) already took the dead ones; what is left is
read by tests.

## The rule

A script is removed only if all of these hold:

1. no live file names its basename: `src/`, `tests/`, `tools/`, `../oracle`, `package.json`, `*.sh`, `*.py`, `*.ts`,
   `tools/test/test-gate.list` (a reference from another file that is itself dead does not count);
1b. no live data file names it (fixtures, receipts, `tests/fixtures`): tests such as `tests/animation/*Evidence*.test.ts`
   `sha256` the probe named in a fixture and `execFileSync` the evidence script, so such scripts are live;
2. no doc added or changed since 2026-11-13 names it (`git log --since=2026-11-13 -p -- docs/ '*.md'`);
3. its own last git change is before 2026-11-13;
4. not a keep class: census, soak, compare, differential, probe runner (`run-mgba-probe`, `probe.sh`, `hcr3m*`), extract,
   preview, `t2k4/`, `tools/audio|battle-lab|replay-hunt|soak|bundle`, the "do not edit on the box" list.

Counts over the 1414 scripts in `tools/integration` + `tools/compare`, first failing check in the order 4, 3, 2, 1, 1b:
kept by 4: 197, by 3: 139, by 2: 136, by 1: 777, by 1b: 164; dead: 1.
A fixture would go only if a dead script named it and no live file did; none qualified.
`ANIMATION_COVERAGE.json` and `docs/animation-integration-live-status.json` name scripts as prose and were not counted.

The first pass (checks 1-4 on code only) gave 165 files; the test run showed 164 of them are still read through fixtures
(check 1b), so only the survivor was removed.

## Removed

`tools/compare/rockTombProbe.py` (its only data mention is an orphan fixture, `altspecies3-rock-tomb-*.json`).

## Restore

`git show <sha>^:workspace/tools/compare/rockTombProbe.py` where `<sha>` is the cln15 commit (`git log --oneline --grep=cln15`).
