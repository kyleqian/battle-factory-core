# Screens/weather setter ground truth (prep for the "DoFieldEndTurnEffects setters" registration step)

Side-lane ground-truth scout for the eight Factory L50 singles setter moves
that populate `docs/end-turn-ground-truth.md` §3's F2/F3/F5/F7-F10 rows:
`REFLECT`, `LIGHT_SCREEN`, `SAFEGUARD`, `MIST`, `RAIN_DANCE`, `SUNNY_DAY`,
`SANDSTORM`, `HAIL`. That doc already pinned the field-loop's *execution
order* and carrier counts (31/26/16/7 for the weather four; Tyranitar's
permanent Sand Stream) — this doc doesn't redo that, it goes one level
deeper: the actual `Cmd_set*` C bodies, the exact opcode gap on each setter's
own script (checked against a **freshly re-grepped** live opcode set, since
§0's own instructions warn the cached list goes stale fast — see §0 below,
it already had), and a live-verified end-turn decrement/expiry/damage
lifecycle for three of the eight.

No `src/` production code is touched by this doc's worker — prep only, same
contract as `docs/end-turn-ground-truth.md`.

Rerunnable verify script: `tools/probe/verify-screens-weather-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-screens-weather-ground-truth.ts`).
Reruns three committed battle-lab scenarios
(`tools/battle-lab/mechanic-screens-lightscreen-off.json`,
`tools/battle-lab/mechanic-screens-sandstorm-off.json`,
`tools/battle-lab/mechanic-screens-safeguard-off.json`) against the live
`battle-scene-off` oracle. All **29 checks PASS**, confirmed run twice for
determinism.

## 0. Registered opcode set (grepped live — corrects end-turn-ground-truth.md §0's count)

```
ACCURACYCHECK, ADJUSTNORMALDAMAGE, ATTACKANIMATION, ATTACKCANCELER,
ATTACKSTRING, CALL, CANCELALLACTIONS, CHECKTEAMSLOST,
CHOSENSTATUSANIMATION, CLEAREFFECTSONFAINT, CRITCALC, CRITMESSAGE,
DAMAGECALC, DATAHPUPDATE, DECREMENTMULTIHIT, DOFAINTANIMATION,
DRAWPARTYSTATUSSUMMARY, EFFECTIVENESSSOUND, END, END2, FANFARE, GETEXP,
GETSWITCHEDMONDATA, GOTO, HEALTHBARUPDATE, HIDEPARTYSTATUSSUMMARY,
HITANIMATION, HPTHRESHOLDS, JUMPIFBYTE, JUMPIFHALFWORD, JUMPIFSTATUS2,
JUMPIFSTATUS3CONDITION, JUMPIFWORD, MAKEVISIBLE, MOVEEND, MOVEVALUESCLEANUP,
NOP, OPENPARTYSCREEN, ORBYTE, ORWORD, PAUSE, PLAYANIMATION, PLAYFAINTCRY,
PLAYSE, PPREDUCE, PRINTFROMTABLE, PRINTSELECTIONSTRING,
PRINTSELECTIONSTRINGFROMTABLE, PRINTSTRING, RESULTMESSAGE, RETURN, SETBYTE,
SETEFFECTWITHCHANCE, SETGRAPHICALSTATCHANGEVALUES, SETMULTIHIT,
SETMULTIHITCOUNTER, STATBUFFCHANGE, STATUS2ANIMATION, STATUSANIMATION,
SWITCHHANDLEORDER, SWITCHINANIM, SWITCHINDATAUPDATE, SWITCHINEFFECTS,
TRAINERSLIDEIN, TRAINERSLIDEOUT, TRYFAINTMON, TYPECALC, UPDATESTATUSICON,
VARIOUS, WAITANIMATION, WAITMESSAGE, WAITSTATE
```
(`grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts | sort -u`, **72 entries**
as of this writing — up from the 49 end-turn-ground-truth.md §0 recorded;
`PRINTFROMTABLE`, `ORWORD`, `PLAYANIMATION`, `CALL`, `JUMPIFWORD`,
`STATUS2ANIMATION` are all now present, which changes several "new opcodes
needed" answers below relative to a naive reuse of that older list — this is
exactly the staleness the brief warned about, confirmed live rather than
assumed.)

## 1. Source topology per move

All eight scripts share one shape: `attackcanceler, attackstring, ppreduce,
set<X>, [attackanimation, waitanimation,] print(from(table)|string),
waitmessage, goto <continuation>` (`data/battle_scripts_1.s`). Three groups by
continuation:

