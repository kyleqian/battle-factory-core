//! Independent source/macro/call-site and artifact-identity ratchets for the
//! semi-invulnerable trio. Behavioral differential replay lives in the
//! sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_semi_invulnerable::*;
use factory_core::battle_script_semi_invulnerable_vectors_gen::*;

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
fn exact_opcode_dispatch_macro_enum_and_call_site_lines_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");
    let moves_h = source("reference/pokeemerald/include/constants/moves.h");

    assert_eq!(BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE, 0x18);
    assert_eq!(
        BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_OPCODE_NAME,
        "B_SCR_OP_CLEARSTATUSFROMEFFECT"
    );
    assert_eq!(
        BATTLE_SCRIPT_CLEARSTATUSFROMEFFECT_DISPATCHER,
        "Cmd_clearstatusfromeffect"
    );
    assert_eq!(BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE, 0xc5);
    assert_eq!(
        BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_OPCODE_NAME,
        "B_SCR_OP_SETSEMIINVULNERABLEBIT"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSEMIINVULNERABLEBIT_DISPATCHER,
        "Cmd_setsemiinvulnerablebit"
    );
    assert_eq!(BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE, 0xc6);
    assert_eq!(
        BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_OPCODE_NAME,
        "B_SCR_OP_CLEARSEMIINVULNERABLEBIT"
    );
    assert_eq!(
        BATTLE_SCRIPT_CLEARSEMIINVULNERABLEBIT_DISPATCHER,
        "Cmd_clearsemiinvulnerablebit"
    );

    // Forward declarations (:103, :276, :277).
    assert_eq!(
        line(&commands, 103),
        "static void Cmd_clearstatusfromeffect(void);"
    );
    assert_eq!(
        line(&commands, 276),
        "static void Cmd_setsemiinvulnerablebit(void);"
    );
    assert_eq!(
        line(&commands, 277),
        "static void Cmd_clearsemiinvulnerablebit(void);"
    );

    // Dispatch rows (:355 //0x18, :528 //0xC5, :529 //0xC6).
    assert_eq!(
        line(&commands, 355).trim(),
        "[B_SCR_OP_CLEARSTATUSFROMEFFECT]           = Cmd_clearstatusfromeffect,                   //0x18"
    );
    assert_eq!(
        line(&commands, 528).trim(),
        "[B_SCR_OP_SETSEMIINVULNERABLEBIT]          = Cmd_setsemiinvulnerablebit,                  //0xC5"
    );
    assert_eq!(
        line(&commands, 529).trim(),
        "[B_SCR_OP_CLEARSEMIINVULNERABLEBIT]        = Cmd_clearsemiinvulnerablebit,                //0xC6"
    );

    // Handler bodies (:2951-2963, :9009-9026, :9028-9045).
    assert_eq!(
        line(&commands, 2951),
        "static void Cmd_clearstatusfromeffect(void)"
    );
    assert_eq!(line(&commands, 2963), "}");
    assert_eq!(
        line(&commands, 2953).trim(),
        "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert!(source_body(&commands, 2950, 13)
        .contains("if (gBattleCommunication[MOVE_EFFECT_BYTE] <= PRIMARY_STATUS_MOVE_EFFECT)"));
    assert!(
        source_body(&commands, 2950, 13).contains("gBattleCommunication[MOVE_EFFECT_BYTE] = 0;")
    );

    assert_eq!(
        line(&commands, 9009),
        "static void Cmd_setsemiinvulnerablebit(void)"
    );
    assert_eq!(line(&commands, 9026), "}");
    let set_body = source_body(&commands, 9008, 18);
    assert!(set_body.contains("case MOVE_FLY:"));
    assert!(set_body.contains("case MOVE_BOUNCE:"));
    assert!(set_body.contains("gStatuses3[gBattlerAttacker] |= STATUS3_ON_AIR;"));
    assert!(set_body.contains("case MOVE_DIG:"));
    assert!(set_body.contains("gStatuses3[gBattlerAttacker] |= STATUS3_UNDERGROUND;"));
    assert!(set_body.contains("case MOVE_DIVE:"));
    assert!(set_body.contains("gStatuses3[gBattlerAttacker] |= STATUS3_UNDERWATER;"));

    assert_eq!(
        line(&commands, 9028),
        "static void Cmd_clearsemiinvulnerablebit(void)"
    );
    assert_eq!(line(&commands, 9045), "}");
    let clear_body = source_body(&commands, 9027, 18);
    assert!(clear_body.contains("gStatuses3[gBattlerAttacker] &= ~STATUS3_ON_AIR;"));
    assert!(clear_body.contains("gStatuses3[gBattlerAttacker] &= ~STATUS3_UNDERGROUND;"));
    assert!(clear_body.contains("gStatuses3[gBattlerAttacker] &= ~STATUS3_UNDERWATER;"));

    // sStatusFlagsForMoveEffects (:608-625): MOVE_EFFECT_CHARGING is the only
    // entry this opcode's committed call sites resolve nonzero.
    assert!(source_body(&commands, 607, 19)
        .contains("[MOVE_EFFECT_CHARGING]       = STATUS2_MULTIPLETURNS,"));

    // Opcode enum positions (:30, :203, :204).
    assert_eq!(
        line(&command_ids, 30).trim(),
        "B_SCR_OP_CLEARSTATUSFROMEFFECT,"
    );
    assert_eq!(
        line(&command_ids, 203).trim(),
        "B_SCR_OP_SETSEMIINVULNERABLEBIT,"
    );
    assert_eq!(
        line(&command_ids, 204).trim(),
        "B_SCR_OP_CLEARSEMIINVULNERABLEBIT,"
    );

    // Macros (:107 width 2, :1018 width 1, :1022 width 1).
    assert_eq!(
        line(&macros, 107).trim(),
        ".macro clearstatusfromeffect battler:req"
    );
    assert_eq!(
        line(&macros, 108).trim(),
        ".byte B_SCR_OP_CLEARSTATUSFROMEFFECT"
    );
    assert_eq!(line(&macros, 109).trim(), ".byte \\battler");
    assert_eq!(line(&macros, 1018).trim(), ".macro setsemiinvulnerablebit");
    assert_eq!(
        line(&macros, 1019).trim(),
        ".byte B_SCR_OP_SETSEMIINVULNERABLEBIT"
    );
    assert_eq!(
        line(&macros, 1022).trim(),
        ".macro clearsemiinvulnerablebit"
    );
    assert_eq!(
        line(&macros, 1023).trim(),
        ".byte B_SCR_OP_CLEARSEMIINVULNERABLEBIT"
    );

    // Committed call sites (verified by grep): 5 clearstatusfromeffect (all
    // BS_ATTACKER), 1 setsemiinvulnerablebit, 2 clearsemiinvulnerablebit.
    for pc in [789, 1131, 2001, 3295, 3319] {
        assert_eq!(
            line(&scripts, pc).trim(),
            "clearstatusfromeffect BS_ATTACKER"
        );
    }
    assert_eq!(line(&scripts, 1994).trim(), "setsemiinvulnerablebit");
    for pc in [2007, 2011] {
        assert_eq!(line(&scripts, pc).trim(), "clearsemiinvulnerablebit");
    }
    let count_exact = |needle: &str| scripts.lines().filter(|c| c.trim() == needle).count();
    assert_eq!(count_exact("setsemiinvulnerablebit"), 1);
    assert_eq!(count_exact("clearsemiinvulnerablebit"), 2);
    let clearstatus_count = scripts
        .lines()
        .filter(|c| c.trim().starts_with("clearstatusfromeffect"))
        .count();
    assert_eq!(clearstatus_count, 5);

    // Constants.
    assert_eq!(
        line(&battle_h, 139).trim(),
        "#define STATUS2_MULTIPLETURNS         (1 << 12)"
    );
    assert_eq!(
        line(&battle_h, 163).trim(),
        "#define STATUS3_ON_AIR                  (1 << 6)"
    );
    assert_eq!(
        line(&battle_h, 164).trim(),
        "#define STATUS3_UNDERGROUND             (1 << 7)"
    );
    assert_eq!(
        line(&battle_h, 175).trim(),
        "#define STATUS3_UNDERWATER              (1 << 18)"
    );
    assert!(line(&battle_h, 253).contains("PRIMARY_STATUS_MOVE_EFFECT      MOVE_EFFECT_TOXIC"));
    assert_eq!(line(&moves_h, 23).trim(), "#define MOVE_FLY 19");
    assert_eq!(line(&moves_h, 95).trim(), "#define MOVE_DIG 91");
    assert_eq!(line(&moves_h, 295).trim(), "#define MOVE_DIVE 291");
    assert_eq!(line(&moves_h, 344).trim(), "#define MOVE_BOUNCE 340");

    assert_eq!(BATTLE_SCRIPT_STATUS2_MULTIPLETURNS, 1 << 12);
    assert_eq!(BATTLE_SCRIPT_STATUS3_ON_AIR, 1 << 6);
    assert_eq!(BATTLE_SCRIPT_STATUS3_UNDERGROUND, 1 << 7);
    assert_eq!(BATTLE_SCRIPT_STATUS3_UNDERWATER, 1 << 18);
    assert_eq!(BATTLE_SCRIPT_PRIMARY_STATUS_MOVE_EFFECT, 6);
    assert_eq!(BATTLE_SCRIPT_MOVE_EFFECT_CHARGING, 12);
    assert_eq!(BATTLE_SCRIPT_MOVE_FLY, 19);
    assert_eq!(BATTLE_SCRIPT_MOVE_DIG, 91);
    assert_eq!(BATTLE_SCRIPT_MOVE_DIVE, 291);
    assert_eq!(BATTLE_SCRIPT_MOVE_BOUNCE, 340);
}

