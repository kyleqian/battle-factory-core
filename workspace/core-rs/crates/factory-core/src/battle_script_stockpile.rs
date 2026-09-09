//! Pure `B_SCR_OP_STOCKPILE` (0x85) / `B_SCR_OP_STOCKPILETOBASEDAMAGE` (0x86)
//! / `B_SCR_OP_STOCKPILETOHPHEAL` (0x87) registration, state, and control
//! leaf -- the deliberately narrow native twin of
//! `src/engine/battleScriptStockpileOpcode.ts`. This is the lane's second
//! damage-kernel consumer and the FIRST leaf to reuse the shared
//! `battle_script_base_damage` helper module (landed M72) instead of
//! hand-rolling its own `DamageCalcInput` construction: `0x86`'s
//! non-protected branch composes
//! [`crate::battle_script_base_damage::calculate_battle_script_base_damage_for_current_move`]
//! over a sub-slice of this leaf's own rules.
//!
//! Evaluation order per opcode (mirrors the canonical TypeScript handlers
//! exactly):
//! - `0x85`: attacker role, then the counter==3 cap (OR `MOVE_RESULT_MISSED`
//!   onto `moveResultFlags`, `B_MSG_CANT_STOCKPILE`, battler untouched) else
//!   increment the attacker's counter, write the new counter into
//!   `battleTextBuff1ByteNumber`, `B_MSG_STOCKPILED`. Always `Advance`, no
//!   RNG, no events, no scheduler change.
//! - `0x86`: attacker role, then counter==0 lazily-resolved `Jump` with
//!   rules unchanged, else the attacker's counter ALWAYS zeroes and (only
//!   when `missType != B_MSG_PROTECTED`) `battleMoveDamage` is set to
//!   `helper(rules)` multiplied by counter, then truncated per Helping
//!   Hand's `trunc(damage times 15 / 10)` rule (the counter multiplication
//!   strictly precedes the Helping Hand truncation), and `animTurn` is set
//!   to counter; the helper reads the ORIGINAL (pre-zeroing) rules, matching
//!   the canonical `calculateBattleScriptBaseDamageForCurrentMove(rules)`
//!   call against the un-mutated `rules` binding. Always `Advance` on the
//!   non-jump path.
//! - `0x87`: attacker role, then counter==0 lazily-resolved `Jump` with
//!   `B_MSG_SWALLOW_FAILED` and the counter untouched, else if
//!   `hp == maxHP` zero the counter, overwrite the target role to the
//!   attacker, `B_MSG_SWALLOW_FULL_HP`, and `Jump` (same failure label),
//!   else `heal = max(1, trunc(maxHP / (1 << (3 - counter))))`,
//!   `battleMoveDamage := -heal`, `animTurn := counter`, overwrite the
//!   target role to the attacker, zero the counter, `Advance`. The
//!   target-role overwrite happens on BOTH the full-HP jump and the success
//!   advance, never on the counter==0 jump.
//!
//! Every jump-branch failure pointer is resolved LAZILY -- only when that
//! branch is actually taken -- exactly like the canonical handlers' own
//! `resolveBattleScriptLabel` calls via the shared `failureProgramCounter`
//! helper (`battleScriptStockpileOpcode.ts:46-54`); the caller resolves the
//! operand's expression and reports the result on
//! [`BattleScriptStockpileInstruction::resolved_target`].
//!
//! Source authority:
//! - `Cmd_stockpile` is `reference/pokeemerald/src/battle_script_commands.c:6850-6866`;
//!   `Cmd_stockpiletobasedamage` is `:6868-6892` (its `CalculateBaseDamage`
//!   call passes the TARGET side's `sideStatuses`, `powerOverride` 0,
//!   `typeOverride` 0 -- already modeled inertly by the shared helper's own
//!   "no sideStatuses, no dynamic overrides beyond `dynamicBasePower`/
//!   `dynamicMoveType`" contract, see that module's doc comment); forward
//!   declarations `:212-214`; dispatch rows `:464-466` (`//0x85`,`//0x86`,`//0x87`).
//! - `Cmd_stockpiletohpheal` is `:6894-6922`.
//! - The three-macro family is `asm/macros/battle_script.inc:730-742`:
//!   `stockpile` (1 byte, no operand), `stockpiletobasedamage ptr` /
//!   `stockpiletohpheal ptr` (`.byte` + `.4byte`, 5 bytes each).
//! - Concrete call sites: `data/battle_scripts_1.s:2087`
//!   (`BattleScript_EffectStockpile` -> bare `stockpile`), `:2100`
//!   (`BattleScript_EffectSpitUp` -> `stockpiletobasedamage BattleScript_SpitUpFail`),
//!   `:2114` (`BattleScript_SpitUpFailProtect` -> the SAME failure label, a
//!   second concrete start), `:2123` (`BattleScript_EffectSwallow` ->
//!   `stockpiletohpheal BattleScript_SwallowFail`).
//! - `include/constants/battle_script_commands.h:139-141`.
//! - `include/constants/battle_string_ids.h:484-485` (`B_MSG_STOCKPILED` 0,
//!   `B_MSG_CANT_STOCKPILE` 1) and `:488-489` (`B_MSG_SWALLOW_FAILED` 0,
//!   `B_MSG_SWALLOW_FULL_HP` 1).
//! - `MOVE_RESULT_MISSED` is `constants/battle.h:220` (`1 << 0`);
//!   `B_MSG_PROTECTED` is `1` (`gBattleCommunication[MISS_TYPE]` comparison,
//!   pinned by the TS hit-chain opcode module's own miss-type block).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_base_damage::{
    calculate_battle_script_base_damage_for_current_move, BattleScriptBaseDamageBattler,
    BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageError, BattleScriptBaseDamageRoles,
    BattleScriptBaseDamageRules,
};

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_STOCKPILE_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_STOCKPILE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_STOCKPILE_OPCODE: u8 = 0x85;
pub const BATTLE_SCRIPT_STOCKPILE_OPCODE_NAME: &str = "B_SCR_OP_STOCKPILE";
pub const BATTLE_SCRIPT_STOCKPILE_DISPATCHER: &str = "Cmd_stockpile";
pub const BATTLE_SCRIPT_STOCKPILE_CONCRETE_START_COUNT: usize = 1;

