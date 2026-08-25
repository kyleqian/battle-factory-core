//! Independent source/dispatch/body/topology/macro/site and corpus provenance
//! ratchets for `Cmd_trysethelpinghand`. Behavioral differential replay lives
//! in the sibling vector test, so canonical TypeScript cannot substitute for
//! source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_trysethelpinghand::*;
use factory_core::battle_script_trysethelpinghand_vectors_gen::*;

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
fn source_dispatch_body_partner_topology_macro_and_single_call_site_are_exact() {
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let animation_helpers = source("reference/pokeemerald/src/battle_anim_mons.c");
    let battle_header = source("reference/pokeemerald/include/battle.h");
    let metadata = BATTLE_SCRIPT_TRYSETHELPINGHAND_SOURCE_METADATA;

    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE_NAME,
        "B_SCR_OP_TRYSETHELPINGHAND"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_OPCODE, 0xd1);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_DISPATCHER,
        "Cmd_trysethelpinghand"
    );
    assert_eq!(
        line(&command_ids, usize::from(metadata.opcode_enum_line)).trim(),
        "B_SCR_OP_TRYSETHELPINGHAND,"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.dispatch_line)).trim(),
        "[B_SCR_OP_TRYSETHELPINGHAND]               = Cmd_trysethelpinghand,                       //0xD1"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.handler_line)),
        "static void Cmd_trysethelpinghand(void)"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.retarget_line)).trim(),
        "gBattlerTarget = GetBattlerAtPosition(BATTLE_PARTNER(GetBattlerPosition(gBattlerAttacker)));"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.double_guard_line)).trim(),
        "if (gBattleTypeFlags & BATTLE_TYPE_DOUBLE"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.absent_guard_line)).trim(),
        "&& !(gAbsentBattlerFlags & gBitTable[gBattlerTarget])"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.attacker_guard_line)).trim(),
        "&& !gProtectStructs[gBattlerAttacker].helpingHand"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.partner_guard_line)).trim(),
        "&& !gProtectStructs[gBattlerTarget].helpingHand)"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.write_line)).trim(),
        "gProtectStructs[gBattlerTarget].helpingHand = 1;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.advance_line)).trim(),
        "gBattlescriptCurrInstr += 5;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.failure_line)).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );

    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_FAILURE_POINTER_WIDTH_BYTES,
        4
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        line(&macros, usize::from(metadata.macro_declaration_line)).trim(),
        ".macro trysethelpinghand ptr:req"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_opcode_line)).trim(),
        ".byte B_SCR_OP_TRYSETHELPINGHAND"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_pointer_line)).trim(),
        r".4byte \ptr"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_label_line)),
        "BattleScript_EffectHelpingHand::"
    );
    assert_eq!(
        line(&scripts, usize::from(metadata.site_statement_line)).trim(),
        "trysethelpinghand BattleScript_ButItFailed"
    );
    assert_eq!(scripts.matches("\ttrysethelpinghand ").count(), 1);
    assert_eq!(metadata.site_program_counter, 1641);

    // Independent topology relation: source flips BIT_FLANK in the current
    // positional id, then scans only gBattlersCount and returns that count as
    // the no-match sentinel. The Rust leaf carries this exact four-slot map.
    assert_eq!(
        line(&battle_constants, 46).trim(),
        "#define BATTLE_PARTNER(id) ((id) ^ BIT_FLANK)"
    );
    assert_eq!(
        line(&battle_constants, 56).trim(),
        "#define BIT_FLANK       2"
    );
    assert_eq!(
        line(&battle_constants, 59).trim(),
        "#define BATTLE_TYPE_DOUBLE             (1 << 0)"
    );
    assert_eq!(
        line(&animation_helpers, 854),
        "u8 GetBattlerPosition(u8 battler)"
    );
    assert_eq!(
        line(&animation_helpers, 856).trim(),
        "return gBattlerPositions[battler];"
    );
    assert_eq!(
        line(&animation_helpers, 859),
        "u8 GetBattlerAtPosition(u8 position)"
    );
    assert_eq!(
        line(&animation_helpers, 863).trim(),
        "for (i = 0; i < gBattlersCount; i++)"
    );
    assert_eq!(
        line(&animation_helpers, 865).trim(),
        "if (gBattlerPositions[i] == position)"
    );
    assert_eq!(line(&animation_helpers, 868).trim(), "return i;");
    assert_eq!(
        line(&battle_header, 640).trim(),
        "extern u8 gBattlersCount;"
    );
    assert_eq!(
        line(&battle_header, 642).trim(),
        "extern u8 gBattlerPositions[MAX_BATTLERS_COUNT];"
    );
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE, 1);
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES.len(), 2_632);
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_CASES.len(), 10);
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_SHA256,
        "28a79ba053c6e925a8357766f7d73f8adb715d82d1979625d7cd02b4e87fa5e0"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_BYTES,
        4_604_919
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_GENERATOR_SHA256,
        "c60ebdc8166bad3f26854a170d580334614cccef41ae7129363e1859d46b4156"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_GENERATOR_BYTES,
        41_575
    );

    let generated = include_bytes!("../src/battle_script_trysethelpinghand_vectors_gen.rs");
    assert_eq!(generated.len(), 9_314_463);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_trysethelpinghand_vectors_gen.rs"),
        "5aac9cb75d4e039e7b81bd41dc5c5e88cc19a59e4e47d37935a04ddedb119972"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        41_575
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs"),
        "c60ebdc8166bad3f26854a170d580334614cccef41ae7129363e1859d46b4156"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTrysethelpinghandOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs."));
}
