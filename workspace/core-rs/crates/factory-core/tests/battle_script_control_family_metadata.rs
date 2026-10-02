//! Independent source/dispatch/header/macro/call-site/corpus ratchets for
//! the GOTO/RETURN/END/END2/END3/CALL machine-control family. Every literal
//! below was re-verified with `sed`/`grep` against `reference/pokeemerald`
//! independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_control_family::*;
use factory_core::battle_script_control_family_vectors_gen::*;

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

    assert_eq!(line(&commands, 3652), "static void Cmd_goto(void)");
    assert_eq!(line(&commands, 3945), "static void Cmd_return(void)");
    assert_eq!(line(&commands, 3950), "static void Cmd_end(void)");
    assert_eq!(line(&commands, 3960), "static void Cmd_end2(void)");
    assert_eq!(line(&commands, 3967), "static void Cmd_end3(void)");
    assert_eq!(line(&commands, 3975), "static void Cmd_call(void)");

    assert_eq!(line(&commands, 119).trim(), "static void Cmd_goto(void);");
    assert_eq!(line(&commands, 139).trim(), "static void Cmd_return(void);");
    assert_eq!(line(&commands, 140).trim(), "static void Cmd_end(void);");
    assert_eq!(line(&commands, 141).trim(), "static void Cmd_end2(void);");
    assert_eq!(line(&commands, 142).trim(), "static void Cmd_end3(void);");
    assert_eq!(line(&commands, 144).trim(), "static void Cmd_call(void);");

    assert!(line(&commands, 371).contains("[B_SCR_OP_GOTO]"));
    assert!(line(&commands, 371).contains("Cmd_goto,"));
    assert!(line(&commands, 371).contains("//0x28"));
    assert!(line(&commands, 391).contains("[B_SCR_OP_RETURN]"));
    assert!(line(&commands, 391).contains("Cmd_return,"));
    assert!(line(&commands, 391).contains("//0x3C"));
    assert!(line(&commands, 392).contains("[B_SCR_OP_END]"));
    assert!(line(&commands, 392).contains("Cmd_end,"));
    assert!(line(&commands, 392).contains("//0x3D"));
    assert!(line(&commands, 393).contains("[B_SCR_OP_END2]"));
    assert!(line(&commands, 393).contains("Cmd_end2,"));
    assert!(line(&commands, 393).contains("//0x3E"));
    assert!(line(&commands, 394).contains("[B_SCR_OP_END3]"));
    assert!(line(&commands, 394).contains("Cmd_end3,"));
    assert!(line(&commands, 394).contains("//0x3F"));
    assert!(line(&commands, 396).contains("[B_SCR_OP_CALL]"));
    assert!(line(&commands, 396).contains("Cmd_call,"));
    assert!(line(&commands, 396).contains("//0x41"));

    let header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&header, 46).trim(), "B_SCR_OP_GOTO,");
    assert_eq!(line(&header, 66).trim(), "B_SCR_OP_RETURN,");
    assert_eq!(line(&header, 67).trim(), "B_SCR_OP_END,");
    assert_eq!(line(&header, 68).trim(), "B_SCR_OP_END2,");
    assert_eq!(line(&header, 69).trim(), "B_SCR_OP_END3,");
    assert_eq!(line(&header, 71).trim(), "B_SCR_OP_CALL,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(line(&macros, 212).trim(), ".macro goto ptr:req");
    assert_eq!(line(&macros, 340).trim(), ".macro return");
    assert_eq!(line(&macros, 344).trim(), ".macro end");
    assert_eq!(line(&macros, 348).trim(), ".macro end2");
    assert_eq!(line(&macros, 352).trim(), ".macro end3");
    assert_eq!(line(&macros, 361).trim(), ".macro call ptr:req");
}

#[test]
fn committed_program_call_site_census_matches_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let count = |pattern: &str| {
        scripts
            .lines()
            .filter(|candidate| candidate.starts_with(pattern))
            .count()
    };
    assert_eq!(count("\tgoto "), 285);
    assert_eq!(count("\tcall "), 29);
    assert_eq!(
        scripts
            .lines()
            .filter(|candidate| *candidate == "\treturn")
            .count(),
        73
    );
    assert_eq!(
        scripts
            .lines()
            .filter(|candidate| *candidate == "\tend")
            .count(),
        13
    );
    assert_eq!(
        scripts
            .lines()
            .filter(|candidate| *candidate == "\tend2")
            .count(),
        64
    );
    assert_eq!(
        scripts
            .lines()
            .filter(|candidate| *candidate == "\tend3")
            .count(),
        10
    );
}

#[test]
fn end3_halt_reason_doc_and_design_doc_are_cited() {
    let machine = source("src/engine/battleScriptMachine.ts");
    assert!(machine.contains("kind: \"end3\";"));
    assert!(machine.contains("docs/end3-design.md"));
}

#[test]
fn shared_install_convention_is_find_first_and_verbatim() {
    let machine = source("src/engine/battleScriptMachine.ts");
    assert!(machine.contains("const opcode = program.instructions.find((instruction) => instruction.opcodeName === opcodeName);"));
    assert!(machine.contains("`committed Battle Script program does not emit ${opcodeName}`"));
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_BYTES, 0);
    assert!(
        (26..=34).contains(&BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES.len()),
        "behavior case count {} outside the 26-34 target band",
        BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES.len()
    );
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_CASES.len(), 8);

    let goto_starts = BATTLE_SCRIPT_CONTROL_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "goto-concrete-starts")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(goto_starts, 285);
    let call_starts = BATTLE_SCRIPT_CONTROL_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "call-concrete-starts")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(call_starts, 29);
}

#[test]
fn opcode_constants_match_dispatch_table() {
    assert_eq!(BATTLE_SCRIPT_GOTO_OPCODE, 0x28);
    assert_eq!(BATTLE_SCRIPT_RETURN_OPCODE, 0x3c);
    assert_eq!(BATTLE_SCRIPT_END_OPCODE, 0x3d);
    assert_eq!(BATTLE_SCRIPT_END2_OPCODE, 0x3e);
    assert_eq!(BATTLE_SCRIPT_END3_OPCODE, 0x3f);
    assert_eq!(BATTLE_SCRIPT_CALL_OPCODE, 0x41);
}
