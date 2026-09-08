//! Independent source/macro/call-site and artifact-identity ratchets for
//! Imprison. Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_tryimprison::*;
use factory_core::battle_script_tryimprison_vectors_gen::*;

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
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_util = source("reference/pokeemerald/src/battle_util.c");
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");
    let abilities = source("reference/pokeemerald/include/constants/abilities.h");
    let moves = source("reference/pokeemerald/include/constants/moves.h");
    let evidence = BATTLE_SCRIPT_TRYIMPRISON_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME,
        "B_SCR_OP_TRYIMPRISON"
    );
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_OPCODE, 0xdb);
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER, "Cmd_tryimprison");
    assert_eq!(evidence.opcode_name, BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME);
    assert_eq!(evidence.opcode_id, BATTLE_SCRIPT_TRYIMPRISON_OPCODE);
    assert_eq!(evidence.dispatcher, BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER);

    assert_eq!(line(&command_ids, 225).trim(), "B_SCR_OP_TRYIMPRISON,");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYIMPRISON]                     = Cmd_tryimprison,                             //0xDB"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_tryimprison(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_tryimprison(void)"
    );
    assert_eq!(
        line(&commands, evidence.imprisoned_guard_line).trim(),
        "if ((gStatuses3[gBattlerAttacker] & STATUS3_IMPRISONED_OTHERS))"
    );
    assert_eq!(
        line(&commands, evidence.pressure_call_line).trim(),
        "PressurePPLoseOnUsingImprison(gBattlerAttacker);"
    );
    assert_eq!(
        line(&commands, evidence.overlap_set_line).trim(),
        "gStatuses3[gBattlerAttacker] |= STATUS3_IMPRISONED_OTHERS;"
    );
    assert_eq!(
        line(&commands, evidence.gen3_fail_comment_line).trim(),
        "if (battler == gBattlersCount) // In Generation 3 games, Imprison fails if the user doesn't share any moves with any of the foes"
    );

    let pressure_evidence = BATTLE_SCRIPT_TRYIMPRISON_PRESSURE_UTIL_EVIDENCE;
    assert_eq!(
        line(&battle_util, pressure_evidence.header_line).trim(),
        "void PressurePPLoseOnUsingImprison(u8 attacker)"
    );
    assert_eq!(
        line(&battle_util, pressure_evidence.decrement_line).trim(),
        "gBattleMons[attacker].pp[j]--;"
    );
    assert_eq!(
        line(&battle_util, pressure_evidence.permanent_gate_line).trim(),
        "if (imprisonPos != MAX_MON_MOVES && MOVE_IS_PERMANENT(attacker, imprisonPos))"
    );

    let macro_evidence = BATTLE_SCRIPT_TRYIMPRISON_MACRO_EVIDENCE;
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_FAILURE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(macro_evidence.encoded_width_bytes, 5);
    assert_eq!(
        line(&macros, macro_evidence.declaration_line).trim(),
        ".macro tryimprison ptr:req"
    );
    assert_eq!(
        line(&macros, macro_evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYIMPRISON"
    );
    assert_eq!(
        line(&macros, macro_evidence.pointer_line).trim(),
        r".4byte \ptr"
    );

    let site = BATTLE_SCRIPT_TRYIMPRISON_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, site.entry_label_line),
        "BattleScript_EffectImprison::"
    );
    assert_eq!(
        line(&scripts, site.statement_line).trim(),
        "tryimprison BattleScript_ButItFailed"
    );
    assert_eq!(site.instruction_program_counter, 1794);
    assert_eq!(site.failure_target_expression, "BattleScript_ButItFailed");
    assert_eq!(site.failure_target_program_counter, 1434);
    assert_eq!(
        scripts.matches("\ttryimprison ").count(),
        1,
        "exactly one concrete tryimprison call site"
    );

    assert_eq!(
        line(&battle_h, 145).trim(),
        "#define STATUS2_TRANSFORMED           (1 << 21)"
    );
    assert_eq!(
        line(&battle_h, 170).trim(),
        "#define STATUS3_IMPRISONED_OTHERS       (1 << 13)"
    );
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_STATUS2_TRANSFORMED, 1 << 21);
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS, 1 << 13);
    assert_eq!(line(&abilities, 50).trim(), "#define ABILITY_PRESSURE 46");
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_ABILITY_PRESSURE, 46);
    assert_eq!(line(&moves, 290).trim(), "#define MOVE_IMPRISON 286");
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_MOVE_IMPRISON, 286);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_CASES.len(), 52);
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_REGISTRATION_CASES.len(), 8);
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_SHA256,
        "fa2ed7db8c54beafe6733c53c648e3d9eb64dddedad355ec87aeac9f2c1b89ab"
    );
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_VECTOR_CORPUS_BYTES, 161_529);
    assert_eq!(
        BATTLE_SCRIPT_TRYIMPRISON_VECTOR_GENERATOR_SHA256,
        "a39a63488adeafb21ba8b7d48e7491be39c86db6c30378071923071f6ef74e2d"
    );
    assert_eq!(BATTLE_SCRIPT_TRYIMPRISON_VECTOR_GENERATOR_BYTES, 38_421);

    let generated = include_bytes!("../src/battle_script_tryimprison_vectors_gen.rs");
    assert_eq!(generated.len(), 402_810);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryimprison_vectors_gen.rs"),
        "21ae30417d75436142571cc0370c17e9e9c894d3b3887fb7f9952283537b26f9"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-tryimprison-vectors.mjs")
        )
        .unwrap()
        .len(),
        38_421
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryimprison-vectors.mjs"),
        "a39a63488adeafb21ba8b7d48e7491be39c86db6c30378071923071f6ef74e2d"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryimprisonOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
