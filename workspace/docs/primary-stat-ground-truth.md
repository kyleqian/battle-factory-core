# Primary-effect stat-change ground truth (the "adjacent registration" `docs/stat-change-confusion-ground-truth.md` §1.5 deferred)

Probe deliverable, not a registration: banks the source enumeration and live
proc ledgers for the **primary-effect** stat-change path -- `Cmd_statbuffchange`
(`battle_script_commands.c:7100-7105`) called with a *real* script-authored
`flags`/`BS_ptr` (as opposed to the secondary-effect path's always-`0`/`NULL`
call already banked in `docs/stat-change-confusion-ground-truth.md`). This is
the `EFFECT_ATTACK_UP`/`EFFECT_ATTACK_DOWN`-family route: `docs/executable-frontier-census.md`'s
two ranked rows for `B_SCR_OP_STATBUFFCHANGE`+`B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES`+
`B_SCR_OP_PLAYANIMATION` (9 effects / 14 moves / 11 Factory-L50 / 120 weighted)
and the DOWN-side sibling adding `B_SCR_OP_JUMPIFSTATUS2`+`B_SCR_OP_ORBYTE`
(9 effects / 16 moves / 13 Factory-L50 / 82 weighted) -- 30 moves combined, per
the brief. Neither row's opcode set overlaps the secondary-effect path's own
needs (`B_SCR_OP_PRINTFROMTABLE`, now registered) -- this probe does not touch
`src/` or register anything.

## 1. Source enumeration

### 1.1 `Cmd_statbuffchange` (`battle_script_commands.c:7100-7105`)

```c
static void Cmd_statbuffchange(void)
{
    const u8 *jumpPtr = T1_READ_PTR(gBattlescriptCurrInstr + 2);
    if (ChangeStatBuffs(gBattleScripting.statChanger & 0xF0, GET_STAT_BUFF_ID(gBattleScripting.statChanger), gBattlescriptCurrInstr[1], jumpPtr) == STAT_CHANGE_WORKED)
        gBattlescriptCurrInstr += 6;
}
```

Bytecode shape (`.macro statbuffchange flags:req, jumpptr:req` /
`asm/macros/battle_script.inc:748-752`): `[opcode:1][flags:1][jumpptr:4]` -- 6
bytes total, matching the `+= 6` advance on success. `flags` here is the
**literal script-authored byte** at `gBattlescriptCurrInstr[1]` (not always
`0` like the secondary-effect path) and `jumpPtr` is a **real jump target**
read from the bytecode, not the literal `NULL` the secondary path always
passes. Both are the two things §1.5 of the prior probe flagged as
"real, not always-zero" for this route.

`gBattleScripting.statChanger` (`include/battle.h:505`, a `u8`) is **not**
set by `Cmd_statbuffchange` itself -- it must already have been populated by
`Cmd_setstatchanger` earlier in the same script (see below). `& 0xF0` extracts
the stage+sign nibble (`GET_STAT_BUFF_VALUE2`, `include/battle.h:479`) as
`ChangeStatBuffs`'s first arg (`statValue`); `GET_STAT_BUFF_ID(...)`
(`& 0xF`, `include/battle.h:478`) extracts the stat id as the second arg.

### 1.2 `Cmd_setstatchanger` -- actually a `setbyte` alias, no opcode

```
@ asm/macros/battle_script.inc:1366-1369
.macro setstatchanger stat:req, stages:req, down:req
    setbyte sSTATCHANGER, \stat | \stages << 4 | \down << 7
.endm
```

There is no `Cmd_setstatchanger` C function -- `setstatchanger` compiles to a
plain `B_SCR_OP_SETBYTE` write (**already registered**) targeting
`sSTATCHANGER` (`gBattleScripting.statChanger`, confirmed against
`SET_STATCHANGER(statId, stage, goesDown)`, `include/battle.h:485`: `gBattleScripting.statChanger
= statId + (stage << 4) + (goesDown << 7)` -- the exact same bit layout the
macro hand-encodes). **No new opcode** for this step, matching the prior
probe's own finding for the same macro (§1.5). The `down` bit (bit 7) does
**not** feed `ChangeStatBuffs` directly -- `Cmd_statbuffchange` only ever
passes `statChanger & 0xF0` as `statValue`, and `GET_STAT_BUFF_VALUE2` masks in
the sign bit too (`STAT_BUFF_NEGATIVE = 0x80`, `include/battle.h:481`, the same
bit position as `down << 7`) -- so the `down` flag and the "negative" sign
`ChangeStatBuffs` tests (`statValue <= -1`, since `s8` interprets bit 7 as
sign) are literally the same bit, not two independent mechanisms.

