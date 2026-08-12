//! `AI_TryToFaint`, ported from `src/engine/factoryAiTryToFaint.ts` and
//! `data/battle_ai_scripts.s:2616-2634`.
//!
//! This is deliberately a small, self-contained scorer rather than a second
//! damage implementation. `estimate_damage` delegates to `damage_calc`'s
//! exact base-damage, STAB, and type-effectiveness pipeline, then applies the
//! AI setup's already-drawn `simulatedRNG[slot]` percentage. Consequently the
//! scorer itself consumes at most one LCG value: the source's
//! `if_random_less_than 80` gate after a non-fainting x4-effective move.
//!
//! `reasonPrefix` is omitted from `RunTryToFaintInput`, as it is from the
//! native CheckBadMove and CheckViability inputs. It is only a caller-owned
//! receipt-string prefix in TypeScript; `TryToFaintDrawKind` lets the later
//! DecisionPolicy/WASM boundary reconstruct that exact reason without putting
//! allocation or string state in this pure core.

use crate::damage_calc::{
    apply_stab, apply_type_effectiveness, calculate_base_damage, DamageBattler, DamageCalcInput,
    StatStages, TYPE_GROUND,
};
use crate::factory_ai_check_bad_move::{
    type_multiplier_tenths, BattleRngState, ABILITY_LEVITATE, ABILITY_NONE, EFFECT_EXPLOSION,
    EFFECT_QUICK_ATTACK, IGNORED_POWERFUL_MOVE_EFFECTS,
};
use crate::gen_tables;
use crate::rng::advance_rng_value;

/// Complete battler view `AI_TryToFaint` reads, mirroring
/// `FactoryAiTryToFaintBattler` in TypeScript. The scorer intentionally has
/// no attacker ability/item/status fields: the canonical TS leaf spreads this
/// exact view into `calculateBaseDamage`, whose optional modifier fields take
/// their normal unset defaults.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTryToFaintBattler {
    pub attack: i32,
    pub defense: i32,
    pub sp_attack: i32,
    pub sp_defense: i32,
    pub level: i32,
    /// `[type0, type1]`, using `damage_calc::TYPE_*` ids.
    pub types: [u8; 2],
    pub stat_stages: StatStages,
}

/// `FactoryAiTryToFaintTarget`: the same stat view plus the live target HP
/// and ability. Unlike CheckBadMove's guessed ability path, this is the real
/// battle ability because `AI_CalcDmg`/`TypeCalc` reads live battle state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTryToFaintTarget {
    pub battler: FactoryAiTryToFaintBattler,
    pub hp: i32,
    pub ability: u16,
}

/// The source's three `get_how_powerful_move_is` outcomes.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiMostPowerful {
    MostPowerful = 0,
    NotMostPowerful = 1,
    PowerOther = 2,
}

/// `AI_TryToFaint` has one possible fresh draw site.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TryToFaintDrawKind {
    DoubleSuperEffective = 0,
}

/// One source `if_random_less_than 80` receipt. The TypeScript `reason` is
/// reconstructed by the caller from its input prefix and `kind`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiTryToFaintDraw {
    pub ordinal: u32,
    pub kind: TryToFaintDrawKind,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
    /// TS's `succeeded`: the `< 80` jump was *not* taken, so the source
    /// falls through to its +2 bonus.
    pub succeeded: bool,
}

/// `AI_TryToFaint` itself can draw no more than one LCG value.
pub const MAX_TRY_TO_FAINT_DRAWS: usize = 1;

const DRAW_FILLER: FactoryAiTryToFaintDraw = FactoryAiTryToFaintDraw {
    ordinal: 0,
    kind: TryToFaintDrawKind::DoubleSuperEffective,
    before: BattleRngState { value: 0, calls: 0 },
    after: BattleRngState { value: 0, calls: 0 },
    raw_rng_value: 0,
    random_value: 0,
    succeeded: false,
};

