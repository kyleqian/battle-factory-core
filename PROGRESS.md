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

## 836 — [bounded MAIN worker, 2026-08-01] turn-12 predecessor handoff retired

- **State:** proof `ad34442f`, implementation `271d7c03`; the production and
  test census has no `turn12Resolved` reference.
- **Did:** published the immutable completed-turn-12/next-command handoff with
  canonical PP **[0,19,19,10]**, persisted slot 0, and settled/ready facts;
  moved turn-13 dispatch, slot-0 PP reconstruction, and the following reopen
  guard onto it. The turn-12 ROCK_SLIDE miss consumes its tenth PP; this owner
  is deliberately separate from the post-DRAGON_BREATH turn-13 handoff.
- **Next:** #39 remains only for turns 1–4, `opponentFaintDismissElapsed`, and
  dispatcher debt; do not batch any of that into this completed slice.
- **Notes:** clean-parent `fbd575a9` (`ad34442f^`) differential app replay is
  byte-identical for both turn-12 primary traces (503 captures), both derived
  OFF turn-13 reopen/reader traces (151 + 104), and legacy turn-13 insurance
  (141 + 242): **1,141/1,141 raw RGBA captures**. Focused Tier-1 tests
  (**9 files, 465 passed**, including the ratchet), `npx tsc --noEmit`, and
  `npm run build` are green; the full suite was intentionally not run per this
  bounded-worker scope.
