//! Pure `B_SCR_OP_SETRAIN` / `SETSUNNY` / `SETSANDSTORM` / `SETHAIL`
//! registration and state/control family.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptSetWeatherOpcode.ts`. Each operand-free command
//! observes only whether *its own* weather family is active. A same-weather
//! attempt ORs `MOVE_RESULT_MISSED` and selects `B_MSG_WEATHER_FAILED`; every
//! other attempt replaces the entire weather word with that command's
//! temporary bit, sets the shared weather timer to five, and selects its
//! success message. Every successful handler application advances one
//! instruction and does not need RNG, scheduler, controller, or presentation
//! state.
//!
//! Source authority:
//! - `Cmd_setrain`, `Cmd_setsandstorm`, `Cmd_setsunny`, and `Cmd_sethail` are
//!   in `reference/pokeemerald/src/battle_script_commands.c:6681-6696`,
//!   `:7586-7601`, `:8767-8783`, and `:9055-9071` respectively.
//! - Their operandless macros are `asm/macros/battle_script.inc:694-696`,
//!   `:802-804`, `:972-974`, and `:1030-1032`; the sole effect-script calls
//!   are `data/battle_scripts_1.s:1744-1749`, `:1589-1594`, `:1757-1762`,
//!   and `:2132-2137` respectively.
//! - Weather masks are in `include/constants/battle.h:232-244`, and
//!   `gMoveWeatherChangeStringIds` supplies the chooser values in
//!   `src/battle_message.c:908-916`.
//!
//! The canonical TypeScript registration factory intentionally checks only
//! concrete-start cardinality and zero operands. It does *not* validate a
//! selected instruction's opcode id or dispatcher; this native factory keeps
//! that observable shape exactly. The independently generated corpus ratchets
//! the real source ids and dispatchers instead. This leaf owns neither a
//! generic battle-script machine nor its scheduler/RNG/events transport.

use core::fmt;

/// Source `MOVE_RESULT_MISSED` from `include/constants/battle.h:221`.
pub const BATTLE_SCRIPT_MOVE_RESULT_MISSED: u32 = 1 << 0;

/// `B_MSG_STARTED_RAIN` in `gMoveWeatherChangeStringIds`.
pub const BATTLE_SCRIPT_B_MSG_STARTED_RAIN: u8 = 0;
/// `B_MSG_WEATHER_FAILED` in `gMoveWeatherChangeStringIds`.
pub const BATTLE_SCRIPT_B_MSG_WEATHER_FAILED: u8 = 2;
/// `B_MSG_STARTED_SANDSTORM` in `gMoveWeatherChangeStringIds`.
pub const BATTLE_SCRIPT_B_MSG_STARTED_SANDSTORM: u8 = 3;
/// `B_MSG_STARTED_SUNLIGHT` in `gMoveWeatherChangeStringIds`.
pub const BATTLE_SCRIPT_B_MSG_STARTED_SUNLIGHT: u8 = 4;
/// `B_MSG_STARTED_HAIL` in `gMoveWeatherChangeStringIds`.
pub const BATTLE_SCRIPT_B_MSG_STARTED_HAIL: u8 = 5;

/// The source `gWishFutureKnock.weatherDuration` value written by all four
/// successful commands.
pub const BATTLE_SCRIPT_SETWEATHER_DURATION: u8 = 5;

/// The four family members in the canonical TypeScript registration order.
/// The order is load-bearing for both factory validation failures and dynamic
/// opcode-id collisions in the returned handler object.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptSetweatherKind {
    Rain = 0,
    Sunny = 1,
    Sandstorm = 2,
    Hail = 3,
}

/// Canonical `createBattleScriptSetWeatherOpcodeHandlers` registration order.
pub const BATTLE_SCRIPT_SETWEATHER_KINDS: [BattleScriptSetweatherKind; 4] = [
    BattleScriptSetweatherKind::Rain,
    BattleScriptSetweatherKind::Sunny,
    BattleScriptSetweatherKind::Sandstorm,
    BattleScriptSetweatherKind::Hail,
];