### 1a. Screens/Mist (own-side, `BattleScript_PrintReflectLightScreenSafeguardString`)

| Move | Script (line) | Setter opcode | Opcodes on the path |
| --- | --- | --- | --- |
| REFLECT | `BattleScript_EffectReflect` (`:974-984`) | `setreflect` | `attackcanceler, attackstring, ppreduce, setreflect, attackanimation, waitanimation, printfromtable, waitmessage, goto` |
| LIGHT_SCREEN | `BattleScript_EffectLightScreen` (`:724-729`) | `setlightscreen` | same continuation (`goto BattleScript_PrintReflectLightScreenSafeguardString`) |
| SAFEGUARD | `BattleScript_EffectSafeguard` (`:1672-1677`) | `setsafeguard` | same continuation |
| MIST | `BattleScript_EffectMist` (`:874-883`) | `setmist` | own tail: `attackcanceler, attackstring, ppreduce, setmist, attackanimation, waitanimation, printfromtable, waitmessage, goto` |

Every opcode on all four paths (`attackcanceler, attackstring, ppreduce,
attackanimation, waitanimation, printfromtable, waitmessage, goto`) is
**already registered** per §0. The only new opcode each needs is its own
setter: `SETREFLECT`, `SETLIGHTSCREEN`, `SETSAFEGUARD`, `SETMIST` — **none of
these four appear in §0's live set.** This directly contradicts
`docs/end-turn-ground-truth.md`'s F2/F3/F5 rows, which listed "New opcodes
needed beyond §0: none" for the *end-turn tick* script
(`BattleScript_SideStatusWoreOff`/`SafeguardEnds`, correct — those really do
need nothing new) but that doc never separately called out the **setter
opcode itself** as new, because it was scoped to the end-turn phase, not the
setting turn. Not a contradiction so much as a scope gap this doc closes:
**the setter opcode (`SETREFLECT` etc.) is unregistered and is a hard
prerequisite before the end-turn tick can ever have side-status data to
decrement.**

### 1b. Weather (`BattleScript_MoveWeatherChange` shared continuation)

| Move | Script (line) | Setter opcode |
| --- | --- | --- |
| RAIN_DANCE | `BattleScript_EffectRainDance` (`:1744-1748`) | `setrain` |
| SUNNY_DAY | `BattleScript_EffectSunnyDay` (`:1757-1761`) | `setsunny` |
| SANDSTORM | `BattleScript_EffectSandstorm` (`:1589-1593`) | `setsandstorm` |
| HAIL | `BattleScript_EffectHail` (`:2132-2136`) | `sethail` |

All four `goto BattleScript_MoveWeatherChange` (`:1749-1755`): `attackcanceler,
attackstring, ppreduce, set<weather>, attackanimation, waitanimation,
printfromtable, waitmessage, call BattleScript_WeatherFormChanges, goto
MoveEnd`. Every opcode here is registered per §0 (`CALL` is now registered,
closing a gap an older opcode snapshot would have shown). The only new opcode
per move is its own setter — **`SETRAIN`, `SETSUNNY`, `SETSANDSTORM`,
`SETHAIL`, none registered.**

### 1c. The genuinely new finding: `BattleScript_DamagingWeatherContinues`'s inner loop needs six more opcodes end-turn-ground-truth.md's F8/F10 rows missed

