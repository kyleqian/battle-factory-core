# Frontier-tail ground-truth and falsification notes

This is a source-and-engine audit only. No oracle trace was run and no
production or census code was changed. It follows the same distinction as the
current census: “registered” means an opcode has a live interpreter dispatch
entry, not that every C-selected continuation, lifetime consumer, typed text
buffer, or cross-effect dependency is implemented
(`docs/executable-frontier-census.md:18-22,276-292`).

## 1. Scope and headline corrections

The audited baseline is **191/214 effects, 331/355 moves, 271/276
Factory-L50 distinct moves, and 2951/2957 Factory-L50 weighted moves**
(`docs/executable-frontier-census.md:9-16`). The committed per-effect table has
23 blocked rows. Present, Memento, Role Play, and Recycle are being implemented
concurrently and are excluded here. The complete remainder is therefore the
19 effects below. Haze, Rage, and Rampage/Thrash are **not** remainder: all
three are already executable (`docs/executable-frontier-census.md:75-77,131`).

| Effect | Census missing surface | Mechanical census delta (effects / moves / L50 distinct / weighted) | Is opcode-only implementation source-complete? | Falsification result |
| --- | --- | ---: | --- | --- |
| Mirror Move | `TRYMIRRORMOVE` | +1 / +1 / +0 / +0 | yes under the census dynamic-dispatch policy | Both packed source histories already have owners; use them rather than adding a “last move” alias. |
| Bide | `SETBIDE` | +1 / +1 / +0 / +0 | **yes** | The prompt-era cross-effect concern has already landed: accumulation, saved target, release scratch, and the action-canceler consumer all exist. |
| Conversion | `TRYCONVERSIONTYPECHANGE` | +1 / +1 / +0 / +0 | rules yes; exact text no | Active moves/types exist; the prepared type substitution does not. |
| Transform | `TRANSFORMDATAEXECUTION` plus `PRINTFROMTABLE(gTransformUsedStringIds)` | +1 / +1 / +0 / +0 | **no** | Full pre-PP `BattlePokemon` copy, transformed personality, reset-selection controller event, species buffer, and table operand must be one step. |
| Mimic | `MIMICATTACKCOPY` | +1 / +1 / +0 / +0 | yes | `lastMoves`, active moves/PP, `mimickedMoves`, and move buffer exist. |
| Metronome | `METRONOME` plus dynamic-universe gate | +1 / +1 / +1 / +2 | **no until last** | Exactly 19 currently blocked effects remain legally selectable; after the four concurrent rows land, 15 remain. |
| Conversion 2 | `SETTYPETORANDOMRESISTANCE` | +1 / +1 / +0 / +0 | rules yes; exact text no | `lastLandedMoves`, `lastHitByType`, `lastHitBy`, status2, and active types already exist; preserve the source fallback-index bug. |
| Lock On / Mind Reader | `SETALWAYSHITFLAG` | +1 / +2 / +0 / +0 | **no** | `status3` exists, but `battlerWithSureHit` does not; both accuracy consumers barrier and end-turn expiry is skipped. |
| Sketch | `COPYMOVEPERMANENTLY` | +1 / +1 / +0 / +0 | almost | Last-printed history, active/party moves and PP exist, but party-move mutation and PP-bonus controller payload need completing. |
| Beat Up | `TRYDOBEATUP` | +1 / +1 / +0 / +0 | yes only under the Level-50 mission boundary | Party HP/species/status exist; bench level is absent but is exactly 50 for S10. |
| Nature Power | `CALLENVIRONMENTATTACK` | +1 / +1 / +0 / +0 | yes | Environment, dynamic target/effect/power lookup, stack, and downstream dispatch exist. |
| Charge | `SETCHARGE` | +1 / +1 / +0 / +0 | **no** | The charged bit and damage consumer exist; the paired timer fields and end-turn expiry do not. |
| Assist | `ASSISTATTACKSELECT` | +1 / +1 / +0 / +0 | yes | Party moves, called move, target selection, and `jumptocalledmove TRUE` are already owned. |
| Imprison | `TRYIMPRISON` | +1 / +1 / +0 / +0 | yes, including its special Pressure PP loop | The status bit and action-admission consumer already exist. |
| Snatch | `TRYSETSNATCH` | +1 / +1 / +0 / +0 | **no** | `stealMove` and turn cleanup exist, but attack-canceler deliberately barriers on the C-selected redirect. |
| Mud Sport | `SETTYPEBASEDHALVERS` plus `PRINTFROMTABLE(gSportsUsedStringIds)` | +1 / +1 / +0 / +0 | **no** | The `status3` owner exists; the Electric damage consumer and table operand do not. |
| Weather Ball | `SETWEATHERBALLTYPE` | +1 / +1 / +0 / +0 | yes | Weather, dynamic type, damage multiplier, and the shared hit path already exist. |
| Water Sport | same as Mud Sport | +1 / +1 / +0 / +0 | **no** | The Fire damage consumer and shared table operand are missing. |
| Camouflage | `SETTYPETOENVIRONMENT` | +1 / +1 / +0 / +0 | rules yes; exact text no | Environment and active types exist; the prepared type substitution does not. |

