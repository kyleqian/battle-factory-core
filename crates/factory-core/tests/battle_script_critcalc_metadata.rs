//! Independent source/macro/call-site and artifact-identity ratchets for
//! `B_SCR_OP_CRITCALC`. Behavioral differential replay lives in the sibling
//! test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_critcalc::*;
use factory_core::battle_script_critcalc_vectors_gen::*;

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

    assert_eq!(BATTLE_SCRIPT_CRITCALC_OPCODE, 0x04);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_OPCODE_NAME, "B_SCR_OP_CRITCALC");
    assert_eq!(BATTLE_SCRIPT_CRITCALC_DISPATCHER, "Cmd_critcalc");
    assert_eq!(BATTLE_SCRIPT_CRITCALC_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_STATUS2_FOCUS_ENERGY, 1 << 20);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_STATUS3_CANT_SCORE_A_CRIT, 1 << 15);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_WALLY_TUTORIAL, 1 << 9);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_FIRST_BATTLE, 1 << 4);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_ABILITY_BATTLE_ARMOR, 4);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_ABILITY_SHELL_ARMOR, 75);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_SPECIES_FARFETCHD, 83);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_SPECIES_CHANSEY, 113);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_RNG_REASON, "critcalc");

    // Forward declaration (:83).
    assert_eq!(line(&commands, 83), "static void Cmd_critcalc(void);");

    // Dispatch row (:335, //0x4).
    assert_eq!(
        line(&commands, 335).trim(),
        "[B_SCR_OP_CRITCALC]                        = Cmd_critcalc,                                //0x4"
    );

    // sCriticalHitChance (:606).
    assert_eq!(
        line(&commands, 606).trim(),
        "static const u16 sCriticalHitChance[] = {16, 8, 4, 3, 2};"
    );

    // Handler body (:1253-1288).
    assert_eq!(line(&commands, 1253), "static void Cmd_critcalc(void)");
    assert_eq!(line(&commands, 1254), "{");
    let handler_body: String = commands
        .lines()
        .skip(1252)
        .take(36)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(handler_body.contains("if (item == ITEM_ENIGMA_BERRY)"));
    assert!(handler_body.contains("holdEffect = gEnigmaBerries[gBattlerAttacker].holdEffect;"));
    assert!(handler_body.contains("holdEffect = GetItemHoldEffect(item);"));
    assert!(handler_body.contains("gPotentialItemEffectBattler = gBattlerAttacker;"));
    assert!(handler_body
        .contains("(gBattleMons[gBattlerAttacker].status2 & STATUS2_FOCUS_ENERGY) != 0)"));
    assert!(handler_body.contains("gBattleMoves[gCurrentMove].effect == EFFECT_HIGH_CRITICAL"));
    assert!(handler_body.contains("gBattleMoves[gCurrentMove].effect == EFFECT_SKY_ATTACK"));
    assert!(handler_body.contains("gBattleMoves[gCurrentMove].effect == EFFECT_BLAZE_KICK"));
    assert!(handler_body.contains("gBattleMoves[gCurrentMove].effect == EFFECT_POISON_TAIL"));
    assert!(handler_body.contains("holdEffect == HOLD_EFFECT_SCOPE_LENS"));
    assert!(handler_body.contains(
        "holdEffect == HOLD_EFFECT_LUCKY_PUNCH && gBattleMons[gBattlerAttacker].species == SPECIES_CHANSEY"
    ));
    assert!(handler_body.contains(
        "holdEffect == HOLD_EFFECT_STICK && gBattleMons[gBattlerAttacker].species == SPECIES_FARFETCHD"
    ));
    assert!(handler_body.contains("if (critChance >= ARRAY_COUNT(sCriticalHitChance))"));
    assert!(handler_body.contains("critChance = ARRAY_COUNT(sCriticalHitChance) - 1;"));
    assert!(handler_body.contains(
        "if ((gBattleMons[gBattlerTarget].ability != ABILITY_BATTLE_ARMOR && gBattleMons[gBattlerTarget].ability != ABILITY_SHELL_ARMOR)"
    ));
    assert!(handler_body.contains("&& !(gStatuses3[gBattlerAttacker] & STATUS3_CANT_SCORE_A_CRIT)"));
    assert!(handler_body.contains(
        "&& !(gBattleTypeFlags & (BATTLE_TYPE_WALLY_TUTORIAL | BATTLE_TYPE_FIRST_BATTLE))"
    ));
    assert!(handler_body.contains("&& !(Random() % sCriticalHitChance[critChance]))"));
    assert!(handler_body.contains("gCritMultiplier = 2;"));
    assert!(handler_body.contains("gCritMultiplier = 1;"));
    assert!(handler_body.contains("gBattlescriptCurrInstr++;"));
    assert_eq!(line(&commands, 1288), "}");

    // Opcode enum position (:10).
    assert_eq!(line(&command_ids, 10).trim(), "B_SCR_OP_CRITCALC,");

    // Macro (:20-22): a single .byte, no operand.
    assert_eq!(line(&macros, 20).trim(), ".macro critcalc");
    assert_eq!(line(&macros, 21).trim(), ".byte B_SCR_OP_CRITCALC");
    assert_eq!(line(&macros, 22).trim(), ".endm");

    // BATTLE_TYPE_FIRST_BATTLE (:63), BATTLE_TYPE_WALLY_TUTORIAL (:68).
    assert!(line(&battle_h, 63).contains("BATTLE_TYPE_FIRST_BATTLE"));
    assert!(line(&battle_h, 68).contains("BATTLE_TYPE_WALLY_TUTORIAL"));
    // STATUS2_FOCUS_ENERGY (:144), STATUS3_CANT_SCORE_A_CRIT (:172).
    assert!(line(&battle_h, 144).contains("STATUS2_FOCUS_ENERGY"));
    assert!(line(&battle_h, 172).contains("STATUS3_CANT_SCORE_A_CRIT"));

    // First concrete call site (:249), inside BattleScript_HitFromCritCalc.
    assert_eq!(line(&scripts, 249).trim(), "critcalc");

    // 11 concrete bare `critcalc` call sites across the committed program.
    let bare_critcalc_count = scripts
        .lines()
        .filter(|candidate| candidate.trim() == "critcalc")
        .count();
    assert_eq!(
        bare_critcalc_count, 11,
        "exactly 11 bare critcalc call sites"
    );
    assert_eq!(BATTLE_SCRIPT_CRITCALC_CONCRETE_CALL_SITE_COUNT, 11);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_CRITCALC_CASES.len(), 30);
    assert_eq!(BATTLE_SCRIPT_CRITCALC_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_SHA256,
        "6f79151fb416e38a6857f812310dd7819f81f59031acd0b31209325a4ba52b6e"
    );
    assert_eq!(BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_BYTES, 166_814);
    assert_eq!(
        BATTLE_SCRIPT_CRITCALC_VECTOR_GENERATOR_SHA256,
        "542899d9cebeeb123a9059321dab62d90df824b204dccffb8ca00a8f5871b0ab"
    );
    assert_eq!(BATTLE_SCRIPT_CRITCALC_VECTOR_GENERATOR_BYTES, 32_621);

    let generated = include_bytes!("../src/battle_script_critcalc_vectors_gen.rs");
    assert_eq!(generated.len(), 361_568);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_critcalc_vectors_gen.rs"),
        "f7147515702fa416b0834b125af03071a817acf9663947b26c770fb7fd645f56"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-critcalc-vectors.mjs"))
            .unwrap()
            .len(),
        32_621
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-critcalc-vectors.mjs"),
        "542899d9cebeeb123a9059321dab62d90df824b204dccffb8ca00a8f5871b0ab"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
