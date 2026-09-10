//! Pure `B_SCR_OP_DMGTOLEVEL` (0x9F, `Cmd_dmgtolevel`),
//! `B_SCR_OP_PSYWAVEDAMAGEEFFECT` (0xA0, `Cmd_psywavedamageeffect`),
//! `B_SCR_OP_DAMAGETOHALFTARGETHP` (0x94, `Cmd_damagetohalftargethp`), and
//! `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE` (0xD8,
//! `Cmd_setdamagetohealthdifference`) fixed-damage cluster -- four small,
//! independently shaped leaves bundled into one module because each writes
//! only `battleMoveDamage` (one adds a fail-jump).
//!
//! The four span TWO canonical TypeScript files with TWO DIFFERENT
//! registration conventions:
//! - `dmgtolevelOpcodeHandler` / `psywavedamageeffectOpcodeHandler` /
//!   `setdamagetohealthdifferenceOpcodeHandler`
//!   (`src/engine/battleScriptHitChainOpcode.ts:1749-1762,1766-1793,
//!   2094-2125`) register via `createBattleScriptHitChainOpcodeHandlers`'s
//!   `install` (`:4720,4721,4724`): find the FIRST instruction by
//!   `opcodeName`, error `"committed Battle Script program does not emit
//!   <name>"` when absent, no shape validation.
//! - `damageToHalfTargetHpHandler` (`src/engine/
//!   battleScriptRankedBatch1Opcode.ts:205-217`, `halfTargetHpDamage`
//!   `:42-44`) registers via a different `install` (`:~194-213`) called with
//!   `("B_SCR_OP_DAMAGETOHALFTARGETHP", "Cmd_damagetohalftargethp", 0, ...)`:
//!   the committed program must contain EXACTLY ONE instruction with that
//!   opcode name -- error `"B_SCR_OP_DAMAGETOHALFTARGETHP requires exactly 1
//!   concrete start, got <N>"` otherwise -- and that instruction must have
//!   dispatcher `"Cmd_damagetohalftargethp"` and exactly 0 operands -- error
//!   `"invalid B_SCR_OP_DAMAGETOHALFTARGETHP shape at program counter <N>"`
//!   otherwise. `requireBattlerRole` is the SAME function in both files
//!   (`battleScriptRankedBatch1Opcode.ts` imports it from
//!   `battleScriptHitChainOpcode.ts`), so its error text is identical
//!   verbatim across all four opcodes.
//!
//! ## RNG projection (reused verbatim from M77/M78)
//! Only `psywavedamageeffect` draws RNG. See `battle_script_critcalc.rs`'s
//! module doc comment for the full `drawBattleScriptRng` projection
//! contract: the TS machine RNG `{value, calls, ledger[]}` crosses as
//! [`BattleScriptFixedDamageRngState`] (`value`, `calls`) only -- the ledger
//! array itself does not cross. Each draw performs
//! `after = advance_rng_value(value)`,
//! `random_value = ((after >> 16) & 0xffff) as u16` natively and produces a
//! [`BattleScriptFixedDamageRngDraw`] mirroring the TS ledger tail entry
//! verbatim (`call`, literal reason `"psywavedamageeffect"`, `before`,
//! `after`, `random_value`, six-field provenance). `psywavedamageeffect`'s
//! loop is an UNBOUNDED rejection-sampling loop (`while ((randDamage =
//! Random() % 16) > 10);`) -- it draws at least once and keeps drawing while
//! the sample exceeds 10 (11 of 16 values accepted per draw); every draw is
//! recorded in order in the outcome's `Vec<`[`BattleScriptFixedDamageRngDraw`]`>`,
//! `calls` incrementing by one per draw.
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. `dmgtolevel`: `requireBattlerRole(rules, "attacker")` --
//!    `"Battle Script hit-chain command requires a attacker role"`;
//!    `battle_move_damage := attacker.level`; advance. No RNG, no branch.
//! 2. `psywavedamageeffect`: same attacker-role check; then the unbounded
//!    rejection-sampling loop (reason literal `"psywavedamageeffect"`),
//!    `rand := random_value % 16`, looping while `rand > 10`;
//!    `battle_move_damage := trunc(level * (rand * 10 + 50) / 100)`; advance.
//! 3. `damagetohalftargethp`: `requireBattlerRole(rules, "target")`;
//!    `battle_move_damage := max(1, trunc(target.hp / 2))`; advance.
//! 4. `setdamagetohealthdifference`: `requireBattlerRole(rules, "attacker")`
//!    THEN `requireBattlerRole(rules, "target")` (attacker checked first,
//!    exact TS order); if `target.hp <= attacker.hp`: resolve the
//!    instruction's single `ptr` operand expression LAZILY against the
//!    committed program (the `battle_script_jumpif` sibling's convention) --
//!    resolved -> [`BattleScriptFixedDamageSetHealthDiffControl::Jump`];
//!    unresolved -> [`BattleScriptFixedDamageError::UnresolvedJumpTarget`]
//!    (`"Cmd_setdamagetohealthdifference: unresolved jump target <expr>"`,
//!    the TS throw modeled as an error variant). Else
//!    `battle_move_damage := target.hp - attacker.hp`; advance.
//!
//! Source authority:
//! - `Cmd_dmgtolevel`: `reference/pokeemerald/src/battle_script_commands.c:7926-7930`.
//! - `Cmd_psywavedamageeffect`: `:7932-7941`
//!   (`while ((randDamage = Random() % 16) > 10);`).
//! - `Cmd_damagetohalftargethp`: `:7577-7584` (`hp / 2`, min-1 floor).
//! - `Cmd_setdamagetohealthdifference`: `:9366-9377`
//!   (`T1_READ_PTR(gBattlescriptCurrInstr + 1)` on the fail branch, `+= 5` on
//!   the success branch).
//! - Dispatch rows: `:490` (`//0x9F`), `:491` (`//0xA0`), `:479` (`//0x94`),
//!   `:547` (`//0xD8`).
//! - Forward declarations: `:238` (`Cmd_dmgtolevel`), `:239`
//!   (`Cmd_psywavedamageeffect`), `:227` (`Cmd_damagetohalftargethp`), `:295`
//!   (`Cmd_setdamagetohealthdifference`).
//! - Opcode enum positions: `include/constants/battle_script_commands.h:165`
//!   (`B_SCR_OP_DMGTOLEVEL`), `:166` (`B_SCR_OP_PSYWAVEDAMAGEEFFECT`), `:154`
//!   (`B_SCR_OP_DAMAGETOHALFTARGETHP`), `:222`
//!   (`B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`).
//! - Macros: `asm/macros/battle_script.inc:845` (`dmgtolevel`, single
//!   `.byte`, no operand), `:849` (`psywavedamageeffect`, same shape), `:798`
//!   (`damagetohalftargethp`, same shape), `:1106`
//!   (`setdamagetohealthdifference ptr:req` -- opcode byte + 4-byte pointer,
//!   encoded width 5).
//! - Call sites in `data/battle_scripts_1.s` (grep-verified, exactly one
//!   each): `:1202` (`dmgtolevel`), `:1213` (`psywavedamageeffect`), `:816`
//!   (`damagetohalftargethp`), `:2483`
//!   (`setdamagetohealthdifference BattleScript_ButItFailed`).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, presentation, nor the WASM ABI.