The census attributions themselves are mechanically exact: its ranked table
names the 19 opcode sets above (`docs/executable-frontier-census.md:30-44`),
and the per-effect rows assign exactly **19 effects / 20 moves / 1 L50
distinct / 2 weighted** to this dossier
(`docs/executable-frontier-census.md:59,76,80,107,132-145,204,223-224,
230,242,245,251,253,260,263`). The corrections are semantic scope
corrections, not arithmetic changes. In particular, the generator sees
`PRINTFROMTABLE` operands and the special Metronome gate, but it cannot infer
state-with-no-owner or C-selected consumers (`docs/executable-frontier-census.md:
278-289`).

## 2. Shared committed surfaces

### 2.1 Fixed script shell and registered dispatch

Every dossier below begins at its named `BattleScript_Effect*`. Except where
the per-case walk says otherwise, `attackcanceler`, `attackstring`,
`ppreduce`, `attackanimation`, `waitanimation`, literal `printstring`,
`waitmessage`, `pause`, `goto`, `return`, and the shared `BattleScript_MoveEnd`
path are already installed through the composed handler registry
(`src/engine/battleScriptRulesContext.ts:2618-2752`). The census walks all
static fallthrough, fork, call, and fixed callback edges and reports only the
named missing opcode/operand surfaces in its rows
(`docs/executable-frontier-census.md:276-292`). Thus each per-case “committed
walk” below enumerates every effect-specific opcode and operand and relies on
this shared shell rather than repeating the same registered list 19 times.

Weather Ball enters the ordinary hit chain: `attackcanceler`,
`accuracycheck`, string/PP, crit, damage/type/normal adjustment, animation and
controllers, result/effect/faint, move end, and end
(`reference/pokeemerald/data/battle_scripts_1.s:236-269,2644-2646`). Its
ordinary unobstructed hit consumes four draws: accuracy, critical hit, damage
variance, and `seteffectwithchance`'s unconditional draw even when the staged
effect byte is zero (`reference/pokeemerald/src/battle_script_commands.c:
1099-1179,1274-1286,1639-1678,2908-2938`). Focus Band adds its own activation
draw. No tail dossier below silently changes that shared accounting.

### 2.2 Owners that already exist

The active battler record already owns moves, PP, status1/2/3, disabled and
Mimic state, stat stages, types, species, personality, IVs, combat stats,
level, HP/max HP, ability, item, and the other established rule fields
(`src/engine/battleScriptRulesContext.ts:223-381`). The context also owns:

- all six independent move-history arrays plus packed `lastTakenMove` and
  `lastTakenMoveFrom` buffers
  (`src/engine/battleScriptRulesContext.ts:558-568`);
- Bide accumulated damage, Bide target, and release scratch
  (`src/engine/battleScriptRulesContext.ts:648-653`);
- `gCalledMove`, `gChosenMove`, locked moves, environment, dynamic move type,
  weather, the Level-50 parties, and typed move/nickname substitutions
  (`src/engine/battleScriptRulesContext.ts:614-615,655-691,696-751`);
- a real move-end writer for `lastPrintedMoves`, `lastMoves`,
  `lastLandedMoves`, `lastHitByType`, and `lastHitBy`
  (`src/engine/battleScriptRulesContext.ts:1288-1405`), plus the exact packed
  Mirror Move writer (`src/engine/battleScriptRulesContext.ts:1410-1453`);
- source-derived move effect, power, type, and flags lookup
  (`src/engine/battleScriptRulesContext.ts:1080-1129`), and the dynamic
  `jumptocalledmove` jump used by Sleep Talk
  (`src/engine/battleScriptSleepTalkOpcode.ts:330-362`).

These are the important “already landed this session” dependencies. New
handlers must reuse them; adding parallel last-move, Bide, environment, or
dynamic-type state would be a regression.

## 3. Per-effect dossiers

### 3.1 Mirror Move — `B_SCR_OP_TRYMIRRORMOVE`

**Source semantics and RNG.** Source first builds, for every non-user
battler, a list from packed `lastTakenMoveFrom[target][attacker]`. It then
prefers the user's packed `lastTakenMove`. A valid preferred move clears
`HITMARKER_ATTACKSTRING_PRINTED`, becomes `gCurrentMove`, retargets through
`GetMoveTarget`, and jumps directly to its effect script with **zero** selector
draws. If only the per-source list is usable, `Random() % validMovesCount`
chooses one, consuming exactly **one** draw even when singles makes the count
one. With no candidate, it sets `ppNotAffectedByPressure` and falls through;
target selection may add a draw only for a target mode whose source helper is
random, not for the ordinary singles selected foe
(`reference/pokeemerald/src/battle_script_commands.c:6633-6678`).

