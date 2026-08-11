# EFFECT_SEMI_INVULNERABLE trio — registration ground truth (prep-scout)

Side-lane prep-scout for `docs/executable-frontier-census.md`'s current top
ranked row: `B_SCR_OP_CLEARSEMIINVULNERABLEBIT`, `B_SCR_OP_
CLEARSTATUSFROMEFFECT`, `B_SCR_OP_SETSEMIINVULNERABLEBIT` (claimed: 1 effect
/ 4 moves / 4 Factory-L50 / 32 weighted, EFFECT_SEMI_INVULNERABLE). No `src/`
or `tools/` edits in this scout — everything below is read-only source/
engine analysis plus this new doc.

## Headline correction to the census

**The ranked table's promise is false as stated: registering exactly the
named 3-opcode trio would NOT flip `EFFECT_SEMI_INVULNERABLE` to executable.**
The census's own per-effect table already contains the evidence (its
"Subsystem notes" column), but the ranked table at the top of the doc groups
rows by `missingOpcodes` alone and ignores `subsystemNotes` when computing
"effects unlocked" — confirmed directly from the generator
(`tools/report/executable-frontier-census.ts:729-730`: `if (row.report.
classification.kind !== "blocked-on-opcodes") continue;` groups by
`missingOpcodes` only, never consulting `subsystemNotes`). This is the same
root-cause shape as the Roar/multi-hit scout's finding (a walker/grouping
tool that only understands one shape of "blocker"), just one layer further
down the same tool.

**The real, load-bearing gap:** `BattleScript_EffectSemiInvulnerable`'s own
first-turn setup calls the shared subroutine `BattleScriptFirstChargingTurn`
(`data/battle_scripts_1.s:795-807`), which executes `setmoveeffect
MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER` then `seteffectprimary` —
**unconditionally, on every reachable path, before `clearstatusfromeffect`,
`setsemiinvulnerablebit`, or `clearsemiinvulnerablebit` are ever reached.**
`MOVE_EFFECT_CHARGING` is not in the engine's own exported
`SET_MOVE_EFFECT_SUPPORTED_BYTES` (`src/engine/battleScriptHitChainOpcode.ts:
441-454`), so `applySetMoveEffect`'s family-B branch (`effectByte >
PRIMARY_STATUS_MOVE_EFFECT`, `battleScriptHitChainOpcode.ts:2394-2417`) falls
through to `unsupportedBranch(..., "battle_script_commands.c", 2522)` for
this value today. `B_SCR_OP_SETEFFECTPRIMARY`/`B_SCR_OP_SETEFFECTWITHCHANCE`
are both already-registered opcodes — this is a narrow **operand-value**
barrier on a registered dispatcher, invisible to the ranked table's
opcode-name grouping, exactly the "per-operand blind spot" class that hit
every registration step in the roar-multihit session (entries 519/523/525/
526).

**Three more hidden barriers of the identical shape, found by tracing every
opcode `BattleScriptFirstChargingTurn` and each effect's own entry guard
actually touch (not by trusting the census's per-effect table at face
value):**

1. **`JUMPIFWORD_VALUES` is missing `HITMARKER_NO_ATTACKSTRING`**
   (`battleScriptJumpifwordOpcode.ts:73-90`). Every one of the five two-turn
   effects' own entry scripts (not just Semi-Invulnerable) runs `jumpifword
   CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING, ...` as their
   *second* instruction, unconditionally. `gHitMarker` is a modeled memWord
   pointer (`readJumpifwordMemWord`, same file, already resolves it) but the
   comparison value itself has no map entry — `JUMPIFWORD` is a registered
   opcode name, so this barrier is invisible to `missingOpcodes` and, unlike
   `jumpifability`/`setmoveeffect`, this file's memWord *value* gaps are not
   specially tracked by the census walker at all (confirmed against `tools/
   report/executable-frontier-census.ts:379-412`, which only intercepts
   `jumpifability` and the two SetMoveEffect dispatch opcodes).
2. **`COPYARRAY`'s explicit tuple whitelist is missing `(cMULTISTRING_CHOOSER,
   sTWOTURN_STRINGID, 0x1)`** (`battleScriptIngrainLeechSeedWrapOpcode.ts:
   156-206`, the `createCopyarrayHandler` tuple `if` chain). `Battle
   ScriptFirstChargingTurn`'s `copybyte cMULTISTRING_CHOOSER, sTWOTURN_
   STRINGID` (macro sugar for `copyarray cMULTISTRING_CHOOSER,
   sTWOTURN_STRINGID, 1`) is not one of the four registered tuples — falls to
   the file's own `unsupportedBranch` at `battle_script_commands.c:3837`.
   `COPYARRAY` is registered; this is a narrow tuple gap on it, same class as
   the roar-multihit scout's `(cEFFECT_CHOOSER, sMULTIHIT_EFFECT, 1)` finding
   that PROGRESS 526 caught live.
3. **`PRINTFROMTABLE_TABLES` is missing `gFirstTurnOfTwoStringIds`**
   (`battleScriptHitChainOpcode.ts:259-364`). `BattleScriptFirstChargingTurn`'s
   last real instruction, `printfromtable gFirstTurnOfTwoStringIds`, has no
   registered table entry — `PRINTFROMTABLE` is registered; the specific
   8-entry table (`src/battle_message.c:1025-1035`) is simply absent from the
   engine's own table map.

All four of these sit on `BattleScriptFirstChargingTurn`'s own body or each
effect's own entry guard — **shared verbatim by all five two-turn-charge
effects** (`EFFECT_RAZOR_WIND`, `EFFECT_SKY_ATTACK`, `EFFECT_SKULL_BASH`,
`EFFECT_SOLAR_BEAM`, `EFFECT_SEMI_INVULNERABLE`), not Semi-Invulnerable-
exclusive. That has a real consequence for the predicted flip arithmetic —
see "Corrected predicted flip" below: registering the assigned trio plus
these four widenings does not just flip `EFFECT_SEMI_INVULNERABLE`, it also
collaterally flips `EFFECT_RAZOR_WIND`/`EFFECT_SKY_ATTACK`/`EFFECT_SKULL_BASH`
(none of which need `SETSEMIINVULNERABLEBIT`/`CLEARSEMIINVULNERABLEBIT` —
those two are Semi-Invulnerable-exclusive — but all three need
`CLEARSTATUSFROMEFFECT` plus the same four widenings), a combination the
brief's cross-effect-reuse framing (SOLAR_BEAM, RAGE) does not mention at
all.

One further finding, noted for completeness but **not part of this
registration set** (Solar Beam's own extra gap, invisible to the census for
the same reason as #1 above): `BattleScript_EffectSolarBeam`'s own
`jumpifhalfword CMP_COMMON_BITS, gBattleWeather, B_WEATHER_SUN, ...`
(`data/battle_scripts_1.s:1906`) uses `gBattleWeather` as its memHword
pointer, which `readJumpifhalfwordMemHword` does not resolve (only
`gCurrentMove`/`gChosenMove`, `battleScriptJumpifhalfwordOpcode.ts:70-77`) —
see the cross-effect section.

## 1. Raw topology, flattened from source

### 1a. `BattleScript_EffectSemiInvulnerable` + charge-turn call graph

```
BattleScript_EffectSemiInvulnerable:: (data/battle_scripts_1.s:1973-1981)
	jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_SecondTurnSemiInvulnerable
	jumpifword CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING, BattleScript_SecondTurnSemiInvulnerable
	jumpifmove MOVE_FLY, BattleScript_FirstTurnFly
	jumpifmove MOVE_DIVE, BattleScript_FirstTurnDive
	jumpifmove MOVE_BOUNCE, BattleScript_FirstTurnBounce
	setbyte sTWOTURN_STRINGID, B_MSG_TURN1_DIG
	goto BattleScript_FirstTurnSemiInvulnerable

