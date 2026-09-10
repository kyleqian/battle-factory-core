//! Independent source/macro/call-site and artifact-identity ratchets for the
//! side-status screen family. Behavioral differential replay lives in the
//! sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_set_side_status::*;
use factory_core::battle_script_set_side_status_vectors_gen::*;

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

fn source_body(source: &str, skip: usize, take: usize) -> String {
    source
        .lines()
        .skip(skip)
        .take(take)
        .collect::<Vec<_>>()
        .join("\n")
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

    assert_eq!(BATTLE_SCRIPT_SETREFLECT_OPCODE, 0x7e);
    assert_eq!(BATTLE_SCRIPT_SETREFLECT_OPCODE_NAME, "B_SCR_OP_SETREFLECT");
    assert_eq!(BATTLE_SCRIPT_SETREFLECT_DISPATCHER, "Cmd_setreflect");

    assert_eq!(BATTLE_SCRIPT_SETLIGHTSCREEN_OPCODE, 0x92);
    assert_eq!(
        BATTLE_SCRIPT_SETLIGHTSCREEN_OPCODE_NAME,
        "B_SCR_OP_SETLIGHTSCREEN"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETLIGHTSCREEN_DISPATCHER,
        "Cmd_setlightscreen"
    );

    assert_eq!(BATTLE_SCRIPT_SETMIST_OPCODE, 0x99);
    assert_eq!(BATTLE_SCRIPT_SETMIST_OPCODE_NAME, "B_SCR_OP_SETMIST");
    assert_eq!(BATTLE_SCRIPT_SETMIST_DISPATCHER, "Cmd_setmist");

    assert_eq!(BATTLE_SCRIPT_SETSAFEGUARD_OPCODE, 0xb8);
    assert_eq!(
        BATTLE_SCRIPT_SETSAFEGUARD_OPCODE_NAME,
        "B_SCR_OP_SETSAFEGUARD"
    );
    assert_eq!(BATTLE_SCRIPT_SETSAFEGUARD_DISPATCHER, "Cmd_setsafeguard");

    assert_eq!(BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_OPCODE, 0xee);
    assert_eq!(
        BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_OPCODE_NAME,
        "B_SCR_OP_REMOVELIGHTSCREENREFLECT"
    );
    assert_eq!(
        BATTLE_SCRIPT_REMOVELIGHTSCREENREFLECT_DISPATCHER,
        "Cmd_removelightscreenreflect"
    );

    // Forward declarations (:205, :225, :232, :263, :317).
    assert_eq!(line(&commands, 205), "static void Cmd_setreflect(void);");
    assert_eq!(
        line(&commands, 225),
        "static void Cmd_setlightscreen(void);"
    );
    assert_eq!(line(&commands, 232), "static void Cmd_setmist(void);");
    assert_eq!(line(&commands, 263), "static void Cmd_setsafeguard(void);");
    assert_eq!(
        line(&commands, 317),
        "static void Cmd_removelightscreenreflect(void);"
    );

    // Dispatch rows (:457 //0x7E, :477 //0x92, :484 //0x99, :515 //0xB8, :569 //0xEE).
    assert_eq!(
        line(&commands, 457).trim(),
        "[B_SCR_OP_SETREFLECT]                      = Cmd_setreflect,                              //0x7E"
    );
    assert_eq!(
        line(&commands, 477).trim(),
        "[B_SCR_OP_SETLIGHTSCREEN]                  = Cmd_setlightscreen,                          //0x92"
    );
    assert_eq!(
        line(&commands, 484).trim(),
        "[B_SCR_OP_SETMIST]                         = Cmd_setmist,                                 //0x99"
    );
    assert_eq!(
        line(&commands, 515).trim(),
        "[B_SCR_OP_SETSAFEGUARD]                    = Cmd_setsafeguard,                            //0xB8"
    );
    assert_eq!(
        line(&commands, 569).trim(),
        "[B_SCR_OP_REMOVELIGHTSCREENREFLECT]        = Cmd_removelightscreenreflect,                //0xEE"
    );

    // Handler bodies (:6697-6716, :7468-7488, :7732-7747, :8652-8668, :9883-9903).
    assert_eq!(line(&commands, 6697), "static void Cmd_setreflect(void)");
    assert_eq!(line(&commands, 6716), "}");
    let reflect_body = source_body(&commands, 6696, 20);
    assert!(reflect_body
        .contains("if (gSideStatuses[GET_BATTLER_SIDE(gBattlerAttacker)] & SIDE_STATUS_REFLECT)"));
    assert!(
        reflect_body.contains("gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].reflectTimer = 5;")
    );
    assert!(reflect_body.contains(
        "gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].reflectBattlerId = gBattlerAttacker;"
    ));

    assert_eq!(
        line(&commands, 7468),
        "static void Cmd_setlightscreen(void)"
    );
    assert_eq!(line(&commands, 7488), "}");
    let lightscreen_body = source_body(&commands, 7467, 21);
    assert!(lightscreen_body.contains(
        "if (gSideStatuses[GET_BATTLER_SIDE(gBattlerAttacker)] & SIDE_STATUS_LIGHTSCREEN)"
    ));
    assert!(lightscreen_body
        .contains("gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].lightscreenTimer = 5;"));

    assert_eq!(line(&commands, 7732), "static void Cmd_setmist(void)");
    assert_eq!(line(&commands, 7747), "}");
    let mist_body = source_body(&commands, 7731, 16);
    assert!(mist_body.contains("if (gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].mistTimer)"));
    assert!(mist_body.contains("gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].mistTimer = 5;"));
    assert!(mist_body
        .contains("gSideStatuses[GET_BATTLER_SIDE(gBattlerAttacker)] |= SIDE_STATUS_MIST;"));

    assert_eq!(line(&commands, 8652), "static void Cmd_setsafeguard(void)");
    assert_eq!(line(&commands, 8668), "}");
    let safeguard_body = source_body(&commands, 8651, 17);
    assert!(safeguard_body.contains(
        "if (gSideStatuses[GET_BATTLER_SIDE(gBattlerAttacker)] & SIDE_STATUS_SAFEGUARD)"
    ));
    assert!(safeguard_body
        .contains("gSideTimers[GET_BATTLER_SIDE(gBattlerAttacker)].safeguardTimer = 5;"));

    assert_eq!(
        line(&commands, 9883),
        "static void Cmd_removelightscreenreflect(void)"
    );
    assert_eq!(line(&commands, 9903), "}");
    let remove_body = source_body(&commands, 9882, 21);
    assert!(remove_body
        .contains("u8 opposingSide = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker));"));
    assert!(remove_body.contains(
        "if (gSideTimers[opposingSide].reflectTimer || gSideTimers[opposingSide].lightscreenTimer)"
    ));
    assert!(remove_body.contains("gBattleScripting.animTurn = 1;"));
    assert!(remove_body.contains("gBattleScripting.animTargetsHit = 1;"));
    assert!(remove_body.contains("gBattleScripting.animTurn = 0;"));
    assert!(remove_body.contains("gBattleScripting.animTargetsHit = 0;"));

    // Opcode enum positions (:132, :152, :159, :190, :244).
    assert_eq!(line(&command_ids, 132).trim(), "B_SCR_OP_SETREFLECT,");
    assert_eq!(line(&command_ids, 152).trim(), "B_SCR_OP_SETLIGHTSCREEN,");
    assert_eq!(line(&command_ids, 159).trim(), "B_SCR_OP_SETMIST,");
    assert_eq!(line(&command_ids, 190).trim(), "B_SCR_OP_SETSAFEGUARD,");
    assert_eq!(
        line(&command_ids, 244).trim(),
        "B_SCR_OP_REMOVELIGHTSCREENREFLECT,"
    );

    // Macros (:698, :789, :820, :959, :1209): each a single .byte, no operand.
    assert_eq!(line(&macros, 698).trim(), ".macro setreflect");
    assert_eq!(line(&macros, 699).trim(), ".byte B_SCR_OP_SETREFLECT");
    assert_eq!(line(&macros, 789).trim(), ".macro setlightscreen");
    assert_eq!(line(&macros, 790).trim(), ".byte B_SCR_OP_SETLIGHTSCREEN");
    assert_eq!(line(&macros, 820).trim(), ".macro setmist");
    assert_eq!(line(&macros, 821).trim(), ".byte B_SCR_OP_SETMIST");
    assert_eq!(line(&macros, 959).trim(), ".macro setsafeguard");
    assert_eq!(line(&macros, 960).trim(), ".byte B_SCR_OP_SETSAFEGUARD");
    assert_eq!(
        line(&macros, 1209).trim(),
        ".macro removelightscreenreflect"
    );
    assert_eq!(
        line(&macros, 1210).trim(),
        ".byte B_SCR_OP_REMOVELIGHTSCREENREFLECT"
    );

    // Exactly one bare call site each (:978, :728, :878, :1676, :2423).
    assert_eq!(line(&scripts, 978).trim(), "setreflect");
    assert_eq!(line(&scripts, 728).trim(), "setlightscreen");
    assert_eq!(line(&scripts, 878).trim(), "setmist");
    assert_eq!(line(&scripts, 1676).trim(), "setsafeguard");
    assert_eq!(line(&scripts, 2423).trim(), "removelightscreenreflect");
    let count_exact = |needle: &str| {
        scripts
            .lines()
            .filter(|candidate| candidate.trim() == needle)
            .count()
    };
    assert_eq!(count_exact("setreflect"), 1);
    assert_eq!(count_exact("setlightscreen"), 1);
    assert_eq!(count_exact("setmist"), 1);
    assert_eq!(count_exact("setsafeguard"), 1);
    assert_eq!(count_exact("removelightscreenreflect"), 1);

    // SIDE_STATUS_* bit constants (:210, :211, :214, :216).
    assert_eq!(
        line(&battle_h, 210).trim(),
        "#define SIDE_STATUS_REFLECT          (1 << 0)"
    );
    assert_eq!(
        line(&battle_h, 211).trim(),
        "#define SIDE_STATUS_LIGHTSCREEN      (1 << 1)"
    );
    assert_eq!(
        line(&battle_h, 214).trim(),
        "#define SIDE_STATUS_SAFEGUARD        (1 << 5)"
    );
    assert_eq!(
        line(&battle_h, 216).trim(),
        "#define SIDE_STATUS_MIST             (1 << 8)"
    );
    assert_eq!(BATTLE_SCRIPT_SIDE_STATUS_REFLECT, 1 << 0);
    assert_eq!(BATTLE_SCRIPT_SIDE_STATUS_LIGHTSCREEN, 1 << 1);
    assert_eq!(BATTLE_SCRIPT_SIDE_STATUS_SAFEGUARD, 1 << 5);
    assert_eq!(BATTLE_SCRIPT_SIDE_STATUS_MIST, 1 << 8);
    assert_eq!(BATTLE_SCRIPT_MOVE_RESULT_MISSED, 1 << 0);
    assert_eq!(BATTLE_SCRIPT_MOVE_RESULT_FAILED, 1 << 5);

    // B_MSG_* chooser indices (battle_message.c:952-1051 row order).
    assert_eq!(BATTLE_SCRIPT_B_MSG_SIDE_STATUS_FAILED, 0);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SET_REFLECT_SINGLE, 1);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SET_LIGHTSCREEN_SINGLE, 3);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SET_SAFEGUARD, 5);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SET_MIST, 0);
    assert_eq!(BATTLE_SCRIPT_B_MSG_MIST_FAILED, 1);
    let message_c = source("reference/pokeemerald/src/battle_message.c");
    assert!(message_c.contains("[B_MSG_SIDE_STATUS_FAILED]     = STRINGID_BUTITFAILED,"));
    assert!(message_c.contains("[B_MSG_SET_REFLECT_SINGLE]     = STRINGID_PKMNRAISEDDEF,"));
    assert!(message_c.contains("[B_MSG_SET_LIGHTSCREEN_SINGLE] = STRINGID_PKMNRAISEDSPDEF,"));
    assert!(message_c.contains("[B_MSG_SET_SAFEGUARD]          = STRINGID_PKMNCOVEREDBYVEIL,"));
    assert!(message_c.contains("[B_MSG_SET_MIST]    = STRINGID_PKMNSHROUDEDINMIST,"));
    assert!(message_c.contains("[B_MSG_MIST_FAILED] = STRINGID_BUTITFAILED"));
}

