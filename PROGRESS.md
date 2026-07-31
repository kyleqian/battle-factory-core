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

## 760 — [SUPERVISOR 2026-07-31 ~00:30] Round 4 verified+merged; gate 554/5653 green; round 5: dispatch-delay mechanism (main) + #39 rank-1 equivalence groundwork (side)

- **State:** union gate green **554 files / 5653 tests + 1 deliberate
  animation-lane skip**, build clean. M4's 512/751 re-run and confirmed by
  the supervisor; S4's `anchorDraftReceiptLink.test.ts` (52 assertions)
  merged and green on the union — Gate-5 audit item 2 is landed in its
  entry-758 re-scoped form (ROM-pinned setId-derived fields all slots +
  slots 0/2 personalities; slots 1/3/4/5 as labeled clean-model regression
  literals per #55; item field is a catalog cross-check, not RAM, because
  `anchor-state.json` never decoded it).
- **Gate-5 position:** every audit item is now discharged, landed, or
  ruled (entries 755/758). The YOSHI dense intro claim stands at 512/751
  with both residual families named; the sole open engineering thread is
  the species-dependent dispatch-delay (§D), which strengthens (e)/(f)
  evidence but does not gate the clauses (already DISCHARGED in the
  audit). Supervisor intent: tick Gate 5 after round 5's main step either
  fixes the delay mechanism or files it as a numbered issue with complete
  evidence.
- **Round 5 dispatched:** main M5 — name the ROM's actual wait mechanism
  between opponent handoff and player dispatch (source read), triangulate
  GROVYLE/COMBUSKEN/MAGNETON/KABUTO, fix data-driven if bounded (GROVYLE
  windows must stay at recorded counts) else evidence for a new issue;
  side S5 — #39 rank-1 groundwork, equivalence-proof-first (new-files-only
  typed adapter + Tier-1 equivalence for the Battle-2 command turn; flip
  and deletions stay a later main step).
- **Notes:** #39 rank-1 ordering follows
  `docs/battle-scene-retirement-inventory.md`'s own recommendation; the
  two-phase equivalence-first split keeps lanes file-disjoint.

---
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
