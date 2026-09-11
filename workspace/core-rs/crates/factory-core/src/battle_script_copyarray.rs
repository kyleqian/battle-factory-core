//! Pure `B_SCR_OP_COPYARRAY` (0x31, `Cmd_copyarray`) -- the native twin of
//! `createCopyarrayHandler`
//! (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:166-345`), which
//! matches a CLOSED catalog of 12 concrete `(size, dst, src)` tuples --
//! first matching tuple wins, everything else is the single Halt barrier
//! mirroring canonical `unsupportedBranch` verbatim. No RNG, no jumps, no
//! labels anywhere in this opcode.
//!
//! Two of the 12 arms (`cEFFECT_CHOOSER<-sMULTIHIT_EFFECT`,
//! `cMULTISTRING_CHOOSER<-sTWOTURN_STRINGID`) route their copy through the
//! shared byte-universe read/write helpers
//! (`src/engine/battleScriptSetByte.ts`'s `readBattleScriptRulesByte`/
//! `writeBattleScriptRulesByte`), narrowed here to just the four pointers
//! these two arms ever touch. Canonical TS guards both with a
//! "became undecodable" throw that is DEFENSIVE DEAD CODE: both helpers are
//! total over these four pointers (u8 fields, unconditional write), so the
//! guard can never actually fire; it is ported verbatim as an
//! [`BattleScriptCopyarrayError`] variant, pinned only by a native unit test
//! (module doc convention already established by
//! `battle_script_addbyte.rs`'s own defensive-guard ports), never a
//! generated vector.
//!
//! Two arms are genuine reachable `throw`s: `gBattlerTarget<-gBattlerAttacker`
//! requires `selectorRoles.attacker` present, and `gEffectBattler<-
//! gBattlerTarget` requires `selectorRoles.target` present.
//!
//! Registration is find-FIRST REQUIRED only
//! (`findInstructionOpcodeId`, `battleScriptIngrainLeechSeedWrapOpcode.ts:
//! 605-608`, used at :634) -- same convention as
//! `battle_script_addbyte.rs`'s `register_battle_script_addbyte`: no shape
//! or operand validation at registration, every guard lives at runtime.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `Cmd_copyarray` :3837-3848 (`for (i = 0; i < size; i++) dest[i] = src[i];
//! gBattlescriptCurrInstr += 10;`); dispatch row :380 (`//0x31`); forward
//! decl :128. `include/constants/battle_script_commands.h:55`
//! (`B_SCR_OP_COPYARRAY`). Macro `asm/macros/battle_script.inc:275-280`
//! (`copyarray dest:req, src:req, size:req`, operand widths 4/4/1); sugar
//! macros `copybyte`/`copyhword`/`copyword` = `copyarray ..., 0x1/0x2/0x4`
//! (`asm/macros/battle_script.inc:1394-1404`). Committed census
//! (`data/battle_scripts_1.s`, 16 sites, 12 distinct tuples, independently
//! re-verified with grep): `:619` copybyte cEFFECT_CHOOSER,sMULTIHIT_EFFECT;
//! `:647`+`:1431` copyarray gBattleTextBuff1,sMULTIHIT_STRING,6;
//! `:715`+`:1035`+`:2192` copybyte gEffectBattler,gBattlerTarget; `:804`
//! copybyte cMULTISTRING_CHOOSER,sTWOTURN_STRINGID; `:1250` copyword
//! gBattleMoveDamage,sPAINSPLIT_HP; `:1401` copyhword
//! gDynamicBasePower,sTRIPLE_KICK_POWER; `:1491` copybyte
//! gBattlerTarget,gBattlerAttacker; `:2468` copybyte
//! sBATTLER,sBATTLER_WITH_ABILITY; `:2484` copyword
//! gHpDealt,gBattleMoveDamage; `:2489`+`:3270` copyword
//! gBattleMoveDamage,gHpDealt; `:3301` copyword gBattleMoveDamage,sBIDE_DMG;
//! `:3495` copybyte gBattlerTarget,sBATTLER.
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI.

use core::fmt;

pub const BATTLE_SCRIPT_COPYARRAY_OPCODE: u8 = 0x31;
pub const BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME: &str = "B_SCR_OP_COPYARRAY";
pub const BATTLE_SCRIPT_COPYARRAY_DISPATCHER: &str = "Cmd_copyarray";
pub const BATTLE_SCRIPT_COPYARRAY_DST_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_COPYARRAY_SRC_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_COPYARRAY_SIZE_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_COPYARRAY_CONCRETE_START_COUNT: usize = 16;
pub const BATTLE_SCRIPT_COPYARRAY_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_COPYARRAY_HANDLER_LINE: u32 = 3837;

