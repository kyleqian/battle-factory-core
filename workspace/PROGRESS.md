# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1208 — [MAIN worker, 2026-08-12] **CGB4 v20 clear-successor second decrement source-closed**

- **State:** #55 has a source-exact **5,626-cycle** aggregate prefix through
  `_081DD998: subs r6, 0x1; ble _081DD9A4` for only the three frozen
  EXIST-clear CGB4 rows. Complete MPlay remains **5 exact / 108 null** and
  the construction clock is unwired.
- **Did:** v20 preserves/regenerates frozen v19 evidence/report/packets
  byte-for-byte and joins only `sourceStateDigest`; it reads no oracle data.
  Frozen clear fields prove `r6 2→1`; exact v18/v19 routes do not write r6,
  so the source-closed second decrement yields zero and takes the branch:
  **10 × 3 = 30** cycles. The four EXIST-set rows retain null v20 cost before
  `_081DD886`; every clear row stops before `_081DD9A4`'s first instruction.
- **Next:** retain the exit body/clock, identity/index/count, later loop work,
  v17's unobserved exit, other callbacks, complete MPlay, service/arbitration,
  and clock wiring as null; any next #55 slice must be separately source- or
  capture-proven.
- **Notes:** v20 evidence/doc `ba5fa1b0…` / `741d8ab6…`; explicit v17/v18/v19
  branch-halfword cross-check is pinned. Red-first under-price **8** failed;
  focused v19/v20 **10/10**, smoke **375/375**, typecheck, one final
  `npm test`, and the production build are green. No production, ratchet,
  presentation/animation/Rust, or canonical Battle-2 change.

## 1207 — [supervisor, 2026-08-12] **CGB4 v19 next-track EXIST decision verified**

- **State:** #55 has a source-exact **5,596-cycle** aggregate prefix through
  the next-track `MPT_FLG_EXIST` branch decision for the frozen **7/82** CGB4
  callbacks. Complete MPlay remains **5 exact / 108 null**; the construction
  clock is unwired.
- **Did:** two fresh address-free OFF packet sets are byte-identical and join
  only by frozen `sourceStateDigest`: flags **0x80 ×4 / 0x00 ×3**, selecting
  `_081DD886 ×4 / _081DD998 ×3`. The worker initially omitted the executed
  branch halfword from each route; supervisor corrected the timing to **14 ×4
  + 16 ×3 = 104** cycles, consistent with v18, and regenerated the evidence.
- **Next:** source-close one bounded selected-successor slice, separating the
  four EXIST-set rows from the three clear rows. Keep track identity/count,
  channel state, later loop work, the unobserved v17 exit successor, other 75
  callbacks, complete MPlay, service/arbitration, and clock wiring null.
- **Notes:** packet hashes anchor `18620078…`, LILIANA `1d31dfc0…`, varied
  `7c9978e5…`; focused v18/v19 **9/9**, smoke **375/375**, and typecheck are
  green. Folded Confuse Ray source staging and Rust M5f TryToFaint native
  vectors after v19. Final union: Rust **670/670**, rebuilt WASM **253,573
  bytes** (`74b778ce…`), forced parity **766/766**, npm **999 files / 9,620
  passed / 1 skipped**, build **653 modules**. Both folds avoid `src/**`; no
  soak trigger, ratchet, presentation, or canonical Battle-2 change.

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
