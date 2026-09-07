//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_trywish`. Behavioral differential replay lives in the
//! sibling vector test, so canonical TypeScript cannot substitute for source
//! evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_trywish::*;
use factory_core::battle_script_trywish_vectors_gen::*;

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
    let evidence = BATTLE_SCRIPT_TRYWISH_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_TRYWISH");
    assert_eq!(evidence.opcode_id, 0xd4);
    assert_eq!(evidence.dispatcher, "Cmd_trywish");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYWISH]                         = Cmd_trywish,                                 //0xD4"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_trywish(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_trywish(void)"
    );
    assert_eq!(
        line(&commands, evidence.mode0_check_line).trim(),
        "if (gWishFutureKnock.wishCounter[gBattlerAttacker] == 0)"
    );
    assert_eq!(
        line(&commands, evidence.mode0_set_counter_line).trim(),
        "gWishFutureKnock.wishCounter[gBattlerAttacker] = 2;"
    );
    assert_eq!(
        line(&commands, evidence.mode0_set_mon_id_line).trim(),
        "gWishFutureKnock.wishMonId[gBattlerAttacker] = gBattlerPartyIndexes[gBattlerAttacker];"
    );
    assert_eq!(
        line(&commands, evidence.mode0_advance_line).trim(),
        "gBattlescriptCurrInstr += 6;"
    );
    assert_eq!(
        line(&commands, evidence.mode0_jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(
        line(&commands, evidence.mode1_prepare_buffer_line).trim(),
        "PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1, gBattlerTarget, gWishFutureKnock.wishMonId[gBattlerTarget])"
    );
    assert_eq!(
        line(&commands, evidence.mode1_damage_line).trim(),
        "gBattleMoveDamage = gBattleMons[gBattlerTarget].maxHP / 2;"
    );
    assert_eq!(
        line(&commands, evidence.mode1_zero_check_line).trim(),
        "if (gBattleMoveDamage == 0)"
    );
    assert_eq!(
        line(&commands, evidence.mode1_negate_line).trim(),
        "gBattleMoveDamage *= -1;"
    );
    assert_eq!(
        line(&commands, evidence.mode1_full_hp_check_line).trim(),
        "if (gBattleMons[gBattlerTarget].hp == gBattleMons[gBattlerTarget].maxHP)"
    );
    assert_eq!(
        line(&commands, evidence.mode1_jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(
        line(&commands, evidence.mode1_advance_line).trim(),
        "gBattlescriptCurrInstr += 6;"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_TRYWISH_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro trywish turnNumber:req, ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYWISH"
    );
    assert_eq!(
        line(&macros, evidence.turn_number_line).trim(),
        r".byte \turnNumber"
    );
    assert_eq!(line(&macros, evidence.pointer_line).trim(), r".4byte \ptr");
    assert_eq!(evidence.encoded_width_bytes, 6);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_ENCODED_WIDTH_BYTES, 6);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_SELECTOR_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_POINTER_WIDTH_BYTES, 4);
}

#[test]
fn both_call_sites_are_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_TRYWISH_CALL_SITE_EVIDENCE;

    assert_eq!(evidence[0].entry_label, "BattleScript_EffectWish");
    assert_eq!(
        line(&scripts, evidence[0].entry_label_line),
        "BattleScript_EffectWish::"
    );
    assert_eq!(
        line(&scripts, evidence[0].statement_line).trim(),
        "trywish 0, BattleScript_ButItFailed"
    );
    assert_eq!(evidence[0].instruction_program_counter, 1673);
    assert_eq!(evidence[0].selector_expression, "0");
    assert_eq!(evidence[0].target_expression, "BattleScript_ButItFailed");
    assert_eq!(evidence[0].target_program_counter, 1434);

    assert_eq!(evidence[1].entry_label, "BattleScript_WishComesTrue");
    assert_eq!(
        line(&scripts, evidence[1].entry_label_line),
        "BattleScript_WishComesTrue::"
    );
    assert_eq!(
        line(&scripts, evidence[1].statement_line).trim(),
        "trywish 1, BattleScript_WishButFullHp"
    );
    assert_eq!(evidence[1].instruction_program_counter, 2613);
    assert_eq!(evidence[1].selector_expression, "1");
    assert_eq!(evidence[1].target_expression, "BattleScript_WishButFullHp");
    assert_eq!(evidence[1].target_program_counter, 2623);

    assert_eq!(
        scripts.matches("\ttrywish ").count(),
        2,
        "call sites must be exactly two"
    );
}

#[test]
fn source_constants_are_exact() {
    let battle = source("reference/pokeemerald/include/battle.h");
    let message = source("reference/pokeemerald/include/battle_message.h");
    let commands_h = source("reference/pokeemerald/include/constants/battle_script_commands.h");

    assert_eq!(
        line(&battle, 170).trim(),
        "u8 wishCounter[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(
        line(&battle, 171).trim(),
        "u8 wishMonId[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(
        line(&message, 184).trim(),
        "#define PREPARE_MON_NICK_WITH_PREFIX_BUFFER(textVar, battler, partyId)      \\"
    );
    assert_eq!(line(&commands_h, 218).trim(), "B_SCR_OP_TRYWISH,");

    assert_eq!(BATTLE_SCRIPT_TRYWISH_OPCODE, 0xd4);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_DISPATCHER, "Cmd_trywish");
    assert_eq!(BATTLE_SCRIPT_TRYWISH_CONCRETE_START_COUNT, 2);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH, "0");
    assert_eq!(BATTLE_SCRIPT_TRYWISH_MODE_HEAL_EFFECT, "1");
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYWISH_CASES.len(), 658);
    assert_eq!(BATTLE_SCRIPT_TRYWISH_REGISTRATION_CASES.len(), 6);
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_SHA256,
        "e814a4fe03acf5b32c600b4b954599e1143ce1fb5f945751512ada6f550d1696"
    );
    assert_eq!(BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_BYTES, 920_338);
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_VECTOR_GENERATOR_SHA256,
        "955f02de334a4603ee756cc14d3f551d6083a40fd9675990e961de832bc10ff9"
    );
    assert_eq!(BATTLE_SCRIPT_TRYWISH_VECTOR_GENERATOR_BYTES, 33_632);

    let generated = include_bytes!("../src/battle_script_trywish_vectors_gen.rs");
    assert_eq!(generated.len(), 2_843_760);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trywish_vectors_gen.rs"),
        "b2a0780c8da93b6f22fef13fa886482be4f37d706619af1e0dcbf3818484c4b0"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-trywish-vectors.mjs"))
            .expect("generator metadata")
            .len(),
        33_632
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trywish-vectors.mjs"),
        "955f02de334a4603ee756cc14d3f551d6083a40fd9675990e961de832bc10ff9"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrywishOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-trywish-vectors.mjs."));
}
