# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 759 — [BOUNDED MAIN WORKER 2026-07-31 ~00:15] YOSHI intro slice 2: ack-handoff divergence pinned as (a) alignment-only, fixed; 512/751, new downstream defect named and stopped

- **State:** `tools/compare/traces/factory-arbitrary-intro-yoshi-off.json`
  (A-press offset only) + new
  `tests/factoryBattleStartIntroAckAlignment.test.ts` + `docs/trainer-pic-
  off-window-scout.md` §D updated. No other `src/` change. Focused:
  `factoryBattleStartIntro` + new ack-alignment test + `executableFrontier
  Ratchet` + `factoryRoundBattleOrchestrator` **43/43 green**; `npx tsc
  --noEmit` clean. Full `npm test`/`npm run build` **not run this step**,
  per the brief (side worker live concurrently).
- **Did:** Pinned the first divergence (entry 757/758) exactly. Oracle: dense
  pixel diff of the fixture's own `preCheckpointCaptures` shows the message
  box pixel-static across absolute frames 1541-1544 and first changed at
  1545 — settles 1544/1545/1546 (1541 = accepted-edge frame, 1545 = redraw).
  App: instrumented `advanceFactoryRoundBattleStartIntro` directly (not the
  compare loop) and confirmed its documented one-tick `elapsed` freeze on the
  accepted `A` edge, then simulated: the message-switch always lands at
  `(A-press tick) + 4`. Both previously-tried offsets (374, 379) are late;
  the source-faithful press tick is **370** (`1545 - preCheckpointFrameOffset
  1171 - 4`), landing the switch exactly on app-frame 374. **Verdict: (a)**,
  pure comparison-alignment — no renderer/lifecycle bug. Fixed the trace's
  segments (`[373,1,376]` → `[369,1,380]`, same 750-tick total) and re-ran
  the dense comparison: **512/751 matched** (was 415/751), frames 0..512
  match except one isolated frame. This exposed a **second, previously-
  hidden, genuinely different divergence** (not ack timing): dense-diffing
  confirms `generatedBattleStartOpponentHandoffTick` (text-complete + 3-tick
  lag) is exactly correct (predicted app-412/oracle-1583 handoff matches the
  oracle's own release-start jump precisely), but
  `GENERATED_PLAYER_DISPATCH_DELAY`/`_TEXT_DELAY = 101` undercounts by 24
  ticks for this fixture's COMBUSKEN opponent (oracle's own "Go!" text
  starts at handoff+125, i.e. absolute 1708, not +101). That constant was
  evidently validated against a GROVYLE-opponent fixture; 24 ticks isn't
  explained by trainer-name-length alone, so the real per-species dependency
  is unidentified — a bounded fix isn't safe without a second species data
  point (risks regressing the GROVYLE-validated fixtures). Per the brief's
  own out-of-scope clause: characterized (site, tick arithmetic, oracle
  citations) in §D and not chased. One further isolated single-frame
  mismatch (app 444) inside the otherwise-exact release window is likely the
  same species-dependent family, not separately isolated to a site.
- **Next:** supervisor — the ack-handoff item this round targeted is fully
  resolved (512/751, every residual frame named). The new species-dependent
  post-handoff dispatch-delay defect (§D) is unstarted, real work — needs a
  second (non-GROVYLE, non-COMBUSKEN) generated-opponent oracle data point to
  pin the actual dependency before touching `GENERATED_PLAYER_DISPATCH_DELAY`.
- **Notes:** the two isolated/rejected `A`-press offsets from slice 1 (374,
  379) are now regression-pinned in the new test as "still-late, switch not
  yet visible at frame 374" cases, guarding against re-introducing either.

---
## 758 — [SUPERVISOR 2026-07-30 ~23:50] Round 3 verified: YOSHI 415/751 re-run confirmed; #55 filed from the S3 probe; three rulings

- **State:** S3's probe doc merged (`630bc805`, worktree removed); M3's
  YOSHI comparison re-run by the supervisor personally — **415/751
  confirmed exactly**, residual bbox confined to the message-box region,
  consistent with the single ack-handoff divergence. Full union gate
  running at write time (result in next entry or amended here).
