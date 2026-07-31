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
## 792 — [SUPERVISOR TRUE FINAL 2026-07-31 ~13:10] USER DECISION: rank-5 OFF-pin policy ADOPTED (Option A). S8 banked first OFF ground truth (4/13 windows, ZERO desync). Session: 9 rounds / 16 workers / 0 failed steps

- **State:** master tree clean at this commit; S8's 5 new files merged
  (4 `-off` traces + `docs/rank5-off-ground-truth.md`); supervisor
  re-ran turn9-quickattack-off from the main tree (108/233 — the
  expected honest pre-retiming baseline) + ratchet 6/6. Full gate not
  re-run for this docs+additive-traces-only delta: last full gate
  **5736 + 1 skip** green at `b6f0e2ab`, and S8 itself ran the full
  suite (5736+1) on effectively this union in its worktree. Worktree/
  branch cleaned; only `.worktrees/animation-main` remains; DEFERRED.md
  empty.
- **USER DECISION (mid-session, recorded `afaffc92`):** rank-5
  Scene-OFF pin policy ADOPTED — Option A: delete class-(c)
  move-specific bodies on the OFF route, re-time class-(b) generic
  choreography against fresh explicit-`oracleProfile` OFF pins,
  retiring the legacy profile-less (ON) turn9-12 pins as rank 5
  executes. Frame-444 landing tactics + next-session ordering delegated
  to supervisor judgment.
- **S8 (verified, `df42d281`):** OFF ground truth for the turn-9
  triplet + turn10-aerialace — canonical button stream replays under
  OFF with **ZERO desync** (content lands 2-114 ticks earlier,
  byte-matched to the scout's cited ON shas; determinism re-run
  0/233 mismatches). App baselines honestly recorded (108/233,
  141/231, 37/256, 19/116 — low until re-timing, not chased). The 9
  remaining windows are listed in the doc for the next slice.
- **Next session (final ordered list):** (i) rank-5 execution is now
  UNBLOCKED and opened — capture the 9 remaining OFF windows, then
  re-time class-(b)/delete class-(c) per the adopted policy;
  (ii) #56 frame-444 fix behind a 751-frame regression + frame-536
  probe extension; (iii) animation handoff five-table extraction (side
  lane); (iv) turn17-rung1's 28 newly-visible frames; (v) rank 6;
  (vi) #56 +6 route term. #55 parked.
- **Notes:** this entry supersedes 791 as the resume point. Session
  totals: 9 rounds / 16 workers (M1-M8, S1-S8) / 0 failed steps; #39
  ranks 3, 4, 9 retired; #57+#58 full lifecycle; rank-5 policy decided
  by user and its execution begun.

---
## 791 — [SUPERVISOR FINAL CLOSE 2026-07-31] Bonus round 8 verified: rank 9 ALSO retired. Session: 8 rounds / 15 workers / 0 failed steps; ranks 3, 4, 9 all fully retired today

