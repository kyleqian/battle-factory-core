//! Pure `B_SCR_OP_TRYSETHELPINGHAND` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrysethelpinghandOpcode.ts`, not a generic Battle
//! Script machine.  It keeps the canonical handler's observable ordering:
//! instruction shape, attacker role, positional-partner retarget, the four
//! source guards, and only then failure-label resolution.  Thus a failed
//! command still changes the selector target, while no branch consumes RNG,
//! emits an event, changes scheduler state, or touches presentation.
//!
//! Source authority:
//! - the dispatch entry and `Cmd_trysethelpinghand` body are
//!   `reference/pokeemerald/src/battle_script_commands.c:540,9170-9185`;
//! - the five-byte macro is `asm/macros/battle_script.inc:1071-1074`;
//! - the sole concrete call is `BattleScript_EffectHelpingHand` at
//!   `data/battle_scripts_1.s:2320-2324`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYSETHELPINGHAND` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE: u8 = 0xd1;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE_NAME: &str = "B_SCR_OP_TRYSETHELPINGHAND";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_DISPATCHER: &str = "Cmd_trysethelpinghand";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_ENCODED_WIDTH_BYTES: u8 = 5;
/// `BATTLE_TYPE_DOUBLE` from `include/constants/battle.h:59`.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE: u32 = 1 << 0;
/// Successful commands store this byte in the partner ProtectStruct field.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE: u8 = 1;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysethelpinghandBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLERS: [BattleScriptTrysethelpinghandBattler;
    BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT] = [
    BattleScriptTrysethelpinghandBattler::Battler0,
    BattleScriptTrysethelpinghandBattler::Battler1,
    BattleScriptTrysethelpinghandBattler::Battler2,
    BattleScriptTrysethelpinghandBattler::Battler3,
];

impl BattleScriptTrysethelpinghandBattler {
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

    const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }
}

/// Canonically validated `gBattlersCount` values.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysethelpinghandBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptTrysethelpinghandBattlersCount {
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn as_usize(self) -> usize {
        self as usize
    }
}

/// The minimal immutable topology used by the source positional helpers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandTopology {
    pub battlers_count: BattleScriptTrysethelpinghandBattlersCount,
    /// Full `u32 gBattleTypeFlags`, including unrelated bits.
    pub battle_type_flags: u32,
    /// `GetBattlerPosition`'s four source slots.  Only active cells constrain
    /// partner resolution; inactive cells are deliberately preserved.
    pub battler_positions: [u8; BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT],
}

/// Exact constructor failures inherited from canonical topology validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysethelpinghandTopologyError {
    DoubleFlagDoesNotMatchCount,
    ActivePositionOutOfRange { battler: usize, position: u8 },
    DuplicateActivePosition { position: u8 },
}

impl fmt::Display for BattleScriptTrysethelpinghandTopologyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::DoubleFlagDoesNotMatchCount => write!(
                formatter,
                "battleTopology BATTLE_TYPE_DOUBLE must be set if and only if battlersCount is 4"
            ),
            Self::ActivePositionOutOfRange { .. } => write!(
                formatter,
                "active battleTopology battler positions must be in range 0..3"
            ),
            Self::DuplicateActivePosition { .. } => write!(
                formatter,
                "active battleTopology battler positions must be unique"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysethelpinghandTopologyError {}

impl BattleScriptTrysethelpinghandTopology {
    /// Builds only a canonical two- or four-active-battler topology.
    pub fn new(
        battlers_count: BattleScriptTrysethelpinghandBattlersCount,
        battle_type_flags: u32,
        battler_positions: [u8; BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT],
    ) -> Result<Self, BattleScriptTrysethelpinghandTopologyError> {
        let flags_say_double =
            battle_type_flags & BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE != 0;
        if flags_say_double
            != matches!(
                battlers_count,
                BattleScriptTrysethelpinghandBattlersCount::Doubles
            )
        {
            return Err(BattleScriptTrysethelpinghandTopologyError::DoubleFlagDoesNotMatchCount);
        }
        let active = battlers_count.as_usize();
        for (battler, &position) in battler_positions[..active].iter().enumerate() {
            if position > 3 {
                return Err(
                    BattleScriptTrysethelpinghandTopologyError::ActivePositionOutOfRange {
                        battler,
                        position,
                    },
                );
            }
            if battler_positions[..battler].contains(&position) {
                return Err(
                    BattleScriptTrysethelpinghandTopologyError::DuplicateActivePosition {
                        position,
                    },
                );
            }
        }
        Ok(Self { battlers_count, battle_type_flags, battler_positions })
    }
}

/// Exact `BATTLE_PARTNER(GetBattlerPosition(attacker))` followed by source
/// `GetBattlerAtPosition`.  In singles a missing partner produces the source
/// `gBattlersCount` sentinel, which is battler id 2 and remains a valid
/// four-cell projection index.
#[must_use]
pub fn resolve_battle_script_trysethelpinghand_partner(
    topology: BattleScriptTrysethelpinghandTopology,
    attacker: BattleScriptTrysethelpinghandBattler,
) -> BattleScriptTrysethelpinghandBattler {
    let partner_position = topology.battler_positions[attacker.index()] ^ 2;
    for candidate in 0..topology.battlers_count.as_usize() {
        if topology.battler_positions[candidate] == partner_position {
            return BattleScriptTrysethelpinghandBattler::from_u8(candidate as u8)
                .expect("active source battler index must be 0..3");
        }
    }
    BattleScriptTrysethelpinghandBattler::from_u8(topology.battlers_count.as_u8())
        .expect("only the canonical singles no-partner sentinel is reachable")
}

/// Complete per-battler narrow projection. `helping_hand` intentionally keeps
/// the full `u8` byte domain: the handler's JavaScript guard is exact `!== 1`,
/// so corrupt internal values are not silently normalized to a boolean.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandBattlerState {
    pub helping_hand: u8,
    /// Unrelated source-shaped sibling used to ratchet target-only mutation.
    pub status3: u32,
    /// Additional preserved opaque source state.
    pub marker: u32,
}

