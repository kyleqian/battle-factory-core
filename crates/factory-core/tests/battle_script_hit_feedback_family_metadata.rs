//! Independent source/dispatch/macro/constants and artifact-identity
//! ratchets for `B_SCR_OP_HITANIMATION` / `B_SCR_OP_EFFECTIVENESSSOUND`.
//! Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_hit_feedback_family::*;
use factory_core::battle_script_hit_feedback_family_vectors_gen::*;

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
fn hitanimation_dispatch_body_macro_and_header_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_HIT_FEEDBACK_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
        "B_SCR_OP_HITANIMATION"
    );
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_OPCODE, 0x5c);
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_DISPATCHER, "Cmd_hitanimation");

    assert_eq!(
        line(&command_ids, evidence.hitanimation_header_enum_line).trim(),
        "B_SCR_OP_HITANIMATION,"
    );
    assert_eq!(
        line(&commands, evidence.hitanimation_dispatch_line).trim(),
        "[B_SCR_OP_HITANIMATION]                    = Cmd_hitanimation,                            //0x5C"
    );
    assert_eq!(
        line(&commands, evidence.hitanimation_forward_decl_line).trim(),
        "static void Cmd_hitanimation(void);"
    );
    assert_eq!(
        line(&commands, evidence.hitanimation_handler_line),
        "static void Cmd_hitanimation(void)"
    );
    assert_eq!(
        line(&commands, evidence.hitanimation_selector_read_line).trim(),
        "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, evidence.hitanimation_no_effect_check_line).trim(),
        "if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT)"
    );
    assert!(line(&commands, evidence.hitanimation_substitute_check_line)
        .contains("HITMARKER_IGNORE_SUBSTITUTE"));
    assert!(
        line(&commands, evidence.hitanimation_substitute_check_line).contains("STATUS2_SUBSTITUTE")
    );
    assert!(
        line(&commands, evidence.hitanimation_substitute_check_line).contains("substituteHP == 0")
    );

    assert_eq!(
        line(&macros, evidence.hitanimation_macro_declaration_line).trim(),
        ".macro hitanimation battler:req"
    );
    assert_eq!(
        line(&macros, evidence.hitanimation_macro_opcode_line).trim(),
        ".byte B_SCR_OP_HITANIMATION"
    );

    let hitanimation_site_count = scripts
        .lines()
        .filter(|line| line.starts_with("\thitanimation "))
        .count();
    assert_eq!(
        hitanimation_site_count,
        BATTLE_SCRIPT_HITANIMATION_CANONICAL_SITE_COUNT
    );
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_CANONICAL_SITE_COUNT, 14);
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_BS_TARGET_SITE_COUNT, 12);
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_BS_ATTACKER_SITE_COUNT, 2);
    let target_sites = scripts
        .lines()
        .filter(|line| line.trim() == "hitanimation BS_TARGET")
        .count();
    let attacker_sites = scripts
        .lines()
        .filter(|line| line.trim() == "hitanimation BS_ATTACKER")
        .count();
    assert_eq!(target_sites, 12);
    assert_eq!(attacker_sites, 2);
}

#[test]
fn effectivenesssound_dispatch_body_macro_and_header_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_HIT_FEEDBACK_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
        "B_SCR_OP_EFFECTIVENESSSOUND"
    );
    assert_eq!(BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE, 0x0e);
    assert_eq!(
        BATTLE_SCRIPT_EFFECTIVENESSSOUND_DISPATCHER,
        "Cmd_effectivenesssound"
    );

    assert_eq!(
        line(&command_ids, evidence.effectivenesssound_header_enum_line).trim(),
        "B_SCR_OP_EFFECTIVENESSSOUND,"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_dispatch_line).trim(),
        "[B_SCR_OP_EFFECTIVENESSSOUND]              = Cmd_effectivenesssound,                      //0xE"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_forward_decl_line).trim(),
        "static void Cmd_effectivenesssound(void);"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_handler_line),
        "static void Cmd_effectivenesssound(void)"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_busy_check_line).trim(),
        "if (gBattleControllerExecFlags)"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_busy_return_line).trim(),
        "return;"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_missed_check_line).trim(),
        "if (!(gMoveResultFlags & MOVE_RESULT_MISSED))"
    );
    assert_eq!(
        line(&commands, evidence.effectivenesssound_switch_line).trim(),
        "switch (gMoveResultFlags & (u8)(~MOVE_RESULT_MISSED))"
    );
    assert_eq!(
        line(
            &commands,
            evidence.effectivenesssound_default_super_check_line
        )
        .trim(),
        "if (gMoveResultFlags & MOVE_RESULT_SUPER_EFFECTIVE)"
    );

    assert_eq!(
        line(&macros, evidence.effectivenesssound_macro_declaration_line).trim(),
        ".macro effectivenesssound"
    );
    assert_eq!(
        line(&macros, evidence.effectivenesssound_macro_opcode_line).trim(),
        ".byte B_SCR_OP_EFFECTIVENESSSOUND"
    );

    let effectivenesssound_site_count = scripts
        .lines()
        .filter(|line| line == &"\teffectivenesssound")
        .count();
    assert_eq!(
        effectivenesssound_site_count,
        BATTLE_SCRIPT_EFFECTIVENESSSOUND_CANONICAL_SITE_COUNT
    );
    assert_eq!(BATTLE_SCRIPT_EFFECTIVENESSSOUND_CANONICAL_SITE_COUNT, 18);
}

#[test]
fn constant_bit_values_and_song_ids_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_STATUS2_SUBSTITUTE, 0x0100_0000);
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE,
        1 << 8
    );
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NO_EFFECT,
        (1 << 0) | (1 << 3) | (1 << 5)
    );
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_MISSED, 1 << 0);
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE,
        1 << 1
    );
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE,
        1 << 2
    );
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE,
        1 << 3
    );
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_FAILED, 1 << 5);
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_SE_NOT_EFFECTIVE, 12);
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_SE_EFFECTIVE, 13);
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_SE_SUPER_EFFECTIVE, 14);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_CASES.len(), 15);
    assert_eq!(BATTLE_SCRIPT_EFFECTIVENESSSOUND_CASES.len(), 12);
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_REGISTRATION_CASES.len(), 4);
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_SHA256,
        "f2d8f29db05e23cd62f954270bb8a00dde7583f6d6a1e69804b56c85b76ecc1a"
    );
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_BYTES, 12357);

    let generated = include_bytes!("../src/battle_script_hit_feedback_family_vectors_gen.rs");
    assert_eq!(generated.len(), 28_820);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_hit_feedback_family_vectors_gen.rs"),
        "76cb9dbdcc2606bd505e8971d5bdb42903d6da9f7f85c0378f432f074f9b7d89"
    );
    assert_eq!(
        fs::metadata(
            workspace_root()
                .join("core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs")
        )
        .unwrap()
        .len(),
        34_678
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs"),
        "142e0ed733c0cf228db693f077f1f7fcfa129d61d9422beaa88e61f1cfcc0936"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's"));
    assert!(generated_text.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs."
    ));
}
