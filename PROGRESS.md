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

## 762 — [SUPERVISOR 2026-07-31 ~01:10] Round 5 verified: cry-duration mechanism proven (YOSHI 650/751, GROVYLE pins intact); #39 adapter merged after supervisor type-fix; round 6 dispatched

- **State:** union green — suite **556 files / 5670 tests + 1 deliberate
  animation-lane skip**, build clean after supervisor fix `18c3299c`.
  Supervisor personally re-ran: YOSHI **650/751**,
  `battle-command-generated-off` **128/128**,
  `interactive-generated-intro-off` **715/715**.
- **Round-5 outcomes:** (1) M5 identified the dispatch-delay mechanism —
  `Intro_TryShinyAnimShowHealthbox` blocks on `IsCryPlayingOrClearCrySongs`,
  so the wait is the opponent's cry duration. Extracted
  `src/data/gen/cry-durations.json` (376 species, isolated extractor
  test); MAGNETON (+111) and COMBUSKEN (+125) matched the GROVYLE-baseline
  prediction exactly; species-keyed function replaced both fixed constants
  plus the coupled `GENERATED_PLAYER_VISUAL_DELAY`. Three named YOSHI
  residuals remain (444, 536, 652-750) + the reachable-but-unexercised
  `GENERATED_OPPONENT_SHADOW_DELAY` (MAGNETON is the live case). (2) S5
  banked the #39 rank-1 typed adapter + equivalence proofs (new files
  only) with three FINDINGs (hardcoded move-target legality, unproven
  gender/personality, no generic move-visual owner) and a concrete flip
  checklist.
- **Supervisor fix:** S5's files had two type errors `npm run build`
  catches but vitest does not (tuple-vs-number[] cast; a vacuous
  "flinch" event-kind comparison — no such kind exists). Fixed minimally
  (`as const` tuples; assert no FLINCH messageId instead) in `18c3299c`.
  Worker-brief lesson: focused runs must include `npx tsc --noEmit` for
  new src/test files — added to future side briefs.
- **Round 6 dispatched:** main M6 — isolate/fix the 652-750 family, then
  536/444, then build the MAGNETON app-side comparison (second
  arbitrary-species proof; exercises the shadow path); GROVYLE pins must
  hold. Side S6 — battle-2 party ground-truth probe (personalities,
  genders, bench legality) to discharge the flip's FINDINGs 1-2.
- **Next:** after M6, supervisor ticks Gate 5 (per entry-760 intent — the
  delay mechanism is now fixed and proven on two species) and the main
  lane moves to the #39 rank-1 flip consuming S5+S6.

---
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
