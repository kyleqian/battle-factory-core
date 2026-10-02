//! Pure `B_SCR_OP_GOTO` (0x28, `Cmd_goto`) / `B_SCR_OP_RETURN` (0x3C,
//! `Cmd_return`) / `B_SCR_OP_END` (0x3D, `Cmd_end`) / `B_SCR_OP_END2` (0x3E,
//! `Cmd_end2`) / `B_SCR_OP_END3` (0x3F, `Cmd_end3`) / `B_SCR_OP_CALL` (0x41,
//! `Cmd_call`) machine-control family -- the native twin of the module-local
//! `install` closure inside `createBattleScriptControlHandlers`
//! (`src/engine/battleScriptMachine.ts:645-670`) plus its directive helpers
//! `targetFromFirstOperand` (:535-553), `callTargetFromFirstOperand`
//! (:555-562), `terminal` (:564-577), and `end3` (:590-606), AND the
//! machine-step application switch inside `stepBattleScriptMachine`
//! (:851-1105) for the jump/call/return/halt directive kinds this family
//! produces.
//!
//! UNIQUE in the lane: these six handlers read NO rules context at all --
//! they are pure functions of (instruction operands, program, the machine's
//! program-counter/call-stack cursor). There is no rules struct here, only
//! `BattleScriptControlFamilyCursor { program_counter, call_stack }`, mirroring
//! exactly the two fields `stepBattleScriptMachine`'s application switch
//! touches for these directives.
//!
//! GOTO/CALL share one resolution ladder (`targetFromFirstOperand`): operand
//! 0's label is resolved LAZILY, and only when `widthBytes === 4`
//! (`resolveBattleScriptLabel`); the sole halt condition is `!operand ||
//! !entry || operands.length !== 1` -- reason kind `"invalid-control-target"`
//! carrying the program counter and `operand?.expression ?? "<missing>"`.
//! Evaluation-order pin: a 2-operand goto whose first operand DOES resolve
//! still halts, and reports operand[0]'s real expression, not `"<missing>"`
//! (the `operand` half of the OR is satisfied; only the operand-count check
//! fails). CALL's `callTargetFromFirstOperand` runs the identical ladder and
//! rewraps a `jump` result as a `call`; the halts are byte-identical.
//!
//! RETURN consults no operand at all -- it is the frozen `RETURN` directive.
//! Application (`stepBattleScriptMachine` :1058-1085): an empty call stack
//! halts `"return-stack-underflow"` with the program counter UNCHANGED;
//! otherwise the program counter becomes the top of the call stack and that
//! one entry pops (LIFO).
//!
//! CALL's application (:998-1009) pushes `state.programCounter + 1` -- the
//! index-model twin of the C `Cmd_call` pushing the byte address
//! `instr+5` (1 opcode byte + 4 pointer bytes = the next instruction) --
//! before moving the program counter to the resolved target.
//!
//! END/END2 both resolve to `terminal(context)`: halt reason kind
//! `"terminal"` carrying `{programCounter, opcodeId, opcodeName}`. Their C
//! battle-state side effects (Arena skill points, `gMoveResultFlags = 0`,
//! `gActiveBattler = 0`, `gCurrentActionFuncId = B_ACTION_TRY_FINISH`) are
//! INTENTIONALLY ABSENT -- the module doc comment (`battleScriptMachine.ts`
//! :630-644) says these two opcodes "expose only their common finish-this-
//! action control boundary."
//!
//! END3 (`end3(context)`, :590-606) is the one branching handler: a
//! non-empty call stack returns the SAME frozen `RETURN` directive, so its
//! post-state is byte-identical to a RETURN applied at that same call stack
//! (`docs/end3-design.md`); an empty call stack halts with its OWN reason
//! kind `"end3"` -- deliberately NOT `"terminal"`, since END3 never sets
//! `gCurrentActionFuncId = B_ACTION_TRY_FINISH` and its C-side guarded
//! `battleCallbackStack` pop (`battle_script_commands.c:3970-3972`) is
//! orchestration-level state this pure machine never holds (see the long
//! `"end3"` `BattleScriptHaltReason` doc comment in `battleScriptMachine.ts`
//! and `docs/end3-design.md`).
//!
//! SHARED REGISTRATION (the module-local `install`, :650-657): for all six
//! opcodes, find the FIRST committed instruction by `opcodeName`
//! (`program.instructions.find`); its absence is the only failure --
//! `committed Battle Script program does not emit <name>` verbatim -- and
//! there is no other validation (no dispatcher check, no operand-count
//! check) for any of the six.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `Cmd_goto` :3652-3655, `Cmd_return` :3945-3948, `Cmd_end` :3950-3958,
//! `Cmd_end2` :3960-3965, `Cmd_end3` :3967-3973, `Cmd_call` :3975-3979;
//! dispatch rows :371 (`//0x28`), :391 (`//0x3C`), :392 (`//0x3D`), :393
//! (`//0x3E`), :394 (`//0x3F`), :396 (`//0x41`); forward decls :119/:139/
//! :140/:141/:142/:144. `include/constants/battle_script_commands.h`
//! :46/:66/:67/:68/:69/:71. Macros `asm/macros/battle_script.inc` :212
//! (`goto`), :340 (`return`), :344 (`end`), :348 (`end2`), :352 (`end3`),
//! :361 (`call`).
//!
//! Committed census (`reference/pokeemerald/data/battle_scripts_1.s`,
//! verified independently with `grep`): goto 285, call 29, return 73, end
//! 13, end2 64, end3 10 -- 474 sites total.
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI. No branch ever consumes RNG.