**Committed path, owners, and staging.** The entry is
`attackcanceler; attackstring; pause; trymirrormove`; only the failure
fallthrough then executes `ppreduce`, failed flag/message, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:464-474`). The census correctly
names no static operand beyond `TRYMIRRORMOVE`
(`docs/executable-frontier-census.md:59`). Both packed history consumers and
their move-end owner already exist (§2.2), as do dynamic move lookup and
effect jump. Under the census policy the chosen destination remains
accountable in its own row, unlike Metronome's explicit universe exception.

No 850-set Level-50 rental carries Mirror Move (the census row is `0 (0)`).
`FRONTIER_MON_SPEAROW` is a source Factory-data carrier outside that mission
set (`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
261-268`); use pure Level-50 history fixtures for S10 rather than claiming an
L50 Factory trace. Exact flip: **+1/+1/+0/+0**.

### 3.2 Bide — `B_SCR_OP_SETBIDE`

**Source semantics and RNG.** The setter ORs `STATUS2_MULTIPLETURNS`, locks
Bide as the move, zeros `gBideDmg[user]`, and sets the two-turn Bide counter.
It draws **zero** RNG (`reference/pokeemerald/src/battle_script_commands.c:
7121-7130`). `datahpupdate` accumulates real incoming damage and remembers its
source (`reference/pokeemerald/src/battle_script_commands.c:1843-1917`).
Action admission later decrements the counter, either prints “storing
energy”, releases twice the accumulated damage toward `gBideTarget`, or
fails with no energy (`reference/pokeemerald/src/battle_util.c:2000-2008,
2221-2245`). Release consumes the `accuracycheck` draw; its fixed damage has
no crit or variance draw, though Focus Band in `adjustsetdamage` can add its
activation draw (`reference/pokeemerald/data/battle_scripts_1.s:3287-3322`).

**Committed path, owners, and staging.** Setup is the complete registered
shell plus `orword gHitMarker,HITMARKER_CHARGING`, `setbide`, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:573-582`). The hit chain
already writes `bideDmg`/`bideTarget`
(`src/engine/battleScriptHitChainOpcode.ts:2242-2288`), and the full
storing/release/no-energy action-canceler consumer is already implemented
(`src/engine/battleScriptActionAdmission.ts:3240-3473`). This corrects the
prompt-era expectation that accumulation was still missing: the census
attribution is now complete and `SETBIDE` is an honest single-opcode step.

No 850-set Level-50 carrier exists. `FRONTIER_MON_SEEDOT` is the lower
Factory-data carrier (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:128-135`). Exact flip: **+1/+1/+0/+0**.

### 3.3 Conversion — `B_SCR_OP_TRYCONVERSIONTYPECHANGE`

**Source semantics and RNG.** Source counts occupied user move slots, maps
Mystery to Ghost for a Ghost user and Normal otherwise, and first proves that
at least one move type differs from both current types. Failure draws zero.
Success repeatedly draws `Random() % 4`, rejecting slots outside the occupied
prefix and moves of either current type, then replaces both active types and
prepares that type for text. Draw count is therefore variable and unbounded;
every attempted slot is one attributed draw
(`reference/pokeemerald/src/battle_script_commands.c:7389-7447`).

**Committed path, owners, and staging.** The exact walk is cancel/string/PP,
`tryconversiontypechange BattleScript_ButItFailed`, animation/wait,
`STRINGID_PKMNCHANGEDTYPE`, wait, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:657-667`). Moves and types
exist. No typed `PREPARE_TYPE_BUFFER` owner exists beside the current
move/nickname/number buffers (`src/engine/battleScriptRulesContext.ts:
739-755`), so exact message substitution should land with the opcode even
though the literal script message lets the rules walk finish.

The census row proves no 850-set Level-50 carrier (`docs/executable-frontier-
census.md:80`); use constructed Level-50 moves/types fixtures. Exact flip:
**+1/+1/+0/+0**.

### 3.4 Transform — `B_SCR_OP_TRANSFORMDATAEXECUTION`

**Source semantics and RNG.** Transform first sets `gChosenMove` unavailable.
It fails if the target is transformed or semi-invulnerable. Success sets the
user's transformed bit, clears Disable/Mimic state, saves the target
personality in `transformedMonPersonality`, prepares the target species, then
copies every byte of `BattlePokemon` before `pp`: species, five combat stats,
four moves, IV/egg/ability-number bits, all eight stages, ability, and both
types. Each copied move receives min(base PP, 5), the controller resets move
selection, and the success selector is chosen. It consumes **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:7764-7811`;
`reference/pokeemerald/include/pokemon.h:260-294`).

**Committed path and missing owners.** The entry is fixed shell,
`transformdataexecution`, animation/wait,
`printfromtable gTransformUsedStringIds`, wait, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:947-956`). The table is the
two success/failure strings (`reference/pokeemerald/src/battle_message.c:
1060-1065`) and is absent from the accepted `PRINTFROMTABLE_TABLES`
(`src/engine/battleScriptHitChainOpcode.ts:286-365,3652-3692`), exactly as
the census reports (`docs/executable-frontier-census.md:107`).

Most copied active fields exist, but `DisableStruct::transformedMonPersonality`
and active `abilityNum` do not. The controller reset event and typed species
buffer also have no rule owner. This is not an honest “copy moves and types”
shortcut: the complete pre-PP copy, PP reset, Disable/Mimic clears, controller
event, and table operand form one indivisible source step.

No 850-set L50 carrier exists; lower Factory data has
`FRONTIER_MON_DITTO` (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:380-387`). Exact flip: **+1/+1/+0/+0**.

### 3.5 Mimic — `B_SCR_OP_MIMICATTACKCOPY`

**Source semantics and RNG.** Mimic makes `gChosenMove` unavailable and
rejects a forbidden, none, unavailable, already-known, or target-less last
move, and any transformed user. Success overwrites the current active move
slot with `gLastMoves[target]`, sets PP to min(base PP, 5), prepares the move
name, and sets the corresponding `mimickedMoves` bit. It draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:7835-7883`).

