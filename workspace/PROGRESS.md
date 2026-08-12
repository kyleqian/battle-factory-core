# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1181 — [MAIN worker, 2026-08-11] **CGB4 allocation body prefix source-closed**

- **State:** #55 is source-exact through the observed `_081DDC40` CGB4
  allocation body and the zero-delay branch before `TrkVolPitSet` for **7/82**
  callbacks. Complete MPlay remains **5 exact / 108 null**; the construction
  clock stays unwired.
- **Did:** twice-fresh OFF packets are byte-identical across anchor/LILIANA/
  legal-varied (0/3/4 CGB4 callbacks): five track-null `ClearChain` routes are
  **111** cycles, two previous-null/next-null owner routes are **135**, for
  **825** body and **1,413** known prefix-through-body cycles. Captured only
  address-free channel/track links and `lfoDelay=0`; helper bodies remain null.
- **Next:** preserve null for `clear_modM`, `TrkVolPitSet`, later allocation
  fields, the other 75 post-selection callbacks, complete callback/glue,
  one-pass totals, service, arbitration, and `runFactoryConstructionClock`.
- **Notes:** packet hashes anchor `818433d1…`, LILIANA `c0f11db9…`, varied
  `b303a6ad…`; focused dependent group **24/24**, smoke **375/375**, full
  **977 files / 9,437 passed / 1 skipped**, typecheck, and build **653
  modules** are green. S8 stays closed at 33331; no unsupported barrier,
  gameplay, renderer, pixel, Rust, or ROADMAP/ISSUES change.

## 1180 — [supervisor, 2026-08-11] **CGB4 mutable route verified; Rust M5b-1 folded**

- **State:** the observed type-12 CGB4 family is source-exact through its
  mutable allocation decision for **7/82** callbacks. Complete MPlay remains
  **5 exact / 108 null**; #55 and `runFactoryConstructionClock` stay unwired.
- **Did:** independently regenerated the CGB4 v2 receipt **17/17**, then folded
  rust-main M5b-1 through merge `b9268dc2`: native `CheckBadMove` now covers a
  first batch of 32 effects with TS-generated vectors.
- **Next:** source-close one bounded observed CGB4 allocation-body route or
  another post-selection note family. Preserve complete callback, glue,
  one-pass-total, service, and construction-clock nulls.
- **Notes:** CGB4 worker full **976 files / 9,434 passed / 1 skipped**. Union
  Rust is **204/204**, fmt/clippy clean; rebuilt WASM is **92,766 bytes** and
  forced-WASM parity is **660/660**. Union full is **976 files / 9,434 passed /
  1 skipped** and build **653 modules**. Both lane branches are contained; no
  unsupported barrier, gameplay, renderer, pixel, or canonical Battle-2 change.

## 1179 — [MAIN worker, 2026-08-11] **`ply_note` CGB4 mutable route source-closed**

- **State:** #55 now has a source-general mutable CGB-channel reducer for the
  observed type-12 route: **7/82** callbacks exact; complete MPlay remains
  **5 exact / 108 null** and `runFactoryConstructionClock` stays unwired.
- **Did:** twice-fresh OFF packets for anchor/LILIANA/legal-varied are
  byte-identical (0/3/4 CGB4 callbacks). Captured only status, priority, and
  address-free track ordering at `0x082dfe04`; source-priced **5×14 + 2×42 =
  154** continuation cycles, **588** including the accepted prefix. All six
  status/priority/track branches are reducer-accounted; unresolved inputs
  remain null.
- **Next:** preserve null for allocation body, remaining 75 post-selection
  callbacks, post-callback glue, complete one-pass totals, service, and clock.
- **Notes:** packet hashes anchor `c1394c32…`, LILIANA `3df2c58b…`, varied
  `041b590f…`; focused dependent group **17/17**, smoke **375/375**, full
  **976 files / 9,434 passed / 1 skipped**, typecheck, and build **653 modules**
  are green. Remaining null boundary is allocation body + 75 other
  post-selection callbacks, complete callback/glue/one-pass totals, service,
  VBlank/IRQ/audio arbitration, and clock wiring. No unsupported barrier,
  duration fit, pointer identity, gameplay/pixel, renderer, Rust, or ROADMAP/
  ISSUES change.
