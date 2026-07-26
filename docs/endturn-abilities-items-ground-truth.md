# `ENDTURN_ABILITIES` / `ENDTURN_ITEMS1` / `ENDTURN_ITEMS2` ground truth (end-turn-ground-truth.md B2/B3/B19, the carried breadth item from entries 460-464)

Side-lane ground-truth scout for the three `DoBattlerEndTurnEffects` cases
`docs/end-turn-ground-truth.md` explicitly scoped OUT (§4 step 8: "pure
ability/item breadth ... not new end-turn plumbing") and
`docs/ingrain-leechseed-wrap-ground-truth.md` reconfirmed as still
out-of-scope (§5 closing note). `battleEndTurnOrchestration.ts`'s own
`runDoBattlerEndTurnEffects` already has the exact hook points for these
three cases as no-op comments (lines 439/486): `// ENDTURN_ABILITIES/
ENDTURN_ITEMS1: pure-C ability/item breadth, explicitly out of scope (doc
B2/B3) -- no-op.` and `// ENDTURN_ITEMS2: pure-C item breadth, explicitly out
of scope (doc B3/B19) -- no-op.`. This doc banks what those bodies actually
do so a main-lane worker can register them mechanically, same contract as
`docs/ingrain-leechseed-wrap-ground-truth.md`. No `src/` production code is
touched by this doc's worker.

Rerunnable verify script:
`tools/probe/verify-endturn-abilities-items-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-endturn-abilities-items-ground-truth.ts`).
Reruns three committed battle-lab scenarios
(`tools/battle-lab/mechanic-endturn-speedboost-off.json`,
`tools/battle-lab/mechanic-endturn-raindish-off.json`,
`tools/battle-lab/mechanic-endturn-shedskin-off.json`) against the live
`battle-scene-off` oracle. **All checks PASS, confirmed run twice for
determinism.**

