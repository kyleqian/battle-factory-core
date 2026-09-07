//! Pure `B_SCR_OP_TRYWISH` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrywishOpcode.ts`, not a generic Battle Script
//! machine. `Cmd_trywish` is a single dispatch entry with two selector-byte
//! modes: mode 0 (Wish's own effect script) installs the two-turn wish
//! counter on the attacker's positional slot and remembers that slot's
//! current party index, or -- if a wish is already pending there -- jumps
//! through the late-resolved operand pointer with the rules unchanged. Mode
//! 1 (`BattleScript_WishComesTrue`) always prepares the remembered mon
//! identity and negative half-max-HP damage for the target, then either
//! jumps through the operand pointer (full HP) or advances into the
//! genuine heal script, carrying the prepared rules on both branches. No
//! branch consumes RNG, emits an event, changes scheduler state, or touches
//! presentation.
//!
//! Source authority:
//! - `Cmd_trywish` is `reference/pokeemerald/src/battle_script_commands.c:9292-9323`;
//!   dispatch `:543` (`//0xD4`), forward declaration `:291`.
//! - The six-byte macro is `asm/macros/battle_script.inc:1086-1090`.
//! - The two concrete call sites are `BattleScript_EffectWish`
//!   (`data/battle_scripts_1.s:2358,2362`, `trywish 0, BattleScript_ButItFailed`)
//!   and `BattleScript_WishComesTrue` (`:3589,3590`,
//!   `trywish 1, BattleScript_WishButFullHp`).
//! - `gWishFutureKnock.wishCounter`/`wishMonId` are both
//!   `u8[MAX_BATTLERS_COUNT]` at `include/battle.h:170-171`.
//! - `PREPARE_MON_NICK_WITH_PREFIX_BUFFER` is `include/battle_message.h:184`.
//! - `B_SCR_OP_TRYWISH` is `include/constants/battle_script_commands.h:218`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYWISH_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYWISH` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYWISH_OPCODE: u8 = 0xd4;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYWISH_OPCODE_NAME: &str = "B_SCR_OP_TRYWISH";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYWISH_DISPATCHER: &str = "Cmd_trywish";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYWISH_CONCRETE_START_COUNT: usize = 2;
/// First operand of the six-byte source macro is a one-byte mode selector.
pub const BATTLE_SCRIPT_TRYWISH_SELECTOR_WIDTH_BYTES: u8 = 1;
/// Second operand of the six-byte source macro is a four-byte script pointer.
pub const BATTLE_SCRIPT_TRYWISH_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYWISH_ENCODED_WIDTH_BYTES: u8 = 6;
/// Mode 0: Wish's own effect script (install the counter).
pub const BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH: &str = "0";
/// Mode 1: `BattleScript_WishComesTrue` (the delayed heal).
pub const BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT: &str = "1";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrywishBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYWISH_BATTLERS: [BattleScriptTrywishBattler;
    BATTLE_SCRIPT_TRYWISH_BATTLER_COUNT] = [
    BattleScriptTrywishBattler::Battler0,
    BattleScriptTrywishBattler::Battler1,
    BattleScriptTrywishBattler::Battler2,
    BattleScriptTrywishBattler::Battler3,
];

impl BattleScriptTrywishBattler {
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

/// The complete per-battler projection read or written by this opcode.
/// `hp`/`max_hp`/`party_index` are the only fields this command ever reads;
/// `ability`/`item`/`status1` are salted noise that must survive both modes
/// untouched, proving the command's narrow ownership boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishBattlerState {
    pub hp: u16,
    pub max_hp: u16,
    pub party_index: u8,
    pub ability: u8,
    pub item: u16,
    pub status1: u32,
}

/// Canonical selector bindings. Mode 0 reads only `attacker`; mode 1 reads
/// only `target`. Both are `Option` because a missing role is a distinct
/// per-mode error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishRoles {
    pub attacker: Option<BattleScriptTrywishBattler>,
    pub target: Option<BattleScriptTrywishBattler>,
}

