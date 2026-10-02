//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_setcharge` and `Cmd_settypebasedhalvers`. Behavioral
//! differential replay lives in the sibling vector test, so canonical
//! TypeScript cannot substitute for source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_chargesport::*;
use factory_core::battle_script_chargesport_vectors_gen::*;
use factory_core::gen_tables;

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
fn charge_dispatch_forward_declaration_and_handler_body_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_CHARGESPORT_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.charge_opcode_name, "B_SCR_OP_SETCHARGE");
    assert_eq!(evidence.charge_opcode_id, 0xcb);
    assert_eq!(evidence.charge_dispatcher, "Cmd_setcharge");
    assert_eq!(
        line(&commands, evidence.charge_dispatch_line).trim(),
        "[B_SCR_OP_SETCHARGE]                       = Cmd_setcharge,                               //0xCB"
    );
    assert_eq!(
        line(&commands, evidence.charge_forward_decl_line).trim(),
        "static void Cmd_setcharge(void);"
    );
    assert_eq!(
        line(&commands, evidence.charge_handler_line),
        "static void Cmd_setcharge(void)"
    );
    assert_eq!(
        line(&commands, evidence.charge_status3_write_line).trim(),
        "gStatuses3[gBattlerAttacker] |= STATUS3_CHARGED_UP;"
    );
    assert_eq!(
        line(&commands, evidence.charge_timer_write_line).trim(),
        "gDisableStructs[gBattlerAttacker].chargeTimer = 2;"
    );
    assert_eq!(
        line(&commands, evidence.charge_timer_start_write_line).trim(),
        "gDisableStructs[gBattlerAttacker].chargeTimerStartValue = 2;"
    );
    assert_eq!(
        line(&commands, evidence.charge_advance_line).trim(),
        "gBattlescriptCurrInstr++;"
    );
}

#[test]
fn sport_dispatch_forward_declaration_and_handler_body_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_CHARGESPORT_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.sport_opcode_name, "B_SCR_OP_SETTYPEBASEDHALVERS");
    assert_eq!(evidence.sport_opcode_id, 0xe8);
    assert_eq!(evidence.sport_dispatcher, "Cmd_settypebasedhalvers");
    assert_eq!(
        line(&commands, evidence.sport_dispatch_line).trim(),
        "[B_SCR_OP_SETTYPEBASEDHALVERS]             = Cmd_settypebasedhalvers,                     //0xE8"
    );
    assert_eq!(
        line(&commands, evidence.sport_forward_decl_line).trim(),
        "static void Cmd_settypebasedhalvers(void);"
    );
    assert_eq!(
        line(&commands, evidence.sport_handler_line),
        "static void Cmd_settypebasedhalvers(void)"
    );
    assert_eq!(
        line(&commands, evidence.sport_effect_check_line).trim(),
        "if (gBattleMoves[gCurrentMove].effect == EFFECT_MUD_SPORT)"
    );
    assert_eq!(
        line(&commands, evidence.sport_mud_bit_test_line).trim(),
        "if (!(gStatuses3[gBattlerAttacker] & STATUS3_MUDSPORT))"
    );
    assert_eq!(
        line(&commands, evidence.sport_mud_write_line).trim(),
        "gStatuses3[gBattlerAttacker] |= STATUS3_MUDSPORT;"
    );
    assert_eq!(
        line(&commands, evidence.sport_mud_chooser_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_WEAKEN_ELECTRIC;"
    );
    assert_eq!(
        line(&commands, evidence.sport_water_bit_test_line).trim(),
        "if (!(gStatuses3[gBattlerAttacker] & STATUS3_WATERSPORT))"
    );
    assert_eq!(
        line(&commands, evidence.sport_water_write_line).trim(),
        "gStatuses3[gBattlerAttacker] |= STATUS3_WATERSPORT;"
    );
    assert_eq!(
        line(&commands, evidence.sport_water_chooser_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_WEAKEN_FIRE;"
    );
    assert_eq!(
        line(&commands, evidence.sport_worked_branch_line).trim(),
        "if (worked)"
    );
    assert_eq!(
        line(&commands, evidence.sport_advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
    assert_eq!(
        line(&commands, evidence.sport_jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
}

#[test]
fn macro_declarations_and_encoded_widths_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_CHARGESPORT_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.charge_declaration_line).trim(),
        ".macro setcharge"
    );
    assert_eq!(
        line(&macros, evidence.charge_opcode_line).trim(),
        ".byte B_SCR_OP_SETCHARGE"
    );
    assert_eq!(evidence.charge_encoded_width_bytes, 1);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_CHARGE_ENCODED_WIDTH_BYTES, 1);

    assert_eq!(
        line(&macros, evidence.sport_declaration_line).trim(),
        ".macro settypebasedhalvers ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.sport_opcode_line).trim(),
        ".byte B_SCR_OP_SETTYPEBASEDHALVERS"
    );
    assert_eq!(
        line(&macros, evidence.sport_pointer_line).trim(),
        r".4byte \ptr"
    );
    assert_eq!(evidence.sport_encoded_width_bytes, 5);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_SPORT_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_SPORT_OPERAND_WIDTH_BYTES, 4);
}

