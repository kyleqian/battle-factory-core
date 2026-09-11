//! Independent source/macro/call-site and artifact-identity ratchets for
//! `B_SCR_OP_ACCURACYCHECK`. M87 adds the full-formula source-line pins;
//! behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_accuracycheck::*;
use factory_core::battle_script_accuracycheck_vectors_gen::*;

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
        .args(["-c", &format!("sha256sum {} | cut -d ' ' -f 1", path)])
        .current_dir(workspace_root())
        .output()
        .expect("run sha256sum");
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
    let pokemon_h = source("reference/pokeemerald/include/constants/pokemon.h");
    let moves_h = source("reference/pokeemerald/include/constants/moves.h");
    let abilities_h = source("reference/pokeemerald/include/constants/abilities.h");
    let hold_effects_h = source("reference/pokeemerald/include/constants/hold_effects.h");
    let move_effects_h = source("reference/pokeemerald/include/constants/battle_move_effects.h");

    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_OPCODE, 0x01);
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
        "B_SCR_OP_ACCURACYCHECK"
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_DISPATCHER, "Cmd_accuracycheck");
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS,
        (1 << 3) | (1 << 4)
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR, 1 << 6);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND, 1 << 7);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER, 1 << 18);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED, 1 << 0);
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_DOESNT_AFFECT_FOE,
        1 << 3
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED, 1);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_MISSED, 0);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_ATK, 2);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_DMG, 3);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_GROUND_MISS, 4);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_FLAG_PROTECT_AFFECTED, 1 << 1);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_MOVE_FUTURE_SIGHT, 248);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_MOVE_DOOM_DESIRE, 353);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_MOVE_STRUGGLE, 165);

    // Forward declaration (:80).
    assert_eq!(line(&commands, 80), "static void Cmd_accuracycheck(void);");

    // Dispatch row (:332, //0x1).
    assert_eq!(
        line(&commands, 332).trim(),
        "[B_SCR_OP_ACCURACYCHECK]                   = Cmd_accuracycheck,                           //0x1"
    );

    // Handler body (:1099-1189); bypass branch (:1103-1113).
    assert_eq!(line(&commands, 1099), "static void Cmd_accuracycheck(void)");
    let handler_body: String = commands
        .lines()
        .skip(1098)
        .take(91)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(handler_body.contains("if (move == NO_ACC_CALC || move == NO_ACC_CALC_CHECK_LOCK_ON)"));
    assert!(handler_body.contains(
        "if (gStatuses3[gBattlerTarget] & STATUS3_ALWAYS_HITS && move == NO_ACC_CALC_CHECK_LOCK_ON && gDisableStructs[gBattlerTarget].battlerWithSureHit == gBattlerAttacker)"
    ));
    assert!(handler_body
        .contains("else if (gStatuses3[gBattlerTarget] & (STATUS3_ON_AIR | STATUS3_UNDERGROUND | STATUS3_UNDERWATER))"));
    assert!(handler_body.contains("else if (!JumpIfMoveAffectedByProtect(0))"));

    // DEFENDER_IS_PROTECTED (:57).
    assert_eq!(
        line(&commands, 57),
        "#define DEFENDER_IS_PROTECTED ((gProtectStructs[gBattlerTarget].protected) && (gBattleMoves[gCurrentMove].flags & FLAG_PROTECT_AFFECTED))"
    );

    // JumpIfMoveFailed (:1009-1025).
    assert_eq!(
        line(&commands, 1009),
        "static void JumpIfMoveFailed(u8 adder, u16 move)"
    );
    assert!(line(&commands, 1012).contains("if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT)"));
    assert!(line(&commands, 1014).contains("gLastLandedMoves[gBattlerTarget] = 0;"));
    assert!(line(&commands, 1015).contains("gLastHitByType[gBattlerTarget] = 0;"));

    // JumpIfMoveAffectedByProtect (:1041-1052).
    assert_eq!(
        line(&commands, 1041),
        "static bool8 JumpIfMoveAffectedByProtect(u16 move)"
    );

    // AccuracyCalcHelper (:1054-1097).
    assert_eq!(
        line(&commands, 1054),
        "static bool8 AccuracyCalcHelper(u16 move)"
    );

    // TrySetDestinyBondToHappen (:8285).
    assert!(line(&commands, 8285).contains("TrySetDestinyBondToHappen"));

    // Opcode enum position (:7).
    assert_eq!(line(&command_ids, 7).trim(), "B_SCR_OP_ACCURACYCHECK,");

    // Macro (:6-10): 4-byte fail label, 2-byte move.
    assert_eq!(
        line(&macros, 6).trim(),
        ".macro accuracycheck failPtr:req, move:req"
    );
    assert_eq!(line(&macros, 7).trim(), ".byte B_SCR_OP_ACCURACYCHECK");
    assert_eq!(line(&macros, 8).trim(), ".4byte \\failPtr");
    assert_eq!(line(&macros, 9).trim(), ".2byte \\move");
    assert_eq!(line(&macros, 10).trim(), ".endm");

    // STATUS3_* (:160/:163/:164/:175), MOVE_RESULT_* (:220/:223),
    // STATUS2_FORESIGHT (:153), STATUS1_FREEZE (:119),
    // HITMARKER_IGNORE_* (:193/:194/:195).
    assert!(line(&battle_h, 160).contains("STATUS3_ALWAYS_HITS"));
    assert!(line(&battle_h, 163).contains("STATUS3_ON_AIR"));
    assert!(line(&battle_h, 164).contains("STATUS3_UNDERGROUND"));
    assert!(line(&battle_h, 175).contains("STATUS3_UNDERWATER"));
    assert!(line(&battle_h, 220).contains("MOVE_RESULT_MISSED"));
    assert!(line(&battle_h, 223).contains("MOVE_RESULT_DOESNT_AFFECT_FOE"));
    assert!(line(&battle_h, 153).contains("STATUS2_FORESIGHT"));
    assert!(line(&battle_h, 119).contains("STATUS1_FREEZE"));
    assert!(line(&battle_h, 193).contains("HITMARKER_IGNORE_ON_AIR"));
    assert!(line(&battle_h, 194).contains("HITMARKER_IGNORE_UNDERGROUND"));
    assert!(line(&battle_h, 195).contains("HITMARKER_IGNORE_UNDERWATER"));

    // FLAG_PROTECT_AFFECTED (:209).
    assert_eq!(
        line(&pokemon_h, 209).trim(),
        "#define FLAG_PROTECT_AFFECTED       (1 << 1)"
    );

    // MOVE_FUTURE_SIGHT/MOVE_DOOM_DESIRE literals (:252/:357).
    assert_eq!(line(&moves_h, 252).trim(), "#define MOVE_FUTURE_SIGHT 248");
    assert_eq!(line(&moves_h, 357).trim(), "#define MOVE_DOOM_DESIRE 353");

    // Abilities: Volt Absorb(10)/Water Absorb(11)/Flash Fire(18)/Wonder Guard(25)/Levitate(26).
    assert!(line(&abilities_h, 14).contains("ABILITY_VOLT_ABSORB 10"));
    assert!(line(&abilities_h, 15).contains("ABILITY_WATER_ABSORB 11"));
    assert!(line(&abilities_h, 22).contains("ABILITY_FLASH_FIRE 18"));
    assert!(line(&abilities_h, 29).contains("ABILITY_WONDER_GUARD 25"));
    assert!(line(&abilities_h, 30).contains("ABILITY_LEVITATE 26"));

    // HOLD_EFFECT_EVASION_UP (:26).
    assert!(line(&hold_effects_h, 26).contains("HOLD_EFFECT_EVASION_UP"));

    // EFFECT_ALWAYS_HIT(17)/EFFECT_VITAL_THROW(78)/EFFECT_THUNDER(152).
    assert!(line(&move_effects_h, 21).contains("EFFECT_ALWAYS_HIT 17"));
    assert!(line(&move_effects_h, 82).contains("EFFECT_VITAL_THROW 78"));
    assert!(line(&move_effects_h, 156).contains("EFFECT_THUNDER 152"));

    // Committed census: 66 total accuracycheck call sites, split 55/8/1/1/1.
    let bare_accuracycheck_count = scripts
        .lines()
        .filter(|candidate| candidate.trim_start().starts_with("accuracycheck "))
        .count();
    assert_eq!(
        bare_accuracycheck_count, 66,
        "exactly 66 concrete accuracycheck call sites"
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_CONCRETE_START_COUNT, 66);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_CONCRETE_CALL_SITE_COUNT, 66);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_BYPASS_CALL_SITE_COUNT, 9);
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_MOVE_OPERAND_CENSUS,
        [
            ("ACC_CURR_MOVE", 55),
            ("MOVE_DOOM_DESIRE", 1),
            ("MOVE_FUTURE_SIGHT", 1),
            ("NO_ACC_CALC", 1),
            ("NO_ACC_CALC_CHECK_LOCK_ON", 8),
        ]
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_CASES.len(), 74);
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256,
        "8ceb8ee92038968276397dd76c28dc37a9954f74767549f74d25133e4ef43fd7"
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_BYTES, 244_974);
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_GENERATOR_SHA256,
        "ecfa305a8fef052221dd92d1873dc64651e498a897ada57fb911fa89e42e7663"
    );
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_GENERATOR_BYTES, 43_047);

    let generated = include_bytes!("../src/battle_script_accuracycheck_vectors_gen.rs");
    assert_eq!(generated.len(), 435_388);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_accuracycheck_vectors_gen.rs"),
        "fa55d11de77a65da3b43b3c658ed4b7eee13a859330ed317261e640a2795ba0f"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs")
        )
        .unwrap()
        .len(),
        43_047
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs"),
        "ecfa305a8fef052221dd92d1873dc64651e498a897ada57fb911fa89e42e7663"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types."));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
