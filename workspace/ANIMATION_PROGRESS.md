# Animation supervisor verification — MOVE_FURY_CUTTER residual diagnosis merge (2026-09-23)

- **State / merge:** Fast-forwarded verified tooling-only worker commit
  `5a7efb1a9`. `MOVE_FURY_CUTTER` remains **unsupported** and its track remains
  **unfulfilled**; Level 50 stays **272/276 exact, 0 partial, 0 staged, 4
  unsupported**. No production, coverage, sibling, gameplay/RNG/facility,
  boundary, or barrier credit moved.
- **Independent proof:** Two fresh supervisor diagnosis processes are
  byte-identical (`d64a6c3d…`) and account for all **1,225,822** residual
  pixels. The source-quiet mask is identical across **44 rows per orientation**
  (**2,359** player / **2,306** opponent pixels) and is a subset of every
  active row: **802,380** accumulated pixels are invariant static
  field/battler/chrome composition, while **423,442** are active scanout
  (**30,072** monbg transition, **210,120** CUT OBJ+alpha, **30,310**
  monbg+alpha, **152,940** CUT OBJ+palette). Classification uses live source
  latches, not coordinates, RGB fitting, screenshots, or absolute ticks.
- **Gates / next:** The final scoped Fury/source/evidence/production/diagnosis/
  boundary/inventory union passes **6 files / 16 tests**; coverage, animation
  audit, typecheck, and diff checks are green. This is tooling/tests only, so
  the same-production full-suite/build receipt from `e3af4883c` remains valid.
  Resume by fixing the invariant static composition first, then the four
  active scanout phases; require zero residuals and a material altered control
  before promotion. **For the main program:** nothing blocking.

# Animation supervisor verification — MOVE_FURY_CUTTER production partial merge (2026-09-23)

- **State / merge:** Fast-forwarded verified worker commits `74e9970ed` and
  `e3af4883c`. `MOVE_FURY_CUTTER` remains **unsupported** and
  `fury-cutter-counter-power-branches` remains **unfulfilled**; Level 50 stays
  **272/276 exact, 0 partial, 0 staged, 4 unsupported**. No coverage, sibling,
  gameplay/RNG/facility, boundary, or barrier credit moved.
- **Independent proof:** Two fresh supervisor reducer/seam processes are
  byte-identical (`f1bedee4…`) across all eight **43-row** bilateral counter
  bodies. Two fresh actual-core processes are also byte-identical
  (`f6d168f3…`) and reproduce the honest blocker: **0/344 exact** framebuffer
  rows and **1,225,822** residual pixels. The retained implementation is one
  source-relative, direction/counter-generic reducer, typed seam, dispatch,
  and CUT/battler/monbg compositor; it adds no screenshot lookup, absolute
  battle tick, coordinate/RGB fit, or gameplay ownership.
- **Gates / next:** On final code `e3af4883c`, independent `npm test` passes
  **1,445 files / 11,523 tests**, with **44 files / 223 tests skipped**, in
  **1,792.93s**; `npm run build` passes **833 modules** with only the inherited
  chunk warning. Focused Fury/source/evidence/boundary/inventory tests,
  typecheck, coverage, animation audit, and diff checks are green. Resume by
  reconciling generic background/monbg/OBJ scanout and palette composition,
  then require twice-fresh zero residuals plus a material altered control
  before promotion. **For the main program:** nothing blocking.

# Animation worker checkpoint — MOVE_FURY_CUTTER reducer/seam/compositor partial (2026-09-23)

- **State / scope:** `MOVE_FURY_CUTTER` remains **unsupported** and `fury-cutter-counter-power-branches` remains **unfulfilled**. No move, sibling, shared-component, gameplay/RNG/facility, boundary, or barrier credit moved.
- **Production:** Added one direction/counter-generic, source-relative 43-row reducer consuming retained live OAM/matrix/palette/register/resource/audio/task/gameplay snapshots, its narrow typed Scene-ON seam, shared-core dispatch, and a generic CUT/battler/monbg compositor. All eight bilateral counter bodies replay twice through the reducer/seam with powers 10/20/40/80, right/left/right/left, and 0/1/3/3 blend repetitions.
- **Exact blocker:** The actual-core raw-RGB attempt is honestly non-exact: **0/344** framebuffer rows, **1,225,822** aggregate residual pixels (about 2.3k-4.4k/frame). It is retained only as a bounded production partial; no coordinate/RGB fitting, screenshots, absolute ticks, or gameplay ownership were introduced. Resume by reconciling the generic background/monbg/OBJ scanout and palette composition, then add the twice-fresh material-control exact test before any promotion.
