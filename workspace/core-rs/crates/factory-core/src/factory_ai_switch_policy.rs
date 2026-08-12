//! Pure trainer-singles `ShouldSwitch` policy and complete retained trace,
//! ported from `src/engine/factoryAiSwitchPolicy.ts`.
//!
//! Source order and constants follow
//! `reference/pokeemerald/src/battle_ai_switch_items.c:20-525,528-595`.
//! Sentinel resolution delegates to the separately ported native
//! `battle_ai_switch_into` selector (`battle_ai_switch_items.c:629-790`).

use crate::battle_ai_switch_into::{
    get_most_suitable_mon_to_switch_into, BattleAiSwitchBench, BattleAiSwitchBenchMember,
    BattleAiSwitchDamageFallback, BattleAiSwitchIntoResult, BattleAiSwitchTypes, PARTY_SIZE,
    PARTY_SIZE_SENTINEL,
};
use crate::damage_calc::{
    TYPE_ELECTRIC, TYPE_FIRE, TYPE_GROUND, TYPE_NORMAL, TYPE_STEEL, TYPE_WATER,
};
use crate::factory_ai_check_bad_move::{
    BattleRngState, ABILITY_ARENA_TRAP, ABILITY_FLASH_FIRE, ABILITY_LEVITATE, ABILITY_MAGNET_PULL,
    ABILITY_SHADOW_TAG, ABILITY_VOLT_ABSORB, ABILITY_WATER_ABSORB, ABILITY_WONDER_GUARD,
};
use crate::gen_tables;
use crate::rng::advance_rng_value;

/// `ABILITY_NATURAL_CURE` (`include/constants/abilities.h:34`).
pub const ABILITY_NATURAL_CURE: u16 = 30;
/// `BATTLE_TYPE_TRAINER`, `BATTLE_TYPE_DOUBLE`, and `BATTLE_TYPE_ARENA`
/// (`include/constants/battle.h:52,56,77`).
pub const BATTLE_TYPE_TRAINER: u32 = 1 << 3;
pub const BATTLE_TYPE_DOUBLE: u32 = 1 << 0;
pub const BATTLE_TYPE_ARENA: u32 = 1 << 18;
/// Status constants (`include/constants/battle.h:138-167`).
pub const STATUS1_SLEEP: u32 = 0x7;
pub const STATUS2_WRAPPED: u32 = 0x0000_e000;
pub const STATUS2_ESCAPE_PREVENTION: u32 = 1 << 26;
pub const STATUS3_PERISH_SONG: u32 = 1 << 5;
pub const STATUS3_ROOTED: u32 = 1 << 10;

const MOVE_NONE: u16 = 0;
const MOVE_STRUGGLE: u16 = 165;
const MOVE_UNAVAILABLE: u16 = u16::MAX;
const DEFAULT_STAT_STAGE: i32 = 6;

/// Exactly the battler fields read by the canonical pure policy.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchBattler {
    pub species: u16,
    pub ability: u16,
    pub types: BattleAiSwitchTypes,
    pub hp: i32,
    pub max_hp: i32,
    pub moves: [u16; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub stat_stages: [i32; 8],
    pub party_index: u8,
    pub perish_song_timer: u8,
}

/// Exactly the opponent-party fields read by the canonical pure policy.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchPartyMember {
    pub species: u16,
    pub is_egg: bool,
    pub ability_num: u8,
    pub hp: i32,
    pub moves: [u16; 4],
}

