# Fixed-damage + TYPECALC2 retaliation cluster -- ground truth (prep-scout)

Side-lane prep-scout for the census cluster (`docs/executable-frontier-census.md`):
`EFFECT_LEVEL_DAMAGE` (Seismic Toss/Night Shade, weight 10), `EFFECT_PSYWAVE`
(weight 2), `EFFECT_COUNTER` (weight 40), `EFFECT_MIRROR_COAT` (weight 14),
`EFFECT_BRICK_BREAK` (weight 46). Verify script:
`tools/probe/verify-fixed-damage-cluster-ground-truth.ts` (live oracle,
Battle Scene OFF, `node --experimental-strip-types`). Both runs this session:
**PASS: 0 failing check(s)**. **No `src/` edits** -- this is scouting only,
for a follow-up main-lane worker to register mechanically.

## 1. Opcode bodies, portability classification

### 1a. `Cmd_dmgtolevel` (battle_script_commands.c:7926-7930) -- (a) portable

```c
static void Cmd_dmgtolevel(void)
{
    gBattleMoveDamage = gBattleMons[gBattlerAttacker].level;
    gBattlescriptCurrInstr++;
}
```

Two lines, no branch, no RNG, no struct beyond `gBattleMons[].level` (already
modeled as `BattleScriptMoveEndBattlerMetadata.level`,
`battleScriptRulesContext.ts:194-199`). Trivially (a)-portable.

### 1b. `Cmd_psywavedamageeffect` (battle_script_commands.c:7932-7941) -- (a) portable

```c
static void Cmd_psywavedamageeffect(void)
{
    s32 randDamage;
    while ((randDamage = Random() % 16) > 10);
    randDamage *= 10;
    gBattleMoveDamage = gBattleMons[gBattlerAttacker].level * (randDamage + 50) / 100;
    gBattlescriptCurrInstr++;
}
```

Rejection-sampling loop over `Random() % 16`, redrawing until the sample is
`<= 10` (11 accepted values out of 16 possible, ~68.75% acceptance per draw,
so draw count is unbounded but small in practice -- live-verified at 1 and 2
draws below). Final damage = `level * (draw*10 + 50) / 100`, floor division.
No struct dependency beyond `level`. (a)-portable.

### 1c. `Cmd_counterdamagecalculator` (battle_script_commands.c:7943-7966) -- (b) barrier, but NOT on the opcode itself

```c
static void Cmd_counterdamagecalculator(void)
{
    u8 sideAttacker = GetBattlerSide(gBattlerAttacker);
    u8 sideTarget = GetBattlerSide(gProtectStructs[gBattlerAttacker].physicalBattlerId);

    if (gProtectStructs[gBattlerAttacker].physicalDmg
        && sideAttacker != sideTarget
        && gBattleMons[gProtectStructs[gBattlerAttacker].physicalBattlerId].hp)
    {
        gBattleMoveDamage = gProtectStructs[gBattlerAttacker].physicalDmg * 2;
        if (gSideTimers[sideTarget].followmeTimer && gBattleMons[gSideTimers[sideTarget].followmeTarget].hp)
            gBattlerTarget = gSideTimers[sideTarget].followmeTarget;
        else
            gBattlerTarget = gProtectStructs[gBattlerAttacker].physicalBattlerId;
        gBattlescriptCurrInstr += 5;
    }
    else
    {
        gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1;
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
    }
}
```

The opcode's own logic (x2 multiply, branch, target write) is simple. The
**decisive finding is the input it reads**: `gProtectStructs[attacker]
.physicalBattlerId` -- see §3, this field has no home anywhere in this
engine's `BattleScriptRulesContext` today. Registering the opcode alone
would have nothing correct to read. Follow-me redirection
(`gSideTimers[].followmeTimer`) is single-battler-inapplicable for L50
singles (no second ally battler to redirect to) -- (a) for that branch only.