/// `B_SCR_OP_STOCKPILETOBASEDAMAGE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE: u8 = 0x86;
pub const BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE_NAME: &str =
    "B_SCR_OP_STOCKPILETOBASEDAMAGE";
pub const BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_DISPATCHER: &str = "Cmd_stockpiletobasedamage";
/// The canonical program has TWO concrete starts (`BattleScript_EffectSpitUp`
/// and `BattleScript_SpitUpFailProtect`), unlike every other family in this
/// lane's single-start norm.
pub const BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_CONCRETE_START_COUNT: usize = 2;

/// `B_SCR_OP_STOCKPILETOHPHEAL` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE: u8 = 0x87;
pub const BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE_NAME: &str = "B_SCR_OP_STOCKPILETOHPHEAL";
pub const BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_DISPATCHER: &str = "Cmd_stockpiletohpheal";
pub const BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_CONCRETE_START_COUNT: usize = 1;

/// One four-byte failure pointer follows the opcode byte for 0x86/0x87.
pub const BATTLE_SCRIPT_STOCKPILE_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// `stockpile`'s encoded byte width: opcode byte only, no operand.
pub const BATTLE_SCRIPT_STOCKPILE_ENCODED_WIDTH_BYTES: u8 = 1;
/// `stockpiletobasedamage ptr` / `stockpiletohpheal ptr`'s encoded byte width.
pub const BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_ENCODED_WIDTH_BYTES: u8 = 5;
pub const BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_ENCODED_WIDTH_BYTES: u8 = 5;

/// `include/constants/battle.h:220` -- `MOVE_RESULT_MISSED`.
pub const BATTLE_SCRIPT_STOCKPILE_MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `include/constants/battle_string_ids.h:484`.
pub const BATTLE_SCRIPT_STOCKPILE_B_MSG_STOCKPILED: u8 = 0;
/// `include/constants/battle_string_ids.h:485`.
pub const BATTLE_SCRIPT_STOCKPILE_B_MSG_CANT_STOCKPILE: u8 = 1;
/// `include/constants/battle_string_ids.h:488`.
pub const BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FAILED: u8 = 0;
/// `include/constants/battle_string_ids.h:489`.
pub const BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FULL_HP: u8 = 1;
/// `gBattleCommunication[MISS_TYPE]` sentinel compared by `Cmd_stockpiletobasedamage`.
pub const BATTLE_SCRIPT_STOCKPILE_B_MSG_PROTECTED: u8 = 1;
/// The two-bit `DisableStruct::stockpileCounter` domain's cap.
pub const BATTLE_SCRIPT_STOCKPILE_COUNTER_MAX: u8 = 3;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptStockpileBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptStockpileBattler {
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

    /// Native twin of `BattleScriptBaseDamageBattler` -- both enums share
    /// the same four-slot source domain, so conversion is an identity
    /// re-tag rather than a lookup.
    #[must_use]
    pub const fn as_base_damage_battler(self) -> BattleScriptBaseDamageBattler {
        match self {
            Self::Battler0 => BattleScriptBaseDamageBattler::Battler0,
            Self::Battler1 => BattleScriptBaseDamageBattler::Battler1,
            Self::Battler2 => BattleScriptBaseDamageBattler::Battler2,
            Self::Battler3 => BattleScriptBaseDamageBattler::Battler3,
        }
    }
}

