# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1256 — [solo session, 2026-08-14] **factoryBrain lab mode LIVE on :8014; CGB4 test tail measured at 430 s**

- **State:** the 1255 USER handoff (a) is done: the oracle harness accepts
  `mode: "factoryBrain"` (design §5.1 items 1-7 complete, commit
  `33354440`), so Brain presentation ground truth is now reachable through
  the lab. The refreshed battle-scene-off service on **:8014** advertises
  the mode; **:8012 still runs pre-change code** by design (the animation
  lane restarts it at its own orient, per its standard freshness flow).
- **Did:** harness-side `factoryBrain` — structural identity (always
  `TRAINER_FRONTIER_BRAIN`/final battle; no `trainerId`/`battleNum`/
  `opponentSetIds` fields), `challengeNum` restricted to `{2, 5}`,
  `overrides.parties` permitted / `overrides.battlers` rejected,
  `fixedIv` (15/31) + `opponentParty` (RAM read-back) echoed, Brain intro
  ack budget 32 (live-measured need 16 vs the ordinary 12). Contract tests
  **54/54**; new `oracle/battle-lab-brain-smoke-test.py` **32/32** live
  (silver + gold end-to-end: three ROM-generated mons at the Brain fixed
  IVs, no duplicate species/items, captured RAM party equal to the echo,
  all standing rejections intact); existing ordinary-mode smoke green on
  the new code. MEASURED, quiet host: the **44-file recursive CGB4
  evidence family alone runs 430 s wall / 5,643 s CPU** — it dominates the
  ~6-minute full suite (the older isolate:false fix stands; this family
  landed on top of it and grew quadratically with grind versions).
- **Next:** main lane: (a) workspace §5.2 consumers — update
  `tools/battle-lab/README.md`, teach `tools/compare/appTrace.ts` the
  `factoryBrain` trace shape, check in silver/gold lab fixtures, then
  drive Brain presentation ground truth through the new mode; (b) test-time
  papercut: with #55 parked, gate the 44 `factoryM4aNoteBodyCgb4V*` files
  behind an opt-in env flag keeping a light terminal digest pin in the
  default suite — expected to return ~7 minutes per full run; (c) rust
  supervisor: record that M7c waits on the TS live-generation port, not
  #55.
- **Notes:** oracle freshness gates now see a REAL `oracle/` change —
  restart-before-staging is genuinely required (only :8012 remains on the
  old code). No `workspace/src/**`, test, or lane-file change; the two
  worker lanes were idle throughout.

## 1255 — [supervisor, 2026-08-14] **Wind-down: Noland program items 1-3 landed and verified; all gates green**

- **State:** the 2026-08-13 decision-3 program is complete through the
  workspace layer. Noland's party generation, the battles-21/42 scheduling
  branch, ROM ground truth with a zero-discrepancy differential, the
  staging-representation design, and the post-battle remainder audit are
  all on master. DEFERRED.md remains empty; the one cross-layer item is a
  recorded USER handoff, not an open supervisor question.
- **Did:** 7 worker rounds, all green, zero failed steps. Orient fold
  (animation Memento test strengthening + rust battler positions) and
  wind-down fold (animation Memento **exact** promotion chain + rust
  negative-damage/always-hit/destiny-bond/minimize state-leaf ports), each
  verified on the union. Noland: `factoryBrainOpponentGeneration.ts` (10
  receipts), silver+gold mGBA receipts with every draw LR-attributed
  (`docs/noland-brain-ground-truth.md`),
  `tests/factoryBrainOpponentRomReceipts.test.ts` (zero discrepancies;
  fill spans ~28 frames so ambient VBlank draws interleave — captured-
  cursor exactness confirmed as the only honest bar),
  `frontierBrainStatus.ts` + orchestrator branch + real-round-shape pins,
  `docs/noland-brain-staging-design.md` (overrides.parties alone proven
  deficient: brain AI mask 7 vs ordinary 1 at challenge 2), and
  `docs/noland-brain-post-battle-audit.md` (brain BP = table + flat +10:
  14/15 BP; symbols are event flags; loss ordinary; two-site claim
  re-confirmed). Two PAPERCUTS entries + ROADMAP status note.
- **Next:** (a) **USER:** implement the `factoryBrain` mechanic-lab mode
  harness-side per design §5 (harness changes go through the user);
  (b) next main session: pick from the audit's §5 worklist — noting
  reward/symbol bookkeeping keeps its existing out-of-scope status per the
  2026-08-10 decision; (c) brain-battle presentation waits on (a) for its
  oracle ground truth.
- **Notes:** a final 06:10 re-check folded both lane tails (animation:
  Rock Tomb **exact** promotion + Flail evidence; rust: yawn + taunt
  decision leaves and its clean wind-down) and the whole union was
  re-verified: full npm **1,056 files / 9,934 passed / 1 skipped**; build
  green; cargo native green (42 green suites); WASM **509,791 B**
  `7e23d1bf…`; forced-WASM **18 files / 803 tests**. Soaks re-run on the
  final union: vanilla **20/20 OK**, full **60/60 OK**, 0 crashes /
  0 hangs. Both persistent lane branches are fully folded at session end
  (the animation supervisor may still be live; any post-06:45 tail is the
  next orient's fold).

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
