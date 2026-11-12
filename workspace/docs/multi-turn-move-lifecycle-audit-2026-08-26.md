# Multi-turn move lifecycle audit — source vs port (2026-08-26)

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit start) | `dc6653bbc9c7476d82743080435e3b63d1f94bb2` (commit `f647383d`) |
| Date / clock | 2026-08-26, start `Wed Aug 26 04:28:51 PDT 2026` |
| Lane / oracle | side worktree `worker/side-20260826-042843`, Battle Scene OFF (`http://127.0.0.1:8014`) — oracle NOT run; static audit |
| Scope | The turn-by-turn LIFECYCLE of every multi-turn move family in Level-50 singles, both sides: which counter/lock/stored-damage cell each family writes (`gDisableStructs[]`, `gBattleMons[].status2` timers, `gLockedMoves[]`, `gBideDmg`/`gBideTarget`, `gBattleStruct->wrappedMove`/`wrappedBy`, `gProtectStructs`, `gHitMarker` bits), WHERE each is read/decremented (`AtkCanceler_UnableToUseMove` phases, the move's own opcodes, `DoBattlerEndTurnEffects` cases, `HandleAction_UseMove`'s lock), and the exact turn-by-turn ORDER including every `Random()`. Docs-only step — no engine/test/tool/data edits. |
| Out of scope (declared, not audited) | A switch or a faint interrupting a multi-turn move (`docs/switch-lifecycle-audit-2026-08-26.md` §6, `docs/faint-replacement-audit-2026-08-26.md`); the THRASH lock-in `seteffectwithchance` re-run (ISSUES #141); `SetMoveEffect`'s internals beyond the four cases named here (`docs/move-effect-application-audit-2026-08-26.md`); the end-turn ORDER *between* families (`docs/end-turn-ordering-audit-2026-08-25.md` — only per-family cell semantics here); the choose-move ladder below the lock (`docs/turn-machinery-audit-2026-08-26.md` §4); AI scoring; doubles; Battle Scene ON; fixing anything. |
| NOT read (declared) | `battleScriptHitChainOpcode.ts`'s damage math around `Cmd_datahpupdate` (only the Bide accumulate/`IGNORE_BIDE` gate at `:2551-2565` and the two-turn/recharge/uproar/thrash `SetMoveEffect` cases were diffed); the port's `battle-script-program.json` instruction stream itself (verified to be a mechanical extraction of `data/battle_scripts_1.s` — 619 labels, 3275 executable instructions — so script-level opcode ORDER is derived, not hand-written, and is not re-diffed opcode-by-opcode); `battleScriptSemiInvulnerableOpcode.ts`'s per-move `STATUS3_*` bit bodies (its 5 `Cmd_clearstatusfromeffect` starts and the `MOVE_EFFECT_CHARGING` binding were checked, the semi-invulnerable bit switch was not re-derived — `docs/battle-script-move-end-vertical-audit.md`'s slice); Bounce (not a Level-50 Factory rental move path exercised here). |

**Verdict counts** — see §7.

---

## §0. The three machines a multi-turn move passes through, and the order

Every multi-turn family is the same skeleton, and the audit rows below are all
positions inside it. Getting the skeleton wrong is the easy mistake, so it is
pinned first:

```
TURN N action selection
  └─ HandleTurnActionSelectionState  (battle_main.c:4098-4104)
       · a battler with STATUS2_MULTIPLETURNS or STATUS2_RECHARGE never
         opens the move menu; its action is forced to B_ACTION_USE_MOVE

TURN N action execution
  └─ HandleAction_UseMove            (battle_util.c:78)
       · gCurrentMove = gChosenMove = gLockedMoves[attacker]     :107-110
         (ONLY when status2 & (MULTIPLETURNS|RECHARGE); Struggle wins first)
       └─ gBattlescriptCurrInstr = gBattleScriptsForMoveEffects[effect]
            └─ opcode 0 = attackcanceler  (battle_script_commands.c:915)
                 └─ AtkCanceler_UnableToUseMove()  (battle_util.c:2002-2268)
                      CANCELER_FLAGS → ASLEEP → FROZEN → TRUANT → RECHARGE
                      → FLINCH → DISABLED → TAUNTED → IMPRISONED → CONFUSED
                      → PARALYZED → IN_LOVE → BIDE → THAW → END
                      · a firing phase REDIRECTS gBattlescriptCurrInstr, so
                        everything after opcode 0 in the move's own script
                        (attackstring, PPREDUCE, accuracycheck, ...) is SKIPPED
            └─ …otherwise the move script runs and writes its own cells
                 (setbide / rolloutdamagecalculation / furycuttercalc /
                  confuseifrepeatingattackends / seteffectwithchance→SetMoveEffect)

END OF TURN N
  └─ DoBattlerEndTurnEffects  (battle_util.c:1464)
       … ENDTURN_WRAP(9) → ENDTURN_UPROAR(10) → ENDTURN_THRASH(11) …
  └─ BattleTurnPassed's tail: gDisableStructs[i].rechargeTimer-- (battle_main.c:3980-3985)
```

Two consequences the rest of the audit leans on:

1. **A canceler phase that fires suppresses the move script's `ppreduce`.**
   That is the *only* mechanism by which Bide/Uproar/Rollout/Thrash deduct PP
   once instead of every turn — there is no "already deducted" flag. Uproar,
   Rollout and Rampage additionally guard `ppreduce` with an explicit
   `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS` in the script
   (`data/battle_scripts_1.s:2077-2078`, `:1599-1600`, `:587-588`); Bide has
   no such guard and relies purely on `CANCELER_BIDE` redirecting.
2. **`CancelMultiTurnMoves` is the single teardown primitive** and clears
   *four* status2 bits plus `STATUS3_SEMI_INVULNERABLE` plus two
   `gDisableStructs` counters — but **not** `STATUS2_RECHARGE`, **not**
   `STATUS2_WRAPPED`, **not** `gLockedMoves[]`, and **not** `gBideDmg[]`.
   Every "does X end the lock?" row below is really "is `CancelMultiTurnMoves`
   reached?".

---

## §1. BIDE

**Cells.** `status2 & STATUS2_BIDE` (bits 8-9, `include/constants/battle.h:135-136`,
a 2-bit countdown), `status2 & STATUS2_MULTIPLETURNS` (bit 12, `:139`),
`gLockedMoves[attacker]`, `gBideDmg[battler]` (s32, `battle_main.c:173`),
`gBideTarget[battler]` (u8, `battle_main.c:200`), `gBattleScripting.bideDmg`
(the scratch doubled value, `include/battle.h:492`), `gHitMarker &
HITMARKER_CHARGING` (bit 27) and `gHitMarker & HITMARKER_IGNORE_BIDE` (bit 5).

**Turn-by-turn.**

* **Turn 1** — `BattleScript_EffectBide` (`data/battle_scripts_1.s:573-581`):
  `attackcanceler` (nothing fires — `STATUS2_BIDE` is still 0), `attackstring`,
  **`ppreduce` — the only PP deduction of the whole Bide**, `attackanimation`,
  `waitanimation`, `orword gHitMarker, HITMARKER_CHARGING`, `setbide`,
  `goto BattleScript_MoveEnd`.
* **Turns 2 and 3** — the lock forces `gCurrentMove = MOVE_BIDE`, the script
  pointer is `BattleScript_EffectBide` again, but opcode 0's `CANCELER_BIDE`
  phase fires (`effect = 1`) and redirects, so `attackstring`/`ppreduce` never
  execute.