### 1d. `Cmd_mirrorcoatdamagecalculator` (battle_script_commands.c:7969-7990) -- same shape, special side

Byte-identical structure to §1c with every `physical*` field swapped for
`special*` (`specialDmg`, `specialBattlerId`). Comment at line 7968 in
source confirms: `// A copy of Cmd with the physical -> special field
changes`. Same blocker: `gProtectStructs[attacker].specialBattlerId` has no
engine home (§3). Not live-fixtured this session (WORK step 3's required
fixture set is Seismic Toss/Psywave/Counter only); analysis-only.

### 1e. `Cmd_removelightscreenreflect` (battle_script_commands.c:9883-9903) -- (a) portable

```c
static void Cmd_removelightscreenreflect(void)
{
    u8 opposingSide = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker));
    if (gSideTimers[opposingSide].reflectTimer || gSideTimers[opposingSide].lightscreenTimer)
    {
        gSideStatuses[opposingSide] &= ~SIDE_STATUS_REFLECT;
        gSideStatuses[opposingSide] &= ~SIDE_STATUS_LIGHTSCREEN;
        gSideTimers[opposingSide].reflectTimer = 0;
        gSideTimers[opposingSide].lightscreenTimer = 0;
        gBattleScripting.animTurn = 1;
        gBattleScripting.animTargetsHit = 1;
    }
    else
    {
        gBattleScripting.animTurn = 0;
        gBattleScripting.animTargetsHit = 0;
    }
    gBattlescriptCurrInstr++;
}
```