- **Rulings (reversible, evidence-cited):** (1) **ISSUES #55 filed** —
  S3 proved the rental-construction stream contract cannot represent
  ambient VBlank interleaving (53 ticks woven into the anchor's 53-frame
  construction window); the algorithm is correct (filtered-ledger replay
  reproduces all six personalities). Gate-5 clause (a) counts as
  receipt-linked at the *rules* level: selection byte-exact from the probed
  pre-selection cursor `145179184`, construction proven via filtered
  ledger; the stream-model boundary is tracked debt (#55), not a Gate-5
  blocker — the production route never calls the generator today.
  (2) The P..B fade for arbitrary trainers is **not** a Gate-5 blocker:
  canonical-only `battleRoom.ts` owns the fade today, the fade is
  trainer-invariant chrome, and re-owning it generically is #39-class
  keying retirement. The arbitrary-trainer intro claim window is
  B-8..checkpoint. (3) Round 4 dispatched — main M4: pin the
  acknowledgement-handoff frame and re-run YOSHI for a full-window honest
  claim; side S4: land the re-scoped anchor receipt-link test (all
  setId-derived fields all slots + slot-0/2 personalities, #55 cited for
  the excluded four).
- **Next:** if M4 lands the full window, every Gate-5 audit item is
  discharged or ruled — supervisor then ticks Gate 5 in ROADMAP with the
  recorded rulings and moves to #39 per the user ordering.

---
## 757 — [BOUNDED MAIN WORKER 2026-07-30 ~23:50] Public dense arbitrary-trainer intro comparison, slice 1: 415/751 matched, first divergence characterized

- **State:** new fixture + consumer wiring, no other src changes. Focused:
  `executableFrontierRatchet` + `factoryBattleStartIntro` +
  `factoryRoundBattleOrchestrator` **40/40 green**; `npx tsc --noEmit`
  clean. Full `npm test`/`npm run build` **not run this step**, per the
  brief (a side worker is live concurrently).
- **Did:** non-reversed-workflow tuple via `generateFactoryOpponent`
  (rngValue 42, factoryWinStreak 0) → trainerId 49 YOSHI (BUG CATCHER),
  opponent COMBUSKEN/POLIWHIRL/PORYGON — not DESTIN/JENSON/SHIZUKA, disjoint
  cast. New ground-truth fixture
  `tools/battle-lab/factory-arbitrary-intro-yoshi-off.json`
  (`preCheckpointCaptureAllFrames`). Re-probed this fixture's own P/B/
  checkpoint landmarks per §C's caveat rather than reusing SHIZUKA's: P=959
  (unchanged, generic), B=1179 (+8 vs SHIZUKA, species-load cost), checkpoint
  duration 674 vs SHIZUKA's 714 (shorter trainer/species text). New app
  `AppStage` (`factory-arbitrary-intro-yoshi-off` in `appTrace.ts`) stages
  the same tuple via `createFactoryRoundBattleOrchestrator` +
  `beginFactoryRoundBattleStartIntro`. Extended `oracleClient.ts`'s
  `runOracleBattleLab` with an additive `oracleBattleLab.
  preCheckpointFrameOffset` field to consume `preCheckpointCaptures` as the
  oracle side of a comparison, rebased to app-relative frames — existing
  fixtures/behavior unchanged (opt-in field, verified via the green focused
  suite above). Ran the dense comparison (751-frame window): **415/751
  matched, frames 0..373 (374 consecutive) pixel-identical** — the entire
  trainer-slide/summary/full text-print-animation/idle-cursor-blink for this
  arbitrary trainer. First divergence at app-relative frame 374 (absolute
  1545): the oracle's own internal auto-acknowledgement of the intro's
  `PAUSE_UNTIL_PRESS` gate fires at a near-fixed absolute frame; the app's
  acknowledgement transition hadn't visibly landed by the same frame in
  either of two tried `A`-press offsets. Root cause not isolated (off-by-
  frames mapping vs. a real post-ack render lag); all 336 residual mismatches
  are downstream of this single divergence, not independent bugs. Also
  found/characterized: this app stage doesn't render the P..B fade transition
  at all (canonical-only `battleRoom.ts` owns it) — achievable window is
  B-8..checkpoint, not P..checkpoint. Seed alignment (task 5) is HONEST-STOP:
  same class of gap as entry 756 (ambient per-VBlank RNG ticks of unknown
  count before generation, not committed evidence) — used a best-effort seed;
  it happened not to matter (no text-window divergence appeared).
- **Next:** pin the exact acknowledgement-handoff frame (oracle 1544/1545/
  1546 vs. a spread of app `A`-press offsets, or instrument
  `acknowledgedElapsed` directly), then re-run for a full-window claim on
  this tuple. Separately: a generic (non-canonical) room/fade lifecycle for
  the P..B span is real, uncharacterized §B work, not started.
- **Notes:** full §D writeup with all landmark numbers, mapping derivation,
  and the divergence characterization is in
  `docs/trainer-pic-off-window-scout.md` §D. Also trimmed PROGRESS.md: entry
  753 was already duplicated in `PROGRESS-archive.md` (a prior ledger-edit
  slip per `b261e4fc`) and has been removed from here, not re-archived.

