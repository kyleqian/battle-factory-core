//! Independent source/macro/call-site and artifact-identity ratchets for the
//! stockpile family. Behavioral differential replay lives in the sibling
//! test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_stockpile::*;
use factory_core::battle_script_stockpile_vectors_gen::*;

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
fn exact_opcode_dispatch_macro_call_site_and_string_id_lines_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let string_ids = source("reference/pokeemerald/include/constants/battle_string_ids.h");
    let evidence = BATTLE_SCRIPT_STOCKPILE_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(BATTLE_SCRIPT_STOCKPILE_OPCODE, 0x85);
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_OPCODE, 0x86);
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_OPCODE, 0x87);
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_DISPATCHER, "Cmd_stockpile");
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_DISPATCHER,
        "Cmd_stockpiletobasedamage"
    );
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_DISPATCHER,
        "Cmd_stockpiletohpheal"
    );

    // Forward declarations (:212-214).
    assert_eq!(
        line(&commands, evidence.stockpile_forward_decl_line).trim(),
        "static void Cmd_stockpile(void);"
    );
    assert_eq!(
        line(&commands, evidence.to_base_damage_forward_decl_line).trim(),
        "static void Cmd_stockpiletobasedamage(void);"
    );
    assert_eq!(
        line(&commands, evidence.to_hp_heal_forward_decl_line).trim(),
        "static void Cmd_stockpiletohpheal(void);"
    );

    // Dispatch rows (:464-466).
    assert_eq!(
        line(&commands, evidence.stockpile_dispatch_line).trim(),
        "[B_SCR_OP_STOCKPILE]                       = Cmd_stockpile,                               //0x85"
    );
    assert_eq!(
        line(&commands, evidence.to_base_damage_dispatch_line).trim(),
        "[B_SCR_OP_STOCKPILETOBASEDAMAGE]           = Cmd_stockpiletobasedamage,                   //0x86"
    );
    assert_eq!(
        line(&commands, evidence.to_hp_heal_dispatch_line).trim(),
        "[B_SCR_OP_STOCKPILETOHPHEAL]               = Cmd_stockpiletohpheal,                       //0x87"
    );

    // Handler bodies (:6850, :6868, :6894).
    assert_eq!(
        line(&commands, evidence.stockpile_handler_line),
        "static void Cmd_stockpile(void)"
    );
    assert_eq!(
        line(&commands, evidence.to_base_damage_handler_line),
        "static void Cmd_stockpiletobasedamage(void)"
    );
    assert_eq!(
        line(&commands, evidence.to_hp_heal_handler_line),
        "static void Cmd_stockpiletohpheal(void)"
    );

    // Command enum (:139-141).
    assert_eq!(
        line(&command_ids, evidence.command_enum_stockpile_line).trim(),
        "B_SCR_OP_STOCKPILE,"
    );
    assert_eq!(
        line(&command_ids, evidence.command_enum_to_base_damage_line).trim(),
        "B_SCR_OP_STOCKPILETOBASEDAMAGE,"
    );
    assert_eq!(
        line(&command_ids, evidence.command_enum_to_hp_heal_line).trim(),
        "B_SCR_OP_STOCKPILETOHPHEAL,"
    );

    // String ids (:484-485, :488-489).
    assert_eq!(
        line(&string_ids, evidence.stockpiled_string_id_line).trim(),
        "#define B_MSG_STOCKPILED     0"
    );
    assert_eq!(
        line(&string_ids, evidence.cant_stockpile_string_id_line).trim(),
        "#define B_MSG_CANT_STOCKPILE 1"
    );
    assert_eq!(
        line(&string_ids, evidence.swallow_failed_string_id_line).trim(),
        "#define B_MSG_SWALLOW_FAILED  0"
    );
    assert_eq!(
        line(&string_ids, evidence.swallow_full_hp_string_id_line).trim(),
        "#define B_MSG_SWALLOW_FULL_HP 1"
    );

    // Macros (:730-742): stockpile is 1 byte/no operand; the other two are
    // .byte + .4byte (5 bytes) each.
    assert_eq!(
        line(&macros, evidence.macro_stockpile_declaration_line).trim(),
        ".macro stockpile"
    );
    assert_eq!(
        line(&macros, evidence.macro_to_base_damage_declaration_line).trim(),
        ".macro stockpiletobasedamage ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.macro_to_hp_heal_declaration_line).trim(),
        ".macro stockpiletohpheal ptr:req"
    );
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_TO_BASE_DAMAGE_ENCODED_WIDTH_BYTES,
        5
    );
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_TO_HP_HEAL_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_FAILURE_POINTER_WIDTH_BYTES, 4);

    // Concrete call sites (:2087, :2100, :2114, :2123): FOUR concrete starts
    // across the three opcodes (0x86 has two).
    let site = BATTLE_SCRIPT_STOCKPILE_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, site.stockpile_entry_label_line),
        "BattleScript_EffectStockpile::"
    );
    assert_eq!(
        line(&scripts, site.stockpile_statement_line).trim(),
        "stockpile"
    );
    assert_eq!(
        line(&scripts, site.spit_up_entry_label_line),
        "BattleScript_EffectSpitUp::"
    );
    assert_eq!(
        line(&scripts, site.spit_up_statement_line).trim(),
        "stockpiletobasedamage BattleScript_SpitUpFail"
    );
    assert_eq!(
        line(&scripts, site.spit_up_fail_protect_entry_label_line),
        "BattleScript_SpitUpFailProtect::"
    );
    assert_eq!(
        line(&scripts, site.spit_up_fail_protect_statement_line).trim(),
        "stockpiletobasedamage BattleScript_SpitUpFail"
    );
    assert_eq!(
        line(&scripts, site.swallow_entry_label_line),
        "BattleScript_EffectSwallow::"
    );
    assert_eq!(
        line(&scripts, site.swallow_statement_line).trim(),
        "stockpiletohpheal BattleScript_SwallowFail"
    );
    assert_eq!(
        scripts.matches("\tstockpile\n").count(),
        1,
        "exactly one bare stockpile call site"
    );
    assert_eq!(
        scripts.matches("\tstockpiletobasedamage ").count(),
        2,
        "exactly two stockpiletobasedamage call sites"
    );
    assert_eq!(
        scripts.matches("\tstockpiletohpheal ").count(),
        1,
        "exactly one stockpiletohpheal call site"
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_CASES.len(), 40);
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_REGISTRATION_CASES.len(), 18);
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_SHA256,
        "e418402f91cc21b58f7cf602f1eb73a6f38e9307eeafe914e078ab36d3fed0d8"
    );
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_BYTES, 146_635);
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_VECTOR_GENERATOR_SHA256,
        "d0e8fcbf2ff82525be3d066dfaa3fa7a1ddef6661781482cd2625abd75204990"
    );
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_VECTOR_GENERATOR_BYTES, 39_731);

    let generated = include_bytes!("../src/battle_script_stockpile_vectors_gen.rs");
    assert_eq!(generated.len(), 247_550);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_stockpile_vectors_gen.rs"),
        "005a60e15c3af9a8fb09844e740c1cf7a6f5ad00a3183d8432c0f2cf17e90e43"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-stockpile-vectors.mjs")
        )
        .unwrap()
        .len(),
        39_731
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-stockpile-vectors.mjs"),
        "d0e8fcbf2ff82525be3d066dfaa3fa7a1ddef6661781482cd2625abd75204990"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptStockpileOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
