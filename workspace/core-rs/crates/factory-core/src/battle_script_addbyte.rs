//! Pure `B_SCR_OP_ADDBYTE` (0x2F, `Cmd_addbyte`) -- the native twin of
//! `createAddbyteHandler` (`src/engine/battleScriptDamagingWeatherOpcode.ts:
//! 249-291`), which reuses three shared helpers from
//! `src/engine/battleScriptSetByte.ts`: `resolveBattleScriptSetByteValue`
//! (the `SETBYTE_VALUES` literal catalog), `readBattleScriptRulesByte`, and
//! `writeBattleScriptRulesByte`.
//!
//! Registration is find-FIRST REQUIRED only (`findInstructionOpcodeId`,
//! `battleScriptDamagingWeatherOpcode.ts:399-403`, used at :443) -- the same
//! convention `battle_script_byte_algebra.rs`'s bicword uses: no shape or
//! operand validation at registration, every guard lives at runtime as a
//! first-class `Halt` mirroring canonical `unsupportedBranch` verbatim.
//!
//! Runtime order (canonical, exact):
//! 1. `sMULTIHIT_STRING + 4` is checked FIRST, literally, before the 24-name
//!    pointer universe -- it is never a `setbyte` lvalue, only ever
//!    incremented, so it is not part of `BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS`
//!    and is read/written directly against its own dedicated
//!    `multi_hit_string_counter` field (painsplit/tryhealhalfhealth
//!    precedent). An unmodeled byte expression here still halts.
//! 2. Otherwise the pointer must be one of the 24 listed expressions AND the
//!    byte expression must resolve through the catalog, or the instruction
//!    halts (mirrors `unsupportedBranch`, never an error).
//! 3. The write step can independently reject an already-successful read:
//!    `gBattlerTarget` and `sBATTLER` require the incremented value `< 4`.
//!    That specific rejection is a genuine `throw`, not a halt -- ported
//!    verbatim as [`BattleScriptAddbyteError::WriteRejectedIncrementedValue`].
//!
//! Value resolution is catalog-based (same `battle_script_jumpif.rs`
//! plain-catalog-lookup convention this brief calls out): rather than
//! hand-porting the ~130-entry `SETBYTE_VALUES` map, [`ADDBYTE_VALUES`]
//! records the committed addbyte deltas (`"1"`, `"10"`) plus the plain
//! integer literals of `SETBYTE_VALUES` (`"0"`, `"1"`, `"2"`, `"10"`) and its
//! parenthesized zero/20/40 byte-lane forms. Any expression absent from the
//! catalog is unmodeled -- a real, DELIBERATE narrowing vs the full TS
//! catalog (which also resolves `MOVE_EFFECT_*`/`STAT_*`/atomic-message
//! literals never used as an addbyte delta in the committed program), the
//! same beyond-committed-universe divergence `battle_script_bicbyte.rs`
//! documents for its own narrower runtime pointer universe.
//!
//! Byte-lane encodings (ported exactly): `gBattleMoveDamage` is a SIGNED i32
//! (TS `| 0`) whose 4 lanes read as `(damage >>> 8k) & 0xff` and write via
//! `replaceByte32`; `sTRIPLE_KICK_POWER` is a u16 with 2 lanes via
//! `replaceByte16`; `gBattlerTarget` READS as `selectorRoles.target ?? 0xff`
//! (a missing role reads as the `BATTLER_NONE` sentinel `0xff`, so `+1`
//! wraps to `0` and that write succeeds, SETTING the role); every other
//! listed pointer is a plain u8 field.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `Cmd_addbyte` :3823-3828 (`*memByte += gBattlescriptCurrInstr[5];
//! gBattlescriptCurrInstr += 6;`); dispatch row :378 (`//0x2F`); forward decl
//! :126. `include/constants/battle_script_commands.h:53` (`B_SCR_OP_ADDBYTE`).
//! Macro `asm/macros/battle_script.inc:263-267` (`addbyte ptr:req, byte:req`,
//! operand widths 4/1). Committed census (`data/battle_scripts_1.s`, 9
//! sites): `sMULTIHIT_STRING + 4, 1` :636,:1400; `sTRIPLE_KICK_POWER, 10`
//! :1399; `sBATTLER, 1` :1580,:4003; `gBattlerTarget, 1` :2594,:4040;
//! `gBattleCommunication, 1` :3220; `gBattleCommunication + 1, 1` :4442.
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI.

