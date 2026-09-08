//! Independent source/macro/call-site and artifact-identity ratchets for
//! `Cmd_removeitem`. Behavioral differential replay lives in the sibling
//! test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_removeitem::*;
use factory_core::battle_script_removeitem_vectors_gen::*;

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
    let battle_util = source("reference/pokeemerald/src/battle_util.c");
    let battle_h = source("reference/pokeemerald/include/battle.h");
    let items = source("reference/pokeemerald/include/constants/items.h");
    let evidence = BATTLE_SCRIPT_REMOVEITEM_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME, "B_SCR_OP_REMOVEITEM");
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_OPCODE, 0x6a);
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_DISPATCHER, "Cmd_removeitem");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_REMOVEITEM_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_REMOVEITEM_DISPATCHER);

    assert_eq!(line(&command_ids, 112).trim(), "B_SCR_OP_REMOVEITEM,");
    assert_eq!(
        line(&command_ids, 305).trim(),
        "#define BS_ATTACKER                 1"
    );
    assert_eq!(
        line(&command_ids, 314).trim(),
        "#define BS_SCRIPTING                10"
    );
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_REMOVEITEM]                      = Cmd_removeitem,                              //0x6A"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_removeitem(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_removeitem(void)"
    );
    assert_eq!(
        line(&commands, evidence.locals_line).trim(),
        "u16 *usedHeldItem;"
    );
    assert_eq!(
        line(&commands, evidence.active_battler_line).trim(),
        "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, evidence.used_held_item_pointer_line).trim(),
        "usedHeldItem = &gBattleStruct->usedHeldItems[gActiveBattler];"
    );
    assert_eq!(
        line(&commands, evidence.write_used_held_item_line).trim(),
        "*usedHeldItem = gBattleMons[gActiveBattler].item;"
    );
    assert_eq!(
        line(&commands, evidence.clear_item_line).trim(),
        "gBattleMons[gActiveBattler].item = ITEM_NONE;"
    );
    assert_eq!(
        line(&commands, evidence.emit_line).trim(),
        "BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_HELDITEM_BATTLE, 0, sizeof(gBattleMons[gActiveBattler].item), &gBattleMons[gActiveBattler].item);"
    );
    assert_eq!(
        line(&commands, evidence.mark_pending_line).trim(),
        "MarkBattlerForControllerExec(gActiveBattler);"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 2;"
    );

    let macro_evidence = BATTLE_SCRIPT_REMOVEITEM_MACRO_EVIDENCE;
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_SELECTOR_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_ENCODED_WIDTH_BYTES, 2);
    assert_eq!(macro_evidence.encoded_width_bytes, 2);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro removeitem battler:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_REMOVEITEM"
    );
    assert_eq!(
        line(&macros, macro_evidence.battler_line).trim(),
        r".byte \battler"
    );

    assert_eq!(line(&battle_util, 702).trim(), "case BS_ATTACKER:");
    assert_eq!(line(&battle_util, 703).trim(), "ret = gBattlerAttacker;");
    assert_eq!(line(&battle_util, 711).trim(), "case BS_SCRIPTING:");
    assert_eq!(
        line(&battle_util, 712).trim(),
        "ret = gBattleScripting.battler;"
    );

    for site in BATTLE_SCRIPT_REMOVEITEM_CALL_SITE_EVIDENCE {
        assert_eq!(
            line(&scripts, site.entry_label_line),
            format!("{}::", site.entry_label)
        );
        assert_eq!(
            line(&scripts, site.statement_line).trim(),
            format!("removeitem {}", site.selector_expression)
        );
    }
    assert_eq!(
        scripts.matches("\tremoveitem ").count(),
        BATTLE_SCRIPT_REMOVEITEM_CONCRETE_START_COUNT,
        "exactly 13 concrete removeitem call sites"
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_CALL_SITE_EVIDENCE
            .iter()
            .filter(|site| site.selector_expression == "BS_SCRIPTING")
            .count(),
        8
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_CALL_SITE_EVIDENCE
            .iter()
            .filter(|site| site.selector_expression == "BS_ATTACKER")
            .count(),
        5
    );

    assert_eq!(
        line(&battle_h, 415).trim(),
        "u16 usedHeldItems[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(line(&items, 4).trim(), "#define ITEM_NONE 0");
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_ITEM_NONE, 0);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_CASES.len(), 76);
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_CASES.len(), 10);
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_SHA256,
        "ecf8ec5ecd95f1ba20fec374b3525b4fd44ee827b8b818cae5cbba8f98cee419"
    );
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_BYTES, 175_161);
    assert_eq!(
        BATTLE_SCRIPT_REMOVEITEM_VECTOR_GENERATOR_SHA256,
        "bade63671fb22ff7f5dbba89b297302e22a74f5ffa7f736b48eea74292c8b988"
    );
    assert_eq!(BATTLE_SCRIPT_REMOVEITEM_VECTOR_GENERATOR_BYTES, 33_859);

    let generated = include_bytes!("../src/battle_script_removeitem_vectors_gen.rs");
    assert_eq!(generated.len(), 570_771);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_removeitem_vectors_gen.rs"),
        "e5f4a0e413d19c488961e3e260c4997bbad22d5ec6368545fe32fb067909d4d2"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-removeitem-vectors.mjs")
        )
        .unwrap()
        .len(),
        33_859
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-removeitem-vectors.mjs"),
        "bade63671fb22ff7f5dbba89b297302e22a74f5ffa7f736b48eea74292c8b988"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptRemoveitemOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
