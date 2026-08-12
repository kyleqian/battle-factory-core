# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1193 — [supervisor, 2026-08-12] **CGB4 v9 verified; Rust M5d-3 folded**

- **State:** #55 is source-exact for **3,453 aggregate cycles** through fixed
  `call_r3` entry across the observed **7/82** zero-`lfoDelay` CGB4 callbacks.
  Complete MPlay stays **5 exact / 108 null** and the construction clock is
  unwired.
- **Did:** independently regenerated/audited v9's twice-fresh `pan_sweep=0`
  route (**34 each / 238 aggregate**) and its strict dynamic-helper boundary.
  Folded Rust M5d-3's **30** weather/heal/damage/status/Counter
  `CheckViability` effects through merge `84789fbb`; **50** table effects
  remain behind the native barrier. Animation-main is contained.
- **Next:** source-close one coherent dynamic `call_r3`/
  `MidiKeyToCgbFreq` helper slice, stopping before its first unresolved
  discriminator. Preserve helper result/later fields, unobserved routes, the
  other 75 callbacks, complete note/glue/MPlay, service/arbitration, and clock
  wiring null.
- **Notes:** union full **986 files / 9,562 passed / 1 skipped**, build **653
  modules**. Rust is **528/528**, fmt/clippy clean; rebuilt WASM is **138,223
  bytes** (`e6096b79…`) and forced parity is **757/757**. No engine-changing
  fold, unsupported barrier, or canonical Battle-2 extension.

## 1192 — [MAIN worker, 2026-08-12] **CGB4 pan-sweep caller edge source-closed**

- **State:** #55 is source-exact for **3,453 aggregate cycles** through fixed
  `call_r3` entry across the same observed **7/82** zero-`lfoDelay` CGB4
  callbacks. Complete MPlay stays **5 exact / 108 null** and the construction
  clock is unwired.
- **Did:** added additive v9 evidence from the callsite-gated `0x082dfeea`
  `pan_sweep` branch. All seven have `pan_sweep=0`, taking both `0x80`/`0x70`
  sweep tests not-taken and storing `sweep=8`; the caller-only route is **34
  cycles/callback**, **238 aggregate**, through `BL call_r3` entry
  `0x082dfcb4`. Fresh packets are byte-identical: anchor `13d65261…`, LILIANA
  `86d4d2c5…`, varied `87a32977…`.
- **Next:** stop before dynamic `call_r3`/`MidiKeyToCgbFreq` execution. Preserve
  helper/body/result, later fields, unobserved sweep/keyM/helper routes, other
  75 callbacks, complete note/glue/MPlay, service/arbitration, and clock
  wiring null.
- **Notes:** red-first v9 and focused v3-v9 **27/27**, typecheck, smoke
  **8 files / 375 passed**, full `npm test` **986 files / 9,562 passed / 1
  skipped**, and build **653 modules** are green. No duration fit, runtime
  identity, production import, unsupported barrier, animation/Rust change, or
  canonical Battle-2 branch.

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
- **Notes:** focused v3-v8 **23/23**, smoke **8 files / 375 passed**, full
  `npm test` **985 files / 9,558 passed / 1 skipped**, typecheck, and build
  **653 modules** are green; the executable-frontier barrier ratchet is
  unchanged. Source/ELF/ROM receipt and report are additive; no duration fit,
  runtime identity lookup, production import, unsupported barrier,
  animation/Rust change, or canonical Battle-2 branch.
