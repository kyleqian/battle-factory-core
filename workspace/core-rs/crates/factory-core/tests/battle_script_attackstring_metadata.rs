//! Independent source/dispatch/macro/constants and artifact-identity
//! ratchets for `B_SCR_OP_ATTACKSTRING`. Behavioral differential replay
//! lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_attackstring::*;
use factory_core::battle_script_attackstring_vectors_gen::*;

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
    let evidence = BATTLE_SCRIPT_ATTACKSTRING_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
        "B_SCR_OP_ATTACKSTRING"
    );
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_OPCODE, 0x02);
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_DISPATCHER, "Cmd_attackstring");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_ATTACKSTRING_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_ATTACKSTRING_DISPATCHER);

    assert_eq!(
        line(&command_ids, evidence.header_enum_line).trim(),
        "B_SCR_OP_ATTACKSTRING,"
    );
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_ATTACKSTRING]                    = Cmd_attackstring,                            //0x2"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_attackstring(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_attackstring(void)"
    );
    assert_eq!(
        line(&commands, evidence.busy_check_line).trim(),
        "if (gBattleControllerExecFlags)"
    );
    assert_eq!(line(&commands, evidence.busy_return_line).trim(), "return;");
    assert_eq!(
        line(&commands, evidence.printed_check_line).trim(),
        "if (!(gHitMarker & (HITMARKER_NO_ATTACKSTRING | HITMARKER_ATTACKSTRING_PRINTED)))"
    );
    assert_eq!(
        line(&commands, evidence.prepare_string_battle_line).trim(),
        "PrepareStringBattle(STRINGID_USEDMOVE, gBattlerAttacker);"
    );
    assert_eq!(
        line(&commands, evidence.hitmarker_set_line).trim(),
        "gHitMarker |= HITMARKER_ATTACKSTRING_PRINTED;"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr++;"
    );
    assert_eq!(
        line(&commands, evidence.msg_display_clear_line).trim(),
        "gBattleCommunication[MSG_DISPLAY] = 0;"
    );

    assert_eq!(
        line(&macros, evidence.macro_declaration_line).trim(),
        ".macro attackstring"
    );
    assert_eq!(
        line(&macros, evidence.macro_opcode_line).trim(),
        ".byte B_SCR_OP_ATTACKSTRING"
    );

    let attackstring_site_count = scripts
        .lines()
        .filter(|line| line == &"\tattackstring")
        .count();
    assert_eq!(
        attackstring_site_count,
        BATTLE_SCRIPT_ATTACKSTRING_CANONICAL_SITE_COUNT
    );
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_CANONICAL_SITE_COUNT, 135);

    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_NO_ATTACKSTRING, 1 << 9);
    assert_eq!(
        BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED,
        1 << 10
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_CASES.len(), 21);
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_REGISTRATION_CASES.len(), 2);
    assert_eq!(
        BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_SHA256,
        "ec4b7f719748803c7968ad09e688df19be2dadc7b7503323318ed57e38681733"
    );
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_BYTES, 9368);

    let generated = include_bytes!("../src/battle_script_attackstring_vectors_gen.rs");
    assert_eq!(generated.len(), 23_886);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_attackstring_vectors_gen.rs"),
        "93f76a12f119afb5a7326bbb6f99037f760927c8f22c2f8949bf644fbbfc0796"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-attackstring-vectors.mjs")
        )
        .unwrap()
        .len(),
        25_772
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-attackstring-vectors.mjs"),
        "17ce4d512454441035c5590f84b140be6cf84e0d26a1acad84169edfa2aef9d3"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's"));
    assert!(generated_text.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-attackstring-vectors.mjs."
    ));
}
