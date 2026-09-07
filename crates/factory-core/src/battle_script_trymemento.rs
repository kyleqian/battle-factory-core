//! Pure `B_SCR_OP_TRYMEMENTO` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrymementoOpcode.ts`, not a generic Battle Script
//! machine. Memento fails only when the target's Attack and Sp. Attack are
//! both already at the minimum stage and the move was not stopped by
//! Protect; a failed command jumps through the operand's late-resolved
//! pointer with the rules and scheduler unchanged. Otherwise the attacker's
//! current HP is copied into `battleMoveDamage`, the attacker is appended to
//! the unique pending-controller list, and one health-bar-update event is
//! emitted. No branch consumes RNG, and the target's stat stages are not
//! modified here -- the script's later opcodes do that.
//!
//! Source authority:
//! - `Cmd_trymemento` is `reference/pokeemerald/src/battle_script_commands.c:9072-9091`;
//!   dispatch `:532` (`//0xC9`), forward declaration `:280`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1034-1037`.
//! - The exactly two concrete call sites are `data/battle_scripts_1.s:2209`
//!   (`trymemento BattleScript_ButItFailed`, inside
//!   `BattleScript_EffectMemento`) and `:2242`
//!   (`trymemento BattleScript_MementoTargetProtectEnd`, inside
//!   `BattleScript_MementoTargetProtect`).
//! - `INSTANT_HP_BAR_DROP` is `include/battle_controllers.h:149`;
//!   `B_MSG_PROTECTED` is `include/constants/battle_string_ids.h:410`;
//!   `STAT_ATK`, `STAT_SPATK`, and `MIN_STAT_STAGE` are
//!   `include/constants/pokemon.h:76,79,89`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYMEMENTO_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYMEMENTO` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYMEMENTO_OPCODE: u8 = 0xc9;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME: &str = "B_SCR_OP_TRYMEMENTO";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER: &str = "Cmd_trymemento";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYMEMENTO_CONCRETE_START_COUNT: usize = 2;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYMEMENTO_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYMEMENTO_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/pokemon.h:76` -- `STAT_ATK`, indexing `statStages`.
pub const BATTLE_SCRIPT_TRYMEMENTO_STAT_ATK: usize = 1;
/// `include/constants/pokemon.h:79` -- `STAT_SPATK`, indexing `statStages`.
pub const BATTLE_SCRIPT_TRYMEMENTO_STAT_SPATK: usize = 4;
/// `include/constants/pokemon.h:89` -- `MIN_STAT_STAGE`.
pub const BATTLE_SCRIPT_TRYMEMENTO_MIN_STAT_STAGE: u8 = 0;
/// `include/constants/battle_string_ids.h:410` -- `B_MSG_PROTECTED`.
pub const BATTLE_SCRIPT_TRYMEMENTO_B_MSG_PROTECTED: u8 = 1;
/// `include/battle_controllers.h:149` -- `INSTANT_HP_BAR_DROP`.
pub const BATTLE_SCRIPT_TRYMEMENTO_INSTANT_HP_BAR_DROP: u16 = 0x7fff;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrymementoBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYMEMENTO_BATTLERS: [BattleScriptTrymementoBattler;
    BATTLE_SCRIPT_TRYMEMENTO_BATTLER_COUNT] = [
    BattleScriptTrymementoBattler::Battler0,
    BattleScriptTrymementoBattler::Battler1,
    BattleScriptTrymementoBattler::Battler2,
    BattleScriptTrymementoBattler::Battler3,
];

impl BattleScriptTrymementoBattler {
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
/// `ability` and `marker` are salted noise siblings this command never reads
/// or writes; only `hp` (read on the attacker) and `stat_stages` (read on the
/// target, offensive slots only) participate in canonical evaluation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoBattlerState {
    pub hp: u16,
    pub stat_stages: [u8; 8],
    pub ability: u8,
    pub marker: u32,
}

