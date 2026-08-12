# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
  375 passed**, and typecheck are green. The exactly-one `npm test` runner
  exited after its full run, but its tool transport lost the final reporter
  summary; build runner likewise completed after transport detachment, so no
  unobserved green-summary claim is made. No production, ratchet,
  presentation/animation/Rust, or canonical Battle-2 change.

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

## 1203 — [MAIN worker, 2026-08-12] **CGB4 v16 fixed exit moves source-closed**

- **State:** #55 has a source-exact **5,366-cycle** aggregate prefix through
  the two fixed `_081DD994` register moves for the frozen **7/82** CGB4
  callbacks. Complete MPlay remains **5 exact / 108 null**; the construction
  clock is unwired.
- **Did:** preserved v15 byte-for-byte and joined only its seven
  `sourceStateDigest` rows. Source/ELF/ROM close `mov r3, sl; mov r4, fp` for
  **4 cycles each / 28 aggregate**, with no oracle capture or state inference.
- **Next:** stop before `subs r6, 0x1`; retain `r6`/track count, loop
  continuation/exit, other 75 callbacks, complete MPlay, service/arbitration,
  and construction-clock wiring null.
- **Notes:** evidence/doc `f9d539ac…` / `3fbb25e2…`; red-first then focused
  v15-v16 **7/7**, smoke **8 files / 375 passed**, typecheck, exactly one full
  suite **993 files / 9,591 passed / 1 skipped**, and build **653 modules** are
  green. No production, unsupported barrier, animation/Rust, canonical
  Battle-2, or absolute-tick change.
