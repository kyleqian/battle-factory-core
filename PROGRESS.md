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


---
## 521 — [BOUNDED WORKER 2026-07-27 ~15:30] `turn2-endeavor.json` kickoff text/HP re-driven from kernel events (§13.3 landed)

- **State:** tree green at **268 files / 3560 tests** (unchanged count —
  this step wires already-tested staging-module exports into production
  code, no new test file), `npm run build` clean.
  `executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §13.3's plan exactly
  as written (§13.5 completion note appended). `battleScene.ts`'s
  `drawTurn2KickoffText` now sources its ENDEAVOR kickoff text
  (`TURN2_ENDEAVOR_ATTACK_LINE1/2`, `:6905`) and `endeavorOnixHp`'s
  `startHp`/`endHp` (`TURN2_ENDEAVOR_HP.from`/`.to`, `:6896`) from
  `turn2EndeavorPresentationStaging.ts`'s
  `resolveTurn2EndeavorAttackLines()`/`resolveTurn2EndeavorHpEndpoints()`
  (module-load-resolved consts, same shape turn 5's sibling call site
  already uses) instead of the raw `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`/
  `anchorPlayerBattler.hp`/`anchorPlayerAfterTurnHp` reads. Step 3
  (`anchorOpponentAfterTurnHp`'s squish overlay, `:6881`) stayed a literal
  per the plan's own scoping. Zero bridge edits — the staging module already
  called the shared `resolveRockSlidePresentationWindowContent` bridge, as
  predicted. **No literal died**: `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`
  stay defined and live at turn 3's own repeat call site (`:6985`). Every
  §13.3 citation checked out against `HEAD` before editing — no design-doc
  slip this time.
- **Acceptance (live, this session):** full sweep run BEFORE the change (on
  pristine `HEAD`) matched every recorded count exactly, then AFTER
  reproduced them byte-identically: `turn2-endeavor.json` 77/77 (twice, incl.
  a determinism check), `turn2-endeavor-drain.json` 237/237,
  `turn2-dragonbreath.json` 237/237, `turn2-dragonbreath-projectiles.json`
  61/61, `turn3-endeavor.json` 192/192, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
  `turn4-doubleteam.json` 250/250, `turn6-featherdance.json` 90/90.
- **Next:** either `turn6-statfall.json`'s wiring (unblocked since entry
  520's apostrophe-charmap fix, zero new staged proof needed per §13's own
  table) or the Roar/multi-hit registration side scouted in round 2.
- **Notes:** no PAPERCUT. One commit for the wiring + docs.

---
## 520 — [SUPERVISOR 2026-07-27 ~15:15] round 1 verified + merged (3 workers, all green); apostrophe-charmap prerequisite FIXED; round 2 dispatched

- **State:** master green at **268 files / 3560 tests** (union of entry 519's
  main-lane step + two side merges), `npm run build` clean, both side
  worktrees removed, zero unmerged branches. Census **108/214 effects,
  209/355 moves, 2321/2957 weighted (78.5%)**.
- **Side merges (both verified in-worktree first, live compare reruns by
  supervisor):** (1) §13 prep-scout — `docs/presentation-seam-scout.md` §13
  picks `turn2-endeavor.json` (77 frames, smallest unblocked genuinely-new
  window; comparator re-pinned 77/77 twice + 9-trace sweep; staging module
  `turn2EndeavorPresentationStaging.ts` committed unwired, 9 tests). Scout
  also proved `turn6-statfall.json` is *directly* apostrophe-blocked (its
  committed capture renders past the curly ’ in "ONIX’s ATTACK") and
  `turn11-featherdance.json` doubly so. (2) That prerequisite is now FIXED:
  root cause `tools/extract/extract-battle-messages.ts` never applied
  charmap.txt:87-88's `'\'' = B4` alias — extractor now decodes it (with a
  loud byte/glyph assertion), 129/365 templates corrected apostrophe-only
  (structural diff verified), generic dual-alias sweep found no other
  affected glyph class, 2 new resolver pins + 2 stale pins updated; zero
  drift across 4 resolver-driven traces + literal-driven turn6-statfall
  127/127 (supervisor reran resolver tests 13/13 + turn6-featherdance 90/90
  + turn1-rockslide 256/256 live).
- **Round 2 (dispatched):** main → §13.3 wiring (`turn2-endeavor.json`
  kickoff text from kernel events, acceptance 77/77 + §13.3's regression
  sweep) ∥ side → design/prep scout for the new top census set:
  EFFECT_ROAR's `FORCERANDOMSWITCH`/`INITMULTIHITSTRING`/`JUMPIFHASNOHP`
  trio (40) + the overlapping multi-hit pair row (4 effects, 23) — ground
  truth + registration plan for a round-3 main step.
- **Next:** verify round 2; then either the turn6-statfall wiring (now
  unblocked, zero new staged proof needed per §13's table) or the Roar/
  multi-hit registration, per what's banked.

---
## 519 — [BOUNDED WORKER 2026-07-27 ~15:00] B_SCR_OP_TRYINFATUATING + B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED registered; EFFECT_ATTRACT/EFFECT_SWAGGER/EFFECT_FLATTER executable end to end

- **State:** tree green at **267 files / 3549 tests** (worker wrote 269;
  supervisor corrected against a live `npm test` run) (+99 tests
  over session start 263/3512: `battleScriptTryinfatuatingOpcode.test.ts`
  15 tests, `battleScriptJumpifconfusedandstatmaxedOpcode.test.ts` 13 tests,
  plus 2 existing test files updated for the barrier narrowing below and 2
  attack-canceler fixture files updated for the new `personality` battler
  field), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (**0 new barrier call sites** — both new opcodes are fully
  source-complete; the two barrier *narrowings* below reuse existing
  `unsupportedBranch` call sites, same file/line, just a tighter trigger
  condition).
- **Did:** registered both opcodes of round 1's set. (1) `Cmd_tryinfatuating`
  (`battleScriptTryinfatuatingOpcode.ts`): Oblivious block (hardcoded jump,
  not the operand ptr), the same-gender/genderless-attacker/genderless-
  target/already-infatuated-with-anyone OR-chain (all four collapse to the
  operand's one fail ptr), success write of
  `STATUS2_INFATUATED_WITH(attacker)` — reused `statusInfatuatedWithBit`
  (newly exported from `battleScriptHitChainOpcode.ts`, previously a private
  helper for `Cmd_cleareffectsonfaint`'s clear) so the write is *provably*
  the same bit `advanceBattleScriptAttackCancelerInLove`'s admission phase
  already reads (composition test in the new file). Gender inputs needed a
  minimal kernel addition: a `personality` battler field (mirrors
  `gBattleMons[battler].personality`; source rereads species/personality
  from the party mon, but this engine has no Transform species/personality
  divergence yet, so they're always identical) plus a new `genderRatio`
  column on `species-stats.json` (extractor widened to parse
  `species_info.h`'s `.genderRatio` — a `MON_MALE`/`MON_FEMALE`/
  `MON_GENDERLESS` literal or `PERCENT_FEMALE(percent)`, truncated on
  assignment) — reused the existing `monGender.ts` per-mon half unchanged.
  (2) `Cmd_jumpifconfusedandstatmaxed`
  (`battleScriptJumpifconfusedandstatmaxedOpcode.ts`): a pure
  `STATUS2_CONFUSION` + `statStages[stat]==MAX_STAT_STAGE` read, always
  against `gBattlerTarget` directly (no battler operand in the macro at
  all). Zero barriers in either new opcode.
- **Standing-warning barriers found and widened (entries 507/515's own
  warning, budgeted for):** proving Attract's Oblivious tail live surfaced
  two existing barriers that over-fired on ability *membership* where
  source only acts on the matching *status*: (a) `accuracycheck`'s
  `JumpIfMoveFailed` ability-absorbing check barriered on ANY nonzero
  target ability; `AbilityBattleEffects(ABILITYEFFECT_ABSORBING)`
  (`battle_util.c:2679-2729`) only special-cases three (Volt Absorb/Water
  Absorb/Flash Fire) — narrowed to those three, every other ability
  (Oblivious included) now falls through exactly like source. (b)
  `Cmd_moveend`'s `MOVEEND_IMMUNITY_ABILITIES` barriered whenever a battler
  held one of 8 status-curing abilities at all; source
  (`battle_util.c:2873-2954`) only cures when that ability's own status bit
  is *also* set (e.g. Oblivious only fires on actual infatuation) — added
  `immunityAbilityCuresStatus`'s per-ability status gate. Both are
  narrowings of an existing `unsupportedBranch` call site (same file/line),
  not new barrier surfaces; updated the two pre-existing tests that relied
  on the old over-broad trigger to construct genuine reachability instead.
- **Tests:** isolated dispatch for every distinct fail reason of both
  opcodes (all 4 confused×maxed combinations for jumpifconfusedandstatmaxed
  across both its concrete call sites; Oblivious/same-gender/genderless×2/
  already-infatuated-with-a-third-battler for tryinfatuating) PLUS full
  committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for all three effects: Attract's success
  (opposite genders, status bit confirmed set, 1 RNG roll) and all four
  fail tails (each a real distinct root cause, not just prose-glossed);
  Swagger/Flatter's success (stat raise composing through
  setstatchanger+statbuffchange, confusion via seteffectprimary, 2 RNG
  rolls) and their own jumpifconfusedandstatmaxed edge branch (confused AND
  maxed, 1 RNG roll) plus the "maxed but not confused" and Own-Tempo-blocks-
  confusion non-edge variants.
- **Census (before → after):** 105/214 → **108/214** effects, 206/355 →
  **209/355** moves, 167/276 → **170/276** Factory-L50 unweighted, 2251/2957
  → **2321/2957** weighted (+70, exactly 45+25 — matches the predicted flip
  precisely, no shortfall). Doc regenerated and committed with the code.
  New top blocker: `B_SCR_OP_FORCERANDOMSWITCH`/`INITMULTIHITSTRING`/
  `JUMPIFHASNOHP` (EFFECT_ROAR, 40 weighted).
- **Next:** continue the ranked-table descent — EFFECT_ROAR's opcode trio
  is the regenerated doc's new top-ranked set.
- **Notes:** no PAPERCUT. Commits landed one per green rung: genderRatio
  extraction, opcode registration + kernel `personality` field, EFFECT_
  ATTRACT tests + the two barrier widenings, EFFECT_SWAGGER/FLATTER tests,
  census regen.

---
