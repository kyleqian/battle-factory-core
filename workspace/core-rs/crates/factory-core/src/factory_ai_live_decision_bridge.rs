//! Bridge from the source-shaped live Factory AI view to the native move
//! policy.
//!
//! `factory_ai_live_view` intentionally keeps the public shape emitted by
//! `createFactoryAiViewFromLiveRules`: JavaScript-number cells, type/ability
//! symbols, and optional-property presence.  The already-native chooser in
//! `factory_ai_decision_policy` uses the compact numeric representation that
//! its scoring leaves consume.  This module is the one typed projection seam
//! between those two representations.  It owns the projection and delegates
//! the complete choice/trace/error result to the existing chooser; callers do
//! not supply a second, independently assembled scoring view.

use crate::damage_calc::{
    StatStages, TYPE_BUG, TYPE_DARK, TYPE_DRAGON, TYPE_ELECTRIC, TYPE_FIGHTING, TYPE_FIRE,
    TYPE_FLYING, TYPE_GHOST, TYPE_GRASS, TYPE_GROUND, TYPE_ICE, TYPE_MYSTERY, TYPE_NORMAL,
    TYPE_POISON, TYPE_PSYCHIC, TYPE_ROCK, TYPE_STEEL, TYPE_WATER,
};
use crate::factory_ai_check_bad_move::BattleRngState;
use crate::factory_ai_check_viability::{
    FactoryAiKnownMoveHistoryTail, FACTORY_AI_KNOWN_MOVE_HISTORY_TAIL_CAPACITY,
};
use crate::factory_ai_decision_policy::{
    choose_factory_ai_mask_zero_decision, choose_factory_ai_scored_decision,
    FactoryAiDecisionPolicyError, FactoryAiMaskZeroDecisionChoice, FactoryAiMovePolicyRequest,
    FactoryAiMovePolicyView, FactoryAiScoredBattlerView as PolicyBattlerView,
    FactoryAiScoredChoice, FactoryAiScoredDecisionError, FactoryAiScoredDecisionInput,
    FactoryAiScoredTargetView as PolicyTargetView, FactoryAiTurnStartRandomNumber,
};
use crate::factory_ai_live_view::{
    FactoryAiScoredBattlerView as LiveBattlerView, FactoryAiScoredTargetView as LiveTargetView,
    FactoryAiScoredView as LiveScoredView,
};
use crate::factory_ai_mask::{select_factory_ai_mask, FactoryAiMaskError};
use crate::gen_tables;

/// `Cmd_get_ability` cannot observe an arbitrary history string as one of the
/// generated numeric ability IDs.  This value is outside the complete
/// 0..77 ability universe and therefore compares unequal to every wanted
/// ability, matching a non-null but unknown TypeScript history string.
pub const FACTORY_AI_UNKNOWN_ABILITY_ID: u16 = u16::MAX;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PolicyFlavor {
    MaskZero,
    Scored,
}

/// Errors produced while converting a live view into the compact native
/// policy input.  The source constructor normally emits source-width integer
/// values, so these are defensive typed-boundary checks rather than new
/// policy branches.  The existing chooser errors are wrapped unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLiveDecisionError {
    MaskZeroPolicy(FactoryAiDecisionPolicyError),
    ScoredPolicy(FactoryAiScoredDecisionError),
    MaskSelection(FactoryAiMaskError),
    MaskSelectionInvalidInteger { field: &'static str, maximum: u32 },
    InvalidInteger { field: &'static str },
    KnownMoveHistoryTooLong { length: usize },
}

impl std::fmt::Display for FactoryAiLiveDecisionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MaskZeroPolicy(error) => error.fmt(f),
            Self::ScoredPolicy(error) => error.fmt(f),
            Self::MaskSelection(error) => {
                write!(f, "Factory AI mask selection failed: {error}")
            }
            Self::MaskSelectionInvalidInteger { field, maximum } => {
                write!(f, "{field} must be an integer from 0 through {maximum}")
            }
            Self::InvalidInteger { field } => {
                write!(
                    f,
                    "Factory AI live decision {field} must be a native integer"
                )
            }
            Self::KnownMoveHistoryTooLong { length } => write!(
                f,
                "Factory AI live decision known move history length {length} exceeds eight slots"
            ),
        }
    }
}