/// Typed form of `PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1,
/// battler, partyId)`, written only by mode 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishMonNick {
    pub battler: BattleScriptTrywishBattler,
    pub party_index: u8,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishRules {
    pub battlers: [BattleScriptTrywishBattlerState; BATTLE_SCRIPT_TRYWISH_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrywishRoles,
    /// Source `gWishFutureKnock.wishCounter[MAX_BATTLERS_COUNT]`, written
    /// only by mode 0's advance branch.
    pub wish_counter: [u8; BATTLE_SCRIPT_TRYWISH_BATTLER_COUNT],
    /// Source `gWishFutureKnock.wishMonId[MAX_BATTLERS_COUNT]`, written only
    /// by mode 0's advance branch and read only by mode 1.
    pub wish_mon_id: [u8; BATTLE_SCRIPT_TRYWISH_BATTLER_COUNT],
    /// Source `s32 gBattleMoveDamage`, written only by mode 1 (both branches).
    pub battle_move_damage: i32,
    /// Written only by mode 1 (both branches).
    pub battle_text_buff1_mon_nick: Option<BattleScriptTrywishMonNick>,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source jump label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrywishOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, exactly like the canonical TypeScript
    /// factory's own `resolveBattleScriptLabel` call inside the handler.
    /// Both modes resolve the *same* operand-one expression only on their
    /// own jump branch, so an unresolved pointer is invisible on either
    /// mode's advance branch.
    pub resolved_jump_target: Option<BattleScriptTrywishResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrywishControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishOutcome {
    pub rules: BattleScriptTrywishRules,
    pub control: BattleScriptTrywishControl,
}

/// Exact canonical registration failures. The TypeScript factory validates
/// only cardinality and shared opcode identity -- never operand shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrywishRegistrationError {
    WrongCardinality { count: usize },
    MismatchedOpcode,
}

impl fmt::Display for BattleScriptTrywishRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found {count}"
            ),
            Self::MismatchedOpcode => write!(
                formatter,
                "committed B_SCR_OP_TRYWISH instructions must share source opcode 0xd4"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrywishRegistrationError {}

/// Exact observable per-execution errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrywishError<'a> {
    InvalidOperandShape,
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrywishError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidOperandShape => write!(
                formatter,
                "Cmd_trywish requires one selector byte (0/1) and one four-byte script pointer"
            ),
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_trywish requires a attacker role")
            }
            Self::MissingTargetRole => write!(formatter, "Cmd_trywish requires a target role"),
            Self::UnresolvedJumpTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_trywish: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTrywishError<'_> {}

/// Native projection of `createBattleScriptTrywishOpcodeHandlers`. Wrong
/// cardinality fails before opcode identity is inspected; successful
/// registration contains precisely one opcode key. No operand is inspected
/// here -- that validation is a per-execution concern.
pub fn register_battle_script_trywish_handler<'a>(
    instructions: &[BattleScriptTrywishInstruction<'a>],
) -> Result<BattleScriptTrywishRegistration, BattleScriptTrywishRegistrationError> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYWISH_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYWISH_CONCRETE_START_COUNT {
        return Err(BattleScriptTrywishRegistrationError::WrongCardinality {
            count: matching.len(),
        });
    }
    let opcode_id = matching[0].opcode_id;
    if opcode_id != BATTLE_SCRIPT_TRYWISH_OPCODE
        || matching
            .iter()
            .any(|instruction| instruction.opcode_id != opcode_id)
    {
        return Err(BattleScriptTrywishRegistrationError::MismatchedOpcode);
    }
    Ok(BattleScriptTrywishRegistration { opcode_id })
}

fn validate_operands<'a>(
    instruction: &BattleScriptTrywishInstruction<'a>,
) -> Result<(&'a str, &'a str), BattleScriptTrywishError<'a>> {
    let [selector, jump] = instruction.operands else {
        return Err(BattleScriptTrywishError::InvalidOperandShape);
    };
    if selector.width_bytes != BATTLE_SCRIPT_TRYWISH_SELECTOR_WIDTH_BYTES
        || (selector.expression != BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH
            && selector.expression != BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT)
        || jump.width_bytes != BATTLE_SCRIPT_TRYWISH_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTrywishError::InvalidOperandShape);
    }
    Ok((selector.expression, jump.expression))
}

/// Source-shaped positive half: `max(1, floor(maxHP / 2))` over the complete
/// source `u16` input domain. `u16::MAX` therefore produces `32767`; minimum
/// clamping handles both zero and one max-HP values.
#[must_use]
pub const fn battle_script_trywish_half_max_hp(max_hp: u16) -> u16 {
    let half = max_hp / 2;
    if half == 0 {
        1
    } else {
        half
    }
}

