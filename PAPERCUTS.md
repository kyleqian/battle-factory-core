# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.
Delete an entry when its underlying friction is fixed; git preserves its
history.

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

## Shell command substitution mutates inline worker briefs

- **What:** Markdown backticks embedded in a double-quoted
  `run-subagent.sh` brief were evaluated by the shell as commands, stripping
  two source paths before launch and requiring an immediate clean relaunch.
- **Hits:** 1.
- **Cost each:** ~1 min.
- **Workaround:** use plain path text or a `--brief-file`; never place
  backticks or `$()` inside a shell-interpolated brief argument.

## Explicitly read-only workers fail the commit-required postflight

- **What:** a bounded supervisor audit was explicitly told to make no edits or
  commits and returned a complete report from a clean tree, but
  `run-subagent.sh` still exited 5 because the Codex worker produced no commit
  (and misleadingly appended an authentication hint).
- **Hits:** 1.
- **Cost each:** ~1 min.
- **Workaround:** treat the report as usable after independently confirming
  the clean tree; use a normal execution session for future read-only audits
  until the launcher distinguishes audit success from missing implementation.

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

## Default Python lacks the mGBA probe dependencies

- **What:** invoking a fresh mGBA probe with the shell's default `python3`
  fails at import time because it lacks `cffi`, even though the repository's
  wrapper and probe are otherwise valid. Third hit (2026-07-25): a worker
  lost ~8 min rediscovering the venv path via `ps aux` because it is
  documented only here, not in AGENTS.md/README.
- **Hits:** 3.
- **Cost each:** ~3 min.
- **Workaround:** invoke both `tools/run-mgba-probe.py` and its nested probe
  with `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python3`.

## Supervisor launcher option names are easy to misaddress

- **What:** supervisor briefs used the conceptual lane names
  `side-worktree`/`animation-worktree` and common-looking `--reasoning` and
  `--brief` options, while `run-subagent.sh` accepts `--lane side|animation`,
  `--effort`, and a positional brief or `--brief-file`. Each mismatch required
  a failed launch and help lookup before the bounded worker could start.
- **Hits:** 3.
- **Cost each:** ~1 min.
- **Workaround:** run `tools/run-subagent.sh --help` before the first launch of
  a supervised session and use the launcher’s exact option spellings.

## Broad source search descends into generated minified bundles

- **What:** an Uproar ownership audit searched broadly enough to enter a
  generated minified index, producing noisy output and obscuring the relevant
  source call sites.
- **Hits:** 1.
- **Cost each:** ~1 min.
- **Workaround:** scope `rg` to `src/`, `tests/`, and the exact reference
  source directories, or add generated/bundle globs to the exclusion list.

## Foreground oracle restart floods the execution transcript

- **What:** starting `run-oracle.sh` directly in a retained PTY streams
  hundreds of kilobytes of routine mGBA diagnostics both at bootstrap and
  teardown, obscuring the service-ready and shutdown signals.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** launch the retained foreground service with stdout/stderr
  redirected to a named `/tmp` log, then poll `/v1/info` for readiness and
  retain only the process handle for shutdown.

## Serialized oracle compares can strand or terminate multi-trace batches

- **What:** launching several oracle-backed compares concurrently can leave a
  call unresolved or race on the shared `tools/compare/out/latest`, while long
  serialized shell batches can terminate mid-command even though their
  individual traces are healthy.
- **Hits:** 4.
- **Cost each:** ~1-3 min.
- **Workaround:** run short bounded batches, retain and poll every execution
  handle, and resume from the first unverified trace after an interruption.

## Scene-ON battle-lab HTTP route is unavailable

- **What:** the Scene-ON service answers canonical oracle requests but returns
  404 for the battle-lab route, so two animation workers had to discover and
  switch to the local mGBA battle-lab probe path.
- **Hits:** 3.
- **Cost each:** ~2-5 min.
- **Workaround:** use the committed local mGBA probe/comparator for Scene-ON
  mechanicLab fixtures until the service exposes the additive route.

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
- **Hits:** 1.
- **Cost each:** ~8 min.
- **Workaround:** split each outcome/control into a fresh
  `run-mgba-probe.py` wrapper invocation and merge only the concise evidence.

## `bin/oracle run` always prints the full capture manifest

- **What:** targeted oracle probes with dense captures flood the terminal with
  the complete manifest even when only the written artifacts are needed.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** redirect successful oracle stdout to `/dev/null` and inspect
  the named manifest or RAM probe output directly.

