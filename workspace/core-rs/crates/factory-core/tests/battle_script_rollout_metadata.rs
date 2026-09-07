//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_rolloutdamagecalculation` and its projected
//! `CancelMultiTurnMoves` helper. Behavioral differential replay lives in the
//! sibling vector test, so canonical TypeScript cannot substitute for source
//! evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_rolloutdamagecalculation::*;
use factory_core::battle_script_rolloutdamagecalculation_vectors_gen::*;

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
fn dispatch_forward_declaration_and_handler_body_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_ROLLOUT_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_ROLLOUTDAMAGECALCULATION");
    assert_eq!(evidence.opcode_id, 0xb3);
    assert_eq!(evidence.dispatcher, "Cmd_rolloutdamagecalculation");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_ROLLOUTDAMAGECALCULATION]        = Cmd_rolloutdamagecalculation,                //0xB3"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_rolloutdamagecalculation(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_rolloutdamagecalculation(void)"
    );
    assert_eq!(
        line(&commands, evidence.no_effect_check_line).trim(),
        "if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT)"
    );
    assert_eq!(
        line(&commands, evidence.cancel_call_line).trim(),
        "CancelMultiTurnMoves(gBattlerAttacker);"
    );
    assert_eq!(
        line(&commands, evidence.move_missed_pause_jump_line).trim(),
        "gBattlescriptCurrInstr = BattleScript_MoveMissedPause;"
    );
    assert_eq!(
        line(&commands, evidence.first_hit_check_line).trim(),
        "if (!(gBattleMons[gBattlerAttacker].status2 & STATUS2_MULTIPLETURNS)) // first hit"
    );
    assert_eq!(
        line(&commands, evidence.set_rollout_timer_line).trim(),
        "gDisableStructs[gBattlerAttacker].rolloutTimer = 5;"
    );
    assert_eq!(
        line(&commands, evidence.set_start_value_line).trim(),
        "gDisableStructs[gBattlerAttacker].rolloutTimerStartValue = 5;"
    );
    assert_eq!(
        line(&commands, evidence.set_multipleturns_line).trim(),
        "gBattleMons[gBattlerAttacker].status2 |= STATUS2_MULTIPLETURNS;"
    );
    assert_eq!(
        line(&commands, evidence.set_locked_move_line).trim(),
        "gLockedMoves[gBattlerAttacker] = gCurrentMove;"
    );
    assert_eq!(
        line(&commands, evidence.decrement_and_last_hit_check_line).trim(),
        "if (--gDisableStructs[gBattlerAttacker].rolloutTimer == 0) // last hit"
    );
    assert_eq!(
        line(&commands, evidence.clear_multipleturns_line).trim(),
        "gBattleMons[gBattlerAttacker].status2 &= ~STATUS2_MULTIPLETURNS;"
    );
    assert_eq!(
        line(&commands, evidence.set_dynamic_power_line).trim(),
        "gDynamicBasePower = gBattleMoves[gCurrentMove].power;"
    );
    assert_eq!(
        line(&commands, evidence.power_loop_line).trim(),
        "for (i = 1; i < (5 - gDisableStructs[gBattlerAttacker].rolloutTimer); i++)"
    );
    assert_eq!(
        line(&commands, evidence.power_loop_body_line).trim(),
        "gDynamicBasePower *= 2;"
    );
    assert_eq!(
        line(&commands, evidence.defense_curl_check_line).trim(),
        "if (gBattleMons[gBattlerAttacker].status2 & STATUS2_DEFENSE_CURL)"
    );
    assert_eq!(
        line(&commands, evidence.defense_curl_double_line).trim(),
        "gDynamicBasePower *= 2;"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr++;"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_ROLLOUT_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro rolloutdamagecalculation"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_ROLLOUTDAMAGECALCULATION"
    );
    assert_eq!(line(&macros, evidence.end_line).trim(), ".endm");
    assert_eq!(evidence.encoded_width_bytes, 1);
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_ENCODED_WIDTH_BYTES, 1);
}

#[test]
fn sole_call_site_is_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_ROLLOUT_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.entry_label, "BattleScript_EffectRollout");
    assert_eq!(
        line(&scripts, evidence.entry_label_line),
        "BattleScript_EffectRollout::"
    );
    assert_eq!(evidence.hit_label, "BattleScript_RolloutHit");
    assert_eq!(
        line(&scripts, evidence.hit_label_line),
        "BattleScript_RolloutHit::"
    );
    assert_eq!(
        line(&scripts, evidence.statement_line).trim(),
        "rolloutdamagecalculation"
    );
    assert_eq!(
        scripts.matches("\trolloutdamagecalculation\n").count(),
        1,
        "call site must be unique"
    );
}

