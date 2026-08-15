# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1271 — [main worker, 2026-08-14] **Continuous-play step 1: generated-draft round entry + in-session chaining WIRED; blocked green by newly-exposed #88**

- **State:** Round-chaining wiring (ROADMAP "User decisions 2026-08-14" #2)
  is implemented and committed (`b7ae30de`), green under typecheck,
  `test:smoke`, `npm run build`, and 8 new Tier-1 scenario tests
  (`tests/factoryRoundChaining.test.ts`). Running it end-to-end via
  `npm run soak` surfaced a genuine pre-existing engine bug (**new #88**)
  that blocks the full `npm test` + soak acceptance gates — did NOT attempt
  a fix (out of a bounded wiring step's scope; see #88). **STOPPING at this
  green-commit boundary per the brief's explicit permission** rather than
  forcing the gate.
- **Did:** (1) `src/engine/factoryRoundChaining.ts`: pure `FactoryCarry`
  (win streak/symbols/BP/rents, in-session only) + `advanceFactoryCarry`
  (streak +7 on win, reset on loss; symbols/BP/rents from the round's
  already-computed `roundOutcome`) + `generateFactoryChallengeDraft`
  (builds the next draft screen from `generateInitialFactoryRentals`,
  flowing straight into the existing `createDraftScreenStateFromRentalRecords`
  with zero anchor-record special-casing, structural typing already
  compatible). (2) `core.ts` wiring: the terminal record menu's accepted
  default-NO input (`recordChoice` newly "no", both roundCompleted/roundLost)
  now short-circuits into a freshly generated draft screen + resets
  transient state, instead of falling through to the decline-farewell →
  free-roam-Lobby chain (no new lobby-dialogue surfaces, per the supervisor
  design decision recorded in the step brief). The subsequent battleRoom
  handoff, when a `pendingGeneratedRound` snapshot is present, constructs
  the next round via `createFactoryRoundBattleOrchestrator`'s **already-proven**
  `generateInitial` path (no `adoptedInitialOpponent` — confirmed exercised
  by `factoryRoundBattleOrchestrator.test.ts`'s own "uninterrupted
  orchestrator cursor" case) instead of the anchor-only
  `createFactoryAnchorSession`; the RNG seed threaded through is the
  finishing round's own `round.rules.rngValue` ("the ROM's Random() is one
  continuous global", per that same test's doc). `factoryDraftScreen.ts`
  gained `selectedRentalSlotIndexes` (mirrors `selectedRentalParty` but
  returns pool-slot indexes, since `generateInitial` selects by slot not by
  resolved record). Boot path (challenge 1) untouched — still
  `ANCHOR_DRAFT_RENTAL_RECORDS`/`createFactoryAnchorSession` unconditionally
  at `pendingGeneratedRound === null`. (3) Discovered + cataloged **#88**:
  driving a live-generated round's battle 1 through the real
  tick()-level command/resolution presentation state machine (only
  reachable now that round 2 exists) throws "locked action continuation
  receipt has no immutable matching action snapshot"
  (`battleResolutionPresentation.ts:3898`) — 6/20 seeds in
  `npm run soak -- --policy vanilla --seeds 0:20` (14/20 OK), plus 2
  pre-existing pinned cases in `tests/randomRoundSoak.test.ts` (seed 21,
  seed 27) whose own original concerns did NOT regress but which no longer
  stop cleanly at round 1's own terminal now that the driver keeps playing.
- **Next:** #88 first (it blocks this program's own acceptance gates and
  any further round-2+ soak work); then continue the continuous-play
  program (queue item 2's remaining reach: challenge 3+/battle 21 Noland
  natural-play verification) once unblocked. Queue (ii)/(iii) from 1267/1268
  (#87 instrument, Brain walk-up scoping) remain untouched/parallel-lane.
- **Notes:** `npm run typecheck` green throughout. `npm run test:smoke`
  green (375/375). `npm run build` green. Full `npm test`: **2 failed
  (both #88-attributable, both in `tests/randomRoundSoak.test.ts`) / 9,819
  passed / 223 skipped** — did not weaken or paper over those two
  pre-existing pinned tests; left them red and documented, since silently
  loosening a regression pin to hide a fresh discovery would be worse than
  an honest red. No committed compare trace touched; no barrier counts
  touched. PAPERCUT: none beyond the time cost of discovering #88 itself.

## 1270 — [main worker, 2026-08-14] **Queue (i) step 3: brain-aware Lobby congrats text**

- **State:** All 3 steps of `docs/noland-brain-post-battle-audit.md` §5's
  worklist done (each its own green commit). Queue (i) "consequences" is
  complete; next is queue (ii)/(iii) per PROGRESS 1268 (#87's ack-timing
  instrument, Brain walk-up scoping), then the continuous-play program.
- **Did:** `EventScript_WonChallenge`'s `frontier_isbrain` branch
  (`BattleFrontier_BattleFactoryLobby/scripts.inc:38-46`,
  `Text_CongratsForDefeatingHead:447-450`, re-verified against the reference
  decomp, not just the audit doc) is now selected in
  `factoryTerminalPresentation.ts`/`factoryTerminalRender.ts` iff the final
  opponent carries `frontierBrain` — matching `IsTrainerFrontierBrain`
  (`gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`) exactly, independent
  of symbol status. Threaded `currentOpponent` through the `roundCompleted`
  presentation command (previously `playerParty`-only) so the terminal can
  key off it, same as `roundLost` already did. The Brain text's `\n`+`\l`
  shape (3 lines with a mid-message scroll) reuses the generic scroll
  mechanic the `award` box already implements (same `awardScrollTicks`(4)/
  `awardThirdLineTextDelay`(7) constants — generic printer animation, not
  award-text-specific), with its own two gate ages derived via the "input
  accepted exactly on the tick the last glyph draws" rule that reproduces
  `congratulationsInputReadyAge`/`awardScrollInputDelay`/
  `awardDefaultInputDelay` (102/69/41) with zero slack against the three
  existing pinned constants — flagged in a doc comment as formula-derived,
  since no live oracle trace of a Brain win reaching the terminal exists yet
  (blocked on queue-item-4's not-yet-built harness `factoryBrain` staging
  mode) to probe fresh timing against.
- **Next:** queue (ii) — #87's opponent-AI `ChooseAction` ack-timing
  instrument (`battle_ai_switch_items.c`); queue (iii) — Brain walk-up
  dialogue scoping only; then the continuous-play program (generated-draft
  round entry + round chaining, PROGRESS 1267).
- **Notes:** `tests/factoryTerminalPresentation.test.ts` — new case pins the
  Brain congrats' byte sequence (encoded via the same `charmap.json` table
  the renderer uses, cross-validated char-by-char against every known code
  in the existing `encodedBytes` tables since `factory-terminal-messages.json`
  has no pre-expanded encoding for this string yet); negative case pins the
  ordinary text's bytes straight from the JSON's own pre-expanded
  `regularCongrats.encodedBytes`, unchanged. Full `npm test` green (1020
  files / 9,813 passed / 223 skipped, up 2 from 1269), `npm run build`
  green, `npm run typecheck` green throughout. No barrier counts touched.
  PAPERCUT: none this session.
