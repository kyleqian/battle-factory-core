# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1295 — [main worker, 2026-08-16] **ISSUES #93 fixed: forced-switch handoff no longer preempts a fainted battler's own trailing `Cmd_moveend` item-effect commands (Shell Bell etc.) — seed 109 clean, winning soak 100:120 20/20 OK**

- **State:** Landed and green. `npm test` **1,056 files / 9,980 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green. `npm run soak
  -- --policy winning --seed 109` completes clean (`b4 t24 146761f
  roundLost`, was a deterministic crash). `npm run soak -- --policy winning
  --seeds 100:120` **20/20 OK, 0 CRASH, 0 HANG**.
- **Did (root cause):** `factoryRoundBattleOrchestrator.ts`'s resolution
  advance had a hardcoded early intercept (`isForcedSwitchHandoffMessage`)
  that jumped straight to `forced-party-handoff` the instant a fainted
  battler's own typed message was dismissed — before any later commands in
  that same segment ever presented. Real source never does this: `tryfaintmon`
  prints the fainted message from `BattleScript_FaintTarget`
  (`data/battle_scripts_1.s:2817-2822`) *inside* the attacking move's own
  script, strictly before that script reaches `goto BattleScript_MoveEnd`
  and runs its `MOVEEND_KINGSROCK_SHELLBELL` item-effect case
  (`battle_script_commands.c:4210-4494`); the party-menu open
  (`BattleScript_HandleFaintedMon`) is a wholly separate later pass
  (`HandleFaintedMonActions`, `battle_util.c:1899-1946`) that only starts
  once the whole move script — including those `MOVEEND_*` effects — has
  returned to the turn loop. Seed 109 hits exactly this: Staryu's Bubblebeam
  faints the player's active (fainted message), then `Cmd_moveend`'s Shell
  Bell heals Staryu (message + `"hp"` command) in the *same* segment,
  *after* the fainted message. The premature handoff captured the forced-
  switch continuation's field boundary before that heal ever applied, so
  the continuation segment's own `field.opponent.hp` stayed at the stale
  pre-heal value; a later real event (here, Staryu's own end-of-turn burn
  tick, built fresh against the real un-stale kernel HP) then disagreed with
  that stale displayed value and threw the renderer's consistency guard
  (which is correct behavior — it caught a real desync and stays armed,
  unchanged). Fix: removed the early intercept; a still-pending
  `forcedRequest` now hands off only at the segment's own true end
  (`completedResolutionUpdate`, already used by ISSUES #89's no-message
  case), regardless of whether the fainted message happened to be last.
  Two other call sites that used the non-forced-aware `completedResolutionPhase`
  when a button message ended a segment were folded into the same
  `completedResolutionUpdate` path for consistency.
- **Pin:** `tests/factoryRoundBattleOrchestrator.test.ts`, direct
  construction (not soak-based) — a real Factory battle (`createFreshFactoryBattle`)
  with the player's active at 1 HP and the opponent a real Shell-Bell-holding
  Frontier rental (set 128, STARYU, `MOVE_BUBBLE_BEAM` slot 0, burned) that
  1-hit-KOs the player, matching seed 109's own mechanism exactly. Asserts
  (1) the fainted message's dismiss does NOT jump to `forced-party-handoff`
  while segment commands remain, (2) the handoff's own field boundary
  reflects the Shell Bell heal once it finally does trigger, (3) the
  appended continuation segment's field carries the post-heal HP forward,
  and (4) that segment's own burn-tick `"hp"` command's `from` matches it.
  Confirmed this pin fails pre-fix (`expected 7 to be 8`, i.e. the handoff
  fires one command early) by reverting just the orchestrator file and
  rerunning.
- **Downstream note:** this legitimately changes presentation frame
  timing (and, since the `winning`/`strong-route` soak policies read
  presentation state, occasionally which move a driven battle ends up
  taking) for any battle that hits a forced switch with trailing
  `Cmd_moveend` commands — those commands used to be silently skipped from
  presentation entirely. Updated the one Tier-1 pin this touched
  (`tests/randomRoundSoak.test.ts` seed 21 strong-route frame/turn/render
  counts) with the new genuine numbers; regenerated
  `docs/gate6-coverage-manifest.{json,md}` (byte-identity ratchet, picked up
  the new pin's own evidence rows, no coverage change). Change is scoped to
  `factoryRoundBattleOrchestrator.ts`'s resolution command-building path
  only — no shared presentation-render file touched, so no compare-window
  rerun is required per the step brief's own out clause.
- **Next:** side lane's (c) B1c entrance-03 latch probe is mid-edit in this
  shared tree (uncommitted `battleRoomRender.ts` / probe script changes
  observed, untouched — out of scope here) then (b) gold speech dense
  closure.
- **Notes:** No PAPERCUT.

---

## 1294 — [supervisor, 2026-08-16] **Side lane folded: winning-policy soak swept 0:120, seed-49 HANG closed by per-policy frame budget, seed-109 engine crash filed as #93**

- **State:** Both side branches merged (`96d51c3f`, `84170428`); union
  smoke 375/375 + soak pin 14/14 + build green. Sweep results: 0:60
  **59/60** (1 HANG), 60:100 **40/40**, 100:120 **19/20** (1 CRASH).
  The HANG (seed 49) was a budget artifact — completes `roundLost` at
  frame 693,051, supervisor-reverified — closed by
  `DEFAULT_MAX_FRAMES_BY_POLICY` (winning 1,000,000; full/vanilla stay
  600,000; `--max-frames` still overrides; Tier-1 pinned). That finding
  carried the number **#92, assigned + closed same-session** — no
  ISSUES.md entry ever existed; the pin test records it. The CRASH
  (seed 109) is a genuine deterministic engine bug — supervisor-
  reproduced — **filed as ISSUES #93** (battle-resolution HP-command
  desync, battle 2 turn 5; report:
  `docs/soak-winning-sweep-2026-08-16-part2.md`).
