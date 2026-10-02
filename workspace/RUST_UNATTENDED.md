# Rust unattended campaign — through 2026-09-11

This file is campaign policy for `rust-main` only. It must not be added to
`master`; remove/exclude it when the product work from this lane is folded.

## Scope and provider

- Claude Fable supervises and Claude Sonnet workers implement Rust work.
- Stay on `rust-main` and disposable `worker/rust-*` branches. Never write or
  push `master`, `animation-main`, or canonical GitHub branches.
- This overlapping campaign is core-only: edit `core-rs/`, `RUST_PROGRESS.md`,
  and `RUST_DEFERRED.md` only. Do not edit TypeScript adapter, source, test, or
  package files, and do not run the full TypeScript gates.
- If the next ledger item requires adapter work, preserve that dependency in
  `RUST_DEFERRED.md` and select another independent `core-rs` leaf.

## Durable checkpoints

- The system wrapper backs up committed lane/worker refs before each session
  and at wind-down under `autonomy/20260831-through-20260911/`.
- The worker launcher backs up every successful committed disposable worker
  branch before supervisor verification.
- After every committed green checkpoint—including a direct supervisor repair
  or a verified worker merge plus its `RUST_PROGRESS.md` commit—run
  `./tools/autonomy/backup-refs.sh` before starting more work. If that push
  fails, stop dispatching, retain the local commits, and wind down cleanly so
  the next scheduled run can retry.
- Uncommitted work is not a checkpoint. Commit each green bounded step before
  moving on.

## Unattended failures

- On model capacity, usage, rate-limit, or authentication failure, do not swap
  providers or retry in a loop. Wind down; the next scheduled invocation will
  try Claude again.
- Preserve every open `RUST_DEFERRED.md` entry. Work on independent safe steps;
  never guess at, remove, or silently resolve a user-level decision.
- If no independent safe step remains, leave the branch committed and clean,
  back it up, and exit normally.