/// A source-derived weather family configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherConfig {
    /// Any bit which means this family is currently active.
    pub active_mask: u32,
    /// The temporary bit written by a successful move.
    pub temporary_bit: u32,
    /// `gMoveWeatherChangeStringIds` selector for a successful move.
    pub success_chooser: u8,
}

impl BattleScriptSetweatherKind {
    /// Concrete instruction name selected by the TypeScript factory.
    #[must_use]
    pub const fn opcode_name(self) -> &'static str {
        match self {
            Self::Rain => "B_SCR_OP_SETRAIN",
            Self::Sunny => "B_SCR_OP_SETSUNNY",
            Self::Sandstorm => "B_SCR_OP_SETSANDSTORM",
            Self::Hail => "B_SCR_OP_SETHAIL",
        }
    }

    /// Real source opcode id. The registration factory deliberately does not
    /// consult this value; vector generation independently ratchets it.
    #[must_use]
    pub const fn source_opcode_id(self) -> u8 {
        match self {
            Self::Rain => 0x7d,
            Self::Sunny => 0xbb,
            Self::Sandstorm => 0x95,
            Self::Hail => 0xc8,
        }
    }

    /// Real source dispatcher. The registration factory deliberately does not
    /// consult this value; vector generation independently ratchets it.
    #[must_use]
    pub const fn source_dispatcher(self) -> &'static str {
        match self {
            Self::Rain => "Cmd_setrain",
            Self::Sunny => "Cmd_setsunny",
            Self::Sandstorm => "Cmd_setsandstorm",
            Self::Hail => "Cmd_sethail",
        }
    }

    /// Exact source mask, temporary bit, and success chooser for this command.
    #[must_use]
    pub const fn config(self) -> BattleScriptSetweatherConfig {
        match self {
            Self::Rain => BattleScriptSetweatherConfig {
                active_mask: (1 << 0) | (1 << 1) | (1 << 2),
                temporary_bit: 1 << 0,
                success_chooser: BATTLE_SCRIPT_B_MSG_STARTED_RAIN,
            },
            Self::Sunny => BattleScriptSetweatherConfig {
                active_mask: (1 << 5) | (1 << 6),
                temporary_bit: 1 << 5,
                success_chooser: BATTLE_SCRIPT_B_MSG_STARTED_SUNLIGHT,
            },
            Self::Sandstorm => BattleScriptSetweatherConfig {
                active_mask: (1 << 3) | (1 << 4),
                temporary_bit: 1 << 3,
                success_chooser: BATTLE_SCRIPT_B_MSG_STARTED_SANDSTORM,
            },
            Self::Hail => BattleScriptSetweatherConfig {
                active_mask: 1 << 7,
                temporary_bit: 1 << 7,
                success_chooser: BATTLE_SCRIPT_B_MSG_STARTED_HAIL,
            },
        }
    }
}

/// Exact source ids in canonical factory order. This is an identity ratchet,
/// not an added registration predicate.
pub const BATTLE_SCRIPT_SETWEATHER_SOURCE_OPCODE_IDS: [u8; 4] = [0x7d, 0xbb, 0x95, 0xc8];

/// Exact source dispatchers in canonical factory order. This is an identity
/// ratchet, not an added registration predicate.
pub const BATTLE_SCRIPT_SETWEATHER_SOURCE_DISPATCHERS: [&str; 4] = [
    "Cmd_setrain",
    "Cmd_setsunny",
    "Cmd_setsandstorm",
    "Cmd_sethail",
];

/// Selected instruction projection. The actual factory uses `opcode_name`,
/// `program_counter`, `opcode_id`, and the observable operand array length;
/// `dispatcher` is retained only to independently ratchet source extraction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

/// Selected map entry after the TypeScript-equivalent object spreads.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct BattleScriptSetweatherBinding {
    pub opcode_id: u8,
    pub kind: BattleScriptSetweatherKind,
}