`docs/end-turn-ground-truth.md` F8/F10 rows claim "New opcodes needed beyond
§0: none new (printfromtable already covered by F7's needs)" for Sandstorm
and Hail's end-turn continuation. Tracing the actual script
(`data/battle_scripts_1.s:3200-3224`) shows this is **wrong** — it only
accounted for the "sandstorm continues" message line, not the per-battler
damage loop beneath it:

```
BattleScript_DamagingWeatherContinues::
    printfromtable gSandStormHailContinuesStringIds
    waitmessage B_WAIT_TIME_LONG
    playanimation_var BS_ATTACKER, sB_ANIM_ARG1        ; NEW: distinct from PLAYANIMATION
    setbyte gBattleCommunication, 0
BattleScript_DamagingWeatherLoop::
    copyarraywithindex gBattlerAttacker, gBattlerByTurnOrder, gBattleCommunication, 1  ; NEW
    weatherdamage                                       ; NEW
    jumpifword CMP_EQUAL, gBattleMoveDamage, 0, BattleScript_DamagingWeatherLoopIncrement  ; registered
    printfromtable gSandStormHailDmgStringIds
    waitmessage B_WAIT_TIME_LONG
    orword gHitMarker, ...                              ; registered
    effectivenesssound / hitanimation / healthbarupdate / datahpupdate / tryfaintmon / checkteamslost  ; all registered
BattleScript_DamagingWeatherLoopIncrement::
    jumpifbyte CMP_NOT_EQUAL, gBattleOutcome, 0, BattleScript_DamagingWeatherContinuesEnd  ; registered
    addbyte gBattleCommunication, 1                     ; NEW
    jumpifbytenotequal gBattleCommunication, gBattlersCount, BattleScript_DamagingWeatherLoop  ; expands to jumpifarraynotequal -- NEW opcode, not JUMPIFBYTE
BattleScript_DamagingWeatherContinuesEnd::
    bicword gHitMarker, ...                             ; NEW
    end2
```
(macro expansions confirmed in `asm/macros/battle_script.inc:233-406,1406-1408`
— `jumpifbytenotequal` is `B_SCR_OP_JUMPIFARRAYNOTEQUAL`, a genuinely
different opcode from the already-registered `B_SCR_OP_JUMPIFBYTE`, not a
macro alias for it.)

**Six new opcodes, not zero**, are needed for Sandstorm/Hail's per-battler
damage loop, beyond each move's own setter: `PLAYANIMATION_VAR`,
`COPYARRAYWITHINDEX`, `WEATHERDAMAGE`, `ADDBYTE`, `JUMPIFARRAYNOTEQUAL`,
`BICWORD`. This is a real, source-cited correction to
`docs/end-turn-ground-truth.md`'s F8/F10 rows, which only checked the
"continues/ends" message shell, not the loop that actually deals the per-turn
chip damage — the part this doc's brief specifically asked to live-verify
(deliverable 2b). Rain/Sun (F7/F9) have no such gap — `BattleScript_
RainContinuesOrEnds`/`SunlightContinues`/`SunlightFaded` never call
`weatherdamage` at all (neither move deals passive damage), so those two
rows' "none new" verdict stands unchanged.

## 2. C-side setter semantics (`src/battle_script_commands.c`)

All eight `Cmd_set*` functions are pure, branchless-of-RNG C (confirmed: zero
`Random(` call sites in any of the eight function bodies, grepped directly —
the nearby `Cmd_magnitudedamagecalculation`'s `Random() % 100` is a
neighboring, unrelated function, not part of any setter).

| Move | Function:line | Fail condition | On success |
| --- | --- | --- | --- |
| REFLECT | `Cmd_setreflect:6697` | `gSideStatuses[side] & SIDE_STATUS_REFLECT` (already up) | `gSideStatuses[side] \|= SIDE_STATUS_REFLECT`; `gSideTimers[side].reflectTimer = 5`; `.reflectBattlerId = gBattlerAttacker` |
| LIGHT_SCREEN | `Cmd_setlightscreen:7468` | `SIDE_STATUS_LIGHTSCREEN` already set | same shape, `.lightscreenTimer = 5` |
| SAFEGUARD | `Cmd_setsafeguard:8652` | `SIDE_STATUS_SAFEGUARD` already set | same shape, `.safeguardTimer = 5` |
| MIST | `Cmd_setmist:7732` | `gSideTimers[side].mistTimer != 0` (checks the **timer**, not the status bit — the one setter with a different fail-check shape) | `.mistTimer = 5`; `gSideStatuses[side] \|= SIDE_STATUS_MIST` |
| RAIN_DANCE | `Cmd_setrain:6681` | `gBattleWeather & B_WEATHER_RAIN` | `gBattleWeather = B_WEATHER_RAIN_TEMPORARY` (**assignment, not OR** — clobbers any other weather's bits); `gWishFutureKnock.weatherDuration = 5` |
| SUNNY_DAY | `Cmd_setsunny:8767` | `gBattleWeather & B_WEATHER_SUN` | `gBattleWeather = B_WEATHER_SUN_TEMPORARY`; duration 5 |
| SANDSTORM | `Cmd_setsandstorm:7586` | `gBattleWeather & B_WEATHER_SANDSTORM` | `gBattleWeather = B_WEATHER_SANDSTORM_TEMPORARY`; duration 5 |
| HAIL | `Cmd_sethail:9055` | `gBattleWeather & B_WEATHER_HAIL` | `gBattleWeather = B_WEATHER_HAIL_TEMPORARY`; duration 5 |

**Load-bearing finding on weather:** `gBattleWeather` is a **single shared
field** (`u16`), and every weather setter does a flat `=` assignment, not
`|=`. So only one weather type can ever be active — using Sunny Day while
Rain is active doesn't fail (the check is `& B_WEATHER_SUN` only, which is
false while raining) and immediately clobbers rain's bits and resets the one
shared `weatherDuration` counter to 5. This is a real interaction any
registration must get right structurally (a naive "OR the new bit in" port
would be wrong).

**Struct field offsets** (`include/battle.h:149-174`, cross-checked directly
against `oracle/battle_lab.py`'s own field reads — they already match byte
for byte, confirming the oracle's RAM probe is correct, not something this
doc had to newly derive):
`struct SideTimer { reflectTimer(0), reflectBattlerId(1), lightscreenTimer(2),
lightscreenBattlerId(3), mistTimer(4), mistBattlerId(5), safeguardTimer(6),
safeguardBattlerId(7), followmeTimer(8), followmeTarget(9), spikesAmount(10) }`
— matches `battle_lab.py:668-676`'s `timers`, `timers+2`, `timers+4`,
`timers+6`, `timers+10` reads exactly. `gWishFutureKnock.weatherDuration` is
at byte offset `0x28` (4+4+16+8+4+4 for the four preceding `u8[4]`/`s32[4]`/
`u16[4]`/`u8[4]`/`u8[4]` arrays) — matches `battle_lab.py:561-563`'s
`gWishFutureKnock + 0x28` read exactly.

**`SIDE_STATUS_*`/`B_WEATHER_*` bit values** (`include/constants/battle.h`):
`SIDE_STATUS_REFLECT = 1<<0`, `LIGHTSCREEN = 1<<1`, `SAFEGUARD = 1<<5`,
`MIST = 1<<8`; `B_WEATHER_RAIN_TEMPORARY = 1<<0`,
`SANDSTORM_TEMPORARY = 1<<3`, `SUN_TEMPORARY = 1<<5`, `HAIL_TEMPORARY = 1<<7`
(each also has an unused-at-Factory-L50 `_PERMANENT` sibling bit — Drizzle/
Drought/permanent-sand are handled separately via
`AbilityBattleEffects`/switch-in hooks, not these setter opcodes; Tyranitar's
Sand Stream is confirmed by `docs/end-turn-ground-truth.md` §3 to use the
`_PERMANENT` bit via its own switch-in path, out of this doc's setter-move
scope).

### Item/ability interactions reachable at Factory L50

- **Light Clay does not exist in Gen 3** — confirmed by grep: no
  `HOLD_EFFECT_*` constant in `include/constants/items.h` references
  screens, weather, or any duration extension at all. There is no Gen-3 item
  that extends Reflect/Light Screen/Safeguard/weather duration; the flat
  5-turn value is unconditional at this game version.
- **`WEATHER_HAS_EFFECT`** (`include/battle_util.h:47`) gates every weather
  *effect* (not the setter itself, which always succeeds structurally if no
  same-type weather is already up) on `!ABILITY_ON_FIELD(ABILITY_CLOUD_NINE)
  && !ABILITY_ON_FIELD(ABILITY_AIR_LOCK)`. Air Lock is Rayquaza-only
  (legendary, absent from the Frontier catalog — confirmed absent the same
  way `docs/end-turn-ground-truth.md` §3 confirmed Drizzle/Drought absent).
  **Cloud Nine is reachable**, however: `SPECIES_PSYDUCK`/`SPECIES_GOLDUCK`
  carry it as ability slot 2 (`species_info.h:1653,1683`,
  `.abilities = {ABILITY_DAMP, ABILITY_CLOUD_NINE}`), and both species have
  real Frontier rental entries (5 total: 1 Psyduck + 2 Golduck variants, per
  `src/data/gen/battle-frontier-mons.json`). This doc does **not** resolve
  whether the Factory's per-rental ability-slot assignment (personality-based
  slot pick, `src/battle_factory.c`, out of this doc's scope) ever actually
  lands on slot 2 for those entries — that's a separate ability-breadth
  question — but the setter itself is unaffected either way (Cmd_set* never
  checks `WEATHER_HAS_EFFECT`; only the *damage* tick and a few other
  weather-conditioned effects do). Flagging this as a real, not hypothetical,
  barrier for whoever eventually registers weather damage suppression.
- No item affects Reflect/Light Screen/Safeguard/Mist at all in Gen 3 (no
  Gen-3 hold effect references them).

## 3. End-turn lifecycle (decrement/expiry, cross-referencing `docs/end-turn-ground-truth.md`)

The field loop itself (`DoFieldEndTurnEffects`, `battle_util.c:1180-1395`,
enum order `ORDER, REFLECT, LIGHT_SCREEN, MIST, SAFEGUARD, WISH, RAIN,
SANDSTORM, SUN, HAIL`) is **already fully mapped** by
`docs/end-turn-ground-truth.md` §1a/§2 (F2-F5, F7-F10) — this section only
adds the setter-to-tick handoff and the live-verified per-tick behavior the
brief asked for; it does not re-derive the field-loop order itself.

### 3a. Screens/Safeguard (F2/F3/F5) — `ENDTURN_REFLECT`/`LIGHT_SCREEN`/`SAFEGUARD` cases

```c
case ENDTURN_REFLECT:                                  // battle_util.c:1221-1234
    side = gBattleStruct->turnSideTracker;
    gActiveBattler = gBattlerAttacker = gSideTimers[side].reflectBattlerId;
    if (gSideStatuses[side] & SIDE_STATUS_REFLECT)
        if (--gSideTimers[side].reflectTimer == 0) {
            gSideStatuses[side] &= ~SIDE_STATUS_REFLECT;
            BattleScriptExecute(BattleScript_SideStatusWoreOff);
            effect++;
        }
    // LIGHT_SCREEN (:1246-1271) and SAFEGUARD (:1295-1318) are structurally
    // identical, gated on their own bit/timer/battlerId triplet.
```
Mist's case (`:1272-1294`) differs subtly (matches its setter's own
different fail-check): it guards on `gSideTimers[side].mistTimer != 0` (the
raw timer), not the `SIDE_STATUS_MIST` bit, before decrementing — functionally
equivalent at Factory L50 since the two are always set/cleared together by
`Cmd_setmist`, but a direct port should follow the real guard, not assume
they're interchangeable in general.

