//! Pure `B_SCR_OP_GETSECRETPOWEREFFECT` registration and handler leaf.
//!
//! This is the machine-independent port of canonical
//! `battleScriptGetSecretPowerEffectOpcode.ts`. Registration filters the
//! committed program by opcode name, requires exactly the one concrete
//! start, validates its zero-operand shape, and binds the handler to that
//! opcode id. Execution maps the source `u8` `gBattleEnvironment` to a
//! `MOVE_EFFECT_*` byte and writes only `moveEffectByte`; every other field
//! is untouched, no jump target is consulted, and the command cannot fail.
//! No state, RNG, event, scheduler, presentation, or WASM boundary is owned
//! here.
//!
//! Source authority is `Cmd_getsecretpowereffect` in
//! `reference/pokeemerald/src/battle_script_commands.c:9619-9652`;
//! dispatch is `:559` (`//0xE4`), forward declaration `:307`. The single
//! operandless `getsecretpowereffect` macro is
//! `asm/macros/battle_script.inc:1165-1167`; its sole committed call site is
//! `BattleScript_EffectSecretPower` in `data/battle_scripts_1.s:2563-2565`.
//! Environment ids and `MOVE_EFFECT_*` values are
//! `include/constants/battle.h:313-322,247-274` and `MOVE_EFFECT_BYTE` is
//! `include/constants/battle_script_commands.h:292`.

use core::fmt;

pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_BATTLER_COUNT: usize = 4;
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE_NAME: &str = "B_SCR_OP_GETSECRETPOWEREFFECT";
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE: u8 = 0xe4;
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DISPATCHER: &str = "Cmd_getsecretpowereffect";
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CONCRETE_START_COUNT: usize = 1;
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_ENCODED_WIDTH_BYTES: u8 = 1;

/// `include/constants/battle_script_commands.h:292` -- the
/// `gBattleCommunication` slot this opcode writes.
pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_MOVE_EFFECT_BYTE_INDEX: u8 = 3;

/// `include/constants/battle.h:247` -- `MOVE_EFFECT_SLEEP`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_SLEEP: u8 = 1;
/// `include/constants/battle.h:248` -- `MOVE_EFFECT_POISON`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_POISON: u8 = 2;
/// `include/constants/battle.h:251` -- `MOVE_EFFECT_PARALYSIS`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_PARALYSIS: u8 = 5;
/// `include/constants/battle.h:254` -- `MOVE_EFFECT_CONFUSION`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_CONFUSION: u8 = 7;
/// `include/constants/battle.h:255` -- `MOVE_EFFECT_FLINCH`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_FLINCH: u8 = 8;
/// `include/constants/battle.h:268` -- `MOVE_EFFECT_ATK_MINUS_1`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_ATK_MINUS_1: u8 = 22;
/// `include/constants/battle.h:269` -- `MOVE_EFFECT_DEF_MINUS_1`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_DEF_MINUS_1: u8 = 23;
/// `include/constants/battle.h:270` -- `MOVE_EFFECT_SPD_MINUS_1`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_SPD_MINUS_1: u8 = 24;
/// `include/constants/battle.h:274` -- `MOVE_EFFECT_ACC_MINUS_1`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_ACC_MINUS_1: u8 = 27;

/// `include/constants/battle.h:313-322` -- the eight named
/// `BATTLE_ENVIRONMENT_*` values `Cmd_getsecretpowereffect`'s `switch`
/// distinguishes. Every other raw `u8`, including `BUILDING`(8) and
/// `PLAIN`(9), falls through to the `default` arm.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptGetsecretpowereffectEnvironment {
    Grass = 0,
    LongGrass = 1,
    Sand = 2,
    Underwater = 3,
    Water = 4,
    Pond = 5,
    Mountain = 6,
    Cave = 7,
}

impl BattleScriptGetsecretpowereffectEnvironment {
    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Grass),
            1 => Some(Self::LongGrass),
            2 => Some(Self::Sand),
            3 => Some(Self::Underwater),
            4 => Some(Self::Water),
            5 => Some(Self::Pond),
            6 => Some(Self::Mountain),
            7 => Some(Self::Cave),
            _ => None,
        }
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Native twin of `secretPowerMoveEffectForEnvironment`. The source `switch`
/// covers the complete raw `u8` domain: eight named cases plus a `default`
/// arm every other value (including `BUILDING`, `PLAIN`, and every unnamed
/// id up to `0xff`) falls through to.
#[must_use]
pub const fn battle_script_getsecretpowereffect_move_effect_for_environment(
    g_battle_environment: u8,
) -> u8 {
    match BattleScriptGetsecretpowereffectEnvironment::from_u8(g_battle_environment) {
        Some(BattleScriptGetsecretpowereffectEnvironment::Grass) => {
            BATTLE_SCRIPT_MOVE_EFFECT_POISON
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::LongGrass) => {
            BATTLE_SCRIPT_MOVE_EFFECT_SLEEP
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Sand) => {
            BATTLE_SCRIPT_MOVE_EFFECT_ACC_MINUS_1
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Underwater) => {
            BATTLE_SCRIPT_MOVE_EFFECT_DEF_MINUS_1
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Water) => {
            BATTLE_SCRIPT_MOVE_EFFECT_ATK_MINUS_1
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Pond) => {
            BATTLE_SCRIPT_MOVE_EFFECT_SPD_MINUS_1
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Mountain) => {
            BATTLE_SCRIPT_MOVE_EFFECT_CONFUSION
        }
        Some(BattleScriptGetsecretpowereffectEnvironment::Cave) => BATTLE_SCRIPT_MOVE_EFFECT_FLINCH,
        None => BATTLE_SCRIPT_MOVE_EFFECT_PARALYSIS,
    }
}

