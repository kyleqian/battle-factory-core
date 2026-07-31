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

## 761 — [BOUNDED MAIN WORKER 2026-07-31 ~00:50] Species-dependent dispatch delay: mechanism named, cry-duration-modeled, fixed; YOSHI 650/751

- **State:** new `tools/extract/extract-cry-durations.ts` →
  `src/data/gen/cry-durations.json` (376 species) + isolated extractor test
  `tests/cryDurationsExtraction.test.ts`; `battleScene.ts` dispatch/text/
  visual/ready delay constants replaced with a shared species-keyed
  function (no species-name branch); `docs/trainer-pic-off-window-scout.md`
  §D "Round 5 resolution" has full mechanism citations + the 4-species
  triangulation table. Focused: `factoryBattleStartIntro` + ack-alignment +
  `executableFrontierRatchet` + `factoryRoundBattleOrchestrator` +
  `cryDurationsExtraction` + `speciesStatsExtraction` + `battleScene` +
  `kabutoSendOut` **340/340 green**; `npx tsc --noEmit` clean. Full
  `npm test`/`npm run build` **not run this step**, per the brief.
- **Did:** named the source mechanism (`Intro_TryShinyAnimShowHealthbox`,
  `battle_controller_opponent.c:292-383` — gates on cry-playback completion,
  `IsCryPlayingOrClearCrySongs`, `sound.c:521-532`, genuinely species-
  dependent since ordinary send-out cries use no pitch shift and an
  effectively-unbounded note length, so play for their own native sample
  duration) before touching any constant. Extracted per-species cry
  durations from `reference/pokeemerald/sound/direct_sound_samples/cries/
  *.wav` (dev-time asset, no runtime ROM/oracle access, no audio played) for
  all 376 Frontier-rental species. Triangulated against dense oracle
  captures for MAGNETON (+111) and COMBUSKEN (+125) — both match the
  cry-duration prediction **exactly**. Fixing dispatch delay exposed a
  second, closely-coupled site (`GENERATED_PLAYER_VISUAL_DELAY`, the
  player's own throw-becomes-visible tick) that also needed to shift;
  re-derived it as `player-line-length - 1 + SENDOUT_HANDOFF_LAG`, matching
  both fixtures exactly. GROVYLE-pinned fixtures unchanged
  (`battle-command-generated-off` **128/128**, `interactive-generated-
  intro-off` **715/715**). YOSHI re-run: **650/751**, up from 512/751 (two
  isolated single-frame mismatches at 444/536 plus a new named 99-frame
  small residual at 652..750, opponent healthbox/summary region — not the
  dispatch mechanism, which is now proven exact through frame 651).
- **Next:** three characterized loose ends, none blocking: (1) frame 444
  (unchanged from round 4, still unisolated), (2) new frame 536, (3) the
  652..750 small residual (opponent healthbox/summary area, distinct site).
  `GENERATED_OPPONENT_SHADOW_DELAY`(104) is untouched and now reachable for
  species with `dispatchDelay >= 104` (MAGNETON is in
  `elevatedEnemyShadowSpecies` but has no app-side compare trace this
  round) — worth a future species/shadow cross-check. KABUTO's own
  cry-duration prediction (+79) was not oracle-verified (its existing
  `kabutoSendOut.ts` models a different, unrelated per-species mechanism —
  a front-sprite idle wobble, not cry length — so wasn't usable as a
  cross-check).
- **Notes:** Gate-5's sole open engineering thread (entry 760) is now
  substantially advanced (86.6% vs 68.2%) with three small residuals
  remaining, all named — supervisor's call whether to file the residuals as
  a new issue or fold them into a future round.

---
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
