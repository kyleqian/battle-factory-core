//! Independent source/macro/program-site and corpus-identity ratchets for
//! `Cmd_trysetencore`. Behavioral replay stays in the sibling vector test so
//! canonical TypeScript execution cannot substitute for source evidence.

use std::{fs, path::PathBuf};

use factory_core::battle_script_trysetencore::*;
use factory_core::battle_script_trysetencore_vectors_gen::*;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

fn line(source: &str, number: usize) -> &str {
    source
        .lines()
        .nth(number - 1)
        .unwrap_or_else(|| panic!("missing source line {number}"))
}

fn sha256(path: &str) -> String {
    let output = std::process::Command::new("sh")
        .args(["-c", &format!("shasum -a 256 {path} | cut -d ' ' -f 1")])
        .current_dir(workspace_root())
        .output()
        .expect("run shasum");
    assert!(output.status.success());
    String::from_utf8(output.stdout).unwrap().trim().to_owned()
}

#[test]
fn source_dispatch_first_match_forbidden_gates_rng_writes_macro_and_single_site_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let moves = source("reference/pokeemerald/include/constants/moves.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let metadata = BATTLE_SCRIPT_TRYSETENCORE_SOURCE_METADATA;

    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_OPCODE_NAME,
        "B_SCR_OP_TRYSETENCORE"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_OPCODE, 0xa4);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_DISPATCHER, "Cmd_trysetencore");
    assert_eq!(
        line(&command_ids, usize::from(metadata.opcode_enum_line)).trim(),
        "B_SCR_OP_TRYSETENCORE,"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.dispatch_line)).trim(),
        "[B_SCR_OP_TRYSETENCORE]                    = Cmd_trysetencore,                            //0xA4"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.handler_line)),
        "static void Cmd_trysetencore(void)"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.scan_line)).trim(),
        "for (i = 0; i < MAX_MON_MOVES; i++)"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.first_match_line)).trim(),
        "if (gBattleMons[gBattlerTarget].moves[i] == gLastMoves[gBattlerTarget])"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.forbidden_gate_line)).trim(),
        "if (gLastMoves[gBattlerTarget] == MOVE_STRUGGLE"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.eligibility_gate_line)).trim(),
        "if (gDisableStructs[gBattlerTarget].encoredMove == MOVE_NONE"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.write_move_line)).trim(),
        "gDisableStructs[gBattlerTarget].encoredMove = gBattleMons[gBattlerTarget].moves[i];"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.write_position_line)).trim(),
        "gDisableStructs[gBattlerTarget].encoredMovePos = i;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.duration_line)).trim(),
        "gDisableStructs[gBattlerTarget].encoreTimer = (Random() & 3) + 3;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.start_value_line)).trim(),
        "gDisableStructs[gBattlerTarget].encoreTimerStartValue = gDisableStructs[gBattlerTarget].encoreTimer;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.advance_line)).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.failure_line)).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );

    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_FAILURE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        line(&macros, usize::from(metadata.macro_declaration_line)).trim(),
        ".macro trysetencore ptr:req"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_opcode_line)).trim(),
        ".byte B_SCR_OP_TRYSETENCORE"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_pointer_line)).trim(),
        r".4byte \ptr"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_label_line)),
        "BattleScript_EffectEncore::"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_statement_line)).trim(),
        "trysetencore BattleScript_ButItFailed"
    );
    assert_eq!(scripts.matches("\ttrysetencore ").count(), 1);
    assert_eq!(metadata.site_program_counter, 774);

    assert_eq!(line(&moves, 123).trim(), "#define MOVE_MIRROR_MOVE 119");
    assert_eq!(line(&moves, 169).trim(), "#define MOVE_STRUGGLE 165");
    assert_eq!(line(&moves, 231).trim(), "#define MOVE_ENCORE 227");
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_MOVE_MIRROR_MOVE, 119);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_MOVE_STRUGGLE, 165);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_MOVE_ENCORE, 227);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN, 3);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX, 6);
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_CASES.len(), 739);
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_CASES.len(), 12);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_VECTOR_CORPUS_SHA256,
        "17c24b5dfdeaf7f4d86a690219c6f278fd60ef41c7be38557a7c6e5345b13564",
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_VECTOR_CORPUS_BYTES, 3_092_962);
    let generated = include_bytes!("../src/battle_script_trysetencore_vectors_gen.rs");
    assert_eq!(generated.len(), 8_066_126);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trysetencore_vectors_gen.rs"),
        "53095904ebac7afe0a80a1673266afc82ffd79eff72b6655e323ba886e88e8d8",
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trysetencore-vectors.mjs")
        )
        .unwrap()
        .len(),
        55_572,
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trysetencore-vectors.mjs"),
        "1de47b8144399f9b95f88cb37ffa395648ca5a880fa795c662f7d1df594a5b05",
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrysetencoreOpcode.ts via node."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-trysetencore-vectors.mjs."));
}