impl std::error::Error for FactoryAiLiveDecisionError {}

/// One request/cursor pair shared by the two bridge entry points.  The
/// request remains the kernel-owned authoritative legal-decision list; only
/// the live view is projected here.
#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveDecisionInput<'a> {
    pub view: &'a LiveScoredView,
    pub request: FactoryAiMovePolicyRequest<'a>,
    pub rng: BattleRngState,
    pub turn_start_random_number: Option<FactoryAiTurnStartRandomNumber>,
}

/// The dispatch result for the live driver's mask-selected move chooser.
/// Keeping the two concrete choices in one enum lets the WASM boundary reuse
/// the existing complete receipt encoders without reconstructing a second
/// policy result or dropping the mask-specific trace fields.
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiLiveDecisionChoice {
    MaskZero(FactoryAiMaskZeroDecisionChoice),
    Scored(FactoryAiScoredChoice),
}

/// Constructs the source-shaped view's compact policy projection and selects
/// the existing mask-0 or mask-1/mask-7 chooser.  The selector is only a
/// dispatch read; each existing chooser remains the owner of its complete
/// validation, RNG, scoring, tie, and receipt semantics.
pub fn choose_factory_ai_decision_from_live_view(
    input: FactoryAiLiveDecisionInput<'_>,
) -> Result<FactoryAiLiveDecisionChoice, FactoryAiLiveDecisionError> {
    // The composite mirrors `selectFactoryAiMask(view.factory)` before it
    // dispatches to either chooser. Its raw f64 challenge fields therefore
    // retain the selector's generic RangeError text, while the two direct M8g
    // entry points below keep their chooser-view projection labels.
    let factory = project_factory_for_mask_selection(input.view)?;
    let selection =
        select_factory_ai_mask(factory).map_err(FactoryAiLiveDecisionError::MaskSelection)?;
    if selection.mask == 0 {
        choose_factory_ai_mask_zero_decision_from_live_view(input)
            .map(FactoryAiLiveDecisionChoice::MaskZero)
    } else {
        choose_factory_ai_scored_decision_from_live_view(input)
            .map(FactoryAiLiveDecisionChoice::Scored)
    }
}

fn project_factory_for_mask_selection(
    view: &LiveScoredView,
) -> Result<crate::factory_ai_mask::FactoryAiMaskSelectionInput, FactoryAiLiveDecisionError> {
    fn raw_u16(value: f64, field: &'static str) -> Result<u32, FactoryAiLiveDecisionError> {
        const MAXIMUM: u32 = u16::MAX as u32;
        if !value.is_finite() || value.fract() != 0.0 || value < 0.0 || value > f64::from(MAXIMUM) {
            return Err(FactoryAiLiveDecisionError::MaskSelectionInvalidInteger {
                field,
                maximum: MAXIMUM,
            });
        }
        Ok(value as u32)
    }

    Ok(crate::factory_ai_mask::FactoryAiMaskSelectionInput {
        level_mode: view.factory.level_mode,
        battle_mode: view.factory.battle_mode,
        factory_win_streak: raw_u16(view.factory.factory_win_streak, "factoryWinStreak")?,
        trainer_opponent_id: raw_u16(view.factory.trainer_opponent_id, "trainerOpponentId")?,
    })
}

/// Runs the existing native mask-0 chooser from a view produced by
/// `create_factory_ai_view_from_live_rules`.
pub fn choose_factory_ai_mask_zero_decision_from_live_view(
    input: FactoryAiLiveDecisionInput<'_>,
) -> Result<FactoryAiMaskZeroDecisionChoice, FactoryAiLiveDecisionError> {
    let view = project_policy_move_view(input.view, PolicyFlavor::MaskZero)?;
    choose_factory_ai_mask_zero_decision(
        crate::factory_ai_decision_policy::FactoryAiMovePolicyInput {
            view,
            request: input.request,
            rng: input.rng,
        },
    )
    .map_err(FactoryAiLiveDecisionError::MaskZeroPolicy)
}

