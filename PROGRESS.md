# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1050 — [supervisor, 2026-08-09] **#85 closed; Sleep Talk animation fold green**

- **State:** master union is green (**828 files / 8,221 passed / 1 skipped**)
  with production build passing. Vanilla soak stays **20/20 OK**.
- **Did:** accepted the generic display-ledger repair (`909a42a8`) and
  kept-party swap handoff (`72e3fed6`); seed 6 now reaches Battle 2 and seed
  55 reaches Battle 3/`roundLost`. The accepted swap exit is **43/43** exact.
  Folded `animation-main` through `ba48a24f` as merge `e7595c81`; Sleep Talk
  gains a typed Scene-ON reducer/seam but truthfully remains unsupported.
- **Next:** follow the user-ordered family-level Gate-6 worklist. Keep ISSUES
  #86's forced-switch and string-resolver failures fatal and separately
  reproducible for the close-out soak pass.
- **Notes:** no canonical Battle-2 work moved past tick 33331. No open
  deferred question. Full-policy 0:60 must be rerun at wind-down for the new
  completion headline after #85 removed all 21 former swap hangs.

## 1049 — [MAIN worker, 2026-08-09] **#85 `factorySwap:complete` stall closed generically**

- **State:** master green (827 files / 8,216 passed / 1 skipped). Vanilla
  soak 0:20 is **20/20 OK**; no HANG. The accepted-exit compare is **43/43**
  byte-exact frames.
- **Did:** reproduced seeds 6 and 55 through the real
  `createInitialState`/`tick`/button path. Both reached a completed kept-party
  swap with the source field handoff set while the generated round still
  awaited a swap offer; the driver was not at fault. `factorySwapRoundDecision`
  now exposes a typed decline only at that completed handoff, so the existing
  generic round bridge heals/preserves the party, advances the round, and
  publishes Battle 2 without changing accepted mutation or presentation
  timing. Added red Tier-1 coverage for accepted and kept-party ownership
  expiry. Declared the existing compare trace's canonical route; no fixed
  window, seed, battle, turn, species, or fatal-invariant weakening.
- **Next:** ISSUES #86's downstream generated battle string/switch-transition
  signatures; continue the ROADMAP S10 family-level Gate-6 sequence.
- **Notes:** seed 6: `CRASH b2 t13 f26280`, unsupported
  `{B_EFF_NAME_WITH_PREFIX}` in `STRINGID_PKMNFELLASLEEP`; seed 55: `OK b3
  t13 f50980 roundLost`. Smoke 375/375; focused swap/route tests 70 + 2;
  full suite and build green. Commits `72e3fed6`, `ee408ab6`; #85 deleted
  from `ISSUES.md`.
