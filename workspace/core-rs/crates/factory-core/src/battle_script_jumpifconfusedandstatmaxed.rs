//! Pure `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` registration and control projection.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptJumpifconfusedandstatmaxedOpcode.ts`. The source
//! command reads `gBattlerTarget` directly, tests that battler's packed
//! `status2` confusion bits before its selected stat stage, and only reads the
//! encoded pointer on the true branch. It writes no battle state.
//!
//! Source authority:
//! - `B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED` / `0xB4` dispatches to
//!   `Cmd_jumpifconfusedandstatmaxed` at
//!   `reference/pokeemerald/src/battle_script_commands.c:511`.
//! - The command body is `battle_script_commands.c:8571-8578`.
//! - Its six-byte macro is `jumpifconfusedandstatmaxed stat:req, ptr:req` at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:941-945`.
//! - The only concrete starts are Swagger's `STAT_ATK` and Flatter's
//!   `STAT_SPATK` calls in `data/battle_scripts_1.s:1614,2157`.
//!
//! The generic Battle Script program, absolute program counters, scheduler,
//! RNG, presentation, and WASM ABI remain outside this leaf. The narrow
//! projection deliberately carries enough untouched state to ratchet the
//! canonical TypeScript handler's immutable no-write boundary.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; every source-indexed array has four slots.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_STATS` (`STAT_HP` through `STAT_EVASION`).
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_COUNT: usize = 8;

/// The selected program opcode name.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE_NAME: &str =
    "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED";

/// Source dispatch-table identity (`0xB4`).
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE: u8 = 0xb4;

/// Source command identity.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_DISPATCHER: &str =
    "Cmd_jumpifconfusedandstatmaxed";

/// The program contains exactly Swagger and Flatter starts for this opcode.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CONCRETE_START_COUNT: usize = 2;

/// Source `STATUS2_CONFUSION` (`1 << 0 | 1 << 1 | 1 << 2`).
pub const BATTLE_SCRIPT_STATUS2_CONFUSION: u32 = 0x0000_0007;

/// `MAX_STAT_STAGE` from `include/constants/pokemon.h:91`.
pub const BATTLE_SCRIPT_MAX_STAT_STAGE: i8 = 12;

/// Macro byte widths: opcode plus one stat byte plus one pointer.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_ENCODED_WIDTH_BYTES: u8 = 6;

/// Complete source battler-id domain used by selector roles and battle arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifconfusedandstatmaxedBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain retained for target and sibling ratchets.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLERS:
    [BattleScriptJumpifconfusedandstatmaxedBattler;
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT] = [
    BattleScriptJumpifconfusedandstatmaxedBattler::Battler0,
    BattleScriptJumpifconfusedandstatmaxedBattler::Battler1,
    BattleScriptJumpifconfusedandstatmaxedBattler::Battler2,
    BattleScriptJumpifconfusedandstatmaxedBattler::Battler3,
];

impl BattleScriptJumpifconfusedandstatmaxedBattler {
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
}

/// The two raw source stat operands that canonical registration accepts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptJumpifconfusedandstatmaxedStat {
    Attack,
    SpecialAttack,
}

impl BattleScriptJumpifconfusedandstatmaxedStat {
    /// `gBattleMons[].statStages` source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        match self {
            Self::Attack => 1,
            Self::SpecialAttack => 4,
        }
    }

    /// Canonical program expression for this raw one-byte operand.
    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::Attack => "STAT_ATK",
            Self::SpecialAttack => "STAT_SPATK",
        }
    }
}

/// Accepted source operand identities, in source-call-site order.
pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STATS:
    [BattleScriptJumpifconfusedandstatmaxedStat;
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CONCRETE_START_COUNT] = [
    BattleScriptJumpifconfusedandstatmaxedStat::Attack,
    BattleScriptJumpifconfusedandstatmaxedStat::SpecialAttack,
];

#[must_use]
pub fn battle_script_jumpifconfusedandstatmaxed_stat_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifconfusedandstatmaxedStat> {
    if expression == "STAT_ATK" {
        Some(BattleScriptJumpifconfusedandstatmaxedStat::Attack)
    } else if expression == "STAT_SPATK" {
        Some(BattleScriptJumpifconfusedandstatmaxedStat::SpecialAttack)
    } else {
        None
    }
}

/// Full per-battler narrow projection. The command reads only `status2` and
/// one `stat_stages` element of the selected target; all remaining values pin
/// the canonical immutable rules-context pass-through.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    /// Canonical `BattleScriptStatStages` values are signed source `s8`s.
    pub stat_stages: [i8; BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_COUNT],
    pub item: u16,
    pub party_index: u8,
}

/// Selector bindings preserved by the no-write handler. Only `target` is
/// read, exactly as `gBattlerTarget` is read by the C command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedRoles {
    pub attacker: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,
    pub target: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,
    pub effect_battler: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,
    pub fainted: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,
}

