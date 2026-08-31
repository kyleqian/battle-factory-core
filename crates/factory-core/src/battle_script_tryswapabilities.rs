//! Pure `B_SCR_OP_TRYSWAPABILITIES` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTryswapabilitiesOpcode.ts`, not a generic Battle
//! Script machine. Skill Swap reads the attacker and target roles (both
//! required), evaluates the four independent fail predicates, and either
//! jumps through the operand's late-resolved failure pointer with the rules
//! unchanged, or swaps only the two active battlers' `ability` bytes and
//! advances. No branch consumes RNG, emits an event, changes scheduler
//! state, or touches presentation.
//!
//! Source authority:
//! - `Cmd_tryswapabilities` is `reference/pokeemerald/src/battle_script_commands.c:9392-9410`;
//!   dispatch `:549` (`//0xDA`), forward declaration `:297`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1115-1118`.
//! - The sole concrete call is `BattleScript_EffectSkillSwap` at
//!   `data/battle_scripts_1.s:2497,2502`.
//! - `ABILITY_NONE` is `include/constants/abilities.h:4`;
//!   `ABILITY_WONDER_GUARD` is `include/constants/abilities.h:29`;
//!   `MOVE_RESULT_NO_EFFECT` is
//!   `include/constants/battle.h:220,223,225,228` (`MISSED | DOESNT_AFFECT_FOE | FAILED`).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYSWAPABILITIES` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE: u8 = 0xda;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE_NAME: &str = "B_SCR_OP_TRYSWAPABILITIES";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_DISPATCHER: &str = "Cmd_tryswapabilities";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/abilities.h:4` -- `ABILITY_NONE`.
pub const BATTLE_SCRIPT_ABILITY_NONE: u8 = 0;
/// `include/constants/abilities.h:29` -- `ABILITY_WONDER_GUARD`.
pub const BATTLE_SCRIPT_ABILITY_WONDER_GUARD: u8 = 25;
/// `include/constants/battle.h:220` -- `MOVE_RESULT_MISSED` (`1 << 0`).
const MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `include/constants/battle.h:223` -- `MOVE_RESULT_DOESNT_AFFECT_FOE` (`1 << 3`).
const MOVE_RESULT_DOESNT_AFFECT_FOE: u32 = 1 << 3;
/// `include/constants/battle.h:225` -- `MOVE_RESULT_FAILED` (`1 << 5`).
const MOVE_RESULT_FAILED: u32 = 1 << 5;
/// `include/constants/battle.h:228` -- `MOVE_RESULT_NO_EFFECT`
/// (`MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | MOVE_RESULT_FAILED`).
pub const BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT: u32 =
    MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | MOVE_RESULT_FAILED;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryswapabilitiesBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSWAPABILITIES_BATTLERS: [BattleScriptTryswapabilitiesBattler;
    BATTLE_SCRIPT_TRYSWAPABILITIES_BATTLER_COUNT] = [
    BattleScriptTryswapabilitiesBattler::Battler0,
    BattleScriptTryswapabilitiesBattler::Battler1,
    BattleScriptTryswapabilitiesBattler::Battler2,
    BattleScriptTryswapabilitiesBattler::Battler3,
];