**Committed path, owners, and staging.** After shell setup the script checks
target Substitute, runs the no-roll `NO_ACC_CALC_CHECK_LOCK_ON` form, calls
`mimicattackcopy BattleScript_ButItFailed`, and prints learned-move text
(`reference/pokeemerald/data/battle_scripts_1.s:1134-1145`). Substitute and
that accuracy operand are already accepted on ordinary state; `lastMoves`,
active moves/PP, `mimickedMoves`, and typed move buffer all exist
(`src/engine/battleScriptRulesContext.ts:223-240,292-306,558-568,749-752`).
Mimic intentionally does **not** alter party moves; the bit makes later
persistent PP writes distinguish the temporary slot.

No 850-set L50 carrier exists. Lower Factory data provides
`FRONTIER_MON_JIGGLYPUFF` and `FRONTIER_MON_ABRA`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
303-310,632-639`). Exact flip: **+1/+1/+0/+0**.

### 3.6 Metronome — `B_SCR_OP_METRONOME`

**Source semantics and RNG.** With `MOVES_COUNT == 355`, every candidate is
`(Random() & 0x1ff) + 1`. IDs 355-512 and forbidden moves restart the loop,
each consuming exactly one further draw. Accepted candidates clear the
attack-string marker, replace current move, retarget, and jump directly to
the selected effect. There is no upper bound on draw count
(`reference/pokeemerald/src/battle_script_commands.c:721-746,7885-7923`;
`reference/pokeemerald/include/constants/moves.h:360`). The fixed entry is
cancel/string, pause, animation/wait, zero both animation bytes, then
`metronome`; every fixed opcode and operand is accepted
(`reference/pokeemerald/data/battle_scripts_1.s:1147-1157`).

**Dynamic-universe gate.** The current blocked universe is 23 effects. The
forbidden array removes exactly four of those effects from selection:
Metronome, Mimic, Sketch, and Snatch. Therefore exactly **19 currently
non-executable effects remain selectable**:

`MIRROR_MOVE`, `BIDE`, `CONVERSION`, `TRANSFORM`, `CONVERSION_2`, `LOCK_ON`,
`PRESENT`, `BEAT_UP`, `MEMENTO`, `NATURE_POWER`, `CHARGE`, `ROLE_PLAY`,
`ASSIST`, `RECYCLE`, `IMPRISON`, `MUD_SPORT`, `WEATHER_BALL`,
`WATER_SPORT`, and `CAMOUFLAGE`.

This count follows directly from the forbidden move list
(`reference/pokeemerald/src/battle_script_commands.c:721-746`) and the 23
blocked census rows (`docs/executable-frontier-census.md:46-263`). After the
four concurrent Present/Memento/Role Play/Recycle rows land, the exact gate
is **15 selectable non-executable effects**: the same list minus those four.
After every non-Metronome batch in §4 lands, it is zero. The handler can reuse
source-derived effect/power lookup and Sleep Talk's direct dynamic jump
(§2.2), but must retain a named selected-move/effect runtime barrier until
that zero is reached. The census explicitly makes Metronome the exception to
its ordinary dynamic-dispatch policy (`docs/executable-frontier-census.md:
288`).

The two 850-set Level-50 carriers are `FRONTIER_MON_CHANSEY_1` and
`FRONTIER_MON_CLEFABLE_1` (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:1591-1598,2725-2732`), matching the census's `1
distinct (2 weighted)` row (`docs/executable-frontier-census.md:133`). Exact
eventual flip: **+1/+1/+1/+2**, and never earlier.

### 3.7 Conversion 2 — `B_SCR_OP_SETTYPETORANDOMRESISTANCE`

**Source semantics and RNG.** Failure without RNG occurs when the user's
`lastLandedMoves` is none/unavailable, or when it was a two-turn move and the
recorded source is still in multiple turns. Otherwise source makes up to
1,000 accepted-table attempts. Each attempt rejection-samples
`Random() % 128` until its index is within the type table, then accepts a row
whose attacking type equals `lastHitByType`, multiplier is not effective or
worse, and defensive type is not already held. Raw draw count is unbounded.
After 1,000 misses it scans deterministically
(`reference/pokeemerald/src/battle_script_commands.c:8074-8132`).

The deterministic fallback contains a source bug that must be ported
verbatim: its “already this type” predicate reads `TYPE_EFFECT_DEF_TYPE(i)`
using the stale random-loop index, while the assigned type uses `rands`
(`reference/pokeemerald/src/battle_script_commands.c:8110-8127`). “Fixing”
that index would not reproduce Emerald.

**Committed path, owners, and staging.** The script is fixed shell,
`settypetorandomresistance BattleScript_ButItFailed`, animation/wait,
changed-type literal, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:1275-1284`). All three
independent histories, source battler identity, status2, and active types are
owned (§2.2); only typed type-name substitution remains absent. No 850-set
L50 carrier exists (`docs/executable-frontier-census.md:143`). Exact flip:
**+1/+1/+0/+0**.

### 3.8 Lock On / Mind Reader — `B_SCR_OP_SETALWAYSHITFLAG`