#[test]
fn call_sites_and_shared_sport_labels_are_exact() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_CHARGESPORT_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.charge_entry_label, "BattleScript_EffectCharge");
    assert_eq!(
        line(&scripts, evidence.charge_entry_label_line),
        "BattleScript_EffectCharge::"
    );
    assert_eq!(
        line(&scripts, evidence.charge_statement_line).trim(),
        "setcharge"
    );
    assert_eq!(
        scripts.matches("\tsetcharge\n").count(),
        1,
        "charge call site must be unique"
    );
    assert_eq!(evidence.charge_instruction_program_counter, 1622);

    assert_eq!(
        evidence.sport_mud_entry_label,
        "BattleScript_EffectMudSport"
    );
    assert_eq!(
        line(&scripts, evidence.sport_mud_entry_label_line),
        "BattleScript_EffectMudSport::"
    );
    assert_eq!(
        evidence.sport_water_entry_label,
        "BattleScript_EffectWaterSport"
    );
    assert_eq!(
        line(&scripts, evidence.sport_water_entry_label_line),
        "BattleScript_EffectWaterSport::"
    );
    assert_eq!(
        line(&scripts, evidence.sport_statement_line).trim(),
        "settypebasedhalvers BattleScript_ButItFailed"
    );
    assert_eq!(
        scripts.matches("\tsettypebasedhalvers ").count(),
        1,
        "sport call site must be unique"
    );
    assert_eq!(evidence.sport_instruction_program_counter, 1885);
    assert_eq!(
        evidence.sport_failure_target_expression,
        "BattleScript_ButItFailed"
    );
    assert_eq!(evidence.sport_failure_target_program_counter, 1434);
}

#[test]
fn source_constants_are_exact() {
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let move_effects = source("reference/pokeemerald/include/constants/battle_move_effects.h");
    let string_ids = source("reference/pokeemerald/include/constants/battle_string_ids.h");
    let battle_h = source("reference/pokeemerald/include/battle.h");
    let script_commands_h =
        source("reference/pokeemerald/include/constants/battle_script_commands.h");

    assert_eq!(
        line(&battle_constants, 166).trim(),
        "#define STATUS3_CHARGED_UP              (1 << 9)"
    );
    assert_eq!(
        line(&battle_constants, 173).trim(),
        "#define STATUS3_MUDSPORT                (1 << 16)"
    );
    assert_eq!(
        line(&battle_constants, 174).trim(),
        "#define STATUS3_WATERSPORT              (1 << 17)"
    );
    assert_eq!(
        line(&move_effects, 205).trim(),
        "#define EFFECT_MUD_SPORT 201"
    );
    assert_eq!(
        line(&move_effects, 214).trim(),
        "#define EFFECT_WATER_SPORT 210"
    );
    assert_eq!(
        line(&string_ids, 528).trim(),
        "#define B_MSG_WEAKEN_ELECTRIC 0"
    );
    assert_eq!(
        line(&string_ids, 529).trim(),
        "#define B_MSG_WEAKEN_FIRE     1"
    );
    assert_eq!(line(&battle_h, 89).trim(), "u8 chargeTimer:4;");
    assert_eq!(line(&battle_h, 90).trim(), "u8 chargeTimerStartValue:4;");
    assert_eq!(line(&script_commands_h, 209).trim(), "B_SCR_OP_SETCHARGE,");
    assert_eq!(
        line(&script_commands_h, 238).trim(),
        "B_SCR_OP_SETTYPEBASEDHALVERS,"
    );

    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP, 1 << 9);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT, 1 << 16);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT, 1 << 17);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT, 201);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT, 210);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_ELECTRIC, 0);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_FIRE, 1);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE, 0xcb);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE, 0xe8);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_CONCRETE_START_COUNT, 1);
}

/// Confirms the move ids the generator's corpus grid asserts against, against
/// the pinned generated move table (mirrors `src/data/gen/moves.json`, which
/// the generator independently checked to name move 300 MUD SPORT and 346
/// WATER SPORT).
#[test]
fn generated_move_table_agrees_with_ts_source_for_the_two_sport_moves() {
    assert_eq!(
        gen_tables::MOVES[300].effect,
        BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT,
        "move 300 must be MUD SPORT"
    );
    assert_eq!(
        gen_tables::MOVES[346].effect,
        BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT,
        "move 346 must be WATER SPORT"
    );
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_CASES.len(), 211);
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_CASES.len(), 14);
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_SHA256,
        "b077c122b735d4761232035216052054a88b7bd4b354ec7e01a7ed97b8e73deb"
    );
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_BYTES, 214_946);
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_VECTOR_GENERATOR_SHA256,
        "d841de568134005bbc648c110df328b802e547df5000f357ab1f2edb80b64792"
    );
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_VECTOR_GENERATOR_BYTES, 32_774);

    let generated = include_bytes!("../src/battle_script_chargesport_vectors_gen.rs");
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_chargesport_vectors_gen.rs"),
        "25a26a55199bcdccb99c6121a97b3bc5cfb341b581b305834bbaecb3c8d13daa"
    );
    assert_eq!(generated.len(), 538_477);
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-chargesport-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        32_774
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-chargesport-vectors.mjs"),
        "d841de568134005bbc648c110df328b802e547df5000f357ab1f2edb80b64792"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptChargeSportOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-chargesport-vectors.mjs."));
}
