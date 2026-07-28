# Ranked single-opcode ground-truth and falsification notes

This is a source-and-engine audit only. No oracle trace was run and no
production code was changed. “Registered” means that the current interpreter
installs an opcode; it does **not** mean that every operand accepted by the
source, every C-selected continuation, or every durable consumer is modeled.
That is also the census's stated policy: registered runtime barriers count as
executable (`docs/executable-frontier-census.md:5,18-22`).

## 1. Scope and headline corrections

The committed baseline audited here is **168/214 effects, 303/355 moves,
246/276 Factory-L50 distinct moves, 2845/2957 Factory-L50 weighted moves**
(`docs/executable-frontier-census.md:9-16`, commit `379b291f`). The ranked
table attributes the following 14 effects / 15 moves to twelve target families
(`docs/executable-frontier-census.md:24-41,96,139,147,156,170,182,191,198,
216-218,246,250,255`).

| Target family | Census row: effects / moves / Factory distinct (weighted) | Is registration alone an honest flip? | Correction or confirmation |
| --- | ---: | --- | --- |
| Perish Song | 1 / 1 / 1 (4) | **no** | The census already names the unaccepted `jumpifability ... ABILITY_SOUNDPROOF` operand; the Perish timer and end-turn/faint owner are also absent. |
| Eruption / Water Spout | 1 / 2 / 2 (2) | yes | `hp`, `maxHP`, `dynamicBasePower`, and the shared hit path already exist. |
| Teeter Dance | 1 / 1 / 1 (2) | yes, in singles | The exact missing tuple is `jumpifarrayequal gBattlerAttacker, gBattlerTarget, 1`; all other script operands are accepted. The doubles-only `MOVEEND_NEXT_TARGET` replay remains a registered runtime barrier. |
| Magnitude | 1 / 1 / 1 (2) | yes, in singles | One table draw, existing dynamic-power owner, and the already-registered all-target loop are sufficient. The doubles next-target scan remains a registered runtime barrier. |
| Belly Drum | 1 / 1 / 1 (2) | yes | Existing HP, max-HP, Attack-stage, damage, and HP-controller owners cover every write. |
| Metronome | 1 / 1 / 1 (2) | **no** | The opcode dynamically transfers to any accepted non-forbidden move effect. Honest executability depends on the entire selectable effect universe, which is not statically walked by the census. |
| Pain Split | 1 / 1 / 1 (2) | **no** | The source scratch `painSplitHp`, `shellBellDmg` suppression, and `copyarray (gBattleMoveDamage, sPAINSPLIT_HP, 4)` operand are all absent. |
| Stockpile / Swallow / Spit Up | 3 / 3 / 3 (5) | **no** | One shared counter/lifetime subsystem is absent; Stockpile and Swallow also hit unaccepted `printfromtable` pointers. |
| Grudge | 1 / 1 / 1 (2) | **no** | The status3 bit has an owner, but `tryfaintmon`'s PP-zeroing Grudge hook is an explicit engine barrier. |
| Spite | 1 / 1 / 1 (2) | **no** | Active PP and a PP-controller event exist, but `mimickedMoves`, durable party PP, and the prepared move/number message buffers do not. |
| Super Fang | 1 / 1 / 1 (1) | yes | Existing damage and HP-update owners cover the sole write; no hidden operand is narrowed. |
| Hidden Power | 1 / 1 / 1 (1) | **no** | Dynamic power/type owners exist, but the six IV inputs do not exist in `BattleScriptRulesContext`. |

There are therefore seven affected families (nine effect rows) if the ranked
row is read as “register this one opcode and the effect is semantically
complete”: Perish Song, Metronome, Pain Split, the three Stockpile-family
rows, Grudge, Spite, and Hidden Power. Perish Song's Soundproof operand is
already reported by the census; the other hidden requirements are not.

The generator has a special per-operand check only for `jumpifability`.
Registered dynamic jumps are deliberately treated as executable and their
runtime-selected effect is left to its own row
(`tools/report/executable-frontier-census.ts:379-413,440-489`). It has no
parallel check for `jumpifarrayequal`, `copyarray`, `printfromtable`, or
C-selected consumers. That explains every correction above; the source rows
themselves are correct.

## 2. Shared committed paths and RNG accounting

### 2.1 Shared hit tail

Eruption/Water Spout and Hidden Power enter `BattleScript_EffectHit`; after
the Surf-only prelude it executes `attackcanceler`, `accuracycheck`,
`attackstring`, `ppreduce`, `critcalc`, `damagecalc`, `typecalc`,
`adjustnormaldamage`, `attackanimation`, `waitanimation`,
`effectivenesssound`, `hitanimation BS_TARGET`, `waitstate`,
`healthbarupdate BS_TARGET`, `datahpupdate BS_TARGET`, `critmessage`,
`waitmessage`, `resultmessage`, `seteffectwithchance`,
`tryfaintmon BS_TARGET`, `moveendall`, and `end`
(`reference/pokeemerald/data/battle_scripts_1.s:236-269`). Super Fang enters
the same tail only at `BattleScript_HitFromAtkAnimation`, after doing its own
accuracy/type/half-HP work (`reference/pokeemerald/data/battle_scripts_1.s:
809-818`).

