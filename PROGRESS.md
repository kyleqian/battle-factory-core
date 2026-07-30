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

## 728 — [BOUNDED MAIN WORKER 2026-07-30 ~00:10] Resolution Slice 7 complete; generated Scene-OFF command 128/128

- **State:** implementation `7485848a`, acceptance `4305a82f`, compatibility
  `43344166`; generated explicit-OFF trace **128/128** and all **25/25**
  immutable §3.2 rows exact. Focused acceptance is green at **7 files / 168
  tests**; full suite/build green at **527 files / 5412 tests + 1 deliberate
  animation-lane skip**.
- **Did:** typed resolution now consumes provenance-bearing
  `MOVE_ANIMATION`/`HIT_ANIMATION` receipts. The pre-hit hold derives from
  the receipt instruction span plus source `B_WAIT_TIME_SHORT`; the target
  uses the existing generic 32-tick blink/20-pose healthbox reaction before
  immutable HP drain. Committed consecutive frames 8-135, deleted #52, and
  completed design Slice 7.
- **Next:** trainer-pic intro slices remain the next main-lane roadmap work.
- **Notes:** source: `battle_scripts_1.s:236-266,3151-3153`;
  `battle_script_commands.c:1743-1754,3914-3931,5558-5575`;
  `battle_controller_opponent.c:440-456,1804-1816`;
  `pokeball.c:1284-1306`. No import/barrier/ratchet pin, route/tick branch,
  fitted coordinate/RGB, or capture thinning. PAPERCUT: none.

---
## 727 — [BOUNDED MAIN WORKER 2026-07-29 ~23:45] Typed confirm handoff exact; Slice-7 checkpoint advances to 60/128

- **State:** implementation `7f8e876b`; full suite green at **527 files /
  5410 tests + 1 deliberate animation-lane skip**, focused acceptance **7
  files / 167 tests**, production build and `git diff --check` green. Live
  diagnostic improved **26/128 → 60/128**; Slice-7 acceptance remains
  **0/128 claimed** and no trace is committed.
- **Did:** generalized the canonical confirmed-FIGHT hold into nine typed
  player-controller/battle-main/script stages. It preserves the selected
  move field through frame 42, resets both bouncers at STOP_BOUNCE completion,
  and begins the attack string at frame 43 without a fitted delay. Frames
  **8-67 are exact**.
- **Next:** project Scene-OFF `MOVE_ANIMATION`/`HIT_ANIMATION` controller
  events before HP drain. First divergence is frame 68: **2px**, bbox
  **(99,33)-(99,34)**; app removes opponent HP pixels while ROM holds the full
  bar, then begins its target hit blink at frame 116.
- **Notes:** all **25/25** §3.2 regression rows remain exact. Source:
  `battle_controller_player.c:200-213,481-527,3082-3098`;
  `battle_main.c:2940-2965,4354-4551,4756-4957`; `battle_util.c:78-292`;
  `battle_scripts_1.s:236-247`; `battle_script_commands.c:915-1006,1191-1203`.
  No trace/capture/import/barrier/ratchet-pin change or route/tick branch.
  PAPERCUT: none.

---
## 726 — [BOUNDED MAIN WORKER 2026-07-29 ~23:00] Slice-7 bounce fixed; honest confirm-handoff checkpoint

- **State:** full suite green at **527 files / 5409 tests + 1 deliberate
  animation-lane skip**, production build and `git diff --check` green.
  Live diagnostic improved **11/128 → 26/128**; acceptance remains **0/128
  claimed** and no trace is committed.
- **Did:** replaced phase-local bounce rendering with a persistent
  controller-owned callback clock across FIGHT open/close/reopen. Source:
  `battle_controller_player.c:233-238,471-548`;
  `battle_main.c:2899-2937,2967-2978`. Frames 8-33 (settled menu, two cursor
  moves, B cancel, reopen) are now exact; Tier 1 pins clock continuity.
- **Next:** implement the generic typed resolution confirm-handoff lifecycle.
  New first divergence is legal EARTHQUAKE A at frame 34: **13,279px**, bbox
  **(1,59)-(238,158)**; ROM holds FIGHT through 42 and first prints `G` at
  43, while app prints immediately.
- **Notes:** fixture/test regenerated to the post-fix checkpoint; #52 trimmed
  to the open remainder. Complete §3.2 table remains exact (**25/25 rows**).
  No trace/capture change, import/barrier/ratchet-pin move, or
  battle/turn/absolute-tick branch. PAPERCUT: none.
