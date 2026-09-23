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

# Animation worker checkpoint — MOVE_ICE_BALL exact production (2026-09-23)

- **State / commits:** `3f7f4b904`, `d90589a52`, `9889b78b6`, `49119ed5e`,
  and `87838a4e3` promote **MOVE_ICE_BALL exact** and only
  `ice-ball-five-counter-bg-shards` fulfilled. Level 50 is now **275/276
  exact, 0 partial, 0 staged, 1 unsupported**. No sibling, gameplay/RNG/
  facility, import-boundary, or unsupported-barrier credit moved.
- **Implementation / proof:** Source-extracted ICE_CHUNK plus the existing
  ICE_CRYSTALS asset feed one counter-generic reducer, typed Scene-ON seam,
  and live shared-core renderer. It preserves predecessor transfer and the
  player-back counter-3 age-38 OAM exception. Both orientations and all five
  natural bodies pass **872/872** semantic, seam, chronological raw-RGB, and
  actual-framebuffer rows twice fresh, with **zero residual pixels** at digest
  `92954a69…`; lengths are 76/76/76/76/132 per orientation. A material
  CROBAT/BLISSEY side/species/geometry/presentation-RNG/allocation control
  changes output while gameplay state/RNG remain opaque and unchanged.
- **Gates / next:** Tested code commit `87838a4e3`. Focused Ice Ball,
  Rollout, Rapid Spin, Sheer Cold, Ice Beam, boundary, inventory, coverage,
  audit, typecheck, and smoke (**8 files / 448 tests**) pass. Final serialized
  `npm test` passes **1,458 files / 11,546 tests**, with **44 files / 223 tests
  skipped**, in **1,859.60s**; `npm run build` passes **837 modules** with only
  the inherited chunk-size warning. Next ready move is Open-only
  `MOVE_OUTRAGE`; `MOVE_HELPING_HAND` remains evidence-blocked.

# Animation supervisor verification — MOVE_ICE_BALL evidence merge (2026-09-23)

- **State / merge:** Fast-forwarded verified worker commit `639a1e1f7`.
  `MOVE_ICE_BALL` remains **unsupported** and the 20-component
  `ice-ball-five-counter-bg-shards` track remains **unfulfilled**; Level 50
  stays **274/276 exact, 0 partial, 0 staged, 2 unsupported**. No production,
  move, sibling, component, gameplay/RNG/facility, import-boundary, or
  unsupported-barrier credit moved.
- **Independent proof:** Fresh supervisor player-back and opponent-front
  direct-mGBA probes reproduce the retained **436-row** dense digests
  `278737a3…` / `6acb3416…` and raw-RGB sequence digests `03238c1f…` /
  `f4432d82…` exactly. Each natural chain reaches counter maxima **0..4**
  with complete **76/76/76/76/132** windows through cleanup; the retained
  compact maps regenerate byte-identically and keep the measured bilateral
  OAM/matrix/palette/BG/audio/RNG latches without production input.
- **Gates / next:** Supervisor focused source/evidence/boundary/inventory union
  passes **4 files / 17 tests**; coverage, animation audit, JSON, and diff
  checks pass. The recorded green production baseline remains reusable because
  this merge changed only evidence, tests, tooling, and animation ledgers.
  Next dispatch a bounded production implementation/acceptance step for Ice
  Ball; Open-only `MOVE_OUTRAGE` follows when Level-50 ready work is exhausted.
  **For the main program:** nothing blocking.
