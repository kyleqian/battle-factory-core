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

## 729 — [SUPERVISOR 2026-07-30 ~00:35] Slice 7 verified 128/128 — resolution seam design COMPLETE; user stitching report filed as #53; Gate-6 R12b/R11 merged

- **State:** master green (union suite re-run by supervisor after merge
  `5b477d2f`), `git diff --check` clean, DEFERRED.md empty, no orphan
  worktrees; one side worker live (Gate-6 R6+R15). Session so far: 10
  workers, 0 failed steps.
- **Did:** (1) re-ran `battle-command-generated-off.json` myself:
  **128/128 exact** — design §4 Slices 1-7 are all complete, #52 deleted,
  and the command seam's deferred breadth acceptance (entry 704) is
  closed. (2) Merged Gate-6 R12b + R11 (`5b477d2f`): Intimidate→White
  Herb restore/consume and Baton-Pass-vs-switch retention both at kernel
  parity on two seeds; dossier R12 card corrected (Pinsir Hyper Cutter
  mis-scope). (3) **User report (2026-07-30, in-session): the playable
  app's battle is disconnected from the draft** — filed as ISSUES #53
  with the confirmed wiring diagnosis (`core.ts:314` canonical handoff;
  generated path dev-stage-only per `core.ts:302`); the A-mash "warp to
  select screen" is the canonical post-win swap picker. The fix path is
  the already-queued chain: intro lifecycle slices → interactive routing
  flip. (4) PAPERCUTS: audit-switchin stat-stage label entry added.
- **Did (cont., ~00:40):** merged Gate-6 R6+R15 (`worker/side-20260729-235427`):
  R15 Spikes×Flying/Levitate at full kernel parity (all three layer
  fractions, both immunities, exact event order, two seeds); R6 Natural
  Cure caught a REAL kernel divergence — cure not mirrored into the party
  record — filed as **ISSUES #54** (ROM party write
  `battle_script_commands.c:9596`). Union before this merge: **5414
  passed + 1 skip**, build green.
- **Next:** main = trainer-pic/intro slices 1-2 (start-command contract +
  pre-send-out intro) toward the #53 interactive flip; side = #54 fix
  (scoped kernel authorization) then Gate-6 R3/R9. Wind-down before
  05:32 with the animation-fold re-check.
- **Notes:** the #53 flip also needs an interactive-routing decision
  (when the playable path selects generated vs canonical presentation) —
  design it before the flip slice, do not slip it into an intro slice.
  Gate-6 score so far: 5 rows proven (R12-control, R12b, R11, R15, R6
  receipts), 1 kernel divergence found (#54).

---
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
