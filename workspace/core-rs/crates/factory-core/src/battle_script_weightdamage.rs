//! Pure B_SCR_OP_WEIGHTDAMAGECALCULATION registration, catalog lookup, state
//! transformation, and control result.
//!
//! This is the intentionally narrow native port of
//! src/engine/battleScriptWeightDamageOpcode.ts. It preserves registration's
//! filtered cardinality and exact instruction shape, then performs the
//! target-first Low Kick dynamic-power write. Source authority is
//! battle_script_commands.c:773-782,9467-9482; the operand-free macro is
//! asm/macros/battle_script.inc:1130-1132; the Low Kick site is
//! data/battle_scripts_1.s:2559. The generated production catalog derives
//! from the source-extracted Pokédex weights in species-stats.json.
//!
//! This leaf owns no generic battle machine, RNG, events, scheduler, ABI,
//! WASM boundary, or presentation.

use core::fmt;

pub const BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_COUNT: usize = 4;
pub const BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE_NAME: &str = "B_SCR_OP_WEIGHTDAMAGECALCULATION";
pub const BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE: u8 = 0xdd;
pub const BATTLE_SCRIPT_WEIGHTDAMAGE_DISPATCHER: &str = "Cmd_weightdamagecalculation";

/// Source sWeightToDamageTable, expressed as strict upper bounds.
pub const BATTLE_SCRIPT_LOW_KICK_WEIGHT_THRESHOLDS: [(u16, u16); 5] =
    [(100, 20), (250, 40), (500, 60), (1000, 80), (2000, 100)];
pub const BATTLE_SCRIPT_LOW_KICK_HEAVY_POWER: u16 = 120;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptWeightdamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

pub const BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLERS: [BattleScriptWeightdamageBattler;
    BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_COUNT] = [
    BattleScriptWeightdamageBattler::Battler0,
    BattleScriptWeightdamageBattler::Battler1,
    BattleScriptWeightdamageBattler::Battler2,
    BattleScriptWeightdamageBattler::Battler3,
];

impl BattleScriptWeightdamageBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Bit-preserving JavaScript Number used by direct scalar parity vectors.
#[derive(Debug, Clone, Copy)]
pub struct BattleScriptWeightdamageNumber(f64);

impl BattleScriptWeightdamageNumber {
    #[must_use]
    pub const fn from_u16(value: u16) -> Self {
        Self(value as f64)
    }

    #[must_use]
    pub const fn from_bits(bits: u64) -> Self {
        Self(f64::from_bits(bits))
    }

    #[must_use]
    pub const fn to_bits(self) -> u64 {
        self.0.to_bits()
    }

    #[must_use]
    pub const fn as_f64(self) -> f64 {
        self.0
    }

    fn is_safe_integer(self) -> bool {
        const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;
        self.0.is_finite() && self.0.trunc() == self.0 && self.0.abs() <= MAX_SAFE_INTEGER
    }
}

impl From<u16> for BattleScriptWeightdamageNumber {
    fn from(value: u16) -> Self {
        Self::from_u16(value)
    }
}

impl PartialEq for BattleScriptWeightdamageNumber {
    fn eq(&self, other: &Self) -> bool {
        self.to_bits() == other.to_bits()
    }
}

impl Eq for BattleScriptWeightdamageNumber {}

impl fmt::Display for BattleScriptWeightdamageNumber {
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
        // JavaScript String(-0) is 0, while Rust retains the sign.
        if self.0 == 0.0 {
            return write!(formatter, "0");
        }
        write!(formatter, "{}", self.0)
    }
}

/// Only target is read; the aliases make sibling preservation executable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptWeightdamageRoles {
    pub attacker: Option<BattleScriptWeightdamageBattler>,
    pub target: Option<BattleScriptWeightdamageBattler>,
    pub effect_battler: Option<BattleScriptWeightdamageBattler>,
    pub fainted: Option<BattleScriptWeightdamageBattler>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptWeightdamageBattlerState {
    /// Source gBattleMons[battler].species.
    pub species: u16,
}

/// Successful application changes only dynamic_base_power.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptWeightdamageRules {
    pub battlers: [BattleScriptWeightdamageBattlerState; BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_COUNT],
    pub dynamic_base_power: u16,
    pub selector_roles: BattleScriptWeightdamageRoles,
}

/// The registration factory reads no operand contents beyond their count.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptWeightdamageInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptWeightdamageControl {
    Advance,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptWeightdamageOutcome {
    pub rules: BattleScriptWeightdamageRules,
    pub control: BattleScriptWeightdamageControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptWeightdamageError {
    ExpectedExactlyOneConcreteStart {
        count: usize,
    },
    InvalidInstructionShape {
        program_counter: u32,
    },
    MissingTargetRole,
    InvalidPokedexWeight {
        weight: BattleScriptWeightdamageNumber,
    },
    SpeciesOutsideSourceCatalog {
        species: BattleScriptWeightdamageNumber,
    },
    LegacyCompatibilitySpeciesWithoutWeight {
        species: BattleScriptWeightdamageNumber,
    },
}

impl fmt::Display for BattleScriptWeightdamageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedExactlyOneConcreteStart { count } => write!(
                formatter,
                "B_SCR_OP_WEIGHTDAMAGECALCULATION requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_WEIGHTDAMAGECALCULATION shape at program counter {program_counter}"
            ),
            Self::MissingTargetRole => {
                write!(formatter, "Battle Script hit-chain command requires a target role")
            }
            Self::InvalidPokedexWeight { weight } => write!(
                formatter,
                "Pokédex weight must be a nonnegative integer hectogram value, got {weight}"
            ),
            Self::SpeciesOutsideSourceCatalog { species } => write!(
                formatter,
                "species {species} is outside the source species catalog"
            ),
            Self::LegacyCompatibilitySpeciesWithoutWeight { species } => write!(
                formatter,
                "species {species} is a legacy compatibility id without a source Pokédex weight"
            ),
        }
    }
}

