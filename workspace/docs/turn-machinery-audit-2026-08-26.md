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
