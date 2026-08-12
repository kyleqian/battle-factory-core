# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1183 — [MAIN worker, 2026-08-11] **CGB4 `TrkVolPitSet` helper source-closed**

- **State:** #55 has source-exact post-prologue helper components for the
  observed zero-LFO CGB4 family: **7/82** callbacks, with complete MPlay still
  **5 exact / 108 null** and the construction clock unwired.
- **Did:** twice-fresh OFF v4 packets are byte-identical for anchor/LILIANA/
  legal-varied (0/3/4): `fbe6a35f…` / `4f2e86fe…` / `64ea0a16…`. The reducer
  closes five flags-clear routes at **56** cycles and two observed VOLSET
  routes at **138**. The **556** helper cycles plus the **1,413** v3 prefix are
  **1,969 known component cycles**, not a contiguous prefix: caller BL and the
  helper prologue remain null. Capture is operand-minimal and joins frozen v3
  rows by `sourceStateDigest`; source/ELF/ROM pins are committed.
- **Next:** hand off the source-close receipt; leave all unobserved helper
  branches, caller BL/prologue/later fields, callback/glue, service,
  arbitration, and clock null for the next bounded step.
- **Notes:** focused dependent group **15/15**, smoke **375/375**, typecheck,
  full **979 files / 9,445 passed / 1 skipped**, and build **653 modules** are
  green. Commits `f70f0a9c` and `754cb27e`; no production src, gameplay,
  renderer, animation, Rust, ROADMAP, canonical Battle-2, or unsupported-
  barrier change.

## 1182 — [supervisor, 2026-08-11] **CGB4 body verified; animation and Rust lanes folded**

- **State:** the observed CGB4 note route is source-exact through the
  allocation body for **7/82** callbacks. Complete MPlay remains **5 exact /
  108 null** and the construction clock stays unwired.
- **Did:** independently audited the reducer and fixed its generated prose to
  derive the correct **825-cycle** body total (`68afcb84`). Folded Meteor Mash
  bilateral Scene-ON evidence through `ee1b5eaa`, then Rust `CheckBadMove`
  M5b-2/M5b-3 through `48ef0a5f` and `ba63c1ca`; Rust now handles all **109**
  table effects natively.
- **Next:** source-close the observed zero-LFO `TrkVolPitSet` helper route.
  Keep `clear_modM`, later fields, the other 75 post-selection callbacks,
  complete callback/glue, service, arbitration, and clock wiring null.
- **Notes:** focused CGB4 **15/15** plus corrected v3 **3/3**. Union full is
  **978 files / 9,441 passed / 1 skipped** and build **653 modules**. Rust is
  **330/330**, fmt/clippy clean; rebuilt WASM is **99,929 bytes**
  (`ee204627…`) and forced parity is **660/660**. Required soaks are vanilla
  **20/20** and full **60/60**, zero crashes/hangs. No unsupported barrier or
  canonical Battle-2 extension.

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
