# Animation integration progress

## 2026-09-23 — lifecycle matrix and typecheck green

- State: production integration remains in progress; no release-ready claim.
- Did: corrected the replay driver's directional menu navigation so repeated
  Shadow Punch is actually selected, retained every typed multi-hit/two-turn
  selector, and added ordinary switch/KO/miss/immunity lifecycle coverage.
  Missing targets and unsafe numeric controller fields now fail explicitly.
- Checks: `npm run typecheck` passed. Focused request/ordinary-route/lifecycle
  suite passed **3 files / 46 tests**; 40 generated seeds / **470 decisions**
  preserve rules and RNG between modes. See `.integration/lifecycle-tests.log`.
- Next: fold the bounded basic adapter batch after review and its checks,
  one-way merge supervisor-verified Factory snapshot `88cd3bc80`, validate the
  actual union, and build the isolated stamped preview. Continue remaining
  reusable adapter/host work after that checkpoint.
- Precise gap: Shadow Punch's source trace blends a stale allocated unfaded
  OBJ palette. The current live attacker-palette substitution is not exact;
  replace it with a source-derived persistent palette allocator. Existing
  fixture exactness and functional ordinary queue evidence remain separate.

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
  cleanly. Added opponent-orientation test awaits next focused run. The queued typecheck was later replaced by a completed green run;
  see the newer checkpoint. Full suite/build still required on final code.
  Logs/artifacts are isolated under .integration/ (gitignored).
- Inventory: bounded worker 0c0ff43f8 folded as ac5f7be68, documenting every one
  of the pinned baseline's 267 exact Factory moves, 196 fixture-bound renderer
  branches, and reusable host categories. This is a baseline audit, not a
  claim that all those moves are live.
- Next: finish typecheck/affected tests, broaden reusable adapters, add genuine
  repeated/multi-hit/two-turn/miss/switch/KO cases, fold newer verified Factory
  snapshots one-way, then full tests/build and an isolated build-stamped preview.
  Do not run run-supervisor.sh --lane animation or change the shared oracle.