/// Exact failures exposed by the canonical four-instruction registration
/// factory. It has no handler-time error branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetweatherRegistrationError {
    ExpectedExactlyOneConcreteStart {
        opcode_name: &'static str,
        count: usize,
    },
    InvalidInstructionShape {
        opcode_name: &'static str,
        program_counter: u32,
    },
}

impl fmt::Display for BattleScriptSetweatherRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedExactlyOneConcreteStart { opcode_name, count } => write!(
                formatter,
                "{opcode_name} requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { opcode_name, program_counter } => write!(
                formatter,
                "invalid {opcode_name} shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptSetweatherRegistrationError {}

/// The observable handler-map portion of the TypeScript factory result.
///
/// A JavaScript property key is an opcode id and later object spreads replace
/// an earlier entry with the same key. A fixed 256-cell map captures that
/// behavior without a dependency or allocation while keeping lookup exact.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherRegistration {
    handlers: [Option<BattleScriptSetweatherKind>; 256],
}

impl BattleScriptSetweatherRegistration {
    /// Return the final handler kind assigned to this source-byte opcode id.
    #[must_use]
    pub const fn handler_for_opcode(&self, opcode_id: u8) -> Option<BattleScriptSetweatherKind> {
        self.handlers[opcode_id as usize]
    }

    /// Enumerate final object keys in numeric order, matching the order used
    /// by JavaScript for these non-negative integer property names.
    pub fn bindings(&self) -> impl Iterator<Item = BattleScriptSetweatherBinding> + '_ {
        self.handlers
            .iter()
            .enumerate()
            .filter_map(|(opcode_id, kind)| {
                kind.map(|kind| BattleScriptSetweatherBinding { opcode_id: opcode_id as u8, kind })
            })
    }
}

fn select_single_instruction<'a>(
    instructions: &'a [BattleScriptSetweatherInstruction<'a>],
    kind: BattleScriptSetweatherKind,
) -> Result<BattleScriptSetweatherInstruction<'a>, BattleScriptSetweatherRegistrationError> {
    let opcode_name = kind.opcode_name();
    let mut matches = instructions
        .iter()
        .copied()
        .filter(|instruction| instruction.opcode_name == opcode_name);
    let selected = matches.next();
    let count = usize::from(selected.is_some()) + matches.count();
    if count != 1 {
        return Err(
            BattleScriptSetweatherRegistrationError::ExpectedExactlyOneConcreteStart {
                opcode_name,
                count,
            },
        );
    }
    let instruction = selected.expect("exactly one selected instruction must exist");
    if instruction.operand_count != 0 {
        return Err(
            BattleScriptSetweatherRegistrationError::InvalidInstructionShape {
                opcode_name,
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(instruction)
}

/// Native projection of `createBattleScriptSetWeatherOpcodeHandlers(program)`.
///
/// The four calls deliberately remain sequential in TypeScript order: Rain,
/// Sunny, Sandstorm, Hail. For each, name-filtered cardinality is checked
/// before the selected operand count. Neither dynamic opcode id nor dispatcher
/// is a factory shape predicate in the canonical TypeScript implementation.
/// Once all four selections are valid, assignment happens in the same order so
/// later dynamic-id collisions replace earlier handlers just as object spread
/// does in JavaScript.
pub fn register_battle_script_setweather_handlers<'a>(
    instructions: &'a [BattleScriptSetweatherInstruction<'a>],
) -> Result<BattleScriptSetweatherRegistration, BattleScriptSetweatherRegistrationError> {
    let rain = select_single_instruction(instructions, BattleScriptSetweatherKind::Rain)?;
    let sunny = select_single_instruction(instructions, BattleScriptSetweatherKind::Sunny)?;
    let sandstorm = select_single_instruction(instructions, BattleScriptSetweatherKind::Sandstorm)?;
    let hail = select_single_instruction(instructions, BattleScriptSetweatherKind::Hail)?;

    let mut handlers = [None; 256];
    for (instruction, kind) in [
        (rain, BattleScriptSetweatherKind::Rain),
        (sunny, BattleScriptSetweatherKind::Sunny),
        (sandstorm, BattleScriptSetweatherKind::Sandstorm),
        (hail, BattleScriptSetweatherKind::Hail),
    ] {
        handlers[instruction.opcode_id as usize] = Some(kind);
    }
    Ok(BattleScriptSetweatherRegistration { handlers })
}

