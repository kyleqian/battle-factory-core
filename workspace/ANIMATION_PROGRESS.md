# Animation supervisor verification — MOVE_SILVER_WIND exact closure (2026-09-19 supervisor)

- **State / merge:** Independently reviewed and fast-forwarded Sol/high commits `ff2ef430e`, `eb120c4ea`, and `e57b7ccd4` onto `animation-main`. Level 50 is now **259/276 exact**, **0 partial / 0 staged**, and **17 unsupported**. Only `MOVE_SILVER_WIND` was promoted; the shared `blend-battle-anim-palette-exclude` track remains unfulfilled pending `MOVE_SKY_ATTACK`, and no gameplay/controller/facility owner, boundary/barrier, sibling, or main-program document changed.
- **Independent proof:** A fresh direct actual-core run passes **193/193 player-back + 196/196 opponent-front = 389/389** component, typed-seam, chronological raw-RGB, and shared-framebuffer rows with zero residual pixels and verdict digest `e3c66e5f…`. The reversed CHARIZARD/BLISSEY control remains material (`8187cde5…` → `16065984…`) while gameplay RNG/state stays opaque and unchanged.
- **Gates / next:** Supervisor-focused Silver Wind/boundary/inventory checks pass **6 files / 17 tests**, and shared smoke passes **8 files / 448 tests**. The worker's same-code full receipt passes **1,388 files / 11,387 tests** with **44 files / 223 tests skipped** plus the **810-module** build. Select the next unsupported Level-50 move as a separate bounded unit; `MOVE_SKY_ATTACK` is still required to close the palette-exclude track.

# MOVE_SILVER_WIND exact BUG/Sparkle6 closure — bounded worker (2026-09-19)

- **State / scope:** `MOVE_SILVER_WIND` alone advances Level 50 to **259/276 exact**, **0 partial / 0 staged**, and **17 unsupported**. The `blend-battle-anim-palette-exclude` track remains **UNFULFILLED** because `MOVE_SKY_ATTACK` is still unsupported; no sibling/track, gameplay/RNG/turn/facility, boundary, or barrier credit changed.
- **Exact production proof:** Source-derived BUG BG selection/scanout, target-monbg BG priority, palette exclusions, and stable source `sSpriteOrder` replay for all 18 affine Sparkle6 bodies close the complete retained window. Two fresh actual-core runs are byte-identical and pass **193/193 player-back + 196/196 opponent-front = 389/389** component, typed-seam, chronological raw-RGB, and shared-framebuffer rows with **0 residual pixels**; verdict digest `e3c66e5f…`. The reversed CHARIZARD/BLISSEY control remains material (`8187cde5…` → `16065984…`) while gameplay RNG/state stays opaque and unchanged.
- **Gates:** Tested code commits `ff2ef430e` + `eb120c4ea`. Focused Silver Wind/shared-control/boundary/inventory gates pass **12 files / 40 tests**; smoke passes **8 / 448**; coverage, audit, and diff checks pass. Final `npm test` passes **1,388 files / 11,387 tests** with **44 files / 223 tests skipped**; `npm run build` passes **810 modules** with the inherited 8 GiB heap. Psych Up source-control receipts and the Sparkle4 move test were made independent of unrelated global promotions per `ANIMATION_VERIFICATION.md`.
- **Next:** Supervisor may fast-forward and independently reproduce the exact comparator. Select the next unsupported Level-50 acceptance unit separately; `MOVE_SKY_ATTACK` remains required before the shared palette-exclude track can be fulfilled.

# Animation maintenance — throughput and bookkeeping (2026-09-19)

- **State:** User requested a controlled stop, branch maintenance, and restart
  of the Hetzner animation campaign. Maintenance is complete; resume from this
  verified checkpoint. Base `8e7c8706e` already contains the independently
  reviewed Silver Wind fade worker `2eec5d465`; its recovery worktree is clean.
  Coverage remains **258/276 exact, 18 unsupported**.
- **Did:** Centralized global coverage totals; scoped move queue checks and
  evidence receipts to their own move. Added a mutation regression proving
  unrelated promotion/queue changes preserve source audit bytes while a real
  move-status regression still fails. Added `ANIMATION_VERIFICATION.md`, aligned
  supervisor/worker/campaign instructions, combined routine briefing phases,
  and archived older live-ledger entries intact.
- **Verification:** Hetzner full gates passed on code commit `cdb82a9bc`: **1,388
  files / 11,387 tests passed**, 44 files / 223 tests skipped; typecheck and
  **810-module build** passed with the service-equivalent 8 GiB heap and one
  Vitest worker. Runner dispatch/default-workspace checks, coverage, asset
  audit, Scene-ON oracle info, and diff checks passed. Durable logs are in
  `/var/lib/pokebench-autonomy/maintenance/20260919/`. Only ledger/archive docs
  follow that code commit, so reuse this green baseline unless master or the
  relevant environment changes. No production animation or pixel changed.
- **Runner:** The animation-only systemd drop-in selects this branch's
  `tools/autonomy/run-lane.sh` and `POKEBENCH_SUPERVISOR_WORKSPACE`; it loads the
  updated verification prompt. Keep the existing 5.5h cap, six-hour cadence,
  September 24 campaign end, and paused Rust lane.
- **Next:** Resume Silver Wind BUG/sparkle closure. The accepted fade/shadow
  bands are **69/69 scoped exact**, global **110/389 exact**, with **279 rows /
  2,828,934 residual pixels** left. All **389/389** component/seam/raw-RGB rows
  pass; preserve the altered live CHARIZARD/BLISSEY control. Promote only after
  complete bilateral **389/389 twice**, zero residual. Never repeat the recovery
  merge or closed source/evidence/reducer/fade work. Use the new verification
  contract and keep only three short checkpoints in this live ledger.
