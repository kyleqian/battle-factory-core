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

## 789 — [SUPERVISOR FINAL WIND-DOWN 2026-07-31] Session CLOSED: 7 rounds / 14 workers / 0 failed steps. #39 ranks 3+4 FULLY retired; #57+#58 closed+deleted; #56 two probes resolved/sharpened; rank-5 policy PROPOSED

- **State:** master green at FINAL gate **5739 tests passed + 1
  deliberate animation-lane skip**, production build clean, tree clean
  at this commit. `animation-main` folded at wind-down (`e36a17c6`,
  one commit `555bab3f` — the orient-time delta was 0; the re-check
  caught it again). Only the permanent `.worktrees/animation-main`
  remains; no orphan branches. **DEFERRED.md empty all session.**
- **Session totals (2026-07-31 ~08:55 → ~11:40, 7 rounds, 14 workers
  M1-M7 + S1-S7, 0 failed steps; two honest stops both converted to
  landed work next round):**
  - **#39 rank 3 FULLY retired** (KO/switch-in `5db34996`, Sitrus
    `54278249`) and **rank 4 FULLY retired, all 5 slices**
    (`174cc388`, `441ddf83`+`6aba6662`, `0769ccc6`,
    `40c969e5`+`ef971686`). Every dense pin held at every rung.
  - **#57 closed+deleted** (`387a34a1` core + `14c4295b` retire) and
    **#58 found+filed+closed+deleted same-session** (`594442e6` core +
    `20b12d38` retire) — the shared staging helper now threads
    maxHP/item/statStages + entryLabel, all additive, all pinned.
  - **#56:** idle-bounce family closed no-app-bug (decisive instrument
    `432e16aa`: deltas +67/+139 unequal — falsified); frame 444
    resolved to exact sub-step with described fix (needs 751-frame
    regression); frame 536 model falsified sharper (RAM flat through
    542; species-lead term suspected). +6 route term untouched.
  - **Rank-5 unblocked by evidence** (`350424ed`): OFF gates only the
    move-anim script; committed turn9-12 pins are profile-less (=ON,
    never run vs this lane's oracle). Policy PROPOSED, NOT adopted.
  - Papercut class closed at breadth: appRoute added to 13 traces
    (`9929caf1` turn5, `e3a7f486` turn6/7/8, +3 in M6).
- **Next session (ordered):** (i) adopt-or-reject the rank-5 OFF-pin
  policy (inventory row 5 — it retires/replaces ON-profile pins; user
  or next supervisor decides at start); (ii) #56 frame-444 described
  fix behind a 751-frame regression + frame-536 probe extension;
  (iii) animation handoff: extract the five anim tables into
  `src/data/gen/` (side lane; ANIMATION_PROGRESS "For the main
  program" note — blocks animation rung 2); (iv) rank 6 (turns 1-4)
  or rank 9 postwin-mirror removal per inventory; (v) #56 +6 route
  term; #55 stays a parked boundary record.
- **Notes:** notification/monitor timestamps unreliable all session
  (spurious early "completed", clock-skewed monitor lines, one
  shared-log collision when two launchers started the same second) —
  policy that held: act only on fresh-shell `kill -0` + branch/log
  evidence. Sonnet side workers ran the full suite in their own
  worktrees despite briefs 3x (harmless, own node_modules; no action).
  This entry supersedes 788/787 as the resume point.
