//! Pure `B_SCR_OP_SETMULTIHIT` (0x26, `Cmd_setmultihit`) /
//! `B_SCR_OP_DECREMENTMULTIHIT` (0x27, `Cmd_decrementmultihit`) /
//! `B_SCR_OP_SETMULTIHITCOUNTER` (0x8D, `Cmd_setmultihitcounter`) /
//! `B_SCR_OP_INITMULTIHITSTRING` (0x8E, `Cmd_initmultihitstring`) /
//! `B_SCR_OP_JUMPIFHASNOHP` (0xE3, `Cmd_jumpifhasnohp`) quintet -- the
//! native twin of `createBattleScriptRuleCommandHandlers`
//! (`src/engine/battleScriptRuleCommands.ts`).
//!
//! ## Shared registration (all five, module doc comment `:97-105`)
//! Find-FIRST REQUIRED by `opcodeName`; absence throws `committed Battle
//! Script program does not emit <name>` verbatim (`install`, `:115-126`).
//! No other validation. [`register_battle_script_multihit_family_opcode`]
//! is the one shared implementation reused for all five opcode names.
//!
//! ## Shared ports (two injected resolvers modeled as closed catalogs)
//! - [`resolve_battle_script_multihit_byte_operand`]: the canonical
//!   production port (`factoryBattleScriptFullTurnDecision.ts:1370-1371`)
//!   -- an expression matching `/^[0-9]+$/` resolves to its decimal value;
//!   anything else is unmodeled (`None`), surfacing as a `Block`, never an
//!   error.
//! - [`resolve_battle_script_multihit_battler`]: the canonical production
//!   port `resolveRulesBattlerForBattleScript`
//!   (`battleScriptRulesContext.ts:2873-2900`) narrowed to the six named
//!   selectors this leaf can reach: `BS_TARGET` -> `selectorRoles.target`,
//!   `BS_ATTACKER` -> `selectorRoles.attacker`, `BS_EFFECT_BATTLER` ->
//!   `effectBattler`, `BS_BATTLER_0` -> the literal `0`, `BS_FAINTED` ->
//!   `selectorRoles.fainted`, `BS_SCRIPTING` -> `scriptingBattler`; any
//!   other expression (or a missing role) resolves `None`, surfacing as a
//!   `Block`.
//!
//! ## Per-opcode semantics
//! 1. **SETMULTIHIT** (`ruleCommands.ts:128-162`): operand shape checked
//!    FIRST -- missing operand, `widthBytes != 1`, or `operands.length !=
//!    1` halts with `invalid-source-operand` (`expected: "u8"`, `received:
//!    "<n> operands; width <w|missing>"`). Then the byte resolver: `None`
//!    blocks; a resolved value outside `0..=0xff` halts the same reason
//!    kind with `received = String(value)`; otherwise `multiHitCounter :=
//!    value`, advance.
//! 2. **DECREMENTMULTIHIT** (`:163-195`): NO operand validation first --
//!    `multiHitCounter := (counter - 1) & 0xff` is ALWAYS written (the 0 ->
//!    0xff wrap). `== 0` advances; otherwise a 4-byte-wide, single, resolved
//!    label operand jumps; a missing/wrong-width/extra operand or an
//!    unresolved label halts `invalid-control-target` (`programCounter`,
//!    `expression`) carrying the ALREADY-decremented rules.
//! 3. **SETMULTIHITCOUNTER** (`:197-261`): the same shape/Block/invalid-value
//!    ladder as SETMULTIHIT; then a resolved nonzero value is used directly
//!    (zero draws); a resolved zero draws `"setmultihitcounter:initial"`
//!    (`counter := randomValue & 3`), and if that counter exceeds 1 a second
//!    `"setmultihitcounter:reroll"` draw (`counter := (randomValue & 3) +
//!    2`), else `counter += 2` (one draw total).
//! 4. **INITMULTIHITSTRING** (`:277-283`, its own long doc comment cites
//!    `Cmd_initmultihitstring`'s `PREPARE_BYTE_NUMBER_BUFFER` zeroing
//!    `multihitString[4]`, Triple Kick's own hits-landed counter): zero
//!    operands consulted, unconditional `multiHitStringCounter := 0`,
//!    advance.
//! 5. **JUMPIFHASNOHP** (`:290-323`): shape checked FIRST -- both operands
//!    present, `operands.length == 2`, battler `widthBytes == 1`, pointer
//!    `widthBytes == 4`, else the same `invalid-source-operand` halt shape
//!    as SETMULTIHIT. Then the battler resolver: `None` blocks; `hp != 0`
//!    advances; `hp == 0` jumps via the (lazily resolved) pointer operand,
//!    unresolved on the taken branch throwing `Cmd_jumpifhasnohp:
//!    unresolved jump target <expr>` verbatim -- the family's ONLY throw.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `Cmd_setmultihit` :3638-3642, `Cmd_decrementmultihit` :3644-3650,
//! `Cmd_setmultihitcounter` :7139-7155, `Cmd_initmultihitstring`
//! :7157-7161, `Cmd_jumpifhasnohp` :9609-9616; dispatch rows :369
//! (`//0x26`), :370 (`//0x27`), :472 (`//0x8D`), :473 (`//0x8E`), :558
//! (`//0xE3`). `include/constants/battle_script_commands.h` :44 / :45 /
//! :147 / :148 / :233. Macros `asm/macros/battle_script.inc` :202
//! (`setmultihit`), :207 (`decrementmultihit`), :766 (`setmultihitcounter`),
//! :771 (`initmultihitstring`), :1159 (`jumpifhasnohp`).
//!
//! Committed census (`reference/pokeemerald/data/battle_scripts_1.s`, 18
//! sites): setmultihit :1390 (`3`), :3093 (`1`), :3096 (`2`);
//! decrementmultihit :639, :1420, :3104; setmultihitcounter :609 (`0`, the
//! rng path), :844 (`2`), :1081 (`2`); initmultihitstring :610, :845,
//! :1082, :1389; jumpifhasnohp :613 (BS_ATTACKER), :614 (BS_TARGET), :1392
//! (BS_ATTACKER), :1393 (BS_TARGET), :2583 (BS_TARGET).
//!
//! This leaf owns neither a generic machine, scheduler/event transport,
//! presentation, nor the WASM ABI.

