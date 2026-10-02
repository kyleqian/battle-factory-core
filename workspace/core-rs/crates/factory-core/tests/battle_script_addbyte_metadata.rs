//! Independent source/dispatch/macro/call-site/corpus ratchets for
//! `B_SCR_OP_ADDBYTE`. Every literal below was re-verified with `sed`
//! against `reference/pokeemerald` independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_addbyte::*;
use factory_core::battle_script_addbyte_vectors_gen::*;

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
fn handler_body_matches_reference_verbatim() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    assert_eq!(line(&commands, 3823), "static void Cmd_addbyte(void)");
    assert_eq!(line(&commands, 3824), "{");
    assert_eq!(
        line(&commands, 3825).trim(),
        "u8 *memByte = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 3826).trim(),
        "*memByte += gBattlescriptCurrInstr[5];"
    );
    assert_eq!(line(&commands, 3827).trim(), "gBattlescriptCurrInstr += 6;");
    assert_eq!(line(&commands, 3828), "}");

    assert!(line(&commands, 378).contains("[B_SCR_OP_ADDBYTE]"));
    assert!(line(&commands, 378).contains("Cmd_addbyte,"));
    assert!(line(&commands, 378).contains("//0x2F"));

    assert_eq!(
        line(&commands, 126).trim(),
        "static void Cmd_addbyte(void);"
    );

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 53).trim(), "B_SCR_OP_ADDBYTE,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(
        line(&macros, 263).trim(),
        ".macro addbyte ptr:req, byte:req"
    );
    assert_eq!(line(&macros, 264).trim(), ".byte B_SCR_OP_ADDBYTE");
    assert_eq!(line(&macros, 265).trim(), ".4byte \\ptr");
    assert_eq!(line(&macros, 266).trim(), ".byte \\byte");
    assert_eq!(line(&macros, 267).trim(), ".endm");
}

#[test]
fn committed_program_call_site_census_matches_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\taddbyte "))
        .collect();
    assert_eq!(sites.len(), 9);

    let expected_pairs = [
        "\taddbyte sMULTIHIT_STRING + 4, 1",
        "\taddbyte sTRIPLE_KICK_POWER, 10",
        "\taddbyte sMULTIHIT_STRING + 4, 1",
        "\taddbyte sBATTLER, 1",
        "\taddbyte gBattlerTarget, 1",
        "\taddbyte gBattleCommunication, 1",
        "\taddbyte sBATTLER, 1",
        "\taddbyte gBattlerTarget, 1",
        "\taddbyte gBattleCommunication + 1, 1",
    ];
    for expected in expected_pairs {
        assert!(
            sites.contains(&expected),
            "missing committed site {expected}"
        );
    }

    let count = |needle: &str| sites.iter().filter(|line| **line == needle).count();
    assert_eq!(count("\taddbyte sMULTIHIT_STRING + 4, 1"), 2);
    assert_eq!(count("\taddbyte sTRIPLE_KICK_POWER, 10"), 1);
    assert_eq!(count("\taddbyte sBATTLER, 1"), 2);
    assert_eq!(count("\taddbyte gBattlerTarget, 1"), 2);
    assert_eq!(count("\taddbyte gBattleCommunication, 1"), 1);
    assert_eq!(count("\taddbyte gBattleCommunication + 1, 1"), 1);
}

#[test]
fn pointer_universe_is_direct_ported_from_setbyte() {
    // Line range battleScriptSetByte.ts:32-55 -- the exact 24-name list is
    // pinned by content, matching battle_script_byte_algebra.rs's own copy.
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
    // sMULTIHIT_STRING + 4 is checked FIRST and is deliberately NOT part of
    // this list (module doc comment, point 1).
    assert!(!BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&"sMULTIHIT_STRING + 4"));
}

#[test]
fn catalog_covers_committed_deltas_and_setbyte_plain_literals() {
    for expression in ["1", "10", "0", "2"] {
        assert!(
            resolve_battle_script_addbyte_value(expression).is_some(),
            "catalog missing {expression}"
        );
    }
    for (expression, expected) in [
        ("(0) & 0xFF", 0u8),
        ("((0) >> 8) & 0xFF", 0),
        ("(20) & 0xFF", 20),
        ("((20) >> 8) & 0xFF", 0),
        ("((20) >> 16) & 0xFF", 0),
        ("((20) >> 24) & 0xFF", 0),
        ("(40) & 0xFF", 40),
        ("((40) >> 8) & 0xFF", 0),
        ("((40) >> 16) & 0xFF", 0),
        ("((40) >> 24) & 0xFF", 0),
    ] {
        assert_eq!(
            resolve_battle_script_addbyte_value(expression),
            Some(expected)
        );
    }
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_BYTES, 0);
    assert!(BATTLE_SCRIPT_ADDBYTE_CATEGORY_CENSUS.len() >= 6);
    assert!(BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len() >= 22);
    assert!(BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len() <= 30);
    assert_eq!(BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES.len(), 2);
    let domain_total: usize = BATTLE_SCRIPT_ADDBYTE_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "behavior-cases")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(domain_total, BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len());
}
