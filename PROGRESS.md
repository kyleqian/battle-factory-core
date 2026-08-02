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

## 842 — [bounded MAIN worker, 2026-08-01] turn-2 predecessor retired with immutable epoch

- **State:** proof `c16386d6`, migration `7a3fca06`; the production/test
  census has no `turn2Resolved` reference. The receipt is published at the
  source-owned first choose-action callback (absolute **3237**, runtime
  elapsed **2197**; the handler install at 3236 still rejects A).
- **Did:** migrated core dispatch/predecessor, generic HP/content,
  ENDEAVOR-family routing, slot-2 PP, and every turn-3 submenu/kickoff clock
  onto the immutable receipt: PP **[9,20,19,10]**, slot **2**, HP
  **101/88**, settled/ready, and DoBounceEffect seeds **192/128** with
  delta **7** and amplitude **1**. The later turn-3 open and its B-close/A-
  reopen consume that epoch rather than replacing it.
- **Next:** stay scoped: turns 3–4, `opponentFaintDismissElapsed`, and
  dispatcher debt remain #39 work; do not reopen turn 2.
- **Notes:** clean-parent `ace2b44c` (`c16386d6^`) app replays are
  byte-identical: turn-2 **493/493**, turn-3 readers **416/416**, upstream
  **81/81**, total **990/990** raw RGBA captures. (The known #61 live-oracle
  residual remains `turn3-endeavor-off` 254/255, but this differential is
  255/255.) Focused Tier-1 **461/461** (8 files), `npx tsc --noEmit`, and
  `npm run build` green; full `npm test` deliberately unrun per the bounded
  brief. No trace/capture-list, recording import, ratchet/barrier, or
  selector changes.

## 841 — [bounded MAIN worker, 2026-08-01] turn-1 predecessor retired with immutable epoch

- **State:** `13389b9c` retires `turn1Resolved`; every production/test
  consumer now uses `turn1NextCommandHandoff`, published at the source-owned
  reset (relative elapsed **1308**).
- **Did:** migrated the core guard/write/predecessor, opponent HP, slot-0 PP,
  and turn-2 submenu/kickoff bounce clock. New Tier-1 tuple pins 2901
  `ready=true`, epoch 1308, open/current 1861, and pseudo-t 2299; drivers
  remain live through 2947 and freeze at 2948. Same-turn B-close/A-reopen
  preserves the immutable epoch.
- **Next:** stay scoped: turns 2–4, `opponentFaintDismissElapsed`, and
  dispatcher debt remain #39 work; do not reopen turn-1.
- **Notes:** clean-parent `76af5060` (`b34e6279^`) app replays are
  byte-identical: turn-1 **669/669**, turn-2 readers **493/493**, total
  **1,162/1,162** raw RGBA captures. Focused Tier-1 **456/456** (7 files),
  `npx tsc --noEmit`, and `npm run build` green; full `npm test` deliberately
  unrun per the bounded-step brief. No trace/capture-list, recording import,
  ratchet/barrier, or selector changes.

## 840 — [supervisor wind-down, 2026-08-01 17:30] 9-step session: turns 9-12 retired, #63 fixed, #61+#56-tail parked, three prep dossiers banked

- **State:** master `2f5f8c53`, tree clean and green: full union `npm test`
  **582 files, 6,037 passed + 1 skipped** and build green at `6dc73f72`
  (17:14; the two commits since are docs-only merges). `animation-main`
  fully folded (three folds this session: 5 + 2 + 2 commits, all
  union-verified). DEFERRED empty. Only the permanent animation worktree
  remains; all temp diff worktrees removed. Scene-ON oracle 8012 was found
  down (stopped with the animation session) and restarted fresh —
  freshness OK.
- **Did (main lane, Terra/max, 5 briefs):** retired `turn9Resolved` (830),
  `turn10Resolved` (832), `turn11Resolved` (834), `turn12Resolved` (836)
  via the typed handoff recipe — differentials 1,483 / 1,842 / 1,033 /
  1,141 captures all byte-identical, supervisor spot compares exact at
  every recorded count (incl. the pre-existing 189/191 and 246/247
  idle-bounce residuals, non-regressed). **Every `turnNResolved` for turns
  5-13 is now retired.** Turn-1 (838/839) stopped honestly at its proof
  checkpoint (`210d96af`): candidate migration broke `turn2-endeavor-off`
  47/256 (frames 2901-2947) and was discarded per brief discipline.
  **(side lane, Sol/high, 5 briefs):** turns 1-4 epoch prep dossier
  (`docs/turn1-4-epoch-prep.md`); ISSUES #63 FIXED+closed
  (typed-receipt Sitrus resolver, new Tier-1 pin); item-7 prep
  (`docs/opponent-faint-dismiss-owner-prep.md`); #61 design→**PARKED** as
  settled record (sub-tick CPU/VBlank class, supervisor decision, #38
  precedent); #56 frame-444 bar/icon display tail→**SETTLED** same class
  (Q1 materialize-column-shift stays 444's open lead); post-failure scout
  pinned the turn-2 submenu epoch rule
  (`docs/turn1-submenu-epoch-evidence.md`): drivers continue the turn-1
  epoch (abs 2348), never reset at the 2901 reopen, destroyed at 2947 —
  matches the failed window exactly and prescribes the retry.
- **Next:** (1) retry turn-1 with the epoch-evidence prescription (proof
  `210d96af` already landed); then turns 2-4 per the dossier; (2) the
  turn-4 slice needs a reader-set decision first (no committed turn-5 OFF
  set; turns 5-8 OFF re-timing policy still un-adopted); (3) item 7
  (`opponentFaintDismissElapsed`) is fully prepped; (4) #62 route-selection
  decision remains open; (5) #55 stream-model boundary unchanged.
- **Notes:** 10 briefs, 0 worker failures (turn-1 is an honest checkpoint,
  not a failure); no exit-42; vitest-cap papercut deleted as
  cross-session-verified (502s capped 3-lane suite vs 935s+ pre-fix).
  No deferred questions — DEFERRED.md stays empty.
