//! Independent source/dispatch/macro/call-site/corpus ratchets for
//! `B_SCR_OP_COPYARRAY`. Every literal below was re-verified with `sed`/`grep`
//! against `reference/pokeemerald` independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_copyarray::*;
use factory_core::battle_script_copyarray_vectors_gen::*;

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
    assert_eq!(line(&commands, 3837), "static void Cmd_copyarray(void)");
    assert_eq!(line(&commands, 3838), "{");
    assert_eq!(
        line(&commands, 3839).trim(),
        "u8 *dest = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 3840).trim(),
        "const u8 *src = T2_READ_PTR(gBattlescriptCurrInstr + 5);"
    );
    assert_eq!(
        line(&commands, 3841).trim(),
        "s32 size = gBattlescriptCurrInstr[9];"
    );
    assert_eq!(line(&commands, 3843).trim(), "s32 i;");
    assert_eq!(line(&commands, 3844).trim(), "for (i = 0; i < size; i++)");
    assert_eq!(line(&commands, 3845).trim(), "dest[i] = src[i];");
    assert_eq!(
        line(&commands, 3847).trim(),
        "gBattlescriptCurrInstr += 10;"
    );
    assert_eq!(line(&commands, 3848), "}");

    assert!(line(&commands, 380).contains("[B_SCR_OP_COPYARRAY]"));
    assert!(line(&commands, 380).contains("Cmd_copyarray,"));
    assert!(line(&commands, 380).contains("//0x31"));

    assert_eq!(
        line(&commands, 128).trim(),
        "static void Cmd_copyarray(void);"
    );

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 55).trim(), "B_SCR_OP_COPYARRAY,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(
        line(&macros, 275).trim(),
        ".macro copyarray dest:req, src:req, size:req"
    );
    assert_eq!(line(&macros, 276).trim(), ".byte B_SCR_OP_COPYARRAY");
    assert_eq!(line(&macros, 277).trim(), ".4byte \\dest");
    assert_eq!(line(&macros, 278).trim(), ".4byte \\src");
    assert_eq!(line(&macros, 279).trim(), ".byte \\size");
    assert_eq!(line(&macros, 280).trim(), ".endm");

    assert_eq!(
        line(&macros, 1394).trim(),
        ".macro copybyte dst:req, src:req"
    );
    assert_eq!(line(&macros, 1395).trim(), "copyarray \\dst, \\src, 0x1");
    assert_eq!(line(&macros, 1396).trim(), ".endm");
    assert_eq!(
        line(&macros, 1398).trim(),
        ".macro copyhword dst:req, src:req"
    );
    assert_eq!(line(&macros, 1399).trim(), "copyarray \\dst, \\src, 0x2");
    assert_eq!(line(&macros, 1400).trim(), ".endm");
    assert_eq!(
        line(&macros, 1402).trim(),
        ".macro copyword dst:req, src:req"
    );
    assert_eq!(line(&macros, 1403).trim(), "copyarray \\dst, \\src, 0x4");
    assert_eq!(line(&macros, 1404).trim(), ".endm");
}

#[test]
fn committed_program_call_site_census_matches_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| {
            candidate.starts_with("\tcopyarray ")
                || candidate.starts_with("\tcopybyte ")
                || candidate.starts_with("\tcopyhword ")
                || candidate.starts_with("\tcopyword ")
        })
        .collect();
    assert_eq!(sites.len(), 16);

    let expected = [
        "\tcopybyte cEFFECT_CHOOSER, sMULTIHIT_EFFECT",
        "\tcopyarray gBattleTextBuff1, sMULTIHIT_STRING, 6",
        "\tcopybyte gEffectBattler, gBattlerTarget",
        "\tcopybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID",
        "\tcopyword gBattleMoveDamage, sPAINSPLIT_HP",
        "\tcopyhword gDynamicBasePower, sTRIPLE_KICK_POWER",
        "\tcopybyte gBattlerTarget, gBattlerAttacker",
        "\tcopybyte sBATTLER, sBATTLER_WITH_ABILITY",
        "\tcopyword gHpDealt, gBattleMoveDamage",
        "\tcopyword gBattleMoveDamage, gHpDealt",
        "\tcopyword gBattleMoveDamage, sBIDE_DMG",
        "\tcopybyte gBattlerTarget, sBATTLER",
    ];
    for expected_site in expected {
        assert!(
            sites.contains(&expected_site),
            "missing committed site {expected_site}"
        );
    }

    let count = |needle: &str| sites.iter().filter(|line| **line == needle).count();
    assert_eq!(count("\tcopybyte cEFFECT_CHOOSER, sMULTIHIT_EFFECT"), 1);
    assert_eq!(
        count("\tcopyarray gBattleTextBuff1, sMULTIHIT_STRING, 6"),
        2
    );
    assert_eq!(count("\tcopybyte gEffectBattler, gBattlerTarget"), 3);
    assert_eq!(
        count("\tcopybyte cMULTISTRING_CHOOSER, sTWOTURN_STRINGID"),
        1
    );
    assert_eq!(count("\tcopyword gBattleMoveDamage, sPAINSPLIT_HP"), 1);
    assert_eq!(
        count("\tcopyhword gDynamicBasePower, sTRIPLE_KICK_POWER"),
        1
    );
    assert_eq!(count("\tcopybyte gBattlerTarget, gBattlerAttacker"), 1);
    assert_eq!(count("\tcopybyte sBATTLER, sBATTLER_WITH_ABILITY"), 1);
    assert_eq!(count("\tcopyword gHpDealt, gBattleMoveDamage"), 1);
    assert_eq!(count("\tcopyword gBattleMoveDamage, gHpDealt"), 2);
    assert_eq!(count("\tcopyword gBattleMoveDamage, sBIDE_DMG"), 1);
    assert_eq!(count("\tcopybyte gBattlerTarget, sBATTLER"), 1);
}

#[test]
fn multihit_string_size_literal_is_decimal_not_hex() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    assert!(scripts.contains("copyarray gBattleTextBuff1, sMULTIHIT_STRING, 6"));
    assert!(!scripts.contains("copyarray gBattleTextBuff1, sMULTIHIT_STRING, 0x6"));
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_BYTES, 0);
    assert!(BATTLE_SCRIPT_COPYARRAY_CATEGORY_CENSUS.len() >= 4);
    assert!(BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.len() >= 19);
    assert_eq!(BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES.len(), 2);
    let domain_total: usize = BATTLE_SCRIPT_COPYARRAY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "behavior-cases")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(domain_total, BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.len());
    let distinct_tuples: usize = BATTLE_SCRIPT_COPYARRAY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "distinct-tuples")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(distinct_tuples, 12);
}

#[test]
fn registration_is_find_first_required() {
    let present = [
        BattleScriptCopyarrayRegistrationInstruction {
            opcode_name: "B_SCR_OP_JUMPIFABILITY",
            opcode_id: 0x02,
        },
        BattleScriptCopyarrayRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_COPYARRAY_OPCODE,
        },
        BattleScriptCopyarrayRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME,
            opcode_id: 0xff,
        },
    ];
    assert_eq!(
        register_battle_script_copyarray(&present).unwrap(),
        BATTLE_SCRIPT_COPYARRAY_OPCODE
    );
}
