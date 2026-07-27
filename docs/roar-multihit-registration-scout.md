# EFFECT_ROAR + multi-hit cluster — registration ground truth (prep-scout)

Side-lane prep-scout for `docs/executable-frontier-census.md`'s top two
ranked rows: the `B_SCR_OP_FORCERANDOMSWITCH`/`INITMULTIHITSTRING`/
`JUMPIFHASNOHP` trio (claimed: 1 effect / 2 moves / 40 weighted, EFFECT_ROAR)
and the `INITMULTIHITSTRING`/`JUMPIFHASNOHP` pair (claimed: 4 effects / 16
moves / 23 weighted, EFFECT_MULTI_HIT/DOUBLE_HIT/TWINEEDLE/TRIPLE_KICK). No
`src/` edits in this scout — everything below is read-only source/engine
analysis plus this new doc. No oracle fixtures were staged this session (see
§4); the reasons are explained precisely there, per the brief's explicit
permission to skip staging when it doesn't fit the time budget.

## Headline correction to the census

**The census's own ranked-table grouping for EFFECT_ROAR is wrong, and its
multi-hit pair row is incomplete — but the brief's predicted end-state (5
effects / 18 moves / 63 weighted) is still exactly right once the *real*
blocker set is registered.** Two independent bugs, both instances of the
same root cause (a topology tool or a dispatcher that only understands a
narrow shape of "jump"):

1. **`B_SCR_OP_FORCERANDOMSWITCH` is not a `jumpif*`-shaped opcode, and the
   committed control-flow graph silently drops its real edges.** Its C
   implementation (`Cmd_forcerandomswitch`/`TryDoForceSwitchOut`,
   `battle_script_commands.c:7164-7386`) jumps to its one pointer operand on
   **failure** and to a **hardcoded, bytecode-invisible label**
   (`BattleScript_SuccessForceOut`) on **success** — a jump target that
   exists nowhere in the compiled instruction stream, not even as a null/
   dynamic marker (contrast `B_SCR_OP_JUMPTOCALLEDMOVE`, the census's one
   documented "dynamic dispatch" case, which at least has a *recognizable*
   null operand). `src/data/gen/battle-script-graph.json`'s edge extractor
   only recognizes jump targets for macros it can pattern-match by name
   (`jumpif*`); `forcerandomswitch` isn't one, so the extractor records
   **zero** jump edges for it and instead emits a bogus `"fallthrough"` edge
   to the next physical instruction in the `.s` file — which happens to be
   `BattleScript_EffectMultiHit`'s entry, purely because that's the next
   script in the file, not because of anything either script does. That
   phantom edge is the entire reason the census's ranked table credits
   `INITMULTIHITSTRING`/`JUMPIFHASNOHP` to EFFECT_ROAR: the census's walker
   thinks Roar falls through into MultiHit's loop. It never does. Verified
   directly against `src/data/gen/battle-script-graph.json`'s
   `controlFlow.edges` (see §1a).
2. **The real EFFECT_ROAR continuation (`BattleScript_SuccessForceOut` →
   `BattleScript_TrainerBattleForceOut`) is never walked by the census at
   all**, so its own opcode needs are invisible to the ranked table. Two of
   its opcodes are genuinely unregistered today (`SWITCHOUTABILITIES`,
   `RETURNTOBALL`); two more (`SETOUTCOMEONTELEPORT` via `various`,
   `FINISHACTION`) sit on a branch that is structurally unreachable in
   Level-50 Factory singles (always `BATTLE_TYPE_TRAINER`) and are
   legitimate (b) barriers, not real blockers. The switch-in tail itself
   (`GETSWITCHEDMONDATA`/`SWITCHINDATAUPDATE`/`SWITCHINANIM`/
   `SWITCHINEFFECTS`) is already fully registered — see §2c.
3. **Separately, the multi-hit pair row undercounts its own two-opcode
   claim.** Even after `INITMULTIHITSTRING`+`JUMPIFHASNOHP` are registered,
   every one of the four multi-hit effects immediately hits an
   `unsupported-branch` halt on its very first loop iteration, on **two
   already-registered opcodes with narrow operand tables**:
   `B_SCR_OP_JUMPIFHALFWORD`'s `gChosenMove` memHword pointer (used by the
   `jumpifhalfword CMP_EQUAL, gChosenMove, MOVE_SLEEP_TALK, ...` Sleep-Talk
   gate every multi-hit script runs before its first hit) and
   `B_SCR_OP_JUMPIFBYTE`'s `MOVE_RESULT_FOE_ENDURED` value (the
   Endure-check every multi-hit iteration runs before deciding whether to
   loop again). Both are one-line, precisely-scoped widenings on
   already-registered dispatchers — not new opcodes — but they are load-
   bearing: without them the "just register 2 opcodes" framing produces a
   multi-hit move that halts on turn 1 every time. `EFFECT_TRIPLE_KICK`
   needs two more of its own beyond that (per-hit dynamic base power, and a
   second `JUMPIFBYTE` memByte pointer) — see §2b.

