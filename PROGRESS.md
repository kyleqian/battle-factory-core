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

## 801 — [bounded worker, 2026-07-31 ~19:35] ISSUES #39 rank-6 slice 2 (turn 2) NOT landed — investigated and reverted, findings banked

- **State:** master unchanged from `01eac159` (slice 1) — tree is clean,
  tsc/build clean, focused vitest (battleScene 247/battleMenu
  121/factoryBattleStartIntro 5/fightSubmenu 57/executableFrontierRatchet 6)
  436/436 passed. No commit this session (nothing reached green).
- **Did:** attempted rank-6 slice 2 (turn 2, ENDEAVOR+DRAGON_BREATH) per
  the same brief-ordered plan as slice 1. Deep RAM/pixel investigation
  against the already-banked `turn2-endeavor-off.json`/
  `turn2-dragonbreath-off.json` fixtures found real, verified facts —
  including a genuine cross-turn bug (`turn2SubmenuBounceTick`/
  `turn2KickoffBounceTick` in `battleMenu.ts` still default to
  `ROCK_SLIDE_MENU_REDRAW_DELAY`=664, not slice 1's OFF value 429, which
  desyncs turn 2's whole idle-bounce phase) and confirmation that
  `drawEndeavorSquish`'s entire body is class (c) but shared with
  turn 3 (in scope) and turn 5 (out of scope) — plus four of roughly
  seven needed OFF constants pixel/RAM-pinned. Full detail (exact ticks,
  exact delay values, what's still missing) is in **ISSUES #39**'s own
  slice-2 paragraph, not re-narrated here. Ran out of session time before
  reaching turn 2's own 256/256 + 237/237 acceptance, so **reverted all
  `src/` edits** (`git checkout`) rather than commit a half-flipped turn —
  per the brief's own hard rule, a half-flipped turn is not a success.
- **Next:** re-attempt rank-6 slice 2 starting from ISSUES #39's slice-2
  paragraph (don't re-derive the bounce-phase bug or the constants already
  found) — write a combined RAM probe (`tools/probe/dump-turn1-rockslide-off.py`'s
  own shape, retargeted at turn 2's battler 1 healthbar/sprite state and
  the message-box text pointer across `turn2-dragonbreath-off.json`'s
  3149-3385 window) rather than pixel-cropping blind, which is what ate
  this session's time budget. Turns 3 and 4 (rank-6 slices 3/4) remain
  fully unstarted, still next in order after turn 2 lands.
- **PAPERCUT:** pixel-crop bisection against raw oracle PNGs (no RAM
  read) is slow and error-prone for finding exact per-tick delay
  constants (mis-cropped a healthbox region twice this session, costing
  real time) — a small reusable "combined RAM dump for a given trace's
  battler/text/BG state across a tick range" probe helper (generalizing
  `dump-turn1-rockslide-off.py`) would pay for itself across every
  remaining rank-6/7/8 slice, ~20-30 min lost this session alone.

## 800 — [bounded worker, 2026-07-31 ~19:05] ISSUES #39 rank-6 slice 1 EXECUTED: turn 1 flipped to Scene-OFF-owned presentation

- **State:** master green — tsc clean, build clean, focused vitest
  (battleScene 247/battleMenu 121/factoryBattleStartIntro 5/fightSubmenu
  57/executableFrontierRatchet 6) 436/436 passed, no new ratchet barrier.
  One commit pending (this session's own).
- **Did:** per the ADOPTED rank-6 policy (PROGRESS 799 addendum) and the
  rank-5 slice-1 recipe, flipped turn 1's whole DOUBLE_TEAM/ROCK_SLIDE
  window (menu 1884 → settle ~2348) to Scene-OFF-owned. Deleted class-(c)
  bodies from turn 1's own render path: DOUBLE_TEAM's clone-blend
  (`drawDoubleTeamClones` call site removed) and ROCK_SLIDE's camera
  shake/target shake/rock-prop loop (`rockSlideBg3Y`/`rockSlideMonShakeY2`/
  `rockSlideRockState`/`rockSlideDrawOrder` calls dropped from
  `drawRockSlideAttack`) — both RAM-confirmed flat/absent the whole window
  (new probe `tools/probe/dump-turn1-rockslide-off.py`, `gBattle_BG3_Y`
  and Grovyle's own `x2`/`y2` pinned 0 throughout). Re-timed the surviving
  class-(b) choreography (stat-change banner, generic hit-flash pair,
  HP-drain, text) against 8 new RAM-exact constants
  (`TURN1_OFF_STATS_BANNER_*`/`TURN1_OFF_ROCKSLIDE_*`,
  `battleScene.ts`) — `ROCK_SLIDE_MENU_REDRAW_DELAY` real OFF value
  pinned at exactly **429**, matching `docs/rank6-off-ground-truth.md`
  §5's own ~429 estimate. `statsBannerEva`/`statsBannerBg1Y`/
  `statRoseTextStartTick`/`statRoseTextVisibleChars`/
  `rockSlideTextStartTick`/`rockSlideTextVisibleChars`/
  `rockSlideResettledBounceTick` (`battleMenu.ts`) gained optional
  override params defaulting to their existing ON-fit constants — turn 4's
  own still-ON DOUBLE_TEAM call site (`drawStatsBanner`/
  `drawDoubleTeamClones`, S7 slice I) is byte-for-byte unaffected. Two
  small RAM-vs-PNG capture-lag corrections found by iterating against the
  dense oracle captures (bg1Y anchor +1, hit-flash anchor +1 — same
  "PNG(t)=RAM(t-1)" convention this program's BG-scroll-register findings
  already establish) and one text-clear tick corrected from the coarser
  v3 whole-frame-sha table (2345) to a fresh sha crop of the opponent-
  healthbox-name-plate bbox (2341) — restores the same 7-tick clear-to-
  redraw gap turn6/turn7's own ROCK_SLIDE pairs already establish.
- **Acceptance (fresh, this session):** `turn1-kickoff-off.json`
  **81/81**, `turn1-cloneanim-off.json` **230/230**, `turn1-rockslide-off.json`
  **256/256**, `turn1-drain-off.json` **102/102** — all EXACT. Retired the
  four legacy ON turn-1 pins (`git rm turn1-{kickoff,cloneanim,rockslide,
  drain}.json`); no turn-1-only scratch diagnostics existed to retire
  (`dump-doubleteam-sprites.py`/`dump-rockslide-sprites.py` remain live,
  still used by turns 3-7's own still-ON rock-slide/clone work).
- **Boundary insurance — surprise finding, NOT a regression:** the
  brief's named turn-2 pins were expected 100% green today.
  `turn2-endeavor.json` actually **throws** (`Scene OFF typed stat
  adapter cannot draw battler 1 evasion 7->8`) and `turn2-dragonbreath.json`
  is **0/237** — but `git stash` against this session's own changes
  reproduces byte-identical failures on unmodified master (`f0621d47`),
  proving both are pre-existing and unrelated to turn 1's own dispatcher
  (they route through the GENERATED-route presentation adapter, not
  `renderBattleScene`). New entry **ISSUES #60** files this honestly
  rather than silently absorbing it into this slice's own report. Per the
  hard-stop rule this only applies to a genuine regression — confirmed
  this isn't one, so slice 1 proceeded to its own green commit.
- **Next:** rank-6 slice 2 (turn 2) is next in the same shape; #56 item 2
  and #56 +6 universality remain open per PROGRESS 799's own next-list;
  #60 (new, this session) is a leftover lead for whoever next touches the
  generated-route stat adapter or wants turn2's own pins actually green.
- **PAPERCUT:** none beyond #60's own discovery (not dev-loop friction,
  a real pre-existing app bug — filed as an issue, not a papercut).

## 799 — [bounded worker, 2026-07-31 ~18:05] ISSUES #56 item 2: MAGNETON-side RAM probe run — discriminator NOT pinned clean, no fix landed (probe-only step)

- **State:** master green — tsc clean, focused vitest (factoryBattleStartIntro
  5/battleScene 247/battleMenu 121/ratchet 6) 379/379 passed, no `src/`
  changes so canaries untouched. One commit (docs/probe-script only).
- **Did:** generalized `tools/probe/dump-issue56-frames-444-536-oam.py` to
  also drive flat button-segment fixtures (not just `BattleLab` requests),
  then RAM-probed MAGNETON's own frame 437 and, to resolve the paradox,
  `interactive-generated-intro-off`'s own historically-fitted frame 1492
  (new `tools/probe/analyze-issue56-introoff-app-series.ts` for the app
  side). New fact: **MAGNETON's bar and icon widgets destroy on two
  different ticks (bar first); YOSHI and `interactive-generated-intro-off`
  both destroy them in sync** — `opponentSummaryExitElapsed`'s single shared
  `elapsed` clock structurally cannot make both pixel-exact simultaneously
  for MAGNETON. RAM also directly confirms abs-frame-1492 as intro-off's
  real destroy tick (matches the `git log -S 0c4dab29` citation exactly).
  But the exact `rawElapsed` value at that tick was NOT pinned (app-side
  pixel probe disagreed with a `handoffTick≈1462` estimate by ~5-7 frames,
  unresolved this step) — without it, can't confirm why intro-off wants the
  opposite special-case behavior from YOSHI despite an identical RAM shape.
  Full evidence table + ruled-out candidates (cry-duration linear/ordered,
  `isCanonicalAnchorIntro`) in `docs/issue56-frames-444-536-oam-probe.md`
  Round 3. Per this step's brief, **no fix landed** — a fix that only fits
  2 of 3 fixtures would trade one regression for another.
- **Next:** pin `interactive-generated-intro-off`'s real `handoffTick`
  directly (temporarily instrument `generatedBattleStartOpponentHandoffTick`
  read-only, or find another anchor) to compute `rawElapsed` at its
  RAM-confirmed abs-1492 destroy tick — the doc's own named next step.
  Frame 444 also still carries the separate, out-of-scope materialize-
  column-shift defect (`docs/issue56-residual-probe.md` Q1).
- **PAPERCUT:** none.
- **USER DECISION (in-session, ~18:50): rank-6 Scene-OFF pin policy
  ADOPTED** — same Option-A shape as rank 5: the 10 banked
  `battle-scene-off` traces (`docs/rank6-off-ground-truth.md`) become
  turns 1-4's acceptance pins; re-time class-(b)/delete class-(c) on
  the OFF route; retire the legacy ON turns 1-4 pins as rank 6
  executes. Execution is next session's opener (slice recipe =
  rank 5's, commits `8802fcb6`/`329f8320`/`59a3fa7d`). Scope note: the
  decision covers turns 1-4 (rank 6) only — turns 5-8's own ON pins
  (incl. insurance pins turn5-rockslide/turn8-bind-a) are NOT covered
  and need their own question when their re-timing comes up (the
  phase-family fix ultimately wants turns 1-8).
- **SUPERVISOR TRUE FINAL (bonus round 7 verified, ~18:30; this
  addendum + entry 798's wind-down are the joint resume point):**
  session ends at **7 rounds / 13 workers (M9-M15, S9-S14) / 0 failed
  steps**. M15 verified (probe-only per its brief's no-regression-trade
  rule; supervisor confirmed commit `11933483` docs/probe-only).
  **S14 (verified, merged): #56's +6 route term RAM-NAMED, verdict
  (a)** — species ready-lag formula confirmed exact at
  `PlayerBufferExecCompleted` (1738); the +6 = 3-tick CHOOSEACTION
  dispatch gap + 3-tick opponent-AI resolution (1744); constant stays;
  universality check on a staged fixture is the named fold-in
  gate (`docs/issue56-plus6-route-term.md`). ISSUES #56 items 1+2
  updated with both results. Final gate on THIS union in the commit
  message. Next-session ordered list: unchanged from entry 798's
  wind-down EXCEPT (ii) is now two named sub-steps (intro-off
  rawElapsed pin -> discriminator; +6 universality probe) and (iv) is
  DONE pending that universality fold-in decision.

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
