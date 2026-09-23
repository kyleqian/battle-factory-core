# Animation worker checkpoint — MOVE_ICE_BALL source/legal dense evidence (2026-09-23)

- **State / credit:** Source and legal staging are complete, but
  MOVE_ICE_BALL remains **unsupported** and
  ice-ball-five-counter-bg-shards remains **unfulfilled**. Coverage stays
  **274/276 exact, 0 partial, 0 staged, 2 unsupported**; no production,
  seam, compositor, actual-core, move, sibling, or component credit moved.
- **Did:** Audited the complete 20-component Move_ICE_BALL root
  (0x082d72a4..0x082d7473, 463 bytes), including Ice Ball callbacks,
  affine scales, arc, shard lives, counter branches, target shakes, assets,
  sounds, and strongest-only BG_ICE cleanup. Legal Level-50 party-only
  Scene-ON fixtures use ROM SPHEAL=341 against genderless REGISTEEL=403
  with seed 305420103; the source census retains SPHEAL, DELIBIRD, and
  SEALEO_1.
- **Evidence:** Player-back and opponent-front each retain **436 rows**
  (76/76/76/76/132) through first inactive cleanup. Two fresh probes per
  orientation are byte-identical: dense/RGB sequence digests are
  278737a3…/03238c1f… and 6acb3416…/f4432d82…. Maps measure counters
  0..4, shards 5/7/9/10/10, shake 8/10/14/18/30, logical shard life
  21, 30-tick arcs, predecessor OAM/matrix/palette latches, the one
  player-back counter-3 OAM exception, side-specific BG_ICE, audio, opaque
  state/RNG, and zero-owned cleanup.
  Compact maps are 100K each with SHA-256 prefixes 9e6cd041…/5af2dea6…;
  full dense rows remain in the compressed fixtures.
- **Gates / next:** Source/evidence tests pass **8/8**, boundary/inventory
  ratchets pass **9/9**, coverage and animation audit pass. The exact next
  step is a separately authorized production implementation/acceptance
  dispatch; this checkpoint intentionally makes no such claim.

# Animation supervisor verification — MOVE_CURSE exact merge (2026-09-23)

- **State / merge:** Fast-forwarded worker commits `48acbced8`, `8c1f3a4a8`,
  `e80041780`, and `967de69e8`. `MOVE_CURSE` and only the
  `curse-ghost-nail-stat-lines` track are now **exact**; Level 50 is **274/276
  exact, 0 partial, 0 staged, 2 unsupported**. No sibling, gameplay/RNG/
  facility, import-boundary, or unsupported-barrier credit moved.
- **Independent proof:** Two fresh supervisor timing-verifier runs are
  byte-identical (`15081d3a…`) and pin the first-Step2 palette transfer at
  player-back **VCOUNT 17 in HBlank** / first post-transfer row **18**, and
  opponent-front **VCOUNT 14 in HDraw** / first post-transfer row **14**,
  without framebuffer-derived input. Two fresh actual-core processes are
  byte-identical (`cce965f3…`) and pass all **1,098/1,098** component,
  typed-seam, chronological raw-RGB, and shared-framebuffer rows with **zero
  residual pixels** at verdict digest `9ccbe049…`. The material CROBAT/
  BLISSEY control changes output while gameplay state/RNG remain unchanged.
- **Gates / next:** Supervisor focused union passes **8 files / 18 tests** and
  smoke passes **8 files / 448 tests**; coverage and animation audit pass.
  The final independent `npm test` passes **1,453 files / 11,534 tests**, with
  **44 files / 223 tests skipped**, in **1,883.21s**; `npm run build` passes
  **835 modules** with only the inherited chunk-size warning. Next ranked
  ready work is Level-50 `MOVE_ICE_BALL`, then Open-only `MOVE_OUTRAGE`;
  `MOVE_HELPING_HAND` remains evidence-blocked. **For the main program:**
  nothing blocking.
- **Session boundary:** Ice Ball source/census scope was prepared, but no
  worker was dispatched: the repository-wide animation lane remained occupied
  by `worker/animation-20260923-103841`, which entered its required full suite
  at 11:39 UTC and could not release early enough for a separately verified
  checkpoint before the 12:18 hard deadline. Resume Ice Ball after that lane
  lock clears; its boundary is the 20-component, five-counter-branch script
  with legal Level-50 carriers SPHEAL, DELIBIRD, and SEALEO_1. This is an
  operational scheduling boundary, not an animation acceptance blocker.

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
