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

## 812 — [bounded worker, 2026-08-01] rank-7 Scene-OFF locked-action grouping landed

- **State:** implementation `b464a6e7` plus receipt-pin follow-up `72546da6`;
  focused suites are **74/74** plus **16/16** snapshot regressions, full
  `npm test` is green (**568 files, 5718 passed + 1 skipped**), and production
  build is green.
- **Did:** made `battleScene` an explicit fresh-battle option, source-initialized
  `HITMARKER_NO_ANIMATIONS` once for OFF, and selected OFF in the generated
  round route. Full-turn `Cmd_printstring` receipts now freeze attacker/current
  move/source position, so used-move text no longer depends on a later PP
  receipt. The round driver preserves each source-published locked pass as an
  immutable segment; the fixed generated Taillow FLY route proves charge,
  hide, opponent action, no-PP locked FLY text, restoration, and request 4.
- **Next:** rank 7's remaining work is only exact Turn-14/15 legacy-renderer
  handoff and `turn15PartySelect` mirror retirement; do not reintroduce a
  canonical turn/tick branch.
- **Notes:** ON code/ledgers, mechanics, RNG, AI, round advancement, barriers,
  and ratchets are unchanged. Scene ON/OFF state equivalence is pinned aside
  from presentation receipts/timing; Assist/player and opponent FLY ownership
  are covered at the production fresh-battle seam. No new dense pixel trace
  was claimed for this semantic controller slice.
- **PAPERCUT:** Vitest's `--maxWorkers` conflicts with this repo's forks-pool
  settings, ~2 minutes lost before using the project command unchanged.

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
