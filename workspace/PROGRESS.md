# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1221 — [MAIN worker, 2026-08-12] **CGB4 v26 first-track volume/pitch-mask discriminator**

- **State:** #55 is source-exact through the selected three-row **5,800-cycle**
  CGB4 prefix, stopping before `_081DDA62`'s first instruction. Construction
  clock wiring remains null.
- **Did:** froze v25 evidence/report and all three packet hashes byte-for-byte;
  source-only v26 joins only the same three `sourceStateDigest` rows. Frozen
  `firstTrackFlags=0x80` and source `MPT_FLG_VOLCHG|MPT_FLG_PITCHG=0x0f`
  prove the taken `beq` at **12×3 = 36** cycles; the mask-nonzero route is
  source-priced fail-closed at 6. No oracle capture or `src/**` work landed.
- **Next:** separately scope any work beginning at `_081DDA62`; retain actual
  track identity/count/pointer/channel, later body, broader MPlay/controller/
  presentation fields, service/arbitration, and construction clock as null.
- **Notes:** focused v25/v26 **13/13**, smoke **375/375**, typecheck, npm
  **1,012 files / 9,688 passed / 1 skipped**, and build **657 modules** are
  green. Evidence/doc `a4cff030…` / `2eb2f9e4…`; no ratchet or
  unsupported-barrier change.

## 1220 — [supervisor, 2026-08-12] **v25 and latest persistent-lane union green**

- **State:** #55 is exact through the selected three-row **5,764-cycle**
  CGB4 prefix. Animation's completed Fissure compositor/Hydro Pump receipt
  and Rust M6's switch-policy WASM boundary are folded; both persistent lane
  tips are contained.
- **Did:** independently recovered and audited the timed-out v25 worker's
  finished evidence, committed `7570a564`, then folded animation through
  `ef4118ea` and Rust through `a6ade760`. The first post-Rust full suite
  correctly exposed a stale WASM artifact missing the new switch exports; I
  rebuilt it before forcing all boundary parity suites and rerunning the full
  union.
- **Next:** source-close only `_081DD9D0`'s volume/pitch-mask discriminator
  for the same three frozen rows, using v25's exact `firstTrackFlags=0x80`.
  Stop before `_081DDA62`'s first instruction; retain identity/count/pointer,
  channel/later body, and construction-clock wiring null.
- **Notes:** Rust **693/693 harness tests**; rebuilt WASM **324,348 bytes**
  (`3f8094c9…`), forced parity **10 files / 775 passed**; final union npm
  **1,011 files / 9,682 passed / 1 skipped** and build **657 modules**. No
  main ratchet, unsupported-barrier, or canonical Battle-2 change.

## 1219 — [MAIN worker, 2026-08-12] **CGB4 v25 first-track EXIST discriminator**

- **State:** #55 is source-exact through the selected three-row **5,764-cycle**
  prefix, stopping before `_081DD9D0`'s volume/pitch flags mask. Construction
  clock wiring remains null.
- **Did:** froze v24 evidence/report byte-for-byte; two fresh serial OFF packet
  sets join only its three digests and retain exactly `firstTrackFlags=0x80`.
  Source/ELF/ROM close `_081DD9C8` through the first EXIST decision at
  **8×3 = 24** cycles, while the unobserved flags-clear branch is fail-closed
  at 14. The v23 in-memory association protects the later hook; no `src/**`
  or barrier/presentation/canonical-Battle-2 work changed.
- **Next:** separately scope a later volume/pitch decision only if its smallest
  scalar/evidence contract is clear; retain identity/count/pointer/channel,
  four prior EXIST-set rows, later work, and construction clock null.
- **Notes:** focused v24/v25 **12/12**, smoke **375/375**, typecheck, npm
  **1,010 files / 9,677 passed / 1 skipped**, and build **657 modules** are
  green. Evidence/doc `26a2f0c9…` / `4bd41b23…`; no ratchet or
  unsupported-barrier change.

## 1218 — [supervisor, 2026-08-12] **v24, Fissure staging, and Rust M6b union green**

- **State:** #55 remains exact through the **5,740-cycle** selected CGB4
  prefix. Fissure's source-derived staged Scene-ON presentation and Rust's
  complete native Factory-AI switch policy are folded; both persistent lane
  tips are contained.
- **Did:** folded animation through `27d1f5c7` and Rust through `41302ee3`.
  Audited M6b's corrected canonical battle-type constants/corpus ratchets,
  folded its final lane ledger, then reran native Rust, rebuilt the main-tree
  WASM artifact, forced every boundary parity suite, and verified the full
  merged TypeScript union after the final fold.
- **Next:** capture only the first-track flags discriminator needed to price
  `_081DD9C8` through its first `MPT_FLG_EXIST` decision for the same three
  frozen v24 rows. Stop before the volume/pitch flags test; retain identity,
  count, pointer, later loop work, and construction-clock wiring null.
- **Notes:** Rust **690/690 harness tests**; WASM **287,620 bytes**
  (`b6acb929…`), forced parity **9 files / 772 passed**; union npm **1,009
  files / 9,670 passed / 1 skipped** and build **657 modules**. No main
  ratchet, unsupported-barrier, or canonical Battle-2 change; no soak trigger.
