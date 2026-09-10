//! Pure `B_SCR_OP_CLEARSTATUSFROMEFFECT` (0x18, `Cmd_clearstatusfromeffect`),
//! `B_SCR_OP_SETSEMIINVULNERABLEBIT` (0xC5, `Cmd_setsemiinvulnerablebit`),
//! `B_SCR_OP_CLEARSEMIINVULNERABLEBIT` (0xC6, `Cmd_clearsemiinvulnerablebit`)
//! -- the native twin of the whole
//! `src/engine/battleScriptSemiInvulnerableOpcode.ts` (206 lines). No RNG, no
//! labels, no jumps: every outcome is either an advance or a first-class
//! `Halt`/typed role error.
//!
//! `clearstatusfromeffect` resolves a `GetBattlerForBattleScript` battler
//! selector, then clears a table-driven `status1`/`status2` mask keyed by
//! `gBattleCommunication[MOVE_EFFECT_BYTE]` -- narrowed to the one nonzero
//! table entry (`MOVE_EFFECT_CHARGING` -> `STATUS2_MULTIPLETURNS`) this
//! opcode's 5 committed call sites ever need, exactly matching
//! `sStatusFlagsForMoveEffects`'s own designated-initializer default of 0 for
//! every other index (`battle_script_commands.c:608-625`), including
//! `MOVE_EFFECT_RAGE` (30, the other value the committed sites use). An
//! unresolved selector is a first-class `Halt` -- a deliberate DEVIATION from
//! the jump-family convention (`battle_script_type_curse.rs`'s
//! `jumpiftype`/`jumpiftype2`), which instead `Block`s: canonical TypeScript
//! (`battleScriptSemiInvulnerableOpcode.ts:69-76`) routes this specific
//! opcode's unavailable selector through `unsupportedBranch`, not
//! `blockOnUnavailableMessage`-style machinery. `gBattleScripting.
//! multihitMoveEffect = 0` is an unmodeled no-op (no reader in this engine's
//! scope; TS precedent).
//!
//! `setsemiinvulnerablebit`/`clearsemiinvulnerablebit` are zero-operand,
//! unconditional-advance leaves requiring the shared hit-chain `attacker`
//! role (`requireBattlerRole`, error text "Battle Script hit-chain command
//! requires a attacker role" -- shared verbatim with `battle_script_
//! setminimize.rs`'s own port of the same helper, DIFFERENT from tryKO/
//! cursetarget's "Cmd_X requires ..." family), then OR/AND-clear one of
//! three `status3` bits on the attacker keyed by `gCurrentMove`: Fly/Bounce
//! -> `STATUS3_ON_AIR`, Dig -> `STATUS3_UNDERGROUND`, Dive ->
//! `STATUS3_UNDERWATER`; any other move is a pure no-op advance (bit 0,
//! matching the C switch's missing `default:` case).
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c` --
//! `Cmd_clearstatusfromeffect` :2951-2963 (`GetBattlerForBattleScript
//! (gBattlescriptCurrInstr[1])` at :2953, table-driven AND-clear both
//! branches, `MOVE_EFFECT_BYTE` reset, `gBattlescriptCurrInstr += 2`),
//! `sStatusFlagsForMoveEffects` :608-625, `Cmd_setsemiinvulnerablebit`
//! :9009-9026, `Cmd_clearsemiinvulnerablebit` :9028-9045 (both switch over
//! `gCurrentMove`, write/clear `gStatuses3[gBattlerAttacker]`,
//! `gBattlescriptCurrInstr++`); dispatch rows :355 (`//0x18`), :528
//! (`//0xC5`), :529 (`//0xC6`); forward decls :103, :276, :277; enum
//! positions `include/constants/battle_script_commands.h:30,203,204`; macros
//! `asm/macros/battle_script.inc:107` (`clearstatusfromeffect battler:req`,
//! width 2), :1018 (`setsemiinvulnerablebit`, width 1), :1022
//! (`clearsemiinvulnerablebit`, width 1). Committed call sites in
//! `data/battle_scripts_1.s` (verified by grep): 5 clearstatusfromeffect
//! (:789, :1131, :2001, :3295, :3319, all `BS_ATTACKER`), 1
//! setsemiinvulnerablebit (:1994), 2 clearsemiinvulnerablebit (:2007,
//! :2011). Constants `battle.h:139` (`STATUS2_MULTIPLETURNS`), `:163,164,175`
//! (`STATUS3_ON_AIR`/`STATUS3_UNDERGROUND`/`STATUS3_UNDERWATER`), `:253`
//! (`PRIMARY_STATUS_MOVE_EFFECT` == `MOVE_EFFECT_TOXIC` == 6);
//! `include/constants/moves.h:23,95,295,344` (`MOVE_FLY`/`MOVE_DIG`/
//! `MOVE_DIVE`/`MOVE_BOUNCE`).
//!
//! This leaf owns neither opcode registration wiring into a live machine,
//! RNG, scheduler/controller state, nor presentation.

