# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1053 — [MAIN worker, 2026-08-09] **#86 forced-switch transition family closed generically**

- **State:** committed main step `10ad59db` is green through focused tests,
  typecheck, smoke **375/375**, all assigned full-policy repros, and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**; full suite/build are running next.
- **Did:** source `ChooseMonToSendOut` ownership now resets a stale completed
  `monToSwitchIntoId` before a later fresh player choice. A forced-selection
  handoff consumes every ordered typed switch-in receipt, including the
  automatic opponent replacement that can share the player continuation,
  before the stable field check. Both fatal transition invariants remain.
- **Next:** run full `npm test` and `npm run build`. #86 retains only seed 27's
  separate no-command boundary (`b4 t16 f71106`); do not infer a switch cause.
- **Notes:** seeds 12/14/23/44/45/53 are all OK to round loss (deepest seed 23:
  `b6 t24 f92800`). Seed 27 still reproduces unchanged. No canonical Battle-2
  window or animation code changed; no unsupported-barrier pin moved.

## 1052 — [supervisor, 2026-08-09] **Color Change family promoted; second Sleep Talk fold green**

- **State:** corrected main union is green: Gate-6 focused **77/77** and
  smoke **375/375**. The pre-Gate-6 animation union passed the full suite
  (**829 files / 8,224 passed / 1 skipped**) and production build.
- **Did:** promoted **182/183** Color Change move siblings with one shared
  OFF receipt, selector/runtime guards, and per-move ordered source routes.
  Future Sight remains the honest delayed-MOVEEND exception. Supervisor
  review rejected Endeavor's first soft-cost route; `2f50607b` replaces it
  with hard success-arm constraints and proves 0 invalid witnesses. Folded
  animation-main through `a5d15401` as merge `24a9d9bd`; Sleep Talk is now
  exact bilaterally without changing OFF-profile logic.
- **Next:** run the contact/on-damage family in the side lane while MAIN
  closes #86's generic forced-switch transition and command-boundary
  frontiers. Then rerun full-policy 0:60 and use the new signatures.
- **Notes:** ability join gaps fall **261 -> 111**; item gaps stay 300. No
  canonical Battle-2 window past tick 33331 changed. No deferred question.

## 1051 — [MAIN worker, 2026-08-09] **#86 string-control family closed source-generically**

- **State:** master is green (**829 files / 8,224 passed / 1 skipped**) with
  production build passing; vanilla soak **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** source/charmap templates now drive the print-time
  `{B_EFF_NAME_WITH_PREFIX}` / `{B_SCR_ACTIVE_NAME_WITH_PREFIX}` overlays;
  message receipts freeze `gEffectBattler`, `gBattleScripting.battler`, and
  `gLastUsedItem`, including the source item-scan write. Tier-1 batch covers
  all **17** effect and **45** scripting siblings (both orientations), the
  **11** simple item siblings, status/move substitutions, and fatal unknown
  controls.
- **Next:** keep #86's forced-switch identity invariant fatal. Seed 23 now
  reaches `b4 t14 f57791` there; seed 27 reaches `b4 t16 f71106` at the
  separate missing player-command boundary.
- **Notes:** seed 6 is `OK b2 t25 f33553 roundLost`; focused family batch
  26/195 and final regression 3/20, smoke 375/375, full suite/build green.
  No canonical Battle-2 window past tick 33331 changed.