use core::fmt;

pub const BATTLE_SCRIPT_GOTO_OPCODE: u8 = 0x28;
pub const BATTLE_SCRIPT_GOTO_OPCODE_NAME: &str = "B_SCR_OP_GOTO";
pub const BATTLE_SCRIPT_RETURN_OPCODE: u8 = 0x3c;
pub const BATTLE_SCRIPT_RETURN_OPCODE_NAME: &str = "B_SCR_OP_RETURN";
pub const BATTLE_SCRIPT_END_OPCODE: u8 = 0x3d;
pub const BATTLE_SCRIPT_END_OPCODE_NAME: &str = "B_SCR_OP_END";
pub const BATTLE_SCRIPT_END2_OPCODE: u8 = 0x3e;
pub const BATTLE_SCRIPT_END2_OPCODE_NAME: &str = "B_SCR_OP_END2";
pub const BATTLE_SCRIPT_END3_OPCODE: u8 = 0x3f;
pub const BATTLE_SCRIPT_END3_OPCODE_NAME: &str = "B_SCR_OP_END3";
pub const BATTLE_SCRIPT_CALL_OPCODE: u8 = 0x41;
pub const BATTLE_SCRIPT_CALL_OPCODE_NAME: &str = "B_SCR_OP_CALL";

pub const BATTLE_SCRIPT_CONTROL_FAMILY_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_GOTO_HANDLER_LINE: u32 = 3652;
pub const BATTLE_SCRIPT_RETURN_HANDLER_LINE: u32 = 3945;
pub const BATTLE_SCRIPT_END_HANDLER_LINE: u32 = 3950;
pub const BATTLE_SCRIPT_END2_HANDLER_LINE: u32 = 3960;
pub const BATTLE_SCRIPT_END3_HANDLER_LINE: u32 = 3967;
pub const BATTLE_SCRIPT_CALL_HANDLER_LINE: u32 = 3975;

/// The machine cursor state this family reads and writes -- `programCounter`
/// and `callStack` only, per the module doc comment. No rules context
/// exists for this family.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptControlFamilyCursor {
    pub program_counter: u32,
    pub call_stack: Vec<u32>,
}

/// One source macro operand, used only by GOTO/CALL's target resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptControlFamilyOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// The result of calling `resolveBattleScriptLabel` on operand 0's
/// expression -- independent of `widthBytes`; the width gate is applied by
/// `resolve_control_target` below, mirroring the TS ladder's short-circuit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptControlFamilyResolvedTarget {
    pub program_counter: u32,
}

