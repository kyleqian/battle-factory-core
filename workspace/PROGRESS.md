# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1200 — [MAIN worker, 2026-08-12] **CGB4 v14 lfoSpeed decision source-closed**

- **State:** #55 is source-exact for **5,254 aggregate cycles** through the
  immediate post-note `lfoSpeed` decision across the frozen **7/82** CGB4
  callbacks: v13 **5,212** plus v14 **42** cycles. Complete MPlay remains
  **5 exact / 108 null** and the construction clock is unwired.
- **Did:** twice-fresh address-free packets capture only `lfoSpeed` on the same
  sourceStateDigest join: all seven are **44**. Source/ELF/ROM close its IWRAM
  load, compare, and non-taken branch for **6 cycles each**; frozen v13 is
  byte-identical and the first later scalar remains unobserved.
- **Next:** stop before `MusicPlayerTrack.mod`; retain later track-loop work,
  other 75 note callbacks, complete MPlay, service/arbitration, and
  construction-clock wiring null.
- **Notes:** packet hashes `04188570…` / `a641b339…` / `e2b8cf01…`; evidence/
  doc `82138617…` / `189c21ac…`; red-first followed by focused v1-v14
  **57/57**, smoke **8 files / 375 passed**, and typecheck are green. One full
  suite and build remain before handoff.

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
