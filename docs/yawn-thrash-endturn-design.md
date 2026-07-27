# Yawn / Thrash-family / `ENDTURN_ITEMS2` rung ladder

Side-lane design scout for the prerequisite chain that unblocks
`ENDTURN_ITEMS2` (`docs/endturn-abilities-items-ground-truth.md` §5 slice 4's
closing note, quoted exactly): *"Land `ENDTURN_ITEMS2` ... only after
whichever of Yawn/Thrash's own end-turn cases the orchestration already
models -- its own real trigger condition (a status/confusion bit freshly set
by one of THOSE two cases earlier in the SAME battler's tick pass) is
unreachable before then, so registering ITEMS2 earlier would be correct but
permanently unexercised."* This doc enumerates that chain precisely enough
that each rung is one bounded main-lane brief, per `docs/end3-design.md`'s
precedent (format, depth, citation density). **No `src/` edits, no
`PROGRESS.md`/`ISSUES.md` edits, no oracle staging** -- every claim below is
either a static source/engine-code citation or is marked `UNVERIFIED` with
its own resolving action named as the rung's first step.

**Headline correction to the brief's own premise, stated up front (source-
verified, not assumed):** the brief frames `ENDTURN_ITEMS2` as blocked on
*both* Yawn's and Thrash's end-turn cases. Reading both cases side by side
(§2, §4 below) shows **Yawn alone is sufficient** -- `ENDTURN_YAWN` is a
strictly cheaper, `END3`-free rung than `ENDTURN_THRASH`, and a Yawn-only
battle-lab fixture reaches every precondition `ENDTURN_ITEMS2`'s own
`moveTurn`-ungated cure branches need (a freshly-set `status1` bit from the
SAME battler's tick pass). Thrash-family is a real, independent, valuable
rung (it exercises the *confusion* half of `ItemBattleEffects`'s "no gate"
list, and completes the `ENDTURN_THRASH` case-barrier the orchestration
already half-built), but it is not on `ENDTURN_ITEMS2`'s own critical path.
The ladder below orders Yawn first for exactly this reason.

## 0. Registered opcode baseline (grepped live, this session)

```
grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u
```
95 entries (unchanged from `docs/endturn-abilities-items-ground-truth.md`
§0's own count plus the since-landed `REMOVEITEM`, i.e. 96 total as of this
session -- re-grepped fresh, not reused). Relevant confirmations, spot-
checked individually because the brief's own framing implied more gaps than
source shows:

| Opcode | Registered? | Where |
| --- | --- | --- |
| `JUMPIFABILITY` | **yes** | `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:170-230` (`createJumpifabilityHandler`) |
| `JUMPIFCANTMAKEASLEEP` | **yes, fully** | `src/engine/battleScriptStatusPrimaryOpcode.ts:200-264` (`createJumpifcantmakeasleepOpcodeHandler`) -- already models Insomnia/Vital Spirit/`UproarWakeUpCheck` exactly, built for the primary sleep-move cluster (Sing/Sleep Powder/Spore) |
| `JUMPIFSTATUS2`, `JUMPIFSIDEAFFECTING`, `ACCURACYCHECK`, `ATTACKCANCELER`, `ATTACKSTRING`, `PPREDUCE`, `ATTACKANIMATION`, `WAITANIMATION`, `GOTO`, `PRINTSTRING`, `WAITMESSAGE` | **yes** | shared script plumbing, used by dozens of already-ported scripts |
| `SETYAWN` | **no** | zero hits -- the one real new opcode `BattleScript_EffectYawn` needs |
| `STATUSANIMATION`, `UPDATESTATUSICON`, `WAITSTATE`, `MAKEVISIBLE` | **yes** | needed by `BattleScript_YawnMakesAsleep` (§2) |
| `CHOSENSTATUSANIMATION` | **yes** | `chosenstatus2animation` (used by `BattleScript_ThrashConfuses`, §4) is a pure assembler macro expanding to `chosenstatusanimation \battler, 0x1, \status` (`reference/pokeemerald/asm/macros/battle_script.inc:1373-1380`) -- same opcode, no new dispatch needed |
| `CONFUSEIFREPEATINGATTACKENDS` | **no** | zero hits -- the one real new opcode `BattleScript_EffectRampage` needs (§3) |
| `REMOVEITEM` | **yes** | landed by `endturn-abilities-items-ground-truth.md` §6's own registration |

**`Cmd_setmoveeffect`/`SetMoveEffect` and `CancelMultiTurnMoves` are plain C
helper functions, not script opcodes** (`grep -n "B_SCR_OP_SETMOVEEFFECT\|B_SCR_OP_CANCELMULTITURNMOVES"
reference/pokeemerald/src/battle_script_commands.c` returns nothing) -- they
are called directly from `DoBattlerEndTurnEffects`'s C switch body, the same
category as `AbilityBattleEffects`/`ItemBattleEffects` themselves. Nothing
about them requires new opcode-table entries; they need pure-TS ports of
their own C logic, mirroring how `runAbilitiesTick`/`runItemsTick` already
port `AbilityBattleEffects`/`ItemBattleEffects`.

## 1. `EFFECT_YAWN` move-execution script, full enumeration

```
BattleScript_EffectYawn::                                    (battle_scripts_1.s:2451-2466)
    attackcanceler                                            [registered]
    attackstring                                              [registered]
    ppreduce                                                  [registered]
    jumpifability BS_TARGET, ABILITY_VITAL_SPIRIT, BattleScript_PrintBankAbilityMadeIneffective   [opcode registered; ability id NOT in the widened set]
    jumpifability BS_TARGET, ABILITY_INSOMNIA, BattleScript_PrintBankAbilityMadeIneffective        [opcode registered; ability id NOT in the widened set]
    jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed   [registered]
    jumpifsideaffecting BS_TARGET, SIDE_STATUS_SAFEGUARD, BattleScript_SafeguardProtected  [registered]
    accuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON      [registered]
    jumpifcantmakeasleep BattleScript_ButItFailed              [registered, full parity]
    setyawn BattleScript_ButItFailed                           [**NOT registered**]
    attackanimation                                            [registered]
    waitanimation                                              [registered]
    printstring STRINGID_PKMNWASMADEDROWSY                     [registered]
    waitmessage B_WAIT_TIME_LONG                                [registered]
    goto BattleScript_MoveEnd                                  [registered]
```

**Exactly one opcode gap, exactly one data-set gap.** No control-flow work,
no `END3`, no new rules-context shape beyond what `jumpifcantmakeasleep`
already threads.

### 1a. `Cmd_setyawn` (`battle_script_commands.c:9352-9364`)

```c
static void Cmd_setyawn(void)
{
    if (gStatuses3[gBattlerTarget] & STATUS3_YAWN
        || gBattleMons[gBattlerTarget].status1 & STATUS1_ANY)
    {
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);   // jump to fail label
    }
    else
    {
        gStatuses3[gBattlerTarget] |= STATUS3_YAWN_TURN(2);
        gBattlescriptCurrInstr += 5;                                        // advance
    }
}
```
Trivial: a 2-bit turn-counter write (`STATUS3_YAWN = (1<<11 | 1<<12)`,
`STATUS3_YAWN_TURN(num) = ((num) << 11) & STATUS3_YAWN`,
`reference/pokeemerald/include/constants/battle.h:168-169`) gated on "not
already yawning" and "no existing status1". `status3` already exists as a
tracked battler field (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:59-67`
writes/reads `BATTLE_SCRIPT_STATUS3_ROOTED` on it; `battleScriptHitChainOpcode.ts:738`
reads `BATTLE_SCRIPT_STATUS3_ALWAYS_HITS` the same way) -- `STATUS3_YAWN`
is a new mask constant alongside `BATTLE_SCRIPT_STATUS3_ROOTED`/
`BATTLE_SCRIPT_STATUS3_ALWAYS_HITS` (`src/engine/battleScriptSourceConstants.ts:67,71`),
not a new field. New file `battleScriptSetyawnOpcodeOpcode.ts`, same shape as
`battleScriptRemoveitemOpcode.ts` (a two-branch jump handler reading/writing
one battler field).

### 1b. Widening `JUMPIFABILITY_VALUES` (`battleScriptIngrainLeechSeedWrapOpcode.ts:170-175`)

Current set (exhaustive, re-read this session): `ABILITY_LIQUID_OOZE`,
`ABILITY_LIMBER`, `ABILITY_IMMUNITY`, `ABILITY_OWN_TEMPO` -- four ids, each
added for a specific prior slice (Leech Seed, the primary-status cluster).
Adding `ABILITY_VITAL_SPIRIT`/`ABILITY_INSOMNIA` is a two-entry `Map` literal
extension, mechanically identical to the existing four (same handler,
`createJumpifabilityHandler`, `battleScriptIngrainLeechSeedWrapOpcode.ts:192-222`,
needs no logic change -- only the value table grows). The module's own JSDoc
(`:184-190`) enumerates "the four concrete ability ids this widening covers"
and must be updated to six.

**Factory-L50 reachability of both abilities, checked not assumed** (cross-
referencing `src/data/gen/battle-frontier-mons.json`'s 882-entry catalog
against `reference/pokeemerald/src/data/pokemon/species_info.h`):

| Ability | Reachable? | Carriers |
| --- | --- | --- |
| `ABILITY_VITAL_SPIRIT` | **yes** | MANKEY/PRIMEAPE, DELIBIRD, VIGOROTH |
| `ABILITY_INSOMNIA` | **yes** | DROWZEE/HYPNO, HOOTHOOT/NOCTOWL, SPINARAK/ARIADOS, MURKROW, SHUPPET, BANETTE |

Both are (a)-barrier fixes (real, reachable, worth landing), not (b)-barrier
material -- directly answering the brief's own question.

### 1c. Move reachability

`MOVE_YAWN`: 14 unique Factory L50 carrier species (`src/data/gen/battle-frontier-mons.json`,
counted live), including GULPIN, QUAGSIRE, SLAKING, SLAKOTH, SLOWBRO,
SLOWKING, SLOWPOKE, SLUGMA and others. Real, common, not edge-case-only.

## 2. `ENDTURN_YAWN` end-turn case (`battle_util.c:1753-1771`)

```c
case ENDTURN_YAWN:  // yawn
    if (gStatuses3[gActiveBattler] & STATUS3_YAWN)
    {
        gStatuses3[gActiveBattler] -= STATUS3_YAWN_TURN(1);
        if (!(gStatuses3[gActiveBattler] & STATUS3_YAWN) && !(gBattleMons[gActiveBattler].status1 & STATUS1_ANY)
         && gBattleMons[gActiveBattler].ability != ABILITY_VITAL_SPIRIT
         && gBattleMons[gActiveBattler].ability != ABILITY_INSOMNIA && !UproarWakeUpCheck(gActiveBattler))
        {
            CancelMultiTurnMoves(gActiveBattler);
            gBattleMons[gActiveBattler].status1 |= STATUS1_SLEEP_TURN((Random() & 3) + 2); // 2-5 turns of sleep
            BtlController_EmitSetMonData(...);
            MarkBattlerForControllerExec(gActiveBattler);
            gEffectBattler = gActiveBattler;
            BattleScriptExecute(BattleScript_YawnMakesAsleep);
            effect++;
        }
    }
    gBattleStruct->turnEffectsTracker++;
    break;
```

**`BattleScriptExecute`, not `BattleScriptPushCursorAndCallback` -- no
`END3` dependency at all.** `BattleScript_YawnMakesAsleep`
(`battle_scripts_1.s:3878-3885`) ends in plain `end2`:
```
BattleScript_YawnMakesAsleep::
    statusanimation BS_EFFECT_BATTLER    [registered]
    printstring STRINGID_PKMNFELLASLEEP  [registered]
    waitmessage B_WAIT_TIME_LONG          [registered]
    updatestatusicon BS_EFFECT_BATTLER   [registered]
    waitstate                             [registered]
    makevisible BS_EFFECT_BATTLER         [registered]
    end2
```
Every opcode registered (§0) -- this is the exact `BattleScriptExecute`+
`end2` shape `runTickScript`/`runStatus1CureTick` already host (precedent:
`src/engine/battleEndTurnOrchestration.ts:709-726`). **No `END3` engine work
is a prerequisite for Yawn at all** -- this directly narrows the brief's own
"blocked on... two `Cmd_jumpifability` barriers" framing to the move-
execution side (§1) only; the end-turn side is opcode-complete today.

**Sub-conditions, resolved against what this engine already tracks/scopes
out:**
- `!(status1 & STATUS1_ANY)`: real, already-tracked field, trivial AND.
- `ability != VITAL_SPIRIT/INSOMNIA`: same two ability ids §1b widens
  `JUMPIFABILITY_VALUES` with -- reused here as a plain equality check, no
  opcode involved (this is a C-side `if`, not a script instruction).
- `!UproarWakeUpCheck(gActiveBattler)`: `UproarWakeUpCheck`
  (`battle_script_commands.c:6801-6826`) loops every battler looking for one
  with `STATUS2_UPROAR` set. **This engine never sets `STATUS2_UPROAR`
  anywhere** (`ENDTURN_UPROAR` is `battleEndTurnOrchestration.ts:976`'s own
  documented permanently-inert no-op, doc B11) -- so in this engine's entire
  reachable state space, `UproarWakeUpCheck` always returns `FALSE` and the
  `!...` term is always `TRUE`. **Provably omittable, not modeled as a call**
  -- cite this exact reasoning in the landing commit rather than porting a
  function that can never observe a `TRUE` input in this engine's scope.
- `CancelMultiTurnMoves` (`battle_util.c:877-888`): clears
  `STATUS2_MULTIPLETURNS|LOCK_CONFUSE|UPROAR|BIDE` and
  `STATUS3_SEMI_INVULNERABLE`, zeroes `rolloutTimer`/`furyCutterCounter`.
  For the Yawn path specifically, only the "does this battler have any of
  those bits set" question matters, and since Yawn's own gate already
  requires `status1 == 0` and none of this engine's modeled mechanics can
  set `STATUS2_MULTIPLETURNS`/`LOCK_CONFUSE` without also going through
  Rampage (§3, an independent rung), a straightforward call to the SAME
  pure-C `cancelMultiTurnMoves`-shaped helper this doc's §4 also needs is
  the correct port -- not a Yawn-specific hack. Worth landing once, shared
  by both rungs (see §5's consumer-change map).
- `STATUS1_SLEEP_TURN((Random() & 3) + 2)`: one new `Random()` draw --
  matches the parent ground-truth doc's own "only `Random()` in end-turn"
  flag (already anticipated, not a surprise).

**Reducer shape needed in `battleEndTurnOrchestration.ts`:** a
`runYawnTick` function, same signature/pattern as `runWrapTick`/
`runAbilitiesTick`, replacing the `:991` no-op comment. Decrement
`status3`'s `STATUS3_YAWN` field (new `BATTLE_SCRIPT_STATUS3_YAWN` mask +
`STATUS3_YAWN_TURN`-equivalent helper in `battleScriptSourceConstants.ts`),
branch on the AND-chain above, on success write `status1` and call
`runTickScript(..., YAWN_MAKES_ASLEEP_LABEL)`.

## 3. `EFFECT_RAMPAGE` / Thrash-family move-execution (lock-in start)

```
BattleScript_EffectRampage::                          (battle_scripts_1.s:583-590)
    attackcanceler                                      [registered]
    accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE   [registered]
    attackstring                                        [registered]
    jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_EffectRampage2   [registered]
    ppreduce                                            [registered]
BattleScript_EffectRampage2:
    confuseifrepeatingattackends                        [**NOT registered**]
    goto BattleScript_HitFromCritCalc                    [registered -- shared hit-chain entry every damaging move reuses]
```

**One new opcode, `CONFUSEIFREPEATINGATTACKENDS`** (`Cmd_confuseifrepeatingattackends`,
`battle_script_commands.c:7131-7136`):
```c
static void Cmd_confuseifrepeatingattackends(void)
{
    if (!(gBattleMons[gBattlerAttacker].status2 & STATUS2_LOCK_CONFUSE))
        gBattleCommunication[MOVE_EFFECT_BYTE] = (MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER);
    gBattlescriptCurrInstr++;
}
```
Purely stages a scratch byte (`gBattleCommunication[MOVE_EFFECT_BYTE]`,
already-modeled scratch state per `applyConfusionMoveEffect`'s own precedent,
`battleScriptHitChainOpcode.ts:2498-2528`) when not already locked in, then
unconditionally advances -- no jump target, no new control flow. This byte
is read later by the SAME shared `applySetMoveEffect` dispatcher every other
damaging move's post-hit effect application already goes through (reached
via `BattleScript_HitFromCritCalc`'s own downstream `seteffectwithchance`,
already registered and exercised by dozens of ported moves).

**`applySetMoveEffect` needs one new case, `MOVE_EFFECT_THRASH` (value 53,
`reference/pokeemerald/include/constants/battle.h:300`), currently absent
from `SET_MOVE_EFFECT_SUPPORTED_BYTES`** (`battleScriptHitChainOpcode.ts:422-434`
-- verified by direct read, not present). Source case
(`battle_script_commands.c:2851-2860`):
```c
case MOVE_EFFECT_THRASH:
    if (gBattleMons[gEffectBattler].status2 & STATUS2_LOCK_CONFUSE)
    {
        gBattlescriptCurrInstr++;                        // dead branch: the shared early-out (:2523-2524)
                                                            // already excludes this case whenever LOCK_CONFUSE is
                                                            // set, so this inner `if` can never observe TRUE here
    }
    else
    {
        gBattleMons[gEffectBattler].status2 |= STATUS2_MULTIPLETURNS;
        gLockedMoves[gEffectBattler] = gCurrentMove;
        gBattleMons[gEffectBattler].status2 |= STATUS2_LOCK_CONFUSE_TURN((Random() & 1) + 2); // 2-3 turns
    }
    break;
```
Unlike `MOVE_EFFECT_CONFUSION` (`applyConfusionMoveEffect`'s existing
precedent), **this case never pushes/jumps to a script** -- pure state
write, `"advance"` transition only. `STATUS2_MULTIPLETURNS`/
`STATUS2_LOCK_CONFUSE` masks already exist in
`battleScriptSourceConstants.ts:27-28` (read-only consumers already exist in
`battleScriptAbilityMovesBlock.ts`, `battleScriptActionAdmission.ts`,
`battleScriptMultiTurnCancellation.ts`, `battleScriptAttackCancelerOpcode.ts`
-- confirmed live-grepped, none of them currently *set* either mask, only
read/clear it, so this rung is the actual origin point). One new
`Random() & 1) + 2` draw (2-3 turn duration).

**`gLockedMoves[battler] = gCurrentMove` -- `UNVERIFIED`, flagged as this
rung's own first action.** Source reads it back exactly once, at
`battle_util.c:109` (`gCurrentMove = gChosenMove = gLockedMoves[gBattlerAttacker]`,
inside the move-selection function gated on
`status2 & (STATUS2_MULTIPLETURNS|STATUS2_RECHARGE)`) -- a **move-selection**
concern, not an end-turn concern. `STATUS2_MULTIPLETURNS` is already read
extensively in `battleScriptActionAdmission.ts` (turn-admission/obedience
module, 6+ live references per this session's grep) -- **first action of
this rung: read that module to determine whether forced-repeat-move
selection is already modeled there (in which case `gLockedMoves` is a
one-field wire-up) or entirely absent (in which case it's this rung's own
second deliverable).** Do not guess; the module's own existing
`STATUS2_MULTIPLETURNS` references make either answer plausible.

**Factory L50 reachability** (species counted live against
`src/data/gen/battle-frontier-mons.json`):

| Move | Carriers | Count |
| --- | --- | --- |
| `MOVE_THRASH` | LARVITAR, TAUROS | 2 |
| `MOVE_OUTRAGE` | DRATINI, DRAGONITE | 2 |
| `MOVE_PETAL_DANCE` | IVYSAUR, GLOOM, VILEPLUME, BELLOSSOM, SUNFLORA | 5 |

All three Thrash-family moves share this exact script/opcode surface (`EFFECT_RAMPAGE`
is their common dispatch entry, confirmed via `battle_scripts_1.s:48`'s move-effect
table) -- registering the opcode once unblocks all three, 9 unique carrier species total.

## 4. `ENDTURN_THRASH` end-turn case (`battle_util.c:1674-1695`)

The orchestration **already has the detection half wired as a case-barrier**
(`battleEndTurnOrchestration.ts:978-981`):
```ts
const b2 = state.rulesContext.battlers[battler];
if ((b2.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE) !== 0) {
  return Object.freeze({ kind: "case-barrier", state, caseName: "ENDTURN_THRASH", detail: "STATUS2_LOCK_CONFUSE set but BattleScript_ThrashConfuses is not wired" });
}
```
This means: today, the moment §3 lands and any battler's `STATUS2_LOCK_CONFUSE`
bit is ever set, the very NEXT end-turn pass hits this barrier immediately
(loud failure, per the executable-frontier ratchet's own intent) rather than
silently mis-simulating -- §3 and §4 are safely independent to land in
either order landing-wise, but §3 alone makes this barrier live for the
first time (worth calling out to whoever lands §3: expect
`tests/executableFrontierRatchet.test.ts`'s barrier-count pin to need a
deliberate bump, or land §4 in the same step to avoid ever hitting it in a
committed state).

```c
case ENDTURN_THRASH:  // thrash
    if (gBattleMons[gActiveBattler].status2 & STATUS2_LOCK_CONFUSE)
    {
        gBattleMons[gActiveBattler].status2 -= STATUS2_LOCK_CONFUSE_TURN(1);
        if (WasUnableToUseMove(gActiveBattler))
            CancelMultiTurnMoves(gActiveBattler);
        else if (!(gBattleMons[gActiveBattler].status2 & STATUS2_LOCK_CONFUSE)
         && (gBattleMons[gActiveBattler].status2 & STATUS2_MULTIPLETURNS))
        {
            gBattleMons[gActiveBattler].status2 &= ~STATUS2_MULTIPLETURNS;
            if (!(gBattleMons[gActiveBattler].status2 & STATUS2_CONFUSION))
            {
                gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_CONFUSION | MOVE_EFFECT_AFFECTS_USER;
                SetMoveEffect(TRUE, 0);
                if (gBattleMons[gActiveBattler].status2 & STATUS2_CONFUSION)
                    BattleScriptExecute(BattleScript_ThrashConfuses);
                effect++;
            }
        }
    }
    gBattleStruct->turnEffectsTracker++;
    break;
```

**Load-bearing finding, only visible by tracing `SetMoveEffect`'s confusion
branch AND this call site together (not either alone):** `SetMoveEffect`'s
own `MOVE_EFFECT_CONFUSION` case (`battle_script_commands.c:2533-2546`)
writes `status2 |= STATUS2_CONFUSION_TURN(...)` and does
`gBattlescriptCurrInstr = sMoveEffectBS_Ptrs[CONFUSION]` (i.e.
`BattleScript_MoveEffectConfusion`, `battle_scripts_1.s:3932-3936`) -- **but
that script-cursor write is immediately overwritten** by this call site's
own very next line, `BattleScriptExecute(BattleScript_ThrashConfuses)`,
which unconditionally reassigns `gBattlescriptCurrInstr = BattleScript_ThrashConfuses`
before anything ever reads the value `SetMoveEffect` just wrote. **The
script that actually plays is `BattleScript_ThrashConfuses`, never
`BattleScript_MoveEffectConfusion`** -- the same "state written but
discarded before use" shape `docs/end3-design.md` §1.4(a) already
documented for the end-turn ability path's stale script-cursor push. Only
the STATE side-effects of `SetMoveEffect`'s confusion branch are real here
(the Own-Tempo/already-confused early-out, the `(Random() % 4) + 2`
duration roll, the `status2` write) -- exactly what
`applyConfusionMoveEffect` (`battleScriptHitChainOpcode.ts:2498-2528`)
already ports. **The reducer for `ENDTURN_THRASH` should call that SAME
state-mutation logic (extracted/reused, not duplicated) and then run
`BattleScript_ThrashConfuses` via `runTickScript`, never
`BattleScript_MoveEffectConfusion`.**

`BattleScript_ThrashConfuses` (`battle_scripts_1.s:3790-3794`):
```
BattleScript_ThrashConfuses::
    chosenstatus2animation BS_ATTACKER, STATUS2_CONFUSION   [expands to CHOSENSTATUSANIMATION, registered]
    printstring STRINGID_PKMNFATIGUECONFUSION                [registered]
    waitmessage B_WAIT_TIME_LONG                              [registered]
    end2
```
Fully opcode-complete, `BattleScriptExecute`+`end2` shape -- **no `END3`
here either.** `WasUnableToUseMove` (`battle_util.c:890-902`, checks 8
`gProtectStructs` flags -- paralysis-full-immobility, flinch, etc.) is
`UNVERIFIED` against this engine's current protect-struct modeling; likely
already tracked (hit-chain flinch/paralysis are landed features) but needs a
direct grep against `battleScriptRulesContext.ts`'s battler shape as this
rung's first action, not assumed here.

## 5. `ENDTURN_ITEMS2` registration, checked against current code

`battleEndTurnOrchestration.ts:992`'s no-op comment
(`// ENDTURN_ITEMS2: pure-C item breadth, explicitly out of scope (doc
B3/B19) -- no-op.`) confirms the ground-truth doc's framing is still
accurate as of this session. **The "zero additional opcode work" claim is
TRUE** (§0: `REMOVEITEM` and every opcode `ItemBattleEffects`'s ten already-
wired cases use are registered) **but is NOT "zero additional code work" --
this is the one correction this doc makes to the predecessor's phrasing,**
same spirit as `end3-design.md` §5's corrections:

`runItemsTick` (`battleEndTurnOrchestration.ts:739-863`) has **no
`moveTurn` parameter today** -- it is called exactly once, at the
`ENDTURN_ITEMS1` call site (`:935`), always corresponding to source's
`moveTurn = FALSE`. Source's real per-case gate (`docs/endturn-abilities-
items-ground-truth.md` §1c's table, re-verified against
`battle_util.c:3244-3255,3401,3429-3442` this session):

| Branch in `runItemsTick` | Source `moveTurn` gate | Fires on ITEMS2 unmodified call? | Correct? |
| --- | --- | --- | --- |
| `HOLD_EFFECT_LEFTOVERS` (:749) | `!moveTurn` (`:3401`) | **yes -- WRONG**, would double-heal every tick with HP<max | must gate |
| `HOLD_EFFECT_RESTORE_STATS` / White Herb (:756) | none (`:3384`) | yes -- correct | no change |
| `HOLD_EFFECT_CURE_PAR/PSN/BRN/FRZ/SLP/CONFUSION/STATUS/ATTRACT` (:765-820) | none (`:3500-3594`) | yes -- correct | no change |
| `STAT_UP_BERRIES` (Liechi/Salac/Petaya, :834-849; **already landed since the ground-truth doc's §6 addendum was written** -- `runItemsTick` implements this branch directly today, not a case-barrier) | `!moveTurn` (`TRY_EAT_STAT_UP_BERRY` macro, `:3245`) | **yes -- WRONG**, would re-roll a stat raise every tick | must gate |
| `HOLD_EFFECT_RESTORE_HP`/`RESTORE_PP` case-barriers (:822-833) | `!moveTurn` (`:3337,3348`) | barriers unconditionally -- **WRONG**, would spuriously halt an ITEMS2 pass for an item that source never even checks at ITEMS2 | must gate |
| `UNREACHABLE_AT_FACTORY_L50` case-barrier (:850-861, confuse berries + 3 zero-carrier stat/crit berries) | `!moveTurn` (macros, `:3227-3255`) | same spurious-barrier risk (moot today: 0 carriers, but wrong in principle) | must gate |

**Required reducer shape:** `runItemsTick(program, handlers, state, battler,
moveTurn: boolean)`, with every row marked "must gate" above short-
circuiting to `{kind: "advance"}` when `moveTurn === true`, and the "no
change" rows (White Herb + 8 cure branches) left unconditional. `ENDTURN_ITEMS1`'s
call site (`:935`) passes `false`; a new call site after the `ENDTURN_YAWN`
case (replacing `:992`'s comment) passes `true`.

**The pass-through test, precisely:** a Chesto-Berry holder (item id 133,
already used in `mechanic-endturn-items1-cure-par-off.json`'s sibling
fixture per the ground-truth doc §6) that also carries `MOVE_YAWN` and gets
put to sleep by an opponent's Yawn. Exact tick-pass ordering
(`turnEffectsTracker`'s real enum order, `battle_util.c:1443-1461`): `INGRAIN,
ABILITIES, ITEMS1, LEECH_SEED, POISON, BAD_POISON, BURN, NIGHTMARES, CURSE,
WRAP, UPROAR, THRASH, DISABLE, ENCORE, LOCK_ON, CHARGE, TAUNT, YAWN, ITEMS2`
-- `ITEMS1` runs BEFORE `YAWN` sets `status1`, so on the exact tick the
sleep bit is freshly set, Chesto-Berry's cure is invisible to that same
tick's `ITEMS1` call (nothing to cure yet) and only fires at `ITEMS2`,
**in the same tick, before the sleep status is ever "felt."** This is
`docs/endturn-abilities-items-ground-truth.md` §1c's own worked example,
now made concretely stageable: NINJASK-style always-fires filler on the
opponent side is not needed since Yawn itself is the real trigger (2-turn
delay + `(Random()&3)+2`-turn sleep roll on landing, same live-fixture
convention as §3a/§3b's Speed-Boost/Rain-Dish tables). **Negative-test
companion, same fixture family:** a Leftovers holder with `status1`
unrelated (no cure interaction) confirms Leftovers heals exactly once per
tick pair (ITEMS1 only), not twice -- proves the `moveTurn` gate didn't
regress the already-landed slice.

**Census prediction (qualitative; exact counts need a live
`tools/report/executable-frontier-census.ts` rerun per rung, not computed
here):** each new opcode (`SETYAWN`, `CONFUSEIFREPEATINGATTACKENDS`) removes
one `unsupportedBranch` site per its own script; widening `JUMPIFABILITY_VALUES`
and `SET_MOVE_EFFECT_SUPPORTED_BYTES` converts previously-barriered branches
in scripts that ALREADY reach those dispatchers (any move already exercising
`jumpifability`/`seteffectwithchance`) from barriered to executable, weighted
by how many of the 882 catalog entries carry `MOVE_YAWN`/Thrash-family
moves (14 + 9 = 23 direct entries, undercounting shared-dispatcher effects
on other already-ported moves that also pass through the same widened
tables).

## 6. Cross-check: touched modules, named exactly

| Module | Change |
| --- | --- |
| `src/engine/battleScriptSourceConstants.ts` | add `BATTLE_SCRIPT_STATUS3_YAWN` mask + turn-shift helper (alongside `:67,71`'s existing `STATUS3_*` masks) |
| `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts` | widen `JUMPIFABILITY_VALUES` (`:170-175`) with `ABILITY_VITAL_SPIRIT`/`ABILITY_INSOMNIA`; update the module's own JSDoc (`:184-190`) |
| *(new)* `battleScriptSetyawnOpcode.ts` | `Cmd_setyawn` port, registered under `B_SCR_OP_SETYAWN` |
| *(new)* `battleScriptConfuseifrepeatingattackendsOpcode.ts` | `Cmd_confuseifrepeatingattackends` port, registered under `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` |
| `src/engine/battleScriptHitChainOpcode.ts` | widen `SET_MOVE_EFFECT_SUPPORTED_BYTES` (`:422-434`) with `MOVE_EFFECT_THRASH`; add its `applySetMoveEffect` case (state-only, no script call, contrast with `applyConfusionMoveEffect`'s call-transition shape at `:2498-2528`) |
| `src/engine/battleEndTurnOrchestration.ts` | replace `:991` no-op with `runYawnTick`; replace `:979-981`'s case-barrier body with a real `runThrashTick` (reusing §4's extracted confusion-set logic + `runTickScript(..., THRASH_CONFUSES_LABEL)`); thread `moveTurn: boolean` through `runItemsTick` (:739) per §5's table; add the `ENDTURN_ITEMS2` call site replacing `:992` |
| `src/engine/battleScriptActionAdmission.ts` | `UNVERIFIED` (§3) -- likely touched for `gLockedMoves`/forced-repeat-move selection; first action of the Thrash-family move-execution rung is to read this module and confirm |
| `tests/executableFrontierRatchet.test.ts` | barrier-count pin will move (down, as barriers convert to real handlers) -- expected and must be named explicitly in each rung's landing commit, not silently accepted |

Everything else the brief asked to check (`battleScriptStatusPrimaryOpcode.ts`'s
`jumpifcantmakeasleep`, `battleScriptSourceConstants.ts`'s existing
`STATUS2_LOCK_CONFUSE`/`MULTIPLETURNS` masks, `battleScriptHitChainOpcode.ts`'s
`applyConfusionMoveEffect`) is **read-only reuse**, not a touched module --
already fully built for other slices, confirmed by direct read this
session.

## 7. The rung ladder (the deliverable)

Ordered; **1→2→3 is the critical path to `ENDTURN_ITEMS2`. 4→5 is an
independent parallel track** (does not block 1-3-6, and 6 can equally be
satisfied by 3's own Yawn-only fixture without 4-5 ever landing).

### Rung 1 -- `SETYAWN` + widen `JUMPIFABILITY` (independent, cheapest)
- **Goal:** make `EFFECT_YAWN`'s move-execution script fully executable.
- **Opcodes/cases:** new `B_SCR_OP_SETYAWN` (`Cmd_setyawn`, §1a); widen
  `JUMPIFABILITY_VALUES` with `ABILITY_VITAL_SPIRIT`/`ABILITY_INSOMNIA` (§1b).
- **Barrier plan:** (a) real barrier, both fixes landed. No (b) material --
  both abilities have live Factory carriers (§1b's table).
- **Tier-1 test:** direct opcode unit test (yawn sets `STATUS3_YAWN` when
  clear, no-ops when already yawning or status1-nonzero) + a
  `jumpifability`-widening unit test for both new ids, same shape as the
  existing four-ability tests presumably already covering
  `battleScriptIngrainLeechSeedWrapOpcode.test.ts`.
- **Pass-through test:** a live battle-lab fixture, e.g. GULPIN (`MOVE_YAWN`)
  vs a 0-RNG filler opponent, confirming `player.status3` (or `opponent.status3`)
  gains the `STATUS3_YAWN` bits on landing, `ButItFailed` on a Vital-
  Spirit/Insomnia target, and `SafeguardProtected`/`STATUS2_SUBSTITUTE`
  interactions are unaffected (already-registered opcodes, regression-only).
- **Census prediction:** `EFFECT_YAWN`'s own barrier clears; weighted delta
  ~14 direct catalog entries (MOVE_YAWN carriers) plus any other already-
  ported script that separately exercises `jumpifability` against these two
  ability ids.
- **Frontier gate line:** before this rung, no Factory-legal battle that
  uses Yawn can resolve past the `jumpifability`/`setyawn` barrier. After,
  Yawn's move-use is fully simulatable (end-turn sleep transition still
  gated behind Rung 2).
- **Size:** small, one bounded step.

### Rung 2 -- `ENDTURN_YAWN` end-turn case (depends on Rung 1)
- **Goal:** model the yawn-counter decrement and the falls-asleep
  transition.
- **Opcodes/cases:** zero new opcodes (`BattleScript_YawnMakesAsleep` is
  opcode-complete, §2). New reducer `runYawnTick` in
  `battleEndTurnOrchestration.ts`, new `STATUS3_YAWN` mask constant.
- **Barrier plan:** (a) fully real, no (b) material. `UproarWakeUpCheck`
  omitted with a cited, provable justification (§2) rather than ported.
- **Tier-1 test:** unit test for the counter decrement (2-turn countdown,
  no transition on turn 1 of the countdown) and the sleep-transition AND-
  chain (status1 already nonzero blocks it; Vital Spirit/Insomnia blocks
  it -- reuse Rung 1's ability ids here as plain equality, not
  `jumpifability`).
- **Pass-through test:** extend Rung 1's fixture across the full 2-turn
  Yawn countdown into the sleep transition -- assert `status1`'s sleep-turn
  bits land with the exact `(Random()&3)+2` roll and `rngValue` draws
  exactly once at the transition frame, same convention as
  `mechanic-endturn-shedskin-off.json` (`endturn-abilities-items-ground-
  truth.md` §3c).
- **Census prediction:** `ENDTURN_YAWN`'s no-op comment converts to a real
  case; the case-barrier surface doesn't grow (no new barrier introduced,
  `UproarWakeUpCheck` proven omittable rather than barriered).
- **Frontier gate line:** before this rung, any battle where Yawn's counter
  would expire mid-simulation cannot proceed past `ENDTURN_YAWN`'s own
  (currently absent) barrier -- it silently no-ops today, which is itself a
  correctness gap this rung closes, not just an executability gap. After,
  the full Yawn lifecycle (move use -> countdown -> sleep) is real.
- **Size:** small, one bounded step.

### Rung 3 -- `ENDTURN_ITEMS2` registration + `moveTurn` gating (depends on Rung 2)
- **Goal:** land the second `ItemBattleEffects` call site correctly, proven
  live through a real trigger.
- **Opcodes/cases:** zero new opcodes (§5). Thread `moveTurn: boolean`
  through `runItemsTick`; gate the four "must gate" rows in §5's table; add
  the new `ENDTURN_ITEMS2` call site.
- **Barrier plan:** (a) fully real once Rung 2 lands; before Rung 2, this
  rung is the "permanently unexercised if registered early" case the brief
  itself named -- correctly sequenced after, not before.
- **Tier-1 test:** unit test proving the `moveTurn=true` gate short-circuits
  Leftovers/stat-up-berries/RESTORE_HP/RESTORE_PP-barrier/unreachable-
  barrier branches, while leaving White-Herb/8-cure branches unconditional.
- **Pass-through test (the real trigger, §5):** Chesto-Berry-holding Yawn
  target -- confirm the cure fires at the `ITEMS2` tick position, in the
  SAME end-turn pass the sleep bit was freshly set, not at `ITEMS1` and not
  on a following turn. Negative companion: Leftovers-holder regression
  fixture confirming no double-heal.
- **Census prediction:** `ENDTURN_ITEMS2`'s no-op comment converts to a real
  case; weighted delta is the intersection of Chesto/Persim/Cheri/Rawst/
  Aspear/Lum/Mental-Herb/White-Herb carriers (§2b of the ground-truth doc,
  large counts: e.g. Lum 80 entries/66 species) with battlers that can
  plausibly be put to sleep or confused within Factory L50 singles --
  qualitative only here, needs a live census rerun to pin exactly.
- **Frontier gate line:** before this rung, `ENDTURN_ITEMS2` is dead code by
  construction (never called). After, the doc's own headline claim --
  "ENDTURN_ITEMS2 is zero additional opcode work once ITEMS1 is live" -- is
  fully proven true in practice, not just analytically.
- **Size:** small-medium, one bounded step (the `moveTurn` threading touches
  ~5 branches but each is a one-line gate).

### Rung 4 -- `CONFUSEIFREPEATINGATTACKENDS` + `MOVE_EFFECT_THRASH` (independent of 1-3)
- **Goal:** make `EFFECT_RAMPAGE`'s move-execution script (Thrash/Outrage/
  Petal Dance lock-in start) fully executable.
- **Opcodes/cases:** new `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS`; widen
  `SET_MOVE_EFFECT_SUPPORTED_BYTES` with `MOVE_EFFECT_THRASH` + its
  `applySetMoveEffect` case (§3).
- **Barrier plan:** (a) real barrier for the opcode + case. `gLockedMoves`/
  forced-repeat-move selection is `UNVERIFIED` (§3) -- **this rung's own
  first action is reading `battleScriptActionAdmission.ts`'s existing
  `STATUS2_MULTIPLETURNS` references** to determine whether this is a one-
  field wire-up or a second deliverable within the same rung. If it turns
  out to be genuinely large (a full turn-selection subsystem gap), split it
  into its own Rung 4b rather than absorbing it here.
- **Tier-1 test:** opcode unit test (stages `MOVE_EFFECT_THRASH|AFFECTS_USER`
  only when not already locked) + `applySetMoveEffect` case unit test
  (sets `MULTIPLETURNS`+`LOCK_CONFUSE_TURN((Random()&1)+2)`, no script call).
- **Pass-through test:** TAUROS (`MOVE_THRASH`) vs 0-RNG filler, confirming
  `status2`'s `STATUS2_MULTIPLETURNS`/`STATUS2_LOCK_CONFUSE` bits land on
  first use with a `(Random()&1)+2` duration draw, and (if Rung 4's own
  first action finds `gLockedMoves` already wired) that turn 2's forced
  move selection re-picks Thrash without a fresh player input.
- **Census prediction:** `EFFECT_RAMPAGE`'s barrier clears; weighted delta 9
  direct catalog entries (2+2+5, §3's table).
- **Frontier gate line:** before this rung, no Factory-legal battle using
  Thrash/Outrage/Petal Dance can resolve past the lock-in opcode barrier.
  After, the lock-in START is simulatable (the END -- confusion -- is Rung 5).
- **Size:** medium (the `gLockedMoves` uncertainty is the risk; split if it
  turns out large per the first-action check above).

### Rung 5 -- `ENDTURN_THRASH` end-turn case (depends on Rung 4)
- **Goal:** wire the already-scaffolded case-barrier
  (`battleEndTurnOrchestration.ts:979-981`) into a real reducer.
- **Opcodes/cases:** zero new opcodes (`BattleScript_ThrashConfuses` is
  opcode-complete, §4). Extract/reuse `applyConfusionMoveEffect`'s state-
  mutation logic (Own-Tempo/already-confused early-out + duration roll);
  call `runTickScript(..., THRASH_CONFUSES_LABEL)`, **never**
  `BattleScript_MoveEffectConfusion` (§4's load-bearing discard finding).
  `WasUnableToUseMove` is `UNVERIFIED` -- first action of this rung.
- **Barrier plan:** (a) real, once Rung 4 lands (the case-barrier already
  fires today the instant `STATUS2_LOCK_CONFUSE` is set with nothing behind
  it -- landing Rung 4 without this rung would make that barrier newly
  live; land together or in immediate succession).
- **Tier-1 test:** unit test for the lock-timer decrement, the
  `WasUnableToUseMove`/`MULTIPLETURNS` branch structure, and the confusion-
  set state mutation (Own Tempo blocks it, already-confused blocks it).
- **Pass-through test:** extend Rung 4's TAUROS fixture across the full
  2-3 turn lock, asserting `STATUS2_CONFUSION` lands on the exact final-turn
  boundary with a `(Random()%4)+2` duration roll, `rngValue` frozen
  elsewhere -- same single-frame-transition convention as every other
  ledger in `endturn-abilities-items-ground-truth.md` §3.
- **Census prediction:** `ENDTURN_THRASH`'s case-barrier converts to a real
  case; same 9-entry weighted delta as Rung 4 (this rung makes the
  mechanism's END reachable, Rung 4 made the START reachable).
- **Frontier gate line:** before this rung, any Thrash-family lock-in that
  reaches its final turn hits a loud case-barrier (correctly, per the
  ratchet's intent) rather than mis-simulating. After, the full lock-in
  lifecycle (start -> repeat -> confusion) is real.
- **Size:** small, one bounded step.

### Rung 6 -- second `ENDTURN_ITEMS2` trigger fixture (depends on 3 AND 5; verification-only, no new code)
- **Goal:** prove `ENDTURN_ITEMS2`'s OTHER real trigger (Persim-Berry cure
  of Thrash-fresh confusion) through the same `moveTurn`-gated plumbing
  Rung 3 already built -- zero additional code, a second battle-lab fixture
  only.
- **Pass-through test:** TAUROS with a Persim Berry, locked into Thrash,
  confirm the confusion cure fires at `ITEMS2` on the exact final-lock-turn
  tick, mirroring Rung 3's Chesto/Yawn fixture structurally.
- **Size:** trivial, folds into Rung 3 or 5's own landing commit as an extra
  fixture rather than a standalone step if convenient.

## First brief (near-copy-paste for the supervisor)

*Land Rung 1: register `B_SCR_OP_SETYAWN` (`Cmd_setyawn`,
`reference/pokeemerald/src/battle_script_commands.c:9352-9364` -- a trivial
two-branch `STATUS3_YAWN` write, new file `battleScriptSetyawnOpcode.ts`
mirroring `battleScriptRemoveitemOpcode.ts`'s shape) and widen
`JUMPIFABILITY_VALUES` (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:170-175`)
with `ABILITY_VITAL_SPIRIT`/`ABILITY_INSOMNIA` (both have real Factory L50
carriers -- MANKEY/PRIMEAPE/DELIBIRD/VIGOROTH and DROWZEE/HYPNO/HOOTHOOT/
NOCTOWL/SPINARAK/ARIADOS/MURKROW/SHUPPET/BANETTE respectively). This makes
`BattleScript_EffectYawn` (`reference/pokeemerald/data/battle_scripts_1.s:2451-2466`)
fully opcode-complete -- every other instruction in it is already registered
(verified live this session). Add a `STATUS3_YAWN`/`STATUS3_YAWN_TURN` mask
pair to `src/engine/battleScriptSourceConstants.ts` alongside the existing
`STATUS3_ROOTED`/`STATUS3_ALWAYS_HITS` masks (`:67,71`) for the opcode to
write. Pin with a Tier-1 opcode unit test plus a live battle-lab fixture
(GULPIN's `MOVE_YAWN` vs a 0-RNG filler opponent) proving `status3` gains
the yawn bits on a clean landing and `ButItFailed`/ability-block paths still
resolve correctly. This is deliberately narrow and self-contained -- it does
NOT touch `battleEndTurnOrchestration.ts` at all (that's Rung 2, next); it
only makes the MOVE-USE side of Yawn simulatable. `docs/yawn-thrash-endturn-
design.md` has the full follow-on ladder (Rung 2: the end-turn sleep
transition; Rung 3: `ENDTURN_ITEMS2` itself, proven live through a Chesto-
Berry-holding Yawn target) once this lands.*

## Out of scope (per this step's brief)

No `src/` edits (this doc's own findings are analytical only). No
`docs/factory-ai-checkviability-ground-truth.md`/`docs/factory-ai-draw-
discrepancy-probe.md` edits (other lanes' own hour). No `PROGRESS.md`/
`ISSUES.md` edits. No `tools/compare/` edits. No `src/animation/**` edits.
No oracle staging -- every reachability/carrier claim above was checked
against static generated catalogs (`src/data/gen/*.json`) and source
(`reference/pokeemerald/`), not a live probe; every place a live probe would
genuinely be needed to settle a claim is marked `UNVERIFIED` with the
probe named as that rung's own first action, per this step's own time-split
instruction.
