//! Pure `B_SCR_OP_INCREMENTGAMESTAT` registration and event projection.
//!
//! This deliberately narrow native twin ports
//! `src/engine/battleScriptIncrementGameStatOpcode.ts`, not a generic Battle
//! Script machine. It validates the two committed `incrementgamestat` starts,
//! resolves their raw-u8 source expressions to typed save/meta observations,
//! requires the attacker role, gates on that battler's source side, and always
//! advances. It does not own SaveBlock counter storage, RNG, scheduler,
//! controller, message, presentation, battle-state mutation, or the WASM ABI.
//!
//! Source authority:
//! - `B_SCR_OP_INCREMENTGAMESTAT` / `0x60` dispatches to
//!   `Cmd_incrementgamestat` in
//!   `reference/pokeemerald/src/battle_script_commands.c:427`.
//! - Its body at `battle_script_commands.c:5689-5695` calls
//!   `IncrementGameStat(gBattlescriptCurrInstr[1])` only when
//!   `GetBattlerSide(gBattlerAttacker) == B_SIDE_PLAYER`, then advances two
//!   bytes.
//! - The two-byte `incrementgamestat stat:req` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:557-560`.
//! - The only committed Battle Script starts are Struggle in
//!   `data/battle_scripts_1.s:897-901` and Splash in
//!   `data/battle_scripts_1.s:1172-1181`; generated metadata ratchets their
//!   exact program counters and source expressions.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_SIDES` and the complete canonical side domain.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_SIDE_COUNT: usize = 2;

/// The only opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE_NAME: &str = "B_SCR_OP_INCREMENTGAMESTAT";

/// Source dispatch-table identity.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE: u8 = 0x60;

/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_DISPATCHER: &str = "Cmd_incrementgamestat";

/// The canonical factory requires these two and only these starts.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_CONCRETE_START_COUNT: usize = 2;

/// The macro's one raw-u8 operand width.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_OPERAND_WIDTH_BYTES: u8 = 1;

/// One opcode byte plus the raw-u8 stat operand.
pub const BATTLE_SCRIPT_INCREMENTGAMESTAT_ENCODED_WIDTH_BYTES: u8 = 2;

/// Source `GAME_STAT_USED_SPLASH` from `constants/game_stat.h:30`.
pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_SPLASH_INDEX: u8 = 26;

/// Source `GAME_STAT_USED_STRUGGLE` from `constants/game_stat.h:31`.
pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_STRUGGLE_INDEX: u8 = 27;

/// Complete source `BattleScriptBattlerId` domain used by rules arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptIncrementGameStatBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain retained for role and sibling ratchets.
pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_BATTLERS: [BattleScriptIncrementGameStatBattler;
    BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT] = [
    BattleScriptIncrementGameStatBattler::Battler0,
    BattleScriptIncrementGameStatBattler::Battler1,
    BattleScriptIncrementGameStatBattler::Battler2,
    BattleScriptIncrementGameStatBattler::Battler3,
];

impl BattleScriptIncrementGameStatBattler {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source u8 battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Source `B_SIDE_PLAYER` / `B_SIDE_OPPONENT` domain.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptIncrementGameStatSide {
    Player = 0,
    Opponent = 1,
}

/// Both canonical source side values.
pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_SIDES: [BattleScriptIncrementGameStatSide;
    BATTLE_SCRIPT_INCREMENTGAMESTAT_SIDE_COUNT] = [
    BattleScriptIncrementGameStatSide::Player,
    BattleScriptIncrementGameStatSide::Opponent,
];

impl BattleScriptIncrementGameStatSide {
    /// Zero-based source-side index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source u8 side value.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The two raw-u8 expressions that the canonical TypeScript registration
/// resolves into typed save/meta observations.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptIncrementGameStat {
    UsedSplash = BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_SPLASH_INDEX,
    UsedStruggle = BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_STRUGGLE_INDEX,
}

/// Canonical program order: Struggle first, then Splash.
pub const BATTLE_SCRIPT_INCREMENT_GAME_STATS: [BattleScriptIncrementGameStat;
    BATTLE_SCRIPT_INCREMENTGAMESTAT_CONCRETE_START_COUNT] = [
    BattleScriptIncrementGameStat::UsedStruggle,
    BattleScriptIncrementGameStat::UsedSplash,
];

impl BattleScriptIncrementGameStat {
    /// Raw-u8 game-stat index preserved by the semantic observation boundary.
    #[must_use]
    pub const fn index(self) -> u8 {
        self as u8
    }

