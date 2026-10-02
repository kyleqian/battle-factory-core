//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_trysetrest`. Behavioral differential replay lives in
//! the sibling vector test, so canonical TypeScript cannot substitute for
//! source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_trysetrest::*;
use factory_core::battle_script_trysetrest_vectors_gen::*;

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
    let evidence = BATTLE_SCRIPT_TRYSETREST_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_TRYSETREST");
    assert_eq!(evidence.opcode_id, 0x81);
    assert_eq!(evidence.dispatcher, "Cmd_trysetrest");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYSETREST]                      = Cmd_trysetrest,                              //0x81"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_trysetrest(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_trysetrest(void)"
    );
    assert_eq!(
        line(&commands, evidence.role_collapse_line).trim(),
        "gActiveBattler = gBattlerTarget = gBattlerAttacker;"
    );
    assert_eq!(
        line(&commands, evidence.damage_line).trim(),
        "gBattleMoveDamage = gBattleMons[gBattlerTarget].maxHP * (-1);"
    );
    assert_eq!(
        line(&commands, evidence.hp_check_line).trim(),
        "if (gBattleMons[gBattlerTarget].hp == gBattleMons[gBattlerTarget].maxHP)"
    );
    assert_eq!(
        line(&commands, evidence.jump_line).trim(),
        "gBattlescriptCurrInstr = failJump;"
    );
    assert_eq!(
        line(&commands, evidence.chooser_statused_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_REST_STATUSED;"
    );
    assert_eq!(
        line(&commands, evidence.chooser_rest_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_REST;"
    );
    assert_eq!(
        line(&commands, evidence.status_write_line).trim(),
        "gBattleMons[gBattlerTarget].status1 = STATUS1_SLEEP_TURN(3);"
    );
    assert_eq!(
        line(&commands, evidence.emit_line).trim(),
        "BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(gBattleMons[gActiveBattler].status1), &gBattleMons[gActiveBattler].status1);"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_TRYSETREST_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro trysetrest ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYSETREST"
    );
    assert_eq!(line(&macros, evidence.pointer_line).trim(), r".4byte \ptr");
    assert_eq!(evidence.encoded_width_bytes, 5);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_POINTER_WIDTH_BYTES, 4);
}

#[test]
fn call_site_is_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_TRYSETREST_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.entry_label, "BattleScript_EffectRest");
    assert_eq!(
        line(&scripts, evidence.entry_label_line),
        "BattleScript_EffectRest::"
    );
    assert_eq!(
        line(&scripts, evidence.statement_line).trim(),
        "trysetrest BattleScript_AlreadyAtFullHp"
    );
    assert_eq!(evidence.target_expression, "BattleScript_AlreadyAtFullHp");
    assert_eq!(
        scripts.matches("\ttrysetrest ").count(),
        1,
        "call site must be exactly one"
    );
}

#[test]
fn source_constants_are_exact() {
    let battle = source("reference/pokeemerald/include/constants/battle.h");
    let strings = source("reference/pokeemerald/include/constants/battle_string_ids.h");
    let commands_h = source("reference/pokeemerald/include/constants/battle_script_commands.h");

    assert_eq!(
        line(&battle, 115).trim(),
        "#define STATUS1_SLEEP            (1 << 0 | 1 << 1 | 1 << 2) // First 3 bits (Number of turns to sleep)"
    );
    assert_eq!(
        line(&battle, 116).trim(),
        "#define STATUS1_SLEEP_TURN(num)  ((num) << 0) // Just for readability (or if rearranging statuses)"
    );
    assert_eq!(line(&strings, 467).trim(), "#define B_MSG_REST           0");
    assert_eq!(line(&strings, 468).trim(), "#define B_MSG_REST_STATUSED  1");
    assert_eq!(line(&commands_h, 135).trim(), "B_SCR_OP_TRYSETREST,");

    assert_eq!(BATTLE_SCRIPT_TRYSETREST_OPCODE, 0x81);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_DISPATCHER, "Cmd_trysetrest");
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP, 0x07);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3, 3);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_B_MSG_REST, 0);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_B_MSG_REST_STATUSED, 1);
}

#[test]
fn registration_is_presence_only_find_first_no_operand_shape_validation() {
    // The TypeScript factory requires only that at least one
    // B_SCR_OP_TRYSETREST instruction exists; it validates neither the
    // opcode id, the dispatcher, nor operand shape at registration time.
    let error = register_battle_script_trysetrest_handler(&[]).expect_err("absent");
    assert_eq!(
        error.to_string(),
        "committed Battle Script program does not emit B_SCR_OP_TRYSETREST"
    );
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_CASES.len(), 109);
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_SHA256,
        "59bb3a8e3d36d1e7f0a0558522ab7c1eef5355e6cb833552459433f3d0b00c82"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_BYTES, 202_667);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_VECTOR_GENERATOR_SHA256,
        "4beebc9980de9510af6f9f43769fea424dbcaa0c42565dd08b8aeb9a1df53199"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_VECTOR_GENERATOR_BYTES, 27_270);

    let generated = include_bytes!("../src/battle_script_trysetrest_vectors_gen.rs");
    assert_eq!(generated.len(), 952_476);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trysetrest_vectors_gen.rs"),
        "7dc50e6865c45244ac488636138a98e794b69fa1f3973c8a354b3ddbab64a364"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trysetrest-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        27_270
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trysetrest-vectors.mjs"),
        "4beebc9980de9510af6f9f43769fea424dbcaa0c42565dd08b8aeb9a1df53199"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrysetrestOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-trysetrest-vectors.mjs."));
}
