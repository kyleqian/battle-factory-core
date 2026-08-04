# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 906 — [bounded MAIN worker, 2026-08-04 ~02:00] terminal-seam increment (i) LOSS half landed: LOST/DREW run BattleScript_LocalBattleLost as a second VM pass

- **State:** master `1eb9d1e6`. Full `npm test` green (**688 files / 6,727
  passed / 1 skipped**, 0 failures), `npm run build` green,
  `compare:differential -- battle-command-generated-off.json --base 45291fc4
  --summary`: **PASS — 128/128 byte-identical**.
- **Did:** ISSUES #73 item 1 (loss-side implementation), mirroring the
  win-side shape exactly (`runPostBattleOutcomeScript` in
  `battleScriptFaintedActionsOrchestration.ts`, dispatch already in
  `factoryBattleScriptTerminalDecision.ts`), fresh ground truth
  `docs/terminal-seam-loss-path-ground-truth.md`. **DREW routing confirmed
  against source first:** `battle_main.c`'s `sEndTurnFuncsTable` (`:557-559`)
  maps both `B_OUTCOME_LOST` and `B_OUTCOME_DREW` to the SAME
  `HandleEndTurn_BattleLost`, which for non-link Factory sets
  `gBattlescriptCurrInstr = BattleScript_LocalBattleLost` regardless of which
  — no separate draw script exists (the script's own `CheckDomeDrew` label
  only special-cases DREW on the `BATTLE_TYPE_DOME` branch, which Factory
  never takes). `runPostBattleOutcomeScript` now dispatches on
  `outcome !== WON` rather than `outcome === WON` only. Registered `VARIOUS`
  cases 19/20 (`RETURN_OPPONENT_MON1`/`MON2`) in `Cmd_various`
  (`battleScriptSwitchinOpcode.ts`), ported source-exactly from
  `battle_script_commands.c:6455-6470`: case 19 hardcodes battler 1
  (ignoring the `BS_ATTACKER` selector operand the C switch-case body also
  discards) and emits a `set-battler-sprite-visibility` (`invisible: true`)
  recall event when that battler is alive, marking the scheduler pending so
  the script's own following `waitstate` genuinely blocks on it (the first
  `various` case in this file that actually dispatches to the controller —
  every other case is pure state). Case 20 confirmed a real source no-op for
  `battlersCount <= 3` (Factory singles never exceeds 2), not just inferred
  from behavior. Resolved `STRINGID_TRAINER1WINTEXT` in `messageLines` from
  `opponentTrainer.speechWin`, the exact hand-built-lines shape
  `STRINGID_TRAINER1LOSETEXT` already uses (`speechWin` added as an
  *optional* field on `BattleResolutionOpponentTrainer` so the many
  pre-existing WIN-only test fixtures didn't need a dummy value). Two new
  `JUMPIFWORD` comparands registered (`BATTLE_TYPE_DOME`,
  `BATTLE_TYPE_TOWER_LINK_MULTI`) for the loss script's own early branches,
  same "register the always-false value" idiom the existing
  ARENA/TWO_OPPONENTS/PYRAMID entries use. Tests (all red-verified via `git
  stash` of the touched `src/engine/*.ts` files, each threw the exact
  pre-fix error): a LOSS kill-shot event-sequence pin and a DREW-routing pin
  in `battleScriptFaintedActionsOrchestration.test.ts` (mirroring the
  existing WIN pin's exact shape); a staged kill-shot LOSS through
  `submitFactoryFullTurnDecision` in
  `factoryBattleScriptFullTurnDecision.test.ts` (mirroring the WIN
  "mid-turn KO" pin, roles swapped, same STRENGTH/200atk/50def numbers so
  the 204-damage roll is already-proven, not newly derived); new
  `tests/presentationStringTerminalSeamLoss.test.ts` mirroring
  `presentationStringTerminalSeamWin.test.ts`'s exact idiom, pinning
  DESTIN's real `speechWin` ("I AM ABOUT TO" / "OVERHEAT", pixel-confirmed
  in the loss doc) plus a JENSON generalization pin. Win-side pins verified
  untouched-green throughout. RNG: no new draws on either path (loss doc §4
  independently oracle-verified this) — every new test asserts `rng.calls`
  is unchanged. Census: **49→48 UNRESOLVED** (exact −1,
  `STRINGID_TRAINER1WINTEXT`). ISSUES #73 item 1 trimmed to done (deleted,
  entry retitled, items 2/3 renumbered 1/2, both widened to note they now
  cover the loss window too).
- **Surprise found, not fixed (flagged, out of scope):** while tracing
  `trainerslidein BS_ATTACKER`'s battler resolution to confirm the LOSS
  script's event sequence, direct source reading showed
  `battleScriptBattlerPositions.ts`'s `resolveSingleBattlePosition` mapping
  was backwards (`BS_ATTACKER` mapped to battler 0/player instead of the
  real battler 1/opponent). **Fixed in entry 907**, the very next step.
- **Next:** #73 item 1 (increment (iii), the win/loss trainer-slide-in
  presentation phase, now backed by source-true event data per entry 907).
  #73 item 2 (oracle-level pixel coverage, both outcomes). #72's remaining
  REACHABLE-10 list (`STRINGID_PKMNHUNGONWITHX` next by rank). The
  `Cmd_end3`/`call-current` resumption gap (`SXWHIPPEDUPSANDSTORM`). #71
  Slice D (gated on the animation lane's rung-3 dispatcher).
- **Notes:** No PAPERCUT — the `git stash`/red-verify cycle and the
  `submitFactoryFullTurnDecision` event-shape discovery (top-level `events`
  are `{sequence, payload, provenance}`-wrapped, not flat — a one-line fix
  once found) cost some exploration time but nothing structural. `npm test`
  auto-backgrounded on its own past the Bash tool's foreground timeout
  (known repo-wide issue, PROGRESS 905's own note); stopped the stray
  background task and re-ran to a real foreground completion per this
  step's execution discipline, same as that prior session.

---