**Source semantics and RNG.** The setter replaces the target's
`STATUS3_ALWAYS_HITS` counter with two turns and records the user in
`battlerWithSureHit`; it draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:8134-8141`). The script
checks Substitute, then ordinary move accuracy before setting the flag, so a
normal 100-accuracy success consumes **one** accuracy draw; Substitute
consumes none (`reference/pokeemerald/data/battle_scripts_1.s:1286-1297`).
End turn decrements the packed counter, and switching either participant
clears or Baton-Pass-refreshes it by consulting the saved identity
(`reference/pokeemerald/src/battle_util.c:1738-1747`;
`reference/pokeemerald/src/battle_main.c:3160-3215`).

**Falsification.** `status3` exists, but `battlerWithSureHit` does not. Both
accuracy paths explicitly barrier when the bit is present
(`src/engine/battleScriptHitChainOpcode.ts:860-905,970-996`), and end-turn
Lock On is currently skipped
(`src/engine/battleEndTurnOrchestration.ts:1438-1451`). Switch-in likewise
names the missing identity (`src/engine/battleScriptSwitchinOpcode.ts:
298-359`). The census's opcode-only attribution
(`docs/executable-frontier-census.md:144`) is therefore mechanically right
but semantically incomplete. The setter, identity, both accuracy consumers,
expiry, and singles switch clear must land together.

Neither Lock On nor Mind Reader has an 850-set L50 carrier; the row is two
moves at `0 (0)`. Exact flip: **+1 effect/+2 moves/+0/+0**.

### 3.9 Sketch — `B_SCR_OP_COPYMOVEPERMANENTLY`

**Source semantics and RNG.** Sketch rejects transformed users, Struggle,
none/unavailable, Sketch itself, and a move already known outside the Sketch
slot. Success overwrites the active Sketch slot with
`gLastPrintedMoves[target]`, restores full base PP, sends all four moves/PP
plus `ppBonuses` to the party controller, and prepares the move name. It
draws **zero** RNG (`reference/pokeemerald/src/battle_script_commands.c:
8143-8203`).

**Committed path and owners.** The script checks Substitute, calls
`copymovepermanently BattleScript_ButItFailed`, then performs the normal
animation/message/move-end shell
(`reference/pokeemerald/data/battle_scripts_1.s:1299-1310`). The exact
`lastPrintedMoves` owner already exists (§2.2), as do active and party
moves/PP and the move-name buffer
(`src/engine/battleScriptRulesContext.ts:223-240,495-528,749-752`). What is
not yet packaged is a durable party **move** writer parallel to the existing
party-PP writer (`src/engine/battleScriptRulesContext.ts:1832-1857`), and
neither active nor party records own `ppBonuses`. Those are implementation
work inside this opcode, not additional bytecode blockers.

No 850-set L50 carrier exists (`docs/executable-frontier-census.md:145`).
Exact flip: **+1/+1/+0/+0**.

### 3.10 Beat Up — `B_SCR_OP_TRYDOBEATUP`

**Source semantics and RNG.** The handler walks the attacker's six-party
array from `gBattleCommunication[0]`, accepting living, nonempty, non-Egg,
status-free members. For each it prepares the nickname, computes damage from
that member's species base Attack and level, current move power, target
species base Defense, and Helping Hand, then advances the index. It selects
end versus initial failure by whether any member was already visited. The
handler draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:8957-9007`).

The script itself consumes one initial accuracy draw. Each eligible member
then consumes one `critcalc` draw and one `adjustnormaldamage` variance draw;
Focus Band can add one. It deliberately skips ordinary `damagecalc` and
`typecalc`, then performs the registered animation/controller/faint shell and
loops (`reference/pokeemerald/data/battle_scripts_1.s:1940-1975`).
`setbyte gBattleCommunication,0` and the `jumpifbyte gCritMultiplier`
operand are already accepted; the census confirms only `TRYDOBEATUP`
(`docs/executable-frontier-census.md:204`).

Party species/HP/status and active target species/Defense exist
(`src/engine/battleScriptRulesContext.ts:495-528,316-339`). Party level does
not, but every legal S10 participant is Level 50, so using the mission
constant is exact; a general Open-level port would require adding party
level. No 850-set L50 carrier exists, so use a constructed complete
three-member Level-50 party fixture. Exact flip: **+1/+1/+0/+0**.

### 3.11 Nature Power — `B_SCR_OP_CALLENVIRONMENTATTACK`

**Source semantics and RNG.** The environment map is Stun Spore, Razor Leaf,
Earthquake, Hydro Pump, Surf, Bubble Beam, Rock Slide, Shadow Ball, or Swift,
with the Factory building environment selecting Swift. The opcode clears the
attack-string marker, replaces current move, retargets, pushes the selected
effect script, and advances its own continuation. The earlier zero-draw claim
was too broad: `GetMoveTarget` is called inside this opcode, so selected-target
moves rejection-draw until an opposing battler is found (seed 1 in singles:
**16838** rejects the user, **44065** accepts the foe). Building-selected
Swift targets both and therefore draws **zero** in the opcode; Swift owns the
later crit, variance, and zero-effect draws
(`reference/pokeemerald/src/battle_script_commands.c:759-771,9109-9116`).

**Committed path, owners, and staging.** The entry is cancel/string/pause,
`callenvironmentattack`, “turned into” text, wait, and `return`
(`reference/pokeemerald/data/battle_scripts_1.s:2288-2295`). Environment is a
real context field initialized to Building in Factory decisions
(`src/engine/battleScriptRulesContext.ts:614-615`;
`src/engine/factoryBattleScriptFullTurnDecision.ts:433`), and effect/power,
target, control stack, and downstream scripts exist. The pushed script runs
only after Nature Power's continuation returns. Its `ppreduce` uses the
unchanged move-position slot, so Nature Power loses one PP even though
`gCurrentMove` is Swift. Move end records Nature Power as `gLastMoves`, Swift
as `gLastResultingMoves` and `gLastLandedMoves`, and Swift's Normal type as
`gLastHitByType`. No hidden state owner is missing. No 850-set L50 carrier
exists (`docs/executable-frontier-census.md:223`). Exact flip:
**+1/+1/+0/+0**.