/// The complete per-battler projection this leaf reads or writes. `base`
/// is exactly the shared helper's own per-battler projection (composed, not
/// duplicated) so `0x86`'s success path can hand a sub-slice straight to
/// [`calculate_battle_script_base_damage_for_current_move`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileBattlerState {
    pub base: BattleScriptBaseDamageBattlerState,
    /// Source two-bit `DisableStruct::stockpileCounter` (0..=3).
    pub stockpile_counter: u8,
    /// `ProtectStruct::helpingHand`; only the attacker's is read (0x86).
    pub helping_hand: u8,
}

/// Canonical selector bindings. `target` is written by 0x87's overwrite branches.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileRoles {
    pub attacker: Option<BattleScriptStockpileBattler>,
    pub target: Option<BattleScriptStockpileBattler>,
}

/// Complete narrow rules slice read or written by this command family. No
/// scheduler and no events -- none of the three canonical handlers emit
/// either.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileRules {
    pub battlers: [BattleScriptStockpileBattlerState; BATTLE_SCRIPT_STOCKPILE_BATTLER_COUNT],
    /// `rules.battleTopology.battlersCount`, forwarded to the shared helper.
    pub battlers_count: u8,
    pub battle_type_flags: u32,
    pub weather: u32,
    pub current_move: u16,
    pub dynamic_base_power: u16,
    pub dynamic_move_type: u8,
    pub crit_multiplier: u8,
    pub selector_roles: BattleScriptStockpileRoles,
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_STOCKPILE_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_STOCKPILE_BATTLER_COUNT],
    /// `gBattleCommunication[MISS_TYPE]`; only `0x86` reads it.
    pub miss_type: u8,
    pub move_result_flags: u32,
    pub multistring_chooser: u8,
    /// `battleTextBuff1ByteNumber: number | null`; only `0x85`'s increment
    /// branch writes it.
    pub battle_text_buff1_byte_number: Option<u8>,
    pub battle_move_damage: i32,
    pub anim_turn: u8,
}

/// One source-macro operand retained for canonical shape validation. Empty
/// for `0x85` (no operand); one four-byte entry for `0x86`/`0x87`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution. Late
/// label resolution is a scheduler/program concern this leaf does not own;
/// the caller resolves the operand's expression and reports the result
/// here, lazily -- only when the taken branch actually needs it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptStockpileOperand<'a>],
    pub resolved_target: Option<BattleScriptStockpileResolvedLabel<'a>>,
}

/// The three dynamic opcode keys emitted by successful family registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileRegistration {
    pub stockpile_opcode_id: u8,
    pub to_base_damage_opcode_id: u8,
    pub to_hp_heal_opcode_id: u8,
}

/// Exact control directive emitted by any of the three narrow opcode leaves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptStockpileControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileOutcome {
    pub rules: BattleScriptStockpileRules,
    pub control: BattleScriptStockpileControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptStockpileError<'a> {
    /// Registration cardinality: `<name> requires exactly <n> concrete starts, got <got>`.
    WrongCardinality {
        name: &'static str,
        expected: usize,
        count: usize,
    },
    /// Per-instruction shape offender, at both registration and execution time.
    InvalidShape {
        opcode_name: &'a str,
        program_counter: u32,
    },
    MissingAttackerRole,
    /// `<dispatcher> unresolved failure target <expression>`.
    UnresolvedTarget {
        dispatcher: &'a str,
        expression: &'a str,
    },
    /// `0x86`'s non-protected success path forwards the shared helper's own
    /// error verbatim (missing target role, unknown move row, unknown type
    /// id, or an out-of-range item id).
    BaseDamage(BattleScriptBaseDamageError),
}

impl fmt::Display for BattleScriptStockpileError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { name, expected, count } => {
                write!(
                    formatter,
                    "{name} requires exactly {expected} concrete starts, got {count}"
                )
            }
            Self::InvalidShape { opcode_name, program_counter } => {
                write!(
                    formatter,
                    "invalid {opcode_name} shape at program counter {program_counter}"
                )
            }
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnresolvedTarget { dispatcher, expression } => {
                write!(
                    formatter,
                    "{dispatcher} unresolved failure target {expression}"
                )
            }
            Self::BaseDamage(inner) => write!(formatter, "{inner}"),
        }
    }
}

impl std::error::Error for BattleScriptStockpileError<'_> {}

fn validate_shape<'a>(
    instruction: &BattleScriptStockpileInstruction<'a>,
    opcode_id: u8,
    dispatcher: &str,
    operand_count: usize,
) -> Result<(), BattleScriptStockpileError<'a>> {
    let shape_ok = instruction.opcode_id == opcode_id
        && instruction.dispatcher == dispatcher
        && instruction.operands.len() == operand_count
        && (operand_count != 1
            || instruction.operands[0].width_bytes
                == BATTLE_SCRIPT_STOCKPILE_FAILURE_POINTER_WIDTH_BYTES);
    if shape_ok {
        Ok(())
    } else {
        Err(BattleScriptStockpileError::InvalidShape {
            opcode_name: instruction.opcode_name,
            program_counter: instruction.program_counter,
        })
    }
}