use core::fmt;

use crate::rng::advance_rng_value;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_FIXED_DAMAGE_BATTLER_COUNT: usize = 4;

pub const BATTLE_SCRIPT_DMGTOLEVEL_OPCODE: u8 = 0x9F;
pub const BATTLE_SCRIPT_DMGTOLEVEL_OPCODE_NAME: &str = "B_SCR_OP_DMGTOLEVEL";
pub const BATTLE_SCRIPT_DMGTOLEVEL_DISPATCHER: &str = "Cmd_dmgtolevel";
pub const BATTLE_SCRIPT_DMGTOLEVEL_ENCODED_WIDTH_BYTES: u8 = 1;

pub const BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE: u8 = 0xA0;
pub const BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE_NAME: &str = "B_SCR_OP_PSYWAVEDAMAGEEFFECT";
pub const BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_DISPATCHER: &str = "Cmd_psywavedamageeffect";
pub const BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_ENCODED_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_RNG_REASON: &str = "psywavedamageeffect";

pub const BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE: u8 = 0x94;
pub const BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE_NAME: &str = "B_SCR_OP_DAMAGETOHALFTARGETHP";
pub const BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_DISPATCHER: &str = "Cmd_damagetohalftargethp";
pub const BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_ENCODED_WIDTH_BYTES: u8 = 1;