/// Runs the existing native mask-1/mask-7 chooser from a view produced by
/// `create_factory_ai_view_from_live_rules`.
pub fn choose_factory_ai_scored_decision_from_live_view(
    input: FactoryAiLiveDecisionInput<'_>,
) -> Result<FactoryAiScoredChoice, FactoryAiLiveDecisionError> {
    let view = project_policy_scored_view(input.view)?;
    choose_factory_ai_scored_decision(FactoryAiScoredDecisionInput {
        view,
        request: input.request,
        rng: input.rng,
        turn_start_random_number: input.turn_start_random_number,
    })
    .map_err(FactoryAiLiveDecisionError::ScoredPolicy)
}

fn project_policy_move_view(
    view: &LiveScoredView,
    flavor: PolicyFlavor,
) -> Result<FactoryAiMovePolicyView, FactoryAiLiveDecisionError> {
    let factory = project_factory(view, flavor)?;
    let moves = project_move_tuple(view.moves, flavor)?;
    Ok(FactoryAiMovePolicyView { factory, moves })
}

fn project_policy_scored_view(
    view: &LiveScoredView,
) -> Result<crate::factory_ai_decision_policy::FactoryAiScoredView, FactoryAiLiveDecisionError> {
    let factory = project_factory(view, PolicyFlavor::Scored)?;
    let moves = project_move_tuple(view.moves, PolicyFlavor::Scored)?;
    Ok(crate::factory_ai_decision_policy::FactoryAiScoredView {
        factory,
        moves,
        attacker: project_battler(&view.attacker)?,
        target: project_target(&view.target)?,
    })
}

fn project_factory(
    view: &LiveScoredView,
    flavor: PolicyFlavor,
) -> Result<crate::factory_ai_mask::FactoryAiMaskSelectionInput, FactoryAiLiveDecisionError> {
    let level_mode = project_u8(
        f64::from(view.factory.level_mode),
        "view.factory.levelMode",
        2,
        flavor,
    )?;
    let battle_mode = project_u8(
        f64::from(view.factory.battle_mode),
        "view.factory.battleMode",
        1,
        flavor,
    )?;
    let factory_win_streak = project_u32(
        view.factory.factory_win_streak,
        "view.factory.factoryWinStreak",
        0xffff,
        flavor,
    )?;
    let trainer_opponent_id = project_u32(
        view.factory.trainer_opponent_id,
        "view.factory.trainerOpponentId",
        0xffff,
        flavor,
    )?;
    Ok(crate::factory_ai_mask::FactoryAiMaskSelectionInput {
        level_mode,
        battle_mode,
        factory_win_streak,
        trainer_opponent_id,
    })
}

fn project_move_tuple(
    moves: [f64; 4],
    flavor: PolicyFlavor,
) -> Result<[u16; 4], FactoryAiLiveDecisionError> {
    let mut result = [0; 4];
    for (slot, value) in moves.into_iter().enumerate() {
        result[slot] = project_u16(value, move_field(slot), 0xffff, flavor)?;
    }
    Ok(result)
}

fn move_field(slot: usize) -> &'static str {
    match slot {
        0 => "view.moves[0]",
        1 => "view.moves[1]",
        2 => "view.moves[2]",
        3 => "view.moves[3]",
        _ => unreachable!(),
    }
}

