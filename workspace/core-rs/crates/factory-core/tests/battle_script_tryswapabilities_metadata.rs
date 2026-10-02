//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_tryswapabilities`. Behavioral differential replay lives
//! in the sibling vector test, so canonical TypeScript cannot substitute for
//! source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_tryswapabilities::*;
use factory_core::battle_script_tryswapabilities_vectors_gen::*;

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
    let evidence = BATTLE_SCRIPT_TRYSWAPABILITIES_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_TRYSWAPABILITIES");
    assert_eq!(evidence.opcode_id, 0xda);
    assert_eq!(evidence.dispatcher, "Cmd_tryswapabilities");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYSWAPABILITIES]                = Cmd_tryswapabilities,                        //0xDA"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_tryswapabilities(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_tryswapabilities(void)"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_1).trim(),
        "if ((gBattleMons[gBattlerAttacker].ability == ABILITY_NONE"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_2).trim(),
        "&& gBattleMons[gBattlerTarget].ability == ABILITY_NONE)"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_3).trim(),
        "|| gBattleMons[gBattlerAttacker].ability == ABILITY_WONDER_GUARD"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_4).trim(),
        "|| gBattleMons[gBattlerTarget].ability == ABILITY_WONDER_GUARD"
    );
    assert_eq!(
        line(&commands, evidence.condition_line_5).trim(),
        "|| gMoveResultFlags & MOVE_RESULT_NO_EFFECT)"
    );
    assert_eq!(
        line(&commands, evidence.jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, evidence.swap_read_line).trim(),
        "u8 abilityAtk = gBattleMons[gBattlerAttacker].ability;"
    );
    assert_eq!(
        line(&commands, evidence.swap_write_attacker_line).trim(),
        "gBattleMons[gBattlerAttacker].ability = gBattleMons[gBattlerTarget].ability;"
    );
    assert_eq!(
        line(&commands, evidence.swap_write_target_line).trim(),
        "gBattleMons[gBattlerTarget].ability = abilityAtk;"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_TRYSWAPABILITIES_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro tryswapabilities ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYSWAPABILITIES"
    );
    assert_eq!(line(&macros, evidence.pointer_line).trim(), r".4byte \ptr");
    assert_eq!(evidence.encoded_width_bytes, 5);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_FAILURE_POINTER_WIDTH_BYTES,
        4
    );
}

#[test]
fn sole_call_site_is_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_TRYSWAPABILITIES_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.entry_label, "BattleScript_EffectSkillSwap");
    assert_eq!(
        line(&scripts, evidence.entry_label_line),
        "BattleScript_EffectSkillSwap::"
    );
    assert_eq!(
        line(&scripts, evidence.statement_line).trim(),
        "tryswapabilities BattleScript_ButItFailed"
    );
    assert_eq!(
        scripts.matches("\ttryswapabilities ").count(),
        1,
        "call site must be unique"
    );
    assert_eq!(evidence.instruction_program_counter, 1785);
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

    assert_eq!(
        line(&battle_constants, 220).trim(),
        "#define MOVE_RESULT_MISSED             (1 << 0)"
    );
    assert_eq!(
        line(&battle_constants, 223).trim(),
        "#define MOVE_RESULT_DOESNT_AFFECT_FOE  (1 << 3)"
    );
    assert_eq!(
        line(&battle_constants, 225).trim(),
        "#define MOVE_RESULT_FAILED             (1 << 5)"
    );
    assert_eq!(
        line(&battle_constants, 228).trim(),
        "#define MOVE_RESULT_NO_EFFECT          (MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | MOVE_RESULT_FAILED)"
    );
    assert_eq!(line(&ability_constants, 4).trim(), "#define ABILITY_NONE 0");
    assert_eq!(
        line(&ability_constants, 29).trim(),
        "#define ABILITY_WONDER_GUARD 25"
    );

    assert_eq!(BATTLE_SCRIPT_ABILITY_NONE, 0);
    assert_eq!(BATTLE_SCRIPT_ABILITY_WONDER_GUARD, 25);
    assert_eq!(
        BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
        (1 << 0) | (1 << 3) | (1 << 5)
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_OPCODE, 0xda);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_DISPATCHER,
        "Cmd_tryswapabilities"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_CONCRETE_START_COUNT, 1);
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_CASES.len(), 262);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_CASES.len(), 10);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_SHA256,
        "b9550f749d80ecf2f3be66bc51227b6e34512db7253f7ec191dbbf06b47ed801"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_BYTES, 192_531);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_GENERATOR_SHA256,
        "3de44a7da23f932577d063e3e509aafd0afaba79ee82d9867c928734dd0b342a"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_GENERATOR_BYTES,
        29_907
    );

    let generated = include_bytes!("../src/battle_script_tryswapabilities_vectors_gen.rs");
    assert_eq!(generated.len(), 584_015);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryswapabilities_vectors_gen.rs"),
        "93f83c80d8719d7d61e454002098ce2ef1c86827966f41733d0837dd289dd883"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        29_907
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs"),
        "3de44a7da23f932577d063e3e509aafd0afaba79ee82d9867c928734dd0b342a"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryswapabilitiesOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs."));
}
