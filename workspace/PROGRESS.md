# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1268 — [supervisor, 2026-08-14 eve] **Session start: both lane branches folded; union gates green; queue (i) dispatched**

- **State:** Orient + folds done; working the 1267 queue. Main worker on
  queue (i) steps 1+2 (`applyFactoryBrainRoundOutcome` + orchestrator
  outputs); side worker on queue (ii) (#87 ChooseAction ack-timing model,
  `battle_ai_switch_items.c`).
- **Did:** Folded `animation-main` (Flail exact 183→184/276 promotion +
  Luster Purge evidence/reducer checkpoints, presentation-only) and
  `rust-main` (4 script leaves: copyfoestats, Pay Day, Role Play,
  Destiny Bond) into master. Union gates: full npm **1,019 files /
  9,805 passed / 223 skipped**, build green; cargo native green; wasm
  rebuilt **509,620 B** `412773e1…`; forced-WASM **18 files / 803
  tests** green. Oracle freshness FAIL on :8014/:8012 re-confirmed as
  the known timestamp false positive (all commits since process start
  are docs/probes/core-rs; `bin/oracle info` serves scene-off v5).
- **Next:** verify + fold worker results; then queue (i) step 3 (brain
  congrats text), (iii) walk-up scoping (side), continuous-play program.
- **Notes:** entry updated at wind-down with final gates/soaks.


