# Turn machinery audit — source vs port (2026-08-26)

Battle start → action selection → turn order → the move-action prologue.
Everything that runs BEFORE a move's battle script executes.

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit time) | `6cb2920f054486ec433d70292753bbf93b062237` (commit `c847e462`) |
| Date | 2026-08-26, worker start `Wed Aug 26 01:41:30 PDT 2026` |
| Lane / oracle | side worktree `worker/side-20260826-014123`, Battle Scene OFF (`http://127.0.0.1:8014`). Static audit — the oracle was **not** run. |
| Scope | Level-50 Factory **singles**, both sides. §1 `TryDoEventsBeforeFirstTurn` (battle start after the intro). §2 `HandleTurnActionSelectionState` — every `gBattleCommunication[]` state and every singles-reachable `B_ACTION_*` case, both controllers. §3 `SetActionsAndBattlersTurnOrder` + `GetWhoStrikesFirst`. §4 `HandleAction_UseMove`'s prologue up to the `gBattleScriptsForMoveEffects[effect]` handoff (+ `HandleAction_Switch`/`_UseItem`/`_Run` reachability). §5 the action-finished seams. Docs-only step — no engine/test/tool/data edits. |
| Out of scope (declared, not audited) | Fixing anything. AI **scoring** internals (`battle_ai_main.c` / `battle_ai_script_commands.c` — ISSUES #137 is in flight); only the CALL SEAM and what it writes is a row here. `Cmd_attackcanceler` and every later opcode. End-of-turn (`docs/end-turn-ordering-audit-2026-08-25.md`). Faint replacement (`docs/faint-replacement-audit-2026-08-26.md`) and mid-battle switch lifecycle (`docs/switch-lifecycle-audit-2026-08-26.md`) — their rows are cross-referenced, never re-derived. Doubles. Battle Scene ON. The intro presentation before `TryDoEventsBeforeFirstTurn`. |
| NOT read (declared) | `battle_ai_main.c`'s `BattleAI_ChooseMoveOrAction` body and `battle_ai_script_commands.c`'s opcode table (only the `OpponentHandleChooseMove` dispatch seam at `battle_controller_opponent.c:1560-1700` was read). `battleScriptRulesContext.ts`'s ~3.1k-line constructor except the ~30 fields cited. `factoryBattleScriptFullTurnDecision.ts`'s per-opcode script execution half (`runScriptToOwnEnd`, `externalPorts`' ~530-line handler table) — only the action-selection / turn-setup half is audited, per brief. `battleScriptSwitchinOpcode.ts`'s per-ability ON_SWITCHIN bodies (the ability-activation audit of 2026-08-25 owns them; only the DISPATCH ORDER is a row here). `CastformDataTypeChange` (Castform is not a Factory rental — §1 row 1.10). The Safari / Palace / Arena / link / recorded-battle / Wally branches (declared UNREACHABLE-IN-SINGLES-FACTORY with cites, not traced). |

**Verdict counts** — see §6.

---

## §0. Two premises in the step brief that the source refutes

Both are load-bearing; getting either wrong would have produced a phantom DIVERGENT.

1. **Quick Claw does not draw `Random() % 100` in `GetWhoStrikesFirst`.** Emerald's test is
   `holdEffect == HOLD_EFFECT_QUICK_CLAW && gRandomTurnNumber < (0xFFFF * holdEffectParam) / 100`
   (`battle_main.c:4653` and `:4687`) — it *reads* the once-per-turn `gRandomTurnNumber` global and
   consumes **no** RNG of its own. `gRandomTurnNumber` is written exactly twice per battle-lifetime
   position: `BattleStartClearSetData` (`battle_main.c:3140`) and `TryDoEventsBeforeFirstTurn`
   (`:3923`) for turn 1, then once per later turn at `BattleTurnPassed` (`:4013`). So a turn's
   *entire* Quick Claw outcome — for both battlers, across every pairwise comparison in the sort — is
   decided by one already-drawn u16. Two Quick Claw holders in the same turn either both proc or both
   don't when their `holdEffectParam` matches. There is no per-battler draw to order.
2. **`HandleAction_UseMove` contains no Choice-item lock.** `gBattleStruct->choicedMove` is read in
   exactly two places on the selection side — `TrySetCantSelectMoveBattleScript` (`battle_util.c:1051-1054`,
   which *rewrites* `gCurrentMove` to the locked move for the "can't select" message) and
   `AreAllMovesUnusable` (`:1119`) — and is *written* by `Cmd_setchoiceeffect`'s inline block at
   `battle_script_commands.c:4300-4315`, i.e. during `Cmd_moveend`, after the move ran. Grepped the
   whole tree (`grep -rn choicedMove $REF/src`): `battle_util.c:981/1051/1085/1119`,
   `battle_script_commands.c:2800/2889/4216-4315/6357-6372/9255-9259`, `battle_main.c:3124/3253/3321`.
   None of them is in `HandleAction_UseMove`. The Choice lock is therefore a §2 (selection) fact, not a
   §4 (prologue) fact, and §4 audits it as UNREACHABLE-AT-THIS-SEAM.

## §1. Battle start after the intro — `TryDoEventsBeforeFirstTurn` (`battle_main.c:3841-3930`)

**Port site.** `src/engine/factoryBattleStart.ts:351` `initializeFreshFactoryBattle` collapses the whole
re-entrant `gBattleMainFunc` state machine into one synchronous function. It is the only production
constructor of a fresh battle (`grep -rn initializeFreshFactoryBattle src/` → `factoryBattleStart.ts`
+ `src/engine/factoryRoundController.ts`). Judged on ORDER and OUTCOME, not shape.

The source's re-entrancy contract, stated once so the rows below can lean on it: every `return` inside
`TryDoEventsBeforeFirstTurn` is a *yield* — the case that fired called `BattleScriptPushCursorAndCallback`
/ `BattleScriptExecute`, and after the script's `end3` the function re-runs **from line 3847**, with
`switchInAbilitiesCounter` / `switchInItemsCounter` / `overworldWeatherDone` / the `STATUS3_*` pending
bits carrying the cursor.

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| 1.1 | `if (gBattleControllerExecFlags) return;` — the whole function is gated on an idle controller (`battle_main.c:3847-3848`) | no port site; `initializeFreshFactoryBattle` is synchronous and has no controller-exec flag word | SAME-ORDER-EQUIVALENT (a pure re-entry gate; it can only delay the pass, never reorder or skip a step) |
| 1.2 | `gBattlerByTurnOrder[i] = i` identity fill, `i < gBattlersCount` (`:3852-3853`) | `factoryBattleStart.ts:375-377` builds `turnOrder` from `[0,1]` directly | SAME-ORDER |
| 1.3 | bubble sort `GetWhoStrikesFirst(byTurnOrder[i], byTurnOrder[j], **TRUE**)`, swap on any non-zero (`:3854-3861`) | `:367-377`: `preHookEffectiveSpeed` for both battlers, then the `playerSpeed === opponentSpeed ? tie : faster-first` decision | SAME-ORDER. `ignoreChosenMoves = TRUE` forces `moveBattler1 = moveBattler2 = MOVE_NONE` (`:4690-4694`), and `gBattleMoves[MOVE_NONE].priority == 0` (`src/data/battle_moves.h:6-16`, the `MOVE_NONE` entry has no `.priority` initializer → 0), so the comparison takes the `else` at `:4743` — a plain speed compare. The port's `movePriority: 0` (`:167`) reproduces exactly that |
| 1.4 | the sort's tie draw: `speedBattler1 == speedBattler2 && Random() & 1` → `strikesFirst = 2` → swap (`:4745-4746`) | `:373-377`: `tieDraw = playerSpeed === opponentSpeed ? randomU16(...) : null`; low bit 1 ⇒ `[1,0]` | SAME-ORDER — **one** draw, and only on an exact effective-speed tie, exactly as the `&&` short-circuit dictates. Pinned by the live Scene-OFF receipt in `docs/facility-round-loop-scout.md §4.1` (draw A at `BattleStartClearSetData+0x29b`, the tie draw strictly between A and B, draw B at `TryDoEventsBeforeFirstTurn+0x26f`) |
| 1.5 | the sort reads `gRandomTurnNumber` for Quick Claw — and at this instant that global still holds **draw A** from `BattleStartClearSetData:3140`, not turn 1's value (`:3923`, which has not run yet) | `:364` `drawA`, threaded into `preHookEffectiveSpeed(player, drawA.value)` at `:367-368` | SAME — the port explicitly consumes draw A here and draw B (`:551`) only for the turn's readable global. This is the subtle one: a Quick Claw holder's *battle-start ordering* proc is decided by a DIFFERENT u16 than its turn-1 ordering proc |
| 1.6 | the sort is inside `if (switchInAbilitiesCounter == 0)` (`:3850`), so a yield from the **weather** block at `:3863-3868` (which does not advance that counter) **re-runs the whole sort**, consuming a second tie draw, now with `gBattleWeather` set | `factoryBattleStart.ts` sorts once | UNREACHABLE-IN-SINGLES-FACTORY: the second sort requires `AbilityBattleEffects(0,0,0,ABILITYEFFECT_SWITCH_IN_WEATHER,0)` to return non-zero, which requires `GetCurrentWeather()` ∈ {RAIN, RAIN_THUNDERSTORM, DOWNPOUR, SANDSTORM, DROUGHT} (`battle_util.c:2493-2524`). The Factory battle room declares `"weather": "WEATHER_NONE"` / `"mapType": "MAP_TYPE_INDOOR"` (`data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json:8-9`), so the switch falls through with `effect == 0` and `overworldWeatherDone` is never even set. Cited in the port at `:433-436` |
| 1.7 | `ABILITYEFFECT_SWITCH_IN_WEATHER` runs **between** the sort and the ON_SWITCHIN scan (`:3863-3868`) | port comment `:433-436`, no code | UNREACHABLE-IN-SINGLES-FACTORY (same cite as 1.6) |
| 1.8 | ON_SWITCHIN scan, fastest→slowest, `while (switchInAbilitiesCounter < gBattlersCount)`, yielding on the first `effect != 0` (`:3869-3879`) | `:440-463` `for (const battler of turnOrder)` | SAME-ORDER |
| 1.9 | ON_SWITCHIN / `ABILITY_INTIMIDATE`: sets `gStatuses3[b] |= STATUS3_INTIMIDATE_POKES` and `gSpecialStatuses[b].intimidatedMon = 1`, **`effect` stays 0** so the scan does not yield (`battle_util.c:2559-2565`) | `:442-449` sets `STATUS3_INTIMIDATE_POKES` and `continue`s | SAME-ORDER. The `intimidatedMon` guard bit has no port field; harmless here because `SpecialStatusesClear()` (`battle_main.c:3902`) wipes it before turn 1 and the only other reader is `Cmd_switchineffects` (switch-lifecycle audit's slice) |
| 1.10 | ON_SWITCHIN / `ABILITY_TRACE`: `STATUS3_TRACE` + `traced = 1`, `effect` stays 0 (`battle_util.c:2575-2581`) | `:450-457` | SAME-ORDER |
| 1.11 | ON_SWITCHIN / Drizzle · Sand Stream · Drought · Forecast · Cloud Nine · Air Lock — the six cases that *do* `effect++` and yield (`battle_util.c:2532-2558`, `:2566-2598`) | `:458-462` `BATTLE_START_HOOK_ABILITIES = {2,13,22,36,45,59,70,77}` → `runSharedOnSwitchinDispatch` at `:265`, which re-enters the committed `Cmd_switchineffects` ON_SWITCHIN dispatch | SAME-ORDER at this seam. The ability IDs are re-derived from `include/constants/abilities.h`: DRIZZLE 2, CLOUD_NINE 13, INTIMIDATE 22, TRACE 36, SAND_STREAM 45, FORECAST 59, DROUGHT 70, AIR_LOCK 77 — the set is exactly the source's inner-switch labels. Per-ability bodies are the 2026-08-25 ability-activation audit's slice (declared NOT read) |
| 1.12 | `if (gBattlerAttacker >= gBattlersCount) gBattlerAttacker = battler;` at the head of ON_SWITCHIN (`battle_util.c:2486-2487`) | `:391` seeds `selectorRoles.attacker = 0` | SAME — `BattleStartClearSetData:3073` leaves `gBattlerAttacker = 0`, and `0 < gBattlersCount(2)`, so the source branch never fires in singles |
| 1.13 | `ABILITYEFFECT_INTIMIDATE1` loop: **battler-index** order `i = 0..gBattlersCount`, clears the pending bit, `BattleScriptPushCursorAndCallback(BattleScript_IntimidateActivatesEnd3)`, `intimidateBattler = i`, `break` after the FIRST match, `effect++` → yield (`battle_util.c:3003-3016`), and `TryDoEventsBeforeFirstTurn` re-enters and re-runs the loop for the next holder (`battle_main.c:3880-3881`) | `:467-492` `for (const battler of [0,1])`, one script run per pending holder | SAME-ORDER (the source's break-and-re-enter and the port's forward loop visit the same battlers in the same order, because each pass clears its own pending bit) |
| 1.14 | the INTIMIDATE1 dispatch passes the **literal 0** as `battler` (`battle_main.c:3880`), so `AbilityBattleEffects`' record tail `RecordAbilityBattle(battler, gLastUsedAbility)` lands on battler 0 whoever actually holds Intimidate | `:484` `recordBattleScriptAbilityReveal(ctx, 0, INTIMIDATE_ID)` | SAME — ISSUES #128's tail, verified 2026-08-25; re-checked only for its position in the order, per brief |
| 1.15 | `ABILITYEFFECT_TRACE` loop, battler-index order, singles branch copies `gBattleMons[target1].ability` when `ability != 0 && hp != 0`, sets `gBattleScripting.battler = i`, buffers nick+ability, yields (`battle_util.c:3017-3073`; `battle_main.c:3882-3883`) | `:493-523` | SAME-ORDER, including the `copiedAbility === 0 || hp === 0` bail (`:502`) and the same literal-0 record (`:519`). The doubles `Random() & 1` target pick at `battle_util.c:3031` is **UNREACHABLE-IN-SINGLES** (guarded by `gBattleTypeFlags & BATTLE_TYPE_DOUBLE`, `:3026`) |
| 1.16 | Intimidate runs **entirely after** every battler's ON_SWITCHIN, and Trace **entirely after** every Intimidate (`:3880` then `:3882`) — not interleaved into the speed scan | `:440-463` then `:467-492` then `:493-523` | SAME-ORDER — this is the ordering the port's `:258-264` comment claims, and it holds |
| 1.17 | `ITEMEFFECT_ON_SWITCH_IN` loop, fastest→slowest, own counter `switchInItemsCounter`, yields on first effect (`:3884-3894`) | `:529-548` `for (const battler of turnOrder)` | SAME-ORDER |
| 1.18 | the item loop's body: `ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN, ...)` (`battle_util.c:3303-3329`) — Double Prize bookkeeping + White Herb | `:531-547` White Herb only (`ITEM_WHITE_HERB = 180`, `:50`) | SAME-ORDER-EQUIVALENT: the source's other `ITEMEFFECT_ON_SWITCH_IN` branch is `HOLD_EFFECT_DOUBLE_PRIZE` → `gBattleStruct->moneyMultiplier = 2`, which is unread under `BATTLE_TYPE_FRONTIER` (no prize money path) |
| 1.19 | `effect` is **not** reset between the ability scan and the item scan (`:3845` declares it once), so an ability that fired earlier in this same pass makes the FIRST item-loop iteration yield immediately | port has no shared `effect` accumulator | DIVERGENT-BENIGN: the extra yield only costs a re-entry; the item counter still advances one battler per pass and every battler is still visited in the same order, and the intervening script is the one that already ran. No draw, no state, no order changes |
| 1.20 | `monToSwitchIntoId[i] = PARTY_SIZE`, `gChosenActionByBattler[i] = B_ACTION_NONE`, `gChosenMoveByBattler[i] = MOVE_NONE`, `i < MAX_BATTLERS_COUNT` (**4**, not `gBattlersCount`) (`:3895-3900`) | `:557-563` `createFactoryFullTurnBattleStateFromRulesContext` publishes a fresh `awaiting-player-command` state whose four battler slots (`:383-388`, two real + two `createFactoryEmptyBattlerState`) carry no chosen action/move | SAME-ORDER-EQUIVALENT |
| 1.21 | `TurnValuesCleanUp(FALSE)` (`:3901` → `:4857-4892`): full `ProtectStruct` memset, `isFirstTurn--` (2→1), `rechargeTimer--`, substitute-status2 sync, both `followmeTimer = 0` | `:155` `isFirstTurn: 1` written directly at construction, with the `:153-154` comment citing `:4875-4876` | SAME for the value. The **later** `isFirstTurn` decay is `docs/end-turn-ordering-audit-2026-08-25.md`'s finding 2 (DIVERGENT, the tail `TurnValuesCleanUp(FALSE)` never decrements) — cross-referenced, not re-counted here |
| 1.22 | `SpecialStatusesClear()` (`:3902` → `:4894-4904`) | fresh construction; no `gSpecialStatuses` mirror survives `initializeFreshFactoryBattle` | SAME-ORDER-EQUIVALENT |
| 1.23 | `gBattleStruct->absentBattlerFlags = gAbsentBattlerFlags` (`:3903`) | `:426` `absentBattlerFlags: 0` | SAME (both actives alive at battle start; `gAbsentBattlerFlags` is 0 out of `BattleStartClearSetData`) |
| 1.24 | `BattlePutTextOnWindow(gText_EmptyString3, B_WIN_MSG)` (`:3904`) | none | SAME-ORDER-EQUIVALENT (presentation; Battle Scene OFF) |
| 1.25 | `gBattleMainFunc = HandleTurnActionSelectionState` (`:3905`) | `:665` `phase: "awaiting-player-command"` + `:673-679` the `command` request | SAME-ORDER — this is the handoff, and the port publishes it as the durable first request |
| 1.26 | `ResetSentPokesToOpponentValue()` (`:3906`) | none | SAME-ORDER-EQUIVALENT — `gSentPokesToOpponent` is provably unread under `BATTLE_TYPE_FRONTIER`; already established as row H2 of `docs/end-turn-ordering-audit-2026-08-25.md` §5 |
| 1.27 | `gBattleCommunication[i] = 0` for all `BATTLE_COMMUNICATION_ENTRIES_COUNT` (`:3908-3909`) | `:400-401` `moveEffectByte: 0`, `missType: 0` (the two `gBattleCommunication` slots the port models) | SAME-ORDER-EQUIVALENT |
| 1.28 | `gBattleMons[i].status2 &= ~STATUS2_FLINCHED` (`:3911-3912`) | fresh battlers carry `status2 = 0` | SAME |
| 1.29 | `turnEffectsTracker`/`turnEffectsBattlerId`/`wishPerishSongState`/`wishPerishSongBattlerId`/`moveendState`/`faintedActionsState`/`turnCountersTracker`/`gMoveResultFlags` all zeroed (`:3914-3921`) | `:398` `moveResultFlags: 0`; the end-turn cursors do not exist in the port (it never yields mid-pass — end-turn audit's outer-chain row 1) | SAME-ORDER-EQUIVALENT |
| 1.30 | `gRandomTurnNumber = Random()` — **draw B**, the last thing before the ARENA branch (`:3923`) | `:551` `const drawB = randomU16(rngBeforeB)`, then `:552-555` publishes it as `randomTurnNumber` | SAME-ORDER — and critically it is drawn AFTER every switch-in hook script, so a hook that itself consumed RNG would shift it. The port asserts exactly that: `runEntryScript` throws if a lifecycle script consumes battle RNG (`:242-244`, `:307-309`, `:320-322`) |
| 1.31 | `gBattleTypeFlags & BATTLE_TYPE_ARENA` → `StopCryAndClearCrySongs()` + `BattleScriptExecute(BattleScript_ArenaTurnBeginning)` (`:3925-3929`) | none | UNREACHABLE-IN-SINGLES: `BATTLE_TYPE_ARENA` is set only by the Battle Arena facility (`src/battle_arena.c`); the Factory sets `BATTLE_TYPE_FRONTIER \| BATTLE_TYPE_TRAINER` (`src/battle_factory.c`), mirrored by `FACTORY_RUN_AWAY_NOOP_INVARIANT.battleTypeFlags` (`factoryBattleScriptFullTurnDecision.ts:239`) |
| 1.32 | RNG cost of the whole function: 1 draw (`:3923`) + 0-or-1 tie draw in the sort, on top of `BattleStartClearSetData`'s 1 | `:560` `rngCalls: preCommandRngCalls + (tieDraw === null ? 2 : 3)` | SAME — 2 or 3, matching draw A + optional tie + draw B |

## §2. Action selection — `HandleTurnActionSelectionState` (`battle_main.c:4129-4552`)

**The state enum** (`battle_main.c:4116-4127`, values re-derived by position):
`STATE_TURN_START_RECORD 0, STATE_BEFORE_ACTION_CHOSEN 1, STATE_WAIT_ACTION_CHOSEN 2,
STATE_WAIT_ACTION_CASE_CHOSEN 3, STATE_WAIT_ACTION_CONFIRMED_STANDBY 4, STATE_WAIT_ACTION_CONFIRMED 5,
STATE_SELECTION_SCRIPT 6, STATE_WAIT_SET_BEFORE_ACTION 7, STATE_SELECTION_SCRIPT_MAY_RUN 8`.

**The fact that sets the whole shape (row 2.8).** Each battler's state machine advances behind
`IS_BATTLE_CONTROLLER_ACTIVE_OR_PENDING_SYNC_ANYWHERE(gActiveBattler)`, and despite the name that macro
tests only **this battler's** bit, replicated across the four player slots, plus the link-sync nibble
`0xF << 28` (`include/battle_controllers.h:102-109`). In a local Factory battle nibbles 1-3 and the
link nibble are always 0, so battler 1 never waits on battler 0. Battler 1's controller
(`OpponentHandleChooseAction` / `OpponentHandleChooseMove`) completes in the same frame it is marked,
while battler 0's player controller is still sitting in the action menu. **The AI's entire decision —
`AI_TrySwitchOrUseItem` then `BattleAI_ChooseMoveOrAction` — is therefore already committed before the
player presses anything.** This is exactly why the battle-lab checkpoint sits *inside* turn 1's action
selection with the AI already resolved, and why a `mechanicLab` fixture must window turn 2+ to observe
an AI decision's draws.

**Port sites.** `factoryBattleScriptFullTurnDecision.ts:2853` `reduceFactoryFullTurnDecision`
(the `awaiting-player-command` → `awaiting-trainer-command` two-request handshake),
`:2104` `legalCommandDecisions` / `:1994` `legalMoveDecisions` / `:2166` `lockedMoveDecision` /
`:2067` `isVoluntarySwitchTrapped` (the selection-legality projection),
`battleScriptActionAdmission.ts:2530` `checkBattleScriptMoveLimitations` (`CheckMoveLimitations`),
`battleDecisionBoundary.ts:658-690` `submitBattleDecision` (the membership validator),
`factoryAiLiveDriver.ts:468` `submitLiveFactoryAiDecision` (the controller seam).

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| 2.1 | `gBattleCommunication[ACTIONS_CONFIRMED_COUNT] = 0` then `for (gActiveBattler = 0; < gBattlersCount)` — re-zeroed and re-walked on EVERY frame (`:4133-4134`) | no frame loop; the port is request/response | SAME-ORDER-EQUIVALENT (the counter is a per-frame tally, not carried state) |
| 2.2 | `STATE_TURN_START_RECORD` → `RecordedBattle_CopyBattlerMoves()`, state→1 (`:4139-4142`) | none | UNREACHABLE-IN-SINGLES-FACTORY *as a state*: `gBattleCommunication[]` is zeroed at `:3908-3909` and `:3939-3940`, so every battler enters at state 0 and this case runs once per turn; but its body is a no-op outside `BATTLE_TYPE_RECORDED` (`src/recorded_battle.c`, `RecordedBattle_CopyBattlerMoves` early-returns on `gBattleTypeFlags & BATTLE_TYPE_RECORDED`). SAME-ORDER-EQUIVALENT for the state transition |
| 2.3 | `STATE_BEFORE_ACTION_CHOSEN`: `monToSwitchIntoId[gActiveBattler] = PARTY_SIZE` — per battler, every turn, before anything else (`:4144`) | the port carries no `monToSwitchIntoId` field; the switch target rides the `BattleSwitchDecision.partyIndex` in the request | SAME-ORDER-EQUIVALENT. ISSUES #121's dormant coupled pair and the two `PARTY_SIZE` premise throws are **not** re-litigated (see the switch-lifecycle audit §3) |
| 2.4 | the entry gate `MULTI \|\| (position & BIT_FLANK) == B_FLANK_LEFT \|\| partner absent \|\| partner confirmed` (`:4145-4148`) | none | SAME-ORDER-EQUIVALENT — **both** singles battlers pass on the second disjunct: `BIT_FLANK == 2` and `B_FLANK_LEFT == 0` (`include/constants/battle.h:52,56`), and singles positions are 0 (`B_POSITION_PLAYER_LEFT`) and 1 (`B_POSITION_OPPONENT_LEFT`), so `position & 2 == 0` for both. (Reading `BIT_FLANK` as 1 would wrongly exclude battler 1 — re-derived from the header, not assumed) |
| 2.5 | absent battler → `gChosenActionByBattler = B_ACTION_NOTHING_FAINTED`, state→`STATE_WAIT_ACTION_CONFIRMED` (`:4150-4157`) | none | UNREACHABLE at this seam in singles: `gBattleStruct->absentBattlerFlags` is only set for a battler whose whole party is out, and `HandleFaintedMonActions` has already replaced any fainted single before selection resumes (faint-replacement audit §2) |
| 2.6 | `STATUS2_MULTIPLETURNS \|\| STATUS2_RECHARGE` → `gChosenActionByBattler = B_ACTION_USE_MOVE` and jump straight to `STATE_WAIT_ACTION_CONFIRMED_STANDBY` — **no menu, no controller, no `chosenMovePositions` write** (`:4160-4165`) | `:2166` `lockedMoveDecision`'s `statusLock` branch (`:2171-2200`) publishes exactly one legal decision, whose `moveSlot` is the banked `chosenMovePositions[battler]` (`:2190`) and whose move is `gLockedMoves[battler]` (`:2189`) | SAME-ORDER. The port ALSO short-circuits the whole trainer request when the trainer is locked (`:2874-2891`), matching the source's auto-confirm — no AI draw is spent, which is right: `OpponentHandleChooseAction` is never emitted for a locked battler |
| 2.7 | otherwise `BtlController_EmitChooseAction` + `MarkBattlerForControllerExec`, state++ (`:4168-4170`) | `:2892-2905` publishes the trainer `command` request; `factoryAiLiveDriver.ts:476-482` requires exactly that boundary | SAME-ORDER |
| 2.8 | `STATE_WAIT_ACTION_CHOSEN` idle gate — **per-battler bit only** (`:4176`, macro at `include/battle_controllers.h:102-109`) | the port asks the player first, then the trainer (`:2861-2906` then `:2908`) | **DIVERGENT-BENIGN (ordering of *prompts*, not of *effects*)**: the ROM resolves the AI first (see the boxed note above), the port prompts the player first. No RNG draw and no readable battle state is written by the player's selection, and the port's RNG sequence still runs [AI switch draws → AI move draws → turn-order tie draw], identical to the ROM's. Benign **only** under the current adapter, where the player decision is supplied by a caller that cannot observe the AI's choice; a UI that showed the player the AI's committed move would be a real leak |
| 2.9 | `RecordedBattle_SetBattlerAction` then `gChosenActionByBattler[b] = gBattleBufferB[b][1]` (`:4178-4179`) | `:3019-3027` `withTurnOrderPositions(..., [playerAction, trainerAction, USE_MOVE, USE_MOVE])` banks the same two values, read back by `ENDTURN_ORDER` | SAME-ORDER-EQUIVALENT (banked at turn-setup rather than at selection; nothing between the two points reads it) |
| 2.10 | `B_ACTION_USE_MOVE` → **`AreAllMovesUnusable()` is tested FIRST** (`:4184`) → `noValidMoves = TRUE`, `BattleScript_NoMovesLeft`, `stateIdAfterSelScript = STANDBY`, `moveTarget[b] = bufferB[3]`, and the chosen slot is left at whatever `chosenMovePositions[b]` already held (`battle_util.c:1125-1140`) | `:2148` `battlerUsesForcedStruggle` = `(checkBattleScriptMoveLimitations(...) & 0x0f) === 0x0f`, and `:2008-2015` publishes the banked slot with Struggle's target | SAME for the mask and the banked slot — **but see 2.11 for the guard order** |
| 2.11 | **`else if (gDisableStructs[b].encoredMove != 0)` is tested SECOND** (`:4192-4198`), i.e. Encore only auto-confirms when `AreAllMovesUnusable()` was FALSE | `:1998-1999` `legalMoveDecisions` consults `lockedMoveDecision` **before** the limitation mask, and `:2152` makes `battlerUsesForcedStruggle` return `false` outright whenever a lock exists | **DIVERGENT — finding 1** (see §6) |
| 2.12 | otherwise build `moveInfo` (species, both types, four moves, `pp[i]`, `CalculatePPWithBonus`) and `BtlController_EmitChooseMove` (`:4201-4218`) | `:1994` `legalMoveDecisions` publishes one `use-move` decision per unmasked slot, with `sourceMoveTarget` (`:1959`) as the target | SAME-ORDER-EQUIVALENT: the port pre-filters what the source would have rejected on confirm (2.24). `CalculatePPWithBonus` is a display-only field of `moveInfo` (the engine reads `gBattleMons[].pp` directly) |
| 2.13 | `B_ACTION_USE_ITEM` under `BATTLE_TYPE_FRONTIER_NO_PYRAMID` → `BattleScript_ActionSelectionItemsCantBeUsed`, state→`STATE_SELECTION_SCRIPT`, `stateIdAfterSelScript = STATE_BEFORE_ACTION_CHOSEN` (re-prompt) (`:4221-4233`) | `:242` `legalDecisionKinds: ["use-move", "switch"]` — the bag command is never published | SAME-ORDER-EQUIVALENT. `BATTLE_TYPE_FRONTIER_NO_PYRAMID` includes `BATTLE_TYPE_FACTORY` (`include/constants/battle.h:92`), so the refusal is unconditional in the Factory: **the player can never use an item, and `HandleAction_UseItem` is unreachable from the player side** (§4 row 4.24) |
| 2.14 | `B_ACTION_SWITCH` → `gBattleStruct->battlerPartyIndexes[b] = gBattlerPartyIndexes[b]` (the *outgoing* index, saved for `PREPARE_MON_NICK_BUFFER` in `HandleAction_Switch`) (`:4241`) | switch-lifecycle audit §1 owns this row | cross-reference |
| 2.15 | `B_ACTION_SWITCH` trap check 1: `STATUS2_WRAPPED \| STATUS2_ESCAPE_PREVENTION \|\| ARENA \|\| STATUS3_ROOTED` → `PARTY_ACTION_CANT_SWITCH` (`:4242-4247`) | `:2072-2077` `isVoluntarySwitchTrapped` — same three tests, ARENA omitted (unreachable, §1 row 1.31) | SAME |
| 2.16 | `B_ACTION_SWITCH` trap check 2: Shadow Tag, then Arena Trap (with the Flying-type / Levitate exception), then Magnet Pull (Steel only) — evaluated in that order via short-circuit `\|\|` (`:4248-4256`) | `:2086-2095` — same three, same order, same exceptions; ability IDs re-derived at `:205-210` (SHADOW_TAG 23, LEVITATE 26, MAGNET_PULL 42, ARENA_TRAP 71 — matches `include/constants/abilities.h`) | SAME. The port additionally short-circuits when the would-be trapper is fainted/absent (`:2080-2085`); the source's `ABILITY_ON_OPPOSING_FIELD` scans do not test HP, but a fainted single is always replaced before selection, so the two agree on every reachable state |
| 2.17 | `gActiveBattler == 2 && gChosenActionByBattler[0] == B_ACTION_SWITCH` (and the 3/1 twin) → pass the partner's `monToSwitchIntoId` so the party menu greys it out (`:4259-4262`) | none | UNREACHABLE-IN-SINGLES (`gBattlersCount == 2`, battlers 2 and 3 do not exist) |
| 2.18 | `B_ACTION_SAFARI_BALL` / `B_ACTION_SAFARI_POKEBLOCK` / `B_ACTION_CANCEL_PARTNER` cases (`:4268-4319`) | none | UNREACHABLE-IN-SINGLES-FACTORY: Safari cases need `BATTLE_TYPE_SAFARI`; `B_ACTION_CANCEL_PARTNER` is emitted only by `HandleInputChooseAction`'s doubles branch (`battle_controller_player.c`, `B_ACTION_CANCEL_PARTNER` guarded by `gBattleTypeFlags & BATTLE_TYPE_DOUBLE`) |
| 2.19 | RUN refusal 1 — `TRAINER && (FRONTIER \| TRAINER_HILL) && bufferB[1] == B_ACTION_RUN` → `BattleScript_AskIfWantsToForfeitMatch`, `STATE_SELECTION_SCRIPT_MAY_RUN`, re-prompt on decline (`:4322-4331`) | `:221-243` `FACTORY_RUN_AWAY_NOOP_INVARIANT` documents exactly this precedence and removes the flee command from the surface | SAME-ORDER-EQUIVALENT. This branch **shadows** the next two: in the Factory a RUN never reaches them |
| 2.20 | RUN refusal 2 — plain `TRAINER` non-link → `BattleScriptExecute(BattleScript_PrintCantRunFromTrainer)`, state reset to `STATE_BEFORE_ACTION_CHOSEN` (`:4332-4338`) | none | UNREACHABLE-IN-SINGLES-FACTORY (shadowed by 2.19 — `BATTLE_TYPE_FRONTIER` is always set) |
| 2.21 | RUN refusal 3 — `IsRunningFromBattleImpossible() != BATTLE_RUN_SUCCESS` → `BattleScript_PrintCantEscapeFromBattle`, `STATE_SELECTION_SCRIPT` (`:4339-4347`) | none | UNREACHABLE-IN-SINGLES-FACTORY (same shadow). Its `ABILITY_RUN_AWAY` / trapping-ability body (`battle_main.c:4030-4060`) is therefore **not** the Factory's run legality — the port's `:224-232` comment states this and it is correct |
| 2.22 | otherwise `gBattleCommunication[b]++` → `STATE_WAIT_ACTION_CASE_CHOSEN` (`:4348-4351`) | implicit | SAME-ORDER |
| 2.23 | `STATE_WAIT_ACTION_CASE_CHOSEN` / `B_ACTION_USE_MOVE`, buffer values 3-9 → `gChosenActionByBattler = bufferB[1]` and `return` (the "the controller changed its mind" escape: RUN, item, Safari, `B_ACTION_UNK_15`) (`:4362-4370`) | `factoryAiLiveDriver.ts:523-527` maps the AI result onto `use-move` decisions only; a `switch` result is taken at `:494-518` | SAME-ORDER-EQUIVALENT for the two reachable values (see 2.35) |
| 2.24 | value 15 → `gChosenActionByBattler = B_ACTION_SWITCH` + `UpdateBattlerPartyOrdersOnSwitch()` (`:4371-4374`) | `factoryAiLiveDriver.ts:494-518` | SAME-ORDER — this is the AI's *move-phase* switch escape (`AI_CHOICE_...` case 6 → `B_ACTION_UNK_15`, `battle_controller_opponent.c:1577-1579`) |
| 2.25 | default → `bufferB[2] \| (bufferB[3] << 8) == 0xFFFF` → cancel back to `STATE_BEFORE_ACTION_CHOSEN` (`:4377-4381`) | none | UNREACHABLE from the AI controller (it never emits 0xFFFF); the player's B-press cancel is a UI affordance the request/response boundary expresses by simply not submitting |
| 2.26 | `TrySetCantSelectMoveBattleScript()` → selection script, `stateIdAfterSelScript = STATE_WAIT_ACTION_CHOSEN` (re-prompt the move menu) (`:4382-4390`; body at `battle_util.c:976-1080`) | `:1994` pre-filter + `:2042` `legalMoveSelectionRejections` (advisory mirror) | SAME-ORDER-EQUIVALENT for *outcome*. The two source functions do not test the same set: `TrySetCantSelectMoveBattleScript` checks Disable, Torment, Taunt, Imprison, Choice Band, PP=0 (`battle_util.c:983/999/1014/1029/1051/1066`) and **not** Encore or the empty slot, while `CheckMoveLimitations` checks all eight (`:1095-1121`). The port projects the *superset* (`CheckMoveLimitations`), which is right because the two extra bits are unreachable at the menu: an empty slot is not selectable and Encore never shows the menu (2.11) |
| 2.27 | `chosenMovePositions[b] = bufferB[2]`; `gChosenMoveByBattler[b] = moves[chosenMovePositions[b]]`; `moveTarget[b] = bufferB[3]`; state++ (`:4398-4401`) | `:2930-2967` derives `playerMoveSlot`/`trainerMoveSlot`, `actionMoveId` (`:2208`), and `playerTarget`/`trainerTarget` from the submitted decisions | SAME-ORDER. Note `gChosenMoveByBattler` is read back by `GetWhoStrikesFirst`'s "was the slot overwritten" check (`battle_main.c:4702`) and by `HandleAction_UseMove:130` — §3 row 3.14 and §4 row 4.7 |
| 2.28 | `B_ACTION_USE_ITEM` case: zero item → re-prompt, else `gLastUsedItem` (`:4406-4416`) | none | UNREACHABLE-IN-SINGLES-FACTORY from the player (2.13). Reachable from the **AI** only via `AI_TrySwitchOrUseItem`'s item branch, which is gated on `BATTLE_TYPE_TRAINER && !FRONTIER` (`battle_ai_switch_items.c`'s `ShouldUseItem` early return) — declared UNREACHABLE, cited in §4 row 4.24 |
| 2.29 | `B_ACTION_SWITCH` case: `bufferB[1] == PARTY_SIZE` → cancel/re-prompt; else `UpdateBattlerPartyOrdersOnSwitch()` → `monToSwitchIntoId[b] = bufferB[1]` (`:4417-4427`, helper at `:4570-4585`) | switch-lifecycle audit §1 owns the `monToSwitchIntoId` write | cross-reference. The link/multi `battlerPartyOrders` nibble packing at `:4575-4584` is UNREACHABLE-IN-SINGLES (`BATTLE_TYPE_LINK && BATTLE_TYPE_MULTI`) |
| 2.30 | `B_ACTION_RUN` → `gHitMarker \|= HITMARKER_RUN`, state++ (`:4429-4432`) | none | UNREACHABLE-IN-SINGLES-FACTORY (2.19). `HITMARKER_RUN` is the flag `CheckFocusPunch_ClearVarsBeforeTurnStarts:4908` reads to skip the Focus Punch scan — §3 row 3.19 |
| 2.31 | `STATE_WAIT_ACTION_CONFIRMED_STANDBY` → `AllAtActionConfirmed()`, `BtlController_EmitLinkStandbyMsg(...STOP_BOUNCE...)`, state++ (`:4458-4479`) | none | SAME-ORDER-EQUIVALENT (presentation: it stops the action-menu bounce animation; Battle Scene OFF). `AllAtActionConfirmed` (`:4554-4568`) only feeds that message's argument |
| 2.32 | `STATE_WAIT_ACTION_CONFIRMED` → `gBattleCommunication[ACTIONS_CONFIRMED_COUNT]++` (`:4480-4485`) | `:2879-2891` / `:2908` — the port's terminal condition is "both decisions submitted" | SAME-ORDER-EQUIVALENT |
| 2.33 | `STATE_SELECTION_SCRIPT` — runs `gSelectionBattleScripts[b]` **one opcode per frame**, `gBattlerAttacker = gActiveBattler`, then hands back to `stateIdAfterSelScript` when `selectionScriptFinished` (`:4486-4501`) | none — the port never runs a selection script, because it never publishes an illegal decision | SAME-ORDER-EQUIVALENT for the reachable Factory set. **Note the `gBattlerAttacker = gActiveBattler` write at `:4493`**: a selection script leaves `gBattlerAttacker` pointing at the *last battler that had one*, and nothing before `HandleAction_UseMove:83` rewrites it. Harmless because `:83` unconditionally reassigns it |
| 2.34 | `STATE_WAIT_SET_BEFORE_ACTION` → back to `STATE_BEFORE_ACTION_CHOSEN` (`:4502-4507`) | none | UNREACHABLE-IN-SINGLES (only `B_ACTION_CANCEL_PARTNER` sets it, `:4283`) |
| 2.35 | `STATE_SELECTION_SCRIPT_MAY_RUN` — the forfeit prompt's YES branch (`bufferB[1] == B_ACTION_NOTHING_FAINTED`) sets `HITMARKER_RUN` + `B_ACTION_RUN` + STANDBY; NO re-prompts (`:4508-4533`) | none | UNREACHABLE at this adapter's boundary — the forfeit UI is outside `BattleCommandDecision` by construction (`:234-242`). Declared, not a divergence |
| 2.36 | exit: `ACTIONS_CONFIRMED_COUNT == gBattlersCount` → `RecordedBattle_CheckMovesetChanges(RECORDING)`, `gBattleMainFunc = SetActionsAndBattlersTurnOrder` (`:4538-4541`) | `:2969` (the turn-order block runs immediately after the trainer's decision is validated) | SAME-ORDER |
| 2.37 | `BATTLE_TYPE_INGAME_PARTNER` → `SwitchPartyOrderInGameMulti` (`:4543-4550`) | none | UNREACHABLE-IN-SINGLES-FACTORY (flag set only by the Steven multi battle) |
| 2.38 | opponent controller, action phase: `OpponentHandleChooseAction` = `AI_TrySwitchOrUseItem(); OpponentBufferExecCompleted();` — the switch/item decision is made **here**, in the action phase, before any move scoring (`battle_controller_opponent.c:1540-1544`) | `factoryAiLiveDriver.ts:490-518` `evaluateFactoryAiSwitchPolicy` runs first and, if it selects a party index, submits a `switch` without ever calling the move chooser | SAME-ORDER (scoring internals declared out of scope) |
| 2.39 | opponent controller, move phase: `BattleAI_SetupAIData(ALL_MOVES_MASK)` then `BattleAI_ChooseMoveOrAction()` (`:1566-1567`), then the target write and `EmitTwoReturnValues(B_ACTION_EXEC_SCRIPT, chosenMoveId \| (gBattlerTarget << 8))` (`:1589`) | `factoryAiLiveDriver.ts:533-557` `selectFactoryAiMask` → `chooseFactoryAiScoredDecision` / `chooseFactoryAiMaskZeroDecision`, submitted through the kernel's own request (`:558-562`) so legality stays kernel-owned | SAME-ORDER at the seam. What it *writes* is the move **slot index** (not the move id) and `gBattlerTarget`; the port's `BattleMoveDecision` carries `moveSlot` + `targetBattler`, the same two values |
| 2.40 | the move phase's target fixups: `MOVE_TARGET_USER_OR_SELECTED \| MOVE_TARGET_USER` → self; `MOVE_TARGET_BOTH` → `B_POSITION_PLAYER_LEFT` (`:1581-1588`) | `:1959` `sourceMoveTarget` — `MOVE_TARGET_USER` → attacker, everything else → the sole opposing battler | SAME in singles. `MOVE_TARGET_BOTH`'s absent-fallback at `:1586-1587` is UNREACHABLE (no `B_POSITION_PLAYER_RIGHT` battler) |
| 2.41 | `AI_CHOICE_WATCH` → `B_ACTION_SAFARI_WATCH_CAREFULLY`, `AI_CHOICE_FLEE` → `B_ACTION_RUN` (`:1571-1576`) | none | UNREACHABLE-IN-SINGLES-FACTORY: both are produced only by `AI_FLAG_*` scripts the Factory never sets — `BattleAI_ChooseMoveOrAction` returns them from `ChooseMoveOrAction_Singles`' `AI_CHOICE_FLEE` path, gated on `gBattleTypeFlags & BATTLE_TYPE_ROAMER`-style wild flags (`battle_ai_main.c`). The Factory's `BATTLE_TYPE_TRAINER` branch at `:1563` is entered, but the FLEE/WATCH return values require a wild battler |
| 2.42 | the non-trainer random move fallback `do { chosenMoveId = MOD(Random(), MAX_MON_MOVES); } while (move == MOVE_NONE)` — an unbounded draw loop (`:1597-1601`) | none | UNREACHABLE-IN-SINGLES-FACTORY: the `else` at `:1594` requires `!(gBattleTypeFlags & (TRAINER \| FIRST_BATTLE \| SAFARI \| ROAMER))`, and the Factory always sets `BATTLE_TYPE_TRAINER` (`FACTORY_RUN_AWAY_NOOP_INVARIANT.battleTypeFlags`, `:241`). Worth naming because it is the only RNG loop in the controller |
| 2.43 | `OpponentHandleChoosePokemon`: reuse `AI_monToSwitchIntoId[b]` if already set, else `GetMostSuitableMonToSwitchInto()`, else the first-alive linear fallback (`:1621-1665`) | `factoryAiLiveDriver.ts:490-501` + `battleAiSwitchInto.ts` (call site only, per brief) | cross-reference — faint-replacement audit §3 owns the `AI_monToSwitchIntoId` reuse and its draw census |

## §3. Turn order — `SetActionsAndBattlersTurnOrder` (`battle_main.c:4756-4855`) + `GetWhoStrikesFirst` (`:4595-4754`)

**Port sites.** `src/engine/turnOrder.ts` (`effectiveSpeed:47`, `isSpeedTie:77`, `getWhoStrikesFirst:100`,
`sortBattlersByTurnOrder:128`); its two input builders `battleEndTurnOrchestration.ts:2119`
`turnOrderWeather` / `:2138` `turnOrderBattlerInputs` / `:2107` `movePriority`; and the two callers —
`factoryBattleScriptFullTurnDecision.ts:2969-2992` (the *action* order, this section) and
`battleEndTurnOrchestration.ts:2208` `computeBattlerOrder` (`ENDTURN_ORDER`'s independent re-sort,
end-turn audit's slice, receipted at `tools/probe/receipts/issue131-endturn-order-off.json`).
`sortBattlersByTurnOrder` itself has **no production caller** — `grep -rn sortBattlersByTurnOrder src/ tests/`
returns `turnOrder.ts` plus `tests/turnOrder.test.ts` and `tests/turnOrderParity.test.ts` only.
Not a divergence, but it means the N-battler bubble sort is pinned only by tests; the shipped singles
path is the inline pairwise call at `:2984`.

**The switch/item/run insertion is cross-referenced, not repeated.** `docs/switch-lifecycle-audit-2026-08-26.md`
§1 covers the SWITCH case in 9 rows. Rows 3.1-3.4 below record only the facts §3 needs.

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| 3.1 | `BATTLE_TYPE_SAFARI` → straight identity fill, no sort (`:4761-4769`) | none | UNREACHABLE-IN-SINGLES-FACTORY |
| 3.2 | run-first: non-link branch tests `gChosenActionByBattler[0]` then `[2]`, second wins, `turnOrderId = 5` (`:4785-4794`); then the runner takes slot 0 and everyone else follows in ascending index, `gBattleMainFunc = CheckFocusPunch_...`, **early return with no sort at all** (`:4797-4814`) | none | UNREACHABLE-IN-SINGLES-FACTORY — a Factory RUN never survives selection (§2 rows 2.19/2.30). Note the source quirk anyway: it reads index **2**, not 1, so in singles only battler 0 could ever be the runner |
| 3.3 | item/switch actions inserted first, ascending `gActiveBattler` (`:4817-4825`) | `:2970-2975` `playerFirst = playerSwitch` | SAME — enumerated: both switch → `[0,1]`; player only → `[0,1]`; trainer only → `[1,0]`. Matches ascending-index insertion in every case |
| 3.4 | remaining actions appended, ascending `gActiveBattler` (`:4826-4834`) | same | SAME |
| 3.5 | the bubble sort `for (i) for (j > i)`, **skipped entirely for any pair where either action is `B_ACTION_USE_ITEM` or `B_ACTION_SWITCH`** (`:4835-4850`) | `:2970-2976` — the `if (playerSwitch \|\| trainerSwitch)` branch never calls `getWhoStrikesFirst`, so it never draws | SAME, including the **no tie draw on a switch turn**. This is the RNG-ledger fact that matters: a turn where either side switches costs zero turn-order draws |
| 3.6 | `GetWhoStrikesFirst`'s weather gate `if (WEATHER_HAS_EFFECT)` else both multipliers = 1 (`:4604-4622`) | `turnOrderWeather` at `battleEndTurnOrchestration.ts:2119-2125` returns `{}` when `!weatherHasEffect` | SAME. `WEATHER_HAS_EFFECT` is `!ABILITY_ON_FIELD(ABILITY_CLOUD_NINE) && !ABILITY_ON_FIELD(ABILITY_AIR_LOCK)` (`include/battle_util.h:47`) — both checked. AIR_LOCK's only carrier is Rayquaza, not a rental; CLOUD_NINE is |
| 3.7 | Swift Swim under `B_WEATHER_RAIN`, Chlorophyll under `B_WEATHER_SUN` → multiplier 2, else 1 — per battler, evaluated *before* the stat-stage division (`:4606-4616`) | `turnOrder.ts:53-57` | SAME |
| 3.8 | `speed = (rawSpeed * multiplier) * gStatStageRatios[stage][0] / gStatStageRatios[stage][1]` — ONE integer division at the end (`:4624-4626` / `:4658-4660`) | `turnOrder.ts:59-60` `Math.trunc((speed * speedMultiplier * num) / den)` | SAME. `gStatStageRatios` re-derived from `src/pokemon.c:1868-1883` and compared entry-by-entry against `damageCalc.ts:58-72`: identical 13 rows, `{10,40}` … `{40,10}` |
| 3.9 | hold effect resolution: `ITEM_ENIGMA_BERRY` → `gEnigmaBerries[b]`, else `GetItemHoldEffect`/`GetItemHoldEffectParam` (`:4628-4637` / `:4662-4671`) | `turnOrderBattlerInputs:2144/2150-2151` via `resolveBattleScriptBattlerHoldEffect` | SAME-ORDER-EQUIVALENT — the Enigma Berry branch is UNREACHABLE: 0 of the 882 rental entries hold it (the Factory item table has 60 entries, none an Enigma Berry) |
| 3.10 | badge boost `speed = speed * 110 / 100` (`:4644` / `:4678`) | not ported (`turnOrder.ts:8-10` says so) | SAME — the guard `!(gBattleTypeFlags & (LINK \| RECORDED_LINK \| **FRONTIER**))` (`:4640`, `:4674`) is false for every Factory battle |
| 3.11 | `HOLD_EFFECT_MACHO_BRACE` → `speed /= 2`, applied **after** the stage ratio and **before** paralysis (`:4647-4648` / `:4681-4682`) | `turnOrder.ts:62` | SAME order. UNREACHABLE in the Factory catalog (0 of 882 entries hold a Macho Brace) but correctly ported |
| 3.12 | `STATUS1_PARALYSIS` → `speed /= 4`, after Macho Brace (`:4650-4651` / `:4684-4685`) | `turnOrder.ts:63` | SAME order — and the two truncating divisions do NOT commute with a single `/8`, so the sequence matters |
| 3.13 | Quick Claw: `holdEffect == HOLD_EFFECT_QUICK_CLAW && gRandomTurnNumber < (0xFFFF * holdEffectParam) / 100` → `speed = UINT_MAX`; **reads the turn's already-drawn `gRandomTurnNumber`, consumes no RNG** (`:4653-4654` / `:4687-4688`) | `turnOrder.ts:64-69`, same expression, same `UINT_MAX = 0xffff_ffff` | SAME. The brief's "`Random() % 100 < holdEffectParam` draw per battler" is not Emerald — see §0.1. `holdEffectParam` for `ITEM_QUICK_CLAW` is **20** (`src/data/items.h:2235-2241`), matching the generated row (`src/data/gen/battle-frontier-held-items.json`, itemTableId 24). 80 of the 882 rentals hold a Quick Claw, so this is the most-exercised item in the whole speed path |
| 3.14 | `ignoreChosenMoves == FALSE`: `moveBattlerN = MOVE_STRUGGLE` when `gProtectStructs[b].noValidMoves`, else `gBattleMons[b].moves[chosenMovePositions[b]]`, or `MOVE_NONE` when the action is not `B_ACTION_USE_MOVE` (`:4697-4719`) | `:2977-2978` passes `playerMoveId`/`trainerMoveId`, which `actionMoveId` (`:2208-2234`) already resolved — including `forcedStruggle ⇒ MOVE_STRUGGLE` (`:2214`) and the `gLockedMoves` override | SAME for the action path. The **end-turn** re-sort's version of this row has a known gap (`battleEndTurnOrchestration.ts:2163-2168`, no `noValidMoves` cell) — that is the end-turn audit's slice, not re-counted here |
| 3.15 | `MOVE_NONE`'s priority is 0, so a switch action always lands in the `else` speed compare (`src/data/battle_moves.h:3-14`) | `movePriority:2107-2112` returns 0 for `MOVE_NONE` | SAME |
| 3.16 | the priority branch: `if (prio1 != 0 \|\| prio2 != 0) { if equal → speed compare (+tie draw); else if prio1 < prio2 → battler2 first }` else → speed compare (+tie draw) (`:4722-4751`) | `turnOrder.ts:106-117` — `bothPriorityZero`/`priorityEqual` reproduce exactly the two branches | SAME |
| 3.17 | the tie draw: `speedBattler1 == speedBattler2 && Random() & 1` → `strikesFirst = 2`. `&&` short-circuits, so **unequal speeds draw nothing** (`:4728`, `:4745`) | `:2981-2983` asks `isSpeedTie` FIRST and only then calls `ctx.rng.draw("turn order speed tie (Random() & 1)")`; `turnOrder.ts:77-89` `isSpeedTie` reproduces the same guard | SAME-ORDER — this is the port's single most load-bearing RNG-ledger decision in the turn and it is correct |
| 3.18 | `SwapTurnOrder(i, j)` swaps **both** `gActionsByTurnOrder` and `gBattlerByTurnOrder` (`:4587-4593`) | `:3019-3027` `withTurnOrderPositions` writes `battlerByTurnOrder = [mover1, mover2, 2, 3]` and banks `chosenActionByBattler` **by battler index** (not by turn-order index) | SAME-ORDER-EQUIVALENT: the port stores the action array in battler order and indexes it by battler, so it never needs the parallel swap. `gActionsByTurnOrder`'s only later reader in singles is `HandleAction_NothingIsFainted`/`_ActionFinished`'s `gCurrentActionFuncId = gActionsByTurnOrder[++n]` (§5 rows 5.2/5.4) |
| 3.19 | exit: `gBattleMainFunc = CheckFocusPunch_ClearVarsBeforeTurnStarts`, `focusPunchBattlerId = 0` — set on BOTH the run-first early return and the normal path (`:4811-4812`, `:4853-4854`) | `:3009-3030` builds the machine state and dispatches action 1 directly | SAME-ORDER (the port has no Focus Punch pre-pass; see 3.20) |
| 3.20 | `CheckFocusPunch_ClearVarsBeforeTurnStarts` (`:4906-4935`): gated on `!(gHitMarker & HITMARKER_RUN)`, walks `gBattleStruct->focusPunchBattlerId` in **battler-index** order (not turn order, `:4912`), and for any battler whose `gChosenMoveByBattler == MOVE_FOCUS_PUNCH` and is not asleep, not Truant-loafing, and not `noValidMoves`, runs `BattleScriptExecute(BattleScript_FocusPunchSetUp)` and `return`s — the function re-enters and resumes at the next battler | **no port site** — `grep -rn "focusPunchBattlerId\|FocusPunchSetUp" src/` finds nothing that runs a turn-start pre-pass (`battleScriptStatbuffchangeOpcode.ts:257-268` only registers the animation id) | **DIVERGENT — finding 2** (see §6). Reachable: **11** of the 882 rental entries carry `MOVE_FOCUS_PUNCH` (census run this session against `src/data/gen/battle-frontier-mons.json`) |
| 3.21 | that tail (`:4925-4934`): `TryClearRageStatuses()`, `gCurrentTurnActionNumber = 0`, `gCurrentActionFuncId = gActionsByTurnOrder[0]`, `gDynamicBasePower = 0`, `gBattleStruct->dynamicMoveType = 0`, `gBattleMainFunc = RunTurnActionsFunctions`, `gBattleCommunication[3] = 0`, `gBattleCommunication[4] = 0`, `gBattleScripting.multihitMoveEffect = 0`, `battleScriptsStack->size = 0` | `:3013-3030` sets `programCounter: 0`, `callStack: []`, `withTurnOrderPositions(rc0, **0**, ...)` (i.e. `currentTurnActionNumber = 0`) and a fresh scheduler | SAME-ORDER for everything reachable in singles (`currentTurnActionNumber`, the script stack, the action func id, and — via §4 row 4.19 — `dynamicMoveType`). `TryClearRageStatuses()` is UNREACHABLE-IN-SINGLES-FACTORY: `STATUS2_RAGE` is set only by `MOVE_EFFECT_RAGE` (`battleScriptHitChainOpcode.ts:3096-3098`, from `EFFECT_RAGE`), and **0** of the 882 rental entries carry `MOVE_RAGE` (census run this session) |

## §4. The move-action prologue — `HandleAction_UseMove` (`battle_util.c:78-292`)

Reached as `sTurnActionsFuncsTable[B_ACTION_USE_MOVE]` from `RunTurnActionsFunctions:4943`.
**Port site.** `factoryBattleScriptFullTurnDecision.ts:1538` `runMoveAction` → `:1489` `buildActionContext`
→ `:1470` `startBattleScriptExecute`, with `TOPOLOGY_BY_MOVE` (`:172`) standing in for
`gBattleScriptsForMoveEffects[]`. `battleScriptMoveValuesCommands.ts:30` `cleanUpBattleScriptMoveValues`
is the *other* half of the same reset set (`MoveValuesCleanUp`, `battle_script_commands.c:3621-3630`) —
it is `Cmd_movevaluescleanup`'s handler, not this prologue's, and the two must not be conflated.

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| 4.1 | `gBattlerAttacker = gBattlerByTurnOrder[gCurrentTurnActionNumber]` (`:83`) | `:1504` `selectorRoles.attacker = mover`, with `mover1`/`mover2` derived at `:2994-3001` | SAME-ORDER |
| 4.2 | `gBattleStruct->absentBattlerFlags & gBitTable[atk]` → `gCurrentActionFuncId = B_ACTION_FINISHED`, return (`:85-89`) | none | UNREACHABLE-IN-SINGLES at this seam (§2 row 2.5) |
| 4.3 | `gCritMultiplier = 1` (`:91`) | `:1515` `critMultiplier: 1` | SAME |
| 4.4 | `gBattleScripting.dmgMultiplier = 1` (`:92`) | `:1516` `dmgMultiplier: 1` | SAME. (The Pursuit-interception `dmgMultiplier = 2` staging is a *later*, switch-path write — `stageVoluntarySwitchRules`, ISSUES #135's fix — and does not contradict this reset) |
| 4.5 | `gBattleStruct->atkCancelerTracker = 0` (`:93`) | `:1514`, with `:1510-1513` citing exactly why (carrying action 1's finished cursor into action 2 would skip Disable) | SAME |
| 4.6 | `gMoveResultFlags = 0` (`:94`) | `:1517` | SAME |
| 4.7 | `gMultiHitCounter = 0` (`:95`) | `:1518` | SAME |
| 4.8 | `gBattleCommunication[MISS_TYPE] = 0` (`:96`) | `:1519` `missType: 0` | SAME |
| 4.9 | `gCurrMovePos = gChosenMovePos = *(gBattleStruct->chosenMovePositions + atk)` (`:97`) — the *banked* slot, set at selection (§2 row 2.27) | `:1497-1507` writes `chosenMovePositions[mover] = moveSlot` and `currentMovePosition: moveSlot` | SAME-ORDER-EQUIVALENT (the port supplies the slot with the action instead of reading a bank written a step earlier) |
| 4.10 | **branch 1**, `gProtectStructs[atk].noValidMoves` → clear the flag, `gCurrentMove = gChosenMove = MOVE_STRUGGLE`, `gHitMarker \|= HITMARKER_NO_PPDEDUCT`, **`GetMoveTarget(MOVE_STRUGGLE, NO_TARGET_OVERRIDE)`** (`:100-106`) | `:2214` `actionMoveId` returns `BATTLE_SCRIPT_MOVE_STRUGGLE`; `:1520-1522` ORs `HITMARKER_NO_PPDEDUCT`; the target comes from the pure `sourceMoveTarget` (`:1959`) with **no draw** | **DIVERGENT — finding 3** (see §6): `MOVE_STRUGGLE.target == MOVE_TARGET_SELECTED` (`src/data/battle_moves.h:2148-2156`), and `GetMoveTarget`'s `MOVE_TARGET_SELECTED` case is a `do { targetBattler = Random() % gBattlersCount; } while (target == attacker \|\| same side \|\| absent)` loop (`battle_util.c:3850-3853`) that **draws even in singles** |
| 4.11 | **branch 2**, `STATUS2_MULTIPLETURNS \|\| STATUS2_RECHARGE` → `gCurrentMove = gChosenMove = gLockedMoves[atk]`, **no `GetMoveTarget` call, no target rewrite** (`:107-110`) | `:2216-2232` `actionMoveId`'s locked branch; the target is `lockedMoveDecision`'s `sourceMoveTarget(lockedMove)` (`:2199`) | SAME-ORDER-EQUIVALENT and **no draw on either side**. The ROM reuses the stale `gBattleStruct->moveTarget[atk]` from the turn the lock started; in singles that is always the sole opposing battler for every locked move (Thrash/Outrage/Petal Dance/Rollout/Uproar/Hyper Beam recharge), so the two agree |
| 4.12 | **branch 3**, Encore with `encoredMove == moves[encoredMovePos]` → `gCurrentMove = gChosenMove = encoredMove`, `gCurrMovePos = gChosenMovePos = encoredMovePos`, **`GetMoveTarget(gCurrentMove, NO_TARGET_OVERRIDE)`** (`:112-118`) | `:2166-2186` `lockedMoveDecision`'s Encore branch — same move, same slot, `sourceMoveTarget` with **no draw** | **DIVERGENT — finding 3** (same root cause: any Encored move whose `.target` is `MOVE_TARGET_SELECTED`, i.e. almost every attacking move) |
| 4.13 | **branch 4**, Encore whose slot was overwritten → take the slot's *current* move, zero `encoredMove`/`encoredMovePos`/`encoreTimer`, **`GetMoveTarget`** (`:120-129`) | `:2237-2253` `clearOverwrittenEncoreAtAction` (the three zeroes, applied at `:2918-2921` before either action) | SAME for the state clears; **DIVERGENT — finding 3** for the missing draw |
| 4.14 | **branch 5**, `moves[gCurrMovePos] != gChosenMoveByBattler[atk]` → re-read the slot, **`GetMoveTarget`** (`:130-134`) | no port site (the port never diverges the banked move from the slot) | **DIVERGENT — finding 3** for the draw, but only on the narrow reachable path: the slot must have been rewritten between selection and execution, i.e. Mimic / Sketch / Transform resolving in *this* turn's first action against a battler that already picked that slot |
| 4.15 | **branch 6** (the ordinary path), `gCurrentMove = gChosenMove = moves[gCurrMovePos]`, **no `GetMoveTarget`** — the banked `moveTarget[atk]` from selection is reused (`:135-138`) | `:1506-1508` `currentMove`/`chosenMove` = `moveId`; the target rides the decision | SAME, no draw on either side. **This is why finding 3 is a branch-conditional divergence, not a blanket one** |
| 4.16 | `if (hp != 0)` → `gBattleResults.lastUsedMovePlayer` / `lastUsedMoveOpponent` (`:140-146`) | none | SAME-ORDER-EQUIVALENT — `gBattleResults` is the post-battle stats block; provably unread under `BATTLE_TYPE_FRONTIER` (same class as `givenExpMons`, end-turn audit §5 row H2) |
| 4.17 | target step 1: Follow Me redirect — `gSideTimers[oppSide].followmeTimer != 0 && move.target == MOVE_TARGET_SELECTED && different sides && followmeTarget.hp != 0` (`:150-156`) | `battleScriptRulesContext.ts:221` carries `followmeTimer`/`followmeTarget`, but `buildActionContext` does not consult them | SAME-ORDER-EQUIVALENT in singles. **7** of the 882 rentals carry `MOVE_FOLLOW_ME` (census run this session — it is *not* absent from the catalog), but with two battlers the redirect's only possible result is the sole opposing battler, which is already the target. **It does matter for finding 3**: `GetMoveTarget`'s `MOVE_TARGET_SELECTED` case short-circuits on the same Follow Me test (`battle_util.c:3843-3846`) and then skips the draw loop entirely, so a turn where the opposing side already used Follow Me costs **zero** `GetMoveTarget` draws |
| 4.18 | target step 2: the Lightning Rod scan and its `GetBattlerTurnOrderNum` tie-break (`:157-219`) | none | UNREACHABLE-IN-SINGLES: the whole branch is gated on `gBattleTypeFlags & BATTLE_TYPE_DOUBLE` (`:157`) |
| 4.19 | inside 4.18, the `MOVE_TARGET_RANDOM` `Random() & 1` left/right pick (`:177-193`), and the standalone doubles copy of it (`:221-244`, second `Random() & 1` pair at `:226`/`:233`) | none | UNREACHABLE-IN-SINGLES, **cited**: `:157` and `:221` both require `BATTLE_TYPE_DOUBLE`. These are the doubles-only random-target draws the brief asked to be declared — they are the reason `sourceMoveTarget` can map `MOVE_TARGET_RANDOM` to the sole opponent with no draw (`:1980-1981`) |
| 4.20 | target step 3 (the singles path): `gBattlerTarget = *(gBattleStruct->moveTarget + atk)`, then the `gAbsentBattlerFlags` re-target (`:245-261`) | `:1504` `selectorRoles.target = target` | SAME; the absent re-target is UNREACHABLE-IN-SINGLES (both actives are live at action time — §2 row 2.5) |
| 4.21 | `BATTLE_TYPE_PALACE && palaceUnableToUseMove` → `MULTISTRING_CHOOSER = B_MSG_INCAPABLE_OF_POWER` and `BattleScript_MoveUsedLoafingAround` / the palace selection script (`:263-282`) | none | UNREACHABLE-IN-SINGLES-FACTORY (`BATTLE_TYPE_PALACE` is the Battle Palace's flag; the Factory sets `BATTLE_TYPE_FACTORY`) |
| 4.22 | otherwise `gBattlescriptCurrInstr = gBattleScriptsForMoveEffects[gBattleMoves[gCurrentMove].effect]` (`:285`) | `:1548-1549` `TOPOLOGY_BY_MOVE.get(moveId).entryScript` + `:1558` `startBattleScriptExecute` | SAME-ORDER — the effect→script indirection is resolved at build time from the same generated table, and an unmapped move throws rather than silently defaulting |
| 4.23 | `BATTLE_TYPE_ARENA` → `BattleArena_AddMindPoints(atk)` (`:288-289`) | none | UNREACHABLE-IN-SINGLES-FACTORY (§1 row 1.31) |
| 4.24 | `gCurrentActionFuncId = B_ACTION_EXEC_SCRIPT` (`:291`) — the handoff into `RunTurnActionsFunctions`' script runner | `:1562` `runScriptToOwnEnd` | SAME-ORDER (the port runs the script to its own end synchronously instead of re-entering per frame; ORDER and OUTCOME preserved) |
| 4.25 | `gBattleStruct->dynamicMoveType` is **not** touched by this prologue | `buildActionContext` does not reset it either | SAME. Its only writes are `CheckFocusPunch_...:4929` (turn start, §3 row 3.21), `HandleAction_ActionFinished:677` (§5 row 5.4), Weather Ball (`battle_script_commands.c:9794-9802`), Hidden Power (`:8909-8912`) and the AI's own scratch resets (`battle_ai_script_commands.c:1189/1474/1520/1752/1781`) — the full tree grep is in §7. It is therefore a *per-action* value produced by the script, not a prologue reset |
| 4.26 | `HandleAction_Switch` (`:294-310`): `gBattlerAttacker = byTurnOrder[n]`, cursor resets, `PREPARE_MON_NICK_BUFFER(..., battlerPartyIndexes[atk])`, `gBattleScripting.battler = atk`, `BattleScript_ActionSwitch`, `B_ACTION_EXEC_SCRIPT`, `playerSwitchesCounter++` | `:1710` `runVoluntarySwitchAction` / `:1769` `stageVoluntarySwitchRules` | cross-reference — `docs/switch-lifecycle-audit-2026-08-26.md` §2 owns this opcode by opcode. Reachable both sides |
| 4.27 | `HandleAction_UseItem` (`:312-486`) | none | UNREACHABLE-IN-SINGLES-FACTORY on **both** sides: the player's bag is refused at selection (§2 row 2.13, `BATTLE_TYPE_FRONTIER_NO_PYRAMID` includes `BATTLE_TYPE_FACTORY`), and the AI's `ShouldUseItem` is gated on `!(gBattleTypeFlags & BATTLE_TYPE_FRONTIER)` (`battle_ai_switch_items.c`'s early return, reached from `AI_TrySwitchOrUseItem`) |
| 4.28 | `HandleAction_Run` (`:487-539`) | `:239-243` `FACTORY_RUN_AWAY_NOOP_INVARIANT` | UNREACHABLE-IN-SINGLES-FACTORY (§2 rows 2.19-2.21, 2.30). Its opponent-side `B_OUTCOME_MON_FLED` branch (`:534-535`) is likewise unreachable: the Factory AI never returns `AI_CHOICE_FLEE` (§2 row 2.41) |

## §5. The action-finished seams (`battle_util.c:638-684`, `battle_main.c:4937-4958`)

Only the mask/counter writes not already covered by `docs/faint-replacement-audit-2026-08-26.md` §2
(its rows **2.18** — `HandleAction_TryFinish`'s `while (HandleFaintedMonActions())` loop and its
`faintedActionsState = 0` / `B_ACTION_FINISHED` tail — and **2.23** — the `BattleScriptExecute`
callback-stack re-entry — are cross-referenced, not restated).

**Port site.** `src/engine/battleActionFinished.ts:98` `handleBattleActionFinished`, called from
`factoryBattleScriptFullTurnDecision.ts:2717` (terminal) and `:2763` (between actions).

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| 5.1 | `HandleAction_TryFinish` (`battle_util.c:638-645`) | `:2715` `runBattleScriptFaintedActionsOrchestration` | cross-reference — faint-replacement audit row 2.18 |
| 5.2 | `HandleAction_NothingIsFainted` (`:647-656`): `gCurrentTurnActionNumber++`, `gCurrentActionFuncId = gActionsByTurnOrder[n]`, then the 15-bit hitmarker clear (`DESTINYBOND \| IGNORE_SUBSTITUTE \| ATTACKSTRING_PRINTED \| NO_PPDEDUCT \| STATUS_ABILITY_EFFECT \| IGNORE_ON_AIR \| IGNORE_UNDERGROUND \| IGNORE_UNDERWATER \| PASSIVE_HP_UPDATE \| OBEYS \| WAKE_UP_CLEAR \| SYNCHRONIZE_EFFECT \| CHARGING \| NEVER_SET`) — and **nothing else** | none | UNREACHABLE-IN-SINGLES-FACTORY: `B_ACTION_NOTHING_FAINTED` is only banked at `battle_main.c:4152`, for an `absentBattlerFlags` battler (§2 row 2.5). Worth naming because its mask is byte-for-byte the same as 5.4's while its *state* resets are absent — conflating the two would wrongly clear `gCurrentMove`/`gBattleMoveDamage` for an absent battler |
| 5.3 | `HandleAction_ActionFinished` step 1: `*(gBattleStruct->monToSwitchIntoId + **gBattlerByTurnOrder[gCurrentTurnActionNumber]**) = PARTY_SIZE`, then `gCurrentTurnActionNumber++`, then `gCurrentActionFuncId = gActionsByTurnOrder[n]` — the sentinel write uses the **pre-increment** index (`:660-662`) | `battleActionFinished.ts:114-118` (`monToSwitchIntoId[actingBattler] = 6`) then `:140` `currentTurnActionNumber + 1` | SAME-ORDER, including the pre-increment ordering |
| 5.4 | `SpecialStatusesClear()` (`:663`) + the same 15-bit hitmarker mask (`:664-668`) | `battleActionFinished.ts:109-113` `clearRepresentedSpecialStatus` per battler `< gBattlersCount`, and `:52-67` `BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK` | SAME — the mask was re-derived bit-by-bit against `:664-668` this session: all 14 named source bits are present, and the three that have no other reader (`HITMARKER_WAKE_UP_CLEAR 1<<4`, `HITMARKER_STATUS_ABILITY_EFFECT 1<<13`, `HITMARKER_NEVER_SET 1<<26`) are defined locally at `:48-50` with their `include/constants/battle.h` cites. The unrepresented `SpecialStatus` fields are enumerated and justified at `:10-19` |
| 5.5 | the 14 tail resets: `gCurrentMove = 0`, `gBattleMoveDamage = 0`, `gMoveResultFlags = 0`, `gBattleScripting.animTurn = 0`, `gBattleScripting.animTargetsHit = 0`, `gLastLandedMoves[gBattlerAttacker] = 0`, `gLastHitByType[gBattlerAttacker] = 0`, `gBattleStruct->dynamicMoveType = 0`, `gDynamicBasePower = 0`, `gBattleScripting.moveendState = 0`, `gBattleCommunication[3] = 0`, `gBattleCommunication[4] = 0`, `gBattleScripting.multihitMoveEffect = 0`, `battleScriptsStack->size = 0` (`:670-683`) | `battleActionFinished.ts:135` (`callStack: []`) and `:144-156` (`currentMove`, `currentMoveEffect`, `currentMovePower`, `battleMoveDamage`, `painSplitHp`, `moveResultFlags`, `animTurn`, `animTargetsHit`, `moveHistory`, `dynamicMoveType`, `dynamicBasePower`, `moveendState`, `multiHitEffect`) | SAME. `gBattleCommunication[3]`/`[4]` are the two slots the context does not represent, declared at `:13-14` |
| 5.6 | inside 5.5, `gLastLandedMoves[**gBattlerAttacker**]` and `gLastHitByType[**gBattlerAttacker**]` — the source indexes these two by `gBattlerAttacker`, **not** by `gBattlerByTurnOrder[gCurrentTurnActionNumber]` as step 5.3 does (`:675-676` vs `:660`) | `battleActionFinished.ts:119-131` uses `actingBattler` for both | **UNVERIFIED.** The two indices agree unless a script left `gBattlerAttacker` pointing elsewhere at its `end`. Tree-wide grep of `gBattlerAttacker = ` in `battle_script_commands.c` returns exactly 6 writers: `:4393` (`Cmd_moveend`'s `HITMARKER_SWAP_ATTACKER_TARGET` swap-back), `:5678` `Cmd_swapattackerwithtarget`, `:6213` `Cmd_setatktoplayer0`, `:6331` `VARIOUS_SET_MAGIC_COAT_TARGET`, `:9861` `Cmd_jumpifnopursuitswitchdmg` (`gBattlerAttacker = gActiveBattler`, the Pursuit user, during the *switcher's* action), `:9874` `Cmd_setatktobattler`/`snatch`. What is missing: tracing each of the singles-reachable ones (Pursuit interception is the live one — ISSUES #135's path) to its script's `end` to see whether the swap is undone before `HandleAction_ActionFinished` runs. Not closable inside this step's 5-minute row cap; the Pursuit path is `docs/switch-lifecycle-audit-2026-08-26.md`'s slice |
| 5.7 | `RunTurnActionsFunctions` (`battle_main.c:4937-4943`): `gBattleOutcome != 0` → force `B_ACTION_FINISHED`; save `gCurrentTurnActionNumber`; dispatch `sTurnActionsFuncsTable[gCurrentActionFuncId]()` | `:2716-2726` — a decided outcome short-circuits to the terminal boundary right after `handleBattleActionFinished` | SAME-ORDER |
| 5.8 | `if (gCurrentTurnActionNumber >= gBattlersCount)` → `gHitMarker &= ~HITMARKER_PASSIVE_HP_UPDATE`, `gBattleMainFunc = sEndTurnFuncsTable[gBattleOutcome & 0x7F]` (`:4945-4949`) | `:2850` `runEndTurnTail` | cross-reference — `docs/end-turn-ordering-audit-2026-08-25.md` §1 owns everything past this line. `HITMARKER_PASSIVE_HP_UPDATE` is already inside 5.4's mask, so the port clears it a step earlier and the two agree at this point |
| 5.9 | `else if (savedTurnActionNumber != gCurrentTurnActionNumber)` → `gHitMarker &= ~HITMARKER_NO_ATTACKSTRING` and `~HITMARKER_UNABLE_TO_USE_MOVE` — the **between-actions** clear, deliberately NOT in `HandleAction_ActionFinished`'s own mask (`:4950-4957`) | `:2768-2775` `betweenActionsRules`, applied only when a second action is about to run | SAME-ORDER, including the asymmetry: source's `>=` branch at `:4945` wins after the turn's LAST action, so those two bits survive into the end-turn pass on both sides (where `BattleTurnPassed:3975-3978` clears them — end-turn audit's slice). The port's `second !== null` guard reproduces exactly that |

## §6. Verdict counts

**133 rows, every one carrying a verdict. 0 rows left unwritten.**

| verdict | §1 | §2 | §3 | §4 | §5 | total |
| --- | --- | --- | --- | --- | --- | --- |
| SAME | 6 | 3 | 12 | 8 | 2 | **31** |
| SAME-ORDER | 12 | 8 | 2 | 3 | 3 | **28** |
| SAME-ORDER-EQUIVALENT | 8 | 12 | 1 | 4 | 0 | **25** |
| UNREACHABLE-IN-SINGLES (cited) | 4 | 16 | 5 | 8 | 1 | **34** |
| cross-reference (owned by a sibling audit) | 1 | 2 | 0 | 1 | 2 | **6** |
| DIVERGENT-BENIGN | 1 | 1 | 0 | 0 | 0 | **2** |
| **DIVERGENT** | 0 | 1 | 1 | 4 | 0 | **6 rows / 3 root causes** |
| UNVERIFIED | 0 | 0 | 0 | 0 | 1 | **1** |
| rows | 32 | 43 | 21 | 28 | 9 | **133** |

The two DIVERGENT-BENIGN rows are §1 row 1.19 (the shared `effect` accumulator costs one extra
re-entry between the ability and item switch-in scans — no draw, no state, no order change) and
§2 row 2.8 (the ROM commits the AI's decision before the player's; the port prompts the player
first — identical RNG sequence, benign only because this adapter's player decision cannot observe
the AI's).

## DIVERGENT summary

### Finding 1 — Encore's auto-confirm is checked before `AreAllMovesUnusable`, inverting the source (§2 row 2.11)

* **Source:** `reference/pokeemerald/src/battle_main.c:4184` `if (AreAllMovesUnusable())` … **then**
  `:4192` `else if (gDisableStructs[gActiveBattler].encoredMove != 0)`. `AreAllMovesUnusable`
  (`battle_util.c:1125-1140`) runs `CheckMoveLimitations(b, 0, MOVE_LIMITATIONS_ALL)`
  (`:1082-1123`), whose Encore bit masks **every slot that is not the encored move** (`:1116-1117`,
  ungated by the `check` mask) — so an Encore-locked battler whose encored move is *itself* unusable
  (Disabled, Taunted, Tormented, or out of PP) masks all four slots, `noValidMoves` is set, and the
  battler Struggles.
* **Port:** `src/engine/factoryBattleScriptFullTurnDecision.ts:1998-1999` — `legalMoveDecisions`
  consults `lockedMoveDecision` **first** and returns immediately; and `:2152`
  `battlerUsesForcedStruggle` returns `false` outright when a lock exists. The port's own
  `CheckMoveLimitations` port (`battleScriptActionAdmission.ts:2530-2600`, Encore bit at
  `:2586-2588`) is faithful — it is simply never consulted on this path.
* **Observable consequence:** the ROM's action is `MOVE_STRUGGLE` with `HITMARKER_NO_PPDEDUCT`
  (`battle_util.c:100-106`) — typeless-recoil damage to the *user*, and the message
  "…has no moves left!". The port's action is the Encore-locked move itself, which then trips
  `CANCELER_DISABLED` (`battle_util.c:2122-2133` → `BattleScript_MoveUsedIsDisabled`) and wastes the
  turn with a different message and **zero** damage to either side. Different HP on both battlers,
  different message, different PP ledger.
* **Reachable in a genuine Factory battle, not just a synthetic fixture:** `SPECIES_DEWGONG`'s
  rental set is `[BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE]` — one entry that carries both halves.
  Catalog census (this session, 882 entries): Encore 7, Disable 9, Taunt 2, Torment 5.
* **Fixture that exposes it on the stock ROM** (`mechanicLab`, `overrides.parties`, three complete
  legal L50 mons per side; frame 0 is turn 1's action menu, so this lands on **turn 3**):
  * **Player slot 1** — Dewgong, moves `[BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE]`, Speed EVs 0 and
    Speed IV 0 so it moves **second**.
  * **Opponent slot 1** — any mon whose **all four slots hold the same** move `M` (`M` must be a
    normal `MOVE_TARGET_SELECTED` attack, e.g. `MOVE_TACKLE`), max Speed EVs/IVs so it moves first.
    Giving all four slots the same move is the lab README's own trick for pinning the AI to one
    legal choice without injecting a decision.
  * **Turn 1:** opponent uses `M`; Dewgong (second) uses **Encore** → `encoredMove = M`.
    **Turn 2:** opponent is Encore-locked to `M`; Dewgong uses **Disable** → `disabledMove = M`.
    **Turn 3:** every opponent slot is now masked (Disable masks all four, since all four *are* `M`),
    with `encoreTimer` still non-zero (Encore lasts 3-6 turns and `ENDTURN_ENCORE` only clears on
    `--encoreTimer == 0 || pp[encoredMovePos] == 0`, `battle_util.c:1727-1731`).
  * **Expected on the ROM at turn 3:** "…has no moves left!", then Struggle — recoil damage to the
    opponent's own active. **Expected from the port:** "…'s `M` is disabled!", no damage anywhere.
  * Append `A` pulses past every prompt.

### Finding 2 — the `CheckFocusPunch_ClearVarsBeforeTurnStarts` pre-pass has no port site (§3 row 3.20)

* **Source:** `reference/pokeemerald/src/battle_main.c:4906-4923`. Before the turn's first action —
  after turn order is fixed, before `RunTurnActionsFunctions` — the engine walks
  `gBattleStruct->focusPunchBattlerId` in **battler-index order** and, for any battler whose
  `gChosenMoveByBattler == MOVE_FOCUS_PUNCH` and that is not asleep, not Truant-loafing and not
  `noValidMoves`, runs `BattleScriptExecute(BattleScript_FocusPunchSetUp)`
  (`data/battle_scripts_1.s`: `printstring STRINGID_EMPTYSTRING3` / `waitmessage 1` /
  `playanimation BS_ATTACKER, B_ANIM_FOCUS_PUNCH_SETUP` / `printstring STRINGID_PKMNTIGHTENINGFOCUS`
  / `waitmessage B_WAIT_TIME_LONG` / `end2`).
* **Port:** no site. `grep -rn "focusPunchBattlerId\|FocusPunchSetUp" src/` finds only
  `battleScriptStatbuffchangeOpcode.ts:257-268`, which registers the *animation id* and documents
  the script, and never runs it. `factoryBattleScriptFullTurnDecision.ts:3013-3030` goes straight
  from turn order to action 1.
* **Observable consequence:** the ROM emits an extra message box —
  "<PKMN> is tightening its focus!" — **before either battler's action**, i.e. ahead of the faster
  battler's move message even when the Focus Punch user is slower. The port emits no event there at
  all, so every subsequent message in the turn is off by one and the frame timeline shifts. Battle
  Scene OFF suppresses animations, not messages, so this is visible in the OFF profile's captures.
  It consumes no RNG, so the draw ledger is unaffected — this is a message/event-ordering divergence.
* **Reachable:** 11 of the 882 rental entries carry `MOVE_FOCUS_PUNCH` (census this session).
* **Fixture:** `mechanicLab` `overrides.parties`. **Player slot 1** — any of the 11 Focus Punch
  carriers, Speed EVs/IVs 0. **Opponent slot 1** — max Speed, all four slots the same harmless
  `MOVE_TARGET_SELECTED` attack. **Turn 1:** select Focus Punch. Capture the frames from the action
  menu through the first message box: the ROM shows "tightening its focus" *first*, then the
  opponent's faster move. Control arm: the same fixture with a non-Focus-Punch move selected — the
  message is absent, which pins that the extra box is the pre-pass and not the move script.

### Finding 3 — `GetMoveTarget`'s `MOVE_TARGET_SELECTED` draw loop is skipped on all four re-target branches (§4 rows 4.10, 4.12, 4.13, 4.14)

* **Source:** `reference/pokeemerald/src/battle_util.c:3850-3853` —
  `do { targetBattler = Random() % gBattlersCount; } while (targetBattler == gBattlerAttacker || side == GetBattlerSide(targetBattler) || gAbsentBattlerFlags & gBitTable[targetBattler]);`
  This is the `MOVE_TARGET_SELECTED` arm of `GetMoveTarget` (`:3828-3911`) and it **draws in singles
  too**: with `gBattlersCount == 2` exactly one of the two outcomes exits, so the loop consumes a
  geometrically distributed number of `Random()` calls — ≥1 always, expectation 2. Only an active
  Follow Me on the opposing side short-circuits it (`:3843-3846`).
  `HandleAction_UseMove` calls `GetMoveTarget(…, NO_TARGET_OVERRIDE)` on four branches:
  `:105` (forced Struggle — `MOVE_STRUGGLE.target == MOVE_TARGET_SELECTED`,
  `src/data/battle_moves.h:2148-2156`), `:117` (Encore match), `:128` (Encore whose slot was
  overwritten), `:133` (slot overwritten by Mimic/Transform).
* **Port:** `src/engine/factoryBattleScriptFullTurnDecision.ts:1959-1987` `sourceMoveTarget` is
  **pure** — its own docstring at `:1951-1958` asserts "every non-user shape resolves to the sole
  opposing active battler *without consuming RNG*", which is right for `DEPENDS`/`BOTH`/
  `FOES_AND_ALLY`/`OPPONENTS_FIELD`/`RANDOM` and **wrong for `MOVE_TARGET_SELECTED`**.
  `buildActionContext` (`:1489-1523`) draws nothing. The port already has the correct mechanism
  elsewhere — `battleScriptSwitchinOpcode.ts:1020-1032` models this exact `do/while` for the
  `VARIOUS_GET_MOVE_TARGET` opcode, draw for draw — it is simply not wired to
  `HandleAction_UseMove`'s four branches.
* **Observable consequence:** the whole turn's RNG cursor shifts. Every draw after the action's
  prologue — accuracy roll, damage roll (`Random() % 16`), critical hit, secondary-effect chance,
  and every draw in every later turn of the battle — comes from a different point in the LCG stream.
  This is the most severe of the three: it is not a message or a single action, it desynchronises
  the ledger for the rest of the battle.
* **Reachable:** forced Struggle is the common arm (ISSUES #123 counted 456 Struggle actions in one
  census), and Encore has 7 rental carriers; Mimic 2, Transform 1.
* **Fixture (A/B draw-count, the cleanest arm — Encore):** `mechanicLab` `overrides.parties`.
  * **Arm A:** **Player slot 1** — an Encore carrier, Speed EVs/IVs 0 (moves second).
    **Opponent slot 1** — all four slots the same `MOVE_TARGET_SELECTED` attack `M`, max Speed.
    Turn 1: opponent uses `M`, player Encores → `encoredMove = M`. Turn 2: the opponent's action
    takes `battle_util.c:112-118` and calls `GetMoveTarget`.
  * **Arm B (control):** identical, except the player uses a no-op status move on turn 1 instead of
    Encore, so turn 2 takes the ordinary branch at `:135-138` and calls `GetMoveTarget` **not at all**.
  * **Expected:** arm A's turn-2 `Random()` count exceeds arm B's by ≥1 (mean ≈2, and the
    distribution over repeated seeds should be geometric with p = ½). The port shows **0** difference
    between the two arms. Watch the draw count directly with the battle lab's RNG watch, or read it
    off a downstream damage roll — arm A's turn-2 damage will not match arm B's for the same seed.
  * Struggle arm, if a Disable fixture is cheaper to stage: build finding 1's turn-3 position but
    **without** Encore (opponent's four slots all `M`, player Disables `M`). Both ROM and port
    Struggle there, so the *only* difference is the draw count — an even cleaner isolation of
    finding 3 from finding 1.

## UNVERIFIED

* **§5 row 5.6** — `HandleAction_ActionFinished` indexes `gLastLandedMoves` / `gLastHitByType` by
  `gBattlerAttacker` (`battle_util.c:675-676`) while indexing `monToSwitchIntoId` by
  `gBattlerByTurnOrder[gCurrentTurnActionNumber]` (`:660`); the port
  (`battleActionFinished.ts:114-131`) uses one battler for both. Missing: tracing each of the six
  `gBattlerAttacker = ` writers in `battle_script_commands.c` (`:4393`, `:5678`, `:6213`, `:6331`,
  `:9861`, `:9874`) that is singles-reachable to its script's `end`, to see whether the swap is
  undone before `HandleAction_ActionFinished` runs. `:9861` (`Cmd_jumpifnopursuitswitchdmg`, ISSUES
  #135's live path) is the one that matters; it belongs to
  `docs/switch-lifecycle-audit-2026-08-26.md`'s slice and did not close inside this step's
  5-minute-per-row cap.

## §7. Method — exact commands

```sh
# the reference/ symlink: rg over it returns ZERO hits silently, always resolve it first
REF=$(cd reference/pokeemerald && pwd -P)          # -> ../../vendor/pokeemerald

# §1 battle start
grep -n "^static void TryDoEventsBeforeFirstTurn\|^static void HandleTurnActionSelectionState\|^static void SetActionsAndBattlersTurnOrder\|^u8 GetWhoStrikesFirst\|^static void RunTurnActionsFunctions\|^static void TurnValuesCleanUp\|^static void CheckFocusPunch" $REF/src/battle_main.c
sed -n '3841,3956p' $REF/src/battle_main.c         # TryDoEventsBeforeFirstTurn
sed -n '2470,2601p' $REF/src/battle_util.c         # ABILITYEFFECT_ON_SWITCHIN + SWITCH_IN_WEATHER
sed -n '3003,3090p' $REF/src/battle_util.c         # INTIMIDATE1 / TRACE / INTIMIDATE2
sed -n '3295,3340p' $REF/src/battle_util.c         # ITEMEFFECT_ON_SWITCH_IN
grep -rn "isFirstTurn" $REF/src $REF/include       # whole tree, not one file
grep -n "ABILITYEFFECT_SWITCH_IN_WEATHER" $REF/include/battle_util.h   # = 255, not an ability id
sed -n '1,14p' $REF/data/maps/BattleFrontier_BattleFactoryBattleRoom/map.json  # WEATHER_NONE / INDOOR

# §2 action selection
sed -n '4114,4130p' $REF/src/battle_main.c         # the STATE_* enum, values by position
sed -n '4129,4595p' $REF/src/battle_main.c         # HandleTurnActionSelectionState + helpers
sed -n '90,115p'   $REF/include/battle_controllers.h   # IS_BATTLE_CONTROLLER_ACTIVE_..._ANYWHERE
grep -n "define B_FLANK_LEFT\|define BIT_SIDE\|define BIT_FLANK" $REF/include/constants/battle.h
sed -n '975,1145p' $REF/src/battle_util.c          # TrySetCantSelectMove / CheckMoveLimitations / AreAllMovesUnusable
sed -n '1540,1665p' $REF/src/battle_controller_opponent.c   # the four Opponent* choose handlers
grep -n "BATTLE_TYPE_FRONTIER_NO_PYRAMID" $REF/include/constants/battle.h

# §3 turn order
sed -n '4595,4960p' $REF/src/battle_main.c         # GetWhoStrikesFirst .. RunTurnActionsFunctions
sed -n '1868,1883p' $REF/src/pokemon.c             # gStatStageRatios, compared row by row
grep -n "ITEM_QUICK_CLAW" -A 8 $REF/src/data/items.h    # holdEffectParam = 20
grep -rn "define WEATHER_HAS_EFFECT" $REF/include/

# §4 the prologue
sed -n '78,340p'   $REF/src/battle_util.c          # HandleAction_UseMove / _Switch / _UseItem
sed -n '487,540p'  $REF/src/battle_util.c          # HandleAction_Run
sed -n '3828,3911p' $REF/src/battle_util.c         # GetMoveTarget -- the do/while draw loop at :3850
grep -n "define MOVE_TARGET_SELECTED\|define NO_TARGET_OVERRIDE" $REF/include/battle.h   # both 0
grep -n "MOVE_STRUGGLE" -A 12 $REF/src/data/battle_moves.h | grep -E "target|effect"
grep -rn "dynamicMoveType" $REF/src $REF/include   # all 22 sites, whole tree
grep -rn "choicedMove" $REF/src                    # proves the Choice lock is NOT in the prologue

# §5 the finish seams
sed -n '636,684p'  $REF/src/battle_util.c          # TryFinish / NothingIsFainted / ActionFinished
grep -cn "gBattlerAttacker = " $REF/src/battle_script_commands.c   # 6 writers -> row 5.6

# port
grep -n "^function \|^export function " src/engine/factoryBattleScriptFullTurnDecision.ts
cat src/engine/turnOrder.ts src/engine/battleActionFinished.ts
sed -n '2100,2240p' src/engine/battleEndTurnOrchestration.ts       # the shared turn-order inputs
grep -rn "GetMoveTarget\|getMoveTarget" src/engine/*.ts
grep -rn "focusPunchBattlerId\|FocusPunchSetUp" src/
grep -rn "sortBattlersByTurnOrder" src/ tests/                     # no production caller

# reachability, against the real 882-entry catalog (never assumed -- one census this session
# was wrong on the first pass and the wrong verdict was committed before being corrected)
python3 -c "import json; d=json.load(open('src/data/gen/battle-frontier-mons.json'))['entries']; \
  print({m: len([x for x in d if m in x['moves']]) for m in \
  ['MOVE_ENCORE','MOVE_DISABLE','MOVE_TAUNT','MOVE_TORMENT','MOVE_FOCUS_PUNCH','MOVE_RAGE', \
   'MOVE_FOLLOW_ME','MOVE_MIMIC','MOVE_SKETCH','MOVE_TRANSFORM']})"
# NOTE the schema: entries carry `itemTableId`/`itemName`, NOT a resolved item id -- an item
# census must join against src/data/gen/battle-frontier-held-items.json.
```

**Censuses run this session** (882 rental entries): Encore 7 · Disable 9 · Taunt 2 · Torment 5 ·
Spite 2 · Focus Punch **11** · Rage **0** · Follow Me **7** · Mimic 2 · Sketch 0 · Transform 1 ·
Quick Claw 80 · Choice Band 12 · Focus Band 80 · Lax Incense 45 · White Herb 25 · Mental Herb 4 ·
Macho Brace **0** · Enigma Berry **0**. One entry (`SPECIES_DEWGONG`,
`[BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE]`) carries both halves of finding 1.

**Tests that pin this machinery today** (listed, not run — docs-only step):
`tests/turnOrder.test.ts`, `tests/turnOrderParity.test.ts`, `tests/battleDecisionBoundary.test.ts`,
`tests/factoryBattleStart*.test.ts`, `tests/factoryFullTurnDecision*.test.ts`,
`tests/battleActionFinished.test.ts`. **No existing test pins the `AreAllMovesUnusable`-before-Encore
order, the Focus Punch pre-pass, or `GetMoveTarget`'s draw loop on the `HandleAction_UseMove`
branches** — which is why all three survived to today.
