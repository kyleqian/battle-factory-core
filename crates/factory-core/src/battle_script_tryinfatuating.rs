//! Pure `B_SCR_OP_TRYINFATUATING` registration and handler leaf.
//!
//! This is the machine-independent native twin of
//! `src/engine/battleScriptTryinfatuatingOpcode.ts`. Registration binds the
//! shared handler to the FIRST instruction whose `opcodeName` matches,
//! erroring only when none exists -- unlike the jump leaves
//! (`battle_script_jumpifstat.rs`, `battle_script_trysetperishsong.rs`), the
//! canonical TypeScript factory does not validate instruction count or shape
//! here, and this port deliberately does not invent a stricter check.
//!
//! Execution requires both an attacker and a target role. When the target's
//! ability is Oblivious, it jumps to the hardcoded (not operand-supplied)
//! `BattleScript_ObliviousPreventsAttraction` label, records
//! `gLastUsedAbility`, and reveals the ability via
//! `crate::battle_script_ai_reveal::record_battle_script_ability_reveal`.
//! Otherwise it evaluates all four independent fail predicates (same gender,
//! already infatuated, attacker genderless, target genderless) without
//! short-circuiting any side effect -- there are none to short-circuit -- and
//! either jumps through the operand's late-resolved failure pointer or ORs
//! `STATUS2_INFATUATED_WITH(attacker)` into the target's `status2` and
//! advances. Gender resolution reuses
//! `crate::battle_script_gender::resolve_battle_script_mon_gender`.
//!
//! Source authority:
//! - `Cmd_tryinfatuating` is `reference/pokeemerald/src/battle_script_commands.c:7654-7696`;
//!   dispatch `:482` (`//0x97`), forward declaration `:230`.
//! - The five-byte macro is `asm/macros/battle_script.inc:810-813`.
//! - The sole concrete call is `BattleScript_EffectAttract` at
//!   `data/battle_scripts_1.s:1645,1650`.
//! - `ABILITY_OBLIVIOUS` is `include/constants/abilities.h:16`;
//!   `STATUS2_INFATUATION`/`STATUS2_INFATUATED_WITH` are
//!   `include/constants/battle.h:142-143`; `MON_GENDERLESS` is
//!   `include/constants/pokemon.h:171`; `GetGenderFromSpeciesAndPersonality`
//!   is `src/pokemon.c:3471-3485`.
//!
//! This leaf deliberately owns neither opcode registration shape validation,
//! a generic machine, RNG, events, scheduler state, nor the WASM boundary.

use core::fmt;

use crate::{
    battle_script_ai_reveal::{
        record_battle_script_ability_reveal, BattleScriptAiRevealBattler, BattleScriptAiRevealRules,
    },
    battle_script_gender::{resolve_battle_script_mon_gender, BattleScriptGenderError},
    gender::MonGender,
};

