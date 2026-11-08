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

Claude is the only supported provider for both roles (the Codex, DeepSeek and
OpenCode paths, max mode and the animation/rust supervisors were removed in
cln239; see `docs/cln239-launchers.md`):

- `./run-supervisor.sh` — Claude Opus 5.5 supervisor with Sonnet 5.5 workers,
  following the current main roadmap stage;
- `./run-supervisor.sh --headless -S opus -s sonnet -c 10 --log <path>` — the
  unattended form the daily cron uses;
- `./run-supervisor.sh --print-config` prints the resolved profile and exits.

`-S` / `--supervisor` and `-s` / `--sub-agent` accept `claude` or a Claude
model alias (`opus`, `sonnet`, `fable`, `haiku`), which selects Claude and that
exact model in one step. When `-s` is omitted the sub-agent is Claude Sonnet
5.5. Anything else (`codex`, `deepseek`, `opencode`) is rejected.

Read `AGENTS.md`, the latest `PROGRESS.md`, and `ROADMAP.md`'s **Current execution
priority** first. The current stage and its linked detailed guide determine the
mission and acceptance gates. S10A uses `ANIMATION_INTEGRATION_SUPERVISOR.md`
and `ANIMATION_VERIFICATION.md`; their scoped baseline/fold/wind-down policy
supersedes historical blanket full gates and mechanics soak schedules below
for integration work. Stage 8 and S10's **Executable-frontier reset** remain
reference context for work on those mechanics. Everything they say about this run — commit
discipline, test tiers, oracle profiles, and lane ownership — applies to you,
and you are its enforcer for the workers.

**Current finish-up scope, user-approved 2026-10-13:** read
`docs/factory-finish-scope.md`. Remaining Factory animation, presentation and
battle-engine defects are all in scope. Dispatch source-proven mechanics/RNG
corrections through the main/ts lane, with explicit intentional changes and
the gameplay gates below; do not apply the presentation-only soak waiver to
engine changes. Animation/integration workers retain their narrow ownership.
Presentation work preserves logical outcomes; engine fixes establish the same
corrected rules across scene modes. Do not ask again to fix #165 / #141 / #140
/ #139 or necessary shared mechanisms. Audio remains deferred.

`--headless` runs the supervisor non-interactively, streaming progress and saving
event logs. Without it the supervisor uses the interactive terminal interface
where the user can steer it. Both modes use the same mission, worker model,
permissions and six-hour default cap. Headless mode is still local and does not
detach the launcher from its terminal or managed execution session.

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
   **Default Claude workers use Sonnet 5.5.** Inherit the launcher's worker
   profile. Model overrides accept `-m sonnet`, `-m opus`, `-m fable`,
   `-m haiku`, or a full Claude model ID. A Claude supervisor defaults to
   Opus 5.5. Choose a heavier model only on evidence: if a Sonnet worker
   returns a result that does not survive your verification, rebrief the
   same step with `-m opus` and record why in the ledger. The verification
   you run is identical either way.

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
   configuration flags). Supervisor-specific launch mechanics are load-bearing:
   - **Claude supervisor:** launch it in the background; a
     foreground Bash call times out long before a worker finishes. Retain the
     launcher's PID and output path and poll until it exits. The initial shell
     return only means the launcher was started, not that its worker finished.
     **Headless Claude:** never use `Monitor`, `ScheduleWakeup`, or end a turn
     waiting for notifications. Poll retained launcher PIDs/logs in bounded
     foreground calls. `tools/run-claude-supervisor.py` owns the campaign's
     original deadline: if a turn ends early, it waits for worker state to
     change and resumes the same Claude session. It does not restart failed
     requests or account-limit stops. State is recorded next to the raw log
     as `.controller.json`. A genuine clean completion requires the JSON stop
     file named by `POKEBENCH_SUPERVISOR_STOP_FILE`, containing `session_id`
     from `POKEBENCH_SUPERVISOR_SESSION_ID`, `status` (`complete`, `blocked`,
     or `wind_down`) and a nonempty `reason`. No active workers or dirty
     checkout may be left behind; `wind_down` is accepted only in the final
     20 minutes. Never write a stop file merely to wait for workers.
   The launcher starts a fresh, bounded worker with unattended full-workspace
   permissions and the run's selected configuration. Its stdout is a compact
   digest; the full event stream is in the log it names.
   Override the model per step with `-m`, for example
   `./tools/run-subagent.sh -m opus --brief-file /tmp/scout.txt`.

   Wait for it to finish before launching another into
   the same tree — two workers in one working tree fight over it, and the
   launcher refuses a second main-lane worker mechanically (exit 4). If —
   and only if — you have genuinely disjoint steps, you may use the side and
   integration worktrees (see "Parallel workers").
