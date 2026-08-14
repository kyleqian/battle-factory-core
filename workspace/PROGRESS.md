# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1252 — [MAIN worker, 2026-08-14] **Noland rung 1: FillFactoryBrainParty ported as generateFactoryBrainOpponent**

- **State:** `src/engine/factoryBrainOpponentGeneration.ts` is a new pure
  module exporting `generateFactoryBrainOpponent`, covering the Level-50
  singles Frontier Brain (Noland) opponent party — the pure-generation half
  of the Noland program's round-1 ts-lane task.
- **Did:** ported `FillFactoryBrainParty` (`battle_factory.c:759-826`)
  exactly: no trainer-selection phase (unlike the ordinary opponent), and
  selection/personality-construction interleave per mon in source order
  rather than batching into two epochs. Five rejection rules in source
  order — unown, high-tier (source-real, proven unreachable), saved-rental
  **set-id** equality (not species), duplicate species, duplicate item —
  reusing `getLevel50FactoryRentalRange`, `randomU16`,
  `natureFromPersonality`, and `createFactoryCorpusPartyMember` from
  `factoryOpponentGeneration.ts`/`factoryCorpusParty.ts` rather than
  duplicating them. New `tests/factoryBrainOpponentGeneration.test.ts` (10
  tests) pins each rejection rule individually via forced RNG seeds, the
  rejection-order priority for two multi-rule collisions, fixed-IV receipts
  (15 @ challengeNum 2, 31 @ challengeNum 5, retail challenge-6 OOB
  rejection), draw-range receipts matching the ordinary opponent's range
  helper, determinism, and one full three-mon walk with a hand-derived
  10-entry ledger checked entry by entry. `npm run typecheck` and
  `test:smoke` green before the full run; full npm **1,048 files / 9,874
  passed / 1 skipped**; build **664 modules**, green.
- **Next:** rung 2 — the battles-21/42 round-loop branch that calls into
  this module, plus the differential structure check consuming both ts-lane
  and side-lane (mGBA) receipts per 1251's dispatch.
- **Notes:** out of scope and untouched: roundController/battle scheduling,
  mechanicLab/oracle staging, presentation, `src/animation/**`,
  `core-rs/**`. No `executableFrontierRatchet` pin moved (both barrier
  counts and the recording-import allowlist are unchanged). No oracle
  service touched.

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