use core::fmt;

pub const BATTLE_SCRIPT_SEMI_INVULNERABLE_SOURCE_FILE: &str = "battle_script_commands.c";

pub const BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE: u8 = 0x18;
pub const BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME: &str = "B_SCR_OP_CLEARSTATUSFROMEFFECT";
pub const BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_DISPATCHER: &str = "Cmd_clearstatusfromeffect";
pub const BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_CONCRETE_START_COUNT: usize = 5;
/// `gActiveBattler = GetBattlerForBattleScript(...)` -- the line cited by the
/// selector-unavailable `Halt`.
pub const BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_SELECTOR_LINE: u32 = 2953;

pub const BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE: u8 = 0xc5;
pub const BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE_NAME: &str =
    "B_SCR_OP_SETSEMIINVULNERABLEBIT";
pub const BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_DISPATCHER: &str = "Cmd_setsemiinvulnerablebit";
pub const BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_CONCRETE_START_COUNT: usize = 1;

pub const BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE: u8 = 0xc6;
pub const BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE_NAME: &str =
    "B_SCR_OP_CLEARSEMIINVULNERABLEBIT";
pub const BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_DISPATCHER: &str = "Cmd_clearsemiinvulnerablebit";
pub const BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_CONCRETE_START_COUNT: usize = 2;

/// `include/constants/battle.h:139`.
pub const BATTLE_SCRIPT_STATUS2_MULTIPLETURNS: u32 = 1 << 12;
/// `include/constants/battle.h:259,300` slice -- the only nonzero
/// `sStatusFlagsForMoveEffects` index this opcode's committed sites use.
pub const BATTLE_SCRIPT_MOVE_EFFECT_CHARGING: u8 = 12;
/// `include/constants/battle.h:253` (`PRIMARY_STATUS_MOVE_EFFECT ==
/// MOVE_EFFECT_TOXIC == 6`).
pub const BATTLE_SCRIPT_PRIMARY_STATUS_MOVE_EFFECT: u8 = 6;

/// `include/constants/moves.h:23,95,295,344`.
pub const BATTLE_SCRIPT_MOVE_FLY: u16 = 19;
pub const BATTLE_SCRIPT_MOVE_DIG: u16 = 91;
pub const BATTLE_SCRIPT_MOVE_DIVE: u16 = 291;
pub const BATTLE_SCRIPT_MOVE_BOUNCE: u16 = 340;

/// `include/constants/battle.h:163,164,175`.
pub const BATTLE_SCRIPT_STATUS3_ON_AIR: u32 = 1 << 6;
pub const BATTLE_SCRIPT_STATUS3_UNDERGROUND: u32 = 1 << 7;
pub const BATTLE_SCRIPT_STATUS3_UNDERWATER: u32 = 1 << 18;

