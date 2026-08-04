# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 905 — [bounded MAIN worker, 2026-08-04 ~01:15] #72 batch 7: 5 more REACHABLE printstring STRINGIDs landed, Sand Stream investigated + deferred

- **State:** master (this docs commit follows the engine commit). Full
  `npm test` green (**687 files / 6,722 passed / 1 skipped**, 0 failures),
  `npm run build` green (`tsc -b && vite build`), `compare:differential --
  battle-command-generated-off.json --base 854703f3 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** Worked ISSUES #72's REACHABLE-15 list per PROGRESS 904's own
  batch-7 classification, cheapest-first, and landed 5 in
  `tests/presentationStringIssue72Batch7.test.ts` (all red-verified via
  `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts
  src/engine/battleEndTurnOrchestration.ts src/engine/battleScriptEvents.ts`,
  each threw the exact pre-fix completeness-guard error): `STRINGID_
  PKMNCHANGEDTYPEWITH` (Color Change — the one permitted new-plumbing
  extension; `battleTextBuff1Type` was already captured by
  `battleScriptMoveEndOpcode.ts:497` and already pinned directly by
  `battleScriptMoveEndOpcode.test.ts`/`battleScriptTypeChangeOpcode.test.ts`,
  only `prepareMessage`'s wiring to `Cmd_printstring` was missing; resolves
  through `fightSubmenuText.ts`'s `TYPE_DISPLAY_NAMES` table, the same
  `gTypeNames` abbreviation real source's `{B_BUFF1}` reads); `STRINGID_
  PKMNREDUCEDPP` (Spite — `battleTextBuff1Move`/`battleTextBuff2ByteNumber`
  were likewise already captured by `battleScriptTryspiteppreduceOpcode.ts`,
  same missing-wiring-only shape); `STRINGID_PKMNSITEMRESTOREDPP` (Leppa
  Berry end-turn tick — `runItemsTick`'s `HOLD_EFFECT_RESTORE_PP` branch now
  also sets `scriptingBattler`/`battleTextBuff1Move`, pinned directly with a
  new assertion in `tests/battleEndTurnOrchestration.test.ts`'s existing
  Leppa Berry test); `STRINGID_PKMNSTOLEITEM` (Thief/Covet — `MOVE_EFFECT_
  STEAL_ITEM`'s own set-battler-item event pair fires in the SAME transition
  as the call into `BattleScript_ItemSteal`, strictly before the print, so
  `heldItems[attacker]` — not `heldItems[defender]`, unlike Knock Off — is
  the correct read at print time); `STRINGID_PKMNTRACED` (real Porygon
  switch-in repro, reusing batch 2's Intimidate-loop `trainerBenchOverride`
  staging shape — needed a genuinely new `monNickBattler` message-event field
  (`battleScriptEvents.ts`) since the traced-from battler's name-with-prefix
  needs `field`, unavailable inside `prepareMessage`'s rules-only scope;
  `battleTextBuff1MonNick`'s own rules-context capture was already pinned
  directly by `battleScriptSwitchinOpcode.test.ts`). Census: **54→49
  UNRESOLVED** (exact −5). ISSUES #72 REACHABLE trimmed to **10** (15−5,
  arithmetic-checked).
- **Investigated, not landed:** `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` (Sand
  Stream) reaches its own `BattleScript_SandstreamActivates` printstring fine
  via the same switch-in staging, but the script then halts at its own
  `end3` (after `playanimation`+`call BattleScript_WeatherFormChanges`) as an
  unresolved `machine-barrier` instead of resuming the switch-in flow —
  `battleScriptSwitchinOpcode.ts`'s `callSwitchinScript` enters the ability
  script via a real interpreter `"call-current"` transition (unlike Trace/
  Intimidate, whose `switchineffects` branches only flip a status bit and
  defer actual script execution to a separate, non-interpreter entry-hook
  resolution). `battleScriptCallbackStack.ts` confirms `Cmd_end3`/
  `BattleScriptPushCursorAndCallback` push/pop resumption is a known
  `"UNWIRED DESIGN-SCOUT PROTOTYPE"` (`docs/end3-design.md`), not wired into
  the live full-turn reducer — genuinely new plumbing, not a staging cost,
  and Drizzle/Drought likely share the identical wall if ever full-turn
  switch-in tested (unconfirmed). Full citations and a one-line sub-barrier
  fix (`Cmd_playanimation`'s unregistered `B_ANIM_SANDSTORM_CONTINUES` case,
  found en route, reverted since it's moot without the `end3` fix) are in
  ISSUES #72's own batch-7 note. `STRINGID_PKMNSAFEGUARDEXPIRED` and
  `STRINGID_PKMNTOOKATTACK` were not attempted this step (ran out of budget
  after the end3 investigation) — both still just need staging per PROGRESS
  904's own notes, no new gap found.
- **Next:** #72 batch 8 (REACHABLE-10 list). `SAFEGUARDEXPIRED` (5-turn
  expiry repro) and `TOOKATTACK` (`tests/battleScriptFutureAttack.test.ts`
  has the staging harness) are the next cheapest per this step's own
  research. The `Cmd_end3`/`call-current` resumption gap (would unblock
  `SXWHIPPEDUPSANDSTORM` and make Drizzle/Drought's own switch-in
  full-turn-testable) is worth a dedicated step — bigger than one STRINGID.
  The hard trio, `SXBLOCKSY2`, `TOOKFOE`/`LOSTPPGRUDGE`'s `tryfaintmon`
  investigation, `MAGNITUDESTRENGTH`'s new RNG-roll capture field. #71 Slice
  D (gated on the animation lane's rung-3 dispatcher).
- **Notes:** No PAPERCUT. `npm test`/`npm run build` both exceeded the Bash
  tool's foreground timeout and auto-backgrounded; per this step's execution
  discipline, stopped the stray background task and re-ran each to a real
  foreground completion via the background-output file rather than treating
  the auto-background as a wait-for-notification shortcut.