Every opcode and the shown `BS_TARGET` operands are registered. The durable
damage path owns `battleMoveDamage`, `dynamicBasePower`, HP, max HP, and the
party HP mirror (`src/engine/battleScriptRulesContext.ts:188-200,302-333,
570-574,627-630`; `src/engine/battleScriptHitChainOpcode.ts:2067-2149`).
Two generic registered-runtime barriers remain and are not unique to these
ranked rows: a Focus Band target stops `adjustnormaldamage` because
`focusBanded` is absent (`src/engine/battleScriptHitChainOpcode.ts:
1695-1732`), and a Grudge-marked target stops `tryfaintmon`
(`src/engine/battleScriptHitChainOpcode.ts:3586-3598`). Under the census's
current “registered barrier counts” policy neither changes the arithmetic
below, but acceptance fixtures should avoid silently exercising them unless
that subsystem is part of the step.

On the ordinary no-Focus-Band damaging path, `accuracycheck` consumes one
draw even at 100 accuracy, `critcalc` one, `adjustnormaldamage` one damage
variance draw, and `seteffectwithchance` one draw even when the staged effect
byte and secondary chance are zero. The source evaluates `Random()` before
testing that byte (`reference/pokeemerald/src/battle_script_commands.c:
1099-1179,1274-1286,1639-1678,2908-2938`). A Focus Band target adds its own
activation draw after variance. Thus Eruption/Water Spout and Hidden Power
have four ordinary shared-tail draws; Super Fang has two (accuracy and the
zero-byte `seteffectwithchance`) because it skips crit, base-damage, and
adjustment.

### 2.2 Narrowed operands reused below

The engine's `jumpifability` map accepts exactly Liquid Ooze, Limber,
Immunity, Own Tempo, Vital Spirit, Insomnia, and Suction Cups; Soundproof is
not present (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:249-287,
290-322`). Its `jumpifstatus2` map accepts Substitute, Confusion, Multiple
Turns, and Focus Energy (`src/engine/battleScriptStatbuffchangeOpcode.ts:
297-337`). Safeguard is the accepted `jumpifsideaffecting` value
(`src/engine/battleScriptStatusPrimaryOpcode.ts:37-40,158-187`).

`setbyte` can write `gBattlerTarget`, `sBATTLER`, `sB_ANIM_TURN`, and
`sDMG_MULTIPLIER`; the corresponding context owners are live
(`src/engine/battleScriptSetByte.ts:34-50,255-303`). `addbyte` accepts the
Perish/Teeter loop increments, and `jumpifarraynotequal` accepts
`sBATTLER`/`gBattlerTarget` against `gBattlersCount`
(`src/engine/battleScriptDamagingWeatherOpcode.ts:220-240,340-367`).
Conversely, `copyarray` is tuple-narrowed and explicitly barriers every tuple
outside its enumerated damage/Triple-Kick/multihit/selector set
(`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:149-245`).
`printfromtable` is also pointer-narrowed and barriers an unknown table
(`src/engine/battleScriptHitChainOpcode.ts:3314-3353`).

## 3. Per-family dossier

### 3.1 `B_SCR_OP_TRYSETPERISHSONG` / `EFFECT_PERISH_SONG`

**Source semantics and draws.** The handler scans every battler. An existing
`STATUS3_PERISH_SONG` or Soundproof increments `notAffectedCount`; every
other battler receives the bit and both timer fields set to 3. The special
Perish-Song Pressure helper then subtracts one additional PP per other
Pressure battler and emits one persistent PP update; only after that does an
all-unaffected field take the failure pointer. Neither helper draws RNG
(`reference/pokeemerald/src/battle_script_commands.c:8508-8534`;
`reference/pokeemerald/src/battle_util.c:799-828`). The effect
script is `attackcanceler`, `attackstring`, `ppreduce`,
`trysetperishsong BattleScript_ButItFailed`, animation/wait, the
`STRINGID_FAINTINTHREE` print/wait, `setbyte sBATTLER, 0`, then a Soundproof
message loop using `jumpifability BS_SCRIPTING, ABILITY_SOUNDPROOF`,
`addbyte sBATTLER, 1`, and
`jumpifbytenotequal sBATTLER, gBattlersCount`
(`reference/pokeemerald/data/battle_scripts_1.s:1567-1593`). There is no
effect-local RNG draw.

At end turn, source iterates `gBattlerByTurnOrder`, formats the current timer,
decrements and prints when nonzero, or clears the bit, sets damage to current
HP, and executes the passive HP/faint script at zero
(`reference/pokeemerald/src/battle_util.c:1837-1859`;
`reference/pokeemerald/data/battle_scripts_1.s:3438-3450`).

**Committed path, operands, and state.** All entry opcodes except
`TRYSETPERISHSONG` are registered, and the set/add/not-equal loop operands
are accepted (§2.2). `BS_SCRIPTING, ABILITY_SOUNDPROOF` is not: the current
ability handler accepts only `BS_TARGET`/`BS_ATTACKER` and its seven-value
map (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:277-322`).
`status3`, active PP, and the persistent PP event shape exist, so the special
Pressure loop needs implementation but no new scalar owner
(`src/engine/battleScriptRulesContext.ts:188-207`;
`src/engine/battleScriptHitChainOpcode.ts:1160-1194`). Neither Perish timer
field exists (`src/engine/battleScriptRulesContext.ts:188-207,240-260`), and
the engine
explicitly says Perish Song is the unmodeled half of
`HandleWishPerishSongOnTurnEnd`
(`src/engine/battleEndTurnOrchestration.ts:1895-1904`). Countdown number
substitution, ordinary switch/faint clearing, and Baton Pass preservation
must land with that owner; the raw source preserves both timer fields only
for Baton Pass (`reference/pokeemerald/src/battle_main.c:3152-3217,
3264-3295`).