pub const BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_OPCODE: u8 = 0xD8;
pub const BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_OPCODE_NAME: &str =
    "B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE";
pub const BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_DISPATCHER: &str =
    "Cmd_setdamagetohealthdifference";
/// Opcode byte + 4-byte pointer operand (`asm/macros/battle_script.inc:1106`).
pub const BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_ENCODED_WIDTH_BYTES: u8 = 5;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptFixedDamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptFixedDamageBattler {
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
}

/// The narrow per-battler projection this leaf reads. No branch ever writes
/// any battler field (only `battle_move_damage` on the shared rules).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageBattlerState {
    pub level: i32,
    pub hp: i32,
}

/// Canonical selector bindings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageRoles {
    pub attacker: Option<BattleScriptFixedDamageBattler>,
    pub target: Option<BattleScriptFixedDamageBattler>,
}

/// Complete narrow rules slice this leaf reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageRules {
    pub battlers: [BattleScriptFixedDamageBattlerState; BATTLE_SCRIPT_FIXED_DAMAGE_BATTLER_COUNT],
    /// Source `gBattleMoveDamage`; input starting value and the field every
    /// non-jump branch ultimately overwrites.
    pub battle_move_damage: i32,
    pub selector_roles: BattleScriptFixedDamageRoles,
}

/// The projected `{ value, calls }` RNG crossing (reused verbatim from
/// `critcalc`/`adjustdamage`). The TS ledger array does NOT cross.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors `instructionProvenance`'s six fields
/// (`battleScriptMachine.ts:275-287`) verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptFixedDamageProvenance {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: String,
    pub dispatcher: String,
    pub source_label: String,
    pub source_statement_line: u32,
}

/// Mirrors one `BattleScriptRngLedgerEntry` (`battleScriptMachine.ts:138-145`)
/// verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptFixedDamageRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
    pub provenance: BattleScriptFixedDamageProvenance,
}

/// A resolved source jump target (only meaningful for
/// `setdamagetohealthdifference`'s fail branch).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageResolvedTarget<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// One committed-program instruction. Used for registration (find-first by
/// `opcode_name` for the hit-chain trio; filter+shape-check for
/// `damagetohalftargethp`) and, for the single executing instruction passed
/// to the `apply_*` functions, provenance on a real draw plus (for
/// `setdamagetohealthdifference` only) the surrounding program's LAZY late
/// label lookup of the `ptr` operand.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub dispatcher: &'a str,
    pub source_label: &'a str,
    pub source_statement_line: u32,
    /// Only relevant to `damagetohalftargethp`'s exactly-0-operands shape
    /// check.
    pub operand_count: usize,
    /// `setdamagetohealthdifference`'s single `ptr` operand expression;
    /// meaningless for the other three opcodes.
    pub jump_target_expression: &'a str,
    /// The caller-resolved late label lookup for `jump_target_expression`,
    /// resolved only when the fail branch is actually taken (mirrors the
    /// `battle_script_jumpif` sibling's lazy convention).
    pub resolved_jump_target: Option<BattleScriptFixedDamageResolvedTarget<'a>>,
}