use core::fmt;

use crate::rng::advance_rng_value;

pub const BATTLE_SCRIPT_SETMULTIHIT_OPCODE: u8 = 0x26;
pub const BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME: &str = "B_SCR_OP_SETMULTIHIT";
pub const BATTLE_SCRIPT_SETMULTIHIT_DISPATCHER: &str = "Cmd_setmultihit";

pub const BATTLE_SCRIPT_DECREMENTMULTIHIT_OPCODE: u8 = 0x27;
pub const BATTLE_SCRIPT_DECREMENTMULTIHIT_OPCODE_NAME: &str = "B_SCR_OP_DECREMENTMULTIHIT";
pub const BATTLE_SCRIPT_DECREMENTMULTIHIT_DISPATCHER: &str = "Cmd_decrementmultihit";

pub const BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE: u8 = 0x8d;
pub const BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME: &str = "B_SCR_OP_SETMULTIHITCOUNTER";
pub const BATTLE_SCRIPT_SETMULTIHITCOUNTER_DISPATCHER: &str = "Cmd_setmultihitcounter";

pub const BATTLE_SCRIPT_INITMULTIHITSTRING_OPCODE: u8 = 0x8e;
pub const BATTLE_SCRIPT_INITMULTIHITSTRING_OPCODE_NAME: &str = "B_SCR_OP_INITMULTIHITSTRING";
pub const BATTLE_SCRIPT_INITMULTIHITSTRING_DISPATCHER: &str = "Cmd_initmultihitstring";

pub const BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE: u8 = 0xe3;
pub const BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFHASNOHP";
pub const BATTLE_SCRIPT_JUMPIFHASNOHP_DISPATCHER: &str = "Cmd_jumpifhasnohp";

/// `hitChainOpcode.ts`-style literal draw reasons (`setmultihitcounter:initial`/
/// `setmultihitcounter:reroll`, `ruleCommands.ts:235,243`).
pub const BATTLE_SCRIPT_SETMULTIHITCOUNTER_INITIAL_REASON: &str = "setmultihitcounter:initial";
pub const BATTLE_SCRIPT_SETMULTIHITCOUNTER_REROLL_REASON: &str = "setmultihitcounter:reroll";

/// The narrow rules slice the quintet touches.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyRules {
    pub multi_hit_counter: u8,
    pub multi_hit_string_counter: u8,
    pub selector_attacker: Option<u8>,
    pub selector_target: Option<u8>,
    pub selector_effect_battler: Option<u8>,
    pub selector_fainted: Option<u8>,
    pub scripting_battler: u8,
    pub battlers_hp: [u16; 4],
}

/// `drawBattleScriptRng`'s RNG-state projection (`battle_script_critcalc.rs`
/// precedent).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors `instructionProvenance`'s six fields verbatim
/// (`battleScriptMachine.ts:275-287`, `battle_script_critcalc.rs` precedent).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyProvenance {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub dispatcher: &'static str,
    pub source_label: String,
    pub source_statement_line: u32,
}

/// One `BattleScriptRngLedgerEntry`; only ever produced by SETMULTIHITCOUNTER.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
    pub provenance: BattleScriptMultiHitFamilyProvenance,
}