**Zero `Random()` calls anywhere in these three cases** (confirmed by
reading the source — no `Random(` call site in any of the four case bodies)
— matches `docs/end-turn-ground-truth.md`'s F2/F3/F5 "0" RNG column exactly.
**Live correction to a naive live-RNG check, though:** at 1-turn-apart
recurrence (Light Screen/Safeguard both decrement every single turn once
active), the frame immediately after each decrement **does** show a changed
`rngValue` in Battle Scene OFF captures — this is **not** RNG inside the
decrement itself, it's the opponent's own per-turn move-slot tie-break roll
(4 identical Splash slots) landing in the same coarse capture window, the
same phenomenon `docs/hit-chain-ground-truth.md`'s "+14 AI scoring" and
`docs/end-turn-ground-truth.md` §2a's inter-tick rngValue drift already
document. Only the *very first* tick (same turn as the setter, no prior
opponent turn to contribute noise) and the *expiry* tick (empirically, no AI
roll happens to land adjacent to it here) show bit-identical rngValue
before/after live — the general RNG-free claim for the field decrement is
sourced from reading `battle_util.c`, not from a live rngValue diff at every
single tick (an earlier draft of this doc's verify script asserted the
stronger live claim for every tick and it correctly **failed** — recorded
here as the falsification the brief asked for, not silently patched away).

