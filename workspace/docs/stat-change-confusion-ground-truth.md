# Stat-change & confusion ground truth (the two families `docs/set-move-effect-ground-truth.md` explicitly deferred)

Probe deliverable, not a registration: banks the source enumeration and live
proc ledgers for `SetMoveEffect`'s (`battle_script_commands.c:2234-2906`) two
families the prior probe scoped out of its own live staging --
`ChangeStatBuffs()` (the secondary-effect stat-stage family, rank #1 by raw
legal-set coverage at **188** for `SP_DEF_MINUS_1` alone) and
`MOVE_EFFECT_CONFUSION` (rank #8, **42** sets). Both still sit behind
`Cmd_seteffectwithchance`'s two `unsupportedBranch` barriers
(`src/engine/battleScriptHitChainOpcode.ts:1553-1610`); this probe does not
touch those barriers or any other `src/` file.

## 1. Source enumeration

### 1.1 `ChangeStatBuffs(s8 statValue, u8 statId, u8 flags, const u8 *BS_ptr)` (`battle_script_commands.c:6937-7098`)

Called from two call sites with very different `flags`/`BS_ptr` shapes -- this
matters throughout, see §1.3:

- **Secondary-effect path** (`SetMoveEffect`'s family-B switch,
  `:2644-2727`, the `*_PLUS_1`/`*_MINUS_1`/`*_PLUS_2`/`*_MINUS_2` cases):
  `ChangeStatBuffs(SET_STAT_BUFF_VALUE(n) [| STAT_BUFF_NEGATIVE], statId,
  affectsUser, 0)` -- `flags` is **only** ever `0` or `MOVE_EFFECT_AFFECTS_USER`
  (`1<<6`), `BS_ptr` is always the literal `NULL` (`0`). This is this probe's
  scope.
- **Primary-effect path** (`Cmd_statbuffchange`, `:7100-7105`, the opcode
  behind the `statbuffchange` macro): `ChangeStatBuffs(gBattleScripting.statChanger
  & 0xF0, GET_STAT_BUFF_ID(...), gBattlescriptCurrInstr[1], jumpPtr)` -- here
  `flags` is a real script-authored byte (`STAT_CHANGE_ALLOW_PTR`,
  `STAT_CHANGE_NOT_PROTECT_AFFECTED`, `MOVE_EFFECT_CERTAIN`,
  `MOVE_EFFECT_AFFECTS_USER` in combination) and `BS_ptr` is a real jump
  target read from the script bytecode. See §1.4 ("adjacent registrations").

Header (`:6939-6958`), unconditionally, before any guard:

1. `gActiveBattler = flags & MOVE_EFFECT_AFFECTS_USER ? gBattlerAttacker :
   gBattlerTarget` (self vs. target selection), then `flags &=
   ~MOVE_EFFECT_AFFECTS_USER`.
2. `certain = (flags & MOVE_EFFECT_CERTAIN) ? TRUE : FALSE`, then `flags &=
   ~MOVE_EFFECT_CERTAIN`.
3. `notProtectAffected = (flags & STAT_CHANGE_NOT_PROTECT_AFFECTED) ? TRUE :
   FALSE`, then `flags &= ~STAT_CHANGE_NOT_PROTECT_AFFECTED`.
4. `PREPARE_STAT_BUFFER(gBattleTextBuff1, statId)` -- writes a 4-byte
   placeholder buffer (`B_BUFF_PLACEHOLDER_BEGIN`, `B_BUFF_STAT`, `statId`,
   `B_BUFF_EOS`) consumed by the printed string's `{STAT_BUFFER}` token
   (`include/battle_message.h:90-96`) -- this is how the same
   `STRINGID_DEFENDERSSTATFELL` string renders "MAGNETON's Sp. Def fell!" vs.
   "...Attack fell!" for different `statId` without a separate string per stat.

**Critical consequence of point 1-3 for the secondary-effect path specifically**:
since `flags` arriving from `SetMoveEffect` is only ever `0`/`64`, after the
three `&=` clears above `flags` is **unconditionally `0`** for every
secondary-effect stat-change dispatch. That makes `certain` **always `FALSE`**
(no secondary-effect stat-down move can ever be "certain" through this path --
`MOVE_EFFECT_CERTAIN` is a family-A-only concept, cf. `SetMoveEffect`'s
`certain` *parameter*, which is a different, unrelated value used by the
status1 family) and `notProtectAffected` **always `FALSE`** (Protect **does**
gate secondary-effect stat-downs, see the guard ladder below) and, most
importantly, `flags == STAT_CHANGE_ALLOW_PTR` (`1`) is **never true** for this
path -- see §1.3 for what that silently disables.

**Guard ladder, decrease branch (`statValue <= -1`, `:6960-7061`)**, evaluated
in this exact order, each an `else if` off the previous (first match wins):

1. **Mist** (`:6962-6980`): `gSideTimers[side].mistTimer && !certain &&
   gCurrentMove != MOVE_CURSE`. `certain` is always `FALSE` on this path (see
   above), so this reduces to "side has Mist up and the move isn't Curse" --
   unconditionally true whenever Mist is active for a secondary-effect
   stat-down. `flags == STAT_CHANGE_ALLOW_PTR` is checked before doing
   anything with `BS_ptr`; since that's always false here, **no
   `BattleScriptPush`/jump happens and no "protected by mist" message
   prints** -- the function just `return STAT_CHANGE_DIDNT_WORK` (silent
   block).
2. **Protect** (`:6981-6986`): `gCurrentMove != MOVE_CURSE &&
   notProtectAffected != TRUE && JumpIfMoveAffectedByProtect(0)`.
   `notProtectAffected` is always `FALSE` here, so Protect **is** checked.
   `JumpIfMoveAffectedByProtect` itself unconditionally does
   `gBattlescriptCurrInstr = gBattlescriptCurrInstr + 7` when
   `DEFENDER_IS_PROTECTED` (via `JumpIfMoveFailed(7, 0)`,
   `battle_script_commands.c:1009-1025`) -- **this branch is very likely
   dead/unreachable for real moves in practice**: a move that got this far
   (past `SetMoveEffect`'s own dispatch, mid-`BattleScript_EffectHit`) has
   already survived `BattleScript_EffectHit`'s own top-of-script
   `jumpifaffectedbyprotect`/`accuracycheck` gate, which would have redirected
   the whole script to a "protected" ending *before* ever reaching
   `tryfaintmon`/`seteffectwithchance`. Not staged live (out of this probe's
   scope per the brief; noted for completeness, not asserted).
3. **Clear Body / White Smoke** (`:6987-7008`): ability check, `!certain`
   (always true here) `&& gCurrentMove != MOVE_CURSE`. Same
   `flags == STAT_CHANGE_ALLOW_PTR` gate as Mist -- **always false on this
   path, so no `BattleScript_AbilityNoStatLoss` jump and no ability-reveal
   message; `RecordAbilityBattle` is never called either** (it's inside the
   same dead `if`). Silent `STAT_CHANGE_DIDNT_WORK`. **Live-verified below
   (§2.3): the stat stage genuinely does not move, confirmed with a proc-grade
   RNG roll that would have succeeded against a non-immune target.**
4. **Keen Eye** (`:7009-7021`, accuracy-only) / **Hyper Cutter**
   (`:7022-7034`, attack-only): same `flags == STAT_CHANGE_ALLOW_PTR`-gated
   dead branch, same silent-block outcome, plus `certain` must be `FALSE` and
   `statId` must match the specific stat.
5. **Shield Dust** (`:7035-7038`, only when `flags == 0` -- always true here):
   silent `STAT_CHANGE_DIDNT_WORK`, no message, no ability record. (Redundant
   with `SetMoveEffect`'s own earlier Shield-Dust `INCREMENT_RESET_RETURN` for
   `MOVE_EFFECT_BYTE <= 9`, which only covers effect ids up to 9 -- the stat
   family starts at 15, so `SetMoveEffect`'s own gate does **not** cover it;
   this `ChangeStatBuffs`-internal check is the one that actually fires for
   Shield Dust vs. a stat-down secondary effect.)
6. **Else: apply the decrease** (`:7039-7060`): `statValue =
   -GET_STAT_BUFF_VALUE(statValue)` (1 or 2), builds the
   `gBattleTextBuff2` message-suffix buffer ("harshly fell"/"fell" via
   `STRINGID_STATHARSHLY`/`STRINGID_STATFELL` `B_BUFF_STRING` tokens for a
   `-2`, just "fell" for a `-1`), then sets
   `gBattleCommunication[MULTISTRING_CHOOSER]` to `B_MSG_STAT_WONT_DECREASE`
   if the stat is *already* at `MIN_STAT_STAGE` (`0`), else to
   `(gBattlerTarget == gActiveBattler)` (`0`=`B_MSG_ATTACKER_STAT_FELL`,
   `1`=`B_MSG_DEFENDER_STAT_FELL` -- reused as an array index into
   `gStatDownStringIds[]`, `battle_message.c:1016-1022`).

**Increase branch** (`:7062-7083`) is structurally symmetric, no ability/Mist
guards at all (nothing blocks a stat *increase*): builds the "rose"/"sharply
rose" message suffix, sets `MULTISTRING_CHOOSER` to `B_MSG_STAT_WONT_INCREASE`
if already at `MAX_STAT_STAGE` (`12`) else `B_MSG_ATTACKER_STAT_ROSE`/
`B_MSG_DEFENDER_STAT_ROSE`.

**Clamp + return** (`:7085-7097`, shared by both branches): `statStages[statId]
+= statValue`, then clamp to `[MIN_STAT_STAGE(0), MAX_STAT_STAGE(12)]`. If the
result is `B_MSG_STAT_WONT_INCREASE` **and** `flags & STAT_CHANGE_ALLOW_PTR`:
set `MOVE_RESULT_MISSED` (only relevant to the primary-effect path, since
`flags` is `0` here). If `B_MSG_STAT_WONT_INCREASE` **and not**
`STAT_CHANGE_ALLOW_PTR` (i.e. always, on the secondary-effect path, for the
already-maxed increase case): `return STAT_CHANGE_DIDNT_WORK`. Otherwise
`return STAT_CHANGE_WORKED`.

**Note the already-at-`MIN_STAT_STAGE` decrease case does *not* early-return
`DIDNT_WORK`** -- it still writes `statStages[statId] += statValue` (a no-op
clamp back to `0`) and falls through to `return STAT_CHANGE_WORKED` at the
bottom (the `B_MSG_STAT_WONT_INCREASE`-only early-return doesn't apply to the
decrease branch's `B_MSG_STAT_WONT_DECREASE`). This is asymmetric with the
increase branch and means: **a stat already at `-6` still counts as "worked"**
for the secondary-effect dispatch below, and still runs the `BattleScript_StatDown`
sub-script (which prints "won't go any lower!" via `gBattleCommunication[MULTISTRING_CHOOSER]
== B_MSG_STAT_WONT_DECREASE`, a real, live message, unlike the silent
ability/Mist blocks above). Not staged live this pass (would need an extra
setup turn to pre-lower the target to `-6`; flagged as a cheap follow-up, not
attempted here to stay inside the time-box).

**Random() calls: zero.** Confirmed by a full read of all 162 lines
(`:6937-7098`) -- no `Random()` call appears anywhere in the function body,
in either branch, in any guard. Live-confirmed indirectly in §2 (roll-count
accounting never attributes an extra draw to `ChangeStatBuffs` itself).

**What it writes:** exactly one byte, `gBattleMons[gActiveBattler].statStages[statId]`
(`include/battle.h`, offset `+0x18 + statId` in the `BattleMon` struct, `statId`
`0`=HP(unused)/`1`=ATK/`2`=DEF/`3`=SPEED/`4`=SPATK/`5`=SPDEF/`6`=ACC/`7`=EVASION,
`include/constants/pokemon.h:75-87`, `NUM_BATTLE_STATS=8`) -- a **battler-local**
struct (`gBattleMons`, indexed by battler slot, reset every battle), not
anything in the persistent boxed Pokémon (`gPlayerParty`/`gEnemyParty`). See
§2.4 for the structural (not just empirical) confirmation that the party
record has no field for this at all.

### 1.2 `SetMoveEffect`'s stat-family dispatch (`:2644-2727`, all 12 cases)

Two blocks, `PLUS_1`(`:2644-2664`)/`MINUS_1`(`:2665-2685`) and
`PLUS_2`(`:2686-2706`)/`MINUS_2`(`:2707-2727`), each 7 cases wide (one per
`ATK`/`DEF`/`SPD`/`SP_ATK`/`SP_DEF`/`ACC`/`EVS`), identical shape:

```c
if (ChangeStatBuffs(SET_STAT_BUFF_VALUE(1) | STAT_BUFF_NEGATIVE,
                    gBattleCommunication[MOVE_EFFECT_BYTE] - MOVE_EFFECT_ATK_MINUS_1 + 1,
                    affectsUser, 0))
{
    gBattlescriptCurrInstr++;                     // truthy return (DIDNT_WORK=1) -> silent skip, NO message
}
else
{
    gBattleScripting.animArg1 = gBattleCommunication[MOVE_EFFECT_BYTE] & ~(MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN);
    gBattleScripting.animArg2 = 0;
    BattleScriptPush(gBattlescriptCurrInstr + 1);
    gBattlescriptCurrInstr = BattleScript_StatDown;  // falsy return (WORKED=0) -> push+jump, DOES print a message
}
```

**This is the inverse of what the C names suggest at a glance**:
`STAT_CHANGE_WORKED` is `0` (falsy in C) and `STAT_CHANGE_DIDNT_WORK` is `1`
(truthy) (`battle_script_commands.c:6934-6935`), so the `if (ChangeStatBuffs(...))`
branch -- taken on a **failed** stat change -- is the **silent** one (just
`gBattlescriptCurrInstr++`, no `BattleScriptPush`, no sub-script, no message
at all, not even "but it failed!"), while the `else` branch -- taken on
**success** -- is the one that pushes a return address and jumps into
`BattleScript_StatDown`/`BattleScript_StatUp` to print "fell"/"rose" (or
"won't go any lower/higher!", from the already-clamped case). Every one of the
5 silent-block guards in §1.1 (Mist/Protect(likely dead)/Clear
Body/White Smoke/Keen Eye/Hyper Cutter/Shield Dust) therefore produces **zero
on-screen feedback** for a secondary-effect stat-down -- confirmed live in
§2.3.

`ChangeStatBuffs` is **not** dispatched through `sMoveEffectBS_Ptrs[]`
(`:627-668`, the sub-script pointer table every other family-B member uses) --
its 12 table entries all alias the unused `BattleScript_MoveEffectSleep`
placeholder (dead data, never read for these ids since the stat cases handle
their own script jump directly via the `if`/`else` above, bypassing the
table entirely).

`sStatusFlagsForMoveEffects[gBattleCommunication[MOVE_EFFECT_BYTE]]` (the
early-out "already has this status2 bit" check at `:2524`, shared by all
family-B cases) has **no entry** for any of the 12 stat ids (only
CONFUSION/FLINCH/UPROAR/CHARGING/WRAP/RECHARGE/PREVENT_ESCAPE/NIGHTMARE are
populated, per the prior probe's own finding) -- so the stat family never hits
that early-out at all; it always reaches the `switch` case body.

`MOVE_EFFECT_ALL_STATS_UP` (`34`, `AFFECTS_USER`) is its own, 13th, sibling
case (`:2839`-ish, table row #9 in the prior probe, `BattleScript_AllStatsUp`)
-- **not** part of `ChangeStatBuffs` at all; it hard-codes `+1` to all 6 combat
stats via a dedicated inline loop, a genuinely separate mechanism. Out of this
probe's scope (per the brief, deferred alongside `TRI_ATTACK`/`KNOCK_OFF`).

### 1.3 `MOVE_EFFECT_BYTE` values covered, ranked (join vs.
`src/data/gen/battle-script-topology.json`)

| `MOVE_EFFECT_*` | id | `EFFECT_*` (top carrier) | `frontierMonCount` | Direction |
| --- | -: | --- | -: | --- |
| `SP_DEF_MINUS_1` | 21 | `EFFECT_SPECIAL_DEFENSE_DOWN_HIT` | **188** (Psychic 77, Shadow Ball 75, Crunch 34, Luster Purge 2) | target, -1 |
| `SPD_MINUS_1` | 17 | `EFFECT_SPEED_DOWN_HIT` | 48 | target, -1 |
| `DEF_MINUS_1` | 16 | `EFFECT_DEFENSE_DOWN_HIT` | 32 | target, -1 |
| `ATK_MINUS_1` | 15 | `EFFECT_ATTACK_DOWN_HIT` | 3 | target, -1 |
| `ACC_MINUS_1` | 20 | (`EFFECT_ACCURACY_DOWN_HIT`, Mud-Slap, 100% primary-adjacent chance) | not in the family-B secondary-effect topology join (Mud-Slap's 100% "secondary" is still routed through `Cmd_seteffectwithchance`, same as any other chance, just with `secondaryEffectChance=100`) | target, -1 |

(Full 12-member id list confirmed by reading `include/constants/battle.h`
`MOVE_EFFECT_ATK_PLUS_1`..`MOVE_EFFECT_EVS_MINUS_2`, ids `15`-`28` for the
`±1` pairs interleaved with 6 more non-stat ids, `39`-`52` unused by this
build's actual move data per the topology join -- Emerald's move set only
exercises the `±1` tier live, confirmed by grep: no move in `battle_moves.h`
uses a `MOVE_EFFECT_*_PLUS_2`/`MINUS_2` id.)

**Total secondary-effect stat-down coverage (this probe's registrable slice):
188+48+32+3 = 271 legal L50 sets** (matches the prior probe's own tally,
re-derived independently here).

### 1.4 Opcode-cost join against the registered set (51 handlers, unchanged
since the prior probe -- reconfirmed by rerunning the same grep)

```
$ grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u | wc -l
51
```

| Mechanism | Registered today | Still needed |
| --- | --- | --- |
| `ChangeStatBuffs()` core (Mist/Protect/Clear Body/White Smoke/Keen Eye/Hyper Cutter/Shield Dust guard ladder, stage clamp, message-buffer prep) | No | Port the function itself -- no new *opcode*, but a new pure-logic subsystem (rules-context reads: side Mist timer, target ability, target's own `statStages`; writes: `statStages[statId]`, clamped) |
| `BattleScript_StatDown`/`StatUp` body (`playanimation`, `printfromtable`, `waitmessage`, `return`) | `waitmessage`/`return` registered | **`B_SCR_OP_PLAYANIMATION`, `B_SCR_OP_PRINTFROMTABLE`** -- 2 new opcodes (same pair the prior probe already priced for this family) |
| `BattleScriptPush`/`return` "call" pattern (how `SetMoveEffect`'s `else` branch invokes `BattleScript_StatDown`) | Yes -- `B_SCR_OP_CALL`/`B_SCR_OP_RETURN` both registered | none |
| `SetMoveEffect`'s own `if`/`else` dispatch (§1.2) | N/A -- this is engine-side dispatch logic living inside the `setmoveeffect`/`seteffectwithchance` handler itself, not a separate script opcode | Extending `createSeteffectwithchanceOpcodeHandler`'s existing `unsupportedBranch` to call a ported `changeStatBuffs()` helper for `MOVE_EFFECT_BYTE` in `[15,16,17,20,21]` (the 5 live-reachable stat ids per §1.3) |

**No new opcodes beyond the 2 the prior probe already identified
(`PLAYANIMATION`, `PRINTFROMTABLE`)** -- confirming the prior probe's own
claim that this family's cost is concentrated entirely in porting
`ChangeStatBuffs()`'s guard ladder as pure logic, not in new bytecode surface.

### 1.5 Adjacent registrations: the primary-effect stat-change path (Growl/Tail
Whip class, `EFFECT_ATTACK_DOWN`/`EFFECT_DEFENSE_UP`/etc., **out of this
probe's registrable scope**, enumerated for completeness only)

Primary-effect stat moves never call `SetMoveEffect` at all -- they set
`gBattleScripting.statChanger` directly via the `setstatchanger` macro (a
`setbyte` alias, **no new opcode**: `setbyte sSTATCHANGER, stat | stages<<4 |
down<<7`, `asm/macros/battle_script.inc:1366-1369`; `B_SCR_OP_SETBYTE` is
already registered) then `goto` a shared body that calls `statbuffchange`
directly:

```
BattleScript_EffectAttackDown::
    setstatchanger STAT_ATK, 1, TRUE
    goto BattleScript_EffectStatDown
...
BattleScript_EffectStatDown::
    attackcanceler
    jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_FailedFromAtkString
    accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE
    attackstring
    ppreduce
    statbuffchange STAT_CHANGE_ALLOW_PTR, BattleScript_StatDownEnd
    jumpifbyte CMP_LESS_THAN, cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_DECREASE, BattleScript_StatDownDoAnim
    jumpifbyte CMP_EQUAL, cMULTISTRING_CHOOSER, B_MSG_STAT_FELL_EMPTY, BattleScript_StatDownEnd
    pause B_WAIT_TIME_SHORT
    ...
```
(`data/battle_scripts_1.s:520-560`.) Note `statbuffchange` here passes
`STAT_CHANGE_ALLOW_PTR` (unlike the secondary-effect path, which never does,
per §1.1) -- **this is exactly the flag that flips every silent block in §1.1
into a real `BattleScriptPush` + jump to an ability-reveal message**
(`BattleScript_AbilityNoStatLoss`/`BattleScript_AbilityNoSpecificStatLoss`/
`BattleScript_MistProtected`), i.e. Growl-class moves blocked by Clear Body
**do** show "Foe's Clear Body prevents..." while Crunch's secondary effect
blocked by the same ability shows nothing (§2.3 confirms this live for the
secondary-effect side).

Opcodes this primary path needs beyond the shared quartet (`PLAYANIMATION`/
`PRINTFROMTABLE`, §1.4) that this probe's own registrable slice does **not**
need:

| Opcode | C handler | Registered | Purpose |
| --- | --- | --- | --- |
| `B_SCR_OP_STATBUFFCHANGE` | `Cmd_statbuffchange` (`:7100-7105`) | No | The primary-path entry point into `ChangeStatBuffs`, with real `flags`/`BS_ptr` |
| `B_SCR_OP_JUMPIFBYTE` | -- | **Yes** (already registered) | Used heavily by the primary path's post-`statbuffchange` branching (`cMULTISTRING_CHOOSER` dispatch) |

Multi-stat moves (Superpower/Close Combat/Overheat/Draco Meteor/Ancient
Power-class `ALL_STATS_UP`-adjacent effects -- a **third**, distinct
mechanism, `playstatchangeanimation BS_TARGET, BIT_ATK|BIT_DEF,
STAT_CHANGE_NEGATIVE|STAT_CHANGE_MULTIPLE_STATS` etc., `data/battle_scripts_1.s:2215-3700`)
use yet another opcode, `B_SCR_OP_PLAYSTATCHANGEANIMATION` (`Cmd_playstatchangeanimation`,
`:4111-4180`-ish) -- a heavier animation-selection routine that re-derives its
own ability/Mist gate inline (`:4141-4145`, structurally identical to
`ChangeStatBuffs`'s guard list, duplicated rather than shared) to decide
*whether to draw the animation at all* per stat, independent of whether the
underlying `ChangeStatBuffs` call for that stat actually landed. **Also not
registered, also out of this probe's scope.**

### 1.6 `MOVE_EFFECT_CONFUSION` (`:2533-2546`)

```c
case MOVE_EFFECT_CONFUSION:
    if (gBattleMons[gEffectBattler].ability == ABILITY_OWN_TEMPO
        || gBattleMons[gEffectBattler].status2 & STATUS2_CONFUSION)
    {
        gBattlescriptCurrInstr++;                    // silent skip: already confused, or immune
    }
    else
    {
        gBattleMons[gEffectBattler].status2 |= STATUS2_CONFUSION_TURN(((Random()) % 4) + 2); // 2-5 turns
        BattleScriptPush(gBattlescriptCurrInstr + 1);
        gBattlescriptCurrInstr = sMoveEffectBS_Ptrs[gBattleCommunication[MOVE_EFFECT_BYTE]]; // BattleScript_MoveEffectConfusion
    }
    break;
```

**One `Random()` call, drawn unconditionally on the success path**:
`(Random() % 4) + 2`, `u16 % 4` giving `0..3`, `+2` giving a `2..5` turn
range, written via `STATUS2_CONFUSION_TURN(num) = num << 0`
(`include/constants/battle.h:129-130`) into the low 3 bits of `status2`
(`STATUS2_CONFUSION = (1<<0 | 1<<1 | 1<<2)`, mask `0x7`). No pre-existing
value is OR'd against, so this is a plain assignment into those 3 bits (the
early-out above already guarantees they were `0`).

**Own Tempo gate is silent** -- no `BattleScriptPush`, no
`OwnTempoPrevents`-style message, just `gBattlescriptCurrInstr++` (matches the
stat family's silent-block shape; there is no `flags`/`STAT_CHANGE_ALLOW_PTR`
analog here at all, this branch is unconditionally silent by construction,
not gated behind any flag).

Sub-script `BattleScript_MoveEffectConfusion` (`data/battle_scripts_1.s:3932-3936`):
`chosenstatus2animation BS_EFFECT_BATTLER, STATUS2_CONFUSION` /
`printstring STRINGID_PKMNWASCONFUSED` / `waitmessage B_WAIT_TIME_LONG` /
`return` -- all 4 already registered (`chosenstatus2animation` is a macro for
`chosenstatusanimation battler, 0x1, status`, `B_SCR_OP_CHOSENSTATUSANIMATION`
is registered and already branches on the `isStatus2` discriminant,
`src/engine/battleScriptSourceCommands.ts:55,736-740`, per the prior probe).
**Zero new opcodes for the infliction itself** -- confirmed unchanged from the
prior probe's own finding.

**The turn counter decrements on the confused battler's own next action**,
*separately* from the infliction roll, in `AtkCanceller_UnableToUseMove`'s
`CANCELER_CONFUSED` case (`battle_util.c:2156-2179`, runs for whoever is about
to act, on every one of their turns while confused):

```c
case CANCELER_CONFUSED:
    if (gBattleMons[gBattlerAttacker].status2 & STATUS2_CONFUSION)
    {
        gBattleMons[gBattlerAttacker].status2 -= STATUS2_CONFUSION_TURN(1);   // decrement, NO Random()
        if (gBattleMons[gBattlerAttacker].status2 & STATUS2_CONFUSION)        // still >0 after decrement
        {
            if (Random() & 1)                          // <-- a SECOND, separate Random() call
                ... BattleScriptPushCursor();           // acts normally
            else
                ... gBattleMoveDamage = CalculateBaseDamage(..., MOVE_POUND, ..., 40, ...); // hurts itself
            gBattlescriptCurrInstr = BattleScript_MoveUsedIsConfused;
        }
        else // counter hit 0 this decrement -> snaps out, no Random()
            ...
    }
```

This is a live, easily-conflated-with-the-duration-roll second draw -- §2.5
bank both, in order, with exact positions.

## 2. Live ledgers

Both scenarios share one base route (`trainerId 110`, `challengeNum`/`battleNum`
2, `playerSetIds [274,354,338]`, `opponentSetIds [349,339,327]`) with
`overrides.parties`, identical to `docs/set-move-effect-ground-truth.md`'s own
precedent -- confirmed still live against the running battle-scene-off oracle
(no restart needed this session). Player fields KADABRA (species 64, speed
114 > opponent's 79, so it always acts first) with 4 copies of the
stat-down/confusion move under test; opponent fields MAGNETON (species 82,
125 max HP, Def 115/SpDef 90, ability Magnet Pull -- not any of the ability
gates under test) with `MOVE_TACKLE` x4 (forces the AI to one legal choice,
reused from the prior probe's own precedent). Both sides carry 2 filler
BULBASAUR bench slots. Single capture window `[0, 450]`, same convention as
both prior probes in this series.

**Cross-scenario RNG consistency, confirmed not assumed:** for a given `seed`,
frame-0 `rngValue` is identical across every fixture in this doc *and* the
prior probe's own `mechanic-set-move-effect-paralysis-off.json` (e.g. seed 4
→ `2643437444` in all three), and the first 4 Random() draws (accuracycheck/
critcalc/`ApplyRandomDmgMultiplier`/`seteffectwithchance`) are byte-identical
across fixtures for the same seed regardless of which move Kadabra carries --
confirming the RNG stream is a pure function of `seed` + script topology, not
of party contents, exactly as the prior probe's own cross-checks established.

### 2.1 Fixtures

- `tools/battle-lab/mechanic-change-stat-buffs-spdef-off.json` -- Kadabra
  `MOVE_CRUNCH` (id 242, `EFFECT_SPECIAL_DEFENSE_DOWN_HIT`, power 80, type
  Dark, accuracy 100, `secondaryEffectChance` 20) vs. Magneton. Dark is `0.5x`
  vs. Steel (confirmed against `src/data/gen/type-effectiveness.json`) and
  neutral vs. Electric, so the target survives comfortably (never below `44`
  HP across a 20-seed sweep) -- picked over the doc's higher-coverage
  Psychic/Shadow Ball carriers specifically so the *defender* isn't
  super-effective-weak to the attacking type, same "defender survives"
  design constraint the paralysis probe used.
- `tools/battle-lab/mechanic-change-stat-buffs-spdef-clearbody-off.json` --
  identical except the opponent is METANG (species 399, ability slot 0 =
  `ABILITY_CLEAR_BODY`, confirmed against
  `src/data/pokemon/species_info.h:11303` (Clear Body, ability slot 0);
  Steel/Psychic, so Crunch (Dark) is neutral overall (`0.5x` Steel × `2x`
  Psychic = `1x`), same no-faint-risk shape).
- `tools/battle-lab/mechanic-set-move-effect-confusion-off.json` -- Kadabra
  `MOVE_WATER_PULSE` (id 352, `EFFECT_CONFUSE_HIT`, power 60, type Water,
  accuracy 100, `secondaryEffectChance` 20) vs. Magneton. Picked over
  Psybeam/Confusion (both `secondaryEffectChance` 10, half the proc rate) and
  over 100%-chance Mud-Slap (`ACC_MINUS_1`, which can't produce a
  chance-roll-fails control seed at all) specifically because it's the
  **highest-legal-set-count `EFFECT_CONFUSE_HIT` carrier** in the topology
  join (12 sets vs. Psybeam's 11, Confusion's 9) *and* ties Crunch's 20%
  chance, letting the same 20-seed sweep serve both scenarios.

### 2.2 `SP_DEF_MINUS_1` proc seed 9 / control seed 1 (`mechanic-change-stat-buffs-spdef-off.json`)

**Seed sweep** (seeds 1-20): 9, 13, 16 proc (`SPDEF` stage `6->5` in each
case -- a single `-1` step, `SP_DEF_MINUS_1` never applies more than one
stage per hit); the rest don't.

| # | Source function | u16 roll (seed 9, proc) | u16 roll (seed 1, control) |
| - | --- | -: | -: |
| 1 | `Cmd_accuracycheck` | 17703 | 40931 |
| 2 | `Cmd_critcalc` | 40680 | 33731 |
| 3 | `ApplyRandomDmgMultiplier` | 247 | 29631 |
| 4 | `Cmd_seteffectwithchance` | 3806 | 46260 |

Roll 4: seed 9 `3806 % 100 = 6 < 20` -> chance gate clears ->
`SetMoveEffect(FALSE, 0)` dispatches `MOVE_EFFECT_SP_DEF_MINUS_1` ->
`ChangeStatBuffs(SET_STAT_BUFF_VALUE(1)|STAT_BUFF_NEGATIVE, STAT_SPDEF,
0, 0)` -> no guard fires (Magneton has no relevant ability, no Mist, no
Protect, not already at `-6`) -> `statStages[STAT_SPDEF]` (array index `5`,
raw byte) `6 -> 5`, `ChangeStatBuffs` returns `STAT_CHANGE_WORKED` ->
`BattleScript_StatDown` runs, printing "Magneton's Sp. Def fell!"
(`STRINGID_DEFENDERSSTATFELL`, `gBattleCommunication[MULTISTRING_CHOOSER] ==
(gBattlerTarget == gActiveBattler) == 1`). Seed 1's roll 4 `46260 % 100 = 60`,
not `< 20` -> `SetMoveEffect` never dispatches this attack; `statStages`
stays `6`.

**RNG cost of `ChangeStatBuffs` itself: zero**, confirmed by the full source
read in §1.1. **Whole-window roll count differs sharply from both the
paralysis (8) and confusion (9, §2.5) precedents, though**: forward-stepping
frame-0's `rngValue` for the proc seed lands on frame-450's captured value in
exactly **5** steps (`stepsToReach` search, not assumed), one more than the
4-roll attacker chain. This 5th roll is **not** attributable to
`ChangeStatBuffs` (source-confirmed zero `Random()` calls) -- the far more
plausible attribution, based on timing alone, is Magneton's own
(real-time-delayed) turn opening: the `playanimation`+`printfromtable`+
`waitmessage B_WAIT_TIME_LONG` sequence for a full stat-change animation
visibly costs more real-time frames than the quartet's simpler
`statusanimation`+`updatestatusicon` (a dense sweep, not committed to the
fixture, shows the `statStages` write itself doesn't land in the captured
state until somewhere between frame 260 and 270, vs. the paralysis precedent's
status1 write landing by frame 250) -- pushing the point where Magneton's own
`accuracycheck` executes right up against the 450-frame capture boundary, with
its own `critcalc`/damage rolls still pending past frame 450. **Not chased
down further to stay inside the time-box; flagged honestly rather than
mis-attributed to the subsystem under test.** The **control** seed reaches
frame 450 in **22** total rolls (same shape as both prior probes' own
"no extra on-screen message -> AI's next-turn scoring pass fits inside the
window" finding).

Party-record sync: **no `statStages` field exists on the party record at
all** -- see §2.4 (this is the stat-family's version of the paralysis
precedent's "party mirrors battler" check, except here there is nothing to
mirror, by construction).

PP[0] (Crunch): `15 -> 14`, matching the established one-decrement convention.

### 2.3 Blocked case: Clear Body (`mechanic-change-stat-buffs-spdef-clearbody-off.json`, seed 9)

Same seed 9 -- **same roll 4 (`3806 % 100 = 6 < 20`), i.e. the chance gate
clears exactly as it did against Magneton** -- but the target is now METANG
(`ability` field in the capture reads `29` = `ABILITY_CLEAR_BODY`, confirmed).
Result: `statStages[STAT_SPDEF]` stays `6 -> 6` (unchanged), `hp 135 -> 88`
(the hit itself still lands and deals damage -- only the secondary stat
effect is blocked). **This proves the guard live**, not just "no proc
happened to roll" -- the underlying chance roll is provably the same
proc-grade roll as §2.2's success case, and it's specifically the ability
check inside `ChangeStatBuffs` that intercepts it.

**No message-related timing cost**: total roll count to frame 450 is **22**
(`stepsToReach`, same as the plain control, not the 5-roll proc shape) --
consistent with §1.2's finding that the silent-block path
(`flags == STAT_CHANGE_ALLOW_PTR` is false, so the ability-block `if` inside
`ChangeStatBuffs` never pushes/jumps) costs **zero** extra script execution:
`gBattlescriptCurrInstr++` and the turn just continues immediately into
Magneton's-turn-equivalent (here, Metang's) processing, with time to spare in
the window for the AI's next-round scoring pass, same as any non-proc turn.

### 2.4 Party-record check (both stat scenarios), structural + empirical

`oracle/battle_lab.py`'s `_party_mon` (`:686-738`) decrypts the real boxed
Pokémon substructs (species/level/experience/nature/ivs/evs/moves/pp/ppUps/
item/abilitySlot/ability/types/friendship/personality/gender/shiny/otId/hp/
maxHp/stats/`status1`/`status`/checksumValid) -- **there is no `statStages`
byte anywhere in that list**, because the real GBA boxed-Pokémon save format
(`struct BoxPokemon`) has no stat-stage field at all; stat stages only exist
in the battle-only `gBattleMons` struct (`_battle_mon`, `:596-677`, which
*does* expose `statStages`). This is a **structural** guarantee, not just an
absence-of-observed-write: confirmed by inspecting a live capture's
`parties.opponent[0]` object keys directly (dumped in full during this probe,
23 keys, `statStages` not among them). **No party write is possible for a
stat-stage change, full stop** -- matches the brief's expectation exactly, and
generalizes to the primary-effect path (§1.5) too, not just the
secondary-effect path this probe targets.

### 2.5 `MOVE_EFFECT_CONFUSION` proc seed 9 / control seed 1 (`mechanic-set-move-effect-confusion-off.json`)

**Seed sweep** (seeds 1-20): 9 (`status2 0->2` *as captured at frame 450* --
see below for why the raw roll predicts `3`, not `2`), 13 (`0->2`), 16
(`0->3`) proc; the rest don't. Same proc seeds as §2.2, expected: Water
Pulse's `secondaryEffectChance` (20) equals Crunch's, so the same roll-4
threshold check (`< 20`) against the same per-seed rngValue stream yields the
same proc/no-proc partition.

| # | Source function | u16 roll (seed 9) | Notes |
| - | --- | -: | --- |
| 1 | `Cmd_accuracycheck` | 17703 | identical to §2.2's seed 9, confirming the cross-scenario RNG-consistency claim above |
| 2 | `Cmd_critcalc` | 40680 | ditto |
| 3 | `ApplyRandomDmgMultiplier` | 247 | ditto |
| 4 | `Cmd_seteffectwithchance` | 3806 | `3806 % 100 = 6 < 20` -> proc |
| 5 | `SetMoveEffect`'s confusion-duration draw | 9241 | `9241 % 4 = 1`, `+2 = 3` turns |
| 6 | `AtkCanceller_UnableToUseMove`'s `CANCELER_CONFUSED` self-hit check (Magneton's own turn) | 10365 | `10365 & 1 = 1` (odd) -> acts normally, no self-hit damage |

Rolls 1-4 derived and cross-checked against the live capture exactly as in
§2.2 (same fixture family, same seed, same first-4-roll values -- confirmed,
not assumed). Rolls 5-6 derived by pure forward LCG stepping from roll 4's
post-roll `rngValue` (no live capture needed for the *values*, since the LCG
is a pure deterministic function once the seed/step count are fixed) and then
**cross-checked against two extra live capture frames** (`200` and `300`,
probed manually via a widened, non-committed `captureFrames` list, not baked
into the committed fixture to keep it minimal like the prior probe's own
fixtures):

- Frame 200 (well after Kadabra's whole turn, well before Magneton's):
  `status2 = 3`, `rngValue = 605633636` -- **exactly** the value 5 forward
  LCG steps from frame-0's `rngValue`, confirming roll 5 (`9241`, `%4=1`,
  `+2=3`) is the raw duration draw, written unmodified.
- Frame 300 (after Magneton's own `CANCELER_CONFUSED` check has run):
  `status2 = 2`, `rngValue = 679317255` -- **exactly** 1 more forward LCG step
  (roll 6, `10365`), confirming the counter decrement (`3 -> 2`, no `Random()`
  cost, per §1.6's source read) plus the self-hit-check roll both happened in
  that window, and that the self-hit roll is odd (`& 1 = 1`) matching the
  observed "no self-inflicted damage" (`hp` stays `86` from frame ~190
  onward, never drops further).

**This resolves an easy misreading**: the committed fixture's own frame-450
capture shows `status2 = 2` (`volatile.confusionTurns: 2`), which on its own
looks like it might be the *raw* duration roll's output -- it is not. The raw
roll is `3`; the captured `2` is **post one automatic decrement** from
Magneton's own subsequent turn happening to fall inside the same 450-frame
capture window. A narrower or wider capture window would show a different
"final" number for reasons that have nothing to do with `SetMoveEffect`'s own
math -- the committed verify script (§3) checks the *raw* roll-5 arithmetic
independently of this timing artifact, via pure RNG forward-stepping, not by
reading the frame-450 status2 value as if it were the raw draw.

**Whole-window roll count**: forward-stepping frame 0's `rngValue` reaches
frame 450's captured value in exactly **9** steps (`stepsToReach`) -- the
4-roll attacker chain, +1 for the duration draw, +1 for Magneton's self-hit
check, +3 for Magneton's own Tackle hit-chain (`accuracycheck`/`critcalc`/
`ApplyRandomDmgMultiplier`, no `seteffectwithchance` roll since Tackle's
`secondaryEffectChance` is `0`). The **control** seed reaches frame 450 in
**22** total rolls, same as both stat scenarios' own controls (identical
rngValue stream when no proc happens, since the move choice doesn't change
which functions call `Random()` when `SetMoveEffect` is never dispatched).

**Party-record check**: identical structural argument to §2.4, but even more
direct here -- `_party_mon` doesn't expose a `status2` field at all (only the
permanent `status1`), so a volatile like confusion has **no possible party
write path**, full stop; not just unwritten in this run, structurally
un-writable through this record. Confirmed empirically too: `parties.opponent[0]`
stays byte-identical (23 keys, same values except the ordinary HP delta from
the hit itself) across proc and control seeds.

## 3. Verify script

`tools/probe/verify-stat-confusion-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-stat-confusion-ground-truth.ts`)
reruns all three committed fixtures at their banked seeds and checks,
PASS/FAIL, every live claim above: determinism (2 independent reruns of each
proc seed, byte-for-byte at frames 0 and 450), the roll-4 `%100` chance-gate
arithmetic for every seed, the 4-roll attacker-chain count, `statStages`
before/after for the proc/control/blocked `SP_DEF_MINUS_1` cases, the Clear
Body `ability` readback, the absence of a `statStages` key on any party
record, the roll-5 confusion-duration arithmetic (`%4+2`) via pure forward-LCG
stepping (not the frame-450 capture, per §2.5's own caveat), the `status2`
values captured at frame 450 for proc/control, the absence of a `status2` key
on any party record, and PP decrements for all three fixtures. All PASS at
commit time:

```
$ node --experimental-strip-types tools/probe/verify-stat-confusion-ground-truth.ts
...
PASS: 0 failing check(s)
```

## Recommended registration slices

**Slice A -- `SP_DEF_MINUS_1`/`SPD_MINUS_1`/`DEF_MINUS_1`/`ATK_MINUS_1`
(secondary-effect stat-down quartet, ranks #1/#6/#10/#14 in the prior probe's
table, `MOVE_EFFECT_*` ids 15/16/17/21, combined **271** legal-L50-set
coverage):** register `B_SCR_OP_PLAYANIMATION` + `B_SCR_OP_PRINTFROMTABLE` (2
new opcodes, §1.4 -- no others needed) plus a ported `changeStatBuffs()` pure
helper covering exactly the guard ladder in §1.1 restricted to the
`flags==0` shape the secondary-effect path always uses (Mist / Protect(dead in
practice, but cheap to port literally) / Clear Body+White Smoke / Keen
Eye+Hyper Cutter(ACC/ATK-specific) / Shield Dust / already-at-MIN(no early
return, falls through to the message) / already-at-MAX(irrelevant, decrease-only
here) / clamp `[0,12]`). This is the single biggest raw-coverage slice in
either probe (271, second only to the prior probe's own PARALYSIS+FREEZE+BURN+
POISON quartet at 366) and is now live-proven end-to-end including its
**silently-blocked** ability/Mist paths (§2.3) -- a real gap the naive port
(reusing the primary-effect path's messaging) would have gotten wrong.
`ACC_MINUS_1` (Mud-Slap, `EFFECT_ACCURACY_DOWN_HIT`) is a natural, structurally
identical companion (same `ChangeStatBuffs` call shape, `statId=STAT_ACC`) not
separately counted in the topology join used here but cheap to include once
the quartet's helper exists.

**Slice B -- `CONFUSION` (rank #8, 42 sets, zero new opcodes for infliction,
§1.6):** the infliction itself needs no new opcode (all 4
`BattleScript_MoveEffectConfusion` ops already registered, confirmed
unchanged from the prior probe) -- the only new surface is the
`(Random()%4)+2` duration draw and the `STATUS2_CONFUSION_TURN` bit-write
inside the `setmoveeffect`/`seteffectwithchance` handler itself, engine-side,
not bytecode. **Defer the `CANCELER_CONFUSED` self-hit mechanic (§1.6, the
decrement + `Random()&1` self-damage roll) to a separate step** -- it lives in
`AtkCanceller_UnableToUseMove`, a wholly different subsystem (the per-turn
attack-canceler chain that also handles Sleep/Freeze/Paralysis/Flinch/
Disable/Taunt/Imprison/Recharge in the same `switch`), or the mon that gets
confused will visibly never "shake it off" or "hurt itself in confusion" in
this engine even after the infliction lands -- a real, honestly-scoped gap,
not silently dropped.

**Slice C (deferred, per the prior probe, unchanged) -- `ALL_STATS_UP_HIT`/
`TRI_ATTACK`/`KNOCK_OFF`/the primary-effect stat-change path (§1.5,
`B_SCR_OP_STATBUFFCHANGE` + the primary-only ability-reveal messages)/the
multi-stat `playstatchangeanimation` mechanism (§1.5):** each is a genuinely
separate subsystem from `ChangeStatBuffs`'s secondary-effect core (duplicated
guard logic in `Cmd_playstatchangeanimation`, or a wholly different animation
scaffold, or `STAT_CHANGE_ALLOW_PTR`-gated messaging this probe's own live
ledger shows the secondary-effect path never exercises) -- bundling any of
them into Slice A risks the same "well-precedented pattern mixed with an
untested one" failure mode the prior probe already flagged for the stat
family as a whole.