/// Complete source `BattleScriptBattlerId` domain used by the salted
/// immutability projection below.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptGetsecretpowereffectBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptGetsecretpowereffectBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// One battler's fields the handler must never touch, kept narrow but wide
/// enough to prove the leaf's no-write boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub item: u16,
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
}

/// Selector-role bindings the handler must never touch or consult; this
/// opcode reads no battler role at all.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectRoles {
    pub attacker: Option<u8>,
    pub target: Option<u8>,
    pub effect_battler: Option<u8>,
    pub fainted: Option<u8>,
}

/// Independent rules-context values retained solely to ratchet that this
/// leaf neither reads nor rewrites unrelated battle, RNG-adjacent, or
/// scripting state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectSiblings {
    pub battlers: [BattleScriptGetsecretpowereffectBattlerState;
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_BATTLER_COUNT],
    pub selector_roles: BattleScriptGetsecretpowereffectRoles,
    pub current_move: u16,
    pub hit_marker: u32,
}

/// Complete narrow projection read or written by the opcode: the source
/// `u8` environment it reads, the `u8` communication byte it replaces, and
/// the salted sibling state proving every other field is untouched.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectRules {
    pub g_battle_environment: u8,
    pub move_effect_byte: u8,
    pub siblings: BattleScriptGetsecretpowereffectSiblings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptGetsecretpowereffectRegistrationError {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptGetsecretpowereffectRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_GETSECRETPOWEREFFECT requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_GETSECRETPOWEREFFECT shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptGetsecretpowereffectRegistrationError {}

/// Canonical registration projection. Cardinality is checked before shape,
/// matching `createBattleScriptGetSecretPowerEffectOpcodeHandlers`'s exact
/// evaluation order.
pub fn register_battle_script_getsecretpowereffect_handler<'a>(
    instructions: &[BattleScriptGetsecretpowereffectRegistrationInstruction<'a>],
) -> Result<
    BattleScriptGetsecretpowereffectRegistration,
    BattleScriptGetsecretpowereffectRegistrationError,
> {
    let mut first = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE_NAME {
            count += 1;
            if first.is_none() {
                first = Some(*instruction);
            }
        }
    }
    if count != BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CONCRETE_START_COUNT {
        return Err(
            BattleScriptGetsecretpowereffectRegistrationError::IncorrectConcreteStartCount {
                count,
            },
        );
    }
    let instruction = first.expect("one selected start after count check");
    if instruction.opcode_id != BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(
            BattleScriptGetsecretpowereffectRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(BattleScriptGetsecretpowereffectRegistration { opcode_id: instruction.opcode_id })
}

/// The sole control result for this unconditional, operand-free command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptGetsecretpowereffectControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectOutcome {
    pub rules: BattleScriptGetsecretpowereffectRules,
    pub control: BattleScriptGetsecretpowereffectControl,
}

/// Native immutable-value twin of the pure state transformation performed
/// by `Cmd_getsecretpowereffect`'s TypeScript handler.
///
/// It reads no selector role and can never fail: exactly one field,
/// `move_effect_byte`, is replaced by the pure environment mapping, and
/// every sibling value -- battlers, roles, and the remaining rules-context
/// fields this leaf carries -- passes through unchanged.
#[must_use]
pub fn apply_battle_script_getsecretpowereffect(
    rules: &BattleScriptGetsecretpowereffectRules,
) -> BattleScriptGetsecretpowereffectOutcome {
    let mut next = *rules;
    next.move_effect_byte =
        battle_script_getsecretpowereffect_move_effect_for_environment(rules.g_battle_environment);
    BattleScriptGetsecretpowereffectOutcome {
        rules: next,
        control: BattleScriptGetsecretpowereffectControl::Advance,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub switch_line: u32,
    pub grass_assign_line: u32,
    pub long_grass_assign_line: u32,
    pub sand_assign_line: u32,
    pub underwater_assign_line: u32,
    pub water_assign_line: u32,
    pub pond_assign_line: u32,
    pub mountain_assign_line: u32,
    pub cave_assign_line: u32,
    pub default_assign_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptGetsecretpowereffectDecompDispatchEvidence =
    BattleScriptGetsecretpowereffectDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_GETSECRETPOWEREFFECT_OPCODE,
        dispatcher: BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DISPATCHER,
        dispatch_line: 559,
        forward_decl_line: 307,
        handler_line: 9619,
        switch_line: 9621,
        grass_assign_line: 9624,
        long_grass_assign_line: 9627,
        sand_assign_line: 9630,
        underwater_assign_line: 9633,
        water_assign_line: 9636,
        pond_assign_line: 9639,
        mountain_assign_line: 9642,
        cave_assign_line: 9645,
        default_assign_line: 9648,
        advance_line: 9651,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_MACRO_EVIDENCE:
    BattleScriptGetsecretpowereffectMacroEvidence = BattleScriptGetsecretpowereffectMacroEvidence {
    declaration_line: 1165,
    opcode_line: 1166,
    encoded_width_bytes: BATTLE_SCRIPT_GETSECRETPOWEREFFECT_ENCODED_WIDTH_BYTES,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptGetsecretpowereffectCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub goto_line: u32,
    pub goto_target: &'static str,
}

pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CALL_SITE_EVIDENCE:
    BattleScriptGetsecretpowereffectCallSiteEvidence =
    BattleScriptGetsecretpowereffectCallSiteEvidence {
        entry_label: "BattleScript_EffectSecretPower",
        entry_label_line: 2563,
        statement_line: 2564,
        instruction_program_counter: 1835,
        goto_line: 2565,
        goto_target: "BattleScript_EffectHit",
    };
