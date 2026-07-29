# ON_DAMAGE contact-family scout

**Frozen scout status — 2026-07-28 22:07 PDT, branch baseline `5b02a2e8`.**
This is source/oracle evidence for the next implementation step, not a claim
that production behavior changed. At scout time `Cmd_moveend` state
`MOVEEND_ON_DAMAGE_ABILITIES` is already registered in
`src/engine/battleScriptMoveEndOpcode.ts:45,312-325`, but every one of the
seven real target-ability cases stops at its existing `unsupported-branch`
(`:315-323`). The repository grep has no other production
`ABILITYEFFECT_ON_DAMAGE` implementation. No new opcode or moveend state is
needed: the implementation is the body of already-registered state 3.

This scout added no `src/` code and did not alter the census generator.

## 1. Source ground truth

### Shared gate and substitute consequence

The only caller is `Cmd_moveend` state 3:
`reference/pokeemerald/src/battle_script_commands.c:4210-4238,4280-4284`
calls
`AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)`
and increments `moveendState` whether or not a script was queued. The
dispatcher is `reference/pokeemerald/src/battle_util.c:2749-2872`.

Every real member requires `!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)` and
`TARGET_TURN_DAMAGED`. The latter is exactly either nonzero
`gSpecialStatuses[gBattlerTarget].physicalDmg` or `.specialDmg`
(`include/battle.h:469`). This is stronger than “the accuracy check passed”:
the hit must have recorded real battler damage. A Substitute suppresses this
family. `Cmd_datahpupdate`'s Substitute branch changes only substitute HP
(`battle_script_commands.c:1862-1892`); the physical/special trackers are
written only in the real-HP branch (`:1935-1958`), so
`TARGET_TURN_DAMAGED` stays false.

The status procs set `MOVE_EFFECT_AFFECTS_USER`, so `SetMoveEffect` selects
`gBattlerAttacker` as `gEffectBattler` (`battle_script_commands.c:2240-2250`).
Shield Dust and Safeguard do **not** block these ability statuses because the
dispatcher sets `HITMARKER_STATUS_ABILITY_EFFECT` (`:2253-2259`). The
attacker must still be alive (`:2261-2264`) and status-able:

- sleep requires `status1 == 0`, no active non-Soundproof Uproar, and neither
  Vital Spirit nor Insomnia (`:2273-2298`);
- poison requires neither Poison nor Steel type, `status1 == 0`, and not
  Immunity (`:2299-2340`);
- burn requires non-Fire type, `status1 == 0`, and not Water Veil
  (`:2341-2379`);
- paralysis requires `status1 == 0` and not Limber (`:2395-2425`).

On success, `SetMoveEffect` ORs the selected status bit into the **attacker's**
`status1` (`:2476-2488`; bit mapping at `:608-615`). Sleep additionally draws
`(Random() & 3) + 2` for its duration. A failed status eligibility check
happens after the ability's proc roll; it does not refund that draw.

### Per-member table

| Member | Exact additional conditions and RNG | Mutation and queued script |
| --- | --- | --- |
| `COLOR_CHANGE` | No contact requirement. Move is not Struggle, power is nonzero, target does not already have the resolved move type, and target survives (`battle_util.c:2752-2758`). No RNG. | `SET_BATTLER_TYPE` writes both target type slots to `moveType` (`include/battle.h:472-476`), prepares the type text, and queues `BattleScript_ColorChangeActivates` (`battle_util.c:2760-2764`; script `battle_scripts_1.s:4179-4182`). |
| `ROUGH_SKIN` | Attacker survives, hit was not confusion self-damage, move has `FLAG_MAKES_CONTACT`; target survival is **not** required (`battle_util.c:2767-2773`). No RNG. | `gBattleMoveDamage = floor(attacker.maxHP / 16)`, minimum 1, then `BattleScript_RoughSkinActivates` (`:2774-2779`). The script ignores Substitute for the passive update, damages the attacker, prints, and may faint it (`battle_scripts_1.s:4184-4191`). |
| `EFFECT_SPORE` | Attacker survives, not confusion self-damage, contact, then exact trigger `(Random() % 10) == 0` (`battle_util.c:2782-2788`). On a hit, repeatedly draws `Random() & 3` until nonzero (`:2790-2794`): 1 sleep, 2 poison, 3 is converted from burn to paralysis (`:2795-2799`). Sleep later draws its duration. | Sets affects-user effect byte and status-ability hit marker, queues `BattleScript_ApplySecondaryEffect` (`:2799-2803`; script `battle_scripts_1.s:4199-4202`), which reaches the attacker `status1` checks/writes above. |
| `POISON_POINT` | Attacker survives, not confusion self-damage, contact, exact `(Random() % 3) == 0` (`battle_util.c:2806-2813`). | Sets affects-user poison plus status-ability marker and queues `BattleScript_ApplySecondaryEffect` (`:2814-2818`); resulting bit is `STATUS1_POISON` on the attacker if eligible. |
| `STATIC` | Attacker survives, not confusion self-damage, contact, exact `(Random() % 3) == 0` (`battle_util.c:2821-2827`). | Sets affects-user paralysis plus marker and queues `BattleScript_ApplySecondaryEffect` (`:2829-2833`); resulting attacker `status1` is `STATUS1_PARALYSIS` if eligible. |
| `FLAME_BODY` | Attacker survives, not confusion self-damage, contact, exact `(Random() % 3) == 0` (`battle_util.c:2836-2842`). | Sets affects-user burn plus marker and queues `BattleScript_ApplySecondaryEffect` (`:2844-2848`); resulting attacker `status1` is `STATUS1_BURN` if eligible. |
| `CUTE_CHARM` | Attacker and target survive, not confusion self-damage, contact, exact `(Random() % 3) == 0`, then attacker is not Oblivious, genders differ, attacker is not already infatuated, and neither gender is genderless (`battle_util.c:2851-2863`). Because of C short-circuit order, the roll occurs **before** the Oblivious/gender/already-infatuated tests. | ORs `STATUS2_INFATUATED_WITH(gBattlerTarget)` into the attacker and queues `BattleScript_CuteCharmActivates` (`:2864-2868`; script `battle_scripts_1.s:4193-4197`). |

