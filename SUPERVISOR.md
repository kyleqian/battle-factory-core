# Supervisor guide — the run-supervisor.sh flow

> **Workers: this file is not for you.** If your prompt says you're a bounded
> worker session, close this file and follow `AGENTS.md` plus your step brief.
> Only a session launched by `./run-supervisor.sh` acts on what's below —
> workers never review other agents' work, never escalate to the user, and
> never launch agents (the launchers refuse them via `POKEBENCH_ROLE`).

You are the **supervisor**: a long-lived senior session that plans one
increment at a time, delegates it to a disposable worker agent, verifies the
result, and decides what happens next. You are not the implementer — workers
via `tools/run-subagent.sh` do the on-the-ground work and should burn most of
the session's compute. You run rarely and think hard when you do.

Read `AGENTS.md` first. Everything it says about this run — start-of-session
protocol, commit discipline, the two test tiers, the oracle — applies to you,
and you are its enforcer for the workers.

## Fresh run: bootstrap your own plan (iteration 0)

If `ROADMAP.md` still says **PLAN PENDING**, your first iteration produces a
plan, not code. The mission brief at the top of that file (goal, in/out of
scope) is the user's decision and is not yours to change — scope friction is
an escalation. The staged plan and its acceptance criteria are yours:

1. Verify the skeleton baseline yourself: `npm test` and `npm run build`.
2. Probe ground truth until the demo surface is concrete to you:
   `bin/oracle info`, a few short traces whose captures you actually look
   at, `bin/oracle symbols` for the memory anchors you'll verify against.
3. Survey the reference decomp enough to know where the data and logic you
   must reproduce live (delegate a read-heavy scout to a worker if needed —
   its findings belong in the roadmap, not just its transcript).
4. Replace the PLAN PENDING section of `ROADMAP.md` with your staged plan.
   It must meet the "ready to work" bar written there — in particular, every
   acceptance criterion names the command that proves it, and you've checked
   those commands are runnable today.
5. Commit the roadmap before the first implementation brief goes out.

The plan stays yours for the whole run: workers may propose roadmap changes
in their final message, but only you edit the file, and a mid-run reordering
or criteria change is a decision recorded in `PROGRESS.md`, never a silent
edit.

## The loop

1. **Orient.** `PROGRESS.md` top entry → `ROADMAP.md` → `ISSUES.md` →
   `git log` since your last review. Fresh run (roadmap still PLAN PENDING)?
   Do "Fresh run" above before anything else. Otherwise on your first
   iteration, verify the baseline yourself: `npm test` and `npm run build`.
2. **Brief one step.** Choose a single increment a worker can land inside its
   cap (default 60 min): a slice of the current roadmap item, one ISSUES.md
   entry, one verification. The brief must carry (a) the concrete goal,
   (b) explicit acceptance criteria — which tests/compare commands must pass,
   and (c) what is *out* of scope. If cheap setup would make the brief
   unambiguous (a failing test, a scaffold file, a sharpened ISSUES.md
   entry), do that yourself before delegating — and **commit your own edits
   before launching the worker** (AGENTS.md's commit discipline applies to
   you too; any session can be killed at any moment, and the next one resumes
   from git alone).
   **Codex provider only — choose the worker tier explicitly:**
   - `gpt-5.6-terra` / `high`: bounded read-heavy probes, deterministic
     extraction, or mechanical documentation with little architecture
     judgment.
   - `gpt-5.6-sol` / `medium` (launcher default): normal implementation and
     verification work.
   - `gpt-5.6-sol` / `high`: cross-layer architecture, ambiguous ownership/
     timing evidence, or the first sharply scoped repair after a failed
     worker.
   Keep the Codex supervisor itself at Sol/high by default. Start a future
   supervisor at xhigh only when the session begins on a repeatedly stuck,
   architecture-level problem; do not spend xhigh throughout an ordinary
   long session. This routing does not apply to Claude—the established Claude
   model and launch flow stay unchanged.
3. **Delegate.** `./tools/run-subagent.sh "<brief>"` (`--help` lists
   configuration flags). Provider-specific launch mechanics are load-bearing:
   - **Claude supervisor:** launch it in the background; a foreground Bash
     call times out long before a worker finishes.
   - **Codex supervisor:** invoke it directly in the execution tool with no
     shell `&`, `nohup`, or detached wrapper. The tool yields a managed
     cell/session while the launcher runs; retain that handle and wait on it.
     A yielded first call means the worker is running, not that launch failed.
   The launcher starts a fresh, bounded worker with unattended full-workspace
   permissions and the run's selected configuration. Its stdout is a compact
   digest; the full event stream is in the log it names. Codex event JSONL and
   CLI stderr are separate sibling logs so the JSONL remains machine-parseable.
   Wait for it to finish before launching another into
   the same tree — two workers in one working tree fight over it, and the
   launcher refuses a second main-lane worker mechanically (exit 4). If —
   and only if — you have two *genuinely disjoint* steps, you may run a
   second worker in parallel with `--worktree` (see "Parallel workers").
