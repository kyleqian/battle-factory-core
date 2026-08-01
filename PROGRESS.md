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

## 834 — [bounded MAIN worker, 2026-08-01] turn-11 predecessor handoff retired

- **State:** proof `c96ce5b3`, implementation `0499bc30`; source/test census
  has no `turn11Resolved` reference.
- **Did:** published the immutable completed-turn-11/next-command handoff with
  canonical PP **[1,19,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-12 dispatch, slot-0 PP reconstruction, and the following reopen
  guard onto it without gating on `turn11FeatherDancePresentationStaging.ts`,
  which remains the opponent move-content owner.
- **Next:** take only the next separately scoped #39 owner-chain slice; do not
  batch `turn12Resolved` or another field into this completed retirement.
- **Notes:** clean-parent `5b46d038` (`c96ce5b3^`) differential app replay is
  byte-identical across all requested turn-11 primary, turn-12 reader, and
  turn-10 upstream windows (**1,033/1,033 raw RGBA captures**). Focused Tier-1
  tests (**9 files, 465 passed**, including the ratchet), `npx tsc --noEmit`,
  and `npm run build` are green; the full suite was intentionally not run per
  this bounded-worker scope.

## 833 — [supervisor, 2026-08-01 15:45] turn-10 verified; #63 fixed+closed; second animation fold

- **State:** master at the second animation fold (GROW_IN_STAGES family,
  2 commits). Turn-10 landing verified: census empty, supervisor-run
  `npm run build` green (worker's was deadline-cut mid-transform), spot
  compares `turn10-rockslide-off` **255/255** exact and
  `turn11-featherdance-off` **189/191** — exactly the recorded pre-existing
  rank-5 idle-bounce phase residual, no regression (worker differential was
  byte-identical on all 191).
- **Did:** merged side `0c66ca94` (ISSUES #63 fix — generated-route Sitrus
  string resolves `B_SCR_ACTIVE_NAME_WITH_PREFIX` from the typed
  `HELD_ITEM_EFFECT` receipt battler and `B_LAST_ITEM` from
  reducer-boundary held items + typed item writes; new Tier-1 pin
  `generatedResolutionHeldItemName.test.ts`; #63 entry deleted). Folded
  `animation-main` (`cb39bdac`); build green, focused animation + new-pin
  suites rerun on the union.
- **Next:** turn-11 slice (Terra/max), then turn-12. Full union suite at
  wind-down covers both folds and all slices.
- **Notes:** side workers ran the full suite twice against brief
  instructions (Sol/high both times) — green both times, harmless, but
  note the pattern when phrasing future side briefs.

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
