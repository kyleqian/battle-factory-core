//! Pure `B_SCR_OP_SNATCHSETBATTLERS` role rebinding and control result.
//!
//! This is the deliberately narrow, machine-independent port of only
//! `Cmd_snatchsetbattlers` from `src/engine/battleScriptSnatchOpcode.ts`.
//! Its siblings `B_SCR_OP_TRYSETSNATCH` and
//! `B_SCR_OP_SWAPATTACKERWITHTARGET` remain independent leaves.
//!
//! Source authority is `Cmd_snatchsetbattlers` in
//! `reference/pokeemerald/src/battle_script_commands.c:9869-9880`. It stores
//! the original attacker in `gEffectBattler`, conditionally replaces the
//! attacker and always replaces the target with `gBattleScripting.battler`,
//! then restores that original attacker to `gBattleScripting.battler` before
//! advancing the one-byte instruction. The opcode dispatcher associates
//! `B_SCR_OP_SNATCHSETBATTLERS` with this command at
//! `battle_script_commands.c:568` (`0xED`), and its operand-free macro is
//! `asm/macros/battle_script.inc:1205-1207`. The concrete call site is
//! `BattleScript_SnatchedMove` in `data/battle_scripts_1.s:3677-3685`, after
//! `ppreduce` and before the Snatch animation.
//!
//! This leaf deliberately owns neither opcode registration, a generic battle
//! state reducer, program counters, scheduler, RNG, controller state,
//! presentation, ABI/WASM exports, nor either sibling Snatch opcode.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; selector roles and
/// `gBattleScripting.battler` use the entire four-value battler-id domain,
/// including in a singles battle.
pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_COUNT: usize = 4;

/// Complete source `BattleScriptBattlerId` domain carried by the narrow
/// selector and scripting-battler projection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSnatchsetbattlersBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-shaped coverage.
pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLERS: [BattleScriptSnatchsetbattlersBattler;
    BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_COUNT] = [
    BattleScriptSnatchsetbattlersBattler::Battler0,
    BattleScriptSnatchsetbattlersBattler::Battler1,
    BattleScriptSnatchsetbattlersBattler::Battler2,
    BattleScriptSnatchsetbattlersBattler::Battler3,
];

impl BattleScriptSnatchsetbattlersBattler {
    /// Source/canonical `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Selector bindings retained by the canonical handler.
///
/// `attacker` and `target` are optional because the handler calls
/// `requireBattlerRole` for them in that order. `effect_battler` and
/// `fainted` are retained as the complete narrow selector sibling projection:
/// the former is overwritten and the latter is spread unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSnatchsetbattlersRoles {
    pub attacker: Option<BattleScriptSnatchsetbattlersBattler>,
    pub target: Option<BattleScriptSnatchsetbattlersBattler>,
    pub effect_battler: Option<BattleScriptSnatchsetbattlersBattler>,
    pub fainted: Option<BattleScriptSnatchsetbattlersBattler>,
}

/// Complete narrow projection read or written by `Cmd_snatchsetbattlers`.
///
/// The nonoptional `scripting_battler` models canonical
/// `gBattleScripting.battler`; `createBattleScriptRulesContext` validates it
/// over the entire `0..=3` battler domain before this handler can execute.
/// This is not a substitute for a generic battle state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSnatchsetbattlersRules {
    pub selector_roles: BattleScriptSnatchsetbattlersRoles,
    pub scripting_battler: BattleScriptSnatchsetbattlersBattler,
}

/// The sole control result for this unconditional, operand-free command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSnatchsetbattlersControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSnatchsetbattlersOutcome {
    pub rules: BattleScriptSnatchsetbattlersRules,
    pub control: BattleScriptSnatchsetbattlersControl,
}

/// Exact typed-reachable errors from canonical TypeScript's ordered
/// `requireBattlerRole(rules, "attacker")` and
/// `requireBattlerRole(rules, "target")` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSnatchsetbattlersError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSnatchsetbattlersError {
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

