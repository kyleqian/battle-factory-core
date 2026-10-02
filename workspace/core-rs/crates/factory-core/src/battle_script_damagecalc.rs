//! Pure `B_SCR_OP_DAMAGECALC` (0x05, `Cmd_damagecalc`) Battle Script opcode
//! leaf -- the deliberately narrow native twin of the `damagecalcOpcodeHandler`
//! export in `src/engine/battleScriptHitChainOpcode.ts:1602-1626` (doc
//! comment `:1583-1601`). This is the THIRD consumer of the shared
//! `battle_script_base_damage` helper (M72), composed rather than
//! duplicated: it forwards a sub-slice of its own rules to
//! [`crate::battle_script_base_damage::calculate_battle_script_base_damage_for_current_move`]
//! and reuses that module's own
//! [`crate::battle_script_base_damage::resolve_move_type`] for its own
//! pre-helper type resolution (see below). No operand, no jump branch, no
//! scheduler, no events, no RNG -- the handler only writes
//! `battleMoveDamage` and advances.
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. `requireBattlerRole(rules, "attacker")` --
//!    `"Battle Script hit-chain command requires a attacker role"`.
//! 2. Pre-helper move-type resolution, `resolveMoveTypeName(rulesContext,
//!    currentMove)` (`battleScriptHitChainOpcode.ts:139-144`), which calls
//!    `resolveBattleScriptMoveType` (`battleScriptRulesContext.ts:1288-1300`):
//!    an unknown `currentMove` throws `"currentMove <N> has no
//!    source-derived gBattleMoves type"` -- a DIFFERENT error text than the
//!    helper's own `"accuracycheck/ppreduce: move <N> has no source-derived
//!    gBattleMoves row"`, and it fires FIRST because this step runs before
//!    the helper is ever called. Both rely on the same `moves.json`-derived
//!    domain, so this step's own move lookup already proves the helper's
//!    lookup would have succeeded. A 0x3f-masked dynamic type outside
//!    `0..=17` throws `"accuracycheck: unknown numeric type id <N>"` --
//!    this leaf reuses the helper's own `resolve_move_type` for the
//!    mask-and-range-check so that message is never duplicated by hand.
//! 3. `calculateBattleScriptBaseDamageForCurrentMove(rules)` -- helper
//!    errors propagate verbatim (missing target role, unknown move row --
//!    unreachable here since step 2 already proved the move row exists,
//!    unknown type id -- likewise unreachable, out-of-range item id).
//! 4. `damage = helperResult * critMultiplier * dmgMultiplier` (plain
//!    integer multiplications, in that order).
//! 5. If `(attacker.status3 & STATUS3_CHARGED_UP) != 0` AND the step-2
//!    RESOLVED type (dynamic wins) is `TYPE_ELECTRIC` (13) -> `damage *= 2`.
//!    **Discrepancy from the C source noted per project instructions (TS is
//!    the spec):** `battle_script_commands.c:1297` reads
//!    `gBattleMoves[gCurrentMove].type` -- the STATIC row type, ignoring
//!    `dynamicMoveType` -- while the canonical TypeScript handler compares
//!    against `moveType`, the RESOLVED (dynamic-aware) type from step 2.
//!    This port follows the TypeScript: a non-Electric move carrying a
//!    dynamic Electric type doubles; an Electric move carrying a dynamic
//!    non-Electric type does not.
//! 6. If `attacker.helpingHand == 1` -> `damage = trunc(damage * 15 / 10)`.
//! 7. Outcome: rules with `battleMoveDamage := damage` (nothing else
//!    mutated); always advance -- there is no other branch.
//!
//! Source authority:
//! - Handler: `reference/pokeemerald/src/battle_script_commands.c:1290-1303`
//!   (the `×gCritMultiplier×dmgMultiplier` line, the `STATUS3_CHARGED_UP`
//!   `TYPE_ELECTRIC` doubling, the `helpingHand` `×15/10`,
//!   `gBattlescriptCurrInstr++`).
//! - Dispatch row `:336` (`[B_SCR_OP_DAMAGECALC] = Cmd_damagecalc, //0x5`);
//!   forward declaration `:84`.
//! - Opcode enum position `include/constants/battle_script_commands.h:11`.
//! - Macro: `asm/macros/battle_script.inc:24-26` -- a single `.byte
//!   B_SCR_OP_DAMAGECALC`, no operand.
//! - `STATUS3_CHARGED_UP` is `include/constants/battle.h:166` (`1 << 9`).
//! - Concrete call sites: 11 bare `damagecalc` statements in
//!   `reference/pokeemerald/data/battle_scripts_1.s` (verified by grep); the
//!   first is `:250` (inside `BattleScript_HitFromAtk` / the standard
//!   physical-hit chain).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_base_damage::{
    calculate_battle_script_base_damage_for_current_move, resolve_move_type,
    BattleScriptBaseDamageBattler, BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageError,
    BattleScriptBaseDamageRoles, BattleScriptBaseDamageRules,
};
use crate::damage_calc::TYPE_ELECTRIC;
use crate::gen_tables::MOVES;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_DAMAGECALC_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_DAMAGECALC` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_DAMAGECALC_OPCODE: u8 = 0x05;
pub const BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME: &str = "B_SCR_OP_DAMAGECALC";
pub const BATTLE_SCRIPT_DAMAGECALC_DISPATCHER: &str = "Cmd_damagecalc";
/// `damagecalc`'s encoded byte width: opcode byte only, no operand.
pub const BATTLE_SCRIPT_DAMAGECALC_ENCODED_WIDTH_BYTES: u8 = 1;
/// `include/constants/battle.h:166` -- `STATUS3_CHARGED_UP`.
pub const BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP: u32 = 1 << 9;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptDamagecalcBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptDamagecalcBattler {
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

    /// Native twin of `BattleScriptBaseDamageBattler` -- both enums share
    /// the same four-slot source domain, so conversion is an identity
    /// re-tag rather than a lookup.
    #[must_use]
    pub const fn as_base_damage_battler(self) -> BattleScriptBaseDamageBattler {
        match self {
            Self::Battler0 => BattleScriptBaseDamageBattler::Battler0,
            Self::Battler1 => BattleScriptBaseDamageBattler::Battler1,
            Self::Battler2 => BattleScriptBaseDamageBattler::Battler2,
            Self::Battler3 => BattleScriptBaseDamageBattler::Battler3,
        }
    }
}

/// The complete per-battler projection this leaf reads. `base` is exactly
/// the shared helper's own per-battler projection (composed, not
/// duplicated) so this leaf can hand a sub-slice straight to
/// [`calculate_battle_script_base_damage_for_current_move`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDamagecalcBattlerState {
    pub base: BattleScriptBaseDamageBattlerState,
    /// `ProtectStruct::helpingHand`; only the attacker's is read.
    pub helping_hand: u8,
}

/// Canonical selector bindings. `attacker` is required by this leaf's own
/// guard; `target` is only ever read by the composed helper.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDamagecalcRoles {
    pub attacker: Option<BattleScriptDamagecalcBattler>,
    pub target: Option<BattleScriptDamagecalcBattler>,
}

/// Complete narrow rules slice this leaf reads or writes. No scheduler and
/// no events -- the canonical handler emits neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDamagecalcRules {
    pub battlers: [BattleScriptDamagecalcBattlerState; BATTLE_SCRIPT_DAMAGECALC_BATTLER_COUNT],
    /// `rules.battleTopology.battlersCount`, forwarded to the shared helper.
    pub battlers_count: u8,
    pub battle_type_flags: u32,
    pub weather: u32,
    pub current_move: u16,
    pub dynamic_base_power: u16,
    pub dynamic_move_type: u8,
    /// Source `gCritMultiplier`; `2` is a confirmed critical hit.
    pub crit_multiplier: u8,
    /// Source `gBattleScripting.dmgMultiplier` (`requireUnsigned(..., 0xff,
    /// ...)` in the canonical rules-context builder).
    pub dmg_multiplier: u8,
    pub selector_roles: BattleScriptDamagecalcRoles,
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_DAMAGECALC_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_DAMAGECALC_BATTLER_COUNT],
    pub battle_move_damage: i32,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptDamagecalcError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// Pre-helper `resolveBattleScriptMoveType`'s own move lookup
    /// (`battleScriptRulesContext.ts:1288-1300`) -- fires BEFORE the shared
    /// helper's `requireMoveRow` ever runs.
    UnknownMoveType { move_id: u16 },
    /// Forwarded verbatim from the shared helper: the pre-helper type mask
    /// range check (`resolve_move_type`), a missing target role, or an
    /// out-of-range item id.
    BaseDamage(BattleScriptBaseDamageError),
}