**Census and staging.** Correct the ranked premise: the opcode is real, but
the census already admits Soundproof and misses the timer consumer. The
already-banked OFF evidence proves setup and two decrements without
registering production code (`docs/perish-song-off-evidence.md:1-20`).
For a single-ability Factory carrier use `FRONTIER_MON_MURKROW_2`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
2026-2033`); Murkrow has only Insomnia
(`reference/pokeemerald/src/data/pokemon/species_info.h:5949-5974`).

### 3.2 `B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO` / `EFFECT_ERUPTION`

**Source semantics and draws.** If `gDynamicBasePower` is zero, the handler
computes `attacker.hp * move.power / attacker.maxHP`, clamps zero to one, and
advances; a preexisting nonzero override is preserved. It draws no RNG
(`reference/pokeemerald/src/battle_script_commands.c:9379-9390`). Eruption's
entry is exactly `scaledamagebyhealthratio; goto BattleScript_EffectHit`
(`reference/pokeemerald/data/battle_scripts_1.s:2493-2495`). Eruption and
Water Spout both have power 150 and 100 accuracy
(`reference/pokeemerald/src/data/battle_moves.h:3695-3706,4202-4212`), so
their ordinary full hit consumes the four shared draws in §2.1 and no
opcode-local draw.

**Committed path, state, census, and staging.** The missing zero-operand
opcode followed by the complete shared hit tail is the full path. `hp`,
`maxHP`, and `dynamicBasePower` already exist, and damage calculation already
reads the latter as its power override
(`src/engine/battleScriptRulesContext.ts:302-333,570-574`;
`src/engine/battleScriptHitChainOpcode.ts:1267-1300`). Confirm the census
attribution: no hidden operand or new owner is needed. Use
`FRONTIER_MON_CAMERUPT_2`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
2425-2432`); Camerupt has only Magma Armor
(`reference/pokeemerald/src/data/pokemon/species_info.h:9509-9534`).
Test full, fractional, one-HP, and preexisting-override branches.

### 3.3 `B_SCR_OP_JUMPIFARRAYEQUAL` / `EFFECT_TEETER_DANCE`

**Source semantics and draws.** `Cmd_jumpifarrayequal` compares the two
pointer ranges byte-by-byte for the encoded size and jumps only if all bytes
match (`reference/pokeemerald/src/battle_script_commands.c:3771-3790`).
`jumpifbyteequal` expands to exactly
`jumpifarrayequal ..., ..., 0x1, ...`
(`reference/pokeemerald/asm/macros/battle_script.inc:1409-1412`).

The script initializes `gBattlerTarget=0`, then per battler performs
`movevaluescleanup`, stages Confusion, skips the attacker through
`jumpifarrayequal gBattlerAttacker,gBattlerTarget,1`, and checks Own Tempo,
Substitute, existing Confusion, zero HP, accuracy, and Safeguard. Success
animates, calls `seteffectprimary`, reports, runs
`moveendto MOVEEND_NEXT_TARGET`, increments the target, compares it with
`gBattlersCount`, and ends. Own Tempo, Safeguard, Substitute,
already-confused, and miss labels each print/report and rejoin the same
move-end/increment tail
(`reference/pokeemerald/data/battle_scripts_1.s:2571-2621`).
In Level-50 singles, a normal eligible target consumes one accuracy draw and
one Confusion-duration draw; Own Tempo/Substitute/already-confused/zero-HP
branches consume neither. The duration is exactly `(Random() % 4) + 2`
(`reference/pokeemerald/src/battle_script_commands.c:2530-2546`).

**Committed path and operands.** Every listed opcode except
`JUMPIFARRAYEQUAL` is registered. Own Tempo is accepted by
`jumpifability`; Substitute/Confusion by `jumpifstatus2`; Safeguard by
`jumpifsideaffecting`; `gBattlerTarget` set/add/not-equal tuples are accepted
(§2.2). Confusion's status2 mutation and duration draw already exist
(`src/engine/battleScriptHitChainOpcode.ts:2840-2914`). The only registered
runtime caveat is `MOVEEND_NEXT_TARGET`'s doubles replay, explicitly
unreachable in singles (`src/engine/battleScriptMoveEndOpcode.ts:405-418`).

