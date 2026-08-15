# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1267 — [planning session, 2026-08-14] **Next-run queue set (user decision): Noland post-battle consequences → #87 instrument → walk-up scoping; continuous-play bar audited — two wiring gaps named**

- **State:** Docs/ledger only — no `src/`, oracle, or test changes. The
  user ordered the next main-lane work and named the follow-on
  objective; both recorded in ROADMAP.md's "User decisions (2026-08-14,
  planning session)" block.
- **Did:** (1) Verified the Brain program's remaining-list status:
  (a) harness lab mode LIVE (top-layer `33354440`; §5.2 consumers per
  1266) and (c) presentation ran end-to-end — only (b) post-battle
  consequences remains. (2) Queued, in order: (i) consequences — steps
  1-3 of `docs/noland-brain-post-battle-audit.md` §5 (BP award table +
  the +10 brain bonus, symbol grant + BP as round-controller OUTPUTS,
  brain congrats text; the step-4 harness seam now exists, so the
  numbers are live-verifiable); (ii) #87's named instrument (the
  opponent-AI `ChooseAction` ack-timing model,
  `battle_ai_switch_items.c`); (iii) Brain walk-up dialogue — SCOPING
  ONLY (present faithful/trim/skip options; do not build). (3) Audited
  the user's continuous-play bar ("boot and play rounds indefinitely at
  distribution parity") against the code: TWO wiring gaps — the draft
  screen is built exactly once, at boot, from the captured anchor
  records (`core.ts:581` is the only construction site;
  `factoryRentalGeneration.ts` is proven but unwired into any
  next-round entry), and the roundCompleted terminal has no continue
  path into a next round's draft (no challenge advance, no in-session
  streak carry — battle 21/silver Noland is unreachable by natural
  play).
- **Next:** (a) run queue item (i) — the pure outcome function first
  (audit doc §5 step 1 acceptance), then orchestrator wiring, then the
  congrats text; (b) items (ii)/(iii) in order; (c) after (i): the
  continuous-play program (generated-draft round entry + round chaining
  with in-session streak/symbol/BP carry; cross-session saving stays
  OUT of scope).
- **Notes:** Top-layer session; workspace edits limited to
  ROADMAP/PROGRESS per the user's queue request. Entry 1264 rotated to
  the archive. Commits local only — pushing is the user's step.