### 3.12 Charge — `B_SCR_OP_SETCHARGE`

**Source semantics and RNG.** The setter ORs `STATUS3_CHARGED_UP` and writes
both `chargeTimer` and `chargeTimerStartValue` to two; it draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:9100-9107`). Damagecalc
doubles an Electric move from a charged user
(`reference/pokeemerald/src/battle_script_commands.c:1288-1303`), while end
turn decrements the timer and clears the bit at zero
(`reference/pokeemerald/src/battle_util.c:1738-1750`). The entry is otherwise
the fixed shell (`reference/pokeemerald/data/battle_scripts_1.s:2297-2306`).

**Falsification and staging.** The active `status3` owner and Electric damage
consumer already exist (`src/engine/battleScriptHitChainOpcode.ts:
1391-1405`), but neither charge timer field exists and the end-turn case is
an explicit no-op (`src/engine/battleEndTurnOrchestration.ts:1448-1451`).
The census row (`docs/executable-frontier-census.md:224`) therefore
understates the required lifetime work. No 850-set L50 carrier exists. Exact
flip after setter plus lifetime: **+1/+1/+0/+0**.

### 3.13 Assist — `B_SCR_OP_ASSISTATTACKSELECT`

**Source semantics and RNG.** Assist scans every non-user party member and
all four moves, excluding empty/Egg slots, Sleep Talk/Assist/Mirror
Move/Metronome, and the shared forbidden list. With candidates it consumes
exactly **one** draw and selects
`((Random() & 0xff) * count) >> 8`, clears the attack-string marker, stores
`gCalledMove`, and retargets. With none it draws zero and takes the failure
pointer (`reference/pokeemerald/src/battle_script_commands.c:9484-9539,
8205-8220`).

**Committed path, owners, and staging.** The entry is cancel/string,
`assistattackselect BattleScript_FailedFromPPReduce`, animation/wait, zero
the two animation bytes, and `jumptocalledmove TRUE`
(`reference/pokeemerald/data/battle_scripts_1.s:2367-2377`). Party moves,
called move, target resolution, and the exact TRUE operand are already live
(`src/engine/battleScriptRulesContext.ts:495-528,654-667`;
`src/engine/battleScriptSleepTalkOpcode.ts:330-362`). No new owner is needed.

No 850-set L50 carrier exists. `FRONTIER_MON_SENTRET` is the lower
Factory-data carrier (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:114-121`). Exact flip: **+1/+1/+0/+0**.

### 3.14 Imprison — `B_SCR_OP_TRYIMPRISON`

**Source semantics and RNG.** An already-set
`STATUS3_IMPRISONED_OTHERS` fails. Otherwise source applies a special
Pressure loop, losing one additional Imprison PP for each opposing Pressure
battler and emitting one persistent PP controller update, then scans opposing
active moves for any overlap with the user's moves. Any overlap sets the bit;
none fails. There is **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:9412-9453`;
`reference/pokeemerald/src/battle_util.c:767-797`).

**Committed path, owners, and staging.** The entry is the fixed shell with
`tryimprison BattleScript_ButItFailed`
(`reference/pokeemerald/data/battle_scripts_1.s:2509-2518`). `status3`,
active moves/PP, party PP, and the permanent-PP update shape exist. More
importantly, action admission already scans opposing Imprison bits and move
overlap (`src/engine/battleScriptActionAdmission.ts:2355-2425`), and Sleep
Talk already consumes that scan (`src/engine/battleScriptSleepTalkOpcode.ts:
116-143`). The opcode must include the special Pressure loop, but no new
state owner or consumer is needed.

No 850-set L50 carrier exists. `FRONTIER_MON_RALTS` is the lower Factory-data
carrier (`reference/pokeemerald/src/data/battle_frontier/
battle_frontier_mons.h:37-44`). Exact flip: **+1/+1/+0/+0**.

### 3.15 Snatch — `B_SCR_OP_TRYSETSNATCH`

**Source semantics and RNG.** Snatch sets
`ppNotAffectedByPressure`; it fails if the user is last in current action
order, otherwise sets `ProtectStruct::stealMove`. It draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:9553-9566`). The entry
calls the setter before attack string/PP and otherwise uses the fixed shell
(`reference/pokeemerald/data/battle_scripts_1.s:2543-2553`).

On a later Snatch-affected move, attack canceler scans battlers in turn order,
charges Pressure PP, clears the winning flag, saves the snatcher, pushes the
current script, and enters `BattleScript_SnatchedMove`; that script updates
battlers/markers and returns to the stolen effect
(`reference/pokeemerald/src/battle_script_commands.c:971-982`;
`reference/pokeemerald/data/battle_scripts_1.s:3677-3686`). Turn cleanup
clears the one-turn flag (`reference/pokeemerald/src/battle_main.c:3297`).