impl fmt::Display for BattleScriptDamagecalcError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnknownMoveType { move_id } => write!(
                formatter,
                "currentMove {move_id} has no source-derived gBattleMoves type"
            ),
            Self::BaseDamage(inner) => write!(formatter, "{inner}"),
        }
    }
}

impl std::error::Error for BattleScriptDamagecalcError {}

/// One committed-program instruction projection, used ONLY for
/// registration. No shape or cardinality validation exists at registration
/// or execution -- the canonical `install()` line never checks operands
/// (`battleScriptHitChainOpcode.ts:4700-4717`), so this leaf faithfully
/// omits any shape check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDamagecalcInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
}

/// `committed Battle Script program does not emit B_SCR_OP_DAMAGECALC`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDamagecalcRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptDamagecalcRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptDamagecalcRegistrationError {}

/// Native projection of the `install("B_SCR_OP_DAMAGECALC", ...)` line
/// inside `createBattleScriptHitChainOpcodeHandlers`: find the FIRST
/// instruction with this opcode name -- no shape or cardinality validation.
pub fn register_battle_script_damagecalc<'a>(
    instructions: &[BattleScriptDamagecalcInstruction<'a>],
) -> Result<u8, BattleScriptDamagecalcRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptDamagecalcRegistrationError {
            opcode_name: BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME,
        })
}