use core::fmt;

pub const BATTLE_SCRIPT_ADDBYTE_OPCODE: u8 = 0x2f;
pub const BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME: &str = "B_SCR_OP_ADDBYTE";
pub const BATTLE_SCRIPT_ADDBYTE_DISPATCHER: &str = "Cmd_addbyte";
pub const BATTLE_SCRIPT_ADDBYTE_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_ADDBYTE_BYTE_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_ADDBYTE_ENCODED_WIDTH_BYTES: u8 = 6;
pub const BATTLE_SCRIPT_ADDBYTE_CONCRETE_START_COUNT: usize = 9;
pub const BATTLE_SCRIPT_ADDBYTE_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_ADDBYTE_HANDLER_LINE: u32 = 3823;

/// `sMULTIHIT_STRING + 4`'s pointer expression -- checked FIRST, before the
/// 24-name pointer universe below (module doc comment, point 1).
pub const BATTLE_SCRIPT_ADDBYTE_MULTIHIT_STRING_COUNTER_EXPRESSION: &str = "sMULTIHIT_STRING + 4";

/// Direct port of `BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS`
/// (`battleScriptSetByte.ts:31-56`) -- the same 24-name list
/// `battle_script_byte_algebra.rs` already ports verbatim.
pub const BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS: [&str; 24] = [
    "cEFFECT_CHOOSER",
    "cMULTISTRING_CHOOSER",
    "gBattleCommunication",
    "gBattleCommunication + 1",
    "gBattleMoveDamage",
    "gBattleMoveDamage + 1",
    "gBattleMoveDamage + 2",
    "gBattleMoveDamage + 3",
    "gBattlerTarget",
    "gMoveResultFlags",
    "sBATTLER",
    "sB_ANIM_TARGETS_HIT",
    "sB_ANIM_TURN",
    "sDMG_MULTIPLIER",
    "sGIVEEXP_STATE",
    "sLEARNMOVE_STATE",
    "sLVLBOX_STATE",
    "sMOVEEND_STATE",
    "sMULTIHIT_EFFECT",
    "sSTATCHANGER",
    "sSTAT_ANIM_PLAYED",
    "sTRIPLE_KICK_POWER",
    "sTRIPLE_KICK_POWER + 1",
    "sTWOTURN_STRINGID",
];

/// Narrow projection of `SETBYTE_VALUES` (`battleScriptSetByte.ts:177-240`),
/// restricted to the committed addbyte deltas (`"1"`, `"10"`) plus the
/// catalog's plain integer literals and parenthesized zero/20/40 byte-lane
/// forms (module doc comment). Beyond-catalog expressions (e.g. the
/// `MOVE_EFFECT_*`/`STAT_*` combos, which no committed addbyte call site
/// uses) are a deliberate narrowing divergence vs full canonical TypeScript.
const ADDBYTE_VALUES: [(&str, u8); 14] = [
    ("0", 0),
    ("1", 1),
    ("2", 2),
    ("10", 10),
    ("(0) & 0xFF", 0),
    ("((0) >> 8) & 0xFF", 0),
    ("(20) & 0xFF", 20),
    ("((20) >> 8) & 0xFF", 0),
    ("((20) >> 16) & 0xFF", 0),
    ("((20) >> 24) & 0xFF", 0),
    ("(40) & 0xFF", 40),
    ("((40) >> 8) & 0xFF", 0),
    ("((40) >> 16) & 0xFF", 0),
    ("((40) >> 24) & 0xFF", 0),
];

/// Native twin of `resolveBattleScriptSetByteValue`, narrowed to this
/// opcode's catalog (see module doc comment and [`ADDBYTE_VALUES`]).
#[must_use]
pub fn resolve_battle_script_addbyte_value(expression: &str) -> Option<u8> {
    ADDBYTE_VALUES
        .iter()
        .find_map(|(candidate, value)| (*candidate == expression).then_some(*value))
}

