# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