/// A GOTO or CALL instruction's operand shape -- both opcodes share the
/// identical `targetFromFirstOperand` ladder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptControlFamilyJumpInstruction<'a> {
    pub operands: &'a [BattleScriptControlFamilyOperand<'a>],
    pub resolved_target: Option<BattleScriptControlFamilyResolvedTarget>,
}

/// The static shape a terminal/end3 instruction needs to name itself in its
/// halt reason.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptControlFamilyTerminalInstruction {
    pub opcode_id: u8,
    pub opcode_name: &'static str,
}

/// Mirrors the four `BattleScriptHaltReason` variants this family can
/// produce, verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptControlFamilyHalt {
    /// `"invalid-control-target"`.
    InvalidControlTarget {
        program_counter: u32,
        expression: String,
    },
    /// `"return-stack-underflow"`.
    ReturnStackUnderflow { program_counter: u32 },
    /// `"terminal"` (END/END2).
    Terminal {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'static str,
    },
    /// `"end3"` -- deliberately its own kind, never `"terminal"`.
    End3 {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'static str,
    },
}

/// Directive + application combined, mirroring how
/// `stepBattleScriptMachine`'s switch leaves post-state for each of this
/// family's four directive kinds.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptControlFamilyOutcome {
    Jump {
        program_counter: u32,
    },
    CallEnter {
        target_program_counter: u32,
        pushed_return_program_counter: u32,
    },
    /// `popped_depth` is the call stack's depth BEFORE the pop that produced
    /// this return (so depth 1 and depth 2 returns are distinguishable).
    ReturnTo {
        program_counter: u32,
        popped_depth: usize,
    },
    Halt(BattleScriptControlFamilyHalt),
}

enum ResolvedControl {
    Target(u32),
    Halt(BattleScriptControlFamilyHalt),
}

/// Native twin of `targetFromFirstOperand` (`battleScriptMachine.ts:535-553`).
fn resolve_control_target(
    instruction: &BattleScriptControlFamilyJumpInstruction<'_>,
    program_counter: u32,
) -> ResolvedControl {
    let operand = instruction.operands.first();
    let entry = match operand {
        Some(op) if op.width_bytes == 4 => instruction.resolved_target,
        _ => None,
    };
    if operand.is_none() || entry.is_none() || instruction.operands.len() != 1 {
        let expression =
            operand.map_or_else(|| "<missing>".to_string(), |op| op.expression.to_string());
        return ResolvedControl::Halt(BattleScriptControlFamilyHalt::InvalidControlTarget {
            program_counter,
            expression,
        });
    }
    ResolvedControl::Target(entry.unwrap().program_counter)
}

/// Native twin of the GOTO install closure
/// (`targetFromFirstOperand` applied directly, :658-659).
#[must_use]
pub fn apply_battle_script_goto(
    instruction: &BattleScriptControlFamilyJumpInstruction<'_>,
    cursor: &BattleScriptControlFamilyCursor,
) -> (
    BattleScriptControlFamilyCursor,
    BattleScriptControlFamilyOutcome,
) {
    match resolve_control_target(instruction, cursor.program_counter) {
        ResolvedControl::Halt(halt) => {
            (cursor.clone(), BattleScriptControlFamilyOutcome::Halt(halt))
        }
        ResolvedControl::Target(program_counter) => (
            BattleScriptControlFamilyCursor {
                program_counter,
                call_stack: cursor.call_stack.clone(),
            },
            BattleScriptControlFamilyOutcome::Jump { program_counter },
        ),
    }
}