/// Canonical selector bindings. Only `attacker` and `target` are ever read,
/// in that order; `effect_battler` and `fainted` are preserved siblings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoRoles {
    pub attacker: Option<BattleScriptTrymementoBattler>,
    pub target: Option<BattleScriptTrymementoBattler>,
    pub effect_battler: Option<BattleScriptTrymementoBattler>,
    pub fainted: Option<BattleScriptTrymementoBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoRules {
    pub battlers: [BattleScriptTrymementoBattlerState; BATTLE_SCRIPT_TRYMEMENTO_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrymementoRoles,
    pub miss_type: u8,
    pub battle_move_damage: i32,
}

/// Scheduler projection carrying only the unique pending-controller list this
/// command appends to on success. Shape copied from `battle_script_refresh`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptTrymementoBattler>; BATTLE_SCRIPT_TRYMEMENTO_BATTLER_COUNT],
    pub pending_count: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrymementoOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, exactly like the canonical TypeScript
    /// handler's own `resolveBattleScriptLabel` call, invoked lazily only on
    /// the failure branch.
    pub resolved_failure_target: Option<BattleScriptTrymementoResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrymementoControl {
    Advance,
    Jump { program_counter: u32 },
}

/// The sole event this command ever emits, on the success branch only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrymementoEvent {
    HealthBarUpdate {
        battler: BattleScriptTrymementoBattler,
        health_value: u16,
    },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoOutcome {
    pub rules: BattleScriptTrymementoRules,
    pub scheduler: BattleScriptTrymementoScheduler,
    pub control: BattleScriptTrymementoControl,
    pub emitted_event: Option<BattleScriptTrymementoEvent>,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrymementoError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrymementoError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYMEMENTO requires exactly 2 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYMEMENTO shape at program counter {program_counter}"
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
                "Cmd_trymemento: unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrymementoError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTrymementoInstruction<'a>,
) -> Result<&'a str, BattleScriptTrymementoError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTrymementoError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYMEMENTO_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYMEMENTO_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTrymementoError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTrymementoOpcodeHandlers`. Noise
/// instructions are ignored; wrong cardinality fails before shape inspection;
/// every matching instruction is then validated in program order, returning
/// the first offender; successful registration contains precisely one opcode
/// key taken from the first matching instruction.
pub fn register_battle_script_trymemento_handler<'a>(
    instructions: &[BattleScriptTrymementoInstruction<'a>],
) -> Result<BattleScriptTrymementoRegistration, BattleScriptTrymementoError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYMEMENTO_CONCRETE_START_COUNT {
        return Err(BattleScriptTrymementoError::WrongCardinality { count: matching.len() });
    }
    for instruction in &matching {
        validate_instruction(**instruction)?;
    }
    Ok(BattleScriptTrymementoRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_trymemento`.
///
/// Evaluation order matches the canonical handler exactly: shape validation,
/// then the attacker role, then the target role, then the three-conjunct
/// fail predicate on the target's offensive stat stages and Protect status.
/// On failure the pointer operand is resolved lazily -- only on this branch
/// -- and the rules and scheduler are returned unchanged. On success only
/// `battleMoveDamage` and the pending-controller list change, and exactly
/// one health-bar-update event is emitted; the target's stat stages are
/// deliberately left untouched, matching the later script opcodes owning
/// that mutation.
pub fn apply_battle_script_trymemento<'a>(
    instruction: BattleScriptTrymementoInstruction<'a>,
    rules: &BattleScriptTrymementoRules,
    scheduler: &BattleScriptTrymementoScheduler,
) -> Result<BattleScriptTrymementoOutcome, BattleScriptTrymementoError<'a>> {
    let failure_expression = validate_instruction(instruction)?;

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrymementoError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrymementoError::MissingTargetRole)?;

    let target_state = rules.battlers[target.index()];
    let fails = target_state.stat_stages[BATTLE_SCRIPT_TRYMEMENTO_STAT_ATK]
        == BATTLE_SCRIPT_TRYMEMENTO_MIN_STAT_STAGE
        && target_state.stat_stages[BATTLE_SCRIPT_TRYMEMENTO_STAT_SPATK]
            == BATTLE_SCRIPT_TRYMEMENTO_MIN_STAT_STAGE
        && rules.miss_type != BATTLE_SCRIPT_TRYMEMENTO_B_MSG_PROTECTED;

    if fails {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTrymementoError::UnresolvedFailureTarget { expression: failure_expression },
        )?;
        return Ok(BattleScriptTrymementoOutcome {
            rules: *rules,
            scheduler: *scheduler,
            control: BattleScriptTrymementoControl::Jump {
                program_counter: resolved.program_counter,
            },
            emitted_event: None,
        });
    }

    let mut next_rules = *rules;
    next_rules.battle_move_damage = i32::from(rules.battlers[attacker.index()].hp);

    let mut next_scheduler = *scheduler;
    let pending_count = usize::from(next_scheduler.pending_count);
    let already_pending =
        next_scheduler.pending_controller_battlers[..pending_count].contains(&Some(attacker));
    if !already_pending {
        debug_assert!(pending_count < BATTLE_SCRIPT_TRYMEMENTO_BATTLER_COUNT);
        next_scheduler.pending_controller_battlers[pending_count] = Some(attacker);
        next_scheduler.pending_count += 1;
    }

    Ok(BattleScriptTrymementoOutcome {
        rules: next_rules,
        scheduler: next_scheduler,
        control: BattleScriptTrymementoControl::Advance,
        emitted_event: Some(BattleScriptTrymementoEvent::HealthBarUpdate {
            battler: attacker,
            health_value: BATTLE_SCRIPT_TRYMEMENTO_INSTANT_HP_BAR_DROP,
        }),
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub condition_line_1: u32,
    pub condition_line_2: u32,
    pub condition_line_3: u32,
    pub jump_line: u32,
    pub active_battler_line: u32,
    pub damage_line: u32,
    pub emit_line: u32,
    pub mark_pending_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_TRYMEMENTO_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTrymementoDecompDispatchEvidence = BattleScriptTrymementoDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_TRYMEMENTO_OPCODE,
    dispatcher: BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER,
    dispatch_line: 532,
    forward_decl_line: 280,
    handler_line: 9072,
    condition_line_1: 9074,
    condition_line_2: 9075,
    condition_line_3: 9076,
    jump_line: 9079,
    active_battler_line: 9084,
    damage_line: 9085,
    emit_line: 9086,
    mark_pending_line: 9087,
    advance_line: 9088,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYMEMENTO_MACRO_EVIDENCE: BattleScriptTrymementoMacroEvidence =
    BattleScriptTrymementoMacroEvidence {
        declaration_line: 1034,
        opcode_line: 1035,
        pointer_line: 1036,
        encoded_width_bytes: BATTLE_SCRIPT_TRYMEMENTO_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrymementoCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYMEMENTO_CALL_SITE_EVIDENCE: [BattleScriptTrymementoCallSiteEvidence; 2] = [
    BattleScriptTrymementoCallSiteEvidence {
        entry_label: "BattleScript_EffectMemento",
        entry_label_line: 2204,
        statement_line: 2209,
        instruction_program_counter: 1553,
        failure_target_expression: "BattleScript_ButItFailed",
        failure_target_program_counter: 1434,
    },
    BattleScriptTrymementoCallSiteEvidence {
        entry_label: "BattleScript_MementoTargetProtect",
        entry_label_line: 2239,
        statement_line: 2242,
        instruction_program_counter: 1579,
        failure_target_expression: "BattleScript_MementoTargetProtectEnd",
        failure_target_program_counter: 1580,
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    const FAILED_OPERAND: [BattleScriptTrymementoOperand<'static>; 1] = [
        BattleScriptTrymementoOperand { width_bytes: 4, expression: "BattleScript_ButItFailed" },
    ];
    const PROTECT_END_OPERAND: [BattleScriptTrymementoOperand<'static>; 1] =
        [BattleScriptTrymementoOperand {
            width_bytes: 4,
            expression: "BattleScript_MementoTargetProtectEnd",
        }];

    fn plain_battler(hp: u16, stat_stages: [u8; 8]) -> BattleScriptTrymementoBattlerState {
        BattleScriptTrymementoBattlerState { hp, stat_stages, ability: 7, marker: 0xabcd }
    }

    fn rules(
        attacker_hp: u16,
        target_stat_stages: [u8; 8],
        miss_type: u8,
        attacker: Option<BattleScriptTrymementoBattler>,
        target: Option<BattleScriptTrymementoBattler>,
    ) -> BattleScriptTrymementoRules {
        BattleScriptTrymementoRules {
            battlers: [
                plain_battler(attacker_hp, [6, 6, 6, 6, 6, 6, 6, 6]),
                plain_battler(50, target_stat_stages),
                plain_battler(0, [6, 6, 6, 6, 6, 6, 6, 6]),
                plain_battler(0, [6, 6, 6, 6, 6, 6, 6, 6]),
            ],
            selector_roles: BattleScriptTrymementoRoles {
                attacker,
                target,
                effect_battler: Some(BattleScriptTrymementoBattler::Battler1),
                fainted: None,
            },
            miss_type,
            battle_move_damage: -1,
        }
    }

    fn scheduler(pending: &[BattleScriptTrymementoBattler]) -> BattleScriptTrymementoScheduler {
        let mut cells = [None; 4];
        for (index, battler) in pending.iter().enumerate() {
            cells[index] = Some(*battler);
        }
        BattleScriptTrymementoScheduler {
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    fn instruction<'a>(
        operands: &'a [BattleScriptTrymementoOperand<'a>],
        resolved_failure_target: Option<BattleScriptTrymementoResolvedLabel<'a>>,
    ) -> BattleScriptTrymementoInstruction<'a> {
        BattleScriptTrymementoInstruction {
            opcode_name: BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME,
            program_counter: 1553,
            opcode_id: BATTLE_SCRIPT_TRYMEMENTO_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER,
            operands,
            resolved_failure_target,
        }
    }

    const RESOLVED: BattleScriptTrymementoResolvedLabel<'static> =
        BattleScriptTrymementoResolvedLabel {
            expression: "BattleScript_ButItFailed",
            program_counter: 1434,
        };

    #[test]
    fn fail_gate_needs_all_three_conjuncts() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTrymementoBattler::Battler0);
        let target = Some(BattleScriptTrymementoBattler::Battler1);

        // Both stages minimum, not protected: fails.
        let both_min = rules(100, [6, 0, 6, 6, 0, 6, 6, 6], 0, attacker, target);
        assert_eq!(
            apply_battle_script_trymemento(instr, &both_min, &scheduler(&[]))
                .expect("both minimum fails")
                .control,
            BattleScriptTrymementoControl::Jump { program_counter: 1434 }
        );

        // Only ATK minimum: succeeds.
        let only_atk = rules(100, [6, 0, 6, 6, 1, 6, 6, 6], 0, attacker, target);
        assert_eq!(
            apply_battle_script_trymemento(instr, &only_atk, &scheduler(&[]))
                .expect("only atk minimum succeeds")
                .control,
            BattleScriptTrymementoControl::Advance
        );

        // Only SPATK minimum: succeeds.
        let only_spatk = rules(100, [6, 1, 6, 6, 0, 6, 6, 6], 0, attacker, target);
        assert_eq!(
            apply_battle_script_trymemento(instr, &only_spatk, &scheduler(&[]))
                .expect("only spatk minimum succeeds")
                .control,
            BattleScriptTrymementoControl::Advance
        );
    }

    #[test]
    fn protect_bypasses_the_minimized_stats_failure_gate() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTrymementoBattler::Battler0);
        let target = Some(BattleScriptTrymementoBattler::Battler1);
        let both_min_protected = rules(100, [6, 0, 6, 6, 0, 6, 6, 6], 1, attacker, target);
        let outcome = apply_battle_script_trymemento(instr, &both_min_protected, &scheduler(&[]))
            .expect("protect bypasses fail gate");
        assert_eq!(outcome.control, BattleScriptTrymementoControl::Advance);
        assert_eq!(
            outcome.rules.battlers[1].stat_stages,
            [6, 0, 6, 6, 0, 6, 6, 6]
        );
    }

    #[test]
    fn success_sets_damage_to_attacker_hp_and_appends_pending_once() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTrymementoBattler::Battler0);
        let target = Some(BattleScriptTrymementoBattler::Battler1);
        let input = rules(140, [6, 6, 6, 6, 6, 6, 6, 6], 0, attacker, target);

        let outcome =
            apply_battle_script_trymemento(instr, &input, &scheduler(&[])).expect("clean success");
        assert_eq!(outcome.rules.battle_move_damage, 140);
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[0],
            Some(BattleScriptTrymementoBattler::Battler0)
        );
        assert_eq!(outcome.scheduler.pending_count, 1);
        assert_eq!(
            outcome.emitted_event,
            Some(BattleScriptTrymementoEvent::HealthBarUpdate {
                battler: BattleScriptTrymementoBattler::Battler0,
                health_value: 0x7fff,
            })
        );

        // Already-pending attacker is not appended twice.
        let already = scheduler(&[BattleScriptTrymementoBattler::Battler0]);
        let idempotent =
            apply_battle_script_trymemento(instr, &input, &already).expect("idempotent success");
        assert_eq!(idempotent.scheduler, already);
    }

    #[test]
    fn lazy_label_resolution_only_matters_on_the_fail_branch() {
        let operands = &FAILED_OPERAND;
        let unresolved_instr = instruction(operands, None);
        let attacker = Some(BattleScriptTrymementoBattler::Battler0);
        let target = Some(BattleScriptTrymementoBattler::Battler1);

        // Success ignores the unresolved label entirely.
        let success = rules(50, [6, 6, 6, 6, 6, 6, 6, 6], 0, attacker, target);
        assert!(
            apply_battle_script_trymemento(unresolved_instr, &success, &scheduler(&[])).is_ok()
        );

        // Failure needs the resolved label.
        let failure = rules(50, [6, 0, 6, 6, 0, 6, 6, 6], 0, attacker, target);
        assert_eq!(
            apply_battle_script_trymemento(unresolved_instr, &failure, &scheduler(&[]))
                .expect_err("unresolved failure target")
                .to_string(),
            "Cmd_trymemento: unresolved failure target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn malformed_instruction_precedes_missing_roles() {
        let bad_opcode = instruction(&FAILED_OPERAND, Some(RESOLVED));
        let bad_opcode = BattleScriptTrymementoInstruction { opcode_id: 0xd0, ..bad_opcode };
        let missing = rules(50, [6, 6, 6, 6, 6, 6, 6, 6], 0, None, None);
        assert_eq!(
            apply_battle_script_trymemento(bad_opcode, &missing, &scheduler(&[]))
                .expect_err("shape precedes roles")
                .to_string(),
            "invalid B_SCR_OP_TRYMEMENTO shape at program counter 1553"
        );

        let good = instruction(&FAILED_OPERAND, Some(RESOLVED));
        assert_eq!(
            apply_battle_script_trymemento(good, &missing, &scheduler(&[]))
                .expect_err("attacker role required first")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let missing_target = rules(
            50,
            [6, 6, 6, 6, 6, 6, 6, 6],
            0,
            Some(BattleScriptTrymementoBattler::Battler0),
            None,
        );
        assert_eq!(
            apply_battle_script_trymemento(good, &missing_target, &scheduler(&[]))
                .expect_err("target role required second")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn registration_accepts_two_starts_and_rejects_wrong_cardinality_and_shape() {
        let a = instruction(&FAILED_OPERAND, Some(RESOLVED));
        let b = BattleScriptTrymementoInstruction {
            program_counter: 1579,
            ..instruction(&PROTECT_END_OPERAND, None)
        };
        assert_eq!(
            register_battle_script_trymemento_handler(&[a, b])
                .expect("two starts register")
                .opcode_id,
            BATTLE_SCRIPT_TRYMEMENTO_OPCODE
        );
        assert_eq!(
            register_battle_script_trymemento_handler(&[a])
                .expect_err("one start")
                .to_string(),
            "B_SCR_OP_TRYMEMENTO requires exactly 2 concrete starts, got 1"
        );
        assert_eq!(
            register_battle_script_trymemento_handler(&[a, a, a])
                .expect_err("three starts")
                .to_string(),
            "B_SCR_OP_TRYMEMENTO requires exactly 2 concrete starts, got 3"
        );
        let bad_second = BattleScriptTrymementoInstruction { opcode_id: 0xca, ..b };
        assert_eq!(
            register_battle_script_trymemento_handler(&[a, bad_second])
                .expect_err("second offender reported")
                .to_string(),
            "invalid B_SCR_OP_TRYMEMENTO shape at program counter 1579"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYMEMENTO_BATTLERS {
            assert_eq!(
                BattleScriptTrymementoBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTrymementoBattler::from_u8(4), None);
    }
}
