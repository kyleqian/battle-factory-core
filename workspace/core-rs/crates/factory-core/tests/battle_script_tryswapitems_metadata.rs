//! Independent source/macro/call-site and artifact-identity ratchets for
//! Trick. Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_tryswapitems::*;
use factory_core::battle_script_tryswapitems_vectors_gen::*;

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
    let abilities = source("reference/pokeemerald/include/constants/abilities.h");
    let evidence = BATTLE_SCRIPT_TRYSWAPITEMS_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME,
        "B_SCR_OP_TRYSWAPITEMS"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE, 0xd2);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER, "Cmd_tryswapitems");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER);

    let constants = BATTLE_SCRIPT_TRYSWAPITEMS_CONSTANTS_EVIDENCE;
    assert_eq!(
        line(&command_ids, constants.command_enum_line).trim(),
        "B_SCR_OP_TRYSWAPITEMS,"
    );
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYSWAPITEMS]                    = Cmd_tryswapitems,                            //0xD2"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_tryswapitems(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_tryswapitems(void)"
    );
    assert_eq!(
        line(&commands, evidence.trainer_hill_line).trim(),
        "if (gBattleTypeFlags & BATTLE_TYPE_TRAINER_HILL"
    );
    assert_eq!(
        line(&commands, evidence.opponent_regular_guard_line).trim(),
        "|| (GetBattlerSide(gBattlerAttacker) == B_SIDE_OPPONENT"
    );
    assert!(
        line(&commands, evidence.knocked_off_attacker_line)
            .contains("gWishFutureKnock.knockedOffMons[sideAttacker]"),
        "knocked-off attacker line drifted"
    );
    assert!(
        line(&commands, evidence.knocked_off_target_line)
            .contains("gWishFutureKnock.knockedOffMons[sideTarget]"),
        "knocked-off target line drifted"
    );
    assert!(
        line(&commands, evidence.item_guard_line)
            .contains("gBattleMons[gBattlerAttacker].item == ITEM_NONE"),
        "item guard line drifted"
    );
    assert_eq!(
        line(&commands, evidence.sticky_hold_check_line).trim(),
        "else if (gBattleMons[gBattlerTarget].ability == ABILITY_STICKY_HOLD)"
    );
    assert_eq!(
        line(&commands, evidence.sticky_hold_jump_line).trim(),
        "gBattlescriptCurrInstr = BattleScript_StickyHoldActivates;"
    );
    assert_eq!(
        line(&commands, evidence.sticky_hold_record_ability_line).trim(),
        "RecordAbilityBattle(gBattlerTarget, gLastUsedAbility);"
    );
    assert_eq!(
        line(&commands, evidence.changed_items_write_line).trim(),
        "newItemAtk = &gBattleStruct->changedItems[gBattlerAttacker];"
    );
    assert_eq!(
        line(&commands, evidence.attacker_item_clear_line).trim(),
        "gBattleMons[gBattlerAttacker].item = ITEM_NONE;"
    );
    assert_eq!(
        line(&commands, evidence.target_item_set_line).trim(),
        "gBattleMons[gBattlerTarget].item = oldItemAtk;"
    );
    assert!(
        line(&commands, evidence.emit_attacker_line).contains("BtlController_EmitSetMonData"),
        "attacker emit line drifted"
    );
    assert!(
        line(&commands, evidence.emit_target_line).contains("BtlController_EmitSetMonData"),
        "target emit line drifted"
    );
    assert!(
        line(&commands, evidence.choiced_move_target_clear_line)
            .contains("choicedMove[gBattlerTarget]"),
        "choicedMove target clear line drifted"
    );
    assert!(
        line(&commands, evidence.choiced_move_attacker_clear_line)
            .contains("choicedMove[gBattlerAttacker]"),
        "choicedMove attacker clear line drifted"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
    assert!(
        line(&commands, evidence.multistring_both_line).contains("B_MSG_ITEM_SWAP_BOTH"),
        "multistring both line drifted"
    );
    assert!(
        line(&commands, evidence.multistring_taken_line).contains("B_MSG_ITEM_SWAP_TAKEN"),
        "multistring taken line drifted"
    );
    assert!(
        line(&commands, evidence.multistring_given_line).contains("B_MSG_ITEM_SWAP_GIVEN"),
        "multistring given line drifted"
    );

    let macro_evidence = BATTLE_SCRIPT_TRYSWAPITEMS_MACRO_EVIDENCE;
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_FAILURE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(macro_evidence.encoded_width_bytes, 5);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro tryswapitems ptr:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYSWAPITEMS"
    );
    assert_eq!(
        line(&macros, macro_evidence.pointer_line).trim(),
        r".4byte \ptr"
    );

    let site = BATTLE_SCRIPT_TRYSWAPITEMS_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, site.entry_label_line),
        "BattleScript_EffectTrick::"
    );
    assert_eq!(
        line(&scripts, site.statement_line).trim(),
        "tryswapitems BattleScript_ButItFailed"
    );
    assert_eq!(site.instruction_program_counter, 1652);
    assert_eq!(site.failure_target_expression, "BattleScript_ButItFailed");
    assert_eq!(site.failure_target_program_counter, 1434);
    assert_eq!(
        line(&scripts, site.sticky_hold_label_line),
        "BattleScript_StickyHoldActivates::"
    );
    assert_eq!(site.sticky_hold_program_counter, 3019);
    assert_eq!(
        scripts.matches("\ttryswapitems ").count(),
        1,
        "exactly one concrete tryswapitems call site"
    );

    assert_eq!(
        line(&items, constants.orange_mail_line).trim(),
        "#define ITEM_ORANGE_MAIL 121"
    );
    assert_eq!(
        line(&items, constants.retro_mail_line).trim(),
        "#define ITEM_RETRO_MAIL 132"
    );
    assert_eq!(
        line(&abilities, constants.sticky_hold_ability_line).trim(),
        "#define ABILITY_STICKY_HOLD 60"
    );
    assert_eq!(
        line(&battle_h, constants.knocked_off_mons_field_line).trim(),
        "u8 knockedOffMons[NUM_BATTLE_SIDES]; // Each battler is represented by a bit."
    );
    assert_eq!(
        line(&battle_h, constants.changed_items_field_line).trim(),
        "u16 changedItems[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ORANGE_MAIL, 121);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_RETRO_MAIL, 132);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD, 60);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_CASES.len(), 44);
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_REGISTRATION_CASES.len(), 8);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_CORPUS_SHA256,
        "0fd8d0364b543840ff250f6d438bebfd2f5d2bb7456e78ae8033cb67373a0cf8"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_CORPUS_BYTES, 103_884);
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_GENERATOR_SHA256,
        "3c78b47a378619eadbf9a56384ba98cbf51313bed63bc697809b8e96848f8134"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSWAPITEMS_VECTOR_GENERATOR_BYTES, 37_447);

    let generated = include_bytes!("../src/battle_script_tryswapitems_vectors_gen.rs");
    assert_eq!(generated.len(), 324_169);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryswapitems_vectors_gen.rs"),
        "b86c21fd2532295073c1113f19ed3f3b5759883f975c0e1c28d5061321fd33d2"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-tryswapitems-vectors.mjs")
        )
        .unwrap()
        .len(),
        37_447
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryswapitems-vectors.mjs"),
        "3c78b47a378619eadbf9a56384ba98cbf51313bed63bc697809b8e96848f8134"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryswapitemsOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