/// Native twin of `callTargetFromFirstOperand` (:555-562) plus the `"call"`
/// application (:998-1009): pushes `programCounter + 1` -- the index-model
/// twin of C's `instr+5` -- before moving to the resolved target.
#[must_use]
pub fn apply_battle_script_call(
    instruction: &BattleScriptControlFamilyJumpInstruction<'_>,
    cursor: &BattleScriptControlFamilyCursor,
) -> (
    BattleScriptControlFamilyCursor,
    BattleScriptControlFamilyOutcome,
) {
    match resolve_control_target(instruction, cursor.program_counter) {
        ResolvedControl::Halt(halt) => {
            (cursor.clone(), BattleScriptControlFamilyOutcome::Halt(halt))
        }
        ResolvedControl::Target(target_program_counter) => {
            let pushed_return_program_counter = cursor.program_counter + 1;
            let mut call_stack = cursor.call_stack.clone();
            call_stack.push(pushed_return_program_counter);
            (
                BattleScriptControlFamilyCursor {
                    program_counter: target_program_counter,
                    call_stack,
                },
                BattleScriptControlFamilyOutcome::CallEnter {
                    target_program_counter,
                    pushed_return_program_counter,
                },
            )
        }
    }
}

/// Native twin of the frozen `RETURN` directive plus its application
/// (`stepBattleScriptMachine` :1058-1085): an empty call stack halts with
/// the program counter UNCHANGED; otherwise the program counter becomes the
/// popped top of the call stack (LIFO).
#[must_use]
pub fn apply_battle_script_return(
    cursor: &BattleScriptControlFamilyCursor,
) -> (
    BattleScriptControlFamilyCursor,
    BattleScriptControlFamilyOutcome,
) {
    match cursor.call_stack.last().copied() {
        None => (
            cursor.clone(),
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::ReturnStackUnderflow {
                    program_counter: cursor.program_counter,
                },
            ),
        ),
        Some(program_counter) => {
            let popped_depth = cursor.call_stack.len();
            let mut call_stack = cursor.call_stack.clone();
            call_stack.pop();
            (
                BattleScriptControlFamilyCursor { program_counter, call_stack },
                BattleScriptControlFamilyOutcome::ReturnTo { program_counter, popped_depth },
            )
        }
    }
}

/// Native twin of `terminal(context)` (:564-577), shared by END and END2.
/// Their C battle-state side effects are intentionally absent (module doc
/// comment).
#[must_use]
pub fn apply_battle_script_terminal(
    instruction: &BattleScriptControlFamilyTerminalInstruction,
    cursor: &BattleScriptControlFamilyCursor,
) -> (
    BattleScriptControlFamilyCursor,
    BattleScriptControlFamilyOutcome,
) {
    (
        cursor.clone(),
        BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::Terminal {
            program_counter: cursor.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: instruction.opcode_name,
        }),
    )
}

/// Native twin of `end3(context)` (:590-606): a non-empty call stack resumes
/// exactly like RETURN (byte-identical post-state at the same call stack);
/// an empty call stack halts with its OWN `"end3"` reason kind, never
/// `"terminal"`.
#[must_use]
pub fn apply_battle_script_end3(
    instruction: &BattleScriptControlFamilyTerminalInstruction,
    cursor: &BattleScriptControlFamilyCursor,
) -> (
    BattleScriptControlFamilyCursor,
    BattleScriptControlFamilyOutcome,
) {
    if !cursor.call_stack.is_empty() {
        return apply_battle_script_return(cursor);
    }
    (
        cursor.clone(),
        BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::End3 {
            program_counter: cursor.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: instruction.opcode_name,
        }),
    )
}

/// One committed-program instruction, as seen by registration: just enough
/// shape to drive the single shared find-FIRST convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptControlFamilyRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptControlFamilyRegistrationError {
    pub opcode_name: String,
}

impl fmt::Display for BattleScriptControlFamilyRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptControlFamilyRegistrationError {}

/// Native twin of the shared `install` closure's lookup
/// (`battleScriptMachine.ts:652-656`): find-FIRST by `opcodeName`, no other
/// validation. Identical for all six opcodes in this family.
pub fn register_battle_script_control_opcode(
    instructions: &[BattleScriptControlFamilyRegistrationInstruction<'_>],
    opcode_name: &str,
) -> Result<u8, BattleScriptControlFamilyRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| instruction.opcode_id)
        .ok_or_else(|| BattleScriptControlFamilyRegistrationError {
            opcode_name: opcode_name.to_string(),
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cursor(program_counter: u32, call_stack: &[u32]) -> BattleScriptControlFamilyCursor {
        BattleScriptControlFamilyCursor { program_counter, call_stack: call_stack.to_vec() }
    }

    fn jump_instr<'a>(
        operands: &'a [BattleScriptControlFamilyOperand<'a>],
        resolved_target: Option<u32>,
    ) -> BattleScriptControlFamilyJumpInstruction<'a> {
        BattleScriptControlFamilyJumpInstruction {
            operands,
            resolved_target: resolved_target
                .map(|program_counter| BattleScriptControlFamilyResolvedTarget { program_counter }),
        }
    }

    #[test]
    fn goto_evaluation_order_two_operand_resolvable_still_halts_with_real_expression() {
        let operands = [
            BattleScriptControlFamilyOperand { width_bytes: 4, expression: "SomeLabel" },
            BattleScriptControlFamilyOperand { width_bytes: 4, expression: "ExtraOperand" },
        ];
        let instruction = jump_instr(&operands, Some(200));
        let (next, outcome) = apply_battle_script_goto(&instruction, &cursor(10, &[]));
        assert_eq!(next, cursor(10, &[]));
        match outcome {
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::InvalidControlTarget { program_counter, expression },
            ) => {
                assert_eq!(program_counter, 10);
                assert_eq!(expression, "SomeLabel");
            }
            other => panic!("expected invalid-control-target halt, got {other:?}"),
        }
    }

    #[test]
    fn goto_missing_operand_halts_with_missing_sentinel() {
        let instruction = jump_instr(&[], None);
        let (next, outcome) = apply_battle_script_goto(&instruction, &cursor(5, &[]));
        assert_eq!(next, cursor(5, &[]));
        match outcome {
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::InvalidControlTarget { expression, .. },
            ) => assert_eq!(expression, "<missing>"),
            other => panic!("expected invalid-control-target halt, got {other:?}"),
        }
    }

    #[test]
    fn goto_wrong_width_operand_halts() {
        let operands =
            [BattleScriptControlFamilyOperand { width_bytes: 1, expression: "sBATTLER" }];
        let instruction = jump_instr(&operands, Some(200));
        let (_, outcome) = apply_battle_script_goto(&instruction, &cursor(5, &[]));
        assert!(matches!(
            outcome,
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::InvalidControlTarget { .. }
            )
        ));
    }

    #[test]
    fn goto_resolves_and_jumps_without_touching_call_stack() {
        let operands =
            [BattleScriptControlFamilyOperand { width_bytes: 4, expression: "SomeLabel" }];
        let instruction = jump_instr(&operands, Some(200));
        let (next, outcome) = apply_battle_script_goto(&instruction, &cursor(10, &[1, 2]));
        assert_eq!(next, cursor(200, &[1, 2]));
        assert_eq!(
            outcome,
            BattleScriptControlFamilyOutcome::Jump { program_counter: 200 }
        );
    }

    #[test]
    fn call_pushes_program_counter_plus_one_then_jumps() {
        let operands =
            [BattleScriptControlFamilyOperand { width_bytes: 4, expression: "SomeLabel" }];
        let instruction = jump_instr(&operands, Some(200));
        let (next, outcome) = apply_battle_script_call(&instruction, &cursor(10, &[]));
        assert_eq!(next, cursor(200, &[11]));
        assert_eq!(
            outcome,
            BattleScriptControlFamilyOutcome::CallEnter {
                target_program_counter: 200,
                pushed_return_program_counter: 11,
            }
        );
    }

    #[test]
    fn call_shares_the_identical_halt_ladder_with_goto() {
        let instruction = jump_instr(&[], None);
        let (_, outcome) = apply_battle_script_call(&instruction, &cursor(5, &[]));
        match outcome {
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::InvalidControlTarget { expression, .. },
            ) => assert_eq!(expression, "<missing>"),
            other => panic!("expected invalid-control-target halt, got {other:?}"),
        }
    }

    #[test]
    fn return_lifo_order_at_depth_two() {
        let (after_first, outcome_first) = apply_battle_script_return(&cursor(50, &[11, 22]));
        assert_eq!(after_first, cursor(22, &[11]));
        assert_eq!(
            outcome_first,
            BattleScriptControlFamilyOutcome::ReturnTo { program_counter: 22, popped_depth: 2 }
        );
        let (after_second, outcome_second) = apply_battle_script_return(&after_first);
        assert_eq!(after_second, cursor(11, &[]));
        assert_eq!(
            outcome_second,
            BattleScriptControlFamilyOutcome::ReturnTo { program_counter: 11, popped_depth: 1 }
        );
    }

    #[test]
    fn return_underflow_leaves_program_counter_unchanged() {
        let (next, outcome) = apply_battle_script_return(&cursor(50, &[]));
        assert_eq!(next, cursor(50, &[]));
        assert_eq!(
            outcome,
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::ReturnStackUnderflow { program_counter: 50 }
            )
        );
    }

    #[test]
    fn end3_with_nonempty_call_stack_matches_return_post_state_exactly() {
        let instruction = BattleScriptControlFamilyTerminalInstruction {
            opcode_id: BATTLE_SCRIPT_END3_OPCODE,
            opcode_name: "B_SCR_OP_END3",
        };
        let start = cursor(90, &[11, 22]);
        let (end3_next, end3_outcome) = apply_battle_script_end3(&instruction, &start);
        let (return_next, return_outcome) = apply_battle_script_return(&start);
        assert_eq!(end3_next, return_next);
        assert_eq!(end3_outcome, return_outcome);
    }

    #[test]
    fn end3_vs_terminal_reason_kinds_are_distinct() {
        let end3_instruction = BattleScriptControlFamilyTerminalInstruction {
            opcode_id: BATTLE_SCRIPT_END3_OPCODE,
            opcode_name: "B_SCR_OP_END3",
        };
        let (_, end3_outcome) = apply_battle_script_end3(&end3_instruction, &cursor(30, &[]));
        assert!(matches!(
            end3_outcome,
            BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::End3 { .. })
        ));

        let end_instruction = BattleScriptControlFamilyTerminalInstruction {
            opcode_id: BATTLE_SCRIPT_END_OPCODE,
            opcode_name: "B_SCR_OP_END",
        };
        let (_, end_outcome) = apply_battle_script_terminal(&end_instruction, &cursor(30, &[]));
        assert!(matches!(
            end_outcome,
            BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::Terminal { .. })
        ));
    }

    #[test]
    fn registration_catalog_both_directions() {
        let names = [
            BATTLE_SCRIPT_GOTO_OPCODE_NAME,
            BATTLE_SCRIPT_RETURN_OPCODE_NAME,
            BATTLE_SCRIPT_END_OPCODE_NAME,
            BATTLE_SCRIPT_END2_OPCODE_NAME,
            BATTLE_SCRIPT_END3_OPCODE_NAME,
            BATTLE_SCRIPT_CALL_OPCODE_NAME,
        ];
        let ids = [
            BATTLE_SCRIPT_GOTO_OPCODE,
            BATTLE_SCRIPT_RETURN_OPCODE,
            BATTLE_SCRIPT_END_OPCODE,
            BATTLE_SCRIPT_END2_OPCODE,
            BATTLE_SCRIPT_END3_OPCODE,
            BATTLE_SCRIPT_CALL_OPCODE,
        ];
        let all: Vec<_> = names
            .iter()
            .zip(ids.iter())
            .map(
                |(name, id)| BattleScriptControlFamilyRegistrationInstruction {
                    opcode_name: name,
                    opcode_id: *id,
                },
            )
            .collect();
        for (name, id) in names.iter().zip(ids.iter()) {
            assert_eq!(
                register_battle_script_control_opcode(&all, name).unwrap(),
                *id
            );
        }
        for name in names {
            assert_eq!(
                register_battle_script_control_opcode(&[], name)
                    .unwrap_err()
                    .to_string(),
                format!("committed Battle Script program does not emit {name}")
            );
        }
    }
}
