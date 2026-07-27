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
## 522 — [BOUNDED WORKER 2026-07-27 ~16:00] `turn6-statfall.json` ATK-fell text re-driven from kernel events (§12.3 step 3 landed); banner gate (step 4) found to need disproportionate new surface

- **State:** tree green at **268 files / 3560 tests** (unchanged count —
  wires an already-tested staging-module export into production code, no
  new test file), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §12.3 steps 3/4
  (§12.6 completion note appended). Step 3: `battleScene.ts` gained
  `TURN6_ATKFELL_KICKOFF_LINE1/2` (module-load-resolved from
  `turn6FeatherDancePresentationStaging.ts`'s already-staged
  `resolveTurn6AtkFellLines()`, unblocked by entry 520's charmap fix);
  `drawTurn6FeatherDanceKickoffText`'s own `atkFellStart` branch (`:9151`)
  now draws these instead of the raw `TURN6_ATKFELL_LINE1/2` literals. Zero
  bridge edits — entry 514's `resolveFeatherDanceKickoffPresentationWindowContent`
  already returned everything needed. **No literal died**: `TURN6_ATKFELL_
  LINE1/2` stay defined and live at turns 7/8's own repeat call sites
  (`:9397`/`:9586`, verified unchanged). Step 4 (the stat-fall banner gate,
  `drawTurn6StatFallBanner`/`turn6StatFallEva`): investigated and found
  **not cleanly wireable** — `turn6StatFallEva`'s tick-window gate is real
  presentation-native animation timing (no kernel-event/timestamp
  equivalent, §8.4 Option A re-confirmed a 6th time), and
  `drawTurn6StatFallBanner`'s hardcoded ONIX/attack/decrease selection is
  already exactly consistent with the kernel's real `stat-stage-change`
  (no live branch to redirect). Driving it "for real" would force either
  editing turns 7/8's own out-of-scope call sites (the function is a shared
  helper) or building a 7-way stat-to-palette-key translation table for six
  stat values this window never produces (a real naming mismatch too:
  `battleScriptEvents.ts`'s hyphenated `special-attack`/`special-defense`
  vs. `StatAnimBannerAsset`'s camelCase `spAttack`/`spDefense`) — exactly
  the disproportionate-new-surface case the brief's own escape valve names.
  Landed step 3 alone, per the brief's own instruction that this finding is
  a success, not a failure.
- **Acceptance (live, this session):** full sweep run BEFORE the change (on
  pristine `HEAD`) matched every recorded count exactly, then AFTER
  reproduced them byte-identically: `turn6-statfall.json` 127/127 (twice,
  incl. a determinism check), `turn6-featherdance.json` 90/90,
  `turn6-rockslide-a.json` 255/255, `turn6-feathers.json` 235/235,
  `turn6-menu.json` 44/44, `turn1-rockslide.json` 256/256,
  `turn5-rockslide.json` 256/256, `turn4-doubleteam.json` 250/250,
  `turn2-endeavor.json` 77/77.
- **Next:** either `turn11-featherdance.json`'s own ATK-floor wiring (same
  glyph class, now unblocked, a later step per this brief's own out-of-scope
  note) or the Roar/multi-hit registration side scouted in round 2.
- **Notes:** no PAPERCUT. One commit for the wiring + docs.

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
