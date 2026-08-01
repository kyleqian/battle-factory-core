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

## 832 — [bounded MAIN worker, 2026-08-01] turn-10 predecessor handoff retired

- **State:** proof `f8e6bcc7`, implementation `f702a404`; source/test census
  has no `turn10Resolved` reference.
- **Did:** published the immutable completed-turn-10/next-command handoff with
  canonical PP **[2,19,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-11 dispatch, slot-0 PP reconstruction, and the following reopen
  guard onto it without gating on a turn-10 move staging module.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn11Resolved` or another field into this completed retirement.
- **Notes:** clean-parent `1056b153` (`f8e6bcc7^`) differential app replay is
  byte-identical across all requested turn-10 primary, turn-11 reader, and
  turn-9 upstream windows (**1,842/1,842 raw RGBA captures**). Focused Tier-1
  tests (**9 files, 465 passed**, including the ratchet) and `npx tsc --noEmit`
  are green; the worker deadline interrupted `npm run build` during Vite's
  transform phase, so its final green result remains for supervisor verification.

## 831 — [supervisor, 2026-08-01 15:10] turn-9 verified; turns 1-4 prep dossier merged

- **State:** master `d77be40f`. Turn-9 landing verified: census grep empty,
  supervisor spot compares exact (`turn9-rockslide-off` **256/256**,
  `turn10-menu-off` **83/83**). Side branch merged (docs/probe new files
  only): `docs/turn1-4-epoch-prep.md` + committed OFF epoch probe.
- **Did:** verified entry 830's slice; merged `worker/side-20260801-144007`
  (worktree removed, branch deleted). The dossier pins all four turn 1-4
  install/reset boundaries (2347/2348, 3236/3237, 4211/4212, 5352-row),
  source owner `HandleInputChooseAction`/`DoBounceEffect`, per-field
  consumer-migration tables, and eight one-field-worker traps.
- **Next:** turn-10 slice launching now (Terra/max); then 11, 12. Turn-4's
  future acceptance needs a committed turn-5 OFF reader set that does not
  exist — deliberately NOT banked this session (turns 5-8 OFF re-timing is
  an un-adopted policy question; next session decides profile).
- **Notes:** `animation-main` has 2 new commits (staged-growth family),
  their session live until 15:32; single fold deferred to wind-down so the
  union suite runs once.

## 830 — [bounded MAIN worker, 2026-08-01] turn-9 predecessor handoff retired

- **State:** proof `8e0fbc80`, implementation `6f9ef899`; source/test census
  has no `turn9Resolved` reference.
- **Did:** published the immutable completed-turn-9/next-command handoff with
  canonical PP **[3,19,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-10 dispatch, slot-0 PP reconstruction, and the following reopen
  guard onto it without composing a turn-9 move stage.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn10Resolved` or another field into this completed retirement.
- **Notes:** clean-parent `00f79944` (`8e0fbc80^`) differential app replay is
  byte-identical across all requested turn-9 primary, turn-10 reader, and
  turn-8 upstream windows (**1,483/1,483 raw RGBA captures**). Focused
  Tier-1 tests (**9 files, 472 passed**, including the ratchet), `npx tsc
  --noEmit`, and `npm run build` are green; full-suite output remains with the
  supervisor.

## 829 — [supervisor, 2026-08-01 PM] session start: animation fold `c16e73dd`, union green

- **State:** master `c16e73dd` (fold of `animation-main`, 5 commits:
  flicker-increasing + rotate-up-to-sides front-idle acceptances; animation
  fixtures/docs only, clean merge). Union full `npm test` **576 files, 6,006
  passed + 1 skipped**; `npm run build` green. Stale turn8-diff temp worktree
  removed. Oracle freshness FAIL on both ports remains the known client-only
  false positive (harness HEAD `9cadad7` is template/tooling-only).
- **Did:** orient + fold per protocol; re-verified all committed OFF trace
  capture counts for the turns 9-12 acceptance sets against
  `docs/turn-resolved-owner-chain-audit.md` (exact match).
- **Next:** main lane (Terra/max): `turn9Resolved` retirement per the audit's
  slice-order item 4, then turns 10/11/12 serial, one field per worker. Side
  lane (Sol/high): turns 1-4 typed HP/bounce epoch prep-scout (consumer map +
  RAM ground truth + handoff design), unblocking slice-order item 6. #63
  remains a small standalone fix if time allows.
- **Notes:** animation supervisor live until 15:32 (nested worker too); full
  suites stay at supervisor verify boundaries per the contention rule. Session
  deadline 20:27.
