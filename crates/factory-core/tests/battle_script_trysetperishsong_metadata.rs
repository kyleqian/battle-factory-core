//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_trysetperishsong`. Behavioral differential replay lives
//! in the sibling vector test, so canonical TypeScript cannot substitute for
//! source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_trysetperishsong::*;
use factory_core::battle_script_trysetperishsong_vectors_gen::*;

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

fn sha256(relative: &str) -> String {
    let output = Command::new("shasum")
        .args(["-a", "256", relative])
        .current_dir(workspace_root())
        .output()
        .expect("run shasum");
    assert!(output.status.success(), "shasum did not succeed");
    String::from_utf8(output.stdout)
        .expect("shasum output must be UTF-8")
        .split_whitespace()
        .next()
        .expect("shasum must print a digest")
        .to_owned()
}

#[test]
fn dispatch_forward_declaration_and_handler_body_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_TRYSETPERISHSONG_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_TRYSETPERISHSONG");
    assert_eq!(evidence.opcode_id, 0xb2);
    assert_eq!(evidence.dispatcher, "Cmd_trysetperishsong");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYSETPERISHSONG]                = Cmd_trysetperishsong,                        //0xB2"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_trysetperishsong(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_trysetperishsong(void)"
    );
    assert_eq!(
        line(&commands, evidence.loop_line).trim(),
        "for (i = 0; i < gBattlersCount; i++)"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_1).trim(),
        "if (gStatuses3[i] & STATUS3_PERISH_SONG"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_2).trim(),
        "|| gBattleMons[i].ability == ABILITY_SOUNDPROOF)"
    );
    assert_eq!(
        line(&commands, evidence.not_affected_increment_line).trim(),
        "notAffectedCount++;"
    );
    assert_eq!(
        line(&commands, evidence.status3_write_line).trim(),
        "gStatuses3[i] |= STATUS3_PERISH_SONG;"
    );
    assert_eq!(
        line(&commands, evidence.timer_write_line).trim(),
        "gDisableStructs[i].perishSongTimer = 3;"
    );
    assert_eq!(
        line(&commands, evidence.timer_start_value_write_line).trim(),
        "gDisableStructs[i].perishSongTimerStartValue = 3;"
    );
    assert_eq!(
        line(&commands, evidence.pressure_call_line).trim(),
        "PressurePPLoseOnUsingPerishSong(gBattlerAttacker);"
    );
    assert_eq!(
        line(&commands, evidence.failure_check_line).trim(),
        "if (notAffectedCount == gBattlersCount)"
    );
    assert_eq!(
        line(&commands, evidence.jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );

    let util = source("reference/pokeemerald/src/battle_util.c");
    assert_eq!(
        line(&util, evidence.pressure_fn_line),
        "void PressurePPLoseOnUsingPerishSong(u8 attacker)"
    );
    assert_eq!(
        line(&util, evidence.pressure_loop_line).trim(),
        "for (i = 0; i < gBattlersCount; i++)"
    );
    assert_eq!(
        line(&util, evidence.pressure_condition_line).trim(),
        "if (gBattleMons[i].ability == ABILITY_PRESSURE && i != attacker)"
    );
    assert_eq!(
        line(&util, evidence.pressure_move_search_line).trim(),
        "if (gBattleMons[attacker].moves[j] == MOVE_PERISH_SONG)"
    );
    assert_eq!(
        line(&util, evidence.pressure_pp_decrement_line).trim(),
        "gBattleMons[attacker].pp[j]--;"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_TRYSETPERISHSONG_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro trysetperishsong ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYSETPERISHSONG"
    );
    assert_eq!(line(&macros, evidence.pointer_line).trim(), r".4byte \ptr");
    assert_eq!(evidence.encoded_width_bytes, 5);
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_FAILURE_POINTER_WIDTH_BYTES,
        4
    );
}

#[test]
fn sole_call_site_is_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_TRYSETPERISHSONG_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.entry_label, "BattleScript_EffectPerishSong");
    assert_eq!(
        line(&scripts, evidence.entry_label_line),
        "BattleScript_EffectPerishSong::"
    );
    assert_eq!(
        line(&scripts, evidence.statement_line).trim(),
        "trysetperishsong BattleScript_ButItFailed"
    );
    assert_eq!(
        scripts.matches("\ttrysetperishsong ").count(),
        1,
        "call site must be unique"
    );
    assert_eq!(evidence.instruction_program_counter, 1057);
    assert_eq!(
        evidence.failure_target_expression,
        "BattleScript_ButItFailed"
    );
    assert_eq!(evidence.failure_target_program_counter, 1434);
}

#[test]
fn source_constants_are_exact() {
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let ability_constants = source("reference/pokeemerald/include/constants/abilities.h");
    let move_constants = source("reference/pokeemerald/include/constants/moves.h");

    assert_eq!(
        line(&battle_constants, 162).trim(),
        "#define STATUS3_PERISH_SONG             (1 << 5)"
    );
    assert_eq!(
        line(&ability_constants, 47).trim(),
        "#define ABILITY_SOUNDPROOF 43"
    );
    assert_eq!(
        line(&ability_constants, 50).trim(),
        "#define ABILITY_PRESSURE 46"
    );
    assert_eq!(
        line(&move_constants, 199).trim(),
        "#define MOVE_PERISH_SONG 195"
    );

    assert_eq!(BATTLE_SCRIPT_STATUS3_PERISH_SONG, 1 << 5);
    assert_eq!(BATTLE_SCRIPT_ABILITY_SOUNDPROOF, 43);
    assert_eq!(BATTLE_SCRIPT_ABILITY_PRESSURE, 46);
    assert_eq!(BATTLE_SCRIPT_MOVE_PERISH_SONG, 195);
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE, 3);
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE, 0xb2);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_DISPATCHER,
        "Cmd_trysetperishsong"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_CONCRETE_START_COUNT, 1);
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_CASES.len(), 789);
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_CASES.len(), 10);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_SHA256,
        "4854061de9011da05d6d8fc26e0d5baec66e7483607ddf464fe36ba91102f5a2"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_BYTES,
        1_560_313
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_GENERATOR_SHA256,
        "a3d348fe6da851ed08c555d0677fccb5d2135af7879c462cffc2208e0b61c297"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_GENERATOR_BYTES,
        40_832
    );

    let generated = include_bytes!("../src/battle_script_trysetperishsong_vectors_gen.rs");
    assert_eq!(generated.len(), 4_636_075);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trysetperishsong_vectors_gen.rs"),
        "063e6a1787ea8f26a711687509274d6127ea6486f3f767fbdb2a41904de6470a"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        40_832
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs"),
        "a3d348fe6da851ed08c555d0677fccb5d2135af7879c462cffc2208e0b61c297"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrysetperishsongOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs."));
}
