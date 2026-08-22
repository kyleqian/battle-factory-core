# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1382 — [supervisor fold, 2026-08-22 15:00] **#117 FIXED + folded (`521ae499`: record-menu arrow redraw lags the cursor flip by one tick; `loss-terminal-record-cursor-off` 80/80, yes-path 133/133 re-run by the supervisor); #71 Slice C found already done (1381, stale ISSUES text); final-tree `full` 0:240 → 240/240 OK**

- **State:** master = 1381 + merge of `worker/side-20260822-141940`. Merged-
  tree checks: both terminal compares exact, pins 7/7+, smoke 444. ISSUES −#117.
  PAPERCUTS +1 (obsolete `loss-terminal-decline-continuation-off` trace,
  50/155 by design since entry 1313 — bisected across the #104 commits
  before the archive answered; not a regression).
- **Sweeps on the final engine (`adf633e9`, clean worktree):** `full` 0:240
  **240/240 OK, 0 CRASH, 0 HANG** (session start: 236/240); `winning`
  0:240 in flight (0 crashes at 30%); `full` 240:480 crash-discovery next.
- **Queue state:** every bounded ISSUES item is closed or filed for a later
  era (#109/#114 doubles, #116 user gate decision, #55/#39/#73 parked or
  #55-bounded, #71 filler). Remaining session = crash discovery + wind-down
  gates + lane folds.

---

## 1381 — [main worker, 2026-08-22] **ISSUES #71 Slice C re-verified DONE, no code change needed (guards were already landed at entries 891/894-895) — stale "remainder" sentence trimmed**

- **State:** master `adf633e9` + this docs-only commit. Read both back
  hand-fits (`magbySendOut.ts` MAGBY/Docile, `battleMenu.ts` ONIX-back
  `PLAYER_SETTLE_WOBBLE_Y2_TABLE`) and all their call sites: all 3
  consumers already guarded — `drawPlayerMaterializeSettle` (legacy ONIX
  back) throws for any encounter but destin/jenson;
  `drawTurn15ForcedSwitchRelease` (MAGBY back) throws for any species but
  MAGBY, and its only caller pre-gates on `name==="MAGBY"&&species===240`
  so the throw never fires in play; `generatedPlayerMaterializeSettleY2`
  (generated-route ONIX back) takes the documented generic `y2=0` fallback
  for non-ONIX since KADABRA/others legitimately reach it — no throw, per
  the brief's own fallback branch. All pinned:
  `tests/battleScene.test.ts` 306/306,
  `tests/generatedPlayerMaterializeSettleSpecies.test.ts` 7/7.
- **Did:** no `src/`/`tests/` edit (confirmed `git diff --stat adf633e9 --
  src/ tests/ tools/` empty). Trimmed ISSUES #71's stale
  2026-08-07 "what remains is Slice C" sentence (pre-dated by the
  2026-08-03 entries that closed it) to point at the completion instead.
  Full verification re-run: `npm test` 1094 files/10220 passed/223 skipped,
  `npm run build` green, smoke 444/444, ratchet unchanged (no src touched).
  Soaks: `vanilla` 0:20 **20/20 OK**, `full` 0:40 **40/40 OK**. No
  differential needed — HEAD == starting commit, tool refuses a self-diff.
- **Next:** #71's only genuinely open main-lane share is the §1e 56/58
  move-window pair-guard-throw sites (separate, larger effort) — filler
  priority, pick up next if resuming this thread.
- **Notes:** no new papercuts this session.

---

## 1380 — [supervisor fold, 2026-08-22 14:35] **#115 FIXED + folded (`ade427f7`, salvaged: post-switch-in messages name the slot's CURRENT occupant); #110 + richer switch-in throws (1379); draft heuristic WITHHELD for good at n=180 (≥21: 40 vs 7); session depth number on the fixed tree: `winning` 0:180 → 180/180 OK, carry ≥ 28 in 4/180**

- **State:** master = 1379 + merge of `worker/side-20260822-130450` (#115;
  its cap-killed worker had run the full suite at 10,212 before the kill;
  supervisor verified pins 99/99 + smoke 444 in the worktree) + the n=180
  measurement doc (`docs/soak-draft-heuristic-n180-2026-08-22.md`, cherry-
  picked from `wip/mb-step2b-draft-heuristic` @ `1f500a92`, baseline arm +
  verdict appended). Merged-tree full suite: at wind-down.
- **Decisions:** draft-by-strength heuristic stays WITHHELD (closed
  experiment; the wip branch is the record) — it wins round 2 more often
  (178 vs 163 at carry ≥ 14) but collapses at challenge 3+ (7 vs 40 at
  ≥ 21, 0 vs 4 at ≥ 28). ROADMAP soak-policy block gained the #116 gate-
  coverage note (vanilla is one trajectory); the gate itself unchanged.
- **Next:** main = #71 Slice C (loud guards on the two back send-out
  hand-fits); side = #117 (record-cursor frame) in flight; then wind-down
  gates from ~18:15 (full suite, build, vanilla 0:20, full 0:60, plus a
  `full` 0:240 + `winning` 0:240 on the final tree).

---