/// Native twin of `STATUS_MASK_FOR_MOVE_EFFECT`, narrowed to the single
/// nonzero table entry this opcode's committed call-site domain needs.
/// Every other byte (including `MOVE_EFFECT_RAGE` == 30, the other value the
/// committed sites feed this opcode) resolves 0, matching
/// `sStatusFlagsForMoveEffects`'s own designated-initializer default.
#[must_use]
pub fn status_mask_for_move_effect(effect_byte: u8) -> u32 {
    if effect_byte == BATTLE_SCRIPT_MOVE_EFFECT_CHARGING {
        BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
    } else {
        0
    }
}

/// Complete source battler-id domain used by roles and source-indexed
/// battler state.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptSemiInvulnerableBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptSemiInvulnerableBattler {
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

/// The narrow per-battler projection either opcode can read or write.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSemiInvulnerableBattlerState {
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
}

/// The only selector binding read by any of the three handlers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSemiInvulnerableRoles {
    pub attacker: Option<BattleScriptSemiInvulnerableBattler>,
}

/// Complete narrow rules slice this module reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSemiInvulnerableRules {
    pub battlers: [BattleScriptSemiInvulnerableBattlerState; 4],
    /// `gBattleCommunication[MOVE_EFFECT_BYTE]`.
    pub move_effect_byte: u8,
    /// `gCurrentMove`.
    pub current_move: u16,
    pub selector_roles: BattleScriptSemiInvulnerableRoles,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// outcome, never an error (M74/M82 shape).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptSemiInvulnerableHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

// ---------------------------------------------------------------------
// CLEARSTATUSFROMEFFECT
// ---------------------------------------------------------------------