**Falsification and staging.** `currentTurnActionNumber`, turn order,
`stealMove`, and Protect-struct cleanup already exist
(`src/engine/battleScriptRulesContext.ts:250-251,757-776`;
`src/engine/battleEndTurnOrchestration.ts:1800-1825`). But attack canceler
explicitly barriers on the redirect because Pressure loss, script push, and
handoff are absent (`src/engine/battleScriptAttackCancelerOpcode.ts:
180-214`). Thus the census row (`docs/executable-frontier-census.md:245`) is
not an honest setter-only step. No 850-set L50 carrier exists. Exact flip
after setter plus consumer: **+1/+1/+0/+0**.

### 3.16 Mud Sport and Water Sport — `B_SCR_OP_SETTYPEBASEDHALVERS`

**Source semantics and RNG.** One shared handler distinguishes the current
effect. It fails if the user's corresponding status3 bit is already set;
otherwise it sets `STATUS3_MUDSPORT` or `STATUS3_WATERSPORT` and selects the
Electric/Fire message. It draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:9758-9785`). Both
effects share the exact shell and
`printfromtable gSportsUsedStringIds`
(`reference/pokeemerald/data/battle_scripts_1.s:2628-2642`); that table has
the two expected strings (`reference/pokeemerald/src/battle_message.c:
1126-1131`).

The durable consumer scans all active battlers: any Mud Sport halves Electric
move power and any Water Sport halves Fire move power before base damage
(`reference/pokeemerald/src/battle_util.c:3111-3128`;
`reference/pokeemerald/src/pokemon.c:3215-3218`). The flags survive Baton
Pass but clear on an ordinary switch
(`reference/pokeemerald/src/battle_main.c:3173-3188`).

**Falsification and staging.** `status3` and Baton-Pass masks already include
both flags (`src/engine/battleScriptSwitchinOpcode.ts:58-75,384-401`), but
base damage has no sport scan. `gSportsUsedStringIds` is also outside the
registered table map (`src/engine/battleScriptHitChainOpcode.ts:286-365,
3652-3692`), which the census correctly reports for both rows
(`docs/executable-frontier-census.md:251,260`). The setter, shared print
table, damage consumers, repeat failures, and switch lifetime belong in one
step.

Neither effect has an 850-set L50 carrier. `FRONTIER_MON_MUDKIP` is a lower
Factory-data Mud Sport carrier (`reference/pokeemerald/src/data/
battle_frontier/battle_frontier_mons.h:674-681`); Water Sport has no
source-data carrier found, so both require constructed Level-50 fixtures for
the mission. Exact combined flip: **+2 effects/+2 moves/+0/+0**.

### 3.17 Weather Ball — `B_SCR_OP_SETWEATHERBALLTYPE`

**Source semantics and RNG.** If weather has effect, any weather doubles
`dmgMultiplier`, then Rain/Sand/Sun/Hail select Water/Rock/Fire/Ice dynamic
type; a residual weather mask selects dynamic Normal. With Cloud Nine/Air
Lock suppression it changes neither. The opcode draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:9787-9808`). The script
then enters the full shared hit tail (`reference/pokeemerald/data/
battle_scripts_1.s:2644-2646`), whose normal four draws are in §2.1.

**Committed path, owners, and staging.** Weather, `dmgMultiplier`,
`dynamicMoveType`, ability, and dynamic type consumption already exist
(`src/engine/battleScriptRulesContext.ts:621-691`;
`src/engine/battleScriptHitChainOpcode.ts:135-139,1382-1405`). The opcode is
the only missing static surface and the census attribution is honest
(`docs/executable-frontier-census.md:253`). No 850-set L50 carrier exists.
Exact flip: **+1/+1/+0/+0**.

### 3.18 Camouflage — `B_SCR_OP_SETTYPETOENVIRONMENT`

**Source semantics and RNG.** The environment map is Grass, Ground, Water,
Rock, or Normal; Factory Building is Normal. If the user already has that
type, the effect fails. Otherwise both active types become the environment
type and its name is prepared. It draws **zero** RNG
(`reference/pokeemerald/src/battle_script_commands.c:826-839,9831-9844`).

**Committed path, owners, and staging.** The script is fixed shell,
`settypetoenvironment BattleScript_ButItFailed`, changed-type text, and move
end (`reference/pokeemerald/data/battle_scripts_1.s:2798-2808`).
Environment and active types exist; typed type substitution does not (§3.3).
No 850-set L50 carrier exists (`docs/executable-frontier-census.md:263`).
Exact flip: **+1/+1/+0/+0**.

## 4. Ordered main-lane batch plan

The four concurrent effects independently add **+4 effects / +4 moves / +4
L50 distinct / +4 weighted**, moving the audited baseline to
**195/214, 335/355, 275/276, 2955/2957**. The ordered plan below starts from
that merge point. If those commits have not landed, apply the same deltas to
191/331/271/2951 instead; no batch prediction depends on them except
Metronome's gate count.

