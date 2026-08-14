# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1251 — [supervisor, 2026-08-14] **Orient folds verified; Noland program round 1 dispatched**

- **State:** master holds both lane folds and the full union is green. The
  main lane's program is Noland per the 2026-08-13 user decisions: port
  `FillFactoryBrainParty` with pool/rules/odds receipts, then the
  battles-21/42 round-loop branch and the Brain staging representation.
- **Did:** folded `animation-main` (Memento source-checkpoint test
  strengthening, `f22e828e`) and `rust-main` (M14-class battler-position
  resolver port, `d46ec3ec`) into master. Union verification: cargo native
  green; wasm artifact rebuilt **507,847 B** `4e540a35…`; forced-WASM
  parity **18 files / 803 tests**; full npm **1,047 files / 9,864 passed /
  1 skipped**; build green. Both sibling supervisors (animation, rust) were
  live in their worktrees throughout; folds touched only master.
- **Next:** verify round-1 results — ts lane: pure
  `factoryBrainOpponentGeneration` port + Tier-1 receipts; side lane:
  twice-fresh mGBA `FillFactoryBrainParty` receipts with LR-attributed draw
  ledgers (silver challengeNum 2; gold 5 if cap permits). Then rung 2: the
  differential structure check consuming both.
- **Notes:** oracle 8014/8012 left untouched (coarse freshness failure is
  the recorded docs-only false positive; 39ca5d64 + these folds change no
  harness contract). Wind-down must re-check both lane branches for new
  sibling commits.

## 1250 — [solo session, 2026-08-13] **#55 check-in: grind PARKED, main lane redirected to the Noland program**

- **State:** the #55 opinion check-in promised on 2026-08-10 happened. User
  decision: distribution parity is the product bar; the cycle-pricing grind
  is parked at the clean CGB4 v44 checkpoint (6,258-cycle prefix; every
  receipt stands, nothing half-wired). Live generation is unblocked on the
  clean-stream contract, documented as not hardware-stream-exact.
- **Did:** two-agent audit of all 77 `issue55-*` docs, the grind timeline
  (44 versions / 47.6 h / ~26 cycles per round), the probe tooling, and the
  gated work; recorded the superseding user decision in `ROADMAP.md`
  (2026-08-13 block) and `ISSUES.md` #55 (new decision block + updated
  Lead). No `src/**`, test, or lane-file change; animation and rust worker
  rounds were live and untouched throughout.
- **Next:** the next MAIN supervisor session briefs the Noland program:
  port `FillFactoryBrainParty` (`battle_factory.c:759`) via the
  `GetFactoryMonId` rejection loop (no Unown, no species/item duplicates,
  excludes the player's current rentals), fixed IVs
  `GetFactoryMonFixedIV(challengeNum + 2)`, the battles-21/42 round-loop
  branch, and the Frontier-Brain staging representation. Verification bar:
  pool/rules/odds receipts plus differential structure checks — not stream
  exactness. The Rust charter note (M7c waits on the TS port, not #55)
  lands at the next rust supervisor session.
- **Notes:** docs-only change; no suites required per standing cadence.
  #55 stays open as a parked, resumable program; `serviceCostMasterCycles`
  stays null and the construction clock stays unwired.

## 1249 — [supervisor, 2026-08-13] **CGB4 v44 and final lane union verified**

- **State:** #55 is source-exact through the mixed selected-row **6,258-cycle**
  CGB4 prefix. The generic seven-battle controller remains the governing S8
  path, and both persistent lane heads are folded.
- **Did:** audited v44's two source-only fifth-track continuations at exact ROM
  `50 20 2d 18 ad dc` (**12×2 = 24**, **6,234 → 6,258**), with the 0x83
  row frozen before its body and both clear rows stopped before sixth-track
  flags. Folded the final Rust M13 gender resolver and rebuilt the native/WASM
  union; earlier final source folds remain exact bilateral Icy Wind plus the
  Memento source checkpoint.
- **Next:** continue #55 in one bounded source-only step at the two selected
  sixth-track `MPT_FLG_EXIST` flags load/decision rows. Keep the 0x83 row at
  its v42 stop, stop before all sixth-track bodies, and keep wider
  MPlay/service/arbitration, live clock wiring, production, presentation,
  animation, Rust, and the retired Battle-2 march out of scope.
- **Notes:** final full npm **1,047 files / 9,864 passed / 1 skipped**; build
  **664 modules**. Native Rust **761/761**; WASM **509,805 B**,
  `d415fea6...`; forced WASM **19 files / 807 tests**. Animation is **181/276
  exact**; Memento source **3/3**. Production soaks are vanilla **20/20** and
  full **60/60**, with **0 crashes / 0 hangs**. No unsupported barrier or
  DEFERRED entry.
