# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1191 — [MAIN worker, 2026-08-12] **CGB4 post-helper caller slice source-closed**

- **State:** #55 is source-exact for **3,215 aggregate cycles** through the
  `pan_sweep` read/tst boundary across the same observed **7/82** zero-
  `lfoDelay` CGB4 callbacks. Complete MPlay stays **5 exact / 108 null** and
  the construction clock is unwired.
- **Did:** added additive v8 evidence from caller resume `0x082dfecc`, capturing
  only signed `keyM` at the callsite-gated `bpl` boundary. All seven have
  `keyM=0`, so the route is **40 cycles/callback**, **280 aggregate**; the
  first unresolved branch is `0x082dfeea bne _081DDCBA` on `ToneData.pan_sweep`.
  Independent fresh packets are byte-identical: anchor `e9c67695…`, LILIANA
  `80450910…`, varied `ff77f6e1…`.
- **Next:** stop at the pinned `pan_sweep` discriminator; preserve its
  unobserved routes, later fields, other 75 callbacks, complete note/glue/
  MPlay, service/arbitration, and clock wiring null.
- **Notes:** focused v3-v8 **23/23** green. Source/ELF/ROM receipt and report
  are additive; no duration fit, runtime identity lookup, production import,
  unsupported barrier, animation/Rust change, or canonical Battle-2 branch.

## 1190 — [supervisor, 2026-08-12] **CGB4 helper verified; Rust M5d-2 folded**

- **State:** #55 is source-exact for **2,935 contiguous cycles** through
  `ChnVolSetAsm` return across the observed **7/82** CGB4 callbacks. Complete
  MPlay stays **5 exact / 108 null** and the construction clock is unwired.
- **Did:** audited the four-scalar entry packets and exact both-unclamped
  helper route, including **2** multiply-internal premium cycles per callback;
  regenerated v3-v7 **19/19**. Folded Rust M5d-2's **29** stat/screen
  `CheckViability` effects through merge `fa09a5b0`; animation-main is
  contained.
- **Next:** source-close one coherent post-helper caller-field slice, stopping
  before its first unresolved branch. Preserve unobserved clamp/nonzero-LFO
  routes, the other 75 callbacks, complete note/glue/MPlay costs,
  service/arbitration, and clock wiring null.
- **Notes:** union full **984 files / 9,554 passed / 1 skipped**, build **653
  modules**. Rust is **441/441**, fmt/clippy clean; rebuilt WASM is **138,463
  bytes** (`6f84f91c…`) and forced parity is **757/757**. The latest
  engine-changing fold remains covered by vanilla **20/20** and full **60/60**
  soaks. Both branches are contained; no unsupported barrier or canonical
  Battle-2 extension.

## 1189 — [MAIN worker, 2026-08-12] **CGB4 `ChnVolSetAsm` observed routes source-closed**

- **State:** #55 is source-exact for **2,935 contiguous cycles** through
  `ChnVolSetAsm` return across the same observed **7/82** CGB4 callbacks.
  Complete MPlay stays **5 exact / 108 null**; the construction clock is
  unwired.
- **Did:** chose path B and captured only four address-free entry scalars.
  Twice-fresh packets prove both unsigned clamps take `bls` on all seven
  callbacks. The complete helper costs **68 each / 476 total**, including two
  ARM7TDMI multiply-internal premium cycles. Red-first and focused v3-v7
  **19/19** are green.
- **Next:** source-close one bounded post-helper caller-field slice, stopping
  before its first unresolved branch. Keep unobserved clamp/nonzero-LFO
  routes, other 75 callbacks, complete note/glue/MPlay, service/arbitration,
  and clock wiring null.
- **Notes:** packets SHA256 anchor `a2f62e3b…`, LILIANA `53db7226…`, varied
  `406586b9…`; evidence `bec89adb…`, doc `269cae4c…`. No duration fit,
  pointer/identity lookup, production import, unsupported barrier, or
  canonical Battle-2 extension. Smoke **8 files / 375 passed**, typecheck,
  full **984 files / 9,554 passed / 1 skipped**, and build **653 modules** are
  green; the executable-frontier barrier ratchet is unchanged and passes.
