//! Independent source/macro/call-site and artifact-identity ratchets for
//! Future Sight/Doom Desire's damage stash. Behavioral differential replay
//! lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_trysetfutureattack::*;
use factory_core::battle_script_trysetfutureattack_vectors_gen::*;

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
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_h = source("reference/pokeemerald/include/battle.h");
    let battle_constants_h = source("reference/pokeemerald/include/constants/battle.h");
    let moves_h = source("reference/pokeemerald/include/constants/moves.h");
    let strings_h = source("reference/pokeemerald/include/constants/battle_string_ids.h");
    let evidence = BATTLE_SCRIPT_TRYSETFUTUREATTACK_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME,
        "B_SCR_OP_TRYSETFUTUREATTACK"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE, 0xc3);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER,
        "Cmd_trysetfutureattack"
    );
    assert_eq!(
        evidence.opcode_name,
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE_NAME
    );
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_TRYSETFUTUREATTACK_OPCODE);
    assert_eq!(
        evidence.dispatcher,
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_DISPATCHER
    );

    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYSETFUTUREATTACK]              = Cmd_trysetfutureattack,                      //0xC3"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_trysetfutureattack(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_trysetfutureattack(void)"
    );
    assert_eq!(
        line(&commands, evidence.counter_guard_line).trim(),
        "if (gWishFutureKnock.futureSightCounter[gBattlerTarget] != 0)"
    );
    assert_eq!(
        line(&commands, evidence.side_status_write_line).trim(),
        "gSideStatuses[GET_BATTLER_SIDE(gBattlerTarget)] |= SIDE_STATUS_FUTUREATTACK;"
    );
    assert_eq!(
        line(&commands, evidence.future_sight_move_write_line).trim(),
        "gWishFutureKnock.futureSightMove[gBattlerTarget] = gCurrentMove;"
    );
    assert_eq!(
        line(&commands, evidence.future_sight_attacker_write_line).trim(),
        "gWishFutureKnock.futureSightAttacker[gBattlerTarget] = gBattlerAttacker;"
    );
    assert_eq!(
        line(&commands, evidence.future_sight_counter_write_line).trim(),
        "gWishFutureKnock.futureSightCounter[gBattlerTarget] = 3;"
    );
    assert!(line(&commands, evidence.calculate_base_damage_call_line)
        .trim()
        .starts_with("gWishFutureKnock.futureSightDmg[gBattlerTarget] = CalculateBaseDamage("));
    assert_eq!(
        line(&commands, evidence.helping_hand_line).trim(),
        "gWishFutureKnock.futureSightDmg[gBattlerTarget] = gWishFutureKnock.futureSightDmg[gBattlerTarget] * 15 / 10;"
    );
    assert_eq!(
        line(&commands, evidence.multistring_doom_desire_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_DOOM_DESIRE;"
    );
    assert_eq!(
        line(&commands, evidence.multistring_future_sight_line).trim(),
        "gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_FUTURE_SIGHT;"
    );
    assert_eq!(
        line(&commands, evidence.plus_five_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );

    let macro_evidence = BATTLE_SCRIPT_TRYSETFUTUREATTACK_MACRO_EVIDENCE;
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_FAILURE_POINTER_WIDTH_BYTES,
        4
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(macro_evidence.encoded_width_bytes, 5);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro trysetfutureattack ptr:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYSETFUTUREATTACK"
    );
    assert_eq!(
        line(&macros, macro_evidence.pointer_line).trim(),
        r".4byte \ptr"
    );

    let site = BATTLE_SCRIPT_TRYSETFUTUREATTACK_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, site.entry_label_line),
        "BattleScript_EffectFutureSight::"
    );
    assert_eq!(
        line(&scripts, site.statement_line).trim(),
        "trysetfutureattack BattleScript_ButItFailed"
    );
    assert_eq!(site.instruction_program_counter, 1304);
    assert_eq!(site.failure_target_expression, "BattleScript_ButItFailed");
    assert_eq!(site.failure_target_program_counter, 1434);
    assert_eq!(
        scripts.matches("\ttrysetfutureattack ").count(),
        1,
        "exactly one concrete trysetfutureattack call site"
    );

    assert_eq!(
        line(&battle_constants_h, 215).trim(),
        "#define SIDE_STATUS_FUTUREATTACK     (1 << 6)"
    );
    assert_eq!(line(&moves_h, 252).trim(), "#define MOVE_FUTURE_SIGHT 248");
    assert_eq!(line(&moves_h, 357).trim(), "#define MOVE_DOOM_DESIRE 353");
    assert_eq!(line(&strings_h, 519).trim(), "#define B_MSG_FUTURE_SIGHT 0");
    assert_eq!(line(&strings_h, 520).trim(), "#define B_MSG_DOOM_DESIRE  1");
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_FUTURE_SIGHT, 0);
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_B_MSG_DOOM_DESIRE, 1);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_SIDE_STATUS_FUTUREATTACK,
        1 << 6
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_FUTURE_SIGHT, 248);
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_MOVE_DOOM_DESIRE, 353);

    assert_eq!(
        line(&battle_h, 166).trim(),
        "u8 futureSightCounter[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(
        line(&battle_h, 167).trim(),
        "u8 futureSightAttacker[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(
        line(&battle_h, 168).trim(),
        "s32 futureSightDmg[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(
        line(&battle_h, 169).trim(),
        "u16 futureSightMove[MAX_BATTLERS_COUNT];"
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES.len(), 48);
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_CASES.len(), 8);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_CORPUS_SHA256,
        "ef1b6a8cf22adebb7e4d8dad9faa3f17cd16443e37a2866ec62f58173fd07da8"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_GENERATOR_SHA256,
        "3b77a51f3519fb359573edd5d3a9adcac20c6c2376d1d6595c36a4b3fceb4282"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_GENERATOR_BYTES,
        34_927
    );

    let generated = include_bytes!("../src/battle_script_trysetfutureattack_vectors_gen.rs");
    assert_eq!(generated.len(), 228_591);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trysetfutureattack_vectors_gen.rs"),
        "89b9d9b4c9c38a34b685715ea55e5dc4a771a1f37fec6ca3cc1620f6841b07c9"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trysetfutureattack-vectors.mjs")
        )
        .unwrap()
        .len(),
        34_927
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trysetfutureattack-vectors.mjs"),
        "3b77a51f3519fb359573edd5d3a9adcac20c6c2376d1d6595c36a4b3fceb4282"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrysetfutureattackOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