/// One source macro operand, shared by all five instruction shapes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source jump target, resolved LAZILY by the caller only on the
/// taken branch (jumpif family precedent).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyResolvedTarget {
    pub program_counter: u32,
}

/// Mirrors canonical `invalidSourceOperandReason` verbatim
/// (`ruleCommands.ts:31-46`) -- shared by SETMULTIHIT, SETMULTIHITCOUNTER,
/// and JUMPIFHASNOHP.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyInvalidOperandHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub operand_expression: String,
    pub expected: &'static str,
    pub received: String,
}

/// Mirrors canonical `unavailableByteReason` / `unavailableBattlerReason`
/// verbatim (`ruleCommands.ts:65-95`) -- a valid outcome, never an error.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyBlock {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub port: &'static str,
    pub operand_expression: String,
}

/// Mirrors DECREMENTMULTIHIT's `invalid-control-target` halt reason verbatim
/// (`ruleCommands.ts:184-189`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyInvalidControlTargetHalt {
    pub program_counter: u32,
    pub expression: String,
}

fn shape_received(operand_count: usize, width_bytes: Option<u8>) -> String {
    let width = width_bytes.map_or_else(|| "<missing>".to_string(), |w| w.to_string());
    format!("{operand_count} operands; width {width}")
}

fn missing_expression(operand: Option<&BattleScriptMultiHitFamilyOperand<'_>>) -> String {
    operand.map_or_else(|| "<missing>".to_string(), |o| o.expression.to_string())
}

fn invalid_operand_shape_halt(
    program_counter: u32,
    opcode_id: u8,
    opcode_name: &'static str,
    operand: Option<&BattleScriptMultiHitFamilyOperand<'_>>,
    operand_count: usize,
) -> BattleScriptMultiHitFamilyInvalidOperandHalt {
    BattleScriptMultiHitFamilyInvalidOperandHalt {
        program_counter,
        opcode_id,
        opcode_name,
        operand_expression: missing_expression(operand),
        expected: "u8",
        received: shape_received(operand_count, operand.map(|o| o.width_bytes)),
    }
}

fn invalid_operand_value_halt(
    program_counter: u32,
    opcode_id: u8,
    opcode_name: &'static str,
    operand_expression: &str,
    resolved_value: i64,
) -> BattleScriptMultiHitFamilyInvalidOperandHalt {
    BattleScriptMultiHitFamilyInvalidOperandHalt {
        program_counter,
        opcode_id,
        opcode_name,
        operand_expression: operand_expression.to_string(),
        expected: "u8",
        received: resolved_value.to_string(),
    }
}

fn resolve_byte_block(
    program_counter: u32,
    opcode_id: u8,
    opcode_name: &'static str,
    operand_expression: &str,
) -> BattleScriptMultiHitFamilyBlock {
    BattleScriptMultiHitFamilyBlock {
        program_counter,
        opcode_id,
        opcode_name,
        port: "resolve-byte",
        operand_expression: operand_expression.to_string(),
    }
}

/// Native twin of the canonical production `resolveByteOperand` port
/// (`factoryBattleScriptFullTurnDecision.ts:1370-1371`): an expression
/// matching `/^[0-9]+$/` resolves to its decimal value; anything else is
/// unmodeled.
#[must_use]
pub fn resolve_battle_script_multihit_byte_operand(expression: &str) -> Option<i64> {
    if !expression.is_empty() && expression.bytes().all(|byte| byte.is_ascii_digit()) {
        expression.parse::<i64>().ok()
    } else {
        None
    }
}

/// Native twin of `resolveRulesBattlerForBattleScript`
/// (`battleScriptRulesContext.ts:2873-2900`), narrowed to the six named
/// selectors reachable from this leaf.
#[must_use]
pub fn resolve_battle_script_multihit_battler(
    rules: &BattleScriptMultiHitFamilyRules,
    expression: &str,
) -> Option<u8> {
    match expression {
        "BS_TARGET" => rules.selector_target,
        "BS_ATTACKER" => rules.selector_attacker,
        "BS_EFFECT_BATTLER" => rules.selector_effect_battler,
        "BS_BATTLER_0" => Some(0),
        "BS_FAINTED" => rules.selector_fainted,
        "BS_SCRIPTING" => Some(rules.scripting_battler),
        _ => None,
    }
}

/// One committed-program instruction, used for find-first registration by
/// `opcode_name`, ignoring every other field.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// `committed Battle Script program does not emit {opcode_name}` -- shared
/// verbatim message across all five opcodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptMultiHitFamilyRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptMultiHitFamilyRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptMultiHitFamilyRegistrationError {}

/// Find-FIRST REQUIRED: the one shared `install` convention
/// (`ruleCommands.ts:115-126`) driving all five opcodes.
pub fn register_battle_script_multihit_family_opcode(
    instructions: &[BattleScriptMultiHitFamilyRegistrationInstruction<'_>],
    opcode_name: &'static str,
) -> Result<u8, BattleScriptMultiHitFamilyRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptMultiHitFamilyRegistrationError { opcode_name })
}

// ---------------------------------------------------------------------
// SETMULTIHIT
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetMultiHitInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub operands: &'a [BattleScriptMultiHitFamilyOperand<'a>],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptSetMultiHitOutcome {
    Advance {
        rules: BattleScriptMultiHitFamilyRules,
    },
    Block(BattleScriptMultiHitFamilyBlock),
    Halt(BattleScriptMultiHitFamilyInvalidOperandHalt),
}

/// Native twin of the SETMULTIHIT install closure (`ruleCommands.ts:128-161`).
#[must_use]
pub fn apply_battle_script_setmultihit(
    rules: &BattleScriptMultiHitFamilyRules,
    instruction: &BattleScriptSetMultiHitInstruction<'_>,
) -> BattleScriptSetMultiHitOutcome {
    let operand = instruction.operands.first();
    if operand.is_none_or(|o| o.width_bytes != 1) || instruction.operands.len() != 1 {
        return BattleScriptSetMultiHitOutcome::Halt(invalid_operand_shape_halt(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME,
            operand,
            instruction.operands.len(),
        ));
    }
    let operand = operand.expect("operand shape validated above");

    let Some(value) = resolve_battle_script_multihit_byte_operand(operand.expression) else {
        return BattleScriptSetMultiHitOutcome::Block(resolve_byte_block(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME,
            operand.expression,
        ));
    };
    if !(0..=0xff).contains(&value) {
        return BattleScriptSetMultiHitOutcome::Halt(invalid_operand_value_halt(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME,
            operand.expression,
            value,
        ));
    }

    let mut next = *rules;
    next.multi_hit_counter = value as u8;
    BattleScriptSetMultiHitOutcome::Advance { rules: next }
}

// ---------------------------------------------------------------------
// DECREMENTMULTIHIT
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDecrementMultiHitInstruction<'a> {
    pub program_counter: u32,
    pub operands: &'a [BattleScriptMultiHitFamilyOperand<'a>],
    pub resolved_target: Option<BattleScriptMultiHitFamilyResolvedTarget>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptDecrementMultiHitOutcome {
    Advance {
        rules: BattleScriptMultiHitFamilyRules,
    },
    Jump {
        program_counter: u32,
        rules: BattleScriptMultiHitFamilyRules,
    },
    Halt {
        reason: BattleScriptMultiHitFamilyInvalidControlTargetHalt,
        rules: BattleScriptMultiHitFamilyRules,
    },
}

/// Native twin of the DECREMENTMULTIHIT install closure
/// (`ruleCommands.ts:163-195`). The decrement (with its 0 -> 0xff wrap) is
/// ALWAYS applied before any shape check, and survives a halt.
#[must_use]
pub fn apply_battle_script_decrementmultihit(
    rules: &BattleScriptMultiHitFamilyRules,
    instruction: &BattleScriptDecrementMultiHitInstruction<'_>,
) -> BattleScriptDecrementMultiHitOutcome {
    let counter = rules.multi_hit_counter.wrapping_sub(1);
    let mut next = *rules;
    next.multi_hit_counter = counter;

    if counter == 0 {
        return BattleScriptDecrementMultiHitOutcome::Advance { rules: next };
    }

    let operand = instruction.operands.first();
    let target = if operand.is_some_and(|o| o.width_bytes == 4) {
        instruction.resolved_target
    } else {
        None
    };
    let malformed = operand.is_none() || target.is_none() || instruction.operands.len() != 1;
    if malformed {
        return BattleScriptDecrementMultiHitOutcome::Halt {
            reason: BattleScriptMultiHitFamilyInvalidControlTargetHalt {
                program_counter: instruction.program_counter,
                expression: missing_expression(operand),
            },
            rules: next,
        };
    }

    BattleScriptDecrementMultiHitOutcome::Jump {
        program_counter: target.expect("checked above").program_counter,
        rules: next,
    }
}

// ---------------------------------------------------------------------
// SETMULTIHITCOUNTER
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetMultiHitCounterInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub operands: &'a [BattleScriptMultiHitFamilyOperand<'a>],
    pub source_label: &'a str,
    pub source_statement_line: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptSetMultiHitCounterOutcome {
    Advance {
        rules: BattleScriptMultiHitFamilyRules,
        rng: BattleScriptMultiHitFamilyRngState,
        draws: Vec<BattleScriptMultiHitFamilyRngDraw>,
    },
    Block(BattleScriptMultiHitFamilyBlock),
    Halt(BattleScriptMultiHitFamilyInvalidOperandHalt),
}