/// Canonical selector bindings.  `target` is always replaced after attacker
/// validation, including every later failure branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandRoles {
    pub attacker: Option<BattleScriptTrysethelpinghandBattler>,
    pub target: Option<BattleScriptTrysethelpinghandBattler>,
    pub effect_battler: Option<BattleScriptTrysethelpinghandBattler>,
    pub fainted: Option<BattleScriptTrysethelpinghandBattler>,
}

/// Context siblings copied by the canonical object spread and untouched by
/// `Cmd_trysethelpinghand`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandContextSiblings {
    pub scripting_battler: BattleScriptTrysethelpinghandBattler,
    pub current_move: u16,
    pub hit_marker: u32,
    pub battle_communication0: u8,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandRules {
    pub battlers:
        [BattleScriptTrysethelpinghandBattlerState; BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT],
    pub battle_topology: BattleScriptTrysethelpinghandTopology,
    /// Source `gAbsentBattlerFlags`, preserving unrelated battler bits.
    pub absent_battler_flags: u8,
    pub selector_roles: BattleScriptTrysethelpinghandRoles,
    pub context_siblings: BattleScriptTrysethelpinghandContextSiblings,
}

/// Scheduler values carried solely to prove the opcode does not write them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandScheduler {
    pub message_display_active: bool,
    pub pause_counter_battle: u16,
    pub active_battler: Option<BattleScriptTrysethelpinghandBattler>,
    pub pending_controller_battlers: [Option<BattleScriptTrysethelpinghandBattler>;
        BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLER_COUNT],
    pub pending_count: u8,
}

