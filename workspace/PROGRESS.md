# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1266 — [supervisor, 2026-08-14] **Wind-down: Brain presentation program built end-to-end in one session; silver 648/701 + gold 700/701 live compares; #87 parked with full forensics; all gates green**

- **State:** 8 rounds / 15 worker steps, zero unresolved failures (two
  honest-stops and one salvage, each strictly narrowing). The Noland arc
  went from "no app frame reachable" at orient to two committed live
  compares. DEFERRED.md remains EMPTY — no open supervisor questions.
- **Did (headlines):** (1) factoryBrain §5.2 consumers: README, silver+gold
  lab fixtures, live integration proof 82/82 (`verify-factory-brain-lab.ts`).
  (2) Brain presentation seam: `getFactoryTrainerPresentation(1022)` real
  NOLAND identity (source-re-derived), new additive
  `frontier-brain-trainer-pic.json` catalog + extractor, proof-stage
  battleIndex-6 widening, Tier-1 pins incl. a brain-LOSS pin. (3) Ground
  truth: silver + gold intro dossiers (49/49 + 44/44 sha verify scripts,
  PNG-verified labels; the whole battle-start window is PRE-checkpoint).
  (4) Live compares: silver 648/701 (transition/pic-reveal/battle-text/
  send-out exact), gold 700/701 (single tint-dot frame remains).
  (5) #87 filed then twice-narrowed: ready-frame formula misses the ROM's
  `TryDoEventsBeforeFirstTurn`/`ChooseAction` span; +7/+7/+5/+4 across four
  committed fixtures; staging, regime-discriminator, and switch-in-proc
  hypotheses each killed by committed instruments; variance localized to
  opponent-AI ChooseAction-ack timing (next instrument named in #87).
  (6) CGB4 papercut retired: 44-file family gated behind
  POKEBENCH_CGB4_EVIDENCE=1 (`npm run test:cgb4`), 88-artifact digest pin
  stays default — full suite 19 min → ~2-3 min. (7) Read-only Noland audit:
  7/8 seams CLEAN, 1 doc defect fixed same-hour (cursor-gap caveats in
  battle-lab README + design doc).
- **Gates (final union, after the last rust fold):** full npm **1,018
  files / 9,802 passed / 223 skipped** (CGB4-gated); build green; cargo
  native green (52 ok-suites); WASM **509,839 B** rebuilt twice, final
  `08436ef1…`; forced-WASM **18 files / 803 tests** (rerun on the final
  artifact); soaks vanilla **20/20 OK**, full **60/60 OK**, 0 crashes /
  0 hangs (run after the last workspace/src change; only core-rs moved
  afterward, which soaks do not exercise). Both lane branches folded at
  wind-down (animation: Flail + Luster Purge; rust: ~38 commits of script
  leaves); both sibling supervisors were LIVE throughout — any post-15:00
  tail is the next orient's fold.
- **Next:** (a) #87's named instrument (opponent-AI ack-timing model —
  battle_ai_switch_items.c unread); (b) the Brain walk-up dialogue surface
  (silver ~12 monologue boxes, gold 2 usher boxes — no app surface yet,
  scoping decision for a fresh session); (c) extending the gold window past
  its ready frame waits on #87.
- **Notes:** oracle freshness FAIL on :8014 was the known timestamp false
  positive (verified serving factoryBrain); :8012 left to the animation
  lane by design. One side worker self-suspended (ScheduleWakeup class) and
  was salvaged via the commit-tail recipe; fresh-worktree wasm-artifact
  papercut bumped to 3 hits with the copy-in workaround recorded.
