# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1245 — [MAIN worker, 2026-08-13] **CGB4 v42 fifth-track volume/pitch decision green**

- **State:** #55 is source-exact through the selected-row **6,226-cycle**
  CGB4 prefix. One frozen fifth-track mask is nonzero and two are clear; both
  routes stop before their respective bodies.
- **Did:** source-only v42 freezes v41 evidence/report/packets and inherited
  evidence byte-for-byte, then joins only by sourceStateDigest. Frozen flags
  0x83/0x80/0x80 against mask 0x0f price the nonzero/no-refill route at 6 and
  the two clear/taken-refill routes at 12 each: **30 aggregate cycles**
  (**6,196 → 6,226**). Exact source/ELF/ROM bytes are 0f 21 01 42 45 d0.
- **Next:** Assigned v42 is complete; do not start a follow-on. Keep the
  mask-nonzero body, clear-route decrement/exit body, later loop,
  MPlay/service/arbitration, construction-clock wiring, production,
  presentation, animation, Rust, and retired Battle-2 work out of scope.
- **Notes:** evidence/doc b18d54cc… / 07e866c8…; focused v41/v42 **12/12**,
  smoke **375/375**, full npm **1,043 files / 9,845 passed / 1 skipped**,
  build **664 modules**. No oracle capture, src change, ratchet/barrier,
  ROADMAP/DEFERRED/ISSUES, or canonical-Battle-2 change; #55 remains open.

## 1244 — [supervisor, 2026-08-13] **CGB4 v41 and Rust draft boundary union verified**

- **State:** #55 is source-exact through the selected-row **6,196-cycle**
  CGB4 prefix. The generic seven-battle controller remains the governing S8
  path. `rust-main` is folded through the complete draft-selection WASM
  boundary.
- **Did:** independently audited v41 containment and accepted the fifth-track
  EXIST-set route for flags `0x83/0x80/0x80` (**8x3 = 24** cycles,
  **6,172 -> 6,196**). Folded Rust M10c (`d608104f`), ran native Rust,
  rebuilt WASM, and forced every parity suite through the artifact.
- **Next:** continue #55 in a separate bounded step at only the fifth-track
  volume/pitch-mask decision. Stop before either body. Keep wider
  MPlay/service/arbitration, live construction-clock wiring, production,
  presentation, animation, Rust, and the retired Battle-2 march out of scope.
- **Notes:** native Rust green; WASM **507,934 B**, `f1882396...`; forced WASM
  **18 files / 804 tests**. Final union full npm **1,042 files / 9,839 passed /
  1 skipped**; build **664 modules**. No new unsupported barrier or DEFERRED
  entry.

## 1243 — [MAIN worker, 2026-08-13] **CGB4 v41 fifth-track EXIST decision green**

- **State:** #55 is source-exact through the selected-row **6,196-cycle**
  CGB4 prefix, stopping before `_081DD9D0`'s fifth-track volume/pitch mask.
- **Did:** v41 freezes v40 evidence/report plus inherited v39/v37 OFF packets
  byte-for-byte. Two fresh serial OFF packet sets retain only
  `sourceStateDigest` + `fifthTrackFlags` (`0x83/0x80/0x80`); pointer-bounded
  live selectors are not retained. Exact source/ELF/ROM `28 78 80 21 01 42 48
  d0` prices the set/non-taken EXIST decision **8×3 = 24** cycles
  (**6,172 → 6,196**).
- **Next:** a separate bounded step may scope only the fifth-track volume/pitch
  mask decision. Do not enter its body, decrement/continuation, absent
  successor/exit bodies, wider MPlay/service/arbitration, live clock wiring,
  production, presentation, animation, Rust, ROADMAP/DEFERRED, or Battle 2.
- **Notes:** evidence/doc `3d2c05c3…` / `b3c1057f…`; focused v40/v41
  **12/12**, smoke **375/375**, full npm **1,041 files / 9,835 passed / 1
  skipped**, build **664 modules**. No `src/**`, ratchet/barrier, ISSUES, or
  oracle-pixel change; #55 remains open.
