# Animation supervisor checkpoint — MOVE_SUPERPOWER asset prerequisite (2026-09-22)

- **State / scope:** `MOVE_SUPERPOWER` remains **staged/unsupported**, so Level
  50 remains **269/276 exact, 0 partial, 1 staged, 6 unsupported** and Open-only
  remains **0/1 exact**. Added only reproducible production assets for the
  five-component `superpower-rock-orb-fire` track; the track remains
  **unfulfilled**. No reducer, typed seam, compositor/core dispatch,
  framebuffer acceptance, sibling/shared credit, boundary/barrier,
  gameplay/RNG, facility, or main-program owner moved.
- **Assets / proof:** The source extractor byte-pins `ANIM_TAG_CIRCLE_OF_LIGHT`
  **10212** (64x64 / 64 tiles / `0x800`, reusing its existing sheet with the
  ElectricOrbs palette), `ANIM_TAG_METEOR` **10256** (64x64 / 64 tiles /
  `0x800`), and `ANIM_TAG_FLAT_ROCK` **10257** (16x80 / 20 tiles / `0x280`,
  five 16x16 variants selected by arg 2). PNG, 4bpp, GBA LZ77, ELF, ROM,
  template/callback/OAM identities, and the orb affine `32,+4,-6,+6` program
  are independently pinned. Commit `ed99c1335` contains the asset checkpoint.
- **Verification / next:** The extractor check and affected asset/source/
  evidence/boundary/inventory union pass **5 files / 18 tests**; all twenty
  fulfilled-track ratchets now remain move-local instead of forbidding an
  unrelated staged campaign move (**20 files / 104 tests**). Smoke passes **8
  files / 448 tests**. Tested tree `5690f1325` passes full `npm test`: **1,429
  files / 11,495 tests**, with **44 files / 223 tests skipped**, in
  **1,733.88s**; `npm run build` passes **826 modules** with only the inherited
  chunk warning. Next add Superpower's source-relative reducer, narrow typed
  seam, generic compositor/core dispatch, material control, and twice-fresh
  **496/496** zero-residual actual-core proof; do not begin `MOVE_REVENGE`.

# Animation worker checkpoint — MOVE_SUPERPOWER source/evidence staging (2026-09-22)

- **State / scope:** `MOVE_SUPERPOWER` is **staged/unsupported**, so Level 50 is
  **269/276 exact, 0 partial, 1 staged, 6 unsupported**; Open-only remains
  **0/1 exact**. Source classification confirms 14 components and creates the
  sole-representative, precisely five-component
  `superpower-rock-orb-fire` track, which remains **unfulfilled**. No reducer,
  typed seam, compositor, actual-core framebuffer acceptance, promotion,
  sibling/shared credit, gameplay/RNG, facility, or boundary credit moved.
- **Evidence:** Legal Scene-ON MechanicLab parties retain complete dense state
  and every raw RGB frame through cleanup: player-back **79..326 / 248 rows**
  and opponent-front **81..328 / 248 rows**, with two fresh byte-identical
  runs per orientation. Player hashes are dense
  `6a8950947ea4f16d5e70162e676e5ca64b92486751e35a77b888a5051f7e4a8b`,
  probe `b9ded455e88f6f01c9fe05b3bcc8143f733013fadfa0cf49dd7ff3cd92ef06ec`,
  RGB sequence `69d70845cc2e2d7b0d82d490db9365c7bfc467eb65325fe0be80ee729c91c580`,
  map `ac78be9e9040db45a1ad7e330dba3c8897ebd65ac030dc72c9d7c317eb5c9ba4`;
  opponent hashes are dense
  `8c9ac82a2863c6eb4d03b92462e91d491628062f66f8db919eb05ef47cc8715f`,
  probe `b8a3a06431970e197a2584c53edd9e4b414ad02c7bcb764a479e8162f6a4cbba`,
  RGB sequence `b1aa859dc305a11257c5e01b701bf234ebda29087c5103fad9871d149eb3bf9c`,
  map `0641f09f9af2f5a4e5321006498c969252e381833145674ce1cfec51a4550c4f`.
  The source audit receipt is
  `066cbc1291900aa3e47b85cc5adb7112a0f0b05bfbab91dc4ef2dcc6b0d2c03b`.
  Both maps independently measure orb/rock/fireball lifetimes and flips,
  target ShakeMon2 RAM+2 axes, BG-Y/monbg/alpha timing, audio, allocators,
  opaque gameplay state/RNG, predecessor OAM/matrix latches, the age-10 sole
  palette exception, and zero-owned cleanup at age 247.
- **Verification / next:** `superpowerSourceStaging.test.ts` and
  `superpowerEvidenceCheckpoint.test.ts` pass **6/6**; the strict source and
  evidence verifiers, legal-party validators, coverage/track boundary, and
  receipt hashes are green. Resume only when a source-relative live reducer,
  narrow seam, generic compositor, material control, and actual-core
  zero-residual proof can be implemented; do not begin MOVE_REVENGE.

# Animation worker closure — MOVE_MEGAHORN exact (2026-09-22)

- **State / scope:** `MOVE_MEGAHORN` is **exact**, so Level 50 is **269/276
  exact, 0 partial, 0 staged, 7 unsupported**. Added its battle-only
  source-relative reducer, narrow typed Scene-ON seam, and generic live
  compositor. The battle path retains `BG_DRILL`; the dormant contest-only
  `MegahornInContest` identity retains `BG_DRILL_CONTESTS` and its distinct
  slide parameters without inventing a legal battle execution. Only the
  four-component `megahorn-horn-control-flow` track is fulfilled; no sibling,
  shared-component, boundary/barrier, gameplay/RNG, or facility credit moved.