fn to_base_damage_rules(rules: &BattleScriptDamagecalcRules) -> BattleScriptBaseDamageRules {
    BattleScriptBaseDamageRules {
        battlers: rules.battlers.map(|battler| battler.base),
        battlers_count: rules.battlers_count,
        battle_type_flags: rules.battle_type_flags,
        weather: rules.weather,
        current_move: rules.current_move,
        dynamic_base_power: rules.dynamic_base_power,
        dynamic_move_type: rules.dynamic_move_type,
        crit_multiplier: rules.crit_multiplier,
        selector_roles: BattleScriptBaseDamageRoles {
            attacker: rules
                .selector_roles
                .attacker
                .map(BattleScriptDamagecalcBattler::as_base_damage_battler),
            target: rules
                .selector_roles
                .target
                .map(BattleScriptDamagecalcBattler::as_base_damage_battler),
        },
        enigma_berry_hold_effects: rules.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: rules.enigma_berry_hold_effect_params,
    }
}

/// Native immutable-value twin of `damagecalcOpcodeHandler`. See the module
/// doc comment for the complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptDamagecalcError`] for the exact ordered error set:
/// missing attacker role, unknown `currentMove` type, or any error the
/// shared helper propagates.
pub fn apply_battle_script_damagecalc(
    rules: &BattleScriptDamagecalcRules,
) -> Result<BattleScriptDamagecalcRules, BattleScriptDamagecalcError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptDamagecalcError::MissingAttackerRole)?;

    let move_row = MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptDamagecalcError::UnknownMoveType { move_id: rules.current_move })?;
    let resolved_type = resolve_move_type(move_row.move_type, rules.dynamic_move_type)
        .map_err(BattleScriptDamagecalcError::BaseDamage)?;

    let base_damage_rules = to_base_damage_rules(rules);
    let helper_damage = calculate_battle_script_base_damage_for_current_move(&base_damage_rules)
        .map_err(BattleScriptDamagecalcError::BaseDamage)?;

    let mut damage =
        helper_damage * i32::from(rules.crit_multiplier) * i32::from(rules.dmg_multiplier);

    let attacker_state = &rules.battlers[attacker.index()];
    if (attacker_state.base.status3 & BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP) != 0
        && resolved_type == TYPE_ELECTRIC
    {
        damage *= 2;
    }
    if attacker_state.helping_hand == 1 {
        damage = (damage * 15) / 10;
    }

    let mut next = *rules;
    next.battle_move_damage = damage;
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::StatStages;

    fn base_battler(species: u16) -> BattleScriptBaseDamageBattlerState {
        BattleScriptBaseDamageBattlerState {
            item: 0,
            ability: 0,
            species,
            types: [0, 0],
            level: 50,
            attack: 60,
            defense: 60,
            sp_attack: 60,
            sp_defense: 60,
            stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
            hp: 100,
            max_hp: 100,
            status1: 0,
            status3: 0,
            flash_fire_boosted: 0,
        }
    }

    fn plain_battler(species: u16) -> BattleScriptDamagecalcBattlerState {
        BattleScriptDamagecalcBattlerState { base: base_battler(species), helping_hand: 0 }
    }

    fn rules() -> BattleScriptDamagecalcRules {
        BattleScriptDamagecalcRules {
            battlers: [
                plain_battler(1),
                plain_battler(2),
                plain_battler(3),
                plain_battler(4),
            ],
            battlers_count: 2,
            battle_type_flags: 0,
            weather: 0,
            current_move: 33, // TACKLE
            dynamic_base_power: 0,
            dynamic_move_type: 0,
            crit_multiplier: 1,
            dmg_multiplier: 1,
            selector_roles: BattleScriptDamagecalcRoles {
                attacker: Some(BattleScriptDamagecalcBattler::Battler0),
                target: Some(BattleScriptDamagecalcBattler::Battler1),
            },
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
            battle_move_damage: 0,
        }
    }

    #[test]
    fn multiplication_order_crit_then_dmg_multiplier() {
        let mut r = rules();
        r.crit_multiplier = 2;
        r.dmg_multiplier = 3;
        let base = {
            let mut base_r = r;
            base_r.crit_multiplier = 1;
            base_r.dmg_multiplier = 1;
            apply_battle_script_damagecalc(&base_r)
                .unwrap()
                .battle_move_damage
        };
        let scaled = apply_battle_script_damagecalc(&r)
            .unwrap()
            .battle_move_damage;
        assert_eq!(scaled, base * 2 * 3);
    }

    #[test]
    fn charge_gate_needs_both_status_bit_and_resolved_electric_type() {
        let mut r = rules();
        r.battlers[0].base.status3 = BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP;
        // TACKLE (Normal) with dynamic Electric type -> doubles.
        r.dynamic_move_type = TYPE_ELECTRIC;
        let doubled = apply_battle_script_damagecalc(&r)
            .unwrap()
            .battle_move_damage;

        let mut without_charge = r;
        without_charge.battlers[0].base.status3 = 0;
        let not_doubled = apply_battle_script_damagecalc(&without_charge)
            .unwrap()
            .battle_move_damage;
        assert_eq!(doubled, not_doubled * 2);

        // THUNDERBOLT (Electric) with a dynamic non-Electric type -> no double.
        let mut electric_move_dynamic_normal = rules();
        electric_move_dynamic_normal.battlers[0].base.status3 =
            BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP;
        electric_move_dynamic_normal.current_move = 84; // THUNDERBOLT
        electric_move_dynamic_normal.dynamic_move_type = 0x80; // masks to TYPE_NORMAL (0)
        let charged_electric_move_dynamic_normal =
            apply_battle_script_damagecalc(&electric_move_dynamic_normal)
                .unwrap()
                .battle_move_damage;
        let mut uncharged = electric_move_dynamic_normal;
        uncharged.battlers[0].base.status3 = 0;
        let uncharged_damage = apply_battle_script_damagecalc(&uncharged)
            .unwrap()
            .battle_move_damage;
        assert_eq!(charged_electric_move_dynamic_normal, uncharged_damage);
    }

    #[test]
    fn helping_hand_truncates_after_charge_doubling() {
        let mut r = rules();
        r.battlers[0].base.status3 = BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP;
        r.dynamic_move_type = TYPE_ELECTRIC;
        r.battlers[0].base.attack = 61; // odd-ish to make truncation observable
        let without_hh = apply_battle_script_damagecalc(&r)
            .unwrap()
            .battle_move_damage;
        r.battlers[0].helping_hand = 1;
        let with_hh = apply_battle_script_damagecalc(&r)
            .unwrap()
            .battle_move_damage;
        assert_eq!(with_hh, (without_hh * 15) / 10);
    }

    #[test]
    fn unknown_move_error_wins_over_helper_missing_target_role() {
        let mut r = rules();
        r.current_move = 60000;
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_damagecalc(&r),
            Err(BattleScriptDamagecalcError::UnknownMoveType { move_id: 60000 })
        );
    }

    #[test]
    fn missing_attacker_role_is_checked_first() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.current_move = 60000; // would otherwise error differently
        assert_eq!(
            apply_battle_script_damagecalc(&r),
            Err(BattleScriptDamagecalcError::MissingAttackerRole)
        );
    }

    #[test]
    fn helper_missing_target_role_propagates_when_move_is_known() {
        let mut r = rules();
        r.selector_roles.target = None;
        let error = apply_battle_script_damagecalc(&r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn registration_finds_first_and_ignores_shape() {
        let instructions = [
            BattleScriptDamagecalcInstruction {
                opcode_name: "B_SCR_OP_OTHER",
                opcode_id: 0x01,
                program_counter: 10,
            },
            BattleScriptDamagecalcInstruction {
                opcode_name: BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_DAMAGECALC_OPCODE,
                program_counter: 20,
            },
            BattleScriptDamagecalcInstruction {
                opcode_name: BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME,
                opcode_id: 0xff, // ill-shaped/duplicate later entry: never inspected.
                program_counter: 30,
            },
        ];
        assert_eq!(
            register_battle_script_damagecalc(&instructions),
            Ok(BATTLE_SCRIPT_DAMAGECALC_OPCODE)
        );

        let missing = [BattleScriptDamagecalcInstruction {
            opcode_name: "B_SCR_OP_OTHER",
            opcode_id: 0x01,
            program_counter: 10,
        }];
        assert_eq!(
            register_battle_script_damagecalc(&missing)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_DAMAGECALC"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptDamagecalcBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptDamagecalcBattler::from_u8(4), None);
    }
}
