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

## 839 — [bounded MAIN worker, 2026-08-01] turn-1 retirement stopped at proof checkpoint

- **State:** `210d96af` remains the last green code checkpoint; its immutable
  turn-1 receipt is present, but `turn1Resolved` deliberately remains live.
  A complete candidate consumer migration was discarded after the required
  clean-parent pixel differential was non-identical.
- **Did:** exercised the core/predecessor, generic HP, slot-0 PP, and turn-2
  submenu/kickoff bounce consumer families against the new handoff without
  landing them. Restored the proof-only tree rather than tuning the reader
  mismatch or retaining a partial migration.
- **Next:** take a fresh, separately scoped evidence/design step from
  `210d96af` for the turn-2 submenu epoch selection; do not re-anchor it to an
  old turn-specific delay and do not continue this failed migration.
- **Notes:** clean-parent `210d96af` replay held all four turn-1 primary OFF
  traces (**669/669**) and `turn2-dragonbreath-off` (**237/237**) byte-exact.
  `turn2-endeavor-off` differed in **47/256** captures: first frame **2901**
  (**6,982 raw RGBA bytes**), continuing through 2947, so only **1,115/1,162**
  captures matched. Focused Tier-1 **453/453** (7 files), `npx tsc --noEmit`,
  and `npm run build` are green; full `npm test` was intentionally not run.

## 838 — [bounded MAIN worker, 2026-08-01] turn-1 handoff proof checkpoint

- **State:** immutable receipt proof is green; consumer migration has not
  started, so `turn1Resolved` remains live until the next committed step.
- **Did:** added `turn1ResolutionAdapter.ts` and its equivalence suite. The
  receipt owns PP **[9,20,20,10]**, slot 0, HP **117/101**, settled/ready
  facts, and the runtime-relative `HandleInputChooseAction` →
  `DoBounceEffect` epoch (192/128 seeds, delta 7, amplitude 1).
- **Next:** publish that receipt at the modeled reset (not the later FIGHT
  reopen), migrate every turn-1 HP/PP/bounce/core consumer, then run the
  1,162-capture clean-parent differential set.
- **Notes:** focused proof **4/4** and `npx tsc --noEmit` are green. No
  trace, timing, oracle, or presentation change in this checkpoint.

## 837 — [supervisor, 2026-08-01 16:40] turns 9-12 COMPLETE; #61 parked (settled record); ON oracle restarted

- **State:** turn-12 verified: census empty, spot compares
  `turn12-rockslide-miss-off` **256/256** and `turn13-switchin` **242/242**
  exact (worker differential 1,141/1,141 incl. the regenerated
  turn-13 OFF windows 151+104). **Every `turnNResolved` boolean for turns
  5-13 is now retired**; #39's remainder is turns 1-4 (prepped), item 7
  (prepped), and dispatcher debt.
- **Did:** merged side `278f1af3` (`docs/issue61-vblank-phase-event-design.md`)
  and **parked #61 as a settled record** (supervisor decision, #38
  precedent): the turn-3 reveal order is sub-tick CPU/VBlank phase — same
  class as settled #5; no tick-level source-owned discriminator exists;
  reopen condition is the doc's §4.1 falsification gate or a general cycle
  model. `turn3-endeavor-off` ships 254/255 permanently under this record.
  Also: found Scene-ON oracle 8012 DOWN (stopped with the animation
  session); restarted via `PORT=8012 run-oracle.sh --profile
  battle-scene-on` — freshness now OK, `turn13-switchin` 242/242 confirms.
- **Next:** turn-1 slice launching (Terra/max, 70-min cap) — first turns 1-4
  rung per the merged dossier. Then final animation fold check + full union
  suite + wind-down before 20:27.
- **Notes:** worker entry numbering collided once (834); supervisor entries
  now offset. Ledger kept at 3 entries.
