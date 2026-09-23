# Animation worker checkpoint — MOVE_CURSE exact palette-scanout closure (2026-09-23)

- **State / commits:** `48acbced8` banks direct palette-transfer timing,
  `8c1f3a4a8` threads the generic typed scanout segment through the Curse
  reducer/Scene-ON seam/compositor, and `e80041780` promotes **MOVE_CURSE
  exact** plus only `curse-ghost-nail-stat-lines`. Level 50 is now **274/276
  exact, 0 partial, 0 staged, 2 unsupported**; no sibling, gameplay/RNG/
  facility, import-boundary, or unsupported-barrier credit moved.
- **Direct timing proof:** An instruction-stepped mGBA probe captures the exact
  first-Step2 `BeginNormalPaletteFade` `CpuSet(gPlttBufferFaded, PLTT,
  PLTT_SIZE)` without reading framebuffer pixels or mismatch bounds. Player-
  back is **VCOUNT 17 in HBlank** and opponent-front is **VCOUNT 14 in
  HDraw**, twice fresh per orientation at process SHA-256 `2e26552b…` /
  `5661f83a…`; the generic first-post-transfer rule is `VCOUNT + (HBlank ? 1
  : 0)`, yielding rows **18 / 14**.
- **Exact acceptance:** Two fresh actual-core processes are byte-identical
  (`cce965f3…`) and pass all **1,098/1,098** component, typed-seam,
  chronological raw-RGB, and shared-framebuffer rows with **zero residual
  pixels** at verdict digest `9ccbe049…`. Ghost player/opponent are each
  **373/373** and stat player/opponent each **176/176**. The material CROBAT/
  BLISSEY control changes output while gameplay state/RNG remain opaque and
  unchanged.
- **Gates:** On tested code commit `e80041780`, the focused Curse timing/source/
  evidence/production/actual-core/boundary/inventory union passes **8 files /
  18 tests**; standalone timing/source/evidence/production/actual-core
  verifiers, coverage, animation audit, typecheck, smoke (**8 files / 448
  tests**), and diff/JSON checks pass. Full `npm test` passes **1,453 files /
  11,534 tests**, with **44 files / 223 tests skipped**, in **1,849.94s**;
  `npm run build` passes **835 modules** with only the inherited chunk-size
  warning. **For the main program:** nothing blocking.

# Animation supervisor verification — MOVE_CURSE production partial merge (2026-09-23)

- **State / merge:** Fast-forwarded verified worker commits `a337c727a`,
  `692957182`, and `8dfec8f28`. `MOVE_CURSE` remains **unsupported** and the
  ten-component `curse-ghost-nail-stat-lines` track remains **unfulfilled**;
  Level 50 stays **273/276 exact, 0 partial, 0 staged, 3 unsupported**. No
  sibling, gameplay/RNG/facility, unsupported-barrier, or coverage credit moved.
- **Independent proof:** Two fresh supervisor actual-core processes are
  byte-identical (`c925e284…`) and reproduce verdict `4eed06f8…`: all
  **1,098/1,098** component, typed-seam, and chronological raw-RGB rows pass;
  both stat windows are **176/176** framebuffer exact and each Ghost window is
  **372/373**, for **1,096/1,098** exact overall. The sole residual is first
  `CurseStretchingBlackBg` Step2 at age 26: player **720 pixels** through
  scanline 17 and opponent **660** through scanline 13. The retained post-frame
  hardware palette is already black, so exact closure requires source-timed
  palette-transfer VCOUNT/scanline evidence rather than a coordinate fit. The
  material CROBAT/BLISSEY control changes output while gameplay state/RNG stay
  opaque and unchanged.
- **Gates / next:** Supervisor focused union passes **7 files / 17 tests** and
  smoke passes **8 files / 448 tests**; coverage, animation audit, and diff
  checks are green. Reused worker same-code receipts: full `npm test` passes
  **1,452 files / 11,533 tests**, with **44 files / 223 tests skipped**, in
  **1,855.79s**; build passes **835 modules** with only the inherited chunk
  warning. Next dispatch a narrow evidence-only palette-transfer timing probe
  for the first Step2 row in both orientations; never infer the split from the
  known framebuffer bounds. **For the main program:** nothing blocking.

# Animation worker checkpoint — MOVE_CURSE production partial (2026-09-23)

- **State:** `MOVE_CURSE` remains **unsupported** and
  `curse-ghost-nail-stat-lines` remains **unfulfilled**. Commits `a337c727a`
  and `692957182` add source-extracted Nail/Ghost/mask assets, one branch-
  generic reducer, the narrow typed Scene-ON seam, shared-core dispatch, and
  the live bilateral compositor without taking gameplay/RNG/facility state.
- **Proof:** Two fresh actual-core processes cover all **1,098/1,098**
  component/seam/chronological raw-RGB rows. Both stat windows are exact
  **176/176**; Ghost player/opponent are **372/373** each, for **1,096/1,098**
  framebuffer rows exact. The sole residual is Ghost age 26, the first
  `AnimTask_CurseStretchingBlackBg_Step2` row: player **720 pixels**, bounds
  `[0,0,239,17]`; opponent **660**, `[0,0,239,13]`. The post-frame hardware
  palette is already black while retained RGB preserves the pre-transfer
  palette above the orientation-specific scanline, so the committed snapshot
  lacks the palette-transfer VCOUNT/scanline split. Resume only with that
  source-timed field; do not infer it from framebuffer coordinates.
- **Boundary / next:** The material CROBAT/BLISSEY side/species/geometry/
  allocation/order/presentation-RNG control changes output while gameplay
  state/RNG stay opaque and unchanged. No screenshot lookup, absolute tick,
  unsupported barrier, sibling credit, promotion, or track fulfillment moved.
  Supervisor should retain this green production partial and dispatch a narrow
  palette-transfer timing evidence phase if exact closure remains worthwhile.
- **Gates:** On production commit `692957182`, the focused Curse source/
  evidence/production/actual-core/boundary/inventory union passes **7 files /
  17 tests**; smoke passes **8 files / 448 tests**; coverage remains **273/276
  exact, 3 unsupported**; animation audit, typecheck, and diff checks pass.
  Full `npm test` passes **1,452 files / 11,533 tests** with **44 files / 223
  tests skipped** in **1,855.79s**; `npm run build` passes **835 modules** with
  only the inherited chunk-size warning. Final actual-core verdict digest is
  `4eed06f8...`.
