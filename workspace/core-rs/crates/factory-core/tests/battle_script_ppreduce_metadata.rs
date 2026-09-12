//! Independent source/dispatch/macro/constants and artifact-identity
//! ratchets for `B_SCR_OP_PPREDUCE`. Behavioral differential replay lives in
//! the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_ppreduce::*;
use factory_core::battle_script_ppreduce_vectors_gen::*;

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
fn exact_opcode_dispatch_body_macro_and_header_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_PPREDUCE_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME, "B_SCR_OP_PPREDUCE");
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_OPCODE, 0x03);
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_DISPATCHER, "Cmd_ppreduce");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_PPREDUCE_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_PPREDUCE_DISPATCHER);

    assert_eq!(
        line(&command_ids, evidence.header_enum_line).trim(),
        "B_SCR_OP_PPREDUCE,"
    );
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_PPREDUCE]                        = Cmd_ppreduce,                                //0x3"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_ppreduce(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_ppreduce(void)"
    );
    assert_eq!(
        line(&commands, evidence.pp_to_deduct_init_line).trim(),
        "s32 ppToDeduct = 1;"
    );
    assert_eq!(
        line(&commands, evidence.pressure_guard_line).trim(),
        "if (!gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure)"
    );
    assert_eq!(
        line(&commands, evidence.foes_and_ally_case_line).trim(),
        "case MOVE_TARGET_FOES_AND_ALLY:"
    );
    assert!(
        line(&commands, evidence.foes_and_ally_call_line).contains("ABILITYEFFECT_COUNT_ON_FIELD"),
        "foes-and-ally call line drifted"
    );
    assert_eq!(
        line(&commands, evidence.both_case_line).trim(),
        "case MOVE_TARGET_BOTH:"
    );
    assert_eq!(
        line(&commands, evidence.opponents_field_case_line).trim(),
        "case MOVE_TARGET_OPPONENTS_FIELD:"
    );
    assert!(
        line(&commands, evidence.other_side_call_line).contains("ABILITYEFFECT_COUNT_OTHER_SIDE"),
        "other-side call line drifted"
    );
    assert!(
        line(&commands, evidence.default_increment_line).trim() == "ppToDeduct++;",
        "default increment line drifted"
    );
    assert!(
        line(&commands, evidence.deduct_gate_line)
            .contains("HITMARKER_NO_PPDEDUCT | HITMARKER_NO_ATTACKSTRING"),
        "deduct gate line drifted"
    );
    assert_eq!(
        line(&commands, evidence.not_first_strike_line).trim(),
        "gProtectStructs[gBattlerAttacker].notFirstStrike = 1;"
    );
    assert!(
        line(&commands, evidence.clamp_line)
            .contains("gBattleMons[gBattlerAttacker].pp[gCurrMovePos] > ppToDeduct"),
        "clamp line drifted"
    );
    assert_eq!(
        line(&commands, evidence.move_is_permanent_line).trim(),
        "if (MOVE_IS_PERMANENT(gBattlerAttacker, gCurrMovePos))"
    );
    assert!(
        line(&commands, evidence.emit_set_mon_data_line).contains("BtlController_EmitSetMonData"),
        "emit set mon data line drifted"
    );
    assert!(
        line(&commands, evidence.mark_controller_exec_line)
            .contains("MarkBattlerForControllerExec"),
        "mark controller exec line drifted"
    );
    assert_eq!(
        line(&commands, evidence.hitmarker_clear_line).trim(),
        "gHitMarker &= ~HITMARKER_NO_PPDEDUCT;"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr++;"
    );

    assert_eq!(
        line(&macros, evidence.macro_declaration_line).trim(),
        ".macro ppreduce"
    );
    assert_eq!(
        line(&macros, evidence.macro_opcode_line).trim(),
        ".byte B_SCR_OP_PPREDUCE"
    );

    let ppreduce_site_count = scripts.lines().filter(|line| line == &"\tppreduce").count();
    assert_eq!(
        ppreduce_site_count,
        BATTLE_SCRIPT_PPREDUCE_CANONICAL_SITE_COUNT
    );
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_CANONICAL_SITE_COUNT, 133);

    assert_eq!(BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE, 46);
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_ATTACKSTRING, 1 << 9);
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_PPDEDUCT, 1 << 11);
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_STATUS2_TRANSFORMED, 1 << 21);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_CASES.len(), 29);
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_REGISTRATION_CASES.len(), 2);
    assert_eq!(
        BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_SHA256,
        "c5b4bb76bff88d5eaeeb661765aeccc4ac9fb89f510bbd45b9afa8e22fc839f1"
    );
    assert_eq!(BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_BYTES, 46_164);

    let generated = include_bytes!("../src/battle_script_ppreduce_vectors_gen.rs");
    assert_eq!(generated.len(), 157_286);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_ppreduce_vectors_gen.rs"),
        "0fc9ccb60a11b8d43a15cc7331f46764839f1a6cfcecffeae57fe6cd0e29a782"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-ppreduce-vectors.mjs"))
            .unwrap()
            .len(),
        26_185
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-ppreduce-vectors.mjs"),
        "b02695b81fc6db7063b442567ad20b7420e95291a53d328307c9042913a21ee0"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's"));
    assert!(generated_text.contains("Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-ppreduce-vectors.mjs."));
}
