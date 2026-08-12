# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1184 — [supervisor, 2026-08-12] **CGB4 helper verified; animation and Rust lanes folded**

- **State:** #55 has **1,969 known component cycles** for the observed CGB4
  family, but its contiguous source-exact prefix remains **1,413** cycles for
  **7/82** callbacks. Complete MPlay stays **5 exact / 108 null** and the
  construction clock remains unwired.
- **Did:** corrected the worker receipt so the caller BL/helper prologue gap
  cannot masquerade as a contiguous prefix (`892ac754`). Folded Meteor Mash's
  target compositor through `470cc12b`, Rust M5c's Factory-AI WASM adapter
  through `dc02abcc`, and the M5d CheckViability scout through `efd083b6`.
- **Next:** source-close the exact CGB4 caller-BL/helper-prologue gap, stopping
  at a coherent join. Keep later allocation fields, unobserved helper routes,
  the other 75 note callbacks, complete note/glue/MPlay totals, service,
  arbitration, and construction-clock wiring null.
- **Notes:** union full **981 files / 9,542 passed / 1 skipped**, build **653
  modules**. Rust is **335/335**, fmt/clippy clean; rebuilt WASM is **138,304
  bytes** (`f9da85e0…`) and forced parity is **757/757**. Post-engine-fold soaks
  are vanilla **20/20** and full **60/60**, zero crashes/hangs. Both lane
  branches are contained; no unsupported barrier or canonical Battle-2
  extension.

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