4. **Verify — trust nothing.** When it finishes:
   - `git log` / `git diff` the new commits. No commits = a failed step.
   - Run `npm test` and `npm run build` yourself — **judiciously (user
     directive, 2026-08-03: the full suite is 5-7 min; don't burn it
     redundantly).** Workers still run the full suite as their own
     acceptance gate; between rounds the supervisor runs
     `npm run test:smoke` plus the tests the step touched and trusts the
     worker's same-commit full-suite result unless something is off.
     Docs-only merges need no suite; new-files-only merges need smoke +
     the new files. Run ONE independent full `npm test` + `npm run build`
     at wind-down (and at session start if the baseline is unverified).
   - Docs hygiene: is the `PROGRESS.md` top entry updated, accurate, **and
     lean** (a screenful — trim it yourself if the worker re-narrated the
     commit)? Is every `ISSUES.md` entry the step fixed **removed** (or a
     partial fix trimmed to its open remainder) — not marked CLOSED in place?
   - Spot-check the step's central claim: rerun the compare/oracle command
     the worker cites, look at the artifact. Don't take "it passes" on faith.
   - **Presentation-neutral slices** (a refactor that must not move a pixel —
     the #39 handoff ladder and its kin) are proved with
     `npm run compare:differential -- <traces...> --base <clean parent>`:
     it replays each trace's captureFrames against both this tree and a clean
     checkout of the parent and byte-compares the raw RGBA, removing its own
     worktree afterwards. If the slice added `appTrace` stage ids, add
     `--harness-from-head` (dif256): it overlays the working tree's
     `tools/compare/appTrace.ts` closure (tools/ only, never src/) onto the base;
     it fails naming the export if the new stages need new src/ exports. Brief the exact command and trace list rather than
     letting each worker rebuild the recipe by hand — that ad-hoc version was
     a standing papercut and leaked orphaned worktrees for weeks. A green
     differential means "nothing visible changed", NOT "correct" — pair it
     with `npm run compare` against the oracle whenever behavior should move.
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

## Parallel workers (max 3: ts, side, integration)

The launcher exposes:

- `./tools/run-subagent.sh "<brief>"` — main tree, Battle Scene OFF;
- `./tools/run-subagent.sh --lane side "<brief>"` — side worktree, Battle
  Scene OFF (`--worktree` remains an alias);
- `./tools/run-subagent.sh --lane integration "<brief>"` — integration
  worktree, Battle Scene ON.

The launcher enforces one worker per lane and three total. Side and integration
each get a fresh `git worktree` under `.worktrees/`, their own branch and npm
install. The supervisor launcher starts both shared oracles; workers only
validate their selected profile. Each oracle is stateless per request and
serializes its trace calls.

Parallelize only genuinely disjoint steps: different files and fixtures,
neither depending on the other's unmerged interface work. The natural split
is main owning the round/core interface and side owning staged scenarios or
source-derived data. You integrate every lane on the supervisor branch yourself.

What makes the worktree lanes safe:

- **Shared docs are yours on both worktree lanes.** Their workers are
  contract-bound not to edit `PROGRESS.md`/`ISSUES.md` (two branches rewriting
  the same ledger top entry is a guaranteed conflict). Integration workers read
  `ANIMATION_INTEGRATION_BRIEF.md`, `ANIMATION_INTEGRATION_PROGRESS.md` and
  `ANIMATION_VERIFICATION.md`; `tests/animation/animationBoundaryRatchet.test.ts`
  pins the engine/animation import boundary.
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

## Communicating with the user

Speak plain English — no internal jargon (slices, ranks, folds,
differentials). Anchor updates to the overall roadmap: what works in the
game, what's broken, and roughly where the current milestone stands. Offer
progress when it's clear, and keep it brief. Internal ledgers and briefs
keep their precise technical voice.

**Write user reports in Simplified Technical English (ASD-STE100; user
directive, 2026-08-06):** short sentences (about 20 words maximum), one
idea per sentence, active voice, simple common words; keep technical names
unchanged. This governs how the plain-English rule above is written, for
every user-facing report including wind-down summaries.

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
- **Wind-down soak gates (standing, user-directed 2026-08-09; restated here
  2026-08-10 after two sessions skipped it; extended to four gates by user
  decision 2026-08-22):** run
  `npm run soak -- --policy vanilla --seeds 0:20` (must stay **20/20 OK**),
  `npm run soak -- --seeds 0:60`,
  `npm run soak -- --policy winning --seeds 0:60`, and
  `npm run soak -- --policy winning-swap --seeds 0:60`, and record all four
  counts in the wind-down `PROGRESS.md` entry. `vanilla` is the rigid
  single-trajectory canary; `winning`/`winning-swap` are the seed-diverse
  deep gates (round wins + the swap screen). This is the playable-path
  regression gate; a docs-only session may skip it, any session that folded
  engine/`src` changes may not. Full policy text: ROADMAP S10 block "Soak +
  evidence policy".
- **Varied-RNG crash-coverage gate (FIFTH standing gate; user-adopted
  2026-08-24, shape pinned the same day after ISSUES #122/#123 closed):**
  in addition to the four UNVARIED gates above, run these four sweeps and
  record all four counts — each must stay **100/100 OK** (`budget`-ended
  seeds count as OK; they are the #125 stalemate class, not stalls):
  `npm run soak -- --policy winning --vary-rng --first-round --start-carry 0 --seeds 0:100 --render-every 0`,
  the same with `--start-carry 14` and with `--start-carry 28`, and
  `npm run soak -- --policy winning-swap --vary-rng --first-round --start-carry 0 --seeds 0:100 --render-every 0`.
  `--vary-rng` walks the boot RNG cursor by the seed, so every seed drafts
  from a DIFFERENT six-offer boot deal — the only instrument that exercises
  varied offers (its first 2,400 rounds found #122 and #123); `--first-round`
  ends each seed at its first round decision (~1 s/seed, ~2 min per sweep on
  a loaded box) and, since 2026-08-24, follows the standing OK/HANG
  semantics (`budget` = still progressing at the frame budget). Carry
  0/14/28 span three opponent/rental tiers; the `winning-swap` sweep sits at
  carry 0 because that is where rounds are won — and the post-win swap screen
  reached — most often. Baseline (PROGRESS 1397, engine tree `1dd081df`,
  0:500 each): winning carry 0 **500/500**, carry 14 **500/500** (2
  `budget`), carry 28 **500/500**; winning-swap carry 0 **500/500**. Run all
  five gates concurrently under `nohup` (PAPERCUTS: gates vs the Bash 600 s
  ceiling). The four gates above stay UNVARIED either way.
  **Fan-out (landed 2026-08-25, `b16e9009`):** every gate command accepts
  `--parallel N` — the parent splits the seed range into N contiguous
  slices run by child processes and prints/merges the identical per-seed
  lines and summary; per-seed results are byte-identical to the serial run
  (pinned by `tests/randomRoundSoakParallel.test.ts`). Use `--parallel 3`
  on the 0:60 gates and `--parallel 2` on the fifth-gate sweeps; the
  pinned commands otherwise stay exactly as written above. Never stop a
  soak with a pattern kill (`pkill -f randomRoundSoak`) — it matches every
  lane's sweeps and any worker whose brief names the file (PAPERCUTS,
  2026-08-25); kill only the PID you launched.

## Mechanics

- Workers start with **fresh context** every time. All they inherit is git
  history and `PROGRESS.md` — your brief plus those must be self-sufficient.
- Worker transcripts: each run prints its JSONL log path. `grep`/`tail` it during
  review instead of guessing what happened.
- The launcher owns execution, authentication, permissions, and session
  isolation. Treat every worker as disposable: durable project
  state belongs in git and `PROGRESS.md`, with the raw JSONL log retained for
  review.
- Keep your own context lean: delegate reading-heavy exploration to workers,
  prefer `grep` over full-file reads, and don't re-verify what you already
  verified last iteration.
