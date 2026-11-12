# End-of-turn ordering audit — source vs port (2026-08-25)

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit time) | `db4e8d72c8036f4236ef24c41262298b5206d02e` (commit `d94469e7`) |
| Date | 2026-08-25 |
| Lane / oracle | side worktree `worker/side-20260825-163116`, Battle Scene OFF (`http://127.0.0.1:8014`) |
| Scope | Everything that runs between a turn's LAST action and the NEXT turn's action selection: `BattleTurnPassed` and the `gBattleMainFunc` chain around it, `DoFieldEndTurnEffects`, `DoBattlerEndTurnEffects`, `HandleFaintedMonActions`, `HandleWishPerishSongOnTurnEnd`, `AbilityBattleEffects(ABILITYEFFECT_ENDTURN)`, `ItemBattleEffects(ITEMEFFECT_NORMAL)` as reached from those enum steps. Singles only. Docs-only step — no engine/test/tool/data edits. |
| Out of scope | Fixing anything; `Cmd_moveend`'s end-of-ACTION steps beyond the disambiguation in §0; doubles; Battle Scene ON; the internals of `battleScriptFaintedActionsOrchestration.ts` (audited only at its call seams). |
| NOT read (declared) | `battleScriptFaintedActionsOrchestration.ts`'s per-opcode script-running helpers (`runScriptToOwnEnd`, `runFaintedBattlerHandlers`' internals) — its four source states were verified at `:346-374`, `:409-470`, `:549`, `:599`, but the forced-switch script dance itself is `docs/forced-switch-ground-truth.md`'s slice; the ~1,100-line body of `runItemsTick`'s per-hold-effect branches (the two call positions and their `moveTurn` flags were verified; the individual berry branches were spot-checked, not exhaustively diffed — that is `docs/endturn-abilities-items-ground-truth.md`'s slice); `battleScriptDamagingWeatherOpcode.ts`'s per-battler damage math (only its `battlerByTurnOrder` read at `:153` was checked); Arena (`wishPerishSongState` case 2) — unreachable in Factory. |

**Verdict counts** — see §6.

---

## §0. The disambiguation this audit must not get wrong: end-of-ACTION vs end-of-TURN

Two different machines, easily conflated:

* **End of ACTION** — `Cmd_moveend` (`reference/pokeemerald/src/battle_script_commands.c`, `MOVEEND_*` states). Runs once per *move*, inside the action, while `gBattleMainFunc == RunBattleScriptCommands_PopCallbacksStack`. Its `MOVEEND_ITEM_EFFECTS_ALL` / `MOVEEND_KINGSROCK_SHELLBELL` / synchronize / immunity steps call `ItemBattleEffects(ITEMEFFECT_*, ..., moveTurn=TRUE)` and `AbilityBattleEffects(ABILITYEFFECT_SYNCHRONIZE*, ...)`. **None of it is end-of-turn.**
* **End of TURN** — `BattleTurnPassed` (`battle_main.c:3956`), reached only from `sEndTurnFuncsTable[gBattleOutcome & 0x7F]` (`battle_main.c:554-565`) via `RunTurnActionsFunctions` (`battle_main.c:4945-4948`) once `gCurrentTurnActionNumber >= gBattlersCount`. This is what this audit covers.

The one genuine overlap is `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, moveTurn)`, which both machines call. The `moveTurn` flag is the discriminator, and **the step brief's "`moveTurn` FALSE" is only half true**: `ENDTURN_ITEMS1` passes `FALSE` (`battle_util.c:1500`) and `ENDTURN_ITEMS2` passes `TRUE` (`battle_util.c:1505`). `moveTurn=TRUE` suppresses Leftovers, RESTORE_HP, RESTORE_PP, the stat-up berries and the crit berry, and leaves only the status-cure berries and White Herb live — which is exactly why `ENDTURN_ITEMS2` exists after `ENDTURN_YAWN` (a Chesto Berry cures the sleep Yawn just applied, in the same end-turn pass). The port reproduces both flags (`src/engine/battleEndTurnOrchestration.ts:1574` `false`, `:1725` `true`).

## §1. The outer chain (`battle_main.c`)

```
RunTurnActionsFunctions (battle_main.c:4936)
  └─ gCurrentTurnActionNumber >= gBattlersCount
       └─ gBattleMainFunc = sEndTurnFuncsTable[gBattleOutcome & 0x7F]   :4947
            └─ [0] HandleEndTurn_ContinueBattle                          :3932
                 · clears gBattleCommunication[], STATUS2_FLINCHED,
                   CancelMultiTurnMoves for sleeping multi-turners       :3941-3945
                 · ZEROES turnEffectsTracker/turnEffectsBattlerId/
                   wishPerishSongState/wishPerishSongBattlerId/
                   turnCountersTracker, gMoveResultFlags                 :3947-3952
                 · gBattleMainFunc = BattleTurnPassed                    :3938
BattleTurnPassed (battle_main.c:3956)
  1. TurnValuesCleanUp(TRUE)                                             :3960
  2. if (gBattleOutcome == 0) { DoFieldEndTurnEffects(); return-if-fired } :3962-3964
  3. if (gBattleOutcome == 0) { DoBattlerEndTurnEffects(); return-if-fired } :3965-3966
  4. HandleFaintedMonActions()   ← NOT gated on gBattleOutcome           :3968
  5. gBattleStruct->faintedActionsState = 0                              :3969
  6. HandleWishPerishSongOnTurnEnd()  ← Future Sight, then Perish Song   :3971
  7. TurnValuesCleanUp(FALSE) + hitmarker/scripting/damage resets        :3974-3986
  8. battleTurnCounter++, gChosenActionByBattler[]=NONE,
     gChosenMoveByBattler[]=NONE, monToSwitchIntoId=PARTY_SIZE           :3994-4009
  9. gBattleMainFunc = HandleTurnActionSelectionState                    :4012
 10. gRandomTurnNumber = Random()   ← ONE unconditional draw per turn    :4013
```

Every "return-if-fired" is a yield: the fired case called `BattleScriptExecute`, which pushed `BattleTurnPassed` onto the callback stack, so after the script's `end2` the ENTIRE function re-runs from step 1 with the cursors (`turnCountersTracker`/`turnSideTracker`/`turnEffectsTracker`/`turnEffectsBattlerId`/`wishPerishSongState`/`wishPerishSongBattlerId`) pointing past the case that just fired.

**Port site.** `src/engine/battleEndTurnOrchestration.ts:2500` `runBattleEndTurnOrchestration` collapses the whole re-entrant chain into one synchronous call, and `src/engine/factoryBattleScriptFullTurnDecision.ts:2324` `runEndTurnTail` is the only kernel caller (plus `:2686` for the forced-switch resume). The `gRandomTurnNumber` draw is ported at `factoryBattleScriptFullTurnDecision.ts:2386`, after the interpreter ledger is reconciled — **SAME-ORDER**, verified draw-for-draw.

| outer step | source | port site | verdict |
| --- | --- | --- | --- |
| `HandleEndTurn_ContinueBattle` cursor zeroing | `battle_main.c:3947-3952` | `battleEndTurnOrchestration.ts:2509-2518` (`withWishPerishSongCursor(state, 0, 0)`; tracker/battlerId cursors do not exist because the port never yields mid-pass) | SAME-ORDER |
| `HandleEndTurn_ContinueBattle` STATUS2_FLINCHED clear + sleep `CancelMultiTurnMoves` | `battle_main.c:3941-3945` | **no port site** — flinch is cleared only by the `CANCELER_FLINCH` action phase (`battleScriptActionAdmission.ts:2031-2038`); the sleep/multi-turn cancel has none at all | **DIVERGENT — finding 6 (high)** |
| `TurnValuesCleanUp(TRUE)` (entry) | `battle_main.c:3960` → `:4857-4891` | `battleEndTurnOrchestration.ts:2511-2513` clears only the two Follow Me timers; `protected`/`endured` are NOT cleared at entry (only in the tail memset at `:2129`) | DIVERGENT-BENIGN (F7) |
| `DoFieldEndTurnEffects` gate | `battle_main.c:3962` | `battleEndTurnOrchestration.ts:2520` (`battleOutcome === 0`) | SAME-ORDER |
| `DoBattlerEndTurnEffects` gate | `battle_main.c:3965` | `battleEndTurnOrchestration.ts:2543` (inside the same `battleOutcome === 0` block) | SAME-ORDER |
| `HandleFaintedMonActions` ungated | `battle_main.c:3968` | `battleEndTurnOrchestration.ts:2555-2557` (outside the gate; every `outcome-decided` return also routes here) | SAME-ORDER |
| `HandleWishPerishSongOnTurnEnd` after faints | `battle_main.c:3971` | `battleEndTurnOrchestration.ts:2442` `finishFaintedThenDelayed` → `:2318` `runFutureAttacksAfterFaints` → `:2168` `runPerishSongAfterFutureAttacks` | SAME-ORDER |
| `TurnValuesCleanUp(FALSE)` (tail) | `battle_main.c:3974` → `:4866-4886` | `battleEndTurnOrchestration.ts:2129` `finishTurnValuesCleanUp` (full ProtectStruct memset + Follow Me) | SAME-ORDER for `ProtectStruct`; `isFirstTurn--`/`rechargeTimer--`/substitute-status2 sync are NOT in this helper (F8) |
| `gRandomTurnNumber = Random()` | `battle_main.c:4013` | `factoryBattleScriptFullTurnDecision.ts:2386` | SAME-ORDER |

## §2. `DoFieldEndTurnEffects` — the 10 field steps (`battle_util.c:1166-1438`)

Enum: `ENDTURN_ORDER, ENDTURN_REFLECT, ENDTURN_LIGHT_SCREEN, ENDTURN_MIST, ENDTURN_SAFEGUARD, ENDTURN_WISH, ENDTURN_RAIN, ENDTURN_SANDSTORM, ENDTURN_SUN, ENDTURN_HAIL, ENDTURN_FIELD_COUNT` (`battle_util.c:1166-1179`). The `do { switch } while (effect == 0)` means non-firing cases advance in the same tick; a firing case yields.

**Case-major, side-minor.** Each of the four side-scoped cases owns its own `while (turnSideTracker < 2)` loop over side 0 then side 1 (`:1221`, `:1246`, `:1272`, `:1294`), and `turnSideTracker` is reset to 0 only when the case finishes without firing. So the true order is *Reflect(side0), Reflect(side1), LightScreen(side0), LightScreen(side1), Mist(side0), Mist(side1), Safeguard(side0), Safeguard(side1)*.

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| F1 | `ENDTURN_ORDER` — identity-fill `gBattlerByTurnOrder`, then bubble-sort with `GetWhoStrikesFirst(a, b, FALSE)`; `SwapTurnOrder` on any non-zero return (`battle_util.c:1199-1218`, sort call at `:1209`) | `battleEndTurnOrchestration.ts:2521-2529` + `:2058` `computeBattlerOrder` — **copies the existing `battlerByTurnOrder` and never sorts**; that array was last written by the action-selection seam (`factoryBattleScriptFullTurnDecision.ts:1943-1948` `withTurnOrderPositions`, `battlerByTurnOrder: [mover1, mover2, 2, 3]`) | **DIVERGENT — finding 1 (critical)** |
| F2 | `ENDTURN_REFLECT`, sides 0→1 (`battle_util.c:1220-1243`) | `battleEndTurnOrchestration.ts:1959` inside a `for (side of [0,1])` at `:1958` | **DIVERGENT (nesting inverted) — finding 2**; per-side timer/status/`PREPARE_MOVE_BUFFER` semantics themselves SAME-ORDER |
| F3 | `ENDTURN_LIGHT_SCREEN`, sides 0→1 (`:1245-1268`) | `battleEndTurnOrchestration.ts:1968` (same inverted nesting) | **DIVERGENT — finding 2** |
| F4 | `ENDTURN_MIST`, sides 0→1; guard is the raw `mistTimer`, not a `SIDE_STATUS_MIST` bit (`:1270-1291`) | `battleEndTurnOrchestration.ts:1977` → `:1815` `runMistFieldCase` (same raw-timer guard) | **DIVERGENT — finding 2** (nesting only). Body SAME-ORDER; unreachable at Factory L50 (0 `MOVE_MIST` carriers in the 882-entry catalog — re-verified this session) |
| F5 | `ENDTURN_SAFEGUARD`, sides 0→1 (`:1293-1315`) | `battleEndTurnOrchestration.ts:1982` (same inverted nesting) | **DIVERGENT — finding 2** |
| F6 | `ENDTURN_WISH` — positional over `gBattlerByTurnOrder[turnSideTracker]`, decrement, fire only when the decrement reaches 0 AND `hp != 0`, `gBattlerTarget = gActiveBattler` (`:1316-1338`) | `battleEndTurnOrchestration.ts:1999-2029` (same loop over `battlerByTurnOrder`, same decrement-then-check, same `selectorRoles.target`) | SAME-ORDER (inherits F1's wrong order source) |
| F7 | `ENDTURN_RAIN` — `--weatherDuration` unless `RAIN_PERMANENT`, chooser RAIN_STOPPED/DOWNPOUR/CONTINUES, always fires while rain is up (`:1340-1372`) | `battleEndTurnOrchestration.ts:2027` → `:1858` `runRainFieldCase` | SAME-ORDER; `RAIN_PERMANENT` (Drizzle) is a documented non-port, unreachable (Kyogre is not a rental) |
| F8 | `ENDTURN_SANDSTORM` — `!PERMANENT && --duration == 0` picks `SandStormHailEnds` else `DamagingWeatherContinues` (`:1374-1392`) | `battleEndTurnOrchestration.ts:2032` → `:1917` `runDamagingWeatherFieldCase` | SAME-ORDER for the C-side branch. **Note:** the port's `else if` chain (`:2026-2047`) replaces four independent `case` steps; that is equivalent only because `gBattleWeather` is single-valued (every setter assigns, never ORs) — verified, not assumed. `SANDSTORM_PERMANENT` (Tyranitar's Sand Stream, 10 rental entries) is unwired upstream, so the permanent branch is currently unreachable in the port |
| F9 | `ENDTURN_SUN` — two distinct labels, no chooser (`:1394-1410`) | `battleEndTurnOrchestration.ts:2037` → `:1886` `runSunFieldCase` | SAME-ORDER |
| F10 | `ENDTURN_HAIL` — **no `PERMANENT` check at all**, always decrements (`:1412-1430`) | `battleEndTurnOrchestration.ts:2042` → `:1917` (shared with F8; also decrements unconditionally) | SAME-ORDER (the source quirk is faithfully inherited) |
| F11 | `ENDTURN_FIELD_COUNT` — `effect++` to break the `do/while` (`:1432-1434`) | implicit: `runDoFieldEndTurnEffects` returns `{kind:"clean"}` at `:2049` | SAME-ORDER |

**F12 (the pre-seed).** `battle_util.c:1185-1191`, at the head of `DoFieldEndTurnEffects`, walks `gBattlerAttacker` and `gBattlerTarget` to the first **non-absent** battler — in singles with both sides alive, that is literally `0`, every turn, before any case runs. The port has no equivalent reset: every screen/Wish case passes its battler explicitly (`battleEndTurnOrchestration.ts:1802`, `:1841`, `:2018`), but the three weather helpers fall back to `rc.selectorRoles.attacker ?? 0` (`:1873`, `:1902`, `:1946`, `:1950`), and nothing between the last action and here rewrites `selectorRoles.attacker` — so it still holds **the turn's last mover**. **Verdict: DIVERGENT-BENIGN.** The only consumers are `BattleScript_RainContinuesOrEnds`' `playanimation BS_ATTACKER, B_ANIM_RAIN_CONTINUES` and `BattleScript_DamagingWeatherContinues`' `playanimation_var BS_ATTACKER, sB_ANIM_ARG1` — an animation subject, not a damage or message subject (`gSandStormHailContinuesStringIds`/`gSandStormHailDmgStringIds` are field-scoped strings, and the per-battler damage loop reassigns `gBattlerAttacker` itself via `copyarraywithindex`, `battle_scripts_1.s:3705`). Under Battle Scene OFF it is unobservable; under Battle Scene ON it would pick the wrong anchor battler for the weather animation whenever battler 1 moved last.

## §3. `DoBattlerEndTurnEffects` — the 20 per-battler steps (`battle_util.c:1440-1783`)

Enum (`:1440-1461`): `INGRAIN(0), ABILITIES(1), ITEMS1(2), LEECH_SEED(3), POISON(4), BAD_POISON(5), BURN(6), NIGHTMARES(7), CURSE(8), WRAP(9), UPROAR(10), THRASH(11), DISABLE(12), ENCORE(13), LOCK_ON(14), CHARGE(15), TAUNT(16), YAWN(17), ITEMS2(18), BATTLER_COUNT(19)`.

**Battler-major, case-minor** — the reverse of the field loop. `while (turnEffectsBattlerId < gBattlersCount && turnEffectsTracker <= ENDTURN_BATTLER_COUNT)` (`:1469`) with `gActiveBattler = gBattlerAttacker = gBattlerByTurnOrder[turnEffectsBattlerId]` (`:1471`); `ENDTURN_BATTLER_COUNT` resets the tracker to 0 and bumps the battler id (`:1775-1777`). So the fastest battler runs all 19 effects before the slower battler runs its first. Absent battlers are skipped by `gAbsentBattlerFlags` (`:1472-1475`) — note that a battler that faints *during this very pass* is NOT absent yet (the flag is set later, by `BattleScript_HandleFaintedMon` inside `HandleFaintedMonActions`), so its remaining non-`hp!=0`-guarded cases still run.

`gHitMarker |= (HITMARKER_GRUDGE | HITMARKER_IGNORE_BIDE)` is raised at entry (`:1468`) and cleared **only** on the clean `return 0` (`:1781`) — i.e. it stays raised across every yield. Port: `withEndTurnHitMarkers` at `:1552` and re-applied after every case (`:1561`, `:1571`, ...), cleared only at `:1740`. SAME-ORDER — this is the ISSUES #126 Bide-ignore fix and it holds.

| # | source step (file:line) | port site (file:line) | verdict |
| --- | --- | --- | --- |
| B0 | outer traversal `gBattlerByTurnOrder` + absent skip (`:1469-1475`) | `battleEndTurnOrchestration.ts:1553-1554` (`for (const battler of battlerOrder)`, absent skip) | SAME-ORDER *shape*; the order **content** is wrong via F1 — **finding 1** |
| B1 | `ENDTURN_INGRAIN` — `STATUS3_ROOTED && hp != maxHP && hp != 0`, heal `maxHP/16` min 1 (`:1480-1493`) | `:1555` → `:743` `runIngrainTick` | SAME-ORDER |
| B2 | `ENDTURN_ABILITIES` — `AbilityBattleEffects(ABILITYEFFECT_ENDTURN, gActiveBattler, 0,0,0)` (`:1494-1498`) → `:2601-2658`: `hp != 0` gate, then Rain Dish / Shed Skin / Speed Boost / Truant only | `:1562` → `:1172` `runAbilitiesTick` (same four abilities, same `hp === 0` gate at `:1179`) | SAME-ORDER |
| B2a | Rain Dish: `WEATHER_HAS_EFFECT && (weather & RAIN) && maxHP > hp`, heal `maxHP/16`, `BattleScriptPushCursorAndCallback` (`:2608-2618`) | `:1180-1192` (`weatherHasEffect` at `:1088`, `runPushCursorAndCallbackTickScript` at `:583`) | SAME-ORDER |
| B2b | Shed Skin: `status1 & ANY && (Random() % 3) == 0`, ONE draw whether or not it hits (`:2620-2640`) | `:1114` `runShedSkinTick` — draws first, then `% 3` (`:1128-1133`) | SAME-ORDER (draw is unconditional on `status1 != 0`, matching) |
| B2c | Speed Boost: `statStages[SPEED] < MAX && isFirstTurn != 2` (`:2642-2651`) | `:1194-1210` (same `isFirstTurn !== 2` guard) | SAME-ORDER — this is what suppresses Speed Boost on the turn the holder switched in |
| B2d | Truant: `truantCounter ^= 1`, **no script, no `effect++`** (`:2653-2655`) | `:1216-1221` (returns `"advance"`, never `"fired"`) | SAME-ORDER |
| B3 | `ENDTURN_ITEMS1` — `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, FALSE)` (`:1499-1503`) | `:1574` `runItemsTick(..., false)` → `:1264` | SAME-ORDER |
| B4 | `ENDTURN_LEECH_SEED` — needs `STATUS3_LEECHSEED`, seeder `hp != 0`, self `hp != 0`; `gBattlerTarget` = the *receiver* (`:1506-1522`) | `:1586` → `:766` `runLeechSeedTick` (same three guards, same target inversion) | SAME-ORDER |
| B5 | `ENDTURN_POISON` — `maxHP/8` min 1 (`:1523-1533`) | `:1593` → `:652` `runBattlerStatusDamageTick` first branch | SAME-ORDER |
| B6 | `ENDTURN_BAD_POISON` — `maxHP/16` min 1 × counter, counter++ capped at 15 (`:1534-1547`) | `:652` second branch (`bumpToxicCounter` at `:628`) | SAME-ORDER. The port collapses B5/B6/B7 into one function with early `return`s; equivalent because `STATUS1_POISON`/`TOXIC_POISON`/`BURN` are mutually exclusive (every setter is gated on `STATUS1_ANY`) — checked, not assumed |
| B7 | `ENDTURN_BURN` — `maxHP/8` min 1 (`:1548-1559`) | `:652` third branch | SAME-ORDER |
| B8 | `ENDTURN_NIGHTMARES` — damage `maxHP/4` only while `STATUS1_SLEEP`; otherwise silently clears the bit (the Emerald-only fix) (`:1561-1580`) | `:1600` → `:688` `runNightmareTick` | SAME-ORDER |
| B9 | `ENDTURN_CURSE` — `maxHP/4` min 1 (`:1581-1591`) | `:1607` → `:721` `runCurseTick` | SAME-ORDER |
| B10 | `ENDTURN_WRAP` — decrement FIRST, then damage-or-release branch (`:1592-1623`) | `:1614` → `:795` `runWrapTick` | SAME-ORDER |
| B11 | `ENDTURN_UPROAR` — wake-one-sleeper sub-loop that re-runs the case without advancing the tracker (`effect = 2`), then the decrement + continue/end message (`:1625-1673`) | `:1620` → `:883` `runUproarTick` (drains the wake loop inline, then decrements) | SAME-ORDER (equivalent: each woken sleeper clears its own SLEEP bit, so source's restart-from-0 and the port's forward scan visit the same set) |
| B12 | `ENDTURN_THRASH` — decrement, `WasUnableToUseMove` → cancel, else on expiry set self-confusion via `SetMoveEffect(TRUE, 0)` and fire `ThrashConfuses` only if the bit actually landed (`:1674-1695`) | `:1627` → `:951` `runThrashTick` | SAME-ORDER |
| B13 | `ENDTURN_DISABLE` — move-gone check first, else `--disableTimer == 0` fires `DisabledNoMore` (`:1696-1719`) | `:1634` → `:455` `runDisableTick` | SAME-ORDER |
| B14 | `ENDTURN_ENCORE` — slot/move mismatch clears silently; else `--encoreTimer == 0 \|\| pp[slot] == 0` fires `EncoredNoMore` (`:1720-1737`) | `:1640-1675` (inline) | SAME-ORDER |
| B15 | `ENDTURN_LOCK_ON` — `status3 -= STATUS3_ALWAYS_HITS_TURN(1)` (`:1738-1742`) | `:1678-1686` | SAME-ORDER; body unreachable at Factory L50 (0 `MOVE_LOCK_ON`/`MOVE_MIND_READER` carriers) |
| B16 | `ENDTURN_CHARGE` — `chargeTimer && --chargeTimer == 0` clears `STATUS3_CHARGED_UP` (`:1743-1747`) | `:1688-1703` | SAME-ORDER |
| B17 | `ENDTURN_TAUNT` — bare `tauntTimer--`, no script (`:1748-1752`) | `:1704-1717` | SAME-ORDER |
| B18 | `ENDTURN_YAWN` — decrement; on expiry apply sleep if `!status1 && ability != VITAL_SPIRIT && ability != INSOMNIA && !UproarWakeUpCheck` — **no Safeguard check** (`:1753-1773`) | `:1718` → `:1026` `runYawnTick` (same four conditions, same missing Safeguard check, same `(Random() & 3) + 2` draw) | SAME-ORDER |
| B19 | `ENDTURN_ITEMS2` — `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, TRUE)` (`:1504-1508` in switch text, enum position 18) | `:1725` `runItemsTick(..., true)` | SAME-ORDER |
| B20 | `ENDTURN_BATTLER_COUNT` — tracker=0, battlerId++ (`:1775-1777`) | implicit in the `for` loop at `:1553` | SAME-ORDER |
| B21 | clean-exit hitmarker clear (`:1781`) | `:1740` `withoutEndTurnHitMarkers` | SAME-ORDER |

## §3b. `HandleWishPerishSongOnTurnEnd` (`battle_util.c:1785-1890`)

| # | source step | port site | verdict |
| --- | --- | --- | --- |
| W0 | entry `gHitMarker |= GRUDGE\|IGNORE_BIDE` (`:1787`), cleared on the FALSE return (`:1887`) | `:2176` / `:2333` raise, `:2296` clear | SAME-ORDER |
| W1 | state 0 — Future Sight/Doom Desire, **positional** `wishPerishSongBattlerId` 0..N (NOT turn order), absent skip, cursor bumped *before* firing, `shellBellDmg = IGNORE_SHELL_BELL`, side `SIDE_STATUS_FUTUREATTACK` cleared when both slots' counters are 0 (`:1791-1830`) | `:2318` `runFutureAttacksAfterFaints` — positional `for (index = wishPerishSongBattlerId; ...)` at `:2334`, cursor bump at `:2336`, partner check `battler ^ 2` at `:2353` | SAME-ORDER |
| W2 | state 1 — Perish Song, **turn-order** `gBattlerByTurnOrder[wishPerishSongBattlerId]` (`:1836`), `PREPARE_BYTE_NUMBER_BUFFER` with the PRE-decrement timer, timer 0 ⇒ `PerishSongTakesLife` (damage = full HP) else `PerishSongCountGoesDown` (`:1834-1861`) | `:2168` `runPerishSongAfterFutureAttacks` — same cursor, same pre-decrement buffer (`:2205`, `:2222`), same two labels | SAME-ORDER (inherits F1's wrong order source) |
| W3 | state 2 — Arena judgment (`:1868-1882`) | `:2289` `finishWishPerishSong` treats state > 1 as done | NOT-PORTED, unreachable (Factory is not the Arena) |
| W4 | a delayed-attack/Perish KO re-enters `BattleTurnPassed`, so `HandleFaintedMonActions` runs between two delayed effects | `:2384-2414` (Future Sight) and `:2237-2274` (Perish) both call `runBattleScriptFaintedActionsOrchestration` inline before continuing the scan | SAME-ORDER |

## §3c. `HandleFaintedMonActions` (`battle_util.c:1894-1971`)

| # | source step | port site | verdict |
| --- | --- | --- | --- |
| H1 | state 0 — clear `gAbsentBattlerFlags` for any side that still has a switchable mon (`:1903-1911`) | no port site (`battleScriptFaintedActionsOrchestration.ts:12-19` documents the omission) | SAME-ORDER-EQUIVALENT — **provable no-op in singles**: the source loop is bounded by `gBattlersCount == 2`, so slots 2/3 are never visited; and slots 0/1 only ever get the absent bit from `Cmd_openpartyscreen`'s two `HasNoMonsToSwitch` branches (`battle_script_commands.c:4886`, `:4915`), i.e. exactly when that side is out of mons and `checkteamslost` is about to end the battle. The port never writes `absentBattlerFlags` outside its `0` initializers (`factoryBattleStart.ts:426`, `factoryBattleScriptFullTurnDecision.ts:633`) |
| H2 | states 1/2 — `BattleScript_GiveExp` per fainted battler ascending, guarded by `!(givenExpMons & bit)` and `!absent`; then `OpponentSwitchInResetSentPokesToOpponentValue` (`:1912-1934`) | `battleScriptFaintedActionsOrchestration.ts:351-374` (ascending `collectFaintedBattlers` loop, `enterFaintedBattlerContext` = `gBattlerFainted = gBattlerTarget`, one `BattleScript_GiveExp` per fainted battler) | SAME-ORDER-EQUIVALENT — the two omissions are provably inert in the Factory: `Cmd_getexp` case 0 (`battle_script_commands.c:3269-3284`) jumps straight to state 6 for `BATTLE_TYPE_FRONTIER`, so `givenExpMons` is **never set** (the guard is always true) and `gSentPokesToOpponent` (`battle_util.c:927-944`) is written but never read on this path |
| H3 | states 3/4/5 — `BattleScript_HandleFaintedMon` per fainted battler ascending (this is where the replacement is chosen and `gAbsentBattlerFlags` is set) (`:1935-1955`) | `battleScriptFaintedActionsOrchestration.ts:549` `runFaintedBattlerHandlers`; the player-choice pause surfaces as `player-choice-required` and resumes via `resumeBattleScriptFaintedActionsAfterPlayerChoice` (`:599`) / `resumeBattleEndTurnAfterFaintedActions` (`battleEndTurnOrchestration.ts:2473`) | SAME-ORDER (see cross-step 1) |
| H4 | state 6 — `ABILITYEFFECT_INTIMIDATE1` → `ABILITYEFFECT_TRACE` → `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` → `ABILITYEFFECT_FORECAST`, in that order, each returning immediately on the first effect (`:1957-1963`) | `battleScriptFaintedActionsOrchestration.ts:409` `runPendingSwitchinEffects`: Intimidate loop (`:415-440`), Trace loop (`:441-...`), White Herb pass — **no Forecast step** | Intimidate/Trace/item **SAME-ORDER** (the ISSUES #128 fix at HEAD `d94469e7` puts both records on `aiObservedAbilityIds[0]`, matching the literal-`0` dispatch at `battle_util.c:1959-1960`); `ABILITYEFFECT_FORECAST` **NOT-PORTED** — see finding 7 |

Note H4's third call: `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` passes battler **0** literally and `moveTurn = TRUE` — it is a whole-field poll, not a per-battler one, and it is the one `ITEMEFFECT_NORMAL` call that is neither ITEMS1 nor ITEMS2. Flagged here so a future reader does not conflate it with B3/B19.

---

## §4. Cross-step interactions (the ten the step brief names)

### (1) End-turn faint (poison / Leech Seed / Curse / Perish) — stop point, `HandleFaintedMonActions`, resume cursor — **SAME-ORDER**

Source, re-derived from the C (not from the test names):

* The damage scripts are `BattleScript_PoisonTurnDmg`/`BurnTurnDmg`/`NightmareTurnDmg`/`CurseTurnDmg`/`WrapTurnDmg` → `BattleScript_DoTurnDmg` (`data/battle_scripts_1.s:3739-3748`), whose tail is `tryfaintmon BS_ATTACKER` + `checkteamslost BattleScript_DoTurnDmgEnd` + `end2`. So an end-turn KO is resolved **inline, inside the tick script** — `checkteamslost` can set `gBattleOutcome` right there.
* If the battle is NOT decided, the script just ends. `BattleTurnPassed` re-runs from step 1 (§1) and `DoBattlerEndTurnEffects` resumes at `turnEffectsTracker` — **which the firing case already incremented before returning** (e.g. `battle_util.c:1532` for POISON). So the just-fainted battler continues through its own remaining cases: `NIGHTMARES`..`ITEMS2` all still execute for it. Only the `hp != 0`-guarded cases (`ABILITIES` `:2602`, `ITEMS1`/`ITEMS2` `:3332`, `INGRAIN` `:1483`, `LEECH_SEED` `:1509`, `POISON`/`BAD_POISON`/`BURN`/`NIGHTMARES`/`CURSE`/`WRAP`) skip; `UPROAR`, `THRASH`, `DISABLE`, `ENCORE`, `LOCK_ON`, `CHARGE`, `TAUNT`, `YAWN` have **no hp guard** and still tick on a corpse. `gAbsentBattlerFlags` is not set until `BattleScript_HandleFaintedMon` runs later, so the outer `:1472` absent-skip does not fire either.
* If the battle IS decided, `gBattleOutcome != 0` and the re-entered `BattleTurnPassed` skips **both** loops (`:3962`) and drops straight to `HandleFaintedMonActions`.

Port: `runDoBattlerEndTurnEffects` (`battleEndTurnOrchestration.ts:1544`) continues to the next case after every `"fired"` outcome and only bails on `battleOutcome !== 0` (`:1568`, `:1580`, `:1590`, …) — the same two behaviours. The KO does not pause the loop; the pause happens later, inside `runBattleScriptFaintedActionsOrchestration` (`:2555`), which is exactly where source blocks too (`BattleScript_HandleFaintedMon`'s party-screen round trip). On resume, `resumeBattleEndTurnAfterFaintedActions` (`:2473`) re-enters at `runFutureAttacksAfterFaints` and **never** re-runs the field/battler loops — matching source, whose re-entered `DoFieldEndTurnEffects` returns immediately at `ENDTURN_FIELD_COUNT` (`:1432`) and whose `DoBattlerEndTurnEffects` `while` at `:1469` is already false (`turnEffectsBattlerId == gBattlersCount`).

One real source detail the port reproduces: on that re-entry the exhausted `DoBattlerEndTurnEffects` still executes `:1468`'s raise and `:1781`'s clear, so `HandleFaintedMonActions` runs with `GRUDGE|IGNORE_BIDE` **down**, and `HandleWishPerishSongOnTurnEnd` raises them again at `:1787`. Port: `withoutEndTurnHitMarkers(state)` immediately before each fainted-actions call (`:2244`, `:2390`, `:2556` via `runDoBattlerEndTurnEffects`'s `:1740` clean return) and `withEndTurnHitMarkers` at `:2176`/`:2333`. Verified line by line.

Pinned today by `tests/endTurnResumeCursorIssue102.test.ts` (3 cases), `tests/endTurnFaintResumeIssue104.test.ts` (1 case), `tests/bideEndTurnIgnoreBideIssue126.test.ts`.

### (2) Leftovers / Shed Skin / Speed Boost order between two battlers, ties vs differences — `gBattlerByTurnOrder` computed WHEN? — **DIVERGENT (finding 1)**

**Source answer: twice per turn, from two different call sites, with two different argument sets.**

1. `SetActionsAndBattlersTurnOrder` (`battle_main.c:4817-4850`) — before the actions run, `GetWhoStrikesFirst(b1, b2, FALSE)` at `:4846`, and switch/item actions are force-ordered ahead of moves without any speed comparison (`:4820-4832`).
2. `ENDTURN_ORDER` (`battle_util.c:1199-1218`) — **after** every action has resolved, identity-refill then `GetWhoStrikesFirst(gBattlerByTurnOrder[i], gBattlerByTurnOrder[j], FALSE)` at `:1209`, reading **current** `gBattleMons[].speed`, **current** `statStages[STAT_SPEED]`, **current** `STATUS1_PARALYSIS`, **current** weather (Swift Swim/Chlorophyll) and **current** hold effect — and still reading `gChosenActionByBattler`/`chosenMovePositions` for move priority, because those are not cleared until `battle_main.c:4001-4004`, i.e. after this.

On an exact effective-speed tie the comparison consumes `Random() & 1` (`battle_main.c:4728` in the non-zero-priority branch, `:4745` in the both-zero branch — `&&` short-circuits, so no draw when speeds differ). That means a Factory turn with tied actives costs the ROM **two** speed-tie draws, not one.

Within one battler the relative order Speed Boost/Shed Skin/Rain Dish (`ENDTURN_ABILITIES`, position 1) → Leftovers/berries (`ENDTURN_ITEMS1`, position 2) is correct in the port. It is the *between-battler* order that is wrong: `computeBattlerOrder` (`battleEndTurnOrchestration.ts:2058`) returns the action-time array untouched. See finding 1 for the failure scenarios and the staging recipe.

### (3) Future Sight hitting a Substitute / a fainted target / a switched-in target — **SAME-ORDER**

* **Substitute:** `BattleScript_MonTookFutureAttack` (`battle_scripts_1.s:3508-3538`) never sets `HITMARKER_IGNORE_SUBSTITUTE` (contrast `BattleScript_DoTurnDmg:3742` and `LeechSeedTurnDrain:3567`, which both do). Its `datahpupdate BS_TARGET` therefore goes through the substitute like a normal hit. It also runs `accuracycheck` (a real RNG draw and a real miss branch, `BattleScript_FutureAttackMiss:3539`) and `adjustnormaldamage2` (Focus Band / Endure / substitute-aware clamp). Port: same committed instruction stream — `src/data/gen/battle-script-program.json` blocks `BattleScript_MonTookFutureAttack` / `FutureAttackAnimate` / `DoFutureAttackHit` / `FutureAttackEnd` / `FutureAttackMiss` (source lines 3508-3546) are the assembled real script, executed by the same interpreter from `battleEndTurnOrchestration.ts:2369`.
* **Fainted target:** the counter guard is `--futureSightCounter[b] == 0 && gBattleMons[b].hp != 0` (`battle_util.c:1802-1804`). Because `HandleFaintedMonActions` runs **before** `HandleWishPerishSongOnTurnEnd` (`battle_main.c:3968` vs `:3971`), a battler that fainted earlier this turn has already been **replaced** by the time the delayed hit resolves — so the hit lands on the replacement, at full HP, not on the corpse. Only a side with nothing left (absent flag set) is skipped, at `:1794`. Port: `:2337` absent-skip, `:2348` `hp === 0` skip, after `finishFaintedThenDelayed` (`:2442`) has already run the faints. Same.
* **Switched-in target:** `futureSightCounter` is indexed by battler slot and is written only by `Cmd_setfutureattack` (`battle_script_commands.c:8940`) and decremented only here — nothing clears it on switch, in source or in port (`grep` over both trees). So a Baton Pass / forced switch does not dodge Future Sight; the incoming mon eats it. Same in both.
* **Note for whoever reads this next:** `BattleScript_FutureAttackEnd` (`:3533-3537`) runs `moveendcase MOVEEND_RAGE` and `moveendfromto MOVEEND_ITEM_EFFECTS_ALL, MOVEEND_UPDATE_LAST_MOVES`. This is the one place where genuine **end-of-ACTION** machinery executes *inside* the end-of-TURN phase — by design, in both trees. Do not "fix" it.

### (4) Perish Song count 0 on both battlers the same turn — **SAME-ORDER** (but the order it uses is finding 1's)

Source (`battle_util.c:1834-1861`): state 1 walks `gBattlerByTurnOrder`, and the **first** battler found at `perishSongTimer == 0` clears its own `STATUS3_PERISH_SONG`, sets `gBattleMoveDamage = hp`, fires `BattleScript_PerishSongTakesLife`, and **returns TRUE**. `BattleTurnPassed` re-enters: the field/battler loops are exhausted, so `HandleFaintedMonActions` (`battle_main.c:3968`) runs *now* — full `GiveExp` + `HandleFaintedMon` + the replacement's switch-in hooks (Intimidate/Trace/`ITEMEFFECT_NORMAL`/Forecast at `battle_util.c:1957-1962`) — and only then does state 1 resume at `wishPerishSongBattlerId`, already bumped past the first battler (`:1841`), to kill the second one.

So: **the faster battler (per `ENDTURN_ORDER`) faints first; its replacement is fully switched in, with entry abilities fired, before the slower battler's perish counter is even read.** If the first faint empties a party, `checkteamslost` inside `BattleScript_PerishSongTakesLife` ends the battle and the second battler never perishes. The AI's switch-in therefore sees a board where the opponent is still alive at full HP — that asymmetry is real ROM behaviour.

Port: `runPerishSongAfterFutureAttacks` (`:2168`) — cursor bump before firing (`:2193`), inline `runBattleScriptFaintedActionsOrchestration` on a zero-timer KO (`:2237-2274`), loop continues afterwards. Structurally identical. The only defect is *which* battler is "first" — finding 1.

### (5) Wish landing on a switched-in ally (Baton Pass / forced switch) — **SAME-ORDER**

`gWishFutureKnock.wishCounter[]` is indexed by **battler slot**, set to 2 by `Cmd_trysetwish`-equivalent (`battle_script_commands.c:9297-9299`) on `gBattlerAttacker`, decremented only at `ENDTURN_WISH` (`battle_util.c:1323-1324`), and cleared by nothing else — no switch path in either tree touches it (verified by grepping `wishCounter` across `reference/pokeemerald/src/*.c` and `src/engine/*.ts`). The heal therefore lands on whatever mon occupies the slot one turn later, gated only by `hp != 0`. Port: `battleEndTurnOrchestration.ts:1999-2029` (decrement, `!== 0` continue, `hp === 0` continue, `selectorRoles.target = battler`), setter at `battleScriptTrywishOpcode.ts:66-82` (`wishCounter[attacker] = 2`, no-op if already set). Same.

Caveat inherited from finding 1: `ENDTURN_WISH` iterates `gBattlerByTurnOrder`, so with two simultaneous Wishes the *message* order follows the (wrong) port order. HP outcomes are unaffected because the two heals are independent.

### (6) Weather timer expiry vs weather-dependent end-turn abilities (Rain Dish under expiring rain) — **SAME-ORDER: same turn, and the ability loses**

`ENDTURN_RAIN` (field step F7, `battle_util.c:1340-1372`) clears `B_WEATHER_RAIN_TEMPORARY` on the turn the duration hits 0. `ENDTURN_ABILITIES` (battler step B2, `:1494`) runs strictly later in the same `BattleTurnPassed` pass and re-reads `gBattleWeather` at `:2609`. So on rain's last turn, Rain Dish does **not** heal. Port: field loop at `battleEndTurnOrchestration.ts:2026-2047` mutates `rulesContext.weather` to `0`; `runAbilitiesTick` reads `state.rulesContext.weather` at `:1181` from the post-field state. Verified same. Same reasoning holds for Sandstorm/Hail damage vs anything later in the battler loop.

### (7) Yawn → sleep vs Insomnia / Vital Spirit / Safeguard — **SAME-ORDER** (and Safeguard does **not** block it)

Source `ENDTURN_YAWN` (`battle_util.c:1753-1773`) applies sleep iff: the packed counter just reached 0, **and** `!(status1 & STATUS1_ANY)`, **and** `ability != ABILITY_VITAL_SPIRIT`, **and** `ability != ABILITY_INSOMNIA`, **and** `!UproarWakeUpCheck(battler)`. There is **no `SIDE_STATUS_SAFEGUARD` check anywhere in this case** — Safeguard blocks the *setter* (`Cmd_setyawn`), not the delayed application. Sleep length is `(Random() & 3) + 2`, one draw, only on the branch that actually sleeps.

Port `runYawnTick` (`battleEndTurnOrchestration.ts:1026-1082`) implements exactly those five conditions in that order, with the same single draw at `:1063` and the same absent Safeguard check. Insomnia/Vital Spirit silently swallow the yawn with no message in both. **SAME-ORDER.** The `ENDTURN_ITEMS2` step immediately after (`:1725`, `moveTurn = TRUE`) is what lets a Chesto Berry cure that brand-new sleep in the same pass — correct in both.

### (8) Taunt / Encore / Disable decrement vs the move-selection lock (off-by-one) — **SAME-ORDER**

| timer | set to | read for selection | decremented | port |
| --- | --- | --- | --- | --- |
| Taunt | `2` (`battle_script_commands.c:9160`) | `tauntTimer != 0 && power == 0` (`battle_util.c:1014`, `:1110`, `:2135`) | `ENDTURN_TAUNT`, bare `--`, no expiry message (`battle_util.c:1749-1750`) | setter `battleScriptSettauntOpcode.ts:70`, gate `battleScriptActionAdmission.ts:2481`, decrement `battleEndTurnOrchestration.ts:1704-1717` |
| Disable | `Cmd_disablelastusedattack` | `disabledMove` match | `ENDTURN_DISABLE`: move-gone check first (silent clear), else `--disableTimer == 0` fires `DisabledNoMore` (`:1696-1719`) | `runDisableTick` `:455`, called at `:1634` |
| Encore | `Cmd_setencore` | `encoredMove` forces the slot (`battle_util.c:1116`) | `ENDTURN_ENCORE`: slot-mismatch silent clear, else `--encoreTimer == 0 \|\| pp[slot] == 0` fires `EncoredNoMore` (`:1720-1737`) | inline `:1640-1675` |

Because all three decrements sit at the **end** of the turn and every selection gate reads `!= 0`, "Taunt lasts the turn it lands plus the next one" falls out identically in both trees. No off-by-one found. The one asymmetry worth recording (present in both): Taunt's expiry is silent — no `BattleScript`, no message — while Disable and Encore both print, so a capture-diff of the end-turn window will show two messages, never three.

### (9) Ingrain / Leech Seed heal vs Liquid Ooze — **SAME-ORDER**

`ENDTURN_INGRAIN` (`battle_util.c:1480-1493`) is a pure self-heal: `gBattleMoveDamage = -(maxHP/16)`, script `BattleScript_IngrainTurnHeal`. **Liquid Ooze does not interact with it at all** in Emerald (no `jumpifability` in that script) — a claim worth stating explicitly because the sibling case does interact.

`ENDTURN_LEECH_SEED` (`:1506-1522`) sets `gBattlerTarget` to the *receiver* (the seeder) and fires `BattleScript_LeechSeedTurnDrain` (`battle_scripts_1.s:3565-3585`), whose order is: `datahpupdate BS_ATTACKER` (the seeded mon loses HP) → `copyword gBattleMoveDamage, gHpDealt` → `jumpifability BS_ATTACKER, ABILITY_LIQUID_OOZE, …LeechSeedTurnPrintLiquidOoze` → (no ooze) `manipulatedamage DMG_CHANGE_SIGN` → `datahpupdate BS_TARGET` → `printfromtable gLeechSeedStringIds` → `tryfaintmon BS_ATTACKER` → `tryfaintmon BS_TARGET`. With Liquid Ooze the sign flip is skipped, so the seeder *takes* the drain, and the two `tryfaintmon`s in that order mean **the seeded mon's faint is processed before the seeder's**.

Port: same committed script (the `jumpifability`/`copyword`/`manipulatedamage` opcodes are registered for exactly these operands — `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts` header §0), driven from `runLeechSeedTick` (`battleEndTurnOrchestration.ts:766-785`) with the same three guards and the same target inversion. SAME-ORDER. (Liquid Ooze carriers at Factory L50: Tentacool/Tentacruel/Gulpin/Swalot lines — ability-slot dependent; not enumerated here.)

### (10) Truant loaf-flag timing vs a Truant holder that switched in this turn — **SAME-ORDER**

Source: `Cmd_switchineffects` sets `truantCounter = 1` on switch-in unless `truantSwitchInHack` (`battle_script_commands.c:5259-5262`), with the source's own comment "ensure the truant counter will be 0 when the battler's next turn starts". `ENDTURN_ABILITIES` then toggles `truantCounter ^= 1` (`battle_util.c:2653-2655`) for every living Truant holder — **including one that switched in this very turn** (unlike Speed Boost, this case has no `isFirstTurn` guard). Net: switch in on turn N ⇒ counter 1 → 0 at end of N ⇒ free to act on N+1. The action-side reader is `AtkCanceler_UnableToUseMove`'s `CANCELER_TRUANT` (`battle_util.c:2087`).

A replacement installed by `HandleFaintedMonActions` **after** the battler loop has already run gets `truantCounter = 1` and is **not** toggled this turn — it still acts on the next turn because the toggle happens at that next turn's end… no: it is `CANCELER_TRUANT` that reads the flag at action time, so a post-faint replacement with `truantCounter = 1` **loafs on its first turn**. That asymmetry between a chosen switch (free) and a faint replacement (loafs) is real ROM behaviour and both trees reproduce it, because both put the switch-in write and the end-turn toggle at the same two positions.

Port: switch-in write `battleScriptSwitchinOpcode.ts:1182-1186` (guarded `truantCounter !== 1`, the same net effect as source's hack flag, which the port does not model — the hack only fires after an Arena judgment), toggle `battleEndTurnOrchestration.ts:1216-1221`, action-time read `battleScriptActionAdmission.ts:1767`. SAME-ORDER.

---

## §5. Findings, ranked

**Severity order: 1 > 2 > 6 > 3 > 7 > 4 > 5.** (They are numbered in the order they were found; finding 6 was upgraded from "scenario unproven" to **high** after the `AtkCanceler` phase order and the `SetMoveEffect` turn-order guard were read, so it outranks findings 3-5 despite its number.)

Every DIVERGENT claim below was checked twice: both cited files re-opened at the cited lines in a second pass, and the symbol grepped across the whole `reference/pokeemerald/src` tree (resolved via `$(cd reference/pokeemerald && pwd -P)`, because `rg` over the symlink returns nothing) and the whole `src/` tree — not one file.

### FINDING 1 — `ENDTURN_ORDER` is never recomputed: the end-turn traversal uses the ACTION order, and the ROM's second speed-tie `Random()` draw is missing (**critical, RNG- and outcome-affecting**)

* **Source:** `battle_util.c:1199-1218` — `DoFieldEndTurnEffects` case `ENDTURN_ORDER` refills `gBattlerByTurnOrder[i] = i` and re-sorts it with `GetWhoStrikesFirst(gBattlerByTurnOrder[i], gBattlerByTurnOrder[j], FALSE)` (`:1209`) + `SwapTurnOrder` (`:1210`), every turn, before any other end-turn work. `GetWhoStrikesFirst` is `battle_main.c:4595-4753`; its speed-tie branches draw `Random() & 1` at `:4728` and `:4745`. All four call sites in the tree: `battle_main.c:3858` (pre-first-turn, `TRUE`), `battle_main.c:4846` (`SetActionsAndBattlersTurnOrder`, `FALSE`), `battle_util.c:1209` (this one, `FALSE`), `battle_ai_script_commands.c:1270/1278` (AI, `TRUE`).
* **Port:** `src/engine/battleEndTurnOrchestration.ts:2521` calls `computeBattlerOrder` (`:2058`), which is `rulesContext.battlerByTurnOrder.slice(0, count)` — a copy, no sort, no draw. The array it copies was last written at `src/engine/factoryBattleScriptFullTurnDecision.ts:1943-1948` (`withTurnOrderPositions`: `battlerByTurnOrder: [mover1, mover2, 2, 3]`), i.e. the **action** order, computed at `:2995-3013` before the turn's actions ran. `getWhoStrikesFirst` has exactly one call site in the turn drivers (`factoryBattleScriptFullTurnDecision.ts:3005`); `sortBattlersByTurnOrder` has none.
* **What differs:** (a) the traversal order whenever effective speed or the priority inputs changed *during* the turn; (b) one missing `Random()` draw on every turn where the two actives' effective speeds are exactly equal — which desynchronises the entire subsequent RNG stream (damage rolls, crits, secondary-effect procs, AI scoring, Shed Skin, Yawn duration).
* **Divergence triggers, all Factory-L50-reachable, most reachable first:**
  1. **Either side switched this turn.** `SetActionsAndBattlersTurnOrder` puts switch/item actions first *without any speed comparison* (`battle_main.c:4820-4832`; the port encodes this as `playerFirst = playerSwitch`, `factoryBattleScriptFullTurnDecision.ts:2993`). `ENDTURN_ORDER` then re-sorts purely by speed. So on **every switch turn** where the switcher is the slower mon, ROM's end-turn order is the reverse of the port's.
  2. **Paralysis applied this turn** (62 `MOVE_THUNDER_WAVE` carriers, plus Body Slam/Static/Stun Spore procs): the action order used the pre-paralysis speed, `ENDTURN_ORDER` uses `speed / 4`.
  3. **Speed stage changed this turn** — Dragon Dance (22 carriers), Agility, String Shot, Icy Wind, Cotton Spore, Scary Face, or a Salac Berry that popped mid-turn.
  4. **Weather started this turn** with a Swift Swim/Chlorophyll carrier active.
  5. **Exact speed tie** — no order change, but the missing second draw.
* **Concrete failure scenario (HP + winner flip, two Pokémon):** Sandstorm is up. `BattleScript_DamagingWeatherContinues` (`data/battle_scripts_1.s:3700-3717`) walks **`gBattlerByTurnOrder`** via `copyarraywithindex gBattlerAttacker, gBattlerByTurnOrder, gBattleCommunication, 1` and stops the loop the instant `gBattleOutcome != 0` (`jumpifbyte CMP_NOT_EQUAL, gBattleOutcome, 0, …ContinuesEnd`). Put both actives at ≤ `maxHP/16` and make each side's active its last mon. The battler that ticks **first** faints first, `checkteamslost` sets `gBattleOutcome`, and **the second battler never takes sandstorm damage at all**. ROM order = recomputed by current speed; port order = the action order. On a turn where the player switched in the slower mon, ROM kills the opponent (player wins) and the port kills the player's mon (player loses) — from identical inputs.
  * The same order controls: which battler's Leftovers/berry fires first, which Shed Skin holder consumes which `Random() % 3` draw, which Leech Seed drain resolves first, `ENDTURN_WISH`'s message order, and (via `HandleWishPerishSongOnTurnEnd` state 1, `battle_util.c:1836`) **which Perish Song holder faints first** when both hit 0.
* **`mechanicLab` staging recipe (stock ROM, three legal L50 sets per side).** Cheapest observable: the sandstorm damage **message order**, no faint needed.
  * `overrides.parties.player`: ① SANDSHREW (`FRONTIER_MON_SANDSHREW`) L50, NATURE_DOCILE, item SOFT_SAND, abilitySlot 0 (Sand Veil), moves `[SANDSTORM, DIG, ROCK_TOMB, SAND_ATTACK]`; ② SLUGMA (`FRONTIER_MON_SLUGMA`) L50, NATURE_SASSY, item SITRUS_BERRY, abilitySlot 0, moves `[EMBER, ROCK_SLIDE, YAWN, BODY_SLAM]` — base Speed 20, the slow switch-in; ③ WOOPER (`FRONTIER_MON_WOOPER`) L50, NATURE_DOCILE, item SITRUS_BERRY, moves `[YAWN, DIG, WATER_PULSE, RAIN_DANCE]` (bench filler).
  * `overrides.parties.opponent`: ① DODUO (`FRONTIER_MON_DODUO`) L50, NATURE_LONELY, item LIECHI_BERRY, abilitySlot 0 (Run Away), moves `[FURY_ATTACK, FURY_ATTACK, FURY_ATTACK, FURY_ATTACK]` — base Speed 75, and the four identical slots pin the Factory AI to one legal choice; ②③ two more legal rentals with four identical harmless moves each.
  * Trace: turn 1 player uses SANDSTORM (slot 0); turn 2 player **switches to SLUGMA**. Capture the whole end-of-turn-2 window (`captureFrames` across it — the oracle only keeps the final frame otherwise).
  * **ROM shows:** `Foe DODUO is buffeted by the sandstorm!` (HP bar drains) **then** `SLUGMA is buffeted by the sandstorm!` — because `ENDTURN_ORDER` re-sorted to `[opponent, player]` on speed. **Port produces:** SLUGMA first, because `battlerByTurnOrder` is still `[player, opponent]` from the switch-first action order.
  * A second trace for the RNG half: give both sides a mon with identical effective Speed and diff the `Random()` call count across one turn.
* **Proposed ISSUES.md entry (supervisor files it):**
  > **#NNN — `ENDTURN_ORDER`'s `gBattlerByTurnOrder` recompute is unported: end-turn effects traverse the ACTION order and the ROM's second speed-tie `Random()` draw is missing.** `battle_util.c:1199-1218` re-sorts `gBattlerByTurnOrder` with `GetWhoStrikesFirst(..., FALSE)` (`battle_main.c:4595`, tie draws at `:4728`/`:4745`) at the top of every `DoFieldEndTurnEffects`, using post-action speed/paralysis/stat-stage/weather and the still-uncleared chosen moves. `battleEndTurnOrchestration.ts:2058` `computeBattlerOrder` only copies the array `factoryBattleScriptFullTurnDecision.ts:1943` wrote at action-selection time, and no end-turn path calls `getWhoStrikesFirst`/`sortBattlersByTurnOrder`. Diverges whenever either side switched (switch actions are ordered first with no speed comparison), paralysis or a Speed stage landed this turn, or weather started under a Swift Swim/Chlorophyll carrier; on an exact speed tie the port also drops one RNG draw, desynchronising the whole stream. Outcome-affecting: `BattleScript_DamagingWeatherLoop` (`battle_scripts_1.s:3705`) and Perish Song state 1 (`battle_util.c:1836`) both walk this array and stop on `gBattleOutcome != 0`, so with both actives at ≤ `maxHP/16` the order decides **who wins**. Fix: port the `ENDTURN_ORDER` sort (identity refill + pairwise `getWhoStrikesFirst` with the end-turn tie draw) into `runBattleEndTurnOrchestration` before the field loop, and pin it with a test that switches in a slower mon under sandstorm.

### FINDING 2 — `TurnValuesCleanUp(FALSE)`'s `isFirstTurn--` is unported: `isFirstTurn` never decays, so Fake Out never expires and Speed Boost is dead for every mid-battle switch-in (**high**)

* **Source:** `battle_main.c:4876-4877`, inside `TurnValuesCleanUp`'s `var0 == FALSE` branch, i.e. `BattleTurnPassed:3974` — once per turn, after all end-turn effects. Initial value 2 at switch-in (`battle_script_commands.c` `SwitchInClearSetData`), pre-decremented to 1 before turn 1 by `TryDoEventsBeforeFirstTurn`'s own `TurnValuesCleanUp(FALSE)` (`battle_main.c:3901`). Readers: `Cmd_jumpifnotfirstturn` (Fake Out) and `ABILITYEFFECT_ENDTURN`'s Speed Boost gate `isFirstTurn != 2` (`battle_util.c:2643`).
* **Port:** the only writes in the whole tree are `factoryBattleStart.ts:155` (`isFirstTurn: 1`, correctly modelling the post-`TryDoEventsBeforeFirstTurn` value) and `battleScriptSwitchinOpcode.ts:550` (`isFirstTurn: 2`). **Nothing decrements it** — `battleEndTurnOrchestration.ts:2062-2071` explicitly documents the omission ("`isFirstTurn`/`rechargeTimer` decrements … are `var0`-adjacent source side effects out of this function's scope"), and `finishTurnValuesCleanUp` (`:2129`) only clears the ProtectStruct fields and Follow Me.
* **What differs:**
  * **Fake Out (20 Factory carriers — MAKUHITA, MEOWTH, SMEARGLE, SMOOCHUM, SEEL, …):** ROM — a lead's `isFirstTurn` is 1 on turn 1 and 0 from turn 2, so Fake Out fails from turn 2 (`Cmd_jumpifnotfirstturn` jumps to the fail branch). Port — the lead is pinned at 1 forever, so **Fake Out keeps working (and keeps flinching) every single turn**. A switched-in mon is pinned at 2, same result.
  * **Speed Boost (YANMA and NINJASK are both in the 882-entry rental catalog):** ROM — suppressed only on the switch-in turn (`isFirstTurn == 2`), fires from the following turn. Port — a mon that switched in mid-battle keeps `isFirstTurn == 2` forever, so **Speed Boost never activates again for the rest of the battle**. (A turn-1 lead is unaffected: it starts at 1, which already passes the `!= 2` gate.)
* **Citations hardened this session:** `jumpifnotfirstturn` has exactly **one** consumer in the whole script tree — `BattleScript_EffectFakeOut` (`data/battle_scripts_1.s:2049-2053`, the only hit for `grep -n "jumpifnotfirstturn"`); `Cmd_jumpifnotfirstturn` (`battle_script_commands.c`) is `if (isFirstTurn) advance; else jump-to-fail`, so a non-zero value always means "Fake Out works". NINJASK's ability array is `{ABILITY_SPEED_BOOST, ABILITY_NONE}` and YANMA's is `{ABILITY_SPEED_BOOST, ABILITY_COMPOUND_EYES}` (`src/data/pokemon/species_info.h`), so Ninjask is unconditionally a Speed Boost carrier.
* **Concrete failure scenario:** player leads MEOWTH (Fake Out) vs any opponent. Turn 1 Fake Out flinches — correct in both. Turn 2 Fake Out again: ROM prints `But it failed!` and the opponent moves normally; the port flinches the opponent again, and will do so every turn — an unbounded lock. Second scenario: opponent switches in NINJASK on turn 3; from turn 4 the ROM raises its Speed one stage at every end of turn (visibly outrunning the player by turn 6), the port never does.
* **`mechanicLab` staging recipe:** `overrides.parties.player`: ① MEOWTH (`FRONTIER_MON_MEOWTH`) L50 with its rental moves including FAKE_OUT, item per its rental row; ② SLUGMA as above; ③ WOOPER as above. `overrides.parties.opponent`: ① a bulky legal rental with four identical non-damaging moves (e.g. CHANSEY `FRONTIER_MON_CHANSEY_2` with `[DOUBLE_TEAM ×4]`) so the AI has one legal choice and the battle lasts; ②③ fillers. Trace: FAKE_OUT on turns 1, 2 and 3, capturing each turn's message window. ROM: flinch, `But it failed!`, `But it failed!`. Port: flinch, flinch, flinch. For the Speed Boost half, swap opponent ① for NINJASK (abilitySlot = Speed Boost) and force a switch on turn 2, then watch for `NINJASK's Speed rose!` at the end of turns 3+.
* **Proposed ISSUES.md entry:**
  > **#NNN — `TurnValuesCleanUp(FALSE)`'s per-turn `isFirstTurn--` is unported: Fake Out never expires, Speed Boost dies for mid-battle switch-ins.** `battle_main.c:4876-4877` decrements `gDisableStructs[].isFirstTurn` once per turn from `BattleTurnPassed:3974`. The port writes the field at `factoryBattleStart.ts:155` (1) and `battleScriptSwitchinOpcode.ts:550` (2) and never decrements it; `battleEndTurnOrchestration.ts:2129` `finishTurnValuesCleanUp` covers only the ProtectStruct memset and Follow Me timers. Consequences: `Cmd_jumpifnotfirstturn` (Fake Out, 20 rental carriers) never takes its fail branch, so Fake Out flinches every turn forever; and `ABILITYEFFECT_ENDTURN`'s `isFirstTurn != 2` Speed Boost gate (`battle_util.c:2643`) stays closed forever for any mon that switched in mid-battle (YANMA/NINJASK are rentals). Fix: decrement `isFirstTurn` (floor 0) for every battler inside `finishTurnValuesCleanUp`, and pin both readers.

### FINDING 3 — `DoFieldEndTurnEffects`'s four side-scoped cases are nested side-major instead of case-major: screen-expiry messages come out in the wrong order (**medium; message/trace order, no HP delta**)

* **Source:** `battle_util.c:1220-1315` — each of `ENDTURN_REFLECT` (`:1221`), `ENDTURN_LIGHT_SCREEN` (`:1246`), `ENDTURN_MIST` (`:1272`), `ENDTURN_SAFEGUARD` (`:1294`) owns its own `while (turnSideTracker < 2)` loop, and `turnSideTracker` resets to 0 only when the case ends without firing. Execution order: Reflect(0), Reflect(1), LightScreen(0), LightScreen(1), Mist(0), Mist(1), Safeguard(0), Safeguard(1).
* **Port:** `battleEndTurnOrchestration.ts:1958` `for (const side of [0, 1] as const)` wraps all four cases (`:1959`, `:1968`, `:1977`, `:1982`), giving Reflect(0), LightScreen(0), Mist(0), Safeguard(0), Reflect(1), LightScreen(1), Mist(1), Safeguard(1).
* **What differs:** whenever the player's and the opponent's *different* screens expire on the same turn, the two `BattleScript_SideStatusWoreOff` / `BattleScript_SafeguardEnds` messages are emitted in the opposite order. Final state is identical (the timers are independent), so this is a trace/presentation divergence, not an HP one — but it is exactly the class of silent wrong-order the seeded soaks cannot catch, and it will make any oracle window diff on those two frames fail.
* **Concrete failure scenario:** player sets Light Screen on turn 1; opponent sets Reflect on turn 1. Both timers are 5. At the end of turn 5 the ROM prints `Foe's Reflect wore off!` first (Reflect case, side 1), then `Light Screen wore off!` (Light Screen case, side 0). The port prints Light Screen first.
* **`mechanicLab` staging recipe:** `overrides.parties.player`: ① SUNKERN (`FRONTIER_MON_SUNKERN`) L50, NATURE_RELAXED, item LAX_INCENSE, moves `[MEGA_DRAIN, HELPING_HAND, SUNNY_DAY, LIGHT_SCREEN]`; ② WOOPER; ③ SLUGMA (as above). `overrides.parties.opponent`: ① HOOTHOOT (`FRONTIER_MON_HOOTHOOT`) L50, NATURE_QUIRKY, item PERSIM_BERRY, moves `[REFLECT, REFLECT, REFLECT, REFLECT]` (four identical slots ⇒ the AI must pick Reflect on turn 1; it becomes a no-op afterwards, which is fine); ②③ fillers. Trace: turn 1 player LIGHT_SCREEN; turns 2-5 player MEGA_DRAIN. Capture the end-of-turn-5 message window.
* **Proposed ISSUES.md entry:**
  > **#NNN — end-turn field loop nests side-major; source is case-major, so simultaneous screen expiries print in the wrong order.** `battle_util.c:1220-1315` gives each of Reflect/Light Screen/Mist/Safeguard its own two-side `turnSideTracker` loop (Reflect both sides, then Light Screen both sides, …). `battleEndTurnOrchestration.ts:1958` inverts the nesting to `for (side of [0,1]) { reflect; lightscreen; mist; safeguard; }`. With the player's Light Screen and the opponent's Reflect expiring on the same turn the ROM prints Reflect first, the port prints Light Screen first. State-equivalent, trace-divergent. Fix: swap the loops.

### FINDING 4 — `TurnValuesCleanUp(TRUE)` at `BattleTurnPassed`'s entry does not clear `protected`/`endured` (**low; no confirmed reader**)

`battle_main.c:3960` → `:4864-4866` clears exactly those two ProtectStruct fields (and the Follow Me timers) *before* the end-turn effects run, and again *after*, as part of the full memset. The port clears only the Follow Me timers at entry (`battleEndTurnOrchestration.ts:2511-2513`) and does the whole memset at the tail (`:2097` `clearProtectStructsForNextTurn`). No end-turn case reads `protected` or `endured` (`WasUnableToUseMove`, `battle_util.c:1136-1150`, reads nine *other* ProtectStruct fields, and source deliberately preserves those until the tail so `ENDTURN_UPROAR`/`ENDTURN_THRASH` can use them — the port's `wasBattleScriptBattlerUnableToUseMove` matches). Recorded as a real but currently unobservable write-order difference; no ISSUES entry proposed.

### FINDING 5 — `TurnValuesCleanUp(FALSE)`'s `rechargeTimer--` / `STATUS2_RECHARGE` clear and the `substituteHP == 0 ⇒ clear STATUS2_SUBSTITUTE` sync are unported (**low; shadowed by another path**)

`battle_main.c:4878-4886`. `rechargeTimer` is written only at `battleScriptHitChainOpcode.ts:3088` (`2`, on a recharge move) and reset to 0 on switch-in; it is never decremented. This is currently harmless because `CANCELER_RECHARGE` (`battle_util.c:2095-2104`) clears both `STATUS2_RECHARGE` and the timer when the recharging mon next tries to act, which is the path that actually fires in singles. The substitute sync is likewise shadowed by the substitute opcodes' own clears. Both are genuine missing writes; neither has a demonstrated Factory-L50 failure, so no ISSUES entry is proposed — but if the recharge path is ever reached with the mon unable to act, this is the first place to look.

### FINDING 6 — `HandleEndTurn_ContinueBattle`'s per-turn `STATUS2_FLINCHED` clear has no port site: a flinch that an earlier canceler shadowed survives into a later turn and flinches the mon for free (**high**)

* **Source:** `battle_main.c:3941-3945`, at the top of the end-turn phase, clears `STATUS2_FLINCHED` for **every** battler unconditionally (and cancels multi-turn moves for any battler that is both asleep and `STATUS2_MULTIPLETURNS`).
* **Port:** no equivalent anywhere. Flinch is cleared only at action time, by the `CANCELER_FLINCH` phase (`battleScriptActionAdmission.ts:2031-2038`, "The taken branch clears only STATUS2_FLINCHED…"). `rg -n "STATUS2_FLINCHED" src/engine/*.ts` returns only that clear, the two `battleScriptHitChainOpcode.ts` setters, and the mask constant.
* **Why the bit can survive a turn (re-derived, both halves):**
  1. `SetMoveEffect`'s flinch branch only sets the bit when the victim has not acted yet: `if (GetBattlerTurnOrderNum(gEffectBattler) > gCurrentTurnActionNumber)` (`battle_script_commands.c:2563-2564`).
  2. `AtkCanceler_UnableToUseMove` stops at the **first** firing phase: `} while (gBattleStruct->atkCancelerTracker != CANCELER_END && effect == 0);` (`battle_util.c:2268`), and the phase enum is `FLAGS, ASLEEP, FROZEN, TRUANT, RECHARGE, FLINCH, …` — so **ASLEEP, FROZEN, TRUANT and RECHARGE all pre-empt `CANCELER_FLINCH`**. The port models the same phase order (`battleScriptActionAdmission.ts:99-473`, `sourcePhaseBefore`/`sourcePhaseAfter` chain `FLAGS → ASLEEP → FROZEN → TRUANT → RECHARGE → FLINCH`).
  So a battler that is flinched *and* loafing/asleep/frozen/recharging in the same turn never reaches the flinch phase, and the ROM's end-turn clear is the only thing that removes the bit.
* **Concrete failure scenario (two Pokémon, HP/turn-loss affecting):** opponent's SLAKING (Truant) is on its **loafing** turn. Player's mon is faster and uses ROCK SLIDE, which procs its 30% flinch — SLAKING has not acted, so `STATUS2_FLINCHED` is set. SLAKING's action then hits `CANCELER_TRUANT` first (`Foe SLAKING is loafing around!`) and the canceler stops; the flinch bit is untouched. **ROM:** `HandleEndTurn_ContinueBattle` clears it, so next turn SLAKING attacks normally. **Port:** the bit persists; next turn SLAKING reaches `CANCELER_FLINCH` and flinches — losing a *second* consecutive turn it should have had. The same shape reproduces with a sleeping or frozen target (`CANCELER_ASLEEP`/`CANCELER_FROZEN`) and any flinch move.
* **Reachability:** Truant carriers in the 882-entry catalog: SLAKOTH ×1, VIGOROTH ×2, SLAKING ×4 (7 rental entries; Truant is the only ability of all three). `MOVE_ROCK_SLIDE` carriers: **76**. Plus Bite/Headbutt/Astonish/Fake Out and any sleep-inducer.
* **`mechanicLab` staging recipe:** `overrides.parties.player`: ① a fast ROCK_SLIDE carrier, e.g. SANDSHREW (`FRONTIER_MON_SANDSHREW`, moves `[ROCK_TOMB, DIG, SANDSTORM, SAND_ATTACK]`) swapped for any of the 76 ROCK_SLIDE rows — pick one faster than SLAKING (base Speed 100) such as ELECTRIKE (`FRONTIER_MON_ELECTRIKE`) with a ROCK_SLIDE row; ② SLUGMA; ③ WOOPER. `overrides.parties.opponent`: ① SLAKING (`FRONTIER_MON_SLAKING_3`) L50, item CHOICE_BAND, abilitySlot 0 (Truant), moves `[EARTHQUAKE ×4]` so the AI has one legal choice; ②③ fillers. Trace: turn 1 player attacks (SLAKING acts, `truantCounter` toggles); turn 2 is SLAKING's loafing turn — player uses ROCK SLIDE and re-runs the trace until the flinch procs; turn 3 capture SLAKING's action window. **ROM:** SLAKING uses EARTHQUAKE. **Port:** `Foe SLAKING flinched!`.
* **Also unported in the same source block:** the `(status1 & STATUS1_SLEEP) && (status2 & STATUS2_MULTIPLETURNS) ⇒ CancelMultiTurnMoves` pass (`battle_main.c:3943-3944`), which is what stops a Thrash/Outrage/Uproar lock from surviving a mid-lock sleep. Same missing site, same fix location.
* **Proposed ISSUES.md entry:**
  > **#NNN — `HandleEndTurn_ContinueBattle`'s per-turn `STATUS2_FLINCHED` clear (and its asleep-multi-turn cancel) are unported: a shadowed flinch carries into the next turn.** `battle_main.c:3941-3945` clears `STATUS2_FLINCHED` for every battler at the top of the end-turn phase. The port clears it only at `CANCELER_FLINCH` (`battleScriptActionAdmission.ts:2031-2038`), and `AtkCanceler` stops at the first firing phase (`battle_util.c:2268`) with `ASLEEP/FROZEN/TRUANT/RECHARGE` all ordered ahead of `FLINCH`. So flinching a loafing SLAKING (7 Truant rentals) or a sleeping/frozen target with any of the 76 ROCK_SLIDE carriers leaves the bit set, and the port flinches that mon again on its next real turn — a turn the ROM would have let it use. The same block's `CancelMultiTurnMoves` for an asleep `STATUS2_MULTIPLETURNS` battler is missing too. Fix: add both clears at the entry of `runBattleEndTurnOrchestration` (source order: before `TurnValuesCleanUp(TRUE)`'s effects, i.e. first thing in the end-turn phase), and pin with a Truant + flinch test.

### FINDING 7 — `HandleFaintedMonActions` state 6's `ABILITYEFFECT_FORECAST` pass has no port site (**low today, latent**)

* **Source:** `battle_util.c:1962` — the fourth and last call of state 6. `ABILITYEFFECT_FORECAST` (`battle_util.c:2818-2832`) loops **every** battler (not just the replacement), runs `CastformDataTypeChange`, and on a change pushes `BattleScript_CastformChange`. Its purpose here is the case the switch-in hook cannot cover: the *incoming* mon changes the weather, so an *already-active* Castform must re-form.
* **Port:** `runPendingSwitchinEffects` (`battleScriptFaintedActionsOrchestration.ts:409`) runs Intimidate, then Trace, then the White Herb item pass, and stops. Castform's form change is modelled only on the switching-in battler's own path (`battleScriptSwitchinOpcode.ts:1248-1268`, `BattleScript_WeatherFormChanges`) and by `battleScriptTryCastformDataChangeOpcode.ts`.
* **Reachability:** CASTFORM has **2 rental entries** in the 882-entry catalog, and Forecast is its only ability. The gap needs a post-faint replacement whose switch-in *changes the weather* while an opposing Castform is already out — at Factory L50 that means Sand Stream (TYRANITAR, 10 rental entries); Drizzle/Drought are Kyogre/Groudon only and are not rentals. Sand Stream's switch-in trigger is itself unwired upstream of this module (see §2 F8), so the gap is **not reachable today** — but it becomes live the moment Sand Stream is wired, and it will look like "Castform silently kept the wrong form after a faint", which is very hard to attribute later.
* **Proposed ISSUES.md entry:**
  > **#NNN — `HandleFaintedMonActions` state 6 is missing its `ABILITYEFFECT_FORECAST` pass.** `battle_util.c:1957-1963` runs Intimidate1 → Trace → `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` → `ABILITYEFFECT_FORECAST`; `battleScriptFaintedActionsOrchestration.ts:409` `runPendingSwitchinEffects` implements the first three and stops. `ABILITYEFFECT_FORECAST` (`battle_util.c:2818-2832`) sweeps ALL battlers, so it is the only path that re-forms an already-active Castform (2 rental entries) when the post-faint replacement changes the weather — reachable at L50 only via Sand Stream (TYRANITAR ×10), which is unwired today. File as a latent gap to close together with Sand Stream's switch-in trigger.

### Non-findings deliberately recorded (checked, and NOT divergent)

* `gBattleCommunication[MULTISTRING_CHOOSER] = side` in `ENDTURN_LIGHT_SCREEN` (`battle_util.c:1256`) and `ENDTURN_MIST` (`:1281`) is **dead** — `BattleScript_SideStatusWoreOff` (`battle_scripts_1.s`) is a bare `printstring STRINGID_PKMNSXWOREOFF`, no `printfromtable`. The port omitting the write is inert; every later chooser-reading script sets its own value first. Not a finding.
* `ENDTURN_HAIL` really does lack the `PERMANENT` check its Sandstorm/Sun siblings have (`battle_util.c:1414` vs `:1376`/`:1396`). Faithfully inherited by the shared port helper. Not a finding.
* The port's `else if` weather chain (`:2026-2047`) is equivalent to source's four sequential cases **only** because `gBattleWeather` is single-valued; verified against every setter, not assumed.
* `premise-census` check: `python3 tools/probe/premise-census.py --help` lists the `throw` sites; the end-turn module's own throws are all "unknown Battle Script entry label"/"no instruction at PC" integrity assertions plus the `case-barrier` string at `factoryBattleScriptFullTurnDecision.ts:2349` (an explicit named barrier, not a premise). No premise-worded throw was found on an end-turn path.

## §6. Verdict counts

| verdict | count | where |
| --- | --- | --- |
| SAME-ORDER | 40 | outer chain 6 of 9 rows · field F6-F11 (6) · battler B1-B21 minus the order row (20) · wish/perish W1, W2, W4 (3) · fainted-actions H3 and H4's Intimidate/Trace/item thirds (2) — plus cross-step interactions 1, 3, 4, 5, 6, 7, 8, 9, 10 |
| SAME-ORDER-EQUIVALENT | 2 | fainted-actions H1 (absent-flag clear: source loop is `gBattlersCount`-bounded and the port never sets the flag) · H2 (`givenExpMons`/`gSentPokesToOpponent`: both provably unread under `BATTLE_TYPE_FRONTIER`) — verified this session, not inherited from the module's own comments |
| DIVERGENT | 7 rows / 4 root causes | F1 `ENDTURN_ORDER` (finding 1) · F2/F3/F4/F5 side-major nesting (finding 3, four rows, one cause) · `TurnValuesCleanUp(FALSE)`'s `isFirstTurn--` (finding 2) · `HandleEndTurn_ContinueBattle`'s `STATUS2_FLINCHED` clear + asleep-multi-turn cancel (finding 6) |
| DIVERGENT-BENIGN | 4 | finding 4 (`protected`/`endured` not cleared at entry) · finding 5 (`rechargeTimer--` and the substitute sync) · F12 (the `gBattlerAttacker` pre-seed → weather animation subject, Scene-ON-only) · the dead `MULTISTRING_CHOOSER = side` writes |
| NOT-PORTED | 3 | finding 7 (`ABILITYEFFECT_FORECAST` in state 6 — latent, needs Sand Stream) · `wishPerishSongState` case 2 (Arena — unreachable, proven by battle type) · `B_WEATHER_*_PERMANENT` branches (Drizzle/Drought unreachable — not rentals; Sand Stream **is** a rental ability via TYRANITAR ×10 but is unwired upstream of this module) |
| UNVERIFIED | **0** | Every source step, cross-step interaction and seam named by the step brief carries a verdict. The two limits that remain are declared scope, not unread work: `runItemsTick`'s per-hold-effect branch bodies (positions and `moveTurn` flags verified; the individual berry maths belong to `docs/endturn-abilities-items-ground-truth.md`) and the forced-switch script dance inside `runFaintedBattlerHandlers` (`docs/forced-switch-ground-truth.md`'s slice). |

## §7. Method — exact commands

```sh
# the reference/ symlink: rg over it returns ZERO hits silently, always resolve it first
REF=$(cd reference/pokeemerald && pwd -P)          # -> ../../vendor/pokeemerald

# source: the outer chain and the two enums
grep -n "DoFieldEndTurnEffects\|DoBattlerEndTurnEffects\|HandleWishPerishSongOnTurnEnd\|HandleFaintedMonActions\|TurnValuesCleanUp\|SpecialStatusesClear\|HandleEndTurn_" $REF/src/*.c
sed -n '3930,4030p'  $REF/src/battle_main.c        # HandleEndTurn_ContinueBattle + BattleTurnPassed
sed -n '4857,4900p'  $REF/src/battle_main.c        # TurnValuesCleanUp + SpecialStatusesClear
sed -n '4595,4753p'  $REF/src/battle_main.c        # GetWhoStrikesFirst (tie draws at :4728/:4745)
sed -n '1160,1445p'  $REF/src/battle_util.c        # field enum + DoFieldEndTurnEffects
sed -n '1440,1790p'  $REF/src/battle_util.c        # battler enum + DoBattlerEndTurnEffects
sed -n '1785,1975p'  $REF/src/battle_util.c        # HandleWishPerishSongOnTurnEnd + HandleFaintedMonActions
sed -n '2601,2660p'  $REF/src/battle_util.c        # ABILITYEFFECT_ENDTURN
sed -n '3331,3620p'  $REF/src/battle_util.c        # ITEMEFFECT_NORMAL
grep -rn "GetWhoStrikesFirst" $REF/src $REF/include # ALL call sites, whole tree - not one file
grep -rn "truantCounter\|wishCounter\|futureSightCounter" $REF/src/*.c

# source scripts
sed -n "$(grep -n 'BattleScript_DoStatusTurnDmg:' $REF/data/battle_scripts_1.s | cut -d: -f1),+22p" $REF/data/battle_scripts_1.s
sed -n "$(grep -n 'BattleScript_LeechSeedTurnDrain:' $REF/data/battle_scripts_1.s | cut -d: -f1),+22p" $REF/data/battle_scripts_1.s
sed -n "$(grep -n 'BattleScript_DamagingWeatherContinues:' $REF/data/battle_scripts_1.s | cut -d: -f1),+30p" $REF/data/battle_scripts_1.s
sed -n "$(grep -n 'BattleScript_MonTookFutureAttack:' $REF/data/battle_scripts_1.s | cut -d: -f1),+18p" $REF/data/battle_scripts_1.s

# port: find the driver, do not assume the filename
rg -l "turnEffectsTracker|ENDTURN_|endTurnEffects|DoBattlerEndTurn|DoFieldEndTurn" src/
rg -n "^function |^export function " src/engine/battleEndTurnOrchestration.ts
rg -n "runBattleEndTurnOrchestration|resumeBattleEndTurnAfterFaintedActions" src/ tests/
rg -n "battlerByTurnOrder" src/ --type ts
rg -n "sortBattlersByTurnOrder|getWhoStrikesFirst|effectiveSpeed" src/ --type ts
rg -n "isFirstTurn" src/ --type ts | grep -E "isFirstTurn\s*[:=-]"
rg -n "randomTurnNumber|truantCounter|wishCounter|STATUS2_FLINCHED" src/engine/*.ts

# reachability, against the real 882-entry catalog (never assumed)
python3 -c "import json; d=json.load(open('src/data/gen/battle-frontier-mons.json'))['entries']; \
  print(len([x for x in d if 'MOVE_FAKE_OUT' in x['moves']]))"
```

Tests that pin end-turn order today (listed, not run — docs-only step): `tests/battleEndTurnOrchestration.test.ts` (71 cases; `:436-466` pins that the port *consumes* `battlerByTurnOrder`, and therefore does **not** pin finding 1's recompute), `tests/endTurnResumeCursorIssue102.test.ts` (3), `tests/endTurnFaintResumeIssue104.test.ts` (1), `tests/bideEndTurnIgnoreBideIssue126.test.ts`, `tests/battleEndTurnAbilities.test.ts`, `tests/battleScriptTrywishOpcode.test.ts`, `tests/wishOracleEvidence.test.ts`, `tests/battleScriptTrysetperishsongOpcode.test.ts`, `tests/perishSongOracleEvidence.test.ts`, `tests/battleScriptFutureAttack.test.ts`, `tests/futureSightOracleEvidence.test.ts`, `tests/battleScriptSetyawnOpcode.test.ts`, `tests/battleScriptScreensWeatherOrchestration.test.ts`, `tests/battleScriptDamagingWeatherOpcode.test.ts`, `tests/gate6KernelInteractions.test.ts`, `tests/gate6EntryItemInteractions.test.ts`, `tests/gate6WeatherAbilityInteractions.test.ts`, `tests/gate6WeatherVolatileInteractions.test.ts`. **No existing test pins the `ENDTURN_ORDER` recompute, the `isFirstTurn` decay, or the field loop's case-major nesting** — which is why all three survived to today.