**Census and staging.** Confirm the census attribution for the singles
contract. Implement precisely the one-byte
`gBattlerAttacker,gBattlerTarget` comparison rather than a general raw-memory
layer. Use `FRONTIER_MON_SPINDA`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
1018-1025`); Spinda has only Own Tempo
(`reference/pokeemerald/src/data/pokemon/species_info.h:8549-8574`).

### 3.4 `B_SCR_OP_MAGNITUDEDAMAGECALCULATION` / `EFFECT_MAGNITUDE`

**Source semantics and draws.** Exactly one `Random() % 100` draw selects
Magnitude 4/5/6/7/8/9/10 with thresholds
5/15/35/65/85/95/100 and powers 10/30/50/70/90/110/150. The handler prepares
the displayed magnitude number, selects the first non-attacker/non-absent
target, and advances
(`reference/pokeemerald/src/battle_script_commands.c:8670-8711`).
The entry runs cancel/string/PP, `selectfirstvalidtarget`, the magnitude
handler, pause/print/wait, then the Earthquake all-target loop
(`reference/pokeemerald/data/battle_scripts_1.s:1683-1692`).

That loop performs cleanup; the `STATUS3_UNDERGROUND` test; hit-marker and
damage-multiplier set/clear; accuracy, crit, dynamic-power damage, type and
normal adjustment; animation/controllers/messages/faint; `MOVEEND_NEXT_TARGET`;
`jumpifnexttargetvalid`; and `end`, with a parallel miss branch
(`reference/pokeemerald/data/battle_scripts_1.s:1839-1880`). A normal singles
hit therefore consumes four draws: one magnitude-table, one accuracy, one
crit, and one damage variance; a Focus Band target adds its activation draw.

**Committed path, state, census, and staging.** `selectfirstvalidtarget` is
already source-shaped, and `jumpifnexttargetvalid` falls through in singles
while explicitly barriering doubles (`src/engine/battleScriptTargetIterationOpcode.ts:
59-124`). Underground, hit-marker, `sDMG_MULTIPLIER`, dynamic power, and the
shared hit tail are registered. `dynamicBasePower` and `animTurn` own the
handler's rules writes (`src/engine/battleScriptRulesContext.ts:570-574,
760-761`). The raw magnitude number buffer is not a rules owner; if exact
message substitution is part of acceptance it must be added rather than
silently emitting an empty-substitution message. Confirm the census
attribution under its existing message-port policy.

Use `FRONTIER_MON_BARBOACH`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
388-395`); Barboach has only Oblivious
(`reference/pokeemerald/src/data/pokemon/species_info.h:8999-9024`).

### 3.5 `B_SCR_OP_MAXATTACKHALVEHP` / `EFFECT_BELLY_DRUM`

**Source semantics and draws.** Compute half max HP, clamped to one. If Attack
is below `MAX_STAT_STAGE` and current HP is strictly greater than that cost,
set Attack directly to maximum, set positive `gBattleMoveDamage` to the same
half-max-HP cost (also clamped to one), and fall through; otherwise jump to
failure. No RNG is drawn
(`reference/pokeemerald/src/battle_script_commands.c:8785-8807`).

The full script is cancel/string/PP,
`maxattackhalvehp BattleScript_ButItFailed`,
`orword ... HITMARKER_IGNORE_SUBSTITUTE`, animation/wait,
`healthbarupdate BS_ATTACKER`, `datahpupdate BS_ATTACKER`, direct success
message/wait, and move end (`reference/pokeemerald/data/battle_scripts_1.s:
1776-1789`). Every opcode and operand after the missing handler is accepted.
`statStages`, `hp`, `maxHP`, `battleMoveDamage`, and the attacker HP/controller
path already exist (`src/engine/battleScriptRulesContext.ts:188-200,249-253,
302-333,570`; `src/engine/battleScriptHitChainOpcode.ts:2023-2149`).

**Census and staging.** Confirm the census attribution. Pin exact-half failure,
half-plus-one success, max-stage failure, odd/even max HP, and HP/party sync.
The only Factory carriers are `FRONTIER_MON_POLIWRATH_2` and
`FRONTIER_MON_SNORLAX_8`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
2572-2577,5792-5797`); both species have two abilities
(`reference/pokeemerald/src/data/pokemon/species_info.h:1869-1894,
4299-4324`). Under the required single-ability-species rule, honest
Factory-legal staging is unavailable; use pure source-shaped fixtures.

### 3.6 `B_SCR_OP_METRONOME` / `EFFECT_METRONOME`

**Source semantics and exact draw count.** Because `MOVES_COUNT` is 355, each
candidate draw is `(Random() & 0x1FF) + 1`; values 355-512 are rejected.
Valid IDs are then rejected if they are Metronome, Struggle, Sketch, Mimic,
Counter, Mirror Coat, Protect, Detect, Endure, Destiny Bond, Sleep Talk,
Thief, Follow Me, Snatch, Helping Hand, Covet, Trick, or Focus Punch. Each
rejection restarts the outer loop and consumes exactly one additional draw.
The accepted candidate clears `HITMARKER_ATTACKSTRING_PRINTED`, replaces
`gCurrentMove`, jumps directly to that move effect's script, and retargets
through `GetMoveTarget`; there is no fixed upper bound on draw count
(`reference/pokeemerald/src/battle_script_commands.c:721-746,7885-7923`;
`reference/pokeemerald/include/constants/moves.h:360`).

The entry itself is cancel/string, pause, animation/wait, zero
`sB_ANIM_TURN`/`sB_ANIM_TARGETS_HIT`, then `metronome`
(`reference/pokeemerald/data/battle_scripts_1.s:1147-1157`). Those fixed
opcodes and operands are accepted.

**Honest dynamic barrier shape.** The engine already has source-derived move
effect and target lookup and a direct dynamic effect jump for Sleep Talk
(`src/engine/battleScriptRulesContext.ts:988-1044`;
`src/engine/battleScriptSleepTalkOpcode.ts:294-358`). That is reusable
machinery, but it does not make every destination executable. A Metronome
handler must:

1. implement the rejection loop with one attributed RNG draw per candidate;
2. update current move/effect/power and target, including target-selection RNG
   where `GetMoveTarget` requires it;
3. jump without pushing a return address;
4. accept a selected effect only when that effect's **entire** opcode and
   operand path is registered; otherwise return a named dynamic-effect
   barrier that records the selected move/effect; and
5. keep the census row blocked while any legal selectable destination can
   hit an unregistered opcode/operand or unmodeled required subsystem.

The current census intentionally treats a registered dynamic dispatcher as
executable and leaves each destination to its own row
(`tools/report/executable-frontier-census.ts:440-489`). That policy is
reasonable for Sleep Talk's row accounting but makes “one-opcode Metronome
flip” semantically false. Registering the opcode today would mechanically add
**+1 effect / +1 move / +1 distinct / +2 weighted** even though many legal
draws still jump into the census's 46 blocked effects and several
“executable” rows retain registered operand/runtime barriers.

**Staging.** `FRONTIER_MON_CLEFFA` is a legal single-ability carrier
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
122-129`; `reference/pokeemerald/src/data/pokemon/species_info.h:5199-5224`).
Controlled seeds must prove invalid-ID rejection, forbidden-move rejection,
one accepted direct-hit effect, one accepted status effect, retargeting, and
one honest dynamic barrier. This is evidence for the handler, not permission
to flip the census row.

