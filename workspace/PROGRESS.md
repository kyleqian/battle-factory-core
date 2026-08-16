# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1298 — [main worker, 2026-08-16] **ISSUES #94 + #95 both fixed and closed — seeds 16/69/113 clean, winning 0:20 20/20, full 60:70 + 110:120 20/20**

- **State:** Landed and green. `npm test` **1,054+2 files / 9,982 passed /
  223 skipped** (the two failures in the first full run were the two
  expected downstream artifacts, both updated — see Notes), `npm run
  build` + `npm run typecheck` green. Soak: seed 16 (winning), 69 (full),
  113 (full) all complete **OK** (were deterministic crashes); seed 109
  (winning) still OK; `--policy winning --seeds 0:20` **20/20 OK**;
  `--policy full --seeds 60:70` **10/10 OK** and `110:120` **10/10 OK**.
  Orchestrator suite 53/53. No frontier-ratchet barrier moved.
- **#94 mechanism** (`FactoryRoundOrchestratorError: Slice N resolution
  completed without a player command boundary`):
  `appendBattleResolutionContinuation` hardcoded `forcedRequest: null` on
  the segment appended after a confirmed forced-switch replacement. Wrong
  whenever that same receipt also faints the replacement: source runs the
  attack's own faint through `HandleAction_TryFinish`'s
  `HandleFaintedMonActions` (so the replacement is sent in during the
  action phase), and only then does `BattleTurnPassed` run
  `DoBattlerEndTurnEffects` — the poison/burn tick can faint that very
  replacement, and `BattleTurnPassed` calls `HandleFaintedMonActions()`
  itself a second time (`battle_main.c:3956-3971`,
  `battle_util.c:1894-1970`). Two consecutive forced switches in one
  continuation receipt is ordinary source behavior. With the request
  dropped, the segment's end routed to `next-command-handoff`, whose
  player-command invariant then failed. Fix: derive `forcedRequest` from
  the appended receipt's own pending boundary (one shared
  `pendingPlayerForcedSwitchRequest` helper for all four readings).
- **#95 mechanism** (`battle resolution move/hit provenance is not
  ordered`): `nextHitAnimation` scanned past the end of the attack
  animation's own script execution. Source pairs `attackanimation` /
  `waitanimation` / `effectivenesssound` / `hitanimation BS_TARGET` as
  four consecutive instructions of `BattleScript_HitFromAtkAnimation`
  (`data/battle_scripts_1.s:253-258`; Scene OFF substitutes only the
  first). A non-damaging move (`BattleScript_MoveWeatherChange` — Hail,
  Rain Dance) has NO hit animation, so the scan claimed the end-of-turn
  `BattleScript_DamagingWeatherLoop` tick's hit instead. Fix: stop at the
  execution boundary — `instructionExecution` restarts per execution, so a
  drop in it *is* the boundary. Both throwing invariants stay armed and
  unweakened.
- **Pins (both direct construction, both proven to fail pre-fix by
  reverting only the fix):** #94 reuses 1295's staged Shell-Bell Factory
  battle with its first bench slot swapped to a 1-HP poisoned POOCHYENA
  (PUPITAR's Shed Skin cures the poison, SEALEO's Sitrus Berry heals past
  it — neither reproduces), and walks BOTH forced selections through to
  the next player command. #95 stages SEALEO's MOVE_HAIL vs METAPOD's
  MOVE_HARDEN: pre-fix that receipt published a bogus 140-frame
  move-animation from HARDEN's pause paired with the hail tick's hit.
- **Provenance note:** both defects **predate** #93 — they live in code
  paths #93 never touched. #93 legitimately shifts presentation frame
  timing, and the winning/full soak policies read presentation state, so it
  moved these seeds onto trajectories that reach two latent bugs. The
  supervisor's orchestrator-swap discriminator is consistent with that
  (swapping the file changes the trajectory, not the defect). #93's own fix
  and pin are untouched.
- **Next:** re-sweep for the next crash class (winning 20:60 and full
  60:120 were only partly covered here); gold open/close rebrief still
  parked.
- **Notes:** Two expected downstream artifacts updated in the docs commit —
  `docs/gate6-coverage-manifest.{json,md}` (byte-identity ratchet picking up
  the new pins' evidence rows; no coverage change) and
  `tests/randomRoundSoak.test.ts`'s seed-21 strong-route counters
  (43,775f/t5/3,235 renders → 59,656f/t18/4,397 renders — still all seven
  wins, still deterministic across re-runs). No PAPERCUT.

---

## 1297 — [supervisor, 2026-08-16] **Re-sweep found 2 NEW crashes, both proven #93-caused (filed #94/#95, fix dispatched); gold worker cap-killed — pages 20→53/177 salvaged**

- **State (soak truth):** post-#93 winning 0:60 = **59/60** (NEW crash
  seed 16); first-ever full 60:120 = **58/60** (NEW crashes seeds 69,
  113). Seed-49 hang gone (per-policy budget fix held). Outcome shift
  vs pre-#93 winning baseline: 21/60 terminal flips, benign and
  expected. **Supervisor discriminators: swapping ONLY the pre-#93
  `factoryRoundBattleOrchestrator.ts` back in makes seeds 16/69/113
  all OK** — both new signatures are #93-caused, not latent. Filed as
  **#94** (slice boundary not a player command request,
  orchestrator:1830) and **#95** (move/hit provenance ordering,
  battleResolutionPresentation.ts:3190) with the discriminator
  evidence; part-3 report merged (`414a040c`). An opus fix worker is
  dispatched on both (single-root-cause hypothesis first); #93 itself
  stays — its pin + seed 109 remain the guard.
- **Gold speech ((b), cap-killed at final gates):** worker exit 143
  with 3 uncommitted files; supervisor salvaged after independent
  verification (gold windows 58/256 · **53/177** (was 20/177) ·
  58/126; entrance-03 242/256 + cry-held 74/74 rerun clean; typecheck
  + full npm 1,056/9,982/223 + build green) — committed `138b779d`.
  Transcript shows an open-window attempt reaching 91/256 that
  regressed entrance-03 and was correctly reverted: the park-phase
  lever as tried TRADES against entrance-03 — next attempt needs a
  shared-clock shape, not a gold-local constant. Open/close windows
  unmoved (58/256, 58/126); close's diff is a whole-frame 88% class
  (close-wipe model still missing).
- **Next:** (1) #94/#95 fix verifying; (2) gold open/close rebrief
  with the trade-off note; (3) parked: callscene-02 remainder,
  entrance-03 frames 319-320/368.

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

