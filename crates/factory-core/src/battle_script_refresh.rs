//! Pure `B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED` registration and
//! state/controller projection.
//!
//! This is the narrow native twin of
//! `src/engine/battleScriptRefreshOpcode.ts`.  The command validates its exact
//! one-pointer instruction before requiring the attacker role.  A status word
//! containing poison, burn, paralysis, or toxic poison clears both the active
//! battler and its side/party-index record, appends that battler to the unique
//! pending-controller list, emits one status-data event, and advances.  The
//! failure pointer is resolved only when none of those four bits is present.
//!
//! Source authority is `Cmd_cureifburnedparalyzedorpoisoned` at
//! `reference/pokeemerald/src/battle_script_commands.c:9119-9133`, its `0xCD`
//! dispatch at `:536`, the five-byte macro at
//! `reference/pokeemerald/asm/macros/battle_script.inc:1051-1054`, and the
//! sole Refresh program site at
//! `reference/pokeemerald/data/battle_scripts_1.s:2520-2530`.

use core::fmt;

pub const BATTLE_SCRIPT_REFRESH_OPCODE_NAME: &str = "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED";
pub const BATTLE_SCRIPT_REFRESH_OPCODE: u8 = 0xcd;
pub const BATTLE_SCRIPT_REFRESH_DISPATCHER: &str = "Cmd_cureifburnedparalyzedorpoisoned";
pub const BATTLE_SCRIPT_REFRESH_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_REFRESH_ENCODED_WIDTH_BYTES: u8 = 5;
pub const BATTLE_SCRIPT_REFRESH_CONCRETE_START_COUNT: usize = 1;
pub const BATTLE_SCRIPT_REFRESH_FAILURE_LABEL: &str = "BattleScript_ButItFailed";
pub const BATTLE_SCRIPT_REFRESH_PARTY_SIZE: usize = 6;
pub const BATTLE_SCRIPT_REFRESH_BATTLER_COUNT: usize = 4;

pub const BATTLE_SCRIPT_STATUS1_SLEEP: u32 = 0x0000_0007;
pub const BATTLE_SCRIPT_STATUS1_POISON: u32 = 0x0000_0008;
pub const BATTLE_SCRIPT_STATUS1_BURN: u32 = 0x0000_0010;
pub const BATTLE_SCRIPT_STATUS1_FREEZE: u32 = 0x0000_0020;
pub const BATTLE_SCRIPT_STATUS1_PARALYSIS: u32 = 0x0000_0040;
pub const BATTLE_SCRIPT_STATUS1_TOXIC_POISON: u32 = 0x0000_0080;
pub const BATTLE_SCRIPT_REFRESH_CURE_MASK: u32 = BATTLE_SCRIPT_STATUS1_POISON
    | BATTLE_SCRIPT_STATUS1_BURN
    | BATTLE_SCRIPT_STATUS1_PARALYSIS
    | BATTLE_SCRIPT_STATUS1_TOXIC_POISON;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptRefreshBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

pub const BATTLE_SCRIPT_REFRESH_BATTLERS: [BattleScriptRefreshBattler;
    BATTLE_SCRIPT_REFRESH_BATTLER_COUNT] = [
    BattleScriptRefreshBattler::Battler0,
    BattleScriptRefreshBattler::Battler1,
    BattleScriptRefreshBattler::Battler2,
    BattleScriptRefreshBattler::Battler3,
];