/// Source `MAX_BATTLERS_COUNT`; the indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_TRYINFATUATING_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYINFATUATING` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYINFATUATING_OPCODE: u8 = 0x97;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME: &str = "B_SCR_OP_TRYINFATUATING";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYINFATUATING_DISPATCHER: &str = "Cmd_tryinfatuating";
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYINFATUATING_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYINFATUATING_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/abilities.h:16` -- `ABILITY_OBLIVIOUS`.
pub const BATTLE_SCRIPT_ABILITY_OBLIVIOUS: u8 = 12;
/// `include/constants/battle.h:142` -- `STATUS2_INFATUATION`, the four packed
/// bits at 16..19 (one per battler).
pub const BATTLE_SCRIPT_STATUS2_INFATUATION: u32 = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19);
/// The hardcoded (not operand-supplied) destination taken on target Oblivious.
pub const BATTLE_SCRIPT_TRYINFATUATING_OBLIVIOUS_LABEL: &str =
    "BattleScript_ObliviousPreventsAttraction";

/// `include/constants/battle.h:143` -- `STATUS2_INFATUATED_WITH(battler)`
/// (`gBitTable[battler] << 16`).
#[must_use]
pub const fn status2_infatuated_with(battler: BattleScriptTryinfatuatingBattler) -> u32 {
    1u32 << (16 + battler.index())
}

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// and target selectors and the `gBattleMons` arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryinfatuatingBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain, retained for reusable slot iteration.
pub const BATTLE_SCRIPT_TRYINFATUATING_BATTLERS: [BattleScriptTryinfatuatingBattler;
    BATTLE_SCRIPT_TRYINFATUATING_BATTLER_COUNT] = [
    BattleScriptTryinfatuatingBattler::Battler0,
    BattleScriptTryinfatuatingBattler::Battler1,
    BattleScriptTryinfatuatingBattler::Battler2,
    BattleScriptTryinfatuatingBattler::Battler3,
];

impl BattleScriptTryinfatuatingBattler {
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

impl From<BattleScriptTryinfatuatingBattler> for BattleScriptAiRevealBattler {
    fn from(value: BattleScriptTryinfatuatingBattler) -> Self {
        // Both enums share the identical 0..=3 domain and discriminants.
        Self::try_from(value.as_u8()).expect("BattleScriptTryinfatuatingBattler is 0..=3")
    }
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingBattlerState {
    /// `GetMonData(mon, MON_DATA_SPECIES)`.
    pub species: u16,
    /// `GetMonData(mon, MON_DATA_PERSONALITY)`.
    pub personality: u32,
    /// `gBattleMons[battler].ability`.
    pub ability: u8,
    /// `gBattleMons[battler].status2`, an unsigned 32-bit packed field.
    pub status2: u32,
}

/// The two selector bindings read by the canonical handler. Both are
/// required; a missing role of either produces the canonical typed error
/// before either battler's ability or gender is observed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingRoles {
    pub attacker: Option<BattleScriptTryinfatuatingBattler>,
    pub target: Option<BattleScriptTryinfatuatingBattler>,
}

/// Complete narrow rules slice read or written by this command. It holds
/// four source-indexed battlers, the two selector roles this leaf needs, the
/// `gLastUsedAbility` sibling, and the narrow AI-reveal projection --- not a
/// generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingRules {
    pub battlers:
        [BattleScriptTryinfatuatingBattlerState; BATTLE_SCRIPT_TRYINFATUATING_BATTLER_COUNT],
    pub selector_roles: BattleScriptTryinfatuatingRoles,
    pub last_used_ability: u8,
    pub ai_reveal: BattleScriptAiRevealRules,
}

/// One source-macro operand retained for canonical shape evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source label. Late label resolution is a scheduler/program
/// concern this leaf does not own; the caller resolves the expression (either
/// the hardcoded Oblivious label or the operand's expression) and reports the
/// result here, exactly like the canonical TypeScript handler's own
/// `resolveBattleScriptLabel` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and
/// execution. Registration inspects only `opcode_name` and `opcode_id`,
/// matching the canonical TypeScript factory's lack of shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryinfatuatingOperand<'a>],
    pub resolved_oblivious_target: Option<BattleScriptTryinfatuatingResolvedLabel<'a>>,
    pub resolved_fail_target: Option<BattleScriptTryinfatuatingResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryinfatuatingControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingOutcome {
    pub rules: BattleScriptTryinfatuatingRules,
    pub control: BattleScriptTryinfatuatingControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryinfatuatingRegistrationError {
    NotFound,
}

impl fmt::Display for BattleScriptTryinfatuatingRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => write!(
                formatter,
                "committed Battle Script program does not emit B_SCR_OP_TRYINFATUATING"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryinfatuatingRegistrationError {}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryinfatuatingError<'a> {
    MissingAttackerOrTargetRole,
    UnresolvedObliviousTarget,
    UnknownSpecies(BattleScriptGenderError),
    MissingOperand,
    UnresolvedFailTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTryinfatuatingError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerOrTargetRole => write!(
                formatter,
                "Cmd_tryinfatuating requires both an attacker and a target role"
            ),
            Self::UnresolvedObliviousTarget => write!(
                formatter,
                "Cmd_tryinfatuating: BattleScript_ObliviousPreventsAttraction is not in the committed program"
            ),
            Self::UnknownSpecies(error) => write!(formatter, "{error}"),
            Self::MissingOperand => write!(
                formatter,
                "Cmd_tryinfatuating: instruction is missing its failure-pointer operand"
            ),
            Self::UnresolvedFailTarget { expression } => write!(
                formatter,
                "Cmd_tryinfatuating: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryinfatuatingError<'_> {}

/// Native projection of `createBattleScriptTryinfatuatingOpcodeHandlers`.
/// Binds the first instruction whose `opcodeName` matches; errors only when
/// none exists. No count or shape validation is performed, matching the
/// canonical TypeScript factory exactly.
pub fn register_battle_script_tryinfatuating_handler(
    instructions: &[BattleScriptTryinfatuatingInstruction<'_>],
) -> Result<BattleScriptTryinfatuatingRegistration, BattleScriptTryinfatuatingRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME)
        .map(|instruction| BattleScriptTryinfatuatingRegistration {
            opcode_id: instruction.opcode_id,
        })
        .ok_or(BattleScriptTryinfatuatingRegistrationError::NotFound)
}

/// Native immutable-value twin of canonical `Cmd_tryinfatuating`.
///
/// Evaluation order matches the canonical handler exactly: both roles are
/// required first; then the target's Oblivious ability takes the hardcoded
/// jump (recording `lastUsedAbility` and the ability reveal); otherwise both
/// genders are resolved and all four fail predicates are evaluated together
/// (none has a side effect, so order does not matter) before either the
/// late-resolved operand jump or the `status2` write and advance.
pub fn apply_battle_script_tryinfatuating<'a>(
    instruction: BattleScriptTryinfatuatingInstruction<'a>,
    rules: &BattleScriptTryinfatuatingRules,
) -> Result<BattleScriptTryinfatuatingOutcome, BattleScriptTryinfatuatingError<'a>> {
    let (Some(attacker), Some(target)) =
        (rules.selector_roles.attacker, rules.selector_roles.target)
    else {
        return Err(BattleScriptTryinfatuatingError::MissingAttackerOrTargetRole);
    };

    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];

    if target_state.ability == BATTLE_SCRIPT_ABILITY_OBLIVIOUS {
        let resolved = instruction
            .resolved_oblivious_target
            .ok_or(BattleScriptTryinfatuatingError::UnresolvedObliviousTarget)?;
        let mut next = *rules;
        next.last_used_ability = BATTLE_SCRIPT_ABILITY_OBLIVIOUS;
        next.ai_reveal = record_battle_script_ability_reveal(
            &rules.ai_reveal,
            target.into(),
            BATTLE_SCRIPT_ABILITY_OBLIVIOUS,
        );
        return Ok(BattleScriptTryinfatuatingOutcome {
            rules: next,
            control: BattleScriptTryinfatuatingControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let attacker_gender =
        resolve_battle_script_mon_gender(attacker_state.species, attacker_state.personality)
            .map_err(BattleScriptTryinfatuatingError::UnknownSpecies)?;
    let target_gender =
        resolve_battle_script_mon_gender(target_state.species, target_state.personality)
            .map_err(BattleScriptTryinfatuatingError::UnknownSpecies)?;

    let already_infatuated = target_state.status2 & BATTLE_SCRIPT_STATUS2_INFATUATION != 0;
    let fails = attacker_gender == target_gender
        || already_infatuated
        || attacker_gender == MonGender::Genderless
        || target_gender == MonGender::Genderless;

    if fails {
        let operand = instruction
            .operands
            .first()
            .ok_or(BattleScriptTryinfatuatingError::MissingOperand)?;
        let resolved = instruction.resolved_fail_target.ok_or(
            BattleScriptTryinfatuatingError::UnresolvedFailTarget {
                expression: operand.expression,
            },
        )?;
        return Ok(BattleScriptTryinfatuatingOutcome {
            rules: *rules,
            control: BattleScriptTryinfatuatingControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next = *rules;
    next.battlers[target.index()].status2 =
        target_state.status2 | status2_infatuated_with(attacker);
    Ok(BattleScriptTryinfatuatingOutcome {
        rules: next,
        control: BattleScriptTryinfatuatingControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub ability_check_line: u32,
    pub oblivious_jump_line: u32,
    pub oblivious_last_used_ability_line: u32,
    pub oblivious_record_ability_line: u32,
    pub fail_condition_line_1: u32,
    pub fail_condition_line_2: u32,
    pub fail_condition_line_3: u32,
    pub fail_condition_line_4: u32,
    pub jump_line: u32,
    pub status2_write_line: u32,
    pub advance_line: u32,
    pub gender_fn_line: u32,
}

pub const BATTLE_SCRIPT_TRYINFATUATING_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTryinfatuatingDecompDispatchEvidence =
    BattleScriptTryinfatuatingDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYINFATUATING_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYINFATUATING_DISPATCHER,
        dispatch_line: 482,
        forward_decl_line: 230,
        handler_line: 7654,
        ability_check_line: 7676,
        oblivious_jump_line: 7678,
        oblivious_last_used_ability_line: 7679,
        oblivious_record_ability_line: 7680,
        fail_condition_line_1: 7684,
        fail_condition_line_2: 7685,
        fail_condition_line_3: 7686,
        fail_condition_line_4: 7687,
        jump_line: 7689,
        status2_write_line: 7693,
        advance_line: 7694,
        gender_fn_line: 3471,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYINFATUATING_MACRO_EVIDENCE: BattleScriptTryinfatuatingMacroEvidence =
    BattleScriptTryinfatuatingMacroEvidence {
        declaration_line: 810,
        opcode_line: 811,
        pointer_line: 812,
        encoded_width_bytes: BATTLE_SCRIPT_TRYINFATUATING_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryinfatuatingCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
    pub oblivious_target_expression: &'static str,
    pub oblivious_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYINFATUATING_CALL_SITE_EVIDENCE:
    BattleScriptTryinfatuatingCallSiteEvidence = BattleScriptTryinfatuatingCallSiteEvidence {
    entry_label: "BattleScript_EffectAttract",
    entry_label_line: 1645,
    statement_line: 1650,
    instruction_program_counter: 1118,
    failure_target_expression: "BattleScript_ButItFailed",
    failure_target_program_counter: 1434,
    oblivious_target_expression: BATTLE_SCRIPT_TRYINFATUATING_OBLIVIOUS_LABEL,
    oblivious_target_program_counter: 2996,
};

#[cfg(test)]
mod tests {
    use super::*;

    const OPERAND: BattleScriptTryinfatuatingOperand<'static> = BattleScriptTryinfatuatingOperand {
        width_bytes: 4,
        expression: "BattleScript_ButItFailed",
    };
    const OPERANDS: [BattleScriptTryinfatuatingOperand<'static>; 1] = [OPERAND];

    fn plain_battler() -> BattleScriptTryinfatuatingBattlerState {
        BattleScriptTryinfatuatingBattlerState {
            species: 25,
            personality: 0,
            ability: 0,
            status2: 0,
        }
    }

    fn rules(
        battlers: [BattleScriptTryinfatuatingBattlerState; 4],
        attacker: Option<BattleScriptTryinfatuatingBattler>,
        target: Option<BattleScriptTryinfatuatingBattler>,
    ) -> BattleScriptTryinfatuatingRules {
        BattleScriptTryinfatuatingRules {
            battlers,
            selector_roles: BattleScriptTryinfatuatingRoles { attacker, target },
            last_used_ability: 0,
            ai_reveal: BattleScriptAiRevealRules::default(),
        }
    }

    fn instruction() -> BattleScriptTryinfatuatingInstruction<'static> {
        BattleScriptTryinfatuatingInstruction {
            opcode_name: BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME,
            program_counter: 1118,
            opcode_id: BATTLE_SCRIPT_TRYINFATUATING_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYINFATUATING_DISPATCHER,
            operands: &OPERANDS,
            resolved_oblivious_target: Some(BattleScriptTryinfatuatingResolvedLabel {
                expression: BATTLE_SCRIPT_TRYINFATUATING_OBLIVIOUS_LABEL,
                program_counter: 2996,
            }),
            resolved_fail_target: Some(BattleScriptTryinfatuatingResolvedLabel {
                expression: "BattleScript_ButItFailed",
                program_counter: 1434,
            }),
        }
    }

    #[test]
    fn oblivious_target_jumps_hardcoded_label_and_reveals_ability() {
        let mut target = plain_battler();
        target.ability = BATTLE_SCRIPT_ABILITY_OBLIVIOUS;
        let input = rules(
            [plain_battler(), target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let outcome =
            apply_battle_script_tryinfatuating(instruction(), &input).expect("oblivious jumps");
        assert_eq!(
            outcome.control,
            BattleScriptTryinfatuatingControl::Jump { program_counter: 2996 }
        );
        assert_eq!(
            outcome.rules.last_used_ability,
            BATTLE_SCRIPT_ABILITY_OBLIVIOUS
        );
        assert_eq!(
            outcome.rules.ai_reveal.ai_observed_ability_ids[1],
            BATTLE_SCRIPT_ABILITY_OBLIVIOUS
        );
        assert_eq!(outcome.rules.battlers[1].status2, 0);
    }

    #[test]
    fn same_gender_fails_via_operand_pointer_untouched_status() {
        // species 25 (Pikachu-like ratio 127), personality low byte 200 -> male for both.
        let mut attacker = plain_battler();
        attacker.personality = 200;
        let mut target = plain_battler();
        target.personality = 200;
        let input = rules(
            [attacker, target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let outcome =
            apply_battle_script_tryinfatuating(instruction(), &input).expect("same gender fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryinfatuatingControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules.battlers[1].status2, 0);
    }

    #[test]
    fn genderless_species_fails_even_with_distinct_personality() {
        let mut attacker = plain_battler();
        attacker.species = 81; // Magnemite: genderless
        let mut target = plain_battler();
        target.personality = 0; // female under ratio 127
        let input = rules(
            [attacker, target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let outcome = apply_battle_script_tryinfatuating(instruction(), &input)
            .expect("genderless attacker fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryinfatuatingControl::Jump { program_counter: 1434 }
        );
    }

    #[test]
    fn already_infatuated_with_a_third_battler_still_fails() {
        let mut target = plain_battler();
        target.personality = 0; // female
        target.status2 = 1 << (16 + 2);
        let mut attacker = plain_battler();
        attacker.personality = 200; // male
        let input = rules(
            [attacker, target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let outcome = apply_battle_script_tryinfatuating(instruction(), &input)
            .expect("already infatuated fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryinfatuatingControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules.battlers[1].status2, 1 << (16 + 2));
    }

    #[test]
    fn opposite_gender_succeeds_and_ors_status2_bit() {
        let mut attacker = plain_battler();
        attacker.personality = 200; // male
        let mut target = plain_battler();
        target.personality = 0; // female
        target.status2 = 1 << 3; // unrelated preexisting bit
        let input = rules(
            [attacker, target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let outcome = apply_battle_script_tryinfatuating(instruction(), &input)
            .expect("opposite gender succeeds");
        assert_eq!(outcome.control, BattleScriptTryinfatuatingControl::Advance);
        assert_eq!(outcome.rules.battlers[1].status2, (1 << 3) | (1 << 16));
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
    }

    #[test]
    fn missing_roles_and_unresolved_labels_produce_exact_errors() {
        let input = rules(
            [
                plain_battler(),
                plain_battler(),
                plain_battler(),
                plain_battler(),
            ],
            None,
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        assert_eq!(
            apply_battle_script_tryinfatuating(instruction(), &input)
                .expect_err("missing attacker")
                .to_string(),
            "Cmd_tryinfatuating requires both an attacker and a target role"
        );

        let mut oblivious_target = plain_battler();
        oblivious_target.ability = BATTLE_SCRIPT_ABILITY_OBLIVIOUS;
        let unresolved_oblivious = rules(
            [
                plain_battler(),
                oblivious_target,
                plain_battler(),
                plain_battler(),
            ],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let instruction_no_oblivious = BattleScriptTryinfatuatingInstruction {
            resolved_oblivious_target: None,
            ..instruction()
        };
        assert_eq!(
            apply_battle_script_tryinfatuating(instruction_no_oblivious, &unresolved_oblivious)
                .expect_err("unresolved oblivious target")
                .to_string(),
            "Cmd_tryinfatuating: BattleScript_ObliviousPreventsAttraction is not in the committed program"
        );

        let mut attacker = plain_battler();
        attacker.personality = 200;
        let mut target = plain_battler();
        target.personality = 200;
        let same_gender = rules(
            [attacker, target, plain_battler(), plain_battler()],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        let instruction_no_fail =
            BattleScriptTryinfatuatingInstruction { resolved_fail_target: None, ..instruction() };
        assert_eq!(
            apply_battle_script_tryinfatuating(instruction_no_fail, &same_gender)
                .expect_err("unresolved fail target")
                .to_string(),
            "Cmd_tryinfatuating: unresolved jump target BattleScript_ButItFailed"
        );

        let unknown_species_attacker = BattleScriptTryinfatuatingBattlerState {
            species: 0xffff,
            personality: 0,
            ability: 0,
            status2: 0,
        };
        let unknown_species = rules(
            [
                unknown_species_attacker,
                plain_battler(),
                plain_battler(),
                plain_battler(),
            ],
            Some(BattleScriptTryinfatuatingBattler::Battler0),
            Some(BattleScriptTryinfatuatingBattler::Battler1),
        );
        assert_eq!(
            apply_battle_script_tryinfatuating(instruction(), &unknown_species)
                .expect_err("unknown species")
                .to_string(),
            "no genderRatio data for species id 65535"
        );
    }

    #[test]
    fn registration_binds_first_match_and_requires_presence() {
        assert_eq!(
            register_battle_script_tryinfatuating_handler(&[instruction()])
                .expect("singleton registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYINFATUATING_OPCODE
        );
        let duplicate = [instruction(), instruction()];
        assert_eq!(
            register_battle_script_tryinfatuating_handler(&duplicate)
                .expect("first of duplicates registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYINFATUATING_OPCODE
        );
        let noise = BattleScriptTryinfatuatingInstruction {
            opcode_name: "B_SCR_OP_RUST_NOISE",
            opcode_id: 0,
            ..instruction()
        };
        assert_eq!(
            register_battle_script_tryinfatuating_handler(&[noise])
                .expect_err("no match")
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_TRYINFATUATING"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYINFATUATING_BATTLERS {
            assert_eq!(
                BattleScriptTryinfatuatingBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTryinfatuatingBattler::from_u8(4), None);
    }
}
