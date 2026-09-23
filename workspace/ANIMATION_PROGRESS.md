# Animation worker exact promotion — MOVE_OUTRAGE (2026-09-23)

- **State / tested tree:** Production promotion landed in `f902dc4b0` and the
  final production/evidence tree tested below is `068eab7c4` on
  `worker/animation-20260923-180321`. The only new coverage entry and
  fulfilled component track are Outrage-owned; `MOVE_HELPING_HAND` remains
  blocked, the 77 non-Factory moves remain out of scope, and no
  gameplay/RNG/turn/facility or unsupported-barrier ownership moved.
  `ANIMATION_LATCHES.md` required no refinement.
- **Production / proof:** `src/animation/outrage.ts`, typed Scene-ON seam,
  and live `battleScene.ts`/`core.ts` wiring now reduce and composite the
  source-relative Small Ember, ellipse, ShakeMon2, blend cycle, audio, palette,
  OAM/matrix, resource, and cleanup lifecycles. The source/component and seam
  verifier passes **480/480** rows across both orientations (240 retained rows
  checked twice); the actual shared-core verifier passes **240/240** rows in
  each of two fresh processes with **zero residual pixels**. The CROBAT/BLISSEY
  reversed-side geometry/allocation/palette/order/RNG control changes output
  while opaque gameplay state/RNG remain unchanged.
- **Gates / exact commands:** `npx vitest run
  tests/animation/outrageSourceStaging.test.ts
  tests/animation/outrageEvidenceCheckpoint.test.ts
  tests/animation/outrageReducer.test.ts
  tests/animation/outrageActualCore.test.ts` passes **4 files / 7 tests**;
  both actual-core processes pass all **240/240** rows with zero residual
  pixels. `npx vitest run tests/animation/animationBoundaryRatchet.test.ts
  tests/animation/factoryAnimationInventory.test.ts
  tests/animation/animationWorkPlan.test.ts` passes **3 files / 16 tests**.
  `npm run animation:coverage` reports Level 50 **275/276 exact** and Open-only
  **1/1 exact**, with Helping Hand the sole blocker; `npm run animation:audit`
  is exact. `npm run typecheck` passes; `npm run test:smoke` passes **8 files /
  448 tests** in **76.32s**; serialized `npm test` passes **1,462 files / 11,553
  tests**, with **44 files / 223 tests skipped**, in **2,164.86s**; and
  `npm run build` passes (**838 modules**, inherited chunk-size warning only).
  `git diff --check` passes. The narrow Overheat no-credit receipt refresh in
  `068eab7c4` only updates its derived audit hashes after Outrage coverage
  promotion; Overheat receives no credit. Resume only for supervisor merge;
  the final ledger commit is documentation-only.

# Animation supervisor verification — MOVE_OUTRAGE evidence merge (2026-09-23)

- **State / merge:** Fast-forwarded verified worker commits `032f9f682` through
  `21431b31c`, plus supervisor repair `024a4005b` correcting the sole carrier
  count to Open-only. **MOVE_OUTRAGE remains unsupported** and no component
  track is fulfilled; Level 50 remains **275/276 exact** and Open-only remains
  **0/1 exact**. No production, move, sibling, gameplay/RNG/facility,
  import-boundary, or unsupported-barrier credit moved.
- **Independent proof:** Re-ran the strict evidence verifier twice with
  byte-identical digest `fc8117bc…`, reproducing both complete **120-row**
  orientations, probe digests `ec368bdf…` / `1ddc124c…`, RGB-sequence digests
  `b2d5b37c…` / `b201257a…`, all **119/119** predecessor OAM/matrix/palette
  latches, 23 flame lifetimes, immutable gameplay state/RNG, and first-inactive
  cleanup. The source audit independently pins `0x082cb908..0x082cbaa3`, all
  six components, and Open-only `FRONTIER_MON_DRAGONITE_5`.
- **Gates / next:** The corrected supervisor union passes **5 files / 21
  tests**; coverage, animation audit, deterministic source/evidence reruns,
  JSON/archive checks, typecheck, and diff checks pass. The earlier final
  supervisor full suite/build remains reusable because this merge is strictly
  evidence/tests/tooling/animation-ledgers. Next dispatch a bounded Outrage
  reducer/seam/compositor/actual-core acceptance step; Helping Hand remains
  blocked pending legal doubles Scene-ON staging. **For the main program:**
  nothing blocking.

# Animation worker checkpoint — MOVE_OUTRAGE unsupported dense evidence (2026-09-23)

- **State / commits:** `032f9f682` and `0909b2615` retain an unsupported Scene-ON evidence
  checkpoint only. No reducer, typed seam, renderer/compositor, production
  asset, coverage entry, component-track fulfillment, sibling credit, or
  gameplay/facility ownership was added.
- **Source / legal staging:** The complete pointer-owned `Move_OUTRAGE`
  interval is `0x082cb908..0x082cbaa3` (411 bytes), including the 148-byte
  `OutrageFlames` body and all six graph components. The source census pins
  the sole Open carrier `FRONTIER_MON_DRAGONITE_5` (index 854, set 854;
  Outrage/Double-Edge/Thunder Wave/Roar, Lum Berry, Docile). Complete,
  transient-free party fixtures are Scene-ON valid in both player-back and
  opponent-front orientations; the opponent fixture repeats Outrage in all
  four move slots solely to constrain legal Factory AI selection.
- **Dense proof:** Two fresh runs per orientation retain every pointer-owned
  row through first inactive cleanup: player-back frames **76..195** and
  opponent-front **80..199**, **120 + 120 = 240** rows. Probe JSON digests are
  `ec368bdf…` / `1ddc124c…`; chronological raw-RGB sequence digests are
  `b2d5b37c…` / `b201257a…`; full state/RGB archives and normalized maps are
  committed and independently rechecked byte-identically.
- **Measured behavior:** 23 `gOutrageFlameSpriteTemplate` allocations each
  live 30 ticks with slot reuse; `Task_LoopAndPlaySE` is 4..20,
  `AnimTask_TranslateMonElliptical_Step` 4..81,
  `AnimTask_ShakeMon2_Step` 14..91, and
  `AnimTask_BlendColorCycleLoop` 4..92. The attacker ellipse reverses x
  velocity by side (+12 player / −12 opponent) and returns neutral at age 82;
  target ShakeMon2 reaches x2 ±2 and returns neutral at age 92. Palette banks
  1/2/3/16/17/23 change with the recorded faded→hardware schedules; OAM,
  matrices, and hardware palette equal the preceding software/faded row
  **119/119**, with no exceptions. Small Ember tile/palette tags live 1..118,
  audio is `SE_M_DRAGON_RAGE` with attacker pan −64/+63, presentation RNG
  changes on 119 rows, gameplay RNG and immutable battle state do not change,
  and owned resources/tasks/sprites are zero at cleanup.
- **Gates / next:** Focused source/staging and dense-evidence tests pass **5/5**;
  the full scoped animation union (source/evidence, boundary, inventory, and
  work-plan) passes **21/21**. Source audit and evidence verifier are stable
  across reruns; `npm run animation:coverage`, `npm run animation:audit`,
  `npm run typecheck`, JSON/gzip/tar validation, and `git diff --check` pass.
  Supervisor verification must keep Outrage unsupported and Helping Hand
  blocked; no production suite/build was required for this evidence-only delta.