- **Next:** dispatching **#93 fix** (main lane) and **(c) B1c
  entrance-03 ~1px latch probe** (side lane); then (b) gold speech
  dense closure. Call-scene remainder after 1293: callscene-02's
  second page-turn + box-5 dismiss press (bounded in the ground-truth
  doc) — park unless evidence improves.

---

## 1293 — [main worker, 2026-08-16] **Both named call-scene residuals closed/advanced — attendant walk lead-leg pose fixed exact (callscene-01 119→131/131), boss-message page-turn render bug found + fixed (callscene-02 120→171/199)**

- **State:** Landed and green in two commits. `npm test` **1,056 files /
  9,978 passed / 223 skipped**, `npm run build` + `npm run typecheck`
  green.
- **Did (Goal 1, walk lead-leg pose — CLOSED exact):** `callSceneWalkFrame`
  assumed the walk-away (hFlip false) and walk-back (hFlip true) legs
  shared `sAnim_GoWest`/`GoEast`'s literal `ANIMCMD_FRAME(7,...)`-then-8
  order. Rendering both candidate leg-index orders against oracle pixel
  data (callscene-01 frames 447/429) showed the two legs actually diverge:
  walk-away is pixel-exact with 8-then-7, walk-back stays pixel-exact with
  the literal 7-then-8. Made the lead leg a per-direction parameter.
  callscene-01 dense compare **119/131 → 131/131** (was 89/131 pre-1292).
  Commit `7214005d`.
- **Did (Goal 2, page-turn press re-derivation — ADVANCED, not exact):**
  found the callscene-02 residual was not purely a fixture press-frame
  issue as 1292 concluded — a second, independent render bug:
  `CALL_SCENE_TEXT_FIRST_DELAYS[3]`/`[4]` (boxes 4/5's own first-glyph
  delay) used the generic 4-tick `POSTWIN_DIALOGUE_TEXT_FIRST_DELAY`
  instead of the same-window `\p` swap's real accept+1 rule (1292's own
  point 4), leaving the app blank 3 extra ticks after every page turn and
  skewing that whole page's typewriter schedule. Fixed by giving boxes
  3→4/4→5 their own 1-tick deferred bump (`CALL_SCENE_PAGE_TRANSITION_
  DELAY[2]`/`[3]`, reusing boxes 1/2's existing `callScenePendingElapsed`
  machinery) + firstDelay 0, oracle-confirmed via byte-identical capture
  hashes across local 805–813 (box 4 held) then a change at 814 (new
  content). Combined with re-deriving the box-3→4 press's own idle segment
  (`idle133`→`idle131`, -2 ticks, matching the canned route's oracle
  accept 1170) this closes the **entire** page-1→2 turn cluster to 0 diff.
  The page-2→3 turn (box 4→5) was tried the same way (segment -2) but only
  partially closed (improved, not exact) and over-shifting past it
  regressed further downstream; the box-5 dismiss press (page 3's own
  dismiss, a different accept path — `callSceneDismissElapsed`, not
  `acceptPostwinCallScenePage`) was tried and reverted after it cascaded
  into large new mismatches through the rest of the trace, so it was left
  at its original position. callscene-02 dense compare **120/199 →
  171/199** (net +51, no regression anywhere re-checked). Two residual
  clusters remain, bounded in the ground-truth doc: page-2→3 turn (local
  814, 816–866, shrunk but not zero) and box-5 dismiss/menu-handoff (local
  948–966, unchanged, pre-existing per 1289/1292). Commit pending (this
  entry's docs commit lands with the code).
- **Bars (all re-run live this session, unmoved):** askready-menu
  **21/21**, swapask-no **194/194**, entrance-02 **256/256**, record
  **178/178**, retire **174/174**, silver reveal (`...noland-reveal-off`)
  **690/701**, entrance-03 **162/256**, gold speech **58/256 · 20/177 ·
  58/126**. `executableFrontierRatchet` barrier counts unwidened; no new
  barrier.
- **Next:** page-2→3 turn + box-5 dismiss residuals are the honest
  remainder for a future step (both bounded above with exact frame
  ranges); box-5's own accept path likely needs its own separate
  derivation rather than reusing the -2 that worked for the other two
  presses. Otherwise the 1291 queue's (c)/(b) items stand.
- **Notes:** Commits local only. No PAPERCUT (tooling worked as
  documented; the `--capture-range` flag plus rendering isolated candidate
  frame-index variants directly was the key diagnostic move both times).

---