/// Direct port of `BattleScriptSelectorRoleBindings`'s attacker/target/
/// effectBattler triple (`battleScriptRulesContext.ts`); `fainted` is out of
/// scope for this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyarraySelectorRoles {
    pub attacker: Option<u8>,
    pub target: Option<u8>,
    pub effect_battler: Option<u8>,
}

/// Only the fields the 12 arms touch, mirroring
/// `BattleScriptRulesContext`'s names/types exactly
/// (`battleScriptRulesContext.ts:711-957`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyarrayRules {
    /// SIGNED i32 -- `requireSigned32` (`battleScriptRulesContext.ts:2662`).
    pub battle_move_damage: i32,
    /// SIGNED i32 -- `requireSigned32` (`:2669`).
    pub hp_dealt: i32,
    /// SIGNED i32 -- `requireSigned32` (`:2666`).
    pub pain_split_hp: i32,
    /// SIGNED i32 -- `requireSigned32` (`:2673`).
    pub scripting_bide_dmg: i32,
    /// u16 -- `requireUnsigned(.., 0xffff, ..)` (`:2667`).
    pub dynamic_base_power: u16,
    /// u16 -- shared SETBYTE 2-lane field.
    pub triple_kick_power: u16,
    /// `cEFFECT_CHOOSER`'s underlying u8 field.
    pub move_effect_byte: u8,
    /// `sMULTIHIT_EFFECT`'s underlying u8 field.
    pub multi_hit_effect: u8,
    /// `cMULTISTRING_CHOOSER`'s underlying u8 field.
    pub multistring_chooser: u8,
    /// `sTWOTURN_STRINGID`'s underlying u8 field.
    pub two_turn_stringid: u8,
    /// `sBATTLER`'s underlying u8 field, `0..=3`.
    pub scripting_battler: u8,
    /// `sBATTLER_WITH_ABILITY`'s underlying u8 field, `0..=3`.
    pub battler_with_ability: u8,
    pub selector_roles: BattleScriptCopyarraySelectorRoles,
}

/// Narrow twin of `readBattleScriptRulesByte`, restricted to the two
/// pointers arms 6/7 ever read (`sMULTIHIT_EFFECT`, `sTWOTURN_STRINGID`) --
/// both total.
fn read_copyarray_rules_byte(rules: &BattleScriptCopyarrayRules, expression: &str) -> Option<u8> {
    match expression {
        "sMULTIHIT_EFFECT" => Some(rules.multi_hit_effect),
        "sTWOTURN_STRINGID" => Some(rules.two_turn_stringid),
        _ => None,
    }
}

/// Narrow twin of `writeBattleScriptRulesByte`, restricted to the two
/// pointers arms 6/7 ever write (`cEFFECT_CHOOSER`, `cMULTISTRING_CHOOSER`)
/// -- both unconditional u8 writes, never rejecting a value.
fn write_copyarray_rules_byte(
    rules: &BattleScriptCopyarrayRules,
    expression: &str,
    value: u8,
) -> Option<BattleScriptCopyarrayRules> {
    let mut next = *rules;
    match expression {
        "cEFFECT_CHOOSER" => next.move_effect_byte = value,
        "cMULTISTRING_CHOOSER" => next.multistring_chooser = value,
        _ => return None,
    }
    Some(next)
}

/// The `[dstOperand, srcOperand, sizeOperand]` destructure
/// (`createCopyarrayHandler`, :168-172): each slot is independently
/// present-or-missing, mirroring `operand?.expression`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyarrayInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dst_expression: Option<&'a str>,
    pub src_expression: Option<&'a str>,
    pub size_expression: Option<&'a str>,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// outcome, never an error.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptCopyarrayHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptCopyarrayOutcome {
    Advance {
        rules: BattleScriptCopyarrayRules,
    },
    /// The `(size, dst, src)` operand tuple is outside the closed 12-tuple
    /// catalog -- mirrors canonical `unsupportedBranch` verbatim.
    Halt(BattleScriptCopyarrayHalt),
}

/// The two reachable role-guard `throw`s plus the two defensive
/// unreachable-in-practice "became undecodable" guards ported verbatim from
/// arms 6/7 (module doc comment).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptCopyarrayError {
    EffectChooserBecameUndecodable,
    MultistringChooserBecameUndecodable,
    RequiresAttackerRole,
    RequiresTargetRole,
}