BattleScript_FirstTurnBounce/Dive/Fly:: (:1982-1992)
	setbyte sTWOTURN_STRINGID, B_MSG_TURN1_{BOUNCE,DIVE,FLY}
BattleScript_FirstTurnSemiInvulnerable:: (:1992-1995)
	call BattleScriptFirstChargingTurn
	setsemiinvulnerablebit
	goto BattleScript_MoveEnd

BattleScriptFirstChargingTurn:: (:795-807, shared with RazorWind/SkyAttack/SkullBash/SolarBeam)
	attackcanceler
	printstring STRINGID_EMPTYSTRING3
	ppreduce
	attackanimation
	waitanimation
	orword gHitMarker, HITMARKER_CHARGING
	setmoveeffect MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER
	seteffectprimary
	copybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID
	printfromtable gFirstTurnOfTwoStringIds
	waitmessage B_WAIT_TIME_LONG
	return

BattleScript_SecondTurnSemiInvulnerable:: (:1997-2012)
	attackcanceler
	setmoveeffect MOVE_EFFECT_CHARGING
	setbyte sB_ANIM_TURN, 1
	clearstatusfromeffect BS_ATTACKER
	orword gHitMarker, HITMARKER_NO_PPDEDUCT
	jumpifnotmove MOVE_BOUNCE, BattleScript_SemiInvulnerableTryHit
	setmoveeffect MOVE_EFFECT_PARALYSIS
BattleScript_SemiInvulnerableTryHit::
	accuracycheck BattleScript_SemiInvulnerableMiss, ACC_CURR_MOVE
	clearsemiinvulnerablebit
	goto BattleScript_HitFromAtkString      @ generic shared hit-chain tail, already fully executable

BattleScript_SemiInvulnerableMiss::
	clearsemiinvulnerablebit
	goto BattleScript_PrintMoveMissed       @ generic, already fully executable (attackstring/ppreduce/pause/
	                                          effectivenesssound/resultmessage/waitmessage/goto, all registered)