- **Proof:** Legal player-back frames **211..387 (177 rows)** and opponent-front
  **212..387 (176 rows)** pass reducer, typed seam, chronological raw-RGB, and
  shared-core framebuffer comparison **353/353** with **0 residual pixels**,
  reproduced twice in independent fresh verifier processes. Verdict
  `39a56550ff8a655b678247fc3b4df55f148834a3eb56dbe536c1859cd9f54ca0`;
  RGB sequences `cc5965f816ce5cf48cbf183dbf1677630e424c50bdf55c4800a892dd14f9345d`
  / `a1bfc221b7d61a905bac87b0a8e798e5f6657a4534936a8d8366b5578619b246`.
  A material CROBAT/BLISSEY species/side/geometry/allocation control changes
  presentation output while opaque gameplay state and gameplay RNG remain the
  same references. No latch ledger change was needed: the two banked maps
  independently confirmed all supplied move-owned facts.
- **Verification / next:** Production commit `f2c2799b0`; coverage commit
  `22b0af8cf`; tested code/tree `22b0af8cf4f9ab7ba1cbec97424ca1bf9e90d055` /
  `857d8cf444df0b5d0cb25807d791d7bc6d9be325`. The affected exact/boundary/
  inventory union passes **5 files / 13 tests**; asset/source/evidence controls,
  typecheck, animation audit, coverage, diff checks, and curated smoke are
  green. Full `npm test` passes **1,426 files / 11,486 tests** with **44 files /
  223 tests skipped** in **1,739.51s**; `npm run build` passes **826 modules**
  with only the inherited chunk-size warning. Next ranked work is
  `MOVE_SUPERPOWER`; do not infer Megahorn credit for any sibling.

# Animation worker closure — MOVE_WILL_O_WISP exact (2026-09-22)

- **State / scope:** `MOVE_WILL_O_WISP` is **exact**, so Level 50 is **268/276
  exact, 0 partial, 0 staged, 8 unsupported**. Its sole-representative
  `will-o-wisp-orb-fire` track is fulfilled; no sibling or shared split-priority
  track receives credit. Added source-extracted Wisp assets, a source-relative
  reducer, narrow typed Scene-ON seam, and generic live compositor only; gameplay
  state/RNG, facility ownership, boundary lists, and unsupported barriers did not move.
- **Proof:** The retained legal Shuppet gameplay state uses the already-created
  Plusle carrier presentation sprite against Shuckle. Player-back frames **76..289
  (214 rows)** and opponent-front **80..292 (213 rows)** pass component, typed-seam,
  chronological raw-RGB, and shared-core framebuffer comparison **427/427** with
  **0 residual pixels**, reproduced twice in independent verifier processes.
  Verdict `26da45f3…`; RGB sequences `e02e1c81… / 3977ab50…`. A material
  CROBAT/BLISSEY side/species-art/geometry/allocation control changes output while
  opaque gameplay state and RNG remain unchanged.
- **Verification / next:** Production commits `f1dfe92ee` / `10bf3f636`; test-only
  receipt correction `7daa6576e` updates the two stale Confuse Ray assertions without
  changing production, evidence, or credit boundaries. On that tested code, the affected
  union passes **10 files / 30 tests**, the twice-fresh actual-core verdict remains
  **427/427** with zero residual pixels at `26da45f3…`, smoke passes **8 / 448**, the
  full suite passes **1,421 files / 11,477 tests** with **223 skipped**, and build
  passes **824 modules**. Coverage (**268/276 exact**), animation audit, and diff checks
  are green. Next ranked move is `MOVE_MEGAHORN`; Helping Hand remains blocked on legal
  doubles staging.

# Animation supervisor verification — MOVE_EXTRASENSORY exact closure (2026-09-22 supervisor)

- **State / merge:** Recovered, independently reviewed, and fast-forwarded the
  completed Sol/high worker commits `ca3edcb0d`..`1becd7511`, then landed the
  move-local receipt repair `ca8944465`. `MOVE_EXTRASENSORY` and its sole
  `extrasensory-distortion-clone` track are exact; Level 50 is **267/276 exact,
  0 partial / 0 staged, 9 unsupported**. Open-only remains **0/1 exact**. No
  sibling/shared-Psychic credit, boundary/barrier, or gameplay/RNG owner moved.
- **Independent proof:** Two fresh supervisor actual-core processes each pass
  all **322/322** component, typed-seam, chronological raw-RGB, and shared-core
  framebuffer rows with **0 residual pixels**, digest `266a4d21…`, through
  bilateral age-160 cleanup. The altered CROBAT/BLISSEY control changes live
  presentation output while opaque gameplay state/RNG remain unchanged.
- **Gates / next:** Affected Extrasensory + Psychic controls + boundary/inventory
  pass **11 files / 65 tests**; smoke passes **8 / 448**. The final repaired tree
  passes full `npm test` **1,416 files / 11,468 tests** with **44 / 223 skipped**
  in **1,752.28s**, and `npm run build` passes **822 modules** with only the
  inherited chunk warning. Coverage reports **9 ready + 1 blocked**; animation
  audit and diff checks pass. Next dispatch `MOVE_WILL_O_WISP` for complete
  source/carrier classification, legal bilateral staging, dense evidence, and
  its own latch maps; Helping Hand remains blocked on legal doubles staging.
  **For the main program:** nothing blocking.
