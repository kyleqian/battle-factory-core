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

## 798 — [bounded worker, 2026-07-31 ~17:50] ISSUES #59 FIXED: generated-route opponent stat-drop crash — presentation-seam gap, not kernel

- **State:** master green — tsc clean, focused vitest (battleResolutionPresentation
  17, battleScene 247, battleMenu 121, battleCommandGeneratedOffEvidence 2,
  factoryRoundBattleOrchestrator 30, fightSubmenu 57, factoryBattleStartIntro 5)
  green, ratchet 6/6 (unchanged — presentation-only fix, no kernel barrier
  moved), full `npm test` **567 files / 5722 passed + 1 skipped** (+1 over
  797's baseline), build clean.
- **Root cause was presentation, not kernel.** EFFECT_ATTACK_DOWN_2's real
  script (`BattleScript_EffectAttackDown2` -> `EffectStatDown`) only calls
  `statbuffchange`/`playanimation(B_ANIM_STATS_CHANGE)`/`jumpifstatus2
  (STATUS2_SUBSTITUTE)` — all already registered generically (confirmed by
  source read + existing TAIL_WHIP/Swords Dance kernel tests; no kernel gap,
  no new kernel test needed). The real halt: `renderBattleResolutionSceneOffView`
  (`battleScene.ts`) — the generated route's actual production render path
  (`core.ts` `renderWithoutFactoryTerminal` -> `battleResolutionPresentation`
  -> `drawScene`) — hard-asserted its `"stat"` effect branch to exactly
  `battler===0 && stat==="accuracy" && decreasing` (the turn13 SAND_ATTACK
  precedent only), throwing `Scene OFF typed stat adapter cannot draw battler
  ${b} ${stat} ${from}->${to}` for every other stat. Any opponent-inflicted
  non-accuracy stat drop on the player's battler (FEATHER_DANCE's ATK, or any
  other stat-down move) crashed there — the generated route never runs the
  turn-keyed canonical staging modules (`turn6/78/11FeatherDancePresentation
  Staging.ts`) that only cover the fixed canonical battle.
- **Reproduced first (STEP 1):** a hand-authored `{battler:0, stat:"attack",
  from:6, to:4}` stat-stage-change event (FEATHER_DANCE's real ATK-2 shape)
  fed through the real `projectBattleResolutionCommands` ->
  `createBattleResolutionPresentationRenderView` -> `renderBattleResolutionSceneOffView`
  pipeline threw exactly `Scene OFF typed stat adapter cannot draw battler 0
  attack 6->4` pre-fix — confirmed by running the assertion before touching
  source.
- **Fix:** generalized the guard to `battler !== 0 || not-decreasing` (a rise,
  or a drop on the OPPONENT's own battler, still barriers — deliberately out
  of scope); replaced the hardcoded-Onix-sprite `drawTurn13SandAttackAccBanner`
  draw with the already-generic `drawStatDecreaseBannerForBattlerPalette`
  primitive (same one turn6/turn13/Shuckle callers already use), parameterized
  by the real battler's own live field-art sprite tileset + corner
  (`view.fieldArt.player.pic.tileset`/`.origin`, per-species already) and a
  new `statAnimBannerDecreasePalette(stat)` lookup into the already-extracted
  7-palette `stat-anim-banner.json` asset. No turn-keyed or species-keyed
  branch added.
- **Family coverage:** covers every stat a legal opponent stat-down move can
  name landing on the player's battler, not a FEATHER_DANCE special case —
  Tier-1 pinned in `tests/battleResolutionPresentation.test.ts` with both ATK
  (FEATHER_DANCE's real shape) and SPECIAL_DEFENSE (proving the family), plus
  regression coverage that a rise and an opponent-target drop still barrier.
- **Canaries** (re-run fresh): battleScene.test.ts 247/247,
  battleCommandGeneratedOffEvidence.test.ts 2/2, factoryRoundBattleOrchestrator.test.ts
  30/30 — all green, no regressions.
- **Next:** supervisor picks the next step; #56 frame-444 MAGNETON regression
  and the idle-bounce phase family remain open per their own entries.
- **SUPERVISOR WIND-DOWN (session close 2026-07-31 ~18:00; this
  addendum supersedes all of today's evening entries as the resume
  point):**
  - **Session totals: 6 rounds (5 paired + 1 bonus) / 11 workers
    (M9-M14, S9-S13) / 0 failed steps.** Final gate run by supervisor
    on this tree: **5722 passed + 1 deliberate skip / 567 files**,
    build clean, ratchet 6/6, tree clean at this commit. DEFERRED.md
    empty ALL session. Animation fold delta **0** at orient AND at
    wind-down (animation-main still at `555bab3f`); only the permanent
    `.worktrees/animation-main` remains; no orphan branches.
  - **Headline: #39 rank-5 EXECUTED same-day** (user's Option A,
    adopted this morning): turns 9-12 all Scene-OFF-owned (`8802fcb6`,
    `329f8320`, `59a3fa7d`), 8 OFF windows EXACT, 11 legacy ON pins
    retired, residuals all ONE root-caused mechanism (idle-bounce
    phase; verdict (b) — closes with ranks 6-8 OFF re-timing;
    `TURN8_MENU_REDRAW_DELAY` real OFF ≈434 banked; S13 measured the
    same overcount at turns 1-4: 429/285/525/427 vs ON-fit
    664/391/669/661).
  - **Also landed:** #56 frame 536 FIXED (YOSHI 700/751; 444
    regression-blocked w/ MAGNETON-probe lead banked); turn17-rung1
    90/118 → **112/118** (last 6 frames = phase family; S12's doc
    corrected in place); five-table animation handoff EXTRACTED
    (animation rung 2 unblocked); rank-6 turns 1-4 OFF ground truth
    banked (10 traces, zero desync); **#59 user-reported FEATHER_DANCE
    crash FIXED same-day** (entry deleted per lifecycle; generic
    opponent-side stat-drop family, presentation-side).
  - **User reports this session (both addressed):** missing send-out
    ball animation = the known send-out intro program (rung 1 landed
    today; animation lane's top priority, and note Scene OFF does NOT
    suppress send-outs in the real game — OFF windows need it too);
    FEATHER_DANCE crash = fixed above.
  - **Next session (ordered):** (i) **rank-6 pin policy question for
    the user** (same shape as rank-5's: adopt Scene-OFF pins for turns
    1-4 and retire their ON pins as rank 6 executes? Turns 1-4 are the
    app's most deeply ON-fit region and their ON pins all pass today;
    the S13 doc + 10 banked OFF traces make execution turnkey on
    adoption) — then rank-6 execution, which ALSO closes the phase
    family's turn-1-4 share; (ii) #56 frame-444 MAGNETON-side
    `gSprites[6]` RAM probe → real discriminator → land the fix behind
    the 751-frame regression; (iii) turn9/11/12-menu OFF pins once
    phase closes (S9 landmark data banked); (iv) #56 +6 route term;
    (v) rank 7 (FLY) / rank 8 (burn projection) inventory rows. #55
    parked. No DEFERRED entries — the rank-6 policy question is a
    start-of-work decision, not a blocker (rank-5 precedent).

---
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
