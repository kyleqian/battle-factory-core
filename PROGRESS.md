# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 909 — [bounded MAIN worker, 2026-08-04 ~03:15] Terminal-seam increment (iii) landed: generic trainer slide-in + dismissible win/loss message boxes (ISSUES #73 item 1 rung A)

- **State:** master `a1dc6614`. Full `npm test` green (**701 files / 6,788
  passed / 1 skipped**, 0 failures), `npm run build` green,
  `compare:differential -- battle-command-generated-off.json --base
  4b883b3f --summary`: **PASS — 128/128 byte-identical**.
- **Did:** the real presentation phase docs/terminal-seam-round-flow-scout.md
  §3(iii) called for, on the generic route, before the postwin/factoryTerminal
  handoff. `projectBattleResolutionCommands` (`battleResolutionPresentation.ts`)
  gained a generic `"trainer-slide"` command case (keyed off the
  `trainer-slide-in`/`-out` events and the already-threaded `opponentTrainer`
  — data-driven, not DESTIN-hardcoded; new `TRAINER_SLIDE_TIMING` = 53 ticks,
  ported from `battleScene.ts`'s own `TURN17_TRAINER_SLIDE_SETTLE_DELAY` doc
  comment, cited in place). The three terminal STRINGIDs
  (`PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/`TRAINER1WINTEXT`) now advance
  by button press (`TERMINAL_SEAM_BUTTON_MESSAGE_IDS`), reusing the exact
  same dismiss machinery `STRINGID_TARGETFAINTED` already drives — no new
  renderer, per the step's hard limit. `battleResolutionPresentationRender.ts`
  exposes the slide's screen-relative offset (`offscreenX2`) generically in
  the render view; `battleScene.ts`'s existing generic
  `renderBattleResolutionSceneOffView` (the Scene-OFF drawScene callback the
  generated route already wires at `core.ts:2346`, not the retired canonical
  turn machine) draws the trainer sprite via `resolveFrontierTrainerPic`
  keyed off `opponentTrainer.trainerPic`. The pre-existing
  `"terminal-handoff"` lifecycle phase (already wired to call `finishBattle`
  in `factoryRoundBattleOrchestrator.ts`) now only fires once every command in
  the segment — including the new slide and both dismisses — has actually
  played, closing the "silent fabrication" gap ISSUES #73 flagged. New
  `tests/presentationTerminalSeamTrainerSlide.test.ts`: DESTIN WIN and JENSON
  LOSS fixtures (mirroring `battleScriptFaintedActionsOrchestration.test.ts`'s
  real production event shapes) pin the exact 3-command sequence per outcome,
  drive the presentation step-by-step through the slide's mid-animation
  offset, its settle, both message dismisses, and the final
  `terminal-handoff`/`pendingBoundary` state. Red-verified via `git stash --
  src/engine/battleResolutionPresentation.ts
  src/engine/battleResolutionPresentationRender.ts src/engine/battleScene.ts`:
  both tests failed their first assertion — command array
  `["message","message","turn-end"]`/`["sprite-visibility","message","turn-end"]`,
  confirming the event was silently dropped and the quote message never
  became dismissible, exactly ISSUES #73's own diagnosis. Full
  `factoryRoundBattleOrchestrator.test.ts` (36 tests, incl. the existing
  terminal-boundary integration test that loops `advanceFactoryRoundBattleResolution`
  to `postwin`) reran green untouched.
- **Scope held:** no `battleScriptMachine.ts`/`battleScriptCallbackStack.ts`/
  `battleScriptSwitchinOpcode.ts`/`battleScriptStatbuffchangeOpcode.ts` edits
  (side-lane-owned this round); no #72 id additions; no canonical
  `battleScene.ts` turn-machine change (`TURN17_*` one-off untouched, only
  cited/ported); completeness guard untouched.
- **Next:** ISSUES #73's remaining item (rung B): dense oracle-pixel coverage
  over the new boundary. Ground truth is already committed
  (`docs/terminal-seam-loss-path-ground-truth.md`'s twice-identical LOSS
  trace) but **not yet run through `npm run compare`** against this landing —
  budget ran out this step before attempting the matched app/oracle staging
  (see Notes). The WIN side additionally needs a fresh `mechanicLab` window
  (today's only WIN ground truth is the DESTIN-specific canonical
  `turn17-notes.md`/`postwin-notes.md` pair, not a staged generic trace).
  #72's remaining REACHABLE list. `Cmd_end3`/`call-current` resumption gap.
  #71 Slice D (gated on the animation lane's dispatcher).
- **Notes:** Honest stop at rung A per the step brief's own instruction
  ("if not converging by minute 50, stop fitting, land rung A") — rung B's
  oracle-window pass was not attempted at all this step (not "attempted and
  stuck"), so there are no mismatch numbers to report yet; the next worker
  should budget real time for `bin/oracle lab`/`npm run compare` staging
  before assuming the ported `TRAINER_SLIDE_TIMING`/screen-position constants
  are pixel-exact. No PAPERCUT beyond the recurring `npm test` auto-background
  past the Bash tool's default timeout (same known issue entries 905/906
  flagged); stopped the stray duplicate and re-ran to a real foreground
  completion each time per this step's execution discipline.

---
## 908 — [supervisor wind-down, 2026-08-04 ~02:50] Session close: terminal-seam WIN+LOSS both landed, typeref program CLOSED (census 0), #72 burned 80→48, day-audit clean; final union green

- **State:** master `630bf3dc` (animation fold merge). Final independent
  full `npm test`: **700 files / 6,786 passed / 1 skipped, 0 failures**;
  `npm run build` green. Play-preview rebuilt at this commit, serving :5199.
  No open DEFERRED entries. 13 workers this session (7 main + 6 side),
  **0 lost** — every launcher exited normally.
- **Did (headlines):** (1) **Terminal seam:** picked up the parked
  `wip/terminal-seam-increment-i`, landed increments (i)+(ii) WIN side
  (entry 901), then scouted (entry: loss ground-truth doc + twice-identical
  fixture) and landed the **LOSS/DREW half same session** (entry 906,
  `VARIOUS` 19/20 registered), plus the BS_ATTACKER mapping corrective
  (entry 907). Both battle endings now run their real scripts with resolved
  trainer text; remainder consolidated as **ISSUES #73** (renderer/increment
  (iii) + win-window oracle coverage). (2) **Typeref retirement program
  CLOSED:** slices 5/6/7a/7b landed on a stacked side-lane ladder, census
  **67→0** (program total 144→0), slice-8 audit ran supervisor-side clean;
  recorded in ISSUES #39 + design-doc header. (3) **ISSUES #72:** batches
  5/6/7 + the 3 trainer ids — census UNRESOLVED **80→48**, REACHABLE
  **39→10**; new plumbing landed: `battleTextBuff1Type`/`monNickBattler`;
  CANCELER_TORMENTED premise **corrected** (real Torment = selection-time
  rejection, subsystem tracked in #72's note; triage-doc citations fixed);
  `Cmd_end3`/`call-current` resumption gap documented (blocks
  SXWHIPPEDUPSANDSTORM + Drizzle/Drought full-turn switch-in tests).
  (4) **Read-only day-audit** over all four surfaces: 0 functional defects,
  2 record gaps (both folded into #73). (5) Two animation folds (orient:
  none needed; wind-down: 11 commits, back-anim acceptances). PAPERCUTS +1
  (forced-switch party-menu cursor). Oracle freshness FAIL at orient was the
  documented docs-only false positive (single `_template` harness commit) —
  no restart.
- **Next:** ISSUES #73 item 2 (win/loss presentation phase incl. generic
  trainer slide-in — next headline candidate; closes item 3's oracle window
  with it). #72 batch 8: `SAFEGUARDEXPIRED`/`TOOKATTACK` cheapest, then the
  end3 resumption gap as a dedicated step. #71 Slice D still gated on the
  animation lane's rung-3 dispatcher (not landed as of 02:30). Hard trio /
  `SXBLOCKSY2` / `TOOKFOE`+`LOSTPPGRUDGE` tryfaintmon / `MAGNITUDESTRENGTH`
  RNG-field remain the #72 tail.
- **Notes:** the animation supervisor was live until ~02:00 (its nested
  worker worktree may persist under `.worktrees/animation-main/` — theirs to
  clean). Merge discipline held all session: no master merges while a
  main-lane worker was live; side ladder stacked 3 deep then folded in two
  merges. All my worker worktrees/branches removed; `play-preview` +
  `animation-main` worktrees are permanent.

---
## 907 — [bounded MAIN worker, 2026-08-04 ~02:30] Corrective: fixed the backwards BS_ATTACKER trainer-slide-in mapping entry 906 flagged

- **State:** master `0fd3367d`. Full `npm test` green (**688 files / 6,727
  passed / 1 skipped**, 0 failures), `npm run build` green,
  `compare:differential -- battle-command-generated-off.json --base bb39b434
  --summary`: **PASS — 128/128 byte-identical** (confirms zero visible
  change, as expected — no renderer consumes this field yet).
- **Did:** Fixed entry 906's flagged-but-unfixed bug: source-verified both
  `Cmd_trainerslidein`/`Cmd_trainerslideout` (`battle_script_commands.c:
  5301-5308,10319-10326`) — both do `gActiveBattler =
  GetBattlerAtPosition(gBattlescriptCurrInstr[1])`, no hardcoding, the
  compiled operand byte genuinely selects the position (confirmed
  `resolveBattlerAtPosition`/`resolveSingleBattlePosition` is this opcode's
  *only* call site, `battleScriptSourceCommands.ts`'s
  `emitTrainerSlideControllerEvent`). `BS_ATTACKER`
  (`battle_script_commands.h:305`) compiles to **1**, matching
  `B_POSITION_OPPONENT_LEFT` (`include/constants/battle.h:29`, also 1) — NOT
  `B_POSITION_PLAYER_LEFT` (`battle.h:28`, value 0) as the prior mapping and
  its comment both incorrectly asserted. So `trainerslidein BS_ATTACKER`
  (both the WIN script `BattleScript_FrontierTrainerBattleWon_LoseTexts` and
  the LOSS/DREW script `BattleScript_LocalBattleLostPrintTrainersWinText`,
  `data/battle_scripts_1.s:2927,2966`) always resolves the **opponent**'s
  battler (1), matching the oracle trace where DESTIN visibly slides in on
  both outcomes. Fixed `resolveSingleBattlePosition`
  (`battleScriptBattlerPositions.ts`) — moved `BS_ATTACKER` to the same
  value (1) as `B_POSITION_OPPONENT_LEFT`, rewrote the module's doc comment
  with the corrected citations. Audited every other entry in
  `SINGLE_BATTLE_POSITIONS` against the header (only `B_POSITION_PLAYER_LEFT`
  and `B_POSITION_OPPONENT_LEFT` remain, both already correct raw-position
  mappings; `BS_FAINTED` is never reached in Factory singles — its only
  script use is behind a `BATTLE_TYPE_TWO_OPPONENTS` branch Factory never
  takes — so it correctly stays unmapped/null, unchanged). Blast radius
  (`rg` for `resolveBattlerAtPosition`/`resolveSingleBattlePosition`/
  `trainer-slide-in` across `src/`+`tests/`): only two call sites actually
  exercise `BS_ATTACKER` through this resolver and needed flips — both
  red-verified (stash/revert → old-mapping pins pass, new pins fail;
  restore → new pins pass, confirmed via actual test runs, not inferred):
  (1) `battleScriptFaintedActionsOrchestration.test.ts`'s own hand-rolled
  `resolveBattlerAtPosition` port mock (doesn't import the production
  function) — fixed the mock plus its 3 pins (WIN kill-shot, LOSS
  compactSequence, DREW) from `battler: 0`/`"slide-in:0"` to `1`; (2)
  `factoryBattleScriptFullTurnDecision.test.ts`'s staged-LOSS
  `compactSequence` pin, which routes through the real production
  `resolveSingleBattlePosition` via `factoryBattleScriptFullTurnDecision.ts`
  — flipped `"slide-in:0"` to `"slide-in:1"`. Every other file importing
  `resolveSingleBattlePosition` (`factoryBattleStart.ts`,
  `factoryBattleScriptDecision.ts`, `factoryBattleScriptTerminalDecision.ts`,
  `battleEndTurnOrchestration.test.ts`, `battleScriptFutureAttack.test.ts`)
  either never exercises `BS_ATTACKER` through it or has no matching
  `trainer-slide-in` battler pin — confirmed unaffected by running their
  suites green. `battleScriptSwitchinOpcode.ts`'s VARIOUS case 19/20 comment
  (a *different* opcode, `Cmd_various`, which genuinely discards its
  `BS_ATTACKER` operand and hardcodes `gActiveBattler`) makes no numeric
  claim about `BS_ATTACKER`'s value, so it needed no correction.
- **Next:** #73 item 1 (increment (iii), the win/loss trainer-slide-in
  presentation phase, now backed by source-true event data). #73 item 2
  (oracle-level pixel coverage, both outcomes). #72's remaining REACHABLE-10
  list (`STRINGID_PKMNHUNGONWITHX` next by rank). The `Cmd_end3`/
  `call-current` resumption gap (`SXWHIPPEDUPSANDSTORM`). #71 Slice D (gated
  on the animation lane's rung-3 dispatcher).
- **Notes:** No PAPERCUT. Scope stayed exactly the corrective as briefed —
  resolver + its comments + the pins it drives, nothing in `battleScene.ts`
  or any other #72/#73 item touched. `npm test`/`npm run build`/the
  differential all ran to real foreground completion.

---