impl std::error::Error for BattleScriptWeightdamageError {}

// Generated production catalog; it is not an expected-vector fixture.
include!("battle_script_weightdamage_catalog_gen.rs");

/// Native scalar twin of canonical lowKickPowerForWeight.
pub fn low_kick_power_for_weight(
    weight: BattleScriptWeightdamageNumber,
) -> Result<u16, BattleScriptWeightdamageError> {
    if !weight.is_safe_integer() || weight.as_f64() < 0.0 {
        return Err(BattleScriptWeightdamageError::InvalidPokedexWeight { weight });
    }
    for (exclusive_upper_bound, power) in BATTLE_SCRIPT_LOW_KICK_WEIGHT_THRESHOLDS {
        if weight.as_f64() < f64::from(exclusive_upper_bound) {
            return Ok(power);
        }
    }
    Ok(BATTLE_SCRIPT_LOW_KICK_HEAVY_POWER)
}

/// Native scalar twin of canonical sourceSpeciesWeightHectograms.
pub fn source_species_weight_hectograms(
    species: BattleScriptWeightdamageNumber,
) -> Result<u16, BattleScriptWeightdamageError> {
    let Some((_, weight)) = BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG
        .iter()
        .find(|(id, _)| species.as_f64() == f64::from(*id))
    else {
        return Err(BattleScriptWeightdamageError::SpeciesOutsideSourceCatalog { species });
    };
    weight.ok_or(BattleScriptWeightdamageError::LegacyCompatibilitySpeciesWithoutWeight { species })
}

/// Shape validation after the opcode-name filter, matching canonical order.
pub fn validate_battle_script_weightdamage_instruction(
    instruction: BattleScriptWeightdamageInstruction<'_>,
) -> Result<(), BattleScriptWeightdamageError> {
    if instruction.opcode_id != BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_WEIGHTDAMAGE_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(BattleScriptWeightdamageError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(())
}

/// Native projection of createBattleScriptWeightDamageOpcodeHandlers.
pub fn validate_battle_script_weightdamage_registration<'a>(
    instructions: &'a [BattleScriptWeightdamageInstruction<'a>],
) -> Result<BattleScriptWeightdamageInstruction<'a>, BattleScriptWeightdamageError> {
    let mut selected = None;
    let mut count = 0_usize;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE_NAME {
            count += 1;
            selected = Some(*instruction);
        }
    }
    if count != 1 {
        return Err(BattleScriptWeightdamageError::ExpectedExactlyOneConcreteStart { count });
    }
    let instruction = selected.expect("one selected instruction exists when count is one");
    validate_battle_script_weightdamage_instruction(instruction)?;
    Ok(instruction)
}

/// Immutable native twin of Cmd_weightdamagecalculation.
///
/// Target resolution intentionally happens before the selected battler species
/// read and catalog lookup. Success overwrites only dynamic base power and
/// always advances.
pub fn apply_battle_script_weightdamage(
    rules: &BattleScriptWeightdamageRules,
) -> Result<BattleScriptWeightdamageOutcome, BattleScriptWeightdamageError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptWeightdamageError::MissingTargetRole)?;
    let species = BattleScriptWeightdamageNumber::from_u16(rules.battlers[target.index()].species);
    let weight = source_species_weight_hectograms(species)?;
    let dynamic_base_power =
        low_kick_power_for_weight(BattleScriptWeightdamageNumber::from_u16(weight))?;

    let mut next = *rules;
    next.dynamic_base_power = dynamic_base_power;
    Ok(BattleScriptWeightdamageOutcome {
        rules: next,
        control: BattleScriptWeightdamageControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strict_boundaries_and_target_first_error_order_are_stable() {
        assert_eq!(
            low_kick_power_for_weight(BattleScriptWeightdamageNumber::from_u16(99)),
            Ok(20)
        );
        assert_eq!(
            low_kick_power_for_weight(BattleScriptWeightdamageNumber::from_u16(100)),
            Ok(40)
        );
        assert_eq!(
            low_kick_power_for_weight(BattleScriptWeightdamageNumber::from_u16(2000)),
            Ok(120)
        );
        let rules = BattleScriptWeightdamageRules {
            battlers: [
                BattleScriptWeightdamageBattlerState { species: 252 },
                BattleScriptWeightdamageBattlerState { species: 0 },
                BattleScriptWeightdamageBattlerState { species: 412 },
                BattleScriptWeightdamageBattlerState { species: 65535 },
            ],
            dynamic_base_power: u16::MAX,
            selector_roles: BattleScriptWeightdamageRoles {
                attacker: Some(BattleScriptWeightdamageBattler::Battler0),
                target: None,
                effect_battler: Some(BattleScriptWeightdamageBattler::Battler2),
                fainted: Some(BattleScriptWeightdamageBattler::Battler3),
            },
        };
        assert_eq!(
            apply_battle_script_weightdamage(&rules)
                .expect_err("missing target must precede selected species lookup")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }
}
