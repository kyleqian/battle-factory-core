# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  script's event sequence, direct source reading
  (`include/constants/battle_script_commands.h:305`: `BS_ATTACKER` = **1**,
  not 0; `B_POSITION_PLAYER_LEFT` = 0, `B_POSITION_OPPONENT_LEFT` = 1) shows
  `battleScriptBattlerPositions.ts`'s existing `resolveSingleBattlePosition`
  comment/mapping is backwards: it maps `"BS_ATTACKER"` to battler 0
  (`B_POSITION_PLAYER_LEFT`), but `Cmd_trainerslidein` reads its operand as a
  raw `GetBattlerAtPosition` argument and the compiled byte for `BS_ATTACKER`
  is 1, so the real resolution is `GetBattlerAtPosition(1)` = battler 1 (the
  **opponent**) — matching the loss doc's own observation that DESTIN (the
  opponent trainer), not the player, visibly slides in on both the win and
  loss quote screens. This is a real, pre-existing bug from the win-side
  landing (`5f1b3d80`/`2bb9b3bc`), silently harmless today only because no
  renderer consumes `trainer-slide-in`'s `battler` field yet (#73 item 1,
  formerly item 2). Left untouched deliberately: fixing it would flip the
  already-pinned win-side test's own `battler: 0` expectation
  (`battleScriptFaintedActionsOrchestration.test.ts` "mid-turn KO" pin),
  breaking the "win-side pins untouched-green" requirement for this step,
  and the LOSS side's own new pins intentionally inherit the same
  (consistent, bug-carrying) resolver rather than diverging from the WIN
  side's established convention. Needs its own scoped fix (touches both the
  resolver and both win/loss pins' `battler` expectations) — flagging here
  since it's genuinely load-bearing for #73 item 1's future renderer work,
  not just a doc typo.
- **Next:** #73 item 1 (increment (iii), the win/loss trainer-slide-in
  presentation phase — now also the right place to fix the `BS_ATTACKER`
  resolver bug above, since that item is what will finally consume the
  `battler` field). #73 item 2 (oracle-level pixel coverage, both outcomes).
  #72's remaining REACHABLE-10 list (`STRINGID_PKMNHUNGONWITHX` next by rank).
  The `Cmd_end3`/`call-current` resumption gap (`SXWHIPPEDUPSANDSTORM`).
  #71 Slice D (gated on the animation lane's rung-3 dispatcher).
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

---
## 904 — [bounded MAIN worker, 2026-08-04 ~00:10] #72 batch 6: 13 more REACHABLE printstring STRINGIDs landed

- **State:** master (this docs commit follows the engine commit). Full
  `npm test` green (**686 files / 6,717 passed / 1 skipped**, 0 failures),
  `npm run build` green (`tsc -b && vite build`).
