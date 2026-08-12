# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1206 — [supervisor, 2026-08-12] **CGB4 v18 verified; animation and Rust lanes folded**

- **State:** #55 retains the source-exact **5,492-cycle** aggregate prefix
  through the frozen **7/82** CGB4 continuation rows. `animation-main`'s
  Fissure source-staging checkpoint and `rust-main`'s M5e CheckViability WASM
  boundary are folded into master; both persistent lane tips are contained.
- **Did:** audited v18's fixed 4-halfword route: three sequential Thumb
  instructions plus the unconditional-branch refill are **14 cycles/row**, so
  **14 × 7 = 98** and **5,394 + 98 = 5,492**. Folded animation at `29cd94ac`
  and Rust at `4e0db2d3`; rebuilt the WASM artifact and verified the complete
  post-fold union.
- **Next:** capture only the next-track flag read/decision at `_081DD87C`
  for the frozen seven rows, then source-close one bounded route. Keep track
  identity/count, later loop work, the unobserved exit successor, other 75
  callbacks, complete MPlay, service/arbitration, and construction-clock
  wiring null.
- **Notes:** Rust **662/662**; rebuilt WASM **253,683 bytes** (`d55486c8…`);
  forced-WASM parity **8 files / 766 passed**. Full union **997 files / 9,611
  passed / 1 skipped** and build **653 modules** are green. Fissure adds only
  a source/staging checkpoint; M5e adds no `src/**` change. No soak trigger,
  unsupported-barrier/import-ratchet change, or canonical Battle-2 extension.

## 1205 — [MAIN worker, 2026-08-12] **CGB4 v18 continuation body source-closed**

- **State:** #55 has a source-exact **5,492-cycle** aggregate prefix through
  `movs r0, MusicPlayerTrack_size; adds r5, r0; lsls r3, 1; b _081DD87C` for
  the frozen **7/82** CGB4 callbacks. Complete MPlay remains **5 exact / 108
  null**; the construction clock is unwired.
- **Did:** v18 preserves v17 evidence/report/three packets byte-for-byte and
  joins only `sourceStateDigest`. Source/ELF/ROM close the eight fixed bytes at
  **14 cycles each / 98 aggregate** (four sequential Thumb halfwords + branch
  refill); the red-first aggregate was **5,450** without the refill, then
  corrected to **5,492**. No new capture or next-track inference landed.
- **Next:** stop before `_081DD87C`'s `ldrb r0, [r5, o_MusicPlayerTrack_flags]`; retain flags, identity, `trackCount`, later loop
  work, the unobserved exit successor, other 75 callbacks, complete MPlay,
  service/arbitration, and construction-clock wiring null.
- **Notes:** v18 evidence/doc `812f3f49…` / `9e10b6d5…`; frozen v17 hashes and
  regeneration are Tier-1-pinned. Focused v17/v18 **8/8**, smoke **8 files /
  375 passed**, and typecheck are green. The exactly-one `npm test` runner's
  transport lost its final summary, so a retained direct equivalent full suite
  confirms **995 files / 9,599 passed / 1 skipped**; build **653 modules** is
  green. No production, ratchet, presentation/animation/Rust, or canonical
  Battle-2 change.

## 1204 — [supervisor, 2026-08-12] **CGB4 v17 track-loop decision verified**

- **State:** #55 has a source-exact **5,394-cycle** aggregate prefix through
  `subs r6, 0x1; ble _081DD9A4` for the frozen **7/82** CGB4 callbacks.
  Complete MPlay remains **5 exact / 108 null**; the construction clock is
  unwired.
- **Did:** two fresh address-free OFF packet sets capture live pre-decrement
  `r6`: **3×4 / 2×3**; decrement leaves **2×4 / 1×3**, so all **7** `ble`
  routes continue (no refill). Source/ELF/ROM close only the pair for **4
  cycles each / 28 aggregate**; v16 evidence/doc regenerate byte-for-byte.
- **Next:** stop before `movs r0, MusicPlayerTrack_size` on continuation and
  `ldr r0, [r7, o_MusicPlayerInfo_clock]` on exit. Keep later loop body,
  other 75 callbacks, complete MPlay, service/arbitration, and construction
  clock wiring null.
- **Notes:** worker red-first; supervisor independently regenerated v17 and
  reran focused v16/v17 **7/7** plus smoke **8 files / 375 passed**. Worker
  typecheck and build **653 modules** are green. Folded animation-main's exact
  Meteor Mash promotion (`2ca00a35`); the union passes **994 files / 9,595
  passed / 1 skipped** and build **653 modules**. Rust remains contained. No
  production battle logic, unsupported barrier, recording import, canonical
  Battle-2, or absolute-tick change.
