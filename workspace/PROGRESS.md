# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1273 — [supervisor, 2026-08-14 eve] **Wind-down: entire 1267 queue closed + continuous play LIVE (battle 21 reachable by natural play); #88 root-caused same-session; all gates green, full-soak baseline re-based post-chaining**

- **State:** 8 worker steps across 2 lanes, zero unresolved failures.
  Queue (i)/(ii)/(iii) all COMPLETE (ROADMAP annotations updated);
  continuous-play wiring live. DEFERRED.md remains EMPTY. Two user
  decisions are ready and waiting (not blockers): walk-up dialogue
  FAITHFUL/TRIM/SKIP (`docs/noland-walkup-dialogue-scoping.md`,
  recommendation TRIM) and #87's fix shape (three options in ISSUES).
- **Did (headlines):** (1) Queue (i): `applyFactoryBrainRoundOutcome`
  (ROM-table cross-checked: silver 14/gold 15/+10 bonus/symbol grant) +
  orchestrator `roundOutcome` outputs + brain congrats text; live
  verification: BP **0→14** + silver symbol flag RAM-pinned
  (`docs/brain-terminal-live-verification.md`), both congrats
  scroll-gate ages live-bisected (98, release+32; supervisor applied
  the off-by-1/off-by-3 src correction). (2) Queue (ii): #87 rounds
  15-17 — residual = two independent additive legs; ack leg is
  `AI_TrySwitchOrUseItem` (not move-scoring); Quick-Claw and
  opponent-identity predicates both FALSIFIED; evidence program
  complete, fix-shape decision recorded in #87. (3) Queue (iii):
  walk-up scoping memo (3 maps, ~17/~8 boxes end-to-end). (4)
  Continuous play: `factoryRoundChaining.ts` + terminal→next-draft
  path (decision: re-enter fresh generated draft after the record
  menu, no new lobby surfaces); exposed pre-existing #88 → fixed at
  root cause (`FaintClearSetData` zeroes status2 on faint;
  battle_main.c:3272), vanilla soak 14/20→**20/20**; #89 filed
  (Baton Pass `openpartyscreen`), #90 filed (seed-51 presenting HANG).
  (5) Lane folds at orient AND wind-down (animation: Flail 184 +
  Luster Purge 185 promotions, Mega Drain evidence; rust: 6 script
  leaves) — both lanes at zero unfolded commits at close.
- **Gates (final union, re-run after a last rust-main tail fold —
  settorment + snatch leaves, core-rs only):** full npm **1,024 files /
  9,833 passed / 224 skipped**; build green; cargo native green (62
  ok-suites); wasm rebuilt **496,864 B** `8b489813…`; forced-WASM
  **18 files / 803 tests**; soak vanilla **20/20 OK** (run before the
  core-rs-only tail, which soaks do not exercise); soak full 0:60
  **50/60** — all
  9 crashes are the single #89 class (seeds 1,19,21,25,27,37,40,41,57,
  mostly round-1 surface: full-policy play selects Baton Pass), 1 HANG
  is #90. NOTE: the prior 60/60 full-soak baseline predates chaining
  AND this session's driver changes — input streams shifted; vanilla
  20/20 is the standing regression bar, and #89/#90 are the honest
  full-policy remainder, not regressions of previously-green behavior.
- **Next:** (a) #89 — player-side mid-turn Baton Pass switch-in
  through `beginCommandResolution` (the opcode exists; the wiring
  gap is diagnosed in the entry); (b) #90 triage (seed 51); (c) the
  two waiting user decisions above; (d) distribution-parity breadth
  for chained rounds once #89 lands.
- **Notes:** oracle freshness FAILs on :8014/:8012 were the known
  timestamp false positive (verified against commit contents + live
  `bin/oracle info`). Wasm-artifact papercut hit 3× more this session
  (now 5; every fresh side worktree). Commits local only — pushing is
  Kyle's step.

## 1272 — [main worker, 2026-08-14] **#88 fixed: locked multi-turn continuation now falls back to a fresh resolution when the locked battler faints first; soak 20/20 OK**