fn draw_multihitcounter_rng(
    rng: BattleScriptMultiHitFamilyRngState,
    reason: &'static str,
    instruction: &BattleScriptSetMultiHitCounterInstruction<'_>,
) -> (
    BattleScriptMultiHitFamilyRngDraw,
    BattleScriptMultiHitFamilyRngState,
) {
    let after = advance_rng_value(rng.value);
    let random_value = ((after >> 16) & 0xffff) as u16;
    let call = rng.calls + 1;
    let draw = BattleScriptMultiHitFamilyRngDraw {
        call,
        reason,
        before: rng.value,
        after,
        random_value,
        provenance: BattleScriptMultiHitFamilyProvenance {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
            dispatcher: BATTLE_SCRIPT_SETMULTIHITCOUNTER_DISPATCHER,
            source_label: instruction.source_label.to_string(),
            source_statement_line: instruction.source_statement_line,
        },
    };
    (
        draw,
        BattleScriptMultiHitFamilyRngState { value: after, calls: call },
    )
}

/// Native twin of the SETMULTIHITCOUNTER install closure
/// (`ruleCommands.ts:197-260`). The only RNG-drawing opcode in the quintet.
#[must_use]
pub fn apply_battle_script_setmultihitcounter(
    rules: &BattleScriptMultiHitFamilyRules,
    rng: BattleScriptMultiHitFamilyRngState,
    instruction: &BattleScriptSetMultiHitCounterInstruction<'_>,
) -> BattleScriptSetMultiHitCounterOutcome {
    let operand = instruction.operands.first();
    if operand.is_none_or(|o| o.width_bytes != 1) || instruction.operands.len() != 1 {
        return BattleScriptSetMultiHitCounterOutcome::Halt(invalid_operand_shape_halt(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
            operand,
            instruction.operands.len(),
        ));
    }
    let operand = operand.expect("operand shape validated above");

    let Some(resolved) = resolve_battle_script_multihit_byte_operand(operand.expression) else {
        return BattleScriptSetMultiHitCounterOutcome::Block(resolve_byte_block(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
            operand.expression,
        ));
    };
    if !(0..=0xff).contains(&resolved) {
        return BattleScriptSetMultiHitCounterOutcome::Halt(invalid_operand_value_halt(
            instruction.program_counter,
            instruction.opcode_id,
            BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
            operand.expression,
            resolved,
        ));
    }

    let mut counter = resolved as u8;
    let mut current_rng = rng;
    let mut draws = Vec::new();
    if counter == 0 {
        let (initial_draw, rng_after_initial) = draw_multihitcounter_rng(
            current_rng,
            BATTLE_SCRIPT_SETMULTIHITCOUNTER_INITIAL_REASON,
            instruction,
        );
        current_rng = rng_after_initial;
        counter = (initial_draw.random_value & 3) as u8;
        draws.push(initial_draw);

        if counter > 1 {
            let (reroll_draw, rng_after_reroll) = draw_multihitcounter_rng(
                current_rng,
                BATTLE_SCRIPT_SETMULTIHITCOUNTER_REROLL_REASON,
                instruction,
            );
            current_rng = rng_after_reroll;
            counter = (reroll_draw.random_value & 3) as u8 + 2;
            draws.push(reroll_draw);
        } else {
            counter += 2;
        }
    }

    let mut next_rules = *rules;
    next_rules.multi_hit_counter = counter;
    BattleScriptSetMultiHitCounterOutcome::Advance { rules: next_rules, rng: current_rng, draws }
}

// ---------------------------------------------------------------------
// INITMULTIHITSTRING
// ---------------------------------------------------------------------

/// Native twin of the INITMULTIHITSTRING install closure
/// (`ruleCommands.ts:277-283`): zero operands consulted, unconditional
/// `multiHitStringCounter := 0`, advance. See the module doc comment for the
/// writer/reader story cited from `ruleCommands.ts`'s own doc comment.
#[must_use]
pub fn apply_battle_script_initmultihitstring(
    rules: &BattleScriptMultiHitFamilyRules,
) -> BattleScriptMultiHitFamilyRules {
    let mut next = *rules;
    next.multi_hit_string_counter = 0;
    next
}

// ---------------------------------------------------------------------
// JUMPIFHASNOHP
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifHasNoHpInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub operands: &'a [BattleScriptMultiHitFamilyOperand<'a>],
    pub resolved_target: Option<BattleScriptMultiHitFamilyResolvedTarget>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptJumpifHasNoHpOutcome {
    Advance,
    Jump { program_counter: u32 },
    Block(BattleScriptMultiHitFamilyBlock),
    Halt(BattleScriptMultiHitFamilyInvalidOperandHalt),
}

