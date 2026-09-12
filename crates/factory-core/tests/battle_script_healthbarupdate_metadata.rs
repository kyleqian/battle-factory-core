//! Independent source/dispatch/macro/constants and artifact-identity
//! ratchets for `B_SCR_OP_HEALTHBARUPDATE`. Behavioral differential replay
//! lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_healthbarupdate::*;
use factory_core::battle_script_healthbarupdate_vectors_gen::*;

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
fn exact_opcode_dispatch_body_macro_and_header_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_HEALTHBARUPDATE_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
        "B_SCR_OP_HEALTHBARUPDATE"
    );
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE, 0x0b);
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_DISPATCHER,
        "Cmd_healthbarupdate"
    );

    assert_eq!(
        line(&command_ids, evidence.header_enum_line).trim(),
        "B_SCR_OP_HEALTHBARUPDATE,"
    );
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_HEALTHBARUPDATE]                 = Cmd_healthbarupdate,                         //0xB"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_healthbarupdate(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_healthbarupdate(void)"
    );
    assert_eq!(
        line(&commands, evidence.busy_check_line).trim(),
        "if (gBattleControllerExecFlags)"
    );
    assert_eq!(line(&commands, evidence.busy_return_line).trim(), "return;");
    assert_eq!(
        line(&commands, evidence.no_effect_check_line).trim(),
        "if (!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))"
    );
    assert_eq!(
        line(&commands, evidence.selector_read_line).trim(),
        "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert!(line(&commands, evidence.substitute_check_line).contains("STATUS2_SUBSTITUTE"));
    assert!(line(&commands, evidence.substitute_check_line).contains("HITMARKER_IGNORE_SUBSTITUTE"));
    assert_eq!(
        line(&commands, evidence.prepare_string_battle_line).trim(),
        "PrepareStringBattle(STRINGID_SUBSTITUTEDAMAGED, gActiveBattler);"
    );
    assert!(line(&commands, evidence.clamp_start_line).contains("s32 currDmg = gBattleMoveDamage;"));
    assert!(line(&commands, evidence.clamp_end_line).contains("healthValue = maxPossibleDmgValue;"));
    assert!(line(&commands, evidence.emit_health_bar_update_line)
        .contains("BtlController_EmitHealthBarUpdate"));
    assert!(line(&commands, evidence.mark_battler_line).contains("MarkBattlerForControllerExec"));
    assert!(line(&commands, evidence.player_mon_was_damaged_line)
        .contains("playerMonWasDamaged = TRUE"));
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 2;"
    );

    assert_eq!(
        line(&macros, evidence.macro_declaration_line).trim(),
        ".macro healthbarupdate battler:req"
    );
    assert_eq!(
        line(&macros, evidence.macro_opcode_line).trim(),
        ".byte B_SCR_OP_HEALTHBARUPDATE"
    );

    let attacker_sites = scripts
        .lines()
        .filter(|line| *line == "\thealthbarupdate BS_ATTACKER")
        .count();
    let target_sites = scripts
        .lines()
        .filter(|line| *line == "\thealthbarupdate BS_TARGET")
        .count();
    let fainted_sites = scripts
        .lines()
        .filter(|line| *line == "\thealthbarupdate BS_FAINTED")
        .count();
    assert_eq!(
        attacker_sites,
        BATTLE_SCRIPT_HEALTHBARUPDATE_BS_ATTACKER_SITE_COUNT
    );
    assert_eq!(
        target_sites,
        BATTLE_SCRIPT_HEALTHBARUPDATE_BS_TARGET_SITE_COUNT
    );
    assert_eq!(
        fainted_sites,
        BATTLE_SCRIPT_HEALTHBARUPDATE_BS_FAINTED_SITE_COUNT
    );
    assert_eq!(
        attacker_sites + target_sites + fainted_sites,
        BATTLE_SCRIPT_HEALTHBARUPDATE_CANONICAL_SITE_COUNT
    );
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_CANONICAL_SITE_COUNT, 41);
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_BS_ATTACKER_SITE_COUNT, 22);
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_BS_TARGET_SITE_COUNT, 18);
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_BS_FAINTED_SITE_COUNT, 1);

    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE,
        0x0100_0000
    );
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_HITMARKER_IGNORE_SUBSTITUTE,
        1 << 8
    );
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_MOVE_RESULT_NO_EFFECT,
        (1 << 0) | (1 << 3) | (1 << 5)
    );
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_MAX_HEALTH_VALUE, 10_000);
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_MESSAGE_ID,
        "STRINGID_SUBSTITUTEDAMAGED"
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_CASES.len(), 21);
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_REGISTRATION_CASES.len(), 2);
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_SHA256,
        "63e483f7cdbe793e6663b34979a3f0aeb5c10762639a2f25f2a56a1b4aee9d5d"
    );
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_BYTES, 14_814);

    let generated = include_bytes!("../src/battle_script_healthbarupdate_vectors_gen.rs");
    assert_eq!(generated.len(), 29_903);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_healthbarupdate_vectors_gen.rs"),
        "0eb2f4433905fd7aca22ab1d54bc6368ec441008da949be92af7174281446ee1"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs")
        )
        .unwrap()
        .len(),
        31_978
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs"),
        "fb815322ad1fc3f5d269a3323a35e8adece96ae7f6b0deeff2753e762dc311f8"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's"));
    assert!(generated_text.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs."
    ));
}