impl fmt::Display for BattleScriptCopyarrayError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EffectChooserBecameUndecodable => write!(
                formatter,
                "Cmd_copyarray: cEFFECT_CHOOSER<-sMULTIHIT_EFFECT became undecodable"
            ),
            Self::MultistringChooserBecameUndecodable => write!(
                formatter,
                "Cmd_copyarray: cMULTISTRING_CHOOSER<-sTWOTURN_STRINGID became undecodable"
            ),
            Self::RequiresAttackerRole => write!(
                formatter,
                "Cmd_copyarray: gBattlerTarget<-gBattlerAttacker requires an attacker role"
            ),
            Self::RequiresTargetRole => write!(
                formatter,
                "Cmd_copyarray: gEffectBattler<-gBattlerTarget requires a target role"
            ),
        }
    }
}

impl std::error::Error for BattleScriptCopyarrayError {}

/// Registration validates NOTHING for copyarray (find-FIRST REQUIRED only)
/// -- same convention as `battle_script_addbyte.rs`'s
/// `register_battle_script_addbyte`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyarrayRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// `committed Battle Script program does not emit B_SCR_OP_COPYARRAY`
/// (`findInstructionOpcodeId`,
/// `battleScriptIngrainLeechSeedWrapOpcode.ts:605-608`, used at :634).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyarrayRegistrationError;

impl fmt::Display for BattleScriptCopyarrayRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME}"
        )
    }
}

impl std::error::Error for BattleScriptCopyarrayRegistrationError {}

/// Find-FIRST REQUIRED, same convention as `battle_script_addbyte.rs`'s
/// `register_battle_script_addbyte`.
pub fn register_battle_script_copyarray(
    instructions: &[BattleScriptCopyarrayRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptCopyarrayRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptCopyarrayRegistrationError)
}

