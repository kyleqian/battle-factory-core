//! Independent source/decomp/macro/program-site and corpus-identity ratchets
//! for the `Cmd_jumpifnodamage` leaf. Behavioral replay is intentionally in
//! the sibling vectors test so generated TypeScript execution cannot silently
//! substitute for source evidence.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifnodamage::*;
use factory_core::battle_script_jumpifnodamage_vectors_gen::*;

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

#[test]
fn source_dispatch_protect_struct_or_body_macro_and_focus_punch_site_are_independently_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let battle_header = source("reference/pokeemerald/include/battle.h");
    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_CANONICAL_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptJumpifnodamageDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_JUMPIFNODAMAGE",
            opcode_id: 0xcf,
            dispatcher: "Cmd_jumpifnodamage",
            dispatch_line: 538,
            handler_line: 9148,
            receipt_test_line: 9150,
            advance_line: 9151,
            jump_line: 9153,
            protect_physical_field_line: 126,
            protect_special_field_line: 127,
        },
    );
    assert!(line(&commands, 538)
        .contains("[B_SCR_OP_JUMPIFNODAMAGE]                  = Cmd_jumpifnodamage"));
    assert_eq!(
        line(&commands, 9148),
        "static void Cmd_jumpifnodamage(void)"
    );
    let receipt_test = line(&commands, 9150);
    assert!(receipt_test.contains("gProtectStructs[gBattlerAttacker].physicalDmg"));
    assert!(receipt_test.contains("gProtectStructs[gBattlerAttacker].specialDmg"));
    assert!(line(&commands, 9151).contains("gBattlescriptCurrInstr += 5"));
    assert!(line(&commands, 9153).contains("T1_READ_PTR(gBattlescriptCurrInstr + 1)"));
    assert_eq!(line(&battle_header, 126).trim(), "u32 physicalDmg;");
    assert_eq!(line(&battle_header, 127).trim(), "u32 specialDmg;");

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_MACRO_EVIDENCE,
        BattleScriptJumpifnodamageMacroEvidence {
            macro_name: "jumpifnodamage",
            declaration_line: 1061,
            opcode_line: 1062,
            pointer_line: 1063,
            pointer_width_bytes: 4,
            encoded_width_bytes: 5,
        },
    );
    assert_eq!(
        line(&macro_source, 1061).trim(),
        ".macro jumpifnodamage ptr:req"
    );
    assert_eq!(
        line(&macro_source, 1062).trim(),
        ".byte B_SCR_OP_JUMPIFNODAMAGE"
    );
    assert_eq!(line(&macro_source, 1063).trim(), r".4byte \ptr");

    assert_eq!(line(&scripts, 2260), "BattleScript_EffectFocusPunch::");
    assert_eq!(
        line(&scripts, 2262).trim(),
        "jumpifnodamage BattleScript_HitFromAccCheck"
    );
    assert_eq!(scripts.matches("\tjumpifnodamage ").count(), 1);
}

#[test]
fn canonical_program_site_and_singleton_shape_metadata_are_ratcheted() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE_NAME,
        "B_SCR_OP_JUMPIFNODAMAGE"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE, 0xcf);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_DISPATCHER,
        "Cmd_jumpifnodamage"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_ENTRY_LABEL,
        "BattleScript_EffectFocusPunch"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_STATEMENT_LINE, 2262);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_TARGET_LABEL,
        "BattleScript_HitFromAccCheck"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_CALL_SITE_EVIDENCE,
        BattleScriptJumpifnodamageCallSiteEvidence {
            entry_label: "BattleScript_EffectFocusPunch",
            entry_label_line: 2260,
            entry_program_counter: 1591,
            statement_line: 2262,
            invocation_mnemonic: "jumpifnodamage",
            invocation_macro_line: 1061,
            source_macro: "jumpifnodamage",
            opcode_macro_line: 1062,
            pointer_macro_line: 1063,
            target_expression: "BattleScript_HitFromAccCheck",
            instruction_program_counter: 1592,
            target_program_counter: 5,
            concrete_call_sites: 1,
        },
    );
}

#[test]
fn deterministic_corpus_counts_byte_sizes_hashes_and_generated_bound_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES.len(), 131);
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_CASES.len(), 16);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_I32_EDGE_DOMAIN,
        [i32::MIN, -1, 0, 1, i32::MAX],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("canonical-protect-receipt-signed-i32-values", 5),
            ("protect-physical-special-cross-product", 25),
            ("all-attacker-receipt-combinations", 100),
            ("special-status-shadow-receipt-values", 5),
            ("source-protect-struct-receipt-fields", 2),
            ("concrete-focus-punch-call-sites", 1),
            ("application-count-values", 2),
            ("registration-shape-cases", 16),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_CATEGORY_CENSUS,
        [
            ("attacker-protect-receipt-i32-matrix", 100),
            ("special-status-shadow-receipts-ignored", 20),
            ("prior-and-sibling-state-preservation", 4),
            ("ordered-missing-role-before-label-resolution", 1),
            ("ordered-unresolved-label-branch", 3),
            ("repeated-application-idempotence", 3),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_BRANCH_CENSUS,
        [
            ("advance", 102),
            ("jump", 24),
            ("missing-attacker-role", 1),
            ("unresolved-jump-target", 1),
            ("jump-then-jump", 1),
            ("advance-then-advance", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 2),
            ("wrong-cardinality", 4),
            ("invalid-shape", 10),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_VECTOR_CORPUS_SHA256,
        "d0972bdc7764a77f4ab75ac3c3e52c91ca845e14a52315a0f2ab5e1defa1e046",
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_VECTOR_CORPUS_BYTES, 343_093);
    let generated = include_bytes!("../src/battle_script_jumpifnodamage_vectors_gen.rs");
    assert_eq!(generated.len(), 885_070);
    assert!(generated.len() <= 1_000_000);
}
