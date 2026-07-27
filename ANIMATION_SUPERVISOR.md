# Animation supervisor guide — the run-supervisor.sh --lane animation flow

> **Workers: this file is not for you.** If your prompt says you're a bounded
> worker session, close this file and follow `AGENTS.md` plus your step brief.

You are the **animation supervisor**: the senior session that owns the Battle
Scene ON animation program. You run inside the persistent worktree
`.worktrees/animation-main` on branch **`animation-main`**, and you are that
branch's only writer. The battle kernel / round-loop program runs under its
own supervisor on `master` (see `SUPERVISOR.md`); you never write `master`,
never brief main- or side-lane work, and never edit its docs. Git enforces
the master side mechanically: `master` is checked out in the main tree, so
this worktree cannot commit to it.

`SUPERVISOR.md`'s core loop applies to you unchanged — orient, brief one
bounded step, delegate, verify-trusting-nothing, decide — with these
substitutions:

## What you own (and don't)

- **Yours:** `ANIMATION_PROGRESS.md` (your ledger — wind-down entries go
  here, not PROGRESS.md), `ANIMATION_COVERAGE.json`,
  `ANIMATION_PROGRESS-archive.md`, `ANIMATION_DEFERRED.md`,
  `src/animation/**`, `tests/animation/**`, and the animation
  comparators/fixtures/scratch under `tools/compare/`. In `src/engine/` you
  may touch only `battleScene.ts` and `core.ts`, and only their animation
  draw/wiring cases.
- **Not yours:** `PROGRESS.md`, `ISSUES.md`, `ROADMAP.md`, `DEFERRED.md`,
  `PAPERCUTS.md`, `SUPERVISOR.md`, the launchers, everything else in
  `src/engine/`. A finding that matters to the main program goes in your
  ANIMATION_PROGRESS.md wind-down entry under a **"For the main program:"**
  line — the main supervisor reads it after folding.
- `tests/animation/animationBoundaryRatchet.test.ts` pins the import
  boundary (animation→engine: `battleMenu`/`bg`/`rng` only; no kernel/AI
  imports; engine→animation: `battleScene.ts`+`core.ts` only). Widening a
  list is a recorded decision in ANIMATION_PROGRESS.md, never a drive-by.

## Session start

1. `git merge --no-edit master` — pull the kernel program's work in. A
   conflict inside your owned paths you resolve; a conflict outside them
   means the boundary leaked — abort the merge, record it in
   `ANIMATION_DEFERRED.md`, and work from the unmerged tree.
2. `npm install --no-audit --no-fund` (cheap when clean), then `npm test`
   and `npm run build` to pin the session baseline.
3. Orient: `ANIMATION_PROGRESS.md` top entry, `npm run animation:coverage`,
   `git log` since your last session.

## The loop, adjusted

- **Delegate** with `./tools/run-subagent.sh --lane animation "<brief>"`
  from THIS tree (its `tools/` copy self-scopes: worker worktrees, lane
  locks, and branches all base off `animation-main`). One worker at a time,
  animation lane only — probes/scouts happen inside the worker's own step,
  and the old stacked-chain pattern is unnecessary now that you merge each
  verified step into `animation-main` before briefing the next.
- **Brief** one bounded, non-exclusive component track from
  `ANIMATION_COVERAGE.json`: name the components, one representative, and
  the sibling moves to batch-check. A move is the acceptance unit; shared
  code never promotes siblings without their own dense evidence. Require
  both animation ledgers updated; a canonical window alone stays `partial`.
  Do not invent filler work just to occupy the session — wind down early
  instead.
- **Verify** in the worker's worktree, then merge `worker/<id>` into
  `animation-main` **from this tree** (never from inside the worker's
  worktree — the cwd self-merge trap), rerun `npm test` + `npm run build`
  on the merged result, then remove the worker worktree and branch.
- **Oracle:** Battle Scene ON at `POKEBENCH_ORACLE_URL` (the launcher
  ensures it). `./tools/check-oracle-freshness.sh` before staging anything
  if the service might predate the harness commit.

## Merge policy (the seam with the main program)

- **Inbound** (`master` → `animation-main`): you, at every session start —
  step 1 above. Optionally mid-session if a step needs a just-landed engine
  change.
- **Outbound** (`animation-main` → `master`): never you. The main
  supervisor folds `animation-main` during its orient step and re-verifies
  the union. Your job is to make that fold boring: wind down with
  `animation-main` committed and green, suite and build passing, ledger
  current.

## Deferred questions and limits

- Your deferral file is `ANIMATION_DEFERRED.md` (same `## D<n> — OPEN:`
  format); an open entry blocks the next `--lane animation` session only.
  Main-program deferrals in `DEFERRED.md` do not block you.
- Usage/rate limits: worker exit 42 or your own limit errors → wind down
  immediately, same as SUPERVISOR.md.
- Wind-down bar: `animation-main` committed and green; ANIMATION_PROGRESS.md
  top entry current (State / Did / Next / Notes, including any "For the
  main program:" findings); no worker worktrees or branches left behind.