- **Did:** Continued ISSUES #72's ranked REACHABLE-28 list from
  `STRINGID_PKMNSXCUREDYPROBLEM` (skipping the hard trio/`TRACED`/`SXBLOCKSY2`
  per the step brief) and landed 13 across 11 staged `it`s in
  `tests/presentationStringIssue72Batch6.test.ts`: the end-turn ability-tick
  trio Shed Skin/Rain Dish/Speed Boost (`SXCUREDYPROBLEM`/`SXRESTOREDHPALITTLE2`/
  `RAISEDSPEED` — Shed Skin's tick gained a small `battleTextBuff1Status`
  pre-clear capture mirroring `HOLD_EFFECT_CURE_STATUS`'s own branch, Speed
  Boost's tick gained an explicit `scriptingBattler` write mirroring
  `battle_util.c:2649`, Rain Dish needed neither — its own print reads
  `B_ATK_*`, already supplied generically by `enterTickBattlerContext`); Wish's
  delayed heal `WISHCAMETRUE` (real 2-turn cast-then-resolve repro); the
  Disable attack-canceler pair `MOVEWASDISABLED`/`MOVEISDISABLED` (real
  same-turn cast-then-blocked-reselect, the second sharing Taunt's exact
  idiom); Perish Song's `PERISHCOUNTFELL` (real same-turn cast-then-tick,
  reusing Stockpile's `battleTextBuff1ByteNumber` substitution); the Magic
  Coat pair `SHROUDEDITSELF`/`MOVEBOUNCED` (real same-turn cast-then-bounced-
  GROWL); `USEDSAFEGUARD` (real same-turn Safeguard-then-blocked Thunder
  Wave); and three zero-new-plumbing defender-only ids
  (`STATSWONTDECREASE2`/`FELLINTONIGHTMARE`/`HEALEDPARALYSIS`). Three ability
  display names added (`RAIN DISH`/`SPEED BOOST`/`SHED SKIN`). All 11 `it`s
  red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts
  src/engine/battleEndTurnOrchestration.ts` (each threw the exact pre-fix
  completeness-guard error). Census: **67→54 UNRESOLVED** (exact −13). ISSUES
  #72 REACHABLE trimmed to **15** (28−13, arithmetic-checked).
- **Skipped, with reasons (not just budget):** `STRINGID_PKMNTOOKFOE`
  (Destiny Bond) and `STRINGID_PKMNLOSTPPGRUDGE` (Grudge) both route through
  `tryfaintmon`'s dual `BS_ATTACKER`/`BS_TARGET` operand
  (`battleScriptHitChainOpcode.ts:4270-4340`) — the single-hit case resolves
  to the plain idiom, but proving that holds across every reachable
  `tryfaintmon` call site is its own investigation, not this step's scope.
  `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` (Sand Stream — mechanism fully
  understood, needs a genuine mid-battle switch with a 2nd party slot),
  `STRINGID_PKMNSAFEGUARDEXPIRED` (mechanism understood, needs a real 5-turn
  expiry repro, no `sideTimers` config shortcut), `STRINGID_PKMNTOOKATTACK`
  (Future Sight — mechanism understood, needs a real 3-turn delayed-hit
  repro) all ran out of step budget on staging cost alone.
  `STRINGID_MAGNITUDESTRENGTH` needs a new RNG-roll capture field (genuine new
  plumbing). `STRINGID_PKMNCHANGEDTYPEWITH` (the one permitted plumbing
  extension) not attempted, ran out of budget. `STRINGID_PKMNREDUCEDPP`/
  `STRINGID_PKMNSITEMRESTOREDPP`/`STRINGID_PKMNSTOLEITEM` each need a small
  new substitution-capture pair, not attempted.
- **Next:** #72 batch 7 (REACHABLE-15 list: `SXWHIPPEDUPSANDSTORM` next in
  order, or cherry-pick `STOLEITEM`/`CHANGEDTYPEWITH` first — both cheap per
  this session's own research). The hard trio, `TRACED`, `SXBLOCKSY2`,
  `TOOKFOE`/`LOSTPPGRUDGE`'s tryfaintmon investigation. typeref slices 4-8.
  #71 Slice D.
- **Notes:** No PAPERCUT. Full suite + build ran in the foreground per this
  step's execution-discipline brief (an earlier attempt to background them
  was caught and corrected mid-step before either notification landed).
- **[supervisor addendum, 2026-08-04 ~00:25]** Typeref slice 7b merged on top
  of this entry (`88ddf84e`): battleScene.ts census **41→0**, −272 net lines,
  8,199/8,199 differential captures byte-identical, union smoke + both pin
  suites green post-merge. Slice-8 audit ran supervisor-side (no dead test
  fixtures; adapter-owned types are legitimately retained) — **the §4.1
  typeref retirement program is CLOSED**, recorded in ISSUES #39 and the
  design doc header. Entry 904's "typeref slices 4-8" Next-item is thereby
  retired; #71 Slice D remains gated on the animation lane's rung-3
  dispatcher (not landed as of this session's orient). Side lane currently
  running the loss-path terminal ground-truth scout (docs+traces only).
