//! Pure `B_SCR_OP_SWAPATTACKERWITHTARGET` selector rebinding and hit-marker
//! transformation.
//!
//! This is the deliberately narrow, machine-independent port of only
//! `Cmd_swapattackerwithtarget` from `src/engine/battleScriptSnatchOpcode.ts`.
//! Its sibling Snatch commands remain independent leaves.
//!
//! Source authority is `Cmd_swapattackerwithtarget` in
//! `reference/pokeemerald/src/battle_script_commands.c:5675-5687`. It uses
//! `gActiveBattler = gBattlerAttacker` only as the temporary carrier needed
//! for `gBattlerTarget = gActiveBattler`, then toggles
//! `HITMARKER_SWAP_ATTACKER_TARGET` and advances the one-byte instruction.
//! The hit-marker bit is `1 << 12` at
//! `reference/pokeemerald/include/constants/battle.h:189`; the dispatcher
//! associates `B_SCR_OP_SWAPATTACKERWITHTARGET` with this command at
//! `battle_script_commands.c:426` (`0x5F`), and the operand-free macro is
//! `asm/macros/battle_script.inc:553-555`.
//!
//! All concrete source uses are retained by the canonical program: the two
//! paired calls in `BattleScript_PursuitSwitchDmgLoop`
//! (`data/battle_scripts_1.s:3099,3102`) and the final restoration in
//! `BattleScript_SnatchedMove` (`data/battle_scripts_1.s:3685`).
//!
//! `gActiveBattler` is intentionally absent from this final narrow
//! projection. The C assignment is the source command's temporary swap
//! carrier, while the canonical TypeScript handler's immutable output spreads
//! `BattleScriptRulesContext` and replaces only `selectorRoles` plus
//! `hitMarker`; it has no `gActiveBattler` field. This leaf therefore ports
//! that canonical pure projection rather than inventing an unrelated global
//! state cell.
//!
//! This leaf deliberately owns neither opcode registration, a generic battle
//! state reducer, program counters, scheduler, RNG, controller state,
//! presentation, ABI/WASM exports, nor either sibling Snatch opcode.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; selector-role ids retain all four source
/// slots, including in Factory singles battles.
pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_BATTLER_COUNT: usize = 4;

/// `HITMARKER_SWAP_ATTACKER_TARGET` from `include/constants/battle.h:189`.
pub const BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET: u32 = 1 << 12;

/// Complete source `BattleScriptBattlerId` domain carried by the selector
/// bindings and preserved scripting battler.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSwapattackerwithtargetBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-shaped coverage.
pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_BATTLERS:
    [BattleScriptSwapattackerwithtargetBattler; BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_BATTLER_COUNT] = [
    BattleScriptSwapattackerwithtargetBattler::Battler0,
    BattleScriptSwapattackerwithtargetBattler::Battler1,
    BattleScriptSwapattackerwithtargetBattler::Battler2,
    BattleScriptSwapattackerwithtargetBattler::Battler3,
];

impl BattleScriptSwapattackerwithtargetBattler {
    /// Source/canonical `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Complete selector bindings retained by the canonical handler.
///
/// `attacker` and `target` are optional because the handler calls
/// `requireBattlerRole` for them in that order. `effect_battler` and
/// `fainted` are complete sibling bindings: the TypeScript object spread
/// preserves them exactly while replacing only attacker and target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSwapattackerwithtargetRoles {
    pub attacker: Option<BattleScriptSwapattackerwithtargetBattler>,
    pub target: Option<BattleScriptSwapattackerwithtargetBattler>,
    pub effect_battler: Option<BattleScriptSwapattackerwithtargetBattler>,
    pub fainted: Option<BattleScriptSwapattackerwithtargetBattler>,
}

/// Complete narrow projection read or written by
/// `Cmd_swapattackerwithtarget`'s canonical TypeScript handler.
///
/// `scripting_battler` is preserved because the handler spreads its complete
/// rules context. It is not `gActiveBattler`: the latter has no counterpart in
/// the canonical pure projection, as documented in this module's source note.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSwapattackerwithtargetRules {
    pub selector_roles: BattleScriptSwapattackerwithtargetRoles,
    pub scripting_battler: BattleScriptSwapattackerwithtargetBattler,
    /// Complete source/canonical unsigned `gHitMarker` word.
    pub hit_marker: u32,
}

/// The sole control result for this unconditional, operand-free command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSwapattackerwithtargetControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSwapattackerwithtargetOutcome {
    pub rules: BattleScriptSwapattackerwithtargetRules,
    pub control: BattleScriptSwapattackerwithtargetControl,
}

