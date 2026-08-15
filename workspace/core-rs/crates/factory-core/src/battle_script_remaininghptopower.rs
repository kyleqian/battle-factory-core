//! Pure `B_SCR_OP_REMAININGHPTOPOWER` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptRemainingHpToPowerOpcode.ts`, separated from that
//! module's opcode registration and generic Battle Script machine. The
//! canonical handler resolves the optional attacker role first, derives the
//! attacker's scaled HP fraction, writes only `dynamicBasePower`, and advances.
//! It is the shared dynamic-power leaf for Flail and Reversal.
//!
//! Source authority:
//! - `B_SCR_OP_REMAININGHPTOPOWER` dispatches to `Cmd_remaininghptopower`
//!   (`0xAC`) in `reference/pokeemerald/src/battle_script_commands.c:503`.
//! - That implementation is at `battle_script_commands.c:8303-8316`; its
//!   `sFlailHpScaleToPowerTable` is at `:749-757`.
//! - `GetScaledHPFraction` is at `reference/pokeemerald/src/battle_interface.c:2517-2525`
//!   and is declared `u8 GetScaledHPFraction(s16, s16, u8)` in
//!   `reference/pokeemerald/include/battle_interface.h:81`.
//! - The zero-operand `remaininghptopower` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:905-907`, and its
//!   concrete script site is `BattleScript_EffectFlail` at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1345-1347`.
//! - `MOVE_FLAIL` and `MOVE_REVERSAL` both select `EFFECT_FLAIL` in
//!   `reference/pokeemerald/src/data/battle_moves.h:2278-2285,2330-2337`, so
//!   that one script site is deliberately shared by both moves.
//!
//! `BattlePokemon::hp` and `maxHP` are source `u16` fields
//! (`reference/pokeemerald/include/pokemon.h:282,285`), as they are in the
//! canonical TypeScript rules projection. Multiplication is explicitly widened
//! to `u32`, preserving the source's promoted `hp * scale` arithmetic for the
//! legal active-battler domain `0 <= hp <= maxHP`, `maxHP > 0`. That domain
//! guarantees the source `u8` result is in `0..=48`; the fallible helper keeps
//! malformed hand-built native inputs from becoming a Rust division-by-zero or
//! table overrun while retaining the handler's attacker-first error order.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic BattleState reducer, damage calculation, RNG, scheduler
//! state, controller state, ABI, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; the canonical rules projection always carries
/// four source-indexed active battler records.
pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_BATTLER_COUNT: usize = 4;

/// The `scale` argument supplied by `Cmd_remaininghptopower`.
pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_SCALE: u16 = 48;

/// Source `sFlailHpScaleToPowerTable`, retained in source order so the first
/// inclusive threshold wins.
pub const BATTLE_SCRIPT_FLAIL_HP_SCALE_TO_POWER: [(u8, u16); 6] =
    [(1, 200), (4, 150), (9, 100), (16, 80), (32, 40), (48, 20)];

/// The complete source `BattleScriptBattlerId` domain used by selector roles
/// and the indexed active-battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptRemaininghptopowerBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for sibling-preservation checks.
pub const BATTLE_SCRIPT_REMAININGHPTOPOWER_BATTLERS: [BattleScriptRemaininghptopowerBattler;
    BATTLE_SCRIPT_REMAININGHPTOPOWER_BATTLER_COUNT] = [
    BattleScriptRemaininghptopowerBattler::Battler0,
    BattleScriptRemaininghptopowerBattler::Battler1,
    BattleScriptRemaininghptopowerBattler::Battler2,
    BattleScriptRemaininghptopowerBattler::Battler3,
];

impl BattleScriptRemaininghptopowerBattler {
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

/// Complete selector-role projection. Only `attacker` is read; the other
/// bindings are retained to prove the command preserves them exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemaininghptopowerRoles {
    pub attacker: Option<BattleScriptRemaininghptopowerBattler>,
    pub target: Option<BattleScriptRemaininghptopowerBattler>,
    pub effect_battler: Option<BattleScriptRemaininghptopowerBattler>,
    pub fainted: Option<BattleScriptRemaininghptopowerBattler>,
}

