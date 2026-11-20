# cln10: dev-loop tooling papercuts

Tools and tests only. No file under `src/` changed; no game behaviour, RNG, gate semantics (the soak OK / CRASH / HANG rules) or Scene ON/OFF output changed. Five papercuts, one commit each. Outputs below were pasted from the commands as run in this worktree (oracles :8012 ON / :8014 OFF).

## 1. `npm run soak -- --help` starts a real soak; a killed soak prints nothing (`tools/soak/randomRoundSoak.ts`)

`--help` / `-h` print usage and exit 0 before any seed runs (the header comment of the file still has the full option notes).

```
$ npm run -s soak -- --help; echo "exit=$?"
usage: npm run soak -- [options]   (full option notes: header of tools/soak/randomRoundSoak.ts)
  --seeds A:B | --seed N     seed range (default 0:50) or one seed
  ...
  -h, --help                 print this and exit 0
SIGTERM/SIGINT (e.g. timeout): the seed in progress finishes, then the per-seed summary of the
seeds done so far is printed after an "INTERRUPTED after N of M seeds" line; exit 143/130.
exit=0
```

SIGTERM / SIGINT (what `timeout` sends): `runSeed` is synchronous, so the seed loop now yields to the event loop (`setImmediate`) between seeds; a pending signal sets a flag, the loop stops, and the normal summary blocks (counts, depth distribution, OK breakdown, CRASH / HANG groups) plus `--json` / `--coverage-json` are written for the seeds done so far, behind one `INTERRUPTED` line. Exit code 143 (SIGTERM) / 130 (SIGINT). **The seed in progress finishes first**, so a very long seed delays the summary; `timeout -k` still hard-kills. The per-seed lines were already printed as they happened. Uninterrupted output is byte-identical to before (`tests/randomRoundSoakParallel.test.ts` green, serial vs `--parallel` equality included).

`--parallel N`: the parent forwards the signal to its children, each child finishes its seed and writes its partial JSON, and the parent merges them as usual (children that exit 143/130 because of the interrupt are not reported as failures).

```
$ timeout 8 node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:40 --render-every 0 --first-round; echo "exit=$?"
seed    0  OK     b1 t16    9205f  0.6s  roundLost  carry<=0 depth<=0
...
seed   18  OK     b1 t16    9243f  0.3s  roundLost  carry<=0 depth<=0

=== soak INTERRUPTED by SIGTERM after 19 of 40 seeds ===

=== soak summary: 19 seeds (policy vanilla) in 5.9s ===
OK 19  CRASH 0  HANG 0  budget 0
...
exit=124                      (timeout's own status; the soak itself exited 143)

$ timeout 8 ... --seeds 0:400 --parallel 2 --json /tmp/p.json
=== soak INTERRUPTED by SIGTERM after 4 of 400 seeds (parallel slices) ===
=== soak summary: 4 seeds (policy vanilla) in 5.2s ===
```

(The children also print their own `INTERRUPTED ... of 200 seeds` line inside their buffered per-seed output when `timeout` signals the whole process group.)

## 2. `tools/audio/soundScoreboard.py` ran `main()` on import, no mass (`tools/audio/soundScoreboard.py`)

- `if __name__ == "__main__":` guard (importing the module runs nothing; `-h` / `--help` prints the docstring).
- Every family row and a new `TOTAL` row carry `mass` = sum of abs(engine - ROM offset, relative to the segment start) over the matched rows (exact rows add 0), the figure the t2n / hcr1c sections computed by hand. `exact + offset` over the TOTAL row is the matched-row count. `--out` JSON: `totals[family].mass`.

Cross-check against `docs/aud251-s11-scoreboard-refresh.md` (t2n section, line "Offset mass ON 55,711 -> 35,592 ... exact rows 479 -> 1,007; OFF 6,125 -> 5,437 ... exact 123 -> 126") on the t2n evidence directory (the 25 ON + 24 OFF t2n seeds, `.integration/evidence/t2n`):

```
$ python3 tools/audio/soundScoreboard.py .integration/evidence/t2n | grep -E "^==|TOTAL"
== Scene ON: 25 aligned seeds [2, 6, 97, ...]
TOTAL                       1007    4870        0      0    35592
== Scene OFF: 24 aligned seeds [2, 97, 165, ...]
TOTAL                        126    1007        0      0     5437
```

