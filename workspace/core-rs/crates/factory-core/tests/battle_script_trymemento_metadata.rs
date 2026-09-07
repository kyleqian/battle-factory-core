//! Independent source/macro/call-site and artifact-identity ratchets for
//! Memento. Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_trymemento::*;
use factory_core::battle_script_trymemento_vectors_gen::*;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

fn line(source: &str, number: u32) -> &str {
    source
        .lines()
        .nth(number as usize - 1)
        .unwrap_or_else(|| panic!("missing source line {number}"))
}

fn sha256(path: &str) -> String {
    let output = std::process::Command::new("sh")
        .args(["-c", &format!("shasum -a 256 {} | cut -d ' ' -f 1", path)])
        .current_dir(workspace_root())
        .output()
        .expect("run shasum");
    assert!(output.status.success());
    String::from_utf8(output.stdout).unwrap().trim().to_owned()
}

#[test]
fn exact_opcode_dispatch_body_conditions_macro_and_call_sites_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let controllers = source("reference/pokeemerald/include/battle_controllers.h");
    let string_ids = source("reference/pokeemerald/include/constants/battle_string_ids.h");
    let pokemon = source("reference/pokeemerald/include/constants/pokemon.h");
    let evidence = BATTLE_SCRIPT_TRYMEMENTO_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME, "B_SCR_OP_TRYMEMENTO");
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_OPCODE, 0xc9);
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER, "Cmd_trymemento");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_TRYMEMENTO_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_TRYMEMENTO_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_TRYMEMENTO_DISPATCHER);

    assert_eq!(line(&command_ids, 207).trim(), "B_SCR_OP_TRYMEMENTO,");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYMEMENTO]                      = Cmd_trymemento,                              //0xC9"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_trymemento(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_trymemento(void)"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_1).trim(),
        "if (gBattleMons[gBattlerTarget].statStages[STAT_ATK] == MIN_STAT_STAGE"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_2).trim(),
        "&& gBattleMons[gBattlerTarget].statStages[STAT_SPATK] == MIN_STAT_STAGE"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_3).trim(),
        "&& gBattleCommunication[MISS_TYPE] != B_MSG_PROTECTED)"
    );
    assert_eq!(
        line(&commands, evidence.jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, evidence.active_battler_line).trim(),
        "gActiveBattler = gBattlerAttacker;"
    );
    assert_eq!(
        line(&commands, evidence.damage_line).trim(),
        "gBattleMoveDamage = gBattleMons[gActiveBattler].hp;"
    );
    assert_eq!(
        line(&commands, evidence.emit_line).trim(),
        "BtlController_EmitHealthBarUpdate(B_COMM_TO_CONTROLLER, INSTANT_HP_BAR_DROP);"
    );
    assert_eq!(
        line(&commands, evidence.mark_pending_line).trim(),
        "MarkBattlerForControllerExec(gActiveBattler);"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );

    let macro_evidence = BATTLE_SCRIPT_TRYMEMENTO_MACRO_EVIDENCE;
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_FAILURE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(macro_evidence.encoded_width_bytes, 5);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro trymemento ptr:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYMEMENTO"
    );
    assert_eq!(
        line(&macros, macro_evidence.pointer_line).trim(),
        r".4byte \ptr"
    );

    let sites = BATTLE_SCRIPT_TRYMEMENTO_CALL_SITE_EVIDENCE;
    assert_eq!(sites.len(), 2);
    assert_eq!(
        line(&scripts, sites[0].entry_label_line),
        "BattleScript_EffectMemento::"
    );
    assert_eq!(
        line(&scripts, sites[0].statement_line).trim(),
        "trymemento BattleScript_ButItFailed"
    );
    assert_eq!(sites[0].instruction_program_counter, 1553);
    assert_eq!(
        sites[0].failure_target_expression,
        "BattleScript_ButItFailed"
    );
    assert_eq!(sites[0].failure_target_program_counter, 1434);
    assert_eq!(
        line(&scripts, sites[1].entry_label_line),
        "BattleScript_MementoTargetProtect:"
    );
    assert_eq!(
        line(&scripts, sites[1].statement_line).trim(),
        "trymemento BattleScript_MementoTargetProtectEnd"
    );
    assert_eq!(sites[1].instruction_program_counter, 1579);
    assert_eq!(
        sites[1].failure_target_expression,
        "BattleScript_MementoTargetProtectEnd"
    );
    assert_eq!(sites[1].failure_target_program_counter, 1580);
    assert_eq!(
        scripts.matches("\ttrymemento ").count(),
        2,
        "exactly two concrete trymemento call sites"
    );

    assert_eq!(
        line(&controllers, 149).trim(),
        "#define INSTANT_HP_BAR_DROP     0x7FFF"
    );
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_INSTANT_HP_BAR_DROP, 0x7fff);
    assert_eq!(
        line(&string_ids, 410).trim(),
        "#define B_MSG_PROTECTED    1"
    );
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_B_MSG_PROTECTED, 1);
    assert_eq!(line(&pokemon, 76).trim(), "#define STAT_ATK     1");
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_STAT_ATK, 1);
    assert_eq!(line(&pokemon, 79).trim(), "#define STAT_SPATK   4");
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_STAT_SPATK, 4);
    assert_eq!(line(&pokemon, 89).trim(), "#define MIN_STAT_STAGE     0");
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_MIN_STAT_STAGE, 0);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_CASES.len(), 80);
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_CASES.len(), 9);
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_SHA256,
        "b56a69bc7549bf021804bc25f684d6184109e6df62ca735ae92b29ddb95bf0ff"
    );
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_BYTES, 110_814);
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_VECTOR_GENERATOR_SHA256,
        "4d00a8d7a8699c75ce33e98d7155f52d0c514aa9bd7bb487d863163233716b8b"
    );
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_VECTOR_GENERATOR_BYTES, 31_654);

    let generated = include_bytes!("../src/battle_script_trymemento_vectors_gen.rs");
    assert_eq!(generated.len(), 333_065);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trymemento_vectors_gen.rs"),
        "b922cab147397a3710b943980144c95177601e1a93f31298f4e2e993c93a5dc9"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trymemento-vectors.mjs")
        )
        .unwrap()
        .len(),
        31_654
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trymemento-vectors.mjs"),
        "4d00a8d7a8699c75ce33e98d7155f52d0c514aa9bd7bb487d863163233716b8b"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrymementoOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
