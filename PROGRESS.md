# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 826 — [bounded MAIN worker, 2026-08-01] turn-7 predecessor handoff retired

- **State:** proof `74f4a0d5`, implementation `8a73efc3`; source/test census
  has no `turn7Resolved` reference.
- **Did:** published the immutable completed-turn-7/next-command handoff with
  canonical PP **[4,20,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-8 dispatch, slot-0 PP reconstruction, and the turn-9 reopen
  guard onto it without composing FEATHER_DANCE/ROCK_SLIDE stages.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn8Resolved` or another field into this completed retirement.
- **Notes:** clean-`74f4a0d5` differential app replay is byte-identical across
  all requested turn-7 primary/boundary, turn-8 reader, and turn-6 upstream
  windows (**1,413/1,413 raw RGBA captures**). Full `npm test`: **575 files,
  5,920 passed + 1 skipped**; `npm run build` green. No trace/capture-list,
  timing/presentation, ratchet/barrier, recording-import, or prohibited
  selector change.

## 825 — [bounded MAIN worker, 2026-08-01] turn-6 predecessor handoff retired

- **State:** proof `80b2767a`, implementation `c6f3cdd4`; source/test census
  has no `turn6Resolved` reference.
- **Did:** published the immutable completed-turn-6/next-command handoff with
  canonical PP **[5,20,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-7 dispatch, slot-0 PP reconstruction, and the turn-8 reopen
  guard onto it without composing FEATHER_DANCE/ROCK_SLIDE stages.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn7Resolved` or another field into this completed retirement.
- **Notes:** clean-`80b2767a` differential app replay is byte-identical across
  the requested turn-6 primary/boundary, turn-7 reader, and turn-5 upstream
  windows (**1,461/1,461 raw RGBA captures**). Full `npm test` and
  `npm run build` green. No trace/capture-list, timing/presentation,
  ratchet/barrier, recording-import, or prohibited selector change.

## 824 — [bounded MAIN worker, 2026-08-01] rank-3 turn-5 predecessor handoff retired

- **State:** implementation `73cb7455` + `891a44d7` + `97de11a4`; source and
  test census has no `turn5Resolved` reference.
- **Did:** published the immutable completed-turn-5/next-command handoff with
  canonical PP **[6,20,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-6 dispatch, slot-0 PP reconstruction, and turn-7 reopen guard
  onto it. The existing adapter remains the sole switch/Sitrus content owner.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch later turn fields into this completed predecessor retirement.
- **Notes:** clean-`feffce4c` app replay was byte-identical for all requested
  primary and insurance windows (**1,742/1,742 captures**). Full `npm test`:
  **573 files, 5,910 passed + 1 skipped**; `npm run build` green. No trace,
  capture-list, timing/presentation, ratchet/barrier, recording-import, or
  prohibited selector change.