/// Native input for one AI moveset slot. `moveset_index` has the TypeScript
/// `0 | 1 | 2 | 3` contract; every real DecisionPolicy caller supplies that
/// range. `simulated_rng` is the four setup-time `100 - Random() % 16`
/// values, not fresh rolls owned by this leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RunTryToFaintInput {
    pub rng: BattleRngState,
    /// The currently considered move. This is intentionally independent of
    /// `moveset[moveset_index]`, exactly like the TS public input.
    pub move_id: u16,
    pub moveset_index: u8,
    pub moveset: [u16; 4],
    pub simulated_rng: [i32; 4],
    pub attacker: FactoryAiTryToFaintBattler,
    pub target: FactoryAiTryToFaintTarget,
    pub draw_ordinal_start: u32,
}

/// Result shape for the source's always-`"scored"` leaf. The fixed receipt
/// array plus `draw_count` follows the native AI scorer convention used by
/// CheckBadMove and CheckViability; only entries before `draw_count` are live.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TryToFaintResult {
    Scored {
        rng: BattleRngState,
        draws: [FactoryAiTryToFaintDraw; MAX_TRY_TO_FAINT_DRAWS],
        draw_count: u8,
        score_delta: i32,
        can_faint: bool,
        /// `None` mirrors TS `null` on the early can-faint return.
        most_powerful: Option<FactoryAiMostPowerful>,
    },
}

fn move_row_or_panic(move_id: u16) -> &'static gen_tables::MoveRow {
    gen_tables::MOVES.get(move_id as usize).unwrap_or_else(|| {
        // Exact TS Error message: `factory-ai-try-to-faint: unknown move ${moveId}`.
        panic!("factory-ai-try-to-faint: unknown move {move_id}")
    })
}

fn damage_battler(battler: FactoryAiTryToFaintBattler, ability: u16) -> DamageBattler {
    DamageBattler {
        attack: battler.attack,
        defense: battler.defense,
        sp_attack: battler.sp_attack,
        sp_defense: battler.sp_defense,
        level: battler.level,
        types: battler.types,
        stat_stages: battler.stat_stages,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability,
        species: 0,
        hold_effect: 0,
        hold_effect_param: 0,
    }
}

/// `AI_CalcDmg` + `TypeCalc` + `simulatedRNG[slot]` variance, used both by
/// the can-faint predicate and `get_how_powerful_move_is`. `move_id` has the
/// same exact unknown-move Error path as the public leaf.
fn estimate_damage(
    attacker: FactoryAiTryToFaintBattler,
    defender: FactoryAiTryToFaintTarget,
    move_id: u16,
    simulated_rng_percent: i32,
) -> i32 {
    let move_row = move_row_or_panic(move_id);
    let mut damage = calculate_base_damage(&DamageCalcInput {
        attacker: damage_battler(attacker, ABILITY_NONE),
        defender: damage_battler(defender.battler, defender.ability),
        move_power: i32::from(move_row.power),
        move_type: move_row.move_type,
        is_critical_hit: false,
        side_status_reflect: false,
        side_status_light_screen: false,
        is_double_battle_spread_move: false,
        // The TS call only supplies power/type/crit. In particular, its
        // estimate does *not* pass `moveEffect`, even for Explosion.
        is_explosion_effect: false,
        weather: 0,
        weather_has_effect: true,
        current_move: 0,
        active_battler_abilities: None,
        // TS's omitted `isFrontierBattle` is `!undefined`, i.e. false here.
        is_frontier_battle: false,
        flash_fire_boosted: false,
    });
    damage = apply_stab(damage, attacker.types, move_row.move_type);
    // TypeCalc's non-BUGFIX Levitate/Ground short-circuit skips the entire
    // type loop rather than replacing damage with zero.
    if !(defender.ability == ABILITY_LEVITATE && move_row.move_type == TYPE_GROUND) {
        damage = apply_type_effectiveness(
            damage,
            move_row.move_type,
            defender.battler.types,
            &gen_tables::TYPE_EFFECTIVENESS_TABLE,
        )
        .damage;
    }
    damage = (damage * simulated_rng_percent) / 100;
    if damage == 0 {
        damage = 1;
    }
    damage
}

