# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1231 — [MAIN worker, 2026-08-13] **CGB4 v33 third-track EXIST decision green**

- **State:** #55 is source-exact through the same three selected-row **5,980-cycle**
  CGB4 prefix, stopping before `_081DD9D0: movs r1, MPT_FLG_VOLCHG | MPT_FLG_PITCHG`
  (the volume/pitch-mask body).
- **Did:** froze v32 evidence/report and inherited v31 packets byte-for-byte;
  captured two fresh serial Battle Scene OFF packet sets with exact observation
  keys `sourceStateDigest` + `thirdTrackFlags`. All three rows are `0x80`, so
  `MPT_FLG_EXIST` is set and `beq _081DDA62` is not taken: source/ELF/exact-ROM
  close `28 78 80 21 01 42 48 d0` (region `3a41edf4…`), **8 cycles/row, 0 refill, +24 aggregate**
  (**5,956 → 5,980**). Red-first exact-key pins reject all pointer/address/
  count/index/identity/channel/frame/duration/body/condition fields; v33
  regeneration is byte-stable twice.
- **Next:** separately scope only the volume/pitch-mask body if needed; keep its
  body/successors, broader MPlay/service/arbitration, construction clock,
  presentation, animation/Rust, and canonical Battle-2 march out of scope.
- **Notes:** v33 evidence/doc `806b5582…` / `61fe1034…`; fresh packet hashes
  anchor `5b200f46…`, LILIANA `edb093d8…`, legal-varied `a6e227b5…` (repeat
  identical). Focused v33/v32 **9/9**, smoke **375/375**, final npm **1,025
  files / 9,750 passed / 1 skipped**, build **660 modules**. No `src/**`,
  ratchet, unsupported-barrier, or canonical Battle-2 change.

## 1230 — [MAIN worker, 2026-08-13] **CGB4 v32 second-track continuation green**

- **State:** #55 is source-exact through the same three selected-row
  **5,956-cycle** CGB4 prefix, stopping immediately before
  `_081DD9C8: ldrb r0, [r5, o_MusicPlayerTrack_flags]`.
- **Did:** froze all v31 evidence/report/packets byte-for-byte, retained only
  their three `sourceStateDigest` associations, and added no fresh oracle
  scalar. Source/ELF/exact-ROM close `50 20 2d 18 ad dc` for `movs; adds;
  taken bgt`: **12×3 = 36** cycles from **5,920 → 5,956**. Red-first Tier-1
  pins cover empty-input containment, the IWRAM signed-positive proof,
  branch refill, frozen artifacts, and two byte-stable regenerations.
- **Next:** separately scope only `_081DD9C8` if needed; keep actual
  pointer/count/index/identity/channel, next-track flags/body, either exit
  successor, broader MPlay/service/arbitration, and construction-clock wiring
  null.
- **Notes:** v32 evidence/doc `6301f67a…` / `e818d931…`; frozen v31 evidence/
  doc `ee0a10bb…` / `57abe28a…` and packets anchor `6a4af5ec…`, LILIANA
  `4b13624c…`, legal-varied `ad82e79e…`. Focused v32 **4/4**, v31 **8/8**,
  smoke **375/375**, final npm **1,024 files / 9,745 passed / 1 skipped**,
  build **660 modules**. No `src/**`, presentation, animation/Rust, ratchet,
  unsupported-barrier, or canonical Battle-2 change.

## 1229 — [supervisor, 2026-08-13] **CGB4 v31 and lane union green**

- **State:** #55 is source-exact through the three selected-row **5,920-cycle**
  CGB4 prefix. Cosmic Power's bounded presentation checkpoint and Rust M8d/M8e
  live-view constructor boundary are folded; both persistent lane tips are
  contained.
- **Did:** independently reran v31 **8/8**, then folded animation through
  `25bca32b` and Rust through `b2423e2a`. Audited the Rust ABI, ran native
  Rust, rebuilt the WASM artifact, forced every parity suite through WASM, and
  verified the full TypeScript union.
- **Next:** source-close only the observed second-track non-exit continuation
  `movs r0, MusicPlayerTrack_size; adds r5,r0; bgt _081DD9C8` for the same
  three frozen v31 rows. Stop before `_081DD9C8`; retain actual pointer/count/
  index/identity/channel, next-track flags/body, service/arbitration, and
  construction-clock wiring null.
- **Notes:** Rust **716/716 tests**; WASM **412,104 bytes** (`d5abf0a5…`),
  forced parity **14 files / 790 passed**; union npm **1,023 files / 9,741
  passed / 1 skipped**, build **660 modules**. No main ratchet,
  unsupported-barrier, or canonical Battle-2 change.
