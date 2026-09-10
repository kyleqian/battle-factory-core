//! Pure `B_SCR_OP_SETREFLECT` (0x7E, `Cmd_setreflect`),
//! `B_SCR_OP_SETLIGHTSCREEN` (0x92, `Cmd_setlightscreen`), `B_SCR_OP_SETMIST`
//! (0x99, `Cmd_setmist`), `B_SCR_OP_SETSAFEGUARD` (0xB8,
//! `Cmd_setsafeguard`), and `B_SCR_OP_REMOVELIGHTSCREENREFLECT` (0xEE,
//! `Cmd_removelightscreenreflect`) side-status family -- five independently
//! shaped, zero-operand, zero-RNG leaves bundled into one module because
//! four are the "fail if already active, else set bit + 5-turn timer +
//! setting battler id" shape and the fifth clears the same bits/timers on
//! the opposing side.
//!
//! The whole module ports `src/engine/battleScriptSetSideStatusOpcode.ts`
//! (248 lines): `createSetSideStatusHandler` + the four configs
//! (REFLECT/LIGHTSCREEN/SAFEGUARD/MIST), `removelightscreenreflectOpcodeHandler`,
//! and `registerSingleInstruction`.
//!
//! ## Registration convention (`registerSingleInstruction`, ts:218-232)
//! The committed program must contain EXACTLY ONE instruction per opcode
//! name -- error `"<opcodeName> requires exactly 1 concrete start, got
//! <N>"` -- and that instruction must have exactly 0 operands -- error
//! `"invalid <opcodeName> shape at program counter <N>"`. Unlike
//! `battle_script_fixed_damage.rs`'s `damagetohalftargethp` convention,
//! there is NO dispatcher check here (ts:228 only reads
//! `instruction.operands.length`).
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. ALL FIVE: `requireAttacker(rules)` (ts:50-54) -- error literally
//!    `"Cmd_set<sidestatus> requires an attacker role"`, ONE shared string
//!    with the literal placeholder text, not a per-opcode substitution.
//!    `side := battlers[attacker].side`.
//! 2. Setters (reflect/lightscreen/safeguard, ts:98-117): if
//!    `sideStatuses[side] & bit != 0` -> `move_result_flags |= MISSED`,
//!    `multistring_chooser := 0` (`B_MSG_SIDE_STATUS_FAILED`), nothing else
//!    mutated. Else: `sideStatuses[side] |= bit`, that setter's own timer
//!    `:= 5`, its own battler id `:= attacker`, chooser := its success value.
//! 3. Mist (ts:155-170) has its OWN guard: `mistTimers[side] != 0` -- the
//!    RAW timer, NOT the `SIDE_STATUS_MIST` bit. A representable state with
//!    the bit set but the timer at 0 still SUCCEEDS. Fail flag is `FAILED`
//!    (not `MISSED`), fail chooser `1` (`B_MSG_MIST_FAILED`). Success:
//!    `mistTimers[side] := 5`, `sideTimers[side].mistBattlerId := attacker`,
//!    `sideStatuses[side] |= MIST bit`, chooser `0` (`B_MSG_SET_MIST`).
//! 4. `removelightscreenreflect` (ts:196-216): `opposing := 1 - side`;
//!    guard reads the OPPOSING side's `reflectTimer != 0 ||
//!    lightscreenTimer != 0` (timers, not bits). Taken: clear
//!    `REFLECT|LIGHTSCREEN` bits on the opposing `sideStatuses`, zero both
//!    opposing timers, `animTurn := 1`, `animTargetsHit := 1`. Not taken:
//!    `animTurn := 0`, `animTargetsHit := 0`, nothing else. Always advances.
//!
//! The double-battle message variant (`B_MSG_SET_REFLECT_DOUBLE` /
//! `B_MSG_SET_LIGHTSCREEN_DOUBLE`, gated on `BATTLE_TYPE_DOUBLE &&
//! CountAliveMonsInBattle(...) == 2` in C) is deliberately NOT modeled --
//! canonical TypeScript always emits the SINGLE chooser value
//! (unreachable at Factory L50 singles); TS is the spec.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `:6697-6716` (`Cmd_setreflect`), `:7468-7488` (`Cmd_setlightscreen`),
//! `:7732-7747` (`Cmd_setmist`), `:8652-8668` (`Cmd_setsafeguard`),
//! `:9883-9903` (`Cmd_removelightscreenreflect` -- `BATTLE_OPPOSITE`,
//! timer-guarded clear, `animTurn`/`animTargetsHit` on both branches).
//! Dispatch rows `:457` (`//0x7E`), `:477` (`//0x92`), `:484` (`//0x99`),
//! `:515` (`//0xB8`), `:569` (`//0xEE`). Forward decls `:205` (setreflect),
//! `:225` (setlightscreen), `:232` (setmist), `:263` (setsafeguard), `:317`
//! (removelightscreenreflect). Opcode enum positions
//! `include/constants/battle_script_commands.h:132,152,159,190,244`.
//! Macros `asm/macros/battle_script.inc:698` (setreflect), `:789`
//! (setlightscreen), `:820` (setmist), `:959` (setsafeguard), `:1209`
//! (removelightscreenreflect) -- each a single `.byte`, no operand. Call
//! sites in `data/battle_scripts_1.s`, exactly one each: `:978`
//! (setreflect), `:728` (setlightscreen), `:878` (setmist), `:1676`
//! (setsafeguard), `:2423` (removelightscreenreflect, Brick Break).
//! `SIDE_STATUS_REFLECT`/`LIGHTSCREEN`/`SAFEGUARD`/`MIST`:
//! `include/constants/battle.h:210-217`. `MOVE_RESULT_MISSED`/`FAILED`:
//! `battleScriptSourceConstants.ts:142,148`
//! (`BATTLE_SCRIPT_MOVE_RESULT_MISSED`/`_FAILED`), matching
//! `include/constants/battle.h`. `B_MSG_*` chooser indices:
//! `battle_message.c:952-1051` (`gSideStatusStringIds` /
//! `gMistUsedStringIds` row order).
//!
//! This leaf deliberately owns neither opcode registration wiring into a
//! live machine, absolute program counters beyond the caller-supplied
//! instruction metadata, RNG, scheduler/controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed battler state retains
/// four cells.
pub const BATTLE_SCRIPT_SET_SIDE_STATUS_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_SIDES`; `gSideStatuses`/`gSideTimers`/`mistTimer` each
/// retain one record per side.
pub const BATTLE_SCRIPT_SET_SIDE_STATUS_SIDE_COUNT: usize = 2;

pub const BATTLE_SCRIPT_SETREFLECT_OPCODE: u8 = 0x7e;
pub const BATTLE_SCRIPT_SETREFLECT_OPCODE_NAME: &str = "B_SCR_OP_SETREFLECT";
pub const BATTLE_SCRIPT_SETREFLECT_DISPATCHER: &str = "Cmd_setreflect";

pub const BATTLE_SCRIPT_SETLIGHTSCREEN_OPCODE: u8 = 0x92;
pub const BATTLE_SCRIPT_SETLIGHTSCREEN_OPCODE_NAME: &str = "B_SCR_OP_SETLIGHTSCREEN";
pub const BATTLE_SCRIPT_SETLIGHTSCREEN_DISPATCHER: &str = "Cmd_setlightscreen";

pub const BATTLE_SCRIPT_SETMIST_OPCODE: u8 = 0x99;
pub const BATTLE_SCRIPT_SETMIST_OPCODE_NAME: &str = "B_SCR_OP_SETMIST";
pub const BATTLE_SCRIPT_SETMIST_DISPATCHER: &str = "Cmd_setmist";

pub const BATTLE_SCRIPT_SETSAFEGUARD_OPCODE: u8 = 0xb8;
pub const BATTLE_SCRIPT_SETSAFEGUARD_OPCODE_NAME: &str = "B_SCR_OP_SETSAFEGUARD";
pub const BATTLE_SCRIPT_SETSAFEGUARD_DISPATCHER: &str = "Cmd_setsafeguard";

pub const BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_OPCODE: u8 = 0xee;
pub const BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_OPCODE_NAME: &str =
    "B_SCR_OP_REMOVELIGHTSCREENREFLECT";
pub const BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_DISPATCHER: &str = "Cmd_removelightscreenreflect";

/// `include/constants/battle.h:210`.
pub const BATTLE_SCRIPT_SIDE_STATUS_REFLECT: u32 = 1 << 0;
/// `include/constants/battle.h:211`.
pub const BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN: u32 = 1 << 1;
/// `include/constants/battle.h:214`.
pub const BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD: u32 = 1 << 5;
/// `include/constants/battle.h:216`.
pub const BATTLE_SCRIPT_SIDE_STATUS_MIST: u32 = 1 << 8;

/// `battleScriptSourceConstants.ts:142`, matching `include/constants/battle.h`'s `MOVE_RESULT_MISSED`.
pub const BATTLE_SCRIPT_MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `battleScriptSourceConstants.ts:148`, matching `include/constants/battle.h`'s `MOVE_RESULT_FAILED`.
pub const BATTLE_SCRIPT_MOVE_RESULT_FAILED: u32 = 1 << 5;

/// `battle_message.c:952-1051` -- MULTISTRING_CHOOSER indices, singles-only rows.
pub const BATTLE_SCRIPT_B_MSG_SIDE_STATUS_FAILED: u8 = 0;
pub const BATTLE_SCRIPT_B_MSG_SET_REFLECT_SINGLE: u8 = 1;
pub const BATTLE_SCRIPT_B_MSG_SET_LIGHTSCREEN_SINGLE: u8 = 3;
pub const BATTLE_SCRIPT_B_MSG_SET_SAFEGUARD: u8 = 5;
pub const BATTLE_SCRIPT_B_MSG_SET_MIST: u8 = 0;
pub const BATTLE_SCRIPT_B_MSG_MIST_FAILED: u8 = 1;

/// Complete source battler-id domain used by roles and source-indexed
/// timer/battler fields.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptSetSideStatusBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptSetSideStatusBattler {
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

/// Source `B_SIDE_PLAYER` / `B_SIDE_OPPONENT` domain indexing
/// `sideStatuses`/`sideTimers`/`mistTimers`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetSideStatusSide {
    Side0 = 0,
    Side1 = 1,
}

impl BattleScriptSetSideStatusSide {
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
            0 => Some(Self::Side0),
            1 => Some(Self::Side1),
            _ => None,
        }
    }

    /// `removelightscreenreflect`'s `opposingSide = 1 - side` (ts:201).
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Side0 => Self::Side1,
            Self::Side1 => Self::Side0,
        }
    }
}

/// The narrow per-battler projection this leaf reads: only its side.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusBattlerState {
    pub side: BattleScriptSetSideStatusSide,
}

/// Canonical `BattleScriptSideTimerState` projection narrowed to the seven
/// fields this leaf reads or writes (`followmeTimer`/`followmeTarget`/
/// `spikesAmount` are untouched by this family and intentionally absent).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusSideTimerState {
    pub reflect_timer: u8,
    pub reflect_battler_id: BattleScriptSetSideStatusBattler,
    pub lightscreen_timer: u8,
    pub lightscreen_battler_id: BattleScriptSetSideStatusBattler,
    pub safeguard_timer: u8,
    pub safeguard_battler_id: BattleScriptSetSideStatusBattler,
    pub mist_battler_id: BattleScriptSetSideStatusBattler,
}

/// The only selector binding read by any of the five handlers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusRoles {
    pub attacker: Option<BattleScriptSetSideStatusBattler>,
}

/// Complete narrow rules slice this family reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusRules {
    pub battlers:
        [BattleScriptSetSideStatusBattlerState; BATTLE_SCRIPT_SET_SIDE_STATUS_BATTLER_COUNT],
    /// Source `gSideStatuses`, preserved as the full unsigned `u32` domain.
    pub side_statuses: [u32; BATTLE_SCRIPT_SET_SIDE_STATUS_SIDE_COUNT],
    pub side_timers:
        [BattleScriptSetSideStatusSideTimerState; BATTLE_SCRIPT_SET_SIDE_STATUS_SIDE_COUNT],
    /// Source `SideTimer::mistTimer`, modeled separately from `side_timers`
    /// exactly as canonical TypeScript's `mistTimers` rules-context field is.
    pub mist_timers: [u8; BATTLE_SCRIPT_SET_SIDE_STATUS_SIDE_COUNT],
    pub move_result_flags: u32,
    pub multistring_chooser: u8,
    pub anim_turn: u8,
    pub anim_targets_hit: u8,
    pub selector_roles: BattleScriptSetSideStatusRoles,
}

/// The one error shared verbatim by all five handlers: `requireAttacker`
/// (ts:50-54) throws with the literal placeholder text baked into the
/// message, not substituted per opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetSideStatusError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetSideStatusError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_set<sidestatus> requires an attacker role")
            }
        }
    }
}

impl std::error::Error for BattleScriptSetSideStatusError {}

fn require_attacker(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusBattler, BattleScriptSetSideStatusError> {
    rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetSideStatusError::MissingAttackerRole)
}

/// Shared shape behind `Cmd_setreflect`/`Cmd_setlightscreen`/
/// `Cmd_setsafeguard` (ts:98-117): fail (MISSED + chooser 0) if the side's
/// own bit is already set, else set the bit and let `write_timer` stamp
/// only that setter's own timer/battler-id fields.
fn apply_bit_setter(
    rules: &BattleScriptSetSideStatusRules,
    bit: u32,
    success_chooser: u8,
    write_timer: impl FnOnce(
        &mut BattleScriptSetSideStatusSideTimerState,
        BattleScriptSetSideStatusBattler,
    ),
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    let attacker = require_attacker(rules)?;
    let side = rules.battlers[attacker.index()].side;
    let mut next = *rules;
    if rules.side_statuses[side.index()] & bit != 0 {
        next.move_result_flags |= BATTLE_SCRIPT_MOVE_RESULT_MISSED;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_SIDE_STATUS_FAILED;
    } else {
        next.side_statuses[side.index()] |= bit;
        write_timer(&mut next.side_timers[side.index()], attacker);
        next.multistring_chooser = success_chooser;
    }
    Ok(next)
}

/// Native immutable-value twin of `createSetSideStatusHandler(REFLECT_CONFIG)`
/// (ts:119-129).
///
/// # Errors
/// [`BattleScriptSetSideStatusError::MissingAttackerRole`] only.
pub fn apply_battle_script_setreflect(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    apply_bit_setter(
        rules,
        BATTLE_SCRIPT_SIDE_STATUS_REFLECT,
        BATTLE_SCRIPT_B_MSG_SET_REFLECT_SINGLE,
        |timers, attacker| {
            timers.reflect_timer = 5;
            timers.reflect_battler_id = attacker;
        },
    )
}

/// Native immutable-value twin of `createSetSideStatusHandler(LIGHTSCREEN_CONFIG)`
/// (ts:131-141).
///
/// # Errors
/// [`BattleScriptSetSideStatusError::MissingAttackerRole`] only.
pub fn apply_battle_script_setlightscreen(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    apply_bit_setter(
        rules,
        BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN,
        BATTLE_SCRIPT_B_MSG_SET_LIGHTSCREEN_SINGLE,
        |timers, attacker| {
            timers.lightscreen_timer = 5;
            timers.lightscreen_battler_id = attacker;
        },
    )
}

/// Native immutable-value twin of `createSetSideStatusHandler(SAFEGUARD_CONFIG)`
/// (ts:143-153).
///
/// # Errors
/// [`BattleScriptSetSideStatusError::MissingAttackerRole`] only.
pub fn apply_battle_script_setsafeguard(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    apply_bit_setter(
        rules,
        BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD,
        BATTLE_SCRIPT_B_MSG_SET_SAFEGUARD,
        |timers, attacker| {
            timers.safeguard_timer = 5;
            timers.safeguard_battler_id = attacker;
        },
    )
}

/// Native immutable-value twin of `createSetSideStatusHandler(MIST_CONFIG)`
/// (ts:155-170). Mist's guard is the RAW `mistTimers[side]` value, NOT the
/// `SIDE_STATUS_MIST` bit -- a state with the bit set but the timer at 0
/// still takes the success branch.
///
/// # Errors
/// [`BattleScriptSetSideStatusError::MissingAttackerRole`] only.
pub fn apply_battle_script_setmist(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    let attacker = require_attacker(rules)?;
    let side = rules.battlers[attacker.index()].side;
    let mut next = *rules;
    if rules.mist_timers[side.index()] != 0 {
        next.move_result_flags |= BATTLE_SCRIPT_MOVE_RESULT_FAILED;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_MIST_FAILED;
    } else {
        next.mist_timers[side.index()] = 5;
        next.side_timers[side.index()].mist_battler_id = attacker;
        next.side_statuses[side.index()] |= BATTLE_SCRIPT_SIDE_STATUS_MIST;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_SET_MIST;
    }
    Ok(next)
}

/// Native immutable-value twin of `removelightscreenreflectOpcodeHandler`
/// (ts:196-216). Guard and clear both read/write the OPPOSING side's
/// `reflectTimer`/`lightscreenTimer`, not the acting side's.
///
/// # Errors
/// [`BattleScriptSetSideStatusError::MissingAttackerRole`] only.
pub fn apply_battle_script_removelightscreenreflect(
    rules: &BattleScriptSetSideStatusRules,
) -> Result<BattleScriptSetSideStatusRules, BattleScriptSetSideStatusError> {
    let attacker = require_attacker(rules)?;
    let side = rules.battlers[attacker.index()].side;
    let opposing = side.opposite();
    let timers = rules.side_timers[opposing.index()];
    let mut next = *rules;
    if timers.reflect_timer != 0 || timers.lightscreen_timer != 0 {
        next.side_statuses[opposing.index()] &=
            !(BATTLE_SCRIPT_SIDE_STATUS_REFLECT | BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN);
        next.side_timers[opposing.index()].reflect_timer = 0;
        next.side_timers[opposing.index()].lightscreen_timer = 0;
        next.anim_turn = 1;
        next.anim_targets_hit = 1;
    } else {
        next.anim_turn = 0;
        next.anim_targets_hit = 0;
    }
    Ok(next)
}

/// One committed-program instruction, narrowed to only what
/// `registerSingleInstruction` reads: opcode name (for the find-and-count
/// filter), opcode id (the registered value on success), and operand count
/// (the sole shape check -- no dispatcher check in this convention).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub operand_count: usize,
}

/// Exact registration errors from `registerSingleInstruction` (ts:218-232).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetSideStatusRegistrationError {
    WrongConcreteStartCount {
        opcode_name: &'static str,
        count: usize,
    },
    InvalidShape {
        opcode_name: &'static str,
        program_counter: u32,
    },
}

impl fmt::Display for BattleScriptSetSideStatusRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
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

impl std::error::Error for BattleScriptSetSideStatusRegistrationError {}

/// Native projection of `registerSingleInstruction`: filter instructions by
/// `opcode_name`, require exactly one match, require that match to carry
/// zero operands. No dispatcher check.
pub fn register_battle_script_set_side_status(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
    opcode_name: &'static str,
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    let matches: Vec<&BattleScriptSetSideStatusInstruction<'_>> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == opcode_name)
        .collect();
    if matches.len() != 1 {
        return Err(
            BattleScriptSetSideStatusRegistrationError::WrongConcreteStartCount {
                opcode_name,
                count: matches.len(),
            },
        );
    }
    let instruction = matches[0];
    if instruction.operand_count != 0 {
        return Err(BattleScriptSetSideStatusRegistrationError::InvalidShape {
            opcode_name,
            program_counter: instruction.program_counter,
        });
    }
    Ok(instruction.opcode_id)
}

pub fn register_battle_script_setreflect(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    register_battle_script_set_side_status(instructions, BATTLE_SCRIPT_SETREFLECT_OPCODE_NAME)
}

pub fn register_battle_script_setlightscreen(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    register_battle_script_set_side_status(instructions, BATTLE_SCRIPT_SETLIGHTSCREEN_OPCODE_NAME)
}

pub fn register_battle_script_setsafeguard(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    register_battle_script_set_side_status(instructions, BATTLE_SCRIPT_SETSAFEGUARD_OPCODE_NAME)
}

pub fn register_battle_script_setmist(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    register_battle_script_set_side_status(instructions, BATTLE_SCRIPT_SETMIST_OPCODE_NAME)
}

pub fn register_battle_script_removelightscreenreflect(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<u8, BattleScriptSetSideStatusRegistrationError> {
    register_battle_script_set_side_status(
        instructions,
        BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_OPCODE_NAME,
    )
}

/// All five resolved opcode ids after registering the complete family.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetSideStatusRegistration {
    pub setreflect_opcode_id: u8,
    pub setlightscreen_opcode_id: u8,
    pub setsafeguard_opcode_id: u8,
    pub setmist_opcode_id: u8,
    pub removelightscreenreflect_opcode_id: u8,
}

/// Registers all five family members through the shared convention.
pub fn register_battle_script_set_side_status_handlers(
    instructions: &[BattleScriptSetSideStatusInstruction<'_>],
) -> Result<BattleScriptSetSideStatusRegistration, BattleScriptSetSideStatusRegistrationError> {
    Ok(BattleScriptSetSideStatusRegistration {
        setreflect_opcode_id: register_battle_script_setreflect(instructions)?,
        setlightscreen_opcode_id: register_battle_script_setlightscreen(instructions)?,
        setsafeguard_opcode_id: register_battle_script_setsafeguard(instructions)?,
        setmist_opcode_id: register_battle_script_setmist(instructions)?,
        removelightscreenreflect_opcode_id: register_battle_script_removelightscreenreflect(
            instructions,
        )?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn battler(side: BattleScriptSetSideStatusSide) -> BattleScriptSetSideStatusBattlerState {
        BattleScriptSetSideStatusBattlerState { side }
    }

    fn clear_timer() -> BattleScriptSetSideStatusSideTimerState {
        BattleScriptSetSideStatusSideTimerState {
            reflect_timer: 0,
            reflect_battler_id: BattleScriptSetSideStatusBattler::Battler0,
            lightscreen_timer: 0,
            lightscreen_battler_id: BattleScriptSetSideStatusBattler::Battler0,
            safeguard_timer: 0,
            safeguard_battler_id: BattleScriptSetSideStatusBattler::Battler0,
            mist_battler_id: BattleScriptSetSideStatusBattler::Battler0,
        }
    }

    fn rules() -> BattleScriptSetSideStatusRules {
        BattleScriptSetSideStatusRules {
            battlers: [
                battler(BattleScriptSetSideStatusSide::Side0),
                battler(BattleScriptSetSideStatusSide::Side1),
                battler(BattleScriptSetSideStatusSide::Side0),
                battler(BattleScriptSetSideStatusSide::Side1),
            ],
            side_statuses: [0, 0],
            side_timers: [clear_timer(), clear_timer()],
            mist_timers: [0, 0],
            move_result_flags: 0,
            multistring_chooser: 0xff,
            anim_turn: 0xff,
            anim_targets_hit: 0xff,
            selector_roles: BattleScriptSetSideStatusRoles {
                attacker: Some(BattleScriptSetSideStatusBattler::Battler0),
            },
        }
    }

    #[test]
    fn setreflect_success_then_fail_when_already_active() {
        let r = rules();
        let success = apply_battle_script_setreflect(&r).unwrap();
        assert_eq!(success.side_statuses[0], BATTLE_SCRIPT_SIDE_STATUS_REFLECT);
        assert_eq!(success.side_timers[0].reflect_timer, 5);
        assert_eq!(
            success.side_timers[0].reflect_battler_id,
            BattleScriptSetSideStatusBattler::Battler0
        );
        assert_eq!(
            success.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SET_REFLECT_SINGLE
        );
        assert_eq!(success.move_result_flags, 0);

        let fail = apply_battle_script_setreflect(&success).unwrap();
        assert_eq!(fail.side_statuses[0], success.side_statuses[0]);
        assert_eq!(
            fail.side_timers[0], success.side_timers[0],
            "timers untouched on fail"
        );
        assert_eq!(fail.move_result_flags, BATTLE_SCRIPT_MOVE_RESULT_MISSED);
        assert_eq!(
            fail.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SIDE_STATUS_FAILED
        );
    }

    #[test]
    fn setlightscreen_and_setsafeguard_preserve_other_bits() {
        let mut r = rules();
        r.side_statuses[0] = BATTLE_SCRIPT_SIDE_STATUS_REFLECT;
        let after_light = apply_battle_script_setlightscreen(&r).unwrap();
        assert_eq!(
            after_light.side_statuses[0],
            BATTLE_SCRIPT_SIDE_STATUS_REFLECT | BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN
        );
        assert_eq!(after_light.side_timers[0].lightscreen_timer, 5);
        assert_eq!(
            after_light.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SET_LIGHTSCREEN_SINGLE
        );

        let after_safeguard = apply_battle_script_setsafeguard(&after_light).unwrap();
        assert_eq!(
            after_safeguard.side_statuses[0],
            BATTLE_SCRIPT_SIDE_STATUS_REFLECT
                | BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN
                | BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD
        );
        assert_eq!(after_safeguard.side_timers[0].safeguard_timer, 5);
        assert_eq!(
            after_safeguard.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SET_SAFEGUARD
        );
    }

    #[test]
    fn mist_guard_is_raw_timer_not_bit() {
        let mut r = rules();
        // Bit set, timer 0 -> still succeeds (the pinned edge case).
        r.side_statuses[0] = BATTLE_SCRIPT_SIDE_STATUS_MIST;
        let success = apply_battle_script_setmist(&r).unwrap();
        assert_eq!(success.mist_timers[0], 5);
        assert_eq!(
            success.side_timers[0].mist_battler_id,
            BattleScriptSetSideStatusBattler::Battler0
        );
        assert_eq!(success.multistring_chooser, BATTLE_SCRIPT_B_MSG_SET_MIST);
        assert_eq!(success.move_result_flags, 0);

        // Timer nonzero -> fails with FAILED flag (not MISSED) and chooser 1.
        let mut timer_set = rules();
        timer_set.mist_timers[0] = 3;
        let fail = apply_battle_script_setmist(&timer_set).unwrap();
        assert_eq!(fail.move_result_flags, BATTLE_SCRIPT_MOVE_RESULT_FAILED);
        assert_eq!(fail.multistring_chooser, BATTLE_SCRIPT_B_MSG_MIST_FAILED);
        assert_eq!(fail.mist_timers[0], 3, "timer untouched on fail");
    }

    #[test]
    fn missing_attacker_role_is_shared_verbatim_across_all_five() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        let expected = "Cmd_set<sidestatus> requires an attacker role";
        assert_eq!(
            apply_battle_script_setreflect(&r).unwrap_err().to_string(),
            expected
        );
        assert_eq!(
            apply_battle_script_setlightscreen(&r)
                .unwrap_err()
                .to_string(),
            expected
        );
        assert_eq!(
            apply_battle_script_setsafeguard(&r)
                .unwrap_err()
                .to_string(),
            expected
        );
        assert_eq!(
            apply_battle_script_setmist(&r).unwrap_err().to_string(),
            expected
        );
        assert_eq!(
            apply_battle_script_removelightscreenreflect(&r)
                .unwrap_err()
                .to_string(),
            expected
        );
    }

    #[test]
    fn removelightscreenreflect_reads_and_clears_the_opposing_side_only() {
        let mut r = rules();
        // Attacker is battler0 on side0; screens are up on the OPPOSING side1.
        r.side_statuses[1] =
            BATTLE_SCRIPT_SIDE_STATUS_REFLECT | BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN;
        r.side_timers[1].reflect_timer = 3;
        r.side_timers[1].lightscreen_timer = 4;
        r.side_statuses[0] = BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD;

        let taken = apply_battle_script_removelightscreenreflect(&r).unwrap();
        assert_eq!(taken.side_statuses[1], 0);
        assert_eq!(taken.side_timers[1].reflect_timer, 0);
        assert_eq!(taken.side_timers[1].lightscreen_timer, 0);
        assert_eq!(
            taken.side_statuses[0], BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD,
            "own side untouched"
        );
        assert_eq!(taken.anim_turn, 1);
        assert_eq!(taken.anim_targets_hit, 1);

        let not_taken = apply_battle_script_removelightscreenreflect(&rules()).unwrap();
        assert_eq!(not_taken.anim_turn, 0);
        assert_eq!(not_taken.anim_targets_hit, 0);
        assert_eq!(not_taken.side_statuses, rules().side_statuses);
    }

    #[test]
    fn registration_errors_match_convention_for_two_opcode_names() {
        let good = BattleScriptSetSideStatusInstruction {
            opcode_name: BATTLE_SCRIPT_SETREFLECT_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_SETREFLECT_OPCODE,
            program_counter: 10,
            operand_count: 0,
        };
        assert_eq!(
            register_battle_script_setreflect(&[good]).unwrap(),
            BATTLE_SCRIPT_SETREFLECT_OPCODE
        );
        assert_eq!(
            register_battle_script_setreflect(&[good, good])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_SETREFLECT requires exactly 1 concrete start, got 2"
        );
        assert_eq!(
            register_battle_script_setreflect(&[])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_SETREFLECT requires exactly 1 concrete start, got 0"
        );
        let mut with_operand = good;
        with_operand.operand_count = 1;
        assert_eq!(
            register_battle_script_setreflect(&[with_operand])
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_SETREFLECT shape at program counter 10"
        );

        let good_mist = BattleScriptSetSideStatusInstruction {
            opcode_name: BATTLE_SCRIPT_SETMIST_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_SETMIST_OPCODE,
            program_counter: 20,
            operand_count: 0,
        };
        assert_eq!(
            register_battle_script_setmist(&[good_mist]).unwrap(),
            BATTLE_SCRIPT_SETMIST_OPCODE
        );
        assert_eq!(
            register_battle_script_setmist(&[good_mist, good_mist])
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_SETMIST requires exactly 1 concrete start, got 2"
        );
        let mut mist_with_operand = good_mist;
        mist_with_operand.operand_count = 2;
        assert_eq!(
            register_battle_script_setmist(&[mist_with_operand])
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_SETMIST shape at program counter 20"
        );
    }

    #[test]
    fn battler_and_side_ids_round_trip() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptSetSideStatusBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptSetSideStatusBattler::from_u8(4), None);
        assert_eq!(
            BattleScriptSetSideStatusSide::Side0.opposite(),
            BattleScriptSetSideStatusSide::Side1
        );
        assert_eq!(
            BattleScriptSetSideStatusSide::Side1.opposite(),
            BattleScriptSetSideStatusSide::Side0
        );
    }
}