```

### 1b. Per-instruction operand-value audit (every reachable opcode, not just opcode names)

| Instruction | Opcode | Value needed | Registered? |
| --- | --- | --- | --- |
| `jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS` | `JUMPIFSTATUS2` (registered) | `STATUS2_MULTIPLETURNS` | **yes** — `JUMPIFSTATUS2_VALUES` (`battleScriptStatbuffchangeOpcode.ts:311-315`), registered by the Thrash/Outrage cluster (docs/yawn-thrash-endturn-design.md) |
| `jumpifword CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING` | `JUMPIFWORD` (registered) | `HITMARKER_NO_ATTACKSTRING` (`1<<9`, `include/constants/battle.h:186`) | **no** — genuine gap, `JUMPIFWORD_VALUES` (`battleScriptJumpifwordOpcode.ts:73-90`) has `BATTLE_TYPE_DOUBLE/LINK/TRAINER/RECORDED_LINK/FRONTIER/ARENA`, `HITMARKER_PLAYER_FAINTED` only |
| `jumpifmove MOVE_FLY/MOVE_DIVE/MOVE_BOUNCE` (sugar for `jumpifhalfword CMP_EQUAL, gCurrentMove, ..., ptr`) | `JUMPIFHALFWORD` (registered) | any `MOVE_*` literal vs `gCurrentMove` | **yes** — `gCurrentMove` is the load-bearing memHword pointer (`readJumpifhalfwordMemHword`, `battleScriptJumpifhalfwordOpcode.ts:76`); the value universe is the full source-derived move catalog, not a hand-picked subset (`MOVE_ID_BY_NAME`, same file:62-66) |
| `setbyte sTWOTURN_STRINGID, B_MSG_TURN1_{DIG,BOUNCE,DIVE,FLY}` | `SETBYTE` (registered) | pointer `sTWOTURN_STRINGID` + all 8 `B_MSG_TURN1_*` literals | **yes** — pointer at `battleScriptSetByte.ts:55`, literals at `:74-81` (all 8 present, not just the 4 this trio uses — SolarBeam/SkullBash/SkyAttack/RazorWind's own values are already there too) |
| `call BattleScriptFirstChargingTurn` / `return` | generic call/return | — | yes |
| `attackcanceler`/`ppreduce`/`printstring`/`attackanimation`/`waitanimation`/`waitmessage`/`goto` | generic | — | yes (used by every executable effect) |
| `orword gHitMarker, HITMARKER_CHARGING` | `ORWORD` (registered) | `HITMARKER_CHARGING` (`1<<27`) | **yes** — `ORWORD_HITMARKER_BITS` (`battleScriptOrwordOpcode.ts:44-56`) |
| `setmoveeffect MOVE_EFFECT_CHARGING \| MOVE_EFFECT_AFFECTS_USER` (sugar for `setbyte cEFFECT_CHOOSER, ...`) | `SETBYTE` (registered) | literal `12 \| 64` | **yes** — `battleScriptSetByte.ts:188` (`"MOVE_EFFECT_CHARGING \| MOVE_EFFECT_AFFECTS_USER": 12 \| 64`), `cEFFECT_CHOOSER` pointer at `:32,245,282` |
| `seteffectprimary` (consumes the byte the prior `setmoveeffect` staged) | `SETEFFECTPRIMARY` (registered) | `MOVE_EFFECT_CHARGING` reaching `applySetMoveEffect`'s family-B dispatch | **no** — genuine gap, see Headline correction §1 |
| `copybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID` (sugar for `copyarray ..., 1`) | `COPYARRAY` (registered) | tuple `(cMULTISTRING_CHOOSER, sTWOTURN_STRINGID, 0x1)` | **no** — genuine gap, see Headline correction §2 |
| `printfromtable gFirstTurnOfTwoStringIds` | `PRINTFROMTABLE` (registered) | table `gFirstTurnOfTwoStringIds` | **no** — genuine gap, see Headline correction §3 |
| `setmoveeffect MOVE_EFFECT_CHARGING` (2nd-turn entry, no `AFFECTS_USER`) | `SETBYTE` | literal `12` | **yes** — `battleScriptSetByte.ts:100` |
| `setbyte sB_ANIM_TURN, 1` | `SETBYTE` | pointer `sB_ANIM_TURN` + literal `1`/`TRUE` | yes — generic pointer/literal, already exercised elsewhere |
| `clearstatusfromeffect BS_ATTACKER` | `CLEARSTATUSFROMEFFECT` | — | **no** — the trio's own named target, see §2 below |
| `orword gHitMarker, HITMARKER_NO_PPDEDUCT` | `ORWORD` (registered) | `HITMARKER_NO_PPDEDUCT` (`1<<11`) | **yes** — `ORWORD_HITMARKER_BITS` (`battleScriptOrwordOpcode.ts:48`) |
| `jumpifnotmove MOVE_BOUNCE` (sugar for `jumpifhalfword CMP_NOT_EQUAL, gCurrentMove, ...`) | `JUMPIFHALFWORD` (registered) | `gCurrentMove` vs `MOVE_BOUNCE` | **yes** — same as `jumpifmove` above |
| `setmoveeffect MOVE_EFFECT_PARALYSIS` (Bounce only) | `SETBYTE` | literal `5` | **yes** — `battleScriptSetByte.ts:93` |
| `accuracycheck BattleScript_SemiInvulnerableMiss, ACC_CURR_MOVE` | `ACCURACYCHECK` (registered) | `ACC_CURR_MOVE` | **yes** — the load-bearing common case; the attacker's own semi-invulnerability does **not** gate this check (it gates *incoming* moves' accuracy against the attacker while charging, a separate call site — see §2b) |
| `setsemiinvulnerablebit` | `SETSEMIINVULNERABLEBIT` | — | **no** — the trio's own named target, see §2a |
| `clearsemiinvulnerablebit` (both the hit and miss tails) | `CLEARSEMIINVULNERABLEBIT` | — | **no** — the trio's own named target, see §2a |
| `BattleScript_HitFromAtkString` tail | generic shared hit-chain | — | yes, already fully registered (per census's own `EFFECT_RECOIL_IF_MISS` positive) |
| `BattleScript_PrintMoveMissed` tail | generic | — | yes |

So the true opcode/operand set standing between here and `EFFECT_SEMI_
INVULNERABLE` executing is **3 new opcodes** (`SETSEMIINVULNERABLEBIT`,
`CLEARSEMIINVULNERABLEBIT`, `CLEARSTATUSFROMEFFECT`) **plus 3 narrow
widenings on already-registered dispatchers** (`JUMPIFWORD` + `HITMARKER_
NO_ATTACKSTRING`, `COPYARRAY` + the `cMULTISTRING_CHOOSER`/`sTWOTURN_
STRINGID` tuple, `PRINTFROMTABLE` + `gFirstTurnOfTwoStringIds`) **plus one
data-model dispatch widening** (`applySetMoveEffect`'s `MOVE_EFFECT_CHARGING`
case) — 7 line items, not 3.

## 2. Source derivation

### 2a. `Cmd_setsemiinvulnerablebit` / `Cmd_clearsemiinvulnerablebit` (`battle_script_commands.c:9009-9045`)

```c
static void Cmd_setsemiinvulnerablebit(void)
{
    switch (gCurrentMove) {
    case MOVE_FLY: case MOVE_BOUNCE: gStatuses3[gBattlerAttacker] |= STATUS3_ON_AIR;      break;
    case MOVE_DIG:                    gStatuses3[gBattlerAttacker] |= STATUS3_UNDERGROUND; break;
    case MOVE_DIVE:                   gStatuses3[gBattlerAttacker] |= STATUS3_UNDERWATER;  break;
    }
    gBattlescriptCurrInstr++;
}
// Cmd_clearsemiinvulnerablebit is the exact mirror: &= ~ instead of |=.
```

Zero-operand, unconditional advance, switch keyed on `gCurrentMove` (already
a modeled field everywhere), writes `gBattlerAttacker`'s own `status3` bits
(`STATUS3_ON_AIR = 1<<6`, `STATUS3_UNDERGROUND = 1<<7`, `STATUS3_UNDERWATER =
1<<18`, `include/constants/battle.h:163-175`). Trivially (a)-portable — a
pure `battlers[attacker].status3` bit write keyed on a `gCurrentMove` switch,
structurally identical to `setminimize`'s already-registered shape
(`battle_script_commands.c:9047-9053`, `STATUS3_MINIMIZED`). Note Fly and
Bounce share the same bit (`STATUS3_ON_AIR`) — Bounce is mechanically "Fly
plus a paralysis chance," not a distinct semi-invulnerable state.

### 2b. Does the engine's `accuracycheck` already model the ON_AIR/UNDERGROUND/UNDERWATER dodge?

**Yes, already source-complete — confirmed against `AccuracyCalcHelper`
(`battle_script_commands.c:1054-1097`) line by line.** This is the
*consumer* side of `setsemiinvulnerablebit`'s write: when some *other* move
targets a battler currently marked `STATUS3_ON_AIR`/`UNDERGROUND`/
`UNDERWATER`, `Cmd_accuracycheck`'s `ACC_CURR_MOVE` branch
(`accuracycheckOpcodeHandler`, `battleScriptHitChainOpcode.ts:826-905`)
already checks `targetBattler.status3 & BATTLE_SCRIPT_STATUS3_{ON_AIR,
UNDERGROUND,UNDERWATER}` in that exact order (`:873,881,890`) and forces a
miss unless the matching `HITMARKER_IGNORE_{ON_AIR,UNDERGROUND,UNDERWATER}`
bit is set (the mechanism Gust/Twister/Earthquake/Magnitude/Surf/Whirlpool
use to hit through Fly/Dig/Dive) — a faithful port of the real function's
`HITMARKER_IGNORE_ON_AIR`/`_UNDERGROUND`/`_UNDERWATER` short-circuit chain.
The `NO_ACC_CALC_CHECK_LOCK_ON` branch (`accuracycheckNoAccCalcCheckLockOn`,
same file:776-814) models the identical semi-invulnerable-miss check for
that argument form too (`:794-802`). **This means registering the trio does
not require touching `accuracycheck` at all** — the half of the mechanic
that makes *other* moves whiff against a Flying/Digging/Diving/Bouncing
target is already correct and already exercised (every already-executable
`EFFECT_HIT`-family script's own `ACC_CURR_MOVE` check runs this same code
path). Only the *write* side (`setsemiinvulnerablebit`/
`clearsemiinvulnerablebit` themselves) is missing.

### 2c. `Cmd_clearstatusfromeffect` (`battle_script_commands.c:2951-2963`)

```c
static void Cmd_clearstatusfromeffect(void)
{
    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
    if (gBattleCommunication[MOVE_EFFECT_BYTE] <= PRIMARY_STATUS_MOVE_EFFECT)
        gBattleMons[gActiveBattler].status1 &= ~sStatusFlagsForMoveEffects[gBattleCommunication[MOVE_EFFECT_BYTE]];
    else
        gBattleMons[gActiveBattler].status2 &= ~sStatusFlagsForMoveEffects[gBattleCommunication[MOVE_EFFECT_BYTE]];
    gBattleCommunication[MOVE_EFFECT_BYTE] = 0;
    gBattlescriptCurrInstr += 2;
    gBattleScripting.multihitMoveEffect = 0;
}
```

Not a `switch` with per-effect case arms — a **table-driven AND-mask clear**
keyed on whichever `MOVE_EFFECT_*` byte the *preceding* `setmoveeffect`
statement staged (`gBattleCommunication[MOVE_EFFECT_BYTE]`, the same
`cEFFECT_CHOOSER` scratch field `SETBYTE`/`SETEFFECTPRIMARY`/
`SETEFFECTWITHCHANCE` already share). `sStatusFlagsForMoveEffects`
(`battle_script_commands.c:608-625`) is a 60-entry designated-initializer
array; unlisted indices default to 0 (mask = 0, so the AND is a genuine
runtime no-op — status1/status2 unchanged, but `MOVE_EFFECT_BYTE`/
`multihitMoveEffect` still get reset). The **only two values any committed
script feeds this opcode** (per the census's own per-effect table, both
already confirmed against source):

| `MOVE_EFFECT_BYTE` value | `sStatusFlagsForMoveEffects[...]` | Branch taken | Effect |
| --- | --- | --- | --- |
| `MOVE_EFFECT_CHARGING` (12) | `STATUS2_MULTIPLETURNS` (`1<<12`, `:619`) | `status2 &=` (12 > `PRIMARY_STATUS_MOVE_EFFECT`=6) | `EFFECT_RAZOR_WIND`, `EFFECT_SKY_ATTACK`, `EFFECT_SKULL_BASH`, `EFFECT_SOLAR_BEAM`, `EFFECT_SEMI_INVULNERABLE` (all 5, on their `BattleScript_TwoTurnMovesSecondTurn`/`BattleScript_SecondTurnSemiInvulnerable` second-turn entry) |
| `MOVE_EFFECT_RAGE` (30) | **not in the table → 0** | `status2 &= ~0` (genuine no-op on the status bits; `MOVE_EFFECT_BYTE`/`multihitMoveEffect` still reset) | `EFFECT_RAGE` (`BattleScript_RageMiss` only) |

A faithful, minimal port needs a small lookup exactly like every other
narrow value table this engine already uses (`JUMPIFABILITY_VALUES`,
`JUMPIFSTATUS2_VALUES`, ...): `{MOVE_EFFECT_CHARGING: STATUS2_MULTIPLETURNS}`
with unlisted bytes (including `MOVE_EFFECT_RAGE`) defaulting to mask `0` —
matching the real array's own designated-initializer default exactly, not a
`(b)` barrier. The `gBattleScripting.multihitMoveEffect = 0` write is a
presentation/plumbing field this engine does not model (same boundary
`Cmd_initmultihitstring`'s own doc comment already established for
`sMULTIHIT_STRING`'s first bytes) — safe to omit as a pure no-op, matching
precedent.

### 2d. The two-turn charge machinery — what the C does, what already exists, what's genuinely new

The "is this the second turn" mechanism is **not** a dedicated `jumpifsecondturn`-style opcode — there is no such opcode in the committed program. It is exactly two already-general primitives:

1. **`STATUS2_MULTIPLETURNS`** (`1<<12`), set by `applySetMoveEffect`'s
   `MOVE_EFFECT_CHARGING` case (`battle_script_commands.c:2605-2610`,
   quoted below) and read back by each effect's own `jumpifstatus2
   BS_ATTACKER, STATUS2_MULTIPLETURNS, <SecondTurnLabel>` at the very top of
   its script. **Already fully modeled on the read side** (`JUMPIFSTATUS2_
   VALUES` already has this exact bit, registered for the Thrash/Outrage/
   Petal-Dance cluster) — only the *write* side (the `SetMoveEffect` case
   itself) is missing.
2. **`gLockedMoves[gEffectBattler] = gCurrentMove`** — the per-battler
   "which move is forced next turn" selector, read back exactly once in
   `HandleAction_UseMove` (`battle_util.c:109`), which decides which move a
   battler's queued action actually executes. **This engine has no ported
   equivalent of `HandleAction_UseMove` anywhere** — confirmed by the
   existing precedent at `battleScriptHitChainOpcode.ts:2839-2852`
   (`applyThrashMoveEffect`'s own doc comment, established for
   `MOVE_EFFECT_THRASH`'s structurally identical `gLockedMoves` write):
   every call site that starts a move's execution in this codebase
   (`factoryBattleScriptFullTurnDecision.ts`'s `buildActionContext`/
   `runMoveAction`, every battle-lab/Tier-1 test) takes the move id as an
   external given, never derives it internally. So `gLockedMoves` has **no
   read-back consumer in this codebase at any layer** — the exact same
   "state written but provably unobservable here" shape `MOVE_EFFECT_SLEEP`/
   `MOVE_EFFECT_FREEZE`/`MOVE_EFFECT_THRASH` already establish. **Do not
   port this write** for `MOVE_EFFECT_CHARGING` either, following the
   established precedent exactly.

`gProtectStructs[gEffectBattler].chargingTurn = 1` (the third write in
`SetMoveEffect`'s `MOVE_EFFECT_CHARGING` case) **is already a modeled
field** — `BattleScriptRulesContext.battlers[i].chargingTurn`
(`battleScriptRulesContext.ts:196-197,1793-1796`), a real `ProtectStruct::
chargingTurn` port. Its one consumer, `resolveBattleScriptMoveEndNextTarget`
(`battleScriptRulesContext.ts:1022-1042`), gates a doubles-only
`MOVEEND_NEXT_TARGET` spread-move replay (`battleTypeFlags & BATTLE_TYPE_
DOUBLE`) — always false for Factory-L50 singles, so this write has zero
observable effect in this run's scope, but *should* still be written
faithfully (the field already exists and is cheap to set correctly, unlike
`gLockedMoves` which has nothing to write into).

**The real C case, in full** (`battle_script_commands.c:2605-2610`):

```c
case MOVE_EFFECT_CHARGING:
    gBattleMons[gEffectBattler].status2 |= STATUS2_MULTIPLETURNS;
    gLockedMoves[gEffectBattler] = gCurrentMove;               // not ported (see above)
    gProtectStructs[gEffectBattler].chargingTurn = 1;
    gBattlescriptCurrInstr++;
    break;
