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

## 797 — [bounded worker, 2026-07-31 ~17:15] turn17-rung1's 28-frame residual FIXED — 90/118 → 112/118; remaining 6 frames re-attributed to the already-tracked idle-bounce phase family

- **State:** master green — tsc clean, focused vitest (fightSubmenu 57/
  battleScene 247/battleMenu 121/factoryBattleStartIntro 5) green,
  ratchet 6/6 (no new barrier), full `npm test` **567 files / 5721
  passed + 1 skipped** (+1 over 796's baseline, the new gap-window
  pin), build clean.
- **Root cause was NOT where `docs/turn17-rung1-residual-notes.md`
  said.** That doc named `drawTurn16FightSubmenuWindow`'s
  `terminalResolution !== null` branch. Live-instrumented the actual
  render call (`console.error` in the function, removed before commit)
  and found `state.terminalResolution` is genuinely `null` throughout
  frames 21774-21801 for this trace — `core.ts`'s own terminal-creation
  guard (`priorFightConfirmElapsed === null && fightSubmenu.confirmElapsed
  !== null`) only fires on turn 17's own confirm tick (~21801-21802),
  not before. The real fallback is the *other* half of the function
  (the `terminalResolution === null` path, `drawTurn16PostSwitchField`
  call ~line 16718 and the bare `drawFightSubmenuChrome(fb,
  sm.displayCursor, false, false, sm.activeMonMoveset)` call at its
  tail) — the same shared function handles both turn 16's own
  pre-confirm dwell (correctly full HP/no status/PP untouched) *and*
  turn 17's reopened-but-unconfirmed dwell (needs the settled
  post-turn-16 values), with no prior signal distinguishing the two.
- **Fix:** `sm.menuRedrawElapsed !== null` is the only available
  signal that a given `FightSubmenuState` is turn 17's reopen specifically
  (`core.ts` only threads a real `menuRedrawElapsed` on that one
  `openFightSubmenu` call, line ~1427) — `isTurn17Reopen`/
  `settledPreConfirm` derived from it. Threaded through: (1) both
  `drawTurn16PostSwitchField` call sites in the `terminalResolution
  === null` half (the `t < revealTick` early return AND the main body)
  now pass MAGBY's settled HP (79) and MURKROW's settled status
  (`{hp: 58, status: "burn"}`) when `settledPreConfirm`, via a new
  `settledPlayerHp` param plus relaxing the `explicitOpponent` draw
  guard to not require `faintAttackAge !== null`; (2) the tail
  `drawFightSubmenuChrome` call now passes `isTurn17Reopen` as
  `turn16Resolved` (was hardcoded `false`) — `currentPPForActiveMon`'s
  existing `moveIds[0] === 7 && turn16Resolved` special case then
  correctly reconstructs FIRE PUNCH's PP as 14/15 instead of 15/15;
  turn1Resolved..turn14Resolved were left `false` (verified inert for
  MAGBY's moveset — the species check short-circuits before they're
  read — and threading them would need a wider signature change this
  step didn't need). `drawTurn16PostSwitchField`'s three OTHER call
  sites (the `terminalResolution !== null` half) are untouched — that
  branch is real but not exercised by this trace's mismatch window.
- **Numbers:** turn17-rung1 **90/118 → 112/118**. rung2-6b held exact
  (221/143/200/113/255/41); rung7a **255/255**, rung8b **118/118**;
  turn13-switchin **242/242**, turn5-rockslide **256/256**, turn8-bind-a
  **256/256**, interactive-generated-intro-off **715/715**,
  battle-command-generated-off **128/128** — all re-run fresh this
  session, no regressions.
- **Remaining 6 frames (21783-85, 21792-94) are NOT this mechanism.**
  Their bbox (`127,74-229,110`) exactly matches
  `docs/idle-bounce-phase-attribution.md`'s own documented idle-bounce
  healthbox signature (quoted verbatim in this doc's own family-
  exclusion section) — a box-open-transition bounce-phase misalignment,
  not a wrong-content defect. Per this step's OUT-OF-SCOPE list (the
  idle-bounce family closes with ranks 6-8), stopped here rather than
  chasing it; 118/118 is not reachable from this step's assigned
  mechanism alone.
- **Tier-1 pin (`tests/fightSubmenu.test.ts`):** new test replays
  `turn17-rung1.json` through `core.ts`'s real `tick()`/`render()` to
  frame 21786 (mid-gap, `confirmElapsed` still null), then asserts 3
  oracle-matched pixels (MURKROW's BRN badge color, MAGBY's HP-bar-
  stops-at-79 boundary, the PP-digit-reads-14 background) — ablation-
  verified: fails (`[255,255,222]` vs expected `[231,115,82]`) with
  only the test present and the src fix reverted.
- **Next:** the idle-bounce phase family (ranks 6-8, side-lane per
  standing arrangement) is the only thing left blocking turn17-rung1's
  final 6 frames. Otherwise: #56 item 2 remainder (MAGNETON-side RAM
  probe for frame 444's real discriminator + its materialize-column-
  shift defect), rank 6.
- **PAPERCUT:** the residual-notes doc's named branch was wrong (right
  general shape — hardcoded-false fallback during the reopen gap —
  wrong function half); ~20min lost re-deriving the actual call site
  via live instrumentation before finding it. Worth a note for anyone
  writing root-cause docs from pixel+segment evidence alone without a
  live state dump: confirm the branch predicate's actual runtime value,
  don't infer it from naming/comments.

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
- **SUPERVISOR ADDENDUM (round-4 verify + S12):** supervisor re-ran
  YOSHI **700/751**, MAGNETON **703/751**, intro **715/715** — all as
  reported; ISSUES #56 updated (536 clause resolved/deleted, 444
  remainder sharpened to the discriminator probe). **S12 (verified,
  merged): turn17-rung1's 28 frames ROOT-CAUSED** —
  `docs/turn17-rung1-residual-notes.md`: one contiguous input-bounded
  cluster (21774-21801, supervisor re-ran 90/118 + confirmed
  contiguity from the manifest) caused by
  `drawTurn16FightSubmenuWindow`'s `confirmElapsed === null` fallback
  hardcoding `turn1..14Resolved=false` (wrong PP 15/15 vs 14/15) and
  gating off `drawTurn16PostSwitchField`'s HP/status overrides (wrong
  HP 138/138 vs 79/138, garbled BRN badge); rung2-6b re-verified all
  exact (221/143/200/113/255/41). Named fix = thread real state
  through both call sites; dispatched as round-5 M13. S12's step 1
  (appRoute) was a no-op — `712ab295` had already fixed it
  pre-session; supervisor's brief cited the stale entry-790 note.
- **Round 5 (launched ~17:00):** M13 turn17-rung1 fix; S13 rank-6
  turns 1-4 OFF ground-truth prep scout (policy deliberately NOT
  presupposed — banks evidence for next session's rank-6 opener, same
  two-step as rank 5's own S8/S9 prep).

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