fn project_battler(
    view: &LiveBattlerView,
) -> Result<PolicyBattlerView, FactoryAiLiveDecisionError> {
    let types = [type_id(&view.types[0]), type_id(&view.types[1])];
    let stages = view.stat_stages;
    Ok(PolicyBattlerView {
        types,
        attack: project_i32(view.attack),
        defense: project_i32(view.defense),
        sp_attack: project_i32(view.sp_attack),
        sp_defense: project_i32(view.sp_defense),
        speed: project_u32_lossy(view.speed),
        level: project_u8_lossy(view.level),
        stat_stages: StatStages {
            atk: project_u8_lossy(stages.atk),
            def: project_u8_lossy(stages.def),
            sp_atk: project_u8_lossy(stages.sp_atk),
            sp_def: project_u8_lossy(stages.sp_def),
        },
        speed_stage: project_u8_lossy(stages.speed),
        acc_stage: project_u8_lossy(stages.acc),
        evasion_stage: project_u8_lossy(stages.evasion),
        is_first_turn: project_u8_lossy(view.is_first_turn),
        hp: project_i32(view.hp),
        max_hp: project_i32(view.max_hp),
        last_used_move_id: None,
        is_toxic_poisoned: None,
        has_any_status: None,
        is_confused: None,
        is_asleep: view.is_asleep,
        is_taunted: None,
        is_leech_seeded: view.is_leech_seeded,
        is_infatuated: view.is_infatuated,
        has_yawn: view.has_yawn,
        has_perish_song: None,
        is_nightmared: None,
        is_foresighted: None,
        spikes_up: None,
        target_future_attack_up: None,
        protect_uses: view.protect_uses.map(project_u8_lossy),
        battle_turn_count: Some(project_u32_lossy(view.battle_turn_count)),
        is_rooted: Some(view.is_rooted),
        attacker_future_attack_up: view.attacker_future_attack_up,
        has_focus_energy: view.has_focus_energy,
        has_curable_status: view.has_curable_status,
        is_poisoned: None,
        is_burned: None,
        is_paralyzed: None,
        is_cursed: None,
        is_escape_prevented: None,
        is_tormented: None,
        light_screen_up: Some(view.light_screen_up),
        reflect_up: Some(view.reflect_up),
        target_side_reflect_up: None,
        target_party_status_equals_any: None,
        safeguard_up: view.safeguard_up,
        ability: ability_id_or_unknown(&view.ability),
        hold_effect: None,
        current_weather: view.current_weather.map(|weather| weather as u8),
        usable_party_mons: None,
        has_substitute: None,
        any_move_disabled: None,
        any_move_encored: None,
        mist_up: None,
        gender: None,
        imprisoned_others: None,
        mud_sport_up: None,
        water_sport_up: None,
        used_held_item_id: None,
        stockpile_count: None,
    })
}

fn project_target(view: &LiveTargetView) -> Result<PolicyTargetView, FactoryAiLiveDecisionError> {
    let mut battler = project_battler_from_target(view)?;
    battler.last_used_move_id = Some(lossy_move(view.last_used_move_id));
    battler.is_toxic_poisoned = Some(view.is_toxic_poisoned);
    battler.has_any_status = view.has_any_status;
    battler.is_confused = view.is_confused;
    battler.is_asleep = view.is_asleep;
    battler.is_taunted = view.is_taunted;
    battler.is_leech_seeded = Some(view.is_leech_seeded);
    battler.is_infatuated = view.is_infatuated;
    battler.has_yawn = view.has_yawn;
    battler.has_perish_song = view.has_perish_song;
    battler.is_nightmared = view.is_nightmared;
    battler.is_foresighted = view.is_foresighted;
    battler.is_cursed = Some(view.is_cursed);
    battler.is_escape_prevented = view.is_escape_prevented;
    battler.is_tormented = view.is_tormented;
    battler.safeguard_up = view.safeguard_up;
    battler.spikes_up = view.spikes_up;
    battler.target_future_attack_up = view.target_future_attack_up;
    let (known_moves, known_moves_tail) = project_known_moves(view.known_move_ids.as_deref())?;
    Ok(PolicyTargetView {
        battler,
        species: lossy_move(view.species),
        known_ability: view.known_ability.as_deref().map(ability_id_or_unknown),
        species_abilities: None,
        known_moves,
        known_moves_tail,
    })
}