### 3.7 `B_SCR_OP_PAINSPLITDMGCALC` / `EFFECT_PAIN_SPLIT`

**Source semantics and draws.** If the target has no Substitute, compute the
floor average of attacker and target current HP. Store
`target.hp-average` in the four-byte `painSplitHp` scratch, leave
`gBattleMoveDamage=attacker.hp-average`, set the target's `shellBellDmg` to
`IGNORE_SHELL_BELL`, and advance; Substitute jumps to failure. No RNG is
drawn (`reference/pokeemerald/src/battle_script_commands.c:8049-8071`).

The script performs cancel/string/PP, a no-random
`accuracycheck ... NO_ACC_CALC_CHECK_LOCK_ON`, Pain Split calculation,
animation/wait, sets `HITMARKER_IGNORE_SUBSTITUTE`, applies the first
health/data update to `BS_ATTACKER`, copies
`sPAINSPLIT_HP` back to `gBattleMoveDamage`, applies the second update to
`BS_TARGET`, prints, and moves end
(`reference/pokeemerald/data/battle_scripts_1.s:1239-1255`). Total
effect-local and script RNG is zero.

**Committed path and state.** HP/max HP, signed `battleMoveDamage`,
health/data updates for both battlers, and the ignore-Substitute marker exist.
But the handler has no `painSplitHp` or `shellBellDmg` owner
(`src/engine/battleScriptRulesContext.ts:188-260,560-620`), and the registered
`copyarray` explicitly rejects
`(gBattleMoveDamage,sPAINSPLIT_HP,0x4)`
(`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:149-245`). The
`shellBellDmg` write is functional, not cosmetic: it prevents the later Shell
Bell consumer from healing on Pain Split
(`reference/pokeemerald/src/battle_util.c:3787-3802`).

