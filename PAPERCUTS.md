# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.
Delete an entry when its underlying friction is fixed; git preserves its
history.

Per entry:
- **What:** the friction.
- **Hits:** how many sessions it has bitten.
- **Cost each:** rough minutes lost per hit.
- **Workaround:** the current dodge, if any.

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
  wrapper and probe are otherwise valid.
- **Hits:** 1.
- **Cost each:** ~3 min.
- **Workaround:** invoke both `tools/run-mgba-probe.py` and its nested probe
  with `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python3`.

## Serialized oracle compares can strand or terminate multi-trace batches

- **What:** launching several oracle-backed compares concurrently can leave a
  call unresolved or race on the shared `tools/compare/out/latest`, while long
  serialized shell batches can terminate mid-command even though their
  individual traces are healthy.
- **Hits:** 3.
- **Cost each:** ~1-3 min.
- **Workaround:** run short bounded batches, retain and poll every execution
  handle, and resume from the first unverified trace after an interruption.

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