fn project_battler_from_target(
    view: &LiveTargetView,
) -> Result<PolicyBattlerView, FactoryAiLiveDecisionError> {
    let stages = view.stat_stages;
    Ok(PolicyBattlerView {
        types: [type_id(&view.types[0]), type_id(&view.types[1])],
        attack: project_i32(view.attack),
        defense: project_i32(view.defense),
        sp_attack: project_i32(view.sp_attack),
        sp_defense: project_i32(view.sp_defense),
        speed: project_u32_lossy(view.speed),
        level: project_u8_lossy(view.level),
        stat_stages: StatStages {
            atk: project_u8_lossy(stages.atk),
            def: project_u8_lossy(stages.def),
            sp_atk: project_u8_lossy(stages.sp_atk),
            sp_def: project_u8_lossy(stages.sp_def),
        },
        speed_stage: project_u8_lossy(stages.speed),
        acc_stage: project_u8_lossy(stages.acc),
        evasion_stage: project_u8_lossy(stages.evasion),
        is_first_turn: project_u8_lossy(view.is_first_turn),
        hp: project_i32(view.hp),
        max_hp: project_i32(view.max_hp),
        last_used_move_id: Some(lossy_move(view.last_used_move_id)),
        is_toxic_poisoned: Some(view.is_toxic_poisoned),
        has_any_status: view.has_any_status,
        is_confused: view.is_confused,
        is_asleep: view.is_asleep,
        is_taunted: view.is_taunted,
        is_leech_seeded: Some(view.is_leech_seeded),
        is_infatuated: view.is_infatuated,
        has_yawn: view.has_yawn,
        has_perish_song: view.has_perish_song,
        is_nightmared: view.is_nightmared,
        is_foresighted: view.is_foresighted,
        spikes_up: view.spikes_up,
        target_future_attack_up: view.target_future_attack_up,
        protect_uses: None,
        battle_turn_count: None,
        is_rooted: None,
        attacker_future_attack_up: None,
        has_focus_energy: None,
        has_curable_status: None,
        is_poisoned: None,
        is_burned: None,
        is_paralyzed: None,
        is_cursed: Some(view.is_cursed),
        is_escape_prevented: view.is_escape_prevented,
        is_tormented: view.is_tormented,
        light_screen_up: None,
        reflect_up: None,
        target_side_reflect_up: None,
        target_party_status_equals_any: None,
        safeguard_up: view.safeguard_up,
        ability: ability_id_or_unknown(&view.ability),
        hold_effect: None,
        current_weather: None,
        usable_party_mons: None,
        has_substitute: None,
        any_move_disabled: None,
        any_move_encored: None,
        mist_up: None,
        gender: None,
        imprisoned_others: None,
        mud_sport_up: None,
        water_sport_up: None,
        used_held_item_id: None,
        stockpile_count: None,
    })
}

fn type_id(name: &str) -> u8 {
    match name {
        "TYPE_NORMAL" => TYPE_NORMAL,
        "TYPE_FIGHTING" => TYPE_FIGHTING,
        "TYPE_FLYING" => TYPE_FLYING,
        "TYPE_POISON" => TYPE_POISON,
        "TYPE_GROUND" => TYPE_GROUND,
        "TYPE_ROCK" => TYPE_ROCK,
        "TYPE_BUG" => TYPE_BUG,
        "TYPE_GHOST" => TYPE_GHOST,
        "TYPE_STEEL" => TYPE_STEEL,
        "TYPE_MYSTERY" => TYPE_MYSTERY,
        "TYPE_FIRE" => TYPE_FIRE,
        "TYPE_WATER" => TYPE_WATER,
        "TYPE_GRASS" => TYPE_GRASS,
        "TYPE_ELECTRIC" => TYPE_ELECTRIC,
        "TYPE_PSYCHIC" => TYPE_PSYCHIC,
        "TYPE_ICE" => TYPE_ICE,
        "TYPE_DRAGON" => TYPE_DRAGON,
        "TYPE_DARK" => TYPE_DARK,
        // A malformed source symbol has no entry in the TS effectiveness
        // table. TYPE_MYSTERY is the native neutral sentinel for that case.
        _ => TYPE_MYSTERY,
    }
}