    /// The exact source expression accepted by canonical registration.
    #[must_use]
    pub const fn source_expression(self) -> &'static str {
        match self {
            Self::UsedSplash => "GAME_STAT_USED_SPLASH",
            Self::UsedStruggle => "GAME_STAT_USED_STRUGGLE",
        }
    }

    fn from_source_expression(expression: &str) -> Option<Self> {
        match expression {
            "GAME_STAT_USED_SPLASH" => Some(Self::UsedSplash),
            "GAME_STAT_USED_STRUGGLE" => Some(Self::UsedStruggle),
            _ => None,
        }
    }
}

/// Narrow per-battler projection. The handler reads only `side`; remaining
/// fields make its strict no-write boundary executable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatBattlerState {
    pub side: BattleScriptIncrementGameStatSide,
    pub ability: u8,
    pub hp: u16,
    pub item: u16,
    pub pp: [u8; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
}

/// Selector bindings copied by the canonical no-write transition. Only the
/// attacker is read, and its absence is the exact typed-reachable error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatRoles {
    pub attacker: Option<BattleScriptIncrementGameStatBattler>,
    pub target: Option<BattleScriptIncrementGameStatBattler>,
    pub effect_battler: Option<BattleScriptIncrementGameStatBattler>,
    pub fainted: Option<BattleScriptIncrementGameStatBattler>,
}

/// Independent rules-context values retained solely to ratchet that this leaf
/// neither rewrites battle state nor repurposes controller/message machinery.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatSiblings {
    pub scripting_battler: BattleScriptIncrementGameStatBattler,
    pub current_move: u16,
    pub current_move_position: u8,
    pub move_result_flags: u8,
    pub battle_move_damage: i32,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
    pub bide_dmg: [i32; BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT],
}

/// Complete narrow state projection read or preserved by this pure leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatRules {
    pub battlers:
        [BattleScriptIncrementGameStatBattlerState; BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT],
    pub selector_roles: BattleScriptIncrementGameStatRoles,
    pub siblings: BattleScriptIncrementGameStatSiblings,
}

/// One macro operand preserved by registration-shape evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Source instruction projection evaluated by canonical registration. Source
/// labels and absolute PCs remain metadata, because the TypeScript predicate
/// itself intentionally checks only opcode identity, dispatcher, and operand
/// shape/expression.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptIncrementGameStatOperand<'a>],
}

/// The one dynamic handler-map key returned by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatRegistration {
    pub opcode_id: u8,
}

/// The source command's only control result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptIncrementGameStatControl {
    Advance,
}

/// Typed semantic observation emitted instead of mutating decoded or encrypted
/// save counters. `battleGameStatMeta.ts` owns count validity and saturation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptIncrementGameStatObservation {
    GameStatIncrement {
        game_stat: BattleScriptIncrementGameStat,
    },
}

/// Complete successful immutable handler result. An `Option` makes the
/// source's zero-or-one observation cardinality explicit: player side emits
/// exactly one, opponent side emits none.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptIncrementGameStatOutcome {
    pub rules: BattleScriptIncrementGameStatRules,
    pub control: BattleScriptIncrementGameStatControl,
    pub observation: Option<BattleScriptIncrementGameStatObservation>,
}

/// Exact registration failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptIncrementGameStatRegistrationError<'a> {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnresolvedRawU8Operand { expression: &'a str },
    ConcreteStartsDisagreeOnOpcodeId,
}

impl fmt::Display for BattleScriptIncrementGameStatRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_INCREMENTGAMESTAT requires exactly 2 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_INCREMENTGAMESTAT shape at program counter {program_counter}"
            ),
            Self::UnresolvedRawU8Operand { expression } => write!(
                formatter,
                "unresolved B_SCR_OP_INCREMENTGAMESTAT raw-u8 operand {expression}"
            ),
            Self::ConcreteStartsDisagreeOnOpcodeId => write!(
                formatter,
                "B_SCR_OP_INCREMENTGAMESTAT concrete starts disagree on opcode id"
            ),
        }
    }
}