/// One committed-program instruction, narrowed to what eager registration
/// inspects: the operand's width and (uniquely to this opcode) its literal
/// expression text -- registration pins `BS_ATTACKER`, not merely a shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptClearstatusfromeffectInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_width_bytes: Option<u8>,
    pub operand_expression: Option<&'a str>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptClearstatusfromeffectRegistrationError {
    WrongCardinality { count: usize },
    InvalidShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptClearstatusfromeffectRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "{BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME} requires all 5 concrete starts, got {count}"
            ),
            Self::InvalidShape { program_counter } => write!(
                formatter,
                "invalid {BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME} shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptClearstatusfromeffectRegistrationError {}

/// Native projection of `createBattleScriptClearstatusfromeffectOpcodeHandlers`
/// (ts:96-122): ALL 5 concrete starts validated eagerly, each requiring the
/// dispatcher, a single 1-byte operand, AND that operand's expression to be
/// literally `BS_ATTACKER` -- the stricter-than-shape registration this
/// module's doc comment pins.
pub fn register_battle_script_clearstatusfromeffect(
    instructions: &[BattleScriptClearstatusfromeffectInstruction<'_>],
) -> Result<u8, BattleScriptClearstatusfromeffectRegistrationError> {
    let matching: Vec<_> = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME
        })
        .collect();
    if matching.len() != BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_CONCRETE_START_COUNT {
        return Err(
            BattleScriptClearstatusfromeffectRegistrationError::WrongCardinality {
                count: matching.len(),
            },
        );
    }
    for instruction in &matching {
        let valid = instruction.dispatcher == BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_DISPATCHER
            && instruction.operand_width_bytes == Some(1)
            && instruction.operand_expression == Some("BS_ATTACKER");
        if !valid {
            return Err(
                BattleScriptClearstatusfromeffectRegistrationError::InvalidShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
    }
    Ok(matching[0].opcode_id)
}

/// Execution input: an already-resolved `GetBattlerForBattleScript` result
/// (mirroring `resolveBattlerForBattleScript`), `None` meaning "selector
/// unavailable".
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptClearstatusfromeffectExecution<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    /// `None` renders as `"<missing>"` in the Halt message, matching the TS
    /// `operand?.expression ?? "<missing>"` fallback.
    pub operand_expression: Option<&'a str>,
    pub battler: Option<BattleScriptSemiInvulnerableBattler>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptClearstatusfromeffectOutcome {
    Advance {
        rules: BattleScriptSemiInvulnerableRules,
    },
    Halt(BattleScriptSemiInvulnerableHalt),
}

/// Native twin of `Cmd_clearstatusfromeffect`
/// (`battle_script_commands.c:2951-2963`). Infallible: every unmodeled path
/// is a first-class `Halt`, never an error.
#[must_use]
pub fn apply_battle_script_clearstatusfromeffect(
    execution: &BattleScriptClearstatusfromeffectExecution<'_>,
    rules: &BattleScriptSemiInvulnerableRules,
) -> BattleScriptClearstatusfromeffectOutcome {
    let Some(battler) = execution.battler else {
        return BattleScriptClearstatusfromeffectOutcome::Halt(BattleScriptSemiInvulnerableHalt {
            program_counter: execution.program_counter,
            opcode_id: execution.opcode_id,
            opcode_name: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME,
            source_construct: format!(
                "Cmd_clearstatusfromeffect's GetBattlerForBattleScript selector ({}) is unavailable",
                execution.operand_expression.unwrap_or("<missing>")
            ),
            source_file: BATTLE_SCRIPT_SEMI_INVULNERABLE_SOURCE_FILE,
            source_line: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_SELECTOR_LINE,
        });
    };

    let effect_byte = rules.move_effect_byte;
    let mask = status_mask_for_move_effect(effect_byte);
    let mut next = *rules;
    if effect_byte <= BATTLE_SCRIPT_PRIMARY_STATUS_MOVE_EFFECT {
        next.battlers[battler.index()].status1 &= !mask;
    } else {
        next.battlers[battler.index()].status2 &= !mask;
    }
    next.move_effect_byte = 0;
    BattleScriptClearstatusfromeffectOutcome::Advance { rules: next }
}

// ---------------------------------------------------------------------
// SET/CLEARSEMIINVULNERABLEBIT
// ---------------------------------------------------------------------

/// The one error shared verbatim by both bit opcodes: the shared hit-chain
/// `requireBattlerRole` helper's message (ungrammatical "a attacker", not
/// tryKO/cursetarget's own "Cmd_X requires ..." family).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSemiInvulnerableBitError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSemiInvulnerableBitError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSemiInvulnerableBitError {}

/// Native twin of `semiInvulnerableBitForCurrentMove` (ts:134-146): a switch
/// over `gCurrentMove`. Any move outside the four listed resolves bit 0 --
/// PINNED default case, matching the C switch's absent `default:` label.
#[must_use]
pub fn semi_invulnerable_bit_for_current_move(current_move: u16) -> u32 {
    match current_move {
        BATTLE_SCRIPT_MOVE_FLY | BATTLE_SCRIPT_MOVE_BOUNCE => BATTLE_SCRIPT_STATUS3_ON_AIR,
        BATTLE_SCRIPT_MOVE_DIG => BATTLE_SCRIPT_STATUS3_UNDERGROUND,
        BATTLE_SCRIPT_MOVE_DIVE => BATTLE_SCRIPT_STATUS3_UNDERWATER,
        _ => 0,
    }
}

fn apply_semi_invulnerable_bit(
    rules: &BattleScriptSemiInvulnerableRules,
    set: bool,
) -> Result<BattleScriptSemiInvulnerableRules, BattleScriptSemiInvulnerableBitError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSemiInvulnerableBitError::MissingAttackerRole)?;
    let bit = semi_invulnerable_bit_for_current_move(rules.current_move);
    let mut next = *rules;
    let status3 = &mut next.battlers[attacker.index()].status3;
    *status3 = if set { *status3 | bit } else { *status3 & !bit };
    Ok(next)
}

