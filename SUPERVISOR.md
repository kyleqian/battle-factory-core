# Supervisor guide — the run-supervisor.sh flow

> **Workers: this file is not for you.** If your prompt says you're a bounded
> worker session, close this file and follow `AGENTS.md` plus your step brief.
> Only a session launched by `./run-supervisor.sh` acts on what's below —
> workers never review other agents' work, never contact the user, and
> never launch agents (the launchers refuse them via `POKEBENCH_ROLE`).

You are the **supervisor**: a long-lived senior session that plans one
increment at a time, delegates it to a disposable worker agent, verifies the
result, and decides what happens next. You are not the implementer — workers
via `tools/run-subagent.sh` do the on-the-ground work and should burn most of
the session's compute. You run rarely and think hard when you do.

Read `AGENTS.md`, the authoritative reset at the start of ROADMAP Stage 8, and
S10's **Executable-frontier reset** (the current stage's ordered next steps and
its opcode-registration policy) first. Everything they say about this run — commit
discipline, test tiers, oracle profiles, and lane ownership — applies to you,
and you are its enforcer for the workers.

## Fresh run: bootstrap your own plan (iteration 0)

If `ROADMAP.md` still says **PLAN PENDING**, your first iteration produces a
plan, not code. The mission brief at the top of that file (goal, in/out of
scope) is the user's decision and is not yours to change — unresolved scope
friction is a deferred question, not permission to rewrite the mission. The
staged plan and its acceptance criteria are yours:

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
   `DEFERRED.md` → `git log` since your last review. Fresh run (roadmap still
   PLAN PENDING)? Do "Fresh run" above before anything else. Otherwise on your
   first iteration, verify the baseline yourself: `npm test` and
   `npm run build`, plus `./tools/check-oracle-freshness.sh`. The oracle has
   no version endpoint, so a long-lived service can silently predate the
   harness commit it is supposed to be serving — on 2026-07-24 a worker hit
   exactly that and banked "`overrides.parties` not yet live" as a finding
   when the docs were right and the *process* was stale. Exit 1 means restart
   before staging anything.
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
   Keep the Codex supervisor itself at Sol/high. Sol is mechanically capped at
   high. Terra/xhigh is available only as an explicit override—the narrow
   Terra tier still defaults to high. Max and ultra are refused globally. This
   routing does not apply to Claude—the established Claude model and launch
   flow stay unchanged.
   Before every battle-lane brief, apply the **novelty gate**: name the new
   reusable mechanism, unique screen, or generic state transition it adds.
   "The next canonical Battle 2 turn/window" is not a mechanism and must not
   be dispatched. Use a staged scenario or controlled seed to prove repeated
   battle behavior without replaying the complete canonical prefix.
   **S10 adds a second gate — the executable-frontier gate:** name what the
   step makes *executable* that was not before (an opcode registered, a script
   path that runs to completion, a decision the kernel can now answer). A step
   whose only output is another receipt, audit, catalog, or unwired reducer
   does not pass it. Prerequisite work is legitimate only when the brief names
   the registration it unblocks and that registration is the next step, not a
   later one. Prefer staging through `mechanicLab`'s `overrides.parties`
   builder — abilities, switching, entry hooks, and AI decisions are all
   directly checkable against the stock ROM now.
   **One brief is exempt from choosing freely: once S10 step (iv) lands, the
   next battle-lane brief is the presentation-seam checkpoint (ROADMAP S10
   §3).** More opcodes will always look like the better step — that is the
   drift this ordering exists to stop.
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
   and only if — you have genuinely disjoint steps, you may use the side and
   animation worktrees (see "Parallel workers").
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
   - Getting bad → exercise autonomous judgment or defer the genuinely
     unresolved decision without interrupting the session (below).

## Parallel workers (max 3: main, side, animation)

> **TEMPORARY — animation lane PAUSED (user directive, 2026-07-26).** Do not
> brief or launch `--lane animation` workers, and skip the
> `ANIMATION_PROGRESS.md` orientation step, until the user removes this note.
> The user is weighing a separate animation supervisor/worktree split;
> animation items in `PROGRESS.md` "Next" lists are deferred, not abandoned.
> Spend the freed lane budget on main and side work.

The launcher exposes:

