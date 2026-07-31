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

## 795 — [WORKER 2026-07-31 ~15:40] Turns 11-12 flipped OFF (M11); rank-5 execution's four move windows now ALL flipped

- **State:** master green — tsc clean, focused vitest (battleScene 247/
  battleMenu 121/turn11FeatherDancePresentationStaging 10) green,
  ratchet 6/6, full `npm test` **567 files / 5719 passed + 1 skipped**
  (5735 − 16 deleted AERIAL_ACE-helper tests = 5719, exact), build
  clean. Full derivation for every constant in the commit message.
- **M11 (verified, `59a3fa7d`):** turn11-featherdance-off **189/191**
  (2 pre-existing idle-bounce-phase frames at 13340-13341, attributed:
  sub-pixel Onix-sprite/healthbox edge offset, no new content, code
  for this window untouched this slice); turn11-rockslide-off
  **256/256**; turn12-aerialace-off **246/247** (same idle-bounce-phase
  signature recurs at frame 14374, same attribution); turn12-rockslide
  -miss-off **256/256**. Turn-9/10 OFF pins + all 5 insurance pins held
  exact. **turn9-menu 111/111 and turn12-menu 46/46 BOTH held
  unaffected** — unlike turn11-menu's own slice-2 collateral, no
  analogous regression hit turn12-menu here. Retired legacy ON pins
  turn11-{featherdance,rockslide}.json, turn12-{aerialace,rockslide
  -miss}.json, turn11-menu.json (45/56, slice-2 collateral, authorized).
  Class-(c) AERIAL_ACE helpers shared with turn 10 (lunge/clones/slice/
  Onix-shake/palette-darken + their own sub-helpers/constants) died
  with turn 12 as last consumer — `drawTurn10AerialAceCloneWinsOverField`/
  `cuttingSliceFrameTileset` survive (2nd caller in the generic Scene-ON
  `renderSceneOnMovePresentation` adapter). The ROCK_SLIDE rock-prop
  loop (`rockSlideRockState`/`drawRockSprite`/`rockSlideBg3Y`/
  `rockSlideMonShakeY2`) does **NOT** die despite losing turn 11 —
  turns 1-8's own still-ON windows + that same adapter keep it alive
  (correcting the brief's own anticipation, verified via grep). Turn 11
  FEATHER_DANCE needed no code changes: zero class-(c) content
  pre-slice (Onix's floored ATK stat short-circuits the animation
  step).
- **Rank-5 status:** all four move windows (turns 9/10/11/12) now
  Scene-OFF-owned. Remaining: the idle-bounce PHASE misalignment
  residual class (turn9-quickattack-off's 56 frames, turn11-
  featherdance-off's 2, turn12-aerialace-off's 1; blocks turn9/11/12
  -menu's own OFF pins) — parallel side-worker territory, untouched
  here.
- **Next:** idle-bounce phase attribution probe (may unlock turn9/12
  -menu OFF pins); then #56 444/536, turn17-rung1's 28 frames, rank 6.
- **PAPERCUT:** none — every new OFF-fit constant this slice decomposed
  cleanly from the already-established fixed −107 hit-reaction-chain
  shift (turns 9/10) plus each window's own compression, confirming
  first-try or near-first-try; no blind bisection needed.

---
## 794 — [SUPERVISOR round 2, 2026-07-31 ~14:50] Turn-10 flipped OFF at EXACT acceptance (M10); animation-handoff five-table extraction landed (S10)

- **State:** master green on the M10+S10 union (full gate in commit
  message); rank-5 execution now 2 of 4 turn windows done. DEFERRED.md
  empty; only `.worktrees/animation-main` remains.
- **M10 (verified, `329f8320`):** turn-10 OFF flip — supervisor re-ran
  all four: turn10-aerialace-off **206/206**, turn10-rockslide-off
  **255/255**, -b **131/131**, turn10-menu-off **83/83**. Turn-9 +
  insurance pins all held. Legacy ON pins turn10-{aerialace,rockslide,
  menu}.json retired. (b)/(c) ambiguity on turn10AerialAceOnixShakeY2
  resolved class-(c) by fresh RAM probe. Class-(c) bodies KEPT alive
  where turn-12's still-ON window reuses them — they die with their
  last consumer in slice 3. **Known-cost regression:**
  turn11-menu.json (legacy ON) 56/56 → **45/56** (frames 13296-13351)
  — bisection-proven inherent (that window renders via turn-10's
  now-OFF-fit dispatcher; OFF menu-settle anchor is ~126 ticks
  earlier); retirement in slice 3 authorized under the adopted policy.
  turn9-menu 111/111 and turn12-menu 46/46 unaffected.
- **S10 (verified, merged):** `6d568f0d` — the five send-out anim
  selector tables extracted to
  `src/data/gen/send-out-anim-selector-tables.json` (front 386, delay
  55 w/ 52-in-pool matching the program doc, backSet 386, natureMod 25,
  backIds 25×3) + extractor + 16-test literal pins; supervisor
  spot-checked entries against pokemon.c/pokemon_animation.c incl. the
  [SPECIES_x - 1] indexing. Animation rung 2 is UNBLOCKED.
  **For the animation program:** ANIMATION_COVERAGE.json still cites
  the now-retired turn10-aerialace.json (stale citation, your ledger —
  main lane deliberately did not touch it).
- **Next:** M11 turns 11-12 flip (+ turn11-menu retirement); S11
  idle-bounce phase attribution probe (briefs ready). Then #56
  444/536, turn17-rung1's 28 frames.

---
## 793 — [SUPERVISOR round 1, evening session 2026-07-31 ~14:30] Rank-5 execution OPEN: turn-9 flipped OFF (M9), ALL nine move/result OFF windows banked (S9)

- **State:** master green on the M9+S9 union (full gate re-run by
  supervisor — see commit); `battleScene.ts` turn-9 class-(c) bodies
  deleted, class-(b) re-timed OFF; 8 new OFF traces banked. Only
  `.worktrees/animation-main` remains; DEFERRED.md empty.
- **M9 (verified, `8802fcb6`):** turn-9 OFF flip per adopted Option A.
  turn9-rockslide-off **256/256**, turn9-quickattack-b-off **231/231**
  (supervisor re-ran both); turn9-quickattack-off **177/233** — all 56
  misses in ticks 10818-10873 PRE-move idle-bounce, supervisor-verified
  from the manifest and git-stash-proven pre-existing (not a slice
  regression). Legacy ON pins turn9-{quickattack,quickattack-b,rockslide}
  .json retired + clone-mask test + 3 stale scratch drivers deleted;
  test delta 5736→5719 fully accounted (33 ON-era turn-9 fixtures out,
  16 OFF pins in). Insurance pins all held (256/242/256/715/128).
  turn9-menu.json still 111/111.
- **S9 (verified, merged `9544776b`):** all NINE rank-5 move/result OFF
  windows now banked (turn10-rockslide split a/b 255+131,
  turn11-featherdance 191, turn11-rockslide 256, turn12-aerialace 247,
  turn12-rockslide-miss 256), turn10-aerialace settle extended (206),
  turn10-menu-off banked (83). Zero desync anywhere; determinism 0/255.
  Supervisor re-ran turn11-featherdance-off in-worktree: 189/191 as
  reported. Turn-12 miss case shows compression tracks stripped
  animation content, not elapsed ticks (~19-29 vs 112-138 ticks).
- **NEW named residual class (two independent hits this round):**
  pre-move/menu **idle-bounce phase misalignment** inherited from
  upstream turns 1-8 — owns turn9-quickattack-off's 56 frames and
  blocked S9 from pinning turn9/11/12-menu OFF traces (concrete
  tick/sha data + hypothesis in `docs/rank5-off-ground-truth.md`).
  Needs its own attribution probe before rank-5 can close fully.
- **Next:** (a) M10 turn-10 OFF flip (brief ready); (b) S10 five-table
  animation-handoff extraction (brief ready); then turns 11-12 flip,
  idle-bounce phase probe, #56 444/536, turn17-rung1's 28 frames.

---