### 3b. Weather (F7-F10) — decrement + damage, live-verified for Sandstorm

```c
case ENDTURN_SANDSTORM:                                // battle_util.c:1374-1393
    if (gBattleWeather & B_WEATHER_SANDSTORM) {
        if (!(gBattleWeather & B_WEATHER_SANDSTORM_PERMANENT) && --gWishFutureKnock.weatherDuration == 0) {
            gBattleWeather &= ~B_WEATHER_SANDSTORM_TEMPORARY;
            gBattlescriptCurrInstr = BattleScript_SandStormHailEnds;   // no damage loop on the LAST tick
        } else {
            gBattlescriptCurrInstr = BattleScript_DamagingWeatherContinues;  // §1c's loop, WITH damage
        }
        BattleScriptExecute(gBattlescriptCurrInstr);
        effect++;
    }
    gBattleStruct->turnCountersTracker++;
```
`Cmd_weatherdamage` (`battle_script_commands.c:7602-7649`, zero `Random(`
call sites): under `WEATHER_HAS_EFFECT`, for Sandstorm,
`gBattleMoveDamage = maxHP/16` (floored, **min 1**) unless the battler is
ROCK/STEEL/GROUND-typed, has `ABILITY_SAND_VEIL`, or is
Dug-in/Dived-under (`STATUS3_UNDERGROUND`/`UNDERWATER`); for Hail, the same
`maxHP/16` formula gated only on non-ICE-type + not underground/underwater
(no ability exemption for Hail — Ice Body/Snow Cloak don't exist in Gen 3).
**Live-verified** (`mechanic-screens-sandstorm-off.json`): ONIX
(ROCK/GROUND) took **zero** self-damage from its own Sandstorm across all 5
ticks; SUNKERN (GRASS/GRASS, non-immune) took **exactly 6** (`floor(105/16)`)
per tick, four ticks running (105→99→93→87→81), and the 5th ("ends") tick
dealt **zero** damage — `BattleScript_SandStormHailEnds` never calls
`weatherdamage` at all, matching the source branch above exactly.

**Deferred-write pattern confirmed, same shape as
`docs/end-turn-ground-truth.md` §2b's Toxic counter:** the `weatherDuration`
decrement and the HP write are **two separate frames of the same
`BattleScriptExecute` call**, not simultaneous — e.g. tick 1's duration drops
5→4 at frame 362, but the HP damage doesn't land until frame 610 (248 frames
later, spent on `printfromtable`/`waitmessage`/`hitanimation` before
`datahpupdate` actually commits). This is a live-only finding, not visible
from source order alone (the C decrement happens synchronously before the
script executes, but the script's own animation/message opcodes consume real
frames before the HP commit).

