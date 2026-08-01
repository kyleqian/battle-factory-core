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

## 811 — [bounded worker, 2026-08-01] generic MOVEEND sprite-visibility round seam landed

- **State:** implementation commit `8ee8cbe7`; focused resolution/portability/
  locked-move/orchestrator suites are green (**65/65**), full `npm test` is
  green (**567 files, 5712 passed + 1 skipped**), and production build is
  green.
- **Did:** projected the existing typed `set-battler-sprite-visibility`
  receipt into a generic one-callback `sprite-visibility` resolution command,
  persistent render-view state, and `battlePresentationBoundaries`. A staged
  real full-turn player FLY hides through the intervening opponent action and
  restores from its locked continuation in the seven-battle round seam;
  opponent FLY is pinned through the inverse kernel path. Ordinary visible
  pass-through receipts leave the legacy nine-command adapter unchanged.
- **Next:** rank 7 still needs a generic two-turn action grouping plus exact
  Turn-14/15 legacy renderer handoff and `turn15PartySelect` mirror retirement;
  this slice deliberately did not claim those pixel windows.
- **Notes:** no rule/RNG/damage/order/round/Scene-ON changes, canonical branch,
  recording import, unsupported barrier, or executable-frontier ratchet move.
- **PAPERCUT:** none.

## 810 — [bounded worker, 2026-08-01] ISSUES #56 item 1 staged ready-tail verdict: duration is non-universal

- **State:** evidence commit `e497c7d6`; production `src/` is intentionally
  unchanged. Focused intro/ack/handoff/battleScene/ratchet is **244/244**;
  full `npm test` is green (**567 files, 5709 passed + 1 skipped**) and build
  is green.
- **Did:** generalized the canonical RAM watcher to accept `factoryLegal`
  fixtures. Canonical ONIX is exec-flags **1738→1741→1744** (+3 dispatch,
  +3 AI); staged YOSHI reproduces **1847→1850→1853**, but same-player-species
  staged ONIX is **1885→1888→1890** (+3/+2). The source mechanism is shared;
  its duration is AI-decision-dependent, so a fixed generic +6 tail is false.
- **Next:** #56 item 2 remains open at entry 809's hardware-OAM/display-latch
  discriminator; do not revive item 1 or add a fixed player-ready tail.
- **Notes:** fresh dense holds: interactive **715/715**, command **128/128**,
  YOSHI **700/751**, MAGNETON **703/751**. The ready-lag branch is retained;
  no route/species/trainer/tick selector, ratchet move, unsupported branch,
  or production change was added.
- **PAPERCUT:** none.

## 809 — [bounded worker, 2026-07-31 ~night] ISSUES #56 item 2 raw-clock/discriminator checkpoint; no unsafe presentation fit landed

- **State:** evidence commit `822522c7`; production `src/` is intentionally
  unchanged. Focused factoryBattleStartIntro/issue56ActionMenuHandoffFrame/
  battleScene/ratchet is **241/241**; full `npm test` is green (**567 files,
  5709 passed + 1 skipped**) and build is green.
- **Did:** RAM-valid OAM/task receipt pins interactive-generated-intro-off's
  real abs-1492 summary destroy to semantic handoff source `t=1459`, so
  `rawElapsed=31` exactly. Extended the reusable probe with source task and
  pending-OAM reads; at YOSHI's and interactive's terminal frames those
  source-owned lifecycle facts are identical even though their bar pixels
  require opposite tail clocks. MAGNETON remains genuinely bar/icon split.
  Added a hermetic route-replay Tier-1 pin for the handoff arithmetic and
  updated #56/docs with the non-landable verdict.
- **Next:** do not add a route/species/absolute-tick selector. A future
  #56 item-2 attempt needs a validated *hardware OAM/display-transfer latch*
  receipt that distinguishes the two synced cases before a typed per-widget
  bar/icon lifecycle can be populated; frame-444's separate materialize
  column shift remains out of this branch.
- **Notes:** fresh dense holds: interactive **715/715**, command **128/128**,
  YOSHI **700/751** (444 neighborhood **10/11**, 536 **16/16**), MAGNETON
  **703/751** (437 **11/11**). Removing the special case makes interactive
  1492 **9/9 → 8/9** (3px at 165,42–167,43), while improving YOSHI's bar
  subregion; no behavior change is honest. No ratchet pin moved and no
  unsupported branch was added.
- **PAPERCUT:** none.
