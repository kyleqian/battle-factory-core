# Ingrain / Leech Seed / Wrap-family ground truth (end-turn-ground-truth.md §4 slice 5)

Side-lane ground-truth scout for `docs/end-turn-ground-truth.md` §4 slice 5:
Ingrain (B1), Leech Seed (B4), and Wrap-family damage (B10) — both their
end-turn *bodies* (already partly covered by that doc) and, newly, their
**SETTER moves** (`BattleScript_EffectIngrain`, `EffectLeechSeed`,
`EffectTrap`), which that doc explicitly did not scope. No `src/` production
code is touched by this doc's worker — prep only, same contract as
`docs/end-turn-ground-truth.md` and `docs/screens-weather-ground-truth.md`.

A major finding up front: **the `DoBattlerEndTurnEffects` orchestration loop
this doc's predecessor recommended as "step 2" has already landed**
(`src/engine/battleEndTurnOrchestration.ts`, PROGRESS entry 456, commit
`f5a739f`) — it already has a live, gated `ENDTURN_INGRAIN` case-barrier
(`STATUS3_ROOTED` checked, barriers because nothing sets the bit yet), but
**no gate at all** for `ENDTURN_LEECH_SEED`/`ENDTURN_WRAP` (the loop's own
comment calls them "no modeled trigger state ... permanently inert no-op
today"). This changes the registration-order story from the predecessor
doc's step 2/step 5 split: the orchestration *host* exists now, so slice 5
is purely about (a) the two new setter opcodes/dispatch cases and (b)
wiring three new gate checks + label lookups into the loop that already
exists.

Rerunnable verify script:
`tools/probe/verify-ingrain-leechseed-wrap-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-ingrain-leechseed-wrap-ground-truth.ts`).
Reruns three committed battle-lab scenarios
(`tools/battle-lab/mechanic-leechseed-drain-off.json`,
`tools/battle-lab/mechanic-ingrain-heal-off.json`,
`tools/battle-lab/mechanic-wrap-damage-off.json`) against the live
`battle-scene-off` oracle. **All 18 checks PASS, confirmed run twice for
determinism** (identical PASS/FAIL output both runs; scenarios are seeded
and deterministic).

## 0. Registered opcode set (grepped live, this session)

```
ACCURACYCHECK, ADDBYTE, ADJUSTNORMALDAMAGE, ATTACKANIMATION, ATTACKCANCELER,
ATTACKSTRING, BICWORD, CALL, CANCELALLACTIONS, CHECKTEAMSLOST,
CHOSENSTATUSANIMATION, CLEAREFFECTSONFAINT, COPYARRAYWITHINDEX, CRITCALC,
CRITMESSAGE, DAMAGECALC, DATAHPUPDATE, DECREMENTMULTIHIT, DOFAINTANIMATION,
DRAWPARTYSTATUSSUMMARY, EFFECTIVENESSSOUND, END, END2, FANFARE, GETEXP,
GETSWITCHEDMONDATA, GOTO, HEALTHBARUPDATE, HIDEPARTYSTATUSSUMMARY,
HITANIMATION, HPTHRESHOLDS, JUMPIFARRAYNOTEQUAL, JUMPIFBYTE, JUMPIFHALFWORD,
JUMPIFSTATUS2, JUMPIFSTATUS3CONDITION, JUMPIFWORD, MAKEVISIBLE, MOVEEND,
MOVEVALUESCLEANUP, NOP, OPENPARTYSCREEN, ORBYTE, ORWORD, PAUSE,
PLAYANIMATION_VAR, PLAYANIMATION, PLAYFAINTCRY, PLAYSE, PPREDUCE,
PRINTFROMTABLE, PRINTSELECTIONSTRING, PRINTSELECTIONSTRINGFROMTABLE,
PRINTSTRING, RESULTMESSAGE, RETURN, SETBYTE, SETEFFECTWITHCHANCE,
SETGRAPHICALSTATCHANGEVALUES, SETHAIL, SETLIGHTSCREEN, SETMIST,
SETMULTIHIT, SETMULTIHITCOUNTER, SETRAIN, SETREFLECT, SETSAFEGUARD,
SETSANDSTORM, SETSUNNY, STATBUFFCHANGE, STATUS2ANIMATION, STATUSANIMATION,
SWITCHHANDLEORDER, SWITCHINANIM, SWITCHINDATAUPDATE, SWITCHINEFFECTS,
TRAINERSLIDEIN, TRAINERSLIDEOUT, TRYFAINTMON, TYPECALC, UPDATESTATUSICON,
VARIOUS, WAITANIMATION, WAITMESSAGE, WAITSTATE, WEATHERDAMAGE
```
(`grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u`, **86
entries** as of this writing — up from `end-turn-ground-truth.md` §0's
cached 49, and up from `screens-weather-ground-truth.md` §0's 72. Per that
doc's own warning, this count is re-grepped fresh, not reused.
`ORWORD`/`PLAYANIMATION` — the two opcodes `end-turn-ground-truth.md` §4
step 5 predicted as needed for Ingrain/Leech Seed/Wrap — **are both already
registered**, which materially changes this doc's own opcode-gap findings
below relative to that prediction.)

