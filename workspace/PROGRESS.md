# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1253 — [MAIN worker, 2026-08-14] **Noland rung 2: GetFrontierBrainStatus ported and wired into round-loop opponent scheduling**

- **State:** the round loop now actually SCHEDULES a Frontier Brain (Noland)
  battle at the right win streaks, logic-only. `src/engine/frontierBrainStatus.ts`
  is a new pure module (`getFactoryFrontierBrainStatus`) porting
  `GetFrontierBrainStatus` (`frontier_util.c:1657-1698`) for the Factory row
  `{21, 42, 21, 1}`. `factoryRoundBattleOrchestrator.ts`'s single shared
  `generateOpponentFor` helper (used by all three opponent-generation call
  sites: first-opponent, `AskSwapMon` pre-generation, and its swap-resolution
  fallback) now checks brain status at the effective win streak before every
  generation and branches to `generateFactoryBrainOpponent` (rung 1) instead
  of the ordinary trainer-selection path when eligible.
- **Did:** confirmed from source that `frontier_getbrainstatus`
  (`pre-battle-room scripts.inc:61,80-81`) gates BEFORE
  `factory_generateopponentmons` ever runs, so a brain battle draws none of
  the ordinary trainer/species-selection RNG — not a discarded-then-
  overwritten draw as initially hypothesized. New
  `FactoryScheduledOpponentGeneration` union (`kind: "ordinary" |
  "frontier-brain"`) carries uniform `trainerId`/`storedTrainerIds` so the AI
  driver and repeat-trainer history don't branch on kind.
  `BattleOpponent.frontierBrain` is the typed marker the presentation seam
  will consume later (no string-sniffing). New optional
  `config.factorySymbolsCount` (default 0) is backward compatible — every
  existing construction site compiles and behaves unchanged.
  `adoptedNextOpponent` only carries an ordinary schedule, so adopting it for
  a battleIndex that turns out brain-eligible now throws instead of silently
  misadopting. New Tier-1 tests: streak-0 inertness (config field
  present/absent byte-identical), silver + gold scheduled through the real
  `preGenerateFactoryRoundNextOpponent` seam with an RNG-cursor handoff from
  an actual preceding battle win (challengeNum 2/fixedIv 15 and challengeNum
  5/fixedIv 31, matching rung 1's pinned receipts), a symbolsCount-2 STREAK
  case, and the `adoptedNextOpponent` mismatch rejection. Existing
  `opponentGenerations`/`pendingNextOpponent` call sites in
  `factoryRoundBattleOrchestrator.test.ts`/`interactiveRouting.test.ts`
  updated to the new `.generation.*` nesting; all prior assertions
  unchanged. `npm run typecheck` and `test:smoke` green at each step; full
  `npm test` **1,049 files / 9,907 passed / 1 skipped**; `npm run build`
  green (666 modules).
- **Next:** the differential structure check consuming both ts-lane and
  side-lane (mGBA) receipts (1251's dispatch), then a later rung for the
  Brain presentation seam (name/sprite/commentary) consuming the
  `frontierBrain` marker landed here.
- **Notes:** deviated from the brief's literal `factoryWinStreak 14`/
  `battleIndex 6` and `factoryWinStreak 36`/`battleIndex 5` test staging —
  used `battleIndex 1` (`factoryWinStreak 19`/`40`) instead, needing one real
  battle win rather than 5-6, since `challengeNum`/`fixedIv` are streak-
  derived, not battleIndex-derived, so the receipts pin the same source
  values either way; driving 5-6 real wins against progressively harder AI
  within the step's time budget was an unacceptable reliability risk. Out of
  scope and untouched: presentation/rendering, mechanicLab/oracle staging,
  the differential receipt check, `src/animation/**`, `core-rs/**`. No
  `executableFrontierRatchet` pin moved.

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