/// Native twin of `Cmd_setsemiinvulnerablebit`
/// (`battle_script_commands.c:9009-9026`).
///
/// # Errors
/// [`BattleScriptSemiInvulnerableBitError::MissingAttackerRole`] only.
pub fn apply_battle_script_setsemiinvulnerablebit(
    rules: &BattleScriptSemiInvulnerableRules,
) -> Result<BattleScriptSemiInvulnerableRules, BattleScriptSemiInvulnerableBitError> {
    apply_semi_invulnerable_bit(rules, true)
}

/// Native twin of `Cmd_clearsemiinvulnerablebit`
/// (`battle_script_commands.c:9028-9045`).
///
/// # Errors
/// [`BattleScriptSemiInvulnerableBitError::MissingAttackerRole`] only.
pub fn apply_battle_script_clearsemiinvulnerablebit(
    rules: &BattleScriptSemiInvulnerableRules,
) -> Result<BattleScriptSemiInvulnerableRules, BattleScriptSemiInvulnerableBitError> {
    apply_semi_invulnerable_bit(rules, false)
}

/// One committed-program instruction, narrowed to what
/// `registerZeroOperandOpcode` inspects (ts:168-185): opcode name, dispatcher,
/// and operand count -- unlike `set_side_status`'s single-instruction
/// convention, this one DOES check the dispatcher.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSemiInvulnerableBitInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSemiInvulnerableBitRegistrationError {
    WrongCardinality {
        opcode_name: &'static str,
        expected: usize,
        count: usize,
    },
    InvalidShape {
        opcode_name: &'static str,
        program_counter: u32,
    },
}