fn replace_byte32(value: i32, offset: u32, byte: u8) -> i32 {
    let shift = offset * 8;
    (((value as u32) & !(0xffu32 << shift)) | (u32::from(byte) << shift)) as i32
}

fn replace_byte16(value: u16, offset: u32, byte: u8) -> u16 {
    let shift = offset * 8;
    (value & !(0xffu16 << shift)) | (u16::from(byte) << shift)
}

/// Direct port of `BattleScriptSetByteRulesContext`
/// (`battleScriptSetByte.ts:8-29`), plus `multiHitStringCounter`
/// (painsplit/tryhealhalfhealth field precedent) for the `sMULTIHIT_STRING +
/// 4` pointer that is never part of the SETBYTE universe itself.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAddbyteRules {
    pub battle_communication0: u8,
    pub battle_communication1: u8,
    /// SIGNED i32 -- TS `| 0` (module doc comment).
    pub battle_move_damage: i32,
    pub dmg_multiplier: u8,
    pub move_effect_byte: u8,
    pub move_result_flags: u8,
    pub multistring_chooser: u8,
    /// `selectorRoles.target: 0 | 1 | 2 | 3 | null`.
    pub selector_target: Option<u8>,
    pub scripting_battler: u8,
    pub anim_targets_hit: u8,
    pub anim_turn: u8,
    pub give_exp_state: u8,
    pub learn_move_state: u8,
    pub lvl_box_state: u8,
    pub moveend_state: u8,
    pub multi_hit_effect: u8,
    pub stat_changer: u8,
    pub stat_anim_played: u8,
    pub triple_kick_power: u16,
    pub two_turn_stringid: u8,
    /// `sMULTIHIT_STRING + 4` -- not part of the SETBYTE pointer universe.
    pub multi_hit_string_counter: u8,
}

/// Native twin of `readBattleScriptRulesByte`
/// (`battleScriptSetByte.ts:256-287`), restricted to the 24-name pointer
/// universe (`sMULTIHIT_STRING + 4` is handled separately by the caller).
#[must_use]
pub fn read_battle_script_addbyte_byte(
    rules: &BattleScriptAddbyteRules,
    expression: &str,
) -> Option<u8> {
    Some(match expression {
        "cEFFECT_CHOOSER" => rules.move_effect_byte,
        "cMULTISTRING_CHOOSER" => rules.multistring_chooser,
        "gBattleCommunication" => rules.battle_communication0,
        "gBattleCommunication + 1" => rules.battle_communication1,
        "gBattleMoveDamage" => (rules.battle_move_damage as u32 & 0xff) as u8,
        "gBattleMoveDamage + 1" => ((rules.battle_move_damage as u32 >> 8) & 0xff) as u8,
        "gBattleMoveDamage + 2" => ((rules.battle_move_damage as u32 >> 16) & 0xff) as u8,
        "gBattleMoveDamage + 3" => ((rules.battle_move_damage as u32 >> 24) & 0xff) as u8,
        "gBattlerTarget" => rules.selector_target.unwrap_or(0xff),
        "gMoveResultFlags" => rules.move_result_flags,
        "sBATTLER" => rules.scripting_battler,
        "sB_ANIM_TARGETS_HIT" => rules.anim_targets_hit,
        "sB_ANIM_TURN" => rules.anim_turn,
        "sDMG_MULTIPLIER" => rules.dmg_multiplier,
        "sGIVEEXP_STATE" => rules.give_exp_state,
        "sLEARNMOVE_STATE" => rules.learn_move_state,
        "sLVLBOX_STATE" => rules.lvl_box_state,
        "sMOVEEND_STATE" => rules.moveend_state,
        "sMULTIHIT_EFFECT" => rules.multi_hit_effect,
        "sSTATCHANGER" => rules.stat_changer,
        "sSTAT_ANIM_PLAYED" => rules.stat_anim_played,
        "sTRIPLE_KICK_POWER" => (rules.triple_kick_power & 0xff) as u8,
        "sTRIPLE_KICK_POWER + 1" => ((rules.triple_kick_power >> 8) & 0xff) as u8,
        "sTWOTURN_STRINGID" => rules.two_turn_stringid,
        _ => return None,
    })
}

