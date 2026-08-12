//! Singles `GetMostSuitableMonToSwitchInto`, ported from
//! `src/engine/battleAiSwitchInto.ts`.
//!
//! This is deliberately only the pure, RNG-free plain-singles branch of
//! `battle_ai_switch_items.c:629-790`: the canonical TypeScript module
//! already scopes out Arena, doubles, and multi-battle selection.  It keeps
//! both source passes intact.  Pass 1 has the documented counterintuitive
//! *largest* defensive type multiplier ordering plus a super-effective move
//! gate.  Pass 2 uses the still-active battler's `AI_CalcDmg` result as a
//! base for every bench move and preserves the non-`BUGFIX` `u8 bestDmg`
//! assignment wrap from the source.

use crate::damage_calc::{TYPE_FIGHTING, TYPE_GHOST, TYPE_GROUND, TYPE_NORMAL};
use crate::factory_ai_check_bad_move::ABILITY_LEVITATE;
use crate::gen_tables;

/// `PARTY_SIZE` (`include/constants/global.h:33`) and the source's no-choice
/// sentinel (`battle_ai_switch_items.c:635, :688, :753, :789`).
pub const PARTY_SIZE: usize = 6;
pub const PARTY_SIZE_SENTINEL: u8 = PARTY_SIZE as u8;

/// `TYPE_MUL_NORMAL` / `TYPE_MUL_NO_EFFECT`
/// (`include/battle_main.h:31-33`).
const TYPE_MUL_NORMAL: i32 = 10;
const TYPE_MUL_NO_EFFECT: i32 = 0;

/// `MOVE_NONE` and `MOVE_STRUGGLE` (`include/constants/moves.h:169`).
const MOVE_NONE: u16 = 0;
const MOVE_STRUGGLE: u16 = 165;

/// `STATUS2_FORESIGHT` (`include/constants/battle.h:153`).
const STATUS2_FORESIGHT: u32 = 1 << 29;

/// The two native type ids (`damage_calc::TYPE_*`) stored by the source in
/// `gBattleMons[].types` / `gSpeciesInfo[].types`.
pub type BattleAiSwitchTypes = [u8; 2];

/// The exact party fields the canonical TypeScript selector reads.  `hp` is
/// signed because this pure interface mirrors the TS number field's only
/// observable predicate (`hp !== 0`); real `MON_DATA_HP` values are `u16`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleAiSwitchBenchMember {
    pub species: u16,
    pub hp: i32,
    pub types: BattleAiSwitchTypes,
    /// `MON_DATA_MOVE1..4` (`MAX_MON_MOVES == 4`).
    pub moves: [u16; 4],
}

/// Plain-singles source scanning always operates over the complete six-slot
/// party, even when the Factory's battle party has only three members.
pub type BattleAiSwitchBench = [BattleAiSwitchBenchMember; PARTY_SIZE];

/// The active-battler inputs only needed once pass 1 asks for the damage
/// fallback.  `base_damage` is the caller's already-computed
/// `AI_CalcDmg(gActiveBattler, opposingBattler)` result, exactly as modeled
/// by `BattleAiSwitchDamageFallback` in the canonical TypeScript module.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleAiSwitchDamageFallback {
    pub base_damage: i32,
    pub active_types: BattleAiSwitchTypes,
    pub opposing_types: BattleAiSwitchTypes,
    /// Numeric `ABILITY_*`; only `ABILITY_LEVITATE == 26` affects this leaf.
    pub opposing_ability: u16,
    pub opposing_status2: u32,
}

/// Result of the TypeScript selector.  Without fallback inputs, pass 1 can
/// explicitly report that a caller must supply the active damage context.  If
/// fallback inputs are supplied, `Resolved { party_index: PARTY_SIZE_SENTINEL
/// }` is the original C routine's no-living-candidate sentinel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleAiSwitchIntoResult {
    Resolved { party_index: u8 },
    DamageFallbackNeeded,
}

fn move_row(move_id: u16) -> Option<&'static gen_tables::MoveRow> {
    gen_tables::MOVES.get(usize::from(move_id))
}