## 1. Setter topology

### 1a. Ingrain — `BattleScript_EffectIngrain` (`data/battle_scripts_1.s:2377-2386`)

```
attackcanceler
attackstring
ppreduce
trysetroots BattleScript_ButItFailed
attackanimation
waitanimation
printstring STRINGID_PKMNPLANTEDROOTS
waitmessage B_WAIT_TIME_LONG
goto BattleScript_MoveEnd
```

Every opcode joined against the live §0 set: `ATTACKCANCELER`✓,
`ATTACKSTRING`✓, `PPREDUCE`✓, **`TRYSETROOTS`✗ (not registered)**,
`ATTACKANIMATION`✓, `WAITANIMATION`✓, `PRINTSTRING`✓, `WAITMESSAGE`✓,
`GOTO`✓. **Exactly one opcode gap: `TRYSETROOTS`.**

`Cmd_trysetroots` (`src/battle_script_commands.c:9326-9336`):

```c
static void Cmd_trysetroots(void)
{
    if (gStatuses3[gBattlerAttacker] & STATUS3_ROOTED)
    {
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1); // fail jump
    }
    else
    {
        gStatuses3[gBattlerAttacker] |= STATUS3_ROOTED;
        gBattlescriptCurrInstr += 5;
    }
}
```

No RNG, no accuracy check anywhere in the setter script (Ingrain cannot
miss — the only failure mode is "already rooted"). Write:
`gStatuses3[attacker] |= STATUS3_ROOTED` (`1 << 10`, `include/constants/
battle.h:167`) — this engine already models the exact bit
(`BATTLE_SCRIPT_STATUS3_ROOTED` in `src/engine/battleScriptSourceConstants.ts:69`,
already read by the landed end-turn loop's barrier check).

### 1b. Leech Seed — `BattleScript_EffectLeechSeed`/`DoLeechSeed` (`data/battle_scripts_1.s:1157-1170`)

```
attackcanceler
attackstring
pause B_WAIT_TIME_SHORT
ppreduce
jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed
accuracycheck BattleScript_DoLeechSeed, ACC_CURR_MOVE
BattleScript_DoLeechSeed::
setseeded
attackanimation
waitanimation
printfromtable gLeechSeedStringIds
waitmessage B_WAIT_TIME_LONG
goto BattleScript_MoveEnd
```

Joined against §0: `ATTACKCANCELER`✓, `ATTACKSTRING`✓, `PAUSE`✓, `PPREDUCE`✓,
`JUMPIFSTATUS2`✓, `ACCURACYCHECK`✓, **`SETSEEDED`✗ (not registered)**,
`ATTACKANIMATION`✓, `WAITANIMATION`✓, `PRINTFROMTABLE`✓, `WAITMESSAGE`✓,
`GOTO`✓. **Exactly one opcode gap: `SETSEEDED`.** (Unlike Ingrain, this
setter *does* draw an accuracy `Random()` — standard `ACC_CURR_MOVE` check,
already covered by the existing hit-chain ground truth, not new here.)

`Cmd_setseeded` (`src/battle_script_commands.c:6718-6736`):

```c
static void Cmd_setseeded(void)
{
    if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT || gStatuses3[gBattlerTarget] & STATUS3_LEECHSEED)
        { /* MISSED, "already seeded" message */ }
    else if (IS_BATTLER_OF_TYPE(gBattlerTarget, TYPE_GRASS))
        { /* MISSED, "it doesn't affect" message */ }
    else
    {
        gStatuses3[gBattlerTarget] |= gBattlerAttacker;   // STATUS3_LEECHSEED_BATTLER (bits 0-1): the seeder's battler id
        gStatuses3[gBattlerTarget] |= STATUS3_LEECHSEED;  // bit 2
    }
    gBattlescriptCurrInstr++;
}
```

Two real fail branches beyond the accuracy roll: Grass-type target (type
immunity, checked live via battle-lab schema — not separately probed this
session, cheap to add), and re-seeding an already-seeded target. Writes are
two bit ranges of `gStatuses3[target]`: `STATUS3_LEECHSEED_BATTLER`
(`(1<<0)|(1<<1)`, the seeder's battler id, 0-3) and `STATUS3_LEECHSEED`
(`1<<2`). **Neither of these bits exists yet in
`battleScriptSourceConstants.ts`** (only `STATUS3_ROOTED` is defined there
today) — a new gap this doc surfaces that the predecessor doc's table
didn't call out (it only tracked the *reading* side via `battle-lab`'s own
`volatile.leechSeededBy`, not this engine's own constant set).

### 1c. Wrap family — `BattleScript_EffectTrap` (`data/battle_scripts_1.s:830-837`) + `MOVE_EFFECT_WRAP` (not a new opcode — a new *case* inside the already-registered `SETEFFECTWITHCHANCE` dispatcher)

```
BattleScript_EffectTrap::
    jumpifnotmove MOVE_WHIRLPOOL, BattleScript_DoWrapEffect
    jumpifnostatus3 BS_TARGET, STATUS3_UNDERWATER, BattleScript_DoWrapEffect
    orword gHitMarker, HITMARKER_IGNORE_UNDERWATER
    setbyte sDMG_MULTIPLIER, 2
BattleScript_DoWrapEffect::
    setmoveeffect MOVE_EFFECT_WRAP
    goto BattleScript_EffectHit
```

`jumpifnotmove`/`jumpifnostatus3`/`setmoveeffect` are all macros, not
distinct opcodes (`asm/macros/battle_script.inc:1370,1418-1428`): they
expand to `jumpifhalfword`/`jumpifstatus3condition`/`setbyte` respectively —
**all three already registered** (`JUMPIFHALFWORD`✓,
`JUMPIFSTATUS3CONDITION`✓, `SETBYTE`✓), alongside `ORWORD`✓ and `GOTO`✓.
So `BattleScript_EffectTrap` itself is **fully opcode-complete today** — it
falls straight through into the shared `BattleScript_EffectHit` chain
(`attackcanceler`/`accuracycheck`/`attackstring`/`typecalc`/`damagecalc`/
`seteffectwithchance`/...), which is the same chain every ordinary damaging
move already uses and this engine already interprets end-to-end
(`battleScriptHitChainOpcode.ts`).

The actual gap is one level down: `Cmd_seteffectwithchance`'s
`MOVE_EFFECT_WRAP` case (`src/battle_script_commands.c:2611-2632`) is a
**new case inside the already-registered opcode**, not a new opcode:

```c
case MOVE_EFFECT_WRAP:
    if (gBattleMons[gEffectBattler].status2 & STATUS2_WRAPPED)
    {
        gBattlescriptCurrInstr++; // already wrapped by someone else this action: skip
    }
    else
    {
        gBattleMons[gEffectBattler].status2 |= STATUS2_WRAPPED_TURN((Random() & 3) + 3); // 3-6 turns
        *(gBattleStruct->wrappedMove + gEffectBattler * 2 + 0) = gCurrentMove;
        *(gBattleStruct->wrappedMove + gEffectBattler * 2 + 1) = gCurrentMove >> 8;
        *(gBattleStruct->wrappedBy + gEffectBattler) = gBattlerAttacker;
        BattleScriptPush(gBattlescriptCurrInstr + 1);
        gBattlescriptCurrInstr = BattleScript_MoveEffectWrap; // printfromtable gWrappedStringIds / waitmessage / return -- both already-registered opcodes
    }
```

**Setter RNG, confirmed against the real source, not assumed: the duration
roll is exactly `(Random() & 3) + 3`, giving 3-6 turns inclusive** — this
session's own live probe (§3c below) independently observed a real duration
draw of 6 (the max), corroborating the formula rather than just quoting it.
This engine's own `applySetMoveEffect` (`battleScriptHitChainOpcode.ts:
1784-1879`) already has the right dispatch *shape* for this (a
`SET_MOVE_EFFECT_SUPPORTED_BYTES` allowlist, `MOVE_EFFECT_WRAP` = byte 13
per `include/constants/battle.h:260`) but the byte isn't in the allowlist
yet, so it hits the file's own named `unsupportedBranch()` call
(`battleScriptHitChainOpcode.ts:1846-1852`) today — a barrier, not a
crash, confirmed by an independent read of the dispatcher (this session's
research subagent traced the exact halt path).

Two struct-identity fields this engine does not model at all yet:
`gBattleStruct->wrappedMove[battler]` (which move is doing the trapping —
needed for the end-turn tick's "Pkmn is hurt by Wrap!" message parameter)
and `gBattleStruct->wrappedBy[battler]` (who set it — needed by
`Cmd_cleareffectsonfaint`'s cross-battler clear, which **already has a
named barrier waiting for exactly this field**:
`battleScriptHitChainOpcode.ts:2543-2551`, "`FaintClearSetData's
STATUS2_WRAPPED cross-battler clear ... needs gBattleStruct->wrappedBy
identity, not modeled here"`). This is a real, load-bearing prerequisite:
wiring Wrap's setter without also adding `wrappedBy` would make an already-
present barrier reachable for the first time (a wrapped mon's trapper
fainting mid-trap).

**Factory L50 legality + carrier counts** (re-verified live against the 882-
entry `src/data/gen/battle-frontier-mons.json`, not reused from the
predecessor doc):

| Move | Frontier entries | Unique species | Example carriers | Real acc |
| --- | --- | --- | --- | --- |
| `MOVE_WRAP` | 5 | 5 | BELLSPROUT, TENTACOOL, WEEPINBELL, DRAGONAIR, SHUCKLE | 85 |
| `MOVE_BIND` | 2 | 2 | ONIX, TANGELA | 75 |
| `MOVE_FIRE_SPIN` | 7 | 7 | VULPIX, CHARMANDER, TORCHIC, CHARMELEON, PONYTA, SOLROCK, TORKOAL | 70 |
| `MOVE_CLAMP` | 1 | 1 | SHELLDER | 75 |
| `MOVE_WHIRLPOOL` | 4 | 4 | MUDKIP, WAILMER, HUNTAIL, GOREBYSS | 70 |
| `MOVE_SAND_TOMB` | 1 | 1 | DUGTRIO | 70 |
| **Total** | **20** | **20** | | |

Matches `end-turn-ground-truth.md` B10's own 5/2/7/1/4/1 = 20 exactly —
**confirmed, not contradicted**. For Ingrain/Leech Seed, this session's
count is entries-vs-unique-species precise where the predecessor doc's was
species-only:

| Move | Frontier entries | Unique species | Predecessor doc said |
| --- | --- | --- | --- |
| `MOVE_INGRAIN` | 5 | 5 | "5 carriers" ✓ matches |
| `MOVE_LEECH_SEED` | **14** | **13** | "13 carriers" — matches the **unique-species** count, not entries; one species (LUDICOLO, confirmed by direct lookup) has two distinct rental entries. Not a contradiction, but the predecessor doc's own units were ambiguous — this doc's table makes the entries-vs-species distinction explicit for future scouts. |

## 2. End-turn bodies

The end-turn *host* is real and landed (`battleEndTurnOrchestration.ts`,
see the intro). What follows is the opcode-gap analysis for the three
script bodies it would need to reach, joined against the live §0 set — a
materially different answer than `end-turn-ground-truth.md` §4 step 5's
prediction, because `ORWORD`/`PLAYANIMATION` registered since.

### 2a. Ingrain — `BattleScript_IngrainTurnHeal` (`data/battle_scripts_1.s:3609-3616`)

```
playanimation BS_ATTACKER, B_ANIM_INGRAIN_HEAL
printstring STRINGID_PKMNABSORBEDNUTRIENTS
waitmessage B_WAIT_TIME_LONG
orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE
healthbarupdate BS_ATTACKER
datahpupdate BS_ATTACKER
end2
```

`PLAYANIMATION`✓ `PRINTSTRING`✓ `WAITMESSAGE`✓ `ORWORD`✓
`HEALTHBARUPDATE`✓ `DATAHPUPDATE`✓ `END2`✓. **Zero new opcodes needed** —
a correction to `end-turn-ground-truth.md` §4 step 5, which predicted
`PLAYANIMATION, ORWORD` as new; both are now registered (entry 456). No
`tryfaintmon`/`checkteamslost` in this script at all — confirms the
predecessor doc's "can't die from healing" claim structurally, not just by
inference: there is no fail-state code path for this script to reach even
in principle.

C-side trigger (`src/battle_util.c:1480-1492`, `ENDTURN_INGRAIN`):
`gBattleMoveDamage = -(maxHP/16, floor, min 1)` (negated for
`datahpupdate`'s heal convention), guarded on `STATUS3_ROOTED && hp !=
maxHP && hp != 0`. **Zero `Random()` draws.** Live-verified this session
(§3b): the heal amount is capped at `maxHP` by `datahpupdate` itself
(observed +2 to reach max 161 from 159, not a blind +10) — `maxHP/16`
is the ceiling per tick, not a fixed amount that can overheal.

### 2b. Leech Seed — `BattleScript_LeechSeedTurnDrain` (`data/battle_scripts_1.s:3265-3283`)

```
playanimation BS_ATTACKER, B_ANIM_LEECH_SEED_DRAIN, sB_ANIM_ARG1
orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE
healthbarupdate BS_ATTACKER
datahpupdate BS_ATTACKER
copyword gBattleMoveDamage, gHpDealt
jumpifability BS_ATTACKER, ABILITY_LIQUID_OOZE, BattleScript_LeechSeedTurnPrintLiquidOoze
manipulatedamage DMG_CHANGE_SIGN
setbyte cMULTISTRING_CHOOSER, B_MSG_LEECH_SEED_DRAIN
goto BattleScript_LeechSeedTurnPrintAndUpdateHp
BattleScript_LeechSeedTurnPrintLiquidOoze::
setbyte cMULTISTRING_CHOOSER, B_MSG_LEECH_SEED_OOZE
BattleScript_LeechSeedTurnPrintAndUpdateHp::
orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE
healthbarupdate BS_TARGET
datahpupdate BS_TARGET
printfromtable gLeechSeedStringIds
waitmessage B_WAIT_TIME_LONG
tryfaintmon BS_ATTACKER
tryfaintmon BS_TARGET
end2
```

(Note: in this script `BS_ATTACKER` is the *seeded* battler — it drains
first — and `BS_TARGET` is the *seeder* who receives the HP, per the C
side's own comment "`gBattlerTarget` is actually the HP receiver".)

`PLAYANIMATION`✓ `ORWORD`✓ `HEALTHBARUPDATE`✓ `DATAHPUPDATE`✓
**`COPYWORD`✗** **`JUMPIFABILITY`✗** **`MANIPULATEDAMAGE`✗** `SETBYTE`✓
`GOTO`✓ `PRINTFROMTABLE`✓ `WAITMESSAGE`✓ `TRYFAINTMON`✓ `END2`✓.
**Three opcode gaps: `COPYWORD`, `JUMPIFABILITY`, `MANIPULATEDAMAGE`** —
this matches `end-turn-ground-truth.md` §4 step 5's prediction exactly
(unlike Ingrain/Wrap, this one wasn't affected by the two opcodes
registered since). `Cmd_manipulatedamage`'s `DMG_CHANGE_SIGN` case
(`src/battle_script_commands.c:6740-6747`) is a two-line arithmetic flip
(`gBattleMoveDamage *= -1`) — trivial once the opcode exists.
`Cmd_copyword` is a plain 4-byte memory copy. `Cmd_jumpifability` is a
straightforward ability-equality branch, structurally close to the
already-registered `JUMPIFSTATUS2`/`JUMPIFSTATUS3CONDITION` family (a
`GetBattlerForBattleScript` selector + a comparison + a jump).

C-side trigger (`src/battle_util.c:1508-1521`, `ENDTURN_LEECH_SEED`):
guarded on `STATUS3_LEECHSEED && seeder.hp != 0 && seeded.hp != 0`, drain =
`maxHP/8` (floor, min 1) of the **seeded** mon, credited to the **seeder**
(the two-`datahpupdate` shape the predecessor doc already flagged). **Zero
`Random()` draws** — live-verified this session (§3a), matching the
predecessor doc's table exactly.

### 2c. Wrap-family damage — `BattleScript_WrapTurnDmg` → `BattleScript_DoTurnDmg` (`data/battle_scripts_1.s:3829-3847`) / `BattleScript_WrapEnds`

```
BattleScript_WrapTurnDmg::
    playanimation BS_ATTACKER, B_ANIM_TURN_TRAP, sB_ANIM_ARG1
    printstring STRINGID_PKMNHURTBY
    waitmessage B_WAIT_TIME_LONG
    goto BattleScript_DoTurnDmg
BattleScript_DoTurnDmg::
    orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE
    healthbarupdate BS_ATTACKER
    datahpupdate BS_ATTACKER
    tryfaintmon BS_ATTACKER
    checkteamslost BattleScript_DoTurnDmgEnd
BattleScript_DoTurnDmgEnd::
    end2

BattleScript_WrapEnds::
    printstring STRINGID_PKMNFREEDFROM
    waitmessage B_WAIT_TIME_LONG
    end2
```

Both branches fully opcode-complete today: `PLAYANIMATION`✓ `PRINTSTRING`✓
`WAITMESSAGE`✓ `GOTO`✓ `ORWORD`✓ `HEALTHBARUPDATE`✓ `DATAHPUPDATE`✓
`TRYFAINTMON`✓ `CHECKTEAMSLOST`✓ `END2`✓. **Zero new opcodes needed for
either branch** — this is the same "corrects the predecessor doc's
`PLAYANIMATION`/`ORWORD` prediction" story as Ingrain (§2a); the damage
branch also reuses the exact same shared `DoTurnDmg` tail as burn/poison/
toxic (already live-verified end-to-end by `end-turn-ground-truth.md` §2a/
§2b), so this engine's `runTickScript`/`runBattlerStatusDamageTick`
machinery (`battleEndTurnOrchestration.ts:259-287`) is a structural match —
Wrap only needs a new label lookup, not new tick-loop plumbing.

C-side trigger (`src/battle_util.c:1592-1621`, `ENDTURN_WRAP`): guarded on
`STATUS2_WRAPPED && hp != 0`; **decrements the counter FIRST**
(`status2 -= STATUS2_WRAPPED_TURN(1)`), then branches on whether
`STATUS2_WRAPPED` is still nonzero — damage (`maxHP/16`, floor, min 1) if
still trapped, `WrapEnds` (release, no damage) if the decrement hit zero.
**Zero `Random()` draws for either branch** — live-verified this session
(§3c) for the damage branch across two separate recurrences; the release
branch itself was not directly observed in this session's capture window
(see §3c's honesty note) but is fully source-cited above and needs no new
opcodes to execute once reached.

## 3. Live ledger (fixtures, all Factory L50 singles, `overrides.parties`, seed 1)

All three fixtures use a real Frontier-legal 3-mon roster per side (species/
level/nature/full IVs/EVs/moves/ppUps/item/abilitySlot, matching the
existing `mechanic-endturn-*-off.json` convention) with the opponent's
active slot's all-four move slots identical (Splash or Pound), constraining
the Factory AI to one legal choice with no injected decision, per
`AGENTS.md`'s `mechanicLab` contract. Benched slots 2-3 are unused filler
(never switched in). Frame numbers below are exact, live-captured, and
re-verified by the committed probe script.

### 3a. `mechanic-leechseed-drain-off.json` — player BRELOOM (`MOVE_LEECH_SEED`×4, real carrier) vs opponent WYNAUT (`MOVE_SPLASH`×4, 0-RNG filler, isolates the drain ticks cleanly)

| Frame | `opponent.hp` | `opponent.status3` | `volatile.leechSeededBy` | `rngValue` |
| --- | --- | --- | --- | --- |
| 0 | 170 | 0 | null | 919694434 |
| 478-482 | 170 | 4 (`STATUS3_LEECHSEED`) | `"player"` | 3690816045 |
| 826-832 | **149** (-21 = floor(170/8)) | 4 | `"player"` | 3690816045 (unchanged) |
| 2036-2039 | 149 | 4 | `"player"` | 3034451114 |
| 2040-2042 | **128** (-21 again) | 4 | `"player"` | 3034451114 (unchanged) |

Seed lands and the first drain tick fires **the same turn** (turn 1: the
setter's `accuracycheck` draws the only RNG for that turn, `rngValue`
identical across the seed-set → tick-1 boundary at frames 480→826).
Tick 2 (turn 2, a re-attempted already-seeded Leech Seed use — real "but it
failed" flavor, harmless) again drains a flat 21, `rngValue` identical
across 2039→2040 — **both ticks draw zero `Random()` calls**, confirming
`end-turn-ground-truth.md` B4's table.

### 3b. `mechanic-ingrain-heal-off.json` — player CRADILY (`MOVE_INGRAIN`×4, real carrier) vs opponent MAGIKARP (`MOVE_POUND`×4, real prior hit — not injected — to stage the holder below full HP)

| Frame | `player.hp` | `player.status3` | `rngValue` |
| --- | --- | --- | --- |
| 0 | 161 (full) | 0 | 919694434 |
| 520 | **159** (real Pound hit, -2) | 0 | 3421819359 |
| 650 | 159 | **1024** (`STATUS3_ROOTED`) | 1621732966 |
| 929 | 159 | 1024 | 1621732966 |
| 930 | **161** (healed to exactly maxHP, capped — not a blind +10) | 1024 | 1621732966 (unchanged) |
| 1740 | 159 (second real Pound hit) | 1024 | 530917129 |
| 2127 | 159 | 1024 | 1160559944 |
| 2128 | **161** (healed to maxHP again) | 1024 | 1160559944 (unchanged) |

Both heal ticks land the same turn as their trigger condition being true,
draw **zero** `Random()`, and are capped at `maxHP` — `floor(161/16) = 10`
would overshoot from 159, but the observed heal is exactly +2 (159→161),
confirming `datahpupdate`'s max-HP clamp governs the visible amount, not a
blind `maxHP/16` add.

### 3c. `mechanic-wrap-damage-off.json` — player TENTACOOL (`MOVE_WRAP`×4, real carrier) vs opponent WYNAUT (`MOVE_SPLASH`×4, 0-RNG filler)

| Frame | `opponent.hp` | `status2` (WRAPPED bits, turns remaining) | `rngValue` |
| --- | --- | --- | --- |
| 0 | 170 (full) | `0x0000` (0) | 1621732966 |
| 535-544 | **163** (Wrap's own direct hit, -7) | `0xc000` (**6** — the max of `(Random()&3)+3`) | 2682491093 |
| 795-797 | 163 | `0xc000` (6) | 2682491093 |
| 798-804 | 163 | **`0xa000` (5)** — decremented BEFORE the damage roll | 2682491093 (unchanged) |
| 935-938 | 163 | `0xa000` (5) | 2682491093 |
| 939-944 | **153** (-10 = floor(170/16)) | `0xa000` (5) | 2682491093 (unchanged through 943; new draw at 944, next turn) |
| 1915-1924 | 146 | `0x8000` (**4**) | 786441859 |
| 2055-2064 | **136** (-10 again) | `0x8000` (4) | 1300148282→3600394957 (a later-turn draw lands inside this window; see honesty note) |
| 3155-3164 | 136 | `0x6000` (**3**) | 1493602236 |
| 3295 | **126** (-10 again) | `0x6000` (3) | 1493602236 (unchanged from 3155) |

Wrap's own attack deals ordinary `EFFECT_HIT` direct damage on **every**
use (turns 2+ re-cast Wrap on an already-trapped target — the C-side
`MOVE_EFFECT_WRAP` case skips re-rolling the duration but `BattleScript_
EffectHit`'s own damage/accuracy/crit chain still runs in full), which is
why later windows show more RNG churn than the isolated Leech Seed/Ingrain
fixtures — a real, source-confirmed interaction, not fixture noise. The
counter decrements exactly 1 per end-turn while still trapped (6→5→4→3
observed over 3 recurrences) and tick 1's decrement+damage pair is
independently confirmed **zero-`Random()`** with tight frame precision
(797→798→939 all identical `rngValue`). **Honesty note, per the brief's
"any long-wait/incomplete evidence gets flagged" spirit:** this session's
capture window (9 turn-groups, 3636 frames) was long enough to observe 3
consecutive decrements (6→5→4→3) but not the release turn itself
(would need ~2 more turn-groups to reach counter 0); the release branch
(`BattleScript_WrapEnds`, §2c) is therefore **source-cited, not
live-captured**, in this doc.

## 4. RNG attribution per tick, branch-aware

| Event | `Random()` draws | Branch |
| --- | --- | --- |
| Ingrain setter (`trysetroots`) | 0 | always (no accuracy check in this script at all) |
| Leech Seed setter (`accuracycheck` + `setseeded`) | 1 (standard accuracy roll, `ACC_CURR_MOVE`) | pass/fail already covered by existing hit-chain ground truth; `setseeded` itself draws 0 |
| Wrap-family setter direct hit (`EFFECT_HIT` chain) | standard hit-chain draws (accuracy/crit/damage variance — already covered elsewhere) | every use, not just the first |
| Wrap-family duration roll (`(Random() & 3) + 3`) | **1**, only on the use that actually sets `STATUS2_WRAPPED` (already-wrapped re-use skips it) | 3-6 turns, live-observed value 6 this session |
| `ENDTURN_INGRAIN` heal tick | **0** | live-verified, 2 ticks |
| `ENDTURN_LEECH_SEED` drain tick | **0** | live-verified, 2 ticks |
| `ENDTURN_WRAP` decrement+damage tick | **0** | live-verified (tick 1 with tight frame precision; ticks 2-3 corroborate the flat damage amount, RNG-precision degraded there only by the confound above, not by evidence of an actual draw) |
| `ENDTURN_WRAP` release (`WrapEnds`) | 0 (source-cited; no `Random()`/RNG-touching opcode anywhere in the script) | not live-captured this session |

Net: **the entire end-turn phase for all three cases draws zero
`Random()`** — consistent with `end-turn-ground-truth.md`'s existing table
for every other battler case. The *only* RNG in this whole doc's scope is
in the **setters**: Leech Seed's ordinary accuracy roll and Wrap's own
duration roll, both outside the end-turn phase proper.

## 5. Recommended registration slices

Dependency-ordered; "new" is relative to §0's live 86-entry set (not the
stale end-turn-ground-truth.md count).

1. **Ingrain, end to end (cheapest, highest-confidence slice).** One new
   opcode (`TRYSETROOTS`, ~3 lines of C logic) for the setter, plus two new
   fields in `battleScriptSourceConstants.ts`/`BattleScriptRulesContext`
   for nothing at all — `STATUS3_ROOTED` is **already modeled** end to end
   (constant exists, engine's landed end-turn loop already gates on it and
   case-barriers). The end-turn body (`BattleScript_IngrainTurnHeal`) needs
   **zero new opcodes** (§2a). Land the setter, add one label lookup +
   `runTickScript` call replacing the existing case-barrier in
   `battleEndTurnOrchestration.ts`'s `ENDTURN_INGRAIN` case, done. This is
   the single most isolated, most over-determined slice in this doc.
2. **Wrap-family damage tick + setter's C-side effect case.** One new
   dispatch-table entry (not a new opcode) inside `applySetMoveEffect` for
   `MOVE_EFFECT_WRAP` (byte 13), needing: the `(Random() & 3) + 3` duration
   roll, and **two new struct-identity fields this engine doesn't model at
   all yet** (`wrappedMove[battler]`, `wrappedBy[battler]`) — the second of
   which unblocks an *already-present* barrier in
   `Cmd_cleareffectsonfaint`'s handler (`battleScriptHitChainOpcode.ts:
   2543-2551`), so this slice has a real cross-file dependency, not just an
   additive one. The end-turn damage/release bodies need **zero new
   opcodes** (§2c) and can reuse the existing `runTickScript` shared-tail
   machinery directly. Land the setter's C-side case, add
   `wrappedMove`/`wrappedBy` fields, add the `ENDTURN_WRAP` gate + two label
   lookups (damage vs. release) to the orchestration loop.
3. **Leech Seed, end to end (most opcode-work, self-contained).** Two new
   setter-side opcodes (`SETSEEDED` — trivial, ~15 lines; plus two new
   `gStatuses3` bit constants this doc's §1b flagged as still missing from
   `battleScriptSourceConstants.ts`) and three new end-turn-body opcodes
   (`COPYWORD`, `JUMPIFABILITY`, `MANIPULATEDAMAGE` — all small, and
   `JUMPIFABILITY` is structurally reusable for any future ability-gated
   branch, not single-purpose). `JUMPIFABILITY`'s only live consumer in
   this slice is the Liquid Ooze cosmetic-message branch — the drain/heal
   math itself does not depend on it (Liquid Ooze's actual *damage-instead-
   of-heal* behavior is the same `manipulatedamage`-skipped path, already
   captured by this doc's opcode list; no separate ability-effect port
   needed for the mechanic to work, only for the correct flavor text).

**What's explicitly NOT scoped here** (per the brief): no `src/` edits, no
actual opcode registration, `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2`/Uproar/
Yawn/Encore/other B-cases (explicitly out of scope), doubles, and
Battle-Scene-ON presentation (this doc used Battle Scene OFF throughout).