/// Native twin of `writeBattleScriptRulesByte`
/// (`battleScriptSetByte.ts:289-324`), restricted to the 24-name pointer
/// universe. `gBattlerTarget` and `sBATTLER` reject `value >= 4` -- the only
/// two pointers that can turn a successful read into a rejected write.
#[must_use]
pub fn write_battle_script_addbyte_byte(
    rules: &BattleScriptAddbyteRules,
    expression: &str,
    value: u8,
) -> Option<BattleScriptAddbyteRules> {
    let mut next = *rules;
    match expression {
        "cEFFECT_CHOOSER" => next.move_effect_byte = value,
        "cMULTISTRING_CHOOSER" => next.multistring_chooser = value,
        "gBattleCommunication" => next.battle_communication0 = value,
        "gBattleCommunication + 1" => next.battle_communication1 = value,
        "gBattleMoveDamage" => {
            next.battle_move_damage = replace_byte32(rules.battle_move_damage, 0, value)
        }
        "gBattleMoveDamage + 1" => {
            next.battle_move_damage = replace_byte32(rules.battle_move_damage, 1, value)
        }
        "gBattleMoveDamage + 2" => {
            next.battle_move_damage = replace_byte32(rules.battle_move_damage, 2, value)
        }
        "gBattleMoveDamage + 3" => {
            next.battle_move_damage = replace_byte32(rules.battle_move_damage, 3, value)
        }
        "gBattlerTarget" => {
            if value >= 4 {
                return None;
            }
            next.selector_target = Some(value);
        }
        "gMoveResultFlags" => next.move_result_flags = value,
        "sBATTLER" => {
            if value >= 4 {
                return None;
            }
            next.scripting_battler = value;
        }
        "sB_ANIM_TARGETS_HIT" => next.anim_targets_hit = value,
        "sB_ANIM_TURN" => next.anim_turn = value,
        "sDMG_MULTIPLIER" => next.dmg_multiplier = value,
        "sGIVEEXP_STATE" => next.give_exp_state = value,
        "sLEARNMOVE_STATE" => next.learn_move_state = value,
        "sLVLBOX_STATE" => next.lvl_box_state = value,
        "sMOVEEND_STATE" => next.moveend_state = value,
        "sMULTIHIT_EFFECT" => next.multi_hit_effect = value,
        "sSTATCHANGER" => next.stat_changer = value,
        "sSTAT_ANIM_PLAYED" => next.stat_anim_played = value,
        "sTRIPLE_KICK_POWER" => {
            next.triple_kick_power = replace_byte16(rules.triple_kick_power, 0, value)
        }
        "sTRIPLE_KICK_POWER + 1" => {
            next.triple_kick_power = replace_byte16(rules.triple_kick_power, 1, value)
        }
        "sTWOTURN_STRINGID" => next.two_turn_stringid = value,
        _ => return None,
    }
    Some(next)
}

/// Registration validates NOTHING for addbyte (find-FIRST REQUIRED only) --
/// the same convention `battle_script_byte_algebra.rs`'s bicword uses.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAddbyteRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// `committed Battle Script program does not emit B_SCR_OP_ADDBYTE`
/// (`findInstructionOpcodeId`, `battleScriptDamagingWeatherOpcode.ts:399-403`,
/// used at :443).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAddbyteRegistrationError;

impl fmt::Display for BattleScriptAddbyteRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME}"
        )
    }
}

impl std::error::Error for BattleScriptAddbyteRegistrationError {}

/// Find-FIRST REQUIRED, same convention as `battle_script_byte_algebra.rs`'s
/// `register_battle_script_bicword`.
pub fn register_battle_script_addbyte(
    instructions: &[BattleScriptAddbyteRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptAddbyteRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptAddbyteRegistrationError)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAddbyteInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub pointer_expression: &'a str,
    pub byte_expression: &'a str,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// outcome, never an error (M74 shape).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAddbyteHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAddbyteOutcome {
    Advance {
        rules: BattleScriptAddbyteRules,
    },
    /// The pointer/byte operand pair is outside the modeled universe --
    /// mirrors canonical `unsupportedBranch` verbatim, never an error.
    Halt(BattleScriptAddbyteHalt),
}

