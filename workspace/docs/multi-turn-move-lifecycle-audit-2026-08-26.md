# Multi-turn move lifecycle audit — source vs port (2026-08-26)

**Status header**

| field | value |
| --- | --- |
| Tree hash (HEAD at audit start) | `dc6653bbc9c7476d82743080435e3b63d1f94bb2` (commit `d0846750`) |
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
