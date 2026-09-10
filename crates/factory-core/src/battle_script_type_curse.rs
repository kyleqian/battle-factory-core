//! Pure `B_SCR_OP_JUMPIFTYPE` (0x22, `Cmd_jumpiftype`) /
//! `B_SCR_OP_JUMPIFTYPE2` (0x42, `Cmd_jumpiftype2`) /
//! `B_SCR_OP_CURSETARGET` (0xAF, `Cmd_cursetarget`) leaf.
//!
//! The two type-jumps are semantically IDENTICAL at runtime: both compare an
//! encoded type against both `types[]` slots of a resolved battler (C's
//! `IS_BATTLER_OF_TYPE` macro, `include/battle.h:471`, and
//! `Cmd_jumpiftype2`'s inlined equivalent), yet they come from two different
//! TypeScript files with two different validation philosophies, so this
//! module keeps them as two entry points sharing one comparison core.
//! `Cmd_cursetarget` rides in the same curse factory
//! (`src/engine/battleScriptCurseOpcode.ts`, whole file) as `jumpiftype2`.
//!
//! - **`jumpiftype`** --
//!   `createJumpiftypeOpcodeHandler` (`battleScriptStatusPrimaryOpcode.ts:133-157`).
//!   Runtime order is PINNED: (a) the type operand must be one of the 18
//!   Gen-3 `TYPE_*` names (`TYPE_NAMES`, `battleScriptStatusPrimaryOpcode.ts:77-83`,
//!   `include/constants/pokemon.h:6-23`) -- an out-of-set expression is a
//!   first-class `Halt` mirroring canonical `unsupportedBranch` verbatim,
//!   citing `battle_script_commands.c:3243`, and this check PRECEDES battler
//!   selector resolution; (b) an unresolved battler selector produces a
//!   first-class `Block` mirroring `{ kind: "source-context-unavailable",
//!   programCounter, opcodeId, opcodeName, port:
//!   "resolve-battler-for-battle-script", operandExpression }` verbatim
//!   (the M81 `jumpifstatus` shape); (c) `isBattlerOfType` --
//!   `battlerState.types[0] === typeName || battlerState.types[1] === typeName`
//!   (`battleScriptHitChainOpcode.ts:2798`) -- a miss advances WITHOUT
//!   touching the label operand; a hit lazily resolves the jump label,
//!   erroring `"Cmd_jumpiftype: unresolved jump target <expr>"` only when
//!   taken. Registration is the statusPrimary factory's `findOpcodeId`
//!   (`:260-264`): find-FIRST REQUIRED, absence throws `"committed Battle
//!   Script program does not emit B_SCR_OP_JUMPIFTYPE"`. Registration
//!   performs NO shape/operand validation -- the type-universe check is
//!   RUNTIME ONLY, the asymmetry this module pins against `jumpiftype2`
//!   below.
//!
//! - **`jumpiftype2` / `cursetarget`** --
//!   `createBattleScriptCurseOpcodeHandlers` (`battleScriptCurseOpcode.ts:130-175`)
//!   validates EAGERLY at registration, exactly-1-concrete-start convention
//!   for BOTH opcodes. `jumpiftype2`: wrong count ->
//!   `"B_SCR_OP_JUMPIFTYPE2 requires exactly 1 concrete start, got <n>"`;
//!   else ONE combined shape check (dispatcher `"Cmd_jumpiftype2"`, 3
//!   operands, widths 1/1/4, type expression in `SOURCE_BATTLE_TYPES`
//!   (`:34-53`, the same 18 names), and the jump label RESOLVES at
//!   registration time) -> `"invalid B_SCR_OP_JUMPIFTYPE2 shape at program
//!   counter <pc>"`. `cursetarget`: wrong count ->
//!   `"B_SCR_OP_CURSETARGET requires exactly 1 concrete start, got <n>"`;
//!   combined shape check (dispatcher `"Cmd_cursetarget"`, 1 operand, width
//!   4, fail label resolves) -> `"invalid B_SCR_OP_CURSETARGET shape at
//!   program counter <pc>"`. This is a FIFTH registration flavor alongside
//!   this lane's find-first-required (`jumpiftype`), find-first-optional
//!   (`jumpifstatus2`), eager-cardinality-only, and runtime-Halt-only
//!   conventions: eager-with-label-prevalidation -- labels are resolved at
//!   REGISTRATION time here, unlike every lazy-jump sibling in this lane.
//!
//!   Runtime `jumpiftype2` (`:57-92`): selector `Block` mirror (same reason
//!   shape as `jumpiftype`), then the SAME both-slots type compare; a miss
//!   advances, a hit resolves the label LAZILY AT RUNTIME TOO (the handler
//!   still calls `resolveBattleScriptLabel`; unresolved ->
//!   `"Cmd_jumpiftype2: unresolved jump target <expr>"`, reachable only via
//!   custom programs since registration already prevalidated the committed
//!   one). Crucially there is NO type-universe Halt at runtime for
//!   `jumpiftype2` -- registration already constrained the committed
//!   program, so a custom out-of-set expression at runtime simply compares
//!   FALSE against both type slots and advances; it never halts. This is the
//!   pinned asymmetry against `jumpiftype`'s runtime Halt.
//!
//!   Runtime `cursetarget` (`:95-130`): attacker and target roles are
//!   REQUIRED, checked in that order -- `"Cmd_cursetarget requires a
//!   attacker role"` / `"Cmd_cursetarget requires a target role"`
//!   (ungrammatical "a attacker" verbatim, matching `battle_script_tryko.rs`'s
//!   own verbatim port of the same phrasing). A target already
//!   `STATUS2_CURSED` (`include/constants/battle.h:152`, `1 << 28`) resolves
//!   the fail label LAZILY -- unresolved ->
//!   `"Cmd_cursetarget: unresolved jump target <expr>"`, else jumps,
//!   touching nothing else. Otherwise the target's `STATUS2_CURSED` bit is
//!   set and `battleMoveDamage = max(1, floor(attacker.maxHP / 2))` is
//!   staged, then the command advances.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c` --
//! `Cmd_jumpiftype` `:3243-3253` (`GetBattlerForBattleScript(gBattlescriptCurrInstr[1])`,
//! `IS_BATTLER_OF_TYPE`, `T2_READ_PTR(gBattlescriptCurrInstr + 3)`, `+= 7`);
//! `Cmd_jumpiftype2` `:3981-3990` (inlined both-slots compare,
//! `T1_READ_PTR(gBattlescriptCurrInstr + 3)`, `+= 7`); `Cmd_cursetarget`
//! `:8468-8483` (`STATUS2_CURSED` guard -> `T1_READ_PTR(gBattlescriptCurrInstr + 1)`;
//! else set bit, `gBattleMoveDamage = maxHP / 2`, 0 -> 1 clamp, `+= 5`).
//! Dispatch rows `:365` (`//0x22`), `:397` (`//0x42`), `:506` (`//0xAF`);
//! forward decls `:113`, `:145`, `:254`; enum positions
//! `include/constants/battle_script_commands.h:40,72,181`; macros
//! `asm/macros/battle_script.inc:181` (`jumpiftype battler:req, type:req,
//! ptr:req`, encoded width 7), `:366` (`jumpiftype2`, width 7), `:918`
//! (`cursetarget ptr:req`, width 5); `IS_BATTLER_OF_TYPE`
//! `include/battle.h:471`. Committed call sites in `data/battle_scripts_1.s`
//! (verified by grep in the metadata test): 5 `jumpiftype` (`:695` POISON,
//! `:696` STEEL, `:994` POISON, `:995` STEEL, `:2180` FIRE -- all
//! `BS_TARGET`, the first four -> `BattleScript_NotAffected`, the fifth also
//! -> `BattleScript_NotAffected`), 1 `jumpiftype2`
//! (`:1483 BS_ATTACKER, TYPE_GHOST, BattleScript_GhostCurse`), 1
//! `cursetarget` (`:1520 BattleScript_ButItFailed`).
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI. No branch of any of the three opcodes
//! ever mutates rules except `cursetarget`'s single target `status2` write.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFTYPE_OPCODE: u8 = 0x22;
pub const BATTLE_SCRIPT_JUMPIFTYPE_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFTYPE";
pub const BATTLE_SCRIPT_JUMPIFTYPE_DISPATCHER: &str = "Cmd_jumpiftype";