### 1.3 `Cmd_setgraphicalstatchangevalues` (`battle_script_commands.c:4088-4109`)

```c
static void Cmd_setgraphicalstatchangevalues(void)
{
    u8 value = 0;
    switch (GET_STAT_BUFF_VALUE2(gBattleScripting.statChanger))
    {
    case SET_STAT_BUFF_VALUE(1): value = STAT_ANIM_PLUS1 + 1; break;
    case SET_STAT_BUFF_VALUE(2): value = STAT_ANIM_PLUS2 + 1; break;
    case SET_STAT_BUFF_VALUE(1) | STAT_BUFF_NEGATIVE: value = STAT_ANIM_MINUS1 + 1; break;
    case SET_STAT_BUFF_VALUE(2) | STAT_BUFF_NEGATIVE: value = STAT_ANIM_MINUS2 + 1; break;
    }
    gBattleScripting.animArg1 = GET_STAT_BUFF_ID(gBattleScripting.statChanger) + value - 1;
    gBattleScripting.animArg2 = 0;
    gBattlescriptCurrInstr++;
}
```

Zero-argument opcode (1 byte, `.macro setgraphicalstatchangevalues` /
`asm/macros/battle_script.inc:397-399`). Pure re-derivation of the *same*
`gBattleScripting.statChanger` byte `Cmd_setstatchanger` wrote, converted into
`animArg1`/`animArg2` -- the two fields the immediately-following `playanimation
BS_ATTACKER/BS_TARGET, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1` opcode (`B_SCR_OP_PLAYANIMATION`,
unregistered) reads as its animation-id and argument. **Zero `Random()` calls,
zero side effects beyond these two scripting fields.** `sB_ANIM_ARG1` is a
symbol alias for `gBattleScripting.animArg1`'s address, consumed the same way
by both this opcode and by `Cmd_playstatchangeanimation` below (they write and
read the same two-field scratch area via two structurally different derivations).

### 1.4 `Cmd_playstatchangeanimation` (`battle_script_commands.c:4111-4208`) -- adjacent, not needed by this slice

Read in full (per the brief) for completeness: this is the **multi-stat**
animation-selection opcode (`B_SCR_OP_PLAYSTATCHANGEANIMATION`), used by
`playstatchangeanimation battler, stats_bitmask, statchange_flags` -- a
*different*, heavier mechanism than `setgraphicalstatchangevalues`+`playanimation`,
used by Superpower/Close Combat/Overheat-class multi-stat effects and by the
`EFFECT_TICKLE`/`EFFECT_COSMIC_POWER`/`EFFECT_BULK_UP`/`EFFECT_CALM_MIND`/
`EFFECT_DRAGON_DANCE` census row (a sibling row, **not** the
`EFFECT_ATTACK_UP`/`EFFECT_ATTACK_DOWN` row this probe targets -- neither
`BattleScript_EffectAttackUp`/`EffectAttackDown` calls it at all). Its own
guard ladder (`:4141-4145`) re-derives Mist/Clear-Body/White-Smoke/Keen-Eye/
Hyper-Cutter **inline, independently of `ChangeStatBuffs`**, purely to decide
*whether to draw the animation*, per stat, walking a bitmask
(`BIT_ATK|BIT_DEF|...`) rather than a single `statId` -- confirms the prior
probe's own characterization of it as "a genuinely separate subsystem" (§1.5,
Slice C). Controller round-trip: `BtlController_EmitBattleAnimation(B_COMM_TO_CONTROLLER,
B_ANIM_STATS_CHANGE, statAnimId)` + `MarkBattlerForControllerExec` -- the
*same* controller animation id (`B_ANIM_STATS_CHANGE`) the single-stat
`playanimation` opcode also emits, just computed by a different local
selection algorithm (`STAT_ANIM_MULTIPLE_PLUS1`/`MINUS1`/`PLUS2`/`MINUS2` when
`changeableStatsCount > 1`, i.e. the "gray" multi-stat sparkle vs. the colored
single-stat one). **Zero `Random()` calls.** Out of this probe's registrable
scope; enumerated only because the brief asked for it by name.

### 1.5 `BattleScript_EffectAttackUp` walked end-to-end (`data/battle_scripts_1.s:475-514`)

