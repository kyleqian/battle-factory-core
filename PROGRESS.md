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

## 744 — [SUPERVISOR 2026-07-30 ~15:00] Slice 3 CLOSED at 715/715 (supervisor re-verified); moveend barrier drained and merged; #53 fix-path updated

- **State:** master union green **550 files / 5568 tests + 1 deliberate
  animation-lane skip**, build clean, no live workers, no side
  worktrees beyond permanent animation-main. Barrier ratchet for
  `battleScriptMoveEndOpcode.ts` deliberately 2→1 (sole remainder: the
  census-unreachable `MOVEEND_NEXT_TARGET` doubles branch).
- **Did:** re-verified the closed intro myself (**715/715**, command
  entry **7/7**). Merged the moveend burn-down: full
  `ITEMEFFECT_MOVE_END` restoring family ported source-cited (per-status
  berry cures, Lum, White Herb, script transfers, party mirror,
  state-11 rescan); all 10 census halts re-driven to legitimate
  terminals (4 seven-win incl. three HAUNTER leads, 6 losses, 0 halts;
  addendum doc committed). ISSUES #53 fix-path text updated to the
  Slices-1-3-landed state.
- **Next:** main — design Slice 4 (postwin/swap generalization over
  `orchestrator.round`), then 5/6/7 in order. Side idle unless a
  disjoint need appears.

---
## 743 — [BOUNDED MAIN WORKER 2026-07-30 ~14:29] Slice 3 intro exact and closed

- **State:** fixes `0c4dab29` + `e85d5360`; focused acceptance **5 files / 49
  tests**, full gate green at **550 files / 5560 tests + 1 deliberate
  animation-lane skip**, production build clean.
- **Did:** the typed initial-release summary tail advances its stateless final
  exit step, while canonical clocks remain unchanged. The live command
  conversion now consumes only the source-owned six blank `action-enter`
  callbacks and enters `action-menu` at bounce age zero; this closes frames
  1747/1755-56 without frame-relative routing.
- **Next:** supervisor may proceed to routing design Slice 4.
- **Notes:** generated intro **715/715**, command entry **7/7**, generated
  command **128/128**; all **25/25** immutable rows exact at established
  counts. Slice 3's sole intro residual family is **CLOSED**. No capture,
  route default, barrier, issue, Scene-ON, or later-round change.

---
## 742 — [SUPERVISOR 2026-07-30 ~14:25] Slice 3 verified (711/715 honest); 4 side branches merged; census found 10 reachable moveend halts — burn-down in flight

- **State:** master `e023c365`, union green **550 files / 5559 tests + 1
  deliberate animation-lane skip**, build clean. Live: moveend-barrier
  side worker. Merged this round: Gate-6 R4 (Castform Forecast/Weather
  Ball two-seed receipts — **Gate-6 matrix now fully closed**: 15 rows +
  K1-K7, unreachables census-recorded), B+444 probe doc (**verdict
  FIXABLE** — summary-bar exit-clock rule, NOT #18 `sSpriteOrder`; OAM
  receipt disproves the competing-sprite premise), seed sweep 61-90
  (0 halts), anchor-draft combo census (60/60 rows: 9 seven-win, 41
  losses, **10 halts** — 8× `BattleScript_MoveEnd` pc 26, 2× Teeter
  Dance moveend, i.e. the `ITEMEFFECT_MOVE_END` restoring barrier at
  `battleScriptMoveEndOpcode.ts:741`; three HAUNTER-lead rows halt).
- **Did:** supervisor verified Slice 3's two new traces myself (command
  entry **7/7**; intro **711/715** with exactly frames 1492/1747/
  1755-56), resolved the scout-doc both-append conflict (9 receipt
  sections), ran union suite+build after all merges.
- **Next:** main — Slice 3 closure brief (bounce-seam frames 1747/
  1755-56 + the probe's B+444 stateless exit-clock fix → target
  715/715), then Slice 4; side — moveend burn-down merge + re-driven
  census rows.