- **State:** master green at the definitive FINAL gate **5736 tests
  passed + 1 deliberate animation-lane skip** (supersedes entry 789's
  5739 gate; −3 = M8's deleted turn17 self-tests, accounted), build
  clean, tree clean at this commit.
  Supervisor independently re-ran turn17-rung7a **255/255**, rung8b
  **118/118**, turn13-switchin **242/242** post-M8. `turn17.ts` deleted;
  animation fold delta 0 at this close (folded `555bab3f` earlier at
  `e36a17c6`). Only permanent `.worktrees/animation-main` remains; no
  orphan branches; **DEFERRED.md empty all session.**
- **Bonus round 8 (M8, verified):** rank 9 fully retired (`3f850e37`) —
  postwin fade + WIN-flip census now read `state.terminalResolution`;
  four legacy Turn-17 clock mirrors + dead `turn17.ts` deleted. M8
  caught mid-ladder that `turn17MenuRedrawElapsed` was NOT a pure
  mirror (redraw anchor during the pre-terminalResolution gap; naive
  deletion broke rung7a to 0/255 and the pins caught it) and rehomed it
  as `FightSubmenuState.menuRedrawElapsed`. Supervisor follow-up
  `712ab295` closed the LAST of the appRoute papercut class
  (turn17-rung1..6): rung2-6b exact (221/143/200/113/255/41);
  **rung1 90/118 is PRE-EXISTING** (identical against pre-M8 src via
  discrimination run), previously hidden behind the crash — its 28
  frames are un-characterized next-session work.
- **Ledger repair:** M8's edit displaced the STANDING ARRANGEMENT
  blockquote below its entry; supervisor restored it to the ledger top.
- **Next session (ordered; refines entry 789's list):** (i) rank-5
  OFF-pin policy adopt-or-reject (inventory row 5); (ii) #56 frame-444
  described fix behind a 751-frame regression + frame-536 probe
  extension; (iii) animation handoff: five anim tables into
  src/data/gen/ (side lane); (iv) characterize turn17-rung1's 28
  newly-visible frames; (v) rank 6 (turns 1-4) — the largest remaining
  #39 window family; (vi) #56 +6 route term. #55 stays parked.
- **Notes:** remaining #39 inventory: ranks 5 (policy-gated), 6, 7
  (two-turn owner), 8 (burn/end-turn projection) + the state-field
  chain (turnNResolved/PP reconstruction). This entry supersedes
  789/790 as the resume point.

---
## 790 — [BOUNDED MAIN WORKER 2026-07-31 ~13:05] #39 rank 9 (postwin owner handoff) FULLY retired: postwin fade + WIN-flip census moved onto `terminalResolution`, four legacy Turn-17 clock mirrors + dead `turn17.ts` deleted

- **State:** `npx tsc --noEmit` clean; focused suite (48 files touching
  `battleMenu.ts`/`battleScene.ts`/`core.ts` across two sweeps: turn17,
  postwin, battleScene, fightSubmenu, battleMenu, battleMenuIdle,
  battleSetup, executableFrontierRatchet — 527/527 — plus 40 more files
  incl. factoryRoundBattleOrchestrator, turn5/13ResolutionAdapter
  Equivalence, turn67/78/8 presentation staging — 475/475) **1002/1002
  green**, no new ratchet barriers, no new canonical-recording imports.
  Tree clean at this commit. Full `npm test`/`npm run build` intentionally
  not run per brief (supervisor runs the final gate).
- **Rung 1 (census, committed):** every reader of `turn17MenuRedrawElapsed`/
  `turn17KoDismissElapsed`/`turn17OutcomeDismissElapsed`/
  `turn17LossDismissElapsed` was `applyTurn17PostwinFastFade`
  (`battleScene.ts:15768-15862`, the postwin presenter) and
  `advanceBattleScene`'s WIN-flip census (`battleScene.ts:2676-2713`,
  reading the KO-dismiss mirror to compute the wholly-unread
  `battleOutcome` field) — both in the postwin-clock family, no consumer
  outside it. `turn17.ts` (`turn17DispatchState`/`Turn17DispatchState`,
  RNG crit/damage-roll modeling) was dead: zero production imports, only
  its own test file.
- **Rung 2 (handoff):** `applyTurn17PostwinFastFade` and
  `advanceBattleScene` now read `state.terminalResolution`'s
  `faintDismissElapsed`/`resultDismissElapsed`/`menuRedrawElapsed` — the
  exact typed object `drawTurn16FightSubmenuWindow` (the retired
  result/loss renderer) already consumes, per the brief's "no turn-number
  inspection" instruction. **Scope discovery:** `turn17MenuRedrawElapsed`
  was NOT a simple mirror — it is the sole holder of the turn-16-confirm
  +delay redraw anchor for the tick gap between the turn-16→17 menu
  reopen and turn 17's OWN confirmation (which is when `terminalResolution`
  first becomes constructible; confirmed empirically — naively seeding
  it from `terminalResolution?.menuRedrawElapsed` produced turn17-rung7a
  **0/255**). Fix: the anchor now travels on the fresh `FightSubmenuState`
  itself (`battleMenu.ts`'s `menuRedrawElapsed` field, threaded through
  the existing `openFightSubmenu` optional param and the state's own
  `...state` spread idiom every other submenu field already uses) instead
  of a floating `BattleSceneState` field — same pattern as
  `activeMonMoveset`'s own doc.
- **Rung 3 (deletion):** all four `BattleSceneState` fields (type decl,
  `INITIAL_BATTLE_SCENE_STATE` defaults, `advanceBattleScene`'s copy-through)
  and their three `core.ts` write sites plus the `turn17MenuRedrawElapsed`
  carry-variable are gone; `src/engine/turn17.ts` deleted along with its
  three self-tests in `tests/turn17.test.ts` (11 tests remain, was 14).
  Five other test files updated to read/construct `terminalResolution`
  (or the new `fightSubmenu.menuRedrawElapsed`) instead of the deleted
  fields: `battleScene.test.ts`, `fightSubmenu.test.ts`, `battleMenu.test.ts`,
  `postwin.test.ts`, `turn17.test.ts`.
- **All mandated pins hold exact (fresh baseline == post-change):**
  turn17-rung7a/b **255/147**, turn17-rung8a/b **255/118**; insurance
  turn5-rockslide **256/256**, turn13-switchin **242/242**, turn8-bind-a
  **256/256**, interactive-generated-intro-off **715/715**,
  battle-command-generated-off **128/128**.
- **Papercut discovered (not fixed, out of scope):** `turn17-rung1`
  through `turn17-rung6a/b.json` have no `appRoute` field and now crash
  (`STRINGID_PKMNSITEMRESTOREDHEALTH` placeholder) under `npm run compare`
  because the default flipped to `"generated-orchestrator"` — same
  papercut class entry 789 already fixed on 13 other traces, just missed
  on these six. Confirmed pre-existing (identical crash before any edit
  this session, unrelated code path — these fail before turn 16/17 logic
  ever runs) and unrelated to rank 9's fields; the one vitest test that
  replays `turn17-rung1.json`'s segments forces `appRoute:
  "canonical-recorded"` explicitly and is green. ~5 min lost diagnosing;
  PAPERCUT: turn17-rung1..rung6 traces need an explicit `appRoute` field
  (same class as entry 789's 13-trace fix), ~5min.
- **Inventory updated:** `docs/battle-scene-retirement-inventory.md` row 9
  marked RETIRED, row 8's stale `turn17.ts` citation removed, the
  "Postwin owner handoff" blocked-work bullet marked RESOLVED. ISSUES.md
  untouched per brief (supervisor's to update).
- **Next:** #39 rank 9 is fully closed — the only remaining inventory rows
  are 5 (Scene-OFF effect-visibility policy, PROPOSED not adopted), 6
  (turns 1-4), 7 (FLY two-turn lifecycle), and 8 (burn/end-turn event
  projection, now with a fixed stale citation). The appRoute papercut on
  turn17-rung1..6 is a same-class quick fix for a future session. #56's
  frames 444/536 and +6 route term remain parked per entry 789.

---