```

This sits inside `applySetMoveEffect`'s family-B branch (`effectByte >
PRIMARY_STATUS_MOVE_EFFECT`), which in the real C first re-checks the shared
early-out `if (status2 & sStatusFlagsForMoveEffects[byte]) { instr++; }`
(`:2523-2524`) before the switch — for `MOVE_EFFECT_CHARGING`,
`sStatusFlagsForMoveEffects[MOVE_EFFECT_CHARGING] == STATUS2_MULTIPLETURNS`,
so this early-out is checking "is `STATUS2_MULTIPLETURNS` already set,"
which is always false the one time `BattleScriptFirstChargingTurn` runs
(turn 1, before the bit is ever set) — dead code in this specific calling
context, exactly matching the existing precedent's own reasoning for
`applyThrashMoveEffect`'s (`STATUS2_LOCK_CONFUSE`) and `applyWrapMoveEffect`'s
early-outs (each function ports its own inline `alreadySet` check rather
than sharing one). A new `applyChargingMoveEffect` function following that
exact established shape — `if ((effectBattlerState.status2 &
STATUS2_MULTIPLETURNS) !== 0) return passThrough();` else `withBattler(...,
{status2: ... | STATUS2_MULTIPLETURNS, chargingTurn: 1})` then `advance` —
is a direct structural clone of `applyThrashMoveEffect`
(`battleScriptHitChainOpcode.ts:2854-2887`), simpler still since it draws no
RNG and never pushes/jumps to a message script (`SetMoveEffect`'s switch
just `break`s for this case, matching Thrash's own "not a call, an advance"
note).

## 3. RNG/ledger notes

- **Turn 1 (`BattleScriptFirstChargingTurn`, both the `call`-based route and
  Solar Beam's own inlined `BattleScript_SolarBeamOnFirstTurn` copy): zero
  `Random()` draws.** `attackcanceler`/`ppreduce`/`SetMoveEffect`'s
  `MOVE_EFFECT_CHARGING` case are all deterministic; no accuracy check runs
  on the charge turn itself.
- **Turn 2 (`BattleScript_SecondTurnSemiInvulnerable`): exactly the ordinary
  single-hit ledger.** One `accuracycheck ACC_CURR_MOVE` roll (`Random() %
  100 + 1` against the move's real accuracy — Fly/Dig/Bounce are 95,
  Dive is 100, so Dive's second-turn attack cannot miss on the accuracy
  roll itself, though `AccuracyCalcHelper`'s stat-stage math still runs),
  then the shared hit-chain's own crit roll + damage-variance roll via
  `BattleScript_HitFromAtkString` → `critcalc`/`damagecalc` (2 more draws),
  matching every other already-executable single-hit `EFFECT_HIT`-family
  move exactly — no extra rolls specific to this cluster. **Bounce only:**
  a further `seteffectwithchance` roll for `MOVE_EFFECT_PARALYSIS`'s
  secondary-effect chance (30% per the real move data), same mechanism
  already exercised by every other already-executable secondary-effect move
  — not a new ledger shape.
- **No fixtures staged this session** (same scope call as the roar-multihit
  precedent: the four hidden widenings above needed source-level
  confirmation first, which consumed this session's time budget; a live
  capture would need `overrides.parties` with the target holding a
  100-accuracy semi-invulnerable move — only `MOVE_DIVE` qualifies — plus a
  controlled seed to pin the 2-roll turn-2 tail. Recipe: Level 50 singles,
  attacker knows `MOVE_DIVE` (id 291, 100 accuracy — the only member of the
  quartet without a possible turn-2 accuracy-roll miss, removing one
  confound), target any species with `MOVE_SPLASH` ×4; capture `rngValue` at
  the pre-move frame of each of the two turns and step
  `gRngValue = (1103515245 * gRngValue + 24691) mod 2^32` forward by hand
  (top 16 bits of the new value is `Random()`'s result) to cross-check: 0
  draws on turn 1, then 1 (accuracy, guaranteed pass for Dive) + 2
  (crit/damage) draws on turn 2.

## 4. Cross-effect reuse of `CLEARSTATUSFROMEFFECT` — the full map, corrected

The brief names `EFFECT_SOLAR_BEAM` and `EFFECT_RAGE`; the census's own
per-effect table (not the ranked table) shows the real set is **six**
effects, all sharing the identical `MOVE_EFFECT_CHARGING` shape found in §1
above plus `CLEARSTATUSFROMEFFECT` itself:

| Effect | Own extra opcode need(s) beyond the shared set | Moves | Factory-L50 (weighted) | Flips alongside the trio? |
| --- | --- | --- | --- | --- |
| `EFFECT_SEMI_INVULNERABLE` | `SETSEMIINVULNERABLEBIT`, `CLEARSEMIINVULNERABLEBIT` (exclusive to this effect) | 4 | 4 (32) | yes — this scout's primary target |
| `EFFECT_RAZOR_WIND` | none — `CLEARSTATUSFROMEFFECT` + the 3 shared widenings + the `MOVE_EFFECT_CHARGING` dispatch case is everything it needs | 1 | 1 (2) | **yes, collaterally** — not named by the brief |
| `EFFECT_SKY_ATTACK` | none (its own extra `setmoveeffect MOVE_EFFECT_FLINCH` on the taken second-turn branch is already supported — `MOVE_EFFECT_FLINCH` is in `SET_MOVE_EFFECT_SUPPORTED_BYTES`) | 1 | 1 (1) | **yes, collaterally** — not named by the brief |
| `EFFECT_SKULL_BASH` | none | 1 | 0 (0, not in the Factory-L50 850-set) | **yes, collaterally** (unweighted only) — not named by the brief |
| `EFFECT_SOLAR_BEAM` | `JUMPIFABILITYPRESENT` (genuinely new opcode, `Cmd_jumpifabilitypresent`, `battle_script_commands.c:3991-3997` — checks whether *any* battler on the field has the given ability via `AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, 0, ability, 0, 0)`, structurally distinct from the already-registered single-battler `JUMPIFABILITY`) **plus** a newly-found, census-invisible gap: `jumpifhalfword CMP_COMMON_BITS, gBattleWeather, B_WEATHER_SUN, BattleScript_SolarBeamOnFirstTurn` (`data/battle_scripts_1.s:1906`) needs `gBattleWeather` added to `readJumpifhalfwordMemHword` (`battleScriptJumpifhalfwordOpcode.ts:70-77`, currently only `gCurrentMove`/`gChosenMove`) — invisible to the census because, unlike `jumpifability`'s narrow-value tracking, the walker never special-cases `jumpifhalfword`'s memHword pointer (`tools/report/executable-frontier-census.ts:379-412`) | 1 | 1 (16) | **no** — needs its own separate opcode + gap beyond this registration set |
| `EFFECT_RAGE` | none beyond `CLEARSTATUSFROMEFFECT` itself for the `BattleScript_RageMiss` edge — but its **main path** (`seteffectprimary MOVE_EFFECT_RAGE`, unconditional) hits its own separate, still-unresolved `applySetMoveEffect` gap (`MOVE_EFFECT_RAGE` is likewise absent from `SET_MOVE_EFFECT_SUPPORTED_BYTES`, and `sStatusFlagsForMoveEffects[MOVE_EFFECT_RAGE]` is a genuine 0/no-op per §2c, a *different* fix than `MOVE_EFFECT_CHARGING`'s) — so `EFFECT_RAGE` reclassifies `blocked-on-opcodes` → `blocked-on-subsystem` after this rung set, **never reaching `executable`** without that separate widening too | 1 | **0 (0)** — the move using this effect is not in the Factory-L50 850-set at all | **no** — 0 weighted impact either way; document only |

**Net:** registering the assigned trio + the four shared widenings (§1)
flips **4 effects, not 1** — `EFFECT_SEMI_INVULNERABLE` plus, as a genuine
side effect the brief's framing missed, `EFFECT_RAZOR_WIND`/`EFFECT_
SKY_ATTACK`/`EFFECT_SKULL_BASH` — for **7 moves / 6 Factory-L50 unweighted /
35 weighted**, not the ranked table's claimed 4/4/32. `EFFECT_SOLAR_BEAM`
needs its own separate `JUMPIFABILITYPRESENT` opcode plus the newly-found
`gBattleWeather` widening on top of everything here (out of this
registration set's scope, but flagged with exact file:line for a follow-up
step). `EFFECT_RAGE` gets zero weighted benefit either way (its one move is
outside the Factory-L50 850-set) and needs a *different* `applySetMoveEffect`
widening (`MOVE_EFFECT_RAGE`, not `MOVE_EFFECT_CHARGING`) that this
registration set does not include — noted for completeness, not actionable
here.

One further duplicate worth flagging so a follow-up worker doesn't chase a
phantom fifth gap: the census's per-effect table lists the `MOVE_EFFECT_
CHARGING` subsystem note **twice** for all five two-turn effects — once via
`Cmd_seteffectprimary` (the real, load-bearing gap above) and once via
`Cmd_seteffectwithchance`. The second is almost certainly an artifact of the
census walker's own `pendingEffect` tracking, not an independent second call
site: `Cmd_clearstatusfromeffect`'s real C resets `gBattleCommunication[
MOVE_EFFECT_BYTE] = 0` (`:2960`), but the walker (`tools/report/
executable-frontier-census.ts:379-412`) never models that reset, so a stale
`pendingEffect = "MOVE_EFFECT_CHARGING"` set by `BattleScript_
SecondTurnSemiInvulnerable`'s own `setmoveeffect` statement survives past
`clearstatusfromeffect` in the walker's model and is still "pending" when
the walk later reaches `BattleScript_HitFromAtkString`'s shared tail
`seteffectwithchance` call. One fix (§5 rung 2, the `applySetMoveEffect`
`MOVE_EFFECT_CHARGING` case) resolves both notes simultaneously — this is
not two separate widenings.

## 5. Ordered registration plan (rungs)

Each rung names the file(s) it touches, what it composes with, and its test
obligation. (a)/(b) classifications per ROADMAP S10 §1. Rungs 1-4 are
shared prerequisites (block all five two-turn-charge effects, not just the
trio); rungs 5-7 are Semi-Invulnerable's own exclusive opcodes.

1. **`JUMPIFWORD_VALUES` + `HITMARKER_NO_ATTACKSTRING`**
   (`battleScriptJumpifwordOpcode.ts:73-90`) — (a), one map entry
   (`1<<9 = 512`, `include/constants/battle.h:186`). Composes with nothing
   new; reuses the existing `gHitMarker` memWord resolution. Test: extend
   the existing jumpifword test file with a `HITMARKER_NO_ATTACKSTRING`
   set/unset pair, plus a walk-reachability assertion that all five
   two-turn effects' entry guards now pass this instruction.
2. **`applySetMoveEffect` + `MOVE_EFFECT_CHARGING` case**
   (`battleScriptHitChainOpcode.ts`, new `applyChargingMoveEffect` function
   cloned from `applyThrashMoveEffect`'s shape at `:2854-2887`, wired into
   the `effectByte > PRIMARY_STATUS_MOVE_EFFECT` block at `:2394-2417`) —
   (a), a pure `status2 |= STATUS2_MULTIPLETURNS` + `chargingTurn: 1` write,
   zero RNG, `passThrough()` early-out when `STATUS2_MULTIPLETURNS` is
   already set (dead in this calling context, ported for fidelity per
   precedent). Also add `MOVE_EFFECT_CHARGING` to `SET_MOVE_EFFECT_
   SUPPORTED_BYTES` (`:441-454`) so the census's own drift guard
   (`tools/report/executable-frontier-census.ts:307-320`) and the
   `classifySetMoveEffectDispatch` subsystem-note generator both pick it up
   automatically — no `MOVE_EFFECT_ID_BY_NAME` entry needed there, `12` is
   already present (`tools/report/executable-frontier-census.ts` doesn't
   need edits here since the name→id table is hand-maintained but
   `MOVE_EFFECT_CHARGING: 12`-equivalent... note: **this rung is a `src/`
   edit only, no `tools/` edit needed** — the drift guard throws only if the
   engine dispatches an id absent from the census's own token table, and
   `12` needs no new token since the census's `MOVE_EFFECT_ID_BY_NAME`
   already lacks it too and will need the token added in the SAME
   consuming step (`tools/report/executable-frontier-census.ts:265-304`
   has no `MOVE_EFFECT_CHARGING` entry — a companion one-line addition in
   that file, which is a "tools" edit but the report generator itself, not
   production code — the consuming session should treat this as required,
   not optional, or the drift guard will hard-fail the census regen).
   Composes with: `chargingTurn` (already-modeled field, `battleScriptRules
   Context.ts:196-197`), `withBattler` (existing helper). Test: turn-1
   charge-setup sets `STATUS2_MULTIPLETURNS`+`chargingTurn`, turn-2 (bit
   already set) is a no-op pass-through — both branches of the early-out.
3. **`COPYARRAY` + `(cMULTISTRING_CHOOSER, sTWOTURN_STRINGID, 0x1)` tuple**
   (`battleScriptIngrainLeechSeedWrapOpcode.ts:156-206`, `createCopyarray
   Handler`) — (a), mirrors the existing `(cEFFECT_CHOOSER, sMULTIHIT_
   EFFECT, 1)` tuple exactly: `readBattleScriptRulesByte(rules,
   "sTWOTURN_STRINGID")` → `writeBattleScriptRulesByte(rules,
   "cMULTISTRING_CHOOSER", value)`. Both pointers already exist in
   `battleScriptSetByte.ts`'s pointer table. Test: extend the copyarray
   test file with a `sTWOTURN_STRINGID` value → `cMULTISTRING_CHOOSER`
   read-back pair for at least two of the eight `B_MSG_TURN1_*` values.
4. **`PRINTFROMTABLE_TABLES` + `gFirstTurnOfTwoStringIds`**
   (`battleScriptHitChainOpcode.ts:259-364`) — (a), one 8-entry table
   literal (`src/battle_message.c:1025-1035`: `STRINGID_
   PKMNWHIPPEDWHIRLWIND`/`_PKMNTOOKSUNLIGHT`/`_PKMNLOWEREDHEAD`/
   `_PKMNISGLOWING`/`_PKMNFLEWHIGH`/`_PKMNDUGHOLE`/`_PKMNHIDUNDERWATER`/
   `_PKMNSPRANGUP`, indexed by the same `B_MSG_TURN1_*` enum `SETBYTE`
   already uses). Test: extend the printfromtable test with all 8 indices
   (cheap, table is tiny and fully known).
5. **Rungs 1-4 make `BattleScriptFirstChargingTurn` reach `return` and
   `EFFECT_RAZOR_WIND`/`EFFECT_SKY_ATTACK`/`EFFECT_SKULL_BASH`'s own turn-1
   paths complete** (collateral, see §4) — not yet `EFFECT_SEMI_
   INVULNERABLE` (still needs rungs 6-7) or those three's own turn-2 path
   (still needs `CLEARSTATUSFROMEFFECT`, rung 6).
6. **`B_SCR_OP_CLEARSTATUSFROMEFFECT`** (new file, e.g.
   `battleScriptSemiInvulnerableOpcode.ts`, or folded into
   `battleScriptRuleCommands.ts`) — (a), a small
   `{MOVE_EFFECT_CHARGING: STATUS2_MULTIPLETURNS}` lookup (unlisted bytes,
   including `MOVE_EFFECT_RAGE`, default to mask `0` — a genuine no-op per
   §2c, not a barrier), reads the pending `cEFFECT_CHOOSER` byte (same
   scratch field rung 2 consumes), resolves `BS_ATTACKER`/`BS_TARGET` via
   the existing generic battler selector. `gBattleScripting.
   multihitMoveEffect`/`gBattleCommunication[MOVE_EFFECT_BYTE]` resets are
   pure no-ops (no reader in scope, per precedent). Composes with: rung 2's
   `applyChargingMoveEffect`'s own `STATUS2_MULTIPLETURNS` write (this
   opcode clears exactly that bit on turn 2). Test: `MOVE_EFFECT_CHARGING`
   clears `STATUS2_MULTIPLETURNS` (both `EFFECT_SEMI_INVULNERABLE`'s and
   `EFFECT_RAZOR_WIND`/`SKY_ATTACK`/`SKULL_BASH`'s second-turn entries);
   `MOVE_EFFECT_RAGE` is a genuine no-op (status2 unchanged, scratch fields
   still reset) — both branches of the `<= PRIMARY_STATUS_MOVE_EFFECT`
   threshold need not be exercised beyond this (family-A/status1 branch is
   provably unreached by any committed script feeding this opcode today,
   per the census's own per-effect table — do not silently assume it works,
   name it as an untested branch if left unexercised).
7. **`B_SCR_OP_SETSEMIINVULNERABLEBIT`, `B_SCR_OP_CLEARSEMIINVULNERABLEBIT`**
   (same new file as rung 6) — (a) both, per §2a: a `gCurrentMove`-keyed
   switch writing/clearing one of `status3`'s `ON_AIR`/`UNDERGROUND`/
   `UNDERWATER` bits on the attacker. Composes with: the already-source-
   complete `accuracycheck` consumer (§2b — no changes needed there, only
   confirmed compatible). Test: all three move families (Fly/Bounce →
   `ON_AIR`, Dig → `UNDERGROUND`, Dive → `UNDERWATER`) for both set and
   clear; a follow-up integration test where a *different* battler's move
   targeting the semi-invulnerable attacker actually misses via the
   already-registered `accuracycheck` path (proving the write/read
   composition end-to-end, not just that each opcode is individually
   dispatched).
8. **Rungs 1-2, 6-7 together complete `EFFECT_SEMI_INVULNERABLE`.**
   Reachability: full script walk from `BattleScript_
   EffectSemiInvulnerable`'s entry to a genuine `{kind:"terminal",
   opcodeName:"B_SCR_OP_END"}`/`moveend` halt for both the turn-1 and
   turn-2 halves. Pass-through: at least one live two-turn sequence per
   move (Fly/Dig/Dive minimum; Bounce additionally exercises the
   `MOVE_EFFECT_PARALYSIS` secondary-chance branch) reaching
   `checkteamslost`/`tryfaintmon`, plus one hit and one miss on turn 2,
   plus rung 7's cross-battler accuracy-consumer integration test.

## Corrected predicted census flip

**Registering rungs 1-8 (3 new opcodes + 4 widenings) flips 4 effects, not
1: `EFFECT_SEMI_INVULNERABLE` (4 moves / 4 Factory-L50 / 32 weighted),
`EFFECT_RAZOR_WIND` (1/1/2), `EFFECT_SKY_ATTACK` (1/1/1), `EFFECT_SKULL_
BASH` (1/0/0) — combined 7 moves / 6 Factory-L50 unweighted / 35 weighted.**
This is larger than the ranked table's claimed 4/4/32 for the trio alone,
because the ranked table's "effects unlocked" grouping never accounts for
`subsystemNotes` (§ Headline correction) and because it only ever looked at
effects sharing the *exact same* `missingOpcodes` set as `EFFECT_SEMI_
INVULNERABLE` — `EFFECT_RAZOR_WIND`/`SKY_ATTACK`/`SKULL_BASH` have a
*different* (smaller) `missingOpcodes` set (`CLEARSTATUSFROMEFFECT` alone,
no semi-invulnerable-exclusive opcodes), so they show up as their own
separate, lower-ranked rows in the table rather than being credited to this
registration. `EFFECT_SOLAR_BEAM` (1/1/16) and `EFFECT_RAGE` (1/0/0) remain
blocked after this rung set — the former needs its own new opcode
(`JUMPIFABILITYPRESENT`) plus the newly-found `gBattleWeather` widening, the
latter needs a different, RAGE-specific `applySetMoveEffect` widening this
set does not include, and contributes zero weighted moves regardless.

## Scope note

No `src/` or `tools/` files were edited this session — every finding above
is traced from `reference/pokeemerald/` (`battle_script_commands.c`,
`data/battle_scripts_1.s`, `asm/macros/battle_script.inc`, `src/battle_
message.c`, `include/constants/battle.h`) and this engine's already-
committed `src/engine/*` (read-only). No fixtures were staged (§3 explains
the scope call); no `docs/executable-frontier-census.md` edits (generated,
supervisor-owned); no `PROGRESS.md`/`ISSUES.md` edits (side-lane contract).
