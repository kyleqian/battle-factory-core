//! Independent source/dispatch/macro/call-site/corpus ratchets for the
//! `B_SCR_OP_BICBYTE` / `B_SCR_OP_ORBYTE` / `B_SCR_OP_BICWORD` byte-algebra
//! trio. Every literal below was re-verified with `sed` against
//! `reference/pokeemerald` independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_byte_algebra::*;
use factory_core::battle_script_byte_algebra_vectors_gen::*;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

fn line(source: &str, number: usize) -> &str {
    source
        .lines()
        .nth(number - 1)
        .unwrap_or_else(|| panic!("missing line {number}"))
}

#[test]
fn handler_bodies_match_reference_verbatim() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    assert_eq!(line(&commands, 3864), "static void Cmd_orbyte(void)");
    assert_eq!(
        line(&commands, 3866).trim(),
        "u8 *memByte = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 3867).trim(),
        "*memByte |= gBattlescriptCurrInstr[5];"
    );
    assert_eq!(line(&commands, 3868).trim(), "gBattlescriptCurrInstr += 6;");

    assert_eq!(line(&commands, 3889), "static void Cmd_bicbyte(void)");
    assert_eq!(
        line(&commands, 3891).trim(),
        "u8 *memByte = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 3892).trim(),
        "*memByte &= ~(gBattlescriptCurrInstr[5]);"
    );
    assert_eq!(line(&commands, 3893).trim(), "gBattlescriptCurrInstr += 6;");

    assert_eq!(line(&commands, 3905), "static void Cmd_bicword(void)");
    assert_eq!(
        line(&commands, 3907).trim(),
        "u32 *memWord = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 3908).trim(),
        "u32 val = T2_READ_32(gBattlescriptCurrInstr + 5);"
    );
    assert_eq!(line(&commands, 3910).trim(), "*memWord &= ~val;");
    assert_eq!(line(&commands, 3911).trim(), "gBattlescriptCurrInstr += 9;");

    assert!(line(&commands, 382).contains("[B_SCR_OP_ORBYTE]"));
    assert!(line(&commands, 382).contains("Cmd_orbyte,"));
    assert!(line(&commands, 382).contains("//0x33"));
    assert!(line(&commands, 385).contains("[B_SCR_OP_BICBYTE]"));
    assert!(line(&commands, 385).contains("Cmd_bicbyte,"));
    assert!(line(&commands, 385).contains("//0x36"));
    assert!(line(&commands, 387).contains("[B_SCR_OP_BICWORD]"));
    assert!(line(&commands, 387).contains("Cmd_bicword,"));
    assert!(line(&commands, 387).contains("//0x38"));

    assert_eq!(line(&commands, 130).trim(), "static void Cmd_orbyte(void);");
    assert_eq!(
        line(&commands, 133).trim(),
        "static void Cmd_bicbyte(void);"
    );
    assert_eq!(
        line(&commands, 135).trim(),
        "static void Cmd_bicword(void);"
    );

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 57).trim(), "B_SCR_OP_ORBYTE,");
    assert_eq!(line(&enum_header, 60).trim(), "B_SCR_OP_BICBYTE,");
    assert_eq!(line(&enum_header, 62).trim(), "B_SCR_OP_BICWORD,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(line(&macros, 290).trim(), ".macro orbyte ptr:req, byte:req");
    assert_eq!(line(&macros, 291).trim(), ".byte B_SCR_OP_ORBYTE");
    assert_eq!(line(&macros, 292).trim(), ".4byte \\ptr");
    assert_eq!(line(&macros, 293).trim(), ".byte \\byte");

    assert_eq!(
        line(&macros, 308).trim(),
        ".macro bicbyte ptr:req, byte:req"
    );
    assert_eq!(line(&macros, 309).trim(), ".byte B_SCR_OP_BICBYTE");
    assert_eq!(line(&macros, 310).trim(), ".4byte \\ptr");
    assert_eq!(line(&macros, 311).trim(), ".byte \\byte");

    assert_eq!(
        line(&macros, 320).trim(),
        ".macro bicword ptr:req, word:req"
    );
    assert_eq!(line(&macros, 321).trim(), ".byte B_SCR_OP_BICWORD");
    assert_eq!(line(&macros, 322).trim(), ".4byte \\ptr");
    assert_eq!(line(&macros, 323).trim(), ".4byte \\word");
}