fn type_multiplier_tenths(attacking_type: u8, defending_type: u8) -> i32 {
    gen_tables::TYPE_EFFECTIVENESS_TABLE
        .iter()
        .find(|entry| {
            entry.attacking_type == attacking_type && entry.defending_type == defending_type
        })
        .map_or(TYPE_MUL_NORMAL, |entry| entry.multiplier_tenths)
}

/// `ModulateByTypeEffectiveness` (`battle_ai_switch_items.c:605-624`).  The
/// defender's duplicate type is skipped here, while its caller intentionally
/// invokes this once for *each* opposing type (including an opposing mono
/// type twice).
fn modulate_by_type_effectiveness(
    attacking_type: u8,
    defending_types: BattleAiSwitchTypes,
    running_value: i32,
) -> i32 {
    let mut value = (running_value * type_multiplier_tenths(attacking_type, defending_types[0]))
        / TYPE_MUL_NORMAL;
    if defending_types[1] != defending_types[0] {
        value =
            (value * type_multiplier_tenths(attacking_type, defending_types[1])) / TYPE_MUL_NORMAL;
    }
    value
}

/// The two unconditional source calls at `battle_ai_switch_items.c:702-703`.
/// In particular, an attacker with the same type in both slots applies that
/// type's multiplier twice; only the *defender* gets duplicate-type dedup.
fn compute_type_matchup_score(
    opposing_types: BattleAiSwitchTypes,
    candidate_types: BattleAiSwitchTypes,
) -> i32 {
    let mut value = TYPE_MUL_NORMAL;
    value = modulate_by_type_effectiveness(opposing_types[0], candidate_types, value);
    modulate_by_type_effectiveness(opposing_types[1], candidate_types, value)
}

fn foresight_skips_immunity(move_type: u8, defending_type: u8, status2: u32) -> bool {
    status2 & STATUS2_FORESIGHT != 0
        && defending_type == TYPE_GHOST
        && (move_type == TYPE_NORMAL || move_type == TYPE_FIGHTING)
}

/// The pass-1 `TypeCalc(move, gActiveBattler, opposingBattler) &
/// MOVE_RESULT_SUPER_EFFECTIVE` gate (`battle_ai_switch_items.c:722-724`),
/// following the canonical TS model's two observable ability/status quirks.
fn move_is_super_effective_against(
    move_id: u16,
    opposing_types: BattleAiSwitchTypes,
    opposing_ability: u16,
    opposing_status2: u32,
) -> bool {
    if move_id == MOVE_NONE {
        return false;
    }
    let Some(move_row) = move_row(move_id) else {
        // TS's `Map.get()` miss cannot pass the gate.
        return false;
    };
    if opposing_ability == ABILITY_LEVITATE && move_row.move_type == TYPE_GROUND {
        return false;
    }

    let mut multiplier = TYPE_MUL_NORMAL;
    for (type_index, defending_type) in [opposing_types[0], opposing_types[1]]
        .into_iter()
        .enumerate()
    {
        if type_index == 1 && opposing_types[0] == opposing_types[1] {
            continue;
        }
        if foresight_skips_immunity(move_row.move_type, defending_type, opposing_status2) {
            continue;
        }
        multiplier = (multiplier * type_multiplier_tenths(move_row.move_type, defending_type))
            / TYPE_MUL_NORMAL;
    }
    multiplier > TYPE_MUL_NORMAL
}

