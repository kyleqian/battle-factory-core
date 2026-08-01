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