#[test]
fn committed_program_call_site_counts_and_splits_match_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let bicbyte_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\tbicbyte "))
        .collect();
    let orbyte_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\torbyte "))
        .collect();
    let bicword_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\tbicword "))
        .collect();
    assert_eq!(bicbyte_sites.len(), 11);
    assert_eq!(orbyte_sites.len(), 11);
    assert_eq!(bicword_sites.len(), 3);

    let bicbyte_missed = bicbyte_sites
        .iter()
        .filter(|line| *line == &"\tbicbyte gMoveResultFlags, MOVE_RESULT_MISSED")
        .count();
    let bicbyte_super_not_very = bicbyte_sites
        .iter()
        .filter(|line| {
            *line == &"\tbicbyte gMoveResultFlags, MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE"
        })
        .count();
    let bicbyte_missed_doesnt_affect = bicbyte_sites
        .iter()
        .filter(|line| {
            *line
                == &"\tbicbyte gMoveResultFlags, MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE"
        })
        .count();
    assert_eq!(bicbyte_missed, 3);
    assert_eq!(bicbyte_super_not_very, 7);
    assert_eq!(bicbyte_missed_doesnt_affect, 1);

    let orbyte_missed = orbyte_sites
        .iter()
        .filter(|line| *line == &"\torbyte gMoveResultFlags, MOVE_RESULT_MISSED")
        .count();
    let orbyte_failed = orbyte_sites
        .iter()
        .filter(|line| *line == &"\torbyte gMoveResultFlags, MOVE_RESULT_FAILED")
        .count();
    let orbyte_doesnt_affect = orbyte_sites
        .iter()
        .filter(|line| *line == &"\torbyte gMoveResultFlags, MOVE_RESULT_DOESNT_AFFECT_FOE")
        .count();
    assert_eq!(orbyte_missed, 3);
    assert_eq!(orbyte_failed, 5);
    assert_eq!(orbyte_doesnt_affect, 3);

    assert!(bicword_sites.contains(&"\tbicword gHitMarker, HITMARKER_IGNORE_UNDERGROUND"));
    assert!(bicword_sites.contains(
        &"\tbicword gHitMarker, HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE"
    ));
    assert!(bicword_sites.contains(&"\tbicword gHitMarker, HITMARKER_WAKE_UP_CLEAR"));
}

#[test]
fn hitmarker_and_move_result_bit_constants_cite_battle_h() {
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");
    assert_eq!(line(&battle_h, 181).trim(), "#define HITMARKER_WAKE_UP_CLEAR         (1 << 4) // Cleared when waking up. Never set or checked.");
    assert_eq!(
        line(&battle_h, 182).trim(),
        "#define HITMARKER_IGNORE_BIDE           (1 << 5)"
    );
    assert_eq!(
        line(&battle_h, 185).trim(),
        "#define HITMARKER_IGNORE_SUBSTITUTE     (1 << 8)"
    );
    assert_eq!(
        line(&battle_h, 194).trim(),
        "#define HITMARKER_IGNORE_UNDERGROUND    (1 << 17)"
    );
    assert_eq!(
        line(&battle_h, 197).trim(),
        "#define HITMARKER_PASSIVE_HP_UPDATE     (1 << 20)"
    );
    assert_eq!(
        line(&battle_h, 201).trim(),
        "#define HITMARKER_GRUDGE                (1 << 24)"
    );

    assert_eq!(
        line(&battle_h, 220).trim(),
        "#define MOVE_RESULT_MISSED             (1 << 0)"
    );
    assert_eq!(
        line(&battle_h, 221).trim(),
        "#define MOVE_RESULT_SUPER_EFFECTIVE    (1 << 1)"
    );
    assert_eq!(
        line(&battle_h, 222).trim(),
        "#define MOVE_RESULT_NOT_VERY_EFFECTIVE (1 << 2)"
    );
    assert_eq!(
        line(&battle_h, 223).trim(),
        "#define MOVE_RESULT_DOESNT_AFFECT_FOE  (1 << 3)"
    );
    assert_eq!(
        line(&battle_h, 225).trim(),
        "#define MOVE_RESULT_FAILED             (1 << 5)"
    );

    assert_eq!(BATTLE_SCRIPT_HITMARKER_WAKE_UP_CLEAR, 1 << 4);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE, 1 << 5);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE, 1 << 8);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND, 1 << 17);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE, 1 << 20);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_GRUDGE, 1 << 24);

    assert_eq!(
        resolve_battle_script_bicbyte_mask("MOVE_RESULT_MISSED"),
        Some(1)
    );
    assert_eq!(
        resolve_battle_script_orbyte_value("MOVE_RESULT_FAILED"),
        Some(1 << 5)
    );
    assert_eq!(
        resolve_battle_script_bicword_mask("HITMARKER_WAKE_UP_CLEAR"),
        Some(1 << 4)
    );
}

#[test]
fn pointer_universe_is_direct_ported_from_setbyte() {
    // Line range battleScriptSetByte.ts:32-55 -- verified by hand at authoring
    // time; the exact 24-name list is pinned by content, not by re-reading TS
    // from this native-only test.
    assert_eq!(BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.len(), 24);
    for expected in [
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
    ] {
        assert!(
            BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&expected),
            "missing pointer expression {expected}"
        );
    }
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_BYTES, 0);
    assert!(BATTLE_SCRIPT_BYTE_ALGEBRA_CATEGORY_CENSUS.len() >= 6);
    assert!(BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.len() >= 40);
    assert_eq!(BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES.len(), 13);
    let domain_total: usize = BATTLE_SCRIPT_BYTE_ALGEBRA_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "behavior-cases")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(
        domain_total,
        BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.len()
    );
}
