# Animation unattended campaign — through 2026-09-24

This file is campaign policy for `animation-main` only. It must not be added to
`master`; remove/exclude it when the product work from this lane is folded.

## Scope and provider

- Codex supervises and Codex workers implement Animation work.
- Stay on `animation-main` and disposable `worker/animation-*` branches. Never
  write or push `master`, `rust-main`, or canonical GitHub branches.
- Continue one bounded Animation acceptance unit at a time under
  `ANIMATION_SUPERVISOR.md`. Do not invent work outside that program.
- The user reaffirmed the current implementation approach on 2026-09-22:
  finish this Factory campaign, including Outrage, without a runtime rewrite.
  Before any future non-Factory expansion, reassess a shared animation-runtime
  port with a bounded comparison; successful per-move acceptance alone does
  not establish that the current architecture is the most efficient approach.

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

- Continue unfinished Factory moves surfaced by the derived work plan:
  nine ready Level 50 moves, followed by Open-only Outrage (explicitly added
  by the user on September 22). Start with the current ranked ready move
  (initially Extrasensory), and keep advancing as moves become exact.
  Do not restart accepted moves.
  An empty manual priority list is not completion or an authorization boundary.
  Outrage may proceed when only blocked Level 50 work remains. Stage it with
  a legal Open-level Factory carrier (`FRONTIER_MON_DRAGONITE_5`); do not
  invent a Level 50 carrier or waive both-orientation dense acceptance.
  The 77 moves outside the Factory remain outside this campaign scope.
  Open-level species geometry is a separate audit, not credit from adding Outrage.
- Helping Hand alone has a recorded move blocker: its success body needs legal
  doubles staging, while the current profile is singles-only. Keep its success
  animation unsupported until that condition changes. Nightmare's contest-only
  track arm is outside legal battle execution and does not block other moves.
- Follow `ANIMATION_VERIFICATION.md` for scope-based worker gates, same-code
  receipt reuse, and conditional wind-down checks. Unchanged idle runs exit
  without a full suite/build or a new ledger-only commit. The service supplies
  the portable tar wrapper, one Vitest worker, and an 8 GiB Node heap for both
  TypeScript and Vite; do not bypass those settings.
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
