# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1296 — [supervisor, 2026-08-16] **B1c folded: entrance-03 162→242/256 (render clock, not OAM latch); #93 fix verified; side absolute-path trap recurred — papercut filed**

- **State:** B1c branch merged (worker `0efe8e15`); union checks green
  (smoke 375/375, orchestrator+soak pins 65/65, new B1c pin 15/15,
  build; entrance-03 re-confirmed **242/256** on the merged tree).
  Mechanism: `brainMoving`'s render clock ran ONE TICK AHEAD of
  `entryStep`'s shared table (RAM stays flat two ticks after the
  `brainMsgboxClosing→brainMoving` transition); the 1288 OAM/
  `gSpriteCoordOffsetY` latch hypothesis was RULED OUT by an extended
  RAM probe (`oam.y` equals its same-frame computed sum at every tick).
  Bounded residual: frames 319-320 (msgbox-close wipe artifact — same
  close-wipe lever as gold speech) + 368 (single-tick Noland walk-cycle
  frame-index boundary, same family as 1293's lead-leg fix). Bars
  unmoved: entrance-02 256/256, B2 speech 39/39·28/28·74/74·39/39,
  reveal 690/701. **#93 fix (1295) supervisor-verified:** seed 109
  clean, orchestrator suite 51/51, winning 100:120 was 20/20 in the
  worker's run.
- **Trap recurred with mechanism found:** the side worker's Edit/Write
  calls landed in the MAIN tree via absolute paths (worker perceived
  "edits silently don't reach disk" and fell back to shell writes; two
  stray main-tree files were superseded early drafts, diff-checked
  against the branch and discarded). New PAPERCUTS entry filed.
- **Next:** dispatching **(b) gold speech dense closure** (main lane —
  now carrying the B1c clock mechanism + the close-wipe and walk-cycle
  residual leads) and a **post-#93 winning 0:60 re-sweep + full-policy
  60:120 first sweep** (side lane). Remaining parked: callscene-02
  second page-turn + box-5 dismiss (1293), entrance-03 frames
  319-320/368.

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