**Census and staging.** Correct the census attribution: this needs the opcode,
both scratch owners, and the exact copy tuple. Use
`FRONTIER_MON_MISDREAVUS_1`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
2621-2628`); Misdreavus has only Levitate
(`reference/pokeemerald/src/data/pokemon/species_info.h:6009-6034`).
Pin both HP orderings, odd-sum floor, equal HP, Substitute failure, clamping,
and Shell Bell suppression.

### 3.8 `B_SCR_OP_STOCKPILE*` / Stockpile, Swallow, and Spit Up

**Shared source state.** `stockpile` fails at counter 3 (missed flag plus
`B_MSG_CANT_STOCKPILE`), otherwise increments the counter, prepares its number,
and chooses `B_MSG_STOCKPILED`
(`reference/pokeemerald/src/battle_script_commands.c:6850-6866`).
`stockpiletobasedamage` fails at zero; otherwise, unless the move was
Protected, it calculates ordinary base damage times counter, writes
`animTurn`, applies Helping Hand, then always clears the counter
(`reference/pokeemerald/src/battle_script_commands.c:6868-6892`).
`stockpiletohpheal` fails at zero, or clears the counter and fails at full HP;
otherwise it heals maxHP/8, /4, or /2 for counters 1, 2, or 3 (minimum one),
writes `animTurn`, retargets the attacker, and clears the counter
(`reference/pokeemerald/src/battle_script_commands.c:6894-6922`). These
handlers draw no RNG.

The three full scripts are:

- Stockpile: cancel/string/PP, `stockpile`, animation/wait,
  `printfromtable gStockpileUsedStringIds`, wait, move end
  (`reference/pokeemerald/data/battle_scripts_1.s:2083-2092`).
- Spit Up: cancel; Protected prebranch; string/PP/accuracy;
  `stockpiletobasedamage`; type/`adjustsetdamage`; shared animation/HP/faint
  tail; with pause/print failure and Protected result-message branches
  (`reference/pokeemerald/data/battle_scripts_1.s:2094-2117`).
- Swallow: cancel/string/PP, `stockpiletohpheal`, then the registered heal
  tail; failure pauses, uses `printfromtable gSwallowFailStringIds`, waits,
  and moves end (`reference/pokeemerald/data/battle_scripts_1.s:2119-2129`).

Stockpile and Swallow consume zero draws. An ordinary Spit Up hit consumes
one accuracy draw and the zero-byte `seteffectwithchance` draw in the shared
animation tail; `adjustsetdamage` has no variance draw, but a Focus Band
target adds one activation draw
(`reference/pokeemerald/src/battle_script_commands.c:5861-5899`;
`src/engine/battleScriptHitChainOpcode.ts:1800-1826`).

**Committed paths, operands, and state.** HP/max HP, dynamic damage,
`animTurn`, Helping Hand, target reassignment, and the ordinary hit/heal tails
exist. The shared `stockpileCounter` does not; the current faint cleanup
explicitly lists it among untracked DisableStruct fields
(`src/engine/battleScriptHitChainOpcode.ts:3639-3662`). It needs a battler
owner and must clear on ordinary switch, faint, **and** Baton Pass: source
zeros the whole DisableStruct on switch and Baton Pass restores only
Substitute, sure-hit identity, Perish timers, and escape-preventer identity,
not Stockpile (`reference/pokeemerald/src/battle_main.c:3152-3217`).
Stockpile's displayed count also needs a typed numeric buffer.

Two additional operand barriers are hidden behind registered
`printfromtable`: neither `gStockpileUsedStringIds` nor
`gSwallowFailStringIds` is in `PRINTFROMTABLE_TABLES`
(`src/engine/battleScriptHitChainOpcode.ts:274-423,3314-3353`), while source
defines both two-entry tables
(`reference/pokeemerald/src/battle_message.c:981-997`). Spit Up has no
parallel table-operand gap.

**Census and staging.** Correct all three sole-opcode attributions: implement
them as one counter subsystem and add both table operands before flipping any
row whose full branch reaches one. `FRONTIER_MON_PELIPPER_1` gives a
single-ability Stockpile+Swallow carrier
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
1494-1501`; `reference/pokeemerald/src/data/pokemon/species_info.h:
8609-8634`). The sole Spit Up carrier is `FRONTIER_MON_SWALOT_1`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
1739-1746`), whose abilities are Liquid Ooze and Sticky Hold
(`reference/pokeemerald/src/data/pokemon/species_info.h:10349-10374`);
therefore Spit Up is honestly unstageable under the single-ability-species
rule and needs pure source-shaped tests.

### 3.9 `B_SCR_OP_TRYSETGRUDGE` / `EFFECT_GRUDGE`

**Source semantics and draws.** If the attacker already has `STATUS3_GRUDGE`,
jump to failure; otherwise set the bit and advance. No RNG is drawn
(`reference/pokeemerald/src/battle_script_commands.c:9454-9466`). The entry
is cancel/string/PP, setter, animation/wait, direct message/wait, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:2532-2542`); every opcode and
operand after the missing setter is accepted.

The bit is intentionally short-lived: the next attack-canceler flags phase
clears it (`reference/pokeemerald/src/battle_util.c:2008-2014`), which the
engine already models (`src/engine/battleScriptActionAdmission.ts:
1235-1260`). If a Grudge-marked target faints from an opposing non-Struggle
move while the attacker lives, `tryfaintmon` zeros the attacker's chosen
move PP, emits the controller PP write, prepares the move name, and calls
`BattleScript_GrudgeTakesPP`
(`reference/pokeemerald/src/battle_script_commands.c:3027-3048`;
`reference/pokeemerald/data/battle_scripts_1.s:3662-3667`).

**State, census, and staging.** `status3`, active PP, chosen move position,
and a typed `set-battler-pp-data` event exist
(`src/engine/battleScriptRulesContext.ts:188-207,587-590`;
`src/engine/battleScriptEvents.ts:118-128`). The consumer does not: the engine
has an exact unsupported branch at the same source condition
(`src/engine/battleScriptHitChainOpcode.ts:3586-3598`). Its move-name
substitution must also be represented. Correct the census attribution: setter
registration alone is not full behavior.