impl BattleScriptRefreshBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptRefreshSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptRefreshSide {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshBattlerState {
    pub side: BattleScriptRefreshSide,
    pub party_index: u8,
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub hp: u16,
    pub item: u16,
    pub ability: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshPartyMember {
    pub status1: u32,
    pub hp: u16,
    pub species: u16,
    pub item: u16,
    pub personality: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshRoles {
    pub attacker: Option<BattleScriptRefreshBattler>,
    pub target: Option<BattleScriptRefreshBattler>,
    pub effect_battler: Option<BattleScriptRefreshBattler>,
    pub fainted: Option<BattleScriptRefreshBattler>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshContextState {
    pub scripting_battler: BattleScriptRefreshBattler,
    pub current_move: u16,
    pub current_move_position: u8,
    pub move_result_flags: u8,
    pub battle_move_damage: i32,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
    pub battle_outcome: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshRules {
    pub battlers: [BattleScriptRefreshBattlerState; BATTLE_SCRIPT_REFRESH_BATTLER_COUNT],
    pub party: [[BattleScriptRefreshPartyMember; BATTLE_SCRIPT_REFRESH_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptRefreshRoles,
    pub context_state: BattleScriptRefreshContextState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshScheduler {
    pub message_display_active: bool,
    pub pause_counter_battle: u16,
    pub active_battler: Option<BattleScriptRefreshBattler>,
    pub pending_controller_battlers:
        [Option<BattleScriptRefreshBattler>; BATTLE_SCRIPT_REFRESH_BATTLER_COUNT],
    pub pending_count: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshMachineSiblings {
    pub scheduler: BattleScriptRefreshScheduler,
    pub rng_value: u32,
    pub rng_calls: u32,
    pub event_history: [u32; 3],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptRefreshOperand<'a>],
    pub resolved_failure_target: Option<&'a str>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRefreshControl {
    Advance,
    FailJump,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRefreshEvent {
    SetBattlerStatusData {
        battler: BattleScriptRefreshBattler,
        status1: u32,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshOutcome {
    pub rules: BattleScriptRefreshRules,
    pub machine_siblings: BattleScriptRefreshMachineSiblings,
    pub control: BattleScriptRefreshControl,
    pub emitted_event: Option<BattleScriptRefreshEvent>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRefreshError<'a> {
    WrongCardinality {
        count: usize,
    },
    InvalidInstructionShape {
        program_counter: u32,
    },
    MissingAttackerRole,
    InvalidPartyIndex {
        side: BattleScriptRefreshSide,
        party_index: u8,
    },
    UnresolvedFailureTarget {
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptRefreshError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => {
                write!(formatter, "Battle Script hit-chain command requires a attacker role")
            }
            Self::InvalidPartyIndex { side, party_index } => write!(
                formatter,
                "Cmd_cureifburnedparalyzedorpoisoned: invalid {:?} party index {party_index}",
                side
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_cureifburnedparalyzedorpoisoned: unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRefreshError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptRefreshInstruction<'a>,
) -> Result<&'a str, BattleScriptRefreshError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptRefreshError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_REFRESH_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_REFRESH_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_REFRESH_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptRefreshError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

pub fn register_battle_script_refresh_handler<'a>(
    instructions: &[BattleScriptRefreshInstruction<'a>],
) -> Result<BattleScriptRefreshRegistration, BattleScriptRefreshError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_REFRESH_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_REFRESH_CONCRETE_START_COUNT {
        return Err(BattleScriptRefreshError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptRefreshRegistration { opcode_id: matching[0].opcode_id })
}

pub fn apply_battle_script_refresh<'a>(
    instruction: BattleScriptRefreshInstruction<'a>,
    rules: &BattleScriptRefreshRules,
    machine_siblings: &BattleScriptRefreshMachineSiblings,
) -> Result<BattleScriptRefreshOutcome, BattleScriptRefreshError<'a>> {
    let failure_expression = validate_instruction(instruction)?;
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptRefreshError::MissingAttackerRole)?;
    let attacker_state = rules.battlers[attacker.index()];
    if attacker_state.status1 & BATTLE_SCRIPT_REFRESH_CURE_MASK == 0 {
        if instruction.resolved_failure_target != Some(failure_expression) {
            return Err(BattleScriptRefreshError::UnresolvedFailureTarget {
                expression: failure_expression,
            });
        }
        return Ok(BattleScriptRefreshOutcome {
            rules: *rules,
            machine_siblings: *machine_siblings,
            control: BattleScriptRefreshControl::FailJump,
            emitted_event: None,
        });
    }

    let party_index = usize::from(attacker_state.party_index);
    if party_index >= BATTLE_SCRIPT_REFRESH_PARTY_SIZE {
        return Err(BattleScriptRefreshError::InvalidPartyIndex {
            side: attacker_state.side,
            party_index: attacker_state.party_index,
        });
    }
    let mut next_rules = *rules;
    next_rules.battlers[attacker.index()].status1 = 0;
    next_rules.party[attacker_state.side.index()][party_index].status1 = 0;

    let mut next_machine = *machine_siblings;
    let pending_count = usize::from(next_machine.scheduler.pending_count);
    let already_pending = next_machine.scheduler.pending_controller_battlers[..pending_count]
        .contains(&Some(attacker));
    if !already_pending {
        debug_assert!(pending_count < BATTLE_SCRIPT_REFRESH_BATTLER_COUNT);
        next_machine.scheduler.pending_controller_battlers[pending_count] = Some(attacker);
        next_machine.scheduler.pending_count += 1;
    }

    Ok(BattleScriptRefreshOutcome {
        rules: next_rules,
        machine_siblings: next_machine,
        control: BattleScriptRefreshControl::Advance,
        emitted_event: Some(BattleScriptRefreshEvent::SetBattlerStatusData {
            battler: attacker,
            status1: 0,
        }),
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRefreshSourceMetadata {
    pub dispatch_line: u16,
    pub handler_line: u16,
    pub predicate_line: u16,
    pub clear_line: u16,
    pub advance_line: u16,
    pub active_battler_line: u16,
    pub emit_line: u16,
    pub mark_pending_line: u16,
    pub failure_line: u16,
    pub macro_declaration_line: u16,
    pub macro_opcode_line: u16,
    pub macro_pointer_line: u16,
    pub site_label_line: u16,
    pub site_statement_line: u16,
    pub site_program_counter: u32,
}

pub const BATTLE_SCRIPT_REFRESH_SOURCE_METADATA: BattleScriptRefreshSourceMetadata =
    BattleScriptRefreshSourceMetadata {
        dispatch_line: 536,
        handler_line: 9119,
        predicate_line: 9121,
        clear_line: 9123,
        advance_line: 9124,
        active_battler_line: 9125,
        emit_line: 9126,
        mark_pending_line: 9127,
        failure_line: 9131,
        macro_declaration_line: 1051,
        macro_opcode_line: 1052,
        macro_pointer_line: 1053,
        site_label_line: 2520,
        site_statement_line: 2524,
        site_program_counter: 1803,
    };
