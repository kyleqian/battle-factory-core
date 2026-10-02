//! Pure `B_SCR_OP_TRYSETFUTUREATTACK` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrysetfutureattackOpcode.ts`. It is the first
//! Battle Script leaf to reuse the ported damage kernel
//! (`crate::damage_calc::calculate_base_damage`): Future Sight and Doom
//! Desire's base damage is precomputed and stashed the turn the move is
//! used, then unleashed two turns later by other opcodes this leaf does not
//! own. If the target's positional slot already has a pending future
//! attack, the command jumps through the operand's late-resolved failure
//! pointer with the rules unchanged; otherwise it records the attacker,
//! move, a fixed 3-turn counter, and the computed damage (Helping Hand
//! boosted) against the TARGET's slot, ORs `SIDE_STATUS_FUTUREATTACK` onto
//! the target's SIDE, and selects the Doom Desire/Future Sight multistring.
//! No branch consumes RNG, changes the scheduler, or emits an event.
//!
//! ## Kernel input field-mapping decision
//! The canonical TypeScript's `calculateFutureAttackBaseDamage` applies
//! every hold-item/ability stat modifier (Huge/Pure Power, the type-boost
//! hold item, Choice Band, Deep Sea Tooth/Scale, Light Ball, Metal Powder,
//! Thick Club, Hustle, Plus/Minus, Guts, Marvel Scale) to the attack/
//! defense/spAttack/spDefense values it hands the kernel, but its built
//! `DamageBattler` objects omit `holdEffect`/`holdEffectParam`/`species`
//! entirely and only ever set `ability` to `ABILITY_GUTS` (attacker) or
//! leave it unset (`ABILITY_NONE`) otherwise. Passing the raw hold effect
//! through as well would double-apply every one of those modifiers, because
//! `calculate_base_damage` re-runs the exact same hold-effect/ability
//! checks internally (`pokemon.c:3171-3226`). This port mirrors that
//! exactly: `hold_effect`/`hold_effect_param`/`species` always cross to the
//! kernel as `HOLD_EFFECT_NONE`/`0`/`0`, and `ability` is `ABILITY_GUTS`
//! only when the attacker's real ability is Guts (needed so the kernel's
//! own burn-halving check, `attacker.is_burned && attacker.ability !=
//! ABILITY_GUTS`, is correctly suppressed) and `ABILITY_NONE` otherwise.
//! Weather is likewise never modeled (`weather: 0`) since the source
//! function never reads it, and `is_double_battle_spread_move` is always
//! `false` -- the canonical TS's own boolean expression ends in `&& false`
//! (both delayed moves are `MOVE_TARGET_SELECTED`), so `battleTypeFlags`
//! observably never changes the result and is not part of this leaf's
//! rules slice.
//!
//! Source authority:
//! - `Cmd_trysetfutureattack` is `reference/pokeemerald/src/battle_script_commands.c:8929-8958`;
//!   dispatch `:526` (`//0xC3`), forward declaration `:274`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1007-1010`.
//! - The sole concrete call site is `data/battle_scripts_1.s:1885`
//!   (`trysetfutureattack BattleScript_ButItFailed`).
//! - `include/constants/battle.h:215` (`SIDE_STATUS_FUTUREATTACK (1 << 6)`).
//! - `include/constants/moves.h:252` (`MOVE_FUTURE_SIGHT 248`) and `:357`
//!   (`MOVE_DOOM_DESIRE 353`).
//! - `include/battle.h:166-169` (`WishFutureKnock` `futureSightCounter`/
//!   `futureSightAttacker`/`futureSightDmg`/`futureSightMove`, `u8[4]`/
//!   `u8[4]`/`s32[4]`/`u16[4]`).
//! - `include/constants/battle_script_commands.h:201`.
//! - `include/constants/battle_string_ids.h:519-520` (`B_MSG_FUTURE_SIGHT`
//!   0, `B_MSG_DOOM_DESIRE` 1).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