Use `FRONTIER_MON_SHEDINJA`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
150-157`); Shedinja has only Wonder Guard
(`reference/pokeemerald/src/data/pokemon/species_info.h:8399-8424`).
Acceptance needs duplicate failure, next-action clearing, normal KO PP zero,
same-side/Struggle/dead-attacker exclusions, and controller/message handoff.

### 3.10 `B_SCR_OP_TRYSPITEPPREDUCE` / `EFFECT_SPITE`

**Source semantics and draws.** Spite requires a real last move, finds its
slot in the target's current moves, and requires PP greater than one. Only
then it draws `(Random() & 3) + 2`, clamps the deduction to current PP,
prepares the move and number buffers, subtracts active PP, and emits a
persistent PP controller write unless the slot is mimicked or the target is
Transformed. Reaching zero cancels the target's multi-turn move. Every
failure takes the pointer without the PP draw
(`reference/pokeemerald/src/battle_script_commands.c:8318-8364`).

The script is cancel/string/PP, ordinary 100-accuracy check,
`tryspiteppreduce BattleScript_ButItFailed`, animation/wait, direct
`STRINGID_PKMNREDUCEDPP` print/wait, and move end
(`reference/pokeemerald/data/battle_scripts_1.s:1349-1360`;
`reference/pokeemerald/src/data/battle_moves.h:2343-2353`). Thus a valid
success consumes two draws (accuracy, then deduction); an invalid-last-move,
missing-slot, or PP<=1 failure consumes only the accuracy draw.

**Committed path and state.** `lastMoves`, active moves/PP,
`STATUS2_TRANSFORMED`, `CancelMultiTurnMoves`, and a PP-controller event
already exist (`src/engine/battleScriptRulesContext.ts:188-207,500-510`;
`src/engine/battleScriptMultiTurnCancellation.ts:42-99`;
`src/engine/battleScriptEvents.ts:118-128`). What is absent is
`gDisableStructs[].mimickedMoves`, the party-level PP mirror/persistence, and
typed prepared-move/prepared-number substitutions; the party model carries
moves but no PP (`src/engine/battleScriptRulesContext.ts:437-462`), and the
existing end-turn code states that no party PP mirror exists
(`src/engine/battleEndTurnOrchestration.ts:1099-1105`).

**Census and staging.** Correct the sole-opcode attribution: the active
decrement can be implemented immediately, but exact persistent behavior
needs the named owners. Use `FRONTIER_MON_HAUNTER_1`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
1256-1263`); Haunter has only Levitate
(`reference/pokeemerald/src/data/pokemon/species_info.h:2799-2824`).
Pin all failure gates, deduction results 2-5, clamp-to-current, zero-PP
multi-turn cancellation, mimicked/Transformed no-persistence, party PP, and
the emitted event.

### 3.11 `B_SCR_OP_DAMAGETOHALFTARGETHP` / `EFFECT_SUPER_FANG`

**Source semantics and draws.** Set damage to floor(target current HP / 2),
clamped to one, then advance. No opcode-local RNG
(`reference/pokeemerald/src/battle_script_commands.c:7577-7585`). The entry
performs cancel, ordinary accuracy, string/PP, type calculation, clears
super/not-very-effective flags, invokes the handler, and enters
`BattleScript_HitFromAtkAnimation`
(`reference/pokeemerald/data/battle_scripts_1.s:809-818`). With Super Fang's
90 accuracy and zero secondary chance, the full success consumes exactly two
draws: accuracy and the shared tail's zero-byte `seteffectwithchance`
(`reference/pokeemerald/src/data/battle_moves.h:2109-2119`).

**Committed path, state, census, and staging.** All surrounding opcodes,
flag-mask operands, and `BS_TARGET` HP/controller operands are accepted.
`battleMoveDamage`, current HP, and the shared update path already own every
write. Confirm the census attribution. The only Factory carrier is
`FRONTIER_MON_RATICATE_2`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
2117-2122`), and Raticate has Run Away plus Guts
(`reference/pokeemerald/src/data/pokemon/species_info.h:609-634`), so this is
honestly unstageable under the single-ability-species rule. Pure tests should
pin HP 1/2/odd/even, immunity/type flags, miss, and terminal faint behavior.

### 3.12 `B_SCR_OP_HIDDENPOWERCALC` / `EFFECT_HIDDEN_POWER`

**Source semantics and draws.** The second-lowest bit of each IV builds a
six-bit power value, giving `(40 * bits) / 63 + 30`; the low bit of each IV
builds a six-bit type value, scaled across all types except Normal and
Mystery. The result writes `gDynamicBasePower` and
`dynamicMoveType | F_DYNAMIC_TYPE_IGNORE_PHYSICALITY |
F_DYNAMIC_TYPE_SET`. No RNG is drawn
(`reference/pokeemerald/src/battle_script_commands.c:8889-8920`). The entry
is exactly `hiddenpowercalc; goto BattleScript_EffectHit`
(`reference/pokeemerald/data/battle_scripts_1.s:1740-1742`), so an ordinary
hit adds the four shared draws in §2.1 and zero opcode-local draws.

**Committed path and state.** `dynamicBasePower`, `dynamicMoveType`, the
source-derived move type resolver, damage calculation, and per-action reset
already exist (`src/engine/battleScriptRulesContext.ts:570-574,617-620,
1016-1044`; `src/engine/battleActionFinished.ts:140-153`). The battler state
has no `hpIV`, `attackIV`, `defenseIV`, `speedIV`, `spAttackIV`, or
`spDefenseIV`; its source stat inputs stop at ordinary battle stats,
personality, level, friendship, and max HP
(`src/engine/battleScriptRulesContext.ts:270-333`). Deriving IV bits backward
from rounded battle stats would be ambiguous and is not source-equivalent.

**Census and staging.** Correct the sole-opcode attribution: add six exact IV
owners (or one source-shaped six-IV tuple) before flipping. Use
`FRONTIER_MON_UNOWN`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:
885-892`); Unown has only Levitate
(`reference/pokeemerald/src/data/pokemon/species_info.h:6039-6064`).
Pin all-zero/all-31 IVs, Mystery-skip boundaries, nonuniform IVs, physicality
override, and zero RNG.

