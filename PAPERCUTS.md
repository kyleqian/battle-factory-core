# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.

Per entry:
- **What:** the friction.
- **Hits:** how many sessions it has bitten.
- **Cost each:** rough minutes lost per hit.
- **Workaround:** the current dodge, if any.

## Worker-lane lifecycle can take down shared oracle profiles (2026-07-23)

- **What:** both Battle Scene ON and OFF services disappeared while worker
  lanes were cycling; supervisor compares failed with `ECONNREFUSED` until
  each profile was restarted in a retained direct session.
- **Hits:** 1.
- **Cost each:** ~5 min.
- **Workaround:** check both named profile health after lane teardown and keep
  replacement service sessions alive through supervisor verification.

## Temporary compare traces resolve `sourceTrace` relative to themselves (2026-07-23)

- **What:** moving an ad hoc trace to `/tmp` broke its relative `sourceTrace`
  reference even though the referenced committed trace still existed.
- **Hits:** 1.
- **Cost each:** ~1 min.
- **Workaround:** keep temporary derived traces beside the committed traces,
  or rewrite `sourceTrace` to a valid path before moving them.

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

## Usage-limit detector matched worker-owned text (2026-07-22)

- **What:** the Codex post-run detector searched whole structured events with
  broad text regexes. It first matched `--no-rate-limit` in a worker's late
  `ps` output, then matched the prior false-positive note when the next worker
  printed `PROGRESS.md`; both workers had completed normally.
- **Hits:** 2.
- **Cost each:** ~3 min plus a premature supervisor wind-down.
- **Fixed 2026-07-23:** parse Codex JSONL structurally and inspect only
  provider `error`/`turn.failed` messages or explicitly denied
  `rate_limit_event` records; unstructured stderr retains the fallback regex.

## compare CLI rejects trace-name shorthand (2026-07-22)

- **What:** `npm run compare` requires the repository-relative trace path;
  passing only the trace filename fails even when it uniquely names a file in
  `tools/compare/traces/`.
- **Hits:** 1.
- **Cost each:** <1 min.
- **Workaround:** pass `tools/compare/traces/<name>.json`.

## run-subagent.sh cap failed to terminate a Codex worker (2026-07-22)

- **What:** a main-lane Codex worker launched with `--cap-minutes 38` was
  still alive after 46 minutes, with its event log stale for ~24 minutes.
  Deadline wind-down required the supervisor to interrupt the PTY manually.
- **Hits:** 1.
- **Cost each:** ~24 min of unattended session budget.
- **Fixed 2026-07-22:** Codex workers now run under a dedicated headless
  deadline wrapper in a fresh process group. Timeout or cancellation sends
  TERM, waits 15 seconds, then KILLs the whole group. Claude's established
  launcher path is unchanged.

## Dense oracle boundary inspection needs an ad hoc capture override (2026-07-22)

- **What:** the committed ground-truth trace is intentionally capture-capped,
  but there is no reusable CLI flag to replace its capture list with a dense
  range for boundary inspection; workers must write a one-off TypeScript call
  to `runOracleTrace`, including its in-memory RGBA handling.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** load the trace, replace `captureFrames` in memory, call
  `runOracleTrace`, and compare the returned `rgba` buffers.

## Dense compare output obscures the failure summary (2026-07-22)

- **What:** `npm run compare` prints one line per captured frame, so a
  200-frame dense trace buries the final mismatch summary; piping through
  `tail` then masks the compare's nonzero exit status unless `pipefail` is set.
- **Hits:** 1.
- **Cost each:** ~2 min.
- **Workaround:** run the command unpiped for acceptance and query
  `tools/compare/out/latest/manifest.json` with `jq` for a compact residual
  list.

## dump-battler-full.py struct offsets live only in the script body (2026-07-20)

- **What:** the per-field battler struct offsets (species +0x00, pp
  +0x24, hp +0x28, status1 +0x4C, status2 +0x50, stride 0x58) aren't
  documented anywhere outside the script's own source — deriving a
  one-off address for a field not in the existing watch-spec columns
  means reading the script body first.
- **Hits:** 1.
- **Cost each:** ~3-5 min.
- **Workaround:** read the script body; or a future session adds an
  `--offsets` help dump / a comment table at the top of the script.

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

## Stale `tools/compare/out/` PNGs mislead cross-session debugging (2026-07-18)

The GAP-B worker (PROGRESS #64) initially reasoned from cached diff
images under `tools/compare/out/` that no longer matched the current
code — the directory persists between sessions and `out/latest` only
reflects the most recent `npm run compare` invocation for *whatever
trace* ran last. Cost: a chunk of a 24-min session until a fresh
compare run exposed the staleness.
- **Hits:** 1 (plus unknown silent near-misses; several sessions have
  consulted `out/latest` this week).
- **Workaround:** always re-run `npm run compare` before reading any
  diff PNG; treat `out/` as scratch, never as evidence.
- **Real fix candidate:** have the compare tool write a
  `manifest.json` (trace name, git SHA, timestamp) next to the PNGs
  and/or clear `out/latest` at the start of each run, so stale
  artifacts are self-identifying.

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

## `extract-battle-anim-assets.ts` re-run silently drops `grovyleFrontAnim` (2026-07-19)

- **What:** `battle-anim-tables.json`'s committed `grovyleFrontAnim` field
  is not produced by any code currently in the extractor — re-running the
  script regenerates the file WITHOUT it, silently breaking the front-anim
  cadence until the diff is noticed. A worktree worker caught it in
  `git diff` before committing (§7.25).
- **Hits:** 1.
- **Cost each:** ~5 min (would be far more if committed unnoticed —
  Tier-1 tests would catch the missing field, but attribution would cost).
- **Workaround:** never re-run that extractor without diffing its output;
  proper fix is folding the `grovyleFrontAnim` derivation into the script
  (small, unclaimed follow-up).

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

## run-subagent.sh briefs die on zsh parse when they contain `!(` (2026-07-20)

- **What:** a brief passed inline containing `!(turn3Resolved && ...)`
  killed the launch instantly ("parse error near `&&`") — the background
  command produced only the parse error and no worker ever started. Easy
  to misread as a worker failure.
- **Hits:** 1.
- **Cost each:** ~5 min + one relaunch.
- **Workaround:** write the brief to a file and launch with
  `run-subagent.sh -c N "$(cat brief.txt)"`, avoiding `!(`/history-
  expansion-sensitive characters in inline briefs; a launcher flag that
  reads the brief from a file (`--brief-file`) would remove the class.