`FLAG_MAKES_CONTACT` is bit 0 of the source `BattleMove.flags` byte
(`include/constants/pokemon.h:207-213`; struct field
`include/pokemon.h:327-338`). Generated `src/data/gen/moves.json` already
preserves it as the string member of each row's `flags` array (for example
Pound id 1 has it; Swift id 129 does not). Production has two partial
surfaces today: `battleScriptHitChainOpcode.ts:109-120,755-760` privately
loads string flags, while the shared
`battleScriptRulesContext.ts:1106-1112,1203-1209` numeric resolver exposes
only `FLAG_MIRROR_MOVE_AFFECTED` and therefore currently drops contact.
State 3 can reuse/extend source-derived move data; no new generated field is
needed.

### Why Oblivious appears as the census's eighth member

There are seven switch cases, not eight. `ABILITY_OBLIVIOUS` occurs inside
Cute Charm's condition at `battle_util.c:2859`, which is why the lexical
census assigns it to the `ABILITYEFFECT_ON_DAMAGE` member set. It needs only
the Cute Charm eligibility check; it has no proc, mutation, or script of its
own in this dispatcher.

Oblivious separately is a genuine member of the **next** dispatcher,
`ABILITYEFFECT_IMMUNITY`: an infatuated Oblivious battler has the infatuation
bits cleared and queues `BattleScript_AbilityCuredStatus`
(`battle_util.c:2922-2951`; script `battle_scripts_1.s:4215-4218`). That
moveend state is already represented in production, and Attract's opcode
also has its own Oblivious prevention (`battle_script_commands.c:7676-7680`).
The ON_DAMAGE implementation should not invent an eighth branch.

## 2. Call position and RNG ledger

The normal hit chain's four attributed rolls are accuracy, critical,
normal-damage adjustment, and move effect chance. `BattleScript_MoveEnd`
reaches state 3 only after that chain. Therefore a qualifying probabilistic
ON_DAMAGE target consumes its proc roll immediately **after** those four,
before the other battler's move begins.

Using the positional frame in `docs/ability-item-speed-scout.md:465-490`
without renumbering its recorded observations:

- that fixture's first Pound owns positions 1-4, then its recorded clean
  turn-boundary draw is position 5;
- if the Pound target had Static/Poison Point/Flame Body/Cute Charm/Effect
  Spore, the new family draw would be inserted between those facts: after
  recorded positions 1-4 and before the draw currently recorded at position
  5 (which would consequently shift in the modified fixture);
- for two damaging moves in one turn, the order is first hit's four rolls,
  its ON_DAMAGE roll, second hit's four rolls, its ON_DAMAGE roll, then the
  turn-boundary draw. Deterministic Rough Skin/Color Change queue in those
  same seams but draw nothing.

The source ordering is also visible directly in `Cmd_moveend`: synchronize
target state 2, ON_DAMAGE state 3, immunity state 4, synchronize attacker
state 5 (`battle_script_commands.c:4275-4295`).

## 3. Fixture matrix and recipes

The carriers below are real Level-50 corpus entries from
`src/data/gen/battle-frontier-mons.json`; their species rows in
`src/data/gen/species-stats.json` show slot 0 as the named ability and slot 1
as `ABILITY_NONE`.