pub const BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE: u8 = 0x42;
pub const BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFTYPE2";
pub const BATTLE_SCRIPT_JUMPIFTYPE2_DISPATCHER: &str = "Cmd_jumpiftype2";

pub const BATTLE_SCRIPT_CURSETARGET_OPCODE: u8 = 0xaf;
pub const BATTLE_SCRIPT_CURSETARGET_OPCODE_NAME: &str = "B_SCR_OP_CURSETARGET";
pub const BATTLE_SCRIPT_CURSETARGET_DISPATCHER: &str = "Cmd_cursetarget";

/// `unsupportedBranch`'s fixed `sourceFile` argument for `jumpiftype`.
pub const BATTLE_SCRIPT_TYPE_CURSE_SOURCE_FILE: &str = "battle_script_commands.c";

/// Both type-jumps encode battler(1) + type(1) + ptr(4) after their opcode byte.
pub const BATTLE_SCRIPT_JUMPIFTYPE_ENCODED_WIDTH_BYTES: u8 = 7;
/// `cursetarget` encodes only a 4-byte failure pointer after its opcode byte.
pub const BATTLE_SCRIPT_CURSETARGET_ENCODED_WIDTH_BYTES: u8 = 5;

/// The canonical curse factory admits exactly this many concrete starts of
/// EACH of `jumpiftype2`/`cursetarget`.
pub const BATTLE_SCRIPT_TYPE_CURSE_CONCRETE_START_COUNT: usize = 1;