ON 35,592 / 1,007 exact and OFF 5,437 / 126 exact equal the documented figures. OFF per family: cry 1,054, controller SE 4,005, stat-change SE 353, bgm 25 (hcr1 quotes the same split as 5,438 with cry 1,054 / controller 4,006: a 1-row rounding in that doc's base line). Row counts equal the hcr1c breakdown (controller 832, cry 192, stat SE 105, bgm 4 matched rows).

## 3. `lsd194Census.sh` header named a tool that does not exist (`tools/integration/lsd194Census.sh`, `rst197CensusDelta.py`)

- Header now names the real tool, `tools/integration/rst197CensusDelta.py` (there is no `lsd194CensusDelta.py`).
- New one-line digest comparison, the thing workers kept re-writing:

```
$ python3 tools/integration/rst197CensusDelta.py --digest <base-arm> <final-arm>
eventsDigest+error identical 2/2, type-sequence changes 0, commands: 2 battles identical / 0 changed (636 commands), byte-identical shards 1/1
```

  Exit 1 when any digest / error / type sequence differs or a shard is missing (`MISSING shards [...]` is appended). Without `--digest` the old changed-command histogram is printed. `-h` prints usage. A missing final shard no longer crashes the script.
- **`WORKTREE` tree-ish** measures an uncommitted working tree: `src/ tools/ package.json tsconfig.json` (tracked and untracked-not-ignored) are snapshotted into a throwaway tree object through a temporary copy of the index (the real index, HEAD and the working tree are untouched); arm dir `<root>/<scene>-wt-<short tree sha>`. The tree sha is cached in `<root>/worktree.tree` so a resume re-uses the same snapshot; delete that file to re-snapshot after more edits. A tree object is also accepted anywhere a commit is (git archive / rev-parse take it), so a hand-built tree sha works too.

```
$ echo probe > tools/integration/zz_cln10_probe.txt        # untracked file
$ LSD194_SHARDS=0 LSD194_SHARD_SEEDS=2 sh tools/integration/lsd194Census.sh /tmp/cen WORKTREE:off HEAD:off
$ ls /tmp/cen
jobs  off-5dac05825  off-wt-6e681fe24  worktree.tree
$ ls /tmp/cen/off-wt-6e681fe24/tree/tools/integration/zz_cln10_probe.txt     # present in the WORKTREE arm
$ ls /tmp/cen/off-5dac05825/tree/tools/integration/zz_cln10_probe.txt        # No such file (HEAD arm)
$ git status --short        # real index untouched: the probe file stays "??"
$ python3 tools/integration/rst197CensusDelta.py --digest /tmp/cen/off-5dac05825 /tmp/cen/off-wt-6e681fe24
eventsDigest+error identical 2/2, ... byte-identical shards 1/1
```

## 4. `npm run compare -- <trace> --summary` printed only the tail line (`tools/compare/run.ts`, `diffRuns.ts`)

`--summary` (alias `--quiet`) now replaces the per-frame lines with: the first differing capture (px, or `MISSING from app`), the count of contiguous diff runs and differing captures, one line per run (frames `a..b`, captures in the run, max px; at most 10 runs then `(+N more runs; full list in manifest.json)`), and the usual `matched/total` tail. A run is a stretch of adjacent differing captures in capture order (a matching capture ends it). All-match traces print only the tail. Per-frame detail is still in `manifest.json` and the PNGs; without `--summary` nothing changed. `tests/cln10CompareSummary.test.ts` pins the digest.

```
$ npm run -s compare -- tools/compare/traces/fsc1-dig-eq-off.json /tmp/cmp --summary
first diff: frame 30 (10932px)
diff runs: 4 (345 of 499 captures differ)
  30..37  8 captures  max 10932px
  72..101  30 captures  max 268px
  171..202  32 captures  max 694px
  248..522  275 captures  max 7724px
154/499 frames matched -> /tmp/cmp
```

(154 matched and first diff at 30 are the fsc1 section's own figures for this trace.)

## 5. Compare-trace stage registry hard-coded (`tools/compare/appTrace.ts`)

Implemented: a trace with `"appStage": {"id": "lab", "frame": 0}` plus its usual `oracleBattleLab.scenario` needs **no `APP_STAGES` entry and no code edit**. `applyTraceStage` builds the staged battle from `tools/battle-lab/<basename of the scenario>` (the lab JSON the oracle runs; the basename is resolved under `tools/battle-lab/` so it works from `applyTraceStage(trace, state)` without a trace path), with the lab's `seed` and `profile` (scene).

Supported shape (the Rattata-pair labs: fsc1, aud241b, hpf4m, btn2, ...): active slots `parties.player[0]` / `parties.opponent[0]` with species 19, nature 0, IVs 31, EVs 0, no PP Ups, ability slot 0, friendship 0, four identical moves, optional held item. Staging is `fsc1Stages`' exactly: `rngSeed = seed`, `usedMessageHoldFrames: 0`, `sceneOffNoAnimations` on OFF, standard Rattata bench; the player's PP = the move's base PP (`src/data/gen/moves.json`), the foe keeps `rattataAtLevel`'s 20 PP like every hand-written Rattata stage. Any other shape throws naming the side and field (`lab stage <lab>: player[0] species 25 is not 19 (generic lab stage supports Rattata-pair labs only; add an APP_STAGES entry)`), so labs with other species / bench / items / HP overrides still need a hand-written stage. Not designed here: a general stats calculator (species base stats, nature, IV / EV) for arbitrary species, bench members, and the lab `playerSetIds` / `trainerId` draft path; that is the next step if the Rattata-pair shape stops covering new labs.

Proof: `tests/cln10LabBackedStage.test.ts` checks that for all eight fsc1 labs the generic stage returns a state `toEqual` to `APP_STAGES["fsc1-<case>-<scene>"]` (both sides of the registry), that `applyTraceStage` routes `id: "lab"`, and that a non-Rattata lab is rejected with the field named. End to end: a copy of `fsc1-dig-eq-off.json` with `appStage: {"id": "lab"}` gave the byte-identical `--summary` output shown in section 4 (first diff 30, 154/499).

```json
{ "appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-off",
  "appStage": { "id": "lab", "frame": 0 },
  "oracleBattleLab": { "scenario": "../../battle-lab/<lab>.json" }, "segments": [...], "captureFrames": [...] }
```

## Verification

Recorded in the final report of the step (typecheck, build, `test:gate`, the tests importing the touched tools: `randomRoundSoak*.test.ts`, `compareCli.test.ts`, `cln10CompareSummary.test.ts`, `cln10LabBackedStage.test.ts`, `fsc1HitTiming.test.ts` and the other `appTrace.ts` importers).
