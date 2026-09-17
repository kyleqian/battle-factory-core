# Animation unattended campaign — through 2026-09-24

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
  and at wind-down under `autonomy/20260913-through-20260924/`.
- The worker launcher backs up every successful committed disposable worker
  branch before supervisor verification.
- After every committed green checkpoint—including a direct supervisor repair
  or a verified worker merge plus its `ANIMATION_PROGRESS.md` commit—run
  `./tools/autonomy/backup-refs.sh` before starting more work. If that push
  fails, stop dispatching, retain the local commits, and wind down cleanly so
  the next scheduled run can retry.
- Uncommitted work is not a checkpoint. Commit each green bounded step before
  moving on.

## Continuation and resource discipline

- First recover and independently verify the preserved Silver Wind fade
  checkpoint `2eec5d465` from
  `autonomy/20260913-through-20260918/workers/animation-20260917-123219`.
  Its worker suite passed, but it must not merge until the production build is
  green under the campaign heap setting. After that handoff is resolved,
  continue from the current unsupported frontier rather than repeating closed
  source, evidence, reducer, or actual-core work.
- At the start of each session, run the complete Linux test and build baseline
  before dispatching. The service supplies the portable tar wrapper, a single
  Vitest worker, and an 8 GiB Node heap for both TypeScript and Vite; do not
  bypass those settings.
- Run only one heavyweight local gate at a time across the supervisor and its
  worker. In particular, never overlap `npm test`, typecheck/build, an mGBA
  capture, or a batch comparator with another heavyweight command. Wait for
  the current process to exit before starting the next one.
- Keep dense RGB/frame dumps and diagnostic captures in temporary storage.
  Only commit compact evidence required by the Animation acceptance contract.
- If a gate is killed for memory pressure, preserve any clean committed
  checkpoint, do not immediately repeat the same gate, and wind down so the
  next scheduled session can retry from a clean process group.

## Unattended failures

- On model capacity, usage, rate-limit, or authentication failure, do not swap
  providers or retry in a loop. Wind down; the next scheduled invocation will
  try Codex again.
- Preserve every open `ANIMATION_DEFERRED.md` entry. Work on independent safe
  steps; never guess at, remove, or silently resolve a user-level decision.
- If no independent safe step remains, leave the branch committed and clean,
  back it up, and exit normally.