/// Pass-2 `TypeCalc`'s mutations of `gBattleMoveDamage`.  This intentionally
/// does not use `damage_calc::apply_type_effectiveness`: that helper correctly
/// lacks the switch selector's Foresight and Levitate early exits.  A move id
/// absent from TS's `MOVES_BY_ID` map has the documented TS fallback behavior
/// of returning the unmodified `baseDamage`; Struggle does the same because
/// `TypeCalc` returns before STAB/type work (`battle_script_commands.c:1542`).
fn type_calc_candidate_damage(move_id: u16, fallback: BattleAiSwitchDamageFallback) -> i32 {
    let Some(move_row) = move_row(move_id) else {
        return fallback.base_damage;
    };
    if move_id == MOVE_STRUGGLE {
        return fallback.base_damage;
    }

    let mut damage = fallback.base_damage;
    if fallback.active_types[0] == move_row.move_type
        || fallback.active_types[1] == move_row.move_type
    {
        damage = (damage * 15) / TYPE_MUL_NORMAL;
    }
    // `TypeCalc` sets miss/no-effect flags for Levitate, but leaves the
    // post-STAB damage value untouched; this selector only reads damage.
    if fallback.opposing_ability == ABILITY_LEVITATE && move_row.move_type == TYPE_GROUND {
        return damage;
    }

    for (type_index, defending_type) in [fallback.opposing_types[0], fallback.opposing_types[1]]
        .into_iter()
        .enumerate()
    {
        if type_index == 1 && fallback.opposing_types[0] == fallback.opposing_types[1] {
            continue;
        }
        if foresight_skips_immunity(
            move_row.move_type,
            defending_type,
            fallback.opposing_status2,
        ) {
            continue;
        }
        let multiplier = type_multiplier_tenths(move_row.move_type, defending_type);
        damage = (damage * multiplier) / TYPE_MUL_NORMAL;
        // `ModulateDmgByType2`'s no-effect-then-nonzero clamp.  It applies to
        // the running damage only, not to pass 1's multiplier accumulator.
        if damage == 0 && multiplier != TYPE_MUL_NO_EFFECT {
            damage = 1;
        }
    }
    damage
}