## 4. Ordered main-lane batches and exact census predictions

All predictions start from the committed **168/214, 303/355, 246/276,
2845/2957** baseline above. They count a row only after its full committed
path and the hidden operands/consumers named in §3 are live. The current
generator would mechanically flip earlier if a missing opcode were merely
registered; that is the false positive this plan avoids.

### Batch 1 — direct arithmetic and bounded target loops

Implement Eruption/Water Spout, Teeter Dance, Magnitude, Belly Drum, Super
Fang, and Hidden Power. Hidden Power adds exact IV inputs; the others reuse
existing HP/stat/dynamic-power/target-loop owners.

- Acceptance: every arithmetic boundary and draw count; every Teeter branch;
  Magnitude's seven buckets plus Underground; exact IV power/type boundaries;
  full committed-script terminal walks in singles. No new `(b)` barrier.
- Exact flip: **+6 effects / +7 moves / +7 Factory distinct / +10 weighted**.
- New cumulative census: **174/214, 310/355, 253/276, 2855/2957**.

If the IV input plumbing makes the cap tight, land the first five effects for
**+5/+6/+6/+9** and leave Hidden Power's opcode unregistered.

### Batch 2 — volatile status and PP consumers

Implement Perish Song, Grudge, and Spite as complete producer/consumer slices:
Perish setup + Soundproof operand + end-turn/faint/switch/Baton Pass lifetime;
Grudge setter + faint hook; Spite active/persistent PP, mimicked/Transformed
gate, cancellation, and typed substitutions.

- Acceptance: the already-banked OFF Perish setup/countdown receipt plus
  Tier-1 Soundproof/all-affected/terminal/switch tests; Grudge's exclusions
  and PP-zero controller handoff; Spite draw/clamp/persistence/cancellation.
- Exact flip: **+3 effects / +3 moves / +3 Factory distinct / +8 weighted**.
- New cumulative census: **177/214, 313/355, 256/276, 2863/2957**.

These share volatile lifetime and PP-controller ownership; if split is
necessary, Perish alone is **+1/+1/+1/+4**, and Grudge+Spite are
**+2/+2/+2/+4**.

### Batch 3 — shared scratch/counter state

Implement Pain Split plus Stockpile/Swallow/Spit Up. Add `painSplitHp`,
Shell-Bell suppression, the exact copy tuple, the Stockpile counter and its
lifetime, both print-table operands, and typed number substitutions.

- Acceptance: Pain Split both HP directions/Substitute/Shell Bell; counter
  0/1/2/3, fourth-Stockpile failure, every Swallow heal/full-HP branch,
  Spit Up success/Protect/miss/failure, switch/faint lifetime; full scripts.
- Exact flip: **+4 effects / +4 moves / +4 Factory distinct / +7 weighted**.
- New cumulative census: **181/214, 317/355, 260/276, 2870/2957**.

### Metronome gate — deliberately no flip in these batches

Metronome may gain a source-exact selector and honest dynamic barrier in any
batch, but its row should remain blocked. Its eventual, separate flip is
**+1 effect / +1 move / +1 Factory distinct / +2 weighted**, reaching
**182/214, 318/355, 261/276, 2872/2957**, only after the whole legal
selectable effect universe is executable or the acceptance definition is
explicitly narrowed. Under the present full-frontier mission, that is an
end-of-universe gate, not a bounded single-opcode registration.

## 5. Final falsification ledger

| Effect(s) | Dispatch-only flip honest? | Additional blocker that must be named |
| --- | --- | --- |
| Perish Song | no | Soundproof selector/value; timer/start value; end-turn countdown/faint; switch/Baton Pass lifetime |
| Eruption / Water Spout | yes | none beyond already-counted generic registered barriers |
| Teeter Dance | yes in singles | exact array-equal tuple; doubles replay remains out of scope |
| Magnitude | yes in singles | typed displayed-number substitution for exact presentation; doubles scan out of scope |
| Belly Drum | yes | no single-ability Factory carrier |
| Metronome | no | unbounded rejection draws; retargeting; dynamic jump into the entire selectable effect universe |
| Pain Split | no | `painSplitHp`; Shell Bell suppression; `copyarray` tuple |
| Stockpile | no | counter/lifetime; numeric buffer; `gStockpileUsedStringIds` operand |
| Swallow | no | counter/lifetime; `gSwallowFailStringIds` operand |
| Spit Up | no | counter/lifetime; no single-ability Factory carrier |
| Grudge | no | `tryfaintmon` PP-zero/faint hook and move-name substitution |
| Spite | no | `mimickedMoves`; party PP persistence; move/number buffers |
| Super Fang | yes | no single-ability Factory carrier |
| Hidden Power | no | six exact IV inputs |

The safe immediate census gain is Batch 1's six effects:
**+6 effects / +7 moves / +7 Factory distinct / +10 weighted**. Across all
three bounded batches, every target except Metronome can honestly add
**+13 effects / +14 moves / +14 Factory distinct / +25 weighted**. Metronome's
mechanical +1 row must not be used to hide the still-blocked dynamic
destinations.