/// Focused typed rules surface. It intentionally omits every field of
/// `BattleScriptRulesContext` that `factoryAiSwitchPolicy.ts` never reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchRules {
    pub battlers: [FactoryAiSwitchBattler; 4],
    pub opponent_party: [FactoryAiSwitchPartyMember; PARTY_SIZE],
    pub last_landed_move: u16,
    pub last_hit_by: u8,
    pub reserved_party_index: u8,
    pub absent_battler_flags: u8,
    pub battlers_count: u8,
    pub battle_type_flags: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchPolicyInput {
    pub rules: FactoryAiSwitchRules,
    pub rng: BattleRngState,
    pub suitable_damage_fallback: Option<BattleAiSwitchDamageFallback>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiSwitchChoice {
    Chosen { party_index: u8 },
    Sentinel,
    NoSwitch,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiSwitchDrawKind {
    WonderGuardCandidate,
    AbsorberActiveSuperEffective,
    AbsorberCandidate,
    NaturalCureEarly,
    NaturalCureStatusMove,
    NaturalCureDefensive,
    NaturalCureFinal,
    ActiveSuperEffective,
    ImmunityFallback,
    NotVeryEffectiveFallback,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactoryAiSwitchDraw {
    pub ordinal: u32,
    pub reason: String,
    pub kind: FactoryAiSwitchDrawKind,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
    pub modulus: u16,
    pub remainder: u16,
    pub succeeded: bool,
    pub party_index: Option<u8>,
    pub move_slot: Option<u8>,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiSwitchBranchKind {
    WrappedOrEscapePrevented,
    Rooted,
    ShadowTag,
    ArenaTrap,
    MagnetPullSteel,
    BattleArena,
    AvailableBench,
    PerishSong,
    WonderGuard,
    Absorber,
    NaturalCure,
    ActiveSuperEffective,
    StatsRaised,
    ImmunityFallback,
    NotVeryEffectiveFallback,
    SuitableSelector,
    FirstLegalFallback,
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiSwitchBranchOutcome {
    Pass,
    Blocked,
    Selected,
    Suppressed,
    None,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchBranch {
    pub ordinal: u32,
    pub branch: FactoryAiSwitchBranchKind,
    pub outcome: FactoryAiSwitchBranchOutcome,
    pub party_index: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FactoryAiSwitchPolicyResult {
    pub schema: &'static str,
    pub choice: FactoryAiSwitchChoice,
    pub selected_party_index: Option<u8>,
    pub rng: BattleRngState,
    pub draws: Vec<FactoryAiSwitchDraw>,
    pub branches: Vec<FactoryAiSwitchBranch>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiSwitchPolicyError;

impl core::fmt::Display for FactoryAiSwitchPolicyError {
    fn fmt(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        formatter.write_str("factory-ai-switch-policy supports only trainer singles")
    }
}

#[derive(Debug, Clone, Copy)]
struct TypeFlags {
    super_effective: bool,
    not_very_effective: bool,
    does_not_affect: bool,
}

fn species_types(species: u16) -> BattleAiSwitchTypes {
    gen_tables::switch_policy_species_row(species)
        .map_or([TYPE_NORMAL, TYPE_NORMAL], |row| row.types)
}

fn party_ability(member: FactoryAiSwitchPartyMember) -> u16 {
    gen_tables::switch_policy_species_row(member.species)
        .and_then(|row| row.abilities.get(usize::from(member.ability_num)).copied())
        .unwrap_or(0)
}

fn type_multiplier(attacking_type: u8, defending_types: BattleAiSwitchTypes) -> i32 {
    let mut multiplier = 10;
    for (index, defending_type) in defending_types.into_iter().enumerate() {
        if index == 1 && defending_types[0] == defending_types[1] {
            continue;
        }
        let row_multiplier = gen_tables::TYPE_EFFECTIVENESS_TABLE
            .iter()
            .find(|entry| {
                entry.attacking_type == attacking_type && entry.defending_type == defending_type
            })
            .map_or(10, |entry| entry.multiplier_tenths);
        multiplier = (multiplier * row_multiplier) / 10;
    }
    multiplier
}

fn ai_type_calc(move_id: u16, target_species: u16, target_ability: u16) -> TypeFlags {
    let Some(move_row) = gen_tables::MOVES.get(usize::from(move_id)) else {
        return TypeFlags {
            super_effective: false,
            not_very_effective: false,
            does_not_affect: false,
        };
    };
    if move_id == MOVE_STRUGGLE {
        return TypeFlags {
            super_effective: false,
            not_very_effective: false,
            does_not_affect: false,
        };
    }
    if target_ability == ABILITY_LEVITATE && move_row.move_type == TYPE_GROUND {
        return TypeFlags {
            super_effective: false,
            not_very_effective: false,
            does_not_affect: true,
        };
    }
    let multiplier = type_multiplier(move_row.move_type, species_types(target_species));
    let damaging = move_row.power != 0;
    let super_effective = damaging && multiplier > 10;
    let wonder_guard = target_ability == ABILITY_WONDER_GUARD && damaging && !super_effective;
    TypeFlags {
        super_effective,
        not_very_effective: damaging && multiplier > 0 && multiplier < 10,
        does_not_affect: multiplier == 0 || wonder_guard,
    }
}

fn legal_available_member(
    member: FactoryAiSwitchPartyMember,
    party_index: usize,
    active_party_index: u8,
    reserved_party_index: u8,
) -> bool {
    member.hp != 0
        && member.species != 0
        && !member.is_egg
        && party_index as u8 != active_party_index
        && party_index as u8 != reserved_party_index
}

/// RNG-free `ShouldSwitch` gate prefix used by command publication
/// (`factoryAiSwitchPolicy.ts:isFactoryAiSwitchPrecheckBlocked`).
#[must_use]
pub fn is_factory_ai_switch_precheck_blocked(rules: &FactoryAiSwitchRules) -> bool {
    let active = rules.battlers[1];
    let target = rules.battlers[0];
    active.status2 & (STATUS2_WRAPPED | STATUS2_ESCAPE_PREVENTION) != 0
        || active.status3 & STATUS3_ROOTED != 0
        || target.ability == ABILITY_SHADOW_TAG
        || target.ability == ABILITY_ARENA_TRAP
        || (rules.battlers[..2]
            .iter()
            .enumerate()
            .any(|(index, battler)| {
                rules.absent_battler_flags & (1 << index) == 0
                    && battler.ability == ABILITY_MAGNET_PULL
            })
            && active.types.contains(&TYPE_STEEL))
        || rules.battle_type_flags & BATTLE_TYPE_ARENA != 0
}

struct Runner<'a> {
    input: &'a FactoryAiSwitchPolicyInput,
    rng: BattleRngState,
    choice: FactoryAiSwitchChoice,
    draws: Vec<FactoryAiSwitchDraw>,
    branches: Vec<FactoryAiSwitchBranch>,
}

impl Runner<'_> {
    fn branch(
        &mut self,
        branch: FactoryAiSwitchBranchKind,
        outcome: FactoryAiSwitchBranchOutcome,
        party_index: Option<u8>,
    ) {
        self.branches.push(FactoryAiSwitchBranch {
            ordinal: self.branches.len() as u32,
            branch,
            outcome,
            party_index,
        });
    }

    fn draw(
        &mut self,
        kind: FactoryAiSwitchDrawKind,
        reason: String,
        modulus: u16,
        succeeds: impl FnOnce(u16) -> bool,
        party_index: Option<u8>,
        move_slot: Option<u8>,
    ) -> bool {
        let before = self.rng;
        let raw_rng_value = advance_rng_value(before.value);
        let after = BattleRngState { value: raw_rng_value, calls: before.calls + 1 };
        let random_value = (raw_rng_value >> 16) as u16;
        let remainder = random_value % modulus;
        let succeeded = succeeds(remainder);
        self.rng = after;
        self.draws.push(FactoryAiSwitchDraw {
            ordinal: self.draws.len() as u32,
            reason,
            kind,
            before,
            after,
            raw_rng_value,
            random_value,
            modulus,
            remainder,
            succeeded,
            party_index,
            move_slot,
        });
        succeeded
    }

    fn select(&mut self, party_index: Option<u8>) {
        self.choice = party_index.map_or(FactoryAiSwitchChoice::Sentinel, |party_index| {
            FactoryAiSwitchChoice::Chosen { party_index }
        });
    }

    fn result(self, selected_party_index: Option<u8>) -> FactoryAiSwitchPolicyResult {
        FactoryAiSwitchPolicyResult {
            schema: "factory-ai-switch-policy/v1",
            choice: self.choice,
            selected_party_index,
            rng: self.rng,
            draws: self.draws,
            branches: self.branches,
        }
    }

    fn active_has_super_effective_move(&self) -> bool {
        let active = self.input.rules.battlers[1];
        let target = self.input.rules.battlers[0];
        active.moves.into_iter().any(|move_id| {
            move_id != MOVE_NONE
                && ai_type_calc(move_id, target.species, target.ability).super_effective
        })
    }

    fn find_defensive_candidate(
        &mut self,
        immune: bool,
        modulus: u16,
        kind: FactoryAiSwitchDrawKind,
    ) -> Option<u8> {
        let rules = self.input.rules;
        let last_move = gen_tables::MOVES.get(usize::from(rules.last_landed_move))?;
        if rules.last_landed_move == MOVE_NONE
            || rules.last_landed_move == MOVE_UNAVAILABLE
            || rules.last_hit_by == 0xff
            || last_move.power == 0
        {
            return None;
        }
        let opponent = rules
            .battlers
            .get(usize::from(rules.last_hit_by))
            .copied()?;
        let active_party_index = rules.battlers[1].party_index;
        for (party_index, member) in rules.opponent_party.into_iter().enumerate() {
            if !legal_available_member(
                member,
                party_index,
                active_party_index,
                rules.reserved_party_index,
            ) {
                continue;
            }
            let flags = ai_type_calc(
                rules.last_landed_move,
                member.species,
                party_ability(member),
            );
            let matches = if immune {
                flags.does_not_affect
            } else {
                flags.not_very_effective
            };
            if !matches {
                continue;
            }
            for (move_slot, move_id) in member.moves.into_iter().enumerate() {
                if move_id != MOVE_NONE
                    && ai_type_calc(move_id, opponent.species, opponent.ability).super_effective
                    && self.draw(
                        kind,
                        format!(
                            "{}-party-{party_index}-move-{move_slot}",
                            if immune {
                                "immune"
                            } else {
                                "not-very-effective"
                            }
                        ),
                        modulus,
                        |remainder| remainder == 0,
                        Some(party_index as u8),
                        Some(move_slot as u8),
                    )
                {
                    return Some(party_index as u8);
                }
            }
        }
        None
    }
}

/// Canonical `evaluateFactoryAiSwitchPolicy`, including all draw and branch
/// receipts and the final concrete party-index resolution.
pub fn evaluate_factory_ai_switch_policy(
    input: &FactoryAiSwitchPolicyInput,
) -> Result<FactoryAiSwitchPolicyResult, FactoryAiSwitchPolicyError> {
    let rules = input.rules;
    if rules.battlers_count != 2
        || rules.battle_type_flags & BATTLE_TYPE_DOUBLE != 0
        || rules.battle_type_flags & BATTLE_TYPE_TRAINER == 0
    {
        return Err(FactoryAiSwitchPolicyError);
    }

    let active = rules.battlers[1];
    let target = rules.battlers[0];
    let mut runner = Runner {
        input,
        rng: input.rng,
        choice: FactoryAiSwitchChoice::NoSwitch,
        draws: Vec::new(),
        branches: Vec::new(),
    };

    let hard_gates = [
        (
            FactoryAiSwitchBranchKind::WrappedOrEscapePrevented,
            active.status2 & (STATUS2_WRAPPED | STATUS2_ESCAPE_PREVENTION) != 0,
        ),
        (
            FactoryAiSwitchBranchKind::Rooted,
            active.status3 & STATUS3_ROOTED != 0,
        ),
        (
            FactoryAiSwitchBranchKind::ShadowTag,
            target.ability == ABILITY_SHADOW_TAG,
        ),
        (
            FactoryAiSwitchBranchKind::ArenaTrap,
            target.ability == ABILITY_ARENA_TRAP,
        ),
        (
            FactoryAiSwitchBranchKind::MagnetPullSteel,
            rules.battlers[..2]
                .iter()
                .enumerate()
                .any(|(index, battler)| {
                    rules.absent_battler_flags & (1 << index) == 0
                        && battler.ability == ABILITY_MAGNET_PULL
                })
                && active.types.contains(&TYPE_STEEL),
        ),
        (
            FactoryAiSwitchBranchKind::BattleArena,
            rules.battle_type_flags & BATTLE_TYPE_ARENA != 0,
        ),
    ];
    for (branch, blocked) in hard_gates {
        runner.branch(
            branch,
            if blocked {
                FactoryAiSwitchBranchOutcome::Blocked
            } else {
                FactoryAiSwitchBranchOutcome::Pass
            },
            None,
        );
        if blocked {
            return Ok(runner.result(None));
        }
    }

    let available = rules
        .opponent_party
        .iter()
        .enumerate()
        .filter(|(index, member)| {
            legal_available_member(
                **member,
                *index,
                active.party_index,
                rules.reserved_party_index,
            )
        })
        .count();
    runner.branch(
        FactoryAiSwitchBranchKind::AvailableBench,
        if available == 0 {
            FactoryAiSwitchBranchOutcome::None
        } else {
            FactoryAiSwitchBranchOutcome::Pass
        },
        None,
    );
    if available == 0 {
        return Ok(runner.result(None));
    }

    if active.status3 & STATUS3_PERISH_SONG != 0 && active.perish_song_timer == 0 {
        runner.select(None);
        runner.branch(
            FactoryAiSwitchBranchKind::PerishSong,
            FactoryAiSwitchBranchOutcome::Selected,
            None,
        );
    } else {
        runner.branch(
            FactoryAiSwitchBranchKind::PerishSong,
            FactoryAiSwitchBranchOutcome::None,
            None,
        );
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let mut selected = None;
        let active_has_se = runner.active_has_super_effective_move();
        if target.ability == ABILITY_WONDER_GUARD && !active_has_se {
            'party: for (party_index, member) in rules.opponent_party.into_iter().enumerate() {
                // Source quirk: Wonder Guard's scan does not exclude the reserved id.
                if member.hp == 0
                    || member.species == 0
                    || member.is_egg
                    || party_index as u8 == active.party_index
                {
                    continue;
                }
                for (move_slot, move_id) in member.moves.into_iter().enumerate() {
                    if move_id != MOVE_NONE
                        && ai_type_calc(move_id, target.species, target.ability).super_effective
                        && runner.draw(
                            FactoryAiSwitchDrawKind::WonderGuardCandidate,
                            format!("wonder-guard-party-{party_index}-move-{move_slot}"),
                            3,
                            |remainder| remainder < 2,
                            Some(party_index as u8),
                            Some(move_slot as u8),
                        )
                    {
                        selected = Some(party_index as u8);
                        runner.select(selected);
                        break 'party;
                    }
                }
            }
        }
        runner.branch(
            FactoryAiSwitchBranchKind::WonderGuard,
            if selected.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            selected,
        );
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let mut selected = None;
        let mut continue_absorber = true;
        if runner.active_has_super_effective_move() {
            continue_absorber = runner.draw(
                FactoryAiSwitchDrawKind::AbsorberActiveSuperEffective,
                "absorber-active-super-effective-reluctance".to_owned(),
                3,
                |remainder| remainder == 0,
                None,
                None,
            );
        }
        let absorbing_ability = gen_tables::MOVES
            .get(usize::from(rules.last_landed_move))
            .filter(|row| row.power != 0)
            .and_then(|row| match row.move_type {
                TYPE_FIRE => Some(ABILITY_FLASH_FIRE),
                TYPE_WATER => Some(ABILITY_WATER_ABSORB),
                TYPE_ELECTRIC => Some(ABILITY_VOLT_ABSORB),
                _ => None,
            });
        if continue_absorber
            && rules.last_landed_move != MOVE_NONE
            && rules.last_landed_move != MOVE_UNAVAILABLE
            && absorbing_ability.is_some()
            && absorbing_ability != Some(active.ability)
        {
            for (party_index, member) in rules.opponent_party.into_iter().enumerate() {
                if legal_available_member(
                    member,
                    party_index,
                    active.party_index,
                    rules.reserved_party_index,
                ) && party_ability(member) == absorbing_ability.unwrap_or(0)
                    && runner.draw(
                        FactoryAiSwitchDrawKind::AbsorberCandidate,
                        format!("absorber-party-{party_index}"),
                        2,
                        |remainder| remainder != 0,
                        Some(party_index as u8),
                        None,
                    )
                {
                    selected = Some(party_index as u8);
                    runner.select(selected);
                    break;
                }
            }
        }
        runner.branch(
            FactoryAiSwitchBranchKind::Absorber,
            if selected.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            selected,
        );
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let mut selected = None;
        if active.status1 & STATUS1_SLEEP != 0
            && active.ability == ABILITY_NATURAL_CURE
            && active.hp >= active.max_hp / 2
        {
            let early_selected = (rules.last_landed_move == MOVE_NONE
                || rules.last_landed_move == MOVE_UNAVAILABLE)
                && runner.draw(
                    FactoryAiSwitchDrawKind::NaturalCureEarly,
                    "natural-cure-no-usable-last-move".to_owned(),
                    2,
                    |remainder| remainder != 0,
                    None,
                    None,
                );
            let status_selected = !early_selected
                && gen_tables::MOVES
                    .get(usize::from(rules.last_landed_move))
                    .map_or(0, |row| row.power)
                    == 0
                && runner.draw(
                    FactoryAiSwitchDrawKind::NaturalCureStatusMove,
                    "natural-cure-zero-power-last-move".to_owned(),
                    2,
                    |remainder| remainder != 0,
                    None,
                    None,
                );
            if early_selected || status_selected {
                runner.select(None);
                selected = Some(PARTY_SIZE_SENTINEL);
            }
            if selected.is_none() {
                let defensive = runner
                    .find_defensive_candidate(
                        true,
                        1,
                        FactoryAiSwitchDrawKind::NaturalCureDefensive,
                    )
                    .or_else(|| {
                        runner.find_defensive_candidate(
                            false,
                            1,
                            FactoryAiSwitchDrawKind::NaturalCureDefensive,
                        )
                    });
                if let Some(party_index) = defensive {
                    runner.select(Some(party_index));
                    selected = Some(party_index);
                } else if runner.draw(
                    FactoryAiSwitchDrawKind::NaturalCureFinal,
                    "natural-cure-final-coin".to_owned(),
                    2,
                    |remainder| remainder != 0,
                    None,
                    None,
                ) {
                    runner.select(None);
                    selected = Some(PARTY_SIZE_SENTINEL);
                }
            }
        }
        runner.branch(
            FactoryAiSwitchBranchKind::NaturalCure,
            if selected.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            match runner.choice {
                FactoryAiSwitchChoice::Chosen { party_index } => Some(party_index),
                _ => None,
            },
        );
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let mut suppressed = false;
        for (move_slot, move_id) in active.moves.into_iter().enumerate() {
            if move_id != MOVE_NONE
                && ai_type_calc(move_id, target.species, target.ability).super_effective
                && runner.draw(
                    FactoryAiSwitchDrawKind::ActiveSuperEffective,
                    format!("active-super-effective-move-{move_slot}"),
                    10,
                    |remainder| remainder != 0,
                    None,
                    Some(move_slot as u8),
                )
            {
                suppressed = true;
                break;
            }
        }
        runner.branch(
            FactoryAiSwitchBranchKind::ActiveSuperEffective,
            if suppressed {
                FactoryAiSwitchBranchOutcome::Suppressed
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            None,
        );
        if suppressed {
            return Ok(runner.result(None));
        }
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let boosts: i32 = active
            .stat_stages
            .into_iter()
            .map(|stage| (stage - DEFAULT_STAT_STAGE).max(0))
            .sum();
        let suppressed = boosts > 3;
        runner.branch(
            FactoryAiSwitchBranchKind::StatsRaised,
            if suppressed {
                FactoryAiSwitchBranchOutcome::Suppressed
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            None,
        );
        if suppressed {
            return Ok(runner.result(None));
        }
    }

    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let immune =
            runner.find_defensive_candidate(true, 2, FactoryAiSwitchDrawKind::ImmunityFallback);
        runner.branch(
            FactoryAiSwitchBranchKind::ImmunityFallback,
            if immune.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            immune,
        );
        if let Some(party_index) = immune {
            runner.select(Some(party_index));
        }
    }
    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        let nve = runner.find_defensive_candidate(
            false,
            3,
            FactoryAiSwitchDrawKind::NotVeryEffectiveFallback,
        );
        runner.branch(
            FactoryAiSwitchBranchKind::NotVeryEffectiveFallback,
            if nve.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            nve,
        );
        if let Some(party_index) = nve {
            runner.select(Some(party_index));
        }
    }
    if runner.choice == FactoryAiSwitchChoice::NoSwitch {
        return Ok(runner.result(None));
    }

    let helper_choice = runner.choice;
    let mut selected_party_index = match helper_choice {
        FactoryAiSwitchChoice::Chosen { party_index } => Some(party_index),
        _ => None,
    };
    if helper_choice == FactoryAiSwitchChoice::Sentinel {
        let bench: BattleAiSwitchBench =
            rules
                .opponent_party
                .map(|member| BattleAiSwitchBenchMember {
                    species: member.species,
                    hp: member.hp,
                    types: species_types(member.species),
                    moves: member.moves,
                });
        let fallback = input
            .suitable_damage_fallback
            .unwrap_or(BattleAiSwitchDamageFallback {
                base_damage: 0,
                active_types: active.types,
                opposing_types: target.types,
                opposing_ability: target.ability,
                opposing_status2: target.status2,
            });
        match get_most_suitable_mon_to_switch_into(
            &bench,
            active.party_index,
            target.types,
            Some(fallback),
        ) {
            BattleAiSwitchIntoResult::Resolved { party_index }
                if party_index < PARTY_SIZE_SENTINEL =>
            {
                selected_party_index = Some(party_index);
                runner.branch(
                    FactoryAiSwitchBranchKind::SuitableSelector,
                    FactoryAiSwitchBranchOutcome::Selected,
                    selected_party_index,
                );
            }
            _ => runner.branch(
                FactoryAiSwitchBranchKind::SuitableSelector,
                FactoryAiSwitchBranchOutcome::None,
                None,
            ),
        }
    }
    if selected_party_index.is_none() {
        selected_party_index =
            rules
                .opponent_party
                .iter()
                .enumerate()
                .find_map(|(party_index, member)| {
                    legal_available_member(
                        *member,
                        party_index,
                        active.party_index,
                        rules.reserved_party_index,
                    )
                    .then_some(party_index as u8)
                });
        runner.branch(
            FactoryAiSwitchBranchKind::FirstLegalFallback,
            if selected_party_index.is_some() {
                FactoryAiSwitchBranchOutcome::Selected
            } else {
                FactoryAiSwitchBranchOutcome::None
            },
            selected_party_index,
        );
    }

    Ok(runner.result(selected_party_index))
}
