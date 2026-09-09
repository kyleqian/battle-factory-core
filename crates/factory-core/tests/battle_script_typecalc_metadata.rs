//! Independent source/macro/call-site and artifact-identity ratchets for
//! `B_SCR_OP_TYPECALC`. Behavioral differential replay lives in the sibling
//! test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_typecalc::*;
use factory_core::battle_script_typecalc_vectors_gen::*;

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
fn exact_opcode_dispatch_macro_and_call_site_lines_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");

    assert_eq!(BATTLE_SCRIPT_TYPECALC_OPCODE, 0x06);
    assert_eq!(BATTLE_SCRIPT_TYPECALC_OPCODE_NAME, "B_SCR_OP_TYPECALC");
    assert_eq!(BATTLE_SCRIPT_TYPECALC_DISPATCHER, "Cmd_typecalc");
    assert_eq!(BATTLE_SCRIPT_TYPECALC_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_TYPECALC_STATUS2_FORESIGHT, 1 << 29);
    assert_eq!(BATTLE_SCRIPT_TYPECALC_ABILITY_LEVITATE, 26);
    assert_eq!(BATTLE_SCRIPT_TYPECALC_ABILITY_WONDER_GUARD, 25);

    // Forward declaration (:85).
    assert_eq!(line(&commands, 85), "static void Cmd_typecalc(void);");

    // Dispatch row (:337, //0x6).
    assert_eq!(
        line(&commands, 337).trim(),
        "[B_SCR_OP_TYPECALC]                        = Cmd_typecalc,                                //0x6"
    );

    // Handler body (:1355-1420).
    assert_eq!(line(&commands, 1355), "static void Cmd_typecalc(void)");
    let handler_body: String = commands
        .lines()
        .skip(1354)
        .take(66)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(handler_body.contains("if (gCurrentMove == MOVE_STRUGGLE)"));
    assert!(handler_body.contains("GET_MOVE_TYPE(gCurrentMove, moveType);"));
    assert!(handler_body.contains("if (IS_BATTLER_OF_TYPE(gBattlerAttacker, moveType))"));
    assert!(handler_body.contains(
        "if (gBattleMons[gBattlerTarget].ability == ABILITY_LEVITATE && moveType == TYPE_GROUND)"
    ));
    assert!(handler_body.contains("gLastLandedMoves[gBattlerTarget] = 0;"));
    assert!(handler_body.contains("gLastHitByType[gBattlerTarget] = 0;"));
    assert!(handler_body.contains("gBattleCommunication[MISS_TYPE] = B_MSG_GROUND_MISS;"));
    assert!(handler_body.contains("if (TYPE_EFFECT_ATK_TYPE(i) == TYPE_FORESIGHT)"));
    assert!(handler_body.contains("if (gBattleMons[gBattlerTarget].status2 & STATUS2_FORESIGHT)"));
    assert!(handler_body.contains(
        "if (gBattleMons[gBattlerTarget].ability == ABILITY_WONDER_GUARD && AttacksThisTurn(gBattlerAttacker, gCurrentMove) == 2"
    ));
    assert!(handler_body.contains("gBattleCommunication[MISS_TYPE] = B_MSG_AVOIDED_DMG;"));

    // ModulateDmgByType (:1321-1326).
    assert!(commands
        .lines()
        .nth(1320)
        .unwrap()
        .contains("ModulateDmgByType"));

    // Opcode enum position (:12).
    assert_eq!(line(&command_ids, 12).trim(), "B_SCR_OP_TYPECALC,");

    // Macro (:28-30): a single .byte, no operand.
    assert_eq!(line(&macros, 28).trim(), ".macro typecalc");
    assert_eq!(line(&macros, 29).trim(), ".byte B_SCR_OP_TYPECALC");
    assert_eq!(line(&macros, 30).trim(), ".endm");

    // STATUS2_FORESIGHT (:153).
    assert!(line(&battle_h, 153).contains("STATUS2_FORESIGHT"));

    // First concrete call site (:251), inside BattleScript_HitFromCritCalc.
    assert_eq!(line(&scripts, 250).trim(), "damagecalc");
    assert_eq!(line(&scripts, 251).trim(), "typecalc");

    // 23 concrete bare `typecalc` call sites across the committed program.
    let bare_typecalc_count = scripts
        .lines()
        .filter(|candidate| candidate.trim() == "typecalc")
        .count();
    assert_eq!(
        bare_typecalc_count, 23,
        "exactly 23 bare typecalc call sites"
    );
    assert_eq!(BATTLE_SCRIPT_TYPECALC_CONCRETE_CALL_SITE_COUNT, 23);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TYPECALC_CASES.len(), 41);
    assert_eq!(BATTLE_SCRIPT_TYPECALC_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_SHA256,
        "881d1ffa7371bcd411ffb8cfb10eb0c49bd5151567538d7086eff9bc952d20d4"
    );
    assert_eq!(BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_BYTES, 97_873);
    assert_eq!(
        BATTLE_SCRIPT_TYPECALC_VECTOR_GENERATOR_SHA256,
        "c6bb13072593096640811eb41f79ffdc2cdbb437ded26ba8d0393d8e58a5b3e7"
    );
    assert_eq!(BATTLE_SCRIPT_TYPECALC_VECTOR_GENERATOR_BYTES, 31_076);

    let generated = include_bytes!("../src/battle_script_typecalc_vectors_gen.rs");
    assert_eq!(generated.len(), 261_390);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_typecalc_vectors_gen.rs"),
        "5ec06981598c13b65285bbe3d6ddf0c0f36e788f9d368729951fbd8d120ac2db"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-typecalc-vectors.mjs"))
            .unwrap()
            .len(),
        31_076
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-typecalc-vectors.mjs"),
        "c6bb13072593096640811eb41f79ffdc2cdbb437ded26ba8d0393d8e58a5b3e7"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
