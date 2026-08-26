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