/// A small set of real rules-context siblings that the canonical object spread
/// preserves. These are not a generic `BattleScriptRulesContext` replacement;
/// they make the narrow immutable-value result prove that unrelated weather,
/// side, delayed-effect, battle-communication, and battler state survives.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherSiblings {
    pub hit_marker: u32,
    pub random_turn_number: u16,
    pub side_statuses: [u32; 2],
    pub mist_timers: [u8; 2],
    pub wish_counter: [u8; 4],
    pub future_sight_counter: [u8; 4],
    pub battle_communication0: u8,
    pub battler_statuses: [[u32; 3]; 4],
}

/// Complete narrow state projection read or written by this weather family.
/// `weather` and `move_result_flags` preserve the full `u32` JavaScript
/// bitwise domain; the source-valid context constructor narrows the latter to
/// a byte, but the canonical handler itself uses `>>> 0` and direct handler
/// calls retain all high-bit behavior. The timer and chooser are source `u8`s.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherRules {
    pub weather: u32,
    pub weather_timer: u8,
    pub move_result_flags: u32,
    pub multistring_chooser: u8,
    pub siblings: BattleScriptSetweatherSiblings,
}

/// The one control directive returned by every member of this family.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetweatherControl {
    Advance,
}

/// Complete immutable projected output from one command application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetweatherOutcome {
    pub rules: BattleScriptSetweatherRules,
    pub control: BattleScriptSetweatherControl,
}

