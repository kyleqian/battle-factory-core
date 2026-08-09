# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1060 — [MAIN worker, 2026-08-09] **S8 seven-win live seam proven**

- **State:** red-first live route is green at **56,556 frames** through public
  `tick()` inputs with **4,228** render samples; focused random-soak **10/10**,
  orchestrator **45/45**, and typecheck pass. Final smoke/full soak/suite/build
  verification remains in progress.
- **Did:** added an optional tools/test-only `stateFactory` plus opt-in route
  diagnostics and a CLI-inaccessible strong policy that reuses `RandomPlayer`.
  Seed 21 starts at the normal generated intro boundary with source-derived
  records 664/678/527 and follows real command, forced-switch, postwin,
  swap-decline, and terminal default-NO UI gates to seven live wins.
- **Next:** run smoke, vanilla 0:20, full-policy 0:60, full suite/build, and
  Scene-OFF oracle info; then record the exact final verdict and clean commit.
- **Notes:** terminal is `roundComplete`, battle index 6 / battle 7 turn 11,
  with **7 opponent generations + 7 battle RNG segments** and the `roundWon`
  record menu observed input-ready before NO. No `src/**`, canonical Battle-2,
  animation, unsupported-barrier pin, or CLI full/vanilla contract changed.

## 1059 — [MAIN worker, 2026-08-09] **full-policy ability display-name crash closed**

- **State:** source-backed repair `16ca008d` is green: full suite **833 files /
  8,245 passed / 1 skipped**, production build, focused **82/82**, smoke
  **375/375**, vanilla **0:20 = 20 OK / 0 CRASH / 0 HANG**, and full-policy
  **0:60 = 60 OK / 0 CRASH / 0 HANG**.
- **Did:** replaced the private 34-entry handwritten ability display table
  with a generic join from canonical IDs in `ability-item-hooks.json` to exact
  Emerald names in `summary-info.json`. Red-first Role Play coverage proves
  `STRINGID_PKMNCOPIEDFOE` renders ability 14 as exact `COMPOUNDEYES`; a
  source-derived ratchet proves all **71** legal non-NONE abilities across
  Level-50 set IDs 110..849 resolve, while unknown IDs remain fatal.
- **Next:** continue the ordered family-level Gate-6 worklist; the current
  0:60 full-policy sweep exposes no remaining crash/hang signature to cluster.
- **Notes:** seed 22 is **OK b2 t32 f39888 roundLost** and seed 19 is **OK b3
  t14 f49602 roundLost**. No unsupported barrier, canonical Battle-2 window,
  animation, driver policy, or generated artifact changed.

## 1058 — [MAIN worker, 2026-08-09] **full-policy RECORD-NO postwin hang closed**

- **State:** source-generic repair and red-first public `tick` coverage are
  green: full suite **832 files / 8,243 passed / 1 skipped**, production
  build, focused **48/48**, smoke **375/375**, and vanilla **0:20 = 20 OK / 0
  CRASH / 0 HANG**.
- **Did:** source `AskRecordBattle` sends NO back through
  `AskReadyForOpponent`; the production reducer instead retained the resolved
  question after its re-asked continuation menu became input-ready, so
  `core.tick` could never route GO ON. `advancePostwin` now retires that stale
  question and its owned clocks exactly at the relative menu-ready boundary;
  a fresh A there enters scouting page 1 with ordinary JOY_NEW semantics.
- **Next:** seed 19 now passes the repaired postwin, swap screen, Battle 2,
  and reaches Battle 3 before the separate existing fatal name guard reports
  unmapped ability 14 at **b3 t12 f47319**. Supervisor should scope that
  distinct string-coverage defect; this bounded postwin hang is closed.
- **Notes:** full-policy seed 50 is **OK b2 t13 f28152 roundLost**. Seed 19's
  first repaired route accepts a kept-party swap exit and reaches the Battle-2
  intro by f17681; no driver policy, hang limit, animation, Gate-6 artifact,
  unsupported barrier, or canonical Battle-2 window changed.