**Coverage summary (per the brief's own escape hatch):** `ENDTURN_ABILITIES`
(B2) is **fully covered** — all 4 real cases enumerated from source, cross-
referenced against the Factory L50 catalog, and 3 of the 4 (Speed Boost,
Rain Dish, Shed Skin — one live scenario per distinct mechanism class: zero-
RNG always-fires stat boost, zero-RNG HP/weather-gated heal, and the ONE
RNG-bearing case in the whole ability/item surface) are **live-verified**;
the 4th (Truant) is **source-complete but bench-only** (no script, no RNG,
trivial state toggle — live capture would need RAM-level
`gDisableStructs[].truantCounter` inspection this session didn't build a
probe for). `ENDTURN_ITEMS1`/`ENDTURN_ITEMS2` (B3/B19) are **banked
analytically, recipe-only** — full source enumeration, exact reachability
counts against the real 882-entry catalog, and the load-bearing ITEMS1-vs-
ITEMS2 ordering distinction (§4) are all source-cited and cross-checked, but
zero live scenarios were staged for the item side this session (time
budget went to nailing `ENDTURN_ABILITIES` completely first, per the
brief's own priority order).

## 0. Registered opcode set (grepped live, this session)

```
ACCURACYCHECK, ADDBYTE, ADJUSTNORMALDAMAGE, ADJUSTSETDAMAGE, ATTACKANIMATION,
ATTACKCANCELER, ATTACKSTRING, BICBYTE, BICWORD, CALL, CANCELALLACTIONS,
CHECKTEAMSLOST, CHOSENSTATUSANIMATION, CLEAREFFECTSONFAINT, COPYARRAY,
COPYARRAYWITHINDEX, CRITCALC, CRITMESSAGE, DAMAGECALC, DATAHPUPDATE,
DECREMENTMULTIHIT, DOFAINTANIMATION, DRAWPARTYSTATUSSUMMARY,
EFFECTIVENESSSOUND, END, END2, FANFARE, GETEXP, GETSWITCHEDMONDATA, GOTO,
HEALTHBARUPDATE, HIDEPARTYSTATUSSUMMARY, HITANIMATION, HPTHRESHOLDS,
JUMPIFABILITY, JUMPIFARRAYNOTEQUAL, JUMPIFBYTE, JUMPIFHALFWORD,
JUMPIFSTATUS2, JUMPIFSTATUS3CONDITION, JUMPIFWORD, MAKEVISIBLE,
MANIPULATEDAMAGE, MOVEEND, MOVEVALUESCLEANUP, NOP, OPENPARTYSCREEN, ORBYTE,
ORWORD, PAUSE, PLAYANIMATION_VAR, PLAYANIMATION, PLAYFAINTCRY, PLAYSE,
PPREDUCE, PRINTFROMTABLE, PRINTSELECTIONSTRING,
PRINTSELECTIONSTRINGFROMTABLE, PRINTSTRING, RESULTMESSAGE, RETURN, SETBYTE,
SETDAMAGETOHEALTHDIFFERENCE, SETEFFECTWITHCHANCE,
SETGRAPHICALSTATCHANGEVALUES, SETHAIL, SETLIGHTSCREEN, SETMIST,
SETMULTIHIT, SETMULTIHITCOUNTER, SETRAIN, SETREFLECT, SETSAFEGUARD,
SETSANDSTORM, SETSEEDED, SETSUNNY, STATBUFFCHANGE, STATUS2ANIMATION,
STATUSANIMATION, SWITCHHANDLEORDER, SWITCHINANIM, SWITCHINDATAUPDATE,
SWITCHINEFFECTS, TRAINERSLIDEIN, TRAINERSLIDEOUT, TRYCASTFORMDATACHANGE,
TRYFAINTMON, TRYSETROOTS, TYPECALC, UPDATESTATUSICON, VARIOUS,
WAITANIMATION, WAITMESSAGE, WAITSTATE, WEATHERDAMAGE
```
(`grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u`, **95
entries** as of this writing — up from `ingrain-leechseed-wrap-ground-
truth.md` §0's 86. Per that doc's own warning, re-grepped fresh, not reused.
Notably **`REMOVEITEM` and `END3` are NOT in this set** — both are new,
load-bearing gaps this doc's own registration plan (§5) depends on.)

## 1. Source topology

### 1a. Call sites (`battle_util.c:1464-1783`, `DoBattlerEndTurnEffects`)

```c
case ENDTURN_ABILITIES:  // end turn abilities
    if (AbilityBattleEffects(ABILITYEFFECT_ENDTURN, gActiveBattler, 0, 0, 0))
        effect++;
    gBattleStruct->turnEffectsTracker++;
    break;
case ENDTURN_ITEMS1:  // item effects
    if (ItemBattleEffects(ITEMEFFECT_NORMAL, gActiveBattler, FALSE))
        effect++;
    gBattleStruct->turnEffectsTracker++;
    break;
case ENDTURN_ITEMS2:  // item effects again
    if (ItemBattleEffects(ITEMEFFECT_NORMAL, gActiveBattler, TRUE))
        effect++;
    gBattleStruct->turnEffectsTracker++;
    break;
```
(`:1494-1508`.) **Load-bearing detail visible only by reading the call
sites side by side, not either function in isolation:** `ENDTURN_ITEMS1` and
`ENDTURN_ITEMS2` call the exact same function with the exact same `caseID`
(`ITEMEFFECT_NORMAL`) — the only difference is the third argument,
`moveTurn` (`FALSE` for ITEMS1, `TRUE` for ITEMS2). Nothing in `battle_util.c`
documents this; it is only legible from `ItemBattleEffects`'s own internal
`!moveTurn` guards (§1c). This is this doc's own version of PROGRESS #462's
"enum-order-vs-switch-order trap" — a second real ordering subtlety, this
time hiding inside a *shared* function body rather than a mismatched enum.

### 1b. `AbilityBattleEffects(ABILITYEFFECT_ENDTURN, battler, 0, 0, 0)` (`battle_util.c:2601-2658`)

Gated once at the top: `if (gBattleMons[battler].hp != 0)` (a fainted battler
gets zero ability checks). Then a plain switch on `gLastUsedAbility` (=
`gBattleMons[battler].ability` here, since `special`/`moveArg` are both 0)
with **exactly four cases** — this is the entire ability surface for
end-turn, source-confirmed exhaustive, not sampled:

```c
switch (gLastUsedAbility)
{
case ABILITY_RAIN_DISH:
    if (WEATHER_HAS_EFFECT && (gBattleWeather & B_WEATHER_RAIN)
     && gBattleMons[battler].maxHP > gBattleMons[battler].hp)
    {
        BattleScriptPushCursorAndCallback(BattleScript_RainDishActivates);
        gBattleMoveDamage = gBattleMons[battler].maxHP / 16;
        if (gBattleMoveDamage == 0) gBattleMoveDamage = 1;
        gBattleMoveDamage *= -1;
        effect++;
    }
    break;
case ABILITY_SHED_SKIN:
    if ((gBattleMons[battler].status1 & STATUS1_ANY) && (Random() % 3) == 0)
    {
        /* ...copy the Japanese status name into gBattleTextBuff1... */
        gBattleMons[battler].status1 = 0;
        gBattleMons[battler].status2 &= ~STATUS2_NIGHTMARE;  // fix nightmare glitch
        BattleScriptPushCursorAndCallback(BattleScript_ShedSkinActivates);
        BtlController_EmitSetMonData(...);  // pushes the cleared status1 to the controller
        effect++;
    }
    break;
case ABILITY_SPEED_BOOST:
    if (gBattleMons[battler].statStages[STAT_SPEED] < MAX_STAT_STAGE
     && gDisableStructs[battler].isFirstTurn != 2)
    {
        gBattleMons[battler].statStages[STAT_SPEED]++;
        BattleScriptPushCursorAndCallback(BattleScript_SpeedBoostActivates);
        effect++;
    }
    break;
case ABILITY_TRUANT:
    gDisableStructs[gBattlerAttacker].truantCounter ^= 1;
    // NOTE: no `effect++` here -- see §4's "silent case" finding.
    break;
}
```

**Structural finding, not visible from either function alone:** all three
scripted cases call `BattleScriptPushCursorAndCallback`, **not**
`BattleScriptExecute`. Every previously-wired end-turn tick (Ingrain/Leech
Seed/Wrap/Poison/Toxic/Burn, `battleEndTurnOrchestration.ts`'s existing
`runTickScript`) uses `BattleScriptExecute`, which this engine already
models via `startBattleScriptExecute` (reset `callStack` to `[]`, run to the
script's own `end`/`end2`). `BattleScriptPushCursorAndCallback` is a
different primitive: it pushes the *current* script cursor and callback
function onto `gBattlescriptCurrInstrStackPtr`, replaces the running script
with the new one, and that new script terminates in `end3` (not `end2`) —
which pops the pushed cursor/callback and resumes the ORIGINAL caller
(`DoBattlerEndTurnEffects`'s own re-entry point), not a fresh top-level
script. **`END3` is unregistered in this engine** (`battleScriptMachine.ts:
565`, explicit comment: "END3 is omitted: it also manipulates the external
battle-callback stack and is not equivalent to either terminal command in
this pure machine"). This means none of the three scripted
`ENDTURN_ABILITIES` cases can be wired with the existing
`runTickScript`/`startBattleScriptExecute` helper as-is — see §5.

### 1c. `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, moveTurn)` (`battle_util.c:3331-3622`)

Gated once at the top: `if (gBattleMons[battler].hp)` (fainted battler:
zero item checks, same shape as abilities). Then a plain switch on
`battlerHoldEffect` (`GetItemHoldEffect(gBattleMons[battler].item)`, or the
Enigma Berry's own struct if that specific item is held — no Enigma Berry is
Factory-legal, so this branch is dead for our purposes but source-cited for
completeness). **Every case in this switch, joined against each case's own
`moveTurn` gate:**

| Hold effect | Real item(s) | `moveTurn` gate | Fires on ITEMS1? | Fires on ITEMS2? | `Random()` | Consumes item? |
| --- | --- | --- | --- | --- | --- | --- |
| `HOLD_EFFECT_RESTORE_HP` | Sitrus/Oran/Berry Juice | `!moveTurn` (`:3337`) | yes | no | 0 | **yes** (`BattleScript_ItemHealHP_RemoveItem`) |
| `HOLD_EFFECT_RESTORE_PP` | Leppa | `!moveTurn` (`:3348`) | yes | no | 0 | yes (`BattleScript_BerryPPHealEnd2`) |
| `HOLD_EFFECT_RESTORE_STATS` | White Herb | **none** (`:3384`) | yes | **yes** | 0 | yes, only when it actually fires (`BattleScript_WhiteHerbEnd2`) |
| `HOLD_EFFECT_LEFTOVERS` | Leftovers | `!moveTurn` (`:3401`) | yes | no | 0 | **no** — the only persistent-item case in this whole switch |
| `HOLD_EFFECT_CONFUSE_SPICY/DRY/SWEET/BITTER/SOUR` | Figy/Wiki/Mago/Aguav/Iapapa Berry | `!moveTurn` (macro `TRY_EAT_CONFUSE_BERRY`, `:3228`) | yes | no | 0 | yes |
| `HOLD_EFFECT_ATTACK_UP` | Liechi | `!moveTurn` (`:3431`) | yes | no | 0 | yes |
| `HOLD_EFFECT_DEFENSE_UP` | Ganlon | `!moveTurn` (macro `TRY_EAT_STAT_UP_BERRY`, `:3245`) | yes | no | 0 | yes |
| `HOLD_EFFECT_SPEED_UP` | Salac | same macro | yes | no | 0 | yes |
| `HOLD_EFFECT_SP_ATTACK_UP` | Petaya | same macro | yes | no | 0 | yes |
| `HOLD_EFFECT_SP_DEFENSE_UP` | Apicot | same macro | yes | no | 0 | yes |
| `HOLD_EFFECT_CRITICAL_UP` | Lansat | `!moveTurn` (`:3456`) | yes | no | 0 | yes |
| `HOLD_EFFECT_RANDOM_STAT_UP` | Starf | `!moveTurn` (`:3465`) | yes | no | **1** (`Random() % (NUM_STATS-1)`, retried until a non-maxed stat) | yes |
| `HOLD_EFFECT_CURE_PAR` | Cheri | **none** (`:3500`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_PSN` | Pecha | **none** (`:3508`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_BRN` | Rawst | **none** (`:3516`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_FRZ` | Aspear | **none** (`:3524`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_SLP` | Chesto | **none** (`:3532`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_CONFUSION` | Persim | **none** (`:3541`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_STATUS` | Lum | **none** (`:3549`) | yes | **yes** | 0 | yes |
| `HOLD_EFFECT_CURE_ATTRACT` | Mental Herb | **none** (`:3594`) | yes | **yes** | 0 | yes |

**The real ITEMS1-vs-ITEMS2 split, stated precisely:** everything gated on
`!moveTurn` (HP/PP restore, Leftovers, confuse berries, all 6 single-stat-up
berries, Random Stat Up) fires **only** on ITEMS1. Everything with **no**
`moveTurn` gate at all (White Herb's stat-stage reset, and all 8 status/
confusion/attract cure berries) is checked **twice**, once at ITEMS1 and
again at ITEMS2, in the SAME end-turn battler pass. Since `ItemBattleEffects`
returns as soon as ANY sub-case fires (`if (effect != 0) return effect;` in
the outer `DoBattlerEndTurnEffects` loop, same early-return shape as
abilities), only one case can fire per call — but which ITEMS slot "wins"
depends on what changed in between. **Why two calls exist at all, precisely:**
between ITEMS1 and ITEMS2 in the enum's real execution order sit
`LEECH_SEED, POISON, BAD_POISON, BURN, NIGHTMARES, CURSE, WRAP, UPROAR,
THRASH, DISABLE, ENCORE, LOCK_ON, CHARGE, TAUNT, YAWN` (`battle_util.c:1113
-1117`) — and exactly two of those can newly SET a status/confusion bit
within the same end-turn pass: `ENDTURN_YAWN` (`status1 |=
STATUS1_SLEEP_TURN(...)`) and `ENDTURN_THRASH` (`SetMoveEffect` →
`STATUS2_CONFUSION`, when a multi-turn lock ends without the mon already
being confused). **A Chesto-Berry holder that falls asleep via Yawn's own
end-turn tick, or a Persim-Berry holder whose Outrage/Petal-Dance/Thrash lock
ends into fresh confusion, gets cured again by ITEMS2 in the SAME tick pass,
before that status/confusion is ever "felt" on the following turn.** None of
the 13 OTHER cases between ITEMS1 and ITEMS2 (Leech Seed, Poison, Bad
Poison, Burn, Nightmares, Curse, Wrap, Uproar, Disable, Encore, Lock-On,
Charge, Taunt) ever sets a status1/confusion bit — confirmed by reading
every one of their bodies (`battle_util.c:1509-1771`) — so ITEMS2's cure
checks for those 8 hold effects are, for every OTHER case, provably
redundant no-ops within a single end-turn pass (the status they'd cure was
already there at ITEMS1 and already cured then). Likewise White Herb's own
ITEMS2 check is always a no-op in practice: nothing between ITEMS1 and
ITEMS2 ever LOWERS a stat stage (again confirmed by reading all 13
intervening bodies), so if White Herb had a negative stage to reset, ITEMS1
already reset it.

`TRY_EAT_CONFUSE_BERRY`/`TRY_EAT_STAT_UP_BERRY` macro definitions
(`:3227-3255`) both explicitly include `&& !moveTurn` in their own guard —
confirmed by direct read, not inferred from the case list alone.

## 2. Reachability against the real Factory L50 catalog (882 entries, enumerated not sampled)

### 2a. Abilities (`src/data/gen/battle-frontier-mons.json` unique species ×
`reference/pokeemerald/src/data/pokemon/species_info.h`)

| Ability | Frontier-reachable? | Carriers (species, ability slot) |
| --- | --- | --- |
| `ABILITY_RAIN_DISH` (44) | **yes** | LOTAD/LOMBRE/LUDICOLO — all 3 are `{SWIFT_SWIM, RAIN_DISH}`, so a rental needs ability slot 1 |
| `ABILITY_SHED_SKIN` (61) | **yes** | METAPOD/KAKUNA/DRATINI/DRAGONAIR/PUPITAR/SILCOON/CASCOON/SEVIPER (all single-ability, slot 0 always Shed Skin) + EKANS/ARBOK (`{INTIMIDATE, SHED_SKIN}`, need slot 1) |
| `ABILITY_SPEED_BOOST` (3) | **yes** | NINJASK (single-ability, slot 0) + YANMA (`{SPEED_BOOST, COMPOUND_EYES}`, need slot 0) |
| `ABILITY_TRUANT` (54) | **yes** | SLAKOTH/SLAKING (both single-ability, slot 0 always Truant) |

All four are reachable — this doc corrects nothing from the predecessor
docs here (they never claimed otherwise; B2 was left unexamined at this
granularity). Rental ability-slot assignment is itself PID-derived at
generation time (`battle_factory.c:398/464/503`, `MON_DATA_ABILITY_NUM`);
this doc's own live fixtures pick the slot directly via `overrides.parties`'
`abilitySlot` field (per `AGENTS.md`'s `mechanicLab` contract), which is a
legal, real assignment the stock ROM would also produce for some fraction of
real rentals of that species — not a fabricated combination.

**`WEATHER_HAS_EFFECT` gate, verified not assumed:** `((!ABILITY_ON_FIELD(
ABILITY_CLOUD_NINE) && !ABILITY_ON_FIELD(ABILITY_AIR_LOCK)))`
(`battle_util.h:47`). `ABILITY_CLOUD_NINE` has real Frontier carriers
(PSYDUCK, GOLDUCK — both `{DAMP, CLOUD_NINE}`, need slot 1); `ABILITY_AIR_LOCK`
is Rayquaza-only (not a Frontier rental). So Rain Dish's own weather-null
gate is real, Factory-legal barrier material (a Cloud-Nine holder nulls
Rain Dish for every battler, not just itself) — not exercised by this
doc's own fixture (no Psyduck/Golduck in it), flagged for whoever wires it.

### 2b. Items (`src/data/gen/battle-frontier-held-items.json` joined against all 882 mon entries by `itemTableId`)

Exact entry counts (not unique-species — see
`ingrain-leechseed-wrap-ground-truth.md` §1c's own entries-vs-species
distinction; this table uses **entries**, i.e. real weighted-draw rental
slots):

| Hold effect | Entries | Unique species | Zero-carrier? |
| --- | --- | --- | --- |
| `RESTORE_HP` (Sitrus/Oran/Berry Juice) | 45 | 45 | no |
| `LEFTOVERS` | 70 | 55 | no |
| `RESTORE_STATS` (White Herb) | 25 | 18 | no |
| `CURE_STATUS` (Lum) | 80 | 66 | no |
| `CURE_SLP` (Chesto) | 50 | 39 | no |
| `CURE_CONFUSION` (Persim) | 31 | 30 | no |
| `CURE_PAR` (Cheri) | 21 | 21 | no |
| `SPEED_UP` (Salac) | 22 | 21 | no |
| `SP_ATTACK_UP` (Petaya) | 16 | 15 | no |
| `ATTACK_UP` (Liechi) | 12 | 12 | no |
| `CURE_BRN` (Rawst) | 8 | 8 | no |
| `CURE_PSN` (Pecha) | 7 | 7 | no |
| `CURE_ATTRACT` (Mental Herb) | 4 | 4 | no |
| `RESTORE_PP` (Leppa) | 2 | 2 | no (LAPRAS, NIDOKING) |
| `CURE_FRZ` (Aspear) | 1 | 1 | no (SEEL) |
| `CONFUSE_SPICY/DRY/SWEET/BITTER/SOUR` (Figy/Wiki/Mago/Aguav/Iapapa) | **0 each** | — | **yes — all 5 confuse berries are absent from the Factory L50 catalog entirely** |
| `DEFENSE_UP` (Ganlon) | **0** | — | **yes** |
| `SP_DEFENSE_UP` (Apicot) | **0** | — | **yes** |
| `CRITICAL_UP` (Lansat) | **0** | — | **yes** |
| `RANDOM_STAT_UP` (Starf) | **0** | — | **yes** |

**Real registration target (reachable): `RESTORE_HP`, `LEFTOVERS`,
`RESTORE_STATS`, `CURE_STATUS`, `CURE_SLP`, `CURE_CONFUSION`, `CURE_PAR`,
`SPEED_UP`, `SP_ATTACK_UP`, `ATTACK_UP`, `CURE_BRN`, `CURE_PSN`,
`CURE_ATTRACT`, `RESTORE_PP`, `CURE_FRZ` — 15 of 19 hold effects in the
switch.** The 4 zero-carrier stat/crit berries plus all 5 confuse berries (9
of the switch's ~20 cases) are (b)-barrier material only: real source
behavior, verifiable, but unreachable at Factory L50 singles specifically —
do not spend registration budget there first.

## 3. Live ledgers (`overrides.parties`, Level 50, seed 1, one mechanism class per fixture)

Per the brief's own PAPERCUTS warning (raw RNG-window diffs pick up
unrelated draws): every claim below is checked at the EXACT single-frame
transition boundary, not across a whole turn, so any confound from the
opponent's own hit-chain RNG is structurally excluded from the comparison.

### 3a. `mechanic-endturn-speedboost-off.json` — always-fires stat-boost class

Player NINJASK (species 302, single-ability Speed Boost, slot 0,
`MOVE_SPLASH`×4 filler) vs opponent WYNAUT (`MOVE_SPLASH`×4, 0-RNG filler on
both sides — isolates the tick cleanly, same convention as the predecessor
docs).

| Frame | `player.statStages[SPEED]` | `rngValue` |
| --- | -: | -: |
| 0-722 | 6 (neutral) | 919694434 |
| **723** | **7** | 919694434 (unchanged from 722) |
| 1934 | 7 | 1250713408 |
| **1935** | **8** | 1250713408 (unchanged from 1934) |
| 3146 | 8 | 3031698222 |
| **3147** | **9** | 3031698222 (unchanged from 3146) |

Confirms `battle_util.c:2642-2652` exactly: fires on **every** end-turn tick
this battle (turn 1 included — `isFirstTurn != 2` did not block it here),
raises Speed by exactly 1 stage per tick, **zero `Random()` draws** across
all 3 recurrences (`rngValue` bit-identical across each tick's own frame
boundary). `battlers.player.ability` reads back 3 (`ABILITY_SPEED_BOOST`)
throughout, confirming the ability-slot assignment took.

### 3b. `mechanic-endturn-raindish-off.json` — HP/weather-gated heal class

Player LOTAD (species 295, `{SWIFT_SWIM, RAIN_DISH}`, slot 1, `MOVE_RAIN_
DANCE`×4 — recasts weather every turn, harmless) vs opponent MAGIKARP
(`MOVE_POUND`×4, a real prior hit — not injected — to keep LOTAD below max
HP each turn, same "real prior hit" convention as
`ingrain-leechseed-wrap-ground-truth.md` §3b).

| Frame | `player.hp`/`maxHp` | `weather` | `rngValue` |
| --- | --- | -: | -: |
| 0 | 115/115 | 0 | 3034451114 |
| 528→**529** | 115→**104** (Pound hit, -11) | 0 | 1941898439 (unchanged) |
| 568→**569** | 104 | 0→**1** (`B_WEATHER_RAIN_TEMPORARY`, Rain Dance lands) | 3031698222 (unchanged) |
| 952→**953** | 104→**111** (+7 = floor(115/16)) | 1 | 3031698222 (unchanged) |
| 1740 | 111→100 (2nd Pound hit, -11, broad-pass only) | 1 | 1391170865 |
| 2159→**2160** | 100→**107** (+7 again) | 1 | 3936998480 (unchanged) |

Confirms `battle_util.c:2607-2619` exactly: gated on rain being active AND
`maxHP > hp`, heals `floor(maxHP/16)` (min 1) **negated for the heal
convention**, **zero `Random()` draws** across both recurrences, flat +7
both times (no growing counter, matching Ingrain's own shape from
`ingrain-leechseed-wrap-ground-truth.md` §2a/§3b — Rain Dish is structurally
the ability-side sibling of Ingrain's heal tick).

### 3c. `mechanic-endturn-shedskin-off.json` — the ONE RNG-bearing case in this whole doc's scope

Player SEVIPER (species 379, single-ability Shed Skin, slot 0, `MOVE_
SPLASH`×4 filler) vs opponent BANETTE (`MOVE_WILL_O_WISP`×4 — a real
Factory-legal burn-inflicting carrier per `end-turn-ground-truth.md` B7).

| Frame | `player.status1` | `rngValue` |
| --- | --- | -: |
| 0-640 | 0 | 3421819359 (settling) |
| **656** | **16** (`STATUS1_BURN`, Will-O-Wisp lands turn 2) | 3421819359 |
| 5460-5581 | 16 (burned, unlucky across several intervening end-turn ticks) | **781670346, bit-identical across the whole 5460→5581 span** |
| **5582** | **0** (Shed Skin cures) | **2989818180 — exactly ONE new draw from 781670346** |

This is a clean, single-frame, unconfounded proof: `rngValue` is frozen for
121 straight frames (5460→5581, spanning that tick's own printstring/
waitmessage animation delay) and changes exactly once, in the SAME frame the
cure lands. Matches `battle_util.c:2620-2641` exactly: `(gBattleMons[battler
].status1 & STATUS1_ANY) && (Random() % 3) == 0` — one `Random()` call per
tick regardless of outcome, status1 cleared to 0 (ALL bits, not just the
active one — matches source's unconditional `= 0`, not a masked clear) only
when the roll succeeds. The miss branch (7 consecutive unlucky ticks
preceding this one, `(2/3)^7 ≈ 5.9%` — genuinely unlikely but not
contradictory, real RNG, not a bug) still draws a `Random()` call each time
per source; this doc did not isolate a single clean miss-tick frame boundary
the way it did the success tick (BANETTE keeps re-attempting Will-O-Wisp
every turn once Seviper's burn clears, which is itself a real, source-
confirmed interaction — not fixture noise — but it means intervening
frames mix a possible new burn-reapplication draw with a possible Shed-Skin-
miss draw; disentangling that further was not worth this session's time
given the success tick above already nails the exact mechanism
unambiguously). **Honesty note:** the miss-branch's own zero-vs-nonzero
RNG-draw claim is source-cited (`Random() % 3` always draws once whether it
hits or misses), not independently re-isolated live for the miss case.

## 4. RNG attribution per case (branch-aware)

| Case | `Random()` draws | Notes |
| --- | --- | --- |
| `ABILITY_RAIN_DISH` | 0 | live-verified, 2 ticks |
| `ABILITY_SHED_SKIN` | **1**, every tick where `status1 & STATUS1_ANY` (regardless of hit/miss) | live-verified for the success case; miss case source-cited only |
| `ABILITY_SPEED_BOOST` | 0 | live-verified, 3 ticks |
| `ABILITY_TRUANT` | 0 | source-cited only (no script, no `BtlController_EmitSetMonData` even — pure silent state flip) |
| `HOLD_EFFECT_RESTORE_HP`/`RESTORE_PP`/`RESTORE_STATS`/`LEFTOVERS` | 0 | source-cited |
| `HOLD_EFFECT_ATTACK_UP`/`SPEED_UP`/`SP_ATTACK_UP` (reachable stat berries) | 0 | source-cited |
| `HOLD_EFFECT_RANDOM_STAT_UP` (Starf, **unreachable** — 0 Frontier carriers) | 1 (`Random() % (NUM_STATS-1)`, retried on a maxed stat) | source-cited, moot for Factory L50 |
| `HOLD_EFFECT_CURE_PAR`/`PSN`/`BRN`/`FRZ`/`SLP`/`CONFUSION`/`STATUS`/`ATTRACT` | 0 | source-cited |

Net: **the entire `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2` surface draws at
most 1 `Random()` call per tick, and only for Shed Skin (reachable) and
Random Stat Up (unreachable at Factory L50)** — every other reachable case
in this doc is zero-RNG, consistent with the parent doc's table for every
other end-turn case.

## 5. Recommended registration/orchestration slices

Ordered cheapest/most-isolated first, addressing the enum-order/structural
traps explicitly per the brief's own ask.

1. **Speed Boost + Rain Dish, together (cheapest, highest-confidence
   slice).** Both are zero-RNG, both already have a live-verified exact
   ledger (§3a/§3b), and BOTH share the exact same blocking problem: their
   scripts (`BattleScript_SpeedBoostActivates`, `BattleScript_
   RainDishActivates`) are queued via `BattleScriptPushCursorAndCallback` +
   `end3`, not `BattleScriptExecute` + `end2`. **This is the load-bearing
   structural finding of this doc** (§1b): the existing `runTickScript`/
   `startBattleScriptExecute` helper in `battleEndTurnOrchestration.ts`
   cannot host these as-is — it resets `callStack` to `[]` and expects a
   clean `end`/`end2` exit, not a push-cursor-and-resume-caller pattern.
   Registering `END3` faithfully (pop the pushed cursor, resume the
   ORIGINAL script the ability preempted) is real, scoped C-side-callback-
   stack modeling, not a trivial opcode add like `ORWORD` was for the
   already-landed cases — budget for it accordingly. Once `END3` exists,
   both scripts are otherwise fully opcode-complete today (verified against
   §0's live 95-entry set: `PRINTSTRING`/`WAITMESSAGE`/`ORWORD`/
   `HEALTHBARUPDATE`/`DATAHPUPDATE`/`PLAYANIMATION`/`UPDATESTATUSICON`, all
   registered).
2. **Shed Skin.** Same `END3` dependency as slice 1 (`BattleScript_
   ShedSkinActivates` also ends in `end3`) plus one behavioral addition:
   the `(Random() % 3) == 0` roll itself (a trivial modulo-3 RNG draw, no
   new opcode — it's C-side logic in `AbilityBattleEffects`, same category
   as Yawn's `(Random() & 3) + 2` the parent doc already flagged as the
   "only Random() in end-turn" before this doc's own scope existed) and the
   unconditional `status1 = 0` full clear (not a masked clear — matches
   this engine's existing `withBattler`-style battler-field patch shape,
   no new modeling). Land after slice 1 proves out `END3` once, not
   independently.
3. **Truant.** Trivial once slices 1-2 exist (same `ABILITYEFFECT_ENDTURN`
   host) — a single XOR toggle on a currently-unmodeled `gDisableStructs[
   battler].truantCounter` field, **no script queued at all** (the switch
   case has no `BattleScriptExecute`/`BattleScriptPushCursorAndCallback`
   call and no `effect++`), so it needs zero `END3` work and doesn't even
   consume the outer loop's "return as soon as effect fires" short-circuit
   — it's the one `ENDTURN_ABILITIES` case that lets the SAME
   `DoBattlerEndTurnEffects` call fall through into `ENDTURN_ITEMS1` for
   the same battler in the same tick. Add the field, add the toggle, done;
   its own downstream consumer (move-execution "loafing around" skip) is a
   separate, already-out-of-scope subsystem.
4. **Leftovers + the 8 zero-RNG cure berries + White Herb, together (the
   `ITEMEFFECT_NORMAL` "no new opcode" slice).** All ten of these are
   `BattleScriptExecute`+`end2` shaped (§1c) — the SAME shape the already-
   landed Ingrain/Leech Seed/Wrap/status-damage ticks use, so `runTickScript`
   is directly reusable with zero new control-flow work, unlike slices 1-3.
   **One new opcode needed across this whole slice: `REMOVEITEM`** (not in
   §0's 95-entry set) — every one of these EXCEPT Leftovers calls it
   (`removeitem BS_ATTACKER`/`BS_SCRIPTING`) to consume the held item after
   firing; Leftovers alone persists. `Cmd_removeitem`
   (`battle_script_commands.c`, not re-cited here — a plain `gBattleMons[
   battler].item = ITEM_NONE` + controller emit, structurally close to the
   already-registered `Cmd_setbyte`'s scratch-field-write pattern) is a
   small, well-isolated add. Wire `ENDTURN_ITEMS1` (the `moveTurn=FALSE`
   call) first — it's the superset gate (§1c's table: every reachable hold
   effect fires on ITEMS1). Land `ENDTURN_ITEMS2` (the `moveTurn=TRUE` call,
   same function, same new opcode, zero additional opcode work) only after
   whichever of Yawn/Thrash's own end-turn cases the orchestration already
   models — its own real trigger condition (a status/confusion bit freshly
   set by one of THOSE two cases earlier in the SAME battler's tick pass,
   §1c) is unreachable before then, so registering ITEMS2 earlier would be
   correct but permanently unexercised.
5. **The 6 reachable stat-up berries (Liechi/Salac/Petaya + Defense-Up/
   Sp.Defense-Up/Random-Stat-Up analytically, since the latter three are
   0-carrier at Factory L50 — §2b).** Same `BattleScriptExecute`+`end2`+
   `REMOVEITEM` shape as slice 4, needing one additional primitive:
   `STATBUFFCHANGE` is already registered (§0), so this is a label-lookup-
   only addition once slice 4's `REMOVEITEM` lands — bundle it right after,
   not before (no new opcode of its own).

**What's explicitly NOT scoped here** (per the brief): no `src/` edits, no
actual opcode registration, `docs/presentation-seam-scout.md` and the seam
staging modules (main lane's own hour), factory-AI docs, and Battle-Scene-ON
presentation (this doc used Battle Scene OFF throughout, matching the side
lane's oracle). The 4 zero-carrier stat/crit berries and all 5 confuse
berries (§2b) are (b)-barrier material, not a registration target, for
Factory L50 specifically — they remain real, correct, and registerable
later if a non-Factory context ever needs them.

## 6. Registration status addendum (main lane, this session)

§5 slice 4's mandatory rung landed: `REMOVEITEM` registered
(`battleScriptRemoveitemOpcode.ts`), `ENDTURN_ITEMS1` wired into
`battleEndTurnOrchestration.ts`'s `runItemsTick` for all ten
`BattleScriptExecute`+`end2` cases (Leftovers, the 8 zero-RNG cure berries,
White Herb), every other real switch case barriered on its own genuine
trigger condition rather than falling through. Slice 5 (the 3 reachable
stat-up berries) was left as a documented stretch barrier this session —
see `PROGRESS.md` for the exact next action.

Two new live fixtures verify the wiring against the real `battle-scene-off`
oracle (`tools/battle-lab/mechanic-endturn-items1-leftovers-off.json`,
`tools/battle-lab/mechanic-endturn-items1-cure-par-off.json`), both
re-run clean:

- **Leftovers** (LOTAD, item 200, vs MAGIKARP's real Pound): frame 528→529
  Pound lands (115→104, -11); frame 849→850 Leftovers heals
  (104→111, +7 = floor(115/16)), item unchanged at 200 both sides (persists,
  never consumed) — `rngValue` bit-identical (3031698222) across the exact
  849/850 heal boundary, zero new `Random()` draws.
- **Cheri Berry cures paralysis** (same LOTAD, item 133, vs a real
  Thunder Wave): paralysis (`status1` 64) already landed by frame 491 and
  holds through 612; frame 612→613 `status1` clears to 0 (`ItemBattleEffects`'s
  own synchronous C-side clear, ahead of the queued script); item stays 133
  through 750, then frame 750→751 clears to 0 (`removeitem`, executed only
  once the script's animation/message delay finishes) — `rngValue` is
  bit-identical (2682491093) across the ENTIRE 491→751 window spanning both
  transitions, zero new `Random()` draws anywhere in the cure. The real
  multi-frame gap between the status clear (613) and the item removal (751)
  confirms source's own two-step timing (immediate RAM write vs.
  controller-synced script tail) — this engine's `runTickScript` correctly
  collapses both into one atomic tick, the same simplification already
  established for every other landed end-turn case.