use crate::damage_calc::{
    calculate_base_damage, DamageBattler, DamageCalcInput, StatStages, ABILITY_GUTS,
    ABILITY_HUGE_POWER, ABILITY_PURE_POWER, HOLD_EFFECT_NONE, TYPE_STEEL,
};
use crate::gen_tables::MOVES;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_TRYSETFUTUREATTACK` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE: u8 = 0xc3;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME: &str = "B_SCR_OP_TRYSETFUTUREATTACK";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER: &str = "Cmd_trysetfutureattack";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/battle.h:215` -- `SIDE_STATUS_FUTUREATTACK`.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_FUTUREATTACK: u16 = 1 << 6;
/// `include/battle.h`'s `sideStatuses` also carries these two flags; read
/// (never written) by the damage kernel call.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_REFLECT: u16 = 1 << 0;
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_LIGHTSCREEN: u16 = 1 << 1;
/// `include/constants/moves.h:252`.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_FUTURE_SIGHT: u16 = 248;
/// `include/constants/moves.h:357`.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_DOOM_DESIRE: u16 = 353;
/// `include/constants/battle_string_ids.h:519`.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_FUTURE_SIGHT: u8 = 0;
/// `include/constants/battle_string_ids.h:520`.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_DOOM_DESIRE: u8 = 1;
/// The fixed 3-turn delay the counter is set to on success.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_COUNTER_VALUE: u8 = 3;

/// `sHoldEffectToType` restricted to the entries this leaf's manual
/// pre-application needs (`pokemon.c:1919-1938`); duplicated locally
/// (rather than reused from `damage_calc`) because the canonical TS opcode
/// module also keeps its own local copy instead of importing
/// `damageCalc.ts`'s table -- the kernel never sees a nonzero hold effect
/// from this leaf (see the module doc comment), so this table exists only
/// to pre-apply the boost by hand before calling the kernel.
const HOLD_EFFECT_TYPE: [(u16, u8); 17] = [
    (31, crate::damage_calc::TYPE_BUG),
    (42, crate::damage_calc::TYPE_STEEL),
    (46, crate::damage_calc::TYPE_GROUND),
    (47, crate::damage_calc::TYPE_ROCK),
    (48, crate::damage_calc::TYPE_GRASS),
    (49, crate::damage_calc::TYPE_DARK),
    (50, crate::damage_calc::TYPE_FIGHTING),
    (51, crate::damage_calc::TYPE_ELECTRIC),
    (52, crate::damage_calc::TYPE_WATER),
    (53, crate::damage_calc::TYPE_FLYING),
    (54, crate::damage_calc::TYPE_POISON),
    (55, crate::damage_calc::TYPE_ICE),
    (56, crate::damage_calc::TYPE_GHOST),
    (57, crate::damage_calc::TYPE_PSYCHIC),
    (58, crate::damage_calc::TYPE_FIRE),
    (59, crate::damage_calc::TYPE_DRAGON),
    (60, crate::damage_calc::TYPE_NORMAL),
];

const HOLD_EFFECT_CHOICE_BAND: u16 = 29;
const HOLD_EFFECT_DEEP_SEA_TOOTH: u16 = 35;
const HOLD_EFFECT_DEEP_SEA_SCALE: u16 = 36;
const HOLD_EFFECT_LIGHT_BALL: u16 = 45;
const HOLD_EFFECT_METAL_POWDER: u16 = 64;
const HOLD_EFFECT_THICK_CLUB: u16 = 65;
const ABILITY_HUSTLE: u16 = 55;
const ABILITY_PLUS: u16 = 57;
const ABILITY_MINUS: u16 = 58;
const ABILITY_MARVEL_SCALE: u16 = 63;
const SPECIES_PIKACHU: u16 = 25;
const SPECIES_CUBONE: u16 = 104;
const SPECIES_MAROWAK: u16 = 105;
const SPECIES_DITTO: u16 = 132;
const SPECIES_CLAMPERL: u16 = 373;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetfutureattackBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLERS: [BattleScriptTrysetfutureattackBattler;
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT] = [
    BattleScriptTrysetfutureattackBattler::Battler0,
    BattleScriptTrysetfutureattackBattler::Battler1,
    BattleScriptTrysetfutureattackBattler::Battler2,
    BattleScriptTrysetfutureattackBattler::Battler3,
];