#[test]
fn shared_error_texts_are_exact() {
    assert_eq!(
        BattleScriptSetSideStatusError::MissingAttackerRole.to_string(),
        "Cmd_set<sidestatus> requires an attacker role"
    );
    assert_eq!(
        BattleScriptSetSideStatusRegistrationError::WrongConcreteStartCount {
            opcode_name: "B_SCR_OP_SETMIST",
            count: 3,
        }
        .to_string(),
        "B_SCR_OP_SETMIST requires exactly 1 concrete start, got 3"
    );
    assert_eq!(
        BattleScriptSetSideStatusRegistrationError::InvalidShape {
            opcode_name: "B_SCR_OP_SETSAFEGUARD",
            program_counter: 42,
        }
        .to_string(),
        "invalid B_SCR_OP_SETSAFEGUARD shape at program counter 42"
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_SET_SIDE_STATUS_CASES.len(), 30);
    assert_eq!(BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_CASES.len(), 6);
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_CORPUS_SHA256,
        "323e4c45348f7a5d3ea5122a227da640ae01171b8dd0d3ad92c35c790aac6208"
    );
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_GENERATOR_SHA256,
        "210ed992fe04ae2e86eaba7e2db89aec5450837db38327d73550dca595e3f15d"
    );
    assert_eq!(BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_GENERATOR_BYTES, 26_080);

    let generated = include_bytes!("../src/battle_script_set_side_status_vectors_gen.rs");
    assert_eq!(generated.len(), 411_700);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_set_side_status_vectors_gen.rs"),
        "0cf9d94f7353bcfb15fa6f2e154c8b5d8517560769dcac131e4a4ad81e48c28d"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-set-side-status-vectors.mjs")
        )
        .unwrap()
        .len(),
        26_080
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-set-side-status-vectors.mjs"),
        "210ed992fe04ae2e86eaba7e2db89aec5450837db38327d73550dca595e3f15d"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptSetSideStatusOpcode.ts via"));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
