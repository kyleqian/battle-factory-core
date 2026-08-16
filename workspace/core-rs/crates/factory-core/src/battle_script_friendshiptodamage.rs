//! Pure `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` state transformation and
//! control result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptFriendshipToDamageOpcode.ts`. The registration
//! projection retains the canonical opcode/dispatcher/zero-operand checks;
//! the handler projection resolves the optional attacker first, validates its
//! source `u8` friendship, computes Return or Frustration power with source
//! integer division, writes only `dynamicBasePower`, and advances.
//!
//! Source authority:
//! - `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` is `0xB6` in
//!   `reference/pokeemerald/include/constants/battle_script_commands.h:188`
//!   and dispatches to `Cmd_friendshiptodamagecalculation` at
//!   `reference/pokeemerald/src/battle_script_commands.c:513`.
//! - The command body is at `battle_script_commands.c:8603-8611`. It uses
//!   `(10 * friendship) / 25` for Return and
//!   `(10 * (MAX_FRIENDSHIP - friendship)) / 25` for Frustration.
//! - The zero-operand `friendshiptodamagecalculation` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:951-953`.
//! - `BattleScript_EffectReturn` and `BattleScript_EffectFrustration` share
//!   that one instruction at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1657-1662`; their concrete
//!   move rows are `MOVE_RETURN` / `MOVE_FRUSTRATION` at
//!   `reference/pokeemerald/src/data/battle_moves.h:2811-2847`.
//!
//! The source field is a `u8`, but TypeScript's exported scalar validates the
//! runtime `number` before calculating. `BattleScriptFriendship` therefore
//! preserves an IEEE-754 number rather than silently coercing malformed
//! hand-built native inputs. This lets the leaf retain TypeScript's precise
//! missing-attacker -> invalid-friendship -> unreachable-effect error order
//! without widening any WASM ABI surface.
//!
//! This leaf deliberately owns neither a generic Battle Script machine,
//! absolute cursor, scheduler/RNG state, damage calculation, controller state,
//! presentation, adapter, nor WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; the canonical rules projection carries four
/// source-indexed active battler records even in Factory singles battles.
pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_COUNT: usize = 4;

/// Source opcode name retained by registration validation.
pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE_NAME: &str =
    "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION";

/// `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` from the source command table.
pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE: u8 = 0xb6;

/// Source dispatcher retained by registration validation.
pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DISPATCHER: &str = "Cmd_friendshiptodamagecalculation";

/// `EFFECT_RETURN`, the first and only non-fallback source branch.
pub const BATTLE_SCRIPT_EFFECT_RETURN: u8 = 121;

/// `EFFECT_FRUSTRATION`, the other concrete script-reachable effect.
pub const BATTLE_SCRIPT_EFFECT_FRUSTRATION: u8 = 123;

/// Source `MAX_FRIENDSHIP` and the inclusive upper bound of `u8 friendship`.
pub const BATTLE_SCRIPT_MAX_FRIENDSHIP: u8 = u8::MAX;

/// The shared denominator in both source expressions.
pub const BATTLE_SCRIPT_FRIENDSHIP_POWER_DIVISOR: u16 = 25;

/// The source integer multiplier in both source expressions.
pub const BATTLE_SCRIPT_FRIENDSHIP_POWER_MULTIPLIER: u16 = 10;

/// Complete source `BattleScriptBattlerId` domain used by selector roles and
/// the indexed active-battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptFriendshiptodamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for selector-alias and sibling
/// preservation ratchets.
pub const BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLERS: [BattleScriptFriendshiptodamageBattler;
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_COUNT] = [
    BattleScriptFriendshiptodamageBattler::Battler0,
    BattleScriptFriendshiptodamageBattler::Battler1,
    BattleScriptFriendshiptodamageBattler::Battler2,
    BattleScriptFriendshiptodamageBattler::Battler3,
];

impl BattleScriptFriendshiptodamageBattler {
    /// Zero-based source array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Runtime-number representation of source `gBattleMons[battler].friendship`.
///
/// Valid source states use [`Self::from_u8`]. The bit-preserving constructor
/// is intentionally public for native differential vectors that exercise the
/// TypeScript helper's defensive `Number.isSafeInteger` validation.
#[derive(Debug, Clone, Copy)]
pub struct BattleScriptFriendship(f64);

impl BattleScriptFriendship {
    /// Constructs a source-valid friendship value.
    #[must_use]
    pub const fn from_u8(value: u8) -> Self {
        Self(value as f64)
    }