/// Machine siblings this command preserves byte-for-byte.  It owns no RNG
/// draw, so both raw value and canonical call count remain unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandMachineSiblings {
    pub scheduler: BattleScriptTrysethelpinghandScheduler,
    pub rng_value: u32,
    pub rng_calls: u32,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrysethelpinghandOperand<'a>],
    pub resolved_failure_target: Option<BattleScriptTrysethelpinghandResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysethelpinghandControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandOutcome {
    pub rules: BattleScriptTrysethelpinghandRules,
    pub machine_siblings: BattleScriptTrysethelpinghandMachineSiblings,
    pub control: BattleScriptTrysethelpinghandControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysethelpinghandError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrysethelpinghandError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYSETHELPINGHAND requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYSETHELPINGHAND shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_trysethelpinghand: unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysethelpinghandError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTrysethelpinghandInstruction<'a>,
) -> Result<&'a str, BattleScriptTrysethelpinghandError<'a>> {
    let [failure] = instruction.operands else {
        return Err(
            BattleScriptTrysethelpinghandError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSETHELPINGHAND_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYSETHELPINGHAND_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(
            BattleScriptTrysethelpinghandError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTrysethelpinghandOpcodeHandlers`.
/// Noise instructions are ignored; selected duplicates fail before shape
/// inspection, and successful registration contains precisely one opcode key.
pub fn register_battle_script_trysethelpinghand_handler<'a>(
    instructions: &[BattleScriptTrysethelpinghandInstruction<'a>],
) -> Result<BattleScriptTrysethelpinghandRegistration, BattleScriptTrysethelpinghandError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE_NAME
        })
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSETHELPINGHAND_CONCRETE_START_COUNT {
        return Err(BattleScriptTrysethelpinghandError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTrysethelpinghandRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_trysethelpinghand`.
///
/// The selector retarget is deliberately constructed before the battle type,
/// absence, and Helping Hand guards.  On every failure the resolved pointer is
/// checked *after* retargeting; on success only the computed partner's
/// `helping_hand` byte changes.  The guard uses exact `!= 1` comparisons to
/// preserve the canonical JavaScript semantics for corrupt internal bytes.
pub fn apply_battle_script_trysethelpinghand<'a>(
    instruction: BattleScriptTrysethelpinghandInstruction<'a>,
    rules: &BattleScriptTrysethelpinghandRules,
    machine_siblings: &BattleScriptTrysethelpinghandMachineSiblings,
) -> Result<BattleScriptTrysethelpinghandOutcome, BattleScriptTrysethelpinghandError<'a>> {
    let failure_expression = validate_instruction(instruction)?;
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysethelpinghandError::MissingAttackerRole)?;
    let target = resolve_battle_script_trysethelpinghand_partner(rules.battle_topology, attacker);

    let mut retargeted_rules = *rules;
    retargeted_rules.selector_roles.target = Some(target);

    let succeeds = rules.battle_topology.battle_type_flags
        & BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE
        != 0
        && rules.absent_battler_flags & (1_u8 << target.as_u8()) == 0
        && rules.battlers[attacker.index()].helping_hand
            != BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE
        && rules.battlers[target.index()].helping_hand != BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE;

    if !succeeds {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTrysethelpinghandError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        if resolved.expression != failure_expression {
            return Err(
                BattleScriptTrysethelpinghandError::UnresolvedFailureTarget {
                    expression: failure_expression,
                },
            );
        }
        return Ok(BattleScriptTrysethelpinghandOutcome {
            rules: retargeted_rules,
            machine_siblings: *machine_siblings,
            control: BattleScriptTrysethelpinghandControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next_rules = retargeted_rules;
    next_rules.battlers[target.index()].helping_hand = BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE;
    Ok(BattleScriptTrysethelpinghandOutcome {
        rules: next_rules,
        machine_siblings: *machine_siblings,
        control: BattleScriptTrysethelpinghandControl::Advance,
    })
}

/// Independent source, macro, topology, and singleton-site facts.  These stay
/// outside generated behavior vectors so a canonical TS corpus cannot replace
/// source evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysethelpinghandSourceMetadata {
    pub opcode_enum_line: u16,
    pub dispatch_line: u16,
    pub handler_line: u16,
    pub retarget_line: u16,
    pub double_guard_line: u16,
    pub absent_guard_line: u16,
    pub attacker_guard_line: u16,
    pub partner_guard_line: u16,
    pub write_line: u16,
    pub advance_line: u16,
    pub failure_line: u16,
    pub macro_declaration_line: u16,
    pub macro_opcode_line: u16,
    pub macro_pointer_line: u16,
    pub site_label_line: u16,
    pub site_statement_line: u16,
    pub site_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSETHELPINGHAND_SOURCE_METADATA:
    BattleScriptTrysethelpinghandSourceMetadata = BattleScriptTrysethelpinghandSourceMetadata {
    opcode_enum_line: 215,
    dispatch_line: 540,
    handler_line: 9170,
    retarget_line: 9172,
    double_guard_line: 9174,
    absent_guard_line: 9175,
    attacker_guard_line: 9176,
    partner_guard_line: 9177,
    write_line: 9179,
    advance_line: 9180,
    failure_line: 9184,
    macro_declaration_line: 1071,
    macro_opcode_line: 1072,
    macro_pointer_line: 1073,
    site_label_line: 2320,
    site_statement_line: 2324,
    site_program_counter: 1641,
};

#[cfg(test)]
mod tests {
    use super::*;

    const OPERAND: BattleScriptTrysethelpinghandOperand<'static> =
        BattleScriptTrysethelpinghandOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        };
    const OPERANDS: [BattleScriptTrysethelpinghandOperand<'static>; 1] = [OPERAND];

    fn topology() -> BattleScriptTrysethelpinghandTopology {
        BattleScriptTrysethelpinghandTopology::new(
            BattleScriptTrysethelpinghandBattlersCount::Doubles,
            BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE | (1 << 19),
            [1, 3, 0, 2],
        )
        .expect("valid doubles topology")
    }

    fn rules(
        attacker: Option<BattleScriptTrysethelpinghandBattler>,
    ) -> BattleScriptTrysethelpinghandRules {
        BattleScriptTrysethelpinghandRules {
            battlers: [
                BattleScriptTrysethelpinghandBattlerState {
                    helping_hand: 0,
                    status3: 1,
                    marker: 10,
                },
                BattleScriptTrysethelpinghandBattlerState {
                    helping_hand: 2,
                    status3: 2,
                    marker: 11,
                },
                BattleScriptTrysethelpinghandBattlerState {
                    helping_hand: 0xff,
                    status3: 3,
                    marker: 12,
                },
                BattleScriptTrysethelpinghandBattlerState {
                    helping_hand: 0,
                    status3: 4,
                    marker: 13,
                },
            ],
            battle_topology: topology(),
            absent_battler_flags: 0,
            selector_roles: BattleScriptTrysethelpinghandRoles {
                attacker,
                target: Some(BattleScriptTrysethelpinghandBattler::Battler1),
                effect_battler: Some(BattleScriptTrysethelpinghandBattler::Battler3),
                fainted: Some(BattleScriptTrysethelpinghandBattler::Battler0),
            },
            context_siblings: BattleScriptTrysethelpinghandContextSiblings {
                scripting_battler: BattleScriptTrysethelpinghandBattler::Battler2,
                current_move: 270,
                hit_marker: 0x8000_0101,
                battle_communication0: 0xf0,
            },
        }
    }

    fn machine() -> BattleScriptTrysethelpinghandMachineSiblings {
        BattleScriptTrysethelpinghandMachineSiblings {
            scheduler: BattleScriptTrysethelpinghandScheduler {
                message_display_active: true,
                pause_counter_battle: 99,
                active_battler: Some(BattleScriptTrysethelpinghandBattler::Battler2),
                pending_controller_battlers: [
                    Some(BattleScriptTrysethelpinghandBattler::Battler3),
                    None,
                    Some(BattleScriptTrysethelpinghandBattler::Battler0),
                    None,
                ],
                pending_count: 2,
            },
            rng_value: 0x1234_5678,
            rng_calls: 9,
        }
    }

    fn instruction() -> BattleScriptTrysethelpinghandInstruction<'static> {
        BattleScriptTrysethelpinghandInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE_NAME,
            program_counter: 1641,
            opcode_id: BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSETHELPINGHAND_DISPATCHER,
            operands: &OPERANDS,
            resolved_failure_target: Some(BattleScriptTrysethelpinghandResolvedLabel {
                expression: "BattleScript_ButItFailed",
                program_counter: 1434,
            }),
        }
    }

    #[test]
    fn positional_partner_retarget_precedes_guards_and_corrupt_bytes_are_not_booleanized() {
        let input = rules(Some(BattleScriptTrysethelpinghandBattler::Battler0));
        let machine_input = machine();
        // Positions [1,3,0,2] make battler 0's same-side partner battler 1.
        let outcome = apply_battle_script_trysethelpinghand(instruction(), &input, &machine_input)
            .expect("non-one corrupted partner byte remains eligible");
        assert_eq!(
            outcome.control,
            BattleScriptTrysethelpinghandControl::Advance
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptTrysethelpinghandBattler::Battler1)
        );
        assert_eq!(outcome.rules.battlers[1].helping_hand, 1);
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[2], input.battlers[2]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(
            outcome.rules.selector_roles.effect_battler,
            input.selector_roles.effect_battler
        );
        assert_eq!(
            outcome.rules.selector_roles.fainted,
            input.selector_roles.fainted
        );
        assert_eq!(outcome.rules.context_siblings, input.context_siblings);
        assert_eq!(outcome.machine_siblings, machine_input);
    }

    #[test]
    fn malformed_instruction_precedes_missing_attacker_and_failure_label_is_late() {
        let missing = rules(None);
        let malformed =
            BattleScriptTrysethelpinghandInstruction { opcode_id: 0xd0, ..instruction() };
        assert_eq!(
            apply_battle_script_trysethelpinghand(malformed, &missing, &machine())
                .expect_err("shape precedes attacker")
                .to_string(),
            "invalid B_SCR_OP_TRYSETHELPINGHAND shape at program counter 1641"
        );
        assert_eq!(
            apply_battle_script_trysethelpinghand(instruction(), &missing, &machine())
                .expect_err("attacker role precedes partner and label")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut blocked = rules(Some(BattleScriptTrysethelpinghandBattler::Battler0));
        blocked.absent_battler_flags = 1 << 1;
        let outcome = apply_battle_script_trysethelpinghand(instruction(), &blocked, &machine())
            .expect("valid late failure pointer");
        assert_eq!(
            outcome.control,
            BattleScriptTrysethelpinghandControl::Jump { program_counter: 1434 }
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptTrysethelpinghandBattler::Battler1)
        );
        assert_eq!(outcome.machine_siblings, machine());
    }
}