#[test]
fn cancel_multi_turn_moves_body_is_exact() {
    let battle_util = source("reference/pokeemerald/src/battle_util.c");
    let evidence = BATTLE_SCRIPT_ROLLOUT_CANCEL_MULTI_TURN_MOVES_EVIDENCE;

    assert_eq!(
        line(&battle_util, evidence.handler_line),
        "void CancelMultiTurnMoves(u8 battler)"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_multipleturns_line).trim(),
        "gBattleMons[battler].status2 &= ~STATUS2_MULTIPLETURNS;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_lock_confuse_line).trim(),
        "gBattleMons[battler].status2 &= ~STATUS2_LOCK_CONFUSE;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_uproar_line).trim(),
        "gBattleMons[battler].status2 &= ~STATUS2_UPROAR;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_bide_line).trim(),
        "gBattleMons[battler].status2 &= ~STATUS2_BIDE;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_semi_invulnerable_line).trim(),
        "gStatuses3[battler] &= ~STATUS3_SEMI_INVULNERABLE;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_rollout_timer_line).trim(),
        "gDisableStructs[battler].rolloutTimer = 0;"
    );
    assert_eq!(
        line(&battle_util, evidence.clear_fury_cutter_counter_line).trim(),
        "gDisableStructs[battler].furyCutterCounter = 0;"
    );
}

#[test]
fn source_constants_are_exact() {
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let opcode_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");

    assert_eq!(
        line(&battle_constants, 132).trim(),
        "#define STATUS2_UPROAR                (1 << 4 | 1 << 5 | 1 << 6)"
    );
    assert_eq!(
        line(&battle_constants, 135).trim(),
        "#define STATUS2_BIDE                  (1 << 8 | 1 << 9)"
    );
    assert_eq!(
        line(&battle_constants, 137).trim(),
        "#define STATUS2_LOCK_CONFUSE          (1 << 10 | 1 << 11) // e.g. Thrash"
    );
    assert_eq!(
        line(&battle_constants, 139).trim(),
        "#define STATUS2_MULTIPLETURNS         (1 << 12)"
    );
    assert_eq!(
        line(&battle_constants, 154).trim(),
        "#define STATUS2_DEFENSE_CURL          (1 << 30)"
    );
    assert_eq!(
        line(&battle_constants, 163).trim(),
        "#define STATUS3_ON_AIR                  (1 << 6)"
    );
    assert_eq!(
        line(&battle_constants, 164).trim(),
        "#define STATUS3_UNDERGROUND             (1 << 7)"
    );
    assert_eq!(
        line(&battle_constants, 175).trim(),
        "#define STATUS3_UNDERWATER              (1 << 18)"
    );
    assert_eq!(
        line(&battle_constants, 178).trim(),
        "#define STATUS3_SEMI_INVULNERABLE       (STATUS3_UNDERGROUND | STATUS3_ON_AIR | STATUS3_UNDERWATER)"
    );
    assert_eq!(
        line(&opcode_header, 185).trim(),
        "B_SCR_OP_ROLLOUTDAMAGECALCULATION,"
    );

    assert_eq!(
        BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
        (1 << 0) | (1 << 3) | (1 << 5)
    );
    assert_eq!(BATTLE_SCRIPT_STATUS2_UPROAR, (1 << 4) | (1 << 5) | (1 << 6));
    assert_eq!(BATTLE_SCRIPT_STATUS2_BIDE, (1 << 8) | (1 << 9));
    assert_eq!(BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE, (1 << 10) | (1 << 11));
    assert_eq!(BATTLE_SCRIPT_STATUS2_MULTIPLETURNS, 1 << 12);
    assert_eq!(BATTLE_SCRIPT_STATUS2_DEFENSE_CURL, 1 << 30);
    assert_eq!(
        BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK,
        BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
            | BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE
            | BATTLE_SCRIPT_STATUS2_UPROAR
            | BATTLE_SCRIPT_STATUS2_BIDE
    );
    assert_eq!(BATTLE_SCRIPT_STATUS3_ON_AIR, 1 << 6);
    assert_eq!(BATTLE_SCRIPT_STATUS3_UNDERGROUND, 1 << 7);
    assert_eq!(BATTLE_SCRIPT_STATUS3_UNDERWATER, 1 << 18);
    assert_eq!(
        BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
        BATTLE_SCRIPT_STATUS3_UNDERGROUND
            | BATTLE_SCRIPT_STATUS3_ON_AIR
            | BATTLE_SCRIPT_STATUS3_UNDERWATER
    );
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_HIT_COUNT, 5);
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_OPCODE, 0xb3);
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_DISPATCHER,
        "Cmd_rolloutdamagecalculation"
    );
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_ENCODED_WIDTH_BYTES, 1);
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_CASES.len(), 87);
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_REGISTRATION_CASES.len(), 6);
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_SHA256,
        "8bb284f294f3877e6f5ab27f700592cc344e7f746226b48683b4b866223b8017"
    );
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_BYTES, 150_345);
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_VECTOR_GENERATOR_SHA256,
        "faec7431931cc0801b8e2b979cb297bc6d051c4669f309ab2e0925c29e026ae0"
    );
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_VECTOR_GENERATOR_BYTES, 31_200);

    let generated = include_bytes!("../src/battle_script_rolloutdamagecalculation_vectors_gen.rs");
    assert_eq!(generated.len(), 422_366);
    assert_eq!(
        sha256(
            "core-rs/crates/factory-core/src/battle_script_rolloutdamagecalculation_vectors_gen.rs"
        ),
        "996d8e061ece91cb7627be76f4a7d54334f509776f174ea8be999428d78e9ccf"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-rollout-vectors.mjs"))
            .expect("generator metadata")
            .len(),
        31_200
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-rollout-vectors.mjs"),
        "faec7431931cc0801b8e2b979cb297bc6d051c4669f309ab2e0925c29e026ae0"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptRolloutOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-rollout-vectors.mjs."));
}
