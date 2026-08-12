# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1199 — [MAIN worker, 2026-08-12] **CGB4 v13 next-command wait route source-closed**

- **State:** #55 is source-exact for **5,212 aggregate cycles** through the
  first post-note wait decrement across the same observed **7/82** CGB4
  callbacks: frozen-v12 **4,589** plus v13 **623** cycles. Complete MPlay
  remains **5 exact / 108 null** and the construction clock is unwired.
- **Did:** twice-fresh address-free packets captured `MusicPlayerTrack.cmdPtr`'s
  target class and byte for exactly the frozen seven rows: all `gamepak-ws0`,
  with `0x86 ×2 / 0x8c ×3 / 0x92 ×2`. Source/ELF/ROM guards close their shared
  encoded-wait route from v12's `ldrb r1,[r2]` through `gClockTable` assignment
  and the first decrement at **89 cycles each**; v12 is byte-identical and the
  only join is `sourceStateDigest`.
- **Next:** stop before the next IWRAM `lfoSpeed` read, whose scalar is absent
  from the packet. Retain later track-loop work, the other 75 note callbacks,
  complete MPlay, service/arbitration, and construction-clock wiring null.
- **Notes:** packet hashes anchor `c3c7b33f…`, LILIANA `10adc46c…`, varied
  `14524c0f…`; v13 evidence/doc `1bb3b2b6…` / `d9a39158…`. Red-first focused
  v3-v13 **45/45**, smoke **8 files / 375 passed**, typecheck, exactly one full
  suite **990 files / 9,580 passed / 1 skipped**, and build **653 modules** are
  green. No runtime pointer/address identity, production import, unsupported
  barrier, animation/Rust change, or canonical Battle-2 branch.

## 1198 — [MAIN worker, 2026-08-12] **CGB4 v12 post-`ply_note` dispatcher source-closed**

- **State:** #55 is source-exact for **4,589 aggregate cycles** through the
  next `MusicPlayerTrack.cmdPtr` load across the same observed **7/82** CGB4
  callbacks: **4,435** unchanged complete-`ply_note` cycles plus **154**
  post-callback glue cycles. Complete MPlay stays **5 exact / 108 null** and
  the construction clock is unwired.
- **Did:** proved the real return owner from source/ELF/ROM: MPlayMain's
  dedicated note `BL` at `0x082dfb3e` preserves LR through `call_r3`, so
  `ply_note` resumes at caller branch `0x082dfb42`, not the generic jump-table
  tail. Frozen-v11-only v12 joins solely by `sourceStateDigest`; each row takes
  the fixed return branch, source-proven `wait==0` loop, and IWRAM `cmdPtr`
  load for **22 cycles**. It stops before `ldrb r1, [r2]` because v11 retains
  neither the current command byte nor `cmdPtr` target storage class.
- **Next:** retain that exact command-byte/storage discriminator, the other 75
  note callbacks, later command/track-loop work, complete MPlay totals,
  service/arbitration, and clock wiring null unless a new bounded receipt
  proves them source-generally.
- **Notes:** v12 evidence/doc SHA256 `d8e94417…` / `821b488f…`; red-first
  route/mutation/count guards and focused v3-v12 **41/41**, smoke **8 files /
  375 passed**, typecheck, exactly one full suite **989 files / 9,576 passed /
  1 skipped**, and build **653 modules** are green. No duration fit, runtime
  pointer/address identity, production import, unsupported barrier, animation/
  Rust change, or canonical Battle-2 branch.

## 1197 — [supervisor, 2026-08-12] **CGB4 v11 verified; Rust M5d completed and folded**

- **State:** #55 now has exact complete-`ply_note` totals for the observed
  **7/82** zero-`lfoDelay` CGB4 callbacks, with a **4,435-cycle** aggregate
  contiguous boundary through final `bx r0`. Rust `CheckViability` is
  **122/122** table effects native; its WASM boundary remains the next Rust
  milestone.
- **Did:** independently audited v11's fixed **44-cycle** caller tail and
  verified both IWRAM POP classes against a temporary Scene-OFF instruction
  probe before removing the hooks. Folded Rust M5d-5 through merge `6253143b`:
  all remaining **28** effects plus 97 TS-generated vector rows; the native
  barrier is dry. Animation-main remains contained.
- **Next:** source-close one separately bounded post-`ply_note` dispatcher/
  MPlay continuation slice without widening the seven-row evidence to the
  other 75 callbacks. Keep service/arbitration and construction-clock wiring
  null. Fold Rust M5e if rust-main advances.
- **Notes:** union full **988 files / 9,570 passed / 1 skipped**, build **653
  modules**. Rust is **662/662**, fmt/clippy clean; rebuilt WASM is **138,436
  bytes** (`9d53f91e…`) and forced parity is **757/757**. No engine-changing
  fold, soak trigger, unsupported barrier, or canonical Battle-2 extension.