```
BattleScript_EffectAttackUp::
    setstatchanger STAT_ATK, 1, FALSE          @ SETBYTE (registered)
    goto BattleScript_EffectStatUp             @ GOTO (registered)

BattleScript_EffectStatUp::                     @ shared by Attack/Defense/SpAtk/Evasion-Up
    attackcanceler                              @ ATTACKCANCELER (registered)
BattleScript_EffectStatUpAfterAtkCanceler::
    attackstring                                @ ATTACKSTRING (registered)
    ppreduce                                    @ PPREDUCE (registered)
    statbuffchange MOVE_EFFECT_AFFECTS_USER | STAT_CHANGE_ALLOW_PTR, BattleScript_StatUpEnd
                                                 @ STATBUFFCHANGE (MISSING)
    jumpifbyte CMP_NOT_EQUAL, cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_INCREASE, BattleScript_StatUpAttackAnim
                                                 @ JUMPIFBYTE (registered)
    pause B_WAIT_TIME_SHORT                     @ PAUSE (registered)
    goto BattleScript_StatUpPrintString         @ GOTO (registered)
BattleScript_StatUpAttackAnim::
    attackanimation                             @ ATTACKANIMATION (registered)
    waitanimation                               @ WAITANIMATION (registered)
BattleScript_StatUpDoAnim::
    setgraphicalstatchangevalues                @ SETGRAPHICALSTATCHANGEVALUES (MISSING)
    playanimation BS_ATTACKER, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1
                                                 @ PLAYANIMATION (MISSING)
BattleScript_StatUpPrintString::
    printfromtable gStatUpStringIds             @ PRINTFROMTABLE (registered)
    waitmessage B_WAIT_TIME_LONG                @ WAITMESSAGE (registered)
BattleScript_StatUpEnd::
    goto BattleScript_MoveEnd                   @ GOTO (registered) -> MOVEEND (registered)
```

**Exactly 3 missing opcodes on the main path** -- `STATBUFFCHANGE`,
`SETGRAPHICALSTATCHANGEVALUES`, `PLAYANIMATION` -- matching the census row
exactly (confirmed by walking the actual script, not just trusting the
generated table). No `accuracycheck` anywhere in this script: **self-target
stat-UP moves skip the accuracy roll entirely** (the opcode simply does not
appear), confirmed by the literal absence, not by a flag check. `EFFECT_ATTACK_UP_2`
(Swords Dance) is structurally identical (`BattleScript_EffectAttackUp2`,
`setstatchanger STAT_ATK, 2, FALSE` then the *same* `goto
BattleScript_EffectStatUp` shared body) -- confirmed live in §2.1, the only
difference is the stage argument (`2` vs `1`), consumed identically by
`ChangeStatBuffs`'s `GET_STAT_BUFF_VALUE`.

### 1.6 `BattleScript_EffectAttackDown` walked end-to-end (`data/battle_scripts_1.s:516-560`)

```
BattleScript_EffectAttackDown::
    setstatchanger STAT_ATK, 1, TRUE            @ SETBYTE (registered)
    goto BattleScript_EffectStatDown            @ GOTO (registered)

BattleScript_EffectStatDown::                    @ shared by Attack/Defense/Speed/Accuracy/Evasion-Down
    attackcanceler                               @ ATTACKCANCELER (registered)
    jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_FailedFromAtkString
                                                  @ JUMPIFSTATUS2 (MISSING)
    accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE
                                                  @ ACCURACYCHECK (registered)
    attackstring                                 @ ATTACKSTRING (registered)
    ppreduce                                     @ PPREDUCE (registered)
    statbuffchange STAT_CHANGE_ALLOW_PTR, BattleScript_StatDownEnd
                                                  @ STATBUFFCHANGE (MISSING)
    jumpifbyte CMP_LESS_THAN, cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_DECREASE, BattleScript_StatDownDoAnim
                                                  @ JUMPIFBYTE (registered)
    jumpifbyte CMP_EQUAL, cMULTISTRING_CHOOSER, B_MSG_STAT_FELL_EMPTY, BattleScript_StatDownEnd
                                                  @ JUMPIFBYTE (registered)
    pause B_WAIT_TIME_SHORT                      @ PAUSE (registered)
    goto BattleScript_StatDownPrintString        @ GOTO (registered)
BattleScript_StatDownDoAnim::
    attackanimation                              @ ATTACKANIMATION (registered)
    waitanimation                                @ WAITANIMATION (registered)
    setgraphicalstatchangevalues                 @ SETGRAPHICALSTATCHANGEVALUES (MISSING)
    playanimation BS_TARGET, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1
                                                  @ PLAYANIMATION (MISSING)
BattleScript_StatDownPrintString::
    printfromtable gStatDownStringIds            @ PRINTFROMTABLE (registered)
    waitmessage B_WAIT_TIME_LONG                 @ WAITMESSAGE (registered)
BattleScript_StatDownEnd::
    goto BattleScript_MoveEnd                    @ GOTO (registered) -> MOVEEND (registered)
```

