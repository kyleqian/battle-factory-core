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

# Animation supervisor verification — MOVE_ICE_BALL exact merge (2026-09-23)

- **State / merge:** Fast-forwarded verified worker commits `3f7f4b904` through
  `924b2f31e`; **MOVE_ICE_BALL is exact** and only its
  `ice-ball-five-counter-bg-shards` track is fulfilled. Level 50 is now
  **275/276 exact, 0 partial, 0 staged, 1 unsupported**. Helping Hand remains
  evidence-blocked; no sibling, gameplay/RNG/facility, import-boundary, or
  unsupported-barrier credit moved.
- **Independent proof:** Ran the actual-core verifier twice from the worker
  tree with byte-identical reports: **872/872** source, seam, chronological
  raw-RGB, and actual-framebuffer rows, **zero residual pixels**, verdict digest
  `92954a69…`. A material CROBAT/BLISSEY control changes the rendered digest
  (`b9453bcd…` → `cb8dc58f…`) while gameplay state/RNG remain unchanged. The
  Rapid Spin receipt update is limited to its explicit Ice Ball source control;
  its retained ROM, semantic, RGB/framebuffer, and change-map hashes did not
  change.
- **Gates / next:** Supervisor focused union passes **17 files / 53 tests**;
  coverage, animation audit, JSON, and diff checks pass. The final independent
  serialized supervisor suite passes **1,458 files / 11,546 tests** with **44
  files / 223 tests skipped** in **1,861.48s**; `npm run build` passes **837
  modules** with only the inherited chunk warning. Next dispatch a bounded
  source/legal dense-evidence step for Open-only **MOVE_OUTRAGE**, using legal
  carrier `FRONTIER_MON_DRAGONITE_5`; Helping Hand remains separately blocked.
  **For the main program:** nothing blocking.
