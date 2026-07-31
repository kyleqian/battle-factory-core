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

## 796 — [bounded worker, 2026-07-31 ~16:40] ISSUES #56 item 2: frame 536 RESOLVED (Part B); frame 444 fix blocked by new MAGNETON regression (Part A, not landed)

- **State:** master green — tsc clean, focused vitest (factoryBattleStartIntro
  5/battleScene 247/battleMenu 121) green, ratchet 6/6, full `npm test`
  **567 files / 5720 passed + 1 skipped** (+1 over baseline, the new Part B
  pin), build clean. Two commits: `2bf68ac1` (Part A, docs-only) +
  `7467636e` (Part B, fix).
- **Part B (landed, `7467636e`):** extended the OAM RAM probe
  (`dump-issue56-frames-444-536-oam.py`, same script, wider range) past
  app-relative 542 — real onset for the player status-bar/icons pins
  exactly at app-relative **550**. Not a new species term: matches the
  ALREADY-EXISTING, already-4-species-proven `generatedPlayerVisualClock`
  rebasing exactly (frames 537+ in this same trace already use it,
  unmodified, and already matched oracle). Root cause was a call-site
  bug: `renderGeneratedBattleStartOpponentRelease`'s own pre-player-release
  `drawBallIcons` calls used the raw opponent-handoff clock instead of the
  same rebased clock the player-release compositor already uses.
  `drawBallIcons` gained an optional `playerClock` param (every other call
  site untouched); new exported `generatedPlayerVisualTAtOpponentHandoff`
  wraps the existing rebasing (no duplicated logic). **YOSHI 699/751 →
  700/751** (frame 536 flips, mismatch-list diff confirms nothing else
  moved); `interactive-generated-intro-off` 715/715, `battle-command
  -generated-off` 128/128, `factory-arbitrary-intro-magneton-off` 703/751
  all held exactly; `turn9-rockslide-off` 256/256 + `turn10-aerialace-off`
  206/206 insurance canaries held. Tier-1 pin added, ablation-verified
  (fails without the fix, passes with it).
- **Part A (investigated, NOT landed, `2bf68ac1`):** re-derived the
  `opponentSummaryExitElapsed` special case's original fitted window via
  `git log -S` (commit `0c4dab29`, frame 1492 of `interactive-generated
  -intro-off`). Removing it reproduces YOSHI's frame-444 targeted 4 pixels
  exactly (RAM-confirmed root cause from the prior round) but regresses
  that original window (715/715 → 714/715) exactly as the brief warned.
  Narrowing to `isCanonicalAnchorIntro` (the same discriminator
  `generatedPlayerReadyLag` already uses) restores 715/715 but surfaces a
  **new** regression: `factory-arbitrary-intro-magneton-off`'s own
  analogous frame 437 flips from pixel-exact to a 10px mismatch, in the
  OPPOSITE direction from YOSHI's own evidence — `isCanonicalAnchorIntro`
  is not the real discriminator. Reverted to the original unmodified
  special case; frame 444 also carries a second, separate, previously-
  flagged (`docs/issue56-residual-probe.md` Q1) materialize-column-shift
  defect never in scope of this fix. Full finding recorded in
  `docs/issue56-frames-444-536-oam-probe.md`'s Round 2 section.
- **Next:** #56 item 2 remainder — a MAGNETON-side RAM probe of
  `gSprites[6]` around its own frame 437 (mirroring this round's own
  YOSHI-side technique) to find frame 444's real discriminator, plus its
  separate materialize-column-shift defect. Then turn17-rung1's 28 frames,
  rank 6, idle-bounce phase attribution (parallel side-lane territory).
- **PAPERCUT:** none.

---
## 795 — [round 3, 2026-07-31 ~15:50, supervisor-verified] Turns 11-12 flipped OFF (M11) — rank-5's four move windows ALL flipped; idle-bounce phase ROOT-CAUSED, verdict (b) (S11)

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
- **SUPERVISOR ADDENDUM (round-3 verify + S11):** supervisor re-ran all
  four M11 compares (256/256, 256/256, 246/247, 189/191 — frame
  14374's diff signature byte-matches the known family bbox/px) and
  the full union gate after merging S11 (`03a7c408`). **S11 (verified,
  `34d2eda1`): idle-bounce phase ROOT-CAUSED, verdict (b)** — the
  oscillator (`menuIdleBounce`) is RAM-exact; the app seeds turn-9's
  bounce reset at t=10000 vs real RAM t=9859 (−141) because upstream
  `TURN8_MENU_REDRAW_DELAY` is still ON-fit (572; real OFF ≈434 —
  9859−9425 exactly). Per-turn constants family, not one shared value
  → closes as turns 1-8 get OFF re-timing under ranks 6-8; predicted
  constant banked in `docs/idle-bounce-phase-attribution.md`. NOT a
  rank-5 blocker: ISSUES #39 + inventory row 5 updated to FLIPPED with
  the residual named. Note: M11 wrote this ledger entry itself despite
  the brief reserving PROGRESS.md for the supervisor — content was
  accurate and is kept (retitled/amended); contract slip noted for the
  next brief's wording.
- **Next:** round 4 — M12 #56 frame-444 fix + frame-536 onset pin;
  S12 turn17-rung1 appRoute papercut fix + 28-frame characterization.
  Then wind-down candidates: #56 +6 route term probe, rank-6 prep
  scout.

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