impl std::error::Error for BattleScriptIncrementGameStatRegistrationError<'_> {}

/// Exact typed-reachable error thrown by `requireBattlerRole(..., "attacker")`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptIncrementGameStatError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptIncrementGameStatError {
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

impl std::error::Error for BattleScriptIncrementGameStatError {}

fn resolve_instruction<'a>(
    instruction: BattleScriptIncrementGameStatRegistrationInstruction<'a>,
) -> Result<BattleScriptIncrementGameStat, BattleScriptIncrementGameStatRegistrationError<'a>> {
    let [operand] = instruction.operands else {
        return Err(
            BattleScriptIncrementGameStatRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    };
    if instruction.opcode_id != BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_INCREMENTGAMESTAT_DISPATCHER
        || operand.width_bytes != BATTLE_SCRIPT_INCREMENTGAMESTAT_OPERAND_WIDTH_BYTES
    {
        return Err(
            BattleScriptIncrementGameStatRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    BattleScriptIncrementGameStat::from_source_expression(operand.expression).ok_or(
        BattleScriptIncrementGameStatRegistrationError::UnresolvedRawU8Operand {
            expression: operand.expression,
        },
    )
}

/// Native projection of
/// `createBattleScriptIncrementGameStatOpcodeHandlers(program)`.
///
/// Filtering occurs before the exact-two cardinality check. Then every
/// selected instruction is resolved in program order, so a malformed shape
/// precedes a later unknown expression and an earlier unknown expression
/// precedes later shapes exactly as canonical TypeScript does. The final
/// common-opcode check is retained even though the current strict shape makes
/// disagreement unreachable after successful validation.
pub fn register_battle_script_increment_game_stat_handler<'a>(
    instructions: &[BattleScriptIncrementGameStatRegistrationInstruction<'a>],
) -> Result<
    BattleScriptIncrementGameStatRegistration,
    BattleScriptIncrementGameStatRegistrationError<'a>,
> {
    let selected_count = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE_NAME
        })
        .count();
    if selected_count != BATTLE_SCRIPT_INCREMENTGAMESTAT_CONCRETE_START_COUNT {
        return Err(
            BattleScriptIncrementGameStatRegistrationError::IncorrectConcreteStartCount {
                count: selected_count,
            },
        );
    }

    let mut common_opcode_id = None;
    for instruction in instructions.iter().copied().filter(|instruction| {
        instruction.opcode_name == BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE_NAME
    }) {
        let _game_stat = resolve_instruction(instruction)?;
        if let Some(opcode_id) = common_opcode_id {
            if instruction.opcode_id != opcode_id {
                return Err(
                    BattleScriptIncrementGameStatRegistrationError::ConcreteStartsDisagreeOnOpcodeId,
                );
            }
        } else {
            common_opcode_id = Some(instruction.opcode_id);
        }
    }

    let opcode_id = common_opcode_id.expect("exactly two selected instructions set an opcode id");
    Ok(BattleScriptIncrementGameStatRegistration { opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_incrementgamestat` after
/// successful opcode registration has resolved the source expression.
///
/// Attacker resolution occurs before the side gate. A player-side attacker
/// emits exactly one typed observation; an opponent-side attacker emits none.
/// Both successful paths advance and preserve every projected state value.
pub fn apply_battle_script_increment_game_stat(
    game_stat: BattleScriptIncrementGameStat,
    rules: &BattleScriptIncrementGameStatRules,
) -> Result<BattleScriptIncrementGameStatOutcome, BattleScriptIncrementGameStatError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptIncrementGameStatError::MissingAttackerRole)?;
    let observation = (rules.battlers[attacker.index()].side
        == BattleScriptIncrementGameStatSide::Player)
        .then_some(BattleScriptIncrementGameStatObservation::GameStatIncrement { game_stat });

    Ok(BattleScriptIncrementGameStatOutcome {
        rules: *rules,
        control: BattleScriptIncrementGameStatControl::Advance,
        observation,
    })
}