fn resolve_jump<'a>(
    instruction: &BattleScriptTrywishInstruction<'a>,
    jump_expression: &'a str,
) -> Result<u32, BattleScriptTrywishError<'a>> {
    instruction
        .resolved_jump_target
        .map(|resolved| resolved.program_counter)
        .ok_or(BattleScriptTrywishError::UnresolvedJumpTarget { expression: jump_expression })
}

/// Native immutable-value twin of canonical `Cmd_trywish`.
///
/// Operand shape is validated before either mode is examined. Mode 0
/// requires the attacker role; if a wish is already pending there, it jumps
/// through the late-resolved operand pointer with rules unchanged, else it
/// advances after installing the counter and remembered party index. Mode 1
/// requires the target role and unconditionally prepares the remembered mon
/// identity and negative half-max-HP damage before comparing exact full HP,
/// carrying those prepared rules on *both* its jump and advance branches.
pub fn apply_battle_script_trywish<'a>(
    instruction: BattleScriptTrywishInstruction<'a>,
    rules: &BattleScriptTrywishRules,
) -> Result<BattleScriptTrywishOutcome, BattleScriptTrywishError<'a>> {
    let (selector, jump_expression) = validate_operands(&instruction)?;

    if selector == BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH {
        let attacker = rules
            .selector_roles
            .attacker
            .ok_or(BattleScriptTrywishError::MissingAttackerRole)?;
        if rules.wish_counter[attacker.index()] != 0 {
            let program_counter = resolve_jump(&instruction, jump_expression)?;
            return Ok(BattleScriptTrywishOutcome {
                rules: *rules,
                control: BattleScriptTrywishControl::Jump { program_counter },
            });
        }
        let mut next_rules = *rules;
        next_rules.wish_counter[attacker.index()] = 2;
        next_rules.wish_mon_id[attacker.index()] = rules.battlers[attacker.index()].party_index;
        return Ok(BattleScriptTrywishOutcome {
            rules: next_rules,
            control: BattleScriptTrywishControl::Advance,
        });
    }

    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrywishError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];
    let heal = battle_script_trywish_half_max_hp(target_state.max_hp);
    let mut next_rules = *rules;
    next_rules.battle_move_damage = -i32::from(heal);
    next_rules.battle_text_buff1_mon_nick = Some(BattleScriptTrywishMonNick {
        battler: target,
        party_index: rules.wish_mon_id[target.index()],
    });

    if target_state.hp == target_state.max_hp {
        let program_counter = resolve_jump(&instruction, jump_expression)?;
        return Ok(BattleScriptTrywishOutcome {
            rules: next_rules,
            control: BattleScriptTrywishControl::Jump { program_counter },
        });
    }
    Ok(BattleScriptTrywishOutcome {
        rules: next_rules,
        control: BattleScriptTrywishControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub mode0_check_line: u32,
    pub mode0_set_counter_line: u32,
    pub mode0_set_mon_id_line: u32,
    pub mode0_advance_line: u32,
    pub mode0_jump_line: u32,
    pub mode1_prepare_buffer_line: u32,
    pub mode1_damage_line: u32,
    pub mode1_zero_check_line: u32,
    pub mode1_negate_line: u32,
    pub mode1_full_hp_check_line: u32,
    pub mode1_jump_line: u32,
    pub mode1_advance_line: u32,
}

pub const BATTLE_SCRIPT_TRYWISH_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTrywishDecompDispatchEvidence = BattleScriptTrywishDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_TRYWISH_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_TRYWISH_OPCODE,
    dispatcher: BATTLE_SCRIPT_TRYWISH_DISPATCHER,
    dispatch_line: 543,
    forward_decl_line: 291,
    handler_line: 9292,
    mode0_check_line: 9297,
    mode0_set_counter_line: 9299,
    mode0_set_mon_id_line: 9300,
    mode0_advance_line: 9301,
    mode0_jump_line: 9305,
    mode1_prepare_buffer_line: 9309,
    mode1_damage_line: 9311,
    mode1_zero_check_line: 9312,
    mode1_negate_line: 9314,
    mode1_full_hp_check_line: 9316,
    mode1_jump_line: 9317,
    mode1_advance_line: 9319,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub turn_number_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYWISH_MACRO_EVIDENCE: BattleScriptTrywishMacroEvidence =
    BattleScriptTrywishMacroEvidence {
        declaration_line: 1086,
        opcode_line: 1087,
        turn_number_line: 1088,
        pointer_line: 1089,
        encoded_width_bytes: BATTLE_SCRIPT_TRYWISH_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrywishCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub selector_expression: &'static str,
    pub target_expression: &'static str,
    pub target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYWISH_CALL_SITE_EVIDENCE: [BattleScriptTrywishCallSiteEvidence;
    BATTLE_SCRIPT_TRYWISH_CONCRETE_START_COUNT] = [
    BattleScriptTrywishCallSiteEvidence {
        entry_label: "BattleScript_EffectWish",
        entry_label_line: 2358,
        statement_line: 2362,
        instruction_program_counter: 1673,
        selector_expression: BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH,
        target_expression: "BattleScript_ButItFailed",
        target_program_counter: 1434,
    },
    BattleScriptTrywishCallSiteEvidence {
        entry_label: "BattleScript_WishComesTrue",
        entry_label_line: 3589,
        statement_line: 3590,
        instruction_program_counter: 2613,
        selector_expression: BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT,
        target_expression: "BattleScript_WishButFullHp",
        target_program_counter: 2623,
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    static MODE0_OPERANDS: [BattleScriptTrywishOperand<'static>; 2] = [
        BattleScriptTrywishOperand {
            width_bytes: BATTLE_SCRIPT_TRYWISH_SELECTOR_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH,
        },
        BattleScriptTrywishOperand {
            width_bytes: BATTLE_SCRIPT_TRYWISH_POINTER_WIDTH_BYTES,
            expression: "BattleScript_SomeTarget",
        },
    ];
    static MODE1_OPERANDS: [BattleScriptTrywishOperand<'static>; 2] = [
        BattleScriptTrywishOperand {
            width_bytes: BATTLE_SCRIPT_TRYWISH_SELECTOR_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT,
        },
        BattleScriptTrywishOperand {
            width_bytes: BATTLE_SCRIPT_TRYWISH_POINTER_WIDTH_BYTES,
            expression: "BattleScript_SomeTarget",
        },
    ];

    fn operands(selector: &'static str) -> &'static [BattleScriptTrywishOperand<'static>; 2] {
        if selector == BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH {
            &MODE0_OPERANDS
        } else {
            &MODE1_OPERANDS
        }
    }

    fn battler(hp: u16, max_hp: u16, party_index: u8) -> BattleScriptTrywishBattlerState {
        BattleScriptTrywishBattlerState {
            hp,
            max_hp,
            party_index,
            ability: 7,
            item: 11,
            status1: 0x1234,
        }
    }

    fn rules(
        battlers: [BattleScriptTrywishBattlerState; 4],
        attacker: Option<BattleScriptTrywishBattler>,
        target: Option<BattleScriptTrywishBattler>,
        wish_counter: [u8; 4],
        wish_mon_id: [u8; 4],
    ) -> BattleScriptTrywishRules {
        BattleScriptTrywishRules {
            battlers,
            selector_roles: BattleScriptTrywishRoles { attacker, target },
            wish_counter,
            wish_mon_id,
            battle_move_damage: i32::MIN,
            battle_text_buff1_mon_nick: None,
        }
    }

    fn instruction(
        operands: &'static [BattleScriptTrywishOperand<'static>],
        resolved_jump_target: Option<BattleScriptTrywishResolvedLabel<'static>>,
    ) -> BattleScriptTrywishInstruction<'static> {
        BattleScriptTrywishInstruction {
            opcode_name: BATTLE_SCRIPT_TRYWISH_OPCODE_NAME,
            program_counter: 1673,
            opcode_id: BATTLE_SCRIPT_TRYWISH_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYWISH_DISPATCHER,
            operands,
            resolved_jump_target,
        }
    }

    const RESOLVED: BattleScriptTrywishResolvedLabel<'static> = BattleScriptTrywishResolvedLabel {
        expression: "BattleScript_SomeTarget",
        program_counter: 1434,
    };

    #[test]
    fn half_helper_covers_minimum_and_u16_endpoints() {
        assert_eq!(battle_script_trywish_half_max_hp(0), 1);
        assert_eq!(battle_script_trywish_half_max_hp(1), 1);
        assert_eq!(battle_script_trywish_half_max_hp(2), 1);
        assert_eq!(battle_script_trywish_half_max_hp(140), 70);
        assert_eq!(battle_script_trywish_half_max_hp(u16::MAX), 32_767);
    }

    #[test]
    fn mode0_installs_counter_and_party_index_on_advance() {
        static OPERANDS: [BattleScriptTrywishOperand<'static>; 2] = [
            BattleScriptTrywishOperand { width_bytes: 1, expression: "0" },
            BattleScriptTrywishOperand { width_bytes: 4, expression: "BattleScript_ButItFailed" },
        ];
        let input = rules(
            [
                battler(70, 140, 3),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            Some(BattleScriptTrywishBattler::Battler0),
            None,
            [0, 0, 0, 0],
            [9, 9, 9, 9],
        );
        let outcome = apply_battle_script_trywish(instruction(&OPERANDS, None), &input)
            .expect("mode 0 installs on advance");
        assert_eq!(outcome.control, BattleScriptTrywishControl::Advance);
        assert_eq!(outcome.rules.wish_counter, [2, 0, 0, 0]);
        assert_eq!(outcome.rules.wish_mon_id, [3, 9, 9, 9]);
        assert_eq!(outcome.rules.battlers, input.battlers);
        assert_eq!(outcome.rules.battle_move_damage, input.battle_move_damage);
        assert_eq!(outcome.rules.battle_text_buff1_mon_nick, None);
    }

    #[test]
    fn mode0_pending_wish_jumps_with_rules_unchanged() {
        static OPERANDS: [BattleScriptTrywishOperand<'static>; 2] = [
            BattleScriptTrywishOperand { width_bytes: 1, expression: "0" },
            BattleScriptTrywishOperand { width_bytes: 4, expression: "BattleScript_ButItFailed" },
        ];
        let input = rules(
            [
                battler(70, 140, 3),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            Some(BattleScriptTrywishBattler::Battler0),
            None,
            [1, 0, 0, 0],
            [4, 0, 0, 0],
        );
        let outcome = apply_battle_script_trywish(instruction(&OPERANDS, Some(RESOLVED)), &input)
            .expect("mode 0 jumps when pending");
        assert_eq!(
            outcome.control,
            BattleScriptTrywishControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
    }

    #[test]
    fn mode1_prepares_negative_half_and_nick_on_both_branches() {
        let operands_advance = operands(BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT);
        let input = rules(
            [
                battler(70, 140, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            Some(BattleScriptTrywishBattler::Battler0),
            [0, 0, 0, 0],
            [5, 0, 0, 0],
        );
        let outcome = apply_battle_script_trywish(instruction(operands_advance, None), &input)
            .expect("nonfull heal advances without resolving pointer");
        assert_eq!(outcome.control, BattleScriptTrywishControl::Advance);
        assert_eq!(outcome.rules.battle_move_damage, -70);
        assert_eq!(
            outcome.rules.battle_text_buff1_mon_nick,
            Some(BattleScriptTrywishMonNick {
                battler: BattleScriptTrywishBattler::Battler0,
                party_index: 5
            })
        );

        let one_max = rules(
            [
                battler(0, 1, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            Some(BattleScriptTrywishBattler::Battler0),
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        );
        let one_max_outcome =
            apply_battle_script_trywish(instruction(operands_advance, None), &one_max)
                .expect("minimum-one clamp");
        assert_eq!(one_max_outcome.rules.battle_move_damage, -1);

        let full = rules(
            [
                battler(140, 140, 2),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            Some(BattleScriptTrywishBattler::Battler0),
            [0, 0, 0, 0],
            [2, 0, 0, 0],
        );
        let full_outcome =
            apply_battle_script_trywish(instruction(operands_advance, Some(RESOLVED)), &full)
                .expect("full hp jumps with prepared rules");
        assert_eq!(
            full_outcome.control,
            BattleScriptTrywishControl::Jump { program_counter: 1434 }
        );
        assert_eq!(full_outcome.rules.battle_move_damage, -70);
        assert_eq!(
            full_outcome.rules.battle_text_buff1_mon_nick,
            Some(BattleScriptTrywishMonNick {
                battler: BattleScriptTrywishBattler::Battler0,
                party_index: 2
            })
        );
    }

    #[test]
    fn lazy_label_resolution_only_bites_on_the_jump_branch() {
        let operands_mode0 = operands(BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH);
        let advancing = rules(
            [
                battler(70, 140, 3),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            Some(BattleScriptTrywishBattler::Battler0),
            None,
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        );
        assert!(apply_battle_script_trywish(instruction(operands_mode0, None), &advancing).is_ok());

        let pending = rules(
            [
                battler(70, 140, 3),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            Some(BattleScriptTrywishBattler::Battler0),
            None,
            [1, 0, 0, 0],
            [0, 0, 0, 0],
        );
        assert_eq!(
            apply_battle_script_trywish(instruction(operands_mode0, None), &pending)
                .expect_err("unresolved pointer on jump branch")
                .to_string(),
            "Cmd_trywish: unresolved jump target BattleScript_SomeTarget"
        );

        let operands_mode1 = operands(BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT);
        let nonfull = rules(
            [
                battler(70, 140, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            Some(BattleScriptTrywishBattler::Battler0),
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        );
        assert!(apply_battle_script_trywish(instruction(operands_mode1, None), &nonfull).is_ok());

        let full = rules(
            [
                battler(140, 140, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            Some(BattleScriptTrywishBattler::Battler0),
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        );
        assert_eq!(
            apply_battle_script_trywish(instruction(operands_mode1, None), &full)
                .expect_err("unresolved pointer on full-hp jump branch")
                .to_string(),
            "Cmd_trywish: unresolved jump target BattleScript_SomeTarget"
        );
    }

    #[test]
    fn operand_shape_precedes_roles() {
        let missing_roles = rules(
            [
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
                battler(0, 0, 0),
            ],
            None,
            None,
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        );
        static BAD: [BattleScriptTrywishOperand<'static>; 1] =
            [BattleScriptTrywishOperand { width_bytes: 1, expression: "0" }];
        assert_eq!(
            apply_battle_script_trywish(instruction(&BAD, None), &missing_roles)
                .expect_err("wrong operand count")
                .to_string(),
            "Cmd_trywish requires one selector byte (0/1) and one four-byte script pointer"
        );

        static BAD_SELECTOR: [BattleScriptTrywishOperand<'static>; 2] = [
            BattleScriptTrywishOperand { width_bytes: 1, expression: "2" },
            BattleScriptTrywishOperand { width_bytes: 4, expression: "BattleScript_SomeTarget" },
        ];
        assert_eq!(
            apply_battle_script_trywish(instruction(&BAD_SELECTOR, None), &missing_roles)
                .expect_err("bad selector expression")
                .to_string(),
            "Cmd_trywish requires one selector byte (0/1) and one four-byte script pointer"
        );

        let operands_mode0 = operands(BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH);
        assert_eq!(
            apply_battle_script_trywish(instruction(operands_mode0, None), &missing_roles)
                .expect_err("attacker role required")
                .to_string(),
            "Cmd_trywish requires a attacker role"
        );

        let operands_mode1 = operands(BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT);
        assert_eq!(
            apply_battle_script_trywish(instruction(operands_mode1, None), &missing_roles)
                .expect_err("target role required")
                .to_string(),
            "Cmd_trywish requires a target role"
        );
    }

    #[test]
    fn registration_accepts_shared_opcode_pair_and_rejects_cardinality_and_mismatch() {
        let a = instruction(&[], None);
        let b = BattleScriptTrywishInstruction { program_counter: 2613, ..a };
        assert_eq!(
            register_battle_script_trywish_handler(&[a, b])
                .expect("pair registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYWISH_OPCODE
        );
        assert_eq!(
            register_battle_script_trywish_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found 0"
        );
        assert_eq!(
            register_battle_script_trywish_handler(&[a])
                .expect_err("one start")
                .to_string(),
            "committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found 1"
        );
        assert_eq!(
            register_battle_script_trywish_handler(&[a, a, a])
                .expect_err("three starts")
                .to_string(),
            "committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found 3"
        );
        let mismatched = BattleScriptTrywishInstruction { opcode_id: 0xd0, ..b };
        assert_eq!(
            register_battle_script_trywish_handler(&[a, mismatched])
                .expect_err("mismatched opcode id")
                .to_string(),
            "committed B_SCR_OP_TRYWISH instructions must share source opcode 0xd4"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYWISH_BATTLERS {
            assert_eq!(
                BattleScriptTrywishBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTrywishBattler::from_u8(4), None);
    }
}
