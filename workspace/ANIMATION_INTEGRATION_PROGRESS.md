# Animation integration progress

## 2026-09-23 — ordinary battle queue implemented; validation/adaptation in progress

- State: isolated hcloud integration worktree. The Factory service, timer,
  animation-main and its children remain untouched. Not a release-ready handoff.
- Delivered: typed move/target/turn/power/damage/friendship/multi-hit receipts,
  Scene ON mode threaded through normal Factory boot/rounds, finite animation
  ownership in the existing presentation queue, current art/HUD, cleanup and
  ordinary hit/HP/text/menu continuation. No dev-probe scene injection.
  Five adapters implemented; live readiness is explicitly separate from exact
  acceptance in docs/animation-integration-live-status.json.
- Evidence: real opening draft input plays HAUNTER -> GROVYLE Shadow Punch and
  Confuse Ray, then returns to commands across three turns. Generated seed 54,
  with legal generated rentals and ordinary command input, also plays opponent
  HAUNTER -> WAILMER Shadow Punch and Confuse Ray through all 105/270 displays.
  Seed 65 Confuse Ray and seeds 143/283/287 Smokescreen exercise other current
  species. ON/OFF rules and RNG agree at command boundaries (only the mode bit
  and presentation event numbering differ). Source coordinates distinguish
  player picture-offset effects (+8/clamp) from affine sprite centers.
- Checks: initial affected set 69 passed / 1 obsolete no-op expectation failed;
  updated request expectation + real-route/replay/state parity tests then
  **3 files / 44 tests passed**. Later source-coordinate correction replayed
  cleanly. Added opponent-orientation test awaits next focused run. Typecheck
  is queued in .integration/typecheck-when-idle.sh, yielding priority to other
  worktrees' heavyweight checks. Full suite/build still required on final code.
  Logs/artifacts are isolated under .integration/ (gitignored).
- Inventory: bounded worker 0c0ff43f8 folded as ac5f7be68, documenting every one
  of the pinned baseline's 267 exact Factory moves, 196 fixture-bound renderer
  branches, and reusable host categories. This is a baseline audit, not a
  claim that all those moves are live.
- Next: finish typecheck/affected tests, broaden reusable adapters, add genuine
  repeated/multi-hit/two-turn/miss/switch/KO cases, fold newer verified Factory
  snapshots one-way, then full tests/build and an isolated build-stamped preview.
  Do not run run-supervisor.sh --lane animation or change the shared oracle.
