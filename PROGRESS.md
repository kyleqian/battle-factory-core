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

## 725 — [SUPERVISOR 2026-07-29 ~22:45] Rounds 1-2: Slice 6 verified, Slice-7 honest checkpoint merged (#52 filed), trainer-pic dossier banked

- **State:** master green at **527 files / 5408 tests + 1 deliberate
  animation-lane skip** (union suite + build re-run by supervisor after
  merge `c7a5d30e`), `git diff --check` clean, no orphan worktrees or
  worker branches, DEFERRED.md empty. Orient: `animation-main` had
  nothing to fold; oracle freshness FAIL re-confirmed as the docs-only
  false positive (807b449) — services kept.
- **Did:** (1) verified Slice 6 (entry 723): re-ran turn17-rung7a
  **255/255** and rung8b **118/118** myself; typed terminal dispatch
  confirmed at `battleScene.ts:15506+`, legacy turn17 flags mirror-only
  for the out-of-scope postwin owner. (2) Merged side-lane Slice-7
  checkpoint `c7a5d30e`: honest GRANBULL-vs-ARON mechanicLab route
  (trainer 17, seed 2423399196), `oracleBattleLab` compare plumbing,
  pinned **11/128** diagnostic; **0/128 stays claimed**; filed ISSUES
  #52 (fight-closing bounce-clock reset vs ROM continuous idle clock).
  (3) Trainer-pic scout dossier + SHIZUKA fixture landed (entry 724);
  its slice-4 acceptance trace is blocked on the same harness-side
  pre-reset-capture family as the entry-690 commentary checkpoint.
  (4) Restored the standing-arrangement blockquote dropped by
  `c2eb3f45`'s ledger edit.
- **Next:** main = #52 fix + Slice 7 completion (trace only at 128/128);
  side = Gate-6 interaction-matrix scout. Then trainer-pic intro slices
  1-3 per the dossier.
- **Notes:** cross-lane full suite runs 563-688s while the animation
  supervisor is live — union suite once per merge point only.

---
## 724 — [BOUNDED MAIN WORKER 2026-07-29] Trainer-pic OFF-window scout complete

- **State:** banked legal OFF fixture and source-backed dossier; no app,
  trace, test, animation, or issue-file change. Full tests/build green.
- **Did:** dense noncanonical BLACK BELT SHIZUKA source route from transition
  A edge through player-ready menu (**927 frames**, B+0..+714); confirmed
  BLACK_BELT -> TRAINER_PIC_BLACK_BELT and mapped typed/start-command versus
  legacy intro seams in `docs/trainer-pic-off-window-scout.md`.
- **Next:** implement the four recommended generated battle-start intro slices;
  final slice owns a new OFF generated-route acceptance trace. Do not use the
  private BattleLab route as a public trace (frame 0 is post-intro).
- **Notes:** fixture `tools/battle-lab/factory-trainer-pic-shizuka-off.json`;
  RAM anchors: pic +59..+178, opponent healthbox +443..+466, player healthbox
  +629..+651, player-ready +714. PAPERCUT: none.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 723 — [BOUNDED MAIN WORKER 2026-07-29 ~22:05] Resolution Slice 6 complete

- **State:** implementation commits `985ec1fa`, `ae94cc4c`; focused Slice-6
  acceptance **330/330**, full suite green at **526 files / 5405 tests + 1
  deliberate animation-lane skip**, production build and `git diff --check`
  green.
- **Did:** a real generated terminal receipt now retains its immutable battle
  and boundary through the button-gated final faint, enters
  `terminal-handoff`, and only then calls the existing round completion owner.
  The accepted Turn-17 KO/result/trainer-loss adapter now consumes one typed
  terminal receipt with frozen result/loss strings and relative dismiss
  clocks; its render branch no longer inspects `turn16Resolved` or another turn
  flag. Existing post-win fields remain mirrored only for the out-of-scope
  downstream owner.
- **Next:** design §4 Slice 7 explicit-OFF generated command breadth proof is
  next; do not create its trace or app stage from this main-lane step.
- **Notes:** Turn-17 exact **255/255, 147/147, 255/255, 118/118**. Complete
  §3.2 predecessors remain exact: staged **16/16**; menus
  **254,44,42,44,93,88,111,83,56,46,57**; stat/faint/switch/fly/party/sendout/
  Turn-16 **190,141,242,256,200,200,195,195,175**. No trace/capture change,
  canonical-recording import, unsupported barrier, ratchet-pin move, or new
  battle/turn/absolute-tick branch. PAPERCUT: none observed.