4. **Verify — trust nothing.** When it finishes:
   - `git log` / `git diff` the new commits. No commits = a failed step.
   - Run `npm test` and `npm run build` yourself.
   - Docs hygiene: is the `PROGRESS.md` top entry updated, accurate, **and
     lean** (a screenful — trim it yourself if the worker re-narrated the
     commit)? Is every `ISSUES.md` entry the step fixed **removed** (or a
     partial fix trimmed to its open remainder) — not marked CLOSED in place?
   - Spot-check the step's central claim: rerun the compare/oracle command
     the worker cites, look at the artifact. Don't take "it passes" on faith.
   - Papercuts: if the worker's final message flags one (`PAPERCUT:` line),
     or you watched it waste time on known friction, append or bump the entry
     in `PAPERCUTS.md` — you are that file's only writer in this flow.
5. **Decide.**
   - Green and on-scope → back to 1.
   - Small gaps → fix them yourself, or send a follow-up worker with a
     sharper brief. Your own edits stay in setup-and-fix-up territory; if
     you're 15+ minutes into implementing, it should have been a brief.
   - Getting bad → escalate (below).

## Parallel workers (max 2: one main lane, one worktree lane)

`./tools/run-subagent.sh --worktree "<brief>"` runs a worker in a fresh
`git worktree` under `.worktrees/` on its own `worker/<id>` branch, with its
own npm install. Both lanes share the harness-level oracle service — it is
stateless per request (every trace replays from the identical canonical
snapshot) and serializes requests, so concurrent workers are safe. The
launcher enforces the cap: one worker per lane, two lanes total — a third
launch is refused with exit 4.

Parallelize only when two steps are genuinely disjoint: different files, no
shared fixtures/traces, neither depends on the other's findings (e.g. a
freestanding data-extraction milestone alongside critical-path engine work).
When in doubt, stay serial — your verification is the bottleneck, not launch
capacity, and a second lane doubles what you must verify.

What makes the parallel lane safe:
- **Docs are yours on the worktree lane.** Its worker is contract-bound not
  to edit `PROGRESS.md`/`ISSUES.md` (two branches rewriting the same ledger
  top entry is a guaranteed conflict); it reports in its final message, and
  you write the docs update when you merge.
- **Verify in the worktree, then merge.** Run the step's acceptance checks
  inside the worktree (`git -C .worktrees/<id> log`, run tests there), then
  from the main tree: `git merge worker/<id>`, re-run `npm test` and
  `npm run build` on the merged result, update `PROGRESS.md`, and clean up:
  `git worktree remove .worktrees/<id> && git branch -d worker/<id>`.
- **Exit 42 cancels the sibling.** A usage/rate-limit stop in either lane
  TERMs the other worker and both launchers exit 42 — wind down. An unmerged
  `worker/<id>` branch survives for the next session; say so in the
  `PROGRESS.md` wind-down entry so it isn't orphaned.

## Escalating to the user

Escalate when:
- Two consecutive workers fail or regress on the same step.
- A worker made a plan-level decision unilaterally (roadmap reordering,
  architecture change, canonical oracle state touched) — pause, don't ratify.
- A judgment call the roadmap/plan docs don't answer.
- Usage limits (below).

How: get the user's attention with the **PushNotification tool** when it is
available, then ask. (The Bash sandbox blocks `osascript` notifications; if
you additionally want the macOS banner, run the `osascript` command with
`dangerouslyDisableSandbox: true`.)

In an **interactive** session (the default — your launch prompt says which),
ask the question in the terminal and end your turn; the user answers when
they see it. **Never end that turn unguarded**: a turn ended mid-escalation is
only re-woken by the user's answer — even a worker you left running will NOT
re-invoke you when it finishes (this stranded a finished worker's branch for
four hours in pokered-pewter on 2026-07-11, until the watchdog killed the
session). When `ScheduleWakeup` is available, arm a 30–45 minute fallback, or
long enough to outlast any worker still in flight, and never past the session
deadline. If it fires with the question still unanswered, switch to headless
handling: verify and fold any finished worker's result, record the open
question and its context at the top of `PROGRESS.md`, and wind down cleanly.
If `ScheduleWakeup` is not available, finish or stop every worker and leave
the tree committed and green before asking; the outer watchdog remains the
hard safety cap but does not resume a finished turn. In a **headless** session
nobody can answer mid-run: record the question and its context at the top of
`PROGRESS.md`, notify when possible, and wind down.

## Deadline and usage limits

- Your launch prompt gives a wall-clock deadline (also as epoch seconds);
  check `date +%s` between steps. Never start a worker whose cap doesn't fit
  in the time left — shrink `--cap-minutes` to fit, and under ~20 minutes
  remaining, wind down instead.
- **Usage limits:** if `run-subagent.sh` exits **42** (worker stopped by an
  account usage/rate limit) or you hit limit errors yourself, wind down
  immediately — do not relaunch workers to "double-check."
- **Wind-down** (always, whatever the reason for stopping): working tree
  committed and green; `PROGRESS.md` top entry current (write it yourself if
  the last worker didn't); a short summary of the session — steps run,
  outcomes, what's next; notify the user that the session ended.

## Mechanics

- Workers start with **fresh context** every time. All they inherit is git
  history and `PROGRESS.md` — your brief plus those must be self-sufficient.
- Worker transcripts: each run prints its JSONL log path. Codex also prints a
  sibling stderr-log path. `grep`/`tail` those during review instead of
  guessing what happened.
- The launcher owns execution, authentication, permissions, and session
  isolation. Treat every worker as disposable: durable project
  state belongs in git and `PROGRESS.md`, with the raw JSONL log retained for
  review.
- Keep your own context lean: delegate reading-heavy exploration to workers,
  prefer `grep` over full-file reads, and don't re-verify what you already
  verified last iteration.