/// `Cmd_if_type_effectiveness AI_EFFECTIVENESS_x4` in the exact AI-specific
/// form. The fixed 40 baseline runs through STAB and the multiplier loop; a
/// STAB x4 240 result is remapped to the source's 160 sentinel.
fn is_quadruple_effective(
    attacker_types: [u8; 2],
    move_type: u8,
    defender_types: [u8; 2],
    defender_ability: u16,
) -> bool {
    // In the non-BUGFIX build, TypeCalc's local Levitate/Ground flag does not
    // reach this later probe. The loop is skipped, and it never reads x0.
    if defender_ability == ABILITY_LEVITATE && move_type == TYPE_GROUND {
        return false;
    }
    let stab = attacker_types[0] == move_type || attacker_types[1] == move_type;
    let multiplier_tenths = type_multiplier_tenths(move_type, defender_types);
    let mut value = if stab { 60 } else { 40 };
    value = (value * multiplier_tenths) / 10;
    if value == 240 {
        value = 160;
    }
    value == 160
}

/// `Cmd_get_how_powerful_move_is`. A zero slot and an unknown *sibling* are
/// both ineligible zero damage; only the considered move itself is looked up
/// eagerly and therefore throws on an unknown id, as the TS Map code does.
fn compute_most_powerful(
    attacker: FactoryAiTryToFaintBattler,
    defender: FactoryAiTryToFaintTarget,
    moveset: [u16; 4],
    simulated_rng: [i32; 4],
    moveset_index: usize,
) -> FactoryAiMostPowerful {
    let considered_move_id = moveset[moveset_index];
    let considered_move = move_row_or_panic(considered_move_id);
    let considered_eligible = considered_move.power > 1
        && !IGNORED_POWERFUL_MOVE_EFFECTS.contains(&considered_move.effect);
    if !considered_eligible {
        return FactoryAiMostPowerful::PowerOther;
    }

    let mut move_damages = [0; 4];
    for index in 0..4 {
        let move_id = moveset[index];
        // `moveId === 0 ? undefined : MOVES_BY_ID.get(moveId)`: Map misses
        // for a nonzero unknown sibling also stay undefined rather than
        // throwing. Keep that observable difference from considered lookup.
        let eligible = move_id != 0
            && gen_tables::MOVES
                .get(move_id as usize)
                .is_some_and(|move_row| {
                    move_row.power > 1 && !IGNORED_POWERFUL_MOVE_EFFECTS.contains(&move_row.effect)
                });
        if eligible {
            move_damages[index] =
                estimate_damage(attacker, defender, move_id, simulated_rng[index]);
        }
    }
    let considered_damage = move_damages[moveset_index];
    if move_damages
        .into_iter()
        .any(|damage| damage > considered_damage)
    {
        FactoryAiMostPowerful::NotMostPowerful
    } else {
        FactoryAiMostPowerful::MostPowerful
    }
}

fn next_draw(rng: BattleRngState, ordinal: u32) -> FactoryAiTryToFaintDraw {
    let raw_rng_value = advance_rng_value(rng.value);
    let after = BattleRngState { value: raw_rng_value, calls: rng.calls + 1 };
    let random_value = ((raw_rng_value >> 16) & 0xffff) as u16;
    FactoryAiTryToFaintDraw {
        ordinal,
        kind: TryToFaintDrawKind::DoubleSuperEffective,
        before: rng,
        after,
        raw_rng_value,
        random_value,
        succeeded: random_value % 256 >= 80,
    }
}

