# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.
Delete an entry when its underlying friction is fixed; git preserves its
history.

## Worker friction, 2026-11-13 run

- **`oracle/emerald_core.py` in a worktree looks for `vendor/` one level too high**: the recorder needs
  `PYTHONPATH=/srv/pokebench/vendor/libmgba-py` (aud244b ~3 min). Same root as the `romDriveSeed.sh` worktree entry below.
- **`tests/randomRoundSoak.test.ts` keeps its helpers un-exported**: a seed-range re-scan needs a copied scratch test (rps278 ~5 min).
- **`npm run extract:audio` in a fresh worktree re-records and rewrites `aud244a-asset-list.json`** unless `--raw` points at the main
  checkout's `.integration/evidence/aud244a/raw` (aud244b ~5 min).

## Worker friction, 2026-11-12 run

- **mGBA python `StereoBuffer.read()` returns a slice that does not keep its buffer alive**: alternate frames read garbage, which looks
  like emulator nondeterminism (aud244a, ~90 min). Drain with `read_into` on your own buffer (`tools/audio/soundRecorder.py`).
- **`romDriveSeed.sh` on a scratch / worktree copy needs `POKEBENCH_MGBA_PYTHON` and an `oracle` symlink** (undocumented; dia272 ~6 min,
  fix274 ~2 min). The engine replay timeline omits the mid-turn forced-switch turn, so engine / ROM rows are aligned by hand (dia272 ~5 min).
- **`npm run typecheck` takes ~4-4.5 min** and auto-backgrounds at the 120 s default tool timeout; one worker then started a SECOND typecheck
  beside it (2 x 5-7 GB, the host hit 1 GB free; supervisor killed the duplicate). Wait on the first one's exit (aiv271 ~10 min, lbra ~15 min, fix274).
- **`lsd194Census.sh` merges its shards by re-resolving `HEAD` / `HEAD~1`**: a supervisor merge mid-run makes it report INCOMPLETE with every
  part on disk (pnm273 ~3 min). Pass explicit SHAs.
- **No compare-ready Scene ON loss / retire lab** for the Lobby return windows (lbra ~30 min).
- **A worker's full suite dies with the worker** when the 10-min Bash limit backgrounds it and the worker ends its turn (aud244a); a
  worker that must report a suite has to poll it to the exit file before finishing. Bumps the 2026-11-10 / 11 "over 600 s" entry below.

## Worker friction, 2026-11-10 / 11 run

- **`randomRoundSoak.ts --help` is not a flag: it starts a real default soak** (seeds 0:50) that must be killed by PID (dmg264b, ~10 min).
  Read the flags from the source header instead.
- **A foreground Bash call over 600 s is silently moved to a background task**: multi-shard suite loops need per-call budgets under 10 min
  (dmg264b, ~10 min waiting on a shard). The same bites `npm run typecheck` (> 120 s default timeout; aiv266 ~5 min), `npm run soak --scene both
  --parallel 4` (prints nothing until the end, so a 570 s cap loses the run; aiv266 ~10 min) and `lsd194Census.sh` over 1000 seeds (several
  re-invocations; aiv267 ~10 min).
- **`tools/report/ability-item-parity-census.ts` pins engine LINE numbers**: any insertion in `factoryAiCheckBadMove.ts` / the hit chain fails a
  shard until the pins move (aiv266 ~6 min, aiv267 again).
- **`git archive` pathspecs are cwd-relative while the toplevel is the parent of `workspace/`**; `git apply -R` wants toplevel paths (aiv267 ~5 min).
- **`npm run build` takes > 500 s while the soak gates run beside it** (seg268 ~8 min); the seg127 exposure census is single-threaded per
  shard (~2.4 s / battle).
- **`romDriveSeed.sh`'s divergence tuple `[frame, gCurrentMove, hp0, hp1, rng, lastMove0, lastMove1]` is undocumented in its output** (read
  `romStateTimeline.py`; aiv267).

## Worker gate friction, 2026-11-09 / 10 run

- **`pgrep` / `pkill -f <pattern>` kills the caller's own shell** when the pattern also appears in that shell's command line (abl261, 2x, ~8 min). Kill
  only retained PIDs. Hits: 1 (plus the 2026-08-25 soak entry).
- **Workers hit the 120 s default Bash timeout on typecheck / build (~4-5 min each) and the harness auto-backgrounds >10 min commands** (census,
  full suite), so workers lose 5-15 min polling (abl261, aip262). Briefs should say: timeout 600000 on typecheck / build, nohup + exit file for
  census / suite. Hits: 2.
- **The Scene ON vanilla soak 0:20 takes ~10-15 min with `--parallel 2-4` on a loaded host**; a 590 s timeout loses the result (aip262). Run it
  under nohup with an exit file.
- **Supervisor gate scripts: `cmd > log; echo $? > exit &` backgrounds only the `echo`** (the gates then ran serially, ~10 min lost). Wrap each gate
  as `( cmd > log 2>&1; echo $? > exit ) &`.
- **`| tail` hides a failing exit code** (`test:smoke`), so a stale pin got committed once (abl261, ~10 min). Use `set -o pipefail` or an exit file.
- **Census-seed tests lose coverage on every gameplay fix:** each fix re-stages pinned census seeds to "unchanged" ones and some classes have none
  (abl261: 3 sag130 classes; aip262: apx222 Peck 64; dmg264: Razor Wind, no seed found before the cap). Regenerate seg127 `exposure.json` /
  derived seed lists from the current census instead of hand re-staging. Hits: 3.

## Census / worktree friction, 2026-11-08 / 09 run

- **`package.json` `"sideEffects": false` silently drops bare side-effect imports from vite bundles** (bnd256c shipped a browser build
  with no sprite pixels; only `play:random` caught it, vitest / node never bundle). Install-style modules must export a function the host
  calls. Any bundle-shape step must run `npm run build && npm run play:random -- --minutes 2 --scene both` before it is called green.
- **The vanilla soak runs past the 10-minute tool limit** (OFF ~27 min, ON ~40 min here); workers lost it to auto-backgrounding (sum259).
- **Integration worktrees cannot see the main checkout's `.integration/` evidence** (baseline census arms live there; aud243a, ~3 min).
  Briefs should name the absolute path `/srv/pokebench/pokeemerald-factory-core/workspace/.integration/...`.
- **Long foreground commands (typecheck, census, full suite) are auto-backgrounded at the tool timeout, and a `pgrep -f` poll matches
  its own shell** (aud243a, ~10 min). Use `nohup ... & echo $! > pid` and poll `kill -0 $(cat pid)`.

## Audio-window and verification friction, 2026-11-04 / 05 run