impl BattleScriptTrysetfutureattackBattler {
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

/// Source battle side, indexing `sideStatuses`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetfutureattackSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptTrysetfutureattackSide {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection this leaf reads. `hold_effect`/
/// `hold_effect_param` are already resolved through the canonical
/// `resolveBattleScriptBattlerHoldEffect(Param)` (Enigma Berry's per-battler
/// override folded in by the caller, exactly like every other real item) --
/// this leaf never sees a raw item id, keeping its rules slice narrow.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackBattlerState {
    pub side: BattleScriptTrysetfutureattackSide,
    pub attack: i32,
    pub defense: i32,
    pub sp_attack: i32,
    pub sp_defense: i32,
    pub level: i32,
    pub types: [u8; 2],
    pub stat_stages: StatStages,
    /// 0 means fainted/absent for the alive-battler scan; also checked
    /// against `absentBattlerFlags`.
    pub hp: u16,
    /// Raw `status1` bitfield; bit 4 is burn, `!= 0` is "has any status".
    pub status1: u32,
    pub ability: u16,
    pub species: u16,
    pub hold_effect: u16,
    pub hold_effect_param: i32,
    /// 0 or 1; only read on the attacker.
    pub helping_hand: u8,
}

/// Canonical selector bindings. Only `attacker` and `target` are ever read,
/// in that order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackRoles {
    pub attacker: Option<BattleScriptTrysetfutureattackBattler>,
    pub target: Option<BattleScriptTrysetfutureattackBattler>,
}

/// Complete narrow rules slice read or written by this command. No
/// scheduler and no events -- this leaf's canonical handler emits neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackRules {
    pub battlers: [BattleScriptTrysetfutureattackBattlerState;
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrysetfutureattackRoles,
    /// `rules.battleTopology.battlersCount`; only the Plus/Minus field-wide
    /// ability scan reads this (2 in singles, 4 in doubles).
    pub battlers_count: u8,
    pub absent_battler_flags: u32,
    pub side_statuses: [u16; 2],
    pub future_sight_counter: [u8; BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT],
    pub future_sight_move: [u16; BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT],
    pub future_sight_attacker: [u8; BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT],
    pub future_sight_dmg: [i32; BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLER_COUNT],
    pub current_move: u16,
    pub multistring_chooser: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrysetfutureattackOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, invoked lazily only on the failure branch,
    /// exactly like the canonical TypeScript handler's own
    /// `resolveBattleScriptLabel` call.
    pub resolved_target: Option<BattleScriptTrysetfutureattackResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetfutureattackControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application. No
/// scheduler and no emitted event -- the canonical handler touches neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackOutcome {
    pub rules: BattleScriptTrysetfutureattackRules,
    pub control: BattleScriptTrysetfutureattackControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetfutureattackError<'a> {
    /// Registration cardinality: `expected one B_SCR_OP_TRYSETFUTUREATTACK, got N`.
    WrongCardinality {
        count: usize,
    },
    /// Registration shape offender: fixed text, no program counter.
    InvalidRegistrationEncoding,
    /// Per-execution shape check: fixed text, no program counter, and
    /// (unlike registration) never re-checks opcode id/dispatcher.
    InvalidExecutionShape,
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedTarget {
        expression: &'a str,
    },
    /// `calculateFutureAttackBaseDamage`'s own guard; unreachable from the
    /// real program (the sole call site's `currentMove` is always Future
    /// Sight or Doom Desire) but replayable as a direct damage-fn case.
    NotAFutureMove {
        move_id: u16,
    },
}