impl fmt::Display for BattleScriptSemiInvulnerableBitRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { opcode_name, expected, count } => write!(
                formatter,
                "{opcode_name} requires all {expected} concrete starts, got {count}"
            ),
            Self::InvalidShape { opcode_name, program_counter } => write!(
                formatter,
                "invalid {opcode_name} shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptSemiInvulnerableBitRegistrationError {}

fn register_zero_operand_opcode(
    instructions: &[BattleScriptSemiInvulnerableBitInstruction<'_>],
    opcode_name: &'static str,
    expected_count: usize,
    dispatcher: &'static str,
) -> Result<u8, BattleScriptSemiInvulnerableBitRegistrationError> {
    let matching: Vec<_> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == opcode_name)
        .collect();
    if matching.len() != expected_count {
        return Err(
            BattleScriptSemiInvulnerableBitRegistrationError::WrongCardinality {
                opcode_name,
                expected: expected_count,
                count: matching.len(),
            },
        );
    }
    for instruction in &matching {
        if instruction.dispatcher != dispatcher || instruction.operand_count != 0 {
            return Err(
                BattleScriptSemiInvulnerableBitRegistrationError::InvalidShape {
                    opcode_name,
                    program_counter: instruction.program_counter,
                },
            );
        }
    }
    Ok(matching[0].opcode_id)
}

/// `createBattleScriptSemiInvulnerableBitOpcodeHandlers`'s SET slice
/// (ts:191-197): exactly 1 concrete start required.
pub fn register_battle_script_setsemiinvulnerablebit(
    instructions: &[BattleScriptSemiInvulnerableBitInstruction<'_>],
) -> Result<u8, BattleScriptSemiInvulnerableBitRegistrationError> {
    register_zero_operand_opcode(
        instructions,
        BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE_NAME,
        BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_CONCRETE_START_COUNT,
        BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_DISPATCHER,
    )
}

/// `createBattleScriptSemiInvulnerableBitOpcodeHandlers`'s CLEAR slice
/// (ts:198-204): exactly 2 concrete starts required.
pub fn register_battle_script_clearsemiinvulnerablebit(
    instructions: &[BattleScriptSemiInvulnerableBitInstruction<'_>],
) -> Result<u8, BattleScriptSemiInvulnerableBitRegistrationError> {
    register_zero_operand_opcode(
        instructions,
        BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE_NAME,
        BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_CONCRETE_START_COUNT,
        BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_DISPATCHER,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn battler_state() -> BattleScriptSemiInvulnerableBattlerState {
        BattleScriptSemiInvulnerableBattlerState { status1: 0, status2: 0, status3: 0 }
    }

    fn rules() -> BattleScriptSemiInvulnerableRules {
        BattleScriptSemiInvulnerableRules {
            battlers: [
                battler_state(),
                battler_state(),
                battler_state(),
                battler_state(),
            ],
            move_effect_byte: 0,
            current_move: BATTLE_SCRIPT_MOVE_FLY,
            selector_roles: BattleScriptSemiInvulnerableRoles {
                attacker: Some(BattleScriptSemiInvulnerableBattler::Battler0),
            },
        }
    }

    #[test]
    fn status_mask_table_both_directions() {
        assert_eq!(
            status_mask_for_move_effect(BATTLE_SCRIPT_MOVE_EFFECT_CHARGING),
            BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
        );
        assert_eq!(
            status_mask_for_move_effect(30),
            0,
            "MOVE_EFFECT_RAGE narrows to 0"
        );
        assert_eq!(status_mask_for_move_effect(0), 0);
        assert_eq!(status_mask_for_move_effect(255), 0);
    }

    #[test]
    fn primary_status_move_effect_branch_split() {
        let mut r = rules();
        r.battlers[0].status1 = 0xffff_ffff;
        r.battlers[0].status2 = 0xffff_ffff;
        r.move_effect_byte = BATTLE_SCRIPT_MOVE_EFFECT_CHARGING; // 12 > 6 -> status2 branch
        let execution = BattleScriptClearstatusfromeffectExecution {
            program_counter: 10,
            opcode_id: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE,
            operand_expression: Some("BS_ATTACKER"),
            battler: Some(BattleScriptSemiInvulnerableBattler::Battler0),
        };
        match apply_battle_script_clearstatusfromeffect(&execution, &r) {
            BattleScriptClearstatusfromeffectOutcome::Advance { rules: next } => {
                assert_eq!(next.battlers[0].status1, 0xffff_ffff, "status1 untouched");
                assert_eq!(
                    next.battlers[0].status2,
                    !BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
                );
                assert_eq!(next.move_effect_byte, 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }

        r.move_effect_byte = 1; // <= 6 -> status1 branch, mask 0
        let outcome = apply_battle_script_clearstatusfromeffect(&execution, &r);
        match outcome {
            BattleScriptClearstatusfromeffectOutcome::Advance { rules: next } => {
                assert_eq!(next.battlers[0].status1, 0xffff_ffff, "mask 0 is a no-op");
                assert_eq!(next.move_effect_byte, 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn clearstatusfromeffect_selector_unavailable_halts_with_missing_rendering() {
        let r = rules();
        let execution = BattleScriptClearstatusfromeffectExecution {
            program_counter: 20,
            opcode_id: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE,
            operand_expression: None,
            battler: None,
        };
        match apply_battle_script_clearstatusfromeffect(&execution, &r) {
            BattleScriptClearstatusfromeffectOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_clearstatusfromeffect's GetBattlerForBattleScript selector (<missing>) is unavailable"
                );
                assert_eq!(halt.source_line, 2953);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn current_move_switch_including_default() {
        assert_eq!(
            semi_invulnerable_bit_for_current_move(BATTLE_SCRIPT_MOVE_FLY),
            BATTLE_SCRIPT_STATUS3_ON_AIR
        );
        assert_eq!(
            semi_invulnerable_bit_for_current_move(BATTLE_SCRIPT_MOVE_BOUNCE),
            BATTLE_SCRIPT_STATUS3_ON_AIR
        );
        assert_eq!(
            semi_invulnerable_bit_for_current_move(BATTLE_SCRIPT_MOVE_DIG),
            BATTLE_SCRIPT_STATUS3_UNDERGROUND
        );
        assert_eq!(
            semi_invulnerable_bit_for_current_move(BATTLE_SCRIPT_MOVE_DIVE),
            BATTLE_SCRIPT_STATUS3_UNDERWATER
        );
        assert_eq!(semi_invulnerable_bit_for_current_move(1), 0, "default case");
    }

    #[test]
    fn set_and_clear_algebra_and_idempotence() {
        let r = rules();
        let set = apply_battle_script_setsemiinvulnerablebit(&r).unwrap();
        assert_eq!(set.battlers[0].status3, BATTLE_SCRIPT_STATUS3_ON_AIR);
        let set_again = apply_battle_script_setsemiinvulnerablebit(&set).unwrap();
        assert_eq!(set_again, set, "setting is idempotent");

        let cleared = apply_battle_script_clearsemiinvulnerablebit(&set).unwrap();
        assert_eq!(cleared.battlers[0].status3, 0);
        let cleared_again = apply_battle_script_clearsemiinvulnerablebit(&cleared).unwrap();
        assert_eq!(cleared_again, cleared, "clearing when unset is idempotent");
    }

    #[test]
    fn missing_attacker_role_is_shared_verbatim() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        let expected = "Battle Script hit-chain command requires a attacker role";
        assert_eq!(
            apply_battle_script_setsemiinvulnerablebit(&r)
                .unwrap_err()
                .to_string(),
            expected
        );
        assert_eq!(
            apply_battle_script_clearsemiinvulnerablebit(&r)
                .unwrap_err()
                .to_string(),
            expected
        );
    }

    #[test]
    fn registration_conventions_for_all_three_opcodes() {
        let good_effect = BattleScriptClearstatusfromeffectInstruction {
            opcode_name: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME,
            program_counter: 1,
            opcode_id: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE,
            dispatcher: BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_DISPATCHER,
            operand_width_bytes: Some(1),
            operand_expression: Some("BS_ATTACKER"),
        };
        let five = vec![good_effect; 5];
        assert_eq!(
            register_battle_script_clearstatusfromeffect(&five).unwrap(),
            BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE
        );
        assert_eq!(
            register_battle_script_clearstatusfromeffect(&five[..4])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_CLEARSTATUSFROMEFFECT requires all 5 concrete starts, got 4"
        );
        let mut wrong_expr = five.clone();
        wrong_expr[0].operand_expression = Some("BS_TARGET");
        assert_eq!(
            register_battle_script_clearstatusfromeffect(&wrong_expr)
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_CLEARSTATUSFROMEFFECT shape at program counter 1"
        );

        let good_set = BattleScriptSemiInvulnerableBitInstruction {
            opcode_name: BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE_NAME,
            program_counter: 2,
            opcode_id: BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE,
            dispatcher: BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_DISPATCHER,
            operand_count: 0,
        };
        assert_eq!(
            register_battle_script_setsemiinvulnerablebit(&[good_set]).unwrap(),
            BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE
        );
        assert_eq!(
            register_battle_script_setsemiinvulnerablebit(&[])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_SETSEMIINVULNERABLEBIT requires all 1 concrete starts, got 0"
        );
        let mut bad_dispatcher = good_set;
        bad_dispatcher.dispatcher = "Cmd_setminimize";
        assert_eq!(
            register_battle_script_setsemiinvulnerablebit(&[bad_dispatcher])
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_SETSEMIINVULNERABLEBIT shape at program counter 2"
        );

        let good_clear = BattleScriptSemiInvulnerableBitInstruction {
            opcode_name: BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE_NAME,
            program_counter: 3,
            opcode_id: BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE,
            dispatcher: BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_DISPATCHER,
            operand_count: 0,
        };
        let two = vec![good_clear; 2];
        assert_eq!(
            register_battle_script_clearsemiinvulnerablebit(&two).unwrap(),
            BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE
        );
        assert_eq!(
            register_battle_script_clearsemiinvulnerablebit(&two[..1])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_CLEARSEMIINVULNERABLEBIT requires all 2 concrete starts, got 1"
        );
    }

    #[test]
    fn battler_ids_round_trip() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptSemiInvulnerableBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptSemiInvulnerableBattler::from_u8(4), None);
    }
}