impl std::error::Error for BattleScriptSnatchsetbattlersError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_snatchsetbattlers`' TypeScript handler.
///
/// Attacker resolution intentionally occurs before target resolution, so a
/// doubly missing input reports the attacker error. Every successful call
/// keeps the original attacker in `effect_battler`; a self-targeted move
/// replaces both attacker and target with the original scripting battler,
/// while a non-self-targeted move preserves attacker and replaces only target.
/// It then restores the original attacker into `scripting_battler`. `fainted`
/// is preserved exactly. Repeated application is intentionally not normalized:
/// its second self/non-self decision observes the prior result, just as the
/// canonical immutable reducer does.
pub fn apply_battle_script_snatchsetbattlers(
    rules: &BattleScriptSnatchsetbattlersRules,
) -> Result<BattleScriptSnatchsetbattlersOutcome, BattleScriptSnatchsetbattlersError> {
    let original_attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSnatchsetbattlersError::MissingAttackerRole)?;
    let original_target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSnatchsetbattlersError::MissingTargetRole)?;
    let original_scripting_battler = rules.scripting_battler;

    let mut next = *rules;
    next.selector_roles.effect_battler = Some(original_attacker);
    if original_attacker == original_target {
        next.selector_roles.attacker = Some(original_scripting_battler);
    }
    next.selector_roles.target = Some(original_scripting_battler);
    next.scripting_battler = original_attacker;

    Ok(BattleScriptSnatchsetbattlersOutcome {
        rules: next,
        control: BattleScriptSnatchsetbattlersControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_targeted_rebind_uses_original_scripting_and_preserves_fainted() {
        let rules = BattleScriptSnatchsetbattlersRules {
            selector_roles: BattleScriptSnatchsetbattlersRoles {
                attacker: Some(BattleScriptSnatchsetbattlersBattler::Battler2),
                target: Some(BattleScriptSnatchsetbattlersBattler::Battler2),
                effect_battler: None,
                fainted: Some(BattleScriptSnatchsetbattlersBattler::Battler3),
            },
            scripting_battler: BattleScriptSnatchsetbattlersBattler::Battler1,
        };
        let before = rules;

        let outcome = apply_battle_script_snatchsetbattlers(&rules).expect("valid roles");

        assert_eq!(
            rules, before,
            "native value transformation must not mutate input"
        );
        assert_eq!(
            outcome.control,
            BattleScriptSnatchsetbattlersControl::Advance
        );
        assert_eq!(
            outcome.rules.selector_roles,
            BattleScriptSnatchsetbattlersRoles {
                attacker: Some(BattleScriptSnatchsetbattlersBattler::Battler1),
                target: Some(BattleScriptSnatchsetbattlersBattler::Battler1),
                effect_battler: Some(BattleScriptSnatchsetbattlersBattler::Battler2),
                fainted: Some(BattleScriptSnatchsetbattlersBattler::Battler3),
            }
        );
        assert_eq!(
            outcome.rules.scripting_battler,
            BattleScriptSnatchsetbattlersBattler::Battler2
        );
    }

    #[test]
    fn nonself_target_preserves_attacker_and_repeated_application_can_become_self_targeted() {
        let rules = BattleScriptSnatchsetbattlersRules {
            selector_roles: BattleScriptSnatchsetbattlersRoles {
                attacker: Some(BattleScriptSnatchsetbattlersBattler::Battler1),
                target: Some(BattleScriptSnatchsetbattlersBattler::Battler2),
                effect_battler: Some(BattleScriptSnatchsetbattlersBattler::Battler3),
                fainted: None,
            },
            scripting_battler: BattleScriptSnatchsetbattlersBattler::Battler1,
        };

        let first = apply_battle_script_snatchsetbattlers(&rules).expect("valid roles");
        assert_eq!(
            first.rules.selector_roles.attacker,
            Some(BattleScriptSnatchsetbattlersBattler::Battler1)
        );
        assert_eq!(
            first.rules.selector_roles.target,
            Some(BattleScriptSnatchsetbattlersBattler::Battler1)
        );
        assert_ne!(rules.selector_roles.attacker, rules.selector_roles.target);
        assert_eq!(
            first.rules.selector_roles.attacker,
            first.rules.selector_roles.target
        );

        let second =
            apply_battle_script_snatchsetbattlers(&first.rules).expect("valid rebound roles");
        assert_eq!(
            second.control,
            BattleScriptSnatchsetbattlersControl::Advance
        );
        assert_eq!(second.rules, first.rules);
    }

    #[test]
    fn missing_attacker_precedes_missing_target_and_no_error_path_mutates_input() {
        let both_missing = BattleScriptSnatchsetbattlersRules {
            selector_roles: BattleScriptSnatchsetbattlersRoles {
                attacker: None,
                target: None,
                effect_battler: Some(BattleScriptSnatchsetbattlersBattler::Battler2),
                fainted: Some(BattleScriptSnatchsetbattlersBattler::Battler3),
            },
            scripting_battler: BattleScriptSnatchsetbattlersBattler::Battler0,
        };
        let before = both_missing;
        assert_eq!(
            apply_battle_script_snatchsetbattlers(&both_missing)
                .expect_err("attacker resolution must be first"),
            BattleScriptSnatchsetbattlersError::MissingAttackerRole
        );
        assert_eq!(both_missing, before);

        let missing_target = BattleScriptSnatchsetbattlersRules {
            selector_roles: BattleScriptSnatchsetbattlersRoles {
                attacker: Some(BattleScriptSnatchsetbattlersBattler::Battler0),
                target: None,
                ..both_missing.selector_roles
            },
            ..both_missing
        };
        assert_eq!(
            apply_battle_script_snatchsetbattlers(&missing_target)
                .expect_err("target resolution must follow attacker"),
            BattleScriptSnatchsetbattlersError::MissingTargetRole
        );
    }
}