/// Per-battler fields read by the scalar helper. Both source fields retain
/// their full unsigned-16-bit representation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemaininghptopowerBattlerState {
    pub hp: u16,
    pub max_hp: u16,
}

/// Complete narrow projection read or written by this opcode. Only
/// `dynamic_base_power` changes on a successful application; all battler and
/// selector data deliberately remains present to ratchet that guarantee.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemaininghptopowerRules {
    pub battlers: [BattleScriptRemaininghptopowerBattlerState;
        BATTLE_SCRIPT_REMAININGHPTOPOWER_BATTLER_COUNT],
    /// Source `u16 gDynamicBasePower`.
    pub dynamic_base_power: u16,
    pub selector_roles: BattleScriptRemaininghptopowerRoles,
}

/// The sole control result for this unconditional zero-operand command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemaininghptopowerControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemaininghptopowerOutcome {
    pub rules: BattleScriptRemaininghptopowerRules,
    pub control: BattleScriptRemaininghptopowerControl,
}

/// Typed failure surface. `MissingAttackerRole` is the canonical handler error;
/// the two malformed-HP variants protect the native leaf's source-representable
/// input boundary after that role has been resolved.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemaininghptopowerError {
    MissingAttackerRole,
    ZeroMaximumHp,
    FlailFractionOutOfRange { fraction: u32 },
}

impl fmt::Display for BattleScriptRemaininghptopowerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::ZeroMaximumHp => write!(formatter, "remaininghptopower requires nonzero maxHP"),
            Self::FlailFractionOutOfRange { fraction } => write!(
                formatter,
                "GetScaledHPFraction produced out-of-range Flail fraction {fraction}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRemaininghptopowerError {}

/// Source-shaped `GetScaledHPFraction(hp, maxHP, 48)` for the legal active
/// battler domain. Integer division floors before the one living-minimum
/// correction, exactly as the C helper and canonical TypeScript do.
pub fn get_scaled_hp_fraction(
    hp: u16,
    max_hp: u16,
) -> Result<u32, BattleScriptRemaininghptopowerError> {
    if max_hp == 0 {
        return Err(BattleScriptRemaininghptopowerError::ZeroMaximumHp);
    }

    let mut fraction =
        (u32::from(hp) * u32::from(BATTLE_SCRIPT_REMAININGHPTOPOWER_SCALE)) / u32::from(max_hp);
    if fraction == 0 && hp > 0 {
        fraction = 1;
    }
    Ok(fraction)
}

/// Converts the source-scaled HP fraction into Flail/Reversal dynamic power.
/// Table comparisons are inclusive and happen in source order.
pub fn remaining_hp_to_power(
    hp: u16,
    max_hp: u16,
) -> Result<u16, BattleScriptRemaininghptopowerError> {
    let fraction = get_scaled_hp_fraction(hp, max_hp)?;
    for (threshold, power) in BATTLE_SCRIPT_FLAIL_HP_SCALE_TO_POWER {
        if fraction <= u32::from(threshold) {
            return Ok(power);
        }
    }
    Err(BattleScriptRemaininghptopowerError::FlailFractionOutOfRange { fraction })
}

/// Native immutable-value twin of the canonical `Cmd_remaininghptopower`
/// handler. Attacker resolution deliberately precedes every HP read or scalar
/// validation. A successful invocation overwrites only dynamic base power and
/// always advances; repeated applications are state-idempotent.
pub fn apply_battle_script_remaininghptopower(
    rules: &BattleScriptRemaininghptopowerRules,
) -> Result<BattleScriptRemaininghptopowerOutcome, BattleScriptRemaininghptopowerError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptRemaininghptopowerError::MissingAttackerRole)?;
    let attacker_state = rules.battlers[attacker.index()];
    let dynamic_base_power = remaining_hp_to_power(attacker_state.hp, attacker_state.max_hp)?;

    let mut next = *rules;
    next.dynamic_base_power = dynamic_base_power;
    Ok(BattleScriptRemaininghptopowerOutcome {
        rules: next,
        control: BattleScriptRemaininghptopowerControl::Advance,
    })
}