- **State:** #88 is fixed and deleted from ISSUES.md. `npm run soak --
  policy vanilla --seeds 0:20` is **20/20 OK** (was 14/20 OK + 6 CRASH).
  Full `npm test` green (1022 files / 9,822 passed / 224 skipped) and
  `npm run build` green. One NEW, unrelated pre-existing bug surfaced and is
  cataloged as **#89** (see Notes) rather than fixed — out of this step's
  scope.
- **Did:** (1) Root cause (confirmed, not the preCommandRngCalls red
  herring #88 flagged as unconfirmed): `beginCommandResolution`
  (`factoryRoundBattleOrchestrator.ts:1418`) retains a "locked action"
  presentation owner whenever the non-acting battler carries
  `STATUS2_MULTIPLETURNS`/`STATUS2_RECHARGE`, on the assumption its
  continuation will survive to print. `FaintClearSetData`
  (`battle_main.c:3272`) unconditionally zeroes `status2` on faint, so a
  faster opposing move can legitimately KO that same locked battler before
  its continuation ever fires — a real, reachable game outcome (repro:
  seed 0 vanilla, chained round 2 battle 1 turn 5, opponent charges
  Razor Wind turn 4, player's turn-5 move KOs it first). The parent treated
  the missing receipt as a broken invariant and threw. Fix: exported
  `hasRetainedLockedActionReceipt` from `battleResolutionPresentation.ts`;
  `beginCommandResolution` now checks it against the driven transition
  before committing to `appendBattleResolutionLockedActionContinuation`,
  falling back to a fresh `createBattleResolutionPresentation` (identical
  to the `retained === null` branch) when the receipt is absent. No
  battle-number/turn-number/tick branch added; anchor-path behavior
  untouched (the branch only changes what happens where the parent
  previously threw). (2) Repro pinned as a new Tier-1 test in
  `tests/randomRoundSoak.test.ts` ("ISSUES #88: ..."). (3) Two
  pre-existing pinned tests: seed 21 ("earns all seven wins") — added
  `stopAtFirstRoundDecision` to `randomRoundSoakDriver.ts` (freezes a
  snapshot the instant `pendingGeneratedRound` commits) so it again reports
  the first round's own outcome instead of wandering into endless
  auto-rechained rounds (strong-route never stops winning); its numeric
  pins moved by a genuinely correct amount (~46 frames / 4 render calls,
  `terminalRecordChoice` now `null` not `"no"`) because the new chaining
  short-circuit clears `factoryTerminal` in the same tick `recordChoice`
  reads "no", so it never lingers through the old decline-farewell dialogue
  — documented inline, not silently loosened. Seed 27 — see Notes, not
  fixed, `it.skip`-ed with a pointer to #89. (4) Bumped
  `DEFAULT_RUN_OPTIONS.maxFrames` 200_000 → 300_000 (chaining makes a
  single seed's run legitimately longer than one round) and fixed
  `randomRoundSoak.ts`'s CLI to read that constant instead of its own
  stale hardcoded 200_000 default — the CLI default was silently out of
  sync with the driver's exported default.
- **Next:** continuous-play program: challenge 3+/battle 21 Noland
  natural-play verification (queue item 2's remaining reach). #89 (Baton
  Pass `openpartyscreen` machine-barrier) is unclaimed backlog. Queue
  (ii)/(iii) from 1267/1268 remain untouched/parallel-lane.
- **Notes:** Investigating seed 27's pinned test (documented in the old
  #88 entry as crashing with #88's own signature) revealed that claim was
  stale: on the actual starting commit (`da55e159`, pre-fix), seed 27
  crashes with an UNRELATED, pre-existing "full"-policy bug (Baton Pass ->
  `openpartyscreen` -> `machine-barrier`, unhandled by
  `driveTrainerBoundary`) at round 1 battle 1 turn 10 — well before #88 or
  chaining are ever in play. Confirmed independent by reproducing
  byte-for-byte identically before touching any code this session. Filed
  as **#89**; the seed-27 pin is `it.skip`-ed pending that fix (its
  documented battle-4-turn-16 scenario is currently unreachable). This is
  the session's one deviation from "pass as originally written" — surfaced
  explicitly per the brief rather than hidden. No committed compare trace
  touched; no `executableFrontierRatchet` barrier counts moved.