    /// Reconstructs the exact JavaScript `Number` bit pattern used by a
    /// differential vector, including NaN and infinities.
    #[must_use]
    pub const fn from_bits(bits: u64) -> Self {
        Self(f64::from_bits(bits))
    }

    /// Exact IEEE-754 representation, used for deterministic corpus output.
    #[must_use]
    pub const fn to_bits(self) -> u64 {
        self.0.to_bits()
    }

    /// Returns the raw canonical TypeScript number projection.
    #[must_use]
    pub const fn as_f64(self) -> f64 {
        self.0
    }

    /// Returns a source `u8` only when the runtime number satisfies the
    /// exported TypeScript scalar's `Number.isSafeInteger` and range checks.
    #[must_use]
    pub fn as_source_u8(self) -> Option<u8> {
        let value = self.0;
        if !value.is_finite()
            || value.trunc() != value
            || value < 0.0
            || value > f64::from(BATTLE_SCRIPT_MAX_FRIENDSHIP)
        {
            return None;
        }
        Some(value as u8)
    }
}

impl From<u8> for BattleScriptFriendship {
    fn from(value: u8) -> Self {
        Self::from_u8(value)
    }
}

impl PartialEq for BattleScriptFriendship {
    fn eq(&self, other: &Self) -> bool {
        self.to_bits() == other.to_bits()
    }
}

impl Eq for BattleScriptFriendship {}

impl fmt::Display for BattleScriptFriendship {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.0.is_nan() {
            return write!(formatter, "NaN");
        }
        if self.0 == f64::INFINITY {
            return write!(formatter, "Infinity");
        }
        if self.0 == f64::NEG_INFINITY {
            return write!(formatter, "-Infinity");
        }
        // JavaScript String(-0) is "0" while Rust retains the sign.
        if self.0 == 0.0 {
            return write!(formatter, "0");
        }
        write!(formatter, "{}", self.0)
    }
}

/// Complete selector-role projection. Only `attacker` is read, but target,
/// effect-battler, and fainted aliases stay in the immutable state projection
/// so their preservation is executable rather than assumed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFriendshiptodamageRoles {
    pub attacker: Option<BattleScriptFriendshiptodamageBattler>,
    pub target: Option<BattleScriptFriendshiptodamageBattler>,
    pub effect_battler: Option<BattleScriptFriendshiptodamageBattler>,
    pub fainted: Option<BattleScriptFriendshiptodamageBattler>,
}

/// The sole per-battler field read by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFriendshiptodamageBattlerState {
    pub friendship: BattleScriptFriendship,
}

/// Complete narrow state projection read or written by this opcode. A
/// successful result only replaces `dynamic_base_power`; the entire battler
/// array, all selector aliases, and current effect retain their exact values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFriendshiptodamageRules {
    pub battlers: [BattleScriptFriendshiptodamageBattlerState;
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_COUNT],
    /// Derived source `gBattleMoves[gCurrentMove].effect` discriminator.
    pub current_move_effect: u8,
    /// Source `u16 gDynamicBasePower`.
    pub dynamic_base_power: u16,
    pub selector_roles: BattleScriptFriendshiptodamageRoles,
}

/// Minimal concrete-program instruction projection. `operand_count` is the
/// full observable operand shape for this zero-operand macro: TypeScript only
/// reads `.operands.length`, so inventing operand contents here would add an
/// unsupported semantic surface.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFriendshiptodamageInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

/// The sole control result for the successful zero-operand command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptFriendshiptodamageControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFriendshiptodamageOutcome {
    pub rules: BattleScriptFriendshiptodamageRules,
    pub control: BattleScriptFriendshiptodamageControl,
}

/// Exact registration and handler failures in their canonical order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptFriendshiptodamageError {
    ExpectedExactlyOneConcreteStart { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    InvalidFriendship { friendship: BattleScriptFriendship },
    UnreachableEffect { effect: u8 },
}

