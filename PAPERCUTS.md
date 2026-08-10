# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.
Delete an entry when its underlying friction is fixed; git preserves its
history.

## `check-oracle-freshness.sh` compares against harness HEAD, not the last `oracle/` commit

- **What:** the script FAILs (exit 1) whenever an oracle process started before
  the current harness HEAD commit — regardless of whether that commit touched
  `oracle/` at all. At 2026-08-08 orient both services failed the check against
  harness HEAD `2328682`, a `_template`-only commit; `git log --since` showed
  **zero** commits touching `oracle/` since either process started, so both were
  serving byte-identical code. The check is a commit-date heuristic wearing the
  clothes of a schema check.
- **Hits:** 1.
- **Cost each:** ~5 min to disprove, plus a genuine near-miss: the documented
  response is "restart it before staging anything", and restarting port 8012
  would have killed the animation lane's live worker mid-round.
- **Workaround:** before believing a FAIL, run
  `git -C ../.. log --oneline --since=<process start date> -- oracle/`. Empty
  output means the process is current and the failure is spurious.
- **Real fix:** compare the process start time against the last commit that
  touched `oracle/`, not against harness HEAD.

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
- **Hits:** 1.

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
- **Hits:** 10 (2026-08-02 late: slice-3 worker's ~8.5 min suite — cross-lane
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
  redirected-log passes; ~5 min lost.)
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
- **Hits:** 1.
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
- **Hits:** 2.
- **Cost each:** ~4.5 min average.
- **Workaround:** split each outcome/control into a fresh
  `run-mgba-probe.py` wrapper invocation and merge only the concise evidence.
- **2026-08-08 note:** the three-case construction-clock probe still needed
  the wrapper to contain teardown SIGSEGV/log spew; the fresh-output validation
  worked, but added ~1 min.

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
- **Hits:** 1 (2026-07-29, absorption-reveal worker).
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
- **Hits:** 1 (as a worker-facing papercut; the trap class itself is
  previously known).
- **Cost each:** ~5 min.
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
handoff by about 7–9 minutes per lane. Hits: 2. A launcher-level full-suite
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
Hits: 5; cost: about 40 minutes plus avoidable CPU contention. A
launcher/tool response that visually distinguishes “still running; wait on
this handle” from completion would prevent this class of mistake.

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
legacy allowlist. Hits: 1; cost: about 5 minutes. A compare trace with no
route should fail with an actionable ambiguity error when both routes exist.

## `npm run soak -- --help` silently starts the default 0:50 sweep

- **What:** the soak CLI has a detailed usage comment but no `--help` branch.
  Asking for help therefore ignores the flag and starts the default 50-seed
  full-policy run. The supervisor caught and stopped it only after it had
  already consumed several seeds.
- **Hits:** 1.
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
- **Hits:** 1 (supervisor verification, 2026-08-10 ~00:45).
- **Cost each:** ~5 min.
- **Workaround:** prefix targeted runs with
  `NODE_OPTIONS=--max-old-space-size=8192`.
- **Real fix:** move test-only JSON out of the resolveJsonModule graph (the
  known ~650 MB relief in AGENTS.md), or add a vitest config-level
  heap guard.