**Rain/Sun (F7/F9) need no live re-verification here** — they have no damage
step, and `docs/end-turn-ground-truth.md` already covers their
continue/end/message shape; this doc's live budget went to the one case
(Sandstorm) that has the additional per-battler damage loop §1c corrects.

### 3c. Timer semantics: "5 turns" means the setting turn's own end-tick counts as turn 1 of 5

Live-confirmed on all three fixtures: the setter writes `timer = 5` during
the *action* phase; the field loop's *own end-tick that same turn*
immediately decrements it once (5→4) before the player ever acts again. So a
screen/weather effect set on turn N is gone by the start of turn N+5, having
covered turns N through N+4 inclusive (5 total, matching in-game player-
facing "lasts 5 turns" text) — not 5 turns *after* the setting turn (which
would be 6 total). Confirmed identically for Light Screen, Safeguard, and
Sandstorm's `weatherDuration`.

### 3d. Live ledger: Light Screen full lifecycle (`mechanic-screens-lightscreen-off.json`)

ONIX (`MOVE_LIGHT_SCREEN` ×4) vs. SUNKERN (`MOVE_SPLASH` ×4, zero-RNG-pollution
filler, same convention as `docs/end-turn-ground-truth.md` §2a). `overrides.parties`,
Level 50, seed 1.

| Event | Frame | `sideStatuses[0]` | `lightScreenTurns` |
| --- | -: | -: | -: |
| Before set | 67 | 0 | 0 |
| **`Cmd_setlightscreen` fires** | **68** | **2** (`SIDE_STATUS_LIGHTSCREEN`) | **5** |
| Tick 1 (same turn) | 371 | 2 | 4 |
| Tick 2 | 731 | 2 | 3 |
| Tick 3 | 1091 | 2 | 2 |
| Tick 4 | 1451 | 2 | 1 |
| **Expiry (`BattleScript_SideStatusWoreOff`)** | **1811** | **0** | **0** |
| Re-set (same move slot, succeeds again) | 1968 | 2 | 5 |

### 3e. Live ledger: Sandstorm full lifecycle with damage (`mechanic-screens-sandstorm-off.json`)

ONIX (`MOVE_SANDSTORM` ×4, immune to its own weather) vs. SUNKERN
(`MOVE_SPLASH` ×4, takes the chip damage every tick).

| Event | Frame | `weather` | `weatherTurns` | opponent HP |
| --- | -: | -: | -: | -: |
| Before set | 64 | 0 | 0 | 105 |
| **Set** | **65** | **8** (`SANDSTORM_TEMPORARY`) | **5** | 105 |
| Tick 1 decrement | 362 | 8 | 4 | 105 |
| Tick 1 damage | 610 | 8 | 4 | **99** (−6) |
| Tick 2 decrement | 977 | 8 | 3 | 99 |
| Tick 2 damage | 1225 | 8 | 3 | **93** (−6) |
| Tick 3 decrement | 1597 | 8 | 2 | 93 |
| Tick 3 damage | 1845 | 8 | 2 | **87** (−6) |
| Tick 4 decrement | 2217 | 8 | 1 | 87 |
| Tick 4 damage | 2465 | 8 | 1 | **81** (−6) |
| **Ends, no damage** | **2837** | **0** | **0** | 81 (unchanged) |
| Re-set | 3005 | 8 | 5 | 81 |