impl fmt::Display for BattleScriptTrysetfutureattackError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "expected one B_SCR_OP_TRYSETFUTUREATTACK, got {count}"
            ),
            Self::InvalidRegistrationEncoding => {
                write!(formatter, "invalid B_SCR_OP_TRYSETFUTUREATTACK encoding")
            }
            Self::InvalidExecutionShape => write!(
                formatter,
                "Cmd_trysetfutureattack requires exactly one four-byte script pointer"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnresolvedTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_trysetfutureattack unresolved target {expression}"
                )
            }
            Self::NotAFutureMove { move_id } => write!(
                formatter,
                "Cmd_trysetfutureattack requires Future Sight or Doom Desire, got {move_id}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysetfutureattackError<'_> {}

fn statstages_of(battler: &BattleScriptTrysetfutureattackBattlerState) -> StatStages {
    battler.stat_stages
}

/// Native twin of exported `calculateFutureAttackBaseDamage`
/// (`battleScriptTrysetfutureattackOpcode.ts:58-127`). Applies every
/// hold-item/ability modifier by hand, then hands the kernel a
/// `DamageCalcInput` with `hold_effect`/`species` zeroed -- see the module
/// doc comment for why.
///
/// # Errors
/// Returns [`BattleScriptTrysetfutureattackError::NotAFutureMove`] for any
/// `move_id` other than Future Sight (248) or Doom Desire (353); the real
/// program only ever calls this with one of those two.
pub fn calculate_future_attack_base_damage(
    rules: &BattleScriptTrysetfutureattackRules,
    attacker_id: BattleScriptTrysetfutureattackBattler,
    target_id: BattleScriptTrysetfutureattackBattler,
    move_id: u16,
) -> Result<i32, BattleScriptTrysetfutureattackError<'static>> {
    if move_id != BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_FUTURE_SIGHT
        && move_id != BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_DOOM_DESIRE
    {
        return Err(BattleScriptTrysetfutureattackError::NotAFutureMove { move_id });
    }
    let move_row = &MOVES[usize::from(move_id)];
    let attacker = rules.battlers[attacker_id.index()];
    let defender = rules.battlers[target_id.index()];

    let mut attack = attacker.attack;
    let mut defense = defender.defense;
    let mut sp_attack = attacker.sp_attack;
    let mut sp_defense = defender.sp_defense;

    // pokemon.c:3158 twin -- Huge Power / Pure Power.
    if attacker.ability == ABILITY_HUGE_POWER || attacker.ability == ABILITY_PURE_POWER {
        attack *= 2;
    }
    // pokemon.c:1919-1938/3171-3183 twin -- attacker's type-boost hold item.
    for &(hold_effect, boosted_type) in &HOLD_EFFECT_TYPE {
        if attacker.hold_effect == hold_effect && move_row.move_type == boosted_type {
            if move_row.move_type == TYPE_STEEL {
                attack = (attack * (attacker.hold_effect_param + 100)) / 100;
            } else {
                sp_attack = (sp_attack * (attacker.hold_effect_param + 100)) / 100;
            }
            break;
        }
    }
    // pokemon.c:3185-3201 twin -- Choice Band and the species-locked items.
    if attacker.hold_effect == HOLD_EFFECT_CHOICE_BAND {
        attack = (attack * 150) / 100;
    }
    if attacker.hold_effect == HOLD_EFFECT_DEEP_SEA_TOOTH && attacker.species == SPECIES_CLAMPERL {
        sp_attack *= 2;
    }
    if defender.hold_effect == HOLD_EFFECT_DEEP_SEA_SCALE && defender.species == SPECIES_CLAMPERL {
        sp_defense *= 2;
    }
    if attacker.hold_effect == HOLD_EFFECT_LIGHT_BALL && attacker.species == SPECIES_PIKACHU {
        sp_attack *= 2;
    }
    if defender.hold_effect == HOLD_EFFECT_METAL_POWDER && defender.species == SPECIES_DITTO {
        defense *= 2;
    }
    if attacker.hold_effect == HOLD_EFFECT_THICK_CLUB
        && (attacker.species == SPECIES_CUBONE || attacker.species == SPECIES_MAROWAK)
    {
        attack *= 2;
    }
    // pokemon.c:3203-3213 twin -- ability block.
    if attacker.ability == ABILITY_HUSTLE {
        attack = (attack * 150) / 100;
    }
    let field_abilities: Vec<u16> = rules
        .battlers
        .iter()
        .take(usize::from(rules.battlers_count))
        .enumerate()
        .filter(|(index, battler)| {
            (rules.absent_battler_flags & (1 << index)) == 0 && battler.hp != 0
        })
        .map(|(_, battler)| battler.ability)
        .collect();
    if (attacker.ability == ABILITY_PLUS && field_abilities.contains(&ABILITY_MINUS))
        || (attacker.ability == ABILITY_MINUS && field_abilities.contains(&ABILITY_PLUS))
    {
        sp_attack = (sp_attack * 150) / 100;
    }
    if attacker.ability == ABILITY_GUTS && attacker.status1 != 0 {
        attack = (attack * 150) / 100;
    }
    if defender.ability == ABILITY_MARVEL_SCALE && defender.status1 != 0 {
        defense = (defense * 150) / 100;
    }

    let side_status = rules.side_statuses[defender.side.index()];
    let input = DamageCalcInput {
        attacker: DamageBattler {
            attack,
            defense: attacker.defense,
            sp_attack,
            sp_defense: attacker.sp_defense,
            level: attacker.level,
            types: attacker.types,
            stat_stages: statstages_of(&attacker),
            is_burned: (attacker.status1 & (1 << 4)) != 0,
            has_status1: false,
            hp: None,
            max_hp: None,
            ability: if attacker.ability == ABILITY_GUTS {
                ABILITY_GUTS
            } else {
                0
            },
            species: 0,
            hold_effect: HOLD_EFFECT_NONE,
            hold_effect_param: 0,
        },
        defender: DamageBattler {
            attack: defender.attack,
            defense,
            sp_attack: defender.sp_attack,
            sp_defense,
            level: defender.level,
            types: defender.types,
            stat_stages: statstages_of(&defender),
            is_burned: false,
            has_status1: false,
            hp: None,
            max_hp: None,
            ability: 0,
            species: 0,
            hold_effect: HOLD_EFFECT_NONE,
            hold_effect_param: 0,
        },
        move_power: i32::from(move_row.power),
        move_type: move_row.move_type,
        is_critical_hit: false,
        side_status_reflect: (side_status & BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_REFLECT)
            != 0,
        side_status_light_screen: (side_status
            & BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_LIGHTSCREEN)
            != 0,
        is_double_battle_spread_move: false,
        is_explosion_effect: false,
        weather: 0,
        weather_has_effect: true,
        current_move: 0,
        active_battler_abilities: None,
        is_frontier_battle: false,
        flash_fire_boosted: false,
    };
    Ok(calculate_base_damage(&input))
}