/// Exact observable errors in canonical evaluation order. Shared verbatim
/// across all four opcodes -- `requireBattlerRole` is the same function in
/// both canonical TS files.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptFixedDamageError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `Cmd_setdamagetohealthdifference: unresolved jump target <expr>`.
    UnresolvedJumpTarget { expression: String },
}

impl fmt::Display for BattleScriptFixedDamageError {
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
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_setdamagetohealthdifference: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptFixedDamageError {}

/// The two distinct registration failure shapes across the cluster's two
/// conventions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptFixedDamageRegistrationError {
    /// Hit-chain convention (dmgtolevel/psywavedamageeffect/
    /// setdamagetohealthdifference): `committed Battle Script program does
    /// not emit <opcode_name>`.
    MissingOpcode { opcode_name: &'static str },
    /// `damagetohalftargethp`'s own convention: `<opcode_name> requires
    /// exactly 1 concrete start, got <count>`.
    WrongConcreteStartCount {
        opcode_name: &'static str,
        count: usize,
    },
    /// `damagetohalftargethp`'s own convention: `invalid <opcode_name> shape
    /// at program counter <program_counter>`.
    InvalidShape {
        opcode_name: &'static str,
        program_counter: u32,
    },
}

impl fmt::Display for BattleScriptFixedDamageRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingOpcode { opcode_name } => write!(
                formatter,
                "committed Battle Script program does not emit {opcode_name}"
            ),
            Self::WrongConcreteStartCount { opcode_name, count } => write!(
                formatter,
                "{opcode_name} requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidShape { opcode_name, program_counter } => write!(
                formatter,
                "invalid {opcode_name} shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptFixedDamageRegistrationError {}

fn register_hit_chain_first<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
    opcode_name: &'static str,
) -> Result<u8, BattleScriptFixedDamageRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptFixedDamageRegistrationError::MissingOpcode { opcode_name })
}

/// Native projection of the `install("B_SCR_OP_DMGTOLEVEL", ...)` line
/// inside `createBattleScriptHitChainOpcodeHandlers`: find the FIRST
/// instruction with this opcode name, no shape validation.
pub fn register_battle_script_dmgtolevel<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
) -> Result<u8, BattleScriptFixedDamageRegistrationError> {
    register_hit_chain_first(instructions, BATTLE_SCRIPT_DMGTOLEVEL_OPCODE_NAME)
}

/// Native projection of the `install("B_SCR_OP_PSYWAVEDAMAGEEFFECT", ...)`
/// line: find-first, no shape validation.
pub fn register_battle_script_psywavedamageeffect<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
) -> Result<u8, BattleScriptFixedDamageRegistrationError> {
    register_hit_chain_first(instructions, BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE_NAME)
}

/// Native projection of the `install("B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE",
/// ...)` line: find-first, no shape validation.
pub fn register_battle_script_setdamagetohealthdifference<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
) -> Result<u8, BattleScriptFixedDamageRegistrationError> {
    register_hit_chain_first(
        instructions,
        BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_OPCODE_NAME,
    )
}

/// Native projection of `battleScriptRankedBatch1Opcode.ts`'s own `install`:
/// the committed program must contain EXACTLY ONE instruction with this
/// opcode name, and that instruction must carry dispatcher
/// `"Cmd_damagetohalftargethp"` and exactly 0 operands.
pub fn register_battle_script_damagetohalftargethp<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
) -> Result<u8, BattleScriptFixedDamageRegistrationError> {
    let opcode_name = BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE_NAME;
    let matches: Vec<&BattleScriptFixedDamageInstruction<'a>> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == opcode_name)
        .collect();
    if matches.len() != 1 {
        return Err(
            BattleScriptFixedDamageRegistrationError::WrongConcreteStartCount {
                opcode_name,
                count: matches.len(),
            },
        );
    }
    let instruction = matches[0];
    if instruction.dispatcher != BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(BattleScriptFixedDamageRegistrationError::InvalidShape {
            opcode_name,
            program_counter: instruction.program_counter,
        });
    }
    Ok(instruction.opcode_id)
}