/// `include/constants/battle.h:152` -- `STATUS2_CURSED` (`1 << 28`).
pub const BATTLE_SCRIPT_STATUS2_CURSED: u32 = 1 << 28;

/// `include/constants/pokemon.h:6-23` -- the complete 18-name Gen-3 TYPE_*
/// universe, shared verbatim by `jumpiftype`'s runtime gate and
/// `jumpiftype2`'s registration-time gate (`TYPE_NAMES` /
/// `SOURCE_BATTLE_TYPES` in the two TypeScript originals).
pub const BATTLE_SCRIPT_TYPE_NAMES: [&str; 18] = [
    "TYPE_NORMAL",
    "TYPE_FIGHTING",
    "TYPE_FLYING",
    "TYPE_POISON",
    "TYPE_GROUND",
    "TYPE_ROCK",
    "TYPE_BUG",
    "TYPE_GHOST",
    "TYPE_STEEL",
    "TYPE_MYSTERY",
    "TYPE_FIRE",
    "TYPE_WATER",
    "TYPE_GRASS",
    "TYPE_ELECTRIC",
    "TYPE_PSYCHIC",
    "TYPE_ICE",
    "TYPE_DRAGON",
    "TYPE_DARK",
];

/// Native twin of `TYPE_NAMES.has(...)` / `SOURCE_BATTLE_TYPES.has(...)` --
/// both TypeScript originals enumerate the identical 18-name set.
#[must_use]
pub fn is_recognized_battle_type(expression: &str) -> bool {
    BATTLE_SCRIPT_TYPE_NAMES.contains(&expression)
}

/// Complete source battler-id domain for selector roles and indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTypeCurseBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptTypeCurseBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Deliberately narrow per-battler projection: only the fields any of the
/// three opcodes can possibly read or write. `jumpiftype`/`jumpiftype2` read
/// only `types`; `cursetarget` reads/writes only `status2` (target) and
/// reads only `max_hp` (attacker).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseBattlerState<'a> {
    pub types: [&'a str; 2],
    pub status2: u32,
    pub max_hp: u16,
}

/// Canonical selector bindings read by `cursetarget`'s `requireRole`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseRoles {
    pub attacker: Option<BattleScriptTypeCurseBattler>,
    pub target: Option<BattleScriptTypeCurseBattler>,
}

/// Complete narrow rules slice shared by all three opcodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseRules<'a> {
    pub battlers: [BattleScriptTypeCurseBattlerState<'a>; 4],
    pub selector_roles: BattleScriptTypeCurseRoles,
}

fn is_battler_of_type(state: &BattleScriptTypeCurseBattlerState<'_>, type_name: &str) -> bool {
    state.types[0] == type_name || state.types[1] == type_name
}