/// Native immutable-value twin of one canonical weather setter handler.
///
/// There is no role lookup, random draw, emitted semantic event, or branch
/// beyond the same-family weather mask. Failure preserves weather/timer and
/// every sibling while ORing only the missed flag and overwriting the chooser.
/// Success flatly replaces *all* weather bits (rather than ORing), writes five
/// to the shared timer, preserves move-result flags and every sibling, and
/// overwrites the chooser. Both branches return `Advance`.
#[must_use]
pub fn apply_battle_script_setweather(
    kind: BattleScriptSetweatherKind,
    rules: &BattleScriptSetweatherRules,
) -> BattleScriptSetweatherOutcome {
    let config = kind.config();
    let mut next = *rules;
    if rules.weather & config.active_mask != 0 {
        next.move_result_flags |= BATTLE_SCRIPT_MOVE_RESULT_MISSED;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_WEATHER_FAILED;
    } else {
        next.weather = config.temporary_bit;
        next.weather_timer = BATTLE_SCRIPT_SETWEATHER_DURATION;
        next.multistring_chooser = config.success_chooser;
    }
    BattleScriptSetweatherOutcome { rules: next, control: BattleScriptSetweatherControl::Advance }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SIBLINGS: BattleScriptSetweatherSiblings = BattleScriptSetweatherSiblings {
        hit_marker: 0x8000_0001,
        random_turn_number: 0xffff,
        side_statuses: [0x0123_4567, 0x89ab_cdef],
        mist_timers: [0x12, 0xfe],
        wish_counter: [1, 2, 3, 4],
        future_sight_counter: [5, 6, 7, 8],
        battle_communication0: 0xa5,
        battler_statuses: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]],
    };

    const fn instruction(
        kind: BattleScriptSetweatherKind,
        opcode_id: u8,
    ) -> BattleScriptSetweatherInstruction<'static> {
        BattleScriptSetweatherInstruction {
            opcode_name: kind.opcode_name(),
            program_counter: 100,
            opcode_id,
            dispatcher: kind.source_dispatcher(),
            operand_count: 0,
        }
    }

    fn rules(weather: u32) -> BattleScriptSetweatherRules {
        BattleScriptSetweatherRules {
            weather,
            weather_timer: u8::MAX,
            move_result_flags: 0x8000_0040,
            multistring_chooser: 0xfe,
            siblings: SIBLINGS,
        }
    }

    #[test]
    fn success_clobbers_other_weather_and_failure_preserves_it() {
        let success_input = rules(BattleScriptSetweatherKind::Rain.config().active_mask);
        let success =
            apply_battle_script_setweather(BattleScriptSetweatherKind::Sunny, &success_input);
        assert_eq!(success.control, BattleScriptSetweatherControl::Advance);
        assert_eq!(success.rules.weather, 1 << 5);
        assert_eq!(success.rules.weather_timer, 5);
        assert_eq!(
            success.rules.move_result_flags,
            success_input.move_result_flags
        );
        assert_eq!(success.rules.siblings, success_input.siblings);

        let failure_input = rules(BattleScriptSetweatherKind::Hail.config().temporary_bit);
        let failure =
            apply_battle_script_setweather(BattleScriptSetweatherKind::Hail, &failure_input);
        assert_eq!(failure.control, BattleScriptSetweatherControl::Advance);
        assert_eq!(failure.rules.weather, failure_input.weather);
        assert_eq!(failure.rules.weather_timer, failure_input.weather_timer);
        assert_eq!(
            failure.rules.move_result_flags,
            failure_input.move_result_flags | BATTLE_SCRIPT_MOVE_RESULT_MISSED
        );
        assert_eq!(
            failure.rules.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_WEATHER_FAILED
        );
        assert_eq!(failure.rules.siblings, failure_input.siblings);
    }

    #[test]
    fn registration_keeps_ts_shape_and_later_id_collision_wins() {
        let input = [
            BattleScriptSetweatherInstruction {
                opcode_id: 0x2a,
                dispatcher: "not_checked",
                ..instruction(BattleScriptSetweatherKind::Rain, 0x2a)
            },
            BattleScriptSetweatherInstruction {
                opcode_id: 0x2a,
                dispatcher: "also_not_checked",
                ..instruction(BattleScriptSetweatherKind::Sunny, 0x2a)
            },
            instruction(BattleScriptSetweatherKind::Sandstorm, 0x2a),
            instruction(BattleScriptSetweatherKind::Hail, 0x2a),
        ];
        let registered = register_battle_script_setweather_handlers(&input)
            .expect("ids and dispatchers are not canonical factory predicates");
        assert_eq!(
            registered.handler_for_opcode(0x2a),
            Some(BattleScriptSetweatherKind::Hail)
        );
        assert_eq!(
            registered.bindings().collect::<Vec<_>>(),
            vec![BattleScriptSetweatherBinding {
                opcode_id: 0x2a,
                kind: BattleScriptSetweatherKind::Hail,
            }]
        );
    }

    #[test]
    fn registration_stops_in_canonical_order_and_checks_operands_after_cardinality() {
        let rain = instruction(BattleScriptSetweatherKind::Rain, 1);
        let sunny = BattleScriptSetweatherInstruction {
            operand_count: 1,
            ..instruction(BattleScriptSetweatherKind::Sunny, 2)
        };
        assert_eq!(
            register_battle_script_setweather_handlers(&[rain, sunny])
                .expect_err("sunny shape follows valid rain")
                .to_string(),
            "invalid B_SCR_OP_SETSUNNY shape at program counter 100"
        );
        assert_eq!(
            register_battle_script_setweather_handlers(&[sunny])
                .expect_err("rain cardinality precedes sunny shape")
                .to_string(),
            "B_SCR_OP_SETRAIN requires exactly 1 concrete start, got 0"
        );
    }
}