/// Plain-singles `GetMostSuitableMonToSwitchInto` (`battle_ai_switch_items.c:
/// 629-790`), matching `getMostSuitableMonToSwitchInto` in the canonical
/// TypeScript module.  It consumes no RNG state and makes no random draws.
#[must_use]
pub fn get_most_suitable_mon_to_switch_into(
    bench: &BattleAiSwitchBench,
    active_party_index: u8,
    opposing_types: BattleAiSwitchTypes,
    damage_fallback: Option<BattleAiSwitchDamageFallback>,
) -> BattleAiSwitchIntoResult {
    let (opposing_ability, opposing_status2) = damage_fallback.map_or((0, 0), |fallback| {
        (fallback.opposing_ability, fallback.opposing_status2)
    });
    let mut invalid = [false; PARTY_SIZE];

    // Pass 1: preserve the source's re-scan-after-failed-gate behavior and
    // strict-greater tie order (earlier party index stays selected).
    while invalid.iter().any(|is_invalid| !is_invalid) {
        let mut best_type_damage = TYPE_MUL_NO_EFFECT;
        let mut best_mon_id = None;
        for (index, member) in bench.iter().enumerate() {
            if member.species != 0
                && member.hp != 0
                && !invalid[index]
                && index as u8 != active_party_index
            {
                let type_damage = compute_type_matchup_score(opposing_types, member.types);
                // Source-noted inversion: select the candidate that takes the
                // most, rather than least, damage from the opposing types.
                if best_type_damage < type_damage {
                    best_type_damage = type_damage;
                    best_mon_id = Some(index);
                }
            } else {
                invalid[index] = true;
            }
        }

        let Some(best_mon_id) = best_mon_id else {
            invalid.fill(true);
            break;
        };
        if bench[best_mon_id].moves.iter().copied().any(|move_id| {
            move_is_super_effective_against(
                move_id,
                opposing_types,
                opposing_ability,
                opposing_status2,
            )
        }) {
            return BattleAiSwitchIntoResult::Resolved { party_index: best_mon_id as u8 };
        }
        invalid[best_mon_id] = true;
    }

    let Some(fallback) = damage_fallback else {
        return BattleAiSwitchIntoResult::DamageFallbackNeeded;
    };

    // Pass 2.  Keep `best_damage` as u8: in the non-BUGFIX source the
    // comparison promotes it, but each successful assignment wraps it.
    let mut best_damage: u8 = 0;
    let mut best_mon_id = PARTY_SIZE_SENTINEL;
    for (index, member) in bench.iter().enumerate() {
        if member.species == 0 || member.hp == 0 || index as u8 == active_party_index {
            continue;
        }
        for move_id in member.moves {
            let known_power_is_not_one =
                move_row(move_id).is_none_or(|move_row| move_row.power != 1);
            let damage = if move_id != MOVE_NONE && known_power_is_not_one {
                type_calc_candidate_damage(move_id, fallback)
            } else {
                0
            };
            if i32::from(best_damage) < damage {
                // JavaScript's `damage & 0xff` has the same low-byte result
                // as this cast for the source's signed damage domain.
                best_damage = damage as u8;
                best_mon_id = index as u8;
            }
        }
    }
    BattleAiSwitchIntoResult::Resolved { party_index: best_mon_id }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::{
        TYPE_ELECTRIC, TYPE_FIRE, TYPE_FLYING, TYPE_GRASS, TYPE_ROCK, TYPE_WATER,
    };

    const MOVE_KARATE_CHOP: u16 = 2;
    const MOVE_GUILLOTINE: u16 = 12;
    const MOVE_TACKLE: u16 = 33;
    const MOVE_WATER_GUN: u16 = 55;
    const MOVE_MUD_SHOT: u16 = 341;

    const EMPTY_MEMBER: BattleAiSwitchBenchMember = BattleAiSwitchBenchMember {
        species: 0,
        hp: 0,
        types: [TYPE_NORMAL, TYPE_NORMAL],
        moves: [MOVE_NONE; 4],
    };

    fn member(
        species: u16,
        hp: i32,
        types: BattleAiSwitchTypes,
        moves: [u16; 4],
    ) -> BattleAiSwitchBenchMember {
        BattleAiSwitchBenchMember { species, hp, types, moves }
    }

    fn fallback(
        base_damage: i32,
        active_types: BattleAiSwitchTypes,
        opposing_types: BattleAiSwitchTypes,
    ) -> BattleAiSwitchDamageFallback {
        BattleAiSwitchDamageFallback {
            base_damage,
            active_types,
            opposing_types,
            opposing_ability: 0,
            opposing_status2: 0,
        }
    }

    #[test]
    fn pass_one_matches_the_canonical_machop_over_pidgey_case() {
        // tests/battleAiSwitchInto.test.ts's live-ledger MACHOP case.
        let mut bench = [EMPTY_MEMBER; PARTY_SIZE];
        bench[0] = member(191, 0, [TYPE_GRASS, TYPE_GRASS], [MOVE_TACKLE, 0, 0, 0]);
        bench[1] = member(16, 100, [TYPE_NORMAL, TYPE_FLYING], [MOVE_TACKLE, 0, 0, 0]);
        bench[2] = member(
            66,
            100,
            [TYPE_FIGHTING, TYPE_FIGHTING],
            [MOVE_KARATE_CHOP, 0, 0, 0],
        );

        assert_eq!(
            get_most_suitable_mon_to_switch_into(&bench, 0, [TYPE_NORMAL, TYPE_NORMAL], None,),
            BattleAiSwitchIntoResult::Resolved { party_index: 2 },
        );
    }

    #[test]
    fn pass_one_preserves_mono_attacker_double_application_and_defender_dedup() {
        // The first fact is the source's two unconditional calls at :702-703.
        assert_eq!(
            compute_type_matchup_score([TYPE_NORMAL, TYPE_NORMAL], [TYPE_ROCK, TYPE_ROCK]),
            2,
        );
        // The second is TypeCalc's one distinct defender-type pass.
        assert_eq!(
            type_calc_candidate_damage(
                MOVE_WATER_GUN,
                fallback(100, [TYPE_NORMAL, TYPE_NORMAL], [TYPE_FIRE, TYPE_FIRE]),
            ),
            200,
        );
    }

    #[test]
    fn super_effective_gate_honors_levitate_and_foresight() {
        assert!(!move_is_super_effective_against(
            MOVE_MUD_SHOT,
            [TYPE_ELECTRIC, TYPE_ELECTRIC],
            ABILITY_LEVITATE,
            0,
        ));
        assert!(!move_is_super_effective_against(
            MOVE_KARATE_CHOP,
            [TYPE_GHOST, TYPE_ROCK],
            0,
            0,
        ));
        assert!(move_is_super_effective_against(
            MOVE_KARATE_CHOP,
            [TYPE_GHOST, TYPE_ROCK],
            0,
            STATUS2_FORESIGHT,
        ));
    }

    #[test]
    fn pass_two_preserves_stab_strict_ties_and_the_u8_wrap() {
        let mut bench = [EMPTY_MEMBER; PARTY_SIZE];
        bench[0] = member(191, 0, [TYPE_GRASS, TYPE_GRASS], [0; 4]);
        bench[1] = member(
            16,
            100,
            [TYPE_NORMAL, TYPE_FLYING],
            [MOVE_WATER_GUN, 0, 0, 0],
        );
        bench[2] = member(
            66,
            100,
            [TYPE_FIGHTING, TYPE_FIGHTING],
            [MOVE_TACKLE, 0, 0, 0],
        );
        assert_eq!(
            get_most_suitable_mon_to_switch_into(
                &bench,
                0,
                [TYPE_NORMAL, TYPE_NORMAL],
                Some(fallback(
                    200,
                    [TYPE_WATER, TYPE_WATER],
                    [TYPE_NORMAL, TYPE_NORMAL]
                )),
            ),
            // Water Gun's active-type STAB makes 300, then u8(300) == 44;
            // the later neutral Tackle at 200 wins the strict comparison.
            BattleAiSwitchIntoResult::Resolved { party_index: 2 },
        );

        bench[1].moves = [MOVE_TACKLE, 0, 0, 0];
        assert_eq!(
            get_most_suitable_mon_to_switch_into(
                &bench,
                0,
                [TYPE_NORMAL, TYPE_NORMAL],
                Some(fallback(
                    80,
                    [TYPE_GRASS, TYPE_GRASS],
                    [TYPE_NORMAL, TYPE_NORMAL]
                )),
            ),
            BattleAiSwitchIntoResult::Resolved { party_index: 1 },
        );
    }

    #[test]
    fn pass_two_preserves_move_none_power_one_struggle_and_the_sentinel() {
        let mut bench = [EMPTY_MEMBER; PARTY_SIZE];
        bench[0] = member(191, 0, [TYPE_GRASS, TYPE_GRASS], [0; 4]);
        bench[1] = member(
            16,
            100,
            [TYPE_NORMAL, TYPE_FLYING],
            [MOVE_STRUGGLE, 0, 0, 0],
        );
        bench[2] = member(
            66,
            100,
            [TYPE_FIGHTING, TYPE_FIGHTING],
            [MOVE_GUILLOTINE, 0, 0, 0],
        );
        assert_eq!(
            get_most_suitable_mon_to_switch_into(
                &bench,
                0,
                [TYPE_FIRE, TYPE_FIRE],
                Some(fallback(
                    100,
                    [TYPE_WATER, TYPE_WATER],
                    [TYPE_FIRE, TYPE_FIRE]
                )),
            ),
            // Struggle returns the unmodified 100; power-1 Guillotine and
            // every MOVE_NONE slot leave damage at zero.
            BattleAiSwitchIntoResult::Resolved { party_index: 1 },
        );

        assert_eq!(
            get_most_suitable_mon_to_switch_into(
                &[EMPTY_MEMBER; PARTY_SIZE],
                0,
                [TYPE_NORMAL, TYPE_NORMAL],
                None,
            ),
            BattleAiSwitchIntoResult::DamageFallbackNeeded,
        );
        assert_eq!(
            get_most_suitable_mon_to_switch_into(
                &[EMPTY_MEMBER; PARTY_SIZE],
                0,
                [TYPE_NORMAL, TYPE_NORMAL],
                Some(fallback(
                    100,
                    [TYPE_NORMAL, TYPE_NORMAL],
                    [TYPE_NORMAL, TYPE_NORMAL]
                )),
            ),
            BattleAiSwitchIntoResult::Resolved { party_index: PARTY_SIZE_SENTINEL },
        );
    }
}