/// All four resolved opcode ids after registering the complete cluster.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFixedDamageRegistration {
    pub dmgtolevel_opcode_id: u8,
    pub psywavedamageeffect_opcode_id: u8,
    pub damagetohalftargethp_opcode_id: u8,
    pub setdamagetohealthdifference_opcode_id: u8,
}

/// Registers all four family members through their own conventions.
pub fn register_battle_script_fixed_damage_handlers<'a>(
    instructions: &[BattleScriptFixedDamageInstruction<'a>],
) -> Result<BattleScriptFixedDamageRegistration, BattleScriptFixedDamageRegistrationError> {
    Ok(BattleScriptFixedDamageRegistration {
        dmgtolevel_opcode_id: register_battle_script_dmgtolevel(instructions)?,
        psywavedamageeffect_opcode_id: register_battle_script_psywavedamageeffect(instructions)?,
        damagetohalftargethp_opcode_id: register_battle_script_damagetohalftargethp(instructions)?,
        setdamagetohealthdifference_opcode_id: register_battle_script_setdamagetohealthdifference(
            instructions,
        )?,
    })
}

/// Native immutable-value twin of `dmgtolevelOpcodeHandler`.
///
/// # Errors
/// [`BattleScriptFixedDamageError::MissingAttackerRole`] only.
pub fn apply_battle_script_dmgtolevel(
    rules: &BattleScriptFixedDamageRules,
) -> Result<BattleScriptFixedDamageRules, BattleScriptFixedDamageError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptFixedDamageError::MissingAttackerRole)?;
    let level = rules.battlers[attacker.index()].level;
    let mut next = *rules;
    next.battle_move_damage = level;
    Ok(next)
}

/// The complete `psywavedamageeffect` output: the rules with
/// `battle_move_damage` written back, the RNG state after every draw, and
/// the ordered draws that actually occurred (at least one).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptFixedDamagePsywaveOutcome {
    pub rules: BattleScriptFixedDamageRules,
    pub rng: BattleScriptFixedDamageRngState,
    pub draws: Vec<BattleScriptFixedDamageRngDraw>,
}

fn draw_battle_script_fixed_damage_rng(
    rng: BattleScriptFixedDamageRngState,
    reason: &'static str,
    instruction: &BattleScriptFixedDamageInstruction<'_>,
) -> (
    BattleScriptFixedDamageRngState,
    BattleScriptFixedDamageRngDraw,
) {
    let after = advance_rng_value(rng.value);
    let random_value = ((after >> 16) & 0xffff) as u16;
    let call = rng.calls + 1;
    let draw = BattleScriptFixedDamageRngDraw {
        call,
        reason,
        before: rng.value,
        after,
        random_value,
        provenance: BattleScriptFixedDamageProvenance {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: instruction.opcode_name.to_owned(),
            dispatcher: instruction.dispatcher.to_owned(),
            source_label: instruction.source_label.to_owned(),
            source_statement_line: instruction.source_statement_line,
        },
    };
    (
        BattleScriptFixedDamageRngState { value: after, calls: call },
        draw,
    )
}

/// Native immutable-value twin of `psywavedamageeffectOpcodeHandler`. The
/// rejection-sampling loop is unbounded in source (`while ((randDamage =
/// Random() % 16) > 10);`) and ported as such -- it always draws at least
/// once.
///
/// # Errors
/// [`BattleScriptFixedDamageError::MissingAttackerRole`] only.
pub fn apply_battle_script_psywavedamageeffect(
    rules: &BattleScriptFixedDamageRules,
    rng: BattleScriptFixedDamageRngState,
    instruction: &BattleScriptFixedDamageInstruction<'_>,
) -> Result<BattleScriptFixedDamagePsywaveOutcome, BattleScriptFixedDamageError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptFixedDamageError::MissingAttackerRole)?;
    let level = rules.battlers[attacker.index()].level;

    let mut rng_state = rng;
    let mut draws = Vec::new();
    let mut rand_damage: i32;
    loop {
        let (next_rng, draw) = draw_battle_script_fixed_damage_rng(
            rng_state,
            BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_RNG_REASON,
            instruction,
        );
        rand_damage = i32::from(draw.random_value % 16);
        rng_state = next_rng;
        draws.push(draw);
        if rand_damage <= 10 {
            break;
        }
    }

    let damage = level * (rand_damage * 10 + 50) / 100;
    let mut next_rules = *rules;
    next_rules.battle_move_damage = damage;
    Ok(BattleScriptFixedDamagePsywaveOutcome { rules: next_rules, rng: rng_state, draws })
}