### 3f. Live ledger: Safeguard full lifecycle (`mechanic-screens-safeguard-off.json`)

Identical structural shape to Light Screen (`sideStatuses[0] = 32 =
SIDE_STATUS_SAFEGUARD` while active), but **not** the identical frame cadence
— worth stating explicitly since an earlier draft of this fixture wrongly
assumed it was and every post-set assertion failed (see §5's correction
note):

| Event | Frame | `safeguardTurns` |
| --- | -: | -: |
| Set | 65 | 5 |
| Tick 1 | 367 | 4 |
| Tick 2 | 714 | 3 |
| Tick 3 | 1074 | 2 |
| Tick 4 | 1428 | 1 |
| Expiry | 1788 | 0 |
| Re-set | 2005 | 5 |

## 4. RNG attribution

**Zero `Random()` calls anywhere in the setter-turn's own script or the
end-turn tick's decrement/damage C code**, for all eight moves, confirmed
two ways: (1) reading every `Cmd_set*`/`Cmd_weatherdamage`/
`DoFieldEndTurnEffects` case body directly (no `Random(` call site in any of
them), and (2) live: the setter's own transition (67→68, 64→65) is
bit-identical `rngValue` before/after in all three fixtures, and the
"cleanest" ticks (first tick same-turn, and the expiry ticks) are also
bit-identical live. Per §3a, the *interior* per-turn ticks show a live
`rngValue` delta that is **not** attributable to the tick itself — it's the
opponent's own per-turn Splash-slot AI tie-break roll landing in the same
coarse Battle-Scene-OFF frame, identical in kind to the noise
`docs/hit-chain-ground-truth.md` and `docs/end-turn-ground-truth.md` §2a
already flag and exclude from their own RNG ledgers. **A registration step
implementing these eight setters and their four field-loop cases adds zero
new `Random()` call sites to the engine.**

## 5. Corrections to existing docs (flagged per the brief)

1. **`docs/end-turn-ground-truth.md` F8/F10 rows ("New opcodes needed beyond
   §0: none new")** undercounted: `BattleScript_DamagingWeatherContinues`'s
   per-battler damage loop needs six new opcodes
   (`PLAYANIMATION_VAR, COPYARRAYWITHINDEX, WEATHERDAMAGE, ADDBYTE,
   JUMPIFARRAYNOTEQUAL, BICWORD`) — see §1c above, source-cited. F7/F9
   (Rain/Sun) are unaffected; their "none new" verdict stands.
2. **`docs/end-turn-ground-truth.md` §0's 49-opcode snapshot is stale** — the
   live set is now 72 (§0 above), including several opcodes
   (`ORWORD`, `PLAYANIMATION`, `CALL`, `PRINTFROMTABLE`, `JUMPIFWORD`) whose
   prior "needed" status in that doc's own §4 recommendations has since
   landed. Anyone consuming that doc's opcode gap analysis for a still-open
   slice should re-grep, not trust the cached list — exactly the discipline
   this doc's own brief insisted on.
3. **Own-doc correction, recorded rather than silently fixed:** an early
   draft of `verify-screens-weather-ground-truth.ts` asserted bit-identical
   `rngValue` across *every* Light-Screen/Safeguard/Sandstorm end-turn tick
   pair. It correctly failed on the interior ticks (§3a/§4) — the assertion
   itself was wrong, not the engine. The corrected script only makes the
   live zero-RNG claim where it empirically holds (the setter's own turn and
   the expiry tick) and otherwise cites the C source directly.
4. **`mechanic-screens-safeguard-off.json`'s frame cadence was originally
   guessed as identical to the Light Screen fixture's** (68/371/731/1091/
   1451/1811/1968) since both setters share the same C struct shape. Live
   capture showed this was wrong (real cadence: 65/367/714/1074/1428/1788/
   2005) — Safeguard's shorter message strings cost a handful fewer frames
   per `waitmessage` in Battle Scene OFF, drifting the two fixtures' turn
   boundaries apart after the first tick. Fixed by re-scanning contiguously
   rather than assuming; see §3f.
5. **A methodological trap worth flagging for future frame-pinning work:**
   locating an exact transition frame by sampling small (~±25 frame)
   windows *independently* around several coarse sample points, in
   *separate* requests, can silently invent a false transition frame — the
   first point of an isolated window gets compared against a stale
   "previous value" carried over from a different, non-adjacent window,
   which looks like a transition at the window's edge even when the real
   transition happened earlier, unobserved, in the gap between requests.
   This bit the Sandstorm fixture's weatherDuration-decrement frames in an
   early draft (see the verify script's inline comment) — the fix was a
   single contiguous scan (one request, dense step, no gaps) before
   narrowing.

## 6. Recommended registration slices

Ordered cheapest/most-isolated first, extending
`docs/end-turn-ground-truth.md` §4's step 4 (which named this whole area as
one bullet — this breaks it out):

