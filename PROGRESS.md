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

## 814 — [bounded main worker, 2026-08-01] rank-8 Scene-OFF status-icon receipt landed

- **State:** implementation `80c5d6af`; targeted resolver/presentation/round
  seam tests are green, as is `npm run build`. Full `npm test` and final
  clean-tree verification are next.
- **Did:** projected the existing `status-icon-update` kernel receipt into an
  immutable, one-controller-callback `status-icon` command. The raw
  `set-battler-status-data` write remains logical; the render field and
  round `displayedStatus1` now change only after the icon command completes.
  The generic message context reads `B_EFF_NAME_WITH_PREFIX` from the pending
  raw status receipt, so burn text never infers a target from a move/species.
  A legal generated Factory round proves FIRE_PUNCH's status write → burn
  text → icon receipt → nonterminal next-command handoff, plus a generic
  status clear is pinned at the renderer boundary.
- **Next:** run the required full suite, then record its result and commit the
  ledger/docs update. Keep rank 8 scoped to generic semantic presentation;
  do not resume the retired canonical Battle-2 march or claim a new pixel
  comparison.
- **Notes:** the authoritative Scene-OFF oracle checkpoint remains the already
  verified **42 captures / 42 capture-states** in
  `docs/fire-punch-burn-lifecycle-off-evidence.md`; this semantic slice adds
  no pixel claim and no fabricated Scene-OFF status-animation receipt. No
  mechanics/RNG/AI/round outcomes, animation code/ledgers, ratchets, or
  oracle trace/capture lists changed.

## 813 — [bounded worker, 2026-08-01] rank-7 opponent-FLY receipt bridge landed

- **State:** implementation `30b61236`; focused adapter/selector/scene suites
  are **244/244**, full `npm test` is green (**569 files, 5719 passed + 1
  skipped**), and production build is green.
- **Did:** staged canonical Onix/Murkrow from the real turn-14 boundary through
  the full-turn reducer under Scene OFF. Two genuine player requests now own
  separate immutable charge/miss and locked-strike/faint resolutions; the
  exact legacy renderer reads charge, strike, and faint lines from those
  receipts, and core constructs the selector from the published forced request
  (**request 4, legal slots 1/2**) instead of synthetic request 0.
- **Next:** retain an opponent-owned locked-action presentation owner across
  the intervening player command, then let that owner directly advance the
  forced `PartySelectState`; only then delete `turn14Resolved` dispatch and
  `turn15PartySelect`. Acceptance stays the existing exact windows: charge
  **213**, strike **256**, selector **200/200**, send-out
  **43/46/16/144/195**; add a fresh short explicit-OFF owner trace rather than
  extending the canonical march.
- **Notes:** no new oracle pixel count is claimed: the listed exact pins are
  historical ON-profile evidence and this main-lane session was restricted to
  OFF. The bridge found the structural asymmetry honestly: player-owned FLY's
  continuation publishes only a trainer command and can append immediately;
  opponent-owned FLY publishes a real player command that the current round
  presenter releases before the locked strike. No mechanics/RNG/AI/round,
  animation, ratchet, barrier, trace, capture-list, or timing change.
- **PAPERCUT:** overlapping full-suite runs saturated Vitest workers; the
  required full suite remained green but took ~8 minutes.

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
