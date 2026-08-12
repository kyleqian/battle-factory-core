# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1187 — [MAIN worker, 2026-08-12] **CGB4 post-helper allocation fields source-closed**

- **State:** #55 is source-exact through `ChnVolSetAsm` entry for **2,459
  contiguous cycles** across the same **7/82** zero-lfoDelay CGB4 callbacks.
  Complete MPlay remains **5 exact / 108 null** and the construction clock is
  unwired.
- **Did:** added additive v6 source/ELF/ROM-pinned evidence from caller resume
  `0x082dfea6`: **44** straight-line field-copy cycles plus **10** BL-edge
  cycles per callback, reusing v5 rows without new runtime state. Red-first
  route/storage/input guards and focused v6 **4/4** are green. Smoke is
  **8 files / 375 passed**; typecheck, full `npm test` (**983 files / 9,550
  passed / 1 skipped**), and build (**653 modules**) are green.
- **Next:** hand off with the current boundary at the unresolved
  `ChnVolSetAsm` helper body; keep later fields and all broader Issue #55
  scope null until independently source-proven.
- **Notes:** v6 receipt SHA256 is
  `341be83906b17cd9ad972886a11e6f91270fc1eb3d66dc7cad4ff644daec468f` and
  doc SHA256 is `21227e6a766c9eff565e006e314369049853fbb47c042581534e18f0e7b70ad5`.
  Checkpoints are `c0c6b368` and `8c1efe17`. No oracle rerun, production
  engine change, unsupported barrier, or canonical Battle-2 extension.

## 1186 — [supervisor, 2026-08-12] **CGB4 prefix verified; animation and Rust lanes folded**

- **State:** #55 is source-exact for **2,081 contiguous cycles** through
  `TrkVolPitSet` return across the observed **7/82** CGB4 callbacks. Complete
  MPlay remains **5 exact / 108 null** and the construction clock is unwired.
- **Did:** independently regenerated v5 byte-for-byte (`9a36fadb…`) and
  audited the disassembly: caller argument setup + BL is **14** cycles and
  the helper push is **2** per callback. Folded Meteor Mash framebuffer
  closure through `85fcf7e0` and Rust M5d-0 viability infrastructure through
  `b1ea599a`.
- **Next:** source-close one coherent observed post-helper allocation-field
  slice. Preserve `clear_modM`, nonzero-LFO/unobserved routes, the other 75
  note callbacks, complete note/glue/MPlay costs, service/arbitration, and
  construction-clock wiring null.
- **Notes:** focused v3-v5 **11/11**; union full **982 files / 9,546 passed /
  1 skipped**, build **653 modules**. Rust is **350/350**, fmt/clippy clean;
  rebuilt WASM is **118,835 bytes** (`798127bc…`) and forced parity is
  **757/757**. Fresh post-engine-fold soaks are vanilla **20/20** and full
  **60/60**, zero crashes/hangs. Both branches are contained; no unsupported
  barrier or canonical Battle-2 extension.

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