impl BattleScriptTryswapabilitiesBattler {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` battler id.
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
}

/// The complete per-battler projection read or written by this opcode. Every
/// battler carries an `ability`, but only the resolved attacker and target
/// cells are ever read or written.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesBattlerState {
    pub ability: u8,
}

/// Canonical selector bindings. Only `attacker` and `target` are ever read;
/// both are required, matching the canonical `requireBattlerRole` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesRoles {
    pub attacker: Option<BattleScriptTryswapabilitiesBattler>,
    pub target: Option<BattleScriptTryswapabilitiesBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesRules {
    pub battlers:
        [BattleScriptTryswapabilitiesBattlerState; BATTLE_SCRIPT_TRYSWAPABILITIES_BATTLER_COUNT],
    pub selector_roles: BattleScriptTryswapabilitiesRoles,
    pub move_result_flags: u32,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryswapabilitiesOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, exactly like the canonical TypeScript
    /// factory's own `resolveBattleScriptLabel` call inside the handler.
    pub resolved_failure_target: Option<BattleScriptTryswapabilitiesResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryswapabilitiesControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesOutcome {
    pub rules: BattleScriptTryswapabilitiesRules,
    pub control: BattleScriptTryswapabilitiesControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryswapabilitiesError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTryswapabilitiesError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYSWAPABILITIES requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYSWAPABILITIES shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_tryswapabilities: unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryswapabilitiesError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTryswapabilitiesInstruction<'a>,
) -> Result<&'a str, BattleScriptTryswapabilitiesError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTryswapabilitiesError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSWAPABILITIES_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYSWAPABILITIES_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTryswapabilitiesError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTryswapabilitiesOpcodeHandlers`.
/// Noise instructions are ignored; wrong cardinality fails before shape
/// inspection, and successful registration contains precisely one opcode key.
pub fn register_battle_script_tryswapabilities_handler<'a>(
    instructions: &[BattleScriptTryswapabilitiesInstruction<'a>],
) -> Result<BattleScriptTryswapabilitiesRegistration, BattleScriptTryswapabilitiesError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSWAPABILITIES_CONCRETE_START_COUNT {
        return Err(BattleScriptTryswapabilitiesError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTryswapabilitiesRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_tryswapabilities`.
///
/// Evaluation order matches the canonical handler exactly: shape validation,
/// then both selector roles are required, then the four independent fail
/// predicates are evaluated together (none has a side effect, so order does
/// not matter) before either the late-resolved operand jump with the rules
/// unchanged, or swapping only the two active battlers' `ability` bytes and
/// advancing.
pub fn apply_battle_script_tryswapabilities<'a>(
    instruction: BattleScriptTryswapabilitiesInstruction<'a>,
    rules: &BattleScriptTryswapabilitiesRules,
) -> Result<BattleScriptTryswapabilitiesOutcome, BattleScriptTryswapabilitiesError<'a>> {
    let failure_expression = validate_instruction(instruction)?;

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTryswapabilitiesError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTryswapabilitiesError::MissingTargetRole)?;

    let attacker_ability = rules.battlers[attacker.index()].ability;
    let target_ability = rules.battlers[target.index()].ability;
    let fails = (attacker_ability == BATTLE_SCRIPT_ABILITY_NONE
        && target_ability == BATTLE_SCRIPT_ABILITY_NONE)
        || attacker_ability == BATTLE_SCRIPT_ABILITY_WONDER_GUARD
        || target_ability == BATTLE_SCRIPT_ABILITY_WONDER_GUARD
        || (rules.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) != 0;

    if fails {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTryswapabilitiesError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        return Ok(BattleScriptTryswapabilitiesOutcome {
            rules: *rules,
            control: BattleScriptTryswapabilitiesControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next_rules = *rules;
    next_rules.battlers[attacker.index()].ability = target_ability;
    next_rules.battlers[target.index()].ability = attacker_ability;
    Ok(BattleScriptTryswapabilitiesOutcome {
        rules: next_rules,
        control: BattleScriptTryswapabilitiesControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub condition_line_1: u32,
    pub condition_line_2: u32,
    pub condition_line_3: u32,
    pub condition_line_4: u32,
    pub condition_line_5: u32,
    pub jump_line: u32,
    pub swap_read_line: u32,
    pub swap_write_attacker_line: u32,
    pub swap_write_target_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_TRYSWAPABILITIES_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTryswapabilitiesDecompDispatchEvidence =
    BattleScriptTryswapabilitiesDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYSWAPABILITIES_DISPATCHER,
        dispatch_line: 549,
        forward_decl_line: 297,
        handler_line: 9392,
        condition_line_1: 9394,
        condition_line_2: 9395,
        condition_line_3: 9396,
        condition_line_4: 9397,
        condition_line_5: 9398,
        jump_line: 9400,
        swap_read_line: 9404,
        swap_write_attacker_line: 9405,
        swap_write_target_line: 9406,
        advance_line: 9408,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYSWAPABILITIES_MACRO_EVIDENCE: BattleScriptTryswapabilitiesMacroEvidence =
    BattleScriptTryswapabilitiesMacroEvidence {
        declaration_line: 1115,
        opcode_line: 1116,
        pointer_line: 1117,
        encoded_width_bytes: BATTLE_SCRIPT_TRYSWAPABILITIES_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapabilitiesCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSWAPABILITIES_CALL_SITE_EVIDENCE:
    BattleScriptTryswapabilitiesCallSiteEvidence = BattleScriptTryswapabilitiesCallSiteEvidence {
    entry_label: "BattleScript_EffectSkillSwap",
    entry_label_line: 2497,
    statement_line: 2502,
    instruction_program_counter: 1785,
    failure_target_expression: "BattleScript_ButItFailed",
    failure_target_program_counter: 1434,
};

#[cfg(test)]
mod tests {
    use super::*;

    const OPERAND: BattleScriptTryswapabilitiesOperand<'static> =
        BattleScriptTryswapabilitiesOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        };
    const OPERANDS: [BattleScriptTryswapabilitiesOperand<'static>; 1] = [OPERAND];

    fn plain_battler(ability: u8) -> BattleScriptTryswapabilitiesBattlerState {
        BattleScriptTryswapabilitiesBattlerState { ability }
    }

    fn rules(
        battlers: [BattleScriptTryswapabilitiesBattlerState; 4],
        attacker: Option<BattleScriptTryswapabilitiesBattler>,
        target: Option<BattleScriptTryswapabilitiesBattler>,
        move_result_flags: u32,
    ) -> BattleScriptTryswapabilitiesRules {
        BattleScriptTryswapabilitiesRules {
            battlers,
            selector_roles: BattleScriptTryswapabilitiesRoles { attacker, target },
            move_result_flags,
        }
    }

    fn instruction() -> BattleScriptTryswapabilitiesInstruction<'static> {
        BattleScriptTryswapabilitiesInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE_NAME,
            program_counter: 1785,
            opcode_id: BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSWAPABILITIES_DISPATCHER,
            operands: &OPERANDS,
            resolved_failure_target: Some(BattleScriptTryswapabilitiesResolvedLabel {
                expression: "BattleScript_ButItFailed",
                program_counter: 1434,
            }),
        }
    }

    #[test]
    fn ordinary_abilities_swap_and_advance() {
        let input = rules(
            [
                plain_battler(39),
                plain_battler(5),
                plain_battler(77),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        let outcome =
            apply_battle_script_tryswapabilities(instruction(), &input).expect("ordinary swap");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapabilitiesControl::Advance
        );
        assert_eq!(outcome.rules.battlers[0].ability, 5);
        assert_eq!(outcome.rules.battlers[1].ability, 39);
        assert_eq!(outcome.rules.battlers[2], input.battlers[2]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
    }

    #[test]
    fn both_none_fails_via_operand_pointer_untouched_abilities() {
        let input = rules(
            [
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        let outcome =
            apply_battle_script_tryswapabilities(instruction(), &input).expect("both none fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapabilitiesControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
    }

    #[test]
    fn one_none_still_swaps() {
        let input = rules(
            [
                plain_battler(0),
                plain_battler(5),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        let outcome =
            apply_battle_script_tryswapabilities(instruction(), &input).expect("one none swaps");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapabilitiesControl::Advance
        );
        assert_eq!(outcome.rules.battlers[0].ability, 5);
        assert_eq!(outcome.rules.battlers[1].ability, 0);
    }

    #[test]
    fn wonder_guard_on_either_side_fails() {
        let attacker_wg = rules(
            [
                plain_battler(BATTLE_SCRIPT_ABILITY_WONDER_GUARD),
                plain_battler(5),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        assert_eq!(
            apply_battle_script_tryswapabilities(instruction(), &attacker_wg)
                .expect("attacker wonder guard fails")
                .control,
            BattleScriptTryswapabilitiesControl::Jump { program_counter: 1434 }
        );

        let target_wg = rules(
            [
                plain_battler(5),
                plain_battler(BATTLE_SCRIPT_ABILITY_WONDER_GUARD),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        assert_eq!(
            apply_battle_script_tryswapabilities(instruction(), &target_wg)
                .expect("target wonder guard fails")
                .control,
            BattleScriptTryswapabilitiesControl::Jump { program_counter: 1434 }
        );
    }

    #[test]
    fn move_result_no_effect_bits_fail_but_unrelated_bit_does_not() {
        let base = [
            plain_battler(39),
            plain_battler(5),
            plain_battler(0),
            plain_battler(0),
        ];
        for flag in [
            MOVE_RESULT_MISSED,
            MOVE_RESULT_DOESNT_AFFECT_FOE,
            MOVE_RESULT_FAILED,
            BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
        ] {
            let input = rules(
                base,
                Some(BattleScriptTryswapabilitiesBattler::Battler0),
                Some(BattleScriptTryswapabilitiesBattler::Battler1),
                flag,
            );
            assert_eq!(
                apply_battle_script_tryswapabilities(instruction(), &input)
                    .expect("no-effect flag fails")
                    .control,
                BattleScriptTryswapabilitiesControl::Jump { program_counter: 1434 },
                "flag 0x{flag:x}"
            );
        }
        // An unrelated bit (e.g. MOVE_RESULT_SUPER_EFFECTIVE, 1 << 1) must not fail.
        let input = rules(
            base,
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            1 << 1,
        );
        let outcome = apply_battle_script_tryswapabilities(instruction(), &input)
            .expect("unrelated flag succeeds");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapabilitiesControl::Advance
        );
    }

    #[test]
    fn malformed_instruction_precedes_missing_roles_and_failure_label_is_late() {
        let missing = rules(
            [
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
            ],
            None,
            None,
            0,
        );
        let malformed =
            BattleScriptTryswapabilitiesInstruction { opcode_id: 0xd0, ..instruction() };
        assert_eq!(
            apply_battle_script_tryswapabilities(malformed, &missing)
                .expect_err("shape precedes roles")
                .to_string(),
            "invalid B_SCR_OP_TRYSWAPABILITIES shape at program counter 1785"
        );
        assert_eq!(
            apply_battle_script_tryswapabilities(instruction(), &missing)
                .expect_err("attacker role required")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let missing_target = rules(
            [
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            None,
            0,
        );
        assert_eq!(
            apply_battle_script_tryswapabilities(instruction(), &missing_target)
                .expect_err("target role required")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let both_none = rules(
            [
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
                plain_battler(0),
            ],
            Some(BattleScriptTryswapabilitiesBattler::Battler0),
            Some(BattleScriptTryswapabilitiesBattler::Battler1),
            0,
        );
        let instruction_no_label = BattleScriptTryswapabilitiesInstruction {
            resolved_failure_target: None,
            ..instruction()
        };
        assert_eq!(
            apply_battle_script_tryswapabilities(instruction_no_label, &both_none)
                .expect_err("unresolved failure target")
                .to_string(),
            "Cmd_tryswapabilities: unresolved failure target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn registration_accepts_singleton_and_rejects_wrong_cardinality_and_shape() {
        assert_eq!(
            register_battle_script_tryswapabilities_handler(&[instruction()])
                .expect("singleton registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE
        );
        assert_eq!(
            register_battle_script_tryswapabilities_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "B_SCR_OP_TRYSWAPABILITIES requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            register_battle_script_tryswapabilities_handler(&[instruction(), instruction()])
                .expect_err("two starts")
                .to_string(),
            "B_SCR_OP_TRYSWAPABILITIES requires exactly 1 concrete start, got 2"
        );
        let wrong_dispatcher =
            BattleScriptTryswapabilitiesInstruction { dispatcher: "Cmd_other", ..instruction() };
        assert_eq!(
            register_battle_script_tryswapabilities_handler(&[wrong_dispatcher])
                .expect_err("wrong dispatcher")
                .to_string(),
            "invalid B_SCR_OP_TRYSWAPABILITIES shape at program counter 1785"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYSWAPABILITIES_BATTLERS {
            assert_eq!(
                BattleScriptTryswapabilitiesBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTryswapabilitiesBattler::from_u8(4), None);
    }
}