- **What / cost:** (1) No repo tool replays a trace / lab stage and prints our sound events next to a probe fixture; aud241a kept
  replay / compare scratch scripts in `/tmp` (~10 min). (2) `midBattleSwitchStage` in `tools/compare/appTrace.ts` was a
  fixed-argument stage builder; aud241b added an options bag to stage levels / moves / scene (a shared stage-spec type would help).
  (3) Each vitest run spends ~80 s on transform + ~150 s collect, so many small runs add up; batch the touched files in one run
  (~25 min, aud241a). Bare `npx vitest` OOMs on many files without `NODE_OPTIONS=--max-old-space-size=8192` (cln240, again).
  (4) `npm run typecheck` (~4 min) and the 211-trace differential (~20 min) exceed the 2-min default / 10-min max tool timeout;
  workers split the differential into seven batches (frs247). Run them under `nohup` with an exit file.
  (5) cln237 deleted the pfr probes that frs247 needed; restored from git history (~5 min). (6) A worker removing its worktree
  drops evidence written there; frs247 put its census in `/tmp/frs` (copied to the run's evidence folder by the supervisor).
- **Hits:** 1 session, ~1 h across four workers.
- **Fix:** a `tools/audio/replaySoundWindow.ts` (stage or trace -> our SoundEvents vs a fixture, frame deltas); a typed stage
  spec for `appTrace.ts`; a `compare:differential --parallel` / resumable mode.

## CAX31 (16 GiB ARM) host friction, 2026-10-14

- **What / cost:** (1) Gate wall-clock: vanilla 0:20 soak ~45 min, winning / winning-swap 0:60 ~7.5 min per seed serial (~7.5 h
  each); the supervisor had to split the seed ranges mid-run (~1 h of schedule). (2) The full suite (~47 min) exceeds the 10-min
  tool limit; a worker hand-chunked it, a killed chunk left orphaned vitest forks holding ~10 GB, and the retry was OOM-killed
  (~15 min). Run it under `nohup` with a summary file instead. (3) Census scripts launch 10 shards per arm, too many for 16 GiB;
  trf174 added a job-limited pool (`trf174Census.sh`, `TRF174_CENSUS_JOBS`) (~15 min). (4) `pkill -f <pattern>` killed the
  worker's own shell (~3 min; same class as the mgba entry below). (5) `run-subagent.sh` prints
  `[claude-code:unrecognized_model] claude-sonnet-5-5` at launch; harmless (the worker initializes on that model).
  (6) `off108Run.sh` / `off148Run.sh` hard-code the Mac mGBA venv path (`<home>/...`); CAX31 uses
  `/srv/pokebench/vendor/mgba-venv/bin/python` (~10 min; `trn176Run.sh` takes `TRN176_PY`).
  (Fixed this session: `check-oracle-freshness.sh` used BSD-only `date` flags and compared against every game commit.)
  (7, 2026-10-15 fpc180) A new test that imports a `tools/` file puts it under `tsc -b`; a typecheck run before the test existed
  missed its type errors until build (~4 min). (8) `trn178Census.sh` has no shard / resume option, so a 40-job census cannot be
  driven inside the 10-min tool limit; `fpc180Census.sh` adds `FPC180_SHARDS` + resume on an existing root.
  (9, 2026-10-15 trn181) A 150-min worker spent ~100 min on implementation / census / differential and was capped while its 48-min
  full suite finished (result recovered from its `/tmp` log). Briefs now say when to start the suite.
  (10, snd182) `animationBoundaryRatchet` failures print only `expected [ …(2) ] to deeply equal []`; the violating files need a
  verbose rerun. An `until ! pgrep -f tsc` poll matches itself (~3 min); poll an exit file.
  (2026-10-29, apx220 / apx222) `lsd194CensusDelta.py` prints FAIL (51 `typeSequenceChanged` seeds) on byte-identical OFF
  shards; compare OFF arms with `cmp` (~5 min). Census and `npm test` exceed the 600 s tool limit and `npm run typecheck`
  chained with another command is auto-backgrounded at 120 s; run them under nohup with an exit file (~20 min, apx222).
  Hits +1 (2026-10-29 bso225: typecheck ~4 min auto-backgrounded, ~5 min; `lsd194Census.sh` first call hit the 590 s tool cap
  during tree setup before its resume finished, ~10 min). Hits +1 (2026-11-02 aud240a: typecheck + full `npm test` auto-backgrounded,
  ~10 min to recover with a polling loop). (2026-11-03 supervisor) a standalone `npx vitest run tests/gate6CoverageManifest.test.ts`
  OOMs at node's default 4 GB heap; run it with `NODE_OPTIONS=--max-old-space-size=8192` like `npm test` (~3 min). New test files
  must also be listed by regenerating `tools/report/gate6-coverage-manifest.ts` (rng244 missed it; one red suite, ~5 min).
  (2026-10-30 bso226) The bso225/226 window harness crashes when a window needs ROM frames at or past 2008, and `--drift` has no
  bound (~10 min).
  (2026-10-30 apx227) `rst197CensusDelta.py` has no output-file argument; the cached apx223 ROM scout went stale (Conversion 2 had
  no opponent MOVEANIMATION until recaptured); internal species ids vs national numbers make census seed triage error-prone.
  (2026-10-30 pfb228) `bso225Dense.ts` auto-delta search is bounded at +4 and silently picks the boundary (caused the bso225 "-4..+3
  offset" misdiagnosis, ~20 min); no PIL on the host (hand-written PNG writer, ~5 min); MEW has no player battle pic in
  `fieldArtBattler` (throws, ~2 min); `pkill -f` killed the worker's own shell again (~3 min).
  (2026-11-08 aud242e, also aud242d) `compare:differential --base` could not build a base lacking new `appTrace` stage ids (~10 min each);
  fixed by dif256 `--harness-from-head`.
  (2026-11-07 cln243) a 5-worker full suite (~21 min) cannot run as one foreground call; workers shard it `--shard=i/6` by hand.
  (2026-11-07 aud242d) chaining `typecheck && build && build:lib` in one foreground call passes 600 s and auto-backgrounds (~10 min).
  (2026-11-06/07 supervisor, from 5 workers) `pkill -f` killed the worker's own shell twice more (aud242b ~5 min, cln242
  ~5 min: use `[n]ode` / kill your own PID); 120 s / 600 s auto-backgrounding again (aud242b, aud242c, obr251 ~3 min each);
  `compare:differential` says "requests no captureFrames; nothing to compare" without naming `--capture-range` (~2 min; fixed pc258);
  `soundEventProbe.py` leaves a stray `.json.log`, omits the replay `trace` key (patched by hand per fixture, ~15 min) and reads a
  stale output file (all three fixed by sep257, 2026-11-08); aud242b saved fixtures without the call log and never listed them in `audioProbeFixtures.test.ts` (one red
  file, not in the gate); `lsd194Census.sh` final merge step did not run (obr251 concatenated the shards by hand; fixed pc258: empty-xargs exit 123 under set -e).
  (2026-10-30 cff230) `tools/compare/run.ts` cannot take mechanicLab custom parties and `apx223OracleCheck` cannot stage an "at"-role
  key when the weather setter must be the Castform (~20 min); `tsc` rejects `import "pngjs"` in tools files a test imports (no type
  declarations, ~10 min); the worker believed `reference/pokeemerald` was absent although the worktree link resolves (~25 min).
  (nch231) `.integration/browser` (Playwright) is not linked into worker worktrees, so play:random fails until symlinked (~5 min);
  play:random rarely reaches the Lobby without a forced retire (~25 min; nch231 added an opt-in retire bias).
  (cff232) `lsd194Census.sh` resume treats part files shorter than 25 lines as complete; a killed run needs a manual check (~5 min).
  (pfb229) Briefs should name `npm test -- --shard=i/12` foreground chunks as the accepted full-suite form; `lsd194Census.sh` resumes
  only in ~560 s chunks and reports static only inside per-command fields (no summary line).
  (11, sub183) `prep37Probes.sh` and siblings hard-code Mac paths (another wrapper, `sub183Probes.sh`); every census needs a copied
  `.ts` / `.sh` / delta script because the census row layout is positional (a field index slipped by one).
  (12, 2026-10-16 evidence steps) `sub183Probes.sh` launches every job at once (no concurrency cap; lsd186 wrote `lsd186Probes.sh`);
  `fpc177Probe.py` has no per-frame controller / SE state mode (fpo187 wrote `fpo187Probe.py`); `nm`-built symbol dicts drop duplicate
  static names (pfr185); the generic worker footer "npm test and npm run build green" conflicts with evidence-only briefs that forbid them.
  (13, msg189) A side-lane worker committed onto master in the main checkout (doc only) instead of its worktree branch; the launcher
  reported "no commits" for the branch. The launcher should refuse or detect a main-tree HEAD move by a side / integration worker.
  Hits +1 (2026-11-03 cln239): an integration worker committed docs onto master in the main checkout, then `git reset --hard` it
  back itself, while the supervisor's full suite ran in that tree (no damage; reflog `178aed1d9`). Also a full suite beside a
  worker's gate6 runs lost one fork (`randomRoundSoakParallel` rerun, ~3 min).
  (14, 2026-10-16 pfr192) Absolute frame-total pins (sc106, sgl138, soak seed totals) need a re-pin on every send-in timing change and
  their deltas do not sum from the census (dismiss-press parity / soak input cadence); older census drivers (fpc180, trn178, msg175) press
  dismiss on absolute `frame % 2`. A per-send-in delta helper would make attribution mechanical (~20 min).
  (15, 2026-10-17 ont193 / lsd194) ont193 hand-sharded the full suite across its own re-pins despite the brief, so no single run covered
  the final tree (the supervisor's own 48-min run did); lsd194 started its suite at ~80 of 120 min and was capped while re-pinning
  20 failures. A 120-min cap cannot hold a shared-timing change + census + a 48-min suite + a re-pin round; split such steps (~1 h).
  (16, 2026-10-23) `lsd194Probes.sh` fails under `sh` ("jobs: Illegal option -r"; run it with `bash`); `lsd194SoakPins.ts` needs a manual
  `git archive` + `node_modules` symlink per older tree (a `--tree=<rev>` flag would remove it); `lsd194CensusDelta.py` assumes only the
  final tree carries the drain, so later censuses need `rst197CensusDelta.py`; a full suite beside a worker's single-file vitest lost one
  vitest fork ("Worker exited unexpectedly"; the missing file had to be found by diffing reported files against `git ls-files`, ~10 min);
  worker-only typecheck skips let `findLast` (lib ES2022) and two narrowing errors reach the supervisor's gate (~10 min); lsd198's drain
  RGB dumps are not committed, so its dense compare first regenerates ROM frames; each single vitest file spends ~75 s collecting.
  (12, 2026-10-27/28) Playwright lived only in a removed worker worktree's ignored `.integration/browser/node_modules`, so the
  first `play:random` on master failed (~5 min; reinstalled in the main checkout). A full suite beside a census-running worker was
  OOM-killed in one fork (~5 min to find + rerun the unreported file). `lsd194CensusDelta.py` prints FAIL and a 51-battle
  `typeSequenceChanged` list for identical arms; use `rst197CensusDelta.py` (apx215 worker ~10 min).
  (17, 2026-10-31/11-01) The supervisor's full suite beside a worker's focused vitest (4 GB) was OOM-killed outright (exit 137,
  orphaned forks; ~10 min). A brief that fenced the worker's heavy jobs behind a wall-clock time (02:30) left it idle ~40 min when the
  supervisor's gates finished early — fence on an evidence file the supervisor writes (e.g. `<evidence>/gates.done`), not a clock.
  (18, 2026-11-01) Again: a supervisor full suite beside a worker's full suite lost one fork (supervisor ~5 min) and the worker's
  two unrestricted runs (exit 137; it fell back to `--maxWorkers=1`, 70+ min, unfinished at its hard stop; ~75 min). Rule: while a
  worker may run vitest, the supervisor runs no suite; one full suite on the host at a time.
  Mid-run Mac pushes to a branch being folded cost two worker restarts (~20 min). `rst197CensusDelta.py` exits 1 on inserted
  commands; presentation-only insertions need a subsequence check. play:random in a supervisor `git worktree` also needs the
  `.integration/browser/syslibs` symlink (libnspr4).
- **Hits:** 6 sessions (2026-10-14, 2026-10-15/16, 2026-10-16/17, 2026-10-23, 2026-10-27/28, 2026-10-31/11-01), ~4.5 h total.
- **Fix:** a host-aware gate runner (`nohup`, per-seed-range fan-out sized to free memory, summary file) shared by workers
  and the supervisor; census job limit from `/etc/pokebench-runner.env`. Vendor paths: 155 `tools/**/*.sh` hard-code
  `../../vendor`; replace with `${POKEBENCH_VENDOR_DIR:-…}` and export it from the runner env (one sweep +
  spot-run a few probes on each host).

## Tooling gaps hit on 2026-10-11 (S10A afternoon)

- **What / cost:** (1) Evidence runners hard-code their base revision and patch-apply their own banked diff (off108Run.sh,
  aud110Patched.sh, stg107Run.sh, stf115Run.sh), so every land step writes a near-copy wrapper to re-prove from its own checkout, and a
  runner fails outright on a tree where the patch is already landed (fix114 on the Struggle union) (~3-10 min x 6). (2)
  `land82CensusCheck.py`'s `liveFramePctAfter` divides the final arm's live frames by the BASE arm's frame total; when live bodies grow
  the timeline (Struggle 112 rows vs ~32 fallback) it over-reports (sdl119 / stf115 published 99.44 % for a true 99.31 %; supervisor
  correction `5ea7126dc`) — use the merged report's own percentages. (3) `prep43CensusDelta.py` / `ret88Census.sh compare` assert equal
  command counts and abort on any budget-stalled tail (seeds 434 / 796 / 881) (~2-5 min x 3). (4) The serial wind-down vanilla soak
  gate runs ~44 min (every seed to the 600k budget); workers and the supervisor use `--parallel 5` (~10 min). (5) `liveShareCensus.ts`
  is Scene ON only; Scene OFF timing changes need off108Route.ts / olnd113 tools (~5 min). (6) `audit20Check.ts` aborts a whole
  scenario when any body lacks a live adapter; `audit20Summary.py` crashes on audit21Check output (KeyError 'alloc') (~4-5 min x 2).
  (7) `scd112ProductionCompare.ts` / `off108Classes.py` / `olnd113Verify.py` hard-code their fixture dirs / case lists (~3-4 min x 3);
  the off108 class matcher keys on the Scene OFF attack receipt, so Scene ON holds without one show as unchecked (~3 min).
  (8) `stat101ExposureSummary.py` reads only `shard-*.jsonl` and divides by zero otherwise (~2 min); `spriteOrderProductionPlans.ts`
  is generated and byte-pinned, so even a comment edit fails a test (~2 min). (9) `npx vitest` on targeted files OOMs without the npm
  script's NODE_OPTIONS=--max-old-space-size=8192 (~1 min); `npm run typecheck | tail` hides the exit code (~2 min). (10) The soak's
  RandomPlayer drew press cooldowns from its decision stream, so every presentation-length change re-rolled soak games and broke pins
  (FIXED 2026-10-11 by soak111: separate press stream). (11) The stat102 doc puts the message box on a message command's second frame
  while sc106 / off108 put the first glyph on its first frame — the one-frame disagreement hid a residual (~10 min, olnd113).
- **Hits:** 11 (2026-10-11 afternoon).

## Tooling gaps hit on 2026-10-10 (S10A day)

- **What / cost:** (1) one full `npm test` (~11 min) is longer than the Bash tool's 10-min foreground limit, so every production
  worker sharded it (`--shard=1/2`, `--shard=2/2`, ~1-2 min each); `tests/battlesceneSplitEligibility`'s parser rejects an inline
  generic constraint in a `battleScene.ts` top-level function and only the full suite shows it (~3 min). (2) `liveShareCensus.ts`
  numbers battles / streaks per seed RANGE, so range-split runs are a different battle set from one 0..999 run (deltas do not compare
  across splits: +43 vs +49 for the same fold); hist73 added `--index-from` only in a copy (`hist73LiveShareCensus.ts`), st76 / cf78
  patched scratch copies (~3 min x 4 + supervisor confusion). FIXED 2026-10-10 wind-down: `liveShareCensus.ts --index-from=N` (default output unchanged). (3) Banked temp patches
  (`*-temp-src.diff`, `fold-test-pins.diff`) rot as soon as another landing touches their lines, are `workspace/`-prefixed (apply from
  the repo root), and the prepNNRun.sh runners refuse a tree where the patch is already landed, so after a fold their steps run by hand
  (~5-10 min, land68 / fold71). (4) A banked receipt without the plan / words texts a fold's vector test needs (prep65) -> an
  extractor written at fold time (~8 min). (5) audit 18's checker: the missed-strike rule assumes complete turns and no priority
  (Magic Coat +4; a consumer moving before the strike) and misfires (~4-5 min x 2); `audit18Fixtures.py` hard-codes its scenario dir
  (~3 min); a Dive setup consumer lacked its splash context and looked like a production defect (~10 min). (6) Lab species are
  INTERNAL ids (Glalie 347, Castform 385) and nothing flags a national-dex id; EV totals > 510 and a gender on a genderless species
  fail with a bare "exit 1" (~4-6 min x 3). (7) `liveStatusImplementedCount` pins the inventory entry's field set, so one new field
  costs a full shard rerun (~6 min). (8) zsh: an unquoted `--include=*.test.ts` glob errors, `$VAR` file lists do not word-split, a
  no-match glob in `rm` aborts the chain (~1-3 min, several workers). (9) Raw probe JSON embeds the scenario path, so receipt hashes
  depend on the output dir (~3 min). (10) `prep61EventProbe.py` drops every frame before the last sprite reset, incl. the party menu
  (~3 min). (11) A `git archive` of `src` + `tools/integration` is not runnable without `tools/lib/` (~2 min). (12) The default 120-s
  Bash timeout silently backgrounds `npm run typecheck` / a census and leaves an empty log (~2 min x 3). (13) `git apply` of a
  `workspace/`-relative diff from inside `workspace/` silently skips every hunk (use `patch -p1`, ~3 min). (14) The audit 19 / 20 fixtures
  hard-code friendship 70 (Factory sends 0), hiding Return's branch (~8 min); `liveShareCensusGates.ts` finds production lines by exact
  text, so rewording a gate crashes the census at load (~3 min). (15) A census stall battle (seed 881) is cut at a fixed frame cap, so any
  presentation-length change moves its digest; proving it harmless took ~10 min. (16) Supervisor: a zsh `$N` command variable in my own
  final-gates script did not word-split, so all four censuses failed to launch (rerun by hand, ~3 min).
- **Hits:** 16 (2026-10-10 day).

## Census / probe tooling gaps hit on 2026-10-09 (S10A day)

- **What / cost:** (1) `liveShareCensusGates.ts` checks the RAW order-lend input, so a words-deferred lend that fails to resolve
  is labelled "unclassified (case-local gate)" — it misled the supervisor's triage of a whole step (gates53 found 93 % of that
  bucket is order-host; ~10 min + a mis-aimed brief). Fix: resolve the lend first, as `gates53GateCensus.ts`'s `deferredSubReason`
  does. (2) The census `battleDigest` includes the presented-frame total and `commandDigest` includes live flags + gate file:line
  cites, so any corrected duration or line shift breaks "identical digest" and needs field-by-field diffing (~4 min each time);
  compare the command key sequence (battle, kind, moveId, side, attacker, target) instead. (3) Probe stagings without an explicit
  "seed" op replayed different trajectories across batches (ISSUES #154; ~25 min supervisor time). (4) Probe receipts that embed
  the scenario PATH change with the output dir (prep52 regenerated once, ~3 min). (5) `d4aRegressionAll.sh` over 286 fixtures takes
  ~11 min, past the 10-min foreground limit (~2 min). (6) Probe rows carry no battle state (HP, substitute HP, script cursor), so a
  staging that never reaches its unit cannot be diagnosed (plans51 SUBSTITUTE_FADE, ~10 min). (7) The strict-tsc recipe for
  `tools/` in docs/live-share-census.md needs `typeRoots` + `types: ["node"]` in the temp tsconfig (~3 min).
  (8) `prep43CensusDelta.py` puts frame counts in its pairing key, so any adapter whose live body length differs from the fallback
  (Spark 115 vs 32, Blizzard 362 vs 361) reports "pairing mismatches" that must be attributed by hand (~4 min, 3 workers). (9)
  `words57Parity.ts` exits 1 on any battle without a Random2 consumer, so it cannot serve as a generic ON/OFF parity gate (~3-5 min, 3
  workers; spark62 made a copy). (10) `prep45OrderCensus.ts` carries a stale copy of `orderEventOf` (no TURN_TRAP / Fury Cutter keys),
  and `gates53GateCensus.ts` reads the replay allow-list by regex — both mislabel units production now handles (~4-15 min). (11)
  Battle-lab scenario names disagree with the species they stage ("camerupt" = BARBOACH 323, "wailmer" = NOSEPASS 320 — internal
  ids), and the lab rejects the default male lead for gender-locked species with no hint (~13 min). (12) multi-file `npx vitest run`
  can run out of heap — use `npm test -- <files>` (~2 min). (13) The audit-15 host replay (`postkoHostReplay.ts`) does not follow the
  alloc50 / alloc52 rules and has no geometry callback (audit 16 wrote a parallel replay, ~10 min). (14) Worker run scripts with
  `rm -f "$VAR"/...` inside `xargs sh -c` trip the supervisor's removal safety check, so the supervisor cannot rerun them unattended —
  write into fresh caller dirs instead of deleting.
- **Hits:** 14 (2026-10-09 day).

## Sprite-order / census tooling gaps hit on 2026-10-09 (S10A overnight)

- **What / cost:** (1) the 300-seed `liveShareCensus.ts` run takes ~110-120 s — exactly the Bash tool's default timeout, so
  runs get auto-backgrounded unless the call passes an explicit timeout (~1 min, several workers); (2) the host's order-event
  keys (TURN_TRAP by wrapped move, choosetwoturnanim turn keys) are re-implemented in `orderCrossBodyRouteScan.ts`,
  `spriteOrderCrossBodyCorpusReplay.ts` and `prep45OrderCensus.ts`, so every new key needs hand-syncing in three tools (~15 min);
  (3) `prep43Probe.py` species variants only work for scenarios that set full parties; swapping a Factory set id hits rental-range
  / repeated-held-item legality errors (~3 min); (4) the three allocator net-zero receipts use different schemas (prep44 rows
  marked `window-incomplete` carry no `netZero`), so the pin test needs per-receipt code (~10 min); (5)
  `generatedCommandAnimationReplay` records no semantic events with Scene OFF, so ON/OFF parity can compare rules / RNG /
  boundaries but not the event queue itself (~10 min).
  (6) two parallel workers both named their tools `prep48*` (an evidence step and the tail-plans step), so the second branch
  collided on `tools/integration/prep48Probe.py` — the supervisor renamed one to `plans48*` before merging (~10 min); brief every
  step with its OWN tool prefix; (7) the battle lab cannot set a starting status, so FRZ staging needed an Ice Beam seed sweep
  (~20 min); (8) `prep48DigFixtures.py` hard-coded the healthbox status to none (false 190 px/row residuals, ~5 min); (9) the full
  suite (~11 min on a loaded box) exceeds the Bash tool's 600 s foreground limit — workers must run it in the background and read
  the log (~2 min).
  (10) `replayPostKoTurnsThroughHost` takes no `bodyPlanAt` and has no pre-prompt battle-start segment, so chain fixtures decline
  after Giga / Mega Drain and cannot express battle-start seeds (audit 15 wrote a parallel replay, ~8 min); (11) staged
  species-audit / prep11 prep6-alt-base fixtures keep the 2344 frame window while their probe uses battle-lab frame numbers
  (~3 min); (12) multi-file vitest runs need an explicit Bash `timeout` (the 120 s default backgrounds them, ~2 min).
- **Hits:** 1 session, ~80 min across six workers.
- **Fix:** default census runs to a progress line + document `timeout: 300000`; export one order-event-key helper from
  `liveSpriteOrderHost.ts` and import it in the tools; one shared receipt reader for net-zero audits.

## Live-integration tooling gaps hit repeatedly on 2026-10-07 (S10A finish run)

- **What / cost:** (1) plain `npx tsc` / `npx vitest run` on ~20+ files runs out of the default 4 GB heap — use
  `npm run typecheck` / `npm test --` or `NODE_OPTIONS=--max-old-space-size=8192` (5 workers, ~1 min each);
  (2) `r3ProfileRouteSearch.ts` cannot see Random2 bodies (no presentation host) and does not allow the self-KO stall
  (~3 min x2); (3) `prep22Probe.py` stops before long bodies (Eruption) finish (~2 min); (4) `issue151Patch.sh`
  writes receipts to `$OUT/<fixture stem>`, so a patched run and an env-off control overwrite each other (~3 min);
  (5) accepted scenario names lie about species (Psywave "spoink/chimecho" play LUVDISC / SWABLU; Eruption
  "camerupt" stages BARBOACH; battle-lab `species` uses internal ids, CHIMECHO = 411) (~2-4 min x3); (6) tools that
  export helpers also run their CLI main when imported through vite-node (`argv[1]` guard) (~2-3 min x2); (7) the
  live view redraws controller healthboxes after every move branch, so each sprite-targeting blend needs a per-move
  fade (Encore, Flatter) (~6 min); (8) the safety layer refuses inline `xargs sh -c '...'` — use wrapper scripts.
- **Hits:** 1 session, ~40 min total across workers.
- **Fix:** default the heap in the npm scripts; give the route searchers a presentation host + stall budget; fixture
  generators read species from the probe state, not the scenario name; a shared blend-register healthbox rule.

## A worker's `pkill -f mgba` kills BOTH shared oracle services

- **What:** the oracle services' command lines contain the mGBA venv path, so an integration
  worker cleaning up its own dense probes with `pkill -f mgba` (2026-10-06 R3) took down 8012 AND
  8014; the next side launch refused ("required battle-scene-off oracle is unavailable") and the
  supervisor restarted both with `pokebench_ensure_oracle_profile` (~10 min).
- **Hits:** 2 (plus the 2026-08-25 `randomRoundSoak` entry below — same pattern-kill class). 2026-10-13: the rcp143 side worker
  ran `pkill -f "vitest"` to stop its own suite and killed the ts-lane ret165 worker's shard-2 run (~6 min lost); every brief
  since carries a "never kill by pattern" HOUSE RULES line.
- **Fix:** briefs say "never pattern-kill; kill only PIDs you started"; a probe wrapper that
  records its own PIDs would make cleanup safe.

## Evidence run scripts reuse fixed /tmp dirs; `run-mgba-probe.py` refuses to overwrite -> silently stale reruns

- **What:** several prepNN / lbNN run scripts default their probe dirs to `/tmp/pNN` and the probe wrapper refuses to
  overwrite an existing output, so a rerun into a populated dir keeps the OLD probes without an error (prep22 worker
  ~10 min; the supervisor's first prep27 reproduction reused the worker's probes and had to be redone). Some run
  scripts also exit non-zero after every probe completed (`set -e` + an xargs / segfault status: lb26Run, prep29Run).
- **Hits:** 4 (2026-10-06/07).
- **Fix:** every run script takes its OUT/R1/R2 dirs as required arguments and refuses an existing dir; treat the
  probe segfault-at-exit as success only when the output JSON parses (as `run-mgba-probe.py` already does).

## Live verifier passes only the attacker's personality — a shiny TARGET never reaches the decline gate

- **What:** `tools/integration/liveAdapterFramebuffer.ts` supplies `attackerPersonality` only, so target-side shiny
  declines cannot be tested without `species-audit-5/patches/harness-target-personality.diff` (audits 6 and 8, ~8 min
  each).
- **Hits:** 3.
- **Fix:** read `targetPersonality` from fixtures in the verifier.

## Live adapter counts pinned by number in several test files

- **What:** `implementedCount` is pinned in `tests/liveStatusImplementedCount.test.ts`,
  `tests/animation/factoryAnimationInventory.test.ts` and per-batch files (`livePrep11MoveAdapters.test.ts` pinned 226),
  so every batch edits several pins and a missed one only fails in the full suite (Baton / Endeavor worker ~8 min,
  fix150 worker ~5 min).
- **Hits:** 2.
- **Fix:** one shared constant read from `docs/animation-integration-live-status.json`.

## Committed `.diff` receipts trip `git diff --check`

- **What:** blank context lines in stored patch files look like trailing whitespace; each fixture dir that stores a
  patch needs its own `.gitattributes` (`*.diff -whitespace`) (prep28, #151 diagnosis; audit 6's patch merged with a
  flagged line).
- **Hits:** 3.
- **Fix:** one `.gitattributes` at `tools/integration/fixtures/` with `*.diff -whitespace`.

## vite-node CLIs: `import.meta.url === argv[1]` main checks silently no-op

- **What:** under `npx vite-node tool.ts -- args` the usual main-module
  check is false, so `tools/integration/liveAdapterFramebuffer.ts`'s CLI
  exits 0 with no output; new tools have to be split into a library plus a
  `...Run.ts` entry (or call the exported function from a wrapper).
- **Hits:** 7 (2026-10-05 post-KO tracker worker ~3 min; post-KO audit
  worker ~4 min; post-KO lend worker ~2 min; prep11 worker ~10 min; prep10
  batch used a shell wrapper; 2026-10-07 oam1 ~2 min, prep24 ~5 min).
- **Fix:** run CLIs with `node --experimental-strip-types`, or make the
  check vite-node-aware (compare resolved file paths, not URLs).

## Worktree and main checkout paths both end in `/workspace`

- **What:** a side worker's `cd .../workspace` landed in the MAIN checkout instead of
  `.worktrees/<id>/workspace`; its first commit went onto `master` (it moved the commit to
  its branch and restored `master` with `update-ref`; the supervisor confirmed the tree).
- **Hits:** 1 (2026-10-05 species audit 2, ~5 min + supervisor check).
- **Fix:** briefs tell side workers to check `git rev-parse --show-toplevel` contains
  `.worktrees/` before every commit; the launcher could export `WORKTREE_ROOT`.

## BattleLab scenario species ids are national-dex for some Hoenn species

- **What:** several `tools/battle-lab/mechanic-*.json` files name a species
  in the file name but store a national-dex id where the ROM wants the
  internal id (the "camerupt" Magnitude files are BARBOACH vs NINCADA; 356
  is MEDITITE, not DUSCLOPS). A probe then reports a false species
  discrepancy. Scene-OFF lab files are also rejected by the Scene-ON
  harness (flip `profile` in memory).
- **Hits:** 1 (2026-10-05 prep10 worker, ~20 min).
- **Fix:** resolve names through `species.h` (`prep10Scenarios.py` does);
  add a validator that checks file-name species against the ids.

## `speciesFrontIdleRestOffsetOrZero` silently returns {0,0} for a wrong key

- **What:** the table is keyed WITHOUT the `SPECIES_` prefix; a prefixed
  key returns `{x2:0,y2:0}` with no error, which looks like a real idle
  offset of zero.
- **Hits:** 1 (2026-10-05 prep11 worker, ~15 min).
- **Fix:** accept both forms or throw on an unknown species.

## Probe output details that cost time (2026-10-05)

- Sprite `attr` read at the spawn frame is not final (palette/tile set
  after `CreateSprite`); read a frame later (prep11, ~10 min).
- Fly/Bounce lab files override only moves; genderless carriers reject
  gendered replacements (prep11, ~10 min).
- BattleLab `validate_request` rejects unknown top-level fields such as
  `description` (Random2, ~1 min); the libmgba savestate blob is not
  byte-stable across identical runs, so state hashes need a RAM-only
  digest (Random2, ~3 min).
- `run-battle-lab-rgb.py` lab traces stop at fixed frames: a third
  Rock Blast hit needed a longer-trace copy (prep10 batch, ~8 min).
- Line-number pins (`tools/report/ability-item-parity-census.ts`) and the
  rules-context field-list test break on any `damageCalc.ts` / context
  change until edited by hand (prep10 batch, ~3 min).
- Dense runs leave large RGB scratch: a failing run keeps ~0.5 GB in
  `$TMPDIR`; the prep10 batch left 23 GB under the worktree's
  `.integration/validation` (supervisor copied 5 MB of summaries).

## Sprite-order lab probes mask bit 0 of every symbol address

- **What:** `tools/integration/spriteOrderUncoveredLabProbe.py` (and its
  sibling probes) clear bit 0 of every `nm` address, so the
  `gAnimScriptActive` column (bool8 at odd 0x020383fd) actually reads
  `sAnimFramesToWait` (0x020383fc). Activation flags there come from the
  script-pointer jump, so results stand, but the column is mislabelled.
  `postkoStateProbe.py` keeps bit 0 for data symbols.
- **Hits:** 1 (2026-10-05 post-KO audit worker, ~5 min).
- **Fix:** mask bit 0 only for Thumb code symbols.

## BattleLab Scene ON: faint / send-out messages wait for A presses

- **What:** Scene ON BattleLab scenarios that KO a mon need two extra A
  presses before turn 2 (the faint and send-out messages are
  button-gated); a script without them stalls at the message.
- **Hits:** 1 (2026-10-05 post-KO audit worker, ~3 min).
- **Fix:** document in tools/battle-lab/README.md (continuous low-duty A
  spam self-times, as for the post-KO switch-in papercut).

## `issue142ShadowRowScan.ts` cannot see a MISSING shadow-row id

- **What:** the scan compares rows only for ids already in
  `LIVE_MOVE_OPPONENT_SHADOW_ROW`; a new live id whose window starts at
  activation but was never added to the map passes the scan with 0
  mismatches. Only `tests/liveShadowRows.test.ts` (via the extra-rows
  fixture) fails on it.
- **Hits:** 1 (2026-10-04 next5 worker: Teeter Dance and Soft-Boiled rows
  were added only after the vitest failure, ~3 min).
- **Fix:** have the scan also iterate `LIVE_MOVE_ANIMATION_IDS` and flag any
  id whose fixture rows say offset >= 0 but has no map entry.

## `statusBatchSupersonicProbe.py` fails on the known mGBA teardown crash

- **What:** the wrapper runs `tools/compare/supersonicProbe.py` with
  `subprocess.run(check=True)`, so the documented post-output teardown
  SIGSEGV aborts the fixture (`status-batch-supersonic-*` cannot be rerun).
- **Hits:** 1 (2026-10-04, #142 regression; ~5 min worker + supervisor).
- **Fix:** route the inner probe through `tools/run-mgba-probe.py`, which
  accepts the teardown crash when the output parses.

## `npm run build` in the main tree wipes the live preview's `dist/build.json`

- **What:** the local preview (`start-local-preview.sh`, port 5191) serves
  `dist/` directly; any main-tree `npm run build` (e.g. a supervisor full
  gate) replaces it without the manifest, so `/build.json` 404s and the
  browser check cannot match a revision until the preview is restarted.
- **Hits:** 1 (2026-10-04, ~5 min).
- **Fix:** have the preview serve a copied build directory, or have the
  build step write `build.json`.

## Obsolete compare traces still sit in `tools/compare/traces/` with no marker

- **What:** `loss-terminal-decline-continuation-off.json` matches 50/155 on
  every tree since the 2026-08-14 continuous-play wiring, and PROGRESS 1313
  (2026-08-17) recorded its 155/155 bar as OBSOLETE on purpose — but nothing
  in the trace file or `tools/compare/` says so. The 2026-08-22 #117 worker
  rediscovered it as "pre-existing ~96% mismatch, worth a supervisor look",
  and the supervisor spent ~10 min bisecting it across the #104 commits
  (50/155 at every one) before finding entry 1313 in the archive.
- **Hits:** 1 (2026-08-22, ~10 min supervisor + worker time).
- **Fix:** either delete the trace (git keeps it) or give `tools/compare/`
  a `traces/OBSOLETE.md` list the runner prints a one-line notice from;
  the `appRoute: "canonical-recorded"` variant is the live way to exercise
  the decline farewell (see the #104 PAPERCUTS entry above).

## `generated-orchestrator` compare traces re-chain the instant the record prompt is answered

- **What:** since the 2026-08-14 continuous-play wiring, the default
  `generated-orchestrator` appRoute re-chains into the next round as soon as
  `recordChoice` is non-null (all three answers), so a compare trace that
  wants the terminal farewell UI after the prompt sees the draft screen
  instead. The #104 worker had to switch its trace to
  `appRoute: "canonical-recorded"` to exercise the farewell at all.
- **Hits:** 1 (2026-08-22, ~10 min).
- **Fix:** document the route choice next to the terminal traces (or give
  the generated route a "hold at terminal" option for compare runs).

## Terminal-window probes must be derived with `bin/oracle lab`, not `bin/oracle run`

- **What:** the terminal-seam traces are battle-lab scenarios; re-deriving a
  YES-path probe from the NO-path one via `bin/oracle run` silently produces
  the wrong frame model, and the mismatch only shows up as a non-matching
  window. `bin/oracle lab tools/battle-lab/<probe>.json` is the right tool.
- **Hits:** 1 (2026-08-22 #104 worker, "cost real time").
- **Fix:** a one-line note in tools/compare/README (or the trace's own
  header comment) naming the lab command.

## `tests/gate6CoverageManifest.test.ts` OOM-crashes under bare `npx vitest`

- **What:** the manifest test needs `npm test`'s `--max-old-space-size=8192`;
  a targeted `npx vitest run tests/gate6CoverageManifest.test.ts` dies with a
  heap OOM, so a worker that adds a Tier-1 test cannot cheaply re-check the
  auto-discovered manifest and only learns of the content mismatch after a
  ~3 min full run (then regenerates `docs/gate6-coverage-manifest.{json,md}`).
- **Hits:** 1 (2026-08-22 side worker, ~8 min).
- **Fix:** give the targeted invocation the heap (`NODE_OPTIONS` in the test
  file's own setup or an `npm run test:manifest` script), and say in AGENTS.md
  that adding a Tier-1 test means regenerating the manifest.

## `check-oracle-freshness.sh` compares against harness HEAD, not the last `oracle/` commit

- **What:** the script FAILs (exit 1) whenever an oracle process started before
  the current harness HEAD commit — regardless of whether that commit touched
  `oracle/` at all. At 2026-08-08 orient both services failed the check against
  harness HEAD `2328682`, a `_template`-only commit; `git log --since` showed
  **zero** commits touching `oracle/` since either process started, so both were
  serving byte-identical code. The check is a commit-date heuristic wearing the
  clothes of a schema check.
- **Hits:** 9 (2026-08-24 supervisor orient: both ports FAILed again against a docs-only HEAD; the last `oracle/` commit is 2026-08-15 09:51 and 8014 was restarted at 09:45 in that same top-layer session, 8012 on 08-17 — judged client-only in ~3 min, NOT restarted because the Codex animation supervisor was live on the shared services.) (2026-08-22 supervisor orient: same shape again, both ports; judged client-only in ~3 min and NOT restarted because the animation and rust supervisors were live on the shared services.) (2026-08-19 supervisor orient: both ports FAILed again — same
  09:45:59-vs-09:51:59 shape for 8014, zero `oracle/` commits since the 8012
  start; disproved in ~3 min via the commit-date check plus three sessions of
  walk-up staging evidence on the running 8014, kept both, no restart.)
  (2026-08-18 supervisor session 3 orient: both ports FAILed
  again — same 09:45:59-vs-09:51:59 services-newer-than-their-own-commit
  shape as 2026-08-16; disproved in ~3 min via the commit-date check, kept
  both services, no restart.)
  (2026-08-18 supervisor session 2 orient: both ports FAILed
  again; every commit since both service starts touched only `workspace/`
  paths, zero `oracle/` commits — disproved in ~3 min via
  `git log --name-only --since`, kept both services, no restart.)
  (2026-08-18 orient: both ports FAILed; only non-workspace
  commit since the 8014 start was `4dac4a35`, whose own message says it was
  verified against these restarted services — kept, no restart, ~4 min.)
  (2026-08-16: FAILed because services started 09:45:59 on the
  new working tree, 6 min before the commit was recorded at 09:51:59 — the
  services were NEWER than their own code's commit date; hit again at the
  2026-08-16 afternoon orient against the same 09:45:59 processes,
  disproved in ~3 min via the `/v1/info` `factoryBrainWalkup` capability
  probe).
- **Cost each:** ~5 min to disprove, plus a genuine near-miss: the documented
  response is "restart it before staging anything", and restarting port 8012
  would have killed the animation lane's live worker mid-round.
- **Workaround:** before believing a FAIL, run
  `git -C ../.. log --oneline --since=<process start date> -- oracle/`. Empty
  output means the process is current and the failure is spurious. Since
  4dac4a35 there is also a positive probe: `/v1/info`'s
  `capabilities.battleLab` block (e.g. `factoryBrainWalkup: true`) proves
  which schema the live process serves.
- **Real fix:** compare the process start time against the last commit that
  touched `oracle/`, not against harness HEAD.

## Side-worktree Claude workers: Edit/Write tool calls can land in the MAIN tree via absolute paths — the worker perceives it as "my edits silently don't reach disk"

- **What:** a side-lane Claude worker whose Edit/Write tool calls use (or
  resolve to) absolute paths under the main tree writes THERE, not in its
  worktree. From inside the worktree the symptom is gaslighting: the tool
  reports success and a follow-up Read shows the change (same absolute
  path), but `git diff`/`grep` in the worktree show nothing. The worker
  concludes "Edit/Write silently fails" and routes around it with shell
  writes; meanwhile the main tree accumulates stray uncommitted duplicates
  of its early drafts.
- **Hits:** 6 (2026-08-23 01:49: an ANIMATION-lane worker's one-line edit to
  `tests/animation/glareEvidence.test.ts` (its in-progress Belly Drum
  partial) landed in the MAIN tree while the main supervisor was at
  wind-down; patch saved to the supervisor's scratchpad and the line
  reverted so the main tree stayed clean — cross-lane, not just side→main).
  (2026-08-22: the #120 side worker's first Edit calls landed in
  the main tree's `tests/factoryRoundBattleOrchestrator.test.ts` — the live
  main-lane worker saw the file "flap" modified/clean twice; self-healed,
  but the side brief had omitted the standing clause below — supervisor
  brief error). **2026-08-20 (ESCALATED): a side worker `cd`'d to the main
  tree's absolute `.../workspace` path, COMMITTED its test file to master
  (`ffc839db`), noticed via `git branch --show-current`, then ran
  `git reset --hard 2e656f84` IN THE MAIN TREE while a main-lane worker was
  live** — harmless only because that worker had no tracked edits yet (its
  untracked sweep log survived). Both trees end in `workspace/`, which is
  why the absolute-path slip keeps recurring. Every side brief now carries:
  "your tree is ONLY `<worktree path>`; never run git with the main tree's
  absolute path; never `git reset --hard`/`checkout --`/`clean` in ANY tree
  — if you committed to the wrong branch, STOP and report the hash; the
  supervisor moves it." Real fix candidates: name worktrees so the leaf dir
  is not `workspace`, and/or a pre-commit hook in side worktrees refusing
  commits whose `git rev-parse --show-toplevel` is not the worker's own.
  Earlier: (2026-08-19, scanner-H3 side worker — its first three Edit
  calls landed in the main tree; the stray was byte-identical to the
  branch's committed version (`git diff worker/<id> -- <file>` empty), so
  `git checkout --` was safe; the worker lost ~5 min and again reported it
  as "Edit silently doesn't persist".)
  (2026-08-16 morning, S3 gold-doc worker — caught by
  `git status` before merge, PROGRESS 1288 notes; 2026-08-16 afternoon,
  B1c worker — two stray files in the main tree, diagnosed via diff
  against the branch's committed versions as superseded early drafts and
  discarded; the worker itself lost ~10 min and misdiagnosed it as a
  broken Edit tool).
- **Cost each:** ~10 min worker time + supervisor forensics at merge.
- **Workaround (supervisor):** `git status` the MAIN tree whenever a side
  worker was live; diff any stray against the side branch's committed
  version before discarding. (Both hits so far: strays were early drafts,
  committed branch superseded them, `git checkout --` was safe.)
- **Real fix:** launcher/brief-level — pin the worker's cwd-relative
  discipline (e.g. a pre-commit guard in the worktree that fails on a
  clean `git status` after claimed edits, or an Edit-tool path guard
  refusing paths outside the worktree root).

## Walk-up lab staging: multichoice/YES-NO boxes silently swallow inputs sent before their typewriter settles

- **What:** in `factoryBrain` + `walkup: true` traces, a D-pad/A input sent
  while the preceding message box is still typing (or settling) is silently
  dropped, not queued — a DOWN aimed at the swap YES/NO prompt instead did
  nothing, and the trace fell through to the accidental swap-mon screen.
  Neither `../oracle/BATTLE_LAB.md` nor the walkup smoke test's comments call
  this out (the smoke test's own trace happens to idle long enough to avoid
  it, without saying why).
- **Hits:** 1 (2026-08-16, side worker banking the swap-ask window).
- **Cost each:** ~10 min of trial-and-error via a wrong-branch trace.
- **Workaround:** pad generous idle frames before any menu/prompt answer in
  walkup traces; verify the landed branch by content sha, not by input count.
- **Real fix:** one sentence in `BATTLE_LAB.md`'s walk-up section (top-layer
  edit — goes through Kyle).

## `tools/report/*.ts` census scripts write their generated doc with no read-only mode

- **What:** running a census script to *read* a number also rewrites its
  generated doc under `docs/`. On 2026-08-08 the supervisor ran
  `executable-frontier-census.ts` for a coverage figure while a main-lane worker
  was mid-step, dirtying that worker's tree with a one-line "Generated <date>"
  diff. Caught and reverted within a minute, but the same slip in the other
  direction has already cost this run once (a supervisor `git add -A` swept a
  worker's in-progress file into a supervisor commit).
- **Hits:** 1.
- **Cost each:** ~2 min plus the risk of corrupting a live worker's commit.
- **Workaround:** run report tools only in the gap between rounds, or with
  `--out-dir` pointed at a scratch directory (`ability-item-parity-census.ts`
  already supports that flag; the others do not).
- **Real fix:** give every `tools/report/` script a `--check` / `--dry-run` mode
  that prints the summary and writes nothing, and default the supervisor's
  informational use to it.

## Orphaned probe/compare node processes survive their session and burn CPU for days

- **What:** at 2026-08-07 orient the host carried **three** orphaned
  `node --experimental-strip-types tools/compare/probeEvolutionBasic.ts`
  processes, all `PPID 1`, started Tue Aug 4 19:46-19:49 and still alive
  **3 days later** at 43-81% CPU each. Load average was 12 on 16 cores before
  any worker launched, and the supervisor's own baseline `npm test` was
  running at roughly a fifth of its normal rate (150 of 768 files in 13 min).
  A probe tool that waits on the oracle, or that a killed session left
  mid-loop, is reparented to init and never reaped — nothing in the run
  sweeps for it.
- **Hits:** 1.
- **Cost each:** ~15 min of degraded suite/worker throughput before it was
  spotted, plus 3 days of background CPU tax on every session in between.
- **Workaround:** at orient, run
  `ps -Ao pid,ppid,etime,pcpu,command | grep -E "tools/(compare|probe)/" | grep -v grep`
  and kill anything with `PPID 1` whose `etime` exceeds the session cap.
  A real fix belongs in the launcher: sweep stale `PPID 1` node processes
  rooted at this run's tools/ directory the way `sweep-scratch` handles
  scratch dirs.

## Fresh side worktrees can start with a dangling `reference/` symlink

- **What:** a side-lane worker (2026-08-07, second-RECORD scout) found the
  worktree's `reference/` symlink dangling at session start and had to
  self-remedy with `../../initialize-run.sh --relink` before it could read
  the decomp. The launcher's worktree setup installs node_modules but does
  not guarantee the gitignored `reference/` link points anywhere valid.
  Fix shape: the worktree-setup step in `tools/run-subagent.sh` should
  create/refresh the `reference/` symlink the same way it handles deps.
- **Hits:** 1 (~2 min, worker self-fixed)

## Probe verify scripts write untracked scratch dirs into the tree → postflight exit-5 false alarms

- **What:** `tools/probe/verify-battle-message-pacing.ts` writes its
  transient replay outputs to `tools/probe/ground-truth/_verify-*/`
  (non-gitignored). Any worker that runs it per its brief then exits with
  those dirs untracked and trips the launcher's clean-tree postflight
  (exit 5 "left uncommitted changes") even though every rung landed —
  happened 2026-08-06 (pacing-bind MAIN worker; supervisor had also
  manually cleaned the same dirs from a scout worktree earlier the same
  night). Fix shape: verify scripts should write under `$TMPDIR` (the
  established TMPDIR-sandbox pattern) or the pattern needs a `.gitignore`
  entry.
- **Hits:** 2.

## `_template` lacks the DeepSeek/OpenCode worker route entirely

- **What:** the DeepSeek worker profile (OpenCode launch branch in
  `tools/run-subagent.sh`, `-s deepseek` routing, deadline clause,
  attribution enable) was built in this run and never mirrored —
  `_template/tools/run-subagent.sh` has zero `deepseek` references
  (~561-line drift as of 2026-08-05). Only the generic attribution files
  (`codex-git-attribution.sh`, `git-hooks/prepare-commit-msg`,
  `test-codex-git-attribution.sh`) are mirrored, so a run initialized fresh
  today has no DeepSeek workers and the launcher-side deadline/attribution
  branches have nothing to attach to there. Mirroring the route is a
  deliberate follow-up port, not a copy-paste of the diverged launcher.
- **Hits:** 1.

## Pinned line-number citations in report generators break on unrelated insertions

- **What:** `tools/report/ability-item-parity-census.ts` pins an exact
  line-number citation into its generated doc
  (`battleScriptActionAdmission.ts:2764`); any insertion above that line in
  the cited file shifts it and fails `abilityItemParityCensus.test.ts` — a
  test file nowhere near the edited code, so the cause is easy to miss.
  Regenerating the census costs ~5 min once diagnosed. Flagged by the
  2026-08-04 selection-rejection worker (~5 min lost). Candidate fix:
  cite a symbol/anchor (function name) instead of a raw line number, or
  auto-derive the line in the generator.
- **Hits:** 3. 2026-08-20 ×2: the #101/#103 worker hit it (5 pinned
  `factoryAiCheckViability.ts:NNNN` sites, "opaque throw", ~5 min), then the
  SUPERVISOR's own comment-only follow-up commit (`95064eb7`, +5 lines in the
  same file) shifted the freshly re-pinned five again and left master's
  smoke at 443/444 for ~25 min until the next worker flagged it (re-pinned in
  `2e656f84`). Rule now: ANY edit to a file named in
  `EXPECTED_RECOVERED_STRING_SITES` — comments included — runs
  `tests/abilityItemParityCensus.test.ts` before commit.

## Full `npm test` exceeds the Bash tool's default 120 s timeout

- **What:** the full suite exceeds the Bash tool's default 120 s timeout, so a
  worker running the mandatory end-of-step `npm test` inside a default-timeout
  call gets auto-backgrounded mid-run and must re-establish a blocking wait
  (foreground poll loop) to honor the no-self-abort discipline. Flagged by
  the 2026-08-02 #66(b) side worker, ~2 min lost. Second hit same evening:
  the #67 worker's auto-backgrounded suite led it to pkill its own vitest
  workers before recovering with an explicit 600 s timeout (~4 min lost +
  a false "failed" notification).
- **Budget the right number (measured 2026-08-03 on an idle box, 677 files /
  6,662 tests): `npm test` solo is 4 min 8 s (248 s).** Earlier revisions of
  this entry said "~12 min" and PROGRESS 900 logged 13-14 min — **those are
  contention figures, not the suite's cost.** Both were measured with 3
  sibling lanes saturating the machine. One explicit 600 s Bash timeout
  covers a solo run with room to spare; only a known-contended run needs
  polling. Don't reach for a workaround (backgrounding, pkill, chunking) on
  the assumption the suite cannot fit — twice now that assumption, not the
  runtime, was the thing that cost the session time.
- **Hits:** 13 (2026-08-02 late: slice-3 worker's ~8.5 min suite — cross-lane
  contention from concurrent side/animation runs — auto-backgrounded; worker
  recovered by pid-polling, ~5 min lost. 2026-08-03: terminal-seam scout,
  ~6 min of foreground-poll waiting. 2026-08-04 R3: two workers same round —
  the post-terminal scout waited ~10 min on a fully-buffered background
  capture that emitted zero bytes until completion, and the
  selection-verify worker's suite auto-backgrounded twice at ~10-11 min
  under 3-lane contention, recovered by log-polling each time. 2026-08-04:
  post-terminal slice-1 worker's successful run auto-backgrounded at 120 s,
  obscuring its exit and causing a redundant ~9 min foreground rerun.
  2026-08-05 R5: the side scout's first 10-min suite run was killed and its
  second stretched to ~9.4 min while the SUPERVISOR ran focused vitest
  verification in the main tree concurrently — supervisor-side lesson:
  even focused verification runs contend; batch them between rounds or
  after sibling suites, ~4 min lost. 2026-08-08: the LILIANA far-side side
  worker lost the first full-suite exit marker after the stream detached and
  reran the suite explicitly, ~14 min lost. 2026-08-08: the printfromtable
  worker lost two exit markers, leaving both suites alive, and started a third
  explicit-exit run; the supervisor killed only the two duplicates, ~8 min
  lost and heavy cross-lane contention. 2026-08-10: the #55 side worker's
  green full-suite summary was truncated, leading to redundant reporter and
  redirected-log passes; ~5 min lost. The 2026-08-10 Timer 0 source-audit
  worker also lost a yielded verification exit marker and reconciled it from
  processes/logs before completion; ~3 min lost. The 2026-08-11 Timer 0
  Direct Sound source-audit worker again lost the terminal marker and reran
  the green suite; ~1 min lost.)
- **2026-08-10:** the MPlay callback worker tried to append a longer
  `--testTimeout` to `npm test`, but the package script already supplies the
  option and Vitest rejects duplicate values. It recovered with a direct
  single-timeout invocation; ~1 min lost. The durable runner should expose a
  supported full-suite timeout instead of requiring CLI composition.
- **Possible durable fix:** teach the worker preamble (or the brief
  template) to pass an explicit long timeout for the final full-suite call
  (the tool accepts up to 10 min per call; the suite may soon exceed even
  that — a chunked runner or a launcher-provided `npm run test:full` with
  progress lines would be sturdier).

## Claude workers self-abort by backgrounding their own verification

- **What:** bounded claude-sonnet workers end their session by backgrounding
  a long acceptance command (or arming ScheduleWakeup/Monitor) and ending
  the turn "to wait for the notification" — a bounded worker's session ends
  with its turn, so the step dies uncommitted with the work complete on
  disk. Bit twice on 2026-08-02 (Silver Wind scout: 26 min, deliverables
  complete but uncommitted; species dossier: 17 min, same). Both salvaged
  by the supervisor (verify, then commit on the worker branch).
- **Hits:** 2.
- **Cost each:** ~10-15 min of supervisor salvage plus the worker's lost
  wind-down.
- **Durable fix landed 2026-08-02 (user-directed):** the EXECUTION
  DISCIPLINE clause is now part of `run-subagent.sh`'s standing worker
  preamble (both lanes, all providers), so briefs no longer restate it; the
  same change added `npm run test:smoke` (~25 s curated subset) so mid-step
  sanity checks stop tempting workers into backgrounding the ~7 min full
  suite. Prompt-level prevention, not a mechanical guarantee — delete this
  entry after a few clean worker rounds.
- **2026-08-03 note:** a side worker backgrounded its second mGBA probe run
  despite the preamble (harness task, heartbeats live). It had NOT died from
  it — the loss that followed was the supervisor's, see the spurious-
  notification entry below. Counting it as a near-hit, not a hit.

## Supervisor background-task "completed" notifications fire spuriously early

- **What:** the Claude supervisor's `run_in_background` Bash tasks emit
  completion notifications while the underlying process tree is still
  running. On 2026-08-03 three fired in one hour (an `npm test`, a worker
  launcher, a second `npm test`); acting on the launcher's one led the
  supervisor to remove a live worker's worktree mid-step (worker noticed,
  reported cleanly, session lost ~38 min/$8; its probe data was salvaged
  and the retry landed). The 2026-07-31 "notification-unreliability kill-0
  policy" already predicted this class.
- **Hits:** 3 (one with real cost), all 2026-08-03.
- **Cost each:** the bad one ~40 worker-min + ~20 supervisor-min; the others
  ~5 min of confusion.
- **Workaround (adopted):** treat notifications as hints. Before acting:
  `kill -0` the retained PID (launcher/process), and require the task output
  file to contain the command's terminal marker (echoed exit-code line,
  launcher digest footer). Spurious notifications arrive with empty or
  setup-only output files; real ones carry the tail.

## Matched app/oracle fixture-pair authoring for a new species scenario has no tooling shortcut

- **What:** staging an oracle-comparable capture trace for an arbitrary
  `mechanicLab` scenario (new species lead, specific set) requires
  hand-matching the app-side `appStage` (species/nature/IVs/EVs/moves/item
  re-derived to pair byte-exactly with the oracle override). The #71 retry
  worker abandoned oracle-pixel acceptance after ~15 min of this and fell
  back to an existing fixture.
- **Hits:** 1.
- **Cost each:** ~25 min (authoring attempt + fallback).
- **Possible durable fix:** a small generator that emits the paired
  appStage + scenario JSON from one set-id/species spec (the worker reports
  it already computed the exact `createFactoryCorpusPartyMember` output
  needed — see its final message in the 2026-08-03 side-lane log).

## battle-lab fixtures are not directly consumable by the compare CLI

- **What:** `npm run compare` takes a compare trace (appRoute/appStage/
  segments/captureFrames), not a `tools/battle-lab/` mechanicLab fixture —
  replaying a banked fixture against the app means hand-deriving a wrapper
  trace (copy segments verbatim, pick the appStage, re-list captures). Three
  separate actors did this conversion for the SAME dense-a fixture on
  2026-08-05: the PROGRESS 955 worker, the side ball-fade worker (flagged
  it, ~5 min), and the supervisor (whose first hand-written wrapper had two
  JSON/path bugs before running).
- **Hits:** 3 (one fixture, one day).
- **Cost each:** ~5 min + error-retry noise.
- **Possible durable fix:** let `npm run compare` accept a battle-lab
  fixture path plus `--app-stage <id>` and synthesize the wrapper in memory
  (segments verbatim, captures from `--capture-range`).

## Oracle single-frame diffs appear non-deterministic under concurrent multi-lane load

- **What:** the #71 retry worker saw repeated runs of the same compare
  (same source, same trace) disagree on one frame while three lanes were
  hammering the shared machine. Unconfirmed whether this is the oracle
  service, capture timing under load, or a test-side race; the 2026-08-01
  per-run compare-dir fix removed the known `out/latest` race, so this
  would be a new mechanism.
- **Hits:** 1.
- **Cost each:** ~10 min chasing a false signal.
- **Workaround:** rerun pixel-acceptance compares on an idle oracle before
  believing a single-frame diff; don't run compare acceptance while 3+
  suites/lanes are saturating the machine.

## Raw before/after RNG-window diffs pick up unrelated-subsystem draws

- **What:** ground-truth scouts that pin an RNG draw count from a raw
  window total keep re-discovering that the window bundles decision-
  independent draws from other subsystems (Factory-AI scoring for any
  AI-side turn, trailing next-turn decisions, `BattleTurnPassed`'s
  `gRandomTurnNumber`). Bit entry 455 (2-roll gap, needed a dedicated
  attribution probe), entry 464's Endeavor fail branch (uncleanly isolable
  live, fell back to source read), and side scout 2026-07-26's HighCrit
  fixture (23-vs-24 cross-seed wobble from a phantom next-turn decision).
- **Hits:** 3.
- **Cost each:** ~10-20 min.
- **Workaround:** isolate RNG claims to player-side actions, diff against a
  same-AI-role control run, or attribute per-caller with
  `tools/probe/attribute-factory-ai-random-callers.py`; treat raw window
  totals as unattributed until proven otherwise.

Per entry:
- **What:** the friction.
- **Hits:** how many sessions it has bitten.
- **Cost each:** rough minutes lost per hit.
- **Workaround:** the current dodge, if any.

## Codex worker waits forever after its bounded turn

- **What:** after the #61 worker's last completed tool event and committed
  evidence checkpoint, `codex exec` printed `Reading additional input from
  stdin...` even though the launcher's managed session already had closed
  stdin. The event log stopped advancing and the process stayed idle until
  the supervisor terminated only the Codex child; postflight then
  misleadingly labeled exit 241 as an authentication failure.
- **Hits:** 2. The 2026-08-08 printfromtable worker hit the same post-completion
  wedge after its final full-suite exit `0`; stderr repeatedly reported
  `failed to renew cache TTL: missing field base_instructions` until the
  supervisor interrupted the otherwise-complete session.
- **Cost each:** ~10 min.
- **Workaround:** confirm the JSONL mtime, clean tree, and committed checkpoint
  before terminating the wedged child. (Postflight now names cap/signal exits
  distinctly instead of mislabeling them as authentication failures,
  2026-08-01.)
- **Not the cure:** an earlier revision of this entry proposed "the launcher
  should explicitly close Codex stdin" — `run-subagent.sh` has invoked
  `codex exec ... </dev/null` since `1ef2c4ce` (2026-07-21), well before this
  wedge. Stdin is already closed; the `Reading additional input from stdin...`
  line is the symptom, not the cause. Don't spend a session re-plumbing it.

## Shell command substitution mutates inline worker briefs

- **What:** Markdown backticks embedded in a double-quoted
  `run-subagent.sh` brief were evaluated by the shell as commands, stripping
  two source paths before launch and requiring an immediate clean relaunch.
- **Hits:** 2.
- **Cost each:** ~1 min.
- **Workaround:** use plain path text or a `--brief-file`; never place
  backticks or `$()` inside a shell-interpolated brief argument.

## Concurrent shared-tree edits fail otherwise-clean worker postflight

- **What:** unrelated S10 edits appeared in the main worktree while a bounded
  S9 worker was running, so the launcher returned exit 5 despite every
  worker-owned file being committed and clean.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** audit the worker commits by path, preserve unrelated changes
  untouched, and use a disjoint worktree lane when concurrent ownership is
  known before launch.

## Post-tick staging can exercise the pre-mutation controller branch

- **What:** the duplicate-species verifier changed the staged enemy identity
  after the canonical A tick had already entered the normal accept branch, so
  its initial 52-frame comparison never exercised duplicate rejection.
- **Hits:** 1.
- **Cost each:** ~8 min.
- **Workaround:** when a fixture mutates branch-driving state, reconstruct the
  source's settled input callback before replaying the accepted edge, and
  assert the expected controller phase at the staging boundary.

## Staged trace generator can request frames beyond its own trace

- **What:** the SUMMARY-return generator emitted capture frames after the
  generated segment stream ended, so the first dense oracle invocation failed
  before comparison.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** derive the final trace length from `segments` and clamp or
  regenerate `captureFrames` before invoking the oracle.

## Terminal staged compare omitted the accepted endpoint frame

- **What:** the seventh-win continuation probe stopped its raw-RGB capture at
  +4423 while the fixture requested +4424, then the comparator reran the
  expensive mGBA probe during each renderer iteration.
- **Hits:** 1.
- **Cost each:** ~3 min.
- **Workaround:** include the accepted endpoint in the staged capture range
  and reuse one fresh probe artifact while iterating on app-side rendering.

## Foreground oracle restart floods the execution transcript

- **What:** starting `run-oracle.sh` directly in a retained PTY streams
  hundreds of kilobytes of routine mGBA diagnostics both at bootstrap and
  teardown, obscuring the service-ready and shutdown signals.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** launch the retained foreground service with stdout/stderr
  redirected to a named `/tmp` log, then poll `/v1/info` for readiness and
  retain only the process handle for shutdown.

## Summary extractor rewrites an unrelated preview asset

- **What:** regenerating summary front-animation data also rewrote an
  unrelated preview-palette artifact, which had to be identified and restored
  before the extraction commit could remain file-disjoint.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** inspect extractor output paths with `git status`, and restore
  unrelated generated previews before committing the intended data artifact.

## Dense multi-session mGBA probes destabilize long worker processes

- **What:** running the full terminal boundary-control matrix inside one
  long-lived process repeatedly hit teardown/resource instability before
  emitting valid JSON.
- **Hits:** 3.
- **Cost each:** ~4.5 min average.
- **Workaround:** split each outcome/control into a fresh
  `run-mgba-probe.py` wrapper invocation and merge only the concise evidence.
- **2026-08-08 note:** the three-case construction-clock probe still needed
  the wrapper to contain teardown SIGSEGV/log spew; the fresh-output validation
  worked, but added ~1 min.
- **2026-08-11 note:** two mixer-provenance hook attempts exited 139 before
  producing JSON; narrowing the hook then yielded two byte-identical valid
  receipts per needed case. Cost: ~2 min.

## Shell-interpolated worker briefs execute Markdown backticks

- **What:** a direct `run-subagent.sh` launch used a double-quoted brief that
  contained Markdown backticks. zsh executed the two enclosed identifier names
  as command substitutions before the launcher saw the brief, so the worker
  had to be stopped immediately and relaunched with a single-quoted argument.
- **Hits:** 1.
- **Cost each:** ~1 min, plus risk of dispatching a silently corrupted brief.
- **Workaround:** pass direct briefs in single quotes when they contain no
  apostrophes, or use `--brief-file`; never place Markdown backticks inside a
  double-quoted shell argument.

## Popup evidence used “input gate” for a state handoff, not a sampled key edge

- **What:** the first popup probe called +56 the controller input gate, but
  source/RAM later showed it was the show-options task handoff; the next frame
  is the first injectable `JOY_NEW` edge.
- **Hits:** 1.
- **Cost each:** ~5 min.
- **Workaround:** label state handoff and first sampled input separately in
  boundary ledgers, and confirm both with an early/accepted edge pair.

## Sparse boundary ledger survived after dense replay contradicted it (2026-07-23)

- **What:** the Battle-2 opening ledger labeled the action-menu clear/reveal
  at 32850/32856 from a sparse endpoint probe. The first dense continuation
  replay proved the true boundaries are 32895/32901, after implementation
  work had already started against the stale labels.
- **Hits:** 1.
- **Cost each:** ~8 min.
- **Workaround:** treat source-relative boundary ledgers as provisional until
  a trace captures every frame across the handoff; correct the ledger in the
  same commit that lands the dense trace.

## Chained-trace stitching silently inserts redundant idle frames (2026-07-20)

- **What:** concatenating two independently idle-padded trace scripts
  (extending a committed trace with the next window's segments) inserts
  redundant idle frames at the seam — pixels still match (idle frames are
  idempotent there) so compares stay green, but every absolute tick
  citation downstream of the seam shifts (8 frames in the case that bit),
  silently desynchronizing doc tables from the trace.
- **Hits:** 1.
- **Cost each:** ~15 min.
- **Workaround:** when extending a chain trace, take the extension's
  segments verbatim from the reference groundtruth trace (they already
  share the prefix), never re-pad; after stitching, verify one known
  boundary sha at its documented absolute tick before citing anything.

## Bash-session cwd silently persists into stale/sibling worktrees (2026-07-20)

- **What:** a shell session's working directory persists across commands;
  after any `cd` into a worktree (or a worktree path left in a reused
  session), later commands silently run there — against the WRONG HEAD and
  the wrong npm install. Bit a main-lane worker (several early commands ran
  inside the live scout lane's worktree, leaving scratch debris the scout
  then had to report around) and the supervisor's own verification pass
  (`git log`/`npm test` reported the scout branch's state as if it were
  master) in the same session.
- **Hits:** 2 (same session).
- **Cost each:** ~5-10 min re-verifying, plus cross-lane debris confusion.
- **Workaround:** start every verification/command block with an absolute
  `cd` to the intended tree; `pwd`-check before trusting any `git`/`npm`
  output; workers should never `cd` into `.worktrees/` paths they don't
  own.

## Reference-header block parsing: last array entry has no trailing comma (2026-07-17)

- **What:** `species_info.h`'s final entry (SPECIES_CHIMECHO) and
  `contest_moves.h`'s `gContestEffects` table omit the trailing comma, so a
  block-closing regex assuming `\n    },` silently swallows the next real
  entry into the previous one's body instead of erroring.
- **Hits:** 1 (moves/exp/items extraction worker).
- **Cost each:** ~10 min (caught only via a battle-frontier-pool
  cross-check, not by count assertions).
- **Workaround:** make the comma optional (`,?`) in block-closing regexes
  for these headers, and always cross-check extraction coverage against an
  independent list (e.g. `battle-frontier-mons.json`'s species/items)
  rather than trusting block counts.

## `sFactorySelectScreen` struct offsets rediscovered per session / no
  reusable RAM-probe harness (2026-07-17)

- **What:** only the `mons[]`/`selectedId` region is documented (in
  `tools/extract/inspect-anchor.py`); other fields (e.g. `monPicAnimating`)
  get re-located by byte-diffing each time a RAM probe needs them. Broader
  form (decline worker, 2026-07-17): every RAM-verified investigation
  rebuilds its probe script (replay + read loop + JSON dump) from scratch;
  the decline worker had no probe at all and did screenshot-only
  archaeology, "a large fraction of the session's budget".
- **Hits:** 2 (confirm-flow scout ~10 min; decline worker, large fraction
  of a 32-min session).
- **Workaround:** when a new field is derived, add its offset as a comment
  in `inspect-anchor.py` — treat that file as the struct-layout registry.
  Real fix: bank a committed `tools/probe/` script (replay a trace's
  segments via `EmeraldOracle`, dump named symbols/offsets per tick to
  JSON) next time a RAM chase happens — ISSUES #12/#13 are natural
  occasions.

## New-window engine slices: baseline A/B check not done first (2026-07-19)

- **What:** when a slice's target window shows diffs, workers debug their
  OWN new code first — but twice now the true blocker was a PRE-EXISTING
  residual on the unmodified baseline (menu slice 2's bar-split span;
  materialize slice's 1653+ full-frame residual, #98). A `git stash` A/B
  compare of the untouched code over the target ticks costs ~2 min and
  immediately separates "my bug" from "inherited gap".
- **Hits:** 2 (menu slice 2 implicitly, materialize slice #98 explicitly:
  ~10-15 min lost).
- **Cost each:** ~10-15 min of misdirected pixel forensics.
- **Workaround:** supervisor briefs for window-extension slices now
  include "A/B the unmodified baseline over the target ticks FIRST";
  workers should treat any diff shared by the baseline as out-of-scope
  evidence, not a debugging target.

## Supervisor commits to `master` while a main-lane worker is mid-run look like git corruption (2026-07-20)

- **What:** the supervisor and the main-lane worker share one working
  tree and one `master`. When the supervisor commits its own docs
  (ROADMAP/ISSUES/PROGRESS ledger) during a worker's run, the worker can
  observe a transient `git status`/`git diff` inconsistency on a file it
  never touched and reasonably suspect repo corruption. Reported by the
  E2b-2 worker (~2 min lost) after this session's ISSUES #23 park commit.
- **Hits:** 2. **2026-08-08 — the predicted sweep happened, in the
  INVERSE direction.** The supervisor ran `git add -A` in the main tree
  to commit a two-file test fix while a main-lane worker was mid-run,
  and swept that worker's **in-progress 563-line
  `tools/report/battlescene-split-partition.ts`** into the supervisor's
  own commit (`cac9cda3`). It happened to land byte-identical to the
  worker's final version, so nothing was lost — but a half-written file
  would have been committed under an unrelated message, and the worker
  had to notice and report it. This entry's own workaround ("stage those
  paths explicitly, never `git add -A`") already said not to do it.
- **Cost each:** ~2 min of investigation. The risk is not hypothetical:
  it has now fired in both directions — a worker sweeping supervisor
  docs, and the supervisor sweeping a worker's source file.
- **Workaround:** supervisor commits mid-worker should touch only files
  no worker owns (ROADMAP.md / ISSUES.md / PAPERCUTS.md — never
  PROGRESS.md, which main-lane workers own), stage those paths
  explicitly (never `git add -A`), and commit immediately rather than
  leaving edits dirty in the shared tree. Better: batch supervisor docs
  edits into the gap between workers when the schedule allows.

## Contact-sheet row-slicing desyncs labels from frames (2026-07-20)

- **What:** building a PIL contact sheet by slicing one tall stitched
  image into row chunks of a fixed raw pixel height (not an exact
  multiple of the cell height) silently shifts every later label off its
  frame — the switch-in itemization worker chased a phantom
  contradiction for ~15 min before abandoning the sheet for per-tick
  numeric pixel probes.
- **Hits:** 1.
- **Cost each:** ~15 min.
- **Workaround:** view contact sheets whole, or slice strictly at
  cell-height multiples; for boundary-pinning work prefer per-tick
  numeric pixel probes (which is what actually worked) over visual
  sheets entirely.

## Uncommitted work wiped by a scratch-loop `git checkout` (2026-07-20)

- **What:** a grid-search scratch loop that used `git checkout` to reset
  experiment files wiped the session's real uncommitted `battleScene.ts`
  edits (nothing had been committed yet); recovered from memory, ~15 min.
- **Hits:** 1.
- **Cost each:** ~15 min plus recovery risk.
- **Workaround:** commit or stash BEFORE any throwaway-experiment loop
  that touches tracked files — AGENTS.md's "commit after every green
  step" already implies it; scratch loops that reset tracked files
  should operate on copies under the scratch dir instead.

## Pixel-sampling a palette-fade table from a screenshot under-resolves steps (2026-07-20)

- **What:** deriving a fade/tint coefficient table by sampling rendered
  pixels needs a swatch with enough per-channel dynamic range to resolve
  every step — a low-range swatch collapses adjacent coefficients into
  identical RGB values and the fitted table is silently wrong. Cost the
  L-3 worker ~25-30 min before isolating it.
- **Hits:** 1.
- **Cost each:** ~25-30 min.
- **Workaround:** solve fade/tint tables directly from RAM palette-buffer
  data (`gPlttBufferFaded` probes — the switch-in tint precedent) instead
  of screenshot sampling; if sampling anyway, pick swatch pixels with
  near-255 channel values first.

## Battle-lab has no busy/idle signal for button registration

- **What:** during the ~2000-frame post-KO switch-in dance, fixed-frame
  button waits are silently dropped (input is not buffered), and the API
  offers no way to ask whether a press will register; staging multi-turn
  KO scenarios needed trial-and-error until a continuous low-duty-cycle
  A-spam pattern was found (documented in `docs/hit-chain-ground-truth.md`).
  Second hit (2026-07-25): mid-battle *voluntary party-menu switch*
  navigation via `overrides.parties` traces — `DOWN,A,RIGHT,A` from the
  action menu never changed the party index across three attempts (~15 min);
  the pattern from `mechanic-uproar-soundproof-switch-off.json` did not
  transfer, likely frame-timing or cursor-geometry sensitive.
- **Hits:** 2.
- **Cost each:** ~15 min.
- **Workaround:** stage post-KO continuations with low-duty-cycle A-spam
  that self-times, instead of computing exact wait durations. No verified
  pattern yet for mid-battle voluntary switches; needs a dedicated probe
  that RAM-reads the party-menu cursor to derive a reusable sequence.

## Oracle comparator round-trips make calibration sweeps slow

- **What:** each portable-comparator or probe run costs ~10-20s of mGBA
  boot + replay; calibration checks that sweep a one-tick alignment (e.g.
  the FLY `AnimTask_ShakeMon` divergence) need several round-trips per
  hypothesis, dominating small-step wall time.
- **Hits:** 1.
- **Cost each:** ~10 min.
- **Workaround:** none cheap yet; a cached local probe-replay mode (reuse
  committed RAM dumps) would make alignment sweeps near-instant.

## Hit-chain opcode tests gate controller-busy on the injected port, not the scheduler field

- **What:** RUNG 1-3 hit-chain opcodes check the injected `isControllerIdle`
  port rather than `BattleScriptSchedulerState.pendingControllerBattlers`,
  so manually-stepped test sequences accumulate unacknowledged pending
  battlers invisibly — surfaced only when opcode 73's controller states
  started reading the real field, as a confusing "blocked" instead of the
  expected result. Not a production bug (the real driver acknowledges
  correctly).
- **Hits:** 1.
- **Cost each:** ~15 min.
- **Workaround:** acknowledge between steps in manually-driven opcode tests
  (done in the two affected test files); longer-term, align the opcode
  handlers on the scheduler field.

## No reusable doc for gPartyMenu struct offsets

- **What:** RAM-probing party-menu state (forced/voluntary switch staging)
  requires `gPartyMenu` field offsets; nothing committed records them, so
  each probe re-derives from `include/party_menu.h` by hand and
  cross-validates against a proven fixture.
- **Hits:** 1.
- **Cost each:** ~10 min.
- **Workaround:** `tools/probe/dump-forced-switch-party-menu.py` now
  encodes the derived offsets — copy from there until a shared
  symbols/offsets note exists.

## Capture-lag bisection against a hand-rolled harness can be silently double-lagged

- **What:** a box-isolated lag bisection ran through a reimplemented render
  path while the code under test still had its own hardcoded `age - 1`
  underneath — every lag verdict was shifted by one until the hidden lag
  was found (DRAGON_RAGE rung-5 follow-up).
- **Hits:** 1.
- **Cost each:** ~15 min.
- **Workaround:** bisect against the REAL draw path with the code-under-test's
  own lag constants zeroed/parameterized first; never a hand-rolled copy.

## No committed record of canonical turns' frame-0 gRngValue

- **What:** re-staging a canonical turn's RNG in a Tier-1 harness (seam
  checkpoint's turn-5 KO) needed the accuracy-roll math hand-derived for a
  borrowed seed because no doc records per-turn frame-0 `gRngValue`.
- **Hits:** 1.
- **Cost each:** ~10 min.
- **Workaround:** none yet; the turn dossiers record boundary shas but not
  the LCG cursor — worth adding to the next dossier retrofit pass.

## Mash-rep counts for staged multi-turn fixtures don't transfer between move-animation classes

- **What:** every staged mechanicLab fixture that needs "exactly N real
  executed turns" calibrates its button-mash rep count empirically, and the
  plateau depends on the move's own animation/message cost — §19.5's
  Sand Attack pair needed 40/30 reps (stat-change animation), §24.5's
  Double Team site-2 pair needed a fresh ~15-round-trip sweep because the
  self-buff class shares no baseline with the target-driven class. No
  central rep-count table per move class exists, so each new class starts
  from scratch.
- **Hits:** 2 (§19.5 DRAW SITE 2, 2026-07-26; §24.5 DRAW SITE 2,
  2026-07-27 — ~25 min).
- **Cost each:** ~15-25 min.
- **Workaround:** record each calibrated (move, per-turn rep count, tail
  length) triple in the ground-truth doc next to its fixture; a small
  committed table in `tools/battle-lab/README.md` indexed by animation
  class would let new fixtures start from a sibling's number instead of
  zero.

## Codex `apply_patch` fails to match PROGRESS-archive.md tail blocks

- **What:** workers rotating the progress ledger via `apply_patch` hit
  repeated context-match failures on the archive's final block (large,
  frequently-shifting file; trailing-newline sensitivity), retrying until
  falling back to another edit path.
- **Hits:** 1 (four-opcode worker, 2026-07-28).
- **Cost each:** ~2 min.
- **Workaround:** append to `PROGRESS-archive.md` by prepending after the
  header with a shell heredoc or targeted `sed` instead of whole-block
  patch matching; supervisors already rotate this way.

## Concurrent per-lane full-suite/build runs starve host memory (2026-07-29)

- **What:** two lanes running `npm test`/`npm run build` simultaneously
  (main Slice-3 worker + side battle-pic Terra worker, each ~500-file
  vitest suites) drove host memory pressure: one signal-143 kill/retry in
  the main lane and a side worker that could not complete its full-suite
  validation inside its cap at all (honestly reported "not claiming it
  passed"; supervisor reran it green post-contention).
- **Hits:** 6 (both lanes of the same round, 2026-07-29 ~13:40; Slice-3
  closure worker 2026-07-30 — concurrent baseline sessions left orphaned
  Vitest workers, ~2 min; main #60 verification overlapped the independent
  animation supervisor's full gate on 2026-07-31, stretching the main suite
  to 431s, ~5 min; 2026-08-08 the independent animation worker launched
  several full gates while this supervisor's main/side baselines were live,
  stretching them to ~23 minutes and killing main's healthy post-change full
  at its 60-minute cap, ~35 minutes of wall time plus supervisor salvage;
  the following healthbox worker's otherwise-green final suite still took
  13m43s under shared-host contention, ~7 minutes lost; the Baton Pass side
  receipt then reached its cap during a second overlapping full gate despite
  a committed green focused checkpoint, ~14 minutes lost).
- **Cost each:** ~10 min (main retry) + ~20 min (side validation stall).
- **Largely fixed 2026-08-01:** the root cause was that only
  `run-subagent.sh` exported `POKEBENCH_VITEST_MAX_WORKERS` (4), so bounded
  workers were capped but every supervisor and interactive session ran at
  vitest's default of `availableParallelism() - 1` = 15 forks. Measured on
  this box: one uncapped full suite = 15 forks / 167s / ~83 GB peak tree RSS
  (RSS sums overcount shared pages, so treat as an upper bound); at
  `MAX_WORKERS=4` it is 4 forks / 329s / ~36 GB. `vite.config.ts` now
  fair-shares the core budget by counting live peer vitest runs, so a solo
  run stays at 15 and a contended one backs off automatically (verified:
  a second run launched against one live peer took 7).
- **Residual:** two suites starting within a few seconds of each other both
  observe zero peers and both take a full share. Staggering still helps —
  workers run focused suites during the step and the full suite once near
  the end — and a contended full-suite claim is still worth rerunning
  serially before trusting it.

## mGBA probe wrapper leaves multi-MB logs beside committed receipts

- **What:** `tools/run-mgba-probe.py` writes `<output>.log` next to the
  probe output; when receipts are banked under `tools/probe/receipts/`,
  ~2 MB untracked logs pile up beside them and need manual relocation
  before committing.
- **Hits:** 4 (2026-07-29 absorption-reveal; 2026-08-10 #55 internal-m4a,
  source-state-v3, and Timer 0 FIFO cadence receipts).
- **Cost each:** ~1 min.
- **Workaround:** point probe outputs at scratch space and copy only the
  JSON into the repo; or teach the wrapper a `--log-dir`.

## mechanicLab species field takes internal IDs; a National Dex ID stages the wrong mon silently

- **What:** `overrides.parties` species is the internal species ID; passing
  a National Dex number (280 for RALTS) staged TORCHIC without any
  validation error, and only a snapshot RAM diff surfaced it.
- **Hits:** 1 (2026-07-29, Synchronize-reveal worker; correct internal ID
  was 392).
- **Cost each:** ~6 min.
- **Workaround:** always derive species from the extracted internal-ID
  tables (or rental set IDs); a lab-side name/ID sanity echo would be the
  real fix (harness-side).

## Ability-census exact-set pins are line-number-sensitive (2026-07-30)

- **What:** the parity-census ratchet pins engine ability/item reference
  sites as exact `file:line` sets; an unrelated edit in a pinned module
  (K2's weather fix in `battleScriptHitChainOpcode.ts`) shifts later lines
  and fails the census until the worker re-pins or preserves positions.
- **Hits:** 1 (Gate-6 K1-K3 worker, 2026-07-30).
- **Cost each:** ~2 min.
- **Workaround:** keep edits above/below pinned sites position-neutral when
  cheap; otherwise regenerate the census pin set in the same commit (the
  documented line-drift recipe) rather than contorting the edit.


## mechanicLab send-out fast-forward silently inert under battle-scene-off

- **CORRECTED 2026-08-04 (supervisor, after the R3 Slice-D verdict):** the
  original explanation below was WRONG and cost a later worker ~15 min.
  The flat `SpriteCallbackDummy`/`x2=0` reading is NOT a mechanicLab
  staging artifact — it is the real game: `BattleAnimateFrontSprite` under
  `HITMARKER_NO_ANIMATIONS` takes the `SKIP_FRONT_ANIM` branch
  (`reference/pokeemerald/src/pokemon.c:6803-6852`) and never launches the
  front animation task in ANY Scene-OFF battle, staged or organic. The
  prior claim "Real OFF-profile battles DO play send-out anims (Scene OFF
  gates only move anims)" is refuted by the oracle profile's own contract
  text, the source, `drawGeneratedOpponentRelease`'s doc comment, and the
  #56 closure audit (see ISSUES #71's Slice-D record, 2026-08-04). The
  practical guidance survives with a different reason: probe send-out
  ANIMATION state under `battle-scene-on` because only there does the
  animation exist; a flat OFF-profile reading is a true fact about OFF,
  not a staging failure. Hits: 2.
- **Original (wrong) entry, kept for forensics:** probing send-out/settle
  sprite state via a `mechanicLab` scenario under
  `profile: "battle-scene-off"` never dispatches the front idle-anim task
  at all — the probe reads a flat `SpriteCallbackDummy` / `x2=0` from tick
  0, which looks exactly like "the offset never applies" when it actually
  means "this staging path skipped the intro under OFF." Real OFF-profile
  battles DO play send-out anims (Scene OFF gates only move anims); this
  is a mechanicLab staging artifact. Workaround: run send-out RAM probes
  under `battle-scene-on`. Flagged by the 2026-08-03 #71 Slice-A worker,
  ~10 min lost root-causing. Hits: 1. Candidate fix: a warning note in
  `tools/probe/dump-onix-front-idle-anim.py`'s module doc (done
  2026-08-03 by the Slice-C step) and/or a mechanicLab README line.


## `BattleScriptPartyMemberInput.moves` override silently defaults PP to 0 (Struggle fallback)

- **What:** the bench-party `moves` override defaults each slot's `pp` to 0
  when `pp` is omitted, unlike `FactoryFullTurnBattlerConfig`'s own
  16-per-nonzero-move default for the two active battlers — a staged bench
  mon with `moves: [FAKE_OUT,0,0,0]` and no `pp` silently selects
  MOVE_STRUGGLE instead of erroring. Flagged by the 2026-08-03 #72 batch-2
  worker (diagnosed via raw event dump).
- **Hits:** 1.
- **Cost each:** ~10 min.
- **Possible durable fix:** default bench-override PP the way the
  active-battler path does, or throw when a nonzero move slot carries zero
  PP.

## zsh: unquoted `$VAR` does not word-split — multi-arg lists silently collapse

- **What:** passing an N-item trace list to a CLI via unquoted `$ARGS`
  in zsh passes ONE giant argument (zsh doesn't word-split unquoted
  parameters, unlike bash); `compare:differential` then reported
  "(1 trace)" with a nonsense combined filename instead of erroring.
  Flagged by the 2026-08-03 typeref slice-2 worker; same zsh trap class
  as the 2026-08-01 session's word-splitting note.
- **Hits:** 13 (as a worker-facing papercut; the trap class itself is
  previously known; 2026-10-07: prep25 ~10 min, audit 8 ~6 min, #151 diagnosis ~1 min; 2026-10-07 day: prep30 ~3,
  prep33 ~2, audit 9 ~6, audit 10 ~1, R5 ~2, D4d2 ~1, divefix ~1, audit 11 / prep34 ~1 each; zsh also fails on
  `echo ===` — `=word` expansion).
- **Cost each:** ~5 min; 2026-10-03 allocator worker lost ~1 min on a probe loop.
- **Workaround:** `${=ARGS}` for explicit splitting, or arrays
  (`"${traces[@]}"`), or pass files via xargs.

## In-battle forced-switch party menu: cursor defaults to the fainted slot

When staging multi-faint sequences (oracle traces that KO the player's
active mon repeatedly), the forced-switch party menu opens with the cursor
on the just-fainted ACTIVE slot, not the first alive mon — a bare `A` there
yields "has no energy left to battle!" and wastes the input. Undocumented
anywhere until 2026-08-04; cost the loss-path scout ~15 min of blind
probing. Recipe now recorded in
`docs/terminal-seam-loss-path-ground-truth.md` §0 — navigate to an alive
slot explicitly before `A`. Hits: 1

## No in-tree tool reconstructs an oracle periodic-phase schedule from dense captures

2026-08-06, main worker (bounce bind): matching the app's idle-bounce phase
to the oracle required scratch Python cross-correlation over dense capture
diffs — rebuilt ad hoc in the worker session (~20 min). Any future
oscillation/phase bind (bounce, blink, breathing) pays this again. Possible
fix: a small `tools/compare/` helper that takes a frame range + bbox and
emits the per-frame changed-pixel counts as a series ready for phase
fitting.

## Compare diff-PNG legend is easy to misread; no numeric per-region decomposition helper

2026-08-06, side worker (OAM ground truth): the diff PNG convention
(matching pixels keep the oracle color, mismatches are red) reads as "whole
image differs" at a glance, and workers that cannot view images must
decompose diffs numerically with ad-hoc PIL scripts. Possible fix: a
`--regions` mode on inspect-frame that prints per-cluster bbox + px counts
(the cluster code already exists) so no image viewing is needed.

## Concurrent full suites exceed the documented 5–7 minute verification time

2026-08-09, supervised main/side workers: two main-profile full suites plus an
independent animation-profile suite shared the machine. The main and side runs
took about 14 minutes each despite staying green. This delayed bounded worker
handoff by about 7–9 minutes per lane. A third hit during the #55 VBlank
receipt overlapped main, side, and animation finish gates; typecheck/build
processes each peaked above 6 GB and added about 3 minutes of polling. Hits: 3.
A launcher-level full-suite
semaphore would keep disjoint implementation parallel while serializing only
the memory-heavy finish gate.

## `compare --capture-range` does not accept battle-lab request fixtures

2026-08-09, main worker (#84 cadence): passing a battle-lab fixture to
`compare --capture-range` crashes because app replay expects top-level input
segments. The worker lost about 2 minutes before switching to dense oracle
evidence plus the public orchestrator verifier. Possible fix: reject the shape
with a direct error that points to `bin/oracle lab`, or teach compare to unwrap
the nested controller trace. Hits: 1.

## Yielded full-suite calls are easy to restart accidentally

2026-08-09, supervised side receipt, state-family, and absorbing-family
verification: a yielded execution was mistaken for a completed call and
restarted, leaving concurrent or redundant Vitest process groups until the
supervisor identified the retained process or supplied final union
verification. A fourth hit occurred when one retained side-worker session
started two full suites while the animation supervisor was also verifying.
The Color Change side worker then repeated a committed-tree full suite after
a two-line type-only follow-up and hit its cap during that redundant run.
The #55 VBlank worker then repeated green build/typecheck gates after their
yielded sessions hid completion status. The #55 SetMonData worker likewise
needed about 3 minutes of extra polling after its terminal verification
returned before Vitest exited. The encrypted-accessor worker and supervisor
then each saw a command return before its child verification exited, costing
about 3 more minutes of polling/rechecks. Two final #55 workers then collided
with another full-suite process and needed retained-session polling plus
compact-output reruns. The sixth-MPlay selector worker later reran a green full
suite solely because the yielded handle hid its terminal summary. The CGB4 v6
worker likewise restarted the full suite while its first yielded run was still
active, adding about 2 minutes of polling. The CGB4 v7 worker then needed about
1 minute of extra retained-handle polling. The CGB4 v8 worker then repeated a
green build after retained output hid its first completion and inferred the
full-suite count because its summary scrolled out of the tool window. The v9
worker then lost two full-suite output handles before recovering a compact
scratch log. The CGB4 v11 worker recovered a yielded full-suite summary only
after extra process polling, and the following supervisor fold repeated a
green build when its first yielded completion omitted the exit status. The
CGB4 v14 worker then spent about 2 minutes confirming detached full-suite and
build completion before its final ledger commit. The CGB4 v17 worker lost the
final full-suite status after the child process exited, costing another 5
minutes of process and log checks. Hits:
21; cost: about 82 minutes plus avoidable CPU
contention. A
launcher/tool response that visually distinguishes “still running; wait on
this handle” from completion would prevent this class of mistake.

## Probe wrapper rejects byte-complete signal-10 teardown

- **What:** the second legal-varied selector capture wrote valid, complete JSON
  byte-identical to its first capture, then exited by signal 10. The mandated
  `run-mgba-probe.py` wrapper correctly rejected the unknown process status
  because it special-cases only the known teardown SIGSEGV, forcing a separate
  JSON/hash validation before the evidence could be retained.
- **Hits:** 1.
- **Cost each:** ~1 min.
- **Workaround:** keep the conservative rejection, but report when a rejected
  process nevertheless produced parseable output so the caller can validate
  and classify a new teardown signature explicitly.

## Incremental typecheck can miss a new test-only union error

2026-08-11, #55 SetBoxMonData reducer: the ordinary incremental typecheck was
green, but the production build's project pass found a new test fixture union
access without an `in` guard. A forced typecheck reproduced it and the guard
fixed it. Cost: about 3 minutes. Finish workers that add new test files with a
forced project typecheck, or make the standard script invalidate new test
inputs reliably. Hits: 1.

## Broad formatter passes make legacy semantic patches hard to recover

2026-08-09, #84 main worker: an accidental whole-file Prettier pass expanded a
narrow battle-scene patch into a very large whitespace diff. Reversing that
diff and reconstructing the semantic edits cost about 5 minutes. Prefer
formatting only newly edited ranges/files whose existing style is already
formatter-clean, or add a checked narrow-format helper.

## Legacy canonical compare traces can silently default to the generated route

2026-08-09, #85 swap-handoff worker: `battle1-swap-enemy-accept-exit.json`
had no `appRoute`, so `npm run compare` replayed the generated route and
wholesale-mismatched 0/43 frames before the trace declared its historical
`canonical-recorded` owner. The metadata fix restored 43/43 and shrank the
legacy allowlist. A second worker found the older `battle1-swap-*` staged
files also lack enough current route/stage metadata; generic compare replayed
the default app from frame 0 and produced meaningless full-frame diffs before
the worker restricted verification to runnable #73 windows. Hits: 2; cost:
about 7 minutes total. A compare trace with no route should fail with an
actionable ambiguity error when both routes exist, and a staged trace with no
current app stage should be rejected before replay.

## `npm run soak -- --help` silently starts the default 0:50 sweep

- **What:** the soak CLI has a detailed usage comment but no `--help` branch.
  Asking for help therefore ignores the flag and starts the default 50-seed
  full-policy run. The supervisor caught and stopped it only after it had
  already consumed several seeds.
- **Hits:** 2 (2026-08-24 supervisor orient: same shape, killed within
  ~60 s while sizing the varied-RNG gate).
- **Cost each:** ~3 min.
- **Workaround:** read `tools/soak/randomRoundSoak.ts`'s header or pass only a
  known bounded `--seed`/`--seeds` invocation.
- **Real fix:** recognize `-h`/`--help`, print the existing option contract,
  and exit before constructing the default seed range.

## `run-subagent.sh` raw-log filename collides on same-second parallel launches

- **What:** the JSONL log path is timestamped to the second
  (`emerald-factory-subagent-YYYYMMDD-HHMMSS.jsonl`). Two lanes launched in
  the same shell command share one file and interleave both event streams
  (distinguishable only by `session_id`), which slows post-hoc review and
  salvage forensics.
- **Hits:** 1 (2026-08-09 night, round-1 main+side pair).
- **Cost each:** ~3 min of review friction.
- **Workaround:** stagger parallel launches by 1-2 s, or pass distinct
  `--log` paths explicitly.
- **Real fix:** include the lane name and/or `$$` in the default log
  filename.

## Two `EmeraldOracle` instances cannot coexist in one Python process

- **What:** constructing a second `EmeraldOracle` in the same process
  crashes silently before writing any output; `run-mgba-probe.py`'s
  teardown tolerance hides the traceback. Multi-fixture verify scripts must
  shell out one subprocess per fixture (the `run-mgba-probe.py` convention).
- **Hits:** 1 (2026-08-09 night, Rank-1 receipt-pack worker).
- **Cost each:** ~10 min.
- **Workaround:** `--single <fixture> <out>` self-exec subprocess pattern
  (see `tools/probe/verify-item-move-end-paralysis-off.py`).
- **Real fix:** make the second constructor fail loudly, or document the
  one-core-per-process constraint in the probe harness README.

## Bare `npx vitest run` of census-loading tests dies with a native OOM stack

- **What:** `npm test` sets `NODE_OPTIONS=--max-old-space-size=8192` (added
  2026-08-09 night when the census JSON grew), but a bare
  `npx vitest run tests/<census-loading>.test.ts` still gets Node's 4 GB
  default and crashes with a raw C++ stack trace — easy to misread as a
  broken test, and in a piped compound the crash silently swallows output.
- **Hits:** 2 (supervisor verification and a Gate-6 route-audit worker,
  2026-08-10).
- **Cost each:** ~4 min.
- **Workaround:** prefix targeted runs with
  `NODE_OPTIONS=--max-old-space-size=8192`.
- **Real fix:** move test-only JSON out of the resolveJsonModule graph (the
  known ~650 MB relief in AGENTS.md), or add a vitest config-level
  heap guard.

## Nested m4a probe imports are fragile for one-off boundary capture

- **What:** a #55 worker needed several retries to load the nested m4a probe
  chain, supply `tools/probe` on `sys.path`, route execution through
  `run-mgba-probe.py`, and avoid a literal escaped newline after valid JSON.
- **Hits:** 2 (2026-08-11, CGB4 mutable-route and allocation-body captures).
- **Cost each:** ~2–8 min.
- **Workaround:** start from a committed sibling probe and always invoke it
  through `python3 tools/run-mgba-probe.py <out> -- <probe command>`.
- **Real fix:** provide a small shared probe-loader/helper that installs the
  probe module path and writes newline-terminated JSON safely.

## Recursive CGB4 evidence checks dominate every full npm run

- **What:** each CGB4 version regenerates retained predecessors, and the full
  suite runs many versions in parallel. A source-only leaf can therefore make
  `npm test` take 10–15 minutes even when ordinary engine tests finish quickly.
- **Hits:** 4 (2026-08-13, v44 supervisor/worker acceptance).
- **Cost each:** ~10–15 min; one worker reached its cap during the final run.
- **Workaround:** use focused plus smoke checks during development and reserve
  one full run for acceptance.
- **Real fix:** validate the shared ancestry once per suite, then let each leaf
  pin only its own output and immediate predecessor.

## `EmeraldOracle.read_u32` silently word-aligns unaligned addresses

- **What:** a `read_u32` at an address that is not 4-byte aligned rounds the
  address DOWN to the word boundary and returns that word with no error —
  the caller gets a plausible-looking wrong value. Bit the 2026-08-14
  Noland receipt probe reading `playerTrainerId` at SaveBlock2+0x0A
  (offset 2 mod 4); only a raw memory scan cross-check exposed the misread.
- **Hits:** 1.
- **Cost each:** ~10 min to notice and disprove.
- **Workaround:** compose unaligned reads from `read_u8` bytes (see
  `tools/probe/dump-noland-brain-party.py`).
- **Real fix:** make `read_u32`/`read_u16` either honor unaligned addresses
  or raise on them.


## Full `npm test` wall time is 3-5x under concurrent multi-lane load

- **What:** with three lanes hot (main + animation + rust supervisors each
  running workers), the ~5-7 min full suite took ~18 min (side worktree,
  2026-08-14 receipts worker) and ~24 min (main tree, 2026-08-14 round-shape
  worker). Every file passed; pure CPU/IO contention. Workers sized to a
  45-60 min cap can lose a third of it to one full-suite run.
- **Hits:** 2.
- **Cost each:** ~12-18 min of worker cap.
- **Workaround:** brief workers to run focused suites while iterating and
  exactly ONE full suite at the end (standing rule); supervisors budget
  caps assuming the loaded timing, and use POKEBENCH_VITEST_MAX_WORKERS to
  bound their own verification runs.
- **Real fix:** none cheap — this is one machine running three programs;
  scheduling full-suite runs to avoid overlap is the lever that exists.

## Side-worktree root has no `package.json` — `npm run` silently escapes to the main checkout

- **What:** worker worktrees check out the whole repo (`workspace/` is a
  subdirectory), so the worktree ROOT has no `package.json`. Running
  `npm run compare` (or any npm script) from the worktree root makes npm
  walk up the directory tree until it finds a `package.json` — which is the
  MAIN checkout's — so the command runs against the main tree's unpatched
  source while appearing to run in the worktree. A local patch then looks
  like a no-op.
- **Hits:** 1 (2026-08-18, #97-B continuation-6 side worker: a live-verify
  patch "did nothing" until the worker spotted the escape; ~15 min lost).
- **Workaround:** always `cd <worktree>/workspace` (the directory holding
  `package.json`) before any npm script; treat a patch-is-a-no-op result as
  this trap until the cwd is confirmed.
- **Real fix:** run-subagent.sh could `cd` workers into `<worktree>/workspace`
  (it already does for the brief's cwd — the trap is manual `cd`s during the
  session), or a stub root `package.json` that fails loudly.

## `node --experimental-strip-types` TS probes crash with a TDZ error unless the circular engine trio is imported in the right order

- **What:** `battleMenu.ts` / `battleScene.ts` / `battleSceneCanonical.ts`
  form a circular import trio. A standalone TS probe (`node
  --experimental-strip-types tools/probe/x.ts`) that imports them in the
  wrong order hits a real module-eval TDZ crash (e.g. `battleScene.ts`'s
  `TEXT_TOTAL_CHARS = LINE1.length + …` evaluating before `LINE1`'s
  initializer). No bundler hoisting saves you outside vitest/vite.
- **Hits:** 1 (2026-08-18 side instrument worker, ~10 min lost rediscovering
  the order by trial).
- **Workaround (recorded in `docs/turn5-resolve-ab-pools-diagnosis.md` §17):**
  import `battleMenu.ts` FIRST, then reach `battleScene.ts` exports via its
  own re-exports (never `battleSceneCanonical.ts` directly) — the same order
  `tools/probe/verify-turn11.ts` already uses. Alternatively reconstruct
  against leaf modules only (the round-4 healthbox probe pattern,
  `tools/probe/probe-opponent-healthbox-hp1-vs-hp0.ts` — zero TDZ risk).
- **Real fix:** break the cycle (ISSUES #39's program) or a shared probe
  bootstrap helper under `tools/probe/` that encodes the safe order once.

## Supervisor ledger commits landed mid-worker get clobbered by the main-lane worker's stale-snapshot rewrite

- **What:** the supervisor committed ISSUES #120/#121 (pathspec commit, a
  file the live main-lane worker had not yet modified) while that worker
  was mid-step; the worker's later ISSUES trim was written from a snapshot
  read before the commit and silently dropped both entries. The worker
  caught it via `git log`, verified against the supervisor's commit, and
  restored them byte-identically — ~8 min of a 60-min cap.
- **Hits:** 1 (2026-08-22, #118 commit-2 worker).
- **Fix:** the pathspec-commit rule (entry above) protects the INDEX, not
  the worker's in-context copy of a file it will edit later. Supervisors
  queue ISSUES/PROGRESS edits until the main lane frees (side-lane folds
  already wait); briefs that edit a shared ledger carry "re-read the file
  immediately before editing; never rewrite it from an earlier snapshot".

## The launcher-printed worktree path is the REPO ROOT (one level above `workspace/`) — `git … -- src/...` run from there silently matches nothing

- **What:** git pathspecs are cwd-relative, and the git root is
  `pokeemerald-factory-core/`, not `workspace/`. A worker that `cd`s to the
  worktree path the launcher prints (or the supervisor `cd`ing to
  `.worktrees/<id>`) is at the repo ROOT, where `git show <hash> -- src/x.ts`
  and `git diff A..B -- tests/` match nothing and print NOTHING — no error.
  From inside `workspace/`, plain `src/...` works and `workspace/src/...`
  does NOT (one scout lost a commit to `workspace/workspace/docs`).
- **Hits:** 4 (2026-08-22/23: audit R ~5 min, audit E ~2 min, supervisor
  ~2 min, scout H ~2 min following the over-corrected brief line).
- **Fix:** brief line "check `pwd` first: from the repo root prefix
  `workspace/`, from `workspace/` do not"; durable fix is having the
  launcher print (and `cd` workers into) `<worktree>/workspace`.

## macOS has no `timeout(1)` — briefs suggesting `timeout 600 npx vitest …` fail outright

- **What:** no GNU coreutils on this host; `timeout` is "command not found".
  Workers that follow a brief's guarded-vitest idiom lose a minute each.
- **Hits:** 6 (2026-08-22: scout S ~1 min, audit R ~2 min; 2026-10-07: prep26 ~4 min, audit 7 ~8 min,
  Curse worker ~1 min, order-rows worker ~2 min — the supervisor's briefs said "explicit Bash timeouts on long
  loops", which invites `timeout(1)`; say "Bash tool timeouts" instead).
- **Fix:** never write `timeout` into a brief; rely on the Bash tool's own
  per-call timeout.

## A side worktree created between two lockstep commits inherits a wasm artifact that mismatches its adapter

- **What:** the wasm artifact is gitignored and rebuilt per checkout. A
  side worktree based on ISSUES #118's commit 1 (Rust record layout
  changed, TS adapter not yet) built a 29-byte-record wasm against a
  23-byte-record decoder, so every wasm parity suite went red for a worker
  whose step never touched either. It repaired it via a throwaway worktree
  at the pre-commit-1 Rust (~10 min). Related: cargo is not on the login
  PATH (only `build-wasm.sh` exports the toolchain dir) — ~2 min per worker
  that needs it.
- **Hits:** 2 (2026-08-22: #120 side worker ~10 min; #118 commit-2 worker
  ~2 min on PATH).
- **Fix:** record the artifact's source commit in a sidecar
  (`artifacts/wasm/factory_wasm.wasm.commit`) that the parity suites'
  `wasmAvailable` check compares against `git log -1 -- core-rs/crates`,
  skipping (with a one-line notice) instead of failing on a mismatch; put
  the cargo PATH export in `tools/run-subagent.sh`'s worker environment.

## Wind-down soak gates exceed the Bash tool's 600 s ceiling — `vanilla 0:20` alone is ~30 min on a loaded box

- **What:** each `vanilla` seed plays to its 600k-frame budget (~92 s/seed
  with two sibling supervisors contending; ~30 min for 0:20), and the three
  0:60 deep gates are a similar order each. A worker or supervisor that runs
  a gate in a foreground Bash call hits the 600 s ceiling mid-run; the call is
  force-backgrounded and its piped output is invisible until exit, so the
  natural reaction is to kill and retry.
- **Hits:** 1 (2026-08-24 #122 ts worker: ~10 min lost to one killed attempt;
  recovered the second with `caffeinate -w <pid>`, still only finished 0:10 of
  the 0:20 canary inside its cap).
- **Cost each:** ~10 min plus an unfinished acceptance item.
- **Workaround:** never run a gate in a foreground call. `nohup npm run soak
  -- ... > <log> 2>&1 &` per gate, all gates concurrently (they are
  independent node processes), then poll the logs; or chunk the seed range
  (`0:10`, `10:20`) so each chunk fits the ceiling. The supervisor, not the
  worker, owns the four+one wind-down gates — brief workers with the rigid
  `vanilla` canary only when the step touched what it pins.
- **Real fix:** a `--jobs N` flag on `tools/soak/randomRoundSoak.ts` (seeds are
  independent; a 16-core box could finish `vanilla 0:20` in ~2 min), or a
  documented `tools/soak/run-gates.sh` that launches the standing gates
  concurrently and prints the five counts.

## `docs/gate6-coverage-manifest.{json,md}` pin per-line source locators, so two import lines in an engine file break a ratchet only the full suite reveals

- **What:** the manifest embeds `file:line` locators for engine sites. Adding
  imports near the top of a tracked engine file shifts every locator below,
  the regeneration ratchet fails, and the failure is only visible in the full
  `npm test` because the manifest test OOMs when run in isolation under load
  (no fast confirm path). Same shape as `tools/report/ability-item-parity-census.ts`'s
  line-pinned recovery sites (the #122 worker moved five of them by +8).
- **Hits:** 2 (2026-08-24 #126 worker ~8 min; #122 worker's census bump, ~3 min).
- **Cost each:** ~5-8 min.
- **Workaround:** after touching an engine file's import block, regenerate the
  manifest/census before the full suite (`npm run` scripts named in the
  test's failure message) and commit the regenerated artifact with the fix.
- **Real fix:** key the locators by symbol (function name + ordinal) instead
  of line, or give the manifest test the 8 GB heap so it runs in isolation.

## The repo root is one directory ABOVE `workspace/` — `git show <rev>:src/...` and worktree-root paths silently miss

- **What:** `workspace/` is a subdirectory of the git repo, so object paths
  are `workspace/src/...`, not `src/...`: `git show HEAD~1:src/x.ts` (used
  for a mutation check) returns nothing and a `>` redirect zeroes the target;
  a side worktree's root is `.worktrees/<id>/` (repo root), so
  `git -C <wt> show -- src/...` and `cd <wt> && npx vitest ...` match no
  files and print nothing — easy to read as "no diff" / "no tests".
- **Hits:** 2 (2026-08-24 #126 worker ~3 min, two source files zeroed
  mid-check; supervisor ~2 min, an empty diff and a silent vitest run).
- **Cost each:** ~2-3 min plus a wrong reading if unnoticed.
- **Workaround:** `git show <rev>:./src/x.ts` (the `./` is cwd-relative) or
  `workspace/src/...`; for worktrees always `cd <wt>/workspace`.
- **Real fix:** a one-line note in AGENTS.md's layout-migration paragraph, and
  the launcher's "worktree:" banner printing `<wt>/workspace` as the cwd.

## A worker's `pkill -f "randomRoundSoak"` kills every lane's soak sweeps AND any sibling worker whose brief mentions the file

- **What:** the 2026-08-25 #127 worker "stopped" its own over-long soak
  gates with `pkill -f "randomRoundSoak"` (three times: 10:08, 10:23,
  10:33). The pattern matched the supervisor's ten background census
  sweeps (`node … randomRoundSoak.ts …`, ~70 seed-minutes lost twice over)
  and the concurrent side worker's `claude -p <brief>` process — its brief
  text contained `randomRoundSoak.ts` — which died with SIGTERM (exit 143)
  23 min into a 50-min cap, mid-demonstration, and read as a cap-kill until
  the launcher digest was checked for a missing "cap reached" line.
- **Hits:** 1 session, 3 kills (2026-08-25; ~25 min supervisor time to
  diagnose + relaunch, one worker's demo phase redone by hand).
- **Cost each:** every in-flight soak on the box, plus any worker whose
  command line contains the pattern.
- **Workaround:** briefs now carry "never kill by pattern; kill only the PID
  your own shell launched (`$!`), or let it finish"; size every soak run in
  a worker brief to ≤ 3 min (`--first-round`, `--render-every 0`, small
  ranges) so there is nothing to stop.
- **Real fix:** `run-subagent.sh` could export a per-worker
  `POKEBENCH_WORKER_ID` and the soak CLI could refuse to run a `--seeds`
  range longer than N inside a worker unless `--i-am-a-gate` is passed;
  cheaper: a `tools/soak/stop-mine.sh` that kills only children of `$$`.

## Full-chain soak gates do not fit inside a worker cap on a loaded box

- **What:** a 10-seed full-chain gate (`winning`/`full --seeds 0:10`, default
  render cadence) is 93-167 s/seed under multi-lane load — 16-28 min for one
  gate — so a brief that lists two such gates plus the 3-min full suite
  cannot complete in a 45-55 min cap. Two workers were cap-killed today with
  their code committed and only the demo/gate tail lost (#125 lever 1 at 45
  min while running a 500-seed `--first-round` sweep; the coverage
  instrument at 50 min — see the entry above for what actually killed it),
  and the #127 worker burned ~20 min getting two partial gates.
- **Hits:** 3 (2026-08-25).
- **Cost each:** 10-20 min of a worker cap, a salvage pass by the supervisor.
- **Workaround:** worker briefs use only `--first-round --render-every 0`
  sweeps (≈ 1 s/seed idle, 2-4 s loaded) and ≤ 5-seed full chains with
  `--render-every 0`; the standing gates are supervisor-only.
- **Real fix:** a `--parallel N` seed fan-out in `randomRoundSoak.ts`
  (seeds are independent processes already) so a 0:60 gate is wall-clock
  ~1/8 of today's.

## `rg`/`grep -r` over `reference/pokeemerald/` return ZERO hits silently — it is a symlink

- **Hit:** 2026-08-25 (ts opus audit worker, ~4 min lost; a second worker
  the same day resolved it only because the brief warned it).
- **What happens:** `reference/` is a symlink into the vendor checkout.
  `rg reference/pokeemerald/src` (and `rg` from a cwd above it) does not
  follow the symlink by default and prints nothing — no error, no hint — so
  a source inventory looks EMPTY and a worker can conclude "no source sites"
  for a symbol that has dozens.
- **Workaround:** `rg ... "$(cd reference/pokeemerald && pwd -P)/src"`, or
  `rg -L` / `--follow`, or `grep -rn` with the resolved path. Briefs that ask
  for source sweeps should state this.
- **Fix shape:** add `--follow` to a repo `.ripgreprc` (and export
  `RIPGREP_CONFIG_PATH` from the launchers), or note it in AGENTS.md's
  reference-material section.

## Battle-lab checkpoint lands PAST turn 1's AI decision — a receipt probe cannot observe the first AI decision

- **Hit:** 2026-08-25 (ts opus worker, ISSUES #128 receipt; ~10 min lost to a
  frame-1 false positive on `gChosenMoveByBattler`).
- **What happens:** `mechanicLab` checkpoints inside turn 1's
  `HandleTurnActionSelectionState` run after the AI has already committed and
  the switch-in hooks (Intimidate/Trace) have fired, so the first AI decision a
  probe can window is TURN 2's. A probe keyed on `gChosenMoveByBattler` at
  frame 1 reads the pre-committed value and mis-attributes draws.
- **Workaround:** window the AI decision on
  `gBattleMainFunc == HandleTurnActionSelectionState` and read turn 2 (the
  `probe-issue128-ability-history-off.py` shape).
- **Bumped 2026-08-26** (ts opus worker, ISSUES #135 receipt; ~8 min): the
  precise position is INSIDE turn 1's action selection — frame 0 IS the
  turn-1 action menu with the AI already committed. A "two-A prelude" before
  the intended action silently executes turn 1 (the lead takes a hit) and the
  fixture lands on turn 2 with a damaged lead. Press nothing before the
  turn-1 action you actually want; window later turns for AI decisions.
- **Fix shape:** a line in `tools/battle-lab/README.md` under mechanicLab
  ("the checkpoint is past turn 1's AI decision; window turn 2").

## Battle-lab traces that end on a faint message silently never reach `moveend` — a stalled `gBattlescriptCurrInstr` looks like "the ROM skipped the opcode"

- **Hit:** 2026-08-25 (side opus worker authored a false engine-divergence
  receipt → ISSUES #129 filed → ts opus worker spent ~35 min finding and
  ~25 min unwinding it).
- **What happens:** `STRINGID_TARGETFAINTED` (and every `\p`-terminated
  string) ends in the `0xFB` prompt code, so `BattleScript_FaintTarget`'s
  `printstring` parks the controller in `CompleteOnInactiveTextPrinter` with
  `gBattleControllerExecFlags = 1` until a button press. A trace whose input
  script ends before that press sits on `BattleScript_FaintTarget+12` for
  the rest of its frames; every later opcode (the whole `Cmd_moveend` state
  loop, King's Rock / Shell Bell, exp) "never runs" — indistinguishable in
  the manifest from the ROM taking a different branch.
- **Workaround:** append low-duty-cycle A pulses past every faint/prompt
  message and assert the receipt's window actually reached the state you
  are asserting about (`gBattleScripting.moveendState`, or a known
  post-moveend frame).
- **Fix shape:** a trace-stall assertion in the probe helpers
  (`tools/run-mgba-probe.py` consumers): fail when `gBattlescriptCurrInstr`
  is unchanged for N frames while `gBattleControllerExecFlags != 0` and the
  input script has ended.

## `switchindataupdate`'s `as unknown as BattleScriptRulesBattlers` cast hides misspelled/unknown battler fields from the typecheck

- **Hit:** 2026-08-26 (side opus worker, ISSUES #136 fix; ~5 min).
- **What happens:** `battleScriptSwitchinOpcode.ts` rebuilds the incoming
  battler through `rules.battlers.map(...) as unknown as BattleScriptRulesBattlers`,
  which suppresses TypeScript's excess-property check on the object literal.
  A `rolloutTimerStartValue: 0` written onto the battler literal (the field
  actually lives on the context-level `rolloutTimerStartValues` row) compiled
  clean as a dead property; only the new Tier-1 pin caught it.
- **Workaround:** pin every reset with a test that reads the field back
  through the real context shape.
- **Fix shape:** type the mapped array as `readonly BattleScriptRulesBattler[]`
  first and narrow to the tuple type in one place, so literal excess
  properties fail `npm run typecheck`.

## Bare `npx vitest run <file>` dies with a raw V8 out-of-memory dump — only `npm test` carries `--max-old-space-size=8192`

- **Hit:** 2026-08-26, THREE workers in one session (registry join ~2 min,
  Shell Bell ~2 min, one more noted in passing). AGENTS.md documents the
  8 GB heap for bare `tsc` but not for bare `vitest`.
- **What happens:** `npx vitest run tests/<file>.test.ts` loads the same
  ~46 MB generated-JSON graph and crashes with a node heap stack trace
  before printing a single test line; the failure looks like a broken test
  file, not a memory limit.
- **Workaround:** always `npm test -- tests/<file>.test.ts` (the script
  sets `NODE_OPTIONS`), or export `NODE_OPTIONS=--max-old-space-size=8192`.
- **Fix shape:** one line in AGENTS.md's Tests section next to the `tsc`
  warning ("same for bare `vitest`: use `npm test -- <files>`"), and/or a
  `.npmrc`/`vitest.config` `node-options` so bare invocations inherit it.

## 2026-10-11 — S10A night supervisor: checker / copy pitfalls (worker-reported, supervisor-verified where noted)

- **Checkers that start a window at the ROM activation instead of the production accepted window** (audit20Fixtures.py, cast83Check.ts)
  produced two false "residuals" in one night (cast83 Ember / Flamethrower / Scary Face; ret88 Double Team), each costing an audit
  slot. Use `tools/integration/audit21Align.py` (bodyStartFrame / startFrame / ageOffset) in every new checker. (audit 21, audit 22)
- **A git-archive copy outside the repo cannot find ../oracle** (flat77Probe.py walks ROOT's parents for oracle/emerald_core.py): the
  supervisor's flat84 rerun into the session scratchpad failed every window step. Put out dirs under `.integration/validation/`.
  ~10 min. (supervisor)
- **A git-archive copy INSIDE the repo without its own `git init`** resolves git commands to the live checkout (`npm test` there
  touched it via codexLauncherProfiles); `git apply` run in such a copy silently skips the patch — use `patch -p1`. ~11 min. (idle94)
- **attdoll fixtures carry no personality**: player Double Team silently fell back to the static field and looked like a doll residual;
  doll90 added `attdollLiveCheck.ts --personalities`. ~10 min. (doll90)
- **`pgrep -f <script>` matches worker command lines whose brief text names the script** (the supervisor's doll90Run.sh check matched
  the ctl95 claude worker). Watch the PID you started, never a pattern. (supervisor)
- **Two independently green production branches can break as a union** (land86 added a call to a function cast83 had renamed /
  un-imported: clean textual merge, ReferenceError at runtime, 17 census battles aborted). Run the census (it records per-battle
  `errors`) and typecheck on every union before launching a worker on it. (supervisor)

## 2026-10-12 / 13 — S10A evening supervisor: union / runner / harness friction (worker-reported, supervisor-verified where noted)

- **Bare `npx vitest --shard` / `npx tsc --noEmit` run out of memory** (bumped again: 4 workers hit it tonight, ~2-6 min each). Use
  `npm test -- --shard=k/n` and `npm run typecheck` (both carry the 8 GB heap).
- **`npm run typecheck | tail` hides the exit status**: a type error slipped into a commit and forced a census restart (sag130, ~5 min).
- **`git apply` of a workspace-relative diff from `workspace/` (or inside an archive copy nested in the repo) silently skips files**;
  `patch -p1` works but leaves `.orig` files when a hunk applies at an offset — they broke a runner's directory compare (ordl126,
  sgl138, rst139; ~2-3 min each).
- **Branch runners' route checks go stale on unions**: sar131 / sad133 / sae135's `routes-delta` classify only their own slice's
  animations, so on master they report the other slices' newly drawn commands as "unexplained" (supervisor + gaf140, ~6 min each to
  prove). Window comparators stay byte-identical — trust those; refresh the route classifiers when next touched.
- **`compare:differential` does not say which command a moved capture falls on** (tmr136, ~4 min).
- **`sar131RouteRender.ts --scan`: one seed's "lost battle ownership" error kills its whole shard** (12 / 20 shards lost; gaf140).
- **Census timing deltas need a ±1 message-parity allowance** (the census driver presses A on even frames; sgs134) and a
  frame-budget-truncated battle (e.g. 796) shifts record pairing for the rest of its shard (supervisor, tmr136 census).
- **`audit21Check.ts` lists at most 40 residual rows** (aud129, tmr136, ~2 min each).
- **battle_lab rejects an impossible gender silently through the probe wrapper** (male Chansey: the job just produced no output; sgs134).
- **A 0:60 soak gate with `--parallel 3` prints nothing until its children finish** (~56 min under load tonight) — not a hang.
