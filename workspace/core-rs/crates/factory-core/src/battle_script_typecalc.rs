//! Pure `B_SCR_OP_TYPECALC` (0x06, `Cmd_typecalc`) Battle Script opcode leaf
//! -- the native twin of `typecalcOpcodeHandler` in
//! `src/engine/battleScriptHitChainOpcode.ts:1631-1710` (doc comment
//! `:1628-1645`). Owns STAB, the Levitate/Ground short-circuit, the
//! type-effectiveness loop's per-entry `MOVE_RESULT_*` flag algebra, the
//! Foresight-vs-Ghost skip, and Wonder Guard's own miss branch. RNG-free, no
//! operand, no jump, no scheduler, no events.
//!
//! ## Evaluation order (exact; each step's error/branch preempts later ones)
//! 1. `currentMove == 165` (`BATTLE_SCRIPT_MOVE_STRUGGLE`) -> advance with
//!    rules untouched, BEFORE any role check.
//! 2. `requireBattlerRole` attacker, then target -- `"Battle Script
//!    hit-chain command requires a attacker/target role"`.
//! 3. `requireMoveRow(move)` -- `"accuracycheck/ppreduce: move <N> has no
//!    source-derived gBattleMoves row"`. Fires BEFORE type resolution --
//!    the OPPOSITE precedence from `battle_script_damagecalc.rs`, where the
//!    pre-helper type lookup runs first.
//! 4. `resolveMoveTypeName` (dynamic-type-aware; reuses
//!    [`crate::battle_script_base_damage::resolve_move_type`]) --
//!    `"accuracycheck: unknown numeric type id <N>"` for a masked id > 17.
//! 5. `damage := applyStab(battleMoveDamage, attacker.types, moveType)` --
//!    STAB always applies, even on the Levitate branch.
//! 6. If `target.ability == 26` (Levitate) && `moveType == TYPE_GROUND` (4):
//!    reveal Levitate on the target, OR in `MISSED|DOESNT_AFFECT_FOE`,
//!    clear landed-move cells at the target, `missType := 4`. SKIP the
//!    whole type loop.
//! 7. Else the type loop over distinct defender types (dual-type dedup):
//!    skip a def type when the target has `STATUS2_FORESIGHT` (`1<<29`),
//!    `defType == TYPE_GHOST` (7), and `moveType` is Normal (0) or Fighting
//!    (1); else find-FIRST `(moveType, defType)` in
//!    [`crate::gen_tables::TYPE_EFFECTIVENESS_TABLE`] -- missing = neutral
//!    no-op; found -> `damage = trunc(damage*tenths/10)`, min-1 when
//!    `tenths != 0` and damage hits 0; per-entry flag algebra: `tenths==0`
//!    sets `DOESNT_AFFECT_FOE` and clears both SE/NVE; `tenths==5`/`==20`
//!    only touch flags when `moveRow.power != 0 &&
//!    (flags & MOVE_RESULT_NO_EFFECT) == 0`, toggling SE/NVE symmetrically.
//! 8. Wonder Guard (runs AFTER the Levitate branch too, outside the
//!    if/else): `target.ability == 25 && moveRow.power != 0 && (SE not set
//!    || (SE and NVE both set))` -> reveal Wonder Guard, OR in `MISSED`,
//!    clear landed-move cells at the target, `missType := 3`.
//! 9. Write back damage/flags/missType/lastUsedAbility/moveHistory; if the
//!    final flags carry `DOESNT_AFFECT_FOE`, set the ATTACKER's
//!    `targetNotAffected := 1`; apply the ability reveal (identity
//!    semantics) if step 6 or 8 fired. Always advance.
//!
//! Source authority:
//! - Handler: `reference/pokeemerald/src/battle_script_commands.c:1355-1420`
//!   (`Cmd_typecalc`); `ModulateDmgByType` `:1321-1326`; dispatch row
//!   `:337` (`//0x6`); forward declaration `:85`.
//! - Opcode enum position `include/constants/battle_script_commands.h:12`.
//! - Macro: `asm/macros/battle_script.inc:28-30` -- a single `.byte
//!   B_SCR_OP_TYPECALC`, no operand.
//! - `STATUS2_FORESIGHT` `include/constants/battle.h:153`; `MOVE_RESULT_*`
//!   bits `:220-223`; `TYPE_FORESIGHT` sentinel `include/battle_main.h:37`,
//!   `gTypeEffectiveness[336]` `src/battle_main.c:335`.
//! - 23 bare `typecalc` call sites in `data/battle_scripts_1.s` (grep
//!   count).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_ai_reveal::{
    record_battle_script_ability_reveal, BattleScriptAiRevealBattler, BattleScriptAiRevealRules,
};
use crate::battle_script_base_damage::{resolve_move_type, BattleScriptBaseDamageError};
use crate::damage_calc::{apply_stab, TYPE_FIGHTING, TYPE_GHOST, TYPE_GROUND, TYPE_NORMAL};
use crate::gen_tables::{MOVES, TYPE_EFFECTIVENESS_TABLE};

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TYPECALC_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_TYPECALC` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TYPECALC_OPCODE: u8 = 0x06;
pub const BATTLE_SCRIPT_TYPECALC_OPCODE_NAME: &str = "B_SCR_OP_TYPECALC";
pub const BATTLE_SCRIPT_TYPECALC_DISPATCHER: &str = "Cmd_typecalc";
/// `typecalc`'s encoded byte width: opcode byte only, no operand.
pub const BATTLE_SCRIPT_TYPECALC_ENCODED_WIDTH_BYTES: u8 = 1;

/// `battleScriptSourceConstants.ts:158` -- `BATTLE_SCRIPT_MOVE_STRUGGLE`.
pub const BATTLE_SCRIPT_TYPECALC_MOVE_STRUGGLE: u16 = 165;
/// `battleScriptSourceConstants.ts:116` -- `include/constants/battle.h:153`.
pub const BATTLE_SCRIPT_TYPECALC_STATUS2_FORESIGHT: u32 = 1 << 29;
/// `hitChainOpcode.ts:148` -- `ABILITY_LEVITATE`.
pub const BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE: u16 = 26;
/// `hitChainOpcode.ts:147` -- `ABILITY_WONDER_GUARD`.
pub const BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD: u16 = 25;

pub const BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED: u32 = 1 << 0;
pub const BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE: u32 = 1 << 1;
pub const BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE: u32 = 1 << 2;
pub const BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE: u32 = 1 << 3;
/// `battleScriptSetByte.ts` ATOMIC_VALUES = 41 -- `MISSED|DOESNT_AFFECT_FOE|(1<<5)`.
pub const BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NO_EFFECT: u32 = (1 << 0) | (1 << 3) | (1 << 5);

/// `hitChainOpcode.ts:218-224` -- miss-message selectors.
pub const BATTLE_SCRIPT_TYPECALC_B_MSG_AVOIDED_DMG: u8 = 3;
pub const BATTLE_SCRIPT_TYPECALC_B_MSG_GROUND_MISS: u8 = 4;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTypecalcBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptTypecalcBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }

    /// `BattleScriptAiRevealBattler` shares the same four-slot source
    /// domain, so this is an identity re-tag rather than a lookup.
    #[must_use]
    pub const fn as_ai_reveal_battler(self) -> BattleScriptAiRevealBattler {
        match self {
            Self::Battler0 => BattleScriptAiRevealBattler::Battler0,
            Self::Battler1 => BattleScriptAiRevealBattler::Battler1,
            Self::Battler2 => BattleScriptAiRevealBattler::Battler2,
            Self::Battler3 => BattleScriptAiRevealBattler::Battler3,
        }
    }
}

/// The complete per-battler projection this leaf reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcBattlerState {
    pub types: [u8; 2],
    pub ability: u16,
    pub status2: u32,
    /// `ProtectStruct::targetNotAffected`; written only on the attacker's
    /// cell when the final flags carry `DOESNT_AFFECT_FOE`.
    pub target_not_affected: u8,
}

/// `withClearedLandedMove`'s twin source arrays
/// (`battleScriptHitChainOpcode.ts:807-819`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcMoveHistory {
    pub last_landed_moves: [u16; BATTLE_SCRIPT_TYPECALC_BATTLER_COUNT],
    pub last_hit_by_type: [u16; BATTLE_SCRIPT_TYPECALC_BATTLER_COUNT],
}

/// Canonical selector bindings, checked attacker-then-target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcRoles {
    pub attacker: Option<BattleScriptTypecalcBattler>,
    pub target: Option<BattleScriptTypecalcBattler>,
}

/// Complete narrow rules slice this leaf reads or writes. No scheduler and
/// no events -- the canonical handler emits neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcRules {
    pub battlers: [BattleScriptTypecalcBattlerState; BATTLE_SCRIPT_TYPECALC_BATTLER_COUNT],
    pub current_move: u16,
    pub dynamic_move_type: u8,
    pub battle_move_damage: i32,
    pub move_result_flags: u32,
    pub miss_type: u8,
    pub last_used_ability: u16,
    pub move_history: BattleScriptTypecalcMoveHistory,
    /// Composed, not duplicated: the same identity-write ability/item
    /// observation cells `battle_script_ai_reveal.rs` owns.
    pub ai_reveal: BattleScriptAiRevealRules,
    pub selector_roles: BattleScriptTypecalcRoles,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTypecalcError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `requireMoveRow` (`:126-131`) -- fires BEFORE type resolution here.
    UnknownMoveRow { move_id: u16 },
    /// `resolveMoveTypeName`'s own `TYPE_NAME_BY_ID` bound (`:139-144`).
    UnknownTypeId { type_id: u8 },
}

impl fmt::Display for BattleScriptTypecalcError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "accuracycheck/ppreduce: move {move_id} has no source-derived gBattleMoves row"
            ),
            Self::UnknownTypeId { type_id } => write!(
                formatter,
                "accuracycheck: unknown numeric type id {type_id}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTypecalcError {}

/// One committed-program instruction projection, used ONLY for
/// registration. No shape or cardinality validation exists at registration
/// or execution -- the canonical `install()` line never checks operands
/// (`battleScriptHitChainOpcode.ts:4700-4717`), so this leaf faithfully
/// omits any shape check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
}

/// `committed Battle Script program does not emit B_SCR_OP_TYPECALC`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypecalcRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptTypecalcRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptTypecalcRegistrationError {}

/// Native projection of the `install("B_SCR_OP_TYPECALC", ...)` line inside
/// `createBattleScriptHitChainOpcodeHandlers`: find the FIRST instruction
/// with this opcode name -- no shape or cardinality validation.
pub fn register_battle_script_typecalc<'a>(
    instructions: &[BattleScriptTypecalcInstruction<'a>],
) -> Result<u8, BattleScriptTypecalcRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TYPECALC_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptTypecalcRegistrationError {
            opcode_name: BATTLE_SCRIPT_TYPECALC_OPCODE_NAME,
        })
}

fn clear_landed_move(
    history: BattleScriptTypecalcMoveHistory,
    target: BattleScriptTypecalcBattler,
) -> BattleScriptTypecalcMoveHistory {
    let mut next = history;
    next.last_landed_moves[target.index()] = 0;
    next.last_hit_by_type[target.index()] = 0;
    next
}

fn is_wonder_guard_ability(ability: u16) -> bool {
    ability == BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD
}

/// Native immutable-value twin of `typecalcOpcodeHandler`. See the module
/// doc comment for the complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptTypecalcError`] for the exact ordered error set.
pub fn apply_battle_script_typecalc(
    rules: &BattleScriptTypecalcRules,
) -> Result<BattleScriptTypecalcRules, BattleScriptTypecalcError> {
    if rules.current_move == BATTLE_SCRIPT_TYPECALC_MOVE_STRUGGLE {
        return Ok(*rules);
    }

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTypecalcError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTypecalcError::MissingTargetRole)?;

    let move_row = MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptTypecalcError::UnknownMoveRow { move_id: rules.current_move })?;

    let move_type = match resolve_move_type(move_row.move_type, rules.dynamic_move_type) {
        Ok(id) => id,
        Err(BattleScriptBaseDamageError::UnknownTypeId { type_id }) => {
            return Err(BattleScriptTypecalcError::UnknownTypeId { type_id });
        }
        Err(other) => unreachable!("resolve_move_type only ever returns UnknownTypeId: {other}"),
    };

    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];

    let mut damage = apply_stab(rules.battle_move_damage, attacker_state.types, move_type);
    let mut flags = rules.move_result_flags;
    let mut miss_type = rules.miss_type;
    let mut last_used_ability = rules.last_used_ability;
    let mut move_history = rules.move_history;
    let mut revealed_ability: Option<u16> = None;

    if target_state.ability == BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE && move_type == TYPE_GROUND {
        last_used_ability = BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE;
        revealed_ability = Some(BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE);
        flags |= BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED
            | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE;
        move_history = clear_landed_move(move_history, target);
        miss_type = BATTLE_SCRIPT_TYPECALC_B_MSG_GROUND_MISS;
    } else {
        let has_foresight = (target_state.status2 & BATTLE_SCRIPT_TYPECALC_STATUS2_FORESIGHT) != 0;
        let types = target_state.types;
        let distinct_types: &[u8] = if types[0] == types[1] {
            &types[..1]
        } else {
            &types[..]
        };
        for &def_type in distinct_types {
            if has_foresight
                && def_type == TYPE_GHOST
                && (move_type == TYPE_NORMAL || move_type == TYPE_FIGHTING)
            {
                continue;
            }
            let Some(entry) = TYPE_EFFECTIVENESS_TABLE.iter().find(|entry| {
                entry.attacking_type == move_type && entry.defending_type == def_type
            }) else {
                continue;
            };
            damage = (damage * entry.multiplier_tenths) / 10;
            if damage == 0 && entry.multiplier_tenths != 0 {
                damage = 1;
            }
            if entry.multiplier_tenths == 0 {
                flags = (flags | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE)
                    & !BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE
                    & !BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE;
            } else if entry.multiplier_tenths == 5 {
                if move_row.power != 0
                    && (flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NO_EFFECT) == 0
                {
                    if (flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE) != 0 {
                        flags &= !BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE;
                    } else {
                        flags |= BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE;
                    }
                }
            } else if entry.multiplier_tenths == 20
                && move_row.power != 0
                && (flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NO_EFFECT) == 0
            {
                if (flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE) != 0 {
                    flags &= !BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE;
                } else {
                    flags |= BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE;
                }
            }
        }
    }

    if is_wonder_guard_ability(target_state.ability)
        && move_row.power != 0
        && ((flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE) == 0
            || (flags
                & (BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE
                    | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE))
                == (BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE
                    | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE))
    {
        last_used_ability = BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD;
        revealed_ability = Some(BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD);
        flags |= BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED;
        move_history = clear_landed_move(move_history, target);
        miss_type = BATTLE_SCRIPT_TYPECALC_B_MSG_AVOIDED_DMG;
    }

    let mut next = *rules;
    next.battle_move_damage = damage;
    next.move_result_flags = flags;
    next.miss_type = miss_type;
    next.last_used_ability = last_used_ability;
    next.move_history = move_history;

    if (flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE) != 0 {
        next.battlers[attacker.index()].target_not_affected = 1;
    }
    if let Some(ability) = revealed_ability {
        next.ai_reveal = record_battle_script_ability_reveal(
            &next.ai_reveal,
            target.as_ai_reveal_battler(),
            ability as u8,
        );
    }

    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::TYPE_ROCK;

    fn battler(types: [u8; 2], ability: u16) -> BattleScriptTypecalcBattlerState {
        BattleScriptTypecalcBattlerState { types, ability, status2: 0, target_not_affected: 0 }
    }

    fn rules() -> BattleScriptTypecalcRules {
        BattleScriptTypecalcRules {
            battlers: [
                battler([TYPE_NORMAL, TYPE_NORMAL], 0),
                battler([TYPE_NORMAL, TYPE_NORMAL], 0),
                battler([TYPE_NORMAL, TYPE_NORMAL], 0),
                battler([TYPE_NORMAL, TYPE_NORMAL], 0),
            ],
            current_move: 33, // TACKLE, TYPE_NORMAL, power 35
            dynamic_move_type: 0,
            battle_move_damage: 10,
            move_result_flags: 0,
            miss_type: 0,
            last_used_ability: 0,
            move_history: BattleScriptTypecalcMoveHistory {
                last_landed_moves: [1, 2, 3, 4],
                last_hit_by_type: [5, 6, 7, 8],
            },
            ai_reveal: BattleScriptAiRevealRules::default(),
            selector_roles: BattleScriptTypecalcRoles {
                attacker: Some(BattleScriptTypecalcBattler::Battler0),
                target: Some(BattleScriptTypecalcBattler::Battler1),
            },
        }
    }

    #[test]
    fn struggle_advances_with_no_roles_set() {
        let mut r = rules();
        r.current_move = BATTLE_SCRIPT_TYPECALC_MOVE_STRUGGLE;
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        assert_eq!(apply_battle_script_typecalc(&r), Ok(r));
    }

    #[test]
    fn missing_attacker_role_checked_before_target() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_typecalc(&r),
            Err(BattleScriptTypecalcError::MissingAttackerRole)
        );
    }

    #[test]
    fn unknown_move_row_fires_before_type_resolution() {
        let mut r = rules();
        r.current_move = 60000;
        r.dynamic_move_type = 0x3f; // would otherwise be an out-of-range type id
        assert_eq!(
            apply_battle_script_typecalc(&r),
            Err(BattleScriptTypecalcError::UnknownMoveRow { move_id: 60000 })
        );
    }

    #[test]
    fn unknown_dynamic_type_id_errors() {
        let mut r = rules();
        r.dynamic_move_type = 0x3f; // masks to 63, out of the 0..=17 domain
        assert_eq!(
            apply_battle_script_typecalc(&r),
            Err(BattleScriptTypecalcError::UnknownTypeId { type_id: 63 })
        );
    }

    #[test]
    fn stab_applies_before_the_levitate_branch() {
        let mut r = rules();
        r.battlers[0].types = [TYPE_GROUND, TYPE_NORMAL]; // STAB vs the RESOLVED (Ground) type
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE;
        r.dynamic_move_type = TYPE_GROUND;
        let result = apply_battle_script_typecalc(&r).unwrap();
        // 10 * 15 / 10 = 15, STAB applies even though the move misses.
        assert_eq!(result.battle_move_damage, 15);
        assert_eq!(
            result.move_result_flags,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED
                | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE
        );
        assert_eq!(result.miss_type, BATTLE_SCRIPT_TYPECALC_B_MSG_GROUND_MISS);
        assert_eq!(
            result.last_used_ability,
            BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE
        );
        assert_eq!(
            result.move_history.last_landed_moves[1], 0,
            "landed-move cell cleared only at target"
        );
        assert_eq!(result.move_history.last_hit_by_type[1], 0);
        assert_eq!(
            result.move_history.last_landed_moves[0], 1,
            "other cells retained"
        );
        assert_eq!(result.battlers[0].target_not_affected, 1);
    }

    #[test]
    fn levitate_reveal_is_identity_when_already_observed() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE;
        r.dynamic_move_type = TYPE_GROUND;
        r.ai_reveal.ai_observed_ability_ids[1] = BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE as u8;
        let before = r.ai_reveal;
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(result.ai_reveal, before);
    }

    #[test]
    fn levitate_reveal_writes_when_previously_unobserved() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE;
        r.dynamic_move_type = TYPE_GROUND;
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.ai_reveal.ai_observed_ability_ids[1],
            BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE as u8
        );
    }

    #[test]
    fn immune_matchup_clears_prior_super_and_not_very_effective_flags() {
        let mut r = rules();
        r.move_result_flags = BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE
            | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE;
        r.current_move = 33; // TACKLE, TYPE_NORMAL
        r.battlers[1].types = [TYPE_GHOST, TYPE_GHOST]; // Normal is 0x immune to Ghost
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_DOESNT_AFFECT_FOE
        );
        assert_eq!(result.battle_move_damage, 0);
    }

    #[test]
    fn not_very_effective_toggles_super_effective_off_then_sets_not_very_effective() {
        let mut r = rules();
        r.current_move = 84; // THUNDERBOLT, TYPE_ELECTRIC, power != 0
        r.battlers[1].types = [TYPE_GROUND, TYPE_GROUND]; // Electric is 0x vs Ground... use a real 0.5x pair instead
                                                          // Electric vs Ground is immune (0x) in Gen 3; pick Electric vs Electric (0.5x) instead.
        r.battlers[1].types = [13, 13];
        r.move_result_flags = BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE;
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags, 0,
            "SE cleared, NVE not set on this transition"
        );
    }

    #[test]
    fn not_very_effective_sets_flag_when_super_effective_absent() {
        let mut r = rules();
        r.current_move = 84; // THUNDERBOLT, TYPE_ELECTRIC
        r.battlers[1].types = [13, 13]; // Electric vs Electric: 0.5x
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE
        );
    }

    #[test]
    fn super_effective_symmetric_toggle() {
        let mut r = rules();
        r.current_move = 84; // THUNDERBOLT, TYPE_ELECTRIC
        r.battlers[1].types = [11, 11]; // Electric vs Water: 2x
        r.move_result_flags = BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE;
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags, 0,
            "NVE cleared, SE not set on this transition"
        );

        let mut r2 = rules();
        r2.current_move = 84;
        r2.battlers[1].types = [11, 11];
        let result2 = apply_battle_script_typecalc(&r2).unwrap();
        assert_eq!(
            result2.move_result_flags,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE
        );
    }

    #[test]
    fn power_zero_move_skips_flag_writes_but_not_damage() {
        let mut r = rules();
        r.current_move = 0; // move id 0: TYPE_NORMAL, power 0
        r.battlers[0].types = [11, 11]; // non-Normal attacker: isolate from STAB
        r.battlers[1].types = [TYPE_ROCK, TYPE_ROCK]; // Normal vs Rock: 0.5x table row
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.battle_move_damage, 5,
            "damage still scales by the 0.5x row"
        );
        assert_eq!(
            result.move_result_flags, 0,
            "power == 0 skips the NOT_VERY_EFFECTIVE flag write"
        );
    }

    #[test]
    fn foresight_skips_ghost_row_for_normal_and_fighting_only() {
        let mut r = rules();
        r.battlers[0].types = [11, 11]; // non-Normal attacker: isolate from STAB
        r.battlers[1].status2 = BATTLE_SCRIPT_TYPECALC_STATUS2_FORESIGHT;
        r.battlers[1].types = [TYPE_GHOST, TYPE_GHOST];
        r.current_move = 33; // TACKLE, TYPE_NORMAL
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.battle_move_damage, 10,
            "Ghost row skipped, neutral damage"
        );
        assert_eq!(result.move_result_flags, 0);
    }

    #[test]
    fn foresight_does_not_skip_ghost_row_for_other_move_types() {
        let mut r = rules();
        r.battlers[1].status2 = BATTLE_SCRIPT_TYPECALC_STATUS2_FORESIGHT;
        r.battlers[1].types = [TYPE_GHOST, TYPE_GHOST];
        r.current_move = 44; // a TYPE_DARK move (id 44), 2x super effective vs Ghost
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_ne!(
            result.battle_move_damage, 10,
            "Ghost row NOT skipped for non-Normal/Fighting"
        );
    }

    #[test]
    fn wonder_guard_misses_when_not_super_effective() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD;
        r.current_move = 33; // TACKLE, TYPE_NORMAL, neutral vs Normal
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED
        );
        assert_eq!(result.miss_type, BATTLE_SCRIPT_TYPECALC_B_MSG_AVOIDED_DMG);
        assert_eq!(
            result.last_used_ability,
            BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD
        );
    }

    #[test]
    fn wonder_guard_does_not_miss_when_super_effective_only() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD;
        r.current_move = 84; // THUNDERBOLT
        r.battlers[1].types = [11, 11]; // 2x
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED,
            0
        );
    }

    #[test]
    fn wonder_guard_misses_when_super_and_not_very_both_preset() {
        // The type loop's own toggle algebra always cancels a 0.5x+2x dual-type
        // pair back to neutral flags, so the "both set" branch of the Wonder
        // Guard guard is only exercised via flags already carrying both bits
        // into typecalc. Use a neutral (Normal-vs-Normal) matchup so the loop
        // is a no-op and the preset flags pass through untouched.
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD;
        r.current_move = 33; // TACKLE, TYPE_NORMAL, power 35 != 0
        r.battlers[1].types = [TYPE_NORMAL, TYPE_NORMAL];
        r.move_result_flags = BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_SUPER_EFFECTIVE
            | BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_NOT_VERY_EFFECTIVE;
        let result = apply_battle_script_typecalc(&r).unwrap();
        assert_eq!(
            result.move_result_flags & BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED,
            BATTLE_SCRIPT_TYPECALC_MOVE_RESULT_MISSED
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptTypecalcBattler::from_u8(value).unwrap().as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptTypecalcBattler::from_u8(4), None);
    }

    #[test]
    fn registration_finds_first_and_ignores_shape() {
        let instructions = [
            BattleScriptTypecalcInstruction {
                opcode_name: "B_SCR_OP_OTHER",
                opcode_id: 0x01,
                program_counter: 10,
            },
            BattleScriptTypecalcInstruction {
                opcode_name: BATTLE_SCRIPT_TYPECALC_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_TYPECALC_OPCODE,
                program_counter: 20,
            },
            BattleScriptTypecalcInstruction {
                opcode_name: BATTLE_SCRIPT_TYPECALC_OPCODE_NAME,
                opcode_id: 0xff,
                program_counter: 30,
            },
        ];
        assert_eq!(
            register_battle_script_typecalc(&instructions),
            Ok(BATTLE_SCRIPT_TYPECALC_OPCODE)
        );

        let missing = [BattleScriptTypecalcInstruction {
            opcode_name: "B_SCR_OP_OTHER",
            opcode_id: 0x01,
            program_counter: 10,
        }];
        assert_eq!(
            register_battle_script_typecalc(&missing)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_TYPECALC"
        );
    }
}
