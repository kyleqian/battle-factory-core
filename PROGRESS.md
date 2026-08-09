# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1057 — [MAIN worker, 2026-08-09] **#86 terminal forced-continuation closed**

- **State:** source-generic repair and red-first public-path test are green;
  production build, smoke **375/375**, full-policy seeds **16/18/27**, and
  vanilla **0:20 = 20 OK / 0 CRASH / 0 HANG** pass. Full suite is **830/831
  files, 8,236 passed / 1 skipped** with only the independently changing,
  out-of-scope Gate-6 manifest regeneration test red.
- **Did:** seed 27's typed receipt proves MURKROW enters at 4 HP, then the same
  forced-switch continuation queues sandstorm damage, faint, and immutable
  trainer-win commands. The send-out seam now returns every command after the
  final typed switch-in to the ordinary presentation lifecycle before any
  stable-boundary handoff; the missing-player-command invariant stays fatal.
- **Next:** supervisor should fold the independent Gate-6 artifact update and
  rerun `npm test`; #86 itself is closed. Continue the ordered family-level
  Gate-6 worklist after the stable union is green.
- **Notes:** seed 27 is **OK b2 t16 f24829 roundLost**; seeds 16/18 are **OK
  b4 t37 f91394 / b1 t22 f12881 roundLost**. No seed/battle/turn/tick branch,
  unsupported barrier, animation, Gate-6 artifact, or canonical Battle-2
  window changed.

## 1056 — [MAIN worker, 2026-08-09] **#87 wake-up print-table selector closed**

- **State:** committed source-generic repair is green: full suite **831 files /
  8,236 passed / 1 skipped**, production build, smoke **375/375**, and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** source audit proved `AtkCanceler_UnableToUseMove` writes the ordinary
  wake row (0) or Uproar row (1) for `gWokeUpStringIds` before handing
  `BattleScript_MoveUsedWokeUp` to `printfromtable`, with no RNG draw. The
  typed canceler loop now durably projects every phase-owned selector receipt;
  Tier-1 coverage red-proved both wake rows and their real full-turn message.
- **Next:** #86 remains the separate seed-27 no-command boundary at **b4 t16
  f71106**; keep its fatal invariant intact while diagnosing its reducer shape.
- **Notes:** seed 18 is now **OK b3 t18 f53730 roundLost**; seed 16 remains
  **OK b2 t51 f48250**, while seed 27 reproduces unchanged. Unknown
  `printfromtable` table/opcode guards remain fatal; no animation, Gate-6, or
  canonical Battle-2 work changed. Commits `2798e6d3`, `36d5873f`.
