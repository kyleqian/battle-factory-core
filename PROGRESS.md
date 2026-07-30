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

## 743 — [BOUNDED MAIN WORKER 2026-07-30 ~14:18] Slice 3 closure in progress: summary tail exact

- **State:** Fix 1 is green and ready to commit; focused intro/ratchet
  acceptance **2 files / 10 tests**.
- **Did:** the typed generated initial-release summary tail now advances its
  stateless exit clock at `rawElapsed=31`; canonical DESTIN/JENSON clocks are
  unchanged. The committed intro improved **711/715 → 712/715** and frame
  1492 is exact.
- **Next:** derive and close only the typed action-menu handoff residuals at
  frames 1747/1755-56, then run the full assigned acceptance.
- **Notes:** current honest remainder is exactly frame 1747 (1579px) and
  1755-1756 (769px each). No capture, canonical route, barrier, or issue
  change.

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

---
## 741 — [BOUNDED MAIN WORKER 2026-07-30 ~14:10] #53 routing Slice 3 honest checkpoint

- **State:** intro ownership/handoff landed in `a6a8489c` + `81557cb3`;
  focused acceptance **5 files / 48 tests**, full gate green at **549 files /
  5545 tests + 1 deliberate animation-lane skip**, build clean.
- **Did:** the generated orchestrator now owns the room-relative intro, accepts
  its live A edge, acknowledges `battleStart` only at command-ready, starts the
  fresh kernel, and settles the frozen field through the proven adapter.
  Actual-draft OFF traces landed with dense >256-capture oracle batching:
  settled command **7/7**, generated dev command **128/128**, all **25/25**
  immutable rows exact.
- **Next:** Slice 3 remains a bounded evidence checkpoint: close only the
  three additional intro/command seam frames, without fitting or touching the
  separately recorded B+444 family; then rerun its two traces.
- **Notes:** full intro is honestly **711/715**. B+444 is 3px at frame 1492
  (`165,42-167,43`); additional mismatches are frame 1747 (1579px) and
  1755-1756 (769px each), all at the settled action-menu bounce seam.
  Default/canonical route unchanged; no issue, recording/barrier ratchet,
  Gate-6, Scene-ON, later-round, or postbattle change. PAPERCUT: oracle's
  256-capture ceiling required serialized batching, ~10 minutes.