fn validate_registration_instruction<'a>(
    instruction: BattleScriptTrysetfutureattackInstruction<'a>,
) -> Result<(), BattleScriptTrysetfutureattackError<'a>> {
    let [pointer] = instruction.operands else {
        return Err(BattleScriptTrysetfutureattackError::InvalidRegistrationEncoding);
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER
        || pointer.width_bytes != BATTLE_SCRIPT_TRYSETFUTUREATTACK_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTrysetfutureattackError::InvalidRegistrationEncoding);
    }
    Ok(())
}

/// Native projection of `createBattleScriptTrysetfutureattackOpcodeHandlers`.
/// Wrong cardinality fails first (`expected one ..., got N`); the one
/// matching instruction is then validated for opcode id, dispatcher, and
/// operand shape together (`invalid ... encoding`, no program counter).
pub fn register_battle_script_trysetfutureattack_handler<'a>(
    instructions: &[BattleScriptTrysetfutureattackInstruction<'a>],
) -> Result<BattleScriptTrysetfutureattackRegistration, BattleScriptTrysetfutureattackError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME
        })
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSETFUTUREATTACK_CONCRETE_START_COUNT {
        return Err(BattleScriptTrysetfutureattackError::WrongCardinality {
            count: matching.len(),
        });
    }
    validate_registration_instruction(*matching[0])?;
    Ok(BattleScriptTrysetfutureattackRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_trysetfutureattack`.
///
/// Evaluation order matches the canonical handler exactly: the
/// per-execution operand shape check (opcode id/dispatcher are NOT
/// re-checked here, mirroring the TS handler), then the attacker role, then
/// the target role, then the occupied-counter guard. On the fail branch the
/// pointer operand is resolved lazily -- only on this branch -- and the
/// rules are returned unchanged. On success the target's future-sight
/// cells, the target side's status flags, and the multistring chooser
/// update; nothing else does.
pub fn apply_battle_script_trysetfutureattack<'a>(
    instruction: BattleScriptTrysetfutureattackInstruction<'a>,
    rules: &BattleScriptTrysetfutureattackRules,
) -> Result<BattleScriptTrysetfutureattackOutcome, BattleScriptTrysetfutureattackError<'a>> {
    let [pointer] = instruction.operands else {
        return Err(BattleScriptTrysetfutureattackError::InvalidExecutionShape);
    };
    if pointer.width_bytes != BATTLE_SCRIPT_TRYSETFUTUREATTACK_FAILURE_POINTER_WIDTH_BYTES {
        return Err(BattleScriptTrysetfutureattackError::InvalidExecutionShape);
    }

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetfutureattackError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrysetfutureattackError::MissingTargetRole)?;

    if rules.future_sight_counter[target.index()] != 0 {
        let resolved = instruction.resolved_target.ok_or(
            BattleScriptTrysetfutureattackError::UnresolvedTarget {
                expression: pointer.expression,
            },
        )?;
        return Ok(BattleScriptTrysetfutureattackOutcome {
            rules: *rules,
            control: BattleScriptTrysetfutureattackControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next_rules = *rules;
    next_rules.future_sight_counter[target.index()] =
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_COUNTER_VALUE;
    next_rules.future_sight_move[target.index()] = rules.current_move;
    next_rules.future_sight_attacker[target.index()] = attacker.as_u8();
    let mut damage =
        calculate_future_attack_base_damage(rules, attacker, target, rules.current_move)?;
    if rules.battlers[attacker.index()].helping_hand == 1 {
        damage = (damage * 15) / 10;
    }
    next_rules.future_sight_dmg[target.index()] = damage;
    let target_side = rules.battlers[target.index()].side.index();
    next_rules.side_statuses[target_side] |=
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_FUTUREATTACK;
    next_rules.multistring_chooser =
        if rules.current_move == BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_DOOM_DESIRE {
            BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_DOOM_DESIRE
        } else {
            BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_FUTURE_SIGHT
        };

    Ok(BattleScriptTrysetfutureattackOutcome {
        rules: next_rules,
        control: BattleScriptTrysetfutureattackControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub counter_guard_line: u32,
    pub side_status_write_line: u32,
    pub future_sight_move_write_line: u32,
    pub future_sight_attacker_write_line: u32,
    pub future_sight_counter_write_line: u32,
    pub future_sight_dmg_write_line: u32,
    pub calculate_base_damage_call_line: u32,
    pub helping_hand_line: u32,
    pub multistring_future_sight_line: u32,
    pub multistring_doom_desire_line: u32,
    pub plus_five_line: u32,
}

pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTrysetfutureattackDecompDispatchEvidence =
    BattleScriptTrysetfutureattackDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER,
        dispatch_line: 526,
        forward_decl_line: 274,
        handler_line: 8929,
        counter_guard_line: 8931,
        side_status_write_line: 8937,
        future_sight_move_write_line: 8938,
        future_sight_attacker_write_line: 8939,
        future_sight_counter_write_line: 8940,
        future_sight_dmg_write_line: 8941,
        calculate_base_damage_call_line: 8941,
        helping_hand_line: 8946,
        multistring_future_sight_line: 8951,
        multistring_doom_desire_line: 8949,
        plus_five_line: 8953,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_MACRO_EVIDENCE:
    BattleScriptTrysetfutureattackMacroEvidence = BattleScriptTrysetfutureattackMacroEvidence {
    declaration_line: 1007,
    opcode_line: 1008,
    pointer_line: 1009,
    encoded_width_bytes: BATTLE_SCRIPT_TRYSETFUTUREATTACK_ENCODED_WIDTH_BYTES,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetfutureattackCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_CALL_SITE_EVIDENCE:
    BattleScriptTrysetfutureattackCallSiteEvidence =
    BattleScriptTrysetfutureattackCallSiteEvidence {
        entry_label: "BattleScript_EffectFutureSight",
        entry_label_line: 1881,
        statement_line: 1885,
        instruction_program_counter: 1304,
        failure_target_expression: "BattleScript_ButItFailed",
        failure_target_program_counter: 1434,
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn plain_battler(
        side: BattleScriptTrysetfutureattackSide,
    ) -> BattleScriptTrysetfutureattackBattlerState {
        BattleScriptTrysetfutureattackBattlerState {
            side,
            attack: 100,
            defense: 100,
            sp_attack: 100,
            sp_defense: 100,
            level: 50,
            types: [0, 0],
            stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
            hp: 100,
            status1: 0,
            ability: 0,
            species: 1,
            hold_effect: 0,
            hold_effect_param: 0,
            helping_hand: 0,
        }
    }

    fn rules(
        attacker: Option<BattleScriptTrysetfutureattackBattler>,
        target: Option<BattleScriptTrysetfutureattackBattler>,
        future_sight_counter: [u8; 4],
        current_move: u16,
    ) -> BattleScriptTrysetfutureattackRules {
        BattleScriptTrysetfutureattackRules {
            battlers: [
                plain_battler(BattleScriptTrysetfutureattackSide::Player),
                plain_battler(BattleScriptTrysetfutureattackSide::Opponent),
                plain_battler(BattleScriptTrysetfutureattackSide::Player),
                plain_battler(BattleScriptTrysetfutureattackSide::Opponent),
            ],
            selector_roles: BattleScriptTrysetfutureattackRoles { attacker, target },
            battlers_count: 2,
            absent_battler_flags: 0,
            side_statuses: [0, 0],
            future_sight_counter,
            future_sight_move: [0, 0, 0, 0],
            future_sight_attacker: [0, 0, 0, 0],
            future_sight_dmg: [0, 0, 0, 0],
            current_move,
            multistring_chooser: 0xff,
        }
    }

    const FAILED_OPERAND: [BattleScriptTrysetfutureattackOperand<'static>; 1] =
        [BattleScriptTrysetfutureattackOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        }];

    const RESOLVED: BattleScriptTrysetfutureattackResolvedLabel<'static> =
        BattleScriptTrysetfutureattackResolvedLabel {
            expression: "BattleScript_ButItFailed",
            program_counter: 1234,
        };

    fn instruction<'a>(
        operands: &'a [BattleScriptTrysetfutureattackOperand<'a>],
        resolved_target: Option<BattleScriptTrysetfutureattackResolvedLabel<'a>>,
    ) -> BattleScriptTrysetfutureattackInstruction<'a> {
        BattleScriptTrysetfutureattackInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME,
            program_counter: 1304,
            opcode_id: BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER,
            operands,
            resolved_target,
        }
    }

    #[test]
    fn moves_table_rows_248_and_353_match_ts_moves_json() {
        let future_sight = &MOVES[248];
        assert_eq!(future_sight.id, 248);
        assert_eq!(future_sight.move_type, crate::damage_calc::TYPE_PSYCHIC);
        assert_eq!(future_sight.power, 80);
        assert_eq!(future_sight.effect, 148);

        let doom_desire = &MOVES[353];
        assert_eq!(doom_desire.id, 353);
        assert_eq!(doom_desire.move_type, TYPE_STEEL);
        assert_eq!(doom_desire.power, 120);
        assert_eq!(doom_desire.effect, 148);

        // Neither row is EFFECT_EXPLOSION (7): is_explosion_effect is
        // always false for this leaf, matching the TS input's omission.
        assert_ne!(future_sight.effect, 7);
        assert_ne!(doom_desire.effect, 7);
    }

    #[test]
    fn not_a_future_move_error_is_exact() {
        let r = rules(
            Some(BattleScriptTrysetfutureattackBattler::Battler0),
            Some(BattleScriptTrysetfutureattackBattler::Battler1),
            [0, 0, 0, 0],
            33,
        );
        assert_eq!(
            calculate_future_attack_base_damage(
                &r,
                BattleScriptTrysetfutureattackBattler::Battler0,
                BattleScriptTrysetfutureattackBattler::Battler1,
                33,
            )
            .expect_err("not a future move")
            .to_string(),
            "Cmd_trysetfutureattack requires Future Sight or Doom Desire, got 33"
        );
    }

    #[test]
    fn lazy_label_resolution_only_matters_on_the_fail_branch() {
        let attacker = Some(BattleScriptTrysetfutureattackBattler::Battler0);
        let target = Some(BattleScriptTrysetfutureattackBattler::Battler1);
        let unresolved = instruction(&FAILED_OPERAND, None);

        let empty_counter = rules(attacker, target, [0, 0, 0, 0], 248);
        assert!(apply_battle_script_trysetfutureattack(unresolved, &empty_counter).is_ok());

        let occupied_counter = rules(attacker, target, [0, 2, 0, 0], 248);
        assert_eq!(
            apply_battle_script_trysetfutureattack(unresolved, &occupied_counter)
                .expect_err("unresolved target")
                .to_string(),
            "Cmd_trysetfutureattack unresolved target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn helping_hand_truncates() {
        let attacker = Some(BattleScriptTrysetfutureattackBattler::Battler0);
        let target = Some(BattleScriptTrysetfutureattackBattler::Battler1);
        let mut r = rules(attacker, target, [0, 0, 0, 0], 248);
        r.battlers[0].helping_hand = 1;
        let outcome = apply_battle_script_trysetfutureattack(
            instruction(&FAILED_OPERAND, Some(RESOLVED)),
            &r,
        )
        .expect("clean success");
        let base = calculate_future_attack_base_damage(
            &r,
            BattleScriptTrysetfutureattackBattler::Battler0,
            BattleScriptTrysetfutureattackBattler::Battler1,
            248,
        )
        .unwrap();
        assert_eq!(outcome.rules.future_sight_dmg[1], (base * 15) / 10);
    }

    #[test]
    fn side_statuses_or_retain_other_bits() {
        let attacker = Some(BattleScriptTrysetfutureattackBattler::Battler0);
        let target = Some(BattleScriptTrysetfutureattackBattler::Battler1);
        let mut r = rules(attacker, target, [0, 0, 0, 0], 248);
        r.side_statuses[1] = 0x8000;
        let outcome = apply_battle_script_trysetfutureattack(
            instruction(&FAILED_OPERAND, Some(RESOLVED)),
            &r,
        )
        .expect("clean success");
        assert_eq!(outcome.rules.side_statuses[1], 0x8000 | (1 << 6));
        assert_eq!(outcome.rules.side_statuses[0], 0);
    }

    #[test]
    fn counter_write_retains_other_cells() {
        let attacker = Some(BattleScriptTrysetfutureattackBattler::Battler2);
        let target = Some(BattleScriptTrysetfutureattackBattler::Battler3);
        let mut r = rules(attacker, target, [1, 2, 0, 0], 353);
        r.future_sight_dmg = [11, 22, 0, 0];
        let outcome = apply_battle_script_trysetfutureattack(
            instruction(&FAILED_OPERAND, Some(RESOLVED)),
            &r,
        )
        .expect("clean success");
        assert_eq!(outcome.rules.future_sight_counter, [1, 2, 0, 3]);
        assert_eq!(outcome.rules.future_sight_dmg[0], 11);
        assert_eq!(outcome.rules.future_sight_dmg[1], 22);
        assert_eq!(outcome.rules.future_sight_attacker[3], 2);
        assert_eq!(outcome.rules.future_sight_move[3], 353);
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_DOOM_DESIRE
        );
        assert_eq!(
            outcome.control,
            BattleScriptTrysetfutureattackControl::Advance
        );
    }

    #[test]
    fn malformed_execution_shape_precedes_roles() {
        let bad = instruction(&[], Some(RESOLVED));
        let r = rules(None, None, [0, 0, 0, 0], 248);
        assert_eq!(
            apply_battle_script_trysetfutureattack(bad, &r)
                .expect_err("shape first")
                .to_string(),
            "Cmd_trysetfutureattack requires exactly one four-byte script pointer"
        );

        let good = instruction(&FAILED_OPERAND, Some(RESOLVED));
        assert_eq!(
            apply_battle_script_trysetfutureattack(good, &r)
                .expect_err("attacker role required")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let missing_target = rules(
            Some(BattleScriptTrysetfutureattackBattler::Battler0),
            None,
            [0, 0, 0, 0],
            248,
        );
        assert_eq!(
            apply_battle_script_trysetfutureattack(good, &missing_target)
                .expect_err("target role required")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn registration_accepts_one_start_and_rejects_wrong_cardinality_and_shape() {
        let good = instruction(&FAILED_OPERAND, Some(RESOLVED));
        assert_eq!(
            register_battle_script_trysetfutureattack_handler(&[good])
                .expect("one start registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE
        );
        assert_eq!(
            register_battle_script_trysetfutureattack_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "expected one B_SCR_OP_TRYSETFUTUREATTACK, got 0"
        );
        assert_eq!(
            register_battle_script_trysetfutureattack_handler(&[good, good])
                .expect_err("two starts")
                .to_string(),
            "expected one B_SCR_OP_TRYSETFUTUREATTACK, got 2"
        );
        let bad = BattleScriptTrysetfutureattackInstruction { opcode_id: 0xc4, ..good };
        assert_eq!(
            register_battle_script_trysetfutureattack_handler(&[bad])
                .expect_err("shape offender reported")
                .to_string(),
            "invalid B_SCR_OP_TRYSETFUTUREATTACK encoding"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYSETFUTUREATTACK_BATTLERS {
            assert_eq!(
                BattleScriptTrysetfutureattackBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTrysetfutureattackBattler::from_u8(4), None);
    }
}