| Order | Bounded batch | Independent delta (effects / moves / L50 distinct / weighted) | Predicted cumulative census | Cap sizing | Hardest thing |
| ---: | --- | ---: | ---: | --- | --- |
| 1 | Bide setter | +1 / +1 / +0 / +0 | 196 / 336 / 275 / 2955 | single-cap | Prove setup feeds the already-landed accumulation and release reducer without duplicating state. |
| 2 | Last-move family: Mirror Move, Mimic, Sketch | +3 / +3 / +0 / +0 | 199 / 339 / 275 / 2955 | single-cap if kept source-focused; split Sketch if controller receipts expand | Sketch's permanent four-move/PP/PP-bonus party write; Mirror's two packed history precedence branches. |
| 3a | Type-change setters: Conversion, Conversion 2, Camouflage | +3 / +3 / +0 / +0 | 202 / 342 / 275 / 2955 | single-cap | Conversion 2's unbounded rejection draws and stale-`i` fallback bug. |
| 3b | Environment attacks: Weather Ball, Nature Power | +2 / +2 / +0 / +0 | 204 / 344 / 275 / 2955 | single-cap | Nature Power's push/return ordering while the selected Swift script owns PP and move-end semantics. |
| 4 | Charge plus Mud/Water Sport setters and consumers | +3 / +3 / +0 / +0 | 207 / 347 / 275 / 2955 | single-cap only if shared lifetime/damage helpers stay bounded; otherwise split Charge from Sports | Sports modify pre-formula move power across any active battler; Charge needs its missing timer and expiry. |
| 5a | Lock On / Mind Reader | +1 / +2 / +0 / +0 | 208 / 349 / 275 / 2955 | single-cap | Cross-battler `battlerWithSureHit` identity across accuracy, expiry, ordinary switch, and Baton Pass. |
| 5b | Imprison | +1 / +1 / +0 / +0 | 209 / 350 / 275 / 2955 | single-cap | Extra multi-Pressure PP loss without double-applying ordinary `ppreduce`. |
| 5c | Snatch | +1 / +1 / +0 / +0 | 210 / 351 / 275 / 2955 | single-cap; do not combine with 5a | Attack-canceler script-stack handoff and battler swap, not the trivial setter. |
| 6a | Assist | +1 / +1 / +0 / +0 | 211 / 352 / 275 / 2955 | single-cap | Exact candidate filtering plus high-byte scaled selection and dynamic call. |
| 6b | Beat Up | +1 / +1 / +0 / +0 | 212 / 353 / 275 / 2955 | single-cap | Six-slot loop continuation, member-specific formula, and per-hit RNG ledger. |
| 7 | Transform | +1 / +1 / +0 / +0 | 213 / 354 / 275 / 2955 | single-cap alone; split only if controller abstraction must first widen | Full pre-PP battler copy and missing transformed-personality/controller owners. |
| 8 | Metronome, only after selectable gate = 0 | +1 / +1 / +1 / +2 | **214 / 355 / 276 / 2957** | single-cap after closure; otherwise evidence-only | Unbounded rejection stream plus selected effect/target dynamic jump, with no false early census flip. |

Batch 3 and Batch 5 **must be split** as shown. Batch 6 should also remain two
steps because Assist is a selector while Beat Up is a multi-hit damage
engine. Batch 4 is the only judgment call: its three rows share status3 and
damage/lifetime ownership, but if a cap cannot pin Charge expiry plus both
Sport damage consumers and the shared print table, split it into
**Charge (+1/+1/+0/+0)** and **Sports (+2/+2/+0/+0)** without changing any
cumulative prediction.

Every non-Metronome batch together contributes exactly **+18 effects / +19
moves / +0 L50 distinct / +0 weighted**. After the four concurrent flips,
that reaches **213/214 effects, 354/355 moves, 275/276 distinct,
2955/2957 weighted** and makes Metronome's selectable non-executable count
zero. Metronome's final **+1/+1/+1/+2** then closes all four census totals.

## 5. Acceptance ledger

| Effect(s) | Required acceptance beyond “script reaches END” |
| --- | --- |
| Mirror Move | preferred packed last-taken branch; fallback list branch with exactly one draw; no-candidate Pressure suppression; selected-effect runtime barrier receipt |
| Bide | initial counter/lock/zero; incoming physical and special accumulation; store, release, no-energy; saved target; exact release accuracy ledger |
| Conversion / Conversion 2 / Camouflage | success/failure and exact type buffer; Conversion rejection draws; Conversion 2 no-history/two-turn failures, 1/2-draw samples, 1,000-attempt fallback, stale-index bug |
| Transform | failure predicates; every copied pre-PP field; PP min-five; Disable/Mimic clears; personality; controller reset; both print-table indices |
| Mimic / Sketch | every forbidden/duplicate/transformed/Substitute failure; exact history source; PP rule; Mimic temporary bit; Sketch durable party moves/PP/bonus payload |
| Lock On | setter identity, both sure-hit accuracy forms, expiry, either participant switching, Baton Pass refresh |
| Beat Up | empty/invalid/statused/fainted party members; zero-member failure; 1/3-member loops; formula and nickname per slot; exact accuracy/crit/variance ledger |
| Nature Power / Assist | every candidate/filter branch; Building→Swift; stack/return behavior; selected move owns later RNG |
| Charge / Sports / Weather Ball | setter repeat failures; Charge Electric-only double and expiry; either-side Sport field scan and switch lifetime; Weather Ball every weather and suppression branch |
| Imprison / Snatch | overlap/no-overlap/already-set; 0/1/multiple Pressure foes; action-admission denial; last-action failure; Snatch winner order, Pressure, stack, battler swap, and cleanup |
| Metronome | candidate IDs above move count; every forbidden move; 1/2/N draw acceptance; target selection; selected executable effect; selected blocked-effect receipt until the gate reaches zero |

All zero-weight dossiers have an honest Level-50 staging verdict rather than
an invented carrier. The sole remaining Level-50 row is Metronome, whose two
real carriers and dynamic closure condition are named in §3.6.
