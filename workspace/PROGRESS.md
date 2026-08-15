# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1269 — [main worker, 2026-08-14] **Queue (i) steps 1+2: `applyFactoryBrainRoundOutcome` ported + wired as round-controller outputs**

- **State:** Steps 1-2 of `docs/noland-brain-post-battle-audit.md` §5's
  worklist done, each its own green commit. Step 3 (brain congrats text) is
  explicitly next and untouched, per the brief's OUT OF SCOPE list.
- **Did:** (1) `src/engine/factoryBrainRoundOutcome.ts`:
  `applyFactoryBrainRoundOutcome` ports `GiveBattlePoints` +
  `GiveFacilitySymbol` (`frontier_util.c:1853-1925`) exactly — BP table row
  keyed off the post-win streak (÷7, decrement-unless-zero, clamp), the +10
  brain bonus, and silver/gold symbol grant with the STREAK/STREAK_LONG
  no-symbol branch, sourced from the already-verified
  `factory-ending-policy.json` extraction (not hand-transcribed). Pinned in
  `tests/factoryBrainRoundOutcome.test.ts`: silver 14 BP/symbol, gold 15
  BP/symbol, streak 14 BP/no symbol, streak-long 17 BP/no symbol, ordinary
  first win 3 BP (unchanged from the existing fixture), brain loss 0 BP/no
  symbol. (2) Wired into `factoryRoundBattleOrchestrator.ts`: new
  `roundOutcome` state field, set by `finishBattle` at the two real
  round-terminal phases via a new exported `factoryRoundOutcomeForResolution`
  helper (same computation, callable without a real kernel battle). Extended
  `tests/factoryBrainRoundShape.test.ts`'s silver/gold/negative(loss) cases to
  assert the new output fields via the same `resolveRoundBattle`-bypass
  technique that file's own loss test already used (a real kernel win against
  a generated Brain party wasn't scripted — out of a bounded session's
  budget).
- **Next:** step 3 — consume `factory-terminal-messages.json`'s
  `factoryHeadCongrats` in `factoryTerminalPresentation.ts`/
  `factoryTerminalRender.ts` behind a `frontierBrain`-aware branch; then
  queue items (ii)/(iii) per PROGRESS 1268.
- **Notes:** Full `npm test` green (1020 files / 9,811 passed / 223 skipped),
  `npm run build` green, `npm run typecheck` green throughout. No barrier
  counts touched. The ordinary seventh-win terminal presentation
  (`battlePointAward: 3` fixture) is untouched — verified unmodified and its
  own tests stayed green; the ordinary-first-win case in the new pure
  function reproduces the same 3 BP value independently.