/// Shared execution shape for BOTH `jumpiftype` and `jumpiftype2`: an
/// already-resolved battler-selector result (mirroring
/// `resolveBattlerForBattleScript`) plus the raw type/jump-target operand
/// expressions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseJumpExecution<'a> {
    pub program_counter: u32,
    pub type_expression: &'a str,
    pub battler_operand_expression: &'a str,
    /// `None` mirrors the canonical handler's `battler === null` branch.
    pub battler: Option<BattleScriptTypeCurseBattler>,
    pub jump_target_expression: &'a str,
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptTypeCurseJumpControl<'a> {
    Advance,
    Jump {
        program_counter: u32,
    },
    /// `{ kind: "block", reason: { kind: "source-context-unavailable", ... } }`
    /// -- a valid outcome, never an error.
    Block {
        operand_expression: &'a str,
    },
    /// Mirrors canonical `unsupportedBranch`'s `{ kind: "halt", reason: {
    /// kind: "unsupported-branch", ... } }` transition verbatim. `jumpiftype`
    /// only -- `jumpiftype2` never produces this variant.
    Halt {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'a str,
        source_construct: String,
        source_file: &'static str,
        source_line: u32,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTypeCurseJumpError<'a> {
    UnresolvedJumpTarget {
        dispatcher: &'static str,
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptTypeCurseJumpError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnresolvedJumpTarget { dispatcher, expression } => {
                write!(
                    formatter,
                    "{dispatcher}: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTypeCurseJumpError<'_> {}

/// Native twin of `Cmd_jumpiftype` (`battle_script_commands.c:3243-3253`).
/// The type-universe check PRECEDES selector resolution.
pub fn apply_battle_script_jumpiftype<'a>(
    execution: BattleScriptTypeCurseJumpExecution<'a>,
    rules: &BattleScriptTypeCurseRules<'a>,
) -> Result<BattleScriptTypeCurseJumpControl<'a>, BattleScriptTypeCurseJumpError<'a>> {
    if !is_recognized_battle_type(execution.type_expression) {
        return Ok(BattleScriptTypeCurseJumpControl::Halt {
            program_counter: execution.program_counter,
            opcode_id: BATTLE_SCRIPT_JUMPIFTYPE_OPCODE,
            opcode_name: BATTLE_SCRIPT_JUMPIFTYPE_OPCODE_NAME,
            source_construct: format!(
                "Cmd_jumpiftype's type operand {} is not a recognized TYPE_* constant",
                execution.type_expression
            ),
            source_file: BATTLE_SCRIPT_TYPE_CURSE_SOURCE_FILE,
            source_line: 3243,
        });
    }
    let Some(battler) = execution.battler else {
        return Ok(BattleScriptTypeCurseJumpControl::Block {
            operand_expression: execution.battler_operand_expression,
        });
    };
    let state = &rules.battlers[battler.index()];
    if !is_battler_of_type(state, execution.type_expression) {
        return Ok(BattleScriptTypeCurseJumpControl::Advance);
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptTypeCurseJumpError::UnresolvedJumpTarget {
            dispatcher: BATTLE_SCRIPT_JUMPIFTYPE_DISPATCHER,
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptTypeCurseJumpControl::Jump { program_counter })
}

/// Native twin of `Cmd_jumpiftype2` (`battle_script_commands.c:3981-3990`).
/// NO type-universe check at runtime -- registration already constrained the
/// committed program; an out-of-set expression on a custom program simply
/// compares false against both type slots and advances.
pub fn apply_battle_script_jumpiftype2<'a>(
    execution: BattleScriptTypeCurseJumpExecution<'a>,
    rules: &BattleScriptTypeCurseRules<'a>,
) -> Result<BattleScriptTypeCurseJumpControl<'a>, BattleScriptTypeCurseJumpError<'a>> {
    let Some(battler) = execution.battler else {
        return Ok(BattleScriptTypeCurseJumpControl::Block {
            operand_expression: execution.battler_operand_expression,
        });
    };
    let state = &rules.battlers[battler.index()];
    if !is_battler_of_type(state, execution.type_expression) {
        return Ok(BattleScriptTypeCurseJumpControl::Advance);
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptTypeCurseJumpError::UnresolvedJumpTarget {
            dispatcher: BATTLE_SCRIPT_JUMPIFTYPE2_DISPATCHER,
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptTypeCurseJumpControl::Jump { program_counter })
}

/// `committed Battle Script program does not emit {opcode_name}` -- the
/// find-first REQUIRED `jumpiftype` convention only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptTypeCurseRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptTypeCurseRegistrationError {}

/// A committed-program instruction reduced to only what find-first
/// registration inspects: name and bound id.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseSimpleInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// Find-FIRST REQUIRED: the statusPrimary factory's `findOpcodeId` (`:260-264`).
pub fn register_battle_script_jumpiftype(
    instructions: &[BattleScriptTypeCurseSimpleInstruction<'_>],
) -> Result<u8, BattleScriptTypeCurseRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_JUMPIFTYPE_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptTypeCurseRegistrationError {
            opcode_name: BATTLE_SCRIPT_JUMPIFTYPE_OPCODE_NAME,
        })
}

/// One source-macro operand retained for the eager-registration shape check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A committed-program instruction as inspected by the curse factory's
/// eager-with-label-prevalidation convention: full shape plus whether its
/// (sole meaningful) jump/fail label resolves AT REGISTRATION TIME.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseEagerInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTypeCurseOperand<'a>],
    pub jump_label_resolves: bool,
}

/// The two curse-factory errors, shared verbatim by `jumpiftype2` and
/// `cursetarget` (only the `opcode_name` text differs).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTypeCurseEagerRegistrationError {
    WrongCardinality {
        opcode_name: &'static str,
        count: usize,
    },
    InvalidShape {
        opcode_name: &'static str,
        program_counter: u32,
    },
}

impl fmt::Display for BattleScriptTypeCurseEagerRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { opcode_name, count } => {
                write!(
                    formatter,
                    "{opcode_name} requires exactly 1 concrete start, got {count}"
                )
            }
            Self::InvalidShape { opcode_name, program_counter } => {
                write!(
                    formatter,
                    "invalid {opcode_name} shape at program counter {program_counter}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTypeCurseEagerRegistrationError {}

/// Find-FIRST with exact-1 cardinality plus ONE combined shape check,
/// including registration-time label resolution -- `jumpiftype2`'s slice of
/// `createBattleScriptCurseOpcodeHandlers` (`:143-159`).
pub fn register_battle_script_jumpiftype2<'a>(
    instructions: &[BattleScriptTypeCurseEagerInstruction<'a>],
) -> Result<u8, BattleScriptTypeCurseEagerRegistrationError> {
    let matching: Vec<_> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE_NAME)
        .collect();
    if matching.len() != BATTLE_SCRIPT_TYPE_CURSE_CONCRETE_START_COUNT {
        return Err(
            BattleScriptTypeCurseEagerRegistrationError::WrongCardinality {
                opcode_name: BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE_NAME,
                count: matching.len(),
            },
        );
    }
    let candidate = matching[0];
    let valid = candidate.dispatcher == BATTLE_SCRIPT_JUMPIFTYPE2_DISPATCHER
        && candidate.operands.len() == 3
        && candidate.operands[0].width_bytes == 1
        && candidate.operands[1].width_bytes == 1
        && candidate.operands[2].width_bytes == 4
        && is_recognized_battle_type(candidate.operands[1].expression)
        && candidate.jump_label_resolves;
    if !valid {
        return Err(BattleScriptTypeCurseEagerRegistrationError::InvalidShape {
            opcode_name: BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE_NAME,
            program_counter: candidate.program_counter,
        });
    }
    Ok(candidate.opcode_id)
}

/// Find-FIRST with exact-1 cardinality plus ONE combined shape check,
/// including registration-time label resolution -- `cursetarget`'s slice of
/// `createBattleScriptCurseOpcodeHandlers` (`:161-174`).
pub fn register_battle_script_cursetarget<'a>(
    instructions: &[BattleScriptTypeCurseEagerInstruction<'a>],
) -> Result<u8, BattleScriptTypeCurseEagerRegistrationError> {
    let matching: Vec<_> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_CURSETARGET_OPCODE_NAME)
        .collect();
    if matching.len() != BATTLE_SCRIPT_TYPE_CURSE_CONCRETE_START_COUNT {
        return Err(
            BattleScriptTypeCurseEagerRegistrationError::WrongCardinality {
                opcode_name: BATTLE_SCRIPT_CURSETARGET_OPCODE_NAME,
                count: matching.len(),
            },
        );
    }
    let candidate = matching[0];
    let valid = candidate.dispatcher == BATTLE_SCRIPT_CURSETARGET_DISPATCHER
        && candidate.operands.len() == 1
        && candidate.operands[0].width_bytes == 4
        && candidate.jump_label_resolves;
    if !valid {
        return Err(BattleScriptTypeCurseEagerRegistrationError::InvalidShape {
            opcode_name: BATTLE_SCRIPT_CURSETARGET_OPCODE_NAME,
            program_counter: candidate.program_counter,
        });
    }
    Ok(candidate.opcode_id)
}

/// Runtime execution shape for `cursetarget`: only the fail-branch label
/// operand is late-resolved (mirroring the canonical handler, which only
/// calls `resolveBattleScriptLabel` inside the already-cursed branch).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseCursetargetExecution<'a> {
    pub fail_target_expression: &'a str,
    pub resolved_fail_program_counter: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTypeCurseCursetargetControl {
    /// The successful (not-yet-cursed) branch: advances past the encoded 5 bytes.
    Advance,
    /// The already-cursed branch: follows the resolved fail label.
    Jump { program_counter: u32 },
}

/// Complete immutable output of one `cursetarget` application.
/// `battle_move_damage` is `Some` only on the `Advance` branch, mirroring
/// that `gBattleMoveDamage` is written only in the not-cursed branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseCursetargetOutcome<'a> {
    pub rules: BattleScriptTypeCurseRules<'a>,
    pub battle_move_damage: Option<u16>,
    pub control: BattleScriptTypeCurseCursetargetControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTypeCurseCursetargetError<'a> {
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTypeCurseCursetargetError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_cursetarget requires a attacker role")
            }
            Self::MissingTargetRole => write!(formatter, "Cmd_cursetarget requires a target role"),
            Self::UnresolvedJumpTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_cursetarget: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTypeCurseCursetargetError<'_> {}

