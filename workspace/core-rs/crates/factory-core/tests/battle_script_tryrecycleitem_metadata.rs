//! Independent source/macro/call-site and artifact-identity ratchets for
//! Recycle. Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_tryrecycleitem::*;
use factory_core::battle_script_tryrecycleitem_vectors_gen::*;

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
fn exact_opcode_dispatch_body_conditions_macro_and_call_site_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_h = source("reference/pokeemerald/include/battle.h");
    let items = source("reference/pokeemerald/include/constants/items.h");
    let evidence = BATTLE_SCRIPT_TRYRECYCLEITEM_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME,
        "B_SCR_OP_TRYRECYCLEITEM"
    );
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE, 0xea);
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER,
        "Cmd_tryrecycleitem"
    );
    assert_eq!(
        evidence.opcode_name,
        BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME
    );
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER);

    assert_eq!(line(&command_ids, 240).trim(), "B_SCR_OP_TRYRECYCLEITEM,");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYRECYCLEITEM]                  = Cmd_tryrecycleitem,                          //0xEA"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_tryrecycleitem(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_tryrecycleitem(void)"
    );
    assert_eq!(
        line(&commands, evidence.locals_line).trim(),
        "u16 *usedHeldItem;"
    );
    assert_eq!(
        line(&commands, evidence.active_battler_line).trim(),
        "gActiveBattler = gBattlerAttacker;"
    );
    assert_eq!(
        line(&commands, evidence.used_held_item_pointer_line).trim(),
        "usedHeldItem = &gBattleStruct->usedHeldItems[gActiveBattler];"
    );
    assert_eq!(
        line(&commands, evidence.condition_line).trim(),
        "if (*usedHeldItem != ITEM_NONE && gBattleMons[gActiveBattler].item == ITEM_NONE)"
    );
    assert_eq!(
        line(&commands, evidence.last_used_item_line).trim(),
        "gLastUsedItem = *usedHeldItem;"
    );
    assert_eq!(
        line(&commands, evidence.clear_used_held_item_line).trim(),
        "*usedHeldItem = ITEM_NONE;"
    );
    assert_eq!(
        line(&commands, evidence.write_item_line).trim(),
        "gBattleMons[gActiveBattler].item = gLastUsedItem;"
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
        "gBattlescriptCurrInstr += 5;"
    );
    assert_eq!(
        line(&commands, evidence.else_pointer_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );

    let macro_evidence = BATTLE_SCRIPT_TRYRECYCLEITEM_MACRO_EVIDENCE;
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_FAILURE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(macro_evidence.encoded_width_bytes, 5);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro tryrecycleitem ptr:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYRECYCLEITEM"
    );
    assert_eq!(
        line(&macros, macro_evidence.pointer_line).trim(),
        r".4byte \ptr"
    );

    let site = BATTLE_SCRIPT_TRYRECYCLEITEM_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, site.entry_label_line),
        "BattleScript_EffectRecycle::"
    );
    assert_eq!(
        line(&scripts, site.statement_line).trim(),
        "tryrecycleitem BattleScript_ButItFailed"
    );
    assert_eq!(site.instruction_program_counter, 1708);
    assert_eq!(site.failure_target_expression, "BattleScript_ButItFailed");
    assert_eq!(site.failure_target_program_counter, 1434);
    assert_eq!(
        scripts.matches("\ttryrecycleitem ").count(),
        1,
        "exactly one concrete tryrecycleitem call site"
    );

    assert_eq!(
        line(&battle_h, 415).trim(),
        "u16 usedHeldItems[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(line(&battle_h, 657).trim(), "extern u16 gLastUsedItem;");
    assert_eq!(line(&items, 4).trim(), "#define ITEM_NONE 0");
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_ITEM_NONE, 0);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_CASES.len(), 85);
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_CASES.len(), 8);
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_SHA256,
        "fa5eeb58a8553b283a40624fa18dd85d9157ebc0cfdad9dcb518449f2b254328"
    );
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_BYTES, 169_880);
    assert_eq!(
        BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_GENERATOR_SHA256,
        "2dbc138155a07f1927c4398c3e2922f56717e67ae384a8d51136e1e12a09a9b8"
    );
    assert_eq!(BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_GENERATOR_BYTES, 30_696);

    let generated = include_bytes!("../src/battle_script_tryrecycleitem_vectors_gen.rs");
    assert_eq!(generated.len(), 390_032);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryrecycleitem_vectors_gen.rs"),
        "766ed55ce3cb42a90d0f7748833c91f0f7d213d940bfbd2a9cc8f29647e52a3a"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-tryrecycleitem-vectors.mjs")
        )
        .unwrap()
        .len(),
        30_696
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryrecycleitem-vectors.mjs"),
        "2dbc138155a07f1927c4398c3e2922f56717e67ae384a8d51136e1e12a09a9b8"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryrecycleitemOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