/// The one genuine runtime `throw` this opcode can reach: a successful read
/// whose incremented value the write step rejects (`gBattlerTarget`/`sBATTLER`
/// requiring `< 4`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAddbyteError<'a> {
    WriteRejectedIncrementedValue { pointer_expression: &'a str },
}

impl fmt::Display for BattleScriptAddbyteError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WriteRejectedIncrementedValue { pointer_expression } => write!(
                formatter,
                "Cmd_addbyte: {pointer_expression} accepted a read but rejected the incremented value"
            ),
        }
    }
}

impl std::error::Error for BattleScriptAddbyteError<'_> {}

/// Native twin of `createAddbyteHandler`
/// (`battleScriptDamagingWeatherOpcode.ts:249-291`): `*ptr += byte` over the
/// SETBYTE byte-lvalue universe plus the dedicated multi-hit-string-counter
/// pointer, in the exact canonical evaluation order (module doc comment).
pub fn apply_battle_script_addbyte<'a>(
    instruction: &BattleScriptAddbyteInstruction<'a>,
    rules: &BattleScriptAddbyteRules,
) -> Result<BattleScriptAddbyteOutcome, BattleScriptAddbyteError<'a>> {
    let pointer = instruction.pointer_expression;
    let delta = resolve_battle_script_addbyte_value(instruction.byte_expression);

    let halt = || {
        BattleScriptAddbyteOutcome::Halt(BattleScriptAddbyteHalt {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME,
            source_construct: format!(
                "Cmd_addbyte's operand ({}, {}) is not modeled",
                pointer, instruction.byte_expression
            ),
            source_file: BATTLE_SCRIPT_ADDBYTE_SOURCE_FILE,
            source_line: BATTLE_SCRIPT_ADDBYTE_HANDLER_LINE,
        })
    };

    if pointer == BATTLE_SCRIPT_ADDBYTE_MULTIHIT_STRING_COUNTER_EXPRESSION {
        return match delta {
            None => Ok(halt()),
            Some(delta) => {
                let mut next = *rules;
                next.multi_hit_string_counter = rules.multi_hit_string_counter.wrapping_add(delta);
                Ok(BattleScriptAddbyteOutcome::Advance { rules: next })
            }
        };
    }

    let current = if BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&pointer) {
        read_battle_script_addbyte_byte(rules, pointer)
    } else {
        None
    };
    let (Some(current), Some(delta)) = (current, delta) else {
        return Ok(halt());
    };
    let incremented = current.wrapping_add(delta);
    match write_battle_script_addbyte_byte(rules, pointer, incremented) {
        Some(next) => Ok(BattleScriptAddbyteOutcome::Advance { rules: next }),
        None => Err(BattleScriptAddbyteError::WriteRejectedIncrementedValue {
            pointer_expression: pointer,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptAddbyteRules {
        BattleScriptAddbyteRules {
            battle_communication0: 0,
            battle_communication1: 0,
            battle_move_damage: 0,
            dmg_multiplier: 1,
            move_effect_byte: 0,
            move_result_flags: 0,
            multistring_chooser: 0,
            selector_target: Some(0),
            scripting_battler: 0,
            anim_targets_hit: 0,
            anim_turn: 0,
            give_exp_state: 0,
            learn_move_state: 0,
            lvl_box_state: 0,
            moveend_state: 0,
            multi_hit_effect: 0,
            stat_changer: 0,
            stat_anim_played: 0,
            triple_kick_power: 0,
            two_turn_stringid: 0,
            multi_hit_string_counter: 0,
        }
    }

    fn instr<'a>(pointer: &'a str, byte: &'a str) -> BattleScriptAddbyteInstruction<'a> {
        BattleScriptAddbyteInstruction {
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_ADDBYTE_OPCODE,
            pointer_expression: pointer,
            byte_expression: byte,
        }
    }

    #[test]
    fn catalog_resolves_both_directions() {
        assert_eq!(resolve_battle_script_addbyte_value("1"), Some(1));
        assert_eq!(resolve_battle_script_addbyte_value("10"), Some(10));
        assert_eq!(resolve_battle_script_addbyte_value("0"), Some(0));
        assert_eq!(resolve_battle_script_addbyte_value("2"), Some(2));
        assert_eq!(resolve_battle_script_addbyte_value("(20) & 0xFF"), Some(20));
        assert_eq!(
            resolve_battle_script_addbyte_value("((40) >> 8) & 0xFF"),
            Some(0)
        );
        assert_eq!(
            resolve_battle_script_addbyte_value("MOVE_EFFECT_SLEEP"),
            None
        );
        assert_eq!(resolve_battle_script_addbyte_value("99"), None);
    }

    #[test]
    fn multihit_string_counter_pointer_checked_before_universe() {
        // sMULTIHIT_STRING + 4 is not in BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS
        // at all, but still resolves via the dedicated (a) branch.
        assert!(!BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS
            .contains(&BATTLE_SCRIPT_ADDBYTE_MULTIHIT_STRING_COUNTER_EXPRESSION));
        let mut r = rules();
        r.multi_hit_string_counter = 0xff;
        let outcome = apply_battle_script_addbyte(&instr("sMULTIHIT_STRING + 4", "1"), &r).unwrap();
        match outcome {
            BattleScriptAddbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.multi_hit_string_counter, 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn multihit_string_counter_unknown_delta_halts() {
        let r = rules();
        let outcome =
            apply_battle_script_addbyte(&instr("sMULTIHIT_STRING + 4", "MOVE_EFFECT_SLEEP"), &r)
                .unwrap();
        match outcome {
            BattleScriptAddbyteOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_addbyte's operand (sMULTIHIT_STRING + 4, MOVE_EFFECT_SLEEP) is not modeled"
                );
                assert_eq!(halt.source_line, 3823);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn unknown_pointer_halts() {
        let r = rules();
        let outcome = apply_battle_script_addbyte(&instr("gBogusPointer", "1"), &r).unwrap();
        assert!(matches!(outcome, BattleScriptAddbyteOutcome::Halt(_)));
    }

    #[test]
    fn gbattlemovedamage_lane_write_is_signed_and_flips_sign() {
        let mut r = rules();
        r.battle_move_damage = 0x7f00_0000;
        let outcome =
            apply_battle_script_addbyte(&instr("gBattleMoveDamage + 3", "1"), &r).unwrap();
        match outcome {
            BattleScriptAddbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.battle_move_damage, 0x8000_0000u32 as i32);
                assert!(next.battle_move_damage < 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn triple_kick_power_lane_is_isolated_and_wraps() {
        let mut r = rules();
        r.triple_kick_power = (0xab << 8) | 0xfa;
        let outcome = apply_battle_script_addbyte(&instr("sTRIPLE_KICK_POWER", "10"), &r).unwrap();
        match outcome {
            BattleScriptAddbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.triple_kick_power & 0xff, 4);
                assert_eq!((next.triple_kick_power >> 8) & 0xff, 0xab);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn gbattlertarget_missing_role_reads_0xff_and_write_sets_role() {
        let mut r = rules();
        r.selector_target = None;
        let outcome = apply_battle_script_addbyte(&instr("gBattlerTarget", "1"), &r).unwrap();
        match outcome {
            BattleScriptAddbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.selector_target, Some(0));
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn gbattlertarget_and_sbattler_reject_increment_past_3() {
        let mut r = rules();
        r.selector_target = Some(3);
        let error = apply_battle_script_addbyte(&instr("gBattlerTarget", "1"), &r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_addbyte: gBattlerTarget accepted a read but rejected the incremented value"
        );

        let mut r2 = rules();
        r2.scripting_battler = 3;
        let error2 = apply_battle_script_addbyte(&instr("sBATTLER", "1"), &r2).unwrap_err();
        assert_eq!(
            error2.to_string(),
            "Cmd_addbyte: sBATTLER accepted a read but rejected the incremented value"
        );
    }

    #[test]
    fn registration_find_first_required() {
        let present = [BattleScriptAddbyteRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME,
            opcode_id: 0x2f,
        }];
        assert_eq!(register_battle_script_addbyte(&present).unwrap(), 0x2f);
        let missing = register_battle_script_addbyte(&[]).unwrap_err();
        assert_eq!(
            missing.to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ADDBYTE"
        );
    }

    #[test]
    fn pointer_universe_has_exactly_24_entries() {
        assert_eq!(BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.len(), 24);
    }
}