impl fmt::Display for BattleScriptFriendshiptodamageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedExactlyOneConcreteStart { count } => write!(
                formatter,
                "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::InvalidFriendship { friendship } => write!(
                formatter,
                "attacker friendship must be a source u8, got {friendship}"
            ),
            Self::UnreachableEffect { effect } => write!(
                formatter,
                "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION is reachable only for EFFECT_RETURN/EFFECT_FRUSTRATION, got effect {effect}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptFriendshiptodamageError {}

/// Validates the single concrete instruction after the outer program has
/// filtered on `opcode_name`, matching the TypeScript registration's order.
///
/// The canonical TypeScript guard deliberately validates only dispatcher and
/// operand count here. It uses the selected instruction's `opcodeId` as the
/// handler-map key but does not compare it to `0xB6`; retain that observable
/// behavior while the generated source corpus independently ratchets the
/// canonical instruction's real `0xB6` value.
pub fn validate_battle_script_friendshiptodamage_instruction(
    instruction: BattleScriptFriendshiptodamageInstruction<'_>,
) -> Result<(), BattleScriptFriendshiptodamageError> {
    if instruction.opcode_name != BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE_NAME
        || instruction.dispatcher != BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(
            BattleScriptFriendshiptodamageError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(())
}

/// Native projection of
/// `createBattleScriptFriendshipToDamageOpcodeHandlers(program)`.
///
/// The full source-program instruction slice is retained to make the
/// `exactly 1 concrete start` cardinality invariant observable. It filters by
/// the canonical opcode name before validating the selected dispatcher and
/// zero-operand shape. The returned instruction keeps its own opcode id so
/// callers can preserve the canonical registration map key exactly.
pub fn validate_battle_script_friendshiptodamage_registration<'a>(
    instructions: &'a [BattleScriptFriendshiptodamageInstruction<'a>],
) -> Result<BattleScriptFriendshiptodamageInstruction<'a>, BattleScriptFriendshiptodamageError> {
    let mut matches = instructions.iter().copied().filter(|instruction| {
        instruction.opcode_name == BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE_NAME
    });
    let candidate = matches.next();
    let count = 1 + matches.count();
    let Some(instruction) = candidate else {
        return Err(
            BattleScriptFriendshiptodamageError::ExpectedExactlyOneConcreteStart { count: 0 },
        );
    };
    if count != 1 {
        return Err(BattleScriptFriendshiptodamageError::ExpectedExactlyOneConcreteStart { count });
    }
    validate_battle_script_friendshiptodamage_instruction(instruction)?;
    Ok(instruction)
}

/// Source-shaped scalar from `Cmd_friendshiptodamagecalculation` and the
/// canonical TypeScript `friendshipToDynamicBasePower` helper.
///
/// Friendship validation deliberately precedes effect reachability. The valid
/// source domain makes the promoted C arithmetic exact in `u16`; division is
/// integer division and therefore truncates toward zero just like positive C
/// integers and `Math.trunc` in the canonical projection.
pub fn friendship_to_dynamic_base_power(
    current_move_effect: u8,
    attacker_friendship: BattleScriptFriendship,
) -> Result<u16, BattleScriptFriendshiptodamageError> {
    let friendship = attacker_friendship.as_source_u8().ok_or(
        BattleScriptFriendshiptodamageError::InvalidFriendship { friendship: attacker_friendship },
    )?;
    let source_factor = match current_move_effect {
        BATTLE_SCRIPT_EFFECT_RETURN => u16::from(friendship),
        BATTLE_SCRIPT_EFFECT_FRUSTRATION => {
            u16::from(BATTLE_SCRIPT_MAX_FRIENDSHIP) - u16::from(friendship)
        }
        effect => {
            return Err(BattleScriptFriendshiptodamageError::UnreachableEffect { effect });
        }
    };
    Ok((BATTLE_SCRIPT_FRIENDSHIP_POWER_MULTIPLIER * source_factor)
        / BATTLE_SCRIPT_FRIENDSHIP_POWER_DIVISOR)
}