Reads/writes exactly the fields `docs/screens-weather-ground-truth.md`
already models live: `BattleScriptSideTimerState.reflectTimer` /
`.lightscreenTimer` (`battleScriptRulesContext.ts:101-110`) and
`sideStatuses` (present in every `battle-lab` capture, confirmed in this
session's own probe output: `"sideStatuses": [0, 0]`). `gBattleScripting
.animTurn`/`.animTargetsHit` are animation-branch-selection fields (which of
two possible hit-animations to play; §2's doubles-only "wall shattered"
message reads `sB_ANIM_TURN` off this same value) -- presentation-only, not
logical state, out of scope for Scene-OFF. **(a)-portable**, no barrier
found; this is the one opcode in the whole cluster with a clean, already-
modeled dependency set.

## 2. TYPECALC2 vs TYPECALC -- exact divergence (Cmd bodies read side by side)

`Cmd_typecalc` (battle_script_commands.c:1355-1424, already registered,
`B_SCR_OP_TYPECALC` in `battleScriptHitChainOpcode.ts:2881`) vs
`Cmd_typecalc2` (battle_script_commands.c:4500-4593, unregistered). Full
bodies read this session. Divergences, every one cited:

1. **STAB.** `typecalc` applies same-type-attack-bonus *before* the type
   loop: `gBattleMoveDamage = gBattleMoveDamage * 15 / 10` when
   `IS_BATTLER_OF_TYPE(attacker, moveType)` (line 1369-1373).
   `typecalc2` has **no STAB line anywhere** in its body. Confirmed by
   source comment intent (Counter/Mirror Coat/Brick Break's second call
   must not re-apply STAB to an already-computed or fixed-formula damage
   value) and by the literal absence of the multiply in the read body.
2. **Damage scaling is not applied at all.** `typecalc`'s loop calls
   `ModulateDmgByType(multiplier)` (line 1399, 1403) which *immediately*
   multiplies `gBattleMoveDamage = gBattleMoveDamage * multiplier / 10`
   (battle_script_commands.c:1323) as it walks the type-effectiveness
   table. `typecalc2`'s loop (lines 4531-4572) only sets bits in a **local**
   `u8 flags` variable (`MOVE_RESULT_NOT_VERY_EFFECTIVE` /
   `MOVE_RESULT_SUPER_EFFECTIVE`) -- `gBattleMoveDamage` is never touched,
   and `flags` is read exactly once more (the Wonder Guard check, line
   4580) then discarded. **TYPECALC2 never scales damage by type
   effectiveness.** This is why Counter/Mirror Coat (fixed x2 retaliation)
   and Brick Break's *second* call (§2a below) can safely reuse it: its only
   job is the immunity gate, not the multiplier.
3. **Immunity gate is otherwise identical**: both bodies special-case
   Levitate-vs-Ground (miss + `DOESNT_AFFECT_FOE`) and walk the same
   `TYPE_EFFECT_ATK_TYPE`/`TYPE_MUL_NO_EFFECT` table for a `DOESNT_AFFECT_FOE`
   verdict (typecalc2: lines 4536-4540, 4554-4558 with an explicit `break`
   out of the loop once immunity is found -- typecalc's `ModulateDmgByType`
   path sets the same flag less directly via its `switch`).
4. **`gLastHitByType` is never written by typecalc2.** `typecalc`'s
   Levitate branch (line 1380) and Wonder Guard branch (line 1416) both
   zero `gLastHitByType[target]`; typecalc2's equivalent branches (lines
   4506-4512, 4577-4588) do not touch it at all. `gLastHitByType` is a
   "type of the last hit landed" tracker read by Pursuit-adjacent code
   (battle_script_commands.c:8096, 8116) and set by a different, unrelated
   opcode (line 4428) -- out of this cluster's scope, noted as a real but
   minor divergence, not a blocker.
5. **Wonder Guard condition adds one extra guard**: typecalc2's Wonder Guard
   check (line 4578) additionally requires `!(flags & MOVE_RESULT_NO_EFFECT)`
   (using the *local* flags, not `gMoveResultFlags`) -- typecalc's
   equivalent (line 1410) has no such extra term. Narrow edge case
   (a genuinely-immune-but-somehow-not-early-`break`-ing path), not exercised
   by this cluster's live fixtures.

**Consequence for the census's per-effect table:** Brick Break's script
(`data/battle_scripts_1.s:2418-2449`) calls **both** -- `typecalc` once at
line 2426 (inside the normal `damagecalc`/STAB/effectiveness chain, already
fully registered) and `typecalc2` a *second* time at line 2437, immediately
before `datahpupdate`/the actual hit. The second call is a pure immunity/
Wonder Guard recheck; it does **not** redundantly re-scale damage (per
divergence #2). This means Brick Break's *damage magnitude* is entirely
computed by the already-registered `typecalc`/`damagecalc`/`critcalc` chain
-- TYPECALC2 is only gating whether the already-computed hit actually lands.
The census's opcode-set framing (`REMOVELIGHTSCREENREFLECT, TYPECALC2`) is
accurate as a *reachability* fact but undersells that TYPECALC2 is a much
smaller lift for Brick Break specifically than for Counter/Mirror Coat
(where it's damage-relevant for the immunity gate but the actual
non-immunity retaliation math never touches it either).

## 3. Decisive census-class correction: EFFECT_COUNTER's real blocker is two missing data-model fields, not the opcode

Per the brief's precedent (status-cluster scout found hidden
jumpifability/JUMPIFSTATUS2 blockers), the same class of correction applies
here, found by tracing `Cmd_counterdamagecalculator`'s two read dependencies
back to their writers:

**3a. `gProtectStructs[].physicalDmg`/`.specialDmg` are tracked; `.physicalBattlerId`/`.specialBattlerId` are NOT, anywhere.**
The writer, `Cmd_datahpupdate` (battle_script_commands.c:1935-1969, comment:
*"Note: While physicalDmg/specialDmg below are only distinguished between
for Counter/Mirror Coat..."*), sets **four** fields per hit: `gProtectStructs
[target].physicalDmg` / `.physicalBattlerId` (or the special pair), and the
engine's registered handler for this opcode
(`createDatahpupdateOpcodeHandler`, `battleScriptHitChainOpcode.ts:1580-1719`,
installed at line 2889) **only reproduces the damage-amount half**
(`battlerChanges.specialStatus = {..., physicalDmg: dealt}` at
`battleScriptHitChainOpcode.ts:1682-1687`). There is no `physicalBattlerId`/
`specialBattlerId` field anywhere in `BattleScriptSpecialStatus`
(`battleScriptRulesContext.ts:95-99`, exactly three fields:
`restoredBattlerSprite`, `physicalDmg`, `specialDmg`) or in
`BattleScriptRulesBattlerBase`/`BattleScriptMoveEndBattlerMetadata`
(`battleScriptRulesContext.ts:122-263`, full field list read this session --
no `BattlerId` field of any kind for this purpose). `Cmd_doubledamagedealtifdamaged`
(battle_script_commands.c:9339-9348, a *different* future consumer, e.g.
Revenge/Avalanche) reads the exact same `physicalBattlerId`/`specialBattlerId`
pair, confirming this is a real source field, not a dead one -- just
unmodeled here.

Without this field, `COUNTERDAMAGECALCULATOR` cannot determine (a) whether
the last physical hit came from an opposing-side battler (`sideAttacker !=
sideTarget`), or (b) who to set as `gBattlerTarget`. Registering the opcode
alone gives it nothing correct to read for target selection -- it would have
to be paired with extending `BattleScriptSpecialStatus` (or an equivalent
new field) *and* `Cmd_datahpupdate`'s handler to also write the battler id,
which is a data-model change beyond "register one opcode."

**3b. The per-turn `ProtectStruct`-wide clear (`TurnValuesCleanUp(FALSE)`) is explicitly documented as unmodeled.**
Source: `gProtectStructs` is never `memset` per-hit; it is `memset`'d in full
once per turn boundary by `TurnValuesCleanUp(FALSE)`
(`reference/pokeemerald/src/battle_main.c:4857-4874`, the `dataPtr` byte-loop
at lines 4871-4873), called from the turn-loop driver
(`battle_main.c:3040,3901,3974`). This is *why* Counter/Mirror Coat are
"this-turn-only": the moment the turn ends, `physicalDmg`/`specialDmg`/
`physicalBattlerId`/`specialBattlerId` all zero out, so a stale hit from two
turns ago can never trigger a retaliation.

This engine's own `battleEndTurnOrchestration.ts:1224-1237` header comment
says exactly this, in its own words, already:
> `TurnValuesCleanUp(FALSE)`'s ProtectStruct-wide reset and
> `HandleWishPerishSongOnTurnEnd` ... are both out of this rung's modeled
> scope and are not applied -- callers that need a fresh `ProtectStruct` for
> the next turn must not rely on this function for that yet.

Corroborated structurally: every place `physicalDmg`/`specialDmg` are reset
to `0` in `src/engine/*.ts` (`factoryBattleScriptDecision.ts:223-224`,
`factoryBattleScriptFullTurnDecision.ts:221`,
`factoryBattleScriptTerminalDecision.ts:166`) is a **battle-init/terminal**
construction site, not a per-turn-boundary reset. No file resets these
fields between turn N and turn N+1.

**Net correction to the census:** `EFFECT_COUNTER` (and by the same
argument, `EFFECT_MIRROR_COAT`) is blocked on strictly more than
`{COUNTERDAMAGECALCULATOR, TYPECALC2}`. A follow-up implementer who
registers only those two opcodes would get a Counter that (a) cannot
legitimately pick or validate its retaliation target (no `physicalBattlerId`
modeled) and (b) if a `physicalBattlerId`-equivalent were bolted on without
also wiring the per-turn clear, would let a physical hit from an arbitrarily
old turn arm a retaliation forever -- wrong per source. Both gaps are
data-model/turn-orchestration work, not opcode dispatch work; they should be
scoped into whichever registration step lands `COUNTERDAMAGECALCULATOR`,
not discovered mid-implementation.

## 4. Effect script topology (data/battle_scripts_1.s, entry to shared tail)

```
BattleScript_EffectLevelDamage:: (1195-1204)
  attackcanceler / accuracycheck / attackstring / ppreduce / typecalc
  / bicbyte (clear super/not-very-effective flags) / dmgtolevel
  / adjustsetdamage / goto BattleScript_HitFromAtkAnimation

BattleScript_EffectPsywave:: (1206-1215)      -- byte-identical shape,
  psywavedamageeffect in place of dmgtolevel

BattleScript_EffectCounter:: (1217-1225)
  attackcanceler / counterdamagecalculator BattleScript_FailedFromAtkString
  / accuracycheck / attackstring / ppreduce / typecalc2 / adjustsetdamage
  / goto BattleScript_HitFromAtkAnimation

BattleScript_EffectMirrorCoat:: (1801, same shape as Counter, special side)

BattleScript_EffectBrickBreak:: (2418-2449)
  attackcanceler / accuracycheck / attackstring / ppreduce
  / removelightscreenreflect / critcalc / damagecalc / typecalc
  / adjustnormaldamage / jumpifbyte(animTurn==0 -> Anim) / bicbyte
  BattleScript_BrickBreakAnim:: attackanimation / waitanimation
    / jumpifbyte(animTurn<2 -> DoHit) / [dead in singles: "wall shattered" msg]
  BattleScript_BrickBreakDoHit:: typecalc2 / effectivenesssound
    / hitanimation / waitstate / healthbarupdate / datahpupdate / critmessage
    / resultmessage / seteffectwithchance / tryfaintmon / goto MoveEnd
```

`typecalc`, `bicbyte`, `adjustsetdamage`, `critcalc`, `damagecalc`,
`adjustnormaldamage`, `datahpupdate`, `attackcanceler`, `accuracycheck`,
`attackstring`, `ppreduce` are **all already registered** (confirmed by grep
against `battleScriptHitChainOpcode.ts`/`battleScriptSetByte.ts`) --
`BattleScript_HitFromAtkAnimation`'s shared tail is exercised by every other
already-executable effect that shares it, so it is not re-derived here.
`sB_ANIM_TURN`'s `jumpifbyte`/doubles-only "wall shattered" print is
animation-branch selection, dead in L50 singles (max value 1, branch guards
on `>= 2`) -- confirmed by reading `removelightscreenreflect`'s single-hit
`animTurn = 1` write (§1e) against the `< 2` guard at line 2433.

## 5. Live-verified ledgers (`verify-fixed-damage-cluster-ground-truth.ts`, oracle `battle-scene-off`)

Fixtures: `tools/battle-lab/mechanic-fixed-damage-{seismictoss,psywave,
counter-hit,counter-fail}.json`. All L50 singles, `overrides.parties`, three
complete legal Pokemon per side, single-ability leads (Machop/Guts, Abra/
Synchronize, Shuckle/Sturdy, Electrode/Static), opponent given 4 identical
moves to remove AI decision variance. Every run repeated for determinism
(identical frame-0 and frame-450 capture across two independent oracle
calls at the same seed) before comparing seeds.

### 5a. Seismic Toss (`MOVE_SEISMIC_TOSS`, L50 Machop -> L50 Eevee)

| seed | attacker level | opponent HP before -> after | dealt | Random() calls (whole turn) |
| --- | --- | --- | --- | --- |
| 1 | 50 | 130 -> 80 | 50 | 8 |
| 4 | 50 | 130 -> 80 | 50 | 8 |

Dealt damage == attacker level exactly, both seeds -- `Cmd_dmgtolevel` draws
zero RNG of its own; the 8 calls are 1 accuracycheck (100 acc, still rolled)
+ a 7-call shared hit-chain tail (not decomposed here -- out of this
cluster's scope, reported as an empirical regression pin only).

### 5b. Psywave (`MOVE_PSYWAVE`, 80 acc, L50 Abra -> L50 Eevee)

| seed | acc roll (u16%100) | rejection draws (`Random()%16`, in order) | final draw | randDamage | dealt | formula (`level*(randDamage+50)/100`) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 54 (hit) | [12, 10] | 10 | 100 | 75 | 75 |
| 4 | 33 (hit) | [1] | 1 | 10 | 30 | 30 |

Both seeds: dealt damage matches the formula exactly, RNG draw-by-draw
(rejecting 12 in seed 1's first draw since `12 > 10`, accepting 10; seed 4
accepts on the first draw). Draws fully attributed in the verify script's
console output.

### 5c. Counter -- hit case (Electrode `MOVE_POUND` -> Shuckle; Shuckle `MOVE_COUNTER` -> Electrode)

| seed | physical dmg taken (Pound) | Counter dmg dealt | ratio |
| --- | --- | --- | --- |
| 1 | 2 | 4 | 2.0x |
| 4 | 2 | 4 | 2.0x |

Exactly 2x in both seeds (Shuckle's high Defense floors Pound's own damage
roll to the same integer at both seeds -- expected at this damage scale, not
a bug; the x2 relationship is what's under test, not Pound's own formula).
Electrode (fast) always moves first with Pound; Shuckle (slow) moves second
with Counter, so `gProtectStructs[Shuckle].physicalDmg` is already populated
when Counter resolves -- same-turn ordering confirmed by construction
(speed gap), not independently re-derived.

### 5d. Counter -- failure case (Electrode `MOVE_GROWL`, a status move, -> Shuckle; Shuckle `MOVE_COUNTER`)

| seed | player (Shuckle) HP delta | opponent (Electrode) HP delta |
| --- | --- | --- |
| 1 | 0 | 0 |
| 2 | 0 | 0 |

No physical damage recorded (`physicalDmg` stays at its battle-init 0) ->
Counter fails outright, zero damage either direction, both seeds. This is
the `Cmd_counterdamagecalculator` else-branch (`T1_READ_PTR` jump to
`BattleScript_FailedFromAtkString`, §1c).

## 6. Target-selection / Follow Me -- explicitly out of scope

§1c's `gSideTimers[sideTarget].followmeTimer` redirect branch has no second
ally battler to redirect to in L50 singles (only one battler per side) --
structurally unreachable for this rung, not fixtured, not claimed tested.
A double-battle rung would need to cover it.

## 7. Summary table (opcode -> classification -> real blocker)

| Opcode | Classification | Real blocker for L50 singles |
| --- | --- | --- |
| `B_SCR_OP_DMGTOLEVEL` | (a) portable | none -- register directly, live-verified |
| `B_SCR_OP_PSYWAVEDAMAGEEFFECT` | (a) portable | none -- register directly, live-verified |
| `B_SCR_OP_COUNTERDAMAGECALCULATOR` | (b) barrier | missing `physicalBattlerId` field (§3a) + missing per-turn `ProtectStruct` clear (§3b); the opcode's own branch logic is simple |
| `B_SCR_OP_MIRRORCOATDAMAGECALCULATOR` | (b) barrier | same as Counter, special side (§3a/§3b); not live-fixtured this session |
| `B_SCR_OP_TYPECALC2` | (a) portable in isolation | no struct blocker found; divergence from TYPECALC is STAB-skip + no damage-scaling (§2), needs its own opcode body, not a reuse of `typecalc` |
| `B_SCR_OP_REMOVELIGHTSCREENREFLECT` | (a) portable | none -- reuses already-modeled `BattleScriptSideTimerState` fields (§1e) |

## PAPERCUT

None this session -- the harness, oracle, and `mechanicLab` fixtures all
worked on first or second try.