/// Native twin of `createCopyarrayHandler`
/// (`battleScriptIngrainLeechSeedWrapOpcode.ts:166-335`): the closed
/// 12-tuple catalog, first match wins, in exact TS source order.
pub fn apply_battle_script_copyarray<'a>(
    instruction: &BattleScriptCopyarrayInstruction<'a>,
    rules: &BattleScriptCopyarrayRules,
) -> Result<BattleScriptCopyarrayOutcome, BattleScriptCopyarrayError> {
    let dst = instruction.dst_expression;
    let src = instruction.src_expression;
    let size = instruction.size_expression;

    let advance =
        |rules: BattleScriptCopyarrayRules| Ok(BattleScriptCopyarrayOutcome::Advance { rules });

    match (size, dst, src) {
        (Some("0x4"), Some("gBattleMoveDamage"), Some("gHpDealt")) => {
            let mut next = *rules;
            next.battle_move_damage = rules.hp_dealt;
            advance(next)
        }
        (Some("0x4"), Some("gHpDealt"), Some("gBattleMoveDamage")) => {
            let mut next = *rules;
            next.hp_dealt = rules.battle_move_damage;
            advance(next)
        }
        (Some("0x4"), Some("gBattleMoveDamage"), Some("sPAINSPLIT_HP")) => {
            let mut next = *rules;
            next.battle_move_damage = rules.pain_split_hp;
            advance(next)
        }
        (Some("0x4"), Some("gBattleMoveDamage"), Some("sBIDE_DMG")) => {
            let mut next = *rules;
            next.battle_move_damage = rules.scripting_bide_dmg;
            advance(next)
        }
        (Some("0x2"), Some("gDynamicBasePower"), Some("sTRIPLE_KICK_POWER")) => {
            let mut next = *rules;
            next.dynamic_base_power = rules.triple_kick_power;
            advance(next)
        }
        (Some("0x1"), Some("cEFFECT_CHOOSER"), Some("sMULTIHIT_EFFECT")) => {
            let value = read_copyarray_rules_byte(rules, "sMULTIHIT_EFFECT");
            match value.and_then(|value| write_copyarray_rules_byte(rules, "cEFFECT_CHOOSER", value)) {
                Some(next) => advance(next),
                None => Err(BattleScriptCopyarrayError::EffectChooserBecameUndecodable),
            }
        }
        (Some("0x1"), Some("cMULTISTRING_CHOOSER"), Some("sTWOTURN_STRINGID")) => {
            let value = read_copyarray_rules_byte(rules, "sTWOTURN_STRINGID");
            match value.and_then(|value| write_copyarray_rules_byte(rules, "cMULTISTRING_CHOOSER", value)) {
                Some(next) => advance(next),
                None => Err(BattleScriptCopyarrayError::MultistringChooserBecameUndecodable),
            }
        }
        (Some("0x1"), Some("gBattlerTarget"), Some("gBattlerAttacker")) => match rules.selector_roles.attacker {
            None => Err(BattleScriptCopyarrayError::RequiresAttackerRole),
            Some(attacker) => {
                let mut next = *rules;
                next.selector_roles.target = Some(attacker);
                advance(next)
            }
        },
        (Some("0x1"), Some("gBattlerTarget"), Some("sBATTLER")) => {
            let mut next = *rules;
            next.selector_roles.target = Some(rules.scripting_battler);
            advance(next)
        }
        (Some("0x1"), Some("gEffectBattler"), Some("gBattlerTarget")) => match rules.selector_roles.target {
            None => Err(BattleScriptCopyarrayError::RequiresTargetRole),
            Some(target) => {
                let mut next = *rules;
                next.selector_roles.effect_battler = Some(target);
                advance(next)
            }
        },
        (Some("0x1"), Some("sBATTLER"), Some("sBATTLER_WITH_ABILITY")) => {
            let mut next = *rules;
            next.scripting_battler = rules.battler_with_ability;
            advance(next)
        }
        // Size literal is decimal "6", NOT "0x6" -- the only non-hex size
        // expression in the family (module doc comment; TS :324).
        (Some("6"), Some("gBattleTextBuff1"), Some("sMULTIHIT_STRING")) => advance(*rules),
        _ => Ok(BattleScriptCopyarrayOutcome::Halt(BattleScriptCopyarrayHalt {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME,
            source_construct: format!(
                "Cmd_copyarray's operand ({}, {}, {}) is not a registered gBattleMoveDamage<->gHpDealt, size 4 tuple",
                dst.unwrap_or("<missing>"),
                src.unwrap_or("<missing>"),
                size.unwrap_or("<missing>"),
            ),
            source_file: BATTLE_SCRIPT_COPYARRAY_SOURCE_FILE,
            source_line: BATTLE_SCRIPT_COPYARRAY_HANDLER_LINE,
        })),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptCopyarrayRules {
        BattleScriptCopyarrayRules {
            battle_move_damage: 0,
            hp_dealt: 0,
            pain_split_hp: 0,
            scripting_bide_dmg: 0,
            dynamic_base_power: 0,
            triple_kick_power: 0,
            move_effect_byte: 0,
            multi_hit_effect: 0,
            multistring_chooser: 0,
            two_turn_stringid: 0,
            scripting_battler: 0,
            battler_with_ability: 0,
            selector_roles: BattleScriptCopyarraySelectorRoles {
                attacker: Some(0),
                target: Some(1),
                effect_battler: Some(2),
            },
        }
    }

    fn instr<'a>(
        dst: Option<&'a str>,
        src: Option<&'a str>,
        size: Option<&'a str>,
    ) -> BattleScriptCopyarrayInstruction<'a> {
        BattleScriptCopyarrayInstruction {
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_COPYARRAY_OPCODE,
            dst_expression: dst,
            src_expression: src,
            size_expression: size,
        }
    }

    #[test]
    fn tuple_catalog_first_match_wins_in_ts_source_order() {
        let mut r = rules();
        r.hp_dealt = -7;
        r.battle_move_damage = 42;
        let outcome = apply_battle_script_copyarray(
            &instr(Some("gBattleMoveDamage"), Some("gHpDealt"), Some("0x4")),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => {
                assert_eq!(next.battle_move_damage, -7);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn effect_chooser_defensive_guard_is_unreachable_in_practice() {
        let mut r = rules();
        r.multi_hit_effect = 7;
        let outcome = apply_battle_script_copyarray(
            &instr(
                Some("cEFFECT_CHOOSER"),
                Some("sMULTIHIT_EFFECT"),
                Some("0x1"),
            ),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => {
                assert_eq!(next.move_effect_byte, 7);
            }
            other => panic!("expected advance, got {other:?}"),
        }
        // Both narrow helpers are total over these two pointers, so the
        // "became undecodable" guard can never fire -- pinned directly.
        assert_eq!(
            read_copyarray_rules_byte(&r, "sMULTIHIT_EFFECT"),
            Some(r.multi_hit_effect)
        );
        assert!(write_copyarray_rules_byte(&r, "cEFFECT_CHOOSER", 7).is_some());
    }

    #[test]
    fn multistring_chooser_defensive_guard_is_unreachable_in_practice() {
        let mut r = rules();
        r.two_turn_stringid = 3;
        let outcome = apply_battle_script_copyarray(
            &instr(
                Some("cMULTISTRING_CHOOSER"),
                Some("sTWOTURN_STRINGID"),
                Some("0x1"),
            ),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => {
                assert_eq!(next.multistring_chooser, 3);
            }
            other => panic!("expected advance, got {other:?}"),
        }
        assert_eq!(
            read_copyarray_rules_byte(&r, "sTWOTURN_STRINGID"),
            Some(r.two_turn_stringid)
        );
        assert!(write_copyarray_rules_byte(&r, "cMULTISTRING_CHOOSER", 3).is_some());
    }

    #[test]
    fn attacker_role_guard() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        let error = apply_battle_script_copyarray(
            &instr(
                Some("gBattlerTarget"),
                Some("gBattlerAttacker"),
                Some("0x1"),
            ),
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_copyarray: gBattlerTarget<-gBattlerAttacker requires an attacker role"
        );

        r.selector_roles.attacker = Some(2);
        let outcome = apply_battle_script_copyarray(
            &instr(
                Some("gBattlerTarget"),
                Some("gBattlerAttacker"),
                Some("0x1"),
            ),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => {
                assert_eq!(next.selector_roles.target, Some(2));
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn target_role_guard() {
        let mut r = rules();
        r.selector_roles.target = None;
        let error = apply_battle_script_copyarray(
            &instr(Some("gEffectBattler"), Some("gBattlerTarget"), Some("0x1")),
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_copyarray: gEffectBattler<-gBattlerTarget requires a target role"
        );

        r.selector_roles.target = Some(1);
        let outcome = apply_battle_script_copyarray(
            &instr(Some("gEffectBattler"), Some("gBattlerTarget"), Some("0x1")),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => {
                assert_eq!(next.selector_roles.effect_battler, Some(1));
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn multihit_string_size_is_decimal_not_hex() {
        let r = rules();
        // "0x6" is not in the catalog at all -- only decimal "6" is.
        let hex_outcome = apply_battle_script_copyarray(
            &instr(
                Some("gBattleTextBuff1"),
                Some("sMULTIHIT_STRING"),
                Some("0x6"),
            ),
            &r,
        )
        .unwrap();
        assert!(matches!(hex_outcome, BattleScriptCopyarrayOutcome::Halt(_)));

        let decimal_outcome = apply_battle_script_copyarray(
            &instr(
                Some("gBattleTextBuff1"),
                Some("sMULTIHIT_STRING"),
                Some("6"),
            ),
            &r,
        )
        .unwrap();
        match decimal_outcome {
            BattleScriptCopyarrayOutcome::Advance { rules: next } => assert_eq!(next, r),
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn wrong_size_known_pair_halts() {
        let r = rules();
        let outcome = apply_battle_script_copyarray(
            &instr(Some("gBattleMoveDamage"), Some("gHpDealt"), Some("0x2")),
            &r,
        )
        .unwrap();
        assert!(matches!(outcome, BattleScriptCopyarrayOutcome::Halt(_)));
    }

    #[test]
    fn missing_operand_formats_as_missing_placeholder() {
        let r = rules();
        let outcome =
            apply_battle_script_copyarray(&instr(Some("gBattleMoveDamage"), None, None), &r)
                .unwrap();
        match outcome {
            BattleScriptCopyarrayOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_copyarray's operand (gBattleMoveDamage, <missing>, <missing>) is not a registered gBattleMoveDamage<->gHpDealt, size 4 tuple"
                );
                assert_eq!(halt.source_line, 3837);
                assert_eq!(halt.source_file, "battle_script_commands.c");
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn unknown_tuple_halts() {
        let r = rules();
        let outcome = apply_battle_script_copyarray(
            &instr(Some("gBogusDst"), Some("gBogusSrc"), Some("0x1")),
            &r,
        )
        .unwrap();
        assert!(matches!(outcome, BattleScriptCopyarrayOutcome::Halt(_)));
    }

    #[test]
    fn registration_find_first_required() {
        let present = [BattleScriptCopyarrayRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME,
            opcode_id: 0x31,
        }];
        assert_eq!(register_battle_script_copyarray(&present).unwrap(), 0x31);
        let missing = register_battle_script_copyarray(&[]).unwrap_err();
        assert_eq!(
            missing.to_string(),
            "committed Battle Script program does not emit B_SCR_OP_COPYARRAY"
        );
    }
}
