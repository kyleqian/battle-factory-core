//! Independent source/dispatch/macro/call-site/corpus ratchets for the
//! JUMPIFARRAYEQUAL/JUMPIFARRAYNOTEQUAL/COPYARRAYWITHINDEX trio. Every
//! literal below was re-verified with `sed`/`grep` against
//! `reference/pokeemerald` independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_array_family::*;
use factory_core::battle_script_array_family_vectors_gen::*;

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

    assert_eq!(
        line(&commands, 3771),
        "static void Cmd_jumpifarrayequal(void)"
    );
    assert_eq!(
        line(&commands, 3793),
        "static void Cmd_jumpifarraynotequal(void)"
    );
    assert_eq!(
        line(&commands, 3850),
        "static void Cmd_copyarraywithindex(void)"
    );

    assert!(line(&commands, 375).contains("[B_SCR_OP_JUMPIFARRAYEQUAL]"));
    assert!(line(&commands, 375).contains("Cmd_jumpifarrayequal,"));
    assert!(line(&commands, 375).contains("//0x2C"));
    assert!(line(&commands, 376).contains("[B_SCR_OP_JUMPIFARRAYNOTEQUAL]"));
    assert!(line(&commands, 376).contains("Cmd_jumpifarraynotequal,"));
    assert!(line(&commands, 376).contains("//0x2D"));
    assert!(line(&commands, 381).contains("[B_SCR_OP_COPYARRAYWITHINDEX]"));
    assert!(line(&commands, 381).contains("Cmd_copyarraywithindex,"));
    assert!(line(&commands, 381).contains("//0x32"));

    assert_eq!(
        line(&commands, 123).trim(),
        "static void Cmd_jumpifarrayequal(void);"
    );
    assert_eq!(
        line(&commands, 124).trim(),
        "static void Cmd_jumpifarraynotequal(void);"
    );
    assert_eq!(
        line(&commands, 129).trim(),
        "static void Cmd_copyarraywithindex(void);"
    );

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 50).trim(), "B_SCR_OP_JUMPIFARRAYEQUAL,");
    assert_eq!(
        line(&enum_header, 51).trim(),
        "B_SCR_OP_JUMPIFARRAYNOTEQUAL,"
    );
    assert_eq!(
        line(&enum_header, 56).trim(),
        "B_SCR_OP_COPYARRAYWITHINDEX,"
    );
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(
        line(&macros, 241).trim(),
        ".macro jumpifarrayequal val1:req, val2:req, size:req, ptr:req"
    );
    assert_eq!(
        line(&macros, 249).trim(),
        ".macro jumpifarraynotequal val1:req, val2:req, size:req, ptr:req"
    );
    assert_eq!(
        line(&macros, 282).trim(),
        ".macro copyarraywithindex dest:req, src:req, index:req, size:req"
    );

    assert_eq!(
        line(&macros, 1406).trim(),
        ".macro jumpifbytenotequal byte1:req, byte2:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1407).trim(),
        "jumpifarraynotequal \\byte1, \\byte2, 0x1, \\jumpptr"
    );
    assert_eq!(
        line(&macros, 1410).trim(),
        ".macro jumpifbyteequal byte1:req, byte2:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1411).trim(),
        "jumpifarrayequal \\byte1, \\byte2, 0x1, \\jumpptr"
    );
}

#[test]
fn committed_program_call_site_census_matches_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let notequal_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\tjumpifbytenotequal "))
        .collect();
    assert_eq!(notequal_sites.len(), 7);
    for expected in [
        "\tjumpifbytenotequal gBattlerAttacker, gBattlerTarget, BattleScript_DoGhostCurse",
        "\tjumpifbytenotequal sBATTLER, gBattlersCount, BattleScript_PerishSongLoop",
        "\tjumpifbytenotequal gBattlerTarget, gBattlersCount, BattleScript_TeeterDanceLoop",
        "\tjumpifbytenotequal gBattlerFainted, gBattlersCount, BattleScript_LinkHandleFaintedMonLoop",
        "\tjumpifbytenotequal gBattleCommunication, gBattlersCount, BattleScript_DamagingWeatherLoop",
        "\tjumpifbytenotequal sBATTLER, gBattlersCount, BattleScript_WeatherFormChangesLoop",
        "\tjumpifbytenotequal gBattleCommunication + 1, gBattlersCount, BattleScript_PalaceTryBattlerFlavorText",
    ] {
        assert!(notequal_sites.contains(&expected), "missing committed notequal site {expected}");
    }

    let equal_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\tjumpifbyteequal "))
        .collect();
    assert_eq!(equal_sites.len(), 1);
    assert_eq!(
        equal_sites[0],
        "\tjumpifbyteequal gBattlerAttacker, gBattlerTarget, BattleScript_TeeterDanceLoopIncrement"
    );

    let withindex_sites: Vec<&str> = scripts
        .lines()
        .filter(|candidate| candidate.starts_with("\tcopyarraywithindex "))
        .collect();
    assert_eq!(withindex_sites.len(), 1);
    assert_eq!(
        withindex_sites[0],
        "\tcopyarraywithindex gBattlerAttacker, gBattlerByTurnOrder, gBattleCommunication, 1"
    );
}

#[test]
fn requirebattlerrole_error_text_is_verbatim() {
    let hit_chain = source("src/engine/battleScriptHitChainOpcode.ts");
    assert!(hit_chain.contains("`Battle Script hit-chain command requires a ${role} role`"));
}

#[test]
fn operand_resolver_is_a_closed_table() {
    assert_eq!(
        read_array_family_operand(
            &BattleScriptArrayFamilyRules {
                selector_attacker: Some(2),
                selector_target: Some(3),
                battlers_count: 4,
                scripting_battler: 1,
                battle_communication0: 5,
                battle_communication1: 6,
                battler_by_turn_order: [0, 1, 2, 3],
            },
            "gBattlersCount",
        ),
        Some(4)
    );
    assert_eq!(
        read_array_family_operand(
            &BattleScriptArrayFamilyRules {
                selector_attacker: None,
                selector_target: None,
                battlers_count: 0,
                scripting_battler: 0,
                battle_communication0: 0,
                battle_communication1: 0,
                battler_by_turn_order: [0, 1, 2, 3],
            },
            "gBattlerFainted",
        ),
        None,
        "gBattlerFainted is never modeled -- the committed link-battle barrier site"
    );
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_BYTES, 0);
    let total = BATTLE_SCRIPT_ARRAY_FAMILY_NOTEQUAL_CASES.len()
        + BATTLE_SCRIPT_ARRAY_FAMILY_EQUAL_CASES.len()
        + BATTLE_SCRIPT_ARRAY_FAMILY_WITHINDEX_CASES.len();
    assert!(
        (28..=36).contains(&total),
        "behavior case count {total} outside the 28-36 target band"
    );
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_CASES.len(), 8);

    let notequal_starts = BATTLE_SCRIPT_ARRAY_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "notequal-concrete-starts")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(
        notequal_starts,
        BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_CONCRETE_START_COUNT
    );
    let equal_starts = BATTLE_SCRIPT_ARRAY_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "equal-concrete-starts")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(
        equal_starts,
        BATTLE_SCRIPT_JUMPIFARRAYEQUAL_CONCRETE_START_COUNT
    );
    let withindex_starts = BATTLE_SCRIPT_ARRAY_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "withindex-concrete-starts")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(
        withindex_starts,
        BATTLE_SCRIPT_COPYARRAYWITHINDEX_CONCRETE_START_COUNT
    );
}