/// `AI_TryToFaint` for one move slot. It first rewards an estimated KO
/// (+4, Explosion +0, Quick Attack's source fallthrough +6). Otherwise it
/// penalizes only a strictly inferior eligible move, then applies the one
/// optional x4 fallthrough bonus draw.
#[must_use]
pub fn run_try_to_faint(input: RunTryToFaintInput) -> TryToFaintResult {
    let move_row = move_row_or_panic(input.move_id);
    let moveset_index = input.moveset_index as usize;

    let mut can_faint = false;
    if move_row.power >= 2 {
        let estimated_damage = estimate_damage(
            input.attacker,
            input.target,
            input.move_id,
            input.simulated_rng[moveset_index],
        );
        can_faint = input.target.hp <= estimated_damage;
    }

    if can_faint {
        // `AI_TryToFaint_TryToEncourageQuickAttack`: Quick Attack receives
        // score +2 then falls through to +4; Explosion has no bonus.
        let score_delta = if move_row.effect == EFFECT_EXPLOSION {
            0
        } else if move_row.effect == EFFECT_QUICK_ATTACK {
            6
        } else {
            4
        };
        return TryToFaintResult::Scored {
            rng: input.rng,
            draws: [DRAW_FILLER; MAX_TRY_TO_FAINT_DRAWS],
            draw_count: 0,
            score_delta,
            can_faint: true,
            most_powerful: None,
        };
    }

    let most_powerful = compute_most_powerful(
        input.attacker,
        input.target,
        input.moveset,
        input.simulated_rng,
        moveset_index,
    );
    let mut score_delta = if most_powerful == FactoryAiMostPowerful::NotMostPowerful {
        -1
    } else {
        0
    };
    let mut rng = input.rng;
    let mut draws = [DRAW_FILLER; MAX_TRY_TO_FAINT_DRAWS];
    let mut draw_count = 0;
    if is_quadruple_effective(
        input.attacker.types,
        move_row.move_type,
        input.target.battler.types,
        input.target.ability,
    ) {
        let draw = next_draw(rng, input.draw_ordinal_start);
        rng = draw.after;
        if draw.succeeded {
            // `if_random_less_than 80` jumps past the score when `< 80`; its
            // fallthrough (`>= 80`) receives the bonus.
            score_delta += 2;
        }
        draws[0] = draw;
        draw_count = 1;
    }

    TryToFaintResult::Scored {
        rng,
        draws,
        draw_count,
        score_delta,
        can_faint: false,
        most_powerful: Some(most_powerful),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::{
        DEFAULT_STAT_STAGE, TYPE_ELECTRIC, TYPE_FLYING, TYPE_GRASS, TYPE_NORMAL, TYPE_PSYCHIC,
    };

    const POUND: u16 = 1;
    const EXPLOSION: u16 = 153;
    const QUICK_ATTACK: u16 = 98;
    const SURF: u16 = 57;
    const ICE_BEAM: u16 = 58;
    const GROWL: u16 = 45;

    const NEUTRAL_STAGES: StatStages = StatStages {
        atk: DEFAULT_STAT_STAGE,
        def: DEFAULT_STAT_STAGE,
        sp_atk: DEFAULT_STAT_STAGE,
        sp_def: DEFAULT_STAT_STAGE,
    };

    const ATTACKER: FactoryAiTryToFaintBattler = FactoryAiTryToFaintBattler {
        attack: 100,
        defense: 100,
        sp_attack: 100,
        sp_defense: 100,
        level: 50,
        types: [TYPE_PSYCHIC, TYPE_PSYCHIC],
        stat_stages: NEUTRAL_STAGES,
    };

    fn target(hp: i32) -> FactoryAiTryToFaintTarget {
        FactoryAiTryToFaintTarget {
            battler: FactoryAiTryToFaintBattler {
                attack: 100,
                defense: 100,
                sp_attack: 100,
                sp_defense: 100,
                level: 50,
                types: [TYPE_PSYCHIC, TYPE_PSYCHIC],
                stat_stages: NEUTRAL_STAGES,
            },
            hp,
            ability: ABILITY_NONE,
        }
    }

    fn run(
        move_id: u16,
        moveset: [u16; 4],
        moveset_index: u8,
        target: FactoryAiTryToFaintTarget,
    ) -> TryToFaintResult {
        run_try_to_faint(RunTryToFaintInput {
            rng: BattleRngState { value: 0, calls: 0 },
            move_id,
            moveset_index,
            moveset,
            simulated_rng: [100; 4],
            attacker: ATTACKER,
            target,
            draw_ordinal_start: 1,
        })
    }

    #[test]
    fn source_directed_ko_bonuses_and_boundary() {
        let TryToFaintResult::Scored { can_faint, score_delta, draw_count, most_powerful, .. } =
            run(POUND, [POUND, 0, 0, 0], 0, target(19));
        assert!(can_faint);
        assert_eq!(score_delta, 4);
        assert_eq!(draw_count, 0);
        assert_eq!(most_powerful, None);

        let TryToFaintResult::Scored { can_faint, score_delta, most_powerful, .. } =
            run(POUND, [POUND, 0, 0, 0], 0, target(20));
        assert!(!can_faint);
        assert_eq!(score_delta, 0);
        assert_eq!(most_powerful, Some(FactoryAiMostPowerful::MostPowerful));

        let TryToFaintResult::Scored { score_delta, .. } =
            run(EXPLOSION, [EXPLOSION, 0, 0, 0], 0, target(5));
        assert_eq!(score_delta, 0);
        let TryToFaintResult::Scored { score_delta, .. } =
            run(QUICK_ATTACK, [QUICK_ATTACK, 0, 0, 0], 0, target(5));
        assert_eq!(score_delta, 6);
    }

    #[test]
    fn source_directed_most_powerful_and_power_other() {
        let TryToFaintResult::Scored { score_delta, most_powerful, .. } =
            run(POUND, [POUND, SURF, 0, 0], 0, target(999));
        assert_eq!(score_delta, -1);
        assert_eq!(most_powerful, Some(FactoryAiMostPowerful::NotMostPowerful));

        let TryToFaintResult::Scored { score_delta, most_powerful, .. } =
            run(GROWL, [GROWL, SURF, 0, 0], 0, target(999));
        assert_eq!(score_delta, 0);
        assert_eq!(most_powerful, Some(FactoryAiMostPowerful::PowerOther));
    }

    #[test]
    fn x4_roll_is_the_only_fresh_draw_and_uses_the_fallthrough_sense() {
        let mut x4_target = target(999);
        x4_target.battler.types = [TYPE_GRASS, TYPE_FLYING];
        let positive = run_try_to_faint(RunTryToFaintInput {
            rng: BattleRngState { value: 1, calls: 0 },
            move_id: ICE_BEAM,
            moveset_index: 0,
            moveset: [ICE_BEAM, 0, 0, 0],
            simulated_rng: [100; 4],
            attacker: ATTACKER,
            target: x4_target,
            draw_ordinal_start: 7,
        });
        let TryToFaintResult::Scored { rng, draws, draw_count, score_delta, .. } = positive;
        assert_eq!(draw_count, 1);
        assert_eq!(draws[0].ordinal, 7);
        assert_eq!(draws[0].random_value % 256, 198);
        assert!(draws[0].succeeded);
        assert_eq!(score_delta, 2);
        assert_eq!(rng.calls, 1);

        let skipped = run_try_to_faint(RunTryToFaintInput {
            rng: BattleRngState { value: 4, calls: 0 },
            move_id: ICE_BEAM,
            moveset_index: 0,
            moveset: [ICE_BEAM, 0, 0, 0],
            simulated_rng: [100; 4],
            attacker: ATTACKER,
            target: x4_target,
            draw_ordinal_start: 1,
        });
        let TryToFaintResult::Scored { draws, score_delta, .. } = skipped;
        assert_eq!(draws[0].random_value % 256, 25);
        assert!(!draws[0].succeeded);
        assert_eq!(score_delta, 0);
    }

    #[test]
    fn unknown_sibling_is_an_ineligible_zero_but_considered_unknown_throws() {
        let TryToFaintResult::Scored { most_powerful, score_delta, .. } =
            run(POUND, [POUND, 9_999, 0, 0], 0, target(999));
        assert_eq!(most_powerful, Some(FactoryAiMostPowerful::MostPowerful));
        assert_eq!(score_delta, 0);
    }

    #[test]
    #[should_panic(expected = "factory-ai-try-to-faint: unknown move 9999")]
    fn unknown_considered_move_uses_the_ts_error_message() {
        let _ = run(POUND, [POUND, 9_999, 0, 0], 1, target(999));
    }

    #[test]
    fn levitate_ground_never_reads_as_x4() {
        assert!(!is_quadruple_effective(
            [TYPE_NORMAL, TYPE_NORMAL],
            TYPE_GROUND,
            [TYPE_ELECTRIC, TYPE_ELECTRIC],
            ABILITY_LEVITATE,
        ));
    }
}
