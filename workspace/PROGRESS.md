# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1248 — [MAIN worker, 2026-08-13] **CGB4 v44 fifth clear-route positive continuation checkpoint**

- **State:** #55 is source-exact through the mixed selected-row **6,258-cycle**
  CGB4 prefix. The frozen 0x83 nonzero-mask row remains at v42 before its
  body; the two clear rows stop immediately before the sixth-track flags load.
- **Did:** source-only v44 freezes v43/v42 and inherited artifacts byte-for-byte,
  joins only the two v43 clear rows by `sourceStateDigest`, and proves the exact
  `movs r0, MusicPlayerTrack_size; adds r5, r0; bgt _081DD9C8` body at
  `50 20 2d 18 ad dc`. Static MPlay/cry storage is IWRAM, so the taken `bgt`
  costs **12×2 = 24** cycles (**6,234 → 6,258**); no sixth-track scalar,
  flags decision/body, exit, or broader loop is claimed.
- **Next:** finish the required smoke/full/build verification from this clean
  checkpoint; keep all follow-on body, MPlay/service/arbitration, live clock,
  production, presentation, animation, Rust, and canonical Battle-2 work out
  of scope.
- **Notes:** evidence/doc `f5dc524a…` / `a1cd1558…`; isolated regeneration
  matches both byte-for-byte and focused v44 is **6/6**. No oracle capture,
  `src/**` change, ratchet/barrier, ROADMAP/DEFERRED/ISSUES, or animation change.

## 1247 — [MAIN worker, 2026-08-13] **CGB4 v43 fifth clear-route decrement/exit decision green**

- **State:** #55 is source-exact through the mixed selected-row **6,234-cycle**
  CGB4 prefix. The 0x83 nonzero-mask row remains frozen at v42 before its
  body; the two clear rows stop before both possible successor bodies.
- **Did:** source-only v43 freezes v42/v41 evidence, reports, packets, and
  inherited v37-v40 artifacts byte-for-byte, then joins only the two clear
  v42 rows by `sourceStateDigest`. Retained v39 evidence proves r2=7 before
  the fourth decrement; source/ELF/ROM prove r2 reaches the fifth clear
  decrement as 6, then `subs r2, 1; ble` leaves 5 and is not taken: **4×2 =
  8 cycles** (**6,226 → 6,234**). Exact bytes are `01 3a 02 dd`.
- **Next:** No follow-on started. Keep positive continuation/exit bodies,
  other loop work, MPlay/service/arbitration, live clock wiring, production,
  presentation, animation, Rust, and retired canonical Battle-2 work out of
  scope.
- **Notes:** evidence/doc `856457b1…` / `709625f7…`; focused v42/v43
  **12/12**, smoke **375/375**, full npm **1,046 files / 9,858 passed / 1
  skipped**, build **664 modules**. No oracle capture, `src/**` change,
  ratchet/barrier, ROADMAP/DEFERRED/ISSUES, or canonical-Battle-2 change.

## 1246 — [supervisor, 2026-08-13] **CGB4 v42 and final lane union verified**

- **State:** #55 is source-exact through the selected-row **6,226-cycle**
  CGB4 prefix. The generic seven-battle controller remains the governing S8
  path. Both persistent lane heads are folded.
- **Did:** audited v42's mixed fifth-track mask routes and both body stop
  boundaries. Folded exact bilateral Icy Wind, the Memento source checkpoint,
  Rust M10c, and the key-repeat WASM boundary. Rebuilt and forced the complete
  Rust parity surface.
- **Next:** continue #55 in a separate bounded step at only the two clear-route
  fifth-track decrement decisions. Keep the nonzero-mask row stopped before
  its body, and stop the clear rows before continuation/exit. Keep wider
  MPlay/service/arbitration, live clock wiring, production, presentation,
  animation, Rust, and the retired Battle-2 march out of scope.
- **Notes:** final full npm **1,045 files / 9,852 passed / 1 skipped**; build
  **664 modules**. Native Rust green; WASM **509,825 B**, `d7344e1c...`;
  forced WASM **19 files / 807 tests**. Animation is **181/276 exact**;
  Memento source **3/3**. Production soaks are vanilla **20/20** and full
  **60/60**, with **0 crashes / 0 hangs**. No new unsupported barrier or
  DEFERRED entry.