## ImageMagick unavailable for raw-frame inspection

- **What:** an animation probe expected ImageMagick for converting raw RGB
  frames, but it is not installed in the run environment.
- **Hits:** 2.
- **Cost each:** ~1 min.
- **Workaround:** use the available `ffmpeg` rawvideo conversion path.

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

## Oracle-probe vs appTrace frame numbering ambiguity (~2x time cost, 2026-07-17)

Two S4 workers independently lost time reconciling "press-tick N" labels
from direct `bin/oracle run` probes with `tools/compare/appTrace.ts`'s
frame counter when building dense traces of a fresh interaction. Worth a
one-paragraph clarification (worked example: a 2-frame press at trace
position K and which captureFrames index shows its first visible effect)
in ROADMAP.md Domain notes or a doc both cite. Flagged by the S4 renderer
worker (PROGRESS entry 13).

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
- **Hits:** 1 (first time observed; the supervisor has committed
  mid-worker several times this session without a report, so the window
  is narrow).
- **Cost each:** ~2 min of investigation; the real risk is larger — a
  worker running `git add -A` mid-supervisor-edit could sweep the
  supervisor's uncommitted docs into its own commit.
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

## ram-probe.py path vocabulary can't extract sub-byte bitfields (2026-07-20)

- **What:** the multi-hop `"path"` spec (added 2026-07-20) reads whole
  bytes/words only — no shift-and-mask step — so OAM bitfields like
  `paletteNum` can't be probed directly; the switch-in scout had to
  drop its materialize-tint verification rather than extend the tool
  mid-task.
- **Hits:** 1.
- **Cost each:** ~5 min + one dropped verification goal.
- **Workaround:** probe the containing u16 and decode in the analysis
  script; or a future session adds a `{"op":"mask","shift":N,"mask":M}`
  step to the path vocabulary (small, backward-compatible).

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

## Dense-comparator harness reports only the first mismatched frame's bbox

- **What:** the portable dense comparators (`growthPortable.ts`,
  `futureSightPortable.ts` and siblings) print a whole-window match count
  but bbox/px-dump only the FIRST diff frame — a window carrying two
  distinct defect families read as one "confined to the attacker box"
  residual until a bespoke per-frame scratch sweep separated them
  (2026-07-25 FUTURE_SIGHT rung 5). Two prior workers also hand-wrote
  throwaway PNG-diff/crop scripts for the same need (GROWTH rungs 4-5).
- **Hits:** 3 (same session).
- **Cost each:** ~10-15 min of bespoke scratch scripting per residual hunt.
- **Workaround:** copy `tools/compare/scratch/future-sight-per-frame-bbox.ts`
  as the starting point; a shared `--per-frame-bbox` flag on the portable
  harness template would retire this.

## `bin/oracle lab` with no `-o` writes untracked `battle-lab-output/` into the tree

- **What:** running `bin/oracle lab <scenario>` without an explicit `-o`
  drops its captures into `battle-lab-output/` at the invoking tree's root,
  which is not gitignored — it shows up in `git status` and must be
  manually removed before committing (worktree workers notice it while
  staging their own commits).
- **Hits:** 1 (2026-07-26 evening, §24 Evasion scout).
- **Cost each:** ~2 min.
- **Workaround:** always pass `-o` to a scratch path; adding
  `battle-lab-output/` to `.gitignore` would retire this.

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

## Historical turn-N traces route to the Scene-ON oracle by design — scouts keep rediscovering it
- **What:** the `turn*-*.json` presentation-trace family predates the
  `oracleProfile` field, so `npm run compare` routes them to Battle Scene
  ON (8012) per AGENTS.md's documented legacy contract ("historical traces
  without that field remain ON-profile so their established frame contract
  does not silently change"). Forcing 8014 drops e.g.
  `turn13-sandattack.json` to 78/190 — structural, not drift. Every
  established turn-N acceptance count is an ON-profile bar, intentionally.
- **Hits:** 1 (§15 scout, 2026-07-27, ~10 min re-deriving this before
  finding the AGENTS.md paragraph).
- **Cost each:** ~10 min.
- **Workaround:** briefs citing turn-N acceptance counts should say
  "profile-routed (ON for this family)" instead of naming a port; a
  one-line banner in docs/presentation-seam-scout.md's intro would stop
  the rediscovery loop at the doc every scout reads first.
