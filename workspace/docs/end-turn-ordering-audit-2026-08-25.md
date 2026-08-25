# End-of-turn ordering audit — source vs port (2026-08-25)

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit time) | `db4e8d72c8036f4236ef24c41262298b5206d02e` (commit `fdc21ede`) |
| Date | 2026-08-25 |
| Lane / oracle | side worktree `worker/side-20260825-163116`, Battle Scene OFF (`http://127.0.0.1:8014`) |
| Scope | Everything that runs between a turn's LAST action and the NEXT turn's action selection: `BattleTurnPassed` and the `gBattleMainFunc` chain around it, `DoFieldEndTurnEffects`, `DoBattlerEndTurnEffects`, `HandleFaintedMonActions`, `HandleWishPerishSongOnTurnEnd`, `AbilityBattleEffects(ABILITYEFFECT_ENDTURN)`, `ItemBattleEffects(ITEMEFFECT_NORMAL)` as reached from those enum steps. Singles only. Docs-only step — no engine/test/tool/data edits. |
| Out of scope | Fixing anything; `Cmd_moveend`'s end-of-ACTION steps beyond the disambiguation in §0; doubles; Battle Scene ON; the internals of `battleScriptFaintedActionsOrchestration.ts` (audited only at its call seams). |
| NOT read (declared) | `battleScriptFaintedActionsOrchestration.ts` body (its 7 `faintedActionsState` cases were checked only through the seam contract `runBattleEndTurnOrchestration` consumes); the ~1,100-line body of `runItemsTick`'s per-hold-effect branches (the two call positions and their `moveTurn` flags were verified; the individual berry branches were spot-checked, not exhaustively diffed — that is `docs/endturn-abilities-items-ground-truth.md`'s slice); `battleScriptDamagingWeatherOpcode.ts`'s per-battler damage math (only its `battlerByTurnOrder` read at `:153` was checked); Arena (`wishPerishSongState` case 2) — unreachable in Factory. |

**Verdict counts** — see §4.

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
| `HandleEndTurn_ContinueBattle` STATUS2_FLINCHED clear + sleep `CancelMultiTurnMoves` | `battle_main.c:3941-3945` | **not in this module** — flinch clear lives in the action path (`battleScriptHitChainOpcode.ts`); the sleep-multi-turn cancel has no end-turn site | NOT-PORTED (see F6) |
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

Also verified at the head of `DoFieldEndTurnEffects` (`battle_util.c:1185-1191`): `gBattlerAttacker`/`gBattlerTarget` are pre-seeded to the first non-absent battler. The port has no equivalent seed; every field case that needs a battler passes one explicitly (`:1802`, `:1873`, `:1946`), and the weather cases fall back to `selectorRoles.attacker ?? 0`. In singles with two live battlers these coincide; with one side absent mid-pass they can differ only in message-subject selection for the weather strings. Recorded as **UNVERIFIED-MINOR** (see §4).

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
| H1 | state 0 — clear `gAbsentBattlerFlags` for any side that still has a switchable mon (`:1903-1911`) | `battleScriptFaintedActionsOrchestration.ts` (seam only — body NOT read, see header) | UNVERIFIED (declared) |
| H2 | states 1/2 — `BattleScript_GiveExp` per fainted battler ascending, `OpponentSwitchInResetSentPokesToOpponentValue` (`:1912-1934`) | same module | UNVERIFIED (declared) |
| H3 | states 3/4/5 — `BattleScript_HandleFaintedMon` per fainted battler ascending (this is where the replacement is chosen and `gAbsentBattlerFlags` is set) (`:1935-1955`) | same module; the player-choice pause surfaces as `player-choice-required` and resumes via `resumeBattleEndTurnAfterFaintedActions` (`battleEndTurnOrchestration.ts:2473`) | seam SAME-ORDER (see cross-step 1) |
| H4 | state 6 — `ABILITYEFFECT_INTIMIDATE1` → `ABILITYEFFECT_TRACE` → `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` → `ABILITYEFFECT_FORECAST`, in that order (`:1957-1963`) | same module (this is the ISSUES #128 path just fixed at HEAD in `fdc21ede`) | UNVERIFIED (declared) |

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
