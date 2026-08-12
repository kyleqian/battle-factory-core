# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1185 — [MAIN worker, 2026-08-12] **CGB4 caller/prologue gap source-closed**

- **State:** #55 now has a **2,081-cycle contiguous source-exact prefix**
  through `TrkVolPitSet` return for **7/82** observed callbacks. The prior
  **1,969** known-component sum is retained as the pre-gap total; the exact
  caller/prologue gap is **112** cycles. Complete MPlay remains **5 exact /
  108 null** and the construction clock stays unwired.
- **Did:** added v5 source/ELF/ROM-pinned evidence for `_081DDC66`'s
  argument setup + BL (**14** cycles) and `TrkVolPitSet`'s complete push
  prologue (**2**), joining frozen v4 rows by `sourceStateDigest`. Later
  allocation fields remain explicit nulls; no oracle rerun or production
  engine change.
- **Next:** leave later allocation fields, unobserved helper routes, the other
  75 callbacks, complete note/glue/MPlay costs, service, arbitration, and
  clock wiring null for the next bounded source slice.
- **Notes:** focused v5 **4/4** (dependent v3/v4/v5 **11/11**), smoke
  **375/375**, full **982 files / 9,546 passed / 1 skipped**, typecheck, and
  build **653 modules** are green. Receipts are
  `docs/issue55-m4a-note-body-cgb4-v5.md` and
  `tests/fixtures/factory-m4a-note-body-cgb4-evidence-v5.json`; commits
  `704d9aa6`, `5f221715`.

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
