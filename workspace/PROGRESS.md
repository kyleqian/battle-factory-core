# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1254 — [MAIN worker, 2026-08-14] **Noland rung 2c: Frontier Brain scheduling pinned against real six-real-win round shapes**

- **State:** rung 2's noted deviation is closed. New
  `tests/factoryBrainRoundShape.test.ts` (3 tests) drives the real
  `factoryRoundBattleOrchestrator`/round-controller win path through six
  actual generated-battle wins (battleIndex 0..5) at a nonzero starting
  streak, then proves battleIndex 6 schedules the Frontier Brain — not a
  synthetic mid-round streak requiring only one real win, as rung 2 shipped.
- **Did:** silver case: `factoryWinStreak: 14` (challenge index 2),
  `factorySymbolsCount: 0`, seed 4 — asserts every battleIndex 0..5
  generation is `"ordinary"` and `getFactoryFrontierBrainStatus` independently
  reports `"not-ready"` at effective streaks 14..19; battleIndex 6 is
  `"frontier-brain"`, status `"silver"`, `challengeNum` 2, `fixedIv` 15,
  `trainerId` `TRAINER_FRONTIER_BRAIN`; `storedTrainerIds` equals battle 5's
  own (the brain never enters the no-repeat-trainer window); the
  pre-generation RNG segment's `rngBefore` equals the cursor `state.round.
  rules.rngValue` held right after battle 5 resolved (continuity, not a
  constant); the three brain-party members' `setId`s exclude the player's
  three current rental `setId`s and share one `fixedIv`; publishing through
  the swap-decline path lands `currentOpponent.frontierBrain` = `{status:
  "silver"}`. Gold case mirrors this at `factoryWinStreak: 35` (challenge
  index 5), `factorySymbolsCount: 1`, seed 2 → `challengeNum` 5, `fixedIv`
  31. Negative case: the identical silver round (seed 4, streak 14) with
  `factorySymbolsCount: 1` instead schedules an `"ordinary"` battleIndex-6
  opponent — symbol gating is real at the round level, not just in
  `getFactoryFrontierBrainStatus` isolation. All three seeds were found by a
  throwaway `node --experimental-strip-types` seed search against the real
  orchestrator (not committed) — the existing "move slot 0" policy from
  `factoryRoundBattleOrchestrator.test.ts`'s `driveGeneratedRoundToCompletion`
  wins six straight ordinary Factory battles reliably at nonzero streaks too
  (roughly half of seeds 0-40 tried), so the six-real-win shape was NOT
  structurally blocked — the rung-2 deviation was a time-budget call, not a
  hard limit. New file rather than extending `factoryRoundBattleOrchestrator.
  test.ts` (already 2,711 lines with its own streak-0-only carrier): fits the
  existing `factoryBrain*`-named pin family instead
  (`factoryBrainOpponentGeneration.test.ts`, `factoryBrainOpponentRomReceipts.
  test.ts`, `frontierBrainStatus.test.ts`). `npm run typecheck` and
  `test:smoke` green; full `npm test` **1,051 files / 9,920 passed / 1
  skipped** (up from the 1,050/9,917 baseline by exactly this file); `npm run
  build` green (666 modules). The full-suite run took ~24 min this session
  (vs. the usual ~5-7 min) purely from three concurrent worktree lanes
  competing for CPU/IO on one machine — not a regression; every file passed.
- **Next:** the differential structure check consuming both ts-lane and
  side-lane (mGBA) receipts (1251's original dispatch, still open), then the
  Brain presentation seam (name/sprite/commentary) — a design doc for this
  landed at `docs/noland-brain-staging-design.md` via a side-lane merge
  during this session, unread by this worker.
- **Notes:** out of scope and untouched: `src/**`, presentation,
  mechanicLab/staging, oracle captures, receipts/probe files, ISSUES/ROADMAP,
  animation/rust lanes, #55. No `executableFrontierRatchet` pin moved (both
  barrier counts and the recording-import allowlist are unchanged).
  PAPERCUT: the full `npm test` run took ~24 min instead of the documented
  ~5-7 min under concurrent animation+rust worktree load on this machine;
  worth flagging to the supervisor if this becomes a recurring pattern for
  main-lane finish-line verification.

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