/// Native immutable-value twin of the canonical
/// `Cmd_friendshiptodamagecalculation` handler.
///
/// Attacker resolution intentionally occurs before all scalar reads. Once an
/// attacker exists, the helper validates friendship before accepting either
/// effect. A successful command changes only `dynamic_base_power` and always
/// advances; repeated applications are state-idempotent.
pub fn apply_battle_script_friendshiptodamage(
    rules: &BattleScriptFriendshiptodamageRules,
) -> Result<BattleScriptFriendshiptodamageOutcome, BattleScriptFriendshiptodamageError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptFriendshiptodamageError::MissingAttackerRole)?;
    let dynamic_base_power = friendship_to_dynamic_base_power(
        rules.current_move_effect,
        rules.battlers[attacker.index()].friendship,
    )?;

    let mut next = *rules;
    next.dynamic_base_power = dynamic_base_power;
    Ok(BattleScriptFriendshiptodamageOutcome {
        rules: next,
        control: BattleScriptFriendshiptodamageControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CANONICAL_INSTRUCTION: BattleScriptFriendshiptodamageInstruction<'static> =
        BattleScriptFriendshiptodamageInstruction {
            opcode_name: BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE_NAME,
            program_counter: 1661,
            opcode_id: BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE,
            dispatcher: BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DISPATCHER,
            operand_count: 0,
        };

    fn rules(
        attacker: Option<BattleScriptFriendshiptodamageBattler>,
        friendship: BattleScriptFriendship,
        effect: u8,
    ) -> BattleScriptFriendshiptodamageRules {
        BattleScriptFriendshiptodamageRules {
            battlers: [
                BattleScriptFriendshiptodamageBattlerState {
                    friendship: BattleScriptFriendship::from_u8(17),
                },
                BattleScriptFriendshiptodamageBattlerState { friendship },
                BattleScriptFriendshiptodamageBattlerState {
                    friendship: BattleScriptFriendship::from_u8(99),
                },
                BattleScriptFriendshiptodamageBattlerState {
                    friendship: BattleScriptFriendship::from_u8(255),
                },
            ],
            current_move_effect: effect,
            dynamic_base_power: u16::MAX,
            selector_roles: BattleScriptFriendshiptodamageRoles {
                attacker,
                target: Some(BattleScriptFriendshiptodamageBattler::Battler3),
                effect_battler: Some(BattleScriptFriendshiptodamageBattler::Battler0),
                fainted: Some(BattleScriptFriendshiptodamageBattler::Battler2),
            },
        }
    }

    #[test]
    fn scalar_uses_source_integer_division_and_complementary_endpoints() {
        assert_eq!(
            friendship_to_dynamic_base_power(
                BATTLE_SCRIPT_EFFECT_RETURN,
                BattleScriptFriendship::from_u8(255),
            ),
            Ok(102)
        );
        assert_eq!(
            friendship_to_dynamic_base_power(
                BATTLE_SCRIPT_EFFECT_FRUSTRATION,
                BattleScriptFriendship::from_u8(0),
            ),
            Ok(102)
        );
        assert_eq!(
            friendship_to_dynamic_base_power(
                BATTLE_SCRIPT_EFFECT_RETURN,
                BattleScriptFriendship::from_u8(2),
            ),
            Ok(0)
        );
        assert_eq!(
            friendship_to_dynamic_base_power(
                BATTLE_SCRIPT_EFFECT_RETURN,
                BattleScriptFriendship::from_u8(3),
            ),
            Ok(1)
        );
    }

    #[test]
    fn missing_attacker_precedes_invalid_friendship_and_unreachable_effect() {
        let input = rules(
            None,
            BattleScriptFriendship::from_bits(f64::NAN.to_bits()),
            0,
        );
        assert_eq!(
            apply_battle_script_friendshiptodamage(&input)
                .expect_err("attacker must be resolved first")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }

    #[test]
    fn registration_preserves_cardinality_before_instruction_shape() {
        assert_eq!(
            validate_battle_script_friendshiptodamage_registration(&[])
                .expect_err("missing concrete start must fail")
                .to_string(),
            "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION requires exactly 1 concrete start, got 0"
        );
        let alternate_opcode =
            BattleScriptFriendshiptodamageInstruction { opcode_id: 0xb5, ..CANONICAL_INSTRUCTION };
        assert_eq!(
            validate_battle_script_friendshiptodamage_registration(&[alternate_opcode])
                .expect("canonical registration maps its selected opcode id without rejecting it"),
            alternate_opcode
        );
        let malformed = BattleScriptFriendshiptodamageInstruction {
            dispatcher: "Cmd_furycuttercalc",
            ..CANONICAL_INSTRUCTION
        };
        assert_eq!(
            validate_battle_script_friendshiptodamage_registration(&[malformed])
                .expect_err("bad dispatcher shape must fail")
                .to_string(),
            "invalid B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION shape at program counter 1661"
        );
    }
}