/// Exact typed-reachable errors from canonical TypeScript's ordered
/// `requireBattlerRole(rules, "attacker")` and
/// `requireBattlerRole(rules, "target")` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSwapattackerwithtargetError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSwapattackerwithtargetError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSwapattackerwithtargetError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_swapattackerwithtarget`'s TypeScript handler.
///
/// Attacker resolution intentionally occurs before target resolution, so a
/// doubly missing input reports the attacker error. On success only the two
/// selector bindings are exchanged and bit 12 is XORed across the complete
/// `u32` hit marker; `effect_battler`, `fainted`, `scripting_battler`, and all
/// other hit-marker bits are preserved. Equal attacker/target aliases are
/// valid. Applying this function twice restores this entire narrow state.
pub fn apply_battle_script_swapattackerwithtarget(
    rules: &BattleScriptSwapattackerwithtargetRules,
) -> Result<BattleScriptSwapattackerwithtargetOutcome, BattleScriptSwapattackerwithtargetError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSwapattackerwithtargetError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSwapattackerwithtargetError::MissingTargetRole)?;

    let mut next = *rules;
    next.selector_roles.attacker = Some(target);
    next.selector_roles.target = Some(attacker);
    next.hit_marker ^= BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET;

    Ok(BattleScriptSwapattackerwithtargetOutcome {
        rules: next,
        control: BattleScriptSwapattackerwithtargetControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn swaps_only_attacker_target_and_bit_twelve_without_mutating_input() {
        let rules = BattleScriptSwapattackerwithtargetRules {
            selector_roles: BattleScriptSwapattackerwithtargetRoles {
                attacker: Some(BattleScriptSwapattackerwithtargetBattler::Battler1),
                target: Some(BattleScriptSwapattackerwithtargetBattler::Battler3),
                effect_battler: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
                fainted: Some(BattleScriptSwapattackerwithtargetBattler::Battler0),
            },
            scripting_battler: BattleScriptSwapattackerwithtargetBattler::Battler2,
            hit_marker: 0x8000_0801,
        };
        let before = rules;

        let outcome =
            apply_battle_script_swapattackerwithtarget(&rules).expect("valid selector roles");

        assert_eq!(
            rules, before,
            "native value transformation must not mutate input"
        );
        assert_eq!(
            outcome.control,
            BattleScriptSwapattackerwithtargetControl::Advance
        );
        assert_eq!(
            outcome.rules.selector_roles.attacker,
            Some(BattleScriptSwapattackerwithtargetBattler::Battler3)
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptSwapattackerwithtargetBattler::Battler1)
        );
        assert_eq!(
            outcome.rules.selector_roles.effect_battler,
            before.selector_roles.effect_battler
        );
        assert_eq!(
            outcome.rules.selector_roles.fainted,
            before.selector_roles.fainted
        );
        assert_eq!(outcome.rules.scripting_battler, before.scripting_battler);
        assert_eq!(
            outcome.rules.hit_marker,
            before.hit_marker ^ BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET
        );
        assert_eq!(
            outcome.rules.hit_marker & !BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET,
            before.hit_marker & !BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET,
            "all unrelated hit-marker bits must survive"
        );
    }

    #[test]
    fn aliases_are_valid_and_two_applications_are_an_involution() {
        let rules = BattleScriptSwapattackerwithtargetRules {
            selector_roles: BattleScriptSwapattackerwithtargetRoles {
                attacker: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
                target: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
                effect_battler: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
                fainted: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
            },
            scripting_battler: BattleScriptSwapattackerwithtargetBattler::Battler2,
            hit_marker: u32::MAX,
        };

        let first = apply_battle_script_swapattackerwithtarget(&rules).expect("valid aliases");
        let second = apply_battle_script_swapattackerwithtarget(&first.rules)
            .expect("valid aliases after first swap");

        assert_eq!(
            first.rules.selector_roles.attacker,
            rules.selector_roles.attacker
        );
        assert_eq!(
            first.rules.selector_roles.target,
            rules.selector_roles.target
        );
        assert_eq!(
            first.rules.hit_marker,
            u32::MAX ^ BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET
        );
        assert_eq!(second.rules, rules);
        assert_eq!(
            second.control,
            BattleScriptSwapattackerwithtargetControl::Advance
        );
    }

    #[test]
    fn missing_attacker_precedes_missing_target_and_errors_preserve_input() {
        let both_missing = BattleScriptSwapattackerwithtargetRules {
            selector_roles: BattleScriptSwapattackerwithtargetRoles {
                attacker: None,
                target: None,
                effect_battler: Some(BattleScriptSwapattackerwithtargetBattler::Battler2),
                fainted: Some(BattleScriptSwapattackerwithtargetBattler::Battler3),
            },
            scripting_battler: BattleScriptSwapattackerwithtargetBattler::Battler0,
            hit_marker: 0x0000_1000,
        };
        let before = both_missing;
        assert_eq!(
            apply_battle_script_swapattackerwithtarget(&both_missing)
                .expect_err("attacker resolution must be first"),
            BattleScriptSwapattackerwithtargetError::MissingAttackerRole
        );
        assert_eq!(both_missing, before);

        let missing_target = BattleScriptSwapattackerwithtargetRules {
            selector_roles: BattleScriptSwapattackerwithtargetRoles {
                attacker: Some(BattleScriptSwapattackerwithtargetBattler::Battler0),
                ..both_missing.selector_roles
            },
            ..both_missing
        };
        assert_eq!(
            apply_battle_script_swapattackerwithtarget(&missing_target)
                .expect_err("target resolution must follow attacker"),
            BattleScriptSwapattackerwithtargetError::MissingTargetRole
        );
    }
}