**Exactly 5 missing opcodes on the main path** -- the UP-family's 3 plus
`JUMPIFSTATUS2` (the Substitute early-out) and, transitively, `ORBYTE` (only
reachable via `BattleScript_ButItFailed`, see §1.7) -- matching the census row
exactly. `ORBYTE` does **not** appear as a literal instruction anywhere in
this script's own bytes; it is reached only if `ChangeStatBuffs`'s internal
Protect branch fires and jumps engine-side to `BattleScript_ButItFailed`
(`orbyte gMoveResultFlags, MOVE_RESULT_FAILED`, `data/battle_scripts_1.s:2060`)
-- a target hardcoded in the C source (`battle_script_commands.c:6984`), not
read from this script's bytecode, so it is a genuine "(b)-barrier" edge: the
census's static walk must count it as reachable through `Cmd_statbuffchange`'s
engine-side dispatch even though no `.s` line in *this* script literally
spells `orbyte`. See §1.7 for why it is nonetheless dead in practice for this
family (a nuance the referenced doc's own dead-code claim didn't have to
address, since it analyzed a different family).

`EFFECT_DEFENSE_DOWN`/`SPEED_DOWN`/`ACCURACY_DOWN`/`EVASION_DOWN` are
structurally identical siblings sharing this same `BattleScript_EffectStatDown`
body (confirmed live for Defense in §2.2/2.3, Tail Whip/Leer class).

### 1.7 Failure branches, enumerated with the ALLOW_PTR message path this time