fn to_base_damage_rules(rules: &BattleScriptStockpileRules) -> BattleScriptBaseDamageRules {
    BattleScriptBaseDamageRules {
        battlers: rules.battlers.map(|battler| battler.base),
        battlers_count: rules.battlers_count,
        battle_type_flags: rules.battle_type_flags,
        weather: rules.weather,
        current_move: rules.current_move,
        dynamic_base_power: rules.dynamic_base_power,
        dynamic_move_type: rules.dynamic_move_type,
        crit_multiplier: rules.crit_multiplier,
        selector_roles: BattleScriptBaseDamageRoles {
            attacker: rules
                .selector_roles
                .attacker
                .map(BattleScriptStockpileBattler::as_base_damage_battler),
            target: rules
                .selector_roles
                .target
                .map(BattleScriptStockpileBattler::as_base_damage_battler),
        },
        enigma_berry_hold_effects: rules.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: rules.enigma_berry_hold_effect_params,
    }
}

fn require_attacker(
    rules: &BattleScriptStockpileRules,
) -> Result<BattleScriptStockpileBattler, BattleScriptStockpileError<'static>> {
    rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptStockpileError::MissingAttackerRole)
}

/// Native immutable-value twin of canonical `Cmd_stockpile`.
pub fn apply_battle_script_stockpile<'a>(
    instruction: BattleScriptStockpileInstruction<'a>,
    rules: &BattleScriptStockpileRules,
) -> Result<BattleScriptStockpileOutcome, BattleScriptStockpileError<'a>> {
    validate_shape(
        &instruction,
        BATTLE_SCRIPT_STOCKPILE_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_DISPATCHER,
        0,
    )?;
    let attacker = require_attacker(rules)?;

    let counter = rules.battlers[attacker.index()].stockpile_counter;
    let mut next = *rules;
    if counter == BATTLE_SCRIPT_STOCKPILE_COUNTER_MAX {
        next.move_result_flags |= BATTLE_SCRIPT_STOCKPILE_MOVE_RESULT_MISSED;
        next.multistring_chooser = BATTLE_SCRIPT_STOCKPILE_B_MSG_CANT_STOCKPILE;
    } else {
        let new_counter = counter + 1;
        next.battlers[attacker.index()].stockpile_counter = new_counter;
        next.battle_text_buff1_byte_number = Some(new_counter);
        next.multistring_chooser = BATTLE_SCRIPT_STOCKPILE_B_MSG_STOCKPILED;
    }
    Ok(
        BattleScriptStockpileOutcome {
            rules: next,
            control: BattleScriptStockpileControl::Advance,
        },
    )
}

