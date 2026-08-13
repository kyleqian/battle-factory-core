# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1238 — [supervisor, 2026-08-13] **CGB4 v37 plus late lane folds verified**

- **State:** #55 is source-exact through the selected-row **6,088-cycle**
  CGB4 prefix, stopping before fourth-track mask/body. Rust is folded through
  M9b's pure Factory swap mutation/state/cursor leaves; animation remains
  **180/276 exact** after source-only Blizzard and Icy Wind checkpoints.
- **Did:** independently regenerated v37 byte-for-byte and audited its exact-key
  containment; folded `rust-main` through M8i/M8j and M9a–M9b (`43a09122`),
  ran native Rust **733**, rebuilt WASM, and forced all **16 parity files / 797
  tests** through it. Folded Blizzard (`089518e2`) and Icy Wind (`8cc21769`),
  then reran their focused **9/9**, source audit, coverage, smoke, build, and
  both production soaks. Final union full npm is green: **1,035 files / 9,804
  passed / 1 skipped**.
- **Next:** continue #55 separately at the fourth-track mask/body; keep wider
  MPlay/construction-clock wiring separate. The generic seven-battle round
  controller/presentation seam remains the governing S8 path; do not resume the
  retired canonical Battle-2 turn march.
- **Notes:** v37 evidence/doc `59c5f83c…` / `5cf3314a…`; final WASM
  **474,121 B**, `a2720645…`; build **661 modules**, smoke **375/375**. Earlier
  contended union attempts ended with exit 143, but the final post-M9b union
  completed cleanly. Production soaks remain vanilla **20/20** and full
  **60/60**, with **0 crashes / 0 hangs**. Both persistent lane heads are
  folded and have no commits ahead of master.

## 1237 — [MAIN worker, 2026-08-13] **CGB4 v37 fourth-track EXIST decision green**

- **State:** #55 is source-exact through the same three selected-row **6,088-cycle**
  CGB4 prefix, stopping before `_081DD9D0`'s mask/body.
- **Did:** captured two fresh serial Battle Scene OFF packet sets with a
  pointer-bounded fourth iteration. Exact-key packets retain only
  `sourceStateDigest` + `fourthTrackFlags`; all three observed values are
  **0x80**, so EXIST is set and `beq` is not taken: **8 cycles/row, +24**
  (**6,064 → 6,088**). Source/ELF/exact ROM price the absent clear route at
  **14** cycles with its taken refill; v37 regenerates twice byte-stably and
  freezes v36 exactly.
- **Next:** run smoke, full npm, and build; keep mask/body, later loop, exit
  successor, broader MPlay/service/arbitration, construction-clock wiring,
  presentation, animation, Rust, and retired canonical Battle-2 work null.
- **Notes:** focused v36/v37 **11/11**; v37 evidence/doc
  `59c5f83c…` / `5cf3314a…`; fresh packet hashes anchor `4dad511a…`, LILIANA
  `8afcc0ba…`, legal-varied `6f202501…` (repeat identical). No `src/**`,
  shared interfaces, ROADMAP/ISSUES/DEFERRED, ratchet, barrier, or canonical
  Battle-2 change.

## 1236 — [MAIN worker, 2026-08-13] **CGB4 v36 third-track non-exit continuation green**

- **State:** #55 is source-exact through the same three selected-row **6,064-cycle**
  CGB4 prefix, stopping before `_081DD9C8`'s fourth-track flags load.
- **Did:** source-only v36 freezes v35 evidence/report/packets byte-for-byte,
  strips its `r2` scalar to digest-only joins, and independently pins `50 20 2d
  18 ad dc`, IWRAM signed-positive 80-byte stride proof, taken-`bgt` refill,
  and **12×3 = 36** cycles (**6,028 → 6,064**). Red-first exact-key pins
  reject predecessor scalar, pointer/address/count/index/identity/channel/frame/
  duration/condition, next flags, and body; v36 regenerates twice byte-stably.
- **Next:** separately scope only the fourth-track flags load/decision if needed;
  keep its body, exit successor, broader MPlay/service/arbitration,
  construction-clock wiring, presentation, animation, Rust, and retired
  canonical Battle-2 work null.
- **Notes:** v36 evidence/doc `58dc2bc3…` / `847569d4…`; frozen v35 hashes
  `f2072d5c…` / `2fb614a5…` plus packets `e3b48fc0…` / `47366316…` /
  `69ceae98…`. Focused v36/v35 **14/14**, smoke **375/375**, full npm
  **1,030 files / 9,780 passed / 1 skipped**, build **660 modules**. No fresh
  oracle capture, `src/**`, ratchet, unsupported-barrier, or canonical Battle-2 change.
