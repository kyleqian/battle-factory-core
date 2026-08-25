//! Independent source/macro/program-site and artifact-identity ratchets for
//! Refresh. Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_refresh::*;
use factory_core::battle_script_refresh_vectors_gen::*;

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
fn exact_opcode_dispatch_body_controller_sequence_macro_and_single_site_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let metadata = BATTLE_SCRIPT_REFRESH_SOURCE_METADATA;

    assert_eq!(
        BATTLE_SCRIPT_REFRESH_OPCODE_NAME,
        "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED"
    );
    assert_eq!(BATTLE_SCRIPT_REFRESH_OPCODE, 0xcd);
    assert_eq!(
        BATTLE_SCRIPT_REFRESH_DISPATCHER,
        "Cmd_cureifburnedparalyzedorpoisoned"
    );
    assert_eq!(
        line(&command_ids, 211).trim(),
        "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED,"
    );
    assert_eq!(line(&commands, usize::from(metadata.dispatch_line)).trim(),
        "[B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED] = Cmd_cureifburnedparalyzedorpoisoned,         //0xCD");
    assert_eq!(
        line(&commands, usize::from(metadata.handler_line)),
        "static void Cmd_cureifburnedparalyzedorpoisoned(void)"
    );
    assert_eq!(line(&commands, usize::from(metadata.predicate_line)).trim(),
        "if (gBattleMons[gBattlerAttacker].status1 & (STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON))");
    assert_eq!(
        line(&commands, usize::from(metadata.clear_line)).trim(),
        "gBattleMons[gBattlerAttacker].status1 = 0;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.advance_line)).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.active_battler_line)).trim(),
        "gActiveBattler = gBattlerAttacker;"
    );
    assert_eq!(line(&commands, usize::from(metadata.emit_line)).trim(),
        "BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(gBattleMons[gActiveBattler].status1), &gBattleMons[gActiveBattler].status1);");
    assert_eq!(
        line(&commands, usize::from(metadata.mark_pending_line)).trim(),
        "MarkBattlerForControllerExec(gActiveBattler);"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.failure_line)).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );

    assert_eq!(BATTLE_SCRIPT_REFRESH_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_REFRESH_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        line(&macros, usize::from(metadata.macro_declaration_line)).trim(),
        ".macro cureifburnedparalyzedorpoisoned ptr:req"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_opcode_line)).trim(),
        ".byte B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_pointer_line)).trim(),
        r".4byte \ptr"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_label_line)),
        "BattleScript_EffectRefresh::"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_statement_line)).trim(),
        "cureifburnedparalyzedorpoisoned BattleScript_ButItFailed"
    );
    assert_eq!(
        scripts
            .matches("\tcureifburnedparalyzedorpoisoned ")
            .count(),
        1
    );
    assert_eq!(metadata.site_program_counter, 1803);

    for (number, text) in [
        (
            115,
            "#define STATUS1_SLEEP            (1 << 0 | 1 << 1 | 1 << 2)",
        ),
        (117, "#define STATUS1_POISON           (1 << 3)"),
        (118, "#define STATUS1_BURN             (1 << 4)"),
        (119, "#define STATUS1_FREEZE           (1 << 5)"),
        (120, "#define STATUS1_PARALYSIS        (1 << 6)"),
        (121, "#define STATUS1_TOXIC_POISON     (1 << 7)"),
    ] {
        assert!(line(&battle_constants, number).trim().starts_with(text));
    }
    assert_eq!(BATTLE_SCRIPT_STATUS1_SLEEP, 0x07);
    assert_eq!(BATTLE_SCRIPT_STATUS1_POISON, 0x08);
    assert_eq!(BATTLE_SCRIPT_STATUS1_BURN, 0x10);
    assert_eq!(BATTLE_SCRIPT_STATUS1_FREEZE, 0x20);
    assert_eq!(BATTLE_SCRIPT_STATUS1_PARALYSIS, 0x40);
    assert_eq!(BATTLE_SCRIPT_STATUS1_TOXIC_POISON, 0x80);
    assert_eq!(BATTLE_SCRIPT_REFRESH_CURE_MASK, 0xd8);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_REFRESH_CATEGORY_CENSUS,
        [
            ("attacker-side-party-index-mapping", 48),
            ("complete-u32-mask-boundaries", 42),
            ("scheduler-pending-preservation", 6),
            ("ordered-errors", 1),
            ("malformed-before-attacker", 5),
            ("late-label-resolution", 2),
            ("repetitions", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_REFRESH_VECTOR_CORPUS_SHA256,
        "8f73aa5df646eea24d29f1d47fdd5009d054e3c2cebbb08a1d3c396f1e76b72c"
    );
    assert_eq!(BATTLE_SCRIPT_REFRESH_VECTOR_CORPUS_BYTES, 482_558);
    let generated = include_bytes!("../src/battle_script_refresh_vectors_gen.rs");
    assert_eq!(generated.len(), 1_424_850);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_refresh_vectors_gen.rs"),
        "c81649c9e40975d6a0fb9a50f4f0fe78f67646d5415f4fc1eb5eb9104f4ead15"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-refresh-vectors.mjs"))
            .unwrap()
            .len(),
        26_827
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-refresh-vectors.mjs"),
        "e89ba3e2ef26f681ec8675fc3aca4f92da58a1a6d7feeff6dede4a3df0a3c5a5"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptRefreshOpcode.ts via Node."));
    assert!(generated_text.contains("Regenerate from any cwd with: node --experimental-strip-types core-rs/tools/gen-battle-script-refresh-vectors.mjs."));
}