/// Native twin of `Cmd_cursetarget` (`battle_script_commands.c:8468-8483`).
/// Attacker role is required before target (`requireRole` calls in that
/// order); the already-cursed check reads only the target, and
/// `battleMoveDamage` reads only the attacker on the success branch.
pub fn apply_battle_script_cursetarget<'a>(
    execution: BattleScriptTypeCurseCursetargetExecution<'a>,
    rules: &BattleScriptTypeCurseRules<'a>,
) -> Result<BattleScriptTypeCurseCursetargetOutcome<'a>, BattleScriptTypeCurseCursetargetError<'a>>
{
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTypeCurseCursetargetError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTypeCurseCursetargetError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];

    if (target_state.status2 & BATTLE_SCRIPT_STATUS2_CURSED) != 0 {
        let program_counter = execution.resolved_fail_program_counter.ok_or(
            BattleScriptTypeCurseCursetargetError::UnresolvedJumpTarget {
                expression: execution.fail_target_expression,
            },
        )?;
        return Ok(BattleScriptTypeCurseCursetargetOutcome {
            rules: *rules,
            battle_move_damage: None,
            control: BattleScriptTypeCurseCursetargetControl::Jump { program_counter },
        });
    }

    let mut next_rules = *rules;
    next_rules.battlers[target.index()].status2 =
        target_state.status2 | BATTLE_SCRIPT_STATUS2_CURSED;
    let attacker_max_hp = rules.battlers[attacker.index()].max_hp;
    let battle_move_damage = (attacker_max_hp / 2).max(1);

    Ok(BattleScriptTypeCurseCursetargetOutcome {
        rules: next_rules,
        battle_move_damage: Some(battle_move_damage),
        control: BattleScriptTypeCurseCursetargetControl::Advance,
    })
}

