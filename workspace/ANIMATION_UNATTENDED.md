# Animation unattended campaign — through 2026-09-11

This file is campaign policy for `animation-main` only. It must not be added to
`master`; remove/exclude it when the product work from this lane is folded.

## Scope and provider

- Codex supervises and Codex workers implement Animation work.
- Stay on `animation-main` and disposable `worker/animation-*` branches. Never
  write or push `master`, `rust-main`, or canonical GitHub branches.
- Continue one bounded Animation acceptance unit at a time under
  `ANIMATION_SUPERVISOR.md`. Do not invent work outside that program.

## Durable checkpoints

- The system wrapper backs up committed lane/worker refs before each session
  and at wind-down under `autonomy/20260831-through-20260911/`.
- The worker launcher backs up every successful committed disposable worker
  branch before supervisor verification.
- After each verified worker merge and its `ANIMATION_PROGRESS.md` checkpoint
  commit, run `./tools/autonomy/backup-refs.sh` before dispatching another
  worker. If that push fails, stop dispatching, retain the local commits, and
  wind down cleanly so the next scheduled run can retry.
- Uncommitted work is not a checkpoint. Commit each green bounded step before
  moving on.

## Unattended failures

- On model capacity, usage, rate-limit, or authentication failure, do not swap
  providers or retry in a loop. Wind down; the next scheduled invocation will
  try Codex again.
- Preserve every open `ANIMATION_DEFERRED.md` entry. Work on independent safe
  steps; never guess at, remove, or silently resolve a user-level decision.
- If no independent safe step remains, leave the branch committed and clean,
  back it up, and exit normally.