| Ability | L50 carrier (index; species index / slots) | Contact stimulus | Non-contact/control | RNG delta against control |
| --- | --- | --- | --- | --- |
| Static | `FRONTIER_MON_PIKACHU` (66; 25 / Static,None) | status-able Swellow uses Pound | Swift | qualifying contact is +1 whether the proc succeeds or fails |
| Poison Point | `FRONTIER_MON_NIDORAN_M` (46; 32 / Poison Point,None) | non-Poison/non-Steel, status-free male Swellow uses Pound | Swift | +1 |
| Cute Charm | `FRONTIER_MON_SKITTY` (36; 315 / Cute Charm,None), fixed female | surviving male Swellow, no Oblivious/infatuation, uses Pound | Swift | +1; success adds no further RNG |
| Effect Spore | `FRONTIER_MON_SHROOMISH` (61; 306 / Effect Spore,None) | status-free Swellow uses Pound | Swift | no-proc +1; proc adds `k >= 1` selection draws, plus one duration draw if sleep was selected |
| Flame Body | `FRONTIER_MON_MAGBY` (149; 240 / Flame Body,None) | non-Fire, non-Water-Veil, status-free Swellow uses Pound | Swift | +1 |
| Rough Skin | `FRONTIER_MON_CARVANHA` (86; 330 / Rough Skin,None) | surviving Swellow uses Pound | Swift | 0 vs 0; assert attacker loses `max(1,floor(maxHP/16))` only for contact |
| Color Change | `FRONTIER_MON_KECLEON_1` (220; 317 / Color Change,None) | Fighting contact move (Karate Chop) changes Normal Kecleon to Fighting | Normal non-contact Swift leaves already-Normal Kecleon unchanged | 0 vs 0 |

For every recipe, stage three complete L50 records per side with IVs/EVs,
four moves, PP Ups, item, slot, friendship, gender, shiny and (when gender
matters) an exact compatible personality. Use only species whose second
ability slot is `ABILITY_NONE`; make all six speeds strictly unequal; give
all four active-opponent move slots the same dispatch-safe move. Do not use
Voltorb/Electrode, Slugma/Magcargo, Qwilfish, Electrike/Manectric, or Roselia:
their second real ability would invoke the Factory AI's unconditional
Soundproof `get_ability` prologue and shift the ledger.

For the five random families, compare a fresh contact fixture with the same
seed and a Swift control, and assert the proc roll appears after that hit's
effect-chance roll. Status assertions are on the **attacker**, never the
carrier. For Cute Charm fix opposite genders; for status families choose the
attacker type/ability/status to pass `SetMoveEffect`; for Rough Skin record
max HP before the hit; for Color Change use a move type different from both
current target types.

### Live Static representative

Committed fixture:
`tools/battle-lab/mechanic-on-damage-static-off.json`, explicitly
Battle Scene OFF. It stages:

- player active Swellow (species 305, Guts/None), Hardy IV31/EV0, speed 145,
  four Pounds;
- opponent active female Pikachu (species 25, Static/None), speed 110, four
  Swifts;
- single-ability benches with unique speeds 85, 65, 50, and 25.

The run used `sRandCount` plus the targeted LR single-step method from
`tools/probe/attribute-factory-ai-random-callers.py` (pipelined
`cpu.pc == Random + 2`). Fast count and single-step reconciled 5/5:

| Position | Frame | Caller | Meaning |
| ---: | ---: | --- | --- |
| 1 | 42 | `Cmd_accuracycheck+0x305` | Pound accuracy |
| 2 | 64 | `Cmd_critcalc+0x127` | Pound critical |
| 3 | 67 | `Cmd_adjustnormaldamage+0x7` | Pound damage adjustment |
| 4 | 195 | `Cmd_seteffectwithchance+0x81` | Pound effect chance |
| **5** | **198** | **`AbilityBattleEffects+0xe39`** | **Static `(Random() % 3) == 0`** |

The one clean run **did proc**. Pikachu survived at 61/110 HP and the
attacker's RAM `status1` became `0x40` (paralysis). The trace intentionally
holds on that resulting status message, so no later opponent/turn-boundary
draw muddies the central five-draw window.

Mechanical checks:

```sh
python3 tools/probe/verify-on-damage-static.py

out_dir="$(mktemp -d /tmp/on-damage-static-verify.XXXXXX)"
python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/verify-on-damage-static.py "$out_dir/result.json"
```

The first command verifies source, current barrier, generated contact data,
and fixture invariants. The wrapped command restages the OFF window and
asserts the exact five RNG frames, surviving target, and attacker paralysis.

## 4. Predicted census delta

The frozen census is 57/70 ability members and 977/1103 weighted L50
set-carriers. Implementing and naming the seven unreferenced rows flips:

`27 + 18 + 13 + 8 + 8 + 3 + 2 = 79`.

Prediction: **64/70 and 1056/1103**, with
`ABILITYEFFECT_ON_DAMAGE` moving from **1/8 to 8/8**. Oblivious is already
the referenced 1/8 and contributes no additional member or weight. This is a
reference-count prediction; semantic acceptance still requires the staged
behavior above.