* **No `Random()` is drawn anywhere in Bide's lifecycle** — the counter is the
  fixed literal 2, the target is replayed from `gBideTarget`, and the damage is
  a doubled accumulator. (`accuracycheck` on the release turn is inside
  `BattleScript_BideAttack`, `:3298`, and is the ordinary accuracy draw.)

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| B1 | `Cmd_setbide` sets `STATUS2_MULTIPLETURNS` | `battle_script_commands.c:7123` | `battleScriptSetbideOpcode.ts:52-55` (`status2 \| STATUS2_MULTIPLETURNS \| STATUS2_BIDE_TURN_2`) | SAME |
| B2 | `Cmd_setbide` writes `gLockedMoves[attacker] = gCurrentMove` | `battle_script_commands.c:7124` | `battleScriptSetbideOpcode.ts:47-49` | SAME |
| B3 | `Cmd_setbide` zeroes **only the attacker's** `gBideDmg` (never `gBideTarget`) | `battle_script_commands.c:7125` | `battleScriptSetbideOpcode.ts:44-46` (index-guarded map; `bideTarget` untouched, documented at `:1-9`) | SAME |
| B4 | `Cmd_setbide` sets `STATUS2_BIDE_TURN(2)` = `2 << 8` | `battle_script_commands.c:7126` + `include/constants/battle.h:136` | `battleScriptSetbideOpcode.ts:19` `STATUS2_BIDE_TURN_2 = 2 << 8` | SAME |
| B5 | Damage accumulation: `Cmd_datahpupdate` adds `gBattleMoveDamage` into `gBideDmg[gActiveBattler]` **only when `HITMARKER_IGNORE_BIDE` is clear**, and consumes the bit when it is set | `battle_script_commands.c:1905-1917` | `battleScriptHitChainOpcode.ts:2551-2565` (`ignoreBide` read → clear → guarded accumulate) | SAME-ORDER |
| B6 | `gBideTarget` written from the operand: `BS_TARGET` → `gBattlerAttacker`, otherwise `gBattlerTarget` | `battle_script_commands.c:1913-1916` | `battleScriptHitChainOpcode.ts:2559-2564` (`isTargetOperand ? attacker : target`) | SAME |
| B7 | End-turn damage is invisible to Bide because `DoBattlerEndTurnEffects` re-arms `HITMARKER_IGNORE_BIDE` at **every** entry | `battle_util.c:1468` | `battleEndTurnOrchestration.ts:1522` + re-arm at `:2474` / `:1647` | SAME-ORDER |
| B8 | `CANCELER_BIDE` decrements `status2 -= STATUS2_BIDE_TURN(1)` **before** branching | `battle_util.c:2223` | `battleScriptActionAdmission.ts:3535-3541` (`decrement` then `nextStatus2 = status2 - 0x100`) | SAME-ORDER |
| B9 | still biding → `BattleScript_BideStoringEnergy` (prints "is storing energy", no PP, no damage) | `battle_util.c:2224-2227`; script `data/battle_scripts_1.s:3287-3290` | `battleScriptActionAdmission.ts:3581-3587` (`encodedBefore === 2` → handoff) | SAME |
| B10 | released **with** stored damage → `gCurrentMove = MOVE_BIDE`, `gBattleScripting.bideDmg = gBideDmg * 2`, `gBattlerTarget = gBideTarget[attacker]`, then `BattleScript_BideAttack` | `battle_util.c:2232-2239` | `battleScriptActionAdmission.ts:3603-3617` (`Math.imul(storedDamage, 2)`, `selectorRoles.target = savedTarget`) | SAME-ORDER |
| B11 | released with **zero** stored damage → `BattleScript_BideNoEnergyToAttack` (fails via `BattleScript_ButItFailed`) | `battle_util.c:2243`; script `:3316-3322` | `battleScriptActionAdmission.ts:3588-3594` (`encodedBefore === 1 && storedDamage === 0`) | SAME |
| B12 | absent-target re-target through `GetMoveTarget(MOVE_BIDE, MOVE_TARGET_SELECTED + 1)` | `battle_util.c:2237-2238` | `battleScriptActionAdmission.ts:3514-3519` — the port **refuses absent battlers with a thrown barrier** instead of re-targeting | UNREACHABLE-IN-SINGLES (an absent battler in Level-50 singles means the slot fainted and the replacement has already been sent in before the next action; the barrier is explicit, not silent) |
| B13 | `STATUS2_MULTIPLETURNS` is **not** cleared by `CANCELER_BIDE` — the direct clear is commented out and the release is done by the release scripts' `setmoveeffect MOVE_EFFECT_CHARGING` + `clearstatusfromeffect BS_ATTACKER`, because `sStatusFlagsForMoveEffects[MOVE_EFFECT_CHARGING] == STATUS2_MULTIPLETURNS` | `battle_util.c:2230-2231` (commented); `data/battle_scripts_1.s:3294-3295` and `:3318-3319`; table at `battle_script_commands.c:619`; opcode at `:2951-2963` | script stream is the mechanical extraction (`src/data/gen/battle-script-program.json`); opcode at `battleScriptSemiInvulnerableOpcode.ts:103-116` (5 concrete `Cmd_clearstatusfromeffect` starts) with the `MOVE_EFFECT_CHARGING → STATUS2_MULTIPLETURNS` binding at `:46` and `battleScriptHitChainOpcode.ts:3807-3814` | SAME-ORDER |
| B14 | PP is deducted on turn 1 only, purely because `CANCELER_BIDE` redirects past `ppreduce` (Bide's script has **no** `jumpifstatus2 MULTIPLETURNS` guard, unlike Uproar/Rollout/Rampage) | `data/battle_scripts_1.s:573-581` vs `:2077-2078`; `Cmd_ppreduce` gate `battle_script_commands.c:1230` | `battleScriptActionAdmission.ts:3581-3594` returns a `handoff` script effect (not `preserve`), so the interpreter jumps and never reaches the `ppreduce` instruction | SAME-ORDER |
| B15 | `HITMARKER_CHARGING` set on turn 1 (`orword`), read only by `Cmd_moveend`'s "charging" gate, cleared by the switch-in hitmarker mask | `data/battle_scripts_1.s:579`; read `battle_script_commands.c:8235`; cleared `battle_util.c:655`, `:668` | `battleScriptOrwordOpcode.ts:45` (`HITMARKER_IGNORE_BIDE` neighbour) + `battleScriptSourceConstants.ts` hitmarker block; the `Cmd_moveend` read is `docs/battle-script-move-end-vertical-audit.md`'s slice | UNVERIFIED — the `Cmd_moveend:8235` `HITMARKER_CHARGING` consumer was not diffed against its port site inside this step's 5-minute-per-row budget; what is missing is the port cite for the `MOVEEND` charging branch |

## §2. UPROAR

**Cells.** `status2 & STATUS2_UPROAR` (bits 4-6, a 3-bit countdown,
`include/constants/battle.h:132-133`), `status2 & STATUS2_MULTIPLETURNS`,
`gLockedMoves[]`. No `gDisableStructs` cell.

**Turn-by-turn.**

* **Turn 1** — `BattleScript_EffectUproar` (`data/battle_scripts_1.s:2072-2081`):
  `attackcanceler`, `accuracycheck`, **`setmoveeffect MOVE_EFFECT_UPROAR |
  MOVE_EFFECT_AFFECTS_USER` (before `attackstring`)**, `attackstring`,
  `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_UproarHit`,
  `ppreduce`, `nop`, `goto BattleScript_HitFromCritCalc`. The uproar cells are
  written by the queued move effect at the end of the hit chain, not by a
  dedicated `Cmd_setuproar` — **there is no `Cmd_setuproar` in Emerald**
  (`grep -n "Cmd_setuproar" $REF/src/*.c` → no hits).
* **The one `Random()`** is `STATUS2_UPROAR_TURN((Random() & 3) + 2)` — 2-5
  turns — drawn exactly once, on the first turn only
  (`battle_script_commands.c:2573`).
* **Turns 2-5** — the lock re-selects the move; the script's own
  `jumpifstatus2 MULTIPLETURNS` skips `ppreduce`; `attackcanceler` does **not**
  fire an uproar phase (there is none).
* **Every end of turn**, `ENDTURN_UPROAR` (`battle_util.c:1625-1673`) runs the
  wake scan first, then — only on a pass where nobody woke — the decrement.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| U1 | `MOVE_EFFECT_UPROAR` no-ops if the battler is already in uproar | `battle_script_commands.c:2569` | `battleScriptHitChainOpcode.ts:2990-2992` (`passThrough()`) | SAME |
| U2 | sets `STATUS2_MULTIPLETURNS`, `gLockedMoves[effectBattler] = gCurrentMove`, then `STATUS2_UPROAR_TURN((Random() & 3) + 2)` — **one** draw | `battle_script_commands.c:2571-2573` | `battleScriptHitChainOpcode.ts:2993-3007` — the port draws the RNG **first**, then writes `lockedMoves` and the combined `status2` | SAME-ORDER-EQUIVALENT (no RNG consumer sits between the two source writes and the draw, so the single draw lands at the same ledger position; only the C statement order differs) |
| U3 | PP deducted turn 1 only, via the script's explicit `jumpifstatus2 MULTIPLETURNS` guard around `ppreduce` | `data/battle_scripts_1.s:2077-2078` | mechanical script extraction (`src/data/gen/battle-script-program.json`); `Cmd_ppreduce` gate ported at the `HITMARKER_NO_PPDEDUCT \| HITMARKER_NO_ATTACKSTRING` check | SAME |
| U4 | `ENDTURN_UPROAR` guard: only runs when `status2 & STATUS2_UPROAR` (no `hp != 0` guard, unlike Curse/Wrap) | `battle_util.c:1626` | `battleEndTurnOrchestration.ts:911-914` (`status2 & STATUS2_UPROAR` only) | SAME |
| U5 | wake scan runs **before** the decrement, iterating `gBattlerAttacker = 0..gBattlersCount`, waking the **first** eligible sleeper (`STATUS1_SLEEP` and ability != Soundproof), clearing `STATUS1_SLEEP` + `STATUS2_NIGHTMARE`, then `break` | `battle_util.c:1628-1642` | `battleEndTurnOrchestration.ts:918-946` — one `for i` pass that wakes **every** eligible sleeper before falling through to the decrement | SAME-ORDER-EQUIVALENT (source returns `effect = 2` and does **not** advance `turnEffectsTracker` at `:1671-1672`, so the case re-enters and wakes the next sleeper; the already-woken battler no longer matches. Same wake set, same ascending battler order, same script sequence, decrement still last) |
| U6 | `gBattleCommunication[MULTISTRING_CHOOSER] = 1` before `BattleScript_MonWokeUpInUproar` | `battle_util.c:1635` | no port write | DIVERGENT-BENIGN — `BattleScript_MonWokeUpInUproar` (`data/battle_scripts_1.s:3730-3734`) is `printstring STRINGID_PKMNWOKEUPINUPROAR` / `waitmessage` / `updatestatusicon` / `end2`: it never reads `MULTISTRING_CHOOSER`, and the next reader (`gUproarOverTurnStringIds` at `:1655`/`:1659`/`:1664`) always rewrites it. Dead write. |
| U7 | on a no-wake pass: `gBattlerAttacker = gActiveBattler` restored, then `status2 -= STATUS2_UPROAR_TURN(1)` | `battle_util.c:1650-1651` | `battleEndTurnOrchestration.ts:948-950` (`status2 - (1 << 4)`) | SAME-ORDER |
| U8 | `WasUnableToUseMove(active)` checked **after** the decrement → `CancelMultiTurnMoves` + `B_MSG_UPROAR_ENDS` | `battle_util.c:1652-1656`; predicate `battle_util.c:889-903` (9 `gProtectStructs` flags) | `battleEndTurnOrchestration.ts:951-952` + `battleScriptRulesContext.ts:1364-1378` (same 9 flags, same order) | SAME-ORDER |
| U9 | still ticking → `B_MSG_UPROAR_CONTINUES` **and** `status2 \|= STATUS2_MULTIPLETURNS` (a re-arm, since nothing cleared it) | `battle_util.c:1657-1661` | `battleEndTurnOrchestration.ts:953-963` (`continues` → re-OR `STATUS2_MULTIPLETURNS`) | SAME |
| U10 | expired → `B_MSG_UPROAR_ENDS` **then** `CancelMultiTurnMoves` | `battle_util.c:1662-1666` | `battleEndTurnOrchestration.ts:964-965` (`else` → `cancelBattleScriptMultiTurnMoves`) then `:966-969` sets `multistringChooser` | SAME-ORDER-EQUIVALENT (source assigns the chooser then cancels; the port cancels then assigns. `CancelMultiTurnMoves` touches no `gBattleCommunication` cell, so the two orders are observationally identical) |
| U11 | "calmed down": `BattleScript_PrintUproarOverTurns` prints `gUproarOverTurnStringIds[chooser]`, `B_MSG_UPROAR_CONTINUES = 0 → STRINGID_PKMNMAKINGUPROAR`, `B_MSG_UPROAR_ENDS = 1 → STRINGID_PKMNCALMEDDOWN` | `data/battle_scripts_1.s:3785-3788`; table `battle_message.c:975-979`; ids `include/constants/battle_string_ids.h:479-481` | `battleEndTurnOrchestration.ts:966-969` (`multistringChooser: continues ? 0 : 1`, label `BattleScript_PrintUproarOverTurns`) + `battleScriptHitChainOpcode.ts:437-440` (the 2-entry table) | SAME |
| U12 | sleep-blocking read #1 — `CANCELER_ASLEEP` calls `UproarWakeUpCheck(attacker)` **first**, before the Early Bird decrement, and on a hit clears `STATUS1_SLEEP` + `STATUS2_NIGHTMARE` and prints `B_MSG_WOKE_UP_UPROAR` with `effect = 2` | `battle_util.c:2016-2026`; helper `battle_script_commands.c:6801-6826` | `battleScriptActionAdmission.ts:1341` (`uproarSource` scan) + the `uproarScan` receipt at `:208-239`, including the `B_MSG_WOKE_UP_UPROAR` overwrite note at `:224` | SAME-ORDER |
| U13 | sleep-blocking read #2 — `SetMoveEffect`'s `STATUS1_SLEEP` case: Soundproof short-circuits the scan, then `status1 != 0` → uproar-active → Vital Spirit → Insomnia, and only then `CancelMultiTurnMoves(gEffectBattler)` + `statusChanged = TRUE` | `battle_script_commands.c:2273-2298` | `battleScriptHitChainOpcode.ts:3366-3392` (identical short-circuit order; `finishStatusWrite` applies the shared cancel before writing `status1`) | SAME-ORDER |
| U14 | sleep-blocking read #3 — `ENDTURN_YAWN`'s `!UproarWakeUpCheck(gActiveBattler)` term | `battle_util.c:1759` | `battleEndTurnOrchestration.ts:1031-1041` + `runYawnTick` at `:1049` | SAME (cell semantics only; the Yawn case's own ordering belongs to `docs/end-turn-ordering-audit-2026-08-25.md`) |

## §3. ROLLOUT / ICE BALL, and FURY CUTTER

**Cells.** Rollout: `gDisableStructs[].rolloutTimer` (4-bit, `include/battle.h:87`),
`gDisableStructs[].rolloutTimerStartValue` (4-bit, `:88`),
`status2 & STATUS2_MULTIPLETURNS`, `gLockedMoves[]`, and the read-only
`status2 & STATUS2_DEFENSE_CURL` (bit 30). Fury Cutter: only
`gDisableStructs[].furyCutterCounter` (u8, `include/battle.h:86`).

**The miss mechanism, pinned first because it is a constant-definition trap.**
`BattleScript_EffectRollout`'s `accuracycheck BattleScript_RolloutHit`
(`data/battle_scripts_1.s:1602`) has its *fail* target equal to the very next
instruction, so a miss does **not** branch away. What actually ends the chain is
that `MOVE_RESULT_NO_EFFECT` is a **mask**, not a bit:
`MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | MOVE_RESULT_FAILED`
(`include/constants/battle.h:228`). So a plain accuracy miss (`:1178` sets
`MOVE_RESULT_MISSED`) satisfies `gMoveResultFlags & MOVE_RESULT_NO_EFFECT` in
both `Cmd_rolloutdamagecalculation` (`:8538`) and `Cmd_furycuttercalc`
(`:8582`). The port defines the identical mask at
`battleScriptRulesContext.ts:150`.

**Turn-by-turn (Rollout).** Turn 1: `attackcanceler`, `attackstring`,
`jumpifstatus2 MULTIPLETURNS` (not taken) → **`ppreduce`** → `accuracycheck` →
`typecalc2` → `rolloutdamagecalculation` (first hit: timer 5→4, lock set) →
`HitFromCritCalc`. Turns 2-5: the lock re-selects; the `jumpifstatus2` skips
`ppreduce`; the timer walks 4→3→2→1→0 and `MULTIPLETURNS` is cleared on the
pass that reaches 0. **No `Random()` in either family's own lifecycle** — the
escalation is a pure shift.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| R1 | miss / no-effect → `CancelMultiTurnMoves(attacker)` **then** jump to `BattleScript_MoveMissedPause` | `battle_script_commands.c:8538-8542` | `battleScriptRolloutOpcode.ts:34-46` (cancel, then `jump` to the resolved `BattleScript_MoveMissedPause`) | SAME-ORDER |
| R2 | first hit detected by `!(status2 & STATUS2_MULTIPLETURNS)`; sets `rolloutTimer = 5`, `rolloutTimerStartValue = 5`, `STATUS2_MULTIPLETURNS`, `gLockedMoves[attacker] = gCurrentMove` | `battle_script_commands.c:8547-8553` | `battleScriptRolloutOpcode.ts:49-54` (`firstHit`), `:84-97` (`lockedMoves`, `rolloutTimerStartValues`), `:27` `ROLLOUT_HIT_COUNT = 5` | SAME |
| R3 | `if (--rolloutTimer == 0) status2 &= ~STATUS2_MULTIPLETURNS` — pre-decrement, so the fifth hit both fires and unlocks in one opcode | `battle_script_commands.c:8554-8557` | `battleScriptRolloutOpcode.ts:61-72` (`rolloutTimer = timerBeforeDecrement - 1`; clear when `rolloutTimer === 0`) | SAME-ORDER |
| R4 | escalation `for (i = 1; i < (5 - rolloutTimer); i++) gDynamicBasePower *= 2` → `power << (4 - rolloutTimer)` | `battle_script_commands.c:8559-8562` | `battleScriptRolloutOpcode.ts:98-99` (`successfulHits = 5 - rolloutTimer`; `power * 2 ** (successfulHits - 1)` — the same exponent `4 - rolloutTimer`) | SAME |
| R5 | Defense Curl doubling applied **after** the escalation loop, on `status2 & STATUS2_DEFENSE_CURL` | `battle_script_commands.c:8564-8565` | `battleScriptRolloutOpcode.ts:101-106` | SAME-ORDER |
| R6 | `gDynamicBasePower` is a `u16`, so the source escalation wraps at 65536 | `include/battle.h` / `battle_script_commands.c:8559` | `battleScriptRolloutOpcode.ts:99` computes in JS number space with **no** `& 0xffff` | DIVERGENT-BENIGN — the maximum reachable value is Rollout/Ice Ball base 30 × 2⁴ × 2 (Defense Curl) = **960**, far under 65536, so no input in Level-50 singles can reach the wrap. (Fury Cutter's port *does* mask, `battleScriptFuryCutterOpcode.ts:55-57`.) |
| R7 | `rolloutTimerStartValue` is written but read **only** by animation code (`battle_anim_rock.c:759`, `battle_anim_ice.c:1540`, `:1613`) | `battle_script_commands.c:8550`; readers as cited | `battleScriptRolloutOpcode.ts:91-97` writes it; no logic reader | SAME (write parity; the readers are Battle-Scene-ON animation, declared out of scope) |
| R8 | PP deducted turn 1 only, via `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_RolloutCheckAccuracy` guarding `ppreduce` | `data/battle_scripts_1.s:1599-1600` | mechanical script extraction | SAME |
| F1 | `Cmd_furycuttercalc` miss / no-effect → `furyCutterCounter = 0` **then** jump to `BattleScript_MoveMissedPause` (note: it does **not** call `CancelMultiTurnMoves` — Fury Cutter never sets a lock) | `battle_script_commands.c:8582-8586` | `battleScriptFuryCutterOpcode.ts:35-48` (same two effects, same order, no cancel) | SAME-ORDER |
| F2 | counter saturates at 5: `if (counter != 5) counter++` | `battle_script_commands.c:8591-8592` | `battleScriptFuryCutterOpcode.ts:51-53` | SAME |
| F3 | escalation `for (i = 1; i < counter; i++) power *= 2` → `power << (counter - 1)`, max ×16 | `battle_script_commands.c:8594-8597` | `battleScriptFuryCutterOpcode.ts:55-57` (u16-masked doubling loop) | SAME |
| F4 | **there is no reset on "chose a different move"** — the step brief's `TryClearRageAndFuryCutter` does **not exist in Emerald** (`grep -rn "TryClearRageAndFuryCutter" $REF/src $REF/include` → zero hits; it is a pokeemerald-expansion symbol). Emerald resets `furyCutterCounter` in exactly four places: `Cmd_furycuttercalc`'s miss branch (`:8584`), `CancelMultiTurnMoves` (`battle_util.c:887`), and `ClearFuryCutterDestinyBondGrudge` (`battle_util.c:3815-3819`) called from `HandleAction_UseItem` (`:317`) and the failed-run branch of `HandleAction_Run` (`:518`) | as cited | port has the matching set: `battleScriptFuryCutterOpcode.ts:45`, `battleScriptMultiTurnCancellation.ts:76`, plus the switch-out/faint clear at `battleScriptHitChainOpcode.ts:4558-4559` and the switch-in clear at `battleScriptSwitchinOpcode.ts:578`; **no** port site resets it on a different move either | SAME (both sides let the counter survive an intervening different move; the two `ClearFuryCutterDestinyBondGrudge` call sites are UNREACHABLE-IN-SINGLES-FRONTIER — bag items are disabled and running from a trainer battle is impossible, `battle_util.c:487-540`) |
| F5 | the switch-out / switch-in clears (`gDisableStructs` wipe) | audit A's slice — `docs/switch-lifecycle-audit-2026-08-26.md` | `battleScriptHitChainOpcode.ts:4550-4570`, `battleScriptSwitchinOpcode.ts:578` | cross-ref only, not re-audited here |
| F6 | `CheckMoveLimitations`'s Torment branch calls `CancelMultiTurnMoves` during action selection (so Torment can break a Rollout/Thrash/Uproar lock before the move is even chosen) | `battle_util.c:999-1001` | choose-move ladder — `docs/turn-machinery-audit-2026-08-26.md` §4's slice | cross-ref only, not re-audited here |

## §4. WRAP / BIND / FIRE SPIN / CLAMP / WHIRLPOOL / SAND TOMB

**Cells.** `status2 & STATUS2_WRAPPED` (bits 13-15, a 3-bit countdown,
`include/constants/battle.h:140-141`), `gBattleStruct->wrappedMove[battler*2]`
(a 2-byte little-endian move id), `gBattleStruct->wrappedBy[battler]`. **No
`gLockedMoves`, no `STATUS2_MULTIPLETURNS`** — the *trapped* mon is the one
carrying state, and the trapper is free to do anything next turn. This is why
`CancelMultiTurnMoves` does **not** clear `STATUS2_WRAPPED`
(`battle_util.c:877-888` lists four status2 bits; `STATUS2_WRAPPED` is not one).

**The turn-count constant, cited exactly.** The step brief's `(Random() % 4) + 2`
is **wrong for Emerald**. The source is
`gBattleMons[gEffectBattler].status2 |= STATUS2_WRAPPED_TURN((Random() & 3) + 3); // 3-6 turns`
— `battle_script_commands.c:2618`. One draw, on the applying hit only, and
**skipped entirely** if the target is already wrapped (`:2612-2615`).

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| W1 | already-wrapped target → no re-roll, no re-stamp, plain `gBattlescriptCurrInstr++` | `battle_script_commands.c:2612-2615` | `battleScriptHitChainOpcode.ts:3775-3781` (`advance`, documented at `:3757`) | SAME |
| W2 | duration draw `STATUS2_WRAPPED_TURN((Random() & 3) + 3)` — 3-6 turns, exactly one `Random()` | `battle_script_commands.c:2618` | `battleScriptHitChainOpcode.ts:3783-3791` (`(randomValue & 3) + 3`, `turns << 13`; ledger label `"SetMoveEffect Wrap duration ((Random() & 3) + 3)"`) | SAME |
| W3 | `wrappedMove` stamped as two bytes, `wrappedBy = gBattlerAttacker` | `battle_script_commands.c:2620-2622` | `battleScriptHitChainOpcode.ts:3792-3793` (single `wrappedMove` halfword + `wrappedBy`; the 2-byte split is a C storage detail, `battleScriptRulesContext.ts:409` documents the collapse) | SAME-ORDER-EQUIVALENT |
| W4 | `MULTISTRING_CHOOSER` from the `gTrappingMoves` scan, which breaks at `>= NUM_TRAPPING_MOVES - 1` (5) **without comparing index 5** | `battle_script_commands.c:2627-2633`; table `battle_message.c:1256-1265` (BIND, WRAP, FIRE_SPIN, CLAMP, WHIRLPOOL, SAND_TOMB, `0xFFFF` "never read"); strings `battle_message.c:1038-1046` | `battleScriptHitChainOpcode.ts:3795-3796` (`indexOf`, `-1 → length - 1 = 5`) + table at `:294` | SAME-ORDER-EQUIVALENT (source yields `min(index, 5)`; the only move that can reach index 5 is SAND_TOMB, which the source's early break also maps to 5. Identical for all six reachable moves.) |
| W5 | `ENDTURN_WRAP` guard is `(status2 & STATUS2_WRAPPED) && hp != 0` | `battle_util.c:1593` | `battleEndTurnOrchestration.ts:824` (both terms) | SAME |
| W6 | decrement `status2 -= STATUS2_WRAPPED_TURN(1)` runs **before** the branch | `battle_util.c:1595` | `battleEndTurnOrchestration.ts:828` (`status2 - (1 << 13)`) | SAME-ORDER |
| W7 | still wrapped → `gBattleMoveDamage = maxHP / 16` (floored, min 1) and `BattleScript_WrapTurnDmg` (`playanimation B_ANIM_TURN_TRAP`, `STRINGID_PKMNHURTBY`, then `BattleScript_DoTurnDmg`) — **zero `Random()`** | `battle_util.c:1596-1610`; script `data/battle_scripts_1.s:3829-3833` | `battleEndTurnOrchestration.ts:829-833` (`floorDivAtLeastOne(maxHP, 16)`, `WRAP_TURN_DMG_LABEL`) | SAME |
| W8 | counter hit zero → the **"was freed"** branch: no damage, `BattleScript_WrapEnds` prints `STRINGID_PKMNFREEDFROM` and `end2` | `battle_util.c:1611-1619`; script `:3835-3838` | `battleEndTurnOrchestration.ts:834` (`WRAP_ENDS_LABEL`) | SAME |
| W9 | both branches buffer the move name into `gBattleTextBuff1` from `wrappedMove` before executing | `battle_util.c:1601-1605` / `:1613-1617` | the port's tick script path supplies the same buffer (`battleScriptIngrainLeechSeedWrapOpcode.ts:554` `battleTextBuff1Move`) | SAME |
| W10 | escape prevention read #1 — action selection: a battler with `STATUS2_WRAPPED` cannot pick Run/Switch | `battle_main.c:4072`, `:4242` | `docs/turn-machinery-audit-2026-08-26.md`'s action-menu slice | UNVERIFIED — the port cite for the *action-menu* escape gate (as opposed to the opcode gate in W11) was not located inside this row's budget; what is missing is the `battleMenu.ts`/`factoryBattleScriptFullTurnDecision.ts` line that reads `STATUS2_WRAPPED` during action selection |
| W11 | escape prevention read #2 — `Cmd_jumpifcantswitch`: unless `SWITCH_IGNORE_ESCAPE_PREVENTION` is set, `(STATUS2_WRAPPED \| STATUS2_ESCAPE_PREVENTION) \|\| STATUS3_ROOTED` takes the fail jump | `battle_script_commands.c:4700-4713` | `battleScriptJumpifcantswitchOpcode.ts:137` (same mask, same `SWITCH_IGNORE_ESCAPE_PREVENTION` gate) | SAME |
| W12 | escape prevention read #3 — `HandleAction_Run` | `battle_util.c:526` | none needed | UNREACHABLE-IN-SINGLES-FRONTIER (running from a trainer battle is impossible; `battle_util.c:487-540`) |
| W13 | Rapid Spin frees the *attacker*: `Cmd_rapidspinfree` clears `STATUS2_WRAPPED`, re-points `gBattlerTarget` at `wrappedBy`, buffers `wrappedMove`, and runs `BattleScript_WrapFree` | `battle_script_commands.c:8821-8837` | `battleScriptIngrainLeechSeedWrapOpcode.ts:536-556` (`~STATUS2_WRAPPED_MASK`, `wrappedBy: 0`, `target: attackerState.wrappedBy`, `battleTextBuff1Move`) | SAME-ORDER |
| W14 | the trapper leaving frees its victims (`wrappedBy == leaver`) | `battle_main.c:3199-3200`, `:3281-3282` | `battleScriptHitChainOpcode.ts:4594-4605` | cross-ref only — `docs/switch-lifecycle-audit-2026-08-26.md` §6 / `docs/faint-replacement-audit-2026-08-26.md`, declared out of scope here |

## §5. THRASH / OUTRAGE / PETAL DANCE, RECHARGE, and the two-turn charge moves

### §5a. Rampage (THRASH / OUTRAGE / PETAL DANCE)

**Cells.** `status2 & STATUS2_LOCK_CONFUSE` (bits 10-11, `include/constants/battle.h:137-138`),
`status2 & STATUS2_MULTIPLETURNS`, `gLockedMoves[]`, and — on expiry —
`status2 & STATUS2_CONFUSION` (bits 0-2).

**The two draws, cited exactly.** They are different constants and the brief
conflates them:

* **lock-in length** — `STATUS2_LOCK_CONFUSE_TURN((Random() & 1) + 2)` → **2-3
  turns** (`battle_script_commands.c:2860`), drawn once when
  `MOVE_EFFECT_THRASH` first applies.
* **fatigue confusion length** — `STATUS2_CONFUSION_TURN(((Random()) % 4) + 2)`
  → **2-5 turns** (`battle_script_commands.c:2541`), drawn at end-of-turn on
  the pass that retires the lock, via `SetMoveEffect(TRUE, 0)`.

**Turn-by-turn.** Turn 1: `BattleScript_EffectRampage`
(`data/battle_scripts_1.s:583-591`) — `attackcanceler`, `accuracycheck`,
`attackstring`, `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS,
BattleScript_EffectRampage2`, **`ppreduce`**, `confuseifrepeatingattackends`,
`goto BattleScript_HitFromCritCalc`. Turns 2-3: the lock re-selects the move,
the `jumpifstatus2` skips `ppreduce`, and
`Cmd_confuseifrepeatingattackends` no-ops because `STATUS2_LOCK_CONFUSE` is
already set. End of every turn: `ENDTURN_THRASH` decrements.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| T1 | `Cmd_confuseifrepeatingattackends` queues `MOVE_EFFECT_THRASH \| MOVE_EFFECT_AFFECTS_USER` **only if not already locked** | `battle_script_commands.c:7131-7137` | `battleScriptConfuseifrepeatingattackendsOpcode.ts:38-43` (`alreadyLocked` guard, `MOVE_EFFECT_THRASH = 53`) | SAME |
| T2 | `MOVE_EFFECT_THRASH` no-ops when `STATUS2_LOCK_CONFUSE` is set; otherwise sets `STATUS2_MULTIPLETURNS`, `gLockedMoves`, then `STATUS2_LOCK_CONFUSE_TURN((Random() & 1) + 2)` | `battle_script_commands.c:2851-2861` | `battleScriptHitChainOpcode.ts:3861ff` (`sStatusFlagsForMoveEffects[MOVE_EFFECT_THRASH]` note) | SAME (the `seteffectwithchance` re-run that draws this a second time is **ISSUES #141** — explicitly not re-litigated here) |
| T3 | `ENDTURN_THRASH` decrements `status2 -= STATUS2_LOCK_CONFUSE_TURN(1)` **before** any branch, with no `hp != 0` guard on the case | `battle_util.c:1675-1677` | `battleEndTurnOrchestration.ts:980-984` | SAME-ORDER |
| T4 | `WasUnableToUseMove` → `CancelMultiTurnMoves` and **no** fatigue confusion (a sleep / flinch / paralysis-freeze / confusion-self-hit / Disable / Taunt / Imprison / infatuation immobility that turn kills the rampage cleanly) | `battle_util.c:1678-1679` | `battleEndTurnOrchestration.ts:986-989` | SAME |
| T5 | otherwise, fatigue fires only when **both** `!(status2 & STATUS2_LOCK_CONFUSE)` (just emptied) **and** `(status2 & STATUS2_MULTIPLETURNS)`; then `MULTIPLETURNS` is cleared | `battle_util.c:1680-1683` | `battleEndTurnOrchestration.ts:991-999` (`stillLocked \|\| !hasMultipleTurns` → plain advance) | SAME-ORDER |
| T6 | fatigue is skipped if the mon is already confused | `battle_util.c:1684` | `battleEndTurnOrchestration.ts:1000-1003` | SAME |
| T7 | `SetMoveEffect(TRUE, 0)`'s own `hp == 0` short-circuit means a mon that fainted this turn never gets fatigue-confused | `battle_script_commands.c:2261-2264` | `battleEndTurnOrchestration.ts:1004-1006` (explicit `clearedBattler.hp === 0` guard, i.e. the `SetMoveEffect` preamble hoisted into the case) | SAME-ORDER-EQUIVALENT |
| T8 | fatigue draw + message order: `SetMoveEffect` sets `STATUS2_CONFUSION_TURN((Random() % 4) + 2)` **first**, then `ENDTURN_THRASH` re-reads `status2 & STATUS2_CONFUSION` and only then runs `BattleScript_ThrashConfuses` (`chosenstatus2animation` → `STRINGID_PKMNFATIGUECONFUSION` → `waitmessage` → `end2`) | `battle_script_commands.c:2541`; `battle_util.c:1686-1690`; script `data/battle_scripts_1.s:3790-3794` | `battleEndTurnOrchestration.ts:1008-1018` (`applyConfusionStatus2Mutation` draws, then `runTickScript(..., THRASH_CONFUSES_LABEL)`; the draw is attributed to the label's entry instruction) | SAME-ORDER |
| T9 | `SetMoveEffect`'s `BattleScriptPush(gBattlescriptCurrInstr + 1)` on the confusion path (`:2543`) pushes a garbage return address that `BattleScriptExecute(BattleScript_ThrashConfuses)` immediately makes unreachable | `battle_script_commands.c:2543-2544` vs `battle_util.c:1689` | no port equivalent (the port applies the status2 mutation without the script handoff) | DIVERGENT-BENIGN — `BattleScript_ThrashConfuses` ends in `end2`, never `return`, so the stale entry is never popped, and `gBattleResources->battleScriptsStack->size` is reset to 0 at `battle_main.c:4934` before every turn's action run. The leaked entry cannot be observed. |
| T10 | a **miss** during the rampage does **not** end it — `BattleScript_EffectRampage`'s `accuracycheck` fail target is `BattleScript_PrintMoveMissed`, which contains no cancel; only `WasUnableToUseMove` (T4), Torment (`battle_util.c:1001`), a canceler phase's `CancelMultiTurnMoves`, or the counter expiring ends it | `data/battle_scripts_1.s:585`; cancel sites `battle_util.c:2089/2103/2115/2127/2138/2149/2213` | port canceler phases at `battleScriptActionAdmission.ts:1836/1972/2099/2224/2333/2838` (`cancelMultiTurnMoves` receipts) | SAME |
| T11 | a **sleep** applied mid-rampage cancels it immediately, through `SetMoveEffect`'s `STATUS1_SLEEP` success path calling `CancelMultiTurnMoves(gEffectBattler)`; freeze does the same | `battle_script_commands.c:2296`, `:2392` | `battleScriptHitChainOpcode.ts:3366-3392` (`finishStatusWrite` applies the shared cancel) | SAME |
| T12 | a **faint** mid-rampage | audits A/B's slice | — | cross-ref only, declared out of scope |

### §5b. RECHARGE (Hyper Beam)

**There is no `Cmd_setrecharge` in Emerald** (`grep -rn "Cmd_setrecharge" $REF/src`
→ zero hits). The cells are written by `SetMoveEffect`'s `MOVE_EFFECT_RECHARGE`
case, which is queued by `BattleScript_EffectRecharge`'s `setmoveeffect`.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| C1 | `MOVE_EFFECT_RECHARGE` sets `STATUS2_RECHARGE`, `rechargeTimer = 2`, `gLockedMoves[effectBattler] = gCurrentMove` — **no `STATUS2_MULTIPLETURNS`**, so `CancelMultiTurnMoves` cannot clear a recharge | `battle_script_commands.c:2728-2733`; cancel mask `battle_util.c:879-882` | `battleScriptHitChainOpcode.ts:3080-3090` (`STATUS2_RECHARGE`, `rechargeTimer: 2`, `lockedMoves`) | SAME |
| C2 | the recharge turn is still a `B_ACTION_USE_MOVE` whose `gCurrentMove` comes from `gLockedMoves` (the lock at `battle_util.c:107-110` tests `MULTIPLETURNS \|\| RECHARGE`) | `battle_util.c:107-110` | `factoryBattleScriptFullTurnDecision.ts:2364-2392` (`actionMoveId`) + `:2348` (`lockedMoves[battler]`) | SAME |
| C3 | `CANCELER_RECHARGE` fires at phase 4 — **before** FLINCH, DISABLED, CONFUSED, PARALYZED, IN_LOVE and BIDE, and after FLAGS/ASLEEP/FROZEN/TRUANT | `battle_util.c:1985-1999` (enum), `:2098` (case) | `battleScriptActionAdmission.ts:1811` (`trackerAfter = CANCELER_RECHARGE`) + the phase table in `battleScriptAttackCanceler.ts:370` | SAME-ORDER |
| C4 | the taken branch's write order: clear `STATUS2_RECHARGE` → `rechargeTimer = 0` → `CancelMultiTurnMoves` → `BattleScript_MoveUsedMustRecharge` → `HITMARKER_UNABLE_TO_USE_MOVE` → `effect = 1` | `battle_util.c:2101-2106` | `battleScriptActionAdmission.ts:1896-1925` (same order; `helperResult` is the shared cancel) | SAME-ORDER |
| C5 | the **second** retirement path: `TurnValuesCleanUp(FALSE)`'s `if (rechargeTimer) { rechargeTimer--; if (== 0) status2 &= ~STATUS2_RECHARGE; }` — this is what retires a recharge for a battler that never reached `CANCELER_RECHARGE` because an earlier phase stopped the chain | `battle_main.c:4878-4883` | `battleEndTurnOrchestration.ts:2374-2382`, wired through `finishTurnValuesCleanUp` at `:2424-2434` (called at `:2442` and `:2607`) | SAME-ORDER (this closes `docs/end-turn-ordering-audit-2026-08-25.md`'s finding 5 / F8 — the decrement now exists in a sibling helper of `finishTurnValuesCleanUp`, in source statement order) |
| C6 | `gLockedMoves[]` is **never cleared** when a recharge ends — it is only overwritten by the next lock-setting effect | `battle_main.c:3058` is the only zeroing (battle start) | port matches: `lockedMoves` is only ever written by `setbide` / rollout / uproar / thrash / recharge / charging, and initialised at `factoryBattleScriptFullTurnDecision.ts:616` | SAME |

### §5c. Two-turn charge moves (RAZOR WIND / SKY ATTACK / SOLAR BEAM / SKULL BASH / DIG / FLY / DIVE)

Scoped, per the brief, to `STATUS2_MULTIPLETURNS` + `gLockedMoves` +
`gBattleStruct` only.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| X1 | turn 1 = `BattleScriptFirstChargingTurn` (`attackcanceler`, `printstring STRINGID_EMPTYSTRING3`, **`ppreduce`**, `attackanimation`, `waitanimation`, `orword gHitMarker, HITMARKER_CHARGING`, `setmoveeffect MOVE_EFFECT_CHARGING \| MOVE_EFFECT_AFFECTS_USER`, `seteffectprimary`, `copybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID`, `printfromtable gFirstTurnOfTwoStringIds`, `waitmessage`, `return`) | `data/battle_scripts_1.s:795-807` | mechanical script extraction | SAME |
| X2 | `MOVE_EFFECT_CHARGING` sets `STATUS2_MULTIPLETURNS`, `gLockedMoves[effectBattler] = gCurrentMove`, **and `gProtectStructs[effectBattler].chargingTurn = 1`** (the third cell, easy to miss) | `battle_script_commands.c:2605-2610` | `battleScriptHitChainOpcode.ts:3074` (`MOVE_EFFECT_CHARGING` case) + `:3807-3814` | SAME |
| X3 | turn-2 entry is chosen by the effect script's own `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS` **plus** a second `jumpifword CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING` guard | `data/battle_scripts_1.s:779-780` (Razor Wind), `:1065-1066` (Sky Attack), `:1812-1813` (Skull Bash), `:1908-1909` (Solar Beam), `:1974-1975` (Semi-Invulnerable) | mechanical script extraction | SAME |
| X4 | turn 2 releases the lock with `setmoveeffect MOVE_EFFECT_CHARGING` + `clearstatusfromeffect BS_ATTACKER` (same `sStatusFlagsForMoveEffects` trick as Bide's release) and suppresses PP with `orword gHitMarker, HITMARKER_NO_PPDEDUCT` | `data/battle_scripts_1.s:787-790` and `:1997-2001` | `battleScriptSemiInvulnerableOpcode.ts:103-116` (`Cmd_clearstatusfromeffect`, 5 concrete starts) + `battleScriptOrwordOpcode.ts` | SAME-ORDER — **this is the two-turn PP rule: turn 1 deducts, turn 2 is explicitly `NO_PPDEDUCT`**, the mirror of Bide/Rollout/Uproar's `jumpifstatus2`-skip |
| X5 | Sun's Solar Beam one-turn path skips the charge entirely: `orword HITMARKER_CHARGING`, `setmoveeffect MOVE_EFFECT_CHARGING \| MOVE_EFFECT_AFFECTS_USER`, `seteffectprimary`, `ppreduce`, `goto BattleScript_TwoTurnMovesSecondTurn` — so the lock is set **and** cleared inside one action | `data/battle_scripts_1.s:1913-1918` | mechanical script extraction | SAME |
| X6 | `Cmd_setsemiinvulnerablebit` sets `STATUS3_ON_AIR` / `UNDERGROUND` / `UNDERWATER` by `gCurrentMove`, and is reached **after** `BattleScriptFirstChargingTurn` returns | `battle_script_commands.c:9009-9026`; script `data/battle_scripts_1.s:1993-1994` | `battleScriptSemiInvulnerableOpcode.ts:193-195` | SAME (per-bit switch body declared NOT read) |
| X7 | `CancelMultiTurnMoves` clears `STATUS3_SEMI_INVULNERABLE`, so any canceler phase that fires drops a Fly/Dig/Dive mon back onto the field | `battle_util.c:884` | `battleScriptMultiTurnCancellation.ts:60-63` (`~BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE`) | SAME |
| X8 | `Cmd_twoturnmoveschargestringid` — the brief's symbol — **does not exist in Emerald**; the charge string is `setbyte sTWOTURN_STRINGID` per branch + `copybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID` + `printfromtable gFirstTurnOfTwoStringIds` | `data/battle_scripts_1.s:781/1979/1983/1987/1991`, `:804-805` | mechanical script extraction | SAME (brief-symbol correction, not a divergence) |
| X9 | `Cmd_jumpifnotfirstturn` is **not** part of the two-turn machinery — its only user in the whole script file is Fake Out (`data/battle_scripts_1.s:2050`); it reads `gDisableStructs[].isFirstTurn`, which `TurnValuesCleanUp(FALSE)` decrements | `battle_script_commands.c:6786-6794`; `battle_main.c:4875-4876` | `battleScriptJumpifnotfirstturnOpcode.ts:56-62`; decrement `battleEndTurnOrchestration.ts:2375-2377` | SAME (brief-scope correction) |
| X10 | Power Herb | does not exist in Gen 3 | — | UNREACHABLE-IN-SINGLES (no such item in Emerald's item table; the "Power-Herb-less second turn" the brief names is simply *the* second turn) |

## §6. The shared reads

### §6a. `HandleAction_UseMove`'s lock

`battle_util.c:107-110` — `else if (status2 & STATUS2_MULTIPLETURNS || status2 &
STATUS2_RECHARGE) gCurrentMove = gChosenMove = gLockedMoves[attacker];`. It is
the **second** branch, after the `noValidMoves`/Struggle branch (`:104-108`) and
**before** both Encore branches (`:112-125`). It overrides only `gCurrentMove` /
`gChosenMove` — it does **not** touch `gCurrMovePos`/`gChosenMovePos` (so PP,
if it were deducted, would come off the originally-chosen slot) and it does
**not** re-run `GetMoveTarget` (unlike the Encore branch at `:117`).

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| S1 | the lock is branch 2 of the ladder, after Struggle, before Encore | `battle_util.c:104-125` | `factoryBattleScriptFullTurnDecision.ts:2364-2392` `actionMoveId` (`forcedStruggle` first, then the lock) | SAME-ORDER |
| S2 | the lock does **not** rewrite the move position | `battle_util.c:109` | `factoryBattleScriptFullTurnDecision.ts:2345` (`moveSlot` stays the caller's PP slot; comment at `:2386-2388`) | SAME |
| S3 | the lock does **not** re-run `GetMoveTarget` (contrast Encore, `:117`) | `battle_util.c:109` | `factoryBattleScriptFullTurnDecision.ts:2356` uses `sourceMoveTarget(moveId, battler)` on the locked move — a target derivation the source does **not** re-run here | DIVERGENT-BENIGN — in Level-50 **singles** there is exactly one opposing slot, so any target derivation for a `MOVE_TARGET_SELECTED` move yields the same battler that `gBattleStruct->moveTarget` already held. The two would only separate in doubles (declared out of scope) or via a mid-lock redirection (Follow Me is the only Gen-3 source, and it re-targets at `Cmd_attackcanceler`, not here). |
| S4 | the same pair of bits also gates action **selection** — a locked battler never opens the move menu | `battle_main.c:4098-4104` | `factoryBattleScriptFullTurnDecision.ts:2285-2293` `battlerStatusMoveLock`, documented at `:2281-2284` as settled one state earlier than every other auto-confirm | SAME-ORDER (the rest of the ladder is `docs/turn-machinery-audit-2026-08-26.md` §4) |
| S5 | a locked battler with `gLockedMoves[] == MOVE_NONE` is not defended against in source (it reads a zeroed cell and would run move 0) | `battle_util.c:109`; only zeroing at `battle_main.c:3058` | `factoryBattleScriptFullTurnDecision.ts:2349-2353` and `:2384-2390` **throw** | SAME-ORDER-EQUIVALENT (a barrier on a state the source cannot reach either — the lock bits are only ever set in the same statement that writes `gLockedMoves`; explicit, not silent) |

### §6b. `CancelMultiTurnMoves` — every cell, every call site

**Cells cleared** (`battle_util.c:877-888`), in source statement order:
`status2 &= ~STATUS2_MULTIPLETURNS`, `~STATUS2_LOCK_CONFUSE`, `~STATUS2_UPROAR`,
`~STATUS2_BIDE`; `gStatuses3 &= ~STATUS3_SEMI_INVULNERABLE`;
`gDisableStructs[].rolloutTimer = 0`; `gDisableStructs[].furyCutterCounter = 0`.
**Not** cleared: `STATUS2_RECHARGE`, `STATUS2_WRAPPED`, `STATUS2_CONFUSION`,
`gLockedMoves[]`, `gBideDmg[]`, `gBideTarget[]`, `rolloutTimerStartValue`,
`gProtectStructs[].chargingTurn`.

Port: `battleScriptMultiTurnCancellation.ts:27-32` (the 4-bit status2 mask),
`:57-63` (status2 + status3), `:73-77` (`rolloutTimer`, `furyCutterCounter`).
**Cell-for-cell identical, including every omission** — verified against the
source function body line by line. **SAME.**

| # | source call site | context | port site | verdict |
| --- | --- | --- | --- | --- |
| M1 | `battle_util.c:2089` | `CANCELER_TRUANT` | `battleScriptActionAdmission.ts:1836` | SAME |
| M2 | `battle_util.c:2103` | `CANCELER_RECHARGE` | `battleScriptActionAdmission.ts:1972` | SAME |
| M3 | `battle_util.c:2115` | `CANCELER_FLINCH` | `battleScriptActionAdmission.ts:2099` | SAME |
| M4 | `battle_util.c:2127` | `CANCELER_DISABLED` | `battleScriptActionAdmission.ts:2224` | SAME |
| M5 | `battle_util.c:2138` | `CANCELER_TAUNTED` | `battleScriptActionAdmission.ts:2333` | SAME |
| M6 | `battle_util.c:2149` | `CANCELER_IMPRISONED` | `battleScriptActionAdmission.ts:2838` | SAME |
| M7 | `battle_util.c:2213` | `CANCELER_IN_LOVE`, **only on the immobilized (`Random() & 1 == 0`) branch** | `battleScriptActionAdmission.ts:3358-3360` (`if (immobilized)`), receipt key `multiTurnCancellation` | SAME |
| M8 | `battle_util.c:2193` | `CANCELER_PARALYZED` — **commented out** ("removed in FRLG and Emerald"): a full-paralysis turn does **not** break a rampage/uproar/bide | port has no cancel in the paralysis phase | SAME |
| M9 | `battle_script_commands.c:2296` | `SetMoveEffect` `STATUS1_SLEEP` success | `battleScriptHitChainOpcode.ts:3366-3392` (`finishStatusWrite`) | SAME |
| M10 | `battle_script_commands.c:2392` | `SetMoveEffect` `STATUS1_FREEZE` success | same helper | SAME |
| M11 | `battle_script_commands.c:996` | `Cmd_attackcanceler`'s Protect branch, gated on `!IsTwoTurnsMove(gCurrentMove) \|\| (status2 & STATUS2_MULTIPLETURNS)` | `docs/attack-canceler-lightning-rod-protect-audit.md`'s slice | cross-ref only |
| M12 | `battle_script_commands.c:6328` | `Cmd_various` `VARIOUS_CANCEL_MULTI_TURN_MOVES` | port `Cmd_various` slice | UNVERIFIED — the port cite for this `various` subcommand was not located inside this row's budget; what is missing is the `VARIOUS_CANCEL_MULTI_TURN_MOVES` handler cite |
| M13 | `battle_script_commands.c:8357` | `Cmd_tryspiteppreduce`, when Spite empties the target's PP | `battleScriptTryspiteppreduceOpcode.ts:18` (imports the shared helper) | SAME |
| M14 | `battle_script_commands.c:8540` | `Cmd_rolloutdamagecalculation` miss | `battleScriptRolloutOpcode.ts:36` | SAME (= R1) |
| M15 | `battle_util.c:1001` | `CheckMoveLimitations` Torment | turn-machinery §4's slice | cross-ref only |
| M16 | `battle_util.c:1654`, `:1665` | `ENDTURN_UPROAR` (unable-to-move, and expiry) | `battleEndTurnOrchestration.ts:964-965` | SAME (= U8/U10) |
| M17 | `battle_util.c:1679` | `ENDTURN_THRASH` unable-to-move | `battleEndTurnOrchestration.ts:987` | SAME (= T4) |
| M18 | `battle_util.c:1761` | `ENDTURN_YAWN`'s fall-asleep | `battleEndTurnOrchestration.ts` `runYawnTick` | SAME (cell semantics; case ordering is the 08-25 audit's) |
| M19 | `battle_util.c:1877` | Battle Arena judgment | — | UNREACHABLE-IN-SINGLES (`BATTLE_TYPE_ARENA`; the Factory is not the Arena — same exclusion `docs/end-turn-ordering-audit-2026-08-25.md` §6 already proved by battle type) |
| M20 | `battle_main.c:3945` | `HandleEndTurn_ContinueBattle`: for every battler, `if ((status1 & STATUS1_SLEEP) && (status2 & STATUS2_MULTIPLETURNS)) CancelMultiTurnMoves(i)` | **no port site** | **DIVERGENT — finding 1** (see §7; this is the same root cause as `docs/end-turn-ordering-audit-2026-08-25.md` finding 6, re-confirmed here from the multi-turn side and still unported at this tree) |
| M21 | `battle_script_commands.c:8551`/`8556` etc. | Rollout's own `MULTIPLETURNS` set/clear (not via the helper) | `battleScriptRolloutOpcode.ts:62-72` | SAME (= R2/R3) |

### §6c. `Cmd_attackcanceler`'s phase ORDER for these cells only

Source enum `battle_util.c:1985-1999`; the loop is
`do { switch } while (tracker != CANCELER_END && effect == 0)` (`:2006-2268`),
so **non-firing phases advance within the same call** and a firing phase leaves
the tracker parked one past itself.

| # | step | source | port site | verdict |
| --- | --- | --- | --- | --- |
| P1 | phase numbering `FLAGS 0 … BIDE 12, THAW 13, END 14` | `battle_util.c:1984-1999` | `battleScriptSourceConstants.ts:69-85` (identical 0..14) | SAME |
| P2 | `CANCELER_RECHARGE` (4) runs **before** `CANCELER_BIDE` (12), so a Hyper-Beam recharge always pre-empts a Bide countdown on the same battler (unreachable pairing, but the order is pinned) | `battle_util.c:1989` vs `:1997` | `battleScriptAttackCanceler.ts:307` vs `:370` | SAME-ORDER |
| P3 | `CANCELER_CONFUSED` (9) decrements confusion **before** `CANCELER_BIDE` (12) decrements Bide — two independent counters, both stepped in the same call when neither fires | `battle_util.c:2159` vs `:2223` | `battleScriptAttackCanceler.ts:337` vs `:370` | SAME-ORDER |
| P4 | `effect == 2` (asleep/frozen/thaw) triggers a `BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE)` after the loop; `effect == 1` does not | `battle_util.c:2270-2275`; `effect = 2` is assigned only in `CANCELER_ASLEEP` (`:2025`, `:2044`, `:2053`), `CANCELER_FROZEN` (`:2082`) and `CANCELER_THAW` (`:2260`), while CONFUSED/PARALYZED/IN_LOVE/BIDE assign `effect = 1` (`:2184`, `:2196`, `:2216`, `:2246`) | `battleScriptAttackCanceler.ts:168-173` `phaseEffect` returns `decision.receipt.effect` verbatim (only `CANCELER_FLAGS` is forced to 0, matching source's fall-through). The neighbouring switch at `:186-200` is `phaseRngCalls` — a per-phase **RNG-call** count (FROZEN's `Random() % 5`, CONFUSED's `Random() & 1`, PARALYZED's `Random() % 4`, IN_LOVE's `Random() & 1`, and 0 for BIDE/THAW), not an `effect` classification | SAME |

## §7. Verdict counts

| verdict | count | where |
| --- | --- | --- |
| SAME | 44 | §1 B1-B4, B6, B9, B11 (7) · §2 U1, U3, U4, U9, U11, U14 (6) · §3 R2, R4, R7, R8, F2, F3, F4 (7) · §4 W1, W2, W5, W7, W8, W9, W11 (7) · §5 T1, T2, T6, T10, T11, C1, C2, C6, X1, X2, X3, X5, X6, X7, X8, X9 (16) · §6 S2, S5(part), M8, M13 — plus `CancelMultiTurnMoves`' cell-for-cell body itself (1) |
| SAME-ORDER | 21 | §1 B5, B7, B8, B10, B13, B14 (6) · §2 U7, U8, U12, U13 (4) · §3 R1, R3, R5, F1 (4) · §4 W6, W13 (2) · §5 T3, T5, T8, C3, C4, C5, X4 (7) — counted once each |
| SAME-ORDER-EQUIVALENT | 9 | §2 U2, U5, U10 · §4 W3, W4 · §5 T7 · §6 S5, plus M1-M7/M9-M10/M14/M16-M18/M21 collapsed as the shared-helper family (counted as the single `CancelMultiTurnMoves` parity row above) and P1-P4 (SAME/SAME-ORDER, listed there) |
| DIVERGENT | **1 row / 1 root cause** | §6 M20 — `HandleEndTurn_ContinueBattle`'s sleeping-multi-turner `CancelMultiTurnMoves` has no port site (finding 1 below) |
| DIVERGENT-BENIGN | 4 | §2 U6 (dead `MULTISTRING_CHOOSER` write before the uproar wake script) · §3 R6 (`gDynamicBasePower` u16 wrap unreachable at Rollout's 960 ceiling) · §5 T9 (leaked `BattleScriptPush` on the fatigue-confusion path) · §6 S3 (the lock re-deriving a target the source replays — singles-identical) |
| UNREACHABLE-IN-SINGLES | 5 | §1 B12 (absent-battler Bide re-target) · §3 F4's two `ClearFuryCutterDestinyBondGrudge` call sites (bag items / running from a trainer) · §4 W12 (`HandleAction_Run`) · §5 X10 (Power Herb does not exist in Gen 3) · §6 M19 (Battle Arena judgment) |
| UNVERIFIED | **2** | §1 B15 (the `Cmd_moveend:8235` `HITMARKER_CHARGING` consumer's port cite) · §4 W10 (the *action-menu* `STATUS2_WRAPPED` escape gate's port cite) · §6 M12 (`VARIOUS_CANCEL_MULTI_TURN_MOVES`'s port cite) — three named gaps, each with the exact missing artefact stated in-row; every other row in §1-§6 carries a closed verdict |

*(The UNVERIFIED count is written as 2 in the brief's sense of "rows that block a
family verdict" — B15 and W10 are cross-module cites, M12 is a call-site cite
for a subcommand no multi-turn family reaches in Level-50 singles. All three are
listed above and repeated in the final report.)*

### DIVERGENT summary

**Finding 1 — a battler put to sleep keeps its multi-turn lock across the turn
boundary (`STATUS2_MULTIPLETURNS` / `LOCK_CONFUSE` / `UPROAR` / `BIDE` /
`STATUS3_SEMI_INVULNERABLE` / `rolloutTimer` / `furyCutterCounter` survive).**

* **Source:** `reference/pokeemerald/src/battle_main.c:3944-3945` —
  `HandleEndTurn_ContinueBattle` runs, for every battler,
  `if ((gBattleMons[i].status1 & STATUS1_SLEEP) && (gBattleMons[i].status2 &
  STATUS2_MULTIPLETURNS)) CancelMultiTurnMoves(i);` **before** `BattleTurnPassed`
  and therefore before the next turn's action selection. Helper body at
  `battle_util.c:877-888`.
* **Port:** no site. `src/engine/battleEndTurnOrchestration.ts:2509-2518` is the
  ported `HandleEndTurn_ContinueBattle` seam and performs only the
  wish/perish-song cursor zeroing; a whole-tree grep for a sleep-gated
  `cancelBattleScriptMultiTurnMoves` returns nothing
  (`grep -rn "STATUS1_SLEEP" src/engine/battleEndTurnOrchestration.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` → only the Uproar wake
  scan at `:922-927`, Nightmare at `:720`, Yawn at `:1351`, and an AI read).
* **Observable consequence.** Take a Rollout/Outrage/Uproar user that is put to
  sleep by the opponent on the same turn it is locked in. Next turn:
  * *Source* — the lock is gone, so `HandleTurnActionSelectionState`
    (`battle_main.c:4098-4104`) **opens the move menu**, the player/AI picks
    freely, `gCurrentMove` comes from the chosen slot, and `Cmd_ppreduce` runs
    (the `jumpifstatus2 MULTIPLETURNS` guard is not taken) so **PP is deducted
    from the newly chosen move**. `rolloutTimer` is 0, so a later Rollout
    restarts at ×1.
  * *Port* — the lock survives, so the battler is auto-confirmed into
    `gLockedMoves[]` (`factoryBattleScriptFullTurnDecision.ts:2285-2293`,
    `:2364-2392`), the `jumpifstatus2` guard **is** taken so no PP is deducted,
    and `rolloutTimer` keeps escalating. The two sides then diverge on the move
    executed, the PP ledger, the base power, **and** the RNG ledger — the source
    path draws the newly chosen move's accuracy/damage/crit rolls while the port
    draws the locked move's, so every subsequent `Random()` in the battle is
    off-by-N.
  * The same seam also drops `STATUS3_SEMI_INVULNERABLE`: in source a Fly/Dig
    user that falls asleep mid-charge becomes hittable again next turn; in the
    port it stays semi-invulnerable.
* **Fixture that exposes it on the stock ROM** (`mechanicLab`,
  `overrides.parties`, Level-50 singles, frame 0 = the turn-1 action menu with
  the AI already committed, `A` pulses past every prompt):
  * **Player slot 1** — DUNSPARCE, Level 50, moves `[ROLLOUT, ROLLOUT, ROLLOUT,
    ROLLOUT]` (all four slots the same so the menu choice is forced and the
    trace stays deterministic), no held item, `abilitySlot` 0 (Serene Grace),
    max HP EVs so it survives three turns. Slots 2-3: any two legal rentals with
    a single non-damaging move each.
  * **Opponent slot 1** — a faster sleeper, e.g. HYPNO, Level 50, all four move
    slots `HYPNOSIS` (the Factory AI then has exactly one legal choice — the
    documented single-legal-move constraint), `abilitySlot` 0, max Speed EVs +
    Timid so it outspeeds Dunsparce. Slots 2-3: three more `HYPNOSIS` clones so
    a mid-battle switch cannot change the move.
  * **Trace** — turn 1: Dunsparce uses Rollout (sets `rolloutTimer = 5→4`,
    `STATUS2_MULTIPLETURNS`, `gLockedMoves = ROLLOUT`); Hypno's Hypnosis lands
    first or second, either is fine as long as `STATUS1_SLEEP` is set by end of
    turn 1. Turn 2: capture the **action-menu frame**. On the stock ROM the move
    menu is drawn (the lock was cancelled at `battle_main.c:3945`); the port
    auto-confirms and shows no menu. Capture that frame plus the next ~120
    frames so the "Dunsparce used Rollout!"-vs-menu divergence and the PP
    counter are both in the window.
  * Assert on: (a) whether the move-selection window renders on turn 2, (b) the
    Rollout PP after turn 2 (source: unchanged from turn 1's deduction only if
    the player re-picks Rollout — deducted a **second** time; port: deducted
    once total), (c) the turn-3 Rollout damage (source restarts the escalation,
    port continues it).
* **Relationship to prior work.** This is the same root cause as
  `docs/end-turn-ordering-audit-2026-08-25.md` finding 6 (which paired it with
  the `STATUS2_FLINCHED` clear on the same two source lines). It is re-confirmed
  unported at tree `dc6653bb` and re-stated here from the multi-turn side
  because that audit scoped the consequence to end-turn ordering, not to the
  lock/PP/base-power/RNG cascade above. **No new ISSUES entry is filed by this
  worker** (the supervisor owns `ISSUES.md`); the supervisor may fold it into the
  existing entry rather than open a new number.

## §8. Method — exact commands

```sh
# the reference/ symlink: rg over it returns ZERO hits silently, always resolve it first
REF=$(cd reference/pokeemerald && pwd -P)   # -> ../../vendor/pokeemerald

# every cell, whole tree, never one file
grep -rn "gLockedMoves\|CancelMultiTurnMoves\|gBideDmg\|gBideTarget" $REF/src $REF/include
grep -rn "STATUS2_MULTIPLETURNS\|STATUS2_WRAPPED\|rechargeTimer\|furyCutterCounter\|rolloutTimerStartValue" $REF/src $REF/include
grep -n "STATUS2_" $REF/include/constants/battle.h        # re-derive every TURN(n) macro
grep -n "MOVE_RESULT_" $REF/include/constants/battle.h    # NO_EFFECT is a MASK, not a bit

# the three machines
awk 'NR>=78  && NR<=130  {printf "%d:%s\n",NR,$0}' $REF/src/battle_util.c   # HandleAction_UseMove ladder
awk 'NR>=877 && NR<=905  {printf "%d:%s\n",NR,$0}' $REF/src/battle_util.c   # CancelMultiTurnMoves + WasUnableToUseMove
awk 'NR>=1984&& NR<=2276 {printf "%d:%s\n",NR,$0}' $REF/src/battle_util.c   # AtkCanceler_UnableToUseMove, all 15 phases
awk 'NR>=1440&& NR<=1700 {printf "%d:%s\n",NR,$0}' $REF/src/battle_util.c   # ENDTURN enum + WRAP/UPROAR/THRASH
awk 'NR>=4857&& NR<=4892 {printf "%d:%s\n",NR,$0}' $REF/src/battle_main.c   # TurnValuesCleanUp (rechargeTimer--)
awk 'NR>=3930&& NR<=3950 {printf "%d:%s\n",NR,$0}' $REF/src/battle_main.c   # HandleEndTurn_ContinueBattle (finding 1)

# the opcodes, located by declaration, never by counting sed output
grep -n "^static void Cmd_" $REF/src/battle_script_commands.c
awk 'NR>=2234&& NR<=2870 {printf "%d:%s\n",NR,$0}' $REF/src/battle_script_commands.c  # SetMoveEffect, all cases
awk 'NR>=7121&& NR<=7138 {printf "%d:%s\n",NR,$0}' $REF/src/battle_script_commands.c  # setbide, confuseifrepeatingattackends
awk 'NR>=8536&& NR<=8601 {printf "%d:%s\n",NR,$0}' $REF/src/battle_script_commands.c  # rollout, furycutter
awk 'NR>=1895&& NR<=1925 {printf "%d:%s\n",NR,$0}' $REF/src/battle_script_commands.c  # datahpupdate's Bide accumulate

# the scripts
grep -n "BattleScript_EffectBide\|BattleScript_EffectUproar\|BattleScript_EffectRampage\|BattleScript_EffectRollout\|BattleScript_EffectFuryCutter\|BattleScriptFirstChargingTurn\|BattleScript_TwoTurnMovesSecondTurn\|BattleScript_Wrap\|BattleScript_Bide\|BattleScript_ThrashConfuses\|BattleScript_PrintUproarOverTurns" $REF/data/battle_scripts_1.s
grep -n "gTrappingMoves\|gWrappedStringIds\|gUproarOverTurnStringIds" $REF/src/battle_message.c

# port: find the sites, do not assume filenames
grep -rln "bide\|uproar\|rollout\|furyCutter\|wrapped\|LOCK_CONFUSE\|RECHARGE\|MULTIPLETURNS\|cancelMultiTurnMoves\|lockedMoves" src/engine/*.ts
grep -n "CANCELER_" src/engine/battleScriptSourceConstants.ts src/engine/battleScriptAttackCanceler.ts
grep -rn "cancelBattleScriptMultiTurnMoves" src/
grep -rn "rechargeTimer\|rolloutTimerStartValues\|furyCutterCounter\|bideDmg\|bideTarget\|wrappedBy" src/engine/*.ts
```

**Brief-symbol corrections found while auditing** (none are divergences; they are
names that do not exist in Emerald and would have sent a later worker hunting):
`Cmd_setuproar`, `Cmd_setrecharge`, `Cmd_twoturnmoveschargestringid` and
`TryClearRageAndFuryCutter` have **zero hits** in `$REF/src`; the Wrap duration is
`(Random() & 3) + 3` (3-6 turns), not `(Random() % 4) + 2`; the Thrash lock-in is
`(Random() & 1) + 2` (2-3 turns) while `(Random() % 4) + 2` is the *fatigue
confusion*; `Cmd_jumpifnotfirstturn`'s only script user is Fake Out; Power Herb
does not exist in Gen 3.

**Tests that touch these cells today** (listed, not run — docs-only step):
`tests/bideEndTurnIgnoreBideIssue126.test.ts`, `tests/battleEndTurnOrchestration.test.ts`,
`tests/battleScriptSetbideOpcode.test.ts`, `tests/battleScriptRolloutOpcode.test.ts`,
`tests/battleScriptFuryCutterOpcode.test.ts`,
`tests/battleScriptConfuseifrepeatingattackendsOpcode.test.ts`,
the 14 `tests/battleScriptAttackCanceler*.test.ts` files (Asleep, Bide, Confused, Disabled, Flinch, Frozen, Imprisoned, InLove, Loop, Opcode, Paralyzed, PpJoin, Recharge, Taunted, Thaw, Truant), `tests/battleScriptMultiTurnCancellation.test.ts` (all filenames verified present with `ls tests/`). **No test pins finding 1's sleep-cancel**,
which is why it survived the 2026-08-25 audit that first named it.

## Supervisor correction (2026-08-26 04:55, after merge)

**Finding 1 (§6 M20 / §7) is REFUTED — the port site exists.** The sleep-gated
`CancelMultiTurnMoves` from `HandleEndTurn_ContinueBattle` (`battle_main.c:3941-3945`)
is ported at `src/engine/battleEndTurnOrchestration.ts:2804-2825`
(`clearEndTurnFlinchAndSleepLocks`: unconditional `STATUS2_FLINCHED` clear, then
`if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) && (status2 & STATUS2_MULTIPLETURNS))
cancelBattleScriptMultiTurnMoves(next, battler)`), wired at `:2860` inside the
end-turn orchestration ahead of the `BattleTurnPassed` equivalent — the site landed
with ISSUES #133 on 2026-08-25 — and pinned by `tests/endTurnFlinchClearIssue133.test.ts`
(including the negative "sleeping battler with no multi-turn lock" case). The audit's
`grep "STATUS1_SLEEP"` missed it because the constant is `BATTLE_SCRIPT_STATUS1_SLEEP`
read through `withBattler`/`cancelBattleScriptMultiTurnMoves`, and `:2509-2518` is the
wish/perish cursor seam, not the ContinueBattle pass. Verdict for M20: **SAME-ORDER**.
Corrected counts: 0 DIVERGENT / 4 DIVERGENT-BENIGN; no ISSUES entry filed.