/// Native immutable-value twin of canonical `Cmd_stockpiletobasedamage`.
///
/// # Errors
/// Propagates [`BattleScriptStockpileError::BaseDamage`] from the shared
/// helper on the non-protected success path (missing target role, unknown
/// move row, unknown type id, or an out-of-range item id).
pub fn apply_battle_script_stockpile_to_base_damage<'a>(
    instruction: BattleScriptStockpileInstruction<'a>,
    rules: &BattleScriptStockpileRules,
) -> Result<BattleScriptStockpileOutcome, BattleScriptStockpileError<'a>> {
    validate_shape(
        &instruction,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_DISPATCHER,
        1,
    )?;
    let attacker = require_attacker(rules)?;
    let counter = rules.battlers[attacker.index()].stockpile_counter;

    if counter == 0 {
        let resolved =
            instruction
                .resolved_target
                .ok_or(BattleScriptStockpileError::UnresolvedTarget {
                    dispatcher: instruction.dispatcher,
                    expression: instruction.operands[0].expression,
                })?;
        return Ok(BattleScriptStockpileOutcome {
            rules: *rules,
            control: BattleScriptStockpileControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next = *rules;
    next.battlers[attacker.index()].stockpile_counter = 0;
    if rules.miss_type != BATTLE_SCRIPT_STOCKPILE_B_MSG_PROTECTED {
        let base_damage_rules = to_base_damage_rules(rules);
        let base_damage = calculate_battle_script_base_damage_for_current_move(&base_damage_rules)
            .map_err(BattleScriptStockpileError::BaseDamage)?;
        let mut damage = base_damage * i32::from(counter);
        if rules.battlers[attacker.index()].helping_hand == 1 {
            damage = (damage * 15) / 10;
        }
        next.battle_move_damage = damage;
        next.anim_turn = counter;
    }
    Ok(
        BattleScriptStockpileOutcome {
            rules: next,
            control: BattleScriptStockpileControl::Advance,
        },
    )
}

/// Native immutable-value twin of canonical `Cmd_stockpiletohpheal`.
pub fn apply_battle_script_stockpile_to_hp_heal<'a>(
    instruction: BattleScriptStockpileInstruction<'a>,
    rules: &BattleScriptStockpileRules,
) -> Result<BattleScriptStockpileOutcome, BattleScriptStockpileError<'a>> {
    validate_shape(
        &instruction,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_DISPATCHER,
        1,
    )?;
    let attacker = require_attacker(rules)?;
    let battler = rules.battlers[attacker.index()];
    let counter = battler.stockpile_counter;

    if counter == 0 {
        let resolved =
            instruction
                .resolved_target
                .ok_or(BattleScriptStockpileError::UnresolvedTarget {
                    dispatcher: instruction.dispatcher,
                    expression: instruction.operands[0].expression,
                })?;
        let mut next = *rules;
        next.multistring_chooser = BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FAILED;
        return Ok(BattleScriptStockpileOutcome {
            rules: next,
            control: BattleScriptStockpileControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let target_roles = BattleScriptStockpileRoles {
        attacker: rules.selector_roles.attacker,
        target: Some(attacker),
    };

    if battler.base.hp == battler.base.max_hp {
        let resolved =
            instruction
                .resolved_target
                .ok_or(BattleScriptStockpileError::UnresolvedTarget {
                    dispatcher: instruction.dispatcher,
                    expression: instruction.operands[0].expression,
                })?;
        let mut next = *rules;
        next.battlers[attacker.index()].stockpile_counter = 0;
        next.selector_roles = target_roles;
        next.multistring_chooser = BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FULL_HP;
        return Ok(BattleScriptStockpileOutcome {
            rules: next,
            control: BattleScriptStockpileControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let shift = 1i32 << (3 - i32::from(counter));
    let heal = core::cmp::max(1, battler.base.max_hp / shift);
    let mut next = *rules;
    next.battlers[attacker.index()].stockpile_counter = 0;
    next.selector_roles = target_roles;
    next.battle_move_damage = -heal;
    next.anim_turn = counter;
    Ok(
        BattleScriptStockpileOutcome {
            rules: next,
            control: BattleScriptStockpileControl::Advance,
        },
    )
}

fn register_family_member<'a>(
    instructions: &[BattleScriptStockpileInstruction<'a>],
    opcode_name: &'static str,
    expected_starts: usize,
    opcode_id: u8,
    dispatcher: &str,
    operand_count: usize,
) -> Result<u8, BattleScriptStockpileError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == opcode_name)
        .collect::<Vec<_>>();
    if matching.len() != expected_starts {
        return Err(BattleScriptStockpileError::WrongCardinality {
            name: opcode_name,
            expected: expected_starts,
            count: matching.len(),
        });
    }
    for instruction in &matching {
        validate_shape(instruction, opcode_id, dispatcher, operand_count)?;
    }
    Ok(matching[0].opcode_id)
}

/// Native projection of `createBattleScriptStockpileOpcodeHandlers`. Each
/// family member's cardinality and shape are checked independently, in
/// declaration order (0x85, 0x86, 0x87); the first offender's error wins.
pub fn register_battle_script_stockpile_handlers<'a>(
    instructions: &[BattleScriptStockpileInstruction<'a>],
) -> Result<BattleScriptStockpileRegistration, BattleScriptStockpileError<'a>> {
    let stockpile_opcode_id = register_family_member(
        instructions,
        BATTLE_SCRIPT_STOCKPILE_OPCODE_NAME,
        BATTLE_SCRIPT_STOCKPILE_CONCRETE_START_COUNT,
        BATTLE_SCRIPT_STOCKPILE_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_DISPATCHER,
        0,
    )?;
    let to_base_damage_opcode_id = register_family_member(
        instructions,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE_NAME,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_CONCRETE_START_COUNT,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_DISPATCHER,
        1,
    )?;
    let to_hp_heal_opcode_id = register_family_member(
        instructions,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE_NAME,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_CONCRETE_START_COUNT,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE,
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_DISPATCHER,
        1,
    )?;
    Ok(BattleScriptStockpileRegistration {
        stockpile_opcode_id,
        to_base_damage_opcode_id,
        to_hp_heal_opcode_id,
    })
}

/// Independent source, dispatch, and macro evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileDecompDispatchEvidence {
    pub stockpile_forward_decl_line: u32,
    pub to_base_damage_forward_decl_line: u32,
    pub to_hp_heal_forward_decl_line: u32,
    pub stockpile_dispatch_line: u32,
    pub to_base_damage_dispatch_line: u32,
    pub to_hp_heal_dispatch_line: u32,
    pub stockpile_handler_line: u32,
    pub to_base_damage_handler_line: u32,
    pub to_hp_heal_handler_line: u32,
    pub command_enum_stockpile_line: u32,
    pub command_enum_to_base_damage_line: u32,
    pub command_enum_to_hp_heal_line: u32,
    pub stockpiled_string_id_line: u32,
    pub cant_stockpile_string_id_line: u32,
    pub swallow_failed_string_id_line: u32,
    pub swallow_full_hp_string_id_line: u32,
    pub macro_stockpile_declaration_line: u32,
    pub macro_to_base_damage_declaration_line: u32,
    pub macro_to_hp_heal_declaration_line: u32,
}

pub const BATTLE_SCRIPT_STOCKPILE_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptStockpileDecompDispatchEvidence = BattleScriptStockpileDecompDispatchEvidence {
    stockpile_forward_decl_line: 212,
    to_base_damage_forward_decl_line: 213,
    to_hp_heal_forward_decl_line: 214,
    stockpile_dispatch_line: 464,
    to_base_damage_dispatch_line: 465,
    to_hp_heal_dispatch_line: 466,
    stockpile_handler_line: 6850,
    to_base_damage_handler_line: 6868,
    to_hp_heal_handler_line: 6894,
    command_enum_stockpile_line: 139,
    command_enum_to_base_damage_line: 140,
    command_enum_to_hp_heal_line: 141,
    stockpiled_string_id_line: 484,
    cant_stockpile_string_id_line: 485,
    swallow_failed_string_id_line: 488,
    swallow_full_hp_string_id_line: 489,
    macro_stockpile_declaration_line: 730,
    macro_to_base_damage_declaration_line: 734,
    macro_to_hp_heal_declaration_line: 739,
};

/// Concrete call-site line numbers in `data/battle_scripts_1.s`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptStockpileCallSiteEvidence {
    pub stockpile_entry_label: &'static str,
    pub stockpile_entry_label_line: u32,
    pub stockpile_statement_line: u32,
    pub spit_up_entry_label: &'static str,
    pub spit_up_entry_label_line: u32,
    pub spit_up_statement_line: u32,
    pub spit_up_fail_protect_entry_label: &'static str,
    pub spit_up_fail_protect_entry_label_line: u32,
    pub spit_up_fail_protect_statement_line: u32,
    pub swallow_entry_label: &'static str,
    pub swallow_entry_label_line: u32,
    pub swallow_statement_line: u32,
    pub spit_up_fail_label: &'static str,
    pub swallow_fail_label: &'static str,
}

pub const BATTLE_SCRIPT_STOCKPILE_CALL_SITE_EVIDENCE: BattleScriptStockpileCallSiteEvidence =
    BattleScriptStockpileCallSiteEvidence {
        stockpile_entry_label: "BattleScript_EffectStockpile",
        stockpile_entry_label_line: 2083,
        stockpile_statement_line: 2087,
        spit_up_entry_label: "BattleScript_EffectSpitUp",
        spit_up_entry_label_line: 2094,
        spit_up_statement_line: 2100,
        spit_up_fail_protect_entry_label: "BattleScript_SpitUpFailProtect",
        spit_up_fail_protect_entry_label_line: 2110,
        spit_up_fail_protect_statement_line: 2114,
        swallow_entry_label: "BattleScript_EffectSwallow",
        swallow_entry_label_line: 2119,
        swallow_statement_line: 2123,
        spit_up_fail_label: "BattleScript_SpitUpFail",
        swallow_fail_label: "BattleScript_SwallowFail",
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn base_battler(species: u16) -> BattleScriptBaseDamageBattlerState {
        BattleScriptBaseDamageBattlerState {
            item: 0,
            ability: 0,
            species,
            types: [0, 0],
            level: 50,
            attack: 60,
            defense: 60,
            sp_attack: 60,
            sp_defense: 60,
            stat_stages: crate::damage_calc::StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
            hp: 100,
            max_hp: 100,
            status1: 0,
            status3: 0,
            flash_fire_boosted: 0,
        }
    }

    fn plain_battler(species: u16) -> BattleScriptStockpileBattlerState {
        BattleScriptStockpileBattlerState {
            base: base_battler(species),
            stockpile_counter: 0,
            helping_hand: 0,
        }
    }

    fn rules() -> BattleScriptStockpileRules {
        BattleScriptStockpileRules {
            battlers: [
                plain_battler(1),
                plain_battler(2),
                plain_battler(3),
                plain_battler(4),
            ],
            battlers_count: 2,
            battle_type_flags: 0,
            weather: 0,
            current_move: 33, // TACKLE
            dynamic_base_power: 0,
            dynamic_move_type: 0,
            crit_multiplier: 1,
            selector_roles: BattleScriptStockpileRoles {
                attacker: Some(BattleScriptStockpileBattler::Battler0),
                target: Some(BattleScriptStockpileBattler::Battler1),
            },
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
            miss_type: 0,
            move_result_flags: 0,
            multistring_chooser: 0xff,
            battle_text_buff1_byte_number: None,
            battle_move_damage: 0,
            anim_turn: 0,
        }
    }

    const NO_OPERANDS: [BattleScriptStockpileOperand<'static>; 0] = [];
    const FAIL_OPERAND: [BattleScriptStockpileOperand<'static>; 1] =
        [BattleScriptStockpileOperand { width_bytes: 4, expression: "BattleScript_SpitUpFail" }];
    const RESOLVED: BattleScriptStockpileResolvedLabel<'static> =
        BattleScriptStockpileResolvedLabel {
            expression: "BattleScript_SpitUpFail",
            program_counter: 4242,
        };

    fn stockpile_instruction() -> BattleScriptStockpileInstruction<'static> {
        BattleScriptStockpileInstruction {
            opcode_name: BATTLE_SCRIPT_STOCKPILE_OPCODE_NAME,
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_STOCKPILE_OPCODE,
            dispatcher: BATTLE_SCRIPT_STOCKPILE_DISPATCHER,
            operands: &NO_OPERANDS,
            resolved_target: None,
        }
    }

    fn to_base_damage_instruction(
        resolved_target: Option<BattleScriptStockpileResolvedLabel<'static>>,
    ) -> BattleScriptStockpileInstruction<'static> {
        BattleScriptStockpileInstruction {
            opcode_name: BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE_NAME,
            program_counter: 200,
            opcode_id: BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE,
            dispatcher: BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_DISPATCHER,
            operands: &FAIL_OPERAND,
            resolved_target,
        }
    }

    fn to_hp_heal_instruction(
        resolved_target: Option<BattleScriptStockpileResolvedLabel<'static>>,
    ) -> BattleScriptStockpileInstruction<'static> {
        BattleScriptStockpileInstruction {
            opcode_name: BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE_NAME,
            program_counter: 300,
            opcode_id: BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE,
            dispatcher: BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_DISPATCHER,
            operands: &FAIL_OPERAND,
            resolved_target,
        }
    }

    #[test]
    fn stockpile_increments_and_caps_at_three() {
        let mut r = rules();
        for expected in 1..=3u8 {
            let outcome = apply_battle_script_stockpile(stockpile_instruction(), &r).unwrap();
            assert_eq!(outcome.rules.battlers[0].stockpile_counter, expected);
            assert_eq!(outcome.rules.battle_text_buff1_byte_number, Some(expected));
            assert_eq!(
                outcome.rules.multistring_chooser,
                BATTLE_SCRIPT_STOCKPILE_B_MSG_STOCKPILED
            );
            r = outcome.rules;
        }
        // Fourth call: counter is already 3, caps.
        r.move_result_flags = 0x8; // prior bits must survive the OR.
        let outcome = apply_battle_script_stockpile(stockpile_instruction(), &r).unwrap();
        assert_eq!(outcome.rules.battlers[0].stockpile_counter, 3);
        assert_eq!(
            outcome.rules.move_result_flags,
            0x8 | BATTLE_SCRIPT_STOCKPILE_MOVE_RESULT_MISSED
        );
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_STOCKPILE_B_MSG_CANT_STOCKPILE
        );
        // buff untouched on the cap branch.
        assert_eq!(outcome.rules.battle_text_buff1_byte_number, Some(3));
    }

    #[test]
    fn to_base_damage_counter_zero_jumps_without_touching_rules() {
        let r = rules();
        let outcome = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        assert_eq!(
            outcome.control,
            BattleScriptStockpileControl::Jump { program_counter: 4242 }
        );
        assert_eq!(outcome.rules, r);
    }

    #[test]
    fn to_base_damage_zeroes_counter_on_both_protected_and_non_protected() {
        let mut r = rules();
        r.battlers[0].stockpile_counter = 2;
        r.miss_type = BATTLE_SCRIPT_STOCKPILE_B_MSG_PROTECTED;
        let outcome = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        assert_eq!(outcome.rules.battlers[0].stockpile_counter, 0);
        assert_eq!(outcome.rules.battle_move_damage, 0); // untouched: protected skips the helper
        assert_eq!(outcome.control, BattleScriptStockpileControl::Advance);

        r.miss_type = 0;
        let outcome = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        assert_eq!(outcome.rules.battlers[0].stockpile_counter, 0);
        assert!(outcome.rules.battle_move_damage != 0);
        assert_eq!(outcome.rules.anim_turn, 2);
    }

    #[test]
    fn to_base_damage_multiplies_by_counter_before_helping_hand_truncation() {
        let mut r = rules();
        r.battlers[0].stockpile_counter = 3;
        let without_hh = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        r.battlers[0].helping_hand = 1;
        let with_hh = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        let expected = (without_hh.rules.battle_move_damage * 15) / 10;
        assert_eq!(with_hh.rules.battle_move_damage, expected);
    }

    #[test]
    fn to_base_damage_helper_error_propagates() {
        let mut r = rules();
        r.battlers[0].stockpile_counter = 1;
        r.selector_roles.target = None;
        let error = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn to_base_damage_protected_skips_helper_even_without_target_role() {
        let mut r = rules();
        r.battlers[0].stockpile_counter = 1;
        r.selector_roles.target = None;
        r.miss_type = BATTLE_SCRIPT_STOCKPILE_B_MSG_PROTECTED;
        let outcome = apply_battle_script_stockpile_to_base_damage(
            to_base_damage_instruction(Some(RESOLVED)),
            &r,
        )
        .unwrap();
        assert_eq!(outcome.rules.battle_move_damage, 0);
        assert_eq!(outcome.rules.battlers[0].stockpile_counter, 0);
    }

    #[test]
    fn to_hp_heal_shift_table_and_floor() {
        let mut r = rules();
        r.battlers[0].base.max_hp = 100;
        r.battlers[0].base.hp = 50;
        for (counter, expected_heal) in [(1u8, 25i32), (2, 50), (3, 100)] {
            r.battlers[0].stockpile_counter = counter;
            let outcome = apply_battle_script_stockpile_to_hp_heal(
                to_hp_heal_instruction(Some(RESOLVED)),
                &r,
            )
            .unwrap();
            assert_eq!(outcome.rules.battle_move_damage, -expected_heal);
            assert_eq!(outcome.rules.anim_turn, counter);
            assert_eq!(outcome.rules.battlers[0].stockpile_counter, 0);
            assert_eq!(
                outcome.rules.selector_roles.target,
                Some(BattleScriptStockpileBattler::Battler0)
            );
        }

        // max(1, ...) floor: tiny maxHP truncates to 0 before the floor.
        r.battlers[0].base.max_hp = 2;
        r.battlers[0].base.hp = 1;
        r.battlers[0].stockpile_counter = 1;
        let outcome =
            apply_battle_script_stockpile_to_hp_heal(to_hp_heal_instruction(Some(RESOLVED)), &r)
                .unwrap();
        assert_eq!(outcome.rules.battle_move_damage, -1);
    }

    #[test]
    fn to_hp_heal_full_hp_zeroes_counter_and_overwrites_target_without_healing() {
        let mut r = rules();
        r.battlers[0].stockpile_counter = 2;
        r.battlers[0].base.hp = 100;
        r.battlers[0].base.max_hp = 100;
        let outcome =
            apply_battle_script_stockpile_to_hp_heal(to_hp_heal_instruction(Some(RESOLVED)), &r)
                .unwrap();
        assert_eq!(
            outcome.control,
            BattleScriptStockpileControl::Jump { program_counter: 4242 }
        );
        assert_eq!(outcome.rules.battlers[0].stockpile_counter, 0);
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptStockpileBattler::Battler0)
        );
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FULL_HP
        );
    }

    #[test]
    fn to_hp_heal_counter_zero_jump_leaves_target_role_and_counter_untouched() {
        let r = rules();
        let outcome =
            apply_battle_script_stockpile_to_hp_heal(to_hp_heal_instruction(Some(RESOLVED)), &r)
                .unwrap();
        assert_eq!(
            outcome.control,
            BattleScriptStockpileControl::Jump { program_counter: 4242 }
        );
        assert_eq!(outcome.rules.selector_roles.target, r.selector_roles.target);
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_STOCKPILE_B_MSG_SWALLOW_FAILED
        );
    }

    #[test]
    fn lazy_label_resolution_only_matters_on_jump_branches() {
        let mut success = rules();
        success.battlers[0].stockpile_counter = 1;
        success.battlers[0].base.hp = 50;
        assert!(
            apply_battle_script_stockpile_to_hp_heal(to_hp_heal_instruction(None), &success)
                .is_ok()
        );

        let fail = rules();
        let error = apply_battle_script_stockpile_to_hp_heal(to_hp_heal_instruction(None), &fail)
            .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_stockpiletohpheal unresolved failure target BattleScript_SpitUpFail"
        );
    }

    #[test]
    fn registration_counts_are_one_two_one() {
        let good_stockpile = stockpile_instruction();
        let good_to_base_damage = to_base_damage_instruction(Some(RESOLVED));
        let good_to_hp_heal = to_hp_heal_instruction(Some(RESOLVED));
        let registration = register_battle_script_stockpile_handlers(&[
            good_stockpile,
            good_to_base_damage,
            good_to_base_damage,
            good_to_hp_heal,
        ])
        .unwrap();
        assert_eq!(
            registration.stockpile_opcode_id,
            BATTLE_SCRIPT_STOCKPILE_OPCODE
        );
        assert_eq!(
            registration.to_base_damage_opcode_id,
            BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE
        );
        assert_eq!(
            registration.to_hp_heal_opcode_id,
            BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE
        );

        let error = register_battle_script_stockpile_handlers(&[
            good_to_base_damage,
            good_to_base_damage,
            good_to_hp_heal,
        ])
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "B_SCR_OP_STOCKPILE requires exactly 1 concrete starts, got 0"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptStockpileBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptStockpileBattler::from_u8(4), None);
    }
}