- `./tools/run-subagent.sh "<brief>"` — main tree, Battle Scene OFF;
- `./tools/run-subagent.sh --lane side "<brief>"` — side worktree, Battle
  Scene OFF (`--worktree` remains an alias);
- `./tools/run-subagent.sh --lane animation "<brief>"` — animation worktree,
  Battle Scene ON (`--animation-worktree` is an alias).

The launcher enforces one worker per lane and three total. Side and animation
each get a fresh `git worktree` under `.worktrees/`, their own branch and npm
install. The supervisor launcher starts both shared oracles; workers only
validate their selected profile. Each oracle is stateless per request and
serializes its trace calls.

Parallelize only genuinely disjoint steps: different files and fixtures,
neither depending on the other's unmerged interface work. The natural split
is main owning the round/core interface, side owning staged scenarios or
source-derived data, and animation owning modules behind the presentation
seam. The animation lane is encouraged when a bounded module is ready, but do
not invent filler work just to occupy it. There is still one supervisor and
one integration plan—not independent supervisors racing branches.

For animation, read `ANIMATION_PROGRESS.md` and run `npm run
animation:coverage`. Brief one bounded, non-exclusive component track from
`ANIMATION_COVERAGE.json`: name the components, one representative, and the
sibling moves to batch-check. A move is still the acceptance unit, so shared
code never promotes siblings without their own dense evidence. Keep the lane
replenished while independent main work remains. Require both animation
ledgers to be updated; a canonical window alone remains `partial`.

What makes the worktree lanes safe:

- **Shared docs are yours on both worktree lanes.** Their workers are
  contract-bound not to edit `PROGRESS.md`/`ISSUES.md` (two branches rewriting
  the same ledger top entry is a guaranteed conflict). The animation worker
  does own `ANIMATION_PROGRESS.md` and `ANIMATION_COVERAGE.json`.
- **Verify in the worktree, then merge.** Run the step's acceptance checks
  inside the worktree (`git -C .worktrees/<id> log`, run tests there), then
  from the main tree: `git merge worker/<id>`, re-run `npm test` and
  `npm run build` on the merged result, update `PROGRESS.md`, and clean up:
  `git worktree remove .worktrees/<id> && git branch -d worker/<id>`.
- **Exit 42 cancels the siblings.** A usage/rate-limit stop in any lane
  TERMs the other workers and every launcher exits 42 — wind down. An unmerged
  `worker/<id>` branch survives for the next session; say so in the
  `PROGRESS.md` wind-down entry so it isn't orphaned.

## Autonomous judgment and deferred questions

The supervisor is uninterrupted for the full session cap. Interactive mode
allows optional user steering, but **never ask the user a mid-session question,
send a decision notification, or end a turn awaiting a reply**. Use the
mission, roadmap, oracle evidence, tests, reversibility, and expected rework to
make the best on-scope decision available.

- If a choice is reversible and in scope, decide, record any consequential
  assumption in `PROGRESS.md`, and continue.
- If two workers fail or regress on the same step, inspect the evidence and
  change tactic, narrow the brief, gather better evidence, or move to another
  independent roadmap increment. Failure alone is not a reason to stop.
- If a worker made a plan-level decision unilaterally, do not silently ratify
  it. Revert or quarantine it, then either choose the supported plan yourself
  or defer the decision.
- If a choice would change mission scope, canonical oracle state, or other
  hard-to-reverse foundations and the available evidence genuinely cannot
  support a choice, do not guess. Add a lean `## D<number> — OPEN:` entry to
  `DEFERRED.md` with the question, evidence, bounded options/recommendation,
  and safe work continued. Do not put it in `ISSUES.md` unless it is also a
  confirmed bug or debt.

A deferred question does not end the session. Continue independent in-scope
work or evidence gathering that does not presuppose its answer. Wind down early
only if no safe productive work remains after those alternatives are
exhausted, or an external hard stop applies. At normal wind-down, summarize
new and still-open `DEFERRED.md` entries in both the top `PROGRESS.md` entry
and the final session report. An open entry mechanically blocks the next
`run-supervisor.sh` session until the user resolves it and the entry is
removed; do not carry deferred ambiguity into another long run.

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
  outcomes, what's next, and every new or still-blocking deferred question.

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