fn ability_id_or_unknown(name: &str) -> u16 {
    gen_tables::ABILITY_NAME_BY_ID
        .iter()
        .find(|row| row.name == name)
        .map_or(FACTORY_AI_UNKNOWN_ABILITY_ID, |row| row.id)
}

fn project_known_moves(
    values: Option<&[f64]>,
) -> Result<(Option<[u16; 4]>, Option<FactoryAiKnownMoveHistoryTail>), FactoryAiLiveDecisionError> {
    let Some(values) = values else {
        return Ok((None, None));
    };
    if values.len() > 4 + FACTORY_AI_KNOWN_MOVE_HISTORY_TAIL_CAPACITY {
        return Err(FactoryAiLiveDecisionError::KnownMoveHistoryTooLong { length: values.len() });
    }
    let mut leading = [0; 4];
    let leading_length = values.len().min(leading.len());
    for (index, value) in values.iter().copied().take(leading_length).enumerate() {
        leading[index] = lossy_move(value);
    }
    if values.len() <= leading.len() {
        return Ok((Some(leading), None));
    }
    let mut tail = [0; FACTORY_AI_KNOWN_MOVE_HISTORY_TAIL_CAPACITY];
    for (index, value) in values.iter().copied().skip(leading.len()).enumerate() {
        tail[index] = lossy_move(value);
    }
    Ok((
        Some(leading),
        Some(FactoryAiKnownMoveHistoryTail { values: tail, length: (values.len() - 4) as u8 }),
    ))
}

fn lossy_move(value: f64) -> u16 {
    if value.is_finite() && value.fract() == 0.0 && (0.0..=f64::from(u16::MAX)).contains(&value) {
        value as u16
    } else {
        // Nested known/last-move values are not validated by scoredViewAt;
        // an unknown move has the same neutral lookup behavior in the native
        // leaves as a TS MOVES_BY_ID miss.
        u16::MAX
    }
}

fn project_i32(value: f64) -> i32 {
    if value.is_nan() {
        0
    } else {
        value as i32
    }
}

fn project_u32_lossy(value: f64) -> u32 {
    if value.is_nan() {
        0
    } else {
        value as u32
    }
}

fn project_u8_lossy(value: f64) -> u8 {
    if value.is_nan() {
        0
    } else {
        value as u8
    }
}

fn project_u8(
    value: f64,
    field: &'static str,
    maximum: u8,
    flavor: PolicyFlavor,
) -> Result<u8, FactoryAiLiveDecisionError> {
    if !value.is_finite() || value.fract() != 0.0 || value < 0.0 || value > f64::from(maximum) {
        return Err(FactoryAiLiveDecisionError::InvalidInteger { field });
    }
    let value = value as u8;
    // Keep the flavor argument load-bearing: it documents that these are the
    // viewAt guards for the two source chooser labels, even though the live
    // constructor fixes both fields to valid Level-50 singles values.
    let _ = flavor;
    Ok(value)
}

fn project_u32(
    value: f64,
    field: &'static str,
    maximum: u32,
    flavor: PolicyFlavor,
) -> Result<u32, FactoryAiLiveDecisionError> {
    if !value.is_finite() || value.fract() != 0.0 || value < 0.0 || value > f64::from(maximum) {
        return Err(FactoryAiLiveDecisionError::InvalidInteger { field });
    }
    let value = value as u32;
    let _ = flavor;
    Ok(value)
}

fn project_u16(
    value: f64,
    field: &'static str,
    maximum: u16,
    _flavor: PolicyFlavor,
) -> Result<u16, FactoryAiLiveDecisionError> {
    if !value.is_finite() || value.fract() != 0.0 || value < 0.0 || value > f64::from(maximum) {
        return Err(FactoryAiLiveDecisionError::InvalidInteger { field });
    }
    Ok(value as u16)
}