fn source_body(source: &str, skip: usize, take: usize) -> String {
    source
        .lines()
        .skip(skip)
        .take(take)
        .collect::<Vec<_>>()
        .join("\n")
}

#[test]
fn shared_error_texts_are_exact() {
    assert_eq!(
        BattleScriptSemiInvulnerableBitError::MissingAttackerRole.to_string(),
        "Battle Script hit-chain command requires a attacker role"
    );
    assert_eq!(
        BattleScriptClearstatusfromeffectRegistrationError::WrongCardinality { count: 3 }
            .to_string(),
        "B_SCR_OP_CLEARSTATUSFROMEFFECT requires all 5 concrete starts, got 3"
    );
    assert_eq!(
        BattleScriptClearstatusfromeffectRegistrationError::InvalidShape { program_counter: 42 }
            .to_string(),
        "invalid B_SCR_OP_CLEARSTATUSFROMEFFECT shape at program counter 42"
    );
    assert_eq!(
        BattleScriptSemiInvulnerableBitRegistrationError::WrongCardinality {
            opcode_name: "B_SCR_OP_SETSEMIINVULNERABLEBIT",
            expected: 1,
            count: 0,
        }
        .to_string(),
        "B_SCR_OP_SETSEMIINVULNERABLEBIT requires all 1 concrete starts, got 0"
    );
    assert_eq!(
        BattleScriptSemiInvulnerableBitRegistrationError::InvalidShape {
            opcode_name: "B_SCR_OP_CLEARSEMIINVULNERABLEBIT",
            program_counter: 7,
        }
        .to_string(),
        "invalid B_SCR_OP_CLEARSEMIINVULNERABLEBIT shape at program counter 7"
    );
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_SEMI_INVULNERABLE_CASES.len(), 33);
    assert_eq!(BATTLE_SCRIPT_SEMI_INVULNERABLE_REGISTRATION_CASES.len(), 16);
    assert_eq!(
        BATTLE_SCRIPT_SEMI_INVULNERABLE_VECTOR_CORPUS_SHA256,
        "b8ba30d39c8ce71b25d3af147f8f55adcee07aa90362877dcf66ffefd9a7dc03"
    );

    let generated = include_bytes!("../src/battle_script_semi_invulnerable_vectors_gen.rs");
    assert_eq!(generated.len(), 43_675);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_semi_invulnerable_vectors_gen.rs"),
        "8c80f061e675b78546e8acb7274442eb06dad6211c41a24ae2146fce81fcca96",
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-semi-invulnerable-vectors.mjs")
        )
        .unwrap()
        .len(),
        31_146,
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-semi-invulnerable-vectors.mjs"),
        "9118a88003cb9b6974639f0f1053657ea53b480deec0badc4d1241eab08c514c",
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptSemiInvulnerableOpcode.ts via"
    ));
    assert!(generated_text.contains("Regenerate; do not hand-edit."));
}