1. **Four screen/Mist setter opcodes (`SETREFLECT`, `SETLIGHTSCREEN`,
   `SETSAFEGUARD`, `SETMIST`) — C-side opcodes, trivial.** Each is a
   `BattleScriptRulesContext`-scoped read of `gSideStatuses[side]`/
   `gSideTimers[side]` plus a conditional bit-set + two-field timer write —
   structurally identical to the already-registered `SETBYTE`/`ORWORD`
   scratch-field pattern, no new selector work (side is derived from
   `GET_BATTLER_SIDE(gBattlerAttacker)`, an existing primitive). Land these
   four together; they share one shape.
2. **`DoFieldEndTurnEffects`'s side-scoped orchestration loop for
   REFLECT/LIGHT_SCREEN/MIST/SAFEGUARD (C-side, new) — hosts step 1's
   opcodes' effects at end-turn.** This is orchestration, not an opcode: a
   resumable per-side (not per-battler) walk mirroring `turnSideTracker`,
   same category as `docs/end-turn-ground-truth.md` §4 step 2's
   already-recommended `DoBattlerEndTurnEffects` loop but simpler (2 sides,
   not N battlers; the field loop's `ENDTURN_ORDER` case is shared
   plumbing already covered by that doc). Needs no new opcodes to host
   `BattleScript_SideStatusWoreOff`/`SafeguardEnds` per §0/§3a. **This
   orchestration should land before or alongside step 1** — the setter
   opcode alone is inert without the loop that later reads its output.
3. **Four weather setter opcodes (`SETRAIN`, `SETSUNNY`, `SETSANDSTORM`,
   `SETHAIL`) — C-side opcodes, trivial, same shape as step 1** but writing
   `gBattleWeather`/`gWishFutureKnock.weatherDuration` (flat assignment, not
   OR — see §2's load-bearing finding) instead of `gSideStatuses`/
   `gSideTimers`. Land together; they share one shape and one field.
4. **The weather sub-case of the field loop (`ENDTURN_RAIN`/`SUN`, C-side,
   new) — Rain/Sun only, no damage.** Cheapest weather-consuming slice:
   needs zero new opcodes (`BattleScript_RainContinuesOrEnds`/
   `SunlightContinues`/`SunlightFaded`, all §0-covered) beyond step 3's
   setters. Land this before Sandstorm/Hail specifically because it proves
   the weather-decrement half of the loop without also requiring §1c's six
   new damage-loop opcodes.
5. **Six new opcodes for the Sandstorm/Hail damage loop**
   (`PLAYANIMATION_VAR`, `COPYARRAYWITHINDEX`, `WEATHERDAMAGE`, `ADDBYTE`,
   `JUMPIFARRAYNOTEQUAL`, `BICWORD`) **→ `ENDTURN_SANDSTORM`/`HAIL` cases.**
   `WEATHERDAMAGE` is the one opcode here needing real type/ability-immunity
   modeling (ROCK/STEEL/GROUND + Sand Veil for Sandstorm; ICE only for
   Hail; both need `STATUS3_UNDERGROUND`/`UNDERWATER` checks this engine may
   not yet track battler-side — worth a dependency check before starting).
   This is the single most load-bearing slice in this doc (§1c's live
   correction) and should be scoped as its own step, not folded silently
   into step 4's estimate.
6. **Out of scope for this doc, named per the brief:** the actual
   engine registration/wiring (no `src/` edits happened here);
   `ENDTURN_ABILITIES`/`ITEMS1`/`ITEMS2` (Leftovers etc. —
   `docs/end-turn-ground-truth.md` §4 step 8 already owns this); Ingrain/
   Leech Seed/Wrap (that doc's step 5); doubles-only interactions (e.g.
   Light Screen/Reflect's double-battle message variant,
   `B_MSG_SET_REFLECT_DOUBLE`, genuinely unreachable at Factory L50 singles);
   Open-level legality. The Factory rental ability-slot question flagged in
   §2 (whether any real Psyduck/Golduck rental ever lands on Cloud Nine) is
   also explicitly not resolved here — it's an ability-breadth question, not
   a setter/end-turn-lifecycle one.