/// Representative independent rules-context state preserved verbatim by the
/// TypeScript command transition.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedContextState {
    pub scripting_battler: BattleScriptJumpifconfusedandstatmaxedBattler,
    pub current_move: u16,
    pub move_result_flags: u8,
    pub hit_marker: u32,
    pub battle_move_damage: i32,
    pub bide_dmg: [i32; BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT],
}

/// Complete narrow immutable input/output projection for this leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedRules {
    pub battlers: [BattleScriptJumpifconfusedandstatmaxedBattlerState;
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT],
    pub selector_roles: BattleScriptJumpifconfusedandstatmaxedRoles,
    pub context_state: BattleScriptJumpifconfusedandstatmaxedContextState,
}

/// One source-shaped decoded operand used by registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Program instruction projection used by canonical registration. The
/// TypeScript factory intentionally keys only off `opcode_name`; opcode id
/// and dispatcher stay in this projection so the differential corpus can pin
/// that exact factory boundary rather than silently strengthening it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptJumpifconfusedandstatmaxedOperand<'a>],
    pub jump_target_resolves: bool,
}

/// Successful registration's one dynamic handler-map key.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedRegistration {
    pub opcode_id: u8,
}

/// Exact factory failures in the TypeScript registration evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifconfusedandstatmaxedRegistrationError<'a> {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownStat { expression: &'a str },
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifconfusedandstatmaxedRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED requires both concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED shape at program counter {program_counter}"
            ),
            Self::UnknownStat { expression } => write!(
                formatter,
                "unknown B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED stat {expression}"
            ),
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "unresolved B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifconfusedandstatmaxedRegistrationError<'_> {}

/// Native projection of
/// `createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers(program)`.
///
/// It filters by opcode name before validating the exact count. With exactly
/// two starts, it validates each in source-program order: operand arity and
/// widths, accepted raw stat expression, then pointer-label resolution. As in
/// the canonical factory, only the first selected instruction's dynamic opcode
/// id becomes the returned handler-map key.
pub fn register_battle_script_jumpifconfusedandstatmaxed_handler<'a>(
    instructions: &[BattleScriptJumpifconfusedandstatmaxedRegistrationInstruction<'a>],
) -> Result<
    BattleScriptJumpifconfusedandstatmaxedRegistration,
    BattleScriptJumpifconfusedandstatmaxedRegistrationError<'a>,
> {
    let mut first = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE_NAME {
            count += 1;
            if first.is_none() {
                first = Some(*instruction);
            }
        }
    }
    if count != BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CONCRETE_START_COUNT {
        return Err(
            BattleScriptJumpifconfusedandstatmaxedRegistrationError::IncorrectConcreteStartCount {
                count,
            },
        );
    }

    for instruction in instructions {
        if instruction.opcode_name != BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE_NAME {
            continue;
        }
        let [stat_operand, pointer_operand] = instruction.operands else {
            return Err(
                BattleScriptJumpifconfusedandstatmaxedRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        };
        if stat_operand.width_bytes != BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_WIDTH_BYTES
            || pointer_operand.width_bytes
                != BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_POINTER_WIDTH_BYTES
        {
            return Err(
                BattleScriptJumpifconfusedandstatmaxedRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
        if battle_script_jumpifconfusedandstatmaxed_stat_from_expression(stat_operand.expression)
            .is_none()
        {
            return Err(
                BattleScriptJumpifconfusedandstatmaxedRegistrationError::UnknownStat {
                    expression: stat_operand.expression,
                },
            );
        }
        if !instruction.jump_target_resolves {
            return Err(
                BattleScriptJumpifconfusedandstatmaxedRegistrationError::UnresolvedJumpTarget {
                    expression: pointer_operand.expression,
                },
            );
        }
    }

    Ok(BattleScriptJumpifconfusedandstatmaxedRegistration {
        opcode_id: first
            .expect("two selected starts after count check")
            .opcode_id,
    })
}

/// Handler-time decoded instruction and late label lookup projection. The
/// canonical handler assumes registration supplied a valid instruction but
/// still guards an unexpectedly unknown stat before reading `target`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedExecution<'a> {
    pub program_counter: u32,
    pub stat_expression: &'a str,
    pub jump_target_expression: &'a str,
    pub jump_target_resolves: bool,
}

/// Machine-independent command control. The surrounding Battle Script
/// machine owns actual cursor arithmetic and absolute pointer values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifconfusedandstatmaxedControl {
    /// The source false branch advances its six-byte instruction.
    Advance,
    /// The source true branch follows its resolved pointer operand.
    Jump,
}

/// Successful immutable handler result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedOutcome {
    pub rules: BattleScriptJumpifconfusedandstatmaxedRules,
    pub control: BattleScriptJumpifconfusedandstatmaxedControl,
}

/// Exact direct-handler errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifconfusedandstatmaxedError<'a> {
    ValidatedInstructionBecameUndecodable { program_counter: u32 },
    MissingTargetRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifconfusedandstatmaxedError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ValidatedInstructionBecameUndecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED became undecodable at {program_counter}"
            ),
            Self::MissingTargetRole => {
                write!(formatter, "Cmd_jumpifconfusedandstatmaxed requires a target role")
            }
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_jumpifconfusedandstatmaxed: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifconfusedandstatmaxedError<'_> {}

/// Native immutable-value twin of `Cmd_jumpifconfusedandstatmaxed`.
///
/// The raw stat expression is decoded before any role read, mirroring the
/// canonical handler's defensive check. A target is then required before its
/// source-array entry is inspected. The source's `&&` ordering is retained:
/// `status2 & STATUS2_CONFUSION` is evaluated first, and only a confused
/// target reads `stat_stages[stat]`. The pointer is resolved only when both
/// conjuncts are true. Neither outcome writes rules state or consumes RNG.
pub fn apply_battle_script_jumpifconfusedandstatmaxed<'a>(
    execution: BattleScriptJumpifconfusedandstatmaxedExecution<'a>,
    rules: &BattleScriptJumpifconfusedandstatmaxedRules,
) -> Result<
    BattleScriptJumpifconfusedandstatmaxedOutcome,
    BattleScriptJumpifconfusedandstatmaxedError<'a>,
> {
    let stat =
        battle_script_jumpifconfusedandstatmaxed_stat_from_expression(execution.stat_expression)
            .ok_or(
            BattleScriptJumpifconfusedandstatmaxedError::ValidatedInstructionBecameUndecodable {
                program_counter: execution.program_counter,
            },
        )?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptJumpifconfusedandstatmaxedError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];
    let condition = target_state.status2 & BATTLE_SCRIPT_STATUS2_CONFUSION != 0
        && target_state.stat_stages[stat.index()] == BATTLE_SCRIPT_MAX_STAT_STAGE;
    if !condition {
        return Ok(BattleScriptJumpifconfusedandstatmaxedOutcome {
            rules: *rules,
            control: BattleScriptJumpifconfusedandstatmaxedControl::Advance,
        });
    }
    if !execution.jump_target_resolves {
        return Err(
            BattleScriptJumpifconfusedandstatmaxedError::UnresolvedJumpTarget {
                expression: execution.jump_target_expression,
            },
        );
    }
    Ok(BattleScriptJumpifconfusedandstatmaxedOutcome {
        rules: *rules,
        control: BattleScriptJumpifconfusedandstatmaxedControl::Jump,
    })
}

/// Bounded pinned source/decomp metadata, deliberately separate from the
/// generated TypeScript differential corpus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub handler_line: u32,
    pub condition_status2_line: u32,
    pub condition_stat_stage_line: u32,
    pub jump_line: u32,
    pub advance_line: u32,
    pub confusion_mask_line: u32,
    pub max_stat_stage_line: u32,
}

pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CANONICAL_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptJumpifconfusedandstatmaxedDecompDispatchEvidence =
    BattleScriptJumpifconfusedandstatmaxedDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE,
        dispatcher: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_DISPATCHER,
        dispatch_line: 511,
        handler_line: 8571,
        condition_status2_line: 8573,
        condition_stat_stage_line: 8574,
        jump_line: 8575,
        advance_line: 8577,
        confusion_mask_line: 129,
        max_stat_stage_line: 91,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedMacroEvidence {
    pub macro_name: &'static str,
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub stat_line: u32,
    pub pointer_line: u32,
    pub stat_width_bytes: u8,
    pub pointer_width_bytes: u8,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_MACRO_EVIDENCE:
    BattleScriptJumpifconfusedandstatmaxedMacroEvidence =
    BattleScriptJumpifconfusedandstatmaxedMacroEvidence {
        macro_name: "jumpifconfusedandstatmaxed",
        declaration_line: 941,
        opcode_line: 942,
        stat_line: 943,
        pointer_line: 944,
        stat_width_bytes: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_WIDTH_BYTES,
        pointer_width_bytes: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_POINTER_WIDTH_BYTES,
        encoded_width_bytes: BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub entry_program_counter: u32,
    pub statement_line: u32,
    pub invocation_mnemonic: &'static str,
    pub stat_expression: &'static str,
    pub stat_stage_index: u8,
    pub target_expression: &'static str,
    pub instruction_program_counter: u32,
    pub target_program_counter: u32,
}

pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CALL_SITE_EVIDENCE:
    [BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence;
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CONCRETE_START_COUNT] = [
    BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence {
        entry_label: "BattleScript_EffectSwagger",
        entry_label_line: 1608,
        entry_program_counter: 1083,
        statement_line: 1614,
        invocation_mnemonic: "jumpifconfusedandstatmaxed",
        stat_expression: "STAT_ATK",
        stat_stage_index: 1,
        target_expression: "BattleScript_ButItFailed",
        instruction_program_counter: 1088,
        target_program_counter: 1434,
    },
    BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence {
        entry_label: "BattleScript_EffectFlatter",
        entry_label_line: 2151,
        entry_program_counter: 1505,
        statement_line: 2157,
        invocation_mnemonic: "jumpifconfusedandstatmaxed",
        stat_expression: "STAT_SPATK",
        stat_stage_index: 4,
        target_expression: "BattleScript_ButItFailed",
        instruction_program_counter: 1510,
        target_program_counter: 1434,
    },
];