/// Source/dispatch/macro/call-site facts independently re-derived from
/// `reference/pokeemerald` in the metadata test, kept as data rather than
/// only prose so a re-derivation can assert against them directly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTypeCurseSourceMetadata {
    pub jumpiftype_handler_line: u32,
    pub jumpiftype_dispatch_line: u32,
    pub jumpiftype_forward_decl_line: u32,
    pub jumpiftype_enum_line: u32,
    pub jumpiftype2_handler_line: u32,
    pub jumpiftype2_dispatch_line: u32,
    pub jumpiftype2_forward_decl_line: u32,
    pub jumpiftype2_enum_line: u32,
    pub cursetarget_handler_line: u32,
    pub cursetarget_dispatch_line: u32,
    pub cursetarget_forward_decl_line: u32,
    pub cursetarget_enum_line: u32,
    pub is_battler_of_type_macro_line: u32,
    pub jumpiftype_macro_declaration_line: u32,
    pub jumpiftype2_macro_declaration_line: u32,
    pub cursetarget_macro_declaration_line: u32,
}

pub const BATTLE_SCRIPT_TYPE_CURSE_SOURCE_METADATA: BattleScriptTypeCurseSourceMetadata =
    BattleScriptTypeCurseSourceMetadata {
        jumpiftype_handler_line: 3243,
        jumpiftype_dispatch_line: 365,
        jumpiftype_forward_decl_line: 113,
        jumpiftype_enum_line: 40,
        jumpiftype2_handler_line: 3981,
        jumpiftype2_dispatch_line: 397,
        jumpiftype2_forward_decl_line: 145,
        jumpiftype2_enum_line: 72,
        cursetarget_handler_line: 8468,
        cursetarget_dispatch_line: 506,
        cursetarget_forward_decl_line: 254,
        cursetarget_enum_line: 181,
        is_battler_of_type_macro_line: 471,
        jumpiftype_macro_declaration_line: 181,
        jumpiftype2_macro_declaration_line: 366,
        cursetarget_macro_declaration_line: 918,
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn battler(types: [&'static str; 2]) -> BattleScriptTypeCurseBattlerState<'static> {
        BattleScriptTypeCurseBattlerState { types, status2: 0, max_hp: 100 }
    }

    fn rules() -> BattleScriptTypeCurseRules<'static> {
        BattleScriptTypeCurseRules {
            battlers: [
                battler(["TYPE_NORMAL", "TYPE_NORMAL"]),
                battler(["TYPE_GHOST", "TYPE_FLYING"]),
                battler(["TYPE_FIRE", "TYPE_GHOST"]),
                battler(["TYPE_WATER", "TYPE_WATER"]),
            ],
            selector_roles: BattleScriptTypeCurseRoles {
                attacker: Some(BattleScriptTypeCurseBattler::Battler0),
                target: Some(BattleScriptTypeCurseBattler::Battler1),
            },
        }
    }

    fn jump_execution(
        type_expression: &'static str,
    ) -> BattleScriptTypeCurseJumpExecution<'static> {
        BattleScriptTypeCurseJumpExecution {
            program_counter: 42,
            type_expression,
            battler_operand_expression: "BS_TARGET",
            battler: Some(BattleScriptTypeCurseBattler::Battler1),
            jump_target_expression: "SomeLabel",
            resolved_jump_program_counter: Some(4242),
        }
    }

    #[test]
    fn is_battler_of_type_checks_each_slot_independently() {
        let ghost_flying = battler(["TYPE_GHOST", "TYPE_FLYING"]);
        assert!(is_battler_of_type(&ghost_flying, "TYPE_GHOST"));
        assert!(is_battler_of_type(&ghost_flying, "TYPE_FLYING"));
        assert!(!is_battler_of_type(&ghost_flying, "TYPE_FIRE"));
    }

    #[test]
    fn jumpiftype_hits_via_slot_zero_and_slot_one() {
        let r = rules();
        assert_eq!(
            apply_battle_script_jumpiftype(jump_execution("TYPE_GHOST"), &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Jump { program_counter: 4242 }
        );
        assert_eq!(
            apply_battle_script_jumpiftype(jump_execution("TYPE_FLYING"), &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Jump { program_counter: 4242 }
        );
        assert_eq!(
            apply_battle_script_jumpiftype(jump_execution("TYPE_FIRE"), &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Advance
        );
    }

    #[test]
    fn jumpiftype_unsupported_type_halts_before_selector_resolution() {
        let mut exec = jump_execution("TYPE_BOGUS");
        exec.battler = None;
        match apply_battle_script_jumpiftype(exec, &rules()).unwrap() {
            BattleScriptTypeCurseJumpControl::Halt { source_construct, source_line, .. } => {
                assert_eq!(
                    source_construct,
                    "Cmd_jumpiftype's type operand TYPE_BOGUS is not a recognized TYPE_* constant"
                );
                assert_eq!(source_line, 3243);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn jumpiftype_selector_block_when_battler_unresolved() {
        let mut exec = jump_execution("TYPE_GHOST");
        exec.battler = None;
        assert_eq!(
            apply_battle_script_jumpiftype(exec, &rules()).unwrap(),
            BattleScriptTypeCurseJumpControl::Block { operand_expression: "BS_TARGET" }
        );
    }

    #[test]
    fn jumpiftype_vs_jumpiftype2_runtime_asymmetry_halt_vs_compare_false() {
        let r = rules();
        match apply_battle_script_jumpiftype(jump_execution("TYPE_BOGUS"), &r).unwrap() {
            BattleScriptTypeCurseJumpControl::Halt { .. } => {}
            other => panic!("jumpiftype should halt on out-of-set type, got {other:?}"),
        }
        assert_eq!(
            apply_battle_script_jumpiftype2(jump_execution("TYPE_BOGUS"), &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Advance,
            "jumpiftype2 must compare-false (not halt) on an out-of-set runtime expression"
        );
    }

    #[test]
    fn jumpiftype2_hits_via_each_slot() {
        let r = rules();
        // Battler1 = ["TYPE_GHOST", "TYPE_FLYING"]: slot-0 hit.
        assert_eq!(
            apply_battle_script_jumpiftype2(jump_execution("TYPE_GHOST"), &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Jump { program_counter: 4242 }
        );
        // Battler2 = ["TYPE_FIRE", "TYPE_GHOST"]: slot-1 hit.
        let mut exec = jump_execution("TYPE_GHOST");
        exec.battler = Some(BattleScriptTypeCurseBattler::Battler2);
        assert_eq!(
            apply_battle_script_jumpiftype2(exec, &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Jump { program_counter: 4242 }
        );
    }

    #[test]
    fn lazy_label_resolution_only_on_taken_branch() {
        let r = rules();
        let mut exec = jump_execution("TYPE_FIRE"); // slot 0 miss, target battler2 has TYPE_FIRE
        exec.battler = Some(BattleScriptTypeCurseBattler::Battler0); // TYPE_NORMAL/TYPE_NORMAL: miss
        exec.resolved_jump_program_counter = None;
        assert_eq!(
            apply_battle_script_jumpiftype(exec, &r).unwrap(),
            BattleScriptTypeCurseJumpControl::Advance
        );
        exec.battler = Some(BattleScriptTypeCurseBattler::Battler2); // TYPE_FIRE hit
        let error = apply_battle_script_jumpiftype(exec, &r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpiftype: unresolved jump target SomeLabel"
        );
    }

    #[test]
    fn registration_conventions_contrast() {
        let present = [BattleScriptTypeCurseSimpleInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFTYPE_OPCODE_NAME,
            opcode_id: 0x22,
        }];
        assert_eq!(register_battle_script_jumpiftype(&present).unwrap(), 0x22);
        assert_eq!(
            register_battle_script_jumpiftype(&[])
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_JUMPIFTYPE"
        );

        let good_operands = [
            BattleScriptTypeCurseOperand { width_bytes: 1, expression: "BS_ATTACKER" },
            BattleScriptTypeCurseOperand { width_bytes: 1, expression: "TYPE_GHOST" },
            BattleScriptTypeCurseOperand { width_bytes: 4, expression: "BattleScript_GhostCurse" },
        ];
        let good = [BattleScriptTypeCurseEagerInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFTYPE2_OPCODE_NAME,
            program_counter: 774,
            opcode_id: 0x42,
            dispatcher: BATTLE_SCRIPT_JUMPIFTYPE2_DISPATCHER,
            operands: &good_operands,
            jump_label_resolves: true,
        }];
        assert_eq!(register_battle_script_jumpiftype2(&good).unwrap(), 0x42);
        assert_eq!(
            register_battle_script_jumpiftype2(&[])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_JUMPIFTYPE2 requires exactly 1 concrete start, got 0"
        );
        let mut bad_type = good;
        let bad_operands = [
            good_operands[0],
            BattleScriptTypeCurseOperand { width_bytes: 1, expression: "TYPE_BOGUS" },
            good_operands[2],
        ];
        bad_type[0].operands = &bad_operands;
        assert_eq!(
            register_battle_script_jumpiftype2(&bad_type)
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter 774"
        );

        let curse_operands = [BattleScriptTypeCurseOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        }];
        let curse_good = [BattleScriptTypeCurseEagerInstruction {
            opcode_name: BATTLE_SCRIPT_CURSETARGET_OPCODE_NAME,
            program_counter: 900,
            opcode_id: 0xaf,
            dispatcher: BATTLE_SCRIPT_CURSETARGET_DISPATCHER,
            operands: &curse_operands,
            jump_label_resolves: true,
        }];
        assert_eq!(
            register_battle_script_cursetarget(&curse_good).unwrap(),
            0xaf
        );
        let mut curse_two = vec![curse_good[0], curse_good[0]];
        assert_eq!(
            register_battle_script_cursetarget(&curse_two)
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_CURSETARGET requires exactly 1 concrete start, got 2"
        );
        curse_two.truncate(1);
        curse_two[0].jump_label_resolves = false;
        assert_eq!(
            register_battle_script_cursetarget(&curse_two)
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_CURSETARGET shape at program counter 900"
        );
    }

    #[test]
    fn cursetarget_damage_clamp_and_odd_floor() {
        let mut r = rules();
        r.battlers[0].max_hp = 1;
        let outcome = apply_battle_script_cursetarget(
            BattleScriptTypeCurseCursetargetExecution {
                fail_target_expression: "BattleScript_ButItFailed",
                resolved_fail_program_counter: Some(999),
            },
            &r,
        )
        .unwrap();
        assert_eq!(outcome.battle_move_damage, Some(1), "maxHP=1 clamps to 1");

        r.battlers[0].max_hp = 101;
        let outcome = apply_battle_script_cursetarget(
            BattleScriptTypeCurseCursetargetExecution {
                fail_target_expression: "BattleScript_ButItFailed",
                resolved_fail_program_counter: Some(999),
            },
            &r,
        )
        .unwrap();
        assert_eq!(outcome.battle_move_damage, Some(50), "floor(101/2) = 50");
        assert_eq!(
            outcome.rules.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_CURSED,
            BATTLE_SCRIPT_STATUS2_CURSED
        );
        assert_eq!(
            outcome.control,
            BattleScriptTypeCurseCursetargetControl::Advance
        );
    }

    #[test]
    fn cursetarget_already_cursed_jumps_without_writing_damage() {
        let mut r = rules();
        r.battlers[1].status2 = BATTLE_SCRIPT_STATUS2_CURSED;
        let outcome = apply_battle_script_cursetarget(
            BattleScriptTypeCurseCursetargetExecution {
                fail_target_expression: "BattleScript_ButItFailed",
                resolved_fail_program_counter: Some(999),
            },
            &r,
        )
        .unwrap();
        assert_eq!(outcome.battle_move_damage, None);
        assert_eq!(
            outcome.control,
            BattleScriptTypeCurseCursetargetControl::Jump { program_counter: 999 }
        );
        assert_eq!(outcome.rules, r);
    }

    #[test]
    fn cursetarget_missing_roles_error_verbatim() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        assert_eq!(
            apply_battle_script_cursetarget(
                BattleScriptTypeCurseCursetargetExecution {
                    fail_target_expression: "BattleScript_ButItFailed",
                    resolved_fail_program_counter: Some(999),
                },
                &r,
            )
            .unwrap_err()
            .to_string(),
            "Cmd_cursetarget requires a attacker role"
        );
        r.selector_roles.attacker = Some(BattleScriptTypeCurseBattler::Battler0);
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_cursetarget(
                BattleScriptTypeCurseCursetargetExecution {
                    fail_target_expression: "BattleScript_ButItFailed",
                    resolved_fail_program_counter: Some(999),
                },
                &r,
            )
            .unwrap_err()
            .to_string(),
            "Cmd_cursetarget requires a target role"
        );
    }

    #[test]
    fn cursetarget_unresolved_fail_label_errors() {
        let mut r = rules();
        r.battlers[1].status2 = BATTLE_SCRIPT_STATUS2_CURSED;
        let error = apply_battle_script_cursetarget(
            BattleScriptTypeCurseCursetargetExecution {
                fail_target_expression: "BattleScript_ButItFailed",
                resolved_fail_program_counter: None,
            },
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_cursetarget: unresolved jump target BattleScript_ButItFailed"
        );
    }
}