Net: the true new-opcode set is **5**, not 3 (`FORCERANDOMSWITCH`,
`SWITCHOUTABILITIES`, `RETURNTOBALL`, `INITMULTIHITSTRING`,
`JUMPIFHASNOHP`), plus **4 narrow value/operand widenings on opcodes already
registered** (`JUMPIFABILITY` + `ABILITY_SUCTION_CUPS`; `JUMPIFHALFWORD` +
`gChosenMove`; the shared `SETBYTE`/`JUMPIFBYTE` value table +
`MOVE_RESULT_FOE_ENDURED`; `JUMPIFBYTE`'s memByte table + Triple Kick's
`sMULTIHIT_STRING + 4`) plus **one small data-model extension**
(`damagecalcOpcodeHandler`'s hardcoded-0 `gDynamicBasePower` needs to read
Triple Kick's accumulating `sTRIPLE_KICK_POWER` register). §5's rungs order
all of this. The brief's predicted flip — **5 effects / 18 moves / 63
weighted** — is exactly right once every one of these lands; it is *not*
right if only the 3 named opcodes are registered (Roar would still halt
inside `BattleScript_SuccessForceOut`, and all four multi-hit effects would
still halt on turn 1's Sleep-Talk/Endure checks).

## 1. Raw topology, re-walked from source (not the census)

### 1a. EFFECT_ROAR — the real edge graph vs. the committed graph's edges

`BattleScript_EffectRoar` (`data/battle_scripts_1.s:593-602`):

```
BattleScript_EffectRoar::
	attackcanceler
	attackstring
	ppreduce
	jumpifability BS_TARGET, ABILITY_SUCTION_CUPS, BattleScript_AbilityPreventsPhasingOut
	jumpifstatus3 BS_TARGET, STATUS3_ROOTED, BattleScript_PrintMonIsRooted
	accuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON
	accuracycheck BattleScript_MoveMissedPause, ACC_CURR_MOVE
	jumpifbattletype BATTLE_TYPE_ARENA, BattleScript_ButItFailed
	forcerandomswitch BattleScript_ButItFailed
```

Every opcode above except `forcerandomswitch` itself is **already fully
executable today**, confirmed against the engine's own value tables (not
just opcode existence):

| Instruction | Opcode | Value needed | Registered? |
| --- | --- | --- | --- |
| `attackcanceler`/`attackstring`/`ppreduce` | generic | — | yes (used by every executable effect) |
| `jumpifability BS_TARGET, ABILITY_SUCTION_CUPS` | `JUMPIFABILITY` (registered) | `ABILITY_SUCTION_CUPS` | **no** — `JUMPIFABILITY_VALUES` (`battleScriptIngrainLeechSeedWrapOpcode.ts:179-186`) has `LIQUID_OOZE`/`LIMBER`/`IMMUNITY`/`OWN_TEMPO`/`VITAL_SPIRIT`/`INSOMNIA` only; `SUCTION_CUPS` is a 7th value to add, one line |
| `jumpifstatus3 BS_TARGET, STATUS3_ROOTED` (macro sugar for `jumpifstatus3condition ..., FALSE, ...`) | `JUMPIFSTATUS3CONDITION` (registered) | `STATUS3_ROOTED` | **yes** — already in `JUMPIFSTATUS3CONDITION_VALUES` (`battleScriptJumpifstatus3conditionOpcode.ts:51`) |
| `accuracycheck ..., NO_ACC_CALC_CHECK_LOCK_ON` | `ACCURACYCHECK` (registered) | `NO_ACC_CALC_CHECK_LOCK_ON` | **yes** — source-complete per `battleScriptHitChainOpcode.ts:791-795`'s own doc comment |
| `accuracycheck ..., ACC_CURR_MOVE` | `ACCURACYCHECK` (registered) | `ACC_CURR_MOVE` | **yes** — the load-bearing common case, exercised by every other executable hit effect |
| `jumpifbattletype BATTLE_TYPE_ARENA` (macro sugar for `jumpifword CMP_COMMON_BITS, gBattleTypeFlags, ...`) | `JUMPIFWORD` (registered) | `BATTLE_TYPE_ARENA` | **yes** — already in `JUMPIFWORD_VALUES` (`battleScriptJumpifwordOpcode.ts:63,73-77`) |
| `forcerandomswitch BattleScript_ButItFailed` | `FORCERANDOMSWITCH` | — | **no** — genuinely unregistered |

So Roar's own script body has exactly **one** real gap before
`forcerandomswitch` itself: `JUMPIFABILITY` needs `ABILITY_SUCTION_CUPS`
added (a 7th map entry, `battle_script_commands.c:3105` for the C
reference — this is the same note already in the census's per-effect table,
correctly flagged there even though not folded into the ranked-table opcode
set).

**The committed graph's edges for `forcerandomswitch` itself**, read
directly from `src/data/gen/battle-script-graph.json`'s `controlFlow.edges`:

```json
{"from":{"label":"BattleScript_EffectRoar","line":601},"to":{"label":"BattleScript_ButItFailed","line":2059},"kind":"jump","provenance":{"macro":"jumpifbattletype","opcode":"B_SCR_OP_JUMPIFWORD"}}
{"from":{"label":"BattleScript_EffectRoar","line":601},"to":{"label":"BattleScript_EffectRoar","line":602},"kind":"fallthrough", ...}
{"from":{"label":"BattleScript_EffectRoar","line":602},"to":{"label":"BattleScript_EffectMultiHit","line":605},"kind":"fallthrough", ...}
```

Line 602 is the `forcerandomswitch BattleScript_ButItFailed` instruction.
There is **no jump edge at all** recorded for its own `BattleScript_
ButItFailed` operand (the extractor doesn't know this raw-opcode macro
carries a jump pointer — it isn't named `jumpif*`), and its only recorded
successor is the bogus fallthrough into `BattleScript_EffectMultiHit`. This
is what the census's ranked-table walker sees, which is why it (wrongly)
credits `INITMULTIHITSTRING`/`JUMPIFHASNOHP` to EFFECT_ROAR. Neither opcode
is on any real path from `BattleScript_EffectRoar`.

The **real** two-way branch, from the C (`battle_script_commands.c:7185-
7386`, `TryDoForceSwitchOut` at `:7164-7183`):

- **Fail** → `T1_READ_PTR(gBattlescriptCurrInstr + 1)`, i.e. the operand,
  `BattleScript_ButItFailed`. Two independent fail conditions collapse to
  this one pointer: (a) `validMons <= minNeeded` (opponent has no other
  living, non-egg party member to switch to — for Level-50 singles
  `minNeeded = 1`, so this fires only if the target's whole bench has
  already fainted), or (b) the level-based miss roll inside
  `TryDoForceSwitchOut` (see §2a).
- **Success** → hardcoded C-side jump to `BattleScript_SuccessForceOut`
  (`data/battle_scripts_1.s:3324`) — **not encoded anywhere in the
  bytecode**. This is a third category of "dynamic dispatch" beyond the
  census's one documented case (`JUMPTOCALLEDMOVE`'s runtime-computed
  target): a *compile-time-fixed* target that nonetheless has zero
  bytecode representation, because the C command jumps to it directly by
  writing `gBattlescriptCurrInstr` rather than reading an operand.

### 1b. `BattleScript_SuccessForceOut` — the real continuation, never walked by the census

```
BattleScript_SuccessForceOut:: (data/battle_scripts_1.s:3324-3332)
	attackanimation
	waitanimation
	switchoutabilities BS_TARGET
	returntoball BS_TARGET
	waitstate
	jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_TrainerBattleForceOut
	setoutcomeonteleport BS_ATTACKER
	finishaction

BattleScript_TrainerBattleForceOut:: (:3334-3341)
	getswitchedmondata BS_TARGET
	switchindataupdate BS_TARGET
	switchinanim BS_TARGET, FALSE
	waitstate
	printstring STRINGID_PKMNWASDRAGGEDOUT
	switchineffects BS_TARGET
	goto BattleScript_MoveEnd
```

Level-50 Factory battles are **always** `BATTLE_TYPE_TRAINER` (Factory sets
`BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER` unconditionally — the same fact
`battleScriptJumpifwordOpcode.ts:13-15`'s own doc comment already states for
a different call site), so `jumpifbattletype BATTLE_TYPE_TRAINER, ...`
**always** jumps to `BattleScript_TrainerBattleForceOut` in this scope.
`setoutcomeonteleport` (`various BS_ATTACKER, VARIOUS_SET_TELEPORT_OUTCOME`)
and `finishaction` are therefore structurally unreachable for Factory,
exactly like the already-accepted Snatch/Lightning-Rod precedent (ROADMAP
S10 §1's "a branch that cannot be reached under the current scope is still
a (b) guard, not an omission").

| Instruction | Opcode | Registered? |
| --- | --- | --- |
| `attackanimation`/`waitanimation`/`waitstate`/`printstring`/`goto` | generic | yes |
| `switchoutabilities BS_TARGET` | `SWITCHOUTABILITIES` | **no** |
| `returntoball BS_TARGET` | `RETURNTOBALL` | **no** |
| `jumpifbattletype BATTLE_TYPE_TRAINER` | `JUMPIFWORD` (registered) | yes — `BATTLE_TYPE_TRAINER` already in `JUMPIFWORD_VALUES` (`battleScriptJumpifwordOpcode.ts:58,76`) |
| `setoutcomeonteleport BS_ATTACKER` (macro sugar for `various ..., VARIOUS_SET_TELEPORT_OUTCOME`) | `VARIOUS` (registered, narrow) | unreachable for Factory (b) barrier — `VARIOUS`'s dispatch (`battleScriptSwitchinOpcode.ts:136-140,434`) supports only `VARIOUS_RESET_PLAYER_FAINTED`/`VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT` today; `VARIOUS_SET_TELEPORT_OUTCOME` would barrier if ever reached, which it structurally cannot be here |
| `finishaction` | `FINISHACTION` | unreachable for Factory (b) barrier candidate — genuinely unregistered but dead code in this scope |
| `getswitchedmondata`/`switchindataupdate`/`switchinanim`/`switchineffects` | all registered | **yes** — see §2c for why these compose directly |

So the true new-opcode set for EFFECT_ROAR's Factory-reachable path is
**`FORCERANDOMSWITCH`, `SWITCHOUTABILITIES`, `RETURNTOBALL`** — a different
trio than the census's, and it still needs the `JUMPIFABILITY` +
`ABILITY_SUCTION_CUPS` widening from §1a.

### 1c. Multi-hit family — `BattleScript_MultiHitLoop`'s shared tail

`BattleScript_EffectMultiHit` (`:604-614`) → `BattleScript_MultiHitLoop`
(`:613-616`) → `BattleScript_DoMultiHit` (`:618-641`) →
`BattleScript_MultiHitNoMoreHits`/`_PrintStrings`/`_End` (`:642-655`).
`BattleScript_EffectDoubleHit` (`:839-846`) and `BattleScript_EffectTwineedle`
(`:1075-1082`) both `goto BattleScript_MultiHitLoop` directly after their own
short setup, reusing the identical tail. Full instruction-by-instruction
registration status (every opcode reachable from any of the three entries):

| Instruction | Opcode | Registered? | Notes |
| --- | --- | --- | --- |
| `attackcanceler`/`accuracycheck ACC_CURR_MOVE`/`attackstring`/`ppreduce` | generic | yes | one accuracy roll for the whole flurry, not per hit (matches real game: multi-hit moves check accuracy once) |
| `setmultihitcounter 0\|2` | `SETMULTIHITCOUNTER` | **yes, already source-complete** | `battleScriptRuleCommands.ts:176-240` — RNG-draw branch already ported (see §2b) |
| `initmultihitstring` | `INITMULTIHITSTRING` | **no** | trivially (a)-portable, see §2b |
| `setbyte sMULTIHIT_EFFECT, 0\|MOVE_EFFECT_POISON` | generic `SETBYTE` | yes | `sMULTIHIT_EFFECT`/`MOVE_EFFECT_POISON` both already modeled (`battleScriptSetByte.ts:50,90,232,269`) |
| `jumpifhasnohp BS_ATTACKER\|BS_TARGET, ...` | `JUMPIFHASNOHP` | **no** | trivially (a)-portable, see §2b |
| `jumpifhalfword CMP_EQUAL, gChosenMove, MOVE_SLEEP_TALK, ...` | `JUMPIFHALFWORD` (registered) | **no — narrow-value barrier** | `readJumpifhalfwordMemHword` (`battleScriptJumpifhalfwordOpcode.ts:70-76`) only resolves `"gCurrentMove"`; `"gChosenMove"` falls to `default: return null` → `unsupportedBranch`. The file's own doc comment (lines 14-19) names this exact gap already: *"Every other concrete jumpifhalfword call site... compares a different, unmodeled pointer (`gChosenMove`...) and is a named (b) barrier -- those effects (EFFECT_MULTI_HIT...) remain blocked on their own separate missing opcodes regardless."* That "regardless" stops being true once `INITMULTIHITSTRING`/`JUMPIFHASNOHP` land — this becomes the *proximate* blocker on turn 1 of every multi-hit move |
| `jumpifstatus BS_ATTACKER, STATUS1_SLEEP, ...` | `JUMPIFSTATUS` (registered) | yes | `STATUS1_SLEEP` in `STATUS1_SINGLE_BITS` (`battleScriptStatusPrimaryOpcode.ts:51`); battler resolution is generic, not narrowed to `BS_TARGET` only |
| `movevaluescleanup` | `MOVEVALUESCLEANUP` | yes | |
| `copybyte cEFFECT_CHOOSER, sMULTIHIT_EFFECT` (macro sugar for `copyarray ..., 1`) | `COPYARRAY` (registered) | yes | not a separate opcode |
| `critcalc`/`damagecalc`/`typecalc`/`adjustnormaldamage` | registered | yes | re-invoked once per loop iteration; the interpreter looping back via `decrementmultihit` exercises the same handlers repeatedly, no special-casing needed |
| `jumpifmovehadnoeffect` (macro sugar for `jumpifbyte CMP_COMMON_BITS, gMoveResultFlags, MOVE_RESULT_NO_EFFECT, ...`) | `JUMPIFBYTE` (registered) | yes | `MOVE_RESULT_NO_EFFECT` already in the value table, **explicitly pre-widened for this cluster** — `battleScriptSetByte.ts:128-139`'s own doc comment names `DoMultiHit`/`MultiHitPrintStrings`/`DoTripleKickAttack` as the call sites this resolves |
| `attackanimation`/`waitanimation`/`effectivenesssound`/`hitanimation`/`waitstate`/`healthbarupdate`/`datahpupdate`/`critmessage`/`waitmessage`/`printstring`/`addbyte` | generic | yes | |
| `moveendto MOVEEND_NEXT_TARGET` (macro sugar for `setbyte sMOVEEND_STATE, 0` + `moveend 2, to`) | `MOVEEND` (registered) | yes | `moveendto`/`moveendfrom`/`moveendcase`/`moveendall`/`moveendfromto` are all sugar over the single already-registered `B_SCR_OP_MOVEEND` (`asm/macros/battle_script.inc:408-444`) plus generic `setbyte` — **not** five separate opcodes, a false alarm ruled out this session |
| `jumpifbyte CMP_COMMON_BITS, gMoveResultFlags, MOVE_RESULT_FOE_ENDURED, ...` | `JUMPIFBYTE` (registered) | **no — narrow-value barrier** | `MOVE_RESULT_FOE_ENDURED` (`1 << 6`, `battle.h:226`) is **not** in `SETBYTE_VALUES`/`ATOMIC_VALUES` (`battleScriptSetByte.ts:95-140` — only `MOVE_RESULT_MISSED`, the `SUPER_EFFECTIVE|NOT_VERY_EFFECTIVE` pair, `MISSED|DOESNT_AFFECT_FOE`, and `NO_EFFECT` are present). This runs on **every** multi-hit iteration, main path, not an edge case |
| `decrementmultihit` | `DECREMENTMULTIHIT` | **yes, already source-complete** | `battleScriptRuleCommands.ts:142-174`, matches `Cmd_decrementmultihit` (`:3644-3649`) exactly |
| `goto`/`pause`/`resultmessage`/`copyarray`/`tryfaintmon`/`end` | generic | yes | |
| `seteffectwithchance` (`applySetMoveEffect`) | registered, narrow dispatch (tracked exception) | yes for this cluster | `effectByte === 0` (plain MultiHit's `sMULTIHIT_EFFECT`) is an explicit early-return no-op (`battleScriptHitChainOpcode.ts:2383`); `MOVE_EFFECT_POISON` (Twineedle) is in `SET_MOVE_EFFECT_SUPPORTED_BYTES` |

So the shared tail's real blocker set for `MULTI_HIT`/`DOUBLE_HIT`/
`TWINEEDLE` is **`INITMULTIHITSTRING` + `JUMPIFHASNOHP`** (new opcodes, both
trivially (a)-portable) **plus two narrow-value widenings on opcodes already
registered** (`JUMPIFHALFWORD`'s `gChosenMove` case, `MOVE_RESULT_FOE_
ENDURED` in the shared byte-value table) — four line items, not two.

### 1d. `EFFECT_TRIPLE_KICK` — two more gaps beyond the shared set

```
BattleScript_EffectTripleKick:: (data/battle_scripts_1.s:1384-1436)
	attackcanceler / attackstring / ppreduce
	sethword sTRIPLE_KICK_POWER, 0        @ macro sugar: setbyte x2, registered
	initmultihitstring / setmultihit 3
BattleScript_TripleKickLoop::
	jumpifhasnohp x2 / jumpifhalfword(SLEEP_TALK) / jumpifstatus(SLEEP)
BattleScript_DoTripleKickAttack::
	accuracycheck(TripleKickNoMoreHits, ACC_CURR_MOVE) / movevaluescleanup
	addbyte sTRIPLE_KICK_POWER, 10 / addbyte sMULTIHIT_STRING+4, 1
	copyhword gDynamicBasePower, sTRIPLE_KICK_POWER   @ macro sugar: copyarray, registered
	critcalc / damagecalc / typecalc / adjustnormaldamage / jumpifmovehadnoeffect
	attackanimation / waitanimation / effectivenesssound / hitanimation / waitstate
	healthbarupdate / datahpupdate / critmessage / waitmessage / printstring
	moveendto(NEXT_TARGET) / jumpifbyte(FOE_ENDURED) / decrementmultihit(loop) / goto
BattleScript_TripleKickNoMoreHits::
	pause / jumpifbyte CMP_EQUAL, sMULTIHIT_STRING + 4, 0, ... / bicbyte
BattleScript_TripleKickPrintStrings::
	resultmessage / waitmessage / jumpifbyte(sMULTIHIT_STRING+4==0) / jumpifbyte(DOESNT_AFFECT_FOE)
	copyarray / printstring / waitmessage
BattleScript_TripleKickEnd::
	seteffectwithchance / tryfaintmon / moveendfrom(UPDATE_LAST_MOVES) / end
```

Triple Kick uses `setmultihit 3` (`SETMULTIHIT`, already registered,
already source-complete per `battleScriptRuleCommands.ts:107-140` — a plain
literal assignment, zero RNG, distinct from `SETMULTIHITCOUNTER`'s RNG-draw
form) rather than `setmultihitcounter`, so it inherits the shared blockers
(`INITMULTIHITSTRING`, `JUMPIFHASNOHP`, `JUMPIFHALFWORD`'s `gChosenMove`,
`JUMPIFBYTE`'s `MOVE_RESULT_FOE_ENDURED`) from §1c, plus two more real gaps
found this session that are specific to Triple Kick:

1. **`gDynamicBasePower` is hardcoded to 0 in the ported `damagecalc`
   handler.** `damagecalcOpcodeHandler`'s own doc comment
   (`battleScriptHitChainOpcode.ts:1155-1157`) states: *"gDynamicBasePower
   (Low Kick/Flail-style power overrides) is 0 for every EFFECT_HIT move so
   movePower is always `gBattleMoves[move].power`."* Triple Kick's escalating
   per-hit power (10/20/30 on hits 1/2/3, written via `addbyte
   sTRIPLE_KICK_POWER, 10` then `copyhword gDynamicBasePower,
   sTRIPLE_KICK_POWER` before every `damagecalc` call) is real, modeled
   scratch state today (`rules.tripleKickPower`,
   `battleScriptSetByte.ts:27,235-236,272-273` — already tracked!) but
   `damagecalcOpcodeHandler` never reads it. This is the same class of gap
   as the fixed-damage cluster scout's Counter `physicalBattlerId` finding:
   a data-plumbing gap, not an opcode-dispatch gap. Registering
   `INITMULTIHITSTRING`/`JUMPIFHASNOHP` without this would make Triple Kick
   *run* but deal Tackle-sized flat damage on every hit instead of the real
   10/20/30 base-power ramp — a silent wrong-output bug, not a barrier halt.
2. **`sMULTIHIT_STRING + 4` (Triple Kick's own "hits landed" counter,
   distinct from `gMultiHitCounter`'s countdown) has no reader.**
   `readJumpifbyteMemByte`'s own doc comment
   (`battleScriptJumpifbyteOpcode.ts:44-53`) names this exact pointer:
   *"`sMULTIHIT_STRING + 4` (Triple Kick's own multi-hit string buffer...)
   has no reader anywhere in this engine and fall[s] through to the
   unsupported-operand barrier."* Two of Triple Kick's own call sites
   (`BattleScript_TripleKickNoMoreHits`/`_PrintStrings`) depend on this byte
   to decide whether to print "Hit X times!" and whether to clear the
   missed-move flag. `MULTI_HIT`/`DOUBLE_HIT`/`TWINEEDLE` do not touch this
   pointer (their `MultiHitPrintStrings` reads only `gMoveResultFlags`), so
   this is Triple-Kick-exclusive.

## 2. Source derivation of every missing opcode

### 2a. `Cmd_forcerandomswitch` + `TryDoForceSwitchOut` (`battle_script_commands.c:7164-7386`)

`TryDoForceSwitchOut` (`:7164-7183`) — the level-based fail check, run once
regardless of trainer/wild:

```c
if (gBattleMons[gBattlerAttacker].level >= gBattleMons[gBattlerTarget].level) {
    *(gBattleStruct->battlerPartyIndexes + gBattlerTarget) = gBattlerPartyIndexes[gBattlerTarget];
    /* falls through to the shared success tail below */
} else {
    u16 random = Random() & 0xFF;
    if ((u32)((random * (atkLevel + defLevel) >> 8) + 1) <= (defLevel / 4)) {
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1); // FAIL: jump to Roar's own operand
        return FALSE;
    }
    *(gBattleStruct->battlerPartyIndexes + gBattlerTarget) = gBattlerPartyIndexes[gBattlerTarget];
}
gBattlescriptCurrInstr = BattleScript_SuccessForceOut; // hardcoded, bytecode-invisible
return TRUE;
```

If the attacker's level is `>=` the target's, Roar **cannot fail on the
level check at all** — zero `Random()` draws, unconditional success (this
is a real, source-accurate mechanic: Roar/Whirlwind get harder to resist
the more the user out-levels the target, and are unconditionally successful
against an equal-or-lower-level target). Only when the target out-levels
the attacker does a single `Random() & 0xFF` roll decide the level-based
failure, with fail probability `floor(defLevel/4) / 256`-ish (the exact
inverted condition — `(r*(atk+def)>>8)+1 <= def/4`, so higher `r` values
are *more* likely to satisfy the failure inequality as the target's level
advantage grows — matches the intuitive "harder to force out a much-higher-
level opponent" reading). `gBattleStruct->battlerPartyIndexes[target]` is
written on every success path but is not read again by anything in this
opcode's own logic — it is presentation/message bookkeeping outside this
cluster's scope (not modeled, not needed for the mechanic itself).

`Cmd_forcerandomswitch` (`:7185-7386`) itself, trainer-battle branch (the
only branch Factory ever takes — `else { TryDoForceSwitchOut(); }` at
`:7382-7385` is the wild-battle path, unreachable for Factory):

```c
// Level-50 singles (not tag/multi/two-opponents/double battle) collapses to:
firstMonId = 0; lastMonId = PARTY_SIZE /* 6 */; monsCount = PARTY_SIZE /* 6 */; minNeeded = 1;
battler2PartyId = battler1PartyId = gBattlerPartyIndexes[gBattlerTarget]; // target's own current slot

for (i = 0; i < PARTY_SIZE; i++)
    if (species[i] != NONE && !isEgg[i] && hp[i] != 0) validMons++;

if (validMons <= minNeeded) { /* jump to the FAIL operand */ }
else if (TryDoForceSwitchOut()) {
    do {
        do { i = Random() % monsCount /* 6 */; } while (i == battler1PartyId);
    } while (species[i] == NONE || isEgg[i] || hp[i] == 0);
    monToSwitchIntoId[target] = i;
    // SwitchPartyOrder/link-multi/in-game-partner bookkeeping: all no-ops for L50 singles
}
```

**The Battle Frontier/Factory reality the brief asks for, made exact:** the
rejection-sampling modulus is `PARTY_SIZE` = **6** (a hardcoded engine-wide
constant, `include/constants/global.h:33`), **not** the Factory's real
3-mon roster size. Since `FillFactoryFrontierTrainerParty` only ever
populates party slots 0-2 for a Factory trainer (slots 3-5 are always
`SPECIES_NONE`), roughly half of every `Random() % 6` draw is thrown away
purely for landing on a structurally-empty slot, before the loop even gets
to reject the target's own current index or a fainted bench mon. With all
3 Factory rental mons alive, the eligible outcomes are the 2 non-active
bench slots out of 6 possible draws (`p = 2/6 = 1/3` per draw), so this is
a **geometric distribution** with `E[draws] = 3`, not a uniform 1-shot pick
over "the opponent's other 2 mons." If one bench mon has already fainted,
`p = 1/6` and `E[draws] = 6`. `validMons <= minNeeded` (`<= 1`) is the only
way Roar can fail purely on party composition — i.e. only when the target's
entire bench (both other rental mons) has already fainted.

**Composition with existing switch machinery (the crux for the plan):**
Roar's replacement pick is a **pure RNG reducer inside this opcode's own
handler** — it does **not** route through `openpartyscreen`/the AI
switch-decision boundary described in `docs/forced-switch-ground-truth.md`
at all. That machinery exists for the *fainted-mon-replacement* fork, where
the outgoing battler is dead and the incoming choice is a real decision
(player menu or AI viability scoring). Roar's outgoing battler is healthy
and gets no say — the new `FORCERANDOMSWITCH` handler should write
`monToSwitchIntoId[target]` directly via the same plain-reducer pattern
`battleScriptOpenPartyScreenOpcode.ts:209-216`/
`battleScriptFaintedActionsOrchestration.ts:388-394` already use (a
`rules.monToSwitchIntoId.map(...)` replace-at-index), then transition
straight to the `BattleScript_SuccessForceOut` label — no new decision-
request kind needed.

### 2b. `Cmd_initmultihitstring`, `Cmd_jumpifhasnohp`, hit-count draw, loop termination

```c
static void Cmd_initmultihitstring(void)  // battle_script_commands.c:7157-7161
{
    PREPARE_BYTE_NUMBER_BUFFER(gBattleScripting.multihitString, 1, 0)
    gBattlescriptCurrInstr++;
}
```

Zero-operand, initializes a text-formatting byte buffer to `0` (digit width
1). No RNG, no branch. Trivially (a)-portable; the buffer's *value* field is
already modeled as scratch state the same way `sMULTIHIT_EFFECT`/
`sTRIPLE_KICK_POWER` are (`battleScriptSetByte.ts`), and `sMULTIHIT_STRING
+ 4`'s specific need (Triple Kick's counter reader) is the one real gap
from §1d — `initmultihitstring` the opcode itself has none.

```c
static void Cmd_jumpifhasnohp(void)  // :9609-9617
{
    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
    if (gBattleMons[gActiveBattler].hp == 0)
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);
    else
        gBattlescriptCurrInstr += 6;
}
```

Pure `hp == 0` read plus the same generic battler-selector resolution every
other hit-chain opcode already uses (`resolveBattlerForBattleScript`/
`resolveRulesBattlerForBattleScript`). Trivially (a)-portable, no new
concrete value table needed (battler selectors are already generic).

**Hit-count draw** — `Cmd_setmultihitcounter`'s `operand == 0` branch
(`:7139-7152`, called as `setmultihitcounter 0` only by `EFFECT_MULTI_HIT`;
`DOUBLE_HIT`/`TWINEEDLE` call `setmultihitcounter 2`, a literal, zero-RNG
assignment):

```c
gMultiHitCounter = Random() & 3;                 // draw #1, r1 in 0..3
if (gMultiHitCounter > 1) {                      // r1 in {2,3}: draw again
    gMultiHitCounter = (Random() & 3) + 2;       // draw #2, r2 in 0..3 -> count in 2..5
} else {
    gMultiHitCounter += 2;                       // r1 in {0,1} -> count in 2..3, one draw only
}
```

Distribution (derived, matches the well-known real hit-count table):
`P(2) = P(3) = 3/8`, `P(4) = P(5) = 1/8`. Draw count is **1** when `r1 <=
1` (50% of the time) and **2** when `r1 > 1` (the other 50%). **This exact
formula is already ported and source-complete** —
`battleScriptRuleCommands.ts:176-240`'s `B_SCR_OP_SETMULTIHITCOUNTER`
handler reproduces it line for line, including the two-draw reroll branch
and RNG advancement. `SETMULTIHITCOUNTER` is not part of this registration
step; it is already fully registered and tested (`tests/
battleScriptRuleCommands.test.ts`).

**Loop termination** — `Cmd_decrementmultihit` (`:3644-3649`):

```c
if (--gMultiHitCounter == 0)
    gBattlescriptCurrInstr += 5;                  // fall through, past the pointer operand
else
    gBattlescriptCurrInstr = T2_READ_PTR(gBattlescriptCurrInstr + 1); // loop back
```

Also **already fully registered and source-complete**
(`battleScriptRuleCommands.ts:142-174`), matching this exactly. Note for
completeness: the committed control-flow graph also fails to record this
opcode's loop-back jump edge (same "not a `jumpif*`-named macro" blind
spot as `forcerandomswitch`) — but unlike Roar's case this is
**consequence-free** for the census, because the loop body it would jump
back to (`BattleScript_MultiHitLoop`) was already fully visited by the
initial forward walk from the script's entry, so no opcode is missed by
the omission. Only `forcerandomswitch`'s specific case (jumping *forward*
into code the entry-walk hadn't otherwise reached, while also dropping the
*fail* edge into an unrelated script) produces a wrong ranked-table row.

### 2c. `Cmd_switchoutabilities`, `Cmd_returntoball`, and why the switch-in tail composes for free

```c
static void Cmd_switchoutabilities(void)  // :9590-9607
{
    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
    switch (gBattleMons[gActiveBattler].ability) {
    case ABILITY_NATURAL_CURE:
        gBattleMons[gActiveBattler].status1 = 0;
        BtlController_EmitSetMonData(...); MarkBattlerForControllerExec(...);
        break;
    }
    gBattlescriptCurrInstr += 2;
}
```

Single-case switch (only `ABILITY_NATURAL_CURE` does anything; every other
ability is a no-op advance). (a)-portable: a `status1 = 0` write on the
outgoing battler plus a controller announcement, structurally identical in
shape to abilities this engine already models elsewhere.

```c
static void Cmd_returntoball(void)  // :5346-5352
{
    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
    BtlController_EmitReturnMonToBall(B_COMM_TO_CONTROLLER, TRUE);
    MarkBattlerForControllerExec(gActiveBattler);
    gBattlescriptCurrInstr += 2;
}
```

Pure controller/presentation acknowledgement, zero logical state change —
the same "safely acknowledge controller ownership" shape as
`attackanimation`/`waitanimation`. (a)-portable trivially.

**Why `getswitchedmondata`/`switchindataupdate`/`switchinanim`/
`switchineffects` compose directly, unmodified:** all four already read the
switched-in mon's raw party index from `rules.monToSwitchIntoId[battler]`
(`battleScriptSwitchinOpcode.ts:200,233`, the same field `FORCERANDOMSWITCH`
would write per §2a) — they do not care *why* that field was populated, only
that it was. `docs/forced-switch-ground-truth.md` §6 proves this exact
sequence end-to-end for the *fainted*-replacement caller
(`switchhandleorder -> getswitchedmondata -> switchindataupdate ->
hpthresholds -> ... -> switchinanim -> ... -> switchineffects`); Roar's
tail is a strict **subset** of that same sequence
(`getswitchedmondata -> switchindataupdate -> switchinanim -> ... ->
switchineffects`, skipping `switchhandleorder`/`openpartyscreen`/
`hpthresholds`/`cancelallactions`, none of which Roar's script calls).
`switchineffects` unconditionally clears `HITMARKER_FAINTED`
(`docs/forced-switch-ground-truth.md` §6) — a harmless no-op when the
outgoing battler was never marked fainted, which is always true for Roar.
The one thing this composition has **not** been proven for yet is a live
integration test exercising it from *this* caller (every existing test
drives it from the fainted-replacement path) — flagged as a pass-through
test obligation in §5, not assumed silently correct.

## 3. RNG/draw-count ground truth

All of §2's formulas are re-derived directly from the pinned C source in
this session (shown above) and cross-checked against already-ported,
already-tested handlers where they exist (`SETMULTIHITCOUNTER`,
`DECREMENTMULTIHIT`). No oracle fixtures were staged this session — this is
a deliberate scope call, not an oversight, for two independent reasons:

1. **The battle-lab capture schema doesn't expose what's needed to pin a
   hit-count ledger directly.** A live capture's `state.battlers.*` shape
   (checked this session against a real `/v1/battle-lab/run` response) has
   `hp`/`status1`/`stats`/`pp`/`statStages`/etc. but no scratch-register
   visibility (`gMultiHitCounter`, `gMoveResultFlags`, `sMULTIHIT_STRING`).
   The only observable proxy for hit count is the target's aggregate HP
   delta, which is confounded by each hit's own independent 85–100% damage-
   variance roll (and possible crit) — recovering an exact hit count from a
   noisy HP delta requires either (a) picking a matchup where per-hit
   damage is provably constant across the whole 85–100% range (needs a
   very specific bulk/power ratio, itself a search problem) or (b)
   replaying the RNG forward from a captured seed to predict the *exact*
   draw sequence and cross-checking the final `rngValue`, which is exactly
   the status-cluster scout's `stepsToReach` technique but requires first
   knowing this scenario's fixed per-turn RNG tail (the precedent doc's own
   "6-call downstream tail, not attributed further" caveat) — a second,
   separate empirical unknown to pin before the multi-hit-specific draws
   could be isolated from it.
2. **Roar's forced-switch draw fixture needs a live 3-mon Factory trainer
   battle staged to the exact turn where Roar resolves, with the target's
   bench composition (all-alive vs. one-fainted) and level gap controlled
   precisely enough to force either the always-succeed or the roll-gated
   branch of `TryDoForceSwitchOut`** — feasible in principle with
   `overrides.parties`, but doing it *and* the multi-hit ledger *and*
   writing/verifying both scripts inside this step's remaining budget was
   not realistic alongside the topology corrections in §1, which the brief
   states outrank the fixtures in priority.

Both are exactly the kind of "staging friction" the brief pre-authorizes
skipping in favor of the exact recipe. The recipes below are bounded and
ready for a follow-up worker (or a future scout with more time budget) to
execute directly.

**Multi-hit hit-count recipe.** `overrides.parties`, Level 50 singles:
attacker a fast, single-real-ability species with a 100-accuracy
`EFFECT_MULTI_HIT` move to remove the accuracy roll as a confound
(`MOVE_SPIKE_CANNON`, id 131, 20 power, 100 acc — the only 100-accuracy
member of the family; `MOVE_DOUBLE_SLAP`/`FURY_ATTACK`/`PIN_MISSILE`/
`BARRAGE`/`FURY_SWIPES` are all 85 or 80); target a maximum-bulk species
(`SPECIES_SHUCKLE`, id 213, base defense 230) with `MOVE_SPLASH` (id 150)
×4 to remove AI decision variance and keep it from ever fainting across up
to 5 hits. Capture `rngValue` at frame 0 (pre-move) and step it forward by
hand with `gRngValue = (1103515245 * gRngValue + 24691) mod 2^32`
(top 16 bits of the *new* value is `Random()`'s result, per
`reference/pokeemerald/include/random.h`) to predict: 1 accuracy draw, then
1 or 2 hit-count draws per §2b's formula, then 2 draws per hit landed
(`critcalc` + `damagecalc`'s variance roll) — cross-check the predicted
final `rngValue` against the captured one at a sufficiently late frame
(≥900, since a 5-hit sequence with message pauses needs materially more
frames than the single-hit status-cluster fixtures' 450).

**Roar forced-switch draw recipe.** `overrides.parties`, opponent's 3 real
sets: an active low-level mon and two higher-level bench mons (to force the
`TryDoForceSwitchOut` roll-gated branch deterministically failing or
succeeding by construction), player's active mon knows `MOVE_ROAR` (id 46)
at a controlled level; opponent's 4 move slots any status move (e.g.
Splash) so it never faints itself. Capture pre/post `rngValue` and the
opponent's active `species`/`partyIndex` at a frame after Roar resolves;
cross-check the observed replacement species against the `Random() % 6`
rejection-sampling walk from §2a (only 2 of 6 possible draws are valid when
both bench mons are alive, so the exact draw sequence is recoverable from
the `rngValue` delta the same way as the multi-hit case).

## 4. Ordered registration plan (rungs) for a round-3 main-lane step

Each rung names the file(s) it touches, what it composes with, and its test
obligation. (a)/(b) classifications per ROADMAP S10 §1.

1. **`JUMPIFABILITY` + `ABILITY_SUCTION_CUPS`** (`battleScriptIngrainLeechSeedWrapOpcode.ts:179-186`) —
   (a), one map entry (value `31`, `include/constants/abilities.h`). Composes
   with nothing new; reuses the existing dispatcher. Test: extend the
   existing jumpifability test file with a Suction-Cups-present/absent pair.
2. **`B_SCR_OP_INITMULTIHITSTRING`** (new file or folded into
   `battleScriptRuleCommands.ts`) — (a), zero-operand scratch-buffer
   init, matches `sMULTIHIT_EFFECT`'s existing scratch-field pattern in
   `battleScriptSetByte.ts`. Test: dispatch + a script walk that reaches it.
3. **`B_SCR_OP_JUMPIFHASNOHP`** (same file) — (a), reuses
   `resolveBattlerForBattleScript` verbatim. Test: both-alive/attacker-
   fainted/target-fainted branches.
4. **`JUMPIFHALFWORD` + `gChosenMove`** (`battleScriptJumpifhalfwordOpcode.ts`'s
   `readJumpifhalfwordMemHword`) — (a), one new field read
   (`rules.chosenMove`, already modeled per `battleScriptRulesContext.ts:
   490-491` — this is a resolver-function widening, not a data-model
   change). Composes directly with the hit-chain's existing `chosenMove`
   field. Test: Sleep-Talk-selected vs. ordinary-selected multi-hit call,
   both branches of the existing test file.
5. **`SETBYTE`/`JUMPIFBYTE` value table + `MOVE_RESULT_FOE_ENDURED`**
   (`battleScriptSetByte.ts`'s `SETBYTE_VALUES`) — (a), one literal
   (`1 << 6 = 64`). Composes with the already-registered `JUMPIFBYTE`
   dispatcher unchanged. Test: Endure-active vs. inactive multi-hit
   iteration (Endure itself need not be fully modeled — a synthetic
   `gMoveResultFlags` fixture suffices to prove the value resolves).
6. **Rungs 2–5 together make `EFFECT_MULTI_HIT`/`EFFECT_DOUBLE_HIT`/
   `EFFECT_TWINEEDLE` genuinely executable.** Reachability: a full script
   walk from each entry to a real `end`/`moveend` halt. Pass-through: at
   least one live multi-hit turn (2-, 3-, 4-, and 5-hit outcomes if
   feasible) reaching `checkteamslost`/`tryfaintmon` with the correct
   accumulated damage.
7. **`damagecalcOpcodeHandler` + dynamic base power**
   (`battleScriptHitChainOpcode.ts`, the `damagecalc` handler) — (a), read
   `rules.tripleKickPower` when nonzero instead of the hardcoded
   `gBattleMoves[move].power` (the field already exists —
   `battleScriptSetByte.ts:27`). Scope narrowly to Triple Kick's own
   call sites to avoid touching the `EFFECT_HIT`-family's documented "always
   0" invariant the existing doc comment asserts. Test: hit 1/2/3 damage
   ratio matches the 10/20/30 power ramp (already-ported `damageCalc.ts`
   consumed, not rewritten, per the existing pattern).
8. **`JUMPIFBYTE` memByte table + `sMULTIHIT_STRING + 4`**
   (`battleScriptJumpifbyteOpcode.ts`'s `readJumpifbyteMemByte`) — (a),
   needs a new scratch field (mirroring `multiHitEffect`/`tripleKickPower`'s
   existing pattern) incremented by the generic `ADDBYTE` handler already
   in `battleScriptSetByte.ts` and read here. Composes with `ADDBYTE`
   (already registered, generic) — confirm `ADDBYTE`'s destination-address
   table also needs `sMULTIHIT_STRING + 4` added (same file, same rung).
   Test: 0-hits-landed vs. ≥1-hit-landed branches of both
   `TripleKickNoMoreHits`/`TripleKickPrintStrings` call sites.
9. **Rungs 7–8 complete `EFFECT_TRIPLE_KICK`.** Reachability + pass-through
   as in rung 6, plus the power-ramp assertion from rung 7.
10. **`B_SCR_OP_FORCERANDOMSWITCH`** (new file, e.g.
    `battleScriptForceSwitchOpcode.ts`) — (a) for the trainer-battle branch
    (Factory's only reachable one); the wild-battle `else` branch
    (`Cmd_forcerandomswitch:7382-7385`) is out of scope entirely (Factory
    is always a trainer battle) and should be a named (b) barrier if the
    handler is ever called with `battleTypeFlags` lacking
    `BATTLE_TYPE_TRAINER`, rather than silently mis-branching. Composes
    with: `rules.monToSwitchIntoId` (write, same pattern as
    `battleScriptOpenPartyScreenOpcode.ts:209-216`), the already-modeled
    party-HP/species/isEgg slice (`BattleScriptRulesContext`'s Option-A
    party fields, ISSUES #42's closure) for `validMons`/rejection-sampling,
    and a single new `Random() & 0xFF` draw only on the target-out-levels-
    attacker branch. Test: attacker-level-≥-target (unconditional success,
    zero draws), attacker-level-<-target both roll outcomes, and
    `validMons <= 1` (both bench mons fainted → fail pointer).
11. **`B_SCR_OP_SWITCHOUTABILITIES`, `B_SCR_OP_RETURNTOBALL`** (new file or
    folded into rung 10's file) — (a) both, per §2c. `SWITCHOUTABILITIES`
    composes with the already-modeled per-battler `status1`/`ability`
    fields; `RETURNTOBALL` is a pure controller acknowledgement, composes
    with the existing `markBattleScriptControllerPending`/`isControllerIdle`
    port pattern already used by `attackanimation`/`switchinanim`. Test:
    Natural-Cure-present/absent for the former; controller-pending-then-
    idle round trip for the latter (matching existing controller-ack tests'
    shape).
12. **`various` + `VARIOUS_SET_TELEPORT_OUTCOME`, `B_SCR_OP_FINISHACTION`**
    — explicit (b) barriers, cited as unreachable for
    `BATTLE_TYPE_TRAINER`-always Factory battles (§1b). Reachability test:
    construct a synthetic non-trainer `battleTypeFlags` rules-context state
    and confirm the machine halts with `unsupported-branch` naming
    `battle_script_commands.c`'s `various`/`Cmd_finishaction` lines, rather
    than silently falling through — no pass-through test needed since the
    branch is genuinely out of scope, matching the Snatch/Lightning-Rod
    precedent exactly.
13. **Integration: `BattleScript_TrainerBattleForceOut`'s reused switch-in
    tail, exercised from `FORCERANDOMSWITCH`'s new caller.** Not a new
    opcode, but the one composition risk flagged in §2c as unproven: every
    existing test for `getswitchedmondata`/`switchindataupdate`/
    `switchinanim`/`switchineffects` drives them from the fainted-
    replacement path. Add one integration test (mirroring
    `tests/factoryBattleScriptTerminalDecision.test.ts`'s full-dance shape)
    that drives `FORCERANDOMSWITCH`'s success path through this exact
    already-registered tail and confirms the opponent's active battler
    changes with a genuine next decision boundary, no fainted-only
    assumption silently violated.
14. **Rungs 10–13 complete `EFFECT_ROAR`.**

**Predicted census flip once rungs 1–13 all land: 5 effects (`EFFECT_ROAR`,
`EFFECT_MULTI_HIT`, `EFFECT_DOUBLE_HIT`, `EFFECT_TWINEEDLE`,
`EFFECT_TRIPLE_KICK`) / 18 moves / 63 weighted — matching the brief's
target exactly.** Registering only the census's named 3-opcode set would
leave Roar halting inside `BattleScript_SuccessForceOut` and all four
multi-hit effects halting on turn 1's Sleep-Talk/Endure checks — 0 of the
5 effects would actually flip.

## Scope note

No `src/` files were edited this session — every finding above is
traced from `reference/pokeemerald/` (`battle_script_commands.c`,
`data/battle_scripts_1.s`, `asm/macros/battle_script.inc`,
`include/constants/*.h`) and this engine's already-committed `src/engine/*`
and `src/data/gen/*` (read-only). No fixtures were staged (§3 explains the
scope call); no `docs/executable-frontier-census.md` edits (generated,
supervisor-owned); no `PROGRESS.md`/`ISSUES.md` edits (side-lane contract).

**Follow-up (later session):** the census's control-flow extraction bug
this doc's §1 identified is fixed in `tools/report/executable-frontier-census.ts`
and the doc is regenerated -- see `docs/executable-frontier-census.md`.