/// Native immutable-value twin of `damageToHalfTargetHpHandler` /
/// `halfTargetHpDamage`.
///
/// # Errors
/// [`BattleScriptFixedDamageError::MissingTargetRole`] only.
pub fn apply_battle_script_damagetohalftargethp(
    rules: &BattleScriptFixedDamageRules,
) -> Result<BattleScriptFixedDamageRules, BattleScriptFixedDamageError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptFixedDamageError::MissingTargetRole)?;
    let hp = rules.battlers[target.index()].hp;
    let mut next = *rules;
    next.battle_move_damage = (hp / 2).max(1);
    Ok(next)
}

/// Exact control directive emitted by `setdamagetohealthdifference` -- the
/// only opcode in this cluster with a branch that isn't a plain advance.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptFixedDamageSetHealthDiffControl {
    Advance { rules: BattleScriptFixedDamageRules },
    Jump { program_counter: u32 },
}

/// Native immutable-value twin of `setdamagetohealthdifferenceOpcodeHandler`.
///
/// # Errors
/// [`BattleScriptFixedDamageError::MissingAttackerRole`] (checked first),
/// [`BattleScriptFixedDamageError::MissingTargetRole`], or
/// [`BattleScriptFixedDamageError::UnresolvedJumpTarget`] on the taken fail
/// branch when the caller could not resolve the `ptr` operand.
pub fn apply_battle_script_setdamagetohealthdifference<'a>(
    rules: &BattleScriptFixedDamageRules,
    instruction: &BattleScriptFixedDamageInstruction<'a>,
) -> Result<BattleScriptFixedDamageSetHealthDiffControl, BattleScriptFixedDamageError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptFixedDamageError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptFixedDamageError::MissingTargetRole)?;
    let target_hp = rules.battlers[target.index()].hp;
    let attacker_hp = rules.battlers[attacker.index()].hp;

    if target_hp <= attacker_hp {
        match instruction.resolved_jump_target {
            Some(resolved) => Ok(BattleScriptFixedDamageSetHealthDiffControl::Jump {
                program_counter: resolved.program_counter,
            }),
            None => Err(BattleScriptFixedDamageError::UnresolvedJumpTarget {
                expression: instruction.jump_target_expression.to_owned(),
            }),
        }
    } else {
        let mut next = *rules;
        next.battle_move_damage = target_hp - attacker_hp;
        Ok(BattleScriptFixedDamageSetHealthDiffControl::Advance { rules: next })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn battler(level: i32, hp: i32) -> BattleScriptFixedDamageBattlerState {
        BattleScriptFixedDamageBattlerState { level, hp }
    }

    fn rules() -> BattleScriptFixedDamageRules {
        BattleScriptFixedDamageRules {
            battlers: [
                battler(50, 100),
                battler(50, 20),
                battler(50, 100),
                battler(50, 100),
            ],
            battle_move_damage: 0,
            selector_roles: BattleScriptFixedDamageRoles {
                attacker: Some(BattleScriptFixedDamageBattler::Battler0),
                target: Some(BattleScriptFixedDamageBattler::Battler1),
            },
        }
    }

    fn instruction() -> BattleScriptFixedDamageInstruction<'static> {
        BattleScriptFixedDamageInstruction {
            opcode_name: BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE,
            program_counter: 42,
            dispatcher: BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_DISPATCHER,
            source_label: "BattleScript_EffectPsywave",
            source_statement_line: 1213,
            operand_count: 0,
            jump_target_expression: "",
            resolved_jump_target: None,
        }
    }

    #[test]
    fn dmgtolevel_writes_attacker_level_and_errors_without_attacker() {
        let r = rules();
        assert_eq!(
            apply_battle_script_dmgtolevel(&r)
                .unwrap()
                .battle_move_damage,
            50
        );

        let mut missing = rules();
        missing.selector_roles.attacker = None;
        assert_eq!(
            apply_battle_script_dmgtolevel(&missing).unwrap_err(),
            BattleScriptFixedDamageError::MissingAttackerRole
        );
    }

    #[test]
    fn damagetohalftargethp_floors_at_one_and_truncates_odd() {
        let mut r = rules();
        r.battlers[1].hp = 1;
        assert_eq!(
            apply_battle_script_damagetohalftargethp(&r)
                .unwrap()
                .battle_move_damage,
            1
        );

        r.battlers[1].hp = 7;
        assert_eq!(
            apply_battle_script_damagetohalftargethp(&r)
                .unwrap()
                .battle_move_damage,
            3
        );

        let mut missing = rules();
        missing.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_damagetohalftargethp(&missing).unwrap_err(),
            BattleScriptFixedDamageError::MissingTargetRole
        );
    }

    #[test]
    fn psywave_loop_rejects_above_ten_and_orders_draws() {
        // value=0 -> advance_rng_value(0) upper16, find one whose first
        // sample is rejected (>10) then accepted, by scanning seeds.
        let mut seed_two_draws = None;
        let mut seed_one_draw = None;
        for candidate in 0u32..5000 {
            let after = advance_rng_value(candidate);
            let first = ((after >> 16) & 0xffff) % 16;
            if seed_one_draw.is_none() && first <= 10 {
                seed_one_draw = Some(candidate);
            }
            if seed_two_draws.is_none() && first > 10 {
                let after2 = advance_rng_value(after);
                let second = ((after2 >> 16) & 0xffff) % 16;
                if second <= 10 {
                    seed_two_draws = Some(candidate);
                }
            }
            if seed_one_draw.is_some() && seed_two_draws.is_some() {
                break;
            }
        }
        let r = rules();
        let instr = instruction();

        let one = apply_battle_script_psywavedamageeffect(
            &r,
            BattleScriptFixedDamageRngState { value: seed_one_draw.unwrap(), calls: 0 },
            &instr,
        )
        .unwrap();
        assert_eq!(one.draws.len(), 1);
        assert_eq!(one.draws[0].reason, "psywavedamageeffect");

        let two = apply_battle_script_psywavedamageeffect(
            &r,
            BattleScriptFixedDamageRngState { value: seed_two_draws.unwrap(), calls: 0 },
            &instr,
        )
        .unwrap();
        assert_eq!(two.draws.len(), 2);
        assert_eq!(
            two.draws[1].before, two.draws[0].after,
            "draws chain in order"
        );
        assert_eq!(two.rng.calls, 2);
    }

    #[test]
    fn setdamagetohealthdifference_branch_algebra() {
        let mut r = rules();
        r.battlers[0].hp = 50; // attacker
        r.battlers[1].hp = 80; // target

        // target above attacker -> advance with damage.
        let advance = apply_battle_script_setdamagetohealthdifference(&r, &instruction()).unwrap();
        match advance {
            BattleScriptFixedDamageSetHealthDiffControl::Advance { rules } => {
                assert_eq!(rules.battle_move_damage, 30);
            }
            other => panic!("expected advance, got {other:?}"),
        }

        // hp-equal -> fail/jump branch.
        r.battlers[1].hp = 50;
        let mut resolved_instr = instruction();
        resolved_instr.jump_target_expression = "BattleScript_ButItFailed";
        resolved_instr.resolved_jump_target = Some(BattleScriptFixedDamageResolvedTarget {
            expression: "BattleScript_ButItFailed",
            program_counter: 777,
        });
        let jump = apply_battle_script_setdamagetohealthdifference(&r, &resolved_instr).unwrap();
        assert_eq!(
            jump,
            BattleScriptFixedDamageSetHealthDiffControl::Jump { program_counter: 777 }
        );

        // target below attacker -> also fails/jumps.
        r.battlers[1].hp = 10;
        let jump_below =
            apply_battle_script_setdamagetohealthdifference(&r, &resolved_instr).unwrap();
        assert_eq!(
            jump_below,
            BattleScriptFixedDamageSetHealthDiffControl::Jump { program_counter: 777 }
        );

        // unresolved jump target on the taken fail branch is an error.
        let unresolved_instr = instruction();
        let error =
            apply_battle_script_setdamagetohealthdifference(&r, &unresolved_instr).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_setdamagetohealthdifference: unresolved jump target "
        );

        // role errors, attacker checked before target.
        let mut missing_both = rules();
        missing_both.selector_roles.attacker = None;
        missing_both.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_setdamagetohealthdifference(&missing_both, &instruction())
                .unwrap_err(),
            BattleScriptFixedDamageError::MissingAttackerRole
        );
        let mut missing_target = rules();
        missing_target.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_setdamagetohealthdifference(&missing_target, &instruction())
                .unwrap_err(),
            BattleScriptFixedDamageError::MissingTargetRole
        );
    }

    #[test]
    fn registration_conventions_side_by_side() {
        let good_hit_chain = BattleScriptFixedDamageInstruction {
            opcode_name: BATTLE_SCRIPT_DMGTOLEVEL_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_DMGTOLEVEL_OPCODE,
            program_counter: 1,
            dispatcher: BATTLE_SCRIPT_DMGTOLEVEL_DISPATCHER,
            source_label: "L",
            source_statement_line: 1,
            operand_count: 0,
            jump_target_expression: "",
            resolved_jump_target: None,
        };
        assert_eq!(
            register_battle_script_dmgtolevel(&[good_hit_chain]).unwrap(),
            BATTLE_SCRIPT_DMGTOLEVEL_OPCODE
        );
        assert_eq!(
            register_battle_script_dmgtolevel(&[])
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_DMGTOLEVEL"
        );

        let good_half = BattleScriptFixedDamageInstruction {
            opcode_name: BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE,
            program_counter: 5,
            dispatcher: BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_DISPATCHER,
            source_label: "L",
            source_statement_line: 1,
            operand_count: 0,
            jump_target_expression: "",
            resolved_jump_target: None,
        };
        assert_eq!(
            register_battle_script_damagetohalftargethp(&[good_half]).unwrap(),
            BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE
        );

        // duplicate -> count error.
        assert_eq!(
            register_battle_script_damagetohalftargethp(&[good_half, good_half])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_DAMAGETOHALFTARGETHP requires exactly 1 concrete start, got 2"
        );

        // wrong dispatcher -> invalid shape.
        let mut wrong_dispatcher = good_half;
        wrong_dispatcher.dispatcher = "Cmd_other";
        assert_eq!(
            register_battle_script_damagetohalftargethp(&[wrong_dispatcher])
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_DAMAGETOHALFTARGETHP shape at program counter 5"
        );

        // nonzero operands -> invalid shape.
        let mut nonzero_operands = good_half;
        nonzero_operands.operand_count = 1;
        assert_eq!(
            register_battle_script_damagetohalftargethp(&[nonzero_operands])
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_DAMAGETOHALFTARGETHP shape at program counter 5"
        );

        // missing entirely -> count error with 0.
        assert_eq!(
            register_battle_script_damagetohalftargethp(&[])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_DAMAGETOHALFTARGETHP requires exactly 1 concrete start, got 0"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptFixedDamageBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptFixedDamageBattler::from_u8(4), None);
    }
}