/// `Cmd_jumpifhasnohp: unresolved jump target <expr>` -- the family's ONLY
/// throw (`ruleCommands.ts:318`, verbatim).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptJumpifHasNoHpUnresolvedTargetError {
    pub expression: String,
}

impl fmt::Display for BattleScriptJumpifHasNoHpUnresolvedTargetError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "Cmd_jumpifhasnohp: unresolved jump target {}",
            self.expression
        )
    }
}

impl std::error::Error for BattleScriptJumpifHasNoHpUnresolvedTargetError {}

/// Native twin of the JUMPIFHASNOHP install closure (`ruleCommands.ts:290-323`).
///
/// # Errors
/// [`BattleScriptJumpifHasNoHpUnresolvedTargetError`] on a taken branch whose
/// pointer operand does not resolve to a program label.
pub fn apply_battle_script_jumpifhasnohp(
    rules: &BattleScriptMultiHitFamilyRules,
    instruction: &BattleScriptJumpifHasNoHpInstruction<'_>,
) -> Result<BattleScriptJumpifHasNoHpOutcome, BattleScriptJumpifHasNoHpUnresolvedTargetError> {
    let battler_operand = instruction.operands.first();
    let ptr_operand = instruction.operands.get(1);
    let shape_ok = instruction.operands.len() == 2
        && battler_operand.is_some_and(|o| o.width_bytes == 1)
        && ptr_operand.is_some_and(|o| o.width_bytes == 4);
    if !shape_ok {
        return Ok(BattleScriptJumpifHasNoHpOutcome::Halt(
            invalid_operand_shape_halt(
                instruction.program_counter,
                instruction.opcode_id,
                BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE_NAME,
                battler_operand,
                instruction.operands.len(),
            ),
        ));
    }
    let battler_operand = battler_operand.expect("shape validated above");
    let ptr_operand = ptr_operand.expect("shape validated above");

    let Some(battler) = resolve_battle_script_multihit_battler(rules, battler_operand.expression)
    else {
        return Ok(BattleScriptJumpifHasNoHpOutcome::Block(
            BattleScriptMultiHitFamilyBlock {
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                opcode_name: BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE_NAME,
                port: "resolve-battler-for-battle-script",
                operand_expression: battler_operand.expression.to_string(),
            },
        ));
    };

    if rules.battlers_hp[battler as usize] != 0 {
        return Ok(BattleScriptJumpifHasNoHpOutcome::Advance);
    }

    let Some(target) = instruction.resolved_target else {
        return Err(BattleScriptJumpifHasNoHpUnresolvedTargetError {
            expression: ptr_operand.expression.to_string(),
        });
    };
    Ok(BattleScriptJumpifHasNoHpOutcome::Jump { program_counter: target.program_counter })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptMultiHitFamilyRules {
        BattleScriptMultiHitFamilyRules {
            multi_hit_counter: 9,
            multi_hit_string_counter: 3,
            selector_attacker: Some(0),
            selector_target: Some(1),
            selector_effect_battler: Some(2),
            selector_fainted: None,
            scripting_battler: 0,
            battlers_hp: [100, 100, 100, 100],
        }
    }

    fn operand(width_bytes: u8, expression: &str) -> BattleScriptMultiHitFamilyOperand<'_> {
        BattleScriptMultiHitFamilyOperand { width_bytes, expression }
    }

    #[test]
    fn byte_operand_resolver_both_directions() {
        assert_eq!(resolve_battle_script_multihit_byte_operand("0"), Some(0));
        assert_eq!(
            resolve_battle_script_multihit_byte_operand("255"),
            Some(255)
        );
        assert_eq!(
            resolve_battle_script_multihit_byte_operand("256"),
            Some(256)
        );
        assert_eq!(resolve_battle_script_multihit_byte_operand(""), None);
        assert_eq!(resolve_battle_script_multihit_byte_operand("-1"), None);
        assert_eq!(
            resolve_battle_script_multihit_byte_operand("BS_ATTACKER"),
            None
        );
    }

    #[test]
    fn battler_resolver_closed_catalog_both_directions() {
        let r = rules();
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_ATTACKER"),
            Some(0)
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_TARGET"),
            Some(1)
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_EFFECT_BATTLER"),
            Some(2)
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_BATTLER_0"),
            Some(0)
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_FAINTED"),
            None
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "BS_SCRIPTING"),
            Some(0)
        );
        assert_eq!(
            resolve_battle_script_multihit_battler(&r, "gBogusSelector"),
            None
        );

        let mut fainted = r;
        fainted.selector_fainted = Some(3);
        assert_eq!(
            resolve_battle_script_multihit_battler(&fainted, "BS_FAINTED"),
            Some(3)
        );
    }

    #[test]
    fn setmultihit_shape_halt_then_block_then_value_halt_then_advance() {
        let r = rules();
        let halt = apply_battle_script_setmultihit(
            &r,
            &BattleScriptSetMultiHitInstruction {
                program_counter: 1,
                opcode_id: 0x26,
                operands: &[],
            },
        );
        assert!(matches!(halt, BattleScriptSetMultiHitOutcome::Halt(_)));

        let ops = [operand(1, "BOGUS")];
        let block = apply_battle_script_setmultihit(
            &r,
            &BattleScriptSetMultiHitInstruction {
                program_counter: 1,
                opcode_id: 0x26,
                operands: &ops,
            },
        );
        assert!(matches!(block, BattleScriptSetMultiHitOutcome::Block(_)));

        let ops = [operand(1, "256")];
        let value_halt = apply_battle_script_setmultihit(
            &r,
            &BattleScriptSetMultiHitInstruction {
                program_counter: 1,
                opcode_id: 0x26,
                operands: &ops,
            },
        );
        match value_halt {
            BattleScriptSetMultiHitOutcome::Halt(halt) => assert_eq!(halt.received, "256"),
            other => panic!("expected halt, got {other:?}"),
        }

        let ops = [operand(1, "3")];
        let advance = apply_battle_script_setmultihit(
            &r,
            &BattleScriptSetMultiHitInstruction {
                program_counter: 1,
                opcode_id: 0x26,
                operands: &ops,
            },
        );
        match advance {
            BattleScriptSetMultiHitOutcome::Advance { rules } => {
                assert_eq!(rules.multi_hit_counter, 3)
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn decrementmultihit_wraps_zero_to_255_and_jumps() {
        let mut r = rules();
        r.multi_hit_counter = 0;
        let ops = [operand(4, "SomeLabel")];
        let outcome = apply_battle_script_decrementmultihit(
            &r,
            &BattleScriptDecrementMultiHitInstruction {
                program_counter: 10,
                operands: &ops,
                resolved_target: Some(BattleScriptMultiHitFamilyResolvedTarget {
                    program_counter: 200,
                }),
            },
        );
        match outcome {
            BattleScriptDecrementMultiHitOutcome::Jump { program_counter, rules } => {
                assert_eq!(program_counter, 200);
                assert_eq!(rules.multi_hit_counter, 255);
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn decrementmultihit_survives_halt_with_decremented_counter() {
        let mut r = rules();
        r.multi_hit_counter = 2;
        let ops = [operand(4, "SomeLabel")];
        let outcome = apply_battle_script_decrementmultihit(
            &r,
            &BattleScriptDecrementMultiHitInstruction {
                program_counter: 10,
                operands: &ops,
                resolved_target: None,
            },
        );
        match outcome {
            BattleScriptDecrementMultiHitOutcome::Halt { reason, rules } => {
                assert_eq!(rules.multi_hit_counter, 1, "decrement survives the halt");
                assert_eq!(reason.expression, "SomeLabel");
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn decrementmultihit_advance_at_one_ignores_unused_operand() {
        let mut r = rules();
        r.multi_hit_counter = 1;
        let outcome = apply_battle_script_decrementmultihit(
            &r,
            &BattleScriptDecrementMultiHitInstruction {
                program_counter: 10,
                operands: &[],
                resolved_target: None,
            },
        );
        match outcome {
            BattleScriptDecrementMultiHitOutcome::Advance { rules } => {
                assert_eq!(rules.multi_hit_counter, 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    fn counter_instruction<'a>(
        operands: &'a [BattleScriptMultiHitFamilyOperand<'a>],
    ) -> BattleScriptSetMultiHitCounterInstruction<'a> {
        BattleScriptSetMultiHitCounterInstruction {
            program_counter: 285,
            opcode_id: 0x8d,
            operands,
            source_label: "BattleScript_EffectMultiHit",
            source_statement_line: 609,
        }
    }

    #[test]
    fn setmultihitcounter_nonzero_operand_draws_nothing() {
        let r = rules();
        let ops = [operand(1, "2")];
        let outcome = apply_battle_script_setmultihitcounter(
            &r,
            BattleScriptMultiHitFamilyRngState { value: 0x1234_5678, calls: 0 },
            &counter_instruction(&ops),
        );
        match outcome {
            BattleScriptSetMultiHitCounterOutcome::Advance { rules, rng, draws } => {
                assert_eq!(rules.multi_hit_counter, 2);
                assert_eq!(
                    rng,
                    BattleScriptMultiHitFamilyRngState { value: 0x1234_5678, calls: 0 }
                );
                assert!(draws.is_empty());
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn setmultihitcounter_one_draw_when_initial_masked_value_is_zero_or_one() {
        // seed=0: advance_rng_value(0) upper16 = 0 -> masked 0 -> one draw, counter 2.
        let r = rules();
        let ops = [operand(1, "0")];
        let outcome = apply_battle_script_setmultihitcounter(
            &r,
            BattleScriptMultiHitFamilyRngState { value: 0, calls: 0 },
            &counter_instruction(&ops),
        );
        match outcome {
            BattleScriptSetMultiHitCounterOutcome::Advance { rules, rng, draws } => {
                assert_eq!(draws.len(), 1);
                assert_eq!(
                    draws[0].reason,
                    BATTLE_SCRIPT_SETMULTIHITCOUNTER_INITIAL_REASON
                );
                assert_eq!(rules.multi_hit_counter, 2);
                assert_eq!(rng.calls, 1);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn setmultihitcounter_two_draws_when_initial_masked_value_exceeds_one() {
        // seed=4: advance_rng_value(4) upper16 = 1817 -> masked 1 -> wait, need >1;
        // pick a seed whose masked initial value is > 1 (verified against TS fixture in vectors).
        let r = rules();
        let ops = [operand(1, "0")];
        let outcome = apply_battle_script_setmultihitcounter(
            &r,
            BattleScriptMultiHitFamilyRngState { value: 10, calls: 0 },
            &counter_instruction(&ops),
        );
        match outcome {
            BattleScriptSetMultiHitCounterOutcome::Advance { rules, rng, draws } => {
                assert_eq!(draws.len(), 2);
                assert_eq!(
                    draws[0].reason,
                    BATTLE_SCRIPT_SETMULTIHITCOUNTER_INITIAL_REASON
                );
                assert_eq!(
                    draws[1].reason,
                    BATTLE_SCRIPT_SETMULTIHITCOUNTER_REROLL_REASON
                );
                assert!((2..=5).contains(&rules.multi_hit_counter));
                assert_eq!(rng.calls, 2);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn initmultihitstring_zeroes_counter_only() {
        let r = rules();
        let next = apply_battle_script_initmultihitstring(&r);
        assert_eq!(next.multi_hit_string_counter, 0);
        assert_eq!(next.multi_hit_counter, r.multi_hit_counter);
    }

    #[test]
    fn jumpifhasnohp_hp_nonzero_advances_hp_zero_jumps() {
        let mut r = rules();
        let ops = [operand(1, "BS_TARGET"), operand(4, "SomeLabel")];
        let instruction = BattleScriptJumpifHasNoHpInstruction {
            program_counter: 20,
            opcode_id: 0xe3,
            operands: &ops,
            resolved_target: Some(BattleScriptMultiHitFamilyResolvedTarget {
                program_counter: 500,
            }),
        };
        let advance = apply_battle_script_jumpifhasnohp(&r, &instruction).unwrap();
        assert_eq!(advance, BattleScriptJumpifHasNoHpOutcome::Advance);

        r.battlers_hp[1] = 0;
        let jump = apply_battle_script_jumpifhasnohp(&r, &instruction).unwrap();
        assert_eq!(
            jump,
            BattleScriptJumpifHasNoHpOutcome::Jump { program_counter: 500 }
        );
    }

    #[test]
    fn jumpifhasnohp_missing_role_blocks_unresolved_target_throws() {
        let mut r = rules();
        r.selector_attacker = None;
        let ops = [operand(1, "BS_ATTACKER"), operand(4, "SomeLabel")];
        let instruction = BattleScriptJumpifHasNoHpInstruction {
            program_counter: 20,
            opcode_id: 0xe3,
            operands: &ops,
            resolved_target: None,
        };
        let block = apply_battle_script_jumpifhasnohp(&r, &instruction).unwrap();
        assert!(matches!(block, BattleScriptJumpifHasNoHpOutcome::Block(_)));

        r.selector_attacker = Some(0);
        r.battlers_hp[0] = 0;
        let error = apply_battle_script_jumpifhasnohp(&r, &instruction).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifhasnohp: unresolved jump target SomeLabel"
        );
    }

    #[test]
    fn registration_find_first_required_across_all_five() {
        for name in [
            BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME,
            BATTLE_SCRIPT_DECREMENTMULTIHIT_OPCODE_NAME,
            BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
            BATTLE_SCRIPT_INITMULTIHITSTRING_OPCODE_NAME,
            BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE_NAME,
        ] {
            let present = [BattleScriptMultiHitFamilyRegistrationInstruction {
                opcode_name: name,
                opcode_id: 0x99,
            }];
            assert_eq!(
                register_battle_script_multihit_family_opcode(&present, name).unwrap(),
                0x99
            );
            assert_eq!(
                register_battle_script_multihit_family_opcode(&[], name)
                    .unwrap_err()
                    .to_string(),
                format!("committed Battle Script program does not emit {name}")
            );
        }
    }
}