`ChangeStatBuffs` (`battle_script_commands.c:6937-7098`) is the exact same
function the secondary-effect probe already fully enumerated -- not
re-derived here, only the **flags-dependent behavior difference** is new,
since the primary path's `flags` byte is real (`STAT_CHANGE_ALLOW_PTR = 1<<0`,
`STAT_CHANGE_NOT_PROTECT_AFFECTED = 1<<5`, `include/constants/battle_script_commands.h:371-372`,
plus `MOVE_EFFECT_AFFECTS_USER = 1<<6`/`MOVE_EFFECT_CERTAIN = 1<<7`,
`include/battle.h:309-310`, both stripped by masking before any guard runs,
same as the secondary path). Every `statbuffchange` call site in
`data/battle_scripts_1.s` passes `STAT_CHANGE_ALLOW_PTR` set (confirmed:
`grep -c 'statbuffchange ' data/battle_scripts_1.s` -> every hit includes the
literal flag or `MOVE_EFFECT_AFFECTS_USER | STAT_CHANGE_ALLOW_PTR`) -- so
`flags == STAT_CHANGE_ALLOW_PTR` (bit 0 alone, after the other three bits are
masked off) is **always true** on this path, the exact inverse of the
secondary-effect path where it's always false. This flips every silent block
in the referenced doc's §1.1 into a real `BattleScriptPush(BS_ptr) +
gBattlescriptCurrInstr = <ability-reveal script>` jump:

1. **Mist** (`:6962-6980`): `BattleScript_MistProtected` (`data/battle_scripts_1.s:3343-3347`):
   `pause B_WAIT_TIME_SHORT` / `printstring STRINGID_PKMNPROTECTEDBYMIST` /
   `waitmessage B_WAIT_TIME_LONG` / `return` -- all 4 opcodes already
   registered (`PAUSE`/`PRINTSTRING`/`WAITMESSAGE`/`RETURN`). `return` pops
   back to the pushed `BS_ptr` = the macro's own `jumpptr` operand
   (`BattleScript_StatDownEnd` for the DOWN family), so execution resumes at
   `goto BattleScript_MoveEnd` -- no stat-fell message is ever reached.
2. **Protect** (`:6981-6986`, jumps to `BattleScript_ButItFailed` directly,
   *not* through `BattleScriptPush`): `pause B_WAIT_TIME_SHORT` / `orbyte
   gMoveResultFlags, MOVE_RESULT_FAILED` / `resultmessage` / `waitmessage
   B_WAIT_TIME_LONG` / `goto BattleScript_MoveEnd` (`data/battle_scripts_1.s:2058-2063`).
   **`RESULTMESSAGE` is also unregistered** but not counted in the census row
   since `ORBYTE` already gates this branch and `RESULTMESSAGE` -- checked
   directly -- **is already registered** (`grep` confirms
   `"B_SCR_OP_RESULTMESSAGE"` in the current opcode set). **Live-confirmed
   dead in practice for this family, same conclusion as the secondary-effect
   probe but via a different, more directly-verifiable mechanism**: for the
   DOWN family (the only one with a target other than self),
   `accuracycheck ACC_CURR_MOVE` (which runs *before* `statbuffchange` in the
   very same script) itself calls `JumpIfMoveAffectedByProtect(move)`
   (`battle_script_commands.c:1123`) and, if `DEFENDER_IS_PROTECTED`, jumps
   straight to `BattleScript_PrintMoveMissed` -- so by the time
   `Cmd_statbuffchange` could run, a Protected target has already diverted
   the whole script away. No intervening state change (Protect status is not
   cleared by `attackstring`/`ppreduce`) can make `ChangeStatBuffs`'s own
   Protect check see a different `DEFENDER_IS_PROTECTED` value than
   `accuracycheck` already saw a few opcodes earlier. Not staged live this
   pass (would need a Protect-then-attack two-turn setup) per the brief's
   scope, but the mechanism is directly readable in the same script, unlike
   the secondary-effect path's "trust the upstream `BattleScript_EffectHit`
   gate in a different script" argument.
3. **Clear Body / White Smoke** (`:6987-7008`): `BattleScript_AbilityNoStatLoss`
   (`data/battle_scripts_1.s:4116-4120`): `pause B_WAIT_TIME_SHORT` /
   `printstring STRINGID_PKMNPREVENTSSTATLOSSWITH` / `waitmessage
   B_WAIT_TIME_LONG` / `return` -- same 4 already-registered opcodes as Mist.
   `gLastUsedAbility` is set and `RecordAbilityBattle` is called (both
   engine-side bookkeeping, no opcode). **Live-verified in §2.3**: real
   message plays, `statStages` provably unchanged.
4. **Keen Eye** (accuracy-only) / **Hyper Cutter** (attack-only)
   (`:7009-7034`): `BattleScript_AbilityNoSpecificStatLoss`
   (`data/battle_scripts_1.s:4166-4171`): `pause` / `printstring
   STRINGID_PKMNSXPREVENTSYLOSS` / `waitmessage` / `setbyte cMULTISTRING_CHOOSER,
   B_MSG_STAT_FELL_EMPTY` / `return` -- an extra `SETBYTE` (registered) not
   present in the Mist/Clear-Body scripts; harmless here since the `BS_ptr`
   return target (`BattleScript_StatDownEnd`) never reads `MULTISTRING_CHOOSER`
   again on this path, so the forced `B_MSG_STAT_FELL_EMPTY` is a defensive
   write for other callers, not exercised further by this script. Not staged
   live (no Factory-legal Keen-Eye/Hyper-Cutter target was cheap to reach
   inside the time-box; the mechanism is identical in shape to Clear Body,
   which *is* staged in §2.3).
5. **Shield Dust** (`:7035-7038`, `flags == 0` only): **structurally
   impossible to reach on the primary path.** `flags` here is
   `gBattlescriptCurrInstr[1]` after masking off `MOVE_EFFECT_AFFECTS_USER`
   (bit 6), `MOVE_EFFECT_CERTAIN` (bit 7), and `STAT_CHANGE_NOT_PROTECT_AFFECTED`
   (bit 5) -- `STAT_CHANGE_ALLOW_PTR` (bit 0) is never one of the three
   stripped bits, and every real `statbuffchange` call site sets it, so
   `flags` is **always at least `1`, never `0`**, on this path. **Shield Dust
   cannot block a Growl/Tail-Whip-class move, full stop** -- the opposite
   asymmetry from Mist/Clear-Body/Keen-Eye/Hyper-Cutter, which block *both*
   paths. This matches real Emerald behavior (Shield Dust is documented as a
   secondary-effect-only immunity) and is a clean, source-derived (not just
   empirical) proof, not a coincidence of test coverage.
6. **Already-at-bound** (`:7085-7097`, the shared clamp+return tail): `if
   (gBattleCommunication[MULTISTRING_CHOOSER] == B_MSG_STAT_WONT_INCREASE &&
   flags & STAT_CHANGE_ALLOW_PTR) gMoveResultFlags |= MOVE_RESULT_MISSED;`
   then falls through to `return STAT_CHANGE_WORKED` (since `ALLOW_PTR` is
   set, the `DIDNT_WORK` early-return is skipped). **Numeric quirk worth
   flagging explicitly**: `B_MSG_STAT_WONT_INCREASE` (`= 2`,
   `include/constants/battle_string_ids.h:397`) and `B_MSG_STAT_WONT_DECREASE`
   (`= 2`, `:405`) are **the same raw byte value** (each is index 2 into its
   own, separate string table -- `gStatUpStringIds`/`gStatDownStringIds` --
   but `gBattleCommunication[MULTISTRING_CHOOSER]` is one shared byte with no
   direction tag). This single `== B_MSG_STAT_WONT_INCREASE` check at the
   bottom of `ChangeStatBuffs` therefore fires identically whether the
   *increase* branch set it (already at `MAX_STAT_STAGE`) or the *decrease*
   branch set the numerically-identical `B_MSG_STAT_WONT_DECREASE` (already
   at `MIN_STAT_STAGE`) -- so `MOVE_RESULT_MISSED` gets set (and the
   `DIDNT_WORK` early-return still never fires, since `ALLOW_PTR` is set
   either way) for an already-maxed stat-UP **and** an already-minned
   stat-DOWN alike. Both cases fall through to `STAT_CHANGE_WORKED`, the
   script prints "won't go any higher/lower!" (via `gStatUpStringIds[2]`/
   `gStatDownStringIds[2]` = `STRINGID_STATSWONTINCREASE`/`STRINGID_STATSWONTDECREASE`),
   and no stat-change animation plays (the `jumpifbyte ... BattleScript_StatUpAttackAnim`/
   `StatDownDoAnim` check fails since `MULTISTRING_CHOOSER == 2`, so the
   `attackanimation`/`setgraphicalstatchangevalues`/`playanimation` trio is
   skipped entirely for this specific sub-case). Not staged live this pass
   (needs 6 setup turns to pre-max/pre-min a stat) -- flagged as a cheap,
   well-understood follow-up per the brief's time-box, not a gap in the
   source analysis.

## 2. Live ledgers

Same base route as the referenced doc (`trainerId 110`, `challengeNum`/`battleNum`
2, `playerSetIds [274,354,338]`, `opponentSetIds [349,339,327]`),
`overrides.parties`, single capture window `[0, 450]` -- confirmed still live
against the running battle-scene-off oracle. Carriers picked by checking
`src/data/gen/battle-frontier-mons.json` directly for real Factory-legal
rental sets (not assumed): 15 sets carry `MOVE_SWORDS_DANCE` (`EFFECT_ATTACK_UP_2`,
weighted 15 per the census, the single carrier for that effect), 1 carries
`MOVE_TAIL_WHIP` and 2 carry `MOVE_LEER` (both `EFFECT_DEFENSE_DOWN`, weighted
2 combined) -- `MOVE_GROWL` (`EFFECT_ATTACK_DOWN` itself) has **zero**
Factory-legal L50 carriers in the census's own per-effect table, so it is not
a usable "Growl-class" fixture; Tail Whip is used instead as the DOWN-family
representative, same effect-family shape (`BattleScript_EffectStatDown`), just
targeting Defense instead of Attack.

### 2.1 Fixtures

- `tools/battle-lab/mechanic-primary-stat-attack-up-off.json` -- FARFETCH'D
  (species 83, rental index 137: `SLASH`/`KNOCK_OFF`/`SWORDS_DANCE`/`AGILITY`)
  carries `MOVE_SWORDS_DANCE` (id 14, `EFFECT_ATTACK_UP_2`) x4 vs. MAGNETON
  (species 82) `MOVE_TACKLE` x4 (single legal AI choice, same convention as
  both prior probes).
- `tools/battle-lab/mechanic-primary-stat-defense-down-off.json` -- PONYTA
  (species 77, rental index 191: `FIRE_SPIN`/`BOUNCE`/`QUICK_ATTACK`/`TAIL_WHIP`)
  carries `MOVE_TAIL_WHIP` (id 39, `EFFECT_DEFENSE_DOWN`, accuracy 100) x4 vs.
  MAGNETON, `MOVE_TACKLE` x4.
- `tools/battle-lab/mechanic-primary-stat-defense-down-clearbody-off.json` --
  identical except the opponent is METANG (species 399, ability slot 0 =
  `ABILITY_CLEAR_BODY`, same species+slot the referenced doc already confirmed
  against `src/data/pokemon/species_info.h:11303`), picked as the FAILURE
  case per the brief's "whichever stages cheaper" -- a single-turn ability
  block is far cheaper to stage than 6 setup turns to pre-lower a stat to
  `-6` (§1.7 point 6, banked as source-only instead).

All three fixtures share the same `seed 1` frame-0 `rngValue` (`3034451114`,
confirmed identical across all three captures, not assumed) -- consistent
with both prior probes' own "RNG stream is a pure function of seed + script
topology" finding.

### 2.2 `EFFECT_ATTACK_UP_2` success (Swords Dance, seed 1)

FARFETCH'D: `statStages[ATK]` `6 -> 8` (a **+2** step in one hit -- Swords
Dance's `setstatchanger STAT_ATK, 2, FALSE`, unlike the secondary-effect
family which the topology join showed never exceeds `±1` in real move data).
PP[0] `30 -> 29`.

**Random() calls attributable to the move itself: zero**, both by source
proof (no `accuracycheck` opcode anywhere in `BattleScript_EffectAttackUp`/
`EffectStatUp`, confirmed by the literal script walk in §1.5; `ChangeStatBuffs`
itself is the same zero-`Random()` function the referenced doc already fully
read) and cross-checked structurally: the whole-window step count to frame
450 is **5** (`stepsToReach`, not assumed) -- entirely attributable to
Magneton's own turn + AI scoring, per the same attribution logic (and
identical step count) the referenced doc used for its own proc case. Not
chased down further to stay inside the time-box, same honesty flag as the
referenced doc's own unattributed step.

Party-record check: `statStages` is not a key on `parties.player[0]` (same
structural argument as the referenced doc's §2.4 -- the boxed-Pokémon format
has no stat-stage field, full stop, direction-independent).

### 2.3 `EFFECT_DEFENSE_DOWN` success (Tail Whip, seed 1) and blocked (Clear Body, seed 1)

**Success** (vs. MAGNETON): roll 1 (`Cmd_accuracycheck`, `ACC_CURR_MOVE`) =
`40931` -- identical to both prior probes' own seed-1 roll 1 (cross-scenario
RNG consistency, reconfirmed). `40931 % 100 + 1 = 32`, and since Tail Whip's
`accuracy` is `100`, `calc = 100`; `32 > 100` is false, so the hit lands.
**This is mathematically guaranteed for any seed** at 100 accuracy (`Random()
% 100 + 1` ranges `1..100`, never exceeds `calc = 100`), not an artifact of
the chosen seed -- a source-derived invariant, verified live too. MAGNETON:
`statStages[DEF]` `6 -> 5`, `hp` unchanged (`125 -> 125`, Tail Whip's `power`
is `0`). PP[0] `30 -> 29`.

**Blocked** (vs. METANG, same seed 1, same roll-1 value since Tail Whip's own
accuracy roll is identical regardless of target): METANG `ability` reads back
`29` (`ABILITY_CLEAR_BODY`, confirmed). `statStages[DEF]` stays `6 -> 6`. PP[0]
still `30 -> 29` (`ppreduce` runs *before* `statbuffchange` in the script,
unconditionally). **The frame-450 `rngValue` is byte-identical between the
blocked and unblocked runs** (`851470743` in both) -- i.e. the **same total
Random() call count (19 steps)** either way. This is the opposite of the
referenced doc's own Clear-Body finding for the *secondary*-effect path (which
reached frame 450 in the same 22 steps as its plain control, "costing zero
extra script execution" because the block there is silent, no
`BattleScriptPush`). Here, the primary-path block is **not free**: `flags ==
STAT_CHANGE_ALLOW_PTR` routes it through a real `BattleScriptPush(BS_ptr)` +
`BattleScript_AbilityNoStatLoss` sub-script (`pause`/`printstring
STRINGID_PKMNPREVENTSSTATLOSSWITH`/`waitmessage`/`return`) that costs
comparable real message-print time to the "Defense fell!" path it replaces --
which is exactly why the two runs' total step counts match rather than the
blocked one finishing faster. **This is the live proof of the brief's core
question** ("the ALLOW_PTR message path THIS time"): Growl/Tail-Whip-class
moves blocked by Clear Body visibly show "Foe's Metang's Clear Body prevents
its stats from being lowered!", unlike Crunch's secondary effect blocked by
the same ability, which shows nothing at all.

Party-record check: identical structural argument, `statStages` absent from
both `parties.opponent[0]` records.

## 3. Verify script

`tools/probe/verify-primary-stat-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-primary-stat-ground-truth.ts`)
reruns all three committed fixtures at seed 1 and checks, PASS/FAIL: determinism
(2 independent reruns of the UP and DOWN-success fixtures, byte-for-byte at
frames 0 and 450), the Swords-Dance `+2`-stage arithmetic, the Tail-Whip
`-1`-stage arithmetic and its guaranteed-hit accuracy-roll arithmetic, PP
decrements for all three fixtures, the Clear-Body ability readback and
stat-stage-unchanged assertion, the "blocked path is not free" rngValue-parity
check between the blocked and unblocked DOWN fixtures, and the absence of a
`statStages` key on every party record. All PASS at commit time:

```
$ node --experimental-strip-types tools/probe/verify-primary-stat-ground-truth.ts
...
PASS: 0 failing check(s)
```

## Recommended registration slice

**`EFFECT_ATTACK_UP`/`EFFECT_DEFENSE_UP`/`EFFECT_SPECIAL_ATTACK_UP`/
`EFFECT_EVASION_UP`/`EFFECT_ATTACK_UP_2`/`EFFECT_DEFENSE_UP_2`/`EFFECT_SPEED_UP_2`/
`EFFECT_SPECIAL_ATTACK_UP_2`/`EFFECT_SPECIAL_DEFENSE_UP_2`** (census row 3, 9
effects / 14 moves / 11 Factory-L50 / 120 weighted): register
`B_SCR_OP_STATBUFFCHANGE` (a thin wrapper around a ported `changeStatBuffs()`
helper -- ideally the **same** pure-logic core the secondary-effect slice
already needs to port, since the guard ladder is identical source, only the
`flags` shape differs at the call site) + `B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES`
+ `B_SCR_OP_PLAYANIMATION` (2 new, generic opcodes, reusable by both the UP
and DOWN families and by any future single-stat effect). **(b)-barrier
boundary**: the Mist/Clear-Body+White-Smoke/Keen-Eye+Hyper-Cutter ability
branches must actually push+jump this time (`STAT_CHANGE_ALLOW_PTR` is always
set) -- reusing the secondary-effect path's silent-block shortcut here would
be a **correctness regression**, not a simplification (§1.7, §2.3 prove the
message is real and live). Shield Dust must **not** be ported for this slice
at all (§1.7 point 5 -- structurally unreachable, porting it would be dead,
misleading code).

**`EFFECT_ATTACK_DOWN`/`EFFECT_DEFENSE_DOWN`/`EFFECT_SPEED_DOWN`/
`EFFECT_ACCURACY_DOWN`/`EFFECT_EVASION_DOWN`/`EFFECT_ATTACK_DOWN_2`/
`EFFECT_DEFENSE_DOWN_2`/`EFFECT_SPEED_DOWN_2`/`EFFECT_SPECIAL_DEFENSE_DOWN_2`**
(census row 4, 9 effects / 16 moves / 13 Factory-L50 / 82 weighted): the same
3 opcodes plus `B_SCR_OP_JUMPIFSTATUS2` (the Substitute early-out, a small,
generic, likely-shared-with-other-families opcode) and `B_SCR_OP_ORBYTE`
(needed only for the `BattleScript_ButItFailed` Protect-edge target, §1.6 --
**(b)-barrier boundary**: this branch is live-confirmed dead in practice for
this family specifically because `accuracycheck`'s own Protect gate, a few
opcodes earlier in the *same* script, already diverts a Protected target away
before `statbuffchange` ever runs (§1.7 point 2) -- port it for bytecode
completeness/topology-walk correctness, not because it is expected to ever
fire for a real move). **Growl itself is not a usable live-staging target**
(zero Factory-legal L50 carriers per the census); Tail Whip/Leer (both
`EFFECT_DEFENSE_DOWN`) are the real representative carriers for this row.

**Deferred, unchanged from the prior probe** -- `Cmd_playstatchangeanimation`
(`B_SCR_OP_PLAYSTATCHANGEANIMATION`, the multi-stat sibling mechanism, §1.4)
and the already-at-bound numeric quirk's live staging (§1.7 point 6, source-proven,
not live-staged) are both real, honestly-scoped gaps for a follow-up probe,
not silently dropped.
